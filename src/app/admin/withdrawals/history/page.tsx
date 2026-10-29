import { redirect } from "next/navigation";

export const metadata = { title: "Withdrawal history" };

/** Each item now has its own withdrawal history (item > Money), and the Money page lists the latest requests. */
export default function WithdrawalHistory() {
  redirect("/admin/withdrawals");
}
