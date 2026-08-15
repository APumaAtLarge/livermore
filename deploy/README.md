# Knative 部署

## 需要的配置

应用部署只需要提交以下两个文件：

- `namespace.yaml`：创建独立的 `livermore` namespace。
- `knative-service.yaml`：创建 Knative Service，定义镜像、端口、安全上下文、资源、就绪探针及 `min-scale: "1"`。Knative 会根据 `containerPort` 自动注入保留变量 `PORT`，不要在 `env` 中重复声明。

Registry 密码不应写入 Git。域名和 TLS 是集群级配置，也不应与应用清单绑定；根据部署环境单独配置。

## 1. 确认 Kourier 网关

```bash
sudo kubectl get pods -n knative-serving
sudo kubectl get svc kourier -n knative-serving
```

记录 `kourier` Service 的 `EXTERNAL-IP`。如果它一直是 `pending`，说明 K3s 没有可用的 LoadBalancer 实现；需要启用 K3s ServiceLB、安装 MetalLB，或把 Kourier 改为 NodePort 后使用节点 IP 和对应端口。

## 2. 发布镜像

推送代码到 `main` 后，GitHub Actions 会构建：

```text
ghcr.io/apumaatlarge/livermore:latest
ghcr.io/apumaatlarge/livermore:sha-<完整提交哈希>
```

首次部署可直接使用清单中的 `latest`。生产发布建议把 `knative-service.yaml` 的 `image` 改成对应 SHA 标签，并将 `imagePullPolicy` 改为 `IfNotPresent`，保证 Revision 指向不可变镜像。

## 3. 私有 GHCR 镜像（可选）

如果 GHCR Package 是公开的，跳过本节。如果是私有的，创建具有 `read:packages` 权限的 GitHub PAT，然后在集群中创建拉取凭据：

```bash
read -s GHCR_TOKEN
sudo kubectl apply -f deploy/namespace.yaml
sudo kubectl -n livermore create secret docker-registry ghcr-credentials \
  --docker-server=ghcr.io \
  --docker-username=APumaAtLarge \
  --docker-password="$GHCR_TOKEN"
unset GHCR_TOKEN

sudo kubectl -n livermore patch serviceaccount default \
  --type merge \
  -p '{"imagePullSecrets":[{"name":"ghcr-credentials"}]}'
```

Secret 只保存在集群中，不要导出或提交它。

## 4. 部署应用

```bash
sudo kubectl apply -f deploy/namespace.yaml
sudo kubectl apply -f deploy/knative-service.yaml
```

观察 Revision 创建和 Pod 就绪：

```bash
sudo kubectl get ksvc -n livermore -w
sudo kubectl get revisions -n livermore
sudo kubectl get pods -n livermore -w
```

成功时 `ksvc/livermore` 的 `READY` 为 `True`。查看访问地址：

```bash
sudo kubectl get ksvc livermore -n livermore \
  -o jsonpath='{.status.url}{"\n"}'
```

## 5. DNS 尚未配置时测试

先取得 Knative 分配的 Host：

```bash
KSVC_HOST=$(sudo kubectl get ksvc livermore -n livermore \
  -o jsonpath='{.status.url}' | sed 's#^https\?://##')
```

使用 Kourier 的外部 IP 测试；将 `<KOURIER_EXTERNAL_IP>` 替换为实际地址：

```bash
curl -H "Host: $KSVC_HOST" http://<KOURIER_EXTERNAL_IP>/
```

如果 Kourier 使用 NodePort，需要写成 `http://<NODE_IP>:<HTTP_NODE_PORT>/`。

## 6. 配置正式域名

在 DNS 服务商创建记录，把域名指向 Kourier 的外部 IP。若希望所有 Knative Service 使用同一个基础域名，可配置集群级 `config-domain`：

```bash
sudo kubectl patch configmap config-domain \
  -n knative-serving \
  --type merge \
  -p '{"data":{"example.com":""}}'
```

将 `example.com` 替换为实际域名，然后配置以下任一 DNS 记录：

```text
livermore.livermore.example.com  A  <KOURIER_EXTERNAL_IP>
*.livermore.example.com          A  <KOURIER_EXTERNAL_IP>
```

修改 `config-domain` 后，Knative 会自动重新协调现有 Route。HTTPS 还需要 cert-manager 和 Knative 外部域名 TLS 配置，不能只靠上述 DNS 记录启用。

## 更新与回滚

更新 `image` 后再次执行：

```bash
sudo kubectl apply -f deploy/knative-service.yaml
```

每次模板变化都会生成一个不可变 Revision。查看历史：

```bash
sudo kubectl get revisions -n livermore
```

排错常用命令：

```bash
sudo kubectl describe ksvc livermore -n livermore
sudo kubectl describe revision -n livermore
sudo kubectl logs -n livermore -l serving.knative.dev/service=livermore -c user-container --tail=200
```
