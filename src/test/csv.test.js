import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseCsvLine, parseCsv, parseCsvWithLines, downloadCsv, normalizeGender, readCsvFile } from '../utils/csv';

describe('normalizeGender (기록시트지 남/여 ↔ 시트 M/F 변환)', () => {
  it('남/남자/M(대소문자)/male → M', () => {
    expect(normalizeGender('남')).toBe('M');
    expect(normalizeGender('남자')).toBe('M');
    expect(normalizeGender('M')).toBe('M');
    expect(normalizeGender('m')).toBe('M');
    expect(normalizeGender('male')).toBe('M');
  });

  it('여/여자/F(대소문자)/W/female → F', () => {
    expect(normalizeGender('여')).toBe('F');
    expect(normalizeGender('여자')).toBe('F');
    expect(normalizeGender('F')).toBe('F');
    expect(normalizeGender('f')).toBe('F');
    expect(normalizeGender('W')).toBe('F');
    expect(normalizeGender('female')).toBe('F');
  });

  it('앞뒤 공백 허용', () => {
    expect(normalizeGender(' 남 ')).toBe('M');
    expect(normalizeGender(' f ')).toBe('F');
  });

  it('인식 불가 값·빈 값·null은 null', () => {
    expect(normalizeGender('x')).toBeNull();
    expect(normalizeGender('남여')).toBeNull();
    expect(normalizeGender('')).toBeNull();
    expect(normalizeGender(null)).toBeNull();
    expect(normalizeGender(undefined)).toBeNull();
  });
});

describe('readCsvFile (인코딩 자동 감지)', () => {
  // readCsvFile은 file.arrayBuffer()만 사용 — Blob 대신 최소 mock으로 검증
  const fakeFile = (bytes) => ({ arrayBuffer: async () => Uint8Array.from(bytes).buffer });

  it('UTF-8 파일은 그대로 디코딩', async () => {
    const utf8 = [...new TextEncoder().encode('학번,이름\n1,홍길동')];
    expect(await readCsvFile(fakeFile(utf8))).toBe('학번,이름\n1,홍길동');
  });

  it('BOM 있는 UTF-8도 정상 디코딩 (TextDecoder가 BOM 제거)', async () => {
    const utf8 = [0xef, 0xbb, 0xbf, ...new TextEncoder().encode('a,남')];
    expect(await readCsvFile(fakeFile(utf8))).toBe('a,남');
  });

  it('EUC-KR(CP949, Excel 한글 CSV 저장) 파일은 폴백 디코딩 — 한글 깨짐 방지', async () => {
    // '남' = B3 B2, '여' = BF A9 (EUC-KR)
    const eucKr = [...new TextEncoder().encode('a,'), 0xb3, 0xb2, 0x0a, 0x62, 0x2c, 0xbf, 0xa9];
    expect(await readCsvFile(fakeFile(eucKr))).toBe('a,남\nb,여');
  });
});

describe('parseCsvWithLines (원본 행 번호 보존)', () => {
  it('빈 줄이 없으면 인덱스와 행 번호 일치 (1-base)', () => {
    expect(parseCsvWithLines('a,b\n1,2')).toEqual([
      { line: 1, cells: ['a', 'b'] },
      { line: 2, cells: ['1', '2'] },
    ]);
  });

  it('파일 중간 빈 줄만큼 행 번호가 원본 기준으로 유지 — 오류 안내 어긋남 방지', () => {
    // 3행이 빈 줄 → 데이터 두 번째 행은 원본 4행
    const rows = parseCsvWithLines('h1,h2\n1,2\n\n3,4\n');
    expect(rows).toEqual([
      { line: 1, cells: ['h1', 'h2'] },
      { line: 2, cells: ['1', '2'] },
      { line: 4, cells: ['3', '4'] },
    ]);
  });

  it('연속 빈 줄·공백만 있는 줄도 건너뛰되 번호 유지', () => {
    const rows = parseCsvWithLines('h\n\n  \n\nx');
    expect(rows).toEqual([
      { line: 1, cells: ['h'] },
      { line: 5, cells: ['x'] },
    ]);
  });

  it('BOM 제거 + CRLF 처리 — parseCsv와 동일한 전처리', () => {
    const rows = parseCsvWithLines('﻿a,b\r\n1,2\r\n');
    expect(rows).toEqual([
      { line: 1, cells: ['a', 'b'] },
      { line: 2, cells: ['1', '2'] },
    ]);
  });

  it('빈 입력/null은 빈 배열', () => {
    expect(parseCsvWithLines('')).toEqual([]);
    expect(parseCsvWithLines(null)).toEqual([]);
  });
});

