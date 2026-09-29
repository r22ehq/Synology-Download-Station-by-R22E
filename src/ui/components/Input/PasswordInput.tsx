import { useEffect, useState } from 'preact/hooks';
import { Eye, EyeOff } from 'lucide-preact';
import { Input, type InputProps } from './Input';
import styles from './Input.module.css';

export function PasswordInput(props: Omit<InputProps, 'type' | 'endAdornment'>) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { if (!props.value) setVisible(false); }, [props.value]);
  const label = visible ? 'Hide password' : 'Show password';
  return <Input {...props} type={visible ? 'text' : 'password'} endAdornment={
    <button type="button" className={styles.passwordToggle} aria-label={label} title={label} aria-pressed={visible} disabled={props.disabled} onClick={() => setVisible(value => !value)}>
      {visible ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
    </button>
  } />;
}
