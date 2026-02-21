# Notion Carousel

将 Notion 父页面的子页面转换为可下载的轮播图（PNG 图片）。

## 功能

- **Connect Notion**：通过 Notion Public Integration OAuth 授权
- 粘贴**父页面 URL**，拉取所有子页面（顺序即幻灯片顺序）
- 每个子页面内容渲染为一张幻灯片（1080×1350，4:5）
- 支持：标题 (h1/h2/h3)、段落、无序列表（含一层嵌套）、图片
- **Download All**：将所有幻灯片导出为 `01.png`, `02.png`, ...

## 环境要求

- Node.js 18+
- Notion Public Integration（在 [Notion 集成设置](https://www.notion.so/profile/integrations) 创建，类型选 Public）

## 配置

1. 复制环境变量示例并填写：

```bash
cp .env.example .env
```

2. 在 `.env` 中填写：

- `NOTION_CLIENT_ID` / `NOTION_CLIENT_SECRET`：Notion Public Integration 的 Client ID 和 Client Secret
- `BASE_URL`：后端地址，本地开发填 `http://localhost:3001`
- `CLIENT_ORIGIN`：前端地址，本地开发填 `http://localhost:5173`

3. 在 Notion 集成设置中配置 **Redirect URI**：

- 本地：`http://localhost:3001/api/notion/callback`

4. 本地开发时，前端需要请求后端完整地址以携带 Cookie，在 `client` 目录下创建 `.env`：

```bash
# client/.env
VITE_API_URL=http://localhost:3001
```

## 启动

在项目根目录执行（会同时启动后端与前端）：

```bash
npm install
npm run start
```

- 后端：<http://localhost:3001>
- 前端：<http://localhost:5173>

在浏览器打开 **http://localhost:5173**，点击「Connect Notion」完成授权后即可使用。

## 技术栈

- **前端**：React、Vite、html2canvas
- **后端**：Node.js、Express、@notionhq/client、express-session
- OAuth 与所有 Notion API 请求由后端代理，Token 存于服务端 Session
