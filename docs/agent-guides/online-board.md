# 온라인 기록판·그룹 연동 명세

아이스브레이킹 게임에 온라인 기록판과 1시간짜리 그룹(6자리 코드)을 붙일 때 읽는다. 슈퍼 세이브!(`icebreaking/keeper-reflex/`)가 첫 적용 사례이자 참고 구현이다. 게임 진행·소리 기준은 `icebreaking-webapp.md`, 카메라는 `camera-webapp.md`를 함께 따른다.

## 1. 원칙

- 이 프로젝트의 "서버·DB·로그인 금지"에 대한 **예외**다. 쓰는 것은 Firebase 프로젝트 `math-webapps-board`(무료 Spark 요금제, Firestore 서울 `asia-northeast3`, 익명 로그인)뿐이고 서버 코드(Cloud Functions)는 없다. 다른 종류의 앱에는 쓰지 않는다.
- **개인정보를 받지 않는다.** 저장하는 것은 별명(12자), 게임 기록, 서울 날짜, 익명 로그인 uid뿐이다. 실명·학번·카메라 영상은 받지 않고, 화면에 "실명·학번은 쓰지 마세요"를 늘 보인다.
- 공개 기록판 올리기는 시작 화면 체크 상자로 끌 수 있고 기본은 켜짐(`online-board-opt-v1`, 기기 전체 공통). 별명을 비우면 온라인에 올리지 않는다.
- 공개 기록은 30일, 그룹은 만든 때부터 1시간 동안만 쓴다.
- **인터넷이 없거나 학교망이 막아도 게임은 그대로 돌아가야 한다.** 모든 모듈 함수는 예외 대신 `{ ok: false, reason }`이나 빈 목록을 돌려준다. 기존 이 기기 기록(localStorage)은 그대로 둔다.
- **무료 읽기 한도(하루 5만 건)를 아낀다.** 공개 기록판은 한 번에 15건, 같은 탭 2분 캐시, 그룹은 문서 하나(읽기 1번)를 20~60초 간격으로만 읽는다. 경기 중에는 시작 때 받은 값으로 계산한다.

## 2. 파일

| 파일 | 역할 |
|---|---|
| `assets/firebase-config.js` | 웹앱 설정값(비밀 아님). 고치지 않는다 |
| `assets/online-board.js` | 데이터: 익명 로그인, 올리기(공개+그룹 한 번에), 기록판 읽기, 범위 순위, 내 기록 지우기, 그룹 만들기·들어가기·나가기·읽기 |
| `assets/online-group.js` | 그룹 버튼 + 코드 대화상자 + 그룹 문서 주기적 읽기 (`mountGroup`) |
| `assets/online-board-ui.js` | 화면 부품: 결과 기록판, 그룹 미니 순위, 경기 화면 패널 (`createResultBoard`, `renderGroupMini`, `createLivePanels`) |
| `firebase/firestore.rules` | 보안 규칙. **게임마다 검사 함수를 추가**한다 |
| `firebase/firestore.indexes.json` | 색인 (`game, board, day, rank↓`, `game, board, rank↓`) |
| `firebase/test/rules-test.mjs` | 규칙 시험(에뮬레이터, Node만). 게임마다 사례를 추가한다 |
| `firebase/test/sim-group.mjs` | 에뮬레이터 그룹에 가상의 참가자 넣기 |
| `firebase/test/ui-demo.html` | 화면 부품의 배치 방식(auto·embed·compact·headless) 예제 |
| `firebase/README.md` | 시험·배포 명령, 데이터 구조 요약 |

공용 파일(`assets/online-*.js`, `firebase/*`)은 한 번에 한 작업자만 고친다. 게임 파일에서 해결할 수 있는 차이는 옵션으로 넘기고 공용 파일을 게임에 맞춰 고치지 않는다.

## 3. 데이터

