# DGM-Cockpit-Frontend — Observational Headquarters UI

## Purpose
Render the actual state and events emitted by the DGM-MAT brain as a clear visual cockpit/Headquarters.

## Non-negotiable authority boundary
This repository is presentation only. It must never become the brain, orchestrator, policy engine, approval authority or source of truth. The DGM-MAT runtime acts independently of this UI; the UI can be disconnected without stopping the brain.

Characters, rooms, labs, research activity, archive/warehouse activity and animations must be projections of verified runtime events and status. Never invent activity merely to make the office look busy.

## Allowed contents
Frontend components, visual states, event-to-view mapping, accessibility, layout, animation tied to real state and UI tests.

## Must remain in DGM-MAT core
Reasoning, task execution, agent lifecycle, permissions, memory, provider selection and all privileged operations.

## Safety and validation
Treat UI inputs as untrusted requests. The core revalidates every request and permission. Test stale/offline state, unknown events, authorization failures, accessibility and that UI failure does not stop core execution.
