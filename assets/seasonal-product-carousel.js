if (!customElements.get('seasonal-product-carousel')) {
  class SeasonalProductCarousel extends HTMLElement {
    connectedCallback() {
      this.track = this.querySelector('[data-spc-track]');
      this.cards = Array.from(this.querySelectorAll('[data-spc-card]'));
      this.previousButton = this.querySelector('[data-spc-previous]');
      this.nextButton = this.querySelector('[data-spc-next]');
      this.mobileViewport = window.matchMedia('(max-width: 749px)');
      this.frame = null;

      if (!this.track) return;

      this.handleClick = this.handleClick.bind(this);
      this.handleKeydown = this.handleKeydown.bind(this);
      this.handleScroll = this.handleScroll.bind(this);
      this.handleResize = this.handleResize.bind(this);
      this.handleBlockSelect = this.handleBlockSelect.bind(this);

      this.addEventListener('click', this.handleClick);
      this.addEventListener('shopify:block:select', this.handleBlockSelect);
      this.track.addEventListener('keydown', this.handleKeydown);
      this.track.addEventListener('scroll', this.handleScroll, { passive: true });
      window.addEventListener('resize', this.handleResize, { passive: true });

      this.updateNavigation();
    }

    disconnectedCallback() {
      this.removeEventListener('click', this.handleClick);
      this.removeEventListener('shopify:block:select', this.handleBlockSelect);
      this.track?.removeEventListener('keydown', this.handleKeydown);
      this.track?.removeEventListener('scroll', this.handleScroll);
      window.removeEventListener('resize', this.handleResize);
      window.cancelAnimationFrame(this.frame);
    }

    handleClick(event) {
      if (event.target.closest('[data-spc-previous]')) this.move(-1);
      if (event.target.closest('[data-spc-next]')) this.move(1);
    }

    handleKeydown(event) {
      if (this.mobileViewport.matches || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      this.move(event.key === 'ArrowRight' ? 1 : -1);
    }

    handleScroll() {
      this.scheduleNavigationUpdate();
    }

    handleResize() {
      this.scheduleNavigationUpdate();
    }

    handleBlockSelect(event) {
      const card = event.target.closest('[data-spc-card]');
      if (!card || this.mobileViewport.matches) return;
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }

    move(direction) {
      if (this.mobileViewport.matches || !this.cards.length) return;

      const firstCard = this.cards[0];
      const gap = Number.parseFloat(window.getComputedStyle(this.track).columnGap) || 0;
      const distance = (firstCard.getBoundingClientRect().width + gap) * 4;
      this.track.scrollBy({ left: direction * distance, behavior: 'smooth' });
    }

    scheduleNavigationUpdate() {
      if (this.frame) return;
      this.frame = window.requestAnimationFrame(() => {
        this.frame = null;
        this.updateNavigation();
      });
    }

    updateNavigation() {
      if (!this.previousButton || !this.nextButton) return;

      const tolerance = 2;
      const maxScroll = Math.max(0, this.track.scrollWidth - this.track.clientWidth);
      this.previousButton.disabled = this.track.scrollLeft <= tolerance;
      this.nextButton.disabled = this.track.scrollLeft >= maxScroll - tolerance;
    }
  }

  customElements.define('seasonal-product-carousel', SeasonalProductCarousel);
}
