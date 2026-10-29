import { Badge } from "@/components/ui/Badge";
import { WITHDRAWAL_STATUS_LABEL } from "@/constants/withdrawals";
import type { WithdrawalStatus } from "@/types/withdrawals";

const TONE: Record<WithdrawalStatus, "amber" | "green" | "red" | "gray"> = { PENDING: "amber", PAID: "green", REJECTED: "red", CANCELLED: "gray" };

export const WithdrawalBadge = ({ status }: { status: WithdrawalStatus }) => <Badge tone={TONE[status]}>{WITHDRAWAL_STATUS_LABEL[status]}</Badge>;
