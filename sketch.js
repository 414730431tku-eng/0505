let video;
let faceMesh;
let faces = [];
let triangles = []; // ✅ 初始化為空陣列，防止 draw() 報錯

let modelReady = false;
let webglSupported = true;

// 1. 移除 preload 內的 ml5 初始化，改為空白或處理其他素材
function preload() {
  // 原本這裡的 ml5 初始化建議移除
}

// 2. 在 setup 內進行非同步初始化
function setup() {
  webglSupported = checkWebGL(); //
  createCanvas(windowWidth, windowHeight); //[cite: 3]

  // 建立攝影機[cite: 3]
  video = createCapture(VIDEO, { flipped: true });
  video.size(width * 0.5, height * 0.5); //[cite: 3]
  video.hide(); //[cite: 3]

  // ✅ 正確的 ml5 v1.0 初始化流程
  if (typeof ml5 !== 'undefined') {
    // 建立 faceMesh 物件，並傳入回呼函式[cite: 3]
    faceMesh = ml5.faceMesh({ maxFaces: 1, flipped: true }, () => {
      console.log("模型載入成功！");
      
      // 模型準備好後，才開始偵測與獲取三角形索引
      faceMesh.detectStart(video, gotFaces); //[cite: 3]
      triangles = faceMesh.getTriangles(); //[cite: 3]
      modelReady = true; //[cite: 3]
    });
  } else {
    console.error("錯誤：找不到 ml5 函式庫，請檢查 index.html 是否有引用 CDN");
  }
}

// ... 後半部的 gotFaces, draw, checkWebGL 保持原樣即可[cite: 3]
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
