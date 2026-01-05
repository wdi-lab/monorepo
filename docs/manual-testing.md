# Manual Browser Testing with Playwright MCP

## Overview

This guide covers how to use Playwright MCP tools for manual browser testing in development. This approach allows interactive browser testing without writing automated test scripts.

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

### Backend Services (SST)

Start any backend service (auth, main-api, etc.) in local dev mode using `nohup` to run in the background:

```bash
cd services/<service-name>
nohup aws-vault exec <aws-profile> -- pnpm dev --stage <stage> > dev.log 2>&1 &
```

**If AWS credentials are not required**, omit the aws-vault part:

```bash
cd services/<service-name>
nohup pnpm dev --stage <stage> > dev.log 2>&1 &
```

**Check if running:**

```bash
ps aux | grep "sst dev" | grep <service-name>
```

**View logs in real-time:**

```bash
tail -f services/<service-name>/dev.log
```

**Stop viewing logs:** Press `Ctrl+C` (this only stops viewing, not the service)

### Frontend/SSR Apps (TanStack Start)

Start any frontend app (main-ui, etc.) in local dev mode using `nohup` to run in the background:

```bash
cd services/<service-name>/app
nohup aws-vault exec <aws-profile> -- pnpm dev --stage <stage> > dev.log 2>&1 &
```

**If AWS credentials are not required**, omit the aws-vault part:

```bash
cd services/<service-name>/app
nohup pnpm dev --stage <stage> > dev.log 2>&1 &
```

**Check if running:**

```bash
ps aux | grep "vite dev"
```

**View logs in real-time:**

```bash
tail -f services/<service-name>/app/dev.log
```

**Stop viewing logs:** Press `Ctrl+C` (this only stops viewing, not the service)

**Access the app:** Frontend apps typically run on http://localhost:3000/

**Important Notes:**

- Replace `<service-name>`, `<aws-profile>`, and `<stage>` with actual values
- The `nohup` command allows services to continue running after closing the terminal
- All output (stdout and stderr) is redirected to `dev.log` in the working directory
- The `&` at the end runs the process in the background

### Stopping and Restarting Services

**Find running services:**

```bash
# Find backend services
ps aux | grep "sst dev" | grep -v grep

# Find frontend apps
ps aux | grep "vite dev" | grep -v grep
```

**Stop a specific service:**

```bash
# Find the process ID (PID) from the ps output, then:
kill <PID>

# Or force kill if needed:
kill -9 <PID>
```

**Restart a service:** Stop it using the command above, then start it again using the appropriate start command.

**Stop all SST services:**

```bash
pkill -f "sst dev"
```

**Stop all Vite dev servers:**

```bash
pkill -f "vite dev"
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
