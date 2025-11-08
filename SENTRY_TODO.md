# Sentry Fix Queue

> Query: `is:unresolved`, Sort: `freq`

### TODOAPP-2R — Illuminate\Database\QueryException: SQLSTATE[08006] [7] connection to server at "localhost" (::1), port 5432 failed: FATAL:  the database system is shutting down (Connection: pgsql, SQL: select * from "cache" where "key" in (zettly-cache-illuminate:queue:restart))
- Level: **error** | Events: **2** | Users: **0**
- Culprit: `/vendor/laravel/framework/src/Illuminate/Database/Connection.php in Illuminate\Database\Connection::runQueryCallback` 
- First/Last seen: 2025-11-08T16:07:42.890221Z → 2025-11-08T16:07:43.382314Z
- Suggested branch: `fix/TODOAPP-2R` 
- Link: https://programinglive.sentry.io/issues/7008802156/


### TODOAPP-2S — PDOException: There is already an active transaction
- Level: **error** | Events: **1** | Users: **0**
- Culprit: `/vendor/laravel/framework/src/Illuminate/Database/Connection.php in PDO::beginTransaction` 
- First/Last seen: 2025-11-08T16:07:42.324443Z → 2025-11-08T16:07:42.324443Z
- Suggested branch: `fix/TODOAPP-2S` 
- Link: https://programinglive.sentry.io/issues/7008802168/


### TODOAPP-2Q — PDOException: SQLSTATE[08006] [7] connection to server at "localhost" (::1), port 5432 failed: FATAL:  the database system is shutting down
- Level: **error** | Events: **1** | Users: **0**
- Culprit: `/vendor/laravel/framework/src/Illuminate/Database/Connectors/Connector.php in PDO::__construct` 
- First/Last seen: 2025-11-08T16:07:42.674871Z → 2025-11-08T16:07:42.674871Z
- Suggested branch: `fix/TODOAPP-2Q` 
- Link: https://programinglive.sentry.io/issues/7008802154/

