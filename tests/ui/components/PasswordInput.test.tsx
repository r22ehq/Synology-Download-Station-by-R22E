import { cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { afterEach, expect, it } from 'vitest';
import { PasswordInput } from '../../../src/ui/components/Input/PasswordInput';

afterEach(cleanup);

it('shows and hides the same password without changing its value', () => {
  render(<PasswordInput id="password" label="Password" value="mock-password" />);
  const input = screen.getByLabelText('Password') as HTMLInputElement;
  expect(input.type).toBe('password');
  fireEvent.click(screen.getByRole('button', { name: 'Show password' }));
  expect(input.type).toBe('text');
  expect(input.value).toBe('mock-password');
  fireEvent.click(screen.getByRole('button', { name: 'Hide password' }));
  expect(input.type).toBe('password');
});

it('disables visibility changes until credential entry is allowed', () => {
  render(<PasswordInput id="password" label="Password" value="" disabled />);
  expect((screen.getByRole('button', { name: 'Show password' }) as HTMLButtonElement).disabled).toBe(true);
});
