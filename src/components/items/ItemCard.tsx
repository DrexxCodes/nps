/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Layers, Package } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatNaira } from "@/lib/money";
import type { Item } from "@/types";

export function ItemCard({ item }: { item: Pick<Item, "id" | "name" | "description" | "coverImageUrl" | "hasSubItems" | "subItems" | "basePriceKobo" | "batchProcessingEnabled" | "endAt"> & { physical?: boolean } }) {
  const from = item.hasSubItems ? item.subItems.filter((s) => s.required).reduce((n, s) => n + s.priceKobo, 0) || Math.min(...item.subItems.map((s) => s.priceKobo)) : item.basePriceKobo;
  return (
    <Link href={`/items/${item.id}`} className="glass group flex flex-col overflow-hidden rounded-2xl transition hover:-translate-y-0.5">
      <div className="grid h-32 place-items-center bg-[var(--accent-soft)]">
        {item.coverImageUrl ? <img src={item.coverImageUrl} alt="" className="size-full object-cover" /> : <Package className="size-10 text-[var(--accent)]" />}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-display text-lg font-bold leading-snug">{item.name}</h3>
        <p className="line-clamp-2 text-sm text-[var(--muted)]">{item.description}</p>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="font-semibold">{item.hasSubItems ? "From " : ""}{formatNaira(from)}</span>
          <span className="flex gap-1.5">
            {item.hasSubItems && <Badge tone="gray"><Layers className="mr-1 size-3" />Bundle</Badge>}
            {item.physical === false && <Badge tone="blue">No pickup</Badge>}
            {item.endAt && <Badge tone="amber">Ends {new Date(item.endAt).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}</Badge>}
          </span>
        </div>
      </div>
    </Link>
  );
}
