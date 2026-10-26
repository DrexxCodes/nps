/** Short random id for client-created list entries (sub-items, variable sets, values). */
export const shortId = (): string => crypto.randomUUID().slice(0, 8);
