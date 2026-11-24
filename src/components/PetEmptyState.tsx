import { MascotDuoScene } from './MascotDuoScene';

export function PetEmptyState({ title }: { title: string }) {
  return <div className="empty-state mascot-empty-state">
    <MascotDuoScene className="mascot-duo-empty" foreground="dog" />
    <h2 className="mascot-empty-title">{title}</h2>
    <p className="mascot-empty-copy">Use Add pet in the top bar to create a profile for a dog or cat.</p>
  </div>;
}
