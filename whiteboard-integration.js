/**
 * Microsoft Forms Whiteboard Integration
 * 
 * This script enables whiteboard functionality within Microsoft Forms.
 * To use:
 * 1. Create a Microsoft Form with questions
 * 2. Add a text question where you want the whiteboard to appear
 * 3. Use Microsoft Forms' embedding options to add this script
 * 4. The script will convert text fields into whiteboards
 */

(function() {
    // Configuration
    const config = {
        canvasHeight: 300,
        defaultPenSize: 3,
        defaultColor: '#000000',
        historyLimit: 20,
        colors: [
            { name: 'Black', value: '#000000' },
            { name: 'Blue', value: '#1976D2' },
            { name: 'Green', value: '#388E3C' },
            { name: 'Red', value: '#D32F2F' }
        ]
    };

    // Wait for the DOM to be fully loaded
    document.addEventListener('DOMContentLoaded', initializeWhiteboards);
    
    // Initialize whiteboards after Microsoft Forms has loaded
    function initializeWhiteboards() {
        // We need to wait for Microsoft Forms to fully render
        // This may require adjustment based on your specific form
        setTimeout(() => {
            // Find all text input fields in Microsoft Forms
            const textFields = document.querySelectorAll('.office-form-question-textbox');
            
            // Convert each text field into a whiteboard
            textFields.forEach((textField, index) => {
                convertToWhiteboard(textField, index);
            });
            
            // Add form submission handling
            handleFormSubmission();
        }, 1000);
    }
    
    // Convert a text field to a whiteboard
    function convertToWhiteboard(textField, index) {
        // Get the parent container
        const questionContainer = textField.closest('.office-form-question');
        
        // Hide the original text input
        textField.style.display = 'none';
        
        // Create the whiteboard container
        const whiteboardContainer = document.createElement('div');
        whiteboardContainer.className = 'whiteboard-container';
        whiteboardContainer.style.cssText = `
            position: relative;
            background-color: #fff;
            border: 1px solid #ddd;
            border-radius: 5px;
            margin: 10px 0;
        `;
        
        // Create the canvas
        const canvas = document.createElement('canvas');
        canvas.id = `whiteboard-canvas-${index}`;
        canvas.width = questionContainer.offsetWidth - 40; // Adjust for padding
        canvas.height = config.canvasHeight;
        canvas.style.cssText = `
            width: 100%;
            height: ${config.canvasHeight}px;
            background-color: white;
            border-radius: 5px 5px 0 0;
            cursor: crosshair;
            touch-action: none;
        `;
        
        // Create the toolbar
        const toolbar = createToolbar(index);
        
        // Add elements to the DOM
        whiteboardContainer.appendChild(canvas);
        whiteboardContainer.appendChild(toolbar);
        questionContainer.appendChild(whiteboardContainer);
        
        // Initialize the canvas for drawing
        initCanvas(canvas, textField);
    }
    
    // Create toolbar with drawing controls
    function createToolbar(index) {
        const toolbar = document.createElement('div');
        toolbar.className = 'whiteboard-toolbar';
        toolbar.style.cssText = `
            display: flex;
            justify-content: space-between;
            padding: 10px;
            background-color: #f5f5f5;
            border-radius: 0 0 5px 5px;
            flex-wrap: wrap;
        `;
        
        // Color picker
        const colorPicker = document.createElement('div');
        colorPicker.className = 'color-picker';
        colorPicker.style.cssText = `
            display: flex;
            gap: 5px;
            margin-right: 10px;
        `;
        
        config.colors.forEach(color => {
            const colorOption = document.createElement('div');
            colorOption.className = color.value === config.defaultColor ? 'color-option selected' : 'color-option';
            colorOption.setAttribute('data-color', color.value);
            colorOption.setAttribute('data-canvas', `whiteboard-canvas-${index}`);
            colorOption.style.cssText = `
                width: 20px;
                height: 20px;
                border-radius: 50%;
                cursor: pointer;
                background-color: ${color.value};
                border: 2px solid ${color.value === config.defaultColor ? '#333' : 'transparent'};
            `;
            colorPicker.appendChild(colorOption);
        });
        
        // Pen size slider
        const sizePicker = document.createElement('div');
        sizePicker.className = 'size-picker';
        sizePicker.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            margin-right: 10px;
        `;
        
        const sizeLabel = document.createElement('label');
        sizeLabel.textContent = 'Size:';
        sizeLabel.setAttribute('for', `pen-size-${index}`);
        
        const sizeSlider = document.createElement('input');
        sizeSlider.type = 'range';
        sizeSlider.id = `pen-size-${index}`;
        sizeSlider.className = 'pen-size';
        sizeSlider.min = '1';
        sizeSlider.max = '20';
        sizeSlider.value = config.defaultPenSize;
        sizeSlider.setAttribute('data-canvas', `whiteboard-canvas-${index}`);
        sizeSlider.style.width = '70px';
        
        sizePicker.appendChild(sizeLabel);
        sizePicker.appendChild(sizeSlider);
        
        // Buttons
        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'button-group';
        buttonGroup.style.cssText = `
            display: flex;
            gap: 8px;
        `;
        
        const clearButton = document.createElement('button');
        clearButton.type = 'button';
        clearButton.className = 'clear-btn';
        clearButton.textContent = 'Clear';
        clearButton.setAttribute('data-canvas', `whiteboard-canvas-${index}`);
        clearButton.style.cssText = `
            padding: 5px 10px;
            background-color: #ffebee;
            color: #c62828;
            border: 1px solid #ddd;
            border-radius: 4px;
            cursor: pointer;
        `;
        
        const undoButton = document.createElement('button');
        undoButton.type = 'button';
        undoButton.className = 'undo-btn';
        undoButton.textContent = 'Undo';
        undoButton.setAttribute('data-canvas', `whiteboard-canvas-${index}`);
        undoButton.style.cssText = `
            padding: 5px 10px;
            background-color: #f0f0f0;
            border: 1px solid #ddd;
            border-radius: 4px;
            cursor: pointer;
        `;
        
        buttonGroup.appendChild(clearButton);
        buttonGroup.appendChild(undoButton);
        
        // Add all elements to toolbar
        toolbar.appendChild(colorPicker);
        toolbar.appendChild(sizePicker);
        toolbar.appendChild(buttonGroup);
        
        return toolbar;
    }
    
    // Canvas state storage
    const canvasStates = {};
    
    // Initialize a canvas for drawing
    function initCanvas(canvas, textField) {
        const ctx = canvas.getContext('2d');
        const canvasId = canvas.id;
        
        // Initialize state for this canvas
        canvasStates[canvasId] = {
            isDrawing: false,
            lastX: 0,
            lastY: 0,
            currentColor: config.defaultColor,
            lineWidth: config.defaultPenSize,
            history: [],
            historyIndex: -1,
            textField: textField
        };
        
        // Clear canvas
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Save initial state
        saveCanvasState(canvasId);
        
        // Setup event listeners for drawing
        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('mouseout', stopDrawing);
        
        // Touch support
        canvas.addEventListener('touchstart', handleTouchStart);
        canvas.addEventListener('touchmove', handleTouchMove);
        canvas.addEventListener('touchend', handleTouchEnd);
        
        // Setup event listeners for toolbar
        setupToolbarListeners();
        
        function startDrawing(e) {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            
            canvasStates[canvasId].isDrawing = true;
            canvasStates[canvasId].lastX = (e.clientX - rect.left) * scaleX;
            canvasStates[canvasId].lastY = (e.clientY - rect.top) * scaleY;
        }
        
        function draw(e) {
            if (!canvasStates[canvasId].isDrawing) return;
            
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const currentX = (e.clientX - rect.left) * scaleX;
            const currentY = (e.clientY - rect.top) * scaleY;
            
            ctx.beginPath();
            ctx.moveTo(canvasStates[canvasId].lastX, canvasStates[canvasId].lastY);
            ctx.lineTo(currentX, currentY);
            ctx.strokeStyle = canvasStates[canvasId].currentColor;
            ctx.lineWidth = canvasStates[canvasId].lineWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();
            
            canvasStates[canvasId].lastX = currentX;
            canvasStates[canvasId].lastY = currentY;
        }
        
        function stopDrawing() {
            if (canvasStates[canvasId].isDrawing) {
                canvasStates[canvasId].isDrawing = false;
                saveCanvasState(canvasId);
                updateTextField(canvasId);
            }
        }
        
        function handleTouchStart(e) {
            e.preventDefault();
            if (e.touches.length > 0) {
                const touch = e.touches[0];
                const mouseEvent = new MouseEvent('mousedown', {
                    clientX: touch.clientX,
                    clientY: touch.clientY
                });
                canvas.dispatchEvent(mouseEvent);
            }
        }
        
        function handleTouchMove(e) {
            e.preventDefault();
            if (e.touches.length > 0) {
                const touch = e.touches[0];
                const mouseEvent = new MouseEvent('mousemove', {
                    clientX: touch.clientX,
                    clientY: touch.clientY
                });
                canvas.dispatchEvent(mouseEvent);
            }
        }
        
        function handleTouchEnd(e) {
            e.preventDefault();
            const mouseEvent = new MouseEvent('mouseup', {});
            canvas.dispatchEvent(mouseEvent);
        }
    }
    
    // Setup toolbar event listeners
    function setupToolbarListeners() {
        // Color picker listeners
        document.querySelectorAll('.color-option').forEach(colorOption => {
            colorOption.addEventListener('click', function() {
                const canvasId = this.getAttribute('data-canvas');
                
                // Remove selected class from all color options in this toolbar
                document.querySelectorAll(`.color-option[data-canvas="${canvasId}"]`).forEach(option => {
                    option.style.border = '2px solid transparent';
                });
                
                // Add selected class to clicked color option
                this.style.border = '2px solid #333';
                
                // Update current color for this canvas
                canvasStates[canvasId].currentColor = this.getAttribute('data-color');
            });
        });
        
        // Size slider listeners
        document.querySelectorAll('.pen-size').forEach(sizeSlider => {
            sizeSlider.addEventListener('input', function() {
                const canvasId = this.getAttribute('data-canvas');
                canvasStates[canvasId].lineWidth = parseInt(this.value);
            });
        });
        
        // Clear button listeners
        document.querySelectorAll('.clear-btn').forEach(clearBtn => {
            clearBtn.addEventListener('click', function() {
                const canvasId = this.getAttribute('data-canvas');
                const canvas = document.getElementById(canvasId);
                const ctx = canvas.getContext('2d');
                
                // Clear canvas
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // Reset drawing history
                canvasStates[canvasId].history = [];
                canvasStates[canvasId].historyIndex = -1;
                
                // Save blank state
                saveCanvasState(canvasId);
                updateTextField(canvasId);
            });
        });
        
        // Undo button listeners
        document.querySelectorAll('.undo-btn').forEach(undoBtn => {
            undoBtn.addEventListener('click', function() {
                const canvasId = this.getAttribute('data-canvas');
                undoLastAction(canvasId);
                updateTextField(canvasId);
            });
        });
    }
    
    // Save canvas state for undo functionality
    function saveCanvasState(canvasId) {
        const canvas = document.getElementById(canvasId);
        const state = canvasStates[canvasId];
        
        // If we did some undos and then drew something new,
        // we need to remove the "redos" since we can't redo after a new drawing
        if (state.historyIndex >= 0 && state.historyIndex < state.history.length - 1) {
            state.history = state.history.slice(0, state.historyIndex + 1);
        }
        
        // Save current state
        state.historyIndex++;
        state.history[state.historyIndex] = canvas.toDataURL();
        
        // Limit history size to avoid memory issues
        if (state.history.length > config.historyLimit) {
            state.history.shift();
            state.historyIndex--;
        }
    }
    
    // Undo last drawing action
    function undoLastAction(canvasId) {
        const state = canvasStates[canvasId];
        const canvas = document.getElementById(canvasId);
        const ctx = canvas.getContext('2d');
        
        if (state.historyIndex > 0) {
            state.historyIndex--;
            
            const img = new Image();
            img.onload = function() {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            };
            img.src = state.history[state.historyIndex];
        } else if (state.historyIndex === 0) {
            // Clear to initial state (blank canvas)
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            state.historyIndex--;
        }
    }
    
    // Update the hidden text field with canvas data
    function updateTextField(canvasId) {
        const state = canvasStates[canvasId];
        const canvas = document.getElementById(canvasId);
        
        // Store the canvas image data in the text field
        if (state.textField) {
            state.textField.value = canvas.toDataURL();
        }
    }
    
    // Handle form submission
    function handleFormSubmission() {
        // Find the Microsoft Forms submit button
        const submitButton = document.querySelector('.office-form-bottom-button');
        
        if (submitButton) {
            // Add an event listener to the original submit button
            submitButton.addEventListener('click', function(e) {
                // Make sure all canvas data is saved to text fields
                Object.keys(canvasStates).forEach(canvasId => {
                    updateTextField(canvasId);
                });
                
                // The form will submit naturally after all text fields are updated
            });
        }
    }
})();
