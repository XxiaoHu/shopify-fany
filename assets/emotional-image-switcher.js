if (!customElements.get('emotional-image-switcher')) {
  class EmotionalImageSwitcher extends HTMLElement {
    constructor() {
      super();

      this.activeIndex = 0;
      this.timer = null;
      this.isInView = false;
      this.isHovered = false;
      this.hasEntered = false;
    }

    connectedCallback() {
      this.tabsContainer = this.querySelector('[data-emotional-tabs]');
      this.slider = this.querySelector('[data-emotional-slider]');
      this.tabs = Array.from(this.querySelectorAll('[data-emotional-tab]'));
      this.panels = Array.from(this.querySelectorAll('[data-emotional-panel]'));
      this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.mobileLayout = window.matchMedia('(max-aspect-ratio: 11 / 10), (max-width: 749px)');
      this.autoplayEnabled = this.dataset.autoplay === 'true';
      this.autoplayInterval = Math.max(Number(this.dataset.autoplayInterval) || 5000, 1000);

      if (!this.tabs.length || !this.panels.length) {
        this.classList.add('is-entered', 'is-single');
        return;
      }

      this.onClick = this.handleClick.bind(this);
      this.onKeydown = this.handleKeydown.bind(this);
      this.onPointerEnter = this.handlePointerEnter.bind(this);
      this.onPointerLeave = this.handlePointerLeave.bind(this);
      this.onVisibilityChange = this.handleVisibilityChange.bind(this);
      this.onIntersection = this.handleIntersection.bind(this);
      this.onResize = this.handleResize.bind(this);
      this.onBlockSelect = this.handleBlockSelect.bind(this);
      this.onReducedMotionChange = this.handleReducedMotionChange.bind(this);

      this.addEventListener('click', this.onClick);
      this.addEventListener('keydown', this.onKeydown);
      this.addEventListener('pointerenter', this.onPointerEnter);
      this.addEventListener('pointerleave', this.onPointerLeave);
      document.addEventListener('visibilitychange', this.onVisibilityChange);
      document.addEventListener('shopify:block:select', this.onBlockSelect);
      window.addEventListener('resize', this.onResize, { passive: true });

      if (this.reducedMotion.addEventListener) {
        this.reducedMotion.addEventListener('change', this.onReducedMotionChange);
      } else {
        this.reducedMotion.addListener(this.onReducedMotionChange);
      }

      this.setActive(0, false);

      if (this.tabs.length === 1) this.classList.add('is-single');

      if ('ResizeObserver' in window && this.tabsContainer) {
        this.resizeObserver = new ResizeObserver(this.onResize);
        this.resizeObserver.observe(this.tabsContainer);
      }

      if ('IntersectionObserver' in window) {
        this.intersectionObserver = new IntersectionObserver(this.onIntersection, {
          threshold: [0, 0.2, 0.45],
        });
        this.intersectionObserver.observe(this);
      } else {
        this.isInView = true;
        this.enter();
        this.scheduleNext();
      }
    }

    disconnectedCallback() {
      this.clearTimer();
      this.intersectionObserver?.disconnect();
      this.resizeObserver?.disconnect();

      this.removeEventListener('click', this.onClick);
      this.removeEventListener('keydown', this.onKeydown);
      this.removeEventListener('pointerenter', this.onPointerEnter);
      this.removeEventListener('pointerleave', this.onPointerLeave);
      document.removeEventListener('visibilitychange', this.onVisibilityChange);
      document.removeEventListener('shopify:block:select', this.onBlockSelect);
      window.removeEventListener('resize', this.onResize);

      if (this.reducedMotion?.removeEventListener) {
        this.reducedMotion.removeEventListener('change', this.onReducedMotionChange);
      } else {
        this.reducedMotion?.removeListener(this.onReducedMotionChange);
      }
    }

    handleClick(event) {
      const tab = event.target.closest('[data-emotional-tab]');
      if (!tab || !this.contains(tab)) return;

      this.setActive(Number(tab.dataset.emotionalIndex), true);
    }

    handleKeydown(event) {
      const tab = event.target.closest('[data-emotional-tab]');
      if (!tab || !this.contains(tab)) return;

      let nextIndex = null;

      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        nextIndex = (Number(tab.dataset.emotionalIndex) + 1) % this.tabs.length;
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        nextIndex = (Number(tab.dataset.emotionalIndex) - 1 + this.tabs.length) % this.tabs.length;
      } else if (event.key === 'Home') {
        nextIndex = 0;
      } else if (event.key === 'End') {
        nextIndex = this.tabs.length - 1;
      }

      if (nextIndex === null) return;

      event.preventDefault();
      this.setActive(nextIndex, true);
      this.tabs[nextIndex].focus();
    }

    handlePointerEnter() {
      this.isHovered = true;
      this.clearTimer();
    }

    handlePointerLeave() {
      this.isHovered = false;
      this.scheduleNext();
    }

    handleVisibilityChange() {
      if (document.hidden) {
        this.clearTimer();
      } else {
        this.scheduleNext();
      }
    }

    handleIntersection(entries) {
      const entry = entries[entries.length - 1];
      this.isInView = entry.isIntersecting && entry.intersectionRatio >= 0.2;

      if (entry.isIntersecting && (this.mobileLayout.matches || entry.intersectionRatio >= 0.45)) {
        this.enter();
      }

      if (this.isInView) {
        this.scheduleNext();
      } else {
        this.clearTimer();
      }
    }

    handleResize() {
      if (this.mobileLayout.matches) this.enter();

      window.requestAnimationFrame(() => this.updateSlider());
    }

    handleBlockSelect(event) {
      const panel = event.target.closest('[data-emotional-panel]');
      if (!panel || !this.contains(panel)) return;

      this.setActive(Number(panel.dataset.emotionalIndex), false);
      this.clearTimer();
    }

    handleReducedMotionChange() {
      if (this.reducedMotion.matches) {
        this.clearTimer();
      } else {
        this.scheduleNext();
      }
    }

    enter() {
      if (this.hasEntered) return;

      this.hasEntered = true;
      window.requestAnimationFrame(() => this.classList.add('is-entered'));
    }

    setActive(index, resetAutoplay = false) {
      if (!Number.isInteger(index) || index < 0 || index >= this.tabs.length) return;

      this.activeIndex = index;

      this.tabs.forEach((tab, tabIndex) => {
        const isActive = tabIndex === index;
        tab.classList.toggle('is-active', isActive);
        tab.setAttribute('aria-selected', String(isActive));
        tab.tabIndex = isActive ? 0 : -1;
      });

      this.panels.forEach((panel, panelIndex) => {
        const isActive = panelIndex === index;
        panel.classList.toggle('is-active', isActive);
        panel.setAttribute('aria-hidden', String(!isActive));
      });

      const activePanel = this.panels[index];
      const gradientStart = activePanel.dataset.emotionalGradientStart;
      const gradientEnd = activePanel.dataset.emotionalGradientEnd;

      if (gradientStart) this.style.setProperty('--emotional-gradient-start', gradientStart);
      if (gradientEnd) this.style.setProperty('--emotional-gradient-end', gradientEnd);

      this.updateSlider();

      if (resetAutoplay) {
        this.clearTimer();
        this.scheduleNext();
      }
    }

    updateSlider() {
      const activeTab = this.tabs[this.activeIndex];
      if (!activeTab || !this.slider || !this.tabsContainer) return;

      this.slider.style.width = `${activeTab.offsetWidth}px`;
      this.slider.style.transform = `translateX(${activeTab.offsetLeft}px)`;

      if (this.tabsContainer.scrollWidth > this.tabsContainer.clientWidth) {
        const targetLeft = activeTab.offsetLeft - (this.tabsContainer.clientWidth - activeTab.offsetWidth) / 2;
        this.tabsContainer.scrollTo({
          left: Math.max(targetLeft, 0),
          behavior: this.reducedMotion.matches ? 'auto' : 'smooth',
        });
      }
    }

    scheduleNext() {
      this.clearTimer();

      if (
        !this.autoplayEnabled ||
        this.tabs.length < 2 ||
        this.isHovered ||
        !this.isInView ||
        document.hidden ||
        this.reducedMotion.matches ||
        window.Shopify?.designMode
      ) {
        return;
      }

      this.timer = window.setTimeout(() => {
        this.setActive((this.activeIndex + 1) % this.tabs.length, false);
        this.scheduleNext();
      }, this.autoplayInterval);
    }

    clearTimer() {
      if (!this.timer) return;

      window.clearTimeout(this.timer);
      this.timer = null;
    }
  }

  customElements.define('emotional-image-switcher', EmotionalImageSwitcher);
}
