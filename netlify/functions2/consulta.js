export async function handler(event) {
    const prompt = event.queryStringParameters.prompt || "";
    const resp = await fetch("https://api.deepseek.com/v1/chat", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.DEEPSEEK_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ prompt })
    });
    const data = await resp.text();
    return { statusCode: 200, body: data };
  }
  