"use client";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/Button";
import { Checkbox, Input, Select } from "@/components/ui/Field";
import { MAX_VARIANT_SETS, VARIANT_SELECTION_LABELS, VARIANT_SELECTION_MODES } from "@/constants";
import { shortId } from "@/lib/ids";
import type { ItemFormValues } from "@/types/item-form";
import { VariantOptionsEditor } from "./VariantOptionsEditor";

/** Create any number of variable sets (Size, Colour...), each with its own values, single/multiple choice and required flag. */
export function VariantSetsEditor() {
  const { control, register, formState: { errors } } = useFormContext<ItemFormValues>();
  const { fields, append, remove, move } = useFieldArray({ control, name: "variantSets" });
  return (
    <section className="space-y-4" aria-labelledby="variant-sets-title">
      <div>
        <h3 id="variant-sets-title" className="font-display text-base font-bold">Variable sets</h3>
        <p className="text-xs text-[var(--muted)]">Let students choose things like size or colour. Each set has its own values. Choose whether students pick one or several, and whether a set is required. What they pick appears in exported PDFs.</p>
      </div>
      {fields.map((f, i) => (
        <div key={f.id} className="glass space-y-3 rounded-xl p-3.5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Set name" placeholder="e.g. Size" error={errors.variantSets?.[i]?.name?.message} {...register(`variantSets.${i}.name`, { required: "Name this set" })} />
            <Select label="Students can" {...register(`variantSets.${i}.selection`)}>
              {VARIANT_SELECTION_MODES.map((m) => <option key={m} value={m}>{VARIANT_SELECTION_LABELS[m].admin}</option>)}
            </Select>
          </div>
          <VariantOptionsEditor index={i} />
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line)] pt-3">
            <Checkbox label="Students must choose from this set" {...register(`variantSets.${i}.required`)} />
            <div className="flex items-center gap-1">
              <Button type="button" variant="ghost" size="sm" aria-label="Move set up" disabled={i === 0} icon={<ArrowUp className="size-4" />} onClick={() => move(i, i - 1)} />
              <Button type="button" variant="ghost" size="sm" aria-label="Move set down" disabled={i === fields.length - 1} icon={<ArrowDown className="size-4" />} onClick={() => move(i, i + 1)} />
              <Button type="button" variant="ghost" size="sm" icon={<Trash2 className="size-4" />} onClick={() => remove(i)}>Remove set</Button>
            </div>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" icon={<Plus className="size-4" />} disabled={fields.length >= MAX_VARIANT_SETS}
        onClick={() => append({ id: shortId(), name: "", selection: "SINGLE", required: true, options: [] })}>
        Add variable set
      </Button>
    </section>
  );
}
