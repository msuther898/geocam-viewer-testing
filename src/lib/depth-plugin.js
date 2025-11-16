import * as tf from '@tensorflow/tfjs';
import * as depthEstimation from '@tensorflow-models/depth-estimation';
import { node } from './utilities.js';

export const depthPlugin = {
  viewer: null,
  depthEstimator: null,
  depthOverlay: null,
  depthCanvas: null,
  isProcessing: false,
  isDepthVisible: false,
  button: null,

  init: function (viewer) {
    this.viewer = viewer;
    this.createDepthButton();
    this.createDepthOverlay();
    this.setupKeyboardHandler();
  },

  createDepthButton: function () {
    // Create depth estimation button with icon
    const button = node("BUTTON", {
      class: "geocam-viewer-control-button depth-viewer-button",
      title: "Generate Depth Map (Click to show, Space to hide)",
      "aria-label": "Generate Depth Map"
    });

    // Add custom styling and SVG icon
    button.style.cssText = `
      background-color: rgba(255, 255, 255, 0.8);
      border-radius: 4px;
      border: 2px solid #333;
      width: 40px;
      height: 40px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
    `;

    // SVG icon for depth (layers with "D" label)
    button.innerHTML = `
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="4" width="20" height="3" rx="1" fill="#333" opacity="0.3"/>
        <rect x="2" y="10" width="20" height="3" rx="1" fill="#333" opacity="0.6"/>
        <rect x="2" y="16" width="20" height="3" rx="1" fill="#333" opacity="0.9"/>
        <text x="12" y="13" text-anchor="middle" font-size="8" font-weight="bold" fill="#fff">D</text>
      </svg>
    `;

    // Click handler
    button.addEventListener("click", () => {
      this.toggleDepthView();
    });

    // Add to viewer controls (right-top location)
    this.viewer.addControl(button, "right-top");
    this.button = button;
  },

  createDepthOverlay: function () {
    // Create canvas overlay for depth visualization
    const overlay = document.createElement("div");
    overlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      display: none;
      z-index: 1;
    `;

    const canvas = document.createElement("canvas");
    canvas.style.cssText = `
      width: 100%;
      height: 100%;
      opacity: 0.7;
    `;

    overlay.appendChild(canvas);
    this.viewer.element.appendChild(overlay);

    this.depthOverlay = overlay;
    this.depthCanvas = canvas;
  },

  setupKeyboardHandler: function () {
    this.keyHandler = (e) => {
      if (e.code === "Space" && this.isDepthVisible) {
        e.preventDefault();
        this.clearDepthView();
      }
    };

    document.addEventListener("keydown", this.keyHandler);
  },

  toggleDepthView: async function () {
    if (this.isDepthVisible) {
      this.clearDepthView();
    } else {
      await this.generateDepthMap();
    }
  },

  generateDepthMap: async function () {
    if (this.isProcessing) return;

    this.isProcessing = true;
    this.updateButtonState("processing");

    try {
      // Load model if not already loaded
      if (!this.depthEstimator) {
        await this.loadModel();
      }

      // Capture current view from Three.js renderer
      const canvas = this.viewer.renderer.domElement;

      // Run depth estimation
      const depthMap = await this.depthEstimator.estimateDepth(canvas);

      // Visualize depth map
      this.visualizeDepthMap(depthMap);

      this.isDepthVisible = true;
      this.updateButtonState("active");
      this.depthOverlay.style.display = "block";

    } catch (error) {
      console.error("Depth estimation error:", error);
      alert("Error generating depth map. Please try again.");
      this.updateButtonState("ready");
    } finally {
      this.isProcessing = false;
    }
  },

  loadModel: async function () {
    console.log("Loading depth estimation model...");

    // Use ARPortraitDepth model (fast and runs in browser)
    const model = depthEstimation.SupportedModels.ARPortraitDepth;
    const estimatorConfig = {
      outputDepthRange: [0, 1]
    };

    this.depthEstimator = await depthEstimation.createEstimator(
      model,
      estimatorConfig
    );

    console.log("Depth model loaded successfully!");
  },

  visualizeDepthMap: function (depthMap) {
    const { width, height, data } = depthMap.toCanvasImageSource();

    // Set canvas size to match renderer
    this.depthCanvas.width = width;
    this.depthCanvas.height = height;

    const ctx = this.depthCanvas.getContext('2d');
    const imageData = ctx.createImageData(width, height);

    // Convert depth data to color gradient (blue = close, red = far)
    for (let i = 0; i < data.length; i++) {
      const depth = data[i];
      const pixelIndex = i * 4;

      // Normalize depth to 0-1 range
      const normalizedDepth = Math.min(Math.max(depth, 0), 1);

      // Color mapping: blue (close) -> green -> red (far)
      if (normalizedDepth < 0.5) {
        imageData.data[pixelIndex] = 0;  // R
        imageData.data[pixelIndex + 1] = Math.floor(normalizedDepth * 2 * 255);  // G
        imageData.data[pixelIndex + 2] = Math.floor((1 - normalizedDepth * 2) * 255);  // B
      } else {
        imageData.data[pixelIndex] = Math.floor((normalizedDepth - 0.5) * 2 * 255);  // R
        imageData.data[pixelIndex + 1] = Math.floor((1 - (normalizedDepth - 0.5) * 2) * 255);  // G
        imageData.data[pixelIndex + 2] = 0;  // B
      }

      imageData.data[pixelIndex + 3] = 255;  // A (full opacity)
    }

    ctx.putImageData(imageData, 0, 0);
  },

  clearDepthView: function () {
    this.depthOverlay.style.display = "none";
    this.isDepthVisible = false;
    this.updateButtonState("ready");
  },

  updateButtonState: function (state) {
    if (!this.button) return;

    switch (state) {
      case "processing":
        this.button.style.backgroundColor = "rgba(255, 255, 0, 0.8)";
        this.button.style.borderColor = "#cc0";
        break;
      case "active":
        this.button.style.backgroundColor = "rgba(0, 255, 0, 0.8)";
        this.button.style.borderColor = "#0c0";
        break;
      case "ready":
      default:
        this.button.style.backgroundColor = "rgba(255, 255, 255, 0.8)";
        this.button.style.borderColor = "#333";
        break;
    }
  },

  destroy: function () {
    // Cleanup
    if (this.button) {
      this.button.remove();
    }
    if (this.depthOverlay) {
      this.depthOverlay.remove();
    }
    if (this.keyHandler) {
      document.removeEventListener("keydown", this.keyHandler);
    }
    if (this.depthEstimator) {
      this.depthEstimator.dispose();
    }
  }
};
