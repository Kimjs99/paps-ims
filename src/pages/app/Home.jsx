import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart2, ChevronRight, Loader2 } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { useSettingsStore } from "../../store/settingsStore";
import { useStudents, useMeasurements } from "../../hooks/useSheets";
import { AppLayout } from "../../components/layout/AppLayout";
import { Card, CardContent } from "../../components/ui/card";
import { Progress } from "../../components/ui/progress";
import { Button } from "../../components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../../components/ui/select";

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { schoolName, schoolYear, teacherName } = useSettingsStore();
  const { data: students = [], isLoading: studentsLoading } = useStudents();
  const { data: measurements = [] } = useMeasurements();

  const [gradeFilter, setGradeFilter] = useState("all");

  // 학급 목록 도출 (grade-class 조합)
  const classes = useMemo(() => {
    const map = new Map();
    students.forEach((s) => {
      if (s.is_active === false) return;
      const key = `${s.grade}-${s.class}`;
      if (!map.has(key)) map.set(key, { grade: s.grade, class: s.class, key });
    });
    return Array.from(map.values()).sort((a, b) =>
      a.grade !== b.grade ? a.grade - b.grade : a.class - b.class
    );
  }, [students]);

  // 학년 목록 (필터용)
  const grades = useMemo(() => [...new Set(classes.map((c) => c.grade))].sort(), [classes]);

  // 학급별 진행률 계산
  const classStats = useMemo(() => {
    return classes.map(({ grade, class: cls, key }) => {
      const classStudents = students.filter(
        (s) => s.grade === grade && s.class === cls && s.is_active !== false
      );
      const completedIds = new Set(
        measurements
          .filter((m) => m.year === schoolYear)
          .map((m) => m.student_id)
      );
      const completed = classStudents.filter((s) => completedIds.has(s.student_id)).length;
      const total = classStudents.length;
      const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
      return { grade, class: cls, key, total, completed, progress };
    });
  }, [classes, students, measurements, schoolYear]);

  const filteredClasses = gradeFilter === "all"
    ? classStats
    : classStats.filter((c) => c.grade === Number(gradeFilter));

  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric", month: "long", day: "numeric", weekday: "short",
  });

  return (
    <AppLayout>
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{schoolName}</h1>
          <p className="text-gray-500 mt-0.5 text-sm">{today} · {teacherName || user?.name} 선생님</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
          <BarChart2 className="h-4 w-4" />
          <span className="hidden sm:inline">대시보드</span>
        </Button>
      </div>

      {/* 학년 필터 */}
      <div className="flex items-center gap-3 mb-4">
        <Select value={gradeFilter} onValueChange={setGradeFilter}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="학년 선택" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 학년</SelectItem>
            {grades.map((g) => (
              <SelectItem key={g} value={String(g)}>{g}학년</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-gray-500">{schoolYear}년도 측정 현황</span>
      </div>

      {/* 로딩 */}
      {studentsLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          <span className="ml-2 text-gray-500">학생 데이터를 불러오는 중...</span>
        </div>
      )}

      {/* 학급 없음 */}
      {!studentsLoading && filteredClasses.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg font-medium">등록된 학생이 없습니다</p>
          <p className="text-sm mt-1">학생 관리에서 학생을 먼저 등록해주세요</p>
          <Button className="mt-4" variant="outline" onClick={() => navigate("/students")}>
            학생 등록하러 가기
          </Button>
        </div>
      )}

      {/* 학급 카드 그리드 */}
      {!studentsLoading && filteredClasses.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClasses.map(({ grade, class: cls, key, total, completed, progress }) => (
            <Card
              key={key}
              className="cursor-pointer hover:shadow-md hover:border-blue-300 transition-all"
              onClick={() => navigate(`/measure/${key}`)}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-bold text-gray-900">
                    {grade}학년 {cls}반
                  </h2>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>측정 진행률</span>
                    <span className="font-semibold">{completed}/{total}명 ({progress}%)</span>
                  </div>
                  <Progress value={progress} className="h-2" aria-label={`${grade}학년 ${cls}반 측정 진행률 ${progress}%`} />
                </div>
                <div className="mt-3 flex gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                    완료 {completed}명
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                    미완료 {total - completed}명
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
