const menuToggle = document.querySelector(".menu-toggle");
const siteNav = document.querySelector(".site-nav");
const copyButtons = document.querySelectorAll("[data-copy-target]");
const revealItems = document.querySelectorAll(".reveal");
const currentYear = document.querySelector("#current-year");
const qualitativeViewer = document.querySelector("#qualitative-viewer");
const visualizationTitle = document.querySelector("#visualization-title");
const visualizationThumbContainer = document.querySelector("#visualization-thumbnails");
const sequenceVideo = document.querySelector("#sequence-video");
const pageVideos = document.querySelectorAll("video");
const sequenceVideoTitle = document.querySelector("#sequence-video-title");
const sequenceVideoThumbContainer = document.querySelector("#sequence-video-thumbnails");
const comparisonSceneTitle = document.querySelector("#comparison-scene-title");
const comparisonViewerContainer = document.querySelector("#comparison-viewers");
const comparisonSceneContainer = document.querySelector("#comparison-scenes");
const comparisonResetButton = document.querySelector("#comparison-reset");
const comparisonSyncToggle = document.querySelector("#comparison-sync");
const visualizationItems = [
  {
    id: "dl3dv_5c3a",
    title: "DL3DV 5C3A",
    imageSrc: "assets/glb/dl3dv_5c3a/dl3dv_5c3a.webp",
    modelSrc: "assets/glb/dl3dv_5c3a/dl3dv_5c3a.glb",
  },
  {
    id: "dl3dv_5f00",
    title: "DL3DV 5F00",
    imageSrc: "assets/glb/dl3dv_5f00/dl3dv_5f00.webp",
    modelSrc: "assets/glb/dl3dv_5f00/dl3dv_5f00.glb",
  },
  {
    id: "whiteroom",
    title: "White Room",
    imageSrc: "assets/glb/whiteroom/whiteroom.webp",
    modelSrc: "assets/glb/whiteroom/whiteroom.glb",
  },
];
const sequenceVideoItems = [
  {
    id: "nagoya",
    title: "Nagoya",
    imageSrc: "assets/videos/nagoya/nagoya_cover.webp",
    videoSrc: "assets/videos/nagoya/nagoya_tag3r.mp4",
  },
  {
    id: "nippon",
    title: "Nippon",
    imageSrc: "assets/videos/nippon/nippon_cover.webp",
    videoSrc: "assets/videos/nippon/nippon_tag3r.mp4",
  },
  {
    id: "office",
    title: "Office",
    imageSrc: "assets/videos/office/office_cover.webp",
    videoSrc: "assets/videos/office/office.mp4",
  },
  {
    id: "davis_rollerblade",
    title: "DAVIS Rollerblade",
    imageSrc: "assets/videos/DAVIS_rollerblade/rollerblade_cover.webp",
    videoSrc: "assets/videos/DAVIS_rollerblade/DAVIS_rollerblade.mp4",
  },
  {
    id: "davis_stroller",
    title: "DAVIS Stroller",
    imageSrc: "assets/videos/DAVIS_stroller/stroller_cover.webp",
    videoSrc: "assets/videos/DAVIS_stroller/DAVIS_stroller.mp4",
  },
  {
    id: "davis_train",
    title: "DAVIS Train",
    imageSrc: "assets/videos/DAVIS_train/train_cover.webp",
    videoSrc: "assets/videos/DAVIS_train/DAVIS_train.mp4",
  },
];
const comparisonScenes = [
  {
    id: "kitchen",
    title: "Kitchen",
    imageSrc: "assets/comp/kitchen/kitchen.webp",
    methods: [
      {
        id: "tag3r",
        label: "TAG3R",
        description: "Trust-aware adaptive gating",
        modelSrc: "assets/comp/kitchen/tag3r/scene.glb",
      },
      {
        id: "cut3r",
        label: "CUT3R",
        description: "Streaming recurrent baseline",
        modelSrc: "assets/comp/kitchen/cut3r/scene.glb",
      },
      {
        id: "ttt3r",
        label: "TTT3R",
        description: "Test-time training baseline",
        modelSrc: "assets/comp/kitchen/ttt3r/scene.glb",
      },
    ],
  },
];
let comparisonViewers = [];
let isSyncingComparisonCamera = false;

