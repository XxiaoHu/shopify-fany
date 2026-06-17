// slider-plugin.js - 原生CSS版幻灯片插件 (支持暂停保留进度、恢复延续播放)
(function() {

  // ========== 幻灯片核心类 ==========
  class CenterPreviewSlider {
    constructor(uniqueId) {
      this.container = document.getElementById(uniqueId);
      this.staticSlideItems = this.container?.querySelectorAll('.slide-item');
      this.slideTrack = null;
      this.playPauseBtn = null;
      this.restartBtn = null;
      this.controlContainer = null;
      this.prevCurrentDot = null; // 保存当前进度条元素
      this.animationEndHandler = this.handleAnimationEnd.bind(this);
      this.slideCount = this.staticSlideItems?.length || 0;
      this.currentIndex = 0;
      this.isPlaying = true;
      this.uniqueId = uniqueId;
      this.scrollListenerBound = false;
      this.containerVisible = true;

      // 拖拽相关变量
      this.isDragging = false;
      this.startX = 0;
      this.currentTranslate = 0;
      this.initialTranslate = 0;

      // 边界限制常量（核心新增）
      // 左边界：第一张幻灯片的位置（0）
      this.MIN_TRANSLATE = 0; 

      this.isAnimating = false; // 动画锁：防止动画中切换
      this.switchLock = false; // 切换锁：防止单次拖拽多次切换

      // 新增：区分点击/拖拽的核心变量
      this.dragDistance = 0; // 拖拽位移（判断是否为有效拖拽）
      this.CLICK_THRESHOLD = 5; // 点击阈值：位移<5px才认为是点击

      if (!this.container) return console.error(`容器 #${containerId} 不存在`);
      if (this.slideCount === 0) return console.warn('幻灯片内容列表为空');
      this.init();
    }

    // 新增：添加拖拽事件监听
    addDragEventListeners() {
        // 桌面端鼠标事件
        this.container.addEventListener('mousedown', this.handleDragStart.bind(this));
        this.container.addEventListener('mousemove', this.handleDragMove.bind(this));
        this.container.addEventListener('mouseup', this.handleDragEnd.bind(this));
        this.container.addEventListener('mouseleave', this.handleDragEnd.bind(this));
        
        // 移动端触摸事件（兼容）
        this.container.addEventListener('touchstart', this.handleDragStart.bind(this));
        this.container.addEventListener('touchmove', this.handleDragMove.bind(this));
        this.container.addEventListener('touchend', this.handleDragEnd.bind(this));
        this.container.addEventListener('touchcancel', this.handleDragEnd.bind(this));
    }

    // 新增：拖拽开始
    handleDragStart(e) {
      // 重置拖拽位移
      this.dragDistance = 0;
      this.isDragging = true;
      this.isAnimating = false;
      this.switchLock = false; // 重置切换锁

      // 获取初始X坐标（兼容鼠标和触摸事件）
      this.startX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
      // 记录当前的偏移量（去掉单位转数字）
      let slideWidth = this.slideWidth();
      this.initialTranslate = -this.currentIndex * slideWidth;
      // 拖拽时移除过渡动画，让拖拽更顺滑
      this.slideTrack.style.transition = 'none';

      // 阻止默认行为（避免拖拽时触发浏览器默认操作）
      if(e.type.includes('mouse')){
        e.preventDefault();
      }
    }

    // 新增：拖拽中
    handleDragMove(e) {
      if (!this.isDragging) return;
      
      // 获取当前X坐标（兼容鼠标和触摸事件）
      const currentX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
      // 计算拖拽位移（核心：用于判断是否为有效拖拽）
      this.dragDistance = Math.abs(currentX - this.startX);
      const diffX = this.dragDistance * (currentX > this.startX ? 1 : -1);
      // 更新当前偏移
      let targetTranslate = this.initialTranslate + diffX;
      
      // 右边界：最后一张幻灯片的位置
      let slideWidth = this.slideWidth();
      this.MAX_TRANSLATE = -(this.slideCount - 1) * slideWidth; 
      // 2. 核心：边界限制 + 阻尼效果（防止超界）
      if (targetTranslate > this.MIN_TRANSLATE) {
          // 超过左边界（第一张左侧）：添加强阻尼，越界越多阻力越大
          const overshoot = targetTranslate - this.MIN_TRANSLATE;
          targetTranslate = this.MIN_TRANSLATE + overshoot * 0.1; // 阻尼系数，越小越难拖出
      } else if (targetTranslate < this.MAX_TRANSLATE) {
          // 超过右边界（最后一张右侧）：同理添加阻尼
          const overshoot = this.MAX_TRANSLATE - targetTranslate;
          targetTranslate = this.MAX_TRANSLATE - overshoot * 0.1;
      }
      // 3. 更新最终位置（确保不会超出边界）
      this.currentTranslate = targetTranslate;
      // 应用偏移到容器
      this.slideTrack.style.transform = `translateX(${this.currentTranslate}px)`;
    }

    // 新增：拖拽结束
    handleDragEnd() {
      if (!this.isDragging) return;

      this.isDragging = false;
      // 恢复过渡动画
      this.slideTrack.style.transition = 'transform 0.5s ease-in-out';
      // 只有位移超过阈值，才执行拖拽切换逻辑
      if (this.dragDistance > this.CLICK_THRESHOLD) {
        // 拖拽结束后，通过safeSwitch执行切换（自动上锁，防止多次切换）
        this.safeSwitch(() => {
          // 计算拖拽距离是否达到切换阈值（15%的容器宽度）
          let slideWidth = this.slideWidth();
          const diff = ((this.currentTranslate - this.initialTranslate) / slideWidth) * 100;
          const threshold = 15; // 切换阈值（百分比）
          
          // 向右拖拽（上一张）
          if (diff > threshold && this.currentIndex > 0) {
            this.toSlide(this.currentIndex - 1);
          }
          // 向左拖拽（下一张）
          else if (diff < -threshold && this.currentIndex < this.staticSlideItems.length - 1) {
            this.toSlide(this.currentIndex + 1);
          }
          // 拖拽距离不足，回弹到当前幻灯片
          else {
            this.updateSliderPosition();
          }
        });
      }

      // 延迟重置位移，避免mouseup后立即触发click
      setTimeout(() => {
        this.dragDistance = 0;
      }, 300);
    }

    // 更新幻灯片位置
    updateSliderPosition() {
      let slideWidth = this.slideWidth();
      const offset = -this.currentIndex * slideWidth;
      this.slideTrack.style.transform = `translateX(${offset}px)`;

      // 更新控制圆点状态
      this.initControls();
    }

    // ========== 核心新增：安全切换封装（防止多次切换） ==========
    safeSwitch(callback) {
      // 只有非动画、非切换锁状态下才执行切换
      if (!this.isAnimating && !this.switchLock) {
        this.isAnimating = true; // 上锁：动画开始
        this.switchLock = true; // 上锁：防止重复触发
        callback(); // 执行切换逻辑
        
        // 动画结束后解锁（时间与CSS过渡时长一致）
        setTimeout(() => {
            this.isAnimating = false;
            // 额外防抖：防止短时间内重复切换
            setTimeout(() => {
                this.switchLock = false;
            }, 100);
        }, 400);
      }
    }

    init() {
      this.getDOMReferences();
      this.initSliderStyle();
      this.bindEvents();
      this.initControls();
      this.startCurrentProgress();
      this.initScrollListener();
      // 添加拖拽事件监听（核心新增部分）
      this.addDragEventListeners();
    }

    initScrollListener() {
      if (this.scrollListenerBound) return;
      this.scrollListenerBound = true;
      this.initIntersectionObserver();
    }

    initIntersectionObserver() {
      if (!window.IntersectionObserver) return;
      this.observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          this.containerVisible = entry.isIntersecting;
          // 容器可见性联动动画状态（不影响播放状态）
          if (this.prevCurrentDot) {
            this.prevCurrentDot.style.setProperty('--anim-play-state', this.containerVisible && this.isPlaying ? 'running' : 'paused');
          }
        });
      }, { threshold: 0 });
      this.observer.observe(this.container);
    }

    getDOMReferences() {
      this.slideTrack = document.getElementById(`${this.uniqueId}-slideTrack`);
      this.playPauseBtn = document.getElementById(`${this.uniqueId}-playPauseBtn`);
      this.restartBtn = document.getElementById(`${this.uniqueId}-restartBtn`);
      this.controlContainer = document.getElementById(`${this.uniqueId}-controlContainer`);
      if (!this.slideTrack) return console.error('无法找到幻灯片轨道元素');
      window.sliderInstances = window.sliderInstances || {};
      window.sliderInstances[this.uniqueId] = this;
    }

    initSliderStyle() {
      if (!this.slideTrack) return;
      // 自适应图片高度
      this.setupSlider();
      window.addEventListener('resize', () => {
        clearTimeout(window.resizeTimer);
        window.resizeTimer = setTimeout(() => {
          if (!this.slideTrack) return;
          this.setupSlider();
          const offset = -this.currentIndex * this.slideWidth();
          this.slideTrack.style.transform = `translateX(${offset}px)`;
        }, 100);
      });
    }

    bindEvents() {
      if(this.staticSlideItems){
        let that = this;
        this.staticSlideItems.forEach((item, index) => {
          item.addEventListener('click', (e) => {
            // 若拖拽位移超过阈值，阻止按钮点击
            if (that.dragDistance > that.CLICK_THRESHOLD) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            that.safeSwitch(() => {
              that.toSlide(index);
            });
          });
        });
      }
      this.playPauseBtn?.addEventListener('click', () => this.togglePlayPause());
      this.restartBtn?.addEventListener('click', () => this.restartSlider(0));
    }

    // 清理上一个进度条的事件监听
    clearAnimationListener() {
      if (this.prevCurrentDot) {
        this.prevCurrentDot.removeEventListener('animationend', this.animationEndHandler);
      }
    }

    slideWidth(){
      const container = this.container.querySelector('.slide-container');
      if(container && this.staticSlideItems){
        return this.staticSlideItems[0].offsetWidth + (window.innerWidth <= 768 ? 15 : container.classList.contains('overflow') ? 40 : 20);
      }
      return 0;
    }

    // 设置滑块尺寸
    setupSlider() {
      const container = this.container.querySelector('.slide-container');
      if (!container || !this.slideTrack) return { slideWidth: 0, containerWidth: 0 };
      const containerWidth = container.offsetWidth;
      let slideWidth = this.slideWidth();
      if(this.staticSlideItems){
        this.staticSlideItems.forEach((item, index) => {
          let aspect_ratio = window.innerWidth <= 768 ? (item.dataset.mobile_aspect_ratio || 1) : (item.dataset.aspect_ratio || 1);
          item.style.height = `${parseInt(slideWidth / aspect_ratio)}px` ;
        });
      }
      return { slideWidth, containerWidth };
    }

    // 手动跳转到指定幻灯片
    toSlide(targetIndex) {
      if(this.currentIndex != targetIndex){
        this.isPlaying = false;
        this.hideRestartBtn();
        this.updatePlayPauseButton();
        this.clearAnimationListener();
        this.goToSlide(targetIndex);
      } 
      else {
        this.togglePlayPause();
        this.startCurrentProgress();
      }
    }

    // 跳转到指定幻灯片
    goToSlide(targetIndex) {
      if (!this.slideTrack || targetIndex >= this.slideCount) {
        this.isPlaying = false;
        this.updatePlayPauseButton();
        this.showRestartBtn();
        this.clearAnimationListener();
        return;
      }
      if (targetIndex < 0) targetIndex = 0;

      // 清理上一个进度条监听
      this.clearAnimationListener();

      this.currentIndex = targetIndex;

      this.updateSliderPosition();

      // 启动当前进度条动画（不重置，直接设置状态）
      if (this.isPlaying) {
        this.startCurrentProgress();
      }
    }

    // 重启滑块（强制从头开始）
    restartSlider(index) {
      this.isPlaying = true;
      this.hideRestartBtn();
      this.updatePlayPauseButton();
      // 清理上一个进度条
      this.clearAnimationListener();
      this.currentIndex = index;
      // 重置当前进度条元素引用
      this.prevCurrentDot = null;
      this.goToSlide(index);
    }

    // 切换播放/暂停（核心修改：保留进度）
    togglePlayPause() {
      this.isPlaying = !this.isPlaying;
      this.updatePlayPauseButton();

      if (!this.prevCurrentDot) return;

      // 仅修改动画状态，不重置进度条
      const playState = this.isPlaying && this.containerVisible ? 'running' : 'paused';
      this.prevCurrentDot.style.setProperty('--anim-play-state', playState);

      // 暂停时移除动画结束监听，避免切换；恢复时重新绑定
      if (this.isPlaying) {
        this.prevCurrentDot.addEventListener('animationend', this.animationEndHandler);
      } else {
        this.clearAnimationListener();
      }
    }

    // 更新播放/暂停按钮图标
    updatePlayPauseButton() {
      if (!this.playPauseBtn) return;
      this.playPauseBtn.innerHTML = this.isPlaying
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 22" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="5" height="16"></rect><rect x="14" y="3" width="5" height="16"></rect></svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 22" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3v18l14-9z"></path></svg>`;
    }

    // 初始化控制圆点状态
    initControls() {
      const controls = this.controlContainer?.querySelectorAll('.slide-dot');
      controls?.forEach((ctrl, i) => {
        if (i === this.currentIndex) {
          ctrl.classList.add('current');
          this.prevCurrentDot = ctrl.querySelector('a'); // 保存当前进度条元素
        } else {
          ctrl.classList.remove('current');
          // 非当前圆点强制暂停动画
          const dotLink = ctrl.querySelector('a');
          if (dotLink) dotLink.style.setProperty('--anim-play-state', 'paused');
        }
      });
    }

    // 启动当前进度条动画（不重置，直接设置状态）
    startCurrentProgress() {
      if (!this.prevCurrentDot) return;
      // 设置动画状态，不修改元素结构
      this.prevCurrentDot.style.setProperty('--anim-play-state', this.isPlaying && this.containerVisible ? 'running' : 'paused');
      // 绑定动画结束事件
      this.prevCurrentDot.addEventListener('animationend', this.animationEndHandler);
    }

    // 动画结束处理
    handleAnimationEnd(e) {
      if (e.animationName.toLowerCase() !== 'aap-animate-progress') return;
      if (!this.isPlaying) return; // 暂停状态不触发切换
      this.isDragging = false;
      this.goToSlide(this.currentIndex + 1);
    }

    showRestartBtn() {
      if (this.restartBtn) this.restartBtn.style.display = 'flex';
      if (this.playPauseBtn) this.playPauseBtn.style.display = 'none';
    }

    hideRestartBtn() {
      if (this.restartBtn) this.restartBtn.style.display = 'none';
      if (this.playPauseBtn) this.playPauseBtn.style.display = 'flex';
    }

    // 销毁实例
    destroy() {
      this.clearAnimationListener();
      this.observer?.unobserve(this.container);
      delete window.sliderInstances[this.uniqueId];
    }
  }

  window.CenterPreviewSlider = CenterPreviewSlider;
})();