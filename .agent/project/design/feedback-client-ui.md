# Axline Feedback Webview — UI 设计

> Date: 2026-07-17 · 配套：`plan/authnexus-feedback-client.md`（AX-F-01..12）

## 1. 屏幕与路由（webview 内部）

```
Feedback（侧栏子视图）
├── List（默认）：Mine / Public 两 Tab + Report issue 按钮 + 刷新
├── New：type 分段（Bug/Feature/Question）→ title → body → 附件区 → context checklist → 提交
├── Detail /:number：状态徽章 + banner + 评论时间线 + 回复框 + 外链
└── LoginGate：未登录时替换全部内容
```

入口（VS Code）：侧栏 **view/title** 导航图标 Account → **Feedback**（`$(feedback)`，`axline.openFeedback`）→ Settings；Command `Axline: Feedback` / `Axline: Report Issue`（后者直达 New）；Settings→About `Send Feedback`（AX-F-08，直达 New）。Webview 内 Navbar 仅 standalone（`showNavbar`）；VS Code 以 view/title 为准。

## 2. 关键设计决策

| 决策 | 说明 | 对应条目 |
|------|------|----------|
| 状态只读 | 用户不能改状态；徽章文案用 §7 映射（Open / Under review / Needs your reply / …） | 客户端壳定位 |
| NEEDS_INFO 强提示 | 列表行琥珀底 + 左边条；详情页顶置 banner「团队需要更多信息，请在下方回复」 | AX-F-06、评审 F-2 回边 |
| 默认私密可见 | New 表单提交按钮上方固定文案「默认私密：仅你和管理员可见」+ 锁图标 | 评审 F-7 作者知情 |
| context checklist | 8 项环境信息**必填**（不可取消）；host 提交时 `mergeRequiredFeedbackClientContext` 强制附带；折叠标题「随反馈发送的环境信息」 | AX-F-03 |
| 提交账号展示 | New 表单顶部只读「Submitting as」显示 JWT 账号 displayName/email（token 仍不进 webview） | 用户知情 |
| 附件区 | 虚线拖放/粘贴区；MIME：图片 + pdf/txt/md/log/json/csv/xml/docx；最多 5×**10 MB**；超限 413/415；详情页图片预览、文件下载链 | AX-F-02 |
| Done 闭环 | 状态 Done 且带 releaseVersion 时展示绿色卡「已在 vX.Y.Z 修复」+「检查更新」按钮（复用私有更新）；externalPrUrl 以外链图标展示 | A3、评审 F-12 |
| AI 评论标注 | M2M/bot 评论带紫色 `AI` 徽章 | 透明度 |
| 登录门闸 | 未登录整面板替换为 LoginGate：锁图标 + 「登录 Axline 账号」按钮（走既有 AxGate Account 流）+ 脚注「token 不进入本面板」 | AX-F-07、SEC-02 |
| 错误提示 | 401 静默 refresh→重试→deauth；403 就地提示不登出；网络错误显示重试按钮 | AX-F-09 |

## 3. 视觉

- 复用 VS Code 主题变量（`--vscode-*`）与既有 Cline/Axline webview tokens；不另起设计语言（§5.3）。
- 状态徽章：Open 灰 / Under review · Accepted 蓝 / Needs your reply 琥珀 / In progress · In review 紫 / Done 绿 / Closed · Duplicate 灰。
- 面板宽度按侧栏最小 300px 设计，单列布局。

## 4. 组件落点

`apps/vscode/webview-ui/src/components/feedback/`：`FeedbackListView.tsx`、`FeedbackNewForm.tsx`、`FeedbackDetailView.tsx`、`StatusBadge.tsx`、`ContextChecklist.tsx`、`AttachmentDropzone.tsx`、`LoginGate.tsx`。数据经 gRPC 消息由 extension host `FeedbackService` 提供；webview 不持有 token、不直接发 HTTP（§5.3/§6.1）。
