// ===========================================================================
// 아이스브레이킹 온라인 기록판 — 공용 화면 부품
// 데이터는 online-board.js, 그룹 버튼은 online-group.js가 맡고, 이 파일은 기록을 "보여 주는" 부품만 둔다.
//
//   renderGroupMini(container, opts)   시작 화면 등에 그룹 순위 5줄
//   createResultBoard(opts)            결과 화면 기록판: 👥 그룹 · 🌐 오늘 · 🌐 30일 · 📱 이 기기 탭 + 올리기 + 지우기
//   createLivePanels(opts)             경기 화면 패널: 왼쪽 기록판(내 줄이 실시간으로 움직임) + 오른쪽 다음 목표·통계
//
// 화면 구조가 게임마다 달라서 경기 화면 패널은 배치 방식을 고른다 (자세한 기준: docs/agent-guides/online-board.md)
//   "auto"     카메라·놀이 영역 밖 빈 공간에 놓는다(옆 → 위아래 띠 → 작은 띠 순서로 들어가는 것)
//   "embed"    게임이 준 왼쪽·오른쪽 상자 안에 넣는다(이미 옆 공간을 쓰는 게임)
//   "compact"  놀이 영역 위 작은 띠 하나(순위·다음 목표만)
//   "headless" 화면 요소를 만들지 않고 snapshot()으로 값만 준다(캔버스에 직접 그리는 게임)
//   "off"      쓰지 않는다
// 글자색·바탕은 게임의 CSS 변수(--ink, --panel, --line, --accent 등)를 따르고, --ob-* 로 따로 바꿀 수 있다.
// ===========================================================================
import * as OB from "./online-board.js";

const fmtN = (n) => Number(n || 0).toLocaleString("ko-KR");
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const el = (tag, cls = "", text = "") => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; };
const fmtCode = (c) => `${c.slice(0, 3)} ${c.slice(3)}`;

// 기본 기록 표시: rank를 점수로 본다. 게임은 formatRecord(row) → { main: "레벨 2 · 1,200점", a: "Lv2", b: "1,200" } 를 준다.
const defaultFormat = (r) => ({ main: `${fmtN(r.score ?? r.rank)}점`, a: "", b: fmtN(r.score ?? r.rank) });
// 기본 차이: rank가 클수록 좋은 점수일 때
const defaultGap = (me, t) => ({ left: `${fmtN(t.rank - me.rank + 1)}점 남음`, sub: "", pct: t.rank > 0 ? me.rank / (t.rank + 1) : 0 });

