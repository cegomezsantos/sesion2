export async function handler(event) {
  const prompt = event.queryStringParameters.prompt || "Hola";
  
  // 1️⃣  asegúrate de que la key existe
  if (!process.env.DEEPSEEK_KEY) {
    return { statusCode: 500, body: "No API key in env var" };
  }

  const resp = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.DEEPSEEK_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "deepseek-chat",          // o "deepseek-coder"
      messages: [
        { role: "user", content: prompt }
      ]
    })
  });

  const data = await resp.text();      // usa .json() si prefieres
  return { statusCode: resp.status, body: data };
}
