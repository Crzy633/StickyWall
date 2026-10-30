# Go 服务

Go 1.25+，PostgreSQL 15+。唯一直接依赖为 `pgx/v5`，HTTP 路由使用标准库。

```powershell
$env:DATABASE_URL = 'postgres://stickywall:password@localhost:5432/stickywall?sslmode=disable'
$env:BIND_HOST = '127.0.0.1'
go run .
```

启动时执行内嵌 `schema.sql`：幂等建表/索引，补充 `paper_size`、JSONB `layout`、`owner_hash`，调整文字字段约束。仅为 `layout IS NULL` 的旧记录生成一次固定坐标和纸色，保留内容；已存在布局不重新计算，无归属的旧记录不认领。不删除数据、不自动插入示例。生产数据库使用 TLS；`sslmode=disable` 仅用于本地或可信容器网络。

| 环境变量 | 默认值 | 用途 |
| --- | --- | --- |
| `DATABASE_URL` | 必填 | PostgreSQL DSN |
| `PORT` | `8080` | HTTP 端口 |
| `BIND_HOST` | 空（所有接口） | 本机开发设 `127.0.0.1`，容器部署保留默认 |
| `STATIC_DIR` | `../web/dist` | 相对进程工作目录的前端构建目录 |
| `POSTS_PER_MINUTE` | `6` | 单个连接来源 IP 每分钟最多发布数 |
| `DATABASE_TEST_URL` | 空 | 独立随机 schema 的集成测试数据库 |

限流只信任 TCP 连接来源，不接受 `X-Forwarded-For`。反向代理应在可信代理层面向真实客户端限流；本服务仍受代理来源限额约束，可调整 `POSTS_PER_MINUTE`。

## API

API 禁止缓存；错误为 `{ "error": "适合直接显示的中文提示" }`。请求处理超时 5 秒，发布 JSON 请求体最多 6MiB。

- `GET /api/health`：数据库可用返回 `{ "status": "ok" }`，不可用返回 503。
- `GET /api/notes?limit=50&cursor=...`：返回 `{ notes, nextCursor, headCursor, total }`。`limit` 范围 1–50，默认 12；`nextCursor: null` 为末页。仍兼容 `categories=daily,joy`，省略即全部。`total` 和 `headCursor` 对应该分类范围，与当前分页位置无关。
- `GET /api/notes/updates?after=...&categories=...`：返回 `{ count }`；统计比游标新的留言，省略 `after` 统计全部。此兼容端点保留，新版前端每 15 秒直接分页读取整墙并合并。
- `POST /api/notes`：`Content-Type: application/json`；新版请求 `{ content: "", author?: "", layout: {...} }`，成功 201 返回新留言。省略分类时写入兼容值 `daily`，新版 `paperSize` 固定为 `auto`，纸色由 `layout.color` 独立决定。字段不合法 400、请求体超限 413、发布限流 429、位置/归属冲突 409、存储不可用 503。

留言字段：`{ id: string, content, category, author, paperSize, createdAt, layout, mine: boolean }`。ID 字符串避免 JavaScript 精度丢失，时间来自数据库。API 仍按 `created_at DESC, id DESC` 游标分页；该传输顺序不决定墙上坐标。`owner_hash` 不返回客户端。

### 布局与内容

```json
{
  "x": -160, "y": -160, "width": 320, "height": 320,
  "color": "yellow", "kind": "note",
  "texts": [{ "x": 28, "y": 38, "width": 264, "size": 21, "color": "#474b3e", "text": "你好" }],
  "strokes": [{ "color": "#474b3e", "width": 3, "points": [[20, 20], [21, 21]] }]
}
```

