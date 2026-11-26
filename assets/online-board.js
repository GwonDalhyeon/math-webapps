// ===========================================================================
// 아이스브레이킹 온라인 기록판 (여러 게임 공용)
// - Firebase 익명 로그인 + Firestore Lite. 서버 코드는 없고 규칙은 firebase/firestore.rules에 있다.
// - 별명·점수·날짜만 저장하고 30일 뒤 지운다. 카메라 영상이나 실명은 다루지 않는다.
// - Firebase SDK는 필요한 순간에 CDN(gstatic)에서 받는다. 인터넷이 없거나 막혀도 게임은 그대로 돌아가고,
//   모든 함수는 실패하면 예외 대신 { ok: false } 또는 빈 목록을 돌려준다.
// - 그룹: 6자리 코드를 아는 사람끼리 1시간 동안 기록을 함께 본다. 그룹 하나가 문서 하나라 순위를 볼 때 읽기 1번이다.
//   그룹 버튼·대화상자 화면은 online-group.js에 있다.
// - 시험할 때는 localhost에서 주소 끝에 ?emu=1 을 붙이면 로컬 에뮬레이터(firebase/)에 연결한다.
// ===========================================================================
import CONFIG from "./firebase-config.js";

const SDK = "https://www.gstatic.com/firebasejs/13.4.0";
const TIMEOUT_MS = 8000;
const KEEP_DAYS = 30;              // 규칙의 보관 기한과 같아야 한다
const MIN_GAP_MS = 11000;          // 규칙은 10초. 시계 오차를 생각해 조금 길게 기다린다
const OPT_KEY = "online-board-opt-v1";
const LAST_KEY = "online-board-last-v1";
const GROUP_KEY = "online-group-v1";
const DAY_MS = 86400000;
const GROUP_MS = 3600000;          // 그룹은 만든 때부터 1시간 (규칙과 같아야 한다)
const GROUP_MAX = 60;              // 규칙과 같아야 한다
const BOARD_READ = 15;             // 공개 기록판은 한 번에 15건만 읽는다
const BOARD_CACHE_MS = 120000;     // 같은 기록판은 2분 동안 다시 읽지 않는다
export const GROUP_MINUTES = GROUP_MS / 60000;

export const KEEP_DAYS_TEXT = `${KEEP_DAYS}일`;

// 별명에 쓰면 온라인에 올리지 않는 말 (화면 표시는 이 기기 기록판에만 남는다)
const BLOCKED = ["시발", "씨발", "ㅅㅂ", "ㅆㅂ", "병신", "ㅂㅅ", "븅신", "좆", "존나", "ㅈㄴ", "개새", "새끼", "지랄", "ㅈㄹ", "미친", "엠창", "느금", "니애미", "fuck", "shit", "bitch", "sex", "섹스"];

// ---------------------------------------------------------------------------
// 설정 (기기마다 저장. 기본은 켜짐)
// ---------------------------------------------------------------------------
export function getOptIn() {
  try { return localStorage.getItem(OPT_KEY) !== "off"; } catch { return true; }
}
export function setOptIn(on) {
  try { localStorage.setItem(OPT_KEY, on ? "on" : "off"); } catch { /* 저장 불가여도 이번 실행에는 적용된다 */ }
}

