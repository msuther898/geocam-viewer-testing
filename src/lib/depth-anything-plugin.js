import { injectStyle } from "./utilities.js";

const TOKEN_STORAGE_KEY = "geocam-depth-anything-hf-token";
let cachedToken;
let tokenLoaded = false;
let fetchPatched = false;
let transformersEnv = null;

function readStoredToken() {
  if (!tokenLoaded) {
    try {
      cachedToken =
        (typeof window !== "undefined" && window.localStorage
          ? window.localStorage.getItem(TOKEN_STORAGE_KEY)
          : "") || "";
    } catch (err) {
      console.warn("Unable to read Hugging Face token from storage", err);
      cachedToken = "";
    }
    tokenLoaded = true;
  }
  return cachedToken || "";
}

function storeToken(token) {
  tokenLoaded = true;
  cachedToken = token || "";
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      if (cachedToken) {
        window.localStorage.setItem(TOKEN_STORAGE_KEY, cachedToken);
      } else {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    } catch (err) {
      console.warn("Unable to persist Hugging Face token", err);
    }
  }
  applyTokenToEnv();
}

function applyTokenToEnv() {
  if (!transformersEnv) return;
  const token = readStoredToken();
  if (token) {
    transformersEnv.HF_ACCESS_TOKEN = token;
  } else {
    delete transformersEnv.HF_ACCESS_TOKEN;
  }
}

function ensureFetchPatched() {
  if (fetchPatched) return;
  if (typeof window === "undefined" || typeof window.fetch !== "function") return;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input, init = {}) => {
    let url;
    if (input instanceof Request) {
      url = input.url;
    } else {
      url = input;
    }

    const isHuggingFaceRequest =
      typeof url === "string" && url.includes("huggingface.co");

    const token = readStoredToken();

    if (!isHuggingFaceRequest || !token) {
      return originalFetch(input, init);
    }

    if (input instanceof Request) {
      const headers = new Headers(input.headers);
      if (init.headers) {
        const overrideHeaders = new Headers(init.headers);
        overrideHeaders.forEach((value, key) => headers.set(key, value));
      }
      headers.set("Authorization", `Bearer ${token}`);
      const request = new Request(input, {
        ...init,
        headers,
        mode: init.mode ?? input.mode ?? "cors",
        credentials: init.credentials ?? input.credentials ?? "omit",
      });
      return originalFetch(request);
    }

    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${token}`);
    const patchedInit = {
      ...init,
      headers,
      mode: init.mode ?? "cors",
      credentials: init.credentials ?? "omit",
    };
    return originalFetch(input, patchedInit);
  };

  fetchPatched = true;
}

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
  .geocam-depth-panel button,
  .geocam-depth-panel input {
    width: 100%;
    border-radius: 8px;
    border: 1px solid rgba(148, 163, 184, 0.35);
    background: rgba(15, 23, 42, 0.7);
    color: #f8fafc;
    font-size: 13px;
    padding: 8px 10px;
    cursor: pointer;
  }

  .geocam-depth-panel input {
    cursor: text;
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

  .geocam-depth-token-status {
    font-size: 12px;
    color: #94a3b8;
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

  ensureFetchPatched();

  let viewer;
  let overlayCanvas;
  let overlayCtx;
  let overlayInfo;
  let panel;
  let toggleButton;
  let downloadButton;
  let statusText;
  let modelSelect;
  let tokenInput;
  let tokenButton;
  let tokenStatus;
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
  let handleTokenSave;
  let handleTokenKeydown;

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

  function refreshTokenUI(message) {
    const token = readStoredToken();
    if (tokenInput && token !== undefined) {
      tokenInput.value = token;
    }
    if (tokenStatus) {
      tokenStatus.textContent =
        message ||
        (token
          ? "Token stored locally; Hugging Face requests include authorization."
          : "Optional: add a Hugging Face token (hf_…) for gated models.");
    }
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
      transformersEnv = env;
      applyTokenToEnv();
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
      if (
        err &&
        typeof err.message === "string" &&
        /unauthorized/i.test(err.message)
      ) {
        refreshTokenUI(
          "Model download was rejected. Save an hf_ token to authorize Hugging Face requests."
        );
      }
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

      const tokenLabel = document.createElement("label");
      tokenLabel.textContent = "Hugging Face token";
      tokenLabel.style.fontSize = "12px";
      tokenLabel.style.color = "#cbd5f5";

      tokenInput = document.createElement("input");
      tokenInput.type = "password";
      tokenInput.placeholder = "hf_...";
      tokenInput.autocomplete = "off";
      tokenInput.spellcheck = false;
      const tokenInputId = `geocam-depth-token-${Math.random().toString(36).slice(2)}`;
      tokenInput.id = tokenInputId;
      tokenLabel.htmlFor = tokenInputId;

      tokenButton = document.createElement("button");
      tokenButton.type = "button";
      tokenButton.textContent = "Save Token";

      tokenStatus = document.createElement("div");
      tokenStatus.className = "geocam-depth-token-status";

      statusText = document.createElement("div");
      statusText.className = "geocam-depth-status";
      statusText.textContent = "Depth: Idle";

      panel.appendChild(tokenLabel);
      panel.appendChild(tokenInput);
      panel.appendChild(tokenButton);
      panel.appendChild(tokenStatus);
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

      handleTokenSave = () => {
        if (!tokenInput) return;
        const nextToken = tokenInput.value.trim();
        storeToken(nextToken);
        estimatorPromise = null;
        if (nextToken) {
          refreshTokenUI(
            "Token saved. Authorization will be sent to huggingface.co."
          );
          setStatus("Token saved. Reloading depth…");
          void runDepth(true);
        } else {
          refreshTokenUI("Token cleared. Public models only.");
          setStatus("Token cleared. Depth models may require authorization.");
        }
      };

      handleTokenKeydown = (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          handleTokenSave();
        }
      };

      toggleButton.addEventListener("click", handleToggleClick);
      downloadButton.addEventListener("click", handleDownloadClick);
      modelSelect.addEventListener("change", handleModelChange);
      tokenButton.addEventListener("click", handleTokenSave);
      tokenInput.addEventListener("keydown", handleTokenKeydown);

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

      refreshTokenUI();
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
      if (tokenButton && handleTokenSave)
        tokenButton.removeEventListener("click", handleTokenSave);
      if (tokenInput && handleTokenKeydown)
        tokenInput.removeEventListener("keydown", handleTokenKeydown);
      handleToggleClick = null;
      handleDownloadClick = null;
      handleModelChange = null;
      handleTokenSave = null;
      handleTokenKeydown = null;
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
