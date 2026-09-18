const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

test('examples round-trip and unsupported words never generate a partial experiment', () => {
  const run=app();
  assert.equal(run(`BRAILLE_EXAMPLES.every(word => !messageCells(word).skipped.length && readBrailleWord(word, transmitCells(messageCells(word).cells,0)).text===word)`),true);
  run(`state.screenId='N2_write';state.screens.N2.word='과학';recordNoiseSample('word');recordNoiseSample('resend')`);
  assert.equal(run('state.log.length'),0);
  assert.equal(run('noiseSession().cells'),null);
  assert.doesNotMatch(run('renderN2Write()'),/id="resend-noise"|id="noise-rate"/);
  assert.match(run('renderN2Write()'),/다른 낱말을 입력하거나 예시를 고르세요/);
});

test('detection tests 500 clean and 500 erroneous messages and protects all check copies', () => {
  const run=app();
  run(`nodes=['message','parityEncode','noise','parityCheck','receiver'];m=simulateCircuit(nodes,'N10')`);
  assert.equal(run('m.errorTrials'),500);assert.equal(run('m.cleanTrials'),500);
  assert.equal(run('m.detectRate'),100);assert.equal(run('m.passRate'),100);
  assert.equal(run(`judgeCircuit(m,'N10')`),'ok');
  assert.notEqual(run(`judgeCircuit({...m,passRate:0},'N10')`),'ok');
  assert.notEqual(run(`judgeCircuit({...m,detectRate:0},'N10')`),'ok');
  assert.notEqual(run(`judgeCircuit({...m,conditionVersion:1},'N10')`),'ok');
  for(const nodes of ["['message','parityEncode','noise','receiver']", "['message','parityEncode','repeat3','noise','receiver']"]) {
    assert.equal(run(`(()=>{ for(let i=0;i<100;i++){const trace=[];const out=runPipelineOnce(${nodes},'one',trace);const noise=trace.find(x=>x.type==='noise');if(noise.wrong.length!==1||out.kinds[noise.wrong[0]]!=='info')return false;}return true;})()`),true);
  }
  assert.equal(run(`runPipelineOnce(nodes,'none').hadError`),false);
  assert.equal(run(`simulateCircuit(['message','noise','parityEncode','parityCheck','receiver'],'N10').detectRate`),0);
});

test('both diagonal pairs yield exactly the same parity syndrome on many boards', () => {
  const run=app();
  assert.equal(run(`(()=>{for(let sid=2000;sid<2050;sid++){state=initialState(String(sid));state.student.sid=String(sid);const n=n13State(), expected=JSON.stringify(parityOffLines(n.board.base));for(const pair of n13Pairs()){const b=state.parity.data.map(row=>row.slice());pair.forEach(([r,c])=>b[r][c]^=1);if(JSON.stringify(parityOffLines(b))!==expected)return false;const corrected=n.board.base.map(row=>row.slice());pair.forEach(([r,c])=>corrected[r][c]^=1);const off=parityOffLines(corrected);if(off.rows.length||off.cols.length)return false;}}return true})()`),true);
});

test('locating a single error hides original letters until the position is found', () => {
  const run=app();run(`state.student.sid='2101';renderN12()`);
  assert.doesNotMatch(run('renderN12()'),/received-word|보낸 낱말|class="unread"/);
  assert.match(run('renderN12()'),/1행/);
  run('state.screens.N12.guesses[0]=state.screens.N12.board.cells[0]');
  assert.match(run('renderN12()'),/received-word|복원된 낱말/);
});

test('required table practice accepts none, persists, exports and invalidates on redesign', () => {
  const run=app();
  assert.equal(run('n15Practice()'),null);
  run(`state.screens.N15.groups=[[1,3,5,7],[2,3,6,7],[4,5,6,7],[8]];state.views.N15_write={visited:true};n15Practice();state.screens.N15.practice.target=0`);
  assert.equal(run('practiceCorrect()'),false);
  run('state.screens.N15.practice.guess=0;persist(true);state=loadState()');
  assert.equal(run('practiceCorrect()'),true);
  assert.match(run('buildSubmissionHtml(true)'),/자기 검사표 적용 · 결과 패턴 0000 · 내 답 오류 없음 · 해결/);
  run('state.screens.N15.groups[3]=[7];invalidateCheckDesign()');
  assert.equal(run('practiceCorrect()'),false);assert.equal(run('n15Practice()'),null);
  assert.match(run('renderN15Write()'),/26쪽에서 검사 묶음을 보완/);
});

test('old detection successes remain archived but cannot pass the new condition', () => {
  const run=app();
  run(`state.circuits.N10.lastResult={metric:{ran:true,detectRate:100,bits:9},version:0,verdict:'ok'};state.attemptStats.N10={count:3,failures:1,firstSuccess:2};delete state.detectionVersion;persist(true);state=loadState()`);
  assert.equal(run(`circuitResultStale(state.circuits.N10,'N10')`),true);
  assert.equal(run('state.legacyDetection.stats.firstSuccess'),2);
  assert.equal(run(`submissionSummary().statuses.find(x=>x.id==='N10').firstSuccess`),null);
  assert.equal(run(`submissionSummary().statuses.find(x=>x.id==='N10').status`),'변경 후 미실행');
});

