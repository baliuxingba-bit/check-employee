import "server-only";
import { Resend } from "resend";

export async function sendReportEmail(to: string[], subject: string, text: string) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey || to.length === 0) return;

  const resend = new Resend(apiKey);

  try {
    await resend.emails.send({
      from: "onboarding@resend.dev",
      to,
      subject,
      text,
    });
  } catch (error) {
    console.error("日報メールの送信に失敗しました", error);
  }
}
