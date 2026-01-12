/* ================= CTA ================= */
document.getElementById("ctaBtn")?.addEventListener("click", () => {
  alert("Let's get started 🚀");
});

/* ================= CONTACT ================= */
document.getElementById("contactForm")?.addEventListener("submit", e => {
  e.preventDefault();
  alert("Email terkirim!");
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

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("show");
    }
  });
}, { threshold: 0.2 });

revealElements.forEach(el => observer.observe(el));

/* ================= TYPING EFFECT HOME ================= */
const texts = [
  "Build Your Product Faster",
  "Create Modern UI Design",
  "Launch Your Startup Today"
];

let index = 0;
let charIndex = 0;
let isDeleting = false;
const speed = 100;
const delay = 1500;

const typingElement = document.getElementById("typing");

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

typeEffect();