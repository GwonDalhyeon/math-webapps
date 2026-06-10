# 저장소 구조와 경로 지침

이 문서는 새 웹앱을 추가하거나 목록 페이지, 링크, 파일 경로를 수정할 때 읽는다.

## 프로젝트 성격

이 저장소는 GitHub Pages로 배포되는 고등학교 수학 수업용 정적 웹앱 모음이다.

기본 실행 조건:

- 브라우저만으로 바로 실행되어야 한다.
- 설치, 빌드, 서버, 로그인, 데이터베이스가 없어야 한다.
- 각 웹앱은 자기 폴더의 `index.html`로 실행된다.
- 모든 링크와 리소스는 GitHub Pages에서 깨지지 않는 상대경로를 사용한다.

## 기본 폴더 구조

```text
math-webapps/
├─ index.html
├─ assets/
│  ├─ common.css
│  └─ common.js
├─ tasks/
├─ docs/
│  └─ agent-guides/
├─ probability-statistics/
│  ├─ index.html
│  └─ app-name/
│     ├─ index.html
│     ├─ worksheet.md
│     ├─ worksheet-teacher.md
│     ├─ worksheet.pdf
│     └─ worksheet-teacher.pdf
├─ calculus/
│  ├─ index.html
│  └─ app-name/
│     └─ index.html
└─ gifted/
   ├─ index.html
   └─ app-name/
      └─ index.html
```

## 파일명과 폴더명

- 영어 소문자, 숫자, 하이픈만 사용한다.
- 한글, 공백, 특수문자를 URL 경로에 사용하지 않는다.
- 새 웹앱 폴더에는 반드시 `index.html`을 둔다.
- 학습지는 해당 웹앱 폴더 안에 `worksheet.md`, `worksheet-short.md`처럼 둔다.
- 웹앱과 직접 연결되는 학습지를 제작한 경우 Markdown 원본과 PDF를 웹앱 폴더에 함께 두고, 웹앱에서 다운로드할 수 있게 연결한다.

좋은 예:

```text
probability-statistics/sample-proportion-event-readiness/index.html
probability-statistics/sample-proportion-event-readiness/worksheet.md
probability-statistics/sample-proportion-event-readiness/worksheet.pdf
```

피할 예:

```text
probability-statistics/표본비율/index.html
probability-statistics/sample proportion/index.html
```

## 상대경로

루트 목록에서 과목 폴더로 연결할 때:

```html
<a href="./probability-statistics/">확률과 통계</a>
```

과목 목록에서 개별 웹앱으로 연결할 때:

```html
<a href="./sample-proportion-event-readiness/">표본비율과 행사 준비</a>
```

개별 웹앱에서 공통 CSS를 연결할 때:

```html
<link rel="stylesheet" href="../../assets/common.css">
```

개별 웹앱에서 같은 폴더의 학습지를 연결할 때:

```html
<a href="./worksheet.pdf" download>학생용 PDF</a>
<a href="./worksheet.md" download>학생용 MD</a>
```

절대 로컬 경로는 금지한다.

```html
<!-- 금지 -->
<link rel="stylesheet" href="C:/Users/User/Documents/GitHub/math-webapps/assets/common.css">
```

## 목록 페이지 수정

새 웹앱을 추가할 때는 다음을 함께 처리한다.

1. 과목 폴더 아래에 새 웹앱 폴더를 만든다.
2. 새 폴더 안에 `index.html`을 만든다.
3. 학습지를 함께 제작한 경우 같은 폴더에 Markdown/PDF 파일을 두고 웹앱의 다운로드 영역에 연결한다.
4. 과목별 `index.html` 목록에 카드를 추가한다.
5. 실제 파일이 없는 항목은 링크하지 않는다.

실제 페이지가 있을 때:

```html
<a class="card" href="./sample-proportion-event-readiness/">
  <h2>표본비율과 행사 준비</h2>
  <p>표본비율이 모비율과 매번 일치하지 않는다는 점을 행사 준비 상황으로 확인합니다.</p>
</a>
```

아직 페이지가 없을 때:

```html
<article class="card">
  <h2>새 주제</h2>
  <p>설명을 준비 중입니다.</p>
  <span class="status">준비 중</span>
</article>
```

## 작업지시서 위치

- 공개 가능한 교육용 기획서와 구현 지시서는 `tasks/`에 둔다.
- 공개하면 안 되는 임시 지시서, 개인 메모, 실험용 프롬프트는 `.work/claude-tasks/` 또는 `tasks/private/`에 둔다.
- `tasks/private/`와 `.work/`는 Git에 올리지 않는다.

## 참고자료 위치

교과서 PDF 등 대형 참고자료는 이 저장소가 아니라 별도 프로젝트에 둔다.

- 미적분 참고자료: `../lesson-design/calculus/resources/`
