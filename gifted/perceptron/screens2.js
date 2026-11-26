/* 「퍼셉트론, 직선으로 판단하다」 — 보기 P13~P25. 2차 개정: 03_2차개정_명세서 §3-6~§3-13 */
'use strict';

/* ================================================================ 섹션 5 */
RENDER.P13 = () => {
  const v = predictValue('P12');
  const locked = predictLocked('P12');
  return `${head('쉬는 시간 전에 쓴 답', '쉬는 시간 전에 「접기와 회로는 어떻게 닮았을까?」에 이렇게 썼습니다. 오늘 2교시에 이 문장을 확인합니다. 다 읽었으면 다음으로 넘어가세요.')}
  <div class="card"><blockquote class="my-answer">${v ? esc(v) : '<span class="muted">아직 쓰지 않았어요.</span>'}</blockquote>${locked ? '' : '<p class="muted small">아직 확정하지 않은 답입니다.</p>'}</div>`;
};

RENDER.P14 = () => `${head('더해서 기준과 비교한다', '메일 프로그램은 「무료」, 「당첨」 같은 단어마다 점수를 정해 둡니다. 메일에 들어 있는 단어의 점수를 모두 더해, 합이 기준보다 크면 스팸함으로 보냅니다. 읽고 나서 다음으로 넘어가세요.', '5')}
  <div class="screen-layout two-col fig-left">
    <div class="card"><img class="comic" src="assets/spam.png" alt="메일이 받은 편지함과 스팸함 가운데 한곳으로만 들어가는 그림"><p class="caption">메일은 받은 편지함과 스팸함 가운데 한곳으로만 들어갑니다.</p></div>
    <div class="card stack">
      <p style="margin:0">4절 도입의 합격선(국어 점수와 수학 점수의 합이 150점보다 크면 합격)도 같은 방식입니다. <strong>더해서 기준과 비교한다</strong>는 것이 둘의 공통점입니다.</p>
      ${termBox('퍼셉트론', '입력을 더한 값이 기준보다 크면 1, 그렇지 않으면 0을 내는 판단 장치. 입력마다 다른 수를 곱해 더할 수도 있습니다. 스팸 메일에서 단어마다 점수가 다른 것과 같습니다.')}
      <img class="figure compact" src="assets/perceptron.svg" alt="입력 A와 B를 더하고 기준과 비교해 1 또는 0을 내는 퍼셉트론 그림">
      <p style="margin:0">이 화면에서 입력 A, B는 0 또는 1이고, 기준은 수 c로 나타냅니다. 곧 <strong>A+B &gt; c이면 1, 아니면 0</strong>입니다.</p>
    </div>
  </div>`;

/* 판단 장치 그림: A + B = s → s > c ? → 출력. o.names이면 칸마다 이름표 */
function deviceHtml(c10, pt, o = {}) {
  const c = fmtK(c10 / 10);
  const nm = (t) => (o.names ? `<small class="dv-name">${t}</small>` : '');
  if (!pt) return `<div class="device${o.names ? ' named' : ''}"><span class="dv-cell"><span class="dv-in">A, B</span>${nm('입력 (A, B)')}</span><span class="dv-op">→</span><span class="dv-cell"><span class="dv-sum">A+B</span>${nm('합')}</span><span class="dv-op">→</span><span class="dv-cell"><span class="dv-box">합 &gt; ${c} ?</span>${nm(`기준 ${c}와 비교`)}</span><span class="dv-op">→</span><span class="dv-cell"><span class="dv-out">?</span>${nm('출력 1·0')}</span></div>`;
  const s = pt[0] + pt[1], out = PG.thresholdOut(c10, pt);
  return `<div class="device on${o.names ? ' named' : ''}"><span class="dv-cell"><span class="dv-in">${pt[0]}, ${pt[1]}</span>${nm('입력 (A, B)')}</span><span class="dv-op">→</span><span class="dv-cell"><span class="dv-sum">${s}</span>${nm('합')}</span><span class="dv-op">→</span><span class="dv-cell"><span class="dv-box">${s} &gt; ${c} ? ${o.hideOut ? '…' : out ? '예' : '아니오'}</span>${nm(`기준 ${c}와 비교`)}</span><span class="dv-op">→</span><span class="dv-cell"><span class="dv-out${out && !o.hideOut ? ' one' : ''}">${o.hideOut ? '?' : out}</span>${nm('출력 1·0')}</span></div>`;
}
/* 19~21번 공통: 판단 장치 식 상자(03 §3-8) */
const ruleBoxC = () => '<div class="formula-box"><strong>판단 장치</strong> A+B &gt; c 이면 1, 아니면 0 <span class="muted small">(c: 기준 = 칸막이)</span></div>';
/* 네 점 표(작게): 점, A+B, 출력, 목표, 맞는가 */
function cTableHtml(c10, target, targetName) {
  return `<table class="truth compact"><thead><tr><th>점 (A, B)</th><th>A+B</th><th>출력</th><th>${targetName}</th><th>맞는가</th></tr></thead><tbody>${PG.POINTS.map((p, i) => {
    const out = PG.thresholdOut(c10, p);
    return `<tr><td>${COORD[i]}</td><td>${p[0] + p[1]}</td><td><strong>${out}</strong></td><td>${target[i]}</td><td>${out === target[i] ? '○' : '<span class="bad">×</span>'}</td></tr>`;
  }).join('')}</tbody></table>`;
}
function cPlaneSvg(c10, labels, extra = {}) {
  const c = c10 / 10;
  const L = PG.lineSum(c);
  const seg = PG.segmentIn(L);
  return planeSvg({ labels, fixed: seg ? [{ L, cls: 'fixed-line', ...sumLabel(c) }] : [], ...extra });
}
/* 직선 A+B=c의 이름표: 위쪽 끝(B=1.35) 근처, 점과 겹치지 않게 직선 옆에 둔다 */
function sumLabel(c, name) {
  let a = c - 1.35, b = 1.35;
  if (a < -0.45) { a = -0.45; b = c + 0.45; }
  const right = a <= 0.85;
  return { text: name || `${vA} + ${vB} = ${fmtK(c)}`, at: [a + (right ? 0.1 : -0.1), b + 0.03], anchor: right ? 'start' : 'end' };
}
/* 왼쪽 그림 칸: 평면 + 합으로 줄 세우기 */
function cFigure(c10s, labels, title, size = 'small', extraBelow = '') {
  const plane = c10s.length === 1 ? cPlaneSvg(c10s[0], labels, { title })
    : planeSvg({ labels, fixed: [{ L: PG.lineSum(0.5), cls: 'fixed-line', text: `${vA}+${vB}=0.5`, at: [0.96, -0.35], anchor: 'start' }, { L: PG.lineSum(1.5), cls: 'fixed-line', ...sumLabel(1.5, `${vA}+${vB}=1.5`) }], selected: S('P18').picked, title });
  return `<div class="plane-box ${size}">${plane}</div><div class="sumline-box${size === 'small' ? ' small' : ''}">${sumlineSvg({ labels, dividers: c10s })}</div>${extraBelow}<p class="caption">아래: 합으로 줄 세우기 — ${c10s.length === 1 ? '칸막이 c의 오른쪽' : '두 칸막이 사이'}가 출력 1</p>`;
}
function cSlider(id, c10, extra = '', note = '') {
  return `<div class="slider-wrap inline"><label for="${id}">기준 c = <strong>${fmtK(c10 / 10)}</strong>${note}</label><input id="${id}" type="range" min="-5" max="25" step="1" value="${c10}"></div>${extra}`;
}

