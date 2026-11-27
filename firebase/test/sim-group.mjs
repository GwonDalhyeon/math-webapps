// 시험용: 에뮬레이터의 그룹에 가상의 참가자를 넣고 기록을 올린다 (운영 서버에는 쓰지 않는다)
// 1) cd firebase && firebase emulators:start --only firestore,auth
// 2) 브라우저에서 ?emu=1 로 게임을 열고 그룹을 만든 뒤 코드를 확인
// 3) node firebase/test/sim-group.mjs <6자리 코드> [게임~난이도] [기록 JSON]
//    기록 JSON을 생략하면 슈퍼 세이브! 형식(레벨·점수)의 예시 5명 + 기록 없는 1명을 넣는다.
//    다른 게임은 규칙(groupKeyOk)에 맞는 칸으로 직접 넘긴다. 예:
//    node firebase/test/sim-group.mjs 123456 mosquito-catch~clap60 "[{\"n\":\"민수\",\"rec\":{\"rank\":120,\"score\":120,\"caught\":55}}]"
//    (rank·plays·t 외의 칸은 그 게임 규칙이 요구하는 이름 그대로)
const [code, key = "keeper-reflex~normal", json] = process.argv.slice(2);
if (!/^\d{6}$/.test(code || "")) { console.error("사용: node firebase/test/sim-group.mjs <6자리 코드> [게임~난이도] [기록 JSON]"); process.exit(1); }

const PROJECT = "math-webapps-board", DB = `projects/${PROJECT}/databases/(default)/documents`;
const BASE = `http://127.0.0.1:8080/v1/${DB}`;
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const tok = (uid) => { const n = Math.floor(Date.now() / 1000); return `${b64({ alg: "none" })}.${b64({ iss: `https://securetoken.google.com/${PROJECT}`, aud: PROJECT, sub: uid, user_id: uid, iat: n, exp: n + 3600, auth_time: n, firebase: { sign_in_provider: "anonymous" } })}.`; };
const val = (v) => Number.isInteger(v) ? { integerValue: String(v) } : typeof v === "number" ? { doubleValue: v } : typeof v === "string" ? { stringValue: v } : { mapValue: { fields: f(v) } };
const f = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, val(v)]));
const fp = (...p) => p.map((x) => /^[A-Za-z_][A-Za-z_0-9]*$/.test(x) ? x : "`" + x + "`").join(".");

async function write(uid, entry, gameKey) {
  const tr = [{ fieldPath: fp("m", uid, "at"), setToServerValue: "REQUEST_TIME" }];
  if (gameKey) tr.push({ fieldPath: fp("m", uid, "g", gameKey, "t"), setToServerValue: "REQUEST_TIME" });
  const r = await fetch(`${BASE}:commit`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok(uid)}` },
    body: JSON.stringify({ writes: [{ update: { name: `${DB}/groups/${code}`, fields: f({ m: { [uid]: entry } }) }, updateMask: { fieldPaths: [fp("m", uid)] }, updateTransforms: tr }] }) });
  if (!r.ok) console.error(uid, (await r.text()).slice(0, 200));
  return r.ok;
}

const keeper = (l, s, i) => ({ rank: l * 10000000 + s, score: s, level: l, sec: (l - 1) * 60 + 20, mode: i === 3 ? "touch" : "camera" });
const people = json ? JSON.parse(json) : [
  { n: "민수", rec: keeper(3, 5200, 0) }, { n: "지우", rec: keeper(2, 2100, 1) }, { n: "하린", rec: keeper(4, 7700, 2) },
  { n: "도윤", rec: keeper(1, 900, 3) }, { n: "서연", rec: keeper(2, 1800, 4) }, { n: "구경꾼" },
];

const out = [];
for (const [i, p] of people.entries()) out.push(await write(`sim${i}`, { n: p.n, g: {} }));   // 들어오기
await new Promise((r) => setTimeout(r, 3500));   // 규칙: 같은 칸은 3초 뒤에 다시 쓸 수 있다
for (const [i, p] of people.entries()) {
  if (!p.rec) continue;
  out.push(await write(`sim${i}`, { n: p.n, g: { [key]: { ...p.rec, plays: p.plays || 1 + (i % 3) } } }, key));
}
console.log(`${out.filter(Boolean).length}/${out.length} 성공 (그룹 ${code}, ${key})`);
process.exit(out.every(Boolean) ? 0 : 1);
