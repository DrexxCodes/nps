"use client";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { FormProvider, useFieldArray, useForm } from "react-hook-form";
import { AdvancedConfig } from "@/components/admin/advanced/AdvancedConfig";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { ITEM_STATUSES, NFC_FIELDS, REQUIREMENT_LABELS, REQUIREMENT_TYPES } from "@/constants";
import { api } from "@/lib/client/api";
import { shortId } from "@/lib/ids";
import { blankClassPrices, classYearList, emptyItemValues, toFormValues, toItemPayload, variantSetsProblem } from "@/lib/item-form";
import type { Item, ItemStatus, NfcField } from "@/types";
import type { ItemFormValues } from "@/types/item-form";

const NFC_LABEL: Record<NfcField, string> = { PROFILE_URL: "Public profile URL", ADMISSION_NUMBER: "Admission number", EMAIL: "Email", PHONE: "Phone", ACADEMIC_YEAR: "Academic year" };
const STATUS_LABEL: Record<ItemStatus, string> = { DRAFT: "Draft", SCHEDULED: "Scheduled", ACTIVE: "Active", PAUSED: "Paused", ENDED: "Ended", SUSPENDED: "Suspended", ARCHIVED: "Archived" };

/** `courseYears` = the platform's course duration; it decides how many classes the class-pricing editor offers. */
export function ItemForm({ item, courseYears }: { item?: Item; courseYears: number }) {
  const router = useRouter();
  const toast = useToast();
  const years = useMemo(() => classYearList(courseYears, item), [courseYears, item]);
  const form = useForm<ItemFormValues>({ defaultValues: item ? toFormValues(item, years) : emptyItemValues(years) });
  const { register, control, handleSubmit, watch, setValue, formState: { isSubmitting, errors } } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "subItems" });
  const w = watch();
  const list = <T extends string>(key: "requiredProfileFields" | "nfcPayloadFields", v: T) => { const cur = (w[key] as string[]); setValue(key, (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]) as never); };

  const onSubmit = handleSubmit(async (v) => {
    const problem = variantSetsProblem(v.variantSets);
    if (problem) return toast("error", problem);
    const body = toItemPayload(v);
    const res = item ? await api(`/api/admin/items/${item.id}`, { method: "PATCH", json: body }) : await api<{ id: string }>("/api/admin/items", { method: "POST", json: body });
    if (!res.ok) return toast("error", Object.values(res.fields ?? {})[0] ?? res.message);
    toast("success", item ? "Item updated" : "Item created");
    router.push(item ? "/admin/items" : `/admin/items/${(res as unknown as { id: string }).id}`);
    router.refresh();
  });

  return (
    <FormProvider {...form}>
      <form suppressHydrationWarning onSubmit={onSubmit} className="max-w-2xl space-y-5 lg:grid lg:max-w-none lg:grid-cols-2 lg:items-start lg:gap-5 lg:space-y-0">
        <div className="space-y-5">
          <Card className="space-y-4">
            <Input label="Item name" error={errors.name?.message} {...register("name", { required: "Enter a name" })} />
            <Textarea label="Description" {...register("description")} />
            <Select label="Status" {...register("status")} disabled={item?.status === "SUSPENDED"}>{ITEM_STATUSES.filter((s) => s !== "SUSPENDED").map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</Select>
            <div className="grid gap-4 sm:grid-cols-2"><Input label="Opens" type="datetime-local" {...register("startAt")} /><Input label="Closes" type="datetime-local" {...register("endAt")} /></div>
          </Card>

          <Card className="space-y-4">
            <h2 className="font-display text-lg font-bold">Pricing</h2>
            <Checkbox label="This item has sub-items (a bundle)" {...register("hasSubItems")} />
            {!w.hasSubItems ? (
              <Input label="Initial price (₦)" type="number" min={0} step="0.01" hint={w.classPricingEnabled ? "Paid by every class that has no price of its own in Advanced configuration." : undefined} {...register("priceNaira", { valueAsNumber: true })} />
            ) : (
              <div className="space-y-3">
                {fields.map((f, i) => (
                  <div key={f.id} className="glass space-y-2 rounded-xl p-3">
                    <div className="grid gap-3 sm:grid-cols-2"><Input label="Name" {...register(`subItems.${i}.name`, { required: true })} /><Input label="Initial price (₦)" type="number" min={0} step="0.01" {...register(`subItems.${i}.priceNaira`, { valueAsNumber: true })} /></div>
                    <Input label="Description" {...register(`subItems.${i}.description`)} />
                    <div className="flex items-center justify-between"><Checkbox label="Required" {...register(`subItems.${i}.required`)} /><Button type="button" variant="ghost" size="sm" icon={<Trash2 className="size-4" />} onClick={() => remove(i)}>Remove</Button></div>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" icon={<Plus className="size-4" />} onClick={() => append({ id: shortId(), name: "", description: "", priceNaira: 0, required: false, classPrices: blankClassPrices(years) })}>Add sub-item</Button>
              </div>
            )}
            <p className="text-xs text-[var(--muted)]">Platform fees are set by a Super Admin and added at checkout. Totals are always recalculated on the server.</p>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="space-y-3">
            <h2 className="font-display text-lg font-bold">Student requirements</h2>
            {REQUIREMENT_TYPES.map((r) => <Checkbox key={r} label={REQUIREMENT_LABELS[r]} checked={w.requiredProfileFields.includes(r)} onChange={() => list("requiredProfileFields", r)} />)}
          </Card>

          <Card className="space-y-3">
            <h2 className="font-display text-lg font-bold">Collection</h2>
            <Checkbox label="This is a physical item that students collect" {...register("physical")} />
            {!w.physical && <p className="rounded-xl bg-[var(--accent-soft)] p-3 text-sm">No collection needed (dues, fees, registrations). Students only see that they have paid. There are no batches, pickup or NFC, and you can export the paid orders from the Exports tab whenever you need them.</p>}
          </Card>

          {w.physical && <Card className="space-y-4">
            <h2 className="font-display text-lg font-bold">Batches</h2>
            <Checkbox label="Process in batches" {...register("batchProcessingEnabled")} />
            {w.batchProcessingEnabled && <>
              <Input label="Orders per batch" type="number" min={1} {...register("batchSize", { valueAsNumber: true })} />
              <Checkbox label="Limit the number of batches" {...register("batchLimitEnabled")} />
              {w.batchLimitEnabled && <Input label="Maximum batches" type="number" min={1} {...register("maxBatches", { valueAsNumber: true })} />}
            </>}
          </Card>}

          {w.physical && <Card className="space-y-3">
            <h2 className="font-display text-lg font-bold">NFC</h2>
            <Checkbox label="This item needs NFC card encoding" {...register("nfcEnabled")} />
            {w.nfcEnabled && NFC_FIELDS.map((f) => <Checkbox key={f} label={NFC_LABEL[f]} checked={w.nfcPayloadFields.includes(f)} onChange={() => list("nfcPayloadFields", f)} />)}
            {w.nfcEnabled && <p className="text-xs text-[var(--muted)]">The profile URL is the recommended default. Never encode sensitive details you don't need.</p>}
          </Card>}
        </div>

        <div className="lg:col-span-2"><AdvancedConfig years={years} /></div>
        <div className="lg:col-span-2"><Button type="submit" loading={isSubmitting}>{item ? "Save item" : "Create item"}</Button></div>
      </form>
    </FormProvider>
  );
}
