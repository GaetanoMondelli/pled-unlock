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
  const [screenSize, setScreenSize] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      if (width < 640) setScreenSize('mobile');
      else if (width < 1024) setScreenSize('tablet');
      else setScreenSize('desktop');
    };
    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

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
        body: "Ingest raw, real-world events from emails, docs, sensors, and APIs. Every event is anchored to create an immutable history",
      },
      {
        id: 2,
        title: "Validate",
        body: "Our Rules Engine turns events into actionable Messages, uses AI for unclear cases, and assigns a Reliability Index so you can decide with confidence",
      },
      {
        id: 3,
        title: "Execute",
        body: "Validated Messages update your living digital twin and trigger the next safe action automatically based on its current state",
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
          <div className="grid lg:grid-cols-2 gap-6 lg:gap-10 items-stretch">
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
              style={{
                height: screenSize === 'mobile' ? "160px" :
                       screenSize === 'tablet' ? "240px" :
                       (heroHeight ? `${heroHeight}px` : "18rem"),
                minHeight: screenSize === 'mobile' ? "160px" :
                          screenSize === 'tablet' ? "240px" : "18rem"
              }}
            >
              <div className="absolute inset-0">
                <SafeHeroFsmAnimation />
              </div>
            </div>
          </div>
          {/* bottom ledger strip to mirror previous hero section */}
          <div className="mt-6 lg:mt-0">
            <div className="lg:grid lg:grid-cols-2 lg:items-start">
              <div className="hidden lg:block" />
              <div className="lg:mr-[-32px] xl:mr-[-40px]">
                <BottomLedger />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI WORKFLOW SIMULATOR SHOWCASE */}
      <section className="border-t bg-muted/10">
        <div className="container mx-auto px-6 py-20">
          <BlurFade delay={0.1} className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold">Model Complex Workflows with AI Assistance</h2>
            <p className="mt-4 max-w-3xl mx-auto text-muted-foreground">
              Our visual template editor lets you design tokenization workflows using AI chat, just like Cursor for digital transformation
            </p>
          </BlurFade>
          
          <div className="max-w-5xl mx-auto">
            <BorderBeam 
              className="bg-white dark:bg-gray-900 p-2 rounded-2xl shadow-2xl"
              colorFrom="#3b82f6"
              colorTo="#06b6d4"
              duration={15}
            >
              <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4 relative overflow-hidden">
                {/* Browser mockup header */}
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-300 dark:border-gray-600">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                  <div className="flex-1 bg-white dark:bg-gray-700 rounded px-3 py-1 text-sm text-gray-600 dark:text-gray-300 ml-4">
                    pled.io/workflow-builder
                  </div>
                </div>
                
                {/* Simulator screenshot */}
                <div className="bg-white dark:bg-gray-900 rounded-lg overflow-hidden shadow-lg">
                  <img 
                    src="/simulator.png" 
                    alt="Pled Template Editor showing AI-powered workflow simulation with queue processing, data sources, and AI assistant"
                    className="w-full h-auto"
                  />
                </div>
              </div>
            </BorderBeam>
            <br/> 
            <div className="mt-8 grid gap-6 sm:grid-cols-3 text-center">
              <div>
                <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 w-fit mx-auto mb-3">
                  <Brain className="h-6 w-6" />
                </div>
                <h3 className="font-semibold">AI-Powered Design</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Chat with AI to model complex tokenization workflows visually
                </p>
              </div>
              <div>
                <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 w-fit mx-auto mb-3">
                  <Zap className="h-6 w-6" />
                </div>
                <h3 className="font-semibold">Real-time Simulation</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Test your workflows with live data processing and validation
                </p>
              </div>
              <div>
                <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400 w-fit mx-auto mb-3">
                  <Puzzle className="h-6 w-6" />
                </div>
                <h3 className="font-semibold">Visual State Machines</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Build complex logic flows with drag-and-drop components
                </p>
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
Tokenization promises to transform global markets and unlock trillions in value. Yet today's tokens are static, outdated, and costly to maintain, undermining trust and scalability
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

          <BentoGrid className="max-w-none mx-auto mb-24 grid-cols-1 lg:grid-cols-3 gap-8 text-left">
            <BorderBeam className="col-span-1" colorFrom="#ef4444" colorTo="#f97316" duration={8}>
              <BentoGridItem
                className="col-span-1 border-0 bg-white dark:bg-gray-950 p-8"
                title="The Challenge"
                description={
                  <div className="space-y-3 text-base">
                    <div>• Manual reconciliation is slow and expensive</div>
                    <div>• Legacy systems can't handle well unstructured data</div>
                    <div>• Existing solutions and smart contracts are too rigid</div>
                    <div>• Unclear regulations create uncertainty</div>
                    <div>• Low liquidity and fragmented protocols limit adoption</div>
                  </div>
                }
                header={
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-6 mx-auto">
                    <ShieldAlert className="w-8 h-8 text-red-600 dark:text-red-400" />
                  </div>
                }
              />
            </BorderBeam>

            <BorderBeam className="col-span-1" colorFrom="#3b82f6" colorTo="#06b6d4" duration={10}>
              <BentoGridItem
                className="col-span-1 border-0 bg-white dark:bg-gray-950 p-8"
                title="PLED Protocol"
                description={
                  <div className="space-y-3 text-base">
                    <div>• AI interprets unstructured data with reliability scoring</div>
                    <div>• Smart state machines handle complex workflows</div>
                    <div>• Modular architecture for flexible agreement modeling</div>
                    <div>• Data storage, processing and settlement are separated</div>
                    <div>• Can be easily integrated with existing systems</div>
                  </div>
                }
                header={
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-6 mx-auto">
                    <Brain className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  </div>
                }
              />
            </BorderBeam>

            <BorderBeam className="col-span-1" colorFrom="#22c55e" colorTo="#10b981" duration={12}>
              <BentoGridItem
                className="col-span-1 border-0 bg-white dark:bg-gray-950 p-8"
                title="The Result"
                description={
                  <div className="space-y-3 text-base">
                    <div>• Reduce costs through automated workflows</div>
                    <div>• Create unified, auditable asset records</div>
                    <div>• Lower investment barriers for broader market access</div>
                    <div>• Optimization from real-time data insights</div>
                    <div>• Real-time compliance verification</div>
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
          <div className="mt-8 grid gap-8 lg:grid-cols-2 items-center">
            {/* Left: Architecture Diagram */}
            <div className="lg:mr-4">
              <ArchitectureDiagram />
            </div>
            {/* Right: the 3 simple steps */}
            <div className="space-y-8 flex flex-col justify-center">
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
