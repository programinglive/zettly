#!/bin/bash

echo "🔧 Fixing WebSocket Broadcasting Configuration"
echo "=========================================="

echo "1. Clearing Laravel caches..."
php artisan config:clear
php artisan route:clear
php artisan cache:clear
php artisan view:clear

echo ""
echo "2. Checking broadcast configuration..."
php artisan tinker --execute="
echo 'Broadcast Driver: ' . config('broadcasting.default') . PHP_EOL;
echo 'App Version: ' . config('app.version') . PHP_EOL;
echo 'Pusher Key: ' . (config('broadcasting.connections.pusher.key') ? substr(config('broadcasting.connections.pusher.key'), 0, 8) . '...' : 'Not configured') . PHP_EOL;
echo 'Broadcast Provider Registered: ' . (class_exists('App\Providers\BroadcastServiceProvider') ? 'Yes' : 'No') . PHP_EOL;
"

echo ""
echo "3. Testing broadcast auth endpoint..."
curl -X POST "http://localhost:8000/broadcasting/auth" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"socket_id":"test","channel_name":"private-drawings.1"}' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo "4. Testing debug endpoint..."
curl -X GET "http://localhost:8000/test-broadcasting" \
  -H "Accept: application/json" \
  -s | jq '.'

echo ""
echo "✅ Configuration fix complete!"
echo "📋 If the server still shows 'log' driver or 'unknown' version:"
echo "   1. Deploy these changes to your server"
echo "   2. Run 'php artisan config:clear' on the server"
echo "   3. Restart any running services (php-fpm, nginx, etc.)"
echo "   4. Test again at /drawings/{id}/test"