/* ---------- P15 AND: 단계 표시와 입력·출력 이름표(03 §3-7) */
const P15_STEPS = ['점 고르기(입력)', '출력 예측', '돌려 보기', '표 확인'];
RENDER.P15 = () => {
  const p = S('P15');
  const done = Object.keys(p.rows).length;
  const sel = p.sel;
  const ran = sel !== null && p.rows[sel];
  const stage = done === 4 ? 3 : sel === null || ran ? 0 : p.guess === null ? 1 : 2;
  const stepsBar = `<ol class="steps-bar">${P15_STEPS.map((t, i) => `<li class="${i === stage ? 'now' : i < stage || done === 4 ? 'done' : ''}">${i < stage || (done === 4 && i < 3) ? '✓ ' : ''}${i + 1} ${t}</li>`).join('')}</ol>`;
  const labels = PG.POINTS.map((pt, i) => (p.rows[i] ? LAB.AND[i] : null));
  const table = `<table class="truth compact"><thead><tr><th>입력 (A, B)</th><th>A+B</th><th>내 예측</th><th>출력</th><th>AND</th></tr></thead><tbody>${PG.POINTS.map((pt, i) => {
    const r = p.rows[i];
    if (!r) return `<tr><td>${COORD[i]}</td><td></td><td></td><td></td><td>${LAB.AND[i]}</td></tr>`;
    const out = PG.thresholdOut(15, pt);
    return `<tr><td>${COORD[i]}</td><td>${pt[0] + pt[1]}</td><td>${r.guess}</td><td><strong>${out}</strong></td><td>${LAB.AND[i]}${out === LAB.AND[i] ? ' ○' : ' ×'}</td></tr>`;
  }).join('')}</tbody></table>`;
  return `${head('AND를 판단하는 기준', '판단 장치는 점 (A, B)를 입력으로 받아 1 또는 0을 냅니다. 기준은 1.5입니다. 점을 하나씩 넣어 보세요. 넣은 점은 왼쪽 그림에 칠해집니다.', '5-1')}
  <div class="screen-layout two-col fig-left">
    <div class="card">${cFigure([15], labels, 'AND와 기준선 A+B=1.5')}</div>
    <div class="card stack">
      ${stepsBar}
      ${done < 4 ? `<div class="inline-actions"><span class="field-label">① 입력할 점</span><div class="choice-row">${PG.POINTS.map((pt, i) => `<button type="button" class="pill-button${sel === i ? ' on' : ''}${p.rows[i] ? ' done' : ''}" data-p15pt="${i}" ${p.rows[i] ? 'disabled' : ''}>${COORD[i]}${p.rows[i] ? ' ✓' : ''}</button>`).join('')}</div></div>
      ${deviceHtml(15, sel !== null ? PG.POINTS[sel] : null, { hideOut: sel !== null && !ran, names: true })}` : ''}
      ${sel !== null && !ran ? `<div class="inline-actions"><span class="field-label">② 출력은?</span>${choiceRow('p15g', [['1', '1'], ['0', '0']], p.guess === null ? '' : String(p.guess))}<button id="p15-run" class="primary-button" type="button" ${p.guess === null ? 'disabled' : ''}>③ 돌려 보기</button></div>` : ''}
      ${ran && done < 4 ? resultBox(p.rows[sel].guess === PG.thresholdOut(15, PG.POINTS[sel]) ? 'ok' : 'fail', `예측 ${p.rows[sel].guess} · 출력 ${PG.thresholdOut(15, PG.POINTS[sel])} — 다른 점을 골라 보세요`) : ''}
      ${table}
      ${done === 4 ? `<div class="stack" data-reveal="q2"><div class="field"><span class="field-label">④ 직선 A+B=1.5의 오른쪽 위에 있는 점을 모두 고르시오.</span><div class="choice-row">${PG.POINTS.map((pt, i) => `<label class="pill${p.right.includes(i) ? ' on' : ''}"><input type="checkbox" data-p15r="${i}" ${p.right.includes(i) ? 'checked' : ''}><span>${COORD[i]}</span></label>`).join('')}</div></div>
        ${p.right.length ? (sameArr([...p.right].sort(), [3]) ? resultBox('ok', '오른쪽 위에는 (1, 1) 하나만 있습니다.') : resultBox('fail', '직선보다 오른쪽 위에 있는 점만 고르세요.')) : ''}
        <div class="inline-actions"><span class="field-label">그 점들은 AND의 출력이 1인 점과</span>${choiceRow('p15s', [['same', '같다'], ['diff', '다르다']], p.same)}</div>
        ${p.same === 'same' ? '<p class="muted small" style="margin:0">합으로 줄 세우면, 칸막이 1.5의 오른쪽에 있는 것은 합이 2인 (1, 1)뿐입니다.</p>' : ''}</div>` : ''}
    </div>
  </div>`;
};
BIND.P15 = () => {
  const p = S('P15');
  $$('[data-p15pt]').forEach((b) => b.addEventListener('click', () => { p.sel = Number(b.dataset.p15pt); p.guess = null; persist(); render(); }));
  $$('input[name="p15g"]').forEach((r) => r.addEventListener('change', () => { p.guess = Number(r.value); render(); }));
  $('#p15-run')?.addEventListener('click', () => {
    const i = p.sel, out = PG.thresholdOut(15, PG.POINTS[i]);
    p.rows[i] = { guess: p.guess };
    logEvent('attempt', 'P15', `${COORD[i]} 예측 ${p.guess} · 출력 ${out}`, p.guess === out ? 'ok' : 'fail');
    if (p.guess === out) success(Object.keys(p.rows).length === 4 ? '네 점을 모두 넣었습니다. 아래 질문에 답해 보세요.' : '맞았습니다. 다른 점도 넣어 보세요.'); else fail('P15');
    persist(); render();
  });
  $$('[data-p15r]').forEach((c) => c.addEventListener('change', () => { const i = Number(c.dataset.p15r); p.right = c.checked ? [...new Set([...p.right, i])] : p.right.filter((x) => x !== i); persist(); render(); }));
  $$('input[name="p15s"]').forEach((r) => r.addEventListener('change', () => { p.same = r.value; logEvent('write', 'P15', `AND와 같은가: ${r.value}`); render(); }));
};

/* ---------- P16 OR이 되는 c 찾기 */
function orStatus(c10) {
  const m = PG.matches(c10, LAB.OR), onPt = PG.cOnPoint(c10), c = fmtK(c10 / 10);
  let s = `OR과 맞는 점 <strong>${m}</strong>개 / 4개`;
  if (onPt) s += ` · <span class="warn-text">기준선(A+B=${c})이 점 위를 지납니다. 부등식으로는 판정할 수 있지만, 4절 그림 규칙으로는 나눈 것으로 보지 않아요.</span>`;
  return `<div class="result ${m === 4 && !onPt ? 'ok' : m === 4 ? 'partial' : ''}" role="status">${s}</div>`;
}
function bindC(screen, inputId) {
  const p = S(screen);
  const setC = (c10, keep) => { p.c10 = Math.max(-5, Math.min(25, c10)); persist(); if (keep) softRender(keep); else render(); };
  $('#' + inputId)?.addEventListener('input', (e) => setC(Number(e.target.value), e.target));
  $('#' + inputId)?.addEventListener('change', () => render());
  $$('[data-cstep]').forEach((b) => b.addEventListener('click', () => setC(p.c10 + Number(b.dataset.cstep))));
  $('#c-num')?.addEventListener('change', (e) => { const v = PG.parseNumber(e.target.value); if (v !== null) setC(Math.round(v * 10)); });
}
const cFine = (c10) => `<div class="inline-actions"><button class="tool-button" type="button" data-cstep="-1">− 0.1</button><button class="tool-button" type="button" data-cstep="1">+ 0.1</button><input id="c-num" type="text" inputmode="decimal" value="${fmtK(c10 / 10)}" style="max-width:90px" aria-label="c 값 입력"></div>`;
RENDER.P16 = () => {
  const p = S('P16'), locked = predictLocked('P16');
  return `${head('OR이 되는 기준 c 찾기', 'OR을 판단하는 기준을 찾아봅시다. c의 값을 얼마로 하면 될까요?', '5-2 (1)·(2)')}
  <div class="screen-layout two-col fig-left">
    <div class="card">${locked ? cFigure([p.c10], LAB.OR, `OR과 기준선 A+B=${fmtK(p.c10 / 10)}`) : `<div class="plane-box mid">${planeSvg({ labels: LAB.OR, title: 'OR의 네 점' })}</div>`}</div>
    <div class="card stack">
      ${ruleBoxC()}
      ${locked ? `<p class="quote-line" style="padding:6px 10px">(1) 내 예측: c = <strong>${esc(predictValue('P16') || '')}</strong> <span class="muted small">(확정함) — 이제 슬라이더로 c의 값을 바꾸어 확인해 보세요.</span></p>` : `<div class="field"><label for="p16-pred">(1) OR을 판단하려면 c의 값을 얼마로 하면 될까? 하나 정해 쓰고 「확정」을 누르시오.</label>
        <div class="inline-actions"><input id="p16-pred" type="text" inputmode="decimal" value="${esc(predictValue('P16') || '')}" style="max-width:120px"><button id="p16-lock" class="primary-button" type="button">확정</button></div></div>`}
      ${locked ? `<div class="stack" data-reveal="slider"><div class="slider-row">${cSlider('p16-c', p.c10)}${cFine(p.c10)}</div>
        ${orStatus(p.c10)}
        ${cTableHtml(p.c10, LAB.OR, 'OR')}
        <div class="inline-actions"><button id="p16-rec" class="primary-button" type="button">이 c 기록하기</button><span class="small">OR이 되는 c: ${p.found.length ? p.found.map((x) => `<span class="tag">${fmtK(x / 10)}</span>`).join(' ') : '<span class="muted">두 개 이상 찾아 기록하세요.</span>'}</span></div></div>` : ''}
    </div>
  </div>`;
};
BIND.P16 = () => {
  const p = S('P16');
  $('#p16-pred')?.addEventListener('input', (e) => draftPredict('P16', e.target.value));
  $('#p16-lock')?.addEventListener('click', () => {
    const v = $('#p16-pred').value.trim();
    if (PG.parseNumber(v) === null) { say('수를 하나 쓰세요. 예: 0.3', 'tilt'); renderMascot(); return; }
    confirmPredict('P16', v);
    const c10 = Math.round(PG.parseNumber(v) * 10);
    if (c10 >= -5 && c10 <= 25) p.c10 = c10;
    render();
  });
  bindC('P16', 'p16-c');
  $('#p16-rec')?.addEventListener('click', () => {
    const m = PG.matches(p.c10, LAB.OR), c = fmtK(p.c10 / 10);
    if (m === 4) {
      if (!p.found.includes(p.c10)) p.found.push(p.c10);
      p.found.sort((a, b) => a - b);
      logEvent('attempt', 'P16', `c = ${c} 기록 · OR 일치 4`, 'ok');
      success(PG.cOnPoint(p.c10) ? `c = ${c}를 기록했습니다. 다만 기준선이 점 위를 지나요.` : `c = ${c}를 기록했습니다.${p.found.length < 2 ? ' 하나 더 찾아보세요.' : ''}`);
    } else {
      logEvent('attempt', 'P16', `c = ${c} · OR 일치 ${m}`, 'fail');
      fail('P16'); shake('#p16-rec');
    }
    persist(); render();
  });
};

