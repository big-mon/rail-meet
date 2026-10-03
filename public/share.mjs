const BASE='https://app.damonge.com/rail-meet/';
export function checkOrigins(origins,data){
 if(!Array.isArray(origins)||origins.length<2||origins.length>4||origins.some(s=>typeof s!=='string'||!s||s.length>40))throw Error('出発駅IDを2〜4件指定してください。');
 const ids=new Set(data.stations.map(s=>s.id));
 if(origins.some(s=>!ids.has(s)))throw Error('駅一覧のIDと完全一致する出発駅を指定してください。駅名の補完・曖昧一致は行いません。');
 return origins;
}
export function shareUrl(origins,station){
 const hash=new URLSearchParams({v:'1'});origins.forEach(s=>hash.append('from',s));hash.set('to',station);
 return BASE+'#'+hash;
}
export function readShare(hash,data){
 if(!hash||hash==='#')return null;
 if(hash.length>1500)throw Error('共有URLが長すぎます。');
 const p=new URLSearchParams(hash.slice(1));
 // Ordinary anchors (e.g. #credits) are not shared results.
 if(!p.has('v')&&!p.has('from')&&!p.has('to'))return null;
 if([...p.keys()].some(k=>!['v','from','to'].includes(k))||p.getAll('v').length!==1||p.get('v')!=='1'||p.getAll('to').length!==1)throw Error('共有URLの形式が正しくありません。');
 const origins=checkOrigins(p.getAll('from'),data),station=p.get('to');
 if(!data.stations.some(s=>s.id===station))throw Error('共有URLの集合駅が対象外です。');
 return {origins,station};
}
