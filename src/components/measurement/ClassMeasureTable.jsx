// 학급 측정 입력 테이블 — ClassMeasure.jsx에서 분리 (props 기반, 스토어 접근 없음)
// 폼 상태·저장 로직은 페이지가 보유하고 onChange/onDetail 콜백으로 위임받는다.
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { MeasurementStatusBadge } from "./MeasurementStatusBadge";
import { VALID_RANGES, CARDIO_TYPES, MUSCLE_TYPES, AGILITY_TYPES } from "../../constants/paps";

// 유효 범위 체크
const isOutOfRange = (field, value) => {
  const range = VALID_RANGES[field];
  if (!range || value === "" || value === null || value === undefined) return false;
  const num = Number(value);
  return num < range.min || num > range.max;
};

export function ClassMeasureTable({
  classStudents, measuredIds, formValues,
  cardioType, muscleType, agilityType,
  onChange, onDetail,
}) {
  const getVal = (studentId, field) => formValues[studentId]?.[field] ?? "";

  return (
    <div className="bg-white border rounded-xl overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="w-20">상태</TableHead>
            <TableHead className="w-24">이름</TableHead>
            <TableHead className="w-12 text-center">성별</TableHead>
            <TableHead>
              키<br />
              <span className="text-xs font-normal text-gray-400">cm</span>
            </TableHead>
            <TableHead>
              몸무게<br />
              <span className="text-xs font-normal text-gray-400">kg</span>
            </TableHead>
            <TableHead>
              심폐<br />
              <span className="text-xs font-normal text-gray-400">
                {CARDIO_TYPES.find((t) => t.value === cardioType)?.unit}
              </span>
            </TableHead>
            <TableHead>
              근력<br />
              <span className="text-xs font-normal text-gray-400">
                {MUSCLE_TYPES.find((t) => t.value === muscleType)?.unit}
              </span>
            </TableHead>
            <TableHead>
              유연성<br />
              <span className="text-xs font-normal text-gray-400">cm</span>
            </TableHead>
            <TableHead>
              순발력<br />
              <span className="text-xs font-normal text-gray-400">
                {AGILITY_TYPES.find((t) => t.value === agilityType)?.unit}
              </span>
            </TableHead>
            <TableHead className="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {classStudents.map((student) => {
            const measured = measuredIds.has(student.student_id);
            const hasInput = Object.values(formValues[student.student_id] || {}).some(
              (v) => v !== "" && v !== null
            );
            const status = measured ? "complete" : hasInput ? "complete" : "incomplete";
            const fields = [
              { key: "cardio_value", range: cardioType },
              { key: "muscle_value", range: muscleType },
              { key: "flexibility_value", range: "sit_and_reach" },
              { key: "agility_value", range: agilityType },
            ];
            return (
              <TableRow key={student.student_id}>
                <TableCell>
                  <MeasurementStatusBadge status={status} />
                </TableCell>
                <TableCell className="font-medium">{student.name}</TableCell>
                <TableCell className="text-center text-gray-500">
                  {student.gender === "M" ? "남" : "여"}
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    inputMode="decimal"
                    className="w-20 h-8 text-sm"
                    value={getVal(student.student_id, "height")}
                    onChange={(e) => onChange(student.student_id, "height", e.target.value)}
                    placeholder="-"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    inputMode="decimal"
                    className="w-20 h-8 text-sm"
                    value={getVal(student.student_id, "weight")}
                    onChange={(e) => onChange(student.student_id, "weight", e.target.value)}
                    placeholder="-"
                  />
                </TableCell>
                {fields.map(({ key, range }) => (
                  <TableCell key={key}>
                    <Input
                      type="number"
                      inputMode="numeric"
                      className={`w-20 h-8 text-sm ${isOutOfRange(range, getVal(student.student_id, key)) ? "border-red-400 bg-red-50" : ""}`}
                      value={getVal(student.student_id, key)}
                      onChange={(e) => onChange(student.student_id, key, e.target.value)}
                      placeholder="-"
                    />
                  </TableCell>
                ))}
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs px-2"
                    onClick={() => onDetail(student.student_id)}
                  >
                    상세
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
