@component('mail::message')
# {{ __('Todo deleted') }}

@isset($user)
{{ __('Hi :name,', ['name' => $user->name]) }}
@else
{{ __('Hi there,') }}
@endisset

{{ __('The following todo has been removed from your workspace:') }}

@component('mail::panel')
**{{ __('Title') }}:** {{ $todo->title }}

@if (filled($todo->description))
**{{ __('Description') }}:**

{{ \Illuminate\Support\Str::limit(strip_tags($todo->description), 200) }}

@endif
@if ($todo->due_date)
**{{ __('Due Date') }}:** {{ $todo->due_date->toFormattedDateString() }}
@endif
@endcomponent

{{ __('If this was a mistake, you can restore it from the Deleted items view within the next 30 days.') }}

@component('mail::button', ['url' => route('todos.index')])
{{ __('Open Dashboard') }}
@endcomponent

{{ __('Thanks,') }}<br>
{{ config('app.name') }}
@endcomponent
