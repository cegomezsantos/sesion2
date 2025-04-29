// script.js (CORRECTO - PARA LA RAÍZ DEL PROYECTO)

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
        console.log("URL de función:", functionUrl); // Log para verificar la URL

        try {
            // --- ¡LLAMADA REAL A LA FUNCIÓN NETLIFY! ---
            const response = await fetch(functionUrl); // Usamos GET

            // Primero, verifica si la respuesta HTTP fue exitosa (ej: 200 OK)
            if (!response.ok) {
                let errorMsg = `Error HTTP ${response.status}: ${response.statusText}`;
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.message || JSON.stringify(errorData);
                } catch (e) {
                    errorMsg = await response.text();
                }
                 throw new Error(`La función de evaluación falló: ${errorMsg}`);
            }

            // Si la respuesta HTTP es OK (2xx), parsea el JSON que envía la función
            const result = await response.json();
            console.log("Respuesta JSON recibida del backend:", result); // Log para ver qué llegó

            // La función devuelve { success: true/false, feedback/message: ... }
            return result;

        } catch (error) {
            console.error("Error al llamar o procesar la función de evaluación:", error);
            return { success: false, message: `Error en la comunicación: ${error.message}` };
        }
    }

    // --- Función para manejar el clic en "Evaluar Prompt" ---
    async function handleEvaluateClick() {
        const promptText = promptInput.value;

        if (!promptText.trim()) {
            feedbackArea.innerHTML = '<p class="error">Por favor, escribe un prompt antes de evaluar.</p>';
            feedbackArea.style.display = 'block';
            feedbackArea.classList.add('error');
            return;
        }

        feedbackArea.innerHTML = '';
        feedbackArea.style.display = 'none';
        loadingIndicator.style.display = 'flex';
        evaluateButton.disabled = true;
        const existingRetryButton = document.getElementById('retry-button');
        if (existingRetryButton) {
            existingRetryButton.remove();
        }

        // Llamar a la función de evaluación (REAL)
        const result = await evaluatePrompt(promptText);

        loadingIndicator.style.display = 'none';
        feedbackArea.style.display = 'block';

        if (result.success && typeof result.feedback === 'string') {
            // Usamos <pre> para preservar formato del feedback
            feedbackArea.innerHTML = `<pre>${result.feedback.trim()}</pre>`;
            feedbackArea.classList.remove('error');
        } else {
            const errorMessage = result.message || "Error desconocido al obtener feedback.";
            feedbackArea.innerHTML = `<p class="error">Error: ${errorMessage}</p>`;
            feedbackArea.classList.add('error');
        }

        createRetryButton();
    }

    // --- Función para crear y añadir el botón "Volver a Intentar" ---
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

    // --- Función para manejar el clic en "Volver a Intentar" ---
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

    // --- Añadir el Event Listener al botón inicial ---
    if (evaluateButton) {
        evaluateButton.addEventListener('click', handleEvaluateClick);
    } else {
        console.error("¡Error! No se encontró el botón 'evaluate-button'");
    }
});