// ④ 벡터 카드 세트 만들기와 유일성 검사. DOM에 접근하지 않는다.
// 같은 색 묶음 안에서 크기 2~4인 부분집합 가운데 합이 (0, 0)인 것은 정답 모둠뿐이어야 한다.
(function (root) {
  'use strict';
  const TD = root.TeamDraw = root.TeamDraw || {};

  const LOCAL_STEPS = 3000;
  const RESTARTS = 5;
  const BUNDLE_LETTERS = ['가', '나', '다', '라'];

  // 쓸 수 있는 조건: 모든 모둠이 3명 또는 4명, 모둠 2~12개, 참여 6~40명(묶음을 끄면 6~24명)
  function availability(sizes, colorOn) {
    const n = sizes.reduce((a, b) => a + b, 0);
    const maxN = colorOn ? 40 : 24;
    if (!sizes.length) return '명단을 먼저 넣어 주세요.';
    if (sizes.some((s) => s !== 3 && s !== 4)) return '벡터 카드는 3~4명 모둠에서만 쓸 수 있습니다.';
    if (sizes.length < 2 || sizes.length > 12) return '벡터 카드는 2~12모둠에서만 쓸 수 있습니다.';
    if (n < 6 || n > maxN) return colorOn ? '벡터 카드는 6~40명에서만 쓸 수 있습니다.' : '같은 색 묶음을 끄면 6~24명에서만 쓸 수 있습니다.';
    return '';
  }

  // 모둠을 최대 3개씩 묶는다. 묶음 수 c = ceil(G/3), 묶음마다 모둠 수를 최대한 고르게 나눈다.
  function makeBundles(G, colorOn, stream) {
    const teams = stream.shuffle(Array.from({ length: G }, (_, i) => i));
    if (!colorOn) return [teams.sort((a, b) => a - b)];
    const c = Math.ceil(G / 3);
    const base = Math.floor(G / c);
    const extra = G % c;
    const bundles = [];
    let at = 0;
    for (let b = 0; b < c; b++) {
      const k = base + (b < extra ? 1 : 0);
      bundles.push(teams.slice(at, at + k).sort((x, y) => x - y));
      at += k;
    }
    return bundles;
  }

  // 크기 k 모둠: 앞의 k−1개는 영벡터가 아닌 정수 벡터, 마지막은 그 합의 반대
  function genTeam(k, R, stream) {
    for (;;) {
      const vs = [];
      let sx = 0, sy = 0;
      for (let i = 0; i < k - 1; i++) {
        let x, y;
        do { x = stream.randInt(2 * R + 1) - R; y = stream.randInt(2 * R + 1) - R; } while (x === 0 && y === 0);
        vs.push([x, y]);
        sx += x; sy += y;
      }
      const lx = -sx, ly = -sy;
      if (Math.abs(lx) <= R && Math.abs(ly) <= R && (lx !== 0 || ly !== 0)) {
        vs.push([lx, ly]);
        return vs;
      }
    }
  }

  const key = (v) => v[0] + ',' + v[1];

  // 묶음 안에서 조건을 어기는 부분집합 목록(벡터 번호 배열)
  // vecs: [[x,y]...], teamOf: 벡터 번호 → 묶음 안 모둠 번호, teamSize: 모둠 번호 → 크기, usedOutside: 다른 묶음 벡터
  function findViolations(vecs, teamOf, teamSize, usedOutside) {
    const n = vecs.length;
    const X = new Int32Array(n), Y = new Int32Array(n);
    for (let i = 0; i < n; i++) { X[i] = vecs[i][0]; Y[i] = vecs[i][1]; }
    const out = [];
    const isTeam = (members) => {
      const t = teamOf[members[0]];
      return members.length === teamSize[t] && members.every((m) => teamOf[m] === t);
    };
    for (let i = 0; i < n; i++) {
      if (usedOutside && usedOutside.has(key(vecs[i]))) out.push([i]);
      for (let j = i + 1; j < n; j++) {
        if (X[i] === X[j] && Y[i] === Y[j]) out.push([i, j]); // 같은 벡터
        const x2 = X[i] + X[j], y2 = Y[i] + Y[j];
        if (x2 === 0 && y2 === 0) { out.push([i, j]); continue; }
        for (let k = j + 1; k < n; k++) {
          const x3 = x2 + X[k], y3 = y2 + Y[k];
          if (x3 === 0 && y3 === 0) { if (!isTeam([i, j, k])) out.push([i, j, k]); continue; }
          for (let l = k + 1; l < n; l++) {
            if (x3 + X[l] === 0 && y3 + Y[l] === 0 && !isTeam([i, j, k, l])) out.push([i, j, k, l]);
          }
        }
      }
    }
    return out;
  }

  // 한 묶음의 벡터를 국소 탐색으로 만든다. 실패하면 null
  function solveBundle(teamSizes, R, stream, usedOutside) {
    const teamOf = [];
    teamSizes.forEach((s, t) => { for (let k = 0; k < s; k++) teamOf.push(t); });
    const starts = [];
    let at = 0;
    for (const s of teamSizes) { starts.push(at); at += s; }
    const flatten = (teams) => teams.flat();

    for (let restart = 0; restart < RESTARTS; restart++) {
      let teams = teamSizes.map((k) => genTeam(k, R, stream));
      let viol = findViolations(flatten(teams), teamOf, teamSizes, usedOutside);
      for (let step = 0; step < LOCAL_STEPS && viol.length; step++) {
        const subset = viol[stream.randInt(viol.length)];
        const member = subset[stream.randInt(subset.length)];
        const t = teamOf[member];
        const old = teams[t];
        teams[t] = genTeam(teamSizes[t], R, stream);
        const next = findViolations(flatten(teams), teamOf, teamSizes, usedOutside);
        if (next.length <= viol.length) viol = next;
        else teams[t] = old;
      }
      if (!viol.length) return teams;
    }
    return null;
  }

  // 덱 만들기: { teams: 모둠별 벡터 목록, bundles: 묶음별 모둠 번호(0부터), bundleOf, R, R0, colorOn }
  function generateDeck({ sizes, colorOn, R0, stream }) {
    const G = sizes.length;
    const start = R0 || (colorOn ? 5 : 10);
    const Rmax = colorOn ? 7 : 12;
    const bundles = makeBundles(G, colorOn, stream);
    const bundleOf = new Array(G);
    bundles.forEach((b, bi) => b.forEach((g) => { bundleOf[g] = bi; }));
    for (let R = start; R <= Rmax; R++) {
      const teams = new Array(G);
      const used = new Set();
      let ok = true;
      for (const b of bundles) {
        const res = solveBundle(b.map((g) => sizes[g]), R, stream, used);
        if (!res) { ok = false; break; }
        b.forEach((g, i) => { teams[g] = res[i]; });
        res.flat().forEach((v) => used.add(key(v)));
      }
      if (ok) return { teams, bundles, bundleOf, R, R0: start, colorOn };
    }
    return null;
  }

  // 덱 전체 검사(시험·안전장치용): 문제 목록을 돌려준다. 빈 배열이면 통과
  function checkDeck(deck, sizes) {
    const problems = [];
    const all = new Set();
    deck.teams.forEach((vs, g) => {
      if (vs.length !== sizes[g]) problems.push(`${g + 1}모둠 크기`);
      const sx = vs.reduce((s, v) => s + v[0], 0), sy = vs.reduce((s, v) => s + v[1], 0);
      if (sx !== 0 || sy !== 0) problems.push(`${g + 1}모둠 합`);
      for (const v of vs) {
        if (Math.abs(v[0]) > deck.R || Math.abs(v[1]) > deck.R) problems.push(`범위 ${key(v)}`);
        if (v[0] === 0 && v[1] === 0) problems.push('영벡터');
        if (all.has(key(v))) problems.push(`중복 ${key(v)}`);
        all.add(key(v));
      }
    });
    for (const b of deck.bundles) {
      const vecs = [], teamOf = [], teamSize = [];
      b.forEach((g, t) => { teamSize.push(sizes[g]); deck.teams[g].forEach((v) => { vecs.push(v); teamOf.push(t); }); });
      const v = findViolations(vecs, teamOf, teamSize, null);
      if (v.length) problems.push(`묶음 ${b.join('·')} 위반 ${v.length}개`);
    }
    return problems;
  }

  // 성분 표기: 음수에는 유니코드 마이너스(U+2212)
  function num(x) { return x < 0 ? '−' + -x : String(x); }
  function formatVector(v) { return `(${num(v[0])}, ${num(v[1])})`; }
  function formatSum(vs) {
    const sx = vs.reduce((s, v) => s + v[0], 0), sy = vs.reduce((s, v) => s + v[1], 0);
    return vs.map(formatVector).join(' + ') + ' = ' + formatVector([sx, sy]);
  }

  TD.vectors = {
    BUNDLE_LETTERS, availability, makeBundles, genTeam, findViolations, solveBundle, generateDeck, checkDeck,
    formatNumber: num, formatVector, formatSum,
  };
})(typeof window !== 'undefined' ? window : globalThis);
