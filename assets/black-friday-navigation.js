if (!customElements.get('black-friday-navigation')) {
  customElements.define('black-friday-navigation', class extends HTMLElement {
    connectedCallback() {
      this.initFrame = requestAnimationFrame(() => {
        this.initFrame = null;
        if (this.isConnected) this.initialize();
      });
    }

    initialize() {
      this.section = this.closest('.shopify-section');
      if (!this.section || this.controller) return;

      this.controller = new AbortController();
      const { signal } = this.controller;
      this.links = Array.from(this.querySelectorAll('[data-bfn-target]'));
      this.header = document.querySelector('.section-header');
      this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.schedule = () => {
        if (this.frame) return;
        this.frame = requestAnimationFrame(() => {
          this.frame = null;
          this.update();
        });
      };
      this.refresh = () => {
        const anchors = Array.from(document.querySelectorAll('[data-navigation-anchor]'));
        const findTarget = (id) => document.getElementById(id) || anchors.find(
          (element) => element.dataset.navigationAnchor === id
        );
        const anchorAliases = {
          'butterfly-bracelet-set': 'butterfly-gift-sets',
          'butterfly-gift-sets': 'butterfly-bracelet-set',
        };
        this.targets = this.links.map((link) => {
          const id = link.dataset.bfnTarget;
          // Targets belong to other sections; all navigation state stays in this instance.
          const target = findTarget(id) || (anchorAliases[id] && findTarget(anchorAliases[id]));
          return target ? { link, target, id } : null;
        }).filter(Boolean);
        this.schedule();
      };
      this.addEventListener('click', (event) => {
        const link = event.target.closest('[data-bfn-target]');
        if (!link || !this.contains(link) || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const entry = this.targets.find((item) => item.link === link);
        if (!entry) return;
        event.preventDefault();
        this.navigate(entry, true);
      }, { signal });
      window.addEventListener('scroll', this.schedule, { passive: true, signal });
      window.addEventListener('resize', this.schedule, { passive: true, signal });
      window.addEventListener('hashchange', () => this.followHash(), { signal });
      ['shopify:section:load', 'shopify:section:unload', 'shopify:section:reorder'].forEach((type) => {
        document.addEventListener(type, this.refresh, { signal });
      });
      document.addEventListener('shopify:block:select', (event) => {
        const item = event.target.closest('.black-friday-navigation__item');
        if (item && this.contains(item)) this.reveal(item);
      }, { signal });
      this.observer = new ResizeObserver(this.schedule);
      this.observer.observe(this);
      if (this.header) {
        this.observer.observe(this.header);
        this.headerObserver = new MutationObserver(this.schedule);
        this.headerObserver.observe(this.header, { attributes: true, attributeFilter: ['class', 'style'] });
      }
      this.refresh();
      this.update();
      this.followHash();
    }

    disconnectedCallback() {
      cancelAnimationFrame(this.initFrame);
      this.controller?.abort();
      this.controller = null;
      this.observer?.disconnect();
      this.headerObserver?.disconnect();
      cancelAnimationFrame(this.frame);
      clearTimeout(this.lockTimer);
      this.frame = null;
      this.locked = false;
      this.classList.remove('is-fixed');
      this.section?.style.removeProperty('height');
    }

    headerBottom() {
      const bounds = this.header?.getBoundingClientRect();
      return bounds ? Math.max(0, Math.min(bounds.bottom, bounds.height)) : 0;
    }

    fixedTop() {
      let top = this.headerBottom();
      // Stack earlier instances instead of overlaying their links.
      document.querySelectorAll('black-friday-navigation.is-fixed').forEach((navigation) => {
        if (navigation !== this && (navigation.compareDocumentPosition(this) & Node.DOCUMENT_POSITION_FOLLOWING)) {
          top = Math.max(top, navigation.getBoundingClientRect().bottom);
        }
      });
      return top;
    }

    update() {
      const top = this.fixedTop();
      const fixed = this.links.length > 0 && this.section.getBoundingClientRect().top <= top;
      this.style.setProperty('--bfn-fixed-top', `${top}px`);
      if (fixed) this.section.style.height = `${this.offsetHeight}px`;
      this.classList.toggle('is-fixed', fixed);
      if (!fixed) this.section.style.removeProperty('height');
      if (this.locked) return;

      const line = top + this.offsetHeight + 2;
      const atBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
      let active = null;
      let closestTop = -Infinity;
      this.targets.forEach((entry) => {
        if (!entry.target.isConnected) return;
        const targetTop = entry.target.getBoundingClientRect().top;
        if (targetTop <= (atBottom ? window.innerHeight : line) && targetTop >= closestTop) {
          closestTop = targetTop;
          active = entry;
        }
      });
      this.activate(active?.id);
    }

    activate(id) {
      this.links.forEach((link) => {
        const active = link.dataset.bfnTarget === id;
        if (active) {
          if (!link.hasAttribute('aria-current')) this.reveal(link.parentElement);
          link.setAttribute('aria-current', 'location');
        } else link.removeAttribute('aria-current');
      });
    }

    reveal(item) {
      const list = item.parentElement;
      const bounds = item.getBoundingClientRect();
      const viewport = list.getBoundingClientRect();
      if (bounds.left < viewport.left) list.scrollLeft += bounds.left - viewport.left;
      else if (bounds.right > viewport.right) list.scrollLeft += bounds.right - viewport.right;
    }

    navigate(entry, updateHash) {
      this.locked = true;
      clearTimeout(this.lockTimer);
      this.activate(entry.id);
      window.scrollTo({
        top: Math.max(0, window.scrollY + entry.target.getBoundingClientRect().top - this.fixedTop() - this.offsetHeight),
        behavior: this.reducedMotion.matches ? 'instant' : 'smooth',
      });
      if (updateHash) window.history.replaceState(null, '', `#${encodeURIComponent(entry.id)}`);
      this.lockTimer = setTimeout(() => {
        this.locked = false;
        this.schedule();
      }, this.reducedMotion.matches ? 0 : 1000);
    }

    followHash() {
      let id;
      try { id = decodeURIComponent(window.location.hash.slice(1)); } catch { return; }
      const entry = this.targets.find((item) => item.id === id);
      if (entry) this.navigate(entry, false);
    }
  });
}
