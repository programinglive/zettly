@extends('layouts.app')

@section('title', $todo->title)

@section('content')
<div class="max-w-2xl mx-auto">
    <div class="bg-white overflow-hidden shadow-sm sm:rounded-lg">
        <div class="p-6 bg-white border-b border-gray-200">
            <div class="flex items-center justify-between mb-6">
                <h2 class="text-2xl font-bold text-gray-900">{{ $todo->title }}</h2>
                <div class="flex space-x-2">
                    <a href="{{ route('todos.edit', $todo) }}"
                       class="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                        ✏️ Edit
                    </a>
                    <a href="{{ route('todos.index') }}"
                       class="text-indigo-600 hover:text-indigo-500 text-sm font-medium">
                        ← Back to Todos
                    </a>
                </div>
            </div>

            <div class="space-y-6">
                <div>
                    <h3 class="text-sm font-medium text-gray-500 uppercase tracking-wide">Status</h3>
                    <div class="mt-2">
                        @if($todo->is_completed)
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                </svg>
                                Completed
                            </span>
                            @if($todo->completed_at)
                                <p class="text-sm text-gray-600 mt-1">
                                    Completed on {{ $todo->completed_at->format('F j, Y \a\t g:i A') }}
                                </p>
                            @endif
                        @else
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path>
                                </svg>
                                Pending
                            </span>
                        @endif
                    </div>
                </div>

                @if($todo->description)
                    <div>
                        <h3 class="text-sm font-medium text-gray-500 uppercase tracking-wide">Description</h3>
                        <div class="mt-2">
                            <p class="text-gray-900 whitespace-pre-wrap">{{ $todo->description }}</p>
                        </div>
                    </div>
                @endif

                <div>
                    <h3 class="text-sm font-medium text-gray-500 uppercase tracking-wide">Timeline</h3>
                    <div class="mt-2 space-y-2">
                        <div class="flex items-center text-sm text-gray-600">
                            <svg class="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            Created on {{ $todo->created_at->format('F j, Y \a\t g:i A') }}
                        </div>
                        <div class="flex items-center text-sm text-gray-600">
                            <svg class="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                            </svg>
                            Assigned to User #{{ $todo->user_id }}
                        </div>
                        @if($todo->updated_at != $todo->created_at)
                            <div class="flex items-center text-sm text-gray-600">
                                <svg class="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                                </svg>
                                Last updated on {{ $todo->updated_at->format('F j, Y \a\t g:i A') }}
                            </div>
                        @endif
                    </div>
                </div>

                <div class="pt-4 border-t border-gray-200">
                    <div class="flex space-x-3">
                        <form method="POST" action="{{ route('todos.toggle', $todo) }}" class="inline">
                            @csrf
                            @method('POST')
                            <button type="submit"
                                    class="inline-flex items-center px-4 py-2 text-sm font-medium text-white {{ $todo->is_completed ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-green-600 hover:bg-green-500' }} border border-transparent rounded-md">
                                {{ $todo->is_completed ? '🔄 Mark as Pending' : '✅ Mark as Completed' }}
                            </button>
                        </form>

                        <form method="POST" action="{{ route('todos.destroy', $todo) }}"
                              onsubmit="return confirm('Are you sure you want to delete this todo?')"
                              class="inline">
                            @csrf
                            @method('DELETE')
                            <button type="submit"
                                    class="inline-flex items-center px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-600 rounded-md hover:bg-red-50">
                                🗑️ Delete Todo
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
@endsection
