import { FieldValue } from "firebase-admin/firestore";
import { MAX_ACTIVE_SOCIAL_LINKS } from "@/constants";
import { normalizePhone, normalizeUsername } from "@/lib/admission";
import { findLga, findState } from "@/lib/geo";
import { normalizeSocialUrl } from "@/lib/social";
import { profileUpdateSchema } from "@/lib/validation/schemas";
import { cloudinaryUrl, isOwnUpload } from "@/lib/server/cloudinary";
import { env } from "@/lib/server/env";
import { AppError, ok, route } from "@/lib/server/errors";
import { db } from "@/lib/server/firebase-admin";
import { dobIndexPath } from "@/lib/server/enrollment";
import { buildPublicProfileFields, PUBLIC_PROFILE_SOURCE_KEYS } from "@/lib/server/public-profile";
import { requireUser } from "@/lib/server/session";
import type { SocialPlatform } from "@/types";

export const PATCH = route(async (req: Request) => {
  const user = await requireUser(req);
  const input = profileUpdateSchema.parse(await req.json());
  const patch: Record<string, unknown> = {};

  if (input.fullName) { patch.fullName = input.fullName; patch.name = input.fullName; } // `name` is what DARS displays
  if (input.phone) {
    const phone = normalizePhone(input.phone);
    if (!phone) throw new AppError("VALIDATION_ERROR", { phone: "Enter a valid Nigerian phone number" });
    patch.phone = phone;
  }
  if (input.bio !== undefined) patch.bio = input.bio.replace(/[<>]/g, "");
  if (input.allergies !== undefined) patch.allergies = input.allergies;
  if (input.birthdayVisibility !== undefined) patch.birthdayVisibility = input.birthdayVisibility;
  if (input.emergencyContacts) patch.emergencyContacts = input.emergencyContacts;
  // State/LGA are checked against the dataset: the LGA must belong to the (new or already stored) state.
  const pickedState = input.stateOfOrigin ? findState(input.stateOfOrigin) : null;
  if (input.stateOfOrigin && !pickedState) throw new AppError("VALIDATION_ERROR", { stateOfOrigin: "Choose a state from the list" });

  if (input.socialLinks) {
    const clean: Partial<Record<SocialPlatform, string>> = {};
    for (const [p, v] of Object.entries(input.socialLinks) as [SocialPlatform, string][]) {
      if (!v) continue;
      const url = normalizeSocialUrl(p, v);
      if (!url) throw new AppError("VALIDATION_ERROR", { [`socialLinks.${p}`]: "Enter a valid https link for this platform" });
      clean[p] = url;
    }
    patch.socialLinks = clean;
  }
  if (input.activeSocialLinks) {
    if (input.activeSocialLinks.length > MAX_ACTIVE_SOCIAL_LINKS) throw new AppError("VALIDATION_ERROR", { activeSocialLinks: `Activate at most ${MAX_ACTIVE_SOCIAL_LINKS} links` });
    patch.activeSocialLinks = [...new Set(input.activeSocialLinks)];
  }
  if (input.profileImage) {
    if (!isOwnUpload(input.profileImage.publicId, user.uid)) throw new AppError("FORBIDDEN");
    patch.cloudinaryPublicId = input.profileImage.publicId;
    patch.profileImageUrl = cloudinaryUrl(input.profileImage.publicId, env().NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME);
  }

  await db().runTransaction(async (tx) => {
    const userRef = db().doc(`users/${user.uid}`);
    const snap = await tx.get(userRef);
    const cur = snap.data();
    if (!cur) throw new AppError("NOT_FOUND");
    // DARS keeps its own copy of the name in students/{regNumber}; read it now (all reads must precede writes).
    const regNumber = cur.regNumber ?? cur.admissionNumber;
    const studentRef = patch.fullName && regNumber ? db().doc(`students/${regNumber}`) : null;
    const studentExists = studentRef ? (await tx.get(studentRef)).exists : false;

    let newUsernameRef = null;
    if (input.username && normalizeUsername(input.username) !== cur.usernameNormalized) {
      newUsernameRef = db().doc(`usernames/${normalizeUsername(input.username)}`);
      if ((await tx.get(newUsernameRef)).exists) throw new AppError("USERNAME_TAKEN", { username: "USERNAME_TAKEN" });
    }
    if (newUsernameRef && input.username) {
      tx.delete(db().doc(`usernames/${cur.usernameNormalized}`));
      tx.set(newUsernameRef, { uid: user.uid });
      patch.username = input.username;
      patch.usernameNormalized = normalizeUsername(input.username);
    }
    if (input.dateOfBirth && input.dateOfBirth !== cur.dateOfBirth) {
      if (cur.dateOfBirth) tx.delete(db().doc(dobIndexPath(cur.dateOfBirth, user.uid)));
      tx.set(db().doc(dobIndexPath(input.dateOfBirth, user.uid)), { uid: user.uid, name: patch.fullName ?? cur.fullName, email: cur.email, month: input.dateOfBirth.slice(5, 7), day: input.dateOfBirth.slice(8, 10), lastBirthdayEmailYear: null });
      patch.dateOfBirth = input.dateOfBirth;
    } else if (patch.fullName && cur.dateOfBirth) {
      tx.set(db().doc(dobIndexPath(cur.dateOfBirth, user.uid)), { name: patch.fullName }, { merge: true });
    }

    if (pickedState || input.localGovernmentArea) {
      const state = pickedState ?? findState(cur.stateOfOrigin);
      if (!state) throw new AppError("VALIDATION_ERROR", { stateOfOrigin: "Choose a state first" });
      patch.stateOfOrigin = state.name;
      if (input.localGovernmentArea) {
        const match = findLga(state.name, input.localGovernmentArea);
        if (!match) throw new AppError("VALIDATION_ERROR", { localGovernmentArea: `That local government area is not in ${state.name} State` });
        patch.localGovernmentArea = match.lga.name;
      } else if (findState(cur.stateOfOrigin)?.id !== state.id) {
        patch.localGovernmentArea = null; // state changed: the old LGA no longer applies
      }
    }
    if (studentRef && studentExists) tx.update(studentRef, { name: patch.fullName });
    tx.update(userRef, { ...patch, updatedAt: Date.now() });
    // Public profile lives on admissionNumbers/{n}: keep it in step with whatever just changed (reads are all done above).
    const merged = { ...cur, ...patch };
    if (merged.admissionNumber && PUBLIC_PROFILE_SOURCE_KEYS.some((k) => k in patch)) {
      tx.set(db().doc(`admissionNumbers/${merged.admissionNumber}`), { uid: user.uid, ...buildPublicProfileFields(merged) }, { merge: true });
    }
  });
  return ok({});
});
