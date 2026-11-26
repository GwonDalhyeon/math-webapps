// ===========================================================================
// 그룹 버튼 + 대화상자 (아이스브레이킹 게임 공용 화면)
// - 상단에 👥 버튼을 두고, 그룹에 들어가 있으면 "👥 482 913 · 7명 · 52분"을 계속 보여 준다.
// - 그룹 순위는 게임 화면이 그린다. 이 모듈은 그룹 문서를 읽어 onChange(doc)로 넘겨준다.
// - 읽기를 아끼려고: 화면이 가려졌을 때는 읽지 않고, 20초마다 읽되 바뀐 게 없으면 40초·60초로 늦춘다.
//   게임 중에는 isPlaying()이 참일 때만 30초 이상 간격으로 읽는다(아니면 읽지 않는다).
// 사용: const group = mountGroup({ slot, buttonClass, getNick, setNick, isIdle, isPlaying, onOpen, onChange });
//   상단 바가 없는 게임은 slot 없이 floating: "top-right"(또는 "top-left", "bottom-right", "bottom-left")로 화면 구석에 띄운다.
// ===========================================================================
import * as OB from "./online-board.js";

const BASE_MS = 20000, SLOW_MS = 40000, SLOWEST_MS = 60000, TICK_MS = 5000;
const PLAY_MS = 30000;   // 게임 중에도 순위 패널을 보여 주는 게임은 30초마다(바뀐 게 없으면 더 늦게) 읽는다

const CSS = `
.og-btn .og-code { font-variant-numeric: tabular-nums; letter-spacing: .5px; }
.og-float { position: fixed; z-index: 900; }
.og-float.top-right { top: 10px; right: 10px; } .og-float.top-left { top: 10px; left: 10px; }
.og-float.bottom-right { bottom: 10px; right: 10px; } .og-float.bottom-left { bottom: 10px; left: 10px; }
.og-btn.og-plain { min-height: 44px; padding: 6px 12px; border-radius: 14px; border: 3px solid var(--line, #14324a); background: var(--panel, #fffdf5);
  color: var(--ink, #14324a); font: inherit; font-size: 15px; font-weight: 900; box-shadow: 0 3px 0 var(--line, #14324a); cursor: pointer; white-space: nowrap; }
@media (max-width: 760px) { .og-btn .og-extra { display: none; } }
.og-overlay { position: fixed; inset: 0; z-index: 1000; display: none; align-items: center; justify-content: center; padding: 16px; background: rgba(15, 30, 45, .55); }
.og-overlay.on { display: flex; }
.og-card { width: min(460px, 100%); max-height: calc(100dvh - 32px); overflow: auto; background: var(--panel, #fffdf5); color: var(--ink, #14324a);
  border: 3px solid var(--line, #14324a); border-radius: 22px; box-shadow: 0 6px 0 var(--line, #14324a); padding: 20px 22px; font-size: 17px; }
.og-card h2 { margin: 0 0 6px; font-size: 26px; font-weight: 950; }
.og-card p { margin: 0 0 12px; line-height: 1.5; }
.og-card .og-fine { font-size: 14px; color: var(--muted, #47667a); }
.og-card label { display: block; font-size: 15px; font-weight: 900; margin: 10px 0 4px; }
.og-card input { width: 100%; min-height: 50px; border: 2px solid var(--soft, #b9d2da); border-radius: 12px; background: var(--panel2, #eef8fb); padding: 0 12px; font: inherit; font-size: 19px; color: inherit; }
.og-card input.og-codein { font-size: 26px; font-weight: 900; letter-spacing: 6px; text-align: center; font-variant-numeric: tabular-nums; }
.og-row { display: flex; gap: 8px; margin-top: 8px; }
.og-row > * { flex: 1; }
.og-or { text-align: center; color: var(--muted, #47667a); font-size: 14px; font-weight: 800; margin: 14px 0 2px; }
.og-b { min-height: 52px; border-radius: 14px; border: 3px solid var(--line, #14324a); background: var(--panel, #fffdf5); color: inherit; font: inherit; font-size: 18px; font-weight: 900; cursor: pointer; box-shadow: 0 3px 0 var(--line, #14324a); white-space: nowrap; padding: 0 14px; }
.og-b.pri { background: var(--accent, #ffd23f); }
.og-b:disabled { opacity: .5; cursor: default; }
.og-big { font-size: clamp(54px, 15vw, 84px); font-weight: 950; letter-spacing: 4px; text-align: center; line-height: 1.05; margin: 6px 0; font-variant-numeric: tabular-nums; }
.og-meta { text-align: center; font-size: 18px; font-weight: 900; color: var(--muted, #47667a); margin-bottom: 12px; }
.og-msg { min-height: 22px; margin: 10px 0 0; font-size: 15px; font-weight: 800; color: var(--bad, #dc2626); }
`;

