import { describe, it, expect } from 'vitest';
import {
  IMPORT_FIELDS, MEASURE_FIELDS, guessMapping, guessMeasurementMapping, guessTypes,
  detectHeaderRow, mappingSignature, buildImportRows,
} from '../pages/app/studentImport';

// 실제 기록시트지 헤더 전체 구조 (30컬럼) — 종목별 1차/2차/최고 + 점수/등급 컬럼
const FULL_HEADER = [
  '번호', '이름', '성별',
  '셔틀런\n(회)', '점수', '등급',
  '유연성\n1차(cm)', '유연성\n2차(cm)', '최고\n(cm)', '점수', '등급',
  '악력\n1차L', '악력\n1차R', '악력\n2차L', '악력\n2차R', '최고\n(kg)', '점수', '등급',
  '제자리\n1차(cm)', '제자리\n2차(cm)', '최고\n(cm)', '점수', '등급',
  '키\n(cm)', '체중\n(kg)', 'BMI', '점수', '등급', '총점\n(/100)', '총점\n등급',
];

// 실제 학교 기록시트지 구조 축약 픽스처 — 제목·날짜 행 뒤 5행째에 헤더, 학년/반 컬럼 없음
const RECORD_SHEET = [
  ['PAPS 체력측정 기록부 — 중학교 1학년 1반', '', '', '학교명', '화접중'],
  ['주제', '', 'PAPS', '심폐지구력', ''],
  ['재적', '29', '날짜', '2026-03-30', ''],
  ['', '', '요일', '월', ''],
  ['번호', '이름', '성별', '셔틀런\n(회)', '점수', '등급', '키\n(cm)', '체중\n(kg)'],
  ['1', '권민준', '남', '42', '9', '3등급', '152', '37.8'],
  ['2', '김라임', '여', '21', '9', '3등급', '154.3', '38.6'],
  ['', '', '', '', '', '', '', ''],
  ['3', '김상우', '남', '19', '3', '5등급', '0', '0'],
];

describe('guessMapping (헤더 셀 → 필드 매핑 추정)', () => {
  it('표준 템플릿 헤더 전 필드 인식', () => {
    const m = guessMapping(['학번', '이름', '성별', '학년', '반', '키(cm)', '몸무게(kg)']);
    expect(m).toEqual({ student_id: 0, name: 1, gender: 2, grade: 3, class: 4, height: 5, weight: 6 });
  });

  it('기록시트지 헤더 — 개행 포함 셀·체중/신장 동의어 인식', () => {
    const m = guessMapping(RECORD_SHEET[4]);
    expect(m.number).toBe(0);
    expect(m.name).toBe(1);
    expect(m.gender).toBe(2);
    expect(m.height).toBe(6);
    expect(m.weight).toBe(7);
    expect(m.student_id).toBeUndefined();
  });

  it('영문 헤더 인식', () => {
    const m = guessMapping(['student_id', 'name', 'gender', 'grade', 'class']);
    expect(m).toEqual({ student_id: 0, name: 1, gender: 2, grade: 3, class: 4 });
  });

  it('같은 필드에 여러 후보면 exact 매칭 우선', () => {
    // "학년·반"(부분) vs "반"(exact) — exact인 3번 컬럼이 class로 배정
    const m = guessMapping(['이름', '학년·반', '성별', '반']);
    expect(m.class).toBe(3);
  });
});

describe('detectHeaderRow (헤더 행 자동 탐지)', () => {
  it('기록시트지 — 제목·날짜 행을 건너뛰고 5행(인덱스 4)을 헤더로 탐지', () => {
    const { headerRow, mapping } = detectHeaderRow(RECORD_SHEET);
    expect(headerRow).toBe(4);
    expect(mapping.name).toBe(1);
  });

  it('1행 헤더 표준 CSV도 탐지', () => {
    const grid = [['student_id', 'name', 'gender'], ['1', '홍길동', 'M']];
    expect(detectHeaderRow(grid).headerRow).toBe(0);
  });

  it('이름 컬럼이 없으면 -1', () => {
    const grid = [['날짜', '점수'], ['1', '2']];
    expect(detectHeaderRow(grid).headerRow).toBe(-1);
  });
});

