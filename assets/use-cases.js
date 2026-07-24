(() => {
  if (window.useCasesModalInitialized) return;
  window.useCasesModalInitialized = true;

  let activeModal = null;
  let activeTrigger = null;

  const closeModal = () => {
    if (!activeModal) return;

    activeModal.style.display = 'none';
    activeModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('overflow-hidden');

    const triggerToRestore = activeTrigger;
    activeModal = null;
    activeTrigger = null;
    triggerToRestore?.focus();
  };

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-use-case-modal-id]');

    if (trigger) {
      const modal = document.getElementById(trigger.dataset.useCaseModalId);
      if (!modal) return;

      activeModal = modal;
      activeTrigger = trigger;
      modal.style.display = 'flex';
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('overflow-hidden');
      modal.querySelector('.modal-close')?.focus();
      return;
    }

    if (!activeModal) return;

    if (event.target.closest('.modal-close') || event.target === activeModal) {
      closeModal();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && activeModal) {
      closeModal();
    }
  });
})();
