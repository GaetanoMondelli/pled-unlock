"use client";

import { notFound } from "next/navigation";
import pledData from "@/public/pled.json";

export default function ProcedurePage({ params }: { params: { id: string } }) {
  const instance = pledData.procedureInstances.find(p => p.instanceId === params.id);

  if (!instance) {
    notFound();
  }

  const template = pledData.procedureTemplates.find(
    t => t.templateId === instance.templateId
  );

  if (!template) {
    notFound();
  }

  return null; // This page is just a layout wrapper
} 