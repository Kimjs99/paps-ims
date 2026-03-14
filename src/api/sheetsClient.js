// KST(UTC+9) 현재 시각을 ISO 8601 형식으로 반환 (예: "2024-03-12T10:00:00.000+09:00")
export const nowKST = () => {
  const d = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return d.toISOString().replace("Z", "+09:00");
};

// Google API 로드 및 인증 관리
const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file",
].join(" ");

let tokenClient = null;

// GIS(Google Identity Services) 초기화
export const initGoogleAuth = () => {
  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) {
      reject(new Error("Google Identity Services 로드 실패. 네트워크를 확인하세요."));
      return;
    }
    console.log("[GIS] client_id prefix:", import.meta.env.VITE_GOOGLE_CLIENT_ID?.slice(0, 12));
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      scope: SCOPES,
      callback: (tokenResponse) => {
        if (tokenResponse.error) {
          reject(new Error(tokenResponse.error));
          return;
        }
        sessionStorage.setItem("gapi_token", tokenResponse.access_token);
        sessionStorage.setItem(
          "gapi_token_expiry",
          Date.now() + tokenResponse.expires_in * 1000
        );
        resolve(tokenResponse);
      },
    });
    resolve(tokenClient);
  });
};

// 토큰 요청 (로그인 팝업)
export const requestAccessToken = () => {
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      reject(new Error("AUTH_NOT_INITIALIZED"));
      return;
    }
    tokenClient.callback = (tokenResponse) => {
      if (tokenResponse.error) {
        reject(new Error(tokenResponse.error));
        return;
      }
      sessionStorage.setItem("gapi_token", tokenResponse.access_token);
      sessionStorage.setItem(
        "gapi_token_expiry",
        Date.now() + tokenResponse.expires_in * 1000
      );
      resolve(tokenResponse);
    };
    tokenClient.error_callback = (error) => {
      console.error("[GIS error_callback]", JSON.stringify(error));
      reject(new Error(error?.type || "OAUTH_ERROR"));
    };
    tokenClient.requestAccessToken({ prompt: "consent" });
  });
};

// 토큰 유효성 확인
export const getValidToken = async () => {
  const token = sessionStorage.getItem("gapi_token");
  const expiry = sessionStorage.getItem("gapi_token_expiry");
  if (token && expiry && Date.now() < Number(expiry) - 60000) {
    return token;
  }
  // 토큰 만료 → 재요청 (사용자 상호작용 없이)
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      reject(new Error("AUTH_NOT_INITIALIZED"));
      return;
    }
    const timeoutId = setTimeout(() => {
      reject(new Error("네트워크 연결을 확인하세요. (인증 시간 초과)"));
    }, 8000);
    tokenClient.callback = (tokenResponse) => {
      clearTimeout(timeoutId);
      if (tokenResponse.error) {
        sessionStorage.removeItem("gapi_token");
        reject(new Error("AUTH_EXPIRED"));
        return;
      }
      sessionStorage.setItem("gapi_token", tokenResponse.access_token);
      sessionStorage.setItem(
        "gapi_token_expiry",
        Date.now() + tokenResponse.expires_in * 1000
      );
      resolve(tokenResponse.access_token);
    };
    tokenClient.error_callback = (error) => {
      clearTimeout(timeoutId);
      sessionStorage.removeItem("gapi_token");
      reject(new Error(error?.type || "AUTH_EXPIRED"));
    };
    tokenClient.requestAccessToken({ prompt: "" });
  });
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
