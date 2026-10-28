---
name: "日光留言墙"
description: "暖阳、纸笺与舒适留白组成的公共留言墙。"
colors:
  wall: "#f1ecde"
  ink: "#474b3e"
  muted-ink: "#606651"
  filter-neutral: "#f4efdfeb"
  button-sun: "#edc36f"
  button-sun-hover: "#e8b954"
  button-ink: "#554323"
  publish: "#626e4e"
  publish-hover: "#505e3d"
  publish-ink: "#fffef3"
  paper-yellow: "#f6e8af"
  paper-green: "#e2e9d4"
  paper-pink: "#f2ddd7"
  paper-blue: "#dce9e9"
  yellow-ink: "#6d5c2e"
  green-ink: "#546245"
  pink-ink: "#75504b"
  blue-ink: "#496563"
  daylight-ink: "#52604b"
  yellow-tape: "#ddcc99"
  green-tape: "#bbc8a3"
  pink-tape: "#dbbdb4"
  blue-tape: "#b4cbca"
  focus: "#8a6629"
  error: "#9a382e"
typography:
  title:
    fontFamily: "'Sunlit Serif', 'Noto Serif SC', 'Songti SC', 'SimSun', serif"
    fontSize: "22px"
    fontWeight: 400
    lineHeight: 1.8
  body:
    fontFamily: "'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.6
  note:
    fontFamily: "'Noto Serif SC', 'Songti SC', 'SimSun', serif"
    fontSize: "19px"
    fontWeight: 400
    lineHeight: 1.9
    letterSpacing: "0.035em"
  note-long:
    fontFamily: "'Noto Serif SC', 'Songti SC', 'SimSun', serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.9
    letterSpacing: "0.035em"
  writing:
    fontFamily: "'Noto Serif SC', 'Songti SC', 'SimSun', serif"
    fontSize: "19px"
    fontWeight: 400
    lineHeight: "36px"
    letterSpacing: "0.035em"
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
  label-selected:
    fontFamily: "'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.6
  caption:
    fontFamily: "'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.6
rounded:
  paper: "2px 3px 5px 2px"
  dialog: "4px"
  control: "6px"
  primary: "8px"
  floating: "12px"
  circle: "50%"
spacing:
  control-gap: "8px"
  content-gap: "24px"
  page: "40px"
  page-mobile: "29px"
  wall-column: "58px"
  wall-row: "44px"
  wall-row-mobile: "33px"
components:
  button-primary:
    backgroundColor: "{colors.button-sun}"
    textColor: "{colors.button-ink}"
    typography: "{typography.control}"
    rounded: "{rounded.primary}"
    padding: "10px 22px"
  button-primary-hover:
    backgroundColor: "{colors.button-sun-hover}"
  button-floating:
    backgroundColor: "{colors.button-sun}"
    textColor: "{colors.button-ink}"
    typography: "{typography.control}"
    rounded: "{rounded.floating}"
    padding: "12px 23px"
  button-publish:
    backgroundColor: "{colors.publish}"
    textColor: "{colors.publish-ink}"
    rounded: "{rounded.primary}"
    padding: "7px 12px"
  button-publish-hover:
    backgroundColor: "{colors.publish-hover}"
  button-retry:
    backgroundColor: "#e9ebdc"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "11px 19px"
  button-retry-hover:
    backgroundColor: "#dfe3ce"
  filter-yellow:
    backgroundColor: "#f2e7be"
    textColor: "{colors.yellow-ink}"
    typography: "{typography.label-selected}"
    rounded: "{rounded.control}"
    padding: "5.5px 9.5px"
  filter-unselected:
    backgroundColor: "{colors.filter-neutral}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "5.5px 9.5px"
  note-yellow:
    backgroundColor: "{colors.paper-yellow}"
    textColor: "{colors.ink}"
    typography: "{typography.writing}"
    rounded: "{rounded.paper}"
    padding: "28px 28px 21px"
    width: "100%"
  note-green:
    backgroundColor: "{colors.paper-green}"
    textColor: "{colors.ink}"
    typography: "{typography.writing}"
    rounded: "{rounded.paper}"
    padding: "28px 28px 21px"
    width: "100%"
  note-pink:
    backgroundColor: "{colors.paper-pink}"
    textColor: "{colors.ink}"
    typography: "{typography.writing}"
    rounded: "{rounded.paper}"
    padding: "28px 28px 21px"
    width: "100%"
  note-blue:
    backgroundColor: "{colors.paper-blue}"
    textColor: "{colors.ink}"
    typography: "{typography.writing}"
    rounded: "{rounded.paper}"
    padding: "28px 28px 21px"
    width: "100%"
  input-author:
    backgroundColor: "transparent"
    textColor: "{colors.yellow-ink}"
    rounded: "0"
    padding: "6px 0"
  input-note:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.writing}"
    rounded: "0"
    padding: "0"
    height: "324px"
  composer-yellow:
    backgroundColor: "{colors.paper-yellow}"
    textColor: "{colors.ink}"
    rounded: "{rounded.paper}"
    padding: "28px 28px 21px"
    width: "280px"
  paper-size:
    backgroundColor: "#f4efdf"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    height: "36px"
  paper-size-selected:
    backgroundColor: "#e2e8d5"
    typography: "{typography.label-selected}"
