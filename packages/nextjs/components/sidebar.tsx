import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const procedures = [
  { id: 1, name: "Customer Onboarding" },
  { id: 2, name: "Order Fulfillment" },
  { id: 3, name: "Employee Hiring" },
];

const subsections = ["Events", "Messages", "State", "Actions"];

interface SidebarProps {
  selectedProcedure: string | null;
  setSelectedProcedure: (procedureName: string) => void;
  activeSubsection: string | null;
  setActiveSubsection: (subsection: string) => void;
}

export default function Sidebar({
  selectedProcedure,
  setSelectedProcedure,
  activeSubsection,
  setActiveSubsection,
}: SidebarProps) {
  return (
    <div className="w-64 border-r bg-background">
      <ScrollArea className="h-full py-2">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold">Procedures</h2>
          <div className="space-y-1">
            {procedures.map((procedure) => (
              <div key={procedure.id}>
                <Button
                  variant="ghost"
                  className={`w-full justify-start ${selectedProcedure === procedure.name ? 'bg-gray-200' : ''}`}
                  onClick={() => setSelectedProcedure(procedure.name)}
                >
                  {procedure.name}
                </Button>
                {selectedProcedure === procedure.name && (
                  <div className="pl-4 space-y-1">
                    {subsections.map((subsection) => (
                      <Button
                        key={subsection}
                        variant="ghost"
                        className={`w-full justify-start ${activeSubsection === subsection ? 'font-bold' : ''}`}
                        onClick={() => setActiveSubsection(subsection)}
                      >
                        {subsection}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

