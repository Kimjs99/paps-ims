import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useMeasurements, useStudents } from "./useSheets";
import { useSettingsStore } from "../store/settingsStore";
import { GRADE_RANGE_BY_LEVEL } from "../utils/gradesStandardSeed";
import { FITNESS_AREAS, FITNESS_GRADE_FIELDS } from "../constants/paps";
import { avgOf, avgFixed1, avgRounded } from "../utils/stats";

/**
 * 동일 학생의 중복 측정 데이터를 병합한다.
 * (student_id, year) 단위로 체력요소별 최우수(최소) 등급을 채택하고
 * total_grade를 채택된 등급들의 평균으로 재계산한다.
 */
export const deduplicateMeasurements = (measurements) => {
  const groups = new Map();

  measurements.forEach((m) => {
    const key = `${m.student_id}__${m.year}`;
    if (!groups.has(key)) {
      groups.set(key, { ...m });
      return;
    }
    const best = groups.get(key);

    FITNESS_AREAS.forEach(({ gradeField: grade, valueField: value, typeField: type }) => {
      const ng = m[grade];
      const eg = best[grade];
      const better =
        ng != null && !isNaN(Number(ng)) &&
        (eg == null || isNaN(Number(eg)) || Number(ng) < Number(eg));
      if (better) {
        best[grade] = ng;
        if (value != null && m[value] != null) best[value] = m[value];
        if (type  != null && m[type])          best[type]  = m[type];
      }
    });

    // total_grade 재계산 (채택된 등급들의 평균 — Math.round)
    const vals = FITNESS_GRADE_FIELDS
      .map((k) => best[k])
      .filter((g) => g != null && !isNaN(Number(g)))
      .map(Number);
    best.total_grade = avgRounded(vals);

    if ((m.measured_at ?? "") > (best.measured_at ?? "")) best.measured_at = m.measured_at;
  });

  return Array.from(groups.values());
};

// URL 쿼리 파라미터에서 필터 값 읽기
export const useDashboardFilters = () => {
  const [searchParams] = useSearchParams();
  return {
    year: searchParams.get("year") || null,
    grade: searchParams.get("grade") || null,
    class: searchParams.get("class") || null,
    gender: searchParams.get("gender") || null,
  };
};

export const useDashboardData = (filters = {}) => {
  const { data: measurements = [], isLoading: mLoading, dataUpdatedAt } = useMeasurements();
  const { data: students = [], isLoading: sLoading } = useStudents();

  // 필터 값을 원시형으로 분리 → useMemo 불필요 재계산 방지
  const { year: fYear, grade: fGrade, class: fClass, gender: fGender } = filters;

  // 1. 활성 학생 먼저 확정
  const activeStudents = useMemo(
    () => students.filter((s) => s.is_active),
    [students]
  );

  const activeStudentIds = useMemo(
    () => new Set(activeStudents.map((s) => s.student_id)),
    [activeStudents]
  );

  // 2. 활성 학생 측정값 중복 제거 (student+year 단위 최우수 등급 병합)
  const deduped = useMemo(
    () => deduplicateMeasurements(measurements.filter((x) => activeStudentIds.has(x.student_id))),
    [measurements, activeStudentIds]
  );

  // 3. 사용자 필터 적용
  const filtered = useMemo(() => {
    let m = deduped;

    if (fYear) m = m.filter((x) => String(x.year) === String(fYear));
    if (fGrade) {
      m = m.filter((x) => {
        const s = students.find((st) => st.student_id === x.student_id);
        return String(s?.grade) === String(fGrade);
      });
    }
    if (fClass) {
      m = m.filter((x) => {
        const s = students.find((st) => st.student_id === x.student_id);
        return String(s?.class) === String(fClass);
      });
    }
    if (fGender) {
      m = m.filter((x) => {
        const s = students.find((st) => st.student_id === x.student_id);
        return s?.gender === fGender;
      });
    }
    return m;
  }, [deduped, students, fYear, fGrade, fClass, fGender]);

  // 3. 필터된 활성 학생 기준으로 KPI 계산
  const filteredActiveStudents = useMemo(() => {
    let s = activeStudents;
    if (fGrade) s = s.filter((st) => String(st.grade) === String(fGrade));
    if (fClass) s = s.filter((st) => String(st.class) === String(fClass));
    if (fGender) s = s.filter((st) => st.gender === fGender);
    return s;
  }, [activeStudents, fGrade, fClass, fGender]);

  const kpi = useMemo(() => {
    const totalStudents = filteredActiveStudents.length;
    const measuredStudentIds = new Set(filtered.map((m) => m.student_id));
    const measuredCount = measuredStudentIds.size;
    const completionRate =
      totalStudents > 0 ? Math.round((measuredCount / totalStudents) * 100) : 0;
    const gradesWithValue = filtered.filter((m) => m.total_grade);
    const avgTotalGrade =
      avgOf(gradesWithValue.map((m) => Number(m.total_grade)))?.toFixed(1) ?? null;
    return { totalStudents, measuredCount, completionRate, avgTotalGrade };
  }, [filtered, filteredActiveStudents]);

  const gradeDistribution = useMemo(() => {
    const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    filtered.forEach((m) => {
      const g = Number(m.total_grade);
      if (g >= 1 && g <= 5) dist[g]++;
    });
    return Object.entries(dist).map(([grade, count]) => ({
      grade: `${grade}등급`,
      count,
      gradeNum: Number(grade),
    }));
  }, [filtered]);

  const schoolLevel = useSettingsStore((s) => s.schoolLevel);

  const gradeProgress = useMemo(() => {
    // 학교급별 학년 범위 (초등 3~6, 중·고 1~3)
    const gradeRange = GRADE_RANGE_BY_LEVEL[schoolLevel] || GRADE_RANGE_BY_LEVEL["중학교"];
    return gradeRange.map((g) => {
      const gradeStudents = activeStudents.filter((s) => Number(s.grade) === g);
      const gradeMeasured = new Set(
        filtered
          .filter((m) => gradeStudents.some((s) => s.student_id === m.student_id))
          .map((m) => m.student_id)
      );
      return {
        grade: g,
        label: `${g}학년`,
        total: gradeStudents.length,
        measured: gradeMeasured.size,
        rate:
          gradeStudents.length > 0
            ? Math.round((gradeMeasured.size / gradeStudents.length) * 100)
            : 0,
      };
    });
  }, [filtered, activeStudents, schoolLevel]);

  const areaAvgs = useMemo(
    () =>
      FITNESS_AREAS.map(({ label, gradeField }) => ({
        area: label,
        value: avgFixed1(filtered.filter((m) => m[gradeField]).map((m) => Number(m[gradeField]))),
      })),
    [filtered]
  );

  const availableYears = useMemo(() => {
    // 활성 학생 측정값 기준
    const years = [
      ...new Set(
        measurements
          .filter((m) => activeStudentIds.has(m.student_id))
          .map((m) => m.year)
          .filter(Boolean)
      ),
    ];
    return years.sort((a, b) => b - a);
  }, [measurements, activeStudentIds]);

  const availableClasses = useMemo(() => {
    let s = activeStudents;
    if (fGrade) s = s.filter((st) => String(st.grade) === String(fGrade));
    const classes = [...new Set(s.map((st) => st.class).filter(Boolean))];
    return classes.sort((a, b) => Number(a) - Number(b));
  }, [activeStudents, fGrade]);

  return {
    isLoading: mLoading || sLoading,
    dataUpdatedAt,
    kpi,
    gradeDistribution,
    gradeProgress,
    areaAvgs,
    measurements: filtered,
    allMeasurements: deduped,
    students,
    activeStudents,
    availableYears,
    availableClasses,
  };
};

