// ④ 벡터 카드: 학생은 벡터 카드를 받고, 같은 색 안에서 벡터 합이 (0, 0)이 되는 친구를 찾는다.
// 정답 공개에서는 성분별 합의 식과, 꼬리와 머리를 이은 닫힌 다각형을 함께 보여 준다.
(function (root) {
  'use strict';
  const TD = root.TeamDraw = root.TeamDraw || {};
  const { ui } = TD;
  const V = () => TD.vectors;

  const BUNDLE_COLORS = ['#1e3a8a', '#a3195b', '#78350f', '#4a6274']; // 남색, 자주, 고동, 회청
  const ARROW_COLORS = ['#1d4ed8', '#dc2626', '#15803d', '#c2410c'];

  // 좌표 격자와 원점에서 출발하는 화살표. 격자 한 칸 = 성분 1
  function vectorGridSvg(v, R) {
    const pad = 0.9;
    const min = -R - pad, size = 2 * (R + pad);
    let lines = '';
    for (let k = -R; k <= R; k++) {
      const axis = k === 0;
      const stroke = axis ? '#0f172a' : '#cbd5e1';
      const w = axis ? 0.09 : 0.04;
      lines += `<line x1="${k}" y1="${-R - 0.4}" x2="${k}" y2="${R + 0.4}" stroke="${stroke}" stroke-width="${w}"/>`;
      lines += `<line x1="${-R - 0.4}" y1="${k}" x2="${R + 0.4}" y2="${k}" stroke="${stroke}" stroke-width="${w}"/>`;
    }
    const lab = (t, x, y, a) => `<text x="${x}" y="${y}" font-size="0.75" fill="#475569" text-anchor="${a || 'middle'}" font-weight="700">${t}</text>`;
    const labels = lab(V().formatNumber(R), R, 1.1) + lab(V().formatNumber(-R), -R, 1.1) + lab(V().formatNumber(R), -0.35, -R + 0.25, 'end') + lab(V().formatNumber(-R), -0.35, R + 0.25, 'end');
    const [x, y] = v;
    return `<svg class="vec-grid" viewBox="${min} ${min} ${size} ${size}" role="img" aria-label="좌표평면 위의 벡터 ${V().formatVector(v)}">
      <defs><marker id="vhead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4.2" markerHeight="4.2" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#dc2626"/></marker></defs>
      ${lines}${labels}
      <circle cx="0" cy="0" r="0.18" fill="#0f172a"/>
      <line x1="0" y1="0" x2="${x}" y2="${-y}" stroke="#dc2626" stroke-width="0.22" stroke-linecap="round" marker-end="url(#vhead)"/>
    </svg>`;
  }

  // 꼬리와 머리를 이은 다각형. 출발점(원점)으로 돌아오면 닫힌다.
  function chainSvg(vs, opts) {
    const o = opts || {};
    const pts = [[0, 0]];
    for (const v of vs) { const p = pts[pts.length - 1]; pts.push([p[0] + v[0], p[1] + v[1]]); }
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const x0 = Math.min(...xs) - 1, x1 = Math.max(...xs) + 1, y0 = Math.min(...ys) - 1, y1 = Math.max(...ys) + 1;
    let grid = '';
    for (let k = x0; k <= x1; k++) grid += `<line x1="${k}" y1="${-y1}" x2="${k}" y2="${-y0}" stroke="${k === 0 ? '#94a3b8' : '#e2e8f0'}" stroke-width="${k === 0 ? 0.07 : 0.04}"/>`;
    for (let k = y0; k <= y1; k++) grid += `<line x1="${x0}" y1="${-k}" x2="${x1}" y2="${-k}" stroke="${k === 0 ? '#94a3b8' : '#e2e8f0'}" stroke-width="${k === 0 ? 0.07 : 0.04}"/>`;
    const id = 'ch' + Math.random().toString(36).slice(2, 8);
    let defs = '', arrows = '';
    vs.forEach((v, i) => {
      const c = ARROW_COLORS[i % ARROW_COLORS.length];
      defs += `<marker id="${id}-${i}" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="3.6" markerHeight="3.6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="${c}"/></marker>`;
      const a = pts[i], b = pts[i + 1];
      arrows += `<line x1="${a[0]}" y1="${-a[1]}" x2="${b[0]}" y2="${-b[1]}" stroke="${c}" stroke-width="0.16" stroke-linecap="round" marker-end="url(#${id}-${i})"/>`;
    });
    const poly = pts.slice(0, -1).map((p) => `${p[0]},${-p[1]}`).join(' ');
    return `<svg class="${o.cls || 'answer-svg'}" viewBox="${x0 - 0.2} ${-y1 - 0.2} ${x1 - x0 + 0.4} ${y1 - y0 + 0.4}" role="img" aria-label="${o.label || '꼬리와 머리를 이은 닫힌 다각형'}">
      <defs>${defs}</defs>${grid}
      <polygon points="${poly}" fill="rgba(37,99,235,.08)" stroke="none"/>
      ${arrows}
      <circle cx="0" cy="0" r="0.22" fill="#0f172a"/>
    </svg>`;
  }

  const EXAMPLE = [[3, 1], [-1, 2], [-4, -1], [2, -2]];

  function guideHtml(deal) {
    return `
      <div class="guide">
        <div class="find-timer" aria-label="찾기 타이머">
          <div class="find-clock" data-el="clock" aria-live="off">5:00</div>
          <div class="seg" role="group" aria-label="찾기 시간" style="align-self:center">
            <button type="button" data-min="3" aria-label="3분">3분</button>
            <button type="button" data-min="5" aria-label="5분">5분</button>
            <button type="button" data-min="7" aria-label="7분">7분</button>
          </div>
          <button type="button" class="btn btn-primary" data-act="find" aria-label="모둠원 찾기 타이머 시작">⏱ 찾기 시작</button>
        </div>
        <p><b>같은 색 친구들 가운데, 벡터를 모두 더하면 (0, 0)이 되는 친구들을 찾으세요.</b></p>
        ${chainSvg(EXAMPLE, { cls: 'example', label: '예시: (3, 1), (−1, 2), (−4, −1), (2, −2)를 이으면 출발점으로 돌아오는 사각형' })}
        <p style="font-size:16px;color:var(--muted)">예: ${V().formatSum(EXAMPLE)}</p>
        <details><summary>전략 힌트</summary><ul><li>x성분끼리 먼저 더해 보세요.</li><li>두 사람의 합과 반대인 두 사람을 찾으세요.</li></ul></details>
        <button type="button" class="btn btn-go" data-act="answer" aria-label="정답 공개" disabled>정답 공개</button>
        <p class="hint" data-el="answerHint">${deal === 'all' ? '카드를 나눠 준 뒤 정답을 공개할 수 있습니다.' : '모든 학생이 카드를 가져가면 정답을 공개할 수 있습니다.'}</p>
      </div>`;
  }

  let lc = null;

  function mount(container, session) {
    lc = ui.lifecycle();
    const deck = session.deck;
    const vec = session.vec;
    const R = deck.R;
    const cards = deck.teams.map((vs) => vs.map((_, i) => i));
    const ids = session.students.map((s) => s.id);
    const vectorOf = (g, card) => deck.teams[g - 1][card];
    const bundleIndex = (g) => (vec.color ? deck.bundleOf[g - 1] : 0);
    const bundleTag = (g) => (vec.color ? `${V().BUNDLE_LETTERS[bundleIndex(g)]} 묶음` : '전체');
    const bundleColor = (g) => BUNDLE_COLORS[bundleIndex(g)];
    let cardOf = new Map();
    let groupOf = () => undefined;
    let allReady = false;

    // ---------- 안내 패널(오른쪽) ----------
    function bindGuide(side) {
      const clock = side.querySelector('[data-el="clock"]');
      const minBtns = [...side.querySelectorAll('[data-min]')];
      const findBtn = side.querySelector('[data-act="find"]');
      let minutes = 5, endAt = 0, timer = 0;
      const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
      const syncMin = () => minBtns.forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.min) === minutes)));
      minBtns.forEach((b) => lc.on(b, 'click', () => { if (timer) return; minutes = Number(b.dataset.min); clock.textContent = fmt(minutes * 60); syncMin(); }));
      lc.on(findBtn, 'click', () => {
        if (timer) { lc.clearInterval(timer); timer = 0; findBtn.textContent = '⏱ 찾기 시작'; clock.textContent = fmt(minutes * 60); clock.classList.remove('over'); return; }
        endAt = Date.now() + minutes * 60000;
        findBtn.textContent = '■ 타이머 멈추기';
        clock.classList.remove('over');
        if (session.audio.enabled) session.audio.startMusic();
        timer = lc.interval(() => {
          const left = Math.max(0, Math.round((endAt - Date.now()) / 1000));
          clock.textContent = fmt(left);
          if (left === 0) {
            lc.clearInterval(timer); timer = 0;
            clock.classList.add('over');
            clock.textContent = '시간 끝';
            findBtn.textContent = '⏱ 다시 시작';
            session.audio.alarm();
            ui.announce('찾기 시간이 끝났습니다. 선생님이 정답을 공개합니다.');
          }
        }, 250);
        ui.announce(`모둠원 찾기 ${minutes}분 시작`);
      });
      syncMin();
      lc.on(side.querySelector('[data-act="answer"]'), 'click', () => { if (allReady) startReveal(); });
    }
    function setReady(side) {
      allReady = true;
      side.querySelector('[data-act="answer"]').disabled = false;
      side.querySelector('[data-el="answerHint"]').textContent = '같은 색 안에서 합이 (0, 0)인 묶음은 정답 모둠 하나뿐입니다. 찾기가 끝나면 정답을 공개하세요.';
    }

    // ---------- 숨겨진 카드 가져가기 ----------
    function mountHidden() {
      container.innerHTML = TD.cardStageHtml(guideHtml('hidden'));
      const side = container.querySelector('.side');
      bindGuide(side);
      const ds = TD.groups.createDrawSession({ presentIds: ids, sizes: session.sizes, apart: session.apart, stream: session.streams.assign, cards });
      session.setRecord({ order: ds.order, fixes: ds.fixes });
      groupOf = (id) => ds.groupOf(id);
      const layer = container.querySelector('.reveal-layer');
      const actions = container.querySelector('.center-actions');
      actions.innerHTML = `
        <button type="button" class="btn btn-ghost" data-act="fix" hidden aria-label="방금 가져간 카드의 주인 바꾸기">카드 주인 바꾸기</button>
        <p class="notice" data-act="hint">차례인 학생이 나와 카드를 한 장 고르세요. 벡터를 공책에 적습니다.</p>`;
      const fixBtn = actions.querySelector('[data-act="fix"]');
      const hint = actions.querySelector('[data-act="hint"]');
      let last = null; // { i, id }
      let closeTimer = 0, tickTimer = 0, closeFn = null;

      const table = TD.pickTable(container, {
        lc, session,
        doneMark: () => '✔',
        onPick(i, id) { take(i, id); },
        async onDoneChipClick(id) {
          if (closeFn) return;
          const s = session.byId.get(id);
          const ok = await ui.confirm(`${s.name} 학생의 카드를 다시 보여 줄까요?`, '다시 보기');
          if (ok && !lc.disposed && !closeFn) {
            const i = [...cardIndexOwner].find(([, owner]) => owner === id);
            showCard(i ? i[0] : null, id, null);
          }
        },
      });
      const cardIndexOwner = new Map();

      function showCard(i, id, then) {
        const g = ds.groupOf(id);
        const v = vectorOf(g, ds.cardOf(id));
        const s = session.byId.get(id);
        layer.innerHTML = '';
        layer.classList.add('blocking');
        const sec = vec.sec;
        const C = 2 * Math.PI * 26;
        const card = ui.el('div', { class: 'vec-card', style: `--bc:${bundleColor(g)}`, role: 'dialog', 'aria-label': `${s.name}의 벡터 카드` });
        card.innerHTML = `
          <div class="vec-head"><span class="v-name" title="${ui.esc(s.nameRaw)}">${ui.esc(s.name)}</span><span class="v-bundle">${bundleTag(g)}</span></div>
          <div class="vec-body">
            ${vectorGridSvg(v, R)}
            <div class="vec-comp">${V().formatVector(v)}</div>
            <div class="vec-foot">
              <svg class="timer-ring" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="26" fill="none" stroke="#e2e8f0" stroke-width="7"/><circle class="bar" cx="32" cy="32" r="26" fill="none" stroke="${bundleColor(g)}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="0" transform="rotate(-90 32 32)"/><text x="32" y="33" text-anchor="middle" dominant-baseline="middle">${sec}</text></svg>
              <button type="button" class="btn btn-primary" data-act="close" aria-label="다 적었어요, 카드 덮기">다 적었어요</button>
            </div>
          </div>`;
        layer.appendChild(card);
        if (i !== null && i !== undefined) TD.cardGrow.growFrom(table.cards[i], card, layer, session.reduced);
        session.audio.flip();
        ui.announce(`${s.name}: ${bundleTag(g)}, 벡터 ${V().formatVector(v).replace(/−/g, '마이너스 ')}`);
        const bar = card.querySelector('circle.bar');
        const txt = card.querySelector('text');
        const endAt = Date.now() + sec * 1000;
        tickTimer = lc.interval(() => {
          const left = Math.max(0, endAt - Date.now());
          bar.setAttribute('stroke-dashoffset', String(C * (1 - left / (sec * 1000))));
          txt.textContent = String(Math.ceil(left / 1000));
        }, 100);
        closeFn = () => {
          lc.clearInterval(tickTimer); lc.clearTimeout(closeTimer);
          closeFn = null;
          if (i !== null && i !== undefined) TD.cardGrow.shrinkTo(table.cards[i], card); else card.style.opacity = '0';
          lc.timeout(() => { layer.innerHTML = ''; layer.classList.remove('blocking'); if (then) then(); }, session.reduced ? 200 : 350);
        };
        closeTimer = lc.timeout(() => closeFn && closeFn(), sec * 1000);
        const closeBtn = card.querySelector('[data-act="close"]');
        closeBtn.addEventListener('click', () => closeFn && closeFn());
        closeBtn.focus();
      }

      function afterClose(i) {
        if (lc.disposed) return;
        table.cards[i].classList.add('taken');
        table.cards[i].setAttribute('aria-label', `카드 ${i + 1}: 가져감`);
        table.lock(false);
        if (ds.count === ids.length) {
          fixBtn.hidden = true;
          session.setAssignment(ds.assignment());
          session.setRecord({ cardOf: new Map(ids.map((id) => [id, ds.cardOf(id)])) });
          table.lock(true);
          hint.textContent = '카드를 모두 가져갔습니다. [찾기 시작]을 누르고 모둠원을 찾으세요.';
          setReady(side);
          return;
        }
        hint.textContent = '다른 학생이 카드를 가져갔다면 [카드 주인 바꾸기]로 바로잡으세요.';
      }

      function take(i, id) {
        if (closeFn) return;
        fixBtn.hidden = true;
        table.lock(true);
        ds.draw(id);
        cardIndexOwner.set(i, id);
        last = { i, id };
        table.cards[i].classList.add('up');
        table.markDrawn(id);
        session.progress(ds.count);
        fixBtn.hidden = ds.count === ids.length;
        showCard(i, id, () => afterClose(i));
      }

      lc.on(fixBtn, 'click', async () => {
        if (!last) return;
        const B = last.id;
        const A = await TD.chooseStudent(table.undrawnStudents(), `카드 ${last.i + 1}의 주인 바꾸기 (지금: ${session.byId.get(B).name})`);
        if (A === null || lc.disposed) return;
        const r = ds.fixOwner(B, A);
        cardIndexOwner.set(last.i, A);
        last = { i: last.i, id: A };
        table.unmarkDrawn(B);
        table.markDrawn(A);
        table.setCurrent(B);
        session.setFixCount(ds.fixes.length);
        ui.announce(`카드 주인을 ${session.byId.get(B).name}에서 ${session.byId.get(A).name}(으)로 바꿨습니다.` + (r.transferred ? '' : ' 흩어 놓기 조건 때문에 카드를 새로 뽑았습니다.'));
        if (closeFn) { const f = closeFn; closeFn = null; lc.clearInterval(tickTimer); lc.clearTimeout(closeTimer); layer.innerHTML = ''; void f; }
        table.lock(true);
        const i = last.i;
        table.cards[i].classList.remove('taken');
        showCard(i, A, () => afterClose(i));
      });
    }

    // ---------- 한꺼번에 나눠 주기 ----------
    function mountAll() {
      container.innerHTML = `
        <div class="stage stage-2">
          <div class="center">
            <div class="pane center-main pane-scroll" data-el="dealMain" style="padding:16px">
              <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;height:100%;text-align:center">
                <p style="font-size:22px;margin:0;color:var(--ink)">모든 학생의 벡터 카드를 한꺼번에 정합니다.<br>표를 보고 자기 벡터를 공책에 적으세요.</p>
                <button type="button" class="btn lever" data-act="deal" aria-label="벡터 카드 나눠 주기">🃏 나눠 주기</button>
              </div>
            </div>
          </div>
          <aside class="pane side pane-scroll">${guideHtml('all')}</aside>
        </div>`;
      const side = container.querySelector('.side');
      bindGuide(side);
      const main = container.querySelector('[data-el="dealMain"]');
      const dealBtn = container.querySelector('[data-act="deal"]');
      lc.on(dealBtn, 'click', () => {
        const assign = TD.groups.sampleFull(ids, session.sizes, session.apart, session.streams.assign);
        cardOf = TD.groups.dealCards(ids, assign, cards, session.streams.assign);
        groupOf = (id) => assign.get(id);
        session.setAssignment(assign);
        session.setRecord({ cardOf });
        session.progress(ids.length);
        session.audio.allDone();
        const sorted = session.students.slice().sort(TD.exporter.byStudentNo);
        const cols = sorted.length <= 12 ? 1 : sorted.length <= 26 ? 2 : 3;
        const rows = sorted.map((s) => {
          const g = assign.get(s.id);
          const v = vectorOf(g, cardOf.get(s.id));
          return `<div class="deal-row"><span class="d-name" title="${ui.esc(s.nameRaw)}">${ui.esc(s.name)}</span><span class="bundle-pill" style="background:${bundleColor(g)}">${bundleTag(g)}</span><span class="d-vec">${V().formatVector(v)}</span></div>`;
        }).join('');
        main.innerHTML = `<div class="deal-table" style="--dcols:${cols}" role="table" aria-label="이름, 묶음, 벡터">${rows}</div>`;
        ui.announce('벡터 카드를 모두 나눠 주었습니다.');
        setReady(side);
      });
      dealBtn.focus();
    }

    // ---------- 정답 공개 ----------
    function startReveal() {
      const finalAssign = session.run.assign;
      const sorted = session.students.slice().sort(TD.exporter.byStudentNo);
      const teams = session.sizes.map((_, i) => ({ g: i + 1, members: sorted.filter((s) => finalAssign.get(s.id) === i + 1) }));
      const cardFor = (id) => (session.run.cardOf ? session.run.cardOf.get(id) : cardOf.get(id));
      lc.dispose();
      lc = ui.lifecycle();
      container.innerHTML = `
        <div class="slot-stage">
          <div class="slot-grid" data-el="grid"></div>
          <p class="aha" data-el="aha" hidden></p>
          <div class="slot-actions">
            <button type="button" class="btn lever" data-act="next" aria-label="다음 모둠 정답 공개">🎰 다음 모둠 공개</button>
            <button type="button" class="btn btn-ghost" data-act="all" aria-label="남은 모둠 정답 모두 공개">모두 공개</button>
            <button type="button" class="btn btn-go" data-act="result" aria-label="결과 화면 보기" hidden>결과 보기 →</button>
          </div>
        </div>`;
      const nextBtn = container.querySelector('[data-act="next"]');
      const allBtn = container.querySelector('[data-act="all"]');
      const resultBtn = container.querySelector('[data-act="result"]');
      const sizesSet = new Set(session.sizes);
      const word = sizesSet.size === 1 ? (session.sizes[0] === 4 ? '네 벡터' : '세 벡터') : '모둠원 벡터';
      const board = TD.slotBoard(container.querySelector('[data-el="grid"]'), {
        lc, session, teams, spin: false,
        headExtra: (team) => `<span class="bundle-pill bundle-tag" style="background:${bundleColor(team.g)};border:2px solid #fff">${bundleTag(team.g)}</span>`,
        renderOpen(team, body) {
          const vs = team.members.map((s) => vectorOf(team.g, cardFor(s.id)));
          const list = team.members.map((s, k) => `<div><b title="${ui.esc(s.nameRaw)}"><span style="color:${ARROW_COLORS[k % 4]}">●</span> ${ui.esc(s.name)}</b><span>${V().formatVector(vs[k])}</span></div>`).join('');
          body.innerHTML = `<div class="answer-body"><div class="answer-list">${list}</div>${chainSvg(vs, { label: `${team.g}모둠 벡터를 이은 닫힌 다각형` })}<div class="answer-sum">${V().formatSum(vs)}</div></div>`;
          ui.announce(`${team.g}모둠: ${team.members.map((s) => s.name).join(', ')}. ${V().formatSum(vs).replace(/−/g, '마이너스 ')}`);
        },
        onTeamDone() { sync(); },
        onAllDone() {
          nextBtn.disabled = true; allBtn.disabled = true;
          resultBtn.hidden = false;
          const aha = container.querySelector('[data-el="aha"]');
          aha.hidden = false;
          aha.textContent = `${word}의 x성분 합과 y성분 합이 모두 0이면, 이어 그린 길이 출발점으로 돌아옵니다. 구조물 이음점에서 힘이 평형을 이루는 것과 같은 원리입니다.`;
          resultBtn.focus();
        },
      });
      function sync() { nextBtn.disabled = board.busy || board.remaining === 0; allBtn.disabled = board.remaining === 0; }
      lc.on(nextBtn, 'click', () => { if (board.revealNext()) sync(); });
      lc.on(allBtn, 'click', () => { if (board.revealAll()) sync(); });
      lc.on(resultBtn, 'click', () => session.finish());
      lc.on(document, 'keydown', (e) => {
        if (e.key !== ' ' && e.key !== 'Enter') return;
        const tag = (e.target && e.target.tagName) || '';
        if (/^(BUTTON|INPUT|TEXTAREA|SELECT|A|SUMMARY)$/.test(tag) || document.querySelector('dialog[open]')) return;
        e.preventDefault();
        if (board.revealNext()) sync();
      });
      sync();
      nextBtn.focus();
    }

    if (vec.deal === 'all') mountAll(); else mountHidden();
  }

  function unmount() {
    if (lc) lc.dispose();
    lc = null;
  }

  TD.vectorSvg = { vectorGridSvg, chainSvg };
  TD.modeVector = { mount, unmount };
})(window);
