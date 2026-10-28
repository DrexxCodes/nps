import "server-only";
import { createHash } from "node:crypto";
import { env } from "./env";

/** Signed upload params; the secret never leaves the server. Uploads are scoped to the user's own folder. */
export function signUpload(uid: string) {
  const e = env();
  const timestamp = Math.floor(Date.now() / 1000);
  const params = { folder: `nps/profiles/${uid}`, public_id: `avatar_${timestamp}`, timestamp };
  const toSign = Object.entries(params).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join("&");
  const signature = createHash("sha1").update(toSign + e.CLOUDINARY_API_SECRET).digest("hex");
  return { ...params, signature, apiKey: e.CLOUDINARY_API_KEY, cloudName: e.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME };
}

export const isOwnUpload = (publicId: string, uid: string) => publicId.startsWith(`nps/profiles/${uid}/`);
export const cloudinaryUrl = (publicId: string, cloud: string, width = 400) =>
  `https://res.cloudinary.com/${cloud}/image/upload/c_fill,g_face,w_${width},h_${width},q_auto,f_auto/${publicId}`;

/** Removes every image under the user's own profile folder (older avatars included) and purges the CDN copies. Admin API, so it needs the API secret. */
export async function deleteProfileImages(uid: string): Promise<void> {
  const e = env();
  const url = `https://api.cloudinary.com/v1_1/${e.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/resources/image/upload?prefix=${encodeURIComponent(`nps/profiles/${uid}/`)}&invalidate=true`;
  const res = await fetch(url, { method: "DELETE", headers: { Authorization: `Basic ${Buffer.from(`${e.CLOUDINARY_API_KEY}:${e.CLOUDINARY_API_SECRET}`).toString("base64")}` } });
  if (!res.ok) throw new Error(`Cloudinary cleanup failed (${res.status})`);
}
