/* eslint-disable */
import Image from "next/image";
import Link from "next/link";
import templates from "@/lib/templates.json";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StateMachineDiagram } from "@/components/state-machine-diagram";

export default function TemplatesPage() {
  return (
    <div className="container mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Templates</h1>
        <Link href="/">
          <Button variant="outline">Back to Home</Button>
        </Link>
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        {templates.map(t => (
          <Link key={t.id} href={`/templates/${t.id}`}>
            <Card className="hover:-translate-y-0.5 transition-transform cursor-pointer">
              <CardHeader>
                <CardTitle>{t.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative h-28 w-full overflow-hidden rounded-md mb-3">
                  <Image src={t.coverImage} alt={t.title} fill className="object-cover" />
                </div>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-3">{t.description}</p>
                <div className="rounded-md border bg-muted/30 p-2">
                  <StateMachineDiagram definition={t.stateMachineDefinition} height={130} />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