/* ---------- P16w 기준선은 어떻게 달라지나: 고르기 둘 + 빈칸 문장(03 §3-8) */
RENDER.P16w = () => {
  const p = S('P16');
  const dirOk = p.dir === 'up', slopeOk = p.slope === 'same';
  const blank = (k, label) => `<input id="w-${k}" type="text" class="blank-input" data-write="${k}" value="${esc(state.writes[k] || '')}" aria-label="${label}">`;
  return `${head('기준선은 어떻게 달라지나', '슬라이더로 c의 값을 바꾸어 가며 기준선 A+B=c가 어떻게 달라지는지 보고, 두 질문에 답해 봅시다.', '5-2 (3)')}
  <div class="screen-layout two-col fig-left">
    <div class="card stack"><div class="plane-box small">${cPlaneSvg(p.c10, LAB.OR, { title: `OR과 기준선 A+B=${fmtK(p.c10 / 10)}` })}</div><div class="sumline-box small">${sumlineSvg({ labels: LAB.OR, dividers: [p.c10] })}</div>${cSlider('p16w-c', p.c10)}</div>
    <div class="card stack">
      ${ruleBoxC()}
      <div class="field"><span class="field-label">(1) c의 값이 커지면 기준선 A+B=c는 어떻게 되는가?</span>${choiceRow('p16dir', [['up', '오른쪽 위로 평행이동한다'], ['down', '왼쪽 아래로 평행이동한다'], ['stay', '움직이지 않는다']], p.dir)}</div>
      ${p.dir ? (dirOk ? resultBox('ok', '맞아요. c의 값이 커지면 기준선은 오른쪽 위로 평행이동합니다.') : resultBox('fail', '슬라이더를 오른쪽으로 끌어 c의 값을 크게 하면서 기준선을 다시 보세요.')) : ''}
      <div class="field"><span class="field-label">(2) c의 값을 바꾸면 기준선의 기울기는?</span>${choiceRow('p16slope', [['change', '바뀐다'], ['same', '그대로다']], p.slope)}</div>
      ${p.slope ? (slopeOk ? resultBox('ok', '맞아요. c의 값이 바뀌어도 기준선의 기울기는 그대로이고, 평행이동만 합니다.') : resultBox('fail', 'c의 값이 작을 때와 클 때의 두 기준선이 서로 평행한지 보세요.')) : ''}
      <p class="blank-sentence">c의 값을 바꾸면 기준선의 기울기는 ${blank('P16_blank1', '기울기는')}, 위치는 ${blank('P16_blank2', '위치는')}.</p>
    </div>
  </div>`;
};
BIND.P16w = () => {
  const p = S('P16');
  bindC('P16', 'p16w-c');
  $$('input[name="p16dir"]').forEach((r) => r.addEventListener('change', () => { p.dir = r.value; logEvent('attempt', 'P16w', `기준선이 옮겨지는 쪽: ${r.value}`, r.value === 'up' ? 'ok' : 'fail'); persist(); render(); }));
  $$('input[name="p16slope"]').forEach((r) => r.addEventListener('change', () => { p.slope = r.value; logEvent('attempt', 'P16w', `기울기: ${r.value}`, r.value === 'same' ? 'ok' : 'fail'); persist(); render(); }));
};

/* ---------- P17 XOR도 될까: 합으로 줄 세우기를 근거로(03 §3-9) */
const P17_STEPS = [
  '네 점을 합으로 줄 세우면 0, 1, 1, 2입니다. XOR이 되려면 가운데 두 점(합 1)만 1이어야 합니다.',
  '칸막이 c 하나는 오른쪽에 있는 점을 모두 1로, 왼쪽에 있는 점을 모두 0으로 만듭니다.',
  '합이 1인 점을 1로 만들려면 칸막이가 1보다 왼쪽에 있어야 합니다. 그러면 합이 2인 (1, 1)도 오른쪽에 있어 1이 됩니다. 그래서 칸막이 하나로는 XOR을 만들 수 없습니다.'
];
RENDER.P17 = () => {
  const p = S('P17');
  const m = PG.matches(p.c10, LAB.XOR);
  const step = p.explain;
  const sel = (k, opts) => `<select class="blank-select" data-p17b="${k}" aria-label="빈칸"><option value="">고르기</option>${opts.map((o) => `<option ${p[k] === o ? 'selected' : ''}>${o}</option>`).join('')}</select>`;
  const xorRow = '<div class="xor-row" aria-label="합과 XOR 값"><span>합</span><b>0</b><b>1</b><b>1</b><b>2</b><span>XOR</span><b>0</b><b class="one">1</b><b class="one">1</b><b>0</b></div>';
  return `${head('XOR도 될까', 'XOR의 값은 (0, 0)에서 0, (0, 1)에서 1, (1, 0)에서 1, (1, 1)에서 0입니다. 같은 판단 장치에서 c의 값을 바꾸어 XOR을 만들어 보세요.', '5-3')}
  <div class="screen-layout two-col fig-left">
    <div class="card">${cFigure([p.c10], LAB.XOR, `XOR과 기준선 A+B=${fmtK(p.c10 / 10)}`, 'small', xorRow)}</div>
    <div class="card stack">
      ${ruleBoxC()}
      <div class="slider-row">${cSlider('p17-c', p.c10, '', ` · XOR과 맞는 점 <strong>${m}</strong>개`)}<button id="p17-sweep" class="secondary-button" type="button">${activeTimer ? '움직이는 중…' : '끝에서 끝까지'}</button></div>
      ${p.swept ? `<div class="step-view" data-reveal="why">${step ? `<p class="explain-step"><span class="step-no">${step}</span>${P17_STEPS[step - 1]}</p>` : ''}
        <div class="step-nav">${step ? `<button id="p17-prev" class="secondary-button" type="button" ${step <= 1 ? 'disabled' : ''}>이전 단계</button><span class="step-count">${step} / 3</span>` : ''}${step < 3 ? `<button id="p17-step" class="primary-button" type="button">${step ? '다음 단계' : '왜 안 될까 (3단계)'}</button>` : ''}</div></div>` : '<p class="todo-line">「끝에서 끝까지」를 눌러 칸막이를 처음부터 끝까지 움직여 보세요.</p>'}
      ${step >= 3 ? `<div class="stack" data-reveal="blanks"><p class="blank-sentence">(0, 1)이 1이 되려면 c는 <input class="blank-input short" data-p17b="b1" value="${esc(p.b1)}" inputmode="decimal" aria-label="c는 몇보다 작아야"> 보다 작아야 한다. 그러면 (1, 1)의 합 2는 c보다 ${sel('b2', ['크다', '작다'])}. 그래서 (1, 1)의 출력은 ${sel('b3', ['1', '0'])}이 되어 XOR과 ${sel('b4', ['같다', '다르다'])}.</p>
        <div class="button-row"><button id="p17-check" class="secondary-button" type="button">빈칸 확인</button></div>
        ${p.blankOk === true ? resultBox('ok', '맞아요. 칸막이 하나로는 가운데만 1로 만들 수 없습니다.') : p.blankOk === false ? resultBox('fail', '합으로 줄 세우기 그림에서 칸막이를 1보다 왼쪽에 두고 (1, 1)을 보세요.') : ''}
        ${writeBox('P17_reason', '어떤 c로도 안 되는 까닭을 내 말로 한 줄 쓰시오.', { rows: 1 })}</div>` : ''}
    </div>
  </div>`;
};
let p17LogTimer = null;
BIND.P17 = () => {
  const p = S('P17');
  const logC = () => { clearTimeout(p17LogTimer); p17LogTimer = setTimeout(() => logEvent('attempt', 'P17', `c = ${fmtK(p.c10 / 10)} · XOR 일치 ${PG.matches(p.c10, LAB.XOR)}`, 'fail'), 700); };
  $('#p17-c').addEventListener('input', (e) => { stopTimer(); p.c10 = Number(e.target.value); persist(); softRender(e.target); logC(); });
  $('#p17-c').addEventListener('change', () => render());
  $('#p17-sweep').addEventListener('click', () => {
    if (activeTimer) return;
    p.c10 = -5; render();
    let best = 0;
    activeTimer = setInterval(() => {
      if (state.screenId !== 'P17') { stopTimer(); return; }
      best = Math.max(best, PG.matches(p.c10, LAB.XOR));
      if (p.c10 >= 25) { stopTimer(); p.swept = true; logEvent('attempt', 'P17', `끝에서 끝까지 움직이기 · 가장 많이 맞은 점 ${best}개`, 'fail'); say(`끝에서 끝까지 움직였습니다. 가장 많이 맞은 것은 ${best}개였어요.`, 'idle'); persist(); render(); return; }
      p.c10 += 1; persist(); render();
    }, 200);
  });
  $('#p17-step')?.addEventListener('click', () => { p.explain = Math.min(3, p.explain + 1); persist(); render(); });
  $('#p17-prev')?.addEventListener('click', () => { p.explain = Math.max(1, p.explain - 1); persist(); render(); });
  $$('[data-p17b]').forEach((el) => el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => { p[el.dataset.p17b] = el.value; p.blankOk = null; persist(); if (el.tagName === 'SELECT') render(); }));
  $('#p17-check')?.addEventListener('click', () => {
    const ok = PG.parseNumber(p.b1) === 1 && p.b2 === '크다' && p.b3 === '1' && p.b4 === '다르다';
    p.blankOk = ok;
    logEvent('attempt', 'P17', `빈칸: c < ${p.b1}, 2는 c보다 ${p.b2}, 출력 ${p.b3}, XOR과 ${p.b4}`, ok ? 'ok' : 'fail');
    if (ok) success('맞아요.'); else fail('P17');
    persist(); render();
  });
};

