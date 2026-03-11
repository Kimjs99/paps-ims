import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withRetry, getValidToken } from '../api/sheetsClient';

describe('withRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('성공하면 결과를 반환한다', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await withRetry(fn);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('429 오류 시 재시도 후 성공한다', async () => {
    const quota_err = Object.assign(new Error('QUOTA_EXCEEDED'), { status: 429 });
    const fn = vi.fn()
      .mockRejectedValueOnce(quota_err)
      .mockResolvedValueOnce('ok');

    const promise = withRetry(fn, 3);
    // 첫 번째 재시도: 1000ms 대기
    await vi.advanceTimersByTimeAsync(1000);
    const result = await promise;

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('429 오류가 maxRetries 이상 반복되면 throw한다', async () => {
    const quota_err = Object.assign(new Error('QUOTA_EXCEEDED'), { status: 429 });
    const fn = vi.fn().mockRejectedValue(quota_err);

    const promise = withRetry(fn, 3).catch((e) => e);
    // 재시도: 1000ms + 2000ms 대기
    await vi.advanceTimersByTimeAsync(3000);

    const result = await promise;
    expect(result).toMatchObject({ status: 429 });
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('401 오류는 즉시 throw한다 (재시도 없음)', async () => {
    const auth_err = Object.assign(new Error('AUTH_EXPIRED'), { status: 401 });
    const fn = vi.fn().mockRejectedValue(auth_err);

    await expect(withRetry(fn, 3)).rejects.toMatchObject({ status: 401 });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('일반 오류는 즉시 throw한다', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('UNKNOWN_ERROR'));
    await expect(withRetry(fn, 3)).rejects.toThrow('UNKNOWN_ERROR');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('첫 번째 시도에서 실패해도 마지막 재시도에서 성공하면 반환', async () => {
    const quota_err = Object.assign(new Error('QUOTA_EXCEEDED'), { status: 429 });
    const fn = vi.fn()
      .mockRejectedValueOnce(quota_err)
      .mockRejectedValueOnce(quota_err)
      .mockResolvedValueOnce('success_on_3rd');

    const promise = withRetry(fn, 3);
    await vi.advanceTimersByTimeAsync(1000);  // 1차 재시도
    await vi.advanceTimersByTimeAsync(2000);  // 2차 재시도
    const result = await promise;

    expect(result).toBe('success_on_3rd');
    expect(fn).toHaveBeenCalledTimes(3);
  });
});

describe('getValidToken', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('유효한 토큰이 sessionStorage에 있으면 즉시 반환', async () => {
    const futureExpiry = Date.now() + 300000; // 5분 후
    sessionStorage.setItem('gapi_token', 'valid_token_abc');
    sessionStorage.setItem('gapi_token_expiry', String(futureExpiry));

    const token = await getValidToken();
    expect(token).toBe('valid_token_abc');
  });

  it('토큰이 없으면 AUTH_NOT_INITIALIZED 에러 throw (tokenClient=null)', async () => {
    // tokenClient가 초기화되지 않은 상태 (모듈 로드 직후)
    sessionStorage.removeItem('gapi_token');
    sessionStorage.removeItem('gapi_token_expiry');

    await expect(getValidToken()).rejects.toThrow('AUTH_NOT_INITIALIZED');
  });

  it('토큰 만료 시(expiry가 60초 이내) 재요청 시도', async () => {
    // 만료 직전: 30초 후 만료 (현재 - 60초 버퍼 = 이미 만료)
    const expiredExpiry = Date.now() + 30000; // 30초 후 만료 (60초 버퍼보다 작음)
    sessionStorage.setItem('gapi_token', 'expiring_token');
    sessionStorage.setItem('gapi_token_expiry', String(expiredExpiry));

    // tokenClient가 null이므로 AUTH_NOT_INITIALIZED
    await expect(getValidToken()).rejects.toThrow('AUTH_NOT_INITIALIZED');
  });

  it('토큰 expiry가 과거이면 재요청 시도', async () => {
    const pastExpiry = Date.now() - 1000;
    sessionStorage.setItem('gapi_token', 'old_token');
    sessionStorage.setItem('gapi_token_expiry', String(pastExpiry));

    await expect(getValidToken()).rejects.toThrow('AUTH_NOT_INITIALIZED');
  });
});
