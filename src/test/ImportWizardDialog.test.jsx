import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ImportWizardDialog } from '../components/students/ImportWizardDialog';
import { makeStudentSchema } from '../utils/validators';

// 실제 기록시트지 축약본 (제목·날짜 행 + 5행째 헤더, 학년/반 컬럼 없음)
// 헤더에 따옴표 안 개행 셀 포함 — 다중행 헤더 파싱 회귀 방지
const RECORD_CSV = [
  'PAPS 체력측정 기록부 — 중학교 1학년 1반,,,학교명,화접중',
  '재적,3,날짜,2026-03-30,',
  ',,요일,월,',
  '번호,이름,성별,"셔틀런\n(회)","키\n(cm)","체중\n(kg)"',
  '1,권민준,남,42,152,37.8',
  '2,김라임,여,21,154.3,38.6',
].join('\n');

const makeCsvFile = (content, name = '기록시트지.csv') => {
  const file = new File([content], name, { type: 'text/csv' });
  // jsdom File에는 arrayBuffer가 없을 수 있음 — readCsvFile이 사용하므로 폴리필
  if (!file.arrayBuffer) {
    file.arrayBuffer = () => Promise.resolve(new TextEncoder().encode(content).buffer);
  }
  return file;
};

const defaultProps = () => ({
  open: true,
  onOpenChange: vi.fn(),
  studentSchema: makeStudentSchema('중학교'),
  gradeOptions: [1, 2, 3],
  existingIds: new Set(),
  onApply: vi.fn(),
});

const uploadFile = async (content) => {
  const input = document.querySelector('input[type="file"]');
  fireEvent.change(input, { target: { files: [makeCsvFile(content)] } });
  await waitFor(() => expect(screen.getByText(/명 인식/)).toBeInTheDocument());
};

beforeEach(() => localStorage.clear());

