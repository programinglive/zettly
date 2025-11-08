@component('mail::message')
# {{ __('Note deleted') }}

@isset($user)
{{ __('Hi :name,', ['name' => $user->name]) }}
@else
{{ __('Hi there,') }}
@endisset

{{ __('The following note has been removed from your workspace:') }}

@component('mail::panel')
**{{ __('Title') }}:** {{ $note->title }}

@if (filled($note->description))
**{{ __('Description') }}:**

{{ \Illuminate\Support\Str::limit(strip_tags($note->description), 200) }}
@endif
@endcomponent

{{ __('If this was a mistake, you can restore it from Deleted items within the next 30 days.') }}

@component('mail::button', ['url' => route('todos.index')])
{{ __('Open Dashboard') }}
@endcomponent

{{ __('Thanks,') }}<br>
{{ config('app.name') }}
@endcomponent
