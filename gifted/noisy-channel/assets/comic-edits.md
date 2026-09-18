# 만화 수정 기록 (2026-09-18)

명세서 §46 E09-1, E11-1의 사용자 승인에 따라 기본 제공 image_gen 도구로 기존 PNG를 편집했다. CLI/API는 사용하지 않았다. 결과를 눈으로 확인하고 앱의 대체 텍스트·대본과 맞췄다.

- [comic-2.png](comic-2.png): 6쪽 마지막 장면의 세 카드를 3시·2시·3시로 변경.
- [comic-3.png](comic-3.png): 16쪽 세 번째 장면의 말풍선과 자막을 ‘검사 통과’로 변경. 두 번째 장면 자막은 유지하며 검사 칸의 0/1 설명을 추가하지 않았다.

## 최종 프롬프트 — comic-2.png

Use case: text-localization. Edit target: attached Korean four-panel educational comic. Change ONLY the leftmost received card in panel 4 (bottom-right panel) from '1시' to '3시', making the three cards left to right '3시', '2시', '3시'. Preserve ALL other artwork, characters, layout, panels, Korean captions and speech bubbles exactly as in the original. Do not rewrite any other text. Keep square image and full borders.

## 최종 프롬프트 — comic-3.png

Use case: text-localization. Edit target: attached Korean four-panel classroom comic. Change ONLY two text areas in panel 3 (bottom-left): replace speech bubble text with exactly '짝수네. 검사를 통과했어.' (line breaks allowed); replace caption at bottom of panel 3 with exactly '짝수이면 검사를 통과합니다. 오류가 없다고 확신할 수 있을까요?' (two lines allowed). Preserve all remaining artwork, panel proportions, all dots and their counts, characters, colors, captions in panels 1, 2, 4 and every other word unchanged. Especially leave panel 2 caption unchanged. Maintain square full image and legible Korean typography.
