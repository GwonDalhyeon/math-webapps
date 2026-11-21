/* 「퍼셉트론, 직선으로 판단하다」 — 보기 P13~P25 (한 화면 배치: 02_화면배치_검토 §3·§4) */
'use strict';

/* ================================================================ 섹션 5 */
RENDER.P13 = () => {
  const v = predictValue('P12');
  const locked = predictLocked('P12');
  return `${head('쉬는 시간 전에 쓴 답', '쉬는 시간 전에 「접기와 회로는 어떻게 닮았을까?」에 이렇게 썼습니다. 오늘 2교시에 이 답을 확인합니다.')}
  <div class="card"><blockquote class="my-answer">${v ? esc(v) : '<span class="muted">아직 쓰지 않았어요.</span>'}</blockquote>${locked ? '' : '<p class="muted small">아직 확정하지 않은 답입니다.</p>'}</div>`;
};

RENDER.P14 = () => `${head('더해서 기준과 비교한다', '메일 프로그램은 「무료」, 「당첨」 같은 단어마다 점수를 정해 둡니다. 메일에 들어 있는 단어의 점수를 모두 더해, 합이 기준보다 크면 스팸함으로 보냅니다.', '5')}
  <div class="screen-layout two-col fig-left">
    <div class="card"><img class="comic" src="assets/spam.png" alt="메일이 받은 편지함과 스팸함 가운데 한곳으로만 들어가는 그림"><p class="caption">메일은 받은 편지함과 스팸함 가운데 한곳으로만 들어갑니다.</p></div>
    <div class="card stack">
      <p style="margin:0">4절 도입의 합격선(국어 점수와 수학 점수의 합이 150점보다 크면 합격)도 같은 방식입니다. <strong>더해서 기준과 비교한다</strong>는 것이 둘의 공통점입니다.</p>
      ${termBox('퍼셉트론', '입력을 더한 값이 기준보다 크면 1, 그렇지 않으면 0을 내는 판단 장치. 입력마다 다른 수를 곱해 더할 수도 있습니다. 스팸 메일에서 단어마다 점수가 다른 것과 같습니다.')}
      <img class="figure compact" src="assets/perceptron.svg" alt="입력 A와 B를 더하고 기준과 비교해 1 또는 0을 내는 퍼셉트론 그림">
      <p style="margin:0">이 화면에서 입력 A, B는 0 또는 1이고, 기준은 수 c로 나타냅니다. 곧 <strong>A+B &gt; c이면 1, 아니면 0</strong>입니다.</p>
    </div>
  </div>`;

/* 판단 장치 그림: A + B = s → s > c ? → 출력 */
function deviceHtml(c10, pt, o = {}) {
  const c = fmtK(c10 / 10);
  if (!pt) return `<div class="device"><span class="dv-in">A</span><span class="dv-op">+</span><span class="dv-in">B</span><span class="dv-op">→</span><span class="dv-box">합 &gt; ${c} ?</span><span class="dv-op">→</span><span class="dv-out">?</span></div>`;
  const s = pt[0] + pt[1], out = PG.thresholdOut(c10, pt);
  return `<div class="device on"><span class="dv-in">${pt[0]}</span><span class="dv-op">+</span><span class="dv-in">${pt[1]}</span><span class="dv-op">=</span><span class="dv-sum">${s}</span><span class="dv-op">→</span><span class="dv-box">${s} &gt; ${c} ? ${o.hideOut ? '…' : out ? '예' : '아니오'}</span><span class="dv-op">→</span><span class="dv-out${out && !o.hideOut ? ' one' : ''}">${o.hideOut ? '?' : out}</span></div>`;
}
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
function cFigure(c10s, labels, title, size = 'small') {
  const plane = c10s.length === 1 ? cPlaneSvg(c10s[0], labels, { title })
    : planeSvg({ labels, fixed: [{ L: PG.lineSum(0.5), cls: 'fixed-line', text: `${vA}+${vB}=0.5`, at: [0.96, -0.35], anchor: 'start' }, { L: PG.lineSum(1.5), cls: 'fixed-line', ...sumLabel(1.5, `${vA}+${vB}=1.5`) }], selected: S('P18').picked, title });
  return `<div class="plane-box ${size}">${plane}</div><div class="sumline-box${size === 'small' ? ' small' : ''}">${sumlineSvg({ labels, dividers: c10s })}</div><p class="caption">아래: 합으로 줄 세우기 — ${c10s.length === 1 ? '칸막이 c의 오른쪽' : '두 칸막이 사이'}가 출력 1</p>`;
}
function cSlider(id, c10, extra = '', note = '') {
  return `<div class="slider-wrap inline"><label for="${id}">기준 c = <strong>${fmtK(c10 / 10)}</strong>${note}</label><input id="${id}" type="range" min="-5" max="25" step="1" value="${c10}"></div>${extra}`;
}