// 올릴 수 없는 별명이면 그 이유, 괜찮으면 null
export function nickProblem(nick) {
  const n = String(nick || "").trim();
  if (!n) return "별명이 없어서";
  if (n.length > 12) return "별명이 12자를 넘어서";
  if (/[<>]/.test(n)) return "별명에 < > 기호가 있어서";
  const plain = n.toLowerCase().replace(/[\s._\-~!@#$%^&*0-9]/g, "");
  if (BLOCKED.some((w) => plain.includes(w))) return "별명에 쓰면 안 되는 말이 있어서";
  return null;
}

// 서울 시각 날짜를 20261126 같은 정수로 (규칙의 kstDay와 같은 계산)
export function kstDay(ms = Date.now()) {
  const d = new Date(ms + 9 * 3600000);
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
}

// ---------------------------------------------------------------------------
// Firebase 연결 (처음 한 번만)
// ---------------------------------------------------------------------------
let readyPromise = null;
function withTimeout(promise, ms = TIMEOUT_MS) {
  return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))]);
}
function useEmulator() {
  return new URLSearchParams(location.search).get("emu") === "1" && /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
}
async function connect() {
  const [appMod, authMod, fs] = await Promise.all([
    import(`${SDK}/firebase-app.js`),
    import(`${SDK}/firebase-auth.js`),
    import(`${SDK}/firebase-firestore-lite.js`),
  ]);
  const emu = useEmulator();
  // 에뮬레이터는 앱 이름을 달리 해서, 시험용 로그인이 운영 기록판 로그인과 섞이지 않게 한다
  const app = appMod.initializeApp(CONFIG, emu ? "online-board-emu" : "online-board");
  const auth = authMod.getAuth(app);
  const db = fs.getFirestore(app);
  if (emu) {
    authMod.connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    fs.connectFirestoreEmulator(db, "127.0.0.1", 8080);
  }
  await auth.authStateReady();
  // 예전 시험에서 남은 서명 없는(에뮬레이터) 로그인이면 지우고 새로 로그인한다
  if (!emu && auth.currentUser) {
    try {
      const head = JSON.parse(atob((await auth.currentUser.getIdToken()).split(".")[0].replace(/-/g, "+").replace(/_/g, "/")));
      if (head.alg === "none") await authMod.signOut(auth);
    } catch { await authMod.signOut(auth); }
  }
  if (!auth.currentUser) await authMod.signInAnonymously(auth);
  return { auth, db, fs, uid: auth.currentUser.uid };
}
function ready() {
  if (!readyPromise) {
    readyPromise = withTimeout(connect()).catch((e) => { readyPromise = null; throw e; });
  }
  return readyPromise;
}
function reasonOf(e) {
  const code = e?.code || e?.message || "";
  if (!navigator.onLine || code === "timeout" || /unavailable|network|Failed to fetch|import/i.test(code)) return "offline";
  if (/permission-denied/.test(code)) return "rejected";
  return "error";
}


// ---------------------------------------------------------------------------
// 그룹 상태 (이 기기에 기억해서 다른 게임으로 옮겨도 이어진다)
// ---------------------------------------------------------------------------
// { code, createdAt(ms), nick }
export function getGroup() {
  let g = null;
  try { g = JSON.parse(localStorage.getItem(GROUP_KEY) || "null"); } catch { g = null; }
  if (!g || !/^\d{6}$/.test(g.code) || !g.createdAt) return null;
  if (Date.now() > g.createdAt + GROUP_MS) { clearGroup(); return null; }
  return { ...g, expiresAt: g.createdAt + GROUP_MS };
}
function saveGroup(g) {
  try { localStorage.setItem(GROUP_KEY, JSON.stringify({ code: g.code, createdAt: g.createdAt, nick: g.nick })); } catch { /* 무시 */ }
}
function clearGroup() {
  try { localStorage.removeItem(GROUP_KEY); } catch { /* 무시 */ }
}

// 그룹 문서를 화면에서 쓰기 좋게: { code, createdAt, expiresAt, myUid, members: [{ uid, n, at, g: { 키: { ...기록, t } } }] }
const ms = (t) => (t && typeof t.toMillis === "function" ? t.toMillis() : Date.now());
function parseGroup(code, data, myUid) {
  const createdAt = ms(data.createdAt);
  const members = Object.entries(data.m || {}).map(([uid, e]) => {
    const g = {};
    for (const [k, v] of Object.entries(e.g || {})) g[k] = { ...v, t: ms(v.t) };
    return { uid, n: e.n, at: ms(e.at), g };
  });
  return { code, createdAt, expiresAt: createdAt + GROUP_MS, myUid, members };
}

