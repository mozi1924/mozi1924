# Client Comment API Documentation

This documentation outlines the public API endpoints for integrating the comment system into a frontend application.

Base URL: `https://your-worker-url.com` (Replace with your actual deployed worker URL)

## Authentication

Public comment APIs (fetching and posting) do generally not require authentication headers, but posting comments requires a valid Cloudflare Turnstile token.

## Endpoints

### 1. Fetch Root Comments

Retrieves the top-level (root) comments for a specific page.

- **Method**: `GET`
- **Path**: `/api/comments`
- **Query Parameters**:
  - `site_id` (Required): A unique string identifier for your website (e.g., `my-blog.com`).
  - `context_url` (Required): The specific page URL to fetch comments for. Should be the "clean" URL (origin + pathname) without query parameters or hash fragments. Encoded URI component is recommended.
  - `page` (Optional): Page number for pagination (default: `1`).
- **Response**:
  ```json
  {
    "comments": [
      {
        "id": 123,
        "site_id": "my-blog.com",
        "parent_id": null,
        "content": "This is a comment.",
        "author_name": "Alice",
        "avatar_id": "md5-hash-of-email",
        "created_at": 1705420000000,
        "reply_count": 2,
        "admin_reply": null // or Object if an admin replied
      }
    ],
    "total": 45,
    "page": 1,
    "pageSize": 10
  }
  ```

### 2. Fetch Replies

Retrieves replies for a specific comment.

- **Method**: `GET`
- **Path**: `/api/comments/:id/replies`
  - `:id` is the ID of the parent comment.
- **Query Parameters**:
  - `limit` (Optional): Number of replies to fetch (default: `10`).
  - `last_id` (Optional): The ID of the last comment seen, for cursor-based pagination.
- **Response**:
  ```json
  {
    "replies": [
      {
        "id": 124,
        "parent_id": 123,
        "content": "This is a reply.",
        ...
      }
    ],
    "hasMore": true,
    "lastId": 124
  }
  ```

### 3. Post a Comment

Submits a new comment or reply.

- **Method**: `POST`
- **Path**: `/api/comments`
- **Headers**:
  - `Content-Type`: `application/json`
- **Body**:
  ```json
  {
    "site_id": "my-blog.com",
    "parent_id": null, // or number if replying to a comment
    "content": "Hello world!",
    "author_name": "Bob",
    "email": "bob@example.com",
    "turnstile_token": "valid-turnstile-response-token",
    "context_url": "https://my-blog.com/page-1" // Clean URL (origin + pathname)
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "avatar_id": "md5-hash",
    "id": 125
  }
  ```
- **Error Response**:
  ```json
  {
    "error": "Turnstile validation failed"
  }
  ```

### 4. Get Avatar

Retrieves the user's avatar image.

- **Method**: `GET`
- **Path**: `/api/avatar/:id`
  - `:id` is the `avatar_id` returned in comment objects (usually the MD5 hash of the email).
- **Response**: binary image data (`image/png`).
