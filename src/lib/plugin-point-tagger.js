/**
 * Point Tagger Plugin for Geocam Viewer
 * Allows tagging points in images and triangulating 3D positions using depth
 */

import { DepthEstimator, DepthResult } from './depth-estimator.js';
import { Raycaster, Vector2, Vector3, Matrix4 } from './three.module.js';

/**
 * Tagged point structure
 * @typedef {Object} TaggedPoint
 * @property {string} id - Unique identifier
 * @property {string} name - User-defined name
 * @property {number} screenX - Screen X coordinate (pixels)
 * @property {number} screenY - Screen Y coordinate (pixels)
 * @property {number} normalizedX - Normalized X (-1 to 1)
 * @property {number} normalizedY - Normalized Y (-1 to 1)
 * @property {number} azimuth - Horizontal angle (degrees, 0=north, clockwise)
 * @property {number} elevation - Vertical angle (degrees, -90 to 90)
 * @property {number} depth - Depth value at this point
 * @property {number} normalizedDepth - Normalized depth (0-1)
 * @property {string} imageUrl - URL of the source image
 * @property {Object} shotMetadata - Associated shot/capture metadata
 */

/**
 * View data for triangulation
 * @typedef {Object} ViewData
 * @property {TaggedPoint} point - The tagged point
 * @property {Array<number>} cameraPosition - [x, y, z] camera world position
 * @property {Array<number>} rotation - 3x3 rotation matrix (row-major)
 * @property {number} yaw - Camera yaw angle
 */

const MARKER_STYLES = `
  .point-tagger-marker {
    position: absolute;
    width: 20px;
    height: 20px;
    margin-left: -10px;
    margin-top: -10px;
    border: 2px solid #ff4444;
    border-radius: 50%;
    background: rgba(255, 68, 68, 0.3);
    cursor: pointer;
    pointer-events: auto;
    z-index: 100;
    transition: transform 0.1s;
  }

  .point-tagger-marker:hover {
    transform: scale(1.2);
    background: rgba(255, 68, 68, 0.5);
  }

  .point-tagger-marker.selected {
    border-color: #44ff44;
    background: rgba(68, 255, 68, 0.3);
  }

  .point-tagger-marker-label {
    position: absolute;
    top: -24px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 11px;
    white-space: nowrap;
    pointer-events: none;
  }

  .point-tagger-crosshair {
    position: absolute;
    pointer-events: none;
    z-index: 99;
  }

  .point-tagger-crosshair-h,
  .point-tagger-crosshair-v {
    position: absolute;
    background: rgba(255, 255, 255, 0.5);
  }

  .point-tagger-crosshair-h {
    width: 100%;
    height: 1px;
    top: 50%;
  }

  .point-tagger-crosshair-v {
    width: 1px;
    height: 100%;
    left: 50%;
  }

  .point-tagger-info {
    position: absolute;
    bottom: 16px;
    left: 16px;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 12px;
    font-family: monospace;
    pointer-events: none;
    z-index: 101;
  }

  .point-tagger-toolbar {
    display: flex;
    gap: 8px;
  }

  .point-tagger-btn {
    background: rgba(255, 255, 255, 0.9);
    border: 1px solid #666;
    border-radius: 4px;
    padding: 4px 8px;
    cursor: pointer;
    font-size: 12px;
  }

  .point-tagger-btn:hover {
    background: rgba(255, 255, 255, 1);
  }

  .point-tagger-btn.active {
    background: #4CAF50;
    color: white;
    border-color: #45a049;
  }
`;

