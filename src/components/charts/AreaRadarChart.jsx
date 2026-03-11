import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

export function AreaRadarChart({ data, title = "영역별 평균 등급" }) {
  // 등급은 낮을수록 좋으므로 시각화 시 6-value로 반전 표시
  const displayData = data.map((d) => ({
    ...d,
    display: d.value != null ? parseFloat((6 - d.value).toFixed(1)) : 0,
  }));

  return (
    <div className="bg-white rounded-xl border p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={260}>
        <RadarChart data={displayData}>
          <PolarGrid />
          <PolarAngleAxis dataKey="area" tick={{ fontSize: 11 }} />
          <PolarRadiusAxis domain={[0, 5]} tick={false} />
          <Radar
            dataKey="display"
            stroke="#2563EB"
            fill="#2563EB"
            fillOpacity={0.3}
          />
          <Tooltip
            formatter={(_, __, props) => [
              props.payload.value != null ? `${props.payload.value}등급` : "—",
              "평균 등급",
            ]}
          />
        </RadarChart>
      </ResponsiveContainer>
      <p className="text-xs text-gray-400 text-center">※ 차트 외곽일수록 우수한 등급</p>
    </div>
  );
}