describe('ImportWizardDialog', () => {
  it('기록시트지 CSV 업로드 → 헤더 자동 탐지 + 학년/반 직접 입력 안내', async () => {
    render(<ImportWizardDialog {...defaultProps()} />);
    await uploadFile(RECORD_CSV);

    // 학년/반 컬럼이 없는 양식 → 직접 입력 안내 + 입력 전에는 학번 생성 불가 오류
    expect(screen.getByText(/학년\/반 컬럼이 없습니다/)).toBeInTheDocument();
    expect(screen.getByText(/0명 인식/)).toBeInTheDocument();
    expect(screen.getAllByText(/학번을 생성할 수 없습니다/).length).toBeGreaterThan(0);
    // 적용 버튼은 후보 0명이라 비활성
    expect(screen.getByText('등록 목록에 추가').closest('button')).toBeDisabled();
  });

  it('반 직접 입력 후 적용 → 학번 자동 생성(학년+반+번호) + 남/여 변환 결과 onApply 전달', async () => {
    // 학년 컬럼은 있고 반 컬럼만 없는 양식 — 반은 일반 Input이라 jsdom에서 입력 가능
    // (학년 폴백은 Radix Select라 jsdom 포인터 제약으로 여기서는 컬럼 매핑 경로로 검증)
    const props = defaultProps();
    render(<ImportWizardDialog {...props} />);
    await uploadFile('번호,이름,성별,학년,키(cm)\n1,권민준,남,1,152\n2,김라임,여,1,154.3');

    fireEvent.change(screen.getByLabelText('반 직접 입력'), { target: { value: '1' } });
    await waitFor(() => expect(screen.getByText(/2명 인식/)).toBeInTheDocument());
    expect(screen.getByText('권민준')).toBeInTheDocument();
    expect(screen.getByText('10101')).toBeInTheDocument();

    fireEvent.click(screen.getByText('2명 검증 후 등록 목록에 추가'));
    expect(props.onApply).toHaveBeenCalledWith(
      [
        expect.objectContaining({ student_id: '10101', name: '권민준', gender: 'M', grade: 1, class: 1, height: 152 }),
        expect.objectContaining({ student_id: '10102', name: '김라임', gender: 'F' }),
      ],
      [],
      null // 측정 컬럼 없는 양식
    );
    expect(props.onOpenChange).toHaveBeenCalledWith(false);
  });

  it('표준 템플릿(학번·학년·반 포함)은 추가 입력 없이 바로 적용 가능', async () => {
    const props = defaultProps();
    render(<ImportWizardDialog {...props} />);
    await uploadFile('학번,이름,성별,학년,반,키(cm),몸무게(kg)\n20240101,홍길동,남,1,1,165,58');

    expect(screen.getByText('미리보기 — 1명 인식')).toBeInTheDocument();
    expect(screen.queryByText(/학년\/반 컬럼이 없습니다/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('1명 검증 후 등록 목록에 추가'));
    expect(props.onApply).toHaveBeenCalledWith(
      [expect.objectContaining({ student_id: '20240101', name: '홍길동', gender: 'M', grade: 1, class: 1 })],
      [],
      null // 측정 컬럼이 없는 양식 → 측정 페이로드 없음
    );
    expect(props.onOpenChange).toHaveBeenCalledWith(false);
  });

  it('측정 기록 컬럼이 있으면 적용 시 measures 페이로드 전달 (종목 유형 추정 포함)', async () => {
    const props = defaultProps();
    render(<ImportWizardDialog {...props} />);
    await uploadFile([
      '번호,이름,성별,학년,"셔틀런\n(회)","유연성\n1차(cm)","최고\n(cm)"',
      '1,권민준,남,1,42,-8.5,-8.7',
      '2,김라임,여,1,,10.1,10.5',
    ].join('\n'));

    // 측정 컬럼 자동 인식 → 함께 등록 체크박스 활성 + 미리보기에 심폐 열 표시
    expect(screen.getByRole('checkbox')).toBeChecked();
    fireEvent.change(screen.getByLabelText('반 직접 입력'), { target: { value: '1' } });
    await waitFor(() => expect(screen.getByText(/2명 인식/)).toBeInTheDocument());

    fireEvent.click(screen.getByText('2명 검증 후 등록 목록에 추가'));
    expect(props.onApply).toHaveBeenCalledWith(
      expect.any(Array),
      [],
      {
        // 이 양식엔 순발력 단서가 없어 기본 종목(sprint_50m) 유지
        types: { cardioType: 'shuttle_run', muscleType: 'sit_up', agilityType: 'sprint_50m' },
        byStudent: {
          10101: { cardio_value: '42', muscle_value: '', flexibility_value: '-8.7', agility_value: '' },
          10102: { cardio_value: '', muscle_value: '', flexibility_value: '10.5', agility_value: '' },
        },
      }
    );
  });

  it('함께 등록 체크 해제 시 measures 페이로드 null', async () => {
    const props = defaultProps();
    render(<ImportWizardDialog {...props} />);
    await uploadFile('학번,이름,성별,학년,반,"셔틀런\n(회)"\nS1,홍길동,남,1,1,42');

    fireEvent.click(screen.getByRole('checkbox')); // 해제
    fireEvent.click(screen.getByText(/검증 후 등록 목록에 추가/));
    expect(props.onApply).toHaveBeenCalledWith(expect.any(Array), [], null);
  });

  it('적용 시 양식 서명별 매핑+종목 프리셋이 localStorage에 저장됨', async () => {
    const props = defaultProps();
    render(<ImportWizardDialog {...props} />);
    await uploadFile('학번,이름,성별,학년,반\nS1,홍길동,남,1,1');
    fireEvent.click(screen.getByText(/검증 후 등록 목록에 추가/));

    const presets = JSON.parse(localStorage.getItem('paps-import-presets'));
    const sig = Object.keys(presets)[0];
    expect(sig).toBe('학번|이름|성별|학년|반');
    expect(presets[sig].mapping).toEqual({ student_id: 0, name: 1, gender: 2, grade: 3, class: 4 });
    expect(presets[sig].types).toEqual({ cardioType: 'shuttle_run', muscleType: 'sit_up', agilityType: 'sprint_50m' });
  });

  it('이미 등록된 학번은 오류로 표시', async () => {
    const props = { ...defaultProps(), existingIds: new Set(['20240101']) };
    render(<ImportWizardDialog {...props} />);
    await uploadFile('학번,이름,성별,학년,반\n20240101,홍길동,남,1,1');

    expect(screen.getByText('미리보기 — 0명 인식')).toBeInTheDocument();
    expect(screen.getByText(/이미 등록된 학생/)).toBeInTheDocument();
  });
});
