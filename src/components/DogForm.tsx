import { useState, useEffect } from 'react';
import { DogProfile } from '../types/journal';
import { createId } from '../utils/journal';
import { Modal } from './modals/Modal';

export function DogForm({ dog, onSave, onClose }: { dog?: DogProfile; onSave: (dog: DogProfile) => void; onClose: () => void }) {
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [notes, setNotes] = useState('');
  useEffect(() => { setName(dog?.name ?? ''); setBreed(dog?.breed ?? ''); setBirthdate(dog?.birthdate ?? ''); setNotes(dog?.notes ?? ''); }, [dog]);
  return <Modal label={dog ? 'Edit dog profile' : 'Add dog profile'} onClose={onClose}>
    <form className="modal-panel surface p-5 w-full max-w-md relative" onSubmit={event => {
      event.preventDefault();
      if (!name.trim()) return;
      onSave({ id: dog?.id ?? createId(), name: name.trim(), breed: breed.trim() || 'Not specified',
        birthdate: birthdate || undefined, notes: notes.trim() || undefined });
    }}>
      <button type="button" onClick={onClose} className="icon-button absolute top-2 right-2" aria-label="Close dog profile">×</button>
      <h2 className="heading-md mb-1">{dog ? 'Edit dog profile' : 'Add your dog'}</h2>
      <p className="body-secondary mb-5">These details help keep observations separate.</p>
      <div className="space-y-4">
        <div><label className="field-label" htmlFor="dog-name">Dog's name</label>
          <input id="dog-name" className="field" value={name} onChange={e => setName(e.target.value)} required autoComplete="off" maxLength={40} placeholder="e.g. Milo" /></div>
        <div><label className="field-label" htmlFor="dog-breed">Breed or mix (optional)</label>
          <input id="dog-breed" className="field" value={breed} onChange={e => setBreed(e.target.value)} maxLength={80} placeholder="e.g. Cocker spaniel" /></div>
        <div><label className="field-label" htmlFor="dog-birthdate">Birthdate (optional)</label>
          <input id="dog-birthdate" className="field" type="date" max={new Date().toISOString().slice(0, 10)} value={birthdate} onChange={e => setBirthdate(e.target.value)} /></div>
        <div><label className="field-label" htmlFor="dog-notes">Useful care context (optional)</label>
          <textarea id="dog-notes" className="field" rows={3} maxLength={1000} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Known sensitivities or routines. This is not a medical record." /></div>
      </div>
      <button className="button-primary w-full mt-5" type="submit">{dog ? 'Save profile changes' : 'Add dog and continue'}</button>
    </form>
  </Modal>;
}