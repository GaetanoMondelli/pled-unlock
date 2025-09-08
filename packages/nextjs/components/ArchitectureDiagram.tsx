"use client";

import React, { forwardRef, useRef } from "react";
import { cn } from "@/lib/utils";
import { AnimatedBeam } from "@/components/ui/animated-beam";
import { Mail, FileText, Radio, Code, Twitter, Settings, Cpu, Zap } from "lucide-react";

const Circle = forwardRef<
  HTMLDivElement,
  { className?: string; children?: React.ReactNode }
>(({ className, children }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "z-10 flex size-12 items-center justify-center rounded-full border-2 border-border bg-white p-3 shadow-[0_0_20px_-12px_rgba(0,0,0,0.8)]",
        className,
      )}
    >
      {children}
    </div>
  );
});

Circle.displayName = "Circle";

const ArchitectureDiagram = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const div1Ref = useRef<HTMLDivElement>(null);
  const div2Ref = useRef<HTMLDivElement>(null);
  const div3Ref = useRef<HTMLDivElement>(null);
  const div4Ref = useRef<HTMLDivElement>(null);
  const div5Ref = useRef<HTMLDivElement>(null);
  const div6Ref = useRef<HTMLDivElement>(null);
  const div7Ref = useRef<HTMLDivElement>(null);
  const div8Ref = useRef<HTMLDivElement>(null);

  return (
    <div
      className="relative flex h-[500px] w-full items-center justify-center overflow-hidden p-10"
      ref={containerRef}
    >
      <div className="flex size-full max-w-4xl flex-row items-stretch justify-between gap-6">
        <div className="flex flex-col justify-center gap-3">
          <div className="flex flex-col items-center gap-1">
            <Circle ref={div1Ref} className="bg-red-50 border-red-200">
              <Mail className="w-6 h-6 text-red-600" />
            </Circle>
            <span className="text-xs font-medium text-gray-600">Emails</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Circle ref={div2Ref} className="bg-blue-50 border-blue-200">
              <FileText className="w-6 h-6 text-blue-600" />
            </Circle>
            <span className="text-xs font-medium text-gray-600">Documents</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Circle ref={div3Ref} className="bg-green-50 border-green-200">
              <Radio className="w-6 h-6 text-green-600" />
            </Circle>
            <span className="text-xs font-medium text-gray-600">IoT</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Circle ref={div4Ref} className="bg-purple-50 border-purple-200">
              <Code className="w-6 h-6 text-purple-600" />
            </Circle>
            <span className="text-xs font-medium text-gray-600">API</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Circle ref={div5Ref} className="bg-sky-50 border-sky-200">
              <Twitter className="w-6 h-6 text-sky-600" />
            </Circle>
            <span className="text-xs font-medium text-gray-600">Socials</span>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center gap-2">
          <Circle ref={div6Ref} className="size-16 bg-orange-50 border-orange-200">
            <Settings className="w-6 h-6 text-orange-600" />
          </Circle>
          <span className="text-sm font-semibold text-gray-700">Rules Engine</span>
        </div>
        <div className="flex flex-col items-center justify-center gap-2">
          <Circle ref={div7Ref} className="size-28 bg-cyan-50 border-cyan-200">
            <Cpu className="w-12 h-12 text-cyan-600" />
          </Circle>
          <span className="text-sm font-semibold text-gray-700">Digital Twins</span>
        </div>
        <div className="flex flex-col items-center justify-center gap-2">
          <Circle ref={div8Ref} className="size-16 bg-emerald-50 border-emerald-200">
            <Zap className="w-6 h-6 text-emerald-600" />
          </Circle>
          <span className="text-sm font-semibold text-gray-700">Actions</span>
        </div>
      </div>

      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div1Ref}
        toRef={div6Ref}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div2Ref}
        toRef={div6Ref}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div3Ref}
        toRef={div6Ref}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div4Ref}
        toRef={div6Ref}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div5Ref}
        toRef={div6Ref}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div6Ref}
        toRef={div7Ref}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div7Ref}
        toRef={div8Ref}
      />
    </div>
  );
};


export default ArchitectureDiagram;