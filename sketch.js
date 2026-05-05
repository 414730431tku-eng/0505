let video;
let faceMesh;
let faces = [];
let triangles = []; 

let modelReady = false;

function setup() {
  createCanvas(windowWidth, windowHeight);

  // 1. 建立攝影機並確保鏡像顯示  
  video = createCapture(VIDEO, { flipped: true });
  video.size(640, 480);
  video.hide();

  // 2. 初始化 ml5 faceMesh  
  // 注意：這裡加入了連結檢查與回呼函式
  faceMesh = ml5.faceMesh({ maxFaces: 1, flipped: true }, () => {
    console.log("✅ 模型載入成功");
    
    // 確保模型載入後才開始偵測  
    faceMesh.detectStart(video, gotFaces);
    
    // 抓取三角形拓撲數據  
    triangles = faceMesh.getTriangles();
    modelReady = true;
  });
}

function gotFaces(results) {
  faces = results; // 更新偵測到的臉部資料  
}

function draw() {
  background("#e7c6ff"); //  

  // 計算置中座標  
  let vw = width * 0.5;
  let vh = height * 0.5;
  let vx = (width - vw) / 2;
  let vy = (height - vh) / 2;

  // 繪製攝影機畫面  
  image(video, vx, vy, vw, vh);

  // 檢查模型與數據是否就緒
  if (!modelReady) {
    drawStatus("模型載入中...");
    return;
  }

  // 繪製臉部網格
  if (faces.length > 0 && triangles.length > 0) {
    let face = faces[0];
    video.loadPixels(); // 為了採樣顏色  

    push();
    translate(vx, vy); 
    
    // ⭐ 臉部辨識鏡像翻轉
    translate(vw, 0);
    scale(-1, 1);

    beginShape(TRIANGLES);
    for (let i = 0; i < triangles.length; i++) {
      let [a, b, c] = triangles[i];  

      let pointA = face.keypoints[a];  
      let pointB = face.keypoints[b];  
      let pointC = face.keypoints[c];  

      // 從影片中獲取顏色 (使用原始偵測座標點)  
      let cx = (pointA.x + pointB.x + pointC.x) / 3;
      let cy = (pointA.y + pointB.y + pointC.y) / 3;
      
      // 限制採樣範圍在影片邊界內
      let sampleX = constrain(floor(cx), 0, video.width - 1);
      let sampleY = constrain(floor(cy), 0, video.height - 1);
      let index = (sampleX + sampleY * video.width) * 4;
      
      let rr = video.pixels[index];  
      let gg = video.pixels[index + 1];  
      let bb = video.pixels[index + 2];  

      stroke(255, 255, 0); // 黃色邊線  
      fill(rr, gg, bb);    // 臉部顏色填充  

      vertex(pointA.x, pointA.y);  
      vertex(pointB.x, pointB.y);  
      vertex(pointC.x, pointC.y);  
    }
    endShape();
    pop();
  } else if (modelReady) {
    drawStatus("請將臉靠近鏡頭");
  }
}

function drawStatus(msg) {
  fill(0);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(24);
  text(msg, width / 2, height / 2 + 150);
}
