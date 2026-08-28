if (!customElements.get('apple-scroll-feature-gallery')) {
  class AppleScrollFeatureGallery extends HTMLElement {
    connectedCallback() {
      this.visual = this.querySelector('[data-asfg-visual]');
      this.blurLayer = this.querySelector('[data-asfg-blur]');
      this.backgroundMedia = this.querySelector(
        '.apple-scroll-feature-gallery__background-image, .apple-scroll-feature-gallery__background-fallback'
      );
      this.details = this.querySelector('[data-asfg-details]');
      this.detailItems = Array.from(this.querySelectorAll('[data-asfg-detail-item]'));
      this.cards = Array.from(this.querySelectorAll('[data-asfg-card]'));
      this.controls = this.querySelector('[data-asfg-controls]');
      this.track = this.querySelector('[data-asfg-track]');
      this.previousButton = this.querySelector('[data-asfg-previous]');
      this.nextButton = this.querySelector('[data-asfg-next]');
      this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.mobileViewport = window.matchMedia('(max-width: 749px)');
      this.frame = null;
      this.resizeFrame = null;
      this.isInView = false;
      this.dragState = null;

      if (!this.visual || !this.blurLayer || !this.details) return;

      this.handleWindowScroll = this.handleWindowScroll.bind(this);
      this.handleWindowResize = this.handleWindowResize.bind(this);
      this.handleIntersection = this.handleIntersection.bind(this);
      this.handleTrackScroll = this.handleTrackScroll.bind(this);
      this.handleClick = this.handleClick.bind(this);
      this.handleKeydown = this.handleKeydown.bind(this);
      this.handlePointerDown = this.handlePointerDown.bind(this);
      this.handlePointerMove = this.handlePointerMove.bind(this);
      this.handlePointerUp = this.handlePointerUp.bind(this);
      this.handleBlockSelect = this.handleBlockSelect.bind(this);
      this.handleReducedMotionChange = this.handleReducedMotionChange.bind(this);

      this.classList.add('is-ready');
      this.addEventListener('click', this.handleClick);
      this.addEventListener('shopify:block:select', this.handleBlockSelect);
      window.addEventListener('scroll', this.handleWindowScroll, { passive: true });
      window.addEventListener('resize', this.handleWindowResize, { passive: true });

      if (this.track) {
        this.track.addEventListener('scroll', this.handleTrackScroll, { passive: true });
        this.track.addEventListener('keydown', this.handleKeydown);
        this.track.addEventListener('pointerdown', this.handlePointerDown);
        this.track.addEventListener('pointermove', this.handlePointerMove);
        this.track.addEventListener('pointerup', this.handlePointerUp);
        this.track.addEventListener('pointercancel', this.handlePointerUp);
        this.track.addEventListener('lostpointercapture', this.handlePointerUp);
      }

      if (this.reducedMotion.addEventListener) {
        this.reducedMotion.addEventListener('change', this.handleReducedMotionChange);
      } else {
        this.reducedMotion.addListener(this.handleReducedMotionChange);
      }

      if ('IntersectionObserver' in window) {
        this.intersectionObserver = new IntersectionObserver(this.handleIntersection, {
          rootMargin: '100% 0px 100% 0px',
          threshold: 0,
        });
        this.intersectionObserver.observe(this);

        this.introObserver = new IntersectionObserver(
          (entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
              this.classList.add('has-entered');
              this.introObserver?.disconnect();
            }
          },
          { threshold: 0.2 }
        );
        this.introObserver.observe(this.querySelector('.apple-scroll-feature-gallery__intro'));
      } else {
        this.isInView = true;
        this.classList.add('has-entered', 'is-active');
      }

      if ('ResizeObserver' in window) {
        this.resizeObserver = new ResizeObserver(this.handleWindowResize);
        this.resizeObserver.observe(this);
        this.resizeObserver.observe(this.details);
      }

      this.measure();
      this.updateAnimation();
      this.updateNavigation();
    }

    disconnectedCallback() {
      window.removeEventListener('scroll', this.handleWindowScroll);
      window.removeEventListener('resize', this.handleWindowResize);
      this.removeEventListener('click', this.handleClick);
      this.removeEventListener('shopify:block:select', this.handleBlockSelect);

      if (this.track) {
        this.track.removeEventListener('scroll', this.handleTrackScroll);
        this.track.removeEventListener('keydown', this.handleKeydown);
        this.track.removeEventListener('pointerdown', this.handlePointerDown);
        this.track.removeEventListener('pointermove', this.handlePointerMove);
        this.track.removeEventListener('pointerup', this.handlePointerUp);
        this.track.removeEventListener('pointercancel', this.handlePointerUp);
        this.track.removeEventListener('lostpointercapture', this.handlePointerUp);
      }

      if (this.reducedMotion?.removeEventListener) {
        this.reducedMotion.removeEventListener('change', this.handleReducedMotionChange);
      } else {
        this.reducedMotion?.removeListener(this.handleReducedMotionChange);
      }

      this.intersectionObserver?.disconnect();
      this.introObserver?.disconnect();
      this.resizeObserver?.disconnect();
      window.cancelAnimationFrame(this.frame);
      window.cancelAnimationFrame(this.resizeFrame);
    }

    handleIntersection(entries) {
      const entry = entries[entries.length - 1];
      this.isInView = entry.isIntersecting;
      this.classList.toggle('is-active', this.isInView);
      if (this.isInView) this.scheduleAnimation();
    }

    handleWindowScroll() {
      if (this.isInView || !this.intersectionObserver) this.scheduleAnimation();
    }

    handleWindowResize() {
      if (this.resizeFrame) return;
      this.resizeFrame = window.requestAnimationFrame(() => {
        this.resizeFrame = null;
        this.measure();
        this.updateAnimation();
        this.updateNavigation();
      });
    }

    handleReducedMotionChange() {
      this.updateAnimation();
    }

    handleTrackScroll() {
      if (this.navigationFrame) return;
      this.navigationFrame = window.requestAnimationFrame(() => {
        this.navigationFrame = null;
        this.updateNavigation();
      });
    }

    handleClick(event) {
      const previous = event.target.closest('[data-asfg-previous]');
      const next = event.target.closest('[data-asfg-next]');
      if (previous && this.contains(previous)) this.moveGallery(-1);
      if (next && this.contains(next)) this.moveGallery(1);
    }

    handleKeydown(event) {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      this.moveGallery(event.key === 'ArrowRight' ? 1 : -1);
    }

    handlePointerDown(event) {
      if (event.pointerType !== 'mouse' || event.button !== 0) return;
      this.dragState = {
        pointerId: event.pointerId,
        startX: event.clientX,
        scrollLeft: this.track.scrollLeft,
      };
      this.track.classList.add('is-dragging');
      this.track.setPointerCapture?.(event.pointerId);
    }

    handlePointerMove(event) {
      if (!this.dragState || event.pointerId !== this.dragState.pointerId) return;
      event.preventDefault();
      this.track.scrollLeft = this.dragState.scrollLeft - (event.clientX - this.dragState.startX);
    }

    handlePointerUp(event) {
      if (!this.dragState || event.pointerId !== this.dragState.pointerId) return;
      this.track.classList.remove('is-dragging');
      if (this.track.hasPointerCapture?.(event.pointerId)) {
        this.track.releasePointerCapture(event.pointerId);
      }
      this.dragState = null;
    }

    handleBlockSelect(event) {
      const card = event.target.closest?.('[data-asfg-card]');
      if (!card || !this.contains(card)) return;

      card.scrollIntoView({
        behavior: this.reducedMotion.matches ? 'auto' : 'smooth',
        block: 'center',
        inline: 'center',
      });
    }

    scheduleAnimation() {
      if (this.frame) return;
      this.frame = window.requestAnimationFrame(() => {
        this.frame = null;
        this.updateAnimation();
      });
    }

    measure() {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const detailsTop = this.details.getBoundingClientRect().top + scrollTop;
      const viewportHeight = Math.max(window.innerHeight, 1);
      const triggerOffset = window.matchMedia('(max-width: 1068px) and (orientation: portrait)').matches
        ? viewportHeight * 0.08
        : 0;

      this.blurStart = detailsTop - viewportHeight * 0.75 - triggerOffset;
      this.blurEnd = this.blurStart + viewportHeight * 0.2;
    }

    updateAnimation() {
      if (!Number.isFinite(this.blurStart) || !Number.isFinite(this.blurEnd)) this.measure();

      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      let blurProgress = this.clamp((scrollTop - this.blurStart) / Math.max(this.blurEnd - this.blurStart, 1));

      if (this.reducedMotion.matches) blurProgress = scrollTop >= this.blurStart ? 1 : 0;

      const blur = Math.round(blurProgress * 20 * 100) / 100;
      const brightness = Math.round((100 - blurProgress * 40) * 100) / 100;
      const shade = Math.round(blurProgress * 0.2 * 1000) / 1000;
      const filter = `blur(${blur}px) brightness(${brightness}%)`;

      this.style.setProperty('--asfg-blur-progress', blurProgress.toFixed(4));

      if (this.mobileViewport.matches && this.backgroundMedia) {
        const backgroundScale = (1 + blurProgress * 0.05).toFixed(4);

        this.blurLayer.style.webkitBackdropFilter = 'none';
        this.blurLayer.style.backdropFilter = 'none';
        this.backgroundMedia.style.webkitFilter = filter;
        this.backgroundMedia.style.filter = filter;
        this.backgroundMedia.style.transform = `scale(${backgroundScale})`;
      } else {
        this.blurLayer.style.webkitBackdropFilter = filter;
        this.blurLayer.style.backdropFilter = filter;

        if (this.backgroundMedia) {
          this.backgroundMedia.style.webkitFilter = '';
          this.backgroundMedia.style.filter = '';
          this.backgroundMedia.style.transform = '';
        }
      }

      this.blurLayer.style.backgroundColor = `rgba(0, 0, 0, ${shade})`;

      const copyProgress = this.clamp((blurProgress - 0.14) / 0.58);
      this.applyReveal(this.detailItems[0], copyProgress, 20);

      this.cards.forEach((card, index) => {
        const cardStart = 0.3 + index * 0.055;
        const cardProgress = this.clamp((blurProgress - cardStart) / 0.42);
        this.applyReveal(card, cardProgress, 24);
      });

      const galleryProgress = this.clamp((blurProgress - 0.28) / 0.5);
      if (this.detailItems[1]) {
        this.detailItems[1].style.opacity = '1';
        this.detailItems[1].style.transform = 'none';
      }
      this.applyReveal(this.controls, galleryProgress, 14);
    }

    applyReveal(element, progress, distance) {
      if (!element) return;
      const resolvedProgress = this.reducedMotion.matches ? (progress > 0 ? 1 : 0) : progress;
      element.style.opacity = resolvedProgress.toFixed(4);
      element.style.transform = `translate3d(0, ${(1 - resolvedProgress) * distance}px, 0)`;
    }

    moveGallery(direction) {
      if (!this.track || !this.cards.length) return;
      const currentIndex = this.findClosestCardIndex();
      const targetIndex = Math.max(0, Math.min(currentIndex + direction, this.cards.length - 1));
      const target = this.cards[targetIndex];
      const trackRect = this.track.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const contentPadding = this.getContentPadding();

      this.track.scrollBy({
        left: targetRect.left - trackRect.left - contentPadding,
        behavior: this.reducedMotion.matches ? 'auto' : 'smooth',
      });
    }

    findClosestCardIndex() {
      const trackStart = this.track.getBoundingClientRect().left + this.getContentPadding();
      let closestIndex = 0;
      let closestDistance = Number.POSITIVE_INFINITY;

      this.cards.forEach((card, index) => {
        const distance = Math.abs(card.getBoundingClientRect().left - trackStart);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });

      return closestIndex;
    }

    getContentPadding() {
      return parseFloat(window.getComputedStyle(this).getPropertyValue('--asfg-content-padding')) || 0;
    }

    getLogicalScrollLeft() {
      return Math.abs(this.track?.scrollLeft || 0);
    }

    updateNavigation() {
      if (!this.track || !this.previousButton || !this.nextButton) return;
      const maxScroll = Math.max(this.track.scrollWidth - this.track.clientWidth, 0);
      const current = this.getLogicalScrollLeft();
      const tolerance = 2;

      this.previousButton.disabled = current <= tolerance;
      this.nextButton.disabled = current >= maxScroll - tolerance;
    }

    clamp(value) {
      return Math.min(Math.max(value, 0), 1);
    }
  }

  customElements.define('apple-scroll-feature-gallery', AppleScrollFeatureGallery);
}
