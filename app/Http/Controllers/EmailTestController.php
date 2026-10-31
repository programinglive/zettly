<?php

namespace App\Http\Controllers;

use App\Mail\TestEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;
use Throwable;

class EmailTestController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('Test/EmailTest', [
            'defaults' => [
                'recipient' => $request->user()?->email,
                'subject' => 'Zettly Test Email',
            ],
            'flash' => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
            ],
        ]);
    }

    public function send(Request $request): RedirectResponse|JsonResponse
    {
        $validated = $request->validate([
            'recipient' => ['required', 'email', 'max:255'],
            'subject' => ['required', 'string', 'max:120'],
            'message' => ['required', 'string', 'max:5000'],
        ]);

        try {
            Mail::to($validated['recipient'])->send(
                new TestEmail(
                    $validated['subject'],
                    $validated['message'],
                    $request->user()?->name
                )
            );

            if ($request->expectsJson()) {
                return response()->json(['success' => true, 'message' => 'Test email dispatched successfully.']);
            }

            return redirect()
                ->route('test.email')
                ->with('success', 'Test email dispatched successfully. Check the configured mailer output.');
        } catch (TransportExceptionInterface|Throwable $exception) {
            Log::error('Failed to send test email.', [
                'exception' => $exception,
            ]);

            $details = Str::of($exception->getMessage() ?? '')
                ->squish()
                ->limit(160);

            $message = 'Failed to send test email. Please verify the mail configuration.';

            if ($details->isNotEmpty()) {
                $message .= ' ('.$details.')';
            }

            if ($request->expectsJson()) {
                return response()->json(['message' => $message], 502);
            }

            return redirect()
                ->back()
                ->withInput()
                ->with('error', $message);
        }
    }
}
