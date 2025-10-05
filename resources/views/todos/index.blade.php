@extends('layouts.app')

@section('title', 'Todos')

@section('content')
<div class="bg-white overflow-hidden shadow-sm sm:rounded-lg">
    <div class="p-6 bg-white border-b border-gray-200">
        <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-bold text-gray-900">My Todos</h2>
            <div class="flex space-x-2">
                <a href="{{ route('todos.index') }}"
                   class="px-4 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 {{ request('filter') === null ? 'bg-gray-100' : '' }}">
                    All
                </a>
                <a href="{{ route('todos.index', ['filter' => 'pending']) }}"
                   class="px-4 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 {{ request('filter') === 'pending' ? 'bg-gray-100' : '' }}">
                    Pending
                </a>
                <a href="{{ route('todos.index', ['filter' => 'completed']) }}"
                   class="px-4 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 {{ request('filter') === 'completed' ? 'bg-gray-100' : '' }}">
                    Completed
                </a>
            </div>
        </div>

        @if($todos->count() > 0)
            <div class="space-y-4">
                @foreach($todos as $todo)
                    <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg {{ $todo->is_completed ? 'opacity-75' : '' }}">
                        <div class="flex items-center space-x-3 flex-1">
                            <form method="POST" action="{{ route('todos.toggle', $todo) }}" class="inline">
                                @csrf
                                @method('POST')
                                <button type="submit"
                                        class="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-indigo-500 transition-colors {{ $todo->is_completed ? 'bg-green-500 border-green-500' : '' }}">
                                    @if($todo->is_completed)
                                        <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                        </svg>
                                    @endif
                                </button>
                            </form>

                            <div class="flex-1">
                                <h3 class="text-lg font-medium {{ $todo->is_completed ? 'line-through text-gray-500' : 'text-gray-900' }}">
                                    {{ $todo->title }}
                                </h3>
                                @if($todo->description)
                                    <p class="text-sm text-gray-600 mt-1">{{ $todo->description }}</p>
                                @endif
                                <div class="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                                    <span>Created: {{ $todo->created_at->format('M d, Y') }}</span>
                                    @if($todo->is_completed && $todo->completed_at)
                                        <span class="text-green-600">✓ Completed: {{ $todo->completed_at->format('M d, Y') }}</span>
                                    @endif
                                </div>
                            </div>
                        </div>

                        <div class="flex items-center space-x-2">
                            <a href="{{ route('todos.show', $todo) }}"
                               class="inline-flex items-center px-3 py-2 text-sm font-medium text-indigo-600 bg-white border border-indigo-600 rounded-md hover:bg-indigo-50">
                                👁 View
                            </a>
                            <a href="{{ route('todos.edit', $todo) }}"
                               class="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                                ✏️ Edit
                            </a>
                            <form method="POST" action="{{ route('todos.destroy', $todo) }}"
                                  onsubmit="return confirm('Are you sure you want to delete this todo?')"
                                  class="inline">
                                @csrf
                                @method('DELETE')
                                <button type="submit"
                                        class="inline-flex items-center px-3 py-2 text-sm font-medium text-red-600 bg-white border border-red-600 rounded-md hover:bg-red-50">
                                    🗑️ Delete
                                </button>
                            </form>
                        </div>
                    </div>
                @endforeach
            </div>
        @else
            <div class="text-center py-12">
                <div class="text-6xl mb-4">📝</div>
                <h3 class="text-lg font-medium text-gray-900 mb-2">No todos yet</h3>
                <p class="text-gray-500 mb-6">Get started by creating your first todo item.</p>
                <a href="{{ route('todos.create') }}"
                   class="inline-flex items-center px-6 py-3 bg-indigo-600 border border-transparent rounded-md font-semibold text-white hover:bg-indigo-500">
                    ➕ Create Your First Todo
                </a>
            </div>
        @endif
    </div>
</div>
@endsection
