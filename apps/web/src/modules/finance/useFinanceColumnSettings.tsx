import type { ReactNode } from 'react';
import { useState } from 'react';
import { Button, Flex, Space } from 'antd';
import { ArrowDown, ArrowUp, Eye, EyeOff, GripVertical } from 'lucide-react';
import './useFinanceColumnSettings.css';

type StoredColumnSettings<ColumnKey extends string> = {
  order?: ColumnKey[];
  hidden?: ColumnKey[];
};

function normalizeColumnKeys<ColumnKey extends string>(keys: unknown, defaultColumnOrder: ColumnKey[]) {
  if (!Array.isArray(keys)) return [];
  return keys.filter((key): key is ColumnKey => typeof key === 'string' && defaultColumnOrder.includes(key as ColumnKey));
}

function saveColumnSettings<ColumnKey extends string>(storageKey: string, settings: StoredColumnSettings<ColumnKey>) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(settings));
  } catch {
    // localStorage can be unavailable in private/test contexts; column settings are optional.
  }
}

function loadColumnSettings<ColumnKey extends string>(storageKey: string, defaultColumnOrder: ColumnKey[]) {
  try {
    const raw = window.localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : undefined;
    if (Array.isArray(parsed)) {
      const known = normalizeColumnKeys(parsed, defaultColumnOrder);
      return { order: [...known, ...defaultColumnOrder.filter((key) => !known.includes(key))], hidden: [] };
    }
    if (parsed && typeof parsed === 'object') {
      const stored = parsed as StoredColumnSettings<ColumnKey>;
      const knownOrder = normalizeColumnKeys(stored.order, defaultColumnOrder);
      const hidden = normalizeColumnKeys(stored.hidden, defaultColumnOrder);
      return {
        order: [...knownOrder, ...defaultColumnOrder.filter((key) => !knownOrder.includes(key))],
        hidden
      };
    }
  } catch {
    return { order: defaultColumnOrder, hidden: [] };
  }
  return { order: defaultColumnOrder, hidden: [] };
}

export function useFinanceColumnSettings<ColumnKey extends string>(storageKey: string, defaultColumnOrder: ColumnKey[]) {
  const [settings, setSettings] = useState(() => loadColumnSettings(storageKey, defaultColumnOrder));

  const persistSettings = (next: { order: ColumnKey[]; hidden: ColumnKey[] }) => {
    setSettings(next);
    saveColumnSettings(storageKey, next);
  };

  const toggleColumn = (key: ColumnKey) => {
    const hidden = settings.hidden.includes(key) ? settings.hidden.filter((item) => item !== key) : [...settings.hidden, key];
    persistSettings({ ...settings, hidden });
  };

  const moveColumn = (key: ColumnKey, direction: 'up' | 'down') => {
    const currentIndex = settings.order.indexOf(key);
    const nextIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= settings.order.length) return;
    const next = [...settings.order];
    [next[currentIndex], next[nextIndex]] = [next[nextIndex], next[currentIndex]];
    persistSettings({ ...settings, order: next });
  };

  const moveColumnTo = (key: ColumnKey, targetKey: ColumnKey) => {
    if (key === targetKey) return;
    const next = settings.order.filter((item) => item !== key);
    const targetIndex = next.indexOf(targetKey);
    if (targetIndex < 0) return;
    next.splice(targetIndex, 0, key);
    persistSettings({ ...settings, order: next });
  };

  const resetColumns = () => {
    persistSettings({ order: defaultColumnOrder, hidden: [] });
  };

  return {
    columnOrder: settings.order,
    hiddenColumns: settings.hidden,
    toggleColumn,
    moveColumn,
    moveColumnTo,
    resetColumns
  };
}

export function FinanceColumnSettingsPanel<ColumnKey extends string>({
  visibleColumnOrder,
  hiddenColumns,
  getColumnTitle,
  toggleColumn,
  moveColumn,
  moveColumnTo,
  resetColumns
}: {
  visibleColumnOrder: ColumnKey[];
  hiddenColumns: ColumnKey[];
  getColumnTitle: (key: ColumnKey) => ReactNode;
  toggleColumn: (key: ColumnKey) => void;
  moveColumn: (key: ColumnKey, direction: 'up' | 'down') => void;
  moveColumnTo: (key: ColumnKey, targetKey: ColumnKey) => void;
  resetColumns: () => void;
}) {
  const [draggingKey, setDraggingKey] = useState<ColumnKey | null>(null);

  return (
    <div className="column-settings-panel">
      <div className="column-settings-hint">拖动列名可调整位置，设置会自动保存。</div>
      {visibleColumnOrder.map((key, index) => (
        <Flex
          key={key}
          justify="space-between"
          align="center"
          gap={8}
          className={`column-settings-row${draggingKey === key ? ' is-dragging' : ''}`}
          draggable
          onDragStart={() => setDraggingKey(key)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            if (draggingKey) moveColumnTo(draggingKey, key);
            setDraggingKey(null);
          }}
          onDragEnd={() => setDraggingKey(null)}
        >
          <Button
            size="small"
            icon={hiddenColumns.includes(key) ? <EyeOff size={14} /> : <Eye size={14} />}
            onClick={() => toggleColumn(key)}
          />
          <span className="column-settings-title"><GripVertical size={14} />{getColumnTitle(key)}</span>
          <Space size={2}>
            <Button size="small" icon={<ArrowUp size={14} />} disabled={index === 0} onClick={() => moveColumn(key, 'up')} />
            <Button size="small" icon={<ArrowDown size={14} />} disabled={index === visibleColumnOrder.length - 1} onClick={() => moveColumn(key, 'down')} />
          </Space>
        </Flex>
      ))}
      <Button block size="small" onClick={resetColumns}>恢复默认列</Button>
    </div>
  );
}
