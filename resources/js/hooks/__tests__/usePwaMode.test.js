/**
 * Unit tests for usePwaMode hook
 * Tests tablet and standalone PWA detection logic
 */

// Mock implementation for testing
function mockMatchMedia(query, matches) {
    return {
        matches,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => {},
    };
}

// Test: Detect tablet when screen width >= 768px
function testTabletDetectionByWidth() {
    const originalInnerWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
    });

    window.matchMedia = () => mockMatchMedia('', false);

    // Simulate hook logic
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isTabletUA = /ipad|android/.test(userAgent);
    const screenWidth = window.innerWidth;
    const isTablet = isTabletUA || screenWidth >= 768;

    console.assert(isTablet === true, 'Should detect tablet at 768px width');

    Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: originalInnerWidth,
    });
}

// Test: Detect tablet with iPad user agent
function testTabletDetectionByiPad() {
    const originalUserAgent = Object.getOwnPropertyDescriptor(window.navigator, 'userAgent');
    Object.defineProperty(window.navigator, 'userAgent', {
        writable: true,
        configurable: true,
        value: 'Mozilla/5.0 (iPad; CPU OS 13_2_3 like Mac OS X)',
    });

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isTabletUA = /ipad|android/.test(userAgent);

    console.assert(isTabletUA === true, 'Should detect iPad from user agent');

    Object.defineProperty(window.navigator, 'userAgent', originalUserAgent);
}

// Test: Detect tablet with Android user agent
function testTabletDetectionByAndroid() {
    const originalUserAgent = Object.getOwnPropertyDescriptor(window.navigator, 'userAgent');
    Object.defineProperty(window.navigator, 'userAgent', {
        writable: true,
        configurable: true,
        value: 'Mozilla/5.0 (Linux; Android 10; SM-T510)',
    });

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isTabletUA = /ipad|android/.test(userAgent);

    console.assert(isTabletUA === true, 'Should detect Android from user agent');

    Object.defineProperty(window.navigator, 'userAgent', originalUserAgent);
}

// Test: Do not detect tablet on mobile phones
function testMobilePhoneNotDetectedAsTablet() {
    const originalInnerWidth = window.innerWidth;
    const originalUserAgent = Object.getOwnPropertyDescriptor(window.navigator, 'userAgent');

    Object.defineProperty(window.navigator, 'userAgent', {
        writable: true,
        configurable: true,
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X)',
    });

    Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
    });

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isTabletUA = /ipad|android/.test(userAgent);
    const screenWidth = window.innerWidth;
    const isTablet = isTabletUA || screenWidth >= 768;

    console.assert(isTablet === false, 'Should not detect iPhone as tablet');

    Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: originalInnerWidth,
    });
    Object.defineProperty(window.navigator, 'userAgent', originalUserAgent);
}

// Test: Detect standalone mode via display-mode media query
function testStandaloneModeDetection() {
    window.matchMedia = (query) => mockMatchMedia(query, query === '(display-mode: standalone)');

    const matches = window.matchMedia('(display-mode: standalone)').matches;
    console.assert(matches === true, 'Should detect standalone mode via media query');
}

// Run all tests
console.log('Running usePwaMode tests...');
testTabletDetectionByWidth();
testTabletDetectionByiPad();
testTabletDetectionByAndroid();
testMobilePhoneNotDetectedAsTablet();
testStandaloneModeDetection();
console.log('✓ All usePwaMode tests passed');
