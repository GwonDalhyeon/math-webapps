// 모둠 크기 계산과 조건을 지키는 무작위 배정. DOM에 접근하지 않는다.
// 모둠 번호는 1부터 센다. 배정은 Map(학생 id → 모둠 번호)으로 나타낸다.
(function (root) {
  'use strict';
  const TD = root.TeamDraw = root.TeamDraw || {};

  const MAX_GROUPS = 20; // 구조 해석실이 1~20모둠만 받는다.
  const MAX_TRIES = 20000;

  // "4명 4모둠 + 3명 2모둠"
  function describeSizes(sizes) {
    const parts = [];
    for (const s of sizes) {
      const last = parts[parts.length - 1];
      if (last && last.size === s) last.count++;
      else parts.push({ size: s, count: 1 });
    }
    return parts.map((p) => `${p.size}명 ${p.count}모둠`).join(' + ');
  }

  // { n, basis:'size'|'count', size, count, rem:'small'|'big' } → { G, sizes, errors, warnings, text }
  function groupSizes({ n, basis, size, count, rem }) {
    const errors = [];
    const warnings = [];
    let G;
    if (basis === 'count') G = count;
    else G = rem === 'big' ? Math.max(1, Math.floor(n / size)) : Math.ceil(n / size);

    if (n < 2) {
      errors.push('참여 학생이 2명 이상이어야 합니다. 명단을 붙여넣거나 결석 표시를 풀어 주세요.');
      return { G, sizes: [], errors, warnings, text: '' };
    }
    if (G > n) {
      errors.push(`모둠 수(${G}개)가 참여 인원(${n}명)보다 많습니다. 모둠 수를 줄여 주세요.`);
      return { G, sizes: [], errors, warnings, text: '' };
    }
    const q = Math.floor(n / G);
    const r = n % G;
    const sizes = [];
    for (let g = 0; g < G; g++) sizes.push(g < r ? q + 1 : q); // 작은 모둠이 뒤 번호에 온다.

    if (G <= 1) errors.push('모둠이 1개뿐입니다. 모둠 인원을 줄이거나 모둠 수를 늘려 주세요.');
    if (q <= 1) errors.push('1명뿐인 모둠이 생깁니다. 모둠 인원을 늘리거나 모둠 수를 줄여 주세요.');
    if (G > MAX_GROUPS) errors.push(`모둠이 ${G}개로 20개를 넘습니다. 구조 해석실은 20모둠까지만 받습니다. 모둠 인원을 늘려 주세요.`);
    if (!errors.length && basis !== 'count' && q <= size - 2) {
      warnings.push(`${q}명뿐인 모둠이 생깁니다. 괜찮으면 그대로 시작하고, 아니면 '큰 모둠 만들기'나 모둠 수 기준을 써 보세요.`);
    }
    return { G, sizes, errors, warnings, text: describeSizes(sizes) };
  }

  // 결석생을 빼고 2명 이상 남은 묶음만 효력이 있다.
  function effectiveApart(apartGroups, presentIds) {
    const present = new Set(presentIds);
    return apartGroups
      .map((grp) => grp.filter((id) => present.has(id)))
      .filter((grp) => grp.length >= 2);
  }

  // 묶음마다 같은 모둠에 두 명 이상 들어가면 안 된다.
  function satisfies(assign, apart) {
    for (const grp of apart) {
      const seen = new Set();
      for (const id of grp) {
        const g = assign.get(id);
        if (g === undefined) continue;
        if (seen.has(g)) return false;
        seen.add(g);
      }
    }
    return true;
  }

  function slotList(sizes) {
    const slots = [];
    sizes.forEach((s, i) => { for (let k = 0; k < s; k++) slots.push(i + 1); });
    return slots;
  }

  // 전체 배정: 자리 목록을 섞어 참여 학생 순서대로 짝짓고, 조건을 어기면 다시 한다.
  function sampleFull(presentIds, sizes, apart, stream, maxTries) {
    const slots = slotList(sizes);
    if (slots.length !== presentIds.length) throw new Error('모둠 크기 합과 참여 인원이 다릅니다.');
    const tries = maxTries || MAX_TRIES;
    for (let t = 0; t < tries; t++) {
      const order = stream.shuffle(slots.slice());
      const assign = new Map();
      presentIds.forEach((id, i) => assign.set(id, order[i]));
      if (satisfies(assign, apart)) return assign;
    }
    return null;
  }

  // 카드를 누르는 순간의 배정(①·④ 숨겨진 카드 가져가기).
  // cards가 있으면(④) cards[g-1] = 그 모둠 카드 번호 목록이고, 정해진 모둠의 남은 카드 하나를 고르게 뽑는다.
  function createDrawSession({ presentIds, sizes, apart, stream, cards }) {
    const fixed = new Map();
    const cardOf = new Map();
    const pool = cards ? cards.map((list) => list.slice()) : null;
    const order = [];
    const fixes = [];
    const inApart = (id) => apart.some((grp) => grp.includes(id));

    // 이미 정해진 학생은 고정하고, 남은 학생에게 남은 자리를 무작위로 배정한 완성안을 만든다.
    function completeFor(x) {
      const rest = presentIds.filter((id) => !fixed.has(id));
      const left = sizes.slice();
      for (const g of fixed.values()) left[g - 1]--;
      const slots = slotList(left);
      const assign = new Map(fixed);
      for (let t = 0; t < MAX_TRIES; t++) {
        const o = stream.shuffle(slots.slice());
        rest.forEach((id, i) => assign.set(id, o[i]));
        if (satisfies(assign, apart)) return assign.get(x);
      }
      if (typeof console !== 'undefined') console.error('완성안을 찾지 못했습니다', { fixed: [...fixed], x });
      throw new Error('조건을 지키는 배정을 찾지 못했습니다.');
    }

    function takeCard(id, g) {
      if (!pool) return null;
      const list = pool[g - 1];
      const card = list.splice(stream.randInt(list.length), 1)[0];
      cardOf.set(id, card);
      return card;
    }

    function draw(x) {
      if (fixed.has(x)) throw new Error('이미 뽑은 학생입니다.');
      const g = completeFor(x);
      fixed.set(x, g);
      order.push(x);
      return { id: x, group: g, card: takeCard(x, g) };
    }

    // 방금 뒤집은 카드의 주인을 B에서 아직 뽑지 않은 A로 바꾼다.
    function fixOwner(B, A) {
      if (!fixed.has(B) || fixed.has(A)) throw new Error('카드 주인을 바꿀 수 없습니다.');
      const g = fixed.get(B);
      const card = cardOf.has(B) ? cardOf.get(B) : null;
      fixed.delete(B);
      cardOf.delete(B);
      fixes.push([order.length, B, A]);
      if (!inApart(A) && !inApart(B)) {
        // 조건이 없는 학생끼리는 바꿔도 확률이 같다.
        fixed.set(A, g);
        if (card !== null) cardOf.set(A, card);
        return { id: A, group: g, card, transferred: true };
      }
      // 묶음 학생이 끼면 B의 배정을 취소하고 A를 새로 뽑는다.
      if (pool && card !== null) pool[g - 1].push(card);
      const g2 = completeFor(A);
      fixed.set(A, g2);
      return { id: A, group: g2, card: takeCard(A, g2), transferred: false };
    }

    return {
      draw,
      fixOwner,
      isDrawn: (id) => fixed.has(id),
      groupOf: (id) => fixed.get(id),
      cardOf: (id) => cardOf.get(id),
      assignment: () => new Map(fixed),
      order,
      fixes,
      get count() { return fixed.size; },
    };
  }

  // 기록(order, fixes)으로 같은 과정을 다시 밟는다.
  function replayDraws({ presentIds, sizes, apart, stream, cards, order, fixes }) {
    const s = createDrawSession({ presentIds, sizes, apart, stream, cards });
    order.forEach((id, i) => {
      s.draw(id);
      for (const [k, B, A] of fixes) if (k === i + 1) s.fixOwner(B, A);
    });
    return s;
  }

  // ④ 한꺼번에 나눠 주기: 참여 학생 순서대로 자기 모둠의 남은 카드를 고르게 뽑는다.
  function dealCards(presentIds, assign, cards, stream) {
    const pool = cards.map((list) => list.slice());
    const cardOf = new Map();
    for (const id of presentIds) {
      const list = pool[assign.get(id) - 1];
      cardOf.set(id, list.splice(stream.randInt(list.length), 1)[0]);
    }
    return cardOf;
  }

  TD.groups = {
    MAX_GROUPS, MAX_TRIES, describeSizes, groupSizes, effectiveApart, satisfies,
    sampleFull, createDrawSession, replayDraws, dealCards,
  };
})(typeof window !== 'undefined' ? window : globalThis);
