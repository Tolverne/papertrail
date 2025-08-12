

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
                this.init();
            }

            init() {
                document.getElementById('fileInput').addEventListener('change', this.handleFileUpload.bind(this));
                document.getElementById('generatePdf').addEventListener('click', this.generatePDF.bind(this));
            }
    
document.getElementById("openRepoModal").addEventListener("click", () => {
  document.getElementById("repoModal").style.display = "block";
  loadRepoFileList();
});

document.getElementById("closeRepoModal").addEventListener("click", () => {
  document.getElementById("repoModal").style.display = "none";
});

window.onclick = (event) => {
  if (event.target === document.getElementById("repoModal")) {
    document.getElementById("repoModal").style.display = "none";
  }
};

// Fetch and list .tex files in repo
async function loadRepoFileList() {
  const owner = "tolverne";
  const repo = "papertrail";
  const branch = "main";

  async function listFiles(path = "") {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
    const res = await fetch(url);
    const data = await res.json();

    let html = "<ul>";
    for (const item of data) {
      if (item.type === "dir") {
        html += `<li><strong>${item.name}</strong>${await listFiles(item.path)}</li>`;
      } else if (item.name.endsWith(".tex")) {
        html += `<li><a href="#" data-path="${item.path}">${item.name}</a></li>`;
      }
    }
    html += "</ul>";
    return html;
  }

  document.getElementById("repoFileList").innerHTML = await listFiles();

  // Hook clicks
  document.querySelectorAll("#repoFileList a").forEach(link => {
    link.addEventListener("click", async (e) => {
      e.preventDefault();
      const path = e.target.getAttribute("data-path");
      const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
      const res = await fetch(url);
      const content = await res.text();
      parseLatexFile(content); // your existing function
      document.getElementById("repoModal").style.display = "none";
    });
  });
}


            async function loadLatexFile(filePath) {
                const rawUrl = `https://raw.githubusercontent.com/${githubUser}/${githubRepo}/main/${filePath}`;
                try {
                    const res = await fetch(rawUrl);
                    const content = await res.text();
                    // Use your existing parser
                    parseLatexFile(content);
                    document.getElementById("fileModal").style.display = "none";
                    document.getElementById('loading').style.display = 'block';
                } catch (err) {
                    console.error("Error loading LaTeX file:", err);
                }
            }



            handleFileUpload(event) {
                const file = event.target.files[0];
                if (!file) return;

                this.fileName=file.name;
                const reader = new FileReader();
                reader.onload = (e) => {
                    const content = e.target.result;
                    this.parseLatexFile(content);
                };
                reader.readAsText(file);

                document.getElementById('loading').style.display = 'block';
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
                    const newWidth = Math.min(800,Math.max(200, startWidth + (e.clientX - startX)));
                    const newHeight = Math.min(800,Math.max(150, startHeight + (e.clientY - startY)));
                    
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

                // ✅ Update progress bar
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
        // ✅ Hide progress after short delay
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
