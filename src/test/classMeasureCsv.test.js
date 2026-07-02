import { describe, it, expect } from 'vitest';
import { buildTemplateCsv, applyCsvToFormValues } from '../pages/app/classMeasureCsv';
import { parseCsv } from '../utils/csv';

const students = [
  { student_id: '20240101', name: '김하나', gender: 'F', grade: 1, class: 2, height: 158.5, weight: 48 },
  { student_id: '20240102', name: '박두리', gender: 'M', grade: 1, class: 2 }, // 키/몸무게 미입력
];

const types = { cardioType: 'shuttle_run', muscleType: 'sit_up', agilityType: 'sprint_50m' };

describe('buildTemplateCsv (측정 CSV 템플릿 생성)', () => {
  it('헤더: 고정 컬럼 순서 + 선택 종목 라벨 포함', () => {
    const [header] = buildTemplateCsv(students, types).split('\n');
    expect(header).toBe(
      'student_id,이름,성별,학년,반,키(cm),몸무게(kg),심폐지구력(왕복오래달리기),근력근지구력(윗몸말아올리기),유연성(앉아윗몸앞으로굽히기cm),순발력(50m 달리기)'
    );
  });

  it('종목 변경 시 라벨 반영', () => {
    const [header] = buildTemplateCsv([], {
      cardioType: 'step_test', muscleType: 'grip_strength', agilityType: 'standing_jump',
    }).split('\n');
    expect(header).toContain('심폐지구력(스텝검사)');
    expect(header).toContain('근력근지구력(악력)');
    expect(header).toContain('순발력(제자리멀리뛰기)');
  });

  it('알 수 없는 종목 값이면 raw 값 그대로 표기 (기존 || fallback 유지)', () => {
    const [header] = buildTemplateCsv([], { ...types, cardioType: 'unknown_type' }).split('\n');
    expect(header).toContain('심폐지구력(unknown_type)');
  });

  it('학생 행: 성별 한글 변환, 키/몸무게 사전 입력, 측정값 4칸은 빈칸', () => {
    const lines = buildTemplateCsv(students, types).split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe('20240101,김하나,여,1,2,158.5,48,,,,');
  });

  it('키/몸무게 없는 학생은 빈 문자열 (?? "" — 0 아님)', () => {
    const lines = buildTemplateCsv(students, types).split('\n');
    expect(lines[2]).toBe('20240102,박두리,남,1,2,,,,,,');
  });
});

describe('applyCsvToFormValues (업로드 CSV → formValues 병합)', () => {
  it('값이 있는 셀은 폼에 반영, 빈 셀은 기존 폼 값 유지', () => {
    const rows = parseCsv(
      'student_id,이름,성별,학년,반,키,몸무게,심폐,근력,유연성,순발력\n' +
      '20240101,김하나,여,1,2,160,,55,,,9.2'
    );
    const prev = { 20240101: { height: '158.5', weight: '48', cardio_value: '50', muscle_value: '30', flexibility_value: '10', agility_value: '' } };
    const next = applyCsvToFormValues(rows, prev);
    expect(next['20240101']).toEqual({
      height: '160',          // CSV 값으로 교체
      weight: '48',           // 빈 셀 → 기존 값 유지
      cardio_value: '55',     // CSV 값으로 교체
      muscle_value: '30',     // 빈 셀 → 기존 값 유지
      flexibility_value: '10',
      agility_value: '9.2',
    });
  });

  it('기존 폼에 없는 학생은 빈 셀이 ""로 채워짐', () => {
    const rows = [['h'], ['20240103', '', '', '', '', '', '', '48', '', '', '']];
    const next = applyCsvToFormValues(rows, {});
    expect(next['20240103']).toEqual({
      height: '', weight: '', cardio_value: '48', muscle_value: '', flexibility_value: '', agility_value: '',
    });
  });

  it('student_id 없는 행은 무시, 원본 formValues는 변경하지 않음(불변)', () => {
    const prev = { 20240101: { height: '160' } };
    const rows = [['h'], ['', '', '', '', '', '170', '', '', '', '', '']];
    const next = applyCsvToFormValues(rows, prev);
    expect(next).toEqual(prev);
    expect(next).not.toBe(prev); // 새 객체 반환
    expect(prev['20240101'].height).toBe('160');
  });

  it('템플릿 다운로드 → 업로드 라운드트립: 키/몸무게 유지 + 측정값 빈칸은 폼 값 보존', () => {
    const csv = buildTemplateCsv(students, types);
    const prev = { 20240101: { height: '', weight: '', cardio_value: '77', muscle_value: '', flexibility_value: '', agility_value: '' } };
    const next = applyCsvToFormValues(parseCsv(csv), prev);
    expect(next['20240101'].height).toBe('158.5'); // 템플릿의 키가 폼에 반영
    expect(next['20240101'].cardio_value).toBe('77'); // 템플릿 측정값 칸은 빈칸 → 기존 입력 보존
    expect(next['20240102']).toEqual({
      height: '', weight: '', cardio_value: '', muscle_value: '', flexibility_value: '', agility_value: '',
    });
  });
});
