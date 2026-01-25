# Comment System API Improvement Proposal

## Background

The current comment system uses lazy loading (scrolling) to navigate to specific comments via anchors (`#comment-id`). However, due to pagination and lazy loading, deep-linked comments may not be loaded in the DOM, causing navigation to fail.

## Proposed Solution

We will implement a direct API lookup for deep-linked comments. When a user visits a link with `#comment-{id}`, the frontend will:

1. Query the server for the comment's details and its thread context (root ancestor).
2. Open the Reply Modal for the corresponding thread.
3. Automatically load the specific replies needed to display the target comment.
4. Scroll the target comment into view.

## New/Modified API Endpoints

### 1. Get Comment Context

**Endpoint:** `GET /api/comments/:id`

**Purpose:** Retrieve a specific comment and its root ancestor to determine which thread to open.

**Request:**

- Path Param: `id` (The ID of the comment to find)
- Query Param: `site_id` (Optional, for context/validation)

**Response:**

```json
{
  "comment": {
    "id": 123,
    "site_id": "...",
    "content": "...",
    "parent_id": 456
  },
  "root_comment": {
    "id": 456,
    "content": "Root comment content..."
  }
}
```

- If the comment is a root comment, `root_comment` should be the comment itself (or null/same).
- If the comment is a reply, `root_comment` is the top-level ancestor.

### 2. Get Replies with Highlight Context

**Endpoint:** `GET /api/comments/:parent_id/replies`

**Purpose:** Fetch replies for a thread, ensuring the specific "highlighted" comment is included in the returned set.

**Request:**

- Path Param: `parent_id` (The root comment ID)
- Query Param: `highlight_id` (The ID of the comment we want to jump to)
- Query Param: `limit` (Existing param, e.g. 10)
- Query Param: `last_id` (Existing param, for pagination)

**Behavior:**

- If `highlight_id` is provided:
  - The backend should return a list of replies that **includes** the comment with `highlight_id`.
  - Ideally, it returns the specific "page" or "chunk" of replies containing that ID, or a larger initial chunk that guarantees inclusion.
  - The standard `last_id` pagination mechanism should continue to work for subsequent fetches from this point (or the response includes the `lastId` for the next chunk).

**Response (Standard Reply List Structure):**

```json
{
  "replies": [],
  "lastId": 12345,
  "hasMore": true
}
```

## Frontend Implementation Plan

1. **Hash Listener**: On mount, check if `window.location.hash` matches `#comment-{id}`.
2. **Context Fetch**: If matched, call `GET /api/comments/{id}`.
3. **Open Modal**: Use `root_comment` from response to open the `RepliesModal`.
4. **Load Replies**: Pass `highlight_id` to `RepliesModal`.
   - `RepliesModal` calls `GET /api/comments/{root_id}/replies?highlight_id={id}`.
5. **Scroll**: Once data loads, find `#comment-{id}` in the modal and scroll to it.
