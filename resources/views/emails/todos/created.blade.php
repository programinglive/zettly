@component('mail::message')
# {{ __('A new todo was created') }}

@isset($user)
{{ __('Hi :name,', ['name' => $user->name]) }}
@else
{{ __('Hi there,') }}
@endisset

{{ __('A new todo titled ":title" was just created.', ['title' => $todo->title]) }}

@component('mail::panel')
    @if ($todo->description)
        {{ \Illuminate\Support\Str::limit(strip_tags($todo->description), 200) }}
    @else
        {{ __('No description provided.') }}
    @endif
@endcomponent

@component('mail::button', ['url' => route('todos.show', $todo)])
{{ __('View Todo') }}
@endcomponent

{{ __('You are receiving this email because you are subscribed to todo notifications.') }}

{{ __('Thanks,') }}<br>
{{ config('app.name') }}
@endcomponent
