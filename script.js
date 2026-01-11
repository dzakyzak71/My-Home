/* ================= CTA ================= */
document.getElementById("ctaBtn")?.addEventListener("click", () => {
  alert("Let's get started 🚀");
});

/* ================= CONTACT ================= */
document.getElementById("contactForm")?.addEventListener("submit", e => {
  e.preventDefault();
  alert("Email terkirim!");
});


/* ================= NAVBAR COLOR SCROLL (FIXED) ================= */
const navbar = document.querySelector(".navbar-pill");
const sections = document.querySelectorAll("section");
const colors = ["nav-hero", "nav-light", "nav-dark"];

function updateNavbarColor() {
  let current = "nav-hero"; // default = HOME saat refresh

  sections.forEach(section => {
    const rect = section.getBoundingClientRect();

    // garis imajiner di bawah navbar
    if (rect.top <= 100 && rect.bottom > 100) {
      current = section.dataset.color;
    }
  });

  colors.forEach(c => navbar.classList.remove(c));
  navbar.classList.add(current);
}

window.addEventListener("scroll", updateNavbarColor);
window.addEventListener("load", updateNavbarColor);


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

/* FIX: trigger on load */
window.addEventListener("load", () => {
  revealElements.forEach(el => {
    if (el.getBoundingClientRect().top < window.innerHeight) {
      el.classList.add("show");
    }
  });
});
