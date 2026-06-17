class DetailsDisclosure extends HTMLElement {
  constructor() {
    super();
    this.mainDetailsToggle = this.querySelector('details');
    this.content = this.mainDetailsToggle.querySelector('summary').nextElementSibling;
    this.mainDetailsToggle.addEventListener('focusout', this.onFocusOut.bind(this));
    this.mainDetailsToggle.addEventListener('toggle', this.onToggle.bind(this));
  }
  onFocusOut() {
    setTimeout(() => {
      if (!this.contains(document.activeElement)) this.close();
    });
  }
  onToggle() {
    if (!this.animations) this.animations = this.content.getAnimations();
    if (this.mainDetailsToggle.hasAttribute('open')) {
      this.animations.forEach((animation) => animation.play());
    } else {
      this.animations.forEach((animation) => animation.cancel());
    }
  }
  close() {
    this.mainDetailsToggle.removeAttribute('open');
    this.mainDetailsToggle.querySelector('summary').setAttribute('aria-expanded', false);
  }
}
customElements.define('details-disclosure', DetailsDisclosure);
class HeaderMenu extends DetailsDisclosure {
  constructor() {
    super();
    this.header = document.querySelector('.header-wrapper');
  }
  onToggle() {
    if (!this.header) return;
    this.header.preventHide = this.mainDetailsToggle.open;

    if (document.documentElement.style.getPropertyValue('--header-bottom-position-desktop') !== '') return;
    document.documentElement.style.setProperty(
      '--header-bottom-position-desktop',
      `${Math.floor(this.header.getBoundingClientRect().bottom)}px`
    );
  }
}
customElements.define('header-menu', HeaderMenu);
class HeaderMenu2 extends DetailsDisclosure {
  constructor() {
    super();
    this.header = document.querySelector('.header-wrapper');

    // 核心状态管理
    this.isOpening = false;   // 标记是否正在打开
    this.isClosing = false;   // 标记是否正在关闭
    this.menuState = 'closed';// 统一状态：closed/open
    this.timeoutId = null;    // 唯一定时器ID

    this.mainDetailsToggle.addEventListener('mouseenter', this.handleMouseEnter.bind(this));
    this.mainDetailsToggle.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
  }

  // 统一状态更新：同步手动操作和原生状态
  updateMenuState(open) {
    if (!this.mainDetailsToggle) return;
    this.menuState = open ? 'open' : 'closed';
    // 同步原生details状态，避免手动设置和原生冲突
    if (open) {
      this.mainDetailsToggle.setAttribute('open', '');
    } else {
      this.mainDetailsToggle.removeAttribute('open');
    }
    // 触发toggle逻辑（替代原生事件，避免重复触发）
    this.onToggle();
  }
  
  // 鼠标进入：打开菜单（加锁+节流）
  handleMouseEnter() {
    // 1. 立即清除关闭定时器（避免刚触发关闭又打开）
    clearTimeout(this.timeoutId);
    // 2. 加锁：正在打开/已打开则跳过
    if (this.isOpening || this.menuState === 'open') return;

    this.isOpening = true;
    setTimeout(() => {
      // 关闭所有其他菜单（排除自身）
      const allHeaderMenus = this.header?.querySelectorAll('header-menu-2') || [];
      allHeaderMenus.forEach(t => {
        if (t !== this && t.menuState === 'open') {
          t.closeMenu(); // 调用统一的关闭方法
        }
      });
      // 更新当前菜单状态为打开
      this.updateMenuState(true);
      this.isOpening = false;
    });
  }

  // 鼠标离开：关闭菜单（加锁+延迟检测）
  handleMouseLeave(event) {
    // 1. 立即清除打开相关的定时器
    clearTimeout(this.timeoutId);
    // 2. 加锁：正在关闭/已关闭则跳过
    if (this.isClosing || this.menuState === 'closed') return;

    this.isClosing = true;
    // 3. 延迟检测
    this.timeoutId = setTimeout(() => {
      // 优化检测：直接判断鼠标是否在菜单外（放弃elementFromPoint）
      const rect = this.mainDetailsToggle.getBoundingClientRect();
      const isOutside = event.clientX < rect.left || 
                        event.clientX > rect.right || 
                        event.clientY < rect.top || 
                        event.clientY > rect.bottom;
      if (isOutside) {
        this.closeMenu(); // 调用统一关闭方法
      }
      this.isClosing = false;
    });
  }

  // 统一关闭方法（外部可调用，保证状态同步）
  closeMenu() {
    clearTimeout(this.timeoutId);
    this.updateMenuState(false);
    this.isClosing = false;
  }

  // 重写父类close方法：调用统一关闭逻辑
  close() {
    this.closeMenu();
  }

  onToggle() {
    if (!this.header || !this.mainDetailsToggle) return;
    this.header.preventHide = this.menuState === 'open';
    // 动态更新CSS变量（支持窗口缩放）
    document.documentElement.style.setProperty(
      '--header-bottom-position-desktop',
      `${Math.floor(this.header.getBoundingClientRect().bottom)}px`
    );
  }

  // 元素销毁：彻底清理所有状态和事件
  disconnectedCallback() {
    clearTimeout(this.timeoutId);
    if (this.mainDetailsToggle) {
      this.mainDetailsToggle.removeEventListener('mouseenter', this.handleMouseEnter.bind(this));
      this.mainDetailsToggle.removeEventListener('mouseleave', this.handleMouseLeave.bind(this));
    }
    this.isOpening = false;
    this.isClosing = false;
    this.menuState = 'closed';
  }
}
customElements.define('header-menu-2', HeaderMenu2); 