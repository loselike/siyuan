import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import { App } from './App';
import { hasGlobalUnsavedWork } from './appUpdate';
import { installStaleChunkRecovery } from './releaseRecovery';
import './styles.css';

dayjs.locale('zh-cn');
installStaleChunkRecovery({ hasUnsavedWork: hasGlobalUnsavedWork });

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ConfigProvider locale={zhCN}>
      <App />
    </ConfigProvider>
  </React.StrictMode>
);
