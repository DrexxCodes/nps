import { UsersManager } from "@/components/admin/UsersManager";
import { PageTitle } from "@/components/ui/States";
import { ADMIN_ROLES, requirePageUser } from "@/lib/server/session";

export const metadata = { title: "Users" };
export default async function UsersPage() {
  const user = await requirePageUser(ADMIN_ROLES);
  return <><PageTitle title="Users and roles" subtitle={user.role === "SUPER_ADMIN" ? "Look up a user by email to change their role or delete their account." : "Look up a user by email to change their role."} /><UsersManager isSuper={user.role === "SUPER_ADMIN"} /></>;
}
