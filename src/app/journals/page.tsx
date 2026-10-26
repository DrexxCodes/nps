import { BookOpen } from "lucide-react";
import { EmptyState } from "@/components/ui/States";

export const metadata = { title: "Journals" };
export default function Journals() {
  return <EmptyState icon={<BookOpen className="size-6" />} title="Coming Soon" body="Departmental journals are on their way. Check back after the next session starts." />;
}
