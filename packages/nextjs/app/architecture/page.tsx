"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// Temporarily removing lucide icons due to build issues

export default function ArchitecturePage() {
  return (
    <div className="min-h-[calc(100vh-80px)]">
      {/* SECTION 1: Hero */}
      <section className="border-b bg-muted/20">
        <div className="container mx-auto px-6 py-14">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
            The PLED Protocol: A Patented, Event-Driven Architecture
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-3xl">
            Discover the foundational components of our novel protocol for creating verifiable, intelligent digital
            twins from real-world data.
          </p>
          <div className="mt-8 flex gap-3">
            <Link href="/api">
              <Button size="lg" className="gap-2">
                Explore the API Docs
              </Button>
            </Link>
            <Link href="/whitepaper">
              <Button size="lg" variant="outline" className="gap-2">
                Read the Technical Whitepaper
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* SECTION 2: High-Level Schematic */}
      <section className="border-b">
        <div className="container mx-auto px-6 py-14">
          <div className="grid md:grid-cols-2 gap-8 items-start">
            <div>
              <h2 className="text-2xl font-bold mb-3">An Overview of the PLED Protocol</h2>
              <p className="text-muted-foreground">
                PLED is a system of interconnected, specialized modules designed to ingest, interpret, validate, and act
                upon real-world events.
              </p>
              <p className="mt-3 text-muted-foreground">
                The diagram illustrates the primary data flow between modules. Each module below maps to a numbered
                component from our WIPO patent application.
              </p>
            </div>
            <div className="relative h-72 sm:h-96">
              <Image src="/architecture.png" alt="PLED protocol architecture diagram" fill className="object-contain" />
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: Deconstructing the Protocol - Core Modules */}
      <section className="border-b bg-muted/20">
        <div className="container mx-auto px-6 py-14">
          <h2 className="text-2xl font-bold mb-6">The Core Modules</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <ModuleCard
              icon={<div className="h-5 w-5 bg-primary/10 rounded"></div>}
              title="The Representation Module"
              role="The blueprint of the process, defined as a formal state machine."
              patent="Corresponds to Module (2) in our WIPO patent application."
            />
            <ModuleCard
              icon={<div className="h-5 w-5 bg-primary/10 rounded"></div>}
              title="The Event Reception & Storage Module"
              role="The gateway that ingests, classifies, and chronologically stores all raw event data."
              patent="Corresponds to Module (3) in our WIPO patent application."
            />
            <ModuleCard
              icon={<div className="h-5 w-5 bg-primary/10 rounded"></div>}
              title="The Event Interpretation & Validation Module"
              role="The patented brain of the protocol: an AI engine that interprets unstructured event data to create validated, meaningful Messages."
              patent="Corresponds to Module (4) in our WIPO patent application."
              highlight
            />
            <ModuleCard
              icon={<div className="h-5 w-5 bg-primary/10 rounded"></div>}
              title="The Procedure State Update Module"
              role="Applies validated Messages to the state machine, driving the process forward."
              patent="Corresponds to Module (5) in our WIPO patent application."
            />
            <ModuleCard
              icon={<div className="h-5 w-5 bg-primary/10 rounded"></div>}
              title="The Action Module"
              role="Translates state changes into real-world outcomes, from API calls to on-chain transactions."
              patent="Corresponds to Module (8) in our WIPO patent application."
            />
          </div>
        </div>
      </section>

      {/* SECTION 4: Data Flow in Action */}
      <section className="border-b">
        <div className="container mx-auto px-6 py-14">
          <h2 className="text-2xl font-bold mb-6">From Email to Action: A Data Flow Example</h2>

          <div className="grid lg:grid-cols-5 gap-4">
            <FlowStep
              step="1"
              title="Ingest"
              desc="A 'payment approved' email arrives and is captured as a raw Event."
              icon={<div className="h-4 w-4 bg-primary/10 rounded"></div>}
            />
            <Arrow className="hidden lg:flex" />
            <FlowStep
              step="2"
              title="Interpret"
              desc="The AI engine classifies and validates it as a Message: payment_approved."
              icon={<div className="h-4 w-4 bg-primary/10 rounded"></div>}
            />
            <Arrow className="hidden lg:flex" />
            <FlowStep
              step="3"
              title="Update State"
              desc="The state machine transitions from Pending to Paid."
              icon={<div className="h-4 w-4 bg-primary/10 rounded"></div>}
            />
            <Arrow className="hidden lg:flex" />
            <FlowStep
              step="4"
              title="Act"
              desc="An 'Issue Receipt' action is triggered (e.g., mint receipt token, send webhook)."
              icon={<div className="h-4 w-4 bg-primary/10 rounded"></div>}
            />
          </div>
        </div>
      </section>

      {/* SECTION 5: CTA for Technical Audience */}
      <section>
        <div className="container mx-auto px-6 py-14">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-xl font-semibold mr-auto">Build on a Verifiable Foundation</h3>
            <Link href="/api">
              <Button size="lg" className="gap-2">
                Explore the API Docs
              </Button>
            </Link>
            <Link href="/whitepaper">
              <Button size="lg" variant="outline" className="gap-2">
                Read the Technical Whitepaper
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function ModuleCard({
  icon,
  title,
  role,
  patent,
  highlight,
}: {
  icon: React.ReactNode;
  title: string;
  role: string;
  patent: string;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-primary/30 shadow-[0_0_0_1px] shadow-primary/10" : undefined}>
      <CardHeader className="flex flex-row items-start gap-3">
        <div className="p-2 rounded-md bg-primary/10 text-primary">{icon}</div>
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription className="mt-1">{role}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{patent}</p>
      </CardContent>
    </Card>
  );
}

function FlowStep({ step, title, desc, icon }: { step: string; title: string; desc: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
            {step}
          </span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        <div className="flex items-start gap-2">
          <div className="mt-0.5 text-primary">{icon}</div>
          <p>{desc}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Arrow({ className }: { className?: string }) {
  return (
    <div className={className}>
      <div className="h-6 w-6 bg-muted-foreground/20 rounded mt-14"></div>
    </div>
  );
}
