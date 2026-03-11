import { Users, CheckCircle, Star, AlertCircle } from "lucide-react";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { KpiCard } from "../../components/dashboard/KpiCard";
import { DashboardFilters } from "../../components/dashboard/DashboardFilters";
import { useDashboardFilters } from "../../hooks/useDashboard";
import { GradeQuickFilter } from "../../components/dashboard/GradeQuickFilter";
import { GradeDistributionChart } from "../../components/charts/GradeDistributionChart";
import { GradeProgressChart } from "../../components/charts/GradeProgressChart";
import { AreaRadarChart } from "../../components/charts/AreaRadarChart";
import { useDashboardData } from "../../hooks/useDashboard";

export default function DashboardHome() {
  const filters = useDashboardFilters();
  const {
    isLoading,
    dataUpdatedAt,
    kpi,
    gradeDistribution,
    gradeProgress,
    areaAvgs,
    measurements,
    students,
    availableYears,
    availableClasses,
  } = useDashboardData(filters);

  if (isLoading) {
    return (
      <DashboardLayout dataUpdatedAt={dataUpdatedAt}>
        <div className="flex items-center justify-center h-64 text-gray-400">
          데이터를 불러오는 중...
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout dataUpdatedAt={dataUpdatedAt}>
      <div className="space-y-5 max-w-5xl">
        <DashboardFilters availableYears={availableYears} availableClasses={availableClasses} />

        {/* KPI 카드 4개 */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard
            title="측정 완료율"
            value={`${kpi.completionRate}%`}
            subtitle={`${kpi.measuredCount}명 완료`}
            icon={CheckCircle}
            color="blue"
          />
          <KpiCard
            title="측정 완료 학생"
            value={`${kpi.measuredCount}명`}
            subtitle={`전체 ${kpi.totalStudents}명`}
            icon={Users}
            color="green"
          />
          <KpiCard
            title="평균 종합 등급"
            value={kpi.avgTotalGrade ? `${kpi.avgTotalGrade}등급` : "—"}
            subtitle="전체 측정 학생 기준"
            icon={Star}
            color="amber"
          />
          <KpiCard
            title="미측정 학생"
            value={`${kpi.totalStudents - kpi.measuredCount}명`}
            subtitle="측정 필요"
            icon={AlertCircle}
            color="red"
          />
        </div>

        {/* 차트 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <GradeDistributionChart data={gradeDistribution} />
          <GradeProgressChart data={gradeProgress} />
        </div>

        <AreaRadarChart data={areaAvgs} />

        {/* 등급별 빠른 필터 */}
        <GradeQuickFilter measurements={measurements} students={students} />
      </div>
    </DashboardLayout>
  );
}
