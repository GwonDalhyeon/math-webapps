# 아이스브레이킹 온라인 기록판 (Firebase)

- 프로젝트: `math-webapps-board` (무료 Spark 요금제, Firestore 서울 `asia-northeast3`, 익명 로그인)
- 브라우저 쪽 코드: `../assets/online-board.js`, 설정값: `../assets/firebase-config.js`
- 이 폴더: 보안 규칙(`firestore.rules`), 색인(`firestore.indexes.json`), 익명 로그인 설정(`firebase.json`), 규칙 시험(`test/rules-test.mjs`)
- 운영 기준: `../docs/agent-guides/icebreaking-webapp.md`의 「온라인 기록판」

## 규칙 시험

```powershell
cd firebase; firebase emulators:start --only firestore,auth
```

다른 창에서:

```powershell
node firebase/test/rules-test.mjs
```

## 배포

```powershell
cd firebase; firebase deploy --only firestore,auth
```

## 데이터

- `scores/{자동 ID}`: game, board, nick, rank, 게임별 칸, day(서울 날짜 정수), uid, createdAt, expireAt(30일 뒤)
- `limits/{uid}`: 같은 기기가 10초 안에 다시 올리지 못하게 하는 마지막 올린 시각
- `groups/{6자리 코드}`: createdAt, m(uid → { n: 별명, at, g: { '게임~난이도': 가장 좋은 판 + plays + t } }). 1시간 동안만 쓰고, 끝난 문서는 새 그룹을 만들 때 조금씩 지운다.
- `glimits/{uid}`: 같은 기기가 1분 안에 그룹을 또 만들지 못하게 하는 마지막 만든 시각
- 공개 기록판 범위 계산(개수 세기)은 기록판과 같은 `rank` 내림차순 색인을 쓰도록 질의에 정렬을 붙인다.
- 부적절한 별명은 Firebase 콘솔 → Firestore → `scores`에서 해당 문서를 지운다.