// 같은 게임·난이도의 그룹 순위: 기록이 있는 사람만, rank 큰 순
export function groupRanking(doc, game, board) {
  const key = `${game}~${board}`;
  return doc.members.filter((m) => m.g[key]).map((m) => ({ uid: m.uid, nick: m.n, mine: m.uid === doc.myUid, ...m.g[key] }))
    .sort((a, b) => b.rank - a.rank || a.t - b.t);
}

function newCode() {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return String(100000 + (a[0] % 900000));
}

// 새 그룹 → { ok, doc } | { ok: false, reason: "nick" | "rate" | "offline" | "rejected" | "error", problem }
export async function createGroup(nick) {
  const problem = nickProblem(nick);
  if (problem) return { ok: false, reason: "nick", problem };
  try {
    const { db, fs, uid } = await ready();
    for (let attempt = 0; attempt < 4; attempt++) {
      const code = newCode();
      const ref = fs.doc(db, "groups", code);
      const made = await withTimeout(fs.runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);
        if (snap.exists() && Date.now() < ms(snap.data().createdAt) + GROUP_MS) return false;   // 쓰는 중인 코드
        tx.set(ref, { createdAt: fs.serverTimestamp(), m: { [uid]: { n: nick.trim(), at: fs.serverTimestamp(), g: {} } } });
        tx.set(fs.doc(db, "glimits", uid), { code, last: fs.serverTimestamp() });
        return true;
      }));
      if (!made) continue;
      const doc = { code, createdAt: Date.now(), expiresAt: Date.now() + GROUP_MS, myUid: uid,
        members: [{ uid, n: nick.trim(), at: Date.now(), g: {} }] };
      saveGroup({ code, createdAt: doc.createdAt, nick: nick.trim() });
      // 실제 시작 시각(서버)으로 한 번 맞춘다
      readGroup().catch(() => {});
      cleanUpGroups(db, fs);
      return { ok: true, doc };
    }
    return { ok: false, reason: "error" };
  } catch (e) {
    const reason = reasonOf(e);
    return { ok: false, reason: reason === "rejected" ? "rate" : reason };
  }
}

// 코드로 들어가기 → { ok, doc } | { ok: false, reason: "nick" | "notfound" | "expired" | "full" | "offline" | "rejected" | "error" }
export async function joinGroup(code, nick) {
  code = String(code || "").replace(/\D/g, "");
  if (!/^\d{6}$/.test(code)) return { ok: false, reason: "notfound" };
  const problem = nickProblem(nick);
  if (problem) return { ok: false, reason: "nick", problem };
  try {
    const { db, fs, uid } = await ready();
    const ref = fs.doc(db, "groups", code);
    const result = await withTimeout(fs.runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) return { reason: "notfound" };
      const data = snap.data();
      if (Date.now() > ms(data.createdAt) + GROUP_MS) return { reason: "expired" };
      const m = data.m || {};
      if (!m[uid] && Object.keys(m).length >= GROUP_MAX) return { reason: "full" };
      const entry = { n: nick.trim(), at: fs.serverTimestamp(), g: m[uid]?.g || {} };
      tx.update(ref, new fs.FieldPath("m", uid), entry);
      return { data: { ...data, m: { ...m, [uid]: { ...entry, at: null } } } };
    }));
    if (!result.data) return { ok: false, reason: result.reason };
    const doc = parseGroup(code, result.data, uid);
    saveGroup({ code, createdAt: doc.createdAt, nick: nick.trim() });
    return { ok: true, doc };
  } catch (e) {
    return { ok: false, reason: reasonOf(e) };
  }
}

// 나가기: 이 기기에서 그룹을 잊고, 그룹 문서의 내 칸도 지운다(실패해도 괜찮다)
export async function leaveGroup() {
  const g = getGroup();
  clearGroup();
  if (!g) return;
  try {
    const { db, fs, uid } = await ready();
    await withTimeout(fs.updateDoc(fs.doc(db, "groups", g.code), new fs.FieldPath("m", uid), fs.deleteField()));
  } catch { /* 끝난 그룹이거나 연결이 없으면 그냥 둔다 */ }
}

