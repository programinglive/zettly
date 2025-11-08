@component('mail::message')
# {{ __('Welcome to Zettly, :name!', ['name' => $user->name]) }}

{{ __('We just created your workspace and queued your onboarding tasks. You will receive email updates whenever important events happen so you never lose track.') }}

@component('mail::button', ['url' => route('dashboard')])
{{ __('Open Dashboard') }}
@endcomponent

{{ __('If you have any questions, just reply to this email—our team is here to help.') }}

{{ __('Thanks,') }}<br>
{{ config('app.name') }}
@endcomponent
