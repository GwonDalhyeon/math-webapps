// ① 카드 뽑기: 차례 목록 + 뒤집힌 카드 격자 + 모둠 칸. 카드를 누르는 순간 그 학생의 모둠이 정해진다.
// pickTable(차례 목록과 카드 격자)은 ④ 벡터 카드에서도 쓴다.
(function (root) {
  'use strict';
  const TD = root.TeamDraw = root.TeamDraw || {};
  const { ui } = TD;

  // 열 수: 24명 6×4, 20명 5×4, 40명 8×5, 48명 8×6
  function columnsFor(n) { return Math.min(8, Math.max(2, Math.ceil(Math.sqrt(n * 1.25)))); }

  function stageHtml(sideHtml) {
    return `
      <div class="stage stage-3">
        <aside class="pane queue">
          <div class="queue-head">
            <button type="button" class="btn btn-ghost btn-small" data-act="shuffle" aria-label="남은 학생 순서 섞기">🔀 순서 섞기</button>
          </div>
          <div class="queue-list" role="list" aria-label="차례 목록"></div>
        </aside>
        <div class="center">
          <div class="pane center-main">
            <div class="card-grid" role="group" aria-label="카드"></div>
            <div class="reveal-layer"></div>
          </div>
          <div class="center-actions"></div>
        </div>
        <aside class="pane side pane-scroll">${sideHtml}</aside>
      </div>`;
  }

  // 차례 목록과 카드 격자
  // opts: { lc, session, root, onPick(cardIdx, studentId), onDoneChipClick(studentId), doneMark(studentId) }
  function pickTable(rootEl, opts) {
    const { lc, session } = opts;
    const students = session.students;
    const n = students.length;
    const queueEl = rootEl.querySelector('.queue-list');
    const grid = rootEl.querySelector('.card-grid');
    const main = rootEl.querySelector('.center-main');
    let order = students.map((s) => s.id); // 명단 순서
    const drawn = new Set();
    let current = order[0];
    let locked = false;

    const cols = columnsFor(n);
    const rows = Math.ceil(n / cols);
    grid.style.setProperty('--cols', cols);
    function fit() {
      const w = main.clientWidth - 20, h = main.clientHeight - 20;
      if (w <= 0 || h <= 0) return;
      const gap = Math.max(6, Math.min(12, w / cols / 12));
      let cw = (w - gap * (cols - 1)) / cols;
      let ch = cw / 0.72;
      const maxCh = (h - gap * (rows - 1)) / rows;
      if (ch > maxCh) { ch = maxCh; cw = ch * 0.72; }
      grid.style.setProperty('--gap', gap + 'px');
      grid.style.setProperty('--cw', Math.floor(cw) + 'px');
      grid.style.setProperty('--ch', Math.floor(ch) + 'px');
    }
    if (root.ResizeObserver) lc.observe(new ResizeObserver(fit)).observe(main);
    fit();

    const cards = [];
    for (let i = 0; i < n; i++) {
      const c = ui.el('button', { type: 'button', class: 'flip-card', 'aria-label': `카드 ${i + 1}, 뒤집히지 않음`, 'data-i': i });
      c.innerHTML = '<span class="flip-inner"><span class="face back"></span><span class="face front"></span></span>';
      c.style.setProperty('--flip', session.reduced ? '.2s' : '.5s');
      lc.on(c, 'click', () => {
        if (locked || c.classList.contains('up') || c.classList.contains('taken') || current === undefined) return;
        opts.onPick(i, current);
      });
      grid.appendChild(c);
      cards.push(c);
    }

    function renderQueue() {
      queueEl.innerHTML = '';
      for (const id of order) {
        const s = session.byId.get(id);
        const isDone = drawn.has(id);
        const isCur = id === current;
        const chip = ui.el('button', {
          type: 'button', role: 'listitem', class: 'q-chip' + (isDone ? ' done' : '') + (isCur ? ' current' : ''), title: s.nameRaw,
          'aria-label': `${s.name}${isCur ? ', 지금 차례' : ''}${isDone ? ', 뽑음' : ''}`, 'aria-current': isCur ? 'true' : null,
        });
        const mark = isCur ? '👉' : isDone ? (opts.doneMark ? opts.doneMark(id) : '✔') : '';
        chip.innerHTML = `<span class="q-mark" aria-hidden="true">${mark}</span><span class="q-name">${ui.esc(s.name)}</span>`;
        chip.addEventListener('click', () => {
          if (isDone) { if (opts.onDoneChipClick) opts.onDoneChipClick(id); return; }
          current = id;
          renderQueue();
        });
        queueEl.appendChild(chip);
        if (isCur) chip.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    }

    function nextUndrawn() { return order.find((id) => !drawn.has(id)); }

    const api = {
      cards,
      get current() { return current; },
      setCurrent(id) { current = id; renderQueue(); },
      markDrawn(id) { drawn.add(id); if (current === id || drawn.has(current)) current = nextUndrawn(); renderQueue(); },
      unmarkDrawn(id) { drawn.delete(id); renderQueue(); },
      undrawnStudents() { return order.filter((id) => !drawn.has(id)).map((id) => session.byId.get(id)); },
      lock(v) { locked = v; cards.forEach((c) => { c.disabled = v && !c.classList.contains('up'); }); },
      // 남은 학생의 순서를 fx 흐름으로 섞는다. 누가 먼저 뽑든 모둠 확률은 같다.
      shuffleRemaining() {
        const rest = session.streams.fx.shuffle(order.filter((id) => !drawn.has(id)));
        order = [...order.filter((id) => drawn.has(id)), ...rest];
        current = rest[0];
        renderQueue();
      },
      get allDrawn() { return drawn.size === n; },
      main,
      refresh: renderQueue,
    };
    lc.on(rootEl.querySelector('[data-act="shuffle"]'), 'click', () => api.shuffleRemaining());
    renderQueue();
    return api;
  }

  // 카드 자리에서 가운데로 커지는 큰 카드(FLIP)
  function growFrom(cardEl, bigEl, layer, reduced) {
    const from = cardEl.getBoundingClientRect();
    const to = bigEl.getBoundingClientRect();
    if (!from.width || !to.width) return;
    const dx = from.left + from.width / 2 - (to.left + to.width / 2);
    const dy = from.top + from.height / 2 - (to.top + to.height / 2);
    const s = Math.max(0.15, from.width / to.width);
    bigEl.style.setProperty('--grow', reduced ? '.2s' : '.45s');
    bigEl.style.transition = 'none';
    bigEl.style.transform = `translate(${dx}px, ${dy}px) scale(${s})`;
    bigEl.getBoundingClientRect();
    bigEl.style.transition = '';
    bigEl.style.transform = '';
    return { dx, dy, s };
  }
  function shrinkTo(cardEl, bigEl) {
    const from = cardEl.getBoundingClientRect();
    const to = bigEl.getBoundingClientRect();
    if (!from.width || !to.width) return;
    const dx = from.left + from.width / 2 - (to.left + to.width / 2);
    const dy = from.top + from.height / 2 - (to.top + to.height / 2);
    bigEl.style.transform = `translate(${dx}px, ${dy}px) scale(${Math.max(0.15, from.width / to.width)})`;
    bigEl.style.opacity = '0';
  }

  function chooseStudent(students, title) {
    let chosen = null;
    return ui.dialog({
      title,
      body: '<p>실제로 카드를 누른 학생을 고르세요. 바꾼 횟수는 화면과 기록에 남습니다.</p>',
      okLabel: null,
      build(form, api) {
        const wrap = ui.el('div', { class: 'dlg-chips', role: 'group', 'aria-label': '학생 고르기' });
        for (const s of students) {
          const chip = ui.el('button', { type: 'button', class: 'chip', title: s.nameRaw, text: s.name, 'aria-label': `${s.name}(으)로 바꾸기` });
          chip.addEventListener('click', () => { chosen = s.id; api.close(true); });
          wrap.appendChild(chip);
        }
        form.appendChild(wrap);
      },
    }).then((ok) => (ok ? chosen : null));
  }

  // ---------- ① 카드 뽑기 ----------
  let lc = null;

  function mount(container, session) {
    lc = ui.lifecycle();
    container.innerHTML = stageHtml('<div class="board"></div>');
    const ds = TD.groups.createDrawSession({ presentIds: session.students.map((s) => s.id), sizes: session.sizes, apart: session.apart, stream: session.streams.assign });
    session.setRecord({ order: ds.order, fixes: ds.fixes });
    const board = ui.groupBoard(container.querySelector('.board'), session.sizes);
    const layer = container.querySelector('.reveal-layer');
    const actions = container.querySelector('.center-actions');
    actions.innerHTML = `
      <button type="button" class="btn btn-ghost" data-act="fix" hidden aria-label="방금 뒤집은 카드의 주인 바꾸기">카드 주인 바꾸기</button>
      <button type="button" class="btn btn-go" data-act="result" hidden aria-label="결과 화면 보기">결과 보기 →</button>
      <p class="notice" data-act="hint">차례인 학생이 나와 카드를 한 장 고르세요.</p>`;
    const fixBtn = actions.querySelector('[data-act="fix"]');
    const resultBtn = actions.querySelector('[data-act="result"]');
    const hint = actions.querySelector('[data-act="hint"]');
    let lastCard = null; // { i, id }
    const cardOwner = new Map(); // 카드 번호 → 학생 id

    const table = pickTable(container, {
      lc, session,
      doneMark: (id) => ui.meta(ds.groupOf(id)).char,
      onPick(i, id) { flip(i, id); },
    });

    function setFront(i, id) {
      const g = ds.groupOf(id);
      const m = ui.meta(g);
      const s = session.byId.get(id);
      const card = table.cards[i];
      card.style.setProperty('--gc', m.color);
      card.querySelector('.front').innerHTML = `${ui.shapeSvg(g, 40)}<span class="f-num">${m.label}</span><span class="f-name" title="${ui.esc(s.nameRaw)}">${ui.esc(s.name)}</span>`;
      card.setAttribute('aria-label', `카드 ${i + 1}: ${s.name}, ${m.label}`);
    }

    function showBig(i, id, then) {
      const g = ds.groupOf(id);
      const m = ui.meta(g);
      const s = session.byId.get(id);
      layer.innerHTML = '';
      const big = ui.el('div', { class: 'big-card', style: `--gc:${m.color}` }, `${ui.shapeSvg(g, 120)}<div class="big-group">${m.char} ${m.label}</div><div class="big-name">${ui.esc(s.name)}</div>`);
      layer.appendChild(big);
      growFrom(table.cards[i], big, layer, session.reduced);
      lc.timeout(() => {
        shrinkTo(table.cards[i], big);
        lc.timeout(() => { layer.innerHTML = ''; then(); }, session.reduced ? 200 : 380);
      }, 2000);
    }

    function flip(i, id) {
      fixBtn.hidden = true;
      table.lock(true);
      const r = ds.draw(id);
      cardOwner.set(i, id);
      lastCard = { i, id };
      setFront(i, id);
      table.cards[i].classList.add('up');
      session.audio.flip();
      const s = session.byId.get(id);
      board.place(s, r.group);
      table.markDrawn(id);
      session.progress(ds.count);
      ui.announce(`${s.name} → ${r.group}모둠`);
      showBig(i, id, () => afterReveal(r.group));
    }

    function afterReveal(g) {
      if (lc.disposed) return;
      const groupFull = ds.assignment().size && [...ds.assignment().values()].filter((x) => x === g).length === session.sizes[g - 1];
      if (groupFull) session.audio.groupDone();
      table.lock(false);
      if (ds.count === session.students.length) {
        complete();
        return;
      }
      fixBtn.hidden = false;
      hint.textContent = '다른 학생이 카드를 눌렀다면 [카드 주인 바꾸기]로 바로잡으세요.';
    }

    function complete() {
      fixBtn.hidden = true;
      session.setAssignment(ds.assignment());
      resultBtn.hidden = false;
      hint.textContent = '모든 모둠이 정해졌습니다. 잠시 뒤 결과 화면으로 넘어갑니다.';
      table.lock(true);
      lc.timeout(() => session.finish(), 1500);
    }

    lc.on(fixBtn, 'click', async () => {
      if (!lastCard) return;
      const B = lastCard.id;
      const A = await chooseStudent(table.undrawnStudents(), `카드 ${lastCard.i + 1}의 주인 바꾸기 (지금: ${session.byId.get(B).name})`);
      if (A === null || lc.disposed) return;
      const prevG = ds.groupOf(B);
      const r = ds.fixOwner(B, A);
      const sA = session.byId.get(A), sB = session.byId.get(B);
      board.remove(sB);
      board.place(sA, r.group);
      cardOwner.set(lastCard.i, A);
      lastCard = { i: lastCard.i, id: A };
      table.unmarkDrawn(B);
      table.markDrawn(A);
      table.setCurrent(B);
      setFront(lastCard.i, A);
      session.setFixCount(ds.fixes.length);
      ui.announce(`카드 주인을 ${sB.name}에서 ${sA.name}(으)로 바꿨습니다. ${sA.name} → ${r.group}모둠` + (r.transferred ? '' : ` (흩어 놓기 조건 때문에 새로 뽑았습니다. 처음 모둠 ${prevG}모둠)`));
      table.lock(true);
      fixBtn.hidden = true;
      showBig(lastCard.i, A, () => afterReveal(r.group));
    });
    lc.on(resultBtn, 'click', () => session.finish());
  }

  function unmount() {
    if (lc) lc.dispose();
    lc = null;
  }

  TD.pickTable = pickTable;
  TD.cardStageHtml = stageHtml;
  TD.cardGrow = { growFrom, shrinkTo };
  TD.chooseStudent = chooseStudent;
  TD.modeCard = { mount, unmount };
})(window);
