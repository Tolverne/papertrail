class QuizApp {
    constructor() {
        this.questions = [];
        this.canvases = [];
        this.currentColor = '#000000';
        this.isErasing = false;
        this.isDrawing = false;
        this.lastX = 0;
        this.lastY = 0;
        this.studentName = '';
        this.fileName = '';
        this.fileTree = [];
        this.currentFile = null;
        this.init();
    }

    async init() {
        document.getElementById('generatePdf').addEventListener('click', this.generatePDF.bind(this));
        
        // Initialize file tree
        await this.initializeFileTree();
        
        // Setup sidebar toggle
        const sidebarToggle = document.getElementById('sidebarToggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => this.toggleSidebar());
        }
        
        // Setup refresh button
        const refreshBtn = document.getElementById('refreshTree');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                refreshBtn.innerHTML = '⟳';
                refreshBtn.disabled = true;
                await this.initializeFileTree();
                refreshBtn.innerHTML = '🔄';
                refreshBtn.disabled = false;
            });
        }
        
    }

    // File tree functionality
    async getFileTreeFromRepo(path = 'latex-files') {
        const apiUrl = `https://api.github.com/repos/tolverne/papertrail/contents/${path}`;
        try {
            const response = await fetch(apiUrl);
            if (!response.ok) {
                console.error('Failed to fetch files:', response.status);
                return [];
            }
            const items = await response.json();
            
            // Process items and fetch subdirectories recursively
            const processedItems = await Promise.all(
                items.map(async (item) => {
                    const processedItem = {
                        name: item.name,
                        path: item.path,
                        type: item.type,
                        download_url: item.download_url,
                        isExpanded: false
                    };
                    
                    // If it's a directory, recursively fetch its contents
                    if (item.type === 'dir') {
                        processedItem.children = await this.getFileTreeFromRepo(item.path);
                    }
                    
                    return processedItem;
                })
            );
            
            return processedItems;
        } catch (error) {
            console.error('Error fetching file tree:', error);
            return [];
        }
    }

    async initializeFileTree() {
        const fileTree = await this.getFileTreeFromRepo();
        this.fileTree = fileTree;
        this.renderFileTree();
    }

    renderFileTree() {
        const sidebar = document.getElementById('fileSidebar');
        if (!sidebar) {
            console.error('File sidebar element not found');
            return;
        }
        
        const treeContainer = sidebar.querySelector('.file-tree-container');
        if (!treeContainer) {
            console.error('File tree container not found');
            return;
        }
        
        treeContainer.innerHTML = this.renderTreeNode(this.fileTree, 0);
        this.attachFileTreeEventListeners();
    }

    renderTreeNode(items, level = 0) {
        if (!items || items.length === 0) return '';
        
        return items.map(item => {
            const indent = level * 20;
            const hasChildren = item.type === 'dir' && item.children && item.children.length > 0;
            const isTexFile = item.name.endsWith('.tex');
            
            let html = `
                <div class="tree-item" data-path="${item.path}" data-type="${item.type}" style="padding-left: ${indent}px;">
                    <div class="tree-item-content">
            `;
            
            if (hasChildren) {
                html += `
                    <span class="tree-toggle ${item.isExpanded ? 'expanded' : 'collapsed'}" data-path="${item.path}">
                        ${item.isExpanded ? '▼' : '▶'}
                    </span>
                `;
            } else {
                html += `<span class="tree-indent"></span>`;
            }
            
            const icon = this.getFileIcon(item);
            const clickable = isTexFile ? 'clickable-file' : '';
            
            html += `
                        <span class="tree-icon">${icon}</span>
                        <span class="tree-label ${clickable}" data-path="${item.path}" data-download-url="${item.download_url || ''}">
                            ${item.name}
                        </span>
                    </div>
                </div>
            `;
            
            // Add children if directory is expanded
            if (hasChildren && item.isExpanded) {
                html += `<div class="tree-children">${this.renderTreeNode(item.children, level + 1)}</div>`;
            }
            
            return html;
        }).join('');
    }

    getFileIcon(item) {
        if (item.type === 'dir') {
            return item.isExpanded ? '📂' : '📁';
        } else if (item.name.endsWith('.tex')) {
            return '📄';
        } else {
            return '📋';
        }
    }

    attachFileTreeEventListeners() {
        const treeContainer = document.querySelector('.file-tree-container');
        
        // Handle folder toggle
        treeContainer.addEventListener('click', (e) => {
            const toggle = e.target.closest('.tree-toggle');
            if (toggle) {
                const path = toggle.dataset.path;
                this.toggleFolder(path);
                return;
            }
            
            // Handle file selection
            const fileLabel = e.target.closest('.clickable-file');
            if (fileLabel) {
                const path = fileLabel.dataset.path;
                const downloadUrl = fileLabel.dataset.downloadUrl;
                this.loadLatexFileFromTree(path, downloadUrl);
                return;
            }
        });
    }

    toggleFolder(path) {
        const item = this.findItemByPath(this.fileTree, path);
        if (item) {
            item.isExpanded = !item.isExpanded;
            this.renderFileTree();
        }
    }

    findItemByPath(items, targetPath) {
        for (const item of items) {
            if (item.path === targetPath) {
                return item;
            }
            if (item.children) {
                const found = this.findItemByPath(item.children, targetPath);
                if (found) return found;
            }
        }
        return null;
    }

    async loadLatexFileFromTree(path, downloadUrl) {
        if (!downloadUrl) {
            console.error('No download URL available for file:', path);
            return;
        }
        
        // Show loading state
        document.getElementById('loading').style.display = 'block';
        
        // Highlight selected file
        document.querySelectorAll('.tree-label').forEach(label => {
            label.classList.remove('selected');
        });
        document.querySelector(`[data-path="${path}"]`).classList.add('selected');
        
        try {
            const response = await fetch(downloadUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch file: ${response.status}`);
            }
            
            const content = await response.text();
            this.fileName = path.split('/').pop();
            this.parseLatexFile(content);
            
            // Update current file info
            this.currentFile = {
                name: this.fileName,
                path: path
            };
            
            // Update UI to show loaded file
            this.updateFileInfo();
            
        } catch (error) {
            console.error('Error loading LaTeX file:', error);
            alert('Failed to load the selected file. Please try again.');
            document.getElementById('loading').style.display = 'none';
        }
    }

    updateFileInfo() {
        const fileInfo = document.getElementById('currentFileInfo');
        if (fileInfo && this.currentFile) {
            fileInfo.textContent = `Current file: ${this.currentFile.name}`;
            fileInfo.style.display = 'block';
        }
    }

    toggleSidebar() {
        const sidebar = document.getElementById('fileSidebar');
        const mainContent = document.getElementById('mainContent');
        const toggleBtn = document.getElementById('sidebarToggle');
        
        if (sidebar.classList.contains('collapsed')) {
            sidebar.classList.remove('collapsed');
            mainContent.classList.remove('expanded');
            toggleBtn.textContent = '◀';
            toggleBtn.title = 'Hide file browser';
        } else {
            sidebar.classList.add('collapsed');
            mainContent.classList.add('expanded');
            toggleBtn.textContent = '▶';
            toggleBtn.title = 'Show file browser';
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



    parseLatexFile(content) {
        const questions = [];
        
        // Extract questions using regex
        const questionsMatch = content.match(/\\begin{questions}(.*?)\\end{questions}/s);
        if (!questionsMatch) {
            alert('No questions found in the LaTeX file. Please check the format.');
            document.getElementById('loading').style.display = 'none';
            return;
        }

        const questionsContent = questionsMatch[1];
        
        // Split by \question but keep the \question text
        const questionBlocks = questionsContent.split(/\\question\s+/).filter(block => block.trim());
        
        questionBlocks.forEach((block, index) => {
            const question = { id: index + 1, text: '', parts: [] };
            
            // Check if this question has parts
            const partsMatch = block.match(/(.*?)\\begin{parts}(.*?)\\end{parts}/s);
            
            if (partsMatch) {
                question.text = partsMatch[1].trim();
                const partsContent = partsMatch[2];
                
                // Extract parts
                const parts = partsContent.split(/\\part\s+/).filter(part => part.trim());
                parts.forEach((partText, partIndex) => {
                    question.parts.push({
                        id: partIndex + 1,
                        text: partText.trim()
                    });
                });
            } else {
                // Question without parts
                question.text = block.trim();
                question.parts.push({
                    id: 1,
                    text: ''
                });
            }
            
            questions.push(question);
        });

        this.questions = questions;
        this.renderQuestions();
        document.getElementById('loading').style.display = 'none';
    }

    renderQuestions() {
        const container = document.getElementById('questionsContainer');
        container.innerHTML = '';

        this.questions.forEach((question) => {
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
                
                const partContent = `
                    <div class="part-text">
                        ${part.text ? `<strong>Part ${part.id}:</strong> ${this.processLatexText(part.text)}` : ''}
                    </div>
                    <div class="canvas-area">
                        <div class="canvas-container">
                            <canvas class="drawing-canvas" width="400" height="300" data-question="${question.id}" data-part="${part.id}"></canvas>
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

            container.appendChild(questionDiv);
        });

        this.initializeCanvases();
        this.renderMath();
        document.getElementById('generatePdf').style.display = 'block';
    }

    processLatexText(text) {
        return text
            .replace(/\\vspace\{[^}]*\}/g, '')            // Remove all \vspace{...}
            .replace(/\\textbf{([^}]*)}/g, '<strong>$1</strong>')
            .replace(/\\textit{([^}]*)}/g, '<em>$1</em>')
            .replace(/\\emph{([^}]*)}/g, '<em>$1</em>')
            .replace(/\\href\{([^}]*)\}\{([^}]*)\}/g, (match, url, label) => {
            // VIDEO FILES
            if (/\.(mp4|webm|ogg)$/i.test(url)) {
                return `
                    <video controls width="640">
                        <source src="${url}" type="video/${url.split('.').pop()}">
                        Your browser does not support the video tag.
                    </video>
                `;
            }

            // YOUTUBE LINKS
            const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
            if (ytMatch) {
                const videoId = ytMatch[1];
                return `
                    <iframe width="640" height="360"
                        src="https://www.youtube.com/embed/${videoId}"
                        frameborder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowfullscreen>
                    </iframe>
                `;
            }

            // VIMEO LINKS
            const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
            if (vimeoMatch) {
                const videoId = vimeoMatch[1];
                return `
                    <iframe src="https://player.vimeo.com/video/${videoId}"
                        width="640" height="360"
                        frameborder="0"
                        allow="autoplay; fullscreen; picture-in-picture"
                        allowfullscreen>
                    </iframe>
                `;
            }

            // DEFAULT: Just a link
            return `<a href="${url}" target="_blank">${label}</a>`;
        });
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

            const totalParts = this.questions.reduce((acc, q) => acc + q.parts.length, 0);
            let processedParts = 0;

            for (const question of this.questions) {
                for (const part of question.parts) {
                    if (!isFirstPage) pdf.addPage();
                    isFirstPage = false;

                    let yPos = 20;

                    const questionTextElement = document.querySelector(`[data-question="${question.id}"] .question-text`);
                    const partTextElement = document.querySelector(`[data-question="${question.id}"][data-part="${part.id}"] .part-text`);

                    try {
                        if (window.MathJax) await new Promise(resolve => setTimeout(resolve, 100));

                        if (questionTextElement) {
                            const questionCanvas = await html2canvas(questionTextElement, { scale: 2, backgroundColor: '#ffffff' });
                            const questionImgData = questionCanvas.toDataURL('image/png');
                            const questionImgWidth = Math.min(170, questionCanvas.width * 0.25);
                            const questionImgHeight = questionCanvas.height * (questionImgWidth / questionCanvas.width);
                            pdf.addImage(questionImgData, 'PNG', 15, yPos, questionImgWidth, questionImgHeight);
                            yPos += questionImgHeight + 8;
                        }

                        if (partTextElement && part.text) {
                            const partCanvas = await html2canvas(partTextElement, { scale: 2, backgroundColor: '#ffffff' });
                            const partImgData = partCanvas.toDataURL('image/png');
                            const partImgWidth = Math.min(170, partCanvas.width * 0.25);
                            const partImgHeight = partCanvas.height * (partImgWidth / partCanvas.width);
                            pdf.addImage(partImgData, 'PNG', 15, yPos, partImgWidth, partImgHeight);
                            yPos += partImgHeight + 15;
                        } else {
                            yPos += 15;
                        }

                    } catch (error) {
                        console.warn('Fallback:', error);
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

                    const canvas = document.querySelector(`canvas[data-question="${question.id}"][data-part="${part.id}"]`);
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

            // Use stored LaTeX filename (without extension)
            const baseName = this.fileName.replace(/\.[^/.]+$/, '');  // removes extension like .tex or .txt
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
