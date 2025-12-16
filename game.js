const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const carTypes = {
  sport: { maxSpeed: 9, accel: 0.3, turn: 0.05, drift: 0.92, color: 'red' },
  drift: { maxSpeed: 8, accel: 0.26, turn: 0.07, drift: 0.88, color: 'cyan' },
  heavy: { maxSpeed: 7, accel: 0.22, turn: 0.04, drift: 0.97, color: 'orange' }
};

let keys = {};
let car;

function resetGame() {
  const type = carTypes[document.getElementById('carSelect').value];
  car = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    angle: 0,
    speed: 0,
    vx: 0,
    vy: 0,
    ...type
  };
}

resetGame();

document.addEventListener('keydown', e => keys[e.code] = true);
document.addEventListener('keyup', e => keys[e.code] = false);

function update() {
  if (keys['ArrowUp']) car.speed += car.accel;
  if (keys['ArrowDown']) car.speed *= 0.94;

  car.speed = Math.min(car.speed, car.maxSpeed);
  car.speed *= 0.99;

  if (keys['ArrowLeft']) car.angle -= car.turn * (car.speed / car.maxSpeed);
  if (keys['ArrowRight']) car.angle += car.turn * (car.speed / car.maxSpeed);

  const driftFactor = keys['Space'] ? car.drift : 0.98;

  car.vx += Math.cos(car.angle) * car.speed;
  car.vy += Math.sin(car.angle) * car.speed;

  car.vx *= driftFactor;
  car.vy *= driftFactor;

  car.x += car.vx;
  car.y += car.vy;

  if (car.x < 0) car.x = canvas.width;
  if (car.x > canvas.width) car.x = 0;
  if (car.y < 0) car.y = canvas.height;
  if (car.y > canvas.height) car.y = 0;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  ctx.fillStyle = car.color;
  ctx.fillRect(-16, -8, 32, 16);
  ctx.restore();
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();
