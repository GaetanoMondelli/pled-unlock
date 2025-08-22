"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";

export type AnimatedLogoProps = {
  size?: number | string; // px or CSS size
  color?: string; // tailwind or css color value
  className?: string;
  assembledDelay?: number; // seconds before steady state
};

/**
 * Animated tri-node logo: nodes gently pulse and assemble smoothly.
 * - Background free; uses currentColor so it themes automatically.
 */
export function AnimatedLogo({
  size = 96,
  color = "currentColor",
  className,
  assembledDelay = 0.2,
}: AnimatedLogoProps) {
  const prefersReduce = useReducedMotion();

  // Node base positions in viewBox coordinates (256x256)
  const nodes = [
    { cx: 64, cy: 64, r: 24, key: "n1" },
    { cx: 192, cy: 64, r: 24, key: "n2" },
    { cx: 128, cy: 200, r: 24, key: "n3" },
    { cx: 128, cy: 128, r: 18, key: "n4" }, // center
  ];

  const containerVariants = {
    hidden: { opacity: 0, rotate: -6, scale: 0.92 },
    show: { opacity: 1, rotate: 0, scale: 1, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
  } as const;

  const lineVariants = {
    hidden: { pathLength: 0, opacity: 0 },
    show: (i: number) => ({
      pathLength: 1,
      opacity: 1,
      transition: { delay: assembledDelay + i * 0.08, duration: 0.8, ease: "easeInOut" },
    }),
  } as const;

  const pulse = prefersReduce
    ? {}
    : {
        animate: {
          scale: [1, 1.08, 1],
          filter: [
            "drop-shadow(0 0 0 rgba(0,0,0,0))",
            "drop-shadow(0 2px 6px rgba(0,0,0,0.15))",
            "drop-shadow(0 0 0 rgba(0,0,0,0))",
          ],
        },
        transition: { repeat: Infinity, duration: 2.6, ease: "easeInOut" },
      };

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 256 256"
      xmlns="http://www.w3.org/2000/svg"
      initial="hidden"
      animate="show"
      variants={containerVariants}
      style={{ color }}
      className={className}
    >
      {/* connectors */}
      <g fill="none" stroke="currentColor" strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" opacity={0.9}>
        <motion.path d="M128 128 L64 64" variants={lineVariants} custom={0} />
        <motion.path d="M128 128 L192 64" variants={lineVariants} custom={1} />
        <motion.path d="M128 128 L128 200" variants={lineVariants} custom={2} />
      </g>

      {/* nodes */}
      {nodes.map((n, idx) => (
        <motion.circle
          key={n.key}
          cx={n.cx}
          cy={n.cy}
          r={n.r}
          fill="currentColor"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: assembledDelay + 0.05 * idx, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          {...pulse}
        />
      ))}
    </motion.svg>
  );
}

export default AnimatedLogo;
