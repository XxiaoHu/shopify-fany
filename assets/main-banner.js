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
    this.dragScrollLeft = 0;
    this.dragDistance = 0;
    this.CLICK_THRESHOLD = 5;

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
    this.slider.addEventListener('touchmove', this.onDragMove.bind(this), { passive: true });
    this.slider.addEventListener('mouseup', this.onDragEnd.bind(this));
    this.slider.addEventListener('touchend', this.onDragEnd.bind(this));
    this.slider.addEventListener('mouseleave', this.onDragEnd.bind(this));

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
    this.isDragging = true;
    this.dragStartX = e.type.includes('mouse') ? e.pageX : e.touches[0].pageX;
    this.dragScrollLeft = this.slider.scrollLeft;
    this.dragDistance = 0;
    this.slider.classList.add('dragging');
  }

  onDragMove(e) {
    if (!this.isDragging) return;
    const x = e.type.includes('mouse') ? e.pageX : e.touches[0].pageX;
    this.dragDistance = Math.abs(x - this.dragStartX);
    const walk = (this.dragStartX - x) * 1;
    this.slider.scrollLeft = this.dragScrollLeft + walk;
  }

  onDragEnd() {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.slider.classList.remove('dragging');

    if (this.dragDistance > this.CLICK_THRESHOLD) {
      // Determine direction and snap to nearest slide
      const slideWidth = this.slides[0].offsetWidth;
      const scrollLeft = this.slider.scrollLeft;
      const newIndex = Math.round(scrollLeft / slideWidth);
      this.goToSlide(Math.max(0, Math.min(newIndex, this.slideCount - 1)));
    } else {
      // Small movement — treat as click, snap back
      this.goToSlide(this.currentIndex);
    }
  }

  /* ===== Navigation ===== */
  goToSlide(index) {
    if (index === this.currentIndex) return;
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
