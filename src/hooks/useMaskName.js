import { useSettingsStore } from "../store/settingsStore";
import { maskName } from "../utils/privacy";

// 설정(maskNames)에 따라 학생 이름을 마스킹해 반환하는 표시 함수 훅
// 표시 전용 — 검색·정렬·저장은 원본 이름 그대로 사용할 것
export const useMaskName = () => {
  const maskNames = useSettingsStore((s) => s.maskNames);
  return (name) => (maskNames ? maskName(name) : name);
};
