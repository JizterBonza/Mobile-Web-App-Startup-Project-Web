<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ActivityLogController extends Controller
{
    /**
     * List activity logs with optional filters (paginated).
     * Renders the Activity Logs page for Superadmin/Admin dashboard.
     */
    public function index(Request $request)
    {
        $request->validate([
            'user_id' => 'nullable|exists:users,id',
            'action' => 'nullable|string|max:64',
            'subject_type' => 'nullable|string|max:255',
            'from_date' => 'nullable|date',
            'to_date' => 'nullable|date|after_or_equal:from_date',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        $query = ActivityLog::query()
            ->with([
                'user:id,user_detail_id',
                'user.userDetail:id,first_name,last_name,email',
                'subject' => function ($morphTo) {
                    $morphTo->morphWith([
                        User::class => ['userDetail'],
                    ]);
                },
            ]);

        if ($request->filled('user_id')) {
            $query->forUser($request->user_id);
        }
        if ($request->filled('action')) {
            $query->action($request->action);
        }
        if ($request->filled('subject_type')) {
            $query->subjectType($request->subject_type);
        }
        if ($request->filled('from_date') || $request->filled('to_date')) {
            $query->betweenDates($request->from_date, $request->to_date);
        }

        $activityLogs = $query
            ->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 20))
            ->withQueryString();

        $filters = $request->only(['user_id', 'action', 'subject_type', 'from_date', 'to_date', 'per_page']);

        return Inertia::render('Dashboard/ActivityLogs', [
            'activityLogs' => $activityLogs,
            'filters' => $filters,
        ]);
    }

    /**
     * Get a single activity log by id (for API or detail modal).
     */
    public function show($id)
    {
        $log = ActivityLog::with(['user:id,user_detail_id', 'user.userDetail:id,first_name,last_name,email'])->findOrFail($id);
        return response()->json($log);
    }
}
