import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const AREA_COLORS = {
  cardio: "#2563EB",
  muscle: "#16A34A",
  flexibility: "#D97706",
  agility: "#EA580C",
  bmi: "#7C3AED",
  total: "#374151",
};

const AREA_LABELS = {
  cardio: "심폐지구력",
  muscle: "근력·근지구력",
  flexibility: "유연성",
  agility: "순발력",
  bmi: "비만",
  total: "종합",
};

export function YearlyTrendChart({
  data,
  showAreas = ["total"],
  xKey = "year",
  title = "연도별 체력 등급 추이",
  bare = false,
}) {
  const emptyMsg = bare ? (
    <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
      데이터가 없습니다
    </div>
  ) : (
    <div className="bg-white rounded-xl border p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">{title}</h3>
      <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
        데이터가 없습니다
      </div>
    </div>
  );

  if (!data.length) return emptyMsg;

  const chart = (
    <>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 20, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
          <YAxis
            domain={[1, 5]}
            reversed
            tick={{ fontSize: 12 }}
            tickFormatter={(v) => `${v}등급`}
          />
          <Tooltip formatter={(v, name) => [`${v}등급`, AREA_LABELS[name] ?? name]} />
          <Legend formatter={(v) => AREA_LABELS[v] ?? v} />
          {showAreas.map((area) => (
            <Line
              key={area}
              type="monotone"
              dataKey={area}
              stroke={AREA_COLORS[area]}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <p className="text-xs text-gray-400 text-center">※ Y축: 낮을수록 우수한 등급</p>
    </>
  );

  if (bare) return chart;

  return (
    <div className="bg-white rounded-xl border p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">{title}</h3>
      {chart}
    </div>
  );
}
