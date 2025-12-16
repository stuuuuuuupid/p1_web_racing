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
   Car Data (수정됨: 가속도 accel 값을 낮춤)
========================= */
const carTypes = {
  sport: {
    maxSpeed: 15,    // 픽셀 단위 속도로 조정
    accel: 0.2,      // 가속도 (낮을수록 서서히 빨라짐)
    friction: 0.98,  // 기본 마찰력
    turn: 0.06,      // 회전 속도
    drift: 0.94,     // 드리프트 시 미끄러짐 정도
    color: "red",
  },
  drift: {
    maxSpeed: 14,
    accel: 0.15,
    friction: 0.97,
    turn: 0.08,
    drift: 0.92,
    color: "cyan",
  },
  heavy: {
    maxSpeed: 12,
    accel: 0.1,
    friction: 0.96,
    turn: 0.04,
    drift: 0.97,
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
    angle: -Math.PI / 2, // [수정] -90도 (화면 위쪽)을 보고 시작
    speed: 0,            // 현재 스칼라 속도
    vx: 0,               // X축 관성 벡터
    vy: 0,               // Y축 관성 벡터
    ...type,
  };

  document.getElementById("menu").classList.add("hidden");
  document.getElementById("pause").classList.add("hidden");
  gameState = "playing";
  loop(); // 게임 루프 시작
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

/* =========================
   Update Logic (핵심 수정)
========================= */
function update() {
  if (gameState !== "playing" || !car) return;

  const forward = keys["ArrowUp"] || keys["KeyW"];
  const backward = keys["ArrowDown"] || keys["KeyS"];
  const left = keys["ArrowLeft"] || keys["KeyA"];
  const right = keys["ArrowRight"] || keys["KeyD"];
  const space = keys["Space"];

  // 1. 가속 / 감속 (현실적인 가속감)
  if (forward) {
    car.speed += car.accel;
  } else if (backward) {
    car.speed -= car.accel;
  } else {
    // 아무것도 안 누르면 서서히 멈춤
    car.speed *= 0.95; 
  }

  // 최대 속도 제한
  // 후진 속도는 전진 속도의 절반 정도로 제한
  const maxReverse = -car.maxSpeed * 0.5;
  if (car.speed > car.maxSpeed) car.speed = car.maxSpeed;
  if (car.speed < maxReverse) car.speed = maxReverse;

  // 멈춤에 가까우면 0으로 고정 (떨림 방지)
  if (Math.abs(car.speed) < 0.01) car.speed = 0;

  // 2. 스티어링 (핸들링)
  // 차가 움직일 때만 회전 가능 (후진 시 반대 방향 회전 구현)
  if (Math.abs(car.speed) > 0.1) {
    // 드리프트 중이면 회전각을 확 키움 (확 꺾이는 느낌)
    let turnMultiplier = space ? 2.5 : 1; 
    
    // 후진 중이면 핸들 방향 반대로
    const direction = car.speed > 0 ? 1 : -1;
    
    if (left) car.angle -= car.turn * turnMultiplier * direction;
    if (right) car.angle += car.turn * turnMultiplier * direction;
  }

  // 3. 물리 벡터 계산 (드리프트 구현 핵심)
  // 차가 바라보는 방향의 벡터
  const headingX = Math.cos(car.angle);
  const headingY = Math.sin(car.angle);

  // 현재 속도를 기준으로 '목표 이동 벡터' 계산
  // 드리프트(Space) 중이면 관성을 유지하려 하므로, 바라보는 방향으로 벡터가 덜 따라감
  const grip = space ? 0.05 : 0.2; // space 누르면 그립력 대폭 감소 (미끄러짐)

  // 관성(vx, vy)을 현재 바라보는 방향으로 서서히 보정
  car.vx = car.vx * (1 - grip) + (headingX * car.speed) * grip;
  car.vy = car.vy * (1 - grip) + (headingY * car.speed) * grip;

  // 마찰력 적용 (자연스러운 감속)
  car.vx *= car.friction;
  car.vy *= car.friction;

  // 4. 위치 업데이트
  car.x += car.vx;
  car.y += car.vy;

  // 화면 밖으로 나가면 반대편에서 등장
  if (car.x < 0) car.x = canvas.width;
  if (car.x > canvas.width) car.x = 0;
  if (car.y < 0) car.y = canvas.height;
  if (car.y > canvas.height) car.y = 0;

  // 5. HUD 업데이트 (실제 속도 느낌을 위해 10을 곱해서 표시)
  const displaySpeed = Math.floor(Math.sqrt(car.vx*car.vx + car.vy*car.vy) * 15);
  speedText.textContent = displaySpeed + " km/h";
}

/* =========================
   Draw (새로 추가됨)
========================= */
function draw() {
  // 배경 지우기
  ctx.fillStyle = "#2c2c2c";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (!car) return;

  // 타이어 자국 (드리프트 시각 효과 - 간단 구현)
  if (keys["Space"] && Math.abs(car.speed) > 2) {
      // 여기에 타이어 자국 그리는 로직 추가 가능
  }

  // 차 그리기
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);

  // 차 몸체
  ctx.fillStyle = car.color;
  ctx.shadowBlur = 10;
  ctx.shadowColor = car.color;
  ctx.fillRect(-20, -10, 40, 20); // 중심을 가운데로

  // 차 헤드라이트 (앞쪽 표시)
  ctx.fillStyle = "#fff";
  ctx.shadowBlur = 5;
  ctx.shadowColor = "#fff";
  ctx.fillRect(15, -8, 5, 4);
  ctx.fillRect(15, 4, 5, 4);
  
  // 차 후미등 (빨간불)
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

/* =========================
   Game Loop (새로 추가됨)
========================= */
function loop() {
  if (gameState === "playing") {
    update();
    draw();
    requestAnimationFrame(loop);
  } else if (gameState === "pause") {
    // 일시정지 상태에서도 화면은 그려줌 (멈춘 모습)
    draw();
  }
}
