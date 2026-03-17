/**
 * PAPS 공식 등급 기준표 시드 데이터
 * 출처: PAPS_평가기준표.xlsx (교육부 학생건강정보센터 공식 기준표)
 *
 * 행 구조: [grade_level, gender, item, g1_min, g2_min, g3_min, g4_min, g5_min, higher_is_better]
 *   higher_is_better=true  → g1 > g2 > g3 > g4 (높을수록 좋음, 임계값 이상이면 해당 등급)
 *   higher_is_better=false → g1 < g2 < g3 < g4 (낮을수록 좋음, 임계값 이하이면 해당 등급)
 *
 * endurance_run 단위: 초(seconds) — 입력 시 초 단위로 입력
 * standing_jump 단위: cm (소수점 0.1cm 단위)
 */

// ─────────────────────────────────────────────────────────────────────────────
// 초등학교 (3~6학년)  ※ 3~4학년은 endurance_run·step_test 없음
// ─────────────────────────────────────────────────────────────────────────────
const ELEMENTARY_SCHOOL_DATA = [
  // 3학년 남
  [3,"M","shuttle_run",88,65,40,23,0,true],
  [3,"M","sit_up",66,30,14,4,0,true],
  [3,"M","grip_strength",31,18,12,9,0,true],
  [3,"M","sit_and_reach",8,5,1,-4,-40,true],
  [3,"M","sprint_50m",9,9.8,11,14.4,30,false],
  [3,"M","standing_jump",166.1,141.1,127.1,100.1,0,true],
  // 3학년 여
  [3,"F","shuttle_run",69,51,35,19,0,true],
  [3,"F","sit_up",53,29,13,6,0,true],
  [3,"F","grip_strength",29,16,11,7,0,true],
  [3,"F","sit_and_reach",10,7,5,1,-40,true],
  [3,"F","sprint_50m",9.8,10.5,11.6,13.8,30,false],
  [3,"F","standing_jump",154.1,129.1,118.1,92.1,0,true],

  // 4학년 남
  [4,"M","shuttle_run",96,69,45,26,0,true],
  [4,"M","sit_up",80,40,22,7,0,true],
  [4,"M","grip_strength",31,18.5,15,11.5,0,true],
  [4,"M","sit_and_reach",8,5,1,-4,-40,true],
  [4,"M","sprint_50m",8.8,9.7,10.5,13.2,30,false],
  [4,"M","standing_jump",170.1,149.1,130.1,100.1,0,true],
  // 4학년 여
  [4,"F","shuttle_run",77,57,40,21,0,true],
  [4,"F","sit_up",60,29,18,6,0,true],
  [4,"F","grip_strength",29,18,13.5,10.5,0,true],
  [4,"F","sit_and_reach",10,7,5,1,-40,true],
  [4,"F","sprint_50m",9.4,10.4,11,13.3,30,false],
  [4,"F","standing_jump",161.1,135.1,119.1,97.1,0,true],

  // 5학년 남
  [5,"M","shuttle_run",100,73,50,29,0,true],
  [5,"M","endurance_run",281,324,409,479,999,false],
  [5,"M","step_test",76,62,52,47,0,true],
  [5,"M","sit_up",80,40,22,10,0,true],
  [5,"M","grip_strength",31,23,17,12.5,0,true],
  [5,"M","sit_and_reach",8,5,1,-4,-40,true],
  [5,"M","sprint_50m",8.5,9.4,10.2,13.2,30,false],
  [5,"M","standing_jump",180.1,159.1,141.1,111.1,0,true],
  // 5학년 여
  [5,"F","shuttle_run",85,63,45,23,0,true],
  [5,"F","endurance_run",299,359,441,501,999,false],
  [5,"F","step_test",76,62,52,47,0,true],
  [5,"F","sit_up",60,36,23,7,0,true],
  [5,"F","grip_strength",29,19,15.5,12,0,true],
  [5,"F","sit_and_reach",10,7,5,1,-40,true],
  [5,"F","sprint_50m",8.9,9.9,10.7,13,30,false],
  [5,"F","standing_jump",170.1,139.1,123.1,100.1,0,true],

  // 6학년 남
  [6,"M","shuttle_run",104,78,54,32,0,true],
  [6,"M","endurance_run",250,314,379,449,999,false],
  [6,"M","step_test",76,62,52,47,0,true],
  [6,"M","sit_up",80,40,22,10,0,true],
  [6,"M","grip_strength",35,26.5,19,15,0,true],
  [6,"M","sit_and_reach",8,5,1,-4,-40,true],
  [6,"M","sprint_50m",8.1,9.1,10,12.5,30,false],
  [6,"M","standing_jump",200.1,167.1,148.1,122.1,0,true],
  // 6학년 여
  [6,"F","shuttle_run",93,69,50,25,0,true],
  [6,"F","endurance_run",299,353,429,479,999,false],
  [6,"F","step_test",76,62,52,47,0,true],
  [6,"F","sit_up",60,43,23,7,0,true],
  [6,"F","grip_strength",33,22,19,14,0,true],
  [6,"F","sit_and_reach",14,10,5,2,-40,true],
  [6,"F","sprint_50m",8.9,9.8,10.7,12.9,30,false],
  [6,"F","standing_jump",175.1,144.1,127.1,100.1,0,true],
];

