# Local Development Guide

## Overview

This guide covers how to run services locally for development and testing.

## Prerequisites

Before starting any service:

1. **Required information:**
   - Stage name to use (e.g., `dev`, `test`, `preview`)
   - AWS credentials method (e.g., aws-vault profile name, or if credentials are already configured)
   - Which services need to be started (backend, frontend, or both)

2. **Check if services are already running:**

   ```bash
   # Check backend services
   ps aux | grep "sst dev" | grep -v grep

   # Check frontend apps
   ps aux | grep "vite dev" | grep -v grep
   ```

3. **If services are already running, decide if they should be restarted or left as is**

## Starting Services

### Backend Services (SST)

**Important:** SST dev runs in **interactive mode** and streams Lambda logs to your terminal in real-time. This is the recommended way to run and debug backend services.

Start backend services (auth, main-api, etc.) in local dev mode:

**With AWS credentials:**

```bash
cd services/<service-name>
nohup aws-vault exec <aws-profile> -- pnpm dev --stage <stage> > dev.log 2>&1 &
```

**Without AWS credentials:**

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

**Stop viewing logs:** Press `Ctrl+C` (only stops viewing, not the service)

### Frontend Apps (TanStack Start)

Start frontend apps (main-ui, etc.) in local dev mode:

**With AWS credentials:**

```bash
cd services/<service-name>/app
nohup aws-vault exec <aws-profile> -- pnpm dev --stage <stage> > dev.log 2>&1 &
```

**Without AWS credentials:**

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

**Stop viewing logs:** Press `Ctrl+C` (only stops viewing, not the service)

**Access the app:** Frontend apps typically run on http://localhost:3000/

### Important Notes

- Replace `<service-name>`, `<aws-profile>`, and `<stage>` with actual values
- The `nohup` command allows services to continue running after closing the terminal
- All output (stdout and stderr) is redirected to `dev.log` in the working directory
- The `&` at the end runs the process in the background

## Stopping and Restarting Services

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

## Troubleshooting

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

## Quick Reference

| Service Type  | Directory             | Command                    | Default URL           |
| ------------- | --------------------- | -------------------------- | --------------------- |
| Backend (SST) | `services/<name>`     | `pnpm dev --stage <stage>` | N/A                   |
| Frontend      | `services/<name>/app` | `pnpm dev --stage <stage>` | http://localhost:3000 |

## Development Workflow

1. **Start required services:**
   - Start backend services first (they may take longer to initialize)
   - Then start frontend apps

2. **Monitor logs:**
   - Use `tail -f` to monitor service logs in real-time
   - Watch for errors or warnings during startup

3. **Develop:**
   - Make code changes
   - Hot reload should pick up changes automatically
   - Check logs if changes aren't reflected

4. **Stop services (when done):**
   - Use `kill <PID>` for specific services
   - Or use `pkill -f "sst dev"` and `pkill -f "vite dev"` to stop all
