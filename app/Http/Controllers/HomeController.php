<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class HomeController extends Controller
{
    public function index(Request $request): Response|RedirectResponse
    {
        if ($request->user()) {
            return redirect()->route('summary.index');
        }

        return Inertia::render('Home/Index', [
            'message' => 'Welcome to Zettly!',
        ]);
    }
}
