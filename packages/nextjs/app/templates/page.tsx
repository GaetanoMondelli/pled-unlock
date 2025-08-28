"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchFromDb } from "@/utils/api";

export default function TemplatesIndexPage() {
	const [templates, setTemplates] = useState<any[]>([]);
	const [query, setQuery] = useState("");
	const [category, setCategory] = useState<string>("all");

	useEffect(() => {
		const load = async () => {
			try {
				const data = await fetchFromDb();
					const fromDb = data?.procedureTemplates || [];
					if (fromDb.length > 0) {
						setTemplates(fromDb);
					} else {
						// Fallback to local public JSON
						const res = await fetch("/pled.json", { cache: "no-store" });
						if (res.ok) {
							const local = await res.json();
							setTemplates(local.procedureTemplates || []);
						}
					}
			} catch (e) {
				console.error("Failed to load templates", e);
					// Fallback to local public JSON on error
					try {
						const res = await fetch("/pled.json", { cache: "no-store" });
						if (res.ok) {
							const local = await res.json();
							setTemplates(local.procedureTemplates || []);
						}
					} catch (e2) {
						console.error("Also failed to load local pled.json", e2);
					}
			}
		};
		load();
	}, []);

	const categories = useMemo(() => {
		const set = new Set<string>();
		templates.forEach(t => {
			const cat = (t.category as string) || inferCategoryFromName(t.name);
			if (cat) set.add(cat);
		});
		return ["all", ...Array.from(set).sort()];
	}, [templates]);

	const filtered = useMemo(() => {
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
				<h1 className="text-2xl font-bold">Templates</h1>
				<div className="flex gap-2">
					<Link href="/procedures">
						<Button variant="outline">Create from template</Button>
					</Link>
				</div>
			</div>

			<div className="flex flex-col sm:flex-row gap-3 mb-6">
				<div className="flex-1">
					<Input placeholder="Search templates..." value={query} onChange={e => setQuery(e.target.value)} />
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

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{filtered.map(t => (
					<Card key={t.templateId}>
						<CardHeader className="pb-2">
							<div className="flex items-start justify-between gap-2">
								<div>
									<CardTitle className="text-base sm:text-lg">{t.name}</CardTitle>
									<CardDescription className="line-clamp-2">{t.description}</CardDescription>
								</div>
								<Badge variant="secondary">{(t.category as string) || inferCategoryFromName(t.name)}</Badge>
							</div>
						</CardHeader>
						<CardContent className="pt-0">
							<div className="mt-3 flex gap-2">
								<Link href={`/templates/${encodeURIComponent(t.templateId)}`}>
									<Button size="sm" variant="outline">Details</Button>
								</Link>
								<Link href={`/procedures?template=${encodeURIComponent(t.templateId)}`}>
									<Button size="sm">Use this template</Button>
								</Link>
							</div>
						</CardContent>
					</Card>
				))}
			</div>
		</div>
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

