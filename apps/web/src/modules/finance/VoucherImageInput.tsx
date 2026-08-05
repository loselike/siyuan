import { useEffect, useRef, useState } from 'react';
import { App as AntdApp, Button, Space, Typography } from 'antd';
import type { PaymentVoucherInput } from '@siyuan/shared';
import type { ApiClient } from '../../apiClient';
import { ProtectedVoucherImage } from './ProtectedVoucherImage';

const { Text } = Typography;

export type VoucherImageValue = Pick<PaymentVoucherInput, 'fileName' | 'mimeType' | 'sizeBytes' | 'url'>;

type VoucherImageInputProps = {
  apiClient: ApiClient;
  disabled?: boolean;
  value?: VoucherImageValue;
  onChange?: (value?: VoucherImageValue) => void;
  onFileChange?: (file?: File) => void;
  onUploaded?: (value: VoucherImageValue) => void;
  uploadFile?: (file: File) => Promise<VoucherImageValue>;
};

const allowedTypes = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

function formatVoucherTimestamp(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds())
  ].join('');
}

function extensionFromImageType(type: string) {
  if (type === 'image/jpeg') return 'jpg';
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  if (type === 'image/gif') return 'gif';
  return 'jpg';
}

function isClipboardPlaceholderName(name?: string) {
  return !name?.trim() || /^image\.(png|jpe?g|webp|gif)$/i.test(name.trim());
}

function withReadablePastedFileName(file: File) {
  if (!isClipboardPlaceholderName(file.name)) return file;
  const readableName = `水单凭证-${formatVoucherTimestamp()}.${extensionFromImageType(file.type)}`;
  return new File([file], readableName, { type: file.type, lastModified: file.lastModified });
}

export function VoucherImageInput({ apiClient, disabled, value, onChange, onFileChange, onUploaded, uploadFile }: VoucherImageInputProps) {
  const { message } = AntdApp.useApp();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(value?.url);
  const [fallbackPreviewUrl, setFallbackPreviewUrl] = useState<string | undefined>();
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setPreviewUrl(value?.url);
    setFallbackPreviewUrl(undefined);
  }, [value?.url]);

  const handleFile = async (file?: File) => {
    if (!file || disabled) return;
    if (!allowedTypes.has(file.type)) {
      message.error('仅支持 PNG、JPG、WEBP、GIF 图片');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      message.error('图片不能超过 10MB');
      return;
    }

    const localPreview = typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : undefined;
    setPreviewUrl(localPreview);
    setFallbackPreviewUrl(localPreview);
    onFileChange?.(file);
    if (!uploadFile) {
      onChange?.({ fileName: file.name, mimeType: file.type, sizeBytes: file.size, url: localPreview });
      return;
    }

    setUploading(true);
    try {
      const uploaded = await uploadFile(file);
      setPreviewUrl(uploaded.url ?? localPreview);
      onChange?.(uploaded);
      onUploaded?.(uploaded);
      message.success('图片已上传');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '图片上传失败');
      setPreviewUrl(undefined);
      onFileChange?.(undefined);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className="voucher-image-input"
      tabIndex={disabled ? -1 : 0}
      onPaste={(event) => {
        const file = Array.from(event.clipboardData.files).find((item) => item.type.startsWith('image/'));
        if (file) {
          event.preventDefault();
          void handleFile(withReadablePastedFileName(file));
        }
      }}
    >
      <input
        ref={inputRef}
        className="voucher-image-input__file"
        aria-label="选择凭证图片"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        hidden
        disabled={disabled}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = '';
          void handleFile(file);
        }}
      />
      <Space direction="vertical" className="full-width" size={8}>
        {previewUrl ? (
          <ProtectedVoucherImage
            apiClient={apiClient}
            url={previewUrl}
            alt={value?.fileName ?? '凭证图片'}
            style={{ maxHeight: 180, objectFit: 'contain' }}
            onError={() => {
              if (fallbackPreviewUrl && previewUrl !== fallbackPreviewUrl) {
                setPreviewUrl(fallbackPreviewUrl);
                message.warning('图片已上传但预览地址不可访问，请联系管理员检查上传目录配置');
                return;
              }
              message.error('图片预览加载失败');
            }}
          />
        ) : null}
        <Space wrap>
          <Button disabled={disabled} loading={uploading} onClick={() => inputRef.current?.click()}>
            选择图片
          </Button>
          <Text type="secondary">也可以直接粘贴截图，仅支持图片</Text>
          {value?.fileName ? <Text>{value.fileName}</Text> : null}
          {value ? <Button size="small" onClick={() => { onChange?.(undefined); onFileChange?.(undefined); setPreviewUrl(undefined); }}>清空</Button> : null}
        </Space>
      </Space>
    </div>
  );
}
