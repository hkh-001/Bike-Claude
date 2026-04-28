# 共享单车时空出行监控与运营分析平台

一个完整的多功能 Web 平台，覆盖共享单车的运营态势总览、区域分析、站点管理、告警监控、历史趋势、ETL 数据源管理、AI 运营助手等场景。

> **首页是数据大屏，但项目不是单纯的数据大屏。**

---

## 功能概览

| 页面 | 路径 | 说明 |
|---|---|---|
| **运营态势大屏** | `/` | 城市级 KPI 指标、MapLibre 站点散点地图、24h 趋势图、风险站点、区域排行、ETL 健康条 |
| **区域分析** | `/regions` | 区域列表、高亮跳转、站点数/可借车/占用率排行 |
| **站点管理** | `/stations` | 150 站点列表、搜索过滤、站点详情页（含 24h 趋势） |
| **告警中心** | `/alerts` | 实时告警列表、级别/状态过滤、统计徽章 |
| **历史趋势** | `/trends` | 全站 24h 借还/占用率趋势、KPI 卡片 |
| **ETL 状态** | `/etl` | 数据源 feed 健康度、同步历史、启停控制 |
| **AI 运营助手** | `/ai` | Kimi AI 对话、SSE 流式、Tool-calling（实时数据查询）、站点/区域代码自动链接 |
| **系统设置** | `/settings` | 主题、刷新频率、告警阈值、Token 预算、SSE 开关、数据源状态、重置 |

---

## 里程碑状态

| 里程碑 | 状态 | 核心交付 |
|---|---|---|
| **M0 脚手架** | ✅ 已完成 | FastAPI 骨架、健康接口、Kimi key 安全读取、Next.js + Tailwind v4 + shadcn 初始化 |
| **M1 数据模型 + Dashboard Mock API** | ✅ 已完成 | SQLModel 模型、Mock seed、`/api/dashboard/*` 端点群 |
| **M2 首页大屏** | ✅ 已完成 | KPI Bar、MapLibre 150 站点地图、ECharts 24h 趋势、Risk / Alert / Region / ETL panels |
| **M3 AI 助手** | ✅ 已完成 | SSE 流式 `/api/ai/chat/stream`、Tool-calling（KPI / 风险 / 告警）、`kimi-k2.6`、站点/区域代码链接 |
| **M4 站点 + 区域** | ✅ 已完成 | 站点列表/详情（含趋势）、区域分析页、高亮跳转 |
| **M5 告警 + 趋势 + ETL** | ✅ 已完成 | 告警中心、历史趋势页、ETL 状态页 |
| **M6 项目收官** | ✅ 已完成 | 设置页配置真正生效（刷新频率/SSE 开关）、README 完善、构建验证、健康检查 |

---

## 技术栈

- **前端**：Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui
- **后端**：FastAPI + Python 3.11+ + SQLModel + OpenAI SDK（Kimi 兼容）
- **数据库（开发期）**：SQLite
- **数据库（正式方案）**：PostgreSQL + PostGIS（地理空间索引、ST_Contains、ST_DWithin/`<->` KNN）
- **AI**：Kimi / Moonshot API，`kimi-k2.6`，SSE 流式 + Tool-calling
- **图表**：ECharts（echarts-for-react）
- **地图**：MapLibre GL JS

---

## 启动方式

### 后端

```bash
cd backend
.venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8765 --reload
```

启动成功标志：`Uvicorn running on http://127.0.0.1:8765`

### 前端

```bash
cd frontend
npm run dev
```

启动成功标志：`▲ Next.js 16.x.x` 与 `Local: http://localhost:3000`

### 环境变量

- 项目根目录的 `apikey.txt` 存放 **Kimi/Moonshot API Key**（已存在，已加入 `.gitignore`）
  - 后端 [`app/core/secrets.py`](backend/app/core/secrets.py) 读取，不硬编码、不泄露到日志/响应
