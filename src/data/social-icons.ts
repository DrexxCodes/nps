import { Facebook, Ghost, Github, Instagram, Linkedin, MessageCircle, Music2, type LucideIcon } from "lucide-react";
import type { SocialPlatform } from "@/types";

export const SOCIAL_ICONS: Record<SocialPlatform, { Icon: LucideIcon; label: string }> = {
  whatsapp: { Icon: MessageCircle, label: "WhatsApp" },
  facebook: { Icon: Facebook, label: "Facebook" },
  tiktok: { Icon: Music2, label: "TikTok" },
  snapchat: { Icon: Ghost, label: "Snapchat" },
  linkedin: { Icon: Linkedin, label: "LinkedIn" },
  instagram: { Icon: Instagram, label: "Instagram" },
  github: { Icon: Github, label: "GitHub" },
};
