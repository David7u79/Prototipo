export function toWorkoutMovementRef(movement: {
  slug: string;
  name: string;
  category: string;
  equipment: string;
}) {
  return {
    slug: movement.slug,
    name: movement.name,
    category: movement.category,
    equipment: movement.equipment,
  };
}
