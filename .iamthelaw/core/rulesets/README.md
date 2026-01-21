# Rulesets

Rulesets are reusable collections of rules for LLM assistants.

## Directory Structure

```
rulesets/
  clean-code/
    ruleset.yaml
  hexagonal/
    ruleset.yaml
```

## Ruleset Format

```yaml
name: clean-code
version: "1.0.0"
description: Clean Code principles
tags: [code-quality]

rules:
  - id: meaningful-names
    title: Use Meaningful Names
    level: MUST    # MUST | SHOULD | MAY
    content: |
      Variables MUST have intention-revealing names.
```

## Rule Levels

| Level | Meaning |
|-------|---------|
| **MUST** | Non-negotiable requirement |
| **SHOULD** | Recommended, exceptions must be justified |
| **MAY** | Optional, use when beneficial |

## Creating a Ruleset

1. Create directory: `rulesets/<name>/`
2. Create `ruleset.yaml` with metadata and rules
3. Install with: `iamthelaw install <name>`
4. Generate with: `iamthelaw generate`
