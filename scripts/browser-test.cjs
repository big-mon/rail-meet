const {openResults}=require('./browser-helpers.cjs');
const path=require('node:path');process.chdir(path.resolve(__dirname,'..'));require('node:fs').mkdirSync('evidence',{recursive:true});
const {chromium}=require('playwright');
const assert=require('node:assert/strict');const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox']});
 const results=[];const requests=[];const page=await browser.newPage({viewport:{width:1360,height:1080}});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
 // All rendering data is local; no external map requests are permitted.
 await page.goto('http://127.0.0.1:4173');await openResults(page);await page.waitForSelector('.candidate');
 assert.equal(await page.locator('.candidate').count(),3);assert.match(await page.locator('#map-title').textContent(),/錦糸町/);
 await page.waitForFunction(()=>document.querySelector('#background-status').textContent.includes('概略図'));
 assert(await page.locator('.person-route').count()>10);results.push('Initial 千葉 / 横浜; three candidates; vector prefecture/coast background');
 await page.screenshot({path:'evidence/desktop-default.png',fullPage:true});
 const before=await page.locator('.person-route').evaluateAll(els=>els.map(e=>e.getAttribute('d')).join('|'));
 const beforeDetail=await page.locator('#route-details').textContent();
 await page.locator('[data-candidate="1"]').click();assert.match(await page.locator('#map-title').textContent(),/亀戸/);
 assert.notEqual(await page.locator('#route-details').textContent(),beforeDetail);
 assert.notEqual(await page.locator('.person-route').evaluateAll(els=>els.map(e=>e.getAttribute('d')).join('|')),before);
 results.push('Candidate switch updates station, distance and rail path');
 await page.locator('#origin-1').selectOption('千葉');assert.match(await page.locator('#details-title').textContent(),/千葉/);assert.equal(await page.locator('.person-route').count(),0);assert.match(await page.locator('#route-details').textContent(),/0.0/);
 assert.match(await page.locator('#status').textContent(),/別々/);results.push('Same station and duplicate participants produce zero-distance result');
 await page.locator('#origin-1').selectOption('横浜');await page.locator('#add').click();await page.locator('#origin-2').selectOption('千葉');
 assert(await page.locator('.person-0').count()>0);assert(await page.locator('.person-2').count()>0);
 const width0=Number(await page.locator('.person-0').first().getAttribute('stroke-width'));const width2=Number(await page.locator('.person-2').first().getAttribute('stroke-width'));assert(width0>width2);
 await page.locator('[data-person="0"]').click();assert.equal(await page.locator('.person-0').count(),0);assert(await page.locator('.person-2').count()>0);await page.locator('[data-person="0"]').click();
 results.push('Overlapping routes have distinct concentric widths and independently toggle');
 await page.screenshot({path:'evidence/overlap.png',fullPage:true});
 await page.locator('#add').click();assert(await page.locator('#add').isDisabled());assert.equal(await page.locator('select').count(),4);
 await page.locator('[data-remove="3"]').click();await page.locator('[data-remove="2"]').click();results.push('2–4 participant add/remove limits');
 // Demonstrate the requested added stations in the final screenshots.
 await page.locator('#add').click();await page.locator('#origin-2').selectOption('渋谷');
 assert.equal(await page.locator('#origin-0 option').count(),76);
 for(const station of ['渋谷','新宿','池袋','御茶ノ水','浅草橋','両国','吉祥寺','三鷹'])assert(await page.locator(`#origin-0 option[value="${station}"]`).count()||await page.locator('#origin-0').evaluate((el,s)=>[...el.options].some(o=>o.value===s),station));
 for(const pair of [['渋谷','千葉'],['新宿','横浜'],['池袋','津田沼'],['三鷹','千葉']]){await page.locator('#origin-0').selectOption(pair[0]);await page.locator('#origin-1').selectOption(pair[1]);assert.equal(await page.locator('.candidate').count(),3);assert(await page.locator('.person-route').count()>5);}
 await page.locator('#origin-0').selectOption('千葉');await page.locator('#origin-1').selectOption('横浜');
 assert.equal(await page.locator('#basemap').count(),0);assert.equal(await page.locator('.map-footer input').count(),0);
 assert.equal(await page.locator('.leaflet-control-attribution').count(),0);
 assert.deepEqual(await page.locator('.credits a').evaluateAll(es=>es.map(e=>e.getAttribute('href'))),['sources.html#rail-data','sources.html#boundary-data','sources.html#leaflet','sources.html#artwork']);
 const licenseResponse=await page.request.get('http://127.0.0.1:4173/vendor/leaflet-LICENSE.txt');assert(licenseResponse.ok());const license=await licenseResponse.text();assert.match(license,/Copyright/);assert.match(license,/AS IS/);
 await page.waitForTimeout(300);
 const mapRect=await page.locator('#map').boundingBox();
 for(const name of ['千葉','横浜','渋谷']){const rect=await page.locator('.origin-callout').filter({hasText:name}).boundingBox();assert(rect&&rect.x>=mapRect.x&&rect.y>=mapRect.y&&rect.x+rect.width<=mapRect.x+mapRect.width&&rect.y+rect.height<=mapRect.y+mapRect.height,`Origin bubble must fit: ${name}`);}
 const colors=await page.locator('.origin-badge').evaluateAll(es=>es.map(e=>({letter:e.textContent,color:getComputedStyle(e).backgroundColor})).sort((a,b)=>a.letter.localeCompare(b.letter)));
 const inputColors=await page.locator('.origin-field .person-dot').evaluateAll(es=>es.map(e=>({letter:e.textContent,color:getComputedStyle(e).backgroundColor})).sort((a,b)=>a.letter.localeCompare(b.letter)));assert.deepEqual(colors,inputColors);
 const contrast=await page.locator('.origin-badge').evaluateAll(es=>es.map(e=>{const rgb=getComputedStyle(e).backgroundColor.match(/\d+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});return 1.05/(rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722+.05);}));assert(contrast.every(c=>c>=4.5));

 await page.waitForTimeout(1400);
 await page.screenshot({path:'evidence/desktop.png',fullPage:true});
 results.push('Added Shibuya/Shinjuku/Ikebukuro/Chuo-Sobu stations; representative pairs; always-on background; branded badges; footer licenses and data attribution; no on-map credits');
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(600);
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.locator('#map').scrollIntoViewIfNeeded();await page.locator('.map-panel').screenshot({path:'evidence/mobile-map.png'});
 await page.screenshot({path:'evidence/mobile-full.png',fullPage:true});
 await page.locator('#fit').click();await page.locator('[aria-label="地図を拡大"]').click();
 await page.setViewportSize({width:320,height:700});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.locator('#add').click();for(let i=0;i<4;i++)await page.locator(`#origin-${i}`).selectOption('千葉');await page.waitForTimeout(200);
 assert.equal(await page.locator('.origin-callout').count(),1);assert.equal(await page.locator('.origin-badge').count(),4);assert.equal(await page.locator('.origin-badges').textContent(),'ABCD');
 const shared=await page.locator('.origin-callout').boundingBox(),mapBox=await page.locator('#map').boundingBox(),destination=await page.locator('.destination-label').boundingBox();
 assert(shared.x>=mapBox.x&&shared.x+shared.width<=mapBox.x+mapBox.width);assert(shared.y+shared.height<destination.y);
 const rects=await page.locator('.origin-badge').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().toJSON()));for(let i=1;i<rects.length;i++)assert(rects[i-1].right<rects[i].left);
 await page.locator('.map-panel').screenshot({path:'evidence/mobile-shared-origin.png'});
 results.push('320px: four same-station origins grouped into four non-overlapping letter badges; destination remains separate');
 await page.locator('footer').scrollIntoViewIfNeeded();
 for(const link of await page.locator('.credits a, footer a').all()){const b=await link.boundingBox();assert(b.height>=44&&b.x>=0&&b.x+b.width<=320);assert(await link.evaluate(e=>parseFloat(getComputedStyle(e).fontSize)>=13));}
 await page.locator('#credits').screenshot({path:'evidence/mobile-footer.png'});
 await page.locator('.credits a').first().click();assert(page.url().endsWith('#rail-data'));assert(await page.locator('#rail-data').isVisible());assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.goBack();await openResults(page);await page.waitForSelector('.candidate');
 await page.evaluate(()=>{localStorage.setItem('basemap','false');localStorage.setItem('showBasemap','false');});await page.reload();await openResults(page);await page.waitForFunction(()=>document.querySelector('#background-status').textContent.includes('概略図'));assert.equal(await page.locator('#basemap').count(),0);
 assert.equal(await page.locator('.origin-badge').count(),2);results.push('Always-on background ignores old off values after reload; 390px and 320px layouts');
 const backgroundFailure=await browser.newPage();await backgroundFailure.route('**/basemap.json',r=>r.fulfill({status:503,body:'unavailable'}));await backgroundFailure.goto('http://127.0.0.1:4173');await openResults(backgroundFailure);await backgroundFailure.waitForSelector('.candidate');await backgroundFailure.waitForFunction(()=>document.querySelector('#background-status').textContent.includes('取得できません'));assert(await backgroundFailure.locator('.person-route').count()>10);await backgroundFailure.screenshot({path:'evidence/basemap-failure.png',fullPage:true});
 await backgroundFailure.unroute('**/basemap.json');await backgroundFailure.reload();await openResults(backgroundFailure);await backgroundFailure.waitForFunction(()=>[...document.querySelectorAll('.leaflet-context-pane path')].some(e=>e.getAttribute('d').length>20));results.push('Basemap load failure preserves rail routes and supports retry');
 const failure=await browser.newPage();await failure.route('**/network.json',r=>r.fulfill({status:503,body:'unavailable'}));await failure.goto('http://127.0.0.1:4173');await failure.waitForSelector('#retry');assert(await failure.locator('#results').isHidden());assert(await failure.locator('#add').isDisabled());
 await failure.screenshot({path:'evidence/load-failure.png'});
 await failure.unroute('**/network.json');await failure.locator('#retry').click();await openResults(failure);await failure.waitForSelector('.candidate');results.push('Data load failure, no stale results, and successful retry');
 // Unreachable UI with a valid but isolated fixture (never shipped).
 const data=JSON.parse(fs.readFileSync('dist/network.json'));
 data.stations.push({id:'孤立駅',coords:[140,35]});await failure.route('**/network.json',r=>r.fulfill({json:data}));await failure.reload();await openResults(failure);await failure.waitForSelector('.candidate');await failure.locator('#origin-0').selectOption('孤立駅');assert(await failure.locator('#results').isHidden());assert.match(await failure.locator('#status').textContent(),/到達/);results.push('Unreachable UI gives actionable error');
 assert.deepEqual(errors,[]);assert(requests.every(u=>u.startsWith('http://127.0.0.1:4173/')));results.push('Zero external requests, zero raster tile images, zero JavaScript errors');assert.equal(await page.locator('.leaflet-tile').count(),0);fs.writeFileSync('evidence/browser-tests.json',JSON.stringify({result:'PASS',checks:results,pageErrors:errors,browser:await browser.version(),externalRequests:requests.filter(u=>!u.startsWith('http://127.0.0.1:4173/'))},null,2));console.log(results.join('\n'));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
