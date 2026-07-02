// 학급 공통 종목 선택 카드 — ClassMeasure.jsx에서 분리 (표시 전용, 종목 상태는 페이지가 보유)
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../ui/select";
import { CARDIO_TYPES, MUSCLE_TYPES, AGILITY_TYPES } from "../../constants/paps";

export function ClassMeasureTypeSelects({
  cardioType, setCardioType,
  muscleType, setMuscleType,
  agilityType, setAgilityType,
}) {
  return (
    <div className="bg-white border rounded-xl p-4 mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500">심폐지구력 종목</label>
        <Select value={cardioType} onValueChange={setCardioType}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {CARDIO_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label} ({t.unit})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500">근력·근지구력 종목</label>
        <Select value={muscleType} onValueChange={setMuscleType}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {MUSCLE_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label} ({t.unit})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500">순발력 종목</label>
        <Select value={agilityType} onValueChange={setAgilityType}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {AGILITY_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label} ({t.unit})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
