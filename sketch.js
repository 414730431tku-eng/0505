let capture;
let pulseT    = 0;
let camReady  = false;
let noiseTexture;

// ── ml5 FaceMesh ───────────────────────────────────────────
let faceMesh;
let faces     = [];
let triangles;

function preload() {
  // 初始化模型
  faceMesh = ml5.faceMesh({ maxFaces: 1, flipped: false });
}

function gotFaces(results) {
  faces = results;
}

// ── setup ──────────────────────────────────────────────────
async function setup() {
  createCanvas(windowWidth, windowHeight);
  frameRate(60);

  const hasCamera = await checkHasCamera();

  if (hasCamera) {
    // 優先使用攝影機
    capture = createCapture(VIDEO, () => {
      camReady  = true;
      faceMesh.detectStart(capture, gotFaces);
      triangles = faceMesh.getTriangles();
    });
    capture.size(640, 480);
    capture.hide();
  } else {
    // 備用：讀取資料夾內的 video.mp4  
    capture = createVideo('video.mp4', () => {
      console.log("影片載入完成");
    });
    
    capture.hide();
    capture.loop(); // 影片循環播放
    capture.volume(0); // 靜音以利自動播放

    capture.elt.addEventListener('canplay', () => {
      if (!camReady) {
        capture.elt.play();
        camReady  = true;
        faceMesh.detectStart(capture, gotFaces);
        triangles = faceMesh.getTriangles();
      }
    }, { once: true });
  }

  // 產生雜訊材質  
  noiseTexture = createGraphics(windowWidth, windowHeight);
  generateNoiseTexture();
}

// ── 偵測是否有攝影機 ────────────────────────────────────────
async function checkHasCamera() {
  if (!navigator.mediaDevices?.enumerateDevices) return false;
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.some(d => d.kind === 'videoinput');
  } catch(e) { return false; }
}

// ── draw ───────────────────────────────────────────────────
function draw() {
  background('#4e8f61'); // 經典藍色背景  
  pulseT += 0.035;

  if (!camReady) { drawWaiting(); return; }

  // 影像框定義（畫面中央 70%）  
  const BOX_W = width  * 0.70;
  const BOX_H = height * 0.70;
  const BOX_X = (width  - BOX_W) / 2;
  const BOX_Y = (height - BOX_H) / 2;

  const vw = capture.width;
  const vh = capture.height;
  const { x, y, w, h } = fitKeepRatio(vw, vh, BOX_W, BOX_H, BOX_X, BOX_Y);

  // 繪製光暈底框  
  drawGlow(x, y, w, h);

  // 繪製鏡像影像  
  push();
  translate(x + w, y);
  scale(-1, 1);
  image(capture, 0, 0, w, h);
  pop();

  // 執行 [source: 5] 的臉部網格算法
  drawFaceMesh(x, y, w, h, vw, vh);

  // 疊加雜訊層  
  push(); 
  blendMode(MULTIPLY); 
  image(noiseTexture, 0, 0, width, height); 
  pop();

  // 繪製外框與文字  
  noFill(); stroke(255, 255, 255, 80); strokeWeight(1); rect(x, y, w, h, 4);
  
  // 顯示學號姓名
  noStroke(); fill(255); textAlign(CENTER); textSize(18);
  text("414730431 邱安妤", width / 2, 50);
}

// ── [source: 5] 核心算法：臉部網格繪製 ─────────────────────────
function drawFaceMesh(x, y, w, h, vw, vh) {
  if (faces.length === 0 || !triangles) return;

  const face = faces[0];
  capture.loadPixels();
  if (!capture.pixels || capture.pixels.length === 0) return;

  beginShape(TRIANGLES);
  for (let i = 0; i < triangles.length; i++) {
    const [a, b, c] = triangles[i];  
    const pA = face.keypoints[a];
    const pB = face.keypoints[b];
    const pC = face.keypoints[c];

    // 三角形重心取色  
    const cx = (pA.x + pB.x + pC.x) / 3;
    const cy = (pA.y + pB.y + pC.y) / 3;
    const idx = (floor(cx) + floor(cy) * vw) * 4;
    const rr  = capture.pixels[idx]     || 0;
    const gg  = capture.pixels[idx + 1] || 0;
    const bb  = capture.pixels[idx + 2] || 0;

    stroke(255, 255, 0, 90);  
    strokeWeight(1.8);
    fill(rr, gg, bb);

    // 關鍵鏡像座標映射公式  
    vertex(x + w - (pA.x / vw) * w, y + (pA.y / vh) * h);
    vertex(x + w - (pB.x / vw) * w, y + (pB.y / vh) * h);
    vertex(x + w - (pC.x / vw) * w, y + (pC.y / vh) * h);
  }
  endShape();
}

// ── 其他視覺輔助函式 (來自 source: 5) ───────────────────────────
function drawWaiting() {
  const r = 12 + 4 * sin(pulseT * 2);
  fill(255, 160);
  textAlign(CENTER, CENTER);
  text('系統讀取中...', width / 2, height / 2);
}

function drawGlow(x, y, w, h) {
  const a = 30 + 15 * sin(pulseT);
  noStroke();
  for (let i = 3; i >= 1; i--) {
    fill(255, 255, 255, a * (i / 3) * 0.25);
    rect(x - i*7, y - i*7, w + i*14, h + i*28, 4);
  }
}

function generateNoiseTexture() {
  noiseTexture.loadPixels();
  for (let i = 0; i < noiseTexture.pixels.length; i += 4) {
    const v = random(255);
    noiseTexture.pixels[i] = noiseTexture.pixels[i+1] = noiseTexture.pixels[i+2] = v;
    noiseTexture.pixels[i+3] = random(15, 45);
  }
  noiseTexture.updatePixels();
}

function fitKeepRatio(srcW, srcH, boxW, boxH, offsetX, offsetY) {
  const srcR = srcW / srcH, boxR = boxW / boxH;
  let w, h;
  if (srcR > boxR) { w = boxW; h = boxW / srcR; }
  else             { h = boxH; w = boxH * srcR; }
  return { x: offsetX + (boxW - w) / 2, y: offsetY + (boxH - h) / 2, w, h };
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
