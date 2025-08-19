"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { RequestDemoDialog } from "@/components/marketing/RequestDemoDialog";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { motion, useReducedMotion } from "framer-motion";
import {
  Activity,
  Boxes,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Cloud,
  CreditCard,
  FileSignature,
  FileText,
  Layers,
  Link2,
  Mail,
  Shield,
  Workflow,
  Zap,
} from "lucide-react";

export default function Home() {
  return <Landing />;
}

// Render landing content without server components by keeping this client component simple
function Landing() {
  useReducedMotion();

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
        <div className="container mx-auto px-6 py-24 sm:py-32">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <motion.div variants={stagger} initial="hidden" animate="show">
              <motion.h1 variants={fadeUp} className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight">
                Intelligent Tokenization for Verifiable Processes
              </motion.h1>
              <motion.p variants={fadeUp} className="mt-5 text-lg text-muted-foreground max-w-2xl">
                PLED is a patented protocol that transforms your most critical contracts, supply chains, and compliance
                workflows into living, auditable digital assets. We provide the single source of truth for the next
                economy.
              </motion.p>
              <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-3">
                <RequestDemoDialog trigger={<Button size="lg">Request a Demo</Button>} />
                <Link href="/architecture">
                  <Button size="lg" variant="outline">
                    View the Architecture
                  </Button>
                </Link>
              </motion.div>
            </motion.div>
            <div className="relative h-64 sm:h-80 lg:h-full min-h-72">
              <div className="absolute inset-0 rounded-xl bg-white/70 dark:bg-white/5 ring-1 ring-black/5 shadow-2xl" />
              <div className="absolute inset-0 p-4">
                <Image src="/architecture.png" alt="PLED architecture" fill className="object-contain" priority />
              </div>
            </div>
          </div>
          {/* proof strip */}
          <div className="mt-10 flex flex-wrap gap-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-full border bg-background px-3 py-1">
              <Link2 className="h-3.5 w-3.5" /> On‑chain + Off‑chain
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border bg-background px-3 py-1">
              <Layers className="h-3.5 w-3.5" /> Composable FSM
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border bg-background px-3 py-1">
              <FileSignature className="h-3.5 w-3.5" /> Signed evidence
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border bg-background px-3 py-1">
              <Shield className="h-3.5 w-3.5" /> Audit‑ready
            </span>
          </div>
        </div>
      </section>

      {/* SECTION 2: Core Value Propositions */}
      <section className="border-t">
        <div className="container mx-auto px-6 py-20">
          <motion.h2
            className="text-2xl font-bold mb-3"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.5 }}
          >
            From Raw Data to Intelligent Assets
          </motion.h2>
          <motion.p
            className="text-muted-foreground max-w-2xl"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.45, delay: 0.05 }}
          >
            Ingest files, transactions, API/webhooks, emails, and IoT telemetry. PLED normalizes heterogeneous inputs
            into verifiable events that drive trustworthy automation.
          </motion.p>
          <motion.div
            className="mt-4 mb-6 flex flex-wrap gap-2 text-sm text-muted-foreground"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.45, delay: 0.1 }}
          >
            <span className="inline-flex items-center gap-1 rounded-full border bg-background px-3 py-1">
              <FileText className="h-3.5 w-3.5" /> Files
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border bg-background px-3 py-1">
              <CreditCard className="h-3.5 w-3.5" /> Transactions
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border bg-background px-3 py-1">
              <Cloud className="h-3.5 w-3.5" /> API / Webhooks
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border bg-background px-3 py-1">
              <Mail className="h-3.5 w-3.5" /> Emails
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border bg-background px-3 py-1">
              <Activity className="h-3.5 w-3.5" /> IoT telemetry
            </span>
          </motion.div>
          <PipelineMini />
          <RawDataExplainer />
          <motion.div
            className="grid md:grid-cols-3 gap-8"
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
          >
            <motion.div variants={fadeUp}>
              <ValueCard
                icon={<Workflow className="h-6 w-6" />}
                title="Build Unbreakable Workflows"
                desc="Model any complex process as an intelligent state machine. Eliminate ambiguity and enforce rules automatically, ensuring procedures run exactly as designed, every time."
              />
            </motion.div>
            <motion.div variants={fadeUp}>
              <ValueCard
                icon={<Shield className="h-6 w-6" />}
                title="Create an Immutable Chain of Evidence"
                desc="Every step, decision, and event is cryptographically signed and recorded. Produce a complete, tamper-proof audit trail on demand for regulators, partners, and customers."
              />
            </motion.div>
            <motion.div variants={fadeUp}>
              <ValueCard
                icon={<Zap className="h-6 w-6" />}
                title="Automate with Confidence"
                desc="Trigger on-chain and off-chain actions from a state of verifiable truth. From milestone payments to compliance alerts, automate critical tasks with unprecedented safety and predictability."
              />
            </motion.div>
          </motion.div>
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
            A Foundational Layer for Any Verifiable Process
          </motion.h2>
          <UseCasesCarousel />
          <div className="mt-10">
            <Link href="/procedures">
              <Button size="lg" className="gap-2">
                <Boxes className="h-4 w-4" />
                Browse tokenization templates
              </Button>
            </Link>
          </div>
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
              <h2 className="text-2xl font-bold">The Architecture of Trust: A Patented Protocol.</h2>
              <p className="mt-3 text-muted-foreground">
                Our unique, event-driven architecture is the subject of a comprehensive WIPO patent application. It is
                composed of specialized, interconnected modules that create a verifiable bridge between the unstructured
                real world and the digital economy.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground list-disc list-inside">
                <li>The Representation Module — formal state machine blueprint</li>
                <li>The Event Reception Module — ingest and classify raw data</li>
                <li>
                  The Event Interpretation & Validation Module — patented AI &quot;brain&quot; generating Messages
                </li>
                <li>The State Update Module — applies Messages to progress the process</li>
                <li>The Action Module — triggers real-world outcomes (APIs, on-chain)</li>
              </ul>
              <div className="mt-6">
                <Link href="/architecture">
                  <Button variant="outline">Learn more about the protocol</Button>
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
              <Image src="/architecture.png" alt="PLED architecture overview" fill className="object-contain" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* SECTION 5: Final Reinforcement & CTA */}
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
                Powered by a Comprehensive Tokenization Protocol.
              </motion.h2>
              <motion.p
                className="mt-3 text-muted-foreground max-w-2xl"
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.45, delay: 0.05 }}
              >
                A general, end-to-end framework for modeling, verifying, and automating real-world processes as digital
                assets. PLED turns diverse inputs into a verifiable state and safe actions to scale tokenization.
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
                <Button size="lg">Explore our Technology</Button>
              </Link>
              <RequestDemoDialog
                trigger={
                  <Button size="lg" variant="outline">
                    Partner with Us
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
    <Card className="transition-transform duration-300 will-change-transform hover:-translate-y-0.5">
      <CardHeader className="p-6 flex flex-row items-start gap-4">
        <div className="p-2 rounded-md bg-primary/10 text-primary">{icon}</div>
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription className="mt-2 leading-relaxed">{desc}</CardDescription>
        </div>
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

function PipelineMini() {
  return (
    <motion.div
      className="mt-2 mb-8 flex items-center gap-2 md:gap-3"
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.4 }}
    >
      <PipelineStep icon={<FileText className="h-3.5 w-3.5" />} label="Inputs" />
      <PipelineConnector />
      <PipelineStep icon={<Layers className="h-3.5 w-3.5" />} label="Normalization" />
      <PipelineConnector />
      <PipelineStep icon={<Workflow className="h-3.5 w-3.5" />} label="Verifiable State" />
      <PipelineConnector />
      <PipelineStep icon={<Zap className="h-3.5 w-3.5" />} label="Actions / Tokens" />
    </motion.div>
  );
}

