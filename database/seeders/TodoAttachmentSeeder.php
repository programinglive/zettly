<?php

namespace Database\Seeders;

use App\Models\Todo;
use App\Models\TodoAttachment;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;

class TodoAttachmentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get some existing todos
        $todos = Todo::take(3)->get();

        if ($todos->isEmpty()) {
            $this->command->info('No todos found. Please run TodoSeeder first.');

            return;
        }

        foreach ($todos as $todo) {
            // Create 1-3 sample attachments per todo
            $attachmentCount = rand(1, 3);

            for ($i = 0; $i < $attachmentCount; $i++) {
                // Create sample file content
                $isImage = rand(0, 1);

                if ($isImage) {
                    // Sample image attachment
                    $fileName = 'sample-image-'.$i.'.jpg';
                    $filePath = "todos/{$todo->id}/attachments/{$fileName}";

                    // Create a simple placeholder image content (not a real image, just for demo)
                    Storage::disk('public')->put($filePath, 'Sample image content for demo');

                    TodoAttachment::create([
                        'todo_id' => $todo->id,
                        'original_name' => "Sample Image {$i}.jpg",
                        'file_name' => $fileName,
                        'file_path' => $filePath,
                        'mime_type' => 'image/jpeg',
                        'file_size' => 1024 * rand(50, 500), // 50KB to 500KB
                        'type' => 'image',
                        'thumbnail_path' => "todos/{$todo->id}/thumbnails/thumb_{$fileName}",
                    ]);
                } else {
                    // Sample document attachment
                    $fileName = 'sample-document-'.$i.'.pdf';
                    $filePath = "todos/{$todo->id}/attachments/{$fileName}";

                    Storage::disk('public')->put($filePath, 'Sample PDF content for demo');

                    TodoAttachment::create([
                        'todo_id' => $todo->id,
                        'original_name' => "Sample Document {$i}.pdf",
                        'file_name' => $fileName,
                        'file_path' => $filePath,
                        'mime_type' => 'application/pdf',
                        'file_size' => 1024 * rand(100, 1000), // 100KB to 1MB
                        'type' => 'document',
                        'thumbnail_path' => null,
                    ]);
                }
            }
        }

        $this->command->info('Sample attachments created successfully!');
    }
}
