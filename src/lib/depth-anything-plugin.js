import { injectStyle } from "./utilities.js";

const TOKEN_STORAGE_KEY = "geocam-depth-anything-hf-token";
const HF_VALIDATE_URL = "https://huggingface.co/api/whoami-v2";
const CDN_SRC = "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.0";
const TOKEN_ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%230f172a' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='8.5' cy='12' r='4.5'/%3E%3Cpath d='M12.5 12h7l-2 2'/%3E%3Cpath d='M17.5 14l2 2'/%3E%3C/svg%3E";
const DEPTH_ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%230f172a' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 4l7 4v8l-7 4-7-4V8z'/%3E%3Cpath d='M5 8l7 4 7-4'/%3E%3Cpath d='M12 12v8'/%3E%3C/svg%3E";

let cachedToken = "";
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

    if (!isHuggingFaceRequest) {
      return originalFetch(input, init);
    }

    const token = readStoredToken();

    const request = new Request(input, init);
    const headers = new Headers(request.headers);

    if (init.headers) {
      const overrideHeaders = new Headers(init.headers);
      overrideHeaders.forEach((value, key) => headers.set(key, value));
    }

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    } else {
      headers.delete("Authorization");
    }

    const finalRequest = new Request(request, {
      ...init,
      headers,
      mode: init.mode ?? request.mode ?? "cors",
      credentials: init.credentials ?? request.credentials ?? "omit",
    });

    const response = await originalFetch(finalRequest);
    const contentType = response.headers.get("content-type") || "";

    if (!response.ok || /text\/html/i.test(contentType)) {
      let detail = "";
      try {
        detail = (await response.clone().text()).slice(0, 200);
      } catch (err) {
        console.warn("Unable to read Hugging Face error response", err);
      }

      console.warn("Hugging Face request failed", response.status, detail);

      let message = `Hugging Face request failed (${response.status})`;
      if (response.status === 401 || response.status === 403) {
        message =
          "Hugging Face rejected the request. Save a valid hf_ access token and try again.";
      } else if (/text\/html/i.test(contentType) || /^\s*</.test(detail)) {
        message =
          "Hugging Face returned an HTML error page instead of JSON. This usually means the request was unauthorized or redirected.";
      }

      throw new Error(message);
    }

    return response;
  };

  fetchPatched = true;
}

function formatProfileName(profile) {
  if (!profile || typeof profile !== "object") return "";
  const candidates = [
    profile.name,
    profile.displayName,
    profile.fullname,
    profile.username,
    profile.handle,
    profile.email,
  ];
  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  if (Array.isArray(profile.orgs)) {
    const org = profile.orgs.find((entry) => entry && typeof entry.name === "string");
    if (org) return org.name.trim();
  }
  return "";
}

async function validateToken(token) {
  if (!token) {
    throw new Error("Missing Hugging Face token");
  }

  let response;
  try {
    response = await fetch(HF_VALIDATE_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      credentials: "omit",
    });
  } catch (err) {
    throw new Error("Unable to reach Hugging Face for token validation");
  }

  if (!response.ok) {
    let detail = "";
    try {
      detail = await response.clone().text();
    } catch (err) {
      detail = "";
    }

    let message = `Token validation failed (${response.status})`;
    if (response.status === 401 || response.status === 403) {
      message = "Token rejected by Hugging Face";
    } else if (detail) {
      try {
        const data = JSON.parse(detail);
        const errorMessage = data?.error || data?.message;
        if (errorMessage) message = errorMessage;
      } catch (err) {
        const trimmed = detail.trim();
        if (trimmed) message = trimmed.slice(0, 200);
      }
    }

    throw new Error(message);
  }

  try {
    return await response.json();
  } catch (err) {
    return {};
  }
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

  .geocam-depth-status-badge {
    position: absolute;
    left: 16px;
    bottom: 16px;
    padding: 6px 10px;
    border-radius: 8px;
    font-size: 12px;
    line-height: 1.4;
    background: rgba(10, 12, 16, 0.75);
    color: #f1f5f9;
    border: 1px solid rgba(148, 163, 184, 0.4);
    max-width: 240px;
  }

  .geocam-depth-control-button {
    background-color: rgba(255, 255, 255, 0.9);
    border: 1px solid rgba(148, 163, 184, 0.55);
    border-radius: 8px;
    width: 36px;
    height: 36px;
    background-size: 22px 22px;
    background-repeat: no-repeat;
    background-position: center;
    transition: background-color 0.2s ease, border-color 0.2s ease;
  }

  .geocam-depth-control-button:not(:disabled):hover {
    background-color: rgba(255, 255, 255, 1);
    border-color: rgba(148, 163, 184, 0.8);
  }

  .geocam-depth-control-button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

