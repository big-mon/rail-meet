exports.openResults=async page=>{
  await page.waitForFunction(()=>!document.querySelector('#find').disabled);
  if(await page.locator('#results').isHidden())await page.locator('#find').evaluate(button=>button.click());
};
