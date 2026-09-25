<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Exceptions\PostTooLargeException;
use Illuminate\Http\Middleware\HandleCors;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

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
            \App\Http\Middleware\EnsureUserIsActive::class,
            \App\Http\Middleware\HandleInertiaRequests::class,
        ]);

        // Enable CORS for API routes
        $middleware->api(prepend: [
            HandleCors::class,
        ]);

        // Register middleware aliases
        $middleware->alias([
            'session.valid' => \App\Http\Middleware\CheckSessionValidity::class,
            'account.active' => \App\Http\Middleware\EnsureUserIsActive::class,
            'user.type' => \App\Http\Middleware\CheckUserType::class,
            'payout.automation' => \App\Http\Middleware\AuthenticatePayoutAutomation::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->render(function (PostTooLargeException $e, Request $request) {
            $message = 'The upload is too large. Please use smaller files or fewer files at once.';

            if ($request->expectsJson()) {
                return response()->json([
                    'message' => $message,
                ], 413);
            }

            return back()->with('error', $message);
        });

        $exceptions->respond(function (Response $response, \Throwable $e, Request $request) {
            if ($response->getStatusCode() === 419) {
                $message = 'Your session expired. Please refresh the page and try again.';

                if ($request->expectsJson()) {
                    return response()->json([
                        'message' => $message,
                    ], 419);
                }

                return back()->with('error', $message);
            }

            return $response;
        });
    })->create();
