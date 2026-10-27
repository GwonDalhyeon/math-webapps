/* 흐름 띠와 타이머. deck.js 다음에 읽는다. 기준 구현의 session.js에서 타이머 표시 방식을 고쳤다(명세서 D10, §3-1).
   - 흐름 띠: 페이지에 const FLOW = [['단계 이름', 분], ...]를 두고 <div class="flow" data-now="1">을 쓰면
     단계와 시간을 채우고 현재 단계(0부터)를 강조한다. data-now를 비우면 강조하지 않는다.
   - 타이머: 회로를 그리거나 쓰는 활동에만 있다.
     활동의 첫 화면: <section data-timer="분" data-timer-label="이름"> → 그 시간으로 맞춘다(이미 같은 활동이 돌고 있으면 그대로).
     같은 활동의 이어지는 화면: <section data-timer-label="같은 이름"> → 시계가 보이고 계속 센다.
     그 밖의 화면: 시계를 숨긴다. 숨겨도 시간은 계속 센다(활동 중에 앞 화면을 잠깐 다시 볼 수 있게).
     시계를 누르면 시작·멈춤, ↺는 이 활동의 시간으로 다시 맞춘다. */
(function () {
  /* 흐름 띠 */
  if (typeof FLOW !== 'undefined') {
    document.querySelectorAll('.flow[data-now]').forEach((el) => {
      const now = el.dataset.now === '' ? -1 : +el.dataset.now;
      el.innerHTML = FLOW.map(([name, min], i) => `<span class="${i === now ? 'now' : ''}">${name}<em>${min}분</em></span>`).join('');
    });
  }

  /* 타이머 */
  const el = document.createElement('div');
  el.id = 'timer';
  el.innerHTML = '<span class="lab"></span><span class="t">0:00</span><button class="rs" type="button" title="이 활동의 시간으로 다시 맞춘다" aria-label="다시 맞춤">↺</button>';
  document.body.appendChild(el);
  let total = 0, left = 0, running = false, endAt = 0, label = '', here = false;
  const minutesOf = {};   // 활동 이름 → 분(첫 화면에서 읽어 둔다)
  document.querySelectorAll('section[data-timer][data-timer-label]').forEach((s) => { minutesOf[s.dataset.timerLabel] = +s.dataset.timer; });
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const render = () => {
    el.querySelector('.t').textContent = left <= 0 && total > 0 ? '끝' : fmt(Math.ceil(left));
    el.querySelector('.lab').textContent = label;
    el.classList.toggle('run', running);
    el.classList.toggle('done', left <= 0 && total > 0);
    el.classList.toggle('show', total > 0 && here);
  };
  const set = (min, lab) => { total = left = min * 60; label = lab; running = false; render(); };
  setInterval(() => {
    if (!running) return;
    left = Math.max(0, (endAt - performance.now()) / 1000);
    if (left <= 0) running = false;
    render();
  }, 250);
  el.addEventListener('click', (ev) => {
    ev.stopPropagation();
    if (ev.target.closest('.rs')) { if (minutesOf[label] != null) set(minutesOf[label], label); return; }
    if (left <= 0) return;
    running = !running;
    if (running) endAt = performance.now() + left * 1000;
    render();
  });
  const onSlide = () => {
    const s = Reveal.getCurrentSlide();
    const lab = (s && s.dataset.timerLabel) || '';
    const start = s && s.dataset.timer ? +s.dataset.timer : null;
    if (lab && lab !== label && minutesOf[lab] != null) set(minutesOf[lab], lab);                     // 다른 활동으로 들어옴
    else if (start !== null && lab === label && !running && (left === total || left <= 0)) set(start, lab);  // 같은 활동의 첫 화면, 아직 시작 전이거나 끝남
    here = lab !== '' && lab === label;
    render();
  };
  Reveal.on('ready', onSlide);
  Reveal.on('slidechanged', onSlide);
})();
