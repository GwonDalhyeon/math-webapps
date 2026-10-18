// 모둠 뽑기 엔진 시험: node tests/team-draw.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const ENGINE = ['random', 'roster', 'groups', 'vectors', 'export'];
function loadEngine() {
  const context = vm.createContext({ console });
  for (const name of ENGINE) {
    const file = path.join(__dirname, '..', 'icebreaking', 'team-draw', 'js', name + '.js');
    vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
  }
  return context.TeamDraw;
}
const TD = loadEngine();
const R = TD.random;

// 고정 시드: 시험에서는 crypto 대신 이 값을 쓴다.
function seedOf(i) {
  return R.sha256(R.utf8('team-draw-test-' + i)).slice(0, 16);
}
function streamOf(i, name = 'assign') {
  return R.createSession(seedOf(i), null)[name];
}

// 카이제곱 임계값(유의수준 0.001), Wilson–Hilferty 근사
function chiCritical(df) {
  const z = 3.0902;
  const a = 2 / (9 * df);
  return df * Math.pow(1 - a + z * Math.sqrt(a), 3);
}
function chiSquare(counts, expected) {
  return counts.reduce((s, c, i) => s + (c - expected[i]) ** 2 / expected[i], 0);
}

// 구조 해석실 parseGroupPaste를 그대로 옮겨 적음
// 출처: ../lesson-design/geometry/assessments/2026-vector-bridge-structure/webapp/public/js/roster-core.js
function parseGroupPaste(text) {
  const assignments = [];
  const errors = [];
  for (const [i, line] of String(text ?? '').split(/\r?\n/).entries()) {
    const t = line.trim();
    if (!t) continue;
    const parts = t.split(/[\t,; ]+/).filter(Boolean);
    if (!/\d/.test(t)) continue; // 머리글 줄
    if (!/^\d{4}$/.test(parts[0] ?? '')) { errors.push(i + 1); continue; }
    const g = parts[1] === undefined || parts[1] === '-' ? null : Number(String(parts[1]).replace(/모둠|조/g, ''));
    if (!(g === null || (Number.isInteger(g) && g >= 1 && g <= 20))) { errors.push(i + 1); continue; }
    assignments.push({ studentNo: parts[0], groupNo: g });
  }
  return { assignments, errors };
}

const range = (n) => Array.from({ length: n }, (_, i) => i);
// vm 안에서 만든 배열은 프로토타입이 달라 JSON으로 바꿔 비교한다.
const plain = (x) => JSON.parse(JSON.stringify(x));
const same = (a, b, msg) => assert.deepEqual(plain(a), plain(b), msg);
const notSame = (a, b, msg) => assert.notDeepEqual(plain(a), plain(b), msg);

