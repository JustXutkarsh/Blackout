import './style.css';
import { Game } from './game';
import {OnlineGame} from './net/online';
import {SocialPanel} from './social/panel';
try {
  const game = new Game();
  const online=new OnlineGame(game);
  const social=new SocialPanel(game,online);
  game.abort.signal.addEventListener('abort',()=>social.dispose(),{once:true});
  if (import.meta.env.DEV) Object.assign(window, { __BLACKOUT__: game });
  if (import.meta.hot) import.meta.hot.dispose(() => game.dispose());
} catch (error) {
  console.error(error);
  const loading = document.getElementById('loading');
  if (loading) loading.textContent = 'Unable to initialize WebGL 2. Use a current desktop browser with hardware acceleration enabled.';
}