const CSS = `
.ob-scope { --obi: var(--ob-ink, var(--ink, #14324a)); --obm: var(--ob-muted, var(--muted, #47667a)); --obp: var(--ob-panel, var(--panel, #fffdf5));
  --obp2: var(--ob-panel2, var(--panel2, #eef8fb)); --obl: var(--ob-line, var(--line, #14324a)); --obs: var(--ob-soft, var(--soft, #b9d2da));
  --oba: var(--ob-accent, var(--accent, #ffd23f)); --obg: var(--ob-good, var(--good, #16a34a)); color: var(--obi); }
.ob-list { margin: 0; padding: 0; list-style: none; font-size: 16px; }
.ob-list li { display: flex; gap: 8px; padding: 4px 2px; border-bottom: 1px solid var(--obs); }
.ob-list li > b { width: 24px; flex: none; color: var(--obm); }
.ob-list li > span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ob-list li.me { background: var(--oba); border-radius: 8px; font-weight: 900; padding: 4px 6px; }
.ob-list li.empty { color: var(--obm); font-size: 15px; padding: 8px 2px; border: 0; }
.ob-note { font-size: 12px; color: var(--obm); margin: 6px 0 0; }
.ob-mini h3 { margin: 0 0 4px; font-size: 18px; }
.ob-mini .ob-note { font-size: 13px; }
.ob-board-top { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.ob-board-top h3 { margin: 0; font-size: 17px; }
.ob-tabs { display: flex; gap: 4px; margin-left: auto; }
.ob-tabs button { min-height: 40px; padding: 2px 10px; border: 2px solid var(--obl); border-radius: 10px; background: var(--obp2); color: var(--obi); font: inherit; font-size: 14px; font-weight: 900; cursor: pointer; }
.ob-tabs button[aria-pressed="true"] { background: var(--oba); }
.ob-tabs button[hidden] { display: none; }
.ob-board-sub { font-size: 13px; font-weight: 800; color: var(--obm); margin: 0 0 2px; }
.ob-linkbtn { border: 0; background: none; padding: 4px 2px; min-height: 32px; font: inherit; font-size: 12px; font-weight: 800; color: var(--obm); text-decoration: underline; cursor: pointer; }

/* 경기 화면 패널 */
.ob-side { position: absolute; z-index: 2; display: none; flex-direction: column; justify-content: center; gap: 12px; pointer-events: none; }
.ob-side.on { display: flex; }
.ob-side.embed { position: static; display: flex; height: 100%; }
.ob-box { background: var(--obp); border: 3px solid var(--obl); border-radius: 14px; box-shadow: 0 4px 0 var(--obl); padding: 10px 9px; min-width: 0; }
.ob-box h4 { margin: 0; font-size: 15px; font-weight: 950; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ob-sub { font-size: 12px; font-weight: 800; color: var(--obm); margin: 3px 0 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ob-rank { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
.ob-rank li { position: relative; padding: 6px 5px; border-bottom: 1px solid var(--obs); border-radius: 8px; min-width: 0; }
.ob-rank .who { display: flex; gap: 5px; align-items: baseline; min-width: 0; font-size: 15px; font-weight: 850; }
.ob-rank .rk { color: var(--obm); min-width: 14px; }
.ob-rank .nm { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ob-rank .tag { font-size: 10px; font-weight: 800; white-space: nowrap; color: var(--obm); }
.ob-rank .rec { display: flex; justify-content: space-between; gap: 6px; font-size: 13px; color: var(--obm); margin-top: 2px; padding-left: 19px; white-space: nowrap; }
.ob-rank .rec b { color: var(--obi); font-variant-numeric: tabular-nums; }
.ob-rank li.me { background: var(--oba); border-bottom-color: transparent; }
.ob-rank li.gap { padding: 0 5px; border: 0; color: var(--obm); font-size: 13px; text-align: center; }
.ob-rise { display: none; position: absolute; right: 4px; top: 4px; background: #dcfce7; color: #166534; border: 1px solid #86c99b; border-radius: 6px; padding: 0 5px; font-size: 11px; font-weight: 900; }
.ob-rise.on { display: block; }
.ob-side .ob-note { font-size: 11px; margin: 8px 0 0; line-height: 1.35; }
.ob-tname { font-size: 22px; font-weight: 950; margin: 10px 0 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ob-trec { font-size: 12px; color: var(--obm); font-weight: 700; white-space: nowrap; }
.ob-tleft { font-size: 18px; font-weight: 950; margin: 10px 0 6px; line-height: 1.2; }
.ob-tleft small { display: block; font-size: 12px; font-weight: 800; color: var(--obm); }
.ob-track { height: 12px; border-radius: 8px; background: var(--obs); overflow: hidden; }
.ob-track i { display: block; height: 100%; width: 0; background: var(--obg); transition: width .3s; }
.ob-pct { text-align: right; font-size: 11px; font-weight: 850; color: var(--obm); margin-top: 3px; }
.ob-avg { font-size: 26px; font-weight: 950; letter-spacing: -1px; margin: 8px 0 2px; white-space: nowrap; line-height: 1.15; }
.ob-avg span { display: block; font-size: 14px; letter-spacing: 0; }
.ob-best { font-size: 12px; color: var(--obm); font-weight: 700; white-space: nowrap; }
.ob-graph { position: relative; height: 96px; margin-top: 12px; border-bottom: 1px solid var(--obs); display: flex; gap: 3px; align-items: flex-end; }
.ob-graph .bar { flex: 1; min-width: 0; position: relative; background: #8e9da5; border-radius: 3px 3px 0 0; }
.ob-graph .bar.good { background: var(--obg); }
.ob-graph .bar em { display: none; position: absolute; left: 50%; transform: translateX(-50%); bottom: 3px; font-style: normal; font-size: 11px; font-weight: 900; color: #fff; }
.ob-graph .mean { position: absolute; left: 0; right: 0; border-top: 2px dashed var(--obi); pointer-events: none; }
.ob-graph .empty { align-self: center; width: 100%; text-align: center; font-size: 12px; color: var(--obm); font-weight: 800; }
.ob-cap { font-size: 10px; color: var(--obm); white-space: nowrap; margin-top: 6px; letter-spacing: -.3px; }
.ob-side.wide { gap: 20px; }
.ob-side.wide .ob-box { padding: 18px 16px; }
.ob-side.wide h4 { font-size: 24px; }
.ob-side.wide .ob-sub { font-size: 16px; margin-bottom: 14px; }
.ob-side.wide .ob-rank { gap: 7px; }
.ob-side.wide .ob-rank li { display: flex; align-items: center; gap: 8px; padding: 12px 8px; }
.ob-side.wide .ob-rank .who { font-size: 21px; gap: 8px; }
.ob-side.wide .ob-rank .rec { margin: 0 0 0 auto; padding: 0; gap: 10px; font-size: 18px; }
.ob-side.wide .ob-rank .tag { font-size: 12px; }
.ob-side.wide .ob-rise { position: static; font-size: 13px; }
.ob-side.wide .ob-note { font-size: 15px; }
.ob-side.wide .ob-tname { font-size: 32px; margin-top: 14px; }
.ob-side.wide .ob-trec { font-size: 18px; }
.ob-side.wide .ob-tleft { font-size: 32px; margin: 14px 0 10px; }
.ob-side.wide .ob-tleft small { font-size: 16px; }
.ob-side.wide .ob-pct { font-size: 15px; }
.ob-side.wide .ob-avg { font-size: 42px; }
.ob-side.wide .ob-avg span { display: inline; font-size: 22px; margin-right: 8px; }
.ob-side.wide .ob-best { font-size: 18px; }
.ob-side.wide .ob-graph { height: 170px; gap: 6px; margin-top: 20px; }
.ob-side.wide .ob-graph .bar.lbl em { display: block; font-size: 13px; }
.ob-side.wide .ob-cap { font-size: 15px; }
.ob-side.strip { flex-direction: row; gap: 12px; }
.ob-side.strip .ob-box { flex: 1; padding: 8px 12px; display: flex; flex-direction: column; justify-content: center; }
.ob-side.strip .ob-sub, .ob-side.strip .ob-note, .ob-side.strip .tag, .ob-side.strip .ob-trec, .ob-side.strip .ob-best, .ob-side.strip .ob-cap, .ob-side.strip .ob-pct { display: none; }
.ob-side.strip .ob-rank { grid-template-columns: repeat(4, 1fr); gap: 7px; margin-top: 6px; }
.ob-side.strip .ob-rank li { background: var(--obp2); border: 1px solid var(--obs); padding: 4px 7px; }
.ob-side.strip .ob-rank li.me { background: var(--oba); border-color: #c4a11e; }
.ob-side.strip .ob-rank li.gap { display: none; }
.ob-side.strip .ob-rank .who { font-size: 14px; }
.ob-side.strip .ob-rank .rec { font-size: 12px; padding-left: 19px; justify-content: flex-start; }
.ob-side.strip .ob-rise { top: 3px; right: 5px; border: 0; background: none; padding: 0; font-size: 12px; }
.ob-side.strip .ob-target h4, .ob-side.strip .ob-tname, .ob-side.strip .ob-tleft { display: inline; font-size: 16px; margin: 0; }
.ob-side.strip .ob-tline { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ob-side.strip .ob-tname::before { content: " "; }
.ob-side.strip .ob-tleft::before { content: " · "; font-weight: 500; }
.ob-side.strip .ob-tleft small { display: none; }
.ob-side.strip .ob-track { margin-top: 10px; }
.ob-side.strip .ob-stat h4 { display: none; }
.ob-side.strip .ob-avg { font-size: 20px; margin: 0; }
.ob-side.strip .ob-avg span { display: inline; font-size: 15px; margin-right: 4px; }
.ob-side.strip .ob-graph { height: 42px; margin-top: 6px; gap: 6px; }
/* 공간이 없을 때: 놀이 영역 위 작은 띠 하나 */
.ob-compact { position: absolute; z-index: 2; left: 10px; top: 10px; max-width: calc(100% - 20px); display: none; gap: 10px; align-items: center; pointer-events: none;
  background: color-mix(in srgb, var(--obp) 88%, transparent); border: 2px solid var(--obl); border-radius: 12px; padding: 4px 12px; font-size: 15px; font-weight: 900; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ob-compact.on { display: flex; }
.ob-compact .cm-rank { background: var(--oba); border-radius: 8px; padding: 0 8px; }
.ob-compact .cm-target { font-weight: 800; color: var(--obm); overflow: hidden; text-overflow: ellipsis; }
`;
function injectCss() {
  if (document.getElementById("ob-ui-style")) return;
  document.head.append(Object.assign(document.createElement("style"), { id: "ob-ui-style", textContent: CSS }));
}

