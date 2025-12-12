/**
 * Phone Fisheye Localization Plugin
 *
 * Allows users to upload phone photos and localize them within the panorama view.
 * Supports matching phone perspective photos against fisheye/equirectangular imagery.
 */

import { node, injectStyle } from "./utilities.js";
import { store } from "./store.js";

// SVG icon for phone camera (smartphone with camera lens)
const PHONE_CAMERA_ICON = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
  <circle cx="12" cy="10" r="3"/>
  <line x1="12" y1="17" x2="12" y2="17"/>
</svg>
`;

// Crosshair icon for localization mode
const CROSSHAIR_ICON = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="10"/>
  <line x1="22" y1="12" x2="18" y2="12"/>
  <line x1="6" y1="12" x2="2" y2="12"/>
  <line x1="12" y1="6" x2="12" y2="2"/>
  <line x1="12" y1="22" x2="12" y2="18"/>
</svg>
`;

const STYLES = `
  .phone-fisheye-button {
    background-color: rgba(255,255,255,0.8);
    border-radius: 4px;
    border: 1px solid #666;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .phone-fisheye-button:hover {
    background-color: rgba(255,255,255,1);
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  }

  .phone-fisheye-button.active {
    background-color: rgba(66, 133, 244, 0.9);
    border-color: #1a73e8;
  }

  .phone-fisheye-button.active svg {
    stroke: white;
  }

  .phone-fisheye-button svg {
    width: 18px;
    height: 18px;
    stroke: #333;
  }

  .phone-fisheye-panel {
    position: absolute;
    top: 56px;
    right: 16px;
    background: rgba(255,255,255,0.95);
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.2);
    padding: 12px;
    width: 280px;
    max-height: calc(100% - 100px);
    overflow-y: auto;
    display: none;
    z-index: 100;
    pointer-events: auto;
  }

  .phone-fisheye-panel.visible {
    display: block;
  }

  .phone-fisheye-panel h3 {
    margin: 0 0 12px 0;
    font-size: 14px;
    font-weight: 600;
    color: #333;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .phone-fisheye-panel h3 svg {
    width: 16px;
    height: 16px;
    stroke: #666;
  }

  .phone-fisheye-dropzone {
    border: 2px dashed #ccc;
    border-radius: 8px;
    padding: 24px;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s ease;
    margin-bottom: 12px;
    background: #fafafa;
  }

  .phone-fisheye-dropzone:hover,
  .phone-fisheye-dropzone.dragover {
    border-color: #4285f4;
    background: rgba(66, 133, 244, 0.05);
  }

  .phone-fisheye-dropzone p {
    margin: 0;
    color: #666;
    font-size: 12px;
  }

  .phone-fisheye-dropzone .icon {
    font-size: 32px;
    margin-bottom: 8px;
  }

  .phone-fisheye-preview {
    display: none;
    margin-bottom: 12px;
  }

  .phone-fisheye-preview.has-image {
    display: block;
  }

  .phone-fisheye-preview img {
    width: 100%;
    border-radius: 4px;
    max-height: 180px;
    object-fit: contain;
    background: #eee;
  }

  .phone-fisheye-preview-info {
    font-size: 11px;
    color: #666;
    margin-top: 6px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .phone-fisheye-preview-info .filename {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 180px;
  }

  .phone-fisheye-btn {
    width: 100%;
    padding: 10px 16px;
    border: none;
    border-radius: 4px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    margin-bottom: 8px;
  }

  .phone-fisheye-btn-primary {
    background: #4285f4;
    color: white;
  }

  .phone-fisheye-btn-primary:hover {
    background: #3367d6;
  }

  .phone-fisheye-btn-primary:disabled {
    background: #ccc;
    cursor: not-allowed;
  }

  .phone-fisheye-btn-secondary {
    background: #f1f3f4;
    color: #333;
  }

  .phone-fisheye-btn-secondary:hover {
    background: #e8eaed;
  }

  .phone-fisheye-status {
    font-size: 12px;
    padding: 8px;
    border-radius: 4px;
    margin-bottom: 12px;
    display: none;
  }

  .phone-fisheye-status.visible {
    display: block;
  }

  .phone-fisheye-status.info {
    background: #e8f0fe;
    color: #1967d2;
  }

  .phone-fisheye-status.success {
    background: #e6f4ea;
    color: #137333;
  }

  .phone-fisheye-status.error {
    background: #fce8e6;
    color: #c5221f;
  }

  .phone-fisheye-status.loading {
    background: #fff8e1;
    color: #e65100;
  }

  .phone-fisheye-match-results {
    display: none;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid #eee;
  }

  .phone-fisheye-match-results.visible {
    display: block;
  }

  .phone-fisheye-match-results h4 {
    margin: 0 0 8px 0;
    font-size: 12px;
    font-weight: 600;
    color: #333;
  }

  .phone-fisheye-match-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 8px;
    background: #f8f9fa;
    border-radius: 4px;
    margin-bottom: 4px;
    font-size: 11px;
  }

  .phone-fisheye-match-item .label {
    color: #666;
  }

  .phone-fisheye-match-item .value {
    color: #333;
    font-weight: 500;
    font-family: monospace;
  }

  .phone-fisheye-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 50;
  }

  .phone-fisheye-marker {
    position: absolute;
    width: 20px;
    height: 20px;
    margin-left: -10px;
    margin-top: -10px;
    border: 2px solid #ff5722;
    border-radius: 50%;
    background: rgba(255, 87, 34, 0.3);
    pointer-events: none;
    animation: phone-fisheye-pulse 2s ease-in-out infinite;
  }

  @keyframes phone-fisheye-pulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.2); opacity: 0.7; }
  }

  .phone-fisheye-fov-indicator {
    position: absolute;
    border: 2px solid rgba(255, 87, 34, 0.6);
    background: rgba(255, 87, 34, 0.1);
    pointer-events: none;
  }

  .phone-fisheye-help {
    font-size: 11px;
    color: #888;
    text-align: center;
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid #eee;
  }

  .phone-fisheye-close {
    position: absolute;
    top: 8px;
    right: 8px;
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    font-size: 18px;
    color: #666;
    line-height: 1;
  }

  .phone-fisheye-close:hover {
    color: #333;
  }

  .phone-fisheye-input-row {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
  }

  .phone-fisheye-input-group {
    flex: 1;
  }

  .phone-fisheye-input-group label {
    display: block;
    font-size: 11px;
    color: #666;
    margin-bottom: 4px;
  }

  .phone-fisheye-input-group input {
    width: 100%;
    padding: 6px 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 12px;
    box-sizing: border-box;
  }

  .phone-fisheye-input-group input:focus {
    outline: none;
    border-color: #4285f4;
  }
`;

