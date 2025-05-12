document.addEventListener('DOMContentLoaded', () => {

    // Add functionality to "Copy Example" buttons
    document.querySelectorAll('.copy-btn').forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.dataset.target;
            // Use textContent for <pre> as it preserves whitespace
            const textToCopy = document.getElementById(targetId).textContent;

            // Use Clipboard API for modern browsers
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(textToCopy).then(() => {
                    console.log('Text copied to clipboard');
                    // Provide user feedback
                    const originalText = button.textContent;
                    button.textContent = '¡Copiado!';
                    setTimeout(() => {
                        button.textContent = originalText;
                    }, 2000);
                }).catch(err => {
                    console.error('Could not copy text: ', err);
                    // Fallback if Clipboard API fails or is not available
                    fallbackCopyTextToClipboard(textToCopy);
                });
            } else {
                 // Fallback for older browsers
                 fallbackCopyTextToClipboard(textToCopy);
            }
        });
    });

     function fallbackCopyTextToClipboard(text) {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        // Avoid scrolling to bottom
        textArea.style.top = "0";
        textArea.style.left = "0";
        textArea.style.position = "fixed";
        textArea.style.opacity = "0"; // Make it invisible
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            const successful = document.execCommand('copy');
            const msg = successful ? 'successful' : 'unsuccessful';
            console.log('Fallback: Copying text command was ' + msg);
            // Fallback feedback
            alert('Texto copiado al portapapeles (método fallback).');
        } catch (err) {
            console.error('Fallback: Oops, unable to copy', err);
            alert('Error al copiar. Por favor, selecciona el texto manualmente y cópialo.');
        }
        document.body.removeChild(textArea);
    }

    // --- Generic function to set loading/error states ---
    function setResponseState(responseElement, state, message = '') {
        responseElement.className = 'ai-response'; // Reset classes
        if (state === 'loading') {
            responseElement.classList.add('loading');
            responseElement.textContent = message || 'Cargando respuesta de la IA...';
        } else if (state === 'error') {
            responseElement.classList.add('error');
            responseElement.textContent = message || 'Error al obtener respuesta.';
        } else { // 'success' or 'initial'
             // No specific class for success, just remove loading/error
             // Message will be set by the specific handler
        }
    }


    // --- Handler for Exercise 1 (Process and Evaluate) ---
    async function handleExercise1(button) {
        const promptInput = document.getElementById('promptInput1_v2');
        const responseElement = document.getElementById('aiResponse1_v2');
        const promptText = promptInput.value.trim();

        if (!promptText) {
            setResponseState(responseElement, 'error', 'Por favor, introduce un prompt y el texto a procesar.');
            return;
        }

        setResponseState(responseElement, 'loading');
        button.disabled = true;

        try {
            const response = await fetch('/api/exercise1_process', { // <-- NEW backend route
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: promptText }), // Send the full textarea content
            });

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, body: ${errorBody}`);
            }

            const data = await response.json(); // Expecting { generatedText, evaluation: { score, feedback } }

            if (data && data.generatedText !== undefined && data.evaluation) {
                // Display both generated text and evaluation feedback
                let evaluationClass = '';
                if (data.evaluation.score >= 80) {
                    evaluationClass = 'evaluation-green';
                } else if (data.evaluation.score >= 50) {
                    evaluationClass = 'evaluation-yellow';
                } else {
                    evaluationClass = 'evaluation-red';
                }

                responseElement.innerHTML = `
                    <strong>Respuesta de la IA:</strong>
                    <div class="generated-text">${data.generatedText}</div>
                    <hr class="feedback-divider">
                    <strong>Evaluación del Prompt:</strong>
                    <div class="evaluation-feedback ${evaluationClass}">
                       <p>Score: ${data.evaluation.score}/100</p>
                       <p>${data.evaluation.feedback}</p>
                    </div>
                `; // Use innerHTML to include formatting
                setResponseState(responseElement, 'success'); // Clear loading/error classes

            } else {
                 setResponseState(responseElement, 'error', 'Error: Formato de respuesta inválido del servidor.');
                 console.error('Invalid JSON response from backend for exercise 1:', data);
            }

        } catch (error) {
            console.error('Error fetching AI response for exercise 1:', error);
            setResponseState(responseElement, 'error', `Error: ${error.message || 'Error desconocido'}`);
        } finally {
            button.disabled = false;
        }
    }

    // --- Handler for Exercises 2 & 3 (General Generation) ---
     async function handleGeneralGeneration(button, promptInputId, responseElementId) {
        const promptInput = document.getElementById(promptInputId);
        const responseElement = document.getElementById(responseElementId);
        const promptText = promptInput.value.trim();

        if (!promptText) {
            setResponseState(responseElement, 'error', 'Por favor, introduce un prompt.');
            return;
        }

        setResponseState(responseElement, 'loading');
        button.disabled = true;

        try {
            const response = await fetch('/api/generate', { // <-- NEW general generation route
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: promptText }), // Send the full textarea content as the prompt
            });

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, body: ${errorBody}`);
            }

            const data = await response.json(); // Expecting { text: "..." }

            if (data && data.text !== undefined) {
                responseElement.textContent = data.text; // Use textContent for plain text response
                setResponseState(responseElement, 'success');
            } else {
                 setResponseState(responseElement, 'error', 'Error: Formato de respuesta inválido del servidor.');
                 console.error('Invalid JSON response from backend (general generation):', data);
            }

        } catch (error) {
            console.error('Error fetching AI response (general generation):', error);
            setResponseState(responseElement, 'error', `Error: ${error.message || 'Error desconocido'}`);
        } finally {
            button.disabled = false;
        }
    }

    // --- Main event listener for all evaluate buttons ---
    document.querySelectorAll('.evaluate-btn').forEach(button => {
        button.addEventListener('click', () => {
            const exerciseNum = button.dataset.exercise;
            const version = button.dataset.version; // Exists for exercise 3

            switch (exerciseNum) {
                case '1':
                    handleExercise1(button);
                    break;
                case '2':
                     // For exercise 2, the input is in promptInput2_v2 and response in aiResponse2_v2
                    handleGeneralGeneration(button, 'promptInput2_v2', 'aiResponse2_v2');
                    break;
                case '3':
                    // For exercise 3, inputs and responses depend on version (v1 or v2)
                    if (version === 'v1') {
                        handleGeneralGeneration(button, 'promptInput3_v2_v1', 'aiResponse3_v2_v1');
                    } else if (version === 'v2') {
                         handleGeneralGeneration(button, 'promptInput3_v2_v2', 'aiResponse3_v2_v2');
                    }
                    break;
                default:
                    console.error('Unknown exercise number:', exerciseNum);
                    // Optionally display an error in a relevant div if possible
                    const defaultResponseDiv = button.nextElementSibling; // Assuming response div is next sibling
                    if (defaultResponseDiv && defaultResponseDiv.classList.contains('ai-response')) {
                         setResponseState(defaultResponseDiv, 'error', 'Error: Ejercicio no configurado.');
                    }
                    break;
            }
        });
    });

});