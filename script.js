const text = "accessing portfolio...";
let index = 0;

function typeEffect() {
  if (index < text.length) {
    document.getElementById("typing").innerHTML += text.charAt(index);
    index++;
    setTimeout(typeEffect, 80);
  } else {
    document.getElementById("content").classList.remove("hidden");
  }
}

typeEffect();

function showMessage() {
  const msg = document.getElementById("message");
  msg.innerHTML = ">> Script executed successfully ✔";
}
