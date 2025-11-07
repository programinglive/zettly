import { useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';

export default function ImageWithFallback({
    src,
    alt,
    className = '',
    fallbackClassName = '',
    initials = '',
}) {
    const [imageError, setImageError] = useState(false);

    if (!src || imageError) {
        return (
            <div
                className={`flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 ${fallbackClassName || className}`}
            >
                {initials ? (
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {initials}
                    </span>
                ) : (
                    <ImageIcon className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                )}
            </div>
        );
    }

    return (
        <img
            src={src}
            alt={alt}
            className={className}
            onError={() => setImageError(true)}
        />
    );
}