// ─────────────────────────────────────────────────────────────────────────────
// 중학교 (1~3학년)
// ─────────────────────────────────────────────────────────────────────────────
const MIDDLE_SCHOOL_DATA = [
  // 1학년 남
  [1,"M","shuttle_run",64,50,36,20,0,true],
  [1,"M","endurance_run",425,502,599,699,999,false],
  [1,"M","step_test",76,62,52,47,0,true],
  [1,"M","sit_up",90,55,33,14,0,true],
  [1,"M","grip_strength",42,30,22.5,16.5,0,true],
  [1,"M","sit_and_reach",10,6,2,-4,-40,true],
  [1,"M","sprint_50m",7.5,8.4,9.3,11.5,30,false],
  [1,"M","standing_jump",211.1,177.1,159.1,131.1,0,true],
  // 1학년 여
  [1,"F","shuttle_run",35,25,19,14,0,true],
  [1,"F","endurance_run",379,442,517,608,999,false],
  [1,"F","step_test",76,62,52,47,0,true],
  [1,"F","sit_up",58,43,22,7,0,true],
  [1,"F","grip_strength",36,23,19,14,0,true],
  [1,"F","sit_and_reach",15,11,8,2,-40,true],
  [1,"F","sprint_50m",8.8,9.8,10.5,12.2,30,false],
  [1,"F","standing_jump",175.1,144.1,127.1,100.1,0,true],

  // 2학년 남
  [2,"M","shuttle_run",66,52,38,22,0,true],
  [2,"M","endurance_run",416,487,583,679,999,false],
  [2,"M","step_test",76,62,52,47,0,true],
  [2,"M","sit_up",90,55,33,14,0,true],
  [2,"M","grip_strength",44.5,37,28.5,22,0,true],
  [2,"M","sit_and_reach",10,7,2,-4,-40,true],
  [2,"M","sprint_50m",7.3,8.2,9,11.5,30,false],
  [2,"M","standing_jump",218.1,187.1,169.1,136.1,0,true],
  // 2학년 여
  [2,"F","shuttle_run",40,29,21,15,0,true],
  [2,"F","endurance_run",379,442,517,608,999,false],
  [2,"F","step_test",76,62,52,47,0,true],
  [2,"F","sit_up",58,39,19,7,0,true],
  [2,"F","grip_strength",36,25.5,19.5,14,0,true],
  [2,"F","sit_and_reach",15,11,8,2,-40,true],
  [2,"F","sprint_50m",8.8,9.8,10.5,12.2,30,false],
  [2,"F","standing_jump",183.1,145.1,127.1,100.1,0,true],

  // 3학년 남
  [3,"M","shuttle_run",68,54,40,24,0,true],
  [3,"M","endurance_run",407,472,567,659,999,false],
  [3,"M","step_test",76,62,52,47,0,true],
  [3,"M","sit_up",90,55,33,14,0,true],
  [3,"M","grip_strength",48.5,40.5,33,25,0,true],
  [3,"M","sit_and_reach",10,7,2.6,-3,-40,true],
  [3,"M","sprint_50m",7,7.8,8.5,11,30,false],
  [3,"M","standing_jump",238.1,201.1,180.1,145.1,0,true],
  // 3학년 여
  [3,"F","shuttle_run",45,33,23,16,0,true],
  [3,"F","endurance_run",379,442,517,608,999,false],
  [3,"F","step_test",76,62,52,47,0,true],
  [3,"F","sit_up",52,34,17,6,0,true],
  [3,"F","grip_strength",36,27.5,19.5,16,0,true],
  [3,"F","sit_and_reach",16,11,8,2,-40,true],
  [3,"F","sprint_50m",8.8,9.8,10.5,12.2,30,false],
  [3,"F","standing_jump",183.1,145.1,127.1,100.1,0,true],
];

