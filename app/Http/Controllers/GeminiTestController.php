<?php

namespace App\Http\Controllers;

use App\Models\Todo;
use Gemini\Laravel\Facades\Gemini;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class GeminiTestController extends Controller
{
    // In your controller or service
    public function test()
    {
        $response = Gemini::models()->list();

        $modelNames = array_map(fn ($model) => $model->name, $response->models);

        dd($modelNames);
    }

    public function chat(Request $request)
    {
        $request->validate([
            'message' => 'required|string',
        ]);

        // 1. Fetch all todos for the current user
        $todos = Todo::where('user_id', Auth::id())
            ->select(['title', 'description', 'priority', 'is_completed'])
            ->get();

        // 2. Format the todos into a string for the prompt
        $todoContext = "Here is my current to-do list:\n\n";
        foreach ($todos as $todo) {
            $status = $todo->is_completed ? '[Completed]' : '[Pending]';
            $todoContext .= "- {$status} {$todo->title}\n";
            if ($todo->description) {
                $todoContext .= "  Description: {$todo->description}\n";
            }
            if ($todo->priority) {
                $todoContext .= "  Priority: {$todo->priority}\n";
            }
            $todoContext .= "\n";
        }

        // 3. Construct the full prompt
        $prompt = "Based on the following to-do list, please answer my question.\n\n"
            .$todoContext
            ."My question is: {$request->input('message')}";

        // 4. Call the Gemini API
        $result = Gemini::generativeModel('models/gemini-pro-latest')
            ->generateContent($prompt);

        // 5. Return the response
        return response()->json([
            'response' => $result->text(),
        ]);
    }
}