---

# Design System: 日光留言墙

## Overview

**Creative North Star: "午后窗边"**

暖米色纸纹墙面承接低饱和纸色，宽阔斜向阴影与疏散枝叶投影一起落在墙面和纸笺上，随向下阅读展开新的午后光线，橄榄棕墨色让中文保持安静而清晰。宋体标题、轻胶带与柔软纸影延续用户确认的「暖阳治愈系 · 自然简约 · 轻手作感」。舒适留白为文字留出停顿，页面直接从分类与留言开始。

手作感来自稳定的偏转、错位、不同纸张尺寸和低对比真实纸纹。纸笺像随手贴上墙，仍按发布时间倒序阅读。控件保持清楚、直接；右下角「贴一张」展开可写的彩色纸笺，既延续材料，也保留常规表单的反馈。

**Key Characteristics:**
- 真实纸纹、跨越墙面与纸笺的连续投影、四种低饱和纸色。
- 宋体表达情绪，无衬线承担操作与辅助说明。
- 轻胶带、小圆角、柔和纸影组成可复用的纸笺语言。
- 疏朗双列在手机收成单列，阅读次序保持稳定。
- 轻量动效与清楚焦点共同支持安静操作。

## Colors

色彩像自然光中的纸张：底色柔和，正文墨色沉稳，行动以姜黄和苔绿提示。

### Primary
- **姜黄日光**：`button-sun` 用于右下角浮动发布按钮，`button-ink` 保持按钮文字可读。
- **苔绿行动**：`publish` 与 `publish-ink` 用于纸笺内的提交动作，悬停采用对应的深色变体。

### Secondary
- **麦芽黄纸 / 嫩叶绿纸 / 浅陶粉纸 / 雾水蓝纸**：四种 `paper-*` 对应四类留言；分类墨色与胶带分别采用同名 `*-ink`、`*-tape`。分类可见文字与圆点同时表达类别。

### Neutral
- **暖米色墙面**：`wall` 是纸纹背景的底色，上叠暖色径向光晕与真实纸纹。
- **橄榄棕墨 / 灰橄榄辅助墨**：`ink` 用于正文，`muted-ink` 用于空状态与分页区域；纸笺辅助文字采用各自的分类墨色。
- **米色标签底**：`filter-neutral` 仅用于未选中分类按钮自身，保持标签清晰，按钮间继续露出墙面和纸笺。
- **深麦焦点 / 砖红错误**：`focus` 用于键盘焦点，`error` 用于长度校验和发布错误。
- **灰绿投影**：`daylight-ink` 绘制宽阔斜边与不规则枝叶投影，以低不透明度正片叠底覆盖墙面和纸笺。

**The Paper and Ink Rule.** 纸色只负责材料与类别；正文保持主墨色，辅助说明使用已建立的深色墨，不通过降低文字透明度制造轻盈。

## Typography

**Display Font:** 自托管 Sunlit Serif，后接中文宋体栈。

**Body Font:** Noto Sans SC、PingFang SC、Microsoft YaHei 与系统 sans-serif 回退栈。

**Character:** 自托管标题字体现有中文子集，来源及 OFL 许可记录在 `web/public/fonts/README.txt`；超出子集的字符由宋体回退承接。留言正文直接使用系统中文宋体，操作说明保持无衬线。

