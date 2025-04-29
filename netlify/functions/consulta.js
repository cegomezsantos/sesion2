// script.js (CORREGIDO)

document.addEventListener('DOMContentLoaded', () => {
  // --- Obtener referencias a los elementos ---
  const promptInput = document.getElementById('prompt-input');
  const evaluateButton = document.getElementById('evaluate-button');
  const loadingIndicator = document.getElementById('loading-indicator');
  const feedbackArea = document.getElementById('feedback-area');
  const buttonArea = document.querySelector('.button-area'); // Contenedor de botones

  // --- Función para LLAMAR a la Netlify Function ---
  async function evaluatePrompt(promptText) {
      console.log("Llamando a la función Netlify para evaluar:", promptText);

      // Construye la URL con el prompt como query parameter
      const functionUrl = `/.netlify/functions/consulta?prompt=${encodeURIComponent(promptText)}`;

      try {
          // --- ¡LLAMADA REAL A LA FUNCIÓN NETLIFY! ---
          const response = await fetch(functionUrl); // Usamos GET porque pasamos el prompt en la URL

          // Primero, verifica si la respuesta HTTP fue exitosa (ej: 200 OK)
          if (!response.ok) {
              // Intenta obtener más detalles del error si el backend los envió
              let errorMsg = `Error HTTP ${response.status}: ${response.statusText}`;
              try {
                  const errorData = await response.json(); // El backend ahora envía JSON para errores también
                  errorMsg = errorData.message || JSON.stringify(errorData);
              } catch (e) {
                  // Si el cuerpo del error no es JSON, usa el texto
                  errorMsg = await response.text();
              }
               throw new Error(`La función de evaluación falló: ${errorMsg}`);
          }

          // Si la respuesta HTTP es OK (2xx), parsea el JSON que envía la función
          const result = await response.json();

          // La función devuelve { success: true/false, feedback/message: ... }
          return result; // Devolvemos directamente el objeto { success, feedback/message }

      } catch (error) {
          console.error("Error al llamar o procesar la función de evaluación:", error);
          // Devuelve un objeto con formato de error consistente
          return { success: false, message: `Error en la comunicación: ${error.message}` };
      }

      // --- SE ELIMINÓ TODA LA LÓGICA DE "Respuesta Simulada" ---
  }

  // --- Función para manejar el clic en "Evaluar Prompt" (sin cambios aquí) ---
  async function handleEvaluateClick() {
      const promptText = promptInput.value;

      // Validar que el prompt no esté vacío antes de enviar
      if (!promptText.trim()) {
          feedbackArea.innerHTML = '<p class="error">Por favor, escribe un prompt antes de evaluar.</p>';
          feedbackArea.style.display = 'block';
          feedbackArea.classList.add('error');
          return; // Detener si está vacío
      }


      // Limpiar feedback anterior y mostrar carga
      feedbackArea.innerHTML = '';
      feedbackArea.style.display = 'none';
      loadingIndicator.style.display = 'flex';
      evaluateButton.disabled = true;
      const existingRetryButton = document.getElementById('retry-button');
      if (existingRetryButton) {
          existingRetryButton.remove();
      }

      // Llamar a la función de evaluación (AHORA ES LA REAL)
      const result = await evaluatePrompt(promptText);

      // Ocultar carga
      loadingIndicator.style.display = 'none';

      // Mostrar resultado
      feedbackArea.style.display = 'block';
      if (result.success) {
          // Usamos <pre> para preservar mejor los saltos de línea y espacios del feedback de la IA
          feedbackArea.innerHTML = `<pre>${result.feedback}</pre>`;
          feedbackArea.classList.remove('error');
      } else {
          // Mostramos el mensaje de error que devolvió la función o el catch
          feedbackArea.innerHTML = `<p class="error">Error: ${result.message}</p>`;
          feedbackArea.classList.add('error');
      }

      // Crear y añadir el botón "Volver a Intentar"
      createRetryButton(); // No necesita cambios
  }

  // --- Función para crear y añadir el botón "Volver a Intentar" (sin cambios) ---
  function createRetryButton() {
      const existingRetryButton = document.getElementById('retry-button');
      if (existingRetryButton) {
          existingRetryButton.remove();
      }

      const retryButton = document.createElement('button');
      retryButton.id = 'retry-button';
      retryButton.type = 'button';
      retryButton.textContent = 'Volver a Intentar';
      retryButton.addEventListener('click', handleRetryClick);
      buttonArea.appendChild(retryButton);
  }


  // --- Función para manejar el clic en "Volver a Intentar" (sin cambios) ---
  function handleRetryClick() {
      feedbackArea.innerHTML = '';
      feedbackArea.style.display = 'none';
      feedbackArea.classList.remove('error');

      const retryButton = document.getElementById('retry-button');
      if (retryButton) {
          retryButton.remove();
      }

      evaluateButton.disabled = false;
      promptInput.focus();
  }

  // --- Añadir el Event Listener al botón inicial (sin cambios) ---
  if (evaluateButton) {
      evaluateButton.addEventListener('click', handleEvaluateClick);
  } else {
      console.error("¡Error! No se encontró el botón 'evaluate-button'");
  }
});