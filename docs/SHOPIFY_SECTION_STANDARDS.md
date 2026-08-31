# Shopify Section 开发规范

版本：1.0

适用主题：FANY / Dawn 15.3.0

适用范围：本项目后续新建的所有 Shopify sections，以及被实质性改造的自定义 sections。

## 1. 规范目标

所有新 section 必须同时满足以下目标：

1. 忠实还原设计稿，不自行增加、删除或合并设计范围之外的内容。
2. PC、平板、移动端均可稳定响应，关键配置可以在 Shopify 后台维护。
3. 一个页面可重复添加多个实例，实例之间不会发生样式、ID 或 JavaScript 冲突。
4. 图片、文字、链接、颜色和尺寸按需求开放配置，同时保留合理默认值和兼容回退。
5. 满足 Shopify Theme Editor、性能、无障碍与减少动态效果要求。
6. 新功能仅加入 section 列表；除非用户明确要求，不修改任何模板 JSON、section group 或现有页面结构。
7. 每个 section 必须提供 PC 与移动端分别可调的上、下间距配置。

## 2. 项目现状与采用的基线

本主题基于 Dawn 15.3.0。当前代码包含约 106 个 section，其中多数 section 使用独立 CSS，部分复杂交互使用独立 JavaScript，也存在少量历史内联样式和不一致断点。

后续开发以以下实现方式为基线：

- `sections/business-hero.liquid`：Figma 高保真、PC/移动端图片、富文本、动态 blocks、实例级 CSS 变量。
- `sections/apple-scroll-feature-gallery.liquid`：复杂滚动效果、响应式图片、自由数量卡片、实例隔离。
- `assets/apple-scroll-feature-gallery.js`：Web Component、生命周期清理、键盘/触摸/拖拽交互。

历史代码只能作为业务参考，不能自动视为新代码规范。发现历史写法与本文冲突时，以本文为准。

## 3. 开发前必须确认的内容

写代码之前必须确认或从上下文中明确得到：

- section 的准确功能边界。
- 哪些 Figma 节点属于本功能，哪些节点明确排除。
- PC、1280、平板、移动端分别采用哪个设计节点。
- 图片是整图还是由多个独立图层组成。
- PC 和移动端是否使用不同图片。
- 哪些文字需要富文本、高亮、链接或独立颜色。
- 重复内容是固定字段还是可自由增删的 blocks。
- section 只进入列表，还是需要加入指定模板。
- 动画应复刻设计稿、参考网站，还是仅使用基础入场动画。

当用户明确指出某块“不属于此功能”时，必须把该节点及其全部后代从实现范围中排除。不能因为它出现在父级截图中就一并实现。

## 4. Figma 设计转代码流程

收到 Figma 链接时必须遵循以下顺序：

1. 读取所有明确提供的 PC、1280 和移动端节点。
2. 单独读取用户标注的排除节点，确认排除边界。
3. 记录关键尺寸：画布、列宽、内容宽度、内外边距、高度、字号、行高、颜色、圆角与层级。
4. 核对图片是整图还是独立覆盖层，不能重复生成已经合并到图片里的元素。
5. 先检查项目中可复用的主题变量、组件和交互模式。
6. 将 Figma 输出转换成 Liquid、HTML、CSS 和必要的原生 JavaScript；禁止直接粘贴 React/Tailwind 参考代码。
7. 分别在设计稿对应宽度检查，而不是只验证单一桌面尺寸。

设计优先级：

1. 用户本轮的明确说明。
2. 用户指定的 Figma 节点及排除节点。
3. 已确认的参考网站交互。
4. 本规范。
5. 主题历史实现。

## 5. 文件结构与命名

每个独立功能使用一致的 kebab-case 名称：

```text
sections/<feature-name>.liquid
assets/<feature-name>.css
assets/<feature-name>.js       # 只有存在真实交互时才创建
assets/<feature-name>-*.svg    # 只有真实导出资源时才创建
```

要求：

