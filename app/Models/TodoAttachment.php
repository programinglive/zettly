<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class TodoAttachment extends Model
{
    use HasFactory;
    
    protected $fillable = [
        'todo_id',
        'original_name',
        'file_name',
        'file_path',
        'mime_type',
        'file_size',
        'type',
        'thumbnail_path',
    ];

    protected $casts = [
        'file_size' => 'integer',
    ];

    protected $appends = [
        'url',
        'thumbnail_url',
        'formatted_file_size',
    ];

    public function todo(): BelongsTo
    {
        return $this->belongsTo(Todo::class);
    }

    public function getUrlAttribute(): string
    {
        return Storage::url($this->file_path);
    }

    public function getThumbnailUrlAttribute(): ?string
    {
        return $this->thumbnail_path ? Storage::url($this->thumbnail_path) : null;
    }

    public function getFormattedFileSizeAttribute(): string
    {
        $bytes = $this->file_size;
        $units = ['B', 'KB', 'MB', 'GB'];
        
        for ($i = 0; $bytes > 1024 && $i < count($units) - 1; $i++) {
            $bytes /= 1024;
        }
        
        return round($bytes, 2) . ' ' . $units[$i];
    }

    public function isImage(): bool
    {
        return $this->type === 'image';
    }

    public function isDocument(): bool
    {
        return $this->type === 'document';
    }

    public static function determineType(string $mimeType): string
    {
        if (str_starts_with($mimeType, 'image/')) {
            return 'image';
        }
        
        $documentTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain',
        ];
        
        return in_array($mimeType, $documentTypes) ? 'document' : 'other';
    }
}
