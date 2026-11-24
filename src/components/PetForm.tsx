import { useState, useEffect } from 'react';
import { PetProfile, PetSpecies } from '../types/journal';
import { createId } from '../utils/journal';
import { Modal } from './modals/Modal';

export function PetForm({ pet, onSave, onClose }: { pet?: PetProfile; onSave: (pet: PetProfile) => void; onClose: () => void }) {
  const [species, setSpecies] = useState<PetSpecies>(pet?.species ?? 'dog');
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [notes, setNotes] = useState('');
  useEffect(() => {
    setSpecies(pet?.species ?? 'dog');
    setName(pet?.name ?? '');
    setBreed(pet?.breed ?? '');
    setBirthdate(pet?.birthdate ?? '');
    setNotes(pet?.notes ?? '');
  }, [pet]);
  return <Modal label={pet ? 'Edit pet profile' : 'Add pet profile'} onClose={onClose}>
    <form className="modal-panel surface p-5 w-full max-w-md relative" onSubmit={event => {
      event.preventDefault();
      if (!name.trim()) return;
      onSave({ id: pet?.id ?? createId(), species, name: name.trim(), breed: breed.trim() || 'Not specified',
        birthdate: birthdate || undefined, notes: notes.trim() || undefined });
    }}>
      <button type="button" onClick={onClose} className="icon-button absolute top-2 right-2" aria-label="Close pet profile">×</button>
      <div className="pet-form-heading"><img className="mascot-avatar" src={species === 'cat' ? '/mascots/cat.webp' : '/mascots/dog.webp'} alt="" /><div><h2 className="heading-md mb-1">{pet ? 'Edit pet profile' : 'Add a pet'}</h2>
        <p className="body-secondary">Choose dog or cat. Details help keep observations separate.</p></div></div>
      <div className="space-y-4">
        {!pet ? <div><label className="field-label" htmlFor="pet-species">Pet type</label>
          <select id="pet-species" className="field" value={species} onChange={event => setSpecies(event.target.value as PetSpecies)}>
            <option value="dog">Dog</option><option value="cat">Cat</option>
          </select></div>
          : <div><span className="field-label">Pet type</span><p className="body-secondary">{pet.species === 'cat' ? 'Cat' : 'Dog'}</p></div>}
        <div><label className="field-label" htmlFor="pet-name">Pet’s name</label>
          <input id="pet-name" className="field" value={name} onChange={e => setName(e.target.value)} required autoComplete="off" maxLength={40} placeholder="e.g. Milo" /></div>
        <div><label className="field-label" htmlFor="pet-breed">Breed or mix (optional)</label>
          <input id="pet-breed" className="field" value={breed} onChange={e => setBreed(e.target.value)} maxLength={80} placeholder={species === 'cat' ? 'e.g. Domestic shorthair' : 'e.g. Cocker spaniel'} /></div>
        <div><label className="field-label" htmlFor="pet-birthdate">Birthdate (optional)</label>
          <input id="pet-birthdate" className="field" type="date" max={new Date().toISOString().slice(0, 10)} value={birthdate} onChange={e => setBirthdate(e.target.value)} /></div>
        <div><label className="field-label" htmlFor="pet-notes">Useful care context (optional)</label>
          <textarea id="pet-notes" className="field" rows={3} maxLength={1000} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Known sensitivities or routines. This is not a medical record." /></div>
      </div>
      <button className="button-primary w-full mt-5" type="submit">{pet ? 'Save profile changes' : 'Add pet and continue'}</button>
    </form>
  </Modal>;
}
