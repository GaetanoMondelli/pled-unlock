"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ComponentLibrary } from "@/components/ui/component-library";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { COMPONENT_LIBRARY } from "@/lib/StateMachineComponents";
import { Activity, Cpu, Eye, GitBranch, Workflow, Zap } from "lucide-react";

export default function ComponentsLabPage() {
  const categoryStats = {
    "data-processing": { count: 1, color: "bg-blue-100 text-blue-800" },
    aggregation: { count: 1, color: "bg-green-100 text-green-800" },
    splitting: { count: 1, color: "bg-purple-100 text-purple-800" },
    "carbon-credits": { count: 3, color: "bg-emerald-100 text-emerald-800" },
    validation: { count: 1, color: "bg-orange-100 text-orange-800" },
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Composable State Machine Components Lab</h1>
        <p className="text-muted-foreground text-lg">
          Build complex workflows by composing reusable state machine components. Design once, use everywhere - from IoT
          data processing to carbon credit tokenization.
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="components">Component Library</TabsTrigger>
          <TabsTrigger value="workflow-builder">Workflow Builder</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Components</CardTitle>
                <Cpu className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Object.keys(COMPONENT_LIBRARY).length}</div>
                <p className="text-xs text-muted-foreground">Ready-to-use components</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Categories</CardTitle>
                <GitBranch className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Object.keys(categoryStats).length}</div>
                <p className="text-xs text-muted-foreground">Component categories</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Workflow Templates</CardTitle>
                <Workflow className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">4</div>
                <p className="text-xs text-muted-foreground">Available in templates section</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Use Cases</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">10+</div>
                <p className="text-xs text-muted-foreground">Supported workflows</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="h-5 w-5" />
                  Component Categories
                </CardTitle>
                <CardDescription>Browse components by their functional category</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(categoryStats).map(([category, stats]) => (
                  <div key={category} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={stats.color}>{category.replace("-", " ")}</Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {stats.count} component{stats.count !== 1 ? "s" : ""}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Workflow className="h-5 w-5 text-blue-600" />
                  Workflow Builder
                </CardTitle>
                <CardDescription>Design complex workflows by connecting components</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground mb-4">
                  Use the workflow builder to create custom state machine workflows by connecting individual components.
                </p>
                <div className="flex gap-2">
                  <Link href="/template-editor" className="flex-1">
                    <Button variant="outline" className="w-full">
                      <GitBranch className="h-4 w-4 mr-1" />
                      Template Editor
                    </Button>
                  </Link>
                  <Link href="/templates" className="flex-1">
                    <Button variant="outline" className="w-full">
                      <Eye className="h-4 w-4 mr-1" />
                      View Templates
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-600" />
                Key Features
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                    <div>
                      <h4 className="font-medium">Composable Architecture</h4>
                      <p className="text-sm text-muted-foreground">
                        Build complex workflows by connecting simple, reusable components
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2" />
                    <div>
                      <h4 className="font-medium">Visual Configuration</h4>
                      <p className="text-sm text-muted-foreground">
                        Configure components with intuitive UI, no coding required
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mt-2" />
                    <div>
                      <h4 className="font-medium">Real-time Compilation</h4>
                      <p className="text-sm text-muted-foreground">
                        Components automatically compile into optimized state machines
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-2" />
                    <div>
                      <h4 className="font-medium">Industry Standards</h4>
                      <p className="text-sm text-muted-foreground">
                        Built-in support for carbon credit standards (VCS, GS, CDM)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-red-500 rounded-full mt-2" />
                    <div>
                      <h4 className="font-medium">IoT Integration</h4>
                      <p className="text-sm text-muted-foreground">
                        Native support for signed IoT measurements and device validation
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2" />
                    <div>
                      <h4 className="font-medium">Audit Trail</h4>
                      <p className="text-sm text-muted-foreground">
                        Complete transparency with immutable event logging
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="components">
          <ComponentLibrary />
        </TabsContent>

        <TabsContent value="workflow-builder">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Workflow className="h-5 w-5" />
                Visual Workflow Builder
              </CardTitle>
              <CardDescription>Drag and drop components to create custom workflows</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[600px] border rounded-lg">
                <ComponentLibrary />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