/* ---------- P15 AND */
RENDER.P15 = () => {
  const p = S('P15');
  const done = Object.keys(p.rows).length;
  const sel = p.sel;
  const ran = sel !== null && p.rows[sel];
  const labels = PG.POINTS.map((pt, i) => (p.rows[i] ? LAB.AND[i] : null));
  const table = `<table class="truth compact"><thead><tr><th>점 (A, B)</th><th>A+B</th><th>내 예측</th><th>출력</th><th>AND</th><th>맞는가</th></tr></thead><tbody>${PG.POINTS.map((pt, i) => {
    const r = p.rows[i];
    if (!r) return `<tr><td>${COORD[i]}</td><td></td><td></td><td></td><td>${LAB.AND[i]}</td><td></td></tr>`;
    const out = PG.thresholdOut(15, pt);
    return `<tr><td>${COORD[i]}</td><td>${pt[0] + pt[1]}</td><td>${r.guess}</td><td><strong>${out}</strong></td><td>${LAB.AND[i]}</td><td>${out === LAB.AND[i] ? '○' : '×'}</td></tr>`;
  }).join('')}</tbody></table>`;
  return `${head('AND를 판단하는 기준', 'AND를 판단하는 기준으로 A+B &gt; 1.5를 쓸 수 있습니다. 점을 하나 골라 출력을 먼저 예측한 뒤, 판단 장치를 돌려 보세요. 넣은 점은 왼쪽 그림에 칠해집니다.', '5-1')}
  <div class="screen-layout two-col fig-left">
    <div class="card">${cFigure([15], labels, 'AND와 기준선 A+B=1.5')}</div>
    <div class="card stack">
      ${done < 4 ? `<div class="choice-row">${PG.POINTS.map((pt, i) => `<button type="button" class="pill-button${sel === i ? ' on' : ''}${p.rows[i] ? ' done' : ''}" data-p15pt="${i}">${COORD[i]}${p.rows[i] ? ' ✓' : ''}</button>`).join('')}</div>
      ${deviceHtml(15, sel !== null ? PG.POINTS[sel] : null, { hideOut: sel !== null && !ran })}` : ''}
      ${sel !== null && !ran ? `<div class="inline-actions"><span class="field-label">출력은?</span>${choiceRow('p15g', [['1', '1'], ['0', '0']], p.guess === null ? '' : String(p.guess))}<button id="p15-run" class="primary-button" type="button" ${p.guess === null ? 'disabled' : ''}>돌려 보기</button></div>` : ''}
      ${ran && done < 4 ? resultBox(p.rows[sel].guess === PG.thresholdOut(15, PG.POINTS[sel]) ? 'ok' : 'fail', `예측 ${p.rows[sel].guess} · 출력 ${PG.thresholdOut(15, PG.POINTS[sel])}`) : ''}
      ${table}
      ${done === 4 ? `<div class="stack" data-reveal="q2"><div class="field"><span class="field-label">(2) 직선 A+B=1.5의 오른쪽 위에 있는 점을 모두 고르시오.</span><div class="choice-row">${PG.POINTS.map((pt, i) => `<label class="pill${p.right.includes(i) ? ' on' : ''}"><input type="checkbox" data-p15r="${i}" ${p.right.includes(i) ? 'checked' : ''}><span>${COORD[i]}</span></label>`).join('')}</div></div>
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
const RANGE_OPTS = [['a', '0 이상 1 미만'], ['b', '0보다 크고 1 이하'], ['c', '0.5 하나뿐'], ['d', '0 이상 1 이하']];
function orStatus(c10) {
  const m = PG.matches(c10, LAB.OR), onPt = PG.cOnPoint(c10), c = fmtK(c10 / 10);
  let s = `OR과 맞는 점 <strong>${m}</strong>개 / 4개`;
  if (onPt) s += ` · <span class="warn-text">기준선(A+B=${c})이 점 위를 지납니다. 부등식으로는 판정할 수 있지만, 4절 그림 규칙으로는 나눈 것으로 보지 않아요.</span>`;
  return `<div class="result ${m === 4 && !onPt ? 'ok' : m === 4 ? 'partial' : ''}" role="status">${s}</div>`;
}
function bindC(screen, inputId) {
  const p = S(screen);
  const setC = (c10) => { p.c10 = Math.max(-5, Math.min(25, c10)); persist(); render(); };
  $('#' + inputId)?.addEventListener('input', (e) => setC(Number(e.target.value)));
  $$('[data-cstep]').forEach((b) => b.addEventListener('click', () => setC(p.c10 + Number(b.dataset.cstep))));
  $('#c-num')?.addEventListener('change', (e) => { const v = PG.parseNumber(e.target.value); if (v !== null) setC(Math.round(v * 10)); });
}
const cFine = (c10) => `<div class="inline-actions"><button class="tool-button" type="button" data-cstep="-1">− 0.1</button><button class="tool-button" type="button" data-cstep="1">+ 0.1</button><input id="c-num" type="text" inputmode="decimal" value="${fmtK(c10 / 10)}" style="max-width:90px" aria-label="c 값 입력"></div>`;
RENDER.P16 = () => {
  const p = S('P16'), locked = predictLocked('P16');
  return `${head('OR이 되는 기준 c 찾기', 'OR을 판단하는 기준을 찾아봅시다. A+B &gt; c에서 c를 어떤 수로 하면 될까요?', '5-2 (1)·(2)')}
  <div class="screen-layout two-col fig-left">
    <div class="card">${locked ? cFigure([p.c10], LAB.OR, `OR과 기준선 A+B=${fmtK(p.c10 / 10)}`) : `<div class="plane-box mid">${planeSvg({ labels: LAB.OR, title: 'OR의 네 점' })}</div>`}</div>
    <div class="card stack">
      ${locked ? `<p class="quote-line" style="padding:6px 10px">(1) 내 예측: c = <strong>${esc(predictValue('P16') || '')}</strong> <span class="muted small">(확정함) — 이제 c를 움직여 확인해 보세요.</span></p>` : `<div class="field"><label for="p16-pred">(1) OR을 판단하려면 c를 어떤 수로 하면 될까? 하나 정해 쓰고 「확정」을 누르시오.</label>
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

/* ---------- P16w 기준선은 어떻게 달라지나 */
RENDER.P16w = () => {
  const p = S('P16');
  return `${head('기준선은 어떻게 달라지나', '앞 화면에서 찾은 c를 떠올리며 c를 다시 움직여 보고, 기준선이 어떻게 달라지는지 정리해 봅시다.', '5-2 (3)')}
  <div class="screen-layout two-col fig-left">
    <div class="card stack"><div class="plane-box small">${cPlaneSvg(p.c10, LAB.OR, { title: `OR과 기준선 A+B=${fmtK(p.c10 / 10)}` })}</div><div class="sumline-box small">${sumlineSvg({ labels: LAB.OR, dividers: [p.c10] })}</div>${cSlider('p16w-c', p.c10, '', ` · OR과 맞는 점 ${PG.matches(p.c10, LAB.OR)}개`)}</div>
    <div class="card stack">
      <div class="field"><span class="field-label">[선택] c를 어디부터 어디까지 움직여도 OR일까? 0과 1 근처에서 천천히 움직여 보세요.</span>${choiceRow('p16r', RANGE_OPTS, p.rangeChoice)}</div>
      ${p.rangeChoice ? (p.rangeChoice === 'a' ? resultBox('ok', '맞아요. 출력은 기준선이 점을 지날 때(c = 0, c = 1)만 바뀝니다.') : resultBox('partial', 'c = 0일 때와 c = 1일 때 OR과 맞는 점이 몇 개인지 다시 보세요.')) : ''}
      ${writeBox('P16_range', '[선택] 그 끝에서 기준선은 어디를 지나는가?', { rows: 2 })}
      ${writeBox('P16_sentence', '기준 c를 바꾸면 기준선이 어떻게 달라지는지 「기울기」와 「위치」라는 말을 넣어 한 문장으로 쓰시오.', { rows: 2 })}
    </div>
  </div>`;
};
BIND.P16w = () => {
  const p = S('P16');
  bindC('P16', 'p16w-c');
  $$('input[name="p16r"]').forEach((r) => r.addEventListener('change', () => { p.rangeChoice = r.value; logEvent('write', 'P16w', `범위 고르기: ${r.value}`); render(); }));
};

/* ---------- P17 XOR도 될까 */
RENDER.P17 = () => {
  const p = S('P17');
  const m = PG.matches(p.c10, LAB.XOR);
  return `${head('XOR도 될까', 'XOR의 값은 (0, 0)에서 0, (0, 1)에서 1, (1, 0)에서 1, (1, 1)에서 0입니다. 같은 판단 장치로 c를 움직여 XOR을 만들어 보세요.', '5-3')}
  <div class="screen-layout two-col fig-left">
    <div class="card">${cFigure([p.c10], LAB.XOR, `XOR과 기준선 A+B=${fmtK(p.c10 / 10)}`)}</div>
    <div class="card stack">
      <div class="slider-row">${cSlider('p17-c', p.c10, '', ` · XOR과 맞는 점 <strong>${m}</strong>개`)}<button id="p17-sweep" class="secondary-button" type="button">${activeTimer ? '움직이는 중…' : '끝에서 끝까지'}</button></div>
      ${cTableHtml(p.c10, LAB.XOR, 'XOR')}
      ${writeBox('P17_reason', '어떤 c로도 안 되는 까닭을 2~3문장으로 쓰시오.', { rows: 3, hint: '네 점의 A+B 값과 XOR의 값을 비교해 보세요.' })}
      <details class="story" ${p.story ? 'open' : ''}><summary>1969년 이야기 (까닭을 쓴 뒤에 열어 보세요)</summary>
        <p>1969년에 나온 책이, 직선 하나로 판단하는 퍼셉트론은 XOR 같은 문제를 풀 수 없다는 점을 보였습니다. 그 뒤로 한동안 이 분야 연구가 위축되는 데 영향을 주었습니다. 방금 여러분이 겪은 막힘이 실제로 연구자들이 겪은 막힘입니다.</p></details>
    </div>
  </div>`;
};
let p17LogTimer = null;
BIND.P17 = () => {
  const p = S('P17');
  const logC = () => { clearTimeout(p17LogTimer); p17LogTimer = setTimeout(() => logEvent('attempt', 'P17', `c = ${fmtK(p.c10 / 10)} · XOR 일치 ${PG.matches(p.c10, LAB.XOR)}`, 'fail'), 700); };
  $('#p17-c').addEventListener('input', (e) => { stopTimer(); p.c10 = Number(e.target.value); persist(); render(); logC(); });
  $('#p17-sweep').addEventListener('click', () => {
    if (activeTimer) return;
    p.c10 = -5; render();
    let best = 0;
    activeTimer = setInterval(() => {
      if (state.screenId !== 'P17') { stopTimer(); return; }
      best = Math.max(best, PG.matches(p.c10, LAB.XOR));
      if (p.c10 >= 25) { stopTimer(); logEvent('attempt', 'P17', `끝에서 끝까지 움직이기 · 가장 많이 맞은 점 ${best}개`, 'fail'); say(`끝에서 끝까지 움직였습니다. 가장 많이 맞은 것은 ${best}개였어요.`, 'idle'); render(); return; }
      p.c10 += 1; persist(); render();
    }, 200);
  });
  $('.story')?.addEventListener('toggle', (e) => {
    const wrote = String(state.writes.P17_reason || '').trim().length > 0;
    if (e.target.open && !wrote) { e.target.open = false; say('위 칸에 까닭을 먼저 써 보세요.', 'idle'); renderMascot(); return; }
    p.story = e.target.open; persist();
  });
};

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

/* ---------- P18c 두 판단을 이어 판단하기 */
RENDER.P18c = () => {
  const p = S('P18');
  const vBand = PG.circuitValues(PG.BAND_CIRCUIT, p.sw), vXor = PG.circuitValues(PG.XOR_CIRCUIT, p.sw);
  const full = p.band.every((x) => x !== null) && p.xor.every((x) => x !== null);
  const tbl = [[0, 0], [0, 1], [1, 0], [1, 1]].map((r, i) => {
    const cell = (k) => { const v = p[k][i]; return `<button type="button" class="cell-button${v === null ? ' empty' : ''}${full && v !== LAB.XOR[i] ? ' wrong' : ''}" data-p18t="${k}:${i}">${v === null ? '?' : v}</button>`; };
    return `<tr class="${p.sw.A === r[0] && p.sw.B === r[1] ? 'now' : ''}"><td>${r[0]}</td><td>${r[1]}</td><td>${cell('band')}</td><td>${cell('xor')}</td></tr>`;
  }).join('');
  return `${head('두 판단을 이어 판단하기', '「두 직선 사이에 있다」, 곧 「A+B &gt; 0.5이고, A+B &gt; 1.5는 아니다」를 회로로 그리면 위와 같습니다. 아래는 되짚기에서 본 XOR 회로입니다. 스위치를 함께 움직여 두 회로의 출력을 표에 채우세요.', '5-4')}
  <div class="screen-layout two-col">
    <div class="card circuits-stack">
      <div><p class="caption" style="text-align:left">판단 장치 두 개를 이은 회로</p>${circuitSvg(PG.BAND_CIRCUIT, vBand, { title: '판단 장치 두 개를 이은 회로' })}</div>
      <div><p class="caption" style="text-align:left">XOR 회로 (A OR B) AND NOT (A AND B)</p>${circuitSvg(PG.XOR_CIRCUIT, vXor, { title: 'XOR 회로' })}</div>
      <div class="switch-row"><span class="muted small">스위치:</span>${['A', 'B'].map((x) => `<button type="button" class="switch${p.sw[x] ? ' on' : ''}" data-sw18="${x}" aria-pressed="${p.sw[x] ? 'true' : 'false'}">${x} = ${p.sw[x]}</button>`).join('')}</div>
    </div>
    <div class="card stack">
      <table class="truth compact"><thead><tr><th>A</th><th>B</th><th>판단 장치 회로</th><th>XOR 회로</th></tr></thead><tbody>${tbl}</tbody></table>
      ${p.tableOk === true ? resultBox('ok', '두 회로는 네 경우 모두 같은 출력을 냅니다.') : p.tableOk === false ? resultBox('fail', '틀린 칸이 있어요. 그 행의 입력대로 스위치를 놓고 출력 상자를 보세요.') : '<p class="muted small" style="margin:0">지금 스위치 상태의 행이 칠해집니다.</p>'}
      ${p.tableOk === true ? '<p style="margin:0" data-reveal="done">그러므로 「두 직선 사이에 있다」는 대면 수업 3절에서 만든 XOR 회로와 같은 일을 합니다. <strong>직선 하나로 판단한 두 결과를 다시 이어 판단한 것</strong>입니다.</p>' : ''}
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
      if (p.tableOk) success('두 회로가 같은 판단을 합니다.');
    } else p.tableOk = null;
    render();
  }));
};

/* ---------- P19 층을 쌓는다 */
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
  const v = predictValue('P12');
  return `${head('층을 쌓는다', '직선 하나로 판단하면 <strong>단층 퍼셉트론</strong>, 여러 직선의 판단을 다시 이어 판단하면 <strong>다층 퍼셉트론</strong>입니다. XOR은 층을 쌓으면 됩니다.')}
  <div class="screen-layout two-col fig-left">
    <div class="card stack"><div class="plane-box small">${unfoldSvg(line, { title: '4-3에서 펼친 평면' })}</div><p class="small" style="margin:0">${foldNote}</p></div>
    <div class="card stack">
      <p style="margin:0"><strong>접기</strong>는 평면을 한 번 바꾼 뒤 직선 하나로, <strong>회로</strong>는 OR과 AND로 먼저 판단한 결과를 다시 판단합니다. 둘 다 <strong>두 단계로 판단한다</strong>는 점이 닮았습니다.</p>
      <blockquote class="my-answer compact"><span class="muted small">쉬는 시간 전의 내 답 · </span>${v ? esc(v) : '<span class="muted">쓰지 않았어요.</span>'}</blockquote>
      ${writeBox('P19_line', '쉬는 시간 전의 내 답에서 맞았던 것, 고치고 싶은 것을 한 줄로 쓰시오.', { rows: 1 })}
      ${termBox('인공신경망', '오늘날 인공지능에 쓰이는 인공신경망은 퍼셉트론 같은 판단 장치를 여러 층으로 아주 많이 이은 것입니다. 그리고 기준선의 위치를 사람이 정하지 않고, 자료를 보고 컴퓨터가 정합니다. 이것을 <strong>학습</strong>이라고 합니다.')}
      <p class="muted small" style="margin:0">1969년 뒤 위축되었던 연구는 여러 층을 학습시키는 방법이 1980년대에 알려지며 다시 활발해졌습니다. 컴퓨터가 기준선을 정하는 모습은 「더 해보기」의 「기계가 직선을 찾는다」에서 볼 수 있습니다.</p>
    </div>
  </div>`;
};

/* ================================================================ 섹션 6 */
const PRED_TEXT = { yes: '된다', no: '안 된다', unsure: '모르겠다' };
RENDER.P20 = () => {
  const pv = predictValue('P5') || {};
  const actual = { AND: '직선 하나로 된다', OR: '직선 하나로 된다', XOR: '직선 하나로는 안 된다 · 직선 두 개(층 둘)면 된다' };
  const p7 = S('P7'), p16 = S('P16');
  return `${head('처음 예상과 비교', '「AND, OR, XOR도 직선 하나로 가를 수 있을까?」에 대한 처음 예상과 실제를 나란히 놓았습니다.')}
  <div class="card stack"><table class="truth compact"><thead><tr><th>연산</th><th>처음 예상${predictLocked('P5') ? '' : ' (미확정)'}</th><th>실제</th></tr></thead><tbody>${['AND', 'OR', 'XOR'].map((op) => `<tr><td><strong>${op}</strong></td><td>${PRED_TEXT[pv[op]] || '고르지 않음'}</td><td>${actual[op]}</td></tr>`).join('')}</tbody></table>
    <div class="evidence">오늘의 기록 — XOR에 그어 본 직선 ${p7.history.length}개(나눈 방법 ${p7.parts.length}가지) · OR이 되는 c로 기록한 수 ${p16.found.length ? p16.found.map((x) => fmtK(x / 10)).join(', ') : '없음'} · 접은 그림 ${S('P11').ok ? '직선 하나로 가름' : '미완료'}</div>
    ${writeBox('P20_reflect', '처음 생각과 달라진 점은 무엇인가요? 한두 문장으로 쓰시오.', { rows: 3 })}</div>`;
};

const WS = [
  ['점자를 수로, 수를 연산으로', '부호화 · 연산'], ['믿을 수 있게 보내기', '오류'], ['0과 1로 판단하기', '판단'], ['퍼셉트론, 직선으로 판단하다 (오늘)', '층']
];
const CARDS = [
  { text: '두 점형이 몇 군데 다른지 센다', ws: 0, ex: '101100 XOR 100110 = 001010 → 1이 2개, 두 군데가 다르다. 좋은 부호는 서로 멀리 떨어져 있어야 한다.' },
  { text: '같은 열쇠로 잠그고, 같은 열쇠로 연다', ws: 0, ex: '101101 XOR 110011 = 011110 → 다시 011110 XOR 110011 = 101101. 열쇠를 두 번 XOR하면 원래대로 돌아온다(바루비에의 야간 암호).' },
  { text: '1의 개수가 짝수인지 확인한다', ws: 1, ex: '1 XOR 0 XOR 1 = 0 (1이 두 개, 짝수). 비트를 차례로 모두 XOR하면 1의 개수가 홀수일 때 1이 된다. 검사 점이 하는 일이다.' },
  { text: '계단 전등을 켜고 끄고, 한 자리 덧셈의 합을 낸다', ws: 2, ex: '어느 스위치를 눌러도 전등이 바뀐다. 1 + 1 = 10(2)에서 합 자리 0 = 1 XOR 1(반가산기).' },
  { text: '직선 하나로는 가를 수 없다', ws: 3, ex: '두 판단을 이어서(층을 쌓아서) 판단하면 된다.' }
];
const pathHtml = (p, clickable) => `<div class="path">${WS.map(([t, k], i) => `<${clickable ? 'button type="button"' : 'div'} class="path-step${clickable && p.sel !== null ? ' pickable' : ''}" ${clickable ? `data-ws="${i}"` : ''}><span class="path-key">${k}</span><span>${t}</span><span class="path-cards">${CARDS.map((c, j) => (p.links[j] === i ? `<span class="tag">${j + 1}</span>` : '')).join('')}</span></${clickable ? 'button' : 'div'}>${i < 3 ? '<span class="path-arrow" aria-hidden="true">→</span>' : ''}`).join('')}</div>`;
RENDER.P21 = () => {
  const p = S('P21');
  const done = CARDS.every((c, i) => p.links[i] === c.ws);
  return `${head('처음부터 다시 보기', '이번 학기에 만난 학습지를 한 줄로 놓았습니다. 그 길 내내 XOR이 나왔습니다. 아래 카드를 누른 뒤, 그 일을 했던 학습지를 누르세요.')}
  <div class="card stack">${pathHtml(p, true)}
    <div class="card-list two" style="gap:6px">${CARDS.map((c, i) => {
      const linked = p.links[i] === c.ws;
      return `<div class="xor-card${p.sel === i ? ' selected' : ''}${linked ? ' linked' : ''}${p.wrongFlash === String(i) ? ' shake' : ''}"><button type="button" data-card="${i}" ${linked ? 'disabled' : ''}><span class="card-no">${i + 1}</span>${c.text}${linked ? ` → ${WS[c.ws][0]}` : ''}</button>${linked ? `<p class="small muted">${c.ex}</p>` : ''}</div>`;
    }).join('')}</div>
    ${done ? '<p class="small" style="margin:0;color:var(--green);font-weight:800">✓ 다섯 장을 모두 이었습니다. 다음 화면에서 마지막 한 문장을 씁니다.</p>' : ''}
  </div>`;
};
BIND.P21 = () => {
  const p = S('P21');
  $$('[data-card]').forEach((b) => b.addEventListener('click', () => { p.sel = Number(b.dataset.card); p.wrongFlash = ''; render(); }));
  $$('[data-ws]').forEach((b) => b.addEventListener('click', () => {
    if (p.sel === null) { say('먼저 아래 카드를 하나 고르세요.', 'idle'); renderMascot(); return; }
    const i = p.sel, ws = Number(b.dataset.ws), ok = CARDS[i].ws === ws;
    logEvent('attempt', 'P21', `카드 ${i + 1} → ${WS[ws][0]}`, ok ? 'ok' : 'fail');
    if (ok) { p.links[i] = ws; p.sel = null; p.wrongFlash = ''; success('맞았습니다.'); } else { p.wrongFlash = String(i); say(HINTS.P21[0], 'tilt'); }
    persist(); render();
  }));
};

/* ---------- P21s 마지막 한 문장 */
RENDER.P21s = () => {
  const p = S('P21');
  return `${head('마지막 한 문장', '첫 시간에는 한글을 점자, 곧 0과 1로 나타냈습니다. 오늘은 판단을 0과 1과 직선으로 나타냈습니다.')}
  <div class="card stack">${pathHtml(p, false)}
    ${writeBox('P21_sentence', '0과 1로 할 수 있게 된 일 가운데 가장 뜻밖이었던 것은? 한 문장으로 쓰시오.', { rows: 3 })}
    <p class="closing">점자에서 시작한 0과 1이 덧셈과 오류 검사를 거쳐, 판단과 학습의 첫걸음까지 왔습니다.</p></div>`;
};

/* ================================================================ 더 해보기 */
RENDER.P23 = () => {
  const p = S('P23'), target = LAB[p.target];
  const L = PG.weightLine(p.w1, p.w2, p.t);
  const outs = PG.POINTS.map((pt) => PG.weightOut(p.w1, p.w2, p.t, pt));
  const m = outs.filter((v, i) => v === target[i]).length;
  const seg = L ? PG.segmentIn(L) : null;
  const n = (x) => fmtK(x / 10);
  const slider = (k, name) => `<div class="slider-wrap inline"><label for="p23-${k}">${name} = <strong>${n(p[k])}</strong></label><input id="p23-${k}" data-p23="${k}" type="range" min="-20" max="20" step="1" value="${p[k]}"></div>`;
  return `${head('입력마다 다른 수를 곱하면?', '출력이 w<sub>1</sub>A + w<sub>2</sub>B &gt; θ이면 1, 아니면 0인 퍼셉트론을 생각합시다. 입력 A, B에 각각 수 w<sub>1</sub>, w<sub>2</sub>를 곱해 더하고, 기준 θ와 비교합니다. 이제 기준선의 <strong>기울기</strong>도 바뀝니다.', '5-5 [심화]')}
  <div class="screen-layout two-col fig-left">
    <div class="card"><div class="plane-box mid">${planeSvg({ labels: target, line: seg ? { p: seg[0], q: seg[1] } : null, title: '가중치 기준선' })}</div>${L ? '' : '<p class="muted small">w₁과 w₂가 모두 0이면 직선이 없습니다.</p>'}</div>
    <div class="card stack">
      <div class="inline-actions"><span class="field-label">목표</span>${choiceRow('p23t', [['AND', 'AND'], ['OR', 'OR'], ['XOR', 'XOR']], p.target)}</div>
      ${slider('w1', 'w₁')}${slider('w2', 'w₂')}${slider('t', 'θ')}
      <div class="result ${m === 4 ? 'ok' : ''}" role="status">${p.target}과 맞는 점 <strong>${m}</strong>개 / 4개</div>
      <p class="muted small" style="margin:0">AND와 OR을 다른 기울기로도 만들어 본 뒤, XOR에 도전해 보세요. 다음 화면에서 왜 그런지 부등식으로 따져 봅니다.</p>
    </div>
  </div>`;
};
let p23LogTimer = null;
BIND.P23 = () => {
  const p = S('P23');
  $$('input[name="p23t"]').forEach((r) => r.addEventListener('change', () => { p.target = r.value; persist(); render(); }));
  $$('[data-p23]').forEach((s) => s.addEventListener('input', (e) => {
    p[s.dataset.p23] = Number(e.target.value); persist(); render();
    clearTimeout(p23LogTimer);
    p23LogTimer = setTimeout(() => { const t = LAB[p.target]; const m = PG.POINTS.map((pt) => PG.weightOut(p.w1, p.w2, p.t, pt)).filter((v, i) => v === t[i]).length; logEvent('attempt', 'P23', `${p.target} · w1=${p.w1 / 10}, w2=${p.w2 / 10}, θ=${p.t / 10} · 맞는 점 ${m}`, m === 4 ? 'ok' : 'fail'); }, 700);
  }));
};

/* ---------- P23w 왜 안 되는지 부등식으로 */
RENDER.P23w = () => `${head('왜 안 되는지 부등식으로', 'XOR의 네 점이 퍼셉트론 w<sub>1</sub>A + w<sub>2</sub>B &gt; θ에 주는 조건을 부등식으로 쓰고, 네 조건을 한꺼번에 만족할 수 없는 까닭을 따져 봅시다.', '5-5 [심화]')}
  <div class="screen-layout two-col fig-left">
    <div class="card stack"><table class="truth compact"><thead><tr><th>점 (A, B)</th><th>XOR</th><th>출력이 이렇게 되려면</th></tr></thead><tbody>${PG.POINTS.map((pt, i) => `<tr><td>${COORD[i]}</td><td>${LAB.XOR[i]}</td><td>${LAB.XOR[i] ? '…&gt; θ' : '… ≤ θ'}</td></tr>`).join('')}</tbody></table>
      <p class="muted small" style="margin:0">출력 0은 「w<sub>1</sub>A + w<sub>2</sub>B &gt; θ가 아니다」, 곧 「≤」입니다.</p></div>
    <div class="card stack">
      ${writeBox('P23_ineq', '(1) XOR의 네 점이 주는 조건을 부등식으로 쓰시오.', { rows: 4, placeholder: '(0, 0): …\n(0, 1): …\n(1, 0): …\n(1, 1): …' })}
      ${writeBox('P23_reason', '(2) 네 부등식을 모두 만족하는 수 w₁, w₂, θ가 없는 까닭을 쓰시오.', { rows: 4 })}
      <p class="muted small" style="margin:0">입력마다 다른 수를 곱해도 직선 하나로는 XOR을 만들 수 없습니다. 그래서 층이 꼭 필요합니다.</p>
    </div>
  </div>`;

RENDER.P24 = () => {
  const p = S('P24');
  const found = new Set([...S('P7').parts, ...p.found]);
  const L = lineFromPts(p.line);
  const s = L ? PG.sides(L) : null;
  return `${head('직선 하나로 만들 수 있는 나누기는 몇 가지?', '네 점을 직선 하나로 두 무리로 나누는 방법을 모두 모아 봅시다. 이번에는 ●/○ 없이 점의 이름만 있습니다. 직선을 이리저리 그어 칸을 채우세요.', '[심화]')}
  <div class="screen-layout two-col fig-left">
    <div class="card"><div class="fig-row"><div id="pl-24" class="plane-box"></div><div class="side-col">${planeControlsHtml('pl-24', true)}
      ${s ? (s.includes(0) ? resultBox('partial', '직선이 점 위를 지나요.') : resultBox('', `이 직선의 나눔: ${partText(PG.partKey(s))}`)) : ''}</div></div></div>
    <div class="card stack"><h3 style="margin:0">모은 나누기 <strong>${found.size}</strong> / 8칸</h3>
      <div class="part-grid compact">${PG.PART_KEYS.map((k) => `<figure class="part-cell${found.has(k) ? ' found' : ''}">${partMiniSvg(k, found.has(k))}<figcaption>${found.has(k) ? partText(k) : '?'}</figcaption></figure>`).join('')}</div>
      <p class="muted small" style="margin:0">한쪽에 0개 1가지 · 1개 4가지 · 둘씩 3가지, 모두 8칸(XOR 화면에서 만든 것도 들어 있음)</p>
      ${writeBox('P24_reason', '채울 수 없는 칸은? 그것은 오늘 무엇과 같은 모양인가?', { rows: 2 })}</div>
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
          const isNew = !p.found.includes(k) && !S('P7').parts.includes(k);
          if (!p.found.includes(k)) p.found.push(k);
          logEvent('attempt', 'P24', `나눔 ${partText(k)}${isNew ? ' (새 칸)' : ''}`, isNew ? 'ok' : 'partial');
          if (isNew) success('새 칸을 채웠습니다.');
        }
      }
      persist(); render();
    }
  });
};

