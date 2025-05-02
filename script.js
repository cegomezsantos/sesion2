document.addEventListener('DOMContentLoaded', () => {
  // --------------------------------------------------
  // Paso 4: Calentamiento de prompts con Deepseek
  // --------------------------------------------------
  const analyzeBtn = document.getElementById('analyzeBtn');
  const retryBtn   = document.getElementById('retryBtn');
  const feedback   = document.getElementById('step4Feedback');
  const progress   = document.getElementById('progress');
  const paso4      = document.getElementById('paso4');

  analyzeBtn.addEventListener('click', async () => {
    // Mostrar estado de carga
    feedback.textContent = 'Evaluando el prompt, espera un momento...';
    feedback.className   = 'feedback feedback--loading';
    retryBtn.style.display = 'none';

    // Leer y validar campos
    const rol      = document.querySelector('[name="rol"]').value.trim();
    const objetivo = document.querySelector('[name="objetivo"]').value.trim();
    const contexto = document.querySelector('[name="contexto"]').value.trim();
    if (!rol || !objetivo || !contexto) {
      feedback.textContent = 'Por favor, completa todos los campos.';
      feedback.className   = 'feedback feedback--bad';
      paso4.scrollIntoView();
      return;
    }

    try {
      const res  = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rol, objetivo, contexto })
      });
      const data = await res.json();

      // Mostrar sugerencias HTML
      feedback.innerHTML = data.suggestions;
      // Determinar clase de estado
      let cls = 'feedback--bad';
      if (data.ok) cls = 'feedback--good';
      else if (typeof data.score === 'number' && data.score >= 50) cls = 'feedback--okay';
      feedback.className = `feedback ${cls}`;

      // Actualizar barra de progreso
      if (progress && typeof data.score === 'number') {
        progress.value = data.score;
      }
      // Mostrar botón de reintento si falla
      if (!data.ok) retryBtn.style.display = 'inline-block';
    } catch (err) {
      console.error(err);
      feedback.textContent   = 'Error al analizar. Intenta de nuevo.';
      feedback.className     = 'feedback feedback--bad';
      retryBtn.style.display = 'inline-block';
    }

    // Desplazar suavemente al inicio del paso 4
    paso4.scrollIntoView({ behavior: 'smooth' });
  });

  // Reintentar: limpia el feedback y oculta el botón
  retryBtn.addEventListener('click', () => {
    feedback.textContent   = '';
    feedback.className     = 'feedback';
    retryBtn.style.display = 'none';
    paso4.scrollIntoView({ behavior: 'smooth' });
  });

  // --------------------------------------------------
  // Paso 5: Evaluación semáforo del estudiante
  // --------------------------------------------------
  const evaluateBtn      = document.getElementById('evaluatePrompt');
  if (evaluateBtn) {
    const challengeFeedback = document.getElementById('challengeFeedback');
    const trafficLights     = document.querySelectorAll('#trafficLight .light');
    const paso5             = document.getElementById('paso5');

    evaluateBtn.addEventListener('click', async () => {
      // Leer y validar prompt del estudiante
      const studentPrompt = document.getElementById('studentPrompt').value.trim();
      if (!studentPrompt) {
        challengeFeedback.textContent = 'Escribe tu prompt antes de evaluar.';
        challengeFeedback.className   = 'feedback feedback--bad';
        paso5.scrollIntoView({ behavior: 'smooth' });
        return;
      }

      // Mostrar estado de carga
      challengeFeedback.textContent = 'Evaluando prompt...';
      challengeFeedback.className   = 'feedback feedback--loading';

      try {
        const res2 = await fetch('/api/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: studentPrompt })
        });
        const info = await res2.json();

        // Reset semáforo
        trafficLights.forEach(light => light.style.opacity = 0.3);
        // Iluminar nivel correspondiente (red/yellow/green)
        const active = Array.from(trafficLights)
          .find(light => light.classList.contains(info.level));
        if (active) active.style.opacity = 1;

        // Mostrar feedback con color según nivel
        challengeFeedback.textContent = info.feedback;
        challengeFeedback.className   = `feedback feedback--${info.level}`;
      } catch (e) {
        console.error(e);
        challengeFeedback.textContent = 'Error al evaluar. Intenta más tarde.';
        challengeFeedback.className   = 'feedback feedback--bad';
      }

      // Desplazar al inicio del paso 5
      paso5.scrollIntoView({ behavior: 'smooth' });
    });
  }
});