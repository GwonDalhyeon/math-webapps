/* 「퍼셉트론, 직선으로 판단하다」 — 블록 회로판(내 장치 설계 ②, 03_2차개정_명세서 §3-3).
   블록을 끌어 놓고 단자를 끌어 잇는다. 누르기만으로도(블록 단추 → 자동 배치, 단자 두 개 차례로 누르기) 할 수 있다.
   상태는 board = { blocks:[{id,type,x,y}], wires:[{from,to,port}], nextBlock }. 계산은 geom.js의 boardCircuit. */
'use strict';

const BOARD_W = 620, BOARD_H = 330;
const BLOCK_W = 88, BLOCK_H = 52;
const BOARD_OUT = [566, BOARD_H / 2];
const MAX_BLOCKS = 6;
const boardInputPos = (n, k) => [40, n === 3 ? 62 + k * 98 : 100 + k * 120];
const BLOCK_MIN_X = 215;              // 입력 이름표 자리를 비워 둔다
const inPortPos = (b, port) => [b.x - BLOCK_W / 2, b.y + (PG.portsOf(b.type) === 1 ? 0 : port === 0 ? -14 : 14)];
const outPortPos = (b) => [b.x + BLOCK_W / 2, b.y];

/* 일부만 이어져 있어도 값이 정해지는 곳까지 계산한다(선 색칠용) */
function evalBoard(board, env) {
  const val = { ...env };
  const src = (id, port) => { const w = board.wires.find((x) => x.to === id && x.port === port); return w ? w.from : ''; };
  for (let round = 0; round < MAX_BLOCKS + 1; round++) {
    board.blocks.forEach((b) => {
      if (val[b.id] !== undefined) return;
      const ins = Array.from({ length: PG.portsOf(b.type) }, (_, k) => src(b.id, k));
      if (ins.some((x) => !x || val[x] === undefined)) return;
      const [x, y] = ins.map((i) => val[i]);
      val[b.id] = b.type === 'NOT' ? 1 - x : b.type === 'AND' ? (x & y) : (x | y);
    });
  }
  const o = board.wires.find((w) => w.to === 'OUT');
  val.OUT = o ? val[o.from] : undefined;
  return val;
}

