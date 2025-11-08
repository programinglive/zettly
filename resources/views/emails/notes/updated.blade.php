@component('mail::message')
# {{ __('A note was updated') }}

@isset($user)
{{ __('Hi :name,', ['name' => $user->name]) }}
@else
{{ __('Hi there,') }}
@endisset

{{ __('The note titled ":title" was just updated.', ['title' => $note->title]) }}

@component('mail::panel')
    @if ($note->description)
        {{ \Illuminate\Support\Str::limit(strip_tags($note->description), 200) }}
    @else
        {{ __('No description provided.') }}
    @endif
@endcomponent

@component('mail::button', ['url' => route('todos.show', $note)])
{{ __('Review Changes') }}
@endcomponent

{{ __('You are receiving this email because you are subscribed to note notifications.') }}

{{ __('Thanks,') }}<br>
{{ config('app.name') }}
@endcomponent
