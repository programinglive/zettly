<?php

namespace Database\Factories;

use App\Models\Todo;
use App\Models\TodoAttachment;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\TodoAttachment>
 */
class TodoAttachmentFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $mimeTypes = [
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/gif' => 'gif',
            'application/pdf' => 'pdf',
            'text/plain' => 'txt',
            'application/msword' => 'doc',
        ];

        $mimeType = $this->faker->randomElement(array_keys($mimeTypes));
        $extension = $mimeTypes[$mimeType];
        $fileName = $this->faker->uuid() . '.' . $extension;
        $originalName = $this->faker->word() . '.' . $extension;

        return [
            'todo_id' => Todo::factory(),
            'original_name' => $originalName,
            'file_name' => $fileName,
            'file_path' => 'todos/1/attachments/' . $fileName,
            'mime_type' => $mimeType,
            'file_size' => $this->faker->numberBetween(1024, 10485760), // 1KB to 10MB
            'type' => TodoAttachment::determineType($mimeType),
            'thumbnail_path' => str_starts_with($mimeType, 'image/') 
                ? 'todos/1/thumbnails/thumb_' . $fileName 
                : null,
        ];
    }

    /**
     * Create an image attachment.
     */
    public function image(): static
    {
        return $this->state(fn (array $attributes) => [
            'mime_type' => 'image/jpeg',
            'type' => 'image',
            'file_name' => $this->faker->uuid() . '.jpg',
            'original_name' => $this->faker->word() . '.jpg',
        ]);
    }

    /**
     * Create a document attachment.
     */
    public function document(): static
    {
        return $this->state(fn (array $attributes) => [
            'mime_type' => 'application/pdf',
            'type' => 'document',
            'file_name' => $this->faker->uuid() . '.pdf',
            'original_name' => $this->faker->word() . '.pdf',
            'thumbnail_path' => null,
        ]);
    }
}
