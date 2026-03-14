import { useCallback, useEffect, useRef, useState } from "react";
import { useSettingsStore } from "../store/settingsStore";
import { getSheetSchemaVersion, needsMigration, runMigrations } from "../utils/schemaMigration";
import { SCHEMA_VERSION } from "../constants/paps";

export const useSchemaCheck = () => {
  const sheetId = useSettingsStore((s) => s.sheetId);
  const [status, setStatus] = useState("idle"); // idle | ok | migration_needed | migrating | error
  const [sheetVersion, setSheetVersion] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const setStatusRef = useRef(setStatus);
  const setSheetVersionRef = useRef(setSheetVersion);
  const setErrorMsgRef = useRef(setErrorMsg);

  // sheetId 변경 시 자동 버전 체크 (setState는 비동기 콜백에서만 호출)
  useEffect(() => {
    if (!sheetId) return;
    let cancelled = false;
    getSheetSchemaVersion(sheetId)
      .then((version) => {
        if (cancelled) return;
        setSheetVersionRef.current(version);
        setStatusRef.current(needsMigration(version, SCHEMA_VERSION) ? "migration_needed" : "ok");
      })
      .catch((e) => {
        if (cancelled) return;
        setStatusRef.current("error");
        setErrorMsgRef.current(e.message);
      });
    return () => { cancelled = true; };
  }, [sheetId]);

  // 수동 재확인 (버튼에서 호출)
  const checkAndMigrate = useCallback(async () => {
    if (!sheetId) return;
    try {
      const version = await getSheetSchemaVersion(sheetId);
      setSheetVersion(version);
      setStatus(needsMigration(version, SCHEMA_VERSION) ? "migration_needed" : "ok");
    } catch (e) {
      setStatus("error");
      setErrorMsg(e.message);
    }
  }, [sheetId]);

  const migrate = async () => {
    setStatus("migrating");
    try {
      await runMigrations(sheetId, sheetVersion, SCHEMA_VERSION);
      setStatus("ok");
    } catch (e) {
      setStatus("error");
      setErrorMsg(e.message);
    }
  };

  return { status, sheetVersion, appVersion: SCHEMA_VERSION, checkAndMigrate, migrate, error: errorMsg };
};
