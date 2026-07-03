import { sheetsRequest, withRetry } from "./sheetsClient";
import { SHEET_NAMES, SCHEMA_VERSION } from "../constants/paps";

// settings 시트 전체 읽기
export const getSettings = async (sheetId) => {
  const data = await withRetry(() =>
    sheetsRequest({
      path: `/${sheetId}/values/${SHEET_NAMES.SETTINGS}!A:B`,
    })
  );
  const rows = data.values || [];
  return Object.fromEntries(rows);
};

// 스키마 버전 확인 (정확히 일치할 때만 true — 하위 호환용)
export const checkSchemaVersion = async (sheetId) => {
  const settings = await getSettings(sheetId);
  return settings["SCHEMA_VERSION"] === SCHEMA_VERSION;
};

// "major.minor" 버전 숫자 비교 (a < b → -1, a === b → 0, a > b → 1)
const compareVersions = (a, b) => {
  const [aMaj, aMin] = String(a).split(".").map(Number);
  const [bMaj, bMin] = String(b).split(".").map(Number);
  if (aMaj !== bMaj) return aMaj < bMaj ? -1 : 1;
  if (aMin !== bMin) return aMin < bMin ? -1 : 1;
  return 0;
};

// 스키마 호환성 판정 — 구버전 시트는 연결을 허용하고 마이그레이션 배너에서 업그레이드한다.
// status: "ok"(일치) | "migratable"(구버전 — 연결 허용) | "unsupported"(앱보다 신버전) | "invalid"(템플릿 아님)
export const checkSchemaCompat = async (sheetId) => {
  const settings = await getSettings(sheetId);
  const sheetVersion = settings["SCHEMA_VERSION"];
  if (!sheetVersion) return { status: "invalid", sheetVersion: null };
  const cmp = compareVersions(sheetVersion, SCHEMA_VERSION);
  if (cmp === 0) return { status: "ok", sheetVersion };
  if (cmp < 0) return { status: "migratable", sheetVersion };
  return { status: "unsupported", sheetVersion };
};

// 설정값 저장 (upsert 방식: 기존 키 업데이트 또는 추가)
export const saveSettings = async (sheetId, keyValuePairs) => {
  // 기존 설정 읽기
  const existing = await getSettings(sheetId);
  const merged = { ...existing, ...keyValuePairs };
  const values = Object.entries(merged).map(([k, v]) => [k, String(v)]);

  await withRetry(() =>
    sheetsRequest({
      method: "PUT",
      path: `/${sheetId}/values/${SHEET_NAMES.SETTINGS}!A:B?valueInputOption=RAW`,
      body: { values },
    })
  );
};
