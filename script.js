const canvas = document.querySelector("canvas");
const mathInput = document.querySelector("#equation");
const timeDisplay = document.querySelector("#time-display");
const refreshPeriodDisplay = document.querySelector("#refresh-period-display");
const usingQuadratic = document.querySelector("#using-quadratic");
const usingInterpolation = document.querySelector("#using-interpolation");
const usingQuadraticOverLinearInterpolation = document.querySelector(
  "#using-quadratic-for-interpolation"
);
const usingJS = document.querySelector("#using-js");

canvas.width = 500;
canvas.height = 500;

const ctx = canvas.getContext("2d");

let mathParser = MathParser();
let evaluator;

if (usingJS.checked) {
  evaluator = mathParser.parse(mathInput.value);
} else {
  let expr = mathParser.expr(mathInput.value);
  evaluator = (x, t) => mathParser.evaluate(expr, { x, t });
}

function secondOrderInterp(x0, x1, x2, y0, y1, y2) {
  const a0 =
    ((x1 * x2) / ((x2 - x0) * (x1 - x0))) * y0 +
    (-(x0 * x2) / ((x1 - x0) * (x2 - x1))) * y1 +
    ((x0 * x1) / ((x2 - x0) * (x2 - x1))) * y2;
  const a1 =
    (-(x2 + x1) / ((x2 - x0) * (x1 - x0))) * y0 +
    ((x2 + x0) / ((x1 - x0) * (x2 - x1))) * y1 +
    (-(x1 + x0) / ((x2 - x0) * (x2 - x1))) * y2;
  const a2 =
    (1 / ((x2 - x0) * (x1 - x0))) * y0 +
    (-1 / ((x1 - x0) * (x2 - x1))) * y1 +
    (1 / ((x2 - x0) * (x2 - x1))) * y2;
  return (x) => a2 * x ** 2 + a1 * x + a0;
}

// p0x = 1;
// p0y = 1;

// p1x = 1;
// p1y = 1;

// p2x = (2*p1x*(-1+t))/t

let minX = -10;
let maxX = 10;
let minY = -10;
let maxY = 10;
let sampleCount = 500;

function SampleBuffer(sampleCount) {
  const samples = new Float32Array(sampleCount);

  let minX, maxX, sampleWidth;

  function refreshSamples(evaluator, t, _minX, _maxX) {
    minX = _minX;
    maxX = _maxX;

    sampleWidth = (maxX - minX) / (sampleCount - 1);

    for (let i = 0; i < sampleCount; i++) {
      const x = minX + sampleWidth * i;
      const y = evaluator(x, t);

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
    x = Math.floor(x);
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

function render(sampler) {
  const sampleWidth = (maxX - minX) / (sampleCount - 1);

  ctx.beginPath();
  for (let i = 0; i < sampleCount; i++) {
    const x = minX + sampleWidth * i;
    const y = sampler(x);

    const [canvasX, canvasY] = worldToCanvas(x, y);

    if (i == 0) {
      ctx.moveTo(canvasX, canvasY);
    } else {
      ctx.lineTo(canvasX, canvasY);
    }
  }
  ctx.stroke();
}

function renderQuadratic(sampler) {
  const sampleWidth = (maxX - minX) / (sampleCount - 1);

  ctx.beginPath();
  for (let i = 0; i < sampleCount; i += 2) {
    const startX = minX + sampleWidth * i + 1e-6;
    const middleX = startX + sampleWidth;
    const endX = middleX + sampleWidth;

    const startY = sampler(startX);
    const middleY = sampler(middleX);
    const endY = sampler(endX);

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

let samplesA = SampleBuffer(sampleCount);
let samplesB = SampleBuffer(sampleCount);
let samplesC = SampleBuffer(sampleCount);

let refreshPeriodTicks = 3;
let ticksSinceRefresh = refreshPeriodTicks;

function sampleInterp(x) {
  let a = samplesA.sample(x);
  let b = samplesB.sample(x);
  let c = samplesC.sample(x);
  if (usingQuadraticOverLinearInterpolation.checked) {
    return secondOrderInterp(
      0,
      0.5,
      1,
      a,
      b,
      c
    )(ticksSinceRefresh / refreshPeriodTicks);
  } else {
    return a + ((c - a) / refreshPeriodTicks) * ticksSinceRefresh;
  }
}

function updateBounds() {
  // minX += 0.1;
  // maxX += 0.1;
  // minX += 0.1*Math.sin(t);
  // maxX += 0.1*Math.cos(t);
}

function setSampleCount(_sampleCount) {
  sampleCount = _sampleCount;
  samplesA = SampleBuffer(sampleCount);
  samplesB = SampleBuffer(sampleCount);
  samplesC = SampleBuffer(sampleCount);
}

function tick() {
  const expression = mathInput.value;
  if (ticksSinceRefresh >= refreshPeriodTicks) {
    // samplesA.refreshSamples(expression, minX, maxX);

    const currentT = t;
    const nextT = t + refreshPeriodTicks * (1 / FPS);

    samplesA.refreshSamples(evaluator, t, minX - 10, maxX + 10);
    samplesB.refreshSamples(
      evaluator,
      currentT + (nextT - currentT) / 2,
      minX - 10,
      maxX + 10
    );
    samplesC.refreshSamples(evaluator, nextT, minX - 10, maxX + 10);

    // [samplesA, samplesB] = [samplesB, samplesA];
    // samplesB.refreshSamples(expression, t, minX - 10, maxX + 10);

    ticksSinceRefresh = 0;
  } else {
    ticksSinceRefresh++;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  axes();

  const _evaluator = (x) => evaluator(x, t);

  try {
    const r = usingQuadratic.checked ? renderQuadratic : render;
    const sampler = usingInterpolation.checked ? sampleInterp : _evaluator;

    ctx.strokeStyle = "#00f";
    r(sampleInterp);

    ctx.strokeStyle = "#f00";
    r(_evaluator);

    ctx.strokeStyle = "#000";
  } catch (e) {
    console.log(e);
  }
  t += 1 / FPS;
  timeDisplay.innerText = t.toFixed(1);
  refreshPeriodDisplay.innerText = refreshPeriodTicks;

  updateBounds();
}

mathInput.addEventListener("keyup", () => {
  const expression = mathInput.value;
  try {
    let newEvaluator;
    if (usingJS.checked) {
      newEvaluator = mathParser.parse(expression);
    } else {
      let expr = mathParser.expr(expression);
      newEvaluator = (x, t) => mathParser.evaluate(expr, { x, t });
    }
    newEvaluator(0, 0);
    evaluator = newEvaluator;
  } catch (e) {
    console.log("Error in updating function", e);
  }
});

// -2/(1 + Math.exp(-x + 5)) + (-2)/(1 + (x-30)**2)

setInterval(tick, 1000 / FPS);
