import "./index.js";

const HEMISPHERE_BASES = [
  "https://image.geocam.xyz/gc2-2022-10-28-5985_s-Boise_driving_v-Ben1027_n-2/0/0000/00002506.jpg?bytes=8431183872-8434173007&container=https%3A%2F%2Fs3proxy.geocam.xyz%2Fgc-raw-surveys-archive%2FNIST%2FBoiseDriving%2FBen_10-27%2Fgc2-2022-10-28-5985_s-Boise_driving_v-Ben1027_n-2_0.tar",
  "https://image.geocam.xyz/gc2-2022-10-28-5985_s-Boise_driving_v-Ben1027_n-2/1/0000/00002506.jpg?bytes=8022497792-8025797203&container=https%3A%2F%2Fs3proxy.geocam.xyz%2Fgc-raw-surveys-archive%2FNIST%2FBoiseDriving%2FBen_10-27%2Fgc2-2022-10-28-5985_s-Boise_driving_v-Ben1027_n-2_1.tar",
  "https://image.geocam.xyz/gc2-2022-10-28-5985_s-Boise_driving_v-Ben1027_n-2/2/0000/00002506.jpg?bytes=8256700416-8259564683&container=https%3A%2F%2Fs3proxy.geocam.xyz%2Fgc-raw-surveys-archive%2FNIST%2FBoiseDriving%2FBen_10-27%2Fgc2-2022-10-28-5985_s-Boise_driving_v-Ben1027_n-2_2.tar",
];

const SAMPLE_FRAMES = [
  createFrame("entry", { label: "Stoplight approach", yaw: -12 }),
  createFrame("center", { label: "Downtown intersection", yaw: 0 }),
  createFrame("exit", { label: "Post-intersection", yaw: 14 }),
];

const SAMPLE_MESHES = [
  "https://manager.geocam.xyz/calibration/717/hemisphere_0.obj",
  "https://manager.geocam.xyz/calibration/717/hemisphere_1.obj",
  "https://manager.geocam.xyz/calibration/717/hemisphere_2.obj",
];

const state = {
  viewerElement: document.getElementById("viewer"),
  viewerPromise: null,
  viewer: null,
  controls: null,
  currentFrame: 0,
  activeFrame: null,
  tokenValid: false,
  framesLoaded: false,
};

if (state.viewerElement) {
  ensureViewer().catch((error) => {
    console.error("Failed to initialise viewer", error);
  });

  state.viewerElement.addEventListener("depthanything:token-status", (event) => {
    void handleTokenStatus(event);
  });
}

function createFrame(id, { label, yaw }) {
  const urls = HEMISPHERE_BASES.map((base) => [
    `${base}&frame=${encodeURIComponent(id)}`,
  ]);
  return { id, label, yaw, urls };
}

async function ensureViewer() {
  if (state.viewerPromise) return state.viewerPromise;
  if (!state.viewerElement) {
    throw new Error("Viewer element not found");
  }

  state.viewerPromise = (async () => {
    await customElements.whenDefined("geocam-viewer");
    const viewer = await waitForViewer(state.viewerElement);
    state.viewer = viewer;
    setupFrameControls(viewer);
    return viewer;
  })().catch((error) => {
    state.viewerPromise = null;
    throw error;
  });

  return state.viewerPromise;
}

function waitForViewer(element) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("geocam-viewer did not initialise"));
    }, 10000);

    const check = () => {
      if (element.viewer) {
        clearTimeout(timeout);
        resolve(element.viewer);
      } else {
        requestAnimationFrame(check);
      }
    };

    check();
  });
}

