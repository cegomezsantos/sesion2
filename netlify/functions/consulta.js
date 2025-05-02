// consulta.js - Backend Node.js para Deepseek y OpenAI
const express = require('express');
const axios = require('axios');
const { Configuration, OpenAIApi } = require('openai');

// Cargar claves desde variables de entorno
const DEEPSEEK_KEY = process.env.DEEPSEEK_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Configurar cliente OpenAI
const openai = new OpenAIApi(new Configuration({ apiKey: OPENAI_API_KEY }));

const router = express.Router();
router.use(express.json());

/**
 * POST /api/analyze
 * Analiza un prompt estructuralmente usando Deepseek:
 *   - suggestions: recomendaciones en HTML
 *   - score: valoración numérica (0-100)
 *   - ok: boolean si pasa criterios mínimos
 */
router.post('/api/analyze', async (req, res) => {
  try {
    const { rol, objetivo, contexto } = req.body;
    // Construir payload para Deepseek
    const payload = {
      role: rol,
      objective: objetivo,
      context: contexto,
      analysis_type: 'structural',       // evaluación estructural detallada
      include_recommendations: true      // incluir sugerencias
    };
    // Llamada a Deepseek
    const dsRes = await axios.post(
      'https://api.deepseek.ai/v1/prompt/evaluate',
      payload,
      { headers: { Authorization: `Bearer ${DEEPSEEK_KEY}`, 'Content-Type': 'application/json' } }
    );
    const { suggestions, score, ok } = dsRes.data;
    return res.json({ suggestions, score, ok });
  } catch (error) {
    console.error('Error en /api/analyze:', error.response?.data || error.message);
    res.status(500).json({ error: 'Fallo en análisis de prompt con Deepseek' });
  }
});

/**
 * POST /api/evaluate
 * Evalúa el prompt escrito por el estudiante usando OpenAI:
 *   - level: 'red' | 'yellow' | 'green'
 *   - feedback: sugerencia breve de mejora
 */
router.post('/api/evaluate', async (req, res) => {
  try {
    const { prompt: studentPrompt } = req.body;
    // Prompt interno para evaluación
    const evaluationPrompt = `Eres un asistente pedagógico experto en prompt engineering.
Evalúa este prompt de estudiante:
"""
${studentPrompt}
"""
Devuelve un JSON con las claves:
- "level": "red"|"yellow"|"green"
- "feedback": "una sugerencia clara de mejora en una o dos frases"`;

    // Llamada a OpenAI
    const aiRes = await openai.createChatCompletion({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Eres un evaluador de prompts educativos.' },
        { role: 'user', content: evaluationPrompt }
      ],
      temperature: 0.3,
      max_tokens: 200
    });

    const content = aiRes.data.choices[0].message.content;
    // Extraer campos JSON del texto
    const levelMatch = content.match(/"level"\s*[:=]\s*"?(red|yellow|green)"?/i);
    const feedbackMatch = content.match(/"feedback"\s*[:=]\s*"([\s\S]*?)"/i);
    const level = levelMatch ? levelMatch[1].toLowerCase() : 'red';
    const feedbackText = feedbackMatch ? feedbackMatch[1] : content;

    res.json({ level, feedback: feedbackText });
  } catch (error) {
    console.error('Error en /api/evaluate:', error.response?.data || error.message);
    res.status(500).json({ error: 'Fallo en evaluación de prompt' });
  }
});

module.exports = router;
