"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, use } from "react";
import TemplateEditorPage from "../page";
import { useSimulationStore } from "@/stores/simulationStore";
import { templateService } from "@/lib/template-service";

interface TemplatePageProps {
  params: Promise<{ slug: string }>; // In Next.js 15, params is a Promise
}

export default function TemplateByIdPage({ params }: TemplatePageProps) {
  const resolvedParams = use(params); // Unwrap the params Promise
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadTemplate = useSimulationStore(state => state.loadTemplate);
  const currentTemplate = useSimulationStore(state => state.currentTemplate);

  useEffect(() => {
    const loadTemplateBySlug = async () => {
      try {
        setIsLoading(true);
        setError(null);

        console.log(`Dynamic template page: Loading template ID "${resolvedParams.slug}"`);
        console.log(`Current template:`, currentTemplate ? `"${currentTemplate.name}" (ID: ${currentTemplate.id})` : 'none');

        // Check if the current template already matches the ID
        if (currentTemplate && currentTemplate.id === resolvedParams.slug) {
          // Template is already loaded and matches the ID
          console.log(`Template "${resolvedParams.slug}" is already loaded, skipping reload`);
          setIsLoading(false);
          return;
        }

        // Try to load template directly by ID
        try {
          console.log(`Loading template "${resolvedParams.slug}" from storage...`);
          await loadTemplate(resolvedParams.slug);
          console.log(`Successfully loaded template "${resolvedParams.slug}"`);
        } catch (templateError) {
          console.error(`Template "${resolvedParams.slug}" not found:`, templateError);
          setError(`Template "${resolvedParams.slug}" not found`);
          // Redirect to base template editor after showing error briefly
          setTimeout(() => router.push('/template-editor'), 2000);
          return;
        }
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading template by slug:', error);
        setError('Failed to load template');
        setTimeout(() => router.push('/template-editor'), 2000);
      }
    };

    loadTemplateBySlug();
  }, [resolvedParams.slug, loadTemplate, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading template ID "{resolvedParams.slug}"...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">Template Not Found</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <p className="text-sm text-muted-foreground">Redirecting to template editor...</p>
        </div>
      </div>
    );
  }

  return <TemplateEditorPage />;
}