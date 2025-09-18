"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import {
  BookOpen,
  Code,
  Database,
  Cpu,
  Layers,
  Target,
  Play,
  Settings,
  Brain,
  Workflow,
  Search,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  Copy,
  Check,
  Download,
  Zap,
  Activity,
  Timer,
  Eye,
  Edit,
  RefreshCw,
  Undo2,
  StepForward,
  Pause,
  FileText,
  GitBranch,
  BarChart3,
  Menu,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  title: string;
  href: string;
  icon?: React.ReactNode;
  children?: NavItem[];
  badge?: string;
}

interface DocSection {
  id: string;
  title: string;
  content: React.ReactNode;
}

const navigation: NavItem[] = [
  {
    title: "Getting Started",
    href: "#getting-started",
    icon: <BookOpen className="h-4 w-4" />,
    children: [
      { title: "Introduction", href: "#introduction" },
      { title: "Quick Start", href: "#quick-start" },
      { title: "Template Editor Overview", href: "#template-editor" },
      { title: "Understanding Modes", href: "#modes" }
    ]
  },
  {
    title: "Node Types",
    href: "#node-types",
    icon: <Workflow className="h-4 w-4" />,
    children: [
      { title: "Data Source", href: "#data-source" },
      { title: "Queue", href: "#queue" },
      { title: "Process Node", href: "#process-node" },
      { title: "Sink", href: "#sink" },
      { title: "Node Library", href: "#node-library" }
    ]
  },
  {
    title: "Configuration",
    href: "#configuration",
    icon: <Settings className="h-4 w-4" />,
    children: [
      { title: "JSON Schema v3.0", href: "#json-schema" },
      { title: "Node Properties", href: "#node-properties" },
      { title: "Interfaces", href: "#interfaces" },
      { title: "Aggregation", href: "#aggregation" },
      { title: "Transformations", href: "#transformations" }
    ]
  },
  {
    title: "AI Assistant",
    href: "#ai-assistant",
    icon: <Brain className="h-4 w-4" />,
    badge: "New",
    children: [
      { title: "Getting Help", href: "#ai-help" },
      { title: "JSON Generation", href: "#ai-json" },
      { title: "Workflow Optimization", href: "#ai-optimization" }
    ]
  },
  {
    title: "Simulation",
    href: "#simulation",
    icon: <Play className="h-4 w-4" />,
    children: [
      { title: "Controls", href: "#simulation-controls" },
      { title: "Monitoring", href: "#monitoring" },
      { title: "State Inspector", href: "#state-inspector" },
      { title: "Performance", href: "#performance" }
    ]
  },
  {
    title: "Examples",
    href: "#examples",
    icon: <FileText className="h-4 w-4" />,
    children: [
      { title: "Basic Workflow", href: "#basic-workflow" },
      { title: "Complex Pipeline", href: "#complex-pipeline" },
      { title: "Multi-Output Processing", href: "#multi-output" }
    ]
  }
];

