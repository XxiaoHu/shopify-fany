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
    if (swiper !== targetSwiper && swiper.realIndex !== currentIndex) {
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
// 查看大图隐藏
document.querySelector(".close-modal").addEventListener("click", function () {
  document.querySelector(".product-modal").style.display = "none";
});
// 查看大图展示
document.querySelector(".magnifier").addEventListener("click", function () {
  document.querySelector(".product-modal").style.display = "block";
});
var tabContainer = document.querySelector(".tabContainer");
tabContainer.addEventListener("click", function (e) {
  const tabList = e.target.closest('.tabList'); 
  if (e.target.tagName === "LI" && tabList) {
    const tabs = tabList.querySelectorAll("li");
    let otherTabs = document.querySelectorAll(".pc-tabList li");
    if(tabList.classList.contains('pc-tabList')){
      otherTabs = document.querySelectorAll(".mobile-tabList li");
    }
    const contents = document.querySelectorAll(
      ".contentList > div"
    );
    const index = Array.from(tabs).indexOf(e.target);

    tabs.forEach((t) => {
      t.classList.remove("active");
      if(t.dataset.id){
        let el = document.getElementById(t.dataset.id);
        if(el){
          el.style.display = "none";
        }
      }
    });
    contents.forEach((c) => c.classList.remove("active"));
    otherTabs.forEach((c) => c.classList.remove("active"));
    e.target.classList.add("active");
    if(e.target.dataset.id){
        let el = document.getElementById(e.target.dataset.id);
        if(el){
          el.style.display = "block";
        }
      }
    if (contents[index]) {
      contents[index].classList.add("active");
      var topPosition = contents[index].offsetTop;
      if(!tabContainer.classList.contains('top')){
        topPosition -= tabContainer.offsetHeight;
      }
      // 滚动到该位置
      window.scrollTo({
        top: topPosition, 
        left: 0, 
        behavior: 'smooth'  // 平滑滚动
      });
    }
    if(otherTabs[index]){
      otherTabs[index].classList.add("active");
    }
  }
});
const tabHeight = tabContainer.offsetTop;
window.addEventListener('scroll', function() {
  let scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
  // let mobile_details = tabContainer.querySelector("details.mobile-box");
  // if(mobile_details){
  //   mobile_details.open = false;
  // }
  if (scrollTop >= tabHeight) {
    tabContainer.classList.add('top');
  }else{
    tabContainer.classList.remove('top');
  }
});
function copyTextFallback(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text);
  } else {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed'; 
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      console.log('复制成功:', text);
    } catch (err) {
      console.error('复制失败:', err);
    }
    document.body.removeChild(textArea); 
  }
}
// 折扣码
let discount = document.querySelector(".product-discount-code .btn-copy-block");
if(discount){
  discount.addEventListener("click", function (e) {
    let code = this.querySelector('.code').innerText;
    copyTextFallback(code);
    let ths = e.currentTarget;
    ths.style.display = 'none';
    let success = e.currentTarget.nextElementSibling;
    success.classList.add('show');
    setTimeout(function () {
      success.classList.remove('show');
      ths.style.display = 'block';
    }, 3000);
  });
}