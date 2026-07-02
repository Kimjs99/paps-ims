import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseCsvLine, parseCsv, downloadCsv } from '../utils/csv';

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

  it('bom: false면 BOM 없이 내용 그대로 (학생 템플릿 기존 동작)', async () => {
    downloadCsv('students_template.csv', 'h\nrow\n', { bom: false });
    const bytes = new Uint8Array(await capturedBlobs[0].arrayBuffer());
    expect([...bytes.slice(0, 3)]).not.toEqual([0xef, 0xbb, 0xbf]);
    expect(await capturedBlobs[0].text()).toBe('h\nrow\n');
  });
});
