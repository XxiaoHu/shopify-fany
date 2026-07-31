class MainBannerComponent extends HTMLElement {
  constructor() {
    super();
    this.slider = this.querySelector('.main-banner__slider');
    this.slides = this.querySelectorAll('.main-banner__slide');
    this.indicators = this.querySelectorAll('.main-banner__indicator');
    this.prevButton = this.querySelector('.main-banner__arrow--prev');
    this.nextButton = this.querySelector('.main-banner__arrow--next');
    this.slideCount = this.slides.length;

    this.currentIndex = 0;
    this.autoplayInterval = null;
    this.autoplayEnabled = this.dataset.autoplay === 'true';
    this.autoplaySpeed = parseInt(this.dataset.speed, 10) * 1000 || 5000;

    // Drag tracking
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.dragCurrentX = 0;
    this.dragScrollLeft = 0;
    this.dragDistance = 0;
    this.dragAxis = null;
    this.dragStartIndex = 0;
    this.suppressClickUntil = 0;
    this.CLICK_THRESHOLD = 5;
    this.SWIPE_THRESHOLD = 40;

    if (this.slideCount <= 1) return;

    this.init();
  }

  init() {
    this.bindEvents();
    if (this.autoplayEnabled) {
      this.startAutoplay();
    }
  }

  bindEvents() {
    // Arrow buttons
    if (this.prevButton) {
      this.prevButton.addEventListener('click', (e) => {
        e.preventDefault();
        this.goToPrev();
      });
    }
    if (this.nextButton) {
      this.nextButton.addEventListener('click', (e) => {
        e.preventDefault();
        this.goToNext();
      });
    }

    // Indicator clicks
    this.indicators.forEach((indicator, index) => {
      indicator.addEventListener('click', (e) => {
        e.preventDefault();
        this.goToSlide(index);
      });
    });

    // Drag / swipe
    this.slider.addEventListener('mousedown', this.onDragStart.bind(this));
    this.slider.addEventListener('touchstart', this.onDragStart.bind(this), { passive: true });
    this.slider.addEventListener('mousemove', this.onDragMove.bind(this));
    this.slider.addEventListener('touchmove', this.onDragMove.bind(this), { passive: false });
    this.slider.addEventListener('mouseup', this.onDragEnd.bind(this));
    this.slider.addEventListener('touchend', this.onDragEnd.bind(this));
    this.slider.addEventListener('touchcancel', this.onDragEnd.bind(this));
    this.slider.addEventListener('mouseleave', this.onDragEnd.bind(this));
    this.slider.addEventListener('click', this.onClickCapture.bind(this), true);

    // Pause autoplay on hover
    this.addEventListener('mouseenter', this.pauseAutoplay.bind(this));
    this.addEventListener('mouseleave', this.resumeAutoplay.bind(this));

    // Sync index on native scroll (trackpad, scrollbar)
    this.slider.addEventListener('scroll', this.onScroll.bind(this), { passive: true });

    // Keyboard navigation
    this.addEventListener('keydown', this.onKeyDown.bind(this));

    // Visibility API — pause when hidden
    this.visibilityHandler = this.onVisibilityChange.bind(this);
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  /* ===== Drag/Swipe ===== */
  onDragStart(e) {
    if (e.type === 'mousedown' && e.button !== 0) return;
    if (e.type === 'touchstart' && e.touches.length !== 1) return;

    const point = e.type.includes('mouse') ? e : e.touches[0];
    this.isDragging = true;
    this.dragStartX = point.pageX;
    this.dragStartY = point.pageY;
    this.dragCurrentX = point.pageX;
    this.dragScrollLeft = this.slider.scrollLeft;
    this.dragDistance = 0;
    this.dragAxis = e.type.includes('mouse') ? 'horizontal' : null;
    this.dragStartIndex = this.currentIndex;

    if (this.dragAxis === 'horizontal') {
      this.slider.classList.add('dragging');
    }

    this.pauseAutoplay();
  }

  onDragMove(e) {
    if (!this.isDragging) return;
    if (e.type === 'touchmove' && e.touches.length !== 1) return;

    const point = e.type.includes('mouse') ? e : e.touches[0];
    const deltaX = point.pageX - this.dragStartX;
    const deltaY = point.pageY - this.dragStartY;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    this.dragCurrentX = point.pageX;

    if (!this.dragAxis && (absDeltaX > this.CLICK_THRESHOLD || absDeltaY > this.CLICK_THRESHOLD)) {
      this.dragAxis = absDeltaX > absDeltaY ? 'horizontal' : 'vertical';
    }

    if (this.dragAxis !== 'horizontal') return;

    if (e.cancelable) {
      e.preventDefault();
    }

    this.dragDistance = absDeltaX;

    // On touch devices, wait until release and use the same full-width
    // smooth transition as the arrow buttons.
    if (e.type === 'touchmove') return;

    this.slider.classList.add('dragging');
    this.slider.scrollLeft = this.dragScrollLeft - deltaX;
  }

  onDragEnd(e) {
    if (!this.isDragging) return;

    const wasHorizontalDrag = this.dragAxis === 'horizontal';
    const threshold = e.type.includes('touch') ? this.SWIPE_THRESHOLD : this.CLICK_THRESHOLD;

    this.isDragging = false;
    this.slider.classList.remove('dragging');

    if (wasHorizontalDrag && this.dragDistance > threshold) {
      const direction = this.dragCurrentX < this.dragStartX ? 1 : -1;
      this.suppressClickUntil = Date.now() + 500;
      this.goToSlide(this.dragStartIndex + direction);
    } else if (wasHorizontalDrag) {
      this.goToSlide(this.dragStartIndex);
    }

    this.dragAxis = null;
    this.resetAutoplay();
  }

  onClickCapture(e) {
    if (Date.now() >= this.suppressClickUntil) return;

    e.preventDefault();
    e.stopPropagation();
  }

  /* ===== Navigation ===== */
  goToSlide(index) {
    this.currentIndex = ((index % this.slideCount) + this.slideCount) % this.slideCount;

    const slideWidth = this.slides[0].offsetWidth;
    this.slider.scrollTo({
      left: this.currentIndex * slideWidth,
      behavior: 'smooth',
    });

    this.updateIndicators();
  }

  goToNext() {
    this.goToSlide(this.currentIndex + 1);
    this.resetAutoplay();
  }

  goToPrev() {
    this.goToSlide(this.currentIndex - 1);
    this.resetAutoplay();
  }

  /* ===== Indicators ===== */
  updateIndicators() {
    this.indicators.forEach((indicator, index) => {
      if (index === this.currentIndex) {
        indicator.classList.add('main-banner__indicator--active');
        indicator.setAttribute('aria-current', 'true');
      } else {
        indicator.classList.remove('main-banner__indicator--active');
        indicator.removeAttribute('aria-current');
      }
    });
  }

  /* ===== Autoplay ===== */
  startAutoplay() {
    if (this.autoplayInterval) return;
    this.autoplayInterval = setInterval(() => {
      this.goToNext();
    }, this.autoplaySpeed);
  }

  pauseAutoplay() {
    if (this.autoplayInterval) {
      clearInterval(this.autoplayInterval);
      this.autoplayInterval = null;
    }
  }

  resumeAutoplay() {
    if (this.autoplayEnabled) {
      this.startAutoplay();
    }
  }

  resetAutoplay() {
    this.pauseAutoplay();
    this.resumeAutoplay();
  }

  /* ===== Visibility ===== */
  onVisibilityChange() {
    if (document.hidden) {
      this.pauseAutoplay();
    } else {
      this.resumeAutoplay();
    }
  }

  /* ===== Keyboard ===== */
  onKeyDown(e) {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      this.goToPrev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      this.goToNext();
    }
  }

  /* ===== Native Scroll Sync ===== */
  onScroll() {
    if (this.isDragging) return;
    const slideWidth = this.slides[0].offsetWidth;
    if (slideWidth === 0) return;
    const newIndex = Math.round(this.slider.scrollLeft / slideWidth);
    if (newIndex !== this.currentIndex && newIndex >= 0 && newIndex < this.slideCount) {
      this.currentIndex = newIndex;
      this.updateIndicators();
    }
  }

  /* ===== Cleanup ===== */
  disconnectedCallback() {
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
    }
    this.pauseAutoplay();
  }
}

customElements.define('main-banner-component', MainBannerComponent);
