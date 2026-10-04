"""Explicit passenger-station pairs only; geometry crossings never create transfers."""
import collections, json, math

def expand(root, result, sections, stations, distance, project, route):
    spec=json.loads((root/'data-source/corridors.json').read_text())
    west,south,east,north=spec['bounds']
    def inside(p): return west-1e-9<=p[0]<=east+1e-9 and south-1e-9<=p[1]<=north+1e-9
    def outside_metres(p):
        return 0 if inside(p) else 1000*distance(p,(min(east,max(west,p[0])),min(north,max(south,p[1]))))
    exceptions={(e['operator'],e['line'],tuple(e['pair'])):e['maxOutsideMetres'] for e in spec['geometryBoundaryExceptions']}
    if any(not 0<metres<=60 for metres in exceptions.values()):raise ValueError('Geometry exception exceeds 60m ceiling')
    boundary_audit=[]
    old={s['id'] for s in result['stations']}
    locations={s['id']:s['coords'] for s in result['stations']}
    excluded=[]; projections=[]
    served={(e['sourceOperator'],e['sourceLine'],s) for e in result['edges'] for s in (e['a'],e['b'])}
    grouped=collections.defaultdict(list)
    for corridor in spec['corridors']: grouped[corridor['operator'],corridor['line']].append(corridor)
    for (operator,line),corridors in grouped.items():
        segs=set()
        for section in sections:
            if (section['operator'],section['line'])!=(operator,line):continue
            cs=section['coordinates'];paths=[cs] if isinstance(cs[0][0],(int,float)) else cs
            for path in paths:
                for a,b in zip(path,path[1:]):
                    if a!=b and all(west-.01<p[0]<east+.01 and south-.01<p[1]<north+.01 for p in (a,b)):
                        segs.add(tuple(sorted((tuple(a),tuple(b)))))
        splits={e:set(e) for e in segs};anchors={}
        names=dict.fromkeys(name for c in corridors for name in c['stations'])
        for name in names:
            records=[s for s in stations if (s['operator'],s['line'],s['name'])==(operator,line,name)]
            if not records:
                excluded.append(dict(operator=operator,line=line,station=name,reason='source_station_missing'));continue
            choices=[]
            for station in records:
                p=(station['lng'],station['lat'])
                if not inside(p) and name not in old:continue
                if not segs:continue
                error,edge,q=min((distance(p,project(p,*e)),e,project(p,*e)) for e in segs)
                if error>.15:continue
                splits[edge].add(q);choices.append(q)
                projections.append(dict(operator=operator,line=line,station=name,metres=error*1000))
            if choices:anchors[name]=choices
            else:excluded.append(dict(operator=operator,line=line,station=name,reason='outside_bounds_or_projection'))
        graph={}
        for (a,b),points in splits.items():
            ps=sorted(points,key=lambda p:distance(a,p))
            for u,v in zip(ps,ps[1:]):
                w=distance(u,v);graph.setdefault(u,{})[v]=w;graph.setdefault(v,{})[u]=w
        for corridor in corridors:
            for a,b in zip(corridor['stations'],corridor['stations'][1:]):
                if a not in anchors or b not in anchors:continue
                allowance=exceptions.get((operator,line,(a,b)),0)
                candidates=[]
                for pa in anchors[a]:
                    for pb in anchors[b]:
                        try:coords,km=route(graph,pa,pb)
                        except (ValueError,KeyError):continue
                        if len(coords)>=2 and all(outside_metres(p)<=allowance for p in coords) and 0<km<max(4,4*distance(pa,pb)):
                            candidates.append((km,coords))
                if not candidates:
                    excluded.append(dict(operator=operator,line=line,pair=[a,b],reason='no_verified_in_bounds_geometry'));continue
                km,coords=min(candidates)
                ia=spec['identityExceptions'].get(f'{operator}/{line}/{a}',a)
                ib=spec['identityExceptions'].get(f'{operator}/{line}/{b}',b)
                # Same-name station groups are explicitly named in the reviewed corridors.
                # Remote homonyms remain separate; no proximity-only interchange inference.
                if any(i in locations and distance(locations[i],p)>.75 for i,p in [(ia,coords[0]),(ib,coords[-1])]):
                    excluded.append(dict(operator=operator,line=line,pair=[a,b],reason='station_group_too_far'));continue
                deviation=max(outside_metres(p) for p in coords)
                if deviation:boundary_audit.append(dict(operator=operator,line=line,pair=[a,b],maxOutsideMetres=deviation,allowedMetres=allowance))
                served.update([(operator,line,a),(operator,line,b)])
                locations.setdefault(ia,coords[0]);locations.setdefault(ib,coords[-1])
                result['edges'].append(dict(a=ia,b=ib,line=corridor['label'],sourceOperator=operator,sourceLine=line,km=km,coords=coords))
    # Only retain the component connected to the original network; isolated clipped fragments are not candidates.
    adjacency=collections.defaultdict(set)
    for e in result['edges']:adjacency[e['a']].add(e['b']);adjacency[e['b']].add(e['a'])
    reachable=set();todo=['東京']
    while todo:
        u=todo.pop()
        if u in reachable:continue
        reachable.add(u);todo.extend(adjacency[u]-reachable)
    for name in sorted(locations.keys()-reachable):excluded.append(dict(station=name,reason='disconnected_clipped_component'))
    used={(e['operator'],e['line'],tuple(e['pair'])) for e in boundary_audit}
    if used!=set(exceptions):raise ValueError('Unexpected or unused geometry boundary exception')
    # Boundary omissions are an explicit reviewed contract. Never publish new holes silently.
    key=lambda e:json.dumps(e,sort_keys=True,ensure_ascii=False)
    actual={key(e) for e in excluded};expected={key(e) for e in spec['expectedExclusions']}
    if actual!=expected:
        raise ValueError(f'Unexpected coverage exclusions: added={sorted(actual-expected)}; removed={sorted(expected-actual)}')
    result['edges']=[e for e in result['edges'] if e['a'] in reachable and e['b'] in reachable]
    result['stations'] += [dict(id=name,coords=coords) for name,coords in sorted(locations.items()) if name not in old and name in reachable]
    for original,canonical in spec['identityExceptions'].items():
        raw=original.split('/')[-1]
        if canonical!=raw:
            for station in result['stations']:
                if station['id']==canonical: station.setdefault('aliases',[]).append(raw)
    result['source']['excludedConnections']=[e['pair'] for e in spec['expectedExclusions'] if 'pair' in e]
    result['source']['geometryBoundaryExceptions']=spec['geometryBoundaryExceptions']
    result['source']['bounds']=spec['bounds']
    result['source']['scope']={}
    for edge in result['edges']:
        scope=result['source']['scope'].setdefault(edge['line'],[])
        scope.extend(name for name in (edge['a'],edge['b']) if name not in scope)
    result['source']['reviewed']=spec['reviewed']
    result['source']['limits']='対象駅範囲を固定。明示した2区間のみ原典形状の微小な境界逸脱を許容。明示乗換駅間の徒歩は距離に含めない。大塚駅前/大塚・三ノ輪橋/三ノ輪以外の異名駅徒歩乗換・新幹線・一方向運行は未対応。'
    included_names={s['id'] for s in result['stations']}
    missing=[dict(operator=s['operator'],line=s['line'],station=s['name']) for s in stations if inside((s['lng'],s['lat'])) and ((s['operator'],s['line'],s['name']) not in served or spec['identityExceptions'].get(f"{s['operator']}/{s['line']}/{s['name']}",s['name']) not in included_names)]
    coverage=dict(bounds=spec['bounds'],baselineStations=76,stations=len(result['stations']),edges=len(result['edges']),excluded=excluded,geometryBoundaryAudit=boundary_audit,missingSourceRecords=missing,projections=projections)
    (root/'public/coverage.json').write_text(json.dumps(coverage,ensure_ascii=False,separators=(',',':')))
    print('Coverage',len(result['stations']),'stations;',len(excluded),'exclusions')
