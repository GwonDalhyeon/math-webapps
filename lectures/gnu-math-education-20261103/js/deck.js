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
