# Supervisor Setup for the Laravel Queue Worker

This guide configures Supervisor to keep the Agrify Laravel database queue worker running after the SSH session or terminal is closed. The worker is required for delayed jobs such as pending-payment reminders.

These instructions assume:

- Ubuntu or Debian server
- Application path: `/root/myapp`
- Queue connection: `database`
- Commands are run as `root`

If your application or PHP executable uses a different path, update the examples accordingly.

## 1. Prepare the application

From the application directory, verify that Laravel is configured to use the database queue and that migrations are current:

```bash
cd /root/myapp
grep '^QUEUE_CONNECTION=' .env
php artisan migrate --force
```

The environment should contain:

```env
QUEUE_CONNECTION=database
```

## 2. Install Supervisor

```bash
apt update
apt install -y supervisor
systemctl enable --now supervisor
```

Verify the service:

```bash
systemctl status supervisor --no-pager
supervisorctl status
```

## 3. Find the PHP executable

```bash
which php
```

The usual path is `/usr/bin/php`. Use the returned path in the Supervisor configuration below.

## 4. Create the worker configuration

Open a new Supervisor configuration file:

```bash
nano /etc/supervisor/conf.d/myapp-queue.conf
```

Paste the following configuration:

```ini
[program:myapp-queue]
command=/usr/bin/php /root/myapp/artisan queue:work database --sleep=3 --tries=3 --timeout=90 --max-time=3600
directory=/root/myapp
user=root
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
redirect_stderr=true
stdout_logfile=/root/myapp/storage/logs/queue-worker.log
stopwaitsecs=3600
```

Save in Nano with `Ctrl+O`, press `Enter`, and exit with `Ctrl+X`.

> The configuration uses `root` because the example application is under `/root/myapp`. For stronger production isolation, place the application under a deployment directory such as `/var/www/myapp` and run the worker as a dedicated deployment user.

## 5. Load and start the worker

```bash
supervisorctl reread
supervisorctl update
supervisorctl status
```

The expected result is similar to:

```text
myapp-queue                     RUNNING   pid 1234, uptime 0:00:10
```

If it is not running, start it explicitly:

```bash
supervisorctl start myapp-queue
```

Confirm that the Laravel worker process exists:

```bash
ps aux | grep '[q]ueue:work'
```

## Deployment commands

After deploying application changes, restart Laravel's workers gracefully so they load the new code:

```bash
cd /root/myapp
php artisan queue:restart
supervisorctl status
```

Supervisor will start a replacement process after the current worker exits.

## Useful commands

```bash
# Show worker status
supervisorctl status myapp-queue

# Restart immediately
supervisorctl restart myapp-queue

# Stop the worker
supervisorctl stop myapp-queue

# Start the worker
supervisorctl start myapp-queue

# Follow the worker log
tail -f /root/myapp/storage/logs/queue-worker.log

# List failed Laravel jobs
php artisan queue:failed

# Retry all failed Laravel jobs
php artisan queue:retry all
```

## Troubleshooting

### `supervisorctl: command not found`

Install and start Supervisor:

```bash
apt install -y supervisor
systemctl enable --now supervisor
```

### Worker shows `FATAL` or `BACKOFF`

Check the Supervisor and application logs:

```bash
supervisorctl tail -100 myapp-queue stderr
tail -100 /root/myapp/storage/logs/queue-worker.log
tail -100 /root/myapp/storage/logs/laravel.log
```

Then verify that the PHP and application paths in `myapp-queue.conf` are correct.

### Jobs stay in the `jobs` table

Check that the worker is running and the environment is using the same database as the web application:

```bash
supervisorctl status myapp-queue
cd /root/myapp
php artisan about
```

If configuration was recently changed, clear cached configuration and restart the worker:

```bash
php artisan config:clear
php artisan queue:restart
```

### Configuration changes are not applied

Reload Supervisor after editing the configuration:

```bash
supervisorctl reread
supervisorctl update
supervisorctl restart myapp-queue
```
