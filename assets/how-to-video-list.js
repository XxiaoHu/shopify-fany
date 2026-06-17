// 初始化变量
let filteredResults = [];
const pageSize = 100;
let secondHandle = null;
let searchName = null;
// 用户请求的页码和每页大小
let requestedPage = 0; // 从1开始
const requestedPageSize = 4;
let listBoxDiv = document.querySelector(".how-to-vedio-list").querySelector(".video-list-content");
let listContentDiv = listBoxDiv.querySelector(".list-box");
let buttonDiv = listBoxDiv.querySelector(".rich-text__buttons");
// 查询和过滤函数
async function fetchAndFilterMetaobjects() {
  let currentCursor = null;
  let hasMorePages = true;
  buttonDiv.style.display = "none";
  while (hasMorePages) {
    const query = `
      query getMetaobjects($cursor: String, $pageSize: Int!) {
        metaobjects(
          first: $pageSize, 
          after: $cursor, 
          type: "video_library"
        ) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes{
			id
			fields{
              key
              value
              reference{
                ... on Metaobject {
                  handle
                }
                ... on MediaImage {
                  alt
                  image{
                    url
                    width
                    height
                  }
                }
    		  }
			}
    	  }
        }
      }
    `;
    const response = await executeGraphQL(query, {
      cursor: currentCursor,
      pageSize: pageSize
    });
    // 如果没有更多数据，退出循环
    if (response.metaobjects.nodes.length === 0) {
      hasMorePages = false;
      break;
    }
    // 过滤结果
    let newFilteredResults = response.metaobjects.nodes;
    if(searchName){
      newFilteredResults = response.metaobjects.nodes.filter(node => {
        let field = node.fields.find(f => f.key === 'title');
        return field.value.includes(searchName);
      });
    }
    if(secondHandle){
      newFilteredResults = response.metaobjects.nodes.filter(node => {
        let field = node.fields.find(f => f.key === 'second_type');
        const nodeSecondTypeHandle = field.reference.handle;
        return nodeSecondTypeHandle === secondHandle;
      });
    }
    newFilteredResults = newFilteredResults.map(node=>{
      let newNode = {}
      node.fields.map(f=>{
        newNode[f.key] = {value: f.value}
        if(['first_type', 'second_type'].includes(f.key) ){
          newNode[f.key] = {...newNode[f.key], ...(f.reference)}
        }else if(f.key === 'image'){
          newNode[f.key] = {...newNode[f.key], ...(f.reference.image)}
        }
      })
      return newNode;
    });
    // 添加到总结果集
    filteredResults = [...filteredResults, ...newFilteredResults];
    // 更新分页信息
    hasMorePages = response.metaobjects.pageInfo.hasNextPage;
    currentCursor = response.metaobjects.pageInfo.endCursor;

    if(!hasMorePages || filteredResults > requestedPageSize){
      loadMoreVideo();
    }
  }
  let countSpan = document.querySelector(".how-to-vedio-list").querySelector(".total-count");
  countSpan.textContent = `${filteredResults.length} Results`;
}
fetchAndFilterMetaobjects();
function resetParams(){
  listContentDiv.innerHTML = '';
  filteredResults = [];
  requestedPage = 0;
  fetchAndFilterMetaobjects();
}
function searchVideoByQuery(event) {
  // 检查是否是回车键（Enter）
  if (event.keyCode === 13 || event.key === "Enter") {
    const searchTerm = event.target.value; // 获取输入框的值
    searchName = searchTerm;
    resetParams();
  }
}
function changeVideoType(element){
  const chooseType = element.dataset.secondTypeHandle;
  if(chooseType === secondHandle){
    element.classList.remove("active");
    secondHandle = null;
  }else{
    let liList = document.querySelector(".how-to-vedio-list").querySelectorAll(".second-type-box-li");
    liList.forEach(i=>{
      const iType = i.dataset.secondTypeHandle;
      if(iType === chooseType){
        i.classList.add("active");
      }else{
        i.classList.remove("active");
      }
    })
    let mLiList = document.querySelector(".how-to-vedio-list").querySelectorAll(".m-second-type-box-li");
    mLiList.forEach(i=>{
      const iType = i.dataset.secondTypeHandle;
      if(iType === chooseType){
        i.classList.add("active");
      }else{
        i.classList.remove("active");
      }
    })
    secondHandle = chooseType;
  }
  resetParams();
}
// YouTube ID提取函数
function getYoutubeId(url) {
  if (!url) return null;
  let id = "";
  if (url.includes("youtube.com/watch?v=")) {
    id = url.split("watch?v=")[1].split("&amp;")[0];
  } else if (url.includes("youtu.be/")) {
    id = url.split("youtu.be/")[1].split("?")[0];
  } else if (url.includes("youtube.com/embed/")) {
    id = url.split("embed/")[1].split("?")[0];
  }
  return id;
}
function loadMoreVideo(){
  requestedPage += 1;
  const startIndex = (requestedPage - 1) * requestedPageSize;
  const endIndex = Math.min(startIndex + requestedPageSize, filteredResults.length);
  const showMore = endIndex < filteredResults.length;
  const pageData = filteredResults.slice(startIndex, endIndex);
  buttonDiv.style.display = "none";
  for(key in pageData){
    const data = pageData[key];
    let aspect_ratio = Math.round(100/(data.image.width / data.image.height)) ;
    let video_id = getYoutubeId(data.video_url.value);
    let iframe = "";
    if(data.video_url.value.includes("youtube.com") || data.video_url.value.includes("youtu.be")){
      iframe = `<iframe
                  src="https://www.youtube.com/embed/${ video_id }?enablejsapi=1&autoplay=1"
                  class="js-youtube"
                  allow="autoplay; encrypted-media"
                  allowfullscreen
                  title="${ data.title.value }"
                ></iframe>`;
    }else{
      iframe =`<iframe
                  src="https://player.vimeo.com/video/${ video_id }?autoplay=1"
                  class="js-vimeo"
                  allow="autoplay; encrypted-media"
                  allowfullscreen
                  title="${ data.title.value }"
                ></iframe>`;
    }
    listContentDiv.innerHTML += `<div class="content-box">
              <div class="vedio isolate">
                <deferred-media
                  class="video-section__media deferred-media gradient global-media-settings media-fit-cover scroll-trigger animate--slide-in"
                  data-media-id="${ video_id }"
                  style="--ratio-percent: ${aspect_ratio}%;"
                >
                  <button
                    id="Deferred-Poster-Modal-${ video_id }"
                    class="video-section__poster media deferred-media__poster media--landscape"
                    type="button"
                    aria-label="${data.title.value}"
                  >
                    <img src="${data.image.url}" alt="加载视频：${data.title.value}" width="${data.image.width}" height="${data.image.height}" />
                    <span class="deferred-media__poster-button motion-reduce">
                      <span class="svg-wrapper">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" class="icon icon-play" viewBox="0 0 10 14"><path fill="currentColor" fill-rule="evenodd" d="M1.482.815A1 1 0 0 0 0 1.69v10.517a1 1 0 0 0 1.525.851L10.54 7.5a1 1 0 0 0-.043-1.728z" clip-rule="evenodd"></path></svg>
                      </span>
                    </span>
                  </button>
                  <template>
                      ${iframe}
                  </template>
                </deferred-media>
              </div>
              <div class="video-notice">
                <a class="f-40" href="${data.video_url.value}" target="blank">
                  ${data.title.value}
                </a>
                <p class="f-28">
                  ${data.description.value}
                </p>
              </div>
            </div>`;
  }
  if(showMore){
    buttonDiv.style.display = "block";
  }
}