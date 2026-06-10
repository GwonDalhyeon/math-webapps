# 에이전트 세부 지침

이 폴더는 `AGENTS.md`와 `CLAUDE.md`에서 공통으로 참조하는 작업별 세부 지침을 보관한다.

상위 지침 파일은 핵심 금지 사항과 작업별 문서 연결만 짧게 유지하고, 자세한 기준은 이 폴더의 문서를 필요한 순간에 읽는다.

## 문서 목록

- `repo-structure.md`: 저장소 구조, 경로, 목록 페이지, GitHub Pages 링크 규칙
- `webapp.md`: 새 수학 웹앱 제작 기준
- `worksheet.md`: 학습지 Markdown 작성 기준
- `pdf-export.md`: 학습지 PDF 변환 기준
- `task-spec.md`: 작업지시서 작성 기준
- `verification.md`: 완료 전 검증 체크리스트

## 사용 원칙

- 새 웹앱을 만들 때는 `webapp.md`, `repo-structure.md`, `verification.md`를 읽는다.
- 학습지를 만들거나 수정할 때는 `worksheet.md`를 읽는다.
- 학습지를 PDF로 변환할 때는 `pdf-export.md`를 읽는다.
- Claude Code나 다른 도구에 구현을 맡길 작업지시서를 만들 때는 `task-spec.md`를 읽는다.
- 링크, 폴더명, 목록 페이지를 수정할 때는 `repo-structure.md`를 읽는다.

## 상위 지침에 남겨야 할 핵심 규칙

다음 규칙은 하위 문서에만 두지 말고 `AGENTS.md`와 `CLAUDE.md`에도 유지한다.

- 이 프로젝트는 GitHub Pages용 정적 웹앱 모음이다.
- 기본 구현은 HTML, CSS, 브라우저 JavaScript 단일 `index.html`이다.
- React, Vite, Next.js, TypeScript, 번들러, 서버, 데이터베이스, 로그인, 서버 API를 도입하지 않는다.
- 모든 링크와 리소스 경로는 상대경로를 사용한다.
- 실제 파일이 없는 링크를 만들지 않는다.
- 학습지 Markdown의 모든 수식은 LaTeX 형식으로 작성한다.
- 학습지 Markdown을 제작할 때는 학생용과 예시답안이 있는 교사용을 함께 제작한다.