test('first real baseline survives reload and comparison retains only actual latest methods', () => {
  const run=app();assert.equal(run(`circuitLocked('N7')`),true);
  run(`baseNodes=['message','noise','receiver'];first=simulateCircuit(baseNodes,'N6');logEvent('attempt','N6_operate',{attempt:{blocks:baseNodes,metric:first}},'ok');persist(true);state=loadState()`);
  assert.equal(run(`circuitLocked('N7')`),false);
  run(`logEvent('attempt','N7',{attempt:{blocks:baseNodes,metric:{...first,messageSuccess:12}}},'ok')`);
  assert.equal(run('baselineResult().metric.messageSuccess'),run('first.messageSuccess'));
  assert.match(run('circuitMethodsHtml()'),/12.0%/);
  assert.doesNotMatch(run('circuitMethodsHtml()'),/3번 반복|5번 반복/);
  assert.equal(run('validateProgress(state)'),true);
  run('state.baseline.metric.messageSuccess="bad"');assert.equal(run('validateProgress(state)'),false);
});

test('final reflection keeps the original answer separate in saved and exported work', () => {
  const run=app();run(`state.writes.N1_thought='처음 생각\\n두 줄';state.writes.N20_reflect='묶음을 다르게 만들겠다';persist(true);state=loadState()`);
  assert.equal(run('state.writes.N1_thought'),'처음 생각\n두 줄');
  assert.match(run('renderN20()'),/처음 생각\n두 줄/);
  assert.match(run('buildSubmissionHtml(true)'),/묶음을 다르게 만들겠다/);
  assert.match(run('buildSubmissionHtml(false)'),/묶음을 다르게 만들겠다/);
  assert.equal(run(`submissionSummary().unfilled.includes('N20_reflect')`),false);
});

test('export preserves actual comparison answers without generating unseen problems', () => {
  const run=app();
  run(`state.screens.N20={answers:{hamming:{bits:'99',detect:'X',fix:'O'}},checked:false}; beforeExport=JSON.stringify(state)`);
  assert.match(run('buildSubmissionHtml(true)'), /<td>99<\/td>/);
  assert.equal(run('JSON.stringify(state)===beforeExport'),true);
  assert.equal(run("submissionSummary().statuses.find(x=>x.id==='N20').status"),'변경 후 미실행');
  assert.doesNotMatch(run('buildSubmissionHtml(true)'),/전체 로그|시도 요약/);
});

test('changing a check design invalidates its verdict and dependent decoding answers', () => {
  const run=app();
  run(`state.screens.N15={groups:[[1,3,5,7],[2,3,6,7],[4,5,6,7],[8]],checked:true,lastCheck:9};
    state.screens.N15.lastCheckSignature=JSON.stringify(state.screens.N15.groups);
    state.screens.N16.guesses=[1,2,3];state.screens.N16.round=2`);
  assert.match(run('renderN15Operate()'),/아홉 가지가 모두 다른 결과/);
  run('state.screens.N15.groups[2].pop();invalidateCheckDesign()');
  assert.doesNotMatch(run('renderN15Operate()'),/아홉 가지가 모두 다른 결과/);
  assert.equal(run('state.screens.N15.checked'),false);
  assert.equal(run('state.screens.N16.guesses.length'),0);
  assert.equal(run('state.screens.N16.round'),0);
});

test('two locating rounds differ for many student seeds and retain both problems', () => {
  const run=app();
  assert.equal(run(`(() => {
    for(let sid=2000;sid<2200;sid++) {
      state=initialState();state.student.sid=String(sid);
      const first=n12BoardForRound(0);state.screens.N12.board=first;
      const second=n12BoardForRound(1);
      if(first.cells[0].join()===second.cells[0].join())return false;
      if(Object.keys(state.screens.N12.boards).length!==2)return false;
    }
    return true;
  })()`),true);
});

test('JSON null decoding answers cannot count as a correct no-error response', () => {
  const run=app();
  run(`state.includeOptional=true;state.screens.N15.groups=[[1,3,5,7],[2,3,6,7],[4,5,6,7]];
    state.screens.N16={round:2,cases:[1,2,0],guesses:[1,2,null]};
    state.log.push({kind:'attempt',screen:'N16',result:'ok'})`);
  assert.notEqual(run("submissionSummary().statuses.find(x=>x.id==='N16').status"),'해결 (3문제)');
  assert.doesNotMatch(run('problemRecordHtml("N16")'),/3번째 문제 · 패턴 000 · 내 답 아무 곳도/);
  assert.match(run('problemRecordHtml("N16")'),/3번째 문제 · 패턴 000 · 내 답 미선택/);
});

test('an exported circuit separates the current design from its previous trial', () => {
  const run=app();
  run(`state.views.N7={visited:true};state.circuits.N7.nodes=['message','noise','receiver'];
    state.circuits.N7.version=2;
    state.circuits.N7.lastResult={version:1,blocks:['message','repeat3','noise','majority','receiver'],detail:'previous experiment',verdict:'ok'}`);
  assert.match(run('buildSubmissionHtml(true)'),/이전 구성 또는 이전 조건의 결과/);
  assert.match(run('buildSubmissionHtml(true)'),/previous experiment/);
});

test('noise decoder round-trips every supported syllable including omitted initial ieung', () => {
  const run = app();
  assert.equal(run(`(() => {
    for (const initial of Object.keys(BRAILLE.initial)) for (const medial of Object.keys(BRAILLE.medial)) for (const final of ['', ...Object.keys(BRAILLE.final)]) {
      const word = String.fromCharCode(0xac00 + CHO_LIST.indexOf(initial)*588 + JUNG_LIST.indexOf(medial)*28 + JONG_LIST.indexOf(final));
      if (readBrailleWord(word, transmitCells(messageCells(word).cells, 0)).text !== word) return false;
    }
    return true;
  })()`), true);
});

