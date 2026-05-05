let video;
let faceMesh;
let faces = [];
let triangles = []; // ✅ 修正點：預設空陣列防止 draw() 報錯

let modelReady = false;
let webglSupported = true;

function setup() {
  webglSupported = checkWebGL(); 
  createCanvas(windowWidth, windowHeight); 

  // 設定攝影機
  video = createCapture(VIDEO, { flipped: true }); 
  video.size(640, 480); 
  video.hide(); 

  // ✅ 修正點：使用 ml5 v1 標準載入流程
  if (typeof ml5 !== 'undefined') {
    faceMesh = ml5.faceMesh({ maxFaces: 1, flipped: true }, () => {
      console.log("模型已就緒");
      modelReady = true;
      faceMesh.detectStart(video, gotFaces); 
      triangles = faceMesh.getTriangles(); 
    });
  } else {
    console.error("錯誤：找不到 ml5，請檢查 index.html");
  }
}

function gotFaces(results) {
  faces = results; 
}

function draw() {
  background("#e7c6ff"); 

  let vw = width * 0.5;
  let vh = height * 0.5;
  let vx = (width - vw) / 2;
  let vy = (height - vh) / 2;

  // 顯示影片
  image(video, vx, vy, vw, vh); 

  if (!modelReady) {
    fill(0);
    textAlign(CENTER);
    text("模型載入中...", width / 2, height / 2);
    return;
  }

  if (faces.length > 0) {
    let face = faces[0]; 
    video.loadPixels(); 

    push();
    translate(vx, vy); 
    
    // ✅ 修正點：只把臉部面具鏡像翻轉
    translate(vw, 0);
    scale(-1, 1);

    beginShape(TRIANGLES); 
    for (let i = 0; i < triangles.length; i++) {
      let [a, b, c] = triangles[i]; 

      let pointA = face.keypoints[a]; 
      let pointB = face.keypoints[b];
      let pointC = face.keypoints[c];

      // 顏色採樣（使用原始座標）
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

function checkWebGL() {
  try {
    let canvas = document.createElement("canvas");
    return !!window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"));
  } catch (e) {
    return false;
  }
}