/* o: { inputs:['A','B','C'], names:{A:'앞에 사람이 있다'}, outName, sw, pending, selected, drag:{x,y,from}, readOnly, small } */
function boardSvg(board, o = {}) {
  const inputs = o.inputs || ['A', 'B'];
  const vals = evalBoard(board, o.sw || {});
  const pos = {};
  inputs.forEach((x, k) => { pos[x] = boardInputPos(inputs.length, k); });
  board.blocks.forEach((b) => { pos[b.id] = [b.x, b.y]; });
  const fromPt = (id) => (inputs.includes(id) ? [pos[id][0] + 22, pos[id][1]] : outPortPos(board.blocks.find((b) => b.id === id)));
  const toPt = (w) => (w.to === 'OUT' ? [BOARD_OUT[0] - 40, BOARD_OUT[1]] : inPortPos(board.blocks.find((b) => b.id === w.to), w.port));
  const curve = (s, t) => { const dx = Math.max(30, Math.abs(t[0] - s[0]) / 2); return `M${f1(s[0])} ${f1(s[1])} C${f1(s[0] + dx)} ${f1(s[1])}, ${f1(t[0] - dx)} ${f1(t[1])}, ${f1(t[0])} ${f1(t[1])}`; };
  let g = `<rect class="board-bg" x="1" y="1" width="${BOARD_W - 2}" height="${BOARD_H - 2}" rx="14"/>`;
  /* 선 */
  board.wires.forEach((w, k) => {
    const okFrom = inputs.includes(w.from) || board.blocks.some((b) => b.id === w.from);
    const okTo = w.to === 'OUT' || board.blocks.some((b) => b.id === w.to);
    if (!okFrom || !okTo) return;
    const s = fromPt(w.from), t = toPt(w), v = vals[w.from];
    const d = curve(s, t);
    g += `<path class="wire${v === 1 ? ' hot' : ''}" d="${d}"/>`;
    if (!o.readOnly) g += `<path class="wire-hit" d="${d}" data-wire="${k}"><title>선 지우기</title></path>`;
    if (v !== undefined) g += svgText((s[0] + t[0]) / 2, (s[1] + t[1]) / 2 - 10, String(v), `wire-val${v === 1 ? ' hot' : ''}`, 'middle', 13);
  });
  if (o.drag && o.drag.from) { const s = fromPt(o.drag.from); g += `<path class="wire drafting" d="${curve(s, [o.drag.x, o.drag.y])}"/>`; }
  /* 입력 */
  inputs.forEach((x) => {
    const [cx, cy] = pos[x], v = (o.sw || {})[x] || 0;
    g += `<g class="board-input${o.readOnly ? '' : ' toggle'}" data-switch="${x}"><circle class="in-node${v ? ' hot' : ''}" cx="${cx}" cy="${cy}" r="20"/>${svgText(cx, cy, `<tspan class="var">${x}</tspan>`, '', 'middle', 18)}</g>`;
    g += svgText(cx - 30, cy + 33, `${o.names && o.names[x] ? esc(o.names[x]) : ''} (${v})`, 'board-name', 'start', 12);
    g += portSvg(cx + 22, cy, 'out', x, o, `${x}에서 선 잇기 시작`);
  });
  /* 블록 */
  board.blocks.forEach((b) => {
    const sel = o.selected === b.id;
    g += `<g class="block${sel ? ' selected' : ''}" data-block="${b.id}" ${o.readOnly ? '' : `tabindex="0" role="button" aria-label="${b.type} 블록. 끌어 옮기기, Delete로 지우기"`}>`;
    g += `<rect class="gate-node${vals[b.id] === 1 ? ' hot' : ''}" x="${f1(b.x - BLOCK_W / 2)}" y="${f1(b.y - BLOCK_H / 2)}" width="${BLOCK_W}" height="${BLOCK_H}" rx="12"/>`;
    g += svgText(b.x, b.y, b.type, 'gate-label', 'middle', 17) + '</g>';
    for (let k = 0; k < PG.portsOf(b.type); k++) { const [px, py] = inPortPos(b, k); g += portSvg(px, py, 'in', `${b.id}:${k}`, o, `${b.type} 블록의 ${k + 1}번째 입력에 잇기`); }
    const [ox, oy] = outPortPos(b); g += portSvg(ox, oy, 'out', b.id, o, `${b.type} 블록에서 선 잇기 시작`);
    if (sel && !o.readOnly) g += `<g class="block-del" data-del="${b.id}" role="button" tabindex="0" aria-label="블록 지우기"><circle cx="${f1(b.x + BLOCK_W / 2 - 4)}" cy="${f1(b.y - BLOCK_H / 2 - 4)}" r="13"/>${svgText(b.x + BLOCK_W / 2 - 4, b.y - BLOCK_H / 2 - 4, '✕', 'del-x', 'middle', 13)}</g>`;
  });
  /* 출력 */
  const [ox, oy] = BOARD_OUT, ov = vals.OUT;
  g += `<rect class="out-node${ov === 1 ? ' hot' : ''}" x="${ox - 40}" y="${oy - 28}" width="80" height="56" rx="12"/>${svgText(ox, oy - 8, '출력', 'gate-label', 'middle', 15)}${svgText(ox, oy + 12, ov === undefined ? '?' : String(ov), 'gate-label', 'middle', 16)}`;
  if (o.outName) g += svgText(ox, oy + 46, esc(o.outName), 'board-name', 'middle', 12);
  g += portSvg(ox - 40, oy, 'in', 'OUT:0', o, '출력에 잇기');
  return `<svg viewBox="0 0 ${BOARD_W} ${BOARD_H}" class="board-svg${o.small ? ' small' : ''}" role="img" aria-label="${o.readOnly ? '내가 만든 회로' : '회로판'}">${g}</svg>`;
}
function portSvg(x, y, kind, key, o, label) {
  if (o.readOnly) return `<circle class="port ${kind}" cx="${f1(x)}" cy="${f1(y)}" r="6"/>`;
  const on = kind === 'out' && o.pending === key;
  return `<g class="port-g" data-port="${kind}" data-key="${key}" tabindex="0" role="button" aria-label="${label}"><circle class="port-hit" cx="${f1(x)}" cy="${f1(y)}" r="17"/><circle class="port ${kind}${on ? ' pending' : ''}" cx="${f1(x)}" cy="${f1(y)}" r="${on ? 9 : 7}"/></g>`;
}

