import { useSearchParams } from "react-router-dom";

const SelectField = ({ label, value, onChange, options, placeholder = "전체" }) => (
  <div className="flex items-center gap-2">
    <span className="text-sm text-gray-600 whitespace-nowrap">{label}</span>
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      className="text-sm border rounded-md px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  </div>
);

export function DashboardFilters({ availableYears = [], availableClasses = [] }) {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = {
    year: searchParams.get("year") || null,
    grade: searchParams.get("grade") || null,
    class: searchParams.get("class") || null,
    gender: searchParams.get("gender") || null,
  };

  const updateFilter = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (!value) params.delete(key);
    else params.set(key, value);
    // 학년 변경 시 반 초기화
    if (key === "grade") params.delete("class");
    setSearchParams(params, { replace: true });
  };

  const resetAll = () => setSearchParams({}, { replace: true });
  const hasFilter = Object.values(filters).some(Boolean);

  const yearOptions = availableYears.map((y) => ({ value: String(y), label: `${y}년` }));
  const gradeOptions = [1, 2, 3].map((g) => ({ value: String(g), label: `${g}학년` }));
  const classOptions = availableClasses.map((c) => ({ value: String(c), label: `${c}반` }));
  const genderOptions = [
    { value: "M", label: "남" },
    { value: "F", label: "여" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3 bg-white rounded-xl border px-4 py-3">
      <SelectField
        label="연도"
        value={filters.year}
        onChange={(v) => updateFilter("year", v)}
        options={yearOptions}
      />
      <SelectField
        label="학년"
        value={filters.grade}
        onChange={(v) => updateFilter("grade", v)}
        options={gradeOptions}
      />
      <SelectField
        label="반"
        value={filters.class}
        onChange={(v) => updateFilter("class", v)}
        options={classOptions}
        placeholder="전체 반"
      />
      <SelectField
        label="성별"
        value={filters.gender}
        onChange={(v) => updateFilter("gender", v)}
        options={genderOptions}
      />
      {hasFilter && (
        <button
          onClick={resetAll}
          className="text-xs text-gray-400 hover:text-gray-600 underline"
        >
          초기화
        </button>
      )}
    </div>
  );
}
