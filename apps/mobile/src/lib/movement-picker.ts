let receiver: ((slug: string) => void) | null = null;

export function listenForMovementSelection(callback: (slug: string) => void) {
  receiver = callback;
  return () => {
    if (receiver === callback) receiver = null;
  };
}

export function selectMovement(slug: string) {
  receiver?.(slug);
}
