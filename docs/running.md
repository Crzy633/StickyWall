# 运行与部署

## 当前 Windows 电脑

在项目根目录执行：

```powershell
# 首次准备：仅下载到被 Git 忽略的 .local，不安装系统服务。
./scripts/setup-local.ps1
./scripts/dev.ps1
```

打开 <http://127.0.0.1:5173>，API 健康检查位于 <http://127.0.0.1:8080/api/health>。
前端代码保存后自动刷新。修改 Go 后端后，先停止再启动应用：

```powershell
./scripts/dev.ps1 -Stop
./scripts/dev.ps1
```

日志位于 `.local/backend*.log` 与 `.local/frontend*.log`。本地 PostgreSQL 数据位于
`.local/data/postgres`，端口为 `55432`，只监听回环地址。它使用开发用 trust 认证，
请勿将该实例暴露到公网。应用停止脚本会保留数据库进程和数据；如需手动停止数据库：

```powershell
./.local/tools/pgsql/bin/pg_ctl.exe -D .local/data/postgres -m fast -w stop
```

已有 PostgreSQL 时，先设置自己的连接串再启动，可跳过本地数据库准备：

```powershell
$env:DATABASE_URL = 'postgres://USER:PASSWORD@HOST:5432/stickywall?sslmode=require'
./scripts/dev.ps1
```

## 可选的示例便利贴

示例不是用户留言。所有作者均带有「示例 · 」标记。只在数据库没有任何便利贴时插入
16 条示例；重复运行不会增加数据，不会覆盖真实留言。此导入不会随应用自动执行：

```powershell
./scripts/seed-demo.ps1
```

脚本默认只连接本地开发数据库。若确需向其他空数据库导入，显式传入 `-DatabaseUrl`。
数据库必须先由应用启动并建表。脚本会为 `psql` 设置 `PGCLIENTENCODING=UTF8`。

## Docker Compose 部署

安装 Docker Engine / Docker Desktop 后：

```powershell
Copy-Item .env.example .env
# 编辑 .env，将 POSTGRES_PASSWORD 改成长的 URL-safe 随机密码。
docker compose up -d --build
```

访问 <http://127.0.0.1:8080>。Go 服务同时提供编译后的前端和 API。PostgreSQL 数据保存在
`postgres_data` 命名卷中，不对主机公开数据库端口。应用端口默认仅绑定 `127.0.0.1`；
正式上线时可以在前面配置带 HTTPS 的反向代理。发布前设置自己的数据库密码。

```powershell
docker compose logs -f app
docker compose down
```

`docker compose down` 保留数据卷。不要用 `docker compose down -v`，除非明确要删除数据库。
应用启动时执行幂等表结构迁移，并仅为 layout 为 NULL 的旧记录分配一次固定坐标；已有布局不重排，不会导入示例留言。

## 基本检查

```powershell
Push-Location web
npm test
npm run build
Pop-Location
Push-Location server
$env:DATABASE_TEST_URL = 'postgres://stickywall@127.0.0.1:55432/stickywall?sslmode=disable'
../.local/tools/go/bin/go.exe test ./...
Pop-Location
```

数据库测试使用独立临时 schema，完成后清理，不会修改便利贴墙里的数据。

## 坐标墙的数据与归属

首次启动新版会补充 JSONB `layout`、`owner_hash` 等字段；仅迁移 `layout IS NULL` 的旧留言，保留正文并生成一次固定坐标。已有坐标不会因启动、刷新或新留言重排。部署更新前按现有运维方式备份 PostgreSQL；备份须包含整张 `notes` 表，JSONB 内含位置、文字、笔画、叠贴关系与 base64 相片，`owner_hash` 关联匿名归属。没有独立相片目录需要另行复制。

归属依赖浏览器 `wall_visitor` cookie（HttpOnly、SameSite=Strict），不依赖署名。清除 cookie、换浏览器或 cookie 失效会失去「我的便签」权限，数据库备份不会恢复浏览器令牌。旧留言没有归属，不自动认领。HTTPS 反向代理应设置 `X-Forwarded-Proto: https` 以让服务端发出 Secure cookie。前端与 API 继续同源部署。

普通叠笺只可从自己原纸下半部开始，相片只可附着自己的非相片便签。相片为 PNG/JPEG，最多3MiB；API JSON 请求体上限6MiB。代理若另有限制，应允许合法请求通过；API处理期限为5秒，前端单次请求等待12秒。并发位置冲突返回409并保留草稿，访客可在更新后的墙上调整位置重试。

草稿在内存中保留，并延迟尽力写入 localStorage；存储被禁用、已满或清除后不能保证恢复。浏览器身份cookie与草稿localStorage是不同机制，保留署名或草稿不会恢复纸张归属。

## 当前规模边界

新版是可持续扩展的二维坐标墙，手机和电脑使用相同坐标。客户端以每页50张连续读取整墙布局、文字、笔画及相片，每15秒重新读取合并；仅视野附近的便签生成DOM。定时读取不会改变已有坐标，但DOM裁切不降低完整数据的网络和内存成本。

发布时服务端在事务锁内读取整墙并校验位置，图片仍包含在布局数据中。大墙和大量大图片会增加数据库、锁占用、传输与浏览器内存成本。部署容量应结合实际负载验证，当前实现不保证无限数据容量；未来可通过空间索引、可视区读取与独立图片存储扩展。
