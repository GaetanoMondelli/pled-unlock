import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import pledData from "@/public/pled.json";

interface Procedure {
  id: string;
  name: string;
  events: Array<{
    eventId: string;
    timestamp: string;
    content: string;
    description: string;
    link: string;
  }>;
  messages: Array<{
    messageId: string;
    title: string;
    timestamp: string;
    events: string[];
    messageContent: string;
    eventIds: string[];
  }>;
  messageRules: any[];
  stateMachineDefinition: string;
}

export default function Home() {
  const procedures = pledData.procedures;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Available Procedures</h1>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Procedure
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {procedures.map((procedure: Procedure) => (
          <Link 
            href={`/procedures/${procedure.id}`} 
            key={procedure.id}
            className="block hover:opacity-80 transition-opacity"
          >
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">{procedure.name}</h3>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {`${procedure.events.length} events, ${procedure.messages.length} messages`}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
