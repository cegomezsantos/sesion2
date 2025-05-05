document.addEventListener('DOMContentLoaded', () => {
  // --- Saludo Personalizado ---
  const welcomeMessage = document.getElementById('welcomeMessage');
  try {
    const params = new URLSearchParams(window.location.search);
    const userName = params.get('naus');

    if (userName && userName.trim() !== '') {
      const capitalizedUserName = userName.charAt(0).toUpperCase() + userName.slice(1).toLowerCase();
      welcomeMessage.textContent = `¡Hola, ${capitalizedUserName}! Bienvenido/a al Sandbox Inteligente`;
    }
  } catch (e) {
    console.error("Error al procesar parámetros de URL:", e);
  }
  // --- Fin Saludo Personalizado ---

  // --------------------------------------------------
  // Paso 2: Resultado Desplegable
  // --------------------------------------------------
  const toggleOutputBtn = document.getElementById('toggleOutputBtn');
  const iaOutputContent = document.getElementById('iaOutputContent');

  if (toggleOutputBtn && iaOutputContent) {
    toggleOutputBtn.addEventListener('click', () => {
      const isVisible = iaOutputContent.classList.contains('visible');
      if (isVisible) {
        iaOutputContent.classList.remove('visible');
        toggleOutputBtn.textContent = 'Mira el resultado';
      } else {
        iaOutputContent.classList.add('visible');
        toggleOutputBtn.textContent = 'Ocultar resultado';
      }
    });
  }

  // --------------------------------------------------
  // Paso 4: Calentamiento de prompts
  // --------------------------------------------------
  const analyzeBtn = document.getElementById('analyzeBtn');
  const retryBtn   = document.getElementById('retryBtn');
  const feedback4   = document.getElementById('step4Feedback');
  const paso4      = document.getElementById('paso4');
  const warmupForm = document.getElementById('warmupForm'); // Referencia al formulario

  if (analyzeBtn && feedback4 && paso4 && warmupForm) { // Añadido warmupForm
      analyzeBtn.addEventListener('click', async () => {
        // Limpiar feedback anterior y mostrar carga
        feedback4.textContent = '';
        feedback4.className = 'feedback'; // Reset class
        feedback4.innerHTML = '<span class="loader"></span> Evaluando el prompt...';
        feedback4.className = 'feedback feedback--loading';
        if(retryBtn) retryBtn.style.display = 'none';

        // Leer y validar campos
        const rolInput = warmupForm.querySelector('[name="rol"]');
        const objetivoInput = warmupForm.querySelector('[name="objetivo"]');
        const contextoInput = warmupForm.querySelector('[name="contexto"]');

        const rol = rolInput ? rolInput.value.trim() : '';
        const objetivo = objetivoInput ? objetivoInput.value.trim() : '';
        const contexto = contextoInput ? contextoInput.value.trim() : '';

        if (!rol || !objetivo || !contexto) {
          feedback4.textContent = 'Por favor, completa todos los campos (Rol, Objetivo y Contexto).';
          feedback4.className = 'feedback feedback--bad'; // Usar nuevo estilo de borde
          paso4.scrollIntoView({ behavior: 'smooth' });
          return;
        }

        try {
          // --- Simulación de llamada a API (reemplazar con tu fetch real) ---
          // const res = await fetch('/api/analyze', { /* ... */ });
          // const data = await res.json();
          // --- Fin Simulación ---

          // --- Inicio Simulación de Respuesta ---
          await new Promise(resolve => setTimeout(resolve, 1500)); // Simular delay
          const mockScore = Math.random() * 100;
          const mockData = {
              suggestions: `Análisis simulado: Tu prompt tiene ${rol ? 'un rol claro' : 'falta rol'}, ${objetivo ? 'un objetivo definido' : 'falta objetivo'} y ${contexto ? 'contexto adecuado' : 'falta contexto'}. Puntuación: ${mockScore.toFixed(0)}`,
              score: mockScore,
              ok: mockScore > 75
          };
          const data = mockData; // Usar datos simulados
          // --- Fin Simulación de Respuesta ---


          feedback4.innerHTML = data.suggestions || 'Análisis completado.';

          let cls = 'feedback--bad';
          if (data.ok === true) {
              cls = 'feedback--good';
          } else if (typeof data.score === 'number' && data.score >= 50) {
              cls = 'feedback--okay';
          }
          feedback4.className = `feedback ${cls}`; // Aplicar clase para borde y fondo

          if (cls !== 'feedback--good' && retryBtn) {
               retryBtn.style.display = 'inline-block';
          }

        } catch (err) {
          console.error("Error en Paso 4:", err);
          feedback4.textContent   = `Error al analizar: ${err.message}. Intenta de nuevo.`;
          feedback4.className     = 'feedback feedback--bad'; // Borde rojo en error
          if(retryBtn) retryBtn.style.display = 'inline-block';
        }

        feedback4.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
  }

  // **MODIFICADO:** Reintentar limpia feedback Y formulario
  if (retryBtn && feedback4 && paso4 && warmupForm) {
      retryBtn.addEventListener('click', () => {
        feedback4.textContent   = '';
        feedback4.className     = 'feedback'; // Resetear clase
        retryBtn.style.display = 'none';
        warmupForm.reset(); // Limpiar los campos del formulario
        paso4.scrollIntoView({ behavior: 'smooth' });
      });
  }

  // --------------------------------------------------
  // Paso 5: Evaluación semáforo del estudiante
  // --------------------------------------------------
  const evaluateBtn      = document.getElementById('evaluatePrompt');
  const challengeFeedback = document.getElementById('challengeFeedback');
  const trafficLights     = document.querySelectorAll('#trafficLight .light');
  const studentPromptText = document.getElementById('studentPrompt');
  const paso5             = document.getElementById('paso5');

  if (evaluateBtn && challengeFeedback && trafficLights.length > 0 && studentPromptText && paso5) {
    evaluateBtn.addEventListener('click', async () => {
      const studentPrompt = studentPromptText.value.trim();

      // **MODIFICADO:** Limpiar feedback ANTES de mostrar carga
      challengeFeedback.textContent = ''; // Limpiar texto
      challengeFeedback.className = 'feedback'; // Resetear clase base

      // Reset semáforo inicial
      trafficLights.forEach(light => light.classList.remove('active'));


      if (!studentPrompt) {
        challengeFeedback.textContent = 'Escribe tu prompt antes de evaluar.';
        challengeFeedback.className   = 'feedback feedback--bad'; // Borde rojo
        paso5.scrollIntoView({ behavior: 'smooth' });
        return;
      }

      // Mostrar estado de carga con loader
      challengeFeedback.innerHTML = '<span class="loader"></span> Evaluando prompt...';
      challengeFeedback.className   = 'feedback feedback--loading'; // Borde gris

      try {
        // --- Simulación de llamada a API (reemplazar con tu fetch real) ---
        // const res2 = await fetch('/api/evaluate', { /* ... */ });
        // const info = await res2.json();
        // --- Fin Simulación ---

         // --- Inicio Simulación de Respuesta ---
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simular delay
        const randomLevel = ['bad', 'okay', 'good'][Math.floor(Math.random() * 3)];
        const mockInfo = {
            level: randomLevel === 'bad' ? 'red' : (randomLevel === 'okay' ? 'yellow' : 'green'), // Convertir a color de luz
            feedback: `Evaluación simulada: El prompt parece ${randomLevel === 'bad' ? 'débil' : (randomLevel === 'okay' ? 'aceptable' : 'bueno')}. ${randomLevel === 'good' ? '¡Buen trabajo!' : 'Intenta añadir más detalle o contexto.'}`
        };
         const info = mockInfo; // Usar datos simulados
        // --- Fin Simulación de Respuesta ---


        // Reset semáforo antes de activar el correcto
        trafficLights.forEach(light => light.classList.remove('active'));

        const validLevels = ['red', 'yellow', 'green'];
        // Usar 'red' como fallback si info.level no es válido
        const level = info.level && validLevels.includes(info.level) ? info.level : 'red';

        // Iluminar nivel correspondiente
        const activeLight = Array.from(trafficLights)
          .find(light => light.classList.contains(level));
        if (activeLight) activeLight.classList.add('active');

        // Mostrar feedback con borde y fondo según nivel
        challengeFeedback.textContent = info.feedback || 'Evaluación completada.';
        // Convertir 'red' a 'bad', 'yellow' a 'okay', 'green' a 'good' para la clase CSS
        const feedbackClassLevel = level === 'red' ? 'bad' : (level === 'yellow' ? 'okay' : 'good');
        challengeFeedback.className   = `feedback feedback--${feedbackClassLevel}`;


      } catch (e) {
        console.error("Error en Paso 5:", e);
        challengeFeedback.textContent = `Error al evaluar: ${e.message}. Intenta más tarde.`;
        challengeFeedback.className   = 'feedback feedback--bad'; // Borde rojo en error
        // Asegurar que el semáforo esté apagado en error y encender rojo
        trafficLights.forEach(light => light.classList.remove('active'));
        const redLight = document.querySelector('#trafficLight .light.red');
        if(redLight) redLight.classList.add('active');

      }

      challengeFeedback.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }
});