describe('buildImportRows (후보 생성)', () => {
  const mapping = detectHeaderRow(RECORD_SHEET).mapping;
  const opts = { schoolYear: 2026, fallbackGrade: '1', fallbackClass: '1' };

  it('학번 자동 생성(학년도+학년+반+번호 2자리) + 남/여 변환 + 원본 행 번호', () => {
    const { candidates, errors } = buildImportRows(RECORD_SHEET, 4, mapping, opts);
    expect(errors).toEqual([]);
    expect(candidates).toHaveLength(3); // 빈 행 제외
    expect(candidates[0]).toEqual({
      line: 6,
      data: { student_id: '20261101', name: '권민준', gender: 'M', grade: '1', class: '1', height: '152', weight: '37.8' },
      // 이 테스트의 mapping은 학생 필드만 포함(detectHeaderRow) — 측정 컬럼 미매핑 시 빈 값
      measures: { cardio_value: '', muscle_value: '', flexibility_value: '', agility_value: '' },
    });
    expect(candidates[1].data.gender).toBe('F');
    expect(candidates[1].data.student_id).toBe('20261102');
  });

  it('키/몸무게 0은 미입력으로 처리 (0 저장 금지)', () => {
    const { candidates } = buildImportRows(RECORD_SHEET, 4, mapping, opts);
    const kim = candidates.find((c) => c.data.name === '김상우');
    expect(kim.data.height).toBe('');
    expect(kim.data.weight).toBe('');
  });

  it('인식 불가 성별은 행 단위 오류', () => {
    const grid = [RECORD_SHEET[4], ['1', '홍길동', 'x', '', '', '', '', '']];
    const { candidates, errors } = buildImportRows(grid, 0, mapping, opts);
    expect(candidates).toHaveLength(0);
    expect(errors[0]).toContain('성별 "x"');
  });

  it('학번 컬럼이 있으면 그대로 사용', () => {
    const grid = [
      ['학번', '이름', '성별', '학년', '반'],
      ['20240101', '홍길동', 'M', '1', '1'],
    ];
    const m = guessMapping(grid[0]);
    const { candidates } = buildImportRows(grid, 0, m, { schoolYear: 2026 });
    expect(candidates[0].data.student_id).toBe('20240101');
  });

  it('학번 없고 학년/반 폴백도 없으면 오류', () => {
    const { candidates, errors } = buildImportRows(RECORD_SHEET, 4, mapping, { schoolYear: 2026 });
    expect(candidates).toHaveLength(0);
    expect(errors[0]).toContain('학번을 생성할 수 없습니다');
  });

  it('파일 내 학번 중복·기존 등록 학번은 오류로 제외', () => {
    const grid = [
      ['학번', '이름', '성별'],
      ['S1', '홍길동', 'M'],
      ['S1', '김철수', 'M'],
      ['S2', '이영희', 'F'],
    ];
    const m = guessMapping(grid[0]);
    const { candidates, errors } = buildImportRows(grid, 0, m, { existingIds: new Set(['S2']) });
    expect(candidates.map((c) => c.data.name)).toEqual(['홍길동']);
    expect(errors).toHaveLength(2);
    expect(errors[0]).toContain('파일 내에서 중복');
    expect(errors[1]).toContain('이미 등록된 학생');
  });

  it('반복 헤더 행("이름" 셀)은 건너뜀', () => {
    const grid = [
      ['학번', '이름', '성별'],
      ['S1', '홍길동', 'M'],
      ['학번', '이름', '성별'],
      ['S2', '김철수', 'M'],
    ];
    const m = guessMapping(grid[0]);
    const { candidates, errors } = buildImportRows(grid, 0, m, {});
    expect(errors).toEqual([]);
    expect(candidates.map((c) => c.data.name)).toEqual(['홍길동', '김철수']);
  });

  it('"1학년"처럼 단위가 붙은 학년/반 셀에서 숫자 추출', () => {
    const grid = [
      ['이름', '성별', '학년', '반', '번호'],
      ['홍길동', '남', '2학년', '3반', '7'],
    ];
    const m = guessMapping(grid[0]);
    const { candidates } = buildImportRows(grid, 0, m, { schoolYear: 2026 });
    expect(candidates[0].data.grade).toBe('2');
    expect(candidates[0].data.class).toBe('3');
    expect(candidates[0].data.student_id).toBe('20262307');
  });
});

