import "server-only";
import { FieldValue, type Transaction } from "firebase-admin/firestore";
import type { Role } from "@/types";
import { db } from "./firebase-admin";

export interface AuditInput {
  actorUid: string;
  actorRole: Role | "SYSTEM";
  action: string;
  resourceType: string;
  resourceId: string;
  reason?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

const entry = (i: AuditInput) => ({ ...i, reason: i.reason ?? null, metadata: i.metadata ?? {}, createdAt: FieldValue.serverTimestamp() });

export async function audit(input: AuditInput): Promise<void> {
  await db().collection("auditLogs").add(entry(input));
}

/** Use inside a transaction so the audit record commits with the change it describes. */
export function auditInTx(tx: Transaction, input: AuditInput): void {
  tx.set(db().collection("auditLogs").doc(), entry(input));
}