// 그룹 문서 읽기(읽기 1번) → { ok, doc } | { ok: false, reason: "none" | "gone" | "offline" | "error" }
export async function readGroup() {
  const g = getGroup();
  if (!g) return { ok: false, reason: "none" };
  try {
    const { db, fs, uid } = await ready();
    const snap = await withTimeout(fs.getDoc(fs.doc(db, "groups", g.code)));
    if (!snap.exists()) { clearGroup(); return { ok: false, reason: "gone" }; }
    const doc = parseGroup(g.code, snap.data(), uid);
    // 같은 코드가 새 그룹으로 바뀌었거나 끝났으면 나간 것으로 본다
    if (Math.abs(doc.createdAt - g.createdAt) > 10 * 60000 || Date.now() > doc.expiresAt) { clearGroup(); return { ok: false, reason: "gone" }; }
    if (doc.createdAt !== g.createdAt) saveGroup({ ...g, createdAt: doc.createdAt });
    return { ok: true, doc };
  } catch (e) {
    return { ok: false, reason: reasonOf(e) };
  }
}

// ---------------------------------------------------------------------------
// 올리기 · 읽기 · 지우기
// ---------------------------------------------------------------------------
// record: { board, nick, rank(정수, 클수록 위), ...게임별 칸 }
// 공개 기록판(체크 상자가 켜졌을 때)과 들어가 있는 그룹에 한 번에 저장한다.
// → { ok, id, reason, problem, group: null | { ok, doc, reason } }
// reason(공개): "off"(사용자가 끔) | "nick"(별명 문제, problem에 이유) | "rate"(너무 자주) | "offline" | "rejected" | "error"
export async function submitScore(game, record) {
  const group = getGroup();
  const groupNick = (record.nick || "").trim() || group?.nick || "";
  let pub = null;
  if (!getOptIn()) pub = { ok: false, reason: "off" };
  else {
    const problem = nickProblem(record.nick);
    let last = 0;
    try { last = Number(localStorage.getItem(LAST_KEY)) || 0; } catch { /* 무시 */ }
    if (problem) pub = { ok: false, reason: "nick", problem };
    else if (Date.now() - last < MIN_GAP_MS) pub = { ok: false, reason: "rate" };
  }
  let grp = null;
  if (group && nickProblem(groupNick)) grp = { ok: false, reason: "nick" };
  const wantPub = !pub, wantGroup = !!group && !grp;
  if (!wantPub && !wantGroup) return { ...pub, group: grp };

  try {
    const res = await writeScore(game, record, { wantPub, wantGroup, group, groupNick });
    return { ...(pub || res.pub), group: grp || res.group };
  } catch (e) {
    // 둘을 함께 쓰다 거부되면 하나씩 다시 해 본다
    if (wantPub && wantGroup && reasonOf(e) === "rejected") {
      const a = await writeScore(game, record, { wantPub: true, wantGroup: false }).catch((er) => ({ pub: { ok: false, reason: reasonOf(er) } }));
      const b = await writeScore(game, record, { wantPub: false, wantGroup: true, group, groupNick }).catch((er) => ({ group: { ok: false, reason: reasonOf(er) } }));
      return { ...a.pub, group: b.group };
    }
    const reason = reasonOf(e);
    return { ...(pub || { ok: false, reason }), group: grp || (wantGroup ? { ok: false, reason } : null) };
  }
}

