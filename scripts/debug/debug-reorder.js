/**
 * Debug script to test Kanban board reordering
 * Run this in the browser console on the dashboard page
 */

console.log('🔍 Starting Kanban Reorder Debug...\n');

// 1. Check if todos are loaded
const todoElements = document.querySelectorAll('[data-testid="todo-card"], .bg-white\\/95');
console.log(`✓ Found ${todoElements.length} todo cards in DOM`);

// 2. Check if drag-and-drop listeners are attached
const dragElements = document.querySelectorAll('[class*="cursor-grab"]');
console.log(`✓ Found ${dragElements.length} draggable elements\n`);

// 3. Intercept router.post to log reorder requests
if (window.__INERTIA__) {
    console.log('✓ Inertia is loaded');
    
    // Store original post method
    const originalPost = window.router?.post;
    
    if (originalPost) {
        window.router.post = function(url, data, options) {
            if (url === '/todos/reorder') {
                console.log('📤 REORDER REQUEST SENT:');
                console.log('  URL:', url);
                console.log('  Column:', data.column);
                console.log('  Todo IDs:', data.todo_ids);
                console.log('  Options:', options);
            }
            return originalPost.call(this, url, data, options);
        };
        console.log('✓ Intercepted router.post for reorder requests\n');
    }
}

// 4. Monitor network requests
const originalFetch = window.fetch;
window.fetch = function(...args) {
    const url = args[0];
    if (url.includes('/todos/reorder')) {
        console.log('🌐 FETCH REQUEST:');
        console.log('  URL:', url);
        console.log('  Method:', args[1]?.method || 'GET');
        console.log('  Body:', args[1]?.body);
    }
    return originalFetch.apply(this, args);
};
console.log('✓ Intercepted fetch for reorder requests\n');

// 5. Test drag simulation
console.log('📋 HOW TO TEST:');
console.log('1. Try dragging a todo card to a different position');
console.log('2. Watch the console for REORDER REQUEST SENT logs');
console.log('3. Check the Network tab for POST /todos/reorder requests');
console.log('4. Look for response status 200 and JSON response');
console.log('5. If you see errors, they will be logged below\n');

// 6. Add error logging
window.addEventListener('error', (event) => {
    if (event.message.includes('reorder') || event.message.includes('drag')) {
        console.error('❌ ERROR:', event.message);
    }
});

console.log('✅ Debug mode activated. Try reordering a todo now.\n');

// 7. Create helper to manually test reorder
window.testReorder = async function(columnId, todoIds) {
    console.log(`\n🧪 Testing reorder with column=${columnId}, todoIds=${todoIds}`);
    
    try {
        const response = await fetch('/todos/reorder', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                column: columnId,
                todo_ids: todoIds,
            }),
        });
        
        console.log(`📊 Response Status: ${response.status}`);
        const data = await response.json();
        console.log('📦 Response Data:', data);
        
        if (response.ok) {
            console.log('✅ Reorder successful!');
        } else {
            console.error('❌ Reorder failed!');
        }
    } catch (error) {
        console.error('❌ Error during reorder test:', error);
    }
};

console.log('💡 TIP: Use window.testReorder("q1", [1, 2, 3]) to manually test reorder\n');
