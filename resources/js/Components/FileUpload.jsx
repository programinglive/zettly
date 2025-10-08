import React, { useState, useRef } from 'react';
import { router } from '@inertiajs/react';
import { Upload } from 'lucide-react';

export default function FileUpload({ todoId, onUploadSuccess, className = '' }) {
    const [isDragOver, setIsDragOver] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);

    const handleFileSelect = (files) => {
        if (files && files.length > 0) {
            uploadFile(files[0]);
        }
    };

    const uploadFile = async (file) => {
        setIsUploading(true);
        
        const formData = new FormData();
        formData.append('file', file);

        try {
            await router.post(`/todos/${todoId}/attachments`, formData, {
                forceFormData: true,
                onSuccess: (page) => {
                    if (onUploadSuccess) {
                        onUploadSuccess();
                    }
                },
                onError: (errors) => {
                    // Error handling via Inertia
                },
                onFinish: () => {
                    setIsUploading(false);
                }
            });
        } catch (error) {
            setIsUploading(false);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        const files = e.dataTransfer.files;
        handleFileSelect(files);
    };

    const handleFileInputChange = (e) => {
        handleFileSelect(e.target.files);
    };

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className={className}>
            <div
                className={`
                    relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
                    transition-colors duration-200
                    ${isDragOver 
                        ? 'border-blue-400 bg-blue-50' 
                        : 'border-gray-300 hover:border-gray-400'
                    }
                    ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={!isUploading ? handleClick : undefined}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileInputChange}
                    disabled={isUploading}
                    accept="image/*,.pdf,.doc,.docx,.txt"
                />
                
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                
                <div className="mt-4">
                    {isUploading ? (
                        <div className="text-sm text-gray-600">
                            <div className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"></div>
                            Uploading...
                        </div>
                    ) : (
                        <>
                            <p className="text-sm text-gray-600">
                                <span className="font-medium text-blue-600 hover:text-blue-500">
                                    Click to upload
                                </span>
                                {' '}or drag and drop
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                Images, PDFs, documents up to 10MB
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
