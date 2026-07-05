/* ================= CTA ================= */
document.getElementById("ctaBtn")?.addEventListener("click", () => {
  // CTA click handled by the link navigation.
});

/* ================= HACKER TERMINAL ================= */
const terminalOutput = document.getElementById('terminalOutput');
const terminalInput = document.getElementById('terminalInput');
const terminalChips = document.querySelectorAll('.terminal-chip');

function appendTerminalLine(text, isInput = false) {
  if (!terminalOutput) return;

  const line = document.createElement('div');
  line.className = 'terminal-line';

  if (isInput) {
    line.innerHTML = `<span class="prompt">root@kconk:~$</span> ${text}`;
  } else {
    line.textContent = text;
  }

  terminalOutput.appendChild(line);
  terminalOutput.scrollTop = terminalOutput.scrollHeight;
}

function runTerminalCommand(rawCommand) {
  const command = rawCommand.trim().toLowerCase();
  if (!command) return;

  appendTerminalLine(rawCommand, true);

  if (command === 'clear') {
    terminalOutput.innerHTML = '';
    return;
  }

  switch (command) {
    case 'help':
      appendTerminalLine('Available commands: help, whoami, ls, clear, date, theme, sudo, echo');
      break;
    case 'whoami':
      appendTerminalLine('root');
      break;
    case 'ls':
      appendTerminalLine('assets  index.html  script.js  styles.css');
      break;
    case 'date':
      appendTerminalLine(new Date().toString());
      break;
    case 'theme':
      appendTerminalLine('Theme switched to hacker neon');
      break;
    case 'sudo':
      appendTerminalLine('Access denied: root privileges required');
      break;
    case 'echo':
      appendTerminalLine('Type something after echo to print it');
      break;
    default:
      if (command.startsWith('echo ')) {
        appendTerminalLine(rawCommand.slice(5));
      } else {
        appendTerminalLine(`command not found: ${rawCommand}`);
      }
      break;
  }
}

terminalInput?.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    runTerminalCommand(terminalInput.value);
    terminalInput.value = '';
  }
});

terminalChips.forEach((chip) => {
  chip.addEventListener('click', () => {
    const command = chip.dataset.command;
    terminalInput.value = command;
    runTerminalCommand(command);
    terminalInput.value = '';
  });
});

/* ================= PROFILE SLIDER ================= */
const profileSlider = document.getElementById('profileSlider');
let sliderActive = false;
let sliderStartX = 0;
let sliderScrollStart = 0;

if (profileSlider) {
  profileSlider.addEventListener('pointerdown', (event) => {
    sliderActive = true;
    sliderStartX = event.clientX;
    sliderScrollStart = profileSlider.scrollLeft;
    profileSlider.setPointerCapture(event.pointerId);
    profileSlider.classList.add('dragging');
  });

  profileSlider.addEventListener('pointermove', (event) => {
    if (!sliderActive) return;
    const diff = event.clientX - sliderStartX;
    profileSlider.scrollLeft = sliderScrollStart - diff * 1.1;
    event.preventDefault();
  });

  profileSlider.addEventListener('pointerup', () => {
    sliderActive = false;
    profileSlider.classList.remove('dragging');
  });

  profileSlider.addEventListener('pointercancel', () => {
    sliderActive = false;
    profileSlider.classList.remove('dragging');
  });
}

/* ================= CONTACT ================= */
document.getElementById("contactForm")?.addEventListener("submit", e => {
  e.preventDefault();
});

/* ================= NAV INDICATOR ================= */
const nav = document.querySelector(".navbar-pill nav");
const navLinks = document.querySelectorAll(".navbar-pill nav a");
const sections = document.querySelectorAll("section");

if (nav && navLinks.length && sections.length) {
  const indicator = document.createElement("div");
  indicator.className = "nav-indicator hide";
  nav.appendChild(indicator);

  function moveIndicator(el) {
    const linkRect = el.getBoundingClientRect();
    const navRect = nav.getBoundingClientRect();
    indicator.style.width = linkRect.width + "px";
    indicator.style.left = (linkRect.left - navRect.left) + "px";
  }

  function updateIndicator() {
    let current = null;

    sections.forEach(section => {
      const rect = section.getBoundingClientRect();
      if (rect.top <= 100 && rect.bottom > 100) {
        current = section;
      }
    });

    if (!current || current.id === "home") {
      indicator.classList.add("hide");
      return;
    }

    const activeLink = nav.querySelector(
      `a[href="#${current.id}"]`
    );

    if (!activeLink) return;

    indicator.classList.remove("hide");
    moveIndicator(activeLink);
  }

  window.addEventListener("scroll", updateIndicator);
  window.addEventListener("load", updateIndicator);
}

/* ================= SCROLL REVEAL ================= */
const revealElements = document.querySelectorAll(".fade-up");

if (reduceMotion) {
  revealElements.forEach(el => el.classList.add("show"));
} else {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("show");
      }
    });
  }, { threshold: 0.2 });

  revealElements.forEach(el => observer.observe(el));
}

/* ================= TYPING EFFECT HOME ================= */
const texts = [
  "Hello, my name is Dzaky",
  "My daily life as a cyber security expert",
  "I am also a CTF player, bug hunter."
];

let index = 0;
let charIndex = 0;
let isDeleting = false;
const speed = 100;
const delay = 1500;

const typingElement = document.getElementById("typing");
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches || window.matchMedia('(pointer: coarse)').matches || window.innerWidth <= 768;

function typeEffect() {
  const currentText = texts[index];

  if (!isDeleting) {
    typingElement.textContent = currentText.substring(0, charIndex++);
    if (charIndex === currentText.length + 1) {
      setTimeout(() => isDeleting = true, delay);
    }
  } else {
    typingElement.textContent = currentText.substring(0, charIndex--);
    if (charIndex === 0) {
      isDeleting = false;
      index = (index + 1) % texts.length;
    }
  }

  setTimeout(typeEffect, isDeleting ? speed / 2 : speed);
}

if (typingElement && !reduceMotion) {
  typeEffect();
} else if (typingElement) {
  typingElement.textContent = texts[0];
}
