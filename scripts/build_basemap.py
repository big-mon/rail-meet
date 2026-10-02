"""Create a small, tile-free regional basemap. Stdlib only; no road/POI layers."""
import json,math,pathlib,hashlib
ROOT=pathlib.Path(__file__).resolve().parents[1]
# Regional source subset is retained so this build never needs a network call.
data=json.loads((ROOT/'data-source/prefectures.json').read_text())
def dist2(p,a,b):
 dx=b[0]-a[0];dy=b[1]-a[1];t=max(0,min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy))) if dx or dy else 0
 return (p[0]-a[0]-t*dx)**2+(p[1]-a[1]-t*dy)**2
def simplify(ps,tolerance=.0018):
 # RDP in longitude/latitude: about 160–200 m locally. For orientation only.
 if len(ps)<3:return ps
 idx=max(range(1,len(ps)-1),key=lambda i:dist2(ps[i],ps[0],ps[-1]))
 if dist2(ps[idx],ps[0],ps[-1])<=tolerance*tolerance:return [ps[0],ps[-1]]
 return simplify(ps[:idx+1],tolerance)[:-1]+simplify(ps[idx:],tolerance)
def area(ps):return abs(sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(ps,ps[1:])))/2
features=[]
for f in data['features']:
 polys=f['geometry']['coordinates'] if f['geometry']['type']=='MultiPolygon' else [f['geometry']['coordinates']]
 selected=[]
 for rings in polys:
  if not any(139.0<p[0]<140.9 and 35.05<p[1]<36.4 for p in rings[0]):continue
  if area(rings[0])<.00004:continue
  out=[]
  for ring in rings:
   # Split closed ring at farthest vertex so RDP has a nondegenerate baseline.
   idx=max(range(len(ring)-1),key=lambda i:dist2(ring[i],ring[0],ring[0]))
   ps=simplify(ring[:idx+1])[:-1]+simplify(ring[idx:])
   if len(ps)>=4:out.append([[round(x,5),round(y,5)] for x,y in ps])
  if out:selected.append(out)
 if selected:features.append({'type':'Feature','properties':{'name':f['properties']['P']},'geometry':{'type':'MultiPolygon','coordinates':selected}})
output={'type':'FeatureCollection','features':features,'source':{'dataset':'国土数値情報 N03-19_190101','date':'2019-01-01','license':'国土数値情報の適用利用規約（PDL1.0）','processing':'都県単位に統合された公開ミラーから抽出、約160〜200mで輪郭を簡略化。小島省略。位置関係の概略表示専用。'}}
(ROOT/'dist/basemap.json').write_text(json.dumps(output,ensure_ascii=False,separators=(',',':')))
print(len(features),'prefectures;', (ROOT/'dist/basemap.json').stat().st_size,'bytes')