test('decoding uses received dots, preserves syllable boundaries and exposes unreadable cells', () => {
  const run = app();
  run(`testCells = transmitCells(messageCells('수학').cells, 0); testCells[0].received = dotsToBits(BRAILLE.initial['ㄴ'])`);
  assert.equal(run(`readBrailleWord('수학', testCells).text`), '누학');
  run(`testCells[0].received = [1,1,1,1,1,1]`);
  assert.equal(run(`readBrailleWord('수학', testCells).text`), '?학');
  assert.match(run(`readBrailleWord('수학', testCells).failures.join()`), /1번 칸: 읽을 수 없는 점형/);
  run(`testCells = transmitCells(messageCells('수학').cells, 0); testCells[0].received = [0,0,0,0,0,0]`);
  assert.equal(run(`readBrailleWord('수학', testCells).text`), '우학');
  assert.equal(run(`readBrailleWord('수과학', transmitCells(messageCells('수과학').cells,0)).text`), '수?학');
});

test('N2 keeps two experiments and opens question only after three explicit resends at ten percent', () => {
  const run = app();
  run(`state.screenId='N2_operate'; state.screens.N2.word='수학'; noiseSession()`);
  assert.doesNotMatch(run('renderN2Operate()'), /data-write=/);
  run(`recordNoiseSample('rate'); recordNoiseSample('resend'); recordNoiseSample('resend')`);
  assert.doesNotMatch(run('renderN2Operate()'), /data-write=/);
  run(`noiseSession().rate=20; recordNoiseSample('resend')`);
  assert.equal(run('noiseSession().atTen'), 2);
  run(`noiseSession().rate=10; recordNoiseSample('resend')`);
  assert.match(run('renderN2Operate()'), /data-write="N2_observe"/);
  assert.doesNotMatch(run('renderN2Operate()'), /data-write="N2_explain"/);
  run(`savedNoise=JSON.stringify(noiseSession()); state.screenId='N2_write'`);
  assert.equal(run('noiseSession().rate'), 0);
  assert.match(run('renderN2Write()'), /id="noise-rate"/);
  assert.match(run('renderN2Write()'), /data-write="N2_explain"/);
  run(`noiseSession().rate=25; recordNoiseSample('rate'); state.screenId='N2_operate'`);
  assert.equal(run('JSON.stringify(noiseSession()) === savedNoise'), true);
  run(`state.screens.N2.word='우주'; noiseSession()`);
  assert.equal(run('noiseSession().atTen'), 0);
});

test('legacy N2 samples and writing survive migration without invented observation counts', () => {
  const run = app();
  run(`state.screens.N2={word:'수학',rate:15,sends:9,cells:transmitCells(messageCells('수학').cells,0).map(({charIndex,...cell})=>cell)}; state.writes.N2_observe='기존 답'; legacyDots=JSON.stringify(state.screens.N2.cells.map(c=>c.received)); state.screenId='N2_operate'`);
  assert.equal(run('noiseSession().rate'), 15);
  assert.equal(run('noiseSession().atTen'), 0);
  assert.equal(run('JSON.stringify(noiseSession().cells.map(c=>c.received)) === legacyDots'), true);
  assert.equal(run('readBrailleWord(noiseSession().word,noiseSession().cells).text'), '수학');
  assert.match(run('renderN2Operate()'), /기존 답/);
});

test('N2 logs each experiment and submission maps each answer to its own page', () => {
  const run = app();
  run(`state.screens.N2.word='수학'; state.screenId='N2_operate'; recordNoiseSample('resend'); state.writes.N2_observe='같은 확률도 결과는 다르다'; state.screenId='N2_write'; recordNoiseSample('rate')`);
  assert.equal(run(`state.log.at(-1).noise.reading`), '수학');
  assert.equal(run(`state.log.at(-1).screen`), 'N2_write');
  assert.equal(run(`submissionSummary().statuses.find(s=>s.id==='N2_operate').status`), '작성');
  assert.equal(run(`submissionSummary().statuses.find(s=>s.id==='N2_write').status`), '미작성');
  assert.match(run('buildSubmissionHtml()'), /받은 점형:/);
  assert.match(run('buildSubmissionHtml()'), /되읽기 수학/);
  assert.equal(run('validateProgress(JSON.parse(JSON.stringify(state)))'), true);
});

function app() {
  const storage = new Map();
  const context = vm.createContext({
    console, Blob, URLSearchParams, AbortController,
    setTimeout: () => 1, clearTimeout: () => {},
    document: { addEventListener() {}, querySelector: () => null, querySelectorAll: () => [] },
    window: {},
    localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) }
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../gifted/noisy-channel/app.js'), 'utf8'), context);
  return code => vm.runInContext(code, context);
}

test('the corner parity bit is checked along both border lines', () => {
  const run = app();
  run(`state.parity.values = parityExpected(); state.parity.placed = [];
    for (let r=0;r<7;r++) for(let c=0;c<7;c++) if(r===0||c===0) state.parity.placed.push([r,c]);`);
  assert.equal(run('checkParityGrid().ok'), true);
  run('state.parity.values[0][0] ^= 1');
  assert.equal(run('checkParityGrid().ok'), false);
  assert.equal(run('checkParityGrid().rowStatus[0]'), false);
  assert.equal(run('checkParityGrid().colStatus[0]'), false);
});

