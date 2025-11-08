@component('mail::message')
# {{ __('Drawing deleted') }}

@isset($user)
{{ __('Hi :name,', ['name' => $user->name]) }}
@else
{{ __('Hi there,') }}
@endisset

{{ __('The drawing ":title" has been removed from your workspace.', ['title' => $drawing->title]) }}

@component('mail::panel')
@if ($drawing->thumbnail)
![{{ __('Drawing thumbnail') }}]({{ $drawing->thumbnail }})
@endif

{{ __('Deleted drawings can be restored from backups if available.') }}
@endcomponent

@component('mail::button', ['url' => route('draw.index')])
{{ __('Browse Drawings') }}
@endcomponent

{{ __('You are receiving this email because drawing notifications are enabled for your account.') }}

{{ __('Thanks,') }}<br>
{{ config('app.name') }}
@endcomponent
