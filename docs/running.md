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
应用启动时只做幂等建表与索引创建，不会导入示例留言。

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
