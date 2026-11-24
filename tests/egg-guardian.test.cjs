// node --test tests/egg-guardian.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function game(width = 1152, height = 732) {
  const elements = new Map();
  function element(id) {
    if (!elements.has(id)) elements.set(id, {
      clientWidth: width, clientHeight: height, width: 0, height: 0, children: [],
      style: {}, checked: true, className: '', textContent: '',
      classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } },
      setAttribute() {}, addEventListener() {}, append(child) { this.children.push(child); },
      getContext() { return {}; },
    });
    return elements.get(id);
  }
  const clock = { now: 10000 };
  const context = vm.createContext({
    console, Math, Map, Set, Image: class { addEventListener() {} },
    document: { getElementById: element, createElement: () => element(Symbol()), addEventListener() {} },
    window: { devicePixelRatio: 1, addEventListener() {} },
    clock, performance: { now: () => clock.now }, matchMedia: () => ({ matches: false }),
    requestAnimationFrame: () => 1, setTimeout: () => 1, setInterval: () => 1, clearInterval() {},
  });
  const html = fs.readFileSync(path.join(__dirname, '../icebreaking/egg-guardian/index.html'), 'utf8');
  const source = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1]
    .replace(/import\s*\{[\s\S]*?\}\s*from\s*"[^"]+";/, '');
  vm.runInContext(source, context);
  vm.runInContext('sound.on = false;', context);
  return code => vm.runInContext(code, context);
}

// 화면 비율별 무대 크기: iPad 가로·세로, 16:9 프로젝터, 16:10 노트북, 초광폭, 모바일
const SCREENS = [[1152, 732], [792, 1092], [1896, 866], [1416, 780], [2536, 900], [362, 740]];

test('중앙 둥지와 1~5단계 공격 패턴, 새 판 초기화', () => {
  const run = game();
  assert.equal(run('field.ny'), 0.5);
  assert.equal(run('field.nx'), run('field.aspect / 2'));
  assert.equal(run('[1,2,3,4,5].map(n => attackPattern(n).mode).join(",")'), 'fixed,appear,edge,roam,roam');
  run('gameStage = 5; resetThrowers(); resetRound();');
  assert.equal(run('gameStage'), 1);
  assert.equal(run('throwers.filter(t => t.state === "idle").length'), 4);
  assert.equal(run('throwers.find(t => t.slot.support).state'), 'hidden');
});

test('고정 투척 4회마다 위·오른쪽·아래·왼쪽이 모두 등장', () => {
  const run = game();
  for (let group = 0; group < 5; group++) {
    const edges = [];
    for (let i = 0; i < 4; i++) {
      assert.equal(run('startAim(10000, "stone")'), true);
      edges.push(run('throwerBox(throwers.find(t => t.state === "aim")).edge'));
      run('throwers.filter(t => t.state === "aim").forEach(t => t.state = "idle");');
    }
    assert.deepEqual(edges.sort(), ['bottom', 'left', 'right', 'top']);
  }
});

test('출현 → 예고 → 손에서 투척 → 퇴장, 임의 위치와 투척 간격', () => {
  const run = game();
  run('gameStage = 2; resetThrowers(); startAim(10000, "stone");');
  assert.equal(run('throwers.filter(t => t.state === "appearing").length'), 1);
  run('updateThrowers(10359, .016);');
  assert.equal(run('balls.length'), 0);
  run('updateThrowers(10360, .016);');
  assert.equal(run('throwers.filter(t => t.state === "aim").length'), 1);
  run('updateThrowers(10770, .016);');
  assert.equal(run('balls.length'), 1);
  assert.equal(run('Math.hypot(balls[0].x - throwerHand(throwers.find(t => t.state === "throw")).x, balls[0].y - throwerHand(throwers.find(t => t.state === "throw")).y)'), 0);
  run('updateThrowers(10890, .016); updateThrowers(11240, .016); updateThrowers(11490, .016);');
  assert.equal(run('throwers.filter(t => t.state !== "hidden").length'), 0);
  assert.ok(run('new Set(Array.from({length: 30}, () => Math.round(throwIntervalMs()))).size') > 10);
});

