// consulta.js – Backend Node.js para Deepseek (Usando Chat Completions) - Modificación para Ejercicio 1 (Solo Evaluación)

// --- IMPORTACIONES (CommonJS) ---
const express = require('express');
const axios = require('axios');
const serverless = require('serverless-http');

// --- CONFIGURACIÓN ---
const DEEPSEEK_KEY = process.env.DEEPSEEK_KEY;
// Endpoint para Chat Completions v1
const DEEPSEEK_CHAT_API_URL = 'https://api.deepseek.com/v1/chat/completions';
// Modelo de Deepseek a usar (elige el adecuado, ej: deepseek-chat, deepseek-coder)
const DEEPSEEK_MODEL = 'deepseek-chat'; // o 'deepseek-coder' si fuera el caso

if (!DEEPSEEK_KEY) {
  console.error("¡ERROR CRÍTICO! DEEPSEEK_KEY no definida. Asegúrate de que la variable de entorno DEEPSEEK_KEY esté configurada.");
}

// --- AYUDANTE para llamar a Deepseek Chat API ---
// Encapsula la lógica de llamada, headers, timeout y manejo básico de respuesta/errores.
async function callDeepseekChat(systemMessage, userMessage, temperature = 0.2, max_tokens = 200) {
    if (!DEEPSEEK_KEY) {
        console.error('callDeepseekChat: DEEPSEEK_KEY no está definida.');
        throw new Error('Configuración incompleta (sin clave API Deepseek).');
    }

    const messages = [];
    if (systemMessage) messages.push({ role: 'system', content: systemMessage });
    if (userMessage) messages.push({ role: 'user', content: userMessage });

    if (messages.length === 0) {
        throw new Error('No messages provided to Deepseek Chat API helper.');
    }

    const payload = {
        model: DEEPSEEK_MODEL,
        messages: messages,
        temperature: temperature,
        max_tokens: max_tokens,
    };

    console.log('[INFO] Enviando a Deepseek Chat:', JSON.stringify({
        model: payload.model,
        temp: payload.temperature,
        tokens: payload.max_tokens,
        messagesCount: messages.length,
        // Avoid logging full prompt content in case it's sensitive
        // systemPreview: systemMessage ? systemMessage.substring(0, 100) + '...' : 'none',
        // userPreview: userMessage ? userMessage.substring(0, 100) + '...' : 'none'
    }));


    try {
        const dsRes = await axios.post(
            DEEPSEEK_CHAT_API_URL,
            payload,
            {
                headers: {
                    Authorization: `Bearer ${DEEPSEEK_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 25000 // Increased timeout slightly to 25s as per observed issues
            }
        );

        // console.log('[INFO] Respuesta bruta de Deepseek Chat:', JSON.stringify(dsRes.data)); // Log with caution for verbosity

        const assistantResponse = dsRes.data?.choices?.[0]?.message?.content;
        if (assistantResponse === undefined || assistantResponse === null) {
             console.error('[ERROR] Respuesta de Deepseek no contiene message.content:', dsRes.data);
             // Check if there's an error message in the response itself
             if (dsRes.data?.error?.message) {
                 throw new Error(`Error del modelo Deepseek: ${dsRes.data.error.message}`);
             }
             throw new Error("Respuesta vacía o inesperada del modelo de chat.");
         }

        console.log('[DEBUG] Contenido de respuesta del asistente (preview):', assistantResponse.substring(0, 200) + (assistantResponse.length > 200 ? '...' : ''));
        return assistantResponse;

    } catch (error) {
        console.error('--- ERROR DETALLADO en callDeepseekChat ---');
        console.error('Mensaje:', error.message);
        if (axios.isAxiosError(error)) {
            if (error.response) {
                console.error('Status:', error.response.status);
                console.error('Data:', error.response.data);
                // console.error('Headers:', error.response.headers); // Log with caution
                // Propagate Deepseek's specific error message if available
                 if (error.response.data?.error?.message) {
                     const dsError = new Error(`Deepseek API Error ${error.response.status}: ${error.response.data.error.message}`);
                     dsError.statusCode = error.response.status; // Attach status for route handler
                     dsError.data = error.response.data; // Attach data for route handler
                     throw dsError;
                 }
            } else if (error.request) {
                console.error('No se recibió respuesta de Deepseek.');
                 const timeoutError = new Error('Timeout o No Response de Deepseek Chat.');
                 timeoutError.statusCode = 504; // Gateway Timeout
                 throw timeoutError;
            } else {
                 console.error('Error al preparar la petición a Deepseek:', error.message);
            }
        } else {
             console.error('Error no-Axios en callDeepseekChat:', error);
        }
        throw error; // Re-throw the original or a wrapped error
    }
}


// --- APLICACIÓN EXPRESS ---
const app = express();
app.use(express.json());

// --- ROUTER ---
const router = express.Router();


// --- RUTA: /generate (Para Ejercicios 2 & 3 - Generación General) ---
// Mantida igual que en la versión corregida anterior
router.post('/generate', async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt?.trim()) {
            return res.status(400).json({ error: 'Prompt vacío.' });
        }

        // System message para generación general
        const systemMessage = "Eres un asistente útil que responde a las instrucciones del usuario.";

        // Llamar a la API para generación usando el helper
        const generatedText = await callDeepseekChat(systemMessage, prompt, 0.5, 300); // Adjust temp/tokens as needed

        // Devolver el texto generado
        res.json({ text: generatedText });

    } catch (error) {
        console.error('--- ERROR DETALLADO en /generate ---');
        console.error('Mensaje:', error.message);
        let errorMsg = 'Fallo en generación con Deepseek Chat';
        let statusCode = error.statusCode || 500; // Use attached status code if available

        if (axios.isAxiosError(error) && error.response?.data?.error?.message) {
             errorMsg = error.response.data.error.message;
        } else if (error.message.toLowerCase().includes('timeout')) {
             errorMsg = 'Timeout Deepseek Chat.';
        } else {
             errorMsg = `Error inesperado: ${error.message}`;
        }


        res.status(statusCode).json({ error: errorMsg });
    }
});


// --- INICIO MODIFICACIÓN: RUTA /exercise1_process (Solo Evaluación de Prompt + Explicación) ---
router.post('/exercise1_process', async (req, res) => {
    try {
        const { prompt: fullInput } = req.body;
        if (!fullInput?.trim()) {
            return res.status(400).json({ error: 'Contenido vacío. Introduce tu prompt y el texto (aunque solo se evaluará el prompt).' });
        }

        // 1. Separar instrucción del texto a procesar
        // Mantenemos esta lógica porque la EVALUACIÓN se basa en la 'instruction'.
        const separatorIndex = fullInput.indexOf(':');
        let instruction = fullInput.trim();
        let sourceText = ''; // Ya no usaremos sourceText para generar, pero lo separamos igualmente.

        if (separatorIndex !== -1) {
            instruction = fullInput.substring(0, separatorIndex).trim();
            sourceText = fullInput.substring(separatorIndex + 1).trim();
        }
        // Si no hay ":", se asume que todo el input es la instrucción.

        if (!instruction) {
             // Ajustamos el mensaje de error ya que ahora nos centramos en la instrucción.
             return res.status(400).json({ error: 'No se encontró la instrucción (¿Falta el prompt o el separador ":"?).' });
        }
        // sourceText puede estar vacío, lo cual es válido para la evaluación.

        // --- ELIMINADO: La llamada a la IA para GENERAR la respuesta (el resumen para padres) ---
        // const generationSystemMessage = `...`;
        // const generationUserMessage = `...`;
        // const generatedText = await callDeepseekChat(generationSystemMessage, generationUserMessage, 0.5, 200);
        // --- FIN ELIMINADO ---


        // 2. Llamar a la IA para EVALUAR el prompt del usuario (la 'instruction')
        // Mantenemos este System Message y User Message, ya que son para la evaluación del prompt
        const evaluationSystemMessage = `
        Eres un profesor de IA especializado en diseño de prompts educativos.
        Tu tarea es evaluar la calidad de la *instrucción* que te da un profesor para que tú (como IA) resumas un texto para padres.
        Evalúa la instrucción basándote en:
        - Claridad y especificidad de la tarea (¿se entiende qué hacer?).
        - Inclusión de la audiencia (¿menciona "padres" o similar?).
        - Solicitud de tono (¿pide un tono amable, claro, etc.?).
        - Petición de formato/extensión (¿pide un resumen, en X palabras/líneas?).

        
        Responde ÚNICAMENTE con un objeto JSON válido con el "feedback" (string).
        `;
         const evaluationUserMessage = `Evalúa esta instrucción para resumir texto para padres:\n\n---\n${instruction}\n---`;

         // Mantenemos la llamada a la IA para la evaluación
         let evaluationResponseContent = await callDeepseekChat(evaluationSystemMessage, evaluationUserMessage, 0.2, 100); // Low temperature, few tokens for evaluation JSON

         // Intentar parsear el JSON de la respuesta de evaluación
        let evaluation = { score: 0, feedback: "Error al procesar evaluación." };
        try {
            // Limpiar posible markdown de bloque de código
            const cleanEvaluationResponse = evaluationResponseContent.replace(/```json\n?/, '').replace(/\n?```$/, '').trim();
             evaluation = JSON.parse(cleanEvaluationResponse);

            // Validar estructura mínima
            if (typeof evaluation.score !== 'number' || typeof evaluation.feedback !== 'string') {
                 console.error('[ERROR] JSON de evaluación con formato inesperado:', evaluation);
                 // Fallback si el JSON es inválido pero hubo respuesta
                 const fallbackFeedback = evaluationResponseContent.length > 5 && evaluationResponseContent.length < 150 ? evaluationResponseContent : "Error: Formato de evaluación inesperado de la IA. Revisa tu prompt.";
                 evaluation = { score: 20, feedback: `[FALLBACK] ${fallbackFeedback}` };
            } else {
                // Clamp score to 0-100
                evaluation.score = Math.max(0, Math.min(100, evaluation.score));
            }

        } catch (parseError) {
            console.error('[ERROR] Fallo al parsear JSON de la respuesta de evaluación:', parseError);
            console.error('[ERROR] Respuesta de evaluación que falló el parseo:', evaluationResponseContent);
            // Fallback robusto si falla el parseo
            const feedbackFallback = evaluationResponseContent.length > 5 && evaluationResponseContent.length < 200 ? evaluationResponseContent : "Error interno al evaluar el prompt. Intenta de nuevo.";
            evaluation = { score: 10, feedback: `[FALLBACK] ${feedbackFallback}` }; // Very low score on parse error
        }

        // 3. Crear una explicación simple basada en el score
        let explanation = "";
        if (evaluation.score >= 80) {
            explanation = "¡Excelente! Tu instrucción es muy clara y específica para la IA.";
        } else if (evaluation.score >= 50) {
            explanation = "Bien, pero hay aspectos a mejorar. Revisa el feedback para hacer tu instrucción más efectiva.";
        } else {
            explanation = "Tu instrucción necesita más detalles. Revisa el feedback para guiar mejor a la IA.";
        }


        // 4. Devolver solo el resultado de la evaluación y la explicación al frontend
        res.json({
            evaluation: evaluation, // Objeto con score y feedback de la IA
            explanation: explanation // String con la explicación simple basada en el score
        });

    } catch (error) {
        console.error('--- ERROR DETALLADO en /exercise1_process ---');
        console.error('Mensaje:', error.message);
        let errorMsg = 'Fallo en el proceso de evaluación del prompt con Deepseek Chat';
        let statusCode = error.statusCode || 500; // Use attached status code if available

         if (axios.isAxiosError(error) && error.response?.data?.error?.message) {
             errorMsg = error.response.data.error.message;
         } else if (error.message.toLowerCase().includes('timeout') || error.message.toLowerCase().includes('no response')) {
             errorMsg = 'Timeout Deepseek Chat.';
             statusCode = 504; // Ensure 504 for timeouts/no response
        } else {
             errorMsg = `Error inesperado: ${error.message}`;
        }

        // Enviar una respuesta de error estructurada al frontend
        res.status(statusCode).json({
            // Para errores de backend, podemos enviar un resultado de evaluación básico indicando el fallo
            evaluation: { score: 0, feedback: `Error interno al evaluar el prompt: ${errorMsg}` },
            explanation: `No se pudo completar la evaluación debido a un error: ${errorMsg}. Intenta de nuevo más tarde.`,
            error: errorMsg // Mensaje de error detallado para depuración
        });
    }
});
// --- FIN MODIFICACIÓN: RUTA /exercise1_process ---


// --- RUTA: /analyze (Paso 4: Evaluación Estructural vía Chat) ---
// Mantida igual que en la versión corregida anterior
router.post('/analyze', async (req, res) => {
  // La verificación de clave API ya está en callDeepseekChat, pero la dejamos aquí también por claridad.
  if (!DEEPSEEK_KEY) return res.status(500).json({ error: 'Configuración incompleta (sin clave API)' });

  try {
    const { rol, objetivo, contexto } = req.body;
    if (!rol || !objetivo || !contexto) return res.status(400).json({ error: 'Faltan campos.' });

    const userPromptToAnalyze = `Rol: ${rol}\nObjetivo: ${objetivo}\nContexto: ${contexto}`;

    // **System Message COPIADO EXACTAMENTE del archivo que funciona (consulta.js /analyze)**
    const systemMessage = `
    Eres un tutor experto en **Prompt Design Pedagógico**. Tu objetivo es ayudar a un estudiante a construir prompts efectivos y originales para tareas educativas, evaluando la **estructura (Rol, Objetivo, Contexto)** que ha definido.

    **Tarea Específica del Estudiante (Contexto Implícito):** El estudiante debe definir un Rol, Objetivo y Contexto para que una IA genere una **actividad de clase sobre redes sociales y estudiantes**.

    **Instrucciones Detalladas para tu Evaluación:**

    1.  **Originalidad y Esfuerzo:**
        *   **Penalización por Copia:** Compara el 'Objetivo' proporcionado por el estudiante con la tarea específica mencionada arriba ("crear una actividad en clase sobre las redes sociales y los estudiantes"). Si el objetivo es una copia casi idéntica o muy superficial de esta tarea, **asigna un score bajo (ej. < 40)** y en las \`suggestions\` indica claramente que debe **reformular el objetivo con sus propias palabras**, añadiendo detalles específicos sobre *qué tipo* de actividad quiere, para *qué nivel* de estudiantes, o *qué aspecto* de las redes sociales abordar. **No aceptes la simple repetición de la tarea.**
        *   **Fomenta la Especificidad:** Incluso si no es una copia directa, valora positivamente (mayor score) cuando el estudiante añade detalles únicos al Rol, Objetivo o Contexto que van más allá del enunciado básico.

    2.  **Análisis Estructural (Rol, Objetivo, Contexto):**
        *   **Rol:** ¿Define un actor claro para la IA (profesor, diseñador instruccional, experto en redes sociales, etc.)? ¿Es relevante para crear una actividad de clase? Un rol genérico es aceptable, pero uno específico es mejor.
        *   **Objetivo:** Aparte de la originalidad, ¿Describe *qué* se debe generar (un debate, una lista de preguntas, un caso de estudio, un proyecto, etc.)? ¿Menciona el *formato* o *extensión*? ¿Define el *propósito* de la actividad?
        *   **Contexto:** ¿Aporta detalles cruciales? (Ej: nivel educativo (secundaria, universidad), asignatura, tiempo disponible para la actividad, enfoque específico (privacidad, fake news, bienestar), herramientas disponibles, restricciones). ¿Ayuda a la IA a entender *cómo* debe ser la actividad?

    3.  **Calidad del Feedback (Suggestions):**
        *   **Constructivo y Accionable:** El feedback debe ser siempre útil. En lugar de solo decir "mal", explica *por qué* y *cómo* mejorar.
        *   **Enfocado en lo Próximo:** Si hay varios puntos débiles, céntrate en la mejora más importante o la más fácil de implementar para el estudiante.
        *   **Tono Didáctico:** Usa un lenguaje claro, alentador y orientado al aprendizaje. Evita jerga técnica innecesaria.
        *   **Ejemplos (Opcional Breve):** Si es relevante, puedes incluir un micro-ejemplo en las sugerencias, ej: "Intenta un objetivo como: 'Diseña una actividad de debate de 30 min para 10mo grado sobre los pros y contras del uso de Instagram'".

    **Formato de Salida Obligatorio (JSON Estricto):**
    Responde **únicamente** con un objeto JSON válido, sin texto adicional. El objeto debe tener las siguientes claves:
    *   \`"score"\`: Número entero 0-100. Penaliza fuertemente la copia del enunciado (<40). Valora la especificidad y coherencia.
    *   \`"ok"\`: Booleano. \`true\` si score >= 50, \`false\` si score < 50.
    *   \`"suggestions"\`: String en español (máx. 3 frases). Debe ser accionable y didáctico. Si el score es bajo por copia, debe indicarlo claramente. Si es alto (>85), puede ser un elogio con una sugerencia menor opcional.

    **Ejemplo Salida (Caso Copia):**
    \`\`\`json
    {
      "score": 35,
      "ok": false,
      "suggestions": "Parece que copiaste el enunciado de la tarea. Reformula el objetivo con tus propias palabras, especificando qué tipo de actividad quieres (debate, proyecto, etc.) y para qué nivel."
    }
    \`\`\`

     **Ejemplo Salida (Bueno pero Mejorable):**
    \`\`\`json
    {
      "score": 70,
      "ok": true,
      "suggestions": "Buena estructura base. Para mejorar, define más el 'Rol' (¿eres tú el profesor?) y añade detalles en 'Contexto' como el tiempo disponible o el curso específico."
    }
    \`\`\`

    Ahora, evalúa el prompt del usuario (Rol, Objetivo, Contexto) basado en estas instrucciones detalladas. Recuerda penalizar la copia del objetivo general de la tarea
    `; // Fin systemMessage /analyze

    // **User Message COPIADO EXACTAMENTE del archivo que funciona (consulta.js /analyze)**
    const userMessage = `
    Evalúa la estructura de este prompt (Rol, Objetivo, Contexto):
    ---
    ${userPromptToAnalyze}
    ---
    Genera el objeto JSON de evaluación como se te indicó en las instrucciones del sistema.
    `;

    // Usamos el helper con los parámetros de la versión que funciona
    const assistantResponse = await callDeepseekChat(systemMessage, userMessage, 0.2, 150);

    // Intentar parsear el JSON de la respuesta del asistente
    let evaluation = {};
    try {
        const cleanResponse = assistantResponse.replace(/```json\n?/, '').replace(/\n?```$/, '').trim();
        evaluation = JSON.parse(cleanResponse);
        if (typeof evaluation.score !== 'number' || typeof evaluation.ok !== 'boolean' || typeof evaluation.suggestions !== 'string') {
             console.error('[ERROR] JSON de evaluación (analyze) con formato inesperado:', evaluation);
              // Fallback si el JSON es inválido pero hubo respuesta
             const fallbackSuggestions = assistantResponse.length > 5 && assistantResponse.length < 150 ? assistantResponse : "Error: Formato de evaluación inesperado de la IA. Revisa tu prompt.";
             evaluation = { score: 20, ok: false, suggestions: `[FALLBACK] ${fallbackSuggestions}` };
        } else {
             evaluation.score = Math.max(0, Math.min(100, evaluation.score)); // Clamp score
        }

    } catch (parseError) {
        console.error('[ERROR] Fallo al parsear JSON de la respuesta de Deepseek (analyze):', parseError);
        console.error('[ERROR] Respuesta recibida que falló el parseo:', assistantResponse);
        // Fallback robusto si falla el parseo
        const suggestionsFallback = assistantResponse.length > 5 && assistantResponse.length < 200 ? assistantResponse : "Error interno al evaluar el prompt. Intenta de nuevo.";
        const okFallback = !(suggestionsFallback.toLowerCase().includes("mejorar") || suggestionsFallback.toLowerCase().includes("falta") || suggestionsFallback.toLowerCase().includes("error"));
        evaluation = { score: okFallback ? 70 : 30, ok: okFallback, suggestions: `[FALLBACK] ${suggestionsFallback}` };
    }

    // Devolver al frontend asegurando que los campos existan
    res.json({
        suggestions: evaluation.suggestions || "No se pudieron generar sugerencias.",
        score: evaluation.score !== undefined ? Number(evaluation.score) : 50, // Default a 50 si el score es undefined
        ok: evaluation.ok !== undefined ? Boolean(evaluation.ok) : false // Default a false si ok es undefined
    });

  } catch (error) {
    console.error('--- ERROR DETALLADO en /analyze (Paso 4) ---');
    console.error('Mensaje:', error.message);
    let errorMsg = 'Fallo en análisis de prompt con Deepseek Chat';
    let statusCode = error.statusCode || 500; // Use attached status code if available

    if (axios.isAxiosError(error) && error.response?.data?.error?.message) {
        errorMsg = error.response.data.error.message;
    } else if (error.message.toLowerCase().includes('timeout')) {
        errorMsg = 'Timeout Deepseek Chat.';
    } else {
        errorMsg = `Error inesperado: ${error.message}`;
    }

    // Enviar una respuesta de error estructurada al frontend
    res.status(statusCode).json({
         // Para errores de backend, el resultado para el alumno es siempre rojo
        level: 'red', // Esto es más para la ruta /evaluate, pero lo incluimos aquí por consistencia si el frontend lo espera
        feedback: `Error al evaluar tu prompt: ${errorMsg}. Intenta de nuevo más tarde.`, // Mensaje de error al usuario
        error: errorMsg // Mensaje de error detallado para depuración
    });
  }
});

// --- RUTA: /evaluate (Paso 5: Evaluación Alineación vía Chat) ---
// Mantida igual que en la versión corregida anterior
router.post('/evaluate', async (req, res) => {
  // La verificación de clave API ya está en callDeepseekChat, pero la dejamos aquí también por claridad.
  if (!DEEPSEEK_KEY) return res.status(500).json({ error: 'Configuración incompleta (sin clave API)' });

  try {
    // Capturamos el prompt COMPLETO que el estudiante escribió en el textarea del Paso 5
    const { prompt: studentPrompt } = req.body;
    if (!studentPrompt?.trim()) return res.status(400).json({ error: 'Prompt vacío.' });

    // Definimos el objetivo específico del reto para que la IA lo tenga presente
    const targetGoal = "Generar un cuestionario breve de 5 preguntas de opción múltiple sobre la Guerra del Pacífico para alumnos de secundaria.";

    // **System Message COPIADO EXACTAMENTE del archivo que funciona (consulta.js /evaluate)**
    const systemMessage = `Eres un asistente pedagógico. Evalúa si el prompt del usuario está bien alineado con el siguiente objetivo: "${targetGoal}". Responde ÚNICAMENTE con un objeto JSON que contenga las claves "level" (string: "red", "yellow", o "green" basado en la alineación) y "feedback" (string: una sugerencia concisa en español, máximo 2 frases). Red si está mal alineado, Yellow si está parcialmente alineado o le falta claridad, Green si está bien alineado.`; // Fin del systemMessage para Paso 5

    // **User Message COPIADO EXACTAMENTE del archivo que funciona (consulta.js /evaluate)**
    // Envuelve el prompt del estudiante para darle contexto a la IA
    const userMessage = `Evalúa la alineación del siguiente prompt con el objetivo:\n\n---\n${studentPrompt}\n---\n\nGenera el objeto JSON como se te indicó.`;

    // Usamos el helper con los parámetros de la versión que funciona (temp 0.2, max_tokens 100)
    const assistantResponse = await callDeepseekChat(systemMessage, userMessage, 0.2, 100);

    // Intentar parsear el JSON esperado { "level": "...", "feedback": "..." }
    let evaluation = {};
     try {
         // Limpiar posible markdown de bloque de código (```json)
         const cleanResponse = assistantResponse.replace(/```json\n?/, '').replace(/\n?```$/, '').trim();
         evaluation = JSON.parse(cleanResponse);

         // Validar que las claves esperadas existan después del parseo
         if (typeof evaluation.level !== 'string' || typeof evaluation.feedback !== 'string') {
              console.error('[ERROR] JSON de evaluación (evaluate) con formato inesperado:', evaluation);
              // Fallback si el JSON es inválido pero hubo respuesta
              const fallbackFeedback = assistantResponse.length > 5 && assistantResponse.length < 150 ? assistantResponse : "Error: Formato de evaluación inesperado de la IA. Revisa tu prompt.";
              evaluation = { level: 'red', feedback: `[FALLBACK] ${fallbackFeedback}` };
          }

     } catch (parseError) {
        console.error('[ERROR] Fallo al parsear/validar JSON de la respuesta de Deepseek (Paso 5):', parseError);
        console.error('[ERROR] Respuesta recibida que falló el parseo:', assistantResponse);
        // Fallback robusto si falla el parseo o validación del JSON
        const feedbackFallback = assistantResponse.length > 5 && assistantResponse.length < 200 ? assistantResponse : "La evaluación automática tuvo un problema. Revisa tu prompt."; // Usar la respuesta cruda si no es muy larga
        const lowerCaseFeedback = feedbackFallback.toLowerCase();

        // Intentar determinar el nivel basado en palabras clave si el JSON falla
        const levelFallback = lowerCaseFeedback.includes("excelente") || lowerCaseFeedback.includes("verde") || lowerCaseFeedback.includes("cumple") ? "green" :
                              (lowerCaseFeedback.includes("mejorar") || lowerCaseFeedback.includes("amarillo") || lowerCaseFeedback.includes("falta") || lowerCaseFeedback.includes("poco claro") ? "yellow" : "red");

        evaluation = { level: levelFallback, feedback: `[FALLBACK] ${feedbackFallback}` }; // Prefijo para indicar fallback
    }

    // Asegurar que el nivel sea siempre uno de los válidos ('red', 'yellow', 'green')
    const validLevels = ['red', 'yellow', 'green'];
    const finalLevel = validLevels.includes(evaluation.level?.toLowerCase()) ? evaluation.level.toLowerCase() : 'red'; // Default a red si es inválido o level era nulo/undefined

    // Devolver al frontend
    res.json({
        level: finalLevel,
        feedback: evaluation.feedback || "No se pudo generar feedback."
    });

  } catch (error) {
    console.error('--- ERROR DETALLADO en /evaluate (Paso 5) ---');
    console.error('Mensaje:', error.message);
    let errorMsg = 'Fallo en evaluación de prompt con Deepseek Chat';
    let statusCode = error.statusCode || 500; // Use attached status code from helper if available

    if (axios.isAxiosError(error)) { // Manejar errores de Axios específicamente
        if (error.response) {
            // El servidor Deepseek respondió con un status code fuera del 2xx
            errorMsg = error.response.data?.error?.message || `Error HTTP ${error.response.status} de Deepseek`;
            statusCode = error.response.status;
            console.error('Respuesta de error de Deepseek:', error.response.data);
        } else if (error.request) {
            // La petición fue hecha pero no se recibió respuesta
             errorMsg = 'No se recibió respuesta de Deepseek.';
             statusCode = 503; // Service Unavailable - O 504 si es timeout específico
             console.error('No se recibió respuesta de Deepseek:', error.request);
        } else {
            // Algo pasó al configurar la petición
             errorMsg = `Error al preparar la petición a Deepseek: ${error.message}`;
             statusCode = 500;
             console.error('Error de Axios al preparar petición:', error.message);
        }
    } else if (error.code === 'ETIMEDOUT' || error.message.toLowerCase().includes('timeout') || error.message.toLowerCase().includes('no response')) {
       errorMsg = 'Tiempo de espera agotado con Deepseek Chat.';
       statusCode = 504; // Gateway Timeout
    }
     else {
        // Otros errores inesperados
         errorMsg = `Error inesperado: ${error.message}`;
         statusCode = 500;
     }

    // Enviar una respuesta de error estructurada al frontend
    res.status(statusCode).json({
        level: 'red', // En caso de error del backend, el resultado para el alumno es siempre rojo
        feedback: `Error al evaluar tu prompt: ${errorMsg}. Intenta de nuevo más tarde.`,
        error: errorMsg // Opcional: enviar el mensaje de error detallado para depuración
    });
  }
});


// --- MONTAJE Y EXPORTACIÓN (CommonJS) ---
app.use('/api', router);
module.exports.handler = serverless(app);