function li(rank, who, what, me) {
  const e = el("li", me ? "me" : "");
  e.append(el("b", "", String(rank)), el("span", "", who), what);
  return e;
}
const msgLi = (text) => el("li", "empty", text);

// ---------------------------------------------------------------------------
// 1) 그룹 미니 순위: 위 top명 이름 + 내 순위(내 화면에만)
// ---------------------------------------------------------------------------
function groupItems(doc, game, board, { formatRecord = defaultFormat, top = 5, justNow = false, boardLabel = (b) => b } = {}) {
  const list = OB.groupRanking(doc, game, board);
  const items = list.slice(0, top).map((r, i) => li(i + 1,
    `${r.nick}${r.mine && justNow ? " (방금)" : ""}${r.mode === "touch" ? " 👆터치" : ""}${r.plays > 1 ? ` · ${r.plays}판` : ""}`,
    formatRecord(r).main, r.mine));
  const myIdx = list.findIndex((r) => r.mine);
  if (myIdx >= top) items.push(li("나", `${list.length}명 중 ${myIdx + 1}위`, formatRecord(list[myIdx]).main, true));
  if (!list.length) items.push(msgLi(`${boardLabel(board)} 기록이 아직 없어요. 첫 기록을 남겨 보세요!`));
  const waiting = doc.members.length - list.length;
  const note = myIdx < 0 ? `아직 내 기록이 없어요.${waiting > 0 ? ` 기록 없는 사람 ${waiting}명` : ""}`
    : `나는 ${list.length}명 중 ${myIdx + 1}위${waiting > 0 ? ` · 기록 없는 사람 ${waiting}명` : ""}`;
  return { items, note };
}

// container 안을 그룹 순위로 채운다. doc이 없으면 비우고 false를 돌려준다.
export function renderGroupMini(container, { doc, game, board, title, formatRecord, boardLabel, top = 5 }) {
  injectCss();
  container.classList.add("ob-scope", "ob-mini");
  if (!doc) { container.replaceChildren(); return false; }
  const { items, note } = groupItems(doc, game, board, { formatRecord, boardLabel, top });
  const list = el("ol", "ob-list"); list.append(...items);
  container.replaceChildren(el("h3", "", title || `👥 그룹 ${fmtCode(doc.code)} · ${boardLabel ? boardLabel(board) : board} 순위`), list, el("p", "ob-note", note));
  return true;
}

