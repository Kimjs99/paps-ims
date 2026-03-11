// BMI 계산
export const calcBMI = (height, weight) => {
  if (!height || !weight) return null;
  const h = height / 100; // cm → m
  return Math.round((weight / (h * h)) * 10) / 10;
};

// BMI 등급 (단순 수치 기준 — 실제 PAPS는 grades_standard 시트 참조)
export const calcBMIGrade = (bmi) => {
  if (bmi === null || bmi === undefined) return null;
  if (bmi < 18.5) return 4; // 저체중
  if (bmi < 23) return 1;   // 정상
  if (bmi < 25) return 2;   // 과체중
  if (bmi < 30) return 3;   // 비만
  return 5;                  // 고도비만
};