- Liquid、CSS、JS 使用相同功能前缀。
- CSS 使用 BEM，例如 `.business-hero__heading`。
- CSS 自定义属性使用短且唯一的功能前缀，例如 `--bh-heading-color`。
- DOM ID 必须包含 `section.id`；block 级 ID 必须包含 `block.id` 或实例内唯一索引。
- 禁止使用容易污染全站的裸选择器，例如 `.button`、`.card`、`.title`、`h2`。
- 新 section 的 schema `name` 必须简短清晰，并符合 Shopify 字符限制。

## 6. Liquid 结构规范

推荐文件顺序：

1. 加载独立 CSS。
2. 加载独立 JS，并使用 `defer="defer"`。
3. 使用 `{%- liquid -%}` 集中处理图片回退、block 分类和派生值。
4. 输出带唯一 ID 的 section 根节点。
5. 输出语义化内容。
6. 最后放置 `{% schema %}`。

示例：

```liquid
{{ 'feature-name.css' | asset_url | stylesheet_tag }}
<script src="{{ 'feature-name.js' | asset_url }}" defer="defer"></script>

{%- liquid
  assign desktop_image = section.settings.desktop_image
  assign mobile_image = section.settings.mobile_image
  assign fallback_image = desktop_image | default: mobile_image
-%}

<section
  id="FeatureName-{{ section.id }}"
  class="feature-name"
  style="--fn-color: {{ section.settings.text_color }};"
>
  ...
</section>
```

输出规则：

- 普通 `text`、`textarea` 和 URL 派生文本必须使用 `escape`。
- `richtext` 由 Shopify 生成 HTML，不使用 `escape`，外层加 `.rte`。
- 可选内容必须先判断 `!= blank`，为空时不输出空标签。
- block 根节点必须带 `{{ block.shopify_attributes }}`。
- Theme Editor 中图片为空时应使用 `request.design_mode` 提供 placeholder；线上不要显示假内容。
- 不直接输出未经约束的用户值到 class、HTML 属性或脚本。

## 7. Shopify Schema 规范

### 7.1 设置分组

设置必须用 `header` 按照使用流程分组，推荐顺序：

1. 内容
2. 图片/视频
3. 布局与位置
4. 颜色
5. PC 字号与尺寸
6. 移动端字号与尺寸
7. 间距
8. 无障碍辅助字段

### 7.2 字段类型

- 短文字：`text`
- 多行纯文字：`textarea`
- 需要粗体、链接或段落：`richtext`
- 单行可格式化标题：优先 `inline_richtext`
- 图片：`image_picker`
- 链接：`url`
- 颜色：`color`
- 允许渐变或透明背景：`color_background`
- 数值尺寸：`range`，必须有单位和符合设计稿的默认值
- 有限枚举：`select`
- 开关：`checkbox`

### 7.3 默认值与兼容性

- 默认值必须能直接形成接近设计稿的完整 section。
- setting ID 一旦上传使用，后续不要随意改名，否则会丢失商家配置。
- 新增移动端图片时，保留原 PC 图片 ID，移动图为空自动回退 PC 图。
- 删除设置时同步删除 Liquid 引用、CSS 变量、样式和无效说明。
- 不把固定示例数量当作业务上限。
- 只有业务确实要求限制数量时才设置 `max_blocks` 或 block `limit`。

## 8. 富文本与颜色规范

- 主标题或描述需要局部格式时使用 Shopify 富文本，不拆成大量固定字符串字段。
- 富文本容器必须继承 section 设置的字号、颜色、行高和字重，避免 Dawn 的全局 `.rte` 样式改变设计。
- 必须重置富文本首尾段落的多余 margin。
- 如果设计要求局部高亮，可约定富文本中的 `<strong>`/`<b>` 使用“高亮颜色”设置，并在字段 `info` 中明确告知商家。
- 链接颜色、下划线和 hover 状态必须可读，不能只依赖颜色表达交互状态。
- 不声称 Shopify 原生富文本编辑器支持任意逐字颜色；局部颜色应通过明确、可维护的格式映射实现。

推荐样式：

```css
.feature-name__richtext {
  color: var(--fn-text-color);
  font-size: var(--fn-text-size);
}

.feature-name__richtext p {
  margin: 0;
  color: inherit;
  font: inherit;
}

.feature-name__richtext strong {
  color: var(--fn-highlight-color);
  font-weight: inherit;
}
```

