import { signal } from '@preact/signals';

export type AppView = 'main' | 'settings' | 'add_nas' | 'edit_nas';

export const currentView = signal<AppView>('main');
export const editNasId = signal<string | null>(null);
export const settingsSection = signal<'connection' | 'about'>('connection');

export const navigateTo = (view: AppView, params?: { id?: string; section?: 'connection' | 'about' }) => {
  if (params?.id) {
    editNasId.value = params.id;
  }
  if (view === 'settings') settingsSection.value = params?.section || 'connection';
  currentView.value = view;
};