test('four repeats expose ties; three and five have unique majorities', () => {
  const run = app();
  assert.ok(run('columnTies(repeatedRows(4)).length') > 0);
  assert.equal(run('columnTies(repeatedRows(3)).length'), 0);
  assert.equal(run('columnTies(repeatedRows(5)).length'), 0);
  assert.equal(run("renderN5Operate().includes('동점')"), false);
  assert.ok(run("renderN5Write().includes('미관찰')"));
});

test('majority restores a real braille cell while legacy answers keep their example', () => {
  const run=app();
  run('state.screens.N4.answer=majorityAnswers(MAJORITY_ROWS);state.screens.N4.checked=true');
  assert.equal(run('state.screens.N4.answer.join()'),run('MAJORITY_SOURCE.join()'));
  assert.ok(run("renderN4().includes('복원된 글자: ㅜ')"));
  run("localStorage.setItem(STORAGE_KEY,JSON.stringify({...initialState(),screens:{...initialState().screens,N4:{answer:[1,0,1,0,1,1,1,1],checked:true}}}));state=loadState()");
  assert.equal(run('state.screens.N4.exampleVersion'),1);
  assert.ok(run("renderN4().includes('복원 완료')"));
});

test('N12 provides the transmitted parity bits; N13 preserves six-column geometry', () => {
  const run = app();
  assert.match(run('renderN12()'), /검사 비트/);
  assert.match(run('renderN13Observe()'), /data-parity-board/);
});

test('comparison classifies actual pipeline snapshots, not activity IDs', () => {
  const run = app();
  run(`state.log = [{kind:'attempt', screen:'N8', result:'fail', detail:'five-repeat-result', attempt:{blocks:['message','repeat5','noise','majority','receiver']}}]`);
  assert.equal(run('compareRows()[4][5]'), '미실행');
  run(`state.log.push({kind:'attempt', screen:'N7', result:'ok', detail:'three-repeat-result', attempt:{blocks:['message','repeat3','noise','majority','receiver']}})`);
  assert.equal(run('compareRows()[4][5]'), 'three-repeat-result');
});

test('1000-trial simulation responds to block order and both valid repetition rates', () => {
  const run = app();
  // Seeded randomness makes the statistical regression reproducible.
  run('let seed=12345; Math.random=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296)');
  for (const [nodes, expected, bits] of [
    [['message','noise','receiver'],43,8],
    [['message','repeat3','noise','majority','receiver'],79.7,24],
    [['message','repeat5','noise','majority','receiver'],93.4,40],
    [['message','repeat3','majority','noise','receiver'],43,8],
    [['message','noise','repeat3','majority','receiver'],43,8]
  ]) {
    const result=run(`simulateCircuit(${JSON.stringify(nodes)},'N7')`);
    assert.ok(Math.abs(result.messageSuccess-expected)<4, JSON.stringify(result));
    assert.equal(result.bits,bits);
    if(expected>75) assert.equal(run(`judgeCircuit(${JSON.stringify(result)},'N7')`),'ok');
  }
  assert.equal(run("simulateCircuit(['message','parityEncode','noise','parityCheck','receiver'],'N10').detectRate"),100);
  assert.equal(run("simulateCircuit(['message','parityEncode','parityCheck','noise','receiver'],'N10').detectRate"),0);
});

test('every possible single data-bit error has exactly the right parity intersection', () => {
  const run=app();
  assert.equal(run(`(()=>{for(let r=0;r<6;r++)for(let c=0;c<6;c++){
    const board=state.parity.data.map(row=>row.slice()); board[r][c]^=1;
    const off=parityOffLines(board); if(off.rows.join()!==String(r+1)||off.cols.join()!==String(c+1))return false;
  }return true})()`),true);
});

test('log trimming preserves each activity first attempt and first success', () => {
  const run=app();
  run("logEvent('attempt','N7',{detail:'first'},'fail'); logEvent('attempt','N7',{detail:'first-success'},'ok'); for(let i=0;i<2100;i++)logEvent('write','N9',{field:'N9_reflect'});");
  assert.ok(run("state.log.some(item=>item.detail==='first')"));
  assert.ok(run("state.log.some(item=>item.detail==='first-success')"));
  assert.ok(run('state.log.length<=2000'));
});

test('repetition growth cannot freeze the browser with an unbounded signal', () => {
  const run=app();
  assert.equal(run("analyzeCircuit(['message',...Array(20).fill('repeat5'),'noise','majority','receiver']).canCompare"),false);
});

test('incomplete repetition groups are not silently truncated', () => {
  const run=app();
  assert.equal(run("analyzeCircuit(['message','repeat3','parityEncode','noise','majority','receiver']).canCompare"),false);
});

test('fresh progress imports but malformed nested state is rejected', () => {
  const run=app();
  assert.equal(run('validateProgress(initialState())'),true);
  assert.equal(run('validateProgress(null)'),false);
  assert.equal(run('(()=>{const value=initialState();value.screens.N4.answer=null;return validateProgress(value)})()'),false);
});

test('predictions retain the first answer and identify later responses', () => {
  const run=app();
  run("state.screens.N14.prediction='2';recordPrediction('N14');state.views.N15_operate={visited:true};state.screens.N14.prediction='3';recordPrediction('N14',true)");
  assert.equal(run('state.predicts.N14.first.value'),'2');
  assert.equal(run('state.predicts.N14.first.beforeExperiment'),true);
  assert.equal(run('state.predicts.N14.confirmed.beforeExperiment'),false);
});

