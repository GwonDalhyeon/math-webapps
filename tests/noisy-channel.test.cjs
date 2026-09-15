const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

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

test('eight Hamming question patterns and all 24 single-bit code corrections', () => {
  const run=app();
  run('state.screens.N15.groups=[[1,3,5,7],[2,3,6,7],[4,5,6,7]]');
  assert.equal(run('new Set(n15Patterns().map(item=>item.pattern)).size'),8);
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
  assert.match(c2, /1시·2시·3시/);
});
