# 벡터 구조 해석실 적용 지침

이 앱은 사용자 요청에 따라 비공개 저장소 `lesson-design/geometry/assessments/2026-vector-bridge-structure/webapp-design.md`(설계안)와 해당 대화의 확정 지시를 기존 웹앱 공통 지침보다 우선 적용한다.

- 이 폴더는 Firebase Hosting 앱으로 자동 이동하는 정적 접속 경로다. 앱 코드는 `lesson-design/.../2026-vector-bridge-structure/webapp/`에 있다.
- Firebase(Auth·Firestore·Cloud Functions·Storage)와 서버 측 OpenAI API 사용을 허용한다(수행평가 운영용 예외).
- 학생 명부, 평가 기록, 정답, API 키를 이 저장소에 복사하지 않는다.
- `index.html`의 `APP_URL`에는 검증된 운영 배포 주소(`https://<프로젝트ID>.web.app/`)만 설정한다. 설정 전에는 준비 중 화면을 유지한다.
- 운영 배포와 학생 계정 검증 전에는 과목 목록에 실행 카드로 등록하지 않는다.
