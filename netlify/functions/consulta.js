// netlify/functions/consulta.js (CON LOGS DE DEPURACIÓN)

export async function handler(event) {
    // --- LOG INICIAL ---
    console.log("Función 'consulta' iniciada.");
    console.log("Evento completo recibido:", JSON.stringify(event, null, 2)); // Muestra todo el evento
  
    // Recibe el prompt específico escrito por el profesor desde el frontend
    const rawUserPrompt = event.queryStringParameters?.prompt; // Usamos optional chaining por si queryStringParameters no existe
    console.log("Valor crudo de event.queryStringParameters.prompt:", rawUserPrompt);
  
    const userPrompt = rawUserPrompt || "Hola"; // Usamos "Hola" si no llega nada
    console.log("Valor final de userPrompt (después de fallback):", userPrompt);
  
    // 1️⃣ Verifica que la API key esté configurada
    if (!process.env.DEEPSEEK_KEY) {
      console.error("Error: DEEPSEEK_KEY environment variable not set.");
      return { statusCode: 500, body: JSON.stringify({ success: false, message: "Error de configuración: Falta la clave API del servidor." }), headers: { "Content-Type": "application/json" } };
    }
  
    // El prompt de sistema
    const systemPrompt = `Eres un evaluador experto en pedagogia y docencia. Estas asesorando a un profesor que esta aprendiendo ia y quiere aprender a plantear a hacer un prompt correcto para producir un cuestionario para su curso de educacion secundaria. Tienes que darle un feedback con sugerencias de mejora que puede aplicar hasta que encuentres que es un prompt satisfactorio y preciso`;
  
    // Construye los mensajes para la IA
    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ];
    console.log("Mensajes que se enviarán a DeepSeek:", JSON.stringify(messages, null, 2));
  
    try {
      console.log("Enviando petición a la API de DeepSeek...");
      const resp = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.DEEPSEEK_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: messages
          // Puedes añadir otros parámetros aquí si es necesario
        })
      });
      console.log("Respuesta recibida de DeepSeek. Status:", resp.status);
  
      // Verifica si la respuesta de la API fue exitosa
      if (!resp.ok) {
        const errorBody = await resp.text();
        console.error(`Error ${resp.status} de la API DeepSeek: ${errorBody}`);
        return { statusCode: resp.status, body: JSON.stringify({ success: false, message: `Error al contactar la IA: ${resp.statusText} - ${errorBody}` }), headers: { "Content-Type": "application/json" } };
      }
  
      const data = await resp.json();
      console.log("Datos JSON recibidos de DeepSeek:", JSON.stringify(data, null, 2));
  
      // Extrae el contenido de la respuesta de la IA
      const feedbackContent = data.choices?.[0]?.message?.content ?? JSON.stringify(data); // Usamos optional chaining y nullish coalescing
      console.log("Feedback extraído:", feedbackContent);
  
      // Devuelve el feedback al frontend
      console.log("Enviando respuesta exitosa al frontend.");
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: true, feedback: feedbackContent })
       };
  
    } catch (error) {
      console.error("Error DENTRO del bloque try/catch:", error);
      return {
         statusCode: 500,
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ success: false, message: `Error interno del servidor: ${error.message}` })
        };
    }
  }