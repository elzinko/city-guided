# Agile Tooling - TODO

## In Progress

- [ ] Initial tooling implementation (Cursor target only)

## Backlog

### Targets

- [ ] Add Claude Code target (`claude`)
- [ ] Add Windsurf target (`windsurf`)
- [ ] Add generic LLM target for other tools

### Modules System

- [ ] Define module format specification
- [ ] Create example module: `typescript-2026-best-practices`
- [ ] Module discovery and loading mechanism
- [ ] Module versioning support
- [ ] Module dependency management

### Features

- [ ] `agile init` command to bootstrap agile/ in a new project
- [ ] `agile validate` command to check agile/ structure integrity
- [ ] `agile sync` command to regenerate all targets
- [ ] Interactive mode with prompts for configuration

### Documentation

- [ ] Add examples of generated files
- [ ] Document module authoring guide

### Quality

- [ ] Add unit tests for generators
- [ ] Add integration tests
- [ ] CI/CD pipeline for tooling

## Ideas (Not Committed)

- MCP server integration for live assistance
- VS Code extension wrapper
- Template customization per project

## Done

- [x] Architecture design
- [x] Project structure definition
