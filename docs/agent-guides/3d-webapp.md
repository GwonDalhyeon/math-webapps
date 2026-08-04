# 3D 수학·물리 웹앱 제작 기준

공간도형, 공간벡터, 빛의 반사, 태양계 중력과 스윙바이처럼 3차원 시각화가 필요한 웹앱을 만들 때 읽는다.

이 문서는 `webapp.md`를 대체하지 않는다. 학습 목표, 화면 배치, 조작 버튼 체계, iPad A16 검증 기준은 `webapp.md`와 `verification.md`를 그대로 따르고, 여기서는 3D 전용 기술 규칙만 다룬다.

---

## 1. 이미 저장소에 있는 도구

`npm install`도 빌드도 하지 않는다. 필요한 라이브러리는 `assets/vendor/`에 파일로 들어 있고, importmap으로 연결한다.

`assets/vendor/three/` (three.js r184, MIT):

```text
three.module.js          WebGL 렌더러 + 코어 전체 재수출 → importmap의 "three"는 여기에 연결한다
three.core.js            코어 클래스 (three.module.js가 내부에서 import한다)
addons/
├─ controls/
│  ├─ OrbitControls.js       카메라 회전·확대 (마우스 + 터치)
│  └─ TransformControls.js   도형을 직접 잡아 이동·회전·크기 변경
├─ renderers/
│  └─ CSS2DRenderer.js       3D 좌표에 HTML 라벨 부착 (CSS2DObject 포함)
└─ lines/
   ├─ Line2.js               굵은 선 (기본 Line은 굵기가 1px로 고정된다)
   ├─ LineGeometry.js
   ├─ LineSegments2.js
   ├─ LineSegmentsGeometry.js
   └─ LineMaterial.js
OrbitControls.js         (구버전 경로, 기존 앱 호환용. 새 앱은 addons/controls/를 쓴다)
```

이 목록에 없는 three.js addon이 필요하면, r184의 같은 파일을 `assets/vendor/three/addons/` 아래 **원래 폴더 구조 그대로** 내려받아 추가한다. addon 파일끼리 `./LineMaterial.js` 같은 상대경로로 서로를 import하므로, 폴더 구조를 무너뜨리면 로드가 깨진다.

수식은 MathJax CDN, 2D 그래프는 Chart.js CDN을 쓴다. 저장소에서 이미 쓰는 것과 같은 것을 쓰고, KaTeX나 Plotly.js를 새로 도입하지 않는다.

---

## 2. 기본 골격

```html
<script type="importmap">
{
  "imports": {
    "three": "../../assets/vendor/three/three.module.js",
    "three/addons/": "../../assets/vendor/three/addons/"
  }
}
</script>

<script type="module">
  import * as THREE from "three";
  import { OrbitControls } from "three/addons/controls/OrbitControls.js";
  import { CSS2DRenderer, CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
</script>
```

`"three/addons/"`는 끝의 슬래시까지 정확히 써야 접두사 매핑으로 동작한다. 경로 `../../`는 `<과목>/<앱>/index.html` 기준이며, 폴더 깊이가 다르면 맞게 고친다.

ES module과 importmap은 `file://`로 열면 CORS 때문에 실패한다. 로컬 확인은 반드시 HTTP 서버로 한다.

```bash
python -m http.server 8000
```

---

## 3. 코드 구조

- 수학·물리 계산 함수와 화면 렌더링 함수를 섞지 않는다. 계산 함수는 `THREE` 객체를 만들지 않고 숫자만 다루는 순수 함수로 두는 편이 검증하기 쉽다.
- 애니메이션은 `requestAnimationFrame`으로 구현하고, 정지 시 핸들을 `cancelAnimationFrame`으로 확실히 해제한다. 자동 실행 버튼을 여러 번 눌러도 루프가 중복되지 않아야 한다.
- 매 프레임 `new THREE.Vector3()`를 만들지 않는다. 재사용할 임시 벡터를 모듈 최상단에 한 번 만들어 두고 `.set()`으로 덮어쓴다.
- 단위와 좌표계를 파일 상단 주석에 적는다. 특히 태양계 앱은 길이 단위(AU/km), 시간 단위(일/초), 질량 단위를 명시한다.
- 타입 검사가 필요하면 TypeScript를 도입하지 말고 파일 첫 줄에 `// @ts-check`를 쓰고 JSDoc으로 주석을 단다. VS Code에서 검사와 자동완성을 받으면서 브라우저는 순수 JS로 실행한다.

---

## 4. 주제별 구현 지침

### 공간도형의 움직임

- 회전은 오일러각보다 `Quaternion`을 쓴다. 축과 각을 학생이 직접 지정하는 흐름이 회전축·회전각 개념과 맞다.
- 회전 전 도형을 반투명으로 남겨 회전 후와 함께 보여준다. 최종 상태만 보이면 "무엇이 어떻게 변했는지"가 사라진다.
- 꼭짓점 좌표는 `CSS2DObject` 라벨로 도형에 붙이고, 조작하면 즉시 갱신한다.
- `TransformControls`의 축 핸들은 iPad 터치로 정확히 집기 어렵다. **슬라이더나 수치 입력을 반드시 함께 제공한다.**
- 물리 엔진(cannon-es, matter-js, rapier)을 쓰지 않는다. 이동과 회전은 직접 계산한다.

