# M6 项目收官检查清单

验收日期：2026-04-28

---

## 1. 构建验证

- [x] `cd frontend && npm run build` 通过，零 TypeScript 错误
- [x] 无 `useSearchParams` Suspense 边界报错
- [x] 无 `"use client"` 组件导出 `metadata` 报错
- [x] 所有路由正常生成（`/`、`/ai`、`/alerts`、`/etl`、`/regions`、`/settings`、`/stations`、`/trends`、`/stations/[code]`）

## 2. 后端健康

- [x] `GET /api/health` → `{"ok": true, "version": "0.1.0"}`
- [x] `GET /api/ai/health` → `{"ok": true, "key_loaded": true, "model": "kimi-k2.6"}`
- [x] `GET /api/dashboard/summary` → 返回完整 KPI + 风险 + 告警 + 区域 + ETL
- [x] `GET /api/dashboard/stations/geojson` → 返回 150 站点 FeatureCollection
- [x] `GET /api/dashboard/trends/24h` → 返回 24h 借还/占用率趋势
- [x] `GET /api/dashboard/etl/health` → 返回 feed 健康数组

## 3. AI 功能

- [x] SSE 流式 `/api/ai/chat/stream` 正常响应
- [x] Tool-calling 三件套（KPI / 风险 / 告警）可正常调用
- [x] `kimi-k2.6` reasoning_content 在多轮 tool-call 中正确保留
- [x] 非流式 `/api/ai/chat` 正常响应（SSE 关闭时回退）
- [x] 站点代码（`BJ-CP-S001`）自动链接到 `/stations/{code}`
- [x] 区域代码（`BJ-CP`）自动链接到 `/regions?highlight={code}`

## 4. 设置配置生效

- [x] `dashboardRefreshInterval` 接入 `useDashboardSummary`、`useDashboardStationGeojson`、`useDashboardTrends24h`
- [x] `alertRefreshInterval` 接入 `useAlerts`
- [x] `aiStreamingEnabled` 控制 AI chat 使用 SSE 或非流式 endpoint
- [x] `themeMode` 同步到 `next-themes`
- [x] `emptyBikeThreshold`、`fullOccupancyThreshold` 前端展示生效
- [x] `aiTokenBudget` 前端展示生效
- [x] `reset()` 恢复所有默认值

## 5. 页面完整性

- [x] `/` 运营态势大屏（KPI + 地图 + 趋势 + 风险 + 区域 + ETL）
- [x] `/regions` 区域分析（列表 + 高亮跳转）
- [x] `/stations` 站点列表（搜索 + 过滤）
- [x] `/stations/[code]` 站点详情（24h 趋势 + 基本信息）
- [x] `/alerts` 告警中心（级别/状态过滤 + 统计）
- [x] `/trends` 历史趋势（24h 双轴图 + KPI）
- [x] `/etl` ETL 状态（feed 健康 + 同步历史）
- [x] `/ai` AI 运营助手（全屏 chat）
- [x] `/settings` 系统设置（8 项配置 + 数据源状态 + 重置）

## 6. 响应式与视觉

- [x] 大屏布局 `xl:grid-cols-12` 正确折叠为单列
- [x] AI Drawer `sm:max-w-[480px] xl:max-w-[620px]` 响应式宽度
- [x] 告警表格在小屏下横向滚动（grid 列宽固定）
- [x] 地图 popup 在移动端可正常关闭
- [x] neon 配色体系一致（cyan / violet / lime / rose / amber / slate）
- [x] `color-mix` 染色 idiom 统一使用

## 7. 代码质量

- [x] 无未使用的 import（`X` 已从 `ai-chat-drawer.tsx` 移除）
- [x] `useAiChat` hook 提取，消除 `AiChatDrawer` / `AiPage` 重复逻辑
- [x] apikey.txt 未出现在任何源码、日志或 HTTP 响应中
- [x] 所有 fetch 错误均做降级处理（空数组 / 上一帧数据 / 友好提示）

## 8. 已知限制（非阻塞）

- [ ] 无真实 GBFS feed 接入（当前为 Mock 数据）
- [ ] 无用户登录 / 多 session 隔离
- [ ] 无持久化对话历史（刷新即清空）
- [ ] 告警阈值仅前端展示，后端告警规则引擎未接入
- [ ] 地图底图为 Carto raster，无矢量切片细节

---

## 结论

**项目达到可演示状态。**

所有 M0-M6 里程碑已完成，前后端均可独立启动，核心功能（大屏、AI、站点、区域、告警、趋势、ETL、设置）全部可用。
