import type { ErrorInfo, ReactNode } from 'react';
import { Component, Suspense } from 'react';
import { Alert, Button, Card, Space, Typography } from 'antd';
import { clientReleaseId } from '../../releaseInfo';

const { Text } = Typography;

export type PageRenderErrorReport = {
  errorId: string;
  route: string;
  releaseId: string;
  menuKey: string;
  sectionKey?: string;
  message: string;
  stack?: string;
  componentStack?: string;
};

function createPageRenderErrorId() {
  return `render-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

class PageRenderErrorBoundary extends Component<{
  children: ReactNode;
  resetKey: string;
  menuKey: string;
  sectionKey?: string;
  onReport: (report: PageRenderErrorReport) => void;
}, { error: Error | null; errorId: string | null }> {
  state = { error: null as Error | null, errorId: null as string | null };

  static getDerivedStateFromError(error: Error) {
    return { error, errorId: createPageRenderErrorId() };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Sunny page render failed', error, info);
    this.props.onReport({
      errorId: this.state.errorId ?? createPageRenderErrorId(),
      route: window.location.pathname,
      releaseId: clientReleaseId,
      menuKey: this.props.menuKey,
      sectionKey: this.props.sectionKey,
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack ?? undefined
    });
  }

  componentDidUpdate(previousProps: { resetKey: string }) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null, errorId: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <Card className="app-page-recovery-card">
          <Space direction="vertical" size={12}>
            <Alert
              type="error"
              showIcon
              message="页面加载失败"
              description={this.state.errorId ? `当前模块渲染异常，已拦截白屏。错误编号：${this.state.errorId}；请重试加载，若仍出现请把该编号反馈给管理员。` : '当前模块渲染异常，已拦截白屏。请重试加载，或刷新页面后继续操作。'}
            />
            <Space wrap>
              <Button htmlType="button" type="primary" onClick={() => this.setState({ error: null, errorId: null })}>
                重试加载
              </Button>
              <Button htmlType="button" onClick={() => window.location.reload()}>
                刷新页面
              </Button>
            </Space>
          </Space>
        </Card>
      );
    }
    return this.props.children;
  }
}

function PageLoadingFallback() {
  return (
    <Card className="app-page-loading-card">
      <Space direction="vertical" size={8}>
        <Text strong>模块加载中</Text>
        <Text type="secondary">正在准备当前页面，请稍候。</Text>
      </Space>
    </Card>
  );
}

export function AppPageBoundary({
  children,
  ...boundaryProps
}: {
  children: ReactNode;
  resetKey: string;
  menuKey: string;
  sectionKey?: string;
  onReport: (report: PageRenderErrorReport) => void;
}) {
  return (
    <PageRenderErrorBoundary {...boundaryProps}>
      <Suspense fallback={<PageLoadingFallback />}>{children}</Suspense>
    </PageRenderErrorBoundary>
  );
}
