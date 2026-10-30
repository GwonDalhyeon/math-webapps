/* 공용 그림 부품: <div class="part fig" data-fig="이름"> 하나가 window.FIGS[이름] 정의 하나를 그린다.
   정의 = { canvases, controls, init, tick, step, draw, readout, rotate, onclick, frag, speed, tmax, pauseAt, stepDt, atEnd }
   - atEnd(st): tick으로 움직이는 그림의 끝 조건. 끝에서 재생을 누르면 처음부터 끝까지 한 번 더(반복 재생은 하지 않는다)
   - canvases: [{h, flex}] 캔버스들을 가로로 놓는다(stack: true면 세로).
   - controls: 'play' | 'step' | 'reset' | {range} | {check} | {buttons} | {button}
   - 상태 st: { t, playing, played, v(조작 값), az, el, frag(보이는 fragment 수) }
   재생 화면에는 지금 순간만 그린다(명세 2-2의 8). 화면을 떠나면 멈춘다. */
(function () {
  const FIGS = (window.FIGS = window.FIGS || {});
  const insts = [];
  const isSpeaker = () => window.DECK && window.DECK.speaker && window.DECK.speaker();

  function build(el) {
    const def = FIGS[el.dataset.fig];
    if (!def) throw new Error('그림 정의 없음: ' + el.dataset.fig);
    const st = { el, def, t: 0, playing: false, played: false, v: {}, az: def.az, el3: def.el, frag: 0, raf: 0, last: 0, cv: [] };
    const fb = el.querySelector('img.fallback');
    const row = document.createElement('div');
    row.className = 'fg-row' + (def.stack ? ' fg-stack' : '');
    const specs = def.canvases || [{ h: 360 }];
    specs.forEach((s) => {
      const c = document.createElement('canvas');
      c.style.height = (s.h || 360) + 'px';
      if (s.flex) c.style.flex = s.flex;
      if (s.w) { c.style.flex = 'none'; c.style.width = s.w + 'px'; }
      row.appendChild(c); st.cv.push(c);
    });
    // 같은 조작 막대를 공유하는 두 캔버스 사이에 단계 공개 HTML을 둔다.
    if (def.middle) {
      const middle = el.querySelector(def.middle);
      if (middle) row.insertBefore(middle, st.cv[1]);
    }
    el.insertBefore(row, fb || null);

    const ctl = def.controls || [];
    if (ctl.length || def.readout) {
      const bar = document.createElement('div'); bar.className = 'bar';
      ctl.forEach((c) => {
        if (c === 'play') bar.insertAdjacentHTML('beforeend', '<button class="go" data-a="play">▶ 재생</button>');
        else if (c === 'step') bar.insertAdjacentHTML('beforeend', `<button data-a="step">${def.stepLabel || '한 걸음'}</button>`);
        else if (c === 'reset') bar.insertAdjacentHTML('beforeend', '<button data-a="reset">↺ 처음</button>');
        else if (c.range) bar.insertAdjacentHTML('beforeend', `<label class="rng">${c.label} <input type="range" data-r="${c.range}" min="${c.min}" max="${c.max}" step="${c.step}" value="${c.value}"><span class="val" data-rv="${c.range}"></span></label>`);
        else if (c.check) bar.insertAdjacentHTML('beforeend', `<label><input type="checkbox" data-c="${c.check}"${c.value ? ' checked' : ''}> ${c.label}</label>`);
        else if (c.buttons) bar.insertAdjacentHTML('beforeend', `<span class="seg" data-b="${c.buttons}">${c.label ? `<span class="lb">${c.label}</span>` : ''}${c.items.map(([l, v]) => `<button data-bv="${v}">${l}</button>`).join('')}</span>`);
        else if (c.button) bar.insertAdjacentHTML('beforeend', `<button data-x="${c.button}"${c.go ? ' class="go"' : ''}>${c.label}</button>`);
      });
      bar.insertAdjacentHTML('beforeend', '<span class="grow"></span><span class="ro" data-ro></span>');
      el.insertBefore(bar, fb || null);
      st.bar = bar;
      st.btnPlay = bar.querySelector('[data-a=play]');
      st.ro = bar.querySelector('[data-ro]');
      ctl.forEach((c) => {
        if (c.range) st.v[c.range] = +c.value;
        if (c.check) st.v[c.check] = !!c.value;
        if (c.buttons) st.v[c.buttons] = c.value !== undefined ? c.value : c.items[0][1];
      });
      bar.addEventListener('click', (e) => {
        const a = e.target.closest('[data-a]'), x = e.target.closest('[data-x]'), b = e.target.closest('[data-bv]');
        if (a && a.dataset.a === 'play') toggle(st);
        if (a && a.dataset.a === 'step') { pause(st); st.played = true; delete st.kf; def.step ? def.step(st) : (st.t = Math.min(st.t + (def.stepDt || 0.05), def.tmax ?? Infinity)); req(st); }
        if (a && a.dataset.a === 'reset') { pause(st); reset(st); }
        if (x) { const c = ctl.find((q) => q.button === x.dataset.x); if (c && c.act) { delete st.kf; c.act(st); req(st); } }
        if (b) { const k = b.closest('[data-b]').dataset.b; const c = ctl.find((q) => q.buttons === k); const val = isNaN(+b.dataset.bv) ? b.dataset.bv : +b.dataset.bv; st.v[k] = val; if (c && c.act) c.act(st, val); req(st); }
      });
      bar.addEventListener('input', (e) => {
        const r = e.target.closest('[data-r]'), c = e.target.closest('[data-c]');
        if (r) { st.v[r.dataset.r] = +r.value; const d = ctl.find((q) => q.range === r.dataset.r); if (d && d.act) d.act(st, +r.value); req(st); }
        if (c) { st.v[c.dataset.c] = c.checked; req(st); }
      });
    }
    if (def.rotate) {
      let drag = null;
      st.cv.forEach((c) => {
        c.style.cursor = 'grab';
        c.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, az: st.az, el: st.el3 }; c.setPointerCapture(e.pointerId); });
        c.addEventListener('pointermove', (e) => { if (!drag) return; const s = Reveal.getScale ? Reveal.getScale() : 1; st.az = drag.az - (e.clientX - drag.x) / s * 0.4; st.el3 = Math.max(5, Math.min(75, drag.el + (e.clientY - drag.y) / s * 0.3)); req(st); });
        const end = () => { drag = null; };
        c.addEventListener('pointerup', end); c.addEventListener('pointercancel', end);
      });
    }
    if (def.onclick) st.cv.forEach((c, i) => c.addEventListener('click', (e) => {
      const r = c.getBoundingClientRect(), k = c.clientWidth / r.width;
      def.onclick(st, i, (e.clientX - r.left) * k, (e.clientY - r.top) * k); req(st);
    }));
    el.setAttribute('data-prevent-swipe', '');
    if (def.init) def.init(st);
    insts.push(st);
    req(st);
  }

  function reset(st) { st.t = 0; st.played = false; delete st.kf; st.stop = false; st.az = st.def.az; st.el3 = st.def.el; if (st.def.init) st.def.init(st, true); req(st); }

  function draw(st) {
    st.dirty = false;
    const ctx = st.cv.map((c) => window.PLOT.fit(c));
    if (ctx.some((c) => !c)) return;
    st.def.draw(st, ctx);
    if (st.bar) {
      st.bar.querySelectorAll('[data-rv]').forEach((s) => {
        const c = st.def.controls.find((q) => q.range === s.dataset.rv);
        s.textContent = minus(String(c && c.fmt ? c.fmt(st.v[c.range], st) : st.v[s.dataset.rv]));
      });
      st.bar.querySelectorAll('[data-b]').forEach((g) => g.querySelectorAll('[data-bv]').forEach((b) => b.classList.toggle('on', String(st.v[g.dataset.b]) === b.dataset.bv)));
      if (st.ro && st.def.readout) st.ro.innerHTML = minus(st.def.readout(st));
    }
  }
  /* 화면의 음수는 빼기 기호(−)로: 코드의 -1.10을 그대로 보이지 않는다 */
  function minus(h) { return h.replace(/(^|[\s(>=:·,])-(?=\d)/g, '$1−'); }
  function req(st) { if (!st.dirty) { st.dirty = true; requestAnimationFrame(() => draw(st)); } }

  function loop(st, now) {
    if (!st.playing) return;
    const d = st.last ? Math.min((now - st.last) / 1000, 0.1) : 0;
    st.last = now;
    const def = st.def;
    const t0 = st.t;
    if (def.tick) def.tick(st, d);
    else st.t += d * (def.speed || 0.25);
    const stopAt = (def.pauseAt || []).find((p) => t0 < p && st.t >= p);
    if (stopAt !== undefined && !def.tick) { st.t = stopAt; pause(st); }
    if (def.tmax !== undefined && st.t >= def.tmax) { st.t = def.tmax; pause(st); }
    if (st.stop) { st.stop = false; pause(st); }
    draw(st);
    if (st.playing) st.raf = requestAnimationFrame((n) => loop(st, n));
  }
  function play(st) {
    if (st.playing || isSpeaker()) return;
    if ((st.def.tmax !== undefined && st.t >= st.def.tmax) || (st.def.atEnd && st.def.atEnd(st))) reset(st);
    st.playing = true; st.played = true; st.last = 0;
    if (st.btnPlay) st.btnPlay.textContent = '⏸ 멈춤';
    st.raf = requestAnimationFrame((n) => loop(st, n));
  }
  function pause(st) {
    st.playing = false; cancelAnimationFrame(st.raf);
    if (st.btnPlay) st.btnPlay.textContent = '▶ 재생';
  }
  function toggle(st) { st.playing ? pause(st) : play(st); }

  (window.PARTS = window.PARTS || []).push({
    name: 'fig',
    mount(root) {
      root.querySelectorAll('.part.fig[data-fig]').forEach((el) => {
        try { build(el); } catch (e) { el.classList.add('failed'); console.error(e); }
      });
    },
    sync(slide) {
      insts.forEach((st) => {
        const here = slide.contains(st.el);
        if (!here) pause(st);
        if (here) {
          const sec = st.el.closest('section');
          st.frag = sec ? sec.querySelectorAll('.fragment.visible').length : 0;
          if (st.def.frag) st.def.frag(st, st.frag);
          if (st.def.autoplay && !st.played) play(st);
        }
        req(st);
      });
    },
    reset() { insts.forEach((st) => { pause(st); reset(st); }); },
  });
  /* 검수용: 그림 하나를 원하는 시각·값으로 그린다(화면 캡처 때 애니메이션 프레임이 늦어지는 것을 피함) */
  function set(sel, t, v = {}, n = 0) {
    const st = insts.find((s) => s.el.matches(sel) || s.el.closest(sel));
    if (!st) return 'none';
    Object.assign(st.v, v); if (t !== undefined) st.t = t; st.played = true;
    for (let i = 0; i < n; i++) st.def.step(st);
    draw(st); return st.t;
  }
  window.FIGPART = { req, play, pause, set, insts, draw };
})();
