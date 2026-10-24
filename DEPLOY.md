---
AIGC:
    Label: "1"
    ContentProducer: 001191440300708461136T1XGW3
    ProduceID: b3ace11d5b9b6c99df0460e93cf411e5_5cdbc2fecf6811f1acb8525400638852
    ReservedCode1: OjDINfk4PN1H0FQw6J4UlIVcaQxt8+9celV8UnxbvQLYaofhcPs1nPXSv7zJzQLo20WKW+8BNU4DsrHv+6iG9fQaaEl36zIB3EWZSC8FEHlEsmjbILZuww/80PwcFAAbst6O7KumSqb+vfkq2lt23ojk1t+gwYcQTZ3aNeBtWZi4NuIuUxQwK1CWARo=
    ContentPropagator: 001191440300708461136T1XGW3
    PropagateID: b3ace11d5b9b6c99df0460e93cf411e5_5cdbc2fecf6811f1acb8525400638852
    ReservedCode2: OjDINfk4PN1H0FQw6J4UlIVcaQxt8+9celV8UnxbvQLYaofhcPs1nPXSv7zJzQLo20WKW+8BNU4DsrHv+6iG9fQaaEl36zIB3EWZSC8FEHlEsmjbILZuww/80PwcFAAbst6O7KumSqb+vfkq2lt23ojk1t+gwYcQTZ3aNeBtWZi4NuIuUxQwK1CWARo=
---

# 部署文档：Cloudflare Pages（cyber-home）

本页面为纯静态站点（单文件 index.html + 静态资源），无需构建。`_headers` 与 `_redirects` 位于项目根，Cloudflare Pages 部署时自动应用。

## 1. 前置准备

- 注册 Cloudflare 账号：https://dash.cloudflare.com/sign-up
- （可选）准备自定义域名并托管到 Cloudflare
- 本地安装 Node.js（wrangler 通过 npx 运行，无需全局安装）

## 2. wrangler CLI 完整命令

```bash
# 登录（弹出浏览器授权）
npx wrangler login
npx wrangler whoami

# 首次创建项目（production branch 设为 main，触发 GitHub 集成后 push 即自动发布）
npx wrangler pages project create cyber-home --production-branch main

# 本地预览（含 _headers/_redirects 效果）
npx wrangler pages dev .

# 直接部署当前目录到项目
npx wrangler pages deploy . --project-name=cyber-home --branch=main

# （可选）绑定自定义域
npx wrangler pages domain add cyber-home example.com
```

部署成功后访问：`https://cyber-home.pages.dev`

## 3. GitHub Actions CI（push main 自动构建发布）

在 GitHub 仓库 `zouxinhang88/cyber-home` 中添加两个 Repository secrets：

| Secret 名 | 值 | 说明 |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API Token | 需具备 `Cloudflare Pages:Edit` 权限（User -> My Profile -> API Tokens -> Create Token） |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 账户 ID | Dashboard 右侧 API 区可查 |

CI 配置文件见 `.github/workflows/deploy.yml`（已随仓库提交），推送 `main` 分支自动触发：

```yaml
name: Deploy to Cloudflare Pages
on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      deployments: write
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy . --project-name=cyber-home --branch=main
```

## 4. 部署后 curl 核验

```bash
# 安全头核验（期望看到 CSP / HSTS / X-Frame-Options / Referrer-Policy / Permissions-Policy / X-Content-Type-Options）
curl -sI https://cyber-home.pages.dev/ | grep -iE 'strict-transport-security|content-security-policy|x-frame-options|referrer-policy|permissions-policy|x-content-type-options'

# HTTPS 强制与域名规范化核验（应返回 200 或 301 到规范化域名，绝不能 200 over http）
curl -sI http://cyber-home.pages.dev/ | head -5
curl -sIL https://cyber-home.pages.dev/ | grep -i 'HTTP/'

# 内容可达性
curl -s https://cyber-home.pages.dev/ | head -20
```

## 5. 安全加固清单（三层）

- 服务端 / Cloudflare 层：HSTS（已由 `_headers` 下发）、X-Frame-Options DENY、CORS 白名单不用 `*`、Cross-Origin-Opener-Policy same-origin、隐藏源站 IP（域名走 Cloudflare 代理、关闭源站直连）、WAF 基础规则（Managed Ruleset）、速率限制（Rate Limiting 规则）、全站强制 HTTPS（Pages 默认 + `_redirects` 兜底）。
- 域名 / DNS 层：DNSSEC 开启、注册商二次验证与转移锁、解析全部走 Cloudflare 代理（橙色云朵）、定期检查解析记录与 NS 完整性。
- 代码层：CSP meta（见 `index.html <head>`）、动态内容一律 `esc()` 转义渲染（禁止 innerHTML 直渲用户输入）、外部资源使用 SRI（当前页面零外部脚本，全部内联）。
*（内容由AI生成，仅供参考）*