// ---------------------------------------------------------------------------
// 2) 결과 화면 기록판
// ---------------------------------------------------------------------------
// opts: { container, game, gameName, group(mountGroup 반환값), formatRecord, boardLabel,
//         localRows(lastRec) → [{ nick, rank, mode, justNow, mine, ...칸 }] (이 기기 탭), title }
// show({ board, record, nickEntered, lastRec }) : record는 submitScore에 보낼 값(board·rank·칸, nick은 비워도 된다)
export function createResultBoard({ container, game, gameName = "이 게임", group = null, formatRecord = defaultFormat, boardLabel = (b) => b, localRows = () => [], title = "🏆 기록판" }) {
  injectCss();
  container.classList.add("ob-scope");
  container.replaceChildren();
  const top = el("div", "ob-board-top");
  const tabs = el("div", "ob-tabs");
  const TABS = [["group", "👥 그룹"], ["today", "🌐 오늘"], ["month", "🌐 30일"], ["local", "📱 이 기기"]];
  for (const [k, label] of TABS) {
    const b = el("button", "", label); b.type = "button"; b.dataset.tab = k; b.setAttribute("aria-pressed", "false");
    b.addEventListener("click", () => setTab(k));
    tabs.append(b);
  }
  top.append(el("h3", "", title), tabs);
  const sub = el("p", "ob-board-sub"), list = el("ol", "ob-list"), note = el("p", "ob-note");
  container.append(top, sub, list, note);

  let cur = null;          // { board, record, lastRec }
  let upload = null, uploadPromise = null, tab = "local", token = 0;
  const inGroup = () => !!group && group.inGroup();

  function show({ board, record, nickEntered = true, lastRec = null }) {
    cur = { board, record, lastRec };
    upload = null; uploadPromise = null;
    if (!OB.getOptIn() && !inGroup()) renderNote();
    else {
      upload = { state: "sending" };
      const mine = cur;
      uploadPromise = OB.submitScore(game, { ...record, board, nick: nickEntered ? record.nick : "" }).then((res) => {
        if (res.group && group) group.setDoc(res.group.ok ? res.group.doc : null);   // 올리면서 받은 그룹 상태로 갱신(따로 읽지 않는다)
        if (cur === mine) upload = { state: "done", res };
        return res;
      });
      uploadPromise.then(() => { if (cur === mine) { renderNote(); if (tab !== "local") render(); } });
      renderNote();
    }
    setTab(inGroup() ? "group" : OB.getOptIn() ? "today" : "local");
    return uploadPromise;
  }

  function setTab(k) {
    if (k === "group" && !inGroup()) k = OB.getOptIn() ? "today" : "local";
    tab = k;
    for (const b of tabs.children) {
      if (b.dataset.tab === "group") b.hidden = !inGroup();
      b.setAttribute("aria-pressed", String(b.dataset.tab === k));
    }
    render();
  }

  async function render() {
    const t = ++token;
    if (!cur) return;
    const { board, record } = cur;
    if (tab === "local") {
      sub.textContent = "📱 이 기기에서 한 판 · 이름마다 가장 좋은 판";
      const rows = localRows(cur.lastRec);
      list.replaceChildren(...rows.slice(0, 10).map((r, i) => li(i + 1,
        `${r.nick}${r.justNow ? " (방금)" : ""}${r.mode === "touch" ? " 👆터치" : ""}`, formatRecord(r).main, r.mine)));
      if (!rows.length) list.append(msgLi("이 기기 기록이 아직 없어요."));
      return;
    }
    if (tab === "group") {
      list.replaceChildren(msgLi("그룹 기록을 불러오는 중…"));
      if (uploadPromise) await uploadPromise;
      if (t !== token) return;
      const doc = group?.getDoc();
      if (!doc) { sub.textContent = "👥 그룹"; list.replaceChildren(msgLi("그룹 기록을 불러오지 못했어요.")); return; }
      sub.textContent = `👥 그룹 ${fmtCode(doc.code)} · ${boardLabel(board)} · ${doc.members.length}명`;
      list.replaceChildren(...groupItems(doc, game, board, { formatRecord, boardLabel, justNow: !!upload?.res?.group?.ok }).items);
      return;
    }
    const today = tab === "today";
    sub.textContent = `🌐 ${today ? "오늘" : "최근 30일"} 온라인 · ${boardLabel(board)}`;
    list.replaceChildren(msgLi("기록을 불러오는 중…"));
    if (uploadPromise) await uploadPromise;   // 방금 올린 판이 목록에 들어가도록
    const res = await OB.fetchBoard(game, board, { today });
    if (t !== token) return;
    if (!res.ok) { list.replaceChildren(msgLi(res.reason === "offline" ? "인터넷에 연결되지 않아 온라인 기록판을 볼 수 없어요." : "온라인 기록판을 불러오지 못했어요.")); return; }
    const justId = upload?.res?.ok ? upload.res.id : null;
    const items = res.rows.map((r, i) => li(i + 1, `${r.nick}${r.id === justId ? " (방금)" : ""}${r.mode === "touch" ? " 👆터치" : ""}`,
      formatRecord(r).main, r.mine && r.nick === record.nick));
    if (!res.rows.length) items.push(msgLi(today ? "오늘 올라온 기록이 아직 없어요." : "올라온 기록이 아직 없어요."));
    list.replaceChildren(...items);
    // 이번 판이 목록 밖이면 정확한 순위 대신 "상위 몇 %"만 (개수만 세서 읽기를 아낀다)
    const shown = justId && res.rows.some((r) => r.id === justId);
    if (!shown && res.rows.length >= 10 && record.rank <= res.rows[res.rows.length - 1].rank) {
      const line = msgLi("이번 판 위치를 세는 중…");
      list.append(line);
      const range = await OB.rankRange(game, board, record.rank, { today, counted: !!justId });
      if (t !== token) return;
      line.textContent = range.ok ? `이번 판: ${today ? "오늘" : "30일 동안"} 올라온 ${fmtN(range.total)}판 중 상위 ${range.pct}%` : "";
    }
  }

  function renderNote() {
    note.replaceChildren();
    if (!upload) { note.textContent = "🌐 온라인 기록판 올리기가 꺼져 있어 이 기기에만 저장했어요."; return; }
    if (upload.state === "sending") { note.textContent = inGroup() ? "👥 그룹과 🌐 온라인에 올리는 중…" : "🌐 온라인 기록판에 올리는 중…"; return; }
    const res = upload.res;
    const why = {
      off: "온라인 기록판 올리기는 꺼져 있어요.",
      nick: `${res.problem} 온라인에는 올리지 않았어요.`,
      rate: "방금 올린 기록이 있어 이번 판은 온라인에 올리지 않았어요. (10초에 한 번)",
      offline: "인터넷에 연결되지 않아 이 기기에만 저장했어요.",
      rejected: "기록 형식이 맞지 않아 온라인에 올리지 못했어요.",
      deleted: "이 기기에서 올린 온라인 기록을 지웠어요.",
      error: "온라인에 올리지 못했어요.",
    };
    let text = res.ok ? `🌐 온라인 기록판에 올렸어요(${OB.KEEP_DAYS_TEXT} 보관). ` : `🌐 ${why[res.reason] || why.error} `;
    if (res.group) {
      const g = res.group;
      text = (g.ok ? "👥 그룹에 올렸어요. " : g.reason === "gone" ? "👥 그룹이 끝나 그룹에는 올리지 않았어요. "
        : g.reason === "nick" ? "👥 별명이 없거나 맞지 않아 그룹에 올리지 못했어요. " : "👥 그룹에 올리지 못했어요. ") + text;
    }
    note.textContent = text;
    const del = el("button", "ob-linkbtn", "이 기기에서 올린 온라인 기록 지우기"); del.type = "button";
    del.addEventListener("click", deleteMine);
    note.append(del);
  }

  async function deleteMine() {
    if (!confirm(`이 기기에서 올린 ${gameName} 온라인 기록을 모두 지울까요?\n(이 기기 기록판과 그룹 순위는 그대로 남아요)`)) return;
    note.textContent = "🌐 지우는 중…";
    const res = await OB.deleteMine(game);
    note.textContent = res.ok ? `🌐 이 기기에서 올린 온라인 기록 ${res.count}건을 지웠어요.` : "🌐 지우지 못했어요. 인터넷 연결을 확인해 주세요.";
    if (res.ok && upload?.res?.ok) upload.res = { ...upload.res, ok: false, reason: "deleted" };
    if (tab === "today" || tab === "month") render();
  }

  // 그룹 버튼의 onChange에서 부른다: 그룹 탭을 보이거나 숨기고 다시 그린다
  function onGroupChange() {
    if (!cur) return;
    const btn = [...tabs.children].find((b) => b.dataset.tab === "group");
    const wasHidden = btn.hidden;
    btn.hidden = !inGroup();
    if (tab === "group" && !inGroup()) setTab(OB.getOptIn() ? "today" : "local");
    else if (wasHidden && inGroup()) setTab("group");
    else if (tab === "group") (uploadPromise || Promise.resolve()).then(() => { if (tab === "group") render(); });
  }

  return { show, setTab, render, onGroupChange, getTab: () => tab, uploadPromise: () => uploadPromise };
}

