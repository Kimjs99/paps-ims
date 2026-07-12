// 전체 측정 이력 테이블 + 평균 행 — StudentDetail.jsx에서 분리 (colocated, props 기반)
import { GradeBadge } from "../../components/ui/GradeBadge";
import { CARDIO_TYPES, MUSCLE_TYPES, AGILITY_TYPES, FLEXIBILITY_ITEM } from "../../constants/paps";
import { getTypeInfo, formatDatetime } from "./studentDetailData";
import { scoresForMeasurement } from "../../utils/papsScore";
import { useSettingsStore } from "../../store/settingsStore";

export function StudentHistoryTable({ rawMeasurements, avgRecord, student }) {
  const schoolLevel = useSettingsStore((st) => st.schoolLevel);
  // 테이블 헤더용 종목 정보 (최신 측정 기준)
  const latestM = rawMeasurements[0];
  const headerCardio = getTypeInfo(CARDIO_TYPES, latestM?.cardio_type);
  const headerMuscle = getTypeInfo(MUSCLE_TYPES, latestM?.muscle_type);
  const headerAgility = getTypeInfo(AGILITY_TYPES, latestM?.agility_type);

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <div className="px-4 py-3 border-b bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-700">전체 측정 기록</h3>
        <p className="text-xs text-gray-400 mt-0.5">측정 회차별 실측값 및 등급 · 마지막 행: 전체 평균</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 whitespace-nowrap">측정일시</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">연도</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                심폐지구력
                {latestM && <div className="font-normal text-gray-400">{headerCardio.label} ({headerCardio.unit})</div>}
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                근력·근지구력
                {latestM && <div className="font-normal text-gray-400">{headerMuscle.label} ({headerMuscle.unit})</div>}
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                유연성
                <div className="font-normal text-gray-400">{FLEXIBILITY_ITEM.label} ({FLEXIBILITY_ITEM.unit})</div>
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                순발력
                {latestM && <div className="font-normal text-gray-400">{headerAgility.label} ({headerAgility.unit})</div>}
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">BMI</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">종합</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rawMeasurements.map((m) => {
              const cardioInfo = getTypeInfo(CARDIO_TYPES, m.cardio_type);
              const muscleInfo = getTypeInfo(MUSCLE_TYPES, m.muscle_type);
              const agilityInfo = getTypeInfo(AGILITY_TYPES, m.agility_type);
              // 점수는 시트에 저장하지 않음 — 측정 당시 학년 기준으로 표시용 재계산
              const sc = student
                ? scoresForMeasurement(m, { grade: student.grade, gender: student.gender, schoolLevel })
                : {};
              return (
                <tr key={m.measurement_id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-500 whitespace-nowrap text-xs">
                    {formatDatetime(m.measured_at)}
                  </td>
                  <td className="px-3 py-2 font-medium text-gray-700">{m.year}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-gray-700">
                        {m.cardio_value != null ? `${m.cardio_value}${cardioInfo.unit}` : "—"}
                      </span>
                      {sc.cardio_score != null && <span className="text-[11px] text-gray-400">{sc.cardio_score}점</span>}
                      <GradeBadge grade={m.cardio_grade} />
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-gray-700">
                        {m.muscle_value != null ? `${m.muscle_value}${muscleInfo.unit}` : "—"}
                      </span>
                      {sc.muscle_score != null && <span className="text-[11px] text-gray-400">{sc.muscle_score}점</span>}
                      <GradeBadge grade={m.muscle_grade} />
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-gray-700">
                        {m.flexibility_value != null ? `${m.flexibility_value}${FLEXIBILITY_ITEM.unit}` : "—"}
                      </span>
                      {sc.flexibility_score != null && <span className="text-[11px] text-gray-400">{sc.flexibility_score}점</span>}
                      <GradeBadge grade={m.flexibility_grade} />
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-gray-700">
                        {m.agility_value != null ? `${m.agility_value}${agilityInfo.unit}` : "—"}
                      </span>
                      {sc.agility_score != null && <span className="text-[11px] text-gray-400">{sc.agility_score}점</span>}
                      <GradeBadge grade={m.agility_grade} />
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-gray-700">
                        {m.bmi != null ? m.bmi : "—"}
                      </span>
                      {sc.bmi_score != null && <span className="text-[11px] text-gray-400">{sc.bmi_score}점</span>}
                      <GradeBadge grade={m.bmi_grade} />
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      {sc.total_score != null && (
                        <span className="text-xs font-semibold text-gray-600">{sc.total_score}점</span>
                      )}
                      <GradeBadge grade={m.total_grade} size="sm" />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          {/* 평균 행 */}
          {avgRecord && (
            <tfoot>
              <tr className="bg-blue-50 border-t-2 border-blue-200 font-medium">
                <td className="px-3 py-2 text-xs text-blue-700 whitespace-nowrap">평균</td>
                <td className="px-3 py-2 text-xs text-blue-500">전체</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm text-blue-700">
                      {avgRecord.cardio_value != null ? `${avgRecord.cardio_value}` : "—"}
                    </span>
                    <GradeBadge grade={avgRecord.cardio_grade != null ? Math.round(avgRecord.cardio_grade) : null} />
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm text-blue-700">
                      {avgRecord.muscle_value != null ? `${avgRecord.muscle_value}` : "—"}
                    </span>
                    <GradeBadge grade={avgRecord.muscle_grade != null ? Math.round(avgRecord.muscle_grade) : null} />
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm text-blue-700">
                      {avgRecord.flexibility_value != null ? `${avgRecord.flexibility_value}cm` : "—"}
                    </span>
                    <GradeBadge grade={avgRecord.flexibility_grade != null ? Math.round(avgRecord.flexibility_grade) : null} />
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm text-blue-700">
                      {avgRecord.agility_value != null ? `${avgRecord.agility_value}` : "—"}
                    </span>
                    <GradeBadge grade={avgRecord.agility_grade != null ? Math.round(avgRecord.agility_grade) : null} />
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm text-blue-700">
                      {avgRecord.bmi != null ? avgRecord.bmi : "—"}
                    </span>
                    <GradeBadge grade={avgRecord.bmi_grade != null ? Math.round(avgRecord.bmi_grade) : null} />
                  </div>
                </td>
                <td className="px-3 py-2">
                  <GradeBadge grade={avgRecord.total_grade != null ? Math.round(avgRecord.total_grade) : null} size="sm" />
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
