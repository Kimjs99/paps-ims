// BMI 계산
export const calcBMI = (height, weight) => {
  if (!height || !weight) return null;
  const h = height / 100; // cm → m
  return Math.round((weight / (h * h)) * 10) / 10;
};

/**
 * PAPS 공식 학년·성별 BMI 판정 기준 (교육부 PAPS 도움자료, 단위: kg/m²)
 *
 * 값 구조: [마름 상한, 정상 상한, 과체중 상한, 경도비만 상한] — 경도비만 상한 초과(≥30.0)는 고도비만
 * 남 고2·고3은 과체중 구간이 없음(정상 상한 = 과체중 상한 24.9): 25.0~29.9 전체가 경도비만
 * 초등 3학년은 공식 기준 미제공 → 조회 실패 시 등급 미산출(null)
 */
export const BMI_STANDARDS_BY_LEVEL = {
  초등학교: {
    M: { 4: [14.2, 20.7, 23.2, 29.9], 5: [14.5, 21.6, 24.4, 29.9], 6: [14.8, 22.5, 24.9, 29.9] },
    F: { 4: [13.9, 19.8, 22.0, 29.9], 5: [14.2, 20.6, 23.0, 29.9], 6: [14.6, 21.4, 23.9, 29.9] },
  },
  중학교: {
    M: { 1: [15.3, 23.2, 24.9, 29.9], 2: [15.7, 23.8, 24.9, 29.9], 3: [16.2, 24.3, 24.9, 29.9] },
    F: { 1: [15.1, 22.1, 24.7, 29.9], 2: [15.6, 22.7, 24.9, 29.9], 3: [16.2, 23.2, 24.9, 29.9] },
  },
  고등학교: {
    M: { 1: [16.7, 24.6, 24.9, 29.9], 2: [17.2, 24.9, 24.9, 29.9], 3: [17.7, 24.9, 24.9, 29.9] },
    F: { 1: [16.7, 23.6, 24.9, 29.9], 2: [17.2, 23.8, 24.9, 29.9], 3: [17.6, 23.9, 24.9, 29.9] },
  },
};

// BMI 등급 — PAPS 공식 학년·성별 기준 적용
// 1 정상 / 2 과체중 / 3 경도비만 / 4 마름 / 5 고도비만
// 기준 미제공 학년(초3)·학교급/학년/성별 정보 부족 시 null (종합등급 평균에서 제외)
export const calcBMIGrade = (bmi, { schoolLevel, grade, gender } = {}) => {
  if (bmi === null || bmi === undefined) return null;
  const thresholds = BMI_STANDARDS_BY_LEVEL[schoolLevel]?.[gender]?.[grade];
  if (!thresholds) return null;
  const [underMax, normalMax, overMax, mildMax] = thresholds;
  if (bmi <= underMax) return 4;  // 마름
  if (bmi <= normalMax) return 1; // 정상
  if (bmi <= overMax) return 2;   // 과체중
  if (bmi <= mildMax) return 3;   // 경도비만
  return 5;                       // 고도비만
};
