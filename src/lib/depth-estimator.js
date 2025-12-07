/**
 * Depth Estimator Module
 * Uses Depth Anything v2 via Transformers.js for monocular depth estimation
 */

import { pipeline, env } from '@huggingface/transformers';

// Configure Transformers.js to use local cache
env.allowLocalModels = true;
env.useBrowserCache = true;

/**
 * DepthEstimator class - handles depth estimation for images
 */
export class DepthEstimator {
  constructor(options = {}) {
    this.modelId = options.modelId || 'onnx-community/depth-anything-v2-small';
    this.device = options.device || 'webgpu'; // 'webgpu' for GPU, 'wasm' for CPU
    this.pipeline = null;
    this.isLoading = false;
    this.isReady = false;
    this.depthCache = new Map(); // Cache depth maps by image URL
    this.onProgress = options.onProgress || null;
    this.onReady = options.onReady || null;
    this.onError = options.onError || null;
  }

  /**
   * Initialize the depth estimation pipeline
   */
  async initialize() {
    if (this.isReady) return true;
    if (this.isLoading) {
      // Wait for existing load to complete
      return new Promise((resolve) => {
        const checkReady = setInterval(() => {
          if (this.isReady) {
            clearInterval(checkReady);
            resolve(true);
          }
        }, 100);
      });
    }

    this.isLoading = true;

    try {
      console.log(`[DepthEstimator] Loading model: ${this.modelId} on ${this.device}`);

      this.pipeline = await pipeline('depth-estimation', this.modelId, {
        device: this.device,
        progress_callback: (progress) => {
          if (this.onProgress) {
            this.onProgress(progress);
          }
          console.log(`[DepthEstimator] Loading: ${progress.status}`, progress);
        }
      });

      this.isReady = true;
      this.isLoading = false;
      console.log('[DepthEstimator] Model loaded successfully');

      if (this.onReady) {
        this.onReady();
      }

      return true;
    } catch (error) {
      this.isLoading = false;
      console.error('[DepthEstimator] Failed to load model:', error);

      // Fallback to WASM if WebGPU fails
      if (this.device === 'webgpu') {
        console.log('[DepthEstimator] Falling back to WASM...');
        this.device = 'wasm';
        return this.initialize();
      }

      if (this.onError) {
        this.onError(error);
      }
      throw error;
    }
  }

  /**
   * Estimate depth for an image
   * @param {string|HTMLImageElement|HTMLCanvasElement} image - Image URL or element
   * @param {string} cacheKey - Optional cache key (defaults to image URL if string)
   * @returns {Promise<DepthResult>} Depth estimation result
   */
  async estimateDepth(image, cacheKey = null) {
    if (!this.isReady) {
      await this.initialize();
    }

    const key = cacheKey || (typeof image === 'string' ? image : null);

    // Check cache
    if (key && this.depthCache.has(key)) {
      console.log('[DepthEstimator] Returning cached depth map for:', key);
      return this.depthCache.get(key);
    }

    console.log('[DepthEstimator] Estimating depth for:', key || 'image element');

    try {
      const result = await this.pipeline(image);

      // Create depth result object with helper methods
      const depthResult = new DepthResult(result, image);

      // Cache the result
      if (key) {
        this.depthCache.set(key, depthResult);
      }

      return depthResult;
    } catch (error) {
      console.error('[DepthEstimator] Depth estimation failed:', error);
      throw error;
    }
  }

  /**
   * Clear the depth cache
   */
  clearCache() {
    this.depthCache.clear();
  }

  /**
   * Remove a specific entry from cache
   */
  removeFromCache(key) {
    this.depthCache.delete(key);
  }

  /**
   * Dispose of the pipeline and free resources
   */
  async dispose() {
    if (this.pipeline) {
      // Transformers.js pipelines don't have explicit dispose, but we can clear refs
      this.pipeline = null;
    }
    this.depthCache.clear();
    this.isReady = false;
  }
}

/**
 * DepthResult class - wraps depth estimation output with utility methods
 */
