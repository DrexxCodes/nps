import { CreditCard, ShoppingBag, Store } from "lucide-react";

export const HERO_IMAGE = "/images/hero.webp";

/** Stacked, sticky "How it works" panels. `tone` sets the panel colours; the grid overlay uses currentColor. */
export const LANDING_STEPS = [
  { icon: Store, title: "Browse items", text: "See everything you can pay for seperated by class.", tone: "bg-forest text-white" },
  { icon: CreditCard, title: "Pay securely", text: "Check out with our secure payment provider. Your receipt appears immediately.", tone: "bg-mint text-ink" },
  { icon: ShoppingBag, title: "Collect your order", text: "Follow it from queue to pickup. Meet any department executives to get your order.", tone: "bg-leaf-dark text-white" },
] as const;
