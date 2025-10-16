<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Gemini\Laravel\Facades\Gemini;

class GeminiTestController extends Controller
{
    public function test()
    {
        $result = Gemini::geminiPro()->generateContent('Hello');

        return $result->text();
    }
}