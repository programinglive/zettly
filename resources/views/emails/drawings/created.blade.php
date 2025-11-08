@component('mail::message')
# {{ __('A new drawing was created') }}

@isset($user)
{{ __('Hi :name,', ['name' => $user->name]) }}
@else
{{ __('Hi there,') }}
@endisset

{{ __('Your drawing titled ":title" is ready in the workspace.', ['title' => $drawing->title]) }}

@component('mail::panel')
@if ($drawing->thumbnail)
![{{ __('Drawing thumbnail') }}]({{ $drawing->thumbnail }})
@else
{{ __('Open the drawing to start sketching or add a thumbnail.') }}
@endif
@endcomponent

@component('mail::button', ['url' => route('draw.show', $drawing)])
{{ __('Open Drawing') }}
@endcomponent

{{ __('You are receiving this email because drawing notifications are enabled for your account.') }}

{{ __('Thanks,') }}<br>
{{ config('app.name') }}
@endcomponent
