<?php

namespace App\Services\Ai;

use RuntimeException;
use Throwable;

class KenariRequestException extends RuntimeException
{
    public function __construct(
        string $message,
        private readonly ?int $statusCode = null,
        private readonly bool $retryable = false,
        ?Throwable $previous = null,
    ) {
        parent::__construct($message, 0, $previous);
    }

    public function statusCode(): ?int
    {
        return $this->statusCode;
    }

    public function isRetryable(): bool
    {
        return $this->retryable;
    }
}