## 9. 图片与媒体规范

### 9.1 PC/移动端图片

设计稿提供不同构图时，必须提供两个 `image_picker`：

- `desktop_image`
- `mobile_image`

移动端图片为空时自动使用 PC 图片。只有用户明确要求必须上传两张时，才取消回退。

### 9.2 响应式输出

- 使用 `<picture>` 和 `<source media="(max-width: 749px)">` 切换移动端资源。
- 使用 `image_url` 与 `image_tag`，提供合理的 `widths` 和准确的 `sizes`。
- 不直接写 Shopify 文件 CDN URL、Figma 临时 URL或第三方临时资源 URL。
- 所有 `<img>` 必须有尺寸信息或由 `image_tag` 自动生成尺寸。
- 内容图片必须有有意义的 alt；纯装饰图片使用空 alt。
- 首屏核心图可以 `loading: 'eager'` 与 `fetchpriority: 'high'`；其他图片默认 `loading: 'lazy'`。
- `object-position` 在 PC 和移动端分别配置或分别定义。

### 9.3 整图边界

如果用户说明徽章、产品卡、装饰文字等已经属于整图：

- 只输出一张图片。
- 不重复生成 HTML 覆盖层。
- 不保留无效的覆盖层设置或 CSS。

## 10. Blocks 规范

以下内容优先使用 blocks：

- 卡片列表
- 轮播项目
- 数据项
- 标签/权益项
- FAQ 项
- 可重复步骤或图标项

要求：

- 循环渲染真实 `section.blocks`，不能写死 4 个或 5 个。
- 每个 block 根节点添加 `block.shopify_attributes`。
- 不设置固定 `max_blocks`，除非设计或业务明确要求上限。
- preset 中可以提供示例 blocks，但示例数量不是功能限制。
- 一个 section 有多种 block 类型时，使用 `where: 'type', '<type>'` 分类后分别渲染。
- 空 block 不输出空卡片；设计模式可提供易理解的 placeholder。

## 11. CSS 与响应式规范

### 11.1 作用域

- 所有规则必须以 section 根类开头。
- 动态值优先作为根节点 CSS 自定义属性输出，外部 CSS 消费这些变量。
- 仅在确实需要逐 block 动态样式时使用实例 ID。
- 不覆盖 Dawn 全局组件，除非选择器明确限定在本 section 内。

### 11.2 断点

新自定义 section 统一采用：

- 移动端：`max-width: 749px`
- 桌面端：`min-width: 750px`
- 中间桌面/平板：根据设计稿增加 `1068px`、`1200px` 或 `1440px` 断点

如果设计稿提供 1920 和 1280 两份 PC 设计，必须分别核对，不得只按比例缩放 1920。

### 11.3 布局

- Grid/Flex 子项应设置 `min-width: 0`，防止长文本撑破布局。
- 内容宽度使用 `max-width`、`min()`、`max()`、`clamp()` 或响应式 padding，避免只为单一宽度硬编码。
- 当设计不是全屏铺满式布局，并且用户或设计稿没有对 PC 内容边距作特殊说明时，PC 内容区域左右间距统一固定为 `200px`；该默认边距不提供后台配置。全屏图片、全宽背景、横向滚动或用户明确指定其他数值的 section 不适用此规则。
- 使用 `overflow: clip` 前确认不会裁掉焦点框、阴影或需要交互的元素。
- 固定高度仅用于设计明确要求的视觉区域；文案区域使用 `min-height`，避免翻译或富文本溢出。
- PC 与移动端需要不同顺序时，通过 Grid/Flex `order` 或模板结构清晰实现。

### 11.4 Section 上下间距

所有新 section 必须提供以下四个 `range` 设置：

- `desktop_padding_top`：PC 上间距
- `desktop_padding_bottom`：PC 下间距
- `mobile_padding_top`：移动端上间距
- `mobile_padding_bottom`：移动端下间距

实现要求：

