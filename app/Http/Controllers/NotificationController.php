<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /**
     * Get paginated notifications with optional filters.
     */
    public function index(Request $request)
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
        ]);

        $query = Notification::where('user_id', $request->user_id);

        // Filter by category
        if ($request->has('category')) {
            $query->where('category', $request->category);
        }

        // Filter by type
        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        // Filter by read status
        if ($request->has('read')) {
            $query->where('read', filter_var($request->read, FILTER_VALIDATE_BOOLEAN));
        }

        $notifications = $query
            ->with('reference')
            ->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 20));
            
        return response()->json($notifications);
    }

    /**
     * Get notifications grouped by category.
     */
    public function byCategory(Request $request)
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
        ]);

        $notifications = Notification::where('user_id', $request->user_id)
            ->with('reference')
            ->orderBy('created_at', 'desc')
            ->get()
            ->groupBy('category');
            
        return response()->json($notifications);
    }

    /**
     * Mark a single notification as read.
     */
    public function markAsRead(Request $request, $id)
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
        ]);

        $notification = Notification::where('user_id', $request->user_id)->findOrFail($id);
        $notification->markAsRead();
        
        return response()->json(['message' => 'Marked as read']);
    }

    /**
     * Mark all notifications as read (optionally by category).
     */
    public function markAllAsRead(Request $request)
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
        ]);

        $query = Notification::where('user_id', $request->user_id);

        if ($request->has('category')) {
            $query->where('category', $request->category);
        }

        $query->update(['read' => true, 'read_at' => now()]);
        
        return response()->json(['message' => 'All marked as read']);
    }

    /**
     * Get unread notification count (optionally by category).
     */
    public function unreadCount(Request $request)
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
        ]);

        $query = Notification::where('user_id', $request->user_id)->where('read', false);

        if ($request->has('category')) {
            $query->where('category', $request->category);
        }

        $count = $query->count();

        // Also return counts per category
        $byCategory = Notification::where('user_id', $request->user_id)
            ->where('read', false)
            ->selectRaw('category, count(*) as count')
            ->groupBy('category')
            ->pluck('count', 'category');
        
        return response()->json([
            'count' => $count,
            'by_category' => $byCategory,
        ]);
    }

    /**
     * Delete a notification.
     */
    public function destroy(Request $request, $id)
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
        ]);

        $notification = Notification::where('user_id', $request->user_id)->findOrFail($id);
        $notification->delete();
        
        return response()->json(['message' => 'Notification deleted']);
    }

    /**
     * Delete all read notifications.
     */
    public function clearRead(Request $request)
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
        ]);

        Notification::where('user_id', $request->user_id)->where('read', true)->delete();
        
        return response()->json(['message' => 'Read notifications cleared']);
    }
}
