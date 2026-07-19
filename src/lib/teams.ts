import "server-only";

export async function notifyTeams(text: string) {
  const webhookUrl = process.env.TEAMS_WEBHOOK_URL?.trim();
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch (error) {
    console.error("Teams通知の送信に失敗しました", error);
  }
}
