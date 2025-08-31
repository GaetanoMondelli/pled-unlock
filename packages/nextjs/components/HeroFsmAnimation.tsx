"use client";
/* eslint-disable prettier/prettier */

import { useEffect, useRef } from "react";

async function initializeGSAP() {
  try {
    const gsap = (await import("gsap")).default;
    const { MotionPathPlugin } = await import("gsap/MotionPathPlugin");
    
    if (typeof window !== "undefined") {
      gsap.registerPlugin(MotionPathPlugin);
    }
    
    return { gsap, MotionPathPlugin };
  } catch (error) {
    console.warn("Failed to load GSAP:", error);
    return null;
  }
}

export default function HeroFsmAnimation({ onComplete }: { onComplete?: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const revealedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || !svgRef.current) return;

    const setupAnimation = async () => {
      const gsapModules = await initializeGSAP();
      if (!gsapModules) return;
      
      const { gsap } = gsapModules;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power2.out" }, repeat: -1, repeatDelay: 1.2 });

      // Basic scene setup
    gsap.set(svgRef.current, { transformOrigin: "0 0" });
  gsap.set("#stage", { x: 0, y: 0, scale: 0.88, transformOrigin: "0 0" });
      gsap.set(["#node-a .core", "#node-b .core", "#node-c .core", "#node-d .core", "#node-e .core", "#node-f .core"], {
        fill: "#ffffff",
      });
      gsap.set("#node-a .core", { fill: "#10b981" }); // active A (emerald)
      gsap.set(".halo", { autoAlpha: 0, transformOrigin: "50% 50%" });
      gsap.set(".core", { transformOrigin: "50% 50%" });
      gsap.set("#particle", { transformOrigin: "50% 50%" });
      gsap.set(["#hero-title", "#hero-subtitle", "#hero-cta"], { autoAlpha: 0, y: 10 });

      // Helper to move particle along a path
      const travel = (path: string, dur = 1.0) => ({
        motionPath: { path, align: path, autoRotate: false, alignOrigin: [0.5, 0.5] },
        duration: dur,
      });

      // Simple logging helpers: epoch-like timestamp, pseudo signature, and append to ticker (last 3 lines)
      const shortHash = (len = 8) => Math.random().toString(16).slice(2, 2 + len);
      const epoch = () => `${Math.floor(Date.now() / 1000)}`;
      const addEntry = (title: string, message: string) => {
        const sig = `0x${shortHash(16)}${shortHash(16)}`;
        const line = `${epoch()} | ${title}: ${message} | signature=${sig}`;
        window.dispatchEvent(new CustomEvent("hero-ledger:add", { detail: line }));
      };

      // Focus helpers (center on a node, with optional screen-space offsets to bias framing)
      const centerOn = (nx: number, ny: number, scale: number, duration = 1.6, offsetX = 0, offsetY = 0) => {
        const cx = 600; // viewBox center X
        const cy = 300; // viewBox center Y
        const tx = cx - nx * scale + offsetX;
        const ty = cy - ny * scale + offsetY;
        return { scale, x: tx, y: ty, duration, ease: "power3.out" as const };
      };
  const focusA = centerOn(200, 300, 2.65, 1.6, 0, 60);
  const focusB = centerOn(500, 180, 2.6, 1.6, 0, 60);
  const focusC = centerOn(850, 260, 2.65, 1.6, 0, 60);
  const focusD = centerOn(600, 470, 2.5, 1.6, 0, 60);
  const focusE = centerOn(900, 520, 2.4, 1.6, 168, 70);
  const focusF = centerOn(1060, 360, 2.45, 1.6, 34, 60);
  const zoomOut = { scale: 0.8, x: 0, y: 0, duration: 1.5, ease: "power3.inOut" as const };

  // Start the first loop already centered on A to avoid initial zoom-out flash
  gsap.set("#stage", focusA);

      // Starting pose removed (we already set the base transform with gsap.set)

      // Focus A (enter sequence)
      tl.to("#stage", focusA, "start");
      tl.set("#particle", { x: 0, y: 0 });
      tl.to("#node-a .core", { fill: "#10b981", scale: 1.05, duration: 0.25 }, "impactA");
  tl.add(() => addEntry("Change state", "Entered A • Initialization"), "impactA");
      tl.fromTo(
        "#node-a .halo",
        { autoAlpha: 0.6, scale: 1 },
        { autoAlpha: 0, scale: 1.6, duration: 1.2, ease: "power2.out" },
        "impactA",
      );
      tl.fromTo(
        "#node-a .halo",
        { autoAlpha: 0.6, scale: 1 },
        { autoAlpha: 0, scale: 1.6, duration: 1.2, ease: "power2.out" },
      );
      tl.to(
        ["#node-b .core", "#node-c .core", "#node-d .core", "#node-e .core", "#node-f .core"],
        { fill: "#ffffff", duration: 0.2 },
        "impactA",
      );

      // A -> B
      tl.to("#stage", focusB);
      tl.fromTo("#particle", travel("#p-ab", 2.2), travel("#p-ab", 2.2));
  // For B, highlight in purple (notification)
  tl.to("#node-b .core", { fill: "#8b5cf6", scale: 1.05, duration: 0.25 }, "impactB");
  tl.add(() => addEntry("Received message", "A1 • Transition request"), "impactB");
  tl.add(() => addEntry("Action", "Send notification"), ">+=0.02");
  tl.add(() => addEntry("Change state", "A → B"), ">+=0.02");
      tl.fromTo(
        "#node-b .halo",
        { autoAlpha: 0.6, scale: 1 },
        { autoAlpha: 0, scale: 1.6, duration: 1.2, ease: "power2.out" },
        "impactB",
      );
      tl.fromTo(
        "#node-b .halo",
        { autoAlpha: 0.6, scale: 1 },
        { autoAlpha: 0, scale: 1.6, duration: 1.2, ease: "power2.out" },
      );
      tl.fromTo(
        "#notif-annot",
        { autoAlpha: 0, scale: 0.95 },
        { autoAlpha: 1, scale: 1, duration: 0.45, ease: "power2.out" },
        "impactB+=0.1",
      );
      tl.to("#notif-annot", { autoAlpha: 0, duration: 0.6, ease: "power2.inOut" }, ">+=0.8");
      tl.to(["#node-a .core", "#node-c .core", "#node-d .core"], { fill: "#ffffff", duration: 0.2 }, "impactB");

      // B -> C
      tl.to("#stage", focusC);
      tl.fromTo("#particle", travel("#p-bc", 2.2), travel("#p-bc", 2.2));
      tl.to("#node-c .core", { fill: "#10b981", scale: 1.05, duration: 0.25 }, "impactC");
  tl.add(() => addEntry("Received message", "B2 • Normalized"), "impactC");
  tl.add(() => addEntry("Change state", "B → C"), ">+=0.02");
      tl.fromTo(
        "#node-c .halo",
        { autoAlpha: 0.6, scale: 1 },
        { autoAlpha: 0, scale: 1.6, duration: 1.2, ease: "power2.out" },
        "impactC",
      );
      tl.fromTo(
        "#node-c .halo",
        { autoAlpha: 0.6, scale: 1 },
        { autoAlpha: 0, scale: 1.6, duration: 1.2, ease: "power2.out" },
      );
      tl.to(["#node-a .core", "#node-b .core", "#node-d .core"], { fill: "#ffffff", duration: 0.2 }, "impactC");

      // C -> D
      tl.to("#stage", focusD);
      tl.fromTo("#particle", travel("#p-cd", 2.4), travel("#p-cd", 2.4));
      tl.to("#node-d .core", { fill: "#10b981", scale: 1.05, duration: 0.25 }, "impactD");
  tl.add(() => addEntry("Received message", "C3 • Validated"), "impactD");
  tl.add(() => addEntry("Action", "Emit token"), ">+=0.02");
  tl.add(() => addEntry("Change state", "C → D"), ">+=0.02");
      tl.fromTo(
        "#node-d .halo",
        { autoAlpha: 0.6, scale: 1 },
        { autoAlpha: 0, scale: 1.6, duration: 1.2, ease: "power2.out" },
        "impactD",
      );
      tl.fromTo(
        "#node-d .halo",
        { autoAlpha: 0.6, scale: 1 },
        { autoAlpha: 0, scale: 1.6, duration: 1.2, ease: "power2.out" },
      );
      tl.fromTo(
        "#token-annot",
        { autoAlpha: 0, scale: 0.95 },
        { autoAlpha: 1, scale: 1, duration: 0.45, ease: "power2.out" },
        "impactD+=0.1",
      );
      tl.to("#token-annot", { autoAlpha: 0, duration: 0.6, ease: "power2.inOut" }, ">+=0.8");
      tl.to(
        ["#node-a .core", "#node-b .core", "#node-c .core", "#node-e .core", "#node-f .core"],
        { fill: "#ffffff", duration: 0.2 },
        "impactD",
      );

      // D -> E
      tl.to("#stage", focusE);
      tl.fromTo("#particle", travel("#p-de", 2.2), travel("#p-de", 2.2));
      // Special highlight for E: amber/yellow and action annotation
      tl.to("#node-e .core", { fill: "#f59e0b", scale: 1.08, duration: 0.25 }, "impactE");
  tl.add(() => addEntry("Received message", "D4 • Approved"), "impactE");
  tl.add(() => addEntry("Action", "Trigger action"), ">+=0.02");
  tl.add(() => addEntry("Change state", "D → E"), ">+=0.02");
      tl.fromTo(
        "#node-e .halo",
        { autoAlpha: 0.6, scale: 1 },
        { autoAlpha: 0, scale: 1.8, duration: 1.4, ease: "power2.out" },
        "impactE",
      );
      tl.fromTo(
        "#node-e .halo",
        { autoAlpha: 0.6, scale: 1 },
        { autoAlpha: 0, scale: 1.8, duration: 1.4, ease: "power2.out" },
      );
      tl.fromTo(
        "#action-annot",
        { autoAlpha: 0, scale: 0.95 },
        { autoAlpha: 1, scale: 1, duration: 0.5, ease: "power2.out" },
        "impactE+=0.1",
      );
      tl.to("#action-annot", { autoAlpha: 0, duration: 0.6, ease: "power2.inOut" }, ">+=0.8");
      tl.to(
        ["#node-a .core", "#node-b .core", "#node-c .core", "#node-d .core", "#node-f .core"],
        { fill: "#ffffff", duration: 0.2 },
        "impactE",
      );

  // E -> F
  tl.to("#stage", focusF);
  tl.fromTo("#particle", travel("#p-ef", 2.4), travel("#p-ef", 2.4));
  tl.add(() => addEntry("Received message", "E5 • Finalized"), "impactF");
  tl.add(() => addEntry("Change state", "E → F"), ">+=0.02");
      tl.to("#node-f .core", { fill: "#10b981", scale: 1.05, duration: 0.25 }, "impactF");
  // Ticker is always visible; entries are added at each impact
      tl.fromTo(
        "#node-f .halo",
        { autoAlpha: 0.6, scale: 1 },
        { autoAlpha: 0, scale: 1.6, duration: 1.2, ease: "power2.out" },
        "impactF",
      );
      tl.fromTo(
        "#node-f .halo",
        { autoAlpha: 0.6, scale: 1 },
        { autoAlpha: 0, scale: 1.6, duration: 1.2, ease: "power2.out" },
      );
      tl.to(
        ["#node-a .core", "#node-b .core", "#node-c .core", "#node-d .core", "#node-e .core"],
        { fill: "#ffffff", duration: 0.2 },
        "impactF",
      );

  // No explicit hide; ticker persists across loops
  // F -> A (loop close)
      tl.to("#stage", focusA);
      tl.fromTo("#particle", travel("#p-fa", 2.4), travel("#p-fa", 2.4));
      tl.to("#node-a .core", { fill: "#10b981", scale: 1.05, duration: 0.25 }, "impactA2");
      tl.fromTo(
        "#node-a .halo",
        { autoAlpha: 0.6, scale: 1 },
        { autoAlpha: 0, scale: 1.6, duration: 1.2, ease: "power2.out" },
        "impactA2",
      );
      tl.fromTo(
        "#node-a .halo",
        { autoAlpha: 0.6, scale: 1 },
        { autoAlpha: 0, scale: 1.6, duration: 1.2, ease: "power2.out" },
      );
      tl.to(
        ["#node-b .core", "#node-c .core", "#node-d .core", "#node-e .core", "#node-f .core"],
        { fill: "#ffffff", duration: 0.2 },
        "impactA2",
      );

  // Smooth zoom out to the baseline view, then dwell briefly before loop
  tl.to("#stage", zoomOut);
  tl.to({}, { duration: 0.6 });

      // Fade in hero content only once on the very first pass
      tl.add(() => {
        if (!revealedRef.current) {
          revealedRef.current = true;
          gsap.to("#hero-title", { autoAlpha: 1, y: 0, duration: 0.35 });
          gsap.to("#hero-subtitle", { autoAlpha: 1, y: 0, duration: 0.35, delay: 0.05 });
          gsap.to("#hero-cta", { autoAlpha: 1, y: 0, duration: 0.25, delay: 0.15 });
          onComplete?.();
        }
      });
    }, containerRef);

    return () => {
      try {
        if (ctx && typeof ctx.revert === 'function') {
          ctx.revert();
        }
      } catch (error) {
        console.warn('Error during GSAP context cleanup:', error);
      }
    };
    };

    setupAnimation();
  }, [onComplete]);

  return (
    <div ref={containerRef} className="relative">
      <svg ref={svgRef} viewBox="0 0 1200 600" className="w-full h-full">
  <g id="stage">
          {/* Edges under nodes so links appear behind state circles */}
          <path
            id="p-ab"
            d="M200 300 C 320 240, 400 200, 500 180"
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.35"
            strokeDasharray="4 6"
            strokeLinecap="round"
          />
          <path
            id="p-bc"
            d="M500 180 C 650 150, 750 200, 850 260"
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.35"
            strokeDasharray="4 6"
            strokeLinecap="round"
          />
          <path
            id="p-cd"
            d="M850 260 C 800 340, 700 430, 600 470"
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.35"
            strokeDasharray="4 6"
            strokeLinecap="round"
          />
          <path
            id="p-de"
            d="M600 470 C 680 520, 720 520, 900 520"
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.35"
            strokeDasharray="4 6"
            strokeLinecap="round"
          />
          <path
            id="p-ef"
            d="M900 520 C 1020 480, 1080 430, 1060 360"
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.35"
            strokeDasharray="4 6"
            strokeLinecap="round"
          />
          <path
            id="p-fa"
            d="M1060 360 C 820 280, 560 260, 200 300"
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.35"
            strokeDasharray="4 6"
            strokeLinecap="round"
          />

          {/* Nodes (opaque fills so edges do not appear inside) */}
          <g id="node-a" transform="translate(200, 300)">
            <circle className="halo" r="28" fill="currentColor" opacity="0" />
            <circle className="core" r="22" fill="#ffffff" stroke="currentColor" strokeWidth="1.5" />
            <text y="38" textAnchor="middle" className="fill-current opacity-70 text-[10px]">
              State A
            </text>
          </g>
          <g id="node-b" transform="translate(500, 180)">
            <circle className="halo" r="28" fill="currentColor" opacity="0" />
            <circle className="core" r="22" fill="#ffffff" stroke="currentColor" strokeWidth="1.5" />
            <text y="38" textAnchor="middle" className="fill-current opacity-70 text-[10px]">
              State B
            </text>
          </g>
          <g id="node-c" transform="translate(850, 260)">
            <circle className="halo" r="28" fill="currentColor" opacity="0" />
            <circle className="core" r="22" fill="#ffffff" stroke="currentColor" strokeWidth="1.5" />
            <text y="38" textAnchor="middle" className="fill-current opacity-70 text-[10px]">
              State C
            </text>
          </g>
          <g id="node-d" transform="translate(600, 470)">
            <circle className="halo" r="28" fill="currentColor" opacity="0" />
            <circle className="core" r="22" fill="#ffffff" stroke="currentColor" strokeWidth="1.5" />
            <text y="38" textAnchor="middle" className="fill-current opacity-70 text-[10px]">
              State D
            </text>
          </g>
          <g id="node-e" transform="translate(900, 520)">
            <circle className="halo" r="28" fill="currentColor" opacity="0" />
            <circle className="core" r="22" fill="#ffffff" stroke="currentColor" strokeWidth="1.5" />
            <text y="38" textAnchor="middle" className="fill-current opacity-70 text-[10px]">
              State E
            </text>
          </g>
          <g id="node-f" transform="translate(1060, 360)">
            <circle className="halo" r="28" fill="currentColor" opacity="0" />
            <circle className="core" r="22" fill="#ffffff" stroke="currentColor" strokeWidth="1.5" />
            <text y="38" textAnchor="middle" className="fill-current opacity-70 text-[10px]">
              State F
            </text>
          </g>

            {/* Action annotation for special state (E) */}
          <g id="action-annot" transform="translate(940, 455)" opacity="0">
            <g transform="translate(0, 0)">
              <path d="M0 0 L12 0 L6 12 L18 12 L-2 36 L6 18 L0 18 Z" fill="#f59e0b" opacity="0.9" />
            </g>
            <text x="26" y="12" className="text-[10px]" fill="#f59e0b">
              Trigger an action
            </text>
          </g>

            {/* Notification annotation for B (pill with white text) */}
            <g id="notif-annot" transform="translate(520, 130)" opacity="0">
              <g transform="translate(0, 0)">
                <rect x="0" y="0" width="120" height="22" rx="6" ry="6" fill="#8b5cf6" opacity="0.95" />
                <g transform="translate(8, 5) scale(0.7)">
                  <path d="M8 6 h6 v8 h-6 z M16 10 l4 2 l-4 2 z" fill="#ffffff" />
                </g>
                <text x="30" y="14" className="text-[10px]" fill="#ffffff">Send notification</text>
              </g>
            </g>

            {/* Token emission annotation for D (pill with white text) */}
            <g id="token-annot" transform="translate(620, 420)" opacity="0">
              <g transform="translate(0, 0)">
                <rect x="0" y="0" width="100" height="22" rx="6" ry="6" fill="#10b981" opacity="0.95" />
                <g transform="translate(6, 4) scale(0.75)">
                  <circle cx="10" cy="10" r="6" fill="#ffffff" />
                  <path d="M10 6 L14 10 L10 14 L6 10 Z" fill="#10b981" />
                </g>
                <text x="28" y="14" className="text-[10px]" fill="#ffffff">Emit token</text>
              </g>
            </g>

          {/* Particle starting at A */}
          <circle id="particle" cx="200" cy="300" r="5" className="fill-primary" />
        </g>

  {/* Ticker moved to React component (BottomLedger) below the animation */}
      </svg>
    </div>
  );
}
