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
setTimeout(resize, 0); // 초기화 보장

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
   Car Data (튜닝 완료)
========================= */
const carTypes = {
  sport: {
    maxSpeed: 24,    // [상향] 속도 대폭 증가 (기존 16 -> 24)
    accel: 0.25,     // 가속력 증가
    friction: 0.985, 
    turn: 0.025,     // [하향] 핸들을 더 무겁게 (덜 획획 돌아감)
    driftGrip: 0.02, // [하향] 드리프트 시 거의 얼음 위처럼 미끄러짐
    driftDrag: 0.99, // 드리프트 중 속도 감소 최소화 (롱 드리프트 가능)
    color: "red",
  },
  drift: {
    maxSpeed: 22,
    accel: 0.2,
    friction: 0.98,
    turn: 0.035,     // 드리프트카는 조금 더 잘 꺾임
    driftGrip: 0.01, // 극도로 잘 미끄러짐
    driftDrag: 0.985,
    color: "cyan",
  },
  heavy: {
    maxSpeed: 20,
    accel: 0.15,
    friction: 0.99, // 무거워서 관성이 더 셈
    turn: 0.018,    // 둔한 핸들링
    driftGrip: 0.04,
    driftDrag: 0.98,
    color: "orange",
  },
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
  resize(); 
  const type = carTypes[carSelect.value];
  
  car = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    angle: -Math.PI / 2, // 위쪽 보고 시작
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

  // 현재 실제 속도 계산
  let currentSpeed = Math.sqrt(car.vx*car.vx + car.vy*car.vy);
  
  // 드리프트 조건
  const isDrifting = space && currentSpeed > 4;

  // 1. 스티어링 (핸들링)
  if (currentSpeed > 0.5) {
    const direction = (forward || currentSpeed > 1) ? 1 : -1;
    // 드리프트 중에는 차 머리만 휙 돌아가게 배율 증가
    const turnMultiplier = isDrifting ? 1.8 : 1.0; 

    // 고속 주행 시 핸들링 민감도 보정 (너무 빠르면 핸들 덜 꺾임)
    let speedSensitivity = 1.0;
    if (currentSpeed > 15) speedSensitivity = 0.8; 

    if (left) car.angle -= car.turn * turnMultiplier * speedSensitivity * direction;
    if (right) car.angle += car.turn * turnMultiplier * speedSensitivity * direction;
  }

  // 2. 가속/감속
  const headingX = Math.cos(car.angle);
  const headingY = Math.sin(car.angle);

  if (forward) {
    car.vx += headingX * car.accel;
    car.vy += headingY * car.accel;
  } else if (backward) {
    car.vx -= headingX * car.accel * 0.8; 
    car.vy -= headingY * car.accel * 0.8;
  }

  // 3. 물리 엔진 (미끄러짐 처리)
  if (isDrifting) {
    // [드리프트 모드]
    // heading(차 머리 방향)과 velocity(실제 이동 방향)을 거의 분리시킴
    // driftGrip이 낮을수록 원래 가던 방향으로 계속 밀려감
    car.vx = car.vx * (1 - car.driftGrip) + (headingX * currentSpeed) * car.driftGrip;
    car.vy = car.vy * (1 - car.driftGrip) + (headingY * currentSpeed) * car.driftGrip;
    
    // 드리프트 중 속도 유지력 (Drag가 1에 가까울수록 속도가 안 줄어듦)
    car.vx *= car.driftDrag;
    car.vy *= car.driftDrag;

  } else {
    // [일반 주행]
    // 그립력이 좋아서 차가 보는 방향으로 즉시 따라감
    const normalGrip = 0.2; 
    car.vx = car.vx * (1 - normalGrip) + (headingX * currentSpeed) * normalGrip;
    car.vy = car.vy * (1 - normalGrip) + (headingY * currentSpeed) * normalGrip;

    // 도로 마찰
    car.vx *= car.friction;
    car.vy *= car.friction;
  }

  // 최대 속도 제한
  currentSpeed = Math.sqrt(car.vx*car.vx + car.vy*car.vy);
  if (currentSpeed > car.maxSpeed) {
    car.vx = (car.vx / currentSpeed) * car.maxSpeed;
    car.vy = (car.vy / currentSpeed) * car.maxSpeed;
  }
  
  // 4. 위치 업데이트 및 화면 루프
  car.x += car.vx;
  car.y += car.vy;

  if (car.x < 0) car.x = canvas.width;
  if (car.x > canvas.width) car.x = 0;
  if (car.y < 0) car.y = canvas.height;
  if (car.y > canvas.height) car.y = 0;

  // HUD (속도감 뻥튀기 표현)
  const displaySpeed = Math.floor(currentSpeed * 12);
  speedText.textContent = displaySpeed + " km/h";
}

/* =========================
   Draw
========================= */
function draw() {
  ctx.fillStyle = "#2c2c2c";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (!car) return;

  // 타이어 자국 (드리프트 시 시각 효과)
  if (keys["Space"] && Math.abs(car.vx) + Math.abs(car.vy) > 5) {
      // 심심하면 여기에 자국 그리기 로직 추가 가능
  }

  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);

  // 차 몸체
  ctx.fillStyle = car.color;
  ctx.shadowBlur = 15;
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.fillRect(-20, -10, 40, 20);
  ctx.shadowBlur = 0;

  // 유리창 (앞뒤 구분을 위해 추가)
  ctx.fillStyle = "#000";
  ctx.globalAlpha = 0.3;
  ctx.fillRect(0, -8, 10, 16);
  ctx.globalAlpha = 1.0;

  // 헤드라이트
  ctx.fillStyle = "#fff";
  ctx.fillRect(18, -8, 4, 4);
  ctx.fillRect(18, 4, 4, 4);
  
  // 브레이크등
  if (keys["ArrowDown"] || keys["KeyS"] || keys["Space"]) {
     ctx.fillStyle = "#ff0000";
     ctx.shadowBlur = 15;
     ctx.shadowColor = "red";
  } else {
     ctx.fillStyle = "#550000";
     ctx.shadowBlur = 0;
  }
  ctx.fillRect(-20, -8, 2, 4);
  ctx.fillRect(-20, 4, 2, 4);

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
