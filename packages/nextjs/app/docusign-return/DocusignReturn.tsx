'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export default function DocusignReturn() {
  const searchParams = useSearchParams();

  useEffect(() => {
    // Handle the return logic here
    const code = searchParams?.get('code');
    const state = searchParams?.get('state');
    
    // Add your return logic here
    
  }, [searchParams]);

  return <div>Processing DocuSign authentication...</div>;
} 