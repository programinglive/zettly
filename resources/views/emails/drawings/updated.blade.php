@component('mail::message')
# {{ __('A drawing was updated') }}

@isset($user)
{{ __('Hi :name,', ['name' => $user->name]) }}
@else
{{ __('Hi there,') }}
@endisset

{{ __('Changes were just saved to ":title".', ['title' => $drawing->title]) }}

@component('mail::panel')
@if ($drawing->thumbnail)
![{{ __('Drawing thumbnail') }}]({{ $drawing->thumbnail }})
@else
{{ __('Open the drawing to review the latest edits.') }}
@endif
@endcomponent

@component('mail::button', ['url' => route('draw.show', $drawing)])
{{ __('Review Drawing') }}
@endcomponent

{{ __('You are receiving this email because drawing notifications are enabled for your account.') }}

{{ __('Thanks,') }}<br>
{{ config('app.name') }}
@endcomponent
