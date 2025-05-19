document.addEventListener('DOMContentLoaded', () => {

    // Add functionality to "Copy Example" buttons
    document.querySelectorAll('.copy-btn').forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.dataset.target;
            // Use textContent for divs as it gets plain text
            // Ensure the targetId element exists
            const textElement = document.getElementById(targetId);

            if (!textElement) {
                 console.error(`Target element with ID "${targetId}" not found for copy button.`);
                 // Optional: Provide user feedback that copy failed
                 const originalText = button.textContent;
                 button.textContent = '¡Error al copiar!';
                 setTimeout(() => {
                     button.textContent = originalText;
                 }, 2000);
                 return; // Stop if the target element isn't found
            }

            const textToCopy = textElement.textContent;


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
                    fallbackCopyTextToClipboard(textToCopy, button); // Pass the button for feedback
                });
            } else {
                 // Fallback for older browsers
                 fallbackCopyTextToClipboard(textToCopy, button); // Pass the button for feedback
            }
        });
    });

    // Pass button to fallback for feedback
     function fallbackCopyTextToClipboard(text, button) {
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
            const originalText = button.textContent; // Use the button passed
            button.textContent = successful ? '¡Copiado!' : '¡Error al copiar!';
            setTimeout(() => {
                button.textContent = originalText;
            }, 2000);
        } catch (err) {
            console.error('Fallback: Oops, unable to copy', err);
             const originalText = button.textContent; // Use the button passed
            button.textContent = '¡Error al copiar!';
             setTimeout(() => {
                button.textContent = originalText;
            }, 2000);
        }
        document.body.removeChild(textArea);
    }

    // --- MODIFIED: Generic function to set loading/error/success states ---
    // This function now manages classes that control display and styles via CSS
    function setResponseState(responseElement, state, message = '') {
        // Always start by removing previous states and clearing content
        responseElement.classList.remove('loading', 'error', 'success');
        responseElement.innerHTML = ''; // Clear previous content
        responseElement.style.display = 'none'; // Default to hidden

        if (state === 'loading') {
            responseElement.classList.add('loading');
            responseElement.innerHTML = message || 'Cargando respuesta de la IA...'; // Loading message is visible
            responseElement.style.display = 'block'; // Make the element block to be visible
        } else if (state === 'error') {
            responseElement.classList.add('error');
            responseElement.innerHTML = message || 'Error al obtener respuesta.'; // Error message is visible
            responseElement.style.display = 'block'; // Make the element block to be visible
        } else if (state === 'success') {
             responseElement.classList.add('success');
             // Content will be set by the specific handler after this call
             responseElement.style.display = 'block'; // Make the element block *before* content is inserted
             // CSS handles background, padding, animation via .ai-response.success
        }
        // If state is not handled (e.g., initial), it remains display: none
    }


    // --- MODIFIED: Handler for Exercise 1 (Process and Evaluate) ---
    async function handleExercise1(button) {
        const promptInput = document.getElementById('promptInput1_v2');
        const responseElement = document.getElementById('aiResponse1_v2');
        const promptText = promptInput.value.trim();

        if (!promptText) {
            // Use setResponseState for error message
            setResponseState(responseElement, 'error', 'Por favor, introduce el prompt (la instrucción seguida de ": Texto a procesar").');
            return;
        }

        // Set loading state using the modified function
        setResponseState(responseElement, 'loading', 'Cargando evaluación...');
        button.disabled = true;


        try {
            const response = await fetch('/api/exercise1_process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: promptText }),
            });

            if (!response.ok) {
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

                console.error('Backend error for exercise 1:', errorMsg);
                // Use setResponseState for backend errors
                setResponseState(responseElement, 'error', errorMsg);
                return;
            }

            const data = await response.json();

            if (data && data.evaluation && typeof data.evaluation.score === 'number' && typeof data.evaluation.feedback === 'string' && typeof data.explanation === 'string') {

                // Set state to success *before* setting content
                setResponseState(responseElement, 'success');

                // Determine feedback class
                let evaluationClass = '';
                if (data.evaluation.score >= 80) {
                    evaluationClass = 'evaluation-green';
                } else if (data.evaluation.score >= 50) {
                    evaluationClass = 'evaluation-yellow';
                } else {
                    evaluationClass = 'evaluation-red';
                }

                // Set the content after setting the state
                responseElement.innerHTML = `
                    <strong>Resultado de la Evaluación:</strong>
                    <p>${data.explanation}</p>
                    <div class="evaluation-feedback ${evaluationClass}">
                       <p>Score: ${data.evaluation.score}/100</p>
                       <p>Feedback: ${data.evaluation.feedback}</p>
                    </div>
                `;

                // The success state was already set above

            } else {
                 setResponseState(responseElement, 'error', 'Error: Formato de respuesta inesperado de la evaluación.');
                 console.error('Invalid JSON structure from backend for exercise 1:', data);
            }

        } catch (error) {
            console.error('Error procesando la respuesta de la AI para el ejercicio 1:', error);
            setResponseState(responseElement, 'error', `Error: ${error.message || 'Error desconocido durante la comunicación con el servidor'}`);
        } finally {
            button.disabled = false;
        }
    }
    // --- END MODIFIED: Handler for Exercise 1 ---


    // --- MODIFIED: Handler for Exercises 2 & 3 (General Generation) ---
     async function handleGeneralGeneration(button, promptInputId, responseElementId) {
        const promptInput = document.getElementById(promptInputId);
        const responseElement = document.getElementById(responseElementId);
        const promptText = promptInput.value.trim();

        if (!promptText) {
            setResponseState(responseElement, 'error', 'Por favor, introduce un prompt.');
            return;
        }

        // Set loading state using the modified function
        setResponseState(responseElement, 'loading');
        button.disabled = true;

        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: promptText }),
            });

            if (!response.ok) {
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
                 return;
            }

            const data = await response.json();

            if (data && data.text !== undefined) {
                // Set state to success *before* setting content
                setResponseState(responseElement, 'success');
                // Set the content after setting the state
                responseElement.textContent = data.text; // Use textContent for plain text response

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
    // --- END MODIFIED: Handler for Exercises 2 & 3 ---


    // --- Main event listener for all evaluate buttons ---
    document.querySelectorAll('.evaluate-btn').forEach(button => {
        button.addEventListener('click', () => {
            const exerciseNum = button.dataset.exercise;
            const version = button.dataset.version; // Exists for exercise 3

            // Get the response element for the specific button clicked
             // Assuming the response div is always the next sibling with class 'ai-response'
            const responseElement = button.nextElementSibling;
             if (!responseElement || !responseElement.classList.contains('ai-response')) {
                 console.error('Could not find AI response element for this button.');
                 // Maybe set an error state somewhere visible?
                 return;
             }


            switch (exerciseNum) {
                case '1':
                    handleExercise1(button);
                    break;
                case '2':
                    handleGeneralGeneration(button, 'promptInput2_v2', 'aiResponse2_v2');
                    break;
                case '3':
                    if (version === 'v1') {
                        handleGeneralGeneration(button, 'promptInput3_v2_v1', 'aiResponse3_v2_v1');
                    } else if (version === 'v2') {
                         handleGeneralGeneration(button, 'promptInput3_v2_v2', 'aiResponse3_v2_v2');
                    }
                    break;
                default:
                    console.error('Unknown exercise number:', exerciseNum);
                    setResponseState(responseElement, 'error', 'Error: Ejercicio no configurado.');
                    break;
            }
        });
    });

    // Optional: Initialize all ai-response divs to be hidden on page load
    // This is redundant if CSS starts them as display: none, but ensures consistency
     document.querySelectorAll('.ai-response').forEach(div => {
         setResponseState(div, 'initial'); // Use a state that results in display: none
     });


});