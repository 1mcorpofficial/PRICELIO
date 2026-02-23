type Props = {
  value: number;
  max: number;
};

export function ProgressBar({ value, max }: Props) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className="ui-progress" role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}>
      <div className="ui-progress__fill" style={{ width: `${pct}%` }} />
    </div>
  );
}
