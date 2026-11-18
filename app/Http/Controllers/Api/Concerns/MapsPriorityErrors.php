<?php

namespace App\Http\Controllers\Api\Concerns;

use App\Domain\Priority\PriorityException;
use App\Models\Todo;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

/**
 * One HTTP shape for every priority refusal.
 *
 * `code` is the machine-readable contract the CLI and the MCP server switch on;
 * `message` is the sentence a human reads. Foreign ids answer 404 rather than
 * 403 so the API never confirms that someone else's task exists.
 */
trait MapsPriorityErrors
{
    protected function priorityError(PriorityException $exception): JsonResponse
    {
        $status = match ($exception->errorCode) {
            'not_found' => 404,
            'forbidden' => 403,
            default => 422,
        };

        return response()->json([
            'success' => false,
            'message' => $exception->getMessage(),
            'code' => $exception->errorCode,
            'context' => $exception->context,
        ], $status);
    }

    protected function ownedTodo(int|string $id): Todo
    {
        $todo = Todo::query()
            ->where('user_id', Auth::id())
            ->with('focus:id,title')
            ->find((int) $id);

        if ($todo === null) {
            throw PriorityException::notFound('Task');
        }

        return $todo;
    }
}
