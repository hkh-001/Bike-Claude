"""SQLModel 数据模型集合.

表清单：
- region                    区域
- station                   站点
- cur_station_status        **当前状态表**（每站 1 行，被 ETL 持续 upsert）
- fact_station_snapshot     **历史快照事实表**（append-only，时序）
- alert / alert_rule        告警与规则
- data_source / gbfs_feed   数据源
- fetch_log                 抓取日志

所有时间字段使用 UTC datetime（无时区，应用内统一约定 UTC）。
"""
