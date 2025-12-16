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
// 초기화 시 실행 보장
setTimeout(resize, 0); 

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
   Car Data (물리 설정 조절)
========================= */
const carTypes = {
  sport: {
    maxSpeed: 16,    // 최고 속도
    accel: 0.15,     // 가속력
    friction: 0.985, // 기본 마찰 (높을수록 안 미끄러짐)
    turn: 0.03,      // [수정] 회전 속도 낮춤 (부드럽게)
    driftGrip: 0.03, // [신규] 드리프트 시 그립력 (낮을수록 많이 미끄러짐)
    driftDrag: 0.96, // [신규] 드리프트 시 속도 감소 저항
    color: "red",
  },
  drift: {
    maxSpeed: 15,
    accel: 0.12,
    friction: 0.98,
    turn: 0.04,      // [수정] 회전 속도 낮춤
    driftGrip: 0.015, // 더 잘 미끄러짐
    driftDrag: 0.95,
    color: "cyan",
  },
  heavy: {
    maxSpeed: 13,
    accel: 0.08,
    friction: 0.99,
    turn: 0.02,      // [수정] 회전 속도 낮춤
    driftGrip: 0.05, // 덜 미끄러짐
    driftDrag: 0.97,
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
  resize(); // 시작 전 화면 크기 확실히 계산
  const type = carTypes[carSelect.value];
  
  car = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    angle: -Math.PI / 2, // 위쪽 보고 시작
    // speed: 0, // <-- [삭제] 스칼라 speed 대신 벡터 vx, vy만 사용합니다.
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

// ★★★ 물리 엔진 핵심 업데이트 부분 ★★★
function update() {
  if (gameState !== "playing" || !car) return;

  const forward = keys["ArrowUp"] || keys["KeyW"];
  const backward = keys["ArrowDown"] || keys["KeyS"];
  const left = keys["ArrowLeft"] || keys["KeyA"];
  const right = keys["ArrowRight"] || keys["KeyD"];
  const space = keys["Space"];

  // 현재 속도 벡터의 길이(실제 속력) 계산
  let currentSpeed = Math.sqrt(car.vx*car.vx + car.vy*car.vy);
  
  // 드리프트 조건: 일정 속도 이상에서 Space 누름
  const isDrifting = space && currentSpeed > 3;

  // 1. 스티어링 (핸들링)
  if (currentSpeed > 0.5) {
    // 후진 중이면 핸들 반대로
    const direction = (forward || currentSpeed > 1) ? 1 : -1;
    // 드리프트 중에는 핸들이 조금 더 예민하게 반응 (오버스티어)
    const turnMultiplier = isDrifting ? 1.5 : 1;

    if (left) car.angle -= car.turn * turnMultiplier * direction;
    if (right) car.angle += car.turn * turnMultiplier * direction;
  }

  // 2. 가속/감속 힘 적용 (엔진 파워)
  // 차가 바라보는 방향의 단위 벡터
  const headingX = Math.cos(car.angle);
  const headingY = Math.sin(car.angle);

  if (forward) {
    car.vx += headingX * car.accel;
    car.vy += headingY * car.accel;
  } else if (backward) {
    car.vx -= headingX * car.accel * 0.6; // 후진은 힘을 약하게
    car.vy -= headingY * car.accel * 0.6;
  }

  // 3. 물리 및 마찰 적용 (미끄러짐 구현 핵심)
  if (isDrifting) {
    // [드리프트 모드]
    // 그립력이 매우 낮아져서 관성대로 미끄러짐
    // 방향 전환은 car.driftGrip 만큼만 반영됨
    car.vx = car.vx * (1 - car.driftGrip) + (headingX * currentSpeed) * car.driftGrip;
    car.vy = car.vy * (1 - car.driftGrip) + (headingY * currentSpeed) * car.driftGrip;
    
    // 드리프트 중에는 옆으로 밀리는 저항 때문에 속도가 더 빨리 줌
    car.vx *= car.driftDrag;
    car.vy *= car.driftDrag;

  } else {
    // [일반 주행 모드]
    // 그립력이 높아서(0.25) 차가 보는 방향으로 속도 벡터가 빠르게 정렬됨
    const normalGrip = 0.25; 
    car.vx = car.vx * (1 - normalGrip) + (headingX * currentSpeed) * normalGrip;
    car.vy = car.vy * (1 - normalGrip) + (headingY * currentSpeed) * normalGrip;

    // 기본 도로 마찰
    car.vx *= car.friction;
    car.vy *= car.friction;
  }

  // 속도 제한 (최대 속도 넘지 않게)
  currentSpeed = Math.sqrt(car.vx*car.vx + car.vy*car.vy);
  if (currentSpeed > car.maxSpeed) {
    car.vx = (car.vx / currentSpeed) * car.maxSpeed;
    car.vy = (car.vy / currentSpeed) * car.maxSpeed;
  }
  
  // 4. 위치 업데이트
  car.x += car.vx;
  car.y += car.vy;

  // 화면 밖 루프 처리
  if (car.x < 0) car.x = canvas.width;
  if (car.x > canvas.width) car.x = 0;
  if (car.y < 0) car.y = canvas.height;
  if (car.y > canvas.height) car.y = 0;

  // HUD 업데이트
  const displaySpeed = Math.floor(currentSpeed * 15);
  speedText.textContent = displaySpeed + " km/h";
}

/* =========================
   Draw Functions
========================= */
function draw() {
  ctx.fillStyle = "#2c2c2c";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (!car) return;

  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);

  // 차 몸체
  ctx.fillStyle = car.color;
  // 그림자 효과
  ctx.shadowBlur = 15;
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.fillRect(-20, -10, 40, 20);
  ctx.shadowBlur = 0; // 그림자 초기화

  // 헤드라이트
  ctx.fillStyle = "#fff";
  ctx.fillRect(15, -8, 5, 4);
  ctx.fillRect(15, 4, 5, 4);
  
  // 브레이크등 (후진 또는 드리프트 시 점등)
  if (keys["ArrowDown"] || keys["KeyS"] || keys["Space"]) {
     ctx.fillStyle = "#ff0000";
     ctx.shadowBlur = 10;
     ctx.shadowColor = "red";
  } else {
     ctx.fillStyle = "#550000";
     ctx.shadowBlur = 0;
  }
  ctx.fillRect(-20, -8, 3, 4);
  ctx.fillRect(-20, 4, 3, 4);

  ctx.restore();
}

/* =========================
   Game Loop
========================= */
function loop() {
  if (gameState === "playing") {
    update();
    draw();
    requestAnimationFrame(loop);
  } else if (gameState === "pause") {
    draw();
  }
}
