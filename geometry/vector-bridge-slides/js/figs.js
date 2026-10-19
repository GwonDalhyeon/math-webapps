/* 0차시 수업 화면 그림 (SVG를 문자열로 만들어 <div class="fig" data-fig="이름">에 넣는다).
   - 좌표: 벡터 (vx, vy)는 화면에서 (vx, -vy)로 그린다(SVG의 y축은 아래 방향).
   - 움직임은 reveal.js fragment(custom)로 단계마다 켠다. fx-draw(그리기), fx-fade(나타나기),
     fx-move(복사본 옮기기), fx-out(사라지기), fx-ring(출발점 표시)은 css/deck.css에 있다.
   - 아래 DATA는 tools/check_slides.py가 교사용 학습지의 답과 대조한다. 숫자를 고칠 때는 DATA만 고친다. */

const DATA = /*DATA*/{
  "vec1": {"F": [3, 4], "G": [-3, 4]},
  "sum": {"F1": [4, 1], "F2": [-1, 3], "F3": [-3, -4]},
  "ex1": {
    "O": {"F1": [3, 4], "F2": [-3, 4], "F3": [0, -8]},
    "L": {"bar": [-3, -4], "sup": [3, 4]},
    "R": {"bar": [3, -4], "sup": [-3, 4]},
    "pos": {"O": [0, 0], "L": [-3, -4], "R": [3, -4]}
  },
  "p1": {
    "A": {"W": [0, -4], "rope": [3, 4], "bar": [-3, 0]},
    "B": {"W": [0, -4], "rope": [-3, 4], "bar": [3, 0]},
    "out": {"A": {"rope": [-3, 4], "bar": [3, 0]}, "B": {"rope": [3, 4], "bar": [-3, 0]}},
    "pos": {"A": [0, 0], "B": [6, 0], "C": [3, 4]}
  },
  "p2": {
    "P": {"F1": [-8, 0], "F2": [8, 6], "F3": [0, -6]},
    "A": {"bar": [8, 0], "wall": [-8, 0]},
    "B": {"bar": [-8, -6], "wall": [8, 6]},
    "heavy": [0, -10],
    "pos": {"P": [0, 0], "A": [-4, 0], "B": [-4, -3]}
  },
  "ex2": {
    "C": {"F1": ["sqrt(3)", 3], "F2": ["-sqrt(3)", 3], "W": [0, -6]},
    "A": {"AC": ["-sqrt(3)", -3], "sup": [0, 3], "AB": ["sqrt(3)", 0]},
    "pos": {"A": [0, 0], "B": [4, 0], "C": [2, "2*sqrt(3)"]}
  },
  "p4": {
    "C": {"F1": [3, 3], "F2": [-3, 3], "W": [0, -6]},
    "A": {"AC": [-3, -3], "sup": [0, 3], "AB": [3, 0]},
    "pos": {"A": [0, 0], "B": [4, 0], "C": [2, 2]}
  }
}/*END*/;
/* DATA의 값은 수 또는 "sqrt(3)" 같은 식(문자열)이다 */
const N = (v) => (typeof v === 'number' ? v : Function(`return ${v.replace(/sqrt/g, 'Math.sqrt')}`)());
const V = (a) => a.map(N);

const COL = { ink: '#111', soft: '#333', comp: '#666', bar: '#c4c4c4', pull: '#1d5fbf', push: '#c63d2f', sum: '#0b7a6f', grid: '#e4e4e4', axis: '#888' };
const SANS = '"Pretendard Variable", Pretendard, "Malgun Gothic", sans-serif';
const r2 = (x) => String(Math.round(x * 100) / 100);

class Fig {
  constructor(w, h) { this.w = w; this.h = h; this.out = []; }
  add(...s) { this.out.push(...s); return this; }
  svg(label) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${this.w} ${this.h}" role="img" aria-label="${label}">${themeable(this.out.join(''))}</svg>`;
  }
}

/* 테마: 색 속성은 흑백 기본값으로 두고, 같은 색에 클래스(s-토큰: 선, f-토큰: 면)를 붙인다.
   css/deck.css의 테마 변수가 이 클래스를 덮어써 색을 바꾼다(그림의 좌표·수치는 그대로). */