function bindVideoLoadingProgress(video) {
  const progress = video.closest(".video-load-frame")?.querySelector(".video-load-progress");
  const bar = progress?.querySelector("span");

  if (!progress || !bar) {
    return;
  }

  let isLoading = false;

  const showLoading = () => {
    isLoading = true;
    progress.classList.add("is-loading", "is-indeterminate");
    progress.removeAttribute("aria-valuenow");
    bar.style.removeProperty("transform");
  };

  const updateBufferedProgress = () => {
    if (
      !isLoading ||
      !Number.isFinite(video.duration) ||
      video.duration <= 0 ||
      video.buffered.length === 0
    ) {
      return;
    }

    const percent = Math.min(100, (video.buffered.end(video.buffered.length - 1) / video.duration) * 100);
    progress.classList.add("is-loading");
    progress.classList.remove("is-indeterminate");
    progress.setAttribute("aria-valuenow", String(Math.round(percent)));
    bar.style.transform = `scaleX(${percent / 100})`;
  };

  const hideLoading = () => {
    isLoading = false;
    progress.classList.remove("is-loading", "is-indeterminate");
    progress.setAttribute("aria-valuenow", "100");
    bar.style.transform = "scaleX(1)";
  };

  video.addEventListener("loadstart", showLoading);
  video.addEventListener("waiting", showLoading);
  video.addEventListener("stalled", showLoading);
  video.addEventListener("progress", updateBufferedProgress);
  video.addEventListener("canplay", hideLoading);
  video.addEventListener("playing", hideLoading);
  video.addEventListener("error", hideLoading);

  if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
    hideLoading();
  } else {
    showLoading();
  }
}

function setActiveVisualization(item, triggerButton, loadModel = true) {
  if (!qualitativeViewer) {
    return;
  }

  const { title, modelSrc } = item;

  if (loadModel) {
    qualitativeViewer.setAttribute("src", modelSrc);
  } else {
    qualitativeViewer.removeAttribute("src");
  }
  qualitativeViewer.setAttribute("poster", item.imageSrc);
  resetQualitativeViewerCamera();
  qualitativeViewer.setAttribute(
    "alt",
    `Interactive 3D reconstruction visualized from the ${title} scene.`
  );

  if (visualizationTitle) {
    visualizationTitle.textContent = title;
  }

  if (visualizationThumbContainer) {
    visualizationThumbContainer
      .querySelectorAll(".visualization-thumb")
      .forEach((thumb) => {
        const isActive = thumb === triggerButton;
        thumb.classList.toggle("is-active", isActive);
        thumb.setAttribute("aria-pressed", String(isActive));
      });
  }
}

function setActiveSequenceVideo(item, triggerButton, scrollIntoView = true) {
  if (!sequenceVideo) {
    return;
  }

  sequenceVideo.setAttribute("poster", item.imageSrc);

  if (sequenceVideo.querySelector("source")) {
    sequenceVideo.querySelector("source").remove();
  }

  const source = document.createElement("source");
  source.src = item.videoSrc;
  source.type = "video/mp4";
  sequenceVideo.replaceChildren(source);
  sequenceVideo.load();

  const autoplayPromise = sequenceVideo.play();
  if (autoplayPromise && typeof autoplayPromise.catch === "function") {
    autoplayPromise.catch(() => {});
  }

  sequenceVideo.setAttribute("aria-label", `${item.title} reconstruction video`);

  if (sequenceVideoTitle) {
    sequenceVideoTitle.textContent = item.title;
  }

  if (sequenceVideoThumbContainer) {
    sequenceVideoThumbContainer
      .querySelectorAll(".visualization-thumb")
      .forEach((thumb) => {
        const isActive = thumb === triggerButton;
        thumb.classList.toggle("is-active", isActive);
        thumb.setAttribute("aria-pressed", String(isActive));
      });
  }

  if (scrollIntoView && triggerButton && typeof triggerButton.scrollIntoView === "function") {
    triggerButton.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }
}

function resetComparisonViewerCamera(viewer) {
  if (!viewer) {
    return;
  }

  viewer.cameraOrbit = "180deg 70deg auto";
  viewer.fieldOfView = "32deg";
  if (typeof viewer.resetTurntableRotation === "function") {
    viewer.resetTurntableRotation(0);
  }
  if (typeof viewer.jumpCameraToGoal === "function") {
    viewer.jumpCameraToGoal();
  }
}

