"use client";
/* eslint-disable */

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import BottomLedger from "@/components/BottomLedger";
import HeroFsmAnimation from "@/components/HeroFsmAnimation";
import HowItWorksFlow from "@/components/HowItWorksFlow";
import PhotoStillLife from "@/components/PhotoStillLife";
import { RequestDemoDialog } from "@/components/marketing/RequestDemoDialog";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, Shield, Workflow, Zap } from "lucide-react";

export default function Home() {
  return <Landing />;
}

// Render landing content without server components by keeping this client component simple
function Landing() {
  useReducedMotion();

  // Match the animation box height to the hero grid height without changing section size
  const heroMeasureRef = useRef<HTMLDivElement>(null);
  const [heroHeight, setHeroHeight] = useState<number | null>(null);
  useEffect(() => {
    const measure = () => {
      if (heroMeasureRef.current) {
        const rect = heroMeasureRef.current.getBoundingClientRect();
        setHeroHeight(Math.max(0, Math.floor(rect.height)));
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (heroMeasureRef.current) ro.observe(heroMeasureRef.current);
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
      ro.disconnect();
    };
  }, []);

  const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };
  const stagger = {
    hidden: {},
    show: { transition: { staggerChildren: 0.08 } },
  };

  return (
    <div className="min-h-[calc(100vh-80px)]">
      {/* SECTION 1: Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white to-slate-50 dark:from-gray-950 dark:to-black">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-40 -right-24 h-96 w-96 rounded-full bg-teal-400/25 blur-3xl" />
          <div className="absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-blue-400/20 blur-3xl" />
        </div>
        <div className="container mx-auto px-6 pt-14 sm:pt-20 pb-10 sm:pb-12">
          <div className="grid lg:grid-cols-2 gap-10 items-stretch">
            <motion.div ref={heroMeasureRef} variants={stagger} initial="hidden" animate="show" className="self-center">
              <motion.h1 id="hero-title" className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight">
                Intelligent Tokenization for the Real World
              </motion.h1>
              <motion.p id="hero-subtitle" className="mt-5 text-lg text-muted-foreground max-w-2xl">
                Model real-world processes, contracts, supply chains, and more as living, state-aware digital assets.
              </motion.p>
              <motion.div id="hero-cta" className="mt-8 flex flex-wrap gap-3">
                <RequestDemoDialog trigger={<Button size="lg">Request a Demo</Button>} />
                <Link href="/architecture">
                  <Button size="lg" variant="outline">
                    Explore the Technology
                  </Button>
                </Link>
              </motion.div>
            </motion.div>
            <div
              className="relative overflow-hidden rounded-xl lg:mr-[-32px] xl:mr-[-40px]"
              style={{ height: heroHeight ? `${heroHeight}px` : undefined, minHeight: "18rem" }}
            >
              <div className="absolute inset-0">
                <HeroFsmAnimation />
              </div>
            </div>
          </div>
          {/* proof strip removed for a cleaner, neutral hero */}
          <div>
            <div className="grid lg:grid-cols-2 items-start">
              <div className="hidden lg:block" />
              <div className="lg:mr-[-32px] xl:mr-[-40px]">
                <BottomLedger />
              </div>
            </div>
          </div>
        </div>
      </section>

  {/* SECTION 1.5: GSAP Still Life (constant table+apples; background crossfades EU/UK with CET/LBS captions) */}
      <section className="border-t">
        <div className="container mx-auto px-6 py-10">
          <h2 className="sr-only">Still Life</h2>
          <div className="lg:mr-[-32px] xl:mr-[-40px]">
    {/* <PhotoStillLife /> */}
          </div>
        </div>
      </section>

      {/* SECTION 2: How It Works */}
      <section className="border-t">
        <div className="container mx-auto px-6 pt-8 pb-20">
          <motion.h2
            className="text-2xl font-bold mb-3"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.5 }}
          >
            We Don’t Just Mint Tokens. We Give Them Intelligence.
          </motion.h2>
          <motion.p
            className="text-muted-foreground max-w-2xl"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.45, delay: 0.05 }}
          >
            Our protocol turns static tokens into active ones by interpreting real-world data to maintain verifiable
            state and history, and by acting as a token agent that can transform, compose, and trigger actions safely.
          </motion.p>
          {/* Removed chips/pills and pipeline badges for clarity */}
          <HowItWorksFlow />
          <motion.div
            className="grid md:grid-cols-3 gap-8 items-stretch"
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
          >
            <motion.div variants={fadeUp} className="h-full">
              <ValueCard
                icon={<Workflow className="h-6 w-6" />}
                title="Build Unbreakable Workflows"
                desc="Model any complex process as an intelligent state machine. Eliminate ambiguity and enforce rules automatically so your tokenized asset behaves exactly as designed."
              />
            </motion.div>
            <motion.div variants={fadeUp} className="h-full">
              <ValueCard
                icon={<Shield className="h-6 w-6" />}
                title="Create an Immutable Chain of Evidence"
                desc="Every step, decision, and event is cryptographically recorded. Produce a complete, tamper-proof audit trail on demand for regulators, partners, and customers."
              />
            </motion.div>
            <motion.div variants={fadeUp} className="h-full">
              <ValueCard
                icon={<Zap className="h-6 w-6" />}
                title="Automate with Confidence"
                desc="Trigger on-chain and off-chain actions from a state of verifiable truth. From milestone payments to compliance alerts, automate critical tasks with confidence."
              />
            </motion.div>
          </motion.div>
          <div className="mt-8">
            <Link href="/templates">
              <Button variant="outline">See all templates</Button>
            </Link>
          </div>
        </div>
      </section>

    {/* SECTION 3: Use Cases */}
      <section className="border-t bg-muted/30">
        <div className="container mx-auto px-6 py-20">
          <motion.h2
            className="text-2xl font-bold mb-6"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.5 }}
          >
            Powering the Next Generation of Verifiable Assets
          </motion.h2>
      {/* Additional content can go here */}
        </div>
      </section>

      {/* SECTION 4: The Architecture - A Patented Foundation */}
      <section className="border-t">
        <div className="container mx-auto px-6 py-20">
          <div className="grid lg:grid-cols-2 gap-8 items-start">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-2xl font-bold">Built on a Patented, Modular Foundation</h2>
              <p className="mt-3 text-muted-foreground">
                Our unique protocol, protected by a comprehensive WIPO patent, is built on a series of specialized
                modules that create a verifiable bridge between the unstructured real world and the digital economy.
                This is the defensible engine that powers intelligent tokenization.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground list-disc list-inside">
                <li>The Representation Module - formal state machine blueprint</li>
                <li>The Event Reception Module - ingest and classify raw data</li>
                <li>The Event Interpretation & Validation Module - patented AI engine generating Messages</li>
                <li>The State Update Module - applies Messages to progress the process</li>
                <li>The Action Module - triggers real-world outcomes (APIs, on-chain)</li>
              </ul>
              <div className="mt-6">
                <Link href="/architecture">
                  <Button variant="outline">Learn More About the Architecture</Button>
                </Link>
              </div>
            </motion.div>
            <motion.div
              className="relative h-64 sm:h-80 lg:h-full min-h-72"
              initial={{ opacity: 0, scale: 0.98 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <Image src="/architecture.png" alt="Architecture overview" fill className="object-contain" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* SECTION 4: Final Reinforcement & CTA */}
      <section className="border-t">
        <div className="container mx-auto px-6 py-20">
          <div className="grid gap-6 items-start">
            <div>
              <motion.h2
                className="text-2xl font-bold"
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.45 }}
              >
                Build the Future of Verifiable Assets.
              </motion.h2>
              <motion.p
                className="mt-3 text-muted-foreground max-w-2xl"
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.45, delay: 0.05 }}
              >
                A comprehensive framework for modeling, verifying, and automating real-world processes as digital
                assets. Turn diverse inputs into a verifiable state and safe actions to scale automation.
              </motion.p>
            </div>
            <motion.div
              className="mt-4 flex flex-wrap gap-3"
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.45, delay: 0.1 }}
            >
              <Link href="/architecture">
                <Button size="lg">Partner With Us</Button>
              </Link>
              <RequestDemoDialog
                trigger={
                  <Button size="lg" variant="outline">
                    Request a Demo
                  </Button>
                }
              />
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ValueCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <Card className="h-full transition-transform duration-300 will-change-transform hover:-translate-y-0.5">
      <CardHeader className="h-full p-6 flex flex-col">
        <div className="flex flex-row items-start gap-4">
          <div className="p-2 rounded-md bg-primary/10 text-primary">{icon}</div>
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription className="mt-2 leading-relaxed">{desc}</CardDescription>
          </div>
        </div>
        <div className="mt-auto" />
      </CardHeader>
    </Card>
  );
}

function UseCaseCard({ title, desc, img }: { title: string; desc: string; img?: string }) {
  return (
    <Card className="transition-transform duration-300 will-change-transform hover:-translate-y-0.5">
      {img ? (
        <div className="relative h-28 w-full overflow-hidden rounded-t-xl">
          <Image src={img} alt="use case" fill className="object-cover" />
        </div>
      ) : null}
      <CardHeader className="p-6">
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-primary" /> {title}
        </CardTitle>
        <CardDescription className="mt-2 leading-relaxed">{desc}</CardDescription>
      </CardHeader>
    </Card>
  );
}

// Old inline SVG diagram removed in favor of HowItWorksFlow

// Pipeline badges removed

// (Deprecated) Stat card used in previous design; retained for reference.

// Use cases carousel removed in favor of a concise 3-card grid
