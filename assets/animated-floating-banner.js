if (!customElements.get('animated-floating-banner')) {
  class AnimatedFloatingBanner extends HTMLElement {
    connectedCallback() {
      this.motion = this.querySelector('.animated-floating-banner__floating-motion');
      this.overlay = this.querySelector('.animated-floating-banner__overlay');

      if (!this.motion) return;

      this.classList.add('is-animation-ready');
      this.start();
    }

    disconnectedCallback() {
      window.removeEventListener('scroll', this.handleScroll);
      window.removeEventListener('resize', this.handleResize);
      window.cancelAnimationFrame(this.scrollFrame);
      window.clearTimeout(this.settleTimer);
      this.hasStarted = false;
    }

    start() {
      if (this.hasStarted || this.classList.contains('is-revealed')) return;

      this.hasStarted = true;
      this.scrollTriggerDistance = Number.parseInt(this.dataset.scrollTriggerDistance, 10) || 24;
      this.bannerFullyShown = false;
      this.fullyShownScrollY = null;
      this.lastScrollY = window.scrollY;
      this.handleScroll = this.queueScrollCheck.bind(this);
      this.handleResize = this.queueScrollCheck.bind(this);

      window.addEventListener('scroll', this.handleScroll, { passive: true });
      window.addEventListener('resize', this.handleResize, { passive: true });
      this.checkRevealState();
    }

    queueScrollCheck() {
      if (this.scrollFrame) return;

      this.scrollFrame = window.requestAnimationFrame(() => {
        this.scrollFrame = null;
        this.checkRevealState();
      });
    }

    checkRevealState() {
      if (this.classList.contains('is-revealed')) return;

      const bounds = this.getBoundingClientRect();
      const currentScrollY = window.scrollY;
      const isScrollingDown = currentScrollY > this.lastScrollY;

      if (!this.bannerFullyShown && bounds.bottom <= window.innerHeight && bounds.bottom > 0) {
        this.bannerFullyShown = true;
        this.fullyShownScrollY = currentScrollY;
        this.lastScrollY = currentScrollY;
        return;
      }

      const hasScrolledPastTrigger =
        this.bannerFullyShown &&
        currentScrollY >= this.fullyShownScrollY + this.scrollTriggerDistance;

      this.lastScrollY = currentScrollY;

      if (isScrollingDown && hasScrolledPastTrigger && bounds.bottom > 0) this.reveal();
    }

    reveal() {
      window.removeEventListener('scroll', this.handleScroll);
      window.removeEventListener('resize', this.handleResize);

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          this.classList.add('is-revealed');
          this.scheduleSettledState();
        });
      });
    }

    scheduleSettledState() {
      this.settleTimer = window.setTimeout(() => {
        this.classList.add('is-settled');
        this.motion.style.willChange = 'auto';
        if (this.overlay) this.overlay.style.willChange = 'auto';
      }, 2080);
    }
  }

  customElements.define('animated-floating-banner', AnimatedFloatingBanner);
}
