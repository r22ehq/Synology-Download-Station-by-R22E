import type { ComponentChildren, JSX } from 'preact';
import styles from './Button.module.css';
import { Spinner } from '../Spinner/Spinner';

export interface ButtonProps extends JSX.HTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: ComponentChildren;
  children?: ComponentChildren;
  disabled?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const classes = [styles.button, styles[variant], styles[size], className]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={classes} disabled={disabled || isLoading} {...props}>
      {isLoading ? <Spinner size={size === 'sm' ? 16 : size === 'lg' ? 24 : 20} /> : icon}
      {children}
    </button>
  );
}
