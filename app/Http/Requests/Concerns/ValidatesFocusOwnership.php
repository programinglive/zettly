<?php

namespace App\Http\Requests\Concerns;

use App\Models\Focus;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

/**
 * Shared validation for grouping artifacts under a focus.
 *
 * A focus_id must belong to the authenticated owner. Validation answers 422
 * rather than silently dropping the value, because a silent drop would leave an
 * artifact unlinked while the caller believes it is linked.
 */
trait ValidatesFocusOwnership
{
    protected function ownedFocusRule(): \Illuminate\Validation\Rules\Exists
    {
        return Rule::exists('foci', 'id')->where('user_id', Auth::id());
    }

    /**
     * Resolve the focus id an artifact should carry.
     *
     * An explicit value wins. Otherwise, when a todo is referenced, the todo's
     * own focus is inherited so an outcome recorded against a task stays inside
     * the same container.
     */
    protected function resolveFocusId(?int $explicitFocusId, ?int $todoId): ?int
    {
        if ($explicitFocusId !== null) {
            return $explicitFocusId;
        }

        if ($todoId === null) {
            return null;
        }

        return Focus::query()
            ->whereKey(
                \App\Models\Todo::query()
                    ->whereKey($todoId)
                    ->where('user_id', Auth::id())
                    ->value('focus_id')
            )
            ->where('user_id', Auth::id())
            ->value('id');
    }
}
