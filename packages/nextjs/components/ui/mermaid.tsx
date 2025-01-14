"use client"

import { useEffect, useRef } from "react"

export default function Mermaid({ chart }: { chart: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let isMounted = true;

    const renderMermaid = async () => {
      if (ref.current && isMounted) {
        try {
          const mermaid = await import("mermaid");
          if (!mermaid.initialized) {
            mermaid.initialize({ startOnLoad: false });
            mermaid.initialized = true;
          }
          mermaid.render("mermaidChart", chart, (svgCode) => {
            if (ref.current) {
              ref.current.innerHTML = svgCode;
            }
          });
        } catch (error) {
          console.error("Error rendering Mermaid diagram:", error);
        }
      }
    };

    renderMermaid();

    return () => {
      isMounted = false;
    };
  }, [chart]);

  return <div ref={ref} />;
}