/* ---------- P17r 그 무렵 연구자들도 — 네 컷 읽을거리(03 §3-9) */
const STORY = [
  ['1958년', '입력을 더해 기준과 비교하는 판단 장치 「퍼셉트론」이 발표되어 큰 기대를 모았습니다.', '연구자가 커다란 기계 앞에서 삼각형 카드를 보여 주고, 사람들이 놀라며 바라보는 그림'],
  ['1969년', '이 해에 나온 책이, 직선 하나로 판단하는 퍼셉트론은 XOR 같은 문제를 풀 수 없다는 것을 보였습니다.', '두 연구자가 대각선으로 놓인 검은 점 두 개와 흰 점 두 개를 자 하나로 가르지 못해 고민하는 그림'],
  ['그 뒤', '그 뒤로 한동안 이 분야 연구가 위축되는 데 영향을 주었습니다.', '천을 덮어 둔 기계와 빈 의자가 있는 조용한 연구실 그림'],
  ['지금', '방금 여러분이 겪은 막힘이 실제로 연구자들이 겪은 막힘입니다. 이 막힘은 어떻게 풀렸을까요?', '학생이 노트북 앞에서 여러 겹으로 쌓인 투명한 판을 떠올리며 생각하는 그림']
];
RENDER.P17r = () => `${head('그 무렵 연구자들도', '방금 막힌 일은 실제 연구의 역사에도 있었습니다. 네 컷을 차례로 읽어 보세요.')}
  <div class="story-grid">${STORY.map(([when, text, alt], i) => `<figure class="story-cell card"><img src="assets/story-${i + 1}.jpg" alt="${alt}" loading="lazy"><figcaption><span class="story-no">${i + 1}</span><strong>${when}</strong> ${text}</figcaption></figure>`).join('')}</div>
  <p class="muted small" style="margin:6px 0 0">이 막힘이 어떻게 풀렸는지는 「층을 쌓는다」에서 봅니다.</p>`;

/* ---------- P18 두 직선 사이의 점 */
RENDER.P18 = () => {
  const p = S('P18');
  const showLab = p.pickOk === true;
  const blanks = [['blank1', 'A+B &gt; 0.5'], ['blank2', 'A+B &gt; 1.5']];
  const blankOk = p.blank1 === 'OR' && p.blank2 === 'AND';
  return `${head('두 직선 사이의 점', '칸막이를 하나 더 둡니다. 두 기준선 A+B=0.5와 A+B=1.5 <strong>사이</strong>에 있는 점은 어느 것일까요?', '5-4 (1)~(3)')}
  <div class="screen-layout two-col fig-left">
    <div class="card">${cFigure([5, 15], showLab ? LAB.XOR : null, '두 기준선')}</div>
    <div class="card stack">
      <div class="field"><span class="field-label">(1) 두 직선 사이에 있는 점을 모두 고르시오.</span><div class="choice-row">${PG.POINTS.map((pt, i) => `<label class="pill${p.picked.includes(i) ? ' on' : ''}"><input type="checkbox" data-p18p="${i}" ${p.picked.includes(i) ? 'checked' : ''}><span>${COORD[i]}</span></label>`).join('')}<button id="p18-pick" class="secondary-button" type="button">확인</button></div></div>
      ${p.pickOk === true ? resultBox('ok', '두 직선 사이에는 (0, 1), (1, 0)이 있습니다. 이제 XOR의 ●를 함께 보여 줍니다.') : p.pickOk === false ? resultBox('fail', '두 직선 사이의 띠 안에 있는 점만 고르세요.') : ''}
      ${showLab ? `<div class="inline-actions" data-reveal="same"><span class="field-label">(2) 그 점들은 XOR의 출력이 1인 점과</span>${choiceRow('p18s', [['same', '같다'], ['diff', '다르다']], p.same)}</div>` : ''}
      ${p.same ? `<div class="field" data-reveal="blanks"><span class="field-label">(3) 5-1, 5-2를 보고 빈칸을 채우시오.</span>${blanks.map(([k, t]) => `<div class="inline-actions"><span>${t}는</span><select data-p18b="${k}" aria-label="${t}"><option value="">고르기</option>${['OR', 'AND', 'XOR'].map((x) => `<option ${p[k] === x ? 'selected' : ''}>${x}</option>`).join('')}</select><span>와 같다.</span></div>`).join('')}</div>
        ${p.blank1 && p.blank2 ? (blankOk ? resultBox('ok', 'A+B &gt; 0.5는 OR, A+B &gt; 1.5는 AND입니다. 다음 화면에서 이 두 판단을 회로로 이어 봅니다.') : resultBox('fail', '5-1(AND)과 5-2(OR)에서 쓴 기준을 떠올려 보세요.')) : ''}` : ''}
    </div>
  </div>`;
};
BIND.P18 = () => {
  const p = S('P18');
  $$('[data-p18p]').forEach((c) => c.addEventListener('change', () => { const i = Number(c.dataset.p18p); p.picked = c.checked ? [...new Set([...p.picked, i])] : p.picked.filter((x) => x !== i); if (p.pickOk !== true) p.pickOk = null; persist(); render(); }));
  $('#p18-pick').addEventListener('click', () => {
    const ok = sameArr([...p.picked].sort(), [1, 2]);
    if (p.pickOk !== true) p.pickOk = ok;
    logEvent('attempt', 'P18', `사이의 점: ${p.picked.map((i) => COORD[i]).join(' ') || '없음'}`, ok ? 'ok' : 'fail');
    if (ok) success('맞았습니다.'); else fail('P18');
    render();
  });
  $$('input[name="p18s"]').forEach((r) => r.addEventListener('change', () => { p.same = r.value; logEvent('write', 'P18', `XOR과 같은가: ${r.value}`); render(); }));
  $$('[data-p18b]').forEach((s) => s.addEventListener('change', () => { p[s.dataset.p18b] = s.value; if (p.blank1 && p.blank2) logEvent('attempt', 'P18', `빈칸: 0.5→${p.blank1}, 1.5→${p.blank2}`, p.blank1 === 'OR' && p.blank2 === 'AND' ? 'ok' : 'fail'); render(); }));
};