/* 회로판에 조작을 붙인다. cfg: { board, inputs, redraw(o), commit(kind, detail), toggle(x) } */
function bindBoard(el, cfg) {
  const svg = el.querySelector('svg');
  if (!svg) return;
  const ui = cfg.ui;            // { pending, selected } — 화면이 들고 있는 일시 상태
  const toBoard = (ev) => { const pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY; const m = svg.getScreenCTM(); if (!m) return null; const p = pt.matrixTransform(m.inverse()); return [p.x, p.y]; };
  const clampXY = (x, y) => [Math.max(BLOCK_MIN_X, Math.min(BOARD_W - BLOCK_W / 2 - 92, x)), Math.max(BLOCK_H / 2 + 8, Math.min(BOARD_H - BLOCK_H / 2 - 8, y))];
  let press = null;
  const connect = (from, toKey) => {
    const [to, portS] = toKey.split(':');
    const port = Number(portS);
    const b = cfg.board;
    if (to !== 'OUT' && wouldCycleSafe(b, from, to)) { cfg.commit('cycle'); return; }
    b.wires = b.wires.filter((w) => !(w.to === to && w.port === port));
    b.wires.push({ from, to, port });
    cfg.commit('wire', `${from} → ${to === 'OUT' ? '출력' : to}`);
  };
  svg.addEventListener('pointerdown', (ev) => {
    if (ev.button > 0) return;
    const P = toBoard(ev);
    if (!P) return;
    const t = ev.target.closest('[data-port],[data-block],[data-wire],[data-switch],[data-del]');
    if (!t) { if (ui.selected || ui.pending) { ui.selected = ''; ui.pending = ''; cfg.redraw(); } return; }
    ev.preventDefault();
    try { svg.setPointerCapture(ev.pointerId); } catch (e) { /* 무시 */ }
    if (t.dataset.del) { press = { kind: 'del', id: t.dataset.del, pid: ev.pointerId }; return; }
    if (t.dataset.port === 'out') press = { kind: 'wire', from: t.dataset.key, pid: ev.pointerId, start: P, moved: false };
    else if (t.dataset.port === 'in') press = { kind: 'in', key: t.dataset.key, pid: ev.pointerId, start: P, moved: false };
    else if (t.dataset.block) { const b = cfg.board.blocks.find((x) => x.id === t.dataset.block); press = { kind: 'move', id: b.id, pid: ev.pointerId, start: P, off: [b.x - P[0], b.y - P[1]], moved: false }; }
    else if (t.dataset.wire !== undefined) press = { kind: 'wireTap', k: Number(t.dataset.wire), pid: ev.pointerId, start: P, moved: false };
    else if (t.dataset.switch) press = { kind: 'switch', x: t.dataset.switch, pid: ev.pointerId, start: P, moved: false };
  });
  svg.addEventListener('pointermove', (ev) => {
    if (!press || press.pid !== ev.pointerId || !press.start) return;
    const P = toBoard(ev);
    if (!P) return;
    if (Math.hypot(P[0] - press.start[0], P[1] - press.start[1]) > 6) press.moved = true;
    if (!press.moved) return;
    if (press.kind === 'move') {
      const b = cfg.board.blocks.find((x) => x.id === press.id);
      b.x = P[0] + press.off[0]; b.y = P[1] + press.off[1];
      press.out = P[0] < 0 || P[0] > BOARD_W || P[1] < 0 || P[1] > BOARD_H;
      cfg.redraw({ outside: press.out ? b.id : '' });
    } else if (press.kind === 'wire') cfg.redraw({ drag: { from: press.from, x: P[0], y: P[1] } });
  });
  const end = (ev, cancel) => {
    if (!press || press.pid !== ev.pointerId) return;
    const pr = press; press = null;
    if (cancel) { cfg.redraw(); return; }
    if (pr.kind === 'del') { removeBlock(cfg.board, pr.id); ui.selected = ''; cfg.commit('delete', pr.id); return; }
    if (pr.kind === 'move') {
      const b = cfg.board.blocks.find((x) => x.id === pr.id);
      if (pr.moved && pr.out) { removeBlock(cfg.board, b.id); ui.selected = ''; cfg.commit('delete', b.id); return; }
      if (pr.moved) { [b.x, b.y] = clampXY(b.x, b.y); cfg.commit('move'); return; }
      ui.selected = ui.selected === b.id ? '' : b.id; ui.pending = ''; cfg.redraw(); return;
    }
    if (pr.kind === 'wire') {
      if (pr.moved) {
        const hit = document.elementFromPoint(ev.clientX, ev.clientY);
        const port = hit && hit.closest && hit.closest('[data-port="in"]');
        if (port) connect(pr.from, port.dataset.key); else cfg.redraw();
        return;
      }
      ui.pending = ui.pending === pr.from ? '' : pr.from; ui.selected = ''; cfg.redraw(); return;
    }
    if (pr.kind === 'in') { if (ui.pending) { const f = ui.pending; ui.pending = ''; connect(f, pr.key); } else cfg.redraw(); return; }
    if (pr.kind === 'wireTap' && !pr.moved) { const w = cfg.board.wires[pr.k]; cfg.board.wires.splice(pr.k, 1); cfg.commit('unwire', w ? `${w.from} → ${w.to}` : ''); return; }
    if (pr.kind === 'switch' && !pr.moved) { cfg.toggle(pr.x); return; }
    cfg.redraw();
  };
  svg.addEventListener('pointerup', (ev) => end(ev, false));
  svg.addEventListener('pointercancel', (ev) => end(ev, true));
  /* 키보드: 단자 Enter = 누르기와 같음, 블록 Delete = 지우기 */
  svg.addEventListener('keydown', (ev) => {
    const t = ev.target;
    if ((ev.key === 'Enter' || ev.key === ' ') && t.dataset && t.dataset.port) {
      ev.preventDefault();
      if (t.dataset.port === 'out') { ui.pending = ui.pending === t.dataset.key ? '' : t.dataset.key; cfg.redraw(); }
      else if (ui.pending) { const f = ui.pending; ui.pending = ''; connect(f, t.dataset.key); }
    } else if ((ev.key === 'Delete' || ev.key === 'Backspace') && t.dataset && t.dataset.block) {
      ev.preventDefault(); removeBlock(cfg.board, t.dataset.block); cfg.commit('delete', t.dataset.block);
    } else if ((ev.key === 'Enter' || ev.key === ' ') && t.dataset && t.dataset.del) {
      ev.preventDefault(); removeBlock(cfg.board, t.dataset.del); ui.selected = ''; cfg.commit('delete', t.dataset.del);
    }
  });
}
function wouldCycleSafe(board, from, to) { return PG.wouldCycle(board, from, to); }
function removeBlock(board, id) {
  board.blocks = board.blocks.filter((b) => b.id !== id);
  board.wires = board.wires.filter((w) => w.from !== id && w.to !== id);
}
/* 팔레트: 끌어서 판에 놓거나, 누르면 빈자리에 놓는다 */
function freeSpot(board) {
  const cols = [265, 370, 470], rows = [70, 165, 260];
  for (const x of cols) for (const y of rows) if (!board.blocks.some((b) => Math.hypot(b.x - x, b.y - y) < 60)) return [x, y];
  return [300, 165];
}
function addBlock(board, type, at) {
  if (board.blocks.length >= MAX_BLOCKS) return null;
  const id = `K${board.nextBlock || 1}`;
  board.nextBlock = (board.nextBlock || 1) + 1;
  const [x, y] = at || freeSpot(board);
  board.blocks.push({ id, type, x, y });
  return id;
}
function bindPalette(box, boardEl, cfg) {
  if (!box) return;
  box.querySelectorAll('[data-palette]').forEach((btn) => {
    let press = null, ghost = null;
    btn.addEventListener('pointerdown', (ev) => {
      if (ev.button > 0) return;
      press = { x: ev.clientX, y: ev.clientY, pid: ev.pointerId, moved: false };
      try { btn.setPointerCapture(ev.pointerId); } catch (e) { /* 무시 */ }
    });
    btn.addEventListener('pointermove', (ev) => {
      if (!press || press.pid !== ev.pointerId) return;
      if (!press.moved && Math.hypot(ev.clientX - press.x, ev.clientY - press.y) > 8) {
        press.moved = true;
        ghost = document.createElement('div'); ghost.className = 'block-ghost'; ghost.textContent = btn.dataset.palette; document.body.appendChild(ghost);
      }
      if (ghost) { ghost.style.left = `${ev.clientX}px`; ghost.style.top = `${ev.clientY}px`; }
    });
    const finish = (ev, cancel) => {
      if (!press || press.pid !== ev.pointerId) return;
      const pr = press; press = null;
      if (ghost) { ghost.remove(); ghost = null; }
      if (cancel) return;
      if (!pr.moved) return;           // 누르기는 click에서 처리
      const svg = boardEl.querySelector('svg');
      const r = svg.getBoundingClientRect();
      if (ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom) return;
      const pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
      const p = pt.matrixTransform(svg.getScreenCTM().inverse());
      const at = [Math.max(BLOCK_MIN_X, Math.min(BOARD_W - BLOCK_W / 2 - 92, p.x)), Math.max(BLOCK_H / 2 + 8, Math.min(BOARD_H - BLOCK_H / 2 - 8, p.y))];
      const id = addBlock(cfg.board, btn.dataset.palette, at);
      btn.dataset.dragged = '1';
      if (id) cfg.commit('add', `${btn.dataset.palette} 끌어 놓기`); else cfg.full();
    };
    btn.addEventListener('pointerup', (ev) => finish(ev, false));
    btn.addEventListener('pointercancel', (ev) => finish(ev, true));
    btn.addEventListener('click', () => {
      if (btn.dataset.dragged) { delete btn.dataset.dragged; return; }
      const id = addBlock(cfg.board, btn.dataset.palette);
      if (id) cfg.commit('add', `${btn.dataset.palette} 놓기`); else cfg.full();
    });
  });
}