test('1. SHA-256 표준 시험 벡터', () => {
  const hex = (s) => R.toHex(R.sha256(R.utf8(s)));
  assert.equal(hex(''), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  assert.equal(hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  assert.equal(hex('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq'),
    '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1');
  assert.equal(hex('a'.repeat(1000)), '41edece42d63e8d9bf515a9ba6932e1c20cbc9f5a5d134645adb5db1b9737ea3');
  assert.equal(R.toHex(R.utf8('가')), 'eab080');
});

test('지문은 시드의 SHA-256 앞 8자리이다', () => {
  const seed = seedOf(1);
  const s = R.createSession(seed, null);
  const h = R.toHex(R.sha256(seed)).slice(0, 8).toUpperCase();
  assert.equal(s.fingerprint, h.slice(0, 4) + '-' + h.slice(4));
  assert.match(s.fingerprint, /^[0-9A-F]{4}-[0-9A-F]{4}$/);
  assert.equal(s.seedHex.length, 32);
  same([...R.fromHex(s.seedHex)], [...seed]);
});

test('2. randInt 균등성 (n = 3, 6, 7)', () => {
  for (const n of [3, 6, 7]) {
    const st = streamOf(100 + n);
    const counts = new Array(n).fill(0);
    for (let i = 0; i < 100000; i++) counts[st.randInt(n)]++;
    const chi = chiSquare(counts, new Array(n).fill(100000 / n));
    assert.ok(chi < chiCritical(n - 1), `n=${n} chi=${chi.toFixed(2)}`);
  }
});

test('3. 모둠 크기 계산', () => {
  const sz = (n, rem) => TD.groups.groupSizes({ n, basis: 'size', size: 4, rem }).sizes.join(',');
  assert.equal(sz(24, 'small'), '4,4,4,4,4,4');
  assert.equal(sz(23, 'small'), '4,4,4,4,4,3');
  assert.equal(sz(22, 'small'), '4,4,4,4,3,3');
  assert.equal(sz(21, 'small'), '4,4,4,3,3,3');
  assert.equal(sz(20, 'small'), '4,4,4,4,4');
  assert.equal(sz(23, 'big'), '5,5,5,4,4');
  assert.equal(sz(21, 'big'), '5,4,4,4,4');
  assert.equal(TD.groups.groupSizes({ n: 22, basis: 'size', size: 4, rem: 'small' }).text, '4명 4모둠 + 3명 2모둠');
  // 막히는 경우: 1명 모둠, 1개 모둠, 21개 이상 모둠, G > n
  assert.ok(TD.groups.groupSizes({ n: 5, basis: 'count', count: 3 }).errors.length); // 2,2,1
  assert.ok(TD.groups.groupSizes({ n: 7, basis: 'size', size: 8, rem: 'small' }).errors.length); // 1모둠
  assert.ok(TD.groups.groupSizes({ n: 60, basis: 'size', size: 2, rem: 'small' }).errors.length); // 30모둠
  assert.ok(TD.groups.groupSizes({ n: 42, basis: 'count', count: 21 }).errors.length);
  assert.ok(TD.groups.groupSizes({ n: 4, basis: 'count', count: 5 }).errors.length);
  assert.equal(TD.groups.groupSizes({ n: 40, basis: 'count', count: 20 }).errors.length, 0);
  // s−2 이하 경고는 띄우되 시작은 허용
  const w = TD.groups.groupSizes({ n: 9, basis: 'size', size: 4, rem: 'small' }); // 3,3,3
  assert.equal(w.errors.length, 0);
  assert.equal(w.warnings.length, 0);
  const w2 = TD.groups.groupSizes({ n: 10, basis: 'size', size: 6, rem: 'small' }); // 5,5
  assert.equal(w2.warnings.length, 0);
  const w3 = TD.groups.groupSizes({ n: 5, basis: 'size', size: 4, rem: 'small' }); // 3,2
  assert.equal(w3.errors.length, 0);
  assert.equal(w3.warnings.length, 1);
});

test('4. 균등성(조건 없음): 24명 4×6', () => {
  const ids = range(24);
  const sizes = [4, 4, 4, 4, 4, 4];
  const st = streamOf(4);
  const N = 20000;
  const counts = ids.map(() => new Array(6).fill(0));
  const together = ids.map(() => new Array(24).fill(0));
  for (let t = 0; t < N; t++) {
    const a = TD.groups.sampleFull(ids, sizes, [], st);
    for (const i of ids) {
      counts[i][a.get(i) - 1]++;
      for (let j = i + 1; j < 24; j++) if (a.get(i) === a.get(j)) together[i][j]++;
    }
  }
  const crit = chiCritical(5);
  for (const i of ids) {
    const chi = chiSquare(counts[i], new Array(6).fill(N / 6));
    assert.ok(chi < crit, `학생 ${i} chi=${chi.toFixed(2)}`);
  }
  let sum = 0, pairs = 0;
  for (let i = 0; i < 24; i++) for (let j = i + 1; j < 24; j++) {
    const p = together[i][j] / N;
    assert.ok(Math.abs(p - 3 / 23) < 0.02, `쌍 ${i},${j} p=${p}`);
    sum += p; pairs++;
  }
  assert.ok(Math.abs(sum / pairs - 3 / 23) < 0.005);
});

// 6명, [2,2,2], 묶음 {0,1}: 조건을 지키는 배정 전체
function allValid() {
  const out = [];
  const rec = (i, a, left) => {
    if (i === 6) { if (a[0] !== a[1]) out.push(a.join('')); return; }
    for (let g = 1; g <= 3; g++) if (left[g - 1]) { left[g - 1]--; a.push(g); rec(i + 1, a, left); a.pop(); left[g - 1]++; }
  };
  rec(0, [], [2, 2, 2]);
  return out;
}

function checkUniform(label, sampler, N) {
  const valid = allValid();
  assert.equal(valid.length, 72);
  const index = new Map(valid.map((k, i) => [k, i]));
  const counts = new Array(valid.length).fill(0);
  for (let t = 0; t < N; t++) {
    const a = sampler(t);
    const k = range(6).map((i) => a.get(i)).join('');
    assert.ok(index.has(k), `${label}: 조건을 어긴 배정 ${k}`);
    counts[index.get(k)]++;
  }
  const chi = chiSquare(counts, new Array(valid.length).fill(N / valid.length));
  assert.ok(chi < chiCritical(valid.length - 1), `${label} chi=${chi.toFixed(1)}`);
}

test('5. 균등성(조건 있음): sampleFull과 drawOne', () => {
  const ids = range(6), sizes = [2, 2, 2], apart = [[0, 1]];
  const st1 = streamOf(51);
  checkUniform('sampleFull', () => TD.groups.sampleFull(ids, sizes, apart, st1), 60000);
  const st2 = streamOf(52), order = streamOf(53, 'fx');
  checkUniform('drawOne', () => {
    const s = TD.groups.createDrawSession({ presentIds: ids, sizes, apart, stream: st2 });
    for (const id of order.shuffle(ids.slice())) s.draw(id);
    return s.assignment();
  }, 60000);
});

test('9. 카드 주인 바꾸기', () => {
  const ids = range(6), sizes = [2, 2, 2], apart = [[0, 1]];
  // 조건 없는 학생끼리: 모둠이 그대로 넘어간다
  const s = TD.groups.createDrawSession({ presentIds: ids, sizes, apart, stream: streamOf(91) });
  const r1 = s.draw(4);
  const f1 = s.fixOwner(4, 5);
  assert.equal(f1.transferred, true);
  assert.equal(f1.group, r1.group);
  assert.equal(s.isDrawn(4), false);
  // 묶음 학생이 끼면 다시 배정되고 조건을 지킨다
  s.draw(2);
  const f2 = s.fixOwner(2, 0);
  assert.equal(f2.transferred, false);
  for (const id of [1, 2, 3, 4]) s.draw(id);
  const final = s.assignment();
  assert.ok(TD.groups.satisfies(final, apart));
  same(s.fixes, [[1, 4, 5], [2, 2, 0]]);
  // 기록으로 다시 계산한 결과가 같다
  const again = TD.groups.replayDraws({ presentIds: ids, sizes, apart, stream: streamOf(91), order: s.order, fixes: s.fixes });
  same([...again.assignment()].sort(), [...final].sort());
  // 공개 결과와 상관없이 주인 바꾸기를 섞어도 분포가 균등하다
  const st = streamOf(92), ctl = streamOf(93, 'fx');
  checkUniform('fixOwner', () => {
    const d = TD.groups.createDrawSession({ presentIds: ids, sizes, apart, stream: st });
    const queue = ctl.shuffle(ids.slice());
    while (queue.length) {
      const B = queue.shift();
      d.draw(B);
      if (queue.length && ctl.randInt(10) < 4) {
        const A = queue.splice(ctl.randInt(queue.length), 1)[0];
        d.fixOwner(B, A);
        queue.push(B);
      }
    }
    return d.assignment();
  }, 60000);
});

test('6. 재현성과 결과 형식', () => {
  const ids = range(24), sizes = [4, 4, 4, 4, 4, 4], apart = [[3, 17, 9]];
  const a1 = TD.groups.sampleFull(ids, sizes, apart, R.createSession(seedOf(6), '1234').assign);
  const s2 = R.createSession(seedOf(6), '1234');
  for (let i = 0; i < 777; i++) s2.fx.nextU32(); // 연출 흐름을 더 써도
  const a2 = TD.groups.sampleFull(ids, sizes, apart, s2.assign);
  same([...a1], [...a2]);
  const a3 = TD.groups.sampleFull(ids, sizes, apart, R.createSession(seedOf(6), '1235').assign);
  notSame([...a1], [...a3]); // 학생 숫자가 바뀌면 결과도 바뀐다

  const students = ids.map((id) => ({ id, studentNo: String(2124 - id), name: '가상' + String(id + 1).padStart(2, '0') }));
  const text = TD.exporter.groupPasteText(students, a1);
  const parsed = parseGroupPaste(text);
  assert.equal(parsed.errors.length, 0);
  assert.equal(parsed.assignments.length, 24);
  assert.equal(text.split('\n')[1].split('\t')[0], '2101'); // 학번 순
  for (const { studentNo, groupNo } of parsed.assignments) {
    assert.equal(groupNo, a1.get(2124 - Number(studentNo)));
  }
  const csv = TD.exporter.csvText([...students, { id: 24, studentNo: '2125', name: '=SUM(1)' }], new Map([...a1, [24, 1]]));
  assert.ok(csv.startsWith('﻿모둠,학번,이름\r\n1,'));
  assert.match(csv, /'=SUM\(1\)/);
  assert.match(TD.exporter.csvFileName(new Date(2026, 9, 18, 9, 5)), /^team-draw-20261018-0905\.csv$/);
});

test('6. 재현: 추첨 기록으로 결과를 다시 계산한다(모든 방식)', () => {
  const present = range(22).filter((i) => i !== 5);
  const sizes = TD.groups.groupSizes({ n: present.length, basis: 'size', size: 4, rem: 'small' }).sizes;
  const apart = [[0, 7, 12]];
  for (const mode of ['marble', 'slot', 'card', 'vector-hidden', 'vector-all']) {
    const seed = seedOf(mode), u = '42';
    const s = R.createSession(seed, u);
    const rec = { n: 22, present, sizes, apart, mode: mode.startsWith('vector') ? 'vector' : mode, seed: s.seedHex, u, redraws: 0 };
    let expected;
    if (mode === 'marble' || mode === 'slot') {
      expected = TD.groups.sampleFull(present, sizes, apart, s.assign);
    } else {
      let cards = null;
      if (mode.startsWith('vector')) {
        const deck = TD.vectors.generateDeck({ sizes, colorOn: true, R0: 5, stream: s.vector });
        cards = deck.teams.map((vs) => vs.map((_, i) => i));
        rec.vec = { color: true, R: 5, Rused: deck.R, deal: mode === 'vector-all' ? 'all' : 'hidden' };
      }
      if (mode === 'vector-all') {
        expected = TD.groups.sampleFull(present, sizes, apart, s.assign);
        rec.cardOf = TD.groups.dealCards(present, expected, cards, s.assign);
      } else {
        const d = TD.groups.createDrawSession({ presentIds: present, sizes, apart, stream: s.assign, cards });
        const queue = s.fx.shuffle(present.slice());
        while (queue.length) {
          const B = queue.shift();
          d.draw(B);
          if (queue.length && s.fx.randInt(4) === 0) { const A = queue.shift(); d.fixOwner(B, A); queue.push(B); }
        }
        expected = d.assignment();
        rec.order = d.order.slice();
        rec.fixes = d.fixes.slice();
        if (cards) rec.cardOf = new Map(present.map((id) => [id, d.cardOf(id)]));
      }
    }
    const json = TD.exporter.recordJson(rec);
    assert.doesNotMatch(json, /가상/);
    const back = TD.exporter.replay(JSON.parse(json));
    same([...back.assign].sort((a, b) => a[0] - b[0]), [...expected].sort((a, b) => a[0] - b[0]), mode);
    assert.ok(TD.groups.satisfies(back.assign, apart));
    if (rec.cardOf) same([...back.cardOf].sort((a, b) => a[0] - b[0]), [...rec.cardOf].sort((a, b) => a[0] - b[0]), mode);
  }
});

test('7. 벡터 세트', () => {
  const cases = [
    { label: '4×6', sizes: [4, 4, 4, 4, 4, 4] },
    { label: '4×5', sizes: [4, 4, 4, 4, 4] },
    { label: '4×5+3', sizes: [4, 4, 4, 4, 4, 3] },
    { label: '4×10', sizes: new Array(10).fill(4) },
  ];
  let slowest = 0;
  for (const c of cases) {
    for (let i = 0; i < 50; i++) {
      const t0 = performance.now();
      const deck = TD.vectors.generateDeck({ sizes: c.sizes, colorOn: true, R0: 5, stream: streamOf(`${c.label}-${i}`, 'vector') });
      const ms = performance.now() - t0;
      slowest = Math.max(slowest, ms);
      assert.ok(deck, `${c.label} 시드 ${i} 실패`);
      assert.ok(ms <= 200, `${c.label} 시드 ${i}: ${ms.toFixed(0)}ms`);
      same(TD.vectors.checkDeck(deck, c.sizes), []);
      assert.ok(deck.bundles.every((b) => b.length <= 3));
    }
  }
  let slowestOff = 0, maxR = 0;
  for (let i = 0; i < 20; i++) {
    const sizes = [4, 4, 4, 4, 4, 4];
    const t0 = performance.now();
    const deck = TD.vectors.generateDeck({ sizes, colorOn: false, R0: 10, stream: streamOf('off-' + i, 'vector') });
    const ms = performance.now() - t0;
    slowestOff = Math.max(slowestOff, ms);
    assert.ok(deck, `묶음 끔 시드 ${i} 실패`);
    assert.ok(ms <= 5000, `묶음 끔 시드 ${i}: ${ms.toFixed(0)}ms`);
    assert.equal(deck.bundles.length, 1);
    same(TD.vectors.checkDeck(deck, sizes), []);
    maxR = Math.max(maxR, deck.R);
  }
  console.log(`  벡터 세트: 묶음 켬 최대 ${slowest.toFixed(0)}ms, 묶음 끔 최대 ${slowestOff.toFixed(0)}ms (R 최대 ${maxR})`);
  // 묶음 나누기: 6 → 3·3, 5 → 3·2, 10 → 3·3·2·2
  const sizesOf = (G) => TD.vectors.makeBundles(G, true, streamOf('b' + G, 'vector')).map((b) => b.length).join('·');
  assert.equal(sizesOf(6), '3·3');
  assert.equal(sizesOf(5), '3·2');
  assert.equal(sizesOf(10), '3·3·2·2');
  // 표기: 유니코드 마이너스
  assert.equal(TD.vectors.formatSum([[3, 1], [-1, 2], [-4, -1], [2, -2]]), '(3, 1) + (−1, 2) + (−4, −1) + (2, −2) = (0, 0)');
  // 쓸 수 있는 조건
  assert.equal(TD.vectors.availability([4, 4, 4, 4, 4, 4], true), '');
  assert.match(TD.vectors.availability([5, 5, 4], true), /3~4명/);
  assert.match(TD.vectors.availability(new Array(7).fill(4), false), /6~24명/);
});

test('8. 명단 해석', () => {
  const P = TD.roster.parseRoster;
  // 출석부 머리글 있음(제목 줄·담당교사 줄 포함)
  const att = ['2학년 1반 출석부', '담임: 가상교사', '', '학년\t반\t번호\t성명\t비고',
    '2\t1\t1\t가상01\t', '2\t1\t2\t가상02(전입)\t', '2\t1\t3\t가상03\t', '\t\t\t\t', '계\t\t\t3명'].join('\n');
  let r = P(att);
  assert.equal(r.students.length, 3);
  assert.equal(r.hasStudentNo, true);
  same(r.students.map((s) => s.studentNo), ['2101', '2102', '2103']);
  assert.equal(r.students[1].name, '가상02');
  assert.equal(r.students[1].nameRaw, '가상02(전입)');
  same(r.skippedLines, [9]);
  // 머리글 없음
  r = P('2 1 3 가상03\n2 1 4 가상04\n2 1 15 가상15');
  same(r.students.map((s) => [s.studentNo, s.name]), [['2103', '가상03'], ['2104', '가상04'], ['2115', '가상15']]);
  // 학번+이름(탭·쉼표·공백)
  r = P('학번\t이름\n2101\t가상01\n2102,가상02\n2103 가상03\n2104;가상04');
  same(r.students.map((s) => s.studentNo), ['2101', '2102', '2103', '2104']);
  same(r.skippedLines, []);
  // 이름만
  r = P('가상01\nKim Min Su\n\n가상03\n1234');
  assert.equal(r.hasStudentNo, false);
  same(r.students.map((s) => s.name), ['가상01', 'Kim Min Su', '가상03']);
  same(r.skippedLines, [5]);
  // 섞인 명단: 학번이 절반 이상이면 학번 없는 줄은 건너뛴다
  r = P('2101 가상01\n2102 가상02\n가상03\n2104 가상04');
  assert.equal(r.hasStudentNo, true);
  assert.equal(r.students.length, 3);
  same(r.skippedLines, [3]);
  // 절반 미만이면 이름 명단, 같은 이름은 구분
  r = P('2101 가상01\n가상02\n가상03\n가상02');
  assert.equal(r.hasStudentNo, false);
  same(r.students.map((s) => [s.studentNo, s.name]), [[null, '가상01'], [null, '가상02'], [null, '가상03'], [null, '가상02 (2)']]);
  // 괄호 표기
  r = P('가상01(전입)\n가상02 (휴학)');
  same(r.students.map((s) => s.name), ['가상01', '가상02']);
  assert.equal(r.students[0].nameRaw, '가상01(전입)');
  // 학번 중복
  r = P('2101 가상01\n2101 가상02\n2103 가상03');
  same(r.duplicateNos, ['2101']);
  // 61명
  const big = range(61).map((i) => `${2101 + i} 가상${String(i + 1).padStart(2, '0')}`).join('\n');
  r = P(big);
  assert.equal(r.students.length, 60);
  assert.equal(r.totalFound, 61);
  assert.equal(r.students[59].studentNo, '2160');
  // 같은 명단은 같은 순서
  same(P(big).students, r.students);
});
