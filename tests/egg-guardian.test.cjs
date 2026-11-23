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
  for (const [w, h] of [[1152, 732], [792, 1092], [362, 740]]) {
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
