# WebSocket Broadcasting Deployment Checklist

## 🚀 Before Deployment
- [ ] All tests passing locally (`npm test`)
- [ ] Build successful (`npm run build`)
- [ ] Version updated in package.json
- [ ] Changes committed and pushed to main

## 📦 Deployment Steps

### 1. Deploy Code Changes
```bash
# Pull latest changes
git pull origin main

# Install/update dependencies
composer install --no-dev --optimize-autoloader
npm install
npm run build
```

### 2. Clear Laravel Caches
```bash
php artisan config:clear
php artisan route:clear
php artisan cache:clear
php artisan view:clear
```

### 3. Restart Services
```bash
# Restart PHP-FPM
sudo systemctl restart php8.2-fpm

# Restart Nginx (if needed)
sudo systemctl restart nginx

# Or restart your deployment method
# pm2 restart app
# supervisorctl restart laravel-worker
```

### 4. Verify Configuration
```bash
# Check broadcast driver
php artisan tinker --execute="echo 'Broadcast Driver: ' . config('broadcasting.default')"

# Check app version
php artisan tinker --execute="echo 'App Version: ' . config('app.version')"

# Check Pusher configuration
php artisan tinker --execute="echo 'Pusher Key: ' . (config('broadcasting.connections.pusher.key') ? 'configured' : 'missing')"

# Verify mail transport configuration
php artisan tinker --execute="echo 'Mail Transport: ' . config('mail.mailers.smtp.transport') . ' (scheme: ' . (config('mail.mailers.smtp.scheme') ?? 'default') . ')';"
```

## 🧪 Post-Deployment Testing

### 1. Test Debug Endpoint
Visit: `https://your-domain.com/test-broadcasting`

Expected response:
```json
{
  "app_version": "0.5.27",
  "broadcast_driver": "pusher",
  "pusher_configured": true
}
```

### 2. Test WebSocket Integration
Visit: `https://your-domain.com/drawings/{drawing-id}/test`

Expected results:
- ✅ Server Configuration: v0.5.27, Pusher: ✓
- ✅ Test Auth Endpoint: Auth successful
- ✅ Real Broadcasting Auth: Should return proper JSON (not empty)
- ✅ WebSocket Connection: State: connected
- ✅ Channel Subscription: Should succeed

### 3. Test Real Drawing Page
Visit: `https://your-domain.com/drawings/{drawing-id}/edit`

Check browser console:
- ✅ `🚀 Zettly v0.5.27 - WebSocket Module Loaded`
- ✅ `[WebSocket] Connected to Pusher`
- ✅ `[WebSocket] Authorization for channel: private-drawings.{id} successful`
- ❌ No "Empty response" errors

## 🔧 Troubleshooting

### If broadcast driver still shows "log":
1. Check `.env` file: `BROADCAST_CONNECTION=pusher`
2. Clear config cache: `php artisan config:clear`
3. Restart PHP-FPM
4. Verify `.env` is being loaded correctly

### If app version still shows "unknown":
1. Check `.env` file: `APP_VERSION="0.5.27"`
2. Verify `config/app.php` has version configuration
3. Clear config cache: `php artisan config:clear`

### If auth endpoint still returns empty:
1. Verify BroadcastServiceProvider is registered
2. Check routes: `php artisan route:list | grep broadcasting`
3. Verify middleware is applied correctly
4. Check Laravel logs: `tail -f storage/logs/laravel.log`

## 📋 Environment Variables Required

```bash
# .env file
APP_VERSION="0.5.27"
BROADCAST_CONNECTION=pusher

PUSHER_APP_ID=your_app_id
PUSHER_APP_KEY=your_app_key
PUSHER_APP_SECRET=your_app_secret
PUSHER_APP_CLUSTER=your_cluster

VITE_APP_VERSION="0.5.27"
VITE_PUSHER_APP_KEY=your_app_key
VITE_PUSHER_APP_CLUSTER=your_cluster
```

## ✅ Success Indicators

- Server version shows "0.5.27"
- Broadcast driver shows "pusher"
- Real broadcasting auth returns JSON response
- WebSocket connections succeed
- Live drawing updates work across tabs
