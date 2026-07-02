import { useEffect, useState } from 'react';
import { Alert, Button, Card, ConfigProvider, Input, Space, Typography } from 'antd';
import type { ThemeConfig } from 'antd/es/config-provider/context';
import { ApiClient, type CaptchaChallenge } from '../../apiClient';
import { cleanNoticeMessage } from '../shared/ui';

const { Title, Text } = Typography;

export function LoginPage({
  apiClient,
  theme,
  onLogin
}: {
  apiClient: ApiClient;
  theme: ThemeConfig;
  onLogin: (username: string, password: string, captchaId: string, captchaCode: string) => Promise<void>;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [captchaCode, setCaptchaCode] = useState('');
  const [captcha, setCaptcha] = useState<CaptchaChallenge | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [captchaLoading, setCaptchaLoading] = useState(false);

  async function refreshCaptcha() {
    setCaptchaLoading(true);
    try {
      setCaptcha(await apiClient.captcha());
      setCaptchaCode('');
    } catch {
      setError('验证码加载失败，请刷新页面后重试');
    } finally {
      setCaptchaLoading(false);
    }
  }

  useEffect(() => {
    void refreshCaptcha();
  }, []);

  async function submitLogin(event?: { preventDefault: () => void }) {
    event?.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      if (!captcha?.captchaId) {
        setError('验证码未加载，请刷新后重试');
        return;
      }
      await onLogin(username, password, captcha.captchaId, captchaCode);
    } catch (loginError) {
      setError(loginError instanceof Error ? cleanNoticeMessage(loginError.message) : '账号、密码或验证码错误');
      void refreshCaptcha();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ConfigProvider theme={theme}>
      <div className="login-shell">
        <section className="login-panel" aria-label="思远物流登录">
          <div className="login-hero">
            <div className="login-brand-mark">
              <img src="/green-cargo-logo.png" alt="Green Cargo 思远物流标识" width={160} height={58} />
            </div>
            <div>
              <Text className="login-kicker">AI TMS / OMS</Text>
              <Title level={1}>思远物流</Title>
              <Text className="login-hero-copy">统一处理我的订单、渠道排货、仓库出货、报价和财务结算。</Text>
            </div>
            <div className="login-hero-grid">
              <span>我的订单</span>
              <span>仓库管理</span>
              <span>报价查价</span>
              <span>权限审计</span>
            </div>
          </div>
          <Card className="login-card">
            <form onSubmit={(event) => void submitLogin(event)}>
              <Space direction="vertical" size={18} style={{ width: '100%' }}>
                <div>
                  <Title level={2}>登录工作台</Title>
                  <Text type="secondary">按角色进入员工端或客户门户。</Text>
                </div>
                {error ? <Alert className="login-alert" type="error" message="登录未完成" description={error} showIcon /> : null}
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  <label className="login-field">
                    <Text strong>账号</Text>
                    <Input aria-label="账号" size="large" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} />
                  </label>
                  <label className="login-field">
                    <Text strong>密码</Text>
                    <Input.Password aria-label="密码" size="large" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
                  </label>
                  <div className="login-captcha-row">
                    <label className="login-field login-captcha-input">
                      <Text strong>图片验证码</Text>
                      <Input
                        aria-label="图片验证码"
                        size="large"
                        autoComplete="off"
                        value={captchaCode}
                        maxLength={6}
                        onChange={(event) => setCaptchaCode(event.target.value.toUpperCase())}
                      />
                    </label>
                    <button className="login-captcha-image" type="button" onClick={() => void refreshCaptcha()} disabled={captchaLoading} aria-label="刷新图片验证码">
                      {captcha?.image ? <img src={captcha.image} alt="图片验证码" /> : <span>{captchaLoading ? '加载中' : '刷新验证码'}</span>}
                    </button>
                  </div>
                  <Button htmlType="submit" type="primary" block size="large" loading={submitting} aria-label="登录">
                    登录
                  </Button>
                </Space>
                <Text type="secondary" className="login-security-note">验证码 3 分钟有效，登录失败后会自动刷新。</Text>
              </Space>
            </form>
          </Card>
        </section>
      </div>
    </ConfigProvider>
  );
}
