/* 4컷 만화: 장면을 차례로 확대한다. 기준 구현의 comic.js를 만화 두 종류(M1 센서등, M3 계단 전등)에 맞게 고쳤다(명세서 §3-1, §8).
   <div class="comic" data-comic="m3" data-src="img/m3_stair_light_color.jpg"> 뒤에 data-panel이 붙은 빈 fragment를 두면,
   보이는 fragment 가운데 가장 뒤의 data-panel 값이 현재 장면이 된다(0은 전체 보기).
   data-fixed="4"를 붙이면 그 장면에 머문다.
   칸 좌표는 흑백 원본 그림으로 잰 값이다. 채색본은 같은 칸 자리에 넣어 만들었으므로 그대로 맞는다(명세서 §8-1). */
const COMICS = {
  /* M1 센서등(1200×1200). 테두리 3~4px */
  m1: {
    size: [1200, 1200],
    panels: [null, [6, 6, 595, 595], [605, 6, 1194, 595], [6, 604, 595, 1192], [605, 604, 1194, 1192]],
    /* 덧그림(명세서 §8-5): ① 켜진 등의 빛(점선 안쪽 사다리꼴)이 은은하게 밝아졌다 어두워짐, ③ 별 반짝임.
       좌표는 채색 합본(img/m1_sensor_light_color.jpg)에서 빛·별 화소로 잰 값(2026-10-27) */
    overlay: '<g class="fx fx-1"><polygon class="glow" points="318,110 397,110 506,446 205,446"/></g>' +
      '<g class="fx fx-3"><path class="star" d="M165 639L168.3 646.7L176 650L168.3 653.3L165 661L161.7 653.3L154 650L161.7 646.7Z" style="animation-delay:0s"/><path class="star" d="M138.5 708.5L141.2 714.8L147.5 717.5L141.2 720.2L138.5 726.5L135.8 720.2L129.5 717.5L135.8 714.8Z" style="animation-delay:0.5s"/><path class="star" d="M37 729L39.4 734.6L45 737L39.4 739.4L37 745L34.6 739.4L29 737L34.6 734.6Z" style="animation-delay:1.1s"/></g>',
  },
  /* M3 계단 전등(1200×1200). 테두리 5~6px */
  m3: {
    size: [1200, 1200],
    panels: [null, [6, 6, 595, 595], [604, 6, 1193, 595], [6, 605, 595, 1193], [604, 605, 1193, 1193]],
    /* 덧그림(명세서 §8-5): ①④ 켜진 전등의 빛(점선 안쪽 사다리꼴)이 은은하게 밝아졌다 어두워짐. 좌표는 채색 합본에서 잰 값 */
    overlay: '<g class="fx fx-1"><polygon class="glow" points="281,112 317,112 391,221 205,221"/></g>' +
      '<g class="fx fx-4"><polygon class="glow" points="879,712 919,712 987,821 807,821"/></g>',
  },
};

const comicOf = (el) => COMICS[el.dataset.comic] || COMICS.m3;

function comicTransform(el, i) {
  const { size: [W, H], panels } = comicOf(el);
  if (!i) return { t: 'translate(0%, 0%) scale(1)', o: '50% 50%' };
  const [x0, y0, x1, y1] = panels[i];
  const pw = x1 - x0, ph = y1 - y0, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const s = Math.max(W / pw, H / ph) * 1.01;   // 칸이 화면을 채우게(옆 칸이 비치지 않게)
  const tx = (0.5 - s * cx / W) * 100, ty = (0.5 - s * cy / H) * 100;
  return { t: `translate(${tx.toFixed(3)}%, ${ty.toFixed(3)}%) scale(${s.toFixed(4)})`, o: `${(cx / W * 100).toFixed(2)}% ${(cy / H * 100).toFixed(2)}%` };
}

function mountComics() {
  document.querySelectorAll('.comic[data-src]').forEach((el) => {
    const c = comicOf(el);
    el.style.setProperty('--comic-ar', `${c.size[0]} / ${c.size[1]}`);
    el.innerHTML = `<div class="cam"><div class="life warpbox">
      <img src="${el.dataset.src}" alt="${el.dataset.alt || ''}" draggable="false">
      <canvas class="warp" data-warp="comic-${el.dataset.comic || 'm3'}"${el.dataset.layer ? ` data-layer="${el.dataset.layer}"` : ''} aria-hidden="true"></canvas>
      <svg class="fxlayer" viewBox="0 0 ${c.size[0]} ${c.size[1]}" aria-hidden="true">${c.overlay}</svg>
    </div></div>`;
    setComicPanel(el, +el.dataset.fixed || 0);
  });
}

function setComicPanel(el, i) {
  const { t, o } = comicTransform(el, i);
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