test('이동 단계는 예고 중 이동하고 마지막 220ms 정지, 정지·재개 예약 보존', () => {
  for (const stage of [3, 4, 5]) {
    const run = game();
    run(`gameStage = ${stage}; resetThrowers(); startAim(10000, "stone"); updateThrowers(10360, .016);`);
    const before = run('throwers.find(t => t.state === "moving").route');
    run('updateThrowers(10560, .05);');
    assert.notEqual(run('throwers.find(t => t.state === "moving").route'), before);
    run('let active = throwers.find(t => t.state === "moving"); beginAim(active, 11000); updateThrowers(11100, .05);');
    const aiming = run('active.route');
    run('updateThrowers(11240, .05);');
    assert.equal(run('active.route'), aiming);
    const until = run('active.stateUntil');
    run('phase = "playing"; clock.now = 11100; pauseGame(); clock.now = 16100; resumeGame();');
    assert.equal(run('active.route'), aiming);
    assert.equal(run('active.stateUntil'), until + 5000);
  }
});

test('1~5단계 부화 전환과 패턴 예약 초기화, 불 뿜기는 4단계부터', () => {
  const run = game();
  run('inputMode = "keyboard"; beginStage(10000);');
  for (let stage = 1; stage <= 5; stage++) {
    assert.equal(run('gameStage'), stage);
    run('stageElapsedMs = stageInfo(gameStage).seconds * 1000; startHatching(20000);');
    assert.equal(run('phase'), 'hatching');
    run('finishHatching(22800);');
    assert.equal(run('phase'), 'playing');
    assert.equal(run('creatureLevel'), stage);
    assert.equal(run('throwers.filter(t => t.state !== "hidden").length'), 0);
    assert.equal(run('attackEdges.length'), 0);
    run('balls = [{x:field.nx+.22,y:field.ny,deflected:false,dead:false,type:"stone"}]; nextFlameAt = 0; tryFlame(30000);');
    assert.equal(run('balls[0].dead'), stage >= 3);
  }
});

test('가로·세로·모바일 경로가 무대 안에 있고 중앙 둥지를 침범하지 않음', () => {
  for (const [w, h] of SCREENS) {
    const run = game(w, h);
    for (const stage of [1, 2, 3, 4, 5]) {
      run(`gameStage = ${stage}; resetThrowers();`);
      for (let u = 0; u < 4; u += 0.025) {
        run(`throwers[0].route = ${u}; throwers[0].scale = 1.35;`);
        const result = run(`(() => { const b = throwerBox(throwers[0]); return JSON.stringify({
          inside: b.x - b.size/2 >= 0 && b.x + b.size/2 <= field.aspect && b.y - b.size/2 >= 0 && b.y + b.size/2 <= 1,
          clear: Math.hypot(b.x - field.nx, b.y - field.ny) >= NEST_RADIUS + b.size/2,
        }); })()`);
        assert.deepEqual(JSON.parse(result), { inside: true, clear: true }, `${w}×${h}, stage ${stage}, route ${u}`);
      }
    }
  }
});

test('화면 비율과 관계없이 요정이 최소 투척 거리 안으로 들어오지 않음', () => {
  for (const [w, h] of SCREENS) {
    const run = game(w, h);
    for (const stage of [1, 2, 3, 4, 5]) {
      run(`gameStage = ${stage}; resetThrowers();`);
      // 어느 경로 값이든 그려지는 위치는 허용 구간 안이다(허용 구간이 없는 변은 가장 먼 모서리).
      const worst = run(`(() => { let worst = Infinity; const t = throwers[0];
        for (let u = 0; u < 4; u += 0.01) { t.route = u; const b = throwerBox(t); const bounds = routeBounds(t);
          const d = Math.hypot(b.x - field.nx, b.y - field.ny);
          const edge = Math.min(3, Math.floor(u)); const ranges = allowedRanges(edge, bounds);
          const need = ranges.length === 1 && ranges[0][0] === ranges[0][1] ? d : bounds.minDist;
          worst = Math.min(worst, d - need + 1e-6); }
        return worst; })()`);
      assert.ok(worst >= 0, `${w}×${h}, stage ${stage}: ${worst}`);
      // 이동 단계: 6초 동안 걸어도 허용 구간을 벗어나지 않고, 실제로 움직인다.
      if (stage >= 3) {
        const result = JSON.parse(run(`(() => { resetThrowers(); startAim(10000, "stone"); updateThrowers(10360, .016);
          const t = throwers.find(x => x.state === "moving"); const start = t.route; let bad = 0;
          for (let i = 0; i < 360; i++) { t.state = "moving"; t.stateUntil = 1e12; updateThrowers(11000 + i * 16, .016);
            const bounds = routeBounds(t); if (projectRoute(t.route, bounds) !== t.route) bad++; }
          return JSON.stringify({ bad, moved: Math.abs(t.route - start) > 0.01 || t.direction !== 0 }); })()`));
        assert.equal(result.bad, 0, `${w}×${h}, stage ${stage}`);
      }
    }
  }
});

