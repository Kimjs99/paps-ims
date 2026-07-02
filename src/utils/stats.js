// 평균 계산 유틸 — 사이트마다 반올림 방식이 다르므로 출력 타입별 헬퍼를 분리한다.
// (toFixed(1) 문자열 표기가 필요한 곳은 avgOf 결과에 직접 .toFixed(1)을 적용)

// 산술 평균 — 빈 배열이면 null (반올림 없음)
export const avgOf = (values) =>
  values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null;

// 소수점 1자리 반올림 숫자 (parseFloat((avg).toFixed(1)) 패턴)
export const avgFixed1 = (values) => {
  const avg = avgOf(values);
  return avg === null ? null : parseFloat(avg.toFixed(1));
};

// 정수 반올림 평균 (Math.round(avg) 패턴 — total_grade 재계산 등)
export const avgRounded = (values) => {
  const avg = avgOf(values);
  return avg === null ? null : Math.round(avg);
};
