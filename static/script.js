// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {

    // --- jspdf global ---
    const { jsPDF } = window.jspdf;

    // --- Get All Elements ---
    const conceptualizeBtn = document.getElementById('conceptualize-btn');
    const generateBtn = document.getElementById('generate-btn');
    const rawPromptText = document.getElementById('raw-prompt');
    const enrichedPromptText = document.getElementById('enriched-prompt');
    const modelSelector = document.getElementById('model-selector'); 
    
    // Step/UI Containers
    const wizardContainer = document.getElementById('wizard-container');
    const step1 = document.getElementById('step-1');
    const step2 = document.getElementById('step-2');
    const editorWorkspace = document.getElementById('editor-workspace');
    const loadingSpinner = document.getElementById('loading-spinner');
    
    const editorContainer = document.getElementById('editor-container');
    const exportControls = document.getElementById('export-controls');

    // Img2Img Upload Elements
    const imageUploadInput = document.getElementById('image-upload-input');
    const imagePreviewContainer = document.getElementById('image-preview-container');
    const imagePreview = document.getElementById('image-preview');
    const removeImageBtn = document.getElementById('remove-image-btn');
    const fileInputLabel = document.querySelector('.file-input-label');

    // Global Tools
    const addTextBtn = document.getElementById('add-text-btn');
    const uploadImageBtn = document.getElementById('upload-image-btn'); 
    const clearCanvasBtn = document.getElementById('clear-canvas-btn');
    const backToWizardBtn = document.getElementById('back-to-wizard-btn');
    
    // Download Tools
    const downloadBtn = document.getElementById('download-btn');
    const downloadMenu = document.getElementById('download-menu');
    const downloadPngBtn = document.getElementById('download-png');
    const downloadJpgBtn = document.getElementById('download-jpg');
    const downloadPdfBtn = document.getElementById('download-pdf');

    // Share Tools
    const shareBtn = document.getElementById('share-btn');
    const shareMenu = document.getElementById('share-menu');
    const shareFileBtn = document.getElementById('share-file-btn');
    const shareWhatsAppBtn = document.getElementById('share-whatsapp-btn');

    // Contextual Tools Containers
    const contextualTools = document.getElementById('contextual-tools');
    const textTools = document.getElementById('text-tools');
    const imageTools = document.getElementById('image-tools'); 
    const deleteBtn = document.getElementById('delete-btn');
    const bringFrontBtn = document.getElementById('bring-front-btn');
    const sendBackBtn = document.getElementById('send-back-btn');
    
    // Text Tool Inputs (Basic)
    const fontFamilySelect = document.getElementById('font-family');
    const fontColorInput = document.getElementById('font-color');
    const fontSizeInput = document.getElementById('font-size');
    const textBoldBtn = document.getElementById('text-bold-btn');
    const textItalicBtn = document.getElementById('text-italic-btn');
    const textUnderlineBtn = document.getElementById('text-underline-btn');
    const textAlignLeftBtn = document.getElementById('text-align-left-btn');
    const textAlignCenterBtn = document.getElementById('text-align-center-btn');
    const textAlignRightBtn = document.getElementById('text-align-right-btn');
    const textBgColorInput = document.getElementById('text-bg-color');
    const textAlignButtons = [textAlignLeftBtn, textAlignCenterBtn, textAlignRightBtn];

    // --- Advanced Text Tools Inputs ---
    const letterSpacingInput = document.getElementById('letter-spacing');
    const lineHeightInput = document.getElementById('line-height');
    const strokeWidthInput = document.getElementById('stroke-width');
    const strokeColorInput = document.getElementById('stroke-color');
    const shadowBlurInput = document.getElementById('shadow-blur');
    const shadowColorInput = document.getElementById('shadow-color');

    // --- Image Filter Inputs ---
    const filterGrayscaleBtn = document.getElementById('filter-grayscale-btn');
    const filterSepiaBtn = document.getElementById('filter-sepia-btn');
    const filterInvertBtn = document.getElementById('filter-invert-btn');
    const imgBlurInput = document.getElementById('img-blur');

    // --- Common Object Inputs ---
    const blendModeSelect = document.getElementById('blend-mode');
    const rotationSlider = document.getElementById('rotation-slider');
    const opacitySlider = document.getElementById('opacity-slider');

    // --- Performance Metrics Elements ---
    const generationMetrics = document.getElementById('generation-metrics');
    const prevDurationDisplay = document.getElementById('prev-duration-display');
    const currDurationDisplay = document.getElementById('curr-duration-display');
    const diffDisplay = document.getElementById('duration-diff-display');

    // --- NEW: Inpaint (Generative Fill) Elements ---
    const inpaintToolBtn = document.getElementById('inpaint-tool-btn');
    const inpaintControls = document.getElementById('inpaint-controls');
    const brushSizeSlider = document.getElementById('brush-size-slider');
    const inpaintPrompt = document.getElementById('inpaint-prompt');
    const runInpaintBtn = document.getElementById('run-inpaint-btn');
    const cancelInpaintBtn = document.getElementById('cancel-inpaint-btn');

    // --- STATE ---
    let extractedText = null;
    let fabricCanvas = null; 
    let inputImageBase64 = null; 
    // [Phase 2] Store strategy data
    let generatedHeadline = null;
    let generatedAudience = null;
    // [New] Timer State
    let previousDuration = null;
    // [New] Inpaint State
    let inpaintPaths = []; // Store the paths drawn by the brush

    // --- Helper: Button Loading State ---
    const setButtonLoading = (btn, isLoading) => {
        const btnText = btn.querySelector('.btn-text');
        const btnSpinner = btn.querySelector('.spinner-small');
        if (isLoading) {
            btn.disabled = true;
            btn.classList.add('loading');
            if(btnText) btnText.style.display = 'none';
            if(btnSpinner) btnSpinner.style.display = 'block';
        } else {
            btn.disabled = false;
            btn.classList.remove('loading');
            if(btnText) btnText.style.display = 'inline';
            if(btnSpinner) btnSpinner.style.display = 'none';
        }
    };

    // --- Helper: Update Metrics Dashboard ---
    const updateMetrics = (currentDuration) => {
        currDurationDisplay.textContent = currentDuration + 's';

        if (previousDuration !== null) {
            prevDurationDisplay.textContent = previousDuration + 's';
            const diff = (currentDuration - previousDuration).toFixed(2);
            
            if (diff < 0) {
                diffDisplay.textContent = `${diff}s (Faster)`;
                diffDisplay.className = 'metric-value val-faster';
            } else if (diff > 0) {
                diffDisplay.textContent = `+${diff}s (Slower)`;
                diffDisplay.className = 'metric-value val-slower';
            } else {
                diffDisplay.textContent = 'No Change';
                diffDisplay.className = 'metric-value';
            }
        } else {
            prevDurationDisplay.textContent = '--';
            diffDisplay.textContent = 'First Run';
            diffDisplay.className = 'metric-value';
        }
        previousDuration = currentDuration;
    };

    // --- Step 1: Conceptualize Button ---
    conceptualizeBtn.addEventListener('click', async () => {
        const rawPrompt = rawPromptText.value;
        if (!rawPrompt) return alert('Please enter a raw prompt first.');
        setButtonLoading(conceptualizeBtn, true);
        
        try {
            const response = await fetch('/api/conceptualize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    raw_prompt: rawPrompt,
                    style: "Cinematic" 
                }),
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            
            enrichedPromptText.value = data.image_prompt || data.enriched_prompt; 
            extractedText = data.extracted_text; 
            
            generatedHeadline = data.headline;
            generatedAudience = data.target_audience;

            let strategyContainer = document.getElementById('strategy-display');
            if (!strategyContainer) {
                strategyContainer = document.createElement('div');
                strategyContainer.id = 'strategy-display';
                strategyContainer.style.background = 'rgba(255,255,255,0.05)';
                strategyContainer.style.padding = '15px';
                strategyContainer.style.borderRadius = '8px';
                strategyContainer.style.marginTop = '15px';
                strategyContainer.style.borderLeft = '4px solid #6C63FF';
                enrichedPromptText.parentNode.insertBefore(strategyContainer, enrichedPromptText.nextSibling);
            }
            
            if (data.headline) {
                strategyContainer.innerHTML = `
                    <h4 style="margin:0 0 10px 0; color:#fff;">🎯 AI Marketing Strategy</h4>
                    <p style="margin:5px 0; font-size:0.9em;"><strong>Headline:</strong> ${data.headline}</p>
                    <p style="margin:5px 0; font-size:0.9em;"><strong>Target:</strong> ${data.target_audience}</p>
                    <p style="margin:5px 0; font-size:0.9em;"><strong>Copy:</strong> ${data.ad_copy}</p>
                `;
                strategyContainer.style.display = 'block';
            }

            step2.style.display = 'block';
            step1.classList.add('step-complete'); 
            window.scrollTo({ top: step2.offsetTop - 20, behavior: 'smooth' });
            
        } catch (error) {
            console.error('Error in step 1:', error);
            alert('Failed to conceptualize. Check the console for errors.');
        } finally {
            setButtonLoading(conceptualizeBtn, false);
        }
    });

    // --- Img2Img Upload Handlers ---
    imageUploadInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            inputImageBase64 = event.target.result;
            imagePreview.src = inputImageBase64;
            imagePreviewContainer.style.display = 'block';
            fileInputLabel.style.display = 'none';
        };
        reader.readAsDataURL(file);
    });

    removeImageBtn.addEventListener('click', () => {
        inputImageBase64 = null;
        imagePreview.src = '#';
        imagePreviewContainer.style.display = 'none';
        fileInputLabel.style.display = 'block';
        imageUploadInput.value = '';
    });

    // --- Step 2: Generate Button (UPDATED WITH TIMER) ---
    generateBtn.addEventListener('click', async () => {
        const editedPrompt = enrichedPromptText.value;
        const selectedModel = modelSelector.value; 
        if (!editedPrompt) return alert('The enriched prompt is empty!');

        // 1. Start Timer
        const startTime = performance.now();

        setButtonLoading(generateBtn, true);
        
        wizardContainer.style.display = 'none';
        editorWorkspace.style.display = 'grid'; 
        loadingSpinner.style.display = 'block';
        exportControls.style.display = 'flex'; 
        
        window.scrollTo({ top: 0, behavior: 'smooth' });

        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    edited_prompt: editedPrompt,
                    extracted_text: extractedText,
                    selected_model: selectedModel, 
                    image_base64: inputImageBase64,
                    headline: generatedHeadline, 
                    target_audience: generatedAudience
                }),
            });
            
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }

            // 2. Stop Timer & Update Dashboard
            const endTime = performance.now();
            const duration = ((endTime - startTime) / 1000).toFixed(2);
            updateMetrics(duration);
            generationMetrics.style.display = 'grid'; // Show dashboard

            if (!fabricCanvas) {
                fabricCanvas = new fabric.Canvas('poster-canvas');
                setupCanvasEventHandlers(); 
            } else {
                fabricCanvas.clear();
            }

            const imageUrl = `${data.final_web_path}`; 
            
            fabric.Image.fromURL(imageUrl, (img) => {
                const container = editorContainer;
                const containerWidth = container.clientWidth;
                
                const scale = containerWidth / img.width;
                const canvasHeight = img.height * scale;
                
                fabricCanvas.setWidth(containerWidth);
                fabricCanvas.setHeight(canvasHeight);
                fabricCanvas.setBackgroundImage(img, fabricCanvas.renderAll.bind(fabricCanvas), {
                    scaleX: scale,
                    scaleY: scale,
                    crossOrigin: 'anonymous'
                });

                loadingSpinner.style.display = 'none';

            }, { crossOrigin: 'anonymous' });

        } catch (error) {
            console.error('Error in step 2:', error);
            alert(`Failed to generate the poster: ${error.message}`);
            loadingSpinner.style.display = 'none';
            wizardContainer.style.display = 'block';
            editorWorkspace.style.display = 'none';
            exportControls.style.display = 'none';
        } finally {
            setButtonLoading(generateBtn, false);
        }
    });

    // --- ================================== ---
    // --- ADVANCED EDITOR EVENT LISTENERS    ---
    // --- ================================== ---

    // --- 1. Global Tools ---
    addTextBtn.addEventListener('click', () => {
        const text = new fabric.IText('EDIT ME', {
            left: 50,
            top: 50,
            fill: '#FFFFFF',
            fontFamily: 'Poppins',
            fontSize: 50,
            shadow: { color: '#000000', blur: 0 }
        });
        fabricCanvas.add(text);
        fabricCanvas.setActiveObject(text);
        updateContextualTools(text); 
    });

    uploadImageBtn.addEventListener('change', (e) => { 
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = (f) => {
            fabric.Image.fromURL(f.target.result, (img) => {
                img.scaleToWidth(200);
                img.set({ left: 100, top: 100 });
                fabricCanvas.add(img);
                fabricCanvas.setActiveObject(img);
            }, { crossOrigin: 'anonymous' });
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    });

    clearCanvasBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all your edits? This cannot be undone.')) {
            fabricCanvas.remove(...fabricCanvas.getObjects());
        }
    });

    backToWizardBtn.addEventListener('click', () => {
        if (fabricCanvas.getObjects().length > 0) {
            if (!confirm('Are you sure you want to go back? Your edits will be lost.')) {
                return;
            }
        }
        editorWorkspace.style.display = 'none';
        exportControls.style.display = 'none';
        wizardContainer.style.display = 'block';
        step1.classList.remove('step-complete');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // --- 2. Download Tools ---
    const downloadImage = (format, extension) => {
        fabricCanvas.discardActiveObject().renderAll(); 
        const dataURL = fabricCanvas.toDataURL({ format: format, quality: 0.9, multiplier: 1 });
        const link = document.createElement('a');
        link.download = `adcraft-poster.${extension}`;
        link.href = dataURL;
        link.click();
    };

    downloadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        downloadMenu.parentElement.classList.toggle('show');
        shareMenu.parentElement.classList.remove('show');
    });

    downloadPngBtn.addEventListener('click', (e) => { e.preventDefault(); downloadImage('png', 'png'); });
    downloadJpgBtn.addEventListener('click', (e) => { e.preventDefault(); downloadImage('jpeg', 'jpg'); });
    downloadPdfBtn.addEventListener('click', (e) => {
        e.preventDefault();
        fabricCanvas.discardActiveObject().renderAll();
        const imgData = fabricCanvas.toDataURL({ format: 'png', quality: 1.0 });
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'px',
            format: [fabricCanvas.width, fabricCanvas.height]
        });
        pdf.addImage(imgData, 'PNG', 0, 0, fabricCanvas.width, fabricCanvas.height);
        pdf.save('adcraft-poster.pdf');
    });

    // --- 3. Share Tools ---
    shareBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        shareMenu.parentElement.classList.toggle('show');
        downloadMenu.parentElement.classList.remove('show');
    });

    shareFileBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        if (!navigator.share) {
            alert("Your browser doesn't support the Web Share API.");
            return;
        }
        fabricCanvas.discardActiveObject().renderAll();
        try {
            fabricCanvas.toBlob(async (blob) => {
                const file = new File([blob], 'adcraft-poster.png', { type: 'image/png' });
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: 'AdCraft Poster',
                        text: 'Check out this poster I made with AdCraft!',
                    });
                } else {
                    alert("Your browser can't share files.");
                }
            }, 'image/png');
        } catch (error) { console.error('Error sharing:', error); }
    });

    shareWhatsAppBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const text = encodeURIComponent("Check out this awesome poster I'm creating with AdCraft!");
        window.open(`https://wa.me/?text=${text}`, '_blank');
    });

    document.addEventListener('click', (e) => {
        if (!downloadBtn.contains(e.target) && !e.target.matches('#download-btn')) {
            downloadMenu.parentElement.classList.remove('show');
        }
        if (!shareBtn.contains(e.target) && !e.target.matches('#share-btn')) {
            shareMenu.parentElement.classList.remove('show');
        }
    });

    // --- 4. Contextual Tool Listeners ---
    function setToggleState(button, isActive) {
        if (isActive) button.classList.add('active');
        else button.classList.remove('active');
    }

    function updateContextualTools(activeObject) {
        if (!activeObject) {
            contextualTools.style.display = 'none';
            deleteBtn.style.display = 'none';
            return;
        }
        // If in drawing mode (inpainting), hide object tools
        if (fabricCanvas.isDrawingMode) return;

        contextualTools.style.display = 'block';
        deleteBtn.style.display = 'block';
        
        // Common Properties
        opacitySlider.value = activeObject.get('opacity');
        rotationSlider.value = activeObject.get('angle') || 0;
        blendModeSelect.value = activeObject.get('globalCompositeOperation') || 'source-over';

        if (activeObject.type === 'i-text') {
            textTools.style.display = 'block';
            imageTools.style.display = 'none';

            fontColorInput.value = activeObject.get('fill'); 
            fontFamilySelect.value = activeObject.get('fontFamily');
            fontSizeInput.value = activeObject.get('fontSize');
            textBgColorInput.value = activeObject.get('backgroundColor') || '#ffffff';
            
            // Advanced Text Props
            letterSpacingInput.value = activeObject.get('charSpacing') || 0;
            lineHeightInput.value = activeObject.get('lineHeight') || 1.16;
            strokeWidthInput.value = activeObject.get('strokeWidth') || 0;
            strokeColorInput.value = activeObject.get('stroke') || '#000000';

            // Shadow
            const sh = activeObject.get('shadow');
            shadowBlurInput.value = sh ? sh.blur : 0;
            shadowColorInput.value = sh ? sh.color : '#000000';
            
            setToggleState(textBoldBtn, activeObject.get('fontWeight') === 'bold');
            setToggleState(textItalicBtn, activeObject.get('fontStyle') === 'italic');
            setToggleState(textUnderlineBtn, activeObject.get('underline'));
            
            textAlignButtons.forEach(btn => setToggleState(btn, false));
            const textAlign = activeObject.get('textAlign') || 'left';
            setToggleState(document.getElementById(`text-align-${textAlign}-btn`), true);

        } else if (activeObject.type === 'image') {
            textTools.style.display = 'none';
            imageTools.style.display = 'block';
        } else {
            textTools.style.display = 'none';
            imageTools.style.display = 'none';
        }
    }

    // --- 5. Fabric.js Canvas Event Handlers ---
    function setupCanvasEventHandlers() {
        fabricCanvas.on('selection:created', (e) => updateContextualTools(e.target));
        fabricCanvas.on('selection:updated', (e) => updateContextualTools(e.target));
        fabricCanvas.on('selection:cleared', () => updateContextualTools(null));
        fabricCanvas.on('object:modified', (e) => updateContextualTools(e.target)); 
        
        // Track paths created during inpainting
        fabricCanvas.on('path:created', (e) => {
            if (fabricCanvas.isDrawingMode) {
                // Style the brush stroke for better visibility
                e.path.set({ opacity: 0.6, stroke: '#ffffff' }); 
                inpaintPaths.push(e.path);
            }
        });
    }

    // --- 6. Event Handlers for Contextual Tool *Inputs* ---
    function getActive() { return fabricCanvas.getActiveObject(); }
    function render() { fabricCanvas.requestRenderAll(); }

    deleteBtn.addEventListener('click', () => { if (getActive()) fabricCanvas.remove(getActive()); });
    bringFrontBtn.addEventListener('click', () => { if (getActive()) fabricCanvas.bringToFront(getActive()); });
    sendBackBtn.addEventListener('click', () => { if (getActive()) fabricCanvas.sendToBack(getActive()); });
    
    // Common Object Inputs
    opacitySlider.addEventListener('input', (e) => { if (getActive()) { getActive().set('opacity', parseFloat(e.target.value)); render(); } });
    rotationSlider.addEventListener('input', (e) => { if (getActive()) { getActive().set('angle', parseInt(e.target.value)); render(); } });
    blendModeSelect.addEventListener('change', (e) => { if (getActive()) { getActive().set('globalCompositeOperation', e.target.value); render(); } });

    // Text Properties
    fontColorInput.addEventListener('input', (e) => { if (getActive()) { getActive().set('fill', e.target.value); render(); } }); 
    fontFamilySelect.addEventListener('change', (e) => { if (getActive()) { getActive().set('fontFamily', e.target.value); render(); } });
    fontSizeInput.addEventListener('input', (e) => { if (getActive()) { getActive().set('fontSize', parseInt(e.target.value, 10)); render(); } });
    textBgColorInput.addEventListener('input', (e) => { if (getActive()) { getActive().set('backgroundColor', e.target.value); render(); } });
    
    // Advanced Text
    letterSpacingInput.addEventListener('input', (e) => { if (getActive()) { getActive().set('charSpacing', parseInt(e.target.value)); render(); } });
    lineHeightInput.addEventListener('input', (e) => { if (getActive()) { getActive().set('lineHeight', parseFloat(e.target.value)); render(); } });
    strokeWidthInput.addEventListener('input', (e) => { if (getActive()) { getActive().set('strokeWidth', parseInt(e.target.value)); render(); } });
    strokeColorInput.addEventListener('input', (e) => { if (getActive()) { getActive().set('stroke', e.target.value); render(); } });

    // Shadow Handler
    const updateShadow = () => {
        const activeObj = getActive();
        if (activeObj) {
            const color = shadowColorInput.value;
            const blur = parseInt(shadowBlurInput.value);
            activeObj.set('shadow', new fabric.Shadow({ color: color, blur: blur }));
            render();
        }
    };
    shadowBlurInput.addEventListener('input', updateShadow);
    shadowColorInput.addEventListener('input', updateShadow);

    // Text Toggles
    textBoldBtn.addEventListener('click', () => {
        const active = getActive(); if (!active) return;
        const isBold = active.get('fontWeight') === 'bold';
        active.set('fontWeight', isBold ? 'normal' : 'bold');
        setToggleState(textBoldBtn, !isBold); render();
    });
    textItalicBtn.addEventListener('click', () => {
        const active = getActive(); if (!active) return;
        const isItalic = active.get('fontStyle') === 'italic';
        active.set('fontStyle', isItalic ? 'normal' : 'italic');
        setToggleState(textItalicBtn, !isItalic); render();
    });
    textUnderlineBtn.addEventListener('click', () => {
        const active = getActive(); if (!active) return;
        const isUnderline = active.get('underline');
        active.set('underline', !isUnderline);
        setToggleState(textUnderlineBtn, !isUnderline); render();
    });
    textAlignLeftBtn.addEventListener('click', () => {
        if (getActive()) getActive().set('textAlign', 'left');
        textAlignButtons.forEach(btn => setToggleState(btn, btn === textAlignLeftBtn)); render();
    });
    textAlignCenterBtn.addEventListener('click', () => {
        if (getActive()) getActive().set('textAlign', 'center');
        textAlignButtons.forEach(btn => setToggleState(btn, btn === textAlignCenterBtn)); render();
    });
    textAlignRightBtn.addEventListener('click', () => {
        if (getActive()) getActive().set('textAlign', 'right');
        textAlignButtons.forEach(btn => setToggleState(btn, btn === textAlignRightBtn)); render();
    });

    // Image Filters
    const applyImageFilter = (filter) => {
        const obj = getActive();
        if (obj && obj.type === 'image') {
            obj.filters = []; // Clear existing
            if (filter) obj.filters.push(filter);
            obj.applyFilters();
            render();
        }
    };

    filterGrayscaleBtn.addEventListener('click', () => applyImageFilter(new fabric.Image.filters.Grayscale()));
    filterSepiaBtn.addEventListener('click', () => applyImageFilter(new fabric.Image.filters.Sepia()));
    filterInvertBtn.addEventListener('click', () => applyImageFilter(new fabric.Image.filters.Invert()));
    
    imgBlurInput.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        applyImageFilter(new fabric.Image.filters.Blur({ blur: val }));
    });

    // --- ================================== ---
    // --- 7. NEW: GENERATIVE FILL LOGIC      ---
    // --- ================================== ---

    // Toggle Inpaint Mode
    inpaintToolBtn.addEventListener('click', () => {
        // Toggle Panel Visibility
        const isVisible = inpaintControls.style.display !== 'none';
        
        if (!isVisible) {
            // ENTER INPAINT MODE
            inpaintControls.style.display = 'block';
            contextualTools.style.display = 'none'; // Hide other tools
            fabricCanvas.discardActiveObject();
            fabricCanvas.requestRenderAll();
            
            // Enable Drawing
            fabricCanvas.isDrawingMode = true;
            fabricCanvas.freeDrawingBrush = new fabric.PencilBrush(fabricCanvas);
            fabricCanvas.freeDrawingBrush.color = "rgba(255, 255, 255, 0.6)"; // White wash
            fabricCanvas.freeDrawingBrush.width = parseInt(brushSizeSlider.value, 10);
            
            inpaintPaths = []; // Reset paths
            
        } else {
            // EXIT INPAINT MODE (Clean up handled in Cancel button usually, but toggle works too)
            cancelInpaintBtn.click();
        }
    });

    brushSizeSlider.addEventListener('input', (e) => {
        if (fabricCanvas.isDrawingMode) {
            fabricCanvas.freeDrawingBrush.width = parseInt(e.target.value, 10);
        }
    });

    cancelInpaintBtn.addEventListener('click', () => {
        inpaintControls.style.display = 'none';
        fabricCanvas.isDrawingMode = false;
        
        // Remove the drawn paths
        if (inpaintPaths.length > 0) {
            inpaintPaths.forEach(path => fabricCanvas.remove(path));
            inpaintPaths = [];
        }
        fabricCanvas.requestRenderAll();
    });

    // --- 7. NEW: GENERATIVE FILL LOGIC (MATCHING YOUR PYTHON) ---

    // ... (Keep existing inpaintToolBtn, brushSizeSlider, cancelInpaintBtn listeners) ...

    runInpaintBtn.addEventListener('click', async () => {
        const prompt = inpaintPrompt.value;
        if (!prompt) return alert("Please enter a prompt for what you want to generate.");
        if (inpaintPaths.length === 0) return alert("Please paint over the area you want to change.");

        setButtonLoading(runInpaintBtn, true);

        try {
            // --- STEP 1: Generate the "Init Image" (Original Visual) ---
            // Temporarily hide the brush strokes to get the clean underlying image
            inpaintPaths.forEach(p => p.visible = false);
            fabricCanvas.renderAll();
            
            // Get the image data
            const initDataUrl = fabricCanvas.toDataURL({ format: 'png' });
            
            // Show brush strokes again
            inpaintPaths.forEach(p => p.visible = true);
            fabricCanvas.renderAll();

            // --- STEP 2: Generate the "Mask Image" (White on Black) ---
            const tempCanvasEl = document.createElement('canvas');
            tempCanvasEl.width = fabricCanvas.width;
            tempCanvasEl.height = fabricCanvas.height;
            
            const maskCanvas = new fabric.StaticCanvas(tempCanvasEl);
            maskCanvas.backgroundColor = 'black'; 

            inpaintPaths.forEach(path => {
                path.clone((clonedPath) => {
                    clonedPath.set({
                        stroke: 'white',
                        fill: null,
                        left: path.left,
                        top: path.top
                    });
                    maskCanvas.add(clonedPath);
                });
            });

            maskCanvas.renderAll();
            const maskDataUrl = maskCanvas.toDataURL({ format: 'png' });

            // --- STEP 3: Clean Base64 Data & MATCH PYTHON KEYS ---
            // Remove the "data:image/png;base64," prefix
            const cleanImage = initDataUrl.replace(/^data:image\/(png|jpg|jpeg);base64,/, "");
            const cleanMask = maskDataUrl.replace(/^data:image\/(png|jpg|jpeg);base64,/, "");

            const response = await fetch('/api/inpaint', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: prompt,
                    image: cleanImage,  // CHANGED: matches python data.get('image')
                    mask: cleanMask     // CHANGED: matches python data.get('mask')
                })
            });

            const data = await response.json();

            if (!response.ok) {
                console.error("Server Error Detail:", data);
                throw new Error(data.error || "Inpainting failed");
            }

            // --- STEP 4: Handle Result ---
            inpaintPaths.forEach(p => fabricCanvas.remove(p));
            inpaintPaths = [];

            // CHANGED: Your python returns "image_path", not "image_url"
            // We assume this path is relative to the web root. 
            // If your python returns a full local path (e.g., C:/Users/...), 
            // you might need to adjust the URL string below.
            const finalUrl = data.image_path; 

            fabric.Image.fromURL(finalUrl, (img) => {
                const scale = fabricCanvas.width / img.width;
                img.set({
                    left: 0,
                    top: 0,
                    scaleX: scale,
                    scaleY: scale
                });
                
                fabricCanvas.setBackgroundImage(img, fabricCanvas.renderAll.bind(fabricCanvas));
                cancelInpaintBtn.click();
            }, { crossOrigin: 'anonymous' });

        } catch (err) {
            console.error(err);
            alert("Error running Generative Fill: " + err.message);
        } finally {
            setButtonLoading(runInpaintBtn, false);
        }
    });
});