const LEARN_POINT_TEXT = (r) => `${COORD[r.point]}: 출력 ${r.output}, 목표 ${r.want} → ${r.moved ? '틀려서 직선을 옮김' : '맞음'}`;
RENDER.P25 = () => {
  const p = S('P25'), target = LAB[p.target];
  const s = p.learn || PG.learnInit();
  const L = PG.learnLine(s);
  const seg = L ? PG.segmentIn(L) : null;
  const status = s.done ? `한 바퀴를 틀림 없이 돌았습니다. ${s.epoch}바퀴 만에 멈췄습니다.` : p.target === 'XOR' && s.epoch >= 200 ? '200바퀴를 돌아도 멈추지 않았습니다. 직선이 계속 흔들립니다.' : `${s.epoch}바퀴째${s.lastEpochErrors !== null ? ` · 지난 바퀴에서 틀린 점 ${s.lastEpochErrors}개` : ''}`;
  return `${head('기계가 직선을 찾는다', '규칙은 하나입니다. 네 점을 차례로 보면서, <strong>틀린 점이 있으면 직선을 그 점 쪽으로 조금 옮긴다.</strong> 한 바퀴를 틀림 없이 돌면 멈춥니다.', '[심화]')}
  <div class="screen-layout two-col fig-left">
    <div class="card"><div class="plane-box mid">${planeSvg({ labels: target, line: seg ? { p: seg[0], q: seg[1] } : null, selected: p.last ? [p.last.point] : [], wrong: p.last && p.last.moved ? [p.last.point] : [], title: '기계가 찾는 직선' })}</div></div>
    <div class="card stack">
      <div class="inline-actions"><span class="field-label">목표</span>${choiceRow('p25t', [['AND', 'AND'], ['OR', 'OR'], ['XOR', 'XOR']], p.target)}</div>
      <div class="button-row"><button id="p25-one" class="secondary-button" type="button" ${s.done ? 'disabled' : ''}>한 번</button><button id="p25-run" class="primary-button" type="button" ${s.done ? 'disabled' : ''}>${activeTimer ? '멈춤' : '자동 실행'}</button><button id="p25-reset" class="secondary-button" type="button">처음부터</button></div>
      <div class="result ${s.done ? 'ok' : ''}" role="status">${status}</div>
      ${p.last ? `<p class="small" style="margin:0">방금: ${LEARN_POINT_TEXT(p.last)}</p>` : ''}
      <p class="muted small" style="margin:0">AND와 OR을 먼저 해 본 뒤 XOR을 해 보세요.</p>
      ${writeBox('P25_why', '[선택] XOR에서는 왜 멈추지 않을까?', { rows: 2 })}
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
};
