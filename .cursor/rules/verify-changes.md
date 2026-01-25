# Verify Changes Rule

After making code changes to TypeScript files, always verify the changes compile and pass tests.

## Verification Commands

### Single Workspace Changes

When changes only affect files within a single workspace (e.g., only `mods/agents/`), use workspace-targeted commands:

- **Typecheck**: `npm run typecheck -w @outlast/<workspace>`
- **Build**: `npm run build -w @outlast/<workspace>`
- **Test**: `npm run test -w @outlast/<workspace>`

### Multi-Workspace or Root Changes

When changes affect multiple workspaces or root configuration files, run commands at the root level:

- **Typecheck**: `npm run typecheck`
- **Build**: `npm run build`
- **Test**: `npm run test`

## Workspace Mapping

- `mods/agents/` -> `@outlast/agents`
- `mods/apiserver/` -> `@outlast/apiserver`
- `mods/common/` -> `@outlast/common`
- `mods/ctl/` -> `@outlast/ctl`

## Order of Operations

1. Run `typecheck` first (fastest feedback)
2. Run `build` if typecheck passes
3. Run `test` if build passes

## When to Skip

- Skip verification for documentation-only changes (README, comments)
- Skip verification for configuration files that don't affect TypeScript compilation
