if (!customElements.get('featured-product-showcase')) {
  class FeaturedProductShowcase extends HTMLElement {
    connectedCallback() {
      this.track = this.querySelector('[data-fps-track]');
      this.cards = Array.from(this.querySelectorAll('[data-fps-card]'));
      this.previousButton = this.querySelector('[data-fps-previous]');
      this.nextButton = this.querySelector('[data-fps-next]');
      this.mobileViewport = window.matchMedia('(max-width: 749px)');
      this.desktopColumns = Number.parseInt(this.dataset.desktopColumns, 10) || 3;
      this.frame = null;

      if (!this.track) return;

      this.handleClick = this.handleClick.bind(this);
      this.handleKeydown = this.handleKeydown.bind(this);
      this.handleViewportChange = this.handleViewportChange.bind(this);
      this.handleBlockSelect = this.handleBlockSelect.bind(this);

      this.addEventListener('click', this.handleClick);
      this.addEventListener('shopify:block:select', this.handleBlockSelect);
      this.track.addEventListener('keydown', this.handleKeydown);
      this.track.addEventListener('scroll', this.handleViewportChange, { passive: true });
      window.addEventListener('resize', this.handleViewportChange, { passive: true });

      this.updateNavigation();
    }

    disconnectedCallback() {
      this.removeEventListener('click', this.handleClick);
      this.removeEventListener('shopify:block:select', this.handleBlockSelect);
      this.track?.removeEventListener('keydown', this.handleKeydown);
      this.track?.removeEventListener('scroll', this.handleViewportChange);
      window.removeEventListener('resize', this.handleViewportChange);
      window.cancelAnimationFrame(this.frame);
    }

    handleClick(event) {
      if (event.target.closest('[data-fps-previous]')) this.move(-1);
      if (event.target.closest('[data-fps-next]')) this.move(1);
    }

    handleKeydown(event) {
      if (this.mobileViewport.matches || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      this.move(event.key === 'ArrowRight' ? 1 : -1);
    }

    handleViewportChange() {
      if (this.frame) return;
      this.frame = window.requestAnimationFrame(() => {
        this.frame = null;
        this.updateNavigation();
      });
    }

    handleBlockSelect(event) {
      const card = event.target.closest('[data-fps-card]');
      if (!card || this.mobileViewport.matches) return;
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }

    move(direction) {
      if (this.mobileViewport.matches || !this.cards.length) return;

      const firstCard = this.cards[0];
      const gap = Number.parseFloat(window.getComputedStyle(this.track).columnGap) || 0;
      const distance = (firstCard.getBoundingClientRect().width + gap) * this.desktopColumns;
      this.track.scrollBy({ left: direction * distance, behavior: 'smooth' });
    }

    updateNavigation() {
      if (!this.previousButton || !this.nextButton) return;

      const isMobile = this.mobileViewport.matches;
      const maxScroll = Math.max(0, this.track.scrollWidth - this.track.clientWidth);
      const hasOverflow = maxScroll > 2;
      const firstMedia = this.cards[0]?.querySelector('.featured-product-showcase__card-media');

      if (firstMedia) {
        this.style.setProperty('--fps-arrow-top', `${firstMedia.getBoundingClientRect().height / 2}px`);
      }

      this.previousButton.hidden = isMobile || !hasOverflow;
      this.nextButton.hidden = isMobile || !hasOverflow;
      this.previousButton.disabled = !hasOverflow || this.track.scrollLeft <= 2;
      this.nextButton.disabled = !hasOverflow || this.track.scrollLeft >= maxScroll - 2;
    }
  }

  customElements.define('featured-product-showcase', FeaturedProductShowcase);
}
