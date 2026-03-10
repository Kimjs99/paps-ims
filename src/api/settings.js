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

// 스키마 버전 확인
export const checkSchemaVersion = async (sheetId) => {
  const settings = await getSettings(sheetId);
  return settings["SCHEMA_VERSION"] === SCHEMA_VERSION;
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
