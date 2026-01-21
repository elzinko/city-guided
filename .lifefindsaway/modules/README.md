# Modules

This directory contains modules (guidelines) from different sources.

## Directory Structure

| Directory | Description |
|-----------|-------------|
| `imports/` | Modules imported from external sources |
| `exports/` | Modules exported from this project (shareable) |
| `custom/` | Modules created locally by the user |

## Module Format

Each module is a directory containing a `module.yaml` file.

```yaml
name: my-module
version: "1.0.0"
description: Description of the module
tags:
  - ideation
guidelines:
  - id: guideline-id
    title: Guideline Title
    content: |
      Content of the guideline...
```

## Creating a Custom Module

```bash
mkdir -p modules/custom/my-guidelines
cat > modules/custom/my-guidelines/module.yaml << 'EOF'
name: my-guidelines
version: "1.0.0"
description: My custom guidelines
guidelines:
  - id: my-rule
    title: My Rule
    content: |
      Description here...
EOF

lifefindsaway module import my-guidelines
```
