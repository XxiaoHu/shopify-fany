  let swiper = null; // 声明全局Swiper实例

  // ========== 新增：封装触摸事件绑定逻辑 ==========
  function bindTouchEvents() {
    // 获取所有产品卡片（每次执行都会重新获取最新的卡片）
    const productCards = document.querySelectorAll('.product-category-product-card');
    // 定义最小滑动距离（px）
    const SWIPE_THRESHOLD = 30;

    // 先移除所有已有事件（避免重复绑定）
    productCards.forEach(card => {
      // 清除原有事件（通过克隆节点方式，简单高效）
      const newCard = card.cloneNode(true);
      card.parentNode.replaceChild(newCard, card);
    });

    if (window.innerWidth > 1023) {
      // Desktop: CSS handles hover swap, no extra JS needed
      return;
    }

    if (window.innerWidth > 1023) return;

    // 重新获取最新的卡片（避免引用旧节点）
    const newProductCards = document.querySelectorAll('.product-category-product-card');
    
    // 遍历每个卡片添加触摸事件
    newProductCards.forEach(card => {
        let touchStartX = 0;
        let touchEndX = 0;

        // 触摸开始
        card.addEventListener('touchstart', function(e) {
            touchStartX = e.changedTouches[0].screenX;
            touchEndX = touchStartX;
        }, { passive: true });

        // 触摸移动
        card.addEventListener('touchmove', function(e) {
            touchEndX = e.changedTouches[0].screenX;
        }, { passive: true });

        // 触摸结束
        card.addEventListener('touchend', function(e) {
            
            // 计算滑动距离（左滑为正）
            const swipeDistance = touchStartX - touchEndX;
            
            const isImgArea = e.target.closest('.product-img-container');
            if (isImgArea) {
              // 左滑超过阈值，切换图片
              if (swipeDistance > SWIPE_THRESHOLD) {
                  card.classList.add('touched');
              }else if (swipeDistance < -SWIPE_THRESHOLD) {
                // 右滑超过阈值，恢复原图
                  card.classList.remove('touched');
              }else{
                e.preventDefault();
                card.classList.toggle('touched');
              }
            }
            
            // 重置坐标
            touchStartX = 0;
            touchEndX = 0;
        });

        // 点击也切换（增强移动端体验）
        card.addEventListener('click', function(e) {
          const isImgArea = e.target.closest('.product-img-container');
          if (isImgArea) {
            if (window.innerWidth <= 1023) {
              e.preventDefault();
              e.stopPropagation();
              card.classList.toggle('touched');
            }
          }
        });
    });
  }


  // 初始化轮播图（核心函数）
  function initSwiper(groupKey) {
    // 获取轮播图容器
    const swiperWrapper = document.querySelector('.product-category-home-swiper .swiper-wrapper');
    if (!swiperWrapper) return;

    // 清空原有内容
    swiperWrapper.innerHTML = '';

    // 获取当前组的轮播数据
    const slides = (window.slideGroups && window.slideGroups[groupKey]) || [];
    if (!slides.length) return;

    // 生成轮播项HTML
    slides.forEach(item => {
      const slide = document.createElement('div');
      slide.className = 'swiper-slide';

      // 拼接轮播项内容（标题和价格分开为两个模块）
      let slideContent = '';
      if(item.badgeText){
        slideContent += `<div class="product-category-badge">${item.badgeText}</div>`;
      }
      slideContent += `
        <div class="product-category-product-card">
          <a href="${item.url}" class="card-a">
          <div class="product-img-container">
            <img src="${item.imgUrl}" alt="${item.title}" class="product-img">
            <img src="${item.imgHoverUrl}" alt="${item.title} - hover" class="product-img-hover">
            <div class="image-indicators">
              <span class="indicator active"></span>
              <span class="indicator"></span>
            </div>
          </div>
          <h3 class="card-title">${item.title}</h3>
      `;
      if(item.price) {
        slideContent += `<p class="card-price"><span class="shop-btn">Shop now</span><span class="price-s">${item.price}</span>`;
        if(item.disPrice) {
          slideContent += `<span class="dis-price">${item.disPrice}</span>`;
        }
        slideContent += `</p>`;
      }
      slideContent += `</a></div>`;

      slide.innerHTML = slideContent;
      swiperWrapper.appendChild(slide);
    });

    // 销毁原有Swiper实例（避免重复初始化）
    if (swiper) {
      console.log("del swiper")
      swiper.destroy(true, true);
    }

    // 大于375时重新初始化Swiper
    if (window.innerWidth >= 1024) {
      swiper = new Swiper('.product-category-home-swiper', {
        slidesPerView: 1,
        spaceBetween: 20,
        navigation: {
          nextEl: '.swiper-button-next',
          prevEl: '.swiper-button-prev',
        },
        // 响应式配置
        breakpoints: {
          1024: { slidesPerView: 4, spaceBetween: 16 },
          1440: { slidesPerView: 4, spaceBetween: 16 }
        },
        // Swiper初始化完成后调整箭头位置
        on: {
          init: function() {
            adjustSwiperArrows();
          }
        }
      });
    }

    // 初始化后立即调整箭头位置（兼容部分加载延迟）
    setTimeout(adjustSwiperArrows, 100);

    // ========== 关键修改：生成卡片后立即绑定触摸事件 ==========
    bindTouchEvents();
  }

  function adjustSwiperArrows() {
    // 获取图片容器高度
    const imgContainer = document.querySelector('.product-img-container');
    if (!imgContainer) return;
    
    const imgHeight = imgContainer.offsetHeight;
    const arrowHeight = 44; // 箭头按钮高度
    const topPosition = (imgHeight - arrowHeight) / 2; // 计算图片区域垂直居中的top值

    // 设置箭头位置
    const prevBtn = document.querySelector('.swiper-button-prev');
    const nextBtn = document.querySelector('.swiper-button-next');
    if (prevBtn && nextBtn) {
      prevBtn.style.top = `${topPosition}px`;
      nextBtn.style.top = `${topPosition}px`;
    }
}

  // 页面加载完成后初始化默认轮播组
  document.addEventListener('DOMContentLoaded', function() {

    // 菜单点击事件
    const menuItems = document.querySelectorAll('.menu-item');
    if (!menuItems.length) return;

    // 初始化默认组
    if (menuItems[0].dataset.group) {
      initSwiper(menuItems[0].dataset.group);
    }

    menuItems.forEach(item => {
      item.addEventListener('click', () => {
        // 移除所有菜单激活状态
        menuItems.forEach(mi => mi.classList.remove('active'));
        // 激活当前菜单
        item.classList.add('active');
        // 获取当前菜单对应的图片组
        const groupKey = item.dataset.group;
        // 重新初始化轮播图
        initSwiper(groupKey);
      });
    });
    
    // 窗口大小变化时重置状态
    window.addEventListener('resize', function() {
        // 重新获取最新的卡片并重置状态
        const productCards = document.querySelectorAll('.product-category-product-card');
        productCards.forEach(card => {
            card.classList.remove('touched');
        });
    });


    // 窗口大小变化时重新调整箭头位置（响应式适配）
    window.addEventListener('resize', adjustSwiperArrows);
    // 监听窗口大小变化，重新初始化
    window.addEventListener('resize', function() {
      // 获取当前激活的菜单组
      const activeMenuItem = document.querySelector('.menu-item.active');
      if (!activeMenuItem || !activeMenuItem.dataset.group) return;
      initSwiper(activeMenuItem.dataset.group);
    });
  });
