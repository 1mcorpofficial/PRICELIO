import { Button } from './Button';

type Props = {
  icon?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ icon = '✨', title, description, actionLabel, onAction }: Props) {
  return (
    <div className="empty-card" role="status" aria-live="polite">
      <div className="empty-card__icon" aria-hidden="true">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
      {actionLabel && onAction ? <Button variant="outline" onClick={onAction}>{actionLabel}</Button> : null}
    </div>
  );
}
