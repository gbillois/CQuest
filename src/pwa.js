const UPDATE_BUTTON_ID = "pwaUpdateBtn";

export function registerPwa() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  const updateBtn = document.getElementById(UPDATE_BUTTON_ID);
  if (!(updateBtn instanceof HTMLButtonElement)) {
    return;
  }

  let waitingWorker = null;

  const showUpdateButton = () => {
    updateBtn.hidden = false;
  };

  const hideUpdateButton = () => {
    updateBtn.hidden = true;
  };

  const trackInstallingWorker = (worker) => {
    if (!worker) {
      return;
    }
    worker.addEventListener("statechange", () => {
      if (worker.state === "installed" && navigator.serviceWorker.controller) {
        waitingWorker = navigator.serviceWorker.waiting || worker;
        showUpdateButton();
      }
    });
  };

  updateBtn.addEventListener("click", () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
    }
  });

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    window.location.reload();
  });

  navigator.serviceWorker.register("./sw.js").then((registration) => {
    if (registration.waiting) {
      waitingWorker = registration.waiting;
      showUpdateButton();
    }

    registration.addEventListener("updatefound", () => {
      trackInstallingWorker(registration.installing);
    });

    trackInstallingWorker(registration.installing);

    setInterval(() => {
      registration.update();
    }, 60 * 1000);
  }).catch(() => {
    hideUpdateButton();
  });
}
