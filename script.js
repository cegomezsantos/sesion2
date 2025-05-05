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
      element.className = 'feedback animate-feedback';
      setTimeout(() => {
          if (isLoading) {
              element.innerHTML = `<span class="loader"></span> ${message}`;
              element.classList.add('feedback--loading');
          } else {
              // Asegúrate que el mensaje sea tratado como texto plano
              element.textContent = message;
              element.classList.add(`feedback--${type}`);
          }
          element.classList.add('visible');
      }, 10);
  }

   // --- Helper: Show/Hide Completion Message ---
    function showCompletionMessage(show = true) {
        const completionDiv = document.getElementById('completionMessage');
        if (!completionDiv) return;
        if (show) {
            completionDiv.style.display = 'block';
            setTimeout(() => { completionDiv.classList.add('visible'); }, 10);
        } else {
            completionDiv.classList.remove('visible');
            completionDiv.style.display = 'none';
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
            // **REAL API CALL (Step 4)**
            const res = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rol, objetivo, contexto })
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ error: `Error HTTP ${res.status}` }));
                throw new Error(errorData.error || `Error HTTP ${res.status}`);
            }

            const data = await res.json(); // Expected: { suggestions, score, ok }

            let feedbackType = 'bad';
            // Usamos 'ok' como principal indicador, luego 'score'
            if (data.ok === true) {
                feedbackType = 'good';
            } else if (data.score !== undefined && data.score >= 50) {
                 feedbackType = 'okay';
            }

            // Mostrar sugerencias (puede ser HTML o texto plano)
            // Si viene como HTML, innerHTML es correcto. Si es texto plano, textContent.
            // Por seguridad, si no estamos seguros, usamos textContent.
             if (feedback4) {
                 feedback4.textContent = ''; // Clear previous content/loader
                 feedback4.className = 'feedback animate-feedback'; // Reset classes
             }
             showFeedback(feedback4, data.suggestions || 'Análisis completado.', feedbackType);


            if (feedbackType !== 'good' && retryBtn) {
                retryBtn.style.display = 'inline-block';
            }

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
  const completionMessageDiv = document.getElementById('completionMessage');

  function setTrafficLight(level) { // level: 'red', 'yellow', 'green'
      trafficLights.forEach(light => {
          light.classList.remove('active');
          if (level && light.classList.contains(level)) {
              light.classList.add('active');
          }
      });
  }

  if (evaluateBtn && challengeFeedback && trafficLights.length > 0 && studentPromptText && paso5 && completionMessageDiv) {
    evaluateBtn.addEventListener('click', async () => {
        const studentPrompt = studentPromptText.value.trim();

        setTrafficLight(null);
        showCompletionMessage(false);
        showFeedback(challengeFeedback, 'Evaluando tu prompt...', '', true);

        if (!studentPrompt) {
            showFeedback(challengeFeedback, 'Escribe tu prompt antes de evaluar.', 'bad');
            setTrafficLight('red');
            paso5.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        try {
            // **REAL API CALL (Step 5)**
            const res = await fetch('/api/evaluate', {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({ prompt: studentPrompt })
             });

             if (!res.ok) {
                const errorData = await res.json().catch(() => ({ error: `Error HTTP ${res.status}` }));
                throw new Error(errorData.error || `Error HTTP ${res.status}`);
            }

            const info = await res.json(); // Expected: { level, feedback }

            // Validar el nivel recibido del backend
            const validLevels = ['red', 'yellow', 'green'];
            const level = validLevels.includes(info.level) ? info.level : 'red'; // Default a 'red' si no es válido

             // Mapear nivel ('red', 'yellow', 'green') a tipo de feedback para CSS ('bad', 'okay', 'good')
            let feedbackType = 'bad';
            if (level === 'green') feedbackType = 'good';
            else if (level === 'yellow') feedbackType = 'okay';

            setTrafficLight(level);
            showFeedback(challengeFeedback, info.feedback || 'Evaluación completada.', feedbackType);

            if (feedbackType === 'okay' || feedbackType === 'good') {
                 showCompletionMessage(true);
                 completionMessageDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                 showCompletionMessage(false);
            }


        } catch (e) {
            console.error("Error en Paso 5:", e);
            showFeedback(challengeFeedback, `Error al evaluar: ${e.message}. Intenta más tarde.`, 'bad');
            setTrafficLight('red');
            showCompletionMessage(false);
        }

        // Scroll al feedback solo si el mensaje de completado NO se muestra
        if (!completionMessageDiv.classList.contains('visible')) {
             challengeFeedback.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });
  }

});