// consulta.js – Backend Node.js para Deepseek (Usando Chat Completions)

// --- IMPORTACIONES (CommonJS) ---
const express = require('express');
const axios = require('axios');
const serverless = require('serverless-http');

// --- CONFIGURACIÓN ---
const DEEPSEEK_KEY = process.env.DEEPSEEK_KEY;
// ¡NUEVO ENDPOINT!
const DEEPSEEK_CHAT_API_URL = 'https://api.deepseek.com/v1/chat/completions';
// Modelo de Deepseek a usar (elige el adecuado, ej: deepseek-chat, deepseek-coder)
const DEEPSEEK_MODEL = 'deepseek-chat'; // <-- AJUSTA SI ES NECESARIO

if (!DEEPSEEK_KEY) {
  console.error("¡ERROR CRÍTICO! DEEPSEEK_KEY no definida.");
}

// --- APLICACIÓN EXPRESS ---
const app = express();
app.use(express.json());

// --- ROUTER ---
const router = express.Router();

// --- RUTA: /analyze (Paso 4: Evaluación Estructural vía Chat) ---
router.post('/analyze', async (req, res) => {
  if (!DEEPSEEK_KEY) return res.status(500).json({ error: 'Configuración incompleta (sin clave API)' });

  try {
    const { rol, objetivo, contexto } = req.body;
    if (!rol || !objetivo || !contexto) return res.status(400).json({ error: 'Faltan campos.' });

    const userPromptToAnalyze = `Rol: ${rol}\nObjetivo: ${objetivo}\nContexto: ${contexto}`;

    // **NUEVO: Prompt para el modelo de CHAT**
    const systemMessage = `Eres un experto en ingeniería de prompts. Evalúa la estructura del siguiente prompt proporcionado por el usuario. Considera si el Rol, Objetivo y Contexto son claros, específicos y útiles. Responde ÚNICAMENTE con un objeto JSON válido que contenga las claves "score" (número 0-100), "ok" (booleano true/false basado en si el prompt es estructuralmente bueno), y "suggestions" (string con una recomendación concisa en español, máximo 2 frases).`;
    const userMessage = `Evalúa este prompt:\n\n---\n${userPromptToAnalyze}\n---\n\nGenera el objeto JSON como se te indicó.`;

    const payload = {
      model: DEEPSEEK_MODEL,
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.2, // Baja temperatura para respuestas más consistentes/deterministas
      max_tokens: 150, // Suficiente para el JSON esperado
      // stream: false // Asegúrate que no esté en modo stream
    };

    console.log('[INFO] Enviando a Deepseek Chat (Analyze - Paso 4):', JSON.stringify(payload));

    const dsRes = await axios.post( DEEPSEEK_CHAT_API_URL, payload,
      { headers: { Authorization: `Bearer ${DEEPSEEK_KEY}`, 'Content-Type': 'application/json' }, timeout: 15000 } // Aumentamos timeout a 15s para chat
    );

    console.log('[INFO] Respuesta de Deepseek Chat (Analyze - Paso 4):', JSON.stringify(dsRes.data));

    // **NUEVO: Parsear respuesta del modelo de chat**
    const assistantResponse = dsRes.data?.choices?.[0]?.message?.content;
    if (!assistantResponse) throw new Error("Respuesta inesperada o vacía del modelo de chat.");

    console.log('[DEBUG] Contenido de respuesta del asistente:', assistantResponse);

    // Intentar parsear el JSON de la respuesta del asistente
    let evaluation = {};
    try {
        // Limpiar posible markdown de bloque de código si el modelo lo añade
        const cleanResponse = assistantResponse.replace(/```json\n?/, '').replace(/\n?```$/, '');
        evaluation = JSON.parse(cleanResponse);
    } catch (parseError) {
        console.error('[ERROR] Fallo al parsear JSON de la respuesta de Deepseek:', parseError);
        console.error('[ERROR] Respuesta recibida que falló el parseo:', assistantResponse);
        // Si falla el parseo, intentamos dar un feedback genérico basado en si la respuesta contiene palabras clave
        const suggestionsFallback = assistantResponse.toLowerCase().includes("mejorar") || assistantResponse.toLowerCase().includes("especificar") ? assistantResponse : "Revisa la estructura del prompt.";
        const okFallback = !(assistantResponse.toLowerCase().includes("mejorar") || assistantResponse.toLowerCase().includes("falta"));
        evaluation = { score: okFallback ? 70 : 30, ok: okFallback, suggestions: suggestionsFallback };
    }


    // Devolver al frontend asegurando que los campos existan
    res.json({
        suggestions: evaluation.suggestions || "No se pudieron generar sugerencias.",
        score: evaluation.score !== undefined ? Number(evaluation.score) : 50,
        ok: evaluation.ok !== undefined ? Boolean(evaluation.ok) : false
    });

  } catch (error) {
    console.error('--- ERROR DETALLADO en /analyze (Paso 4) ---'); /* ... logging ... */ console.error('Mensaje:', error.message);
    let errorMsg = 'Fallo en análisis de prompt con Deepseek Chat'; let statusCode = 500;
    if (error.response?.status === 401) { errorMsg = 'Error Auth Deepseek.'; statusCode = 401; }
    else if (error.response?.data?.error?.message) { errorMsg = error.response.data.error.message; statusCode = error.response.status || 500;}
    else if (error.code === 'ETIMEDOUT' || error.message.toLowerCase().includes('timeout')) { errorMsg = 'Timeout Deepseek Chat.'; statusCode = 504; }
    else { errorMsg = `Error inesperado: ${error.message}`; } // Captura otros errores
    res.status(statusCode).json({ error: errorMsg });
  }
});

