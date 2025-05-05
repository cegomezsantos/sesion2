// consulta.js – Backend Node.js para Deepseek
const express = require('express');
const axios = require('axios');

// Cargar clave desde variable de entorno
const DEEPSEEK_KEY = process.env.DEEPSEEK_KEY;
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/prompt/evaluate'; // Corregido endpoint base

if (!DEEPSEEK_KEY) {
  console.error("¡ERROR CRÍTICO! La variable de entorno DEEPSEEK_KEY no está definida.");
  // Considera terminar el proceso si la clave es esencial para arrancar
  // process.exit(1);
}

const router = express.Router();
router.use(express.json());

/**
 * POST /api/analyze (Para Paso 4)
 * Analiza un prompt estructuralmente (Rol, Objetivo, Contexto) usando Deepseek:
 *   - suggestions: recomendaciones en HTML/texto
 *   - score: valoración numérica (0-100)
 *   - ok: boolean si pasa criterios mínimos
 */
router.post('/api/analyze', async (req, res) => {
  if (!DEEPSEEK_KEY) {
       return res.status(500).json({ error: 'Configuración incompleta del servidor (sin clave API)' });
   }
  try {
    const { rol, objetivo, contexto } = req.body;

    if (!rol || !objetivo || !contexto) {
        return res.status(400).json({ error: 'Faltan campos: rol, objetivo y contexto son requeridos.' });
    }

    // Creamos un prompt combinado para una evaluación más significativa si es necesario,
    // o evaluamos la estructura como tal. Deepseek v1 no tiene un tipo 'structural' explícito documentado,
    // usaremos goal_alignment con un target genérico de "estructura clara" o evaluaremos el prompt completo.
    // Probemos evaluando el prompt combinado contra un objetivo genérico de claridad.
    const combinedPrompt = `Rol: ${rol}\nObjetivo: ${objetivo}\nContexto: ${contexto}`;
    const targetGoal = "Un prompt bien estructurado con rol, objetivo y contexto claros y específicos.";

    const payload = {
      prompt: combinedPrompt,
      target: targetGoal,
      analysis_type: 'goal_alignment', // Evaluar qué tan bien cumple ser estructurado
      include_recommendations: true
    };

    console.log('Enviando a Deepseek (Analyze - Paso 4):', payload);

    const dsRes = await axios.post(
      DEEPSEEK_API_URL,
      payload,
      { headers: { Authorization: `Bearer ${DEEPSEEK_KEY}`, 'Content-Type': 'application/json' } }
    );

    console.log('Respuesta de Deepseek (Analyze - Paso 4):', dsRes.data);

    // Extraemos los datos relevantes de la respuesta de Deepseek
    // Asegúrate que los nombres 'suggestions', 'score', 'ok' coinciden con la respuesta REAL de la API
    const { score, ok, suggestions } = dsRes.data;

    return res.json({
        suggestions: suggestions || (ok ? "Prompt bien estructurado." : "Revisa las partes del prompt para mayor claridad."), // Fallback para feedback
        score: score !== undefined ? score : (ok ? 100 : 30), // Asignar score por defecto si no viene
        ok: ok !== undefined ? ok : false // Asignar ok por defecto si no viene
    });

  } catch (error) {
    console.error('Error en /api/analyze (Paso 4):', error.response?.data || error.message);
    // Devuelve un error genérico al cliente, pero loguea el detalle
    let errorMsg = 'Fallo en análisis de prompt con Deepseek';
    if (error.response?.status === 401) {
        errorMsg = 'Error de autenticación con Deepseek. Verifica la API Key.';
    } else if (error.response?.data?.error?.message) {
        errorMsg = error.response.data.error.message; // Usar mensaje de error de Deepseek si existe
    }
    res.status(error.response?.status || 500).json({ error: errorMsg });
  }
});

/**
 * POST /api/evaluate (Para Paso 5)
 * Evalúa el prompt escrito por el estudiante usando Deepseek contra un objetivo específico:
 *   - level: 'red' | 'yellow' | 'green'
 *   - feedback: sugerencia breve de mejora
 */
router.post('/api/evaluate', async (req, res) => {
   if (!DEEPSEEK_KEY) {
       return res.status(500).json({ error: 'Configuración incompleta del servidor (sin clave API)' });
   }
  try {
    const { prompt: studentPrompt } = req.body;

    if (!studentPrompt || studentPrompt.trim() === '') {
      return res.status(400).json({ error: 'El prompt del estudiante no puede estar vacío.' });
    }

    // Objetivo específico para la evaluación del Paso 5
    const targetGoal = "Generar un cuestionario breve de 5 preguntas de opción múltiple sobre la Guerra del Pacífico para alumnos de secundaria.";

    const payload = {
      prompt: studentPrompt,
      target: targetGoal,
      analysis_type: 'goal_alignment', // Evaluar alineación con el objetivo
      include_recommendations: true
    };

    console.log('Enviando a Deepseek (Evaluate - Paso 5):', payload);

    const dsRes = await axios.post(
      DEEPSEEK_API_URL,
      payload,
      { headers: { Authorization: `Bearer ${DEEPSEEK_KEY}`, 'Content-Type': 'application/json' } }
    );

    console.log('Respuesta de Deepseek (Evaluate - Paso 5):', dsRes.data);

    // Extraer score, ok, suggestions de la respuesta de Deepseek
    // Asegúrate que los nombres coinciden con la respuesta REAL de la API
    const { score, ok, suggestions } = dsRes.data;

    // Traducir score/ok a level
    let level = 'red'; // Default
    const numericScore = score !== undefined ? Number(score) : -1; // Convertir a número, default -1 si no existe

    if (ok === true || numericScore >= 80) { // Considerar 'ok' o un score alto como green
        level = 'green';
    } else if (numericScore >= 50) { // Score intermedio como yellow
        level = 'yellow';
    }
     // Si no es green ni yellow, se queda en 'red'

    // Preparar feedback
    let feedbackText = suggestions || "Intenta ser más específico o añadir detalles relevantes."; // Usar sugerencias o mensaje genérico
    if (level === 'green' && !suggestions) {
        feedbackText = "¡Buen trabajo! El prompt parece bien alineado con el objetivo.";
    } else if (level === 'yellow' && !suggestions) {
        feedbackText = "Vas por buen camino, pero podrías refinar el prompt para mayor claridad o detalle.";
    }


    res.json({ level, feedback: feedbackText });

  } catch (error) {
    console.error('Error en /api/evaluate (Paso 5):', error.response?.data || error.message);
    let errorMsg = 'Fallo en evaluación de prompt con Deepseek';
     if (error.response?.status === 401) {
        errorMsg = 'Error de autenticación con Deepseek. Verifica la API Key.';
    } else if (error.response?.data?.error?.message) {
        errorMsg = error.response.data.error.message;
    }
    res.status(error.response?.status || 500).json({ error: errorMsg });
  }
});

module.exports = router;