/* ---------- P18c 두 판단을 이어 판단하기: 확인표(틀린 칸 숨김) + 게이트 짝짓기(03 §3-10) */
const PAIR_ANSWER = { T1: 'G1', T2: 'G2', G3: 'G3', G4: 'G4' };
const BAND_ORDER = ['T1', 'T2', 'G3', 'G4'];
RENDER.P18c = () => {
  const p = S('P18');
  const vBand = PG.circuitValues(PG.BAND_CIRCUIT, p.sw), vXor = PG.circuitValues(PG.XOR_CIRCUIT, p.sw);
  const tbl = [[0, 0], [0, 1], [1, 0], [1, 1]].map((r, i) => {
    const cell = (k) => { const v = p[k][i]; return `<button type="button" class="cell-button${v === null ? ' empty' : ''}" data-p18t="${k}:${i}">${v === null ? '?' : v}</button>`; };
    return `<tr class="${p.sw.A === r[0] && p.sw.B === r[1] ? 'now' : ''}"><td>${r[0]}</td><td>${r[1]}</td><td>${cell('band')}</td><td>${cell('xor')}</td></tr>`;
  }).join('');
  const pairing = p.tableOk === true;
  const badgesBand = {}, badgesXor = {};
  Object.entries(p.pairs).forEach(([b, x]) => { const n = BAND_ORDER.indexOf(b) + 1; badgesBand[b] = n; badgesXor[x] = n; });
  const pairDone = BAND_ORDER.every((b) => p.pairs[b] === PAIR_ANSWER[b]);
  return `${head('두 판단을 이어 판단하기', '「두 직선 사이에 있다」, 곧 「A+B &gt; 0.5이고, A+B &gt; 1.5는 아니다」를 회로로 그리면 위와 같습니다. 아래는 되짚기에서 본 XOR 회로입니다. 스위치를 하나씩 눌러 네 경우를 모두 만들고, 두 회로의 출력을 표에 채우세요.', '5-4')}
  <div class="screen-layout two-col">
    <div class="card circuits-stack">
      <div id="p18c-band"><p class="caption" style="text-align:left">판단 장치 두 개를 이은 회로</p>${circuitSvg(PG.BAND_CIRCUIT, vBand, { title: '판단 장치 두 개를 이은 회로', pick: pairing && !pairDone, badges: badgesBand, highlight: p.pairSel })}</div>
      <div id="p18c-xor"><p class="caption" style="text-align:left">XOR 회로 (A OR B) AND NOT (A AND B)</p>${circuitSvg(PG.XOR_CIRCUIT, vXor, { title: 'XOR 회로', pick: pairing && !pairDone && Boolean(p.pairSel), badges: badgesXor })}</div>
      <div class="switch-row"><span class="muted small">스위치:</span>${['A', 'B'].map((x) => `<button type="button" class="switch${p.sw[x] ? ' on' : ''}" data-sw18="${x}" aria-pressed="${p.sw[x] ? 'true' : 'false'}">${x} = ${p.sw[x]}</button>`).join('')}</div>
    </div>
    <div class="card stack">
      <table class="truth compact"><thead><tr><th>A</th><th>B</th><th>판단 장치 회로</th><th>XOR 회로</th></tr></thead><tbody>${tbl}</tbody></table>
      ${p.tableOk === true ? resultBox('ok', '두 회로는 네 경우 모두 같은 출력을 냅니다.') : p.tableOk === false ? resultBox('fail', '틀린 칸이 있어요. 표의 입력대로 스위치를 하나씩 놓고 출력을 보세요.') : '<p class="muted small" style="margin:0">지금 스위치 상태의 행이 칠해집니다.</p>'}
      ${pairing ? `<div class="stack" data-reveal="pair"><p style="margin:0"><strong>짝짓기</strong> 판단 장치 회로의 상자를 누르고, XOR 회로에서 같은 일을 하는 게이트를 누르세요. 이은 짝에는 같은 번호가 붙습니다.</p>
        <p class="small" style="margin:0">${p.pairSel ? `고른 상자: <strong>${esc(gateLabel(PG.BAND_CIRCUIT.gates.find((g) => g.id === p.pairSel)))}</strong> → 이제 XOR 회로의 게이트를 누르세요.` : `이은 짝 ${Object.keys(p.pairs).filter((b) => p.pairs[b] === PAIR_ANSWER[b]).length} / 4`}</p>
        ${pairDone ? resultBox('ok', '두 회로는 판단 장치 자리만 다를 뿐 이어진 모양이 같습니다. 직선 하나로 판단한 두 결과를 다시 이어 판단한 것입니다.') : ''}</div>` : ''}
      ${pairDone ? '<p class="muted small" style="margin:0">NOT도 판단 장치로 만들 수 있을까요? 「한 걸음 더」에서 해 봅니다.</p>' : ''}
    </div>
  </div>`;
};
BIND.P18c = () => {
  const p = S('P18');
  $$('[data-sw18]').forEach((b) => b.addEventListener('click', () => { p.sw[b.dataset.sw18] = 1 - p.sw[b.dataset.sw18]; persist(); render(); }));
  $$('[data-p18t]').forEach((b) => b.addEventListener('click', () => {
    const [k, i] = b.dataset.p18t.split(':');
    p[k][i] = p[k][i] === null ? 0 : 1 - p[k][i];
    if (p.band.every((x) => x !== null) && p.xor.every((x) => x !== null)) {
      p.tableOk = sameArr(p.band, LAB.XOR) && sameArr(p.xor, LAB.XOR);
      logEvent('attempt', 'P18c', `확인표 장치 ${p.band.join('')} · XOR ${p.xor.join('')}`, p.tableOk ? 'ok' : 'fail');
      if (p.tableOk) success('두 회로가 같은 판단을 합니다. 이제 짝을 지어 보세요.');
    } else p.tableOk = null;
    render();
  }));
  const onKey = (g, fn) => { g.addEventListener('click', fn); g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } }); };
  $$('#p18c-band [data-gate]').forEach((g) => onKey(g, () => { p.pairSel = g.dataset.gate; persist(); render(); }));
  $$('#p18c-xor [data-gate]').forEach((g) => onKey(g, () => {
    if (!p.pairSel) return;
    const b = p.pairSel, x = g.dataset.gate, ok = PAIR_ANSWER[b] === x;
    logEvent('attempt', 'P18c', `짝: ${b} ↔ ${x}`, ok ? 'ok' : 'fail');
    if (ok) { p.pairs[b] = x; p.pairSel = ''; success('같은 일을 하는 짝입니다.'); } else { p.pairSel = ''; fail('P18c'); }
    persist(); render();
  }));
};

/* ---------- P19 층을 쌓는다 — 개념만, 쓰기 없음(03 §3-11) */
RENDER.P19 = () => {
  const p11 = S('P11');
  const L = lineFromPts(p11.line);
  const has = L && p11.ok;
  const k = has ? PG.parallelK(L) : null;
  let foldNote = '4-3 화면에서 접은 그림에 직선을 긋지 않았어요. 그림은 예시 직선 A+B=1.5로 접어 자른 경우입니다.';
  let line = { p: [0, 1.5], q: [1.5, 0] };
  if (has) {
    line = p11.line;
    if (k !== null && Math.abs(k - 1.5) < 0.005) foldNote = '내가 접어서 얻은 두 직선은 <strong>바로 이 두 기준선</strong> A+B=1.5, A+B=0.5였습니다.';
    else if (k !== null) foldNote = `내가 접어서 얻은 두 직선은 A+B=${fmtK(k)}, A+B=${fmtK(2 - k)}였습니다. 이것도 ● 두 점만 사이에 두는 두 직선입니다. 접은 그림에 A+B=1.5를 그었다면 펼친 두 직선은 정확히 이 두 기준선이 됩니다.`;
    else foldNote = '내가 접어서 얻은 두 직선은 「V」 모양이었습니다. 이것도 ● 두 점만 사이에 두는 두 직선입니다. 접은 그림에 접힌 선과 나란한 A+B=1.5를 그었다면 펼친 두 직선은 정확히 이 두 기준선이 됩니다.';
  }
  return `${head('층을 쌓는다', '직선 하나로 판단하면 <strong>단층 퍼셉트론</strong>, 여러 직선의 판단을 다시 이어 판단하면 <strong>다층 퍼셉트론</strong>입니다. XOR은 층을 쌓으면 됩니다. 읽고 나서 다음으로 넘어가세요.')}
  <div class="screen-layout two-col fig-left">
    <div class="card stack"><div class="plane-box small">${unfoldSvg(line, { title: '4-3에서 펼친 평면' })}</div><p class="small" style="margin:0">${foldNote}</p></div>
    <div class="card stack">
      <p style="margin:0">${predictValue('P12') ? `쉬는 시간 전에 나는 <span class="my-quote">「${esc(predictValue('P12'))}」</span>라고 썼습니다. ` : ''}<strong>접기</strong>는 평면을 한 번 바꾼 뒤 직선 하나로, <strong>회로</strong>는 OR과 AND로 먼저 판단한 결과를 다시 판단합니다. 둘 다 <strong>두 단계로 판단한다</strong>는 점이 닮았습니다.</p>
      <p class="read-box" style="margin:0"><strong>그 막힘은 이렇게 풀렸습니다</strong> 판단 장치를 여러 층으로 쌓고, 그 층들을 자료로 학습시키는 방법이 1980년대에 알려지면서 막힘이 풀렸습니다. 연구도 다시 활발해졌습니다.</p>
      ${termBox('인공신경망', '오늘날 인공지능에 쓰이는 인공신경망은 퍼셉트론 같은 판단 장치를 여러 층으로 아주 많이 이은 것입니다. 그리고 기준선의 위치를 사람이 정하지 않고, 자료를 보고 컴퓨터가 정합니다. 이것을 <strong>학습</strong>이라고 합니다.')}
      <p class="muted small" style="margin:0">컴퓨터가 기준선을 정하는 모습은 「한 걸음 더」의 「기계가 직선을 찾는다」에서 볼 수 있습니다.</p>
    </div>
  </div>`;
};

