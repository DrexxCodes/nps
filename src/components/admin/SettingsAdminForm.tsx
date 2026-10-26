"use client";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Checkbox, Input, Select } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/client/api";
import { computePricing, formatNaira, nairaToKobo } from "@/lib/money";
import type { PlatformSettings } from "@/types";

interface V { enrollmentOpen: boolean; courseDurationYears: string; academicSessionStartMonth: number; schoolTimezone: string; platformFeeEnabled: boolean; platformFeePercentage: number; flatNaira: number }

const SAMPLE_SUBTOTAL_KOBO = 1_000_000; // ₦10,000, only used for the live preview

export function SettingsAdminForm({ settings }: { settings: PlatformSettings }) {
  const toast = useToast();
  const router = useRouter();
  const { register, handleSubmit, watch, formState: { isSubmitting } } = useForm<V>({ defaultValues: { ...settings, courseDurationYears: String(settings.courseDurationYears), flatNaira: settings.platformFeeFlatKobo / 100 } });
  const feeOn = watch("platformFeeEnabled");
  const pct = Number(watch("platformFeePercentage")) || 0;
  const flat = Number(watch("flatNaira")) || 0;
  const preview = computePricing(SAMPLE_SUBTOTAL_KOBO, { version: 0, enabled: feeOn, percentage: pct, flatKobo: nairaToKobo(flat) });
  const onSubmit = handleSubmit(async (v) => {
    const r = await api("/api/admin/settings", { method: "PATCH", json: { enrollmentOpen: v.enrollmentOpen, courseDurationYears: Number(v.courseDurationYears), academicSessionStartMonth: Number(v.academicSessionStartMonth), schoolTimezone: v.schoolTimezone, platformFeeEnabled: v.platformFeeEnabled, platformFeePercentage: Number(v.platformFeePercentage), platformFeeFlatKobo: Math.round(Number(v.flatNaira) * 100) } });
    if (r.ok) { toast("success", "Settings saved"); router.refresh(); } else toast("error", Object.values(r.fields ?? {})[0] ?? r.message);
  });
  return (
    <form onSubmit={onSubmit} className="w-full space-y-5">
      {/* One column on phones, two side by side from lg up so the page uses the full width instead of hugging the left edge. */}
      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <Card className="space-y-4 lg:p-6">
          <div>
            <h2 className="font-display text-lg font-bold">Enrollment and academics</h2>
            <p className="mt-0.5 text-sm text-[var(--muted)]">Who can sign up, and how academic years are worked out.</p>
          </div>
          <Checkbox label="Enrollment is open" {...register("enrollmentOpen")} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Course duration" {...register("courseDurationYears")}>{[4, 5, 6].map((y) => <option key={y} value={y}>{y} years</option>)}</Select>
            <Input label="Session starts in month (1-12)" type="number" min={1} max={12} {...register("academicSessionStartMonth", { valueAsNumber: true })} />
          </div>
          <Input label="School timezone" {...register("schoolTimezone")} />
        </Card>

        <Card className="space-y-4 lg:p-6">
          <div>
            <h2 className="font-display text-lg font-bold">Platform fee</h2>
            <p className="mt-0.5 text-sm text-[var(--muted)]">Added on top of the item subtotal at checkout.</p>
          </div>
          <Checkbox label="Charge a platform fee at checkout" {...register("platformFeeEnabled")} />
          {feeOn && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Percentage (%)" type="number" step="0.01" min={0} max={20} {...register("platformFeePercentage", { valueAsNumber: true })} />
                <Input label="Flat fee (₦)" type="number" step="0.01" min={0} {...register("flatNaira", { valueAsNumber: true })} />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[var(--accent-soft)] px-4 py-3 text-sm">
                <span className="text-[var(--muted)]">Preview on a {formatNaira(SAMPLE_SUBTOTAL_KOBO)} item</span>
                <span className="font-semibold">Fee {formatNaira(preview.platformFeeKobo)} · Total {formatNaira(preview.totalKobo)}</span>
              </div>
            </>
          )}
          <p className="text-xs text-[var(--muted)]">The fee is calculated on the item subtotal and shown to students as &quot;Platform fee&quot;. It is not Paystack&apos;s own charge. Changes apply only to new payments.</p>
        </Card>
      </div>
      <div className="flex lg:justify-end"><Button type="submit" loading={isSubmitting} className="w-full sm:w-auto">Save settings</Button></div>
    </form>
  );
}