describe('parseCsvLine (따옴표 인식 한 줄 파싱)', () => {
  it('일반 쉼표 구분 — 기존 split(",").map(trim)과 동일', () => {
    expect(parseCsvLine('20240101, 홍길동 ,M,1,1,165,58')).toEqual(
      ['20240101', '홍길동', 'M', '1', '1', '165', '58']
    );
  });

  it('따옴표로 감싼 필드 내부의 쉼표 보존', () => {
    expect(parseCsvLine('a,"1,5",b')).toEqual(['a', '1,5', 'b']);
  });

  it('이스케이프된 따옴표("") 처리', () => {
    expect(parseCsvLine('a,"say ""hi""",b')).toEqual(['a', 'say "hi"', 'b']);
  });

  it('빈 셀 유지', () => {
    expect(parseCsvLine('id,,,,')).toEqual(['id', '', '', '', '']);
  });
});

describe('parseCsv (전체 텍스트 파싱)', () => {
  it('줄 단위 분리 + 빈 줄 제외', () => {
    expect(parseCsv('a,b\n\n1,2\n')).toEqual([['a', 'b'], ['1', '2']]);
  });

  it('CRLF(윈도우 저장 CSV) 처리 — \\r 제거', () => {
    expect(parseCsv('a,b\r\n1,2\r\n')).toEqual([['a', 'b'], ['1', '2']]);
  });

  it('UTF-8 BOM 제거', () => {
    expect(parseCsv('﻿student_id,name\n1,김')).toEqual(
      [['student_id', 'name'], ['1', '김']]
    );
  });

  it('null/undefined 입력이면 빈 배열', () => {
    expect(parseCsv(null)).toEqual([]);
    expect(parseCsv(undefined)).toEqual([]);
  });

  it('따옴표 안 개행 보존 — 기록시트지 다중행 헤더 셀이 행을 쪼개지 않음', () => {
    const rows = parseCsv('번호,이름,"셔틀런\n(회)","키\n(cm)"\r\n1,권민준,42,152\n');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual(['번호', '이름', '셔틀런\n(회)', '키\n(cm)']);
    expect(rows[1]).toEqual(['1', '권민준', '42', '152']);
  });

  it('셀이 전부 빈 행만 제외 (일부 빈 셀 행은 유지)', () => {
    expect(parseCsv('a,b\n,,\n1,\n')).toEqual([['a', 'b'], ['1', '']]);
  });

  it('측정 CSV 템플릿 라운드트립 — 헤더 라벨의 괄호·쉼표 포함 셀 유지', () => {
    // ClassMeasure 템플릿 형식 (헤더 + 학생 행)
    const header =
      'student_id,이름,성별,학년,반,키(cm),몸무게(kg),심폐지구력(왕복오래달리기),근력근지구력(윗몸말아올리기),유연성(앉아윗몸앞으로굽히기cm),순발력(50m 달리기)';
    const row = ['20240101', '홍길동', '남', '1', '1', '165.5', '58', '45', '30', '12', '8.5'].join(',');
    const rows = parseCsv('﻿' + [header, row].join('\n'));
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveLength(11);
    expect(rows[1]).toEqual(['20240101', '홍길동', '남', '1', '1', '165.5', '58', '45', '30', '12', '8.5']);
    // 값에 쉼표가 든 경우(따옴표 감싸기)도 컬럼 수 유지
    const quoted = parseCsv('a,b,c\n"김,철수",1,2');
    expect(quoted[1]).toEqual(['김,철수', '1', '2']);
  });
});

describe('downloadCsv', () => {
  let clickSpy;
  let capturedBlobs;

  beforeEach(() => {
    capturedBlobs = [];
    clickSpy = vi.fn();
    // jsdom에는 createObjectURL/revokeObjectURL이 없음 — stubGlobal 아닌 직접 정의
    URL.createObjectURL = vi.fn((blob) => {
      capturedBlobs.push(blob);
      return 'blob:mock';
    });
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(document, 'createElement').mockReturnValue({ click: clickSpy });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete URL.createObjectURL;
    delete URL.revokeObjectURL;
  });

  it('기본은 UTF-8 BOM을 앞에 붙여 다운로드 (Excel 한글 깨짐 방지)', async () => {
    downloadCsv('측정기록.csv', 'a,b\n1,2');
    expect(clickSpy).toHaveBeenCalledTimes(1);
    // Blob.text()는 BOM을 제거하므로 원시 바이트로 검증 (EF BB BF)
    const bytes = new Uint8Array(await capturedBlobs[0].arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(await capturedBlobs[0].text()).toBe('a,b\n1,2');
    expect(capturedBlobs[0].type).toBe('text/csv;charset=utf-8;');
  });

  it('bom: false 옵션이면 BOM 없이 내용 그대로', async () => {
    downloadCsv('students_template.csv', 'h\nrow\n', { bom: false });
    const bytes = new Uint8Array(await capturedBlobs[0].arrayBuffer());
    expect([...bytes.slice(0, 3)]).not.toEqual([0xef, 0xbb, 0xbf]);
    expect(await capturedBlobs[0].text()).toBe('h\nrow\n');
  });
});
