import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";

export default function NotFound() {
  return <EmptyState title="Page not found" body="That page does not exist or has moved." action={<Link href="/" className={buttonClass()}>Back to home</Link>} />;
}