- `scores/{자동 ID}` 공개 기록 한 판: `game, board, nick, rank, …게임별 칸, day(서울 날짜 정수 20261126), uid, createdAt(서버 시각), expireAt(30일 뒤)`
- `limits/{uid}` 같은 기기 10초에 한 번 올리기 (`scores`와 같은 일괄 쓰기에서만 갱신)
- `groups/{6자리 코드}`: `{ createdAt, m: { uid: { n: 별명, at, g: { '게임~board': { rank, …칸, plays, t } } } } }` — 한 사람 한 칸, 게임·board마다 **가장 좋은 판**과 판 수
- `glimits/{uid}` 같은 기기 1분에 그룹 하나 만들기
- **rank는 "클수록 위"인 정수 하나**로 정한다. 같은 rank면 먼저 세운 기록이 위. 여러 기준은 자리수를 나눠 합친다(슈퍼 세이브!: `레벨 × 1천만 + 점수`). 시간이 짧을수록 좋은 게임은 `rank = 큰 수 − 밀리초`처럼 뒤집는다.
- 무료 요금제라 TTL 자동 삭제가 없다. 기한 지난 기록은 규칙이 누구에게나 삭제를 허용하고, 기록판을 본 기기가 조금씩 지운다(`maybeCleanUp`, `cleanUpGroups`).

## 4. 게임마다 정할 것 (적용 전 표로 먼저 정한다)

| 항목 | 예: 슈퍼 세이브! |
|---|---|
| `GAME_ID` (규칙·키에 쓰는 이름) | `keeper-reflex` |
| `board` 값 (따로 순위를 매길 구분) | 난이도 `easy·normal·hard` |
| 기록 칸과 범위 | `level 1~100`, `sec 0~7200`, `score 0~(sec+5)×1000`, `mode camera·touch` |
| `rank` 계산 | `level × 10000000 + score` |
| 이 기기 기록 → 줄 변환 | `{ n, l, s, sec, m, d }` → `{ nick, level, score, sec, mode, rank }` |
| `formatRecord(r)` | `{ main: "레벨 2 · 1,200점", a: "Lv2", b: "1,200" }` |
| 다음 목표 `gap(me, t)` | 같은 레벨이면 남은 점수, 아니면 그 레벨까지 남은 시간 |
| 오른쪽 통계 `stat` | 반응 속도(평균·가장 빠름·최근 10개, 짧을수록 좋음) — 없으면 생략 |
| 화면 배치 (6장) | 경기 화면 `auto`, 그룹 버튼은 상단 바 `slot` |

점수 범위는 실제 게임의 최대값보다 넉넉하게, 그러나 조작을 막을 만큼은 좁게 잡는다(초당 최대 점수 × 시간 등). 서버 코드가 없어서 값 조작을 완전히 막을 수는 없다는 점을 받아들인다.

## 5. 모듈 사용법

### 데이터 (`online-board.js`)
- `submitScore(GAME_ID, { board, nick, rank, …칸 })` → `{ ok, id, reason, problem, group: { ok, doc, reason } | null }` — 공개(켜져 있고 별명 있을 때)와 들어가 있는 그룹에 **한 트랜잭션으로** 저장한다. 그룹 쪽은 가장 좋은 판만 남긴다. 칸 이름은 규칙과 정확히 같아야 한다(남는 칸이 있으면 거부).
- `fetchBoard(game, board, { today })`, `rankRange(game, board, rank, { today, counted })`, `deleteMine(game)`
- `getOptIn()/setOptIn()`, `getGroup()`, `createGroup(nick)`, `joinGroup(code, nick)`, `leaveGroup()`, `readGroup()`, `groupRanking(doc, game, board)`

### 그룹 버튼 (`online-group.js`)
```js
const group = mountGroup({
  slot: $("groupSlot"), buttonClass: "btn small",      // 상단 바가 없으면 slot 대신 floating: "top-right"
  getNick, setNick, isIdle: () => 시작·결과 화면인가, isPlaying: () => 경기 중인가(경기 중 패널이 있을 때만),
  onOpen: () => 경기 중이면 일시정지, onChange: (doc) => { 시작 화면 그룹 순위, livePanels.onGroupDoc(doc), resultBoard.onGroupChange() },
});
```

