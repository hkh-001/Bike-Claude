"use client";

import { useParams } from "next/navigation";
import { useStationDetail } from "@/lib/hooks/use-station-detail";
import { useStationHistory } from "@/lib/hooks/use-station-history";
import { useStationAlerts } from "@/lib/hooks/use-station-alerts";
import { StationDetailHeader } from "@/components/stations/station-detail-header";
import { StationStatusCards } from "@/components/stations/station-status-card";
import { StationHistoryChart } from "@/components/stations/station-history-chart";
import { StationAlertsTimeline } from "@/components/stations/station-alerts-timeline";
import { ErrorState } from "@/components/common/error-state";

export default function StationDetailPage() {
  const params = useParams();
  const code = typeof params.code === "string" ? params.code : "";

  const {
    data: station,
    isLoading: stationLoading,
    error: stationError,
  } = useStationDetail(code);

  const {
    data: history,
    isLoading: historyLoading,
  } = useStationHistory(code);

  const {
    data: alertsData,
    isLoading: alertsLoading,
  } = useStationAlerts(code);

  if (stationError) {
    const status = (stationError as any)?.status;
    const is404 = status === 404;
    return (
      <div className="flex flex-col gap-6">
        <StationDetailHeader isLoading={false} />
        <ErrorState
          title={is404 ? "站点不存在" : "加载失败"}
          description={
            is404
              ? `未找到站点 ${code}，请检查链接或返回站点列表。`
              : (stationError as Error).message || "无法获取站点数据"
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <StationDetailHeader station={station} isLoading={stationLoading} />
      <StationStatusCards station={station} isLoading={stationLoading} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <StationHistoryChart data={history} isLoading={historyLoading} />
        </div>
        <div>
          <StationAlertsTimeline alerts={alertsData?.items} isLoading={alertsLoading} />
        </div>
      </div>
    </div>
  );
}
