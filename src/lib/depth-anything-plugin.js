import { injectStyle } from "./utilities.js";

const STYLE_ID = "geocam-depth-anything";
const STYLES = `
  .geocam-depth-overlay {
    position: absolute;
    inset: 0;
    pointer-events: none;
    image-rendering: pixelated;
    border-radius: 0;
    mix-blend-mode: normal;
    transition: opacity 0.25s ease;
  }

  .geocam-depth-overlay-hidden {
    opacity: 0;
    visibility: hidden;
  }

  .geocam-depth-overlay-visible {
    opacity: 1;
    visibility: visible;
  }

  .geocam-depth-overlay-info {
    position: absolute;
    top: 12px;
    right: 12px;
    padding: 6px 10px;
    border-radius: 8px;
    font-size: 12px;
    line-height: 1.4;
    background: rgba(10, 12, 16, 0.75);
    color: #f1f5f9;
    border: 1px solid rgba(148, 163, 184, 0.4);
    pointer-events: none;
    max-width: 220px;
  }

  .geocam-depth-panel {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 180px;
    background: rgba(15, 18, 26, 0.85);
    border-radius: 12px;
    padding: 12px;
    color: #e2e8f0;
    border: 1px solid rgba(148, 163, 184, 0.45);
    backdrop-filter: blur(4px);
  }

  .geocam-depth-panel select,
  .geocam-depth-panel button {
    width: 100%;
    border-radius: 8px;
    border: 1px solid rgba(148, 163, 184, 0.35);
    background: rgba(15, 23, 42, 0.7);
    color: #f8fafc;
    font-size: 13px;
    padding: 8px 10px;
    cursor: pointer;
  }

  .geocam-depth-panel button[disabled] {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .geocam-depth-panel select:focus,
  .geocam-depth-panel button:focus {
    outline: 2px solid rgba(59, 130, 246, 0.7);
    outline-offset: 2px;
  }

  .geocam-depth-status {
    font-size: 12px;
    color: #cbd5f5;
  }
`;

const MODELS = [
  { id: "Xenova/depth-anything-v2-small", label: "Depth Anything v2 • Small" },
  { id: "Xenova/depth-anything-v2-base", label: "Depth Anything v2 • Base" },
  { id: "Xenova/depth-anything-v2-large", label: "Depth Anything v2 • Large" },
];

const CDN_SRC = "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.0";