### 화면 부품 (`online-board-ui.js`)
- `renderGroupMini(container, { doc, game, board, formatRecord, boardLabel })` — 시작 화면 등. 위 5명 + 내 순위.
- `createResultBoard({ container, game, gameName, group, formatRecord, boardLabel, localRows })` → `show({ board, record, nickEntered, lastRec })`, `onGroupChange()` — 결과 화면. 탭(그룹·오늘·30일·이 기기), 올리기 안내, 지우기 링크, 목록 밖이면 "상위 n%".
- `createLivePanels({ host, game, group, layout, getBoard, getNick, boardLabel, formatRecord, localRows, gap, stat, left, right })` → 게임 시작 때 `prepare()`, 놀이 영역이 바뀔 때 `place(rect)`, 매 프레임 `update({ rank, playing, row })`, 그룹 `onGroupDoc(doc)`, 값만 필요하면 `snapshot()`.
  - 왼쪽 기록판: 그룹 → 오늘 → 30일 → (오프라인) 이 기기. 내 줄은 한 줄로, 이번 판이 최고 기록을 넘기 전에는 `⭐ 나 · 최고 기록`, 넘으면 `🔴 나 · 경신 중!`. 누군가를 제치면 `⬆ n위!`.
  - 오른쪽: 다음 목표(먼저 내 최고 기록, 그다음 바로 위 사람) + `stat`(있을 때).
- 색은 게임의 CSS 변수(`--ink --muted --panel --panel2 --line --soft --accent --good`)를 따르고, 없거나 다르면 `--ob-ink` 등 `--ob-*`로 맞춘다. 모든 클래스는 `ob-`로 시작해 게임 CSS와 겹치지 않는다.

## 6. 화면에 맞지 않을 때의 대응 (적용 단계)

게임마다 화면 구조가 달라 부품을 그대로 못 쓸 수 있다. 아래 단계 중 **들어가는 데까지만** 적용한다. 아래 단계일수록 어느 게임에나 들어간다.

| 단계 | 쓰는 것 | 필요한 자리 | 못 쓸 때 |
|---|---|---|---|
| 0. 데이터 | `submitScore`, `fetchBoard` | 없음 | — (모든 점수형 게임) |
| 1. 그룹 버튼 | `mountGroup` | 상단 바 자리 `slot` | 상단 바가 없으면 `floating`(화면 구석 고정). 구석이 게임 버튼과 겹치면 다른 구석 |
| 2. 결과 기록판 | `createResultBoard` | 결과 화면의 상자 하나 | 결과 화면이 없거나 좁으면 기존 결과 카드 아래에 접는 영역(`<details>`)으로 넣거나 0단계만 |
| 3. 시작 화면 그룹 순위 | `renderGroupMini` | 시작 화면 빈 칸 | 자리가 없으면 생략(결과 화면 그룹 탭으로 충분) |
| 4. 경기 화면 패널 | `createLivePanels` | 아래 배치 중 하나 | 아래 표 |

경기 화면 패널 배치(`layout`):

| 배치 | 언제 | 비고 |
|---|---|---|
| `auto` | 카메라·놀이 영역 밖에 빈 공간이 있는 게임 | 양옆 130px 이상이면 옆 패널(250px 이상이면 큰 글씨), 위아래 90px 이상이면 띠, 둘 다 없으면 `compact`로 자동 전환. `place(rect)`에 놀이 영역 위치를 넘긴다 |
| `embed` | 이미 옆 공간을 점수판 등으로 쓰는 게임(예: 박수로 모기잡기의 gutter) | 게임이 만든 왼쪽·오른쪽 상자(`left`, `right`)에 넣는다. 한쪽만 줘도 된다 |
| `compact` | 놀이 영역이 화면을 꽉 채우는 게임 | 놀이 영역 왼쪽 위 작은 띠 하나(`👥 3위 · 🎯 지우 · 450점 남음`). 공·버튼이 자주 오는 자리면 쓰지 않는다 |
| `headless` | 화면을 캔버스로만 그리는 게임, DOM을 얹기 어려운 게임 | 화면 요소를 만들지 않는다. `update()`/`snapshot()`이 주는 값(`pos`, `target`, `stat` 등)으로 게임이 직접 그린다 |
| `off` | 반사 신경 판정에 방해되거나 2인 대전처럼 개인 순위가 맞지 않는 게임 | 0~3단계만 쓴다 |

