"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CreateProcedureModal } from "@/components/procedures/CreateProcedureModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { calculateCurrentState } from "@/lib/fsm";
import { fetchFromDb } from "@/utils/api";
import { handleEventAndGenerateMessages } from "@/utils/stateAndMessageHandler";
import { Boxes, Grid2X2, List, PlusCircle } from "lucide-react";

export default function ProceduresPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [instances, setInstances] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const data = await fetchFromDb();
      setTemplates(data.procedureTemplates || []);
      setInstances(data.procedureInstances || []);
    };
    loadData();
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    templates.forEach(t => {
      const cat = (t.category as string) || inferCategoryFromName(t.name);
      if (cat) set.add(cat);
    });
    return ["all", ...Array.from(set).sort()];
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      const cat = (t.category as string) || inferCategoryFromName(t.name);
      const inCategory = category === "all" || cat === category;
      const matches =
        !query ||
        t.name?.toLowerCase().includes(query.toLowerCase()) ||
        t.description?.toLowerCase().includes(query.toLowerCase());
      return inCategory && matches;
    });
  }, [templates, query, category]);

  return (
    <div className="container mx-auto p-6">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-6">
        <h1 className="text-2xl font-bold">Procedures</h1>
        <div className="flex gap-2">
          <Button className="gap-2" onClick={() => setShowCreateModal(true)}>
            <PlusCircle className="h-4 w-4" /> New Procedure
          </Button>
          <Button variant={view === "grid" ? "default" : "outline"} size="sm" onClick={() => setView("grid")}>
            {" "}
            <Grid2X2 className="h-4 w-4" />{" "}
          </Button>
          <Button variant={view === "list" ? "default" : "outline"} size="sm" onClick={() => setView("list")}>
            {" "}
            <List className="h-4 w-4" />{" "}
          </Button>
        </div>
      </div>

      <CreateProcedureModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={async () => {
          const data = await fetchFromDb();
          setTemplates(data.procedureTemplates || []);
          setInstances(data.procedureInstances || []);
        }}
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1">
          <Input placeholder="Search procedures..." value={query} onChange={e => setQuery(e.target.value)} />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map(c => (
              <SelectItem key={c} value={c}>
                {capitalize(c)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className={view === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"}>
        {filteredTemplates.map(template => (
          <TemplateCard key={template.templateId} template={template} instances={instances} view={view} />
        ))}
      </div>
    </div>
  );
}

function TemplateCard({ template, instances, view }: { template: any; instances: any[]; view: "grid" | "list" }) {
  const templateInstances = useMemo(
    () => instances.filter(i => i.templateId === template.templateId),
    [instances, template.templateId],
  );

  return (
    <Card className={view === "grid" ? "" : "p-2"}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base sm:text-lg">{template.name}</CardTitle>
            <CardDescription className="line-clamp-2">{template.description}</CardDescription>
          </div>
          <Badge variant="secondary">{(template.category as string) || inferCategoryFromName(template.name)}</Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Boxes className="h-4 w-4" />
            <span>{templateInstances.length} instances</span>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2">
          {templateInstances.slice(0, 3).map((instance: any) => (
            <InstanceRow key={instance.instanceId} template={template} instance={instance} />
          ))}
          {templateInstances.length > 3 && (
            <Link href={`/procedures?template=${template.templateId}`}>
              <span className="text-xs text-muted-foreground hover:underline">See all...</span>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function InstanceRow({ template, instance }: { template: any; instance: any }) {
  const history = instance.history || {};
  const events = history.events || [];

  let currentState = "idle";
  const generatedMessages: any[] = [];

  for (const event of events) {
    const result = handleEventAndGenerateMessages(
      event,
      template.messageRules || [],
      instance.variables || {},
      currentState,
      template.stateMachine.fsl,
    );
    generatedMessages.push(...result.messages);
    currentState = result.finalState;
  }
  currentState = calculateCurrentState(template.stateMachine.fsl, generatedMessages);

  return (
    <Link
      href={`/procedures/${instance.instanceId}`}
      className="rounded border hover:bg-accent/50 p-2 flex items-center justify-between"
    >
      <div className="text-sm">
        <div className="font-medium truncate">{instance.variables?.name || instance.instanceId}</div>
        <div className="text-xs text-muted-foreground truncate">
          {Object.keys(instance.variables || {})
            .slice(0, 2)
            .join(" · ")}
        </div>
      </div>
      <Badge
        variant={currentState === "idle" ? "secondary" : currentState === "final" ? "destructive" : "success"}
        className="capitalize"
      >
        {currentState}
      </Badge>
    </Link>
  );
}

function inferCategoryFromName(name?: string) {
  if (!name) return "general";
  const n = name.toLowerCase();
  if (n.includes("hire") || n.includes("employee") || n.includes("hr")) return "hr";
  if (n.includes("contract") || n.includes("sign") || n.includes("agreement")) return "contracts";
  if (n.includes("supply") || n.includes("chain") || n.includes("logistics")) return "supply-chain";
  if (n.includes("carbon") || n.includes("emission")) return "carbon";
  return "general";
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, " ");
}
