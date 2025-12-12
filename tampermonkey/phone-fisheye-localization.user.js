// ==UserScript==
// @name         GeoCam Phone Fisheye Localization
// @namespace    https://geocam.xyz/
// @version      2.0.0
// @description  Localize phone photos within GeoCam panorama views using OpenCV feature matching
// @author       GeoCam
// @match        https://production.geocam.io/*
// @match        https://*.geocam.io/viewer/*
// @match        https://geocam-viewer-testing.vercel.app/*
// @match        http://localhost:*/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=geocam.io
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @require      https://docs.opencv.org/4.8.0/opencv.js
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
            width: 320px;
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
            max-height: 180px;
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

        .pf-input-group input, .pf-input-group select {
            width: 100%;
            padding: 8px 10px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 13px;
            box-sizing: border-box;
        }

        .pf-input-group input:focus, .pf-input-group select:focus {
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

        .pf-progress {
            display: none;
            margin-bottom: 12px;
        }

        .pf-progress.visible {
            display: block;
        }

        .pf-progress-bar {
            height: 4px;
            background: #e0e0e0;
            border-radius: 2px;
            overflow: hidden;
        }

        .pf-progress-fill {
            height: 100%;
            background: #4285f4;
            transition: width 0.3s ease;
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

        .pf-match-preview {
            display: none;
            margin-top: 12px;
        }

        .pf-match-preview.visible {
            display: block;
        }

        .pf-match-preview canvas {
            width: 100%;
            border-radius: 6px;
            background: #000;
        }

        .pf-match-preview-label {
            font-size: 11px;
            color: #666;
            margin-top: 4px;
            text-align: center;
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

        .pf-match-point {
            position: absolute;
            width: 8px;
            height: 8px;
            margin-left: -4px;
            margin-top: -4px;
            background: #00ff00;
            border: 1px solid #006600;
            border-radius: 50%;
            pointer-events: none;
        }

        @keyframes pf-pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.3); opacity: 0.7; }
        }

        .pf-cv-status {
            font-size: 10px;
            color: #999;
            text-align: center;
            padding: 4px;
            background: #f5f5f5;
            border-radius: 4px;
            margin-bottom: 12px;
        }

        .pf-cv-status.ready {
            background: #e6f4ea;
            color: #137333;
        }

        .pf-cv-status.loading {
            background: #fff8e1;
            color: #e65100;
        }

        .pf-cv-status.error {
            background: #fce8e6;
            color: #c5221f;
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
            .pf-input-group input, .pf-input-group select {
                background: #2a2a2a;
                border-color: #555;
                color: #eee;
            }
            .pf-btn-secondary { background: #3a3a3a; color: #eee; }
            .pf-result-item { background: #2a2a2a; }
            .pf-result-item .value { color: #eee; }
            .pf-close { color: #aaa; }
            .pf-close:hover { color: #eee; }
            .pf-cv-status { background: #2a2a2a; color: #aaa; }
        }
    `;

    // ============================================
    // SVG ICONS
    // ============================================
    const ICONS = {
        phone: `<svg viewBox="0 0 24 24"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><circle cx="12" cy="10" r="3"/><line x1="12" y1="17" x2="12" y2="17"/></svg>`,
        crosshair: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>`,
        navigate: `<svg viewBox="0 0 24 24"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>`,
        trash: `<svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
        search: `<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`
    };

    // ============================================
    // OPENCV FEATURE MATCHER CLASS
    // ============================================
    class FeatureMatcher {
        constructor() {
            this.cvReady = false;
            this.orb = null;
            this.bf = null;
        }

        async init() {
            // Wait for OpenCV to be ready
            if (typeof cv === 'undefined') {
                console.log('[FeatureMatcher] Waiting for OpenCV...');
                await this.waitForOpenCV();
            }

            if (cv.getBuildInformation) {
                console.log('[FeatureMatcher] OpenCV loaded');
                this.cvReady = true;

                // Initialize ORB detector and BFMatcher
                this.orb = new cv.ORB(2000); // Max 2000 features
                this.bf = new cv.BFMatcher(cv.NORM_HAMMING, true); // Cross-check enabled

                return true;
            }
            return false;
        }

        waitForOpenCV() {
            return new Promise((resolve) => {
                if (typeof cv !== 'undefined' && cv.getBuildInformation) {
                    resolve();
                    return;
                }

                // Check periodically
                const checkInterval = setInterval(() => {
                    if (typeof cv !== 'undefined' && cv.getBuildInformation) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100);

                // Timeout after 30 seconds
                setTimeout(() => {
                    clearInterval(checkInterval);
                    resolve();
                }, 30000);
            });
        }

        // Convert image element to cv.Mat
        imageToMat(img) {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // Scale down large images for performance
            const maxSize = 800;
            let width = img.naturalWidth || img.width;
            let height = img.naturalHeight || img.height;

            if (width > maxSize || height > maxSize) {
                const scale = maxSize / Math.max(width, height);
                width = Math.round(width * scale);
                height = Math.round(height * scale);
            }

            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);

            const imageData = ctx.getImageData(0, 0, width, height);
            const mat = cv.matFromImageData(imageData);
            return mat;
        }

        // Capture current panorama view from canvas
        capturePanoramaView() {
            const canvas = document.querySelector('canvas');
            if (!canvas) {
                throw new Error('No canvas found for panorama capture');
            }

            const width = canvas.width;
            const height = canvas.height;

            // Get image data from WebGL canvas
            const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
            let imageData;

            if (gl) {
                // WebGL canvas - need to read pixels
                const pixels = new Uint8Array(width * height * 4);
                gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

                // Flip vertically (WebGL has origin at bottom-left)
                const flipped = new Uint8Array(width * height * 4);
                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                        const srcIdx = (y * width + x) * 4;
                        const dstIdx = ((height - 1 - y) * width + x) * 4;
                        flipped[dstIdx] = pixels[srcIdx];
                        flipped[dstIdx + 1] = pixels[srcIdx + 1];
                        flipped[dstIdx + 2] = pixels[srcIdx + 2];
                        flipped[dstIdx + 3] = pixels[srcIdx + 3];
                    }
                }

                imageData = new ImageData(new Uint8ClampedArray(flipped.buffer), width, height);
            } else {
                // 2D canvas
                const ctx = canvas.getContext('2d');
                imageData = ctx.getImageData(0, 0, width, height);
            }

            const mat = cv.matFromImageData(imageData);
            return { mat, width, height };
        }

        // Extract ORB features from a grayscale image
        extractFeatures(mat) {
            const gray = new cv.Mat();
            cv.cvtColor(mat, gray, cv.COLOR_RGBA2GRAY);

            const keypoints = new cv.KeyPointVector();
            const descriptors = new cv.Mat();

            this.orb.detectAndCompute(gray, new cv.Mat(), keypoints, descriptors);

            gray.delete();

            return { keypoints, descriptors };
        }

        // Match features between two images
        matchFeatures(desc1, desc2) {
            if (desc1.rows === 0 || desc2.rows === 0) {
                return [];
            }

            const matches = new cv.DMatchVector();

            try {
                this.bf.match(desc1, desc2, matches);
            } catch (e) {
                console.error('[FeatureMatcher] Matching error:', e);
                return [];
            }

            // Convert to array and sort by distance
            const matchArray = [];
            for (let i = 0; i < matches.size(); i++) {
                matchArray.push(matches.get(i));
            }

            matchArray.sort((a, b) => a.distance - b.distance);

            matches.delete();

            return matchArray;
        }

        // Filter matches using Lowe's ratio test (adapted for cross-check)
        filterMatches(matches, ratio = 0.75) {
            if (matches.length < 10) return matches;

            // With cross-check, use distance threshold instead
            const distances = matches.map(m => m.distance);
            const medianDist = distances.sort((a, b) => a - b)[Math.floor(distances.length / 2)];
            const threshold = medianDist * 1.5;

            return matches.filter(m => m.distance < threshold);
        }

        // Compute homography from matches
        computeHomography(kp1, kp2, matches) {
            if (matches.length < 4) {
                return null;
            }

            const srcPoints = [];
            const dstPoints = [];

            for (const match of matches) {
                const pt1 = kp1.get(match.queryIdx).pt;
                const pt2 = kp2.get(match.trainIdx).pt;
                srcPoints.push(pt1.x, pt1.y);
                dstPoints.push(pt2.x, pt2.y);
            }

            const srcMat = cv.matFromArray(matches.length, 1, cv.CV_32FC2, srcPoints);
            const dstMat = cv.matFromArray(matches.length, 1, cv.CV_32FC2, dstPoints);

            const mask = new cv.Mat();
            const H = cv.findHomography(srcMat, dstMat, cv.RANSAC, 5.0, mask);

            // Count inliers
            let inliers = 0;
            for (let i = 0; i < mask.rows; i++) {
                if (mask.data[i] > 0) inliers++;
            }

            srcMat.delete();
            dstMat.delete();
            mask.delete();

            return { homography: H, inliers, total: matches.length };
        }

        // Estimate pose from homography
        // This extracts rotation and translation from homography matrix
        estimatePoseFromHomography(H, imgWidth, imgHeight, fov) {
            if (!H || H.rows !== 3 || H.cols !== 3) {
                return null;
            }

            // Approximate camera intrinsics
            const f = imgWidth / (2 * Math.tan(fov * Math.PI / 360));
            const cx = imgWidth / 2;
            const cy = imgHeight / 2;

            // Get homography elements
            const h = [];
            for (let i = 0; i < 9; i++) {
                h.push(H.doubleAt(Math.floor(i / 3), i % 3));
            }

            // Decompose homography to get rotation
            // Simplified approach: extract rotation from homography
            // H = K * R * K^-1 approximately for small translations

            // Calculate center offset in normalized coordinates
            const centerX = (h[0] * cx + h[1] * cy + h[2]) / (h[6] * cx + h[7] * cy + h[8]);
            const centerY = (h[3] * cx + h[4] * cy + h[5]) / (h[6] * cx + h[7] * cy + h[8]);

            // Convert to angular offset
            const deltaX = (centerX - cx) / f;
            const deltaY = (centerY - cy) / f;

            // Convert to degrees
            const yawOffset = Math.atan(deltaX) * 180 / Math.PI;
            const pitchOffset = Math.atan(deltaY) * 180 / Math.PI;

            // Estimate scale/zoom factor
            const scale = Math.sqrt(h[0] * h[0] + h[3] * h[3]);

            return {
                yawOffset,
                pitchOffset,
                scale
            };
        }

        // Draw matches on a canvas
        drawMatches(img1Mat, kp1, img2Mat, kp2, matches, canvas) {
            const outMat = new cv.Mat();

            // Convert keypoint vectors if needed
            const matchVector = new cv.DMatchVector();
            const goodMatches = matches.slice(0, Math.min(50, matches.length));
            goodMatches.forEach(m => matchVector.push_back(m));

            cv.drawMatches(img1Mat, kp1, img2Mat, kp2, matchVector, outMat);

            cv.imshow(canvas, outMat);

            outMat.delete();
            matchVector.delete();
        }

        cleanup(mats) {
            mats.forEach(m => {
                if (m && m.delete) m.delete();
            });
        }
    }

    // ============================================
    // PHONE FISHEYE LOCALIZATION CLASS
    // ============================================
    class PhoneFisheyeLocalization {
        constructor() {
            this.panel = null;
            this.button = null;
            this.overlay = null;
            this.currentFile = null;
            this.phoneImage = null;
            this.estimatedFov = 60;
            this.estimatedFacing = 0;
            this.estimatedHorizon = 0;
            this.isMatching = false;
            this.viewerElement = null;
            this.matcher = new FeatureMatcher();
            this.matchCanvas = null;
            this.searchRadius = 30; // degrees to search around initial estimate

            this.init();
        }

        async init() {
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

            // Set up URL hash listener
            this.setupHashListener();

            // Initialize OpenCV
            this.updateCvStatus('loading', 'Loading OpenCV.js...');
            const cvLoaded = await this.matcher.init();
            if (cvLoaded) {
                this.updateCvStatus('ready', 'OpenCV ready - ORB feature matching enabled');
            } else {
                this.updateCvStatus('error', 'OpenCV failed to load - using fallback mode');
            }

            console.log('[PhoneFisheye] Initialized with OpenCV:', cvLoaded);
        }

        findViewer() {
            this.viewerElement = document.querySelector('geocam-viewer') ||
                                 document.querySelector('.geocam-viewer') ||
                                 document.querySelector('[class*="viewer"]');
        }

        createButton() {
            this.button = document.createElement('button');
            this.button.className = 'pf-button';
            this.button.title = 'Phone Photo Localization (OpenCV)';
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

                <div class="pf-cv-status loading">Initializing OpenCV...</div>

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

                <div class="pf-progress">
                    <div class="pf-progress-bar">
                        <div class="pf-progress-fill" style="width: 0%"></div>
                    </div>
                </div>

                <div class="pf-input-row">
                    <div class="pf-input-group">
                        <label>Phone FOV (&deg;)</label>
                        <input type="number" class="pf-fov" value="70" min="30" max="120" />
                    </div>
                    <div class="pf-input-group">
                        <label>Search Radius (&deg;)</label>
                        <input type="number" class="pf-search-radius" value="30" min="5" max="90" />
                    </div>
                </div>

                <div class="pf-input-row">
                    <div class="pf-input-group">
                        <label>Initial Facing (&deg;)</label>
                        <input type="number" class="pf-facing" value="0" min="0" max="360" />
                    </div>
                    <div class="pf-input-group">
                        <label>Initial Horizon (&deg;)</label>
                        <input type="number" class="pf-horizon" value="0" min="-90" max="90" />
                    </div>
                </div>

                <button class="pf-btn pf-btn-primary pf-localize-btn" disabled>
                    ${ICONS.search} Match Features
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

                <div class="pf-match-preview">
                    <canvas class="pf-match-canvas"></canvas>
                    <div class="pf-match-preview-label">Feature matches (green lines)</div>
                </div>

                <div class="pf-help">
                    Uses ORB feature detection + RANSAC<br>for robust image matching
                </div>
            `;

            document.body.appendChild(this.panel);
            this.matchCanvas = this.panel.querySelector('.pf-match-canvas');
            this.setupPanelEvents();
        }

        createOverlay() {
            this.overlay = document.createElement('div');
            this.overlay.className = 'pf-overlay';
            document.body.appendChild(this.overlay);
        }

        updateCvStatus(state, message) {
            const statusEl = this.panel.querySelector('.pf-cv-status');
            if (statusEl) {
                statusEl.className = `pf-cv-status ${state}`;
                statusEl.textContent = message;
            }
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
            const searchRadiusInput = this.panel.querySelector('.pf-search-radius');

            closeBtn.addEventListener('click', () => this.hidePanel());
            dropzone.addEventListener('click', () => fileInput.click());

            fileInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    this.handleFile(e.target.files[0]);
                }
            });

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

            localizeBtn.addEventListener('click', () => this.startLocalization());
            navigateBtn.addEventListener('click', () => this.navigateToResult());
            clearBtn.addEventListener('click', () => this.clearPhoto());

            fovInput.addEventListener('change', (e) => {
                this.estimatedFov = parseFloat(e.target.value) || 70;
            });

            facingInput.addEventListener('change', (e) => {
                this.estimatedFacing = parseFloat(e.target.value) || 0;
            });

            horizonInput.addEventListener('change', (e) => {
                this.estimatedHorizon = parseFloat(e.target.value) || 0;
            });

            searchRadiusInput.addEventListener('change', (e) => {
                this.searchRadius = parseFloat(e.target.value) || 30;
            });
        }

        setupHashListener() {
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

                // Store image for processing
                this.phoneImage = new Image();
                this.phoneImage.onload = () => {
                    filename.textContent = file.name;
                    dimensions.textContent = `${this.phoneImage.width}x${this.phoneImage.height}`;

                    // Estimate FOV from aspect ratio
                    const aspectRatio = this.phoneImage.width / this.phoneImage.height;
                    this.estimatedFov = aspectRatio > 1 ? 70 : 55;
                    this.panel.querySelector('.pf-fov').value = this.estimatedFov;
                };
                this.phoneImage.src = e.target.result;
            };
            reader.readAsDataURL(file);

            this.panel.querySelector('.pf-localize-btn').disabled = false;
            this.panel.querySelector('.pf-clear-btn').style.display = 'block';
            this.showStatus('Photo loaded. Click "Match Features" to localize.', 'info');
        }

        clearPhoto() {
            this.currentFile = null;
            this.phoneImage = null;
            this.lastResult = null;

            const preview = this.panel.querySelector('.pf-preview');
            const dropzone = this.panel.querySelector('.pf-dropzone');
            const fileInput = this.panel.querySelector('.pf-file-input');
            const localizeBtn = this.panel.querySelector('.pf-localize-btn');
            const navigateBtn = this.panel.querySelector('.pf-navigate-btn');
            const clearBtn = this.panel.querySelector('.pf-clear-btn');
            const results = this.panel.querySelector('.pf-results');
            const matchPreview = this.panel.querySelector('.pf-match-preview');

            preview.classList.remove('visible');
            dropzone.style.display = 'block';
            fileInput.value = '';
            localizeBtn.disabled = true;
            navigateBtn.style.display = 'none';
            clearBtn.style.display = 'none';
            results.classList.remove('visible');
            matchPreview.classList.remove('visible');

            this.hideStatus();
            this.hideProgress();
            this.clearOverlay();
        }

        showStatus(message, type = 'info') {
            const status = this.panel.querySelector('.pf-status');
            status.textContent = message;
            status.className = `pf-status visible ${type}`;
        }

        hideStatus() {
            this.panel.querySelector('.pf-status').classList.remove('visible');
        }

        showProgress(percent) {
            const progress = this.panel.querySelector('.pf-progress');
            const fill = this.panel.querySelector('.pf-progress-fill');
            progress.classList.add('visible');
            fill.style.width = `${percent}%`;
        }

        hideProgress() {
            this.panel.querySelector('.pf-progress').classList.remove('visible');
        }

        async startLocalization() {
            if (!this.currentFile || !this.phoneImage) {
                this.showStatus('Please upload a photo first', 'error');
                return;
            }

            if (!this.matcher.cvReady) {
                this.showStatus('OpenCV not loaded. Please wait or refresh.', 'error');
                return;
            }

            const localizeBtn = this.panel.querySelector('.pf-localize-btn');
            localizeBtn.disabled = true;
            this.isMatching = true;

            try {
                // Step 1: Extract features from phone image
                this.showStatus('Extracting features from phone photo...', 'loading');
                this.showProgress(10);
                await this.delay(50);

                const phoneMat = this.matcher.imageToMat(this.phoneImage);
                const phoneFeatures = this.matcher.extractFeatures(phoneMat);

                console.log(`[PhoneFisheye] Phone image: ${phoneFeatures.keypoints.size()} keypoints`);

                if (phoneFeatures.keypoints.size() < 10) {
                    throw new Error('Not enough features in phone photo. Try a more textured image.');
                }

                this.showProgress(30);

                // Step 2: Capture current panorama view
                this.showStatus('Capturing panorama view...', 'loading');
                await this.delay(50);

                const { mat: panoMat, width: panoWidth, height: panoHeight } = this.matcher.capturePanoramaView();
                const panoFeatures = this.matcher.extractFeatures(panoMat);

                console.log(`[PhoneFisheye] Panorama view: ${panoFeatures.keypoints.size()} keypoints`);

                this.showProgress(50);

                // Step 3: Match features
                this.showStatus('Matching features...', 'loading');
                await this.delay(50);

                const matches = this.matcher.matchFeatures(
                    phoneFeatures.descriptors,
                    panoFeatures.descriptors
                );

                console.log(`[PhoneFisheye] Raw matches: ${matches.length}`);

                // Filter matches
                const goodMatches = this.matcher.filterMatches(matches);
                console.log(`[PhoneFisheye] Filtered matches: ${goodMatches.length}`);

                this.showProgress(70);

                if (goodMatches.length < 8) {
                    throw new Error(`Only ${goodMatches.length} matches found. Need at least 8. Try adjusting view.`);
                }

                // Step 4: Compute homography
                this.showStatus('Computing homography...', 'loading');
                await this.delay(50);

                const homographyResult = this.matcher.computeHomography(
                    phoneFeatures.keypoints,
                    panoFeatures.keypoints,
                    goodMatches
                );

                this.showProgress(85);

                if (!homographyResult || homographyResult.inliers < 4) {
                    throw new Error('Could not compute valid homography. Try different view.');
                }

                console.log(`[PhoneFisheye] Homography: ${homographyResult.inliers}/${homographyResult.total} inliers`);

                // Step 5: Estimate pose
                this.showStatus('Estimating camera pose...', 'loading');
                await this.delay(50);

                const pose = this.matcher.estimatePoseFromHomography(
                    homographyResult.homography,
                    panoWidth,
                    panoHeight,
                    this.estimatedFov
                );

                this.showProgress(95);

                // Get current viewer state
                const params = new URLSearchParams(window.location.hash.substring(1));
                const currentFacing = parseFloat(params.get('facing') || '0');
                const currentHorizon = parseFloat(params.get('horizon') || '0');

                // Calculate final pose
                const result = {
                    facing: (currentFacing + pose.yawOffset + 360) % 360,
                    horizon: currentHorizon + pose.pitchOffset,
                    fov: this.estimatedFov / pose.scale,
                    matches: goodMatches.length,
                    inliers: homographyResult.inliers,
                    confidence: homographyResult.inliers / homographyResult.total
                };

                // Clamp values
                result.horizon = Math.max(-85, Math.min(85, result.horizon));
                result.fov = Math.max(10, Math.min(120, result.fov));

                this.lastResult = result;

                // Draw matches
                this.matcher.drawMatches(
                    phoneMat, phoneFeatures.keypoints,
                    panoMat, panoFeatures.keypoints,
                    goodMatches,
                    this.matchCanvas
                );
                this.panel.querySelector('.pf-match-preview').classList.add('visible');

                // Show results
                this.showResults(result);
                this.showStatus('Localization complete!', 'success');
                this.showProgress(100);

                // Cleanup
                this.matcher.cleanup([
                    phoneMat, panoMat,
                    phoneFeatures.descriptors, panoFeatures.descriptors,
                    homographyResult.homography
                ]);
                phoneFeatures.keypoints.delete();
                panoFeatures.keypoints.delete();

                setTimeout(() => this.hideProgress(), 500);

            } catch (err) {
                console.error('[PhoneFisheye] Error:', err);
                this.showStatus(err.message || 'Localization failed', 'error');
                this.hideProgress();
            } finally {
                localizeBtn.disabled = false;
                localizeBtn.innerHTML = `${ICONS.search} Match Features`;
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
                    <span class="label">Est. FOV</span>
                    <span class="value">${result.fov.toFixed(1)}&deg;</span>
                </div>
                <div class="pf-result-item">
                    <span class="label">Feature Matches</span>
                    <span class="value">${result.matches}</span>
                </div>
                <div class="pf-result-item">
                    <span class="label">RANSAC Inliers</span>
                    <span class="value">${result.inliers} (${(result.confidence * 100).toFixed(0)}%)</span>
                </div>
            `;

            results.classList.add('visible');
            navigateBtn.style.display = 'block';
        }

        navigateToResult() {
            if (!this.lastResult) return;

            const params = new URLSearchParams(window.location.hash.substring(1));
            params.set('facing', this.lastResult.facing.toFixed(2));
            params.set('horizon', this.lastResult.horizon.toFixed(2));
            window.location.hash = params.toString();

            this.showStatus('Navigated to matched position', 'success');
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
    const initWhenReady = () => {
        if (document.readyState === 'complete') {
            window.phoneFisheyeLocalization = new PhoneFisheyeLocalization();
        } else {
            window.addEventListener('load', () => {
                window.phoneFisheyeLocalization = new PhoneFisheyeLocalization();
            });
        }
    };

    setTimeout(initWhenReady, 500);

})();
