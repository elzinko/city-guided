# 🎮 Infrastructure Control CLI

Quick and easy commands to manage your ECS service and scale-to-zero Lambda.

## Quick Start

```bash
# Interactive mode (recommended for multiple operations)
pnpm infra:ctl

# Check current status
pnpm infra:status        # Quick status view

# Direct commands
pnpm infra:start         # Start service
pnpm infra:stop          # Scale-to-zero mode
pnpm infra:off           # Complete shutdown
```

## Commands

### 📊 Status
```bash
pnpm infra:status        # Quick status check
# or
pnpm infra:ctl status    # Same as above
```
Shows:
- ECS service desired/running count
- Lambda enabled/disabled status
- Current mode (ON/STANDBY/OFF)

**Note**: This replaces the old `status` command with the new unified CLI.

### 🟢 Start (ON)
```bash
pnpm infra:start  # or: pnpm infra:on
```
- Scales ECS service to 1
- Enables scale-to-zero Lambda
- Service starts in ~30-60 seconds

### 🟡 Stop (STANDBY)
```bash
pnpm infra:stop
```
- Scales ECS service to 0
- Keeps scale-to-zero Lambda enabled
- **Auto-wakes on first request** (perfect for testing!)
- Lambda detects requests and starts service automatically
- **Shows page 503 STANDBY**: "Service en cours de réveil" avec auto-refresh

### 🔴 Off (COMPLETELY OFF)
```bash
pnpm infra:off
```
- Scales ECS service to 0
- **Disables scale-to-zero Lambda**
- Service stays off until you run `start` or `stop`
- **Shows page 503 OFF**: "Service temporairement arrêté" sans auto-refresh
- **Perfect for testing 503 page** without auto-wake!

### 📜 Logs
```bash
pnpm infra:ctl logs api     # API logs
pnpm infra:ctl logs web     # Frontend logs
pnpm infra:ctl logs api 100 # Last 100 lines
```

### 🎮 Interactive Mode
```bash
pnpm infra:ctl
```
Opens an interactive menu with all options. Press **Ctrl+C** to exit gracefully.

## Modes Explained

| Mode | ECS Scale | Lambda | Page 503 | Behavior |
|------|-----------|--------|----------|----------|
| 🟢 **ON** | 1 | ✅ Enabled | - | Service running normally |
| 🟡 **STANDBY** | 0 | ✅ Enabled | 🌙 "En cours de réveil" (auto-refresh) | Auto-wakes on request (~60s delay) |
| 🔴 **OFF** | 0 | ❌ Disabled | 🛑 "Temporairement arrêté" (no refresh) | Completely stopped, no auto-wake |

## Use Cases

### Testing Scale-to-Zero
```bash
pnpm infra:stop              # Enable scale-to-zero
# Access site → Lambda detects → Service starts
```

### Testing 503 Pages

**STANDBY mode (with auto-wake):**
```bash
pnpm infra:stop
# Access site → Shows "Service en cours de réveil" (auto-refresh every 5s)
# → Lambda detects request → Service starts automatically
```

**OFF mode (no auto-wake):**
```bash
pnpm infra:off
# Access site → Shows "Service temporairement arrêté" (no auto-refresh)
# → No auto-wake, service stays OFF
curl https://cityguided.duckdns.org/  # Test OFF page
```

### Normal Development
```bash
pnpm infra:start             # Keep service running
```

### Save Costs
```bash
pnpm infra:stop              # Auto-wake when needed
# or
pnpm infra:off               # Complete shutdown
```

## Environment Variables

Currently hardcoded to `staging` environment. To change:
```typescript
// In scripts/ctl.ts
const env: EnvironmentName = 'staging'; // Change this
```

## Technical Details

### 503 Pages System

The CLI automatically updates Caddy to serve the appropriate 503 page:

**Files:**
- `error-503-standby.html` - For STANDBY mode (🌙 with auto-refresh)
- `error-503-off.html` - For OFF mode (🛑 without auto-refresh)

**Workflow:**
1. User runs `pnpm infra:stop` or `pnpm infra:off`
2. CLI scales ECS and enables/disables Lambda
3. CLI calls `update-caddy.ts --mode=standby|off`
4. Script uploads the appropriate HTML file to `/var/www/caddy/error-503.html`
5. Caddy serves this file when ALB returns 502/503/504

**Why different pages?**
- STANDBY: User expects auto-wake, so page refreshes to detect service start
- OFF: No auto-wake, so no refresh (avoids unnecessary requests)

### Lambda Control
- **Enabled**: Lambda monitors ALB and starts service on request
- **Disabled**: Sets Lambda concurrency to 0 (prevents execution)

### Safe Operations
- All operations are idempotent (safe to run multiple times)
- Service scale changes are graceful
- Lambda disable/enable is instant

## Troubleshooting

### "Lambda not found"
- Make sure CloudFormation stack is deployed
- Check that `ScaleUpLambdaArn` output exists

### "Service not found"
- Verify ECS cluster `city-guided-cluster` exists
- Check service name `city-guided-service`

### "Permission denied"
- Ensure AWS credentials are configured
- Need IAM permissions for ECS, Lambda, CloudFormation

## Related Commands

```bash
pnpm infra:status            # Old status command (still works)
pnpm infra:logs:api          # API logs (alternative)
pnpm infra:logs:web          # Web logs (alternative)
pnpm infra:update:caddy      # Update Caddy config
```

## Examples

```bash
# Morning: Start work
pnpm infra:start

# Testing 503 page design
pnpm infra:off
open https://cityguided.duckdns.org/

# Testing scale-to-zero behavior
pnpm infra:stop
# Wait 1 min for service to stop
open https://cityguided.duckdns.org/
# Watch it auto-start!

# Evening: Save costs
pnpm infra:stop  # or: pnpm infra:off

# Check what's happening
pnpm infra:ctl status
```

Enjoy! 🚀
