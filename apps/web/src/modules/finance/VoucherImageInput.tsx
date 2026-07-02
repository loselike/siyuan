import { useEffect, useRef, useState } from 'react';
import { Button, Image, message, Space, Typography } from 'antd';
import type { PaymentVoucherInput } from '@siyuan/shared';

const { Text } = Typography;

export type VoucherImageValue = Pick<PaymentVoucherInput, 'fileName' | 'mimeType' | 'sizeBytes' | 'url'>;

type VoucherImageInputProps = {
  disabled?: boolean;
  value?: VoucherImageValue;
  onChange?: (value?: VoucherImageValue) => void;
  onFileChange?: (file?: File) => void;
  uploadFile?: (file: File) => Promise<VoucherImageValue>;
};

const allowedTypes = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

export function VoucherImageInput({ disabled, value, onChange, onFileChange, uploadFile }: VoucherImageInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(value?.url);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setPreviewUrl(value?.url);
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
    onFileChange?.(file);
    if (!uploadFile) {
      onChange?.({ fileName: file.name, mimeType: file.type, sizeBytes: file.size, url: localPreview });
      return;
    }

    setUploading(true);
    try {
      const uploaded = await uploadFile(file);
      if (localPreview && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(localPreview);
      setPreviewUrl(uploaded.url);
      onChange?.(uploaded);
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
          void handleFile(file);
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
        {previewUrl ? <Image src={previewUrl} alt={value?.fileName ?? '凭证图片'} style={{ maxHeight: 180, objectFit: 'contain' }} /> : null}
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
