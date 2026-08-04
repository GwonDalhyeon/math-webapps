# MediaPipe Tasks for Web

카메라로 손·몸·얼굴을 인식하는 웹앱에서 사용한다. 제작 기준은
`docs/agent-guides/camera-webapp.md`에 있다.

- Version: `@mediapipe/tasks-vision@1.0.1`
- Source: <https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/>
- License: Apache-2.0
- 모델 Source: <https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker>

## 파일 목록과 크기

| 파일 | 크기 | 설명 |
| --- | --- | --- |
| `tasks-vision/vision_bundle.mjs` | 152 KB | ES 모듈 번들. `FilesetResolver`, `HandLandmarker`, `DrawingUtils` 등을 내보낸다 |
| `tasks-vision/wasm/vision_wasm_internal.js` | 316 KB | SIMD 지원 브라우저용 로더 |
| `tasks-vision/wasm/vision_wasm_internal.wasm` | 11.2 MB | SIMD 지원 브라우저용 런타임 |
| `tasks-vision/wasm/vision_wasm_nosimd_internal.js` | 316 KB | SIMD 미지원 브라우저용 로더 |
| `tasks-vision/wasm/vision_wasm_nosimd_internal.wasm` | 10.5 MB | SIMD 미지원 브라우저용 런타임 |
| `models/hand_landmarker.task` | 7.5 MB | 손 랜드마크 21점 모델 (float16) |

`FilesetResolver.forVisionTasks(path)`가 브라우저의 SIMD 지원 여부를 확인해
`vision_wasm_internal` 또는 `vision_wasm_nosimd_internal` 중 **하나만** 내려받는다.
두 벌을 모두 두어도 학생 기기가 받는 양은 한 벌뿐이다.

**한 기기가 처음 받는 양은 손 인식 기준 약 19 MB이다**(WASM 11.2 MB + 모델 7.5 MB +
번들 152 KB). 학급 전체가 동시에 처음 접속하면 이만큼이 한꺼번에 나가므로,
로딩 진행 표시와 "처음 한 번만 받습니다" 안내를 반드시 넣는다.

## 사용법

`<subject>/<app>/index.html`에서 상대경로로 불러온다.

```html
<script type="module">
  import {
    FilesetResolver,
    HandLandmarker,
  } from "../../assets/vendor/mediapipe/tasks-vision/vision_bundle.mjs";

  const fileset = await FilesetResolver.forVisionTasks(
    "../../assets/vendor/mediapipe/tasks-vision/wasm"
  );

  const handLandmarker = await HandLandmarker.createFromOptions(fileset, {
    baseOptions: {
      modelAssetPath: "../../assets/vendor/mediapipe/models/hand_landmarker.task",
      delegate: "GPU", // 느리면 "CPU"로 바꿔 비교한다
    },
    runningMode: "VIDEO",
    numHands: 2,
  });

  // 매 프레임: handLandmarker.detectForVideo(videoElement, performance.now())
</script>
```

`forVisionTasks`에 넘기는 경로는 `wasm` **폴더**까지다. 파일명은 라이브러리가 붙인다.

## 다른 모델을 추가할 때

모델(`.task`)만 `models/` 아래에 받고 이 표에 파일명·크기·용도를 적는다.
WASM과 번들은 모든 vision task가 공유하므로 다시 받지 않는다.

```powershell
$dest = 'assets/vendor/mediapipe/models/pose_landmarker_lite.task'
$uri  = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'
Invoke-WebRequest -Uri $uri -OutFile $dest -UseBasicParsing
```

`camera-webapp.md` 기준에 따라 **처음 화면에서 쓰지 않는 모델은 미리 받지 않는다.**
손으로 시작하는 앱이면 손 모델만 먼저 받고, 전신이 필요한 화면에서 추가로 받는다.

## 로컬 테스트

ES 모듈과 `getUserMedia`는 `file://`에서 동작하지 않는다. HTTP로 띄운다.

```bash
python -m http.server 8000
```

카메라는 `localhost`에서는 보안 컨텍스트로 취급되어 권한 요청이 정상 동작한다.
