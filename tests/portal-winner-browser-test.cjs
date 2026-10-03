const {selectStation}=require('./browser-helpers.cjs');
const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox']});
 for(const width of [320,390,1360]){
  const page=await browser.newPage({viewport:{width,height:900}});
  await page.goto((process.env.TEST_URL||'http://127.0.0.1:4173')+'/');
  async function onlyWinner(){
   const names=await page.locator('.candidate h3').allTextContents();assert.equal(names.length,3);
   assert.equal(await page.locator('.mouth-portal').count(),1);
   assert.equal(await page.locator('.portal-result strong').textContent(),names[0]+'駅');
   const text=await page.locator('.mouth-portal').textContent();
   for(const name of names.slice(1))assert(!text.includes(name));
   assert.equal(await page.locator('.portal-options').count(),0);
   return names[0];
  }
  await page.locator('#find').click();assert.equal(await onlyWinner(),'新木場');
  await page.waitForSelector('.mouth-portal[data-phase=result]');await page.waitForTimeout(400);
  const box=await page.locator('.portal-result strong').boundingBox();assert(box.x>=0&&box.x+box.width<=width);
  await page.screenshot({path:`evidence/portal-winner-normal-${width}.png`});
  await page.keyboard.press('Escape');assert.equal(await page.locator('.mouth-portal').count(),0);
  await page.locator('[data-candidate="1"]').evaluate(e=>e.click());assert.equal(await page.locator('#meeting-name').textContent(),'葛西臨海公園');
  await page.locator('#map').scrollIntoViewIfNeeded();await page.waitForSelector('.travel-piece');
  await selectStation(page,0,'新宿');
  const latest=await page.locator('.candidate h3').first().textContent();assert.notEqual(latest,'新木場');
  await page.locator('#find').evaluate(e=>{for(let i=0;i<8;i++)e.click()});assert.equal(await onlyWinner(),latest);
  await page.locator('[data-candidate="2"]').evaluate(e=>e.click());assert.equal(await page.locator('.mouth-portal').count(),0);
  await page.waitForTimeout(2800);assert.equal(await page.locator('.mouth-portal').count(),0);
  await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#find').click();assert.equal(await onlyWinner(),latest);
  assert.equal(await page.locator('.mouth-portal').getAttribute('data-phase'),'result');
  await page.locator('.portal-skip').click();assert.equal(await page.locator('.candidate').count(),3);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.close();
 }
 await browser.close();console.log('PASS first-ranked station only: normal page, 320/390/1360, recalculation, rapid clicks, cancellation, reduced motion and static alternatives');
})().catch(e=>{console.error(e);process.exit(1)});
