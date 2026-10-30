---
name: "日光留言墙"
description: "暖阳纸笺组成的自由坐标公共留言墙。"
colors:
  wall: "#f1ecde"
  ink: "#474b3e"
  muted-ink: "#606651"
  control: "#e8e9dc"
  control-hover: "#dbe0cd"
  panel: "#faf7eb"
  workspace: "#eae7d9"
  button-sun: "#edc36f"
  button-sun-hover: "#e8b954"
  button-ink: "#554323"
  paper-yellow: "#f6e8af"
  paper-green: "#e2e9d4"
  paper-pink: "#f2ddd7"
  paper-blue: "#dce9e9"
  photo-paper: "#fffdf5"
  yellow-tape: "#ddcc99"
  green-tape: "#bbc8a3"
  pink-tape: "#dbbdb4"
  blue-tape: "#b4cbca"
  daylight-ink: "#52604b"
  focus: "#8a6629"
  error: "#9a382e"
  valid-outline: "#4b7445"
  invalid-outline: "#a74432"
  valid-badge: "#46613a"
  badge-ink: "#fffef3"
  selected: "#dfe6cf"
  selected-ink: "#3e4d31"
typography:
  title:
    fontFamily: "'Sunlit Serif', 'Noto Serif SC', 'Songti SC', 'SimSun', serif"
    fontSize: "23px"
    fontWeight: 400
    lineHeight: 1.6
  editor-title:
    fontFamily: "'Sunlit Serif', 'Noto Serif SC', 'Songti SC', 'SimSun', serif"
    fontSize: "21px"
    fontWeight: 400
    lineHeight: 1.5
  body:
    fontFamily: "'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.6
  writing:
    fontFamily: "'Sunlit Serif', 'Noto Serif SC', 'Songti SC', 'SimSun', serif"
    fontSize: "21px"
    fontWeight: 400
    lineHeight: 1.7
  control:
    fontFamily: "'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.6
  label:
    fontFamily: "'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.6
  caption:
    fontFamily: "'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.6
rounded:
  paper: "2px 3px 5px 2px"
  control: "6px"
  panel: "8px"
  badge: "4px"
  circle: "50%"
spacing:
  control-gap: "8px"
  desktop-edge: "28px"
  mobile-edge: "16px"
  editor-control: "22px"
components:
  button-primary:
    backgroundColor: "{colors.button-sun}"
    textColor: "{colors.button-ink}"
    typography: "{typography.control}"
    rounded: "{rounded.panel}"
    padding: "10px 20px"
    height: "46px"
  button-primary-hover:
    backgroundColor: "{colors.button-sun-hover}"
  button-default:
    backgroundColor: "{colors.control}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
    height: "42px"
  button-default-hover:
    backgroundColor: "{colors.control-hover}"
  note-yellow:
    backgroundColor: "{colors.paper-yellow}"
    textColor: "{colors.ink}"
    typography: "{typography.writing}"
    rounded: "{rounded.paper}"
  note-green:
    backgroundColor: "{colors.paper-green}"
    rounded: "{rounded.paper}"
  note-pink:
    backgroundColor: "{colors.paper-pink}"
    rounded: "{rounded.paper}"
  note-blue:
    backgroundColor: "{colors.paper-blue}"
    rounded: "{rounded.paper}"
  photo:
    backgroundColor: "{colors.photo-paper}"
    rounded: "{rounded.paper}"
  editor:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
  input-author:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    padding: "8px 0"
    rounded: "0"
---

# Design System: 日光留言墙

## Overview

**Creative North Star: "午后窗边"**

暖米纸纹、低饱和纸色、宋体、轻胶带与柔影延续「暖阳治愈系 · 自然简约 · 轻手作感」。这一轮替换墙的空间与编辑交互，保留既有品牌世界；不生成或替换新位图素材。

纸张自由占据二维空间，空间关系来自访客确认的位置。界面控件安静、直接：墙上读与探索，编辑器里清楚操作，放置阶段用纸张预览和可建造区反馈位置。

**Key Characteristics:**

- 暖米纸纹与四种纸色，纸面和墙面共享材料语言。
- 宋体承担留言与名称，无衬线承担操作与辅助说明。
- 轻胶带、不对称小圆角、柔和纸影保留手作感。
- 自由坐标跨设备保持，桌面两栏编辑器在手机改为上下结构。
- 几何 SVG、清楚焦点、文字和颜色共同表达操作状态。

## Colors

色彩像自然光中的纸张：底色柔和、正文墨色沉稳，姜黄标识主要行动。

### Primary

- **姜黄日光**：`button-sun` / `button-sun-hover` 用于「贴一张」、编辑下一步与放置确认，配 `button-ink`。
- **苔绿反馈**：`valid-outline` / `valid-badge` 标识可贴位置；`invalid-outline` / `error` 标识无效位置与错误。反馈同时带文字，不能只凭红绿识别。

