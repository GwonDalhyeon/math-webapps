/* 부품 A · 줄 실험실 (명세 3절). 정확한 해(js/core/wave1d.js)로 매 프레임 줄을 그린다.
   <div class="part string-lab" data-scenario="modes|bump|shake" ...> 하나가 부품 하나다.
   - modes : data-modes="1,2,3" 사인 모양 줄을 가로로 나란히(명세 2-6). 마디 표시, 처음 모양으로 돌아온 횟수.
   - bump  : 일부만 볼록한 줄 + 왼쪽 끝 확대 창(같은 시각).
   - shake : 왼쪽 끝을 흔드는 줄.
   - data-frames="0,1/6,…" 가 있으면 재생하지 않고 그 시각들을 나란히 그린다(멈춘 장면, 레이아웃 L9).
   재생 화면에는 지금 순간 하나만 그린다(명세 2-2의 8). */
(function () {
  const W = window.Wave1D;
  const COL = { curve: '#2f5d8a', exact: '#8a96a3', grid: '#dfe6ee', axis: '#374151', node: '#d9822b', end: '#374151', shake: '#d9822b', faint: '#c7d3e0' };
  const NAMES = { 1: ['sin πx', '반 주기'], 2: ['sin 2πx', '한 주기'], 3: ['sin 3πx', '한 주기 반'] };
  const parts = [];

  const frac = (s) => { const [a, b] = String(s).split('/').map(Number); return b ? a / b : a; };
  const fmtT = (t) => t.toFixed(2);

  function makeCanvas(holder) {
    const c = document.createElement('canvas');
    holder.appendChild(c);
    return c;
  }

  function fit(c) {
    const w = c.clientWidth, h = c.clientHeight;
    if (!w || !h) return null;
    const k = 2;
    if (c.width !== w * k || c.height !== h * k) { c.width = w * k; c.height = h * k; }
    const g = c.getContext('2d');
    g.setTransform(k, 0, 0, k, 0, 0);
    return { g, w, h };
  }

  /* 줄 하나를 그린다. f(x) = 높이, view = {x0, x1, y}(세로 ±y) */
  function drawString(c, f, view, opt) {
    const r = fit(c); if (!r) return;
    const { g, w, h } = r;
    g.clearRect(0, 0, w, h);
    const pad = 14;
    const X = (x) => pad + (x - view.x0) / (view.x1 - view.x0) * (w - 2 * pad);
    const Y = (y) => h / 2 - y / view.y * (h / 2 - pad);
    g.strokeStyle = COL.grid; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(X(view.x0), Y(0)); g.lineTo(X(view.x1), Y(0)); g.stroke();
    if (opt.envelope) {
      g.strokeStyle = COL.faint; g.lineWidth = 1.5;
      for (const s of [1, -1]) { g.beginPath(); for (let i = 0; i <= 200; i++) { const x = Math.max(view.x0, 0) + (Math.min(view.x1, 1) - Math.max(view.x0, 0)) * i / 200; const y = s * opt.envelope(x); i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y)); } g.stroke(); }
    }
    g.strokeStyle = COL.curve; g.lineWidth = 4; g.lineJoin = 'round';
    g.beginPath();
    const a0 = Math.max(view.x0, 0), a1 = Math.min(view.x1, 1);           // 줄은 0 ≤ x ≤ 1에만 있다
    for (let i = 0; i <= 400; i++) { const x = a0 + (a1 - a0) * i / 400; const y = f(x); i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y)); }
    g.stroke();
    (opt.nodes || []).forEach((x) => { g.fillStyle = '#fff'; g.strokeStyle = COL.node; g.lineWidth = 3; g.beginPath(); g.arc(X(x), Y(0), 7, 0, 7); g.fill(); g.stroke(); });
    (opt.ends || []).forEach(([x, y, col]) => { g.fillStyle = col || COL.end; g.beginPath(); g.arc(X(x), Y(y), 7, 0, 7); g.fill(); });
  }

  function build(el) {
    const sc = el.dataset.scenario || 'modes';
    const speed = +(el.dataset.speed || 0.25);           // 화면 1초에 흐르는 시간(단위: 줄 길이 / 파동 속도)
    const dt = frac(el.dataset.step || '1/12');
    const tmax = el.dataset.tmax ? frac(el.dataset.tmax) : Infinity;
    const frames = el.dataset.frames ? el.dataset.frames.split(',').map(frac) : null;
    const st = { el, sc, t: 0, playing: false, played: false, nodes: false, raf: 0, last: 0, panels: [] };

    const fb = el.querySelector('img.fallback');
    const row = document.createElement('div');
    row.className = 'sl-row';
    el.insertBefore(row, fb || null);

    if (sc === 'modes') {
      const modes = (el.dataset.modes || '1,2,3').split(',').map(Number);
      if (frames) {
        row.classList.add('sl-frames');
        modes.forEach((n) => {
          const line = document.createElement('div'); line.className = 'sl-fline';
          const [nm, sub] = NAMES[n] || [`sin ${n}πx`, ''];
          line.innerHTML = `<div class="sl-fname"><i>${nm}</i><span>${sub}</span></div>`;
          frames.forEach((t) => {
            const cell = document.createElement('div'); cell.className = 'sl-fcell';
            const c = makeCanvas(cell); c.className = 'sl-fcanvas';
            line.appendChild(cell);
            st.panels.push({ c, f: (x) => W.uSine(n, x, t), view: { x0: 0, x1: 1, y: 1.6 }, nodes: Array.from({ length: n - 1 }, (_, j) => (j + 1) / n), env: (x) => Math.abs(Math.sin(n * Math.PI * x)) });
          });
          row.appendChild(line);
        });
        const head = document.createElement('div'); head.className = 'sl-fline sl-fhead';
        head.innerHTML = '<div class="sl-fname"></div>' + frames.map((t, i) => `<div class="sl-fcell sl-ft">t = ${el.dataset.frames.split(',')[i]}</div>`).join('');
        row.insertBefore(head, row.firstChild);
        st.static = true;
      } else {
        modes.forEach((n) => {
          const p = document.createElement('div'); p.className = 'sl-panel';
          const [nm, sub] = NAMES[n] || [`sin ${n}πx`, ''];
          p.innerHTML = `<div class="sl-title"><i>${nm}</i> <span>(${sub})</span></div>`;
          const c = makeCanvas(p);
          const cnt = document.createElement('div'); cnt.className = 'sl-count'; p.appendChild(cnt);
          row.appendChild(p);
          st.panels.push({ c, n, cnt, f: (x) => W.uSine(n, x, st.t), view: { x0: -0.02, x1: 1.02, y: 1.6 }, nodes: Array.from({ length: n - 1 }, (_, j) => (j + 1) / n), env: (x) => Math.abs(Math.sin(n * Math.PI * x)) });
        });
      }
    } else if (sc === 'bump') {
      const p = document.createElement('div'); p.className = 'sl-panel sl-wide';
      p.innerHTML = '<div class="sl-title">줄 전체 <span>(상상 실험)</span></div>';
      const c = makeCanvas(p); row.appendChild(p);
      const z = document.createElement('div'); z.className = 'sl-panel';
      z.innerHTML = '<div class="sl-title">왼쪽 끝 확대 <span>(0 ≤ x ≤ 0.4)</span></div>';
      const cz = makeCanvas(z); row.appendChild(z);
      st.panels.push({ c, f: (x) => W.uBump(x, st.t), view: { x0: -0.02, x1: 1.02, y: 1.25 }, ends: [[0, 0], [1, 0]] });
      st.panels.push({ c: cz, f: (x) => W.uBump(x, st.t), view: { x0: 0, x1: 0.4, y: 1.25 }, ends: [[0, 0]] });
    } else if (sc === 'shake') {
      const p = document.createElement('div'); p.className = 'sl-panel sl-wide';
      p.innerHTML = '<div class="sl-title">왼쪽 끝을 위아래로 흔든다 <span>(오른쪽 끝은 묶임)</span></div>';
      const c = makeCanvas(p); row.appendChild(p);
      st.panels.push({ c, f: (x) => W.uShake(x, st.t), view: { x0: -0.02, x1: 1.02, y: 0.9 }, endsFn: () => [[0, W.shakeG(st.t), COL.shake], [1, 0]] });
    }

    if (!st.static) {
      const bar = document.createElement('div'); bar.className = 'bar';
      bar.innerHTML = '<button class="go" data-a="play">▶ 재생</button><button data-a="step">한 걸음</button><button data-a="reset">↺ 처음</button>'
        + (sc === 'modes' ? '<label><input type="checkbox" data-a="nodes"> 마디 표시</label>' : '')
        + '<span class="grow"></span><span>시각 <span class="val" data-v="t">t = 0.00</span></span>';
      el.insertBefore(bar, fb || null);
      st.btnPlay = bar.querySelector('[data-a=play]');
      st.tv = bar.querySelector('[data-v=t]');
      bar.addEventListener('click', (e) => {
        const a = e.target.closest('[data-a]'); if (!a) return;
        if (a.dataset.a === 'play') toggle(st);
        if (a.dataset.a === 'step') { pause(st); setT(st, Math.min(st.t + dt, tmax)); st.played = true; }
        if (a.dataset.a === 'reset') { pause(st); setT(st, 0); }
      });
      const nb = bar.querySelector('[data-a=nodes]');
      if (nb) nb.addEventListener('change', () => { st.nodes = nb.checked; draw(st); });
    }
    el.setAttribute('data-prevent-swipe', '');
    parts.push(st);
    draw(st);
  }

  function setT(st, t) { st.t = t; draw(st); }

  function draw(st) {
    st.panels.forEach((p) => {
      drawString(p.c, p.f, p.view, {
        nodes: (st.static || st.nodes) ? p.nodes : [],
        envelope: (st.static || (st.played && p.env)) ? p.env : null,
        ends: p.endsFn ? p.endsFn() : (p.ends || [[p.view.x0 < 0 ? 0 : p.view.x0, 0], [1, 0]]),
      });
      if (p.cnt) {
        const k = Math.floor(p.n * st.t / 2 + 1e-9);
        p.cnt.textContent = st.played ? `처음 모양으로 돌아온 횟수 ${k}` : '';
      }
    });
    if (st.tv) st.tv.textContent = `t = ${fmtT(st.t)}`;
  }

  function loop(st, now) {
    if (!st.playing) return;
    const d = st.last ? (now - st.last) / 1000 : 0;
    st.last = now;
    let t = st.t + d * +(st.el.dataset.speed || 0.25);
    if (t >= st.tmaxV) { t = st.tmaxV; pause(st); }
    setT(st, t);
    st.raf = requestAnimationFrame((n) => loop(st, n));
  }
  function play(st) {
    if (st.static || st.playing || (window.DECK && window.DECK.speaker())) return;
    st.tmaxV = st.el.dataset.tmax ? frac(st.el.dataset.tmax) : Infinity;
    if (st.t >= st.tmaxV) setT(st, 0);
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
    name: 'string-lab',
    mount(root) {
      root.querySelectorAll('.part.string-lab').forEach((el) => {
        try { build(el); } catch (e) { el.classList.add('failed'); throw e; }
      });
    },
    sync(slide) {
      parts.forEach((st) => {
        const here = slide.contains(st.el);
        if (!here) pause(st);
        draw(st);                               // 화면 크기가 바뀌었을 수 있다
      });
    },
    reset() { parts.forEach((st) => { pause(st); st.played = false; setT(st, 0); }); },
  });
})();
