"use client";

import { useEffect, useState } from "react";

export function ServerWarmup() {
  const [warmingUp, setWarmingUp] = useState(false);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const checkHealth = async () => {
      // If we don't get a response in 1 second, show the toast
      timeoutId = setTimeout(() => {
        setWarmingUp(true);
        setShowToast(true);
      }, 1000);

      try {
        const url = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const response = await fetch(`${url}/health`);
        if (response.ok) {
          clearTimeout(timeoutId);
          setWarmingUp(false);
          // Hide toast after a short delay if it was shown
          setTimeout(() => setShowToast(false), 2000);
        }
      } catch (err) {
        // Ignored, backend is likely still booting
      }
    };

    checkHealth();

    return () => clearTimeout(timeoutId);
  }, []);

  if (!showToast) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-blue-600 text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 animate-in slide-in-from-bottom-5">
      {warmingUp ? (
        <>
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <span className="font-medium text-sm">⚡ Warming up backend server...</span>
        </>
      ) : (
        <>
          <span className="text-xl">✅</span>
          <span className="font-medium text-sm">Server is ready!</span>
        </>
      )}
    </div>
  );
}
