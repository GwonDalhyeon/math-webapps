import { approvedReasons } from "./reasons.js";
import { unlockAudio, setSoundEnabled, startMusic, stopMusic, playChoice, playWinner } from "./audio.js";

const $ = (selector) => document.querySelector(selector);
const app = $("#app");
const startScreen = $("#start-screen");
const gameScreen = $("#game-screen");
const resultScreen = $("#result-screen");
const leftCard = $("#left-card");
const rightCard = $("#right-card");
const status = $("#status");
const roundLabel = $("#round-label");
const matchLabel = $("#match-label");
const progressFill = $("#progress-fill");
const bracketDots = $("#bracket-dots");
const soundButton = $("#sound-button");
const startButtons = [...document.querySelectorAll("[data-tournament-size]")];
const homeButton = $("#home-button");
const againButton = $("#again-button");
const posterButton = $("#poster-button");

let soundOn = true;
let entries = [];
let currentRound = [];
let nextRound = [];
let matchIndex = 0;
let totalChoices = 0;
let choicesMade = 0;
let history = [];
let isTransitioning = false;
let activeTournamentSize = 16;

const shuffle = (items) => [...items].sort(() => Math.random() - 0.5);

function setScreen(name) {
  for (const screen of [startScreen, gameScreen, resultScreen]) {
    screen.hidden = screen.id !== name;
  }
  // 대결 카드를 누른 뒤에도 결과의 제목부터 보이게 한다.
  window.scrollTo(0, 0);
}

function renderCard(button, reason, side) {
  button.dataset.reasonId = reason.id;
  button.className = `reason-card ${side}`;
  button.innerHTML = `
    <img src="${reason.image}" alt="${reason.alt}" width="768" height="960" />
    <span class="card-copy">
      <span class="card-meta">${reason.id} · ${reason.category}</span>
      <strong>${reason.text}</strong>
    </span>
  `;
  const image = button.querySelector("img");
  image.addEventListener("error", () => {
    button.classList.add("image-error");
    image.alt = "이미지를 불러오지 못했습니다";
  }, { once: true });
}

function renderBracket() {
  const dotCount = Math.max(2, Math.ceil(entries.length / 2));
  const filled = Math.min(dotCount, Math.ceil((choicesMade + 1) / 2));
  bracketDots.innerHTML = Array.from({ length: dotCount }, (_, index) => (
    `<span class="${index < filled ? "done" : ""}"></span>`
  )).join("");
}

function renderMatch() {
  const left = currentRound[matchIndex];
  const right = currentRound[matchIndex + 1];
  const roundSize = currentRound.length;
  const matchNumber = Math.floor(matchIndex / 2) + 1;
  renderCard(leftCard, left, "left");
  renderCard(rightCard, right, "right");
  roundLabel.textContent = `${roundSize}강`;
  matchLabel.textContent = `${matchNumber} / ${roundSize / 2}`;
  status.textContent = "둘 중 고3 2학기에 더 많이 들어본 핑계를 골라 보세요.";
  progressFill.style.width = `${(choicesMade / Math.max(1, totalChoices)) * 100}%`;
  renderBracket();
}

function startTournament(size = activeTournamentSize) {
  activeTournamentSize = size;
  entries = shuffle(approvedReasons()).slice(0, size);
  currentRound = entries;
  nextRound = [];
  matchIndex = 0;
  choicesMade = 0;
  totalChoices = entries.length - 1;
  history = [];
  isTransitioning = false;
  unlockAudio();
  startMusic();
  setScreen("game-screen");
  renderMatch();
}

function completeRound() {
  if (nextRound.length === 1) {
    showResult(nextRound[0]);
    return;
  }
  currentRound = nextRound;
  nextRound = [];
  matchIndex = 0;
  window.setTimeout(renderMatch, 120);
}

