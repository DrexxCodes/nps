import { redirect } from "next/navigation";
import { roleHome } from "@/lib/roles";
import { getSessionUser } from "@/lib/server/session";

export const dynamic = "force-dynamic";

/** Where sign-in lands by default: each role's own home (students: dashboard, staff: staff desk, admins: admin). */
export default async function Go() {
  const user = await getSessionUser();
  redirect(user ? roleHome(user.role) : "/login");
}