### Hierarchy
- **Title**：可见空状态标题采用 `title`；发布纸笺的标题仅供辅助技术读取。
- **Body**：空状态说明采用 `body`。
- **Writing**：新纸型与发布器采用 `writing`，固定 36px 行高；字号为有效正文宽度 / 224 × 19，最大 19px，随纸宽同步缩放。
- **Note**：旧 auto 留言采用 `note`，超过 180 个 Unicode 字符采用 `note-long`；保留换行，长串可在任意位置换行。
- **Control / Label / Caption**：主按钮、分类与辅助文字分别采用相应角色；纸笺类别与署名为 10px，日期为 9px，沿用深色分类墨与舒展行高。

**The Two Voices Rule.** 宋体留给纸笺标题与留言，无衬线负责控件和辅助信息；不引入第三种装饰性字体。

**The Fixed Lines Rule.** 新纸型与编辑器共用 36px 行高和按有效宽度缩放的字号，所选行数决定书写容量；输入超量时保留旧稿，发布后的正文自然增高，不以裁字或内部滚动兜底。

## Layout

墙体主容器最大宽 880px，桌面水平内边距使用 `page`，顶部外边距 48px。顶部仅保留分类，分类区与纸笺间距 42px；不展示说明、计数、排序文案或分隔线。分类菜单保持当前坐标吸顶，桌面距视口顶部 48px、手机 25px，z-index 为 3，纸笺从菜单下方经过。菜单容器透明，不加整片背景、渐隐遮罩或模糊；分类纸色只用于选中小控件，未选中按钮仅使用米色标签底，按钮之间继续露出纸笺。纸笺与重试操作的滚动定位为菜单预留空间：桌面 104px、手机 123px，389px 及以下为 165px；这只调整 scroll-margin，不改变菜单坐标。

留言区桌面两列，列距使用 `wall-column`，行距使用 `wall-row`，网格左右另留 12px。新纸笺占满所在列，保留所选纸型的最小正文区域：短笺 6 行、方笺 9 行、长笺 12 行，分别为 216px、324px、432px。旧 auto 纸笺宽为所在列的 82%–94%，最小高度为 232px–296px。所有纸笺各自下移 0px–54px，偶数纸笺再下移 92px，姿态由稳定 ID 生成；内容增长时自然增高，不裁切正文。保持 DOM 中的时间倒序和普通行网格，不以 masonry 或 CSS 重排改变阅读顺序。

651px–800px 时，纸笺转角与水平错位均乘以 0.65。650px 及以下主容器最大宽 470px，水平内边距使用 `page-mobile`，顶部外边距 25px，分类后间距 28px；纸笺变单列、行距使用 `wall-row-mobile`，网格左右内边距 5px。新纸型继续占满所在列、内边距 28px 28px 21px；旧 auto 单列纸宽为原宽与 100% 的平均值，即 91%–97%，内边距为 28px 26px 23px。转角乘以 0.65，水平错位乘以 0.55，取消偶数项额外下移并保留各自的下移量。分类「全部看看」另占首行，分类按钮自然换行；370px 及以下主容器改为 24px 内边距。

发布按钮固定在右下角：桌面距下 30px、右距至少 28px；手机距右 18px、距下 20px。手机新留言提示与成功反馈距下 86px，留言区底部预留 120px，保持浮动操作互不遮挡。没有页脚、常规分页按钮或结束提示；底部标记接近视口 800px 时自动预取下一页。加载中显示「正在拾起更多纸笺…」，失败保留已有纸笺并显示错误和「重试加载」；末页移除标记。状态区最小高度 56px、上方内边距 24px。

发布对话框宽度为 `min(280px, calc(100% - 32px))`，最大高度为 `calc(100dvh - 32px)`；顶部另留 12px。尺寸选项放在纸外上方，纸内分类在顶部，正文居中，署名与发布操作分居左下和右下。纸张水平内边距均为 28px，标准正文宽 224px。矮屏或键盘出现时可在外层对话框原生滑动整张纸，隐藏弹窗额外滚动条，不添加自定义拖拽轨道；form 与 textarea 不形成独立滚动区。根页面原有滚动条保持不变。

## Elevation & Depth