test('partial failures advance hints at 1/3/5 and survive log pruning', () => {
  const run=app();
  for(let i=1;i<=5;i++) {
    run("logEvent('attempt','N8',{},'partial');advanceHint('N8')");
    assert.equal(run('state.hints.N8'),i>=5?3:i>=3?2:1);
  }
  run("for(let i=0;i<2100;i++)logEvent('write','N9',{});advanceHint('N8')");
  assert.equal(run('state.hints.N8'),3);
});

test('a solved activity is not counted unresolved because of earlier failures', () => {
  const run=app();
  run("logEvent('attempt','N7',{},'fail');state.circuits.N7.lastResult={version:0,verdict:'ok'};");
  assert.equal(run("submissionSummary().statuses.find(item=>item.id==='N7').status"),'해결');
  assert.equal(run('submissionSummary().unresolved'),0);
});

test('legacy seven-bit progress is archived once and cannot count as eight-bit success', () => {
  const run=app();
  run(`state=initialState();delete state.designBits;
    state.screens.N14.signal=[1,0,1,0,1,0,1];state.screens.N14.prediction='3';
    state.screens.N15.groups=[[1,3,5,7],[2,3,6,7],[4,5,6,7]];state.screens.N15.checked=true;
    state.writes.N15_binary='old explanation';state.writes.N13_two='keep this';
    state.views.N15_operate={visited:true};state.hints.N15_operate=2;
    state.log=[{kind:'attempt',screen:'N15_operate',result:'ok',detail:'old success'},{kind:'attempt',screen:'N12',result:'ok'}];
    state.submitted={at:123,code:'old-code',result:'ok'};
    localStorage.setItem(STORAGE_KEY,JSON.stringify(state));state=loadState()`);
  assert.equal(run('state.designBits'),8);
  assert.equal(run('state.screens.N14.signal'),null);
  assert.equal(run('state.screens.N15.checked'),false);
  assert.equal(run('JSON.stringify(state.screens.N15.groups)'),'[[]]');
  assert.equal(run('state.writes.N15_binary'),undefined);
  assert.equal(run('state.writes.N13_two'),'keep this');
  assert.equal(run('state.legacyDesign.explanation'),'old explanation');
  assert.equal(run('state.legacyDesign.hints.N15_operate'),2);
  assert.equal(run('state.legacyDesign.log.length'),1);
  assert.equal(run('state.log.length'),1);
  assert.equal(run('state.views.N15_operate'),undefined);
  assert.equal(run('state.submitted.at'),0);
  assert.match(run('buildSubmissionHtml(true)'),/이전 정보 7비트 활동 기록[\s\S]*old explanation/);
  assert.equal(run('validateProgress(JSON.parse(JSON.stringify(state)))'),true);
  run(`state.screens.N15.groups=[[8]];state.writes.N15_binary='new explanation';
    localStorage.setItem(STORAGE_KEY,JSON.stringify(state));state=loadState()`);
  assert.equal(run('JSON.stringify(state.screens.N15.groups)'),'[[8]]');
  assert.equal(run('state.writes.N15_binary'),'new explanation');
  assert.equal(run('state.legacyDesign.explanation'),'old explanation');
});

test('four error-free checks decode all 256 information words and nine possible error cases', () => {
  const run=app();
  assert.equal(run(`(() => {
    const groups=[[1,3,5,7],[2,3,6,7],[4,5,6,7],[8]];
    state.screens.N15.groups=groups;
    for(let word=0;word<256;word++) {
      const information=Array.from({length:8},(_,i)=>(word>>i)&1);
      const checks=groups.map(group=>group.reduce((sum,n)=>sum+information[n-1],0)%2);
      for(let error=0;error<=8;error++) {
        const received=information.map((bit,i)=>i+1===error ? bit^1 : bit);
        const pattern=groups.map((group,g)=>group.reduce((sum,n)=>sum+received[n-1],checks[g])%2).join('');
        const matches=n15Patterns().filter(row=>row.pattern===pattern);
        if(matches.length!==1 || matches[0].errorCase!==error)return false;
      }
    }
    return true;
  })()`),true);
});

test('nine check patterns and all 24 single-bit code corrections', () => {
  const run=app();
  run('state.screens.N15.groups=[[1,3,5,7],[2,3,6,7],[4,5,6,7],[8]]');
  assert.equal(run('new Set(n15Patterns().map(item=>item.pattern)).size'),9);
  assert.equal(run(`(()=>{const codes=['000000','011011','101101','110110'];return codes.every((code,sent)=>Array.from({length:6},(_,error)=>{
    const received=flipBit(code,error);const distances=codes.map(other=>hammingDistance(other,received));
    return distances[sent]===1&&distances.every((d,i)=>i===sent||d>1);
  }).every(Boolean))})()`),true);
});

test('submission escapes student writing and retains multiline text and activity statuses', () => {
  const run=app();
  run("state.student.name='<script>bad</script>';state.writes.N1_thought='line one\\nline two';state.submitted.code='123456'");
  const html=run('buildSubmissionHtml()');
  assert.ok(html.includes('&lt;script&gt;bad&lt;/script&gt;'));
  assert.ok(html.includes('white-space:pre-wrap'));
  assert.ok(html.includes('건너뜀'));
  assert.ok(html.includes('첫 성공 시도'));
});


test('noise failure totals count samples once and reject malformed saved experiments', () => {
  const run = app();
  run(`state.screenId='N2_operate'; state.screens.N2.word='수학'; Math.random=()=>0; recordNoiseSample('resend')`);
  assert.equal(run('state.screens.N2.readFailures'), 1);
  run('renderN2Operate(); renderN2Operate()');
  assert.equal(run('state.screens.N2.readFailures'), 1);
  assert.equal(run('validateProgress(JSON.parse(JSON.stringify(state)))'), true);
  run('state.screens.N2.sessions.a.cells[0].received=[0]');
  assert.equal(run('validateProgress(JSON.parse(JSON.stringify(state)))'), false);
});

