<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;

class UploadTestController extends Controller
{
    public function show(Request $request)
    {
        return Inertia::render('Upload/Test', [
            'uploadedUrl' => $request->session()->get('uploaded_url'),
            'uploadedPath' => $request->session()->get('uploaded_path'),
            'disk' => config('todo.attachments_disk', 'public'),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'file' => 'required|file|max:10240',
        ]);

        $disk = config('todo.attachments_disk', 'public');
        $file = $validated['file'];
        $fileName = Str::uuid().'.'.$file->getClientOriginalExtension();
        $filePath = 'uploads/tests/'.$fileName;

        Storage::disk($disk)->putFileAs('uploads/tests', $file, $fileName, [
            'visibility' => config("filesystems.disks.{$disk}.visibility", 'public'),
        ]);

        $storage = Storage::disk($disk);
        try {
            if (method_exists($storage, 'url')) {
                $url = $storage->url($filePath);
            } else {
                throw new \RuntimeException('Disk does not support url method');
            }
        } catch (\Throwable $exception) {
            $baseUrl = config("filesystems.disks.{$disk}.url")
                ?? sprintf('https://storage.googleapis.com/%s', config("filesystems.disks.{$disk}.bucket"));

            $url = rtrim($baseUrl, '/').'/'.ltrim($filePath, '/');
        }

        return redirect()
            ->route('upload.show')
            ->with('uploaded_url', $url)
            ->with('uploaded_path', $filePath)
            ->with('success', 'File uploaded.');
    }
}
