"use client";
import { Camera, ImagePlus } from "lucide-react";
import { useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { MAX_IMAGE_BYTES } from "@/constants";
import { api } from "@/lib/client/api";

const TYPES = ["image/jpeg", "image/png", "image/webp"];
type Sig = { upload: { apiKey: string; cloudName: string; folder: string; public_id: string; timestamp: number; signature: string } };

export function ImageUploader({ name, current, seed, onDone }: { name: string; current?: string | null; seed?: string; onDone: (url: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(current ?? null);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pick = (f: File | undefined) => {
    setError(null);
    if (!f) return;
    if (!TYPES.includes(f.type)) return setError("Use a JPG, PNG or WebP image.");
    if (f.size > MAX_IMAGE_BYTES) return setError("Image must be 5 MB or smaller.");
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const upload = async () => {
    if (!file) return;
    setError(null);
    setProgress(0);
    const sig = await api<Sig>("/api/profile/image-upload-signature", { method: "POST" });
    if (!sig.ok) { setProgress(null); return setError(sig.message); }
    const u = sig.upload;
    const form = new FormData();
    form.append("file", file);
    form.append("api_key", u.apiKey);
    form.append("timestamp", String(u.timestamp));
    form.append("signature", u.signature);
    form.append("folder", u.folder);
    form.append("public_id", u.public_id);
    const publicId = await new Promise<string | null>((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `https://api.cloudinary.com/v1_1/${u.cloudName}/image/upload`);
      xhr.upload.onprogress = (e) => e.lengthComputable && setProgress(Math.round((e.loaded / e.total) * 100));
      xhr.onload = () => { try { resolve(xhr.status === 200 ? (JSON.parse(xhr.responseText).public_id as string) : null); } catch { resolve(null); } };
      xhr.onerror = () => resolve(null);
      xhr.send(form);
    });
    if (!publicId) { setProgress(null); return setError("Upload failed. Check your connection and try again."); }
    const saved = await api<object>("/api/profile", { method: "PATCH", json: { profileImage: { publicId } } });
    setProgress(null);
    if (!saved.ok) return setError(saved.message);
    setFile(null);
    onDone(publicId);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files[0]); }}>
        <Avatar name={name} src={preview} seed={seed} size={72} />
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" icon={<ImagePlus className="size-4" />} onClick={() => input.current?.click()}>Choose photo</Button>
          <label className="inline-flex"><input type="file" accept="image/*" capture="user" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} /><span className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl border border-[var(--line)] px-3 text-sm font-semibold hover:bg-[var(--accent-soft)]"><Camera className="size-4" /> Take photo</span></label>
        </div>
        <input ref={input} type="file" accept={TYPES.join(",")} className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
      </div>
      {progress !== null && <div className="h-2 overflow-hidden rounded-full bg-[var(--line)]" role="progressbar" aria-valuenow={progress}><div className="h-full bg-[var(--accent)] transition-all" style={{ width: `${progress}%` }} /></div>}
      {error && <p role="alert" className="text-sm text-[var(--danger)]">{error}</p>}
      {file && progress === null && <Button type="button" size="sm" onClick={upload}>Save photo</Button>}
    </div>
  );
}
