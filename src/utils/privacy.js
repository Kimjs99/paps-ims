// 개인정보 표시 보호 유틸 — 학생 실명 마스킹 (표시 전용, 시트 원본은 변경하지 않음)

// 성(첫 글자)만 남기고 나머지를 *로 마스킹: 김민준 → 김**, 이수 → 이*, 남궁민수 → 남***
export const maskName = (name) => {
  const n = String(name ?? "").trim();
  if (n.length <= 1) return n;
  return n[0] + "*".repeat(n.length - 1);
};
