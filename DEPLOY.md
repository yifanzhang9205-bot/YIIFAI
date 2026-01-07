# AI视频创作画布 - 部署指南

## 项目概述
AI视频创作画布是一个对话式AI驱动的视频分镜可视化编辑工具，使用 Next.js 16 + TypeScript + Tailwind CSS 4 开发。

## 部署方案

### 方案一：Vercel 部署（推荐 ⭐）

Vercel 是 Next.js 的官方托管平台，提供免费额度，部署最简单。

#### 步骤：

1. **准备代码仓库**
   ```bash
   # 将代码推送到 GitHub/GitLab/Bitbucket
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/your-username/your-repo.git
   git push -u origin main
   ```

2. **在 Vercel 导入项目**
   - 访问 [vercel.com](https://vercel.com)
   - 使用 GitHub 账号登录
   - 点击 "Add New" → "Project"
   - 选择你的代码仓库并导入

3. **配置构建设置**
   Vercel 会自动检测 Next.js 项目，通常无需手动配置。

   如果需要自定义，在项目设置中：
   - Framework Preset: Next.js
   - Build Command: `pnpm install && pnpm build`
   - Output Directory: `.next`
   - Install Command: `pnpm install`

4. **配置环境变量**（可选）
   在 Settings → Environment Variables 中添加：
   ```
   NEXT_PUBLIC_BASE_URL=https://your-domain.vercel.app
   ```

5. **部署**
   - 点击 "Deploy" 按钮
   - 等待构建完成（约 2-5 分钟）
   - 部署成功后会获得一个 `.vercel.app` 域名

6. **自定义域名**（可选）
   - 在 Settings → Domains 添加自己的域名
   - 按提示配置 DNS 记录

#### Vercel 免费额度：
- 100GB 带宽/月
- 无限次部署
- 自动 HTTPS
- 全球 CDN

---

### 方案二：Docker 部署

#### 1. 创建 Dockerfile

项目根目录已包含 `.coze` 配置，可创建 Dockerfile：

```dockerfile
FROM node:24-alpine AS base

# 安装依赖阶段
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# 构建阶段
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm install -g pnpm && pnpm build

# 运行阶段
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

#### 2. 构建镜像
```bash
docker build -t ai-video-canvas .
```

#### 3. 运行容器
```bash
docker run -p 3000:3000 ai-video-canvas
```

#### 4. 使用 Docker Compose（推荐）

创建 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_BASE_URL=https://your-domain.com
    restart: unless-stopped
```

运行：
```bash
docker-compose up -d
```

---

### 方案三：云服务器部署

#### 1. 服务器准备
- 安装 Node.js 24+
- 安装 pnpm：`npm install -g pnpm`

#### 2. 部署步骤
```bash
# 克隆代码
git clone https://github.com/your-username/your-repo.git
cd your-repo

# 安装依赖
pnpm install

# 构建项目
pnpm build

# 使用 PM2 运行（推荐）
npm install -g pm2
pm2 start npm --name "ai-video-canvas" -- start
pm2 save
pm2 startup

# 或直接运行
NODE_ENV=production pnpm start
```

#### 3. 配置 Nginx 反向代理

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### 4. 配置 SSL（使用 Let's Encrypt）
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## 环境变量说明

本项目主要使用 `coze-coding-dev-sdk` 提供的集成服务。

### 必需变量（部署时必须配置）

| 变量名 | 说明 | 如何获取 |
|--------|------|----------|
| `COZE_WORKLOAD_IDENTITY_API_KEY` | Coze SDK 身份认证密钥 | 从沙箱环境复制或联系 Coze 平台申请 |

**在 Vercel 中配置步骤：**
1. 进入项目 → Settings → Environment Variables
2. 点击 Add New
3. Name: `COZE_WORKLOAD_IDENTITY_API_KEY`
4. Value: 复制你的 API Key
5. Environments: 勾选 Production, Preview, Development

### 可选变量（根据需要配置）

| 变量名 | 说明 |
|--------|------|
| `NEXT_PUBLIC_BASE_URL` | 网站的基础URL（如：`https://yiifai.vercel.app`） |

**注意事项：**
- 开发环境：沙箱会自动注入 `COZE_WORKLOAD_IDENTITY_API_KEY`
- 生产环境：需要手动配置
- 当前提供的开发 Key 仅用于测试，生产环境请申请正式 Key

---

## 部署检查清单

部署完成后，请检查：

- [ ] 网站可以正常访问
- [ ] 所有页面加载正常
- [ ] API 路由可以正常调用
- [ ] 剧本生成功能正常
- [ ] 人物生成功能正常
- [ ] 关键帧生成功能正常
- [ ] 图片上传和下载功能正常
- [ ] 批量操作功能正常
- [ ] 响应式设计在移动端正常

---

## 常见问题

### Q: 部署后图片生成失败？
A: 检查图片生成 API 的配置，确认 `coze-coding-dev-sdk` 的权限配置正确。

### Q: Vercel 部署超时？
A: Vercel 免费版构建限时 10 分钟。如果项目较大，考虑升级到 Pro 计划或优化构建流程。

### Q: 如何查看部署日志？
A:
- Vercel：在 Dashboard → Deployments 中查看
- Docker：`docker logs <container-id>`
- PM2：`pm2 logs`

### Q: 如何更新部署？
A:
- Vercel：推送到 Git 自动触发部署
- Docker：重新构建镜像并重启容器
- 服务器：`git pull && pnpm install && pnpm build && pm2 restart ai-video-canvas`

---

## 性能优化建议

1. **启用图片优化**：Next.js 自动优化图片
2. **配置 CDN**：使用 Vercel Edge Network 或 Cloudflare
3. **数据库优化**：添加索引，使用连接池
4. **缓存策略**：对 API 响应添加缓存头
5. **监控**：使用 Vercel Analytics 或自定义监控

---

## 技术支持

如有问题，请检查：
1. 构建日志
2. 服务器日志
3. 环境变量配置
4. 网络连接和防火墙设置

---

**推荐使用 Vercel 部署，最简单且免费！** 🚀
