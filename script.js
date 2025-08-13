class QuizApp {
    constructor() {
        this.sections = []; // Changed from questions to sections
        this.canvases = [];
        this.currentColor = '#000000';
        this.isErasing = false;
        this.isDrawing = false;
        this.lastX = 0;
        this.lastY = 0;
        this.studentName = '';
        this.fileName = '';
        this.currentSectionIndex = 0; // Track current section
        this.init();
    }

    init() {
        document.getElementById('fileInput').addEventListener('change', this.handleFileUpload.bind(this));
        document.getElementById('generatePdf').addEventListener('click', this.generatePDF.bind(this));
        this.initializeRepoFileSelector();
        this.initializeCarousel();
    }

    initializeCarousel() {
        // Create carousel navigation buttons
        const container = document.getElementById('questionsContainer');
        if (!container) return;

        // Create carousel wrapper and navigation
        const carouselWrapper = document.createElement('div');
        carouselWrapper.className = 'carousel-wrapper';
        carouselWrapper.innerHTML = `
            <div class="carousel-header" id="carouselHeader" style="display: none;">
                <button id="prevSection" class="carousel-btn" disabled>← Previous Section</button>
                <div class="section-indicator">
                    <span id="currentSection">1</span> of <span id="totalSections">1</span>
                </div>
                <button id="nextSection" class="carousel-btn" disabled>Next Section →</button>
            </div>
            <div id="sectionsCarousel" class="sections-carousel"></div>
        `;
        
        container.parentNode.insertBefore(carouselWrapper, container);
        container.style.display = 'none'; // Hide original container

        // Add event listeners for navigation
        document.getElementById('prevSection').addEventListener('click', () => this.navigateSection(-1));
        document.getElementById('nextSection').addEventListener('click', () => this.navigateSection(1));
    }

    navigateSection(direction) {
        const newIndex = this.currentSectionIndex + direction;
        if (newIndex >= 0 && newIndex < this.sections.length) {
            this.currentSectionIndex = newIndex;
            this.renderCurrentSection();
            this.updateCarouselNavigation();
        }
    }

    updateCarouselNavigation() {
        const carouselHeader = document.getElementById('carouselHeader');
        const prevBtn = document.getElementById('prevSection');
        const nextBtn = document.getElementById('nextSection');
        const currentSpan = document.getElementById('currentSection');
        const totalSpan = document.getElementById('totalSections');

        // Show/hide carousel header based on number of sections
        if (this.sections.length > 1) {
            carouselHeader.style.display = 'flex';
            if (prevBtn && nextBtn && currentSpan && totalSpan) {
                prevBtn.disabled = this.currentSectionIndex === 0;
                nextBtn.disabled = this.currentSectionIndex === this.sections.length - 1;
                currentSpan.textContent = this.currentSectionIndex + 1;
                totalSpan.textContent = this.sections.length;
            }
        } else {
            carouselHeader.style.display = 'none';
        }
    }

    initializeRepoFileSelector() {
        const select = document.getElementById('repoFileSelect');
        const label = document.getElementById('repoFileLabel');
        
        if (!select || !label) {
            console.warn('Repository file selector elements not found');
            return;
        }
        
        // Create custom dropdown container
        const dropdownContainer = document.createElement('div');
        dropdownContainer.className = 'custom-dropdown';
        dropdownContainer.style.cssText = `
            position: relative;
            display: inline-block;
            width: 100%;
        `;
        
        // Create dropdown list
        const dropdownList = document.createElement('div');
        dropdownList.className = 'dropdown-list';
        dropdownList.style.cssText = `
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            max-height: 200px;
            overflow-y: auto;
            z-index: 1000;
            display: none;
        `;
        
        // Insert dropdown after the label
        label.parentNode.insertBefore(dropdownContainer, label.nextSibling);
        dropdownContainer.appendChild(dropdownList);
        
        // Handle label click to toggle dropdown
        label.addEventListener('click', async (e) => {
            e.preventDefault();
            
            if (dropdownList.style.display === 'block') {
                dropdownList.style.display = 'none';
                return;
            }
            
            // Show loading state
            label.textContent = '📚 Loading files...';
            dropdownList.innerHTML = '<div style="padding: 10px; color: #6c757d;">Loading...</div>';
            dropdownList.style.display = 'block';
            
            // Load files from repository
            const files = await this.getLatexFilesFromRepo();
            
            // Clear dropdown and populate with files
            dropdownList.innerHTML = '';
            
            if (files.length === 0) {
                dropdownList.innerHTML = '<div style="padding: 10px; color: #6c757d;">No .tex files found</div>';
                label.textContent = '📚 Choose Repository LaTeX File';
                return;
            }
            
            files.forEach(file => {
                const option = document.createElement('div');
                option.style.cssText = `
                    padding: 10px 15px;
                    cursor: pointer;
                    border-bottom: 1px solid #eee;
                    transition: background-color 0.2s;
                `;
                option.textContent = file.name;
                
                option.addEventListener('mouseenter', () => {
                    option.style.backgroundColor = '#f8f9fa';
                });
                
                option.addEventListener('mouseleave', () => {
                    option.style.backgroundColor = 'white';
                });
                
                option.addEventListener('click', () => {
                    label.textContent = `📚 ${file.name}`;
                    dropdownList.style.display = 'none';
                    this.loadLatexFileFromGitHub(file);
                });
                
                dropdownList.appendChild(option);
            });
            
            // Remove last border
            const lastOption = dropdownList.lastElementChild;
            if (lastOption) {
                lastOption.style.borderBottom = 'none';
            }
            
            label.textContent = '📚 Choose Repository LaTeX File';
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!dropdownContainer.contains(e.target) && !label.contains(e.target)) {
                dropdownList.style.display = 'none';
            }
        });
    }

    async getLatexFilesFromRepo() {
        const apiUrl = 'https://api.github.com/repos/tolverne/papertrail/contents/latex-files';
        try {
            const response = await fetch(apiUrl);
            if (!response.ok) {
                console.error('Failed to fetch files:', response.status);
                return [];
            }
            const files = await response.json();
            return files.filter(file => file.name.endsWith('.tex'));
        } catch (error) {
            console.error('Error fetching file list:', error);
            return [];
        }
    }

    async loadLatexFileFromGitHub(file) {
        document.getElementById('loading').style.display = 'block';
        
        try {
            const response = await fetch(file.download_url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const content = await response.text();
            this.fileName = file.name;
            this.parseLatexFile(content);
        } catch (error) {
            console.error('Error loading file:', error);
            document.getElementById('loading').style.display = 'none';
            alert('Failed to load file from repository');
        }
    }

    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        this.fileName = file.name;
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            this.parseLatexFile(content);
        };
        reader.readAsText(file);

        document.getElementById('loading').style.display = 'block';
    }

    parseLatexFile(content) {
        // First, split content by sections
        const sectionSplits = content.split(/\\section\{([^}]+)\}/);
        
        if (sectionSplits.length === 1) {
            // No sections found, use original parsing method
            const questions = this.parseQuestionsFromContent(content);
            if (questions.length > 0) {
                this.sections = [{
                    id: 1,
                    title: 'Questions',
                    questions: questions
                }];
                this.currentSectionIndex = 0;
                this.renderCurrentSection();
                this.updateCarouselNavigation();
            } else {
                alert('No questions found in the LaTeX file. Please check the format.');
            }
            document.getElementById('loading').style.display = 'none';
            document.getElementById('generatePdf').style.display = 'block';
        } else {
            // Process sections
            const sections = [];
            for (let i = 1; i < sectionSplits.length; i += 2) {
                const sectionTitle = sectionSplits[i];
                const sectionContent = sectionSplits[i + 1] || '';
                
                const questions = this.parseQuestionsFromContent(sectionContent);
                if (questions.length > 0 || sectionContent.trim()) {
                    sections.push({
                        id: Math.floor(i / 2) + 1,
                        title: sectionTitle,
                        questions: questions,
                        content: sectionContent
                    });
                }
            }

            if (sections.length === 0) {
                alert('No sections or questions found in the LaTeX file. Please check the format.');
                document.getElementById('loading').style.display = 'none';
                return;
            }

            this.sections = sections;
            this.currentSectionIndex = 0;
            this.renderCurrentSection();
            this.updateCarouselNavigation();
            document.getElementById('loading').style.display = 'none';
            document.getElementById('generatePdf').style.display = 'block';
        }
    }

    parseQuestionsFromContent(content) {
        const questions = [];
        
        // Extract questions using regex - same as your original code
        const questionsMatch = content.match(/\\begin{questions}(.*?)\\end{questions}/s);
        if (!questionsMatch) {
            return questions; // Return empty array if no questions block found
        }

        const questionsContent = questionsMatch[1];
        
        // Split by \question but keep the \question text - same as your original
        const questionBlocks = questionsContent.split(/\\question\s+/).filter(block => block.trim());
        
        questionBlocks.forEach((block, index) => {
            const question = { id: index + 1, text: '', parts: [] };
            
            // Check if this question has parts - same as your original
            const partsMatch = block.match(/(.*?)\\begin{parts}(.*?)\\end{parts}/s);
            
            if (partsMatch) {
                question.text = partsMatch[1].trim();
                const partsContent = partsMatch[2];
                
                // Extract parts - same as your original
                const parts = partsContent.split(/\\part\s+/).filter(part => part.trim());
                parts.forEach((partText, partIndex) => {
                    question.parts.push({
                        id: partIndex + 1,
                        text: partText.trim()
                    });
                });
            } else {
                // Question without parts - same as your original
                question.text = block.trim();
                question.parts.push({
                    id: 1,
                    text: ''
                });
            }
            
            questions.push(question);
        });

        return questions;
    }

    renderCurrentSection() {
        const carousel = document.getElementById('sectionsCarousel');
        if (!carousel) return;

        const currentSection = this.sections[this.currentSectionIndex];
        if (!currentSection) return;

        carousel.innerHTML = '';

        // Create section container
        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'section-container';
        sectionDiv.innerHTML = `
            <div class="section-header">
                <h2>${currentSection.title}</h2>
            </div>
        `;

        // Add questions if they exist
        if (currentSection.questions && currentSection.questions.length > 0) {
            currentSection.questions.forEach((question) => {
                const questionDiv = document.createElement('div');
                questionDiv.className = 'question-container';
                questionDiv.setAttribute('data-question', question.id);
                questionDiv.innerHTML = `
                    <div class="question-text">
                        <strong>Question ${question.id}:</strong> ${this.processLatexText(question.text)}
                    </div>
                `;

                question.parts.forEach((part) => {
                    const partDiv = document.createElement('div');
                    partDiv.className = 'part-container';
                    partDiv.setAttribute('data-question', question.id);
                    partDiv.setAttribute('data-part', part.id);
                    partDiv.setAttribute('data-section', currentSection.id);
                    
                    const partContent = `
                        <div class="part-text">
                            ${part.text ? `<strong>Part ${part.id}:</strong> ${this.processLatexText(part.text)}` : ''}
                        </div>
                        <div class="canvas-area">
                            <div class="canvas-container">
                                <canvas class="drawing-canvas" width="400" height="300" 
                                        data-question="${question.id}" 
                                        data-part="${part.id}"
                                        data-section="${currentSection.id}"></canvas>
                                <div class="resize-handle"></div>
                            </div>
                            <div class="tools">
                                <div class="color-picker">
                                    <div class="color-btn active" style="background-color: #000000;" data-color="#000000"></div>
                                    <div class="color-btn" style="background-color: #0066cc;" data-color="#0066cc"></div>
                                    <div class="color-btn" style="background-color: #cc0000;" data-color="#cc0000"></div>
                                </div>
                                <button class="eraser-btn">🧽 Eraser</button>
                            </div>
                        </div>
                    `;
                    
                    partDiv.innerHTML = partContent;
                    questionDiv.appendChild(partDiv);
                });

                sectionDiv.appendChild(questionDiv);
            });
        } else if (currentSection.content) {
            // If no questions but has content, display the content
            const contentDiv = document.createElement('div');
            contentDiv.className = 'section-content';
            contentDiv.innerHTML = this.processLatexText(currentSection.content);
            sectionDiv.appendChild(contentDiv);
        }

        carousel.appendChild(sectionDiv);
        this.initializeCanvases();
        this.renderMath();
    }

    processLatexText(text) {
        return text
            .replace(/\\vspace\{[^}]*\}/g, '')            // Remove all \vspace{...}
            .replace(/\\textbf{([^}]*)}/g, '<strong>$1</strong>')
            .replace(/\\textit{([^}]*)}/g, '<em>$1</em>')
            .replace(/\\emph{([^}]*)}/g, '<em>$1</em>');
    }

    renderMath() {
        if (window.MathJax && window.MathJax.typesetPromise) {
            window.MathJax.typesetPromise().catch((err) => console.log(err.message));
        }
    }

    initializeCanvases() {
        const canvases = document.querySelectorAll('.drawing-canvas');
        
        canvases.forEach((canvas) => {
            const ctx = canvas.getContext('2d');
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.lineWidth = 2;
            
            this.canvases.push({ canvas, ctx });
            
            // Drawing event listeners
            canvas.addEventListener('mousedown', this.startDrawing.bind(this));
            canvas.addEventListener('mousemove', this.draw.bind(this));
            canvas.addEventListener('mouseup', this.stopDrawing.bind(this));
            canvas.addEventListener('mouseout', this.stopDrawing.bind(this));
            
            // Touch events for stylus/finger
            canvas.addEventListener('touchstart', this.handleTouch.bind(this));
            canvas.addEventListener('touchmove', this.handleTouch.bind(this));
            canvas.addEventListener('touchend', this.stopDrawing.bind(this));
            
            // Pinch to zoom
            canvas.addEventListener('gesturestart', this.handleGesture.bind(this));
            canvas.addEventListener('gesturechange', this.handleGesture.bind(this));
            
            // Resize handle
            const resizeHandle = canvas.parentElement.querySelector('.resize-handle');
            resizeHandle.addEventListener('mousedown', (e) => this.startResize(e, canvas));
        });
        
        // Color picker and eraser event listeners
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Remove active class from siblings
                e.target.parentElement.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                this.currentColor = e.target.dataset.color;
                this.isErasing = false;
                
                // Remove active from eraser
                e.target.closest('.tools').querySelector('.eraser-btn').classList.remove('active');
            });
        });
        
        document.querySelectorAll('.eraser-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.isErasing = !this.isErasing;
                e.target.classList.toggle('active');
                
                // Remove active from color buttons
                if (this.isErasing) {
                    e.target.closest('.tools').querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
                }
            });
        });
    }

    startDrawing(e) {
        this.isDrawing = true;
        const rect = e.target.getBoundingClientRect();
        this.lastX = e.clientX - rect.left;
        this.lastY = e.clientY - rect.top;
    }

    draw(e) {
        if (!this.isDrawing) return;
        
        const canvas = e.target;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;
        
        ctx.beginPath();
        ctx.moveTo(this.lastX, this.lastY);
        ctx.lineTo(currentX, currentY);
        
        if (this.isErasing) {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.lineWidth = 50;
        } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = this.currentColor;
            ctx.lineWidth = 2;
        }
        
        ctx.stroke();
        
        this.lastX = currentX;
        this.lastY = currentY;
    }

    stopDrawing() {
        this.isDrawing = false;
    }

    handleTouch(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent(e.type === 'touchstart' ? 'mousedown' : 
                                         e.type === 'touchmove' ? 'mousemove' : 'mouseup', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        e.target.dispatchEvent(mouseEvent);
    }

    handleGesture(e) {
        e.preventDefault();
        if (e.type === 'gesturechange') {
            const canvas = e.target;
            const newWidth = Math.max(200, Math.min(800, canvas.width * e.scale));
            const newHeight = Math.max(150, Math.min(600, canvas.height * e.scale));
            
            // Preserve canvas content
            const imageData = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
            canvas.width = newWidth;
            canvas.height = newHeight;
            canvas.getContext('2d').putImageData(imageData, 0, 0);
        }
    }

    startResize(e, canvas) {
        e.preventDefault();
        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = canvas.width;
        const startHeight = canvas.height;
        
        const doDrag = (e) => {
            const newWidth = Math.min(800, Math.max(200, startWidth + (e.clientX - startX)));
            const newHeight = Math.min(800, Math.max(150, startHeight + (e.clientY - startY)));
            
            // Preserve canvas content
            const imageData = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
            canvas.width = newWidth;
            canvas.height = newHeight;
            canvas.getContext('2d').putImageData(imageData, 0, 0);
        };
        
        const stopDrag = () => {
            document.removeEventListener('mousemove', doDrag);
            document.removeEventListener('mouseup', stopDrag);
        };
        
        document.addEventListener('mousemove', doDrag);
        document.addEventListener('mouseup', stopDrag);
    }

    async generatePDF() {
        console.log('Starting PDF generation...');
        
        this.studentName = document.getElementById('studentName').value.trim();

        const progressContainer = document.querySelector('.pdf-progress-container');
        const progressBar = document.getElementById('pdfProgress');
        progressContainer.style.display = 'block';
        progressBar.value = 0;

        try {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            let isFirstPage = true;

            // Calculate total parts across all sections
            const totalParts = this.sections.reduce((acc, section) => {
                return acc + section.questions.reduce((qacc, q) => qacc + q.parts.length, 0);
            }, 0);
            let processedParts = 0;

            for (const section of this.sections) {
                // Add section title page
                if (!isFirstPage) pdf.addPage();
                isFirstPage = false;
                
                pdf.setFontSize(18);
                pdf.setFont(undefined, 'bold');
                pdf.text(section.title, 15, 30);

                for (const question of section.questions) {
                    for (const part of question.parts) {
                        pdf.addPage();

                        let yPos = 20;

                        // Add section title
                        pdf.setFontSize(14);
                        pdf.setFont(undefined, 'bold');
                        pdf.text(section.title, 15, yPos);
                        yPos += 10;

                        // Temporarily render the question to capture it
                        const tempContainer = document.createElement('div');
                        tempContainer.style.position = 'absolute';
                        tempContainer.style.left = '-9999px';
                        tempContainer.innerHTML = `
                            <div class="question-text">
                                <strong>Question ${question.id}:</strong> ${this.processLatexText(question.text)}
                            </div>
                        `;
                        document.body.appendChild(tempContainer);

                        try {
                            if (window.MathJax) await new Promise(resolve => setTimeout(resolve, 100));

                            const questionCanvas = await html2canvas(tempContainer, { scale: 2, backgroundColor: '#ffffff' });
                            const questionImgData = questionCanvas.toDataURL('image/png');
                            const questionImgWidth = Math.min(170, questionCanvas.width * 0.25);
                            const questionImgHeight = questionCanvas.height * (questionImgWidth / questionCanvas.width);
                            pdf.addImage(questionImgData, 'PNG', 15, yPos, questionImgWidth, questionImgHeight);
                            yPos += questionImgHeight + 8;

                            if (part.text) {
                                const partContainer = document.createElement('div');
                                partContainer.style.position = 'absolute';
                                partContainer.style.left = '-9999px';
                                partContainer.innerHTML = `
                                    <div class="part-text">
                                        <strong>Part ${part.id}:</strong> ${this.processLatexText(part.text)}
                                    </div>
                                `;
                                document.body.appendChild(partContainer);

                                const partCanvas = await html2canvas(partContainer, { scale: 2, backgroundColor: '#ffffff' });
                                const partImgData = partCanvas.toDataURL('image/png');
                                const partImgWidth = Math.min(170, partCanvas.width * 0.25);
                                const partImgHeight = partCanvas.height * (partImgWidth / partCanvas.width);
                                pdf.addImage(partImgData, 'PNG', 15, yPos, partImgWidth, partImgHeight);
                                yPos += partImgHeight + 15;

                                document.body.removeChild(partContainer);
                            }

                        } catch (error) {
                            console.warn('Fallback text rendering:', error);
                            const questionText = `Question ${question.id}: ${question.text}`;
                            const partText = part.text ? `Part ${part.id}: ${part.text}` : '';
                            
                            pdf.setFontSize(12);
                            pdf.setFont(undefined, 'bold');
                            const questionLines = pdf.splitTextToSize(questionText, 170);
                            pdf.text(questionLines, 15, yPos);
                            yPos += questionLines.length * 6 + 5;

                            if (partText) {
                                pdf.setFont(undefined, 'normal');
                                const partLines = pdf.splitTextToSize(partText, 170);
                                pdf.text(partLines, 15, yPos);
                                yPos += partLines.length * 6 + 15;
                            }
                        }

                        document.body.removeChild(tempContainer);

                        // Find canvas for this specific question/part
                        const canvas = document.querySelector(`canvas[data-section="${section.id}"][data-question="${question.id}"][data-part="${part.id}"]`);
                        if (canvas) {
                            const imgData = canvas.toDataURL('image/png');
                            const imgWidth = Math.min(170, canvas.width * 0.35);
                            const imgHeight = canvas.height * (imgWidth / canvas.width);
                            pdf.addImage(imgData, 'PNG', 15, yPos, imgWidth, imgHeight);
                        }

                        // Update progress bar
                        processedParts++;
                        progressBar.value = Math.round((processedParts / totalParts) * 100);
                    }
                }
            }

            // Use stored LaTeX filename (without extension)
            const baseName = this.fileName.replace(/\.[^/.]+$/, '');
            const namePart = this.studentName ? this.studentName.replace(/\s+/g, '_') : 'student';
            pdf.save(`${baseName}-${namePart}-answers.pdf`);
            console.log('PDF generated successfully');

        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Error generating PDF: ' + error.message);
        } finally {
            // Hide progress after short delay
            setTimeout(() => {
                document.querySelector('.pdf-progress-container').style.display = 'none';
            }, 1000);
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new QuizApp();
});
