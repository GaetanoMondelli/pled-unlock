"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// Dynamically import the PhotoStillLife component with no SSR
const PhotoStillLifeComponent = dynamic(
  () =>
    import("./PhotoStillLife").catch(() => {
      // Fallback component if import fails
      const FallbackComponent = () => (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-lg">
          <div className="text-center p-8">
            <div className="w-16 h-16 bg-primary/20 rounded-full mx-auto mb-4 flex items-center justify-center">
              <div className="w-8 h-8 bg-primary/40 rounded-full animate-pulse" />
            </div>
            <p className="text-sm text-muted-foreground">Interactive Photo Animation</p>
          </div>
        </div>
      );
      FallbackComponent.displayName = "PhotoStillLifeFallback";
      return FallbackComponent;
    }),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-lg">
        <div className="text-center p-8">
          <div className="w-16 h-16 bg-primary/20 rounded-full mx-auto mb-4 flex items-center justify-center">
            <div className="w-8 h-8 bg-primary/40 rounded-full animate-pulse" />
          </div>
          <p className="text-sm text-muted-foreground">Loading photo animation...</p>
        </div>
      </div>
    ),
  },
);

export default function SafePhotoStillLife() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-lg">
        <div className="text-center p-8">
          <div className="w-16 h-16 bg-primary/20 rounded-full mx-auto mb-4 flex items-center justify-center">
            <div className="w-8 h-8 bg-primary/40 rounded-full animate-pulse" />
          </div>
          <p className="text-sm text-muted-foreground">Initializing...</p>
        </div>
      </div>
    );
  }

  return <PhotoStillLifeComponent />;
}
