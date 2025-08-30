"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { ComponentLibrary } from "@/components/ui/component-library";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { COMPONENT_LIBRARY } from "@/lib/StateMachineComponents";
import { CARBON_CREDIT_TEMPLATES } from "@/templates/CarbonCreditTokenizationTemplate";
import { 
  Cpu, 
  Zap, 
  Eye, 
  Download, 
  PlayCircle, 
  Leaf, 
  Settings, 
  GitBranch,
  Activity,
  Database,
  Workflow,
  Code
} from "lucide-react";

export default function ComponentsLabPage() {
  const searchParams = useSearchParams();
  const templateParam = searchParams?.get('template');
  
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(templateParam || null);
  const [previewData, setPreviewData] = useState<any>(null);

  // Simple function to handle carbon template generation
  const generateCarbonTemplate = (templateKey: string) => {
    console.log(`Generating carbon template: ${templateKey}`);
    // Here you would implement the actual template generation logic
  };


  const categoryStats = {
    'data-processing': { count: 1, color: 'bg-blue-100 text-blue-800' },
    'aggregation': { count: 1, color: 'bg-green-100 text-green-800' },
    'splitting': { count: 1, color: 'bg-purple-100 text-purple-800' },
    'carbon-credits': { count: 3, color: 'bg-emerald-100 text-emerald-800' },
    'validation': { count: 1, color: 'bg-orange-100 text-orange-800' },
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Composable State Machine Components Lab</h1>
        <p className="text-muted-foreground text-lg">
          Build complex workflows by composing reusable state machine components. 
          Design once, use everywhere - from IoT data processing to carbon credit tokenization.
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="components">Component Library</TabsTrigger>
          <TabsTrigger value="carbon-demo">Carbon Credits Demo</TabsTrigger>
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
                <CardDescription>
                  Browse components by their functional category
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(categoryStats).map(([category, stats]) => (
                  <div key={category} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={stats.color}>
                        {category.replace('-', ' ')}
                      </Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {stats.count} component{stats.count !== 1 ? 's' : ''}
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
                <CardDescription>
                  Design complex workflows by connecting components
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground mb-4">
                  Use the workflow builder to create custom state machine workflows by connecting individual components.
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1">
                    <GitBranch className="h-4 w-4 mr-1" />
                    Open Builder
                  </Button>
                  <Button variant="outline" className="flex-1">
                    <Eye className="h-4 w-4 mr-1" />
                    View Templates
                  </Button>
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

        <TabsContent value="carbon-demo" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Leaf className="h-5 w-5 text-green-600" />
                  Carbon Credit Templates
                </CardTitle>
                <CardDescription>
                  Ready-to-deploy workflows for different renewable energy sources
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(CARBON_CREDIT_TEMPLATES).map(([key, template]) => {
                  // Access the builder's config property
                  const config = (template as any).config;
                  return (
                    <Card key={key} className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-medium">
                            {key
                              .replace(/_/g, " ")
                              .toLowerCase()
                              .replace(/\b\w/g, l => l.toUpperCase())}
                          </h4>
                          <div className="flex flex-wrap gap-1 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {config?.deviceType.replace("-", " ")}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {config?.tokenStandard} Standard
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {config?.certificateSize} tokens/cert
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => generateCarbonTemplate(key)}>
                            <Eye className="h-3 w-3 mr-1" />
                            Preview
                          </Button>
                          <Button size="sm">
                            <Download className="h-3 w-3 mr-1" />
                            Deploy
                          </Button>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>Conversion: {config?.conversionRate} kWh = 1 credit</div>
                        <div>Aggregation: {config?.aggregationPeriod}</div>
                        <div>Quality threshold: {config?.qualityThreshold}%</div>
                      </div>
                    </Card>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Workflow Visualization
                </CardTitle>
                <CardDescription>
                  Components and data flow in the carbon credit tokenization process
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <Database className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">1. IoT Measurements</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Signed renewable energy measurements from certified devices
                    </p>
                  </div>
                  
                  <div className="flex justify-center">
                    <div className="w-px h-6 bg-gray-300" />
                  </div>
                  
                  <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <Settings className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">2. Validation & Processing</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Cryptographic validation, batch aggregation, and quality control
                    </p>
                  </div>
                  
                  <div className="flex justify-center">
                    <div className="w-px h-6 bg-gray-300" />
                  </div>
                  
                  <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium">3. Token Creation</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Convert validated measurements into individual carbon credit tokens
                    </p>
                  </div>
                  
                  <div className="flex justify-center">
                    <div className="w-px h-6 bg-gray-300" />
                  </div>
                  
                  <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-4 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <GitBranch className="h-4 w-4 text-orange-600" />
                      <span className="text-sm font-medium">4. Certificate Aggregation</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Bundle tokens into tradeable certificates with compliance metadata
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {selectedTemplate && previewData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Generated PLED Template Preview
                </CardTitle>
                <CardDescription>
                  Complete template configuration for {selectedTemplate.replace(/_/g, " ")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto">
                    {JSON.stringify(previewData, null, 2)}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="workflow-builder">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Workflow className="h-5 w-5" />
                Visual Workflow Builder
              </CardTitle>
              <CardDescription>
                Drag and drop components to create custom workflows
              </CardDescription>
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
