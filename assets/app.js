/* Péptidos Sin Caos — interactividad (vanilla, sin dependencias) */
(function () {
  "use strict";

  // Navbar: sombra al hacer scroll
  var nav = document.querySelector(".nav");
  if (nav) {
    var onScroll = function () { nav.classList.toggle("scrolled", window.scrollY > 8); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  // Menú móvil
  var toggle = document.querySelector(".nav-toggle");
  var links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var open = links.style.display === "flex";
      links.style.display = open ? "" : "flex";
      links.style.flexDirection = "column";
    });
  }

  // Ajuste de anclas con navbar sticky e imágenes que cargan tarde.
  var scrollToHash = function () {
    if (!window.location.hash) { return; }
    var target = document.getElementById(window.location.hash.slice(1));
    if (target) { target.scrollIntoView({ block: "start" }); }
  };
  window.addEventListener("load", function () { setTimeout(scrollToHash, 60); });
  window.addEventListener("hashchange", function () { setTimeout(scrollToHash, 20); });

  // Aparición al hacer scroll
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && reveals.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  // Filtros del catálogo
  var chips = document.querySelectorAll(".chip[data-filter]");
  var cards = document.querySelectorAll(".pcard[data-category]");
  if (chips.length && cards.length) {
    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        chips.forEach(function (c) { c.classList.remove("active"); });
        chip.classList.add("active");
        var f = chip.getAttribute("data-filter");
        cards.forEach(function (card) {
          var show = f === "all" || card.getAttribute("data-category") === f;
          card.style.display = show ? "" : "none";
        });
      });
    });
  }

  // Captura de correo (placeholder: aún sin backend en Fase 1)
  var forms = document.querySelectorAll("form[data-signup]");
  forms.forEach(function (form) {
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var email = form.querySelector("input[type=email]");
      var note = form.querySelector(".signup-note");
      if (email && email.value && /.+@.+\..+/.test(email.value)) {
        if (note) { note.textContent = "¡Listo! Te avisaremos cuando abramos la guía. ✨"; note.style.color = "var(--brand)"; }
        email.value = "";
      } else if (note) {
        note.textContent = "Escribe un correo válido, porfa.";
        note.style.color = "#B07515";
      }
    });
  });
})();
