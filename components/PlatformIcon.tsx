'use client';

interface PlatformIconProps {
  platform?: string;
  size?: 'sm' | 'md';
}

const platformStyles: Record<
  string,
  { label: string; bg: string; text: string }
> = {
  web: { label: 'W', bg: 'bg-secondary-black', text: 'text-white' },
  whatsapp: { label: 'WA', bg: 'bg-green-500', text: 'text-white' },
  discord: { label: 'D', bg: 'bg-indigo-500', text: 'text-white' },
};

export default function PlatformIcon({ platform, size = 'md' }: PlatformIconProps) {
  const normalized = platform?.toLowerCase() ?? 'web';
  const style = platformStyles[normalized] ?? { label: 'AI', bg: 'bg-gray-200', text: 'text-gray-800' };
  const dimensions = size === 'sm' ? 'h-6 w-6 text-xs' : 'h-8 w-8 text-sm';

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-heading ${dimensions} ${style.bg} ${style.text}`}
      aria-label={`${style.label} platform`}
    >
      {style.label}
    </span>
  );
}






