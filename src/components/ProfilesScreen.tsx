import { useState } from 'react';
import { ClipboardList, Plus, Search, Trash2 } from 'lucide-react';
import { PetProfile } from '../types/journal';
import { PetEmptyState } from './PetEmptyState';
import { Modal } from './modals/Modal';

export function ProfilesScreen({ pets, observations, activePetId, onAdd, onSelect, onEdit, onDelete }: {
  pets: PetProfile[];
  observations: { petId: string }[];
  activePetId?: string;
  onAdd: () => void;
  onSelect: (id: string) => void;
  onEdit: (pet: PetProfile) => void;
  onDelete: (id: string) => void;
}) {
  const [deletePet, setDeletePet] = useState<PetProfile | null>(null);
  return <section className="profiles-screen">
    <header className="screen-heading profiles-heading">
      <div><h1>Your pets</h1><p>A separate journal for each companion.</p></div>
      <button className="screen-add-button" type="button" onClick={onAdd} aria-label="Add pet"><Plus aria-hidden="true" /></button>
    </header>
    {pets.length === 0 ? <PetEmptyState title="No pet profiles yet" description="Add a dog or cat profile to keep their observations together." />
      : <div className="pet-profile-grid">{pets.map(pet => {
        const isActive = pet.id === activePetId;
        const count = observations.filter(observation => observation.petId === pet.id).length;
        const birthday = pet.birthdate ? new Intl.DateTimeFormat(undefined, { month: 'short', year: 'numeric' }).format(new Date(`${pet.birthdate}T12:00:00`)) : null;
        return <article className={`pet-profile-card${isActive ? ' is-primary' : ''}`} key={pet.id}>
          <button className="pet-profile-main" type="button" aria-pressed={isActive} aria-label={`${isActive ? 'Primary pet' : `Set ${pet.name} as primary pet`}: ${pet.name}`} onClick={() => onSelect(pet.id)}>
            <span className={`pet-avatar-wrap pet-avatar-${pet.species}`}><img src={`/mascots/${pet.species}.webp`} alt="" /></span>
            <span className="pet-profile-copy">
              <span className="pet-profile-title"><strong>{pet.name}</strong><span>{pet.species === 'cat' ? 'Cat' : 'Dog'}</span></span>
              <span className="pet-profile-meta">{pet.breed}{birthday ? ` · ${birthday}` : ''}</span>
              <span className="pet-observation-count">{count} {count === 1 ? 'observation' : 'observations'}</span>
            </span>
            {isActive && <span className="pet-primary-badge">Primary</span>}
          </button>
          <div className="pet-profile-actions">
            <button type="button" className="pet-edit-button" onClick={() => onEdit(pet)}>Edit profile</button>
            <button type="button" className="pet-delete-button" aria-label={`Delete ${pet.name}`} onClick={() => setDeletePet(pet)}><Trash2 aria-hidden="true" />Delete</button>
          </div>
        </article>;
      })}</div>}

    <aside className="research-concept" aria-labelledby="research-concept-title">
      <div className="research-copy"><span className="research-badge">Exploring</span><h2 id="research-concept-title">Vet-visit summaries and visible health cues</h2><p>Research may explore changes around the eyes or nose, movement and gait patterns, and ways to organize observations for a veterinary conversation.</p><small>Concept in research. Not available yet. PawSpeak does not assess health or diagnose.</small></div>
      <span className="research-illustration" aria-hidden="true"><ClipboardList /><Search /></span>
    </aside>

    {deletePet && <Modal label={`Delete ${deletePet.name} and journal`} onClose={() => setDeletePet(null)}><div className="modal-panel pet-delete-sheet">
      <h2>Delete {deletePet.name}?</h2><p>This permanently deletes the profile and all {observations.filter(observation => observation.petId === deletePet.id).length} observations on this device. Export a copy first if you want to keep them.</p>
      <div className="pet-delete-actions"><button className="button-danger" onClick={() => { onDelete(deletePet.id); setDeletePet(null); }}>Delete pet and journal</button><button className="button-secondary" onClick={() => setDeletePet(null)}>Keep profile</button></div>
    </div></Modal>}
  </section>;
}
