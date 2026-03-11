import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { GRADE_COLORS } from "../../constants/paps";

export function BmiScatterChart({ data }) {
  if (!data.length) {
    return (
      <div className="bg-white rounded-xl border p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">BMI vs 종합 등급 상관관계</h3>
        <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
          데이터가 없습니다
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">BMI vs 종합 등급 상관관계</h3>
      <ResponsiveContainer width="100%" height={260}>
        <ScatterChart margin={{ top: 20, right: 8, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="bmi"
            name="BMI"
            type="number"
            domain={["auto", "auto"]}
            tick={{ fontSize: 11 }}
            label={{ value: "BMI", position: "insideBottom", offset: -2, fontSize: 11 }}
          />
          <YAxis
            dataKey="total_grade"
            name="종합 등급"
            type="number"
            domain={[1, 5]}
            reversed
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => `${v}등급`}
          />
          <Tooltip
            formatter={(v, name) => [
              name === "total_grade" ? `${v}등급` : v,
              name === "total_grade" ? "종합 등급" : "BMI",
            ]}
          />
          <Scatter data={data} fillOpacity={0.7}>
            {data.map((entry, i) => (
              <Cell key={i} fill={GRADE_COLORS[entry.total_grade] ?? "#9CA3AF"} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
