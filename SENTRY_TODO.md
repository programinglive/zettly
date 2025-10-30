# Sentry Fix Queue

> Query: `is:unresolved`, Sort: `freq`

### TODOAPP-26 — Illuminate\Broadcasting\BroadcastException: Pusher error: The data content of this event exceeds the allowed maximum (10240 bytes). See https://pusher.com/docs/channels/server_api/http-api#publishing-events for more info
- Level: **error** | Events: **11** | Users: **0**
- Culprit: `/vendor/laravel/framework/src/Illuminate/Broadcasting/Broadcasters/PusherBroadcaster.php in Illuminate\Broadcasting\Broadcasters\PusherBroadcaster::broadcast` 
- First/Last seen: 2025-10-27T15:02:20.197423Z → 2025-10-27T15:02:32.125705Z
- Suggested branch: `fix/TODOAPP-26` 
- Link: https://programinglive.sentry.io/issues/6977208896/


### TODOAPP-1P — Symfony\Component\Console\Exception\NamespaceNotFoundException: There are no commands defined in the "app" namespace.
- Level: **error** | Events: **4** | Users: **0**
- Culprit: `\vendor\symfony\console\Application.php in Symfony\Component\Console\Application::findNamespace` 
- First/Last seen: 2025-10-25T15:31:32.581680Z → 2025-10-30T03:54:15.128781Z
- Suggested branch: `fix/TODOAPP-1P` 
- Link: https://programinglive.sentry.io/issues/6973754378/


### TODOAPP-1W — Illuminate\View\ViewException: Vite manifest not found at: /Users/mahardhika/code/project/mine/web/zettly/public/build/manifest.json (View: /Users/mahardhika/code/project/mine/web/zettly/resources/views/app.blade.php)
- Level: **fatal** | Events: **2** | Users: **1**
- Culprit: `/draw` 
- First/Last seen: 2025-10-27T07:47:42.129561Z → 2025-10-27T16:11:45.503884Z
- Suggested branch: `fix/TODOAPP-1W` 
- Link: https://programinglive.sentry.io/issues/6976427078/