test('comic intro views use local assets and preserve readable fallback scripts', () => {
  const run = app();
  const c1 = run('renderComic("C1")');
  const c2 = run('renderComic("C2")');
  assert.match(c1, /\.\/assets\/comic-1\.png/);
  assert.match(c2, /\.\/assets\/comic-2\.png/);
  assert.match(c1, /그림을 불러오지 못했습니다/);
  assert.match(c1, /점자 편지를 손끝으로 읽으며 웃습니다/);
  assert.match(c2, /3시·2시·3시/);
});

/* ── 4차 개편 (명세서 §32-4) ───────────────────────────────────────────── */

test('one check splits the nine cases exactly by whether the flipped position is in the group', () => {
  const run = app();
  run(`state.student.sid = '30101'`);
  /* 모든 원신호와 비어 있지 않은 묶음에서, 실제로 보낸 검사 비트를 포함해 센다. */
  assert.equal(run(`(() => {
    for(let source=0;source<256;source++) {
      state.screens.N14.signal=Array.from({length:8},(_,i)=>(source>>i)&1);
      for(let mask=1;mask<256;mask++) {
        const pick=Array.from({length:8},(_,i)=>i+1).filter(n=>mask&(1<<(n-1)));
        const check=n14Check(pick);
        if((check.sentOnes+check.checkBit)%2!==0)return false;
        for(const item of check.rows) {
          const inGroup=item.flipped>=0 && pick.includes(item.flipped+1);
          if(item.odd!==inGroup)return false;
          if(item.ones!==pick.reduce((sum,n)=>sum+item.signal[n-1],check.checkBit))return false;
        }
      }
    }
    return true;
  })()`), true);
  /* 아홉 경우는 「1~8번째 뒤집힘」과 「아무 곳도 안 뒤집힘」이다. */
  assert.equal(run('n14Cases().length'), 9);
  assert.equal(run('n14Cases().filter(item => item.flipped >= 0).length'), 8);
  assert.equal(run(`n14Cases().at(-1).signal.join('') === n14Signal().join('')`), true);
  run('state.screens.N14.signal=[1,0,0,0,0,0,0,0];state.screens.N14.pick=[1];state.screens.N14.counted=true');
  assert.match(run('renderN14()'),/검사 비트 <span class="trace-bit">1<\/span>/);
  assert.match(run('renderN14()'),/아무 곳도 안 뒤집힘<\/th><td>2개<\/td><td>짝수/);
});

test('the bridge screen uses the sent parity, not the unfilled student grid', () => {
  const run = app();
  run(`state.student.sid = '30101'; state.screens.N13_bridge = { picked: null }`);
  /* 학생이 N11b를 채우지 않아도 모든 줄이 짝수로 보여야 한다. 안 그러면 멀쩡한
     줄이 오류가 있는 것처럼 읽힌다. */
  assert.equal(run('state.parity.placed.length'), 1);
  assert.equal(run(`(() => {
    const checks = parityExpected();
    for (let r = 1; r < 7; r += 1) {
      const row = [...state.parity.data[r-1], checks[r][0]];
      if (row.reduce((a,b)=>a+b,0) % 2 !== 0) return false;
    }
    for (let c = 1; c < 7; c += 1) {
      const col = [...state.parity.data.map(row => row[c-1]), checks[0][c]];
      if (col.reduce((a,b)=>a+b,0) % 2 !== 0) return false;
    }
    return true;
  })()`), true);
  run(`state.screens.N13_bridge.picked = { axis: 'row', index: 3 }`);
  assert.match(run('renderN13Bridge()'), /짝수/);
  assert.doesNotMatch(run('renderN13Bridge()'), /→ <strong>홀수<\/strong>/);
});

test('the trace shown is the first of the thousand trials, not a separate run', () => {
  const run = app();
  run(`state.circuits.N7.nodes = ['message','repeat3','noise','majority','receiver']`);
  run(`metric = simulateCircuit(state.circuits.N7.nodes, 'N7')`);
  /* 표본 5개와 1번째 시행 기록이 한 번의 시뮬레이션에서 나와야 한다. */
  assert.equal(run('metric.samples.length'), 5);
  assert.equal(run('Array.isArray(metric.trace)'), true);
  assert.equal(run(`metric.trace.at(-1).signal.slice(0,8).join('') === metric.samples[0].signal.join('')`), true);
  /* 합계는 표본이 아니라 1000회에서 나온다. */
  assert.equal(run('metric.trials'), 1000);
  assert.equal(run(`Math.abs(metric.messageSuccess - metric.exact/10) < 1e-9`), true);
  assert.equal(run(`Math.abs(metric.bitRecovery - metric.bitHits/80) < 1e-9`), true);
});

