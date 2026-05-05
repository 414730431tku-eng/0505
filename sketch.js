let video;
let faceMesh;
let faces = [];
let triangles;

let modelReady = false;
let webglSupported = true;

function preload() {
  try {
    // 初始化模型
    faceMesh = ml5.faceMesh({ maxFaces: 1, flipped: true });
  } catch (e) {
    console.log("ml5 載入失敗", e);
  }
}

function setup() {
  // ✅ 檢查 WebGL 支援
  webglSupported = checkWebGL();

  createCanvas(windowWidth, windowHeight);

  // 建立攝影機
  video = createCapture(VIDEO, { flipped: true });
  video.size(width * 0.5, height * 0.5);
  video.hide();

  if (webglSupported && faceMesh) {
    try {
      faceMesh.detectStart(video, gotFaces);
      triangles = faceMesh.getTriangles();
      modelReady = true;
    } catch (e) {
      console.log("模型啟動失敗", e);
      modelReady = false;
    }
  }
}

function gotFaces(results) {
  faces = results;
}

function draw() {
  // ✅ 背景顏色
  background("#e7c6ff");

  // 計算置中位置
  let vw = width * 0.5;
  let vh = height * 0.5;
  let vx = (width - vw) / 2;
  let vy = (height - vh) / 2;

  // 顯示攝影機畫面（置中）
  image(video, vx, vy, vw, vh);

  // ❌ 如果不支援 WebGL
  if (!webglSupported) {
    fill(0);
    textAlign(CENTER, CENTER);
    textSize(20);
    text("❌ 此裝置不支援 WebGL\n無法使用臉部辨識", width / 2, height / 2);
    return;
  }

  // ❌ 模型沒載入成功
  if (!modelReady) {
    fill(0);
    textAlign(CENTER, CENTER);
    textSize(20);
    text("⚠️ ml5 模型載入失敗", width / 2, height / 2);
    return;
  }

  // ✅ 有偵測到臉
  if (faces.length > 0) {
    let face = faces[0];

    video.loadPixels();

    push();
    translate(vx, vy); // ⭐ 關鍵：讓三角形對齊畫面位置

    beginShape(TRIANGLES);

    for (let i = 0; i < triangles.length; i++) {
      let [a, b, c] = triangles[i];

      let pointA = face.keypoints[a];
      let pointB = face.keypoints[b];
      let pointC = face.keypoints[c];

      let cx = (pointA.x + pointB.x + pointC.x) / 3;
      let cy = (pointA.y + pointB.y + pointC.y) / 3;

      let index = (floor(cx) + floor(cy) * video.width) * 4;
      let rr = video.pixels[index];
      let gg = video.pixels[index + 1];
      let bb = video.pixels[index + 2];

      stroke(255, 255, 0);
      fill(rr, gg, bb);

      vertex(pointA.x, pointA.y);
      vertex(pointB.x, pointB.y);
      vertex(pointC.x, pointC.y);
    }

    endShape();
    pop();
  }
}

// ✅ 檢查 WebGL
function checkWebGL() {
  try {
    let canvas = document.createElement("canvas");
    return !!window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"));
  } catch (e) {
    return false;
  }
}

// 點擊看資料
function mousePressed() {
  console.log(faces);
}