test('가로 화면 1단계: 위·아래 요정이 둥지 바로 위·아래가 아니라 비켜 서고 좌우와 비슷한 거리', () => {
  for (const [w, h] of [[1152, 732], [1896, 866], [2536, 900]]) {
    const run = game(w, h);
    const boxes = JSON.parse(run(`JSON.stringify(throwers.filter(t => !t.slot.support).map(t => {
      const b = throwerBox(t); return { edge: b.edge, d: Math.hypot(b.x - field.nx, b.y - field.ny), dx: b.x - field.nx }; }))`));
    const minDist = run('routeBounds(throwers[0]).minDist');
    for (const box of boxes) assert.ok(box.d >= minDist - 1e-6, `${w}×${h} ${box.edge}: ${box.d}`);
    assert.deepEqual(boxes.map(b => b.edge), ['top', 'right', 'bottom', 'left']);
    // 바람개비 배치: 위는 왼쪽, 아래는 오른쪽으로 비켜 선다.
    assert.ok(boxes[0].dx < 0 && boxes[2].dx >= 0, `${w}×${h}`);
  }
});

test('부화 뒤 새 단계 안내에 성장 한마디와 공격 패턴이 함께 남음', () => {
  const run = game();
  run(`inputMode = "keyboard"; beginStage(10000); stageElapsedMs = 35000; startHatching(20000);
    let shown = []; showNotice = (title, detail) => shown.push([title, detail]); finishHatching(22800);`);
  const [title, detail] = run('shown[shown.length - 1]');
  assert.match(title, /2단계 · 가장자리 깜짝 출현/);
  assert.match(detail, /가장자리에서 나타나는/);
});

test('카운트다운은 3·2·1 다음 "시작!"을 0.5초 보여 준 뒤 플레이', () => {
  const run = game();
  run(`inputMode = "keyboard"; clock.now = 10000; startCountdown(); let seq = [];
    for (let t = 10000; t <= 13800; t += 50) { updatePhase(t);
      const text = $("countdown").textContent; if (seq[seq.length - 1]?.[0] !== text) seq.push([text, t]); if (phase === "playing") break; }`);
  const seq = JSON.parse(run('JSON.stringify(seq)'));
  assert.deepEqual(seq.map(s => s[0]), ['3', '2', '1', '시작!']);
  const go = seq[3][1];
  assert.equal(run('phase'), 'playing');
  assert.equal(run('stageStartedAt') - go, 500);
});

test('단계 시작 안내는 첫 도깨비가 나와도 2.4초 동안 남음', () => {
  const run = game();
  run('inputMode = "keyboard"; gameStage = 2; resetThrowers(); beginStage(10000); startAim(11200, "stone");');
  assert.equal(run('noticeHideAt'), 12400);
  run('updatePhase(12399);');
  assert.equal(run('noticeHideAt'), 12400);
  run('updatePhase(12400);');
  assert.equal(run('noticeHideAt'), 0);
});

test('세로 화면 1단계: 고정 요정이 위 2명·아래 2명으로 나뉨', () => {
  // 휴대폰 세로(362×740)는 오른쪽 변 위쪽에 허용 구간이 없어 대상에서 뺀다.
  for (const [w, h] of [[792, 1092], [744, 1080]]) {
    const run = game(w, h);
    const ys = JSON.parse(run('JSON.stringify(throwers.filter(t => !t.slot.support).map(t => throwerBox(t).y - field.ny))'));
    assert.equal(ys.filter(y => y < 0).length, 2, `${w}×${h}: ${ys}`);
    assert.equal(ys.filter(y => y > 0).length, 2, `${w}×${h}: ${ys}`);
  }
});

