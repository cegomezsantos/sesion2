// netlify/functions/consulta.js

export async function handler(event) {
  // Recibe el prompt específico escrito por el profesor desde el frontend
  const userPrompt = event.queryStringParameters.prompt || "Hola"; // Usamos "Hola" si no llega nada

  // 1️⃣ Verifica que la API key esté configurada en las variables de entorno de Netlify
  if (!process.env.DEEPSEEK_KEY) {
    console.error("Error: DEEPSEEK_KEY environment variable not set.");
    return { statusCode: 500, body: "Error de configuración: Falta la clave API del servidor." };
  }

  // El prompt de sistema que define el rol y la tarea de la IA
  const systemPrompt = `Eres un evaluador experto en pedagogia y docencia. Estas asesorando a un profesor que esta aprendiendo ia y quiere aprender a plantear a hacer un prompt correcto para producir un cuestionario para su curso de educacion secundaria. Tienes que darle un feedback con sugerencias de mejora que puede aplicar hasta que encuentres que es un prompt satisfactorio y preciso`;

  try {
    const resp = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.DEEPSEEK_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "deepseek-chat", // Puedes cambiar a "deepseek-coder" si es más adecuado
        messages: [
          // ----- INICIO: Mensajes para la IA -----
          {
            role: "system",
            content: systemPrompt // <-- Aquí inyectamos las instrucciones generales
          },
          {
            role: "user",
            content: userPrompt // <-- Aquí va el prompt específico del profesor
          }
          // ----- FIN: Mensajes para la IA -----
        ]
        // ----- OPCIONAL: Puedes añadir otros parámetros aquí -----
        // temperature: 0.7, // Controla la creatividad (0=determinista, 1=más creativo)
        // max_tokens: 500, // Límite de longitud de la respuesta de la IA
        // ----- FIN OPCIONAL -----
      })
    });

    // Verifica si la respuesta de la API fue exitosa
    if (!resp.ok) {
      // Intenta leer el cuerpo del error para más detalles
      const errorBody = await resp.text();
      console.error(`Error ${resp.status} de la API DeepSeek: ${errorBody}`);
      return { statusCode: resp.status, body: `Error al contactar la IA: ${resp.statusText} - ${errorBody}` };
    }

    // Obtiene la respuesta de la IA
    // Usamos .json() si esperamos una estructura JSON, .text() si esperamos texto plano
    // La API de Chat Completions usualmente devuelve JSON
    const data = await resp.json();

    // Extrae el contenido de la respuesta de la IA (ajusta según la estructura real de 'data')
    // Revisa la documentación de DeepSeek para la estructura exacta, pero usualmente es algo así:
    const feedbackContent = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content
                             ? data.choices[0].message.content
                             : JSON.stringify(data); // Fallback si la estructura no es la esperada


    // Devuelve el feedback al frontend
    return {
      statusCode: 200,
      // Enviamos un objeto JSON al frontend para que sea más fácil de manejar
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: true, feedback: feedbackContent })
     };

  } catch (error) {
    console.error("Error en la función Netlify:", error);
    return {
       statusCode: 500,
       headers: { "Content-Type": "application/json" },
       body: JSON.stringify({ success: false, message: `Error interno del servidor: ${error.message}` })
      };
  }
}