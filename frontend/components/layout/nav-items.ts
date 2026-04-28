import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bot,
  Cog,
  Compass,
  LayoutDashboard,
  MapPin,
  Workflow,
  type LucideIcon,
} from "lucide-react";

export type NavStage = "M0" | "M1" | "M2" | "M3" | "M4" | "M5" | "M6" | "M7" | "—";

export type NavItem = {
  href: string;
  label: string;
  desc: string;
  icon: LucideIcon;
  stage: NavStage;
  group: "运营" | "数据" | "智能";
  ready: boolean;
};

export const navItems: NavItem[] = [
  {
    href: "/",
    label: "运营态势",
    desc: "首页大屏 KPI / 地图 / 风险 / 告警",
    icon: LayoutDashboard,
    stage: "M2",
    group: "运营",
    ready: false,
  },
  {
    href: "/regions",
    label: "区域分析",
    desc: "城市区域排行 · 多维对比",
    icon: Compass,
    stage: "M4",
    group: "运营",
    ready: false,
  },
  {
    href: "/stations",
    label: "站点管理",
    desc: "站点列表 · 详情 · 邻近 KNN",
    icon: MapPin,
    stage: "M4",
    group: "运营",
    ready: false,
  },
  {
    href: "/alerts",
    label: "告警中心",
    desc: "实时告警 · 处置 · 规则",
    icon: AlertTriangle,
    stage: "M5",
    group: "运营",
    ready: false,
  },
  {
    href: "/trends",
    label: "历史趋势",
    desc: "24h / 7d 时序 · 占用率 · 可用车",
    icon: BarChart3,
    stage: "M5",
    group: "数据",
    ready: false,
  },
  {
    href: "/etl",
    label: "ETL 管理",
    desc: "数据源 · GBFS feed · 抓取日志",
    icon: Workflow,
    stage: "M5",
    group: "数据",
    ready: false,
  },
  {
    href: "/ai",
    label: "AI 助手",
    desc: "Kimi 驱动的运营分析对话",
    icon: Bot,
    stage: "M3",
    group: "智能",
    ready: false,
  },
  {
    href: "/settings",
    label: "系统设置",
    desc: "主题 · 阈值 · 偏好",
    icon: Cog,
    stage: "—",
    group: "智能",
    ready: false,
  },
];

export const platformBrand = {
  name: "BikeOps",
  fullName: "共享单车监控与运营分析平台",
  tagline: "Spatiotemporal Mobility Console",
  version: "0.1.0 · M0+M1",
  icon: Activity,
};
