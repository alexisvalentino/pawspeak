import { useState } from 'react';
import { PawPrint } from 'lucide-react';
import { PetProfile } from '../types/journal';
import { PetEmptyState } from './PetEmptyState';
import { Modal } from './modals/Modal';
import { PageHeading } from './PageHeading';

export function ProfilesScreen({ pets, observations, onEdit, onDelete }: {
  pets: PetProfile[]; observations: { petId: string }[];
  onEdit: (pet: PetProfile) => void; onDelete: (id: string) => void;
}) {
  const [deletePet, setDeletePet] = useState<PetProfile | null>(null);
  return <div><PageHeading tone="sky" icon={<PawPrint />} title="Your pets" description="A separate journal for each companion." />
    {pets.length === 0 ? <PetEmptyState title="No pet profiles yet" />
      : <div className="grid gap-4 sm:grid-cols-2">{pets.map(pet => <article className="surface pet-profile-card" key={pet.id}><div className="pet-profile-heading"><img className="mascot-avatar" src={pet.species === 'cat' ? '/mascots/cat.webp' : '/mascots/dog.webp'} alt="" /><div><h2 className="heading-md">{pet.name}</h2><p className="body-secondary mt-1">{pet.species === 'cat' ? 'Cat' : 'Dog'} · {pet.breed}</p></div></div>
        {pet.birthdate && <p className="body-secondary mt-2">Born {new Date(`${pet.birthdate}T12:00:00`).toLocaleDateString()}</p>}{pet.notes && <p className="mt-3 text-sm leading-6">{pet.notes}</p>}
        <p className="body-secondary mt-3">{observations.filter(o => o.petId === pet.id).length} observations</p>
        <div className="flex gap-2 mt-4"><button className="button-secondary" onClick={() => onEdit(pet)}>Edit profile</button><button className="button-danger-secondary" onClick={() => setDeletePet(pet)}>Delete</button></div>
      </article>)}</div>}
    {deletePet && <Modal label="Delete pet and journal" onClose={() => setDeletePet(null)}><div className="modal-panel surface w-full max-w-md p-5"><h2 className="heading-md">Delete {deletePet.name}?</h2><p className="mt-3 text-sm leading-6">This permanently deletes the profile and all {observations.filter(o => o.petId === deletePet.id).length} observations in this browser. Export first if you want a copy.</p><div className="flex gap-2 mt-5"><button className="button-danger flex-1" onClick={() => { onDelete(deletePet.id); setDeletePet(null); }}>Delete pet and journal</button><button className="button-secondary flex-1" onClick={() => setDeletePet(null)}>Cancel</button></div></div></Modal>}
  </div>;
}