### 공간벡터

- `Vector3`의 `add`, `sub`, `multiplyScalar`, `dot`, `cross`, `length`, `normalize`, `angleTo`, `projectOnVector`, `projectOnPlane`으로 교육과정 범위가 전부 처리된다.
- 벡터는 `ArrowHelper`로, 강조할 선은 `Line2`로 그린다.
- 3×3 역행렬·행렬식·연립방정식 정도는 직접 20~30줄로 작성한다. mathjs를 새로 도입하지 않는다.
- 계산 결과를 숫자로만 출력하지 말고, 화면의 벡터 그림과 MathJax 수식이 같은 값으로 동시에 갱신되게 한다.

### 빛의 반사

- 반사 방향은 `입사벡터.clone().reflect(단위법선)`으로 구한다. 결과는 $\vec r=\vec d-2(\vec d\cdot\vec n)\vec n$과 같다.
- 법선벡터를 화면에 항상 표시하고, 입사각과 반사각을 수치로 함께 보여준다. 두 각이 같다는 것이 관찰 대상이다.
- 기본 시각화는 메시 + `Raycaster`, 초점 성질을 정확히 보여줄 때는 곡면 방정식으로 교점과 법선을 직접 계산한다.
- `Raycaster`는 CPU에서 삼각형을 순회한다. **광선은 20~40개로 제한한다.** 수백 개를 쏘면 iPad에서 프레임이 떨어지고, 화면도 알아보기 어려워진다.
- 굴절, 렌즈, 파장별 분산은 이 앱에 섞지 않는다. 필요하면 별도 웹앱으로 만든다.

### 태양계 중력과 스윙바이

- 중력 가속도는 직접 적분한다. 물리 엔진은 강체 충돌용이므로 쓰지 않는다.

$$\vec a_i = G\sum_{j\neq i} m_j \frac{\vec r_j-\vec r_i}{\lvert \vec r_j-\vec r_i\rvert^{3}}$$

- **행성 반지름은 반드시 과장한다.** 1 AU는 약 $1.5\times10^{11}\,\text{m}$, 지구 반지름은 약 $6.4\times10^{6}\,\text{m}$로 비율이 2만 대 1을 넘어 실제 비율로는 행성이 화면에 보이지 않는다. 화면에 "크기는 실제 비율이 아님"을 명시한다.
- **위치·속도 계산은 렌더링과 분리한 별도 배열에서 한다.** three.js의 렌더 버퍼는 float32(유효숫자 약 7자리)라 큰 좌표에서 위치가 떨린다. 씬 단위는 AU 정도로 두고, 물리 계산은 JS `number`(float64) 배열로 유지한 뒤 렌더링 시점에 변환한다.
- 적분법은 Leapfrog 또는 Velocity Verlet을 쓴다. 다만 **근접통과에서 고정 시간 간격은 오차가 크게 튄다.** 행성까지 거리에 따라 `dt`를 줄이는 적응 스텝을 쓰거나, 최소 근접거리 하한을 둔다. 우주선이 비물리적으로 튕겨 나가면 이 문제다.
- 스윙바이 학습의 핵심은 "행성 기준 속력은 그대로인데 태양 기준 속력은 변한다"이다. **두 기준의 속력을 항상 나란히 표시한다.** 이 비교가 없으면 "중력으로 공짜 에너지를 얻는다"는 오개념이 남는다.
- 시간에 따른 속력·거리·에너지 변화는 Chart.js로 그린다. 궤도가 휘는 3D 화면과 그래프가 같은 시각을 가리키게 한다.
- 실제 NASA 궤도 데이터를 재현하려 하지 않는다. 학생이 접근 거리와 진입 속도를 바꿔 궤도 변화를 관찰하는 것이 학습 목표다.
- 초기조건을 수백 개 비교하는 계산은 Web Worker로 분리할 수 있다. Web Worker는 브라우저 기본 기능이라 설치가 필요 없지만, `file://`에서는 동작하지 않는다.

---

## 5. 3D 앱 완료 전 추가 점검

`verification.md`의 항목에 다음을 더한다.

- importmap 경로가 앱의 폴더 깊이와 맞는가?
- HTTP 서버로 열어 콘솔에 모듈 로드 오류가 없는가?
- `assets/vendor/`에 실제로 있는 파일만 import했는가?
- 자동 재생을 여러 번 눌러도 `requestAnimationFrame` 루프가 중복되지 않는가?
- 초기화 후 카메라, 도형 위치, 그래프, 라벨이 모두 처음 상태로 돌아오는가?
- iPad A16 가로 화면에서 3D 화면과 조작 영역이 함께 보이고, 터치로 카메라를 돌릴 수 있는가?
- 터치로 조작하기 어려운 기능에 슬라이더나 수치 입력 대안이 있는가?
- 3D 라벨(`CSS2DObject`) 개수가 과하지 않은가? 많으면 프레임이 떨어진다.
- 좌표축과 단위가 화면에 표시되어 있는가?
