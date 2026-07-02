# 통계적 의사결정 도우미 구현 지침서

이 문서는 `probability-statistics/statistical-decision-lab/`의 실제 웹앱을 구현하거나 수정할 때 따른다.

## 1. 구현 범위

첫 구현은 센서 경보 MVP로 제한한다.

생성 또는 유지할 파일:

- `probability-statistics/statistical-decision-lab/index.html`
- `probability-statistics/statistical-decision-lab/sensor-alarm/index.html`
- `probability-statistics/statistical-decision-lab/sensor-alarm/sensor-alarm-student.pdf`

수정할 파일:

- `probability-statistics/index.html`

후속 preset 자리:

- 모음 페이지에서 `04 센서 경보`는 실제 링크로 연결한다.
- 모음 페이지에서 `01 상품추천`은 준비 중 카드로 두고 링크하지 않는다.
- 센서 경보 앱 안에서는 `04 센서 경보` preset을 활성화하고 `01 상품추천` 버튼은 비활성화한다.

## 2. 공개 자료 기준

- 센서 경보 앱 폴더에는 학생용 PDF만 둔다.
- 교사용 PDF, 교사용 Markdown, 예시답안, 채점 기준은 공개 웹앱 폴더에 넣지 않는다.
- 학습지 전문을 HTML로 복사하지 않는다.
- PDF 다운로드 링크는 실제 파일이 있을 때만 만든다.

## 3. 기술 기준

- HTML, CSS, 브라우저 JavaScript만 사용한다.
- React, Vite, Next.js, TypeScript, 번들러를 사용하지 않는다.
- npm 설치, 빌드 과정, 서버 기능, 데이터베이스, 로그인, API 호출을 추가하지 않는다.
- 모든 링크와 리소스는 GitHub Pages에서 동작하는 상대경로를 사용한다.
- 외부 CDN은 쓰지 않는다. MVP에는 MathJax가 필요하지 않다.
- 센서 경보 앱의 PDF 임베드는 `<object data="./sensor-alarm-student.pdf" type="application/pdf">` 또는 동등한 정적 방식으로 구현한다.

## 4. 화면 구조

### 가로 화면

iPad A16 가로 `1180×820` CSS px에서 다음 구조를 기본으로 한다.

```text
왼쪽: 학생용 PDF
오른쪽: 센서 경보 도구
```

오른쪽 도구 순서:

```text
preset 버튼
-> 학습지 위치 안내
-> 자연빈도 시각화
-> 2×2 빈도표
-> 내 계산 확인
-> 학습지로 돌아가는 짧은 문구
```

### 세로 화면

iPad A16 세로 `820×1180` CSS px에서는 PDF와 도구를 탭으로 전환한다.

```text
[학습지 보기] [도구 보기]
```

세로 기본 탭은 `학습지 보기`다. `도구 보기`를 누르면 도구만 보이고, 다시 `학습지 보기`를 누르면 PDF만 보여야 한다.

### 모음 페이지

`probability-statistics/statistical-decision-lab/index.html`은 개별 도구가 아니라 통계적 의사결정 웹앱 모음 페이지다.

```text
04 센서 경보: ./sensor-alarm/ 링크
01 상품추천: 준비 중 카드, 링크 없음
```

## 5. 센서 경보 preset 데이터

MVP 기본값은 실제 학생용 학습지와 일치시킨다.

```js
const PRESETS = {
  sensorAlarm: {
    id: "sensor-alarm",
    title: "센서 경보 후 조치 결정",
    model: "conditional-probability",
    worksheetPdf: "./sensor-alarm-student.pdf",
    defaults: {
      total: 10000,
      baseRate: 0.01,
      sensitivity: 0.95,
      falsePositiveRate: 0.05
    },
    labels: {
      event: "위험",
      nonEvent: "정상",
      signal: "경보",
      noSignal: "경보 없음"
    }
  },
  productRecommendation: {
    id: "product-recommendation",
    title: "상품추천 준비 중",
    disabled: true
  }
};
```

기본 자연빈도:

```text
위험 = 100
정상 = 9,900
위험이고 경보 = 95
위험인데 경보 없음 = 5
정상인데 경보 = 495
정상이고 경보 없음 = 9,405
경보 전체 = 590
P(위험 | 경보) ≈ 16.1%
```