/* ================================================================ 섹션 6 */
const PRED_TEXT = { yes: '된다', no: '안 된다', unsure: '모르겠다' };
const WS = [
  ['점자를 수로, 수를 연산으로', '부호화 · 연산', '점자 6칸을 0과 1로, 비트 연산'], ['믿을 수 있게 보내기', '오류', '잡음 통신, 반복 전송과 검사 점'], ['0과 1로 판단하기', '판단', '스위치와 회로, 진리표'], ['퍼셉트론, 직선으로 판단하다 (오늘)', '층', '직선으로 가르기와 층']
];
const CARDS = [
  { text: '두 점형이 몇 군데 다른지 센다', ws: 0, ex: '101100 XOR 100110 = 001010 → 1이 2개, 두 군데가 다르다. 좋은 부호는 서로 멀리 떨어져 있어야 한다.' },
  { text: '같은 열쇠로 잠그고, 같은 열쇠로 연다', ws: 0, ex: '101101 XOR 110011 = 011110 → 다시 011110 XOR 110011 = 101101. 열쇠를 두 번 XOR하면 원래대로 돌아온다(바루비에의 야간 암호).' },
  { text: '1의 개수가 짝수인지 확인한다', ws: 1, ex: '1 XOR 0 XOR 1 = 0 (1이 두 개, 짝수). 비트를 차례로 모두 XOR하면 1의 개수가 홀수일 때 1이 된다. 검사 점이 하는 일이다.' },
  { text: '계단 전등을 켜고 끄고, 한 자리 덧셈의 합을 낸다', ws: 2, ex: '어느 스위치를 눌러도 전등이 바뀐다. 1 + 1 = 10(2)에서 합 자리 0 = 1 XOR 1(반가산기).' },
  { text: '직선 하나로는 판단할 수 없어서, 판단을 층으로 쌓게 했다', ws: 3, ex: 'XOR은 직선 하나로 가를 수 없었다. 두 판단을 이어서(층을 쌓아서) 판단하면 된다.' }
];
const LINK_COLORS = ['#1d4ed8', '#7c3aed', '#047857', '#b45309', '#be123c'];   // 카드마다 선·번호 색
const pathHtml = (p, clickable) => `<div class="path">${WS.map(([t, k], i) => `<${clickable ? 'button type="button"' : 'div'} class="path-step${clickable && p.sel !== null ? ' pickable' : ''}" ${clickable ? `data-ws="${i}"` : ''}><span class="path-key">${k}</span><span>${t}</span><span class="path-cards">${CARDS.map((c, j) => (p.links[j] === i ? `<span class="tag">${j + 1}</span>` : '')).join('')}</span></${clickable ? 'button' : 'div'}>${i < 3 ? '<span class="path-arrow" aria-hidden="true">→</span>' : ''}`).join('')}</div>`;
/* P21: 왼쪽 카드, 오른쪽 학습지. 1번 카드부터 하나씩(03 §3-12) */
RENDER.P21 = () => {
  const p = S('P21');
  const activeIdx = CARDS.findIndex((c, i) => p.links[i] !== c.ws);
  const done = activeIdx < 0;
  return `${head('처음부터 다시 보기', '이번 학기 학습지 네 개에는 내내 XOR이 나왔습니다. <strong>왼쪽 카드는 XOR이 한 일</strong>입니다. 「지금 이을 카드」의 일을 배운 학습지를 오른쪽에서 누르세요. <strong>한 학습지에 카드가 여러 장 이어질 수 있습니다.</strong>')}
  <div class="card match-board" id="p21-board">
    <svg class="match-lines" aria-hidden="true"></svg>
    <div class="match-col">${CARDS.map((c, i) => {
      const linked = p.links[i] === c.ws, active = i === activeIdx;
      return `<div class="xor-card${active ? ' active' : ''}${linked ? ' linked' : ''}${!linked && !active ? ' waiting' : ''}${p.wrongFlash === String(i) ? ' shake' : ''}" data-cardbox="${i}" style="--link:${LINK_COLORS[i]}"><span class="card-no">${i + 1}</span><span>${c.text}</span>${active ? '<span class="now-tag">지금 이을 카드</span>' : ''}${linked ? `<p>${c.ex}</p>` : ''}</div>`;
    }).join('')}</div>
    <div class="match-col ws-col">${WS.map(([t, k, memo], i) => `<button type="button" class="ws-box" data-ws="${i}" ${done ? 'disabled' : ''}><span class="path-key">${k}</span><strong>${t}</strong><span class="small muted">${memo}</span><span class="path-cards">${CARDS.map((c, j) => (p.links[j] === i ? `<span class="tag link-tag" style="--link:${LINK_COLORS[j]}">${j + 1}</span>` : '')).join('')}</span></button>`).join('')}
      ${done ? resultBox('ok', '다섯 장을 모두 이었습니다. 다음 화면에서 마지막 한 문장을 씁니다.') : ''}</div>
  </div>`;
};
function drawMatchLines() {
  const board = $('#p21-board'), svg = board && board.querySelector('.match-lines');
  if (!svg) return;
  const r0 = board.getBoundingClientRect(), p = S('P21');
  svg.setAttribute('viewBox', `0 0 ${Math.round(r0.width)} ${Math.round(r0.height)}`);
  svg.innerHTML = CARDS.map((c, i) => {
    if (p.links[i] !== c.ws) return '';
    const a = board.querySelector(`[data-cardbox="${i}"]`), b = board.querySelector(`.ws-box[data-ws="${c.ws}"]`);
    if (!a || !b) return '';
    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    const x1 = ra.right - r0.left, y1 = ra.top + ra.height / 2 - r0.top, x2 = rb.left - r0.left, y2 = rb.top + rb.height / 2 - r0.top;
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    return `<path d="M${x1} ${y1} C${x1 + 30} ${y1}, ${x2 - 30} ${y2}, ${x2} ${y2}" style="stroke:${LINK_COLORS[i]}"/><circle cx="${mx}" cy="${my}" r="11" style="fill:${LINK_COLORS[i]}"/><text x="${mx}" y="${my + 4.5}">${i + 1}</text>`;
  }).join('');
}
BIND.P21 = () => {
  const p = S('P21');
  requestAnimationFrame(drawMatchLines);
  $$('.ws-box[data-ws]').forEach((b) => b.addEventListener('click', () => {
    const i = CARDS.findIndex((c, k) => p.links[k] !== c.ws);
    if (i < 0) return;
    const ws = Number(b.dataset.ws), ok = CARDS[i].ws === ws;
    logEvent('attempt', 'P21', `카드 ${i + 1} → ${WS[ws][0]}`, ok ? 'ok' : 'fail');
    if (ok) { p.links[i] = ws; p.wrongFlash = ''; success(i === CARDS.length - 1 ? '다섯 장을 모두 이었습니다.' : '맞았습니다. 다음 카드도 이어 보세요.'); } else { p.wrongFlash = String(i); say(HINTS.P21[0], 'tilt'); }
    persist(); render();
  }));
};
window.addEventListener('resize', () => { if (state && state.screenId === 'P21') drawMatchLines(); });

/* ---------- P21s 마지막 한 문장 */
RENDER.P21s = () => {
  const p = S('P21');
  return `${head('마지막 한 문장', '첫 시간에는 한글을 점자, 곧 0과 1로 나타냈습니다. 오늘은 판단을 0과 1과 직선으로 나타냈습니다.')}
  <div class="card stack">${pathHtml(p, false)}
    ${writeBox('P21_sentence', '0과 1로 할 수 있게 된 일 가운데 가장 뜻밖이었던 것은? 한 문장으로 쓰시오.', { rows: 3 })}
    <p class="closing">점자에서 시작한 0과 1이 덧셈과 오류 검사를 거쳐, 판단과 학습의 첫걸음까지 왔습니다. 이어서 「한 걸음 더」를 해 보고 마지막에 제출합니다.</p></div>`;
};

