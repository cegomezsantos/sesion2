document.addEventListener('DOMContentLoaded', () => {

  // --- Intersection Observer for Animations ---
  const sectionsToAnimate = document.querySelectorAll('.animate-on-scroll');

  const observerOptions = {
    root: null, // relative to the viewport
    rootMargin: '0px',
    threshold: 0.1 // Trigger when 10% of the element is visible
  };

  const observerCallback = (entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        // Optional: Unobserve after animation to save resources
        // observer.unobserve(entry.target);
      }
      // Optional: Remove class if element scrolls out of view
      // else {
      //   entry.target.classList.remove('is-visible');
      // }
    });
  };

  const observer = new IntersectionObserver(observerCallback, observerOptions);
  sectionsToAnimate.forEach(section => {
    observer.observe(section);
  });
  // --- End Intersection Observer ---


  // --- Saludo Personalizado ---
  const welcomeMessage = document.getElementById('welcomeMessage');
  // Get the h1's default text in case the parameter is missing
  const defaultWelcomeText = welcomeMessage ? welcomeMessage.textContent : "Sandbox de Prompts";
  try {
    const params = new URLSearchParams(window.location.search);
    const userName = params.get('naus');

    if (welcomeMessage && userName && userName.trim() !== '') {
      const capitalizedUserName = userName.charAt(0).toUpperCase() + userName.slice(1).toLowerCase();
      welcomeMessage.textContent = `¡Hola, ${capitalizedUserName}!`; // Just the name for the H1
      // Find the subtitle paragraph and add the rest of the welcome message
      const subtitle = document.querySelector('.main-header .subtitle');
      if (subtitle) {
          subtitle.textContent = `Bienvenido/a al Sandbox Inteligente. ${subtitle.textContent}`;
      }
    } else if (welcomeMessage) {
        // If no name, ensure the H1 has the default text
        welcomeMessage.textContent = defaultWelcomeText;
    }
  } catch (e) {
    console.error("Error al procesar parámetros de URL:", e);
     if (welcomeMessage) welcomeMessage.textContent = defaultWelcomeText; // Fallback on error
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

      element.textContent = ''; // Clear previous content
      element.className = 'feedback animate-feedback'; // Reset classes

      // Wait a tiny moment for the class reset to apply before adding the new ones
      // This helps ensure the animation runs correctly every time.
      setTimeout(() => {
          if (isLoading) {
              element.innerHTML = `<span class="loader"></span> ${message}`;
              element.classList.add('feedback--loading');
          } else {
              element.textContent = message; // Set text AFTER adding class
              element.classList.add(`feedback--${type}`); // e.g., feedback--good
          }
          // Trigger animation
          element.classList.add('visible');
      }, 10);
  }

  // --- Paso 4: Calentamiento de prompts ---
  const analyzeBtn = document.getElementById('analyzeBtn');
  const retryBtn = document.getElementById('retryBtn');
  const feedback4 = document.getElementById('step4Feedback');
  const paso4 = document.getElementById('paso4');
  const warmupForm = document.getElementById('warmupForm');

  if (analyzeBtn && feedback4 && paso4 && warmupForm) {
    analyzeBtn.addEventListener('click', async () => {
        showFeedback(feedback4, 'Analizando tu prompt...', '', true); // Show loading state
        if (retryBtn) retryBtn.style.display = 'none';

        const rolInput = warmupForm.querySelector('[name="rol"]');
        const objetivoInput = warmupForm.querySelector('[name="objetivo"]');
        const contextoInput = warmupForm.querySelector('[name="contexto"]');

        const rol = rolInput ? rolInput.value.trim() : '';
        const objetivo = objetivoInput ? objetivoInput.value.trim() : '';
        const contexto = contextoInput ? contextoInput.value.trim() : '';

        if (!rol || !objetivo || !contexto) {
            showFeedback(feedback4, 'Por favor, completa Rol, Objetivo y Contexto.', 'bad');
            paso4.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        try {
            // --- Simulación API ---
            await new Promise(resolve => setTimeout(resolve, 1500));
            const mockScore = Math.random() * 100;
            const mockOk = mockScore > 75;
            const mockSuggestions = `Análisis: ${mockOk ? '¡Buen trabajo!' : 'Podrías mejorar.'} Rol ${rol ? 'detectado' : 'ausente'}, Objetivo ${objetivo ? 'claro' : 'difuso'}, Contexto ${contexto ? 'presente' : 'falta'}.`;
            const data = { suggestions: mockSuggestions, score: mockScore, ok: mockOk };
            // --- Fin Simulación ---

            let feedbackType = 'bad';
            if (data.ok) {
                feedbackType = 'good';
            } else if (data.score >= 50) {
                feedbackType = 'okay';
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
      feedback4.className = 'feedback animate-feedback'; // Reset class + remove visible
      retryBtn.style.display = 'none';
      warmupForm.reset();
      paso4.querySelector('input[name="rol"]').focus(); // Focus first field
      // paso4.scrollIntoView({ behavior: 'smooth' }); // Scrolling might be jarring here
    });
  }

  // --- Paso 5: Evaluación semáforo ---
  const evaluateBtn = document.getElementById('evaluatePrompt');
  const challengeFeedback = document.getElementById('challengeFeedback');
  const trafficLights = document.querySelectorAll('#trafficLight .light');
  const studentPromptText = document.getElementById('studentPrompt');
  const paso5 = document.getElementById('paso5');

  // Helper to set traffic light state
  function setTrafficLight(level) { // level = 'red', 'yellow', 'green' or null
      trafficLights.forEach(light => {
          light.classList.remove('active');
          if (level && light.classList.contains(level)) {
              light.classList.add('active');
          }
      });
  }

  if (evaluateBtn && challengeFeedback && trafficLights.length > 0 && studentPromptText && paso5) {
    evaluateBtn.addEventListener('click', async () => {
        const studentPrompt = studentPromptText.value.trim();

        // Reset previous state
        setTrafficLight(null); // Turn off all lights
        showFeedback(challengeFeedback, 'Evaluando tu prompt...', '', true); // Show loading

        if (!studentPrompt) {
            showFeedback(challengeFeedback, 'Escribe tu prompt antes de evaluar.', 'bad');
            setTrafficLight('red'); // Show red light for error
            paso5.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }


        try {
            // --- Simulación API ---
            await new Promise(resolve => setTimeout(resolve, 1500));
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
             // --- Fin Simulación ---


            setTrafficLight(info.level); // Set light based on level ('red', 'yellow', 'green')
            showFeedback(challengeFeedback, info.feedback || 'Evaluación completada.', feedbackType); // Use type for color ('bad', 'okay', 'good')


        } catch (e) {
            console.error("Error en Paso 5:", e);
            showFeedback(challengeFeedback, `Error al evaluar: ${e.message}. Intenta más tarde.`, 'bad');
            setTrafficLight('red'); // Red light on error
        }

        challengeFeedback.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

});