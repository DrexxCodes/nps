"use client";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { AdmissionForm } from "@/components/profile/AdmissionForm";
import { BankForm } from "@/components/profile/BankForm";
import { ImageUploader } from "@/components/profile/ImageUploader";
import { StateLgaSelect } from "@/components/profile/StateLgaSelect";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Checkbox, Input, Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { MAX_ACTIVE_SOCIAL_LINKS, MAX_BIO_LENGTH, SOCIAL_PLATFORMS } from "@/constants";
import { api } from "@/lib/client/api";
import type { SocialPlatform } from "@/types";

export interface SettingsInitial {
  fullName: string; username: string; phone: string; email: string; dateOfBirth: string; bio: string; allergies: string; stateOfOrigin: string; localGovernmentArea: string;
  birthdayVisibility: boolean; socialLinks: Partial<Record<SocialPlatform, string>>; activeSocialLinks: SocialPlatform[];
  emergency: { name: string; relationship: string; phone: string }; admissionNumber: string | null; profileImageUrl: string | null; bankLabel: string | null; avatarSeed: string;
}
type Values = Omit<SettingsInitial, "email" | "admissionNumber" | "profileImageUrl" | "bankLabel" | "avatarSeed">;

export function SettingsForm({ initial }: { initial: SettingsInitial }) {
  const toast = useToast();
  const router = useRouter();
  const [showBank, setShowBank] = useState(false);
  const { register, handleSubmit, watch, setValue, setError, formState: { isSubmitting, errors } } = useForm<Values>({ defaultValues: initial });
  const active = watch("activeSocialLinks");
  const bio = watch("bio");
  const state = watch("stateOfOrigin");
  const lga = watch("localGovernmentArea");
  const setGeo = useCallback((v: { state: string; lga: string }) => {
    setValue("stateOfOrigin", v.state, { shouldDirty: true });
    setValue("localGovernmentArea", v.lga, { shouldDirty: true });
  }, [setValue]);

  const toggleSocial = (p: SocialPlatform) => {
    const next = active.includes(p) ? active.filter((x) => x !== p) : [...active, p];
    if (next.length > MAX_ACTIVE_SOCIAL_LINKS) return toast("error", `You can show up to ${MAX_ACTIVE_SOCIAL_LINKS} social links.`);
    setValue("activeSocialLinks", next);
  };

  const onSubmit = handleSubmit(async (v) => {
    const emergencyContacts = v.emergency.name || v.emergency.phone ? [v.emergency] : [];
    const res = await api("/api/profile", { method: "PATCH", json: {
      fullName: v.fullName, username: v.username, ...(v.phone ? { phone: v.phone } : {}), bio: v.bio, allergies: v.allergies, birthdayVisibility: v.birthdayVisibility, socialLinks: v.socialLinks,
      activeSocialLinks: v.activeSocialLinks, emergencyContacts, ...(v.stateOfOrigin ? { stateOfOrigin: v.stateOfOrigin } : {}), ...(v.localGovernmentArea ? { localGovernmentArea: v.localGovernmentArea } : {}),
      ...(v.dateOfBirth !== initial.dateOfBirth ? { dateOfBirth: v.dateOfBirth } : {}),
    } });
    if (res.ok) { toast("success", "Profile saved"); router.refresh(); return; }
    Object.entries(res.fields ?? {}).forEach(([k, m]) => setError(k.startsWith("socialLinks.") ? (k as never) : (k as keyof Values), { message: m === "USERNAME_TAKEN" ? "That username is already taken." : m }));
    toast("error", res.message);
  });

  return (
    <form suppressHydrationWarning onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
      <div className="contents lg:block lg:space-y-5">
      <Card className="order-1 space-y-4">
        <h2 className="font-display text-lg font-bold">Photo</h2>
        <ImageUploader name={initial.fullName} current={initial.profileImageUrl} seed={initial.avatarSeed} onDone={() => { toast("success", "Photo updated"); router.refresh(); }} />
      </Card>

      <Card className="order-2 space-y-4">
        <h2 className="font-display text-lg font-bold">Account</h2>
        <Input label="Full name" error={errors.fullName?.message} {...register("fullName")} />
        <Input label="Username" autoCapitalize="none" error={errors.username?.message} {...register("username")} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Phone number" type="tel" error={errors.phone?.message} {...register("phone")} />
          <Input label="Email" value={initial.email} readOnly disabled hint="Email changes need Firebase's verification flow and aren't available here yet." />
        </div>
        <Input label="Date of birth" type="date" hint="This will not be disclosed publicly." error={errors.dateOfBirth?.message} {...register("dateOfBirth")} />
        <Checkbox label="Show my birthday (day and month only) on my public profile" {...register("birthdayVisibility")} />
        {initial.admissionNumber ? <Input label="Admission number" value={initial.admissionNumber} readOnly disabled /> : <div><p className="mb-2 text-sm font-medium">Admission number</p><AdmissionForm onDone={() => { toast("success", "Admission number saved"); router.refresh(); }} /></div>}
      </Card>

      <Card className="order-4 space-y-4">
        <h2 className="font-display text-lg font-bold">Private details</h2>
        <p className="text-sm text-[var(--muted)]">Never shown on your public page.</p>
        <StateLgaSelect value={{ state, lga }} onChange={setGeo} errors={{ state: errors.stateOfOrigin?.message, lga: errors.localGovernmentArea?.message }} />
        <Input label="Allergies" placeholder="Optional" {...register("allergies")} />
        <p className="text-sm font-medium">Emergency contact</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Name" {...register("emergency.name")} /><Input label="Relationship" {...register("emergency.relationship")} /><Input label="Phone" type="tel" {...register("emergency.phone")} />
        </div>
      </Card>
      </div>
      <div className="contents lg:block lg:space-y-5">
      <Card className="order-3 space-y-4">
        <h2 className="font-display text-lg font-bold">Public profile</h2>
        <Textarea label="Biography" maxLength={MAX_BIO_LENGTH} hint={`${bio?.length ?? 0}/${MAX_BIO_LENGTH}`} {...register("bio")} />
        <p className="text-sm font-medium">Social links <span className="font-normal text-[var(--muted)]">(show up to {MAX_ACTIVE_SOCIAL_LINKS})</span></p>
        {SOCIAL_PLATFORMS.map((p) => (
          <div key={p} className="flex items-end gap-3">
            <div className="flex-1"><Input label={p[0]!.toUpperCase() + p.slice(1)} placeholder={p === "whatsapp" ? "0803… or wa.me link" : "https://…"} error={errors.socialLinks?.[p]?.message} {...register(`socialLinks.${p}`)} /></div>
            <Checkbox label="Show" className="pb-3" checked={active.includes(p)} onChange={() => toggleSocial(p)} />
          </div>
        ))}
      </Card>

      <Card className="order-5 space-y-3">
        <h2 className="font-display text-lg font-bold">Bank account</h2>
        <p className="text-sm text-[var(--muted)]">{initial.bankLabel ?? "Only needed for items that require it."}</p>
        {showBank ? <BankForm onDone={() => { setShowBank(false); toast("success", "Bank account saved"); router.refresh(); }} /> : <Button type="button" variant="outline" size="sm" onClick={() => setShowBank(true)}>{initial.bankLabel ? "Change account" : "Add account"}</Button>}
      </Card>
      </div>
      </div>

      <Button type="submit" loading={isSubmitting} className="w-full sm:w-auto">Save changes</Button>
    </form>
  );
}
