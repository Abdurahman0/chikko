type StatusBadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface StatusBadgeProps {
  status: string;
  label?: string;
  tone?: StatusBadgeTone;
}

const BADGE_BASE_CLASS_NAME = [
  'status-badge inline-flex min-h-7 items-center gap-1.5 rounded-pill border px-2.5',
  'text-[11px] font-bold uppercase tracking-[0.08em] shadow-sm transition-[transform,box-shadow,border-color] duration-fast',
].join(' ');

const BADGE_TONE_CLASS_NAMES: Record<StatusBadgeTone, string> = {
  success: 'status-badge--success border-success/10 bg-success-bg text-success',
  warning: 'status-badge--warning border-warning/10 bg-warning-bg text-warning',
  danger: 'status-badge--danger border-danger/10 bg-danger-bg text-danger',
  info: 'status-badge--info border-info/10 bg-info-bg text-info',
  neutral: 'status-badge--neutral border-neutral/10 bg-neutral-bg text-neutral',
};

const SUCCESS_STATUSES = new Set([
  'active',
  'paid',
  'delivered',
  'converted',
  'success',
  'read',
]);

const WARNING_STATUSES = new Set([
  'pending',
  'negotiating',
  'packed',
  'warning',
  'unpaid',
  'partially-refunded',
]);

const DANGER_STATUSES = new Set([
  'failed',
  'cancelled',
  'lost',
  'out-of-stock',
  'danger',
  'refunded',
  'returned',
]);

const INFO_STATUSES = new Set([
  'new',
  'contacted',
  'confirmed',
  'info',
  'sent',
  'delivered',
  'draft',
]);

function formatStatusLabel(status: string): string {
  return status
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function getStatusBadgeTone(status: string): StatusBadgeTone {
  const normalizedStatus = status.toLowerCase();

  if (SUCCESS_STATUSES.has(normalizedStatus)) {
    return 'success';
  }

  if (WARNING_STATUSES.has(normalizedStatus)) {
    return 'warning';
  }

  if (DANGER_STATUSES.has(normalizedStatus)) {
    return 'danger';
  }

  if (INFO_STATUSES.has(normalizedStatus)) {
    return 'info';
  }

  return 'neutral';
}

function StatusBadge({ status, label, tone }: StatusBadgeProps) {
  const resolvedTone = tone ?? getStatusBadgeTone(status);

  return (
    <span
      className={`${BADGE_BASE_CLASS_NAME} ${BADGE_TONE_CLASS_NAMES[resolvedTone]}`}
    >
      {label ?? formatStatusLabel(status)}
    </span>
  );
}

export default StatusBadge;