// --- RUTA: /evaluate (Paso 5: Evaluación Alineación vía Chat) ---
router.post('/evaluate', async (req, res) => {
  if (!DEEPSEEK_KEY) return res.status(500).json({ error: 'Configuración incompleta (sin clave API)' });

  try {
    const { prompt: studentPrompt } = req.body;
    if (!studentPrompt?.trim()) return res.status(400).json({ error: 'Prompt vacío.' });

    const targetGoal = "Generar un cuestionario breve de 5 preguntas de opción múltiple sobre la Guerra del Pacífico para alumnos de secundaria.";

    // **NUEVO: Prompt para el modelo de CHAT**
    const systemMessage = `Eres un asistente pedagógico. Evalúa si el prompt del usuario está bien alineado con el siguiente objetivo: "${targetGoal}". Responde ÚNICAMENTE con un objeto JSON que contenga las claves "level" (string: "red", "yellow", o "green" basado en la alineación) y "feedback" (string: una sugerencia concisa en español, máximo 2 frases). Red si está mal alineado, Yellow si está parcialmente alineado o le falta claridad, Green si está bien alineado.`;
    const userMessage = `Evalúa la alineación del siguiente prompt con el objetivo:\n\n---\n${studentPrompt}\n---\n\nGenera el objeto JSON como se te indicó.`;

    const payload = {
      model: DEEPSEEK_MODEL,
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.2,
      max_tokens: 100, // Suficiente para level y feedback corto
      // stream: false
    };

    console.log('[INFO] Enviando a Deepseek Chat (Evaluate - Paso 5):', JSON.stringify(payload));

    const dsRes = await axios.post( DEEPSEEK_CHAT_API_URL, payload,
      { headers: { Authorization: `Bearer ${DEEPSEEK_KEY}`, 'Content-Type': 'application/json' }, timeout: 15000 } // Timeout 15s
    );

    console.log('[INFO] Respuesta de Deepseek Chat (Evaluate - Paso 5):', JSON.stringify(dsRes.data));

    // **NUEVO: Parsear respuesta del modelo de chat**
    const assistantResponse = dsRes.data?.choices?.[0]?.message?.content;
     if (!assistantResponse) throw new Error("Respuesta inesperada o vacía del modelo de chat.");

    console.log('[DEBUG] Contenido de respuesta del asistente:', assistantResponse);

    // Intentar parsear el JSON
    let evaluation = {};
     try {
         const cleanResponse = assistantResponse.replace(/```json\n?/, '').replace(/\n?```$/, '');
         evaluation = JSON.parse(cleanResponse);
     } catch (parseError) {
        console.error('[ERROR] Fallo al parsear JSON de la respuesta de Deepseek:', parseError);
        console.error('[ERROR] Respuesta recibida que falló el parseo:', assistantResponse);
        // Fallback si falla el parseo
        const levelFallback = assistantResponse.toLowerCase().includes("excelente") || assistantResponse.toLowerCase().includes("bien") ? "green" : (assistantResponse.toLowerCase().includes("casi") || assistantResponse.toLowerCase().includes("mejorar") ? "yellow" : "red");
        const feedbackFallback = assistantResponse.length < 150 ? assistantResponse : "La evaluación automática tuvo un problema. Intenta de nuevo o simplifica tu prompt."; // Evitar feedback muy largo si es la respuesta completa
        evaluation = { level: levelFallback, feedback: feedbackFallback };
    }

    // Validar nivel antes de enviar
    const validLevels = ['red', 'yellow', 'green'];
    const finalLevel = validLevels.includes(evaluation.level) ? evaluation.level : 'red'; // Default a red si es inválido

    // Devolver al frontend
    res.json({
        level: finalLevel,
        feedback: evaluation.feedback || "No se pudo generar feedback."
    });

  } catch (error) {
    console.error('--- ERROR DETALLADO en /evaluate (Paso 5) ---'); /* ... logging ... */ console.error('Mensaje:', error.message);
    let errorMsg = 'Fallo en evaluación de prompt con Deepseek Chat'; let statusCode = 500;
    if (error.response?.status === 401) { errorMsg = 'Error Auth Deepseek.'; statusCode = 401; }
    else if (error.response?.data?.error?.message) { errorMsg = error.response.data.error.message; statusCode = error.response.status || 500;}
    else if (error.code === 'ETIMEDOUT' || error.message.toLowerCase().includes('timeout')) { errorMsg = 'Timeout Deepseek Chat.'; statusCode = 504; }
     else { errorMsg = `Error inesperado: ${error.message}`; }
    res.status(statusCode).json({ error: errorMsg });
  }
});

// --- MONTAJE Y EXPORTACIÓN (CommonJS) ---
app.use('/api', router);
module.exports.handler = serverless(app);