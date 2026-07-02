import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withRetry, getValidToken, sheetsRequest } from '../api/sheetsClient';

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

  it('토큰이 없고 무음 갱신 팝업이 차단되면 AUTH_EXPIRED throw (v0.7.2 커스텀 팝업 flow)', async () => {
    sessionStorage.removeItem('gapi_token');
    sessionStorage.removeItem('gapi_token_expiry');
    // 팝업 차단을 명시적으로 mock (jsdom 기본 동작에 기대지 않음)
    vi.stubGlobal('open', vi.fn(() => null));

    await expect(getValidToken()).rejects.toThrow('AUTH_EXPIRED');
    vi.unstubAllGlobals();
  });

  it('토큰 만료 임박(60초 버퍼 이내) 시 무음 갱신 시도 — 팝업 차단이면 AUTH_EXPIRED', async () => {
    const expiredExpiry = Date.now() + 30000; // 30초 후 만료 (60초 버퍼보다 작음)
    sessionStorage.setItem('gapi_token', 'expiring_token');
    sessionStorage.setItem('gapi_token_expiry', String(expiredExpiry));
    vi.stubGlobal('open', vi.fn(() => null));

    await expect(getValidToken()).rejects.toThrow('AUTH_EXPIRED');
    expect(window.open).toHaveBeenCalled(); // 무음 갱신을 실제로 시도했는지
    vi.unstubAllGlobals();
  });

  it('토큰 expiry가 과거면 무음 갱신 시도 — 팝업 차단이면 AUTH_EXPIRED', async () => {
    const pastExpiry = Date.now() - 1000;
    sessionStorage.setItem('gapi_token', 'old_token');
    sessionStorage.setItem('gapi_token_expiry', String(pastExpiry));
    vi.stubGlobal('open', vi.fn(() => null));

    await expect(getValidToken()).rejects.toThrow('AUTH_EXPIRED');
    vi.unstubAllGlobals();
  });

  it('무음 갱신 실패 시 gapi_token과 gapi_token_expiry를 함께 제거', async () => {
    sessionStorage.setItem('gapi_token', 'old_token');
    sessionStorage.setItem('gapi_token_expiry', String(Date.now() - 1000));
    vi.stubGlobal('open', vi.fn(() => null));

    await expect(getValidToken()).rejects.toThrow('AUTH_EXPIRED');
    expect(sessionStorage.getItem('gapi_token')).toBeNull();
    expect(sessionStorage.getItem('gapi_token_expiry')).toBeNull();
    vi.unstubAllGlobals();
  });
});

describe('getValidToken 동시 갱신 mutex', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('동시 2회 호출 시 팝업(window.open)은 1회만 열린다 — 실패 공유', async () => {
    vi.stubGlobal('open', vi.fn(() => null)); // 팝업 차단

    const results = await Promise.allSettled([getValidToken(), getValidToken()]);
    expect(results[0].status).toBe('rejected');
    expect(results[1].status).toBe('rejected');
    expect(results[0].reason.message).toBe('AUTH_EXPIRED');
    expect(results[1].reason.message).toBe('AUTH_EXPIRED');
    expect(window.open).toHaveBeenCalledTimes(1);
  });

  it('동시 2회 호출 시 팝업 1회 + 같은 토큰을 공유한다 — 성공 공유', async () => {
    vi.stubGlobal('open', vi.fn(() => ({ closed: false }))); // 팝업 열림 (닫힘 polling 무해)

    const p1 = getValidToken();
    const p2 = getValidToken();

    // oauth-callback.html의 postMessage 수신을 시뮬레이션
    window.dispatchEvent(
      new MessageEvent('message', {
        origin: window.location.origin,
        data: { type: 'PAPS_OAUTH_CALLBACK', access_token: 'shared_tok', expires_in: 3600 },
      })
    );

    const [t1, t2] = await Promise.all([p1, p2]);
    expect(t1).toBe('shared_tok');
    expect(t2).toBe('shared_tok');
    expect(window.open).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem('gapi_token')).toBe('shared_tok');
  });

  it('갱신 실패로 mutex가 해제되면 다음 호출은 새 팝업을 연다', async () => {
    vi.stubGlobal('open', vi.fn(() => null));

    await expect(getValidToken()).rejects.toThrow('AUTH_EXPIRED');
    await expect(getValidToken()).rejects.toThrow('AUTH_EXPIRED');
    expect(window.open).toHaveBeenCalledTimes(2);
  });
});

describe('sheetsRequest 에러 응답 처리', () => {
  beforeEach(() => {
    sessionStorage.clear();
    // 유효 토큰으로 getValidToken 통과
    sessionStorage.setItem('gapi_token', 'valid_token');
    sessionStorage.setItem('gapi_token_expiry', String(Date.now() + 300000));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('JSON 에러 응답이면 error.message를 그대로 노출', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({ error: { message: 'Invalid range' } }),
    })));

    await expect(sheetsRequest({ path: '/sheet1/values/x' })).rejects.toThrow('Invalid range');
  });

  it('비JSON 에러 응답(HTML 등)이면 본문 텍스트로 폴백 — 원인 은폐 방지', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      status: 502,
      text: async () => '<html>Bad Gateway</html>',
    })));

    await expect(sheetsRequest({ path: '/sheet1/values/x' })).rejects.toThrow('Bad Gateway');
  });

  it('본문이 비어 있으면 상태 코드가 담긴 기본 메시지로 폴백', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      status: 500,
      text: async () => '',
    })));

    await expect(sheetsRequest({ path: '/sheet1/values/x' })).rejects.toThrow(
      'SHEETS_API_ERROR (HTTP 500)'
    );
  });

  it('401 응답 시 gapi_token과 gapi_token_expiry를 함께 제거', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      status: 401,
      text: async () => '',
    })));

    await expect(sheetsRequest({ path: '/sheet1/values/x' })).rejects.toThrow('AUTH_EXPIRED');
    expect(sessionStorage.getItem('gapi_token')).toBeNull();
    expect(sessionStorage.getItem('gapi_token_expiry')).toBeNull();
  });
});
