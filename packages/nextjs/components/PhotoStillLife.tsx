"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";

// Simple helpers with fixed locale to avoid SSR/CSR differences
function formatTime(d: Date, timeZone: string) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone,
    }).format(d);
  } catch {
    return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
  }
}

function formatDate(d: Date, timeZone: string) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone,
    }).format(d);
  } catch {
    return new Intl.DateTimeFormat("en-GB", { year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  }
}

export default function PhotoStillLife() {
  const [scene, setScene] = useState<"paris" | "london">("paris");
  const [now, setNow] = useState(() => new Date());

  const bgParisRef = useRef<SVGGElement | null>(null);
  const bgLondonRef = useRef<SVGGElement | null>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // base apple weight in kg
  const kg = 0.18;
  const lbs = useMemo(() => kg * 2.20462262, [kg]);
  const timeStr = useMemo(() => {
    const tz = scene === "paris" ? "Europe/Paris" : "Europe/London";
    return formatTime(now, tz);
  }, [now, scene]);
  const dateStr = useMemo(() => {
    const tz = scene === "paris" ? "Europe/Paris" : "Europe/London";
    return formatDate(now, tz);
  }, [now, scene]);

  // Simple prices (decorative): per-kg in Paris, per-lb in London
  const pricePerKgEUR = 3.5; // €/kg
  const pricePerLbGBP = 1.5; // £/lb
  const priceEUR = useMemo(() => kg * pricePerKgEUR, [kg]);
  const priceGBP = useMemo(() => lbs * pricePerLbGBP, [lbs]);
  const fmtEUR = useMemo(() => new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR" }), []);
  const fmtGBP = useMemo(() => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }), []);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(id);
  }, []);

  // Dimensions
  // Left framed picture size: make the first frame a bit smaller
  const W = 440; // was 470
  const H = 288; // was 304

  // Frame and mat (landscape picture frame)
  const M = 16; // outer margin
  const FRAME_TH = 18; // wood frame thickness
  const MAT_TH = 12; // inner paper mat thickness
  const PLAQUE_H = 24; // caption plaque height
  const R_OUT = 16; // outer corner radius
  const R_IN = 10; // inner radii

  // derived rectangles
  const outerX = M;
  const outerY = M;
  const outerW = W - 2 * M;
  const outerH = H - 2 * M;

  const matOuterX = outerX + FRAME_TH;
  const matOuterY = outerY + FRAME_TH;
  const matOuterW = outerW - 2 * FRAME_TH;
  const matOuterH = outerH - 2 * FRAME_TH;

  const photoX = matOuterX + MAT_TH;
  const photoY = matOuterY + MAT_TH;
  const photoW = matOuterW - 2 * MAT_TH;
  const photoH = matOuterH - 2 * MAT_TH - PLAQUE_H; // use full area, no gap

  const plaqueX = matOuterX + MAT_TH + 32;
  const plaqueW = matOuterW - 2 * MAT_TH - 64;
  const plaqueY = photoY + photoH + 16;

  // Build looping smooth slide between Paris and London backgrounds
  useEffect(() => {
    if (!bgParisRef.current || !bgLondonRef.current) return;

    const tl = gsap.timeline({ repeat: -1, defaults: { ease: "sine.inOut" } });

    // Compute slide distance from the photo width so the other city never peeks
    const slideDist = photoW * 1.2 + 200; // zoom-cover factor + safety margin

    // start with Paris in view, London to the right
    const paris = bgParisRef.current;
    const london = bgLondonRef.current;
    if (!paris || !london) return;
    gsap.set(paris, { x: 0, opacity: 1 });
    gsap.set(london, { x: slideDist, opacity: 1 });

    tl.call(() => setScene("paris"))
      // small dwell time on each scene
      .to({}, { duration: 3.5 })
      .to(paris, { x: -slideDist, duration: 4.8 })
      .to(london, { x: 0, duration: 4.8 }, "<")
      .call(() => setScene("london"))
      .to({}, { duration: 3.5 })
      // slide back
      .to(london, { x: slideDist, duration: 4.8 })
      .to(paris, { x: 0, duration: 4.8 }, "<");

    tlRef.current = tl;
    return () => {
      tl.kill();
      tlRef.current = null;
    };
  }, [photoW]);

  // Caption strings with currency
  const caption =
    scene === "paris"
      ? `${kg.toFixed(2)} kg • ${timeStr} • ${fmtEUR.format(priceEUR)}`
      : `${lbs.toFixed(2)} lbs • ${timeStr} • ${fmtGBP.format(priceGBP)}`;

  // Layout for right-side pipeline panels
  // Slightly smaller Events; shrink Model box; separate gaps
  const GAP_LEFT = 64; // between frame and Events
  const GAP_EM = 64; // between Events and Model
  const GAP_MT = 92; // a bit wider gap so model→tokens arrows feel longer
  const EVENTS_W = 340; // smaller events panel
  const MODEL_W = 160; // smaller model card
  const TOKEN_W = 280;
  const TOKEN_H = 120;
  const TOKENS_GAP_Y = 24; // a bit more breathing room
  const eventsX = W + GAP_LEFT;
  const eventsY = outerY + 20;
  const HEADER_H = 36; // smaller header
  const ROW_H = 40; // slightly smaller rows
  const ROW_GAP = 6; // tighter spacing
  const NUM_ROWS = 3;
  const eventsH = 16 + HEADER_H + NUM_ROWS * ROW_H + (NUM_ROWS - 1) * ROW_GAP + 16;
  const modelX = eventsX + EVENTS_W + GAP_EM;
  const modelH = 180; // smaller model height
  const tokensX = modelX + MODEL_W + GAP_MT;
  // Tokens vertical centering: compute total stack height and center within canvas
  const TOKENS_TOTAL_H = TOKEN_H * NUM_ROWS + TOKENS_GAP_Y * (NUM_ROWS - 1);
  // total width for viewBox
  const totalW = tokensX + TOKEN_W + GAP_MT;

  // Canvas height: ensure it's tall enough for the frame/events and the full tokens stack
  const baseCanvasH = Math.max(H, eventsY + eventsH + 2 * M);
  const tokensMinH = TOKENS_TOTAL_H + 2 * M;
  const canvasH = Math.max(baseCanvasH, tokensMinH);
  const modelY = Math.max(M, (canvasH - modelH) / 2);
  const tokensStartY = Math.max(M, (canvasH - TOKENS_TOTAL_H) / 2);

  // Events ledger should be constant with epoch timestamps (no scene dependency)
  const baseEpoch = useMemo(() => Math.floor(Date.now() / 1000), []);

  // Per-apple variants
  const deltas = [-0.02, 0, 0.02];
  const weightsKg = deltas.map(d => Math.max(0.01, kg + d));
  const weightsLbs = weightsKg.map(w => w * 2.20462262);
  const prices = scene === "paris" ? weightsKg.map(w => w * pricePerKgEUR) : weightsLbs.map(w => w * pricePerLbGBP);
  const sigs = ["0xA1B2…9C", "0x7F3D…E8", "0xC0DE…42"]; // decorative

  // Scene accent colors and labels
  const isParis = scene === "paris";
  const accent = isParis ? "#e11d48" : "#2563eb"; // rose-600 vs blue-600
  const markerId = isParis ? "arrowHeadRose" : "arrowHeadBlue";
  const modelTitle = isParis ? "Paris interpretation model" : "London interpretation model";

  // Signal animation refs
  const eventsToModelPathRef = useRef<SVGPathElement | null>(null);
  const gear1Ref = useRef<SVGGElement | null>(null);
  const gear2Ref = useRef<SVGGElement | null>(null);
  const signalDotRef = useRef<SVGCircleElement | null>(null);
  const photoToEventsPathRef = useRef<SVGPathElement | null>(null);

  // Continuous counter-rotating gears
  useEffect(() => {
    if (!gear1Ref.current || !gear2Ref.current) return;
    const t1 = gsap.to(gear1Ref.current, {
      rotation: 360,
      transformOrigin: "50% 50%",
      repeat: -1,
      duration: 6,
      ease: "none",
    });
    const t2 = gsap.to(gear2Ref.current, {
      rotation: -360,
      transformOrigin: "50% 50%",
      repeat: -1,
      duration: 4,
      ease: "none",
    });
    return () => {
      t1.kill();
      t2.kill();
    };
  }, []);

  // Pulse a signal along Events -> Model when scene changes
  useEffect(() => {
    if (!eventsToModelPathRef.current || !signalDotRef.current) return;
    const path = eventsToModelPathRef.current;
    const length = path.getTotalLength();
    const proxy = { t: 0 } as { t: number };
    const tl = gsap.timeline();
    tl.fromTo(path, { strokeDashoffset: 24 }, { strokeDashoffset: 0, duration: 1.1, ease: "sine.out" })
      .to(
        proxy,
        {
          t: length,
          duration: 1.1,
          ease: "sine.out",
          onUpdate: () => {
            const pt = path.getPointAtLength(proxy.t);
            gsap.set(signalDotRef.current, { attr: { cx: pt.x, cy: pt.y }, opacity: 1 });
          },
        },
        0,
      )
      .to(signalDotRef.current, { opacity: 0, duration: 0.2 }, ">-0.05");
    return () => {
      tl.kill();
    };
  }, [scene]);

  // Continuous dotted motion on Photo -> Events arrow
  useEffect(() => {
    if (!photoToEventsPathRef.current) return;
    const path = photoToEventsPathRef.current;
    // Animate dash offset to create moving dots effect
    const dashCycle = 14; // should match dasharray total (dot + gap)
    const t = gsap.fromTo(
      path,
      { strokeDashoffset: 0 },
      { strokeDashoffset: dashCycle, duration: 1.8, repeat: -1, ease: "none" },
    );
    return () => {
      t.kill();
    };
  }, []);

  // Highlight all arrows briefly on scene change
  useEffect(() => {
    if (!svgRef.current) return;
    const root = svgRef.current;
    const allArrows = root.querySelectorAll<SVGPathElement>(".flow-arrow");
    if (!allArrows.length) return;
    const tl = gsap.timeline();
    tl.to(allArrows, { stroke: accent, duration: 0.3, ease: "sine.out" })
      // revert only non-static accent arrows back to neutral
      .to(
        root.querySelectorAll<SVGPathElement>(".flow-arrow:not(.static-accent)"),
        { stroke: "#6b7280", duration: 0.6, ease: "sine.inOut" },
        "+=0.4",
      );
    return () => {
      tl.kill();
    };
  }, [scene, accent]);

  return (
    <div className="w-full max-w-none overflow-visible mx-auto">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${totalW} ${canvasH}`}
        width="100%"
        height="auto"
        role="img"
        aria-label="Still life photograph: table with apples; background flips between Paris and London"
      >
        {/* White background to avoid any sliding artifacts */}
        <rect x={0} y={0} width={totalW} height={canvasH} fill="#ffffff" />
        <defs>
          {/* Inline apple symbol (black paths omitted to be transparent) */}
          <symbol id="appleShape" viewBox="0 0 209 241" overflow="visible">
            <path
              fill="#D3141B"
              d="
M134.000000,242.000000 
 C130.307098,242.000000 126.614182,242.000000 122.583023,241.591736 
 C117.659904,239.838821 113.038574,238.604797 108.503029,237.110397 
 C105.506500,236.123108 97.090958,239.001373 95.000000,242.000000 
 C87.312424,242.000000 79.624847,242.000000 71.711029,241.672302 
 C60.244991,236.823471 51.038960,229.321198 43.202087,220.422821 
 C30.556757,206.064651 19.762548,190.375656 11.419038,173.023636 
 C6.652050,163.109726 3.735658,152.866684 2.917746,141.938629 
 C2.841281,140.916962 1.665411,139.977585 0.999998,139.000000 
 C1.000000,133.645065 1.000000,128.290146 1.415537,122.585800 
 C2.260328,119.402222 2.461571,116.510735 3.157190,113.743530 
 C6.703877,99.634605 11.838638,86.494301 22.451878,75.746849 
 C28.770018,69.348816 36.070137,64.842331 44.186832,62.267963 
 C54.425369,59.020618 65.179924,59.437496 75.773682,61.839752 
 C83.525879,63.597652 91.345757,65.057076 99.582748,66.699883 
 C104.001877,66.775696 107.973732,66.801170 112.335098,66.751999 
 C119.371590,65.176811 125.955093,63.220547 132.680588,62.283676 
 C142.509003,60.914562 152.404831,59.908287 162.247849,62.887844 
 C171.119415,65.573334 178.955597,69.839493 186.314148,75.539314 
 C199.081619,85.428795 206.404465,98.045578 208.076233,114.067802 
 C208.184036,115.100868 209.334549,116.025124 210.000000,117.000000 
 C210.000000,124.687584 210.000000,132.375168 209.646301,140.323761 
 C208.532623,141.765640 207.183975,142.908524 207.104996,144.133270 
 C206.423447,154.701752 202.713638,164.487579 198.434433,173.852951 
 C189.217041,194.025894 177.250366,212.491455 160.771042,227.640900 
 C153.723862,234.119370 146.349854,240.220200 135.889069,240.107224 
 C135.266266,240.100479 134.629990,241.340256 134.000000,242.000000 
M36.185280,155.921463 
 C31.746746,156.905991 30.951143,158.432800 32.797871,162.374054 
 C33.214859,163.263977 33.611450,164.168228 33.943741,165.092361 
 C39.517429,180.593521 50.121590,192.459442 61.958939,203.324371 
 C66.475899,207.470276 69.826340,206.190765 71.784279,199.950150 
 C68.782837,197.381027 65.541809,194.838242 62.565285,192.016464 
 C52.931644,182.883560 45.365696,172.361771 40.866592,159.722412 
 C40.285252,158.089264 38.243698,156.975906 36.185280,155.921463 
z"
            />
            <path
              fill="#55352A"
              d="
M99.582741,66.699883 
 C99.223221,61.388725 99.310982,56.127903 99.516434,50.271141 
 C100.569122,45.061775 101.504105,40.448349 102.439095,35.834923 
 C105.857460,29.292105 108.815178,22.448242 112.834457,16.298141 
 C116.283089,11.021223 120.945717,6.537691 125.035736,1.351650 
 C127.370552,1.000000 129.741104,1.000000 132.555847,0.999999 
 C133.142822,1.811640 132.993301,2.933173 133.473999,3.386618 
 C137.903900,7.565383 134.938126,10.524359 131.956726,13.540100 
 C120.685440,24.941217 113.729454,38.388680 112.522575,54.561665 
 C112.234955,58.415997 111.911949,62.267696 111.775406,66.473625 
 C107.973732,66.801170 104.001877,66.775696 99.582741,66.699883 
z"
            />
            <path
              fill="#7DB820"
              d="
M102.254272,35.595688 
 C101.504105,40.448349 100.569122,45.061775 99.352013,49.919952 
 C88.332245,56.984669 76.629539,56.738194 64.592361,55.273628 
 C45.537331,52.955200 35.455158,39.886929 26.886963,24.754248 
 C24.341774,20.259077 21.581411,15.885738 18.539621,10.824218 
 C22.554314,10.140401 25.851610,9.191468 29.176460,9.082386 
 C40.889885,8.698090 52.747353,7.453613 64.284096,8.805741 
 C71.805458,9.687259 79.661407,13.389812 85.910500,17.863712 
 C92.231491,22.389086 96.757286,29.421972 102.254272,35.595688 
M39.965508,19.605938 
 C39.797745,19.700539 39.629982,19.795139 39.462219,19.889742 
 C39.603477,19.966373 39.744736,20.043007 40.315132,20.636097 
 C55.233288,31.188898 72.116287,37.214256 89.516617,42.057995 
 C74.891975,30.567169 57.876453,24.401220 39.965508,19.605938 
M92.509468,43.490875 
 C92.509468,43.490875 92.476936,43.492218 92.509468,43.490875 
z"
            />
            <path
              fill="#557B18"
              d="
M40.166176,19.779043 
 C57.876453,24.401220 74.891975,30.567169 89.516617,42.057995 
 C72.116287,37.214256 55.233288,31.188898 40.170834,20.292904 
 C40.026535,19.949711 40.166176,19.779043 40.166176,19.779043 
z"
            />
            <path
              fill="#557B18"
              d="
M39.956264,20.034676 
 C39.744736,20.043007 39.603477,19.966373 39.462219,19.889742 
 C39.629982,19.795139 39.797745,19.700539 40.065842,19.692490 
 C40.166176,19.779043 40.026535,19.949711 39.956264,20.034676 
z"
            />
            <path
              fill="#557B18"
              d="
M92.493202,43.491547 
 C92.476936,43.492218 92.509468,43.490875 92.493202,43.491547 
z"
            />
          </symbol>
          {/* Paper inner shadow */}
          <filter id="paperShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.15" />
          </filter>
          {/* Soft shadow */}
          <filter id="softShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
            <feOffset dx="0" dy="2" result="offset" />
            <feMerge>
              <feMergeNode in="offset" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Grain overlay */}
          <filter id="grain" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
            <feComponentTransfer>
              <feFuncA type="table" tableValues="0 0 0 0.05" />
            </feComponentTransfer>
          </filter>
          {/* Wood pattern & frame gradients */}
          <pattern id="wood" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(2)">
            <rect width="8" height="8" fill="rgba(255,255,255,0)" />
            <path d="M0 4 H8" stroke="#7c3e0a" strokeWidth="0.6" strokeOpacity="0.15" />
            <path d="M0 2 H8" stroke="#7c3e0a" strokeWidth="0.4" strokeOpacity="0.1" />
            <path d="M0 6 H8" stroke="#7c3e0a" strokeWidth="0.4" strokeOpacity="0.1" />
          </pattern>
          <linearGradient id="woodFrame" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5a2b" />
            <stop offset="50%" stopColor="#6e4523" />
            <stop offset="100%" stopColor="#4b2e15" />
          </linearGradient>
          <linearGradient id="frameHighlight" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
          {/* Vignette */}
          <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
            <stop offset="70%" stopColor="rgba(0,0,0,0)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.18)" />
          </radialGradient>
          {/* Apple gradients */}
          <radialGradient id="gRed" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#ff7b7b" />
            <stop offset="100%" stopColor="#b91c1c" />
          </radialGradient>
          <radialGradient id="gOrange" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#ffb374" />
            <stop offset="100%" stopColor="#c2410c" />
          </radialGradient>
          <radialGradient id="gGreen" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#8bffb3" />
            <stop offset="100%" stopColor="#15803d" />
          </radialGradient>
          {/* Brass plaque */}
          <linearGradient id="brass" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#c59d5f" />
            <stop offset="50%" stopColor="#e5c07b" />
            <stop offset="100%" stopColor="#a37d4f" />
          </linearGradient>
          {/* Inner shadow for mat cutout */}
          <filter id="innerShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feOffset dx="0" dy="2" />
            <feGaussianBlur stdDeviation="3" result="offset-blur" />
            <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse" />
            <feFlood floodColor="#000" floodOpacity="0.25" result="color" />
            <feComposite operator="in" in="color" in2="inverse" result="shadow" />
            <feComposite operator="over" in="shadow" in2="SourceGraphic" />
          </filter>
          {/* Arrowhead markers */}
          <marker
            id="arrowHeadNeutral"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="8"
            markerHeight="8"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" fill="#6b7280" />
          </marker>
          <marker
            id="arrowHeadRose"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="8"
            markerHeight="8"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" fill="#e11d48" />
          </marker>
          <marker
            id="arrowHeadBlue"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="8"
            markerHeight="8"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" fill="#2563eb" />
          </marker>
          {/* Provided gear icon as symbol (stroke via currentColor) */}
          <symbol id="gearIcon" viewBox="0 0 24 24" overflow="visible">
            <path
              d="M18.763 13.7944L20.029 16.0222C19.8786 16.3163 19.7105 16.6051 19.5244 16.8873C19.3383 17.1695 19.1391 17.4378 18.9281 17.6919L16.4377 17.4142C15.7715 17.9608 15.0027 18.3869 14.1645 18.6592L13.0002 20.945C12.6719 20.9813 12.3382 21 12.0002 21C11.6622 21 11.3285 20.9813 11.0002 20.945L9.83293 18.6582C8.99428 18.3854 8.22514 17.9585 7.5589 17.4111L5.05407 17.6915C4.84303 17.4374 4.64381 17.1691 4.45774 16.8869C4.27168 16.6047 4.10356 16.3159 3.95312 16.0218L5.22637 13.7814C5.07803 13.2142 5.00021 12.6139 5.00021 12.0002C5.00021 11.3749 5.08219 10.7688 5.23599 10.192L3.95351 7.936C4.10394 7.64191 4.27206 7.3531 4.45812 7.07091C4.64419 6.78873 4.84341 6.52043 5.05445 6.2663L7.60942 6.55327C8.26776 6.02075 9.01625 5.60683 9.84 5.33984M9.83614 5.33996L11 3.05493C11.3283 3.01863 11.662 3 12 3C12.338 3 12.6716 3.01863 13 3.05493L14.1638 5.33996C14.9882 5.60716 15.7389 6.01764 16.3976 6.55077L18.9275 6.26661C19.1385 6.52074 19.3377 6.78904 19.5238 7.07123C19.7098 7.35341 19.878 7.64223 20.0284 7.93632L18.7592 10.1697M18.7594 10.1732C18.9164 10.7556 19.0002 11.3681 19.0002 12.0002C19.0002 12.6215 18.9193 13.2239 18.7673 13.7974M15.0002 12.0002C15.0002 13.657 13.6571 15.0002 12.0002 15.0002C10.3433 15.0002 9.0002 13.657 9.0002 12.0002C9.0002 10.3433 10.3433 9.00015 12.0002 9.00015C13.6571 9.00015 15.0002 10.3433 15.0002 12.0002Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </symbol>
        </defs>
        {/* Wood frame and inner mat */}
        <g filter="url(#paperShadow)">
          {/* Outer wood frame */}
          <rect x={outerX} y={outerY} width={outerW} height={outerH} rx={R_OUT} fill="url(#woodFrame)" />
          {/* Bevel highlight */}
          <rect
            x={outerX}
            y={outerY}
            width={outerW}
            height={outerH}
            rx={R_OUT}
            fill="url(#frameHighlight)"
            opacity={0.25}
          />
          {/* Mat layer */}
          <rect x={matOuterX} y={matOuterY} width={matOuterW} height={matOuterH} rx={R_IN} fill="#fafaf9" />
          {/* Inner mat shadow rim */}
          <rect
            x={photoX - 2}
            y={photoY - 2}
            width={photoW + 4}
            height={photoH + 4}
            rx={R_IN}
            fill="#000"
            opacity={0.06}
            filter="url(#innerShadow)"
          />
        </g>
        {/* Photo area */}
        <clipPath id="photoClip">
          <rect x={photoX} y={photoY} width={photoW} height={photoH} rx={R_IN} />
        </clipPath>
        <g clipPath="url(#photoClip)">
          {/* Solid white behind sliding images to prevent any visual seams */}
          <rect x={photoX} y={photoY} width={photoW} height={photoH} fill="#ffffff" />
          {/* Paris/London background images that slide horizontally */}
          <g ref={bgParisRef}>
            <image
              x={photoX - photoW * 0.05}
              y={photoY - photoH * 0.05}
              width={photoW * 1.1}
              height={photoH * 1.1}
              href="/paris.svg"
              preserveAspectRatio="xMidYMid slice"
            />
          </g>
          <g ref={bgLondonRef}>
            <image
              x={photoX - photoW * 0.05}
              y={photoY - photoH * 0.05}
              width={photoW * 1.1}
              height={photoH * 1.1}
              href="/london.svg"
              preserveAspectRatio="xMidYMid slice"
            />
          </g>

          {/* Table (constant) with perspective */}
          {(() => {
            // Smaller, proportional table geometry in grayscale
            const depth = Math.max(24, photoH * 0.09); // slightly shallower
            const lip = Math.max(6, photoH * 0.035); // keep near the very bottom
            const thickness = Math.max(4, Math.round(photoH * 0.014));
            const topInset = Math.max(60, photoW * 0.2); // center table width a bit more

            const topY = photoY + photoH - depth;
            const bottomY = photoY + photoH - lip;
            const leftTopX = photoX + topInset;
            const rightTopX = photoX + photoW - topInset;
            const sideInset = Math.max(28, photoW * 0.08);
            const leftBottomX = photoX + sideInset;
            const rightBottomX = photoX + photoW - sideInset;
            return (
              <g>
                <polygon
                  points={`${leftTopX},${topY} ${rightTopX},${topY} ${rightBottomX},${bottomY} ${leftBottomX},${bottomY}`}
                  fill="#9a9a9a"
                />
                <polygon
                  points={`${leftTopX},${topY} ${rightTopX},${topY} ${rightBottomX},${bottomY} ${leftBottomX},${bottomY}`}
                  fill="url(#wood)"
                  opacity={0.2}
                />
                <polygon
                  points={`${leftBottomX},${bottomY} ${rightBottomX},${bottomY} ${rightBottomX},${bottomY + thickness} ${leftBottomX},${bottomY + thickness}`}
                  fill="#6b7280"
                />
                <line
                  x1={leftBottomX}
                  y1={bottomY}
                  x2={rightBottomX}
                  y2={bottomY}
                  stroke="#d1d5db"
                  strokeOpacity={0.3}
                />
              </g>
            );
          })()}

          {/* Apples: use inline apple symbol (black areas removed) on table top with refined shadows */}
          {(() => {
            // Match apples proportionally to the smaller table
            const depth = Math.max(30, photoH * 0.1);
            const topInset = Math.max(60, photoW * 0.2);
            const topY = photoY + photoH - depth; // table top y

            // Smaller apples overall (adapt to new frame size)
            const APPLE_W = Math.max(20, Math.min(32, photoW * 0.048));
            const SCALE = APPLE_W / 209;
            const baselineY = topY; // place group at table top

            const tableTopW = photoW - 2 * topInset;
            const leftEdge = photoX + topInset;
            const rightEdge = photoX + photoW - topInset;
            // Left-anchored placement, push all apples further left
            const pad = Math.max(APPLE_W * 1.0, tableTopW * 0.045);
            const prefGap = Math.max(APPLE_W * 1.1, tableTopW * 0.19);
            const x0 = leftEdge + pad;
            const maxUsable = rightEdge - x0; // remaining width from first apple center
            const gap = Math.min(prefGap, maxUsable * 0.26);
            const x1 = x0 + gap;
            const x2 = x1 + gap;

            // shadow sizes per apple to match their individual scales
            const rx0 = Math.max(APPLE_W * 0.6, 16);
            const ry0 = Math.max(APPLE_W * 0.16, 5);
            const rx1 = rx0 * 0.9;
            const ry1 = ry0 * 0.9;
            const rx2 = rx0 * 0.86;
            const ry2 = ry0 * 0.86;
            // individual scales for apples
            const s0 = SCALE;
            const s1 = SCALE * 0.9;
            const s2 = SCALE * 0.86;
            return (
              <g transform={`translate(0, ${baselineY})`} filter="url(#softShadow)">
                {/* shadows lie on baseline under each apple center */}
                <ellipse cx={x0} cy={2} rx={rx0} ry={ry0} fill="rgba(0,0,0,0.16)" />
                <ellipse cx={x1} cy={2} rx={rx1} ry={ry1} fill="rgba(0,0,0,0.14)" />
                <ellipse cx={x2} cy={2} rx={rx2} ry={ry2} fill="rgba(0,0,0,0.14)" />
                {/* apples sit with bottom touching baseline */}
                <g transform={`translate(${x0 - (209 * s0) / 2}, ${-241 * s0}) scale(${s0})`}>
                  <use href="#appleShape" />
                </g>
                <g transform={`translate(${x1 - (209 * s1) / 2}, ${-241 * s1}) scale(${s1})`}>
                  <use href="#appleShape" />
                </g>
                <g transform={`translate(${x2 - (209 * s2) / 2}, ${-241 * s2}) scale(${s2})`}>
                  <use href="#appleShape" />
                </g>
              </g>
            );
          })()}
        </g>

        {/* Caption plaque inside mat */}
        <rect x={plaqueX} y={plaqueY} width={plaqueW} height={PLAQUE_H} rx={8} fill="url(#brass)" opacity={0.95} />
        <rect x={plaqueX} y={plaqueY} width={plaqueW} height={PLAQUE_H} rx={8} fill="#000" opacity={0.12} />
        <text x={plaqueX + plaqueW / 2} y={plaqueY + PLAQUE_H * 0.66} textAnchor="middle" fontSize={16} fill="#2f2f2f">
          {scene === "paris" ? "Paris" : "London"} • {caption}
        </text>
        {/* Arrow: Photo -> Events (curved, dotted and animated; starts outside the frame; accent-colored) */}
        {(() => {
          const x1 = outerX + outerW + 8; // start just outside the wood frame
          const y1 = photoY + photoH / 2;
          const x2 = eventsX - 8;
          const y2 = eventsY + eventsH / 2;
          const cx = (x1 + x2) / 2;
          const cy = (y1 + y2) / 2 - 50;
          return (
            <path
              ref={photoToEventsPathRef}
              d={`M ${x1},${y1} Q ${cx},${cy} ${x2},${y2}`}
              stroke={accent}
              strokeWidth={3}
              strokeLinecap="round"
              fill="none"
              markerEnd={`url(#${markerId})`}
              strokeDasharray="2 12"
              className="flow-arrow static-accent"
            />
          );
        })()}

        {/* Events panel with lens icon and ledger rows */}
        <g>
          <rect x={eventsX} y={eventsY} width={EVENTS_W} height={eventsH} rx={12} fill="#f3f4f6" stroke="#d1d5db" />
          {/* Header with lens icon */}
          <g transform={`translate(${eventsX + 16}, ${eventsY + 24})`}>
            <g>
              <circle cx={0} cy={0} r={10} fill="#e5e7eb" stroke="#9ca3af" />
              <line x1={7} y1={7} x2={16} y2={16} stroke="#6b7280" strokeWidth={2} />
            </g>
            <text x={28} y={6} fontSize={16} fill="#111827" fontWeight={600}>
              Events
            </text>
          </g>
          {/* Rows (constant; epoch timestamps) */}
          {(() => {
            const epochs = [baseEpoch, baseEpoch + 60, baseEpoch + 120];
            return weightsKg.map((w, i) => {
              const rowY = eventsY + 16 + HEADER_H + i * (ROW_H + ROW_GAP) + Math.floor(ROW_H / 2);
              return (
                <g key={`ev-${i}`} transform={`translate(${eventsX + 16}, ${rowY})`}>
                  <rect
                    x={0}
                    y={-ROW_H / 2}
                    width={EVENTS_W - 32}
                    height={ROW_H}
                    rx={8}
                    fill="#ffffff"
                    stroke="#e5e7eb"
                  />
                  <text x={12} y={8} fontSize={12} fill="#374151">
                    Apple {String.fromCharCode(65 + i)} • ts {epochs[i]} • {w.toFixed(2)} kg • sig
                    <tspan fontSize={10} fill="#6b7280">
                      {" "}
                      {sigs[i]}
                    </tspan>
                  </text>
                </g>
              );
            });
          })()}
        </g>

        {/* Arrow: Events -> Model (curved, dashed with signal) */}
        {(() => {
          const x1 = eventsX + EVENTS_W + 8;
          const y1 = eventsY + eventsH / 2;
          const x2 = modelX - 8;
          // aim towards gears center, not touching panel; keep path outside text
          const gearsCY = modelY + modelH / 2 + 8;
          const y2 = gearsCY;
          const cx = (x1 + x2) / 2;
          const cy = Math.min(y1, y2) - 60; // bow upward to avoid overlapping text
          return (
            <>
              <path
                ref={eventsToModelPathRef}
                d={`M ${x1},${y1} Q ${cx},${cy} ${x2},${y2}`}
                stroke={accent}
                strokeWidth={2}
                fill="none"
                markerEnd={`url(#${markerId})`}
                strokeDasharray="6 8"
                strokeDashoffset={0}
                className="flow-arrow static-accent"
              />
              {/* Signal dot that rides the dashed path on scene change */}
              <circle ref={signalDotRef} cx={x1} cy={y1} r={4} fill={accent} opacity={0} />
            </>
          );
        })()}
        {/* Model panel with gently rotating gears */}
        <g transform={`translate(${modelX}, ${modelY})`}>
          {/* Removed background and border for interpretation model */}
          <text x={MODEL_W / 2} y={30} textAnchor="middle" fontSize={12} fill="#111827" fontWeight={600}>
            {modelTitle}
          </text>
          {/* Counter-rotating gears using provided icon */}
          <g transform={`translate(${MODEL_W / 2}, ${modelH / 2 + 8})`} style={{ transformBox: "fill-box" }}>
            <g ref={gear1Ref} transform="translate(-20, 0)">
              <use href="#gearIcon" width={36} height={36} x={-18} y={-18} style={{ color: "#64748b" }} />
            </g>
            <g ref={gear2Ref} transform="translate(20, -8)">
              <use href="#gearIcon" width={30} height={30} x={-15} y={-15} style={{ color: "#475569" }} />
            </g>
          </g>
        </g>

        {/* Tokens (three stacked frames) and arrows (curved) */}
        {weightsKg.map((w, i) => {
          const tokenY = tokensStartY + i * (TOKEN_H + TOKENS_GAP_Y);
          const label = scene === "paris" ? `Paris Apple Token #${i + 1}` : `London Apple Token #${i + 1}`;
          const wDisp = scene === "paris" ? `${w.toFixed(2)} kg` : `${weightsLbs[i].toFixed(2)} lbs`;
          const priceDisp = scene === "paris" ? fmtEUR.format(prices[i]) : fmtGBP.format(prices[i]);
          const yCenter = tokenY + TOKEN_H / 2;
          const x1 = modelX + MODEL_W + 8;
          const y1 = modelY + modelH / 2 + (i - 1) * 30; // slight spread
          const x2 = tokensX - 8;
          const y2 = yCenter;
          const cx = (x1 + x2) / 2;
          const cy = (y1 + y2) / 2 + (i === 1 ? 20 : 40); // gentle bowing
          return (
            <g key={`tok-${i}`}>
              {/* arrow from model to each token */}
              <path
                d={`M ${x1},${y1} Q ${cx},${cy} ${x2},${y2}`}
                stroke={accent}
                strokeWidth={2}
                fill="none"
                markerEnd={`url(#${markerId})`}
                className="flow-arrow static-accent"
              />
              {/* token card */}
              <g transform={`translate(${tokensX}, ${tokenY})`}>
                <rect x={0} y={0} width={TOKEN_W} height={TOKEN_H} rx={12} fill={accent} stroke={accent} />
                <text x={12} y={28} fontSize={14} fill="#ffffff" fontWeight={600}>
                  {label}
                </text>
                <text x={12} y={56} fontSize={13} fill="#ffffff">
                  Weight: {wDisp}
                </text>
                <text x={12} y={78} fontSize={13} fill="#ffffff">
                  Time: {dateStr} {timeStr}
                </text>
                <text x={12} y={100} fontSize={13} fill="#ffffff">
                  Price: {priceDisp}
                </text>
              </g>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