// ---------------------------------------------------------------------------
// 3) 경기 화면 패널
// ---------------------------------------------------------------------------
// opts: { host(놀이 영역을 감싼 position:relative 요소), game, group, getBoard() → 난이도 등 board 값, getNick(),
//         boardLabel(board), formatRecord(row) → { main, a, b }, localRows(board) → [{ nick, rank, mode, ...칸 }] (내 것 포함),
//         gap(me, target) → { left, sub, pct } (없으면 점수 차이), stat: null | { title, caption, avgLabel, bestLabel,
//         values() → 숫자[], format(v) → "0.52초", lowerIsBetter, floor, ceil } (없으면 오른쪽에 다음 목표만),
//         layout: "auto" | "embed" | "compact" | "headless" | "off", left/right(embed일 때 넣을 상자),
//         minSide=130, minStrip=90, maxWidth=360, wideFrom=250, allowCompact=true }
// 게임이 할 일: 게임 시작 때 prepare(), 놀이 영역 크기가 바뀔 때 place(rect), 매 프레임 update(me), 그룹 onChange에서 onGroupDoc(doc)
//   me = { rank, playing, row: formatRecord에 넘길 지금 기록 }
export function createLivePanels(opts) {
  const { host, game, group = null, getBoard, getNick = () => "", boardLabel = (b) => b, formatRecord = defaultFormat,
    localRows = () => [], gap = defaultGap, stat = null, minSide = 130, minStrip = 90, maxWidth = 360, wideFrom = 250, allowCompact = true } = opts;
  let layout = opts.layout || "auto";
  const headless = layout === "headless" || layout === "off";
  if (!headless) injectCss();

  let live = { kind: "none", title: "🏆 기록판", sub: "", others: [], myBest: null };
  let token = 0, key = "", lastPos = 0, riseUntil = 0, lastSnap = null, placed = "";
  let L = null, R = null, C = null, refs = {};

  if (!headless) {
    L = el("aside", "ob-side ob-scope"); L.setAttribute("aria-label", "기록판");
    const bb = el("div", "ob-box ob-board");
    refs.title = el("h4"); refs.sub = el("div", "ob-sub"); refs.rank = el("ol", "ob-rank"); refs.note = el("div", "ob-note");
    bb.append(refs.title, refs.sub, refs.rank, refs.note); L.append(bb);
    R = el("aside", "ob-side ob-scope"); R.setAttribute("aria-label", stat ? "다음 목표와 기록" : "다음 목표");
    const tb = el("div", "ob-box ob-target"), tl = el("div", "ob-tline");
    refs.tname = el("div", "ob-tname"); refs.trec = el("div", "ob-trec"); refs.tleft = el("div", "ob-tleft");
    tl.append(el("h4", "", "🎯 다음 목표"), refs.tname, refs.trec, refs.tleft);
    const track = el("div", "ob-track"); refs.tbar = el("i"); track.append(refs.tbar);
    refs.tpct = el("div", "ob-pct");
    tb.append(tl, track, refs.tpct); R.append(tb);
    if (stat) {
      const sb = el("div", "ob-box ob-stat");
      refs.avg = el("div", "ob-avg"); refs.best = el("div", "ob-best"); refs.graph = el("div", "ob-graph");
      sb.append(el("h4", "", stat.title || "📊 기록"), refs.avg, refs.best, refs.graph, el("div", "ob-cap", stat.caption || ""));
      R.append(sb);
    }
    C = el("div", "ob-compact ob-scope");
    if (layout === "embed") {
      L.classList.add("embed", "on"); R.classList.add("embed", "on");
      opts.left?.append(L); opts.right?.append(R);
      if (allowCompact && !opts.left) host.append(C);
    } else host.append(L, R, C);
  }

  // 이 기기에 남은 내 최고 기록 (지금 별명·같은 board)
  function localBest(board) {
    const nick = getNick();
    return localRows(board).filter((r) => r.nick === nick).sort((a, b) => b.rank - a.rank)[0] || null;
  }

  // 게임 시작 때: 그룹 → 오늘 → 30일 → (인터넷이 안 되면) 이 기기
  async function prepare() {
    const t = ++token;
    lastPos = 0; riseUntil = 0;
    const board = getBoard();
    if (group?.inGroup() && group.getDoc()) { fromGroup(group.getDoc()); return; }
    live = { kind: "loading", title: "🌐 오늘 기록", sub: `${boardLabel(board)} · 불러오는 중…`, others: [], myBest: null };
    key = "";
    let res = await OB.fetchBoard(game, board, { today: true }), kind = "today";
    if (res.ok && !res.rows.length) { res = await OB.fetchBoard(game, board, {}); kind = "month"; }
    if (t !== token) return;
    const nick = getNick();
    if (res.ok) {
      const isMe = (r) => r.mine && r.nick === nick;
      live = { kind, title: kind === "today" ? "🌐 오늘 기록" : "🌐 30일 기록", sub: boardLabel(board),
        others: res.rows.filter((r) => !isMe(r)), myBest: res.rows.find(isMe) || localBest(board) };
    } else {
      const rows = localRows(board).sort((a, b) => b.rank - a.rank);
      live = { kind: "local", title: "📱 이 기기 기록", sub: `${boardLabel(board)} · 인터넷 연결 없음`,
        others: rows.filter((r) => r.nick !== nick).slice(0, 10), myBest: rows.find((r) => r.nick === nick) || null };
    }
    key = "";
  }
  function fromGroup(doc) {
    const board = getBoard();
    const list = OB.groupRanking(doc, game, board);
    live = { kind: "group", title: "👥 그룹 순위", sub: `${boardLabel(board)} · ${doc.members.length}명`,
      others: list.filter((r) => !r.mine), myBest: list.find((r) => r.mine) || null };
    key = "";
  }
  // 경기 중 그룹 문서가 새로 오면(30초마다) 반영한다. 그룹이 끝났으면 공개 기록판으로.
  function onGroupDoc(doc) {
    if (doc && group?.inGroup()) fromGroup(doc);
    else if (live.kind === "group") prepare();
  }

  // 놀이 영역(카메라 화면) 위치를 받아 패널을 놓는다. rect: { x, y, w, h, W, H } (host 안쪽 기준 px)
  // 돌려주는 값: 실제로 쓴 배치 "side" | "strip" | "compact" | "embed" | "none"
  function place(rect) {
    if (headless) return "none";
    if (layout === "embed") return "embed";
    const { x, y, W, H } = rect;
    const k = `${Math.round(W)}x${Math.round(H)}|${Math.round(x)}|${Math.round(y)}|${layout}`;
    if (k === placed) return lastPlace;
    placed = k;
    for (const p of [L, R]) { p.className = "ob-side ob-scope"; p.removeAttribute("style"); }
    C.classList.remove("on");
    let mode = "none";
    if (layout === "auto" && x >= minSide) {
      const pw = Math.min(x - 20, maxWidth), g = `${Math.round((x - pw) / 2)}px`;
      L.className = R.className = `ob-side ob-scope on${pw >= wideFrom ? " wide" : ""}`;
      Object.assign(L.style, { top: "10px", bottom: "10px", width: `${pw}px`, left: g });
      Object.assign(R.style, { top: "10px", bottom: "10px", width: `${pw}px`, right: g });
      mode = "side";
    } else if (layout === "auto" && y >= minStrip) {
      const ph = Math.min(y - 20, 170), g = `${Math.round((y - ph) / 2)}px`;
      L.className = R.className = "ob-side ob-scope on strip";
      Object.assign(L.style, { left: "10px", right: "10px", height: `${ph}px`, top: g });
      Object.assign(R.style, { left: "10px", right: "10px", height: `${ph}px`, bottom: g });
      mode = "strip";
    } else if ((layout === "auto" && allowCompact) || layout === "compact") {
      C.classList.add("on");
      Object.assign(C.style, { left: `${Math.round(x + 10)}px`, top: `${Math.round(y + 10)}px` });
      mode = "compact";
    }
    lastPlace = mode; key = "";
    return mode;
  }
  let lastPlace = "none";

  // 지금 상태의 값 계산 (DOM이 없어도 쓸 수 있다)
  function compute(me, now) {
    const others = live.others, best = live.myBest;
    // 내 줄은 한 줄: 이번 판이 내 최고 기록을 넘기 전까지는 최고 기록, 넘으면 이번 판
    const showLive = !best || me.rank > best.rank;
    const mine = showLive ? { ...me.row, rank: me.rank } : best;
    const pos = 1 + others.filter((o) => o.rank >= mine.rank).length;   // 같은 기록이면 먼저 세운 사람이 위
    if (me.playing && showLive && lastPos && pos < lastPos) riseUntil = now + 2500;
    lastPos = pos;
    const limited = live.kind !== "group" && others.length >= 10 && pos > others.length;
    // 다음 목표: 먼저 내 최고 기록, 넘은 뒤에는 바로 위 사람
    let t = null, tName;
    if (best && best.rank >= me.rank) { t = best; tName = "내 최고 기록"; }
    else { const above = others.filter((o) => o.rank >= me.rank); t = above[above.length - 1] || null; tName = t?.nick; }
    let target;
    if (t) { const g = gap(me, t); target = { name: tName, rec: formatRecord(t).main, left: g.left, sub: g.sub || "", pct: clamp01(g.pct) }; }
    else if (best) target = { name: "🏆 최고 기록 경신!", rec: `이전 ${formatRecord(best).main}`, left: "지금 1위예요!", sub: "", pct: 1 };
    else if (others.length) target = { name: "🥇 지금 1위!", rec: "", left: "1위를 지켜요", sub: "", pct: 1 };
    else target = { name: "첫 기록에 도전!", rec: "", left: live.kind === "loading" ? "" : "버틸수록 기록이 올라가요", sub: "", pct: 0 };
    const note = live.kind === "loading" ? "기록을 불러오는 중…"
      : !others.length ? (best ? "내 최고 기록과 겨뤄요" : "첫 기록에 도전해 보세요!")
      : live.kind === "group" ? `${others.length + 1}명 중 ${pos}위 · 30초마다 갱신`
      : limited ? `위 ${others.length}명 밖 · 더 올라가 봐요!` : `${others.length + 1}명 중 ${pos}위`;
    return { live, others, mine, showLive, best, pos, limited, target, note, rising: riseUntil > now, playing: me.playing };
  }

  function update(me) {
    const now = performance.now();
    const s = compute(me, now);
    const vals = stat ? stat.values() : [];
    const k = `${me.rank}|${s.mine.rank}|${live.kind}|${s.others.length}|${live.sub}|${s.target.left}|${s.target.sub}|${vals.length}|${s.rising}|${me.playing}|${lastPlace}`;
    lastSnap = { ...s, stat: stat ? statModel(vals) : null };
    if (headless || k === key) return lastSnap;
    key = k;
    if (lastPlace === "compact" || (layout === "embed" && !opts.left)) renderCompact(s);
    if (lastPlace !== "compact") { renderBoard(s); renderTarget(s.target); if (stat) renderStat(lastSnap.stat); }
    return lastSnap;
  }

  function renderBoard(s) {
    const { others, mine, showLive, best, pos, limited } = s;
    const meRow = { me: true, ...mine, pos };
    const merged = [...others.slice(0, pos - 1).map((o, i) => ({ ...o, pos: i + 1 })), meRow, ...others.slice(pos - 1).map((o, i) => ({ ...o, pos: pos + 1 + i }))];
    const slots = L.classList.contains("strip") ? 4 : 5;   // 옆 패널 5줄, 위아래 띠 4칸. 내가 그 밖이면 마지막 칸에 내 줄
    const rows = pos <= slots ? merged.slice(0, slots) : [...merged.slice(0, slots - 1), { gap: true }, meRow];
    refs.title.textContent = live.title;
    refs.sub.textContent = live.sub;
    refs.rank.replaceChildren(...rows.map((r) => {
      const e = el("li");
      if (r.gap) { e.className = "gap"; e.textContent = "⋯"; return e; }
      if (r.me) e.className = "me";
      const f = formatRecord(r);
      const who = el("div", "who"); who.append(el("span", "rk", r.me && limited ? "–" : String(r.pos)),
        el("span", "nm", r.me ? (showLive ? "🔴 나" : "⭐ 나") : r.nick),
        el("span", "tag", !r.me ? (r.mode === "touch" ? "👆" : "") : !showLive ? "최고 기록" : best && s.playing ? "경신 중!" : s.playing ? "경기 중" : ""));
      const rec = el("div", "rec"); rec.append(el("span", "", f.a || ""), el("b", "", f.b || f.main));
      e.append(who, rec);
      if (r.me && s.rising) e.append(el("span", "ob-rise on", `⬆ ${pos}위!`));
      return e;
    }));
    refs.note.textContent = s.note;
  }

  function renderTarget(t) {
    refs.tname.textContent = t.name;
    refs.trec.textContent = t.rec;
    refs.tleft.replaceChildren(t.left || "");
    if (t.sub) refs.tleft.append(el("small", "", t.sub));
    refs.tbar.style.width = `${t.pct * 100}%`;
    refs.tpct.textContent = `${Math.round(t.pct * 100)}%`;
  }

  // 통계 막대: 최근 10개, 평균 점선, 평균보다 좋은 값은 초록
  function statModel(vals) {
    if (!vals.length) return { empty: true };
    const low = stat.lowerIsBetter !== false;
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    const best = low ? Math.min(...vals) : Math.max(...vals);
    const last = vals.slice(-10);
    const floor = stat.floor ?? 0, ceilMin = stat.ceil ?? Math.max(...last);
    const span = Math.max(...last) - Math.min(...last) || 1;
    const lo = Math.max(0, Math.min(floor, Math.min(...last) - span * 0.25));
    const hi = Math.max(ceilMin, Math.max(...last) + span * 0.05);
    const H = (v) => clamp01((v - lo) / (hi - lo || 1)) * 100;
    const lastBest = low ? Math.min(...last) : Math.max(...last);
    return { avg, best, avgH: H(avg), bars: last.map((v, i) => ({ v, h: Math.max(4, H(v)), good: low ? v < avg : v > avg, label: i === last.length - 1 || v === lastBest })) };
  }
  function renderStat(m) {
    const f = stat.format || ((v) => String(v));
    if (m.empty) {
      refs.avg.replaceChildren(el("span", "", stat.avgLabel || "평균"), "-");
      refs.best.textContent = stat.emptyText || "기록이 쌓이면 나와요";
      refs.graph.replaceChildren(el("div", "empty", stat.emptyGraph || "아직 기록이 없어요"));
      return;
    }
    refs.avg.replaceChildren(el("span", "", stat.avgLabel || "평균"), f(m.avg));
    refs.best.textContent = `${stat.bestLabel || "가장 좋음"} ${f(m.best)}`;
    const bars = m.bars.map((b) => { const d = el("div", `bar${b.good ? " good" : ""}${b.label ? " lbl" : ""}`); d.style.height = `${b.h}%`; d.append(el("em", "", f(b.v).replace(/[^\d.]/g, ""))); return d; });
    const mean = el("div", "mean"); mean.style.bottom = `${m.avgH}%`;
    refs.graph.replaceChildren(...bars, mean);
  }

  function renderCompact(s) {
    C.replaceChildren(el("span", "", live.kind === "group" ? "👥" : live.kind === "local" ? "📱" : "🌐"),
      el("span", "cm-rank", s.limited ? "순위 밖" : `${s.pos}위`),
      el("span", "cm-target", s.target.name ? `🎯 ${s.target.name}${s.target.left ? ` · ${s.target.left}` : ""}` : ""));
  }

  return { prepare, place, update, onGroupDoc, snapshot: () => lastSnap, setLayout: (m) => { layout = m; placed = ""; }, elements: { left: L, right: R, compact: C } };
}
