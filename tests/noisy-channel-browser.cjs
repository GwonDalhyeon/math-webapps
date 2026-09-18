/* Local UI regression. Every external request is blocked; submission uses mocks only.
   PLAYWRIGHT_MODULE may point to a bundled installation; no npm install is required. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const url=pathToFileURL(path.resolve(__dirname,'../gifted/noisy-channel/index.html')).href;
const out=path.resolve(__dirname,'../.work/noisy-audit-20260917');
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try {
  const context=await browser.newContext({viewport:{width:1180,height:820},reducedMotion:'reduce'});
  await context.route('https://**',route=>route.abort());
  const page=await context.newPage(); const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.setDefaultTimeout(5000);
  await page.goto(url);
  const go=async id=>page.evaluate(id=>navTo(id),id);
  await page.locator('#next-button').click();
  assert.equal(await page.evaluate(()=>state.screenId),'N0');
  assert.equal(await page.locator('#student-school').evaluate(el=>el===document.activeElement),true);
  await page.locator('#menu-button').click(); await page.locator('[data-nav="N14"]').click();
  assert.equal(await page.evaluate(()=>state.screenId),'N0');
  await page.locator('#page-number').fill('25');await page.locator('#page-number').press('Enter');
  assert.equal(await page.evaluate(()=>state.screenId),'N0');
  assert.equal(await page.locator('#page-number').inputValue(),'1');
  await page.locator('#student-school').fill('검토학교'); await page.locator('#student-sid').fill('2101'); await page.locator('#student-name').fill('검토학생');
  await page.locator('#next-button').click(); assert.equal(await page.locator('#page-number').inputValue(),'2');
  assert.equal(await page.locator('#page-total').textContent(),'/ 29');
  await page.locator('#page-number').fill('29');await page.locator('#page-number').press('Enter');
  assert.equal(await page.evaluate(()=>state.screenId),'N21');
  for(const invalid of ['0','30','2.5','']) {
   await page.locator('#page-number').fill(invalid);await page.locator('#page-number').press('Enter');
   assert.equal(await page.evaluate(()=>state.screenId),'N21');
   assert.equal(await page.locator('#page-number').evaluate(el=>el.validity.valid),false);
  }
  await page.locator('#page-number').press('Escape');assert.equal(await page.locator('#page-number').inputValue(),'29');
  const required=await page.evaluate(()=>activeScreens().map(x=>x.id));
  for(const id of required) {await go(id);assert.equal(await page.locator('.screen h2').count(),1,id);}
  await go('N0'); await page.locator('#include-optional').check();
  assert.equal(await page.locator('#page-number').getAttribute('max'),'33');
  await page.locator('#page-number').fill('32');await page.locator('#page-number').press('Enter');
  assert.equal(await page.evaluate(()=>state.screenId),'N20');
  const ids=await page.evaluate(()=>activeScreens().map(x=>x.id));assert.equal(ids.length,33);
  for(const id of ids) {await go(id);assert.equal(await page.locator('.screen h2').count(),1,id);}
  for (const id of ['C1','C2','C3','C4']) {
   await go(id); assert.ok(await page.locator('.comic-image').evaluate(el=>el.complete&&el.naturalWidth>0));
  }
  await page.locator('.comic-image').evaluate(el=>{el.src='missing-audit-image.png'});
  await page.locator('.comic-fallback').waitFor({state:'visible'});
  assert.equal(await page.locator('.comic-image').isVisible(),false);
  console.log('29 required / 33 total views; identity gating and all comic assets/fallbacks');

  await go('N1');await page.locator('[data-write="N1_thought"]').fill('처음에는 같은 말을 반복하려 했다.\n처음 답 두 번째 줄.');
  await go('N7');assert.equal(await page.locator('[data-add-block="repeat3"]').isDisabled(),true);
  assert.equal(await page.locator('#run-circuit').count(),0);
  await page.locator('#baseline-first').click();assert.equal(await page.evaluate(()=>state.screenId),'N6_operate');
  assert.equal(await page.locator('[data-add-block="repeat3"]').isDisabled(),true);
  // Synthetic click must not bypass the disabled control's handler either.
  await page.locator('[data-add-block="repeat3"]').dispatchEvent('click');
  assert.equal(await page.evaluate(()=>state.circuits.N6.nodes.length),3);
  assert.equal(await page.locator('[draggable="true"]').count(),0);

  await go('N2_operate');
  assert.equal(await page.locator('#braille-examples option').count(),10);
  const beforeUnsupported=await page.evaluate(()=>state.log.filter(x=>x.noise).length);
  await page.locator('#braille-word').fill('과학');await page.locator('#braille-word').press('Tab');
  assert.equal(await page.locator('#resend-noise').count(),0);
  assert.equal(await page.evaluate(()=>state.log.filter(x=>x.noise).length),beforeUnsupported);
  await page.locator('#braille-word').fill('수학');await page.locator('#braille-word').press('Tab');
  assert.equal(await page.locator('[data-write]').count(),0);
  for(let i=0;i<3;i++)await page.locator('#resend-noise').click();
  await page.locator('[data-write="N2_observe"]').fill('같은 확률도 결과는 다르다.');
  const sampleA=await page.evaluate(()=>JSON.stringify(noiseSession('a').cells));
  await go('N2_write'); assert.equal(await page.locator('#noise-rate').inputValue(),'0');
  assert.equal(await page.locator('.noise-reading output').textContent(),'수학');
  await page.locator('#noise-rate').focus();await page.keyboard.press('End');
  await page.locator('[data-write="N2_explain"]').fill('한 번으로 단정할 수 없다.');
  await go('N2_operate');assert.equal(await page.evaluate(()=>JSON.stringify(noiseSession('a').cells)),sampleA);
  console.log('noise sampling, keyboard slider and independent experiment records');

  await go('N4');
  await page.locator('[data-majority-index="0"]').focus();
  // Partial refresh must keep the focused bit. Wrong answer also advances feedback.
  await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>document.activeElement.dataset.majorityIndex),'0');
  for(let i=1;i<8;i++)await page.locator(`[data-majority-index="${i}"]`).click();
  assert.equal(await page.evaluate(()=>state.hints.N4),1);
  const correct=await page.evaluate(()=>majorityAnswers(n4Rows()));
  for(let i=0;i<8;i++) if(await page.locator(`[data-majority-index="${i}"]`).textContent()!==String(correct[i]))await page.locator(`[data-majority-index="${i}"]`).click();
  assert.match(await page.locator('#n4-result').textContent(),/복원했습니다/);
  await go('N5_operate'); await page.locator('label[for="n5-count-4"]').click();
  assert.ok(await page.locator('.tie').count()>0);
  await page.locator('[data-majority-index="0"]').click();
  await page.locator('label[for="n5-count-5"]').click();await page.locator('label[for="n5-count-4"]').click();
  assert.equal(await page.locator('[data-majority-index="0"]').textContent(),'0');
  // Reopening a hint must not multiply its click handlers.
  await go('N7');await page.evaluate(()=>{state.hints.N7=0;mascotState.text='';renderMascot()});
  for(let i=0;i<4;i++){await page.locator('#mascot-button').click();await page.locator('#close-mascot').click();}
  await page.locator('#mascot-button').click();await page.locator('#next-hint').click();
  assert.equal(await page.evaluate(()=>state.hints.N7),1);
  console.log('majority answers, partial feedback, retained repeat answers and one-step hints');

  // The smoke walkthrough already visited N8; restore its first-visit setup.
  await page.evaluate(()=>{state.circuits.N8=defaultCircuit('N8')});
  await go('N6_operate');await page.locator('#run-circuit').click();
  const baseline=await page.evaluate(()=>JSON.stringify(state.baseline));
  assert.equal(await page.locator('[data-add-block="repeat3"]').isEnabled(),true);
  assert.equal(await page.locator('.baseline-panel tbody tr').count(),2);
  await page.locator('#run-circuit').click();assert.equal(await page.evaluate(()=>JSON.stringify(state.baseline)),baseline);
  await go('N6_read');assert.equal(await page.locator('.count-table tbody tr').count(),6);
  await go('N7');await page.locator('[data-add-block="repeat3"]').click();
  await page.locator('[data-node-action="up"][data-node-index="2"]').press('Enter');
  await page.locator('[data-add-block="majority"]').click();await page.locator('#run-circuit').click();
  assert.equal(await page.evaluate(()=>state.circuits.N7.lastResult.verdict),'ok');
  assert.equal(await page.locator('[data-add-block="parityEncode"]').count(),0);
  await go('N8');assert.equal(await page.evaluate(()=>state.circuits.N8.nodes.join(',')),'message,repeat3,noise,majority,receiver');
  await page.locator('#run-circuit').click();assert.equal(await page.evaluate(()=>state.circuits.N8.lastResult.verdict),'ok');
  await page.locator('[data-add-block="repeat5"]').click();assert.match(await page.locator('#screen-root').textContent(),/이전 구성의 결과/);
  assert.equal(await page.evaluate(()=>JSON.stringify(state.baseline)),baseline);
  await go('N9');assert.equal(await page.locator('.methods-table tbody tr').count(),2);
  assert.doesNotMatch(await page.locator('.methods-table').innerText(),/5번 반복/);
  await go('N10');await page.locator('[data-add-block="parityEncode"]').click();
  await page.locator('[data-node-action="up"][data-node-index="2"]').click();
  await page.locator('[data-add-block="parityCheck"]').click();await page.locator('#run-circuit').click();
  assert.equal(await page.evaluate(()=>state.circuits.N10.lastResult.metric.detectRate),100);
  assert.equal(await page.evaluate(()=>state.circuits.N10.lastResult.metric.passRate),100);
  assert.equal(await page.evaluate(()=>state.circuits.N10.lastResult.metric.cleanTrials),500);
  assert.equal(await page.evaluate(()=>state.circuits.N10.lastResult.metric.errorTrials),500);
  console.log('real circuit trials, inherited design, stale result and single-error detection');

  await go('N11a'); await page.locator('#n11a-cell').click();
  await go('N11b'); const expected=await page.evaluate(()=>parityExpected());
  for(let r=0;r<7;r++)for(let c=0;c<7;c++)if((!r||!c)&&!(r===0&&c===1)){
   const cell=page.locator(`[data-parity-cell="${r},${c}"]`);await cell.click();if(expected[r][c])await cell.click();
  }
  await page.locator('#check-parity').click();assert.match(await page.locator('#n11b-result').textContent(),/통과/);
  await page.locator('[data-parity-cell="0,0"]').click();await page.locator('#check-parity').click();assert.match(await page.locator('#n11b-result').textContent(),/이상한 줄/);
  await go('N12');
  assert.equal(await page.locator('.received-word').count(),0);
  assert.equal(await page.locator('.grid-head.row').nth(1).textContent(),'1행');
  assert.deepEqual(await page.locator('[data-parity-board] > .grid-head').evaluateAll(nodes=>nodes.slice(0,8).map(x=>x.textContent)),['','검사','1','2','3','4','5','6']);
  for(let round=0;round<2;round++) {
   const target=await page.locator('[data-parity-board]').evaluate(board=>{
    const values=[...board.children].filter(x=>x.classList.contains('grid-cell')).map(x=>Number(x.textContent));
    let row,col;for(let r=1;r<7;r++)if(values.slice(r*7,r*7+7).reduce((a,b)=>a+b,0)%2)row=r;
    for(let c=1;c<7;c++)if(Array.from({length:7},(_,r)=>values[r*7+c]).reduce((a,b)=>a+b,0)%2)col=c;
    return `${row-1},${col-1}`;
   });
   await page.locator(`[data-find-cell="${target}"]`).click(); assert.equal(await page.locator('.received-word.ok').count(),1);
   if(round===0)await page.locator('#next-n12-round').click();
  }
  assert.equal(await page.evaluate(()=>submissionSummary().statuses.find(x=>x.id==='N12').status),'해결 (2문제)');
  await go('N13_observe');assert.equal(await page.locator('.grid-cell.cross').count(),4);
  for(const i of [0,1]) {await page.locator(`[data-error-pair="${i}"]`).click();assert.equal(await page.locator('.grid-cell.pair-picked').count(),2);}
  await page.locator('#reveal-n13').click();assert.equal(await page.locator('.grid-cell.actual').count(),2);
  await page.locator('#reshuffle-n13').click();assert.equal(await page.locator('.grid-cell.actual').count(),0);
  await go('N13_write');await page.locator('[data-write="N13_two"]').fill('첫 줄\n둘째 줄');
  console.log('parity placement, aligned labels, two solved rounds, revealed two-error locations');

  await page.evaluate(()=>{state.screens.N14.signal=[1,0,0,0,0,0,0,0]});
  await go('N14');await page.locator('[data-n14-pick="1"]').click();
  assert.match(await page.locator('#n14-check-bit').textContent(),/모두 2개 \(짝수\)/);
  await page.locator('#n14-count').click();
  assert.equal(await page.locator('.split-table tbody tr').count(),9);
  assert.deepEqual(await page.locator('.split-table tbody tr').last().locator('td').allTextContents(),['2개','짝수']);
  assert.deepEqual(await page.locator('.split-table tbody tr').first().locator('td').allTextContents(),['1개','홀수']);
  await page.locator('[data-n14-pick="1"]').click();await page.locator('[data-n14-pick="2"]').click();
  assert.equal(await page.locator('#n14-check-bit .trace-bit').textContent(),'0');
  await page.locator('#n14-count').click();
  assert.deepEqual(await page.locator('.split-table tbody tr').last().locator('td').allTextContents(),['0개','짝수']);
  await page.locator('label[for="n14-4"]').click();await page.locator('#confirm-n14').click();
  await go('N15_operate');const groups=[[1,3,5,7],[2,3,6,7],[4,5,6,7],[8]];
  for(let g=0;g<4;g++) {
   if(g)await page.locator('#n15-more').click();
   for(const n of groups[g]) {await page.locator(`[data-number="${n}"]`).click();await page.locator(`[data-box="${g}"]`).press('Enter');}
   await page.locator('#check-n15').click();assert.equal(await page.evaluate(()=>state.screens.N15.lastCheck),[2,4,8,9][g]);
  }
  // Reset must restore a usable empty box and retain previously unlocked checks.
  await page.locator('#reset-n15').click();
  assert.equal(await page.locator('[data-box]').count(),1);
  assert.equal(await page.locator('#check-n15').isEnabled(),false);
  await page.locator('[data-number="8"]').click();await page.locator('[data-box="0"]').click();
  assert.equal(await page.locator('[data-remove="0,8"]').count(),1);
  await page.locator('#reset-n15').click();
  await page.locator('[data-number="8"]').press('Enter');await page.locator('[data-box="0"]').press('Space');
  assert.equal(await page.locator('[data-remove="0,8"]').count(),1);
  await page.locator('#reset-n15').click();
  const dragData=await page.evaluateHandle(()=>new DataTransfer());
  await page.locator('[data-number="8"]').dispatchEvent('dragstart',{dataTransfer:dragData});
  await page.locator('[data-box="0"]').dispatchEvent('drop',{dataTransfer:dragData});
  assert.equal(await page.locator('[data-remove="0,8"]').count(),1);
  await dragData.dispose();await page.locator('#reset-n15').click();
  for(let g=0;g<4;g++) {
   if(g)await page.locator('#n15-more').click();
   for(const n of groups[g]) {await page.locator(`[data-number="${n}"]`).click();await page.locator(`[data-box="${g}"]`).click({position:{x:10,y:10}});}
  }
  await page.locator('#check-n15').click();assert.equal(await page.evaluate(()=>state.screens.N15.lastCheck),9);
  await page.locator('[data-remove="2,4"]').click();
  assert.equal(await page.locator('.question-results .result.ok').count(),0);
  assert.equal(await page.evaluate(()=>state.screens.N15.lastCheck),null);
  await page.locator('[data-number="4"]').click();await page.locator('[data-box="2"]').press('Enter');await page.locator('#check-n15').click();
  const ownPatterns=await page.locator('.pattern-table').innerText();
  await go('N15_write');assert.equal(await page.locator('.pattern-table').innerText(),ownPatterns);
  const practicePattern=await page.locator('.practice-box p strong').textContent();
  const practiceAnswer=Array.from({length:9},(_,i)=>i).find(i=>groups.map(group=>i&&group.includes(i)?1:0).join('')===practicePattern);
  await page.locator(`[data-practice-guess="${(practiceAnswer+1)%9}"]`).click();assert.equal(await page.locator('.practice-box .result.fail').count(),1);
  await page.locator(`[data-practice-guess="${practiceAnswer}"]`).click();assert.equal(await page.locator('.practice-box .result.ok').count(),1);
  assert.match(await page.locator('[data-write="N15_binary"]').locator('..').innerText(),/뒤집힌 자리를 어떻게 찾을 수 있나요/);
  await page.locator('[data-write="N15_binary"]').fill('내 표에서 같은 결과 패턴의 줄을 찾는다.');
  await go('N16');
  for(let round=0;round<3;round++) {
   const pattern=await page.locator('.notice strong').textContent();
   const answer=Array.from({length:9},(_,i)=>i).find(i=>groups.map(group=>i&&group.includes(i)?1:0).join('')===pattern);
   await page.locator(`label[for="n16-${answer}"]`).click();if(round<2)await page.locator('#next-n16').click();
  }
  await go('N17');await page.locator('#test-code-error').click();const query=await page.evaluate(()=>JSON.stringify(state.screens.N17.query));
  await page.locator('#test-code-error').click();assert.notEqual(await page.evaluate(()=>JSON.stringify(state.screens.N17.query)),query);
  const codes=['000000','011011','101101','110110'];
  for(let r=0;r<4;r++)for(let c=0;c<6;c++)if(codes[r][c]==='1')await page.locator(`[data-code-cell="${r},${c}"]`).click();
  await page.locator('#test-code-error').click();
  const chosen=await page.evaluate(()=>state.screens.N17.query.codeIndex);await page.locator(`label[for="n17-guess-${chosen}"]`).click();
  console.log('check design unlocks, stale invalidation, own patterns and changing code-error tests');

  await go('N20');assert.equal(await page.evaluate(()=>submissionSummary().statuses.find(x=>x.id==='N20').status),'미실행');
  assert.equal(await page.locator('.original-answer').textContent(),'처음에는 같은 말을 반복하려 했다.\n처음 답 두 번째 줄.');
  await page.locator('[data-write="N20_reflect"]').fill('추가할 검사 비트를 줄이면서 위치를 구별하겠다.');
  const answers=[['plain',8,'X','X'],['repeat3',24,'O','O'],['parity1',9,'O','X'],['grid',15,'O','O'],['hamming',12,'O','O']];
  for(const [id,bits,detect,fix] of answers){
   await page.locator(`[data-n20="${id}.bits"]`).fill(String(bits));await page.locator(`[data-n20="${id}.detect"]`).selectOption(detect);await page.locator(`[data-n20="${id}.fix"]`).selectOption(fix);
  }
  // Finish by typing a number, then click once: blur must not swallow the click.
  await page.locator('[data-n20="hamming.bits"]').fill('12');await page.locator('#check-n20').click();
  assert.equal(await page.evaluate(()=>submissionSummary().statuses.find(x=>x.id==='N20').status),'해결');
  await page.locator('[data-n20="hamming.bits"]').fill('99');
  assert.equal(await page.locator('.n20-conclusion').count(),0);
  await page.locator('#check-n20').click();assert.equal(await page.evaluate(()=>submissionSummary().statuses.find(x=>x.id==='N20').status),'미해결');
  const exportHtml=await page.evaluate(()=>buildSubmissionHtml(true));assert.match(exportHtml,/<td>99<\/td>/);assert.doesNotMatch(exportHtml,/전체 로그|시도 요약/);
  assert.match(exportHtml,/추가할 검사 비트를 줄이면서 위치를 구별하겠다/);
  assert.match(exportHtml,/자기 검사표 적용/);
  assert.match(exportHtml,/처음 기본 전송 결과 \(고정\)/);
  fs.writeFileSync(path.join(out,'student.html'),exportHtml);
  fs.writeFileSync(path.join(out,'teacher.html'),await page.evaluate(()=>buildSubmissionHtml(false)));
  console.log('comparison answer persistence, one-click checking and exported actual responses');

  await go('N13_write');await page.reload();assert.equal(await page.evaluate(()=>state.screenId),'N0');
  await page.locator('#resume-button').click();assert.equal(await page.evaluate(()=>state.screenId),'N13_write');
  assert.equal(await page.locator('[data-write="N13_two"]').inputValue(),'첫 줄\n둘째 줄');
  assert.equal(await page.evaluate(()=>JSON.stringify(state.baseline)),baseline);
  assert.equal(await page.evaluate(()=>practiceCorrect()),true);
  assert.equal(await page.evaluate(()=>state.writes.N20_reflect),'추가할 검사 비트를 줄이면서 위치를 구별하겠다.');
  await page.locator('#menu-button').click();await page.locator('.utility-details summary').click();await page.locator('#export-code').click();
  const progressCode=await page.locator('#progress-code').inputValue();
  const context2=await browser.newContext();await context2.route('https://**',r=>r.abort());
  const page2=await context2.newPage();await page2.goto(url);await page2.locator('#menu-button').click();await page2.locator('.utility-details summary').click();
  await page2.locator('#progress-code').fill(progressCode);await page2.locator('#import-code').click();
  assert.equal(await page2.evaluate(()=>state.screenId),'N13_write');assert.equal(await page2.locator('[data-write="N13_two"]').inputValue(),'첫 줄\n둘째 줄');
  assert.equal(await page2.evaluate(()=>JSON.stringify(state.baseline)),baseline);
  assert.equal(await page2.evaluate(()=>practiceCorrect()),true);
  assert.equal(await page2.evaluate(()=>state.writes.N20_reflect),'추가할 검사 비트를 줄이면서 위치를 구별하겠다.');
  await page2.evaluate(()=>{
   const old=JSON.parse(JSON.stringify(state));delete old.designBits;
   old.screenId='N15_operate';old.screens.N14.signal=[1,0,1,0,1,0,1];
   old.screens.N15.groups=[[1,3,5,7],[2,3,6,7],[4,5,6,7]];old.screens.N15.checked=true;
   old.writes.N15_binary='보존할 이전 설명';state=old;resumeView=old.screenId;persist(true);
  });
  await page2.reload();await page2.locator('#resume-button').click();
  assert.equal(await page2.locator('[data-number]').count(),8);
  assert.equal(await page2.locator('[data-box]').count(),1);
  assert.equal(await page2.evaluate(()=>state.screens.N15.checked),false);
  assert.match(await page2.evaluate(()=>buildSubmissionHtml(true)),/보존할 이전 설명/);
  await page2.evaluate(()=>persist(true));await page2.reload();
  assert.equal(await page2.evaluate(()=>state.legacyDesign.explanation),'보존할 이전 설명');
  await context2.close();
  const touchContext=await browser.newContext({viewport:{width:820,height:1180},hasTouch:true});
  await touchContext.route('https://**',r=>r.abort());const touchPage=await touchContext.newPage();await touchPage.goto(url);
  await touchPage.evaluate(()=>{state.student={school:'검토학교',sid:'2101',name:'터치검토'};state.screens.N15.unlocked=4;navTo('N15_operate')});
  await touchPage.locator('#reset-n15').tap();
  await touchPage.locator('[data-number="8"]').tap();await touchPage.locator('[data-box="0"]').tap();
  assert.equal(await touchPage.locator('[data-remove="0,8"]').count(),1);
  await touchPage.locator('#n15-more').tap();assert.equal(await touchPage.locator('[data-box]').count(),2);
  await touchContext.close();
  await page.locator('#menu-close').click();
  await go('N21');
  await page.evaluate(()=>{window.fetch=async()=>{throw new Error('offline test')}});await page.locator('#submit-button').click();await page.waitForFunction(()=>!submissionInFlight);
  assert.equal(await page.evaluate(()=>state.submitted.result),'fail');assert.equal(await page.locator('#submit-button').isEnabled(),true);
  await page.evaluate(()=>{window.fetch=async()=>({ok:true,text:async()=>'<html>not ok</html>'})});await page.locator('#submit-button').click();await page.waitForFunction(()=>!submissionInFlight);assert.equal(await page.evaluate(()=>state.submitted.result),'fail');
  await page.evaluate(()=>{window.fetch=async()=>({ok:true,text:async()=>'ok'})});await page.locator('#submit-button').click();await page.waitForFunction(()=>!submissionInFlight);assert.equal(await page.evaluate(()=>state.submitted.result),'ok');
  const download=page.waitForEvent('download');await page.locator('#my-copy-button').click();assert.match((await download).suggestedFilename(),/검토학교_2101_검토학생/);
  console.log('reload, cross-context UTF-8 import, mocked submission failures/success and download');

  const layout=[];
  for(const [width,height] of [[375,812],[768,1024],[1180,820],[820,1180],[1366,768],[683,384]]) {
   await page.setViewportSize({width,height});
   for(const id of ids){await go(id);const m=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,small:[...document.querySelectorAll('#screen-root button:not(:disabled)')].filter(x=>{const r=x.getBoundingClientRect();return r.width<43||r.height<43}).map(x=>x.textContent)}));if(m.overflow||m.small.length)layout.push({width,id,...m});}
  }
  fs.writeFileSync(path.join(out,'layout-tested.json'),JSON.stringify(layout,null,2));assert.deepEqual(layout,[]);
  for(const [width,height] of [[1180,820],[820,1180],[375,812]]){
   await page.setViewportSize({width,height});for(const id of ['N6_operate','N7','N10','N12','N13_observe','N14','N15_operate','N15_write','N20']){await go(id);await page.screenshot({path:path.join(out,`${id}-${width}-fixed.png`),fullPage:true});}
  }
  assert.deepEqual(errors,[]);console.log('198 populated screen/viewport checks; no overflow, undersized buttons or page errors');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
