/* 수업 화면 공통 동작: 그림 넣기 → 수식 그리기 → reveal.js 시작 → 칸 누르기·화면 도구 */
(function () {
  /* 기본 테마는 설계도(blueprint). 주소 옵션: ?theme=mono|violet|straw (시안 비교용), &embed=1 (도구 숨김), &open=all (칸 모두 열기) */
  const q = new URLSearchParams(location.search);
  const THEMES = ['mono', 'blueprint', 'violet', 'straw'];
  const setTheme = (t) => { if (t && t !== 'mono') document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme; };
  setTheme(q.get('theme') || 'blueprint');
  if (q.get('embed')) document.documentElement.classList.add('embed');

  mountFigs();
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

  ['ready', 'slidechanged', 'fragmentshown', 'fragmenthidden'].forEach((e) => Reveal.on(e, syncComics));
  ['ready', 'slidechanged', 'fragmentshown', 'fragmenthidden'].forEach((e) => Reveal.on(e, syncAnims));

  /* 칸(.tap)을 누르면 답이 열리고, 다시 누르면 닫힌다. 슬라이드 넘김과는 따로 동작한다 */
  document.addEventListener('click', (ev) => {
    const cell = ev.target.closest('.tap');
    if (!cell) return;
    ev.stopPropagation();
    cell.classList.toggle('open');
  });

  /* 화면 도구: 현재 화면의 칸 모두 열기/닫기, 화면 끄기(판서할 때), 전체 화면 */
  const cur = () => Reveal.getCurrentSlide();
  const act = {
    open: () => cur().querySelectorAll('.tap').forEach((c) => c.classList.add('open')),
    close: () => cur().querySelectorAll('.tap').forEach((c) => c.classList.remove('open')),
    pause: () => Reveal.togglePause(),
    theme: () => {
      const cur = document.documentElement.dataset.theme || 'mono';
      setTheme(THEMES[(THEMES.indexOf(cur) + 1) % THEMES.length]);
    },
    full: () => {
      const d = document, el = d.documentElement;
      if (d.fullscreenElement || d.webkitFullscreenElement) (d.exitFullscreen || d.webkitExitFullscreen).call(d);
      else (el.requestFullscreen || el.webkitRequestFullscreen || (() => {})).call(el);
    },
  };
  document.querySelectorAll('#tools [data-act]').forEach((b) =>
    b.addEventListener('click', (ev) => { ev.stopPropagation(); act[b.dataset.act](); }));
  /* 일시 정지(검은 화면)에서는 화면 아무 곳이나 눌러 돌아온다 */
  document.addEventListener('click', () => { if (Reveal.isPaused()) Reveal.togglePause(false); }, true);
})();
