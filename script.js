const canvas = document.getElementById("main-canvas");
const smallCanvas = document.getElementById("small-canvas");
const displayBox = document.getElementById("prediction");
const confidence = document.getElementById("confidence");

const inputBox = canvas.getContext("2d");
const smBox = smallCanvas.getContext("2d");

let isDrawing = false;
let model;

/* Loads trained model */
async function init() {
  console.log("model loading...");
  model = await tf.loadLayersModel("model/model.json");
  console.log("model loaded..");
}

function drawStartEvent(event) {
  isDrawing = true;
  inputBox.fillStyle = "white";
  inputBox.strokeStyle = "black";
  inputBox.lineWidth = "15";
  inputBox.lineJoin = inputBox.lineCap = "round";
  inputBox.beginPath();
}
canvas.addEventListener("mousedown", drawStartEvent);
// canvas.addEventListener("ontouchstart", drawStartEvent);

function drawMoveEvent(event) {
  if (isDrawing) {
    drawStroke(event.clientX, event.clientY);
  }
}
canvas.addEventListener("mousemove", drawMoveEvent);
canvas.addEventListener("ontouchmove", drawMoveEvent);

function drawEndEvent(event) {
  isDrawing = false;
  updateDisplay(predict());
}
canvas.addEventListener("mouseup", drawEndEvent);
// canvas.addEventListener("ontouchend", drawEndEvent);

/* Draws on canvas */
function drawStroke(clientX, clientY) {
  // get mouse coordinates on canvas
  const rect = canvas.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;

  // draw
  inputBox.lineTo(x, y);
  inputBox.stroke();
  inputBox.moveTo(x, y);
}

/* Makes predictions */
function predict() {
  let values = getPixelData();
  let predictions = model.predict(values).dataSync();

  return predictions;
}

/* Returns pixel data from canvas after applying transformations */
function getPixelData(thresh = 100, size_thresh = 15) {
  const imgData = inputBox.getImageData(0, 0, canvas.width, canvas.height);

  const img = [];
  const width = canvas.width;
  const height = canvas.height;

  // Convert pixel data to 2D array
  for (let i = 0; i < height; i++) {
    const row = [];
    for (let j = 0; j < width; j++) {
      const index = (i * width + j) * 4; // Each pixel is represented by 4 values (RGBA)
      const red = imgData.data[index]; // Red channel value
      row.push(red / 255); // Normalize and push red channel value
    }
    img.push(row);
  }

  // Perform smart cropping
  const croppedImg = smartCrop(img, thresh, size_thresh);

  // Resize the cropped image to 28x28
  const resizedImg = resizeImage(croppedImg);
  //   downloadDrawing(resizedImg);

  // Reshape resized image into proper format for TensorFlow
  const values = tf.tensor(resizedImg).expandDims(0).expandDims(-1);

  return values;
}

function smartCrop(img, thresh = 100, size_thresh = 15) {
  const size = img.length;
  let min_x = size,
    min_y = size,
    max_x = 0,
    max_y = 0;

  // Find bounding box
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      if (img[x][y] < thresh) {
        min_x = Math.min(x, min_x);
        min_y = Math.min(y, min_y);
        max_x = Math.max(x, max_x);
        max_y = Math.max(y, max_y);
      }
    }
  }

  // Validate and adjust bounding box
  min_x = Math.max(min_x - size_thresh, 0);
  min_y = Math.max(min_y - size_thresh, 0);
  max_x = Math.min(max_x + size_thresh, size);
  max_y = Math.min(max_y + size_thresh, size);

  // Crop the image
  const crop = [];
  for (let i = min_x; i < max_x; i++) {
    const row = img[i].slice(min_y, max_y);
    crop.push(row);
  }

  return crop;
}

function resizeImage(img) {
  const resizedImg = [];

  // Resize the image to 28x28
  for (let i = 0; i < 28; i++) {
    const row = [];
    for (let j = 0; j < 28; j++) {
      const x = Math.floor((i / 28) * img.length);
      const y = Math.floor((j / 28) * img[0].length);
      row.push(img[x][y]);
    }
    resizedImg.push(row);
  }

  return resizedImg;
}

/* Displays predictions on screen */
function updateDisplay(predictions) {
  const table = document.querySelector("#prediction-table tbody");
  const digitNames = ["០", "១", "២", "៣", "៤", "៥", "៦", "៧", "៨", "៩"];
  console.log(table);
  // Populate table with prediction percentages for all digits
  for (let i = 0; i < predictions.length; i++) {
    const percentageCell = table.rows[i].cells[1];
    percentageCell.textContent = Math.round(predictions[i] * 100) + "%";
  }

  // Find index of best prediction, which corresponds to the predicted value
  const maxValue = Math.max(...predictions);
  const bestPred = predictions.indexOf(maxValue);
  const confidence = document.getElementById("confidence");
  const displayBox = document.getElementById("prediction");
  confidence.innerHTML = `<strong>${Math.round(
    maxValue * 100
  )}%</strong> confidence`;
  displayBox.innerText = digitNames[bestPred];
}

document.getElementById("erase").addEventListener("click", erase);

/* Clears canvas */
function erase() {
  //   downloadDrawing();
  inputBox.fillStyle = "white";
  inputBox.fillRect(0, 0, canvas.width, canvas.height);
  displayBox.innerText = "";
  confidence.innerHTML = "&#8212";
}
/* Convert canvas drawing to an image and download */
function downloadDrawing(imageData) {
  const imageDataURL = imageData.toDataURL("image/png");

  // Create a temporary link element
  const link = document.createElement("a");
  link.href = imageDataURL;
  link.download = "drawing.png"; // Set the download filename
  link.click(); // Trigger the download
}
erase();
init();
