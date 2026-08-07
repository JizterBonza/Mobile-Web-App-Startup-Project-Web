<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class DiagnoseMail extends Command
{
    protected $signature = 'mail:diagnose {--to= : Send a real test message to this address}';

    protected $description = 'Report the effective mail configuration and check SMTP reachability from this server';

    public function handle(): int
    {
        $mailer = config('mail.default');
        $config = config("mail.mailers.{$mailer}", []);

        $this->line('Environment');
        $this->table(['Setting', 'Value'], [
            ['APP_ENV', config('app.env')],
            ['config cached', app()->configurationIsCached() ? 'yes' : 'no'],
            ['openssl loaded', extension_loaded('openssl') ? 'yes' : 'no'],
            ['default mailer', $mailer],
        ]);

        if (($config['transport'] ?? null) !== 'smtp') {
            $this->warn("Mailer '{$mailer}' is not SMTP, so there is nothing to connect to.");

            return self::SUCCESS;
        }

        $host = (string) ($config['host'] ?? '');
        $port = (int) ($config['port'] ?? 0);
        $password = (string) ($config['password'] ?? '');

        $this->line('SMTP configuration');
        $this->table(['Setting', 'Value'], [
            ['host', $host !== '' ? $host : '(empty)'],
            ['port', $port ?: '(empty)'],
            ['encryption', json_encode($config['encryption'] ?? null)],
            ['username', $config['username'] ?: '(empty)'],
            ['password length', strlen($password)],
            ['from address', config('mail.from.address')],
        ]);

        if ($host === '') {
            $this->error('MAIL_HOST is empty. Check the .env file on this server.');

            return self::FAILURE;
        }

        $resolved = gethostbyname($host);
        if ($resolved === $host && ! filter_var($host, FILTER_VALIDATE_IP)) {
            $this->error("DNS lookup failed for {$host}. This server cannot resolve the mail host.");

            return self::FAILURE;
        }
        $this->info("DNS: {$host} resolves to {$resolved}");

        $ports = array_values(array_unique(array_filter([$port, 587, 465, 25])));
        $reachable = [];

        $this->line('Outbound connectivity');
        foreach ($ports as $candidate) {
            $errno = 0;
            $errstr = '';
            $start = microtime(true);
            $socket = @fsockopen($resolved, $candidate, $errno, $errstr, 10);
            $ms = (int) round((microtime(true) - $start) * 1000);

            if (! $socket) {
                $this->line("  port {$candidate}: <fg=red>blocked</> ({$ms}ms) [{$errno}] {$errstr}");

                continue;
            }

            // Implicit-TLS ports (465) never send a plaintext banner, so an empty
            // read there still means the connection succeeded.
            stream_set_timeout($socket, 5);
            $banner = trim((string) @fgets($socket, 512));
            fclose($socket);

            $reachable[] = $candidate;
            $this->line("  port {$candidate}: <fg=green>open</> ({$ms}ms) ".($banner !== '' ? $banner : '(no plaintext banner)'));
        }

        if ($reachable === []) {
            $this->newLine();
            $this->error('No outbound SMTP port is reachable. The hosting firewall is blocking outbound mail; ask the provider to open it or switch to an HTTP API mail driver.');

            return self::FAILURE;
        }

        if (! in_array($port, $reachable, true)) {
            $this->newLine();
            $this->warn("Configured port {$port} is blocked, but ".implode(', ', $reachable).' is reachable. Switch MAIL_PORT (use 465 with MAIL_ENCRYPTION=ssl, or 587 with tls).');

            return self::FAILURE;
        }

        $to = $this->option('to');
        if (! $to) {
            $this->newLine();
            $this->info('Connectivity looks fine. Re-run with --to=you@example.com to test authentication and delivery.');

            return self::SUCCESS;
        }

        try {
            Mail::raw('Mail diagnostic test from '.config('app.name').'.', function ($message) use ($to) {
                $message->to($to)->subject('Mail diagnostic test');
            });
        } catch (\Throwable $e) {
            $this->newLine();
            $this->error('Send failed: '.get_class($e));
            $this->line($e->getMessage());

            return self::FAILURE;
        }

        $this->newLine();
        $this->info("Test message sent to {$to}.");

        return self::SUCCESS;
    }
}
