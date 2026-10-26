import { NextResponse } from "next/server";
import { birthdayEmail, sendEmail } from "@/lib/server/email";
import { isProd } from "@/lib/server/env";
import { env } from "@/lib/server/env";
import { db } from "@/lib/server/firebase-admin";
import { getPlatformSettings } from "@/lib/server/settings";
import { timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";
export const maxDuration = 60;

const authorized = (req: Request) => {
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${env().CRON_SECRET}`);
  return given.length === want.length && timingSafeEqual(given, want);
};

/** Date parts in the school timezone — Vercel cron runs in UTC, so we never trust the server clock's local date. */
function schoolDate(tz: string, now = new Date()) {
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(now).split("-");
  return { year: Number(y), month: m!, day: d! };
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const settings = await getPlatformSettings();
  const { year, month, day } = schoolDate(settings.schoolTimezone);
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const targets = [{ month, day }, ...(month === "02" && day === "28" && !leap ? [{ month: "02", day: "29" }] : [])];

  const started = Date.now();
  let sent = 0, previewed = 0, skipped = 0, failed = 0;
  for (const t of targets) {
    const col = db().collection(`DOB/${t.month}/days/${t.day}/students`);
    let cursor: string | null = new URL(req.url).searchParams.get("cursor");
    for (;;) {
      let q = col.orderBy("__name__").limit(100);
      if (cursor) q = q.startAfter(cursor);
      const page = await q.get();
      if (page.empty) break;
      for (const doc of page.docs) {
        const s = doc.data();
        if (s.lastBirthdayEmailYear === year) { skipped++; continue; }
        const mail = birthdayEmail(s.name, s.email);
        if (!isProd()) { await sendEmail(mail); previewed++; continue; } // logs a masked preview only; nothing recorded
        const claimed = await db().runTransaction(async (tx) => {
          const cur = (await tx.get(doc.ref)).data();
          if (!cur || cur.lastBirthdayEmailYear === year) return false;
          tx.update(doc.ref, { lastBirthdayEmailYear: year });
          return true;
        });
        if (!claimed) { skipped++; continue; }
        try { await sendEmail(mail); sent++; } catch (e) {
          failed++;
          await doc.ref.update({ lastBirthdayEmailYear: null }); // release the claim so a retry can send
          console.error("[birthdays] send failed", doc.id, e instanceof Error ? e.message : "unknown");
        }
      }
      cursor = page.docs[page.docs.length - 1]!.id;
      if (Date.now() - started > 45_000) return NextResponse.json({ ok: true, done: false, nextCursor: cursor, sent, previewed, skipped, failed });
    }
  }
  console.info(`[birthdays] ${year}-${month}-${day} sent=${sent} previewed=${previewed} skipped=${skipped} failed=${failed}`);
  return NextResponse.json({ ok: true, done: true, sent, previewed, skipped, failed });
}
