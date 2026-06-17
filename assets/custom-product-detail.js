var tabContainer = document.querySelector('.tabContainer');
  tabContainer.addEventListener('click', function(e) {
    if (e.target.tagName === 'LI' && e.target.closest('.tabList')) {
      const tabs = document.querySelectorAll('.tabList li');
      const contents = document.querySelectorAll('.contentList > div:not(.smallTabBtn');
      const btns = document.querySelectorAll(".smallTabBtn");
      const index = Array.from(tabs).indexOf(e.target);
      
      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));
      btns.forEach(c => c.classList.remove('active'));
      e.target.classList.add('active');
      if (contents[index]) {
        contents[index].classList.add('active');
        contents[index].previousElementSibling.classList.add("active")
      }
    }
  });
const tabButtons = document.querySelectorAll('.smallTabBtn');
tabButtons.forEach((button, index) => {
  button.addEventListener('click', () => {
    var isDisplay = true;
    // 移除所有可能的 active 类（可选）
    if (button.className.indexOf("active") > 0) {
        button.classList.remove('active');
        isDisplay = false;
    } else {
        button.classList.add('active');
        isDisplay = true;
    }
    const nextElement = button.nextElementSibling;
    if (nextElement) {
        if (isDisplay) {
            nextElement.classList.add('active');
            var tabList = document.querySelectorAll('.tabList li');
            tabList.forEach(el => {
                el.classList.remove('active');
            });
            if(tabList[index]){
                tabList[index].classList.add("active")
            }
        } else {
            nextElement.classList.remove('active');
            var tabList = document.querySelectorAll('.tabList li');
            tabList.forEach(el => {
                el.classList.remove('active');
            });
            if(tabList[index]){
                tabList[index].classList.add("active")
            }
        }
    }
  });
});
  function updateSlidesPerView() {
    const width = window.innerWidth;
    let slidesPerView = 1;
    if (productOverviewImageSwiper) {
        if (width >= 768 && width < 992) {
            slidesPerView = 2;
        } else if (width >= 992 && width < 1200) {
            slidesPerView = 3;
        } else if (width >= 1200) {
            slidesPerView = 4;
        } else {
            slidesPerView = 2;
        }
        productOverviewImageSwiper.params.slidesPerView = slidesPerView;
        productOverviewImageSwiper.update();
    }
    if (watchband) {
        var spaceBetween = 100;
        if (width >= 1200) {
            slidesPerView = 5;
        } else {
            slidesPerView = 3;
        }
        if (width < 768) {
            spaceBetween = 30;
        }
        watchband.params.slidesPerView = slidesPerView;
        watchband.params.spaceBetween = spaceBetween;
        watchband.update();
        const watchbandEle = document.querySelector('.watchband .swiper-slide');
        const watchBangWidth = watchbandEle.offsetWidth; // 实际宽度   
        document.querySelector('.watchband .watchImg').style.width = watchBangWidth * 1.6 + "px";
    }
  }
  updateSlidesPerView();
  window.addEventListener('resize', updateSlidesPerView);
var specsDiv = document.querySelector('.specsDiv');
const specsUls = specsDiv.querySelectorAll('.specs-list');
specsUls.forEach((list)=>{
  if(list.dataset.filedObj){
    let dataDetail = JSON.parse(list.dataset.filedObj);
    Object.entries(dataDetail).forEach(([key, value]) => {
      if(value && key !== 'title'){
        let showValue = value;
        if(value === true){
          showValue = `✓`;
        }
        list.innerHTML += `<li class='f-24'><span>${key}</span><span>${showValue}</span></li>`;
      }
    });
  }
});
// 动态加载overview
document.addEventListener('DOMContentLoaded', function() {
  const overview_section = document.querySelector('.product-overview-group-section');
  if(overview_section){
    const overviewDiv = document.querySelector('.overviewDiv');
    overviewDiv.innerHTML = overview_section.innerHTML;
    overview_section.innerHTML = '';
  }
});
const tabHeight = tabContainer.offsetTop;
window.addEventListener('scroll', function() {
  let scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
  let mobile_details = tabContainer.querySelector("details.mobile-box");
  if(mobile_details){
    mobile_details.open = false;
  }
  if (scrollTop >= tabHeight) {
    tabContainer.classList.add('top');
  }else{
    tabContainer.classList.remove('top');
  }
});