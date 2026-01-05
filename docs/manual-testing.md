# Manual Browser Testing with Playwright MCP

## Overview

This guide covers how to use Playwright MCP tools for manual browser testing in development. This approach allows interactive browser testing without writing automated test scripts.

> **Note**: For detailed instructions on running local development services, see [Local Development Guide](local-dev.md).

## When to Use Manual Browser Testing

- **Feature Verification**: Manually verify new features work as expected
- **Debugging**: Investigate issues in the UI flow
- **Exploratory Testing**: Test edge cases and user flows interactively
- **Integration Testing**: Verify end-to-end flows across services
- **Cookie/Storage Verification**: Inspect cookies, localStorage, and sessionStorage

## Prerequisites for AI Agents

Before starting any service or app in local dev mode:

1. **Ask the user for required information:**
   - Which stage to use (e.g., `dev`, `test`, `preview`)
   - How to obtain AWS credentials (e.g., aws-vault profile name, or if credentials are already configured)
   - Confirm which services need to be started

2. **Check if services are already running:**

   ```bash
   # Check backend services
   ps aux | grep "sst dev" | grep -v grep

   # Check frontend apps
   ps aux | grep "vite dev" | grep -v grep
   ```

3. **If services are already running, ask the user if they should be restarted or left as is**

## Starting Local Development Services and Apps

> **For detailed instructions on starting and managing local dev services, see [Local Development Guide](local-dev.md).**

Quick reference:

**Backend Services (SST):**

```bash
cd services/<service-name>
nohup aws-vault exec <aws-profile> -- pnpm dev --stage <stage> > dev.log 2>&1 &
```

**Frontend Apps (TanStack Start):**

```bash
cd services/<service-name>/app
nohup aws-vault exec <aws-profile> -- pnpm dev --stage <stage> > dev.log 2>&1 &
```

**Check if running:**

```bash
ps aux | grep "sst dev" | grep -v grep  # Backend
ps aux | grep "vite dev" | grep -v grep  # Frontend
```

**View logs:**

```bash
tail -f services/<service-name>/dev.log
# or
tail -f services/<service-name>/app/dev.log
```

## Testing Workflow for AI Agents

### Before Starting Manual Testing:

1. **Verify prerequisites:**
   - [ ] Know which stage to use for running locally
   - [ ] Know how to obtain AWS credentials (if needed)
   - [ ] Know which services need to be running

2. **Check and start services:**
   - [ ] Check if required backend services are running (`ps aux | grep "sst dev"`)
   - [ ] Check if frontend app is running (`ps aux | grep "vite dev"`)
   - [ ] Start any missing services using the commands above
   - [ ] Wait for services to be ready (check logs with `tail -f`)

3. **Verify access:**
   - [ ] Confirm the application URL (typically http://localhost:3000/)
   - [ ] Can access the application in browser

### During Testing:

- Use Playwright MCP tools to interact with the browser
- Take screenshots of important states or issues
- Monitor service logs for errors: `tail -f services/<service-name>/dev.log`
- If a service crashes, check logs and restart if needed

### After Testing Session:

1. **Document findings:**
   - [ ] Document any bugs found (include steps to reproduce)
   - [ ] Document any unexpected behavior
   - [ ] Save screenshots if issues found
   - [ ] Check service logs for errors

2. **Cleanup (optional):**
   - [ ] Ask user if services should be stopped or left running
   - [ ] If stopping, use `kill <PID>` or `pkill` commands above

## Common Issues and Troubleshooting

### Service won't start

- Check if port is already in use
- Check logs for specific error messages
- Verify AWS credentials are valid
- Ensure correct stage name is used

### Service crashes

- Check `dev.log` for error messages
- Verify all dependencies are installed (`pnpm install`)
- Check if AWS resources exist for the specified stage

### Can't access application

- Verify the correct URL and port
- Check if service is actually running
- Check firewall or network settings
- Look for port conflicts in logs
