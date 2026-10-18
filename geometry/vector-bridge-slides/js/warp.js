/* 삽화 안의 일부만 움직이기 (WebGL 변위 지도).
   그림을 조각내지 않고, 화면의 각 점이 원본의 어느 점을 보여 줄지(변위)를 수식으로 정한다.
   배경이 단색에 가까운 그림이라 빨대·손·사다리 다리처럼 움직일 부분만 움직이는 것처럼 보인다.
   - <div class="warpbox"><img ...><canvas class="warp" data-warp="이름" [data-layer="물체 층 그림"]></canvas></div>
   - 물체 층(data-layer): 알파 = 움직일 물체, RGB = 물체를 지운 배경. 이것이 있으면 배경은 두고 물체만 옮길 수 있다(셰이더의 shade)
     (도입 만화는 js/comic.js가 같은 구조를 만들고, 현재 장면 번호를 uniform panel로 넘긴다)
   - WebGL을 쓸 수 없거나(file://로 연 경우 포함) 오류가 나면 캔버스를 숨기고 원래 그림을 그대로 보여 준다.
   - 현재 화면에 있을 때만 움직인다. 주소에 ?warp=0~1 을 붙이면 그 단계에서 멈춘다(검수용).
   좌표는 원본 이미지 픽셀(1600×800), y는 아래 방향. disp(p)만큼 내용이 움직인다. */

const WARP_COMMON = `
precision mediump float;
uniform sampler2D tex; uniform sampler2D layer; uniform vec2 size; uniform float ph; uniform float tm; uniform float panel;
varying vec2 uv;
float win(float v, float a, float b, float f) { return smoothstep(a - f, a, v) * (1.0 - smoothstep(b, b + f, v)); }
float ell(vec2 p, vec2 c, vec2 r, float f) { return 1.0 - smoothstep(1.0 - f, 1.0, length((p - c) / r)); }
float on(float k) { return 1.0 - step(0.5, abs(panel - k)); }
float tanh_(float x) { float e = exp(2.0 * clamp(x, -4.0, 4.0)); return (e - 1.0) / (e + 1.0); }
`;

