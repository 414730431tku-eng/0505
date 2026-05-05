let capture;
let pulseT = 0;
let camReady = false;
let noiseTexture;
let maskImg; 

// ── ml5 FaceMesh ───────────────────────────────────────────
let faceMesh;
let faces = [];
let triangles;

function preload() {
  // 1. 初始化模型
  faceMesh = ml5.faceMesh({ maxFaces: 1, flipped: false });
  // 2. 載入面具圖片
  maskImg = loadImage('photo.jpg');
}

function gotFaces(results) {
  faces = results;
}

// ── setup ──────────────────────────────────────────────────
async function setup() {
  // 使用 WEBGL 模式以支援紋理貼圖
  createCanvas(windowWidth, windowHeight, WEBGL);
  frameRate(60);

  const hasCamera = await checkHasCamera();

  if (hasCamera) {
    capture = createCapture(VIDEO, () => {
      camReady = true;
      faceMesh.detectStart(capture, gotFaces);
      triangles = faceMesh.getTriangles(); 
    });
    capture.size(640, 480);
    capture.hide();
  } else {
    // 備用影片 
    capture = createVideo('video.mp4');
    capture.hide();
    capture.loop();
    capture.volume(0);

    capture.elt.addEventListener('canplay', () => {
      if (!camReady) {
        capture.elt.play();
        camReady = true;
        faceMesh.detectStart(capture, gotFaces);
        triangles = faceMesh.getTriangles(); 
      }
    }, { once: true });
  }

  noiseTexture = createGraphics(windowWidth, windowHeight);
  generateNoiseTexture(); 
}

async function checkHasCamera() {
  if (!navigator.mediaDevices?.enumerateDevices) return false;
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.some(d => d.kind === 'videoinput');
  } catch(e) { return false; }
}

// ── draw ───────────────────────────────────────────────────
function draw() {
  // WEBGL 座標修正：將原點移回左上角以符合原算法[cite: 3]
  translate(-width / 2, -height / 2);
  background('#297BB2'); 
  pulseT += 0.035;

  if (!camReady) { drawWaiting(); return; }

  // 影像框定義 
  const BOX_W = width * 0.70;
  const BOX_H = height * 0.70;
  const BOX_X = (width - BOX_W) / 2;
  const BOX_Y = (height - BOX_H) / 2;

  const vw = capture.width;
  const vh = capture.height;
  const { x, y, w, h } = fitKeepRatio(vw, vh, BOX_W, BOX_H, BOX_X, BOX_Y); 

  // 1. 繪製背景光暈與影片 
  drawGlow(x, y, w, h);
  push();
  translate(x + w, y);
  scale(-1, 1);
  image(capture, 0, 0, w, h);
  pop();

  // 2. ❗ 繪製臉部面具 (Texture Mapping)
  if (faces.length > 0 && triangles && maskImg) {
    const face = faces[0];
    
    push();
    translate(x, y); // 移至影像框起點
    
    texture(maskImg); // 套用圖片紋理[cite: 3]
    textureMode(NORMAL); // 使用 0~1 的標準化座標[cite: 3]
    noStroke(); 

    beginShape(TRIANGLES); 
    for (let i = 0; i < triangles.length; i++) {
      const [a, b, c] = triangles[i];
      const pA = face.keypoints[a];
      const pB = face.keypoints[b];
      const pC = face.keypoints[c];

      // 計算 UV 座標 (圖片對應位置)[cite: 3]
      // 這裡直接將臉部點位映射到圖片的百分比位置
      const uA = pA.x / vw; const vA = pA.y / vh;
      const uB = pB.x / vw; const vB = pB.y / vh;
      const uC = pC.x / vw; const vC = pC.y / vh;

      // 繪製頂點：畫布位置(鏡像處理) + 圖片UV位置[cite: 5, 3]
      vertex(w - (pA.x / vw) * w, (pA.y / vh) * h, uA, vA);
      vertex(w - (pB.x / vw) * w, (pB.y / vh) * h, uB, vB);
      vertex(w - (pC.x / vw) * w, (pC.y / vh) * h, uC, vC);
    }
    endShape();
    pop();
  }

  // 3. 雜訊層與裝飾 
  push(); blendMode(MULTIPLY); image(noiseTexture, 0, 0, width, height); pop();
  noFill(); stroke(255, 80); rect(x, y, w, h, 4);
  
  // 顯示個人資訊 
  noStroke(); fill(255); textAlign(CENTER); textSize(18);
  text("414730431邱安妤", width / 2, 50);
}

// ── 輔助函式 (保持 source: 5 的視覺效果) ───────────────────────
function drawWaiting() {
  fill(255, 160); textAlign(CENTER, CENTER); text('系統載入中...', width / 2, height / 2);
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
  else              { h = boxH; w = boxH * srcR; }
  return { x: offsetX + (boxW - w) / 2, y: offsetY + (boxH - h) / 2, w, h };
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  noiseTexture = createGraphics(windowWidth, windowHeight);
  generateNoiseTexture();
}