판단 순서: ① 개인 점수가 있는가(없으면 미적용) → ② 상단 바가 있는가(없으면 floating) → ③ 놀이 영역 밖 빈 공간이 있는가(있으면 auto) → ④ 이미 쓰는 옆 칸이 있는가(있으면 embed) → ⑤ 구석에 작은 띠를 둘 수 있는가(있으면 compact) → ⑥ 캔버스에 그릴 수 있는가(있으면 headless) → 아니면 off.

현재 게임의 예상(적용할 때 화면을 직접 보고 확정한다):

| 게임 | 예상 |
|---|---|
| 슈퍼 세이브! | 모든 단계, `auto` (적용 완료) |
| 박수로 모기잡기 | 상단 바 없음 → floating, 이미 gutter 사용 → `embed` 또는 좁은 화면 `compact` |
| 손 명령 | 상단 바 없음 → floating, 배치는 화면 확인 후 |
| 기지개 팡팡·달걀 지킴이 | 화면 확인 후 결정 |
| 머리콩! 카피바라 배구(`upper-body-volleyball`) | **미적용(결정, 2026-11-27)**: 카피바라·친구와 5점 먼저 따기라 이기면 누구나 5점이어서 순위가 생기지 않고, 친구 대결은 개인 기록이 아니다. 필요해지면 서버 없이 이 기기 전적(몇 승 몇 패)만 둔다 |
| 모둠 뽑기·월드컵 | 점수 없음 → 미적용 |

다른 대응:
- 게임 CSS와 겹쳐 보이면 `--ob-*` 변수로 색을 맞추고, 크기는 패널 옵션(`minSide`, `minStrip`, `maxWidth`, `wideFrom`)으로 조정한다. 공용 CSS를 게임에 맞춰 고치지 않는다.
- 패널이 판정·조작 영역에 닿으면 그 게임은 한 단계 아래 배치를 쓴다. 패널은 `pointer-events: none`이라 터치를 가로채지 않지만 시선을 빼앗을 수 있다.
- 공용 부품으로 안 되는 표시가 꼭 필요하면 `headless` 값으로 게임 안에 직접 그린다. 공용 부품에 그 게임 전용 분기를 넣지 않는다.

## 7. 적용 절차

1. 4장의 표를 채우고, 6장의 단계·배치를 정한다(큰 화면 변경은 사용자와 먼저 정한다).
2. `firebase/firestore.rules`: 그 게임의 검사 함수(`xxxCore`, `xxxOk`)와 `gameOk()` 분기, 그룹용 `groupKeyOk()` 키(`'게임~board'`)를 추가한다.
3. `firebase/test/rules-test.mjs`에 그 게임의 허용·거부 사례(정상, 범위 밖, rank 조작, 칸 추가·누락, 그룹 기록)를 추가하고 에뮬레이터에서 모두 통과시킨다.
4. 게임 파일: 시작 화면 별명 입력 옆 `🌐 온라인 기록판에 올리기` 체크 상자와 안내 문구, `mountGroup`, `createResultBoard`(결과 화면), 필요하면 `renderGroupMini`, `createLivePanels`를 붙인다. 슈퍼 세이브!의 "온라인 기록판 화면" 절을 그대로 본뜬다.
5. 에뮬레이터로 검증(8장) → 사용자 확인 뒤 `cd firebase && firebase deploy --only firestore`로 규칙 배포 → 운영 확인 후 시험 기록 삭제.
6. `icebreaking-webapp.md`의 게임 목록·예외가 바뀌면 함께 고친다.

여러 게임을 한꺼번에 붙이거나 게임 파일 연결을 다른 에이전트(Codex)에 맡길 때는 10장을 따른다.

## 8. 검증

