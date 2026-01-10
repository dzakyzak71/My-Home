const input = document.getElementById("input");
const output = document.getElementById("output");

input.addEventListener("keydown", function(e) {
  if (e.key === "Enter") {
    handleCommand(input.value);
    input.value = "";
  }
});

function handleCommand(cmd) {
  let result = "";

  switch (cmd) {
    case "whoami":
      result = "anonymous";
      break;

    case "ls":
      result = "about.txt  projects.txt  contact.txt";
      break;

    case "cat about.txt":
      result = "I am a web developer who loves dark themes & terminal UI.";
      break;

    case "open about":
      window.location.href = "about.html";
      return;

    case "clear":
      output.innerHTML = "";
      return;

    default:
      result = "command not found";
  }

  output.innerHTML += `<p>> ${cmd}</p><p>${result}</p>`;
}

/* MATRIX RAIN */
const canvas = document.getElementById("matrix");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const letters = "01アカサタナハマヤ0123456789";
const fontSize = 16;
const columns = canvas.width / fontSize;
const drops = Array(Math.floor(columns)).fill(1);

function drawMatrix() {
  ctx.fillStyle = "rgba(0,0,0,0.05)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#00ff00";
  ctx.font = fontSize + "px monospace";

  drops.forEach((y, i) => {
    const text = letters[Math.floor(Math.random() * letters.length)];
    ctx.fillText(text, i * fontSize, y * fontSize);

    if (y * fontSize > canvas.height && Math.random() > 0.975) {
      drops[i] = 0;
    }
    drops[i]++;
  });
}

setInterval(drawMatrix, 50);
