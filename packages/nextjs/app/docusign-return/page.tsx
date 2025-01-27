"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function DocuSignReturn() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const event = searchParams.get("event");
    if (event === "signing_complete") {
      // Close the window/redirect
      if (window.opener) {
        window.opener.postMessage({ type: "DOCUSIGN_SIGNING_COMPLETE" }, "*");
        window.close();
      } else {
        router.push("/");
      }
    }
  }, [router, searchParams]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Processing...</h1>
        <p>Please wait while we complete the signing process.</p>
      </div>
    </div>
  );
}
