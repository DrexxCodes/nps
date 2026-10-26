/** Default profile picture for students who haven't uploaded one: DiceBear's "Micah" style, deterministic per seed. */
export const micahAvatarUrl = (seed: string): string =>
  `https://api.dicebear.com/9.x/micah/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
