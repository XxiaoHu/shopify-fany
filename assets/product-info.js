if (!customElements.get("product-info")) {
  customElements.define(
    "product-info",
    class ProductInfo extends HTMLElement {
      quantityInput = undefined;
      quantityForm = undefined;
      onVariantChangeUnsubscriber = undefined;
      onVariantIdChangeUnsubscriber = undefined;
      cartUpdateUnsubscriber = undefined;
      abortController = undefined;
      pendingRequestUrl = null;
      preProcessHtmlCallbacks = [];
      postProcessHtmlCallbacks = [];
      // 只选择配件
      accessoriesOnlyInput = undefined;
      constructor() {
        super();
        this.quantityInput = this.querySelector(".quantity__input");
        this.accessoriesOnlyInput = this.querySelector(
          ".accessories_only input[type='checkbox']"
        );
      }
      connectedCallback() {
        this.initializeProductSwapUtility();
        this.onVariantChangeUnsubscriber = subscribe(
          PUB_SUB_EVENTS.optionValueSelectionChange,
          this.handleOptionValueChange.bind(this)
        );
        this.onVariantIdChangeUnsubscriber = subscribe(
          PUB_SUB_EVENTS.variantSelectionChange,
          this.handleVariantChange.bind(this)
        );
        this.initQuantityHandlers();
        this.dispatchEvent(
          new CustomEvent("product-info:loaded", { bubbles: true })
        );
        const bands = this.querySelectorAll(".product-bands li");
        const productLists = this.querySelectorAll(".product-list");
        let currentActiveIndex = 0;
        bands.forEach((band, index) => {
          band.addEventListener("click", (event) => {
            if (index === currentActiveIndex) return;
            bands.forEach((b) => b.classList.remove("active"));
            productLists.forEach((list) => list.classList.remove("active"));
            event.target.classList.add("active");
            productLists[index].classList.add("active");
            currentActiveIndex = index;
          });
        });
        const products = this.querySelectorAll(".product-list li");
        products.forEach((product, index) => {
          product.addEventListener("click", (event) => {
            event.preventDefault();
            const target =
              event.target.tagName === "LI"
                ? event.target
                : event.target.closest("li.product-item");
            if (
              !target.className ||
              target.className.indexOf("outOfStock") < 0
            ) {
              if (
                target.className &&
                target.className.indexOf("selected") < 0
              ) {
                target.classList.add("selected");
              } else {
                target.classList.remove("selected");
              }
              // 更新加入购物车按钮状态
              const mainDisabled = this.querySelector(
                "product-form input[name=id]"
              )?.disabled;
              this.setToggleSubmitButton(mainDisabled);
            }
          });
        });
        if (this.accessoriesOnlyInput) {
          this.accessoriesOnlyInput.addEventListener("change", (event) => {
            const variantImgs = this.querySelectorAll("variant-img-selects li");
            if (event.target.checked) {
              variantImgs.forEach((li) => li.classList.add("disabled"));
            } else {
              variantImgs.forEach((li) => li.classList.remove("disabled"));
            }
            // 更新加入购物车按钮状态
            const mainDisabled = this.querySelector(
              "product-form input[name=id]"
            )?.disabled;
            this.setToggleSubmitButton(mainDisabled);
          });
        }
      }
      addPreProcessCallback(callback) {
        this.preProcessHtmlCallbacks.push(callback);
      }
      initQuantityHandlers() {
        if (!this.quantityInput) return;
        this.quantityForm = this.querySelector(".product-form__quantity");
        if (!this.quantityForm) return;
        this.setQuantityBoundries();
        if (!this.dataset.originalSection) {
          this.cartUpdateUnsubscriber = subscribe(
            PUB_SUB_EVENTS.cartUpdate,
            this.fetchQuantityRules.bind(this)
          );
        }
      }
      disconnectedCallback() {
        this.onVariantChangeUnsubscriber();
        this.onVariantIdChangeUnsubscriber();
        this.cartUpdateUnsubscriber?.();
      }
      initializeProductSwapUtility() {
        this.preProcessHtmlCallbacks.push((html) =>
          html
            .querySelectorAll(".scroll-trigger")
            .forEach((element) =>
              element.classList.add("scroll-trigger--cancel")
            )
        );
        this.postProcessHtmlCallbacks.push((newNode) => {
          window?.Shopify?.PaymentButton?.init();
          window?.ProductModel?.loadShopifyXR();
        });
      }
      handleOptionValueChange({
        data: { event, target, selectedOptionValues },
      }) {
        if (!this.contains(event.target)) return;

        this.resetProductFormState();

        const productUrl =
          target.dataset.productUrl ||
          this.pendingRequestUrl ||
          this.dataset.url;
        this.pendingRequestUrl = productUrl;
        const shouldSwapProduct = this.dataset.url !== productUrl;
        const shouldFetchFullPage =
          this.dataset.updateUrl === "true" && shouldSwapProduct;
        const params = [];
        !shouldFetchFullPage && params.push(`section_id=${this.sectionId}`);
        if (selectedOptionValues.length) {
          params.push(`option_values=${selectedOptionValues.join(",")}`);
        }
        this.renderProductInfo({
          requestUrl: this.buildRequestUrlWithParams(productUrl, params),
          targetId: target.id,
          callback: shouldSwapProduct
            ? this.handleSwapProduct(productUrl, shouldFetchFullPage)
            : this.handleUpdateProductInfo(productUrl),
        });
      }
      handleVariantChange({ data: { event, target, selectedOptionValues } }) {
        if (!this.contains(event.target)) return;
        this.resetProductFormState();
        const productUrl =
          target.dataset.productUrl ||
          this.pendingRequestUrl ||
          this.dataset.url;
        this.pendingRequestUrl = productUrl;
        const shouldSwapProduct = this.dataset.url !== productUrl;
        const shouldFetchFullPage =
          this.dataset.updateUrl === "true" && shouldSwapProduct;
        const params = [];
        !shouldFetchFullPage && params.push(`section_id=${this.sectionId}`);
        if (selectedOptionValues.length) {
          params.push(`variant=${selectedOptionValues.join(",")}`);
        }
        this.renderProductInfo({
          requestUrl: this.buildRequestUrlWithParams(productUrl, params),
          targetId: target.id,
          callback: shouldSwapProduct
            ? this.handleSwapProduct(productUrl, shouldFetchFullPage)
            : this.handleUpdateProductInfo(productUrl),
        });
      }
      resetProductFormState() {
        const productForm = this.productForm;
        productForm?.toggleSubmitButton(true);
        productForm?.handleErrorMessage();
        document.querySelectorAll(".buy-button-div").forEach((buyDiv) => {
          const productForm = buyDiv.querySelector("product-form");
          productForm?.toggleSubmitButton(true);
          productForm?.handleErrorMessage();
        });
      }
      handleSwapProduct(productUrl, updateFullPage) {
        return (html) => {
          this.productModal?.remove();
          const selector = updateFullPage
            ? "product-info[id^='MainProduct']"
            : "product-info";
          const variant = this.getSelectedVariant(html.querySelector(selector));
          this.updateURL(productUrl, variant?.id);
          if (updateFullPage) {
            document.querySelector("head title").innerHTML =
              html.querySelector("head title").innerHTML;
            HTMLUpdateUtility.viewTransition(
              document.querySelector("main"),
              html.querySelector("main"),
              this.preProcessHtmlCallbacks,
              this.postProcessHtmlCallbacks
            );
          } else {
            HTMLUpdateUtility.viewTransition(
              this,
              html.querySelector("product-info"),
              this.preProcessHtmlCallbacks,
              this.postProcessHtmlCallbacks
            );
          }
        };
      }
      renderProductInfo({ requestUrl, targetId, callback }) {
        this.abortController?.abort();
        this.abortController = new AbortController();

        fetch(requestUrl, { signal: this.abortController.signal })
          .then((response) => response.text())
          .then((responseText) => {
            this.pendingRequestUrl = null;
            const html = new DOMParser().parseFromString(
              responseText,
              "text/html"
            );
            callback(html);
          })
          .then(() => {
            // set focus to last clicked option value
            document.querySelector(`#${targetId}`)?.focus();
          })
          .catch((error) => {
            if (error.name === "AbortError") {
              console.log("Fetch aborted by user");
            } else {
              console.error(error);
            }
          });
      }
      getSelectedVariant(productInfoNode) {
        let selectedVariant = productInfoNode.querySelector(
          "variant-selects [data-selected-variant]"
        )?.innerHTML;
        if (!!selectedVariant) {
          return JSON.parse(selectedVariant);
        }
        selectedVariant = productInfoNode.querySelector(
          "variant-img-selects [data-selected-variant]"
        )?.innerHTML;
        if (!!selectedVariant) {
          return JSON.parse(selectedVariant);
        }
        return null;
      }
      buildRequestUrlWithParams(url, params = [], shouldFetchFullPage = false) {
        return `${url}?${params.join("&")}`;
      }
      updateOptionValues(html) {
        const title = html.querySelector("div.product__title");
        if (title) {
          HTMLUpdateUtility.viewTransition(
            this.productTitle,
            title,
            this.preProcessHtmlCallbacks
          );
        }
        document.querySelector(".mainBox")?.querySelectorAll(".product-title").forEach((el) => {
          el.querySelector("h2").innerHTML = title.querySelector("h1")?.innerHTML;
        });
        const variantSelects = html.querySelector("variant-selects");
        if (variantSelects) {
          HTMLUpdateUtility.viewTransition(
            this.variantSelectors,
            variantSelects,
            this.preProcessHtmlCallbacks
          );
        }
      }
      updateVariantValues(html) {
        const variantImgSelects = html.querySelector("variant-img-selects");
        if (variantImgSelects) {
          HTMLUpdateUtility.viewTransition(
            this.variantImgSelectors,
            variantImgSelects,
            this.preProcessHtmlCallbacks
          );
        }
      }
      handleUpdateProductInfo(productUrl) {
        return (html) => {
          const variant = this.getSelectedVariant(html);
          this.pickupAvailability?.update(variant);
          // 更新变体图片块值
          this.updateVariantValues(html);
          // 更新多属性选项值
          this.updateOptionValues(html);
          this.updateURL(productUrl, variant?.id);
          this.updateVariantInputs(variant?.id);

          if (!variant) {
            this.setUnavailable();
            return;
          }
          // 更新媒体图片
          this.updateMedia(html, variant?.featured_media?.id);
          // 更新自定义轮播图片
          this.updateCustomMedia(html);

          const updateSourceFromDestination = (
            id,
            shouldHide = (source) => false
          ) => {
            const source = html.getElementById(`${id}-${this.sectionId}`);
            const destination = this.querySelector(
              `#${id}-${this.dataset.section}`
            );
            if (source && destination) {
              destination.innerHTML = source.innerHTML;
              destination.classList.toggle("hidden", shouldHide(source));
            }
          };
          updateSourceFromDestination("price");
          updateSourceFromDestination("Sku", ({ classList }) =>
            classList.contains("hidden")
          );
          updateSourceFromDestination(
            "Inventory",
            ({ innerText }) => innerText === ""
          );
          updateSourceFromDestination("Volume");
          updateSourceFromDestination("Price-Per-Item", ({ classList }) =>
            classList.contains("hidden")
          );
          this.updateQuantityRules(this.sectionId, html);
          this.querySelector(
            `#Quantity-Rules-${this.dataset.section}`
          )?.classList.remove("hidden");
          this.querySelector(
            `#Volume-Note-${this.dataset.section}`
          )?.classList.remove("hidden");
          // 更新加入购物车按钮状态
          const mainDisabled =
            html
              .getElementById(`ProductSubmitButton-${this.sectionId}`)
              ?.hasAttribute("disabled") ?? true;
          this.setToggleSubmitButton(mainDisabled);
          publish(PUB_SUB_EVENTS.variantChange, {
            data: {
              sectionId: this.sectionId,
              html,
              variant,
            },
          });
        };
      }
      setToggleSubmitButton(mainDisabled) {
        let only = this.accessoriesOnlyInput?.checked || false;
        let accessories =
          this.querySelectorAll(".product-list .product-item.selected")
            ?.length == 0;
        let disabled = (mainDisabled && accessories) || (only && accessories);
        this.productForm?.toggleSubmitButton(
          disabled,
          only ? window.variantStrings.addToCart : window.variantStrings.soldOut
        );
        document.querySelectorAll(".buy-button-div").forEach((buyDiv) => {
          let productForm = buyDiv.querySelector("product-form");
          productForm?.toggleSubmitButton(disabled, null, 'BUY');
        });
      }
      updateVariantInputs(variantId) {
        this.querySelectorAll(
          `#product-form-${this.dataset.section}, #product-form-installment-${this.dataset.section}`
        ).forEach((productForm) => {
          const input = productForm.querySelector('input[name="id"]');
          input.value = variantId ?? "";
          input.dispatchEvent(new Event("change", { bubbles: true }));
        });       
        document.querySelectorAll(".buy-button-div").forEach((buyDiv) => {
          const productForm = buyDiv.querySelector("product-form");
          const input = productForm.querySelector('input[name="id"]');
          input.value = variantId ?? "";
          input.dispatchEvent(new Event("change", { bubbles: true }));
        });       
      }
      updateURL(url, variantId) {
        this.querySelector("share-button")?.updateUrl(
          `${window.shopUrl}${url}${variantId ? `?variant=${variantId}` : ""}`
        );
        if (this.dataset.updateUrl === "false") return;
        window.history.replaceState(
          {},
          "",
          `${url}${variantId ? `?variant=${variantId}` : ""}`
        );
      }
      setUnavailable() {
        this.productForm?.toggleSubmitButton(
          true,
          window.variantStrings.unavailable
        );
        document.querySelectorAll(".buy-button-div").forEach((buyDiv) => {
          const productForm = buyDiv.querySelector("product-form");
          productForm.toggleSubmitButton(true);
        });
        const selectors = [
          "price",
          "Inventory",
          "Sku",
          "Price-Per-Item",
          "Volume-Note",
          "Volume",
          "Quantity-Rules",
        ]
          .map((id) => `#${id}-${this.dataset.section}`)
          .join(", ");
        document
          .querySelectorAll(selectors)
          .forEach(({ classList }) => classList.add("hidden"));
      }

      updateCustomMedia(html) {
        const swiperMediaGallery = this.querySelector(
          "swiper-media-gallery ul.gallery-thumbnail"
        );
        if (swiperMediaGallery) {
          HTMLUpdateUtility.viewTransition(
            swiperMediaGallery,
            html.querySelector(`swiper-media-gallery ul.gallery-thumbnail`),
            this.preProcessHtmlCallbacks
          );
          HTMLUpdateUtility.viewTransition(
            this.querySelector("swiper-media-gallery ul.gallery-viewer"),
            html.querySelector(`swiper-media-gallery ul.gallery-viewer`),
            this.preProcessHtmlCallbacks
          );
          // update media modal
          const modalContent =
            this.productModal?.querySelector(`.swiper-wrapper`);
          const newModalContent = html.querySelector(
            `.product-modal .swiper-wrapper`
          );
          if (modalContent && newModalContent)
            modalContent.innerHTML = newModalContent.innerHTML;
          // 初始化时确保所有轮播的初始索引一致
          let currentIndex = 0;
          var thumbSwiper = new Swiper(".product-thumbnail-swiper", {
            direction: "vertical",
            spaceBetween: 0,
            watchOverflow: true,
            watchSlidesProgress: true,
            mousewheel: { releaseOnEdges: true },
            slidesPerView: "auto",
            freeMode: { enabled: true, sticky: true },
            initialSlide: currentIndex,
          });
          var mainSwiper = new Swiper(".product-main-swiper", {
            spaceBetween: 8,
            initialSlide: currentIndex,
            thumbs: { swiper: thumbSwiper },
            navigation: {
              nextEl: ".productNextBtn",
              prevEl: ".productPreBtn",
            },
          });
          var zoomSwiper = new Swiper(".product-zoom-swiper", {
            spaceBetween: 8,
            initialSlide: currentIndex,
            thumbs: { swiper: thumbSwiper },
            navigation: {
              nextEl: ".zoomNextBtn",
              prevEl: ".zoomPreBtn",
            },
          });
          // 统一管理当前索引
          function syncSwipers(targetSwiper) {
            currentIndex = targetSwiper.realIndex;
            if (targetSwiper == thumbSwiper) {
              currentIndex = targetSwiper.clickedIndex;
            }
            [mainSwiper, zoomSwiper, thumbSwiper].forEach((swiper) => {
              if (
                swiper !== targetSwiper &&
                swiper.realIndex !== currentIndex
              ) {
                swiper.slideTo(currentIndex);
              }
            });
          }
          // 事件处理
          thumbSwiper.on("click", function (swiper, event) {
            if (event.target.closest(".swiper-slide")) {
              syncSwipers(thumbSwiper);
            }
          });
          mainSwiper.on("slideChange", function () {
            syncSwipers(mainSwiper);
          });

          zoomSwiper.on("slideChange", function () {
            syncSwipers(zoomSwiper);
          });
        }
      }
      updateMedia(html, variantFeaturedMediaId) {
        if (!variantFeaturedMediaId) return;

        const mediaGallerySource = this.querySelector("media-gallery ul");
        const mediaGalleryDestination = html.querySelector(`media-gallery ul`);

        const refreshSourceData = () => {
          if (this.hasAttribute("data-zoom-on-hover")) enableZoomOnHover(2);
          const mediaGallerySourceItems = Array.from(
            mediaGallerySource.querySelectorAll("li[data-media-id]")
          );
          const sourceSet = new Set(
            mediaGallerySourceItems.map((item) => item.dataset.mediaId)
          );
          const sourceMap = new Map(
            mediaGallerySourceItems.map((item, index) => [
              item.dataset.mediaId,
              { item, index },
            ])
          );
          return [mediaGallerySourceItems, sourceSet, sourceMap];
        };
        if (mediaGallerySource && mediaGalleryDestination) {
          let [mediaGallerySourceItems, sourceSet, sourceMap] =
            refreshSourceData();
          const mediaGalleryDestinationItems = Array.from(
            mediaGalleryDestination.querySelectorAll("li[data-media-id]")
          );
          const destinationSet = new Set(
            mediaGalleryDestinationItems.map(({ dataset }) => dataset.mediaId)
          );
          let shouldRefresh = false;
          // add items from new data not present in DOM
          for (let i = mediaGalleryDestinationItems.length - 1; i >= 0; i--) {
            if (
              !sourceSet.has(mediaGalleryDestinationItems[i].dataset.mediaId)
            ) {
              mediaGallerySource.prepend(mediaGalleryDestinationItems[i]);
              shouldRefresh = true;
            }
          }
          // remove items from DOM not present in new data
          for (let i = 0; i < mediaGallerySourceItems.length; i++) {
            if (
              !destinationSet.has(mediaGallerySourceItems[i].dataset.mediaId)
            ) {
              mediaGallerySourceItems[i].remove();
              shouldRefresh = true;
            }
          }
          // refresh
          if (shouldRefresh)
            [mediaGallerySourceItems, sourceSet, sourceMap] =
              refreshSourceData();

          // if media galleries don't match, sort to match new data order
          mediaGalleryDestinationItems.forEach(
            (destinationItem, destinationIndex) => {
              const sourceData = sourceMap.get(destinationItem.dataset.mediaId);
              if (sourceData && sourceData.index !== destinationIndex) {
                mediaGallerySource.insertBefore(
                  sourceData.item,
                  mediaGallerySource.querySelector(
                    `li:nth-of-type(${destinationIndex + 1})`
                  )
                );
                // refresh source now that it has been modified
                [mediaGallerySourceItems, sourceSet, sourceMap] =
                  refreshSourceData();
              }
            }
          );
        }
        // set featured media as active in the media gallery
        this.querySelector(`media-gallery`)?.setActiveMedia?.(
          `${this.dataset.section}-${variantFeaturedMediaId}`,
          true
        );

        // update media modal
        const modalContent = this.productModal?.querySelector(
          `.product-media-modal__content`
        );
        const newModalContent = html.querySelector(
          `product-modal .product-media-modal__content`
        );
        if (modalContent && newModalContent)
          modalContent.innerHTML = newModalContent.innerHTML;
      }
      setQuantityBoundries() {
        const data = {
          cartQuantity: this.quantityInput.dataset.cartQuantity
            ? parseInt(this.quantityInput.dataset.cartQuantity)
            : 0,
          min: this.quantityInput.dataset.min
            ? parseInt(this.quantityInput.dataset.min)
            : 1,
          max: this.quantityInput.dataset.max
            ? parseInt(this.quantityInput.dataset.max)
            : null,
          step: this.quantityInput.step ? parseInt(this.quantityInput.step) : 1,
        };
        let min = data.min;
        const max = data.max === null ? data.max : data.max - data.cartQuantity;
        if (max !== null) min = Math.min(min, max);
        if (data.cartQuantity >= data.min) min = Math.min(min, data.step);

        this.quantityInput.min = min;

        if (max) {
          this.quantityInput.max = max;
        } else {
          this.quantityInput.removeAttribute("max");
        }
        this.quantityInput.value = min;
        publish(PUB_SUB_EVENTS.quantityUpdate, undefined);
      }

      fetchQuantityRules() {
        const currentVariantId = this.productForm?.variantIdInput?.value;
        if (!currentVariantId) return;
        this.querySelector(
          ".quantity__rules-cart .loading__spinner"
        ).classList.remove("hidden");
        return fetch(
          `${this.dataset.url}?variant=${currentVariantId}&section_id=${this.dataset.section}`
        )
          .then((response) => response.text())
          .then((responseText) => {
            const html = new DOMParser().parseFromString(
              responseText,
              "text/html"
            );
            this.updateQuantityRules(this.dataset.section, html);
          })
          .catch((e) => console.error(e))
          .finally(() =>
            this.querySelector(
              ".quantity__rules-cart .loading__spinner"
            ).classList.add("hidden")
          );
      }
      updateQuantityRules(sectionId, html) {
        if (!this.quantityInput) return;
        this.setQuantityBoundries();

        const quantityFormUpdated = html.getElementById(
          `Quantity-Form-${sectionId}`
        );
        const selectors = [
          ".quantity__input",
          ".quantity__rules",
          ".quantity__label",
        ];
        for (let selector of selectors) {
          const current = this.quantityForm.querySelector(selector);
          const updated = quantityFormUpdated.querySelector(selector);
          if (!current || !updated) continue;
          if (selector === ".quantity__input") {
            const attributes = [
              "data-cart-quantity",
              "data-min",
              "data-max",
              "step",
            ];
            for (let attribute of attributes) {
              const valueUpdated = updated.getAttribute(attribute);
              if (valueUpdated !== null) {
                current.setAttribute(attribute, valueUpdated);
              } else {
                current.removeAttribute(attribute);
              }
            }
          } else {
            current.innerHTML = updated.innerHTML;
          }
        }
      }
      get productForm() {
        return this.querySelector(`product-form`);
      }
      get productModal() {
        return document.querySelector(`#ProductModal-${this.dataset.section}`);
      }
      get pickupAvailability() {
        return this.querySelector(`pickup-availability`);
      }
      get variantSelectors() {
        return this.querySelector("variant-selects");
      }
      get productTitle() {
        return this.querySelector("div.product__title");
      }
      get variantImgSelectors() {
        return this.querySelector("variant-img-selects");
      }
      get relatedProducts() {
        const relatedProductsSectionId = SectionId.getIdForSection(
          SectionId.parseId(this.sectionId),
          "related-products"
        );
        return document.querySelector(
          `product-recommendations[data-section-id^="${relatedProductsSectionId}"]`
        );
      }
      get quickOrderList() {
        const quickOrderListSectionId = SectionId.getIdForSection(
          SectionId.parseId(this.sectionId),
          "quick_order_list"
        );
        return document.querySelector(
          `quick-order-list[data-id^="${quickOrderListSectionId}"]`
        );
      }
      get sectionId() {
        return this.dataset.originalSection || this.dataset.section;
      }
    }
  );
}