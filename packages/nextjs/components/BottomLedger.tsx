"use client";

import { useEffect, useState } from "react";

export type LedgerEntry = {
  id: string;
  text: string;
};

const INITIAL_ENTRIES: LedgerEntry[] = [
  { id: "ph-1", text: "0000000000 | Initialization complete | signature=0xplaceholder1" },
  { id: "ph-2", text: "0000000000 | State machine definition loaded | signature=0xplaceholder2" },
  { id: "ph-3", text: "0000000000 | Instance created | signature=0xplaceholder3" },
  { id: "ph-4", text: "0000000000 | Engine started | signature=0xplaceholder4" },
  { id: "ph-5", text: "0000000000 | Awaiting first event | signature=0xplaceholder5" },
];

export default function BottomLedger() {
  const [entries, setEntries] = useState<LedgerEntry[]>(() => INITIAL_ENTRIES);

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<string>;
      setEntries(prev => {
        const next = [{ id: crypto.randomUUID(), text: ce.detail }, ...prev];
        return next.slice(0, 5);
      });
    };
    window.addEventListener("hero-ledger:add", handler as EventListener);
    return () => window.removeEventListener("hero-ledger:add", handler as EventListener);
  }, []);

  return (
    <div className="w-full">
      <div className="rounded-md border border-white/10 bg-black/35 text-white/90">
        <div
          className="px-3 py-2 font-mono text-[11px] leading-tight space-y-1 h-20 overflow-hidden"
          suppressHydrationWarning
        >
          {entries.map(e => (
            <div key={e.id} className="whitespace-nowrap overflow-hidden text-ellipsis">
              {e.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
