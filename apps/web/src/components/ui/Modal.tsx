import type { PropsWithChildren } from 'react';

type Props = PropsWithChildren<{
  open: boolean;
  onClose: () => void;
  title?: string;
}>;

export function Modal({ open, onClose, title, children }: Props) {
  if (!open) return null;

  return (
    <div className="ui-modal" role="dialog" aria-modal="true" aria-label={title || 'Modal'}>
      <button className="ui-modal__backdrop" onClick={onClose} aria-label="Close" />
      <div className="ui-modal__content">
        {title ? <h3>{title}</h3> : null}
        {children}
      </div>
    </div>
  );
}
