# Zettly Attachments Feature

## Overview

The Zettly application now supports file attachments for todos. Users can upload images, documents, and other files to their todos, with automatic thumbnail generation for images and secure file handling.

## Features

### ✅ File Upload
- **Drag & Drop**: Users can drag files directly onto the upload area
- **Click to Upload**: Traditional file picker interface
- **File Size Limit**: 10MB maximum per file
- **Supported Types**: Images (jpg, png, gif), Documents (pdf, doc, docx, txt), and other file types

### ✅ Image Thumbnails
- **Automatic Generation**: Thumbnails are automatically created for image files
- **Fallback Support**: Uses basic PHP GD library if Intervention/Image is not available
- **Preview Modal**: Click on image thumbnails to view full-size images

### ✅ File Management
- **Download**: Users can download their uploaded files
- **Delete**: Users can remove attachments they no longer need
- **Security**: Users can only access their own attachments

### ✅ Visual Interface
- **File Icons**: Different icons for images vs documents
- **File Information**: Shows original filename, file size, and mime type
- **Responsive Design**: Works on desktop and mobile devices

## Technical Implementation

### Database Schema

```sql
CREATE TABLE todo_attachments (
    id BIGINT PRIMARY KEY,
    todo_id BIGINT REFERENCES todos(id) ON DELETE CASCADE,
    original_name VARCHAR(255),
    file_name VARCHAR(255),
    file_path VARCHAR(255),
    mime_type VARCHAR(255),
    file_size BIGINT,
    type ENUM('image', 'document', 'other'),
    thumbnail_path VARCHAR(255) NULLABLE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### Models

#### TodoAttachment Model
- **Relationships**: Belongs to Todo
- **Attributes**: File metadata, type detection, URL generation
- **Methods**: `isImage()`, `isDocument()`, `determineType()`

#### Todo Model Updates
- **New Relationship**: `hasMany(TodoAttachment::class)`
- **Eager Loading**: Attachments are loaded with todo details

### API Endpoints

```php
// Upload attachment
POST /todos/{todo}/attachments
- Validates file (max 10MB)
- Stores file in organized directory structure
- Generates thumbnails for images
- Returns attachment metadata

// Delete attachment
DELETE /attachments/{attachment}
- Removes file from storage
- Removes thumbnail if exists
- Deletes database record

// Download attachment
GET /attachments/{attachment}/download
- Serves file with original filename
- Enforces user ownership
```

### Frontend Components

#### FileUpload Component
- **Props**: `todoId`, `onUploadSuccess`, `className`
- **Features**: Drag & drop, progress indication, error handling
- **Styling**: Tailwind CSS with hover states and animations

#### AttachmentList Component
- **Props**: `attachments`, `onAttachmentDeleted`, `className`
- **Features**: Thumbnail display, file actions, image preview modal
- **Responsive**: Grid layout that adapts to screen size

### File Storage Structure

```
storage/app/public/
├── todos/
│   ├── {todo_id}/
│   │   ├── attachments/
│   │   │   ├── {uuid}.jpg
│   │   │   ├── {uuid}.pdf
│   │   │   └── ...
│   │   └── thumbnails/
│   │       ├── thumb_{uuid}.jpg
│   │       └── ...
```

### Security Measures

1. **File Validation**: Size limits, type checking
2. **User Authorization**: Users can only access their own files
3. **Secure Storage**: Files stored outside web root
4. **UUID Filenames**: Prevents filename conflicts and guessing
5. **Mime Type Detection**: Server-side validation of file types

## Testing

### Test Coverage
- ✅ File upload functionality
- ✅ User authorization (can't access others' files)
- ✅ File deletion
- ✅ File download
- ✅ Type determination logic
- ✅ Integration with todo show page

### Running Tests
```bash
vendor/bin/phpunit tests/Feature/TodoAttachmentTest.php
```

## Usage Examples

### Basic Upload
1. Navigate to a todo detail page
2. Scroll to the "Attachments" section
3. Drag a file onto the upload area or click to select
4. File uploads automatically and appears in the list

### Image Preview
1. Click on any image thumbnail
2. Full-size image opens in modal overlay
3. Click X or outside modal to close

### File Management
1. Use download button to save file locally
2. Use delete button to remove unwanted attachments
3. Confirm deletion in the popup dialog

## Future Enhancements

### Potential Improvements
- [ ] Bulk file upload
- [ ] File versioning
- [ ] Advanced image editing
- [ ] Cloud storage integration (S3, etc.)
- [ ] File sharing between users
- [ ] Advanced file search and filtering
- [ ] Attachment categories/tags

### Performance Optimizations
- [ ] Lazy loading for large attachment lists
- [ ] CDN integration for file serving
- [ ] Background thumbnail generation
- [ ] File compression for large images

## Configuration

### Environment Variables
```env
# File upload limits (optional, defaults shown)
MAX_FILE_SIZE=10240  # 10MB in KB
ALLOWED_FILE_TYPES=jpg,jpeg,png,gif,pdf,doc,docx,txt

# Storage configuration
FILESYSTEM_DISK=public

# Google Cloud Storage (optional)
TODO_ATTACHMENTS_DISK=gcs
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_STORAGE_BUCKET=your-bucket-name
GOOGLE_CLOUD_STORAGE_ROOT=null
GOOGLE_CLOUD_STORAGE_KEY_FILE=/absolute/path/to/service-account.json
# or provide raw JSON via GOOGLE_CLOUD_STORAGE_KEY_JSON
GOOGLE_CLOUD_STORAGE_VISIBILITY=public
GOOGLE_CLOUD_STORAGE_URL=https://storage.googleapis.com/your-bucket-name
```

### Google Cloud Storage Setup
- **Service Account**: Create a service account with `Storage Object Admin` access and download its JSON key.
- **Disk Selection**: Update `.env` to set `TODO_ATTACHMENTS_DISK=gcs` and provide the bucket credentials above.
- **Public Access**: Ensure the bucket grants appropriate read access when using public visibility.
- **Uniform Bucket-Level Access (UBLA)**: If UBLA is enabled on your bucket, leave object-level ACLs to GCS. The application avoids setting per-object ACLs automatically, so no additional configuration is needed.
- **Key File Placement**: If `GOOGLE_CLOUD_STORAGE_KEY_FILE` points to a relative path, the app will also look for the JSON under `storage/app/{filename}` as a convenience. Place the key there when developing locally.

### Dependencies
- **Required**: Laravel Storage, GD extension, Lucide React (icons)
- **Optional**: Intervention/Image (for better thumbnail quality)

## Troubleshooting

### Common Issues

1. **Upload Fails**
   - Check file size (max 10MB)
   - Verify storage permissions
   - Ensure storage link exists: `php artisan storage:link`
   - Confirm the page includes the `<meta name="csrf-token">` tag; uploads require a valid CSRF token

2. **Thumbnails Not Generated**
   - Check GD extension is installed
   - Verify write permissions on storage directory
   - Check error logs for specific issues

3. **Files Not Accessible**
   - Run `php artisan storage:link`
   - Check public disk configuration
   - Verify file permissions

### Debug Commands
```bash
# Check storage link
ls -la public/storage

# Create storage link
php artisan storage:link

# Check file permissions
ls -la storage/app/public/todos/
```
