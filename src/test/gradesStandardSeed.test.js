import { describe, it, expect } from 'vitest';
import {
  GRADES_SEED_BY_LEVEL,
  SCHOOL_LEVELS,
  GRADE_RANGE_BY_LEVEL,
} from '../utils/gradesStandardSeed';

// 행 구조: [grade_level, gender, item, g1_min, g2_min, g3_min, g4_min, g5_min, higher_is_better]
const row = ([grade_level, gender, item, g1, g2, g3, g4, g5, higher_is_better]) => ({
  grade_level, gender, item, g1, g2, g3, g4, g5, higher_is_better,
});

// 기록 시간형 종목(낮을수록 좋음) — calcGrade의 higher_is_better=false 분기와 대응
const LOWER_IS_BETTER_ITEMS = new Set(['sprint_50m', 'endurance_run']);

// 시드에 등장할 수 있는 8종목
const KNOWN_ITEMS = new Set([
  'shuttle_run', 'endurance_run', 'step_test',
  'sit_up', 'grip_strength',
  'sit_and_reach',
  'sprint_50m', 'standing_jump',
]);

// 학교급별 시드가 커버해야 하는 학년 — 초등 시드는 3~6학년만 (PAPS 측정 대상)
const EXPECTED_SEED_GRADES = {
  초등학교: [3, 4, 5, 6],
  중학교: GRADE_RANGE_BY_LEVEL['중학교'],
  고등학교: GRADE_RANGE_BY_LEVEL['고등학교'],
};

describe.each(SCHOOL_LEVELS)('GRADES_SEED_BY_LEVEL — %s', (level) => {
  const rows = GRADES_SEED_BY_LEVEL[level].map(row);

  it('시드 데이터가 존재한다', () => {
    expect(rows.length).toBeGreaterThan(0);
  });

  it('(학년, 성별, 종목) 조합이 중복 없이 유일하다', () => {
    const keys = rows.map((r) => `${r.grade_level}|${r.gender}|${r.item}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('종목명은 알려진 8종목, 성별은 M/F만 사용한다', () => {
    rows.forEach((r) => {
      expect(KNOWN_ITEMS.has(r.item), `알 수 없는 종목: ${r.item}`).toBe(true);
      expect(['M', 'F']).toContain(r.gender);
    });
  });

  it(`학년 커버리지가 기대 범위와 일치한다 (${EXPECTED_SEED_GRADES[level].join(',')}학년)`, () => {
    const grades = [...new Set(rows.map((r) => r.grade_level))].sort((a, b) => a - b);
    expect(grades).toEqual(EXPECTED_SEED_GRADES[level]);
    // 초등 시드 학년은 GRADE_RANGE_BY_LEVEL(3~6)의 부분집합이어야 한다
    grades.forEach((g) => expect(GRADE_RANGE_BY_LEVEL[level]).toContain(g));
  });

  it('모든 학년에 남녀 시드가 모두 있고, 성별 간 종목 구성이 동일하다', () => {
    const grades = [...new Set(rows.map((r) => r.grade_level))];
    grades.forEach((g) => {
      const male = rows.filter((r) => r.grade_level === g && r.gender === 'M').map((r) => r.item).sort();
      const female = rows.filter((r) => r.grade_level === g && r.gender === 'F').map((r) => r.item).sort();
      expect(male.length, `${level} ${g}학년 남자 시드 없음`).toBeGreaterThan(0);
      expect(female.length, `${level} ${g}학년 여자 시드 없음`).toBeGreaterThan(0);
      expect(male).toEqual(female);
    });
  });

  it('종목 방향(higher_is_better)이 종목 특성과 일치한다 — 기록 시간형만 낮을수록 좋음', () => {
    rows.forEach((r) => {
      const expected = !LOWER_IS_BETTER_ITEMS.has(r.item);
      expect(
        r.higher_is_better,
        `${level} ${r.grade_level}학년 ${r.gender} ${r.item}: higher_is_better=${r.higher_is_better}`
      ).toBe(expected);
    });
  });

  it('등급 임계값이 1등급(최우수)→5등급(최하) 방향으로 단조롭다', () => {
    rows.forEach((r) => {
      const label = `${level} ${r.grade_level}학년 ${r.gender} ${r.item}`;
      if (r.higher_is_better) {
        // 높을수록 좋음: g1 > g2 > g3 > g4 > g5(하한)
        expect(r.g1, `${label}: g1>g2 위반`).toBeGreaterThan(r.g2);
        expect(r.g2, `${label}: g2>g3 위반`).toBeGreaterThan(r.g3);
        expect(r.g3, `${label}: g3>g4 위반`).toBeGreaterThan(r.g4);
        expect(r.g4, `${label}: g4>g5 위반`).toBeGreaterThan(r.g5);
      } else {
        // 낮을수록 좋음(달리기 기록 등): g1 < g2 < g3 < g4 < g5(상한)
        expect(r.g1, `${label}: g1<g2 위반`).toBeLessThan(r.g2);
        expect(r.g2, `${label}: g2<g3 위반`).toBeLessThan(r.g3);
        expect(r.g3, `${label}: g3<g4 위반`).toBeLessThan(r.g4);
        expect(r.g4, `${label}: g4<g5 위반`).toBeLessThan(r.g5);
      }
    });
  });

  it('임계값은 모두 유한한 숫자다', () => {
    rows.forEach((r) => {
      [r.g1, r.g2, r.g3, r.g4, r.g5].forEach((v) => {
        expect(typeof v).toBe('number');
        expect(Number.isFinite(v)).toBe(true);
      });
    });
  });
});

describe('GRADES_SEED_BY_LEVEL — 학교급 구성', () => {
  it('SCHOOL_LEVELS 3개 학교급 모두 시드가 있다', () => {
    SCHOOL_LEVELS.forEach((level) => {
      expect(GRADES_SEED_BY_LEVEL[level]).toBeDefined();
    });
    expect(Object.keys(GRADES_SEED_BY_LEVEL).sort()).toEqual([...SCHOOL_LEVELS].sort());
  });

  it('초등 3~4학년은 endurance_run·step_test 미실시 (시드 주석 규칙)', () => {
    const elem = GRADES_SEED_BY_LEVEL['초등학교'].map(row);
    [3, 4].forEach((g) => {
      const items = new Set(elem.filter((r) => r.grade_level === g).map((r) => r.item));
      expect(items.has('endurance_run')).toBe(false);
      expect(items.has('step_test')).toBe(false);
    });
    [5, 6].forEach((g) => {
      const items = new Set(elem.filter((r) => r.grade_level === g).map((r) => r.item));
      expect(items.has('endurance_run')).toBe(true);
      expect(items.has('step_test')).toBe(true);
    });
  });
});
