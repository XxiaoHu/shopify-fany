class MainSearch extends SearchForm {
  constructor() {
    super();
    this.allSearchInputs = document.querySelectorAll('input[type="search"]');
    this.abortController = new AbortController();
    this.setupEventListeners();
  }
  setupEventListeners() {
    let allSearchForms = [];
    this.allSearchInputs.forEach((input) => allSearchForms.push(input.form));
    this.input.form.addEventListener('submit', this.onFormSubmit.bind(this));
    this.input.addEventListener('focus', this.onInputFocus.bind(this));
    this.input.addEventListener(
      'input',
      debounce((event) => {
        this.onSearchInput(event);
      }, 500).bind(this)
    );
    if (allSearchForms.length < 2) return;
    allSearchForms.forEach((form) => form.addEventListener('reset', this.onFormReset.bind(this)));
    this.allSearchInputs.forEach((input) => input.addEventListener('input', this.onInput.bind(this)));
  }
  onFormReset(event) {
    super.onFormReset(event);
    if (super.shouldResetForm()) {
      this.keepInSync('', this.input);
    }
  }
  onInput(event) {
    const target = event.target;
    this.keepInSync(target.value, target);
  }
  onInputFocus() {
    const isSmallScreen = window.innerWidth < 750;
    if (isSmallScreen) {
      this.scrollIntoView({ behavior: 'smooth' });
    }
  }
  onSearchInput(event) {
    const searchTerm = event.target.value.trim();

    if (!searchTerm.length) return;

    this.renderProductSearchFromForm(event.target.form, searchTerm);
  }
  onFormSubmit(event) {
    const searchTerm = this.input.value.trim();

    if (!searchTerm.length) return;

    event.preventDefault();
    this.renderProductSearchFromForm(event.target, searchTerm);
  }
  renderProductSearchFromForm(form, searchTerm) {
    const formData = new FormData(form);
    formData.set('q', searchTerm);
    formData.set('options[prefix]', 'last');
    formData.set('type', 'product');

    const searchParams = new URLSearchParams(formData);
    const sectionId = this.dataset.sectionId || document.getElementById('product-grid')?.dataset.id;

    if (!sectionId) return;

    this.renderProductSearchResults(searchParams, sectionId, form.action);
  }
  renderProductSearchResults(searchParams, sectionId, formAction) {
    const productGridContainer = document.getElementById('ProductGridContainer');
    const searchStatus = document.getElementById('SearchStatus');
    const searchUrl = new URL(formAction, window.location.origin);

    this.abortController.abort();
    this.abortController = new AbortController();

    productGridContainer?.querySelector('.collection')?.classList.add('loading');

    const sectionSearchParams = new URLSearchParams(searchParams);
    sectionSearchParams.set('section_id', sectionId);

    fetch(`${searchUrl.pathname}?${sectionSearchParams.toString()}`, {
      signal: this.abortController.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error(response.status);
        return response.text();
      })
      .then((responseText) => {
        const parsedHTML = new DOMParser().parseFromString(responseText, 'text/html');
        const newProductGridContainer = parsedHTML.getElementById('ProductGridContainer');
        const newSearchStatus = parsedHTML.getElementById('SearchStatus');
        const newTemplateSearch = parsedHTML.querySelector('.template-search');

        if (!newProductGridContainer) return;

        if (searchStatus && newSearchStatus) {
          searchStatus.innerHTML = newSearchStatus.innerHTML;
        }

        if (productGridContainer) {
          productGridContainer.innerHTML = newProductGridContainer.innerHTML;
        } else {
          this.closest('.template-search')?.querySelector('.template-search__header')?.after(newProductGridContainer);
        }

        document.getElementById('ProductGridContainer')?.querySelectorAll('.scroll-trigger').forEach((element) => {
          element.classList.add('scroll-trigger--cancel');
        });

        this.closest('.template-search')?.classList.toggle(
          'template-search--empty',
          newTemplateSearch?.classList.contains('template-search--empty') || false
        );
        history.replaceState({ searchParams: searchParams.toString() }, '', `${searchUrl.pathname}?${searchParams}`);
      })
      .catch((error) => {
        if (error?.name === 'AbortError') return;
        throw error;
      });
  }
  keepInSync(value, target) {
    this.allSearchInputs.forEach((input) => {
      if (input !== target) {
        input.value = value;
      }
    });
  }
}
customElements.define('main-search', MainSearch);
