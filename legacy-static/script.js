(() => {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Theme ---------- */
  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} },
  };
  if (!store.get("theme") && window.matchMedia("(prefers-color-scheme: light)").matches) {
    root.dataset.theme = "light";
  }
  document.getElementById("themeToggle").addEventListener("click", () => {
    const next = root.dataset.theme === "light" ? "dark" : "light";
    root.dataset.theme = next;
    store.set("theme", next);
  });

  /* ---------- Nav: scroll state, mobile menu, active link ---------- */
  const nav = document.getElementById("nav");
  const menuBtn = document.getElementById("menuBtn");
  const navLinks = document.getElementById("navLinks");

  const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 20);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  const closeMenu = () => {
    navLinks.classList.remove("open");
    menuBtn.setAttribute("aria-expanded", "false");
  };
  menuBtn.addEventListener("click", () => {
    const open = navLinks.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", String(open));
  });
  navLinks.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeMenu));
  document.addEventListener("keydown", (e) => e.key === "Escape" && closeMenu());

  const linkMap = new Map(
    [...navLinks.querySelectorAll("a")].map((a) => [a.getAttribute("href").slice(1), a])
  );
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        linkMap.forEach((a) => a.classList.remove("active"));
        linkMap.get(entry.target.id)?.classList.add("active");
      });
    },
    { rootMargin: "-45% 0px -50% 0px" }
  );
  document.querySelectorAll("main section[id]").forEach((s) => sectionObserver.observe(s));

  /* ---------- Typing effect ---------- */
  const typedEl = document.getElementById("typed");
  const roles = [
    "AI/ML Engineer",
    "Agentic AI Developer",
    "GenAI Enthusiast",
    "Android Developer",
    "Salesforce AI Developer",
  ];
  if (!reduceMotion) {
    let r = 0, i = roles[0].length, deleting = true;
    const tick = () => {
      const word = roles[r];
      i += deleting ? -1 : 1;
      typedEl.textContent = word.slice(0, i);
      let delay = deleting ? 45 : 90;
      if (!deleting && i === word.length) { deleting = true; delay = 1800; }
      else if (deleting && i === 0) { deleting = false; r = (r + 1) % roles.length; delay = 350; }
      setTimeout(tick, delay);
    };
    setTimeout(tick, 2200);
  }

  /* ---------- Reveal on scroll + counters ---------- */
  const animateCount = (el) => {
    const target = Number(el.dataset.count);
    const suffix = el.dataset.suffix || "";
    if (reduceMotion) { el.textContent = target + suffix; return; }
    const start = performance.now();
    const dur = 1400;
    const step = (now) => {
      const p = Math.min((now - start) / dur, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))) + (p === 1 ? suffix : "");
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const revealObserver = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in");
        entry.target.querySelectorAll("[data-count]").forEach(animateCount);
        obs.unobserve(entry.target);
      });
    },
    { threshold: 0.12 }
  );
  document.querySelectorAll(".reveal").forEach((el, idx) => {
    el.style.transitionDelay = `${(idx % 3) * 80}ms`;
    revealObserver.observe(el);
  });

  /* ---------- Project filters ---------- */
  const filters = document.querySelectorAll(".filter");
  const projects = document.querySelectorAll(".project");
  filters.forEach((btn) =>
    btn.addEventListener("click", () => {
      filters.forEach((b) => {
        b.classList.toggle("active", b === btn);
        b.setAttribute("aria-selected", String(b === btn));
      });
      const f = btn.dataset.filter;
      projects.forEach((p) => {
        const show = f === "all" || p.dataset.cat.split(" ").includes(f);
        p.classList.toggle("hide", !show);
        if (show) p.classList.add("in");
      });
    })
  );

  /* ---------- Contact form (opens mail client) ---------- */
  const form = document.getElementById("contactForm");
  const note = document.getElementById("formNote");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    let ok = true;
    form.querySelectorAll("input, textarea").forEach((field) => {
      const valid = field.checkValidity() && field.value.trim() !== "";
      field.parentElement.classList.toggle("invalid", !valid);
      if (!valid) ok = false;
    });
    if (!ok) {
      note.textContent = "Please fill in all fields with a valid email.";
      note.classList.add("err");
      return;
    }
    const { name, email, message } = Object.fromEntries(new FormData(form));
    const subject = encodeURIComponent(`Portfolio enquiry from ${name}`);
    const body = encodeURIComponent(`${message}\n\n— ${name} (${email})`);
    window.location.href = `mailto:syedbilalahmad397@gmail.com?subject=${subject}&body=${body}`;
    note.classList.remove("err");
    note.textContent = "Opening your email client… thanks for reaching out!";
    form.reset();
  });

  document.getElementById("year").textContent = new Date().getFullYear();

  /* ---------- Neural network background ---------- */
  const canvas = document.getElementById("neural");
  const ctx = canvas.getContext("2d");
  let nodes = [], w = 0, h = 0, rafId = null;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  const colors = () => {
    const cs = getComputedStyle(root);
    return { a: cs.getPropertyValue("--muted").trim(), b: cs.getPropertyValue("--accent").trim() };
  };

  const resize = () => {
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.min(Math.floor((w * h) / 16000), 90);
    nodes = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.8 + 0.8,
    }));
  };

  const mouse = { x: -9999, y: -9999 };
  canvas.parentElement.addEventListener("pointermove", (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  });
  canvas.parentElement.addEventListener("pointerleave", () => { mouse.x = mouse.y = -9999; });

  const draw = () => {
    const { a, b } = colors();
    ctx.clearRect(0, 0, w, h);
    const LINK = 130;
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (!reduceMotion) {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
      }
      for (let j = i + 1; j < nodes.length; j++) {
        const m = nodes[j];
        const d = Math.hypot(n.x - m.x, n.y - m.y);
        if (d < LINK) {
          ctx.globalAlpha = (1 - d / LINK) * 0.35;
          ctx.strokeStyle = (i + j) % 2 ? a : b;
          ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(m.x, m.y); ctx.stroke();
        }
      }
      const dm = Math.hypot(n.x - mouse.x, n.y - mouse.y);
      if (dm < 170) {
        ctx.globalAlpha = (1 - dm / 170) * 0.6;
        ctx.strokeStyle = a;
        ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
      }
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = i % 3 ? a : b;
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (!reduceMotion) rafId = requestAnimationFrame(draw);
  };

  resize();
  draw();
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { resize(); if (reduceMotion) draw(); }, 150);
  });

  // Pause animation when hero is off-screen
  new IntersectionObserver(([entry]) => {
    if (reduceMotion) return;
    if (entry.isIntersecting && !rafId) rafId = requestAnimationFrame(draw);
    else if (!entry.isIntersecting && rafId) { cancelAnimationFrame(rafId); rafId = null; }
  }).observe(canvas);
})();
