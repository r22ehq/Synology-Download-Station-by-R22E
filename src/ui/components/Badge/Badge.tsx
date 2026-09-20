import type { ComponentChildren, JSX } from 'preact';
import styles from './Badge.module.css';

export interface BadgeProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'error' | 'info';
  children?: ComponentChildren;
}

export function Badge({ variant = 'info', children, className = '', ...props }: BadgeProps) {
  return (
    <span className={`${styles.badge} ${styles[variant]} ${className}`} {...props}>
      {children}
    </span>
  );
}
