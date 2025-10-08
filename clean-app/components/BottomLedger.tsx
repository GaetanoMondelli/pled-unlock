"use client";

import { useEffect, useState } from "react";
import { useSimulationStore } from "@/stores/simulationStore";
import type { HistoryEntry } from "@/lib/simulation/types";

export type LedgerEntry = {
  id: string;
  text: string;
};

export default function BottomLedger() {
  const globalActivityLog = useSimulationStore(state => state.globalActivityLog);
  const nodesConfig = useSimulationStore(state => state.nodesConfig);

  // Convert simulation activity to ledger entries
  const entries: LedgerEntry[] = globalActivityLog
    .slice(-5) // Get last 5 entries
    .reverse()
    .map((log: HistoryEntry) => {
      const nodeName = nodesConfig[log.nodeId]?.displayName || log.nodeId;
      const timestamp = String(log.timestamp).padStart(10, '0');
      const text = `${timestamp} | ${nodeName}: ${log.action} | value=${log.value !== undefined ? log.value : '-'} | ${log.details || ''}`;

      return {
        id: `${log.sequence}-${log.nodeId}`,
        text: text
      };
    });

  // Fallback entries when no simulation activity
  const fallbackEntries: LedgerEntry[] = [
    { id: "ph-1", text: "0000000000 | Initialization complete | Ready for simulation" },
    { id: "ph-2", text: "0000000000 | Template loaded | Awaiting simulation start" },
    { id: "ph-3", text: "0000000000 | Nodes initialized | Use Play button to start" },
  ];

  const displayEntries = entries.length > 0 ? entries : fallbackEntries;

  return (
    <div className="w-full">
      <div className="rounded-md border border-white/10 bg-black/35 text-white/90">
        <div
          className="px-3 py-2 font-mono text-[11px] leading-tight space-y-1 h-20 overflow-hidden"
          suppressHydrationWarning
        >
          {displayEntries.map(e => (
            <div key={e.id} className="whitespace-nowrap overflow-hidden text-ellipsis">
              {e.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
