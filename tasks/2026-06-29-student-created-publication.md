# 2026 미적분 학생 제작 웹앱 공개 정리 지침

## 작업 목적

2026년 미적분 독서 연계 수행평가에서 학생이 제작한 웹앱을 `math-webapps`에 공개용으로 정리한다. 공개 페이지에서는 학생 이름을 노출하지 않고 학번만 표시한다.

학생 웹앱의 실행 오류, 렌더링 오류, 경로 오류, 심한 레이아웃 문제는 고칠 수 있다. 단, 학생이 작성한 수학적 설명, 계산 과정, 결론, 수학적 오류는 학생 산출물의 일부이므로 수정하지 않는다.

## 결정 사항

- 공개 식별자: 학번만 사용한다. 예: `3107`
- 공개 경로: `calculus/student-created/2026/`
- 학생별 공개 폴더: `calculus/student-created/2026/3107/`
- 공개 파일: 웹앱 `index.html`, 읽기용 답안 `answer.html`, 원문 답안 `answer.txt`
- 목록 정렬: 학번순
- 수학 내용: 오류가 있어도 수정하지 않는다.
- 화면 검증: iPad 전용 화면 검증은 이번 작업 범위에서 제외한다.

## 현재 사본 위치

현재 학생 제출물 사본은 다음 위치에 있다.

```text
C:\Users\User\Documents\GitHub\math-webapps\calculus\Student-Created\2026
```

현재 형식은 대체로 다음과 같다.

```text
3107_학생이름/
├─ 3107_학생이름.html
└─ 3107_학생이름.txt
```

주의:

- 이 경로는 이름이 포함되어 있으므로 공개용 경로로 사용하지 않는다.
- 공개용 작업이 끝난 뒤 이 기존 경로를 실수로 공개 링크에 연결하지 않는다.
- Git에 올릴 때도 기존 이름 포함 경로가 함께 staged 되었는지 반드시 확인한다.

## 공개용 목표 구조

공개용 산출물은 다음 구조로 만든다.

```text
calculus/
└─ student-created/
   └─ 2026/
      ├─ index.html
      ├─ 3107/
      │  ├─ index.html
      │  ├─ answer.html
      │  └─ answer.txt
      ├─ 3110/
      │  ├─ index.html
      │  ├─ answer.html
      │  └─ answer.txt
      └─ ...
```

학생별 변환 규칙:

```text
calculus/Student-Created/2026/3107_학생이름/3107_학생이름.html
-> calculus/student-created/2026/3107/index.html

calculus/Student-Created/2026/3107_학생이름/3107_학생이름.txt
-> calculus/student-created/2026/3107/answer.txt
```

그리고 `answer.txt`를 바탕으로 읽기용 `answer.html`을 만든다.

## 개인정보 처리 기준

공개 파일 어디에도 학생 이름이 남아 있으면 안 된다.

검사 대상:

- 폴더명
- 파일명
- HTML `<title>`
- HTML `<meta>`
- 본문 텍스트
- 주석
- JavaScript 문자열
- CSS 문자열
- `answer.txt`
- `answer.html`
- 목록 페이지
- 링크 텍스트와 `href`
- 이미지 `alt`, `title`, `aria-label`

이름 제거는 학생 산출물 보존 원칙보다 우선한다. 단, 이름 외의 수학 설명과 문장은 수정하지 않는다.

## 이름 대응표 보관

나중에 원본 학생을 다시 찾을 수 있어야 하므로 학번과 원래 폴더명의 대응표를 만든다. 단, 대응표는 공개 저장소에 올리지 않는다.

권장 위치:

```text
.work/student-created-2026-name-map.csv
```

`.work/`는 `.gitignore`에 포함되어 있으므로 공개되지 않는다.

권장 형식:

```csv
student_id,original_folder,original_html,original_txt,public_folder
3107,3107_학생이름,3107_학생이름.html,3107_학생이름.txt,calculus/student-created/2026/3107
```

주의:

- 대응표를 `tasks/`, `docs/`, `calculus/`, `student-created/` 아래에 두지 않는다.
- HTML 주석, 숨겨진 input, data attribute, JSON, JS 변수에 이름을 보관하지 않는다.