- `frontend/.env.local`：`NEXT_PUBLIC_API_BASE=http://127.0.0.1:8765`

---

## 验证方式

```bash
# 后端健康
curl http://127.0.0.1:8765/api/health
# → {"ok": true, "version": "0.1.0"}

# AI 健康
curl http://127.0.0.1:8765/api/ai/health
# → {"ok": true, "key_loaded": true, "model": "kimi-k2.6", ...}

# Dashboard
curl http://127.0.0.1:8765/api/dashboard/summary
curl http://127.0.0.1:8765/api/dashboard/stations/geojson
curl http://127.0.0.1:8765/api/dashboard/trends/24h

# ETL
curl http://127.0.0.1:8765/api/dashboard/etl/health

# 后端测试
cd backend && pytest

# 前端构建
cd frontend && npm run build
```

---

## 目录结构

```
bike-claude/
├── apikey.txt                    # Kimi/Moonshot Key（不入 git）
├── .gitignore
├── README.md
│
├── backend/
│   ├── pyproject.toml
│   ├── app/
│   │   ├── main.py               # FastAPI 应用入口
│   │   ├── core/                 # config, secrets, logging
│   │   ├── db/                   # session, init_db
│   │   ├── models/               # SQLModel 表定义
│   │   ├── schemas/              # Pydantic DTO
│   │   ├── services/             # 业务逻辑（dashboard, kimi_client, ai_tools）
│   │   ├── api/                  # 路由（dashboard, ai, etl, stations, regions, alerts, trends）
│   │   └── mock/                 # Mock fixtures + seed
│   └── tests/
│
└── frontend/
    ├── app/
    │   ├── page.tsx              # 运营态势大屏（独立布局，无 sidebar）
    │   ├── (platform)/           # 功能页路由组（共享 AppShell sidebar）
    │   │   ├── layout.tsx
    │   │   └── {regions,stations,alerts,trends,etl,ai,settings}/page.tsx
    │   └── providers.tsx         # QueryClient + ThemeProvider
    ├── components/
    │   ├── layout/               # AppShell / Sidebar / PageHeader
    │   ├── dashboard/            # 大屏各 panel
    │   ├── ai/                   # AI Drawer / MessageList / Input / ToolCallCard
    │   ├── settings/             # 设置卡片群
    │   └── common/               # loading / empty / error 三态
    ├── lib/
    │   ├── api/                  # API 客户端 + SSE 流式解析
    │   ├── hooks/                # React Query hooks + useAppSettings + useAiChat
    │   └── utils.ts              # cn() 等工具
    └── types/                    # 前端类型定义
```

---

## AI 助手能力

- **自然语言查询**："现在空车风险最严重的 3 个站点"
- **Tool-calling**：AI 自动调用 `get_kpi_summary`、`get_station_risks`、`get_recent_alerts` 获取真实数据
- **SSE 流式**：逐字输出，可开关（设置页）
- **代码链接**：回答中的站点代码（如 `BJ-CP-S001`）自动链接到站点详情；区域代码自动链接到区域分析
- ** reasoning_content**：`kimi-k2.6` 的推理内容保留，支持多轮 tool-call（上限 4 轮）

---

## 关键设计决策

1. **apikey.txt 安全**：从项目根目录读取，不硬编码、不进入日志或 HTTP 响应
2. **前端设置即时生效**：`dashboardRefreshInterval`、`alertRefreshInterval`、`aiStreamingEnabled` 通过 hooks 参数传递，修改后下一轮 refetch 即生效
3. **React Query 三态**：所有数据面板统一使用 `isLoading + error + data` 三态，失败保留上一次成功数据（`placeholderData`）
4. **MapLibre 无 token 底图**：使用 Carto Dark Matter raster，零配置即开即用
5. **Next.js 16 适配**：`useSearchParams` 包在 `Suspense` 边界内，客户端组件不导出 `metadata`
