---
name: layout-interaction-contract
description: |
  Use this to implement complex UI layouts and UX interactions systematically: pinned/detached scrolling, container changes, keyboards/safe areas/occlusion, virtual lists, drag and drop, overlays, sticky elements, dynamic height changes, and cross-platform layout regressions. Trigger it when the user worries that "fixing this will break something else" or that someone "only knows how to tweak styles, not how to reason about the complete calculation." It applies across Web/iOS/Android/desktop/Canvas/game UI.
---

# Layout Interaction Contract

## Purpose

The difficulty of a complex UI lies not in the styling of a single element, but in the relationships, constraints, chains of effects, and event timing among elements. When using this skill, first model the layout and interaction in a way that supports definitive decisions, then write code. This avoids fixing one corner while breaking the whole.

## Applicability

- Scrolling lists: pinning, detaching, restoring, preserving anchors, and new-content indicators.
- Coupled dimensions: changes to the window, container, keyboard, safe area, toolbar, sidebar, or collapsible panel.
- Dynamic content: height changes after images load, asynchronous data insertion, virtual lists, and infinite loading.
- Complex interactions: drag and drop, gestures, focus, overlays, sticky elements, interrupted animations, and nested scrolling.
- Cross-platform UI: Web, iOS, Android, desktop, Canvas, and game UI; do not assume that DOM/CSS exists.

Do not use it for purely visual tokens, colors, fonts, static copy, or small style changes with no dynamic chain of effects.

## Core principles

1. **Layout is a relationship graph**: First ask how elements affect one another; do not begin by tweaking an isolated style.
2. **Interaction is a state machine**: Define states and transitions first; do not scatter behavior across event callbacks.
3. **Measurement has timing**: Dimensions, positions, occlusion, and content height all have update timing. If the timing is unclear, the code will inevitably jitter.
4. **Ownership is unique**: Only one layer may own a given layout measurement, scroll state, visibility state, or focus state.
5. **Layer the implementation**: Separate rule/state calculations from platform rendering. The platform provides only measurements, events, and drawing.
6. **Verify scenarios**: Verify user-visible scenarios, not just node existence or snapshot similarity.

## Workflow

### 1. Interaction contract

First write the expectations as numbered rules. Each rule must be decidable through code or a scenario:

```text
R1 [Short name]
Trigger: When it takes effect.
Requirement: How the system must respond.
Rationale: Why this behavior matches the user's intent.
Acceptance: How to observe that it passes.
```

Example:

```text
R1 Automatically remain pinned when already at the bottom
Trigger: New content arrives while the user is still near the end of the content.
Requirement: After the content updates, the view must keep the end visible.
Rationale: The user is following the latest content and should not have to scroll after it manually.
Acceptance: After content is appended, the final element remains within the visible area.
```

### 2. Element relationships and chains of effects

Before implementation, you must create a relationship table. Elements may include the viewport, container, list, input bar, keyboard, safe area, overlay, content item, anchor, and scrollbar. For cross-platform work, use abstract names rather than platform-specific terminology.

| Element | Owns | Depends on | Affects | Dimension source | Position source | Clipping/layering | Events |
|---|---|---|---|---|---|---|---|
| Viewport | Visible boundary | Device/window | Root | System measurement | System | None | resize/orientation |
| Root | Main layout constraints | Viewport/SafeArea | List/Input | Parent constraints | Flow/constraints | May clip | layout |
| List | Scroll state | Root/Input/Content | VisibleItems | Remaining space | Root | Vertical clipping | scroll |
| Content | Total content dimensions | Items | List scroll range | Child measurements | List | May overflow | contentChange |

After the relationship table, write the invariants:

- Which elements are in the same layout flow, and which are outside it.
- Which element determines the scrollable height, and which element only displays content.
- Which changes recalculate layout, and which only change drawing.
- Which state is determined by user intent, and which is derived by the program.
- Which boundaries clip content, intercept gestures, or change hit testing.

### 3. Dynamic event model

List every event source that can change layout or interaction outcomes:

