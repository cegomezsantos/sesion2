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
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            const successful = document.execCommand('copy');
            const msg = successful ? 'successful' : 'unsuccessful';
            console.log('Fallback: Copying text command was ' + msg);
             // Optional: Provide user feedback (e.g., change button text temporarily)
             const originalText = button.textContent; // Need to capture button context if using this fallback directly in event listener
             // For now, just log success
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
            responseElement.textContent = 'Por favor, introduce un prompt.';
            responseElement.classList.add('error');
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
                body: JSON.stringify({ prompt: promptText }),
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
                throw new Error('Invalid response format from backend');
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
            const exerciseNum = button.dataset.exercise;
            let promptInputId, responseElementId;

            if (exerciseNum === '4') {
                // Handle Exercise 4 versions V1 and V2
                const version = button.dataset.version;
                promptInputId = `promptInput${exerciseNum}_${version}`;
                responseElementId = `aiResponse${exerciseNum}_${version}`;
            } else {
                 // Handle Exercises 1, 2, 3
                promptInputId = `promptInput${exerciseNum}`;
                responseElementId = `aiResponse${exerciseNum}`;
            }

            const promptText = document.getElementById(promptInputId).value;

            evaluatePrompt(promptText, responseElementId, button);
        });
    });

});