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
  const addPet = () => {
    window.dispatchEvent(new Event('pawspeak:suspend-camera'));
    onAdd();
  };
  return <header className="app-header"><div className="app-header-inner flex h-16 items-center gap-2">
    <button className="brand-home shrink-0" onClick={onHome} aria-label="PawSpeak home"><span className="brand-name">PawSpeak<span className="brand-dot">.</span></span></button>
    <span className="brand-tagline hidden sm:inline body-secondary ml-2">Pet pals, understood.</span>
    <button className="pet-picker ml-auto button-secondary min-w-0" onClick={() => pets.length ? openMenu('pets') : addPet()} aria-label={activePet ? `Current pet: ${activePet.name}. Switch pet` : pets.length ? 'Choose a pet profile' : 'Add a pet profile'}><ActivePetIcon /><span className="pet-picker-name">{activePet?.name ?? (pets.length ? 'Choose pet' : 'Add pet')}</span>{pets.length > 0 && <ChevronDown />}</button>
    <button className="menu-button button-secondary" onClick={() => openMenu('settings')} aria-label="Open app settings"><Menu /></button>
  </div>
  {menu && <Modal label={menu === 'pets' ? 'Choose pet' : 'App settings'} onClose={close}><div className="modal-panel surface w-full max-w-md p-5 relative">
    <button className="icon-button absolute top-2 right-2" onClick={close} aria-label="Close menu">×</button>
    {menu === 'pets' ? <><h2 className="heading-md pr-8">Choose a pet</h2><p className="body-secondary mt-1 mb-4">Observations are kept with the selected profile.</p>
      <div className="space-y-2">{pets.map(pet => {
        const PetIcon = pet.species === 'cat' ? Cat : Dog;
        return <button className={`w-full text-left p-4 rounded-xl border ${pet.id === activePet?.id ? 'border-sky-600 bg-sky-50' : 'border-slate-200'}`} key={pet.id} onClick={() => { onSelect(pet.id); close(); }}><span className="font-bold flex items-center gap-2"><PetIcon aria-hidden="true" />{pet.name}</span><span className="body-secondary">{pet.species === 'cat' ? 'Cat' : 'Dog'} · {pet.breed}</span></button>;
      })}</div>
      <button className="button-primary w-full mt-4" onClick={() => { close(); onAdd(); }}>Add pet</button></>
      : menu === 'export' ? <><h2 className="heading-md pr-8">Export your journal</h2><p className="body-secondary mt-2">Download a JSON copy of your text profiles and observations. Media is not included.</p><button className="button-primary mt-5 w-full" onClick={() => { onExport(); close(); }}>Download journal JSON</button></>
      : <><h2 className="heading-md pr-8">App settings</h2><div className="mt-5 space-y-5"><section><h3 className="font-bold">About PawSpeak</h3><p className="body-secondary mt-1">Developed under Pawsmatch AI, PawSpeak is an early research milestone toward helping people better understand companion-animal signals. Today it pairs on-device animal detection with a source-backed guide to dog and cat body language.</p><p className="body-secondary mt-2">App version <strong>{__APP_VERSION__}</strong></p></section>
        <section className="border-t border-slate-200 pt-4"><h3 className="font-bold">Your data</h3><p className="body-secondary mt-1">Profiles and notes stay in this browser. No account or cloud sync. Media is previewed locally and never saved by this app.</p><button className="button-secondary mt-3" onClick={() => setMenu('export')}>Export journal (JSON)</button></section>
        <section className="border-t border-slate-200 pt-4"><h3 className="font-bold">Product limits</h3><p className="body-secondary mt-1">The camera can detect several common animal types; body-language guides and journal cues are available for dogs and cats. PawSpeak does not read emotions, translate vocalizations, or diagnose. Consult a veterinarian for sudden changes, injury, or health concerns.</p></section>
        <section className="border-t border-slate-200 pt-4"><h3 className="font-bold">Clear local data</h3><p className="body-secondary mt-1">Delete all profiles and observations from this browser.</p>{clear ? <div className="danger-panel mt-3"><p className="text-sm font-semibold">Export first if needed. This cannot be undone.</p><div className="flex gap-2 mt-3"><button className="button-danger flex-1" onClick={() => { onClear(); close(); }}>Delete all data</button><button className="button-secondary flex-1" onClick={() => setClear(false)}>Cancel</button></div></div> : <button className="button-danger-secondary mt-3" onClick={() => setClear(true)}>Clear local data</button>}</section>
      </div></>}
  </div></Modal>}
  </header>;
}
