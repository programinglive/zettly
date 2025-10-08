import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import { 
    Image, 
    FileText, 
    Trash2, 
    Download,
    Eye,
    X
} from 'lucide-react';

export default function AttachmentList({ attachments = [], onAttachmentDeleted, className = '' }) {
    const [deletingId, setDeletingId] = useState(null);
    const [previewImage, setPreviewImage] = useState(null);

    const handleDelete = async (attachmentId) => {
        if (!confirm('Are you sure you want to delete this attachment?')) {
            return;
        }

        setDeletingId(attachmentId);

        try {
            await router.delete(`/attachments/${attachmentId}`, {
                onSuccess: () => {
                    if (onAttachmentDeleted) {
                        onAttachmentDeleted(attachmentId);
                    }
                },
                onError: (errors) => {
                    // Error handling via Inertia
                },
                onFinish: () => {
                    setDeletingId(null);
                }
            });
        } catch (error) {
            setDeletingId(null);
        }
    };

    const handleDownload = (attachment) => {
        window.open(`/attachments/${attachment.id}/download`, '_blank');
    };

    const getFileIcon = (attachment) => {
        if (attachment.type === 'image') {
            return <Image className="h-5 w-5 text-green-500" />;
        }
        return <FileText className="h-5 w-5 text-blue-500" />;
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

    const openImagePreview = (attachment) => {
        if (attachment.type === 'image') {
            setPreviewImage(attachment);
        }
    };

    const closeImagePreview = () => {
        setPreviewImage(null);
    };

    if (!attachments || attachments.length === 0) {
        return (
            <div className={`text-center py-8 text-gray-500 ${className}`}>
                <FileText className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                <p>No attachments yet</p>
            </div>
        );
    }

    return (
        <>
            <div className={`space-y-3 ${className}`}>
                {attachments.map((attachment) => (
                    <div
                        key={attachment.id}
                        className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                        {/* Thumbnail or Icon */}
                        <div className="flex-shrink-0">
                            {attachment.type === 'image' ? (
                                <div 
                                    className="relative cursor-pointer group"
                                    onClick={() => openImagePreview(attachment)}
                                >
                                    <img
                                        src={attachment.thumbnail_url || attachment.url}
                                        alt={attachment.original_name}
                                        className="h-12 w-12 object-cover rounded border"
                                        onError={(e) => {
                                            // Fallback to file icon if image fails to load
                                            e.target.style.display = 'none';
                                            e.target.nextSibling.style.display = 'flex';
                                        }}
                                    />
                                    <div className="h-12 w-12 items-center justify-center bg-white dark:bg-gray-600 rounded border hidden">
                                        <Image className="h-5 w-5 text-green-500" />
                                    </div>
                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 rounded flex items-center justify-center transition-all">
                                        <Eye className="h-5 w-5 text-white opacity-0 group-hover:opacity-100" />
                                    </div>
                                </div>
                            ) : (
                                <div className="h-12 w-12 flex items-center justify-center bg-white dark:bg-gray-600 rounded border">
                                    {getFileIcon(attachment)}
                                </div>
                            )}
                        </div>

                        {/* File Info */}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {attachment.original_name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {formatFileSize(attachment.file_size)} • {attachment.mime_type}
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => handleDownload(attachment)}
                                className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                                title="Download"
                            >
                                <Download className="h-4 w-4" />
                            </button>
                            
                            <button
                                onClick={() => handleDelete(attachment.id)}
                                disabled={deletingId === attachment.id}
                                className="p-1 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                                title="Delete"
                            >
                                {deletingId === attachment.id ? (
                                    <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
                                ) : (
                                    <Trash2 className="h-4 w-4" />
                                )}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Image Preview Modal */}
            {previewImage && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75"
                    onClick={closeImagePreview}
                >
                    <div className="relative max-w-4xl max-h-full p-4">
                        <img
                            src={previewImage.url}
                            alt={previewImage.original_name}
                            className="max-w-full max-h-full object-contain"
                        />
                        <button
                            onClick={closeImagePreview}
                            className="absolute top-2 right-2 text-white hover:text-gray-300 bg-black bg-opacity-50 rounded-full p-2"
                        >
                            <X className="h-6 w-6" />
                        </button>
                        <div className="absolute bottom-2 left-2 text-white bg-black bg-opacity-50 rounded px-3 py-1">
                            <p className="text-sm font-medium">{previewImage.original_name}</p>
                            <p className="text-xs">{formatFileSize(previewImage.file_size)}</p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
