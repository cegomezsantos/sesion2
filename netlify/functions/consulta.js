// consulta.js – Backend Node.js para Deepseek (Netlify Function con CommonJS)

// --- IMPORTACIONES (Usando sintaxis CommonJS) ---
const express = require('express');
const axios = require('axios');
const serverless = require('serverless-http');

// --- CONFIGURACIÓN ---
const DEEPSEEK_KEY = process.env.DEEPSEEK_KEY;
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/prompt/evaluate'; // Endpoint de Deepseek

// Verificar que la clave API existe al iniciar
if (!DEEPSEEK_KEY) {
  console.error("¡ERROR CRÍTICO! La variable de entorno DEEPSEEK_KEY no está definida.");
}

// --- APLICACIÓN EXPRESS ---
const app = express();
// Middleware para parsear automáticamente cuerpos de solicitud JSON
app.use(express.json());

// --- ROUTER PARA LAS RUTAS ESPECÍFICAS ---
const router = express.Router();

// --- RUTA: /analyze (Para Paso 4: Evaluación Estructural) ---
router.post('/analyze', async (req, res) => {
  // Verificar API Key en cada solicitud por seguridad
  if (!DEEPSEEK_KEY) {
       return res.status(500).json({ error: 'Configuración incompleta del servidor (sin clave API)' });
   }

  try {
    const { rol, objetivo, contexto } = req.body;

    // Validar entrada
    if (!rol || !objetivo || !contexto) {
        return res.status(400).json({ error: 'Faltan campos: rol, objetivo y contexto son requeridos.' });
    }

    // Combinar las partes en un solo prompt para evaluación estructural simulada
    const combinedPrompt = `Rol: ${rol}\nObjetivo: ${objetivo}\nContexto: ${contexto}`;
    // Definir el objetivo de esta evaluación: claridad estructural
    const targetGoal = "Un prompt bien estructurado con rol, objetivo y contexto claros y específicos.";

    const payload = {
      prompt: combinedPrompt,
      target: targetGoal,
      analysis_type: 'goal_alignment', // Usar alineación para evaluar la estructura
      include_recommendations: true
    };

    console.log('[INFO] Enviando a Deepseek (Analyze - Paso 4):', JSON.stringify(payload)); // Log del payload

    // Llamada a la API de Deepseek
    const dsRes = await axios.post(
      DEEPSEEK_API_URL,
      payload,
      {
        headers: {
            Authorization: `Bearer ${DEEPSEEK_KEY}`,
           'Content-Type': 'application/json'
        },
        timeout: 9000 // Timeout de 9 segundos (un poco menos del límite de Netlify)
      }
    );

    console.log('[INFO] Respuesta de Deepseek (Analyze - Paso 4):', JSON.stringify(dsRes.data)); // Log de la respuesta

    // Extraer datos relevantes (con valores por defecto si faltan)
    const { score, ok, suggestions } = dsRes.data;
    const finalScore = score !== undefined ? Number(score) : (ok ? 100 : 30);
    const finalOk = ok !== undefined ? ok : (finalScore >= 80); // Definir 'ok' basado en score si no viene
    const finalSuggestions = suggestions || (finalOk ? "Prompt bien estructurado." : "Revisa las partes del prompt para mayor claridad.");

    // Devolver respuesta al frontend
    return res.json({
        suggestions: finalSuggestions,
        score: finalScore,
        ok: finalOk
    });

  } catch (error) {
    // --- Manejo de Errores Detallado ---
    console.error('--- ERROR DETALLADO en /analyze (Paso 4) ---');
    console.error('Tipo de Error:', error.name);
    console.error('Mensaje:', error.message);
    if (error.isAxiosError) {
        console.error('Error de Axios detectado.');
        if (error.response) {
            console.error('Response Status:', error.response.status);
            console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
        } else if (error.request) {
            console.error('No hubo respuesta del servidor (Deepseek). Request:', error.request);
        } else {
            console.error('Error configurando la solicitud Axios:', error.message);
        }
    }
    // console.error('Stack Trace:', error.stack); // Puede ser muy largo, opcional
    console.error('--- FIN ERROR DETALLADO ---');

    let errorMsg = 'Fallo en análisis de prompt con Deepseek';
    let statusCode = 500;

    if (error.response?.status === 401) {
        errorMsg = 'Error de autenticación con Deepseek. Verifica la API Key.';
        statusCode = 401;
    } else if (error.response?.data?.error?.message) {
        errorMsg = error.response.data.error.message;
        statusCode = error.response.status || 500; // Usar status de Deepseek si está disponible
    } else if (error.code === 'ETIMEDOUT' || error.message.toLowerCase().includes('timeout')) {
         errorMsg = 'La solicitud a Deepseek tardó demasiado (Timeout).';
         statusCode = 504; // Gateway Timeout
    }
    res.status(statusCode).json({ error: errorMsg });
  }
});

