# Project instructions

Before creating or materially changing any custom Shopify section in this repository, read and follow `docs/SHOPIFY_SECTION_STANDARDS.md` in full.

Mandatory defaults for new sections:

- Add the section to the Theme Editor section list through its schema preset.
- Do not add it to any template, section group, or existing page unless the user explicitly requests that placement.
- When Figma nodes are provided, inspect every supplied desktop/mobile node and every explicitly excluded node before implementation.
- Keep CSS and JavaScript scoped to the section and safe for multiple instances.
- Every section must expose separate desktop and mobile top/bottom spacing settings, implemented as section-scoped CSS variables.
- Use responsive Shopify images, preserve mobile-to-desktop fallback, and do not duplicate elements already baked into a composite image.
- Use blocks for repeatable content without an artificial count limit unless the user explicitly requests one.
- Run schema/reference validation, JavaScript syntax checks when applicable, Theme Check for the changed section, whitespace checks, and visual checks at the supplied design widths.

Explicit user instructions override the project standard for that task. When a decision permanently changes the standard, update `docs/SHOPIFY_SECTION_STANDARDS.md` as part of the same change.
