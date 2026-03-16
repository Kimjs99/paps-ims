// KST(UTC+9) 현재 시각을 ISO 8601 형식으로 반환 (예: "2024-03-12T10:00:00.000+09:00")
export const nowKST = () => {
  const d = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return d.toISOString().replace("Z", "+09:00");
};

// Google API 로드 및 인증 관리
const SCOPES = [
  "openid",
  "profile",
  "email",
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file",
].join(" ");

// 커스텀 OAuth 팝업 (GIS 내부 메커니즘 대신 사용 — COOP 우회)
const openOAuthPopup = (prompt = "select_account") => {
  return new Promise((resolve, reject) => {
    const redirectUri = `${window.location.origin}/oauth-callback.html`;
    const url =
      `https://accounts.google.com/o/oauth2/v2/auth` +
      `?client_id=${encodeURIComponent((import.meta.env.VITE_GOOGLE_CLIENT_ID || "").trim())}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=token` +
      `&scope=${encodeURIComponent(SCOPES)}` +
      `&prompt=${prompt}`;

    const popup = window.open(url, "paps_oauth", "width=500,height=600,left=200,top=100");
    if (!popup) {
      reject(new Error("popup_blocked"));
      return;
    }

    const onMessage = (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "PAPS_OAUTH_CALLBACK") return;
      cleanup();
      if (event.data.error) {
        reject(new Error(event.data.error));
      } else if (event.data.access_token) {
        sessionStorage.setItem("gapi_token", event.data.access_token);
        sessionStorage.setItem(
          "gapi_token_expiry",
          Date.now() + Number(event.data.expires_in) * 1000
        );
        resolve({ access_token: event.data.access_token });
      } else {
        reject(new Error("no_token"));
      }
    };

    const pollId = setInterval(() => {
      try {
        if (popup.closed) {
          cleanup();
          reject(new Error("popup_closed"));
        }
      } catch {
        // accounts.google.com COOP same-origin이 popup.closed 접근을 차단하는 경우 무시
      }
    }, 500);

    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error("popup_timeout"));
    }, 120000);

    const cleanup = () => {
      window.removeEventListener("message", onMessage);
      clearInterval(pollId);
      clearTimeout(timeoutId);
    };

    window.addEventListener("message", onMessage);
  });
};

// GIS 초기화 — 커스텀 팝업 flow로 전환 후 GIS 불필요, 하위 호환성 유지
export const initGoogleAuth = () => Promise.resolve();

// 토큰 요청 (로그인 팝업) — 커스텀 팝업 flow 사용
export const requestAccessToken = () => openOAuthPopup("select_account");

// 토큰 유효성 확인
export const getValidToken = async () => {
  const token = sessionStorage.getItem("gapi_token");
  const expiry = sessionStorage.getItem("gapi_token_expiry");
  if (token && expiry && Date.now() < Number(expiry) - 60000) {
    return token;
  }
  // 토큰 만료 → 커스텀 팝업으로 자동 갱신 (prompt:none = 사용자 상호작용 없이 시도)
  try {
    const result = await openOAuthPopup("none");
    return result.access_token;
  } catch {
    sessionStorage.removeItem("gapi_token");
    throw new Error("AUTH_EXPIRED");
  }
};

// 로그아웃
export const revokeToken = () => {
  const token = sessionStorage.getItem("gapi_token");
  if (token && window.google?.accounts?.oauth2) {
    window.google.accounts.oauth2.revoke(token);
  }
  sessionStorage.removeItem("gapi_token");
  sessionStorage.removeItem("gapi_token_expiry");
};

// Sheets API 기본 fetch 래퍼
export const sheetsRequest = async ({ method = "GET", path, body } = {}) => {
  const token = await getValidToken();
  const base = "https://sheets.googleapis.com/v4/spreadsheets";
  const url = `${base}${path}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  let res;
  try {
    res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("네트워크 연결을 확인하세요. (요청 시간 초과)");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (res.status === 429) {
    const err = new Error("QUOTA_EXCEEDED");
    err.status = 429;
    throw err;
  }
  if (res.status === 401) {
    sessionStorage.removeItem("gapi_token");
    const err = new Error("AUTH_EXPIRED");
    err.status = 401;
    throw err;
  }
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error?.message || "SHEETS_API_ERROR");
  }
  return res.json();
};

// 지수 백오프 재시도 래퍼
export const withRetry = async (fn, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (err.status === 429 && i < maxRetries - 1) {
        await new Promise((r) => setTimeout(r, 1000 * 2 ** i));
        continue;
      }
      throw err;
    }
  }
};
