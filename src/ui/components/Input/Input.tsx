import type { ComponentChildren, JSX, Ref } from 'preact';
import styles from './Input.module.css';

export interface InputProps extends Omit<JSX.IntrinsicElements['input'], 'icon'> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: ComponentChildren;
  endAdornment?: ComponentChildren;
  inputRef?: Ref<HTMLInputElement>;
}

export function Input({ label, error, helperText, icon, endAdornment, inputRef, className = '', ...props }: InputProps) {
  return (
    <div className={styles.container}>
      {label && <label htmlFor={props.id} className={styles.label}>{label}</label>}
      <div className={styles.inputWrapper}>
        {icon && <span className={styles.iconWrapper}>{icon}</span>}
        <input
          ref={inputRef}
          className={`${styles.input} ${error ? styles.inputError : ''} ${icon ? styles.withIcon : ''} ${endAdornment ? styles.withEndAdornment : ''} ${className}`}
          {...props}
        />
        {endAdornment && <span className={styles.endAdornment}>{endAdornment}</span>}
      </div>
      {(error || helperText) && (
        <span className={error ? styles.errorText : styles.helperText}>{error || helperText}</span>
      )}
    </div>
  );
}
