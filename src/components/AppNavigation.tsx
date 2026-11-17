import { BookOpen, Camera, LibraryBig, PawPrint } from 'lucide-react';
export type AppScreen = 'camera' | 'dictionary' | 'observe' | 'journal' | 'profiles';
export function AppNavigation({ screen, onNavigate }: { screen: string; onNavigate: (screen: AppScreen) => void }) {
  const tabs = [{ id: 'camera', label: 'Camera', icon: Camera }, { id: 'dictionary', label: 'Learn', icon: LibraryBig }, { id: 'journal', label: 'Journal', icon: BookOpen }, { id: 'profiles', label: 'Pets', icon: PawPrint }] as const;
  return <nav className="bottom-nav" aria-label="Main navigation"><div className="grid grid-cols-4 max-w-xl mx-auto">{tabs.map(({ id, label, icon: Icon }) => <button key={id} aria-current={screen === id || (id === 'journal' && screen === 'observe') ? 'page' : undefined} onClick={() => onNavigate(id)} className={`nav-button ${screen === id || (id === 'journal' && screen === 'observe') ? 'nav-active' : ''}`}><span className="nav-icon"><Icon /></span><span>{label}</span></button>)}</div></nav>;
}