## 답안 TXT 공개 방식

`answer.txt`와 `answer.html`을 둘 다 공개한다.

- `answer.txt`: 이름만 제거한 원문 텍스트이다. 원본 확인용으로 제공한다.
- `answer.html`: 같은 내용을 문항별 박스 구조로 보여주는 읽기용 페이지이다.

학생 웹앱 `index.html`에는 답안 링크를 추가한다.

```html
<nav class="student-work-links" aria-label="학생 답안 자료">
  <a href="../">목록으로</a>
  <a href="./answer.html">답안 보기</a>
  <a href="./answer.txt">원문 TXT</a>
</nav>
```

`answer.html` 권장 구조:

```html
<main class="answer-page">
  <a class="back-link" href="./">웹앱으로</a>
  <a class="back-link" href="../">목록으로</a>

  <header>
    <p class="eyebrow">Student Answer</p>
    <h1>3107 답안</h1>
    <p>학생이 제출한 답안을 이름만 제거하고 문항별로 정리했습니다. 수학적 설명은 원문을 보존했습니다.</p>
  </header>

  <article class="answer-card">
    <h2>문항 1</h2>
    <pre>학생이 작성한 내용</pre>
  </article>
</main>
```

문항 구분 원칙:

- TXT에 `1.`, `문항 1`, `질문 1`, `1번`처럼 명확한 구분이 있으면 그 기준으로 나눈다.
- 문항 구분이 불확실하면 내용을 추측해서 재배열하지 않는다.
- 자동 구분이 어려운 경우 `전체 답안` 하나의 박스로 표시한다.
- 줄바꿈, 들여쓰기, 수식 표기는 가능한 한 원문을 보존한다.
- HTML 삽입 시 `<`, `>`, `&` 같은 문자는 반드시 escape 처리하여 학생 답안이 HTML로 실행되지 않게 한다.

## 수정 허용 범위

중간 수정까지 허용한다.

수정 가능:

- 이름 제거
- 공개용 상대경로 수정
- 깨진 HTML 태그 수정
- 브라우저 콘솔 오류 수정
- JavaScript 실행 오류 수정
- CDN 또는 MathJax 로딩 오류 수정
- 이미지, CSS, JS 참조 경로 오류 수정
- 태블릿 또는 일반 브라우저에서 크게 무너지는 레이아웃 보정
- 너무 작은 버튼, 겹치는 텍스트, 화면 밖으로 나가는 요소의 CSS 보정
- 답안 보기, 원문 TXT, 목록 이동 링크 추가

수정 금지:

- 학생이 작성한 수학적 설명 수정
- 수학 오류 수정
- 계산식, 결론, 해석 문장 고쳐 쓰기
- 수학 표현을 더 그럴듯하게 바꾸기
- 학생 작품의 주제나 의도 변경
- 디자인을 전면 재작성하여 학생 작품의 흔적을 지우는 수정
- 학생 답안을 요약하거나 의역하여 `answer.html`에 넣기

수학 오류가 보여도 공개용으로 고치지 않는다. 필요하면 목록 페이지 안내문에서 "수학적 설명은 학생 산출물을 보존했다"는 점만 밝힌다.

## 목록 페이지 구성

`calculus/student-created/2026/index.html`에 학번순으로 나열한다.

목록 카드에는 다음을 포함한다.

- 학번
- 학생 웹앱 열기 링크
- 답안 보기 링크
- 원문 TXT 링크
- 간단한 안내 문구

전체 목록 상단 안내 문구:

```text
2026년 미적분 독서 연계 수행평가에서 학생들이 제작한 웹앱 모음입니다. 학생 이름은 공개하지 않고 학번만 표시합니다. 수학적 설명과 해석은 학생 산출물을 보존했으며, 공개를 위해 개인정보 제거, 경로 정리, 실행 오류와 렌더링 오류만 보정했습니다.
```

학생별 안내 문구 예:

```text
3107 학생이 제작한 미적분 독서 연계 웹앱입니다. 개인정보 보호를 위해 이름은 공개하지 않았고, 작품과 답안은 실행 안정성과 렌더링 오류만 보정했습니다.
```

## 링크 등록

다음 링크를 정리한다.

