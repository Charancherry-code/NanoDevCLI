import { useEffect } from "react";

/**
 * Lightweight momentum smooth-scrolling (Lenis-style) with no dependency.
 *
 * - Intercepts the mouse wheel and eases the page toward a target position,
 *   giving the inertial feel premium sites have.
 * - Intercepts in-page anchor clicks (#id) and eases to them, offset by the
 *   fixed navbar height.
 * - Fully disabled when the user prefers reduced motion, or on touch devices
 *   (which already have native momentum scrolling).
 */
const NAV_OFFSET = 84;

export function useSmoothScroll() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    if (reduce || isTouch) return;

    let target = window.scrollY;
    let current = window.scrollY;
    let rafId = null;
    let animating = false;

    const clamp = (v) =>
      Math.max(0, Math.min(v, document.documentElement.scrollHeight - window.innerHeight));

    const loop = () => {
      // Ease current toward target.
      current += (target - current) * 0.12;
      if (Math.abs(target - current) < 0.4) {
        current = target;
        window.scrollTo(0, current);
        animating = false;
        rafId = null;
        return;
      }
      window.scrollTo(0, current);
      rafId = requestAnimationFrame(loop);
    };

    const start = () => {
      if (!animating) {
        animating = true;
        current = window.scrollY;
        rafId = requestAnimationFrame(loop);
      }
    };

    const onWheel = (e) => {
      // Let the browser handle zoom and modifier scrolls.
      if (e.ctrlKey) return;
      e.preventDefault();
      target = clamp(target + e.deltaY);
      start();
    };

    const easeTo = (y) => {
      target = clamp(y);
      start();
    };

    const onClick = (e) => {
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;
      const id = link.getAttribute("href");
      if (!id || id === "#") return;
      const el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      const y = window.scrollY + el.getBoundingClientRect().top - NAV_OFFSET;
      easeTo(y);
      history.replaceState(null, "", id);
    };

    // Keep target in sync if the user scrolls another way (keyboard, drag).
    const onScroll = () => {
      if (!animating) target = window.scrollY;
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    document.addEventListener("click", onClick);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("wheel", onWheel);
      document.removeEventListener("click", onClick);
      window.removeEventListener("scroll", onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);
}
