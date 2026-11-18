<?php

namespace App\Http\Controllers;

use App\Models\Todo;
use App\Services\Ai\KenariClient;
use App\Services\Ai\KenariConfigurationException;
use App\Services\Ai\KenariModelNotAllowedException;
use App\Services\Ai\KenariRequestException;
use App\Support\CodingAgentRepositoryRegistry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class CodingAgentPromptController extends Controller
{
    public function __construct(private readonly KenariClient $kenariClient)
    {
    }

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
        $model = $validated['model'] ?? null;

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
            $result = $this->kenariClient->chat(
                messages: [
                    ['role' => 'system', 'content' => $systemPrompt],
                    ['role' => 'user', 'content' => $userContent],
                ],
                model: is_string($model) ? $model : null,
                options: ['temperature' => 0.4]
            );

            $generated = $result['content'];
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
        } catch (KenariConfigurationException $e) {
            return response()->json(['error' => $e->getMessage()], 503);
        } catch (KenariModelNotAllowedException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        } catch (KenariRequestException $e) {
            Log::warning('Kenari prompt generation failed', [
                'status' => $e->statusCode(),
                'error' => $e->getMessage(),
            ]);

            return response()->json(['error' => 'AI prompt generation returned an empty or failed response.'], 502);
        } catch (\Throwable $e) {
            Log::error('Kenari prompt generation exception: ' . $e->getMessage());

            return response()->json(['error' => 'Failed to connect to AI provider: ' . $e->getMessage()], 500);
        }
    }
}
