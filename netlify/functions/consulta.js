// consulta.js – Backend Node.js para Deepseek (Usando Chat Completions)

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
  console.error("¡ERROR CRÍTICO! DEEPSEEK_KEY no definida.");
}

// --- AYUDANTE para llamar a Deepseek Chat API ---
async function callDeepseekChat(systemMessage, userMessage, temperature = 0.7, max_tokens = 500) {
    if (!DEEPSEEK_KEY) {
        throw new Error('Configuración incompleta (sin clave API)');
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

    console.log('[INFO] Enviando a Deepseek Chat:', JSON.stringify(payload));

    try {
        const dsRes = await axios.post(
            DEEPSEEK_CHAT_API_URL,
            payload,
            {
                headers: {
                    Authorization: `Bearer ${DEEPSEEK_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 25000 // Increased timeout for potentially longer generations/evaluations
            }
        );

        console.log('[INFO] Respuesta bruta de Deepseek Chat:', JSON.stringify(dsRes.data));

        const assistantResponse = dsRes.data?.choices?.[0]?.message?.content;
        if (assistantResponse === undefined) { // Check for undefined specifically
             console.error('[ERROR] Respuesta de Deepseek no contiene message.content:', dsRes.data);
             throw new Error("Respuesta vacía o inesperada del modelo de chat.");
         }

        console.log('[DEBUG] Contenido de respuesta del asistente:', assistantResponse);
        return assistantResponse;

    } catch (error) {
        console.error('--- ERROR DETALLADO en callDeepseekChat ---');
        console.error('Mensaje:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
            console.error('Headers:', error.response.headers);
        } else if (error.request) {
            console.error('Request data:', error.request);
        } else {
             console.error('Error config:', error.config);
        }
        throw error; // Re-throw the error to be caught by the route handler
    }
}


// --- APLICACIÓN EXPRESS ---
const app = express();
app.use(express.json());

// --- ROUTER ---
const router = express.Router();


// --- NUEVA RUTA: /generate (Para Ejercicios 2 & 3 - Generación General) ---
router.post('/generate', async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt?.trim()) {
            return res.status(400).json({ error: 'Prompt vacío.' });
        }

        // System message para generación general
        const systemMessage = "Eres un asistente útil que responde a las instrucciones del usuario.";

        // Llamar a la API para generación
        const generatedText = await callDeepseekChat(systemMessage, prompt, 0.7, 800); // Adjust temp/tokens as needed

        // Devolver el texto generado
        res.json({ text: generatedText });

    } catch (error) {
        console.error('--- ERROR DETALLADO en /generate ---');
        console.error('Mensaje:', error.message);
        let errorMsg = 'Fallo en generación con Deepseek Chat';
        let statusCode = 500;

        if (error.response?.status) statusCode = error.response.status;
        if (error.response?.data?.error?.message) errorMsg = error.response.data.error.message;
        else if (error.message.toLowerCase().includes('timeout')) errorMsg = 'Timeout Deepseek Chat.';
        else errorMsg = `Error inesperado: ${error.message}`;

        res.status(statusCode).json({ error: errorMsg });
    }
});


// --- NUEVA RUTA: /exercise1_process (Para Ejercicio 1 - Generación + Evaluación de Prompt) ---
router.post('/exercise1_process', async (req, res) => {
    try {
        const { prompt: fullInput } = req.body;
        if (!fullInput?.trim()) {
            return res.status(400).json({ error: 'Contenido vacío. Introduce tu prompt y el texto.' });
        }

        // 1. Separar instrucción del texto a procesar
        const separatorIndex = fullInput.indexOf(':');
        let instruction = fullInput.trim();
        let sourceText = '';

        if (separatorIndex !== -1) {
            instruction = fullInput.substring(0, separatorIndex).trim();
            sourceText = fullInput.substring(separatorIndex + 1).trim();
        }
         // If no colon, treat the whole thing as the instruction and try to process it without source text.
         // This might lead to a poor AI response, but the evaluation will catch it.

        if (!instruction) {
             return res.status(400).json({ error: 'No se encontró la instrucción (¿Falta el prompt o el separador ":"?).' });
        }
        // Source text can be empty, which is valid for some prompts.

        // 2. Llamar a la IA para GENERAR la respuesta (el resumen para padres)
        const generationSystemMessage = `
        Eres un asistente útil que resume y adapta textos educativos para padres.
        Tu tarea es seguir la instrucción proporcionada para procesar el texto dado.
        Responde directamente con el texto generado, sin preámbulos ni explicaciones adicionales.
        `;
        const generationUserMessage = `
        Instrucción: ${instruction}
        Texto a procesar: ${sourceText}
        `;

        const generatedText = await callDeepseekChat(generationSystemMessage, generationUserMessage, 0.5, 200); // Moderate temperature, lower tokens for summary


        // 3. Llamar a la IA para EVALUAR el prompt del usuario (la 'instruction')
        const evaluationSystemMessage = `
        Eres un profesor de IA especializado en diseño de prompts educativos.
        Tu tarea es evaluar la calidad de la *instrucción* que te da un profesor para que tú (como IA) resumas un texto para padres.
        Evalúa la instrucción basándote en:
        - Claridad y especificidad de la tarea (¿se entiende qué hacer?).
        - Inclusión de la audiencia (¿menciona "padres" o similar?).
        - Solicitud de tono (¿pide un tono amable, claro, etc.?).
        - Petición de formato/extensión (¿pide un resumen, en X palabras/líneas?).

        Asigna un score de 0 a 100. Un score alto significa que la instrucción es muy clara, específica, y considera la audiencia y el formato deseado. Un score bajo significa que es vaga, genérica o le faltan elementos clave.
        Proporciona una sugerencia de mejora concisa (máximo 2 frases).
        Responde ÚNICAMENTE con un objeto JSON válido con las claves "score" (integer 0-100) y "feedback" (string).
        `;
         const evaluationUserMessage = `Evalúa esta instrucción para resumir texto para padres:\n\n---\n${instruction}\n---`;

         let evaluationResponseContent = await callDeepseekChat(evaluationSystemMessage, evaluationUserMessage, 0.2, 150); // Low temperature, few tokens for evaluation JSON

         // Intentar parsear el JSON de la respuesta de evaluación
        let evaluation = { score: 0, feedback: "Error al procesar evaluación." };
        try {
            // Limpiar posible markdown de bloque de código
            const cleanEvaluationResponse = evaluationResponseContent.replace(/```json\n?/, '').replace(/\n?```$/, '');
             evaluation = JSON.parse(cleanEvaluationResponse);

            // Validar estructura mínima
            if (typeof evaluation.score !== 'number' || typeof evaluation.feedback !== 'string') {
                 console.error('[ERROR] JSON de evaluación con formato inesperado:', evaluation);
                 evaluation = { score: 20, feedback: "Error: Formato de evaluación inesperado de la IA. Revisa tu prompt." };
            } else {
                // Clamp score to 0-100
                evaluation.score = Math.max(0, Math.min(100, evaluation.score));
            }

        } catch (parseError) {
            console.error('[ERROR] Fallo al parsear JSON de la respuesta de evaluación:', parseError);
            console.error('[ERROR] Respuesta de evaluación que falló el parseo:', evaluationResponseContent);
            evaluation = { score: 10, feedback: "Error interno al evaluar el prompt. Intenta de nuevo." }; // Very low score on parse error
        }


        // 4. Devolver ambos resultados al frontend
        res.json({
            generatedText: generatedText,
            evaluation: evaluation
        });

    } catch (error) {
        console.error('--- ERROR DETALLADO en /exercise1_process ---');
        console.error('Mensaje:', error.message);
        let errorMsg = 'Fallo en el proceso del ejercicio 1 con Deepseek Chat';
        let statusCode = 500;

        if (error.response?.status) statusCode = error.response.status;
        if (error.response?.data?.error?.message) errorMsg = error.response.data.error.message;
         else if (error.message.toLowerCase().includes('timeout')) errorMsg = 'Timeout Deepseek Chat.';
        else errorMsg = `Error inesperado: ${error.message}`;

        res.status(statusCode).json({ error: errorMsg });
    }
});


// --- RUTAS EXISTENTES (Paso 4 & 5) - Mantener por si se usan en otras partes ---
router.post('/analyze', async (req, res) => {
  if (!DEEPSEEK_KEY) return res.status(500).json({ error: 'Configuración incompleta (sin clave API)' });

  try {
    const { rol, objetivo, contexto } = req.body;
    if (!rol || !objetivo || !contexto) return res.status(400).json({ error: 'Faltan campos.' });

    const userPromptToAnalyze = `Rol: ${rol}\nObjetivo: ${objetivo}\nContexto: ${contexto}`;

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
    `;
    const userMessage = `
    Evalúa la estructura de este prompt (Rol, Objetivo, Contexto):
    ---
    ${userPromptToAnalyze}
    ---
    Genera el objeto JSON de evaluación como se te indicó en las instrucciones del sistema.
    `;

    const assistantResponse = await callDeepseekChat(systemMessage, userMessage, 0.2, 150);


    // Intentar parsear el JSON de la respuesta del asistente
    let evaluation = {};
    try {
        const cleanResponse = assistantResponse.replace(/```json\n?/, '').replace(/\n?```$/, '');
        evaluation = JSON.parse(cleanResponse);
        if (typeof evaluation.score !== 'number' || typeof evaluation.ok !== 'boolean' || typeof evaluation.suggestions !== 'string') {
             console.error('[ERROR] JSON de evaluación (analyze) con formato inesperado:', evaluation);
             evaluation = { score: 20, ok: false, suggestions: "Error: Formato de evaluación inesperado de la IA. Revisa tu prompt." };
        } else {
             evaluation.score = Math.max(0, Math.min(100, evaluation.score)); // Clamp score
        }

    } catch (parseError) {
        console.error('[ERROR] Fallo al parsear JSON de la respuesta de Deepseek (analyze):', parseError);
        console.error('[ERROR] Respuesta recibida que falló el parseo:', assistantResponse);
        // Fallback si falla el parseo
        const suggestionsFallback = assistantResponse.length < 200 ? assistantResponse : "Revisa la estructura del prompt."; // Avoid sending very long unexpected output
        const okFallback = !(suggestionsFallback.toLowerCase().includes("mejorar") || suggestionsFallback.toLowerCase().includes("falta") || suggestionsFallback.toLowerCase().includes("error"));
        evaluation = { score: okFallback ? 70 : 30, ok: okFallback, suggestions: suggestionsFallback };
    }

    // Devolver al frontend asegurando que los campos existan
    res.json({
        suggestions: evaluation.suggestions || "No se pudieron generar sugerencias.",
        score: evaluation.score !== undefined ? Number(evaluation.score) : 50,
        ok: evaluation.ok !== undefined ? Boolean(evaluation.ok) : false
    });

  } catch (error) {
    console.error('--- ERROR DETALLADO en /analyze (Paso 4) ---');
    console.error('Mensaje:', error.message);
    let errorMsg = 'Fallo en análisis de prompt con Deepseek Chat'; let statusCode = 500;
    if (error.response?.status) statusCode = error.response.status;
    if (error.response?.data?.error?.message) errorMsg = error.response.data.error.message;
    else if (error.message.toLowerCase().includes('timeout')) errorMsg = 'Timeout Deepseek Chat.';
    else errorMsg = `Error inesperado: ${error.message}`;

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

    const systemMessage = `Eres un asistente pedagógico. Evalúa si el prompt del usuario está bien alineado con el siguiente objetivo: "${targetGoal}". Responde ÚNICAMENTE con un objeto JSON que contenga las claves "level" (string: "red", "yellow", o "green" basado en la alineación) y "feedback" (string: una sugerencia concisa en español, máximo 2 frases). Red si está mal alineado, Yellow si está parcialmente alineado o le falta claridad, Green si está bien alineado.`;
    const userMessage = `Evalúa la alineación del siguiente prompt con el objetivo:\n\n---\n${studentPrompt}\n---\n\nGenera el objeto JSON como se te indicó.`;

    const assistantResponse = await callDeepseekChat(systemMessage, userMessage, 0.2, 100);

    // Intentar parsear el JSON
    let evaluation = {};
     try {
         const cleanResponse = assistantResponse.replace(/```json\n?/, '').replace(/\n?```$/, '');
         evaluation = JSON.parse(cleanResponse);
         if (typeof evaluation.level !== 'string' || typeof evaluation.feedback !== 'string') {
             console.error('[ERROR] JSON de evaluación (evaluate) con formato inesperado:', evaluation);
             evaluation = { level: 'red', feedback: "Error: Formato de evaluación inesperado de la IA. Revisa tu prompt." };
         }

     } catch (parseError) {
        console.error('[ERROR] Fallo al parsear JSON de la respuesta de Deepseek (evaluate):', parseError);
        console.error('[ERROR] Respuesta recibida que falló el parseo:', assistantResponse);
        // Fallback si falla el parseo
        const levelFallback = assistantResponse.toLowerCase().includes("excelente") || assistantResponse.toLowerCase().includes("bien") || assistantResponse.toLowerCase().includes("green") ? "green" : (assistantResponse.toLowerCase().includes("casi") || assistantResponse.toLowerCase().includes("mejorar") || assistantResponse.toLowerCase().includes("yellow") ? "yellow" : "red");
        const feedbackFallback = assistantResponse.length < 150 ? assistantResponse : "La evaluación automática tuvo un problema. Intenta de nuevo o simplifica tu prompt."; // Evitar feedback muy largo
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
    console.error('--- ERROR DETALLADO en /evaluate (Paso 5) ---');
    console.error('Mensaje:', error.message);
    let errorMsg = 'Fallo en evaluación de prompt con Deepseek Chat'; let statusCode = 500;
    if (error.response?.status) statusCode = error.response.status;
    if (error.response?.data?.error?.message) errorMsg = error.response.data.error.message;
    else if (error.message.toLowerCase().includes('timeout')) errorMsg = 'Timeout Deepseek Chat.';
     else { errorMsg = `Error inesperado: ${error.message}`; }
    res.status(statusCode).json({ error: errorMsg });
  }
});


// --- MONTAJE Y EXPORTACIÓN (CommonJS) ---
app.use('/api', router);
module.exports.handler = serverless(app);