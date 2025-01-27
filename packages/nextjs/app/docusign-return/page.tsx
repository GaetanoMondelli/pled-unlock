"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from 'react';
import DocusignReturn from './DocusignReturn';

export default function DocusignReturnPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DocusignReturn />
    </Suspense>
  );
}
