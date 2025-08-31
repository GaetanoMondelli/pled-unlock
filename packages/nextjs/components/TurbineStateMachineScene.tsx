"use client";

import { useEffect, useRef } from "react";

// Dynamically import GSAP only when needed
const initializeGSAP = async () => {
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
};

export default function TurbineStateMachineScene() {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    let mounted = true;

    const setupAnimation = async () => {
      if (!svgRef.current || !mounted) return;

      try {
        const gsapModules = await initializeGSAP();
        if (!gsapModules || !mounted) return;

        const { gsap } = gsapModules;

        const ctx = gsap.context(() => {
          // Check if all required elements exist before animating
          const requiredElements = [
            "#turbine", "#graph", "#weather", "#label-pled", "#label-energy",
            ".node-core", ".node-label", "#token", "#cert", "#blades",
            "#node-a", "#node-b", "#node-c", "#node-d"
          ];

          const missingElements = requiredElements.filter(selector => {
            const element = svgRef.current?.querySelector(selector);
            return !element;
          });

          if (missingElements.length > 0) {
            console.warn("TurbineStateMachineScene: Missing required elements:", missingElements);
            return;
          }

      try {
        // SIMPLE WORKING ANIMATION
        const tl = gsap.timeline({ repeat: -1, repeatDelay: 3 });

        // EVERYTHING ALWAYS VISIBLE - NO HIDING ANYTHING
        gsap.set("#turbine", { opacity: 1 });
        gsap.set("#graph", { opacity: 1 });
        gsap.set("#weather", { opacity: 1 });
        gsap.set("#label-pled", { opacity: 1 });
        gsap.set("#label-energy", { opacity: 1 });
        gsap.set([".node-core", ".node-label"], { opacity: 1 });
        gsap.set(["#weather-link", "#wire-to-sun"], { opacity: 0.5 });
        
        // Only hide token and certificate initially
        gsap.set("#token", { opacity: 0 });
        gsap.set("#cert", { opacity: 0 });

        // Nodes ALWAYS visible - start with C active
        gsap.set("#node-c .node-core", { fill: "#10b981" });
        gsap.set("#node-a .node-core", { fill: "#e5e7eb" });
        gsap.set("#node-b .node-core", { fill: "#e5e7eb" });
        gsap.set("#node-d .node-core", { fill: "#e5e7eb" });

        // Blade rotation with error handling
        const blades = svgRef.current?.querySelector("#blades");
        if (blades) {
          gsap.to("#blades", { rotation: 360, svgOrigin: "220 260", repeat: -1, ease: "none", duration: 5 });
        }

        // SIMPLE ANIMATION SEQUENCE:
        
        // 1. Show token at start position
        tl.set("#token", { opacity: 1, x: 540, y: 320 }, 1);
        
        // 2. Move token C to A - SIMPLE PATH
        tl.to("#token", { x: 540, y: 220, duration: 2, ease: "power2.inOut" }, 2);
        tl.set("#node-a .node-core", { fill: "#10b981" }, "<");
        tl.set("#node-c .node-core", { fill: "#e5e7eb" }, "<");
        
        // 3. Move token A to D - SIMPLE PATH  
        tl.to("#token", { x: 700, y: 240, duration: 2, ease: "power2.inOut" }, ">+1");
        tl.set("#node-d .node-core", { fill: "#10b981" }, "<");
        tl.set("#node-a .node-core", { fill: "#e5e7eb" }, "<");
        
        // 4. Show certificate - NO MOVEMENT
        tl.set("#cert", { opacity: 1 }, ">+1");
        
        // 5. Reset for next cycle
        tl.set("#cert", { opacity: 0 }, ">+3");
        tl.set("#token", { opacity: 0 }, "<");
        tl.set("#node-c .node-core", { fill: "#10b981" }, ">");
        tl.set("#node-d .node-core", { fill: "#e5e7eb" }, "<");

        return () => tl.kill();
        } catch (error) {
          console.error("TurbineStateMachineScene animation error:", error);
        }
      }, svgRef);

      return () => ctx.revert();
      } catch (error) {
        console.error("Failed to setup GSAP animation:", error);
      }
    };

    setupAnimation();

    return () => {
      mounted = false;
      
      // Nuclear cleanup on unmount
      console.log("🚨 TurbineStateMachineScene UNMOUNTING - NUCLEAR GSAP CLEANUP");
      
      // Immediate emergency cleanup
      try {
        if (typeof window !== "undefined" && (window as any).gsap) {
          const gsap = (window as any).gsap;
          if (gsap && typeof gsap.killTweensOf === "function") {
            gsap.killTweensOf("*");
          }
        }
      } catch (error) {
        console.warn("TurbineStateMachineScene emergency GSAP cleanup failed:", error);
      }

      // Nuclear cleanup
      (async () => {
        try {
          const { NUCLEAR_GSAP_CLEANUP } = await import("../lib/gsap-killer");
          await NUCLEAR_GSAP_CLEANUP();
        } catch (error) {
          console.warn("TurbineStateMachineScene nuclear GSAP cleanup failed:", error);
        }
      })();
    };
  }, []);

  return (
    <div className="w-full h-full">
      <svg ref={svgRef} viewBox="0 0 1200 600" className="w-full h-full">
        <g id="stage">
          {/* Turbine - No green dot in center */}
          <g id="turbine">
            {/* mast connects to nacelle/hub */}
            <path d="M220 260 L232 520 L208 520 Z" fill="currentColor" fillOpacity="0.7" />
            {/* nacelle aligned to hub */}
            <rect x="206" y="252" width="28" height="16" rx="8" fill="currentColor" fillOpacity="0.9" />

            {/* blades group centered at (220,260); GSAP uses svgOrigin for pivot */}
            <g id="blades" transform="translate(220,260)">
              {/* three solid blades built from rounded rects, rotated */}
              <g>
                <rect x="10" y="-12" width="140" height="24" rx="12" fill="currentColor" />
              </g>
              <g transform="rotate(120)">
                <rect x="10" y="-12" width="140" height="24" rx="12" fill="currentColor" />
              </g>
              <g transform="rotate(240)">
                <rect x="10" y="-12" width="140" height="24" rx="12" fill="currentColor" />
              </g>
              {/* hub: just the ring, no green dot */}
              <circle r="12" fill="none" stroke="currentColor" strokeWidth="2" />
            </g>

            {/* ground and wire */}
            <path d="M120 520 H320" stroke="#6b7280" strokeWidth="1" />
            <path id="wire" d="M220 520 L560 520 L560 360" fill="none" stroke="#6b7280" strokeWidth="2" />

            {/* pulses originate from the base; animation will move them along #wire */}
            <circle id="pulse1" cx="220" cy="520" r="6" fill="#10b981" opacity="0" />
            <circle id="pulse2" cx="220" cy="520" r="6" fill="#10b981" opacity="0" />
            <circle id="pulse3" cx="220" cy="520" r="6" fill="#10b981" opacity="0" />
          </g>

          {/* Weather area - improved sun and clouds */}
          <g id="weather">
            {/* weather link to state machine */}
            <path
              id="weather-link"
              d="M900 110 L900 300 L620 300"
              fill="none"
              stroke="#9ca3af"
              strokeWidth="2"
              strokeDasharray="3 5"
            />
            {/* dotted overlay from wire to sun */}
            <path
              id="wire-to-sun"
              d="M560 360 L560 300 L900 300 L900 110"
              fill="none"
              stroke="#9ca3af"
              strokeWidth="1.5"
              strokeDasharray="2 6"
            />
            
            {/* Enhanced sun - NO SMILE, clean and simple */}
            <g id="sun" transform="translate(900,110)">
              <circle r="28" fill="#fbbf24" stroke="#f59e0b" strokeWidth="2" />
              <circle id="sun-halo" r="36" fill="none" stroke="#f59e0b" strokeOpacity="0.4" strokeWidth="3" />
              <g id="sun-rays" stroke="#f59e0b" strokeOpacity="0.7" strokeWidth="3" strokeLinecap="round">
                <line x1="0" y1="-42" x2="0" y2="-50" />
                <line x1="0" y1="42" x2="0" y2="50" />
                <line x1="-42" y1="0" x2="-50" y2="0" />
                <line x1="42" y1="0" x2="50" y2="0" />
                <line x1="-30" y1="-30" x2="-36" y2="-36" />
                <line x1="30" y1="30" x2="36" y2="36" />
                <line x1="30" y1="-30" x2="36" y2="-36" />
                <line x1="-30" y1="30" x2="-36" y2="36" />
              </g>
            </g>
            
            {/* Enhanced clouds - closer and more detailed */}
            <g id="clouds" transform="translate(960,85)" fill="#e5e7eb" stroke="#d1d5db" strokeWidth="1">
              <circle cx="0" cy="0" r="18" />
              <circle cx="20" cy="-6" r="16" />
              <circle cx="40" cy="0" r="18" />
              <circle cx="20" cy="8" r="12" />
              <rect x="-8" y="8" width="56" height="12" rx="6" />
            </g>
            
            {/* weather pulse */}
            <circle id="weatherPulse" cx="900" cy="110" r="8" fill="#f59e0b" opacity="0" />
          </g>

          {/* Graph - fixed edge paths for proper token movement */}
          <g id="graph">
            {/* edges - tokens travel EXACTLY along these paths */}
            <g id="edges" opacity="1">
              <path
                id="edge-ca"
                d="M540 320 L540 220"
                fill="none"
                stroke="#64748b"
                strokeWidth="2"
                strokeDasharray="4 6"
              />
              <path
                id="edge-ab"
                d="M540 220 Q 580 250 620 300"
                fill="none"
                stroke="#64748b"
                strokeWidth="2"
                strokeDasharray="4 6"
              />
              <path
                id="edge-bc"
                d="M620 300 Q 580 310 540 320"
                fill="none"
                stroke="#64748b"
                strokeWidth="2"
                strokeDasharray="4 6"
              />
              <path
                id="edge-ad"
                d="M540 220 Q 620 220 700 240"
                fill="none"
                stroke="#64748b"
                strokeWidth="2"
                strokeDasharray="4 6"
              />
              <path
                id="edge-bd"
                d="M620 300 Q 660 270 700 240"
                fill="none"
                stroke="#64748b"
                strokeWidth="2"
                strokeDasharray="4 6"
              />
            </g>

            {/* nodes with state labels - ALWAYS VISIBLE */}
            <g id="node-a" transform="translate(540,220)">
              <circle className="node-halo" r="20" fill="#10b981" opacity="0" />
              <circle className="node-core" r="14" fill="#fff" stroke="currentColor" strokeWidth="1.5" />
              <text className="node-label" x="0" y="-25" fontSize="12" textAnchor="middle" fill="currentColor" fontWeight="600">
                A
              </text>
            </g>
            <g id="node-b" transform="translate(620,300)">
              <circle className="node-halo" r="20" fill="#10b981" opacity="0" />
              <circle className="node-core" r="14" fill="#fff" stroke="currentColor" strokeWidth="1.5" />
              <text className="node-label" x="0" y="-25" fontSize="12" textAnchor="middle" fill="currentColor" fontWeight="600">
                B
              </text>
            </g>
            <g id="node-c" transform="translate(540,320)">
              <circle className="node-halo" r="20" fill="#10b981" opacity="0" />
              <circle className="node-core" r="14" fill="#fff" stroke="currentColor" strokeWidth="1.5" />
              <text className="node-label" x="0" y="-25" fontSize="12" textAnchor="middle" fill="currentColor" fontWeight="600">
                C
              </text>
            </g>
            <g id="node-d" transform="translate(700,240)">
              <circle className="node-halo" r="20" fill="#10b981" opacity="0" />
              <circle className="node-core" r="14" fill="#fff" stroke="currentColor" strokeWidth="1.5" />
              <text className="node-label" x="0" y="-25" fontSize="12" textAnchor="middle" fill="currentColor" fontWeight="600">
                D
              </text>
            </g>

            {/* traveling token - starts hidden */}
            <circle id="token" cx="540" cy="320" r="6" fill="#10b981" opacity="0" />
          </g>

          {/* Certificate - clean, professional appearance */}
          <g id="cert" transform="translate(880,320)" opacity="0">
            <rect x="0" y="0" width="280" height="160" rx="12" fill="#ffffff" stroke="#10b981" strokeWidth="3" />
            <rect x="0" y="0" width="280" height="50" rx="12" fill="#10b981" />
            <text x="20" y="30" fontSize="18" fill="#ffffff" fontWeight="700">
              Renewable Energy Certificate
            </text>
            {/* certificate content */}
            <text x="20" y="80" fontSize="12" fill="#374151" fontWeight="500">
              Certificate ID: REC-2024-001
            </text>
            <text x="20" y="100" fontSize="12" fill="#374151">
              Energy Source: Wind Turbine
            </text>
            <text x="20" y="120" fontSize="12" fill="#374151">
              Verified: ✓ Blockchain Secured
            </text>
            <text x="20" y="140" fontSize="12" fill="#374151">
              Issued: {new Date().toLocaleDateString()}
            </text>
            
            {/* verification badge */}
            <circle cx="240" cy="100" r="25" fill="#10b981" opacity="0.1" />
            <circle cx="240" cy="100" r="20" fill="#10b981" />
            <text x="240" y="105" fontSize="20" fill="#ffffff" textAnchor="middle" fontWeight="bold">
              ✓
            </text>
          </g>

          {/* Permanent labels - ALWAYS VISIBLE, properly sized */}
          <g id="label-energy" transform="translate(60,480)">
            <rect x="0" y="-16" rx="8" width="200" height="32" fill="#ffffff" stroke="#10b981" strokeWidth="2" />
            <text x="16" y="4" fontSize="14" fill="#10b981" fontWeight="600">
              Green Energy Generation
            </text>
          </g>
          
          <g id="label-pled" transform="translate(450,380)">
            <rect x="0" y="-16" rx="8" width="220" height="32" fill="#ffffff" stroke="#3b82f6" strokeWidth="2" />
            <text x="16" y="4" fontSize="13" fill="#3b82f6" fontWeight="600">
              PLED Token Representation
            </text>
          </g>
        </g>
      </svg>
    </div>
  );
}