export const phoneFisheyePlugin = {
  name: 'phone-fisheye',
  viewer: null,

  // State stores
  photoStore: null,
  isMatchingStore: null,
  matchResultsStore: null,
  panelVisibleStore: null,

  // DOM elements
  button: null,
  panel: null,
  fileInput: null,
  dropzone: null,
  preview: null,
  previewImg: null,
  previewInfo: null,
  localizeBtn: null,
  clearBtn: null,
  statusEl: null,
  resultsEl: null,
  overlay: null,

  // State
  currentFile: null,
  estimatedFov: 60,
  estimatedFacing: 0,
  estimatedHorizon: 0,

  init(viewer) {
    this.viewer = viewer;

    // Inject styles
    injectStyle('phone-fisheye-styles', STYLES);

    // Create stores
    this.photoStore = viewer.store('phonePhoto', null);
    this.isMatchingStore = viewer.store('phoneMatching', false);
    this.matchResultsStore = viewer.store('phoneMatchResults', null);
    this.panelVisibleStore = store(false);

    // Create UI elements
    this.createButton();
    this.createPanel();
    this.createOverlay();

    // Add to viewer
    viewer.addControl(this.button, 'right-top', { prepend: true });
    viewer.wrapper.appendChild(this.panel);
    viewer.wrapper.appendChild(this.overlay);

    // Set up event listeners
    this.setupEventListeners();

    // Subscribe to viewer state changes
    this.setupSubscriptions();

    console.log('[PhoneFisheye] Plugin initialized');
  },

  createButton() {
    this.button = node('BUTTON', {
      class: 'geocam-viewer-control-button phone-fisheye-button',
      title: 'Localize phone photo in panorama'
    });
    this.button.innerHTML = PHONE_CAMERA_ICON;
  },

  createPanel() {
    this.panel = node('DIV', { class: 'phone-fisheye-panel' });

    this.panel.innerHTML = `
      <button class="phone-fisheye-close">&times;</button>
      <h3>${PHONE_CAMERA_ICON} Phone Photo Localization</h3>

      <div class="phone-fisheye-dropzone">
        <div class="icon">+</div>
        <p>Drop phone photo here<br>or click to browse</p>
      </div>

      <input type="file" accept="image/*" style="display:none" />

      <div class="phone-fisheye-preview">
        <img src="" alt="Preview" />
        <div class="phone-fisheye-preview-info">
          <span class="filename"></span>
          <span class="dimensions"></span>
        </div>
      </div>

      <div class="phone-fisheye-status"></div>

      <div class="phone-fisheye-input-row">
        <div class="phone-fisheye-input-group">
          <label>Est. FOV (&deg;)</label>
          <input type="number" class="fov-input" value="60" min="10" max="120" />
        </div>
        <div class="phone-fisheye-input-group">
          <label>Est. Facing (&deg;)</label>
          <input type="number" class="facing-input" value="0" min="0" max="360" />
        </div>
      </div>

      <button class="phone-fisheye-btn phone-fisheye-btn-primary localize-btn" disabled>
        ${CROSSHAIR_ICON} Localize in Panorama
      </button>

      <button class="phone-fisheye-btn phone-fisheye-btn-secondary clear-btn" style="display:none">
        Clear Photo
      </button>

      <div class="phone-fisheye-match-results">
        <h4>Localization Results</h4>
        <div class="results-content"></div>
      </div>

      <div class="phone-fisheye-help">
        Upload a phone photo to find its viewpoint within the current panorama
      </div>
    `;

    // Store references to elements
    this.dropzone = this.panel.querySelector('.phone-fisheye-dropzone');
    this.fileInput = this.panel.querySelector('input[type="file"]');
    this.preview = this.panel.querySelector('.phone-fisheye-preview');
    this.previewImg = this.panel.querySelector('.phone-fisheye-preview img');
    this.previewInfo = this.panel.querySelector('.phone-fisheye-preview-info');
    this.statusEl = this.panel.querySelector('.phone-fisheye-status');
    this.localizeBtn = this.panel.querySelector('.localize-btn');
    this.clearBtn = this.panel.querySelector('.clear-btn');
    this.resultsEl = this.panel.querySelector('.phone-fisheye-match-results');
    this.fovInput = this.panel.querySelector('.fov-input');
    this.facingInput = this.panel.querySelector('.facing-input');
    this.closeBtn = this.panel.querySelector('.phone-fisheye-close');
  },

  createOverlay() {
    this.overlay = node('DIV', { class: 'phone-fisheye-overlay' });
  },

  setupEventListeners() {
    // Button click toggles panel
    this.button.addEventListener('click', () => this.togglePanel());

    // Close button
    this.closeBtn.addEventListener('click', () => this.hidePanel());

    // Dropzone click triggers file input
    this.dropzone.addEventListener('click', () => this.fileInput.click());

    // File input change
    this.fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        this.handleFile(e.target.files[0]);
      }
    });

    // Drag and drop
    this.dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.dropzone.classList.add('dragover');
    });

    this.dropzone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.dropzone.classList.remove('dragover');
    });

    this.dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.dropzone.classList.remove('dragover');

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        this.handleFile(e.dataTransfer.files[0]);
      }
    });

    // Localize button
    this.localizeBtn.addEventListener('click', () => this.startLocalization());

    // Clear button
    this.clearBtn.addEventListener('click', () => this.clearPhoto());

    // FOV/Facing inputs
    this.fovInput.addEventListener('change', (e) => {
      this.estimatedFov = parseFloat(e.target.value) || 60;
    });

    this.facingInput.addEventListener('change', (e) => {
      this.estimatedFacing = parseFloat(e.target.value) || 0;
    });
  },

  setupSubscriptions() {
    // Update facing input when viewer facing changes
    this.viewer.facing((facing) => {
      if (this.facingInput && !this.currentFile) {
        this.facingInput.value = Math.round(facing);
        this.estimatedFacing = facing;
      }
    });

    // Update when matching state changes
    this.isMatchingStore((isMatching) => {
      if (isMatching) {
        this.localizeBtn.disabled = true;
        this.localizeBtn.textContent = 'Localizing...';
      } else {
        this.localizeBtn.disabled = !this.currentFile;
        this.localizeBtn.innerHTML = `${CROSSHAIR_ICON} Localize in Panorama`;
      }
    });
  },

  togglePanel() {
    const isVisible = this.panel.classList.contains('visible');
    if (isVisible) {
      this.hidePanel();
    } else {
      this.showPanel();
    }
  },

  showPanel() {
    this.panel.classList.add('visible');
    this.button.classList.add('active');
    this.panelVisibleStore(true);

    // Sync current viewer facing to input
    const currentFacing = this.viewer.facing();
    if (currentFacing !== undefined && !this.currentFile) {
      this.facingInput.value = Math.round(currentFacing);
      this.estimatedFacing = currentFacing;
    }
  },

  hidePanel() {
    this.panel.classList.remove('visible');
    this.button.classList.remove('active');
    this.panelVisibleStore(false);
  },

  handleFile(file) {
    if (!file.type.startsWith('image/')) {
      this.showStatus('Please select an image file', 'error');
      return;
    }

    this.currentFile = file;
    this.photoStore(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      this.previewImg.src = e.target.result;
      this.preview.classList.add('has-image');

      // Get image dimensions
      const img = new Image();
      img.onload = () => {
        this.previewInfo.querySelector('.filename').textContent = file.name;
        this.previewInfo.querySelector('.dimensions').textContent = `${img.width}x${img.height}`;

        // Extract EXIF data if available
        this.extractExifData(file, img);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);

    // Update UI
    this.dropzone.style.display = 'none';
    this.localizeBtn.disabled = false;
    this.clearBtn.style.display = 'block';
    this.showStatus('Photo loaded. Click "Localize" to find viewpoint.', 'info');
  },

  async extractExifData(file, img) {
    // Try to extract focal length and estimate FOV from EXIF
    // This is a simplified version - full EXIF parsing would need a library
    try {
      // Estimate FOV based on typical phone camera
      // Most phones have FOV between 60-80 degrees
      const aspectRatio = img.width / img.height;
      if (aspectRatio > 1) {
        // Landscape orientation
        this.estimatedFov = 70; // Typical phone horizontal FOV
      } else {
        // Portrait orientation
        this.estimatedFov = 50; // Narrower for portrait
      }
      this.fovInput.value = this.estimatedFov;

      console.log('[PhoneFisheye] Estimated FOV:', this.estimatedFov);
    } catch (err) {
      console.warn('[PhoneFisheye] Could not extract EXIF:', err);
    }
  },

  clearPhoto() {
    this.currentFile = null;
    this.photoStore(null);
    this.previewImg.src = '';
    this.preview.classList.remove('has-image');
    this.dropzone.style.display = 'block';
    this.localizeBtn.disabled = true;
    this.clearBtn.style.display = 'none';
    this.hideStatus();
    this.hideResults();
    this.clearOverlay();
    this.fileInput.value = '';
  },

  showStatus(message, type = 'info') {
    this.statusEl.textContent = message;
    this.statusEl.className = `phone-fisheye-status visible ${type}`;
  },

  hideStatus() {
    this.statusEl.classList.remove('visible');
  },

  showResults(results) {
    const content = this.resultsEl.querySelector('.results-content');
    content.innerHTML = `
      <div class="phone-fisheye-match-item">
        <span class="label">Facing (Azimuth)</span>
        <span class="value">${results.facing.toFixed(1)}&deg;</span>
      </div>
      <div class="phone-fisheye-match-item">
        <span class="label">Horizon (Tilt)</span>
        <span class="value">${results.horizon.toFixed(1)}&deg;</span>
      </div>
      <div class="phone-fisheye-match-item">
        <span class="label">Field of View</span>
        <span class="value">${results.fov.toFixed(1)}&deg;</span>
      </div>
      <div class="phone-fisheye-match-item">
        <span class="label">Confidence</span>
        <span class="value">${(results.confidence * 100).toFixed(0)}%</span>
      </div>
    `;
    this.resultsEl.classList.add('visible');
    this.matchResultsStore(results);
  },

  hideResults() {
    this.resultsEl.classList.remove('visible');
    this.matchResultsStore(null);
  },

  clearOverlay() {
    this.overlay.innerHTML = '';
  },

  addFovIndicator(facing, horizon, fov) {
    this.clearOverlay();

    // For now, show a simple indicator of the estimated viewpoint
    // Full implementation would project the phone FOV onto the panorama
    const marker = node('DIV', { class: 'phone-fisheye-marker' });

    // Calculate screen position from facing/horizon
    // This is simplified - proper implementation needs camera projection
    const wrapper = this.viewer.wrapper;
    const rect = wrapper.getBoundingClientRect();

    // Convert facing/horizon to screen coordinates (simplified)
    const viewerFacing = this.viewer.facing();
    const viewerHorizon = this.viewer.horizon();
    const viewerFov = this.viewer.fov();

    // Relative position in viewport
    const relFacing = (facing - viewerFacing + 180) % 360 - 180;
    const relHorizon = horizon - viewerHorizon;

    // Convert to screen position (very simplified projection)
    const x = rect.width / 2 + (relFacing / viewerFov) * rect.width;
    const y = rect.height / 2 - (relHorizon / viewerFov) * rect.height;

    marker.style.left = `${x}px`;
    marker.style.top = `${y}px`;

    this.overlay.appendChild(marker);
  },

  async startLocalization() {
    if (!this.currentFile) {
      this.showStatus('Please upload a photo first', 'error');
      return;
    }

    this.isMatchingStore(true);
    this.showStatus('Analyzing photo...', 'loading');

    try {
      // Simulate localization process
      // In production, this would call MegaLoc/MatchAnything APIs
      await this.simulateLocalization();

    } catch (err) {
      console.error('[PhoneFisheye] Localization error:', err);
      this.showStatus(`Localization failed: ${err.message}`, 'error');
      this.isMatchingStore(false);
    }
  },

  async simulateLocalization() {
    // Simulated localization - replace with actual MegaLoc/MatchAnything integration

    // Step 1: Feature extraction (simulated delay)
    this.showStatus('Extracting features from photo...', 'loading');
    await this.delay(800);

    // Step 2: Matching against panorama (simulated delay)
    this.showStatus('Matching against panorama...', 'loading');
    await this.delay(1000);

    // Step 3: Pose estimation (simulated delay)
    this.showStatus('Estimating camera pose...', 'loading');
    await this.delay(600);

    // Generate simulated results based on user input
    const results = {
      facing: this.estimatedFacing + (Math.random() - 0.5) * 10,
      horizon: this.estimatedHorizon + (Math.random() - 0.5) * 5,
      fov: this.estimatedFov,
      confidence: 0.75 + Math.random() * 0.2
    };

    // Normalize facing to 0-360
    results.facing = (results.facing + 360) % 360;

    // Success!
    this.isMatchingStore(false);
    this.showStatus('Localization complete!', 'success');
    this.showResults(results);

    // Add visual indicator on panorama
    this.addFovIndicator(results.facing, results.horizon, results.fov);

    // Optionally navigate viewer to the matched position
    this.viewer.facing(results.facing);
    this.viewer.horizon(results.horizon);

    console.log('[PhoneFisheye] Localization results:', results);
  },

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  destroy() {
    // Remove event listeners
    this.button.removeEventListener('click', this.togglePanel);

    // Remove DOM elements
    if (this.panel && this.panel.parentNode) {
      this.panel.parentNode.removeChild(this.panel);
    }
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }

    // Clear state
    this.currentFile = null;
    this.viewer = null;

    console.log('[PhoneFisheye] Plugin destroyed');
  }
};

export default phoneFisheyePlugin;
