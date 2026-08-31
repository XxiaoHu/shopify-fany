if (!customElements.get('business-inquiry-form')) {
  customElements.define(
    'business-inquiry-form',
    class BusinessInquiryForm extends HTMLElement {
      connectedCallback() {
        if (this.abortController) return;

        this.abortController = new AbortController();
        this.form = this.querySelector('form');
        this.stepOne = this.querySelector('[data-bif-step="1"]');
        this.stepTwo = this.querySelector('[data-bif-step="2"]');
        this.progress = this.querySelector('[data-bif-progress]');
        this.progressLabel = this.querySelector('[data-bif-progress-label]');
        this.progressPercent = this.querySelector('[data-bif-progress-percent]');
        this.progressBar = this.querySelector('[data-bif-progress-bar]');
        const signal = this.abortController.signal;

        document.addEventListener('click', (event) => this.handleInquiryLink(event), { signal });
        this.alignHashTargetAfterLoad(signal);

        if (!this.form || !this.stepOne || !this.stepTwo) {
          this.querySelector('[data-bif-result]')?.focus({ preventScroll: true });
          return;
        }

        this.querySelector('[data-bif-next]')?.addEventListener('click', () => this.handleNext(), { signal });
        this.querySelector('[data-bif-back]')?.addEventListener('click', () => this.showStep(1), { signal });
        this.form.addEventListener('change', (event) => this.handleChange(event), { signal });

        this.updateChoices();

        const initialStep = Number(this.progress?.dataset.initialStep) === 2 ? 2 : 1;
        this.showStep(initialStep, false);

        if (initialStep === 2 && this.querySelector('[data-bif-result]')) {
          this.querySelector('[data-bif-result]').focus({ preventScroll: true });
        }
      }

      disconnectedCallback() {
        this.abortController?.abort();
        this.abortController = null;
      }

      handleInquiryLink(event) {
        const link = event.target.closest('a[href="#business-inquiry"]');

        if (
          !link ||
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        ) {
          return;
        }

        event.preventDefault();
        this.scrollToForm();

        if (window.location.hash !== '#business-inquiry') {
          window.history.pushState(null, '', '#business-inquiry');
        }
      }

      alignHashTargetAfterLoad(signal) {
        if (window.location.hash !== '#business-inquiry') return;

        const alignTarget = () => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => this.scrollToForm('auto'));
          });
        };

        if (document.readyState === 'complete') {
          alignTarget();
        } else {
          window.addEventListener('load', alignTarget, { once: true, signal });
        }
      }

      scrollToForm(behavior = 'smooth') {
        const target = this.form || this.querySelector('.business-inquiry-form__section');
        if (!target) return;

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const header = document.querySelector('sticky-header') || document.querySelector('.section-header');
        const headerHeight = header?.getBoundingClientRect().height || 0;
        const edgeGap = 20;
        const targetRect = target.getBoundingClientRect();
        const availableHeight = Math.max(window.innerHeight - headerHeight - edgeGap * 2, 0);
        const targetTop = targetRect.top + window.scrollY;
        const centeredOffset = Math.max((availableHeight - targetRect.height) / 2, 0);
        const scrollTop = Math.max(targetTop - headerHeight - edgeGap - centeredOffset, 0);

        window.scrollTo({
          top: scrollTop,
          behavior: prefersReducedMotion ? 'auto' : behavior,
        });
      }

      handleNext() {
        const selectedType = this.form.querySelector('input[name="contact[Purchase type]"]:checked');
        const firstType = this.form.querySelector('input[name="contact[Purchase type]"]');
        const quantity = this.querySelector('[data-bif-quantity]');

        if (!selectedType) {
          firstType?.reportValidity();
          return;
        }

        if (quantity && !quantity.reportValidity()) return;

        this.showStep(2);
      }

      handleChange(event) {
        if (event.target.matches('input[name="contact[Purchase type]"]')) {
          this.updateChoices();
        }
      }

      updateChoices() {
        this.querySelectorAll('[data-bif-choice]').forEach((choice) => {
          const input = choice.querySelector('input[type="radio"]');
          choice.dataset.selected = input?.checked ? 'true' : 'false';
        });
      }

      showStep(step, moveFocus = true) {
        const isSecondStep = step === 2;

        this.stepOne.hidden = isSecondStep;
        this.stepTwo.hidden = !isSecondStep;

        if (this.progressLabel) {
          this.progressLabel.textContent = isSecondStep
            ? this.dataset.stepTwoLabel
            : this.dataset.stepOneLabel;
        }

        if (this.progressPercent) this.progressPercent.textContent = isSecondStep ? '100%' : '50%';
        if (this.progressBar) this.progressBar.style.width = isSecondStep ? '100%' : '50%';

        if (!moveFocus) return;

        const focusTarget = isSecondStep
          ? this.querySelector('[data-bif-first-contact-field]')
          : this.querySelector('input[name="contact[Purchase type]"]:checked');

        requestAnimationFrame(() => focusTarget?.focus());
      }
    }
  );
}
