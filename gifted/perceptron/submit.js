/* 「퍼셉트론, 직선으로 판단하다」 — 제출(P22)과 제출 HTML. 제작 명세서 §8 */
'use strict';

const SVG_CSS = `.t{font-family:"Malgun Gothic","Noto Sans KR",sans-serif;fill:#202938}.t.small,.t.coord,.t.tiny{fill:#555}.var{font-style:italic;font-family:"Times New Roman",serif}
.paper{fill:#fff;stroke:#bbb}.paper.keep{fill:#fff;stroke:#555}.paper.flap{fill:#f4f2ec}.paper.back{fill:#e6e2d8}.cut-bg{fill:#f2f2f2}.cutaway{fill:#e3e3e3;stroke:#bbb;stroke-dasharray:4 4}
.axes line,.axis-line{stroke:#333;stroke-width:1.6}.axes polygon,.axis-head{fill:#333}.grid{stroke:#bbb;stroke-dasharray:3 3}
.shade-a{fill:#dfe9ff;opacity:.55}.shade-b{fill:#fff2c9;opacity:.55}.ghost-line{stroke:#9aa3b2;stroke-width:2;opacity:.55}.user-line{stroke:#1745ad;stroke-width:4}.fixed-line{stroke:#202938;stroke-width:3}
.dot{stroke:#202938;stroke-width:2.6}.dot.on{fill:#202938}.dot.off{fill:#fff}.dot.plain{fill:#cfd5df}.dot.ghost{fill:none;stroke:#999;stroke-dasharray:3 3}.dot.on-line{stroke:#d29b00;stroke-width:5}.dot.wrong{stroke:#bd3d3d;stroke-width:5}.dot.selected{stroke:#2563eb;stroke-width:5}
.seg{stroke-width:4}.seg-black{stroke:#202938}.seg-white{stroke:#777;stroke-dasharray:8 5}.star{fill:#bd3d3d}.crease{stroke:#666;stroke-width:2;stroke-dasharray:6 5}.crease.faint{opacity:.45}.cut-line{stroke:#bd3d3d;stroke-width:4;stroke-dasharray:9 5}
.sum-one{fill:#dfe9ff}.divider{stroke:#1745ad;stroke-width:4}.divider-label{fill:#1745ad}
.wire{fill:none;stroke:#8c96a5;stroke-width:2.2}.wire.hot{stroke:#1745ad;stroke-width:4}.wire-val{fill:#777}.wire-val.hot{fill:#1745ad;font-weight:700}.in-node{fill:#fff;stroke:#202938;stroke-width:2}.in-node.hot{fill:#dfe9ff}.gate-node{fill:#fff;stroke:#202938;stroke-width:2}.out-node{fill:#f3f3f3;stroke:#202938;stroke-width:2}.out-node.hot{fill:#dfe9ff}.gate-label{font-weight:700}
.mini-bg{fill:#fff;stroke:#ccc}.mini-dot.ga{fill:#202938}.mini-dot.gb{fill:#fff;stroke:#202938;stroke-width:2}.mini-dot.unknown{fill:#eee;stroke:#ccc}.handle,.pending{display:none}`;

function requiredUnfilled() { return WRITE_FIELDS.filter(([k, , req]) => req && !String(state.writes[k] || '').trim()).map(([k, l]) => l); }
function activityStatus() {
  const P = state.screens;
  return [
    ['P1', '네 가지 판단', ['AND', 'OR', 'NOT', 'XOR'].every((op) => sameArr(P.P1.tables[op], truthOf(op)))],
    ['P2b', '내 장치 회로', P.P2.circuitOk],
    ['P3', 'XOR 회로 확인표', sameArr(P.P3.table, LAB.XOR)],
    ['P6', 'AND·OR 직선', judgeP6('and').cls === 'ok' && judgeP6('or').cls === 'ok'],
    ['P9', '두 선분이 만나는 점', P.P9.ok],
    ['P11', '접은 채로 직선 하나', P.P11.ok && P.P11.countOk === true],
    ['P15', 'AND 판단 장치', Object.keys(P.P15.rows).length === 4],
    ['P16', 'OR이 되는 c 찾기', P.P16.found.length >= 2],
    ['P18', '두 직선 사이의 점', P.P18.pickOk === true && P.P18.blank1 === 'OR' && P.P18.blank2 === 'AND'],
    ['P18c', '두 판단을 이어 판단하기', P.P18.tableOk === true],
    ['P21', '처음부터 다시 보기', CARDS.every((c, i) => P.P21.links[i] === c.ws)]
  ].map(([id, label, ok]) => ({ id, label, ok, visited: Boolean(state.views[id]?.visited) }));
}

