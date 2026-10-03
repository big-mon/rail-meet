"""Station selection metadata only. Never changes routing edges or distances."""
import json

def build_picker(root, network):
    spec = json.loads((root/'data-source/station-picker.json').read_text())
    source = json.loads((root/'data-source/corridors.json').read_text())
    known = {s['id'] for s in network['stations']}
    routes = []
    for c in spec['extraRoutes'] + source['corridors']:
        selection = c.get('selection', {})
        operator = selection.get('operator', c['operator'])
        label = selection.get('label', c['label'])
        names = selection.get('stations', c['stations'])
        if c in spec['extraRoutes'] or 'stations' in selection:
            assert set(names) <= known, f'Unknown picker station in {label}'
        parts = [(label, names, c.get('loop', False))]
        if 'splitAt' in selection:
            pivot = names.index(selection['splitAt'])
            parts = [(label+'（'+names[0]+'〜'+names[pivot]+'）', names[:pivot+1], False),
                     (label+'（環状部）', names[pivot:-1], True)]
        for title, names, loop in parts:
            # Preserve source station names (e.g. 大塚駅前) while sharing canonical IDs.
            stops = []
            for name in names:
                key = f"{c['operator']}/{c.get('line','')}/{name}"
                station = source['identityExceptions'].get(key, name)
                if station in known:
                    stops.append({'id': station, 'name': name})
            if len(stops) < 2:
                continue
            assert len({s['id'] for s in stops}) == len(stops), title
            routes.append(dict(id=operator+'/'+title, operator=operator,
                operatorName=spec['operators'].get(operator, operator), label=title,
                stations=stops, loop=loop, reference=c['reference']))
    assert len({r['id'] for r in routes}) == len(routes)
    assert {s['id'] for r in routes for s in r['stations']} == known, 'Unselectable stations'
    network['selectionRoutes'] = routes
