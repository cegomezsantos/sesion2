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


    // --- MODIFICACIÓN: Handler for Exercise 1 (Process and Evaluate) ---
    // Ahora espera { evaluation: { score, feedback }, explanation }
    async function handleExercise1(button) {
        const promptInput = document.getElementById('promptInput1_v2');
        const responseElement = document.getElementById('aiResponse1_v2'); // Asumo que este es el div donde muestras la respuesta
        const promptText = promptInput.value.trim();

        // Limpiar contenido previo y establecer estado de carga
        setResponseState(responseElement, 'loading');
        button.disabled = true;
        responseElement.innerHTML = 'Cargando evaluación...'; // Mensaje inicial más específico

        if (!promptText) {
            setResponseState(responseElement, 'error', 'Por favor, introduce el prompt (la instrucción seguida de ": Texto a procesar").');
            button.disabled = false; // Re-habilitar botón
            return;
        }


        try {
            const response = await fetch('/api/exercise1_process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: promptText }), // Enviar el contenido completo del textarea
            });

            // Si la respuesta HTTP no es OK (ej. 400, 500, 502, 504)
            if (!response.ok) {
                let errorMsg = `Error HTTP! Estado: ${response.status}`;
                // Intentar leer el cuerpo del error si es JSON
                try {
                    const errorBody = await response.json();
                     if (errorBody && errorBody.error) {
                         errorMsg = `Error: ${errorBody.error}`; // Usar el mensaje de error del backend si está disponible
                     } else {
                         const textBody = await response.text(); // Si no es JSON, leer como texto
                         errorMsg = `Error HTTP! Estado: ${response.status}, Respuesta: ${textBody.substring(0, 100)}...`;
                     }
                } catch (e) {
                    // Fallback si no se puede leer el cuerpo de la respuesta como JSON ni texto fácilmente
                    console.error("Could not parse error body:", e);
                    errorMsg = `Error HTTP! Estado: ${response.status}. No se pudo obtener el detalle del error.`;
                }

                console.error('Backend error for exercise 1:', errorMsg);
                setResponseState(responseElement, 'error', errorMsg);
                return; // Salir después de manejar el error HTTP
            }

            // La respuesta HTTP es OK, intentamos parsear el JSON
            const data = await response.json(); // Ahora esperamos { evaluation: { score, feedback }, explanation }

            // **--- CAMBIOS PRINCIPALES AQUÍ ---**
            // Validar la nueva estructura esperada
            if (data && data.evaluation && typeof data.evaluation.score === 'number' && typeof data.evaluation.feedback === 'string' && typeof data.explanation === 'string') {

                // Determinar la clase CSS para el feedback basada en el score
                let evaluationClass = '';
                if (data.evaluation.score >= 80) {
                    evaluationClass = 'evaluation-green'; // Clase para score alto
                } else if (data.evaluation.score >= 50) {
                    evaluationClass = 'evaluation-yellow'; // Clase para score medio
                } else {
                    evaluationClass = 'evaluation-red'; // Clase para score bajo
                }

                // Mostrar la evaluación y la explicación
                responseElement.innerHTML = `
                    <strong>Resultado de la Evaluación:</strong>
                    <p>${data.explanation}</p>
                    <div class="evaluation-feedback ${evaluationClass}">
                       <p>Score: ${data.evaluation.score}/100</p>
                       <p>Feedback: ${data.evaluation.feedback}</p>
                    </div>
                `; // Usar innerHTML para incluir la estructura HTML

                // Limpiar estado de carga/error
                setResponseState(responseElement, 'success');

            } else {
                 // Si la respuesta JSON no tiene la estructura esperada
                 setResponseState(responseElement, 'error', 'Error: Formato de respuesta inesperado de la evaluación.');
                 console.error('Invalid JSON structure from backend for exercise 1:', data);
            }

        } catch (error) {
            // Capturar errores de fetch o parseo (si response.ok era true pero json() falló)
            console.error('Error procesando la respuesta de la AI para el ejercicio 1:', error);
            setResponseState(responseElement, 'error', `Error: ${error.message || 'Error desconocido durante la comunicación con el servidor'}`);
        } finally {
            // Asegurarse de re-habilitar el botón al final
            button.disabled = false;
        }
    }
    // --- FIN MODIFICACIÓN: Handler for Exercise 1 ---


    // --- Handler for Exercises 2 & 3 (General Generation) ---
    // Mantida igual que en la versión original
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
                // Mejorar manejo de errores HTTP para general generation
                 let errorMsg = `Error HTTP! Estado: ${response.status}`;
                 try {
                     const errorBody = await response.json();
                     if (errorBody && errorBody.error) {
                         errorMsg = `Error: ${errorBody.error}`;
                     } else {
                         const textBody = await response.text();
                         errorMsg = `Error HTTP! Estado: ${response.status}, Respuesta: ${textBody.substring(0, 100)}...`;
                     }
                 } catch (e) {
                     console.error("Could not parse error body:", e);
                     errorMsg = `Error HTTP! Estado: ${response.status}. No se pudo obtener el detalle del error.`;
                 }
                 console.error('Backend error (general generation):', errorMsg);
                 setResponseState(responseElement, 'error', errorMsg);
                 return; // Exit after handling HTTP error
            }

            // La respuesta HTTP es OK, intentamos parsear el JSON
            const data = await response.json(); // Expecting { text: "..." }

            if (data && data.text !== undefined) {
                responseElement.textContent = data.text; // Use textContent for plain text response
                setResponseState(responseElement, 'success');
            } else {
                 // Si la respuesta JSON no tiene la estructura esperada
                 setResponseState(responseElement, 'error', 'Error: Formato de respuesta inválido del servidor.');
                 console.error('Invalid JSON response from backend (general generation):', data);
            }

        } catch (error) {
            // Capturar errores de fetch o parseo
            console.error('Error fetching AI response (general generation):', error);
            setResponseState(responseElement, 'error', `Error: ${error.message || 'Error desconocido'}`);
        } finally {
            button.disabled = false;
        }
    }


    // --- Main event listener for all evaluate buttons ---
    // Mantido igual que en la versión original
    document.querySelectorAll('.evaluate-btn').forEach(button => {
        button.addEventListener('click', () => {
            const exerciseNum = button.dataset.exercise;
            const version = button.dataset.version; // Exists for exercise 3

            switch (exerciseNum) {
                case '1':
                    handleExercise1(button); // Llama a la función modificada para el ejercicio 1
                    break;
                case '2':
                     // Para el ejercicio 2, el input está en promptInput2_v2 y la respuesta en aiResponse2_v2
                    handleGeneralGeneration(button, 'promptInput2_v2', 'aiResponse2_v2');
                    break;
                case '3':
                    // Para el ejercicio 3, los inputs y respuestas dependen de la versión (v1 o v2)
                    if (version === 'v1') {
                        handleGeneralGeneration(button, 'promptInput3_v2_v1', 'aiResponse3_v2_v1');
                    } else if (version === 'v2') {
                         handleGeneralGeneration(button, 'promptInput3_v2_v2', 'aiResponse3_v2_v2');
                    }
                    break;
                default:
                    console.error('Unknown exercise number:', exerciseNum);
                    // Opcionalmente mostrar un error en un div relevante si es posible
                    const defaultResponseDiv = button.nextElementSibling; // Asumiendo que el div de respuesta es el hermano siguiente
                    if (defaultResponseDiv && defaultResponseDiv.classList.contains('ai-response')) {
                         setResponseState(defaultResponseDiv, 'error', 'Error: Ejercicio no configurado.');
                    }
                    break;
            }
        });
    });

});