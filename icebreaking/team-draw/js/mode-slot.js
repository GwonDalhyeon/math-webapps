// ③ 한 조씩 공개: 레버를 누를 때마다 다음 모둠 카드가 열리고 슬롯 줄이 하나씩 멈춘다.
// slotBoard는 ④ 정답 공개에서도 쓴다.
(function (root) {
  'use strict';
  const TD = root.TeamDraw = root.TeamDraw || {};
  const { ui } = TD;

  function gridCols(G) { return G <= 4 ? G : G <= 6 ? 3 : 4; }

  // opts: { lc, session, teams:[{g, members}], spin, renderOpen(team, body), headExtra(team), onTeamDone(team), onAllDone() }
  function slotBoard(grid, opts) {
    const { lc, session, teams } = opts;
    const fx = session.streams.fx;
    const reduced = session.reduced;
    grid.style.setProperty('--cols', gridCols(teams.length));
    const unrevealed = new Set(session.students.map((s) => s.id));
    let next = 0;
    let running = 0;
    let finished = false;

    const cards = teams.map((team) => {
      const m = ui.meta(team.g);
      const card = ui.el('div', { class: 'team-card', style: `--gc:${m.color}`, 'data-g': team.g });
      card.innerHTML = `<div class="team-head pat-${Math.min(m.pattern, 2)}">${ui.shapeSvg(team.g, 30, true)}<span>${m.label}</span>${opts.headExtra ? opts.headExtra(team) : ''}</div><div class="team-body covered" aria-label="${m.label} 아직 공개 안 됨"></div>`;
      grid.appendChild(card);
      return card;
    });

    function done(team, card) {
      card.classList.remove('opening');
      team.members.forEach((s) => unrevealed.delete(s.id));
      running--;
      if (opts.onTeamDone) opts.onTeamDone(team);
      if (next >= teams.length && running === 0 && !finished) {
        finished = true;
        if (opts.onAllDone) opts.onAllDone();
      }
    }

    function open(i, totalMs) {
      const team = teams[i];
      const card = cards[i];
      const body = card.querySelector('.team-body');
      body.classList.remove('covered');
      body.removeAttribute('aria-label');
      card.classList.add('opening');
      running++;
      if (!opts.spin) {
        opts.renderOpen(team, body);
        body.animate && !reduced && body.animate([{ transform: 'scale(.85)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 350, easing: 'ease-out' });
        session.audio.groupDone();
        lc.timeout(() => done(team, card), reduced ? 100 : 450);
        return;
      }
      // 슬롯 줄: 모둠 인원만큼, 위에서부터 차례로 멈춘다. 돌아가는 이름은 연출일 뿐 결과와 관계없다.
      const rows = team.members.map(() => {
        const r = ui.el('div', { class: 'slot-row spinning' });
        body.appendChild(r);
        return r;
      });
      const pool = () => {
        const ids = [...unrevealed];
        return ids.length ? session.byId.get(ids[fx.randInt(ids.length)]).name : '';
      };
      const spinTimer = lc.interval(() => {
        rows.forEach((r) => { if (r.classList.contains('spinning')) r.textContent = pool(); });
        session.audio.spin();
      }, 70);
      rows.forEach((r) => { r.textContent = pool(); });
      const step = totalMs / rows.length;
      rows.forEach((r, k) => {
        lc.timeout(() => {
          r.classList.remove('spinning');
          r.classList.add('stopped');
          r.textContent = team.members[k].name;
          r.title = team.members[k].nameRaw;
          session.audio.stop();
          if (k === rows.length - 1) {
            lc.clearInterval(spinTimer);
            session.audio.groupDone();
            done(team, card);
          }
        }, step * (k + 1));
      });
    }

    return {
      revealNext() {
        if (running || next >= teams.length) return false;
        const i = next++;
        const size = teams[i].members.length;
        open(i, reduced ? 500 : Math.min(2000, Math.max(1500, 400 * size)));
        return true;
      },
      revealAll() {
        if (next >= teams.length) return false;
        while (next < teams.length) open(next++, reduced ? 300 : 700);
        return true;
      },
      get busy() { return running > 0; },
      get remaining() { return teams.length - next; },
      get finished() { return finished; },
    };
  }

  function teamsFrom(session, assign) {
    const sorted = session.students.slice().sort(TD.exporter.byStudentNo);
    return session.sizes.map((_, i) => ({ g: i + 1, members: sorted.filter((s) => assign.get(s.id) === i + 1) }));
  }

  let lc = null;

  function mount(container, session) {
    lc = ui.lifecycle();
    const assign = TD.groups.sampleFull(session.students.map((s) => s.id), session.sizes, session.apart, session.streams.assign);
    session.setAssignment(assign);
    container.innerHTML = `
      <div class="slot-stage">
        <div class="slot-grid" id="slotGrid"></div>
        <div class="slot-actions">
          <button type="button" class="btn lever" id="leverBtn" aria-label="레버 당기기: 다음 모둠 공개">🎰 레버 당기기</button>
          <button type="button" class="btn btn-ghost" id="allBtn" aria-label="남은 모둠 모두 공개">모두 공개</button>
          <button type="button" class="btn btn-go" id="slotResultBtn" aria-label="결과 화면 보기" hidden>결과 보기 →</button>
        </div>
        <p class="notice" id="slotNotice">레버를 누르거나 Space·Enter 키를 누르면 다음 모둠이 열립니다.</p>
      </div>`;
    const lever = container.querySelector('#leverBtn');
    const allBtn = container.querySelector('#allBtn');
    const resultBtn = container.querySelector('#slotResultBtn');
    let shown = 0;
    const board = slotBoard(container.querySelector('#slotGrid'), {
      lc, session, teams: teamsFrom(session, assign), spin: true,
      onTeamDone(team) {
        shown += team.members.length;
        session.progress(shown);
        ui.announce(`${team.g}모둠: ${team.members.map((s) => s.name).join(', ')}`);
        sync();
      },
      onAllDone() {
        lever.disabled = true; allBtn.disabled = true;
        resultBtn.hidden = false;
        container.querySelector('#slotNotice').textContent = '모든 모둠이 정해졌습니다. 잠시 뒤 결과 화면으로 넘어갑니다.';
        lc.timeout(() => session.finish(), 1500);
      },
    });
    function sync() {
      lever.disabled = board.busy || board.remaining === 0;
      allBtn.disabled = board.remaining === 0;
    }
    lc.on(lever, 'click', () => { if (board.revealNext()) sync(); });
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
    lever.focus();
  }

  function unmount() {
    if (lc) lc.dispose();
    lc = null;
  }

  TD.slotBoard = slotBoard;
  TD.slotTeams = teamsFrom;
  TD.modeSlot = { mount, unmount };
})(window);