function setupFrameControls(viewer) {
  if (state.controls) return;

  const panel = document.createElement("div");
  panel.className = "demo-frame-panel";

  const label = document.createElement("div");
  label.className = "demo-frame-label";
  label.textContent = "Enter and validate a Hugging Face token to begin.";

  const hint = document.createElement("div");
  hint.className = "demo-frame-hint";
  hint.textContent = "Use ← → or the buttons to move between frames.";

  const buttons = document.createElement("div");
  buttons.className = "demo-frame-buttons";

  const prevButton = document.createElement("button");
  prevButton.type = "button";
  prevButton.textContent = "◀ Previous";

  const nextButton = document.createElement("button");
  nextButton.type = "button";
  nextButton.textContent = "Next ▶";

  buttons.appendChild(prevButton);
  buttons.appendChild(nextButton);

  panel.appendChild(label);
  panel.appendChild(hint);
  panel.appendChild(buttons);

  viewer.addControl(panel, "left-top", { prepend: true });

  prevButton.addEventListener("click", () => navigate(-1));
  nextButton.addEventListener("click", () => navigate(1));
  window.addEventListener("keydown", handleNavigationKeydown);

  state.controls = { panel, label, hint, prevButton, nextButton };
  setFrameControlsEnabled(false);
}

function setFrameControlsEnabled(enabled) {
  if (!state.controls) return;
  const { prevButton, nextButton, label } = state.controls;

  if (!enabled) {
    prevButton.disabled = true;
    nextButton.disabled = true;
    label.textContent = "Enter and validate a Hugging Face token to begin.";
    return;
  }

  prevButton.disabled = state.currentFrame === 0;
  nextButton.disabled = state.currentFrame === SAMPLE_FRAMES.length - 1;
  updateFrameLabel();
}

function updateFrameLabel() {
  if (!state.controls) return;
  const frame = SAMPLE_FRAMES[state.currentFrame];
  if (!frame) return;
  const total = SAMPLE_FRAMES.length;
  state.controls.label.textContent = `Frame ${state.currentFrame + 1} / ${total} — ${frame.label}`;
}

async function handleTokenStatus(event) {
  const detail = event?.detail || {};
  state.tokenValid = !!detail.valid;

  try {
    await ensureViewer();
  } catch (error) {
    console.error("Viewer setup failed", error);
    return;
  }

  if (!state.viewer) return;

  if (!state.tokenValid) {
    state.framesLoaded = false;
    state.activeFrame = null;
    setFrameControlsEnabled(false);
    state.viewer.hide();
    return;
  }

  setFrameControlsEnabled(true);

  if (!state.framesLoaded) {
    await loadFrame(state.currentFrame);
    return;
  }

  if (state.activeFrame !== null) {
    await loadFrame(state.currentFrame, { force: true });
  }
}

async function loadFrame(index, { force = false } = {}) {
  const viewer = await ensureViewer();
  const frame = SAMPLE_FRAMES[index];
  if (!frame) return;

  state.currentFrame = index;
  updateFrameLabel();

  if (force && state.activeFrame === index && state.framesLoaded) {
    viewer.reload();
  } else {
    viewer.show(frame.urls, frame.yaw ?? 0, SAMPLE_MESHES);
    state.activeFrame = index;
  }

  state.framesLoaded = true;
  setFrameControlsEnabled(true);
}

function navigate(delta) {
  if (!state.tokenValid) return;
  const nextIndex = Math.min(
    SAMPLE_FRAMES.length - 1,
    Math.max(0, state.currentFrame + delta)
  );
  if (nextIndex === state.currentFrame && state.framesLoaded) {
    if (delta === 0) {
      void loadFrame(nextIndex, { force: true });
    }
    return;
  }
  state.currentFrame = nextIndex;
  setFrameControlsEnabled(true);
  void loadFrame(nextIndex);
}

function handleNavigationKeydown(event) {
  const target = event.target;
  const isInput =
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target && target.isContentEditable);

  if (isInput) return;

  if (event.key === "ArrowRight") {
    event.preventDefault();
    navigate(1);
  } else if (event.key === "ArrowLeft") {
    event.preventDefault();
    navigate(-1);
  }
}
