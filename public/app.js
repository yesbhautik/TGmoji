// ═══════════════════════════════════════════════════
// TGmoji v2 — Frontend (Client-Side Processing)
// All conversion runs in the browser — no server needed
// ═══════════════════════════════════════════════════

(function () {
    'use strict';

    // ── DOM References ──
    const dropZone = document.getElementById('dropZone');
    const browseLink = document.getElementById('browseLink');
    const fileInput = document.getElementById('fileInput');
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const removeFile = document.getElementById('removeFile');
    const svgPreviewArea = document.getElementById('svgPreviewArea');
    const svgPreview = document.getElementById('svgPreview');
    const convertBtn = document.getElementById('convertBtn');
    const progressSection = document.getElementById('progressSection');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const errorMessage = document.getElementById('errorMessage');
    const resultsSection = document.getElementById('resultsSection');
    const resultsGrid = document.getElementById('resultsGrid');

    let selectedFile = null;
    let svgContent = null;

    // ── Aspect ratio state ──
    let svgOriginalWidth = 386;
    let svgOriginalHeight = 310;
    let aspectRatio = svgOriginalWidth / svgOriginalHeight;
    let updatingDimension = false;

    // ── File Handling ──
    browseLink.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('click', (e) => {
        if (e.target !== browseLink) fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) handleFile(e.target.files[0]);
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        if (files.length) handleFile(files[0]);
    });

    removeFile.addEventListener('click', clearFile);

    function handleFile(file) {
        if (!file.name.toLowerCase().endsWith('.svg') && file.type !== 'image/svg+xml') {
            showError('Please select an SVG file.');
            return;
        }

        selectedFile = file;
        fileName.textContent = file.name;
        fileSize.textContent = formatFileSize(file.size);
        fileInfo.classList.add('active');
        dropZone.style.display = 'none';
        convertBtn.disabled = false;
        hideError();

        const reader = new FileReader();
        reader.onload = (e) => {
            svgContent = e.target.result;
            svgPreview.innerHTML = svgContent;
            svgPreviewArea.classList.add('active');
            autoDetectFromSVG(svgContent);
        };
        reader.readAsText(file);
    }

    function autoDetectFromSVG(text) {
        const durationMatch = text.match(/animation:\s*[\w-]+\s+([\d.]+)s/i);
        if (durationMatch) {
            document.getElementById('duration').value = parseFloat(durationMatch[1]);
        }

        const widthMatch = text.match(/width="(\d+)"/);
        const heightMatch = text.match(/height="(\d+)"/);
        if (widthMatch && heightMatch) {
            svgOriginalWidth = parseInt(widthMatch[1]);
            svgOriginalHeight = parseInt(heightMatch[1]);
            aspectRatio = svgOriginalWidth / svgOriginalHeight;

            document.getElementById('gifWidth').value = svgOriginalWidth;
            document.getElementById('gifHeight').value = svgOriginalHeight;
        }

        updateStickerDims();
    }

    function clearFile() {
        selectedFile = null;
        svgContent = null;
        fileInput.value = '';
        fileInfo.classList.remove('active');
        svgPreviewArea.classList.remove('active');
        svgPreview.innerHTML = '';
        dropZone.style.display = '';
        convertBtn.disabled = true;
        resultsSection.classList.remove('active');
        hideError();
    }

    // ── Aspect Ratio Lock ──
    const gifWidthInput = document.getElementById('gifWidth');
    const gifHeightInput = document.getElementById('gifHeight');
    const lockAspectRatio = document.getElementById('lockAspectRatio');

    gifWidthInput.addEventListener('input', () => {
        if (lockAspectRatio.checked && !updatingDimension) {
            updatingDimension = true;
            const w = parseInt(gifWidthInput.value) || 1;
            gifHeightInput.value = Math.round(w / aspectRatio);
            updatingDimension = false;
        }
        updateStickerDims();
    });

    gifHeightInput.addEventListener('input', () => {
        if (lockAspectRatio.checked && !updatingDimension) {
            updatingDimension = true;
            const h = parseInt(gifHeightInput.value) || 1;
            gifWidthInput.value = Math.round(h * aspectRatio);
            updatingDimension = false;
        }
        updateStickerDims();
    });

    lockAspectRatio.addEventListener('change', () => {
        if (lockAspectRatio.checked) {
            const w = parseInt(gifWidthInput.value) || 1;
            const h = parseInt(gifHeightInput.value) || 1;
            aspectRatio = w / h;
        }
    });

    // ── Sticker dimensions preview ──
    function updateStickerDims() {
        const w = parseInt(gifWidthInput.value) || svgOriginalWidth;
        const h = parseInt(gifHeightInput.value) || svgOriginalHeight;
        const ar = w / h;
        let sW, sH;
        if (ar >= 1) {
            sW = 512;
            sH = Math.round(512 / ar);
        } else {
            sH = 512;
            sW = Math.round(512 * ar);
        }
        document.getElementById('stickerDims').textContent = `${sW} × ${sH}`;
    }

    // ── Conversion (Client-Side!) ──
    convertBtn.addEventListener('click', startConversion);

    async function startConversion() {
        if (!svgContent) return;

        const generateGif = document.getElementById('generateGif').checked;
        const generateWebm = document.getElementById('generateWebm').checked;
        const generateSticker = document.getElementById('generateSticker').checked;

        if (!generateGif && !generateWebm && !generateSticker) {
            showError('Please enable at least one output format.');
            return;
        }

        const gifW = parseInt(document.getElementById('gifWidth').value) || 386;
        const gifH = parseInt(document.getElementById('gifHeight').value) || 310;
        const fps = parseInt(document.getElementById('fps').value) || 30;
        const duration = parseFloat(document.getElementById('duration').value) || 2;
        const telegramSize = parseInt(document.getElementById('telegramSize').value) || 100;

        convertBtn.disabled = true;
        convertBtn.innerHTML = '<span class="btn-icon">⏳</span> Processing…';
        progressSection.classList.add('active');
        resultsSection.classList.remove('active');
        progressBar.style.width = '0%';
        hideError();

        try {
            const results = await Converter.convert(svgContent, {
                generateGif,
                generateWebm,
                generateSticker,
                gifWidth: gifW,
                gifHeight: gifH,
                fps,
                duration,
                telegramSize,
                stickerSourceW: gifW,
                stickerSourceH: gifH,
            }, (type, ...args) => {
                // Progress callback
                if (type === 'status') {
                    progressText.textContent = args[0];
                } else if (type === 'capture') {
                    const [frame, total] = args;
                    const pct = Math.round((frame / total) * 40); // Capture = 0-40%
                    progressBar.style.width = pct + '%';
                    progressText.textContent = `Capturing frame ${frame}/${total}…`;
                } else if (type === 'gif') {
                    const [done, total] = args;
                    const pct = 40 + Math.round((done / total) * 30); // GIF = 40-70%
                    progressBar.style.width = pct + '%';
                    progressText.textContent = `Encoding GIF… ${done}%`;
                } else if (type === 'webm') {
                    const [frame, total] = args;
                    const pct = 70 + Math.round((frame / total) * 30); // WebM = 70-100%
                    progressBar.style.width = pct + '%';
                    progressText.textContent = `Encoding WebM… ${frame}/${total}`;
                }
            });

            progressBar.style.width = '100%';
            progressText.textContent = 'Done! ✨';

            setTimeout(() => {
                progressSection.classList.remove('active');
                showResults(results);
            }, 600);

        } catch (err) {
            progressSection.classList.remove('active');
            showError(err.message || 'Something went wrong during conversion.');
        } finally {
            convertBtn.disabled = false;
            convertBtn.innerHTML = '<span class="btn-icon">⚡</span> Convert SVG';
        }
    }

    // ── Results Display ──
    function showResults(results) {
        resultsGrid.innerHTML = '';

        if (results.gif) {
            const url = URL.createObjectURL(results.gif.blob);
            const card = document.createElement('div');
            card.className = 'result-card';
            card.innerHTML = `
        <div class="result-preview">
          <img src="${url}" alt="GIF output">
        </div>
        <div class="result-label gif">Animated GIF</div>
        <div class="result-size">${results.gif.size}</div>
        <a href="${url}" download="${results.gif.filename}" class="download-btn gif-btn">
          ⬇ Download GIF
        </a>
      `;
            resultsGrid.appendChild(card);
        }

        if (results.webm) {
            const url = URL.createObjectURL(results.webm.blob);
            const telegramOk = results.webm.meetsTelegramLimit;
            const card = document.createElement('div');
            card.className = 'result-card';
            card.innerHTML = `
        <div class="result-preview">
          <video src="${url}" autoplay loop muted playsinline></video>
        </div>
        <div class="result-label webm">Telegram Emoji WebM</div>
        <div class="result-size">${results.webm.size}</div>
        <div class="telegram-badge ${telegramOk ? 'pass' : 'fail'}">
          ${telegramOk ? '✓ Within 256 KB limit' : '⚠ Exceeds 256 KB limit'}
        </div>
        <a href="${url}" download="${results.webm.filename}" class="download-btn webm-btn">
          ⬇ Download WebM
        </a>
      `;
            resultsGrid.appendChild(card);
        }

        if (results.sticker) {
            const url = URL.createObjectURL(results.sticker.blob);
            const stickerOk = results.sticker.meetsTelegramLimit;
            const card = document.createElement('div');
            card.className = 'result-card';
            card.innerHTML = `
        <div class="result-preview">
          <video src="${url}" autoplay loop muted playsinline></video>
        </div>
        <div class="result-label sticker">Telegram Sticker WebM</div>
        <div class="result-size">${results.sticker.size} · ${results.sticker.dimensions}</div>
        <div class="telegram-badge ${stickerOk ? 'pass' : 'fail'}">
          ${stickerOk ? '✓ Within 256 KB limit' : '⚠ Exceeds 256 KB limit'}
        </div>
        <a href="${url}" download="${results.sticker.filename}" class="download-btn sticker-btn">
          ⬇ Download Sticker
        </a>
      `;
            resultsGrid.appendChild(card);
        }

        resultsSection.classList.add('active');
    }

    // ── Utils ──
    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    function showError(msg) {
        errorMessage.textContent = msg;
        errorMessage.classList.add('active');
    }

    function hideError() {
        errorMessage.classList.remove('active');
        errorMessage.textContent = '';
    }

    // ── Toggle settings visibility ──
    document.getElementById('generateGif').addEventListener('change', (e) => {
        document.getElementById('gifForm').style.opacity = e.target.checked ? '1' : '0.3';
        document.getElementById('gifForm').style.pointerEvents = e.target.checked ? 'auto' : 'none';
    });

    document.getElementById('generateWebm').addEventListener('change', (e) => {
        document.getElementById('webmForm').style.opacity = e.target.checked ? '1' : '0.3';
        document.getElementById('webmForm').style.pointerEvents = e.target.checked ? 'auto' : 'none';
    });

    document.getElementById('generateSticker').addEventListener('change', (e) => {
        document.getElementById('stickerForm').style.opacity = e.target.checked ? '1' : '0.3';
        document.getElementById('stickerForm').style.pointerEvents = e.target.checked ? 'auto' : 'none';
    });

})();
