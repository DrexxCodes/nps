"use client";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/States";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return <ErrorState message="Something went wrong on our side. Your data is safe." action={<Button onClick={reset}>Try again</Button>} />;
}
