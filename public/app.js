// ═══════════════════════════════════════════════════
// SVG → GIF & Telegram Emoji Converter — Frontend v2
// ═══════════════════════════════════════════════════

(function () {
    'use strict';

    // ── API Base URL ──
    // Set window.__API_BASE_URL__ in index.html for remote API deployments.
    // Falls back to same-origin (for Docker / local dev).
    const API_BASE = (window.__API_BASE_URL__ || '').replace(/\/+$/, '');

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
            svgPreview.innerHTML = e.target.result;
            svgPreviewArea.classList.add('active');
            autoDetectFromSVG(e.target.result);
        };
        reader.readAsText(file);
    }

    function autoDetectFromSVG(svgText) {
        const durationMatch = svgText.match(/animation:\s*[\w-]+\s+([\d.]+)s/i);
        if (durationMatch) {
            document.getElementById('duration').value = parseFloat(durationMatch[1]);
        }

        const widthMatch = svgText.match(/width="(\d+)"/);
        const heightMatch = svgText.match(/height="(\d+)"/);
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

    // ── Conversion ──
    convertBtn.addEventListener('click', startConversion);

    async function startConversion() {
        if (!selectedFile) return;

        const generateGif = document.getElementById('generateGif').checked;
        const generateWebm = document.getElementById('generateWebm').checked;
        const generateSticker = document.getElementById('generateSticker').checked;

        if (!generateGif && !generateWebm && !generateSticker) {
            showError('Please enable at least one output format.');
            return;
        }

        const gifW = document.getElementById('gifWidth').value;
        const gifH = document.getElementById('gifHeight').value;

        const formData = new FormData();
        formData.append('svg', selectedFile);
        formData.append('gifWidth', gifW);
        formData.append('gifHeight', gifH);
        formData.append('fps', document.getElementById('fps').value);
        formData.append('duration', document.getElementById('duration').value);
        formData.append('telegramSize', document.getElementById('telegramSize').value);
        formData.append('generateGif', generateGif);
        formData.append('generateWebm', generateWebm);
        formData.append('generateSticker', generateSticker);
        formData.append('stickerSourceW', gifW);
        formData.append('stickerSourceH', gifH);

        convertBtn.disabled = true;
        convertBtn.innerHTML = '<span class="btn-icon">⏳</span> Converting...';
        progressSection.classList.add('active');
        resultsSection.classList.remove('active');
        hideError();

        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += Math.random() * 2;
            if (progress > 90) progress = 90;
            progressBar.style.width = progress + '%';

            if (progress < 15) {
                progressText.textContent = 'Launching renderer...';
            } else if (progress < 40) {
                progressText.textContent = 'Capturing animation frames...';
            } else if (progress < 55) {
                progressText.textContent = 'Encoding GIF...';
            } else if (progress < 70) {
                progressText.textContent = 'Encoding Telegram Emoji...';
            } else {
                progressText.textContent = 'Encoding Telegram Sticker...';
            }
        }, 500);

        try {
            const response = await fetchWithRetry(`${API_BASE}/api/convert`, {
                method: 'POST',
                body: formData
            });

            clearInterval(progressInterval);

            if (response.status === 429) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error || 'Server is busy. Please wait and try again.');
            }

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error || 'Conversion failed');
            }

            const data = await response.json();

            progressBar.style.width = '100%';
            progressText.textContent = 'Done! ✨';

            setTimeout(() => {
                progressSection.classList.remove('active');
                showResults(data.results);
            }, 800);

        } catch (err) {
            clearInterval(progressInterval);
            progressSection.classList.remove('active');
            showError(err.message || 'Something went wrong during conversion.');
        } finally {
            convertBtn.disabled = false;
            convertBtn.innerHTML = '<span class="btn-icon">⚡</span> Convert SVG';
        }
    }

    // ── Retry logic ──
    async function fetchWithRetry(url, options, retries = 2) {
        for (let i = 0; i <= retries; i++) {
            try {
                const resp = await fetch(url, options);
                // Don't retry on client errors (4xx) except 429
                if (resp.status >= 400 && resp.status < 500 && resp.status !== 429) {
                    return resp;
                }
                // Retry on 429 and 5xx
                if ((resp.status === 429 || resp.status >= 500) && i < retries) {
                    const delay = Math.pow(2, i) * 1000 + Math.random() * 500;
                    progressText.textContent = `Server busy, retrying in ${Math.round(delay / 1000)}s...`;
                    await new Promise(r => setTimeout(r, delay));
                    continue;
                }
                return resp;
            } catch (err) {
                if (i === retries) throw err;
                const delay = Math.pow(2, i) * 1000;
                progressText.textContent = `Connection error, retrying in ${Math.round(delay / 1000)}s...`;
                await new Promise(r => setTimeout(r, delay));
            }
        }
    }

    // ── Results Display ──
    function showResults(results) {
        resultsGrid.innerHTML = '';

        if (results.gif) {
            const card = document.createElement('div');
            card.className = 'result-card';
            card.innerHTML = `
        <div class="result-preview">
          <img src="${API_BASE}${results.gif.url}" alt="GIF output">
        </div>
        <div class="result-label gif">Animated GIF</div>
        <div class="result-size">${results.gif.size}</div>
        <a href="${API_BASE}${results.gif.url}" download="${results.gif.filename}" class="download-btn gif-btn">
          ⬇ Download GIF
        </a>
      `;
            resultsGrid.appendChild(card);
        }

        if (results.webm) {
            const telegramOk = results.webm.meetsTelegramLimit;
            const card = document.createElement('div');
            card.className = 'result-card';
            card.innerHTML = `
        <div class="result-preview">
          <video src="${API_BASE}${results.webm.url}" autoplay loop muted playsinline></video>
        </div>
        <div class="result-label webm">Telegram Emoji WebM</div>
        <div class="result-size">${results.webm.size}</div>
        <div class="telegram-badge ${telegramOk ? 'pass' : 'fail'}">
          ${telegramOk ? '✓ Within 256 KB limit' : '⚠ Exceeds 256 KB limit'}
        </div>
        <a href="${API_BASE}${results.webm.url}" download="${results.webm.filename}" class="download-btn webm-btn">
          ⬇ Download WebM
        </a>
      `;
            resultsGrid.appendChild(card);
        }

        if (results.sticker) {
            const stickerOk = results.sticker.meetsTelegramLimit;
            const card = document.createElement('div');
            card.className = 'result-card';
            card.innerHTML = `
        <div class="result-preview">
          <video src="${API_BASE}${results.sticker.url}" autoplay loop muted playsinline></video>
        </div>
        <div class="result-label sticker">Telegram Sticker WebM</div>
        <div class="result-size">${results.sticker.size} · ${results.sticker.dimensions}</div>
        <div class="telegram-badge ${stickerOk ? 'pass' : 'fail'}">
          ${stickerOk ? '✓ Within 256 KB limit' : '⚠ Exceeds 256 KB limit'}
        </div>
        <a href="${API_BASE}${results.sticker.url}" download="${results.sticker.filename}" class="download-btn sticker-btn">
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
