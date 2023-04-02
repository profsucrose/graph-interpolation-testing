const canvas = document.querySelector("canvas");
const mathInput = document.querySelector("#equation");
const timeDisplay = document.querySelector("#time-display");
const usingQuadratic = document.querySelector("#using-quadratic");

canvas.width = 500;
canvas.height = 500;

const ctx = canvas.getContext("2d");

// a0 =
//   ((x1 * x2) / ((x2 - x0) * (x1 - x0))) * y0 +
//   ((-x0 * x2) / ((x1 - x0) * (x2 - x1))) * y1 +
//   ((x0 * x1) / ((x2 - x0) * (x2 - x1))) * y2;
// a1 =
//   (-(x2 + x1) / ((x2 - x0) * (x1 - x0))) * y0 +
//   ((x2 + x0) / ((x1 - x0) * (x2 - x1))) * y1 +
//   (-(x1 + x0) / ((x2 - x0) * (x2 - x1))) * y2;
// a2 =
//   (1 / ((x2 - x0) * (x1 - x0))) * y0 +
//   (-1 / ((x1 - x0) * (x2 - x1))) * y1 +
//   (1 / ((x2 - x0) * (x2 - x1))) * y2;

// p0x = 1;
// p0y = 1;

// p1x = 1;
// p1y = 1;

// p2x = (2*p1x*(-1+t))/t

let minX = -10;
let maxX = 10;
let minY = -10;
let maxY = 10;
let sampleCount = 100;

function SampleBuffer(sampleCount) {
  const samples = new Float32Array(sampleCount);

  let minX, maxX, sampleWidth;

  function refreshSamples(expression, _minX, _maxX) {
    minX = _minX;
    maxX = _maxX;

    sampleWidth = (maxX - minX) / (sampleCount - 1);

    for (let i = 0; i < sampleCount; i++) {
      const x = minX + sampleWidth * i;
      const y = evaluate(expression, x, t);

      samples[i] = y;
    }
  }

  function sample(x) {
    if (x < minX + 1e-6) {
      const a = samples[0];
      const b = samples[1];
      return a + ((b - a) / sampleWidth) * (x - minX);
    }

    if (x > maxX - 1e-6) {
      const a = samples[sampleCount - 2];
      const b = samples[sampleCount - 1];
      return b + ((b - a) / sampleWidth) * (x - maxX);
    }

    const i = (x - minX) / sampleWidth;
    const leftI = Math.floor(i);
    const rightI = Math.ceil(i);
    const a = samples[leftI];
    const b = samples[rightI];
    const leftX = minX + leftI * sampleWidth;
    return a + ((b - a) / sampleWidth) * (x - leftX);
  }

  return {
    samples,
    refreshSamples,
    sample,
  };
}

function evaluate(expression, x, t) {
  return eval(`x=${x};t=${t};${expression}`);
}

function worldXToCanvas(x) {
  return ((x - minX) / (maxX - minX)) * canvas.width;
}

function worldYToCanvas(y) {
  return (1 - (y - minY) / (maxY - minY)) * canvas.height;
}

function worldToCanvas(x, y) {
  return [worldXToCanvas(x), worldYToCanvas(y)];
}

function axes() {
  for (let x = minX; x <= maxX + 1e-6; x += 1) {
    if (Math.abs(x) < 1e-6) continue;
    ctx.beginPath();

    let topY = 0.1;
    let bottomY = -0.1;

    let canvasX = worldXToCanvas(x);
    let canvasTopY = worldYToCanvas(topY);
    let canvasBottomY = worldYToCanvas(bottomY);

    ctx.moveTo(canvasX, canvasTopY);
    ctx.lineTo(canvasX, canvasBottomY);

    ctx.stroke();
  }

  for (let y = minY; y <= maxY + 1e-6; y += 1) {
    if (Math.abs(y) < 1e-6) continue;
    ctx.beginPath();

    let leftX = -0.1;
    let rightX = 0.1;

    let canvasY = worldYToCanvas(y);
    let canvasLeftX = worldXToCanvas(leftX);
    let canvasRightX = worldXToCanvas(rightX);

    ctx.moveTo(canvasLeftX, canvasY);
    ctx.lineTo(canvasRightX, canvasY);

    ctx.stroke();
  }

  // Y axis
  let canvasX = worldXToCanvas(0);
  ctx.beginPath();
  ctx.moveTo(canvasX, 0);
  ctx.lineTo(canvasX, canvas.height);
  ctx.stroke();

  // X axis
  let canvasY = worldYToCanvas(0);
  ctx.beginPath();
  ctx.moveTo(0, canvasY);
  ctx.lineTo(canvas.width, canvasY);
  ctx.stroke();
}

function render(sampler, t) {
  const sampleWidth = (maxX - minX) / (sampleCount - 1);

  ctx.beginPath();
  for (let i = 0; i < sampleCount; i++) {
    const x = minX + sampleWidth * i;
    const y = evaluate(expression, x, t);

    const [canvasX, canvasY] = worldToCanvas(x, y);

    if (i == 0) {
      ctx.moveTo(canvasX, canvasY);
    } else {
      ctx.lineTo(canvasX, canvasY);
    }
  }
  ctx.stroke();
}

function renderQuadratic(expression, t) {
  const sampleWidth = (maxX - minX) / (sampleCount - 1);

  ctx.beginPath();
  for (let i = 0; i < sampleCount; i += 2) {
    const startX = minX + sampleWidth * i + 1e-6;
    const middleX = startX + sampleWidth;
    const endX = middleX + sampleWidth;

    const startY = evaluate(expression, startX, t);
    const middleY = evaluate(expression, middleX, t);
    const endY = evaluate(expression, endX, t);

    const cpX = 2 * middleX - startX / 2 - endX / 2;
    const cpY = 2 * middleY - startY / 2 - endY / 2;

    const [canvasStartX, canvasStartY] = worldToCanvas(startX, startY);
    const [canvasCpX, canvasCpY] = worldToCanvas(cpX, cpY);
    const [canvasEndX, canvasEndY] = worldToCanvas(endX, endY);

    ctx.moveTo(canvasStartX, canvasStartY);
    ctx.quadraticCurveTo(canvasCpX, canvasCpY, canvasEndX, canvasEndY);
  }
  ctx.stroke();
}

let t = 0;

let FPS = 30;

let samplesA = new SampleBuffer(sampleCount);
let samplesB = new SampleBuffer(sampleCount);

function tick() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  axes();
  const expression = mathInput.value;
  try {
    evaluate(expression, 0, t);
    const r = usingQuadratic.checked ? renderQuadratic : render;
    r(mathInput.value, t, minX, maxX, minY, maxY, sampleCount);
  } catch (e) {
    console.log(e);
  }
  t += 1 / FPS;
  timeDisplay.innerText = t.toFixed(1);
}

setInterval(tick, 1000 / FPS);
