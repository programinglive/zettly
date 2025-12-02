# Sentry Fix Queue

> Query: `is:unresolved`, Sort: `freq`

### TODOAPP-2V — Downtime detected for https://zettly.programinglive.com
- Level: **error** | Events: **4** | Users: **0**
- Culprit: `` 
- First/Last seen: 2025-11-22T12:54:09.153256Z → 2025-12-01T18:34:08.901811Z
- Suggested branch: `fix/TODOAPP-2V` 
- Link: https://programinglive.sentry.io/issues/7054242793/


### TODOAPP-2D — GuzzleHttp\Exception\ClientException: Client error: `GET https://sentry.io/api/0/projects/programinglive/todoapp/issues/?query=is%3Aunresolved&limit=25&expand=owners%2Cstats&shortIdLookup=1&sort=freq` resulted in a `401 Unauthorized` response:
- Level: **error** | Events: **4** | Users: **0**
- Culprit: `\app\Console\Commands\SentryPull.php in App\Console\Commands\SentryPull::handle` 
- First/Last seen: 2025-11-03T08:03:09.610081Z → 2025-12-02T08:03:29.417413Z
- Suggested branch: `fix/TODOAPP-2D` 
- Link: https://programinglive.sentry.io/issues/6993113945/


### TODOAPP-2W — InvalidArgumentException: Database connection [psql] not configured.
- Level: **error** | Events: **1** | Users: **0**
- Culprit: `\vendor\laravel\framework\src\Illuminate\Database\DatabaseManager.php in Illuminate\Database\DatabaseManager::configuration` 
- First/Last seen: 2025-12-02T07:51:56.362741Z → 2025-12-02T07:51:56.362741Z
- Suggested branch: `fix/TODOAPP-2W` 
- Link: https://programinglive.sentry.io/issues/7080527045/

