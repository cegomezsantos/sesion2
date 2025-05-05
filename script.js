document.addEventListener('DOMContentLoaded', () => {
  // --- **NUEVO:** Saludo Personalizado ---
  const welcomeMessage = document.getElementById('welcomeMessage');
  try {
    const params = new URLSearchParams(window.location.search);
    const userName = params.get('naus'); // Obtener nombre del parámetro 'naus'

    if (userName && userName.trim() !== '') {
      // Capitalizar la primera letra del nombre
      const capitalizedUserName = userName.charAt(0).toUpperCase() + userName.slice(1).toLowerCase();
      welcomeMessage.textContent = `¡Hola, ${capitalizedUserName}! Bienvenido/a al Sandbox Inteligente`;
    }
    // Si no hay 'naus' o está vacío, se queda el mensaje por defecto del HTML
  } catch (e) {
    console.error("Error al procesar parámetros de URL:", e);
    // Mantener mensaje por defecto en caso de error
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
  const feedback4   = document.getElementById('step4Feedback'); // Renombrado para claridad
  //const progress   = document.getElementById('progress'); // No veo elemento progress en el HTML, comentado
  const paso4      = document.getElementById('paso4');

  if (analyzeBtn && feedback4 && paso4) {
      analyzeBtn.addEventListener('click', async () => {
        // **MODIFICADO:** Mostrar estado de carga con loader
        feedback4.innerHTML = '<span class="loader"></span> Evaluando el prompt...';
        feedback4.className   = 'feedback feedback--loading';
        if(retryBtn) retryBtn.style.display = 'none';

        // Leer y validar campos
        const rolInput = document.querySelector('#warmupForm [name="rol"]');
        const objetivoInput = document.querySelector('#warmupForm [name="objetivo"]');
        const contextoInput = document.querySelector('#warmupForm [name="contexto"]');

        // Asegurarse que los inputs existen antes de leer .value
        const rol = rolInput ? rolInput.value.trim() : '';
        const objetivo = objetivoInput ? objetivoInput.value.trim() : '';
        const contexto = contextoInput ? contextoInput.value.trim() : '';

        if (!rol || !objetivo || !contexto) {
          feedback4.textContent = 'Por favor, completa todos los campos (Rol, Objetivo y Contexto).';
          feedback4.className   = 'feedback feedback--bad';
          paso4.scrollIntoView({ behavior: 'smooth' });
          return;
        }

        try {
          const res  = await fetch('/api/analyze', { // Asegúrate que esta ruta '/api/analyze' existe en tu backend
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rol, objetivo, contexto })
          });

          if (!res.ok) {
              // Intentar leer el cuerpo del error si es posible
              let errorMsg = `Error HTTP ${res.status}: ${res.statusText}`;
              try {
                  const errorData = await res.json();
                  errorMsg = errorData.message || errorMsg; // Usa mensaje del backend si existe
              } catch (jsonError) {
                  // Si el cuerpo del error no es JSON, usar el mensaje HTTP
              }
              throw new Error(errorMsg);
          }

          const data = await res.json();

          // Mostrar sugerencias HTML
          feedback4.innerHTML = data.suggestions || 'Análisis completado.'; // Mensaje por defecto si no hay sugerencias
          // Determinar clase de estado
          let cls = 'feedback--bad'; // Por defecto es malo si no hay 'ok' o 'score'
          if (data.ok === true) { // Chequeo explícito de booleano
              cls = 'feedback--good';
          } else if (typeof data.score === 'number' && data.score >= 50) {
              cls = 'feedback--okay';
          }
          // Si no es ni bueno ni okay, se queda como malo
          feedback4.className = `feedback ${cls}`;


          // Actualizar barra de progreso (si existiera)
          /*
          if (progress && typeof data.score === 'number') {
            progress.value = data.score;
          }
          */
          // Mostrar botón de reintento si falla o no es 'good'
          if (cls !== 'feedback--good' && retryBtn) {
               retryBtn.style.display = 'inline-block';
          }

        } catch (err) {
          console.error("Error en Paso 4:", err);
          feedback4.textContent   = `Error al analizar: ${err.message}. Intenta de nuevo.`; // Mostrar mensaje de error
          feedback4.className     = 'feedback feedback--bad';
          if(retryBtn) retryBtn.style.display = 'inline-block';
        }

        // Desplazar suavemente al inicio del feedback del paso 4
        feedback4.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
  }

  // Reintentar: limpia el feedback y oculta el botón
  if (retryBtn && feedback4 && paso4) {
      retryBtn.addEventListener('click', () => {
        feedback4.textContent   = '';
        feedback4.className     = 'feedback';
        retryBtn.style.display = 'none';
        // Limpiar campos del formulario también? Podría ser útil
        // document.getElementById('warmupForm').reset();
        paso4.scrollIntoView({ behavior: 'smooth' });
      });
  }

  // --------------------------------------------------
  // Paso 5: Evaluación semáforo del estudiante
  // --------------------------------------------------
  const evaluateBtn      = document.getElementById('evaluatePrompt');
  const challengeFeedback = document.getElementById('challengeFeedback');
  const trafficLights     = document.querySelectorAll('#trafficLight .light');
  const studentPromptText = document.getElementById('studentPrompt'); // Textarea
  const paso5             = document.getElementById('paso5');

  if (evaluateBtn && challengeFeedback && trafficLights.length > 0 && studentPromptText && paso5) {
    evaluateBtn.addEventListener('click', async () => {
      // Leer y validar prompt del estudiante
      const studentPrompt = studentPromptText.value.trim();
      if (!studentPrompt) {
        challengeFeedback.textContent = 'Escribe tu prompt antes de evaluar.';
        challengeFeedback.className   = 'feedback feedback--bad';
        // Reset semáforo
        trafficLights.forEach(light => light.classList.remove('active'));
        paso5.scrollIntoView({ behavior: 'smooth' });
        return;
      }

      // **MODIFICADO:** Mostrar estado de carga con loader
      challengeFeedback.innerHTML = '<span class="loader"></span> Evaluando prompt...';
      challengeFeedback.className   = 'feedback feedback--loading';
      // Reset semáforo mientras carga
      trafficLights.forEach(light => light.classList.remove('active'));


      try {
        const res2 = await fetch('/api/evaluate', { // Asegúrate que esta ruta '/api/evaluate' existe en tu backend
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: studentPrompt })
        });

        if (!res2.ok) {
           let errorMsg = `Error HTTP ${res2.status}: ${res2.statusText}`;
            try {
                const errorData = await res2.json();
                errorMsg = errorData.message || errorMsg;
            } catch (jsonError) {
                // Sin cuerpo JSON
            }
           throw new Error(errorMsg);
        }

        const info = await res2.json();

        // Reset semáforo antes de activar el correcto
        trafficLights.forEach(light => light.classList.remove('active'));

        // Validar nivel recibido
        const validLevels = ['red', 'yellow', 'green'];
        const level = info.level && validLevels.includes(info.level) ? info.level : 'bad'; // 'bad' como fallback

        // Iluminar nivel correspondiente (red/yellow/green)
        const activeLight = Array.from(trafficLights)
          .find(light => light.classList.contains(level === 'bad' ? 'red' : level)); // Si level es 'bad', usa 'red'
        if (activeLight) activeLight.classList.add('active'); // Añadir clase 'active'

        // Mostrar feedback con color según nivel
        challengeFeedback.textContent = info.feedback || 'Evaluación completada.';
        // Usar 'bad' para el color si el nivel no es válido o no se recibe
        challengeFeedback.className   = `feedback feedback--${level === 'bad' ? 'bad' : level}`;


      } catch (e) {
        console.error("Error en Paso 5:", e);
        challengeFeedback.textContent = `Error al evaluar: ${e.message}. Intenta más tarde.`;
        challengeFeedback.className   = 'feedback feedback--bad';
        // Asegurar que el semáforo esté apagado en error
        trafficLights.forEach(light => light.classList.remove('active'));
        // Encender luz roja en error
        const redLight = document.querySelector('#trafficLight .light.red');
        if(redLight) redLight.classList.add('active');

      }

      // Desplazar al feedback del paso 5
      challengeFeedback.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }
});