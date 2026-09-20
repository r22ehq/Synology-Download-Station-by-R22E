import { Loader2 } from 'lucide-preact';
import styles from './Spinner.module.css';

interface SpinnerProps {
  size?: number;
  className?: string;
}

export function Spinner({ size = 24, className = '' }: SpinnerProps) {
  return <Loader2 size={size} className={`${styles.spinner} ${className}`} strokeWidth={2} />;
}
