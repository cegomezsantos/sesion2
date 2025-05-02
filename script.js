document.addEventListener('DOMContentLoaded', () => {
    // Element selectors
    const analyzeBtn = document.getElementById('analyzeBtn');
    const evaluateBtn = document.getElementById('evaluatePrompt');
    const feedback = document.getElementById('feedback');
    const challengeFeedback = document.getElementById('challengeFeedback');
    const progressBar = document.getElementById('progress');
    const trafficLights = document.querySelectorAll('#trafficLight .light');
  
    // Paso 4: Análisis de prompt de calentamiento
    analyzeBtn.addEventListener('click', async () => {
      const rol = document.querySelector('[name="rol"]').value.trim();
      const objetivo = document.querySelector('[name="objetivo"]').value.trim();
      const contexto = document.querySelector('[name="contexto"]').value.trim();
  
      if (!rol || !objetivo || !contexto) {
        feedback.textContent = 'Por favor, completa todos los campos.';
        return;
      }
  
      feedback.textContent = 'Analizando prompt...';
      try {
        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rol, objetivo, contexto })
        });
        const data = await res.json();
        feedback.innerHTML = data.suggestions;
        // Actualizar barra de progreso (0-100)
        if (data.score !== undefined) {
          progressBar.value = data.score;
        }
      } catch (err) {
        console.error(err);
        feedback.textContent = 'Error al analizar. Intenta de nuevo.';
      }
    });
  
    // Paso 6: Evaluación de prompt del estudiante
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
        // Reset semáforo
        trafficLights.forEach(light => light.style.opacity = 0.3);
        // Iluminar nivel: 'red', 'yellow' o 'green'
        const levelLight = Array.from(trafficLights).find(light => light.classList.contains(data.level));
        if (levelLight) levelLight.style.opacity = 1;
        // Mostrar feedback
        challengeFeedback.textContent = data.feedback;
      } catch (err) {
        console.error(err);
        challengeFeedback.textContent = 'Error al evaluar. Intenta más tarde.';
      }
    });
  });
  