async function writeScore(game, record, { wantPub, wantGroup, group, groupNick }) {
  const { db, fs, uid } = await ready();
  const out = { pub: null, group: null };
  const scoreRef = fs.doc(fs.collection(db, "scores"));
  const groupRef = wantGroup ? fs.doc(db, "groups", group.code) : null;
  let groupData = null;
  await withTimeout(fs.runTransaction(db, async (tx) => {
    groupData = null;
    let snap = null;
    if (wantGroup) snap = await tx.get(groupRef);
    if (wantPub) {
      tx.set(scoreRef, {
        ...record, game, nick: record.nick.trim(), uid, day: kstDay(),
        createdAt: fs.serverTimestamp(),
        expireAt: fs.Timestamp.fromMillis(Date.now() + KEEP_DAYS * DAY_MS),
      });
      tx.set(fs.doc(db, "limits", uid), { sid: scoreRef.id, last: fs.serverTimestamp() });
    }
    if (wantGroup) {
      if (!snap.exists() || Date.now() > ms(snap.data().createdAt) + GROUP_MS) { groupData = "gone"; return; }
      const data = snap.data();
      const m = data.m || {};
      const prev = m[uid] || { g: {} };
      const key = `${game}~${record.board}`;
      const old = prev.g?.[key];
      const { board, nick, ...vals } = record;
      const best = old && old.rank >= record.rank
        ? { rank: old.rank, score: old.score, level: old.level, sec: old.sec, mode: old.mode }
        : { rank: vals.rank, score: vals.score, level: vals.level, sec: vals.sec, mode: vals.mode };
      const entry = { n: groupNick, at: fs.serverTimestamp(), g: { ...(prev.g || {}), [key]: { ...best, plays: (old?.plays || 0) + 1, t: fs.serverTimestamp() } } };
      tx.update(groupRef, new fs.FieldPath("m", uid), entry);
      // 화면에 바로 보일 그룹 상태 (서버 시각 칸은 지금 시각으로 채운다)
      const now = fs.Timestamp.now();
      groupData = { ...data, m: { ...m, [uid]: { ...entry, at: now, g: { ...entry.g, [key]: { ...entry.g[key], t: now } } } } };
    }
  }));
  if (wantPub) {
    try { localStorage.setItem(LAST_KEY, String(Date.now())); } catch { /* 무시 */ }
    out.pub = { ok: true, id: scoreRef.id };
    noteUpload(game, record.board, record.rank);
  }
  if (wantGroup) {
    if (groupData === "gone") { clearGroup(); out.group = { ok: false, reason: "gone" }; }
    else out.group = { ok: true, doc: parseGroup(group.code, groupData, uid) };
  }
  return out;
}

// 공개 기록판 목록은 2분 동안 기억해 두고 다시 읽지 않는다.
// 내가 방금 올린 판이 목록 안에 들어갈 만할 때만 다음에 새로 읽는다.
const boardCache = new Map();   // key → { at, rows, uid, minRank, full }
const cacheKey = (game, board, today) => `${game}|${board}|${today ? kstDay() : "all"}`;
function noteUpload(game, board, rank) {
  for (const today of [true, false]) {
    const key = cacheKey(game, board, today);
    const c = boardCache.get(key);
    if (c && (!c.full || rank > c.minRank)) boardCache.delete(key);
  }
}

// 기록판: 같은 기기·같은 별명은 가장 좋은 판 하나만. → { ok, rows: [{ id, nick, rank, mine, ...칸 }], uid }
export async function fetchBoard(game, board, { today = false, top = 10 } = {}) {
  const key = cacheKey(game, board, today);
  const c = boardCache.get(key);
  if (c && Date.now() - c.at < BOARD_CACHE_MS) return { ok: true, rows: c.rows, uid: c.uid, cached: true };
  try {
    const { db, fs, uid } = await ready();
    const conds = [fs.where("game", "==", game), fs.where("board", "==", board)];
    if (today) conds.push(fs.where("day", "==", kstDay()));
    const snap = await withTimeout(fs.getDocs(fs.query(fs.collection(db, "scores"), ...conds, fs.orderBy("rank", "desc"), fs.limit(BOARD_READ))));
    const now = Date.now(), seen = new Set(), rows = [];
    for (const d of snap.docs) {
      const r = d.data();
      if (r.expireAt && r.expireAt.toMillis() < now) continue;
      const k = `${r.uid}|${r.nick}`;
      if (seen.has(k)) continue;
      seen.add(k);
      rows.push({ ...r, id: d.id, mine: r.uid === uid });
      if (rows.length >= top) break;
    }
    const full = snap.size >= BOARD_READ || rows.length >= top;
    boardCache.set(key, { at: now, rows, uid, full, minRank: snap.size ? snap.docs[snap.size - 1].data().rank : 0 });
    maybeCleanUp(db, fs);
    return { ok: true, rows, uid };
  } catch (e) {
    return { ok: false, reason: reasonOf(e), rows: [] };
  }
}

