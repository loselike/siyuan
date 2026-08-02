import type { KeyboardEvent, MouseEvent } from 'react';

export function safeTrackingWebsiteUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
}

function openTrackingWebsite(url: string) {
  const openedWindow = window.open(url, '_blank', 'noopener,noreferrer');
  if (openedWindow) {
    openedWindow.opener = null;
  }
}

export function TrackingWebsiteLink({ url, prefix = '' }: { url: string; prefix?: string }) {
  const safeUrl = safeTrackingWebsiteUrl(url);
  const label = `${prefix}${url}`;
  if (!safeUrl) {
    return <span>{label}</span>;
  }

  const preventTableInteraction = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };
  const handleDoubleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    preventTableInteraction(event);
    openTrackingWebsite(safeUrl);
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLAnchorElement>) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    event.stopPropagation();
    openTrackingWebsite(safeUrl);
  };

  return (
    <a
      className="customer-service-tracking-link"
      href={safeUrl}
      target="_blank"
      rel="noopener noreferrer"
      title={`双击打开查件网站：${safeUrl}`}
      aria-label={`查件网址，双击打开 ${safeUrl}`}
      onClick={preventTableInteraction}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
    >
      {label}
    </a>
  );
}
