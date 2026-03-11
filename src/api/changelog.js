import { sheetsRequest, withRetry, nowKST } from "./sheetsClient";
import { SHEET_NAMES } from "../constants/paps";
import { v4 as uuidv4 } from "uuid";

export const logChange = async (sheetId, { teacherEmail, tableName, recordId, fieldName, oldValue, newValue }) => {
  const row = [
    uuidv4(),
    nowKST(),
    teacherEmail,
    tableName,
    recordId,
    fieldName,
    String(oldValue ?? ""),
    String(newValue ?? ""),
  ];
  await withRetry(() =>
    sheetsRequest({
      method: "POST",
      path: `/${sheetId}/values/${SHEET_NAMES.CHANGELOG}!A:H:append?valueInputOption=RAW`,
      body: { values: [row] },
    })
  );
};
