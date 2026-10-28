# Go 服务

Go 1.25+，PostgreSQL 15+。唯一直接依赖为 `pgx/v5`，HTTP 路由使用标准库。

```powershell
$env:DATABASE_URL = 'postgres://stickywall:password@localhost:5432/stickywall?sslmode=disable'
$env:BIND_HOST = '127.0.0.1'
go run .
```

启动时自动执行内嵌的 `schema.sql`（建表、索引并增量补充 `paper_size` 字段，不删除现有数据、不插入示例留言）。旧留言的纸张尺寸默认为 `auto`，保留原有内容。生产环境请使用带 TLS 的数据库连接；`sslmode=disable` 仅用于本地或可信容器网络。

| 环境变量 | 默认值 | 用途 |
| --- | --- | --- |
| `DATABASE_URL` | 必填 | PostgreSQL DSN |
| `PORT` | `8080` | HTTP 端口 |
| `BIND_HOST` | 空（所有接口） | 监听地址；本机开发设为 `127.0.0.1`，容器部署保留默认值 |
| `STATIC_DIR` | `../web/dist` | 前端构建目录，相对进程工作目录 |
| `POSTS_PER_MINUTE` | `6` | 单个连接来源 IP 每分钟最多发布数 |
| `DATABASE_TEST_URL` | 空 | 集成测试数据库连接，测试会建独立随机 schema 并清理 |

限流只信任 TCP 连接来源，不接受客户端可伪造的 `X-Forwarded-For`。反向代理部署时应在可信代理层配置面向真实客户端的限流；本服务端点仍受代理来源的限额约束，可相应调整 `POSTS_PER_MINUTE`。

## API

所有 API 错误为 `{ "error": "适合直接显示的中文提示" }`，禁止缓存。

- `GET /api/health`：数据库可用时返回 `{ "status": "ok" }`，不可用时 HTTP 503。
- `GET /api/notes?categories=daily,joy&limit=12&cursor=...`：`{ notes, nextCursor, headCursor, total }`。分类省略代表全部；`limit` 为 1–50，默认 12。`total` 是当前分类的总数，与分页位置无关。`nextCursor` 为 `null` 表示读到底；`headCursor` 是当前分类最新一张，空墙时为 `null`。
- `GET /api/notes/updates?after=...&categories=daily,joy`：`{ count }`，只统计比 `headCursor` 新的留言。`after` 省略代表从空墙开始统计所有留言。客户端只显示更新提示，由用户主动刷新，避免滚动跳动。
- `POST /api/notes`：`Content-Type: application/json`，请求 `{ content, category, author?, paperSize? }`，返回 HTTP 201 和新留言。`content` 去首尾空白后为 1–500 个 Unicode 字符；可选 `author` 最多 24 个字符，省略为空字符串；`category` 为 `daily / joy / thoughts / wishes`。`paperSize` 为 `small / medium / large`，对应 6／9／12 行，省略或传 `auto` 时兼容旧客户端的自然增高纸张。

纸张容量由前端按真实字体和书写区域测量；后端不猜测自动折行，但会拒绝超出对应行数的显式换行（LF、CRLF 与 CR 均按换行计算）。换小纸不会由服务端截断文字。

留言字段：`{ id: string, content: string, category: string, author: string, paperSize: string, createdAt: RFC3339 string }`。ID 以字符串序列化，避免 JavaScript 精度丢失。时间来自数据库。按 `created_at DESC, id DESC` 排序，分页使用不透明游标；新留言插入不会挤动旧分页。

## 检查

```powershell
go test ./...
$env:DATABASE_TEST_URL = $env:DATABASE_URL
go test ./... -count=1
go vet ./...
```

集成测试验证旧表的纸张字段增量迁移、相同时间戳的排序、跨页去重、多选分类、新消息统计以及纸张尺寸在重新连接后的持久化，始终在独立测试 schema 里运行，不修改已有留言。

前端构建后可由此 Go 服务同源提供静态文件。不存在的 API 不会回退到 HTML；点文件不可访问；Vite 哈希资源使用长期缓存，HTML 要求重新验证。
