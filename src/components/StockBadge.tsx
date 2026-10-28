import { STOCK_STATE_META } from '@shared/format';
import type { StockState } from '@shared/types';

const toneClass: Record<string, string> = {
  ok: 'bg-[#EEF4EE] text-[#3F573F] border-[#CFDECF]',
  warn: 'bg-[#FBF3E3] text-[#8A6A2A] border-[#EAD9B4]',
  danger: 'bg-[#FBEDE8] text-[#8E3D22] border-[#EFD2C6]',
  neutral: 'bg-stone-100 text-ink-500 border-stone-200',
};

export function StockBadge({ state, className = '', withDot = true }: { state: StockState; className?: string; withDot?: boolean }) {
  const meta = STOCK_STATE_META[state];
  return (
    <span className={`chip ${toneClass[meta.tone]} ${className}`}>
      {withDot && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />}
      {meta.label}
    </span>
  );
}
