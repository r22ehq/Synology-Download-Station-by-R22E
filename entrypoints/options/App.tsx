import { AppShell } from '../../src/ui/components/AppShell';

export const App = () => {
  const initialView = new URLSearchParams(window.location.search).get('view') === 'add_nas' ? 'add_nas' : 'settings';
  return <AppShell surface="options" initialView={initialView} />;
};
