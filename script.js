document.addEventListener('DOMContentLoaded', () => {
  // Paso 4: Análisis con Deepseek
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
    const rol = document.querySelector('[name="rol"]').value.trim();
    const objetivo = document.querySelector('[name="objetivo"]').value.trim();
    const contexto = document.querySelector('[name="contexto"]').value.trim();

    // Mostrar estado de carga
    feedback.textContent = 'Evaluando el prompt, espera un momento...';
    feedback.className = 'feedback feedback--loading';
    retryBtn.style.display = 'none';

    // Validación
    if (!rol || !objetivo || !contexto) {
      feedback.textContent = 'Por favor, completa todos los campos.';
      feedback.className = 'feedback feedback--bad';
      return;
    }

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rol, objetivo, contexto })
      });
      const data = await res.json();

      // Mostrar sugerencias
      feedback.innerHTML = data.suggestions;
      // Determinar estado
      let statusClass = 'feedback--bad';
      if (data.ok) statusClass = 'feedback--good';
      else if (typeof data.score === 'number' && data.score >= 50) statusClass = 'feedback--okay';
      feedback.className = `feedback ${statusClass}`;

      // Actualizar progressBar
      if (progressBar && typeof data.score === 'number') {
        progressBar.value = data.score;
      }

      // Mostrar reintento si no cumple
      if (!data.ok) retryBtn.style.display = 'inline-block';
    } catch (err) {
      console.error(err);
      feedback.textContent = 'Error al analizar. Intenta de nuevo.';
      feedback.className = 'feedback feedback--bad';
      retryBtn.style.display = 'inline-block';
    }
  });

  // Reintento
  retryBtn.addEventListener('click', () => {
    feedback.textContent = '';
    feedback.className = 'feedback';
    retryBtn.style.display = 'none';
  });

  // Paso 5: Evaluación semáforo estudiante
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
      challengeFeedback.className = '';

      try {
        const res2 = await fetch('/api/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: studentPrompt })
        });
        const info = await res2.json();

        trafficLights.forEach(light => light.style.opacity = 0.3);
        const active = Array.from(trafficLights).find(light =>
          light.classList.contains(info.level)
        );
        if (active) active.style.opacity = 1;

        challengeFeedback.textContent = info.feedback;
      } catch (e) {
        console.error(e);
        challengeFeedback.textContent = 'Error al evaluar. Intenta más tarde.';
      }
    });
  }
});
