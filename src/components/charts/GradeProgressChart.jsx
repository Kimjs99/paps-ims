export function GradeProgressChart({ data }) {
  return (
    <div className="bg-white rounded-xl border p-4 space-y-3">
      <h3 className="text-sm font-semibold text-gray-700">학년별 측정 진행률</h3>
      {data.map((item) => (
        <div key={item.grade}>
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium">{item.label}</span>
            <span className="text-gray-500">
              {item.measured}/{item.total}명 ({item.rate}%)
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${item.rate}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
