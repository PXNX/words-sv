# First-play tutorial verification

The local preview was rendered with `wordcircle-tutorial-state-v1` set to `open`. The game presented a centered editorial tutorial card before interaction, with three short steps covering letter tracing, crossword progress, and the post-solve Wiktionary help control. The **Losspielen** action is prominent, and the game remains blocked only while the tutorial is visible.

Selecting **Losspielen** immediately dismissed the overlay and returned control to the game. The tutorial completion state is stored locally as `complete`, so it does not appear again on later visits unless the browser's local site data is cleared.
