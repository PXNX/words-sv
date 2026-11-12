/**
 * Whether the welcome flow (the first run's introduction) is on screen. The home screen shows it to
 * first-time learners and to anyone who has no name yet. While it runs, the dock and the update
 * sheet stay away: nothing should compete with the introduction, and no update may reload the app in
 * the middle of it and throw the learner back to the first step.
 */
class IntroFlowStore {
  active = $state(false);
}

export const introFlow = new IntroFlowStore();
