<?php

namespace Tests;

use Illuminate\Contracts\Foundation\Application;
use Tests\Concerns\SkipsViteWhenUnbuilt;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    use SkipsViteWhenUnbuilt;
}
