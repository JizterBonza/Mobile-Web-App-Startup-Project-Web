<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\EnsuresApiOwnership;
use App\Models\Notification;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    use EnsuresApiOwnership;

    public function index(Request $request)
    {
        if ($response = $this->rejectUserIdMismatch($request, $request->input('user_id'))) {
            return $response;
        }

        $query = Notification::where('user_id', $this->authUserId($request));

        if ($request->has('category')) {
            $query->where('category', $request->category);
        }

        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        if ($request->has('read')) {
            $query->where('read', filter_var($request->read, FILTER_VALIDATE_BOOLEAN));
        }

        $notifications = $query
            ->with('reference')
            ->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 20));

        return response()->json($notifications);
    }

    public function byCategory(Request $request)
    {
        if ($response = $this->rejectUserIdMismatch($request, $request->input('user_id'))) {
            return $response;
        }

        $notifications = Notification::where('user_id', $this->authUserId($request))
            ->with('reference')
            ->orderBy('created_at', 'desc')
            ->get()
            ->groupBy('category');

        return response()->json($notifications);
    }

    public function markAsRead(Request $request, $id)
    {
        if ($response = $this->rejectUserIdMismatch($request, $request->input('user_id'))) {
            return $response;
        }

        $notification = Notification::where('user_id', $this->authUserId($request))->findOrFail($id);
        $notification->markAsRead();

        return response()->json(['message' => 'Marked as read']);
    }

    public function markAllAsRead(Request $request)
    {
        if ($response = $this->rejectUserIdMismatch($request, $request->input('user_id'))) {
            return $response;
        }

        $query = Notification::where('user_id', $this->authUserId($request));

        if ($request->has('category')) {
            $query->where('category', $request->category);
        }

        $query->update(['read' => true, 'read_at' => now()]);

        return response()->json(['message' => 'All marked as read']);
    }

    public function unreadCount(Request $request)
    {
        if ($response = $this->rejectUserIdMismatch($request, $request->input('user_id'))) {
            return $response;
        }

        $userId = $this->authUserId($request);
        $query = Notification::where('user_id', $userId)->where('read', false);

        if ($request->has('category')) {
            $query->where('category', $request->category);
        }

        $count = $query->count();

        $byCategory = Notification::where('user_id', $userId)
            ->where('read', false)
            ->selectRaw('category, count(*) as count')
            ->groupBy('category')
            ->pluck('count', 'category');

        return response()->json([
            'count' => $count,
            'by_category' => $byCategory,
        ]);
    }

    public function unreadCountByUser(Request $request, $userId)
    {
        if ($response = $this->ensureSelfOrStaff($request, $userId)) {
            return $response;
        }

        $count = Notification::where('user_id', $userId)
            ->where('read', false)
            ->count();

        return response()->json([
            'success' => true,
            'count' => $count,
        ]);
    }

    public function destroy(Request $request, $id)
    {
        if ($response = $this->rejectUserIdMismatch($request, $request->input('user_id'))) {
            return $response;
        }

        $notification = Notification::where('user_id', $this->authUserId($request))->findOrFail($id);
        $notification->delete();

        return response()->json(['message' => 'Notification deleted']);
    }

    public function clearRead(Request $request)
    {
        if ($response = $this->rejectUserIdMismatch($request, $request->input('user_id'))) {
            return $response;
        }

        Notification::where('user_id', $this->authUserId($request))->where('read', true)->delete();

        return response()->json(['message' => 'Read notifications cleared']);
    }
}
