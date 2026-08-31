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

        if (!this.form || !this.stepOne || !this.stepTwo) {
          this.querySelector('[data-bif-result]')?.focus({ preventScroll: true });
          return;
        }

        const signal = this.abortController.signal;

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
