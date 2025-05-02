// consulta.js - Backend de Node.js con Express y OpenAI
const express = require('express');
const { Configuration, OpenAIApi } = require('openai');

// Configuración de OpenAI con la clave en variable de entorno
const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
const openai = new OpenAIApi(configuration);

const router = express.Router();
router.use(express.json());

// POST /api/analyze - analiza rol, objetivo y contexto para sugerencias y score
router.post('/analyze', async (req, res) => {
  try {
    const { rol, objetivo, contexto } = req.body;
    const prompt = `Eres un evaluador de prompts. Recomienda mejoras al siguiente prompt dividido en roles:
- Rol: "${rol}"
- Objetivo: "${objetivo}"
- Contexto: "${contexto}"
Proporciona:
1. Una lista de sugerencias HTML (<ul><li>...) para mejorar claridad, detalle y contexto.
2. Una puntuación de 0 a 100 indicando calidad general.`;

    const completion = await openai.createChatCompletion({
      model: 'gpt-4o-mini',
      messages: [ { role: 'system', content: 'Eres un asistente experto en prompt engineering.' },
                  { role: 'user', content: prompt } ],
      temperature: 0.3,
      frequency_penalty: 0.25,
      max_tokens: 300
    });

    // Parsear respuesta esperada en dos partes: suggestions HTML y score
    const text = completion.data.choices[0].message.content;
    const parts = text.split(/\n2\./);
    const suggestions = parts[0].replace(/^1\./, '').trim();
    const scoreMatch = parts[1].match(/(\d{1,3})/);
    const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;

    res.json({ suggestions, score });
  } catch (error) {
    console.error('Error /api/analyze:', error);
    res.status(500).json({ error: 'Error en análisis de prompt' });
  }
});

// POST /api/evaluate - evalúa prompt del estudiante y retorna nivel y feedback
router.post('/evaluate', async (req, res) => {
  try {
    const { prompt: studentPrompt } = req.body;
    const prompt = `Eres un asistente pedagógico que evalúa prompts en tres niveles: red (débil), yellow (aceptable), green (óptimo). Para el siguiente prompt de estudiante:
"""
${studentPrompt}
"""
Proporciona:
- feedback: sugerencia breve.
- level: una de las palabras 'red', 'yellow' o 'green'.`;

    const completion = await openai.createChatCompletion({
      model: 'gpt-4o-mini',
      messages: [ { role: 'system', content: 'Eres un evaluador de prompts educativos.' },
                  { role: 'user', content: prompt } ],
      temperature: 0.3,
      max_tokens: 150
    });

    // Extraer JSON sin parsing estricto
    const content = completion.data.choices[0].message.content;
    // Suponiendo formato: "level: green\nfeedback: ..."
    const levelMatch = content.match(/level:\s*(red|yellow|green)/i);
    const feedbackMatch = content.match(/feedback:\s*([\s\S]*)/i);
    const level = levelMatch ? levelMatch[1].toLowerCase() : 'red';
    const feedbackText = feedbackMatch ? feedbackMatch[1].trim() : content;

    res.json({ level, feedback: feedbackText });
  } catch (error) {
    console.error('Error /api/evaluate:', error);
    res.status(500).json({ error: 'Error en evaluación de prompt' });
  }
});

module.exports = router;