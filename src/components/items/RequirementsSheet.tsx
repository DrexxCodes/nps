"use client";
import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { AdmissionForm } from "@/components/profile/AdmissionForm";
import { BankForm } from "@/components/profile/BankForm";
import { ImageUploader } from "@/components/profile/ImageUploader";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { ERROR_MESSAGES, REQUIREMENT_LABELS } from "@/constants";
import type { RequirementType } from "@/types";

/** Shown when checkout is blocked by missing profile data. Re-checks happen server-side on the retry. */
export function RequirementsSheet({ open, missing, name, onClose, onComplete }: { open: boolean; missing: RequirementType[]; name: string; onClose: () => void; onComplete: () => void }) {
  const [done, setDone] = useState<RequirementType[]>([]);
  const mark = (r: RequirementType) => setDone((d) => [...d, r]);
  const remaining = missing.filter((m) => !done.includes(m));
  return (
    <Sheet open={open} onClose={onClose} title="One more step">
      <p className="mb-5 text-sm text-[var(--muted)]">{ERROR_MESSAGES.PROFILE_REQUIREMENTS_MISSING}</p>
      <div className="space-y-6">
        {missing.map((r) => (
          <section key={r} aria-label={REQUIREMENT_LABELS[r]}>
            <h3 className="mb-2 flex items-center gap-2 font-semibold">{done.includes(r) && <CheckCircle2 className="size-5 text-[var(--accent)]" />}{REQUIREMENT_LABELS[r]}</h3>
            {!done.includes(r) && r === "PROFILE_PICTURE" && <ImageUploader name={name} onDone={() => mark(r)} />}
            {!done.includes(r) && r === "ADMISSION_NUMBER" && <AdmissionForm onDone={() => mark(r)} />}
            {!done.includes(r) && r === "BANK_ACCOUNT" && <BankForm onDone={() => mark(r)} />}
          </section>
        ))}
      </div>
      <Button className="mt-6 w-full" disabled={remaining.length > 0} onClick={onComplete}>Continue to payment</Button>
    </Sheet>
  );
}
