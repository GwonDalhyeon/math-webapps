// ② 구슬 낙하: 결과는 시작할 때 sampleFull로 먼저 정하고, 구슬은 그 결과로 가는 길을 보여 준다.
// 물리 시뮬레이션을 하면 가운데 통에 몰리므로(이항분포), 목표 통에 맞는 길을 고르게 골라 그린다.
(function (root) {
  'use strict';
  const TD = root.TeamDraw = root.TeamDraw || {};
  const { ui } = TD;

  const DROP_GAP = 0.6; // 1배 기준 구슬 간격(초)
  const ROW_TIME = 0.085; // 핀 한 줄을 지나는 시간(초)
  const BIN_FALL = 0.3;

  function drawShape(ctx, shape, x, y, r, fill) {
    ctx.beginPath();
    const poly = (pts) => { pts.forEach(([px, py], i) => (i ? ctx.lineTo(x + px * r, y + py * r) : ctx.moveTo(x + px * r, y + py * r))); ctx.closePath(); };
    if (shape === 'circle') ctx.arc(x, y, r * 0.85, 0, Math.PI * 2);
    else if (shape === 'triangle') poly([[0, -0.9], [0.9, 0.75], [-0.9, 0.75]]);
    else if (shape === 'square') poly([[-0.75, -0.75], [0.75, -0.75], [0.75, 0.75], [-0.75, 0.75]]);
    else if (shape === 'diamond') poly([[0, -0.95], [0.95, 0], [0, 0.95], [-0.95, 0]]);
    else if (shape === 'star') {
      const pts = [];
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5; const rr = i % 2 ? 0.42 : 0.95; pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
      poly(pts);
    } else {
      const pts = [];
      for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 3; pts.push([Math.cos(a) * 0.92, Math.sin(a) * 0.92]); }
      poly(pts);
    }
    ctx.fillStyle = fill;
    ctx.fill();
  }

  let lc = null;

  function mount(container, session) {
    lc = ui.lifecycle();
    const G = session.G;
    const P = Math.max(8, 2 * G);
    const ids = session.students.map((s) => s.id);
    const assign = TD.groups.sampleFull(ids, session.sizes, session.apart, session.streams.assign);
    session.setAssignment(assign);

    // 구슬 길: 마지막 위치 k(0~P)를 통에 대응 bin(k) = floor(k·G/(P+1)). 순서와 길은 fx 흐름에서 뽑는다.
    const fx = session.streams.fx;
    const binOf = (k) => Math.floor((k * G) / (P + 1));
    const slotsOfBin = Array.from({ length: G }, () => []);
    for (let k = 0; k <= P; k++) slotsOfBin[binOf(k)].push(k);
    const order = fx.shuffle(ids.slice());
    const balls = order.map((id, i) => {
      const g = assign.get(id);
      const ks = slotsOfBin[g - 1];
      const k = ks[fx.randInt(ks.length)];
      const path = fx.shuffle([...new Array(k).fill(1), ...new Array(P - k).fill(0)]);
      return { id, g, k, path, start: i * DROP_GAP, landed: false, lastSeg: -1, slot: -1 };
    });

    container.innerHTML = `
      <div class="stage stage-2">
        <div class="center">
          <div class="pane center-main"><div class="marble-canvas-wrap"><canvas role="img" aria-label="핀 판과 모둠 통"></canvas></div></div>
          <div class="marble-controls">
            <button type="button" class="btn btn-go" data-act="play" aria-label="구슬 떨어뜨리기 시작">▶ 시작</button>
            <button type="button" class="btn btn-primary" data-act="pause" aria-label="일시정지" disabled>⏸ 일시정지</button>
            <div class="seg" role="group" aria-label="속도">
              <button type="button" data-speed="1" aria-label="1배 속도">1배</button>
              <button type="button" data-speed="2" aria-label="2배 속도">2배</button>
              <button type="button" data-speed="4" aria-label="4배 속도">4배</button>
            </div>
            <button type="button" class="btn btn-danger" data-act="finish" aria-label="남은 구슬 바로 넣기">⏭ 바로 끝내기</button>
            <button type="button" class="btn btn-go" data-act="result" aria-label="결과 화면 보기" hidden>결과 보기 →</button>
            <div class="marble-note"><i>i</i><span>모둠은 시작할 때 공정하게 정해집니다. 구슬은 그 결과로 가는 길을 보여 줍니다.</span></div>
          </div>
        </div>
        <aside class="pane side pane-scroll"><div class="board"></div></aside>
      </div>`;
    const board = ui.groupBoard(container.querySelector('.board'), session.sizes);
    const canvas = container.querySelector('canvas');
    const wrap = container.querySelector('.marble-canvas-wrap');
    const ctx = canvas.getContext('2d');
    const playBtn = container.querySelector('[data-act="play"]');
    const pauseBtn = container.querySelector('[data-act="pause"]');
    const finishBtn = container.querySelector('[data-act="finish"]');
    const resultBtn = container.querySelector('[data-act="result"]');
    const speedBtns = [...container.querySelectorAll('[data-speed]')];

    let speed = session.reduced ? 4 : 1;
    let started = false, running = false, complete = false;
    let simT = 0, lastT = null, frameId = 0;
    const binCount = new Array(G).fill(0);
    let landedCount = 0;
    let geo = null;

    function layout() {
      const W = wrap.clientWidth, H = wrap.clientHeight;
      if (!W || !H) return;
      const dpr = root.devicePixelRatio || 1;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const dx = Math.min(70, (W - 30) / (P + 1));
      const cx = W / 2;
      const left = cx - ((P + 1) * dx) / 2;
      // 통 경계: 슬롯 사이 중간, bin(k)가 바뀌는 곳
      const bins = slotsOfBin.map((ks) => ({ x0: left + ks[0] * dx, x1: left + (ks[ks.length - 1] + 1) * dx }));
      const minW = Math.min(...bins.map((b) => b.x1 - b.x0));
      const fh = Math.min(84, H * 0.12);
      const lh = 36;
      let br = Math.min(18, dx * 0.36);
      const maxSize = Math.max(...session.sizes);
      const rowsFor = (r) => Math.ceil(maxSize / Math.max(1, Math.floor((minW - 6) / (2 * r))));
      let bh = rowsFor(br) * 2 * br + 12;
      const room = H - fh - lh - 30;
      if (bh > room * 0.45) { br = Math.max(8, br * Math.sqrt((room * 0.45) / bh)); bh = rowsFor(br) * 2 * br + 12; }
      const binTop = H - lh - bh;
      const y0 = fh + 18;
      const dy = (binTop - 14 - y0) / P;
      geo = { W, H, dx, dy, cx, left, bins, fh, lh, br, bh, binTop, y0, pinR: Math.max(2.5, Math.min(5, dx * 0.08)) };
      draw();
    }

    const pinX = (r, j) => geo.cx + (j - r / 2) * geo.dx;
    const pinY = (r) => geo.y0 + r * geo.dy;

    function stackPos(g, j) {
      const b = geo.bins[g - 1];
      const w = b.x1 - b.x0;
      const per = Math.max(1, Math.floor((w - 6) / (2 * geo.br)));
      const row = Math.floor(j / per), col = j % per;
      const used = Math.min(per, session.sizes[g - 1]) * 2 * geo.br;
      return { x: b.x0 + (w - used) / 2 + geo.br + col * 2 * geo.br, y: geo.H - geo.lh - geo.br - 4 - row * 2 * geo.br };
    }

    // 구슬의 위치(경과 시간 t). 반환: {x, y, seg} 또는 null(아직 깔때기 안)
    function ballPos(b, t) {
      if (t < 0) return null;
      const entry = ROW_TIME * 1.5;
      const nodeX = (r) => { let j = 0; for (let i = 0; i < r; i++) j += b.path[i]; return r === P ? geo.cx + (j - P / 2) * geo.dx : pinX(r, j); };
      const nodeY = (r) => (r === P ? geo.binTop - geo.br : pinY(r) - geo.pinR - geo.br);
      if (t < entry) {
        const s = t / entry;
        return { x: geo.cx, y: geo.fh + (nodeY(0) - geo.fh) * s * s, seg: -1 };
      }
      const tr = t - entry;
      if (tr < P * ROW_TIME) {
        const r = Math.floor(tr / ROW_TIME);
        const s = (tr - r * ROW_TIME) / ROW_TIME;
        const xA = nodeX(r), xB = nodeX(r + 1), yA = nodeY(r), yB = nodeY(r + 1);
        return { x: xA + (xB - xA) * s, y: yA + (yB - yA) * s * s - geo.dy * 0.28 * Math.sin(Math.PI * s), seg: r };
      }
      const tf = tr - P * ROW_TIME;
      const target = stackPos(b.g, b.slot >= 0 ? b.slot : binCount[b.g - 1]);
      const s = Math.min(1, tf / BIN_FALL);
      const xA = nodeX(P), yA = nodeY(P);
      return { x: xA + (target.x - xA) * s, y: yA + (target.y - yA) * s * s, seg: P, done: tf >= BIN_FALL };
    }
    const totalTime = () => ROW_TIME * 1.5 + P * ROW_TIME + BIN_FALL;

    function land(b) {
      if (b.landed) return;
      b.landed = true;
      b.slot = binCount[b.g - 1]++;
      landedCount++;
      const s = session.byId.get(b.id);
      const full = board.place(s, b.g);
      session.progress(landedCount);
      ui.announce(`${s.name} → ${b.g}모둠`);
      if (full) session.audio.groupDone(); else session.audio.bin();
      if (landedCount === balls.length) onComplete();
    }

    function ballLabel(name, x, y, r, color) {
      let size = Math.min(15, r * 0.8);
      ctx.font = `800 ${size}px system-ui, sans-serif`;
      while (size > 8 && ctx.measureText(name).width > r * 1.8) { size -= 1; ctx.font = `800 ${size}px system-ui, sans-serif`; }
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(name, x, y + 0.5, r * 1.9);
    }

    function drawBall(b, x, y, landed) {
      const r = geo.br;
      const m = ui.meta(b.g);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      if (landed) {
        ctx.fillStyle = m.color;
        ctx.fill();
      } else {
        const grad = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.2, x, y, r);
        grad.addColorStop(0, '#ffffff'); grad.addColorStop(1, '#cbd5e1');
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1; ctx.stroke();
      }
      ballLabel(session.byId.get(b.id).name, x, y, r, landed ? '#ffffff' : '#0f172a');
    }

    function draw() {
      if (!geo) return;
      const { W, H } = geo;
      ctx.clearRect(0, 0, W, H);
      // 깔때기
      const fw = Math.min(W * 0.36, 260);
      ctx.fillStyle = '#e2e8f0'; ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(geo.cx - fw / 2, 6); ctx.lineTo(geo.cx + fw / 2, 6); ctx.lineTo(geo.cx + geo.br * 1.4, geo.fh); ctx.lineTo(geo.cx - geo.br * 1.4, geo.fh); ctx.closePath();
      ctx.fill(); ctx.stroke();
      const waiting = balls.filter((b) => simT < b.start).length;
      ctx.fillStyle = '#334155'; ctx.font = '700 16px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(waiting ? `남은 구슬 ${waiting}개` : '', geo.cx, geo.fh * 0.42);
      // 핀
      ctx.fillStyle = '#64748b';
      for (let r = 0; r < P; r++) for (let j = 0; j <= r; j++) { ctx.beginPath(); ctx.arc(pinX(r, j), pinY(r), geo.pinR, 0, Math.PI * 2); ctx.fill(); }
      // 통
      geo.bins.forEach((b, i) => {
        const g = i + 1;
        const m = ui.meta(g);
        const full = binCount[i] === session.sizes[i];
        ctx.fillStyle = m.tint;
        ctx.fillRect(b.x0 + 2, geo.binTop, b.x1 - b.x0 - 4, geo.bh);
        ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(b.x0 + 2, geo.binTop); ctx.lineTo(b.x0 + 2, geo.binTop + geo.bh); ctx.lineTo(b.x1 - 2, geo.binTop + geo.bh); ctx.lineTo(b.x1 - 2, geo.binTop); ctx.stroke();
        if (full) {
          ctx.fillStyle = '#64748b';
          ctx.fillRect(b.x0 + 2, geo.binTop - 6, b.x1 - b.x0 - 4, 7);
          const mx = (b.x0 + b.x1) / 2;
          ctx.beginPath(); ctx.arc(mx, geo.binTop - 16, 11, 0, Math.PI * 2); ctx.fillStyle = m.color; ctx.fill();
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(mx - 5, geo.binTop - 16); ctx.lineTo(mx - 1, geo.binTop - 12); ctx.lineTo(mx + 6, geo.binTop - 20); ctx.stroke();
        }
        // 통 아래 모양·번호
        const lx = (b.x0 + b.x1) / 2, ly = H - geo.lh / 2;
        drawShape(ctx, m.shape, lx - 13, ly, 11, m.color);
        ctx.fillStyle = '#0f172a'; ctx.font = '800 17px system-ui, sans-serif'; ctx.textAlign = 'left';
        ctx.fillText(String(g), lx + 2, ly + 1);
      });
      // 구슬
      for (const b of balls) {
        if (b.landed) { const p = stackPos(b.g, b.slot); drawBall(b, p.x, p.y, true); continue; }
        const pos = ballPos(b, simT - b.start);
        if (pos) drawBall(b, pos.x, pos.y, false);
      }
    }

    function step(t) {
      frameId = 0;
      if (!running) return;
      if (lastT === null) lastT = t;
      const dt = Math.min(0.1, (t - lastT) / 1000);
      lastT = t;
      simT += dt * speed;
      for (const b of balls) {
        if (b.landed) continue;
        const local = simT - b.start;
        if (local < 0) continue;
        const pos = ballPos(b, local);
        if (pos && pos.seg > b.lastSeg && pos.seg < P) { b.lastSeg = pos.seg; session.audio.tick(); }
        if (local >= totalTime()) land(b);
      }
      draw();
      if (running) frameId = lc.frame(step);
    }

    function setRunning(v) {
      running = v && !complete;
      lastT = null;
      pauseBtn.textContent = running ? '⏸ 일시정지' : '▶ 계속';
      pauseBtn.setAttribute('aria-label', running ? '일시정지' : '계속');
      if (running && !frameId) frameId = lc.frame(step);
    }

    function syncSpeed() {
      speedBtns.forEach((btn) => btn.setAttribute('aria-pressed', String(Number(btn.dataset.speed) === speed)));
    }

    function onComplete() {
      complete = true;
      running = false;
      playBtn.disabled = true; pauseBtn.disabled = true; finishBtn.disabled = true;
      resultBtn.hidden = false;
      draw();
      lc.timeout(() => session.finish(), 1500);
    }

    lc.on(playBtn, 'click', () => {
      if (started) return;
      started = true;
      playBtn.disabled = true;
      pauseBtn.disabled = false;
      setRunning(true);
    });
    lc.on(pauseBtn, 'click', () => setRunning(!running));
    speedBtns.forEach((btn) => lc.on(btn, 'click', () => { speed = Number(btn.dataset.speed); syncSpeed(); }));
    lc.on(finishBtn, 'click', () => {
      started = true;
      // 남은 구슬(떨어지는 중인 것 포함)을 떨어지는 순서대로 바로 넣는다.
      for (const b of balls) if (!b.landed) land(b);
      simT = Math.max(simT, balls[balls.length - 1].start + totalTime());
      draw();
    });
    lc.on(resultBtn, 'click', () => session.finish());
    if (root.ResizeObserver) lc.observe(new ResizeObserver(layout)).observe(wrap);
    lc.on(root, 'resize', layout);
    syncSpeed();
    layout();
    playBtn.focus();
  }

  function unmount() {
    if (lc) lc.dispose();
    lc = null;
  }

  TD.modeMarble = { mount, unmount };
})(window);
