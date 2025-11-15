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
    // Create depth icon button with SVG
    const depthIcon = `data:image/svg+xml,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
        <rect x="4" y="4" width="24" height="24" fill="none" stroke="black" stroke-width="2"/>
        <path d="M8 12 L24 12 M8 16 L24 16 M8 20 L24 20" stroke="black" stroke-width="2" opacity="0.3"/>
        <path d="M8 12 L24 12" stroke="blue" stroke-width="2.5" opacity="0.6"/>
        <path d="M8 16 L24 16" stroke="cyan" stroke-width="2.5" opacity="0.5"/>
        <path d="M8 20 L24 20" stroke="teal" stroke-width="2.5" opacity="0.4"/>
        <text x="16" y="28" font-family="Arial" font-size="8" fill="black" text-anchor="middle" font-weight="bold">D</text>
      </svg>
    `)}`;

    this.button = node('BUTTON', {
      class: 'geocam-viewer-control-button depth-button',
      style: `background-image: url('${depthIcon}')`,
      title: 'Generate Depth Map (Click to toggle, Space to clear)'
    });

    this.button.addEventListener('click', () => this.toggleDepth());

    // Add the button to the right-top control area
    this.viewer.addControl(this.button, 'right-top');
  },

  createDepthOverlay: function () {
    // Create an overlay canvas for displaying the depth map
    this.depthOverlay = node('DIV', {
      class: 'depth-overlay',
      style: `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        display: none;
        z-index: 100;
      `
    });

    this.depthCanvas = node('CANVAS', {
      style: `
        width: 100%;
        height: 100%;
        opacity: 0.7;
      `
    });

    this.depthOverlay.appendChild(this.depthCanvas);
    this.viewer.wrapper.appendChild(this.depthOverlay);
  },

  setupKeyboardHandler: function () {
    const handleKeyPress = (e) => {
      if (e.code === 'Space' && this.isDepthVisible) {
        e.preventDefault();
        this.clearDepth();
      }
    };

    document.addEventListener('keydown', handleKeyPress);

    // Store the handler for cleanup
    this._keyHandler = handleKeyPress;
  },

  toggleDepth: async function () {
    if (this.isDepthVisible) {
      this.clearDepth();
    } else {
      await this.generateDepth();
    }
  },

  clearDepth: function () {
    this.depthOverlay.style.display = 'none';
    this.isDepthVisible = false;
    if (this.button) {
      this.button.style.backgroundColor = 'rgba(255,255,255,0.5)';
    }
  },

  generateDepth: async function () {
    if (this.isProcessing) {
      console.log('Depth estimation already in progress');
      return;
    }

    try {
      this.isProcessing = true;

      // Change button appearance to show it's processing
      if (this.button) {
        this.button.style.backgroundColor = 'rgba(255,255,0,0.5)';
      }

      // Load the depth estimator if not already loaded
      if (!this.depthEstimator) {
        console.log('Loading depth estimation model...');
        this.depthEstimator = await depthEstimation.createEstimator(
          depthEstimation.SupportedModels.ARPortraitDepth,
          {
            runtime: 'tfjs',
          }
        );
        console.log('Depth model loaded successfully');
      }

      // Get the current frame from the Three.js renderer
      const rendererCanvas = this.viewer.renderer.domElement;

      // Estimate depth
      console.log('Estimating depth...');
      const depthMap = await this.depthEstimator.estimateDepth(rendererCanvas);

      // Convert depth map to visualization
      this.visualizeDepth(depthMap);

      // Show the overlay
      this.depthOverlay.style.display = 'block';
      this.isDepthVisible = true;

      // Change button appearance to show depth is active
      if (this.button) {
        this.button.style.backgroundColor = 'rgba(0,255,0,0.5)';
      }

      console.log('Depth estimation complete');

    } catch (error) {
      console.error('Error generating depth map:', error);
      alert('Error generating depth map. See console for details.');

      // Reset button appearance
      if (this.button) {
        this.button.style.backgroundColor = 'rgba(255,255,255,0.5)';
      }
    } finally {
      this.isProcessing = false;
    }
  },

  visualizeDepth: function (depthMap) {
    const { width, height, data } = depthMap;

    // Set canvas size to match depth map
    this.depthCanvas.width = width;
    this.depthCanvas.height = height;

    const ctx = this.depthCanvas.getContext('2d');
    const imageData = ctx.createImageData(width, height);

    // Find min and max depth values for normalization
    let minDepth = Infinity;
    let maxDepth = -Infinity;

    for (let i = 0; i < data.length; i++) {
      if (data[i] < minDepth) minDepth = data[i];
      if (data[i] > maxDepth) maxDepth = data[i];
    }

    const range = maxDepth - minDepth;

    // Convert depth values to color (blue = close, red = far)
    for (let i = 0; i < data.length; i++) {
      const normalizedDepth = (data[i] - minDepth) / range;
      const pixelIndex = i * 4;

      // Create a blue-to-red gradient based on depth
      imageData.data[pixelIndex] = normalizedDepth * 255;     // R
      imageData.data[pixelIndex + 1] = 50;                     // G
      imageData.data[pixelIndex + 2] = (1 - normalizedDepth) * 255; // B
      imageData.data[pixelIndex + 3] = 255;                    // A
    }

    ctx.putImageData(imageData, 0, 0);
  },

  destroy: function () {
    // Clean up resources
    if (this._keyHandler) {
      document.removeEventListener('keydown', this._keyHandler);
    }

    if (this.depthEstimator) {
      this.depthEstimator.dispose();
      this.depthEstimator = null;
    }

    if (this.depthOverlay && this.depthOverlay.parentNode) {
      this.depthOverlay.parentNode.removeChild(this.depthOverlay);
    }
  }
};