const HEX2TOK = Object.fromEntries(Object.entries(COL).map(([k, v]) => [v, k]));
function themeable(svg) {
  return svg.replace(/<(path|circle|rect|text)\b([^>]*)>/g, (m, tag, attrs) => {
    const cls = [];
    const s = attrs.match(/\bstroke="([^"]+)"/), f = attrs.match(/\bfill="([^"]+)"/);
    if (s && HEX2TOK[s[1]]) cls.push('s-' + HEX2TOK[s[1]]);
    if (s && s[1] === 'white') cls.push('halo');
    if (f && HEX2TOK[f[1]]) cls.push('f-' + HEX2TOK[f[1]]);
    if (!cls.length) return m;
    if (/\bclass="/.test(attrs)) return `<${tag}${attrs.replace(/\bclass="([^"]*)"/, (_, c) => `class="${c} ${cls.join(' ')}"`)}>`;
    return `<${tag} class="${cls.join(' ')}"${attrs}>`;
  });
}

/* 단계 묶음: idx 번째 fragment에서 cls 방식으로 나타난다 */
function step(cls, idx, inner, vars) {
  const st = vars ? ` style="${Object.entries(vars).map(([k, v]) => `--${k}:${v}`).join(';')}"` : '';
  return `<g class="fragment custom ${cls}" data-fragment-index="${idx}"${st}>${inner}</g>`;
}

/* 화살표: 선(.ln) + 화살촉(.hd). 선 길이는 그리기 효과에 쓴다 */
function arrowD(x0, y0, x1, y1, w = 3) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.max(Math.hypot(dx, dy), 1e-6), ux = dx / L, uy = dy / L;
  const hl = Math.min(5 * w, L), hw = 2.3 * w, bx = x1 - ux * hl, by = y1 - uy * hl, px = -uy, py = ux;
  return { len: L - hl + 1, ln: `M${r2(x0)} ${r2(y0)} L${r2(bx)} ${r2(by)}`,
    hd: `M${r2(x1)} ${r2(y1)} L${r2(bx + px * hw)} ${r2(by + py * hw)} L${r2(bx - px * hw)} ${r2(by - py * hw)} Z` };
}
function arrow(x0, y0, x1, y1, color = COL.ink, w = 3) {
  const a = arrowD(x0, y0, x1, y1, w);
  return `<path class="ln" d="${a.ln}" stroke="${color}" stroke-width="${w}" fill="none" style="--len:${r2(a.len)}px"/>` +
    `<path class="hd" d="${a.hd}" fill="${color}"/>`;
}
/* 계산으로 움직이는 그림(ANIMS)에서 arrow()로 그린 화살표를 다시 그린다. g는 화살표를 감싼 요소 */
function setArrow(g, x0, y0, x1, y1, w = 3) {
  const a = arrowD(x0, y0, x1, y1, w);
  g.querySelector('.ln').setAttribute('d', a.ln);
  g.querySelector('.hd').setAttribute('d', a.hd);
}
/* 벡터 (vx, vy)를 점 (x0, y0)에서 k배로 그린다. 끝점을 돌려준다 */
function vec(x0, y0, v, k, color, w) {
  const x1 = x0 + N(v[0]) * k, y1 = y0 - N(v[1]) * k;
  return { s: arrow(x0, y0, x1, y1, color, w), x: x1, y: y1 };
}
function comps(x0, y0, v, k) {
  const x1 = x0 + N(v[0]) * k, y1 = y0 - N(v[1]) * k;
  return `<path d="M${r2(x0)} ${r2(y0)} L${r2(x1)} ${r2(y0)} L${r2(x1)} ${r2(y1)}" stroke="${COL.comp}" stroke-width="2" stroke-dasharray="6 5" fill="none"/>`;
}
function bar(x0, y0, x1, y1, w = 11, color = COL.bar) {
  return `<path d="M${r2(x0)} ${r2(y0)} L${r2(x1)} ${r2(y1)}" stroke="${color}" stroke-width="${w}" stroke-linecap="round" fill="none"/>`;
}
function line(x0, y0, x1, y1, color = '#999', w = 1.5, dash = '') {
  return `<path d="M${r2(x0)} ${r2(y0)} L${r2(x1)} ${r2(y1)}" stroke="${color}" stroke-width="${w}"${dash ? ` stroke-dasharray="${dash}"` : ''} fill="none"/>`;
}
function dot(x, y, r = 5.5, fill = COL.ink) { return `<circle cx="${r2(x)}" cy="${r2(y)}" r="${r}" fill="${fill}"/>`; }
const HALO = 'stroke="white" stroke-width="5" stroke-linejoin="round" paint-order="stroke"';
function text(x, y, s, o = {}) {
  const size = o.size || 18, anchor = o.anchor || 'start', color = o.color || COL.ink;
  const fam = o.fam === 'main' ? 'KaTeX_Main, "Times New Roman", serif' : SANS;
  return `<text x="${r2(x)}" y="${r2(y)}" font-family='${fam}' font-size="${size}" font-weight="${o.bold ? 700 : 400}" fill="${color}" text-anchor="${anchor}" ${HALO}${o.cls ? ` class="${o.cls}"` : ''}>${s}</text>`;
}
/* 점 이름(로만체) */
const pt = (x, y, s, anchor = 'start', size = 24) => text(x, y, s, { fam: 'main', size, anchor });
/* 벡터 이름: 이탤릭 글자 + 아래첨자 + 위 화살표. (x, y)는 글자의 왼쪽 아래 */
function vlabel(x, y, name, sub = '', color = COL.ink, size = 24) {
  const ss = size * 0.72;
  const subT = sub ? `<tspan font-family='KaTeX_Main, "Times New Roman", serif' font-style="normal" font-size="${r2(ss)}" dy="${r2(ss * 0.35)}">${sub}</tspan>` : '';
  const ya = y - size * 0.95, xa0 = x + size * 0.12, xa1 = x + size * 0.7;
  return `<text x="${r2(x)}" y="${r2(y)}" font-family='KaTeX_Math, "Times New Roman", serif' font-style="italic" font-size="${size}" fill="${color}" ${HALO}>${name}${subT}</text>` +
    `<path d="M${r2(xa0)} ${r2(ya)} L${r2(xa1)} ${r2(ya)}" stroke="${color}" stroke-width="1.6"/>` +
    `<path d="M${r2(xa1 + 3)} ${r2(ya)} L${r2(xa1 - 3)} ${r2(ya - 3)} L${r2(xa1 - 3)} ${r2(ya + 3)} Z" fill="${color}"/>`;
}
function fixedSupport(x, y, s = 13) {
  return `<path d="M${r2(x - s)} ${r2(y + s * 1.2)} L${r2(x)} ${r2(y)} L${r2(x + s)} ${r2(y + s * 1.2)} Z" fill="#eee" stroke="#777" stroke-width="1.5"/>` +
    line(x - s * 1.6, y + s * 1.2, x + s * 1.6, y + s * 1.2, '#777', 2);
}
/* 바퀴 받침: 위아래 방향으로만 받친다(옆으로 미끄러진다) */
function rollerSupport(x, y, s = 13) {
  return `<path d="M${r2(x - s)} ${r2(y + s * .9)} L${r2(x)} ${r2(y)} L${r2(x + s)} ${r2(y + s * .9)} Z" fill="#eee" stroke="#777" stroke-width="1.5"/>` +
    `<circle cx="${r2(x - s * .45)}" cy="${r2(y + s * 1.25)}" r="${r2(s * .32)}" fill="white" stroke="#777" stroke-width="1.5"/>` +
    `<circle cx="${r2(x + s * .45)}" cy="${r2(y + s * 1.25)}" r="${r2(s * .32)}" fill="white" stroke="#777" stroke-width="1.5"/>` +
    line(x - s * 1.6, y + s * 1.6, x + s * 1.6, y + s * 1.6, '#777', 2);
}
/* 벽: 세로선과 왼쪽 빗금 */
function wall(x, y0, y1, st = 18) {
  let h = line(x, y0, x, y1, '#555', 3);
  for (let y = y0 + 6; y < y1 - 8; y += st) h += line(x, y, x - 10, y + 10, '#999', 1.5);
  return h;
}

/* ---------------------------------------------------------------- 그림들 */
const FIGS = {};

/* 이음점과 막대, 좌표축 방향 */
FIGS.truss = () => {
  const g = new Fig(520, 250);
  const P = { A: [50, 200], B: [250, 200], C: [450, 200], D: [150, 80], E: [350, 80] };
  for (const [a, b] of ['AB', 'BC', 'DE', 'AD', 'DB', 'BE', 'EC']) g.add(bar(...P[a], ...P[b], 12));
  for (const k in P) g.add(dot(...P[k], 7));
  g.add(`<circle cx="150" cy="80" r="17" fill="none" stroke="${COL.ink}" stroke-width="2"/>`);
  g.add(line(130, 66, 86, 36, COL.ink, 1.6), text(80, 32, '이음점', { anchor: 'end', size: 25, bold: true }));
  g.add(line(250, 74, 250, 40, COL.ink, 1.6), text(250, 32, '막대', { anchor: 'middle', size: 25, bold: true }));
  return g.svg('이음점과 막대');
};

/* 표지 장식: 빨대 다리(와렌 트러스) 옆모습 */
FIGS.trussCover = () => {
  const g = new Fig(960, 150), n = 6, w = 150, x0 = 30, yb = 130, yt = 20;
  const B = [...Array(n + 1)].map((_, i) => [x0 + i * w, yb]), T = [...Array(n)].map((_, i) => [x0 + w / 2 + i * w, yt]);
  for (let i = 0; i < n; i++) g.add(bar(...B[i], ...B[i + 1], 12), bar(...B[i], ...T[i], 12), bar(...T[i], ...B[i + 1], 12));
  for (let i = 0; i < n - 1; i++) g.add(bar(...T[i], ...T[i + 1], 12));
  for (const p of [...B, ...T]) g.add(dot(...p, 8, COL.soft));
  return g.svg('빨대 다리');
};

FIGS.axes = () => {
  const g = new Fig(220, 150);
  const ox = 40, oy = 120;
  g.add(arrow(ox, oy, 190, oy, COL.ink, 2.5), arrow(ox, oy, ox, 22, COL.ink, 2.5));
  g.add(text(198, oy + 6, 'x', { fam: 'main', size: 24 }).replace('font-weight="400"', 'font-weight="400" font-style="italic"'));
  g.add(text(ox - 8, 26, 'y', { fam: 'main', size: 24, anchor: 'end' }).replace('font-weight="400"', 'font-weight="400" font-style="italic"'));
  g.add(text(115, oy + 26, '오른쪽이 +', { size: 20, anchor: 'middle', color: COL.soft }));
  g.add(text(ox + 10, 50, '위쪽이 +', { size: 20, color: COL.soft }));
  return g.svg('좌표축 방향');
};

/* ① 힘은 화살표로: (3,4)와 (-3,4) */
FIGS.vec1 = () => {
  const u = 40, ox = 250, oy = 250, F = DATA.vec1.F, G = DATA.vec1.G;
  const g = new Fig(500, 310);
  for (let i = -4; i <= 4; i++) g.add(line(ox + i * u, oy + u, ox + i * u, oy - 5 * u, COL.grid, 1));
  for (let j = -1; j <= 5; j++) g.add(line(ox - 4 * u, oy - j * u, ox + 4 * u, oy - j * u, COL.grid, 1));
  g.add(arrow(ox - 4.4 * u, oy, ox + 4.6 * u, oy, COL.axis, 1.6), arrow(ox, oy + u + 10, ox, oy - 5.5 * u, COL.axis, 1.6));
  g.add(text(ox + 4.6 * u + 4, oy + 22, 'x', { fam: 'main', size: 22, color: COL.soft }), text(ox + 10, oy - 5.4 * u + 6, 'y', { fam: 'main', size: 22, color: COL.soft }));
  g.add(pt(ox - 8, oy + 24, 'O', 'end', 20));
  // 3단계: 직각삼각형
  g.add(step('fx-fade', 3, `<path d="M${ox} ${oy} L${ox + F[0] * u} ${oy} L${ox + F[0] * u} ${oy - F[1] * u} Z" fill="#e3ecf9"/>`));
  // 2단계: 성분
  g.add(step('fx-fade', 2, comps(ox, oy, F, u) +
    text(ox + F[0] * u / 2, oy + 26, String(F[0]), { anchor: 'middle', size: 22, bold: true }) +
    text(ox + F[0] * u + 10, oy - F[1] * u / 2 + 8, String(F[1]), { size: 22, bold: true })));
  // 4단계: (-3,4)
  g.add(step('fx-fade', 4, comps(ox, oy, G, u) +
    text(ox + G[0] * u / 2, oy + 26, '−3', { anchor: 'middle', size: 22, bold: true }) +
    text(ox + G[0] * u - 10, oy - G[1] * u / 2 + 8, String(G[1]), { size: 22, bold: true, anchor: 'end' })));
  const a = vec(ox, oy, G, u, COL.soft, 3);
  g.add(step('fx-draw', 4, a.s + `<g class="lb">${text(a.x - 8, a.y - 10, '(−3, 4)', { fam: 'main', size: 20, anchor: 'end' })}</g>`));
  // 1단계: (3,4)
  const b = vec(ox, oy, F, u, COL.ink, 3.5);
  g.add(step('fx-draw', 1, b.s + `<g class="lb">${vlabel(b.x + 8, b.y + 6, 'F')}</g>`));
  g.add(dot(ox, oy));
  return g.svg('벡터 (3, 4)와 성분');
};

/* ② 힘의 합: 화살표를 이어 붙이기 */
FIGS.sum = () => {
  const u = 36, px = 150, py = 178, D = DATA.sum;
  const g = new Fig(360, 350);
  for (let i = -3; i <= 4; i++) g.add(line(px + i * u, py + 4 * u, px + i * u, py - 4 * u, COL.grid, 1));
  for (let j = -4; j <= 4; j++) g.add(line(px - 3 * u, py - j * u, px + 4 * u, py - j * u, COL.grid, 1));
  const f1 = vec(px, py, D.F1, u), f2 = vec(px, py, D.F2, u);
  // 합 (2단계에 그리고 4단계에 사라짐)
  const s12 = [D.F1[0] + D.F2[0], D.F1[1] + D.F2[1]];
  const sm = vec(px, py, s12, u, COL.sum, 3.5);
  g.add(step('fx-out', 4, step('fx-draw', 2, sm.s + `<g class="lb">${text(sm.x - 34, sm.y + 4, '합', { size: 22, bold: true, color: COL.sum, anchor: 'end' })}</g>`)));
  g.add(f1.s, vlabel(f1.x + 6, f1.y + 24, 'F', '1'));
  g.add(f2.s, vlabel(f2.x - 34, f2.y + 6, 'F', '2'));
  // 1단계: F2 복사본을 F1 끝으로
  g.add(step('fx-move', 1, arrow(px, py, f2.x, f2.y, COL.soft, 3), { tx: `${D.F1[0] * u}px`, ty: `${-D.F1[1] * u}px` }));
  // 3단계: F3
  const f3 = vec(px, py, D.F3, u);
  g.add(step('fx-draw', 3, f3.s + `<g class="lb">${vlabel(f3.x - 38, f3.y + 4, 'F', '3')}</g>`));
  // 4단계: F3 복사본을 F1+F2 끝으로 → 출발점으로 돌아옴
  g.add(step('fx-move', 4, arrow(px, py, f3.x, f3.y, COL.soft, 3), { tx: `${s12[0] * u}px`, ty: `${-s12[1] * u}px` }));
  g.add(step('fx-ring', 4, `<circle cx="${px}" cy="${py}" r="11" fill="none" stroke="${COL.sum}" stroke-width="3.5"/>`));
  g.add(dot(px, py), pt(px - 10, py + 26, 'P', 'end', 22));
  return g.svg('힘의 합');
};

/* ③ 막대를 따라 작용하는 힘 */
FIGS.along = () => {
  const g = new Fig(470, 300);
  const jx = 290, jy = 120, bx = 110, by = 262;
  const L = Math.hypot(jx - bx, jy - by), ux = (bx - jx) / L, uy = (by - jy) / L;
  g.add(line(bx, by, jx - ux * 160, jy - uy * 160, '#aaa', 1.6, '5 5'));
  g.add(bar(jx, jy, bx, by, 14));
  g.add(text((jx + bx) / 2 - 30, (jy + by) / 2 - 12, '막대', { size: 20, anchor: 'end', color: COL.soft }));
  g.add(step('fx-draw', 1, arrow(jx, jy, jx + ux * 105, jy + uy * 105, COL.ink, 3.5) +
    `<g class="lb">${text(jx + ux * 105 + 24, jy + uy * 105 + 18, '막대 쪽을 향한다', { size: 20, bold: true })}</g>`));
  g.add(step('fx-draw', 2, arrow(jx, jy, jx - ux * 105, jy - uy * 105, COL.ink, 3.5) +
    `<g class="lb">${text(jx - ux * 105 - 6, jy - uy * 105 - 14, '막대 반대쪽을 향한다', { size: 20, bold: true, anchor: 'middle' })}</g>`));
  g.add(dot(jx, jy, 8), text(jx + 16, jy + 30, '이음점', { size: 20, color: COL.soft }));
  return g.svg('막대를 따라 작용하는 힘');
};

/* 당김·누름의 세 단계: 같은 막대의 오른쪽 끝을 ①과 ③에서 비교, ②에서 화살표가 뒤집혀 내려온다 */
FIGS.tc3 = () => {
  const g = new Fig(960, 440);
  const y1 = 92, y3 = 318;
  g.add(line(530, 46, 530, 432, '#cfcfcf', 1.5));
  g.add(line(0, 214, 960, 214, '#e0e0e0', 1.2, '4 4'), line(0, 282, 960, 282, '#e0e0e0', 1.2, '4 4'));
  // 줄 이름
  const rowLab = [[y1 + 6, '①', '막대가', '받는 힘'], [252, '②', '작용', '반작용'], [y3 + 6, '③', '이음점이', '받는 힘']];
  for (const [y, n, a, b] of rowLab) g.add(text(0, y - 14, n, { size: 22, bold: true }), text(30, y - 14, a, { size: 18, color: COL.soft, bold: true }), text(30, y + 9, b, { size: 18, color: COL.soft, bold: true }));
  for (const [x0, kind] of [[115, 't'], [545, 'c']]) {
    const t = kind === 't', c = t ? COL.pull : COL.push, cx = x0 + 205;
    const s = x0 + 95, e = x0 + 285;
    g.add(text(cx, 30, t ? '당김(인장)' : '누름(압축)', { size: 23, bold: true, anchor: 'middle', color: c }));
    // ① 막대 전체와 양 끝 이음점(점선 원)
    g.add(step('fx-fade', 1, t
      ? `<rect x="${s - 14}" y="${y1 - 7}" width="${e - s + 28}" height="14" fill="none" stroke="${c}" stroke-width="1.6" stroke-dasharray="5 4"/>`
      : `<path d="M${s} ${y1} Q${(s + e) / 2} ${y1 - 46} ${e} ${y1}" stroke="${c}" stroke-opacity=".28" stroke-width="14" fill="none"/>`));
    g.add(`<rect x="${s}" y="${y1 - 7}" width="${e - s}" height="14" fill="#9a9a9a" stroke="#555"/>`);
    g.add(`<circle cx="${s - 11}" cy="${y1}" r="11" fill="none" stroke="#bbb" stroke-width="2" stroke-dasharray="3 3"/>`);
    g.add(`<circle cx="${e + 11}" cy="${y1}" r="11" fill="none" stroke="#bbb" stroke-width="2" stroke-dasharray="3 3"/>`);
    const d = t ? 1 : -1;
    g.add(step('fx-draw', 1, arrow(e, y1, e + d * 62, y1, c, 4) + arrow(s, y1, s - d * 62, y1, c, 4)));
    const l1 = t ? ['이음점이 막대 끝을 바깥으로 당긴다.', '막대는 늘어나려 한다.']
      : ['이음점이 막대 끝을 안쪽으로 민다.', '막대는 줄어들려 하고,', '가는 막대는 옆으로 휘기도 한다.'];
    g.add(step('fx-fade', 1, l1.map((s_, i) => text(cx, y1 + 50 + i * 23, s_, { size: 18, anchor: 'middle' })).join('')));
    // ② 설명
    const l2 = t ? ['이음점이 막대를 당기면, 막대도 같은 크기의', '힘으로 이음점을 반대 방향으로 당긴다.']
      : ['이음점이 막대를 밀면, 막대도 같은 크기의', '힘으로 이음점을 반대 방향으로 민다.'];
    g.add(step('fx-fade', 2, l2.map((s_, i) => text(cx, 242 + i * 23, s_, { size: 18, anchor: 'middle', color: COL.ink })).join('')));
    // ③ 막대 오른쪽 부분과 이음점
    g.add(`<rect x="${e - 160}" y="${y3 - 7}" width="160" height="14" fill="#dcdcdc" stroke="#aaa"/>`);
    g.add(dot(e + 11, y3, 11, '#333'));
    // ② 오른쪽 끝 화살표의 복사본이 뒤집혀 ③ 이음점으로 내려온다
    const c1 = e + d * 31, c3 = e + 11 - d * 31;
    g.add(step('fx-move', 2, arrow(e, y1, e + d * 62, y1, c, 4), { tx: `${r2(c3 - c1)}px`, ty: `${y3 - y1}px`, rot: '180deg' }));
    g.add(step('fx-fade', 3, text(cx, y3 + 62, t ? '화살표가 막대 쪽을 향한다' : '화살표가 막대 반대쪽을 향한다', { size: 21, bold: true, anchor: 'middle', color: c })));
  }
  return g.svg('당김과 누름의 세 단계');
};

/* 예제 1 문제 그림 */
FIGS.ex1 = () => {
  const s = 34, k = 11, ox = 250, oy = 100, D = DATA.ex1;
  const g = new Fig(500, 290);
  const L = [ox + D.pos.L[0] * s, oy - D.pos.L[1] * s], R = [ox + D.pos.R[0] * s, oy - D.pos.R[1] * s];
  g.add(bar(ox, oy, ...L), bar(ox, oy, ...R), fixedSupport(...L), fixedSupport(...R));
  const a = vec(ox, oy, D.O.F1, k), b = vec(ox, oy, D.O.F2, k), c = vec(ox, oy, D.O.F3, k);
  g.add(a.s, b.s, c.s, dot(ox, oy));
  g.add(pt(ox + 14, oy + 8, 'O'), pt(L[0] - 22, L[1] + 8, 'L', 'end'), pt(R[0] + 22, R[1] + 8, 'R'));
  g.add(vlabel(a.x + 8, a.y + 10, 'F', '1'), vlabel(b.x - 38, b.y + 10, 'F', '2'), vlabel(c.x + 12, c.y - 4, 'F', '3'));
  return g.svg('예제 1의 이음점과 세 힘');
};

/* 예제 1 풀이: 성분 → 화살표 이어 붙이기 */
FIGS.ex1sol = () => {
  const k = 18, ox = 200, oy = 172, D = DATA.ex1.O;
  const g = new Fig(400, 350);
  g.add(bar(ox, oy, ox - 72, oy + 96), bar(ox, oy, ox + 72, oy + 96));
  g.add(text(ox - 84, oy + 112, 'L 쪽', { size: 19, color: COL.soft, anchor: 'end' }), text(ox + 84, oy + 112, 'R 쪽', { size: 19, color: COL.soft }));
  g.add(step('fx-fade', 1, comps(ox, oy, D.F1, k) + comps(ox, oy, D.F2, k) +
    text(ox + 1.5 * k, oy + 24, '3', { size: 20, bold: true, anchor: 'middle' }) +
    text(ox + 3 * k + 9, oy - 2 * k + 7, '4', { size: 20, bold: true }) +
    text(ox - 1.5 * k, oy + 24, '−3', { size: 20, bold: true, anchor: 'middle' }) +
    text(ox - 3 * k - 9, oy - 2 * k + 7, '4', { size: 20, bold: true, anchor: 'end' }) +
    text(ox + 12, oy + 4 * k + 8, '−8', { size: 20, bold: true })));
  const a = vec(ox, oy, D.F1, k), b = vec(ox, oy, D.F2, k), c = vec(ox, oy, D.F3, k);
  g.add(a.s, b.s, c.s);
  g.add(vlabel(a.x + 10, a.y + 12, 'F', '1'), vlabel(b.x - 40, b.y + 12, 'F', '2'), vlabel(c.x + 12, c.y - 6, 'F', '3'));
  // 3단계: F2를 F1 끝으로, 4단계: F3를 F1+F2 끝으로 → O로 돌아옴
  g.add(step('fx-move', 3, arrow(ox, oy, b.x, b.y, COL.soft, 3), { tx: `${D.F1[0] * k}px`, ty: `${-D.F1[1] * k}px` }));
  const s12 = [D.F1[0] + D.F2[0], D.F1[1] + D.F2[1]];
  g.add(step('fx-move', 4, arrow(ox, oy, c.x, c.y, COL.soft, 3), { tx: `${s12[0] * k}px`, ty: `${-s12[1] * k}px` }));
  g.add(step('fx-ring', 4, `<circle cx="${ox}" cy="${oy}" r="11" fill="none" stroke="${COL.sum}" stroke-width="3.5"/>`));
  g.add(dot(ox, oy), pt(ox - 18, oy - 12, 'O', 'end'));
  return g.svg('점 O에서 시작하는 세 힘');
};

/* 예제 1 이어서: 점 L, R이 받는 힘 */
FIGS.ex1LR = () => {
  const k = 15, D = DATA.ex1;
  const g = new Fig(560, 250);
  for (const [tag, x, y] of [['L', 150, 128], ['R', 410, 128]]) {
    const o = D[tag], toO = [-o.bar[0], -o.bar[1]];   // 막대는 점 O 쪽으로 뻗는다
    g.add(bar(x, y, x + toO[0] * 16, y - toO[1] * 16), fixedSupport(x, y + 3));
    const fb = vec(x, y, o.bar, k), fs = vec(x, y, o.sup, k);
    g.add(step('fx-fade', 3, comps(x, y, o.bar, k) + comps(x, y, o.sup, k)));
    g.add(step('fx-draw', 1, fb.s + `<g class="lb">${text(fb.x + (tag === 'L' ? -6 : 6), fb.y + 26, '막대가 미는 힘', { size: 24, anchor: 'middle', color: COL.soft })}</g>`));
    g.add(step('fx-draw', 2, fs.s + `<g class="lb">${text(fs.x + (tag === 'L' ? -16 : 16), fs.y + 2, '받침의 힘', { size: 24, anchor: tag === 'L' ? 'end' : 'start', color: COL.soft })}</g>`));
    g.add(dot(x, y), pt(x + (tag === 'L' ? 18 : -18), y + 40, tag, tag === 'L' ? 'start' : 'end', 25));
  }
  g.add(step('fx-fade', 3, text(280, 244, '점선은 x성분·y성분', { size: 23, anchor: 'middle', color: COL.soft })));
  return g.svg('점 L, R에서 시작하는 힘');
};

/* 벡터 값 글자: (−3, 0) */
const fmt = (x) => (x < 0 ? '−' : '') + Math.abs(x);
const fmtV = (v) => `(${fmt(v[0])}, ${fmt(v[1])})`;

/* 문제 1: 옷걸이. mode 'q'는 문제 그림, 'sol'은 (3)·(4) 풀이 그림
   (1단계 막대의 힘, 2단계 바깥 고리, 3단계 줄을 바깥 고리로 옮기면 막대의 힘이 뒤집혀 누름 → 당김) */
function hanger(mode) {
  const D = DATA.p1, s = 30, k = 11, x0 = 130, y0 = 205, sol = mode === 'sol';
  const g = new Fig(500, 300);
  const at = (p) => [x0 + p[0] * s, y0 - p[1] * s];
  const A = at(D.pos.A), B = at(D.pos.B), C = at(D.pos.C);
  const hook = (x, y) => `<path d="M${x} ${y} L${x} ${y - 14} A11 11 0 1 1 ${x + 22} ${y - 14} L${x + 22} ${y - 8}" stroke="${COL.soft}" stroke-width="3.5" stroke-linecap="round" fill="none"/>`;
  const rope = (P, v) => line(P[0], P[1], P[0] + v[0] * s, P[1] - v[1] * s, COL.axis, 2.5);
  const ang = (v) => Math.atan2(-v[1], v[0]) * 180 / Math.PI;
  g.add(hook(...C));
  if (sol) g.add(step('fx-fade', 2, ['A', 'B'].map((t) => { const P = t === 'A' ? A : B, v = D.out[t].rope; return hook(P[0] + v[0] * s, P[1] - v[1] * s); }).join('')));
  g.add(bar(...A, ...B));
  for (const P of [A, B]) g.add(line(P[0], P[1], P[0], P[1] + 40, '#999', 1.5), `<rect x="${P[0] - 16}" y="${P[1] + 40}" width="32" height="26" fill="#ddd" stroke="#888"/>`);
  for (const [t, P] of [['A', A], ['B', B]]) {
    const F = D[t], o = D.out[t], sg = t === 'A' ? -1 : 1;
    const rp = rope(P, F.rope) + vec(...P, F.rope, k).s;
    g.add(vec(...P, F.W, k).s);
    if (!sol) { g.add(rp); continue; }
    const org = { ox: `${P[0]}px`, oy: `${P[1]}px` };
    g.add(step('fx-rot', 3, rp, { ...org, rot: `${r2(ang(o.rope) - ang(F.rope))}deg` }));
    g.add(step('fx-rot', 3, step('fx-draw', 1, vec(...P, F.bar, k, COL.ink, 3.5).s), { ...org, rot: `${-sg * 180}deg` }));
    g.add(step('fx-out', 3, step('fx-fade', 1, text(P[0] + sg * 8, P[1] - 14, fmtV(F.bar), { fam: 'main', size: 22, anchor: sg < 0 ? 'end' : 'start' }))));
    g.add(step('fx-fade', 3, text(P[0] - sg * 36, P[1] - 14, fmtV(o.bar), { fam: 'main', size: 22, anchor: 'middle' })));
  }
  for (const P of [A, B]) g.add(dot(...P));
  g.add(dot(...C, 4.5, COL.soft));
  g.add(pt(A[0] - 12, A[1] + 28, 'A', 'end'), pt(B[0] + 12, B[1] + 28, 'B'), pt(C[0] - 12, C[1] + 8, 'C', 'end'));
  if (sol) {
    g.add(step('fx-out', 3, step('fx-fade', 1, text((A[0] + B[0]) / 2, y0 + 42, '막대: 누름', { size: 24, bold: true, anchor: 'middle', color: COL.push }))));
    g.add(step('fx-fade', 3, text((A[0] + B[0]) / 2, y0 + 42, '막대: 당김', { size: 24, bold: true, anchor: 'middle', color: COL.pull })));
  } else {
    g.add(text((A[0] + C[0]) / 2 - 16, (A[1] + C[1]) / 2, '줄', { size: 21, anchor: 'end', color: COL.soft }),
      text((B[0] + C[0]) / 2 + 16, (B[1] + C[1]) / 2, '줄', { size: 21, color: COL.soft }),
      text(C[0], y0 + 30, '막대', { size: 21, anchor: 'middle', color: COL.soft }),
      text(A[0] + 24, y0 + 62, '물체', { size: 21, color: COL.soft }), text(B[0] - 24, y0 + 62, '물체', { size: 21, anchor: 'end', color: COL.soft }));
  }
  return g.svg(sol ? '막대의 양 끝이 받는 힘과 줄을 바깥 고리로 옮긴 모습' : '문제 1의 옷걸이 모양 구조');
}
FIGS.p1 = () => hanger('q');
FIGS.p1sol = () => hanger('sol');

/* 문제 1 (1): 점 A에서 화살표를 이어 붙여 막대의 힘을 찾는다 */
FIGS.p1A = () => {
  const k = 26, px = 150, py = 160, D = DATA.p1.A;
  const g = new Fig(380, 300);
  g.add(bar(px, py, px + 210, py), line(px, py, px + 3 * 36, py - 4 * 36, COL.axis, 2.5));
  g.add(text(px + 210, py + 34, '막대', { size: 21, anchor: 'end', color: COL.soft }), text(px + 3 * 36 + 8, py - 4 * 36 + 18, '줄', { size: 21, color: COL.soft }));
  const f1 = vec(px, py, D.W, k), f2 = vec(px, py, D.rope, k), f3 = vec(px, py, D.bar, k);
  const s12 = [D.W[0] + D.rope[0], D.W[1] + D.rope[1]], sm = vec(px, py, s12, k, COL.sum, 3.5);
  g.add(step('fx-out', 2, step('fx-draw', 1, sm.s + `<g class="lb">${text(sm.x + 10, sm.y + 30, '합', { size: 22, bold: true, color: COL.sum })}</g>`)));
  g.add(f1.s, vlabel(f1.x + 10, f1.y, 'F', '1'), f2.s, vlabel(f2.x + 8, f2.y + 16, 'F', '2'));
  g.add(step('fx-move', 1, arrow(px, py, f2.x, f2.y, COL.soft, 3), { tx: `${D.W[0] * k}px`, ty: `${-D.W[1] * k}px` }));
  g.add(step('fx-draw', 2, f3.s + `<g class="lb">${vlabel(f3.x - 12, f3.y - 14, 'F', '3')}</g>`));
  g.add(step('fx-move', 2, arrow(px, py, f3.x, f3.y, COL.soft, 3), { tx: `${s12[0] * k}px`, ty: `${-s12[1] * k}px` }));
  g.add(step('fx-ring', 2, `<circle cx="${px}" cy="${py}" r="11" fill="none" stroke="${COL.sum}" stroke-width="3.5"/>`));
  g.add(dot(px, py), pt(px - 14, py + 30, 'A', 'end'));
  return g.svg('점 A가 받는 힘을 이어 붙이기');
};

/* 문제 2: 선반 받침. P(0,0), A(-4,0), B(-4,-3)는 벽 위의 점 */
FIGS.p2 = () => {
  const s = 46, k = 6.2, px = 330, py = 80, D = DATA.p2;
  const g = new Fig(500, 270);
  const A = [px - 4 * s, py], B = [px - 4 * s, py + 3 * s];
  g.add(wall(A[0], 20, 255), text(A[0] - 16, 24, '벽', { size: 21, anchor: 'end', color: COL.soft }));
  g.add(bar(px, py, ...A), bar(px, py, ...B));
  const t1 = vec(px, py, D.P.F1, k), t2 = vec(px, py, D.P.F2, k), t3 = vec(px, py, D.P.F3, k);
  g.add(t1.s, t2.s, t3.s);
  g.add(vlabel(t1.x - 2, t1.y + 36, 'F', '1'), vlabel(t2.x + 10, t2.y + 10, 'F', '2'), vlabel(t3.x + 12, t3.y, 'F', '3'));
  g.add(dot(...A, 5, COL.soft), dot(...B, 5, COL.soft), dot(px, py));
  g.add(pt(px + 4, py - 14, 'P'), pt(A[0] + 12, A[1] - 12, 'A'), pt(B[0] + 14, B[1] + 28, 'B'));
  return g.svg('문제 2의 선반 받침');
};

/* 문제 2 (1): 점 P에서 화살표 이어 붙이기 */
FIGS.p2P = () => {
  const k = 17, px = 285, py = 200, D = DATA.p2.P;
  const g = new Fig(480, 330);
  g.add(bar(px, py, px - 160, py), bar(px, py, px - 128, py + 96));
  g.add(text(px - 166, py + 8, 'A 쪽', { size: 21, anchor: 'end', color: COL.soft }), text(px - 136, py + 112, 'B 쪽', { size: 21, anchor: 'end', color: COL.soft }));
  const f1 = vec(px, py, D.F1, k), f2 = vec(px, py, D.F2, k), f3 = vec(px, py, D.F3, k);
  const s12 = [D.F1[0] + D.F2[0], D.F1[1] + D.F2[1]], sm = vec(px, py, s12, k, COL.sum, 3.5);
  g.add(step('fx-out', 2, step('fx-draw', 1, sm.s + `<g class="lb">${text(sm.x + 12, sm.y + 24, '합', { size: 22, bold: true, color: COL.sum })}</g>`)));
  g.add(f1.s, f2.s, f3.s, vlabel(f1.x + 4, f1.y - 22, 'F', '1'), vlabel(f2.x + 8, f2.y + 14, 'F', '2'), vlabel(f3.x + 12, f3.y - 4, 'F', '3'));
  g.add(step('fx-move', 1, arrow(px, py, f2.x, f2.y, COL.soft, 3), { tx: `${D.F1[0] * k}px`, ty: `${-D.F1[1] * k}px` }));
  g.add(step('fx-move', 2, arrow(px, py, f3.x, f3.y, COL.soft, 3), { tx: `${s12[0] * k}px`, ty: `${-s12[1] * k}px` }));
  g.add(step('fx-ring', 2, `<circle cx="${px}" cy="${py}" r="11" fill="none" stroke="${COL.sum}" stroke-width="3.5"/>`));
  g.add(dot(px, py), pt(px + 14, py + 28, 'P'));
  return g.svg('점 P에서 시작하는 세 힘');
};

/* 문제 2 (2): 벽 위의 점 A, B가 받는 힘 */
FIGS.p2wall = () => {
  const s = 46, k = 6, wx = 150, D = DATA.p2;
  const g = new Fig(440, 330);
  const A = [wx, 90], B = [wx, 90 + 3 * s], P = [wx + 4 * s, 90];
  g.add(wall(wx, 30, 320), bar(...A, ...P), bar(...B, ...P), dot(...P, 5, COL.soft), pt(P[0] + 10, P[1] - 12, 'P'));
  const ab = vec(...A, D.A.bar, k), aw = vec(...A, D.A.wall, k), bb = vec(...B, D.B.bar, k), bw = vec(...B, D.B.wall, k);
  const lab = (x, y, s_, anchor) => `<g class="lb">${text(x, y, s_, { size: 21, anchor, color: COL.soft })}</g>`;
  g.add(step('fx-draw', 1, ab.s + lab(ab.x + 2, ab.y - 16, '막대의 힘', 'start') + bb.s + lab(bb.x - 6, bb.y + 26, '막대의 힘', 'end')));
  g.add(step('fx-draw', 2, aw.s + lab(aw.x - 6, aw.y - 16, '벽의 힘', 'end') + bw.s + lab(bw.x + 22, bw.y + 34, '벽의 힘', 'start')));
  g.add(dot(...A), dot(...B), pt(A[0] + 10, A[1] + 30, 'A'), pt(B[0] + 10, B[1] - 14, 'B'));
  return g.svg('점 A, B에서 시작하는 힘');
};

/* 문제 2 (3): 하중이 6 → 10으로 커지고(ANIMS.p2heavy), 남는 힘 (0,-4)가 나타나며 점 P가 처진다(ANIMS.p2sag) */
const P2LOAD = { s: 44, k: 9, P: [320, 110], sag: 18 };
FIGS.p2load = () => {
  const { s, P } = P2LOAD, g = new Fig(480, 330);
  const A = [P[0] - 4 * s, P[1]], B = [P[0] - 4 * s, P[1] + 3 * s];
  g.add(wall(A[0], 30, 300));
  g.add(`<circle cx="${P[0]}" cy="${P[1]}" r="9" fill="none" stroke="${COL.comp}" stroke-width="2" stroke-dasharray="4 3"/>`);
  g.add(`<g class="bA">${bar(...A, ...P)}</g><g class="bB">${bar(...B, ...P)}</g>`);
  g.add(`<g class="frc"><g class="f1">${arrow(0, 0, 1, 0)}</g><g class="f2">${arrow(0, 0, 1, 0)}</g><g class="ld">${arrow(0, 0, 1, 0)}</g>` +
    `<g class="tl">${text(0, 0, '하중', { size: 21, color: COL.soft })}</g></g>`);
  g.add(`<g class="res">${arrow(0, 0, 1, 0, COL.sum, 4.5)}<g class="tr">${text(0, 0, '합 (0, −4)', { size: 23, bold: true, color: COL.sum })}</g></g>`);
  g.add(`<g class="pd">${dot(0, 0)}</g>`, dot(...A, 5, COL.soft), dot(...B, 5, COL.soft));
  g.add(pt(A[0] + 12, A[1] - 12, 'A'), pt(B[0] + 14, B[1] + 28, 'B'), `<g class="tp">${pt(0, 0, 'P')}</g>`);
  return g.svg('하중이 커졌을 때 점 P가 받는 힘');
};
function p2loadDraw(slide, part) {
  const svg = slide.querySelector('[data-fig="p2load"] svg');
  if (!svg) return;
  const st = Object.assign(svg._st || (svg._st = { heavy: 0, sag: 0 }), part);
  const { s, k, sag } = P2LOAD, D = DATA.p2.P;
  const x = P2LOAD.P[0], y = P2LOAD.P[1] + sag * st.sag, A = [x - 4 * s, P2LOAD.P[1]], B = [x - 4 * s, P2LOAD.P[1] + 3 * s];
  const q = (sel) => svg.querySelector(sel);
  q('.bA path').setAttribute('d', `M${A[0]} ${A[1]} L${r2(x)} ${r2(y)}`);
  q('.bB path').setAttribute('d', `M${B[0]} ${B[1]} L${r2(x)} ${r2(y)}`);
  const load = -(6 + (-DATA.p2.heavy[1] - 6) * st.heavy);
  setArrow(q('.f1'), x, y, x + D.F1[0] * k, y - D.F1[1] * k);
  setArrow(q('.f2'), x, y, x + D.F2[0] * k, y - D.F2[1] * k);
  setArrow(q('.ld'), x, y, x, y - load * k);
  const tl = q('.tl text'); tl.setAttribute('x', x + 12); tl.setAttribute('y', r2(y - load * k - 4));
  q('.frc').style.opacity = 1 - 0.7 * st.sag;
  const res = DATA.p2.heavy[1] + D.F1[1] + D.F2[1];
  setArrow(q('.res'), x, y, x, y - res * k, 4.5);
  const tr = q('.tr text'); tr.setAttribute('x', x + 16); tr.setAttribute('y', r2(y - res * k * 0.6));
  q('.res').style.opacity = st.sag;
  q('.pd circle').setAttribute('cx', x); q('.pd circle').setAttribute('cy', r2(y));
  const tp = q('.tp text'); tp.setAttribute('x', x + 6); tp.setAttribute('y', r2(y - 16));
}

/* 이등변삼각형 구조(밑변 4): A 고정 받침, B 바퀴 받침, C에 하중. h는 높이 */
function triFig(h, label) {
  const s = 42, A = [150, 212], B = [150 + 4 * s, 212], C = [150 + 2 * s, 212 - h * s];
  const g = new Fig(500, 290);
  g.add(bar(...A, ...C, 12), bar(...C, ...B, 12), bar(...A, ...B, 12));
  g.add(fixedSupport(A[0], A[1] + 3), rollerSupport(B[0], B[1] + 3));
  g.add(text(A[0], A[1] + 52, '고정 받침', { size: 21, anchor: 'middle', color: COL.soft }), text(B[0], B[1] + 52, '바퀴 받침', { size: 21, anchor: 'middle', color: COL.soft }));
  const a = Math.atan2(h, 2), r = 40;
  g.add(`<path d="M${A[0] + r} ${A[1]} A${r} ${r} 0 0 0 ${r2(A[0] + r * Math.cos(a))} ${r2(A[1] - r * Math.sin(a))}" fill="none" stroke="${COL.soft}" stroke-width="1.8"/>`);
  g.add(text(A[0] + r + 8, A[1] - 8, label, { size: 21 }));
  const w = vec(...C, [0, -6], 10);
  g.add(w.s, text(w.x + 10, w.y - 2, '하중', { size: 21, color: COL.soft }));
  g.add(dot(...A), dot(...B), dot(...C));
  g.add(pt(A[0] - 18, A[1] + 6, 'A', 'end'), pt(B[0] + 20, B[1] + 6, 'B'), pt(C[0] + 14, C[1] - 6, 'C'));
  return g.svg(`밑각 ${label}인 삼각형 구조`);
}
FIGS.ex2 = () => triFig(N(DATA.ex2.pos.C[1]), '60°');
FIGS.p4 = () => triFig(N(DATA.p4.pos.C[1]), '45°');

/* 예제 2 점 C: 방향(1단계) → y성분 3인 선(2단계) → k(1,√3)가 자라다 y성분 3에서 멈춤(3단계, ANIMS.ex2grow) → 성분(4단계) */
const EX2C = { k: 28, C: [230, 165], L: 150 };
FIGS.ex2C = () => {
  const { k, C, L } = EX2C, D = DATA.ex2.C, g = new Fig(460, 400);
  const u = [0.5, Math.sqrt(3) / 2];
  g.add(bar(...C, C[0] - L * u[0], C[1] + L * u[1]), bar(...C, C[0] + L * u[0], C[1] + L * u[1]));
  g.add(text(C[0] - L * u[0] - 8, C[1] + L * u[1] + 24, 'A 쪽', { size: 21, anchor: 'end', color: COL.soft }), text(C[0] + L * u[0] + 8, C[1] + L * u[1] + 24, 'B 쪽', { size: 21, color: COL.soft }));
  g.add(step('fx-fade', 1, line(...C, C[0] + 150 * u[0], C[1] - 150 * u[1], COL.comp, 2, '7 6') + line(...C, C[0] - 150 * u[0], C[1] - 150 * u[1], COL.comp, 2, '7 6')));
  const gy = C[1] - 3 * k;
  g.add(step('fx-fade', 2, line(70, gy, 400, gy, COL.sum, 2.2, '8 5') + text(440, gy - 12, 'y성분 3', { size: 21, bold: true, color: COL.sum, anchor: 'end' })));
  const w = vec(...C, D.W, k);
  g.add(w.s, vlabel(w.x + 12, w.y - 4, 'W'));
  g.add(step('fx-fade', 4, comps(...C, D.F1, k) + comps(...C, D.F2, k) +
    text(C[0] + N(D.F1[0]) * k / 2, C[1] + 26, '√3', { size: 21, bold: true, anchor: 'middle' }) +
    text(C[0] - N(D.F1[0]) * k / 2, C[1] + 26, '−√3', { size: 21, bold: true, anchor: 'middle' })));
  g.add(`<g class="g1">${arrow(0, 0, 1, 0, COL.ink, 3.5)}</g><g class="g2">${arrow(0, 0, 1, 0, COL.ink, 3.5)}</g>`);
  g.add(`<g class="kt">${text(14, 40, '', { fam: 'main', size: 22 })}</g>`);
  const t1 = [C[0] + N(D.F1[0]) * k, C[1] - N(D.F1[1]) * k], t2 = [C[0] + N(D.F2[0]) * k, C[1] - N(D.F2[1]) * k];
  g.add(step('fx-fade', 4, vlabel(t1[0] + 10, t1[1] + 6, 'F', '1') + vlabel(t2[0] - 38, t2[1] + 6, 'F', '2')));
  g.add(dot(...C), pt(C[0] - 58, C[1] + 8, 'C', 'end'));
  return g.svg('점 C에서 시작하는 세 힘');
};
function ex2grow(slide, t) {
  const svg = slide.querySelector('[data-fig="ex2C"] svg');
  if (!svg) return;
  const { k, C } = EX2C, kk = Math.sqrt(3) * t;   // 화살표 k(1, √3): y성분 √3·k가 3이 되면(k = √3) 멈춘다
  for (const [cls, sx] of [['.g1', 1], ['.g2', -1]]) {
    const g = svg.querySelector(cls);
    setArrow(g, ...C, C[0] + sx * kk * k, C[1] - kk * Math.sqrt(3) * k, 3.5);
    g.style.opacity = t > 0.02 ? 1 : 0;
  }
  const kt = svg.querySelector('.kt text');
  kt.textContent = t <= 0 ? '' : t >= 1 ? 'k(1, √3),  k = √3' : `k(1, √3),  k = ${kk.toFixed(2)}`;
}

/* 예제 2 점 A: 빗변이 미는 힘 → 받침의 힘 → 밑변의 힘 */
function jointA(D, k, opt = {}) {
  const g = new Fig(opt.w || 460, opt.h || 300), A = opt.A || [200, 168];
  const c = DATA[opt.key].pos.C, cl = Math.hypot(N(c[0]), N(c[1])), cu = [N(c[0]) / cl, N(c[1]) / cl];
  g.add(bar(...A, A[0] + 150 * cu[0], A[1] - 150 * cu[1]), bar(...A, A[0] + 200, A[1]), fixedSupport(A[0], A[1] + 3));
  g.add(text(A[0] + 150 * cu[0] + 8, A[1] - 150 * cu[1] + 6, 'C 쪽', { size: 21, color: COL.soft }), text(A[0] + 196, A[1] + 30, 'B 쪽', { size: 21, anchor: 'end', color: COL.soft }));
  const g1 = vec(...A, D.AC, k), g2 = vec(...A, D.sup, k), g3 = vec(...A, D.AB, k);
  const lab = (x, y, s_, anchor = 'end') => `<g class="lb">${text(x, y, s_, { size: 21, anchor, color: COL.soft })}</g>`;
  g.add(step('fx-draw', 1, comps(...A, D.AC, k) + g1.s + lab(g1.x - 10, g1.y + 6, '빗변이 미는 힘')));
  g.add(step('fx-draw', 2, g2.s + lab(g2.x - 12, g2.y + 10, '받침의 힘')));
  g.add(step('fx-draw', 3, g3.s + lab(g3.x + 4, g3.y + 50, '밑변의 힘', 'middle')));
  g.add(dot(...A), pt(A[0] + 14, A[1] - 12, 'A'));
  return g.svg('점 A에서 시작하는 세 힘');
}
FIGS.ex2A = () => jointA(DATA.ex2.A, 26, { key: 'ex2' });

/* 문제 4 (1)·(2): 점 C와 점 A가 받는 힘 */
FIGS.p4CA = () => {
  const k = 16, D = DATA.p4, g = new Fig(400, 470);
  const C = [200, 126], u = 1 / Math.SQRT2;
  g.add(text(10, 30, '점 C', { size: 22, bold: true }), text(10, 290, '점 A', { size: 22, bold: true }), line(0, 256, 400, 256, COL.grid, 1.5));
  let s1 = bar(...C, C[0] - 90 * u, C[1] + 90 * u) + bar(...C, C[0] + 90 * u, C[1] + 90 * u);
  const f1 = vec(...C, D.C.F1, k), f2 = vec(...C, D.C.F2, k), w = vec(...C, D.C.W, k);
  s1 += comps(...C, D.C.F1, k) + comps(...C, D.C.F2, k) + f1.s + f2.s + w.s + dot(...C) +
    vlabel(f1.x + 8, f1.y + 8, 'F', '1') + vlabel(f2.x - 36, f2.y + 8, 'F', '2') + vlabel(w.x + 12, w.y - 2, 'W');
  g.add(step('fx-fade', 1, s1));
  const A = [140, 380];
  let s2 = bar(...A, A[0] + 110 * u, A[1] - 110 * u) + bar(...A, A[0] + 190, A[1]) + fixedSupport(A[0], A[1] + 3);
  const a1 = vec(...A, D.A.AC, k), a2 = vec(...A, D.A.sup, k), a3 = vec(...A, D.A.AB, k);
  s2 += a1.s + a2.s + a3.s + dot(...A) + vlabel(a1.x - 34, a1.y + 4, 'G', '1') + vlabel(a2.x - 34, a2.y + 16, 'G', '2') + vlabel(a3.x - 6, a3.y + 34, 'G', '3');
  g.add(step('fx-fade', 2, s2));
  return g.svg('점 C와 점 A가 받는 힘');
};

/* 문제 4 (3): 정삼각형(60°)이 직각이등변삼각형(45°)으로 낮아지면 빗변·밑변 힘이 커진다(ANIMS.p4morph) */
const P4M = { s: 50, A: [50, 290], k: 14, bx: 290, bs: 38 };
FIGS.p4morph = () => {
  const { s, A, bx } = P4M, g = new Fig(480, 330), h0 = 2 * Math.sqrt(3);
  const B = [A[0] + 4 * s, A[1]], C0 = [A[0] + 2 * s, A[1] - h0 * s];
  g.add(`<path d="M${A[0]} ${A[1]} L${r2(C0[0])} ${r2(C0[1])} L${B[0]} ${B[1]}" fill="none" stroke="${COL.comp}" stroke-width="2" stroke-dasharray="6 5"/>`);
  g.add(`<g class="tri">${bar(...A, ...C0, 12)}${bar(...C0, ...B, 12)}</g>`, bar(...A, ...B, 12));
  g.add(fixedSupport(A[0], A[1] + 3), rollerSupport(B[0], B[1] + 3));
  g.add(`<g class="ang">${text(A[0] + 50, A[1] - 8, '', { size: 21 })}</g>`);
  g.add(`<g class="c1">${arrow(0, 0, 1, 0)}</g><g class="c2">${arrow(0, 0, 1, 0)}</g><g class="cw">${arrow(0, 0, 1, 0)}</g><g class="cd">${dot(0, 0)}</g>`);
  g.add(`<g class="cx">${line(0, 0, 1, 0, COL.push, 3)}</g>`);
  for (const [i, name, col, y] of [[1, '빗변', COL.push, 110], [2, '밑변', COL.pull, 200]]) {
    g.add(`<g class="m${i}t">${text(bx, y, '', { size: 22, bold: true })}</g>`);
    g.add(`<rect class="m${i}" x="${bx}" y="${y + 12}" width="0" height="20" fill="${col}"/>`);
  }
  g.add(text(bx, 270, '힘의 크기', { size: 20, color: COL.soft }));
  return g.svg('삼각형 모양을 바꿀 때 막대의 힘');
};
function p4morph(slide, t) {
  const svg = slide.querySelector('[data-fig="p4morph"] svg');
  if (!svg) return;
  const { s, A, k, bx, bs } = P4M, h = 2 * Math.sqrt(3) + (2 - 2 * Math.sqrt(3)) * t;
  const C = [A[0] + 2 * s, A[1] - h * s], B = [A[0] + 4 * s, A[1]], fx = 6 / h;   // 빗변의 힘 (6/h, 3): y성분은 3 그대로
  const q = (sel) => svg.querySelector(sel);
  const [p1, p2] = q('.tri').querySelectorAll('path');
  p1.setAttribute('d', `M${A[0]} ${A[1]} L${r2(C[0])} ${r2(C[1])}`); p2.setAttribute('d', `M${r2(C[0])} ${r2(C[1])} L${B[0]} ${B[1]}`);
  setArrow(q('.c1'), ...C, C[0] + fx * k, C[1] - 3 * k); setArrow(q('.c2'), ...C, C[0] - fx * k, C[1] - 3 * k); setArrow(q('.cw'), ...C, C[0], C[1] + 6 * k);
  q('.cx path').setAttribute('d', `M${r2(C[0])} ${r2(C[1] - 3 * k)} L${r2(C[0] + fx * k)} ${r2(C[1] - 3 * k)}`);
  q('.cd circle').setAttribute('cx', r2(C[0])); q('.cd circle').setAttribute('cy', r2(C[1]));
  q('.ang text').textContent = `${Math.round(Math.atan2(h, 2) * 180 / Math.PI)}°`;
  const hyp = Math.hypot(fx, 3), base = fx;
  const exact = (a, b) => (t <= 0 ? a : t >= 1 ? b : null);
  q('.m1t text').textContent = `빗변  ${exact('2√3', '3√2') || hyp.toFixed(2)}`;
  q('.m2t text').textContent = `밑변  ${exact('√3', '3') || base.toFixed(2)}`;
  q('.m1').setAttribute('width', r2(hyp * bs)); q('.m2').setAttribute('width', r2(base * bs));
}

/* 계산으로 움직이는 그림: <span class="fragment custom" data-anim="이름">이 보이면 ANIMS[이름](화면, t)를 t = 0 → 1로,
   숨으면 1 → 0으로 부른다. 화면을 옮겨 오거나 주소로 바로 열면 기다리지 않고 그 상태로 그린다. */
const ANIMS = {
  p2heavy: (slide, t) => p2loadDraw(slide, { heavy: t }),
  p2sag: (slide, t) => p2loadDraw(slide, { sag: t }),
  ex2grow, p4morph,
};
function runAnim(f, to, instant) {
  const fn = ANIMS[f.dataset.anim], slide = f.closest('section');
  if (!fn) return;
  const from = f._t ?? 0, ease = f.dataset.ease === 'linear' ? (x) => x : (x) => x * x * (3 - 2 * x);
  const token = (f._tok = (f._tok || 0) + 1);
  if (instant || from === to) { f._t = to; fn(slide, to); return; }
  const dur = +(f.dataset.dur || 1400) * Math.abs(to - from), t0 = performance.now();
  const tick = (now) => {
    if (f._tok !== token) return;
    const p = Math.min(1, (now - t0) / dur);
    f._t = from + (to - from) * p;
    fn(slide, from + (to - from) * ease(p));
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
function syncAnims(ev) {
  const slide = Reveal.getCurrentSlide();
  const instant = !ev || ev.type === 'ready' || ev.type === 'slidechanged';
  slide.querySelectorAll('.fragment[data-anim]').forEach((f) => runAnim(f, f.classList.contains('visible') ? 1 : 0, instant));
}

/* 자리 표시 <div class="fig" data-fig="이름">에 그림을 넣는다 */
function mountFigs(root = document) {
  root.querySelectorAll('.fig[data-fig]').forEach((el) => {
    const make = FIGS[el.dataset.fig];
    el.innerHTML = make ? make() : `<p style="color:red">그림 없음: ${el.dataset.fig}</p>`;
  });
  root.querySelectorAll('.fragment[data-anim]').forEach((f) => runAnim(f, 0, true));
}

/* SESSION_FIGS_START */
/* 1차시: v0.8 원본의 좌표와 막대 연결을 유지한다. */
FIGS.t_warren = () => themeable(`<svg role="img" aria-label="t_warren" xmlns="http://www.w3.org/2000/svg" height="83.76" viewBox="0 0 300 83.76"><defs><marker id="t_warren-ar" markerWidth="21.6" markerHeight="21.6" refX="17.28" refY="7.02" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L19.44,7.02 L0,14.04 Z" fill="#111"/></marker><marker id="t_warren-ars" markerWidth="8" markerHeight="8" refX="5" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5 Z" fill="#111"/></marker></defs><rect width="100%" height="100%" fill="white"/>
<path d="M12 71.76 L81 71.76" stroke="#111" stroke-width="5.29" stroke-linecap="round"/>
<path d="M81 71.76 L150 71.76" stroke="#111" stroke-width="5.29" stroke-linecap="round"/>
<path d="M150 71.76 L219 71.76" stroke="#111" stroke-width="5.29" stroke-linecap="round"/>
<path d="M219 71.76 L288 71.76" stroke="#111" stroke-width="5.29" stroke-linecap="round"/>
<path d="M46.5 12 L115.5 12" stroke="#111" stroke-width="5.29" stroke-linecap="round"/>
<path d="M115.5 12 L184.5 12" stroke="#111" stroke-width="5.29" stroke-linecap="round"/>
<path d="M184.5 12 L253.5 12" stroke="#111" stroke-width="5.29" stroke-linecap="round"/>
<path d="M12 71.76 L46.5 12" stroke="#111" stroke-width="5.29" stroke-linecap="round"/>
<path d="M81 71.76 L115.5 12" stroke="#111" stroke-width="5.29" stroke-linecap="round"/>
<path d="M150 71.76 L184.5 12" stroke="#111" stroke-width="5.29" stroke-linecap="round"/>
<path d="M219 71.76 L253.5 12" stroke="#111" stroke-width="5.29" stroke-linecap="round"/>
<path d="M46.5 12 L81 71.76" stroke="#111" stroke-width="5.29" stroke-linecap="round"/>
<path d="M115.5 12 L150 71.76" stroke="#111" stroke-width="5.29" stroke-linecap="round"/>
<path d="M184.5 12 L219 71.76" stroke="#111" stroke-width="5.29" stroke-linecap="round"/>
<path d="M253.5 12 L288 71.76" stroke="#111" stroke-width="5.29" stroke-linecap="round"/>
<circle cx="12" cy="71.76" r="3.7" fill="white" stroke="#111" stroke-width="3.7"/>
<circle cx="81" cy="71.76" r="3.7" fill="white" stroke="#111" stroke-width="3.7"/>
<circle cx="150" cy="71.76" r="3.7" fill="white" stroke="#111" stroke-width="3.7"/>
<circle cx="219" cy="71.76" r="3.7" fill="white" stroke="#111" stroke-width="3.7"/>
<circle cx="288" cy="71.76" r="3.7" fill="white" stroke="#111" stroke-width="3.7"/>
<circle cx="46.5" cy="12" r="3.7" fill="white" stroke="#111" stroke-width="3.7"/>
<circle cx="115.5" cy="12" r="3.7" fill="white" stroke="#111" stroke-width="3.7"/>
<circle cx="184.5" cy="12" r="3.7" fill="white" stroke="#111" stroke-width="3.7"/>
<circle cx="253.5" cy="12" r="3.7" fill="white" stroke="#111" stroke-width="3.7"/>
</svg>`);
FIGS.t_pratt = () => themeable(`<svg role="img" aria-label="t_pratt" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 93"><defs><marker id="t_pratt-ar" markerWidth="21.6" markerHeight="21.6" refX="17.28" refY="7.02" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L19.44,7.02 L0,14.04 Z" fill="#111"/></marker><marker id="t_pratt-ars" markerWidth="8" markerHeight="8" refX="5" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5 Z" fill="#111"/></marker></defs><rect width="100%" height="100%" fill="white"/>
<path d="M12 81 L81 81" stroke="#111" stroke-width="5.29" stroke-linecap="round"/>
<path d="M81 81 L150 81" stroke="#111" stroke-width="5.29" stroke-linecap="round"/>
<path d="M150 81 L219 81" stroke="#111" stroke-width="5.29" stroke-linecap="round"/>
<path d="M219 81 L288 81" stroke="#111" stroke-width="5.29" stroke-linecap="round"/>
<path d="M12 12 L81 12" stroke="#111" stroke-width="5.29" stroke-linecap="round"/>
<path d="M81 12 L150 12" stroke="#111" stroke-width="5.29" stroke-linecap="round"/>
<path d="M150 12 L219 12" stroke="#111" stroke-width="5.29" stroke-linecap="round"/>
<path d="M219 12 L288 12" stroke="#111" stroke-width="5.29" stroke-linecap="round"/>
<path d="M12 81 L12 12" stroke="#111" stroke-width="5.29" stroke-linecap="round"/>
<path d="M288 81 L288 12" stroke="#111" stroke-width="5.29" stroke-linecap="round"/>
<path d="M81 81 L81 12" stroke="#111" stroke-width="5.29" stroke-linecap="round"/>
<path d="M150 81 L150 12" stroke="#111" stroke-width="5.29" stroke-linecap="round"/>
<path d="M219 81 L219 12" stroke="#111" stroke-width="5.29" stroke-linecap="round"/>
<path d="M12 12 L81 81" stroke="#111" stroke-width="5.29" stroke-linecap="round"/>
<path d="M81 12 L150 81" stroke="#111" stroke-width="5.29" stroke-linecap="round"/>
<path d="M150 81 L219 12" stroke="#111" stroke-width="5.29" stroke-linecap="round"/>
<path d="M219 81 L288 12" stroke="#111" stroke-width="5.29" stroke-linecap="round"/>
<circle cx="12" cy="81" r="3.7" fill="white" stroke="#111" stroke-width="3.7"/>
<circle cx="81" cy="81" r="3.7" fill="white" stroke="#111" stroke-width="3.7"/>
<circle cx="150" cy="81" r="3.7" fill="white" stroke="#111" stroke-width="3.7"/>
<circle cx="219" cy="81" r="3.7" fill="white" stroke="#111" stroke-width="3.7"/>
<circle cx="288" cy="81" r="3.7" fill="white" stroke="#111" stroke-width="3.7"/>
<circle cx="12" cy="12" r="3.7" fill="white" stroke="#111" stroke-width="3.7"/>
<circle cx="81" cy="12" r="3.7" fill="white" stroke="#111" stroke-width="3.7"/>
<circle cx="150" cy="12" r="3.7" fill="white" stroke="#111" stroke-width="3.7"/>
<circle cx="219" cy="12" r="3.7" fill="white" stroke="#111" stroke-width="3.7"/>
<circle cx="288" cy="12" r="3.7" fill="white" stroke="#111" stroke-width="3.7"/>
</svg>`);
FIGS.t_howe = () => themeable(`<svg role="img" aria-label="t_howe" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 93"><defs><marker id="t_howe-ar" markerWidth="21.6" markerHeight="21.6" refX="17.28" refY="7.02" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L19.44,7.02 L0,14.04 Z" fill="#111"/></marker><marker id="t_howe-ars" markerWidth="8" markerHeight="8" refX="5" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5 Z" fill="#111"/></marker></defs><rect width="100%" height="100%" fill="white"/>
<path d="M12 81 L81 81" stroke="#111" stroke-width="5.29" stroke-linecap="round"/>
<path d="M81 81 L150 81" stroke="#111" stroke-width="5.29" stroke-linecap="round"/>
<path d="M150 81 L219 81" stroke="#111" stroke-width="5.29" stroke-linecap="round"/>
<path d="M219 81 L288 81" stroke="#111" stroke-width="5.29" stroke-linecap="round"/>
<path d="M12 12 L81 12" stroke="#111" stroke-width="5.29" stroke-linecap="round"/>
<path d="M81 12 L150 12" stroke="#111" stroke-width="5.29" stroke-linecap="round"/>
<path d="M150 12 L219 12" stroke="#111" stroke-width="5.29" stroke-linecap="round"/>
<path d="M219 12 L288 12" stroke="#111" stroke-width="5.29" stroke-linecap="round"/>
<path d="M12 81 L12 12" stroke="#111" stroke-width="5.29" stroke-linecap="round"/>
<path d="M288 81 L288 12" stroke="#111" stroke-width="5.29" stroke-linecap="round"/>
<path d="M81 81 L81 12" stroke="#111" stroke-width="5.29" stroke-linecap="round"/>
<path d="M150 81 L150 12" stroke="#111" stroke-width="5.29" stroke-linecap="round"/>
<path d="M219 81 L219 12" stroke="#111" stroke-width="5.29" stroke-linecap="round"/>
<path d="M12 81 L81 12" stroke="#111" stroke-width="5.29" stroke-linecap="round"/>
<path d="M81 81 L150 12" stroke="#111" stroke-width="5.29" stroke-linecap="round"/>
<path d="M150 12 L219 81" stroke="#111" stroke-width="5.29" stroke-linecap="round"/>
<path d="M219 12 L288 81" stroke="#111" stroke-width="5.29" stroke-linecap="round"/>
<circle cx="12" cy="81" r="3.7" fill="white" stroke="#111" stroke-width="3.7"/>
<circle cx="81" cy="81" r="3.7" fill="white" stroke="#111" stroke-width="3.7"/>
<circle cx="150" cy="81" r="3.7" fill="white" stroke="#111" stroke-width="3.7"/>
<circle cx="219" cy="81" r="3.7" fill="white" stroke="#111" stroke-width="3.7"/>
<circle cx="288" cy="81" r="3.7" fill="white" stroke="#111" stroke-width="3.7"/>
<circle cx="12" cy="12" r="3.7" fill="white" stroke="#111" stroke-width="3.7"/>
<circle cx="81" cy="12" r="3.7" fill="white" stroke="#111" stroke-width="3.7"/>
<circle cx="150" cy="12" r="3.7" fill="white" stroke="#111" stroke-width="3.7"/>
<circle cx="219" cy="12" r="3.7" fill="white" stroke="#111" stroke-width="3.7"/>
<circle cx="288" cy="12" r="3.7" fill="white" stroke="#111" stroke-width="3.7"/>
</svg>`);
FIGS.t_x = () => themeable(`<svg role="img" aria-label="t_x" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 93"><defs><marker id="t_x-ar" markerWidth="21.6" markerHeight="21.6" refX="17.28" refY="7.02" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L19.44,7.02 L0,14.04 Z" fill="#111"/></marker><marker id="t_x-ars" markerWidth="8" markerHeight="8" refX="5" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5 Z" fill="#111"/></marker></defs><rect width="100%" height="100%" fill="white"/>
<path d="M12 81 L81 81" stroke="#111" stroke-width="5.29" stroke-linecap="round"/>
<path d="M81 81 L150 81" stroke="#111" stroke-width="5.29" stroke-linecap="round"/>
<path d="M150 81 L219 81" stroke="#111" stroke-width="5.29" stroke-linecap="round"/>
<path d="M219 81 L288 81" stroke="#111" stroke-width="5.29" stroke-linecap="round"/>
<path d="M12 12 L81 12" stroke="#111" stroke-width="5.29" stroke-linecap="round"/>
<path d="M81 12 L150 12" stroke="#111" stroke-width="5.29" stroke-linecap="round"/>
<path d="M150 12 L219 12" stroke="#111" stroke-width="5.29" stroke-linecap="round"/>
<path d="M219 12 L288 12" stroke="#111" stroke-width="5.29" stroke-linecap="round"/>
<path d="M12 81 L12 12" stroke="#111" stroke-width="5.29" stroke-linecap="round"/>
<path d="M288 81 L288 12" stroke="#111" stroke-width="5.29" stroke-linecap="round"/>
<path d="M12 81 L81 12" stroke="#111" stroke-width="5.29" stroke-linecap="round"/>
<path d="M12 12 L81 81" stroke="#111" stroke-width="5.29" stroke-linecap="round"/>
<path d="M81 81 L150 12" stroke="#111" stroke-width="5.29" stroke-linecap="round"/>
<path d="M81 12 L150 81" stroke="#111" stroke-width="5.29" stroke-linecap="round"/>
<path d="M150 81 L219 12" stroke="#111" stroke-width="5.29" stroke-linecap="round"/>
<path d="M150 12 L219 81" stroke="#111" stroke-width="5.29" stroke-linecap="round"/>
<path d="M219 81 L288 12" stroke="#111" stroke-width="5.29" stroke-linecap="round"/>
<path d="M219 12 L288 81" stroke="#111" stroke-width="5.29" stroke-linecap="round"/>
<circle cx="12" cy="81" r="3.7" fill="white" stroke="#111" stroke-width="3.7"/>
<circle cx="81" cy="81" r="3.7" fill="white" stroke="#111" stroke-width="3.7"/>
<circle cx="150" cy="81" r="3.7" fill="white" stroke="#111" stroke-width="3.7"/>
<circle cx="219" cy="81" r="3.7" fill="white" stroke="#111" stroke-width="3.7"/>
<circle cx="288" cy="81" r="3.7" fill="white" stroke="#111" stroke-width="3.7"/>
<circle cx="12" cy="12" r="3.7" fill="white" stroke="#111" stroke-width="3.7"/>
<circle cx="81" cy="12" r="3.7" fill="white" stroke="#111" stroke-width="3.7"/>
<circle cx="150" cy="12" r="3.7" fill="white" stroke="#111" stroke-width="3.7"/>
<circle cx="219" cy="12" r="3.7" fill="white" stroke="#111" stroke-width="3.7"/>
<circle cx="288" cy="12" r="3.7" fill="white" stroke="#111" stroke-width="3.7"/>
</svg>`);
FIGS.t_short = () => themeable(`<svg role="img" aria-label="t_short" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
<g fill="none" stroke="#111" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
<path stroke="#111" d="M20 20H180V180H20Z M20 20L100 100L180 180 M20 180L100 100"/>
</g>
<g fill="white" stroke="#111" stroke-width="4"><circle fill="white" stroke="#111" cx="20" cy="20" r="6"/><circle fill="white" stroke="#111" cx="180" cy="20" r="6"/><circle fill="white" stroke="#111" cx="180" cy="180" r="6"/><circle fill="white" stroke="#111" cx="20" cy="180" r="6"/><circle fill="white" stroke="#111" cx="100" cy="100" r="6"/></g>
</svg>`);
FIGS.plate_3d = () => themeable(`<svg role="img" aria-label="plate_3d" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 830 420"><defs><marker id="plate_3d-ar" markerWidth="14.98" markerHeight="14.98" refX="11.98" refY="4.87" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L13.48,4.87 L0,9.73 Z" fill="#111"/></marker><marker id="plate_3d-ars" markerWidth="8" markerHeight="8" refX="5" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5 Z" fill="#111"/></marker></defs><rect width="100%" height="100%" fill="white"/>
<polygon points="100,334.96 190,334.96 304,252.88 214,252.88" fill="#f2f2f2" stroke="#b5b5b5" stroke-width="1.5"/>
<polygon points="514,334.96 604,334.96 718,252.88 628,252.88" fill="#f2f2f2" stroke="#b5b5b5" stroke-width="1.5"/>
<path d="M268 265.84 L388 265.84" stroke="#bdbdbd" stroke-width="3.67" stroke-linecap="round"/>
<path d="M388 265.84 L508 265.84" stroke="#bdbdbd" stroke-width="3.67" stroke-linecap="round"/>
<path d="M508 265.84 L628 265.84" stroke="#bdbdbd" stroke-width="3.67" stroke-linecap="round"/>
<path d="M328 161.92 L448 161.92" stroke="#bdbdbd" stroke-width="3.67" stroke-linecap="round"/>
<path d="M448 161.92 L568 161.92" stroke="#bdbdbd" stroke-width="3.67" stroke-linecap="round"/>
<path d="M268 265.84 L328 161.92" stroke="#bdbdbd" stroke-width="3.67" stroke-linecap="round"/>
<path d="M388 265.84 L328 161.92" stroke="#bdbdbd" stroke-width="3.67" stroke-linecap="round"/>
<path d="M388 265.84 L448 161.92" stroke="#bdbdbd" stroke-width="3.67" stroke-linecap="round"/>
<path d="M508 265.84 L448 161.92" stroke="#bdbdbd" stroke-width="3.67" stroke-linecap="round"/>
<path d="M508 265.84 L568 161.92" stroke="#bdbdbd" stroke-width="3.67" stroke-linecap="round"/>
<path d="M628 265.84 L568 161.92" stroke="#bdbdbd" stroke-width="3.67" stroke-linecap="round"/>
<path d="M190 322 L268 265.84" stroke="#cfcfcf" stroke-width="2.57"/>
<path d="M310 322 L388 265.84" stroke="#cfcfcf" stroke-width="2.57"/>
<path d="M430 322 L508 265.84" stroke="#cfcfcf" stroke-width="2.57"/>
<path d="M550 322 L628 265.84" stroke="#cfcfcf" stroke-width="2.57"/>
<path d="M250 218.08 L328 161.92" stroke="#cfcfcf" stroke-width="2.57"/>
<path d="M370 218.08 L448 161.92" stroke="#cfcfcf" stroke-width="2.57"/>
<path d="M490 218.08 L568 161.92" stroke="#cfcfcf" stroke-width="2.57"/>
<path d="M250 218.08 L250 194.08" stroke="#777" stroke-width="5.5"/>
<path d="M370 218.08 L370 194.08" stroke="#777" stroke-width="5.5"/>
<path d="M490 218.08 L490 194.08" stroke="#777" stroke-width="5.5"/>
<path d="M328 161.92 L328 137.92" stroke="#777" stroke-width="5.5"/>
<path d="M448 161.92 L448 137.92" stroke="#777" stroke-width="5.5"/>
<path d="M568 161.92 L568 137.92" stroke="#777" stroke-width="5.5"/>
<polygon points="160,202.72 556,202.72 658,129.28 262,129.28" fill="#e8d9b5" stroke="#8a7a55" stroke-width="1.5" fill-opacity="0.6"/>
<path d="M190 322 L310 322" stroke="#222" stroke-width="4.77" stroke-linecap="round"/>
<path d="M310 322 L430 322" stroke="#222" stroke-width="4.77" stroke-linecap="round"/>
<path d="M430 322 L550 322" stroke="#222" stroke-width="4.77" stroke-linecap="round"/>
<path d="M250 218.08 L370 218.08" stroke="#222" stroke-width="4.77" stroke-linecap="round"/>
<path d="M370 218.08 L490 218.08" stroke="#222" stroke-width="4.77" stroke-linecap="round"/>
<path d="M190 322 L250 218.08" stroke="#222" stroke-width="4.77" stroke-linecap="round"/>
<path d="M310 322 L250 218.08" stroke="#222" stroke-width="4.77" stroke-linecap="round"/>
<path d="M310 322 L370 218.08" stroke="#222" stroke-width="4.77" stroke-linecap="round"/>
<path d="M430 322 L370 218.08" stroke="#222" stroke-width="4.77" stroke-linecap="round"/>
<path d="M430 322 L490 218.08" stroke="#222" stroke-width="4.77" stroke-linecap="round"/>
<path d="M550 322 L490 218.08" stroke="#222" stroke-width="4.77" stroke-linecap="round"/>
<circle cx="190" cy="322" r="2.94" fill="white" stroke="#222" stroke-width="2"/>
<circle cx="310" cy="322" r="2.94" fill="white" stroke="#222" stroke-width="2"/>
<circle cx="430" cy="322" r="2.94" fill="white" stroke="#222" stroke-width="2"/>
<circle cx="550" cy="322" r="2.94" fill="white" stroke="#222" stroke-width="2"/>
<circle cx="250" cy="218.08" r="2.94" fill="white" stroke="#222" stroke-width="2"/>
<circle cx="370" cy="218.08" r="2.94" fill="white" stroke="#222" stroke-width="2"/>
<circle cx="490" cy="218.08" r="2.94" fill="white" stroke="#222" stroke-width="2"/>
<path d="M383 144 L383 166 A26 9 0 0 0 435 166 L435 144 Z" fill="#9a9a9a" stroke="#555"/><ellipse cx="409" cy="144" rx="26" ry="9" fill="#bdbdbd" stroke="#555"/>
<path class="force" data-f="W" d="M409 49 L409 129" stroke="#111" stroke-width="2.34" fill="none" marker-end="url(#plate_3d-ar)"/>
<text x="419" y="62" font-family="Malgun Gothic, sans-serif" font-size="19.26" fill="#111" text-anchor="start" font-weight="bold" stroke="white" stroke-width="4.77" stroke-linejoin="round" paint-order="stroke">추의 무게</text>
<path class="force" data-f="half:0" d="M370 142.08 L370 182.08" stroke="#111" stroke-width="2.34" fill="none" marker-end="url(#plate_3d-ar)"/>
<text x="360" y="166.08" font-family="Malgun Gothic, sans-serif" font-size="19.26" fill="#111" text-anchor="end" font-weight="bold" stroke="white" stroke-width="4.77" stroke-linejoin="round" paint-order="stroke">절반</text>
<path class="force" data-f="half:2.6" d="M448 85.92 L448 125.92" stroke="#111" stroke-width="2.34" fill="none" marker-end="url(#plate_3d-ar)"/>
<text x="458" y="97.92" font-family="Malgun Gothic, sans-serif" font-size="19.26" fill="#111" text-anchor="start" font-weight="bold" stroke="white" stroke-width="4.77" stroke-linejoin="round" paint-order="stroke">절반</text>
<text x="566" y="208.72" font-family="Malgun Gothic, sans-serif" font-size="19.26" fill="#111" text-anchor="start" stroke="white" stroke-width="4.77" stroke-linejoin="round" paint-order="stroke">판</text>
<text x="552" y="356" font-family="Malgun Gothic, sans-serif" font-size="19.26" fill="#111" text-anchor="start" font-weight="bold" stroke="white" stroke-width="4.77" stroke-linejoin="round" paint-order="stroke">해석하는 트러스</text>
<text x="658" y="155.92" font-family="Malgun Gothic, sans-serif" font-size="19.26" fill="#111" text-anchor="start" stroke="white" stroke-width="4.77" stroke-linejoin="round" paint-order="stroke">반대쪽 트러스</text>
<path d="M213.02 405.28 Q 223 397.17 232.98 405.28 Q 223 413.39 213.02 405.28 Z" fill="white" stroke="#111" stroke-width="2"/><circle cx="223" cy="405.28" r="3.43" fill="#111"/>
<path d="M237 397.28 L295 353.44" stroke="#444" stroke-width="2.5" stroke-dasharray="7 5" marker-end="url(#plate_3d-ar)"/>
<text x="201" y="411.28" font-family="Malgun Gothic, sans-serif" font-size="19.26" fill="#111" text-anchor="end" font-weight="bold" stroke="white" stroke-width="4.77" stroke-linejoin="round" paint-order="stroke">옆에서 본 방향</text>
<path d="M57.02 236.76 Q 67 228.65 76.98 236.76 Q 67 244.87 57.02 236.76 Z" fill="white" stroke="#111" stroke-width="2"/><circle cx="67" cy="236.76" r="3.43" fill="#111"/>
<path d="M87 236.76 L157 236.76" stroke="#444" stroke-width="2.5" stroke-dasharray="7 5" marker-end="url(#plate_3d-ar)"/>
<text x="45" y="214.76" font-family="Malgun Gothic, sans-serif" font-size="19.26" fill="#111" text-anchor="start" font-weight="bold" stroke="white" stroke-width="4.77" stroke-linejoin="round" paint-order="stroke">다리 끝에서 본 방향</text>
</svg>`);
FIGS.plate_half = () => themeable(`<svg role="img" aria-label="plate_half" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 270"><defs><marker id="plate_half-ar" markerWidth="14.98" markerHeight="14.98" refX="11.98" refY="4.87" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L13.48,4.87 L0,9.73 Z" fill="#111"/></marker><marker id="plate_half-ars" markerWidth="8" markerHeight="8" refX="5" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5 Z" fill="#111"/></marker></defs><rect width="100%" height="100%" fill="white"/>
<rect x="141" y="148" width="18" height="67" fill="#d6d6d6" stroke="#777"/>
<rect x="139" y="140" width="22" height="8" fill="#888"/>
<rect x="361" y="148" width="18" height="67" fill="#d6d6d6" stroke="#777"/>
<rect x="359" y="140" width="22" height="8" fill="#888"/>
<rect x="105" y="128" width="310" height="12" fill="#e8d9b5" stroke="#8a7a55"/>
<rect x="230" y="90" width="60" height="38" fill="#999" stroke="#555"/>
<text x="260" y="116" font-family="Malgun Gothic, sans-serif" font-size="26" fill="#111" text-anchor="middle" stroke="white" stroke-width="4.77" stroke-linejoin="round" paint-order="stroke">추</text>
<path d="M70 215 L450 215" stroke="#444" stroke-width="2" fill="none"/>
<path class="force" data-f="W" d="M260 20 L260 86" stroke="#111" stroke-width="2.34" fill="none" marker-end="url(#plate_half-ar)"/>
<path class="force" data-f="L" d="M122 144 L122 177" stroke="#111" stroke-width="2.34" fill="none" marker-end="url(#plate_half-ar)"/>
<path class="force" data-f="R" d="M398 144 L398 177" stroke="#111" stroke-width="2.34" fill="none" marker-end="url(#plate_half-ar)"/>
<text x="274" y="38" font-family="Malgun Gothic, sans-serif" font-size="26" fill="#111" text-anchor="start" stroke="white" stroke-width="4.77" stroke-linejoin="round" paint-order="stroke">추의 무게</text>
<text x="112" y="170" font-family="Malgun Gothic, sans-serif" font-size="26" fill="#111" text-anchor="end" font-weight="bold" stroke="white" stroke-width="4.77" stroke-linejoin="round" paint-order="stroke">절반</text>
<text x="408" y="170" font-family="Malgun Gothic, sans-serif" font-size="26" fill="#111" text-anchor="start" font-weight="bold" stroke="white" stroke-width="4.77" stroke-linejoin="round" paint-order="stroke">절반</text>
<text x="422" y="138" font-family="Malgun Gothic, sans-serif" font-size="26" fill="#111" text-anchor="start" stroke="white" stroke-width="4.77" stroke-linejoin="round" paint-order="stroke">판</text>
<text x="150" y="250" font-family="Malgun Gothic, sans-serif" font-size="26" fill="#111" text-anchor="middle" stroke="white" stroke-width="4.77" stroke-linejoin="round" paint-order="stroke">해석하는 트러스</text>
<text x="370" y="250" font-family="Malgun Gothic, sans-serif" font-size="26" fill="#111" text-anchor="middle" stroke="white" stroke-width="4.77" stroke-linejoin="round" paint-order="stroke">반대쪽 트러스</text>
</svg>`);

/* 네 변 길이 140을 유지하는 평행사변형 변형. 삼각형은 고정한다. */
FIGS.rigidity = () => {
  const f = new Fig(840, 340);
  const poly = (pts, extra = '') => `<polygon points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="${COL.ink}" stroke-width="5" stroke-linejoin="round" ${extra}/>`;
  const tr = [[70,245],[290,245],[180,245-110*Math.sqrt(3)]];
  f.add(poly(tr), ...tr.map(p => dot(...p, 7)));
  f.add(text(180, 300, '세 변의 길이가 정해짐', {size: 26, anchor:'middle'}));
  f.add(`<polygon points="500,245 640,245 640,105 500,105" fill="none" stroke="${COL.comp}" stroke-width="2" stroke-dasharray="8 7"/>`);
  f.add(poly([[500,245],[640,245],[640,105],[500,105]], 'class="square-live"'));
  [[500,245],[640,245],[640,105],[500,105]].forEach((p,i) => f.add(`<circle class="square-joint j${i}" cx="${p[0]}" cy="${p[1]}" r="7" fill="${COL.ink}"/>`));
  f.add(text(600, 300, '네 변의 길이는 그대로', {size:26,anchor:'middle'}));
  return f.svg('세 변의 길이가 정해진 삼각형과 네 변의 길이를 유지하며 모양이 바뀌는 사각형');
};
ANIMS.rigidity = (slide,t) => {
  const svg = slide.querySelector('[data-fig="rigidity"] svg');
  if (!svg) return;
  const dx = 70*t, top = 245-Math.sqrt(140**2-dx**2);
  const pts = [[500,245],[640,245],[640+dx,top],[500+dx,top]];
  svg.querySelector('.square-live').setAttribute('points',pts.map(p => p.join(',')).join(' '));
  pts.forEach((p,i) => { const c = svg.querySelector('.j'+i); c.setAttribute('cx',p[0]); c.setAttribute('cy',p[1]); });
};

/* 원본 plate_side.svg와 같은 정삼각형 3칸·11막대. 화면 라벨만 재배치. */
FIGS.plate_side = () => {
  const f = new Fig(650,310), s = 70, ox = 75, oy = 205;
  const pos = {A:[0,0],B:[2,0],C:[4,0],D:[6,0],E:[1,Math.sqrt(3)],F:[3,Math.sqrt(3)],G:[5,Math.sqrt(3)]};
  const p = (j) => [ox+s*pos[j][0],oy-s*pos[j][1]];
  'AB BC CD EF FG AE BE BF CF CG DG'.split(' ').forEach(m => f.add(bar(...p(m[0]),...p(m[1]),7)));
  f.add(fixedSupport(...p('A'),16),rollerSupport(...p('D'),16));
  for (const j of 'EFG') { const [x,y]=p(j); f.add(arrow(x,y-55,x,y-9,COL.ink,2.3)); }
  for (const j of 'ABCDEFG') f.add(dot(...p(j),5));
  f.add(text(30,275,'고정 받침',{size:28}),text(540,275,'바퀴 받침',{size:28,anchor:'end'}));
  f.add(text(290,40,'같은 하중',{size:28,anchor:'middle'}));
  return f.svg('위쪽 이음점마다 같은 하중을 받는 정삼각형 3칸 트러스, 왼쪽 고정 받침과 오른쪽 바퀴 받침');
};

/* SESSION_FIGS_END */