function RawDataExplainer() {
  const items = [
    { label: "PDFs", icon: <FileText className="h-3.5 w-3.5" /> },
    { label: "TXs", icon: <CreditCard className="h-3.5 w-3.5" /> },
    { label: "APIs", icon: <Cloud className="h-3.5 w-3.5" /> },
    { label: "Emails", icon: <Mail className="h-3.5 w-3.5" /> },
    { label: "IoT", icon: <Activity className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="mt-6 mb-8">
      <motion.div
        className="relative mx-auto grid max-w-3xl grid-cols-1 items-center gap-6 sm:grid-cols-3"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.4 }}
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
      >
        {/* implode: raw inputs converge into events */}
        <motion.div className="flex flex-wrap justify-center gap-2" variants={{}}>
          {items.map((it, i) => (
            <motion.span
              key={i}
              className="inline-flex items-center gap-1 rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground"
              initial={{ opacity: 0, y: 6, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.45, delay: i * 0.05 }}
            >
              {it.icon}
              {it.label}
            </motion.span>
          ))}
        </motion.div>

        <div className="hidden sm:block" />

        {/* explode: events branch to various actions */}
        <motion.div className="flex flex-wrap justify-center gap-2" variants={{}}>
          {["Signatures", "Ledger", "APIs", "Alerts"].map((label, i) => (
            <motion.span
              key={label}
              className="inline-flex items-center gap-1 rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground"
              initial={{ opacity: 0, y: 6, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.45, delay: i * 0.06 }}
            >
              {label}
            </motion.span>
          ))}
        </motion.div>

        {/* animated connector between groups */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 hidden h-1 w-2/3 -translate-x-1/2 -translate-y-1/2 items-center sm:flex">
          <div className="relative h-1 flex-1 overflow-hidden rounded">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/15 to-primary/10" />
            <motion.div
              className="absolute inset-y-0 w-16 bg-primary/40 blur-sm"
              initial={{ x: "-10%" }}
              whileInView={{ x: "110%" }}
              viewport={{ once: false, amount: 0.5 }}
              transition={{ repeat: Infinity, duration: 2.4, ease: "linear" }}
            />
          </div>
        </div>
      </motion.div>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Raw data can be anything. PLED turns it into verifiable events and safe actions.
      </p>
    </div>
  );
}

