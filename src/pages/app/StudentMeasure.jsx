import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronLeft, Save, Loader2 } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { useAuthStore } from "../../store/authStore";
import { useSettingsStore } from "../../store/settingsStore";
import { useStudents, useMeasurements, useSaveMeasurement, useUpdateStudent } from "../../hooks/useSheets";
import { useCalculateGrades } from "../../hooks/useGradeCalc";
import { measurementSchema } from "../../utils/validators";
import { calcBMI } from "../../utils/bmiCalc";
import { CARDIO_TYPES, MUSCLE_TYPES, AGILITY_TYPES, GRADE_LABELS } from "../../constants/paps";
import { AppLayout } from "../../components/layout/AppLayout";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { GradeBadge } from "../../components/ui/GradeBadge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../../components/ui/select";
import { toast } from "../../store/toastStore";

const GRADE_AREA_LABELS = {
  cardio_grade: "심폐지구력",
  muscle_grade: "근력·근지구력",
  flexibility_grade: "유연성",
  agility_grade: "순발력",
  bmi_grade: "BMI",
};

export default function StudentMeasure() {
  const { classId, studentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { schoolYear } = useSettingsStore();
  const { data: students = [] } = useStudents();
  const { data: measurements = [] } = useMeasurements();
  const saveMutation = useSaveMeasurement();
  const updateStudent = useUpdateStudent();

  const student = students.find((s) => s.student_id === studentId);

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(measurementSchema),
    defaultValues: {
      height: undefined,
      weight: undefined,
      cardio_type: "shuttle_run",
      cardio_value: null,
      muscle_type: "sit_up",
      muscle_value: null,
      flexibility_value: null,
      agility_type: "sprint_50m",
      agility_value: null,
    },
  });

  // 폼 초기화: 학생 키/몸무게 → 기존 측정값 순으로 설정
  useEffect(() => {
    if (student) {
      setValue("height", student.height ?? undefined);
      setValue("weight", student.weight ?? undefined);
    }
    const existing = measurements.find(
      (m) => m.student_id === studentId && m.year === schoolYear
    );
    if (!existing) return;
    setValue("cardio_type", existing.cardio_type || "shuttle_run");
    setValue("cardio_value", existing.cardio_value ?? null);
    setValue("muscle_type", existing.muscle_type || "sit_up");
    setValue("muscle_value", existing.muscle_value ?? null);
    setValue("flexibility_value", existing.flexibility_value ?? null);
    setValue("agility_type", existing.agility_type || "sprint_50m");
    setValue("agility_value", existing.agility_value ?? null);
  }, [measurements, student, studentId, schoolYear, setValue]);

  // eslint-disable-next-line react-hooks/incompatible-library
  const watchedValues = watch();
  // 폼에서 입력한 키/몸무게를 등급 계산에 반영
  const studentWithFormBody = student
    ? { ...student, height: watchedValues.height ?? student.height, weight: watchedValues.weight ?? student.weight }
    : student;
  const grades = useCalculateGrades(watchedValues, studentWithFormBody);
  const bmi = calcBMI(watchedValues.height ?? student?.height, watchedValues.weight ?? student?.weight);

  const onSubmit = async (data) => {
    if (!student) return;
    const { height, weight, ...measureFields } = data;
    const measurement = {
      measurement_id: uuidv4(),
      student_id: student.student_id,
      year: schoolYear,
      ...measureFields,
      ...(grades || {}),
      bmi,
      teacher_email: user?.email || "",
    };
    try {
      // 키/몸무게가 변경된 경우 학생 정보 업데이트
      const heightChanged = height !== undefined && height !== student.height;
      const weightChanged = weight !== undefined && weight !== student.weight;
      if (heightChanged || weightChanged) {
        const rowIndex = students.findIndex((s) => s.student_id === studentId);
        if (rowIndex !== -1) {
          await updateStudent.mutateAsync({
            rowIndex,
            student: { ...student, height: height ?? student.height, weight: weight ?? student.weight },
          });
        }
      }
      await saveMutation.mutateAsync(measurement);
      toast.success("측정 데이터가 저장됐습니다.");
      navigate(`/measure/${classId}`);
    } catch {
      toast.error("저장에 실패했습니다. 다시 시도해주세요.");
    }
  };

  if (!student) {
    return (
      <AppLayout>
        <div className="text-center py-20 text-gray-400">학생을 찾을 수 없습니다.</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" aria-label="뒤로 가기" onClick={() => navigate(`/measure/${classId}`)}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{student.name} 학생 측정 입력</h1>
          <p className="text-sm text-gray-500">
            {student.grade}학년 {student.class}반 · {student.gender === "M" ? "남" : "여"} · 학번 {student.student_id}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 입력 폼 */}
        <div className="lg:col-span-2 space-y-4">
          {/* 기본 정보 카드 */}
          <Card>
            <CardHeader><CardTitle className="text-base">신체 정보 (BMI)</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-sm text-gray-500">키 (cm)</Label>
                <Controller name="height" control={control} render={({ field }) => (
                  <Input type="number" inputMode="decimal"
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                    placeholder="예: 165"
                    className={errors.height ? "border-red-400" : ""}
                  />
                )} />
                {errors.height && <p className="text-xs text-red-500">{errors.height.message}</p>}
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-gray-500">몸무게 (kg)</Label>
                <Controller name="weight" control={control} render={({ field }) => (
                  <Input type="number" inputMode="decimal"
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                    placeholder="예: 60"
                    className={errors.weight ? "border-red-400" : ""}
                  />
                )} />
                {errors.weight && <p className="text-xs text-red-500">{errors.weight.message}</p>}
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-gray-500">BMI</Label>
                <p className="h-10 flex items-center font-semibold text-sm">{bmi ?? "-"}</p>
              </div>
            </CardContent>
          </Card>

          {/* 측정 입력 폼 */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* 심폐지구력 */}
            <Card>
              <CardHeader><CardTitle className="text-base">심폐지구력</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>종목</Label>
                  <Controller name="cardio_type" control={control} render={({ field }) => (
                    <Select key={field.value} value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CARDIO_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label} ({t.unit})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )} />
                </div>
                <div className="space-y-1">
                  <Label>측정값</Label>
                  <Controller name="cardio_value" control={control} render={({ field }) => (
                    <Input type="number" inputMode="numeric"
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                      placeholder="수치 입력"
                      className={errors.cardio_value ? "border-red-400" : ""}
                    />
                  )} />
                </div>
              </CardContent>
            </Card>

            {/* 근력·근지구력 */}
            <Card>
              <CardHeader><CardTitle className="text-base">근력·근지구력</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>종목</Label>
                  <Controller name="muscle_type" control={control} render={({ field }) => (
                    <Select key={field.value} value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MUSCLE_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label} ({t.unit})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )} />
                </div>
                <div className="space-y-1">
                  <Label>측정값</Label>
                  <Controller name="muscle_value" control={control} render={({ field }) => (
                    <Input type="number" inputMode="numeric"
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                      placeholder="수치 입력"
                    />
                  )} />
                </div>
              </CardContent>
            </Card>

            {/* 유연성 */}
            <Card>
              <CardHeader><CardTitle className="text-base">유연성 (앉아윗몸앞으로굽히기)</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-1 max-w-xs">
                  <Label>측정값 (cm)</Label>
                  <Controller name="flexibility_value" control={control} render={({ field }) => (
                    <Input type="number" inputMode="numeric"
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                      placeholder="-20 ~ 30"
                      className={errors.flexibility_value ? "border-red-400" : ""}
                    />
                  )} />
                </div>
              </CardContent>
            </Card>

            {/* 순발력 */}
            <Card>
              <CardHeader><CardTitle className="text-base">순발력</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>종목</Label>
                  <Controller name="agility_type" control={control} render={({ field }) => (
                    <Select key={field.value} value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {AGILITY_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label} ({t.unit})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )} />
                </div>
                <div className="space-y-1">
                  <Label>측정값</Label>
                  <Controller name="agility_value" control={control} render={({ field }) => (
                    <Input type="number" inputMode="numeric"
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                      placeholder="수치 입력"
                    />
                  )} />
                </div>
              </CardContent>
            </Card>

            <Button type="submit" className="w-full" size="lg" disabled={saveMutation.isPending}>
              {saveMutation.isPending
                ? <><Loader2 className="h-4 w-4 animate-spin" /> 저장 중...</>
                : <><Save className="h-4 w-4" /> 측정 결과 저장</>
              }
            </Button>
          </form>
        </div>

        {/* 등급 미리보기 */}
        <div className="space-y-4">
          <Card className="sticky top-20">
            <CardHeader><CardTitle className="text-base">등급 미리보기</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(GRADE_AREA_LABELS).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{label}</span>
                  <GradeBadge grade={grades?.[key]} />
                </div>
              ))}
              <div className="border-t pt-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-800">종합 등급</span>
                <GradeBadge grade={grades?.total_grade} size="lg" showLabel />
              </div>
              {grades?.total_grade && (
                <p className="text-xs text-gray-400 text-center">
                  {GRADE_LABELS[grades.total_grade]}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
