import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { buttonClass } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";

export const metadata = { title: "Access denied" };
export default function Forbidden() {
  return <EmptyState icon={<ShieldAlert className="size-6" />} title="Access denied" body="Your account does not have permission to view that page." action={<Link href="/" className={buttonClass()}>Back to home</Link>} />;
}
