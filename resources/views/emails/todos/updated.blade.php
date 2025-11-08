@component('mail::message')
# {{ __('A todo was updated') }}

@isset($user)
{{ __('Hi :name,', ['name' => $user->name]) }}
@else
{{ __('Hi there,') }}
@endisset

{{ __('The todo titled ":title" was just updated.', ['title' => $todo->title]) }}

@component('mail::panel')
    @if ($todo->description)
        {{ \Illuminate\Support\Str::limit(strip_tags($todo->description), 200) }}
    @else
        {{ __('No description provided.') }}
    @endif
@endcomponent

@component('mail::button', ['url' => route('todos.show', $todo)])
{{ __('Review Changes') }}
@endcomponent

{{ __('You are receiving this email because you are subscribed to todo notifications.') }}

{{ __('Thanks,') }}<br>
{{ config('app.name') }}
@endcomponent
