# 학습지 PDF 변환 지침

이 문서는 학습지 Markdown을 PDF로 변환하거나, 페이지 수와 여백을 조정할 때 읽는다.

## 목표

학습지 PDF는 수업에서 바로 인쇄할 수 있어야 한다.

우선순위:

1. 목표 페이지 수를 지킨다.
2. 한글과 수식이 깨지지 않는다.
3. 여백이 과하지 않다.
4. 표와 빈칸이 잘리지 않는다.
5. 학생이 손으로 답을 쓸 공간이 남아 있다.

## 파일 위치

PDF는 원본 Markdown과 같은 웹앱 폴더에 둔다.

```text
probability-statistics/app-name/worksheet.md
probability-statistics/app-name/worksheet.pdf
probability-statistics/app-name/worksheet-teacher.md
probability-statistics/app-name/worksheet-teacher.pdf
probability-statistics/app-name/worksheet-short.md
probability-statistics/app-name/worksheet-short.pdf
probability-statistics/app-name/worksheet-short-teacher.md
probability-statistics/app-name/worksheet-short-teacher.pdf
```

## 페이지 수 기준

사용자가 명시한 페이지 수가 있으면 그 목표를 우선한다.

예:

- `worksheet-short.md` -> 1페이지
- `worksheet-short-teacher.md` -> 1페이지 또는 사용자가 지정한 페이지 수
- `worksheet.md` -> 2페이지
- `worksheet-teacher.md` -> 2페이지 또는 사용자가 지정한 페이지 수

페이지 수가 늘어나는 흔한 원인:

- 브라우저 기본 인쇄 여백이 큼
- 문단 간격과 코드블록 여백이 큼
- 표 셀 padding이 큼
- 한글 폰트가 예상보다 크게 렌더링됨
- Markdown을 HTML로 변환하면서 빈 줄이 과하게 반영됨

## 권장 여백

A4 기준:

- 일반 학습지: 상하좌우 7mm-10mm
- 1페이지 압축본: 상하좌우 6mm-8mm
- 여백이 더 필요하면 하단 페이지 번호 공간만 최소로 둔다.

브라우저 인쇄용 CSS 예:

```css
@page {
  size: A4;
  margin: 7mm 8mm;
}
```

## Markdown 원본과 PDF 산출물

원칙:

- 내용 수정이 필요 없으면 Markdown 원본은 건드리지 않는다.
- 페이지 수 조정은 인쇄 CSS, 변환 스크립트, PDF 레이아웃에서 처리한다.
- PDF만 다시 만들 때는 어떤 PDF를 덮어썼는지 최종 응답에 적는다.
- 학생용 PDF를 만들 때는 대응하는 교사용 PDF도 함께 만들거나, 만들지 못한 이유를 최종 응답에 적는다.
- 교사용 PDF는 예시답안 때문에 학생용보다 길어질 수 있다. 사용자가 같은 페이지 수를 명시한 경우에는 여백, 글자 크기, 문항 압축을 조정하되 가독성을 해치지 않는다.

## 수식 처리

학습지 Markdown의 모든 수식은 LaTeX 형식이어야 한다.

PDF 변환 시 다음을 확인한다.

- `$...$` 인라인 수식이 일반 텍스트처럼 깨지지 않는가
- `$$...$$` 별도 줄 수식의 줄바꿈이 자연스러운가
- 표 안의 수식이 셀을 넘치지 않는가
- 곱셈 기호 `\times`, 확률 기호 `P(X>c)`, 분포 표기 `X \sim B(n,p)`가 읽기 쉬운가

## 한글 폰트

Windows 환경에서는 다음 폰트를 우선 사용할 수 있다.

- `C:\Windows\Fonts\NanumGothic.ttf`
- `C:\Windows\Fonts\malgun.ttf`
- `C:\Windows\Fonts\malgunbd.ttf`

PDF에 한글이 깨지면 폰트를 명시해서 다시 변환한다.

## 검증

PDF 변환 후 확인한다.

- 목표 페이지 수가 맞는가
- 첫 페이지 제목과 이름 칸이 보이는가
- 마지막 페이지 끝 문항이 잘리지 않았는가
- 표 테두리와 셀 내용이 겹치지 않는가
- 빈칸이 답을 쓸 수 있을 만큼 남아 있는가
- 수식과 한글이 깨지지 않는가

가능하면 PDF 페이지 수를 도구로 확인한다.

```text
worksheet-short.pdf: 1페이지
worksheet-short-teacher.pdf: 1페이지 또는 지정 페이지 수
worksheet.pdf: 2페이지
worksheet-teacher.pdf: 2페이지 또는 지정 페이지 수
```

## 최종 보고

최종 응답에는 다음을 간단히 적는다.

- 다시 만든 PDF 파일 경로
- 확인된 페이지 수
- Markdown 원본 수정 여부
- 확인하지 못한 점이 있으면 그 이유
