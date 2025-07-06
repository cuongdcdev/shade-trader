"use client";

import { useEffect } from 'react';

// This component is deprecated and is no longer needed.
// The order processor now runs as a separate backend service using:
// npm run orders:process
// 
// This component is kept for reference and will be removed in a future update.

export default function OrderProcessorInitializer() {
  useEffect(() => {
    // Log information about the new approach
    console.log('Order processor is now a separate service. Use npm run orders:process to start it.');
  }, []);

  // This component doesn't render anything
  return null;
}
