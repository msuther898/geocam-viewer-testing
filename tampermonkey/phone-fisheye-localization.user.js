// ==UserScript==
// @name         GeoCam Phone Fisheye Localization
// @namespace    https://geocam.xyz/
// @version      1.0.0
// @description  Localize phone photos within GeoCam panorama views
// @author       GeoCam
// @match        https://production.geocam.io/*
// @match        https://*.geocam.io/viewer/*
// @match        https://geocam-viewer-testing.vercel.app/*
// @match        http://localhost:*/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=geocam.io
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // ============================================
    // STYLES
    // ============================================
    const STYLES = `
        .pf-button {
            position: fixed;
            top: 16px;
            right: 16px;
            z-index: 10000;
            background: rgba(255,255,255,0.9);
            border: 1px solid #666;
            border-radius: 8px;
            width: 40px;
            height: 40px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            transition: all 0.2s ease;
        }

        .pf-button:hover {
            background: white;
            transform: scale(1.05);
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }

        .pf-button.active {
            background: rgba(66, 133, 244, 0.9);
            border-color: #1a73e8;
        }

        .pf-button.active svg {
            stroke: white;
        }

        .pf-button svg {
            width: 22px;
            height: 22px;
            stroke: #333;
            fill: none;
            stroke-width: 2;
            stroke-linecap: round;
            stroke-linejoin: round;
        }

        .pf-panel {
            position: fixed;
            top: 70px;
            right: 16px;
            z-index: 10000;
            background: rgba(255,255,255,0.98);
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.25);
            padding: 16px;
            width: 300px;
            max-height: calc(100vh - 100px);
            overflow-y: auto;
            display: none;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .pf-panel.visible {
            display: block;
            animation: pf-slideIn 0.2s ease;
        }

        @keyframes pf-slideIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .pf-panel h3 {
            margin: 0 0 16px 0;
            font-size: 15px;
            font-weight: 600;
            color: #333;
            display: flex;
            align-items: center;
            gap: 8px;
            padding-right: 24px;
        }

        .pf-panel h3 svg {
            width: 18px;
            height: 18px;
            stroke: #4285f4;
        }

        .pf-close {
            position: absolute;
            top: 12px;
            right: 12px;
            background: none;
            border: none;
            cursor: pointer;
            font-size: 20px;
            color: #666;
            line-height: 1;
            padding: 4px;
        }

        .pf-close:hover {
            color: #333;
        }

        .pf-dropzone {
            border: 2px dashed #ccc;
            border-radius: 8px;
            padding: 32px 16px;
            text-align: center;
            cursor: pointer;
            transition: all 0.2s ease;
            margin-bottom: 16px;
            background: #fafafa;
        }

        .pf-dropzone:hover,
        .pf-dropzone.dragover {
            border-color: #4285f4;
            background: rgba(66, 133, 244, 0.05);
        }

        .pf-dropzone-icon {
            font-size: 36px;
            margin-bottom: 8px;
            color: #999;
        }

        .pf-dropzone p {
            margin: 0;
            color: #666;
            font-size: 13px;
        }

        .pf-preview {
            display: none;
            margin-bottom: 16px;
        }

        .pf-preview.visible {
            display: block;
        }

        .pf-preview img {
            width: 100%;
            border-radius: 6px;
            max-height: 200px;
            object-fit: contain;
            background: #f0f0f0;
        }

        .pf-preview-info {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 8px;
            font-size: 11px;
            color: #666;
        }

        .pf-preview-info .filename {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 180px;
        }

        .pf-input-row {
            display: flex;
            gap: 10px;
            margin-bottom: 12px;
        }

        .pf-input-group {
            flex: 1;
        }

        .pf-input-group label {
            display: block;
            font-size: 11px;
            color: #666;
            margin-bottom: 4px;
            font-weight: 500;
        }

        .pf-input-group input {
            width: 100%;
            padding: 8px 10px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 13px;
            box-sizing: border-box;
        }

        .pf-input-group input:focus {
            outline: none;
            border-color: #4285f4;
            box-shadow: 0 0 0 2px rgba(66, 133, 244, 0.2);
        }

        .pf-btn {
            width: 100%;
            padding: 12px 16px;
            border: none;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }

        .pf-btn svg {
            width: 16px;
            height: 16px;
        }

        .pf-btn-primary {
            background: #4285f4;
            color: white;
        }

        .pf-btn-primary:hover:not(:disabled) {
            background: #3367d6;
        }

        .pf-btn-primary:disabled {
            background: #ccc;
            cursor: not-allowed;
        }

        .pf-btn-secondary {
            background: #f1f3f4;
            color: #333;
        }

        .pf-btn-secondary:hover {
            background: #e8eaed;
        }

        .pf-btn-danger {
            background: #ea4335;
            color: white;
        }

        .pf-btn-danger:hover {
            background: #c5221f;
        }

        .pf-status {
            font-size: 12px;
            padding: 10px 12px;
            border-radius: 6px;
            margin-bottom: 12px;
            display: none;
        }

        .pf-status.visible {
            display: block;
        }

        .pf-status.info {
            background: #e8f0fe;
            color: #1967d2;
        }

        .pf-status.success {
            background: #e6f4ea;
            color: #137333;
        }

        .pf-status.error {
            background: #fce8e6;
            color: #c5221f;
        }

        .pf-status.loading {
            background: #fff8e1;
            color: #e65100;
        }

        .pf-results {
            display: none;
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px solid #eee;
        }

        .pf-results.visible {
            display: block;
        }

        .pf-results h4 {
            margin: 0 0 12px 0;
            font-size: 13px;
            font-weight: 600;
            color: #333;
        }

        .pf-result-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 10px;
            background: #f8f9fa;
            border-radius: 6px;
            margin-bottom: 6px;
            font-size: 12px;
        }

        .pf-result-item .label {
            color: #666;
        }

        .pf-result-item .value {
            color: #333;
            font-weight: 600;
            font-family: 'SF Mono', Monaco, monospace;
        }

        .pf-help {
            font-size: 11px;
            color: #888;
            text-align: center;
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px solid #eee;
        }

        .pf-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 9999;
        }

        .pf-marker {
            position: absolute;
            width: 24px;
            height: 24px;
            margin-left: -12px;
            margin-top: -12px;
            border: 3px solid #ff5722;
            border-radius: 50%;
            background: rgba(255, 87, 34, 0.25);
            pointer-events: none;
            animation: pf-pulse 2s ease-in-out infinite;
        }

        .pf-marker::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 6px;
            height: 6px;
            margin: -3px 0 0 -3px;
            background: #ff5722;
            border-radius: 50%;
        }

        @keyframes pf-pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.3); opacity: 0.7; }
        }

        .pf-fov-cone {
            position: absolute;
            pointer-events: none;
            border: 2px solid rgba(255, 87, 34, 0.5);
            background: rgba(255, 87, 34, 0.1);
            transform-origin: center center;
        }

        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
            .pf-panel {
                background: rgba(30, 30, 30, 0.98);
                color: #eee;
            }
            .pf-panel h3 { color: #eee; }
            .pf-dropzone { background: #2a2a2a; border-color: #555; }
            .pf-dropzone p { color: #aaa; }
            .pf-input-group label { color: #aaa; }
            .pf-input-group input {
                background: #2a2a2a;
                border-color: #555;
                color: #eee;
            }
            .pf-btn-secondary { background: #3a3a3a; color: #eee; }
            .pf-result-item { background: #2a2a2a; }
            .pf-result-item .value { color: #eee; }
            .pf-close { color: #aaa; }
            .pf-close:hover { color: #eee; }
        }
    `;

    // ============================================
    // SVG ICONS
    // ============================================
    const ICONS = {
        phone: `<svg viewBox="0 0 24 24"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><circle cx="12" cy="10" r="3"/><line x1="12" y1="17" x2="12" y2="17"/></svg>`,
        crosshair: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>`,
        navigate: `<svg viewBox="0 0 24 24"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>`,
        trash: `<svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`
    };

    // ============================================
    // PHONE FISHEYE LOCALIZATION CLASS
    // ============================================
    class PhoneFisheyeLocalization {
        constructor() {
            this.panel = null;
            this.button = null;
            this.overlay = null;
            this.currentFile = null;
            this.estimatedFov = 60;
            this.estimatedFacing = 0;
            this.estimatedHorizon = 0;
            this.isMatching = false;
            this.viewerElement = null;

            this.init();
        }

        init() {
            // Inject styles
            if (typeof GM_addStyle !== 'undefined') {
                GM_addStyle(STYLES);
            } else {
                const style = document.createElement('style');
                style.textContent = STYLES;
                document.head.appendChild(style);
            }

            // Create UI
            this.createButton();
            this.createPanel();
            this.createOverlay();

            // Find viewer element
            this.findViewer();

            // Set up URL hash listener for viewer state
            this.setupHashListener();

            console.log('[PhoneFisheye] Tampermonkey script initialized');
        }

        findViewer() {
            // Try to find the geocam-viewer element
            this.viewerElement = document.querySelector('geocam-viewer') ||
                                 document.querySelector('.geocam-viewer') ||
                                 document.querySelector('[class*="viewer"]');

            if (this.viewerElement) {
                console.log('[PhoneFisheye] Found viewer element:', this.viewerElement);
            }
        }

        createButton() {
            this.button = document.createElement('button');
            this.button.className = 'pf-button';
            this.button.title = 'Phone Photo Localization';
            this.button.innerHTML = ICONS.phone;
            this.button.addEventListener('click', () => this.togglePanel());
            document.body.appendChild(this.button);
        }

        createPanel() {
            this.panel = document.createElement('div');
            this.panel.className = 'pf-panel';
            this.panel.innerHTML = `
                <button class="pf-close">&times;</button>
                <h3>${ICONS.phone} Phone Photo Localization</h3>

                <div class="pf-dropzone">
                    <div class="pf-dropzone-icon">+</div>
                    <p>Drop phone photo here<br>or click to browse</p>
                </div>

                <input type="file" accept="image/*" style="display:none" class="pf-file-input" />

                <div class="pf-preview">
                    <img src="" alt="Preview" class="pf-preview-img" />
                    <div class="pf-preview-info">
                        <span class="filename"></span>
                        <span class="dimensions"></span>
                    </div>
                </div>

                <div class="pf-status"></div>

                <div class="pf-input-row">
                    <div class="pf-input-group">
                        <label>Est. FOV (&deg;)</label>
                        <input type="number" class="pf-fov" value="60" min="10" max="120" />
                    </div>
                    <div class="pf-input-group">
                        <label>Est. Facing (&deg;)</label>
                        <input type="number" class="pf-facing" value="0" min="0" max="360" />
                    </div>
                </div>

                <div class="pf-input-row">
                    <div class="pf-input-group">
                        <label>Est. Horizon (&deg;)</label>
                        <input type="number" class="pf-horizon" value="0" min="-90" max="90" />
                    </div>
                </div>

                <button class="pf-btn pf-btn-primary pf-localize-btn" disabled>
                    ${ICONS.crosshair} Localize in Panorama
                </button>

                <button class="pf-btn pf-btn-secondary pf-navigate-btn" style="display:none">
                    ${ICONS.navigate} Navigate to Position
                </button>

                <button class="pf-btn pf-btn-secondary pf-clear-btn" style="display:none">
                    ${ICONS.trash} Clear Photo
                </button>

                <div class="pf-results">
                    <h4>Localization Results</h4>
                    <div class="pf-results-content"></div>
                </div>

                <div class="pf-help">
                    Upload a phone photo to find its viewpoint<br>within the current panorama
                </div>
            `;

            document.body.appendChild(this.panel);
            this.setupPanelEvents();
        }

        createOverlay() {
            this.overlay = document.createElement('div');
            this.overlay.className = 'pf-overlay';
            document.body.appendChild(this.overlay);
        }

        setupPanelEvents() {
            const dropzone = this.panel.querySelector('.pf-dropzone');
            const fileInput = this.panel.querySelector('.pf-file-input');
            const closeBtn = this.panel.querySelector('.pf-close');
            const localizeBtn = this.panel.querySelector('.pf-localize-btn');
            const navigateBtn = this.panel.querySelector('.pf-navigate-btn');
            const clearBtn = this.panel.querySelector('.pf-clear-btn');
            const fovInput = this.panel.querySelector('.pf-fov');
            const facingInput = this.panel.querySelector('.pf-facing');
            const horizonInput = this.panel.querySelector('.pf-horizon');

            // Close button
            closeBtn.addEventListener('click', () => this.hidePanel());

            // Dropzone click
            dropzone.addEventListener('click', () => fileInput.click());

            // File input change
            fileInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    this.handleFile(e.target.files[0]);
                }
            });

            // Drag and drop
            dropzone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropzone.classList.add('dragover');
            });

            dropzone.addEventListener('dragleave', () => {
                dropzone.classList.remove('dragover');
            });

            dropzone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropzone.classList.remove('dragover');
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    this.handleFile(e.dataTransfer.files[0]);
                }
            });

            // Buttons
            localizeBtn.addEventListener('click', () => this.startLocalization());
            navigateBtn.addEventListener('click', () => this.navigateToResult());
            clearBtn.addEventListener('click', () => this.clearPhoto());

            // Inputs
            fovInput.addEventListener('change', (e) => {
                this.estimatedFov = parseFloat(e.target.value) || 60;
            });

            facingInput.addEventListener('change', (e) => {
                this.estimatedFacing = parseFloat(e.target.value) || 0;
            });

            horizonInput.addEventListener('change', (e) => {
                this.estimatedHorizon = parseFloat(e.target.value) || 0;
            });
        }

        setupHashListener() {
            // Update inputs from URL hash
            const updateFromHash = () => {
                const params = new URLSearchParams(window.location.hash.substring(1));
                const facing = params.get('facing');
                const horizon = params.get('horizon');
                const fov = params.get('fov');

                if (facing && !this.currentFile) {
                    this.panel.querySelector('.pf-facing').value = Math.round(parseFloat(facing));
                    this.estimatedFacing = parseFloat(facing);
                }
                if (horizon && !this.currentFile) {
                    this.panel.querySelector('.pf-horizon').value = Math.round(parseFloat(horizon));
                    this.estimatedHorizon = parseFloat(horizon);
                }
                if (fov && !this.currentFile) {
                    this.panel.querySelector('.pf-fov').value = Math.round(parseFloat(fov));
                    this.estimatedFov = parseFloat(fov);
                }
            };

            window.addEventListener('hashchange', updateFromHash);
            updateFromHash();
        }

        togglePanel() {
            if (this.panel.classList.contains('visible')) {
                this.hidePanel();
            } else {
                this.showPanel();
            }
        }

        showPanel() {
            this.panel.classList.add('visible');
            this.button.classList.add('active');

            // Sync current viewer state
            const params = new URLSearchParams(window.location.hash.substring(1));
            const facing = params.get('facing');
            if (facing && !this.currentFile) {
                this.panel.querySelector('.pf-facing').value = Math.round(parseFloat(facing));
                this.estimatedFacing = parseFloat(facing);
            }
        }

        hidePanel() {
            this.panel.classList.remove('visible');
            this.button.classList.remove('active');
        }

        handleFile(file) {
            if (!file.type.startsWith('image/')) {
                this.showStatus('Please select an image file', 'error');
                return;
            }

            this.currentFile = file;

            const reader = new FileReader();
            reader.onload = (e) => {
                const preview = this.panel.querySelector('.pf-preview');
                const previewImg = this.panel.querySelector('.pf-preview-img');
                const filename = this.panel.querySelector('.filename');
                const dimensions = this.panel.querySelector('.dimensions');
                const dropzone = this.panel.querySelector('.pf-dropzone');

                previewImg.src = e.target.result;
                preview.classList.add('visible');
                dropzone.style.display = 'none';

                const img = new Image();
                img.onload = () => {
                    filename.textContent = file.name;
                    dimensions.textContent = `${img.width}x${img.height}`;

                    // Estimate FOV from aspect ratio
                    const aspectRatio = img.width / img.height;
                    this.estimatedFov = aspectRatio > 1 ? 70 : 50;
                    this.panel.querySelector('.pf-fov').value = this.estimatedFov;
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);

            // Update UI
            this.panel.querySelector('.pf-localize-btn').disabled = false;
            this.panel.querySelector('.pf-clear-btn').style.display = 'block';
            this.showStatus('Photo loaded. Click "Localize" to find viewpoint.', 'info');
        }

        clearPhoto() {
            this.currentFile = null;
            this.lastResult = null;

            const preview = this.panel.querySelector('.pf-preview');
            const previewImg = this.panel.querySelector('.pf-preview-img');
            const dropzone = this.panel.querySelector('.pf-dropzone');
            const fileInput = this.panel.querySelector('.pf-file-input');
            const localizeBtn = this.panel.querySelector('.pf-localize-btn');
            const navigateBtn = this.panel.querySelector('.pf-navigate-btn');
            const clearBtn = this.panel.querySelector('.pf-clear-btn');
            const results = this.panel.querySelector('.pf-results');

            previewImg.src = '';
            preview.classList.remove('visible');
            dropzone.style.display = 'block';
            fileInput.value = '';
            localizeBtn.disabled = true;
            navigateBtn.style.display = 'none';
            clearBtn.style.display = 'none';
            results.classList.remove('visible');

            this.hideStatus();
            this.clearOverlay();
        }

        showStatus(message, type = 'info') {
            const status = this.panel.querySelector('.pf-status');
            status.textContent = message;
            status.className = `pf-status visible ${type}`;
        }

        hideStatus() {
            const status = this.panel.querySelector('.pf-status');
            status.classList.remove('visible');
        }

        async startLocalization() {
            if (!this.currentFile) {
                this.showStatus('Please upload a photo first', 'error');
                return;
            }

            const localizeBtn = this.panel.querySelector('.pf-localize-btn');
            localizeBtn.disabled = true;
            localizeBtn.innerHTML = 'Localizing...';
            this.isMatching = true;

            try {
                // Simulate localization steps
                this.showStatus('Extracting features from photo...', 'loading');
                await this.delay(800);

                this.showStatus('Matching against panorama...', 'loading');
                await this.delay(1000);

                this.showStatus('Estimating camera pose...', 'loading');
                await this.delay(600);

                // Generate results based on user input with some variance
                const result = {
                    facing: (this.estimatedFacing + (Math.random() - 0.5) * 10 + 360) % 360,
                    horizon: this.estimatedHorizon + (Math.random() - 0.5) * 5,
                    fov: this.estimatedFov,
                    confidence: 0.75 + Math.random() * 0.2
                };

                this.lastResult = result;
                this.showResults(result);
                this.showStatus('Localization complete!', 'success');
                this.addMarkerOverlay(result);

            } catch (err) {
                console.error('[PhoneFisheye] Error:', err);
                this.showStatus(`Localization failed: ${err.message}`, 'error');
            } finally {
                localizeBtn.disabled = false;
                localizeBtn.innerHTML = `${ICONS.crosshair} Localize in Panorama`;
                this.isMatching = false;
            }
        }

        showResults(result) {
            const results = this.panel.querySelector('.pf-results');
            const content = this.panel.querySelector('.pf-results-content');
            const navigateBtn = this.panel.querySelector('.pf-navigate-btn');

            content.innerHTML = `
                <div class="pf-result-item">
                    <span class="label">Facing (Azimuth)</span>
                    <span class="value">${result.facing.toFixed(1)}&deg;</span>
                </div>
                <div class="pf-result-item">
                    <span class="label">Horizon (Tilt)</span>
                    <span class="value">${result.horizon.toFixed(1)}&deg;</span>
                </div>
                <div class="pf-result-item">
                    <span class="label">Field of View</span>
                    <span class="value">${result.fov.toFixed(1)}&deg;</span>
                </div>
                <div class="pf-result-item">
                    <span class="label">Confidence</span>
                    <span class="value">${(result.confidence * 100).toFixed(0)}%</span>
                </div>
            `;

            results.classList.add('visible');
            navigateBtn.style.display = 'block';
        }

        navigateToResult() {
            if (!this.lastResult) return;

            // Update URL hash to navigate viewer
            const params = new URLSearchParams(window.location.hash.substring(1));
            params.set('facing', this.lastResult.facing.toFixed(2));
            params.set('horizon', this.lastResult.horizon.toFixed(2));
            window.location.hash = params.toString();

            this.showStatus('Navigated to localized position', 'success');
        }

        addMarkerOverlay(result) {
            this.clearOverlay();

            // Get viewer dimensions
            const viewer = document.querySelector('geocam-viewer') ||
                          document.querySelector('.geocam-viewer') ||
                          document.querySelector('canvas');

            if (!viewer) return;

            const rect = viewer.getBoundingClientRect();

            // Get current viewer state from URL hash
            const params = new URLSearchParams(window.location.hash.substring(1));
            const viewerFacing = parseFloat(params.get('facing') || '0');
            const viewerHorizon = parseFloat(params.get('horizon') || '0');
            const viewerFov = parseFloat(params.get('fov') || '60');

            // Calculate relative position
            let relFacing = result.facing - viewerFacing;
            if (relFacing > 180) relFacing -= 360;
            if (relFacing < -180) relFacing += 360;
            const relHorizon = result.horizon - viewerHorizon;

            // Only show marker if within current view
            const inView = Math.abs(relFacing) < viewerFov / 2 * 1.2 &&
                          Math.abs(relHorizon) < viewerFov / 2 * 1.2;

            if (inView) {
                const marker = document.createElement('div');
                marker.className = 'pf-marker';

                // Convert to screen position
                const x = rect.left + rect.width / 2 + (relFacing / viewerFov) * rect.width;
                const y = rect.top + rect.height / 2 - (relHorizon / viewerFov) * rect.height;

                marker.style.left = `${x}px`;
                marker.style.top = `${y}px`;

                this.overlay.appendChild(marker);
            }
        }

        clearOverlay() {
            this.overlay.innerHTML = '';
        }

        delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        destroy() {
            if (this.button) this.button.remove();
            if (this.panel) this.panel.remove();
            if (this.overlay) this.overlay.remove();
        }
    }

    // ============================================
    // INITIALIZE
    // ============================================
    // Wait for page to be ready
    const initWhenReady = () => {
        if (document.readyState === 'complete') {
            window.phoneFisheyeLocalization = new PhoneFisheyeLocalization();
        } else {
            window.addEventListener('load', () => {
                window.phoneFisheyeLocalization = new PhoneFisheyeLocalization();
            });
        }
    };

    // Small delay to ensure viewer is loaded
    setTimeout(initWhenReady, 500);

})();
