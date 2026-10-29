/* 발표 화면 공통 동작: 부품 그리기 → 수식 그리기 → reveal.js 시작 → 부품 동기화
   부품(js/parts/*.js)은 window.PARTS에 {name, mount(root), sync(slide), reset()}을 등록한다.
   기준 구현(gifted/slides/04/js/deck.js)의 방식을 따르고, 16:9와 발표자 화면 처리를 더했다(명세 0-2). */
(function () {
  const q = new URLSearchParams(location.search);
  if (q.get('embed')) document.documentElement.classList.add('embed');

  const PARTS = window.PARTS || [];
  const call = (fn, ...args) => PARTS.forEach((p) => {
    if (typeof p[fn] !== 'function') return;
    try { p[fn](...args); } catch (e) { console.error(`[${p.name}] ${fn}:`, e); }
  });

  call('mount', document);

  /* \htmlClass만 허용한다(식의 항과 그림을 함께 강조할 때, 명세 0-2) */
  renderMathInElement(document.body, {
    delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }],
    throwOnError: false, strict: false,
    trust: (c) => c.command === '\\htmlClass',
  });

  Reveal.initialize({
    width: 1280, height: 720, margin: 0.04,
    center: false, hash: true, history: false,
    controlsTutorial: false, transition: 'fade', transitionSpeed: 'fast', backgroundTransition: 'none',
    touch: true, help: true,
    controls: !q.get('embed'), progress: !q.get('embed'), slideNumber: q.get('embed') ? false : 'c/t',
    plugins: typeof RevealNotes !== 'undefined' ? [RevealNotes] : [],   // 공개판에는 notes 플러그인이 없다
  });

  /* 단원 탭: 화면은 가로 한 줄이고, 머리글(.crumb) 자리에 단원 탭과 단원 안의 위치 점을 둔다.
     탭을 누르면 그 단원 첫 화면으로 간다(2026-10-30, 위아래 넘기기를 없앰) */
  const SEC = [['들어가며', /^(d0|title)/], ['① 줄', /^(w0|u1)/], ['② 미분', /^(c0|u2)/], ['③ 계산', /^(f0|u3)/],
    ['④ 계산법', /^(m0|u4)/], ['⑤ 행렬', /^(l0|u5)/], ['⑥ 정사영', /^(p0|u6)/], ['⑦ 학습', /^(g0|end)/]];
  const slides = Reveal.getSlides();
  const secOf = (s) => SEC.findIndex(([, re]) => re.test(s.id));
  const first = SEC.map((_, k) => slides.find((s) => secOf(s) === k));
  slides.forEach((s) => {
    const cr = s.querySelector(':scope > .crumb'), k = secOf(s);
    if (!cr || k < 0) return;
    const mates = slides.filter((t) => secOf(t) === k);
    const code = (cr.textContent.match(/[A-Z]\d\d/) || [''])[0];
    const nav = document.createElement('nav');
    nav.className = 'tabs';
    nav.innerHTML = SEC.map(([name], j) => `<a href="#/${first[j].id}" class="${j === k ? 'on' : ''}${j >= 6 ? ' data' : ''}">${name}</a>`).join('')
      + `<span class="sid"><span class="dots">${mates.map((t) => `<i class="${t === s ? 'on' : ''}${t.querySelector('.crumb .ext') ? ' ext' : ''}"></i>`).join('')}</span>${code}${cr.querySelector('.ext') ? '<span class="ext">확장</span>' : ''}</span>`;
    cr.replaceWith(nav);
  });

  /* 남은 단계: 지금 화면에서 아직 열지 않은 단계(fragment) 수를 왼쪽 아래 구석에 작게 보인다(발표자 참고용) */
  const steps = document.createElement('div');
  steps.className = 'steps-left';
  document.querySelector('.reveal').appendChild(steps);
  const stepsLeft = () => {
    const s = Reveal.getCurrentSlide();
    if (!s) return;
    const key = (f) => f.getAttribute('data-fragment-index') ?? f;
    const all = new Set([...s.querySelectorAll('.fragment')].map(key)), shown = new Set([...s.querySelectorAll('.fragment.visible')].map(key));
    const left = all.size - shown.size;
    steps.innerHTML = left > 0 ? `남은 단계 <b>${left}</b>` : '이 화면 끝';
    steps.classList.toggle('done', left === 0);
  };
  ['ready', 'slidechanged', 'fragmentshown', 'fragmenthidden'].forEach((e) => Reveal.on(e, stepsLeft));

  /* 칸(.tap)을 누르면 답이 열리고, 다시 누르면 닫힌다 */
  document.addEventListener('click', (ev) => {
    const cell = ev.target.closest('.tap');
    if (!cell) return;
    ev.stopPropagation();
    cell.classList.toggle('open');
  });

  /* 발표자 화면(S 키)의 미리보기 창에서는 부품이 움직이지 않는다 */
  window.DECK = { speaker: () => (typeof Reveal.isSpeakerNotes === 'function' && Reveal.isSpeakerNotes()) };

  const sync = () => { const s = Reveal.getCurrentSlide(); if (s) call('sync', s); };
  ['ready', 'slidechanged', 'fragmentshown', 'fragmenthidden', 'resize'].forEach((e) => Reveal.on(e, sync));
})();
