import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
  ResponsiveContainer,
} from "recharts";

// 등급 값 반전: 1등급(최우수)→높은 막대, 5등급(최하)→낮은 막대
const invert = (v) => (v != null ? 6 - v : null);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border rounded-lg px-3 py-2 shadow text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.fill }}>
          {p.name}: {p.payload[p.dataKey.replace("Bar", "")] != null
            ? `${Number(p.payload[p.dataKey.replace("Bar", "")]).toFixed(1)}등급`
            : "—"}
        </p>
      ))}
    </div>
  );
};

export function GenderComparisonChart({ data }) {
  const chartData = data.map((d) => ({
    ...d,
    maleBar: invert(d.male),
    femaleBar: invert(d.female),
  }));

  return (
    <div className="bg-white rounded-xl border p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">성별 영역별 평균 등급 비교</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} barGap={4} margin={{ top: 20, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="area" tick={{ fontSize: 11 }} />
          <YAxis
            domain={[0, 5]}
            ticks={[1, 2, 3, 4, 5]}
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => `${6 - v}등급`}
            width={42}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(v) => (v === "maleBar" ? "남학생" : "여학생")}
          />
          <Bar dataKey="maleBar" name="maleBar" fill="#3B82F6" barSize={20} radius={[4, 4, 0, 0]}>
            <LabelList
              dataKey="maleBar"
              position="top"
              fontSize={11}
              fill="#3B82F6"
              formatter={(v) => (v != null ? (6 - v).toFixed(1) : "")}
            />
          </Bar>
          <Bar dataKey="femaleBar" name="femaleBar" fill="#EC4899" barSize={20} radius={[4, 4, 0, 0]}>
            <LabelList
              dataKey="femaleBar"
              position="top"
              fontSize={11}
              fill="#EC4899"
              formatter={(v) => (v != null ? (6 - v).toFixed(1) : "")}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="text-xs text-gray-400 text-center">※ 막대가 높을수록 우수한 등급</p>
    </div>
  );
}
