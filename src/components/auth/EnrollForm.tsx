"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, GraduationCap, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Checkbox, Input } from "@/components/ui/Field";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { ERROR_MESSAGES } from "@/constants";
import { validateAdmissionNumber } from "@/lib/admission";
import { api } from "@/lib/client/api";
import { signInAndCreateSession } from "@/lib/client/session";
import { enrollmentSchema } from "@/lib/validation/schemas";
import type { AdmissionType } from "@/types";

type Values = z.input<typeof enrollmentSchema>;
const TYPES: { id: AdmissionType; title: string; sub: string; Icon: typeof Users }[] = [
  { id: "REGULAR", title: "Regular", sub: "Full-time students", Icon: GraduationCap },
  { id: "CEP", title: "CEP", sub: "Continuing education programme", Icon: Users },
];

export function EnrollForm() {
  const [type, setType] = useState<AdmissionType | null>(null);
  const [picked, setPicked] = useState<AdmissionType | null>(null); // shows the selected state for a beat before the form opens
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, watch, setError, setValue, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(enrollmentSchema), defaultValues: { noAdmissionNumber: false, acceptTerms: undefined as unknown as true },
  });
  const noAdm = watch("noAdmissionNumber");

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    if (!type) return;
    if (!values.noAdmissionNumber) {
      const check = validateAdmissionNumber(values.admissionNumber ?? "", type);
      if (!check.ok) return setError("admissionNumber", { message: ERROR_MESSAGES[check.code] });
    }
    const res = await api("/api/enrollment", { method: "POST", json: { ...values, admissionType: type, admissionNumber: values.noAdmissionNumber ? undefined : values.admissionNumber } });
    if (!res.ok) {
      if (res.fields) {
        Object.entries(res.fields).forEach(([k, v]) => setError(k as keyof Values, { message: ERROR_MESSAGES[v] ?? v }));
        if (res.code === "VALIDATION_ERROR" || res.fields.admissionNumber || res.fields.username) return;
      }
      return setServerError(res.message);
    }
    const login = await signInAndCreateSession(values.email, values.password);
    window.location.href = login.ok ? "/dashboard" : "/login";
  });

  if (!type) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-[var(--muted)]">How were you admitted?</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {TYPES.map(({ id, title, sub, Icon }) => (
            <button key={id} type="button" aria-pressed={picked === id} disabled={!!picked && picked !== id}
              onClick={() => { setPicked(id); setValue("admissionType", id); timer.current = setTimeout(() => setType(id), 320); }}
              className="choice-card group glass relative flex items-center gap-4 rounded-2xl p-5 text-left transition duration-200 enabled:hover:-translate-y-0.5 enabled:active:translate-y-0 enabled:active:scale-[0.98] disabled:opacity-50">
              <span className={`grid size-12 place-items-center rounded-xl transition duration-200 group-hover:bg-[var(--accent)] group-hover:text-[var(--accent-fg)] group-focus-visible:bg-[var(--accent)] group-focus-visible:text-[var(--accent-fg)] ${picked === id ? "bg-[var(--accent)] text-[var(--accent-fg)]" : "bg-[var(--accent-soft)] text-[var(--accent)]"}`}><Icon className="size-6" /></span>
              <span><span className="block font-display text-lg font-bold">{title}</span><span className="text-sm text-[var(--muted)]">{sub}</span></span>
              <span aria-hidden className={`absolute right-3 top-3 grid size-6 place-items-center rounded-full bg-[var(--accent)] text-[var(--accent-fg)] transition duration-200 ${picked === id ? "scale-100 opacity-100" : "scale-50 opacity-0"}`}><Check className="size-4" /></span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <form suppressHydrationWarning onSubmit={onSubmit} className="space-y-4" noValidate>
      <p className="text-sm">Admission type: <b>{type === "REGULAR" ? "Regular" : "CEP"}</b> · <button type="button" className="text-[var(--accent)] hover:underline" onClick={() => { setType(null); setPicked(null); }}>Change</button></p>
      <Input label="Full name" autoComplete="name" error={errors.fullName?.message} {...register("fullName")} />
      <Input label="Username" autoComplete="username" autoCapitalize="none" error={errors.username?.message} {...register("username")} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Email" type="email" autoComplete="email" inputMode="email" error={errors.email?.message} {...register("email")} />
        <Input label="Phone number" type="tel" autoComplete="tel" inputMode="tel" placeholder="0803 123 4567" error={errors.phone?.message} {...register("phone")} />
      </div>
      <div className="space-y-2">
        {!noAdm && <Input label="Admission number" inputMode="numeric" maxLength={10} placeholder={type === "REGULAR" ? "2024134106" : "2025133004"} hint="10 digits: year, 3-digit code, 3-digit registration number." error={errors.admissionNumber?.message} {...register("admissionNumber")} />}
        <Checkbox label="I don't have one yet." {...register("noAdmissionNumber")} />
        {noAdm && <p className="rounded-xl bg-[var(--accent-soft)] p-3 text-sm">You can order your cards, but please enter your admission number as soon as you can in your profile settings.</p>}
      </div>
      <Input label="Date of birth" type="date" hint="This will not be disclosed publicly." error={errors.dateOfBirth?.message} {...register("dateOfBirth")} />
      <PasswordInput label="Password" autoComplete="new-password" hint="At least 8 characters." error={errors.password?.message} {...register("password")} />
      <div>
        <Checkbox label="I accept the terms and privacy notice, and agree that NAPSS may process my details to run student services." {...register("acceptTerms")} />
        {errors.acceptTerms && <p role="alert" className="mt-1 text-xs font-medium text-[var(--danger)]">{errors.acceptTerms.message}</p>}
      </div>
      {serverError && <p role="alert" className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-[var(--danger)]">{serverError}</p>}
      <Button type="submit" loading={isSubmitting} className="w-full">Create account</Button>
    </form>
  );
}
