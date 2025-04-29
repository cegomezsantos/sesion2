document.addEventListener('DOMContentLoaded', () => {
  // --- Obtener referencias a los elementos ---
  const promptInput = document.getElementById('prompt-input');
  const evaluateButton = document.getElementById('evaluate-button');
  const loadingIndicator = document.getElementById('loading-indicator');
  const feedbackArea = document.getElementById('feedback-area');
  const buttonArea = document.querySelector('.button-area'); // Contenedor de botones

  // --- Función para simular la evaluación (Aquí iría tu llamada a la API/Netlify Function) ---
  async function evaluatePrompt(promptText) {
      console.log("Evaluando:", promptText);
      // Simular una demora de red/procesamiento
      await new Promise(resolve => setTimeout(resolve, 1500)); // Espera 1.5 segundos

      // --- ¡IMPORTANTE! ---
      // Aquí es donde harías la llamada real a tu backend o Netlify Function
      // Ejemplo con fetch (necesitarás crear la Netlify Function '/.netlify/functions/evaluate'):
      /*
      try {
          const response = await fetch('/.netlify/functions/evaluate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prompt: promptText })
          });

          if (!response.ok) {
              const errorData = await response.json(); // O response.text()
              throw new Error(errorData.message || `Error ${response.status}`);
          }

          const result = await response.json();
          // Asume que la función devuelve { success: true, feedback: "Tu feedback aquí" }
          // o { success: false, message: "Mensaje de error" }
          if (result.success) {
               return { success: true, feedback: result.feedback };
          } else {
               throw new Error(result.message || "Error desconocido en la evaluación.");
          }

      } catch (error) {
          console.error("Error al llamar a la función de evaluación:", error);
          return { success: false, feedback: `Error en la conexión: ${error.message}` };
      }
      */

      // --- Respuesta Simulada (elimina esto cuando uses la llamada real) ---
      if (promptText.toLowerCase().includes("cuestionario")) {
          return {
              success: true,
              feedback: `¡Buen intento!\nHas solicitado un cuestionario.\n\nFeedback simulado:\n- Podrías especificar el tema (ej. "historia romana").\n- Indica el nivel (ej. "para 5º grado").\n- ¿Cuántas preguntas quieres?`
          };
      } else if (promptText.trim() === "") {
           return {
              success: false,
              feedback: "El prompt no puede estar vacío."
          };
      } else {
          return {
              success: true, // O false si quieres simular un error para otros prompts
              feedback: `Feedback simulado para:\n"${promptText}"\n\nConsidera ser más específico sobre el propósito.`
          };
      }
      // --- Fin de la Respuesta Simulada ---
  }

  // --- Función para manejar el clic en "Evaluar Prompt" ---
  async function handleEvaluateClick() {
      const promptText = promptInput.value;

      // Limpiar feedback anterior y mostrar carga
      feedbackArea.innerHTML = '';
      feedbackArea.style.display = 'none'; // Ocultar mientras carga
      loadingIndicator.style.display = 'flex'; // Mostrar indicador (usamos flex por el spinner)
      evaluateButton.disabled = true;
      // Limpiar botón de reintento si existiera
      const existingRetryButton = document.getElementById('retry-button');
      if (existingRetryButton) {
          existingRetryButton.remove();
      }

      // Llamar a la función de evaluación (simulada o real)
      const result = await evaluatePrompt(promptText);

      // Ocultar carga
      loadingIndicator.style.display = 'none';

      // Mostrar resultado
      feedbackArea.style.display = 'block'; // Mostrar área de feedback
      if (result.success) {
          feedbackArea.innerHTML = `<p>${result.feedback}</p>`; // Usar <p> para formato
          feedbackArea.classList.remove('error');
      } else {
          feedbackArea.innerHTML = `<p class="error">Error: ${result.feedback}</p>`;
          feedbackArea.classList.add('error'); // Opcional: añadir clase para estilo de error
      }

      // Crear y añadir el botón "Volver a Intentar"
      createRetryButton();
  }

  // --- Función para crear y añadir el botón "Volver a Intentar" ---
  function createRetryButton() {
       // Eliminar si ya existe (por si acaso)
      const existingRetryButton = document.getElementById('retry-button');
      if (existingRetryButton) {
          existingRetryButton.remove();
      }

      const retryButton = document.createElement('button');
      retryButton.id = 'retry-button';
      retryButton.type = 'button';
      retryButton.textContent = 'Volver a Intentar';
      retryButton.addEventListener('click', handleRetryClick);
      buttonArea.appendChild(retryButton); // Añadir al contenedor de botones
  }


  // --- Función para manejar el clic en "Volver a Intentar" ---
  function handleRetryClick() {
      // Limpiar prompt y feedback
      // promptInput.value = ''; // Descomenta si quieres borrar el prompt anterior
      feedbackArea.innerHTML = '';
      feedbackArea.style.display = 'none'; // Ocultar de nuevo
      feedbackArea.classList.remove('error');


      // Quitar botón de reintento
      const retryButton = document.getElementById('retry-button');
      if (retryButton) {
          retryButton.remove();
      }

      // Habilitar botón de evaluar
      evaluateButton.disabled = false;

      // Poner foco en el input
      promptInput.focus();
  }

  // --- Añadir el Event Listener al botón inicial ---
  if (evaluateButton) {
      evaluateButton.addEventListener('click', handleEvaluateClick);
  } else {
      console.error("¡Error! No se encontró el botón 'evaluate-button'");
  }
});