/* ================================================================ 한 걸음 더 (03 §3-13): P24 → P23 → P23w → P25 → 제출 */
RENDER.P24 = () => {
  const p = S('P24');
  const found = new Set([0, ...S('P7').parts, ...p.found]);       // 첫 칸(네 점이 모두 한쪽)은 예시로 채워 둔다
  const L = lineFromPts(p.line);
  const s = L ? PG.sides(L) : null;
  const all7 = PG.PART_KEYS.filter((k) => k !== 6).every((k) => found.has(k));
  const pickOk = p.pick === 6, shapeOk = p.shape === 'XOR';
  return `${head('직선 하나로 만들 수 있는 나누기는 몇 가지?', '네 점을 직선 하나로 두 무리로 나누는 방법을 모두 모아 봅시다. 오른쪽 8칸은 만들 수 있을지 모르는 나누기입니다(진한 점과 흰 점이 두 무리).', '한 걸음 더')}
  <div class="screen-layout two-col fig-left">
    <div class="card"><div class="fig-row"><div id="pl-24" class="plane-box"></div><div class="side-col">${planeControlsHtml('pl-24', true)}
      ${s ? (s.includes(0) ? resultBox('partial', '직선이 점 위를 지나요.') : resultBox('', `이 직선의 나눔: ${partText(PG.partKey(s))}`)) : ''}</div></div></div>
    <div class="card stack">
      <ol class="todo-steps"><li>직선을 긋습니다.</li><li>직선으로 갈린 두 무리가 오른쪽 칸을 채웁니다.</li><li>흐린 칸을 채울 직선을 찾아보세요.</li></ol>
      <h3 style="margin:0">채운 칸 <strong>${found.size}</strong> / 8</h3>
      ${all7 || p.pick !== null ? '<p class="field-label" style="margin:0" data-reveal="pick">끝까지 채울 수 없는 칸을 누르세요.</p>' : ''}
      <div class="part-grid compact">${PG.PART_KEYS.map((k, i) => { const cap = `<strong>${i + 1}</strong> ${found.has(k) ? (k === 0 ? '예시 · ' : '') + partText(k) : '아직'}`; const cls = `part-cell${found.has(k) ? ' found' : ' target'}${p.pick === k ? ' picked' : ''}`; return all7 || p.pick !== null ? `<button type="button" class="${cls} pickable" data-pick="${k}" aria-pressed="${p.pick === k}">${partMiniSvg(k, true)}<span class="cap">${cap}</span></button>` : `<figure class="${cls}">${partMiniSvg(k, true)}<figcaption>${cap}</figcaption></figure>`; }).join('')}</div>
      ${all7 || p.pick !== null ? `<div class="stack">
        ${p.pick !== null ? (pickOk ? resultBox('ok', '대각선에 있는 두 점끼리 묶는 칸입니다.') : resultBox('fail', '다른 칸은 직선으로 만들 수 있었는지 다시 보세요.')) : ''}
        ${pickOk ? `<div class="inline-actions"><span class="field-label">그것은 오늘 무엇과 같은 모양인가?</span>${choiceRow('p24shape', [['AND', 'AND'], ['OR', 'OR'], ['XOR', 'XOR']], p.shape)}</div>${p.shape ? (shapeOk ? resultBox('ok', '맞아요. 8가지 나누기 가운데 XOR 모양 하나만 직선 하나로 만들 수 없습니다.') : resultBox('fail', '●가 대각선에 놓인 판단을 떠올려 보세요.')) : ''}` : ''}</div>` : '<p class="muted small" style="margin:0">일곱 칸을 채우면 마지막 질문이 열립니다.</p>'}
    </div>
  </div>`;
};
BIND.P24 = () => {
  const p = S('P24');
  mountPlane({
    key: 'pl-24',
    draw: () => planeSvg({ line: p.line, interactive: true, pending: pend['pl-24'], title: '나누기 모으기' }),
    get: () => p.line, set: (l) => { p.line = l; },
    commit: () => {
      const L = lineFromPts(p.line);
      if (L) {
        const s = PG.sides(L);
        if (!s.includes(0)) {
          const k = PG.partKey(s);
          const isNew = k !== 0 && !p.found.includes(k) && !S('P7').parts.includes(k);
          if (!p.found.includes(k)) p.found.push(k);
          logEvent('attempt', 'P24', `나눔 ${partText(k)}${isNew ? ' (새 칸)' : ''}`, isNew ? 'ok' : 'partial');
          if (isNew) success('새 칸을 채웠습니다.'); else fail('P24');
        }
      }
      persist(); render();
    }
  });
  $$('[data-pick]').forEach((r) => r.addEventListener('click', () => { p.pick = Number(r.dataset.pick); logEvent('attempt', 'P24', `채울 수 없는 칸: ${partText(p.pick)}`, p.pick === 6 ? 'ok' : 'fail'); persist(); render(); }));
  $$('input[name="p24shape"]').forEach((r) => r.addEventListener('change', () => { p.shape = r.value; logEvent('attempt', 'P24', `같은 모양: ${r.value}`, r.value === 'XOR' ? 'ok' : 'fail'); persist(); render(); }));
};

const P23_TARGETS = [['AND', 'AND'], ['OR', 'OR'], ['NOT_A', 'NOT A'], ['XOR', 'XOR']];
const targetName = (k) => (P23_TARGETS.find(([v]) => v === k) || [, k])[1];
RENDER.P23 = () => {
  const p = S('P23'), target = LAB[p.target];
  const L = PG.weightLine(p.w1, p.w2, p.t);
  const outs = PG.POINTS.map((pt) => PG.weightOut(p.w1, p.w2, p.t, pt));
  const m = outs.filter((v, i) => v === target[i]).length;
  const seg = L ? PG.segmentIn(L) : null;
  const n = (x) => fmtK(x / 10);
  const slider = (k, name) => `<div class="slider-wrap inline"><label for="p23-${k}">${name} = <strong>${n(p[k])}</strong></label><input id="p23-${k}" data-p23="${k}" type="range" min="-20" max="20" step="1" value="${p[k]}"></div>`;
  return `${head('입력마다 다른 수를 곱하면?', '출력이 w<sub>1</sub>A + w<sub>2</sub>B &gt; θ이면 1, 아니면 0인 퍼셉트론을 생각합시다. 입력 A, B에 각각 수 w<sub>1</sub>, w<sub>2</sub>를 곱해 더하고, 기준 θ와 비교합니다. 이제 기준선의 <strong>기울기</strong>도 바뀝니다.', '5-5')}
  <div class="screen-layout two-col fig-left">
    <div class="card"><div class="plane-box mid">${planeSvg({ labels: target, line: seg ? { p: seg[0], q: seg[1] } : null, title: '가중치 기준선' })}</div>${L ? '' : '<p class="muted small">w₁과 w₂가 모두 0이면 직선이 없습니다.</p>'}</div>
    <div class="card stack">
      <ol class="todo-steps"><li>AND와 OR을 다른 기울기로 만들어 보세요.</li><li>NOT A(A가 0이면 1, 1이면 0, B는 상관없음)를 만들어 보세요. 곱하는 수는 음수여도 됩니다.</li><li>XOR에 도전해 보세요.</li></ol>
      <div class="inline-actions"><span class="field-label">목표</span>${choiceRow('p23t', P23_TARGETS, p.target)}</div>
      ${slider('w1', 'w₁')}${slider('w2', 'w₂')}${slider('t', 'θ')}
      <div class="result ${m === 4 ? 'ok' : ''}" role="status">${targetName(p.target)}과 맞는 점 <strong>${m}</strong>개 / 4개${m === 4 && p.target === 'NOT_A' ? ' — 판단 장치로 NOT도 만들었습니다.' : ''}</div>
      <p class="muted small" style="margin:0">다음 화면에서 XOR이 왜 안 되는지 부등식으로 따져 봅니다.</p>
    </div>
  </div>`;
};
let p23LogTimer = null;
BIND.P23 = () => {
  const p = S('P23');
  $$('input[name="p23t"]').forEach((r) => r.addEventListener('change', () => { p.target = r.value; persist(); render(); }));
  $$('[data-p23]').forEach((s) => s.addEventListener('change', () => render()));
  $$('[data-p23]').forEach((s) => s.addEventListener('input', (e) => {
    p[s.dataset.p23] = Number(e.target.value); persist(); softRender(e.target);
    clearTimeout(p23LogTimer);
    p23LogTimer = setTimeout(() => { const t = LAB[p.target]; const m = PG.POINTS.map((pt) => PG.weightOut(p.w1, p.w2, p.t, pt)).filter((v, i) => v === t[i]).length; logEvent('attempt', 'P23', `${targetName(p.target)} · w1=${p.w1 / 10}, w2=${p.w2 / 10}, θ=${p.t / 10} · 맞는 점 ${m}`, m === 4 ? 'ok' : 'fail'); }, 700);
  }));
};

