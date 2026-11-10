<?php

namespace App\Http\Controllers;

use App\Models\Todo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class CodingAgentPromptController extends Controller
{
    public function generate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'todo_id' => ['nullable', 'integer'],
            'instruction' => ['nullable', 'string', 'max:5000'],
            'repository' => ['nullable', 'string'],
            'model' => ['nullable', 'string'],
        ]);

        $todoTitle = '';
        $todoDescription = '';

        if (! empty($validated['todo_id'])) {
            $todo = Todo::query()->where('user_id', $request->user()->id)
                ->whereKey($validated['todo_id'])->first();
            if ($todo) {
                $todoTitle = (string) $todo->title;
                $todoDescription = (string) ($todo->description ?? '');
            }
        }

        $roughInstruction = trim((string) ($validated['instruction'] ?? ''));
        $repository = (string) ($validated['repository'] ?? 'zettly');
        $model = (string) ($validated['model'] ?? config('coding_agent.default_model', 'agnes-3-0-flash:free'));

        $apiKey = config('coding_agent.kenari_api_key');
        $baseUrl = rtrim(config('coding_agent.kenari_base_url', 'https://kenari.id/v1'), '/');

        if (! $apiKey) {
            return response()->json([
                'error' => 'Kenari API key is not configured in CODING_AGENT_KENARI_API_KEY.',
            ], 503);
        }

        $promptContext = [];
        if ($todoTitle !== '') {
            $promptContext[] = "Target Todo: {$todoTitle}";
        }
        if ($todoDescription !== '') {
            $promptContext[] = "Todo Context: {$todoDescription}";
        }
        if ($repository !== '') {
            $promptContext[] = "Repository: {$repository}";
        }
        if ($roughInstruction !== '') {
            $promptContext[] = "Developer's Rough Notes / Intent: {$roughInstruction}";
        }

        $userContent = implode("\n\n", $promptContext);
        if ($userContent === '') {
            return response()->json(['error' => 'Please select a Todo or enter instructions.'], 422);
        }

        $systemPrompt = <<<PROMPT
You are an expert principal software engineer and prompt architect.
Your goal is to write a high-precision, unambiguous prompt for an autonomous coding agent (like Codex or Claude) that will execute changes in this Git repository.

Structure the prompt cleanly with:
1. **Overview / Goal**: What needs to be implemented or fixed.
2. **Key Implementation Steps**: Core files, classes, methods, and edge cases to handle.
3. **Testing & Verification (TDD)**: Explicit instruction to write failing unit/feature tests first, make them green, and run the project's test suite (e.g. php artisan test / npm test) before finishing.
4. **Constraints**: Maintain clean code, follow Conventional Commits, and do not break existing functionality.

CRITICAL: Return ONLY the raw prompt text for the coding agent. Do NOT include markdown code fences around the entire response, greetings, or conversational remarks like "Here is your prompt:". Start directly with the prompt content.
PROMPT;

        try {
            $response = Http::timeout(30)->withToken($apiKey)->post("{$baseUrl}/chat/completions", [
                'model' => $model,
                'messages' => [
                    ['role' => 'system', 'content' => $systemPrompt],
                    ['role' => 'user', 'content' => $userContent],
                ],
                'temperature' => 0.4,
            ]);

            if ($response->successful()) {
                $content = $response->json('choices.0.message.content');
                $generated = trim((string) $content);
                if ($generated !== '') {
                    return response()->json(['prompt' => $generated]);
                }
            }

            Log::warning('Kenari prompt generation failed: ' . $response->body());
            return response()->json(['error' => 'AI prompt generation returned an empty or failed response.'], 502);
        } catch (\Throwable $e) {
            Log::error('Kenari prompt generation exception: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to connect to AI provider: ' . $e->getMessage()], 500);
        }
    }
}