- 四项必须放在独立的“上下间距”或“间距”设置分组中。
- 默认值以设计稿为准；如果设计稿没有额外外部留白，默认使用 `0px`，避免启用 section 后改变版面。
- 数值通过 section 根节点的实例级 CSS 变量传递，禁止为每个实例复制整段 CSS。
- PC 和移动端使用 `750px` 断点分别生效，不能只提供一个全端共用值。
- 这里配置的是整个 section 根节点的顶部和底部 padding，不能用内容容器的内部 padding 冒充。
- 间距范围应覆盖 `0px`，让商家可以完全关闭上下留白。

推荐实现：

```liquid
<section
  class="feature-name"
  style="
    --fn-desktop-padding-top: {{ section.settings.desktop_padding_top }}px;
    --fn-desktop-padding-bottom: {{ section.settings.desktop_padding_bottom }}px;
    --fn-mobile-padding-top: {{ section.settings.mobile_padding_top }}px;
    --fn-mobile-padding-bottom: {{ section.settings.mobile_padding_bottom }}px;
  "
>
```

```css
.feature-name {
  padding-top: var(--fn-desktop-padding-top, 0px);
  padding-bottom: var(--fn-desktop-padding-bottom, 0px);
}

@media screen and (max-width: 749px) {
  .feature-name {
    padding-top: var(--fn-mobile-padding-top, 0px);
    padding-bottom: var(--fn-mobile-padding-bottom, 0px);
  }
}
```

### 11.5 动效

- 优先动画 `transform` 和 `opacity`。
- 避免持续动画布局属性、超大滤镜或不受控的滚动监听。
- 必须实现 `prefers-reduced-motion: reduce`。
- 参考网站动效需要复刻时，应先测量触发区间、滚动方向和反向恢复行为。

## 12. JavaScript 规范

没有真实交互时不要创建 JS 文件。存在交互时：

- 使用独立 asset，并通过 `defer="defer"` 加载。
- 优先使用唯一自定义元素/Web Component 封装 section 行为。
- 初始化必须可重复执行，不能重复绑定事件。
- 所有查询从当前 section 根节点开始，不依赖全局唯一 class。
- 事件监听、Observer、Animation Frame 和计时器必须在断开时清理。
- 支持 Shopify Theme Editor 动态添加、删除和重新渲染 section。
- 滑块/画廊必须支持键盘、触摸和鼠标；按钮状态必须正确反映边界。
- 高频滚动逻辑使用 `requestAnimationFrame`，避免每个 scroll 事件直接读写大量布局。
- 禁止引入新依赖，除非项目已有或用户明确同意。

## 13. 无障碍规范

- 可复用普通 section 默认使用 `h2`；只有明确作为页面主 Hero 时才使用 `h1`。
- 同一页面不能因多个可添加 Hero 产生多个无意义的 `h1`；必要时增加标题级别设置。
- 跳转使用 `<a>`，动作使用 `<button type="button">`。
- 只有图标的按钮必须有 `aria-label`。
- 轮播区域需要可识别 label、键盘操作和禁用状态。
- 装饰层使用 `aria-hidden="true"`，内容图片提供 alt。
- `:focus-visible` 必须清晰可见。
- 文字与背景颜色配置要提醒并默认满足可读对比度。

## 14. 性能规范

- CSS/JS 默认拆分为独立 assets，避免在每个实例中重复大段代码。
- 动态设置通过少量 CSS variables 传入，不复制整套 CSS。
- 不加载未使用的库、字体、图片或视频。
- 视频默认不自动下载超大资源；使用 poster、延迟加载或用户触发。
- 图片宽度列表与实际显示宽度匹配，避免移动端下载桌面超大图。
- 首屏只能给真正的 LCP 图片高优先级，页面其余图片使用 lazy loading。
- 滤镜、模糊和 sticky 效果需要在目标移动设备验证流畅度。

## 15. Theme Editor 与多实例兼容

必须验证：

