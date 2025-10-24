/*
|--------------------------------------------------------------------------
| Todo API Documentation
|--------------------------------------------------------------------------
|
| Complete CRUD API for Todo management with Sanctum authentication
| Base URL: https://yourdomain.com/api
|
*/

// Authentication required for all endpoints
// Use Bearer token authentication

/*
|--------------------------------------------------------------------------
| Authentication
|--------------------------------------------------------------------------
|
| 1. Create API token in Profile page (/profile)
| 2. Use token in Authorization header: Bearer YOUR_TOKEN_HERE
| 3. Or use session authentication for same-origin requests
|
*/

/*
|--------------------------------------------------------------------------
| CORS Configuration
|--------------------------------------------------------------------------
|
| The API includes CORS middleware to allow cross-origin requests from
| external applications. All API routes support:
|
| - Access-Control-Allow-Origin: *
| - Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
| - Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-CSRF-TOKEN
| - Access-Control-Allow-Credentials: true
|
| This enables your deployed Laravel app to be accessed from any domain.
|
*/

/*
|--------------------------------------------------------------------------
| API Endpoints
|--------------------------------------------------------------------------
*/

/**
 * GET /api/todos
 * List user's todos with optional filtering
 *
 * Query Parameters:
 * - filter: 'completed', 'pending', or null for all
 *
 * Example: GET /api/todos?filter=completed
 */
Route::get('/todos', [TodoController::class, 'index']);

/**
 * POST /api/todos
 * Create a new todo
 *
 * Body:
 * {
 *   "title": "Required string",
 *   "description": "Optional string"
 *   "priority": "Optional enum not_urgent|urgent",
 *   "importance": "Optional enum not_important|important",
 *   "due_date": "Optional date string (YYYY-MM-DD)"
 * }
 */
Route::post('/todos', [TodoController::class, 'store']);

/**
 * GET /api/todos/{id}
 * Get a specific todo
 */
Route::get('/todos/{todo}', [TodoController::class, 'show']);

/**
 * PUT /api/todos/{id}
 * Update a todo
 *
 * Body:
 * {
 *   "title": "Optional string",
 *   "description": "Optional string",
 *   "is_completed": "Optional boolean",
 *   "priority": "Optional enum not_urgent|urgent",
 *   "importance": "Optional enum not_important|important",
 *   "due_date": "Optional date string (YYYY-MM-DD)"
 * }
 */
Route::put('/api/todos/{todo}', [TodoController::class, 'update']);

/**
 * DELETE /api/todos/{id}
 * Delete a todo
 */
Route::delete('/todos/{todo}', [TodoController::class, 'destroy']);

/**
 * PATCH /api/todos/{id}/toggle
 * Toggle completion status of a todo
 */
Route::patch('/todos/{todo}/toggle', [TodoController::class, 'toggle']);

/*
|--------------------------------------------------------------------------
| Example Usage with JavaScript
|--------------------------------------------------------------------------
*/

/*
// Create todo
const createTodo = async (title, description) => {
  const response = await fetch('/api/todos', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_TOKEN_HERE',
      'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
    },
    body: JSON.stringify({ title, description })
  });
  return response.json();
};

// Get todos
const getTodos = async (filter = null) => {
  const url = filter ? `/api/todos?filter=${filter}` : '/api/todos';
  const response = await fetch(url, {
    headers: {
      'Authorization': 'Bearer YOUR_TOKEN_HERE'
    }
  });
  return response.json();
};

// Update todo
const updateTodo = async (id, data) => {
  const response = await fetch(`/api/todos/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_TOKEN_HERE',
      'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
    },
    body: JSON.stringify(data)
  });
  return response.json();
};

// Toggle todo completion
const toggleTodo = async (id) => {
  const response = await fetch(`/api/todos/${id}/toggle`, {
    method: 'PATCH',
    headers: {
      'Authorization': 'Bearer YOUR_TOKEN_HERE',
      'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
    }
  });
  return response.json();
};

// Delete todo
const deleteTodo = async (id) => {
  const response = await fetch(`/api/todos/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': 'Bearer YOUR_TOKEN_HERE',
      'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
    }
  });
  return response.json();
};
*/

/*
|--------------------------------------------------------------------------
| Response Format
|--------------------------------------------------------------------------
|
| All API responses follow this format:
|
| Success Response:
| {
|   "success": true,
|   "data": { ... },
|   "message": "Optional message"
| }
|
| Error Response:
| {
|   "success": false,
|   "message": "Error description"
| }
|
*/

/*
|--------------------------------------------------------------------------
| CORS Configuration
|--------------------------------------------------------------------------
|
| For cross-origin requests, ensure your Laravel app has proper CORS setup.
| Sanctum handles authentication, but you may need additional CORS middleware
| for external applications accessing your API.
|
| Consider adding CORS middleware or configuring your web server.
|
*/
