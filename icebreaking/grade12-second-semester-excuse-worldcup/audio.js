let audioContext = null;
let musicTimer = 0;
let soundEnabled = true;

function context() {
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  return audioContext;
}

function tone(frequency, duration, volume, type = "triangle") {
  if (!soundEnabled) return;
  try {
    const audio = context();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(volume, audio.currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duration);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + duration + 0.03);
  } catch {
    // 소리가 재생되지 않아도 게임은 계속된다.
  }
}

export function setSoundEnabled(nextValue) {
  soundEnabled = nextValue;
  if (!soundEnabled) stopMusic();
  return soundEnabled;
}

export function unlockAudio() {
  if (!soundEnabled) return;
  try { context().resume(); } catch { /* 브라우저가 막아도 게임은 계속된다. */ }
}

export function playChoice() {
  tone(440, 0.12, 0.09);
  window.setTimeout(() => tone(660, 0.16, 0.08), 65);
}

export function playWinner() {
  tone(523, 0.12, 0.1);
  window.setTimeout(() => tone(659, 0.13, 0.1), 100);
  window.setTimeout(() => tone(784, 0.28, 0.11), 200);
}

export function startMusic() {
  if (!soundEnabled || musicTimer) return;
  const pattern = [220, null, 262, null, 294, 330, 294, null];
  let step = 0;
  musicTimer = window.setInterval(() => {
    const note = pattern[step % pattern.length];
    if (note) tone(note, 0.11, 0.025, "sine");
    step += 1;
  }, 230);
}

export function stopMusic() {
  if (!musicTimer) return;
  window.clearInterval(musicTimer);
  musicTimer = 0;
}