const WARPS = {
  /* 도입 4컷(1536×1024): 확대된 장면만 움직인다(panel 1~4, 0이면 정지).
     1컷 엄지척 손이 까딱, 2컷 위 추를 아래 추 위로 내려놓음, 3컷 휜 위쪽 막대가 더 처짐,
     4컷 왼쪽 아래·오른쪽 위 캐릭터는 공(이음점) 쪽으로 밀고, 오른쪽 아래 캐릭터는 줄을 바깥으로 당긴다. */
  comic: `
/* 1~3컷: img/c0_intro_layer.png(알파 = 움직일 물체, RGB = 물체를 지운 배경)를 써서
   배경은 그대로 두고 물체만 옮겨 그린다(tools/make_layers.py). */
vec2 dispObj(vec2 p) {
  vec2 d = vec2(0.0);
  // 1컷: 엄지척 손이 손목(556, 272)을 축으로 살짝 까딱
  float th = -0.09 * ph * on(1.0);
  vec2 r = p - vec2(556.0, 272.0);
  d += (vec2(cos(th) * r.x - sin(th) * r.y, sin(th) * r.x + cos(th) * r.y) - r);
  // 2컷: 위 추와 손이 아래 추 쪽으로 내려앉음(소매 쪽은 덜)
  d.y += 5.0 * ph * smoothstep(934.0, 975.0, p.x) * on(2.0);
  // 3컷: 휜 위쪽 빨대가 출렁임(양 끝 이음점은 고정)
  d.y += 5.0 * ph * sin(3.14159 * clamp((p.x - 366.0) / 122.0, 0.0, 1.0)) * on(3.0);
  return d;
}
/* 4컷: 왼쪽 아래·오른쪽 위 캐릭터는 공(이음점) 쪽으로 밀고, 오른쪽 아래 캐릭터는 줄을 바깥으로 당긴다 */
vec2 disp(vec2 p) {
  vec2 d = vec2(0.0);
  d += vec2(0.72, -0.69) * 8.0 * ph * ell(p, vec2(960.0, 800.0), vec2(82.0, 125.0), 0.45);
  d += vec2(-1.0, 0.0) * 9.0 * ph * ell(p, vec2(1232.0, 668.0), vec2(95.0, 85.0), 0.45);
  d += vec2(0.71, 0.70) * 9.0 * ph * ell(p, vec2(1300.0, 850.0), vec2(90.0, 95.0), 0.45);
  d.x += 1.6 * sin(tm * 30.0) * ph * ell(p, vec2(1058.0, 660.0), vec2(58.0, 58.0), 0.3);
  return d;
}
vec4 shade(vec2 p) {
  vec2 lo = vec2(0.5), hi = size - 0.5;
  if (on(4.0) > 0.5) return texture2D(tex, clamp(p - disp(p), lo, hi) / size);
  vec2 q = clamp(p - dispObj(p), lo, hi);
  vec4 L = texture2D(layer, p / size);
  vec3 back = mix(texture2D(tex, p / size).rgb, L.rgb, L.a);          // 물체가 비운 자리는 지운 배경
  float a = texture2D(layer, q / size).a;                               // 옮겨 온 물체가 덮는 정도
  return vec4(mix(back, texture2D(tex, q / size).rgb, a), 1.0);
}`,
  /* 빨대: 왼쪽 칸은 두 손이 바깥으로 당겨 빨대가 늘어나려 하고,
     오른쪽 칸은 두 손이 안쪽으로 밀어 빨대가 줄어들며 더 휜다. */
  tcstraw: `
vec2 disp(vec2 p) {
  vec2 d = vec2(0.0);
  // 왼쪽 칸(당김): 가로로 늘림. 칸 테두리에서는 0
  float eL = smoothstep(14.0, 60.0, p.x) * (1.0 - smoothstep(746.0, 792.0, p.x));
  d.x += 0.034 * ph * (p.x - 403.0) * win(p.y, 268.0, 442.0, 26.0) * eL;
  // 오른쪽 칸(누름): 가로로 줄이고, 가운데를 아래로 더 휘게
  float eR = smoothstep(808.0, 852.0, p.x) * (1.0 - smoothstep(1543.0, 1587.0, p.x));
  d.x -= 0.028 * ph * (p.x - 1197.0) * win(p.y, 262.0, 456.0, 26.0) * eR;
  float s = clamp((p.x - 930.0) / 530.0, 0.0, 1.0);
  d.y += 15.0 * ph * sin(3.14159 * s) * win(p.y, 318.0, 528.0, 30.0) * eR;
  return d;
}`,
  /* 사다리: 왼쪽 칸은 미끄러운 바닥에서 두 다리가 꼭대기를 축으로 바깥으로 벌어지고 상자가 내려앉는다.
     오른쪽 칸은 다리가 벌어지려다 줄에 막혀 아주 조금만 움직이고 줄이 팽팽하게 떤다.
     바닥 아래 반사는 거울처럼 같이 움직인다. 학생 쪽은 움직이지 않는다. */
  ladder: `
vec2 disp(vec2 p) {
  vec2 d = vec2(0.0);
  float floorY = 668.0, topY = 195.0;
  float refl = step(floorY, p.y);
  float yy = mix(p.y, 2.0 * floorY - p.y, refl);
  float depth = clamp((yy - topY) / (floorY - topY), 0.0, 1.0);
  float edgeY = smoothstep(14.0, 44.0, p.y) * (1.0 - smoothstep(760.0, 788.0, p.y));
  // 왼쪽 칸
  // 움직이는 영역의 오른쪽 경계: 오른쪽 다리 선을 따라 70px 바깥(학생의 손·발은 밖에 둔다)
  float legR = 415.0 + 170.0 * clamp((yy - topY) / (floorY - topY), 0.0, 1.0);
  float xlim = mix(max(560.0, legR + 70.0), 645.0, smoothstep(585.0, 610.0, yy));
  float mL = smoothstep(12.0, 40.0, p.x) * (1.0 - smoothstep(xlim - 24.0, xlim, p.x)) * edgeY;
  d.x += 20.0 * ph * depth * tanh_((p.x - 390.0) / 45.0) * mL;
  d.y += 9.0 * ph * (1.0 - depth) * (1.0 - 2.0 * refl) * mL;
  // 오른쪽 칸: 벌어지려다 멈춤 + 줄 떨림
  float legR2 = 1205.0 + 170.0 * clamp((yy - topY) / (floorY - topY), 0.0, 1.0);
  float xlimR = mix(max(1330.0, legR2 + 60.0), 1415.0, smoothstep(585.0, 610.0, yy));
  float mR = smoothstep(808.0, 836.0, p.x) * (1.0 - smoothstep(xlimR - 24.0, xlimR, p.x)) * edgeY;
  float tremble = ph * (1.0 + 0.35 * sin(tm * 38.0));
  d.x += 2.6 * tremble * depth * tanh_((p.x - 1180.0) / 45.0) * mR;
  float sr = clamp((p.x - 1000.0) / 350.0, 0.0, 1.0);
  d.y += 2.2 * ph * sin(tm * 42.0) * sin(3.14159 * sr) * win(p.y, 540.0, 580.0, 10.0) * mR;
  return d;
}`,
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
