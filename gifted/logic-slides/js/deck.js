/* 수업 화면 공통 동작: 부품 그리기 → 수식 그리기 → reveal.js 시작 → 칸 누르기·화면 도구
   기준 구현(벡터 구조물 수업)의 deck.js를 이 수업에 맞게 고쳤다(명세서 §3-1, §7-7).
   부품(js/figs_static.js, js/circuit.js, js/plane.js)은 window.PARTS에 {name, mount, sync, reset}을 등록하고,
   이 파일이 시작할 때 mount, 화면·단계가 바뀔 때마다 sync, 「이 수업 기록 지우기」에서 reset을 부른다. */
(function () {
  /* 기본 테마는 설계도(blueprint). 주소 옵션: ?theme=mono (흑백 비교용), &embed=1 (도구 숨김), &open=all (칸 모두 열기) */
  const q = new URLSearchParams(location.search);
  const THEMES = ['mono', 'blueprint'];
  const setTheme = (t) => { if (t && t !== 'mono') document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme; };
  setTheme(q.get('theme') || 'blueprint');
  if (q.get('embed')) document.documentElement.classList.add('embed');

  /* 부품 하나가 오류를 내도 나머지 화면은 돌아가게 한다 */
  const PARTS = window.PARTS || [];
  const call = (fn, ...args) => PARTS.forEach((p) => {
    if (typeof p[fn] !== 'function') return;
    try { p[fn](...args); } catch (e) { console.error(`[${p.name}] ${fn}:`, e); }
  });

  call('mount', document);
  mountComics();
  mountWarps();

  renderMathInElement(document.body, {
    delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }],
    throwOnError: false,
  });

  Reveal.initialize({
    width: 1024, height: 768, margin: 0.035,   // 4:3 프로젝터 기준
    center: false, hash: true, history: false,
    controlsTutorial: false,
    transition: 'fade', transitionSpeed: 'fast', backgroundTransition: 'none',
    navigationMode: 'linear', touch: true, help: true,
    pdfSeparateFragments: false,
    controls: !q.get('embed'), progress: !q.get('embed'), slideNumber: q.get('embed') ? false : 'c/t',
  });
  if (q.get('open') === 'all') document.querySelectorAll('.tap').forEach((c) => c.classList.add('open'));

  const sync = () => { const s = Reveal.getCurrentSlide(); if (!s) return; call('sync', s); syncComics(); };
  ['ready', 'slidechanged', 'fragmentshown', 'fragmenthidden'].forEach((e) => Reveal.on(e, sync));

  /* 칸(.tap)을 누르면 답이 열리고, 다시 누르면 닫힌다. 슬라이드 넘김과는 따로 동작한다 */
  document.addEventListener('click', (ev) => {
    const cell = ev.target.closest('.tap');
    if (!cell) return;
    ev.stopPropagation();
    cell.classList.toggle('open');
  });

  /* 화면 도구: 현재 화면의 칸 모두 열기/닫기, 화면 끄기(판서할 때), 전체 화면, 이 수업 기록 지우기 */
  const cur = () => Reveal.getCurrentSlide();
  const act = {
    open: () => cur().querySelectorAll('.tap').forEach((c) => c.classList.add('open')),
    close: () => cur().querySelectorAll('.tap').forEach((c) => c.classList.remove('open')),
    pause: () => Reveal.togglePause(),
    theme: () => {
      const now = document.documentElement.dataset.theme || 'mono';
      setTheme(THEMES[(THEMES.indexOf(now) + 1) % THEMES.length]);
    },
    full: () => {
      const d = document, el = d.documentElement;
      if (d.fullscreenElement || d.webkitFullscreenElement) (d.exitFullscreen || d.webkitExitFullscreen).call(d);
      else (el.requestFullscreen || el.webkitRequestFullscreen || (() => {})).call(el);
    },
    /* 회로판·대결판·평면에 저장한 것을 모두 지운다(다음 반 수업 전에) */
    reset: () => {
      if (!window.confirm('이 수업에서 화면에 그린 회로와 직선을 모두 지울까요?')) return;
      call('reset');
      sync();
    },
  };
  document.querySelectorAll('#tools [data-act]').forEach((b) =>
    b.addEventListener('click', (ev) => { ev.stopPropagation(); act[b.dataset.act](); }));
  /* 일시 정지(검은 화면)에서는 화면 아무 곳이나 눌러 돌아온다 */
  document.addEventListener('click', () => { if (Reveal.isPaused()) Reveal.togglePause(false); }, true);
})();