// 성별 영역별 평균 비교
export const useGenderComparison = (measurements, students) => {
  return useMemo(() => {
    const studentMap = new Map(students.map((s) => [s.student_id, s]));
    return FITNESS_AREAS.map(({ label, labelAlt, gradeField }) => {
      const calcAvg = (gender) => {
        const vals = measurements
          .filter((m) => {
            const s = studentMap.get(m.student_id);
            return s?.gender === gender && m[gradeField];
          })
          .map((m) => Number(m[gradeField]));
        return avgFixed1(vals);
      };
      return { area: labelAlt ?? label, male: calcAvg("M"), female: calcAvg("F") };
    });
  }, [measurements, students]);
};

// 연도별 추이
export const useYearlyTrend = (measurements, targetStudentIds = null) => {
  return useMemo(() => {
    const years = [...new Set(measurements.map((m) => m.year))].sort();
    return years.map((year) => {
      let yearData = measurements.filter((m) => m.year === year);
      if (targetStudentIds) {
        yearData = yearData.filter((m) => targetStudentIds.includes(m.student_id));
      }
      const avg = (field) => avgFixed1(yearData.map((m) => m[field]).filter(Boolean));
      return {
        year,
        cardio: avg("cardio_grade"),
        muscle: avg("muscle_grade"),
        flexibility: avg("flexibility_grade"),
        agility: avg("agility_grade"),
        bmi: avg("bmi_grade"),
        total: avg("total_grade"),
      };
    });
  }, [measurements, targetStudentIds]);
};

// 히스토그램 데이터
export const useHistogramData = (measurements, field, binCount = 10) => {
  return useMemo(() => {
    const values = measurements
      .map((m) => m[field])
      .filter((v) => v !== null && v !== undefined && !isNaN(v));
    if (!values.length) return [];
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (min === max) return [{ range: String(min), count: values.length }];
    const binSize = (max - min) / binCount;
    const bins = Array.from({ length: binCount }, (_, i) => ({
      range: `${(min + i * binSize).toFixed(1)}`,
      count: 0,
    }));
    values.forEach((v) => {
      const idx = Math.min(Math.floor((v - min) / binSize), binCount - 1);
      bins[idx].count++;
    });
    return bins;
  }, [measurements, field, binCount]);
};

// BMI vs 종합등급 산점도
export const useScatterData = (measurements) => {
  return useMemo(
    () =>
      measurements
        .filter((m) => m.bmi && m.total_grade)
        .map((m) => ({ bmi: m.bmi, total_grade: m.total_grade, student_id: m.student_id })),
    [measurements]
  );
};
