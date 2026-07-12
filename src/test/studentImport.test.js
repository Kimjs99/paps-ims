import { describe, it, expect } from 'vitest';
import {
  IMPORT_FIELDS, guessMapping, detectHeaderRow, mappingSignature, buildImportRows,
} from '../pages/app/studentImport';

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
