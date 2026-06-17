// 常量抽离：提高可维护性
const CONSTANTS = {
  MIN_DPR: 2,
  LAZY_LOAD_OFFSET: 4, // 懒加载提前触发的视口倍数
  MOBILE_BREAKPOINT: 750, // 移动端断点
  PROGRESS_EPS: 1e-14 // 浮点精度误差阈值
};

// 工具函数封装：复用性更强
const utils = {
  /**
   * 获取设备DPR（设备像素比）
   * @returns {number} 最终DPR值
   */
  getDeviceDpr() {
    if (window.devicePixelRatio) {
      return window.devicePixelRatio;
    }
    // 兼容IE
    const screen = window.screen;
    return (screen.deviceXDPI / screen.logicalXDPI) || 1;
  },

  /**
   * 计算元素的绝对顶部位置
   * @param {HTMLElement} el 目标元素
   * @returns {number} 元素顶部相对于文档的偏移量
   */
  getElementTop(el) {
    return el.getBoundingClientRect().top + window.scrollY;
  },

  /**
   * 防抖函数：避免resize高频触发
   * @param {Function} fn 执行函数
   * @param {number} delay 延迟时间
   * @returns {Function} 防抖后的函数
   */
  debounce(fn, delay) {
    let timer = null;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }
};

