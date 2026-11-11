if (!customElements.get('black-friday-gift-sets')) {
  customElements.define('black-friday-gift-sets', class extends HTMLElement {
    connectedCallback() {
      if (this.controller) return;
      this.controller = new AbortController();
      this.requests = new Set();
      this.busyForms = new WeakSet();
      const { signal } = this.controller;
      this.addEventListener('change', (event) => {
        if (!event.target.matches('[data-bfgs-variants]')) return;
        this.updateVariant(event.target);
      }, { signal });
      this.addEventListener('submit', (event) => {
        if (!event.target.matches('[data-bfgs-form]')) return;
        event.preventDefault();
        this.submit(event.target, event.submitter);
      }, { signal });
    }

    disconnectedCallback() {
      this.controller?.abort();
      this.controller = null;
      this.requests?.forEach((request) => request.abort());
      this.requests?.clear();
    }

    updateVariant(select) {
      const option = select.selectedOptions[0];
      const card = select.closest('.black-friday-gift-sets__card');
      if (!option || !card) return;
      const available = option.dataset.available === 'true';
      card.querySelectorAll('button[type="submit"]').forEach((button) => { button.disabled = !available; });
      const add = card.querySelector('[data-bfgs-add]');
      add.textContent = available ? add.dataset.label : add.dataset.unavailable;
      card.querySelector('[data-bfgs-details]').hidden = available;
      card.querySelector('[role="alert"]').hidden = true;
    }

    async submit(form, submitter) {
      if (this.busyForms.has(form) || !submitter || submitter.disabled || !form.reportValidity()) return;
      this.busyForms.add(form);
      const request = new AbortController();
      this.requests.add(request);
      const buttons = Array.from(form.querySelectorAll('button[type="submit"]'));
      const originalDisabled = buttons.map((button) => button.disabled);
      const select = form.querySelector('select');
      const error = form.querySelector('[role="alert"]');
      const checkout = submitter.hasAttribute('data-bfgs-checkout');
      const data = new FormData(form);
      data.delete('return_to');
      buttons.forEach((button) => { button.disabled = true; });
      submitter.setAttribute('aria-busy', 'true');
      form.setAttribute('aria-busy', 'true');
      if (select) select.disabled = true;
      error.hidden = true;
      try {
        const endpoint = new URL(this.dataset.cartAddUrl, window.location.origin);
        endpoint.pathname = endpoint.pathname.replace(/\.js$/, '') + '.js';
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
          body: data,
          signal: request.signal,
        });
        const result = await response.json();
        if (!response.ok || result.status) throw new Error(result.description || result.message || this.dataset.errorMessage);
        if (!this.isConnected || request.signal.aborted) return;
        window.location.assign(checkout ? this.dataset.checkoutUrl : this.dataset.cartUrl);
      } catch (failure) {
        if (failure.name !== 'AbortError' && this.isConnected) {
          error.textContent = failure.message || this.dataset.errorMessage;
          error.hidden = false;
        }
      } finally {
        buttons.forEach((button, index) => { button.disabled = originalDisabled[index]; });
        submitter.removeAttribute('aria-busy');
        form.removeAttribute('aria-busy');
        if (select) select.disabled = false;
        this.busyForms.delete(form);
        this.requests.delete(request);
      }
    }
  });
}
