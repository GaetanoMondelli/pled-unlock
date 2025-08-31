"use client";
/* eslint-disable */

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import BottomLedger from "@/components/BottomLedger";
import SafeHeroFsmAnimation from "@/components/SafeHeroFsmAnimation";
import HowItWorksFlow from "@/components/HowItWorksFlow";
import SafePhotoStillLife from "@/components/SafePhotoStillLife";
import { RequestDemoDialog } from "@/components/marketing/RequestDemoDialog";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { motion, useReducedMotion } from "framer-motion";
import { Shield, Workflow, Zap } from "lucide-react";
import templates from "@/lib/templates.json";
// import SafeTurbineScene from "@/components/SafeTurbineScene";

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
                <SafeHeroFsmAnimation />
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

      {/* SECTION 1.25: Renewable flow (turbine -> graph -> certificate) */}
  {/* SECTION 1.5 removed; moved PhotoStillLife into How It Works */}

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
          {/* Photograph animation + explanatory copy: animation comes right after the title */}
          <div className="mt-10">
            <h3 className="mt-2 text-xl font-semibold">From Static Snapshots to Living Tokens</h3>
            <div className="mt-8 lg:mr-[-32px] xl:mr-[-40px]">
              <div className="relative max-w-[768px] w-full mx-auto">
                <SafePhotoStillLife />
              </div>
            </div>
            <div className="mt-10 space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>
                Most tokenization solutions work like a photograph — capturing an asset and its context in a single, rigid snapshot. But real-world context — regulations, compliance rules, contracts — is never fixed. It evolves. And when the background changes, the snapshot no longer reflects reality.
              </p>
              <p>
                Pled solves this with a new architecture.
                We separate facts (events, transactions, sensor data, signed documents) from the rules and models that interpret them. Facts are anchored in a tamper-proof, timestamped ledger, while interpretation layers remain flexible and upgradeable.
              </p>
              <p>This separation brings three breakthroughs:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  <span className="font-medium text-foreground">Flexibility</span> — interpretation rules and models can evolve without rewriting history.
                </li>
                <li>
                  <span className="font-medium text-foreground">Seamless onboarding</span> — any data source can be plugged in immediately, the context layer adapts later.
                </li>
                <li>
                  <span className="font-medium text-foreground">Smart tokens</span> — no longer passive records, tokens become aware of their state and can trigger or suggest actions to reach desired outcomes.
                </li>
              </ul>
              <p>
                This is how Pled transforms tokenization from static and fragile… into smart, interoperable, and scalable digital assets.
              </p>
            </div>
          </div>
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
          {/* Browse all templates CTA moved to the Use Cases section below */}
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
          <motion.div
            className="relative"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none]" style={{ WebkitOverflowScrolling: "touch" }}>
              <div className="flex gap-4 snap-x snap-mandatory">
                {(templates as any[]).slice(0, 10).map(t => (
                  <Card key={t.id} className="min-w-[260px] sm:min-w-[300px] snap-start overflow-hidden">
                    {t.coverImage ? (
                      <div className="relative h-24 w-full">
                        <Image src={t.coverImage} alt={t.title} fill className="object-cover" />
                      </div>
                    ) : null}
                    <CardHeader className="p-4">
                      <CardTitle className="text-sm sm:text-base">{t.title}</CardTitle>
                      <CardDescription className="mt-1 text-xs sm:text-sm line-clamp-2">{t.description}</CardDescription>
                      <div className="mt-3">
                        <Link href={`/templates/${encodeURIComponent(t.id)}`}>
                          <Button size="sm" variant="outline">Details</Button>
                        </Link>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>
            <div className="mt-6">
              <Link href="/templates">
                <Button>Browse all templates</Button>
              </Link>
            </div>
          </motion.div>
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

// Old inline SVG diagram removed in favor of HowItWorksFlow

// Pipeline badges removed

// (Deprecated) Stat card used in previous design; retained for reference.

// Use cases carousel removed in favor of a concise 3-card grid
