import type { ComponentChildren, JSX } from 'preact';
import styles from './Input.module.css';

export interface InputProps extends Omit<JSX.IntrinsicElements['input'], 'icon'> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: ComponentChildren;
}

export function Input({ label, error, helperText, icon, className = '', ...props }: InputProps) {
  return (
    <div className={styles.container}>
      {label && <label htmlFor={props.id} className={styles.label}>{label}</label>}
      <div className={styles.inputWrapper}>
        {icon && <span className={styles.iconWrapper}>{icon}</span>}
        <input
          className={`${styles.input} ${error ? styles.inputError : ''} ${icon ? styles.withIcon : ''} ${className}`}
          {...props}
        />
      </div>
      {(error || helperText) && (
        <span className={error ? styles.errorText : styles.helperText}>{error || helperText}</span>
      )}
    </div>
  );
}
