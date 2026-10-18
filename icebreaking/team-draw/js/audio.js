// 배경음악과 효과음(Web Audio로 직접 만든 소리). 소리가 없어도 모든 진행은 화면으로 이해된다.
(function (root) {
  'use strict';
  const TD = root.TeamDraw = root.TeamDraw || {};

  let ctx = null;
  let master = null;
  let enabled = true;
  let musicTimer = 0;
  let musicStep = 0;
  let lastTick = 0;

  function context() {
    if (!ctx) {
      const AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(ctx.destination);
    }
    return ctx;
  }

  function tone(freq, dur, vol, type, delay) {
    if (!enabled) return;
    try {
      const ac = context();
      if (!ac || ac.state !== 'running') return;
      const t = ac.currentTime + (delay || 0);
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = type || 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(vol, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain).connect(master);
      osc.start(t);
      osc.stop(t + dur + 0.03);
    } catch (e) {
      // 소리가 재생되지 않아도 진행은 계속된다.
    }
  }

  // [시작]을 누를 때 AudioContext를 만들거나 재개한다.
  function unlock() {
    if (!enabled) return;
    try { const ac = context(); if (ac && ac.state === 'suspended') ac.resume(); } catch (e) { /* 계속 진행 */ }
  }

  // fromGesture: 사용자가 버튼을 눌러 켠 경우에만 AudioContext를 만든다.
  function setEnabled(on, fromGesture) {
    enabled = !!on;
    if (!enabled) stopMusic();
    else if (fromGesture || ctx) unlock();
    return enabled;
  }

  // 가벼운 반복 리듬: 베이스 + 짧은 화음 + 하이햇 느낌의 짧은 소리
  const BASS = [196, 0, 196, 0, 220, 0, 175, 0, 196, 0, 196, 0, 247, 0, 220, 0];
  const BELL = [0, 0, 392, 0, 0, 440, 0, 0, 0, 0, 494, 0, 0, 440, 0, 392];
  function startMusic() {
    if (!enabled || musicTimer) return;
    unlock();
    musicStep = 0;
    musicTimer = root.setInterval(() => {
      const i = musicStep++ % 16;
      if (BASS[i]) tone(BASS[i], 0.16, 0.035, 'sine');
      if (BELL[i]) tone(BELL[i], 0.12, 0.018, 'triangle');
      if (i % 2 === 1) tone(2400, 0.03, 0.006, 'square');
    }, 170);
  }
  function stopMusic() {
    if (!musicTimer) return;
    root.clearInterval(musicTimer);
    musicTimer = 0;
  }

  const sfx = {
    flip() { tone(520, 0.08, 0.08); tone(780, 0.12, 0.07, 'triangle', 0.06); },
    // 핀 틱: 초당 최대 8회
    tick() {
      const now = Date.now();
      if (now - lastTick < 125) return;
      lastTick = now;
      tone(1500, 0.03, 0.025, 'square');
    },
    bin() { tone(330, 0.1, 0.07); tone(494, 0.14, 0.06, 'triangle', 0.05); },
    spin() { tone(880, 0.04, 0.03, 'square'); },
    stop() { tone(660, 0.08, 0.07); },
    groupDone() { tone(523, 0.1, 0.08); tone(659, 0.1, 0.08, 'triangle', 0.08); tone(784, 0.18, 0.08, 'triangle', 0.16); },
    allDone() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 0.09, 'triangle', i * 0.11)); },
    alarm() { [0, 0.3, 0.6].forEach((d) => { tone(880, 0.18, 0.1, 'square', d); tone(660, 0.18, 0.08, 'square', d + 0.12); }); },
  };

  TD.audio = {
    unlock, setEnabled, startMusic, stopMusic,
    get enabled() { return enabled; },
    get musicOn() { return !!musicTimer; },
    ...sfx,
  };
})(typeof window !== 'undefined' ? window : globalThis);