document.addEventListener('DOMContentLoaded', function() {
  // 初始化ScrollMagic控制器（单例）
  const scrollMagicController = new ScrollMagic.Controller();
  // 缓存全局变量：避免重复查询/创建
  let s5CanvasInstance = null;
  let mobileSwiper = null;

  /**
   * 初始化Canvas：优化DPR计算逻辑，减少冗余判断
   * @param {HTMLCanvasElement} canvas Canvas元素
   * @returns {CanvasRenderingContext2D|null} 画布上下文
   */
  function setupCanvas(canvas) {
    if (!canvas || !(canvas instanceof HTMLCanvasElement)) return null;

    const dpr = utils.getDeviceDpr();
    const finalDpr = dpr < CONSTANTS.MIN_DPR ? CONSTANTS.MIN_DPR : dpr;
    const rect = canvas.getBoundingClientRect();

    // 避免重复设置宽高（仅当尺寸变化时更新）
    const targetWidth = rect.width * finalDpr;
    const targetHeight = rect.height * finalDpr;
    if (canvas.width !== targetWidth) canvas.width = targetWidth;
    if (canvas.height !== targetHeight) canvas.height = targetHeight;

    return canvas.getContext('2d');
  }

  /**
   * 等比例绘制图片：优化参数处理，减少魔法值
   * @param {CanvasRenderingContext2D} ctx 画布上下文
   * @param {HTMLImageElement} img 图片元素
   * @param {number} x 绘制x坐标
   * @param {number} y 绘制y坐标
   * @param {number} w 绘制宽度
   * @param {number} h 绘制高度
   * @param {number} offsetX x轴偏移比例（0-1）
   * @param {number} offsetY y轴偏移比例（0-1）
   */
  function drawImageProp(ctx, img, x = 0, y = 0, w = ctx.canvas.width, h = ctx.canvas.height, offsetX = 0.5, offsetY = 0.5) {
    // 边界值校验
    offsetX = Math.max(0, Math.min(1, offsetX));
    offsetY = Math.max(0, Math.min(1, offsetY));

    const iw = img.width;
    const ih = img.height;
    const r = Math.min(w / iw, h / ih);
    let nw = iw * r;
    let nh = ih * r;
    let cx, cy, cw, ch, ar = 1;

    if (nw < w) ar = w / nw;
    // 使用常量替代魔法值，提高可读性
    if (Math.abs(ar - 1) < CONSTANTS.PROGRESS_EPS && nh < h) ar = h / nh;
    nw *= ar;
    nh *= ar;

    cw = iw / (nw / w);
    ch = ih / (nh / h);
    cx = (iw - cw) * offsetX;
    cy = (ih - ch) * offsetY;

    // 边界校验（防止绘制超出图片范围）
    cx = Math.max(0, Math.min(iw, cx));
    cy = Math.max(0, Math.min(ih, cy));
    cw = Math.max(0, Math.min(iw, cw));
    ch = Math.max(0, Math.min(ih, ch));

    ctx.drawImage(img, cx, cy, cw, ch, x, y, w, h);
  }

  /**
   * 加载序列帧图片：优化加载逻辑，避免无效请求
   * @param {string} url 图片基础路径
   * @param {number} frameCount 帧数
   * @param {string} suffix 后缀（xs标识）
   * @returns {HTMLImageElement[]} 图片数组
   */
  function loadSequenceImg(url, frameCount, suffix = "") {
    // 参数校验
    if (!url || !Number.isInteger(frameCount) || frameCount <= 0) return [];

    const imgArr = [];
    for (let i = 0; i < frameCount; i++) {
      const img = new Image();
      // 拼接路径（避免字符串拼接错误）
      img.src = `${url}${i + 1}${suffix}.webp`;
      imgArr.push(img);
    }
    return imgArr;
  }

  /**
   * 设置Swiper自动播放触发：优化逻辑，避免重复绑定
   * @param {string} triggerSelector 触发元素选择器
   * @param {Function} callback 触发回调
   */
  function setSwiperAutoplay(triggerSelector, callback) {
    let isPlayed = false;
    const trigger = document.querySelector(triggerSelector);
    if (!trigger || typeof callback !== 'function') return;

    new ScrollMagic.Scene({
      duration: "0%",
      triggerHook: 1,
      triggerElement: trigger
    }).on("enter", function() {
      if (!isPlayed) {
        isPlayed = true;
        callback();
      }
    }).addTo(scrollMagicController);
  }

  /**
   * 设置S5 Canvas序列帧：核心逻辑重构，解决内存泄漏
   */
  function setS5Canvas() {
    // 销毁旧实例（避免重复创建）
    if (s5CanvasInstance) {
      s5CanvasInstance.destroy();
    }

    const aestheticsBg = document.querySelector(".aesthetics-background");
    if (!aestheticsBg) return;

    const s5canvas = aestheticsBg.querySelector("canvas");
    if (!s5canvas) return;

    const ctx = setupCanvas(s5canvas);
    if (!ctx) return;

    // 解构获取data属性（避免重复查询）
    const { url: s5url, duration: s5Duration, frames: s5Frame } = s5canvas.dataset;
    // 转换为数值类型（data属性默认是字符串）
    const frameCount = parseInt(s5Frame, 10);
    const durationPercent = `${parseInt(s5Duration, 10)}%`;

    // 懒加载触发位置计算
    const canvasTop = utils.getElementTop(aestheticsBg);
    const lazyTrigger = Math.max(0, canvasTop - (window.innerHeight * CONSTANTS.LAZY_LOAD_OFFSET));

    // 序列帧实例：封装状态，便于销毁
    s5CanvasInstance = {
      frameHandler: 0,
      scene: null,
      images: [],
      currentFrame: 0,
      targetFrame: 0,

      /**
       * 初始化序列帧
       */
      initSequence() {
        this.images = loadSequenceImg(s5url, frameCount);
        this.setDefaultFrame(window.scrollY >= utils.getElementTop(aestheticsBg) ? frameCount - 1 : 0);
        this.bindScrollProgress();
      },

      /**
       * 设置默认帧：优化图片加载判断
       * @param {number} frameIndex 帧索引
       */
      setDefaultFrame(frameIndex) {
        const img = this.images[frameIndex];
        if (!img) return;

        // 确保Canvas尺寸正确
        s5canvas.width = s5canvas.clientWidth;
        s5canvas.height = s5canvas.clientHeight;

        if (img.complete) {
          drawImageProp(ctx, img);
        } else {
          // 避免重复绑定onload
          img.onload = () => drawImageProp(ctx, img);
        }
      },

      /**
       * 绘制Canvas到目标帧：优化动画帧控制
       */
      drawCanvasToFrame() {
        const img = this.images[this.currentFrame];
        if (img) drawImageProp(ctx, img);

        // 帧更新逻辑
        if (this.currentFrame > this.targetFrame) {
          this.currentFrame--;
        } else if (this.currentFrame < this.targetFrame) {
          this.currentFrame++;
        }

        // 停止动画（避免无效循环）
        if (this.currentFrame === this.targetFrame) {
          cancelAnimationFrame(this.frameHandler);
          this.frameHandler = 0;
          return;
        }

        this.frameHandler = requestAnimationFrame(() => this.drawCanvasToFrame());
      },

      /**
       * 绑定滚动进度控制
       */
      bindScrollProgress() {
        const trigger = document.querySelector(aestheticsBg.dataset.trigger);
        if (!trigger) return;

        this.scene = new ScrollMagic.Scene({
          duration: durationPercent,
          triggerHook: 0,
          triggerElement: trigger
        }).on("progress", (e) => {
          this.targetFrame = parseInt(e.progress * (frameCount - 1), 10);
          if (this.frameHandler === 0) {
            this.drawCanvasToFrame();
          }
        }).addTo(scrollMagicController);
      },

      /**
       * 销毁实例：清理动画和场景，避免内存泄漏
       */
      destroy() {
        cancelAnimationFrame(this.frameHandler);
        if (this.scene) this.scene.destroy();
        this.images = [];
        this.currentFrame = 0;
        this.targetFrame = 0;
      }
    };

    // 懒加载逻辑：使用requestAnimationFrame优化性能
    function lazySequence() {
      if (window.scrollY >= lazyTrigger) {
        s5CanvasInstance.initSequence();
      } else {
        requestAnimationFrame(lazySequence);
      }
    }
    lazySequence();
  }

  /**
   * 初始化移动端Swiper：优化实例管理
   */
  function initMobileSwiper() {
    // 销毁旧Swiper实例
    if (mobileSwiper) {
      mobileSwiper.destroy(true, true);
      mobileSwiper = null;
    }

    const swiperContainer = document.querySelector(".aesthetics-img-wrap");
    if (!swiperContainer) return;

    mobileSwiper = new Swiper(swiperContainer, {
      effect: "fade",
      fadeEffect: { crossFade: true },
      pagination: {
        el: '.aesthetics-img-wrap-pagination',
        clickable: true
      },
      // 补充移动端Swiper核心配置
      autoplay: {
        delay: 3000, // 自动轮播间隔
        disableOnInteraction: false, // 交互后不停止自动轮播
      },
      // 确保Swiper自适应容器尺寸
      autoHeight: false, // 关闭自动高度，强制使用容器高度
      initialSlide: 0,   // 默认显示第一张
      observer: true,    // 监听容器变化自动更新
      observeParents: true, // 监听父容器变化
      preventClicks: false // 避免点击图片无响应
    });
  }

  /**
   * 核心初始化函数：拆分逻辑，单一职责
   */
  function init() {
    const windowWidth = window.innerWidth;

    if (windowWidth >= CONSTANTS.MOBILE_BREAKPOINT) {
      // 桌面端：初始化Canvas
      setS5Canvas();
      // 销毁移动端Swiper（避免共存）
      if (mobileSwiper) {
        mobileSwiper.destroy(true, true);
        mobileSwiper = null;
      }
    } else {
      // 移动端：初始化Swiper
      initMobileSwiper();
      // 销毁Canvas实例（避免内存泄漏）
      if (s5CanvasInstance) {
        s5CanvasInstance.destroy();
        s5CanvasInstance = null;
      }
    }
  }

  // 初始执行
  init();

  // 窗口大小改变：防抖处理，避免高频触发
  window.addEventListener('resize', utils.debounce(init, 300));

  // 页面卸载：清理所有实例，避免内存泄漏
  window.addEventListener('unload', () => {
    if (s5CanvasInstance) s5CanvasInstance.destroy();
    if (mobileSwiper) mobileSwiper.destroy(true, true);
    scrollMagicController.destroy();
  });
});