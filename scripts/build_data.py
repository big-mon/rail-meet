"""Build a deliberately bounded station graph from N02-24 geometry. Stdlib only."""
import json, math, heapq, pathlib, hashlib
ROOT=pathlib.Path(__file__).resolve().parents[1]
# Explicit service corridors: N02 source line is separate from the rider-facing name.
CHAINS=[
 ('総武線', '総武線（東京〜千葉）', '東京 新日本橋 馬喰町 錦糸町 亀戸 平井 新小岩 小岩 市川 本八幡 下総中山 西船橋 船橋 東船橋 津田沼 幕張本郷 幕張 新検見川 稲毛 西千葉 千葉'.split()),
 ('東海道線', '京浜東北線沿い', '東京 有楽町 新橋 浜松町 田町 高輪ゲートウェイ 品川 大井町 大森 蒲田 川崎 鶴見 新子安 東神奈川 横浜'.split()),
 ('総武線', '中央・総武各駅停車', '御茶ノ水 秋葉原 浅草橋 両国 錦糸町'.split()),
 ('中央線', '中央線・中央総武各駅停車', '神田 御茶ノ水 水道橋 飯田橋 市ヶ谷 四ツ谷 信濃町 千駄ヶ谷 代々木 新宿 大久保 東中野 中野 高円寺 阿佐ヶ谷 荻窪 西荻窪 吉祥寺 三鷹'.split()),
 ('山手線', '山手線（西側）', '品川 大崎 五反田 目黒 恵比寿 渋谷 原宿 代々木 新宿 新大久保 高田馬場 目白 池袋 大塚 巣鴨 駒込 田端'.split()),
 ('東北線', '山手線・京浜東北線（東側）', '東京 神田 秋葉原 御徒町 上野 鶯谷 日暮里 西日暮里 田端'.split())
]
sections=json.loads((ROOT/'data-source/sections.json').read_text())
stations=json.loads((ROOT/'data-source/stations.json').read_text())
def distance(a,b):
 x,y=map(math.radians,a); u,v=map(math.radians,b)
 return 6371.0088*2*math.asin(min(1,math.sqrt(math.sin((y-v)/2)**2+math.cos(y)*math.cos(v)*math.sin((x-u)/2)**2)))
def project(p,a,b):
 c=math.cos(math.radians(p[1])); dx=(b[0]-a[0])*c;dy=b[1]-a[1]
 t=max(0,min(1,(((p[0]-a[0])*c)*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy))) if dx or dy else 0
 return (a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1]))
def route(g,a,b):
 dist={a:0}; prev={}; heap=[(0,a)]
 while heap:
  d,u=heapq.heappop(heap)
  if d!=dist[u]:continue
  if u==b:break
  for v,w in g[u].items():
   nd=d+w
   if nd<dist.get(v,math.inf):dist[v]=nd;prev[v]=u;heapq.heappush(heap,(nd,v))
 if b not in dist:raise ValueError('Disconnected geometry',a,b)
 coords=[b]
 while coords[-1]!=a:coords.append(prev[coords[-1]])
 return coords[::-1],dist[b]
result={'stations':[], 'edges':[], 'source':{'dataset':'N02-24','date':'2024-12-31','license':'CC BY 4.0','mirror':'https://github.com/antfu/mlit-json','scope':{label:names for _,label,names in CHAINS}}}
locations={}; audit=[]
for line,label,names in CHAINS:
 segs=set()
 for s in sections:
  if s['operator']!='東日本旅客鉄道' or s['line']!=line:continue
  cs=s['coordinates']; paths=[cs] if isinstance(cs[0][0],(int,float)) else cs
  for path in paths:
   for a,b in zip(path,path[1:]):
    if all(139.53<p[0]<140.14 and 35.44<p[1]<35.79 for p in [a,b]) and a!=b:segs.add(tuple(sorted((tuple(a),tuple(b)))))
 splits={e:set(e) for e in segs}; anchors={}
 for name in names:
  ss=[s for s in stations if s['operator']=='東日本旅客鉄道' and s['line']==line and s['name']==name]
  # Prefer the platform nearest the coastal local alignment for Tokaido; all remain source points.
  if line in ['東海道線','東北線']:ss=sorted(ss,key=lambda s:-s['lng'])[:1]
  choices=[]
  for s in ss:
   p=(s['lng'],s['lat'])
   for a,b in segs:
    q=project(p,a,b); choices.append((distance(p,q),(a,b),q))
  error,e,q=min(choices);assert error<0.1,(line,name,error)
  splits[e].add(q);anchors[name]=q; locations.setdefault(name,q)
  audit.append({'line':line,'station':name,'projectionMetres':round(error*1000,3)})
 g={}
 for (a,b),points in splits.items():
  ps=sorted(points,key=lambda p:distance(a,p))
  for u,v in zip(ps,ps[1:]):
   w=distance(u,v);g.setdefault(u,{})[v]=w;g.setdefault(v,{})[u]=w
 # One continuous trunk prevents spurious out-and-back switches between parallel tracks.
 trunk,total=route(g,anchors[names[0]],anchors[names[-1]])
 cumulative=[0]
 for a,b in zip(trunk,trunk[1:]):cumulative.append(cumulative[-1]+distance(a,b))
 projected={}
 for name in names:
  p=anchors[name]; choices=[]
  for i,(a,b) in enumerate(zip(trunk,trunk[1:])):
   q=project(p,a,b);choices.append((distance(p,q),cumulative[i]+distance(a,q),i,q))
  error,at,idx,q=min(choices);assert error<0.15,(line,name,error)
  projected[name]=(at,idx,q);locations.setdefault(name,q)
  audit.append({'line':line,'station':name,'trunkProjectionMetres':round(error*1000,3)})
 for a,b in zip(names,names[1:]):
  da,ia,qa=projected[a];db,ib,qb=projected[b];assert db>da,(a,b,da,db)
  path=[qa]+trunk[ia+1:ib+1]+[qb]
  path=[p for i,p in enumerate(path) if i==0 or p!=path[i-1]]
  km=sum(distance(u,v) for u,v in zip(path,path[1:]));assert 0<km<5,(a,b,km)
  result['edges'].append({'a':a,'b':b,'line':label,'sourceLine':line,'km':km,'coords':path})
  print(a,b,round(km,3),len(path))
popular='東京 新宿 渋谷 池袋 横浜 千葉 品川 上野 秋葉原 錦糸町 吉祥寺 三鷹 船橋 津田沼'.split()
ordered=popular+[s for s in locations if s not in popular]
result['stations']=[{'id':s,'coords':locations[s]} for s in ordered if s in locations]
(ROOT/'public/network.json').write_text(json.dumps(result,ensure_ascii=False,separators=(',',':')))
(ROOT/'evidence').mkdir(exist_ok=True)
(ROOT/'evidence/data-audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2))
print('stations',len(result['stations']),'edges',len(result['edges']))
