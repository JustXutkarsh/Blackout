import './style.css';
import { Game } from './game';
import {OnlineGame} from './net/online';
try {
  const game = new Game();
  new OnlineGame(game);
  if (import.meta.env.DEV) Object.assign(window, { __BLACKOUT__: game });
  if (import.meta.hot) import.meta.hot.dispose(() => game.dispose());
} catch (error) {
  console.error(error);
  const loading = document.getElementById('loading');
  if (loading) loading.textContent = 'Unable to initialize WebGL 2. Use a current desktop browser with hardware acceleration enabled.';
}
