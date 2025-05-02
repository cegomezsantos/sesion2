document.addEventListener('DOMContentLoaded', () => {
  // --------------------------------------------------
  // Paso 4: Análisis con Deepseek
  // --------------------------------------------------
  const analyzeBtn = document.getElementById('analyzeBtn');
  const feedback = document.getElementById('step4Feedback') || document.getElementById('feedback');
  const progressBar = document.getElementById('progress');

  // Crear botón de reintento
  const retryBtn = document.createElement('button');
  retryBtn.id = 'retryBtn';
  retryBtn.textContent = 'Reintentar';
  retryBtn.classList.add('retry-button');
  retryBtn.style.display = 'none';
  analyzeBtn.insertAdjacentElement('afterend', retryBtn);

  analyzeBtn.addEventListener('click', async () => {
    // Leer valores del formulario
    const rol = document.querySelector('[name="rol"]').value.trim();
    const objetivo = document.querySelector('[name="objetivo"]').value.trim();
    const contexto = document.querySelector('[name="contexto"]').value.trim();

    // Mostrar estado de carga
    feedback.textContent = 'Evaluando el prompt, espera un momento...';
    feedback.className = 'feedback feedback--loading';
    retryBtn.style.display = 'none';

    // Validar campos
    if (!rol || !objetivo || !contexto) {
      feedback.textContent = 'Por favor, completa todos los campos.';
      feedback.className = 'feedback feedback--bad';
      return;
    }

    try {
      // Llamada al backend
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rol, objetivo, contexto })
      });
      const data = await res.json();

      // Mostrar sugerencias
      feedback.innerHTML = data.suggestions;

      // Determinar clase de estado
      let stateClass = 'feedback--bad';
      if (data.ok) stateClass = 'feedback--good';
      else if (typeof data.score === 'number' && data.score >= 50) stateClass = 'feedback--okay';
      feedback.className = `feedback ${stateClass}`;

      // Actualizar barra de progreso si aplica
      if (progressBar && typeof data.score === 'number') {
        progressBar.value = data.score;
      }

      // Mostrar botón de reintento si no cumple criterios
      if (!data.ok) retryBtn.style.display = 'inline-block';
    } catch (err) {
      console.error(err);
      feedback.textContent = 'Error al analizar. Intenta de nuevo.';
      feedback.className = 'feedback feedback--bad';
      retryBtn.style.display = 'inline-block';
    }
  });

  // Reintento: limpiar feedback
  retryBtn.addEventListener('click', () => {
    feedback.textContent = '';
    feedback.className = 'feedback';
    retryBtn.style.display = 'none';
  });

  // --------------------------------------------------
  // Paso 5: Evaluación semáforo estudiante
  // --------------------------------------------------
  const evaluateBtn = document.getElementById('evaluatePrompt');
  if (evaluateBtn) {
    const challengeFeedback = document.getElementById('challengeFeedback');
    const trafficLights = document.querySelectorAll('#trafficLight .light');

    evaluateBtn.addEventListener('click', async () => {
      const studentPrompt = document.getElementById('studentPrompt').value.trim();
      if (!studentPrompt) {
        challengeFeedback.textContent = 'Escribe tu prompt antes de evaluar.';
        return;
      }

      challengeFeedback.textContent = 'Evaluando prompt...';
      challengeFeedback.className = 'feedback feedback--loading';

      try {
        const res2 = await fetch('/api/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: studentPrompt })
        });
        const info = await res2.json();

        // Reset semáforo
        trafficLights.forEach(light => light.style.opacity = 0.3);
        // Mostrar nivel activo
        const active = Array.from(trafficLights).find(light =>
          light.classList.contains(info.level)
        );
        if (active) active.style.opacity = 1;

        // Feedback a estudiante
        challengeFeedback.textContent = info.feedback;
        // Aplicar clase de color según nivel
        challengeFeedback.className = `feedback feedback--${info.level}`;
      } catch (e) {
        console.error(e);
        challengeFeedback.textContent = 'Error al evaluar. Intenta más tarde.';
        challengeFeedback.className = 'feedback feedback--bad';
      }
    });
  }
});