## 6. 조건부확률 계산 모델

입력:

- 전체 사례 수 `N`
- 실제 사건 비율 `baseRate`
- 사건일 때 신호가 나타나는 비율 `sensitivity`
- 사건이 아닐 때 신호가 나타나는 비율 `falsePositiveRate`

계산:

```text
eventCount = N × baseRate
nonEventCount = N - eventCount
truePositive = eventCount × sensitivity
falseNegative = eventCount - truePositive
falsePositive = nonEventCount × falsePositiveRate
trueNegative = nonEventCount - falsePositive
signalTotal = truePositive + falsePositive
posterior = truePositive / signalTotal
```

구현에서는 소수점 건수가 생길 수 있는 조작값을 허용할지 결정해야 한다.

- 학습지 기본값은 자연수 건수로 표시한다.
- 슬라이더를 넣는 경우, 학생 계산 확인 화면에서는 지나친 소수 표시를 피한다.
- 기본 MVP에서는 학습지 값 중심으로 두고, 자유 입력은 후속 확장으로 미뤄도 된다.

## 7. 두 센서 모두 경보 모델

Q5 보조 기능을 넣을 경우 다음 계산만 `내 계산 확인`으로 제공한다.

```text
위험이고 두 센서 모두 경보 = eventCount × sensitivity²
정상인데 두 센서 모두 경보 = nonEventCount × falsePositiveRate²
P(위험 | 두 센서 모두 경보)
  = 위험이고 두 센서 모두 경보 / 두 센서 모두 경보 전체
```

주의:

- 두 센서 계산을 넣더라도 `추가 측정이 정답`이라고 말하지 않는다.
- Q7의 독립 가정 비판 답을 제공하지 않는다.
- 두 센서가 독립이라는 가정이 들어갔다는 짧은 라벨만 둔다.

## 8. 시각화 요구

필수 시각화:

- 전체 사례 막대 또는 격자
- 실제 위험/정상 구분
- 경보/경보 없음 구분
- 2×2 빈도표
- `P(경보 | 위험)`과 `P(위험 | 경보)` 비교

분모 강조 규칙:

- `P(경보 | 위험)`을 볼 때는 위험 100건을 분모로 강조한다.
- `P(위험 | 경보)`를 볼 때는 경보 전체 590건을 분모로 강조한다.
- 강조는 색, 라벨, 테두리, 짧은 문구를 함께 사용한다.
- 색만으로 의미를 구분하지 않는다.

## 9. 계산 확인 기능

계산 기능은 학생이 학습지에서 정한 분자와 분모를 입력해 비율을 확인하는 용도로만 둔다.

허용:

- 분자 입력
- 분모 입력
- 입력값에 대한 비율과 백분율 계산
- 분모가 0이거나 분자가 분모보다 클 때의 짧은 입력 점검 안내

금지:

- 학습지 Q1~Q5 답을 한 번에 표시
- 빈도표 네 칸, 경보 전체, 조건부확률 값을 버튼 한 번으로 공개
- 대응안 가/나/다 자동 선택
- AI 요약 비판 문항의 정답 제공
- 학생 결론문을 대신 작성하는 기능
- 학습지보다 자세한 풀이 단계 제공

계산 확인 UI 권장 방식:

```text
[분자 입력] [분모 입력]
[내 계산 확인]
-> 학생이 입력한 식의 비율만 표시
-> "학습지 Q2에서 분모를 비교하세요." 문구
```

## 10. 학습지 연계 문구

웹앱 안의 안내 문구는 짧고 위치 중심으로 쓴다.

사용 가능:

- `학습지 [시작 전] 예상을 먼저 적고 확인하세요.`
- `학습지 Q1 빈도표를 채운 뒤 필요한 분자와 분모를 입력하세요.`
- `학습지 Q2에서 두 확률의 분모를 비교하세요.`
- `학습지 Q4로 돌아가 판단 근거를 직접 쓰세요.`

피할 것:

- 학습지 문항 전문 복사
- 정답 문장 제공
- 학생의 결론을 대신 정리하는 문구
- `즉시 정지`, `추가 측정`, `계속 운전` 중 하나를 강조하는 문구

