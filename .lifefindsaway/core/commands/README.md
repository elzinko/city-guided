# Commands Design

This document explains the design philosophy of lifefindsaway commands.

## Modularity Principle

Each command file is **self-contained** and includes:

1. **Agent instructions** : How the AI should behave
2. **Context** : What to read and understand
3. **Process** : Step-by-step workflow
4. **Templates** : The actual templates embedded in the command

## Why Embedded Templates?

### Before (separate files)
```
core/
├── commands/cursor/
│   └── explore-feature.md    # References template
└── templates/
    └── feature.md             # Template stored separately
```

**Problems:**
- Command depends on external file
- Template can be modified independently
- Agent needs to read two files
- Less portable

### After (embedded)
```
core/
└── commands/cursor/
    └── explore-feature.md    # Contains both agent + template
```

**Benefits:**
- ✅ Single source of truth
- ✅ Self-contained and portable
- ✅ Template always in sync with agent
- ✅ Easier to maintain
- ✅ Can still keep templates/ for direct use

## Command Structure

Each command follows this structure:

```markdown
# Command Name

[Agent role and description]

## Contexte
[What to read/understand]

## Ta mission
[Agent goals]

## Process
[Step-by-step workflow]

## Structure à créer
[File/folder structure]

## Conventions
[Naming and formatting rules]

---

## Template [Name]

[Embedded template in markdown code block]
```

## Available Commands

### Cursor Commands

Located in `.lifefindsaway/core/commands/cursor/`:

- **brainstorm.md** : Ideation and exploration
- **create-epic.md** : Create Epic + Features (includes epic.md + feature.md templates)
- **explore-feature.md** : Explore a single Feature (includes feature.md template)
- **report-bug.md** : Document a bug (includes bug.md template)
- **review-planning.md** : Review and update planning

### Installation

Commands are automatically installed when running:

```bash
lifefindsaway setup cursor
```

This copies all `.md` files from `core/commands/cursor/` to `.cursor/commands/`.

## Creating New Commands

### Template

```markdown
# Your Command Name

Tu es un **[Role]** qui aide à [objective].

## Contexte
- Lire [lifefindsaway/ENTRY.md](../../../ENTRY.md)
- [Other context]

## Ta mission
1. **[Step 1]** : [Description]
2. **[Step 2]** : [Description]

## Process

### Étape 1 - [Name]
[Description]

### Étape 2 - [Name]
[Description]

## Structure à créer
\`\`\`
[File structure]
\`\`\`

## Conventions
- [Rule 1]
- [Rule 2]

---

## Template [Name]

\`\`\`markdown
[Your template here]
\`\`\`
```

### Checklist

- [ ] Agent role is clear
- [ ] Context references are correct
- [ ] Process is step-by-step
- [ ] Template is embedded
- [ ] Examples are provided
- [ ] Conventions are documented
- [ ] File structure is shown

## Best Practices

1. **Be specific** : Clear instructions for the AI
2. **Show examples** : Include sample slugs, timestamps
3. **Embed templates** : Keep everything in one file
4. **Reference context** : Link to ENTRY.md, README.md
5. **Define conventions** : Naming, formatting, structure
6. **Test thoroughly** : Ensure the command works as expected

## Future Improvements

- [ ] Add validation rules in commands
- [ ] Create command generator tool
- [ ] Add command testing framework
- [ ] Support for parameterized commands
- [ ] Multi-language support
