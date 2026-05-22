import './style.css';
import { Game } from './game/Game';

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('Missing #app element');
}

const root = app;

async function boot() {
  const game = new Game(root);
  await game.init();
  game.start();
}

void boot();
