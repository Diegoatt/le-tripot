import { Component, ReactNode } from 'react';
import { go, useStore } from './store';
import Title from './screens/Title';
import Setup from './screens/Setup';
import Lobby from './screens/Lobby';
import GameScreen from './screens/GameScreen';
import End from './screens/End';
import Balance from './screens/Balance';
import { CapWarning, PauseOverlay } from './ui/overlays';

const SCREENS = { title: Title, setup: Setup, lobby: Lobby, game: GameScreen, end: End, balance: Balance };

/** A bug in one table must not end the evening: fall back to the lobby (scores are kept). */
class Guard extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  componentDidCatch(e: unknown) {
    console.error(e);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="h-full grid place-items-center">
        <div className="panel p-10 flex flex-col items-center gap-4">
          <div className="display text-[70px] neon-red">Oups, table renversée</div>
          <div className="text-[22px] text-white/70">Les scores sont conservés.</div>
          <button className="btn btn-gold text-[30px] px-8 py-3" onClick={() => (this.setState({ error: false }), go('lobby'))}>
            Retour au lobby
          </button>
        </div>
      </div>
    );
  }
}

export default function App() {
  const screen = useStore((s) => s.screen);
  const gameId = useStore((s) => s.gameId);
  const Screen = SCREENS[screen];
  const key = screen + (screen === 'game' ? gameId : '');
  return (
    <div className="app-bg grain relative h-full w-full overflow-hidden">
      <Guard key={key}>
        <Screen />
      </Guard>
      <PauseOverlay />
      <CapWarning />
    </div>
  );
}
