/* 1~3차시 안내 화면 부품: 흐름 띠, 타이머. deck.js 다음에 읽는다.
   - 흐름 띠: 페이지에 const FLOW = [['단계 이름', 분], ...]를 두고 <div class="flow" data-now="1">을 쓰면
     단계와 시간을 채우고 현재 단계(0부터)를 강조한다. data-now를 비우면 강조하지 않는다.
   - 타이머: <section data-timer="35" data-timer-label="제작">이 있는 화면에 오면 그 시간으로 맞춰진다.
     화면 왼쪽 아래 시계를 누르면 시작·멈춤, ↺는 현재 활동의 시간으로 다시 맞춘다.
     보조 화면으로 넘겨도 계속 돌고 보인다. 다음 활동의 시작 화면에서는 그 활동의 시간으로 맞춘다. */
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
  el.innerHTML = '<span class="lab"></span><span class="t">0:00</span><button class="rs" type="button" title="현재 활동의 시간으로 다시 맞춘다" aria-label="다시 맞춤">↺</button>';
  document.body.appendChild(el);
  let total = 0, left = 0, running = false, endAt = 0, label = '', preset = null;
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const render = () => {
    el.querySelector('.t').textContent = left <= 0 && total > 0 ? '끝' : fmt(Math.ceil(left));
    el.querySelector('.lab').textContent = label;
    el.classList.toggle('run', running);
    el.classList.toggle('done', left <= 0 && total > 0);
    el.classList.toggle('show', total > 0);
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
    if (ev.target.closest('.rs')) {
      if (preset !== null) set(preset, Reveal.getCurrentSlide().dataset.timerLabel || '');
      else if (total > 0) set(total / 60, label);
      return;
    }
    if (left <= 0) return;
    running = !running;
    if (running) endAt = performance.now() + left * 1000;
    render();
  });
  const onSlide = () => {
    const s = Reveal.getCurrentSlide();
    preset = s.dataset.timer ? +s.dataset.timer : null;
    const lab = s.dataset.timerLabel || '';
    /* 같은 활동의 보조 화면에서는 계속 센다. 새 활동 시작 화면에서는 새 시간으로 맞춘다. */
    if (preset !== null && (lab !== label || (!running && (left === total || left <= 0)))) set(preset, lab);
    else render();
  };
  Reveal.on('ready', onSlide);
  Reveal.on('slidechanged', onSlide);
})();
