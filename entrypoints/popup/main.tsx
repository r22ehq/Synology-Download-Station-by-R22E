import { render } from 'preact';
import { App } from './App';
import '../../src/ui/styles/global.css';

const root = document.getElementById('app');
if (root) {
  render(<App />, root);
}
