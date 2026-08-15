# Livermore Market Monitor

基于 Next.js、TypeScript、SCSS 和 `yahoo-finance2` 的全球市场行情页，以表格展示伦敦金现、布伦特原油、纳斯达克 100 和标普 500 的现价及移动均价。

## 功能

- M5（最近 5 个交易日均价）与 M10（最近 10 个交易日均价）
- 现价、涨跌额、涨跌幅、昨收和交易状态
- 浏览器每 30 秒自动刷新，支持手动刷新与失败重试
- Yahoo Finance 请求仅在 Node.js 服务端执行
- `/api/markets` 设置 15 秒共享缓存响应头

> `yahoo-finance2` 是非官方客户端，行情可用性、时效和字段不受 Yahoo 保证；页面数据仅供参考，不构成投资建议。

## 本地开发

安装依赖并启动开发服务器：

```bash
pnpm install
pnpm dev
```

局域网访问时使用：

```bash
pnpm dev --hostname 0.0.0.0
```

项目在 `next.config.ts` 的 `allowedDevOrigins` 中允许 `192.168.94.130` 访问开发资源。地址变化时应同步修改该配置；它只影响开发模式。

检查和构建：

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm build
pnpm start
```

## 生产架构

本项目部署在禁用内置 Traefik 的 K3s 集群中，由 Knative Serving 管理应用实例，使用 Kourier 作为 Knative 网络层：

```text
Internet / LAN
      │
      ▼
Kourier Gateway (Envoy)
      │
      ▼
Knative Serving / Activator
      │
      ▼
Livermore Revision Pod (Next.js :3000)
      │
      ▼
Yahoo Finance
```

请求分为两个阶段：

1. Next.js 返回 HTML、CSS 和 JavaScript，浏览器先显示页面及行情骨架。
2. 浏览器调用 `/api/markets`，服务端通过 `yahoo-finance2` 获取数据并返回完整行情。

Kourier 负责入口路由和 Knative 流量转发，不是 CDN，也不会自行缓存带有 `s-maxage` 的响应。如果需要跨地域静态资源加速或共享行情缓存，应在 Kourier 前增加 CDN，或使用 Redis/应用级缓存。

## Knative Service

生产服务固定保留一个副本，以消除 scale-to-zero 带来的首请求冷启动：

仓库已经提供可应用的 [`deploy/namespace.yaml`](deploy/namespace.yaml) 和 [`deploy/knative-service.yaml`](deploy/knative-service.yaml)。完整的 Kourier 检查、GHCR 私有镜像凭据、部署、无 DNS 测试和正式域名配置步骤见 [`deploy/README.md`](deploy/README.md)。

```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: livermore
  namespace: default
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/min-scale: "1"
    spec:
      containers:
        - image: REGISTRY/LIVERMORE:TAG
          securityContext:
            allowPrivilegeEscalation: false
            capabilities:
              drop: ["ALL"]
            runAsNonRoot: true
            runAsUser: 1001
            runAsGroup: 1001
            seccompProfile:
              type: RuntimeDefault
          ports:
            - containerPort: 3000
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: "1"
              memory: 512Mi
```

`min-scale: "1"` 表示 Knative 始终尝试保留至少一个 Revision Pod。它能避免应用从零副本启动，但会持续占用一个 Pod 的基础资源。扩容仍由 Knative Pod Autoscaler 根据流量完成。

部署前需要将示例中的镜像地址替换为实际镜像。Knative 会根据 `containerPort` 自动注入保留环境变量 `PORT`，清单不能自行声明它。容器必须读取该变量并监听所有网络接口，而非仅监听 `localhost`；本项目 Dockerfile 已满足这两项要求。

## 镜像构建流水线

`.github/workflows/container-image.yml` 使用 GitHub Actions 和 Docker Buildx 构建镜像，并发布到 GitHub Container Registry：

```text
ghcr.io/<github-owner>/<repository>:latest
ghcr.io/<github-owner>/<repository>:sha-<完整提交哈希>
```

流水线行为：

- Pull Request：仅验证 Docker 镜像能否成功构建，不推送镜像。
- 推送到默认分支：推送 `latest` 和不可变的完整提交 SHA 标签。
- 推送 `v1.2.3` 形式的 Git 标签：额外推送 `1.2.3` 和 `1.2` 标签。
- 使用 GitHub Actions 缓存加速依赖和镜像层，并生成 provenance 与 SBOM。

GHCR 登录使用仓库自动提供的 `GITHUB_TOKEN`，不需要额外配置 Registry 密码。工作流已声明 `packages: write` 权限；如果组织策略限制 GitHub Actions 发布包，还需要在仓库或组织设置中允许 Actions 读写 Packages。

生产环境建议在 Knative Service 中使用提交 SHA 标签，而不是 `latest`：

```yaml
containers:
  - image: ghcr.io/<github-owner>/<repository>:sha-<完整提交哈希>
```

这样每次发布指向不可变镜像，便于回滚和审计。首次发布后，还需要在 GHCR Package 设置中确认镜像的可见性，或给 K3s 配置读取私有 GHCR 镜像的 `imagePullSecret`。

## 行情接口

```http
GET /api/markets
```

接口运行在 Node.js Runtime。服务端取得日线收盘价，以最近 5、10 个有效交易日分别计算算术平均；交易进行中时，最新一个日线值使用现价更新。

响应包含：

- `markets`：四个市场的现价、涨跌、M5 与 M10
- `updatedAt`：本次服务端更新时间
- `delayed`：延迟行情提示

当前缓存头为：

```http
Cache-Control: public, s-maxage=15, stale-while-revalidate=45
```

该响应头需要 CDN 或支持共享缓存的反向代理才能产生跨请求缓存效果；仅使用 Kourier 时，每次请求仍会进入应用。
