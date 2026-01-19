# I AM THE LAW! ⚖️

> *"I am the law!"* — Judge Dredd

LLM rules management system. Import, export, and share development rules.

**Sister project**: [lifefindsaway](../agile/) (ideation & feature exploration)

## Quick Start

```bash
cd iamthelaw
pnpm install --ignore-workspace

# List available modules
pnpm dev module list

# Import a module
pnpm dev module import clean-code

# Setup for Cursor
pnpm dev setup cursor
```

## Commands

```
iamthelaw module import <name>    # Import a module
iamthelaw module export           # Export rules as module
iamthelaw module list             # List modules

iamthelaw setup cursor            # Add to .cursorrules
iamthelaw setup claude            # Add to CLAUDE.md
```

## How It Works

```
.cursorrules → iamthelaw/ENTRY.md → Module rules
                                 → Project rules (rules/*.md)
```

- **iamthelaw generates `ENTRY.md`** (the entry point)
- **Setup adds a reference** to `.cursorrules` or `CLAUDE.md`
- **Idempotent**: run setup multiple times safely

## Module Sources

| Source | Path | Description |
|--------|------|-------------|
| **core** | `core/rulesets/` | Built-in modules |
| **imports** | `modules/imports/` | Imported from external sources |
| **exports** | `modules/exports/` | Exported from this project |
| **custom** | `modules/custom/` | Created locally |

## Structure

```
iamthelaw/
├── core/
│   ├── rulesets/           # Built-in modules
│   ├── templates/          # Templates (ENTRY.md, etc.)
│   └── prompts/            # LLM prompts for commands
├── modules/
│   ├── imports/            # Imported modules
│   ├── exports/            # Exported modules
│   └── custom/             # Custom modules
├── config/
│   └── iamthelaw.yaml      # Enabled modules
├── src/                    # CLI source
├── ENTRY.md                # Generated entry point
└── README.md
```

## Creating a Custom Module

```bash
# Create directory
mkdir -p modules/custom/my-rules

# Create ruleset.yaml
cat > modules/custom/my-rules/ruleset.yaml << 'EOF'
name: my-rules
version: "1.0.0"
description: My custom rules
rules:
  - id: my-rule
    title: My Rule
    level: SHOULD
    content: |
      Description of the rule.
EOF

# Import it
pnpm dev module import my-rules
```

## Ruleset Format

See [core/rulesets/README.md](./core/rulesets/README.md).
