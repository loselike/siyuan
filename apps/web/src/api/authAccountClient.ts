export type AuthAccountRequest = <T>(path: string, init?: RequestInit, authenticated?: boolean) => Promise<T>;

export class AuthAccountClient {
  constructor(private readonly request: AuthAccountRequest) {}

  captcha<T>(): Promise<T> {
    return this.request('/auth/captcha', { method: 'GET' }, false);
  }

  login<T>(username: string, password: string, captchaId?: string, captchaCode?: string): Promise<T> {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password, captchaId, captchaCode })
    }, false);
  }

  me<T>(): Promise<T> {
    return this.request('/auth/me');
  }

  currentSession<T>(): Promise<T> {
    return this.request('/auth/session');
  }

  updateProfile<T>(input: object): Promise<T> {
    return this.request('/auth/profile', { method: 'PUT', body: JSON.stringify(input) });
  }

  changePassword<T>(input: { currentPassword: string; newPassword: string }): Promise<T> {
    return this.request('/auth/change-password', { method: 'POST', body: JSON.stringify(input) });
  }

  userTablePreferences<T>(): Promise<T> {
    return this.request('/user-table-preferences');
  }

  updateUserTablePreference<T>(key: string, value: Record<string, unknown>): Promise<T> {
    return this.request(`/user-table-preferences/${encodeURIComponent(key)}`, {
      method: 'PUT',
      body: JSON.stringify({ value })
    });
  }

  deleteUserTablePreference<T>(key: string): Promise<T> {
    return this.request(`/user-table-preferences/${encodeURIComponent(key)}`, { method: 'DELETE' });
  }
}
