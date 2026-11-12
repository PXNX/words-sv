/**
 * Whether the version history sheet is open. Settings opens it from its version row, the sheet after
 * an update from its "everything new" link, and links to the old /changelog page land on it too.
 */
class ChangelogSheetStore {
  open = $state(false);
}

export const changelogSheet = new ChangelogSheetStore();