test('세로 화면 출현 위치: 좌우 변의 위·아래 구간이 반반에 가깝게 나옴', () => {
  const run = game(792, 1092);
  run('gameStage = 2; resetThrowers();');
  const upper = run(`(() => { let up = 0; const t = throwers[0];
    for (let i = 0; i < 2000; i++) { t.state = "hidden"; placeThrower(t, "right"); if (throwerBox(t).y < field.ny) up++; }
    return up / 2000; })()`);
  assert.ok(upper > 0.4 && upper < 0.6, String(upper));
});

test('회복 다람쥐: 잃고 8초 뒤, 다람쥐끼리 20초 간격, 단계 끝 6초 전에는 안 옴', () => {
  const run = game();
  // 5단계(55초)로 시험해 단계 끝 규칙과 섞이지 않게 한다. 단계 끝은 65초.
  run(`inputMode = "keyboard"; gameStage = 5; resetThrowers(); beginStage(10000); phase = "playing"; let sent = [];
    const realStart = startAim; startAim = (now, type) => { if (type === "heal") sent.push(now); return realStart(now, type); };
    var tick = (now) => { stageElapsedMs = now - stageStartedAt; updateHeal(now); };
    var sentJson = () => JSON.stringify(sent);
    leak({ type: "stone", x: 0, y: 0 }, 12000);
    for (let t = 12000; t < 20000; t += 100) tick(t);`);
  assert.equal(run('sentJson()'), '[]');
  run('tick(20000);');
  assert.equal(run('sentJson()'), '[20000]');
  // 열매를 놓쳤고 또 맞았다: 8초 뒤가 아니라 직전 다람쥐에서 20초 뒤에 온다.
  run('leak({ type: "stone", x: 0, y: 0 }, 22000); for (let t = 20100; t < 40000; t += 100) tick(t);');
  assert.equal(run('sentJson()'), '[20000]');
  run('tick(40000);');
  assert.equal(run('sentJson()'), '[20000,40000]');
  // 알이 꽉 차면 대기를 지운다.
  run('lives = LIVES; tick(41000);');
  assert.equal(run('healDueAt'), 0);
  // 단계가 6초 미만 남았으면 보내지 않는다: 52초에 잃으면 8초 뒤(60초)는 단계 끝 5초 전이라 오지 않는다.
  run('lives = 3; leakGraceUntil = 0; leak({ type: "stone", x: 0, y: 0 }, 52000); for (let t = 52000; t < 65000; t += 100) tick(t);');
  assert.equal(run('sentJson()'), '[20000,40000]');
});

test('화면 안쪽 투척도 최소 비행 여유 0.9초, 결과에서 생존 점수 중복 없음', () => {
  const run = game();
  run('gameStage = 5; resetThrowers();');
  for (const type of ['stone', 'wind', 'rock', 'gold']) {
    run(`throwers[0].type = "${type}"; throwers[0].route = .5; spawnBallFromHand(throwers[0], 10000);`);
    assert.ok(run(`(() => { const b = balls[balls.length-1]; return (Math.hypot(b.x-field.nx,b.y-field.ny)-NEST_RADIUS-b.radius)/Math.hypot(b.vx,b.vy); })()`) >= .9 - 1e-9);
  }
  run('score = 50; stageElapsedMs = 10000; survivedMs = 0; finishRound(10000);');
  assert.equal(run('score'), 50);
});

test('오래 일시정지해도 파티클 반지름 오류가 없고 그리기 시간이 고정됨', () => {
  const run = game();
  run(`ctx.beginPath = () => {}; ctx.fill = () => {};
    ctx.arc = (x, y, radius) => { if (radius < 0) throw new Error('negative radius'); };
    particles = [{x:0,y:0,born:1000,life:460,color:'#fff'}];
    drawParticles(1100); drawParticles(10000);
    phase = 'paused'; pausedAt = 10000;
    let observedDrawAt = 0; draw = now => observedDrawAt = now;
    loop(20000);
  `);
  assert.equal(run('observedDrawAt'), 10000);
});
