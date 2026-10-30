---
title: "Vercel-Email-routing"
name: "Vercel-Email-routing"
slug: "vercel-email-routing"
pinned: false
pinnedOrder: -1
description: ""
repoUrl: "https://github.com/mozi1924/Vercel-Email-routing"
homepage: "https://vercel-email-routing.vercel.app"
stars: 0
forks: 0
language: "JavaScript"
topics: []
license: ""
createdAt: "2026-01-25T14:41:48Z"
pushedAt: "2026-01-25T14:41:52Z"
defaultBranch: "master"
archived: false
---
# Vercel Serverless Email Relay Gateway

一个基于 Vercel Serverless Functions 的轻量级邮件中继网关。通过 REST API 发送邮件，支持多账户路由、严格的发信人绑定校验和超时控制。

## 特性

- **多账户支持**: 通过环境变量配置多个 SMTP 账户，根据发件人地址自动路由。
- **安全绑定**: 每个 API Key 绑定特定的 `from` 地址，防止发信人欺骗。
- **健壮性**: 内置 10 秒严格超时控制，返回详细的 SMTP 响应码。
- **Serverless**: 专为 Vercel 设计，无服务器维护成本。
- **邮件预处理**: 自动将 HTML 内容转换为纯文本 (text)，提高送达率并避免进入垃圾箱。

## 目录结构

```
.
├── api/
│   └── send.js         # 核心发送逻辑 (Serverless Function)
├── utils/
│   └── config.js       # 配置解析与验证工具
├── .env.example        # 环境变量示例
├── package.json
└── README.md
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 并重命名为 `.env.local` (本地开发) 或在 Vercel控制台设置。

**注意**: 环境变量值为 JSON 字符串格式。

### 3. 本地测试

使用提供的测试脚本模拟请求：

```bash
node test-local.js
```

## API 参考

### 发送邮件

**Endpoint:** `POST /api/send`

**Headers:**

| Name           | Type     | Description                 |
| :------------- | :------- | :-------------------------- |
| `x-api-key`    | `string` | **Required**. 您的 API 密钥 |
| `Content-Type` | `string` | 必须为 `application/json`   |

**Body:**

| Field               | Type      | Description                                                                  |
| :------------------ | :-------- | :--------------------------------------------------------------------------- |
| `to`                | `string`  | **Required**. 收件人地址                                                     |
| `subject`           | `string`  | **Required**. 邮件标题                                                       |
| `text`              | `string`  | 纯文本内容 (若未提供，将尝试从 `html` 自动生成)                              |
| `html`              | `string`  | HTML 内容                                                                    |
| `from`              | `string`  | **Optional**. 发件人地址 (必须与 API Key 绑定的地址一致)                     |
| `skipPreprocessing` | `boolean` | **Optional**. 设为 `true` 可跳过自动从 HTML 生成 Text 的步骤。默认 `false`。 |

**响应示例:**

- **200 OK**

  ```json
  {
    "success": true,
    "message": "Email sent",
    "messageId": "<...>",
    "response": "250 OK"
  }
  ```

- **403 Forbidden** (发件人不匹配)
  ```json
  {
    "error": "Forbidden: You are not authorized to send from this address.",
    "expected": "alice@gmail.com",
    "received": "hacker@test.com"
  }
  ```

## 环境变量详解

### `EMAIL_ACCOUNTS` (JSON Array)

配置可用的 SMTP 发送账户列表。

```json
[
  {
    "host": "smtp.gmail.com",
    "port": 465,
    "user": "alice@gmail.com",
    "pass": "app-password",
    "secure": true
  }
]
```

### `API_KEY_MAPPING` (JSON Object)

定义 API Key 到发件人地址的映射。

```json
{
  "sk_live_12345": { "from": "alice@gmail.com" }
}
```

## 部署到 Vercel

### 方法 1：使用 Vercel Dashboard (推荐)

1. **推送代码**: 将代码推送到您的 GitHub/GitLab/Bitbucket 仓库。
2. **导入项目**: 在 [Vercel Dashboard](https://vercel.com/new) 中导入该仓库。
3. **配置环境变量**:
   - 在部署页面的 "Environment Variables" 部分，添加以下变量：
     - `EMAIL_ACCOUNTS`: (您的 SMTP 账户 JSON 字符串)
     - `API_KEY_MAPPING`: (您的 API Key 映射 JSON 字符串)
       > [!TIP]
       > 确保 JSON 格式正确，建议先在本地环境或 [JSON 校验器](https://jsonlint.com/) 中验证。
4. **部署**: 点击 "Deploy"。

### 方法 2：使用 Vercel CLI

1. **安装 CLI**: `npm install -g vercel`
2. **登录**: `vercel login`
3. **初始化部署**:
   ```bash
   vercel
   ```
4. **设置环境变量**:
   在 Vercel 网页端的项目设置中添加环境变量，或者在部署时通过 CLI 设置。
5. **生产部署**:
   ```bash
   vercel --prod
   ```

## 验证部署

部署完成后，您可以修改 `test-local.js` 中的 `BASE_URL` 为您的 Vercel 生产域名（例如 `https://your-project.vercel.app`），然后运行：

```bash
node test-local.js
```