test('finding the flipped cell restores the grid so the word reads', () => {
  const run = app();
  run(`state.student.sid = '30101'; state.screens.N12.board = randomErrorBoard(1, 'N12:0')`);
  /* 뒤집힌 점이 다른 자모의 점형이 되면 ?가 아니라 엉뚱한 글자로 읽힌다.
     어느 쪽이든 보낸 낱말과 다른 자리가 표시되어야 한다. */
  assert.match(run('receivedWordHtml(state.screens.N12.board.base)'), /unread/);
  assert.match(run('receivedWordHtml(state.screens.N12.board.base)'), /received-word broken/);
  /* 원본은 보낸 낱말과 같다 — 찾으면 이 격자를 보여준다. */
  assert.doesNotMatch(run('receivedWordHtml(state.parity.data)'), /unread/);
  assert.match(run('receivedWordHtml(state.parity.data)'), /received-word ok/);
  assert.match(run('receivedWordHtml(state.parity.data)'), /두 줄이 같습니다/);
  /* 화면이 정답일 때 원본 격자를 넘기는지 확인한다. */
  run(`state.screens.N12.guesses[0] = state.screens.N12.board.cells[0].slice()`);
  assert.match(run('renderN12()'), /received-word ok/);
  /* 두 종류의 오류가 모두 표시되는지 — 읽을 수 없는 점형과 다른 자모. */
  assert.equal(run(`(() => {
    let unreadable = 0, misread = 0;
    for (let r = 0; r < 6; r += 1) for (let c = 0; c < 6; c += 1) {
      const bits = state.parity.data[r].slice(); bits[c] ^= 1;
      const sym = readJamo(bits);
      if (!sym) unreadable += 1; else if (sym !== state.parity.labels[r]) misread += 1;
    }
    return unreadable > 0 && misread > 0;
  })()`), true);
});

test('two flipped cells always leave four candidates, for every student', () => {
  const run = app();
  /* 두 칸이 행도 열도 겹치지 않으므로 이상한 가로줄 2 × 세로줄 2 = 교차점 4.
     학번이 달라도 이 불변량이 깨지면 20번의 결론이 무너진다. */
  assert.equal(run(`(() => {
    for (let i = 0; i < 40; i += 1) {
      state.student.sid = '3' + (100 + i);
      state.parity = createParityGrid(studentId());
      for (let shuffle = 0; shuffle < 3; shuffle += 1) {
        const board = randomErrorBoard(2, 'N13:' + shuffle);
        if (board.cells.length !== 2) return false;
        if (board.cells[0][0] === board.cells[1][0]) return false;
        if (board.cells[0][1] === board.cells[1][1]) return false;
        const off = parityOffLines(board.base);
        if (off.rows.length !== 2 || off.cols.length !== 2) return false;
      }
    }
    return true;
  })()`), true);
  /* 한 칸이면 교차점이 하나다 — 19번과의 대비가 성립해야 한다. */
  assert.equal(run(`(() => {
    state.student.sid = '30101'; state.parity = createParityGrid(studentId());
    const off = parityOffLines(randomErrorBoard(1, 'N12:0').base);
    return off.rows.length === 1 && off.cols.length === 1;
  })()`), true);
});

test('checks distinguish at most eight cases with three checks and all nine with four', () => {
  const run = app();
  run(`state.screens.N15.groups = [[]]; state.screens.N15.unlocked = 1`);
  const distinct = () => run('new Set(n15Patterns().map(item => item.pattern)).size');
  /* 묶음 하나로는 두 갈래. */
  run(`state.screens.N15.groups = [[1,3,5,7]]`);
  assert.equal(distinct(), 2);
  /* 둘이면 네 갈래. */
  run(`state.screens.N15.groups = [[1,3,5,7],[2,3,6,7]]`);
  assert.equal(distinct(), 4);
  /* 셋이면 최대 여덟 갈래 — 8번 오류와 무오류가 겹친다. */
  run(`state.screens.N15.groups = [[1,3,5,7],[2,3,6,7],[4,5,6,7]]`);
  assert.equal(distinct(), 8);
  assert.equal(run('questionPatternFor(0)===questionPatternFor(8)'),true);
  run('state.screens.N15.groups.push([8])');
  assert.equal(distinct(),9);
  /* 검사 한 번을 해봐야 다음 칸이 열린다. 누르기 전에는 잠겨 있다. */
  run(`state.screens.N15.groups = [[1,2]]; state.screens.N15.unlocked = 1`);
  assert.match(run('renderN15Operate()'), /id="n15-more"[^>]*disabled/);
  run(`state.screens.N15.unlocked = 2`);
  assert.doesNotMatch(run('renderN15Operate()'), /id="n15-more"[^>]*disabled/);
  /* 정답 개수를 화면에 적지 않는다. */
  assert.doesNotMatch(run('renderN15Operate()'), /세 번|3개면|2 × 2 × 2/);
});