### Secondary

- **麦芽黄、嫩叶绿、浅陶粉、雾水蓝**：`paper-*` 为自由选用的纸材，不代表类别。各色胶带使用对应 `*-tape`。
- **暖白相纸**：`photo-paper` 承接白边相片。

### Neutral

- `wall` 为墙面底色，`panel` 为镜头控件、便签操作条与编辑器底，`workspace` 为编辑纸面外的工作区。
- `ink` 与 `muted-ink` 分别承接正文和辅助说明。文字块可由用户自由设置墨色。
- `daylight-ink` 是低浓度投影墨色；`focus` 用于可见键盘焦点。

**The Paper and Ink Rule.** 纸色表达材料，控件与辅助文字保持清楚对比；四纸色不重新绑定分类。

## Typography

**Display / Writing Font:** 自托管 Sunlit Serif，后接 Noto Serif SC、Songti SC、SimSun 与 serif。标题子集来源与 OFL 许可见 `web/public/fonts/README.txt`。

**Body / Control Font:** Noto Sans SC、PingFang SC、Microsoft YaHei 与 sans-serif。

### Hierarchy

- 墙名称桌面 `title`，手机 20px；编辑器标题桌面 `editor-title`，手机 18px。
- 默认文字块 `writing`，用户可调 12–48px，行高 1.7；Markdown 标题为相对字号，粗体、引用与代码保持纸上阅读语境。
- 旧内容为 17px / 1.9 宋体；署名 10px，辅助提示 `caption`。
- 按钮、字段与说明采用 `control`、`label`、`body`，不为纸张设置固定行数。

**The Two Voices Rule.** 宋体留给名称与留言，无衬线负责操作和辅助信息。

## Layout

墙为全视口 `100dvh`，根页面不做纵向信息流滚动；世界容器按镜头平移与缩放。纸张绝对定位，宽 160–560、高 160–640，默认 320×320。手机保留原坐标，既有纸张不因屏幕宽度变化重排。只渲染视野附近 60 个坐标单位余量内的便签 DOM；数据读取仍为整墙分页。

名称在左上（桌面 32px / 25px，手机 20px / 20px），镜头控件左下（桌面 28px，手机左 16px、下 20px），「贴一张」右下（桌面 28px，手机右 16px、下 82px）。镜头控件只显示缩放按钮和比例；缩放下限按墙的适配比例动态计算，可低于25%。镜头约束于便签边界外1000，遇到包围框中的空白角落时回钳到最近纸张，避免丢失墙面。点击便签仅选中，不在右上角展开详情窗口；自己的便签附近显示叠贴和贴相片操作条。

编辑器宽 `min(1000px, 100% - 48px)`、高 `min(800px, 100dvh - 48px)`；左侧纸面编辑/预览，右侧 270px 控件栏。下一步固定于右下，控件底部留 100px。700px 以下改为上下结构，弹窗距边 10px，纸面工作区 420px 高，内容可滚动，下一步固定于底部全宽。

放置时可贴区域保留原背景，不可贴区域以 40% 深色遮罩压暗，并显示红绿 ghost；当前待贴便签始终位于遮罩上方，保持完全不透明。点击/拖动改变坐标后，松手保持位置；按住待贴便签进入视口边缘 96px 范围时，镜头按距离渐进平移，总速度最高 1200 屏幕像素/秒（斜向同样限速），并在同帧重算便签位置保持跟手。移开、松手、取消或失焦即停止，到达镜头边界不继续向外；方向键可微调，Alt 拖动画面。不显示底部放置提示面板；返回编辑、取消与确认以 256px 宽的紧凑操作条跟随待贴便签，并限制在视口内；状态显示在纸边，镜头控件保持原位置。首张以半径 100 的原点圆定位；普通纸间至少留 16，且须满足邻接上限；已发布位置不自动整理。

## Elevation & Depth

墙、便签与编辑工作区复用 360px 纸纹，multiply 混合。素材为 ambientCG Paper001（CC0），来源记录在 `web/public/images/paper-texture.LICENSE.txt` 与 `.webp.json`。本轮未新增或替换图片。疏朗斜影和枝叶固定在二维墙面坐标，13% 整层不透明度、忽略指针；和便签共用同一个世界变换，同步平移和缩放，不使用追踪镜头的补间或异步可见性回调。

影子以 1280×1280 世界单位分块，正负坐标均由稳定的二维种子生成，图案不受视口宽高改变。每块预留 32 单位模糊冗余，并额外预绘视野四周一圈；新块在 useLayoutEffect 中于显示前完成绘制，已有块在拖动时不重绘。位图采用最高半分辨率并按缩放降采样，释放离开的块；极远总览超过 144 块时省略细微投影，避免无限分配画布。墙面以 overflow: clip 裁切，避免聚焦控件引起原生滚动，使镜头位置只由世界变换控制。

