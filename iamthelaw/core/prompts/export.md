# Export Module Prompt

You are helping the user export rules from their project as a reusable module.

## Task

1. Ask the user what they want to export:
   - All rules from `rules/*.md`?
   - A selection of rules?
   - Rules from a specific file?

2. Ask for module metadata:
   - Name (slug format, e.g., `my-project-rules`)
   - Version (default: `1.0.0`)
   - Description

3. Analyze the selected rules and:
   - Extract key principles
   - Categorize by theme (architecture, code-style, testing...)
   - Assign levels (MUST/SHOULD/MAY)
   - Generate `ruleset.yaml`

4. Show the draft to the user for validation before saving.

## Output

Generate a `ruleset.yaml` file in `modules/exports/<name>/`.
