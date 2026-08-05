import { useEffect, useState } from 'react';
import { Image } from 'antd';
import type { ImageProps } from 'antd';
import type { ApiClient } from '../../apiClient';

type ProtectedVoucherImageProps = Omit<ImageProps, 'src'> & {
  apiClient: ApiClient;
  url: string;
};

export function ProtectedVoucherImage({ apiClient, url, ...props }: ProtectedVoucherImageProps) {
  const [source, setSource] = useState<string>(() => (/^(?:blob:|data:)/i.test(url) ? url : ''));

  useEffect(() => {
    if (/^(?:blob:|data:)/i.test(url)) {
      setSource(url);
      return undefined;
    }
    let active = true;
    let objectUrl: string | undefined;
    setSource('');
    void apiClient.downloadProtectedAsset(url)
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setSource(objectUrl);
      })
      .catch(() => {
        if (active) setSource('');
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [apiClient, url]);

  return <Image {...props} src={source || undefined} />;
}