export const PointTaggerPlugin = function(options = {}) {
  let viewer = null;
  let depthEstimator = null;
  let taggedPoints = new Map(); // id -> TaggedPoint
  let triangulationSets = new Map(); // setId -> { pointName, views: ViewData[] }
  let isTaggingMode = false;
  let selectedPointId = null;
  let container = null;
  let infoDisplay = null;
  let markerContainer = null;
  let currentDepthResult = null;
  let currentImageUrl = null;
  let styleInjected = false;

  // Callbacks
  const onPointTagged = options.onPointTagged || null;
  const onTriangulated = options.onTriangulated || null;
  const onDepthReady = options.onDepthReady || null;

  const injectStyles = () => {
    if (styleInjected) return;
    const style = document.createElement('style');
    style.textContent = MARKER_STYLES;
    document.head.appendChild(style);
    styleInjected = true;
  };

  const generateId = () => {
    return 'pt_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  };

  /**
   * Convert screen coordinates to spherical (azimuth/elevation)
   */
  const screenToSpherical = (screenX, screenY) => {
    const canvas = viewer.renderer.domElement;
    const rect = canvas.getBoundingClientRect();

    // Normalized device coordinates (-1 to 1)
    const ndcX = ((screenX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((screenY - rect.top) / rect.height) * 2 + 1;

    // Use raycaster to find intersection with sphere
    const raycaster = new Raycaster();
    raycaster.setFromCamera(new Vector2(ndcX, ndcY), viewer.camera);

    // Get the direction vector
    const direction = raycaster.ray.direction.clone();

    // Convert to spherical coordinates
    // Azimuth: angle from north (0) going clockwise
    // Elevation: angle from horizon (-90 to 90)

    const azimuth = (Math.atan2(direction.x, direction.y) * 180 / Math.PI + 360) % 360;
    const elevation = Math.asin(direction.z) * 180 / Math.PI;

    return {
      normalizedX: ndcX,
      normalizedY: ndcY,
      azimuth,
      elevation,
      direction: direction.toArray()
    };
  };

  /**
   * Convert spherical coordinates back to screen position
   */
  const sphericalToScreen = (azimuth, elevation) => {
    // Convert to direction vector
    const azRad = azimuth * Math.PI / 180;
    const elRad = elevation * Math.PI / 180;

    const cosEl = Math.cos(elRad);
    const direction = new Vector3(
      Math.sin(azRad) * cosEl,
      Math.cos(azRad) * cosEl,
      Math.sin(elRad)
    );

    // Project to screen
    direction.project(viewer.camera);

    const canvas = viewer.renderer.domElement;
    const rect = canvas.getBoundingClientRect();

    const screenX = ((direction.x + 1) / 2) * rect.width + rect.left;
    const screenY = ((-direction.y + 1) / 2) * rect.height + rect.top;

    // Check if point is in front of camera
    const cameraDir = new Vector3();
    viewer.camera.getWorldDirection(cameraDir);
    const originalDir = new Vector3(
      Math.sin(azRad) * cosEl,
      Math.cos(azRad) * cosEl,
      Math.sin(elRad)
    );
    const isVisible = originalDir.dot(cameraDir) > 0;

    return { screenX, screenY, isVisible };
  };

  /**
   * Get depth at screen coordinates
   */
  const getDepthAtScreen = async (screenX, screenY) => {
    if (!currentDepthResult) {
      console.warn('[PointTagger] No depth data available');
      return null;
    }

    const canvas = viewer.renderer.domElement;
    const rect = canvas.getBoundingClientRect();

    // Convert screen to depth map coordinates
    const u = (screenX - rect.left) / rect.width;
    const v = (screenY - rect.top) / rect.height;

    const depth = currentDepthResult.getDepthAtUV(u, v);
    const normalizedDepth = currentDepthResult.getNormalizedDepthAt(
      u * currentDepthResult.width,
      v * currentDepthResult.height
    );

    return { depth, normalizedDepth };
  };

  /**
   * Create a marker element for a tagged point
   */
  const createMarker = (point) => {
    const marker = document.createElement('div');
    marker.className = 'point-tagger-marker';
    marker.dataset.pointId = point.id;

    const label = document.createElement('div');
    label.className = 'point-tagger-marker-label';
    label.textContent = point.name;
    marker.appendChild(label);

    marker.addEventListener('click', (e) => {
      e.stopPropagation();
      selectPoint(point.id);
    });

    marker.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      removePoint(point.id);
    });

    return marker;
  };

  /**
   * Update marker positions based on current view
   */
  const updateMarkers = () => {
    if (!markerContainer) return;

    const existingMarkers = markerContainer.querySelectorAll('.point-tagger-marker');
    const markerMap = new Map();
    existingMarkers.forEach(m => markerMap.set(m.dataset.pointId, m));

    taggedPoints.forEach((point, id) => {
      // Only show markers for current image
      if (point.imageUrl !== currentImageUrl) return;

      const { screenX, screenY, isVisible } = sphericalToScreen(point.azimuth, point.elevation);

      let marker = markerMap.get(id);
      if (!marker) {
        marker = createMarker(point);
        markerContainer.appendChild(marker);
      }

      if (isVisible) {
        const canvas = viewer.renderer.domElement;
        const rect = canvas.getBoundingClientRect();
        marker.style.display = 'block';
        marker.style.left = `${screenX - rect.left}px`;
        marker.style.top = `${screenY - rect.top}px`;
        marker.classList.toggle('selected', id === selectedPointId);
      } else {
        marker.style.display = 'none';
      }

      markerMap.delete(id);
    });

    // Remove orphaned markers
    markerMap.forEach(m => m.remove());
  };

  /**
   * Handle click to tag a point
   */
  const handleClick = async (event) => {
    if (!isTaggingMode) return;

    const canvas = viewer.renderer.domElement;
    const rect = canvas.getBoundingClientRect();

    // Check if click is within canvas
    if (event.clientX < rect.left || event.clientX > rect.right ||
        event.clientY < rect.top || event.clientY > rect.bottom) {
      return;
    }

    const spherical = screenToSpherical(event.clientX, event.clientY);
    const depthData = await getDepthAtScreen(event.clientX, event.clientY);

    const point = {
      id: generateId(),
      name: `Point ${taggedPoints.size + 1}`,
      screenX: event.clientX - rect.left,
      screenY: event.clientY - rect.top,
      normalizedX: spherical.normalizedX,
      normalizedY: spherical.normalizedY,
      azimuth: spherical.azimuth,
      elevation: spherical.elevation,
      direction: spherical.direction,
      depth: depthData?.depth || null,
      normalizedDepth: depthData?.normalizedDepth || null,
      imageUrl: currentImageUrl,
      shotMetadata: {
        shot: viewer.stores.shot?.(),
        capture: viewer.stores.capture?.(),
        facing: viewer.stores.facing?.(),
        horizon: viewer.stores.horizon?.(),
        rotation: viewer.stores.rotation?.(),
        yaw: viewer.stores.yaw?.()
      }
    };

    taggedPoints.set(point.id, point);
    updateMarkers();

    console.log('[PointTagger] Tagged point:', point);

    if (onPointTagged) {
      onPointTagged(point);
    }

    return point;
  };

  /**
   * Select a point
   */
  const selectPoint = (id) => {
    selectedPointId = id;
    updateMarkers();

    const point = taggedPoints.get(id);
    if (point) {
      updateInfoDisplay(point);
    }
  };

  /**
   * Remove a point
   */
  const removePoint = (id) => {
    taggedPoints.delete(id);
    if (selectedPointId === id) {
      selectedPointId = null;
    }
    updateMarkers();
  };

  /**
   * Update info display with point data
   */
  const updateInfoDisplay = (point) => {
    if (!infoDisplay) return;

    if (!point) {
      infoDisplay.style.display = 'none';
      return;
    }

    infoDisplay.style.display = 'block';
    infoDisplay.innerHTML = `
      <strong>${point.name}</strong><br>
      Azimuth: ${point.azimuth.toFixed(2)}&deg;<br>
      Elevation: ${point.elevation.toFixed(2)}&deg;<br>
      Depth: ${point.depth?.toFixed(4) || 'N/A'}<br>
      Normalized: ${point.normalizedDepth?.toFixed(4) || 'N/A'}
    `;
  };

  /**
   * Add a point to a triangulation set
   */
  const addToTriangulationSet = (setName, point, cameraPosition) => {
    if (!triangulationSets.has(setName)) {
      triangulationSets.set(setName, {
        pointName: setName,
        views: []
      });
    }

    const set = triangulationSets.get(setName);
    set.views.push({
      point: { ...point },
      cameraPosition: cameraPosition || [0, 0, 0],
      rotation: point.shotMetadata?.rotation || [],
      yaw: point.shotMetadata?.yaw || 0
    });

    console.log(`[PointTagger] Added view to set "${setName}". Total views: ${set.views.length}`);

    return set;
  };

  /**
   * Triangulate 3D position from multiple views
   * Uses depth-weighted ray intersection
   */
  const triangulate = (setName) => {
    const set = triangulationSets.get(setName);
    if (!set || set.views.length < 2) {
      console.warn('[PointTagger] Need at least 2 views for triangulation');
      return null;
    }

    console.log(`[PointTagger] Triangulating "${setName}" with ${set.views.length} views`);

    // For each view, compute a ray from camera through the tagged point
    const rays = set.views.map(view => {
      const { point, cameraPosition } = view;

      // Direction from spherical coordinates
      const azRad = point.azimuth * Math.PI / 180;
      const elRad = point.elevation * Math.PI / 180;
      const cosEl = Math.cos(elRad);

      const direction = [
        Math.sin(azRad) * cosEl,
        Math.cos(azRad) * cosEl,
        Math.sin(elRad)
      ];

      // Apply rotation if available
      if (view.rotation && view.rotation.length === 9) {
        const r = view.rotation;
        const rotated = [
          r[0] * direction[0] + r[1] * direction[1] + r[2] * direction[2],
          r[3] * direction[0] + r[4] * direction[1] + r[5] * direction[2],
          r[6] * direction[0] + r[7] * direction[1] + r[8] * direction[2]
        ];
        direction[0] = rotated[0];
        direction[1] = rotated[1];
        direction[2] = rotated[2];
      }

      return {
        origin: cameraPosition,
        direction,
        depth: point.depth,
        normalizedDepth: point.normalizedDepth
      };
    });

    // Find best intersection point using least squares
    // Minimize sum of squared distances to all rays
    const result = findRayIntersection(rays);

    if (onTriangulated) {
      onTriangulated(setName, result);
    }

    return result;
  };

  /**
   * Find the point that minimizes distance to all rays
   * Uses iterative least squares approach
   */
  const findRayIntersection = (rays) => {
    if (rays.length < 2) return null;

    // Initial estimate: use depth from first ray
    let estimate = rays.map(ray => {
      const depth = ray.depth || 1;
      return [
        ray.origin[0] + ray.direction[0] * depth,
        ray.origin[1] + ray.direction[1] * depth,
        ray.origin[2] + ray.direction[2] * depth
      ];
    });

    // Average initial estimates
    let point = [0, 0, 0];
    estimate.forEach(e => {
      point[0] += e[0] / estimate.length;
      point[1] += e[1] / estimate.length;
      point[2] += e[2] / estimate.length;
    });

    // Iterative refinement
    for (let iter = 0; iter < 10; iter++) {
      let newPoint = [0, 0, 0];
      let totalWeight = 0;

      rays.forEach(ray => {
        // Project point onto ray
        const toPoint = [
          point[0] - ray.origin[0],
          point[1] - ray.origin[1],
          point[2] - ray.origin[2]
        ];

        const t = toPoint[0] * ray.direction[0] +
                  toPoint[1] * ray.direction[1] +
                  toPoint[2] * ray.direction[2];

        const projected = [
          ray.origin[0] + ray.direction[0] * t,
          ray.origin[1] + ray.direction[1] * t,
          ray.origin[2] + ray.direction[2] * t
        ];

        // Weight by depth confidence (closer = more confident)
        const weight = ray.normalizedDepth !== null ? (1 - ray.normalizedDepth * 0.5) : 1;

        newPoint[0] += projected[0] * weight;
        newPoint[1] += projected[1] * weight;
        newPoint[2] += projected[2] * weight;
        totalWeight += weight;
      });

      point = [
        newPoint[0] / totalWeight,
        newPoint[1] / totalWeight,
        newPoint[2] / totalWeight
      ];
    }

    // Calculate error metrics
    let totalError = 0;
    const errors = rays.map(ray => {
      const toPoint = [
        point[0] - ray.origin[0],
        point[1] - ray.origin[1],
        point[2] - ray.origin[2]
      ];

      const t = toPoint[0] * ray.direction[0] +
                toPoint[1] * ray.direction[1] +
                toPoint[2] * ray.direction[2];

      const projected = [
        ray.origin[0] + ray.direction[0] * t,
        ray.origin[1] + ray.direction[1] * t,
        ray.origin[2] + ray.direction[2] * t
      ];

      const error = Math.sqrt(
        Math.pow(point[0] - projected[0], 2) +
        Math.pow(point[1] - projected[1], 2) +
        Math.pow(point[2] - projected[2], 2)
      );

      totalError += error;
      return error;
    });

    return {
      position: point,
      averageError: totalError / rays.length,
      maxError: Math.max(...errors),
      viewCount: rays.length,
      confidence: 1 / (1 + totalError / rays.length)
    };
  };

  /**
   * Estimate depth for current view
   */
  const estimateCurrentDepth = async () => {
    if (!depthEstimator) {
      depthEstimator = new DepthEstimator({
        onProgress: (p) => console.log('[PointTagger] Depth model loading:', p),
        onReady: () => console.log('[PointTagger] Depth model ready')
      });
    }

    // Get current image URL
    const urls = viewer.stores.urls?.();
    if (!urls || urls.length === 0) {
      console.warn('[PointTagger] No image loaded');
      return null;
    }

    // Use first hemisphere image (or combine if needed)
    const imageUrl = Array.isArray(urls[0]) ? urls[0][0] : urls[0];
    currentImageUrl = imageUrl;

    console.log('[PointTagger] Estimating depth for:', imageUrl);

    try {
      currentDepthResult = await depthEstimator.estimateDepth(imageUrl);
      console.log('[PointTagger] Depth estimation complete:', {
        width: currentDepthResult.width,
        height: currentDepthResult.height,
        minDepth: currentDepthResult.minDepth,
        maxDepth: currentDepthResult.maxDepth
      });

      if (onDepthReady) {
        onDepthReady(currentDepthResult);
      }

      return currentDepthResult;
    } catch (error) {
      console.error('[PointTagger] Depth estimation failed:', error);
      throw error;
    }
  };

  /**
   * Toggle tagging mode
   */
  const setTaggingMode = (enabled) => {
    isTaggingMode = enabled;

    if (container) {
      container.style.cursor = enabled ? 'crosshair' : 'default';
    }

    console.log('[PointTagger] Tagging mode:', enabled ? 'ON' : 'OFF');
  };

  /**
   * Get all tagged points
   */
  const getPoints = () => {
    return Array.from(taggedPoints.values());
  };

  /**
   * Get points for a specific image
   */
  const getPointsForImage = (imageUrl) => {
    return Array.from(taggedPoints.values()).filter(p => p.imageUrl === imageUrl);
  };

  /**
   * Export all data
   */
  const exportData = () => {
    return {
      points: Array.from(taggedPoints.values()),
      triangulationSets: Object.fromEntries(
        Array.from(triangulationSets.entries()).map(([k, v]) => [k, {
          ...v,
          triangulatedPosition: triangulate(k)
        }])
      )
    };
  };

  /**
   * Import data
   */
  const importData = (data) => {
    if (data.points) {
      data.points.forEach(p => taggedPoints.set(p.id, p));
    }
    if (data.triangulationSets) {
      Object.entries(data.triangulationSets).forEach(([k, v]) => {
        triangulationSets.set(k, v);
      });
    }
    updateMarkers();
  };

  // Plugin interface
  return {
    name: 'point-tagger',

    init(v) {
      viewer = v;
      container = viewer.wrapper;

      injectStyles();

      // Create marker container
      markerContainer = document.createElement('div');
      markerContainer.className = 'point-tagger-markers';
      markerContainer.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; overflow: hidden;';
      container.appendChild(markerContainer);

      // Create info display
      infoDisplay = document.createElement('div');
      infoDisplay.className = 'point-tagger-info';
      infoDisplay.style.display = 'none';
      container.appendChild(infoDisplay);

      // Add click handler
      container.addEventListener('click', handleClick);

      // Update markers on view change
      const updateOnViewChange = () => {
        requestAnimationFrame(updateMarkers);
      };

      viewer.stores.facing?.(updateOnViewChange);
      viewer.stores.horizon?.(updateOnViewChange);
      viewer.stores.fov?.(updateOnViewChange);

      // Update current image URL when URLs change
      viewer.stores.urls?.((urls) => {
        if (urls && urls.length > 0) {
          currentImageUrl = Array.isArray(urls[0]) ? urls[0][0] : urls[0];
          currentDepthResult = null; // Clear cached depth
        }
      });

      console.log('[PointTagger] Plugin initialized');
    },

    destroy() {
      if (container) {
        container.removeEventListener('click', handleClick);
      }
      if (markerContainer) {
        markerContainer.remove();
      }
      if (infoDisplay) {
        infoDisplay.remove();
      }
      if (depthEstimator) {
        depthEstimator.dispose();
      }
      taggedPoints.clear();
      triangulationSets.clear();
    },

    // Public API
    setTaggingMode,
    estimateDepth: estimateCurrentDepth,
    getDepthEstimator: () => depthEstimator,
    getDepthResult: () => currentDepthResult,
    tagPoint: handleClick,
    getPoints,
    getPointsForImage,
    getPoint: (id) => taggedPoints.get(id),
    removePoint,
    selectPoint,
    addToTriangulationSet,
    triangulate,
    getTriangulationSet: (name) => triangulationSets.get(name),
    getAllTriangulationSets: () => Object.fromEntries(triangulationSets),
    exportData,
    importData,
    updateMarkers
  };
};

export default PointTaggerPlugin;