## 11. 문구와 버튼 이름

사용할 수 있는 이름:

- `분모 확인`
- `경보가 울린 사례만 보기`
- `내 계산 확인`
- `학습지로 돌아가기`
- `Q2 참고`

피할 이름:

- `정답 확인`
- `최선의 선택`
- `추천 결과`
- `결론 보기`
- `이 답 쓰기`

## 12. 디자인 기준

- 모음 페이지는 공통 CSS `../../assets/common.css`를 연결한다.
- 센서 경보 앱은 공통 CSS `../../../assets/common.css`를 연결한다.
- 개별 앱 스타일은 `index.html`의 `<style>` 안에 둔다.
- 주요 버튼과 입력은 iPad 터치에 충분한 크기로 만든다.
- 카드 안에 카드를 중첩하지 않는다.
- 장식보다 표, 빈도, 분모 강조의 가독성을 우선한다.
- 교실 프로젝터에서 숫자와 라벨이 읽히게 한다.
- 도구 영역은 한 화면에 과하게 많은 그래프를 넣지 않는다.

## 13. 완료 기준

- 페이지가 GitHub Pages 정적 파일 구조로 열린다.
- `probability-statistics/statistical-decision-lab/index.html`은 모음 페이지로 열린다.
- `probability-statistics/statistical-decision-lab/sensor-alarm/index.html`은 센서 경보 앱으로 열린다.
- 학생용 PDF가 화면에 표시되고 다운로드 링크가 실제 파일을 가리킨다.
- 교사용 자료가 웹앱 폴더에 없다.
- 모음 페이지에서 센서 경보는 실제 링크, 상품추천은 준비 중 카드다.
- 센서 경보 앱에서 센서 경보 preset이 활성화되어 있고 상품추천 preset은 준비 중 상태다.
- 기본값이 학습지와 일치한다.
- `P(경보 | 위험)`과 `P(위험 | 경보)`의 분모 차이가 화면에서 드러난다.
- 최종 대응안 또는 결론을 자동으로 제시하지 않는다.
- iPad A16 가로 `1180×820`에서 PDF와 도구가 함께 보인다.
- iPad A16 세로 `820×1180`에서 학습지/도구 탭 전환이 가능하다.
- 브라우저 콘솔에 앱 코드 오류가 없다.
- `probability-statistics/index.html`의 카드가 실제 폴더로 연결된다.

## 14. 검증 방법

1. `probability-statistics/index.html`의 카드가 `./statistical-decision-lab/`로 연결되는지 확인한다.
2. `probability-statistics/statistical-decision-lab/index.html`에서 센서 경보 링크와 상품추천 준비 중 카드가 보이는지 확인한다.
3. 센서 경보 링크가 `./sensor-alarm/`로 연결되는지 확인한다.
4. `probability-statistics/statistical-decision-lab/sensor-alarm/index.html`에서 학생용 PDF가 보이고 다운로드 링크가 `./sensor-alarm-student.pdf`를 가리키는지 확인한다.
5. 센서 경보 앱 폴더에 교사용 PDF, 교사용 Markdown, 예시답안 파일이 없는지 확인한다.
6. 센서 경보 preset이 활성화되어 있고 상품추천 preset이 준비 중 상태인지 확인한다.
7. 기본값이 `N = 10,000`, 기저율 `1%`, 민감도 `95%`, 오경보율 `5%`인지 확인한다.
8. 기본 자연빈도에 `95`, `495`, `9,900` 등이 표시되는지 확인한다.
9. 2×2 빈도표가 버튼 한 번으로 정답값을 공개하지 않는지 확인한다.
10. 분자와 분모를 입력해야 `내 계산 확인` 결과가 표시되는지 확인한다.
11. iPad A16 가로 `1180×820`에서 PDF와 도구가 함께 보이는지 확인한다.
12. iPad A16 세로 `820×1180`에서 `학습지 보기`와 `도구 보기`가 서로 전환되는지 확인한다.
13. 화면 어디에도 최종 대응안 추천이나 Q8 정답 문장이 없는지 확인한다.
14. 개발자 도구 콘솔에 앱 코드 오류가 없는지 확인한다.