- 同一页面添加两个相同 section 时样式和 JS 不互相影响。
- 修改颜色、字号、宽度、图片后立即生效。
- PC/移动端图片回退符合说明。
- blocks 可以添加、删除、排序，空状态不报错。
- 删除所有可选文案后不会留下无意义空白标签。
- 设计模式 placeholder 不会出现在正式商店。
- section 未被主动写入任何模板，除非用户明确授权。

## 16. 禁止事项

新 section 禁止：

- 自动修改模板或把 section 加入页面。
- 使用未确认属于当前功能的 Figma 节点。
- 重复实现已经合并进整图的视觉元素。
- 把卡片或列表数量硬编码成固定值。
- 使用不带 section 前缀的全局 CSS 类规则。
- 直接写远程图片、Figma 临时资源或机器本地绝对图片路径。
- 用纯 CSS/手写 SVG 猜测设计稿中的真实图标。
- 忽略移动端独立设计，简单把 PC 整体缩小。
- 对可配置文本遗漏 `escape`，或对 richtext 错误使用 `escape`。
- 在未清理监听器的情况下重复初始化 JS。
- 为了通过检查而修改与当前任务无关的历史文件。

## 17. 必须执行的验证

### 17.1 Schema 与引用

验证 schema 是合法 JSON，并检查 Liquid 中引用的 section settings 都存在：

```bash
ruby -rjson -e '
s = File.read("sections/<feature-name>.liquid")
schema = JSON.parse(s[/\{% schema %\}(.*?)\{% endschema %\}/m, 1])
ids = schema["settings"].map { |item| item["id"] }.compact
refs = s.scan(/section\.settings\.([a-z0-9_]+)/).flatten.uniq
abort("Missing: #{(refs - ids).join(", ")}") unless (refs - ids).empty?
puts "Schema and setting references are valid"
'
```

### 17.2 JavaScript

```bash
node --check assets/<feature-name>.js
```

仅在 section 存在 JS 文件时执行。

### 17.3 Theme Check

```bash
shopify theme check --path . --output json
```

主题存在历史错误时，必须过滤并确认本次新增文件没有 offense，同时在交付说明中区分新问题与历史问题。

### 17.4 格式

已跟踪文件：

```bash
git diff --check
```

未跟踪的新文件：

```bash
git diff --no-index --check /dev/null sections/<feature-name>.liquid
git diff --no-index --check /dev/null assets/<feature-name>.css
```

### 17.5 视觉检查

至少检查：

- Figma 提供的每个 PC 宽度。
- `750px` 桌面断点。
- `749px` 移动断点。
- Figma 移动端实际宽度。
- 超长标题、两段富文本、空字段和最大合理 blocks 数量。
- 正向滚动、反向滚动、键盘、触摸和减少动态效果（如果存在交互）。

## 18. 完成交付清单

每个新 section 交付前逐项确认：

- [ ] 功能边界及排除节点已确认。
- [ ] PC、移动端设计均已读取和比对。
- [ ] 只新增/修改任务范围内文件。
- [ ] 未自动写入模板。
- [ ] 文件名、类名和 CSS 变量具有唯一前缀。
- [ ] 所有普通文字已 escape，富文本按 Shopify HTML 输出。
- [ ] PC/移动端图片及回退逻辑正确。
- [ ] 图片使用 Shopify CDN 响应式输出并有 alt。
- [ ] blocks 不写死数量，并包含 `shopify_attributes`。
- [ ] CSS 不污染全站，多实例正常。
- [ ] PC 与移动端均可分别设置 section 上、下间距，且 `0px` 可正常关闭留白。
- [ ] JS 可清理、可重复初始化，并支持 Theme Editor。
- [ ] 键盘、焦点、ARIA 和 reduced motion 已处理。
- [ ] Schema、JS、Theme Check 和 whitespace 检查通过。
- [ ] 已按设计宽度完成视觉验证。
- [ ] 交付说明列出新增文件、配置项、验证结果和已知限制。

## 19. 规范维护

- 新的通用经验应更新本文，而不是只存在于某个 section 的注释中。
- 修改规范时说明原因，并确保不破坏已上传 section 的 setting ID 兼容性。
- 用户的明确新要求可以覆盖本规范；覆盖仅针对对应任务，除非用户要求把它升级为通用规范。
