export function MeasurementStatusBadge({ status }) {
  const config = {
    incomplete: { label: "미측정", className: "bg-gray-100 text-gray-600" },
    complete: { label: "완료", className: "bg-green-100 text-green-700" },
    anomaly: { label: "이상값", className: "bg-red-100 text-red-700" },
  };
  const { label, className } = config[status] || config.incomplete;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
