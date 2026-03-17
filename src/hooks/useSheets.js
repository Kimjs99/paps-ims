import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSettingsStore } from "../store/settingsStore";
import { getStudents, addStudent, updateStudent, bulkAddStudents, deactivateStudent, deactivateClassStudents } from "../api/students";
import { getMeasurements, saveMeasurement, saveMeasurementsBatch } from "../api/measurements";

const useSheetId = () => useSettingsStore((s) => s.sheetId);

// 학생 목록
export const useStudents = () => {
  const sheetId = useSheetId();
  return useQuery({
    queryKey: ["students", sheetId],
    queryFn: () => getStudents(sheetId),
    enabled: !!sheetId,
  });
};

// 학생 추가
export const useAddStudent = () => {
  const sheetId = useSheetId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (student) => addStudent(sheetId, student),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["students"] }),
  });
};

// 학생 수정
export const useUpdateStudent = () => {
  const sheetId = useSheetId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ rowIndex, student }) => updateStudent(sheetId, rowIndex, student),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["students"] }),
  });
};

// 학생 비활성화 (소프트 삭제)
export const useDeactivateStudent = () => {
  const sheetId = useSheetId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ rowIndex, student }) => deactivateStudent(sheetId, rowIndex, student),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["students"] }),
  });
};

// 학급 전체 비활성화
export const useDeactivateClassStudents = () => {
  const sheetId = useSheetId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (items) => deactivateClassStudents(sheetId, items),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["students"] }),
  });
};

// 학생 일괄 업로드
export const useBulkAddStudents = () => {
  const sheetId = useSheetId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (students) => bulkAddStudents(sheetId, students),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["students"] }),
  });
};

// 전체 측정 데이터
export const useMeasurements = () => {
  const sheetId = useSheetId();
  return useQuery({
    queryKey: ["measurements", sheetId],
    queryFn: () => getMeasurements(sheetId),
    enabled: !!sheetId,
    refetchInterval: 30 * 1000,
  });
};

// 측정 저장 (단일)
export const useSaveMeasurement = () => {
  const sheetId = useSheetId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (measurement) => saveMeasurement(sheetId, measurement),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["measurements"] }),
  });
};

// 학급 일괄 저장
export const useSaveMeasurementsBatch = () => {
  const sheetId = useSheetId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (measurements) => saveMeasurementsBatch(sheetId, measurements),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["measurements"] }),
  });
};
