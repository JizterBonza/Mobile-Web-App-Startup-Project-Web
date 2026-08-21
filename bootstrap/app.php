<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\HandleCors;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->web(append: [
            \App\Http\Middleware\HandleInertiaRequests::class,
        ]);

        // Enable CORS for API routes
        $middleware->api(prepend: [
            HandleCors::class,
        ]);

        // Register middleware aliases
        $middleware->alias([
            'session.valid' => \App\Http\Middleware\CheckSessionValidity::class,
            'user.type' => \App\Http\Middleware\CheckUserType::class,
            'payout.automation' => \App\Http\Middleware\AuthenticatePayoutAutomation::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
