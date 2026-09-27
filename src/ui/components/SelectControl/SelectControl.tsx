import type { ComponentChildren, JSX } from 'preact';
import { ChevronDown } from 'lucide-preact';
import styles from './SelectControl.module.css';

type SelectControlProps = JSX.SelectHTMLAttributes<HTMLSelectElement> & {
  children: ComponentChildren;
  className?: string;
};

export function SelectControl({ children, className = '', ...props }: SelectControlProps) {
  return <span className={`${styles.wrap} ${className}`}>
    <select {...props}>{children}</select>
    <ChevronDown size={15} aria-hidden="true" />
  </span>;
}
