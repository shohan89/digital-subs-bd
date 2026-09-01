"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

// error.tsx must be a Client Component — Next.js requirement for error boundaries.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
