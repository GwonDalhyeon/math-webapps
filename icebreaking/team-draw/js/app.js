// 상태, 화면 전환(setup → drawing(mode) → result), 설정 화면, 결과 화면
(function (root) {
  'use strict';
  const TD = root.TeamDraw;
  const { ui } = TD;
  const $ = (id) => document.getElementById(id);

  const STORAGE_KEY = 'teamDraw.settings.v1';
  const MODES = {
    card: { name: '카드 뽑기', desc: '한 명씩 나와 뒤집힌 카드를 고릅니다', time: '24명 약 3분', module: () => TD.modeCard },
    marble: { name: '구슬 낙하', desc: '이름 구슬이 핀을 지나 모둠 통에 들어갑니다', time: '24명 약 1분', module: () => TD.modeMarble },
    slot: { name: '한 조씩 공개', desc: '레버를 당길 때마다 한 모둠씩 열립니다', time: '24명 약 1분', module: () => TD.modeSlot },
    vector: { name: '벡터 카드', desc: '벡터 합이 (0, 0)인 친구를 찾아 모둠을 만듭니다', time: '24명 약 10분', module: () => TD.modeVector },
  };
  const MODE_ICONS = {
    card: '<svg viewBox="0 0 56 56" aria-hidden="true"><rect x="8" y="14" width="22" height="32" rx="3" fill="#1e3a8a" transform="rotate(-14 19 30)"/><rect x="17" y="11" width="22" height="32" rx="3" fill="#1e40af" transform="rotate(-2 28 27)"/><rect x="27" y="10" width="22" height="32" rx="3" fill="#fff" stroke="#1e3a8a" stroke-width="2" transform="rotate(10 38 26)"/><polygon points="38,18 44,30 32,30" fill="#dc2626" transform="rotate(10 38 26)"/></svg>',
    marble: '<svg viewBox="0 0 56 56" aria-hidden="true"><path d="M8 6 L18 20 M48 6 L38 20" stroke="#64748b" stroke-width="2.5" fill="none"/><g fill="#94a3b8"><circle cx="28" cy="22" r="2"/><circle cx="22" cy="29" r="2"/><circle cx="34" cy="29" r="2"/><circle cx="16" cy="36" r="2"/><circle cx="28" cy="36" r="2"/><circle cx="40" cy="36" r="2"/></g><circle cx="28" cy="13" r="4" fill="#2563eb"/><path d="M8 42 V52 H48 V42 M21 42 V52 M35 42 V52" stroke="#475569" stroke-width="2.5" fill="none"/><circle cx="14" cy="48" r="3.5" fill="#dc2626"/><circle cx="28" cy="48" r="3.5" fill="#16a34a"/><circle cx="42" cy="48" r="3.5" fill="#ea580c"/></svg>',
    slot: '<svg viewBox="0 0 56 56" aria-hidden="true"><rect x="4" y="12" width="40" height="32" rx="6" fill="#1e293b"/><rect x="8" y="17" width="32" height="22" rx="4" fill="#facc15"/><rect x="10" y="19" width="8.5" height="18" rx="2" fill="#fff"/><rect x="19.8" y="19" width="8.5" height="18" rx="2" fill="#fff"/><rect x="29.6" y="19" width="8.5" height="18" rx="2" fill="#fff"/><polygon points="14.2,24 17,31 11.4,31" fill="#dc2626"/><circle cx="24" cy="28" r="3.2" fill="#2563eb"/><rect x="31" y="25" width="6" height="6" fill="#16a34a"/><path d="M46 36 V18" stroke="#334155" stroke-width="3"/><circle cx="46" cy="15" r="4" fill="#dc2626"/></svg>',
    vector: '<svg viewBox="0 0 56 56" aria-hidden="true"><rect x="6" y="6" width="44" height="44" rx="5" fill="#fff" stroke="#94a3b8" stroke-width="2"/><path d="M6 28 H50 M28 6 V50" stroke="#cbd5e1" stroke-width="1.5"/><path d="M16 36 L28 16 L42 30 L30 42 Z" fill="none" stroke="#1e3a8a" stroke-width="0"/><path d="M16 36 L27 18" stroke="#dc2626" stroke-width="3"/><path d="M28 16 L40 28" stroke="#2563eb" stroke-width="3"/><path d="M42 30 L32 40" stroke="#16a34a" stroke-width="3"/><path d="M30 42 L18 37" stroke="#ea580c" stroke-width="3"/></svg>',
  };

  const state = {
    phase: 'setup',
    parsed: { students: [], skippedLines: [], hasStudentNo: false, duplicateNos: [], totalFound: 0 },
    absent: new Set(), // 학생 키(학번 또는 이름)
    apartGroups: [], // 학생 키 배열의 배열
    settings: { basis: 'size', size: 4, count: 6, rem: 'small', mode: 'card', vec: { deal: 'hidden', sec: 5, color: true }, sound: true },
    startCounts: new Map(), // 조합마다 시작 횟수(페이지 메모리에만)
    run: null,
    mounted: null,
    resultLc: null,
  };

  // ---------- 저장(설정만) ----------
  function loadSettings() {
    try {
      const raw = root.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        const t = state.settings;
        if (s.basis === 'size' || s.basis === 'count') t.basis = s.basis;
        if (Number.isInteger(s.size)) t.size = clamp(s.size, 2, 8);
        if (Number.isInteger(s.count)) t.count = clamp(s.count, 2, 20);
        if (s.rem === 'small' || s.rem === 'big') t.rem = s.rem;
        if (MODES[s.mode]) t.mode = s.mode;
        if (s.vec) {
          if (s.vec.deal === 'hidden' || s.vec.deal === 'all') t.vec.deal = s.vec.deal;
          if (Number.isInteger(s.vec.sec)) t.vec.sec = clamp(s.vec.sec, 3, 10);
          if (typeof s.vec.color === 'boolean') t.vec.color = s.vec.color;
        }
        if (typeof s.sound === 'boolean') t.sound = s.sound;
      }
    } catch (e) { /* 저장소를 못 써도 앱은 동작한다. */ }
    // 주소 파라미터로 기본값을 덮어쓴다(이름·학번은 받지 않는다).
    try {
      const p = new URLSearchParams(root.location.search);
      const t = state.settings;
      if (p.has('size')) { t.basis = 'size'; t.size = clamp(parseInt(p.get('size'), 10) || 4, 2, 8); }
      if (p.has('groups')) { t.basis = 'count'; t.count = clamp(parseInt(p.get('groups'), 10) || 6, 2, 20); }
      if (p.get('rem') === 'small' || p.get('rem') === 'big') t.rem = p.get('rem');
      if (MODES[p.get('mode')]) t.mode = p.get('mode');
    } catch (e) { /* 무시 */ }
  }
  function saveSettings() {
    try { root.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.settings)); } catch (e) { /* 무시 */ }
  }

  function clamp(x, lo, hi) { return Math.min(hi, Math.max(lo, x)); }
  const keyOf = (s) => (s.studentNo ? 'n:' + s.studentNo : 'm:' + s.name);

  // ---------- 지금 설정 계산 ----------
  function computeConfig() {
    const t = state.settings;
    const all = state.parsed.students;
    const present = all.filter((s) => !state.absent.has(keyOf(s)));
    const n = present.length;
    const presentIds = present.map((s) => s.id);
    const idByKey = new Map(all.map((s) => [keyOf(s), s.id]));
    const sz = TD.groups.groupSizes({ n, basis: t.basis, size: t.size, count: t.count, rem: t.rem });
    const G = sz.sizes.length;
    const presentSet = new Set(presentIds);
    const apartStatus = state.apartGroups.map((keys) => {
      const ids = keys.map((k) => idByKey.get(k)).filter((id) => id !== undefined && presentSet.has(id));
      let status = 'ok';
      if (ids.length < 2) status = 'void';
      else if (G && ids.length > G) status = 'bad';
      return { keys, ids, status };
    });
    const apart = apartStatus.filter((a) => a.status !== 'void').map((a) => a.ids);
    const blockers = [];
    if (!all.length) blockers.push('명단을 붙여넣어 주세요.');
    else if (n < 2) blockers.push('참여 학생이 2명 이상이어야 합니다. 결석 표시를 풀어 주세요.');
    if (state.parsed.duplicateNos.length) blockers.push(`학번 ${state.parsed.duplicateNos.join(', ')}이(가) 두 번 이상 나옵니다. 명단을 고쳐 주세요.`);
    if (n >= 2) sz.errors.forEach((e) => blockers.push(e));
    if (apartStatus.some((a) => a.status === 'bad')) blockers.push('흩어 놓을 묶음의 인원이 모둠 수보다 많습니다. 묶음을 줄이거나 모둠 수를 늘려 주세요.');
    const modeReasons = {};
    for (const m of Object.keys(MODES)) modeReasons[m] = modeReason(m, n, sz.sizes, t.vec.color);
    if (n >= 2 && !sz.errors.length && modeReasons[t.mode]) blockers.push(modeReasons[t.mode] + ' 다른 방식을 고르세요.');
    return { n, present, presentIds, sizes: sz.sizes, G, sizeInfo: sz, apart, apartStatus, blockers, modeReasons, mode: t.mode };
  }

  function modeReason(mode, n, sizes, colorOn) {
    const G = sizes.length;
    if (!n || !G) return '';
    if (mode === 'card') {
      if (n > 48) return '카드 뽑기는 2~48명에서만 쓸 수 있습니다.';
      if (G > 20) return '카드 뽑기는 2~20모둠에서만 쓸 수 있습니다.';
    } else if (mode === 'marble') {
      if (G > 10) return '구슬 낙하는 2~10모둠에서만 쓸 수 있습니다.';
    } else if (mode === 'slot') {
      if (G > 12) return '한 조씩 공개는 2~12모둠에서만 쓸 수 있습니다.';
    } else if (mode === 'vector') {
      return TD.vectors.availability(sizes, colorOn);
    }
    return '';
  }

  // ---------- 설정 화면 ----------
  function renderSetup() {
    const t = state.settings;
    const p = state.parsed;
    const cfg = computeConfig();

    // 해석 결과 한 줄
    const line = $('parseLine');
    if (!p.students.length) {
      line.textContent = $('rosterInput').value.trim() ? '학생을 읽지 못했습니다. 한 줄에 한 명씩 학번과 이름, 또는 이름만 적어 주세요.' : '명단을 붙여넣으면 바로 읽습니다. 입력한 명단은 이 브라우저 밖으로 나가지 않고 저장되지도 않습니다.';
      line.classList.toggle('bad', !!$('rosterInput').value.trim());
    } else {
      const parts = [`학생 ${p.students.length}명을 읽었습니다`];
      parts.push(p.hasStudentNo ? '학번 있음' : '이름만');
      if (p.skippedLines.length) parts.push(`건너뛴 줄 ${p.skippedLines.length}개`);
      let text = parts.join(' · ');
      if (p.totalFound > p.students.length) text += ` · ${p.totalFound}명 가운데 앞의 ${p.students.length}명만 읽었습니다`;
      if (p.duplicateNos.length) text += ` · 겹친 학번 ${p.duplicateNos.join(', ')}`;
      line.textContent = text;
      line.classList.toggle('bad', p.duplicateNos.length > 0);
    }
    $('skippedDetails').hidden = !p.skippedLines.length;
    $('skippedList').textContent = p.skippedLines.length ? `${p.skippedLines.join(', ')}번째 줄을 건너뛰었습니다. 학번이나 이름을 확인해 주세요.` : '';

    // 학생 칩
    const list = $('chipList');
    list.innerHTML = '';
    for (const s of p.students) {
      const absent = state.absent.has(keyOf(s));
      const chip = ui.el('button', {
        type: 'button', class: 'chip' + (absent ? ' absent' : ''), title: s.nameRaw + (s.studentNo ? ` (${s.studentNo})` : ''),
        'aria-pressed': absent ? 'true' : 'false', 'aria-label': `${s.name} ${absent ? '결석, 누르면 참여' : '참여, 누르면 결석'}`,
      });
      chip.textContent = s.name;
      chip.addEventListener('click', () => {
        const k = keyOf(s);
        if (state.absent.has(k)) state.absent.delete(k); else state.absent.add(k);
        renderSetup();
        const again = $('chipList').children[p.students.indexOf(s)];
        if (again) again.focus();
      });
      list.appendChild(chip);
    }
    $('presentCount').textContent = `참여 ${cfg.n}명 / 전체 ${p.students.length}명`;
    $('allPresentBtn').disabled = !state.absent.size;

    // 기준과 숫자
    $('basisSize').setAttribute('aria-pressed', String(t.basis === 'size'));
    $('basisCount').setAttribute('aria-pressed', String(t.basis === 'count'));
    const num = t.basis === 'size' ? t.size : t.count;
    if (document.activeElement !== $('numInput')) $('numInput').value = num;
    $('numUnit').textContent = t.basis === 'size' ? '명씩' : '모둠';
    $('numMinus').disabled = num <= 2;
    $('numPlus').disabled = num >= (t.basis === 'size' ? 8 : 20);

    // 남는 학생
    const showRem = t.basis === 'size' && cfg.n >= 2 && cfg.n % t.size !== 0;
    $('remRow').hidden = !showRem;
    if (showRem) {
      const small = TD.groups.groupSizes({ n: cfg.n, basis: 'size', size: t.size, rem: 'small' });
      const big = TD.groups.groupSizes({ n: cfg.n, basis: 'size', size: t.size, rem: 'big' });
      $('remSmallText').textContent = small.errors.length ? '만들 수 없음' : small.text;
      $('remBigText').textContent = big.errors.length ? '만들 수 없음' : big.text;
      $('remSmall').setAttribute('aria-pressed', String(t.rem === 'small'));
      $('remBig').setAttribute('aria-pressed', String(t.rem === 'big'));
    }

    // 미리 보기
    const pv = $('preview');
    pv.innerHTML = '';
    cfg.sizes.forEach((size, i) => {
      const g = i + 1;
      const box = ui.el('div', { class: 'pv-group' }, `${ui.shapeSvg(g, 22)}<span class="pv-num">${g}</span><span class="pv-dots">${'<i></i>'.repeat(size)}</span>`);
      pv.appendChild(box);
    });
    const hasErr = cfg.n >= 2 && cfg.sizeInfo.errors.length > 0;
    pv.classList.toggle('bad', hasErr || cfg.sizeInfo.warnings.length > 0);
    $('previewText').textContent = cfg.n >= 2 && cfg.sizes.length ? `${cfg.n}명 → ${cfg.sizeInfo.text}` : '';
    $('warnText').textContent = cfg.n >= 2 ? [...cfg.sizeInfo.errors, ...cfg.sizeInfo.warnings].join(' ') : '';

    // 흩어 놓기 묶음
    const al = $('apartList');
    al.innerHTML = '';
    const nameOfKey = new Map(p.students.map((s) => [keyOf(s), s.name]));
    cfg.apartStatus.forEach((a, i) => {
      const names = a.keys.map((k) => nameOfKey.get(k) || '(명단에 없음)').join(', ');
      const why = a.status === 'bad' ? `참여 ${a.ids.length}명이 모둠 수(${cfg.G}개)보다 많아 지킬 수 없습니다. 시작이 막힙니다.` : a.status === 'void' ? '참여 학생이 1명 이하라 효력이 없습니다.' : `참여 ${a.ids.length}명 → 서로 다른 모둠`;
      const item = ui.el('div', { class: 'apart-item' + (a.status === 'bad' ? ' bad' : a.status === 'void' ? ' void' : '') },
        `<div class="names"><b>묶음 ${i + 1}</b> ${ui.esc(names)}<br><span class="why">${why}</span></div>`);
      const del = ui.el('button', { type: 'button', class: 'btn btn-ghost btn-small', 'aria-label': `묶음 ${i + 1} 지우기`, text: '지우기' });
      del.addEventListener('click', () => { state.apartGroups.splice(i, 1); renderSetup(); });
      item.appendChild(del);
      al.appendChild(item);
    });
    const effective = cfg.apartStatus.filter((a) => a.status === 'ok').length;
    $('apartCount').textContent = state.apartGroups.length ? `(묶음 ${state.apartGroups.length}개 · 적용 ${effective}개)` : '';
    $('addApartBtn').disabled = cfg.n < 2;
    if (cfg.apartStatus.some((a) => a.status === 'bad')) $('apartDetails').open = true;

    // 방식 타일
    const tiles = $('modeTiles');
    tiles.innerHTML = '';
    for (const [m, info] of Object.entries(MODES)) {
      const reason = cfg.modeReasons[m];
      const tile = ui.el('button', {
        type: 'button', class: 'tile' + (reason ? ' unavailable' : ''), 'aria-pressed': String(t.mode === m),
        'aria-label': `${info.name}: ${reason || info.desc}`,
      }, `${MODE_ICONS[m]}<b>${info.name}</b><span class="desc">${ui.esc(reason || info.desc)}</span><span class="time">${info.time}</span>`);
      tile.addEventListener('click', () => { t.mode = m; saveSettings(); renderSetup(); });
      tiles.appendChild(tile);
    }

    // ④ 설정
    $('vecOptions').hidden = t.mode !== 'vector';
    $('dealHidden').setAttribute('aria-pressed', String(t.vec.deal === 'hidden'));
    $('dealAll').setAttribute('aria-pressed', String(t.vec.deal === 'all'));
    if (document.activeElement !== $('secInput')) $('secInput').value = t.vec.sec;
    $('secMinus').disabled = t.vec.sec <= 3;
    $('secPlus').disabled = t.vec.sec >= 10;
    $('colorToggle').checked = t.vec.color;
    $('colorText').textContent = t.vec.color ? '켜기 (최대 3모둠씩 같은 색에서 찾기)' : '끄기 (전체에서 찾기 · 어려움 · 성분 −10~10)';

    // 시작
    $('startBtn').disabled = cfg.blockers.length > 0;
    $('startReason').textContent = cfg.blockers.length ? cfg.blockers[0] : '';
  }

  let parseTimer = 0;
  function onRosterInput() {
    root.clearTimeout(parseTimer);
    parseTimer = root.setTimeout(() => {
      state.parsed = TD.roster.parseRoster($('rosterInput').value);
      // 명단에 없는 학생의 결석 표시는 지운다.
      const keys = new Set(state.parsed.students.map(keyOf));
      for (const k of [...state.absent]) if (!keys.has(k)) state.absent.delete(k);
      renderSetup();
    }, 300);
  }

  function setNumber(v) {
    const t = state.settings;
    const lo = 2, hi = t.basis === 'size' ? 8 : 20;
    const x = clamp(Math.round(Number(v)) || (t.basis === 'size' ? t.size : t.count), lo, hi);
    if (t.basis === 'size') t.size = x; else t.count = x;
    saveSettings();
    renderSetup();
  }

  async function addApartGroup() {
    const cfg = computeConfig();
    const picked = new Set();
    const ok = await ui.dialog({
      title: '흩어 놓을 학생 고르기',
      body: `<p>서로 다른 모둠에 넣을 학생을 2명 이상 고르세요. 지금 모둠 수는 ${cfg.G}개라서 최대 ${cfg.G}명까지 고를 수 있습니다.</p>`,
      okLabel: '저장',
      build(form, api) {
        const wrap = ui.el('div', { class: 'dlg-chips', role: 'group', 'aria-label': '학생 고르기' });
        const msg = ui.el('p', { class: 'warn-text', role: 'status' });
        const update = () => {
          const ok = form.querySelector('button[type=submit]');
          let reason = '';
          if (picked.size < 2) reason = '2명 이상 골라야 저장할 수 있습니다.';
          else if (picked.size > cfg.G) reason = `모둠이 ${cfg.G}개라서 ${picked.size}명을 모두 다른 모둠에 넣을 수 없습니다. ${cfg.G}명 이하로 골라 주세요.`;
          msg.textContent = reason || `${picked.size}명을 골랐습니다.`;
          msg.style.color = reason ? '' : 'var(--ok)';
          if (ok) ok.disabled = !!reason;
        };
        for (const s of cfg.present) {
          const chip = ui.el('button', { type: 'button', class: 'chip', 'aria-pressed': 'false', title: s.nameRaw, text: s.name });
          chip.addEventListener('click', () => {
            const k = keyOf(s);
            if (picked.has(k)) picked.delete(k); else picked.add(k);
            chip.classList.toggle('picked', picked.has(k));
            chip.setAttribute('aria-pressed', String(picked.has(k)));
            update();
          });
          wrap.appendChild(chip);
        }
        form.appendChild(wrap);
        form.appendChild(msg);
        api.onSubmit = () => (picked.size >= 2 && picked.size <= cfg.G ? true : undefined);
        root.setTimeout(update, 0);
      },
    });
    if (ok) { state.apartGroups.push([...picked]); $('apartDetails').open = true; renderSetup(); }
  }

  // ---------- 진행 ----------
  function comboKey(cfg) {
    const present = cfg.present.map(keyOf).sort();
    const idToKey = new Map(cfg.present.map((s) => [s.id, keyOf(s)]));
    const apart = cfg.apart.map((g) => g.map((id) => idToKey.get(id)).sort().join('|')).sort();
    return JSON.stringify([present, cfg.sizes, apart]);
  }

  function showView(name) {
    $('setupView').hidden = name !== 'setup';
    $('drawView').hidden = name !== 'draw';
    $('resultView').hidden = name !== 'result';
    $('runStatus').hidden = name !== 'draw';
    $('redrawBtn').hidden = name !== 'draw';
    $('toSetupBtn').hidden = name !== 'draw';
    $('fingerprint').hidden = name === 'setup';
    state.phase = name;
    document.body.classList.toggle('phase-draw', name === 'draw');
    if (name === 'draw' && state.settings.sound) TD.audio.startMusic(); else TD.audio.stopMusic();
    root.scrollTo(0, 0);
  }

  function unmountMode() {
    if (state.mounted) { try { state.mounted.unmount(); } catch (e) { console.error(e); } state.mounted = null; }
    $('modeRoot').innerHTML = '';
  }
  function disposeResult() {
    if (state.resultLc) { state.resultLc.dispose(); state.resultLc = null; }
    document.querySelectorAll('canvas.confetti').forEach((c) => c.remove());
  }

  function askNumber(fp) {
    let value = null;
    return ui.dialog({
      title: '학생 숫자 섞기',
      body: `<p>추첨 지문을 먼저 확인하세요.</p><p class="fingerprint dlg-fp">🎲 <b>${fp}</b></p><p>학생이 외친 숫자(0~9999)를 입력하세요. 이 숫자가 시드에 섞입니다.</p>`,
      okLabel: '이 숫자로 시작',
      cancelLabel: '설정으로',
      build(form, api) {
        const input = ui.el('input', { class: 'big-input', type: 'text', inputmode: 'numeric', 'aria-label': '학생 숫자', autofocus: true, maxlength: '4' });
        const msg = ui.el('p', { class: 'warn-text', role: 'status' });
        form.appendChild(input);
        form.appendChild(msg);
        api.onSubmit = () => {
          const v = input.value.trim();
          if (!/^\d{1,4}$/.test(v)) { msg.textContent = '0부터 9999까지의 숫자를 입력해 주세요.'; input.focus(); return undefined; }
          value = String(parseInt(v, 10));
          return true;
        };
      },
    }).then((ok) => (ok ? value : false));
  }

  async function startRun() {
    const cfg = computeConfig();
    if (cfg.blockers.length) return;
    // 실행 가능성 확인: 조건을 지키는 편성이 20000회 안에 나오는지 본다(결과와 상관없는 별도 시드).
    const probe = TD.random.createSession(TD.random.makeSeed(), null).assign;
    if (!TD.groups.sampleFull(cfg.presentIds, cfg.sizes, cfg.apart, probe)) {
      $('startReason').textContent = '흩어 놓을 조건을 만족하는 편성을 찾지 못했습니다. 묶음을 줄이거나 모둠 수를 늘려 주세요.';
      return;
    }
    const key = comboKey(cfg);
    const count = (state.startCounts.get(key) || 0) + 1;
    state.startCounts.set(key, count);
    if (state.settings.sound) TD.audio.unlock();
    disposeResult();
    unmountMode();

    const seed = TD.random.makeSeed();
    const fp = TD.random.fingerprint(seed);
    $('fingerprintText').textContent = fp;
    const t = state.settings;
    const run = {
      cfg, seed, fp, u: null, mode: t.mode, redraws: count - 1, fixCount: 0,
      vec: t.mode === 'vector' ? { color: t.vec.color, R: t.vec.color ? 5 : 10, deal: t.vec.deal, sec: t.vec.sec } : null,
      assign: new Map(), order: null, fixes: null, deck: null, cardOf: null, finished: false,
    };
    state.run = run;
    showView('draw');
    updateStatus(0);
    $('modeRoot').innerHTML = `<div class="pane" style="padding:40px;text-align:center"><p class="notice" style="font-size:22px">추첨 지문 <b>${fp}</b>을 공개했습니다.</p></div>`;
    ui.announce(`추첨 지문 ${fp}`);

    if ($('mixNumber').checked) {
      const u = await askNumber(fp);
      if (state.run !== run) return;
      if (u === false) { goSetup(true); return; }
      run.u = u;
    }
    run.streams = TD.random.createSession(seed, run.u);

    if (run.mode === 'vector') {
      $('modeRoot').innerHTML = `<div class="pane" style="padding:40px;text-align:center"><p class="notice" style="font-size:22px">벡터 카드를 만드는 중…</p></div>`;
      await new Promise((r) => root.setTimeout(r, 40));
      if (state.run !== run) return;
      run.deck = TD.vectors.generateDeck({ sizes: cfg.sizes, colorOn: run.vec.color, R0: run.vec.R, stream: run.streams.vector });
      if (!run.deck || TD.vectors.checkDeck(run.deck, cfg.sizes).length) {
        goSetup(true);
        $('startReason').textContent = '벡터 카드 세트를 만들지 못했습니다. 같은 색 묶음을 켜거나, 다른 방식을 골라 주세요.';
        return;
      }
      run.vec.Rused = run.deck.R;
    }
    mountMode(run);
  }

  function makeSession(run) {
    const cfg = run.cfg;
    const byId = new Map(cfg.present.map((s) => [s.id, s]));
    return {
      run,
      students: cfg.present,
      byId,
      sizes: cfg.sizes,
      G: cfg.G,
      apart: cfg.apart,
      streams: run.streams,
      deck: run.deck,
      vec: run.vec,
      hasStudentNo: state.parsed.hasStudentNo,
      reduced: ui.reducedMotion(),
      audio: TD.audio,
      progress(k) { updateStatus(k); },
      setFixCount(nf) { run.fixCount = nf; updateStatus(); },
      setRecord({ order, fixes, cardOf }) { if (order) run.order = order; if (fixes) run.fixes = fixes; if (cardOf) run.cardOf = cardOf; },
      setAssignment(assign) { run.assign = new Map(assign); },
      finish() { if (state.run === run && state.phase === 'draw') showResult(); },
    };
  }

  function mountMode(run) {
    const mod = MODES[run.mode].module();
    const container = $('modeRoot');
    container.innerHTML = '';
    state.mounted = mod;
    mod.mount(container, makeSession(run));
  }

  function updateStatus(k) {
    const run = state.run;
    if (!run) return;
    if (k !== undefined) run.done = k;
    const n = run.cfg.n;
    const done = run.done || 0;
    $('progressFill').style.width = `${(100 * done) / n}%`;
    $('progressBar').setAttribute('aria-valuemax', String(n));
    $('progressBar').setAttribute('aria-valuenow', String(done));
    $('progressText').textContent = `완료 ${done} / ${n}명`;
    $('redrawText').textContent = `다시 뽑기 ${run.redraws}회`;
    $('fixText').hidden = !run.fixCount;
    $('fixText').textContent = `카드 주인 바꾸기 ${run.fixCount}회`;
    $('condText').hidden = !run.cfg.apart.length;
    $('condText').textContent = `조건 ${run.cfg.apart.length}개 적용`;
  }

  async function redraw() {
    const ok = await ui.confirm('새 시드로 처음부터 다시 뽑을까요? 다시 뽑은 횟수는 화면과 기록에 남습니다.', '다시 뽑기', true);
    if (ok) startRun();
  }

  async function goSetup(skipConfirm) {
    if (!skipConfirm && state.phase === 'draw' && state.run && !state.run.finished) {
      const ok = await ui.confirm('진행 중인 추첨을 멈추고 설정으로 갈까요? 명단과 설정은 그대로 남습니다.', '설정으로');
      if (!ok) return;
    }
    unmountMode();
    disposeResult();
    state.run = null;
    showView('setup');
    renderSetup();
  }

  // ---------- 결과 ----------
  function showResult() {
    const run = state.run;
    run.finished = true;
    unmountMode();
    showView('result');
    if (state.settings.sound) TD.audio.allDone();
    const cfg = run.cfg;
    const G = cfg.G;
    const teams = $('resultTeams');
    teams.innerHTML = '';
    const cols = G <= 3 ? G : G <= 6 ? 3 : G <= 12 ? 4 : 5;
    teams.style.setProperty('--cols', cols);
    teams.style.setProperty('--pcols', G <= 6 ? 3 : G <= 12 ? 4 : 5);
    teams.classList.toggle('small', G > 12);
    const sorted = cfg.present.slice().sort(TD.exporter.byStudentNo);
    for (let g = 1; g <= G; g++) {
      const m = ui.meta(g);
      const card = ui.el('div', { class: 'team-card', style: `--gc:${m.color}` });
      const members = sorted.filter((s) => run.assign.get(s.id) === g);
      card.innerHTML = `<div class="team-head pat-${Math.min(m.pattern, 2)}">${ui.shapeSvg(g, 30, true)}<span>${m.label}</span><span style="font-size:16px;font-weight:700">${members.length}명</span></div>`;
      const body = ui.el('div', { class: 'result-team-body' });
      members.forEach((s) => body.appendChild(ui.nameChip(s)));
      card.appendChild(body);
      teams.appendChild(card);
    }
    const hasNo = state.parsed.hasStudentNo;
    $('copyNoBtn').hidden = !hasNo;
    $('copyNameBtn').hidden = hasNo;
    $('fiveDigitNote').hidden = !(hasNo && cfg.present.some((s) => s.studentNo && s.studentNo.length !== 4));

    const seedHex = TD.random.toHex(run.seed);
    const check = TD.random.fingerprint(TD.random.fromHex(seedHex));
    const okFp = check === run.fp;
    $('verifyText').textContent = okFp ? `✔ 지문 확인: 시드의 SHA-256 앞 8자리가 ${run.fp}와 같습니다.` : '✖ 지문이 시드와 맞지 않습니다.';
    $('verifyText').classList.toggle('bad', !okFp);
    $('resFingerprint').textContent = run.fp;
    $('resSeed').textContent = seedHex;
    $('resU').textContent = run.u !== null ? `학생 숫자 ${run.u}` : '학생 숫자 없음';
    $('resCounts').textContent = `${MODES[run.mode].name} · ${cfg.n}명 · 다시 뽑기 ${run.redraws}회` + (run.fixCount ? ` · 카드 주인 바꾸기 ${run.fixCount}회` : '') + (cfg.apart.length ? ` · 조건 ${cfg.apart.length}개` : '');
    $('printMeta').textContent = `모둠 뽑기 · ${new Date().toLocaleString('ko-KR')} · ${cfg.n}명 ${cfg.sizeInfo.text} · 지문 ${run.fp} · 시드 ${seedHex}` + (run.u !== null ? ` · 학생 숫자 ${run.u}` : '') + ` · 다시 뽑기 ${run.redraws}회`;
    ui.announce(`모둠이 모두 정해졌습니다. ${cfg.n}명, ${G}모둠.`);
    confetti(run);
  }

  function confetti(run) {
    if (ui.reducedMotion()) return;
    const lc = state.resultLc = ui.lifecycle();
    const canvas = ui.el('canvas', { class: 'confetti', 'aria-hidden': 'true' });
    document.body.appendChild(canvas);
    const dpr = root.devicePixelRatio || 1;
    const W = root.innerWidth, H = root.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    const fx = run.streams.fx;
    const colors = ['#fde68a', '#93c5fd', '#86efac', '#f9a8d4', '#c4b5fd', '#fdba74'];
    const parts = Array.from({ length: 70 }, () => ({
      x: fx.float() * W, y: -20 - fx.float() * H * 0.4, vx: (fx.float() - 0.5) * 60, vy: 60 + fx.float() * 90,
      r: fx.float() * Math.PI, vr: (fx.float() - 0.5) * 6, c: colors[fx.randInt(colors.length)], w: 6 + fx.float() * 5,
    }));
    let last = null, elapsed = 0;
    const step = (t) => {
      if (last === null) last = t;
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t; elapsed += dt;
      ctx.clearRect(0, 0, W, H);
      ctx.globalAlpha = elapsed > 2 ? Math.max(0, 1 - (elapsed - 2) / 0.6) : 0.85;
      for (const p of parts) {
        p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -2, p.w, 4); ctx.restore();
      }
      if (elapsed < 2.6) lc.frame(step); else canvas.remove();
    };
    lc.frame(step);
  }

  function resultTextFor(kind) {
    const run = state.run;
    const students = run.cfg.present;
    if (kind === 'no') return TD.exporter.groupPasteText(students, run.assign);
    if (kind === 'name') return TD.exporter.namePasteText(students, run.assign);
    return TD.exporter.recordJson({
      n: state.parsed.students.length, present: run.cfg.presentIds, sizes: run.cfg.sizes, apart: run.cfg.apart,
      mode: run.mode, vec: run.vec ? { color: run.vec.color, R: run.vec.R, Rused: run.vec.Rused, deal: run.vec.deal } : undefined,
      seed: TD.random.toHex(run.seed), u: run.u, order: run.order, fixes: run.fixes, redraws: run.redraws,
    });
  }

  async function copyText(text, label) {
    try {
      if (!navigator.clipboard || !root.isSecureContext) throw new Error('clipboard');
      await navigator.clipboard.writeText(text);
      ui.announce(`${label}를 복사했습니다.`);
      await ui.dialog({ title: `${label}를 복사했습니다.`, body: '<p>필요한 곳에 붙여넣으세요.</p>', okLabel: '닫기', cancelLabel: null });
    } catch (e) {
      const mac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
      await ui.dialog({
        title: `${label}: 직접 복사하세요`,
        body: `<p>이 화면에서는 자동 복사를 쓸 수 없습니다. 글상자가 모두 선택되어 있으니 ${mac ? '⌘C' : 'Ctrl+C'}로 복사하세요.</p>`,
        okLabel: '닫기', cancelLabel: null,
        build(form) {
          const ta = ui.el('textarea', { class: 'dlg-copy', readonly: true, 'aria-label': label });
          ta.value = text;
          form.appendChild(ta);
          root.setTimeout(() => { ta.focus(); ta.select(); }, 30);
        },
      });
    }
  }

  function saveCsv() {
    const run = state.run;
    const text = TD.exporter.csvText(run.cfg.present, run.assign);
    const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = ui.el('a', { href: url, download: TD.exporter.csvFileName(new Date()) });
    document.body.appendChild(a);
    a.click();
    a.remove();
    root.setTimeout(() => URL.revokeObjectURL(url), 2000);
    ui.announce('CSV 파일을 저장했습니다.');
  }

  // ---------- 소리 ----------
  function renderSound() {
    const on = state.settings.sound;
    $('soundBtn').textContent = on ? '소리 끄기' : '소리 켜기';
    $('soundBtn').setAttribute('aria-pressed', String(on));
    $('soundBtn').setAttribute('aria-label', on ? '소리 끄기' : '소리 켜기');
  }

  // ---------- 연결 ----------
  function bind() {
    $('rosterInput').addEventListener('input', onRosterInput);
    $('allPresentBtn').addEventListener('click', () => { state.absent.clear(); renderSetup(); });
    $('basisSize').addEventListener('click', () => { state.settings.basis = 'size'; saveSettings(); renderSetup(); });
    $('basisCount').addEventListener('click', () => { state.settings.basis = 'count'; saveSettings(); renderSetup(); });
    $('numMinus').addEventListener('click', () => setNumber((state.settings.basis === 'size' ? state.settings.size : state.settings.count) - 1));
    $('numPlus').addEventListener('click', () => setNumber((state.settings.basis === 'size' ? state.settings.size : state.settings.count) + 1));
    $('numInput').addEventListener('change', (e) => setNumber(e.target.value));
    $('numInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); setNumber(e.target.value); } });
    $('remSmall').addEventListener('click', () => { state.settings.rem = 'small'; saveSettings(); renderSetup(); });
    $('remBig').addEventListener('click', () => { state.settings.rem = 'big'; saveSettings(); renderSetup(); });
    $('addApartBtn').addEventListener('click', addApartGroup);
    $('dealHidden').addEventListener('click', () => { state.settings.vec.deal = 'hidden'; saveSettings(); renderSetup(); });
    $('dealAll').addEventListener('click', () => { state.settings.vec.deal = 'all'; saveSettings(); renderSetup(); });
    const setSec = (v) => { state.settings.vec.sec = clamp(Math.round(Number(v)) || 5, 3, 10); saveSettings(); renderSetup(); };
    $('secMinus').addEventListener('click', () => setSec(state.settings.vec.sec - 1));
    $('secPlus').addEventListener('click', () => setSec(state.settings.vec.sec + 1));
    $('secInput').addEventListener('change', (e) => setSec(e.target.value));
    $('colorToggle').addEventListener('change', (e) => { state.settings.vec.color = e.target.checked; saveSettings(); renderSetup(); });
    $('startBtn').addEventListener('click', startRun);
    $('redrawBtn').addEventListener('click', redraw);
    $('toSetupBtn').addEventListener('click', () => goSetup(false));
    $('resToSetupBtn').addEventListener('click', () => goSetup(true));
    $('resRedrawBtn').addEventListener('click', redraw);
    $('copyNoBtn').addEventListener('click', () => copyText(resultTextFor('no'), '학번·모둠'));
    $('copyNameBtn').addEventListener('click', () => copyText(resultTextFor('name'), '이름·모둠'));
    $('recordBtn').addEventListener('click', () => copyText(resultTextFor('record'), '추첨 기록'));
    $('csvBtn').addEventListener('click', saveCsv);
    $('printBtn').addEventListener('click', () => root.print());
    $('soundBtn').addEventListener('click', () => {
      state.settings.sound = !state.settings.sound;
      TD.audio.setEnabled(state.settings.sound, true);
      if (state.settings.sound && state.phase === 'draw') TD.audio.startMusic();
      saveSettings();
      renderSound();
    });
    root.addEventListener('beforeunload', (e) => {
      if (state.phase === 'draw' && state.run && !state.run.finished) { e.preventDefault(); e.returnValue = ''; }
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) TD.audio.stopMusic();
      else if (state.phase === 'draw' && state.settings.sound) TD.audio.startMusic();
    });
  }

  loadSettings();
  TD.audio.setEnabled(state.settings.sound);
  bind();
  renderSound();
  state.parsed = TD.roster.parseRoster($('rosterInput').value);
  renderSetup();

  // 검증용(콘솔): 현재 상태와 열려 있는 타이머 수
  TD.app = { state, computeConfig, active: ui.active };
})(window);
