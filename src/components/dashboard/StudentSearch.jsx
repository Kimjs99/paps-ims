// 학생 검색 UI — StudentDetail.jsx에서 분리 (/dashboard/student — id 없을 때 표시)
import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";

export function StudentSearch({ students }) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    return students
      .filter((s) => s.is_active)
      .filter(
        (s) =>
          s.name?.toLowerCase().includes(q) ||
          String(s.student_id).includes(q)
      )
      .slice(0, 20);
  }, [students, query]);

  return (
    <div className="max-w-lg">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">학생 검색</h2>
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="이름 또는 학번으로 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
        />
      </div>
      {query.trim() && (
        <div className="bg-white rounded-xl border overflow-hidden">
          {results.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">검색 결과가 없습니다</div>
          ) : (
            <div className="divide-y">
              {results.map((s) => (
                <Link
                  key={s.student_id}
                  to={`/dashboard/student/${s.student_id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <span className="text-sm font-medium text-gray-800">{s.name}</span>
                    <span className="ml-2 text-xs text-gray-400">{s.student_id}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {s.grade}학년 {s.class}반 · {s.gender === "M" ? "남" : "여"}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
