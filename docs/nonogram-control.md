# Adaptive Gesture Matrix Control Scheme for Nonograms

## Concept Overview
This control model replaces traditional point-and-click or binary toggle inputs with an adaptive gesture matrix. Players interact with the puzzle by performing smooth, continuous gestures that are interpreted as high-level editing intents. The scheme is designed for touchscreens, styluses, and modern trackpads, translating expressive motions into precise grid operations without requiring a cursor to land on each individual cell.

## Core Interaction Modes
1. **Ribbon Sweep Mode**
   * Drag a finger or stylus across the grid to lay down a "ribbon" path.
   * The path snaps to row and column segments, filling or marking cells according to the active brush state.
   * Pressure or vertical distance from the surface toggles between fill, cross-out, and erase actions.

2. **Pulse Stamps**
   * Tap and hold to create a radial pulse that automatically fills a contiguous block sized to the clue number under the pointer.
   * Sliding while holding adjusts the block's orientation (horizontal/vertical) and length before committing.

3. **Tempo-Based Erase**
   * Double-tap with varying tempo to clear recent actions. A slower rhythm reverses the last ribbon sweep, while a rapid rhythm clears only the last few cells touched.

## Contextual Assist Overlays
* A ghost preview shows the inferred result of the current gesture before it is committed.
* Adaptive haptics provide feedback when a gesture satisfies a row or column clue, reducing the need to constantly cross-check numbers.

## Accessibility Considerations
* Ribbon sensitivity and snapping thresholds can be tuned for motor-impaired players.
* Optional voice cues announce the inferred action after each gesture, ensuring clarity without visual overload.

## Benefits
* Reduces micro-click fatigue on large puzzles.
* Enables expressive, flowing interactions that match the creative logic-solving nature of Nonograms.
* Creates a bridge between analog pencil-and-paper strategies and digital convenience by preserving the feel of sweeping strokes and decisive marks.
