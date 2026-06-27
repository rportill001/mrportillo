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

  // Captura de correo — POST real a /api/subscribe (Cloudflare Pages Function)
  var forms = document.querySelectorAll("form[data-signup]");
  forms.forEach(function (form) {
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var email = form.querySelector("input[type=email]");
      var btn = form.querySelector("button[type=submit]");
      var note = form.querySelector(".signup-note") ||
                 (form.parentNode && form.parentNode.querySelector(".signup-note"));
      function setNote(msg, color) { if (note) { note.textContent = msg; note.style.color = color; } }

      if (!email || !email.value || !/.+@.+\..+/.test(email.value)) {
        setNote("Escribe un correo válido, porfa.", "#B07515");
        return;
      }

      var btnLabel = btn ? btn.textContent : "";
      if (btn) { btn.disabled = true; btn.textContent = "Enviando…"; }
      setNote("Enviando…", "var(--muted)");

      fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.value.trim(),
          source: form.getAttribute("data-source") || "general",
          page: location.pathname,
          referrer: document.referrer || "",
          submittedAt: new Date().toISOString()
        })
      })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (data) {
            return { ok: res.ok, data: data };
          });
        })
        .then(function (r) {
          if (r.ok && r.data && r.data.ok) {
            setNote("¡Listo! Te avisaremos cuando abramos la Guía GLP. ✨", "var(--brand)");
            email.value = "";
          } else {
            setNote("Algo falló de nuestro lado. Probá de nuevo en un momento.", "#B07515");
          }
        })
        .catch(function () {
          setNote("No se pudo conectar. Revisá tu internet e intentá de nuevo.", "#B07515");
        })
        .finally(function () {
          if (btn) { btn.disabled = false; btn.textContent = btnLabel; }
        });
    });
  });
})();
