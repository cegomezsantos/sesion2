document.addEventListener('DOMContentLoaded', () => {

  // --- Intersection Observer for Animations ---
  const sectionsToAnimate = document.querySelectorAll('.animate-on-scroll');
  const observerOptions = { root: null, rootMargin: '0px', threshold: 0.1 };
  const observerCallback = (entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
      }
    });
  };
  const observer = new IntersectionObserver(observerCallback, observerOptions);
  sectionsToAnimate.forEach(section => { observer.observe(section); });
  // --- End Intersection Observer ---


  // --- Saludo Personalizado ---
  const welcomeMessage = document.getElementById('welcomeMessage');
  const defaultWelcomeText = welcomeMessage ? welcomeMessage.textContent : "Sandbox de Prompts";
  try {
    const params = new URLSearchParams(window.location.search);
    const userName = params.get('naus');
    if (welcomeMessage && userName && userName.trim() !== '') {
      const capitalizedUserName = userName.charAt(0).toUpperCase() + userName.slice(1).toLowerCase();
      welcomeMessage.textContent = `¡Hola, ${capitalizedUserName}!`;
      const subtitle = document.querySelector('.main-header .subtitle');
      if (subtitle) {
          subtitle.textContent = `Bienvenido/a al Sandbox Inteligente. ${subtitle.textContent}`;
      }
    } else if (welcomeMessage) {
        welcomeMessage.textContent = defaultWelcomeText;
    }
  } catch (e) {
    console.error("Error al procesar parámetros de URL:", e);
     if (welcomeMessage) welcomeMessage.textContent = defaultWelcomeText;
  }
  // --- Fin Saludo Personalizado ---

  // --- Paso 2: Resultado Desplegable ---
  const toggleOutputBtn = document.getElementById('toggleOutputBtn');
  const iaOutputContent = document.getElementById('iaOutputContent');
  if (toggleOutputBtn && iaOutputContent) {
    toggleOutputBtn.addEventListener('click', () => {
      const isVisible = iaOutputContent.classList.contains('visible');
      if (isVisible) {
        iaOutputContent.classList.remove('visible');
        toggleOutputBtn.textContent = 'Mostrar Resultado Ejemplo';
      } else {
        iaOutputContent.classList.add('visible');
        toggleOutputBtn.textContent = 'Ocultar Resultado Ejemplo';
      }
    });
  }

  // --- Helper: Show Feedback with Animation ---
  function showFeedback(element, message, type = 'bad', isLoading = false) {
      if (!element) return;
      element.textContent = '';
      // Asegurar que siempre tenga la clase base para animación
      element.className = 'feedback animate-feedback';
      setTimeout(() => {
          if (isLoading) {
              element.innerHTML = `<span class="loader"></span> ${message}`;
              element.classList.add('feedback--loading');
          } else {
              element.textContent = message;
              element.classList.add(`feedback--${type}`);
          }
          element.classList.add('visible'); // Trigger animation
      }, 10);
  }

   // --- Helper: Show/Hide Completion Message ---
    function showCompletionMessage(show = true) {
        const completionDiv = document.getElementById('completionMessage');
        if (!completionDiv) return;

        if (show) {
            // Ensure it's visible and triggers animation
            completionDiv.style.display = 'block'; // Or use flex/grid if needed
            setTimeout(() => {
                 completionDiv.classList.add('visible');
            }, 10); // Small delay to allow display change before animation class
        } else {
            completionDiv.classList.remove('visible');
             // Optional: Hide completely after animation
             // setTimeout(() => { completionDiv.style.display = 'none'; }, 300); // Match CSS transition duration
              completionDiv.style.display = 'none'; // Hide immediately for now
        }
    }


  // --- Paso 4: Calentamiento de prompts ---
  const analyzeBtn = document.getElementById('analyzeBtn');
  const retryBtn = document.getElementById('retryBtn');
  const feedback4 = document.getElementById('step4Feedback');
  const paso4 = document.getElementById('paso4');
  const warmupForm = document.getElementById('warmupForm');
  if (analyzeBtn && feedback4 && paso4 && warmupForm) {
    analyzeBtn.addEventListener('click', async () => {
        showFeedback(feedback4, 'Analizando tu prompt...', '', true);
        if (retryBtn) retryBtn.style.display = 'none';
        const rol = warmupForm.querySelector('[name="rol"]')?.value.trim() || '';
        const objetivo = warmupForm.querySelector('[name="objetivo"]')?.value.trim() || '';
        const contexto = warmupForm.querySelector('[name="contexto"]')?.value.trim() || '';

        if (!rol || !objetivo || !contexto) {
            showFeedback(feedback4, 'Por favor, completa Rol, Objetivo y Contexto.', 'bad');
            paso4.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }
        try {
            await new Promise(resolve => setTimeout(resolve, 1500)); // Simulación
            const mockScore = Math.random() * 100;
            const mockOk = mockScore > 75;
            const mockSuggestions = `Análisis: ${mockOk ? '¡Buen trabajo!' : 'Podrías mejorar.'} Rol ${rol ? 'detectado' : 'ausente'}, Objetivo ${objetivo ? 'claro' : 'difuso'}, Contexto ${contexto ? 'presente' : 'falta'}.`;
            const data = { suggestions: mockSuggestions, score: mockScore, ok: mockOk };

            let feedbackType = 'bad';
            if (data.ok) feedbackType = 'good';
            else if (data.score >= 50) feedbackType = 'okay';
            showFeedback(feedback4, data.suggestions || 'Análisis completado.', feedbackType);
            if (feedbackType !== 'good' && retryBtn) retryBtn.style.display = 'inline-block';
        } catch (err) {
            console.error("Error en Paso 4:", err);
            showFeedback(feedback4, `Error al analizar: ${err.message}. Intenta de nuevo.`, 'bad');
            if (retryBtn) retryBtn.style.display = 'inline-block';
        }
        feedback4.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }
  if (retryBtn && feedback4 && paso4 && warmupForm) {
    retryBtn.addEventListener('click', () => {
      feedback4.textContent = '';
      feedback4.className = 'feedback animate-feedback';
      retryBtn.style.display = 'none';
      warmupForm.reset();
      paso4.querySelector('input[name="rol"]')?.focus();
    });
  }

  // --- Paso 5: Evaluación semáforo y Finalización ---
  const evaluateBtn = document.getElementById('evaluatePrompt');
  const challengeFeedback = document.getElementById('challengeFeedback');
  const trafficLights = document.querySelectorAll('#trafficLight .light');
  const studentPromptText = document.getElementById('studentPrompt');
  const paso5 = document.getElementById('paso5');
  const completionMessageDiv = document.getElementById('completionMessage'); // Get reference

  function setTrafficLight(level) {
      trafficLights.forEach(light => {
          light.classList.remove('active');
          if (level && light.classList.contains(level)) {
              light.classList.add('active');
          }
      });
  }

  if (evaluateBtn && challengeFeedback && trafficLights.length > 0 && studentPromptText && paso5 && completionMessageDiv) { // Check completionMessageDiv
    evaluateBtn.addEventListener('click', async () => {
        const studentPrompt = studentPromptText.value.trim();

        setTrafficLight(null);
        showCompletionMessage(false); // **NUEVO:** Ocultar mensaje de completado al evaluar
        showFeedback(challengeFeedback, 'Evaluando tu prompt...', '', true);

        if (!studentPrompt) {
            showFeedback(challengeFeedback, 'Escribe tu prompt antes de evaluar.', 'bad');
            setTrafficLight('red');
            paso5.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        try {
            await new Promise(resolve => setTimeout(resolve, 1500)); // Simulación
            const randomNum = Math.random();
            let level, feedbackMsg, feedbackType;
            if (randomNum < 0.33) {
                level = 'red'; feedbackType = 'bad'; feedbackMsg = 'Este prompt necesita más detalles. ¿Podrías especificar el formato o la audiencia?';
            } else if (randomNum < 0.66) {
                level = 'yellow'; feedbackType = 'okay'; feedbackMsg = '¡Casi! El prompt es bueno, pero considera añadir un ejemplo o un tono específico.';
            } else {
                level = 'green'; feedbackType = 'good'; feedbackMsg = '¡Excelente prompt! Claro, conciso y con toda la información necesaria.';
            }
            const info = { level: level, feedback: feedbackMsg };

            setTrafficLight(info.level);
            showFeedback(challengeFeedback, info.feedback || 'Evaluación completada.', feedbackType);

            // **NUEVO:** Mostrar mensaje de completado si es 'okay' o 'good'
            if (feedbackType === 'okay' || feedbackType === 'good') {
                 showCompletionMessage(true);
                 completionMessageDiv.scrollIntoView({ behavior: 'smooth', block: 'center' }); // Scroll to completion message
            } else {
                 showCompletionMessage(false); // Asegurarse que está oculto si es 'bad'
            }


        } catch (e) {
            console.error("Error en Paso 5:", e);
            showFeedback(challengeFeedback, `Error al evaluar: ${e.message}. Intenta más tarde.`, 'bad');
            setTrafficLight('red');
            showCompletionMessage(false); // Asegurarse que está oculto en error
        }

        // No hacer scroll automático al feedback si se muestra el mensaje de completado
        if (!(feedbackType === 'okay' || feedbackType === 'good')) {
            challengeFeedback.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });
  }

});