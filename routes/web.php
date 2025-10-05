<?php

use App\Http\Controllers\HomeController;
use App\Http\Controllers\TodoController;
use Illuminate\Support\Facades\Route;

Route::get('/', [HomeController::class, 'index'])->name('home');

Route::resource('todos', TodoController::class);
Route::post('todos/{todo}/toggle', [TodoController::class, 'toggle'])->name('todos.toggle');