- 에뮬레이터: `cd firebase && firebase emulators:start --only firestore,auth` 후 `node firebase/test/rules-test.mjs` 전체 통과.
- 게임을 `http://localhost:3000/<경로>/?emu=1`로 연다(`npx serve`는 `.html`이 붙은 주소를 리다이렉트하며 `?emu=1`을 지우므로 확장자 없는 주소에 붙인다).
- 그룹을 만들고 `node firebase/test/sim-group.mjs <코드> <게임~board> '<기록 JSON>'`으로 다른 참가자를 넣는다. 20초 뒤 자동 갱신, 그룹 탭, 내 순위, 나가기·다시 들어오기, 없는 코드, 1시간 지난 그룹(기기 저장 시각을 2시간 전으로 바꿔 확인)을 본다.
- 경기: 게임의 디버그 훅(슈퍼 세이브!는 `?debug=1`의 `__krRun(ms, step, bot)`)으로 시간을 돌리며 봇으로 조작한다. 내 줄 이동·`⬆` 표시, 다음 목표, 통계, **다시 시작해도 최고 기록이 남는지** 확인한다.
- 화면: iPad 가로 1180×820, 세로 820×1180, 프로젝터 1280×720·1920×1080에서 패널이 놀이 영역을 침범하지 않고 글자가 잘리지 않는지(요소의 `scrollWidth`로 확인), 공간이 없을 때 `compact`로 바뀌는지.
- 오프라인: 에뮬레이터를 끈 채 `?emu=1`로 열어 "📱 이 기기 기록"으로 바뀌는지.
- 운영: `?emu=1` 없이 한 판 올려 오늘·30일·그룹·범위 순위가 되는지 보고, `deleteMine`과 `leaveGroup`으로 시험 기록을 지운다.
- `firebase/test/ui-demo.html`로 배치 방식을 빠르게 비교할 수 있다.

## 9. 함정 (겪은 일)

- 에뮬레이터 익명 로그인이 브라우저에 남아 운영에서 거부되었다 → 에뮬레이터는 앱 이름을 `online-board-emu`로 분리했다. 에뮬레이터를 다시 켜면 예전 시험 로그인이 400을 한 번 내고 새로 로그인한다(정상).
- TTL 자동 삭제는 결제 계정이 필요하다 → 쓰지 않고 기기가 정리한다.
- 개수 세기(`getCount`)에 `rank >` 조건을 쓸 때 `orderBy("rank", "desc")`를 붙여야 기존 색인을 쓴다(안 붙이면 색인 없음 오류).
- 규칙의 `request.time`과 기기 시각은 다르다 → `createdAt`·`last`·`t`는 `serverTimestamp()`, 날짜·만료는 하루 오차를 허용한다.
- 같은 문서(그룹)에 초당 1번 넘게 쓰면 느려질 수 있다 → 트랜잭션 재시도로 견딘다. 60명을 넘기지 않는다.
- 별명이 비면 "손님"으로 기록하되 온라인에는 올리지 않는다. 그룹 별명이 있으면 그룹에는 그 별명으로 올린다.
- Windows에서 Codex에 한글 파일을 쓰게 하면 ANSI로 저장되어 `?`로 깨질 수 있다 → 지시문에 UTF-8 저장 방법과 확인 단계를 적는다.

## 10. 다른 에이전트(Codex)에 맡길 때

여러 게임에 붙일 때는 **판단은 주 에이전트, 게임 파일 연결은 Codex**로 나눈다. 게임마다 화면이 달라 표본 하나로 품질을 보증할 수 없으므로 검증은 게임마다 주 에이전트가 직접 한다.

### 나누는 기준

| 일 | 맡는 쪽 | 이유 |
|---|---|---|
| 4장 결정표 채우기(GAME_ID, board, 칸·범위, rank, formatRecord, gap, stat) | 주 에이전트 | 게임 규칙 해석·점수 범위 판단 |
| 6장 적용 단계·배치 정하기(화면을 직접 보고) | 주 에이전트 | 화면 판단, 큰 변경은 사용자와 먼저 결정 |
| `firebase/firestore.rules`·`rules-test.mjs` 추가, 에뮬레이터 시험, 운영 배포 | 주 에이전트 | 보안 판단이고 공용 파일(한 명만 고친다) |
| 게임 파일에 모듈 연결(체크 상자·안내, `mountGroup`, `createResultBoard`, `renderGroupMini`, `createLivePanels`, 이 기기 기록 변환) | **Codex** | 결정표·명세·참고 구현을 따르는 반복 작업 |
| 8장 검증(에뮬레이터, 봇, 화면 크기, 오프라인, 운영) | 주 에이전트 | Codex 쪽은 브라우저 확인이 막혀 있다 |