根容器承载底色、暖色径向光晕和 360px 方形重复纸纹，纸纹混合模式为 multiply，持续覆盖整篇长墙。根容器使用 flow-root 保留顶部间距，isolation 将纸纹、纸笺和投影放在同一混合范围。纸纹来自 ambientCG Paper001，CC0 来源记录在 `web/public/images/paper-texture.LICENSE.txt`，资产元数据随 `paper-texture.webp.json` 保存。

投影层绝对定位在文档中，使用 `daylight-ink`、multiply 混合与 16% 整层不透明度，和纸笺一起由浏览器原生滚动。投影空间按 1800px 文档分段，依据绝对分段序号生成稳定而各异的宽阔斜边与不规则枝叶簇。每段只有一条或两条平行斜向阴影，双边间距 340px–580px，不形成封闭窗格或十字格，也不循环平铺同一张光影图。

纸影使用低对比、柔边的双层阴影；胶带以 65% 不透明度叠在纸上。发布纸笺沿用相同纸影，由半透明暗色背幕分层；固定的新留言提示、状态反馈与发布按钮使用中等阴影。

### Shadow Vocabulary
- **Paper**：`2px 7px 13px -7px #6b624435, 0 2px 3px -2px #6b624424`；留言纸笺、加载纸张与发布纸笺。
- **Notice**：`0 5px 24px -8px #34382c55`；新纸笺提示与发布成功反馈。
- **Floating Action**：`0 6px 22px -8px #7d633765`；固定的「贴一张」按钮。

**The Soft Paper Rule.** 阴影表达纸张离墙的细微距离，保留柔边与扩散；不扩展为硬边偏移阴影。

**The Stable Paper Rule.** 纸笺姿态由 ID 的稳定混合散列决定：基础转角 −4° 至 4°、水平错位 −22px 至 22px。超过 80 字时转角与错位乘以 0.65，超过 180 字时乘以 0.4；换行超过 10 个时转角归零。新纸型的转角与错位再乘以 4 / 行数：短笺 2/3、方笺 4/9、长笺 1/3，避免高纸边角扫到邻列；旧 auto 保持原姿态。刷新和筛选不重抽姿态，随手张贴的外观始终服从时间倒序与正文可读性。

**The Continuous Light Rule.** 投影与纸笺处于同一文档平面，由原生滚动同步移动；不按纸笺单独装饰、不循环同一光影，也不随时间自行漂移。宽阔斜边保留大面积呼吸空间，分类、分页与发布操作保持在投影之上。

## Shapes

纸笺与发布纸笺都沿用 `paper` 的不对称小圆角，保留纸张直边。常规按钮使用 `primary` 或 `control`，不把纸张改成大圆角卡片。圆形用于分类色点和关闭按钮。

胶带基本尺寸为 52px × 21px，位于纸笺上缘之外 10px；三种位置分别在中部、左侧和右侧，保留轻微转角。太阳、加号、箭头、关闭、勾选与重试图标均为统一的内联几何 SVG，线宽 1.6、圆端与圆连接；图标不承担大幅插画。

## Components

### Buttons

主按钮温暖而明确，基础最小高度 44px；右下角浮动发布按钮使用姜黄、12px 圆角、50px 最小高度，手机为 48px。纸笺右下角「贴上墙」使用苔绿、12px 字号与 36px 最小高度。悬停在 180ms ease 内改变背景并上移 1px，按下归位。键盘焦点使用 2px 深麦色外描边、5px 偏移。禁用时光标为不可用并使用 52% 不透明度。

自动分页失败时才显示浅绿实底「重试加载」，使用 44px 最小高度和重试 SVG；空状态动作沿用同一安静按钮语言。常规阅读不需要点击分页按钮。

### Chips

分类使用原生 radio 保留按钮外观，单选「全部看看」或其中一类；默认全部，发布成功后恢复全部。重复点击已选项不取消，方向键使用原生单选切换；分类改变时立即回到墙顶。选中时使用对应纸色、1.5px 深色描边、600 字重和勾号，全部选项同样明显；未选中项使用米色标签底，分类保留 7px 深色圆点，悬停加下划线。勾号与圆点共用 12px × 14px 图标位，不只凭颜色表达选择。原生 checked 状态同步选择，键盘焦点在可见标签上呈现。桌面 12px 字号、36px 最小高度；手机 11px，保留高度。

自动分页通过单个请求锁防止并发加载；切换分类取消旧请求并校验请求版本，追加按稳定 ID 去重，保持游标顺序和已有纸笺位置。失败后暂停自动重试，由访客点击重试。

