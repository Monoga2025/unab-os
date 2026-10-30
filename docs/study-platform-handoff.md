# Adaptive Study Platform Handoff

## Product Intent
Deliver a focused adaptive trainer that turns workshop problems into deliberate practice: attempt, inspect, hint, correct, vary, explain, and measure readiness.

## Scope and Non-Scope
In scope: curated Waves/Particles and pre-Thévenin Circuits problems, guided paper-first sessions, visual manipulatives, mastery tracking, and oral-defense practice. Out of scope: a broad course platform, arbitrary-PDF intelligence, automatic handwriting recognition, and uncurated symbolic grading.

## Required User Flows
1. Choose “practice now”; the system selects the highest-value problem.
2. Record diagram, known values, unknown, law, and steps; request a hint only when stuck.
3. Correct the flagged step, solve a variant, and answer one oral question.
4. Review readiness by topic: unaided accuracy, hint dependence, explanation quality, and recency.

## Content Data Model
`Problem`: topic, skill tags, prompt, diagram assets, prerequisites, difficulty, source, variant parameters. `SolutionSchema`: ordered checkpoints, accepted equations/units/sign conventions, common errors, progressive hints, oral questions, and variant generator constraints. `Attempt`: timestamp, submitted checkpoints, hints used, result, explanation score, and elapsed time.

## Mastery Model
Track each skill as Emerging, Assisted, Independent, or Ready. Promote only after correct unaided work plus a correct variant and oral explanation; lower confidence after an error or long inactivity. Readiness favors the lowest prerequisite skill, not a simple completion percentage.

## Interaction and Feedback Rules
Keep the learner active: ask for the next step before showing it. Reveal one hint tier at a time, name the failing checkpoint, explain why, and require a retry. Show full solutions only after a recorded attempt or an explicit review choice. Exact solution correctness requires the curated `SolutionSchema`; do not promise automatic symbolic grading without it.

## Accessibility and Mobile
Use high-contrast diagrams, text equivalents, keyboard operation, readable equations, captions for audio prompts, and touch-friendly controls. Mobile supports capture, hints, and review; drawing-heavy work remains practical on tablet or desktop.

## Implementation Slices by Value
1. Curated problem/solution schema and paper-first guided flow for Waves/Particles.
2. Checkpoint hints, attempt history, and mastery/readiness panel.
3. Variants and oral-defense cards.
4. Circuits sketchpad and curated pre-Thévenin module.
5. Wave visualizer, then optional PDF ingestion tooling.

## Acceptance Checks
- A curated problem cannot mark “correct” without matching its checkpoints.
- Hints are progressive and never precede an attempt.
- Each completed problem records mastery evidence.
- The selected next problem reflects deadline and weak prerequisite skills.
- Core flow works with keyboard and a narrow mobile layout.

## Open Risks
Curating solutions is the critical content cost. Variant validity needs subject-matter review. Deadline pressure means the first slice must aid study immediately, even if later automation is deferred.
