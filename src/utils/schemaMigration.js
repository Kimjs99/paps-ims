import { getSettings, saveSettings } from "../api/settings";
import { sheetsRequest, withRetry } from "../api/sheetsClient";
import { SCHEMA_VERSION } from "../constants/paps";

// 현재 Sheet의 스키마 버전 확인
export const getSheetSchemaVersion = async (sheetId) => {
  const settings = await getSettings(sheetId);
  return settings["SCHEMA_VERSION"] || "0.0";
};

// 버전 비교: Sheet 버전이 앱 버전보다 낮으면 마이그레이션 필요
export const needsMigration = (sheetVersion, appVersion) => {
  const [sheetMajor, sheetMinor] = sheetVersion.split(".").map(Number);
  const [appMajor, appMinor] = appVersion.split(".").map(Number);
  if (sheetMajor < appMajor) return true;
  if (sheetMajor === appMajor && sheetMinor < appMinor) return true;
  return false;
};

// 마이그레이션 실행 (버전별 순차 적용)
export const runMigrations = async (sheetId, fromVersion, toVersion) => {
  const migrations = getMigrationSteps(fromVersion, toVersion);
  for (const migration of migrations) {
    console.log(`[Migration] Applying ${migration.version}...`);
    await migration.up(sheetId);
    await saveSettings(sheetId, { SCHEMA_VERSION: migration.version });
  }
};

// 마이그레이션 단계 목록 (버전 순서대로)
const MIGRATION_STEPS = [
  // 예시: v1.0 → v1.1 마이그레이션 (추후 추가)
  // {
  //   version: "1.1",
  //   description: "measurements 시트에 notes 컬럼 추가",
  //   up: async (sheetId) => {
  //     await addColumnHeader(sheetId, "measurements", "T", "notes");
  //   },
  // },
];

// fromVersion 이후의 마이그레이션만 반환
const getMigrationSteps = (fromVersion, toVersion) => {
  return MIGRATION_STEPS.filter((m) => {
    const [major, minor] = m.version.split(".").map(Number);
    const [fromMajor, fromMinor] = fromVersion.split(".").map(Number);
    const [toMajor, toMinor] = toVersion.split(".").map(Number);
    const afterFrom = major > fromMajor || (major === fromMajor && minor > fromMinor);
    const beforeTo = major < toMajor || (major === toMajor && minor <= toMinor);
    return afterFrom && beforeTo;
  });
};

// 특정 시트에 헤더 컬럼 추가 (마이그레이션 헬퍼)
export const addColumnHeader = async (sheetId, sheetName, column, headerText) => {
  await withRetry(() =>
    sheetsRequest({
      method: "PUT",
      path: `/${sheetId}/values/${sheetName}!${column}1?valueInputOption=RAW`,
      body: { values: [[headerText]] },
    })
  );
};

export { SCHEMA_VERSION };