- Viewport changes: window resize, rotation, split screen, or zoom.
- Container changes: panel expansion, toolbar appearance, or changes to parent constraints.
- Content changes: appending, deletion, reordering, or height changes after images/rich text load.
- Occlusion changes: keyboard, safe area, system bar, floating layer, or input-method candidate bar.
- User input: scrolling, dragging, click-to-jump, focus, or gesture cancellation.
- Program side effects: automatic scrolling, anchor restoration, animation, or virtual-list recycling.

If there are two or more interaction states, you must create a `stateDiagram`. If the outcome depends on event order, you must create a `sequenceDiagram`. Use the `diagram` skill and validate the Mermaid. Only a diagram that passes validation may serve as an implementation basis.

### 4. State and ownership

Separate state into four categories; do not mix them:

| Category | Examples | Owner |
|---|---|---|
| User intent | pinned/detached, dragging, focused | Interaction state machine |
| Measurement facts | viewportSize, contentSize, occlusionInset | Platform measurement layer |
| Derived layout | listHeight, anchorOffset, visibleRange | Pure calculation layer |
| Rendering commands | scrollTo, animateTo, setFrame | Platform adapter layer |

Prohibitions:

- Do not let parent and child components each maintain the same state.
- Do not treat events triggered by programmatic scrolling as user scrolling.
- Do not replace measurements and constraints with magic numbers.
- Do not use catch/fallback/optional to conceal an undefined upstream contract.
- Do not change a shared component to fix the current screen without scanning its consumers.

### 5. Implementation layers

Implement in this order:

1. **Rules layer**: Interaction contracts and invariants.
2. **Calculation layer**: Pure functions, reducers, and state machines. Inputs are events and measurements; outputs are derived layout/rendering commands.
3. **Platform layer**: Measurements, event subscriptions, and rendering commands for Web/iOS/Android/desktop and other platforms.
4. **View layer**: Element structure, styles, and component composition.
5. **Side-effect layer**: Commands for scrolling, animation, focus, and similar actions. They must carry a source marker that distinguishes user actions from program actions.

Handle platform differences only in the platform layer. Keep the rules and calculation layers as readable across platforms as possible.

### 6. Blast-radius scan

Before changing a shared component, layout container, scrolling utility, or gesture handling, scan:

- Who calls this component/utility.
- Which callers have different content volumes, container sizes, platforms, or input methods.
- Which pages depend on the old layout side effects.
- Whether the current fix changes scrolling, focus, layering, hit testing, or accessibility.

If the blast radius is unclear, gather evidence first. Do not make a small change based on intuition.

### 7. Verification matrix

At minimum, verify the user scenarios covered by the rules. You may use automation, screenshots, manual steps, or logs. The key is to prove that the interaction states and layout invariants hold.

| Scenario | Initial state | Event | Expected | Evidence |
|---|---|---|---|---|
| Short initial content | Content does not fill the available space | Rendering completes | No unnecessary scrolling or misalignment | Screenshot/measurement |
| Long initial content | Content overflows | Rendering completes | Default anchor is correct | Screenshot/scroll state |
| Append while pinned | pinned | New content arrives | The end remains visible | Automation/logs |
| Append after the user scrolls up | detached | New content arrives | Do not force the view back to the bottom | Automation/logs |
| Container shrinks | Any | Keyboard/panel appears | Height is recalculated and focus remains visible | Screenshot/measurement |
| Content becomes taller later | Any | Image loads | The anchor or end-position rule still holds | Automation/logs |
| Rapid consecutive events | Any | resize+append+scroll | No jitter or infinite loop | Performance/logs |

## Using diagrams

- For complex element relationships, use a flowchart to show dependencies and chains of effects.
- For complex state transitions, use a stateDiagram to show user intent and program state.
- For timing-sensitive behavior, use a sequenceDiagram to show the order of measurements, events, rendering, and side effects.
- Diagrams express mechanisms, not aesthetics. They must be able to guide implementation and verification.

## Output format

Before delivery, briefly state:

- **Contract**: List the rule numbers.
- **Relationships**: List the key elements and chains of effects.
- **State**: State whether a state machine or sequence diagram was created.
- **Implementation**: State which layers contain the changes.
- **Verification**: List verified scenarios and unverified risks.

## One-line reminder

If you are adjusting an element's `height`, `padding`, `offset`, or `inset` but cannot say what affects it and what it affects, stop immediately and document the element relationships and chain of effects first.