export const depthAnythingPlugin = (options = {}) => {
  const config = {
    defaultModel: options.model ?? MODELS[0].id,
    opacity: options.opacity ?? 0.85,
    autoShow: options.autoShow ?? true,
  };

  let viewer;
  let overlayCanvas;
  let overlayCtx;
  let overlayInfo;
  let panel;
  let toggleButton;
  let downloadButton;
  let statusText;
  let modelSelect;
  let resizeObserver;
  let unsubscribeUrls;
  let unsubscribeProgress = [];
  let estimatorPromise = null;
  let estimatorModel = config.defaultModel;
  let overlayVisible = false;
  let depthReady = false;
  let userPreference = null;
  let depthPNG = null;
  let pendingDepth = false;
  let pendingMeshes = new Set();
  let running = false;
  let runId = 0;
  let handleToggleClick;
  let handleDownloadClick;
  let handleModelChange;

  injectStyle(STYLE_ID, STYLES);

  function syncOverlaySize() {
    if (!viewer || !viewer.renderer) return;
    const canvas = viewer.renderer.domElement;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    overlayCanvas.width = canvas.width || rect.width || 1;
    overlayCanvas.height = canvas.height || rect.height || 1;
    overlayCanvas.style.width = `${rect.width}px`;
    overlayCanvas.style.height = `${rect.height}px`;
  }

  function setStatus(text) {
    if (statusText) statusText.textContent = text;
  }

  function updateOverlayStateLabel() {
    const state = depthReady ? (overlayVisible ? "Visible" : "Hidden") : "Not ready";
    if (overlayInfo) overlayInfo.innerHTML = `Depth overlay: <strong>${state}</strong>`;
  }

  function setOverlayVisibility(visible) {
    overlayVisible = !!visible && depthReady;
    overlayCanvas.classList.toggle("geocam-depth-overlay-visible", overlayVisible);
    overlayCanvas.classList.toggle("geocam-depth-overlay-hidden", !overlayVisible);
    toggleButton.textContent = overlayVisible ? "Hide Depth (D)" : "Show Depth (D)";
    updateOverlayStateLabel();
  }

  function resetDepthState(message = "Waiting for imagery…", expectedCount) {
    depthReady = false;
    depthPNG = null;
    overlayCanvas.classList.add("geocam-depth-overlay-hidden");
    overlayCanvas.classList.remove("geocam-depth-overlay-visible");
    toggleButton.disabled = true;
    downloadButton.disabled = true;
    if (toggleButton) toggleButton.textContent = "Show Depth (D)";
    userPreference = null;
    pendingDepth = true;
    const total = viewer.progress.length;
    const count = Math.min(
      typeof expectedCount === "number" ? expectedCount : total,
      total
    );
    pendingMeshes = new Set(Array.from({ length: count }, (_, index) => index));
    setStatus(message);
    updateOverlayStateLabel();
    overlayVisible = false;
  }

  async function loadEstimator(modelId) {
    if (estimatorPromise && estimatorModel === modelId) {
      return estimatorPromise;
    }

    estimatorModel = modelId;
    estimatorPromise = (async () => {
      setStatus("Loading model…");
      const mod = await import(/* @vite-ignore */ CDN_SRC);
      const { pipeline, env } = mod;
      env.allowRemoteModels = true;
      env.backends.onnx.wasm.numThreads = 2;
      try {
        const estimator = await pipeline("depth-estimation", modelId, { device: "webgpu" });
        setStatus("Model ready (WebGPU)");
        return estimator;
      } catch (err) {
        console.warn("DepthAnything WebGPU unavailable, falling back to WASM", err);
        setStatus("Falling back to WASM…");
        const estimator = await pipeline("depth-estimation", modelId);
        setStatus("Model ready (WASM)");
        return estimator;
      }
    })().catch((err) => {
      estimatorPromise = null;
      throw err;
    });

    return estimatorPromise;
  }

  function renderDepthToCanvas(depthOut) {
    if (!overlayCtx) return;
    syncOverlaySize();
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    let imageData = null;
    if (depthOut && typeof depthOut.toImageData === "function") {
      imageData = depthOut.toImageData();
    } else if (depthOut && typeof depthOut === "object" && "data" in depthOut) {
      const { data, width, height } = depthOut;
      const rgba = new Uint8ClampedArray(width * height * 4);
      let min = Infinity;
      let max = -Infinity;
      for (let i = 0; i < data.length; i++) {
        const val = data[i];
        if (val < min) min = val;
        if (val > max) max = val;
      }
      const range = Math.max(1e-6, max - min);
      for (let i = 0; i < data.length; i++) {
        const d = (data[i] - min) / range;
        const g = Math.round((1 - d) * 255);
        const idx = i * 4;
        rgba[idx] = g;
        rgba[idx + 1] = g;
        rgba[idx + 2] = g;
        rgba[idx + 3] = 255;
      }
      imageData = new ImageData(rgba, width, height);
    }

    if (!imageData) {
      throw new Error("Unsupported depth output format");
    }

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = imageData.width;
    tempCanvas.height = imageData.height;
    const tempCtx = tempCanvas.getContext("2d");
    tempCtx.putImageData(imageData, 0, 0);
    overlayCtx.save();
    overlayCtx.globalAlpha = 1;
    overlayCtx.drawImage(tempCanvas, 0, 0, overlayCanvas.width, overlayCanvas.height);
    overlayCtx.restore();
    tempCanvas.remove();
    depthPNG = overlayCanvas.toDataURL("image/png");
  }

  async function runDepth(force = false) {
    if (!viewer || !viewer.renderer) return;
    if (running) {
      if (!force) return;
    }
    const currentRun = ++runId;
    running = true;
    setStatus("Estimating depth…");

    try {
      const estimator = await loadEstimator(modelSelect.value);
      if (currentRun !== runId) {
        return;
      }
      const captureUrl = viewer.renderer.domElement.toDataURL("image/png");
      const baseImage = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(err);
        img.crossOrigin = "anonymous";
        img.src = captureUrl;
      });
      if (currentRun !== runId) {
        return;
      }
      const result = await estimator(baseImage, {
        progress_callback: (p) => {
          if (p?.progress) {
            setStatus(`Estimating depth… ${(p.progress * 100).toFixed(0)}%`);
          }
        },
      });
      if (currentRun !== runId) {
        return;
      }
      const depth = result?.depth ?? result;
      renderDepthToCanvas(depth);
      depthReady = true;
      toggleButton.disabled = false;
      downloadButton.disabled = !depthPNG;
      setStatus("Depth ready");
      const desired = userPreference ?? config.autoShow;
      setOverlayVisibility(desired);
    } catch (err) {
      console.error("DepthAnything failed", err);
      setStatus(`Depth error: ${err?.message || err}`);
      depthReady = false;
      toggleButton.disabled = true;
      downloadButton.disabled = true;
    } finally {
      if (currentRun === runId) {
        running = false;
        pendingDepth = false;
      }
    }
  }

  function handleProgress(index, value) {
    if (!pendingDepth) return;
    if (value >= 1 && pendingMeshes.has(index)) {
      pendingMeshes.delete(index);
      if (pendingMeshes.size === 0) {
        pendingDepth = false;
        void runDepth();
      }
    }
  }

  function handleUrls(urls) {
    if (!urls || urls.length === 0) return;
    resetDepthState("Waiting for imagery…", urls.length);
    viewer.progress.forEach((store, index) => {
      if (store() >= 1) {
        pendingMeshes.delete(index);
      }
    });
    if (pendingMeshes.size === 0) {
      pendingDepth = false;
      void runDepth();
    }
  }

  function toggleDepth(force) {
    if (!depthReady) return;
    const next = typeof force === "boolean" ? force : !overlayVisible;
    userPreference = next;
    setOverlayVisibility(next);
  }

  function downloadDepth() {
    if (!depthPNG) return;
    const a = document.createElement("a");
    a.href = depthPNG;
    a.download = "depth.png";
    a.click();
  }

  function handleKeydown(event) {
    const target = event.target;
    const isFormField =
      target &&
      (target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target.isContentEditable);
    if (isFormField) return;
    if (event.key === "d" || event.key === "D") {
      event.preventDefault();
      toggleDepth();
    }
  }

  return {
    init(v) {
      viewer = v;
      overlayCanvas = document.createElement("canvas");
      overlayCanvas.className = "geocam-depth-overlay geocam-depth-overlay-hidden";
      overlayCanvas.style.opacity = `${config.opacity}`;
      overlayCtx = overlayCanvas.getContext("2d");
      overlayInfo = document.createElement("div");
      overlayInfo.className = "geocam-depth-overlay-info";
      overlayInfo.textContent = "Depth overlay: Not ready";
      viewer.wrapper.appendChild(overlayCanvas);
      viewer.wrapper.appendChild(overlayInfo);
      updateOverlayStateLabel();

      panel = document.createElement("div");
      panel.className = "geocam-depth-panel";

      modelSelect = document.createElement("select");
      MODELS.forEach((model) => {
        const option = document.createElement("option");
        option.value = model.id;
        option.textContent = model.label;
        modelSelect.appendChild(option);
      });
      modelSelect.value = estimatorModel;

      toggleButton = document.createElement("button");
      toggleButton.type = "button";
      toggleButton.textContent = "Show Depth (D)";
      toggleButton.disabled = true;

      downloadButton = document.createElement("button");
      downloadButton.type = "button";
      downloadButton.textContent = "Download Depth";
      downloadButton.disabled = true;

      statusText = document.createElement("div");
      statusText.className = "geocam-depth-status";
      statusText.textContent = "Depth: Idle";

      panel.appendChild(modelSelect);
      panel.appendChild(toggleButton);
      panel.appendChild(downloadButton);
      panel.appendChild(statusText);

      viewer.addControl(panel, "right-top");

      handleToggleClick = () => toggleDepth();
      handleDownloadClick = () => downloadDepth();
      handleModelChange = () => {
        estimatorPromise = null;
        estimatorModel = modelSelect.value;
        setStatus("Model changed");
        if (depthReady) {
          void runDepth(true);
        }
      };

      toggleButton.addEventListener("click", handleToggleClick);
      downloadButton.addEventListener("click", handleDownloadClick);
      modelSelect.addEventListener("change", handleModelChange);

      window.addEventListener("keydown", handleKeydown);

      resizeObserver = new ResizeObserver(syncOverlaySize);
      resizeObserver.observe(viewer.renderer.domElement);
      syncOverlaySize();

      unsubscribeUrls = viewer.urls(handleUrls);
      unsubscribeProgress = viewer.progress.map((store, index) =>
        store((value) => handleProgress(index, value))
      );

      const existingUrls = viewer.urls();
      if (existingUrls && existingUrls.length) {
        handleUrls(existingUrls);
      }
    },
    destroy() {
      if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
      }
      window.removeEventListener("keydown", handleKeydown);
      if (toggleButton && handleToggleClick)
        toggleButton.removeEventListener("click", handleToggleClick);
      if (downloadButton && handleDownloadClick)
        downloadButton.removeEventListener("click", handleDownloadClick);
      if (modelSelect && handleModelChange)
        modelSelect.removeEventListener("change", handleModelChange);
      handleToggleClick = null;
      handleDownloadClick = null;
      handleModelChange = null;
      unsubscribeProgress.forEach((unsub) => unsub && unsub());
      unsubscribeProgress = [];
      if (unsubscribeUrls) unsubscribeUrls();
      unsubscribeUrls = null;
      if (overlayCanvas?.parentNode) overlayCanvas.parentNode.removeChild(overlayCanvas);
      if (overlayInfo?.parentNode) overlayInfo.parentNode.removeChild(overlayInfo);
      if (panel?.parentNode) panel.parentNode.removeChild(panel);
    },
  };
};
