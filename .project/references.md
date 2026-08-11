# AYON Server Add-on Development References

This document provides the primary reference material for AI-assisted development of AYON server add-ons. The AI should use these repositories and documentation as the authoritative source for project structure, naming conventions and implementation patterns before generating new code.

---

# Primary References

## AYON Add-on Full Template

Repository

https://github.com/ynput/ayon-addon-full-template

Purpose

This is the preferred starting point for all new server add-ons.

Contains:

- Complete server addon structure
- React/Vite frontend
- Development mode entry points
- Integration examples
- Packaging
- Build pipeline
- Home page integration
- Project page integration
- Header button integration

Use this repository as the architectural baseline for the project.

---

## AYON Add-on Template

Repository

https://github.com/ynput/ayon-addon-template

Purpose

Minimal server addon.

Useful for understanding:

- registration
- package layout
- settings models
- addon lifecycle

Prefer this repository when looking for the simplest implementation possible.

---

## AYON Example Add-on

Repository

https://github.com/ynput/ayon-example-addon

Purpose

Reference implementation demonstrating real-world server addon features.

Useful examples include:

- settings
- REST endpoints
- services
- event handlers
- packaging
- frontend integration

Consult when implementing functionality beyond the minimal template.

---

## AYON React Components

Repository

https://github.com/ynput/ayon-react-components

Purpose

Official component library.

All frontend UI should use these components wherever possible rather than creating custom controls.

Provides:

- layout
- buttons
- tables
- cards
- forms
- icons
- dialogs
- project UI consistency

---

## AYON Frontend

Repository

https://github.com/ynput/ayon-frontend

Purpose

Reference implementation for:

- routing
- navigation
- page layouts
- API usage
- project context
- React patterns

Consult to follow existing AYON conventions.

---

# Official Documentation

## Add-on Development

https://docs.ayon.dev/docs/dev_addon_creation/

Read completely.

Primary reference for:

- addon lifecycle
- settings
- registration
- frontend
- packaging

---

## Full Template Integration Modes

https://github.com/ynput/ayon-addon-full-template#ayon-integration-modes

Important.

Explains the different frontend integration targets:

- Home page
- Project page
- Header button

This project should select only the required integration modes.

---

## Development Mode

https://docs.ayon.dev/docs/dev_dev_mode/

Reference for client development.

Understand the distinction between client development and server addon frontend development.

---

## Server Documentation

https://docs.ayon.dev/docs/server_introduction/

General server architecture.

Useful for understanding server lifecycle and addon loading.

---

## React Components Documentation

https://docs.ayon.dev/docs/dev_components_react/

Reference for all frontend UI.

Prefer existing components over custom implementations.

---

# AI Development Guidelines

When generating code:

- Follow the structure used in the Full Template.
- Prefer official AYON React Components.
- Follow naming conventions used by AYON.
- Avoid introducing additional frameworks.
- Separate business logic from presentation.
- Keep Python responsible for data and React responsible for rendering.
- Expose functionality via REST endpoints rather than allowing the frontend to manipulate server settings directly.
- Keep development entry points separate from production integration entry points.
- Do not invent architecture when an official implementation exists.

---

# Additional References

Additional repositories relevant to the current project should be added below as required.

Example

## Deadline API

Repository

<repository>

Purpose

Provide Deadline integration.

Notes

Read only where required.