### Cards / Containers

留言纸笺采用四种纸色、主墨正文与分类墨辅助文字；新纸型保留 6/9/12 行的最小书写区，旧 auto 纸笺保留随机宽高，下移量与姿态继续独立变化，边角、纸影和胶带保持同一材料语言。类别在上，正文自然伸展，署名和日期在下；跨设备换行较多时纸张自然增高，不裁字、不内部滚动，不加社交计数。

### Inputs / Fields

正文直接写在纸上：透明底、无字段边框、零内边距、顶部间距 20px，采用 `writing` 的宋体、固定行高与按宽度缩放的字号。textarea 高度固定为所选 6/9/12 行，不可拉伸、不内部滚动。左下署名输入为 10px，前置破折号，与纸笺落款对应；占位文字为「署名（选填）」。正文与署名聚焦时以下划线反馈，不画外框。分类位于纸笺顶部的类别位置，使用 10px 小标签、原生 select 与向下箭头。占位文字使用分类墨，保持完整不透明度；右对齐显示「已用/总行数 · 字数」，容量与错误提示仅在需要时出现。字段标签与昵称限制保留为仅供辅助技术读取的文字。

容量由同宽、同字体、同行高的隐藏排版镜像测量，末尾零宽字符保留空白末行。最多 500 个 Unicode 字符；写满后的新增输入或整段超量粘贴整体拒绝，保留既有稿与选区。输入法组字结束后才校验，缩小纸型装不下时保留原尺寸与原稿。

### Navigation

页面保留跳到留言墙链接，仅在键盘聚焦时显现为黄纸底。

### Writable Paper

发布器是一张正在填写的真实纸笺，沿用纸色、胶带、边角和纸笺内边距；切换顶部分类会同步整张纸的材料与墨色。纸外上方三个原生单选小按钮选择短笺 6 行、方笺 9 行、长笺 12 行，默认方笺；按钮最小高度 36px、间距 8px，与纸张间隔 20px，选中使用浅绿纸底、深绿描边和 600 字重。没有可见标题、介绍、选色说明、昵称帮助或底部公开说明。关闭后保留草稿；错误时保留文字。根页面使用 `overflow-y: scroll` 保持原生垂直滚动条；发布器不锁背景滚动，不修改 body 的 overflow，也不计算补偿边距，打开与关闭时纸墙、菜单和浮动按钮的位置保持稳定。入场为 300ms、`cubic-bezier(.16, 1, .3, 1)`，从向下 12px、−1° 与 70% 不透明度归位。加载纸张使用 2s ease-in-out 呼吸；开启减少动态效果时关闭所有动画、过渡和顺滑滚动。

### Shared Daylight

投影层为 z-index 2，忽略指针事件并从辅助技术中隐藏。分类和分页为 z-index 3，浮动发布为 4，原生对话框位于顶层，保持操作清楚。Canvas 按 1280px 高度分块，每边预留 32px 绘制出血，9px 模糊位于裁切容器内部，最后一块裁切至文档实际高度。

根容器尺寸由 ResizeObserver 跟踪；IntersectionObserver 预取上下 1280px 内的画布，每块靠近视口时绘制一次，远离后将位图释放为 0×0，保留容器布局尺寸。画布使用普通 CSS 像素分辨率，宽度变化才使已有绘制失效；没有滚动监听、依赖滚动位置的重绘或持续动画帧循环。卸载时清理观察器和位图。

## Do's and Don'ts

### Do:
- **Do** 用低对比纸纹墙面、柔和窗影、四种纸色与深色墨建立层次。
- **Do** 保留稳定的小幅倾斜、柔和纸影和轻胶带。
- **Do** 让中文正文自然换行、自然长高，保留舒适行距。
- **Do** 在手机保留完整发布、筛选和键盘焦点反馈。
- **Do** 让图标延续同一组几何 SVG 与线条语言。

### Don't:
- **Don't** 用大圆角、强对比硬阴影或浓重纹理替代纸张材料。
- **Don't** 用淡化辅助文字来营造轻盈，也不只凭颜色表达分类。
- **Don't** 把界面扩成强调社交指标的高密度信息流。
- **Don't** 用虚构评价、访客指标或未标注的演示留言制造可信度。
- **Don't** 把每次刷新时的随机重新排布当作手作感。