export class DepthResult {
  constructor(pipelineResult, sourceImage) {
    this.raw = pipelineResult;
    this.depthTensor = pipelineResult.depth; // RawImage from transformers.js
    this.width = this.depthTensor.width;
    this.height = this.depthTensor.height;
    this.data = this.depthTensor.data; // Float32Array of depth values
    this.sourceImage = sourceImage;

    // Compute min/max for normalization
    this.minDepth = Infinity;
    this.maxDepth = -Infinity;
    for (let i = 0; i < this.data.length; i++) {
      if (this.data[i] < this.minDepth) this.minDepth = this.data[i];
      if (this.data[i] > this.maxDepth) this.maxDepth = this.data[i];
    }
  }

  /**
   * Get depth value at a specific pixel coordinate
   * @param {number} x - X coordinate (0 to width-1)
   * @param {number} y - Y coordinate (0 to height-1)
   * @returns {number} Raw depth value
   */
  getDepthAt(x, y) {
    const ix = Math.round(x);
    const iy = Math.round(y);

    if (ix < 0 || ix >= this.width || iy < 0 || iy >= this.height) {
      return null;
    }

    const index = iy * this.width + ix;
    return this.data[index];
  }

  /**
   * Get normalized depth value (0-1 range)
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {number} Normalized depth (0 = near, 1 = far)
   */
  getNormalizedDepthAt(x, y) {
    const depth = this.getDepthAt(x, y);
    if (depth === null) return null;

    return (depth - this.minDepth) / (this.maxDepth - this.minDepth);
  }

  /**
   * Get depth at UV coordinates (0-1 range)
   * @param {number} u - U coordinate (0-1)
   * @param {number} v - V coordinate (0-1)
   * @returns {number} Raw depth value
   */
  getDepthAtUV(u, v) {
    const x = u * (this.width - 1);
    const y = v * (this.height - 1);
    return this.getDepthAt(x, y);
  }

  /**
   * Sample depth with bilinear interpolation
   * @param {number} x - X coordinate (can be fractional)
   * @param {number} y - Y coordinate (can be fractional)
   * @returns {number} Interpolated depth value
   */
  sampleDepth(x, y) {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = Math.min(x0 + 1, this.width - 1);
    const y1 = Math.min(y0 + 1, this.height - 1);

    const fx = x - x0;
    const fy = y - y0;

    const d00 = this.getDepthAt(x0, y0) || 0;
    const d10 = this.getDepthAt(x1, y0) || 0;
    const d01 = this.getDepthAt(x0, y1) || 0;
    const d11 = this.getDepthAt(x1, y1) || 0;

    // Bilinear interpolation
    const d0 = d00 * (1 - fx) + d10 * fx;
    const d1 = d01 * (1 - fx) + d11 * fx;

    return d0 * (1 - fy) + d1 * fy;
  }

  /**
   * Create a canvas visualization of the depth map
   * @returns {HTMLCanvasElement} Canvas with depth visualization
   */
  toCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = this.width;
    canvas.height = this.height;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(this.width, this.height);

    for (let i = 0; i < this.data.length; i++) {
      const normalized = (this.data[i] - this.minDepth) / (this.maxDepth - this.minDepth);
      const value = Math.round(normalized * 255);

      imageData.data[i * 4] = value;     // R
      imageData.data[i * 4 + 1] = value; // G
      imageData.data[i * 4 + 2] = value; // B
      imageData.data[i * 4 + 3] = 255;   // A
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  /**
   * Get depth map as ImageData
   * @returns {ImageData}
   */
  toImageData() {
    const imageData = new ImageData(this.width, this.height);

    for (let i = 0; i < this.data.length; i++) {
      const normalized = (this.data[i] - this.minDepth) / (this.maxDepth - this.minDepth);
      const value = Math.round(normalized * 255);

      imageData.data[i * 4] = value;
      imageData.data[i * 4 + 1] = value;
      imageData.data[i * 4 + 2] = value;
      imageData.data[i * 4 + 3] = 255;
    }

    return imageData;
  }
}

// Singleton instance for convenience
let defaultEstimator = null;

/**
 * Get or create the default depth estimator instance
 */
export function getDepthEstimator(options = {}) {
  if (!defaultEstimator) {
    defaultEstimator = new DepthEstimator(options);
  }
  return defaultEstimator;
}

export default DepthEstimator;