- `calculus/index.html`에서 학생 제작 웹앱 카드가 `./student-created/2026/`을 가리키게 한다.
- 필요하면 루트의 `student-created/index.html`에서도 `../calculus/student-created/2026/`으로 연결한다.
- 실제 파일이 없는 학생 번호는 링크하지 않는다.
- 기존 `calculus/Student-Created/` 경로는 공개 링크로 새로 사용하지 않는다.

## 작업 순서

1. 현재 `calculus/Student-Created/2026/` 아래 학생 폴더 목록을 읽는다.
2. 각 폴더명에서 학번과 이름을 분리한다.
3. `.work/student-created-2026-name-map.csv` 대응표를 만든다.
4. 공개용 `calculus/student-created/2026/학번/` 폴더를 만든다.
5. HTML을 `index.html`로 복사하면서 이름을 제거한다.
6. TXT를 `answer.txt`로 복사하면서 이름을 제거한다.
7. `answer.txt`를 바탕으로 `answer.html`을 만든다.
8. 학생 웹앱 `index.html`에 목록/답안 링크를 추가한다.
9. 실행 오류, 렌더링 오류, 경로 오류, 치명적 콘솔 오류를 수정한다.
10. `calculus/student-created/2026/index.html` 목록 페이지를 만든다.
11. `calculus/index.html`과 필요한 목록 페이지의 링크를 새 경로로 수정한다.
12. 이름 잔존, 링크 대상, 콘솔 오류를 검증한다.
13. Git에 stage하기 전에 이름 포함 기존 경로가 포함되지 않았는지 확인한다.

## 검증 기준

iPad 전용 화면 검증은 이번 작업 범위에서 제외한다.

반드시 확인:

- 공개 경로에 학생 이름이 남아 있지 않은가
- `answer.txt`와 `answer.html`에도 학생 이름이 남아 있지 않은가
- 공개 파일 안에 `3107_학생이름` 같은 원래 폴더명이 남아 있지 않은가
- 공개 폴더와 파일명이 영어 소문자, 숫자, 하이픈 규칙을 따르는가
- 모든 학생 폴더에 `index.html`, `answer.html`, `answer.txt`가 있는가
- 목록 페이지의 모든 링크가 실제 파일 또는 폴더를 가리키는가
- 각 학생 웹앱이 브라우저에서 열리는가
- 각 학생 웹앱에서 `답안 보기`, `원문 TXT`, `목록으로` 링크가 동작하는가
- 브라우저 콘솔에 치명적인 오류가 없는가
- 공개 HTML 내부에 `C:\Users`, `file:///`, `localhost` 같은 공개 불가 경로가 남아 있지 않은가
- 수학적 설명과 수학 오류를 임의로 수정하지 않았는가
- 기존 `calculus/Student-Created/` 경로가 공개 목록에서 링크되지 않는가

권장 자동 검사:

```text
1. 공개 폴더 전체에서 원래 학생 이름 문자열 검색
2. 공개 폴더 전체에서 원래 폴더명 문자열 검색
3. 공개 폴더 전체에서 C:\Users, file://, localhost 검색
4. 모든 index.html, answer.html, answer.txt 존재 여부 확인
5. 목록 페이지 링크 대상 존재 여부 확인
6. 브라우저 자동 실행으로 콘솔 오류 수집
7. git status --short로 이름 포함 기존 경로가 staged 되었는지 확인
```

## 완료 기준

- 공개용 파일이 `calculus/student-created/2026/` 아래 학번-only 구조로 정리되어 있다.
- 이름이 공개 파일 어디에도 남아 있지 않다.
- 비공개 대응표가 `.work/student-created-2026-name-map.csv`에 있다.
- 학번순 목록 페이지에서 모든 학생 웹앱과 답안을 열 수 있다.
- TXT 원문과 문항별 HTML 답안 보기가 함께 제공된다.
- 실행 불능, 렌더링 오류, 경로 오류가 가능한 범위에서 수정되어 있다.
- 학생의 수학적 설명과 수학 오류는 원문 보존 원칙에 따라 수정하지 않았다.
- 기존 이름 포함 경로는 공개 링크에 사용되지 않는다.
