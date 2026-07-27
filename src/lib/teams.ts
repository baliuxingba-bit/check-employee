import "server-only";

export async function notifyTeams(text: string) {
  const webhookUrl = process.env.TEAMS_WEBHOOK_URL?.trim();
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        attachments: [
          {
            contentType: "application/vnd.microsoft.card.adaptive",
            content: {
              type: "AdaptiveCard",
              $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
              version: "1.4",
              body: [{ type: "TextBlock", text, wrap: true }],
            },
          },
        ],
      }),
    });
  } catch (error) {
    console.error("Teams通知の送信に失敗しました", error);
  }
}