RENDER.P22 = () => {
  const un = requiredUnfilled(), acts = activityStatus();
  const unresolved = acts.filter((a) => !a.ok);
  const sub = state.submitted;
  const sent = sub.result === 'ok' || sub.result === 'sent';
  const failed = sub.result === 'fail';
  return `${head('오늘의 기록을 제출하세요', '쓴 답과 조작 결과가 함께 선생님께 갑니다. 다 하지 못한 활동도 그대로 기록됩니다.')}
  <div class="card stack">
    <div class="two-column"><div class="evidence">쓰지 않은 칸 <strong>${un.length}개</strong></div><div class="evidence">끝나지 않은 활동 <strong>${unresolved.length}개</strong></div></div>
    <details class="attempt-details"><summary>활동별 상태 보기</summary><div class="evidence">${acts.map((a) => `<div>${esc(a.label)} · ${a.ok ? '완료' : a.visited ? '끝나지 않음' : '방문하지 않음'}</div>`).join('')}${un.length ? `<div style="margin-top:8px"><strong>쓰지 않은 칸</strong>: ${un.map(esc).join(' · ')}</div>` : ''}</div></details>
    <div id="submit-result" class="result ${failed ? 'fail' : sent ? 'ok' : ''}" role="status">${esc(sub.status || '「제출」을 누르면 탐구 기록이 선생님 메일로 갑니다.')}${sub.code ? ` · 확인 코드 <strong>${esc(sub.code)}</strong>` : ''}</div>
    <div class="button-row"><button id="submit-button" class="primary-button" type="button" ${submitting || sent ? 'disabled' : ''}>${submitting ? '전송 중' : sent ? '이미 보냈습니다' : failed ? '다시 제출' : '제출'}</button><button id="my-copy" class="secondary-button" type="button">내 기록 내려받기</button>${sent ? '<button id="resubmit" class="secondary-button" type="button">다시 제출하기</button>' : ''}${failed ? '<button id="save-file" class="secondary-button" type="button">전체 기록 파일로 저장</button>' : ''}</div>
    <p class="muted small" style="margin:0">「제출」은 선생님께 보냅니다. 「내 기록 내려받기」는 내가 쓴 것과 조작 결과만 담긴 파일을 내 기기에 저장합니다. 확인 코드는 화상 채팅에 남겨 주세요.</p>
    ${state.includeOptional ? '<div class="notice">이 뒤에 「더 해보기」가 있습니다. 더 해본 뒤에는 이 화면으로 돌아와 「다시 제출하기」를 누르세요.</div>' : ''}
  </div>`;
};
BIND.P22 = () => {
  $('#submit-button').addEventListener('click', submitWork);
  $('#my-copy').addEventListener('click', () => { downloadRecord(true); logEvent('nav', 'P22', '학생용 기록 내려받기'); });
  $('#resubmit')?.addEventListener('click', () => { if (window.confirm('이미 보낸 기록이 있습니다. 지금 기록을 다시 보낼까요?')) { state.submitted = { at: 0, code: '', status: '', result: '' }; submitWork(); } });
  $('#save-file')?.addEventListener('click', () => downloadRecord(false));
};