// ─────────────────────────────────────────────────────────────────────────────
// 고등학교 (1~3학년)
// ─────────────────────────────────────────────────────────────────────────────
const HIGH_SCHOOL_DATA = [
  // 1학년 남
  [1,"M","shuttle_run",70,56,42,26,0,true],
  [1,"M","endurance_run",398,457,551,639,999,false],
  [1,"M","step_test",76,62,52,47,0,true],
  [1,"M","sit_up",90,60,35,15,0,true],
  [1,"M","grip_strength",61,42.5,35.5,29,0,true],
  [1,"M","sit_and_reach",13,9,4,-2,-40,true],
  [1,"M","sprint_50m",7,7.6,8.1,10,30,false],
  [1,"M","standing_jump",255.1,216.1,195.1,160.1,0,true],
  // 1학년 여
  [1,"F","shuttle_run",50,37,25,17,0,true],
  [1,"F","endurance_run",379,442,517,608,999,false],
  [1,"F","step_test",76,62,52,47,0,true],
  [1,"F","sit_up",40,30,13,4,0,true],
  [1,"F","grip_strength",36,29,23,16.5,0,true],
  [1,"F","sit_and_reach",16,11,8,2,-40,true],
  [1,"F","sprint_50m",8.8,9.8,10.5,12.2,30,false],
  [1,"F","standing_jump",186.1,159.1,139.1,100.1,0,true],

  // 2학년 남
  [2,"M","shuttle_run",72,58,44,28,0,true],
  [2,"M","endurance_run",389,442,535,619,999,false],
  [2,"M","step_test",76,62,52,47,0,true],
  [2,"M","sit_up",90,60,35,17,0,true],
  [2,"M","grip_strength",61,46,39,31,0,true],
  [2,"M","sit_and_reach",16,11,5,0.1,-40,true],
  [2,"M","sprint_50m",6.7,7.5,7.9,9.5,30,false],
  [2,"M","standing_jump",258.1,228.1,212.1,177.1,0,true],
  // 2학년 여
  [2,"F","shuttle_run",55,41,27,18,0,true],
  [2,"F","endurance_run",379,442,517,608,999,false],
  [2,"F","step_test",76,62,52,47,0,true],
  [2,"F","sit_up",40,30,13,4,0,true],
  [2,"F","grip_strength",37.5,29.5,25,18,0,true],
  [2,"F","sit_and_reach",17,12,9,5,-40,true],
  [2,"F","sprint_50m",8.8,9.5,10.5,12.2,30,false],
  [2,"F","standing_jump",186.1,159.1,139.1,100.1,0,true],

  // 3학년 남
  [3,"M","shuttle_run",74,60,46,30,0,true],
  [3,"M","endurance_run",380,427,519,599,999,false],
  [3,"M","step_test",76,62,52,47,0,true],
  [3,"M","sit_up",90,60,35,17,0,true],
  [3,"M","grip_strength",63.5,46,39,31,0,true],
  [3,"M","sit_and_reach",16,11,6,0.1,-40,true],
  [3,"M","sprint_50m",6.7,7.5,7.9,8.7,30,false],
  [3,"M","standing_jump",264.1,243.1,221.1,185.1,0,true],
  // 3학년 여
  [3,"F","shuttle_run",55,41,27,18,0,true],
  [3,"F","endurance_run",379,442,517,608,999,false],
  [3,"F","step_test",76,62,52,47,0,true],
  [3,"F","sit_up",40,30,13,4,0,true],
  [3,"F","grip_strength",37.5,29.5,25,18,0,true],
  [3,"F","sit_and_reach",17,12,9,5,-40,true],
  [3,"F","sprint_50m",8.8,9.5,10.5,12.2,30,false],
  [3,"F","standing_jump",186.1,159.1,139.1,100.1,0,true],
];

export const GRADES_SEED_BY_LEVEL = {
  중학교: MIDDLE_SCHOOL_DATA,
  고등학교: HIGH_SCHOOL_DATA,
  초등학교: ELEMENTARY_SCHOOL_DATA,
};

export const SCHOOL_LEVELS = ["초등학교", "중학교", "고등학교"];

// school_level에 따른 학생 학년 범위
export const GRADE_RANGE_BY_LEVEL = {
  초등학교: [1, 2, 3, 4, 5, 6],
  중학교: [1, 2, 3],
  고등학교: [1, 2, 3],
};
