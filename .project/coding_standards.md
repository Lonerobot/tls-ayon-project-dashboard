# AYON Add-on Coding Standards

This document defines the engineering standards for AI-assisted development of AYON add-ons.

These standards apply unless the project-specific requirements explicitly override them.

The AI should treat the official AYON repositories and documentation listed in `references.md` as the authoritative source for AYON-specific implementation details.

---

# 1. Core Principle

Follow existing AYON conventions wherever possible.

Do not invent an architecture when an equivalent pattern already exists in an official AYON repository.

Before implementing a significant feature:

1. Search the referenced AYON repositories.
2. Identify the closest existing implementation.
3. Follow its structure and conventions.
4. Only introduce a new pattern when an existing pattern is unsuitable.
5. Document the reason for introducing a new pattern.

The goal is to produce an addon that looks and behaves as though it was developed as part of the AYON codebase itself.

---

# 2. Frontend Standards

## AYON React Components Are Mandatory

All frontend UI should use the official AYON React component library wherever an appropriate component exists.

Repository:

https://github.com/ynput/ayon-react-components

Documentation:

https://docs.ayon.dev/docs/dev_components_react/

Do not create custom versions of existing AYON components.

For example, if the AYON component library provides an appropriate:

- Button
- Input
- Select
- Dialog
- Table
- Card
- Panel
- Form
- Icon
- Layout component

use the AYON component rather than implementing an equivalent component from scratch.

This is required for:

- visual consistency
- accessibility
- dark/light theme compatibility
- future AYON compatibility
- reduced maintenance

Custom CSS should only be introduced where the AYON component library does not provide a suitable solution.

---

# 3. React Architecture

Use React functional components.

Prefer TypeScript where supported by the template.

Use hooks for reusable behaviour.

Keep components small and focused.

Separate:

```text
UI
API access
state
business logic
```

Do not place API requests throughout presentation components.

Prefer a structure such as:

```text
frontend/
    src/
        components/
        hooks/
        api/
        models/
        pages/
        dev/
        integration/
```

The exact structure should follow the selected AYON template where it differs.

---

# 4. Development and Production Integration

The frontend should support the development architecture provided by the AYON addon template.

Development components should be runnable independently using the addon development environment.

Production integration should use the AYON integration mechanisms provided by the template.

Do not couple the core UI components directly to AYON routing or integration-specific context.

Prefer:

```text
Dev Entry Point
       │
       ▼
Reusable Component
       ▲
       │
AYON Integration Entry Point
```

This allows the frontend to be developed using Vite without requiring the complete AYON frontend to be running.

---

# 5. Backend / Python

Use modern Python supported by the current AYON server environment.

Use type hints throughout the codebase.

Prefer explicit types over `Any`.

Use Pydantic models for structured data.

Use AYON's existing settings and server abstractions rather than implementing parallel configuration systems.

Prefer:

```python
class MySettings(BaseSettingsModel):
    ...
```

over untyped dictionaries.

Keep server-side business logic separate from HTTP endpoint definitions.

---

# 6. Settings

Settings should be represented by Pydantic models.

Group related settings into logical models.

Avoid creating a large flat settings model.

Prefer:

```text
AddonSettings
    ├── GeneralSettings
    ├── AnnouncementSettings
    ├── LinkSettings
    └── IntegrationSettings
```

where appropriate.

Settings should have:

- meaningful names
- descriptions
- sensible defaults
- appropriate validation
- appropriate titles for the AYON settings UI

Studio and project settings should be used according to the intended AYON settings hierarchy.

Do not duplicate studio/project resolution logic in the frontend.

The server should resolve the appropriate configuration and expose the resulting data through an API.

---

# 7. API Design

The frontend should communicate with the server through well-defined API endpoints.

Do not allow React components to directly manipulate server internals.

API endpoints should:

- have clear names
- use appropriate HTTP methods
- validate input
- return structured responses
- provide useful error responses
- avoid leaking implementation details

Use Pydantic models for request and response structures where appropriate.

Prefer explicit response models over arbitrary dictionaries.

---

# 8. Error Handling

Errors should be handled deliberately.

Backend errors should:

- be logged appropriately
- return useful HTTP status codes
- provide useful but safe error information

Frontend errors should:

- present a useful message to the user
- avoid exposing raw stack traces
- handle loading states
- handle empty states
- handle unavailable services

A failed optional integration should not unnecessarily prevent the entire dashboard from loading.

---

# 9. Logging

Use the project's logging facilities.

Do not use `print()` for application logging.

Log useful diagnostic information without logging:

- passwords
- API tokens
- credentials
- private user information
- unnecessary large payloads

Development diagnostics should not accidentally become production noise.

---

# 10. Configuration and Secrets

Never hard-code credentials, API tokens or passwords.

Never commit secrets to the repository.

Configuration should use the mechanisms provided by AYON or the relevant integration.

External integrations should fail gracefully when they are not configured.

---

# 11. Dependencies

Do not introduce a dependency unless there is a clear reason.

Before adding a new dependency:

1. Check whether Python or JavaScript already provides the required functionality.
2. Check whether AYON already provides the functionality.
3. Check whether an existing project dependency can provide it.
4. Only then add a new dependency.

Avoid unnecessary frameworks.

The addon should remain lightweight.

---

# 12. Testing

Add tests for meaningful backend functionality.

Prioritise testing:

- settings validation
- API endpoints
- business logic
- data transformations
- integration behaviour

Frontend testing should focus on meaningful component behaviour rather than testing implementation details.

Do not create large quantities of low-value tests purely to increase coverage statistics.

---

# 13. Documentation Is Part of the Implementation

Documentation is a required part of the development plan.

A feature is not considered complete until its relevant documentation has been updated.

For every significant feature, consider whether the following need updating:

```text
README.md

Architecture documentation

API documentation

Settings documentation

Developer documentation

User documentation

Configuration examples

Changelog
```

Documentation should be created or updated during implementation, not left as a final optional task.

---

# 14. AI Development Workflow

The AI should work in the following order.

## Step 1: Understand

Read:

```text
references.md
coding_standards.md
addon_description.md
addon_properties.md
```

Then inspect the relevant official AYON repositories.

---

## Step 2: Plan

Before writing code, produce an implementation plan.

The plan should identify:

- files to create
- files to modify
- frontend components
- backend components
- settings models
- API endpoints
- AYON integration points
- dependencies
- tests
- documentation changes

Do not begin implementation until the architecture is understood.

---

## Step 3: Identify Existing Patterns

Search the referenced repositories for similar functionality.

Prefer an existing AYON pattern over a new implementation.

Record important deviations from existing patterns in the implementation documentation.

---

## Step 4: Implement

Implement the smallest coherent version of the feature.

Avoid speculative functionality.

Do not implement future requirements unless explicitly requested.

Keep the code modular so future functionality can be added without restructuring the addon.

---

## Step 5: Validate

Check:

- Python syntax
- TypeScript compilation
- frontend build
- linting
- tests
- settings validation
- API behaviour
- AYON integration
- development mode
- production packaging

Fix errors rather than working around them with suppressions.

---

## Step 6: Document

Update the relevant documentation before considering the task complete.

Document:

- what was implemented
- how it works
- configuration requirements
- development workflow
- deployment requirements
- API changes
- user-facing behaviour

---

# 15. Code Quality

Prefer simple, readable code over clever abstractions.

Avoid premature abstraction.

Avoid deeply nested logic.

Prefer early returns where they improve readability.

Use descriptive names.

Do not create generic utility functions unless they have a clear reuse case.

Do not duplicate substantial logic.

When duplication exists, determine whether it is genuinely shared behaviour before abstracting it.

---

# 16. Compatibility

The addon should target the AYON version and API specified by the project.

Do not assume undocumented AYON internals are stable.

Prefer public APIs and documented extension points.

When an undocumented API is unavoidable:

1. Clearly identify it.
2. Explain why it is required.
3. Isolate its usage.
4. Document the compatibility risk.

---

# 17. UI / UX Standards

The frontend should feel native to AYON.

Follow existing AYON patterns for:

- navigation
- page layout
- spacing
- typography
- controls
- dialogs
- notifications
- loading states
- error states
- empty states

Use the AYON React component library wherever possible.

Do not introduce a competing visual language.

Avoid unnecessary animation.

Avoid excessive decoration.

Prioritise information hierarchy and usability.

The UI should work correctly in both AYON light and dark themes.

---

# 18. Accessibility

Use accessible controls and semantic HTML where appropriate.

Do not rely solely on colour to communicate state.

Interactive elements should have meaningful labels.

Keyboard navigation should work for standard controls.

Prefer the accessibility behaviour already provided by AYON React Components.

---

# 19. Performance

Avoid unnecessary API requests.

Avoid unnecessary React renders.

Use caching where appropriate.

Do not load large datasets when only a summary is required.

For dashboards, prefer:

```text
one aggregated API request
```

over:

```text
many independent requests
```

where practical.

Optional integrations should not block the initial UI unnecessarily.

---

# 20. Security

Treat all server responses and user input as untrusted data.

Validate API inputs.

Do not expose credentials through frontend code.

Never embed server secrets into Vite environment variables that are shipped to the browser.

Remember:

> Anything available to React is available to the user.

Server-side permissions and security checks must therefore remain server-side.

---

# 21. Git

Make focused commits.

Avoid committing:

- build artefacts
- local environment files
- secrets
- generated caches
- IDE-specific files unless required

Commit source code and required configuration.

Keep dependency lock files consistent with the package manager used by the repository.

---

# 22. Definition of Done

A feature is complete when:

- implementation is complete
- existing AYON patterns have been followed
- AYON React Components are used where applicable
- settings are correctly modelled
- API behaviour is implemented
- frontend behaviour is implemented
- development mode works
- production integration works
- tests are appropriate
- errors are handled
- documentation is updated
- build/package succeeds

"Works on my machine" is not a completion criterion. Humanity has suffered enough from that sentence.