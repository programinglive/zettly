<?php

namespace App\Http\Controllers;

use App\Models\Todo;
use Gemini\Exceptions\TransporterException;
use Gemini\Laravel\Facades\Gemini;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Throwable;

class GeminiTestController extends Controller
{
    // In your controller or service
    public function test()
    {
        $response = Gemini::models()->list();

        $modelNames = array_map(fn ($model) => $model->name, $response->models);

        dd($modelNames);
    }

    public function chat(Request $request): JsonResponse
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
        try {
            $result = Gemini::generativeModel('models/gemini-2.5-flash')
                ->generateContent($prompt);

            // 5. Return the response
            return response()->json([
                'response' => $result->text(),
            ]);
        } catch (TransporterException $exception) {
            Log::warning('Gemini generateContent request timed out.', [
                'exception' => $exception,
            ]);

            return response()->json([
                'error' => 'Gemini service timed out. Please try again later.',
            ], 504);
        } catch (Throwable $exception) {
            Log::error('Gemini chat request failed.', [
                'exception' => $exception,
            ]);

            return response()->json([
                'error' => 'Unable to process Gemini request at the moment.',
            ], 500);
        }
    }
}
