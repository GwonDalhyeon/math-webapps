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
.board-bg{fill:#fbfaf5;stroke:#ccc}.port{fill:#fff;stroke:#202938;stroke-width:2}.t.board-name{fill:#666}.gate-node.hot{fill:#dfe9ff}.mini-bg{fill:#fff;stroke:#ccc}.mini-dot.ga{fill:#202938}.mini-dot.gb{fill:#fff;stroke:#202938;stroke-width:2}.mini-dot.unknown{fill:#eee;stroke:#ccc}.handle,.pending{display:none}`;

function requiredUnfilled() { return WRITE_FIELDS.filter(([k, , req]) => req && !String(state.writes[k] || '').trim()).map(([k, l]) => l); }
function activityStatus() {
  const P = state.screens;
  return [
    ['P1', '네 가지 판단', ['AND', 'OR', 'NOT', 'XOR'].every((op) => sameArr(P.P1.tables[op], truthOf(op)))],
    ['P2a', '내 장치 · 상황과 조건', P.P2.assignOk],
    ['P2b', '내 장치 · 회로', P.P2.circuitOk],
    ['P2e', '내 장치 · 식', P.P2.exprMatch],
    ['P3', 'XOR 회로 확인표', sameArr(P.P3.table, LAB.XOR)],
    ['P6', 'AND·OR 직선', judgeP6('and').cls === 'ok' && judgeP6('or').cls === 'ok'],
    ['P7', 'XOR 예상 확정', predictLocked('P7')],
    ['P9', '두 선분이 만나는 점', P.P9.ok],
    ['P11', '접은 채로 직선 하나', P.P11.ok && P.P11.countOk === true],
    ['P12', '접기와 회로', predictLocked('P12')],
    ['P15', 'AND 판단 장치', Object.keys(P.P15.rows).length === 4],
    ['P16', 'OR이 되는 c 찾기', P.P16.found.length >= 2],
    ['P16w', '기준선은 어떻게 달라지나', P.P16.dir === 'up' && P.P16.slope === 'same'],
    ['P17', 'XOR도 될까', P.P17.blankOk === true],
    ['P18', '두 직선 사이의 점', P.P18.pickOk === true && P.P18.blank1 === 'OR' && P.P18.blank2 === 'AND'],
    ['P18c', '두 판단을 이어 판단하기', P.P18.tableOk === true && ['T1', 'T2', 'G3', 'G4'].every((b) => P.P18.pairs[b] === PAIR_ANSWER[b])],
    ['P21', '처음부터 다시 보기', CARDS.every((c, i) => P.P21.links[i] === c.ws)],
    ['P24', '나누기 모으기', P.P24.pick === 6 && P.P24.shape === 'XOR'],
    ['P23w', '부등식으로 따지기', P.P23w.explain >= 4],
    ['P25', '기계가 직선을 찾는다', P.P25.why === 'none']
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
  const pick = (opts, v) => (opts.find(([k]) => k === v) || [, '미응답'])[1];
  const t = P.P1.tables;
  sec('P1', '1 네 가지 판단', `<p>${['AND', 'OR', 'NOT', 'XOR'].map((op) => `${op}: ${t[op].map((v) => (v === null ? '?' : v)).join(' ')} ${sameArr(t[op], truthOf(op)) ? '✓' : ''}`).join(' · ')}</p>`);
  const sc = PG.scenarioById(P.P2.scenario);
  const r = sc ? PG.boardCircuit(P.P2, IN3) : { error: 'empty' };
  const pr = PG.parseExpr(P.P2.tokens);
  sec('P2a', '1 내 장치 설계', sc ? `<p>상황 카드: <strong>${esc(sc.name)}</strong> — ${esc(sc.sentence)}</p><p>출력 1 = ${esc(sc.out1)}, 0 = ${esc(sc.out0)} · 고른 조건: ${P.P2.assign.map((id, k) => `${IN3[k]} = ${esc(condOf(sc, id).yes)}`).join(' / ') || '없음'} ${P.P2.assignOk ? '✓' : ''}</p>
    ${P.P2.blocks.length ? `<div class="fig wide">${boardSvg(P.P2, { inputs: IN3, names: p2Names(sc), outName: `1 = ${sc.out1}`, readOnly: true })}</div><p>회로 확인: ${r.error ? `미완성(${esc(BOARD_ERR[r.error] || r.error)})` : P.P2.circuitOk ? '조건 문장과 같은 진리표 ✓' : P.P2.checked ? `조건 문장과 다른 행 ${P.P2.diffRows.length}개` : '확인하지 않음'}</p>` : '<p>회로: 만들지 않음</p>'}
    <p>식: <strong>${pr.ast ? esc(PG.astText(pr.ast)) : P.P2.tokens.length ? esc(P.P2.tokens.join(' ')) + ' (형식 오류)' : '미작성'}</strong>${P.P2.exprChecked ? ` · 회로와 ${P.P2.exprMatch ? '같은 진리표 ✓' : `다른 행 ${P.P2.exprDiff.length}개`}` : ''}</p>` : '<p>상황 카드를 고르지 않음</p>');
  sec('P3', '1 XOR 회로 확인표', `<p>${P.P3.table.map((v) => (v === null ? '?' : v)).join(' ')} ${sameArr(P.P3.table, LAB.XOR) ? '✓' : ''}</p>`);
  sec('P4', '2 합격 기준 추정', `<p>추정한 기준: 합이 ${esc(P.P4.guess || '?')}점보다 크면 합격 ${P.P4.tried && isIntText(P.P4.guess) && judgeP4(P.P4.guess).ok ? '✓' : P.P4.tried ? '(다시 볼 것)' : '(확인 안 함)'}</p>`);
  const al = P.P6.alone;
  sec('P6', '3 AND와 OR', `<div class="figs">${['and', 'or'].map((k) => `<div><p>${k.toUpperCase()} — ${esc(judgeP6(k).text || '직선 없음')}</p>${planeSvg({ labels: P.P6[k].marks, line: P.P6[k].line, title: k })}</div>`).join('')}</div><p>떼어 낸 점: AND ${al.and === null ? '미응답' : COORD[al.and]} · OR ${al.or === null ? '미응답' : COORD[al.or]} ${al.and === 3 && al.or === 0 ? '✓' : ''}</p>`);
  sec('P7', '3 XOR — 처음 예상과 그어 본 직선', `<p>처음 예상: <strong>${PRED_TEXT[predictValue('P7')] || '고르지 않음'}</strong> ${predictLocked('P7') ? '(확정)' : '(미확정)'}</p><p>그어 본 직선 ${P.P7.history.length}개 · 나눈 방법 ${P.P7.parts.length}가지: ${P.P7.parts.map(partText).join(' / ') || '없음'}</p><div class="fig">${planeSvg({ labels: LAB.XOR, ghosts: P.P7.history, title: 'XOR 시도' })}</div>`);
  sec('P8', '3 나눌 수 있었나', `<p>판단: ${{ yes: '예', no: '아니오', unsure: '아직 모르겠다' }[P.P8.choice] || '미응답'}</p>${W('P8_reason')}<p class="small">규칙 바꾸기:</p>${W('P8_rule')}`);
  sec('P9', '3 두 선분이 만나는 점', `<p>쓴 좌표 (${esc(P.P9.x)}, ${esc(P.P9.y)}) ${P.P9.ok ? '✓' : ''} · 설명 ${P.P9.explain}/3단계 봄</p>`);
  sec('P11', '4 접은 채로 직선 하나', P.P11.line ? `<div class="figs"><div><p>접은 그림의 직선 ${P.P11.ok ? '✓' : ''}</p>${foldSvg(Math.PI, { line: P.P11.line, title: '접은 그림' })}</div>${P.P11.ok ? `<div><p>펼쳤을 때 · 잘린 자리 ${esc(P.P11.count || '?')}개 ${P.P11.countOk ? '✓' : ''}</p>${unfoldSvg(P.P11.line)}</div>` : ''}</div>` : '<p>직선을 긋지 않음</p>');
  sec('P12', '4 접기와 회로는 어떻게 닮았나 (쉬는 시간 전)', `<p>가르는 단계: ${P.P12.q1 === 'line' ? '직선 긋기 ✓' : P.P12.q1 === 'fold' ? '접기' : '미응답'} · 마지막 게이트: ${P.P12.q2 === true ? '마지막 AND ✓' : P.P12.q2 === false ? '다른 게이트' : '미응답'}</p><p class="answer">${esc(predictValue('P12') || p12Sentence())}</p><p class="small">${predictLocked('P12') ? '확정함' : '미확정'}</p>`);
  sec('P15', '5-1 AND', `<p>${PG.POINTS.map((pt, i) => (P.P15.rows[i] ? `${COORD[i]} 예측 ${P.P15.rows[i].guess}/출력 ${PG.thresholdOut(15, pt)}` : `${COORD[i]} 안 함`)).join(' · ')}</p><p>오른쪽 위 점: ${P.P15.right.map((i) => COORD[i]).join(', ') || '미응답'} · AND와 ${P.P15.same === 'same' ? '같다' : P.P15.same === 'diff' ? '다르다' : '미응답'}</p>`);
  sec('P16', '5-2 OR', `<p>예측한 c: ${esc(predictValue('P16') || '없음')} · OR이 되는 c로 기록: ${P.P16.found.map((x) => fmtK(x / 10)).join(', ') || '없음'}</p><p>c의 값이 커지면 기준선은: ${pick([['up', '오른쪽 위로 평행이동 ✓'], ['down', '왼쪽 아래로 평행이동'], ['stay', '움직이지 않음']], P.P16.dir)} · 기울기는: ${pick([['change', '바뀐다'], ['same', '그대로다 ✓']], P.P16.slope)}</p><p class="answer">c의 값을 바꾸면 기준선의 기울기는 ${esc(state.writes.P16_blank1 || '(미작성)')}, 위치는 ${esc(state.writes.P16_blank2 || '(미작성)')}.</p>`);
  sec('P17', '5-3 XOR은 왜 안 되나', `<p>빈칸: c &lt; ${esc(P.P17.b1 || '?')}, 2는 c보다 ${esc(P.P17.b2 || '?')}, (1, 1)의 출력 ${esc(P.P17.b3 || '?')}, XOR과 ${esc(P.P17.b4 || '?')} ${P.P17.blankOk ? '✓' : ''} · 까닭 단계 ${P.P17.explain}/3 봄</p>${W('P17_reason')}`);
  sec('P18', '5-4 두 직선 사이의 점', `<p>사이의 점: ${P.P18.picked.map((i) => COORD[i]).join(', ') || '미응답'} ${P.P18.pickOk ? '✓' : ''} · XOR과 ${P.P18.same === 'same' ? '같다' : P.P18.same === 'diff' ? '다르다' : '미응답'} · A+B&gt;0.5는 ${esc(P.P18.blank1 || '?')}, A+B&gt;1.5는 ${esc(P.P18.blank2 || '?')}</p>`);
  sec('P18c', '5-4 두 판단을 이어 판단하기', `<p>확인표 판단 장치 회로 ${P.P18.band.map((v) => (v === null ? '?' : v)).join(' ')} · XOR 회로 ${P.P18.xor.map((v) => (v === null ? '?' : v)).join(' ')} ${P.P18.tableOk ? '✓' : '미완료'} · 게이트 짝 ${Object.keys(PAIR_ANSWER).filter((b) => P.P18.pairs[b] === PAIR_ANSWER[b]).length}/4</p>`);
  sec('P21', '6 처음부터 다시 보기', `<p>카드 잇기 ${CARDS.filter((c, i) => P.P21.links[i] === c.ws).length}/5</p>${W('P21_sentence')}`);
  const found = new Set([0, ...P.P7.parts, ...P.P24.found]);
  sec('P24', '7 나누기 모으기', `<p>채운 칸 ${found.size}/8 · 채울 수 없는 칸: ${P.P24.pick === null ? '미응답' : partText(P.P24.pick)} ${P.P24.pick === 6 ? '✓' : ''} · 같은 모양: ${esc(P.P24.shape || '미응답')} ${P.P24.shape === 'XOR' ? '✓' : ''}</p>`);
  sec('P23', '7 입력마다 다른 수를 곱하면?', `<p>마지막 설정: 목표 ${targetName(P.P23.target)}, w1=${P.P23.w1 / 10}, w2=${P.P23.w2 / 10}, θ=${P.P23.t / 10}</p>`);
  sec('P23w', '7 왜 안 되는지 부등식으로', `<p>부등호: ${P.P23w.signs.map((v, i) => `${COORD[i]} ${v === 'gt' ? '&gt;' : v === 'le' ? '≤' : '?'}`).join(' · ')} · 두 부등식의 합 ${esc(P.P23w.sum || '?')}θ · 까닭 단계 ${P.P23w.explain}/4 봄</p>${W('P23_reason')}`);
  sec('P25', '7 기계가 직선을 찾는다', `<p>${P.P25.learn ? `${P.P25.target} · ${P.P25.learn.epoch}바퀴 · ${P.P25.learn.done ? '멈춤' : '멈추지 않음'}` : '실행하지 않음'} · 멈추지 않는 까닭: ${pick(WHY_OPTS, P.P25.why)}</p>${W('P25_link')}`);
  return out.join('');
}
function buildRecordHtml(forStudent = false) {
  const st = state.student, un = requiredUnfilled(), acts = activityStatus();
  const stats = SCREENS.map((s) => { const a = state.attemptStats[s.id]; return a ? `<tr><td>${esc(s.label)}</td><td>${a.count}</td><td>${a.firstSuccess ?? '없음'}</td><td>${state.hints[s.id] || 0}</td></tr>` : ''; }).join('');
  const make = (logs) => `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${APP_TITLE} 탐구 기록</title><style>@page{size:A4;margin:15mm}body{font-family:"Malgun Gothic","Noto Sans KR",sans-serif;color:#202938;line-height:1.6;max-width:820px;margin:0 auto;padding:16px}h1{font-size:22px}h2{font-size:17px;border-bottom:2px solid #202938;padding-bottom:4px;margin-top:28px}h3{font-size:15px;margin:0 0 6px}section{break-inside:avoid;border-top:1px solid #ddd;padding:10px 0}table{width:100%;border-collapse:collapse;margin:8px 0}th,td{border:1px solid #ccc;padding:5px;text-align:left;font-size:13px;overflow-wrap:anywhere}.answer{white-space:pre-wrap;background:#f7f7f4;border-left:3px solid #2563eb;padding:6px 10px;margin:4px 0}.missing{color:#999;border-left-color:#ccc}.small{font-size:12px;color:#666}.figs{display:flex;flex-wrap:wrap;gap:12px}.figs>div{flex:1 1 240px}svg{max-width:320px;width:100%;height:auto}.circuit-svg{max-width:560px}.fig.wide svg{max-width:560px}.cover td:first-child{width:120px;background:#f3f3f3;font-weight:700}${SVG_CSS}</style></head><body>
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
