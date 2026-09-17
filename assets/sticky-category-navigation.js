if (!customElements.get('sticky-category-navigation')) {
  class StickyCategoryNavigation extends HTMLElement {
    connectedCallback() {
      this.section = this.closest('.shopify-section');
      this.header = document.querySelector('.header-wrapper');
      this.headerSection = document.querySelector('.section-header');
      this.items = Array.from(this.querySelectorAll('[data-scn-item]'));
      this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.frame = null;
      this.trackingUntil = 0;
      this.isFixed = false;
      this.activeTarget = '';
      this.clickLockUntil = 0;

      if (!this.section) return;

      this.handleViewportChange = this.handleViewportChange.bind(this);
      this.scheduleUpdate = this.scheduleUpdate.bind(this);
      this.handleClick = this.handleClick.bind(this);
      this.handleSectionChange = this.handleSectionChange.bind(this);

      this.refreshTargets();

      this.addEventListener('click', this.handleClick);
      window.addEventListener('scroll', this.scheduleUpdate, { passive: true });
      window.addEventListener('resize', this.scheduleUpdate, { passive: true });
      document.addEventListener('shopify:section:load', this.handleSectionChange);
      document.addEventListener('shopify:section:reorder', this.handleSectionChange);

      if ('ResizeObserver' in window) {
        this.resizeObserver = new ResizeObserver(this.scheduleUpdate);
        this.resizeObserver.observe(this);
        if (this.header) this.resizeObserver.observe(this.header);
      }

      if ('MutationObserver' in window && this.headerSection) {
        this.headerObserver = new MutationObserver(this.scheduleUpdate);
        this.headerObserver.observe(this.headerSection, {
          attributes: true,
          attributeFilter: ['class', 'style'],
        });
      }

      this.handleViewportChange();
      this.updateActiveFromScroll();
      this.handleInitialHash();
    }

    disconnectedCallback() {
      this.removeEventListener('click', this.handleClick);
      window.removeEventListener('scroll', this.scheduleUpdate);
      window.removeEventListener('resize', this.scheduleUpdate);
      document.removeEventListener('shopify:section:load', this.handleSectionChange);
      document.removeEventListener('shopify:section:reorder', this.handleSectionChange);
      this.resizeObserver?.disconnect();
      this.headerObserver?.disconnect();
      window.cancelAnimationFrame(this.frame);

      if (this.section) this.section.style.removeProperty('height');
    }

    refreshTargets() {
      this.targets = this.items
        .map((item) => {
          const trigger = item.querySelector('[data-scn-trigger]');
          const targetId = trigger?.dataset.scnTarget || '';
          const target = this.findTarget(targetId);
          return target ? { item, trigger, target, targetId } : null;
        })
        .filter(Boolean);
    }

    findTarget(targetId) {
      if (!targetId) return null;

      const directTarget = document.getElementById(targetId);
      if (directTarget) return directTarget;

      return Array.from(document.querySelectorAll('[data-navigation-anchor]')).find(
        (element) => element.dataset.navigationAnchor === targetId
      ) || null;
    }

    handleInitialHash() {
      if (!window.location.hash) return;

      const targetId = decodeURIComponent(window.location.hash.slice(1));
      const target = this.findTarget(targetId);
      if (!target) return;

      window.requestAnimationFrame(() => {
        this.scrollToTarget(targetId, target, false);
      });
    }

    handleSectionChange() {
      this.refreshTargets();
      this.scheduleUpdate();
    }

    handleClick(event) {
      const trigger = event.target.closest('[data-scn-trigger]');
      if (!trigger || !this.contains(trigger)) return;

      const targetId = trigger.dataset.scnTarget;
      const target = this.findTarget(targetId);
      if (!target) return;

      this.scrollToTarget(targetId, target, true);
    }

    scrollToTarget(targetId, target, updateHash) {
      if (!targetId || !target) return;

      const offset = this.getHeaderBottom() + this.offsetHeight;
      const top = Math.max(0, window.scrollY + target.getBoundingClientRect().top - offset);

      this.clickLockUntil = window.performance.now() + 1000;
      this.setActiveTarget(targetId);
      window.scrollTo({
        top,
        behavior: this.reducedMotion.matches ? 'auto' : 'smooth',
      });

      if (updateHash && window.history?.replaceState) {
        window.history.replaceState(null, '', `#${encodeURIComponent(targetId)}`);
      }
    }

    setActiveTarget(targetId) {
      if (!targetId || targetId === this.activeTarget) return;

      this.items.forEach((item) => {
        const trigger = item.querySelector('[data-scn-trigger]');
        const isActive = trigger?.dataset.scnTarget === targetId;
        item.classList.toggle('is-active', isActive);

        if (isActive) {
          trigger.setAttribute('aria-current', 'true');
        } else {
          trigger?.removeAttribute('aria-current');
        }
      });

      this.activeTarget = targetId;
    }

    updateActiveFromScroll() {
      if (!this.targets.length || window.performance.now() < this.clickLockUntil) return;

      const activationLine = this.getHeaderBottom() + this.offsetHeight + 2;
      let active = this.targets[0];

      this.targets.forEach((entry) => {
        if (entry.target.getBoundingClientRect().top <= activationLine) active = entry;
      });

      const atPageBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      if (atPageBottom) active = this.targets[this.targets.length - 1];

      this.setActiveTarget(active.targetId);
    }

    scheduleUpdate() {
      this.trackingUntil = Math.max(this.trackingUntil, window.performance.now() + 250);
      if (this.frame) return;

      const update = () => {
        this.handleViewportChange();

        if (window.performance.now() < this.trackingUntil) {
          this.frame = window.requestAnimationFrame(update);
        } else {
          this.frame = null;
        }
      };

      this.frame = window.requestAnimationFrame(update);
    }

    getHeaderBottom() {
      const headerElement = this.header || document.querySelector('.header-wrapper, sticky-header');
      if (!headerElement) return 0;

      const bounds = headerElement.getBoundingClientRect();
      return Math.max(0, Math.min(bounds.bottom, bounds.height));
    }

    handleViewportChange() {
      const fixedTop = this.getHeaderBottom();
      const sectionTop = this.section.getBoundingClientRect().top;
      const shouldFix = sectionTop <= fixedTop;

      this.style.setProperty('--scn-fixed-top', `${fixedTop}px`);
      this.updateActiveFromScroll();

      if (shouldFix === this.isFixed) {
        if (this.isFixed) this.section.style.height = `${this.offsetHeight}px`;
        return;
      }

      if (shouldFix) {
        this.section.style.height = `${this.offsetHeight}px`;
        this.classList.add('is-fixed');
      } else {
        this.classList.remove('is-fixed');
        this.section.style.removeProperty('height');
      }

      this.isFixed = shouldFix;
    }
  }

  customElements.define('sticky-category-navigation', StickyCategoryNavigation);
}