describe('guessMeasurementMapping (체력측정 기록 컬럼 추정)', () => {
  it('기록시트지 전체 헤더 — 종목 구간 안의 "최고" 컬럼을 기록값으로 선택', () => {
    const m = guessMeasurementMapping(FULL_HEADER);
    expect(m.cardio_value).toBe(3);       // 셔틀런(회) — 최고 없음 → 시작 컬럼
    expect(m.flexibility_value).toBe(8);  // 유연성 1차/2차 → 최고(cm)
    expect(m.muscle_value).toBe(15);      // 악력 1차L..2차R → 최고(kg)
    expect(m.agility_value).toBe(20);     // 제자리 1차/2차 → 최고(cm)
  });

  it('키/체중/BMI/총점 컬럼은 종목 구간 경계로 취급 — 다른 영역 최고를 넘보지 않음', () => {
    // 순발력 구간 다음이 키(cm) — 그 뒤의 "최고"류 셀을 집지 않아야 함
    const m = guessMeasurementMapping(['이름', '제자리\n1차', '키\n(cm)', '최고\n(cm)']);
    expect(m.agility_value).toBe(1);
  });

  it('측정 컬럼이 없는 표준 템플릿은 빈 매핑', () => {
    expect(guessMeasurementMapping(['학번', '이름', '성별', '학년', '반', '키(cm)', '몸무게(kg)'])).toEqual({});
  });
});

describe('guessTypes (측정 종목 유형 추정)', () => {
  it('기록시트지 — 셔틀런/악력/제자리 인식', () => {
    expect(guessTypes(FULL_HEADER)).toEqual({
      cardioType: 'shuttle_run', muscleType: 'grip_strength', agilityType: 'standing_jump',
    });
  });

  it('윗몸·50m 양식', () => {
    const t = guessTypes(['윗몸말아올리기', '50m 달리기']);
    expect(t.muscleType).toBe('sit_up');
    expect(t.agilityType).toBe('sprint_50m');
  });

  it('오래달리기(왕복 아님) → endurance_run, 스텝 → step_test', () => {
    expect(guessTypes(['오래달리기-걷기']).cardioType).toBe('endurance_run');
    expect(guessTypes(['스텝검사']).cardioType).toBe('step_test');
    expect(guessTypes(['왕복오래달리기']).cardioType).toBe('shuttle_run');
  });
});

describe('buildImportRows — 체력측정 기록', () => {
  it('매핑된 측정 컬럼 값을 measures로 반환 (음수 유연성 허용, 미매핑은 빈 문자열)', () => {
    const grid = [
      ['이름', '성별', '셔틀런\n(회)', '최고\n(cm)'],
      ['이로하', '남', '17', '-8.7'],
    ];
    const mapping = { name: 0, gender: 1, cardio_value: 2, flexibility_value: 3 };
    const { candidates } = buildImportRows(grid, 0, mapping, { schoolYear: 2026, fallbackGrade: '1', fallbackClass: '1' });
    expect(candidates[0].measures).toEqual({
      cardio_value: '17', muscle_value: '', flexibility_value: '-8.7', agility_value: '',
    });
  });
});

describe('mappingSignature (양식 프리셋 식별)', () => {
  it('같은 헤더 구성이면 같은 서명 (공백·개행 무시)', () => {
    expect(mappingSignature(['번호', '이름', '키\n(cm)'])).toBe(mappingSignature(['번호', '이름', '키 (cm)']));
  });

  it('다른 양식이면 다른 서명, 빈 셀은 제외', () => {
    expect(mappingSignature(['이름', '', '성별'])).toBe('이름|성별');
    expect(mappingSignature(['이름', '성별'])).not.toBe(mappingSignature(['이름', '학년']));
  });
});

describe('IMPORT_FIELDS 계약', () => {
  it('스키마 필수 필드(name·gender·grade·class)가 모두 매핑 대상에 포함', () => {
    const keys = IMPORT_FIELDS.map((f) => f.key);
    ['student_id', 'name', 'gender', 'grade', 'class', 'height', 'weight'].forEach((k) =>
      expect(keys).toContain(k)
    );
  });
});