/* ---------- P23w 부등호 고르기 → 단계 펼침(03 §3-13) */
const P23W_LEFT = ['0', 'w<sub>2</sub>', 'w<sub>1</sub>', 'w<sub>1</sub> + w<sub>2</sub>'];
const P23W_ANS = ['le', 'gt', 'gt', 'le'];
const P23W_STEPS = [
  '(0, 0)의 조건 0 ≤ θ에서, θ는 0보다 크거나 같습니다.',
  '(0, 1)과 (1, 0)의 두 부등식 w<sub>2</sub> &gt; θ, w<sub>1</sub> &gt; θ를 더하면 w<sub>1</sub> + w<sub>2</sub> &gt; 2θ입니다.',
  'θ ≥ 0이므로 2θ ≥ θ입니다. 그래서 w<sub>1</sub> + w<sub>2</sub> &gt; θ가 됩니다.',
  '그런데 (1, 1)의 조건은 w<sub>1</sub> + w<sub>2</sub> ≤ θ였습니다. 두 조건이 맞지 않으므로, 네 부등식을 모두 만족하는 w<sub>1</sub>, w<sub>2</sub>, θ는 없습니다.'
];
RENDER.P23w = () => {
  const p = S('P23w');
  const allSet = p.signs.every(Boolean), signsOk = p.signs.every((v, i) => v === P23W_ANS[i]);
  const sumOk = PG.parseNumber(p.sum) === 2;
  const step = p.explain;
  return `${head('왜 안 되는지 부등식으로', 'XOR의 네 점이 퍼셉트론 w<sub>1</sub>A + w<sub>2</sub>B &gt; θ에 주는 조건을 부등식으로 쓰고, 네 조건을 한꺼번에 만족할 수 없는 까닭을 따져 봅시다.', '5-5')}
  <div class="screen-layout two-col fig-left">
    <div class="card stack"><p class="muted small" style="margin:0">출력 1은 「&gt; θ」, 출력 0은 「&gt; θ가 아니다」, 곧 「≤ θ」입니다. 점마다 부등호를 고르세요.</p>
      <table class="truth compact"><thead><tr><th>점 (A, B)</th><th>XOR</th><th>조건</th></tr></thead><tbody>${PG.POINTS.map((pt, i) => `<tr><td>${COORD[i]}</td><td>${LAB.XOR[i]}</td><td class="ineq">${P23W_LEFT[i]} <select data-sign="${i}" aria-label="${COORD[i]}의 부등호"><option value="">고르기</option><option value="gt" ${p.signs[i] === 'gt' ? 'selected' : ''}>&gt;</option><option value="le" ${p.signs[i] === 'le' ? 'selected' : ''}>≤</option></select> θ</td></tr>`).join('')}</tbody></table>
      ${allSet ? (signsOk ? resultBox('ok', '네 조건을 맞게 썼습니다.') : resultBox('fail', '출력이 1인 점과 0인 점을 다시 보세요.')) : ''}</div>
    <div class="card stack">
      ${signsOk ? `<div class="stack" data-reveal="steps">
        <p class="blank-sentence">(0, 1)과 (1, 0)의 두 부등식을 더하면 w<sub>1</sub> + w<sub>2</sub> &gt; <input class="blank-input short" id="p23w-sum" value="${esc(p.sum)}" inputmode="decimal" aria-label="몇 θ"> θ</p>
        ${p.sum ? (sumOk ? resultBox('ok', '맞아요. 이제 왜 그런지 단계로 봅시다.') : resultBox('fail', 'w₂ > θ와 w₁ > θ의 오른쪽 θ도 더해 보세요.')) : ''}
        ${sumOk ? `<div class="step-view">${step ? P23W_STEPS.slice(0, step).map((t, i) => `<p class="explain-step"><span class="step-no">${i + 1}</span>${t}</p>`).join('') : ''}<div class="step-nav">${step < 4 ? `<button id="p23w-step" class="primary-button" type="button">${step ? '다음 단계' : '까닭 보기 (4단계)'}</button>` : ''}<span class="step-count">${step} / 4</span></div></div>` : ''}
        ${step >= 4 ? writeBox('P23_reason', '위 단계를 내 말로 한 줄로 쓰시오.', { rows: 1 }) : ''}
      </div>` : '<p class="muted" style="margin:0">왼쪽에서 네 조건을 맞게 고르면 까닭을 차례로 따져 봅니다.</p>'}
      <p class="muted small" style="margin:0">입력마다 다른 수를 곱해도 직선 하나로는 XOR을 만들 수 없습니다. 그래서 층이 꼭 필요합니다.</p>
    </div>
  </div>`;
};
BIND.P23w = () => {
  const p = S('P23w');
  $$('[data-sign]').forEach((sel) => sel.addEventListener('change', () => {
    p.signs[Number(sel.dataset.sign)] = sel.value;
    if (p.signs.every(Boolean)) { const ok = p.signs.every((v, i) => v === P23W_ANS[i]); logEvent('attempt', 'P23w', `부등호 ${p.signs.join(',')}`, ok ? 'ok' : 'fail'); if (!ok) fail('P23w'); }
    persist(); render();
  }));
  $('#p23w-sum')?.addEventListener('change', (e) => { p.sum = e.target.value; logEvent('attempt', 'P23w', `두 부등식의 합: ${p.sum}θ`, PG.parseNumber(p.sum) === 2 ? 'ok' : 'fail'); persist(); render(); });
  $('#p23w-step')?.addEventListener('click', () => { p.explain = Math.min(4, p.explain + 1); persist(); render(); });
};

const LEARN_POINT_TEXT = (r) => `${COORD[r.point]}: 출력 ${r.output}, 목표 ${r.want} → ${r.moved ? '틀려서 직선을 옮김' : '맞음'}`;
const WHY_OPTS = [['none', '직선 하나로 ●와 ○를 가르는 방법이 없어서'], ['small', '직선을 옮기는 정도가 작아서'], ['many', '점이 너무 많아서']];
RENDER.P25 = () => {
  const p = S('P25'), target = LAB[p.target];
  const s = p.learn || PG.learnInit();
  const L = PG.learnLine(s);
  const seg = L ? PG.segmentIn(L) : null;
  const status = s.done ? `한 바퀴를 틀림 없이 돌았습니다. ${s.epoch}바퀴 만에 멈췄습니다.` : p.target === 'XOR' && s.epoch >= 200 ? '200바퀴를 돌아도 멈추지 않았습니다. 직선이 계속 흔들립니다.' : `${s.epoch}바퀴째${s.lastEpochErrors !== null ? ` · 지난 바퀴에서 틀린 점 ${s.lastEpochErrors}개` : ''}`;
  return `${head('기계가 직선을 찾는다', '규칙은 하나입니다. 네 점을 차례로 보면서, <strong>틀린 점이 있으면 직선을 그 점 쪽으로 조금 옮긴다.</strong> 한 바퀴를 틀림 없이 돌면 멈춥니다.', '한 걸음 더')}
  <div class="screen-layout two-col fig-left">
    <div class="card"><div class="plane-box mid">${planeSvg({ labels: target, line: seg ? { p: seg[0], q: seg[1] } : null, selected: p.last ? [p.last.point] : [], wrong: p.last && p.last.moved ? [p.last.point] : [], title: '기계가 찾는 직선' })}</div></div>
    <div class="card stack">
      <ol class="todo-steps"><li>AND로 「자동 실행」</li><li>OR로 「자동 실행」</li><li>XOR로 「자동 실행」</li></ol>
      <div class="inline-actions"><span class="field-label">목표</span>${choiceRow('p25t', [['AND', 'AND'], ['OR', 'OR'], ['XOR', 'XOR']], p.target)}</div>
      <div class="button-row"><button id="p25-one" class="secondary-button" type="button" ${s.done ? 'disabled' : ''}>한 번</button><button id="p25-run" class="primary-button" type="button" ${s.done ? 'disabled' : ''}>${activeTimer ? '멈춤' : '자동 실행'}</button><button id="p25-reset" class="secondary-button" type="button">처음부터</button></div>
      <div class="result ${s.done ? 'ok' : ''}" role="status">${status}</div>
      ${p.last ? `<p class="small" style="margin:0">방금: ${LEARN_POINT_TEXT(p.last)}</p>` : ''}
      <div class="field"><span class="field-label">XOR에서는 왜 멈추지 않을까?</span>${choiceRow('p25why', WHY_OPTS, p.why)}</div>
      ${p.why ? (p.why === 'none' ? resultBox('ok', '맞아요. 가를 수 있는 직선이 없으니, 직선을 아무리 옮겨도 늘 틀린 점이 남습니다.') : resultBox('fail', 'AND와 OR은 같은 규칙으로 멈췄습니다. XOR만 다른 까닭을 떠올려 보세요.')) : ''}
      ${p.why === 'none' ? writeBox('P25_link', '「층을 쌓는다」에서 본 「학습」과 이어 보면? 한 줄로 쓰시오.', { rows: 2 }) : ''}
    </div>
  </div>`;
};
BIND.P25 = () => {
  const p = S('P25');
  const step = () => {
    const s = p.learn || PG.learnInit();
    if (s.done || (p.target === 'XOR' && s.epoch >= 200) || s.epoch >= 400) { stopTimer(); return false; }
    const r = PG.learnStep(s, LAB[p.target]);
    p.learn = r.state; p.last = { point: r.point, output: r.output, want: r.want, moved: r.moved };
    if (r.state.done || (p.target === 'XOR' && r.state.epoch >= 200)) { stopTimer(); logEvent('attempt', 'P25', `${p.target} · ${r.state.epoch}바퀴 · ${r.state.done ? '멈춤' : '멈추지 않음'}`, r.state.done ? 'ok' : 'fail'); }
    return true;
  };
  $$('input[name="p25t"]').forEach((r) => r.addEventListener('change', () => { stopTimer(); p.target = r.value; p.learn = null; p.last = null; persist(); render(); }));
  $('#p25-one').addEventListener('click', () => { stopTimer(); step(); persist(); render(); });
  $('#p25-run').addEventListener('click', () => {
    if (activeTimer) { stopTimer(); render(); return; }
    activeTimer = setInterval(() => { if (state.screenId !== 'P25') { stopTimer(); return; } const go = step(); persist(); render(); if (!go) stopTimer(); }, p.target === 'XOR' ? 60 : 350);
    render();
  });
  $('#p25-reset').addEventListener('click', () => { stopTimer(); p.learn = null; p.last = null; persist(); render(); });
  $$('input[name="p25why"]').forEach((r) => r.addEventListener('change', () => { p.why = r.value; logEvent('attempt', 'P25', `멈추지 않는 까닭: ${(WHY_OPTS.find(([v]) => v === r.value) || [, ''])[1]}`, r.value === 'none' ? 'ok' : 'fail'); persist(); render(); }));
};