`layout` JSONB 保存完整布局。坐标、尺寸、文字字号、笔画坐标须是有限数；宽 160–560、高 160–640，纸色为 `yellow / green / pink / blue`。文字块最多 100，位置须在纸内，宽至少 20，字号 12–48，墨色为 `#RRGGBB`；内容字段和所有文字块合计最多 10000 个 Unicode 字符，无固定行数限制。笔画最多 300，总点数 30000，点在纸内，笔宽 1–20。署名去首尾空白后最多 24 字；空正文须至少有非空文字块或笔画。文本中不允许无法显示的控制字符，保留换行与制表符。

普通叠笺提供 `parentId`。相片为 `kind: "photo"`、附 `parentId` 和 `image: "data:image/png;base64,..."` 或 JPEG data URL；客户端限制原文件不超过 3MiB，服务端校验对应 base64 长度、解码格式、单边不超过 12000 像素、总像素不超过 40000000。图片随 JSONB 及列表响应传输，不使用独立文件服务。

前端安全渲染 Markdown 子集（粗体、斜体、删除线、三级标题、列表、引用、行内/围栏代码、HTTP(S) 链接），原始 HTML 不执行。此为客户端排版能力，服务端保存原文字与样式，客户端不能提交可执行 SVG/HTML；涂鸦由结构化笔画生成 SVG。

### 空间与并发

- 首张便签中心须在原点半径 100 内；首张不能是相片或叠笺。
- 普通新纸与其它纸不重叠，矩形边缘欧氏距离至少 16；与至少一张既有纸的间距不超过双方宽高中最小值的一半，使新增布局连接到已有纸片。
- 普通叠笺只能附着自己发布的非相片便签，顶边从父纸下半部开始，必须重叠且不得完全覆盖父纸。相片可附着自己原纸的任意重叠位置，也不能全盖父纸。父纸与其祖先允许重叠，其余纸仍须避让至少 16。
- `Create` 在事务内取得 PostgreSQL advisory transaction lock `73190421`，读取最新布局和归属，执行空间校验后插入。校验和写入串行化；同位置并发发布不会共同成功，冲突 409。前端预览仅作提示，服务端是最终裁决。

### 匿名归属

API 使用 `wall_visitor` 随机令牌 cookie：`HttpOnly`、`SameSite=Strict`、`Path=/`、有效期 400 天；HTTPS 请求或 `X-Forwarded-Proto: https` 时带 `Secure`。数据库仅保存 SHA-256 散列，响应通过 `mine` 表达是否属于本次浏览器。清除 cookie、换浏览器或令牌失效不能继承归属；同名署名不代表同一访客。反向代理应正确设置 HTTPS 转发协议。

### 旧客户端兼容

未传 `layout` 时仍接受 `{ content, category, author?, paperSize? }`：文字 1–500，分类 `daily / joy / thoughts / wishes`，纸型 `auto / small / medium / large`；`small / medium / large` 仅在这个旧入口保留 6/9/12 显式换行校验。服务端为旧入口分配固定位置：首张居中，后续放到当前最右纸右侧 40；同样进入事务位置校验，不改变已存在坐标。新版界面不展示分类、纸型与固定行数。

## 规模与持久化

JSONB 中的坐标与内容持久化，启动不会重排已保存布局。当前客户端按 50 张连续读到末页，包括图片，每 15 秒重读并按 ID 合并；只限制视野附近的 DOM 渲染。服务端新建校验也读取整墙布局（含图片字段），在锁内遍历。大墙及大量大图片会增加传输、内存、数据库和校验成本；无限墙表示坐标空间可增长，不保证无限数据容量。进一步扩展应考虑空间索引、可视区分页和独立图片存储。

## 检查

```powershell
go test ./...
$env:DATABASE_TEST_URL = $env:DATABASE_URL
go test ./... -count=1
go vet ./...
```

数据库集成测试在独立随机 schema 内运行，不修改已有留言；检查包括迁移不重排、布局与归属持久化、位置规则和并发冲突，同时保留旧分类、分页与纸型兼容测试。前端构建后由 Go 同源提供静态文件；不存在的 API 不回退 HTML，点文件不可访问，Vite 哈希资源长期缓存，HTML 要求重新验证。
