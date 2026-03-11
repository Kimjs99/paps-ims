import { useState } from "react";
import { X } from "lucide-react";
import { Link } from "react-router-dom";
import { GradeBadge } from "../ui/GradeBadge";
import { GRADE_COLORS } from "../../constants/paps";

export function GradeQuickFilter({ measurements, students }) {
  const [activeGrade, setActiveGrade] = useState(null);

  const getStudentsByGrade = (grade) => {
    const measuredIds = new Set(
      measurements.filter((m) => m.total_grade === grade).map((m) => m.student_id)
    );
    return students
      .filter((s) => s.is_active && measuredIds.has(s.student_id))
      .map((s) => {
        const m = measurements.find(
          (x) => x.student_id === s.student_id && x.total_grade === grade
        );
        return { ...s, total_grade: grade, measured_at: m?.measured_at ?? "" };
      });
  };

  const toggleGrade = (grade) => setActiveGrade((prev) => (prev === grade ? null : grade));

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-medium text-gray-600">빠른 필터</span>
        <button
          onClick={() => toggleGrade(1)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
            activeGrade === 1
              ? "text-white border-transparent"
              : "bg-white text-gray-700 hover:bg-gray-50"
          }`}
          style={activeGrade === 1 ? { backgroundColor: GRADE_COLORS[1] } : {}}
        >
          ⭐ 1등급 우수 학생
        </button>
        <button
          onClick={() => toggleGrade(5)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
            activeGrade === 5
              ? "text-white border-transparent"
              : "bg-white text-gray-700 hover:bg-gray-50"
          }`}
          style={activeGrade === 5 ? { backgroundColor: GRADE_COLORS[5] } : {}}
        >
          🔔 5등급 관리 대상
        </button>
      </div>

      {activeGrade && (() => {
        const list = getStudentsByGrade(activeGrade);
        return (
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
              <span className="text-sm font-semibold text-gray-700">
                {activeGrade}등급 학생 — {list.length}명
              </span>
              <button
                onClick={() => setActiveGrade(null)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            </div>
            {list.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-sm">해당 학생이 없습니다</div>
            ) : (
              <div className="divide-y max-h-64 overflow-y-auto">
                {list.map((s) => (
                  <div key={s.student_id} className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-800">{s.name}</span>
                      <span className="text-xs text-gray-500">
                        {s.grade}학년 {s.class}반
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <GradeBadge grade={s.total_grade} />
                      {s.measured_at && (
                        <span className="text-xs text-gray-400">
                          {s.measured_at.slice(0, 10)}
                        </span>
                      )}
                      <Link
                        to={`/dashboard/student/${s.student_id}`}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        상세
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
