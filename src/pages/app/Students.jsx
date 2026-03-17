import { useState, useMemo, useRef } from "react";
import { Search, UserPlus, Upload, Download, Loader2, Trash2, UserX } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { v4 as uuidv4 } from "uuid";
import { useStudents, useAddStudent, useBulkAddStudents, useDeactivateStudent, useDeactivateClassStudents } from "../../hooks/useSheets";
import { studentSchema } from "../../utils/validators";
import { AppLayout } from "../../components/layout/AppLayout";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "../../components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../../components/ui/select";
import { toast } from "../../store/toastStore";

function StudentForm({ onSubmit, isLoading }) {
  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(studentSchema),
    defaultValues: { gender: "M", grade: 1, class: 1 },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>학번 *</Label>
          <Input {...register("student_id")} placeholder="예: 20240101" />
          {errors.student_id && <p className="text-xs text-red-500">{errors.student_id.message}</p>}
        </div>
        <div className="space-y-1">
          <Label>이름 *</Label>
          <Input {...register("name")} placeholder="홍길동" />
          {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
        </div>
        <div className="space-y-1">
          <Label>성별 *</Label>
          <Select defaultValue="M" onValueChange={(v) => setValue("gender", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="M">남</SelectItem>
              <SelectItem value="F">여</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>학년 *</Label>
          <Select defaultValue="1" onValueChange={(v) => setValue("grade", Number(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {[1, 2, 3].map((g) => <SelectItem key={g} value={String(g)}>{g}학년</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>반 *</Label>
          <Input type="number" {...register("class")} placeholder="1" min={1} max={20} />
          {errors.class && <p className="text-xs text-red-500">{errors.class.message}</p>}
        </div>
        <div className="space-y-1">
          <Label>키 (cm) *</Label>
          <Input type="number" {...register("height")} placeholder="165" />
          {errors.height && <p className="text-xs text-red-500">{errors.height.message}</p>}
        </div>
        <div className="space-y-1">
          <Label>몸무게 (kg) *</Label>
          <Input type="number" {...register("weight")} placeholder="60" />
          {errors.weight && <p className="text-xs text-red-500">{errors.weight.message}</p>}
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> 등록 중...</> : "학생 등록"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export default function Students() {
  const { data: students = [], isLoading } = useStudents();
  const addStudent = useAddStudent();
  const bulkAdd = useBulkAddStudents();
  const deactivate = useDeactivateStudent();
  const deactivateClass = useDeactivateClassStudents();
  const fileRef = useRef();

  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [csvPreview, setCsvPreview] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null); // {student, rowIndex}
  const [classDeleteConfirm, setClassDeleteConfirm] = useState(false);

  const filtered = useMemo(() => {
    return students.filter((s) => {
      const matchSearch = search === "" ||
        s.name.includes(search) ||
        s.student_id.includes(search);
      const matchGrade = gradeFilter === "all" || s.grade === Number(gradeFilter);
      const matchClass = classFilter === "all" || s.class === Number(classFilter);
      return matchSearch && matchGrade && matchClass;
    });
  }, [students, search, gradeFilter, classFilter]);

  const grades = useMemo(() => [...new Set(students.map((s) => s.grade))].sort(), [students]);
  const classes = useMemo(
    () => [...new Set(students
      .filter((s) => gradeFilter === "all" || s.grade === Number(gradeFilter))
      .map((s) => s.class))].sort((a, b) => a - b),
    [students, gradeFilter]
  );

  const handleAddStudent = async (data) => {
    try {
      await addStudent.mutateAsync({ ...data, student_id: data.student_id || uuidv4() });
      toast.success(`${data.name} 학생이 등록됐습니다.`);
      setDialogOpen(false);
    } catch (err) {
      console.error("[addStudent]", err);
      toast.error(`등록 실패: ${err?.message || "알 수 없는 오류"}`);
    }
  };

  // CSV 파싱: student_id,name,gender,grade,class,height,weight
  const handleCsvFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const lines = ev.target.result.split("\n").filter((l) => l.trim());
      const parsed = lines.slice(1).map((line) => {
        const [student_id, name, gender, grade, cls, height, weight] = line.split(",").map((v) => v.trim());
        return {
          student_id, name,
          gender: gender?.toUpperCase() === "F" ? "F" : "M",
          grade: Number(grade), class: Number(cls),
          height: Number(height), weight: Number(weight),
        };
      }).filter((s) => s.student_id && s.name);
      setCsvPreview(parsed);
    };
    reader.readAsText(file);
  };

  const handleCsvTemplateDownload = () => {
    const header = "student_id,name,gender,grade,class,height,weight";
    const examples = [
      "20240101,홍길동,M,1,1,165,58",
      "20240102,김영희,F,1,1,158,52",
    ].join("\n");
    const blob = new Blob([`${header}\n${examples}\n`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "students_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // 개별 학생 비활성화
  const handleDeactivate = async () => {
    if (!deleteTarget) return;
    try {
      await deactivate.mutateAsync(deleteTarget);
      toast.success(`${deleteTarget.student.name} 학생이 비활성화됐습니다.`);
      setDeleteTarget(null);
    } catch (err) {
      console.error("[deactivateStudent]", err);
      toast.error(`비활성화 실패: ${err?.message || "알 수 없는 오류"}`);
    }
  };

  // 학급 전체 비활성화 (현재 필터 기준)
  const handleDeactivateClass = async () => {
    const activeInClass = filtered.filter((s) => s.is_active !== false);
    if (activeInClass.length === 0) return;
    const items = activeInClass.map((s) => ({
      rowIndex: students.findIndex((st) => st.student_id === s.student_id),
      student: s,
    }));
    try {
      await deactivateClass.mutateAsync(items);
      toast.success(`${activeInClass.length}명이 비활성화됐습니다.`);
      setClassDeleteConfirm(false);
    } catch (err) {
      console.error("[deactivateClassStudents]", err);
      toast.error(`학급 비활성화 실패: ${err?.message || "알 수 없는 오류"}`);
    }
  };

  const handleCsvUpload = async () => {
    if (!csvPreview) return;
    try {
      await bulkAdd.mutateAsync(csvPreview);
      toast.success(`${csvPreview.length}명이 등록됐습니다.`);
      setCsvPreview(null);
    } catch (err) {
      console.error("[bulkAddStudents]", err);
      toast.error(`일괄 등록 실패: ${err?.message || "알 수 없는 오류"}`);
    }
  };

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">학생 관리</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCsvTemplateDownload}>
            <Download className="h-4 w-4" /> 템플릿
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4" /> CSV 업로드
          </Button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCsvFile} />
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <UserPlus className="h-4 w-4" /> 신규 등록
          </Button>
        </div>
      </div>

      {/* CSV 미리보기 */}
      {csvPreview && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-blue-800">{csvPreview.length}명 파싱됨 — 등록하시겠습니까?</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setCsvPreview(null)}>취소</Button>
              <Button size="sm" onClick={handleCsvUpload} disabled={bulkAdd.isPending}>
                {bulkAdd.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "일괄 등록"}
              </Button>
            </div>
          </div>
          <div className="text-xs text-blue-600 space-y-0.5 max-h-24 overflow-auto">
            {csvPreview.slice(0, 5).map((s, i) => (
              <p key={i}>{s.student_id} / {s.name} / {s.grade}학년 {s.class}반</p>
            ))}
            {csvPreview.length > 5 && <p>... 외 {csvPreview.length - 5}명</p>}
          </div>
        </div>
      )}

      {/* 필터 */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            className="pl-8"
            placeholder="이름 또는 학번 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={gradeFilter} onValueChange={(v) => { setGradeFilter(v); setClassFilter("all"); }}>
          <SelectTrigger className="w-28"><SelectValue placeholder="학년" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 학년</SelectItem>
            {grades.map((g) => <SelectItem key={g} value={String(g)}>{g}학년</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={classFilter} onValueChange={setClassFilter}>
          <SelectTrigger className="w-24"><SelectValue placeholder="반" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 반</SelectItem>
            {classes.map((c) => <SelectItem key={c} value={String(c)}>{c}반</SelectItem>)}
          </SelectContent>
        </Select>
        {gradeFilter !== "all" && classFilter !== "all" && (
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 border-red-200 hover:bg-red-50"
            onClick={() => setClassDeleteConfirm(true)}
          >
            <UserX className="h-4 w-4" />
            {gradeFilter}학년 {classFilter}반 전체 비활성화
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-blue-500 mr-2" />
          <span className="text-gray-500">로딩 중...</span>
        </div>
      ) : (
        <div className="bg-white border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>학번</TableHead>
                <TableHead>이름</TableHead>
                <TableHead className="text-center">성별</TableHead>
                <TableHead className="text-center">학년</TableHead>
                <TableHead className="text-center">반</TableHead>
                <TableHead className="text-center">키(cm)</TableHead>
                <TableHead className="text-center">몸무게(kg)</TableHead>
                <TableHead className="text-center">상태</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-gray-400">
                    {students.length === 0 ? "등록된 학생이 없습니다" : "검색 결과가 없습니다"}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((s) => {
                  const rowIndex = students.findIndex((st) => st.student_id === s.student_id);
                  return (
                    <TableRow key={s.student_id} className={s.is_active === false ? "opacity-50" : ""}>
                      <TableCell className="font-mono text-sm">{s.student_id}</TableCell>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="text-center">{s.gender === "M" ? "남" : "여"}</TableCell>
                      <TableCell className="text-center">{s.grade}</TableCell>
                      <TableCell className="text-center">{s.class}</TableCell>
                      <TableCell className="text-center">{s.height}</TableCell>
                      <TableCell className="text-center">{s.weight}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={s.is_active !== false ? "default" : "secondary"}>
                          {s.is_active !== false ? "활성" : "비활성"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {s.is_active !== false && (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`${s.name} 비활성화`}
                            className="h-7 w-7 text-gray-400 hover:text-red-500"
                            onClick={() => setDeleteTarget({ rowIndex, student: s })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          <div className="px-4 py-2 text-xs text-gray-400 border-t">
            총 {filtered.length}명 / 전체 {students.length}명
          </div>
        </div>
      )}

      {/* 학생 추가 Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>신규 학생 등록</DialogTitle>
          </DialogHeader>
          <StudentForm onSubmit={handleAddStudent} isLoading={addStudent.isPending} />
        </DialogContent>
      </Dialog>

      {/* 개별 학생 비활성화 확인 */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>학생 비활성화</DialogTitle>
            <DialogDescription>
              <strong>{deleteTarget?.student?.name}</strong> 학생을 비활성화하시겠습니까?
              <br />
              측정 이력은 보존되며, 학생 목록에서 제외됩니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>취소</Button>
            <Button
              variant="destructive"
              onClick={handleDeactivate}
              disabled={deactivate.isPending}
            >
              {deactivate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "비활성화"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 학급 전체 비활성화 확인 */}
      <Dialog open={classDeleteConfirm} onOpenChange={setClassDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>학급 전체 비활성화</DialogTitle>
            <DialogDescription>
              <strong>{gradeFilter}학년 {classFilter}반</strong>의 활성 학생{" "}
              <strong>{filtered.filter((s) => s.is_active !== false).length}명</strong>을 모두 비활성화하시겠습니까?
              <br />
              측정 이력은 보존됩니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setClassDeleteConfirm(false)}>취소</Button>
            <Button
              variant="destructive"
              onClick={handleDeactivateClass}
              disabled={deactivateClass.isPending}
            >
              {deactivateClass.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "전체 비활성화"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
