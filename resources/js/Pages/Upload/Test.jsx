import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';

export default function UploadTest({ uploadedUrl, uploadedPath, disk }) {
    const [fileName, setFileName] = useState('');

    return (
        <div className="min-h-screen bg-gray-100">
            <Head title="Upload Test" />

            <div className="max-w-3xl mx-auto py-10 px-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-semibold text-gray-900">Upload Test</h1>
                    <p className="text-sm text-gray-500 mt-2">
                        Files will be stored on the <span className="font-medium">{disk}</span> disk.
                    </p>
                </div>

                <form
                    action={route('upload.store')}
                    method="post"
                    encType="multipart/form-data"
                    className="bg-white shadow rounded-lg p-6 space-y-4"
                >
                    <input type="hidden" name="_token" value={window.Laravel?.csrf ?? document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')} />

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Choose file</label>
                        <input
                            type="file"
                            name="file"
                            required
                            className="mt-1 block w-full text-sm text-gray-600"
                            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? '')}
                        />
                        {fileName && (
                            <p className="text-xs text-gray-500 mt-1">Selected: {fileName}</p>
                        )}
                    </div>

                    <button
                        type="submit"
                        className="inline-flex items-center px-4 py-2 bg-blue-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        Upload
                    </button>
                </form>

                {(uploadedUrl || uploadedPath) && (
                    <div className="mt-8 bg-white shadow rounded-lg p-6">
                        <h2 className="text-lg font-medium text-gray-900">Latest upload</h2>
                        {uploadedPath && (
                            <p className="text-sm text-gray-500 mt-2">
                                Stored at: <span className="font-mono">{uploadedPath}</span>
                            </p>
                        )}
                        {uploadedUrl && (
                            <div className="mt-4 space-y-3">
                                <a
                                    href={uploadedUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center px-3 py-2 bg-green-600 text-white text-sm font-semibold rounded hover:bg-green-500"
                                >
                                    Open uploaded file
                                </a>
                                {uploadedUrl.match(/\.(jpg|jpeg|png|gif)$/i) && (
                                    <img
                                        src={uploadedUrl}
                                        alt="Uploaded preview"
                                        className="max-w-full rounded border"
                                    />
                                )}
                            </div>
                        )}

                        <div className="mt-4">
                            <Link
                                href={route('upload.show')}
                                className="text-sm text-blue-600 hover:text-blue-500"
                            >
                                Clear and upload another file
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
