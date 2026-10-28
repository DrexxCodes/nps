import "server-only";
import { isProd, env } from "./env";

export interface Email { to: string; subject: string; text: string; html: string }

/** Real send only when ENV=PROD; otherwise prints a redacted preview to the server log. Throws on SES failure so callers can retry. */
export async function sendEmail(mail: Email): Promise<"SENT" | "PREVIEWED"> {
  if (!isProd()) {
    const masked = mail.to.replace(/^(.).*(@.*)$/, "$1***$2");
    console.info(`[email:preview] to=${masked} subject="${mail.subject}"\n${mail.text}`);
    return "PREVIEWED";
  }
  const { SESv2Client, SendEmailCommand } = await import("@aws-sdk/client-sesv2");
  const e = env();
  const client = new SESv2Client({ region: e.AWS_REGION, credentials: { accessKeyId: e.AWS_ACCESS_KEY_ID!, secretAccessKey: e.AWS_SECRET_ACCESS_KEY! } });
  await client.send(new SendEmailCommand({
    FromEmailAddress: e.AWS_SES_FROM_EMAIL,
    Destination: { ToAddresses: [mail.to] },
    Content: { Simple: { Subject: { Data: mail.subject }, Body: { Text: { Data: mail.text }, Html: { Data: mail.html } } } },
  }));
  return "SENT";
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const wrap = (title: string, body: string) =>
  `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:auto;padding:24px"><h2 style="color:#0b3d2e">${esc(title)}</h2>${body}<hr style="border:none;border-top:1px solid #dde7e0;margin:24px 0"/><p style="color:#6b7f74;font-size:12px">Developed by Drexx Technologies. All rights reserved to NAPSS, UNIZIK.</p></div>`;

export const birthdayEmail = (name: string, to: string): Email => ({
  to, subject: `Happy Birthday, ${name.split(" ")[0]}! 🎉`,
  text: `Happy Birthday, ${name.split(" ")[0]}! NAPSS, UNIZIK wishes you a wonderful day.`,
  html: wrap(`Happy Birthday, ${name.split(" ")[0]}! 🎉`, "<p>NAPSS, UNIZIK wishes you a wonderful day.</p>"),
});

export const paymentEmail = (p: { name: string; to: string; item: string; reference: string; amount: string }): Email => ({
  to: p.to, subject: `Payment received: ${p.item.replace(/\s+/g, " ").trim()}`,
  text: `Hi ${p.name}, we received your payment of ${p.amount} for ${p.item}. Reference: ${p.reference}. Track your order in your dashboard.`,
  html: wrap("Payment received", `<p>Hi ${esc(p.name)}, we received your payment of <b>${esc(p.amount)}</b> for <b>${esc(p.item)}</b>.</p><p>Reference: <code>${esc(p.reference)}</code></p><p>Track your order from your NPS dashboard.</p>`),
});
