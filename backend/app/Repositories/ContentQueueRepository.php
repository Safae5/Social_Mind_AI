<?php

namespace App\Repositories;

use App\Models\ContentQueue;

class ContentQueueRepository
{
    public function getQueue(int $userId, int $accountId = null): \Illuminate\Database\Eloquent\Collection
    {
        $query = ContentQueue::where('user_id', $userId)
            ->whereIn('status', ['queued', 'scheduled'])
            ->with('socialAccount:id,platform,platform_username');

        if ($accountId) {
            $query->where('social_account_id', $accountId);
        }

        return $query->orderBy('queue_position')->get();
    }

    public function reorderPositions(int $userId): void
    {
        $items = ContentQueue::where('user_id', $userId)
            ->whereIn('status', ['queued'])
            ->orderBy('queue_position')
            ->get();

        foreach ($items as $index => $item) {
            $item->update(['queue_position' => $index + 1]);
        }
    }

    public function remove(int $userId, int $itemId): bool
    {
        $item = ContentQueue::where('user_id', $userId)->find($itemId);
        if (!$item) return false;
        $item->delete();
        $this->reorderPositions($userId);
        return true;
    }
}