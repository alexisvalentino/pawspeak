import { useState } from 'react';
import { Dog } from 'lucide-react';
import { DogProfile } from '../types/journal';
import { Modal } from './modals/Modal';
import { PageHeading } from './PageHeading';

export function ProfilesScreen({ dogs, observations, onAdd, onEdit, onDelete }: {
  dogs: DogProfile[]; observations: { petId: string }[];
  onAdd: () => void; onEdit: (dog: DogProfile) => void; onDelete: (id: string) => void;
}) {
  const [deleteDog, setDeleteDog] = useState<DogProfile | null>(null);
  return <div><PageHeading tone="sky" icon={<Dog />} title="Your dogs" description="A separate journal for each companion." action={<button className="button-primary" onClick={onAdd}>Add dog</button>} />
    {dogs.length === 0 ? <div className="empty-state"><h2 className="heading-md">No dog profiles yet</h2><p className="body-secondary mt-2">Add a profile to keep your companion’s observations together.</p></div>
      : <div className="grid gap-4 sm:grid-cols-2">{dogs.map(dog => <article className="surface p-5" key={dog.id}><h2 className="heading-md">{dog.name}</h2><p className="body-secondary mt-1">{dog.breed}</p>
        {dog.birthdate && <p className="body-secondary mt-2">Born {new Date(`${dog.birthdate}T12:00:00`).toLocaleDateString()}</p>}{dog.notes && <p className="mt-3 text-sm leading-6">{dog.notes}</p>}
        <p className="body-secondary mt-3">{observations.filter(o => o.petId === dog.id).length} observations</p>
        <div className="flex gap-2 mt-4"><button className="button-secondary" onClick={() => onEdit(dog)}>Edit profile</button><button className="button-danger-secondary" onClick={() => setDeleteDog(dog)}>Delete</button></div>
      </article>)}</div>}
    {deleteDog && <Modal label="Delete dog and journal" onClose={() => setDeleteDog(null)}><div className="modal-panel surface w-full max-w-md p-5"><h2 className="heading-md">Delete {deleteDog.name}?</h2><p className="mt-3 text-sm leading-6">This permanently deletes the profile and all {observations.filter(o => o.petId === deleteDog.id).length} observations in this browser. Export first if you want a copy.</p><div className="flex gap-2 mt-5"><button className="button-danger flex-1" onClick={() => { onDelete(deleteDog.id); setDeleteDog(null); }}>Delete dog and journal</button><button className="button-secondary flex-1" onClick={() => setDeleteDog(null)}>Cancel</button></div></div></Modal>}
  </div>;
}
