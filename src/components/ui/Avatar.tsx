/* eslint-disable @next/next/no-img-element */
export function Avatar({ name, src, size = 48 }: { name: string; src?: string | null; size?: number }) {
  const initials = name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
  return src ? (
    <img src={src} alt={name} width={size} height={size} className="rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span className="grid place-items-center rounded-full bg-[var(--accent-soft)] font-display font-bold text-[var(--accent)]" style={{ width: size, height: size, fontSize: size * 0.38 }} aria-label={name}>{initials}</span>
  );
}
