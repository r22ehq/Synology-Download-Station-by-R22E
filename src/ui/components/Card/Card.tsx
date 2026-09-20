import type { ComponentChildren, JSX } from 'preact';
import styles from './Card.module.css';

export interface CardProps extends JSX.HTMLAttributes<HTMLDivElement> {
  children?: ComponentChildren;
}

export function Card({ children, className = '', ...props }: CardProps) {
  return (
    <div className={`${styles.card} ${className}`} {...props}>
      {children}
    </div>
  );
}
