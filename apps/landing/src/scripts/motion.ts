import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(ScrollTrigger, SplitText);

const EASE = "power3.out";

function reveal(targets: gsap.TweenTarget, vars: gsap.TweenVars = {}) {
  return gsap.fromTo(
    targets,
    { y: 28, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.7, ease: EASE, overwrite: true, clearProps: "transform", ...vars },
  );
}

// autoSplit re-measures on resize and webfont load, then replays the wipe.
function wipeLines(el: HTMLElement, build: (lines: Element[]) => gsap.core.Animation) {
  gsap.set(el, { opacity: 1 });
  SplitText.create(el, {
    type: "lines",
    mask: "lines",
    linesClass: "split-line",
    autoSplit: true,
    onSplit: (self) => build(self.lines),
  });
}

function initReveals() {
  ScrollTrigger.batch("[data-reveal]", {
    interval: 0.1,
    batchMax: 4,
    start: "top 88%",
    once: true,
    onEnter: (batch) => reveal(batch, { stagger: 0.09 }),
  });
}

function initHero() {
  const hero = document.querySelector<HTMLElement>('[data-motion="hero"]');
  if (!hero) return;

  const heading = hero.querySelector<HTMLElement>("[data-split]");
  const items = hero.querySelectorAll<HTMLElement>("[data-hero-item]");
  const visual = hero.querySelector<HTMLElement>("[data-hero-visual]");

  gsap.fromTo(
    items,
    { y: 22, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.8, stagger: 0.12, ease: EASE },
  );

  if (heading) {
    wipeLines(heading, (lines) =>
      gsap.fromTo(
        lines,
        { yPercent: 115 },
        { yPercent: 0, duration: 0.9, stagger: 0.12, delay: 0.12, ease: EASE },
      ),
    );
  }

  if (visual) {
    gsap.fromTo(
      visual,
      { y: 56, opacity: 0, scale: 0.96 },
      { y: 0, opacity: 1, scale: 1, duration: 1.1, delay: 0.45, ease: EASE },
    );
  }
}

function initSectionHeadings() {
  document.querySelectorAll<HTMLElement>("[data-split]").forEach((el) => {
    if (el.closest('[data-motion="hero"]')) return;
    wipeLines(el, (lines) =>
      gsap.fromTo(
        lines,
        { yPercent: 115 },
        {
          yPercent: 0,
          duration: 0.9,
          stagger: 0.1,
          ease: EASE,
          scrollTrigger: { trigger: el, start: "top 85%", once: true },
        },
      ),
    );
  });
}

function initCounters() {
  document.querySelectorAll<HTMLElement>("[data-count]").forEach((el, index) => {
    const target = Number(el.dataset.count);
    const tally = { value: 0 };
    const scrollTrigger = { trigger: el, start: "top 82%", once: true };
    // Staggered so the row counts in sequence and the zero reads as deliberate.
    const lead = index * 0.14;

    gsap.fromTo(
      el,
      { scale: 0.55, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.7, delay: lead, ease: "back.out(2.2)", scrollTrigger },
    );
    gsap.to(tally, {
      value: target,
      duration: 1.1,
      delay: lead + 0.15,
      ease: "power2.out",
      snap: { value: 1 },
      onUpdate: () => {
        el.textContent = String(tally.value);
      },
      scrollTrigger,
    });
  });
}

function initParallax() {
  document.querySelectorAll<HTMLElement>("[data-parallax]").forEach((el) => {
    const shift = Number(el.dataset.parallax);
    gsap.fromTo(
      el,
      { yPercent: -shift },
      {
        yPercent: shift,
        ease: "none",
        scrollTrigger: {
          trigger: el.parentElement ?? el,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      },
    );
  });
}

function initSteps() {
  const grid = document.querySelector<HTMLElement>('[data-motion="steps"]');
  if (!grid) return;

  const steps = gsap.utils.toArray<HTMLElement>("[data-step]", grid);
  const phone = grid.querySelector<HTMLElement>("[data-step-phone]");
  const mm = gsap.matchMedia();

  const present = (el: HTMLElement | null | undefined): el is HTMLElement => Boolean(el);

  // Wide and tall enough to pin: the phone holds while the later steps scrub in.
  mm.add("(min-width: 1024px) and (min-height: 700px)", () => {
    const [first, ...rest] = steps;

    // The nav anchor drops the reader here, before the pin engages, so the phone
    // and the first step reveal on entry rather than on the scrub.
    reveal([phone, first].filter(present), {
      stagger: 0.12,
      scrollTrigger: { trigger: grid, start: "top 78%", once: true },
    });

    const tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: grid,
        start: "center center",
        end: "+=1100",
        pin: true,
        scrub: 0.4,
      },
    });

    rest.forEach((step, index) => {
      tl.fromTo(step, { x: index === 0 ? -70 : 70, opacity: 0 }, { x: 0, opacity: 1 }, index * 0.9);
    });
  });

  // The exact complement: anything too narrow or too short gets a plain stagger.
  mm.add("(max-width: 1023px), (max-height: 699px)", () => {
    reveal([phone, ...steps].filter(present), {
      stagger: 0.12,
      scrollTrigger: { trigger: grid, start: "top 80%", once: true },
    });
  });
}

function initTilt() {
  if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;

  document.querySelectorAll<HTMLElement>("[data-tilt]").forEach((card) => {
    gsap.set(card, { transformPerspective: 900 });

    const to = (prop: string) => gsap.quickTo(card, prop, { duration: 0.5, ease: "power2.out" });
    const rotationX = to("rotationX");
    const rotationY = to("rotationY");
    const y = to("y");

    card.addEventListener("pointermove", (event) => {
      const box = card.getBoundingClientRect();
      rotationX(-((event.clientY - box.top) / box.height - 0.5) * 5);
      rotationY(((event.clientX - box.left) / box.width - 0.5) * 5);
      y(-6);
    });

    card.addEventListener("pointerleave", () => {
      rotationX(0);
      rotationY(0);
      y(0);
    });
  });
}

function initNav() {
  const nav = document.querySelector<HTMLElement>('[data-motion="nav"]');
  if (!nav) return;

  ScrollTrigger.create({
    start: "top -90",
    end: "max",
    toggleClass: { targets: nav, className: "is-stuck" },
  });
}

// The layout leaves content in its final state under reduced motion, so bail out.
if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
  // Tells the layout safety timer the runtime loaded and owns the reveal states.
  document.documentElement.dataset.motionReady = "1";

  initReveals();
  initCounters();
  initParallax();
  initSteps();
  initTilt();
  initNav();

  // Splitting before the webfont lands would re-split mid-wipe and restart it.
  void Promise.race([
    document.fonts.ready,
    new Promise((resolve) => setTimeout(resolve, 1200)),
  ]).then(() => {
    initHero();
    initSectionHeadings();
    ScrollTrigger.refresh();
  });
}
