@component('mail::message')
# {{ __('A new note was created') }}

@isset($user)
{{ __('Hi :name,', ['name' => $user->name]) }}
@else
{{ __('Hi there,') }}
@endisset

{{ __('A new note titled ":title" was just created.', ['title' => $note->title]) }}

@component('mail::panel')
    @if ($note->description)
        {{ \Illuminate\Support\Str::limit(strip_tags($note->description), 200) }}
    @else
        {{ __('No description provided.') }}
    @endif
@endcomponent

@component('mail::button', ['url' => route('todos.show', $note)])
{{ __('View Note') }}
@endcomponent

{{ __('You are receiving this email because you are subscribed to note notifications.') }}

{{ __('Thanks,') }}<br>
{{ config('app.name') }}
@endcomponent