function syncComparisonCamera(sourceViewer) {
  if (
    isSyncingComparisonCamera ||
    !comparisonSyncToggle ||
    !comparisonSyncToggle.checked ||
    !sourceViewer ||
    typeof sourceViewer.getCameraOrbit !== "function"
  ) {
    return;
  }

  const orbit = sourceViewer.getCameraOrbit();
  const fieldOfView =
    typeof sourceViewer.getFieldOfView === "function"
      ? sourceViewer.getFieldOfView()
      : null;

  isSyncingComparisonCamera = true;
  comparisonViewers.forEach((viewer) => {
    if (viewer === sourceViewer) {
      return;
    }

    viewer.cameraOrbit = `${orbit.theta}rad ${orbit.phi}rad ${orbit.radius}m`;
    if (fieldOfView) {
      viewer.fieldOfView = `${fieldOfView}deg`;
    }
    if (typeof viewer.jumpCameraToGoal === "function") {
      viewer.jumpCameraToGoal();
    }
  });
  isSyncingComparisonCamera = false;
}

function createComparisonViewer(scene, method) {
  const card = document.createElement("article");
  const header = document.createElement("div");
  const label = document.createElement("span");
  const description = document.createElement("span");
  const frame = document.createElement("div");

  card.className = `comparison-viewer-card comparison-viewer-card-${method.id}`;
  header.className = "comparison-viewer-header";
  label.className = "comparison-method-label";
  description.className = "comparison-method-description";
  frame.className = "comparison-viewer-frame";

  label.textContent = method.label;
  description.textContent = method.description;
  header.appendChild(label);
  header.appendChild(description);
  card.appendChild(header);

  if (method.modelSrc) {
    const viewer = document.createElement("model-viewer");
    viewer.className = "comparison-model-viewer";
    viewer.setAttribute("src", method.modelSrc);
    viewer.setAttribute("poster", scene.imageSrc);
    viewer.setAttribute("alt", `${method.label} reconstruction for ${scene.title}.`);
    viewer.setAttribute("loading", "lazy");
    viewer.setAttribute("camera-controls", "");
    viewer.setAttribute("touch-action", "pan-y");
    viewer.setAttribute("disable-tap", "");
    viewer.setAttribute("interaction-prompt", "none");
    viewer.setAttribute("camera-orbit", "180deg 70deg auto");
    viewer.setAttribute("field-of-view", "32deg");
    viewer.setAttribute("zoom-sensitivity", "0.2");
    viewer.setAttribute("min-camera-orbit", "auto auto 1m");
    viewer.setAttribute("max-camera-orbit", "auto auto 10m");
    viewer.setAttribute("shadow-intensity", "0");
    viewer.setAttribute("disable-shadow", "");
    viewer.setAttribute("exposure", "1");
    viewer.setAttribute("environment-image", "legacy");
    viewer.addEventListener("load", () => resetComparisonViewerCamera(viewer));
    viewer.addEventListener("camera-change", () => syncComparisonCamera(viewer));
    frame.appendChild(viewer);
    comparisonViewers.push(viewer);
  } else {
    const placeholder = document.createElement("div");
    const image = document.createElement("img");
    const text = document.createElement("p");

    placeholder.className = "comparison-missing";
    image.src = scene.imageSrc;
    image.alt = `${scene.title} RGB reference`;
    text.textContent = `Missing model: ${method.modelSrc}`;

    placeholder.appendChild(image);
    placeholder.appendChild(text);
    frame.appendChild(placeholder);
  }

  card.appendChild(frame);
  return card;
}

function setActiveComparisonScene(scene, triggerButton) {
  if (!comparisonViewerContainer) {
    return;
  }

  comparisonViewers = [];
  comparisonViewerContainer.innerHTML = "";

  if (comparisonSceneTitle) {
    comparisonSceneTitle.textContent = scene.title;
  }

  scene.methods.forEach((method) => {
    comparisonViewerContainer.appendChild(createComparisonViewer(scene, method));
  });

  if (comparisonSceneContainer) {
    comparisonSceneContainer.querySelectorAll(".comparison-scene-thumb").forEach((thumb) => {
      const isActive = thumb === triggerButton;
      thumb.classList.toggle("is-active", isActive);
      thumb.setAttribute("aria-pressed", String(isActive));
    });
  }
}

function renderComparisonGallery() {
  if (!comparisonViewerContainer || !comparisonSceneContainer) {
    return;
  }

  if (comparisonScenes.length === 0) {
    comparisonViewerContainer.textContent = "No comparison scenes found in assets/comp/.";
    return;
  }

  comparisonViewerContainer.innerHTML = "";
  comparisonSceneContainer.innerHTML = "";

  comparisonScenes.forEach((scene, index) => {
    const button = document.createElement("button");
    const image = document.createElement("img");
    const label = document.createElement("span");

    button.className = "comparison-scene-thumb";
    button.type = "button";
    button.setAttribute("role", "listitem");
    button.setAttribute("aria-pressed", "false");

    image.src = scene.imageSrc;
    image.alt = `${scene.title} RGB input`;
    label.textContent = scene.title;

    button.appendChild(image);
    button.appendChild(label);
    button.addEventListener("click", () => setActiveComparisonScene(scene, button));
    comparisonSceneContainer.appendChild(button);

    if (index === 0) {
      setActiveComparisonScene(scene, button);
    }
  });
}

