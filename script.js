document.addEventListener('DOMContentLoaded', () => {
  // BOTÓN Y FEEDBACK PASO 4
  const analyzeBtn = document.getElementById('analyzeBtn');
  const fbContainer = document.getElementById('step4Feedback') || document.getElementById('feedback');
  const progressBar = document.getElementById('progress');

  // Crear botón de reintento
  const retryBtn = document.createElement('button');
  retryBtn.id = 'retryBtn';
  retryBtn.textContent = 'Reintentar';
  retryBtn.className = 'retry-button';
  retryBtn.style.display = 'none';
  analyzeBtn.insertAdjacentElement('afterend', retryBtn);

  analyzeBtn.addEventListener('click', async () => {
    const rol = document.querySelector('[name="rol"]').value.trim();
    const objetivo = document.querySelector('[name="objetivo"]').value.trim();
    const contexto = document.querySelector('[name="contexto"]').value.trim();
    const fb = fbContainer;

    // Mostrar estado de carga
    fb.textContent = 'Evaluando el prompt, espera un momento...';
    fb.className = 'feedback feedback--loading';
    retryBtn.style.display = 'none';

    // Validación básica
    if (!rol || !objetivo || !contexto) {
      fb.textContent = 'Por favor, completa todos los campos.';
      fb.className = 'feedback feedback--bad';
      return;
    }

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rol, objetivo, contexto })
      });
      const data = await res.json();

      // Mostrar sugerencias HTML
      fb.innerHTML = data.suggestions;
      // Determinar clase según score/ok
      let stateClass = 'feedback--bad';
      if (data.ok) stateClass = 'feedback--good';
      else if (data.score >= 50) stateClass = 'feedback--okay';
      fb.className = `feedback ${stateClass}`;

      // Actualizar barra de progreso
      if (progressBar && data.score !== undefined) progressBar.value = data.score;

      // Mostrar botón reintentar si no pasó
      if (!data.ok) retryBtn.style.display = 'inline-block';
    } catch (err) {
      console.error(err);
      fb.textContent = 'Error al analizar. Intenta de nuevo.';
      fb.className = 'feedback feedback--bad';
      retryBtn.style.display = 'inline-block';
    }
  });

  // Reintentar: limpia feedback
  retryBtn.addEventListener('click', () => {
    fbContainer.textContent = '';
    fbContainer.className = 'feedback';
    retryBtn.style.display = 'none';
  });

  // PASO 5: Evaluación semáforo estudiante
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
    challengeFeedback.className = '';

    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptText })
      });
      const data = await res.json();

      // Actualizar semáforo
      trafficLights.forEach(light => light.style.opacity = 0.3);
      const active = Array.from(trafficLights).find(light => light.classList.contains(data.level));
      if (active) active.style.opacity = 1;

      // Mostrar feedback
      challengeFeedback.textContent = data.feedback;
    } catch (err) {
      console.error(err);
      challengeFeedback.textContent = 'Error al evaluar. Intenta más tarde.';
    }
  });
});
