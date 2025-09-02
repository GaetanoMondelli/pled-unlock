/**
 * NUCLEAR GSAP CLEANUP - DESTROYS ALL ANIMATIONS
 * Use this when you need to completely obliterate all GSAP animations
 */

export const NUCLEAR_GSAP_CLEANUP = async (scope?: Element | string) => {
  try {
    // Try to import GSAP
    const gsap = (await import("gsap")).default;

    if (!gsap || typeof window === "undefined") {
      return;
    }

    console.log("🚨 NUCLEAR GSAP CLEANUP - START", scope ? "(scoped)" : "(restricted global)");

    // If a scope is provided, clean only within that scope
    if (scope) {
      try {
        if (typeof gsap.killTweensOf === "function") {
          gsap.killTweensOf(scope);
        }
        const rootEl = typeof scope === "string" ? document.querySelector(scope) : scope;
        if (rootEl) {
          const elList: Element[] = [rootEl, ...Array.from(rootEl.querySelectorAll("*"))];
          elList.forEach(el => {
            try {
              if (typeof gsap.killTweensOf === "function") gsap.killTweensOf(el);
              if (typeof gsap.set === "function") gsap.set(el, { clearProps: "all" });
            } catch {
              // ignore per-element issues
            }
          });
        }
      } catch (e) {
        console.warn("Scoped GSAP cleanup failed:", e);
      }
    } else {
      // Restricted global cleanup to avoid wiping unrelated animations/styles
      if (gsap.globalTimeline && typeof gsap.globalTimeline.clear === "function") {
        gsap.globalTimeline.clear();
        if (typeof gsap.globalTimeline.kill === "function") {
          gsap.globalTimeline.kill();
        }
      }

      // Target known selectors instead of "*"
      if (typeof gsap.killTweensOf === "function") {
        gsap.killTweensOf([document.body, document.documentElement]);
      }

      //  Force cleanup specific problematic elements
      const problematicSelectors = [
        "#particle",
        "#stage",
        ".core",
        ".halo",
        "#hero-title",
        "#hero-subtitle",
        "#hero-cta",
        "#notif-annot",
        "#token-annot",
        "#action-annot",
        "#token",
        "#cert",
        "#turbine",
        "#blades",
        ".gear",
        ".gear1",
        ".gear2",
        ".signal-dot",
        ".arrow",
        ".background-image",
      ];

      problematicSelectors.forEach(selector => {
        try {
          if (typeof gsap.killTweensOf === "function") {
            gsap.killTweensOf(selector);
          }
          if (typeof gsap.set === "function") {
            gsap.set(selector, { clearProps: "all" });
          }
        } catch (e) {
          // Ignore individual selector errors
        }
      });
    }

    // Attempt to reduce ticker load
    if (gsap.ticker && typeof gsap.ticker.remove === "function") {
      // Remove any lingering ticker functions
      try {
        gsap.ticker.lagSmoothing(0);
      } catch (e) {
        // Ignore ticker errors
      }
    }

    console.log("✅ NUCLEAR GSAP CLEANUP COMPLETE");
  } catch (error) {
    console.warn("GSAP cleanup failed:", error);
  }
};

export const EMERGENCY_GSAP_STOP = () => {
  // Synchronous version for immediate cleanup
  try {
    if (typeof window !== "undefined" && (window as any).gsap) {
      const gsap = (window as any).gsap;

      if (typeof gsap.killTweensOf === "function") {
        gsap.killTweensOf("*");
      }

      if (gsap.globalTimeline && typeof gsap.globalTimeline.clear === "function") {
        gsap.globalTimeline.clear();
      }
    }
  } catch (error) {
    console.warn("Emergency GSAP stop failed:", error);
  }
};
