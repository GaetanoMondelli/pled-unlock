"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchFromDb } from "@/utils/api";
import { Star, Eye, Download, Clock, User, Building } from "lucide-react";

interface Template {
  templateId: string;
  name: string;
  description: string;
  category?: string;
  author?: string;
  company?: string;
  rating?: number;
  downloads?: number;
  lastUpdated?: string;
  featured?: boolean;
  tags?: string[];
  complexity?: "Beginner" | "Intermediate" | "Advanced";
}

export default function TemplateMarketplace() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [complexity, setComplexity] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("featured");

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchFromDb();
        const fromDb = data?.procedureTemplates || [];
        if (fromDb.length > 0) {
          // Enhance templates with marketplace data
          const enhancedTemplates = fromDb.map((template: any) => ({
            ...template,
            author: template.author || "Anonymous",
            company: template.company || "Community",
            rating: template.rating || (Math.random() * 2 + 3), // Random rating between 3-5
            downloads: template.downloads || Math.floor(Math.random() * 1000 + 10),
            lastUpdated: template.lastUpdated || new Date().toISOString(),
            featured: template.featured || Math.random() > 0.7,
            tags: template.tags || inferTagsFromTemplate(template),
            complexity: template.complexity || inferComplexity(template),
          }));
          setTemplates(enhancedTemplates);
        } else {
          // Fallback to local public JSON
          const res = await fetch("/pled.json", { cache: "no-store" });
          if (res.ok) {
            const local = await res.json();
            const enhancedTemplates = (local.procedureTemplates || []).map((template: any) => ({
              ...template,
              author: template.author || "Anonymous",
              company: template.company || "Community",
              rating: template.rating || (Math.random() * 2 + 3),
              downloads: template.downloads || Math.floor(Math.random() * 1000 + 10),
              lastUpdated: template.lastUpdated || new Date().toISOString(),
              featured: template.featured || Math.random() > 0.7,
              tags: template.tags || inferTagsFromTemplate(template),
              complexity: template.complexity || inferComplexity(template),
            }));
            setTemplates(enhancedTemplates);
          }
        }
      } catch (e) {
        console.error("Failed to load templates", e);
      }
    };
    load();
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    templates.forEach(t => {
      const cat = t.category || inferCategoryFromName(t.name);
      if (cat) set.add(cat);
    });
    return ["all", ...Array.from(set).sort()];
  }, [templates]);

  const filteredAndSortedTemplates = useMemo(() => {
    let filtered = templates.filter(t => {
      const cat = t.category || inferCategoryFromName(t.name);
      const inCategory = category === "all" || cat === category;
      const inComplexity = complexity === "all" || t.complexity === complexity;
      const matches =
        !query ||
        t.name?.toLowerCase().includes(query.toLowerCase()) ||
        t.description?.toLowerCase().includes(query.toLowerCase()) ||
        t.tags?.some(tag => tag.toLowerCase().includes(query.toLowerCase()));
      return inCategory && inComplexity && matches;
    });

    // Sort templates
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "featured":
          if (a.featured && !b.featured) return -1;
          if (!a.featured && b.featured) return 1;
          return (b.rating || 0) - (a.rating || 0);
        case "popular":
          return (b.downloads || 0) - (a.downloads || 0);
        case "rating":
          return (b.rating || 0) - (a.rating || 0);
        case "recent":
          return new Date(b.lastUpdated || 0).getTime() - new Date(a.lastUpdated || 0).getTime();
        case "name":
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });
  }, [templates, query, category, complexity, sortBy]);

  const featuredTemplates = templates.filter(t => t.featured).slice(0, 3);

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Template Marketplace</h1>
        <p className="text-muted-foreground">
          Discover and use pre-built workflow templates for common business processes
        </p>
      </div>

      <Tabs defaultValue="browse" className="space-y-6">
        <TabsList>
          <TabsTrigger value="browse">Browse All</TabsTrigger>
          <TabsTrigger value="featured">Featured</TabsTrigger>
          <TabsTrigger value="categories">By Category</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Input 
                placeholder="Search templates by name, description, or tags..." 
                value={query} 
                onChange={e => setQuery(e.target.value)} 
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full md:w-56">
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
            <Select value={complexity} onValueChange={setComplexity}>
              <SelectTrigger className="w-full md:w-56">
                <SelectValue placeholder="Complexity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="Beginner">Beginner</SelectItem>
                <SelectItem value="Intermediate">Intermediate</SelectItem>
                <SelectItem value="Advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-56">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="featured">Featured</SelectItem>
                <SelectItem value="popular">Most Popular</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
                <SelectItem value="recent">Recently Updated</SelectItem>
                <SelectItem value="name">Name</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedTemplates.map(template => (
              <TemplateMarketplaceCard key={template.templateId} template={template} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="featured">
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Featured Templates</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {featuredTemplates.map(template => (
                <FeaturedTemplateCard key={template.templateId} template={template} />
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="categories">
          <div className="space-y-8">
            {categories.filter(cat => cat !== "all").map(cat => {
              const categoryTemplates = templates.filter(t => 
                (t.category || inferCategoryFromName(t.name)) === cat
              ).slice(0, 6);
              
              return (
                <div key={cat} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">{capitalize(cat)}</h2>
                    <Button variant="outline" size="sm" onClick={() => setCategory(cat)}>
                      View All
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categoryTemplates.map(template => (
                      <TemplateMarketplaceCard key={template.templateId} template={template} compact />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface TemplateCardProps {
  template: Template;
  compact?: boolean;
}

function TemplateMarketplaceCard({ template, compact = false }: TemplateCardProps) {
  return (
    <Card className="group hover:shadow-lg transition-shadow">
      <CardHeader className={compact ? "pb-2" : "pb-3"}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <CardTitle className={`${compact ? "text-base" : "text-lg"} truncate`}>
              {template.name}
              {template.featured && <Star className="inline ml-1 h-4 w-4 text-yellow-500 fill-current" />}
            </CardTitle>
            {!compact && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <User className="h-3 w-3" />
                <span>{template.author}</span>
                {template.company && (
                  <>
                    <Building className="h-3 w-3 ml-1" />
                    <span>{template.company}</span>
                  </>
                )}
              </div>
            )}
          </div>
          <Badge variant="secondary" className="shrink-0">
            {template.category || inferCategoryFromName(template.name)}
          </Badge>
        </div>
        
        <CardDescription className={`${compact ? "line-clamp-1" : "line-clamp-2"}`}>
          {template.description}
        </CardDescription>
        
        {!compact && template.tags && (
          <div className="flex flex-wrap gap-1 mt-2">
            {template.tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 text-yellow-500 fill-current" />
              <span>{(template.rating || 0).toFixed(1)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Download className="h-3 w-3" />
              <span>{template.downloads}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{template.complexity}</span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Link href={`/templates/${encodeURIComponent(template.templateId)}`}>
            <Button size="sm" variant="outline" className="flex-1">
              <Eye className="h-3 w-3 mr-1" />
              Preview
            </Button>
          </Link>
          <Link href={`/procedures?template=${encodeURIComponent(template.templateId)}`}>
            <Button size="sm" className="flex-1">
              <Download className="h-3 w-3 mr-1" />
              Use Template
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function FeaturedTemplateCard({ template }: { template: Template }) {
  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200">
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <Star className="h-5 w-5 text-yellow-500 fill-current" />
          <Badge variant="secondary">Featured</Badge>
        </div>
        <CardTitle className="text-xl">{template.name}</CardTitle>
        <CardDescription className="line-clamp-3">{template.description}</CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
          <span className="flex items-center gap-1">
            <Star className="h-4 w-4 text-yellow-500 fill-current" />
            {(template.rating || 0).toFixed(1)} rating
          </span>
          <span className="flex items-center gap-1">
            <Download className="h-4 w-4" />
            {template.downloads} downloads
          </span>
        </div>
        
        <div className="flex gap-2">
          <Link href={`/templates/${encodeURIComponent(template.templateId)}`} className="flex-1">
            <Button variant="outline" className="w-full">
              Learn More
            </Button>
          </Link>
          <Link href={`/procedures?template=${encodeURIComponent(template.templateId)}`} className="flex-1">
            <Button className="w-full">
              Use Template
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper functions
function inferCategoryFromName(name?: string) {
  if (!name) return "general";
  const n = name.toLowerCase();
  if (n.includes("hire") || n.includes("employee") || n.includes("hr")) return "hr";
  if (n.includes("contract") || n.includes("sign") || n.includes("agreement")) return "contracts";
  if (n.includes("supply") || n.includes("chain") || n.includes("logistics")) return "supply-chain";
  if (n.includes("carbon") || n.includes("emission") || n.includes("credit")) return "carbon";
  if (n.includes("finance") || n.includes("payment") || n.includes("invoice")) return "finance";
  return "general";
}

function inferTagsFromTemplate(template: any): string[] {
  const tags: string[] = [];
  const text = `${template.name} ${template.description}`.toLowerCase();
  
  if (text.includes("document")) tags.push("document-processing");
  if (text.includes("email")) tags.push("email-workflow");
  if (text.includes("approval")) tags.push("approval-process");
  if (text.includes("sign")) tags.push("e-signature");
  if (text.includes("hire")) tags.push("recruitment");
  if (text.includes("onboard")) tags.push("onboarding");
  if (text.includes("contract")) tags.push("contract-management");
  if (text.includes("review")) tags.push("review-process");
  
  return tags.length > 0 ? tags : ["workflow"];
}

function inferComplexity(template: any): "Beginner" | "Intermediate" | "Advanced" {
  const messageRulesCount = template.messageRules?.length || 0;
  const statesCount = (template.stateMachine?.fsl || "").split(";").filter(Boolean).length;
  
  if (messageRulesCount <= 2 && statesCount <= 4) return "Beginner";
  if (messageRulesCount <= 5 && statesCount <= 8) return "Intermediate";
  return "Advanced";
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, " ");
}