/** Provider-neutral outcome of a verified transaction. Each provider adapter maps its own codes onto these. */
export type NormalizedStatus = "success" | "failed" | "abandoned" | "reversed" | "pending";
