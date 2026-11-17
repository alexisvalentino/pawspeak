import { useState } from 'react';
import { Cat, ChevronDown, Dog, Menu } from 'lucide-react';
import { PetProfile } from '../types/journal';
import { Modal } from './modals/Modal';

export function AppHeader({ pets, activePet, onSelect, onAdd, onExport, onClear, onHome }: {
  pets: PetProfile[]; activePet?: PetProfile; onSelect: (id: string) => void; onAdd: () => void;
  onExport: () => void; onClear: () => void; onHome: () => void;
}) {
  const [menu, setMenu] = useState<'pets' | 'settings' | 'export' | null>(null);
  const [clear, setClear] = useState(false);
  const ActivePetIcon = activePet?.species === 'cat' ? Cat : Dog;
  const close = () => { setMenu(null); setClear(false); };
  const openMenu = (next: 'pets' | 'settings') => {
    window.dispatchEvent(new Event('pawspeak:suspend-camera'));
    setMenu(next);
  };
  return <header className="app-header"><div className="app-header-inner flex h-16 items-center gap-2">
    <button className="brand-home shrink-0" onClick={onHome} aria-label="PawSpeak home"><img className="brand-mark" src="/pawspeak-icon.svg" alt="" /><span className="brand-name">PawSpeak<span className="brand-dot">.</span></span></button>
    <span className="brand-tagline hidden sm:inline body-secondary ml-2">Pet pals, understood.</span>
    <button className="pet-picker ml-auto button-secondary min-w-0" onClick={() => openMenu('pets')} aria-label={`Current pet: ${activePet?.name ?? 'none'}`}><ActivePetIcon /><span className="pet-picker-name">{activePet?.name ?? 'Choose pet'}</span><ChevronDown /></button>
    <button className="menu-button button-secondary" onClick={() => openMenu('settings')} aria-label="Open journal settings"><Menu /></button>
  </div>
  {menu && <Modal label={menu === 'pets' ? 'Choose pet' : 'Journal settings'} onClose={close}><div className="modal-panel surface w-full max-w-md p-5 relative">
    <button className="icon-button absolute top-2 right-2" onClick={close} aria-label="Close menu">×</button>
    {menu === 'pets' ? <><h2 className="heading-md pr-8">Choose a pet</h2><p className="body-secondary mt-1 mb-4">Observations are kept with the selected profile.</p>
      <div className="space-y-2">{pets.map(pet => {
        const PetIcon = pet.species === 'cat' ? Cat : Dog;
        return <button className={`w-full text-left p-4 rounded-xl border ${pet.id === activePet?.id ? 'border-sky-600 bg-sky-50' : 'border-slate-200'}`} key={pet.id} onClick={() => { onSelect(pet.id); close(); }}><span className="font-bold flex items-center gap-2"><PetIcon aria-hidden="true" />{pet.name}</span><span className="body-secondary">{pet.species === 'cat' ? 'Cat' : 'Dog'} · {pet.breed}</span></button>;
      })}</div>
      <button className="button-primary w-full mt-4" onClick={() => { close(); onAdd(); }}>Add pet</button></>
      : menu === 'export' ? <><h2 className="heading-md pr-8">Export your journal</h2><p className="body-secondary mt-2">Download a JSON copy of your text profiles and observations. Media is not included.</p><button className="button-primary mt-5 w-full" onClick={() => { onExport(); close(); }}>Download journal JSON</button></>
      : <><h2 className="heading-md pr-8">Journal settings</h2><div className="mt-5 space-y-5"><section><h3 className="font-bold">Your data</h3><p className="body-secondary mt-1">Profiles and notes stay in this browser. No account or cloud sync. Media is previewed locally and never saved by this app.</p><button className="button-secondary mt-3" onClick={() => setMenu('export')}>Export journal (JSON)</button></section>
        <section className="border-t border-slate-200 pt-4"><h3 className="font-bold">Product limits</h3><p className="body-secondary mt-1">The camera can detect several common animal types; body-language guides and journal cues are available for dogs and cats. PawSpeak does not read emotions, translate vocalizations, or diagnose. Consult a veterinarian for sudden changes, injury, or health concerns.</p></section>
        <section className="border-t border-slate-200 pt-4"><h3 className="font-bold">Clear local data</h3><p className="body-secondary mt-1">Delete all profiles and observations from this browser.</p>{clear ? <div className="danger-panel mt-3"><p className="text-sm font-semibold">Export first if needed. This cannot be undone.</p><div className="flex gap-2 mt-3"><button className="button-danger flex-1" onClick={() => { onClear(); close(); }}>Delete all data</button><button className="button-secondary flex-1" onClick={() => setClear(false)}>Cancel</button></div></div> : <button className="button-danger-secondary mt-3" onClick={() => setClear(true)}>Clear local data</button>}</section>
      </div></>}
  </div></Modal>}
  </header>;
}
