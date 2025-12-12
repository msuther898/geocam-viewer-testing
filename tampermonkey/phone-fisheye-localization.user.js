// ==UserScript==
// @name         GeoCam Phone Fisheye Localization
// @namespace    https://geocam.xyz/
// @version      3.0.0
// @description  Localize phone photos within GeoCam panorama views with image overlay and map marker
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

        .pf-input-group input[type="range"] {
            padding: 0;
            height: 6px;
            -webkit-appearance: none;
            background: #ddd;
            border-radius: 3px;
            margin-top: 8px;
        }

        .pf-input-group input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 16px;
            height: 16px;
            background: #4285f4;
            border-radius: 50%;
            cursor: pointer;
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

        .pf-btn-success {
            background: #34a853;
            color: white;
        }

        .pf-btn-success:hover {
            background: #2d8e47;
        }

        .pf-btn-warning {
            background: #ff9800;
            color: white;
        }

        .pf-btn-warning:hover {
            background: #e68900;
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

        .pf-overlay-controls {
            display: none;
            margin-top: 12px;
            padding: 12px;
            background: #f8f9fa;
            border-radius: 8px;
        }

        .pf-overlay-controls.visible {
            display: block;
        }

        .pf-overlay-controls h5 {
            margin: 0 0 10px 0;
            font-size: 12px;
            font-weight: 600;
            color: #333;
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

        .pf-image-overlay {
            position: absolute;
            pointer-events: none;
            border: 3px solid #ff5722;
            border-radius: 4px;
            box-shadow: 0 0 20px rgba(255, 87, 34, 0.5);
            transition: opacity 0.3s ease;
        }

        .pf-image-overlay img {
            width: 100%;
            height: 100%;
            object-fit: fill;
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

        /* Map marker styles */
        .pf-map-marker {
            position: absolute;
            width: 32px;
            height: 32px;
            margin-left: -16px;
            margin-top: -32px;
            cursor: pointer;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
            transition: transform 0.2s ease;
            z-index: 1000;
        }

        .pf-map-marker:hover {
            transform: scale(1.2);
        }

        .pf-map-marker svg {
            width: 100%;
            height: 100%;
        }

        .pf-map-marker-pulse {
            position: absolute;
            width: 40px;
            height: 40px;
            margin-left: -20px;
            margin-top: -20px;
            border-radius: 50%;
            background: rgba(255, 87, 34, 0.3);
            animation: pf-marker-pulse 2s ease-out infinite;
            pointer-events: none;
        }

        @keyframes pf-marker-pulse {
            0% { transform: scale(0.5); opacity: 1; }
            100% { transform: scale(2); opacity: 0; }
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
            .pf-overlay-controls { background: #2a2a2a; }
            .pf-overlay-controls h5 { color: #eee; }
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
        search: `<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
        layers: `<svg viewBox="0 0 24 24"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,
        mapPin: `<svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
        eye: `<svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
        eyeOff: `<svg viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`,
        // Phone marker icon for map
        phoneMarker: `<svg viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 24 16 24s16-12 16-24c0-8.84-7.16-16-16-16z" fill="#ff5722"/>
            <path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 24 16 24s16-12 16-24c0-8.84-7.16-16-16-16z" fill="url(#grad)" opacity="0.3"/>
            <rect x="10" y="6" width="12" height="20" rx="2" fill="white"/>
            <circle cx="16" cy="14" r="3" stroke="#ff5722" stroke-width="1.5" fill="none"/>
            <circle cx="16" cy="22" r="1" fill="#ff5722"/>
            <defs>
                <linearGradient id="grad" x1="16" y1="0" x2="16" y2="40">
                    <stop offset="0%" stop-color="white"/>
                    <stop offset="100%" stop-color="transparent"/>
                </linearGradient>
            </defs>
        </svg>`
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
            if (typeof cv === 'undefined') {
                console.log('[FeatureMatcher] Waiting for OpenCV...');
                await this.waitForOpenCV();
            }

            if (cv.getBuildInformation) {
                console.log('[FeatureMatcher] OpenCV loaded');
                this.cvReady = true;
                this.orb = new cv.ORB(2000);
                this.bf = new cv.BFMatcher(cv.NORM_HAMMING, true);
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
                const checkInterval = setInterval(() => {
                    if (typeof cv !== 'undefined' && cv.getBuildInformation) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100);
                setTimeout(() => {
                    clearInterval(checkInterval);
                    resolve();
                }, 30000);
            });
        }

        imageToMat(img, maxSize = 800) {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
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
            return { mat: cv.matFromImageData(imageData), width, height };
        }

        capturePanoramaView() {
            const canvas = document.querySelector('canvas');
            if (!canvas) throw new Error('No canvas found');

            const width = canvas.width;
            const height = canvas.height;
            const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
            let imageData;

            if (gl) {
                const pixels = new Uint8Array(width * height * 4);
                gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
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
                const ctx = canvas.getContext('2d');
                imageData = ctx.getImageData(0, 0, width, height);
            }

            return { mat: cv.matFromImageData(imageData), width, height, canvas };
        }

        extractFeatures(mat) {
            const gray = new cv.Mat();
            cv.cvtColor(mat, gray, cv.COLOR_RGBA2GRAY);
            const keypoints = new cv.KeyPointVector();
            const descriptors = new cv.Mat();
            this.orb.detectAndCompute(gray, new cv.Mat(), keypoints, descriptors);
            gray.delete();
            return { keypoints, descriptors };
        }

        matchFeatures(desc1, desc2) {
            if (desc1.rows === 0 || desc2.rows === 0) return [];
            const matches = new cv.DMatchVector();
            try {
                this.bf.match(desc1, desc2, matches);
            } catch (e) {
                console.error('[FeatureMatcher] Matching error:', e);
                return [];
            }
            const matchArray = [];
            for (let i = 0; i < matches.size(); i++) {
                matchArray.push(matches.get(i));
            }
            matchArray.sort((a, b) => a.distance - b.distance);
            matches.delete();
            return matchArray;
        }

        filterMatches(matches) {
            if (matches.length < 10) return matches;
            const distances = matches.map(m => m.distance).sort((a, b) => a - b);
            const medianDist = distances[Math.floor(distances.length / 2)];
            return matches.filter(m => m.distance < medianDist * 1.5);
        }

        computeHomography(kp1, kp2, matches) {
            if (matches.length < 4) return null;

            const srcPoints = [], dstPoints = [];
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

            let inliers = 0;
            for (let i = 0; i < mask.rows; i++) {
                if (mask.data[i] > 0) inliers++;
            }

            srcMat.delete();
            dstMat.delete();
            mask.delete();

            return { homography: H, inliers, total: matches.length };
        }

        estimatePoseFromHomography(H, imgWidth, imgHeight, fov) {
            if (!H || H.rows !== 3 || H.cols !== 3) return null;

            const f = imgWidth / (2 * Math.tan(fov * Math.PI / 360));
            const cx = imgWidth / 2, cy = imgHeight / 2;

            const h = [];
            for (let i = 0; i < 9; i++) {
                h.push(H.doubleAt(Math.floor(i / 3), i % 3));
            }

            const centerX = (h[0] * cx + h[1] * cy + h[2]) / (h[6] * cx + h[7] * cy + h[8]);
            const centerY = (h[3] * cx + h[4] * cy + h[5]) / (h[6] * cx + h[7] * cy + h[8]);

            const deltaX = (centerX - cx) / f;
            const deltaY = (centerY - cy) / f;

            return {
                yawOffset: Math.atan(deltaX) * 180 / Math.PI,
                pitchOffset: Math.atan(deltaY) * 180 / Math.PI,
                scale: Math.sqrt(h[0] * h[0] + h[3] * h[3])
            };
        }

        // Warp phone image to panorama coordinates and get bounding box
        warpImageBounds(H, phoneWidth, phoneHeight, panoWidth, panoHeight) {
            // Transform corners of phone image
            const corners = [
                [0, 0], [phoneWidth, 0],
                [phoneWidth, phoneHeight], [0, phoneHeight]
            ];

            const h = [];
            for (let i = 0; i < 9; i++) {
                h.push(H.doubleAt(Math.floor(i / 3), i % 3));
            }

            const transformedCorners = corners.map(([x, y]) => {
                const w = h[6] * x + h[7] * y + h[8];
                return {
                    x: (h[0] * x + h[1] * y + h[2]) / w,
                    y: (h[3] * x + h[4] * y + h[5]) / w
                };
            });

            // Get bounding box
            const xs = transformedCorners.map(p => p.x);
            const ys = transformedCorners.map(p => p.y);

            return {
                minX: Math.min(...xs),
                maxX: Math.max(...xs),
                minY: Math.min(...ys),
                maxY: Math.max(...ys),
                corners: transformedCorners
            };
        }

        drawMatches(img1Mat, kp1, img2Mat, kp2, matches, canvas) {
            const outMat = new cv.Mat();
            const matchVector = new cv.DMatchVector();
            matches.slice(0, Math.min(50, matches.length)).forEach(m => matchVector.push_back(m));
            cv.drawMatches(img1Mat, kp1, img2Mat, kp2, matchVector, outMat);
            cv.imshow(canvas, outMat);
            outMat.delete();
            matchVector.delete();
        }

        cleanup(mats) {
            mats.forEach(m => { if (m && m.delete) m.delete(); });
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
            this.estimatedFov = 70;
            this.isMatching = false;
            this.matcher = new FeatureMatcher();
            this.matchCanvas = null;
            this.lastHomography = null;
            this.lastResult = null;
            this.imageOverlay = null;
            this.mapMarker = null;
            this.overlayOpacity = 0.7;
            this.overlayVisible = true;

            this.init();
        }

        async init() {
            if (typeof GM_addStyle !== 'undefined') {
                GM_addStyle(STYLES);
            } else {
                const style = document.createElement('style');
                style.textContent = STYLES;
                document.head.appendChild(style);
            }

            this.createButton();
            this.createPanel();
            this.createOverlay();

            this.updateCvStatus('loading', 'Loading OpenCV.js...');
            const cvLoaded = await this.matcher.init();
            this.updateCvStatus(
                cvLoaded ? 'ready' : 'error',
                cvLoaded ? 'OpenCV ready' : 'OpenCV failed to load'
            );

            // Listen for view changes to update overlay position
            window.addEventListener('hashchange', () => this.updateOverlayPosition());

            console.log('[PhoneFisheye] Initialized v3.0');
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

                <div class="pf-cv-status loading">Initializing...</div>

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
                </div>

                <button class="pf-btn pf-btn-primary pf-localize-btn" disabled>
                    ${ICONS.search} Match & Overlay
                </button>

                <button class="pf-btn pf-btn-secondary pf-navigate-btn" style="display:none">
                    ${ICONS.navigate} Navigate to Position
                </button>

                <div class="pf-overlay-controls">
                    <h5>${ICONS.layers} Overlay Controls</h5>
                    <div class="pf-input-row">
                        <div class="pf-input-group">
                            <label>Opacity: <span class="opacity-value">70%</span></label>
                            <input type="range" class="pf-opacity" value="70" min="0" max="100" />
                        </div>
                    </div>
                    <button class="pf-btn pf-btn-warning pf-toggle-overlay-btn">
                        ${ICONS.eyeOff} Hide Overlay
                    </button>
                    <button class="pf-btn pf-btn-success pf-add-marker-btn">
                        ${ICONS.mapPin} Add Map Marker
                    </button>
                </div>

                <button class="pf-btn pf-btn-secondary pf-clear-btn" style="display:none">
                    ${ICONS.trash} Clear All
                </button>

                <div class="pf-results">
                    <h4>Localization Results</h4>
                    <div class="pf-results-content"></div>
                </div>

                <div class="pf-match-preview">
                    <canvas class="pf-match-canvas"></canvas>
                    <div class="pf-match-preview-label">Feature matches</div>
                </div>

                <div class="pf-help">
                    ORB features + RANSAC homography<br>Image overlay + map marker
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
            const el = this.panel.querySelector('.pf-cv-status');
            if (el) {
                el.className = `pf-cv-status ${state}`;
                el.textContent = message;
            }
        }

        setupPanelEvents() {
            const dropzone = this.panel.querySelector('.pf-dropzone');
            const fileInput = this.panel.querySelector('.pf-file-input');

            this.panel.querySelector('.pf-close').addEventListener('click', () => this.hidePanel());
            dropzone.addEventListener('click', () => fileInput.click());

            fileInput.addEventListener('change', (e) => {
                if (e.target.files?.[0]) this.handleFile(e.target.files[0]);
            });

            dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
            dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
            dropzone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropzone.classList.remove('dragover');
                if (e.dataTransfer.files?.[0]) this.handleFile(e.dataTransfer.files[0]);
            });

            this.panel.querySelector('.pf-localize-btn').addEventListener('click', () => this.startLocalization());
            this.panel.querySelector('.pf-navigate-btn').addEventListener('click', () => this.navigateToResult());
            this.panel.querySelector('.pf-clear-btn').addEventListener('click', () => this.clearAll());

            this.panel.querySelector('.pf-fov').addEventListener('change', (e) => {
                this.estimatedFov = parseFloat(e.target.value) || 70;
            });

            // Overlay controls
            const opacitySlider = this.panel.querySelector('.pf-opacity');
            opacitySlider.addEventListener('input', (e) => {
                this.overlayOpacity = parseInt(e.target.value) / 100;
                this.panel.querySelector('.opacity-value').textContent = `${e.target.value}%`;
                this.updateOverlayOpacity();
            });

            this.panel.querySelector('.pf-toggle-overlay-btn').addEventListener('click', () => this.toggleOverlay());
            this.panel.querySelector('.pf-add-marker-btn').addEventListener('click', () => this.addMapMarker());
        }

        togglePanel() {
            this.panel.classList.toggle('visible');
            this.button.classList.toggle('active');
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

                previewImg.src = e.target.result;
                preview.classList.add('visible');
                this.panel.querySelector('.pf-dropzone').style.display = 'none';

                this.phoneImage = new Image();
                this.phoneImage.onload = () => {
                    this.panel.querySelector('.filename').textContent = file.name;
                    this.panel.querySelector('.dimensions').textContent =
                        `${this.phoneImage.width}x${this.phoneImage.height}`;
                };
                this.phoneImage.src = e.target.result;
            };
            reader.readAsDataURL(file);

            this.panel.querySelector('.pf-localize-btn').disabled = false;
            this.panel.querySelector('.pf-clear-btn').style.display = 'block';
            this.showStatus('Photo loaded. Click "Match & Overlay" to localize.', 'info');
        }

        clearAll() {
            this.currentFile = null;
            this.phoneImage = null;
            this.lastResult = null;
            this.lastHomography = null;

            // Remove overlay image
            if (this.imageOverlay) {
                this.imageOverlay.remove();
                this.imageOverlay = null;
            }

            // Remove map marker
            if (this.mapMarker) {
                this.mapMarker.remove();
                this.mapMarker = null;
            }

            this.panel.querySelector('.pf-preview').classList.remove('visible');
            this.panel.querySelector('.pf-dropzone').style.display = 'block';
            this.panel.querySelector('.pf-file-input').value = '';
            this.panel.querySelector('.pf-localize-btn').disabled = true;
            this.panel.querySelector('.pf-navigate-btn').style.display = 'none';
            this.panel.querySelector('.pf-clear-btn').style.display = 'none';
            this.panel.querySelector('.pf-results').classList.remove('visible');
            this.panel.querySelector('.pf-match-preview').classList.remove('visible');
            this.panel.querySelector('.pf-overlay-controls').classList.remove('visible');

            this.hideStatus();
            this.hideProgress();
        }

        showStatus(msg, type = 'info') {
            const el = this.panel.querySelector('.pf-status');
            el.textContent = msg;
            el.className = `pf-status visible ${type}`;
        }

        hideStatus() {
            this.panel.querySelector('.pf-status').classList.remove('visible');
        }

        showProgress(pct) {
            this.panel.querySelector('.pf-progress').classList.add('visible');
            this.panel.querySelector('.pf-progress-fill').style.width = `${pct}%`;
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
                this.showStatus('OpenCV not ready', 'error');
                return;
            }

            const btn = this.panel.querySelector('.pf-localize-btn');
            btn.disabled = true;
            this.isMatching = true;

            try {
                this.showStatus('Extracting features...', 'loading');
                this.showProgress(10);
                await this.delay(50);

                const { mat: phoneMat, width: phoneW, height: phoneH } = this.matcher.imageToMat(this.phoneImage);
                const phoneFeatures = this.matcher.extractFeatures(phoneMat);

                if (phoneFeatures.keypoints.size() < 10) {
                    throw new Error('Not enough features in photo');
                }

                this.showProgress(30);
                this.showStatus('Capturing panorama...', 'loading');
                await this.delay(50);

                const { mat: panoMat, width: panoW, height: panoH, canvas: panoCanvas } = this.matcher.capturePanoramaView();
                const panoFeatures = this.matcher.extractFeatures(panoMat);

                this.showProgress(50);
                this.showStatus('Matching features...', 'loading');
                await this.delay(50);

                const matches = this.matcher.matchFeatures(phoneFeatures.descriptors, panoFeatures.descriptors);
                const goodMatches = this.matcher.filterMatches(matches);

                if (goodMatches.length < 8) {
                    throw new Error(`Only ${goodMatches.length} matches. Need 8+.`);
                }

                this.showProgress(70);
                this.showStatus('Computing homography...', 'loading');
                await this.delay(50);

                const homResult = this.matcher.computeHomography(
                    phoneFeatures.keypoints, panoFeatures.keypoints, goodMatches
                );

                if (!homResult || homResult.inliers < 4) {
                    throw new Error('Could not compute homography');
                }

                this.lastHomography = {
                    H: homResult.homography,
                    phoneW, phoneH, panoW, panoH,
                    panoCanvas
                };

                this.showProgress(85);
                this.showStatus('Estimating pose...', 'loading');
                await this.delay(50);

                const pose = this.matcher.estimatePoseFromHomography(
                    homResult.homography, panoW, panoH, this.estimatedFov
                );

                const params = new URLSearchParams(window.location.hash.substring(1));
                const currentFacing = parseFloat(params.get('facing') || '0');
                const currentHorizon = parseFloat(params.get('horizon') || '0');

                this.lastResult = {
                    facing: (currentFacing + pose.yawOffset + 360) % 360,
                    horizon: Math.max(-85, Math.min(85, currentHorizon + pose.pitchOffset)),
                    fov: Math.max(10, Math.min(120, this.estimatedFov / pose.scale)),
                    matches: goodMatches.length,
                    inliers: homResult.inliers,
                    confidence: homResult.inliers / homResult.total
                };

                // Draw match visualization
                this.matcher.drawMatches(phoneMat, phoneFeatures.keypoints,
                    panoMat, panoFeatures.keypoints, goodMatches, this.matchCanvas);
                this.panel.querySelector('.pf-match-preview').classList.add('visible');

                // Create image overlay on panorama
                this.createImageOverlay();

                // Show results and controls
                this.showResults(this.lastResult);
                this.panel.querySelector('.pf-overlay-controls').classList.add('visible');
                this.showStatus('Localization complete!', 'success');
                this.showProgress(100);

                // Cleanup OpenCV mats
                this.matcher.cleanup([phoneMat, panoMat, phoneFeatures.descriptors, panoFeatures.descriptors]);
                phoneFeatures.keypoints.delete();
                panoFeatures.keypoints.delete();

                setTimeout(() => this.hideProgress(), 500);

            } catch (err) {
                console.error('[PhoneFisheye] Error:', err);
                this.showStatus(err.message || 'Localization failed', 'error');
                this.hideProgress();
            } finally {
                btn.disabled = false;
                btn.innerHTML = `${ICONS.search} Match & Overlay`;
                this.isMatching = false;
            }
        }

        createImageOverlay() {
            if (!this.lastHomography || !this.phoneImage) return;

            // Remove existing overlay
            if (this.imageOverlay) {
                this.imageOverlay.remove();
            }

            const { H, phoneW, phoneH, panoW, panoH, panoCanvas } = this.lastHomography;
            const bounds = this.matcher.warpImageBounds(H, phoneW, phoneH, panoW, panoH);

            // Get canvas position on screen
            const canvasRect = panoCanvas.getBoundingClientRect();

            // Scale bounds to screen coordinates
            const scaleX = canvasRect.width / panoW;
            const scaleY = canvasRect.height / panoH;

            const overlayLeft = canvasRect.left + bounds.minX * scaleX;
            const overlayTop = canvasRect.top + bounds.minY * scaleY;
            const overlayWidth = (bounds.maxX - bounds.minX) * scaleX;
            const overlayHeight = (bounds.maxY - bounds.minY) * scaleY;

            // Create overlay element
            this.imageOverlay = document.createElement('div');
            this.imageOverlay.className = 'pf-image-overlay';
            this.imageOverlay.style.cssText = `
                left: ${overlayLeft}px;
                top: ${overlayTop}px;
                width: ${overlayWidth}px;
                height: ${overlayHeight}px;
                opacity: ${this.overlayOpacity};
            `;

            const img = document.createElement('img');
            img.src = this.phoneImage.src;
            this.imageOverlay.appendChild(img);

            this.overlay.appendChild(this.imageOverlay);
            this.overlayVisible = true;
            this.updateToggleButton();
        }

        updateOverlayPosition() {
            // Recalculate overlay position when view changes
            if (this.imageOverlay && this.lastHomography) {
                // For now, just hide overlay when view changes significantly
                // Full implementation would re-render based on new view
            }
        }

        updateOverlayOpacity() {
            if (this.imageOverlay) {
                this.imageOverlay.style.opacity = this.overlayOpacity;
            }
        }

        toggleOverlay() {
            this.overlayVisible = !this.overlayVisible;
            if (this.imageOverlay) {
                this.imageOverlay.style.display = this.overlayVisible ? 'block' : 'none';
            }
            this.updateToggleButton();
        }

        updateToggleButton() {
            const btn = this.panel.querySelector('.pf-toggle-overlay-btn');
            if (this.overlayVisible) {
                btn.innerHTML = `${ICONS.eyeOff} Hide Overlay`;
                btn.className = 'pf-btn pf-btn-warning pf-toggle-overlay-btn';
            } else {
                btn.innerHTML = `${ICONS.eye} Show Overlay`;
                btn.className = 'pf-btn pf-btn-success pf-toggle-overlay-btn';
            }
        }

        addMapMarker() {
            // Find the map element (ArcGIS or other)
            const mapContainer = document.querySelector('geocam-map') ||
                                document.querySelector('.esri-view-root') ||
                                document.querySelector('[class*="map"]') ||
                                document.querySelector('#map');

            if (!mapContainer) {
                this.showStatus('Map not found on page', 'error');
                return;
            }

            // Remove existing marker
            if (this.mapMarker) {
                this.mapMarker.remove();
            }

            // Get current shot position from URL or map center
            const params = new URLSearchParams(window.location.hash.substring(1));
            let center = params.get('center');

            // Try to get map center coordinates
            const mapRect = mapContainer.getBoundingClientRect();
            const centerX = mapRect.left + mapRect.width / 2;
            const centerY = mapRect.top + mapRect.height / 2;

            // Create marker container with pulse effect
            const markerContainer = document.createElement('div');
            markerContainer.style.cssText = `
                position: fixed;
                left: ${centerX}px;
                top: ${centerY}px;
                z-index: 10001;
                pointer-events: auto;
            `;

            // Add pulse effect
            const pulse = document.createElement('div');
            pulse.className = 'pf-map-marker-pulse';
            markerContainer.appendChild(pulse);

            // Add marker icon
            const marker = document.createElement('div');
            marker.className = 'pf-map-marker';
            marker.innerHTML = ICONS.phoneMarker;
            marker.title = `Phone photo location\nFacing: ${this.lastResult?.facing.toFixed(1)}°\nHorizon: ${this.lastResult?.horizon.toFixed(1)}°`;

            marker.addEventListener('click', () => {
                this.navigateToResult();
            });

            markerContainer.appendChild(marker);

            document.body.appendChild(markerContainer);
            this.mapMarker = markerContainer;

            this.showStatus('Phone marker added to map!', 'success');
        }

        showResults(result) {
            const content = this.panel.querySelector('.pf-results-content');
            content.innerHTML = `
                <div class="pf-result-item">
                    <span class="label">Facing</span>
                    <span class="value">${result.facing.toFixed(1)}°</span>
                </div>
                <div class="pf-result-item">
                    <span class="label">Horizon</span>
                    <span class="value">${result.horizon.toFixed(1)}°</span>
                </div>
                <div class="pf-result-item">
                    <span class="label">FOV</span>
                    <span class="value">${result.fov.toFixed(1)}°</span>
                </div>
                <div class="pf-result-item">
                    <span class="label">Matches</span>
                    <span class="value">${result.matches}</span>
                </div>
                <div class="pf-result-item">
                    <span class="label">Inliers</span>
                    <span class="value">${result.inliers} (${(result.confidence * 100).toFixed(0)}%)</span>
                </div>
            `;
            this.panel.querySelector('.pf-results').classList.add('visible');
            this.panel.querySelector('.pf-navigate-btn').style.display = 'block';
        }

        navigateToResult() {
            if (!this.lastResult) return;
            const params = new URLSearchParams(window.location.hash.substring(1));
            params.set('facing', this.lastResult.facing.toFixed(2));
            params.set('horizon', this.lastResult.horizon.toFixed(2));
            window.location.hash = params.toString();
            this.showStatus('Navigated to position', 'success');
        }

        delay(ms) {
            return new Promise(r => setTimeout(r, ms));
        }
    }

    // ============================================
    // INITIALIZE
    // ============================================
    setTimeout(() => {
        if (document.readyState === 'complete') {
            window.phoneFisheyeLocalization = new PhoneFisheyeLocalization();
        } else {
            window.addEventListener('load', () => {
                window.phoneFisheyeLocalization = new PhoneFisheyeLocalization();
            });
        }
    }, 500);

})();
