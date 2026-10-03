const{chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox']});
 for(const width of [320,390,1360]){
  const p=await browser.newPage({viewport:{width,height:900},hasTouch:true,reducedMotion:'reduce'}),cdp=await p.context().newCDPSession(p);
  await p.goto((process.env.TEST_URL||'http://127.0.0.1:4173')+'/');await p.locator('#find').click();await p.locator('.portal-skip').click();await p.locator('#map').scrollIntoViewIfNeeded();await p.waitForTimeout(250);
  const state=()=>p.evaluate(()=>({pane:document.querySelector('.leaflet-map-pane').style.transform,paths:[...document.querySelectorAll('.person-route')].map(e=>e.getAttribute('d')),origins:[...document.querySelectorAll('.origin-marker')].map(e=>e.style.transform)}));
  const fixed=await state();assert.equal(await p.locator('#map [tabindex],#map button,#map a,.leaflet-control-zoom,#legend button,.leaflet-interactive').count(),0);assert.equal(await p.locator('#map').getAttribute('tabindex'),null);
  async function center(){await p.locator('#map').scrollIntoViewIfNeeded();const r=await p.locator('#map').boundingBox();return {x:r.x+r.width/2,y:Math.min(700,r.y+r.height/2)};}
  let c=await center();await p.mouse.dblclick(c.x,c.y);await p.keyboard.down('Shift');await p.mouse.move(c.x,c.y);await p.mouse.down();await p.mouse.move(c.x+50,c.y-80,{steps:5});await p.mouse.up();await p.keyboard.up('Shift');assert.deepEqual(await state(),fixed);
  c=await center();const y=await p.evaluate(()=>scrollY);await p.mouse.move(c.x,c.y);await p.mouse.wheel(0,160);await p.waitForTimeout(250);assert(await p.evaluate(()=>scrollY)>y);assert.deepEqual(await state(),fixed);
  c=await center();const touchY=await p.evaluate(()=>scrollY);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[c]});for(let i=1;i<=6;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:c.x,y:c.y-i*20}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(250);assert(await p.evaluate(()=>scrollY)>touchY);assert.deepEqual(await state(),fixed);
  c=await center();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:c.x-20,y:c.y},{x:c.x+20,y:c.y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:c.x-50,y:c.y},{x:c.x+50,y:c.y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.deepEqual(await state(),fixed);
  await p.locator('#find').focus();await p.keyboard.press('Tab');assert(await p.locator('#route-details summary').first().evaluate(e=>e===document.activeElement));await p.keyboard.press('+');await p.keyboard.press('ArrowRight');assert.deepEqual(await state(),fixed);
  await p.locator('[data-candidate="1"]').evaluate(e=>e.click());assert.notDeepEqual((await state()).paths,fixed.paths);assert.equal(await p.locator('#meeting-name').textContent(),'亀戸');
  for(const size of [{width:844,height:390},{width,height:900}]){await p.setViewportSize(size);await p.waitForTimeout(350);const m=await p.locator('#map').boundingBox();for(const label of await p.locator('.origin-callout,.destination-label').all()){const r=await label.boundingBox();assert(r.x>=m.x-1&&r.y>=m.y-1&&r.x+r.width<=m.x+m.width+1&&r.y+r.height<=m.y+m.height+1);}}
  await p.locator('#map').scrollIntoViewIfNeeded();await p.screenshot({path:`evidence/fixed-map-normal-${width}.png`});await p.close();
 }
 await browser.close();console.log('PASS display-only map: normal page, 320/390/1360, wheel/touch page scrolling, drag/pinch/doubleclick/keyboard invariance, no map tab stops, candidate and orientation fit');
})().catch(e=>{console.error(e);process.exit(1)});