function PipelineStep({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
      {icon}
      {label}
    </span>
  );
}

function PipelineConnector() {
  return (
    <div className="relative hidden h-1 flex-1 overflow-hidden rounded sm:block">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/30 via-primary/20 to-primary/10" />
      <motion.div
        className="absolute inset-y-0 w-16 bg-primary/40 blur-sm"
        initial={{ x: "-20%" }}
        whileInView={{ x: "120%" }}
        viewport={{ once: false, amount: 0.5 }}
        transition={{ repeat: Infinity, duration: 2.6, ease: "linear" }}
      />
    </div>
  );
}

// (Deprecated) Stat card used in previous design; retained for reference.

function UseCasesCarousel() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const slides: { title: string; desc: string; img?: string }[] = [
    {
      title: "Contract Lifecycle Management",
      desc: "Tokenize legal agreements to automate obligation tracking, manage milestones, and ensure compliance from execution to settlement.",
      img: "/review-wizard.png",
    },
    {
      title: "Verifiable Supply Chains",
      desc: "Create digital passports for goods to prove origin, custody, and compliance (including cold chain integrity).",
      img: "/neweventconsent2.png",
    },
    {
      title: "High-Integrity Carbon Credits",
      desc: "Tokenize end-to-end measurement and verification to eliminate greenwashing and enable auditable credits.",
      img: "/state_machine_ai.png",
    },
    {
      title: "Public Equities",
      desc: "Embed listing criteria and automate corporate actions with transparent tokens.",
      img: "/playground.png",
    },
    {
      title: "Fixed Income",
      desc: "Streamline issuance and lifecycle management of bonds with fractional access and automated workflows.",
      img: "/ai-actions.png",
    },
    {
      title: "Private Equity",
      desc: "Increase transparency and lower minimums by representing private market interests as verifiable tokens.",
      img: "/comparison-navigator.png",
    },
    {
      title: "Private Debt",
      desc: "Move private credit on-chain for real-time settlement and reduced back-office friction via smart rules.",
      img: "/run-machine.png",
    },
    {
      title: "Real Estate",
      desc: "Enable fractional ownership and a unified record of title, cash flows, and covenants across assets.",
      img: "/newprocedure.png",
    },
    {
      title: "Commodities",
      desc: "Improve access and collateralization for assets like gold with traceable, fractional digital representations.",
      img: "/actionPolicy.png",
    },
  ];

  const scrollBy = (dir: "prev" | "next") => {
    const el = ref.current;
    if (!el) return;
    const amount = el.clientWidth * 0.9;
    el.scrollBy({ left: dir === "next" ? amount : -amount, behavior: "smooth" });
    setIndex(prev => {
      const next = dir === "next" ? prev + 1 : prev - 1;
      return (next + slides.length) % slides.length;
    });
  };

  // Auto-advance slides slowly
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const id = setInterval(() => {
      if (isPaused) return;
      const first = el.children[0] as HTMLElement | undefined;
      const slideWidth = first?.clientWidth ?? el.clientWidth * 0.9;
      const nextIdx = (index + 1) % slides.length;
      el.scrollTo({ left: nextIdx * slideWidth, behavior: "smooth" });
      setIndex(nextIdx);
    }, 4500);
    return () => clearInterval(id);
  }, [index, isPaused, slides.length]);

  return (
    <div>
      <div className="relative">
        <div className="flex justify-end gap-2 mb-3">
          <Button variant="outline" size="icon" onClick={() => scrollBy("prev")} aria-label="Previous">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button onClick={() => scrollBy("next")} size="icon" aria-label="Next">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div
          ref={ref}
          className="scrollbar-none -mx-2 flex snap-x snap-mandatory overflow-x-auto px-2 py-1"
          style={{ scrollBehavior: "smooth" }}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {slides.map((s, i) => (
            <div key={i} className="min-w-[300px] sm:min-w-[340px] lg:min-w-[380px] pr-4 snap-start">
              <UseCaseCard title={s.title} desc={s.desc} img={s.img} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
