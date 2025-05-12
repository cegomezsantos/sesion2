document.addEventListener('DOMContentLoaded', () => {

    // Add functionality to "Copy Example" buttons
    document.querySelectorAll('.copy-btn').forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.dataset.target;
            const textToCopy = document.getElementById(targetId).textContent;

            // Use Clipboard API for modern browsers
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(textToCopy).then(() => {
                    console.log('Text copied to clipboard');
                    // Optional: Provide user feedback (e.g., change button text temporarily)
                    const originalText = button.textContent;
                    button.textContent = '¡Copiado!';
                    setTimeout(() => {
                        button.textContent = originalText;
                    }, 2000);
                }).catch(err => {
                    console.error('Could not copy text: ', err);
                    // Fallback if Clipboard API fails or is not available
                    fallbackCopyTextToClipboard(textToCopy); // Pass text to fallback
                });
            } else {
                 // Fallback for older browsers
                 fallbackCopyTextToClipboard(textToCopy); // Pass text to fallback
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
             // Since this is a fallback, we might not have direct access to the original button
             // Could add a simple alert or log for feedback if needed.
             console.log('¡Copiado!');
        } catch (err) {
            console.error('Fallback: Oops, unable to copy', err);
             alert('Error al copiar. Por favor, selecciona el texto manualmente y cópialo.');
        }
        document.body.removeChild(textArea);
    }


    // Function to handle prompt evaluation
    async function evaluatePrompt(promptText, responseElementId, buttonElement) {
        const responseElement = document.getElementById(responseElementId);

        if (!promptText.trim()) {
            responseElement.textContent = 'Por favor, introduce un prompt y el texto a procesar.';
            responseElement.className = 'ai-response error'; // Set error class
            responseElement.classList.remove('loading');
            return;
        }

        // Clear previous response and show loading state
        responseElement.textContent = 'Cargando respuesta de la IA...';
        responseElement.className = 'ai-response loading'; // Reset classes, add loading
        if (buttonElement) buttonElement.disabled = true; // Disable button while loading

        try {
            // --- IMPORTANT ---
            // This is where you would send the prompt to your Node.js backend.
            // The URL '/api/consulta' is a placeholder.
            // Your backend (consulta.js) needs to:
            // 1. Listen for POST requests at this URL.
            // 2. Read the JSON body to get the prompt text.
            // 3. Send the prompt to your AI model (e.g., OpenAI API, a local model, etc.).
            // 4. Get the AI response.
            // 5. Send the AI response back to the frontend, preferably as JSON: { text: "AI response here" }.
            // --- -------------
            const response = await fetch('/api/consulta', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt: promptText }), // Send the full text area content as the prompt
            });

            if (!response.ok) {
                // Handle HTTP errors
                const errorText = await response.text(); // Or response.json() if your backend sends JSON errors
                throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
            }

            const data = await response.json(); // Assuming your backend sends back JSON like { text: "..." }

            // Display the AI response
            if (data && data.text) {
                responseElement.textContent = data.text;
                responseElement.className = 'ai-response'; // Remove loading/error classes
            } else {
                 // If response is OK but doesn't have the expected format
                 responseElement.textContent = 'Error: Formato de respuesta inválido del servidor.';
                 responseElement.className = 'ai-response error';
                 console.error('Invalid JSON response from backend:', data);
            }

        } catch (error) {
            console.error('Error fetching AI response:', error);
            responseElement.textContent = `Error: No se pudo obtener respuesta de la IA. (${error.message || 'Error desconocido'})`;
            responseElement.className = 'ai-response error'; // Set error class
        } finally {
            if (buttonElement) buttonElement.disabled = false; // Re-enable button
        }
    }

    // Add event listeners to evaluation buttons
    document.querySelectorAll('.evaluate-btn').forEach(button => {
        button.addEventListener('click', () => {
            const exerciseNum = button.dataset.exercise; // Gets 1, 2, or 3 from the new numbering
            const version = button.dataset.version; // Only exists for exercise 3 (formerly 4)

            let promptInputId, responseElementId;

            // Construct IDs based on new exercise numbers and potentially version
            if (exerciseNum === '3' && version) { // Exercise 3 (formerly 4) has versions
                promptInputId = `promptInput${exerciseNum}_v2_${version}`;
                responseElementId = `aiResponse${exerciseNum}_v2_${version}`;
            } else { // Exercises 1 and 2 (formerly 2 and 3)
                promptInputId = `promptInput${exerciseNum}_v2`;
                responseElementId = `aiResponse${exerciseNum}_v2`;
            }


            const promptText = document.getElementById(promptInputId).value;

            evaluatePrompt(promptText, responseElementId, button);
        });
    });

});