"use client";

import { useEffect } from "react";

export default function ApiDocsPage() {
  useEffect(() => {
    // Load Swagger UI script and CSS from CDN to avoid bundling
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/swagger-ui-dist@5/swagger-ui.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = "https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js";
    script.async = true;
    script.onload = () => {
      // @ts-ignore
      const SwaggerUIBundle = window.SwaggerUIBundle;
      SwaggerUIBundle({
        url: "/openapi.yaml",
        dom_id: "#swagger-ui",
        deepLinking: true,
        docExpansion: "list",
        presets: [
          // @ts-ignore
          window.SwaggerUIBundle?.presets?.apis,
          // @ts-ignore
          window.SwaggerUIStandalonePreset,
        ].filter(Boolean),
        layout: "BaseLayout",
        tryItOutEnabled: false,
        persistAuthorization: true,
        requestInterceptor: (req: any) => req,
      });
    };
    document.body.appendChild(script);

    return () => {
      document.head.removeChild(link);
      document.body.removeChild(script);
    };
  }, []);

  return (
    <main className="min-h-screen bg-white">
      <section className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-semibold mb-2">PLED API</h1>
        <p className="text-slate-600 mb-4">
          PLED turns real-world procedures into composable finite state machines (FSMs) backed by an append-only ledger. This API lets you
          define templates, start executions, ingest events, and observe state/ledger in real time. Investors and partners can use this page to
          understand the surface area and the architecture were building towards.
        </p>
        <ul className="list-disc pl-5 text-slate-700 mb-8">
          <li>
            <strong>Evidence-first</strong>: Ingest raw events; rules derive meaningful messages; FSMs compute state and drive actions.
          </li>
          <li>
            <strong>Governed automation</strong>: FSMs ensure safety and liveness; actions are idempotent and fully auditable.
          </li>
          <li>
            <strong>Verifiability-ready</strong>: Ledger/state commitments to blockchain and tokenization (Phase 2), with ZK attestations later.
          </li>
        </ul>
      </section>
      <div id="swagger-ui" className="max-w-6xl mx-auto px-4 pb-16" />
    </main>
  );
}
