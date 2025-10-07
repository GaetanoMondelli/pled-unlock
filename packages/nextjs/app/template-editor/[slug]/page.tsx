"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import TemplateEditorPage from "../page";
import { useSimulationStore } from "@/stores/simulationStore";
import { templateService } from "@/lib/template-service";

interface TemplatePageProps {
  params: { slug: string }; // Actually template ID, keeping param name for Next.js routing
}

export default function TemplateByIdPage({ params }: TemplatePageProps) {
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

        console.log(`Dynamic template page: Loading template ID "${params.slug}"`);
        console.log(`Current template:`, currentTemplate ? `"${currentTemplate.name}" (ID: ${currentTemplate.id})` : 'none');

        // Check if the current template already matches the ID
        if (currentTemplate && currentTemplate.id === params.slug) {
          // Template is already loaded and matches the ID
          console.log(`Template "${params.slug}" is already loaded, skipping reload`);
          setIsLoading(false);
          return;
        }

        // Try to load template directly by ID
        try {
          console.log(`Loading template "${params.slug}" from storage...`);
          await loadTemplate(params.slug);
          console.log(`Successfully loaded template "${params.slug}"`);
        } catch (templateError) {
          console.error(`Template "${params.slug}" not found:`, templateError);
          setError(`Template "${params.slug}" not found`);
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
  }, [params.slug, loadTemplate, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading template ID "{params.slug}"...</p>
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