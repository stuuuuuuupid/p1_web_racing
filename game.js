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
let gameState = "menu"; 

/* =========================
   Input
========================= */
const keys = {};

document.addEventListener("keydown", (e) => {
  keys[e.code] = true;
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
  sport: { maxSpeed: 15, accel: 0.2, friction: 0.98, turn: 0.06, drift: 0.94, color: "red" },
  drift: { maxSpeed: 14, accel: 0.15, friction: 0.97, turn: 0.08, drift: 0.92, color: "cyan" },
  heavy: { maxSpeed: 12, accel: 0.1, friction: 0.96, turn: 0.04, drift: 0.97, color: "orange" },
};

let car = null;

/* =========================
   UI Elements
========================= */
const carSelect = document.getElementById("carSelect");
const startBtn = document.getElementById("startBtn");
const speedText = document.getElementById("speed");

startBtn.onclick = startGame;

/* =========================
   Game Logic Functions
========================= */
function startGame() {
  const type = carTypes[carSelect.value];
  
  car = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    angle: -Math.PI / 2, // 위쪽(-90도) 보고 시작
    speed: 0,
    vx: 0,
    vy: 0,
    ...type,
  };

  document.getElementById("menu").classList.add("hidden");
  document.getElementById("pause").classList.add("hidden");
  gameState = "playing";
  loop();
}

window.resumeGame = function() {
  document.getElementById("pause").classList.add("hidden");
  gameState = "playing";
  loop();
}

window.exitGame = function() {
  document.getElementById("pause").classList.add("hidden");
  document.getElementById("menu").classList.remove("hidden");
  gameState = "menu";
}

function update() {
  if (gameState !== "playing" || !car) return;

  const forward = keys["ArrowUp"] || keys["KeyW"];
  const backward = keys["ArrowDown"] || keys["KeyS"];
  const left = keys["ArrowLeft"] || keys["KeyA"];
  const right = keys["ArrowRight"] || keys["KeyD"];
  const space = keys["Space"];

  // 1. 가속 및 후진 로직
  if (forward) {
    car.speed += car.accel;
  } else if (backward) {
    car.speed -= car.accel;
  } else {
    car.speed *= 0.95; // 자연스러운 감속
  }

  // 속도 제한
  const maxReverse = -car.maxSpeed * 0.5;
  if (car.speed > car.maxSpeed) car.speed = car.maxSpeed;
  if (car.speed < maxReverse) car.speed = maxReverse;
  
  // 완전 정지 처리
  if (Math.abs(car.speed) < 0.01) car.speed = 0;

  // 2. 회전 (차가 움직일 때만)
  if (Math.abs(car.speed) > 0.1) {
    let turnMultiplier = space ? 2.5 : 1; 
    const direction = car.speed > 0 ? 1 : -1; // 후진 시 핸들 방향 반대
    
    if (left) car.angle -= car.turn * turnMultiplier * direction;
    if (right) car.angle += car.turn * turnMultiplier * direction;
  }

  // 3. 물리 엔진 (드리프트)
  const headingX = Math.cos(car.angle);
  const headingY = Math.sin(car.angle);
  const grip = space ? 0.05 : 0.2; // space 누르면 미끄러짐

  car.vx = car.vx * (1 - grip) + (headingX * car.speed) * grip;
  car.vy = car.vy * (1 - grip) + (headingY * car.speed) * grip;

  car.vx *= car.friction;
  car.vy *= car.friction;

  car.x += car.vx;
  car.y += car.vy;

  // 화면 밖으로 나가면 반대편 이동
  if (car.x < 0) car.x = canvas.width;
  if (car.x > canvas.width) car.x = 0;
  if (car.y < 0) car.y = canvas.height;
  if (car.y > canvas.height) car.y = 0;

  // 속도계 업데이트
  const displaySpeed = Math.floor(Math.sqrt(car.vx*car.vx + car.vy*car.vy) * 15);
  speedText.textContent = displaySpeed + " km/h";
}

function draw() {
  // 배경
  ctx.fillStyle = "#2c2c2c";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (!car) return;

  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);

  // 차 몸체
  ctx.fillStyle = car.color;
  ctx.shadowBlur = 10;
  ctx.shadowColor = car.color;
  ctx.fillRect(-20, -10, 40, 20);

  // 헤드라이트
  ctx.fillStyle = "#fff";
  ctx.shadowBlur = 5;
  ctx.shadowColor = "#fff";
  ctx.fillRect(15, -8, 5, 4);
  ctx.fillRect(15, 4, 5, 4);
  
  // 브레이크등
  if (keys["ArrowDown"] || keys["KeyS"] || keys["Space"]) {
     ctx.fillStyle = "#ff0000";
     ctx.shadowColor = "#ff0000";
  } else {
     ctx.fillStyle = "#550000";
     ctx.shadowColor = "transparent";
  }
  ctx.fillRect(-20, -8, 3, 4);
  ctx.fillRect(-20, 4, 3, 4);

  ctx.restore();
}

function loop() {
  if (gameState === "playing") {
    update();
    draw();
    requestAnimationFrame(loop);
  } else if (gameState === "pause") {
    draw();
  }
}
