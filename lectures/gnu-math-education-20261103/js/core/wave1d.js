/* 1차원 줄의 정확한 해와 계산 (원고 scripts/make_figures.py와 같은 식).
   단위: 줄 길이 L = 1, 파동 속도 c = 1. 양 끝은 묶여 있다(u(0) = u(1) = 0). */
(function (root) {
  const PI = Math.PI;

  /* sin(nπx)를 가만히 놓은 줄: 모양 그대로 cos(nπt)배. 시간 주기 2/n */
  const uSine = (n, x, t) => Math.sin(n * PI * x) * Math.cos(n * PI * t);

  /* 일부만 볼록한 봉우리(상상 실험): 중심 0.35, 반폭 0.15, cos⁴ */
  const X0 = 0.35, W = 0.15, K = PI / (2 * W);
  function bump(x) {
    const s = x - X0;
    if (Math.abs(s) >= W) return 0;
    return Math.cos(K * s) ** 4;
  }

  /* [0,1]의 f를 홀수·주기 2로 늘인다(묶인 끝에서 뒤집혀 돌아오는 것을 나타냄) */
  function oddPeriodic(f) {
    return (s) => {
      s = ((s % 2) + 2) % 2;
      return s <= 1 ? f(s) : -f(2 - s);
    };
  }
  const FB = oddPeriodic(bump);
  /* d'Alembert 해: 반쪽씩 나뉘어 양쪽으로 이동 */
  const uBump = (x, t) => 0.5 * (FB(x - t) + FB(x + t));

  /* 왼쪽 끝을 진폭 0.3, 진동수 2.15로 흔드는 줄(오른쪽 끝은 묶임) */
  const SH_A = 0.3, SH_F = 2.15;
  const shakeG = (t) => (t > 0 ? SH_A * Math.sin(2 * PI * SH_F * t) : 0);
  function uShake(x, t) {
    let u = 0;
    for (let k = 0; k < 4; k++) u += shakeG(t - x - 2 * k) - shakeG(t + x - 2 - 2 * k);
    return u;
  }

  /* 중심차분(③의 방법): 다음 = 2·지금 − 조금 전 + r²(이웃 합 − 2·지금). 첫 걸음은 보정 절반(처음 속도 0) */
  function leapfrog(N, r, steps, init) {
    const u0 = Array.from({ length: N + 1 }, (_, i) => init(i / N));
    u0[0] = u0[N] = 0;
    const r2 = r * r;
    const u1 = u0.map((v, i) => (i === 0 || i === N ? 0 : v + 0.5 * r2 * (u0[i + 1] - 2 * v + u0[i - 1])));
    const hist = [u0, u1];
    for (let s = 1; s < steps; s++) {
      const a = hist[hist.length - 2], b = hist[hist.length - 1];
      hist.push(b.map((v, i) => (i === 0 || i === N ? 0 : 2 * v - a[i] + r2 * (b[i + 1] - 2 * v + b[i - 1]))));
    }
    return hist;
  }

  const api = { uSine, bump, oddPeriodic, uBump, shakeG, uShake, leapfrog, X0, W };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Wave1D = api;
})(typeof window !== 'undefined' ? window : globalThis);
