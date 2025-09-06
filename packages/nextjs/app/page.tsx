"use client";

/* eslint-disable */
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { motion, useReducedMotion } from "framer-motion";
import { Brain, Clock, Link2Off, Puzzle, ShieldAlert, Zap } from "lucide-react";
import { RequestDemoDialog } from "@/components/marketing/RequestDemoDialog";
import BottomLedger from "@/components/BottomLedger";
import SafeHeroFsmAnimation from "@/components/SafeHeroFsmAnimation";

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
        body:
          "Ingest raw, real-world events from emails, docs, sensors, and APIs. Every event is anchored to create an immutable history.",
      },
      {
        id: 2,
        title: "Validate",
        body:
          "Our AI interprets each event, validates it against your rules, and assigns a Reliability Index (RI) so decisions are made with confidence.",
      },
      {
        id: 3,
        title: "Execute",
        body:
          "Validated messages update your living digital twin and trigger the next safe action — on-chain or off — automatically.",
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
              <motion.h1 id="hero-title" className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight" variants={fadeUp}>
                AI-Powered Trust for the $16T Tokenization Market.
              </motion.h1>
              <motion.p id="hero-subtitle" className="mt-5 text-lg text-muted-foreground max-w-2xl" variants={fadeUp}>
                Pled creates verifiable, <span className="font-semibold text-foreground">living digital twins</span> of your most complex processes — from contracts to supply chains — bridging the gap between tokens and reality.
              </motion.p>
              <motion.div id="hero-cta" className="mt-8 flex flex-wrap gap-3" variants={fadeUp}>
                <RequestDemoDialog trigger={<Button size="lg">Book a Demo</Button>} />
                <Link href="/architecture">
                  <Button size="lg" variant="outline">See the Technology</Button>
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
          <div className="mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold">Today's Tokenization is Broken.</h2>
          <p className="mt-4 max-w-3xl text-muted-foreground">Most digital assets are dead static tokens, instantly outdated, disconnected from reality, and reliant on costly manual checks and software updates. That kills trust and scalability.</p>
          </div>
          
          <div className="grid gap-8 lg:grid-cols-3">
            <Card className="h-full">
              <CardHeader>
                <div className="w-16 h-16 bg-muted rounded-full mb-6 flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <CardTitle>The Challenge</CardTitle>
                <CardDescription className="mt-6 space-y-2">
                  <div>• Fragmented, outdated digital information</div>
                  <div>• Costly manual reconciliations</div>
                  <div>• Rigid software vs flexible legal and industry needs</div>
                  <div>• No way to handle ambiguous real-world data</div>
                  <div>• Trust deficit between parties</div>
                </CardDescription>
              </CardHeader>
            </Card>

            {/* The Pled Solution */}
            <Card className="h-full">
              <CardHeader>
                <div className="w-16 h-16 bg-muted rounded-full mb-6 flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <CardTitle>PLED Protocol</CardTitle>
                <CardDescription className="mt-6 space-y-2">
                  <div>• Living digital twins that evolve</div>
                  <div>• AI-powered data interpretation</div>
                  <div>• Probabilistic state management when necessary</div>
                  <div>• Verifiable audit trails</div>
                  <div>• Flexible and composable workflow automation</div>
                  <div>• Back compatible and integrable with existing systems</div>
                </CardDescription>
              </CardHeader>
            </Card>

            {/* The Result */}
            <Card className="h-full">
              <CardHeader>
                <div className="w-16 h-16 bg-muted rounded-full mb-6 flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <CardTitle>The Result</CardTitle>
                <CardDescription className="mt-6 space-y-2">
                  <div>• Reduced operational costs</div>
                  <div>• Data insights for optimization</div>
                  <div>• Increased transparency & trust</div>
                  <div>• Real-time compliance verification</div>
                  <div>• Continuous state synchronization</div>
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

  {/* HOW IT WORKS - simple two-column layout with left placeholder */}
      <section className="border-t">
        <div className="container mx-auto px-6 py-20">
            <h2 className="text-2xl sm:text-3xl font-bold">Pled turns digital mess into living digital twins</h2>
          <p className="mt-3 max-w-3xl text-muted-foreground">  Turn messy, real-world signals into reliable insights, then automate decisions with guardrails.
  From ingestion to action, every step is observable, testable, and safe by design </p>
          <div className="mt-8 grid gap-8 lg:grid-cols-2 items-start">
            {/* Left: visual placeholder */}
            <div
              id="how-it-works-visual-placeholder"
              className="rounded-xl border border-dashed bg-muted/20 ring-1 ring-border min-h-[260px] sm:min-h-[320px] grid place-items-center"
            >
              <div className="text-xs sm:text-sm text-muted-foreground">
                Visual placeholder — high-level diagram area
              </div>
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
      <section className="border-t bg-muted/30">
        <div className="container mx-auto px-6 py-20">
          <h2 className="text-2xl sm:text-3xl font-bold">AI-Powered Verifiable Operations</h2>
          <p className="mt-3 max-w-3xl text-muted-foreground">Turn messy, real-world processes into auditable, automated workflows.</p>
          <div className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <div className="p-2 rounded-md bg-primary/10 text-primary w-fit mb-3"><Puzzle className="h-6 w-6" /></div>
              <h3 className="text-lg font-semibold">Structured Rules</h3>
              <p className="mt-2 text-muted-foreground">Model any process as a state machine. Enforce transitions with strict logic so your workflows behave exactly as designed.</p>
            </div>
            <div>
              <div className="p-2 rounded-md bg-primary/10 text-primary w-fit mb-3"><Brain className="h-6 w-6" /></div>
              <h3 className="text-lg font-semibold">AI for the Unstructured</h3>
              <p className="mt-2 text-muted-foreground">Emails, PDFs, IoT signals, contracts — our AI interprets ambiguous events, validates them, and assigns a Reliability Index (RI) to manage uncertainty.</p>
            </div>
            <div>
              <div className="p-2 rounded-md bg-primary/10 text-primary w-fit mb-3"><Zap className="h-6 w-6" /></div>
              <h3 className="text-lg font-semibold">Intelligent Actions</h3>
              <p className="mt-2 text-muted-foreground">Every validated state change triggers the next step automatically — sending alerts, generating docs, approving payments, or syncing with external systems.</p>
            </div>
          </div>
        </div>
      </section>

  {/* USE CASES */}
      <section className="border-t">
        <div className="container mx-auto px-6 py-20">
          <h2 className="text-2xl sm:text-3xl font-bold">Powering the Next Generation of Digital Assets</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <UseCaseCard title="Carbon Credits" text="Prove creation, transfer, and retirement with trusted event trails to eliminate double-counting." />
            <UseCaseCard title="Pharma Cold Chain" text="Live, verifiable temperature and custody data to guarantee integrity from factory to patient." />
            <UseCaseCard title="Complex Processes & Agreements" text="Track the state of multi-stage projects, M&A deals, or VC funding in real time." />
            <UseCaseCard title="Autonomous AI Organizations" text="Model governance, validate proposals with real-world data, and build self-acting entities." />
          </div>
        </div>
      </section>

  {/* FINAL CTA */}
      <section className="border-t bg-gradient-to-b from-white to-slate-50 dark:from-gray-950 dark:to-black">
        <div className="container mx-auto px-6 py-20">
          <h2 className="text-2xl sm:text-3xl font-bold">Pled is the AI that makes tokenization trustworthy.</h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">Ready to bridge reality and digital assets?</p>
          <div className="mt-6 flex gap-3">
            <RequestDemoDialog trigger={<Button size="lg">Book a Demo</Button>} />
            <Link href="/architecture">
              <Button size="lg" variant="outline">See the Tech</Button>
            </Link>
          </div>
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
                <li><Link href="/architecture" className="hover:text-foreground">Architecture</Link></li>
                <li><Link href="/templates" className="hover:text-foreground">Templates</Link></li>
                <li><Link href="/workflow-builder" className="hover:text-foreground">Workflow Builder</Link></li>
              </ul>
            </div>
            <div>
              <div className="font-medium">Company</div>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li><a href="https://www.linkedin.com/company/pled" target="_blank" rel="noreferrer" className="hover:text-foreground">LinkedIn</a></li>
                <li><a href="https://x.com" target="_blank" rel="noreferrer" className="hover:text-foreground">X (Twitter)</a></li>
              </ul>
            </div>
            <div>
              <div className="font-medium">Legal</div>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-foreground">Privacy</Link></li>
                <li><Link href="#" className="hover:text-foreground">Terms</Link></li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ProblemCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row gap-4 items-start">
        <div className="p-2 rounded-md bg-primary/10 text-primary">{icon}</div>
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription className="mt-2">{text}</CardDescription>
        </div>
      </CardHeader>
    </Card>
  );
}

function BenefitCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return null;
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

