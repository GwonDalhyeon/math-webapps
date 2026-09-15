const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const url=pathToFileURL(path.resolve('gifted/noisy-channel/index.html')).href;
(async()=>{
 fs.mkdirSync('.work/noisy-audit',{recursive:true});
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 const context=await browser.newContext({viewport:{width:1366,height:768},reducedMotion:'reduce'});
 await context.route('https://**',route=>route.abort()); // Never send a real submission.
 const page=await context.newPage(); const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto(url);
 const go=async id=>page.evaluate(id=>navTo(id),id);
 await page.locator('#student-sid').fill('TEST'); await page.locator('#student-name').fill('수학');
 await page.locator('#next-button').click();
 assert.equal(await page.locator('#screen-count').textContent(),'2 / 24');
 const ids=await page.evaluate(()=>SCREEN_ORDER.map(x=>x.id));
 await page.evaluate(()=>{state.includeOptional=true});
 for(const id of ids) {await go(id); assert.equal(await page.locator('.screen h2').count(),1);}
 for (const [id,src] of [['C1','./assets/comic-1.png'],['C2','./assets/comic-2.png']]) {
  await go(id);
  assert.equal(await page.locator('.comic-image').getAttribute('src'),src);
  assert.ok(await page.locator('.comic-image').evaluate(image=>image.complete&&image.naturalWidth>0));
  assert.equal(await page.locator('.comic-script').count(),1);
 }
 console.log('28 views render and allow skipping; C1/C2 images load with fallback scripts');
 await go('N5_operate'); await page.locator('label[for="n5-count-4"]').click();
 assert.ok(await page.locator('.tie').count()>0); console.log('4 rows show ties');
 await go('N11');
 const expected=await page.evaluate(()=>parityExpected());
 for(let r=0;r<7;r++)for(let c=0;c<7;c++)if(!r||!c){let cell=page.locator(`[data-parity-cell="${r},${c}"]`);await cell.click();if(expected[r][c])await cell.click();}
 assert.ok(await page.evaluate(()=>checkParityGrid().ok));
 await page.locator('[data-parity-cell="0,0"]').click();assert.equal(await page.evaluate(()=>checkParityGrid().ok),false);
 console.log('parity filling and incorrect corner checked via UI');
 await go('N7');
 await page.locator('[data-add-block="repeat3"]').click();
 await page.locator('[data-node-action="up"][data-node-index="2"]').focus();
 await page.keyboard.press('Enter');
 assert.equal(await page.evaluate(()=>state.circuits.N7.nodes.join(',')),'message,repeat3,noise,receiver');
 await page.locator('[data-add-block="majority"]').click();
 await page.locator('#run-circuit').click();
 assert.equal(await page.evaluate(()=>state.circuits.N7.lastResult.verdict),'ok');
 await page.locator('[data-add-block="parityEncode"]').click();
 assert.match(await page.locator('#screen-root').textContent(),/이전 구성의 결과/);
 console.log('keyboard block move, actual simulation and stale snapshots pass');
 await go('N2_operate');
 await page.locator('#braille-word').fill('수학');await page.locator('#braille-word').press('Tab');
 assert.equal(await page.locator('[data-write]').count(),0);
 for(let i=0;i<3;i++) await page.locator('#resend-noise').click();
 assert.equal(await page.locator('[data-write="N2_observe"]').count(),1);
 await page.locator('[data-write="N2_observe"]').fill('같은 확률이어도 바뀌는 점은 다르다.');
 await page.locator('#resend-noise').click();
 assert.equal(await page.evaluate(()=>document.activeElement.id),'resend-noise');
 assert.equal(await page.locator('[data-write="N2_observe"]').inputValue(),'같은 확률이어도 바뀌는 점은 다르다.');
 const sampleA=await page.evaluate(()=>JSON.stringify(noiseSession('a').cells));
 await go('N2_write');assert.equal(await page.locator('#noise-rate').inputValue(),'0');
 assert.equal(await page.locator('.noise-reading output').textContent(),'수학');
 assert.equal(await page.locator('[data-write]').count(),1);
 await page.locator('[data-write="N2_explain"]').fill('몇 번 더 보내 보고 판단하겠다.');
 await page.locator('#noise-rate').focus();await page.keyboard.press('End');
 assert.equal(await page.locator('#noise-rate').inputValue(),'30');
 await page.locator('#resend-noise').click();
 await go('N2_operate');assert.equal(await page.evaluate(()=>JSON.stringify(noiseSession('a').cells)),sampleA);
 assert.equal(await page.locator('[data-write="N2_observe"]').inputValue(),'같은 확률이어도 바뀌는 점은 다르다.');
 await page.locator('#noise-rate').focus();
 await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');
 assert.equal(await page.locator('#noise-rate').inputValue(),'12');
 assert.equal(await page.evaluate(()=>document.activeElement.id),'noise-rate');
 await go('N13_write');await page.locator('[data-write="N13_one"]').fill('첫 줄\n둘째 줄');
 await page.reload();assert.equal(await page.evaluate(()=>state.screenId),'N0');
 await page.locator('#resume-button').click();assert.equal(await page.evaluate(()=>state.screenId),'N13_write');
 assert.equal(await page.locator('[data-write="N13_one"]').inputValue(),'첫 줄\n둘째 줄');
 console.log('N2 reading, gated writing, independent experiments, continuous keyboard slider and saved writing-view resume pass');
 await page.locator('#menu-button').click();
 await page.locator('.utility-details summary').click();
 await page.locator('#export-code').click();
 const progressCode=await page.locator('#progress-code').inputValue();
 const secondContext=await browser.newContext({reducedMotion:'reduce'});
 const secondPage=await secondContext.newPage();await secondPage.goto(url);
 await secondPage.locator('#menu-button').click();await secondPage.locator('.utility-details summary').click();
 await secondPage.locator('#progress-code').fill(progressCode);await secondPage.locator('#import-code').click();
 assert.equal(await secondPage.evaluate(()=>state.screenId),'N13_write');
 assert.equal(await secondPage.locator('[data-write="N13_one"]').inputValue(),'첫 줄\n둘째 줄');
 assert.equal(await secondPage.evaluate(()=>state.screens.N2.sessions.b.rate),30);
 assert.equal(await secondPage.evaluate(()=>state.writes.N2_observe),'같은 확률이어도 바뀌는 점은 다르다.');
 await secondContext.close();
 await page.locator('#menu-close').click();
 console.log('UTF-8 progress code resumes in independent browser storage');
 await go('N12');
 for(let round=0;round<3;round++) {
  // Solve from visible received data AND parity, without reading the hidden error coordinate.
  const target=await page.locator('[data-parity-board]').evaluate(board=>{
   const values=[...board.children].filter(x=>x.classList.contains('grid-cell')).map(x=>Number(x.textContent));
   let row,col;for(let r=1;r<7;r++)if(values.slice(r*7,r*7+7).reduce((a,b)=>a+b,0)%2)row=r;
   for(let c=1;c<7;c++)if(Array.from({length:7},(_,r)=>values[r*7+c]).reduce((a,b)=>a+b,0)%2)col=c;
   return `${row-1},${col-1}`;
  });
  await page.locator(`[data-find-cell="${target}"]`).click();
  if(round<2)await page.locator('#next-n12-round').click();
 }
 assert.equal(await page.evaluate(()=>submissionSummary().statuses.find(item=>item.id==='N12').status),'해결 (3판)');
 await go('N15_operate');
 const groups=[[1,3,5,7],[2,3,6,7],[4,5,6,7]];
 for(let g=0;g<3;g++)for(const n of groups[g]) {
  await page.locator(`[data-number="${n}"]`).click();await page.locator(`[data-box="${g}"]`).press('Enter');
 }
 await page.locator('#check-n15').click();assert.equal(await page.evaluate(()=>state.screens.N15.checked),true);
 await go('N16');
 for(let round=0;round<3;round++) {
  const pattern=await page.locator('.notice strong').textContent();
  const answer=Array.from({length:8},(_,i)=>i).find(i=>groups.map(group=>i&&group.includes(i)?1:0).join('')===pattern);
  await page.locator(`label[for="n16-${answer}"]`).click();
  if(round<2)await page.locator('#next-n16').click();
 }
 console.log('three parity rounds and three student-designed question rounds pass');
 await go('N3');await page.locator('label[for="n3-3회"]').click();await page.locator('#confirm-n3').click();
 assert.equal(await page.evaluate(()=>state.predicts.N3.confirmed.beforeExperiment),false);
 console.log('post-experiment prediction is marked late');
 await go('N21');await page.evaluate(()=>{window.fetch=async()=>{throw new Error('offline test')}});await page.locator('#submit-button').click();
 await page.waitForFunction(()=>!submissionInFlight);
 assert.equal(await page.evaluate(()=>state.submitted.result),'fail');
 assert.equal(await page.locator('#submit-button').isEnabled(),true);assert.equal(await page.locator('#download-button').count(),1);
 console.log('offline submission exposes retry and download');
 await page.evaluate(()=>{window.fetch=async()=>({ok:true,text:async()=>'<html>not ok</html>'})});
 await page.locator('#submit-button').click();await page.waitForFunction(()=>!submissionInFlight);
 assert.equal(await page.evaluate(()=>state.submitted.result),'fail');
 await page.evaluate(()=>{window.fetch=async()=>({ok:true,text:async()=>'ok'})});
 await page.locator('#submit-button').click();await page.waitForFunction(()=>!submissionInFlight);
 assert.equal(await page.evaluate(()=>state.submitted.result),'ok');assert.equal(await page.locator('#submit-button').isDisabled(),true);
 console.log('mocked rejection and acknowledgement distinguish submission outcomes');
 fs.writeFileSync('.work/noisy-audit/submission.html',await page.evaluate(()=>buildSubmissionHtml()));
 const exportPage=await context.newPage();await exportPage.goto(pathToFileURL(path.resolve('.work/noisy-audit/submission.html')).href);
 assert.match(await exportPage.locator('body').innerText(),/첫 줄\n둘째 줄/);await exportPage.close();
 assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('.screen')).animationName),'none');
 const layout=[];
 for(const [width,height] of [[375,812],[768,1024],[1180,820],[820,1180],[1366,768],[683,384]]) {
  await page.setViewportSize({width,height});
  for(const id of ids){await go(id);const metrics=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,small:[...document.querySelectorAll('#screen-root button:not(:disabled)')].filter(x=>{const r=x.getBoundingClientRect();return r.width<43||r.height<43}).map(x=>x.textContent)}));if(metrics.overflow||metrics.small.length)layout.push({width,id,...metrics});}
 }
 fs.writeFileSync('.work/noisy-audit/layout.json',JSON.stringify(layout,null,2));
 console.log('layout issues',JSON.stringify(layout));assert.deepEqual(layout,[]);
 await page.setViewportSize({width:1180,height:820});await go('N12');await page.screenshot({path:'.work/noisy-audit/parity-desktop.png',fullPage:true});
 await page.setViewportSize({width:375,height:812});await go('N5_operate');await page.screenshot({path:'.work/noisy-audit/majority-mobile.png',fullPage:true});
 for (const [width,height] of [[1180,820],[820,1180],[1366,768],[375,812]]) {
  await page.setViewportSize({width,height});
  for (const id of ['N2_operate','N2_write','N14','N15_operate']) {
   await go(id);await page.screenshot({path:`.work/noisy-audit/${id}-${width}.png`,fullPage:true});
  }
 }
 console.log('pageerrors',errors);assert.deepEqual(errors,[]);
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});


