// While the learner has their own character, it plays Kumar's part in the stories under their first
// name (see fillName and characterNames in stories.ts). Kept apart from the settings store so the
// stories need no runes; the store keeps it current.
let standIn: string | null = null;

export function setKumarStandIn(name: string | null) {
  standIn = name || null;
}
export function kumarStandIn() {
  return standIn;
}
