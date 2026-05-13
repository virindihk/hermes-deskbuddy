async function main() {
  const baseUrl = process.env.HERMES_BASE_URL || 'http://127.0.0.1:8642';
  const health = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(5000) });
  if (!health.ok) {
    throw new Error(`Hermes health failed: HTTP ${health.status}`);
  }

  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.HERMES_MODEL || 'hermes-agent',
      stream: false,
      messages: [
        { role: 'user', content: '请只回复：桌宠连接成功' },
      ],
    }),
    signal: AbortSignal.timeout(180000),
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (_error) {
    data = { raw: text };
  }

  if (!response.ok) {
    throw new Error(`Hermes chat failed: HTTP ${response.status} ${text}`);
  }

  const reply = data?.choices?.[0]?.message?.content || data?.output_text || '';
  if (!reply.trim()) {
    throw new Error(`Hermes returned empty reply: ${text}`);
  }

  console.log(reply.trim());
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
