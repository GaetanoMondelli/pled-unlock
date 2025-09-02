"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";

// Dynamically import the TurbineStateMachineScene to avoid SSR issues
const TurbineStateMachineScene = dynamic(() => import("./TurbineStateMachineScene"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="text-gray-400">Loading animation...</div>
    </div>
  ),
});

export default function SafeTurbineScene() {
  return (
    <Suspense fallback={<div className="w-full h-full bg-gray-50 animate-pulse rounded"></div>}>
      <TurbineStateMachineScene />
    </Suspense>
  );
}