/* ------------------------------------------------------------ 기록 HTML */
const W = (k) => (String(state.writes[k] || '').trim() ? `<p class="answer">${esc(state.writes[k])}</p>` : '<p class="answer missing">미작성</p>');
function recordSections(forStudent) {
  const P = state.screens, out = [];
  const sec = (id, title, body) => { if (forStudent && !state.views[id]?.visited) return; out.push(`<section><h3>${title}</h3>${body}</section>`); };
  const t = P.P1.tables;
  sec('P1', '1 네 가지 판단', `<p>${['AND', 'OR', 'NOT', 'XOR'].map((op) => `${op}: ${t[op].map((v) => (v === null ? '?' : v)).join(' ')} ${sameArr(t[op], truthOf(op)) ? '✓' : ''}`).join(' · ')}</p>`);
  const ast = p2Ast();
  sec('P2a', '1 내 장치 설계', `<p>장치: ${esc(state.writes.P2_device || '미작성')} · 입력 ${P.P2.inputs}개 — A: ${esc(state.writes.P2_inA || '')} / B: ${esc(state.writes.P2_inB || '')}${P.P2.inputs === 3 ? ` / C: ${esc(state.writes.P2_inC || '')}` : ''}</p>${W('P2_sentence')}<p>식: <strong>${ast ? esc(PG.astText(ast)) : '미완성'}</strong>${ast ? ` · 진리표 ${PG.exprTable(ast, P.P2.inputs).join('')} · 문장과 ${P.P2.match === 'yes' ? '맞다' : P.P2.match === 'fix' ? '고칠래요' : '미응답'}` : ''}</p>
    ${P.P2.gates.length ? `<div class="fig">${circuitSvg(p2Circuit(), null, { title: '내 회로' })}</div><p>회로 확인: ${P.P2.circuitOk ? '식과 같은 진리표 ✓' : P.P2.checked ? `다른 행 ${P.P2.diffRows.length}개` : '확인하지 않음'}</p>` : '<p>회로: 만들지 않음</p>'}`);
  sec('P3', '1 XOR 회로 확인표', `<p>${P.P3.table.map((v) => (v === null ? '?' : v)).join(' ')} ${sameArr(P.P3.table, LAB.XOR) ? '✓' : ''}</p>`);
  const pv = predictValue('P5') || {};
  sec('P5', '2 처음 예상', `<p>${['AND', 'OR', 'XOR'].map((op) => `${op}: ${PRED_TEXT[pv[op]] || '고르지 않음'}`).join(' · ')} ${predictLocked('P5') ? '(확정)' : '(미확정)'}</p>`);
  sec('P6', '3 AND와 OR', `<div class="figs">${['and', 'or'].map((k) => `<div><p>${k.toUpperCase()} — ${esc(judgeP6(k).text || '직선 없음')}</p>${planeSvg({ labels: P.P6[k].marks, line: P.P6[k].line, title: k })}</div>`).join('')}</div>`);
  sec('P7', '3 XOR — 그어 본 직선', `<p>그어 본 직선 ${P.P7.history.length}개 · 나눈 방법 ${P.P7.parts.length}가지: ${P.P7.parts.map(partText).join(' / ') || '없음'}</p><div class="fig">${planeSvg({ labels: LAB.XOR, ghosts: P.P7.history, title: 'XOR 시도' })}</div>`);
  sec('P8', '3 나눌 수 있었나', `<p>판단: ${{ yes: '예', no: '아니오', unsure: '아직 모르겠다' }[P.P8.choice] || '미응답'}</p>${W('P8_reason')}<p class="small">규칙 바꾸기:</p>${W('P8_rule')}`);
  sec('P9', '3 두 선분이 만나는 점', `<p>쓴 좌표 (${esc(P.P9.x)}, ${esc(P.P9.y)}) ${P.P9.ok ? '✓' : ''} · 설명 ${P.P9.explain}/3단계 봄</p>`);
  sec('P11', '4 접은 채로 직선 하나', P.P11.line ? `<div class="figs"><div><p>접은 그림의 직선 ${P.P11.ok ? '✓' : ''}</p>${foldSvg(Math.PI, { line: P.P11.line, title: '접은 그림' })}</div>${P.P11.ok ? `<div><p>펼쳤을 때 · 잘린 자리 ${esc(P.P11.count || '?')}개 ${P.P11.countOk ? '✓' : ''}</p>${unfoldSvg(P.P11.line)}</div>` : ''}</div>` : '<p>직선을 긋지 않음</p>');
  sec('P12', '4 접기와 회로는 어떻게 닮았나 (쉬는 시간 전)', `${W('P12_answer')}<p class="small">${predictLocked('P12') ? '확정함' : '미확정'}</p>`);
  sec('P15', '5-1 AND', `<p>${PG.POINTS.map((pt, i) => (P.P15.rows[i] ? `${COORD[i]} 예측 ${P.P15.rows[i].guess}/출력 ${PG.thresholdOut(15, pt)}` : `${COORD[i]} 안 함`)).join(' · ')}</p><p>오른쪽 위 점: ${P.P15.right.map((i) => COORD[i]).join(', ') || '미응답'} · AND와 ${P.P15.same === 'same' ? '같다' : P.P15.same === 'diff' ? '다르다' : '미응답'}</p>`);
  sec('P16', '5-2 OR', `<p>예측한 c: ${esc(predictValue('P16') || '없음')} · OR이 되는 c로 기록: ${P.P16.found.map((x) => fmtK(x / 10)).join(', ') || '없음'} · 범위 고르기: ${(RANGE_OPTS.find(([v]) => v === P.P16.rangeChoice) || [, '미응답'])[1]}</p>${W('P16_range')}${W('P16_sentence')}`);
  sec('P17', '5-3 XOR은 왜 안 되나', W('P17_reason'));
  sec('P18', '5-4 두 직선 사이의 점', `<p>사이의 점: ${P.P18.picked.map((i) => COORD[i]).join(', ') || '미응답'} ${P.P18.pickOk ? '✓' : ''} · XOR과 ${P.P18.same === 'same' ? '같다' : P.P18.same === 'diff' ? '다르다' : '미응답'} · A+B&gt;0.5는 ${esc(P.P18.blank1 || '?')}, A+B&gt;1.5는 ${esc(P.P18.blank2 || '?')}</p>`);
  sec('P18c', '5-4 두 판단을 이어 판단하기', `<p>확인표 판단 장치 회로 ${P.P18.band.map((v) => (v === null ? '?' : v)).join(' ')} · XOR 회로 ${P.P18.xor.map((v) => (v === null ? '?' : v)).join(' ')} ${P.P18.tableOk ? '✓' : '미완료'}</p>`);
  sec('P19', '5 층을 쌓는다', W('P19_line'));
  sec('P20', '6 처음 생각과 달라진 점', W('P20_reflect'));
  sec('P21', '6 처음부터 다시 보기', `<p>카드 잇기 ${CARDS.filter((c, i) => P.P21.links[i] === c.ws).length}/5</p>${W('P21_sentence')}`);
  if (state.includeOptional) {
    sec('P23', '[심화] 입력마다 다른 수를 곱하면?', `<p>마지막 설정: 목표 ${P.P23.target}, w1=${P.P23.w1 / 10}, w2=${P.P23.w2 / 10}, θ=${P.P23.t / 10}</p>${W('P23_ineq')}${W('P23_reason')}`);
    const found = new Set([...P.P7.parts, ...P.P24.found]);
    sec('P24', '[심화] 나누기 모으기', `<p>모은 칸 ${found.size}/8: ${[...found].map(partText).join(' / ')}</p>${W('P24_reason')}`);
    sec('P25', '[심화] 기계가 직선을 찾는다', `<p>${P.P25.learn ? `${P.P25.target} · ${P.P25.learn.epoch}바퀴 · ${P.P25.learn.done ? '멈춤' : '멈추지 않음'}` : '실행하지 않음'}</p>${W('P25_why')}`);
  }
  return out.join('');
}
function buildRecordHtml(forStudent = false) {
  const st = state.student, un = requiredUnfilled(), acts = activityStatus();
  const stats = SCREENS.map((s) => { const a = state.attemptStats[s.id]; return a ? `<tr><td>${esc(s.label)}</td><td>${a.count}</td><td>${a.firstSuccess ?? '없음'}</td><td>${state.hints[s.id] || 0}</td></tr>` : ''; }).join('');
  const make = (logs) => `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${APP_TITLE} 탐구 기록</title><style>@page{size:A4;margin:15mm}body{font-family:"Malgun Gothic","Noto Sans KR",sans-serif;color:#202938;line-height:1.6;max-width:820px;margin:0 auto;padding:16px}h1{font-size:22px}h2{font-size:17px;border-bottom:2px solid #202938;padding-bottom:4px;margin-top:28px}h3{font-size:15px;margin:0 0 6px}section{break-inside:avoid;border-top:1px solid #ddd;padding:10px 0}table{width:100%;border-collapse:collapse;margin:8px 0}th,td{border:1px solid #ccc;padding:5px;text-align:left;font-size:13px;overflow-wrap:anywhere}.answer{white-space:pre-wrap;background:#f7f7f4;border-left:3px solid #2563eb;padding:6px 10px;margin:4px 0}.missing{color:#999;border-left-color:#ccc}.small{font-size:12px;color:#666}.figs{display:flex;flex-wrap:wrap;gap:12px}.figs>div{flex:1 1 240px}svg{max-width:320px;width:100%;height:auto}.circuit-svg{max-width:560px}.cover td:first-child{width:120px;background:#f3f3f3;font-weight:700}${SVG_CSS}</style></head><body>
    <h1>${APP_TITLE}</h1>
    <table class="cover"><tr><td>학교</td><td>${esc(st.school)}</td></tr><tr><td>학번 · 이름</td><td>${esc(st.sid)} · ${esc(st.name)}</td></tr><tr><td>기록 생성</td><td>${new Date().toLocaleString('ko-KR')}${state.submitted.code ? ` · 확인 코드 ${esc(state.submitted.code)}` : ''}</td></tr>
    <tr><td>과목 · 단원</td><td>3학년 수학 · 수와 연산 · 변화와 관계</td></tr><tr><td>학습목표</td><td>두 입력의 합을 기준과 비교하는 판단이 좌표평면에서 직선 하나로 가르는 것과 같음을 알고, 직선 두 개의 판단을 이어 XOR을 만들 수 있는 까닭을 설명할 수 있다.</td></tr></table>
    ${forStudent ? '' : `<p>쓰지 않은 칸 ${un.length}개 · 끝나지 않은 활동 ${acts.filter((a) => !a.ok).length}개${un.length ? ` (쓰지 않은 칸: ${un.map(esc).join(' · ')})` : ''}</p>`}
    <h2>활동 기록</h2>${recordSections(forStudent)}
    ${forStudent ? '' : `<h2>시도 요약</h2><table><thead><tr><th>활동</th><th>시도 수</th><th>첫 성공 시도</th><th>힌트 단계</th></tr></thead><tbody>${stats}</tbody></table>
    <h2>활동 상태</h2><table><tbody>${acts.map((a) => `<tr><td>${esc(a.label)}</td><td>${a.ok ? '완료' : a.visited ? '끝나지 않음' : '방문하지 않음'}</td></tr>`).join('')}</tbody></table>
    <details><summary>전체 로그 (${logs.length}/${state.log.length}건)</summary><table><thead><tr><th>시각</th><th>활동</th><th>종류</th><th>내용</th><th>결과</th></tr></thead><tbody>${logs.map((e) => `<tr><td>${new Date(e.t).toLocaleTimeString('ko-KR')}</td><td>${esc(screenInfo(e.screen).label)}</td><td>${esc(e.kind)}</td><td>${esc(e.detail || '')}</td><td>${esc(e.result || '')}</td></tr>`).join('')}</tbody></table></details>`}
    </body></html>`;
  let logs = state.log.filter((e) => e.kind !== 'nav' || !forStudent);
  let html = make(logs);
  while (new Blob([html]).size > 500 * 1024 && logs.length > 50) { logs = logs.filter((e) => e.kind !== 'nav').slice(-Math.floor(logs.length * 0.7)); html = make(logs); }
  return html;
}
function confirmationCode() { const seed = `${state.student.school}${state.student.sid}${state.student.name}${Date.now()}`; let h = 0; for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) % 1000000; return String(h).padStart(6, '0'); }
function downloadRecord(forStudent) {
  if (!state.submitted.code) state.submitted.code = confirmationCode();
  const blob = new Blob([buildRecordHtml(forStudent)], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url;
  a.download = `${state.student.school || '학교없음'}_${state.student.sid || '학번없음'}_${state.student.name || '이름없음'}_${APP_KEY}${forStudent ? '' : '_전체기록'}.html`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  persist();
}

let submitting = false;
async function submitWork() {
  if (submitting || ['ok', 'sent'].includes(state.submitted.result)) return;
  if (!studentReady()) { navTo('P0'); return; }
  submitting = true;
  const mine = state;
  const code = confirmationCode();
  state.submitted = { at: 0, code, status: '보내는 중…', result: 'pending' };
  render();
  const body = new URLSearchParams({ app: APP_KEY, school: state.student.school, sid: state.student.sid, name: state.student.name, code, html: buildRecordHtml(false) });
  const post = async (mode) => {
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 20000);
    try {
      const r = await fetch(SCRIPT_URL, { method: 'POST', body, signal: ctl.signal, ...(mode ? { mode } : {}) });
      if (mode === 'no-cors') return 'sent';
      return r.ok && (await r.text()).trim() === 'ok' ? 'ok' : 'fail';
    } finally { clearTimeout(timer); }
  };
  let result = 'fail';
  try { try { result = await post(); } catch (e) { try { result = await post('no-cors'); } catch (e2) { result = 'fail'; } } } finally {
    submitting = false;
    if (state === mine) {
      state.submitted = { at: result === 'fail' ? 0 : Date.now(), code, result, status: result === 'ok' ? '제출되었습니다.' : result === 'sent' ? '보냈습니다. 확인 코드를 화상 채팅에 남겨 주세요.' : '전송에 실패했습니다. 다시 제출하거나 파일로 저장하세요.' };
      logEvent('submit', 'P22', state.submitted.status, result);
      persist(true); render();
    }
  }
}

window.giftedPerceptron = { getState: () => state, buildRecordHtml, reset: () => { localStorage.removeItem(STORAGE_KEY); state = initialState(); resumeView = 'P0'; render(); } };
