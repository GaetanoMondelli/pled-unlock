"use client";

import Link from "next/link";
import type { NextPage } from "next";
import { useState } from "react";
import { useAccount } from "wagmi";
import { BugAntIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { Address } from "~~/components/scaffold-eth";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import Sidebar from "@/components/sidebar";
import ProcedureContent from "@/components/ui/procedure-content";

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();

  // State management for selected procedure and subsection
  const [selectedProcedure, setSelectedProcedure] = useState<string | null>(null);
  const [activeSubsection, setActiveSubsection] = useState<string | null>(null);

  return (
    <>
      <main className="flex-1 h-screen p-6 overflow-auto">
        {/* <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">Procedures</h1>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Procedure
            </Button>
          </div> */}
        <div className="flex">
          <Sidebar
            selectedProcedure={selectedProcedure}
            setSelectedProcedure={setSelectedProcedure}
            activeSubsection={activeSubsection}
            setActiveSubsection={setActiveSubsection}
          />
          {selectedProcedure !== null && activeSubsection !== null && (
            <div className="flex-1 
              ml-4
            ">
              <ProcedureContent
                procedureId={Number(selectedProcedure)}
                activeSubsection={activeSubsection}
                selectedProcedure={selectedProcedure}
              />
            </div>
          )}
        </div>
        {/* </div> */}
      </main>
    </>
  );
};

export default Home;
