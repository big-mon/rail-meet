exports.openResults=async page=>{
  await page.waitForFunction(()=>!document.querySelector('#find').disabled);
  if(await page.locator('#results').isHidden())await page.locator('#find').evaluate(button=>button.click());
};
exports.selectStation=async(page,index,station)=>{
 const route=await page.evaluate(async station=>{
  const data=await(await fetch('./network.json')).json();
  return data.selectionRoutes.find(r=>r.stations.some(s=>s.id===station));
 },station);
 if(!route)throw Error('No picker route for '+station);
 await page.locator('#operator-'+index).selectOption(route.operator);
 await page.locator('#line-'+index).selectOption(route.id);
 await page.locator('#origin-'+index).selectOption(station);
};
