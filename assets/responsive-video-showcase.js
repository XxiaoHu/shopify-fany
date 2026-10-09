class ResponsiveVideoShowcase extends HTMLElement {
  constructor() {
    super();
    this.breakpoint = window.matchMedia('(max-width: 749px)');
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.handleChange = this.activateCurrentMedia.bind(this);
  }

  connectedCallback() {
    this.breakpoint.addEventListener('change', this.handleChange);
    this.reducedMotion.addEventListener('change', this.handleChange);
    this.activateCurrentMedia();
  }

  disconnectedCallback() {
    this.breakpoint.removeEventListener('change', this.handleChange);
    this.reducedMotion.removeEventListener('change', this.handleChange);
    this.querySelectorAll('video').forEach((video) => video.pause());
  }

  activateCurrentMedia() {
    const activeDevice = this.breakpoint.matches ? 'mobile' : 'desktop';
    const shouldReduceMotion = this.reducedMotion.matches;

    this.querySelectorAll('[data-rvs-media]').forEach((media) => {
      const isActive = media.dataset.rvsMedia === activeDevice;
      const iframe = media.querySelector('iframe[data-src]');
      const video = media.querySelector('video');

      if (iframe) {
        if (isActive) {
          const desiredSource = shouldReduceMotion ? iframe.dataset.reducedSrc : iframe.dataset.src;
          if (iframe.getAttribute('src') !== desiredSource) iframe.setAttribute('src', desiredSource);
        } else {
          iframe.removeAttribute('src');
        }
      }

      if (video) {
        video.controls = true;
        if (isActive && !shouldReduceMotion) {
          video.muted = true;
          const playPromise = video.play();
          if (playPromise) playPromise.catch(() => {});
        } else {
          video.pause();
        }
      }
    });
  }
}

if (!customElements.get('responsive-video-showcase')) {
  customElements.define('responsive-video-showcase', ResponsiveVideoShowcase);
}
