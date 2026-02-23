import clsx from 'clsx';
import type { ButtonHTMLAttributes } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'outline' | 'danger';
  glow?: boolean;
};

export function Button({ className, variant = 'primary', glow = false, ...props }: Props) {
  return (
    <button
      {...props}
      className={clsx(
        'ui-btn',
        `ui-btn--${variant}`,
        glow && 'ui-btn--glow',
        className
      )}
    />
  );
}
