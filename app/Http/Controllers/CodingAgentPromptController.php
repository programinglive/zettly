<?php

namespace App\Http\Controllers;

use App\Models\Todo;
use App\Support\CodingAgentRepositoryRegistry;
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
            'instruction' => ['nullable', 'string', 'max:20000'],
            'repository' => ['nullable', 'string'],
            'model' => ['nullable', 'string'],
        ]);

        $todoTitle = '';
        $todoDescription = '';
        $checklistLines = [];

        if (! empty($validated['todo_id'])) {
            $todo = Todo::query()->where('user_id', $request->user()->id)
                ->with('checklistItems')
                ->whereKey($validated['todo_id'])->first();
            if ($todo) {
                $todoTitle = (string) $todo->title;
                $todoDescription = (string) ($todo->description ?? '');
                foreach ($todo->checklistItems as $item) {
                    $mark = $item->is_completed ? 'x' : ' ';
                    $checklistLines[] = "- [{$mark}] {$item->title}";
                }
            }
        }

        $roughInstruction = trim((string) ($validated['instruction'] ?? ''));
        $repository = (string) ($validated['repository'] ?? 'zettly');
        $repoMeta = CodingAgentRepositoryRegistry::find($repository);
        $model = (string) ($validated['model'] ?? config('coding_agent.default_model', 'qwen3-5-397b-a17b:free'));

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
        if ($checklistLines !== []) {
            $promptContext[] = "Definition of Done (Checklist):\n" . implode("\n", $checklistLines);
        }
        if ($repository !== '') {
            $repoLine = "Repository: {$repository}";
            if ($repoMeta) {
                $repoLine .= " ({$repoMeta['remote']} @ {$repoMeta['base']}, stack: {$repoMeta['stack']})";
                if ($repoMeta['checks'] !== '') {
                    $repoLine .= "\nRequired Verification Command: {$repoMeta['checks']}";
                }
            }
            $promptContext[] = $repoLine;
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
5. **Length**: Keep the prompt focused, concise, actionable, and under 4,500 characters so it fits cleanly into the instruction buffer.

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
                    // Truncate to job instruction max length (5000 chars) with a safe margin.
                    // Prefer cutting at a paragraph boundary to preserve readability.
                    $maxLen = 4900;
                    if (mb_strlen($generated) > $maxLen) {
                        $truncated = mb_substr($generated, 0, $maxLen);
                        // Try to cut at the last paragraph break for clean output.
                        $lastPara = mb_strrpos($truncated, "\n\n");
                        if ($lastPara !== false && $lastPara > $maxLen / 2) {
                            $truncated = mb_substr($truncated, 0, $lastPara);
                        }
                        $generated = rtrim($truncated) . "\n\n[Prompt truncated to fit instruction limit]";
                    }

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
