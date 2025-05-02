document.addEventListener('DOMContentLoaded', () => {
  // Selectores de elementos
  const analyzeBtn = document.getElementById('analyzeBtn');
  const feedback = document.getElementById('feedback');
  const progressBar = document.getElementById('progress');

  // Crear botón de reintento dinámicamente
  const retryBtn = document.createElement('button');
  retryBtn.id = 'retryBtn';
  retryBtn.textContent = 'Reintentar';
  retryBtn.style.display = 'none';
  retryBtn.className = 'retry-button';
  analyzeBtn.insertAdjacentElement('afterend', retryBtn);

  // Paso 4: Análisis con Deepseek
  analyzeBtn.addEventListener('click', async () => {
    const rol = document.querySelector('[name="rol"]').value.trim();
    const objetivo = document.querySelector('[name="objetivo"]').value.trim();
    const contexto = document.querySelector('[name="contexto"]').value.trim();

    if (!rol || !objetivo || !contexto) {
      feedback.textContent = 'Por favor, completa todos los campos.';
      return;
    }

    feedback.textContent = 'Analizando prompt con Deepseek...';
    retryBtn.style.display = 'none';

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rol, objetivo, contexto })
      });
      const data = await res.json();

      // Mostrar sugerencias
      feedback.innerHTML = data.suggestions;
      // Actualizar barra de progreso si existe
      if (data.score !== undefined && progressBar) {
        progressBar.value = data.score;
      }
      // Si no cumple (ok = false), mostrar botón reintentar
      if (!data.ok) {
        retryBtn.style.display = 'inline-block';
      }
    } catch (err) {
      console.error(err);
      feedback.textContent = 'Error al analizar. Intenta de nuevo.';
      retryBtn.style.display = 'inline-block';
    }
  });

  // Lógica de reintento: limpia feedback y oculta el botón
  retryBtn.addEventListener('click', () => {
    feedback.textContent = '';
    retryBtn.style.display = 'none';
  });

  // Paso 6: Evaluación de prompt del estudiante (semáforo)
  const evaluateBtn = document.getElementById('evaluatePrompt');
  const challengeFeedback = document.getElementById('challengeFeedback');
  const trafficLights = document.querySelectorAll('#trafficLight .light');

  evaluateBtn.addEventListener('click', async () => {
    const promptText = document.getElementById('studentPrompt').value.trim();
    if (!promptText) {
      challengeFeedback.textContent = 'Escribe tu prompt antes de evaluar.';
      return;
    }

    challengeFeedback.textContent = 'Evaluando prompt...';
    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptText })
      });
      const data = await res.json();

      // Actualizar semáforo
      trafficLights.forEach(light => light.style.opacity = 0.3);
      const levelLight = Array.from(trafficLights)
        .find(light => light.classList.contains(data.level));
      if (levelLight) levelLight.style.opacity = 1;

      // Mostrar feedback
      challengeFeedback.textContent = data.feedback;
    } catch (err) {
      console.error(err);
      challengeFeedback.textContent = 'Error al evaluar. Intenta más tarde.';
    }
  });
});
