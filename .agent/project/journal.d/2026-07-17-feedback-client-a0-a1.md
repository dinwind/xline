# 2026-07-17 — Feedback Hub 客户端 Phase A0 + A1

## Done

- A0：冻结 `FeedbackClient` 类型 / REST + mock、URL/错误/context 单测、联调可达性报告（示例 AuthNexus 仍为 HTTP，HTTPS 未达标 → 报告人类，未擅自切 AxGate 反代）。
- A1：`services/feedback` + `controller/feedback` + `feedback.proto`；webview 四屏（List/New/Detail/LoginGate）；命令 `Open Feedback` / `Report Issue`；About → Send Feedback；`authNexusBaseUrl` 单源。
- SOP：`sop/feedback-hub-client.md`、`sop/feedback-hub-a0-connectivity.md`。

## Notes

- Mock 仅 `AXLINE_FEEDBACK_MOCK=1`；真实路径无假成功。
- 狗粮 HTTP Hub：`AXLINE_FEEDBACK_ALLOW_HTTP=1`。
- A2/A3（搜索、Check for Updates 闭环引导等）未做。