### Shadow Vocabulary

- **Paper**：`2px 7px 13px -7px #6b624455, 0 2px 3px -2px #6b624434`。
- **Floating Action**：`0 6px 22px -8px #7d633765`。
- **Camera**：`0 5px 18px -9px #6b624450`。
- **Dialog**：`0 16px 70px -24px #34382c88`。
- **Placement**：`0 14px 32px -12px #4d4f3b65`。

**The Soft Paper Rule.** 阴影表达材料离墙的细微距离，保留柔边与扩散。

**The World Light Rule.** 日光投影固定在二维墙面坐标，与便签共用世界变换；提前绘制分块，拖动时不异步追赶，视口尺寸不改变图案。

**The Saved Position Rule.** 纸张的手作感来自纸材、胶带与访客放置；刷新不重抽倾角或错位，不把 ID 随机姿态再叠加到碰撞几何上。

## Shapes

纸张沿用不对称 `paper` 小圆角与直边。胶带 52×21，位于上缘外 9px、中央轻转 −4°，80% 不透明度。面板和主按钮 8px 圆角、普通控件 6px、提示标记 4px，色样为圆形。

图标采用内联几何 SVG，常用 20px、1.6 线宽、圆端与圆连接。相片以暖白纸边包住图像，左右和上方 12px、底部留出更宽空白，图像 contain 保留完整比例。

## Components

### Buttons

主要操作使用姜黄按钮，最小高度 46px；普通按钮最小高度 42px。悬停变色，禁用 50% 不透明度；可见焦点 2px 深麦色外描边、4px 偏移。关闭按钮为有可访问名称的 SVG。编辑/预览、文字/画笔使用 `aria-pressed` 与浅绿底、深墨、内描边共同表达选择。

### Cards / Containers

便签可键盘聚焦和选中，选中时加轮廓。纸色独立于内容主题；署名和「我的」标记在纸底。纸张尺寸固定，纸面超出内容被边缘裁切；编辑预览用于调整文字布局，墙上直接阅读纸面内容。相片只能附着自己发布的非相片便签。

### Inputs / Fields

文字直接输入到透明宋体文字块，选中时虚线轮廓，移动柄支持拖动与方向键（Shift 加速）；可调字号、墨色和宽度。纸张缩放时同步缩放内容坐标。四枚纸色色样有可访问名称和勾选反馈。尺寸、字号、笔宽、文字宽度使用原生 range，墨色使用原生 color，署名使用底线字段。总量校验和错误显示在控件栏，下一步对空稿、超字数与过长署名禁用。

### Navigation

墙本身可聚焦：方向键移动镜头，Home 回到便签区域；放置阶段方向键移动草稿，Enter 提交，Escape 退出。内部链接保留原生键盘激活。相机控制与便签操作条保持高于投影。

### Writable Paper / Placement

文字和 SVG 涂鸦共享纸面，预览使用与墙上一致的渲染器。放置区通过背景明暗和原点圆提示空间范围，可贴区域透明、不可贴区域压暗，不以色块或条纹覆盖可贴处，纸张 ghost 带轮廓与可读状态标记；只有最终确认才创建记录。普通叠笺从自己的原纸下半部开始，相片可在原纸任意重叠处附着，均不能全盖原纸。

编辑入场为 200ms `cubic-bezier(.16, 1, .3, 1)`、向下 12px 归位；ghost 轮廓和阴影过渡为 150ms ease，闲置时以 750ms ease-in-out 循环轻抖（旋转±0.8°、上移至多2px）；按住拖动时停止并归正，松手后恢复，仅在未请求减少动态效果时开启。失败保留草稿，localStorage 保存为尽力行为。

## Do's and Don'ts

### Do:

- **Do** 延续原纸纹、四纸色、宋体、胶带和柔影。
- **Do** 保持已发布坐标与相对位置，手机通过镜头探索同一空间。
- **Do** 用文字、形状与颜色共同说明选中、可贴、无效和错误状态。
- **Do** 保留清楚焦点、原生链接行为、移动柄键盘操作与固定下一步。
- **Do** 准确区分无限坐标空间和当前整墙数据加载的规模限制。

### Don't:

- **Don't** 恢复分类筛选、固定 6/9/12 行容量、自动双列或按时间重新布局。
- **Don't** 以随机重排、浓重纹理、大圆角或硬阴影取代纸张材料。
- **Don't** 让相片归属依赖署名，或用未标注的演示留言制造可信度。
- **Don't** 将纸面裁切误写成自动增高或承诺无限图片容量。