// 내 판이 공개 기록 중 어디쯤인지(사람이 아니라 판 기준): 나보다 높은 판 수와 전체 판 수만 센다(읽기 2번 정도)
// → { ok, above, total, pct } (pct: 상위 몇 %, 1~100)
export async function rankRange(game, board, rank, { today = false, counted = true } = {}) {
  try {
    const { db, fs } = await ready();
    const conds = [fs.where("game", "==", game), fs.where("board", "==", board)];
    if (today) conds.push(fs.where("day", "==", kstDay()));
    const base = fs.collection(db, "scores");
    const [above, total] = await withTimeout(Promise.all([
      // 내림차순 정렬을 붙여야 기록판과 같은 색인(rank 내림차순)을 쓴다
      fs.getCount(fs.query(base, ...conds, fs.where("rank", ">", rank), fs.orderBy("rank", "desc"))),
      fs.getCount(fs.query(base, ...conds)),
    ]));
    const a = above.data().count, t = total.data().count + (counted ? 0 : 1);
    const pct = Math.min(100, Math.max(1, Math.ceil(((a + 1) / Math.max(1, t)) * 100)));
    return { ok: true, above: a, total: t, pct };
  } catch (e) {
    return { ok: false, reason: reasonOf(e) };
  }
}

// 이 기기에서 올린 이 게임 기록을 모두 지운다 → { ok, count }
export async function deleteMine(game) {
  try {
    const { db, fs, uid } = await ready();
    let count = 0;
    for (let round = 0; round < 10; round++) {
      const snap = await withTimeout(fs.getDocs(fs.query(fs.collection(db, "scores"), fs.where("uid", "==", uid), fs.where("game", "==", game), fs.limit(50))));
      if (snap.empty) break;
      await withTimeout(Promise.all(snap.docs.map((d) => fs.deleteDoc(d.ref))));
      count += snap.size;
      if (snap.size < 50) break;
    }
    for (const k of [...boardCache.keys()]) if (k.startsWith(`${game}|`)) boardCache.delete(k);
    return { ok: true, count };
  } catch (e) {
    return { ok: false, reason: reasonOf(e) };
  }
}

// 무료 요금제에는 자동 삭제(TTL)가 없어서, 기록판을 본 기기가 가끔 기한 지난 기록을 조금 지운다
let cleaned = false;
function maybeCleanUp(db, fs) {
  if (cleaned || Math.random() > 0.25) return;
  cleaned = true;
  fs.getDocs(fs.query(fs.collection(db, "scores"), fs.where("expireAt", "<", fs.Timestamp.now()), fs.limit(20)))
    .then((snap) => Promise.all(snap.docs.map((d) => fs.deleteDoc(d.ref))))
    .catch(() => { /* 정리는 실패해도 괜찮다 */ });
}
// 끝난 그룹(1시간 + 여유 10분)도 그룹을 만들 때 조금씩 지운다
function cleanUpGroups(db, fs) {
  fs.getDocs(fs.query(fs.collection(db, "groups"), fs.where("createdAt", "<", fs.Timestamp.fromMillis(Date.now() - GROUP_MS - 10 * 60000)), fs.limit(10)))
    .then((snap) => Promise.all(snap.docs.map((d) => fs.deleteDoc(d.ref))))
    .catch(() => { /* 정리는 실패해도 괜찮다 */ });
}
