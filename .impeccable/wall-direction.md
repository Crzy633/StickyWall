# 公共留言墙 / 首页

Scope: `/`、分类筛选、发布纸笺、历史分页。Visitor mode: Experience，发布行为使用 Operate 的清晰反馈。用户已确认名称、四类、匿名与可选昵称，以及按已呈现方案直接实现。

## Direction contract

THESIS: 一面午后窗边的真实留言墙，文字是主角，纸张有轻微个性。拒绝信息流密度和社交指标。

OWN-WORLD: 暖白墙面，黄、粉、绿、蓝四种低饱和纸色，深橄榄棕墨色，姜黄发布按钮。宋体标题与清晰无衬线控件；便利贴小圆角、轻胶带、柔和偏移阴影。

STORY: 访客先读陌生人的生活，再决定留下些什么；不注册、不点赞。分类多选，不打乱时间。新留言只通知，主动揭开。

FIRST VIEWPORT: 轻量品牌栏与右侧「贴一张」；短标题和安静说明在上部，分类控件贴近双列留言墙，首屏看见两张完整纸笺及下一行的开端。墙宽约 800px，左右留白；手机收成单列。

FORM: 午后窗边（用户在概念抽选前已确认的方向，优先于随机候选）；纸材、次序与状态全部服务原需求。seed:948a9308f14ecef9。App 直接从代码构建，不采用效果图先行；此轮选择不写成未来默认。

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Signature interaction: 点「贴一张」展开一张可写的彩色纸笺；成功后纸笺归入墙顶。正在阅读时出现的新留言不会插入或推动页面。

Open decisions: 无阻塞项。样例只主动导入本地，并显示来源标记。
