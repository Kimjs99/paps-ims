import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { useToastStore, toast } from '../store/toastStore';

// Zustand 스토어 상태를 테스트 전 초기화
const resetAuthStore = () =>
  useAuthStore.setState({ user: null, isAuthenticated: false });

const resetSettingsStore = () =>
  useSettingsStore.setState({
    sheetId: null,
    schoolName: '',
    schoolYear: new Date().getFullYear(),
    teacherName: '',
    isOnboardingComplete: false,
  });

const resetToastStore = () =>
  useToastStore.setState({ toasts: [] });

describe('authStore', () => {
  beforeEach(() => {
    resetAuthStore();
  });

  it('초기 상태: user=null, isAuthenticated=false', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('setUser 호출 시 user 설정 및 isAuthenticated=true', () => {
    const user = { email: 'test@example.com', name: '홍길동', picture: '' };
    useAuthStore.getState().setUser(user);
    const state = useAuthStore.getState();
    expect(state.user).toEqual(user);
    expect(state.isAuthenticated).toBe(true);
  });

  it('clearUser 호출 시 user=null, isAuthenticated=false', () => {
    const user = { email: 'test@example.com', name: '홍길동', picture: '' };
    useAuthStore.getState().setUser(user);
    useAuthStore.getState().clearUser();
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('setUser(null) 호출 시 isAuthenticated=false', () => {
    useAuthStore.getState().setUser(null);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});

describe('settingsStore', () => {
  beforeEach(() => {
    resetSettingsStore();
  });

  it('초기 상태 확인', () => {
    const state = useSettingsStore.getState();
    expect(state.sheetId).toBeNull();
    expect(state.schoolName).toBe('');
    expect(state.teacherName).toBe('');
    expect(state.isOnboardingComplete).toBe(false);
  });

  it('setSheetId 호출 시 sheetId 설정', () => {
    useSettingsStore.getState().setSheetId('sheet_abc_123');
    expect(useSettingsStore.getState().sheetId).toBe('sheet_abc_123');
  });

  it('setSchoolInfo 호출 시 학교 정보 설정', () => {
    useSettingsStore.getState().setSchoolInfo({
      schoolName: '테스트고등학교',
      teacherName: '김선생',
      schoolYear: 2026,
    });
    const state = useSettingsStore.getState();
    expect(state.schoolName).toBe('테스트고등학교');
    expect(state.teacherName).toBe('김선생');
    expect(state.schoolYear).toBe(2026);
  });

  it('completeOnboarding 호출 시 isOnboardingComplete=true', () => {
    useSettingsStore.getState().completeOnboarding();
    expect(useSettingsStore.getState().isOnboardingComplete).toBe(true);
  });

  it('resetSettings 호출 시 초기 상태로 복귀', () => {
    useSettingsStore.getState().setSheetId('some_id');
    useSettingsStore.getState().setSchoolInfo({ schoolName: '학교', teacherName: '선생' });
    useSettingsStore.getState().completeOnboarding();
    useSettingsStore.getState().resetSettings();
    const state = useSettingsStore.getState();
    expect(state.sheetId).toBeNull();
    expect(state.schoolName).toBe('');
    expect(state.teacherName).toBe('');
    expect(state.isOnboardingComplete).toBe(false);
  });
});

describe('toastStore', () => {
  beforeEach(() => {
    resetToastStore();
  });

  it('초기 toasts 배열이 비어 있음', () => {
    expect(useToastStore.getState().toasts).toEqual([]);
  });

  it('addToast 호출 시 toast가 추가됨', () => {
    useToastStore.getState().addToast('테스트 메시지', 'success');
    const { toasts } = useToastStore.getState();
    expect(toasts).toHaveLength(1);
    expect(toasts[0].message).toBe('테스트 메시지');
    expect(toasts[0].type).toBe('success');
  });

  it('addToast 기본 타입은 success', () => {
    useToastStore.getState().addToast('기본 메시지');
    const { toasts } = useToastStore.getState();
    expect(toasts[0].type).toBe('success');
  });

  it('removeToast 호출 시 해당 id의 toast 제거', () => {
    useToastStore.getState().addToast('메시지1');
    const id = useToastStore.getState().toasts[0].id;
    useToastStore.getState().removeToast(id);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('여러 toast 추가 후 특정 toast만 제거', () => {
    useToastStore.getState().addToast('메시지1');
    // Date.now()가 같을 수 있으므로 약간의 간격을 두고 두 번째 toast 추가
    const firstId = useToastStore.getState().toasts[0].id;
    // 다른 id를 가진 두 번째 toast를 직접 상태에 추가
    useToastStore.setState((s) => ({
      toasts: [...s.toasts, { id: firstId + 1, message: '메시지2', type: 'success' }],
    }));
    useToastStore.getState().removeToast(firstId);
    const { toasts } = useToastStore.getState();
    expect(toasts).toHaveLength(1);
    expect(toasts[0].message).toBe('메시지2');
  });
});

describe('toast 헬퍼', () => {
  beforeEach(() => {
    resetToastStore();
  });

  it('toast.success → type="success"인 toast 추가', () => {
    toast.success('성공 메시지');
    const { toasts } = useToastStore.getState();
    expect(toasts[0].type).toBe('success');
    expect(toasts[0].message).toBe('성공 메시지');
  });

  it('toast.error → type="error"인 toast 추가', () => {
    toast.error('오류 메시지');
    const { toasts } = useToastStore.getState();
    expect(toasts[0].type).toBe('error');
  });

  it('toast.info → type="info"인 toast 추가', () => {
    toast.info('정보 메시지');
    const { toasts } = useToastStore.getState();
    expect(toasts[0].type).toBe('info');
  });
});
