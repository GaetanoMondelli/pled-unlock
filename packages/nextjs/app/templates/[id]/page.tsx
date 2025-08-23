/* eslint-disable */
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import templates from "@/lib/templates.json";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StateMachineDiagram } from "@/components/state-machine-diagram";

export default function TemplateDetail({ params }: { params: { id: string } }) {
  const tpl = templates.find(t => t.id === params.id);
  if (!tpl) return notFound();

  return (
    <div className="container mx-auto px-6 py-10">
      <Link href="/templates">
        <Button variant="outline" className="mb-4">
          Back to Templates
        </Button>
      </Link>
      <div className="grid lg:grid-cols-2 gap-8 items-start">
        <div>
          <div className="relative h-64 w-full overflow-hidden rounded-xl border">
            <Image src={tpl.coverImage} alt={tpl.title} fill className="object-cover" />
          </div>
          <h1 className="text-2xl font-bold mt-4">{tpl.title}</h1>
          <p className="text-muted-foreground mt-2">{tpl.description}</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>State Machine</CardTitle>
          </CardHeader>
          <CardContent>
            <StateMachineDiagram definition={tpl.stateMachineDefinition} height={240} />
            <div className="mt-4">
              <h3 className="font-medium mb-1">Definition</h3>
              <pre className="text-xs whitespace-pre-wrap rounded-md border bg-muted/30 p-3">{tpl.stateMachineDefinition}</pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
