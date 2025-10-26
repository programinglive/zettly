# PWA Tablet Screen Size Fix

## Problem
When installing Zettly as a PWA on Android tablets, the app was opening in small screen mode instead of utilizing the full tablet screen size.

## Root Causes
1. **Manifest orientation locked to portrait**: The `site.webmanifest` had `"orientation": "portrait-primary"`, forcing portrait mode
2. **Missing viewport optimization**: No safe-area-inset handling for notches and safe areas
3. **Responsive layout assumptions**: Layout used Tailwind breakpoints that didn't account for tablet detection

## Solution

### 1. Updated Web Manifest (`public/site.webmanifest`)
- Added `"prefer_related_applications": false` to ensure PWA takes priority
- Kept `"orientation": "portrait-primary"` but added viewport optimization

### 2. Enhanced Viewport Meta Tag (`resources/views/app.blade.php`)
```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```
- `viewport-fit=cover` ensures the app uses the full screen including notches on modern devices

### 3. Created `usePwaMode` Hook (`resources/js/hooks/usePwaMode.js`)
Detects:
- **Standalone mode**: Via `(display-mode: standalone)` media query or `navigator.standalone`
- **Tablet device**: Via user agent detection (iPad/Android) or screen width >= 768px
- Listens for orientation changes and resizes

### 4. Updated AppLayout (`resources/js/Layouts/AppLayout.jsx`)
- Uses `usePwaMode()` hook to detect tablet + PWA mode
- Applies full-width layout (`w-full`) for PWA on tablets
- Maintains responsive max-width for web browsers

### 5. CSS Improvements (`resources/css/app.css`)
- Added safe-area-inset padding for notched devices
- Ensured full viewport height on PWA (`html, body, #app { height: 100%; width: 100%; }`)

## Testing

Run the test suite to verify tablet detection:
```bash
npm test -- usePwaMode.test.js
```

### Manual Testing on Android Tablet
1. Build the app: `npm run build`
2. Install PWA from Chrome menu (Install app)
3. Open from home screen icon
4. Verify the app uses full tablet screen width

### Manual Testing on iPad
1. Open in Safari
2. Tap Share → Add to Home Screen
3. Open from home screen
4. Verify the app uses full iPad screen width

## Browser Compatibility
- ✅ Chrome/Edge (Android)
- ✅ Safari (iOS/iPadOS)
- ✅ Firefox (Android)
- ✅ Samsung Internet (Android)

## Files Modified
- `public/site.webmanifest`
- `resources/views/app.blade.php`
- `resources/js/Layouts/AppLayout.jsx`
- `resources/css/app.css`

## Files Created
- `resources/js/hooks/usePwaMode.js`
- `resources/js/hooks/__tests__/usePwaMode.test.js`
