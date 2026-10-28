"use client";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function PrintButton() {
  return <Button type="button" variant="outline" icon={<Printer className="size-4" />} onClick={() => window.print()}>Print receipt</Button>;
}
