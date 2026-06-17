if (!customElements.get("product-form")) {
  customElements.define(
    "product-form",
    class ProductForm extends HTMLElement {
      constructor() {
        super();
        this.form = this.querySelector("form");
        // this.variantIdInput.disabled = false;
        this.form.addEventListener("submit", this.onSubmitHandler.bind(this));
        this.cart =
          document.querySelector("cart-notification") ||
          document.querySelector("cart-drawer");
        this.submitButton = this.querySelector('[type="submit"]');
        this.submitButtonText = this.submitButton.querySelector("span");
        if (document.querySelector("cart-drawer"))
          this.submitButton.setAttribute("aria-haspopup", "dialog");
        this.hideErrors = this.dataset.hideErrors === "true";
      }
      onSubmitHandler(evt) {
        evt.preventDefault();
        if (this.submitButton.getAttribute("aria-disabled") === "true") return;
        this.handleErrorMessage();       
        const btnName = this.submitButton.name;       
        this.submitButton.setAttribute("aria-disabled", true);
        this.submitButton.classList.add("loading");
        this.querySelector(".loading__spinner").classList.remove("hidden");
        const config = fetchConfig("javascript");
        config.headers["X-Requested-With"] = "XMLHttpRequest";
        delete config.headers["Content-Type"];
        const formData = new FormData(this.form);
        const accessoriesOnly = document.querySelector(".accessories_only input[type='checkbox']:checked");
        if(accessoriesOnly && btnName != 'buy'){
          formData.delete('id');
        }      
        if (this.cart) {
          formData.append(
            "sections",
            this.cart.getSectionsToRender().map((section) => section.id)
          );
          formData.append("sections_url", window.location.pathname);
          this.cart.setActiveElement(document.activeElement);
        }
        if(btnName != 'buy'){
          // 初始化一个数组用于存储所有要加入购物车的商品
          let valueArr = []; 
          // 获取当前模块下的所有附加商品 DOM 元素
          let AddOnsBox = document.querySelectorAll(
            ".product-list .product-item.selected"
          ); 
          // 遍历这些附加商品
          AddOnsBox.forEach((e) => {
            var arrA = { id: e.dataset.variantId, quantity: 1 }; // 设置加入购物车的商品对象
            valueArr.push(arrA); // 添加到数组中
          }); 
          // 将这些附加商品添加到 formData 中
          valueArr.forEach((item, index) => {
            formData.set(`items[${index + 1}]id`, item.id);
            formData.set(`items[${index + 1}]quantity`, item.quantity);
          });
        }       
        config.body = formData;
        // `${routes.cart_add_url}`
        fetch("/cart/add.js", {
          method: "POST",
          body: formData,
        })
          .then((response) => response.json())
          .then((response) => {
            if (response.status) {
              publish(PUB_SUB_EVENTS.cartError, {
                source: "product-form",
                productVariantId: formData.get("id"),
                errors: response.errors || response.description,
                message: response.message,
              });
              this.handleErrorMessage(response.description);

              const soldOutMessage =
                this.submitButton.querySelector(".sold-out-message");
              if (!soldOutMessage) return;
              this.submitButton.setAttribute("aria-disabled", true);
              this.submitButtonText.classList.add("hidden");
              soldOutMessage.classList.remove("hidden");
              this.error = true;
              return;
            } else if (!this.cart) {
              window.location = window.routes.cart_url;
              return;
            }
            const startMarker = CartPerformance.createStartingMarker(
              "add:wait-for-subscribers"
            );
            if (!this.error)
              publish(PUB_SUB_EVENTS.cartUpdate, {
                source: "product-form",
                productVariantId: formData.get("id"),
                cartData: response,
              }).then(() => {
                CartPerformance.measureFromMarker(
                  "add:wait-for-subscribers",
                  startMarker
                );
              });
            this.error = false;
            const quickAddModal = this.closest("quick-add-modal");
            if (quickAddModal) {
              document.body.addEventListener(
                "modalClosed",
                () => {
                  setTimeout(() => {
                    CartPerformance.measure(
                      "add:paint-updated-sections",
                      () => {
                        this.cart.renderContents(response);
                      }
                    );
                  });
                },
                { once: true }
              );
              quickAddModal.hide(true);
            } else {
              CartPerformance.measure("add:paint-updated-sections", () => {
                this.cart.renderContents(response);
              });
            }
          })
          .catch((e) => {
            console.error(e);
          })
          .finally(() => {
            this.submitButton.classList.remove("loading");
            if (this.cart && this.cart.classList.contains("is-empty"))
              this.cart.classList.remove("is-empty");
            if (!this.error) this.submitButton.removeAttribute("aria-disabled");
            this.querySelector(".loading__spinner").classList.add("hidden");

            CartPerformance.measureFromEvent("add:user-action", evt);
          });
      }
      handleErrorMessage(errorMessage = false) {
        if (this.hideErrors) return;
        this.errorMessageWrapper =
          this.errorMessageWrapper ||
          this.querySelector(".product-form__error-message-wrapper");
        if (!this.errorMessageWrapper) return;
        this.errorMessage =
          this.errorMessage ||
          this.errorMessageWrapper.querySelector(
            ".product-form__error-message"
          );
        this.errorMessageWrapper.toggleAttribute("hidden", !errorMessage);

        if (errorMessage) {
          this.errorMessage.textContent = errorMessage;
        }
      }
      toggleSubmitButton(disable = true, text, buyText) {
        if (disable) {
          this.submitButton.setAttribute("disabled", "disabled");
          if (text) this.submitButtonText.textContent = text;
        } else {
          this.variantIdInput.disabled = false;
          this.submitButton.removeAttribute("disabled");
          if(this.submitButton.dataset.presale == 'true'){
            this.submitButtonText.textContent = 'PRE-ORDER';
          } else{
            this.submitButtonText.textContent = buyText ? buyText : window.variantStrings.addToCart;
          }
        }
      }
      get variantIdInput() {
        return this.form.querySelector("[name=id]");
      }
    }
  );
}