// --- RUTA: /evaluate (Para Paso 5: Evaluación de Alineación con Objetivo Específico) ---
router.post('/evaluate', async (req, res) => {
  // Verificar API Key
  if (!DEEPSEEK_KEY) {
       return res.status(500).json({ error: 'Configuración incompleta del servidor (sin clave API)' });
   }

  try {
    const { prompt: studentPrompt } = req.body;

    // Validar entrada
    if (!studentPrompt || studentPrompt.trim() === '') {
      return res.status(400).json({ error: 'El prompt del estudiante no puede estar vacío.' });
    }

    // Objetivo específico para este paso
    const targetGoal = "Generar un cuestionario breve de 5 preguntas de opción múltiple sobre la Guerra del Pacífico para alumnos de secundaria.";

    const payload = {
      prompt: studentPrompt,
      target: targetGoal,
      analysis_type: 'goal_alignment', // Evaluar alineación con el objetivo
      include_recommendations: true
    };

    console.log('[INFO] Enviando a Deepseek (Evaluate - Paso 5):', JSON.stringify(payload)); // Log del payload

    // Llamada a la API de Deepseek
    const dsRes = await axios.post(
      DEEPSEEK_API_URL,
      payload,
      {
        headers: {
            Authorization: `Bearer ${DEEPSEEK_KEY}`,
            'Content-Type': 'application/json'
        },
        timeout: 9000 // Timeout de 9 segundos
      }
    );

    console.log('[INFO] Respuesta de Deepseek (Evaluate - Paso 5):', JSON.stringify(dsRes.data)); // Log de la respuesta

    // Extraer datos relevantes
    const { score, ok, suggestions } = dsRes.data;

    // Traducir score/ok a level ('red', 'yellow', 'green')
    let level = 'red'; // Default
    const numericScore = score !== undefined ? Number(score) : -1;
    if (ok === true || numericScore >= 80) {
        level = 'green';
    } else if (numericScore >= 50) {
        level = 'yellow';
    }
    // Si no, se queda 'red'

    // Preparar feedback para el frontend
    let feedbackText = suggestions || "Intenta ser más específico o añadir detalles relevantes.";
    if (level === 'green' && !suggestions) {
        feedbackText = "¡Excelente prompt! Bien alineado con el objetivo.";
    } else if (level === 'yellow' && !suggestions) {
        feedbackText = "Vas por buen camino, pero podrías refinar el prompt para mayor claridad.";
    } else if (level === 'red' && !suggestions) {
        feedbackText = "El prompt necesita más trabajo para alinearse con el objetivo. Revisa la estructura o el detalle.";
    }

    // Devolver respuesta al frontend
    res.json({ level, feedback: feedbackText });

  } catch (error) {
    // --- Manejo de Errores Detallado ---
    console.error('--- ERROR DETALLADO en /evaluate (Paso 5) ---');
    console.error('Tipo de Error:', error.name);
    console.error('Mensaje:', error.message);
    if (error.isAxiosError) {
        console.error('Error de Axios detectado.');
        if (error.response) {
            console.error('Response Status:', error.response.status);
            console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
        } else if (error.request) {
             console.error('No hubo respuesta del servidor (Deepseek). Request:', error.request);
        } else {
            console.error('Error configurando la solicitud Axios:', error.message);
        }
    }
    // console.error('Stack Trace:', error.stack); // Opcional
    console.error('--- FIN ERROR DETALLADO ---');

    let errorMsg = 'Fallo en evaluación de prompt con Deepseek';
    let statusCode = 500;

    if (error.response?.status === 401) {
        errorMsg = 'Error de autenticación con Deepseek. Verifica la API Key.';
        statusCode = 401;
    } else if (error.response?.data?.error?.message) {
        errorMsg = error.response.data.error.message;
        statusCode = error.response.status || 500;
    } else if (error.code === 'ETIMEDOUT' || error.message.toLowerCase().includes('timeout')) {
         errorMsg = 'La solicitud a Deepseek tardó demasiado (Timeout).';
         statusCode = 504; // Gateway Timeout
    }
    res.status(statusCode).json({ error: errorMsg });
  }
});

// --- MONTAJE DEL ROUTER Y EXPORTACIÓN DEL HANDLER (CommonJS) ---

// Montar el router bajo el prefijo /api/ que Netlify redirigirá aquí
app.use('/api', router);

// Exportar el handler envuelto para Netlify usando sintaxis CommonJS
module.exports.handler = serverless(app);