const fmtCode = (c) => `${c.slice(0, 3)} ${c.slice(3)}`;
const minutesLeft = (doc) => Math.max(0, Math.ceil((doc.expiresAt - Date.now()) / 60000));
const sigOf = (doc) => `${doc.members.length}|${Math.max(0, ...doc.members.map((m) => m.at))}`;

function reasonText(res) {
  return {
    nick: `${res.problem || "별명이 맞지 않아서"} 그룹을 쓸 수 없어요.`,
    rate: "그룹은 1분에 하나만 만들 수 있어요. 잠시 뒤 다시 눌러 주세요.",
    notfound: "그 코드의 그룹이 없어요. 6자리 숫자를 다시 확인해 주세요.",
    expired: "1시간이 지나 끝난 그룹이에요. 새 그룹을 만들어 주세요.",
    gone: "1시간이 지나 끝난 그룹이에요. 새 그룹을 만들어 주세요.",
    full: "그룹이 가득 찼어요. (60명까지)",
    offline: "인터넷에 연결되지 않았어요.",
  }[res.reason] || "잠시 뒤 다시 해 주세요.";
}

export function mountGroup({ slot = null, floating = "", buttonClass = "", getNick = () => "", setNick = () => {}, isIdle = () => true, isPlaying = () => false, onOpen = () => {}, onChange = () => {} }) {
  if (!document.getElementById("og-style")) {
    document.head.append(Object.assign(document.createElement("style"), { id: "og-style", textContent: CSS }));
  }
  if (!slot || floating) {
    slot = document.createElement("div");
    slot.className = `og-float ${floating || "top-right"}`;
    document.body.append(slot);
  }
  const btn = Object.assign(document.createElement("button"), { type: "button", className: `${buttonClass || "og-plain"} og-btn`.trim() });
  btn.setAttribute("aria-haspopup", "dialog");
  slot.replaceChildren(btn);

  const ov = document.createElement("div");
  ov.className = "og-overlay";
  ov.innerHTML = `<div class="og-card" role="dialog" aria-modal="true" aria-labelledby="ogTitle"></div>`;
  document.body.append(ov);
  const card = ov.firstElementChild;

  let doc = null;            // 마지막으로 읽은 그룹 문서
  let lastReadAt = 0, streak = 0, sig = "", reading = false, timer = 0;

  function setDoc(next) {
    if (next) {
      const s = sigOf(next);
      streak = s === sig ? streak + 1 : 0;
      sig = s;
      lastReadAt = Date.now();
    }
    doc = next;
    renderButton();
    if (ov.classList.contains("on")) renderCard();
    onChange(doc);
  }

  function renderButton() {
    const g = OB.getGroup();
    if (!g) { btn.textContent = "👥 그룹"; btn.title = "같은 코드로 모여 기록을 함께 봐요"; return; }
    const n = doc && doc.code === g.code ? doc.members.length : null;
    const left = Math.max(0, Math.ceil((g.expiresAt - Date.now()) / 60000));
    btn.innerHTML = `👥 <span class="og-code"></span><span class="og-extra"></span>`;
    btn.querySelector(".og-code").textContent = fmtCode(g.code);
    btn.querySelector(".og-extra").textContent = `${n ? ` · ${n}명` : ""} · ${left}분`;
    btn.title = "그룹 코드 크게 보기";
  }

  function el(html) { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content; }

  function renderCard(message = "") {
    const g = OB.getGroup();
    if (g) {
      const n = doc && doc.code === g.code ? `${doc.members.length}명 · ` : "";
      card.replaceChildren(el(`
        <h2 id="ogTitle">👥 그룹 코드</h2>
        <div class="og-big"></div>
        <div class="og-meta"></div>
        <p class="og-fine">이 코드를 친구에게 보여 주세요. 같은 코드를 넣은 사람끼리 기록을 함께 봐요. 별명과 게임 기록만 보이고, 1시간이 지나면 그룹과 기록이 사라져요.</p>
        <div class="og-row"><button class="og-b pri" data-act="close">계속하기</button><button class="og-b" data-act="leave">그룹 나가기</button></div>`));
      card.querySelector(".og-big").textContent = fmtCode(g.code);
      card.querySelector(".og-meta").textContent = `${n}${Math.max(0, Math.ceil((g.expiresAt - Date.now()) / 60000))}분 남음`;
    } else {
      card.replaceChildren(el(`
        <h2 id="ogTitle">👥 그룹으로 함께 하기</h2>
        <p class="og-fine">같은 6자리 코드를 넣은 사람끼리 1시간 동안 기록을 함께 봐요. 별명과 게임 기록만 보여요. 실명·학번은 쓰지 마세요.</p>
        <label for="ogNick">별명</label>
        <input id="ogNick" maxlength="12" autocomplete="off" placeholder="실명 말고 별명" />
        <div class="og-row"><button class="og-b pri" data-act="create">➕ 새 그룹 만들기</button></div>
        <div class="og-or">또는 친구의 코드 입력</div>
        <div class="og-row"><input id="ogCode" class="og-codein" inputmode="numeric" autocomplete="off" maxlength="7" placeholder="000000" /><button class="og-b pri" data-act="join" style="flex:none">들어가기</button></div>
        <p class="og-msg" role="status"></p>
        <div class="og-row"><button class="og-b" data-act="close">닫기</button></div>`));
      const nickIn = card.querySelector("#ogNick");
      nickIn.value = getNick() || "";
      card.querySelector("#ogCode").addEventListener("keydown", (e) => { if (e.key === "Enter") join(); });
      card.querySelector(".og-msg").textContent = message;
    }
  }

  async function busy(fn) {
    const buttons = card.querySelectorAll("button");
    buttons.forEach((b) => { b.disabled = true; });
    const msg = card.querySelector(".og-msg");
    if (msg) { msg.style.color = "var(--muted, #47667a)"; msg.textContent = "연결하는 중…"; }
    try { await fn(); } finally { buttons.forEach((b) => { b.disabled = false; }); }
  }
  function nickValue() { return (card.querySelector("#ogNick")?.value || "").trim(); }

  async function create() {
    const nick = nickValue();
    await busy(async () => {
      const res = await OB.createGroup(nick);
      if (!res.ok) { renderCard(reasonText(res)); return; }
      setNick(nick);
      setDoc(res.doc);
      renderCard();
      schedule();
    });
  }
  async function join() {
    const nick = nickValue();
    const code = (card.querySelector("#ogCode")?.value || "").replace(/\D/g, "");
    if (code.length !== 6) { const m = card.querySelector(".og-msg"); m.style.color = ""; m.textContent = "6자리 숫자를 넣어 주세요."; return; }
    await busy(async () => {
      const res = await OB.joinGroup(code, nick);
      if (!res.ok) { renderCard(reasonText(res)); card.querySelector("#ogCode").value = code; return; }
      setNick(nick);
      setDoc(res.doc);
      close();
      schedule();
    });
  }
  async function leave() {
    await OB.leaveGroup();
    sig = ""; streak = 0;
    setDoc(null);
    renderCard();
  }

  function open() {
    onOpen();
    renderCard();
    ov.classList.add("on");
    (card.querySelector("#ogNick") && !card.querySelector("#ogNick").value ? card.querySelector("#ogNick") : card.querySelector("[data-act]"))?.focus();
  }
  function close() { ov.classList.remove("on"); btn.focus(); }

  btn.addEventListener("click", open);
  ov.addEventListener("click", (e) => {
    if (e.target === ov) { close(); return; }
    const act = e.target.closest("[data-act]")?.dataset.act;
    if (act === "close") close();
    else if (act === "create") create();
    else if (act === "join") join();
    else if (act === "leave") leave();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && ov.classList.contains("on")) close(); });

  // 그룹 문서 읽기: 화면을 보고 있고 게임 중이 아닐 때만, 바뀐 게 없으면 점점 덜 자주
  async function refresh(force = false, minMs = BASE_MS) {
    if (!OB.getGroup()) { if (doc) setDoc(null); return; }
    if (reading) return;
    const wait = Math.max(minMs, streak >= 6 ? SLOWEST_MS : streak >= 3 ? SLOW_MS : BASE_MS);
    if (!force && Date.now() - lastReadAt < wait) return;
    reading = true;
    try {
      const res = await OB.readGroup();
      if (res.ok) setDoc(res.doc);
      else if (res.reason === "gone" || res.reason === "none") setDoc(null);
      else lastReadAt = Date.now();   // 연결 문제면 다음 차례에 다시
    } finally { reading = false; }
  }
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      renderButton();
      if (!OB.getGroup()) { if (doc) setDoc(null); }
      else if (!document.hidden && isIdle()) await refresh();
      else if (!document.hidden && isPlaying()) await refresh(false, PLAY_MS);
      schedule();
    }, TICK_MS);
  }
  document.addEventListener("visibilitychange", () => { if (!document.hidden && isIdle()) refresh(); });

  renderButton();
  if (OB.getGroup()) refresh(true);
  schedule();

  return {
    // 게임이 끝나 올리기 결과에 그룹 문서가 왔을 때(읽기 없이 바로 반영)
    setDoc(next) { if (next) setDoc(next); else if (!OB.getGroup()) setDoc(null); },
    // 시작 화면으로 돌아왔을 때 등: 너무 자주가 아니면 새로 읽는다
    refresh,
    getDoc: () => doc,
    inGroup: () => !!OB.getGroup(),
    open,
  };
}
