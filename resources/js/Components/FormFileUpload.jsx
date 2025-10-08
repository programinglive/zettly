import React, { useState, useRef } from 'react';
import { Upload, X, Eye, FileText, Image as ImageIcon } from 'lucide-react';

export default function FormFileUpload({ files = [], onFilesChange, className = '' }) {
    const [isDragOver, setIsDragOver] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const fileInputRef = useRef(null);

    const handleFileSelect = (newFiles) => {
        if (newFiles && newFiles.length > 0) {
            const fileArray = Array.from(newFiles);
            const updatedFiles = [...files, ...fileArray];
            onFilesChange(updatedFiles);
        }
    };

    const handleRemoveFile = (index) => {
        const updatedFiles = files.filter((_, i) => i !== index);
        onFilesChange(updatedFiles);
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
        const droppedFiles = e.dataTransfer.files;
        handleFileSelect(droppedFiles);
    };

    const handleFileInputChange = (e) => {
        handleFileSelect(e.target.files);
    };

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    const isImage = (file) => {
        return file.type.startsWith('image/');
    };

    const getFilePreviewUrl = (file) => {
        return URL.createObjectURL(file);
    };

    const formatFileSize = (bytes) => {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        
        return `${size.toFixed(1)} ${units[unitIndex]}`;
    };

    const openImagePreview = (file) => {
        if (isImage(file)) {
            setPreviewImage(file);
        }
    };

    const closeImagePreview = () => {
        setPreviewImage(null);
    };

    return (
        <>
            <div className={className}>
                {/* Upload Area */}
                <div
                    className={`
                        relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
                        transition-colors duration-200
                        ${isDragOver 
                            ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' 
                            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                        }
                    `}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={handleClick}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={handleFileInputChange}
                        multiple
                        accept="image/*,.pdf,.doc,.docx,.txt"
                    />
                    
                    <Upload className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                    
                    <div className="mt-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            <span className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400">
                                Click to upload
                            </span>
                            {' '}or drag and drop
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Images, PDFs, documents up to 10MB each
                        </p>
                    </div>
                </div>

                {/* File List */}
                {files.length > 0 && (
                    <div className="mt-4 space-y-3">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Selected Files ({files.length})
                        </h4>
                        {files.map((file, index) => (
                            <div
                                key={index}
                                className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                            >
                                {/* Thumbnail or Icon */}
                                <div className="flex-shrink-0">
                                    {isImage(file) ? (
                                        <div 
                                            className="relative cursor-pointer group"
                                            onClick={() => openImagePreview(file)}
                                        >
                                            <img
                                                src={getFilePreviewUrl(file)}
                                                alt={file.name}
                                                className="h-12 w-12 object-cover rounded border"
                                            />
                                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 rounded flex items-center justify-center transition-all">
                                                <Eye className="h-5 w-5 text-white opacity-0 group-hover:opacity-100" />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="h-12 w-12 flex items-center justify-center bg-white dark:bg-gray-600 rounded border">
                                            <FileText className="h-5 w-5 text-blue-500" />
                                        </div>
                                    )}
                                </div>

                                {/* File Info */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                        {file.name}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {formatFileSize(file.size)} • {file.type}
                                    </p>
                                </div>

                                {/* Remove Button */}
                                <button
                                    type="button"
                                    onClick={() => handleRemoveFile(index)}
                                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                    title="Remove file"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Image Preview Modal */}
            {previewImage && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75"
                    onClick={closeImagePreview}
                >
                    <div className="relative max-w-4xl max-h-full p-4">
                        <img
                            src={getFilePreviewUrl(previewImage)}
                            alt={previewImage.name}
                            className="max-w-full max-h-full object-contain"
                        />
                        <button
                            onClick={closeImagePreview}
                            className="absolute top-2 right-2 text-white hover:text-gray-300 bg-black bg-opacity-50 rounded-full p-2"
                        >
                            <X className="h-6 w-6" />
                        </button>
                        <div className="absolute bottom-2 left-2 text-white bg-black bg-opacity-50 rounded px-3 py-1">
                            <p className="text-sm font-medium">{previewImage.name}</p>
                            <p className="text-xs">{formatFileSize(previewImage.size)}</p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
