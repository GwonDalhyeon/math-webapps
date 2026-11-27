// 온라인 기록판 보안 규칙 시험 (npm 설치 없이 Node만으로 실행)
// 1) cd firebase && firebase emulators:start --only firestore,auth
// 2) 다른 창에서 node firebase/test/rules-test.mjs
// 에뮬레이터의 REST API에 서명 없는 시험용 토큰을 보내 허용·거부를 확인한다.

const PROJECT = "math-webapps-board";
const HOST = "http://127.0.0.1:8080";
const DB = `projects/${PROJECT}/databases/(default)/documents`;
const BASE = `${HOST}/v1/${DB}`;

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
function tokenFor(uid) {
  const now = Math.floor(Date.now() / 1000);
  return `${b64({ alg: "none", typ: "JWT" })}.${b64({
    iss: `https://securetoken.google.com/${PROJECT}`, aud: PROJECT, sub: uid, user_id: uid,
    iat: now, exp: now + 3600, auth_time: now, firebase: { sign_in_provider: "anonymous", identities: {} },
  })}.`;
}
const headers = (uid) => ({ "Content-Type": "application/json", ...(uid === "owner" ? { Authorization: "Bearer owner" } : uid ? { Authorization: `Bearer ${tokenFor(uid)}` } : {}) });

function val(v) {
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (Number.isInteger(v)) return { integerValue: String(v) };
  if (typeof v === "number") return { doubleValue: v };
  if (typeof v === "string") return { stringValue: v };
  if (v && typeof v === "object") return { mapValue: { fields: fields(v) } };
  throw new Error("지원하지 않는 값 " + v);
}
const fields = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, val(v)]));

const DAY_MS = 86400000;
function kstDay(ms = Date.now()) {
  const d = new Date(ms + 9 * 3600000);
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
}
function keeper(uid, over = {}) {
  const r = { game: "keeper-reflex", board: "normal", nick: "골키퍼", score: 1234, level: 2, sec: 75, mode: "camera",
    day: kstDay(), uid, expireAt: new Date(Date.now() + 30 * DAY_MS), ...over };
  if (!("rank" in over)) r.rank = r.level * 10000000 + r.score;
  for (const k of Object.keys(over)) if (over[k] === undefined) delete r[k];
  return r;
}

// 다른 게임: 기본 칸 + 게임 칸 (rank는 over에 없으면 score)
function rec(game, board, vals, uid, over = {}) {
  const r = { game, board, nick: "참가", ...vals, day: kstDay(), uid, expireAt: new Date(Date.now() + 30 * DAY_MS), ...over };
  if (!("rank" in over)) r.rank = r.score;
  for (const k of Object.keys(over)) if (over[k] === undefined) delete r[k];
  return r;
}
const mosq = (uid, over = {}) => rec("mosquito-catch", "clap60", { score: 320, caught: 150 }, uid, over);
const hand = (uid, over = {}) => rec("hand-command", "normal", { score: 25, sec: 70 }, uid, over);
const egg = (uid, over = {}) => rec("egg-guardian", "normal", { score: 4200, stage: 3, sec: 90, mode: "camera" }, uid, over);

let seq = 0;
// 기록 1건과 limits/{uid}를 한 번에 쓴다 (앱과 같은 방식)
async function submit(uid, data, { withLimit = true, limitUid = uid, sid = null, created = true } = {}) {
  const id = `t${Date.now()}${seq++}`;
  const writes = [{
    update: { name: `${DB}/scores/${id}`, fields: fields(data) },
    currentDocument: { exists: false },
    ...(created ? { updateTransforms: [{ fieldPath: "createdAt", setToServerValue: "REQUEST_TIME" }] } : {}),
  }];
  if (withLimit) writes.push({
    update: { name: `${DB}/limits/${limitUid}`, fields: fields({ sid: sid ?? id }) },
    updateTransforms: [{ fieldPath: "last", setToServerValue: "REQUEST_TIME" }],
  });
  const res = await fetch(`${BASE}:commit`, { method: "POST", headers: headers(uid), body: JSON.stringify({ writes }) });
  return { ok: res.ok, id };
}
async function list(uid, structuredQuery) {
  const res = await fetch(`${BASE}:runQuery`, { method: "POST", headers: headers(uid), body: JSON.stringify({ structuredQuery }) });
  return res.ok;
}
async function del(uid, id) {
  const res = await fetch(`${BASE}/scores/${id}`, { method: "DELETE", headers: headers(uid) });
  return res.ok;
}
async function adminSet(path, data) {
  const res = await fetch(`${BASE}/${path}`, { method: "PATCH", headers: headers("owner"), body: JSON.stringify({ fields: fields(data) }) });
  if (!res.ok) throw new Error("관리자 쓰기 실패 " + (await res.text()));
}

const results = [];
async function expect(name, want, p) {
  const got = await p;
  const okv = typeof got === "object" ? got.ok : got;
  results.push({ name, pass: okv === want });
  console.log(`${okv === want ? "통과" : "실패"}  ${want ? "허용" : "거부"}되어야 함: ${name}${okv === want ? "" : `  (실제: ${okv ? "허용" : "거부"})`}`);
  return got;
}
// 빈도 제한을 피하려고 시험마다 새 기기(uid)를 쓴다
let u = 0;
const fresh = () => `dev${Date.now()}_${u++}`;

async function main() {
  for (let i = 0; i < 30; i++) {
    try { await fetch(HOST); break; } catch { await new Promise((r) => setTimeout(r, 1000)); }
  }
  await fetch(`${HOST}/emulator/v1/${DB}`, { method: "DELETE" });

  const a = fresh();
  const first = await expect("정상 기록", true, submit(a, keeper(a)));
  await expect("같은 기기 10초 안에 또 올리기", false, submit(a, keeper(a)));
  const b = fresh();
  await adminSet(`limits/${b}`, { sid: "old", last: new Date(Date.now() - 11000) });
  await expect("같은 기기 11초 뒤에 올리기", true, submit(b, keeper(b)));
  let x;
  await expect("터치·쉬움 기록", true, submit((x = fresh()), keeper(x, { board: "easy", mode: "touch" })));
  await expect("로그인 없이 올리기", false, submit(null, keeper("nobody")));
  await expect("다른 기기 uid로 위장", false, submit(fresh(), keeper("someone-else")));
  await expect("limits 없이 기록만", false, submit((x = fresh()), keeper(x), { withLimit: false }));
  await expect("서버 시각 대신 기기 시각", false, submit((x = fresh()), keeper(x, { createdAt: new Date() }), { created: false }));
  await expect("별명 13자", false, submit((x = fresh()), keeper(x, { nick: "가나다라마바사아자차카타파" })));
  await expect("별명 빈칸", false, submit((x = fresh()), keeper(x, { nick: "" })));
  await expect("별명 앞뒤 공백", false, submit((x = fresh()), keeper(x, { nick: " 골키퍼" })));
  await expect("별명에 < 포함", false, submit((x = fresh()), keeper(x, { nick: "<b>나</b>" })));
  await expect("rank 조작", false, submit((x = fresh()), keeper(x, { rank: 999999999 })));
  await expect("레벨 3인데 100초", false, submit((x = fresh()), keeper(x, { level: 3, sec: 100, score: 100 })));
  await expect("레벨 3이고 125초", true, submit((x = fresh()), keeper(x, { level: 3, sec: 125, score: 5000 })));
  await expect("점수가 시간에 비해 너무 큼", false, submit((x = fresh()), keeper(x, { score: 90000 })));
  await expect("음수 점수", false, submit((x = fresh()), keeper(x, { score: -1 })));
  await expect("점수가 소수", false, submit((x = fresh()), keeper(x, { score: 12.5, rank: 20000012 })));
  await expect("없는 난이도", false, submit((x = fresh()), keeper(x, { board: "insane" })));
  await expect("없는 게임", false, submit((x = fresh()), keeper(x, { game: "other-game" })));
  await expect("허용하지 않은 칸 추가", false, submit((x = fresh()), keeper(x, { realName: "홍길동" })));
  await expect("필수 칸 빠짐", false, submit((x = fresh()), keeper(x, { mode: undefined })));
  await expect("날짜가 사흘 전", false, submit((x = fresh()), keeper(x, { day: kstDay(Date.now() - 3 * DAY_MS) })));
  await expect("날짜가 어제(시계 오차)", true, submit((x = fresh()), keeper(x, { day: kstDay(Date.now() - DAY_MS) })));
  await expect("보관 기한 60일", false, submit((x = fresh()), keeper(x, { expireAt: new Date(Date.now() + 60 * DAY_MS) })));
  const c = fresh();
  await expect("limits만 따로 쓰기", false, (async () => {
    const res = await fetch(`${BASE}:commit`, { method: "POST", headers: headers(c), body: JSON.stringify({ writes: [{
      update: { name: `${DB}/limits/${c}`, fields: fields({ sid: "ghost" }) },
      updateTransforms: [{ fieldPath: "last", setToServerValue: "REQUEST_TIME" }] }] }) });
    return res.ok;
  })());

  const q = (limit, extra = {}) => ({ from: [{ collectionId: "scores" }],
    where: { compositeFilter: { op: "AND", filters: [
      { fieldFilter: { field: { fieldPath: "game" }, op: "EQUAL", value: val("keeper-reflex") } },
      { fieldFilter: { field: { fieldPath: "board" }, op: "EQUAL", value: val("normal") } }] } },
    orderBy: [{ field: { fieldPath: "rank" }, direction: "DESCENDING" }], ...(limit ? { limit } : {}), ...extra });
  await expect("로그인 없이 50건 읽기", true, list(null, q(50)));
  await expect("개수 제한 없이 읽기(개수 세기용)", true, list(null, q(0)));
  await expect("한 건만 직접 열기(get)", false, fetch(`${BASE}/scores/${first.id}`).then((r) => r.ok));

  await expect("남의 기록 지우기", false, del(fresh(), first.id));
  await expect("로그인 없이 지우기", false, del(null, first.id));
  await expect("내 기록 지우기", true, del(a, first.id));
  await adminSet("scores/expired1", { ...keeper("ghost"), createdAt: new Date(Date.now() - 40 * DAY_MS), expireAt: new Date(Date.now() - 10 * DAY_MS) });
  await expect("기한 지난 남의 기록 정리", true, del(fresh(), "expired1"));

  await otherGameTests();
  await groupTests();

  const fail = results.filter((r) => !r.pass).length;
  console.log(`\n${results.length}건 중 ${results.length - fail}건 통과${fail ? `, ${fail}건 실패` : ""}`);
  process.exit(fail ? 1 : 0);
}
// ---------------------------------------------------------------------------
// 박수로 모기잡기 · 손 명령 · 달걀 지킴이
// ---------------------------------------------------------------------------
async function otherGameTests() {
  let x;
  console.log("\n-- 박수로 모기잡기 --");
  await expect("모기 정상 기록(박수 60초)", true, submit((x = fresh()), mosq(x)));
  await expect("모기 터치 30초", true, submit((x = fresh()), mosq(x, { board: "touch30", score: 600, caught: 280 })));
  await expect("모기 30초에 1300점", false, submit((x = fresh()), mosq(x, { board: "clap30", score: 1300, caught: 500 })));
  await expect("모기 60초 상한 2400점", true, submit((x = fresh()), mosq(x, { score: 2400, caught: 900 })));
  await expect("모기 60초 2401점", false, submit((x = fresh()), mosq(x, { score: 2401, caught: 900 })));
  await expect("모기 잡은 수가 점수보다 많음", false, submit((x = fresh()), mosq(x, { score: 100, caught: 101 })));
  await expect("모기 rank 조작", false, submit((x = fresh()), mosq(x, { rank: 5000 })));
  await expect("모기 없는 board(clap90)", false, submit((x = fresh()), mosq(x, { board: "clap90" })));
  await expect("모기 칸 추가(mode)", false, submit((x = fresh()), mosq(x, { mode: "clap" })));
  await expect("모기 칸 빠짐(caught)", false, submit((x = fresh()), mosq(x, { caught: undefined })));
  await expect("모기 게임에 골키퍼 칸", false, submit((x = fresh()), keeper(x, { game: "mosquito-catch", board: "clap60" })));

  console.log("\n-- 손 명령 --");
  await expect("손 명령 정상 기록", true, submit((x = fresh()), hand(x)));
  await expect("손 명령 0회 기록", true, submit((x = fresh()), hand(x, { score: 0, sec: 5 })));
  await expect("손 명령 경기 시간에 비해 너무 많음", false, submit((x = fresh()), hand(x, { score: 60, sec: 40 })));
  await expect("손 명령 rank 조작", false, submit((x = fresh()), hand(x, { rank: 99 })));
  await expect("손 명령 없는 난이도", false, submit((x = fresh()), hand(x, { board: "manual" })));
  await expect("손 명령 칸 추가(mode)", false, submit((x = fresh()), hand(x, { mode: "camera" })));
  await expect("손 명령 칸 빠짐(sec)", false, submit((x = fresh()), hand(x, { sec: undefined })));

  console.log("\n-- 달걀 지킴이 --");
  await expect("달걀 정상 기록", true, submit((x = fresh()), egg(x)));
  await expect("달걀 키보드·쉬움", true, submit((x = fresh()), egg(x, { board: "easy", mode: "keyboard" })));
  await expect("달걀 3단계인데 60초", false, submit((x = fresh()), egg(x, { stage: 3, sec: 60 })));
  await expect("달걀 점수가 시간에 비해 너무 큼", false, submit((x = fresh()), egg(x, { score: 40000 })));
  await expect("달걀 rank 조작", false, submit((x = fresh()), egg(x, { rank: 1 })));
  await expect("달걀 둘이 모드 값", false, submit((x = fresh()), egg(x, { mode: "duo" })));
  await expect("달걀 칸 빠짐(stage)", false, submit((x = fresh()), egg(x, { stage: undefined })));
  await expect("달걀 칸 추가(players)", false, submit((x = fresh()), egg(x, { players: 1 })));
}

// ---------------------------------------------------------------------------
// 그룹
// ---------------------------------------------------------------------------
const fp = (...parts) => parts.map((p) => (/^[A-Za-z_][A-Za-z_0-9]*$/.test(p) ? p : "`" + p + "`")).join(".");
async function commit(uid, writes) {
  const res = await fetch(`${BASE}:commit`, { method: "POST", headers: headers(uid), body: JSON.stringify({ writes }) });
  return res.ok;
}
// 그룹 만들기: groups/{code} + glimits/{uid}
function createWrites(uid, code, { nick = "만든이", withLimit = true, limitCode = code } = {}) {
  const w = [{
    update: { name: `${DB}/groups/${code}`, fields: fields({ m: { [uid]: { n: nick, g: {} } } }) },
    updateTransforms: [
      { fieldPath: "createdAt", setToServerValue: "REQUEST_TIME" },
      { fieldPath: fp("m", uid, "at"), setToServerValue: "REQUEST_TIME" }],
  }];
  if (withLimit) w.push({
    update: { name: `${DB}/glimits/${uid}`, fields: fields({ code: limitCode }) },
    updateTransforms: [{ fieldPath: "last", setToServerValue: "REQUEST_TIME" }],
  });
  return w;
}
// 자기 칸 쓰기 (g의 한 게임 키를 함께 바꿀 수 있다)
function memberWrite(code, uid, entry, { gameKey = null, serverT = true, asUid = uid } = {}) {
  const transforms = [{ fieldPath: fp("m", uid, "at"), setToServerValue: "REQUEST_TIME" }];
  if (gameKey && serverT) transforms.push({ fieldPath: fp("m", uid, "g", gameKey, "t"), setToServerValue: "REQUEST_TIME" });
  return {
    update: { name: `${DB}/groups/${code}`, fields: fields({ m: { [uid]: entry } }) },
    updateMask: { fieldPaths: [fp("m", uid)] },
    currentDocument: { exists: true },
    ...(transforms.length ? { updateTransforms: transforms } : {}),
  };
}
const kRec = (over = {}) => { const r = { level: 2, score: 1500, sec: 80, mode: "camera", plays: 1, ...over }; if (!("rank" in over)) r.rank = r.level * 10000000 + r.score; return r; };
const code6 = () => String(100000 + Math.floor(Math.random() * 900000));

async function groupTests() {
  console.log("\n-- 그룹 --");
  const owner = fresh(), A = code6();
  await expect("그룹 만들기", true, commit(owner, createWrites(owner, A)));
  await expect("같은 기기 1분 안에 또 만들기", false, commit(owner, createWrites(owner, code6())));
  let x;
  await expect("5자리 코드", false, commit((x = fresh()), createWrites(x, "12345")));
  await expect("숫자 아닌 코드", false, commit((x = fresh()), createWrites(x, "abcdef")));
  await expect("glimits 없이 만들기", false, commit((x = fresh()), createWrites(x, code6(), { withLimit: false })));
  await expect("진행 중인 그룹 코드를 덮어쓰기", false, commit((x = fresh()), createWrites(x, A)));
  const E = code6();
  await adminSet(`groups/${E}`, { createdAt: new Date(Date.now() - 2 * 3600000), m: { ghost: { n: "옛사람", at: new Date(Date.now() - 2 * 3600000), g: {} } } });
  await expect("끝난 그룹 코드로 새로 만들기", true, commit((x = fresh()), createWrites(x, E)));

  const u2 = fresh();
  await expect("코드로 들어오기", true, commit(u2, [memberWrite(A, u2, { n: "민수", g: {} })]));
  await expect("3초 안에 내 칸 다시 쓰기", false, commit(u2, [memberWrite(A, u2, { n: "민수2", g: {} })]));
  await expect("남의 칸 고치기", false, commit(fresh(), [memberWrite(A, u2, { n: "해킹", g: {} }, { asUid: "x" })]));
  await expect("별명에 < 포함해 들어오기", false, commit((x = fresh()), [memberWrite(A, x, { n: "<나>", g: {} })]));
  await expect("그룹 시각 바꾸기", false, commit(u2, [{
    update: { name: `${DB}/groups/${A}`, fields: fields({ createdAt: new Date() }) }, updateMask: { fieldPaths: ["createdAt"] } }]));
  await expect("없는 그룹에 들어오기", false, commit((x = fresh()), [memberWrite("000001", x, { n: "길잃음", g: {} })]));

  // 기록 쓰기 시험용: 10초 전에 들어온 사람들이 있는 그룹
  const P = code6(), old = new Date(Date.now() - 10000);
  const p1 = fresh(), p2 = fresh(), p3 = fresh(), p4 = fresh(), p5 = fresh(), p6 = fresh(), p7 = fresh();
  const seeded = {};
  for (const p of [p1, p2, p3, p4, p5, p6, p7]) seeded[p] = { n: "참가" + p.slice(-2), at: old, g: {} };
  await adminSet(`groups/${P}`, { createdAt: new Date(Date.now() - 60000), m: seeded });
  await expect("그룹에 기록 올리기", true, commit(p1, [memberWrite(P, p1, { n: "참가", g: { "keeper-reflex~normal": kRec() } }, { gameKey: "keeper-reflex~normal" })]));
  await expect("그룹 기록 rank 조작", false, commit(p2, [memberWrite(P, p2, { n: "참가", g: { "keeper-reflex~normal": kRec({ rank: 99 }) } }, { gameKey: "keeper-reflex~normal" })]));
  await expect("두 게임 키를 한 번에", false, commit(p3, [memberWrite(P, p3, { n: "참가", g: { "keeper-reflex~normal": kRec(), "keeper-reflex~easy": kRec() } }, { gameKey: "keeper-reflex~normal" })]));
  await expect("기록 시각을 기기 시각으로", false, commit(p4, [memberWrite(P, p4, { n: "참가", g: { "keeper-reflex~normal": { ...kRec(), t: new Date() } } }, { gameKey: "keeper-reflex~normal", serverT: false })]));
  await expect("판 수 0", false, commit(p5, [memberWrite(P, p5, { n: "참가", g: { "keeper-reflex~normal": kRec({ plays: 0 }) } }, { gameKey: "keeper-reflex~normal" })]));
  await expect("없는 게임 키", false, commit(p6, [memberWrite(P, p6, { n: "참가", g: { "other~normal": kRec() } }, { gameKey: "other~normal" })]));
  await expect("그룹에서 나가기(내 칸 지우기)", true, commit(p7, [{
    update: { name: `${DB}/groups/${P}`, fields: {} }, updateMask: { fieldPaths: [fp("m", p7)] }, currentDocument: { exists: true } }]));

  // 공개 기록 + 그룹 기록을 한 번에
  const sid = `t${Date.now()}both`;
  await expect("공개 기록과 그룹 기록을 한 번에", true, commit(p2, [
    { update: { name: `${DB}/scores/${sid}`, fields: fields(keeper(p2)) }, currentDocument: { exists: false },
      updateTransforms: [{ fieldPath: "createdAt", setToServerValue: "REQUEST_TIME" }] },
    { update: { name: `${DB}/limits/${p2}`, fields: fields({ sid }) }, updateTransforms: [{ fieldPath: "last", setToServerValue: "REQUEST_TIME" }] },
    memberWrite(P, p2, { n: "참가", g: { "keeper-reflex~normal": kRec() } }, { gameKey: "keeper-reflex~normal" }),
  ]));

  // 다른 게임의 그룹 기록 (같은 사람이 게임마다 한 칸씩, 3초 간격 규칙 때문에 사람을 바꾼다)
  const G = code6(), q1 = fresh(), q2 = fresh(), q3 = fresh(), q4 = fresh(), q5 = fresh(), q6 = fresh();
  const seeded2 = {};
  for (const p of [q1, q2, q3, q4, q5, q6]) seeded2[p] = { n: "참가" + p.slice(-2), at: old, g: {} };
  await adminSet(`groups/${G}`, { createdAt: new Date(Date.now() - 60000), m: seeded2 });
  const gw = (p, key, r, ok, name) => expect(name, ok, commit(p, [memberWrite(G, p, { n: "참가", g: { [key]: r } }, { gameKey: key })]));
  await gw(q1, "mosquito-catch~touch30", { rank: 500, score: 500, caught: 240, plays: 1 }, true, "그룹 모기 기록");
  await gw(q2, "mosquito-catch~clap30", { rank: 1300, score: 1300, caught: 400, plays: 1 }, false, "그룹 모기 30초 상한 넘김");
  await gw(q3, "hand-command~hard", { rank: 18, score: 18, sec: 50, plays: 2 }, true, "그룹 손 명령 기록");
  await gw(q4, "hand-command~hard", { rank: 18, score: 18, sec: 50, level: 1, plays: 2 }, false, "그룹 손 명령 칸 추가");
  await gw(q5, "egg-guardian~easy", { rank: 3000, score: 3000, stage: 2, sec: 50, mode: "keyboard", plays: 1 }, true, "그룹 달걀 기록");
  await gw(q6, "egg-guardian~easy", { rank: 3000, score: 3000, stage: 2, sec: 50, plays: 1 }, false, "그룹 달걀 칸 빠짐(mode)");

  const X = code6();
  await adminSet(`groups/${X}`, { createdAt: new Date(Date.now() - 2 * 3600000), m: { [p3]: { n: "늦음", at: old, g: {} } } });
  await expect("끝난 그룹에 기록 올리기", false, commit(p3, [memberWrite(X, p3, { n: "늦음", g: { "keeper-reflex~normal": kRec() } }, { gameKey: "keeper-reflex~normal" })]));

  await expect("로그인 없이 그룹 열기(get)", true, fetch(`${BASE}/groups/${A}`).then((r) => r.ok));
  const gq = (op, when) => ({ from: [{ collectionId: "groups" }],
    where: { fieldFilter: { field: { fieldPath: "createdAt" }, op, value: val(when) } }, limit: 10 });
  await expect("진행 중인 그룹 목록 보기", false, list(fresh(), gq("GREATER_THAN", new Date(0))));
  await expect("끝난 그룹 목록 보기(정리용)", true, list(fresh(), gq("LESS_THAN", new Date(Date.now() - 70 * 60000))));
  await expect("진행 중인 그룹 지우기", false, fetch(`${BASE}/groups/${A}`, { method: "DELETE", headers: headers(fresh()) }).then((r) => r.ok));
  await expect("끝난 그룹 지우기", true, fetch(`${BASE}/groups/${X}`, { method: "DELETE", headers: headers(fresh()) }).then((r) => r.ok));
}

main().catch((e) => { console.error(e); process.exit(1); });
