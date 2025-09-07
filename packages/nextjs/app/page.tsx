"use client";

/* eslint-disable */
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import ArchitectureDiagram from "@/components/ArchitectureDiagram";
import BottomLedger from "@/components/BottomLedger";
import SafeHeroFsmAnimation from "@/components/SafeHeroFsmAnimation";
import { RequestDemoDialog } from "@/components/marketing/RequestDemoDialog";
import { BentoGrid, BentoGridItem } from "@/components/ui/bento-grid";
import BlurFade from "@/components/ui/blur-fade";
import BorderBeam from "@/components/ui/border-beam";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Highlighter } from "@/components/ui/highlighter";
import Marquee from "@/components/ui/marquee";
import { motion, useReducedMotion } from "framer-motion";
import { Brain, Clock, Link2Off, Puzzle, ShieldAlert, Zap } from "lucide-react";

export default function Home() {
  return <Landing />;
}

function Landing() {
  useReducedMotion();

  // Keep hero visual height in sync with text for a balanced layout
  const heroMeasureRef = useRef<HTMLDivElement>(null);
  const [heroHeight, setHeroHeight] = useState<number | null>(null);
  useEffect(() => {
    const measure = () => {
      if (!heroMeasureRef.current) return;
      const rect = heroMeasureRef.current.getBoundingClientRect();
      setHeroHeight(Math.max(0, Math.floor(rect.height)));
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

  const fadeUp = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };
  const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };

  // Steps (3-step: Capture → Validate → Execute)
  const steps = useMemo(
    () => [
      {
        id: 1,
        title: "Capture",
        body: "Ingest raw, real-world events from emails, docs, sensors, and APIs. Every event is anchored to create an immutable history.",
      },
      {
        id: 2,
        title: "Validate",
        body: "Our AI interprets each event, validates it against your rules, and assigns a Reliability Index (RI) so decisions are made with confidence.",
      },
      {
        id: 3,
        title: "Execute",
        body: "Validated messages update your living digital twin and trigger the next safe action — on-chain or off — automatically.",
      },
    ],
    [],
  );

  return (
    <div className="min-h-[calc(100vh-80px)]">
      {/* HERO (reuse previous structure + animation, with new copy) */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white to-slate-50 dark:from-gray-950 dark:to-black">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-40 -right-24 h-96 w-96 rounded-full bg-teal-400/25 blur-3xl" />
          <div className="absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-blue-400/20 blur-3xl" />
        </div>
        <div className="container mx-auto px-6 pt-14 sm:pt-20 pb-10 sm:pb-12">
          <div className="grid lg:grid-cols-2 gap-10 items-stretch">
            <motion.div ref={heroMeasureRef} variants={stagger} initial="hidden" animate="show" className="self-center">
              <motion.h1
                id="hero-title"
                className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight"
                variants={fadeUp}
              >
                AI-Powered Trust for the{" "}
                <Highlighter action="highlight" color="#FF9800" animationDuration={1000} isView={true}>
                  $16T
                </Highlighter>{" "}
                Tokenization Market.
              </motion.h1>
              <motion.p id="hero-subtitle" className="mt-5 text-lg text-muted-foreground max-w-2xl" variants={fadeUp}>
                Pled creates verifiable, <span className="font-semibold text-foreground">living digital twins</span> of
                your most complex processes, from contracts to supply chains, bridging the gap between tokens and
                reality
              </motion.p>
              <motion.div id="hero-cta" className="mt-8 flex flex-wrap gap-3" variants={fadeUp}>
                <RequestDemoDialog trigger={<Button size="lg">Book a Demo</Button>} />
                <Link href="/architecture">
                  <Button size="lg" variant="outline">
                    See the Technology
                  </Button>
                </Link>
              </motion.div>
            </motion.div>
            <div
              className="relative overflow-hidden rounded-xl lg:mr-[-32px] xl:mr-[-40px] bg-muted/20"
              style={{ height: heroHeight ? `${heroHeight}px` : undefined, minHeight: "18rem" }}
            >
              <div className="absolute inset-0">
                <SafeHeroFsmAnimation />
              </div>
            </div>
          </div>
          {/* bottom ledger strip to mirror previous hero section */}
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

      {/* PROBLEM SECTION */}
      {/* <section className="border-t bg-white dark:bg-black">
        <div className="container mx-auto px-6 py-16">
          <h2 className="text-2xl sm:text-3xl font-bold">Today's Tokenization is Broken.</h2>
          <p className="mt-4 max-w-3xl text-muted-foreground">Most digital assets are dead static tokens — instantly outdated, disconnected from reality, and reliant on costly manual checks. That kills trust and scalability.</p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <ProblemCard icon={<Link2Off className="h-6 w-6" />} title="Dead static tokens" text="Snapshots can't keep up with a moving world — real-time verification becomes impossible." />
            <ProblemCard icon={<Clock className="h-6 w-6" />} title="Endless manual reconciliation" text="Teams burn time and money stitching systems together just to trust the data." />
            <ProblemCard icon={<ShieldAlert className="h-6 w-6" />} title="Complexity that kills adoption" text="Siloed systems, sensitive data, and regulatory overhead stall even the best initiatives." />
          </div>
        </div>
      </section> */}

      {/* SOLVING THE DIGITAL TRUST DEFICIT */}
      <section className="border-t bg-white dark:bg-black">
        <div className="container mx-auto px-6 py-20">
          <BlurFade delay={0.2} className="mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold">Today's Tokenization is Broken.</h2>
            <p className="mt-4 max-w-3xl text-muted-foreground">
              Most digital assets exist as static tokens — instantly outdated, disconnected from reality, and dependent
              on costly manual checks and rigid software updates. That kills trust and scalability. The vision is
              powerful, but today’s execution falls short.
            </p>
          </BlurFade>

          {/* TOKENIZATION POTENTIAL MARQUEE */}
          <div className="mb-16">
            <Marquee className="[--duration:120s]" pauseOnHover speed="slow">
              <div className="flex items-center space-x-3 bg-white dark:bg-gray-900 px-5 py-3 rounded-lg shadow-sm border mx-3 min-w-[280px] max-w-[350px]">
                <img src="/logos/blackrock.png" alt="BlackRock" className="w-20 h-20 object-contain flex-shrink-0" />
                <div className="text-xs">
                  <p className="font-medium text-gray-900 dark:text-gray-100 leading-relaxed">
                    "The next step will be{" "}
                    <Highlighter action="underline" color="#22c55e">
                      tokenization
                    </Highlighter>{" "}
                    of financial assets"
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">— Larry Fink, BlackRock</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 bg-white dark:bg-gray-900 px-5 py-3 rounded-lg shadow-sm border mx-3 min-w-[280px] max-w-[350px]">
                <img src="/logos/bcg.png" alt="BCG" className="w-20 h-20 object-contain flex-shrink-0" />
                <div className="text-xs">
                  <p className="font-medium text-gray-900 dark:text-gray-100 leading-relaxed">
                    "
                    <Highlighter action="underline" color="#22c55e">
                      Tokenization
                    </Highlighter>{" "}
                    could reach{" "}
                    <Highlighter action="underline" color="#22c55e">
                      $16 trillion
                    </Highlighter>{" "}
                    by 2030"
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">— Boston Consulting Group</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 bg-white dark:bg-gray-900 px-5 py-3 rounded-lg shadow-sm border mx-3 min-w-[280px] max-w-[350px]">
                <img
                  src="/logos/wef.png"
                  alt="World Economic Forum"
                  className="w-20 h-20 object-contain flex-shrink-0"
                />
                <div className="text-xs">
                  <p className="font-medium text-gray-900 dark:text-gray-100 leading-relaxed">
                    "Trade-offs between{" "}
                    <Highlighter action="underline" color="#22c55e">
                      efficiency
                    </Highlighter>{" "}
                    and{" "}
                    <Highlighter action="underline" color="#22c55e">
                      flexibility
                    </Highlighter>
                    "
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">— World Economic Forum</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 bg-white dark:bg-gray-900 px-5 py-3 rounded-lg shadow-sm border mx-3 min-w-[280px] max-w-[350px]">
                <img src="/logos/mckkinsey.png" alt="McKinsey" className="w-16 h-16 object-contain flex-shrink-0" />
                <div className="text-xs">
                  <p className="font-medium text-gray-900 dark:text-gray-100 leading-relaxed">
                    "Realizing benefits requires assembling{" "}
                    <Highlighter action="underline" color="#22c55e">
                      counterparties
                    </Highlighter>{" "}
                    to{" "}
                    <Highlighter action="underline" color="#22c55e">
                      collaborate
                    </Highlighter>
                    "
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">— McKinsey & Company</p>
                </div>
              </div>
            </Marquee>
          </div>

          <BentoGrid className="max-w-7xl mx-auto">
            <BorderBeam className="md:col-span-1" colorFrom="#ef4444" colorTo="#f97316" duration={8}>
              <BentoGridItem
                className="md:col-span-1 border-0 bg-white dark:bg-gray-950"
                title="The Challenge"
                description={
                  <div className="space-y-2 text-sm">
                    <div>• Fragmented, outdated digital information</div>
                    <div>• Costly manual reconciliations</div>
                    <div>• Rigid software vs flexible legal needs</div>
                    <div>• No way to handle ambiguous data</div>
                    <div>• Trust deficit between parties</div>
                  </div>
                }
                header={
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-6 mx-auto">
                    <ShieldAlert className="w-8 h-8 text-red-600 dark:text-red-400" />
                  </div>
                }
              />
            </BorderBeam>

            <BorderBeam className="md:col-span-1" colorFrom="#3b82f6" colorTo="#06b6d4" duration={10}>
              <BentoGridItem
                className="md:col-span-1 border-0 bg-white dark:bg-gray-950"
                title="PLED Protocol"
                description={
                  <div className="space-y-2 text-sm">
                    <div>• Living digital twins that evolve</div>
                    <div>• AI-powered data interpretation</div>
                    <div>• Probabilistic state management</div>
                    <div>• Verifiable audit trails</div>
                    <div>• Flexible workflow automation</div>
                  </div>
                }
                header={
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-6 mx-auto">
                    <Brain className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  </div>
                }
              />
            </BorderBeam>

            <BorderBeam className="md:col-span-1" colorFrom="#22c55e" colorTo="#10b981" duration={12}>
              <BentoGridItem
                className="md:col-span-1 border-0 bg-white dark:bg-gray-950"
                title="The Result"
                description={
                  <div className="space-y-2 text-sm">
                    <div>• Reduced operational costs</div>
                    <div>• Data insights for optimization</div>
                    <div>• Increased transparency & trust</div>
                    <div>• Real-time compliance verification</div>
                    <div>• Continuous state synchronization</div>
                  </div>
                }
                header={
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-6 mx-auto">
                    <Zap className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                }
              />
            </BorderBeam>
          </BentoGrid>
        </div>
      </section>

      {/* HOW IT WORKS - simple two-column layout with left placeholder */}
      <section className="border-t bg-muted/30">
        <div className="container mx-auto px-6 py-20">
          <BlurFade delay={0.1}>
            <h2 className="text-2xl sm:text-3xl font-bold">Pled turns digital mess into living digital twins</h2>
            <p className="mt-3 max-w-3xl text-muted-foreground">
              Turn messy, real-world signals into reliable insights, then automate decisions with guardrails. From
              ingestion to action, every step is observable, testable, and safe by design
            </p>
          </BlurFade>
          <div className="mt-8 grid gap-8 lg:grid-cols-2 items-start">
            {/* Left: Architecture Diagram */}
            <div className="lg:mr-4">
              <ArchitectureDiagram />
            </div>
            {/* Right: the 3 simple steps */}
            <div className="space-y-8">
              {steps.map(step => (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ amount: 0.6, once: false }}
                  transition={{ duration: 0.45 }}
                  className="flex gap-4"
                >
                  <div className="mt-1 h-7 w-7 shrink-0 rounded-full bg-primary/10 text-primary grid place-items-center text-sm font-semibold">
                    {step.id}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{step.title}</h3>
                    <p className="mt-2 text-muted-foreground">{step.body}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CORE BENEFITS - simple feature blocks (no cards/chips) */}
      <section className="border-t bg-white dark:bg-black">
        <div className="container mx-auto px-6 py-20">
          <BlurFade delay={0.2}>
            <h2 className="text-2xl sm:text-3xl font-bold">AI-Powered Verifiable Operations</h2>
            <p className="mt-3 max-w-3xl text-muted-foreground">
              Turn messy, real-world processes into auditable, automated workflows.
            </p>
          </BlurFade>
          <div className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <div className="p-2 rounded-md bg-primary/10 text-primary w-fit mb-3">
                <Puzzle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold">Structured Rules</h3>
              <p className="mt-2 text-muted-foreground">
                Model any process as a state machine. Enforce transitions with strict logic so your workflows behave
                exactly as designed.
              </p>
            </div>
            <div>
              <div className="p-2 rounded-md bg-primary/10 text-primary w-fit mb-3">
                <Brain className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold">AI for the Unstructured</h3>
              <p className="mt-2 text-muted-foreground">
                Emails, PDFs, IoT signals, contracts — our AI interprets ambiguous events, validates them, and assigns a
                Reliability Index (RI) to manage uncertainty.
              </p>
            </div>
            <div>
              <div className="p-2 rounded-md bg-primary/10 text-primary w-fit mb-3">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold">Intelligent Actions</h3>
              <p className="mt-2 text-muted-foreground">
                Every validated state change triggers the next step automatically — sending alerts, generating docs,
                approving payments, or syncing with external systems.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* USE CASES */}
      <section className="border-t bg-muted/30">
        <div className="container mx-auto px-6 py-20">
          <BlurFade delay={0.1}>
            <h2 className="text-2xl sm:text-3xl font-bold">Powering the Next Generation of Digital Assets</h2>
          </BlurFade>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <UseCaseCard
              title="Carbon Credits"
              text="Prove creation, transfer, and retirement with trusted event trails to eliminate double-counting."
            />
            <UseCaseCard
              title="Pharma Cold Chain"
              text="Live, verifiable temperature and custody data to guarantee integrity from factory to patient."
            />
            <UseCaseCard
              title="Complex Processes & Agreements"
              text="Track the state of multi-stage projects, M&A deals, or VC funding in real time."
            />
            <UseCaseCard
              title="Autonomous AI Organizations"
              text="Model governance, validate proposals with real-world data, and build self-acting entities."
            />
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="border-t bg-gradient-to-b from-white to-slate-50 dark:from-gray-950 dark:to-black">
        <div className="container mx-auto px-6 py-20">
          <BlurFade delay={0.3}>
            <h2 className="text-2xl sm:text-3xl font-bold">Pled is the AI that makes tokenization trustworthy.</h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">Ready to bridge reality and digital assets?</p>
            <div className="mt-6 flex gap-3">
              <RequestDemoDialog trigger={<Button size="lg">Book a Demo</Button>} />
              <Link href="/architecture">
                <Button size="lg" variant="outline">
                  See the Tech
                </Button>
              </Link>
            </div>
          </BlurFade>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t">
        <div className="container mx-auto px-6 py-12">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="text-sm text-muted-foreground">© 2025 Pled, Inc. | London, England.</div>
            </div>
            <div>
              <div className="font-medium">Product</div>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/architecture" className="hover:text-foreground">
                    Architecture
                  </Link>
                </li>
                <li>
                  <Link href="/templates" className="hover:text-foreground">
                    Templates
                  </Link>
                </li>
                <li>
                  <Link href="/workflow-builder" className="hover:text-foreground">
                    Workflow Builder
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <div className="font-medium">Company</div>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>
                  <a
                    href="https://www.linkedin.com/company/pled"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-foreground"
                  >
                    LinkedIn
                  </a>
                </li>
                <li>
                  <a href="https://x.com" target="_blank" rel="noreferrer" className="hover:text-foreground">
                    X (Twitter)
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <div className="font-medium">Legal</div>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="#" className="hover:text-foreground">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground">
                    Terms
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function UseCaseCard({ title, text }: { title: string; text: string }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription className="mt-2">{text}</CardDescription>
      </CardHeader>
    </Card>
  );
}
