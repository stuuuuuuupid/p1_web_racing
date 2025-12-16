/* =========================
   Canvas & Resize
========================= */
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

/* =========================
   Game State
========================= */
let gameState = "menu"; // menu | playing | pause

/* =========================
   Input
========================= */
const keys = {};

document.addEventListener("keydown", (e) => {
  keys[e.code] = true;

  // ESC → pause
  if (e.code === "Escape" && gameState === "playing") {
    gameState = "pause";
    document.getElementById("pause").classList.remove("hidden");
  }
});

document.addEventListener("keyup", (e) => {
  keys[e.code] = false;
});

/* =========================
   Car Data
========================= */
const carTypes = {
  sport: {
    maxSpeed: 220,
    accel: 0.4,
    turn: 0.04,
    drift: 0.93,
    color: "red",
  },
  drift: {
    maxSpeed: 200,
    accel: 0.35,
    turn: 0.06,
    drift: 0.9,
    color: "cyan",
  },
  heavy: {
    maxSpeed: 180,
    accel: 0.3,
    turn: 0.03,
    drift: 0.96,
    color: "orange",
  },
};

let car = null;

/* =========================
   Start / Exit / Resume
========================= */
const carSelect = document.getElementById("carSelect");
const startBtn = document.getElementById("startBtn");
const speedText = document.getElementById("speed");

startBtn.onclick = startGame;

function startGame() {
  const type = carTypes[carSelect.value];

  car = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    angle: 0,
    speed: 0,
    vx: 0,
    vy: 0,
    ...type,
  };

  document.getElementById("menu").classList.add("hidden");
  document.getElementById("pause").classList.add("hidden");

  gameState = "playing";
}

function resumeGame() {
  document.getElementById("pause").classList.add("hidden");
  gameState = "playing";
}

function exitGame() {
  document.getElementById("pause").classList.add("hidden");
  document.getElementById("menu").classList.remove("hidden");
  gameState = "menu";
}

/* =========================
   Update Logic
========================= */
function update() {
  if (gameState !== "playing" || !car) return;

  const forward = keys["ArrowUp"] || keys["KeyW"];
  const backward = keys["ArrowDown"] || keys["KeyS"];
  const left = keys["ArrowLeft"] || keys["KeyA"];
  const right = keys["ArrowRight"] || keys["KeyD"];
  const drifting = keys["Space"] && Math.abs(car.speed) > 20;

  /* =====================
     Acceleration
  ===================== */
  if (forward) car.speed += car.accel;
  if (backward) car.speed -= car.accel * 0.7;

  car.speed *= 0.99;
  car.speed = Math.max(
    Math.min(car.speed, car.maxSpeed),
    -car.maxSpeed * 0.4
  );

  /* =====================
     Steering
  ===================== */
  let turnPower = car.turn * (car.speed / car.maxSpeed);

  // 🔥 드리프트 중이면 회전력 폭증
  if (drifting) {
    turnPower *= 2.8; // ← 핵심
  }

  if (left) car.angle -= turnPower;
  if (right) car.angle += turnPower;

  /* =====================
     Velocity
  ===================== */
  const accelForce = 0.05;

  car.vx += Math.cos(car.angle) * car.speed * accelForce;
  car.vy += Math.sin(car.angle) * car.speed * accelForce;

  /* =====================
     Drift Physics
  ===================== */
  if (drifting) {
    // 진행 방향과 차 방향 분리
    car.vx *= 0.92;
    car.vy *= 0.92;

    // 방향 틀어주는 순간적인 킥
    if (left) {
      car.vx += Math.sin(car.angle) * car.speed * 0.03;
      car.vy -= Math.cos(car.angle) * car.speed * 0.03;
    }
    if (right) {
      car.vx -= Math.sin(car.angle) * car.speed * 0.03;
      car.vy += Math.cos(car.angle) * car.speed * 0.03;
    }
  } else {
    // 평상시 마찰
    car.vx *= 0.97;
    car.vy *= 0.97;
  }

  /* =====================
     Position
  ===================== */
  car.x += car.vx;
  car.y += car.vy;

  if (car.x < 0) car.x = canvas.width;
  if (car.x > canvas.width) car.x = 0;
  if (car.y < 0) car.y = canvas.height;
  if (car.y > canvas.height) car.y = 0;

  /* =====================
     HUD
  ===================== */
  speedText.textContent =
    Math.abs(Math.round(car.speed)) + " km/h";
}
