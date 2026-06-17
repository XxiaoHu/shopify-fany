class AwardsScroll extends HTMLElement {
  constructor() {
    super();

    // 核心配置
    this.scrollSpeed = 75; // 像素/秒
    this.position = 0;
    this.contentWidth = 0;
    this.animationId = null; // 动画帧ID，用于停止动画
    this.resizeTimer = null; // 防抖定时器
    this.debounceDelay = 100; // 防抖延迟（ms）
    // 获取DOM元素
    this.awardsWrapper = this.querySelector('.awards-scroll-wrapper');
    // 初始化
    this.init();
  }

    // 初始化：复制内容 + 绑定事件 + 启动动画
    init() {
        // 复制内容实现无缝循环
        this.copyContent();
        // 初始化宽度计算
        this.initWidth();
        // 绑定resize事件（带防抖）
        this.bindResizeEvent();
        // 启动滚动动画
        this.startScroll();
    }

    // 复制一份内容用于无缝循环
    copyContent() {
        const originalContent = this.awardsWrapper.innerHTML;
        this.awardsWrapper.innerHTML += originalContent;
    }

    // 初始化宽度（防抖处理）
    initWidth() {
        try {
            const singleItem = this.querySelector('.award-item');
            if (!singleItem) return;
            
            const singleItemWidth = singleItem.offsetWidth;
            const itemGap = 40;
            const itemCount = this.querySelectorAll('.award-item').length / 2; // 因为复制了一份
            this.contentWidth = (singleItemWidth + itemGap) * itemCount;
        } catch (e) {
            console.warn('计算宽度失败:', e);
        }
    }

    // 滚动动画核心逻辑
    animateScroll() {
        if (this.contentWidth === 0) {
            this.animationId = requestAnimationFrame(() => this.animateScroll());
            return;
        }
        
        // 计算每帧位移（基于60fps，16ms一帧）
        this.position -= this.scrollSpeed / 60;
        
        // 重置位置实现循环
        if (this.position <= -this.contentWidth) {
            this.position = 0;
        }
        
        // 应用位移
        this.awardsWrapper.style.transform = `translateX(${this.position}px)`;
        this.animationId = requestAnimationFrame(() => this.animateScroll());
    }

    // 启动滚动动画
    startScroll() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        this.animateScroll();
    }

    // 停止滚动动画
    stopScroll() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    // 绑定resize事件（带防抖）
    bindResizeEvent() {
        // 先移除旧的监听，避免重复绑定
        window.removeEventListener('resize', this.handleResize.bind(this));
        // 添加新的监听
        window.addEventListener('resize', this.handleResize.bind(this));
    }

    // resize回调（防抖处理）
    handleResize() {
        // 清除旧的定时器，避免多次触发
        clearTimeout(this.resizeTimer);
        // 防抖：延迟执行，避免窗口缩放时高频触发
        this.resizeTimer = setTimeout(() => {
            this.initWidth(); // 重新计算宽度
            this.position = 0; // 重置位置，避免错位
        }, this.debounceDelay);
    }

    // 销毁实例（移除事件监听 + 停止动画）
    destroy() {
        this.stopScroll();
        clearTimeout(this.resizeTimer);
        window.removeEventListener('resize', this.handleResize.bind(this));
    }
}
customElements.define('awards-scroll', AwardsScroll);