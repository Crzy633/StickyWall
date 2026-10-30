---
version: 1
slug: "web-src-app-tsx"
primary_target: "web/src/App.tsx"
related_targets: ["web/src/Editor.tsx", "web/src/Paper.tsx", "web/src/PlacementArea.tsx", "web/src/wall.ts", "web/src/styles.css", "web/src/SunlightLayer.tsx"]
---

# 公共留言坐标墙 / 首页

Scope: `/`、镜头探索、自由纸面编辑、手动放置、自己的便签叠贴和相片附着。Visitor mode: 墙为 Experience，编辑和放置为 Operate。用户六条新规则明确替换旧分类、固定行数、时间排序与自动列布局；品牌延续原方向，无需概念抽选。

## Direction contract

THESIS: 一面午后窗边的真实留言墙，纸张占据可以探索的空间，位置由访客亲手确认并永久保存。文字与生活痕迹是主角，控件服务阅读和放置。

OWN-WORLD: 暖米纸纹、黄绿粉蓝四纸色、橄榄棕墨、姜黄主操作；宋体、轻胶带、小圆角与柔影。复用原 ambientCG Paper001 CC0 纸纹，没有生成或替换位图素材。疏朗日光投影固定于墙面二维坐标，与便签共用世界变换；分块提前绘制，拖动时不异步追赶，不参与便签碰撞几何。

STORY: 先拖动镜头看看陌生人留下的生活，再决定写或画一张；无需注册，署名可选。自己发布的便签允许从下半部叠贴新纸，也可附着白边相片；cookie 决定归属，署名不认领。新纸每 15 秒合并到墙上，原坐标不动。

FIRST VIEWPORT: 自由纸笺占据空间，名称左上、镜头控件左下、「贴一张」右下。取消分类和自动双列，手机通过同一镜头探索同一坐标。空墙显示原点半径 100 圆与首张入口。镜头支持拖动、滚轮、双指缩放，边界外 1000 约束和空白防丢失；镜头控件仅保留缩放按钮和比例。点击便签不打开阅读窗口，只有自己的便签显示附近的叠贴与贴相片操作条。

FORM: 午后窗边；保留原 seed:948a9308f14ecef9。精确用户请求直接实现，不做概念抽选。本轮记录只约束此 surface 的当前实现。

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

Signature interaction: 桌面两栏编辑器，手机上下结构，固定下一步。自由选四纸色与宽160–560/高160–640；纸面添加文字块、拖动或键盘移动、调字号/墨色/宽度，SVG 涂鸦，安全 Markdown 子集，编辑/预览一致。没有固定行数；总文字10000、文字块100、笔画300、点30000、署名24。预览纸面为固定尺寸，必要时调整排版；墙上直接阅读纸面内容。

Placement: 下一步进入墙面，可贴区域保留原背景，不可贴区域用40%深色遮罩压暗；去除绿色斜线，红绿 ghost 加文字状态。当前待贴便签始终高于遮罩且完全不透明，闲置轻抖，拖动归正、松手恢复；减少动态效果时关闭抖动。点击/拖动设置位置，松手保持，返回编辑、取消与确认移到待贴便签旁，取消底部提示窗口，状态保留在纸边；再点「贴在这里」确认；方向键微调，Alt拖动镜头。按住待贴便签到屏幕边缘自动平移，越近越快，便签保持跟手；离开、松手、退出或失焦停止，始终遵守镜头边界。第一张中心在原点半径100内；普通新纸不重叠、至少16间隔，并邻接至少一纸（距离不超过双方宽高中最小值的一半）。普通叠笺从自己原纸下半部起贴；相片可任意位置附着自己原纸；均不全盖原纸，非祖先仍留16。

Persistence: JSONB 保存全部布局、内容与图片。启动迁移仅为 layout NULL 的旧纸分配固定坐标，已有坐标不重排。HttpOnly SameSite=Strict cookie 识别所有权；清除cookie或换浏览器不继承。事务锁内校验位置、归属与并发，冲突409；失败保留草稿，localStorage尽力保存。

Scale: 客户端当前以50张分页取完整墙，图片随layout一起读取，每15秒重读合并；只有DOM限制到视野附近。网络、内存、图片传输与服务端整墙发布校验均有规模限制，「无限」仅描述可增长的坐标空间。

Review record: 独立 finish review 要求修复两项：纸张 article 不得拦截内嵌链接 Enter；编辑器关闭符号统一为有可访问名称的 SVG。两项均已修复并回归，独立 review disposition 为 ship（仅针对修复评分）；desktop、mobile、mobile-editor 截图已覆盖。前端 build、14项前端测试、Go集成测试与vet通过。

Open decisions: 无阻塞项。样例只主动导入并标记来源。设计 token 与完整规范见根 DESIGN.md，扩展与预览 snippet 见 .impeccable/design.json。
