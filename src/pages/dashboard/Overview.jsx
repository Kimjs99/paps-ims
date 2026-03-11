import { useState } from "react";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { DashboardFilters } from "../../components/dashboard/DashboardFilters";
import { useDashboardFilters } from "../../hooks/useDashboard";
import { AreaRadarChart } from "../../components/charts/AreaRadarChart";
import { GenderComparisonChart } from "../../components/charts/GenderComparisonChart";
import { YearlyTrendChart } from "../../components/charts/YearlyTrendChart";
import { BmiScatterChart } from "../../components/charts/BmiScatterChart";
import { useDashboardData, useGenderComparison, useYearlyTrend, useScatterData } from "../../hooks/useDashboard";

const AREA_KEYS = ["total", "cardio", "muscle", "flexibility", "agility", "bmi"];
const AREA_LABELS = {
  total: "종합", cardio: "심폐지구력", muscle: "근력·근지구력",
  flexibility: "유연성", agility: "순발력", bmi: "비만",
};

export default function Overview() {
  const filters = useDashboardFilters();
  const { isLoading, dataUpdatedAt, areaAvgs, measurements, students, allMeasurements, availableYears, availableClasses } =
    useDashboardData(filters);

  const [selectedAreas, setSelectedAreas] = useState(["total"]);
  const toggleArea = (area) =>
    setSelectedAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );

  const genderData = useGenderComparison(measurements, students);
  const trendData = useYearlyTrend(allMeasurements);
  const scatterData = useScatterData(measurements);

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

        {/* 레이더 + 성별 비교 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AreaRadarChart data={areaAvgs} />
          <GenderComparisonChart data={genderData} />
        </div>

        {/* 연도별 추이 — 영역 토글 */}
        <div className="bg-white rounded-xl border p-4">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-sm font-semibold text-gray-700">연도별 추이</span>
            <div className="flex flex-wrap gap-1.5">
              {AREA_KEYS.map((area) => (
                <button
                  key={area}
                  onClick={() => toggleArea(area)}
                  className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                    selectedAreas.includes(area)
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {AREA_LABELS[area]}
                </button>
              ))}
            </div>
          </div>
          <YearlyTrendChart data={trendData} showAreas={selectedAreas} />
        </div>

        {/* BMI 산점도 */}
        <BmiScatterChart data={scatterData} />
      </div>
    </DashboardLayout>
  );
}
