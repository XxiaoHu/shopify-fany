if (!customElements.get('highlights-image-gallery')) {
  class HighlightsImageGallery extends HTMLElement {
    constructor() {
      super();

      this.activeIndex = 0;
      this.elapsed = 0;
      this.startedAt = 0;
      this.isPlaying = false;
      this.isEnded = false;
      this.userPaused = false;
      this.isInView = false;
      this.isProgrammaticScroll = false;
      this.wasDragged = false;
      this.scrollFrame = null;
      this.progressFrame = null;
      this.scrollEndTimer = null;
      this.resizeTimer = null;
      this.releaseProgrammaticTimer = null;
      this.pointer = null;
    }

    connectedCallback() {
      this.viewport = this.querySelector('[data-gallery-viewport]');
      this.slides = Array.from(this.querySelectorAll('[data-gallery-slide]'));
      this.tabs = Array.from(this.querySelectorAll('[data-gallery-tab]'));
      this.pagination = this.querySelector('.highlights-image-gallery__pagination');
      this.playPauseButton = this.querySelector('[data-gallery-play-pause]');
      this.status = this.querySelector('[data-gallery-status]');
      this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.autoplayDuration = Number(this.dataset.autoplayDuration) || 6150;
      this.transitionDuration = Number(this.dataset.transitionDuration) || 450;

      if (!this.viewport || !this.slides.length || !this.playPauseButton) return;

      this.onClick = this.handleClick.bind(this);
      this.onKeydown = this.handleKeydown.bind(this);
      this.onScroll = this.handleScroll.bind(this);
      this.onPointerDown = this.handlePointerDown.bind(this);
      this.onPointerMove = this.handlePointerMove.bind(this);
      this.onPointerUp = this.handlePointerUp.bind(this);
      this.onIntersection = this.handleIntersection.bind(this);
      this.onVisibilityChange = this.handleVisibilityChange.bind(this);
      this.onResize = this.handleResize.bind(this);
      this.onReducedMotionChange = this.handleReducedMotionChange.bind(this);
      this.onBlockSelect = this.handleBlockSelect.bind(this);

      this.addEventListener('click', this.onClick);
      this.addEventListener('keydown', this.onKeydown);
      this.viewport.addEventListener('scroll', this.onScroll, { passive: true });
      this.viewport.addEventListener('pointerdown', this.onPointerDown);
      this.viewport.addEventListener('pointermove', this.onPointerMove, { passive: true });
      this.viewport.addEventListener('pointerup', this.onPointerUp);
      this.viewport.addEventListener('pointercancel', this.onPointerUp);
      document.addEventListener('visibilitychange', this.onVisibilityChange);
      window.addEventListener('resize', this.onResize, { passive: true });
      document.addEventListener('shopify:block:select', this.onBlockSelect);

      if (this.reducedMotion.addEventListener) {
        this.reducedMotion.addEventListener('change', this.onReducedMotionChange);
      } else {
        this.reducedMotion.addListener(this.onReducedMotionChange);
      }

      this.setActiveIndex(0, false);
      this.setProgress(0);

      if (this.slides.length === 1) {
        this.classList.add('is-single');
        this.playPauseButton.hidden = true;
      }

      if ('IntersectionObserver' in window) {
        this.intersectionObserver = new IntersectionObserver(this.onIntersection, {
          threshold: [0, 0.35, 0.6],
        });
        this.intersectionObserver.observe(this);
      } else {
        this.isInView = true;
        this.classList.add('is-controls-visible');
        if (!this.reducedMotion.matches && this.slides.length > 1) this.play();
      }
    }

    disconnectedCallback() {
      this.cancelProgressFrame();
      this.cancelScrollAnimation();
      window.clearTimeout(this.scrollEndTimer);
      window.clearTimeout(this.resizeTimer);
      window.clearTimeout(this.releaseProgrammaticTimer);
      this.intersectionObserver?.disconnect();

      this.removeEventListener('click', this.onClick);
      this.removeEventListener('keydown', this.onKeydown);
      this.viewport?.removeEventListener('scroll', this.onScroll);
      this.viewport?.removeEventListener('pointerdown', this.onPointerDown);
      this.viewport?.removeEventListener('pointermove', this.onPointerMove);
      this.viewport?.removeEventListener('pointerup', this.onPointerUp);
      this.viewport?.removeEventListener('pointercancel', this.onPointerUp);
      document.removeEventListener('visibilitychange', this.onVisibilityChange);
      window.removeEventListener('resize', this.onResize);
      document.removeEventListener('shopify:block:select', this.onBlockSelect);

      if (this.reducedMotion?.removeEventListener) {
        this.reducedMotion.removeEventListener('change', this.onReducedMotionChange);
      } else {
        this.reducedMotion?.removeListener(this.onReducedMotionChange);
      }
    }

    handleIntersection(entries) {
      const entry = entries[entries.length - 1];
      const wasInView = this.isInView;
      this.isInView = entry.isIntersecting && entry.intersectionRatio >= 0.35;

      if (entry.isIntersecting) this.classList.add('is-controls-visible');

      if (this.isInView && !wasInView) {
        if (!this.userPaused && !this.isEnded && !this.reducedMotion.matches && this.slides.length > 1) {
          this.play();
        }
      } else if (!this.isInView && wasInView) {
        this.pause(false);
      }
    }

    handleVisibilityChange() {
      if (document.hidden) {
        this.pause(false);
      } else if (this.isInView && !this.userPaused && !this.isEnded && !this.reducedMotion.matches) {
        this.play();
      }
    }

    handleReducedMotionChange(event) {
      if (event.matches) {
        this.pause(false);
      } else if (this.isInView && !this.userPaused && !this.isEnded) {
        this.play();
      }
    }

    handleClick(event) {
      const tab = event.target.closest('[data-gallery-tab]');
      if (tab) {
        this.goTo(Number(tab.dataset.galleryIndex), { source: 'manual', focusTab: true });
        return;
      }

      if (event.target.closest('[data-gallery-play-pause]')) {
        if (this.isEnded) {
          this.replay();
        } else if (this.isPlaying) {
          this.pause(true);
        } else {
          this.userPaused = false;
          this.play();
        }
        return;
      }

      const slide = event.target.closest('[data-gallery-slide]');
      if (!slide) return;

      if (this.wasDragged) {
        this.wasDragged = false;
        return;
      }

      const index = Number(slide.dataset.galleryIndex);
      if (index !== this.activeIndex) this.goTo(index, { source: 'manual' });
    }

    handleKeydown(event) {
      const isTab = event.target.matches('[data-gallery-tab]');
      const isSlide = event.target.matches('[data-gallery-slide]');
      if (!isTab && !isSlide) return;

      let nextIndex = null;

      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        nextIndex = Math.max(0, this.activeIndex - 1);
      } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        nextIndex = Math.min(this.slides.length - 1, this.activeIndex + 1);
      } else if (event.key === 'Home') {
        nextIndex = 0;
      } else if (event.key === 'End') {
        nextIndex = this.slides.length - 1;
      }

      if (nextIndex === null) return;

      event.preventDefault();
      this.goTo(nextIndex, { source: 'manual', focusTab: isTab });
    }

    handlePointerDown(event) {
      if (event.button !== undefined && event.button !== 0) return;

      this.cancelScrollAnimation();
      this.pause(true);
      this.pointer = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        scrollLeft: this.viewport.scrollLeft,
        dragging: false,
        nativeScroll: event.pointerType !== 'mouse',
      };
      this.wasDragged = false;

      if (event.pointerType === 'mouse') this.viewport.setPointerCapture?.(event.pointerId);
    }

    handlePointerMove(event) {
      if (!this.pointer || event.pointerId !== this.pointer.id) return;

      const deltaX = event.clientX - this.pointer.x;
      const deltaY = event.clientY - this.pointer.y;

      if (!this.pointer.dragging) {
        if (Math.abs(deltaX) < 5 && Math.abs(deltaY) < 5) return;
        if (Math.abs(deltaY) > Math.abs(deltaX)) {
          this.pointer = null;
          return;
        }

        this.pointer.dragging = true;
        this.wasDragged = true;
        if (!this.pointer.nativeScroll) this.viewport.classList.add('is-dragging');
      }

      if (this.pointer.nativeScroll) return;

      this.viewport.scrollLeft = this.pointer.scrollLeft - deltaX;
    }

    handlePointerUp(event) {
      if (!this.pointer || event.pointerId !== this.pointer.id) return;

      const wasDragging = this.pointer.dragging;
      const usedNativeScroll = this.pointer.nativeScroll;
      if (event.pointerType === 'mouse' && this.viewport.hasPointerCapture?.(event.pointerId)) {
        this.viewport.releasePointerCapture(event.pointerId);
      }

      this.pointer = null;
      this.viewport.classList.remove('is-dragging');

      if (wasDragging && !usedNativeScroll) {
        const nearestIndex = this.getNearestIndex();
        this.goTo(nearestIndex, { source: 'manual', force: true });
      }

      if (wasDragging) {
        window.setTimeout(() => {
          this.wasDragged = false;
        }, 80);
      }
    }

    handleScroll() {
      if (this.isProgrammaticScroll || (this.pointer?.dragging && !this.pointer.nativeScroll)) return;

      window.clearTimeout(this.scrollEndTimer);
      this.scrollEndTimer = window.setTimeout(() => {
        const nearestIndex = this.getNearestIndex();
        if (nearestIndex !== this.activeIndex) {
          this.goTo(nearestIndex, { source: 'manual', animate: false });
        }
      }, 120);
    }

    handleResize() {
      window.clearTimeout(this.resizeTimer);
      this.resizeTimer = window.setTimeout(() => {
        this.cancelScrollAnimation();
        this.scrollToIndex(this.activeIndex, false);
      }, 150);
    }

    handleBlockSelect(event) {
      if (!this.contains(event.target)) return;

      const blockId = event.detail?.blockId;
      const index = this.slides.findIndex((slide) => slide.dataset.blockId === blockId);
      if (index < 0) return;

      this.classList.add('is-controls-visible');
      this.goTo(index, { source: 'editor' });
    }

    goTo(index, options = {}) {
      const { source = 'manual', animate = true, focusTab = false, force = false } = options;
      const nextIndex = Math.max(0, Math.min(this.slides.length - 1, index));
      const indexChanged = nextIndex !== this.activeIndex;

      if (source !== 'auto') {
        this.isEnded = false;
        this.pause(true);
        if (indexChanged || source === 'editor') {
          this.elapsed = 0;
          this.setProgress(0);
        }
      }

      if (!indexChanged && !force) {
        if (focusTab) this.tabs[nextIndex]?.focus();
        return;
      }

      this.setActiveIndex(nextIndex, source !== 'auto');
      this.scrollToIndex(nextIndex, animate);

      if (focusTab) this.tabs[nextIndex]?.focus();
    }

    setActiveIndex(index, announce = false) {
      this.activeIndex = index;

      this.slides.forEach((slide, slideIndex) => {
        const isActive = slideIndex === index;
        slide.classList.toggle('is-active', isActive);
        slide.setAttribute('aria-hidden', String(!isActive));
        slide.tabIndex = isActive ? 0 : -1;
      });

      this.tabs.forEach((tab, tabIndex) => {
        const isActive = tabIndex === index;
        tab.classList.toggle('is-active', isActive);
        tab.setAttribute('aria-selected', String(isActive));
        tab.tabIndex = isActive ? 0 : -1;
      });

      this.keepActiveTabVisible();

      if (announce && this.status) {
        const title = this.tabs[index]?.innerText.trim() || `Highlight ${index + 1}`;
        this.status.textContent = `${title}, ${index + 1} of ${this.slides.length}`;
      }
    }

    play() {
      if (this.slides.length < 2 || this.reducedMotion.matches || document.hidden) return;
      if (this.isEnded) {
        this.replay();
        return;
      }
      if (this.isPlaying) return;

      this.isPlaying = true;
      this.userPaused = false;
      this.startedAt = performance.now();
      this.updateControlState('playing');
      this.progressFrame = requestAnimationFrame((time) => this.tick(time));
    }

    pause(userInitiated = true) {
      if (this.isPlaying) {
        this.elapsed = Math.min(
          this.autoplayDuration,
          this.elapsed + Math.max(0, performance.now() - this.startedAt)
        );
      }

      this.isPlaying = false;
      if (userInitiated) this.userPaused = true;
      this.cancelProgressFrame();
      if (!this.isEnded) this.updateControlState('paused');
    }

    replay() {
      this.isEnded = false;
      this.userPaused = false;
      this.elapsed = 0;
      this.setProgress(0);
      this.setActiveIndex(0, true);
      this.scrollToIndex(0, true);
      this.play();
    }

    tick(time) {
      if (!this.isPlaying) return;

      const progress = Math.min(1, (this.elapsed + time - this.startedAt) / this.autoplayDuration);
      this.setProgress(progress);

      if (progress >= 1) {
        if (this.activeIndex < this.slides.length - 1) {
          this.elapsed = 0;
          this.startedAt = time;
          this.setProgress(0);
          this.setActiveIndex(this.activeIndex + 1, false);
          this.scrollToIndex(this.activeIndex, true);
        } else {
          this.isPlaying = false;
          this.isEnded = true;
          this.elapsed = this.autoplayDuration;
          this.setProgress(1);
          this.updateControlState('ended');
          return;
        }
      }

      this.progressFrame = requestAnimationFrame((nextTime) => this.tick(nextTime));
    }

    updateControlState(state) {
      this.classList.remove('is-playing', 'is-paused', 'is-ended');
      this.classList.add(`is-${state}`);

      const labelKey = state === 'playing' ? 'labelPause' : state === 'ended' ? 'labelReplay' : 'labelPlay';
      this.playPauseButton.setAttribute('aria-label', this.playPauseButton.dataset[labelKey]);
    }

    setProgress(value) {
      this.style.setProperty('--highlights-progress', Math.max(0, Math.min(1, value)).toFixed(4));
    }

    getNearestIndex() {
      const firstOffset = this.slides[0].offsetLeft;
      let nearestIndex = 0;
      let smallestDistance = Infinity;

      this.slides.forEach((slide, index) => {
        const target = slide.offsetLeft - firstOffset;
        const distance = Math.abs(this.viewport.scrollLeft - target);
        if (distance < smallestDistance) {
          smallestDistance = distance;
          nearestIndex = index;
        }
      });

      return nearestIndex;
    }

    scrollToIndex(index, animate = true) {
      const firstOffset = this.slides[0].offsetLeft;
      const target = this.slides[index].offsetLeft - firstOffset;
      const start = this.viewport.scrollLeft;
      const distance = target - start;

      this.cancelScrollAnimation();
      window.clearTimeout(this.releaseProgrammaticTimer);
      this.isProgrammaticScroll = true;

      if (!animate || this.reducedMotion.matches || Math.abs(distance) < 1) {
        this.viewport.scrollLeft = target;
        this.releaseProgrammaticScroll();
        return;
      }

      const startTime = performance.now();
      const duration = this.transitionDuration;

      const step = (time) => {
        const progress = Math.min(1, (time - startTime) / duration);
        const eased = 1 - Math.pow(1 - progress, 5);
        this.viewport.scrollLeft = start + distance * eased;

        if (progress < 1) {
          this.scrollFrame = requestAnimationFrame(step);
        } else {
          this.scrollFrame = null;
          this.viewport.scrollLeft = target;
          this.releaseProgrammaticScroll();
        }
      };

      this.scrollFrame = requestAnimationFrame(step);
    }

    releaseProgrammaticScroll() {
      window.clearTimeout(this.releaseProgrammaticTimer);
      this.releaseProgrammaticTimer = window.setTimeout(() => {
        this.isProgrammaticScroll = false;
      }, 80);
    }

    keepActiveTabVisible() {
      const tab = this.tabs[this.activeIndex];
      if (!tab || !this.pagination) return;

      const left = tab.offsetLeft;
      const right = left + tab.offsetWidth;
      const visibleLeft = this.pagination.scrollLeft;
      const visibleRight = visibleLeft + this.pagination.clientWidth;

      if (left < visibleLeft) {
        this.pagination.scrollTo({ left: Math.max(0, left - 8), behavior: 'smooth' });
      } else if (right > visibleRight) {
        this.pagination.scrollTo({ left: right - this.pagination.clientWidth + 8, behavior: 'smooth' });
      }
    }

    cancelProgressFrame() {
      if (this.progressFrame) cancelAnimationFrame(this.progressFrame);
      this.progressFrame = null;
    }

    cancelScrollAnimation() {
      if (this.scrollFrame) cancelAnimationFrame(this.scrollFrame);
      this.scrollFrame = null;
      this.isProgrammaticScroll = false;
    }
  }

  customElements.define('highlights-image-gallery', HighlightsImageGallery);
}
