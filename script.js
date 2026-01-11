// Fake online counter (UI only)
const onlineEl = document.getElementById("onlineCount");
let online = 56;

setInterval(() => {
  online += Math.random() > 0.5 ? 1 : -1;
  if (online < 40) online = 40;
  if (online > 80) online = 80;
  onlineEl.textContent = online;
}, 2500);