순서: 결정표·배치 확정 → 규칙·시험 추가(에뮬레이터 통과) → Codex에 게임 파일 연결 → diff 검토 → 8장 검증 → 사용자 확인 후 규칙 배포·커밋. 서로 다른 게임은 Codex 작업을 병렬로 돌려도 되지만, 공용 파일과 규칙은 주 에이전트만 고친다.

### 실행

전역 지침(`~/.claude/CLAUDE.md`)의 Codex 호출 방법을 따른다. 게임 파일 연결은 중간 등급(`gpt-6.1-sol`, `medium`), 쓰기가 필요하므로 `-s workspace-write`. 오래 걸리면 백그라운드로 돌리고, 끝나면 자기가 띄운 프로세스가 남지 않았는지 확인한다.

### 지시문 틀

아래 틀을 채워 넘긴다. Codex는 대화 내용을 모르므로 결정표를 **값으로** 적는다.

```text
# 작업: <게임 이름>(<경로>)에 온라인 기록판 연결

## 목적
docs/agent-guides/online-board.md 의 5·6·7장에 따라 이 게임에 온라인 기록판을 붙인다. 참고 구현은
icebreaking/keeper-reflex/index.html 의 "온라인 기록판 화면" 절과 시작 화면 체크 상자·안내 문구다.

## 결정표 (그대로 쓴다)
- GAME_ID: ...            - board 값과 출처 변수: ...
- 올릴 칸(규칙과 이름이 정확히 같아야 함): { board, nick, rank, ... }
- rank 계산: ...          - formatRecord: { main: "...", a: "...", b: "..." }
- gap(me, t): ...         - stat: ... 또는 없음
- 이 기기 기록 → 줄 변환: localStorage 키 ..., { 원래 칸 } → { nick, rank, ... }
- 적용 단계: 0~?          - 그룹 버튼: slot(요소 id) / floating("...")
- 경기 화면 패널 layout: auto / embed(left·right 요소) / compact / headless / off
- place(rect)에 넘길 놀이 영역 계산: ...      - update(me)를 부를 곳: ...
- 결과 화면에서 show()를 부를 곳과 record 값: ...

## 수정 가능한 파일
- <게임 경로>/index.html 하나

## 금지
- assets/online-*.js, assets/firebase-config.js, firebase/ 아래 파일 수정 금지(필요하면 고치지 말고 보고)
- 운영 Firebase에 쓰기, 규칙 배포, git 명령, 다른 게임 파일 수정 금지
- 게임의 기존 판정·점수·소리·기존 이 기기 기록 저장 방식 변경 금지
- 파일은 UTF-8(BOM 없음)으로 저장한다. PowerShell Set-Content·Out-File 기본값이나 > 리다이렉트 금지.
  apply_patch를 쓰거나 [System.IO.File]::WriteAllText(경로, 내용, (New-Object System.Text.UTF8Encoding $false)) 사용.

## 완료 기준
- 저장 뒤 파일에 한글 문구(예: "온라인 기록판에 올리기")가 그대로 있고 "??"가 없다
- 모듈 스크립트를 따로 꺼내 node --check 가 통과한다
- 인터넷이 없을 때도 게임이 시작·종료되는 흐름이 남아 있다(모듈 호출 실패가 게임을 멈추지 않음)

## 보고 (짧게)
- 바꾼 위치(함수·요소 id)와 결정표에서 따르지 못했거나 애매했던 점
- 화면에서 확인하지 못한 점
```

### 받은 뒤 확인

- `git diff`로 수정 파일이 게임 파일 하나뿐인지, 공용 파일·규칙이 그대로인지 본다.
- `file <경로>`가 UTF-8이고 `??`가 없는지, `node --check`가 통과하는지 본다.
- 올리는 칸 이름이 규칙과 같은지(남는 칸이 있으면 운영에서 거부된다), `rank` 계산이 결정표와 같은지 대조한다.
- 그다음 8장 검증을 처음부터 한다. 같은 원인으로 한 번 보완해도 안 되면 주 에이전트가 직접 고친다.
