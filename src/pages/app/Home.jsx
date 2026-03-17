import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart2, ChevronRight, Loader2, Trash2 } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { useSettingsStore } from "../../store/settingsStore";
import { useStudents, useMeasurements, useDeleteClassHard } from "../../hooks/useSheets";
import { AppLayout } from "../../components/layout/AppLayout";
import { Card, CardContent } from "../../components/ui/card";
import { Progress } from "../../components/ui/progress";
import { Button } from "../../components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../../components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "../../components/ui/dialog";
import { toast } from "../../store/toastStore";

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { schoolName, schoolYear, teacherName } = useSettingsStore();
  const { data: students = [], isLoading: studentsLoading } = useStudents();
  const { data: measurements = [] } = useMeasurements();
  const deleteClassHard = useDeleteClassHard();

  const [gradeFilter, setGradeFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState(null); // {grade, class}
  const [confirmText, setConfirmText] = useState("");

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

  const expectedConfirm = deleteTarget
    ? `${deleteTarget.grade}학년 ${deleteTarget.class}반`
    : "";

  const handleDeleteClass = async () => {
    if (!deleteTarget || confirmText !== expectedConfirm) return;
    const { grade, class: cls } = deleteTarget;

    // 해당 학급 학생의 전체 배열 내 인덱스
    const studentRowIndices = students
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => s.grade === grade && s.class === cls)
      .map(({ i }) => i);

    const targetStudentIds = new Set(
      studentRowIndices.map((i) => students[i].student_id)
    );

    // 해당 학생들의 측정 데이터 인덱스
    const measurementRowIndices = measurements
      .map((m, i) => ({ m, i }))
      .filter(({ m }) => targetStudentIds.has(m.student_id))
      .map(({ i }) => i);

    try {
      await deleteClassHard.mutateAsync({ studentRowIndices, measurementRowIndices });
      toast.success(`${grade}학년 ${cls}반 데이터가 완전 삭제됐습니다.`);
      setDeleteTarget(null);
      setConfirmText("");
    } catch (err) {
      console.error("[deleteClassHard]", err);
      toast.error(`삭제 실패: ${err?.message || "알 수 없는 오류"}`);
    }
  };

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
              className="cursor-pointer hover:shadow-md hover:border-blue-300 transition-all group"
              onClick={() => navigate(`/measure/${key}`)}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-bold text-gray-900">
                    {grade}학년 {cls}반
                  </h2>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`${grade}학년 ${cls}반 완전 삭제`}
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget({ grade, class: cls });
                        setConfirmText("");
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </div>
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
      {/* 학급 완전 삭제 확인 다이얼로그 */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) { setDeleteTarget(null); setConfirmText(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">학급 완전 삭제</DialogTitle>
            <DialogDescription>
              이 작업은 되돌릴 수 없습니다. {deleteTarget && `${deleteTarget.grade}학년 ${deleteTarget.class}반`}의 학생 정보와 모든 측정 데이터가 영구 삭제됩니다.
            </DialogDescription>
          </DialogHeader>
          {deleteTarget && (() => {
            const stat = classStats.find((c) => c.grade === deleteTarget.grade && c.class === deleteTarget.class);
            const mCount = measurements.filter((m) => {
              const ids = new Set(students.filter((s) => s.grade === deleteTarget.grade && s.class === deleteTarget.class).map((s) => s.student_id));
              return ids.has(m.student_id);
            }).length;
            return (
              <div className="space-y-4 py-2">
                <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700 space-y-1">
                  <p>· 학생 <strong>{stat?.total ?? 0}명</strong> 삭제</p>
                  <p>· 측정 기록 <strong>{mCount}건</strong> 삭제</p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-sm text-gray-600">
                    확인을 위해 <strong className="text-gray-900">{expectedConfirm}</strong> 을(를) 입력해주세요.
                  </p>
                  <input
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                    placeholder={expectedConfirm}
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                  />
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteTarget(null); setConfirmText(""); }}>
              취소
            </Button>
            <Button
              variant="destructive"
              disabled={confirmText !== expectedConfirm || deleteClassHard.isPending}
              onClick={handleDeleteClass}
            >
              {deleteClassHard.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-1" />삭제 중...</>
              ) : "완전 삭제"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
