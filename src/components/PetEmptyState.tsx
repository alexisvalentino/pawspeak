import { MascotDuoScene } from './MascotDuoScene';

export function PetEmptyState({ title, description = 'Add a dog or cat profile to start keeping observations together.' }: { title: string; description?: string }) {
  return <div className="empty-state mascot-empty-state">
    <MascotDuoScene className="mascot-duo-empty" foreground="dog" />
    <h2 className="mascot-empty-title">{title}</h2>
    <p className="mascot-empty-copy">{description}</p>
  </div>;
}
