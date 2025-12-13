// ==UserScript==
// @name         GeoCam Phone Fisheye Localization
// @namespace    https://geocam.xyz/
// @version      8.6.0
// @description  Add thorough search mode and cancel button
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

        /* MatchAnything-style visualization */
        .pf-keypoint-canvas {
            position: absolute;
            top: 0;
            left: 0;
            pointer-events: none;
            z-index: 9998;
        }

        .pf-match-stats {
            position: fixed;
            top: 70px;
            left: 16px;
            background: rgba(0,0,0,0.8);
            color: #fff;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            font-family: monospace;
            z-index: 10002;
            display: none;
        }

        .pf-match-stats.visible {
            display: block;
        }

        .pf-match-stats .match-count {
            color: #4caf50;
            font-weight: bold;
        }

        .pf-match-stats .inlier-count {
            color: #ff9800;
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

        /* Match lines canvas for showing correspondences */
        .pf-match-lines-canvas {
            position: fixed;
            top: 0;
            left: 0;
            pointer-events: none;
            z-index: 9997;
        }

        /* Phone preview with keypoints */
        .pf-phone-keypoints-overlay {
            position: absolute;
            top: 0;
            left: 0;
            pointer-events: none;
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

        /* Detailed Search Results Panel */
        .pf-detailed-results {
            display: none;
            margin-top: 12px;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            background: #fafafa;
            max-height: 400px;
            overflow: hidden;
        }

        .pf-detailed-results.visible {
            display: block;
        }

        .pf-detailed-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 12px;
            background: #f0f0f0;
            cursor: pointer;
            font-size: 12px;
            font-weight: 600;
            border-bottom: 1px solid #e0e0e0;
        }

        .pf-detailed-header:hover {
            background: #e8e8e8;
        }

        .pf-detailed-toggle {
            font-size: 10px;
            color: #666;
        }

        .pf-detailed-summary {
            display: flex;
            gap: 12px;
            padding: 8px 12px;
            font-size: 11px;
            border-bottom: 1px solid #e0e0e0;
            background: #fff;
            flex-wrap: wrap;
        }

        .pf-summary-stat {
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .pf-summary-stat .stat-icon {
            width: 14px;
            height: 14px;
        }

        .pf-summary-stat.success { color: #4caf50; }
        .pf-summary-stat.warning { color: #ff9800; }
        .pf-summary-stat.error { color: #f44336; }
        .pf-summary-stat.info { color: #2196f3; }

        .pf-detailed-content {
            max-height: 300px;
            overflow-y: auto;
            display: none;
        }

        .pf-detailed-content.expanded {
            display: block;
        }

        .pf-shot-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 6px 12px;
            border-bottom: 1px solid #f0f0f0;
            font-size: 10px;
            gap: 8px;
        }

        .pf-shot-row:hover {
            background: #f5f5f5;
        }

        .pf-shot-row.match {
            background: #e8f5e9;
        }

        .pf-shot-row.rejected {
            background: #fff8e1;
        }

        .pf-shot-row.failed {
            background: #ffebee;
        }

        .pf-shot-id {
            font-weight: 600;
            min-width: 70px;
        }

        .pf-shot-status {
            min-width: 60px;
        }

        .pf-shot-status.matched {
            color: #4caf50;
            font-weight: 600;
        }

        .pf-shot-status.rejected {
            color: #ff9800;
        }

        .pf-shot-status.failed {
            color: #f44336;
        }

        .pf-shot-metrics {
            display: flex;
            gap: 8px;
            flex: 1;
            justify-content: flex-end;
        }

        .pf-shot-metric {
            padding: 2px 6px;
            background: #f0f0f0;
            border-radius: 3px;
            font-size: 9px;
        }

        .pf-shot-metric.clip { background: #e3f2fd; color: #1976d2; }
        .pf-shot-metric.orb { background: #e8f5e9; color: #388e3c; }
        .pf-shot-metric.inliers { background: #fff3e0; color: #f57c00; }

        .pf-shot-reason {
            font-size: 9px;
            color: #888;
            max-width: 120px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
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
            this.akaze = null;
            this.bf = null;
            this.bfAkaze = null;
            this.useAkaze = true; // AKAZE is better for cross-domain matching
        }

        async init() {
            if (typeof cv === 'undefined') {
                console.log('[FeatureMatcher] Waiting for OpenCV...');
                await this.waitForOpenCV();
            }

            if (cv.getBuildInformation) {
                console.log('[FeatureMatcher] OpenCV loaded');
                this.cvReady = true;

                // ORB: Cranked up to 10000 features for more matches
                this.orb = new cv.ORB(10000);
                this.bf = new cv.BFMatcher(cv.NORM_HAMMING, false);

                // AKAZE: Better for cross-domain matching (like MegaLoc uses)
                // More robust to illumination and viewpoint changes
                try {
                    this.akaze = new cv.AKAZE();
                    this.bfAkaze = new cv.BFMatcher(cv.NORM_HAMMING, false);
                    console.log('[FeatureMatcher] AKAZE initialized');
                } catch (e) {
                    console.warn('[FeatureMatcher] AKAZE not available, using ORB only');
                    this.useAkaze = false;
                }

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

        // Load a panorama image from URL
        async loadPanoImage(shotId, cellId) {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => resolve(img);
                img.onerror = () => reject(new Error(`Failed to load shot ${shotId}`));
                // GeoCam pano URL format - need to find the correct calibration/source
                // For now, we'll capture from the viewer canvas when navigating
                img.src = `https://manager.geocam.xyz/shot/${shotId}/pano.jpg`;
            });
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

        extractFeatures(mat, forceOrb = false) {
            const gray = new cv.Mat();
            cv.cvtColor(mat, gray, cv.COLOR_RGBA2GRAY);
            const keypoints = new cv.KeyPointVector();
            const descriptors = new cv.Mat();

            // Use AKAZE for better cross-domain matching when available
            if (this.useAkaze && this.akaze && !forceOrb) {
                try {
                    this.akaze.detectAndCompute(gray, new cv.Mat(), keypoints, descriptors);
                    console.log(`[FeatureMatcher] AKAZE: ${keypoints.size()} keypoints`);
                } catch (e) {
                    console.warn('[FeatureMatcher] AKAZE failed, falling back to ORB');
                    this.orb.detectAndCompute(gray, new cv.Mat(), keypoints, descriptors);
                }
            } else {
                this.orb.detectAndCompute(gray, new cv.Mat(), keypoints, descriptors);
                console.log(`[FeatureMatcher] ORB: ${keypoints.size()} keypoints`);
            }

            gray.delete();
            return { keypoints, descriptors, method: this.useAkaze ? 'AKAZE' : 'ORB' };
        }

        // Extract features at multiple scales for better matching
        extractMultiScaleFeatures(mat) {
            const allKeypoints = [];
            const allDescriptors = [];
            const scales = [1.0, 0.75, 0.5];

            for (const scale of scales) {
                let scaledMat = mat;
                if (scale !== 1.0) {
                    scaledMat = new cv.Mat();
                    const newSize = new cv.Size(Math.round(mat.cols * scale), Math.round(mat.rows * scale));
                    cv.resize(mat, scaledMat, newSize);
                }

                const { keypoints, descriptors } = this.extractFeatures(scaledMat);

                // Scale keypoint coordinates back
                for (let i = 0; i < keypoints.size(); i++) {
                    const kp = keypoints.get(i);
                    allKeypoints.push({
                        x: kp.pt.x / scale,
                        y: kp.pt.y / scale,
                        size: kp.size / scale,
                        angle: kp.angle,
                        response: kp.response,
                        scale: scale
                    });
                }

                // Copy descriptors
                if (descriptors.rows > 0) {
                    for (let i = 0; i < descriptors.rows; i++) {
                        const row = [];
                        for (let j = 0; j < descriptors.cols; j++) {
                            row.push(descriptors.ucharAt(i, j));
                        }
                        allDescriptors.push(row);
                    }
                }

                if (scale !== 1.0) scaledMat.delete();
                keypoints.delete();
                descriptors.delete();
            }

            // Convert back to OpenCV format
            const kpVector = new cv.KeyPointVector();
            for (const kp of allKeypoints) {
                kpVector.push_back(new cv.KeyPoint(kp.x, kp.y, kp.size, kp.angle, kp.response));
            }

            const descMat = new cv.Mat(allDescriptors.length, allDescriptors[0]?.length || 32, cv.CV_8U);
            for (let i = 0; i < allDescriptors.length; i++) {
                for (let j = 0; j < allDescriptors[i].length; j++) {
                    descMat.ucharPtr(i, j)[0] = allDescriptors[i][j];
                }
            }

            console.log(`[FeatureMatcher] Multi-scale: ${kpVector.size()} total keypoints`);
            return { keypoints: kpVector, descriptors: descMat };
        }

        matchFeatures(desc1, desc2) {
            if (desc1.rows === 0 || desc2.rows === 0) return [];

            try {
                // Use knnMatch with k=2 for Lowe's ratio test
                const knnMatches = new cv.DMatchVectorVector();
                this.bf.knnMatch(desc1, desc2, knnMatches, 2);

                const goodMatches = [];
                const ratioThresh = 0.85; // Lowe's ratio (relaxed for more matches)

                for (let i = 0; i < knnMatches.size(); i++) {
                    const matchPair = knnMatches.get(i);
                    if (matchPair.size() >= 2) {
                        const m = matchPair.get(0);
                        const n = matchPair.get(1);
                        // Apply ratio test
                        if (m.distance < ratioThresh * n.distance) {
                            goodMatches.push(m);
                        }
                    } else if (matchPair.size() === 1) {
                        // Only one match found, keep if distance is low
                        const m = matchPair.get(0);
                        if (m.distance < 50) {
                            goodMatches.push(m);
                        }
                    }
                }

                knnMatches.delete();
                goodMatches.sort((a, b) => a.distance - b.distance);
                return goodMatches;
            } catch (e) {
                console.error('[FeatureMatcher] Matching error:', e);
                return [];
            }
        }

        filterMatches(matches) {
            // Already filtered by ratio test, just apply distance threshold
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

        // Extract matched keypoint coordinates for custom visualization
        getMatchedPoints(kp1, kp2, matches) {
            const points = [];
            for (const match of matches) {
                const pt1 = kp1.get(match.queryIdx).pt;
                const pt2 = kp2.get(match.trainIdx).pt;
                points.push({
                    phone: { x: pt1.x, y: pt1.y },
                    pano: { x: pt2.x, y: pt2.y },
                    distance: match.distance
                });
            }
            return points;
        }

        // Get inlier mask from RANSAC
        computeHomographyWithMask(kp1, kp2, matches) {
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

            // Extract inlier indices
            const inlierIndices = [];
            for (let i = 0; i < mask.rows; i++) {
                if (mask.data[i] > 0) {
                    inlierIndices.push(i);
                }
            }

            srcMat.delete();
            dstMat.delete();

            return {
                homography: H,
                inlierIndices,
                inliers: inlierIndices.length,
                total: matches.length,
                mask
            };
        }

        cleanup(mats) {
            mats.forEach(m => { if (m && m.delete) m.delete(); });
        }

        // Convert homography to CSS matrix3d for proper perspective warp
        homographyToMatrix3d(H, srcWidth, srcHeight, dstWidth, dstHeight, canvasRect) {
            if (!H || H.rows !== 3 || H.cols !== 3) return null;

            const h = [];
            for (let i = 0; i < 9; i++) {
                h.push(H.doubleAt(Math.floor(i / 3), i % 3));
            }

            // Scale factors for canvas to screen
            const scaleX = canvasRect.width / dstWidth;
            const scaleY = canvasRect.height / dstHeight;

            // Transform the 4 corners to get the perspective quad
            const corners = [
                { x: 0, y: 0 },
                { x: srcWidth, y: 0 },
                { x: srcWidth, y: srcHeight },
                { x: 0, y: srcHeight }
            ];

            const transformed = corners.map(pt => {
                const w = h[6] * pt.x + h[7] * pt.y + h[8];
                return {
                    x: ((h[0] * pt.x + h[1] * pt.y + h[2]) / w) * scaleX,
                    y: ((h[3] * pt.x + h[4] * pt.y + h[5]) / w) * scaleY
                };
            });

            return transformed;
        }

        // Estimate camera pose from homography (rotation and translation direction)
        decomposePose(H, fov, imgWidth, imgHeight) {
            if (!H || H.rows !== 3 || H.cols !== 3) return null;

            const h = [];
            for (let i = 0; i < 9; i++) {
                h.push(H.doubleAt(Math.floor(i / 3), i % 3));
            }

            // Focal length from FOV
            const f = imgWidth / (2 * Math.tan(fov * Math.PI / 360));

            // Build camera matrix K
            const cx = imgWidth / 2;
            const cy = imgHeight / 2;

            // Normalize homography by K^-1 * H * K
            // For simplicity, extract rotation angles from homography
            const scale = Math.sqrt(h[0] * h[0] + h[3] * h[3]);

            // Rotation angles (approximate)
            const yaw = Math.atan2(h[2] - cx * h[8], f * h[8]) * 180 / Math.PI;
            const pitch = Math.atan2(h[5] - cy * h[8], f * h[8]) * 180 / Math.PI;
            const roll = Math.atan2(h[3], h[0]) * 180 / Math.PI;

            return {
                yaw,
                pitch,
                roll,
                scale,
                // Translation direction (unit vector)
                tx: h[2] / (f * scale),
                ty: h[5] / (f * scale),
                tz: 1.0
            };
        }
    }

    // ============================================
    // EMBEDDING CACHE - IndexedDB storage for CLIP embeddings
    // ============================================
    class EmbeddingCache {
        constructor() {
            this.dbName = 'GeoCamEmbeddingCache';
            this.dbVersion = 1;
            this.storeName = 'embeddings';
            this.db = null;
        }

        async open() {
            if (this.db) return this.db;

            return new Promise((resolve, reject) => {
                const request = indexedDB.open(this.dbName, this.dbVersion);

                request.onerror = () => {
                    console.error('[EmbeddingCache] Failed to open database');
                    reject(request.error);
                };

                request.onsuccess = () => {
                    this.db = request.result;
                    console.log('[EmbeddingCache] Database opened');
                    resolve(this.db);
                };

                request.onupgradeneeded = (event) => {
                    const db = event.target.result;

                    // Create embeddings store with indexes
                    if (!db.objectStoreNames.contains(this.storeName)) {
                        const store = db.createObjectStore(this.storeName, { keyPath: 'key' });
                        store.createIndex('cellId', 'cellId', { unique: false });
                        store.createIndex('shotId', 'shotId', { unique: false });
                        store.createIndex('timestamp', 'timestamp', { unique: false });
                        console.log('[EmbeddingCache] Object store created');
                    }
                };
            });
        }

        // Generate cache key: cellId_shotId_fov (fov rounded to nearest 10)
        makeKey(cellId, shotId, fov = 80) {
            const roundedFov = Math.round(fov / 10) * 10;
            return `${cellId}_${shotId}_${roundedFov}`;
        }

        async get(cellId, shotId, fov = 80) {
            await this.open();
            const key = this.makeKey(cellId, shotId, fov);

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.storeName], 'readonly');
                const store = transaction.objectStore(this.storeName);
                const request = store.get(key);

                request.onsuccess = () => {
                    if (request.result) {
                        // Return the embedding array
                        resolve(request.result.embedding);
                    } else {
                        resolve(null);
                    }
                };

                request.onerror = () => {
                    console.warn('[EmbeddingCache] Get error:', request.error);
                    resolve(null);
                };
            });
        }

        async set(cellId, shotId, fov, embedding) {
            await this.open();
            const key = this.makeKey(cellId, shotId, fov);

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);

                const record = {
                    key,
                    cellId,
                    shotId,
                    fov: Math.round(fov / 10) * 10,
                    embedding,
                    timestamp: Date.now()
                };

                const request = store.put(record);

                request.onsuccess = () => resolve(true);
                request.onerror = () => {
                    console.warn('[EmbeddingCache] Set error:', request.error);
                    resolve(false);
                };
            });
        }

        // Get multiple embeddings at once
        async getMany(cellId, shotIds, fov = 80) {
            await this.open();
            const results = new Map();

            return new Promise((resolve) => {
                const transaction = this.db.transaction([this.storeName], 'readonly');
                const store = transaction.objectStore(this.storeName);
                let pending = shotIds.length;

                if (pending === 0) {
                    resolve(results);
                    return;
                }

                for (const shotId of shotIds) {
                    const key = this.makeKey(cellId, shotId, fov);
                    const request = store.get(key);

                    request.onsuccess = () => {
                        if (request.result) {
                            results.set(shotId, request.result.embedding);
                        }
                        pending--;
                        if (pending === 0) resolve(results);
                    };

                    request.onerror = () => {
                        pending--;
                        if (pending === 0) resolve(results);
                    };
                }
            });
        }

        // Get cache stats for a cell
        async getStats(cellId) {
            await this.open();

            return new Promise((resolve) => {
                const transaction = this.db.transaction([this.storeName], 'readonly');
                const store = transaction.objectStore(this.storeName);
                const index = store.index('cellId');
                const request = index.count(IDBKeyRange.only(cellId));

                request.onsuccess = () => resolve(request.result);
                request.onerror = () => resolve(0);
            });
        }

        // Clear cache for a specific cell
        async clearCell(cellId) {
            await this.open();

            return new Promise((resolve) => {
                const transaction = this.db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                const index = store.index('cellId');
                const request = index.openCursor(IDBKeyRange.only(cellId));

                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        store.delete(cursor.primaryKey);
                        cursor.continue();
                    } else {
                        console.log(`[EmbeddingCache] Cleared cache for cell ${cellId}`);
                        resolve(true);
                    }
                };

                request.onerror = () => resolve(false);
            });
        }

        // Clear all cached embeddings
        async clearAll() {
            await this.open();

            return new Promise((resolve) => {
                const transaction = this.db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                const request = store.clear();

                request.onsuccess = () => {
                    console.log('[EmbeddingCache] All cache cleared');
                    resolve(true);
                };
                request.onerror = () => resolve(false);
            });
        }
    }

    // ============================================
    // VISION EMBEDDER - DINOv2 patch-level features
    // ============================================
    class VisionEmbedder {
        constructor() {
            this.ready = false;
            this.loading = false;
            this.extractor = null;
            this.transformers = null;
            this.cache = new EmbeddingCache();
            this.modelName = 'Xenova/dinov2-small'; // DINOv2 for better local feature matching
        }

        // Dynamically load Transformers.js library using ES module import
        async loadTransformersLibrary() {
            if (this.transformers) return this.transformers;

            console.log('[VisionEmbedder] Loading Transformers.js via dynamic import...');

            try {
                // Use dynamic import() for ES modules
                this.transformers = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.1');

                console.log('[VisionEmbedder] ✓ Transformers.js loaded via import()');
                console.log('[VisionEmbedder] Exports:', Object.keys(this.transformers).slice(0, 15));

                return this.transformers;
            } catch (err) {
                console.error('[VisionEmbedder] Dynamic import failed:', err.message);

                // Fallback: try loading via blob URL workaround
                console.log('[VisionEmbedder] Trying blob URL workaround...');
                try {
                    const response = await fetch('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.1/dist/transformers.min.js');
                    const code = await response.text();

                    const blob = new Blob([code], { type: 'application/javascript' });
                    const blobUrl = URL.createObjectURL(blob);

                    this.transformers = await import(blobUrl);
                    URL.revokeObjectURL(blobUrl);

                    console.log('[VisionEmbedder] ✓ Loaded via blob URL');
                    return this.transformers;
                } catch (err2) {
                    console.error('[VisionEmbedder] Blob URL fallback failed:', err2.message);
                    throw new Error('Failed to load Transformers.js: ' + err.message);
                }
            }
        }

        async initialize() {
            if (this.ready || this.loading) return this.ready;
            this.loading = true;

            try {
                // First load the library
                await this.loadTransformersLibrary();

                console.log('[VisionEmbedder] Loading DINOv2 model...');
                console.log('[VisionEmbedder] Model:', this.modelName);

                const { pipeline } = this.transformers;

                if (!pipeline) {
                    throw new Error('pipeline not found in transformers exports');
                }

                // Use image-feature-extraction pipeline for DINOv2
                console.log('[VisionEmbedder] Creating feature extraction pipeline...');
                this.extractor = await pipeline('image-feature-extraction', this.modelName, {
                    quantized: true // Use quantized for faster loading
                });

                console.log('[VisionEmbedder] ✓ DINOv2 pipeline created');

                this.ready = true;
                console.log('[VisionEmbedder] ✓ DINOv2 fully initialized');
                return true;
            } catch (err) {
                console.error('[VisionEmbedder] ❌ Failed to load DINOv2:', err.message);
                console.error('[VisionEmbedder] Full error:', err);
                this.ready = false;
                return false;
            } finally {
                this.loading = false;
            }
        }

        // Convert image element or canvas to embedding
        async getEmbedding(imageSource) {
            if (!this.ready) {
                throw new Error('Vision model not initialized');
            }

            try {
                // Convert to canvas if needed
                let canvas;
                if (imageSource instanceof HTMLCanvasElement) {
                    canvas = imageSource;
                } else if (imageSource instanceof HTMLImageElement) {
                    canvas = document.createElement('canvas');
                    canvas.width = imageSource.naturalWidth || imageSource.width;
                    canvas.height = imageSource.naturalHeight || imageSource.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(imageSource, 0, 0);
                } else {
                    throw new Error('Invalid image source');
                }

                // Convert canvas to data URL for pipeline
                const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

                // Run DINOv2 feature extraction
                // Returns tensor of shape [1, num_patches + 1, hidden_dim]
                // First token is [CLS], rest are patch tokens
                const output = await this.extractor(dataUrl, { pooling: 'none' });

                // Output is a Tensor - get the data
                const features = output.tolist()[0]; // [num_patches + 1, hidden_dim]

                // Use [CLS] token (first token) as global embedding
                const clsEmbedding = features[0];

                // Normalize the embedding
                const norm = Math.sqrt(clsEmbedding.reduce((sum, v) => sum + v * v, 0));
                const normalizedEmbedding = clsEmbedding.map(v => v / norm);

                return normalizedEmbedding;
            } catch (err) {
                console.error('[VisionEmbedder] Embedding error:', err);
                throw err;
            }
        }

        // Get patch-level embeddings for more detailed matching
        async getPatchEmbeddings(imageSource) {
            if (!this.ready) {
                throw new Error('Vision model not initialized');
            }

            try {
                let canvas;
                if (imageSource instanceof HTMLCanvasElement) {
                    canvas = imageSource;
                } else if (imageSource instanceof HTMLImageElement) {
                    canvas = document.createElement('canvas');
                    canvas.width = imageSource.naturalWidth || imageSource.width;
                    canvas.height = imageSource.naturalHeight || imageSource.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(imageSource, 0, 0);
                } else {
                    throw new Error('Invalid image source');
                }

                const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                const output = await this.extractor(dataUrl, { pooling: 'none' });
                const features = output.tolist()[0];

                // Return both CLS token and patch tokens
                const clsToken = features[0];
                const patchTokens = features.slice(1); // All patches except CLS

                // Normalize all embeddings
                const normalize = (emb) => {
                    const norm = Math.sqrt(emb.reduce((sum, v) => sum + v * v, 0));
                    return emb.map(v => v / norm);
                };

                return {
                    cls: normalize(clsToken),
                    patches: patchTokens.map(normalize),
                    numPatches: patchTokens.length
                };
            } catch (err) {
                console.error('[VisionEmbedder] Patch embedding error:', err);
                throw err;
            }
        }

        // Compute cosine similarity between two embeddings
        cosineSimilarity(emb1, emb2) {
            let dot = 0;
            for (let i = 0; i < emb1.length; i++) {
                dot += emb1[i] * emb2[i];
            }
            return dot; // Already normalized, so dot product = cosine similarity
        }

        // Compute patch-level similarity (best matching patches)
        patchSimilarity(patches1, patches2, topK = 10) {
            // For each patch in image1, find best match in image2
            let totalSim = 0;
            let matchCount = 0;

            for (const p1 of patches1) {
                let bestSim = -1;
                for (const p2 of patches2) {
                    const sim = this.cosineSimilarity(p1, p2);
                    if (sim > bestSim) bestSim = sim;
                }
                if (bestSim > 0.5) { // Only count good matches
                    totalSim += bestSim;
                    matchCount++;
                }
            }

            // Return average similarity of matching patches
            return matchCount > 0 ? totalSim / matchCount : 0;
        }

        // Capture current panorama view as canvas
        capturePanoCanvas() {
            const canvas = document.querySelector('canvas');
            if (!canvas) return null;

            const captureCanvas = document.createElement('canvas');
            const width = Math.min(canvas.width, 512); // Resize for speed
            const height = Math.min(canvas.height, 512);
            captureCanvas.width = width;
            captureCanvas.height = height;

            const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
            if (gl) {
                const pixels = new Uint8Array(canvas.width * canvas.height * 4);
                gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

                // Flip and resize
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = canvas.width;
                tempCanvas.height = canvas.height;
                const tempCtx = tempCanvas.getContext('2d');
                const imageData = tempCtx.createImageData(canvas.width, canvas.height);

                for (let y = 0; y < canvas.height; y++) {
                    for (let x = 0; x < canvas.width; x++) {
                        const srcIdx = (y * canvas.width + x) * 4;
                        const dstIdx = ((canvas.height - 1 - y) * canvas.width + x) * 4;
                        imageData.data[dstIdx] = pixels[srcIdx];
                        imageData.data[dstIdx + 1] = pixels[srcIdx + 1];
                        imageData.data[dstIdx + 2] = pixels[srcIdx + 2];
                        imageData.data[dstIdx + 3] = pixels[srcIdx + 3];
                    }
                }
                tempCtx.putImageData(imageData, 0, 0);

                // Resize to target
                const ctx = captureCanvas.getContext('2d');
                ctx.drawImage(tempCanvas, 0, 0, width, height);
            } else {
                const ctx = captureCanvas.getContext('2d');
                ctx.drawImage(canvas, 0, 0, width, height);
            }

            return captureCanvas;
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
            this.embedder = new VisionEmbedder(); // Add vision embedder
            this.matchCanvas = null;
            this.lastHomography = null;
            this.lastResult = null;
            this.imageOverlay = null;
            this.mapMarker = null;
            this.overlayOpacity = 0.7;
            this.overlayVisible = true;

            // New: MatchAnything-style visualization
            this.keypointCanvas = null;
            this.matchedPoints = null;
            this.inlierIndices = null;
            this.matchStatsEl = null;
            this.showKeypoints = true;
            this.showMatchLines = true;
            this.matchLinesCanvas = null;

            // SPHERICAL COORDINATE STORAGE for view-invariant keypoints
            this.sphericalKeypoints = null; // Array of {azimuth, elevation, isInlier}
            this.currentViewParams = null; // {facing, horizon, fov}

            // New: ArcGIS integration
            this.arcgisGraphicsLayer = null;
            this.arcgisMapView = null;
            this.shotCoordinates = null;

            // View tracking for dynamic overlay
            this.panoCanvas = null;
            this.viewObserver = null;

            // Multi-view matching
            this.neighborShots = [];
            this.allShotData = null;
            this.cellId = null;
            this.bestMatchView = null;
            this.multiViewResults = []; // Results from matching against multiple views

            // Phone position estimation
            this.estimatedPhonePosition = null;
            this.estimatedDistance = 10; // Default distance estimate in meters

            // Perspective warp - using spherical corners
            this.warpedCorners = null;
            this.sphericalCorners = null; // Corners in spherical coords for view updates

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
            this.createKeypointCanvas();
            this.createMatchStats();
            this.createMatchLinesCanvas();

            this.updateCvStatus('loading', 'Loading OpenCV.js...');
            const cvLoaded = await this.matcher.init();
            this.updateCvStatus(
                cvLoaded ? 'ready' : 'error',
                cvLoaded ? 'OpenCV ready' : 'OpenCV failed to load'
            );

            // Listen for view changes to update overlay and keypoints
            window.addEventListener('hashchange', () => this.onViewChange());
            window.addEventListener('resize', () => this.onViewChange());

            // Set up canvas mutation observer for view changes
            this.setupViewObserver();

            // Try to get shot coordinates from URL
            this.fetchShotCoordinates();

            console.log('[PhoneFisheye] Initialized v7.0 - FOV cone, rays, match lines, 10K features');
        }

        createKeypointCanvas() {
            this.keypointCanvas = document.createElement('canvas');
            this.keypointCanvas.className = 'pf-keypoint-canvas';
            this.keypointCanvas.style.display = 'none';
            document.body.appendChild(this.keypointCanvas);
        }

        createMatchStats() {
            this.matchStatsEl = document.createElement('div');
            this.matchStatsEl.className = 'pf-match-stats';
            this.matchStatsEl.innerHTML = `
                Matches: <span class="match-count">0</span> |
                Inliers: <span class="inlier-count">0</span>
            `;
            document.body.appendChild(this.matchStatsEl);
        }

        createMatchLinesCanvas() {
            this.matchLinesCanvas = document.createElement('canvas');
            this.matchLinesCanvas.className = 'pf-match-lines-canvas';
            this.matchLinesCanvas.style.display = 'none';
            document.body.appendChild(this.matchLinesCanvas);
        }

        // Draw lines connecting matched keypoints from phone preview to pano
        drawMatchLines() {
            if (!this.matchLinesCanvas || !this.matchedPoints || !this.sphericalKeypoints) return;

            const panoCanvas = document.querySelector('canvas');
            const phonePreview = this.panel?.querySelector('.pf-preview-img');
            if (!panoCanvas || !phonePreview) return;

            const panoRect = panoCanvas.getBoundingClientRect();
            const phoneRect = phonePreview.getBoundingClientRect();

            // Size the match lines canvas to cover the whole screen
            this.matchLinesCanvas.width = window.innerWidth;
            this.matchLinesCanvas.height = window.innerHeight;
            this.matchLinesCanvas.style.display = 'block';

            const ctx = this.matchLinesCanvas.getContext('2d');
            ctx.clearRect(0, 0, this.matchLinesCanvas.width, this.matchLinesCanvas.height);

            if (!this.currentViewParams) return;

            // Get phone image scale
            const phoneScaleX = phoneRect.width / (this.phoneImage?.width || 1);
            const phoneScaleY = phoneRect.height / (this.phoneImage?.height || 1);

            // Draw match lines (only inliers for clarity)
            let lineCount = 0;
            const maxLines = 50; // Limit for performance

            for (let i = 0; i < this.sphericalKeypoints.length && lineCount < maxLines; i++) {
                const sphericalKp = this.sphericalKeypoints[i];
                if (!sphericalKp.isInlier) continue;

                // Get pano position from spherical
                const panoPos = this.sphericalToScreen(
                    sphericalKp.azimuth, sphericalKp.elevation,
                    panoRect.width, panoRect.height,
                    this.currentViewParams
                );
                if (!panoPos) continue;

                // Get phone position from matched points
                const phoneKp = this.matchedPoints[i];
                if (!phoneKp) continue;

                const panoX = panoRect.left + panoPos.x;
                const panoY = panoRect.top + panoPos.y;
                const phoneX = phoneRect.left + phoneKp.phone.x * phoneScaleX;
                const phoneY = phoneRect.top + phoneKp.phone.y * phoneScaleY;

                // Draw line with gradient
                const gradient = ctx.createLinearGradient(phoneX, phoneY, panoX, panoY);
                gradient.addColorStop(0, 'rgba(255, 152, 0, 0.8)'); // Orange at phone
                gradient.addColorStop(1, 'rgba(76, 175, 80, 0.8)'); // Green at pano

                ctx.beginPath();
                ctx.moveTo(phoneX, phoneY);
                ctx.lineTo(panoX, panoY);
                ctx.strokeStyle = gradient;
                ctx.lineWidth = 1.5;
                ctx.stroke();

                // Draw dots at endpoints
                ctx.beginPath();
                ctx.arc(phoneX, phoneY, 3, 0, Math.PI * 2);
                ctx.fillStyle = '#ff9800';
                ctx.fill();

                ctx.beginPath();
                ctx.arc(panoX, panoY, 3, 0, Math.PI * 2);
                ctx.fillStyle = '#4caf50';
                ctx.fill();

                lineCount++;
            }
        }

        hideMatchLines() {
            if (this.matchLinesCanvas) {
                this.matchLinesCanvas.style.display = 'none';
            }
        }

        setupViewObserver() {
            // Watch for canvas redraws (indicates view change)
            const checkCanvas = () => {
                const canvas = document.querySelector('canvas');
                if (canvas && canvas !== this.panoCanvas) {
                    this.panoCanvas = canvas;

                    // Listen for mouse events that indicate view interaction
                    canvas.addEventListener('mouseup', () => {
                        setTimeout(() => this.onViewChange(), 100);
                    });
                    canvas.addEventListener('wheel', () => {
                        setTimeout(() => this.onViewChange(), 100);
                    });
                }
            };

            // Check periodically for canvas
            checkCanvas();
            setInterval(checkCanvas, 2000);
        }

        async fetchShotCoordinates() {
            const params = new URLSearchParams(window.location.hash.substring(1));
            const shotId = params.get('shot');

            if (!shotId) return;

            // Try to get coordinates from the feature service
            try {
                // Get cell ID from URL
                const urlMatch = window.location.pathname.match(/cell\+([^\/]+)/);
                if (!urlMatch) return;

                this.cellId = urlMatch[1];
                const featureUrl = `https://production.geocam.io/arcgis/rest/services/cell+${this.cellId}/FeatureServer/0/query`;

                // First get current shot
                const queryParams = new URLSearchParams({
                    f: 'json',
                    where: `id=${shotId}`,
                    outFields: '*',
                    returnGeometry: 'true',
                    returnZ: 'true'
                });

                const response = await fetch(`${featureUrl}?${queryParams}`);
                const data = await response.json();

                if (data.features && data.features.length > 0) {
                    const feature = data.features[0];
                    this.shotCoordinates = {
                        id: shotId,
                        x: feature.geometry.x,
                        y: feature.geometry.y,
                        z: feature.geometry.z || 0,
                        heading: feature.attributes.heading,
                        sequence: feature.attributes.sequence || feature.attributes.id
                    };
                    console.log('[PhoneFisheye] Shot coordinates:', this.shotCoordinates);

                    // Fetch neighbor shots
                    await this.fetchNeighborShots(shotId);
                }
            } catch (err) {
                console.warn('[PhoneFisheye] Could not fetch shot coordinates:', err);
            }
        }

        async fetchNeighborShots(currentShotId) {
            if (!this.cellId) return;

            try {
                const featureUrl = `https://production.geocam.io/arcgis/rest/services/cell+${this.cellId}/FeatureServer/0/query`;

                // Get all shots to find neighbors (ordered by sequence/id)
                const queryParams = new URLSearchParams({
                    f: 'json',
                    where: '1=1',
                    outFields: 'id,heading,sequence',
                    returnGeometry: 'true',
                    returnZ: 'true',
                    orderByFields: 'id ASC',
                    resultRecordCount: '2000' // Get more shots
                });

                const response = await fetch(`${featureUrl}?${queryParams}`);
                const data = await response.json();

                if (data.features && data.features.length > 0) {
                    this.allShotData = data.features.map(f => ({
                        id: f.attributes.id,
                        x: f.geometry.x,
                        y: f.geometry.y,
                        z: f.geometry.z || 0,
                        heading: f.attributes.heading
                    }));

                    // Find current shot index
                    const currentIdx = this.allShotData.findIndex(s => s.id == currentShotId);

                    if (currentIdx >= 0) {
                        // Get 5 before and 5 after (total 11 views for multi-view matching)
                        this.neighborShots = [];
                        for (let i = -5; i <= 5; i++) {
                            const idx = currentIdx + i;
                            if (idx >= 0 && idx < this.allShotData.length) {
                                this.neighborShots.push({
                                    ...this.allShotData[idx],
                                    offset: i,
                                    isCurrent: i === 0
                                });
                            }
                        }
                        console.log('[PhoneFisheye] Neighbor shots:', this.neighborShots.map(s => `${s.id}(${s.offset})`));
                    }
                }
            } catch (err) {
                console.warn('[PhoneFisheye] Could not fetch neighbor shots:', err);
            }
        }

        // Navigate to a specific shot for multi-view matching
        async navigateToShot(shotId, heading = null) {
            const params = new URLSearchParams(window.location.hash.substring(1));
            params.set('shot', shotId);
            if (heading !== null) {
                params.set('facing', heading);
            }
            window.location.hash = params.toString();

            // Wait for view to update
            await this.delay(500);
        }

        // Capture current view and extract features (used for multi-view)
        async captureAndExtractFeatures() {
            const { mat, width, height, canvas } = this.matcher.capturePanoramaView();
            const features = this.matcher.extractFeatures(mat);
            mat.delete();
            return { features, width, height, canvas };
        }

        // Multi-view matching: Match against current + neighbor views
        async matchMultiView(phoneMat, phoneFeatures, progressCallback) {
            const results = [];

            // Get current shot info
            const params = new URLSearchParams(window.location.hash.substring(1));
            const currentShotId = params.get('shot');
            const currentFacing = parseFloat(params.get('facing') || '0');

            if (!this.neighborShots || this.neighborShots.length === 0) {
                await this.fetchNeighborShots(currentShotId);
            }

            // Match against current view first
            progressCallback('Matching current view...', 40);
            const currentPano = this.matcher.capturePanoramaView();
            const currentFeatures = this.matcher.extractFeatures(currentPano.mat);

            const currentMatches = this.matcher.matchFeatures(
                phoneFeatures.descriptors, currentFeatures.descriptors
            );
            const currentGoodMatches = this.matcher.filterMatches(currentMatches);

            if (currentGoodMatches.length >= 8) {
                const homResult = this.matcher.computeHomographyWithMask(
                    phoneFeatures.keypoints, currentFeatures.keypoints, currentGoodMatches
                );

                if (homResult && homResult.inliers >= 4) {
                    results.push({
                        shotId: currentShotId,
                        offset: 0,
                        matches: currentGoodMatches.length,
                        inliers: homResult.inliers,
                        confidence: homResult.inliers / homResult.total,
                        homography: homResult,
                        features: currentFeatures,
                        panoData: currentPano
                    });
                }
            }

            // Match against neighbor shots (sample views at different offsets)
            const neighborsToMatch = this.neighborShots.filter(s => Math.abs(s.offset) > 0);
            const step = Math.max(1, Math.floor(neighborsToMatch.length / 4)); // Sample ~4 neighbors

            for (let i = 0; i < neighborsToMatch.length; i += step) {
                const neighbor = neighborsToMatch[i];
                progressCallback(`Matching neighbor ${neighbor.offset}...`, 50 + i * 5);

                try {
                    // Calculate facing toward same scene area
                    const neighborFacing = currentFacing; // Keep same facing direction

                    // Navigate to neighbor
                    await this.navigateToShot(neighbor.id, neighborFacing);

                    // Capture and match
                    const neighborPano = this.matcher.capturePanoramaView();
                    const neighborFeatures = this.matcher.extractFeatures(neighborPano.mat);

                    const neighborMatches = this.matcher.matchFeatures(
                        phoneFeatures.descriptors, neighborFeatures.descriptors
                    );
                    const neighborGoodMatches = this.matcher.filterMatches(neighborMatches);

                    if (neighborGoodMatches.length >= 8) {
                        const homResult = this.matcher.computeHomographyWithMask(
                            phoneFeatures.keypoints, neighborFeatures.keypoints, neighborGoodMatches
                        );

                        if (homResult && homResult.inliers >= 4) {
                            results.push({
                                shotId: neighbor.id,
                                offset: neighbor.offset,
                                matches: neighborGoodMatches.length,
                                inliers: homResult.inliers,
                                confidence: homResult.inliers / homResult.total,
                                homography: homResult,
                                features: neighborFeatures,
                                panoData: neighborPano
                            });
                        }
                    }

                    neighborPano.mat.delete();
                } catch (e) {
                    console.warn(`[PhoneFisheye] Error matching neighbor ${neighbor.id}:`, e);
                }
            }

            // Navigate back to original shot
            await this.navigateToShot(currentShotId, currentFacing);

            // Sort by confidence
            results.sort((a, b) => b.confidence - a.confidence);

            this.multiViewResults = results;
            console.log('[PhoneFisheye] Multi-view results:', results.map(r =>
                `Shot ${r.shotId}: ${r.inliers}/${r.matches} (${(r.confidence * 100).toFixed(0)}%)`
            ));

            return results;
        }

        onViewChange() {
            // Get current view parameters from URL
            const params = new URLSearchParams(window.location.hash.substring(1));
            this.currentViewParams = {
                facing: parseFloat(params.get('facing') || '0'),
                horizon: parseFloat(params.get('horizon') || '0'),
                fov: parseFloat(params.get('fov') || '90')
            };

            this.updateOverlayPosition();
            this.updateKeypointVisualization();
        }

        // Convert screen pixel coordinates to spherical (azimuth, elevation)
        // relative to the panorama sphere
        // Uses CORRECT perspective projection math (tangent-based, not linear)
        screenToSpherical(screenX, screenY, canvasWidth, canvasHeight, viewParams) {
            const { facing, horizon, fov } = viewParams;

            // Normalize to [-1, 1] range
            const nx = (screenX / canvasWidth - 0.5) * 2;
            const ny = -(screenY / canvasHeight - 0.5) * 2; // Flip Y

            // Calculate aspect ratio
            const aspect = canvasWidth / canvasHeight;

            // Convert vertical FOV to radians
            const vFovRad = fov * Math.PI / 180;

            // Calculate horizontal FOV from vertical FOV and aspect ratio
            // Using the standard camera projection formula
            const hFovRad = 2 * Math.atan(Math.tan(vFovRad / 2) * aspect);

            // CORRECT perspective projection: use atan for angular offset
            // In a perspective camera, the relationship between screen position
            // and angle is: tan(angle) = screen_offset / focal_length
            // So: angle = atan(normalized_screen_pos * tan(half_fov))
            const deltaAzRad = Math.atan(nx * Math.tan(hFovRad / 2));
            const deltaElRad = Math.atan(ny * Math.tan(vFovRad / 2));

            // Convert back to degrees
            const deltaAz = deltaAzRad * 180 / Math.PI;
            const deltaEl = deltaElRad * 180 / Math.PI;

            // Apply to current view direction
            const azimuth = (facing + deltaAz + 360) % 360;
            const elevation = Math.max(-90, Math.min(90, horizon + deltaEl));

            return { azimuth, elevation };
        }

        // Convert spherical coordinates back to screen pixels
        // Uses CORRECT inverse perspective projection (tangent-based)
        sphericalToScreen(azimuth, elevation, canvasWidth, canvasHeight, viewParams) {
            const { facing, horizon, fov } = viewParams;

            // Calculate aspect ratio
            const aspect = canvasWidth / canvasHeight;

            // Convert FOV to radians
            const vFovRad = fov * Math.PI / 180;
            const hFovRad = 2 * Math.atan(Math.tan(vFovRad / 2) * aspect);

            // Calculate angular distance from view center
            let deltaAz = azimuth - facing;
            // Handle wrap-around
            if (deltaAz > 180) deltaAz -= 360;
            if (deltaAz < -180) deltaAz += 360;

            const deltaEl = elevation - horizon;

            // Convert to radians
            const deltaAzRad = deltaAz * Math.PI / 180;
            const deltaElRad = deltaEl * Math.PI / 180;

            // Check if point is in view (with some margin)
            if (Math.abs(deltaAzRad) > hFovRad / 2 + 0.2 || Math.abs(deltaElRad) > vFovRad / 2 + 0.2) {
                return null; // Out of view
            }

            // CORRECT inverse perspective projection:
            // nx = tan(angle) / tan(half_fov)
            const nx = Math.tan(deltaAzRad) / Math.tan(hFovRad / 2);
            const ny = -Math.tan(deltaElRad) / Math.tan(vFovRad / 2); // Flip Y back

            // Clamp to valid range
            if (Math.abs(nx) > 1.2 || Math.abs(ny) > 1.2) {
                return null;
            }

            // Convert to pixel coordinates
            const screenX = (nx / 2 + 0.5) * canvasWidth;
            const screenY = (ny / 2 + 0.5) * canvasHeight;

            return { x: screenX, y: screenY, inView: true };
        }

        // Store matched points in spherical coordinates
        storeSphericalKeypoints(matchedPoints, inlierIndices, canvasWidth, canvasHeight, viewParams) {
            this.sphericalKeypoints = matchedPoints.map((point, idx) => {
                const spherical = this.screenToSpherical(
                    point.pano.x, point.pano.y,
                    canvasWidth, canvasHeight, viewParams
                );
                return {
                    azimuth: spherical.azimuth,
                    elevation: spherical.elevation,
                    isInlier: inlierIndices && inlierIndices.has(idx),
                    distance: point.distance
                };
            });
            console.log(`[PhoneFisheye] Stored ${this.sphericalKeypoints.length} keypoints in spherical coords`);
        }

        // Store overlay corners in spherical coordinates
        storeSphericalCorners(corners, canvasWidth, canvasHeight, viewParams) {
            this.sphericalCorners = corners.map(corner => {
                return this.screenToSpherical(
                    corner.x, corner.y,
                    canvasWidth, canvasHeight, viewParams
                );
            });
            console.log('[PhoneFisheye] Stored overlay corners in spherical coords');
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
                    <div class="pf-input-group">
                        <label>Detector</label>
                        <select class="pf-detector">
                            <option value="akaze">AKAZE (robust)</option>
                            <option value="orb">ORB (fast)</option>
                            <option value="both">Both</option>
                        </select>
                    </div>
                </div>

                <div class="pf-input-row">
                    <div class="pf-input-group" style="display: flex; align-items: center; gap: 8px;">
                        <input type="checkbox" class="pf-multiview" id="pf-multiview" />
                        <label for="pf-multiview" style="margin: 0;">Multi-view matching (slower, more robust)</label>
                    </div>
                </div>

                <div class="pf-input-row">
                    <div class="pf-input-group" style="display: flex; align-items: center; gap: 8px;">
                        <input type="checkbox" class="pf-thorough" id="pf-thorough" />
                        <label for="pf-thorough" style="margin: 0;">Thorough search (ALL shots, slower)</label>
                    </div>
                </div>

                <button class="pf-btn pf-btn-primary pf-localize-btn" disabled>
                    ${ICONS.search} Match & Overlay
                </button>

                <button class="pf-btn pf-btn-secondary pf-batch-search-btn" disabled style="background: #9c27b0;">
                    ${ICONS.search} Search ALL Shots
                </button>

                <button class="pf-btn pf-btn-secondary pf-cancel-search-btn" style="display: none; background: #f44336; color: white;">
                    ✕ Cancel Search
                </button>

                <div class="pf-cache-status" style="font-size: 10px; color: #666; margin: 4px 0; display: flex; justify-content: space-between; align-items: center;">
                    <span class="pf-cache-count">📦 Cache: loading...</span>
                    <button class="pf-clear-cache-btn" style="font-size: 9px; padding: 2px 6px; background: #f5f5f5; border: 1px solid #ddd; border-radius: 3px; cursor: pointer;">Clear Cache</button>
                </div>

                <div class="pf-batch-results" style="display:none; margin-top: 12px; max-height: 200px; overflow-y: auto;">
                    <h5 style="margin: 0 0 8px 0; font-size: 12px;">Best Matches:</h5>
                    <div class="pf-batch-list"></div>
                </div>

                <div class="pf-detailed-results">
                    <div class="pf-detailed-header">
                        <span>📊 Detailed Search Results</span>
                        <span class="pf-detailed-toggle">▼ Expand</span>
                    </div>
                    <div class="pf-detailed-summary"></div>
                    <div class="pf-detailed-content"></div>
                </div>

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
                    <div class="pf-input-row">
                        <div class="pf-input-group">
                            <label>Est. Distance: <span class="distance-value">10m</span></label>
                            <input type="range" class="pf-distance" value="10" min="1" max="50" />
                        </div>
                    </div>
                    <button class="pf-btn pf-btn-warning pf-toggle-overlay-btn">
                        ${ICONS.eyeOff} Hide Overlay
                    </button>
                    <button class="pf-btn pf-btn-secondary pf-toggle-keypoints-btn">
                        ${ICONS.eye} Hide Keypoints
                    </button>
                    <button class="pf-btn pf-btn-secondary pf-toggle-lines-btn">
                        ${ICONS.eye} Hide Lines
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
                    AKAZE/ORB + Lowe's ratio test<br>
                    Spherical coord tracking + Multi-view
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
            this.panel.querySelector('.pf-batch-search-btn').addEventListener('click', () => this.startBatchSearch());
            this.panel.querySelector('.pf-navigate-btn').addEventListener('click', () => this.navigateToResult());

            // Cache controls
            this.panel.querySelector('.pf-clear-cache-btn').addEventListener('click', async () => {
                if (confirm('Clear all cached CLIP embeddings for this cell?')) {
                    if (this.cellId) {
                        await this.embedder.cache.clearCell(this.cellId);
                    } else {
                        await this.embedder.cache.clearAll();
                    }
                    this.updateCacheStatus();
                    this.showStatus('Cache cleared', 'info');
                }
            });

            // Update cache status on load
            this.updateCacheStatus();
            this.panel.querySelector('.pf-clear-btn').addEventListener('click', () => this.clearAll());

            // Detailed results toggle
            this.panel.querySelector('.pf-detailed-header').addEventListener('click', () => {
                const content = this.panel.querySelector('.pf-detailed-content');
                const toggle = this.panel.querySelector('.pf-detailed-toggle');
                const isExpanded = content.classList.toggle('expanded');
                toggle.textContent = isExpanded ? '▲ Collapse' : '▼ Expand';
            });

            this.panel.querySelector('.pf-fov').addEventListener('change', (e) => {
                this.estimatedFov = parseFloat(e.target.value) || 70;
            });

            // Detector selection
            this.panel.querySelector('.pf-detector').addEventListener('change', (e) => {
                const value = e.target.value;
                if (value === 'akaze') {
                    this.matcher.useAkaze = true;
                } else if (value === 'orb') {
                    this.matcher.useAkaze = false;
                }
                console.log(`[PhoneFisheye] Detector: ${value}`);
            });

            // Multi-view toggle
            this.useMultiView = false;
            this.panel.querySelector('.pf-multiview').addEventListener('change', (e) => {
                this.useMultiView = e.target.checked;
                console.log(`[PhoneFisheye] Multi-view: ${this.useMultiView}`);
            });

            // Thorough search toggle
            this.useThoroughSearch = false;
            this.panel.querySelector('.pf-thorough').addEventListener('change', (e) => {
                this.useThoroughSearch = e.target.checked;
                console.log(`[PhoneFisheye] Thorough search: ${this.useThoroughSearch}`);
            });

            // Cancel search button
            this.searchCancelled = false;
            this.panel.querySelector('.pf-cancel-search-btn').addEventListener('click', () => {
                this.searchCancelled = true;
                this.showStatus('Cancelling search...', 'loading');
                console.log('[PhoneFisheye] Search cancelled by user');
            });

            // Overlay controls
            const opacitySlider = this.panel.querySelector('.pf-opacity');
            opacitySlider.addEventListener('input', (e) => {
                this.overlayOpacity = parseInt(e.target.value) / 100;
                this.panel.querySelector('.opacity-value').textContent = `${e.target.value}%`;
                this.updateOverlayOpacity();
            });

            this.panel.querySelector('.pf-toggle-overlay-btn').addEventListener('click', () => this.toggleOverlay());
            this.panel.querySelector('.pf-toggle-keypoints-btn').addEventListener('click', () => this.toggleKeypoints());
            this.panel.querySelector('.pf-toggle-lines-btn').addEventListener('click', () => this.toggleMatchLines());
            this.panel.querySelector('.pf-add-marker-btn').addEventListener('click', () => this.addMapMarker());

            // Distance slider
            const distanceSlider = this.panel.querySelector('.pf-distance');
            distanceSlider.addEventListener('input', (e) => {
                this.estimatedDistance = parseInt(e.target.value);
                this.panel.querySelector('.distance-value').textContent = `${e.target.value}m`;
            });
        }

        toggleKeypoints() {
            this.showKeypoints = !this.showKeypoints;
            if (this.keypointCanvas) {
                this.keypointCanvas.style.display = this.showKeypoints ? 'block' : 'none';
            }
            const btn = this.panel.querySelector('.pf-toggle-keypoints-btn');
            if (this.showKeypoints) {
                btn.innerHTML = `${ICONS.eye} Hide Keypoints`;
            } else {
                btn.innerHTML = `${ICONS.eyeOff} Show Keypoints`;
            }
        }

        toggleMatchLines() {
            this.showMatchLines = !this.showMatchLines;
            if (this.matchLinesCanvas) {
                if (this.showMatchLines) {
                    this.drawMatchLines();
                } else {
                    this.hideMatchLines();
                }
            }
            const btn = this.panel.querySelector('.pf-toggle-lines-btn');
            if (this.showMatchLines) {
                btn.innerHTML = `${ICONS.eye} Hide Lines`;
            } else {
                btn.innerHTML = `${ICONS.eyeOff} Show Lines`;
            }
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
            this.panel.querySelector('.pf-batch-search-btn').disabled = false;
            this.panel.querySelector('.pf-clear-btn').style.display = 'block';
            this.showStatus('Photo loaded. Click "Match & Overlay" to localize.', 'info');
        }

        clearAll() {
            this.currentFile = null;
            this.phoneImage = null;
            this.lastResult = null;
            this.lastHomography = null;
            this.matchedPoints = null;
            this.inlierIndices = null;

            // Remove overlay image
            if (this.imageOverlay) {
                this.imageOverlay.remove();
                this.imageOverlay = null;
            }

            // Remove map marker (DOM fallback)
            if (this.mapMarker) {
                this.mapMarker.remove();
                this.mapMarker = null;
            }

            // Remove ArcGIS graphics layer
            if (this.arcgisGraphicsLayer && this.arcgisMapView) {
                try {
                    this.arcgisMapView.map.remove(this.arcgisGraphicsLayer);
                } catch (e) {
                    console.warn('[PhoneFisheye] Could not remove ArcGIS layer:', e);
                }
                this.arcgisGraphicsLayer = null;
            }

            // Hide keypoint visualization
            if (this.keypointCanvas) {
                this.keypointCanvas.style.display = 'none';
                const ctx = this.keypointCanvas.getContext('2d');
                ctx.clearRect(0, 0, this.keypointCanvas.width, this.keypointCanvas.height);
            }

            // Hide match lines
            this.hideMatchLines();
            this.sphericalKeypoints = null;

            // Hide match stats
            if (this.matchStatsEl) {
                this.matchStatsEl.classList.remove('visible');
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

        async updateCacheStatus() {
            try {
                // Get cell ID if not already set
                if (!this.cellId) {
                    const urlMatch = window.location.href.match(/cell[+\s]([a-z0-9+]+)/i);
                    if (urlMatch) {
                        this.cellId = urlMatch[1];
                    }
                }

                const cacheCountEl = this.panel.querySelector('.pf-cache-count');
                if (this.cellId) {
                    const count = await this.embedder.cache.getStats(this.cellId);
                    cacheCountEl.textContent = `📦 Cache: ${count} embeddings`;
                } else {
                    cacheCountEl.textContent = `📦 Cache: (no cell)`;
                }
            } catch (e) {
                console.warn('[PhoneFisheye] Cache status error:', e);
            }
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

                // Use new method that returns inlier indices for visualization
                const homResult = this.matcher.computeHomographyWithMask(
                    phoneFeatures.keypoints, panoFeatures.keypoints, goodMatches
                );

                if (!homResult || homResult.inliers < 4) {
                    throw new Error('Could not compute homography');
                }

                // Store matched points for MatchAnything-style visualization
                this.matchedPoints = this.matcher.getMatchedPoints(
                    phoneFeatures.keypoints, panoFeatures.keypoints, goodMatches
                );
                this.inlierIndices = new Set(homResult.inlierIndices);

                // Get current view parameters for spherical conversion
                const params = new URLSearchParams(window.location.hash.substring(1));
                const viewParams = {
                    facing: parseFloat(params.get('facing') || '0'),
                    horizon: parseFloat(params.get('horizon') || '0'),
                    fov: parseFloat(params.get('fov') || '90')
                };
                this.currentViewParams = viewParams;

                // STORE KEYPOINTS IN SPHERICAL COORDINATES (view-invariant)
                this.storeSphericalKeypoints(
                    this.matchedPoints, this.inlierIndices,
                    panoW, panoH, viewParams
                );

                this.lastHomography = {
                    H: homResult.homography,
                    phoneW, phoneH, panoW, panoH,
                    panoCanvas,
                    matchViewParams: viewParams // Remember which view we matched in
                };

                // Clean up mask
                if (homResult.mask) homResult.mask.delete();

                this.showProgress(85);
                this.showStatus('Estimating pose...', 'loading');
                await this.delay(50);

                const pose = this.matcher.estimatePoseFromHomography(
                    homResult.homography, panoW, panoH, this.estimatedFov
                );

                // Use viewParams already defined above
                const currentFacing = parseFloat(viewParams.facing || 0);
                const currentHorizon = parseFloat(viewParams.horizon || 0);

                this.lastResult = {
                    facing: (currentFacing + pose.yawOffset + 360) % 360,
                    horizon: Math.max(-85, Math.min(85, currentHorizon + pose.pitchOffset)),
                    fov: Math.max(10, Math.min(120, this.estimatedFov / pose.scale)),
                    matches: goodMatches.length,
                    inliers: homResult.inliers,
                    confidence: homResult.inliers / homResult.total
                };

                // Draw match visualization (OpenCV style - in panel)
                this.matcher.drawMatches(phoneMat, phoneFeatures.keypoints,
                    panoMat, panoFeatures.keypoints, goodMatches, this.matchCanvas);
                this.panel.querySelector('.pf-match-preview').classList.add('visible');

                // Create image overlay on panorama
                this.createImageOverlay();

                // Draw MatchAnything-style keypoint visualization on pano
                this.drawKeypointVisualization();

                // Update match stats display
                this.updateMatchStats(goodMatches.length, homResult.inliers);

                // Show results and controls
                this.showResults(this.lastResult);
                this.panel.querySelector('.pf-overlay-controls').classList.add('visible');
                this.showStatus('Localization complete!', 'success');
                this.showProgress(100);

                // Draw match lines from phone preview to pano keypoints
                this.drawMatchLines();

                // AUTO-ADD MAP MARKER with FOV cone and rays
                this.addMapMarker();

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

        // ============================================
        // BATCH SEARCH - Two-stage: DINOv2 similarity + ORB verification
        // ============================================
        async startBatchSearch() {
            if (!this.phoneImage || this.isMatching) return;

            this.isMatching = true;
            this.batchResults = [];

            // Initialize detailed tracking for ALL shots processed
            this.detailedResults = {
                clipStage: [],      // All shots processed in DINOv2 stage (kept name for compatibility)
                orbStage: [],       // Shots sent to ORB verification
                matched: [],        // Successfully matched shots
                rejected: [],       // Rejected (not enough inliers, etc.)
                failed: [],         // Failed to load/process
                stats: {
                    totalShots: 0,
                    sampledForClip: 0,  // kept name for compatibility
                    cachedEmbeddings: 0,
                    computedEmbeddings: 0,
                    clipFailed: 0,      // kept name for compatibility
                    sentToOrb: 0,
                    orbMatched: 0,
                    orbRejected: 0,
                    orbFailed: 0
                }
            };

            const batchResultsDiv = this.panel.querySelector('.pf-batch-results');
            const batchListDiv = this.panel.querySelector('.pf-batch-list');
            const detailedResultsDiv = this.panel.querySelector('.pf-detailed-results');
            const cancelBtn = this.panel.querySelector('.pf-cancel-search-btn');
            const searchBtn = this.panel.querySelector('.pf-batch-search-btn');

            // Show cancel button, hide search button
            this.searchCancelled = false;
            cancelBtn.style.display = 'block';
            searchBtn.style.display = 'none';

            batchResultsDiv.style.display = 'block';
            detailedResultsDiv.classList.add('visible');
            batchListDiv.innerHTML = '<div style="color: #666;">Starting search...</div>';
            this.updateDetailedResultsSummary();

            try {
                // STAGE 1: Initialize DINOv2 model
                this.showStatus('Loading DINOv2 model...', 'loading');
                this.showProgress(2);
                batchListDiv.innerHTML = '<div style="color: #666;">Loading Transformers.js library...</div>';

                const modelReady = await this.embedder.initialize();
                if (!modelReady) {
                    // Fallback to ORB-only if DINOv2 fails
                    console.error('[BatchSearch] DINOv2 FAILED TO LOAD - falling back to ORB-only');
                    batchListDiv.innerHTML = '<div style="color: #f44336;">⚠️ DINOv2 failed to load!<br/>Using ORB-only (less accurate)</div>';
                    await this.delay(1500);
                    return this.startBatchSearchORBOnly();
                }

                // DINOv2 loaded successfully
                console.log('[BatchSearch] ✓ DINOv2 model loaded successfully');
                batchListDiv.innerHTML = '<div style="color: #4caf50;">✓ DINOv2 model loaded</div>';

                // Get phone image embedding
                this.showStatus('Computing phone image embedding...', 'loading');
                this.showProgress(5);

                const phoneEmbedding = await this.embedder.getEmbedding(this.phoneImage);

                // Debug: log embedding info
                console.log('[BatchSearch] Phone embedding:', {
                    length: phoneEmbedding.length,
                    sample: phoneEmbedding.slice(0, 5).map(v => v.toFixed(4)),
                    norm: Math.sqrt(phoneEmbedding.reduce((s, v) => s + v*v, 0)).toFixed(4)
                });

                // Fetch all shots
                this.showStatus('Fetching shot list...', 'loading');
                this.showProgress(8);

                if (!this.cellId) {
                    const urlMatch = window.location.href.match(/cell[+\s]([a-z0-9+]+)/i);
                    if (urlMatch) {
                        this.cellId = urlMatch[1];
                    }
                }

                if (!this.cellId) {
                    throw new Error('Could not determine cell ID');
                }

                const featureUrl = `https://production.geocam.io/arcgis/rest/services/cell+${this.cellId}/FeatureServer/0/query`;
                const queryParams = new URLSearchParams({
                    f: 'json',
                    where: '1=1',
                    outFields: 'id,heading',
                    returnGeometry: 'true',
                    returnZ: 'true',
                    orderByFields: 'id ASC',
                    resultRecordCount: '5000'
                });

                const response = await fetch(`${featureUrl}?${queryParams}`);
                const data = await response.json();

                if (!data.features || data.features.length === 0) {
                    throw new Error('No shots found in cell');
                }

                const allShots = data.features.map(f => ({
                    id: f.attributes.id,
                    heading: f.attributes.heading,
                    x: f.geometry.x,
                    y: f.geometry.y,
                    z: f.geometry.z || 0
                }));

                // Sample shots for DINOv2 similarity
                // Thorough mode: ALL shots. Normal mode: ~150 samples
                let sampledShots;
                if (this.useThoroughSearch) {
                    sampledShots = allShots;
                    console.log(`[BatchSearch] THOROUGH MODE: Processing ALL ${allShots.length} shots`);
                } else {
                    const sampleRate = Math.max(1, Math.floor(allShots.length / 150));
                    sampledShots = allShots.filter((_, i) => i % sampleRate === 0);
                    console.log(`[BatchSearch] Normal mode: Sampling ${sampledShots.length}/${allShots.length} shots`);
                }

                // Track stats
                this.detailedResults.stats.totalShots = allShots.length;
                this.detailedResults.stats.sampledForClip = sampledShots.length;
                this.updateDetailedResultsSummary();

                // Save current view
                const originalParams = new URLSearchParams(window.location.hash.substring(1));
                const originalShot = originalParams.get('shot');
                const originalFacing = originalParams.get('facing');

                // STAGE 2: Compute DINOv2 similarity (with caching)
                const searchFov = 80;

                // Check cache for existing embeddings
                // NOTE: Clear cache if switching from CLIP to DINOv2!
                this.showStatus('Checking embedding cache...', 'loading');
                const shotIds = sampledShots.map(s => s.id);
                const cachedEmbeddings = await this.embedder.cache.getMany(this.cellId, shotIds, searchFov);
                const cachedCount = cachedEmbeddings.size;

                const uncachedShots = sampledShots.filter(s => !cachedEmbeddings.has(s.id));
                console.log(`[BatchSearch] Cache: ${cachedCount} cached, ${uncachedShots.length} to compute`);

                // Track cache stats
                this.detailedResults.stats.cachedEmbeddings = cachedCount;
                this.updateDetailedResultsSummary();

                batchListDiv.innerHTML = `<div style="color: #666;">Stage 1: DINOv2 similarity<br/>📦 ${cachedCount} cached, 🔄 ${uncachedShots.length} to compute...</div>`;

                const similarities = [];

                // First, add cached embeddings to similarities
                for (const shot of sampledShots) {
                    const cachedEmbedding = cachedEmbeddings.get(shot.id);
                    if (cachedEmbedding) {
                        const similarity = this.embedder.cosineSimilarity(phoneEmbedding, cachedEmbedding);
                        similarities.push({ ...shot, similarity, cached: true });

                        // Track in detailed results
                        this.detailedResults.clipStage.push({
                            shotId: shot.id,
                            similarity: similarity,
                            cached: true,
                            status: 'success'
                        });
                    }
                }

                // Compute embeddings for uncached shots
                for (let i = 0; i < uncachedShots.length; i++) {
                    // Check for cancellation
                    if (this.searchCancelled) {
                        console.log(`[BatchSearch] Cancelled at DINOv2 stage (${i}/${uncachedShots.length})`);
                        this.showStatus(`Cancelled after ${i} embeddings`, 'info');
                        break;
                    }

                    const shot = uncachedShots[i];
                    const progress = 10 + (i / uncachedShots.length) * 40;
                    this.showProgress(progress);

                    if (i % 10 === 0 || i === 0) {
                        this.showStatus(`DINOv2: ${i + 1}/${uncachedShots.length} (${cachedCount} cached)...`, 'loading');
                        batchListDiv.innerHTML = `<div style="color: #666;">Stage 1: DINOv2 similarity<br/>📦 ${cachedCount} cached ✓<br/>🔄 Computing ${i + 1}/${uncachedShots.length}...<br/><em style="font-size:9px;">(Click Cancel to stop)</em></div>`;
                    }

                    try {
                        // Navigate to shot
                        const params = new URLSearchParams(window.location.hash.substring(1));
                        params.set('shot', shot.id);
                        params.set('fov', String(searchFov));
                        window.location.hash = params.toString();

                        // Wait for view to FULLY load (increased from 200ms)
                        await this.delay(400);

                        // Capture and get embedding
                        const panoCanvas = this.embedder.capturePanoCanvas();
                        if (panoCanvas) {
                            const panoEmbedding = await this.embedder.getEmbedding(panoCanvas);

                            // Cache the embedding for future searches
                            await this.embedder.cache.set(this.cellId, shot.id, searchFov, panoEmbedding);

                            const similarity = this.embedder.cosineSimilarity(phoneEmbedding, panoEmbedding);
                            similarities.push({ ...shot, similarity, cached: false });

                            // Track computed embedding
                            this.detailedResults.stats.computedEmbeddings++;
                            this.detailedResults.clipStage.push({
                                shotId: shot.id,
                                similarity: similarity,
                                cached: false,
                                status: 'success'
                            });
                        } else {
                            // Canvas capture failed
                            this.detailedResults.stats.clipFailed++;
                            this.detailedResults.failed.push({
                                shotId: shot.id,
                                stage: 'clip',
                                reason: 'Canvas capture failed'
                            });
                        }
                    } catch (e) {
                        console.warn(`[BatchSearch] CLIP error on shot ${shot.id}:`, e);
                        this.detailedResults.stats.clipFailed++;
                        this.detailedResults.failed.push({
                            shotId: shot.id,
                            stage: 'clip',
                            reason: e.message || 'CLIP error'
                        });
                    }
                }

                // Update summary after CLIP stage
                this.updateDetailedResultsSummary();

                // Log cache stats
                const newCacheCount = await this.embedder.cache.getStats(this.cellId);
                console.log(`[BatchSearch] Cache now has ${newCacheCount} embeddings for this cell`);

                // Sort by similarity and take top candidates
                similarities.sort((a, b) => b.similarity - a.similarity);
                const topCandidates = similarities.slice(0, 20); // Top 20 for ORB verification

                // Debug: log detailed similarity info
                const simStats = {
                    total: similarities.length,
                    max: similarities[0]?.similarity.toFixed(3),
                    min: similarities[similarities.length - 1]?.similarity.toFixed(3),
                    top5: topCandidates.slice(0, 5).map(c => `${c.id}:${(c.similarity * 100).toFixed(1)}%`)
                };
                console.log('[BatchSearch] DINOv2 Similarity Stats:', simStats);
                console.table(topCandidates.slice(0, 10).map(c => ({
                    shotId: c.id,
                    similarity: (c.similarity * 100).toFixed(1) + '%',
                    cached: c.cached ? '✓' : '✗'
                })));

                // Update display with DINOv2 results
                batchListDiv.innerHTML = `
                    <div style="color: #4caf50; margin-bottom: 8px; font-weight: bold;">
                        ✓ DINOv2 Stage 1 complete
                    </div>
                    <div style="font-size: 10px; color: #666; margin-bottom: 4px;">
                        Similarity range: ${(similarities[similarities.length-1]?.similarity * 100).toFixed(0)}% - ${(similarities[0]?.similarity * 100).toFixed(0)}%
                    </div>
                    <div style="font-size: 11px; margin-bottom: 8px;">Top ${topCandidates.length} by visual similarity:</div>
                    ${topCandidates.slice(0, 5).map((c, i) => `
                        <div style="padding: 4px; font-size: 11px; background: ${i === 0 ? '#e3f2fd' : '#f5f5f5'}; margin: 2px 0; border-radius: 3px;">
                            ${i + 1}. Shot ${c.id} — <strong style="color: #2196f3;">${(c.similarity * 100).toFixed(1)}%</strong>
                        </div>
                    `).join('')}
                    <div style="color: #666; margin-top: 8px;">Stage 2: ORB geometric verification...</div>
                `;

                // STAGE 3: ORB verification on top candidates
                this.showStatus('Stage 2: Geometric verification...', 'loading');

                // Track ORB stage
                this.detailedResults.stats.sentToOrb = topCandidates.length;

                const { mat: phoneMat } = this.matcher.imageToMat(this.phoneImage, 600);
                const phoneFeatures = this.matcher.extractFeatures(phoneMat, true);

                if (phoneFeatures.keypoints.size() < 50) {
                    throw new Error('Not enough features in phone image');
                }

                for (let i = 0; i < topCandidates.length; i++) {
                    // Check for cancellation
                    if (this.searchCancelled) {
                        console.log(`[BatchSearch] Cancelled at ORB stage (${i}/${topCandidates.length})`);
                        this.showStatus(`Cancelled after ${i} ORB verifications`, 'info');
                        break;
                    }

                    const shot = topCandidates[i];
                    const progress = 55 + (i / topCandidates.length) * 40;
                    this.showProgress(progress);
                    this.showStatus(`Verifying ${i + 1}/${topCandidates.length}: Shot ${shot.id}...`, 'loading');

                    // Track this shot in ORB stage
                    const orbEntry = {
                        shotId: shot.id,
                        clipSimilarity: shot.similarity,
                        panoKeypoints: 0,
                        matches: 0,
                        inliers: 0,
                        status: 'pending',
                        reason: ''
                    };

                    try {
                        // Navigate to shot
                        const params = new URLSearchParams(window.location.hash.substring(1));
                        params.set('shot', shot.id);
                        params.set('fov', '90');
                        window.location.hash = params.toString();

                        await this.delay(300);

                        // Capture and match with ORB
                        const { mat: panoMat } = this.matcher.capturePanoramaView();
                        const panoFeatures = this.matcher.extractFeatures(panoMat, true);
                        orbEntry.panoKeypoints = panoFeatures.keypoints.size();

                        if (panoFeatures.keypoints.size() > 50) {
                            const matches = this.matcher.matchFeatures(
                                phoneFeatures.descriptors, panoFeatures.descriptors
                            );
                            const goodMatches = this.matcher.filterMatches(matches);
                            orbEntry.matches = goodMatches.length;

                            if (goodMatches.length >= 8) {
                                const homResult = this.matcher.computeHomographyWithMask(
                                    phoneFeatures.keypoints, panoFeatures.keypoints, goodMatches
                                );

                                orbEntry.inliers = homResult?.inliers || 0;

                                // Require minimum 15 inliers for a valid match
                                if (homResult && homResult.inliers >= 15) {
                                    // INLIERS are PRIMARY - CLIP is just for filtering
                                    const inlierScore = homResult.inliers * 2;
                                    const clipBonus = (shot.similarity - 0.8) * 50;
                                    const combinedScore = inlierScore + clipBonus;

                                    console.log(`[BatchSearch] Shot ${shot.id}: ${homResult.inliers} inliers, ${(shot.similarity*100).toFixed(0)}% sim → score ${combinedScore.toFixed(1)}`);

                                    this.batchResults.push({
                                        shotId: shot.id,
                                        x: shot.x,
                                        y: shot.y,
                                        heading: shot.heading,
                                        matches: goodMatches.length,
                                        inliers: homResult.inliers,
                                        confidence: homResult.inliers / homResult.total,
                                        similarity: shot.similarity,
                                        score: combinedScore
                                    });

                                    // Track as matched
                                    orbEntry.status = 'matched';
                                    this.detailedResults.stats.orbMatched++;
                                    this.detailedResults.matched.push(orbEntry);

                                    this.updateBatchResultsDisplay(batchListDiv);
                                } else {
                                    // Not enough inliers
                                    orbEntry.status = 'rejected';
                                    orbEntry.reason = `Only ${homResult?.inliers || 0} inliers (need 15+)`;
                                    this.detailedResults.stats.orbRejected++;
                                    this.detailedResults.rejected.push(orbEntry);
                                    console.log(`[BatchSearch] Shot ${shot.id}: only ${homResult?.inliers || 0} inliers (need 15+)`);
                                }

                                if (homResult?.mask) homResult.mask.delete();
                            } else {
                                // Not enough matches
                                orbEntry.status = 'rejected';
                                orbEntry.reason = `Only ${goodMatches.length} matches (need 8+)`;
                                this.detailedResults.stats.orbRejected++;
                                this.detailedResults.rejected.push(orbEntry);
                            }
                        } else {
                            // Not enough keypoints
                            orbEntry.status = 'rejected';
                            orbEntry.reason = `Only ${orbEntry.panoKeypoints} keypoints (need 50+)`;
                            this.detailedResults.stats.orbRejected++;
                            this.detailedResults.rejected.push(orbEntry);
                        }

                        panoFeatures.keypoints.delete();
                        panoFeatures.descriptors.delete();
                        panoMat.delete();

                    } catch (e) {
                        console.warn(`[BatchSearch] ORB error on shot ${shot.id}:`, e);
                        orbEntry.status = 'failed';
                        orbEntry.reason = e.message || 'ORB processing error';
                        this.detailedResults.stats.orbFailed++;
                        this.detailedResults.failed.push({
                            shotId: shot.id,
                            stage: 'orb',
                            reason: e.message || 'ORB error'
                        });
                    }

                    // Add to orbStage tracking
                    this.detailedResults.orbStage.push(orbEntry);
                    this.updateDetailedResultsSummary();
                }

                // Sort by combined score
                this.batchResults.sort((a, b) => b.score - a.score);
                this.updateBatchResultsDisplay(batchListDiv);

                // Navigate to best match
                if (this.batchResults.length > 0) {
                    const best = this.batchResults[0];
                    this.showStatus(`Best: Shot ${best.shotId} (${(best.similarity * 100).toFixed(0)}% sim, ${best.inliers} inliers)`, 'success');

                    const params = new URLSearchParams(window.location.hash.substring(1));
                    params.set('shot', best.shotId);
                    window.location.hash = params.toString();
                } else {
                    this.showStatus('No matches found', 'error');
                    if (originalShot) {
                        const params = new URLSearchParams(window.location.hash.substring(1));
                        params.set('shot', originalShot);
                        if (originalFacing) params.set('facing', originalFacing);
                        window.location.hash = params.toString();
                    }
                }

                // Cleanup
                phoneFeatures.keypoints.delete();
                phoneFeatures.descriptors.delete();
                phoneMat.delete();

                this.showProgress(100);

            } catch (err) {
                console.error('[BatchSearch] Error:', err);
                this.showStatus(`Search failed: ${err.message}`, 'error');
            } finally {
                this.isMatching = false;
                this.searchCancelled = false;

                // Reset buttons
                const cancelBtn = this.panel.querySelector('.pf-cancel-search-btn');
                const searchBtn = this.panel.querySelector('.pf-batch-search-btn');
                cancelBtn.style.display = 'none';
                searchBtn.style.display = 'block';

                // Update cache status after search
                this.updateCacheStatus();
            }
        }

        // Fallback: ORB-only batch search (if CLIP unavailable)
        async startBatchSearchORBOnly() {
            this.showStatus('Using ORB-only search (CLIP unavailable)...', 'loading');

            try {
                const { mat: phoneMat } = this.matcher.imageToMat(this.phoneImage, 600);
                const phoneFeatures = this.matcher.extractFeatures(phoneMat, true);

                if (phoneFeatures.keypoints.size() < 50) {
                    throw new Error('Not enough features in phone image');
                }

                if (!this.cellId) {
                    const urlMatch = window.location.href.match(/cell[+\s]([a-z0-9+]+)/i);
                    if (urlMatch) this.cellId = urlMatch[1];
                }

                if (!this.cellId) throw new Error('Could not determine cell ID');

                const featureUrl = `https://production.geocam.io/arcgis/rest/services/cell+${this.cellId}/FeatureServer/0/query`;
                const queryParams = new URLSearchParams({
                    f: 'json',
                    where: '1=1',
                    outFields: 'id,heading',
                    returnGeometry: 'true',
                    returnZ: 'true',
                    orderByFields: 'id ASC',
                    resultRecordCount: '5000'
                });

                const response = await fetch(`${featureUrl}?${queryParams}`);
                const data = await response.json();

                if (!data.features || data.features.length === 0) {
                    throw new Error('No shots found in cell');
                }

                const allShots = data.features.map(f => ({
                    id: f.attributes.id,
                    heading: f.attributes.heading,
                    x: f.geometry.x,
                    y: f.geometry.y,
                    z: f.geometry.z || 0
                }));

                const sampleRate = Math.max(1, Math.floor(allShots.length / 100));
                const sampledShots = allShots.filter((_, i) => i % sampleRate === 0);

                const batchListDiv = this.panel.querySelector('.pf-batch-list');
                batchListDiv.innerHTML = `
                    <div style="color: #f44336; font-weight: bold; margin-bottom: 8px;">
                        ⚠️ ORB-only mode (CLIP unavailable)
                    </div>
                    <div style="color: #666;">Searching ${sampledShots.length} shots...</div>
                `;

                for (let i = 0; i < sampledShots.length; i++) {
                    const shot = sampledShots[i];
                    this.showProgress(10 + (i / sampledShots.length) * 85);
                    this.showStatus(`ORB: ${i + 1}/${sampledShots.length}...`, 'loading');

                    try {
                        const params = new URLSearchParams(window.location.hash.substring(1));
                        params.set('shot', shot.id);
                        params.set('fov', '90');
                        window.location.hash = params.toString();

                        await this.delay(300);

                        const { mat: panoMat } = this.matcher.capturePanoramaView();
                        const panoFeatures = this.matcher.extractFeatures(panoMat, true);

                        if (panoFeatures.keypoints.size() > 50) {
                            const matches = this.matcher.matchFeatures(
                                phoneFeatures.descriptors, panoFeatures.descriptors
                            );
                            const goodMatches = this.matcher.filterMatches(matches);

                            if (goodMatches.length >= 8) {
                                const homResult = this.matcher.computeHomographyWithMask(
                                    phoneFeatures.keypoints, panoFeatures.keypoints, goodMatches
                                );

                                if (homResult && homResult.inliers >= 4) {
                                    this.batchResults.push({
                                        shotId: shot.id,
                                        x: shot.x,
                                        y: shot.y,
                                        heading: shot.heading,
                                        matches: goodMatches.length,
                                        inliers: homResult.inliers,
                                        confidence: homResult.inliers / homResult.total,
                                        score: homResult.inliers
                                    });
                                    this.updateBatchResultsDisplay(batchListDiv);
                                }
                                if (homResult?.mask) homResult.mask.delete();
                            }
                        }

                        panoFeatures.keypoints.delete();
                        panoFeatures.descriptors.delete();
                        panoMat.delete();

                    } catch (e) {
                        console.warn(`[BatchSearch] Error on shot ${shot.id}:`, e);
                    }
                }

                this.batchResults.sort((a, b) => b.score - a.score);
                this.updateBatchResultsDisplay(batchListDiv);

                if (this.batchResults.length > 0) {
                    const best = this.batchResults[0];
                    this.showStatus(`Best: Shot ${best.shotId} (${best.inliers} inliers)`, 'success');
                    const params = new URLSearchParams(window.location.hash.substring(1));
                    params.set('shot', best.shotId);
                    window.location.hash = params.toString();
                } else {
                    this.showStatus('No matches found', 'error');
                }

                phoneFeatures.keypoints.delete();
                phoneFeatures.descriptors.delete();
                phoneMat.delete();
                this.showProgress(100);

            } catch (err) {
                console.error('[BatchSearch] ORB-only error:', err);
                this.showStatus(`Search failed: ${err.message}`, 'error');
            } finally {
                this.isMatching = false;
            }
        }

        updateBatchResultsDisplay(container) {
            if (!this.batchResults || this.batchResults.length === 0) {
                container.innerHTML = '<div style="color: #666;">No matches yet...</div>';
                return;
            }

            // Show top 10 results
            const top10 = this.batchResults.slice(0, 10);
            const hasSimilarity = top10[0]?.similarity !== undefined;

            container.innerHTML = top10.map((r, i) => `
                <div class="pf-batch-item" data-shot="${r.shotId}" style="
                    padding: 6px 8px;
                    margin: 4px 0;
                    background: ${i === 0 ? '#e8f5e9' : '#f5f5f5'};
                    border-radius: 4px;
                    cursor: pointer;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 11px;
                    border-left: 3px solid ${i === 0 ? '#4caf50' : '#ccc'};
                ">
                    <span><strong>#${i + 1}</strong> Shot ${r.shotId}</span>
                    <span style="text-align: right;">
                        ${hasSimilarity ? `<span style="color: #2196f3;">${(r.similarity * 100).toFixed(0)}% sim</span> · ` : ''}
                        <span style="color: #4caf50; font-weight: bold;">${r.inliers} inliers</span>
                    </span>
                </div>
            `).join('');

            // Add click handlers to navigate to shot
            container.querySelectorAll('.pf-batch-item').forEach(item => {
                item.addEventListener('click', () => {
                    const shotId = item.dataset.shot;
                    const params = new URLSearchParams(window.location.hash.substring(1));
                    params.set('shot', shotId);
                    window.location.hash = params.toString();
                    this.showStatus(`Navigated to shot ${shotId}`, 'info');
                });
            });
        }

        // ============================================
        // DETAILED RESULTS DISPLAY
        // ============================================
        updateDetailedResultsSummary() {
            if (!this.detailedResults) return;

            const summary = this.panel.querySelector('.pf-detailed-summary');
            const content = this.panel.querySelector('.pf-detailed-content');
            const stats = this.detailedResults.stats;

            // Update summary stats
            summary.innerHTML = `
                <div class="pf-summary-stat info">
                    📷 ${stats.totalShots} total
                </div>
                <div class="pf-summary-stat info">
                    🔍 ${stats.sampledForClip} sampled
                </div>
                <div class="pf-summary-stat success">
                    📦 ${stats.cachedEmbeddings} cached
                </div>
                <div class="pf-summary-stat info">
                    🔄 ${stats.computedEmbeddings} computed
                </div>
                <div class="pf-summary-stat warning">
                    ⚙️ ${stats.sentToOrb} to ORB
                </div>
                <div class="pf-summary-stat success">
                    ✅ ${stats.orbMatched} matched
                </div>
                <div class="pf-summary-stat warning">
                    ⚠️ ${stats.orbRejected} rejected
                </div>
                <div class="pf-summary-stat error">
                    ❌ ${stats.clipFailed + stats.orbFailed} failed
                </div>
            `;

            // Update detailed content with all shots
            this.updateDetailedResultsContent(content);
        }

        updateDetailedResultsContent(container) {
            if (!this.detailedResults) return;

            let html = '';

            // Matched shots (green)
            if (this.detailedResults.matched.length > 0) {
                html += `<div style="padding: 4px 12px; background: #e8f5e9; font-weight: 600; font-size: 10px; border-bottom: 1px solid #c8e6c9;">✅ MATCHED (${this.detailedResults.matched.length})</div>`;
                this.detailedResults.matched.forEach(shot => {
                    html += `
                        <div class="pf-shot-row match">
                            <span class="pf-shot-id">Shot ${shot.shotId}</span>
                            <span class="pf-shot-status matched">MATCHED</span>
                            <div class="pf-shot-metrics">
                                <span class="pf-shot-metric clip">${(shot.clipSimilarity * 100).toFixed(0)}% CLIP</span>
                                <span class="pf-shot-metric orb">${shot.matches} matches</span>
                                <span class="pf-shot-metric inliers">${shot.inliers} inliers</span>
                            </div>
                        </div>
                    `;
                });
            }

            // Rejected shots (yellow)
            if (this.detailedResults.rejected.length > 0) {
                html += `<div style="padding: 4px 12px; background: #fff8e1; font-weight: 600; font-size: 10px; border-bottom: 1px solid #ffecb3;">⚠️ REJECTED (${this.detailedResults.rejected.length})</div>`;
                this.detailedResults.rejected.forEach(shot => {
                    html += `
                        <div class="pf-shot-row rejected">
                            <span class="pf-shot-id">Shot ${shot.shotId}</span>
                            <span class="pf-shot-status rejected">REJECTED</span>
                            <div class="pf-shot-metrics">
                                <span class="pf-shot-metric clip">${(shot.clipSimilarity * 100).toFixed(0)}% CLIP</span>
                                ${shot.matches > 0 ? `<span class="pf-shot-metric orb">${shot.matches} matches</span>` : ''}
                                ${shot.inliers > 0 ? `<span class="pf-shot-metric inliers">${shot.inliers} inliers</span>` : ''}
                            </div>
                            <span class="pf-shot-reason" title="${shot.reason}">${shot.reason}</span>
                        </div>
                    `;
                });
            }

            // Failed shots (red)
            if (this.detailedResults.failed.length > 0) {
                html += `<div style="padding: 4px 12px; background: #ffebee; font-weight: 600; font-size: 10px; border-bottom: 1px solid #ffcdd2;">❌ FAILED (${this.detailedResults.failed.length})</div>`;
                this.detailedResults.failed.forEach(shot => {
                    html += `
                        <div class="pf-shot-row failed">
                            <span class="pf-shot-id">Shot ${shot.shotId}</span>
                            <span class="pf-shot-status failed">FAILED</span>
                            <span class="pf-shot-reason" title="${shot.reason}">[${shot.stage}] ${shot.reason}</span>
                        </div>
                    `;
                });
            }

            // CLIP stage shots not sent to ORB (for reference)
            const clipOnlyShots = this.detailedResults.clipStage.filter(
                c => !this.detailedResults.orbStage.some(o => o.shotId === c.shotId)
            );
            if (clipOnlyShots.length > 0) {
                html += `<div style="padding: 4px 12px; background: #e3f2fd; font-weight: 600; font-size: 10px; border-bottom: 1px solid #bbdefb;">📋 CLIP ONLY - Not in top 20 (${clipOnlyShots.length})</div>`;
                // Show first 20 only to keep it manageable
                clipOnlyShots.slice(0, 20).forEach(shot => {
                    html += `
                        <div class="pf-shot-row">
                            <span class="pf-shot-id">Shot ${shot.shotId}</span>
                            <span class="pf-shot-status" style="color: #1976d2;">CLIP only</span>
                            <div class="pf-shot-metrics">
                                <span class="pf-shot-metric clip">${(shot.similarity * 100).toFixed(0)}% CLIP</span>
                            </div>
                        </div>
                    `;
                });
                if (clipOnlyShots.length > 20) {
                    html += `<div style="padding: 4px 12px; font-size: 9px; color: #888;">... and ${clipOnlyShots.length - 20} more</div>`;
                }
            }

            if (!html) {
                html = '<div style="padding: 12px; color: #666; text-align: center;">Search in progress...</div>';
            }

            container.innerHTML = html;
        }

        createImageOverlay() {
            if (!this.lastHomography || !this.phoneImage) return;

            // Remove existing overlay
            if (this.imageOverlay) {
                this.imageOverlay.remove();
            }

            const { H, phoneW, phoneH, panoW, panoH, panoCanvas, matchViewParams } = this.lastHomography;
            const canvasRect = panoCanvas.getBoundingClientRect();

            // Get the 4 transformed corners for perspective warp
            this.warpedCorners = this.matcher.homographyToMatrix3d(
                H, phoneW, phoneH, panoW, panoH, canvasRect
            );

            if (!this.warpedCorners) {
                console.warn('[PhoneFisheye] Could not compute perspective corners');
                return;
            }

            // STORE CORNERS IN SPHERICAL COORDINATES for view-invariant overlay
            this.storeSphericalCorners(
                this.warpedCorners,
                canvasRect.width, canvasRect.height,
                matchViewParams || this.currentViewParams
            );

            // Store normalized corners for fallback
            this.lastHomography.normalizedCorners = this.warpedCorners.map(c => ({
                x: c.x / canvasRect.width,
                y: c.y / canvasRect.height
            }));

            // Create a canvas for the warped image
            this.imageOverlay = document.createElement('canvas');
            this.imageOverlay.className = 'pf-image-overlay';
            this.imageOverlay.width = canvasRect.width;
            this.imageOverlay.height = canvasRect.height;
            this.imageOverlay.style.cssText = `
                position: absolute;
                left: ${canvasRect.left}px;
                top: ${canvasRect.top}px;
                width: ${canvasRect.width}px;
                height: ${canvasRect.height}px;
                opacity: ${this.overlayOpacity};
                pointer-events: none;
                border: none;
                box-shadow: none;
            `;

            // Draw the warped image
            this.drawWarpedImage();

            this.overlay.appendChild(this.imageOverlay);
            this.overlayVisible = true;
            this.updateToggleButton();
        }

        drawWarpedImage() {
            if (!this.imageOverlay || !this.phoneImage || !this.lastHomography) return;

            const ctx = this.imageOverlay.getContext('2d');
            ctx.clearRect(0, 0, this.imageOverlay.width, this.imageOverlay.height);

            const img = this.phoneImage;
            const imgW = img.width;
            const imgH = img.height;
            const { H, panoW, panoH } = this.lastHomography;

            // If we don't have homography, fall back to corner-based warp
            if (!H || !H.rows) {
                if (this.warpedCorners) this.drawWarpedImageFromCorners();
                return;
            }

            // Get the homography matrix values
            const h = [];
            for (let i = 0; i < 9; i++) {
                h.push(H.doubleAt(Math.floor(i / 3), i % 3));
            }

            // Scale factors from pano coords to canvas
            const canvasW = this.imageOverlay.width;
            const canvasH = this.imageOverlay.height;
            const scaleX = canvasW / panoW;
            const scaleY = canvasH / panoH;

            // Transform a point from phone image to panorama canvas coords
            const transformPoint = (px, py) => {
                const w = h[6] * px + h[7] * py + h[8];
                if (Math.abs(w) < 0.0001) return null;
                return {
                    x: ((h[0] * px + h[1] * py + h[2]) / w) * scaleX,
                    y: ((h[3] * px + h[4] * py + h[5]) / w) * scaleY
                };
            };

            // Use a finer grid for smoother warping (like MatchAnything)
            const subdivisions = 20;

            ctx.save();

            // Draw subdivided quads using actual homography transform
            for (let i = 0; i < subdivisions; i++) {
                for (let j = 0; j < subdivisions; j++) {
                    const u0 = i / subdivisions;
                    const u1 = (i + 1) / subdivisions;
                    const v0 = j / subdivisions;
                    const v1 = (j + 1) / subdivisions;

                    // Source quad corners (in phone image space)
                    const sx0 = u0 * imgW, sy0 = v0 * imgH;
                    const sx1 = u1 * imgW, sy1 = v0 * imgH;
                    const sx2 = u1 * imgW, sy2 = v1 * imgH;
                    const sx3 = u0 * imgW, sy3 = v1 * imgH;

                    // Transform each corner using homography
                    const d0 = transformPoint(sx0, sy0);
                    const d1 = transformPoint(sx1, sy1);
                    const d2 = transformPoint(sx2, sy2);
                    const d3 = transformPoint(sx3, sy3);

                    // Skip if any point is invalid
                    if (!d0 || !d1 || !d2 || !d3) continue;

                    // Skip if quad is too large or outside canvas
                    const maxDim = Math.max(canvasW, canvasH);
                    if (Math.abs(d1.x - d0.x) > maxDim || Math.abs(d2.y - d0.y) > maxDim) continue;

                    // Draw two triangles for this quad
                    this.drawTexturedTriangle(ctx, img,
                        sx0, sy0, sx1, sy1, sx2, sy2,
                        d0.x, d0.y, d1.x, d1.y, d2.x, d2.y
                    );
                    this.drawTexturedTriangle(ctx, img,
                        sx0, sy0, sx2, sy2, sx3, sy3,
                        d0.x, d0.y, d2.x, d2.y, d3.x, d3.y
                    );
                }
            }

            // Draw border around the warped quad (green dashed like MatchAnything)
            const corners = [
                transformPoint(0, 0),
                transformPoint(imgW, 0),
                transformPoint(imgW, imgH),
                transformPoint(0, imgH)
            ].filter(c => c !== null);

            if (corners.length === 4) {
                ctx.strokeStyle = '#00ff00';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                ctx.moveTo(corners[0].x, corners[0].y);
                ctx.lineTo(corners[1].x, corners[1].y);
                ctx.lineTo(corners[2].x, corners[2].y);
                ctx.lineTo(corners[3].x, corners[3].y);
                ctx.closePath();
                ctx.stroke();
                ctx.setLineDash([]);
            }

            ctx.restore();
        }

        // Fallback method using corner interpolation (when view changes)
        drawWarpedImageFromCorners() {
            if (!this.warpedCorners || !this.phoneImage) return;

            const ctx = this.imageOverlay.getContext('2d');
            const corners = this.warpedCorners;
            const img = this.phoneImage;
            const imgW = img.width;
            const imgH = img.height;

            const subdivisions = 12;
            const lerp = (a, b, t) => a + (b - a) * t;
            const bilinear = (tl, tr, bl, br, u, v) => ({
                x: lerp(lerp(tl.x, tr.x, u), lerp(bl.x, br.x, u), v),
                y: lerp(lerp(tl.y, tr.y, u), lerp(bl.y, br.y, u), v)
            });

            ctx.save();

            for (let i = 0; i < subdivisions; i++) {
                for (let j = 0; j < subdivisions; j++) {
                    const u0 = i / subdivisions;
                    const u1 = (i + 1) / subdivisions;
                    const v0 = j / subdivisions;
                    const v1 = (j + 1) / subdivisions;

                    const sx0 = u0 * imgW, sy0 = v0 * imgH;
                    const sx1 = u1 * imgW, sy1 = v0 * imgH;
                    const sx2 = u1 * imgW, sy2 = v1 * imgH;
                    const sx3 = u0 * imgW, sy3 = v1 * imgH;

                    const d0 = bilinear(corners[0], corners[1], corners[3], corners[2], u0, v0);
                    const d1 = bilinear(corners[0], corners[1], corners[3], corners[2], u1, v0);
                    const d2 = bilinear(corners[0], corners[1], corners[3], corners[2], u1, v1);
                    const d3 = bilinear(corners[0], corners[1], corners[3], corners[2], u0, v1);

                    this.drawTexturedTriangle(ctx, img,
                        sx0, sy0, sx1, sy1, sx2, sy2,
                        d0.x, d0.y, d1.x, d1.y, d2.x, d2.y
                    );
                    this.drawTexturedTriangle(ctx, img,
                        sx0, sy0, sx2, sy2, sx3, sy3,
                        d0.x, d0.y, d2.x, d2.y, d3.x, d3.y
                    );
                }
            }

            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(corners[0].x, corners[0].y);
            ctx.lineTo(corners[1].x, corners[1].y);
            ctx.lineTo(corners[2].x, corners[2].y);
            ctx.lineTo(corners[3].x, corners[3].y);
            ctx.closePath();
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.restore();
        }

        // Draw a textured triangle using affine transformation
        drawTexturedTriangle(ctx, img, sx0, sy0, sx1, sy1, sx2, sy2, dx0, dy0, dx1, dy1, dx2, dy2) {
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(dx0, dy0);
            ctx.lineTo(dx1, dy1);
            ctx.lineTo(dx2, dy2);
            ctx.closePath();
            ctx.clip();

            // Compute affine transform from source to destination triangle
            const denom = (sx0 * (sy1 - sy2) + sx1 * (sy2 - sy0) + sx2 * (sy0 - sy1));
            if (Math.abs(denom) < 0.001) {
                ctx.restore();
                return;
            }

            const m11 = (dx0 * (sy1 - sy2) + dx1 * (sy2 - sy0) + dx2 * (sy0 - sy1)) / denom;
            const m12 = (dx0 * (sx2 - sx1) + dx1 * (sx0 - sx2) + dx2 * (sx1 - sx0)) / denom;
            const m13 = (dx0 * (sx1 * sy2 - sx2 * sy1) + dx1 * (sx2 * sy0 - sx0 * sy2) + dx2 * (sx0 * sy1 - sx1 * sy0)) / denom;
            const m21 = (dy0 * (sy1 - sy2) + dy1 * (sy2 - sy0) + dy2 * (sy0 - sy1)) / denom;
            const m22 = (dy0 * (sx2 - sx1) + dy1 * (sx0 - sx2) + dy2 * (sx1 - sx0)) / denom;
            const m23 = (dy0 * (sx1 * sy2 - sx2 * sy1) + dy1 * (sx2 * sy0 - sx0 * sy2) + dy2 * (sx0 * sy1 - sx1 * sy0)) / denom;

            ctx.setTransform(m11, m21, m12, m22, m13, m23);
            ctx.drawImage(img, 0, 0);
            ctx.restore();
        }

        updateOverlayPosition() {
            // Recalculate overlay position when view changes
            if (!this.imageOverlay || !this.lastHomography) return;

            const canvas = document.querySelector('canvas');
            if (!canvas) return;

            const canvasRect = canvas.getBoundingClientRect();

            // Use SPHERICAL CORNERS for view-invariant overlay positioning
            if (this.sphericalCorners && this.currentViewParams) {
                // Convert spherical corners back to screen coordinates
                const newCorners = this.sphericalCorners.map(sc => {
                    const screenPos = this.sphericalToScreen(
                        sc.azimuth, sc.elevation,
                        canvasRect.width, canvasRect.height,
                        this.currentViewParams
                    );
                    return screenPos || { x: -1000, y: -1000 }; // Off-screen if not visible
                });

                // Check if all corners are visible
                const allVisible = newCorners.every(c => c.x >= -100 && c.x <= canvasRect.width + 100);

                if (allVisible) {
                    this.warpedCorners = newCorners;
                } else {
                    // Overlay is out of view, hide it
                    this.imageOverlay.style.opacity = '0';
                    return;
                }
            } else if (this.lastHomography.normalizedCorners) {
                // Fallback to normalized corners
                this.warpedCorners = this.lastHomography.normalizedCorners.map(c => ({
                    x: c.x * canvasRect.width,
                    y: c.y * canvasRect.height
                }));
            } else {
                return;
            }

            // Update canvas size and position
            this.imageOverlay.width = canvasRect.width;
            this.imageOverlay.height = canvasRect.height;
            this.imageOverlay.style.left = `${canvasRect.left}px`;
            this.imageOverlay.style.top = `${canvasRect.top}px`;
            this.imageOverlay.style.width = `${canvasRect.width}px`;
            this.imageOverlay.style.height = `${canvasRect.height}px`;
            this.imageOverlay.style.opacity = String(this.overlayOpacity);

            // Redraw the warped image
            this.drawWarpedImage();
        }

        drawKeypointVisualization() {
            // Use spherical keypoints if available (they track correctly when panning)
            if (!this.sphericalKeypoints && !this.matchedPoints) return;

            const canvas = document.querySelector('canvas');
            if (!canvas) return;

            const canvasRect = canvas.getBoundingClientRect();

            // Size and position the keypoint canvas to match the panorama canvas
            this.keypointCanvas.width = canvasRect.width;
            this.keypointCanvas.height = canvasRect.height;
            this.keypointCanvas.style.left = `${canvasRect.left}px`;
            this.keypointCanvas.style.top = `${canvasRect.top}px`;
            this.keypointCanvas.style.width = `${canvasRect.width}px`;
            this.keypointCanvas.style.height = `${canvasRect.height}px`;
            this.keypointCanvas.style.display = this.showKeypoints ? 'block' : 'none';

            const ctx = this.keypointCanvas.getContext('2d');
            ctx.clearRect(0, 0, this.keypointCanvas.width, this.keypointCanvas.height);

            // Get current view parameters
            if (!this.currentViewParams) {
                const params = new URLSearchParams(window.location.hash.substring(1));
                this.currentViewParams = {
                    facing: parseFloat(params.get('facing') || '0'),
                    horizon: parseFloat(params.get('horizon') || '0'),
                    fov: parseFloat(params.get('fov') || '90')
                };
            }

            let inViewCount = 0;

            // Draw keypoints using SPHERICAL coordinates (view-invariant)
            if (this.sphericalKeypoints) {
                this.sphericalKeypoints.forEach((kp, idx) => {
                    // Convert spherical back to screen
                    const screenPos = this.sphericalToScreen(
                        kp.azimuth, kp.elevation,
                        canvasRect.width, canvasRect.height,
                        this.currentViewParams
                    );

                    if (!screenPos) return; // Out of current view

                    inViewCount++;
                    const isInlier = kp.isInlier;

                    // Generate color based on match quality
                    const hue = isInlier ? 120 : 0; // Green for inliers, red for outliers
                    const saturation = 80;
                    const lightness = 50;

                    ctx.beginPath();
                    ctx.arc(screenPos.x, screenPos.y, isInlier ? 5 : 3, 0, Math.PI * 2);
                    ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
                    ctx.fill();

                    // Draw outline for inliers
                    if (isInlier) {
                        ctx.strokeStyle = 'white';
                        ctx.lineWidth = 2;
                        ctx.stroke();
                    }
                });

                // Update match stats to show visible count
                if (this.matchStatsEl) {
                    const totalInliers = this.sphericalKeypoints.filter(k => k.isInlier).length;
                    this.matchStatsEl.innerHTML = `
                        Visible: <span class="match-count">${inViewCount}</span> |
                        Inliers: <span class="inlier-count">${totalInliers}</span>
                    `;
                }
            } else if (this.matchedPoints && this.lastHomography) {
                // Fallback to original pixel-based drawing
                const { panoW, panoH } = this.lastHomography;
                const scaleX = canvasRect.width / panoW;
                const scaleY = canvasRect.height / panoH;

                this.matchedPoints.forEach((point, idx) => {
                    const isInlier = this.inlierIndices && this.inlierIndices.has(idx);
                    const screenX = point.pano.x * scaleX;
                    const screenY = point.pano.y * scaleY;

                    const hue = isInlier ? 120 : 0;
                    ctx.beginPath();
                    ctx.arc(screenX, screenY, isInlier ? 4 : 3, 0, Math.PI * 2);
                    ctx.fillStyle = `hsl(${hue}, 80%, 50%)`;
                    ctx.fill();
                    if (isInlier) {
                        ctx.strokeStyle = 'white';
                        ctx.lineWidth = 1;
                        ctx.stroke();
                    }
                });
            }
        }

        updateKeypointVisualization() {
            if (this.showKeypoints && (this.sphericalKeypoints || this.matchedPoints)) {
                this.drawKeypointVisualization();
            }
        }

        updateMatchStats(totalMatches, inliers) {
            if (this.matchStatsEl) {
                this.matchStatsEl.querySelector('.match-count').textContent = totalMatches;
                this.matchStatsEl.querySelector('.inlier-count').textContent = inliers;
                this.matchStatsEl.classList.add('visible');
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

        async addMapMarker() {
            // Try to find the ArcGIS MapView through various methods
            let mapView = null;

            // Method 1: Check for exposed mapView on geocam-map element
            const geocamMap = document.querySelector('geocam-map');
            if (geocamMap) {
                // Try various property names
                mapView = geocamMap.view || geocamMap.mapView || geocamMap._view;

                // Check shadow DOM
                if (!mapView && geocamMap.shadowRoot) {
                    const shadowView = geocamMap.shadowRoot.querySelector('.esri-view');
                    if (shadowView && shadowView.__view) {
                        mapView = shadowView.__view;
                    }
                }
            }

            // Method 2: Check window for exposed view
            if (!mapView) {
                mapView = window.mapView || window.view || window.esriMapView;
            }

            // Method 3: Look through all esri-view containers
            if (!mapView) {
                const esriViews = document.querySelectorAll('.esri-view');
                for (const viewEl of esriViews) {
                    if (viewEl.__view) {
                        mapView = viewEl.__view;
                        break;
                    }
                    // Try getting from parent or child
                    const container = viewEl.closest('[data-view]') || viewEl.querySelector('[data-view]');
                    if (container && container.__view) {
                        mapView = container.__view;
                        break;
                    }
                }
            }

            // Method 4: Check for AMD require and iterate map instances
            if (!mapView && typeof require !== 'undefined') {
                try {
                    await new Promise((resolve, reject) => {
                        require([
                            'esri/views/MapView'
                        ], (MapView) => {
                            // Look for any MapView instance in the DOM
                            document.querySelectorAll('.esri-view-root, .esri-view').forEach(el => {
                                // Walk up to find the view container
                                let current = el;
                                while (current && !mapView) {
                                    if (current.__view) {
                                        mapView = current.__view;
                                    }
                                    // Check for view in dataset
                                    const keys = Object.keys(current);
                                    for (const key of keys) {
                                        if (key.startsWith('__') && current[key]?.map) {
                                            mapView = current[key];
                                            break;
                                        }
                                    }
                                    current = current.parentElement;
                                }
                            });
                            resolve();
                        }, reject);
                    });
                } catch (e) {
                    console.warn('[PhoneFisheye] Could not load ArcGIS modules:', e);
                }
            }

            // Method 5: Last resort - find by searching object properties
            if (!mapView) {
                const mapContainer = document.querySelector('geocam-map') || document.querySelector('.esri-view');
                if (mapContainer) {
                    // Search for view in all properties
                    const searchForView = (obj, depth = 0) => {
                        if (depth > 3 || !obj) return null;
                        if (obj.map && obj.center && typeof obj.goTo === 'function') {
                            return obj;
                        }
                        for (const key of Object.keys(obj)) {
                            if (key.startsWith('_') || key.startsWith('__')) {
                                const found = searchForView(obj[key], depth + 1);
                                if (found) return found;
                            }
                        }
                        return null;
                    };
                    mapView = searchForView(mapContainer);
                }
            }

            console.log('[PhoneFisheye] MapView found:', !!mapView, mapView);

            // If no shot coordinates, try to get them
            if (!this.shotCoordinates) {
                await this.fetchShotCoordinates();
            }

            // Fallback: If no ArcGIS view found, use the shot coordinates to create a DOM marker
            // that follows the map
            if (!mapView) {
                console.warn('[PhoneFisheye] Could not find ArcGIS MapView, using fallback');
                this.addFallbackMapMarker();
                return;
            }

            // Use ArcGIS API to add proper graphic layer
            try {
                await this.addArcGISMarker(mapView);
            } catch (e) {
                console.error('[PhoneFisheye] ArcGIS marker error:', e);
                this.addFallbackMapMarker();
            }
        }

        // Estimate where the phone was when the photo was taken
        estimatePhonePosition() {
            if (!this.shotCoordinates || !this.lastResult) return null;

            // Get the geocam position and heading
            const geocamLng = this.shotCoordinates.x;
            const geocamLat = this.shotCoordinates.y;
            const geocamHeading = this.shotCoordinates.heading || 0;

            // The estimated facing from matching tells us where the phone was looking
            const phoneFacing = this.lastResult.facing;

            // The phone was looking AT the geocam, so it was in the opposite direction
            // from where the geocam sees it
            const directionFromGeocam = phoneFacing; // degrees from north

            // Estimate distance - this is approximate
            // Could be improved with depth estimation or user input
            const distanceMeters = this.estimatedDistance;

            // Convert to lat/lng offset
            // 1 degree latitude ≈ 111,000 meters
            // 1 degree longitude ≈ 111,000 * cos(latitude) meters
            const latOffset = (distanceMeters / 111000) * Math.cos(directionFromGeocam * Math.PI / 180);
            const lngOffset = (distanceMeters / (111000 * Math.cos(geocamLat * Math.PI / 180))) * Math.sin(directionFromGeocam * Math.PI / 180);

            this.estimatedPhonePosition = {
                x: geocamLng + lngOffset,
                y: geocamLat + latOffset,
                heading: (phoneFacing + 180) % 360, // Phone was facing toward geocam
                distance: distanceMeters,
                confidence: this.lastResult.confidence
            };

            console.log('[PhoneFisheye] Estimated phone position:', this.estimatedPhonePosition);
            return this.estimatedPhonePosition;
        }

        async addArcGISMarker(mapView) {
            if (!this.shotCoordinates) {
                this.showStatus('Shot coordinates not available', 'error');
                return;
            }

            // Estimate phone position
            const phonePos = this.estimatePhonePosition();

            // Load ArcGIS modules
            const [GraphicsLayer, Graphic, Point, SimpleMarkerSymbol, SimpleLineSymbol, Polyline, Polygon, SimpleFillSymbol] = await new Promise((resolve, reject) => {
                require([
                    'esri/layers/GraphicsLayer',
                    'esri/Graphic',
                    'esri/geometry/Point',
                    'esri/symbols/SimpleMarkerSymbol',
                    'esri/symbols/SimpleLineSymbol',
                    'esri/geometry/Polyline',
                    'esri/geometry/Polygon',
                    'esri/symbols/SimpleFillSymbol'
                ], (...modules) => resolve(modules), reject);
            });

            // Remove existing layer if present
            if (this.arcgisGraphicsLayer) {
                mapView.map.remove(this.arcgisGraphicsLayer);
            }

            // Create a new graphics layer for the phone marker
            this.arcgisGraphicsLayer = new GraphicsLayer({
                id: 'phone-fisheye-marker',
                title: 'Phone Photo Location'
            });

            // Use estimated phone position if available, otherwise geocam position
            const markerLng = phonePos ? phonePos.x : this.shotCoordinates.x;
            const markerLat = phonePos ? phonePos.y : this.shotCoordinates.y;

            // Create the point at phone position
            const point = new Point({
                longitude: markerLng,
                latitude: markerLat,
                spatialReference: { wkid: 4326 }
            });

            // GeoCam position
            const geocamPoint = new Point({
                longitude: this.shotCoordinates.x,
                latitude: this.shotCoordinates.y,
                spatialReference: { wkid: 4326 }
            });

            // Add GeoCam marker (blue)
            const geocamMarker = new Graphic({
                geometry: geocamPoint,
                symbol: {
                    type: 'simple-marker',
                    style: 'diamond',
                    color: [33, 150, 243, 0.9],
                    size: 14,
                    outline: { color: [255, 255, 255], width: 2 }
                },
                attributes: { type: 'geocam-position' }
            });
            this.arcgisGraphicsLayer.add(geocamMarker);

            // If we have phone position, draw FOV cone and sight line
            if (phonePos) {
                // PHONE FOV CONE - show field of view as a wedge
                const phoneFov = this.estimatedFov || 70;
                const fovDistance = phonePos.distance * 1.5; // Extend cone beyond geocam
                const phoneHeading = phonePos.heading; // Direction phone is facing

                // Calculate FOV cone edges
                const leftAngle = (phoneHeading - phoneFov / 2) * Math.PI / 180;
                const rightAngle = (phoneHeading + phoneFov / 2) * Math.PI / 180;

                // Convert to lat/lng offsets (meters to degrees)
                const metersPerDegreeLat = 111000;
                const metersPerDegreeLng = 111000 * Math.cos(markerLat * Math.PI / 180);

                const leftEndLng = markerLng + (fovDistance * Math.sin(leftAngle)) / metersPerDegreeLng;
                const leftEndLat = markerLat + (fovDistance * Math.cos(leftAngle)) / metersPerDegreeLat;
                const rightEndLng = markerLng + (fovDistance * Math.sin(rightAngle)) / metersPerDegreeLng;
                const rightEndLat = markerLat + (fovDistance * Math.cos(rightAngle)) / metersPerDegreeLat;

                // Create FOV cone polygon
                const fovCone = new Polygon({
                    rings: [[
                        [markerLng, markerLat],
                        [leftEndLng, leftEndLat],
                        [rightEndLng, rightEndLat],
                        [markerLng, markerLat]
                    ]],
                    spatialReference: { wkid: 4326 }
                });

                const fovConeGraphic = new Graphic({
                    geometry: fovCone,
                    symbol: {
                        type: 'simple-fill',
                        color: [255, 152, 0, 0.25], // Semi-transparent orange
                        outline: {
                            color: [255, 152, 0, 0.8],
                            width: 1.5
                        }
                    }
                });
                this.arcgisGraphicsLayer.add(fovConeGraphic);

                // Sight line from phone to geocam
                const sightLine = new Polyline({
                    paths: [[
                        [phonePos.x, phonePos.y],
                        [this.shotCoordinates.x, this.shotCoordinates.y]
                    ]],
                    spatialReference: { wkid: 4326 }
                });

                const lineGraphic = new Graphic({
                    geometry: sightLine,
                    symbol: {
                        type: 'simple-line',
                        color: [76, 175, 80, 0.9],
                        width: 3,
                        style: 'solid'
                    }
                });
                this.arcgisGraphicsLayer.add(lineGraphic);

                // Draw rays from geocam to inlier match directions
                if (this.sphericalKeypoints) {
                    const rayLength = 30; // meters
                    let rayCount = 0;
                    const maxRays = 20;

                    for (const kp of this.sphericalKeypoints) {
                        if (!kp.isInlier || rayCount >= maxRays) continue;

                        // Convert spherical coords to direction
                        const azRad = kp.azimuth * Math.PI / 180;
                        const rayEndLng = this.shotCoordinates.x + (rayLength * Math.sin(azRad)) / metersPerDegreeLng;
                        const rayEndLat = this.shotCoordinates.y + (rayLength * Math.cos(azRad)) / metersPerDegreeLat;

                        const ray = new Polyline({
                            paths: [[
                                [this.shotCoordinates.x, this.shotCoordinates.y],
                                [rayEndLng, rayEndLat]
                            ]],
                            spatialReference: { wkid: 4326 }
                        });

                        const rayGraphic = new Graphic({
                            geometry: ray,
                            symbol: {
                                type: 'simple-line',
                                color: [255, 235, 59, 0.6], // Yellow
                                width: 1
                            }
                        });
                        this.arcgisGraphicsLayer.add(rayGraphic);
                        rayCount++;
                    }
                }
            }

            // Create a distinctive phone marker symbol
            const symbol = {
                type: 'simple-marker',
                style: 'circle',
                color: [255, 87, 34, 0.9],
                size: 16,
                outline: {
                    color: [255, 255, 255],
                    width: 3
                }
            };

            // Create an outer ring for emphasis
            const outerSymbol = {
                type: 'simple-marker',
                style: 'circle',
                color: [255, 87, 34, 0.2],
                size: 36,
                outline: {
                    color: [255, 87, 34, 0.5],
                    width: 2
                }
            };

            // Create graphics
            const outerGraphic = new Graphic({
                geometry: point,
                symbol: outerSymbol,
                attributes: {
                    type: 'phone-location-outer',
                    facing: this.lastResult?.facing,
                    horizon: this.lastResult?.horizon
                }
            });

            const graphic = new Graphic({
                geometry: point,
                symbol: symbol,
                attributes: {
                    type: 'phone-location',
                    facing: this.lastResult?.facing,
                    horizon: this.lastResult?.horizon
                },
                popupTemplate: {
                    title: 'Phone Photo Location',
                    content: `
                        <p><strong>Phone XY:</strong> ${markerLng.toFixed(6)}, ${markerLat.toFixed(6)}</p>
                        <p><strong>GeoCam XY:</strong> ${this.shotCoordinates.x.toFixed(6)}, ${this.shotCoordinates.y.toFixed(6)}</p>
                        <p><strong>Est. Distance:</strong> ${phonePos ? phonePos.distance.toFixed(1) + 'm' : 'N/A'}</p>
                        <p><strong>Phone FOV:</strong> ${this.estimatedFov}°</p>
                        <p><strong>Phone Facing:</strong> ${this.lastResult?.facing.toFixed(1)}°</p>
                        <p><strong>Matches:</strong> ${this.lastResult?.matches} (${this.lastResult?.inliers} inliers)</p>
                        <p><strong>Confidence:</strong> ${(this.lastResult?.confidence * 100).toFixed(0)}%</p>
                    `
                }
            });

            // Add graphics to layer
            this.arcgisGraphicsLayer.addMany([outerGraphic, graphic]);

            // Add layer to map
            mapView.map.add(this.arcgisGraphicsLayer);

            this.arcgisMapView = mapView;
            this.showStatus('Phone marker added to map at geographic coordinates!', 'success');

            console.log('[PhoneFisheye] Added ArcGIS marker at:', this.shotCoordinates);
        }

        addFallbackMapMarker() {
            // Fallback: Create a DOM-based marker that tries to follow the map
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

            // Get map center as fallback position
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
            marker.title = `Phone photo location\nFacing: ${this.lastResult?.facing.toFixed(1)}°\nHorizon: ${this.lastResult?.horizon.toFixed(1)}°\n\nNote: Using fallback marker (ArcGIS not detected)`;

            marker.addEventListener('click', () => {
                this.navigateToResult();
            });

            markerContainer.appendChild(marker);

            document.body.appendChild(markerContainer);
            this.mapMarker = markerContainer;

            this.showStatus('Phone marker added (fallback mode - zoom may not work properly)', 'info');
        }

        showResults(result) {
            // Get phone position for display
            const phonePos = this.estimatePhonePosition();
            const geocam = this.shotCoordinates;

            const content = this.panel.querySelector('.pf-results-content');
            content.innerHTML = `
                <div class="pf-result-item">
                    <span class="label">Phone XY</span>
                    <span class="value" style="font-size: 11px;">${phonePos ? phonePos.x.toFixed(6) : 'N/A'}, ${phonePos ? phonePos.y.toFixed(6) : 'N/A'}</span>
                </div>
                <div class="pf-result-item">
                    <span class="label">GeoCam XY</span>
                    <span class="value" style="font-size: 11px;">${geocam ? geocam.x.toFixed(6) : 'N/A'}, ${geocam ? geocam.y.toFixed(6) : 'N/A'}</span>
                </div>
                <div class="pf-result-item">
                    <span class="label">Distance</span>
                    <span class="value">${phonePos ? phonePos.distance.toFixed(1) + 'm' : 'N/A'}</span>
                </div>
                <div class="pf-result-item">
                    <span class="label">Phone FOV</span>
                    <span class="value">${this.estimatedFov}°</span>
                </div>
                <div class="pf-result-item">
                    <span class="label">Facing</span>
                    <span class="value">${result.facing.toFixed(1)}°</span>
                </div>
                <div class="pf-result-item">
                    <span class="label">Horizon</span>
                    <span class="value">${result.horizon.toFixed(1)}°</span>
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
