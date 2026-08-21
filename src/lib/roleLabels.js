export const ROLE_LABELS = {
  vet: "וטרינר",
  veterinarian: "וטרינר",
  tech: "אח.ות וטרינר.ית",
  technician: "אח.ות וטרינר.ית",
  surgery_tech: "טכנאי ניתוחים",
  receptionist: "קבלה",
};

export function roleLabel(role) {
  return ROLE_LABELS[role] || role || "";
}