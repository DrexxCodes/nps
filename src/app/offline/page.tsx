import { WifiOff } from "lucide-react";
import { EmptyState } from "@/components/ui/States";

export const metadata = { title: "Offline" };
export default function Offline() {
  return <EmptyState icon={<WifiOff className="size-6" />} title="You're offline" body="Reconnect to the internet and reload. Payments and order tracking need a live connection." />;
}
