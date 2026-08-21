<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Source (Agrify) disbursement account
    |--------------------------------------------------------------------------
    |
    | Bank of Commerce account used to send vendor/user payouts.
    |
    */

    'source_account' => [
        'number' => env('PAYOUT_SOURCE_ACCOUNT_NUMBER', '125900219450'),
        'name' => env('PAYOUT_SOURCE_ACCOUNT_NAME', 'Agrify Connect Philippines Corporation'),
        'bic' => env('PAYOUT_SOURCE_ACCOUNT_BIC', 'PABIPHMM'),
    ],

    'currency' => 'PHP',

    'provider' => env('PAYOUT_PROVIDER', 'paymongo'),

    'reference_prefix' => env('PAYOUT_REFERENCE_PREFIX', 'AGFPO'),

    /*
    | Machine-to-machine key for payout automation (n8n, cron, bank jobs).
    | Send as X-Api-Key or Authorization: Bearer <key>.
    */
    'automation_api_key' => env('PAYOUT_AUTOMATION_API_KEY'),

];
