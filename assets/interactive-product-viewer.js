if (!customElements.get("interactive-product-viewer")) {
  class InteractiveProductViewer extends HTMLElement {
    connectedCallback() {
      this.viewer = this.querySelector("[data-viewer]");
      if (!this.viewer) return;

      this.openButtons = Array.from(
        this.querySelectorAll("[data-viewer-open]")
      );
      this.panels = Array.from(this.querySelectorAll("[data-panel-id]"));
      this.menu = this.querySelector("[data-menu]");
      this.details = this.querySelector("[data-details]");
      this.mediaLayers = Array.from(
        this.querySelectorAll(
          "[data-media-id].interactive-product-viewer__media-layer"
        )
      );
      this.mediaImages = Array.from(
        this.querySelectorAll(".interactive-product-viewer__media-layer img")
      );
      this.closeButton = this.querySelector("[data-viewer-close]");
      this.previousButton = this.querySelector("[data-viewer-previous]");
      this.nextButton = this.querySelector("[data-viewer-next]");
      this.panelNav = this.querySelector("[data-panel-nav]");
      this.finishPreview = this.querySelector("[data-finish-preview]");
      this.currentFinish = this.querySelector("[data-current-finish]");
      this.activePanelId = null;
      this.lastOpenButton = null;
      this.touchStartX = null;
      this.pendingDirection = 0;
      this.panelMotionTimer = null;
      this.panelLeavingTimer = null;
      this.mediaMotionTimer = null;

      this.handleClick = this.handleClick.bind(this);
      this.handleChange = this.handleChange.bind(this);
      this.handleKeydown = this.handleKeydown.bind(this);
      this.handleResize = this.handleResize.bind(this);
      this.handleTouchStart = this.handleTouchStart.bind(this);
      this.handleTouchEnd = this.handleTouchEnd.bind(this);
      this.handleBlockSelect = this.handleBlockSelect.bind(this);

      this.addEventListener("click", this.handleClick);
      this.addEventListener("change", this.handleChange);
      this.addEventListener("keydown", this.handleKeydown);
      this.viewer.addEventListener("touchstart", this.handleTouchStart, {
        passive: true,
      });
      this.viewer.addEventListener("touchend", this.handleTouchEnd, {
        passive: true,
      });
      this.addEventListener("shopify:block:select", this.handleBlockSelect);
      window.addEventListener("resize", this.handleResize, { passive: true });

      this.syncPanelLayout();
      this.measureMenuItems();

      const selectedFinish = this.querySelector("[data-finish-id]:checked");
      if (selectedFinish) this.updateFinish(selectedFinish, false);

      this.primeImagesNearViewport();
    }

    disconnectedCallback() {
      this.removeEventListener("click", this.handleClick);
      this.removeEventListener("change", this.handleChange);
      this.removeEventListener("keydown", this.handleKeydown);
      this.removeEventListener("shopify:block:select", this.handleBlockSelect);
      this.viewer?.removeEventListener("touchstart", this.handleTouchStart);
      this.viewer?.removeEventListener("touchend", this.handleTouchEnd);
      window.removeEventListener("resize", this.handleResize);
      window.cancelAnimationFrame(this.resizeFrame);
      window.clearTimeout(this.panelMotionTimer);
      window.clearTimeout(this.panelLeavingTimer);
      window.clearTimeout(this.mediaMotionTimer);
      this.imageObserver?.disconnect();
    }

    handleClick(event) {
      const openButton = event.target.closest("[data-viewer-open]");
      if (openButton && this.contains(openButton)) {
        this.openPanel(
          openButton.dataset.viewerOpen,
          openButton.dataset.mediaId,
          openButton
        );
        return;
      }

      if (event.target.closest("[data-viewer-close]")) {
        this.closeViewer();
        return;
      }

      if (event.target.closest("[data-viewer-previous]")) {
        this.movePanel(-1);
        return;
      }

      if (event.target.closest("[data-viewer-next]")) this.movePanel(1);
    }

    handleChange(event) {
      const finishInput = event.target.closest("[data-finish-id]");
      if (!finishInput || !this.contains(finishInput)) return;
      this.updateFinish(finishInput, true);
    }

    handleKeydown(event) {
      if (!this.classList.contains("is-engaged")) return;

      if (event.key === "Escape") {
        event.preventDefault();
        this.closeViewer();
      } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
        event.preventDefault();
        this.movePanel(-1);
      } else if (event.key === "ArrowDown" || event.key === "ArrowRight") {
        event.preventDefault();
        this.movePanel(1);
      }
    }

    handleResize() {
      if (this.resizeFrame) return;
      this.resizeFrame = window.requestAnimationFrame(() => {
        this.resizeFrame = null;
        this.syncPanelLayout();
        this.measureMenuItems();
        const activeButton = this.openButtons.find(
          (button) => button.dataset.viewerOpen === this.activePanelId
        );
        if (activeButton) {
          const activePanel = this.panels.find(
            (panel) => panel.dataset.panelId === this.activePanelId
          );
          this.positionPanel(activeButton, activePanel);
        }
      });
    }

    handleTouchStart(event) {
      if (!this.classList.contains("is-engaged")) return;
      if (event.target.closest("button, input, label")) return;
      this.touchStartX = event.touches[0]?.clientX ?? null;
    }

    handleTouchEnd(event) {
      if (this.touchStartX === null || !this.classList.contains("is-engaged"))
        return;
      const touchEndX = event.changedTouches[0]?.clientX;
      if (typeof touchEndX !== "number") return;

      const distance = touchEndX - this.touchStartX;
      this.touchStartX = null;
      if (Math.abs(distance) < 50) return;
      this.movePanel(distance > 0 ? -1 : 1);
    }

    handleBlockSelect(event) {
      const finishInput = event.target.querySelector?.("[data-finish-id]");
      if (finishInput) {
        finishInput.checked = true;
        this.updateFinish(finishInput, false);
        const finishesButton = this.openButtons.find(
          (button) => button.dataset.viewerOpen === "finishes"
        );
        if (finishesButton)
          this.openPanel(
            "finishes",
            finishInput.dataset.mediaId,
            finishesButton,
            false
          );
        return;
      }

      const openButton = event.target.querySelector?.("[data-viewer-open]");
      if (openButton)
        this.openPanel(
          openButton.dataset.viewerOpen,
          openButton.dataset.mediaId,
          openButton,
          false
        );
    }

    openPanel(panelId, mediaId, openButton, shouldFocus = true) {
      const panel = this.panels.find(
        (item) => item.dataset.panelId === panelId
      );
      if (!panel) return;

      const isMobile = window.matchMedia("(max-width: 749px)").matches;
      const wasEngaged = this.classList.contains("is-engaged");
      const previousPanel = this.panels.find(
        (item) => item.dataset.panelId === this.activePanelId
      );
      const previousIndex = this.panels.indexOf(previousPanel);
      const nextIndex = this.panels.indexOf(panel);
      const direction =
        this.pendingDirection ||
        (previousIndex === -1 ? 0 : Math.sign(nextIndex - previousIndex));
      const mobileOrigin =
        isMobile && !wasEngaged ? openButton.getBoundingClientRect() : null;

      if (
        isMobile &&
        wasEngaged &&
        previousPanel &&
        previousPanel !== panel &&
        direction !== 0
      ) {
        this.animateMobilePanelOut(previousPanel, direction);
      }

      this.activePanelId = panelId;
      this.lastOpenButton = openButton;
      this.classList.add("is-engaged");

      this.openButtons.forEach((button) => {
        button.setAttribute("aria-expanded", String(button === openButton));
      });

      this.panels.forEach((item) => {
        const isActive = item === panel;
        item.classList.toggle("is-active", isActive);
        item.setAttribute("aria-hidden", String(!isActive));
      });

      this.positionPanel(openButton, panel);
      if (isMobile) {
        this.animateMobilePanelIn(panel, mobileOrigin, direction, wasEngaged);
      }
      this.activateMedia(
        mediaId || panel.dataset.mediaId || "landing",
        direction
      );
      this.updateNavigation();
      this.pendingDirection = 0;

      if (isMobile) {
        openButton.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      }

      if (shouldFocus) {
        window.requestAnimationFrame(() =>
          panel.focus({ preventScroll: true })
        );
      }
    }

    closeViewer(shouldFocus = true) {
      if (!this.classList.contains("is-engaged")) return;

      this.classList.remove("is-engaged");
      this.openButtons.forEach((button) =>
        button.setAttribute("aria-expanded", "false")
      );
      this.panels.forEach((panel) => {
        panel.classList.remove(
          "is-active",
          "is-opening-mobile",
          "is-entering-forward",
          "is-entering-backward",
          "is-leaving-forward",
          "is-leaving-backward"
        );
        panel.setAttribute("aria-hidden", "true");
      });
      this.querySelectorAll(
        ".interactive-product-viewer__menu-item.is-expanded"
      ).forEach((item) => {
        item.classList.remove("is-expanded");
        item.style.removeProperty("--apv-expanded-height");
      });
      this.activateMedia("landing", 0);
      this.activePanelId = null;
      this.pendingDirection = 0;
      if (this.panelNav) this.panelNav.setAttribute("aria-hidden", "true");

      if (shouldFocus && this.lastOpenButton) {
        window.requestAnimationFrame(() =>
          this.lastOpenButton.focus({ preventScroll: true })
        );
      }
    }

    movePanel(direction) {
      if (!this.activePanelId || !this.panels.length) return;
      const currentIndex = this.panels.findIndex(
        (panel) => panel.dataset.panelId === this.activePanelId
      );
      const nextIndex = currentIndex + direction;
      if (nextIndex < 0 || nextIndex >= this.panels.length) return;

      const nextPanel = this.panels[nextIndex];
      const nextButton = this.openButtons.find(
        (button) => button.dataset.viewerOpen === nextPanel.dataset.panelId
      );
      if (!nextButton) return;

      let mediaId = nextPanel.dataset.mediaId;
      if (nextPanel.dataset.panelId === "finishes") {
        mediaId =
          this.querySelector("[data-finish-id]:checked")?.dataset.mediaId ||
          mediaId;
      }
      this.pendingDirection = direction;
      this.openPanel(nextPanel.dataset.panelId, mediaId, nextButton);
    }

    updateNavigation() {
      const activeIndex = this.panels.findIndex(
        (panel) => panel.dataset.panelId === this.activePanelId
      );
      if (this.previousButton) this.previousButton.disabled = activeIndex <= 0;
      if (this.nextButton)
        this.nextButton.disabled =
          activeIndex === -1 || activeIndex >= this.panels.length - 1;
      if (this.panelNav) this.panelNav.setAttribute("aria-hidden", "false");
    }

    positionPanel(openButton, panel) {
      this.querySelectorAll(
        ".interactive-product-viewer__menu-item.is-expanded"
      ).forEach((item) => {
        item.classList.remove("is-expanded");
        item.style.removeProperty("--apv-expanded-height");
      });

      if (
        !openButton ||
        !panel ||
        window.matchMedia("(max-width: 749px)").matches
      )
        return;

      const menuItem = openButton.closest(
        ".interactive-product-viewer__menu-item"
      );
      if (!menuItem) return;

      const maximumHeight = Math.max(56, this.viewer.clientHeight - 80);
      const expandedHeight = Math.max(
        56,
        Math.min(panel.scrollHeight, maximumHeight)
      );
      menuItem.style.setProperty(
        "--apv-expanded-height",
        `${expandedHeight}px`
      );
      menuItem.classList.add("is-expanded");
    }

    syncPanelLayout() {
      if (!this.details) return;
      const isMobile = window.matchMedia("(max-width: 749px)").matches;

      this.panels.forEach((panel) => {
        const openButton = this.openButtons.find(
          (button) => button.dataset.viewerOpen === panel.dataset.panelId
        );
        const menuItem = openButton?.closest(
          ".interactive-product-viewer__menu-item"
        );
        const target = isMobile ? this.details : menuItem;
        if (target && panel.parentElement !== target) target.appendChild(panel);
      });
    }

    measureMenuItems() {
      this.openButtons.forEach((button) => {
        const menuItem = button.closest(
          ".interactive-product-viewer__menu-item"
        );
        if (!menuItem) return;
        menuItem.style.setProperty(
          "--apv-collapsed-width",
          `${button.getBoundingClientRect().width}px`
        );
      });
    }

    animateMobilePanelIn(panel, originRect, direction, wasEngaged) {
      window.clearTimeout(this.panelMotionTimer);
      panel.classList.remove(
        "is-opening-mobile",
        "is-entering-forward",
        "is-entering-backward"
      );

      if (!wasEngaged && originRect) {
        const viewerRect = this.viewer.getBoundingClientRect();
        const targetWidth = panel.offsetWidth;
        const targetHeight = panel.offsetHeight;
        const targetCenterX = viewerRect.left + viewerRect.width / 2;
        const targetCenterY = viewerRect.bottom - 20 - targetHeight / 2;
        const originCenterX = originRect.left + originRect.width / 2;
        const originCenterY = originRect.top + originRect.height / 2;

        panel.style.setProperty(
          "--apv-mobile-origin-x",
          `${originCenterX - targetCenterX}px`
        );
        panel.style.setProperty(
          "--apv-mobile-origin-y",
          `${originCenterY - targetCenterY}px`
        );
        panel.style.setProperty(
          "--apv-mobile-origin-scale-x",
          String(Math.max(0.12, originRect.width / targetWidth))
        );
        panel.style.setProperty(
          "--apv-mobile-origin-scale-y",
          String(Math.max(0.12, originRect.height / targetHeight))
        );
        panel.classList.add("is-opening-mobile");
      } else if (direction !== 0) {
        panel.classList.add(
          direction > 0 ? "is-entering-forward" : "is-entering-backward"
        );
      }

      this.panelMotionTimer = window.setTimeout(() => {
        panel.classList.remove(
          "is-opening-mobile",
          "is-entering-forward",
          "is-entering-backward"
        );
      }, 540);
    }

    animateMobilePanelOut(panel, direction) {
      window.clearTimeout(this.panelLeavingTimer);
      panel.classList.remove(
        "is-opening-mobile",
        "is-entering-forward",
        "is-entering-backward",
        "is-leaving-forward",
        "is-leaving-backward"
      );
      panel.classList.add(
        direction > 0 ? "is-leaving-forward" : "is-leaving-backward"
      );

      this.panelLeavingTimer = window.setTimeout(() => {
        panel.classList.remove("is-leaving-forward", "is-leaving-backward");
      }, 360);
    }

    activateMedia(mediaId, direction = 0) {
      const hasRequestedMedia = this.mediaLayers.some(
        (layer) => layer.dataset.mediaId === mediaId
      );
      const resolvedMediaId = hasRequestedMedia ? mediaId : "landing";
      const previousLayer = this.mediaLayers.find((layer) =>
        layer.classList.contains("is-active")
      );
      const nextLayer = this.mediaLayers.find(
        (layer) => layer.dataset.mediaId === resolvedMediaId
      );

      window.clearTimeout(this.mediaMotionTimer);
      this.mediaLayers.forEach((layer) => {
        layer.classList.remove(
          "is-entering-forward",
          "is-entering-backward",
          "is-entering-neutral",
          "is-leaving-forward",
          "is-leaving-backward",
          "is-leaving-neutral"
        );
      });

      this.mediaLayers.forEach((layer) => {
        const isActive = layer.dataset.mediaId === resolvedMediaId;
        layer.classList.toggle("is-active", isActive);
        layer.setAttribute("aria-hidden", String(!isActive));
      });

      if (
        window.matchMedia("(max-width: 749px)").matches &&
        previousLayer &&
        nextLayer &&
        previousLayer !== nextLayer
      ) {
        const motionName =
          direction > 0 ? "forward" : direction < 0 ? "backward" : "neutral";
        previousLayer.classList.add(`is-leaving-${motionName}`);
        nextLayer.classList.add(`is-entering-${motionName}`);
        this.mediaMotionTimer = window.setTimeout(() => {
          previousLayer.classList.remove(`is-leaving-${motionName}`);
          nextLayer.classList.remove(`is-entering-${motionName}`);
        }, 540);
      }
    }

    updateFinish(input, activateMedia = true) {
      const swatchUrl = input.dataset.swatchUrl || "";
      const swatchColor = input.dataset.swatchColor || "#e3ddd7";

      if (this.finishPreview) {
        this.finishPreview.style.setProperty("--apv-swatch-color", swatchColor);
        this.finishPreview.style.setProperty(
          "--apv-swatch-image",
          swatchUrl ? `url("${swatchUrl}")` : "none"
        );
      }

      if (this.currentFinish)
        this.currentFinish.textContent = input.dataset.finishLabel || "";

      const finishesButton = this.openButtons.find(
        (button) => button.dataset.viewerOpen === "finishes"
      );
      const finishesPanel = this.panels.find(
        (panel) => panel.dataset.panelId === "finishes"
      );
      if (finishesButton)
        finishesButton.dataset.mediaId = input.dataset.mediaId || "landing";
      if (finishesPanel)
        finishesPanel.dataset.mediaId = input.dataset.mediaId || "landing";

      if (activateMedia && this.activePanelId === "finishes") {
        this.activateMedia(input.dataset.mediaId || "landing");
      }
    }

    primeImagesNearViewport() {
      if (!("IntersectionObserver" in window)) {
        this.mediaImages.forEach((image) => {
          image.loading = "eager";
        });
        return;
      }

      this.imageObserver = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          this.mediaImages.forEach((image) => {
            image.loading = "eager";
          });
          this.imageObserver.disconnect();
        },
        { rootMargin: "800px 0px" }
      );
      this.imageObserver.observe(this);
    }
  }

  customElements.define("interactive-product-viewer", InteractiveProductViewer);
}
