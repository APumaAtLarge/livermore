# Livermore Market Monitor

基于 Next.js、TypeScript、SCSS 和 `yahoo-finance2` 的全球市场行情页，展示伦敦金现、布伦特原油、纳斯达克 100 和标普 500 的现价与分时走势。

## 功能

- M5 分时数据，以及由 M5 服务端聚合得到的 M10 数据
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
          ports:
            - containerPort: 3000
          env:
            - name: PORT
              value: "3000"
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: "1"
              memory: 512Mi
```

`min-scale: "1"` 表示 Knative 始终尝试保留至少一个 Revision Pod。它能避免应用从零副本启动，但会持续占用一个 Pod 的基础资源。扩容仍由 Knative Pod Autoscaler 根据流量完成。

部署前需要将示例中的镜像地址替换为实际镜像。容器必须监听 Knative 注入的 `PORT`，并监听所有网络接口，而非仅监听 `localhost`。

## 行情接口

```http
GET /api/markets?timeframe=5m
GET /api/markets?timeframe=10m
```

接口运行在 Node.js Runtime。M10 并非 Yahoo Finance 原生 interval，而是将 M5 数据按两个周期聚合得到。

响应包含：

- `markets`：四个市场的价格、涨跌和走势点位
- `updatedAt`：本次服务端更新时间
- `delayed`：延迟行情提示

当前缓存头为：

```http
Cache-Control: public, s-maxage=15, stale-while-revalidate=45
```

该响应头需要 CDN 或支持共享缓存的反向代理才能产生跨请求缓存效果；仅使用 Kourier 时，每次请求仍会进入应用。
