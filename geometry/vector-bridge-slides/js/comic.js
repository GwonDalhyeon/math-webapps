/* 4컷 만화: 장면을 차례로 확대하고, 확대된 장면 안의 인물·물체만 짧게 반복해 움직인다(js/warp.js의 comic).
   <div class="comic" data-src="..."> 뒤에 data-panel이 붙은 빈 fragment를 두면,
   보이는 fragment 가운데 가장 뒤의 data-panel 값이 현재 장면이 된다(0은 전체 보기).
   data-fixed="4"를 붙이면 그 장면에 머문다(마무리 화면에서 넷째 칸을 다시 볼 때). */
const COMIC = {
  size: [1536, 1024],
  /* 칸 테두리를 포함한 사각형 [x0, y0, x1, y1] (원본 이미지 픽셀) */
  panels: [null, [6, 4, 764, 480], [773, 4, 1530, 480], [6, 488, 764, 1016], [773, 488, 1530, 1016]],
  /* 장면별 덧그림(원본 이미지 좌표). 힘의 방향을 알려 주는 화살표는 넣지 않는다 */
  overlay: `
    <g class="fx fx-1">
      <path class="spark s1" d="M516 160 l5 14 l14 5 l-14 5 l-5 14 l-5 -14 l-14 -5 l14 -5 Z"/>
      <path class="spark s2" d="M500 214 l3 9 l9 3 l-9 3 l-3 9 l-3 -9 l-9 -3 l9 -3 Z"/>
      <path class="spark s3" d="M532 246 l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3 l8 -3 Z"/>
    </g>
    <g class="fx fx-3">
      <path class="burst" d="M432 742 l16 -22 M446 750 l24 -14 M452 764 l26 -4"/>
    </g>
    <g class="fx fx-4">
      <path class="drop" d="M1004 632 q-7 12 0 16 q7 -4 0 -16 Z"/>
    </g>`,
};

function comicTransform(i) {
  const [W, H] = COMIC.size;
  if (!i) return { t: 'translate(0%, 0%) scale(1)', o: '50% 50%' };
  const [x0, y0, x1, y1] = COMIC.panels[i];
  const pw = x1 - x0, ph = y1 - y0, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const s = Math.max(W / pw, H / ph) * 1.01;   // 칸이 화면을 채우게(옆 칸이 비치지 않게)
  const tx = (0.5 - s * cx / W) * 100, ty = (0.5 - s * cy / H) * 100;
  return { t: `translate(${tx.toFixed(3)}%, ${ty.toFixed(3)}%) scale(${s.toFixed(4)})`, o: `${(cx / W * 100).toFixed(2)}% ${(cy / H * 100).toFixed(2)}%` };
}

function mountComics() {
  document.querySelectorAll('.comic[data-src]').forEach((el) => {
    el.innerHTML = `<div class="cam"><div class="life warpbox">
      <img src="${el.dataset.src}" alt="${el.dataset.alt || ''}" draggable="false">
      <canvas class="warp" data-warp="comic"${el.dataset.layer ? ` data-layer="${el.dataset.layer}"` : ''} aria-hidden="true"></canvas>
      <svg class="fxlayer" viewBox="0 0 ${COMIC.size[0]} ${COMIC.size[1]}" aria-hidden="true">${COMIC.overlay}</svg>
    </div></div>`;
    setComicPanel(el, +el.dataset.fixed || 0);
  });
}

function setComicPanel(el, i) {
  const { t, o } = comicTransform(i);
  el.dataset.panel = i;
  el.querySelector('.cam').style.transform = t;
  el.querySelector('.life').style.transformOrigin = o;
}

function syncComics() {
  const slide = Reveal.getCurrentSlide();
  slide.querySelectorAll('.comic').forEach((el) => {
    let i = +el.dataset.fixed || 0;
    slide.querySelectorAll('.fragment[data-panel].visible').forEach((f) => { i = Math.max(i, +f.dataset.panel); });
    if (+el.dataset.panel !== i) setComicPanel(el, i);
  });
}
