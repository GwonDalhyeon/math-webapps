/* 삽화 안의 일부만 움직이기 (WebGL 변위 지도).
   그림을 조각내지 않고, 화면의 각 점이 원본의 어느 점을 보여 줄지(변위)를 수식으로 정한다.
   배경이 단색에 가까운 그림이라 움직일 부분만 움직이는 것처럼 보인다.
   - <div class="warpbox"><img ...><canvas class="warp" data-warp="이름" [data-layer="물체 층 그림"]></canvas></div>
   - 물체 층(data-layer): 알파 = 움직일 물체, RGB = 물체를 지운 배경. 이것이 있으면 배경은 두고 물체만 옮길 수 있다(셰이더의 shade)
     (도입 만화는 js/comic.js가 같은 구조를 만들고, 현재 장면 번호를 uniform panel로 넘긴다)
   - WebGL을 쓸 수 없거나(file://로 연 경우 포함) 오류가 나면 캔버스를 숨기고 원래 그림을 그대로 보여 준다.
   - 현재 화면에 있을 때만 움직인다. 주소에 ?warp=0~1 을 붙이면 그 단계에서 멈춘다(검수용).
   좌표는 원본 이미지 픽셀, y는 아래 방향. disp(p)만큼 내용이 움직인다.
   기준 구현(벡터 구조물 수업)의 엔진을 그대로 쓰고, 그림별 변위(WARPS)만 이 수업에 맞게 새로 쓴다(명세서 §3). */

const WARP_COMMON = `
precision mediump float;
uniform sampler2D tex; uniform sampler2D layer; uniform vec2 size; uniform float ph; uniform float tm; uniform float panel;
varying vec2 uv;
float win(float v, float a, float b, float f) { return smoothstep(a - f, a, v) * (1.0 - smoothstep(b, b + f, v)); }
float ell(vec2 p, vec2 c, vec2 r, float f) { return 1.0 - smoothstep(1.0 - f, 1.0, length((p - c) / r)); }
float on(float k) { return 1.0 - step(0.5, abs(panel - k)); }
float tanh_(float x) { float e = exp(2.0 * clamp(x, -4.0, 4.0)); return (e - 1.0) / (e + 1.0); }
`;

/* 그림별 변위 함수. 키는 canvas의 data-warp 값이다(만화는 js/comic.js가 'comic-m1', 'comic-m3'로 붙인다).
   명세서 §8-5의 warp 세 장면 가운데 M1 ② 구름만 쓴다. M2 카드와 M3 ③ 손가락은 움직일 물체 바로 뒤에
   단색 면이 아닌 도어락·스위치 판이 있어 그 선까지 함께 휘므로 뺐다(§8-5 「어색하면 뺀다」). */
const WARPS = {
  /* M1 ② 낮: 구름(합본 좌표 x 707~805, y 121~171)이 하늘 안에서 오른쪽으로 최대 5px 흐른다.
     타원 창(가운데 756,146, 반지름 70×34, 가장자리 20% 흐림)은 하늘 단색 안에만 있어 창 둘레가 티 나지 않는다 */
  'comic-m1': `vec2 disp(vec2 p) { return vec2(5.0 * ph, 0.0) * ell(p, vec2(756.0, 146.0), vec2(70.0, 34.0), 0.2); }`,
};

function makeWarp(canvas, layerImg) {
  const field = WARPS[canvas.dataset.warp];
  const img = canvas.parentElement.querySelector('img');
  const gl = field && canvas.getContext('webgl', { premultipliedAlpha: false, preserveDrawingBuffer: true });
  if (!gl) return null;
  const sh = (type, src) => {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, 'attribute vec2 a; varying vec2 uv; void main(){ uv = a * 0.5 + 0.5; uv.y = 1.0 - uv.y; gl_Position = vec4(a, 0.0, 1.0); }'));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, WARP_COMMON + field +
    (/vec4 shade\(/.test(field) ? 'void main(){ gl_FragColor = shade(uv * size); }'
      : 'void main(){ vec2 p = uv * size; vec2 q = clamp(p - disp(p), vec2(0.5), size - 0.5); gl_FragColor = texture2D(tex, q / size); }')));
  gl.linkProgram(prog); gl.useProgram(prog);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
  [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach((k) => gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);   // file://에서는 여기서 보안 오류
  gl.uniform1i(gl.getUniformLocation(prog, 'tex'), 0);
  if (layerImg) {   // 물체 층: 텍스처 1번
    gl.activeTexture(gl.TEXTURE1);
    const t2 = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t2);
    [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach((k) => gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, layerImg);
    gl.uniform1i(gl.getUniformLocation(prog, 'layer'), 1);
    gl.activeTexture(gl.TEXTURE0);
  }
  canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.uniform2f(gl.getUniformLocation(prog, 'size'), canvas.width, canvas.height);
  const uPh = gl.getUniformLocation(prog, 'ph'), uTm = gl.getUniformLocation(prog, 'tm'), uPanel = gl.getUniformLocation(prog, 'panel');
  const comic = canvas.closest('.comic');
  return (ph, tm) => { gl.uniform1f(uPh, ph); gl.uniform1f(uTm, tm); gl.uniform1f(uPanel, comic ? +comic.dataset.panel || 0 : 0); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); };
}

function mountWarps() {
  const fixed = new URLSearchParams(location.search).get('warp');
  const PERIOD = 2.8;   // 초: 움직였다 돌아오는 한 번
  const items = [];
  document.querySelectorAll('canvas.warp[data-warp]').forEach((canvas) => {
    const img = canvas.parentElement.querySelector('img');
    const start = () => {
      try {
        const draw = makeWarp(canvas, layerImg);
        if (!draw) return;
        items.push({ canvas, draw });
        canvas.parentElement.classList.add('live');
        draw(fixed !== null ? +fixed : 0, 0);
      } catch (e) { console.warn('warp off:', e.message); }
    };
    /* data-layer가 있으면 물체 층 그림도 받은 뒤 시작한다 */
    let layerImg = null;
    const ready = [new Promise((r) => (img.complete && img.naturalWidth ? r() : img.addEventListener('load', r, { once: true })))];
    if (canvas.dataset.layer) {
      layerImg = new Image(); layerImg.src = canvas.dataset.layer;
      ready.push(new Promise((r) => { layerImg.onload = r; layerImg.onerror = () => { layerImg = null; r(); }; }));
    }
    Promise.all(ready).then(start);
  });
  if (fixed !== null) { setInterval(() => items.forEach((it) => it.draw(+fixed, 0)), 300); return; }   // 검수용: 장면 번호가 바뀌어도 다시 그린다
  const t0 = performance.now();
  const loop = (now) => {
    const t = (now - t0) / 1000, slide = window.Reveal && Reveal.getCurrentSlide();
    /* 0 → 1 → 0을 부드럽게 오가고, 끝에서 잠깐 멈춘다 */
    const c = (t % PERIOD) / PERIOD, ph = Math.min(1, Math.max(0, 0.5 - 0.62 * Math.cos(2 * Math.PI * c)));
    for (const it of items) if (slide && slide.contains(it.canvas)) it.draw(ph, t);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