test('the summary table grades against the normalised eight-bit comparison', () => {
  const run = app();
  /* 명세서 §6-3 — 8비트 정보 + 오류 1개 정정으로 환산한 값. */
  assert.equal(run(`JSON.stringify(COMPARE_METHODS.map(m => [m.id, m.bits, m.detect, m.fix]))`),
    JSON.stringify([['plain',8,false,false],['repeat3',24,true,true],['parity1',9,true,false],['grid',15,true,true],['hamming',12,true,true]]));
  /* 그림의 네모 수가 곧 필요한 비트 수다 — 세어서 채우는 활동이 성립해야 한다. */
  assert.equal(run(`COMPARE_METHODS.every(m => m.shape.reduce((sum, row) => sum + row.info + row.check, 0) === m.bits)`), true);
  /* 검사형 넷은 정보 8칸에 검사 칸을 붙인다. 3번 반복만 복제형이라
     정보 8칸을 세 번 되풀이한다(8 × 3 = 24). 이 차이가 통과 후 문단의 근거다. */
  assert.equal(run(`COMPARE_METHODS.filter(m => m.id !== 'repeat3')
    .every(m => m.shape.reduce((sum, row) => sum + row.info, 0) === 8)`), true);
  assert.equal(run(`COMPARE_METHODS.find(m => m.id === 'repeat3').shape.every(row => row.info === 8 && row.check === 0)`), true);
  assert.equal(run(`COMPARE_METHODS.filter(m => m.id !== 'repeat3')
    .every(m => m.shape.reduce((sum, row) => sum + row.check, 0) === m.bits - 8)`), true);
  /* 「보낼 정보」 열은 다섯 줄 모두 8칸으로 같다 — 정보는 같고 보내는 양만 다르다. */
  assert.equal(run(`(renderN20().match(/shape-cell info/g) || []).length
    === COMPARE_METHODS.length * 8 + COMPARE_METHODS.reduce((sum, m) => sum + m.shape.reduce((a, row) => a + row.info, 0), 0) + 1`), true);
  /* 빈 칸은 전부 오답, 정답을 넣으면 0. */
  run(`state.screens.N20 = {}; n20State()`);
  assert.equal(run('n20Wrong().length'), 15);
  run(`COMPARE_METHODS.forEach(m => { n20State().answers[m.id] = { bits: String(m.bits), detect: m.detect?'O':'X', fix: m.fix?'O':'X' }; })`);
  assert.equal(run('n20Wrong().length'), 0);
  /* 한 칸만 틀리면 한 칸만 센다 — 어느 칸인지는 알려주지 않는다. */
  run(`n20State().answers.hamming.bits = '11'`);
  assert.equal(run('n20Wrong().length'), 1);
  run(`n20State().checked = true`);
  assert.match(run('renderN20()'), /15칸 중 <strong>1칸<\/strong>이 다릅니다/);
  assert.doesNotMatch(run('renderN20()'), /해밍.*틀렸/);
});

test('the student copy keeps the writing and drops the log', () => {
  const run = app();
  run(`state.student.sid = '30101'; state.student.name = '홍길동';
    state.writes.N13_two = '두 줄씩 이상해서 네 군데가 후보가 됩니다.';
    logEvent('attempt', 'N12', { detail: '1번째 문제 · 선택 3행 4열' }, 'fail')`);
  const teacher = run('buildSubmissionHtml(false)');
  const student = run('buildSubmissionHtml(true)');
  /* 교사본은 과정까지 받는다. */
  assert.match(teacher, /전체 로그/);
  assert.match(teacher, /시도 요약/);
  /* 학생본은 자기가 쓴 것과 조작 결과만. */
  assert.doesNotMatch(student, /전체 로그/);
  assert.doesNotMatch(student, /시도 요약/);
  assert.match(student, /두 줄씩 이상해서/);
  assert.match(student, /홍길동/);
  assert.equal(student.length < teacher.length, true);
  /* 같은 생성기를 쓰므로 표지·예측·작성 섹션은 둘 다 있다. */
  for (const html of [teacher, student]) {
    assert.match(html, /예측 기록/);
    assert.match(html, /작성한 설명/);
  }
});

test('the required path asks nine written questions including the final reflection', () => {
  const run = app();
  /* §46 E17에서 처음 생각과 마무리를 연결하는 서술 1문항을 다시 추가했다. */
  assert.equal(run('WRITE_FIELDS.length'), 11);
  assert.equal(run(`WRITE_FIELDS.filter(([key]) => !['N18_reason','N19_mariner'].includes(key)).length`), 9);
  assert.equal(run(`WRITE_FIELDS.some(([key]) => key === 'N20_reflect')`), true);
  const source = fs.readFileSync(path.join(__dirname, '../gifted/noisy-channel/app.js'), 'utf8');
  for (const key of ['N5_method', 'N13_one', 'N15_change']) {
    assert.equal(source.includes(`'${key}'`), false, `${key} 가 남아 있다`);
  }
  /* 이진법 귀환 문항은 필수 경로에 남아야 한다(§3-6). */
  assert.equal(run(`WRITE_FIELDS.some(([key]) => key === 'N15_binary')`), true);
  assert.match(run('renderN15Write()'), /홀수=1, 짝수=0/);
});

test('every grid word is exactly six jamo inside the braille table', () => {
  const run = app();
  /* 하나라도 6자모가 아니면 slice(0,6)으로 잘려 「받은 낱말」이 성립하지 않는다.
     초성 ㅇ은 점형이 없으므로 그런 낱말도 들어오면 안 된다. */
  assert.equal(run(`PARITY_WORDS.every(word => {
    const built = messageCells(word);
    return built.cells.length === 6 && built.skipped.length === 0;
  })`), true);
  assert.equal(run('PARITY_WORDS.length'), 19);
  /* 학번마다 낱말이 정해지고, 격자 여섯 행이 그 자모가 된다. */
  assert.equal(run(`(() => {
    const seen = new Set();
    for (let i = 0; i < 40; i += 1) {
      state.student.sid = '3' + (100 + i);
      const grid = createParityGrid(studentId());
      if (!PARITY_WORDS.includes(grid.word)) return false;
      if (grid.labels.length !== 6 || grid.data.length !== 6) return false;
      if (grid.labels.some(sym => sym === '·')) return false;
      if (grid.data.some(row => row.length !== 6)) return false;
      seen.add(grid.word);
    }
    return seen.size > 1;
  })()`), true);
  /* 같은 학번이면 같은 낱말이 나온다. */
  assert.equal(run(`createParityGrid('30101').word === createParityGrid('30101').word`), true);
});