export const depthAnythingPlugin = (options = {}) => {
  const config = {
    defaultModel: options.model ?? "Xenova/depth-anything-v2-small",
    opacity: options.opacity ?? 0.85,
  };

  ensureFetchPatched();

  let viewer;
  let overlayCanvas;
  let overlayCtx;
  let overlayInfo;
  let statusBadge;
  let tokenButton;
  let depthButton;
  let handleDepthClick;
  let resizeObserver;
  let unsubscribeUrls;
  let unsubscribeProgress = [];
  let estimatorPromise = null;
  let estimatorModel = config.defaultModel;
  let tokenValid = false;
  let validatingToken = false;
  let imageryReady = false;
  let running = false;
  let runId = 0;
  let depthVisible = false;
  let pendingMeshes = new Set();

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
    if (statusBadge) {
      statusBadge.textContent = text;
    }
  }

  function setOverlayVisibility(visible) {
    depthVisible = !!visible;
    overlayCanvas.classList.toggle("geocam-depth-overlay-visible", depthVisible);
    overlayCanvas.classList.toggle("geocam-depth-overlay-hidden", !depthVisible);
    if (overlayInfo) {
      overlayInfo.textContent = depthVisible
        ? "Depth overlay: Visible"
        : "Depth overlay: Hidden";
    }
  }

  function updateButtons() {
    if (depthButton) {
      const disabled = !tokenValid || !imageryReady || running;
      depthButton.disabled = disabled;
      depthButton.setAttribute("aria-disabled", disabled ? "true" : "false");
      if (disabled) {
        const reasons = [];
        if (!tokenValid) reasons.push("save a Hugging Face token");
        if (!imageryReady) reasons.push("wait for imagery");
        if (running) reasons.push("wait for depth to finish");
        depthButton.title = `Depth unavailable — ${reasons.join(" and ")}.`;
      } else {
        depthButton.title = "Run DepthAnything on the current view";
      }
    }
  }

  function dispatchTokenStatus(message, profile) {
    const target = viewer?.element || viewer?.wrapper || null;
    if (!target) return;
    const detail = { valid: tokenValid, message };
    if (profile) detail.profile = profile;
    target.dispatchEvent(
      new CustomEvent("depthanything:token-status", {
        detail,
        bubbles: true,
        composed: true,
      })
    );
  }

  function updateTokenValidity(valid, message, profile) {
    tokenValid = !!valid;
    const detailMessage =
      message ||
      (tokenValid
        ? "Token validated. Authorization headers are active."
        : "Token missing or invalid. Save a Hugging Face token to enable depth.");

    if (!tokenValid) {
      setOverlayVisibility(false);
    }

    dispatchTokenStatus(detailMessage, profile);
    updateButtons();
    return detailMessage;
  }

  async function validateAndActivateToken(token, { silent = false } = {}) {
    if (!token) {
      throw new Error("Missing Hugging Face token");
    }
    if (validatingToken) {
      throw new Error("Token validation already in progress");
    }

    validatingToken = true;

    try {
      if (!silent) {
        setStatus("Validating Hugging Face token…");
      }

      const profile = await validateToken(token);
      const alias = formatProfileName(profile);
      const message = alias
        ? `Token validated for ${alias}. Authorization headers are active.`
        : "Token validated. Authorization headers are active.";

      storeToken(token);
      const detailMessage = updateTokenValidity(true, message, profile);

      if (!silent) {
        if (imageryReady) {
          setStatus("Imagery ready. Click the depth icon to run.");
        } else {
          setStatus(detailMessage);
        }
      }

      return { profile, message: detailMessage };
    } catch (error) {
      if (!silent) {
        setStatus(`Token validation failed: ${error?.message || error}`);
      }
      throw error;
    } finally {
      validatingToken = false;
      updateButtons();
    }
  }

  function promptForToken() {
    if (typeof window === "undefined" || typeof window.prompt !== "function") {
      console.warn("Prompt unavailable in this environment");
      return;
    }

    const existing = readStoredToken();
    const input = window.prompt(
      "Enter your Hugging Face access token (starts with hf_)",
      existing || ""
    );

    if (input === null) {
      return;
    }

    const trimmed = input.trim();
    estimatorPromise = null;

    if (!trimmed) {
      storeToken("");
      const message = updateTokenValidity(
        false,
        "Token cleared. Save a Hugging Face token to enable depth."
      );
      setStatus(message);
      return;
    }

    validateAndActivateToken(trimmed).catch((error) => {
      const message = error?.message || "Token validation failed.";
      setStatus(message);
    });
  }

  async function loadEstimator(modelId) {
    if (estimatorPromise && estimatorModel === modelId) {
      return estimatorPromise;
    }

    estimatorModel = modelId;
    estimatorPromise = (async () => {
      setStatus("Loading depth model…");
      const mod = await import(/* @vite-ignore */ CDN_SRC);
      const { pipeline, env } = mod;
      transformersEnv = env;
      applyTokenToEnv();
      env.allowRemoteModels = true;
      env.backends.onnx.wasm.numThreads = 2;
      try {
        const estimator = await pipeline("depth-estimation", modelId, { device: "webgpu" });
        setStatus("Depth model ready (WebGPU)");
        return estimator;
      } catch (err) {
        console.warn("DepthAnything WebGPU unavailable, falling back to WASM", err);
        setStatus("Falling back to WASM…");
        const estimator = await pipeline("depth-estimation", modelId);
        setStatus("Depth model ready (WASM)");
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
  }

  async function runDepth() {
    if (!viewer || !viewer.renderer) return;
    if (!tokenValid) {
      setStatus("Save a Hugging Face token to enable depth.");
      return;
    }
    if (!imageryReady) {
      setStatus("Waiting for imagery to finish loading…");
      return;
    }
    if (running) {
      return;
    }

    running = true;
    updateButtons();
    const currentRun = ++runId;

    try {
      const estimator = await loadEstimator(estimatorModel);
      if (currentRun !== runId) {
        return;
      }

      setStatus("Capturing current frame…");
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

      setStatus("Estimating depth…");
      const result = await estimator(baseImage, {
        progress_callback: (p) => {
          if (currentRun !== runId) return;
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
      setOverlayVisibility(true);
      setStatus("Depth ready. Click the depth icon to re-run.");
    } catch (err) {
      console.error("DepthAnything failed", err);
      const message = err?.message || String(err);
      setOverlayVisibility(false);
      setStatus(`Depth error: ${message}`);
      if (/token|hugging face|unauthorized/i.test(message)) {
        updateTokenValidity(
          false,
          `Hugging Face rejected the request: ${message}`
        );
      }
    } finally {
      if (currentRun === runId) {
        running = false;
        updateButtons();
      }
    }
  }

  function resetDepthState(message, expectedCount) {
    setOverlayVisibility(false);
    imageryReady = false;
    pendingMeshes = new Set(
      Array.from(
        { length: typeof expectedCount === "number" ? expectedCount : viewer.progress.length },
        (_, index) => index
      )
    );
    setStatus(
      message ||
        (tokenValid
          ? "Loading imagery…"
          : "Save a Hugging Face token to enable depth.")
    );
    updateButtons();
  }

  function handleUrls(urls) {
    if (!urls || urls.length === 0) {
      resetDepthState("No imagery loaded.", 0);
      return;
    }
    resetDepthState(undefined, urls.length);
    viewer.progress.forEach((store, index) => {
      try {
        if (store() >= 1) {
          pendingMeshes.delete(index);
        }
      } catch (err) {
        console.warn("Unable to read viewer progress", err);
      }
    });
    if (pendingMeshes.size === 0) {
      imageryReady = true;
      setStatus(
        tokenValid
          ? "Imagery ready. Click the depth icon to run."
          : "Save a Hugging Face token to enable depth."
      );
      updateButtons();
    }
  }

  function handleProgress(index, value) {
    if (value >= 1 && pendingMeshes.has(index)) {
      pendingMeshes.delete(index);
      if (pendingMeshes.size === 0) {
        imageryReady = true;
        setStatus(
          tokenValid
            ? "Imagery ready. Click the depth icon to run."
            : "Save a Hugging Face token to enable depth."
        );
        updateButtons();
      }
    }
  }

  function refreshStoredToken() {
    const storedToken = readStoredToken();
    if (!storedToken) {
      const message = updateTokenValidity(
        false,
        "Save a Hugging Face token to enable depth."
      );
      setStatus(message);
      return;
    }

    setStatus("Validating stored Hugging Face token…");
    validateAndActivateToken(storedToken, { silent: true })
      .then(({ message }) => {
        if (imageryReady) {
          setStatus("Imagery ready. Click the depth icon to run.");
        } else {
          setStatus(message);
        }
      })
      .catch((error) => {
        console.warn("Stored Hugging Face token validation failed", error);
        storeToken("");
        const detail = `Stored token validation failed: ${error?.message || error}`;
        updateTokenValidity(false, detail);
        setStatus(detail);
      });
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
      overlayInfo.textContent = "Depth overlay: Hidden";
      statusBadge = document.createElement("div");
      statusBadge.className = "geocam-depth-status-badge";
      statusBadge.textContent = "Save a Hugging Face token to enable depth.";

      viewer.wrapper.appendChild(overlayCanvas);
      viewer.wrapper.appendChild(overlayInfo);
      viewer.wrapper.appendChild(statusBadge);

      tokenButton = document.createElement("button");
      tokenButton.type = "button";
      tokenButton.className = "geocam-viewer-control-button geocam-depth-control-button";
      tokenButton.style.backgroundImage = `url(${TOKEN_ICON})`;
      tokenButton.title = "Save a Hugging Face token";
      tokenButton.setAttribute("aria-label", "Save Hugging Face token");

      depthButton = document.createElement("button");
      depthButton.type = "button";
      depthButton.className = "geocam-viewer-control-button geocam-depth-control-button";
      depthButton.style.backgroundImage = `url(${DEPTH_ICON})`;
      depthButton.title = "Run DepthAnything on the current view";
      depthButton.disabled = true;
      depthButton.setAttribute("aria-disabled", "true");

      viewer.addControl(tokenButton, "right-top");
      viewer.addControl(depthButton, "right-top", { after: tokenButton });

      tokenButton.addEventListener("click", promptForToken);
      handleDepthClick = () => {
        void runDepth();
      };
      depthButton.addEventListener("click", handleDepthClick);

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
      } else {
        setStatus("Save a Hugging Face token to enable depth.");
      }

      refreshStoredToken();
    },
    destroy() {
      if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
      }
      if (tokenButton) {
        tokenButton.removeEventListener("click", promptForToken);
      }
      if (depthButton && handleDepthClick) {
        depthButton.removeEventListener("click", handleDepthClick);
      }
      unsubscribeProgress.forEach((unsub) => unsub && unsub());
      unsubscribeProgress = [];
      if (unsubscribeUrls) unsubscribeUrls();
      unsubscribeUrls = null;
      if (overlayCanvas?.parentNode) overlayCanvas.parentNode.removeChild(overlayCanvas);
      if (overlayInfo?.parentNode) overlayInfo.parentNode.removeChild(overlayInfo);
      if (statusBadge?.parentNode) statusBadge.parentNode.removeChild(statusBadge);
      handleDepthClick = null;
      viewer = null;
    },
  };
};
