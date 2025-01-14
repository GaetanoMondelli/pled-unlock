"use client"

import { useEffect, useRef } from "react"
import mermaid from "mermaid"

mermaid.initialize({ startOnLoad: true })

export default function Mermaid({ chart }: { chart: string }) {
  const ref = useRef(null)

  useEffect(() => {
    if (ref.current) {
      mermaid.render("mermaid", chart).then((result: any) => {
        const currentRef = ref.current;
        if (currentRef) {
          (currentRef as HTMLElement).innerHTML = result.svg;
        }
      })
    }
  }, [chart])

  return <div ref={ref} className="mermaid" />
}

