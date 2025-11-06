<?php

namespace App\Http\Controllers;

use App\Mail\TestEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;
use Inertia\Response;

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
            ],
        ]);
    }

    public function send(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'recipient' => ['required', 'email', 'max:255'],
            'subject' => ['required', 'string', 'max:120'],
            'message' => ['required', 'string', 'max:5000'],
        ]);

        Mail::to($validated['recipient'])->send(
            new TestEmail(
                $validated['subject'],
                $validated['message'],
                $request->user()?->name
            )
        );

        return redirect()
            ->route('test.email')
            ->with('success', 'Test email dispatched successfully. Check the configured mailer output.');
    }
}