export default function DocsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState<string[]>(["getting-started"]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState("");

  // Prevent overscroll behavior on the entire document
  React.useEffect(() => {
    document.body.style.overscrollBehavior = 'none';
    document.documentElement.style.overscrollBehavior = 'none';

    return () => {
      document.body.style.overscrollBehavior = '';
      document.documentElement.style.overscrollBehavior = '';
    };
  }, []);

  const toggleSection = (href: string) => {
    const sectionId = href.replace("#", "");
    setExpandedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(id);
      setTimeout(() => setCopiedCode(""), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const NavItem = ({ item, level = 0 }: { item: NavItem; level?: number }) => {
    const hasChildren = item.children && item.children.length > 0;
    const sectionId = item.href.replace("#", "");
    const isExpanded = expandedSections.includes(sectionId);

    return (
      <div>
        <div
          className={cn(
            "flex items-center justify-between py-2 px-3 rounded-lg cursor-pointer transition-colors",
            level === 0 ? "hover:bg-slate-100" : "hover:bg-slate-50",
            level > 0 && "ml-4 text-sm"
          )}
          onClick={() => hasChildren ? toggleSection(item.href) : null}
        >
          <div className="flex items-center space-x-2">
            {item.icon}
            <span className={cn(level === 0 ? "font-medium" : "text-slate-600")}>
              {item.title}
            </span>
            {item.badge && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                {item.badge}
              </Badge>
            )}
          </div>
          {hasChildren && (
            isExpanded ?
              <ChevronDown className="h-4 w-4 text-slate-400" /> :
              <ChevronRight className="h-4 w-4 text-slate-400" />
          )}
        </div>
        {hasChildren && isExpanded && (
          <div className="mt-1 space-y-1">
            {item.children?.map((child, index) => (
              <a
                key={index}
                href={child.href}
                className="block py-2 px-6 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
              >
                {child.title}
              </a>
            ))}
          </div>
        )}
      </div>
    );
  };

  const CodeBlock = ({ code, language = "json", id }: { code: string; language?: string; id: string }) => (
    <div className="relative">
      <div className="flex items-center justify-between bg-slate-800 text-slate-200 px-4 py-2 rounded-t-lg">
        <span className="text-sm font-medium">{language}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => copyToClipboard(code, id)}
          className="h-8 w-8 p-0 text-slate-300 hover:text-white hover:bg-slate-700"
        >
          {copiedCode === id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
      <pre className="bg-slate-900 text-slate-100 p-4 rounded-b-lg overflow-x-auto">
        <code>{code}</code>
      </pre>
    </div>
  );

  return (
    <div className="h-screen bg-slate-900 overflow-hidden" style={{ overscrollBehavior: 'none' }}>
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="bg-white shadow-md"
        >
          {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      <div className="flex h-full" style={{ overscrollBehavior: 'none' }}>
        {/* Sidebar - Fixed */}
        <aside className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-slate-50 border-r border-slate-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:relative lg:z-0",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )} style={{ overscrollBehavior: 'none' }}>
          <div className="h-full flex flex-col" style={{ overscrollBehavior: 'none' }}>
            {/* Header */}
            <div className="p-6 border-b border-slate-200 flex-shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <BookOpen className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h1 className="font-semibold text-slate-900">Docs</h1>
                  <p className="text-xs text-slate-500">Workflow Simulation</p>
                </div>
              </div>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-slate-200 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search docs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white"
                />
              </div>
            </div>

            {/* Navigation */}
            <ScrollArea className="flex-1 p-4" style={{ overscrollBehavior: 'none' }}>
              <nav className="space-y-2">
                {navigation.map((item, index) => (
                  <NavItem key={index} item={item} />
                ))}
              </nav>
            </ScrollArea>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 flex-shrink-0">
              <div className="text-center">
                <Badge variant="outline" className="text-blue-600 border-blue-200">
                  Schema v3.0
                </Badge>
                <div className="mt-2 space-y-1">
                  <Link href="/template-editor">
                    <Button variant="outline" size="sm" className="w-full text-xs">
                      <Workflow className="mr-2 h-3 w-3" />
                      Open Editor
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile Overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Main Content - Scrollable */}
        <main className="flex-1 overflow-y-auto bg-white lg:ml-0" style={{ overscrollBehavior: 'none' }}>
          <div className="bg-white">
            <div className="max-w-4xl mx-auto px-6 py-8 lg:px-8">
            {/* Introduction */}
            <section id="introduction" className="mb-12">
              <div className="mb-6">
                <h1 className="text-4xl font-bold text-slate-900 mb-4">
                  Workflow Simulation Documentation
                </h1>
                <p className="text-xl text-slate-600">
                  Learn how to build, configure, and simulate complex data processing workflows
                  using the Template Editor and JSON Schema v3.0.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Zap className="h-5 w-5 text-blue-600" />
                      </div>
                      <h3 className="font-semibold text-slate-900">Quick Start</h3>
                    </div>
                    <p className="text-sm text-slate-600">
                      Get up and running in minutes with our step-by-step guide.
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-emerald-200 bg-emerald-50">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                        <Brain className="h-5 w-5 text-emerald-600" />
                      </div>
                      <h3 className="font-semibold text-slate-900">AI Powered</h3>
                    </div>
                    <p className="text-sm text-slate-600">
                      Built-in AI assistant helps with workflow design and optimization.
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-purple-200 bg-purple-50">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Activity className="h-5 w-5 text-purple-600" />
                      </div>
                      <h3 className="font-semibold text-slate-900">Real-time</h3>
                    </div>
                    <p className="text-sm text-slate-600">
                      Watch your workflows execute with live monitoring and controls.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Quick Start */}
            <section id="quick-start" className="mb-12">
              <h2 className="text-3xl font-bold text-slate-900 mb-6">Quick Start</h2>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
                      <span>Open Template Editor</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-600 mb-4">
                      Navigate to the Template Editor to start building your workflows. The editor provides
                      both visual editing and live simulation capabilities.
                    </p>
                    <Link href="/template-editor">
                      <Button className="bg-blue-600 hover:bg-blue-700">
                        <Workflow className="mr-2 h-4 w-4" />
                        Open Template Editor
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
                      <span>Choose Your Mode</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-600 mb-4">
                      The Template Editor has two modes: Edit mode for configuration and Simulation mode for execution.
                    </p>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <Edit className="h-4 w-4 text-blue-600" />
                          <h4 className="font-medium text-blue-900">Edit Mode</h4>
                        </div>
                        <ul className="text-sm text-blue-700 space-y-1">
                          <li>• JSON configuration editing</li>
                          <li>• Node library access</li>
                          <li>• Workflow design</li>
                        </ul>
                      </div>
                      <div className="bg-emerald-50 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <Play className="h-4 w-4 text-emerald-600" />
                          <h4 className="font-medium text-emerald-900">Simulation Mode</h4>
                        </div>
                        <ul className="text-sm text-emerald-700 space-y-1">
                          <li>• Live execution</li>
                          <li>• Real-time monitoring</li>
                          <li>• Interactive controls</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
                      <span>Create Your First Workflow</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-600 mb-4">
                      Start with a basic workflow using the default scenario or create your own:
                    </p>
                    <CodeBlock
                      id="basic-workflow"
                      code={`{
  "version": "3.0",
  "nodes": [
    {
      "nodeId": "DataSource_A",
      "displayName": "Source A",
      "position": { "x": 100, "y": 100 },
      "type": "DataSource",
      "interval": 3,
      "outputs": [{
        "name": "output",
        "destinationNodeId": "Sink_B",
        "destinationInputName": "input",
        "interface": {
          "type": "SimpleValue",
          "requiredFields": ["data.value"]
        }
      }],
      "generation": {
        "type": "random",
        "valueMin": 1,
        "valueMax": 10
      }
    },
    {
      "nodeId": "Sink_B",
      "displayName": "Sink B",
      "position": { "x": 400, "y": 100 },
      "type": "Sink",
      "inputs": [{
        "name": "input",
        "interface": {
          "type": "Any",
          "requiredFields": ["metadata.timestamp"]
        },
        "required": true
      }]
    }
  ]
}`}
                    />
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Template Editor Overview */}
            <section id="template-editor" className="mb-12">
              <h2 className="text-3xl font-bold text-slate-900 mb-6">Template Editor Overview</h2>

              <Card className="mb-6">
                <CardContent className="p-6">
                  <p className="text-slate-600 mb-6">
                    The Template Editor is a sophisticated visual interface that combines intuitive workflow design
                    with powerful simulation capabilities. It features a dual-mode interface, AI assistance, and
                    comprehensive monitoring tools.
                  </p>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-3">Key Features</h4>
                      <ul className="space-y-2 text-sm text-slate-600">
                        <li className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span>Dual-mode interface (Edit/Simulation)</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                          <span>Real-time workflow visualization</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                          <span>AI-powered assistance</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                          <span>JSON configuration editor</span>
                        </li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-3">Control Panel</h4>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2 text-sm">
                          <Play className="h-4 w-4 text-emerald-600" />
                          <span className="text-slate-600">Play/Pause simulation</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm">
                          <StepForward className="h-4 w-4 text-blue-600" />
                          <span className="text-slate-600">Step-by-step execution</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm">
                          <Undo2 className="h-4 w-4 text-purple-600" />
                          <span className="text-slate-600">Undo/Redo operations</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm">
                          <Activity className="h-4 w-4 text-orange-600" />
                          <span className="text-slate-600">State inspector</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Node Types */}
            <section id="node-types" className="mb-12">
              <h2 className="text-3xl font-bold text-slate-900 mb-6">Node Types</h2>

              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                        <Database className="h-4 w-4 text-emerald-600" />
                      </div>
                      <span>Data Source</span>
                    </CardTitle>
                    <CardDescription>
                      Generates data tokens at configurable intervals
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <h5 className="font-medium text-slate-900 mb-2">Configuration</h5>
                        <ul className="text-sm text-slate-600 space-y-1">
                          <li>• <code className="bg-slate-100 px-1 rounded">interval</code>: Generation frequency</li>
                          <li>• <code className="bg-slate-100 px-1 rounded">generation</code>: Value generation method</li>
                          <li>• <code className="bg-slate-100 px-1 rounded">outputs</code>: Connection definitions</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Layers className="h-4 w-4 text-blue-600" />
                      </div>
                      <span>Queue</span>
                    </CardTitle>
                    <CardDescription>
                      Buffers tokens and performs aggregation operations
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <h5 className="font-medium text-slate-900 mb-2">Configuration</h5>
                        <ul className="text-sm text-slate-600 space-y-1">
                          <li>• <code className="bg-slate-100 px-1 rounded">capacity</code>: Maximum queue size</li>
                          <li>• <code className="bg-slate-100 px-1 rounded">aggregation</code>: Sum, average, etc.</li>
                          <li>• <code className="bg-slate-100 px-1 rounded">trigger</code>: Time or count based</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Cpu className="h-4 w-4 text-purple-600" />
                      </div>
                      <span>Process Node</span>
                    </CardTitle>
                    <CardDescription>
                      Transforms data and routes to multiple outputs
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <h5 className="font-medium text-slate-900 mb-2">Configuration</h5>
                        <ul className="text-sm text-slate-600 space-y-1">
                          <li>• <code className="bg-slate-100 px-1 rounded">inputs</code>: Multiple input definitions</li>
                          <li>• <code className="bg-slate-100 px-1 rounded">outputs</code>: Multiple output routes</li>
                          <li>• <code className="bg-slate-100 px-1 rounded">transformation</code>: Formula-based</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                        <Target className="h-4 w-4 text-red-600" />
                      </div>
                      <span>Sink</span>
                    </CardTitle>
                    <CardDescription>
                      Final destination for processed tokens
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <h5 className="font-medium text-slate-900 mb-2">Configuration</h5>
                        <ul className="text-sm text-slate-600 space-y-1">
                          <li>• <code className="bg-slate-100 px-1 rounded">inputs</code>: Input interface definition</li>
                          <li>• <code className="bg-slate-100 px-1 rounded">required</code>: Input validation</li>
                          <li>• Automatic logging and monitoring</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* AI Assistant */}
            <section id="ai-assistant" className="mb-12">
              <h2 className="text-3xl font-bold text-slate-900 mb-6">
                AI Assistant
                <Badge variant="secondary" className="ml-2 text-xs">New</Badge>
              </h2>

              <Card>
                <CardContent className="p-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-3">Capabilities</h4>
                      <ul className="space-y-2 text-sm text-slate-600">
                        <li className="flex items-center space-x-2">
                          <Brain className="h-4 w-4 text-purple-600" />
                          <span>Intelligent workflow suggestions</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <Code className="h-4 w-4 text-blue-600" />
                          <span>Automatic JSON generation</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <Zap className="h-4 w-4 text-orange-600" />
                          <span>Performance optimization tips</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-green-600" />
                          <span>Documentation and examples</span>
                        </li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-3">Integration</h4>
                      <p className="text-sm text-slate-600 mb-3">
                        The AI assistant is seamlessly integrated into the Template Editor,
                        providing contextual help and automatic workflow improvements.
                      </p>
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                        <p className="text-sm text-purple-700">
                          <strong>Pro Tip:</strong> Use the AI assistant to generate complex
                          workflow configurations and optimize performance automatically.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Configuration */}
            <section id="json-schema" className="mb-12">
              <h2 className="text-3xl font-bold text-slate-900 mb-6">JSON Schema v3.0</h2>

              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Schema Overview</CardTitle>
                  <CardDescription>
                    The v3.0 schema introduces enhanced interface definitions and improved node configurations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CodeBlock
                    id="schema-overview"
                    code={`{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "DocuSign Unlocked Template Schema v3.0",
  "type": "object",
  "required": ["version", "nodes"],
  "properties": {
    "version": {
      "type": "string",
      "const": "3.0"
    },
    "nodes": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["nodeId", "displayName", "position", "type"],
        "properties": {
          "nodeId": { "type": "string" },
          "displayName": { "type": "string" },
          "position": {
            "type": "object",
            "properties": {
              "x": { "type": "number" },
              "y": { "type": "number" }
            },
            "required": ["x", "y"]
          },
          "type": {
            "enum": ["DataSource", "Queue", "ProcessNode", "Sink"]
          }
        }
      }
    }
  }
}`}
                  />
                </CardContent>
              </Card>
            </section>
            </div>

            {/* Footer */}
            <footer className="bg-slate-900 text-white py-12 mt-16">
              <div className="max-w-4xl mx-auto px-6 lg:px-8">
                <div className="grid md:grid-cols-3 gap-8">
                  <div>
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                        <BookOpen className="h-4 w-4 text-white" />
                      </div>
                      <h3 className="font-semibold">DocuSign Unlocked</h3>
                    </div>
                    <p className="text-slate-400 text-sm">
                      Advanced workflow simulation platform with AI-powered assistance and real-time monitoring.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-4">Documentation</h4>
                    <ul className="space-y-2 text-sm text-slate-400">
                      <li><a href="#getting-started" className="hover:text-white transition-colors">Getting Started</a></li>
                      <li><a href="#node-types" className="hover:text-white transition-colors">Node Types</a></li>
                      <li><a href="#configuration" className="hover:text-white transition-colors">Configuration</a></li>
                      <li><a href="#ai-assistant" className="hover:text-white transition-colors">AI Assistant</a></li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-4">Tools</h4>
                    <ul className="space-y-2 text-sm text-slate-400">
                      <li>
                        <Link href="/template-editor" className="hover:text-white transition-colors">
                          Template Editor
                        </Link>
                      </li>
                      <li><a href="#json-schema" className="hover:text-white transition-colors">JSON Schema</a></li>
                      <li><a href="#examples" className="hover:text-white transition-colors">Examples</a></li>
                    </ul>
                  </div>
                </div>

                <div className="border-t border-slate-800 mt-8 pt-8 flex items-center justify-between">
                  <p className="text-slate-400 text-sm">
                    Schema v3.0 • Built with modern workflow simulation
                  </p>
                  <Badge variant="outline" className="border-slate-700 text-slate-300">
                    Latest Version
                  </Badge>
                </div>
              </div>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}