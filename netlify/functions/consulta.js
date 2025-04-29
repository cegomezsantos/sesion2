// netlify/functions/consulta.js (CORRECTO - PARA LA CARPETA netlify/functions)

export async function handler(event) {
  // --- LOG INICIAL ---
  console.log("Función 'consulta' iniciada.");
  // console.log("Evento completo recibido:", JSON.stringify(event, null, 2)); // Descomentar si necesitas ver todo el evento

  // Recibe el prompt específico escrito por el profesor desde el frontend
  const rawUserPrompt = event.queryStringParameters?.prompt; // Usamos optional chaining
  console.log("[consulta.js] Valor crudo de event.queryStringParameters.prompt:", rawUserPrompt);

  // Usa el prompt recibido o "Hola" como fallback si no llega nada o está vacío
  const userPrompt = (rawUserPrompt && rawUserPrompt.trim()) ? rawUserPrompt.trim() : "Hola";
  console.log("[consulta.js] Valor final de userPrompt (después de fallback):", userPrompt);

  // 1️⃣ Verifica que la API key esté configurada
  if (!process.env.DEEPSEEK_KEY) {
    console.error("[consulta.js] Error: DEEPSEEK_KEY environment variable not set.");
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: false, message: "Error de configuración: Falta la clave API del servidor." })
    };
  }

  // El prompt de sistema que define el rol y la tarea de la IA
  const systemPrompt = `Eres un evaluador experto en pedagogia y docencia. Estas asesorando a un profesor que esta aprendiendo ia y quiere aprender a plantear a hacer un prompt correcto para producir un cuestionario para su curso de educacion secundaria. Tienes que darle un feedback con sugerencias de mejora que puede aplicar hasta que encuentres que es un prompt satisfactorio y preciso`;

  // Construye los mensajes para la IA
  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt } // Usa el userPrompt procesado
  ];
  console.log("[consulta.js] Mensajes que se enviarán a DeepSeek:", JSON.stringify(messages, null, 2));

  try {
    console.log("[consulta.js] Enviando petición a la API de DeepSeek...");
    const resp = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.DEEPSEEK_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: messages
        // Añade aquí parámetros como temperature si los necesitas
      })
    });
    console.log("[consulta.js] Respuesta recibida de DeepSeek. Status:", resp.status);

    // Verifica si la respuesta de la API fue exitosa
    if (!resp.ok) {
      const errorBody = await resp.text();
      console.error(`[consulta.js] Error ${resp.status} de la API DeepSeek: ${errorBody}`);
      return {
        statusCode: resp.status,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: false, message: `Error al contactar la IA (${resp.status}): ${errorBody}` })
       };
    }

    const data = await resp.json();
    // console.log("[consulta.js] Datos JSON recibidos de DeepSeek:", JSON.stringify(data, null, 2)); // Descomentar si necesitas ver la respuesta completa

    // Extrae el contenido de la respuesta de la IA de forma segura
    const feedbackContent = data?.choices?.[0]?.message?.content ?? null; // Usa optional chaining y nullish coalescing
    console.log("[consulta.js] Feedback extraído:", feedbackContent);

    if (feedbackContent === null) {
         console.error("[consulta.js] No se pudo extraer feedback de la respuesta de la IA:", JSON.stringify(data));
         return {
             statusCode: 500,
             headers: { "Content-Type": "application/json" },
             body: JSON.stringify({ success: false, message: "Error al procesar la respuesta de la IA." })
         };
    }

    // Devuelve el feedback al frontend
    console.log("[consulta.js] Enviando respuesta exitosa al frontend.");
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: true, feedback: feedbackContent })
     };

  } catch (error) {
    console.error("[consulta.js] Error DENTRO del bloque try/catch:", error);
    return {
       statusCode: 500,
       headers: { "Content-Type": "application/json" },
       body: JSON.stringify({ success: false, message: `Error interno del servidor: ${error.message}` })
      };
  }
}