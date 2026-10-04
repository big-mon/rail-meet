"""Ensure every displayed railway segment lies on a source N02 line (including projected endpoints)."""
import json,pathlib,math
root=pathlib.Path(__file__).resolve().parents[1]
network=json.loads((root/'public/network.json').read_text());sections=json.loads((root/'data-source/sections.json').read_text())
by_line={}
for s in sections:
 cs=s['coordinates'];paths=[cs] if isinstance(cs[0][0],(int,float)) else cs
 for path in paths:by_line.setdefault((s['operator'],s['line']),[]).extend(zip(path,path[1:]))
def error(p,a,b):
 dx=b[0]-a[0];dy=b[1]-a[1];t=max(0,min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy))) if dx or dy else 0
 return math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy)
count=0
for edge in network['edges']:
 for u,v in zip(edge['coords'],edge['coords'][1:]):
  assert any(max(error(u,a,b),error(v,a,b))<1e-8 for a,b in by_line[edge['sourceOperator'],edge['sourceLine']]),(edge['a'],edge['b'],u,v)
  count+=1
print(json.dumps({'result':'PASS','railwayEdges':len(network['edges']),'sourceSegmentsVerified':count,'toleranceDegrees':1e-8,'noStationToStationChords':True}))
