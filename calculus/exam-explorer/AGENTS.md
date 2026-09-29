# 기출 탐색실 적용 지침

이 앱은 사용자 요청에 따라 `lesson-design/calculus/assessments/2026-exam-explorer/spec.md`와 해당 대화의 확정 지시를 기존 웹앱 공통 지침보다 우선 적용한다.

- 이 폴더는 Google Apps Script 웹앱으로 자동 이동하는 정적 접속 경로다.
- 상위 자료실·홈으로 이동하는 버튼을 넣지 않는다.
- Apps Script 서버, Google Drive 이미지, 서버 측 OpenAI API 사용을 허용한다.
- 검색 화면과 데이터 처리는 Apps Script에서 실행한다. 문제 원문·해설·비공개 분류·API 키를 이 저장소에 복사하지 않는다.
- `index.html`의 `APP_URL`에는 검증된 운영 배포 `/exec` 주소만 설정한다. 설정 전에는 준비 중 화면을 유지한다.
- 운영 배포와 학생 계정 검증 전에는 과목 목록에 실행 카드로 등록하지 않는다. 검증 후 등록한다.