function resetQualitativeViewerCamera() {
  if (!qualitativeViewer) {
    return;
  }

  qualitativeViewer.cameraOrbit = "180deg 70deg auto";
  if (typeof qualitativeViewer.resetTurntableRotation === "function") {
    qualitativeViewer.resetTurntableRotation(0);
  }
  if (typeof qualitativeViewer.jumpCameraToGoal === "function") {
    qualitativeViewer.jumpCameraToGoal();
  }
}

function renderVisualizationGallery() {
  if (!qualitativeViewer || !visualizationThumbContainer) {
    return;
  }

  if (visualizationItems.length === 0) {
    visualizationThumbContainer.textContent = "No visualization sequences found in assets/glb/.";
    return;
  }

  visualizationThumbContainer.innerHTML = "";

  visualizationItems.forEach((item, index) => {
    const { title, imageSrc } = item;
    const button = document.createElement("button");
    const image = document.createElement("img");
    const label = document.createElement("span");

    button.className = "visualization-thumb";
    button.type = "button";
    button.setAttribute("role", "listitem");
    button.setAttribute("aria-pressed", "false");

    image.src = imageSrc;
    image.alt = `RGB thumbnail for ${title}`;

    label.className = "visualization-thumb-label";
    label.textContent = title;

    button.appendChild(image);
    button.appendChild(label);
    button.addEventListener("click", () => setActiveVisualization(item, button, true));

    visualizationThumbContainer.appendChild(button);

    if (index === 0) {
      setActiveVisualization(item, button, false);
    }
  });
}

function renderSequenceVideoGallery() {
  if (!sequenceVideo || !sequenceVideoThumbContainer) {
    return;
  }

  if (sequenceVideoItems.length === 0) {
    sequenceVideoThumbContainer.textContent = "No sequence videos found in assets/videos/.";
    return;
  }

  sequenceVideoThumbContainer.innerHTML = "";

  sequenceVideoItems.forEach((item, index) => {
    const button = document.createElement("button");
    const image = document.createElement("img");
    const label = document.createElement("span");

    button.className = "visualization-thumb";
    button.type = "button";
    button.setAttribute("role", "listitem");
    button.setAttribute("aria-pressed", "false");

    image.src = item.imageSrc;
    image.alt = `Poster for ${item.title}`;

    label.className = "visualization-thumb-label";
    label.textContent = item.title;

    button.appendChild(image);
    button.appendChild(label);
    button.addEventListener("click", () => setActiveSequenceVideo(item, button));

    sequenceVideoThumbContainer.appendChild(button);

    if (index === 0) {
      setActiveSequenceVideo(item, button, false);
    }
  });
}

if (menuToggle && siteNav) {
  menuToggle.addEventListener("click", () => {
    const isOpen = siteNav.classList.toggle("is-open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  });

  siteNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      siteNav.classList.remove("is-open");
      menuToggle.setAttribute("aria-expanded", "false");
    });
  });
}

copyButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    const targetId = button.getAttribute("data-copy-target");
    const target = targetId ? document.getElementById(targetId) : null;

    if (!target) {
      return;
    }

    const originalText = button.textContent;

    try {
      await navigator.clipboard.writeText(target.textContent.trim());
      button.textContent = "Copied";
    } catch (error) {
      button.textContent = "Copy Failed";
    }

    window.setTimeout(() => {
      button.textContent = originalText;
    }, 1400);
  });
});

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.14 }
  );

  revealItems.forEach((item) => observer.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

if (currentYear) {
  currentYear.textContent = String(new Date().getFullYear());
}

pageVideos.forEach(bindVideoLoadingProgress);
renderVisualizationGallery();
renderSequenceVideoGallery();
// renderComparisonGallery();

if (qualitativeViewer) {
  qualitativeViewer.addEventListener("load", resetQualitativeViewerCamera);
}

// if (comparisonResetButton) {
//   comparisonResetButton.addEventListener("click", () => {
//     comparisonViewers.forEach(resetComparisonViewerCamera);
//   });
// }