function choose(reasonId) {
  if (isTransitioning) return;
  const left = currentRound[matchIndex];
  const right = currentRound[matchIndex + 1];
  const winner = left.id === reasonId ? left : right;
  const loser = left.id === reasonId ? right : left;
  const selectedButton = winner.id === left.id ? leftCard : rightCard;

  isTransitioning = true;
  selectedButton.classList.add("selected");
  status.textContent = `선택: ${winner.text}`;
  playChoice();
  history.push({ roundSize: currentRound.length, winner, loser });
  nextRound.push(winner);
  choicesMade += 1;
  progressFill.style.width = `${(choicesMade / Math.max(1, totalChoices)) * 100}%`;

  window.setTimeout(() => {
    matchIndex += 2;
    isTransitioning = false;
    if (matchIndex >= currentRound.length) completeRound();
    else renderMatch();
  }, 330);
}

function winnerRoute(winner) {
  return history
    .filter((record) => record.winner.id === winner.id)
    .map((record) => ({ label: `${record.roundSize}강`, text: record.loser.text }));
}

function showResult(winner) {
  stopMusic();
  playWinner();
  $("#winner-image").src = winner.image;
  $("#winner-image").alt = winner.alt;
  $("#winner-category").textContent = `${winner.id} · ${winner.category}`;
  $("#winner-text").textContent = winner.text;
  $("#winner-category-copy").textContent = `${winner.id} · ${winner.category}`;
  $("#winner-text-copy").textContent = winner.text;
  const route = winnerRoute(winner);
  $("#winner-route").innerHTML = route.map((item) => (
    `<li><span>${item.label}</span>${item.text}</li>`
  )).join("");
  setScreen("result-screen");
}

async function savePoster() {
  const image = $("#winner-image");
  if (!image.complete) return;
  const canvas = document.createElement("canvas");
  canvas.width = 1000;
  canvas.height = 1250;
  const context = canvas.getContext("2d");
  const gradient = context.createLinearGradient(0, 0, 1000, 1250);
  gradient.addColorStop(0, "#10213b");
  gradient.addColorStop(1, "#203d63");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#b9d1ff";
  context.font = "700 28px sans-serif";
  context.fillText("고3 2학기 수업 안 듣는 이유 월드컵", 70, 80);
  context.fillStyle = "#ffd08a";
  context.font = "700 56px sans-serif";
  context.fillText("🏆 최종 우승", 70, 155);
  context.drawImage(image, 110, 205, 780, 780);
  context.fillStyle = "#ffffff";
  context.font = "700 48px sans-serif";
  context.fillText($("#winner-text").textContent, 70, 1080);
  context.fillStyle = "#c5d7f6";
  context.font = "400 24px sans-serif";
  context.fillText("선택 결과로 만들어진 고3 2학기 대표 대사", 70, 1130);
  const link = document.createElement("a");
  link.download = "g3-second-semester-worldcup-result.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function updateSound() {
  soundOn = setSoundEnabled(!soundOn);
  if (soundOn && !gameScreen.hidden) {
    unlockAudio();
    startMusic();
  }
  soundButton.textContent = soundOn ? "🔊 소리 끄기" : "🔇 소리 켜기";
}

leftCard.addEventListener("click", () => choose(leftCard.dataset.reasonId));
rightCard.addEventListener("click", () => choose(rightCard.dataset.reasonId));
for (const button of startButtons) {
  button.addEventListener("click", () => startTournament(Number(button.dataset.tournamentSize)));
}
againButton.addEventListener("click", () => startTournament(activeTournamentSize));
homeButton.addEventListener("click", () => { stopMusic(); setScreen("start-screen"); });
posterButton.addEventListener("click", savePoster);
soundButton.addEventListener("click", updateSound);
document.addEventListener("keydown", (event) => {
  if (gameScreen.hidden || isTransitioning) return;
  if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") choose(leftCard.dataset.reasonId);
  if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") choose(rightCard.dataset.reasonId);
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopMusic();
});

const approvedCount = approvedReasons().length;
$("#pilot-count").textContent = approvedCount;
$("#pilot-round").textContent = `활성 이미지 카드 ${approvedCount}장`;
