var productOverviewImageSwiper;
if (document.querySelector('.product-overview-image-swiper-box')) {
  productOverviewImageSwiper = new Swiper(
    ".product-overview-image-swiper-box",
    {
      slidesPerView: 4,
      spaceBetween: 40,
      direction: "horizontal",
      navigation: {
        nextEl: ".swiper-button-next",
        prevEl: ".swiper-button-prev",
      },
    }
  );
}
var watchband;
if (document.querySelector('.watchband')) {
  watchband = new Swiper(".watchband", {
    slidesPerView: 5,
    spaceBetween: 100,
    slidesPerGroup: 1,
    loop: true,
    loopFillGroupWithBlank: true,
    navigation: {
      nextEl: ".swiper-button-next",
      prevEl: ".swiper-button-prev",
    },
  });
}
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
    const watchbandEle = document.querySelector(".watchband .swiper-slide");
    const watchBangWidth = watchbandEle.offsetWidth; // 实际宽度
    document.querySelector(".watchband .watchImg").style.width =
      watchBangWidth * 1.6 + "px";
  }
}
updateSlidesPerView();
window.addEventListener("resize", updateSlidesPerView);
async function fetchSpecsMetaObjects() {
  const specsDiv = document.querySelector(".specsDiv");
  const specsUlsDiv = specsDiv.querySelector(".specs-list-div");
  let specsMetaObjects = specsUlsDiv.querySelector("[data-meta-object]")?.innerHTML;
  if(!!specsMetaObjects){
    let query = `
      query getMultipleMetaobjects($ids: [ID!]!) { # A metaobject can be retrieved by handle or id
        nodes(ids: $ids){
          ... on Metaobject {
              type
            title: field(key: "title") {
              value
            }
            detail: field(key: "detail"){
              references(first: 50){
                edges{
                  node{
                    ... on Metaobject{
                      title: field(key: "title") {
                        value
                      }
                      value: field(key: "value"){
                        value
                        type
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }`;
    const response = await executeGraphQL(query, {
        ids: [...JSON.parse(specsMetaObjects)]
    });
    let innerHTML = "";
    response.nodes.forEach(node=>{
      if(node.type === 'product_performance_group'){
        innerHTML += `<h4>${node.title.value}</h4>`;
        if(node.detail.references.edges.length > 0){
          innerHTML += `<ul class="specs-list">`;
          node.detail.references.edges.forEach(detail => {
            let showValue = detail.node.value.value;
            if (detail.node.value.type === "boolean" && showValue === "true") {
              showValue = `✓`;
            }
            innerHTML += `<li class='f-24'><span>${detail.node.title.value}</span><span>${showValue}</span></li>`;
          });
          innerHTML += `</ul>`;
        }
      }
    })
    specsUlsDiv.innerHTML = innerHTML;
  }
}
fetchSpecsMetaObjects();