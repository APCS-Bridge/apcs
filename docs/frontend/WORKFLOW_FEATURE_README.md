# Document Validation Workflow Feature - Backend Implementation Guide

## Overview

The Document Validation Workflow is a feature that allows users to create approval chains for documents. Users can upload documents, define a sequence of validators (team members), and track the approval status of each validator in the chain. Validators receive notifications, can approve/reject documents, and add comments explaining their decisions.

## Feature Description

### User Roles
1. **Document Owner/Creator**: User who creates the workflow and adds validators
2. **Validator**: Team member assigned to validate the document at a specific position in the chain
3. **Workspace Owner/Admin**: Can manage workflows and has elevated permissions

### Core Functionality

#### 1. Workflow Creation
- User creates a new document validation workflow
- Provides document title (required), description (optional), and uploads file
- Supported file types: PDF, DOC, DOCX, TXT, images (JPG, PNG)
- File size limit: 10MB
- Workflow is created with status: `draft`

#### 2. Validator Management
- Owner can add validators at any position (start, middle, or end of chain)
- Each validator has:
  - User assignment (team member from workspace)
  - Optional note from owner (instructions/context)
  - Order/position in the chain
  - Status: `pending`, `approved`, or `rejected`
- Owner can remove validators at any time
- Owner can update notes for validators

#### 3. Validation Process
- Validators see all workflows where they are assigned
- Validators can:
  - Approve the document
  - Reject the document (must provide reason via comment)
  - Add comments (visible to all stakeholders)
  - View document file and description
- Validation actions update the validator's status and timestamp

#### 4. Notifications
- Validators receive notifications when added to a workflow
- Owner can resend notifications for pending validators
- Notifications triggered on:
  - Validator added to workflow
  - Document approved/rejected
  - New comment added on validator's node

#### 5. Comments System
- Each validator node has its own comment thread
- Comments include:
  - Author (user who wrote it)
  - Content
  - Timestamp
- Comments are visible to all workspace members
- Used for collaboration and explaining rejection reasons

#### 6. Workflow Status
- **draft**: No validators added yet
- **in_progress**: At least one validator added, pending validations
- **completed**: All validators have approved
- **rejected**: At least one validator has rejected

---

## Data Models

### Document
```typescript
interface Document {
  id: string;                    // UUID
  title: string;                 // Required
  description?: string;          // Optional
  fileUrl: string;               // S3/cloud storage URL
  fileName: string;              // Original file name
  fileSize: number;              // In bytes
  fileType: string;              // MIME type (e.g., "application/pdf")
  createdById: string;           // User ID of creator
  createdByName: string;         // User name (denormalized for performance)
  createdAt: string;             // ISO 8601 timestamp
  updatedAt: string;             // ISO 8601 timestamp
}
```

### Validator
```typescript
interface Validator {
  id: string;                    // UUID
  userId: string;                // Reference to User
  userName: string;              // Denormalized
  userEmail?: string;            // Denormalized
  avatarUrl?: string;            // User avatar
  status: ValidationStatus;      // 'pending' | 'approved' | 'rejected'
  note?: string;                 // Instructions from owner
  comments: ValidationComment[]; // Thread of comments
  notifiedAt?: string;           // Last notification timestamp
  validatedAt?: string;          // When approved/rejected
  order: number;                 // Position in chain (0-indexed)
}

type ValidationStatus = 'pending' | 'approved' | 'rejected';
```

### ValidationComment
```typescript
interface ValidationComment {
  id: string;                    // UUID
  authorId: string;              // User ID
  authorName: string;            // Denormalized
  content: string;               // Comment text
  createdAt: string;             // ISO 8601 timestamp
}
```

### DocumentWorkflow
```typescript
interface DocumentWorkflow {
  id: string;                    // UUID
  spaceId: string;               // Workspace/Space reference
  document: Document;            // Embedded or referenced
  validators: Validator[];       // Ordered array
  status: WorkflowStatus;        // Overall workflow status
  createdAt: string;             // ISO 8601 timestamp
  updatedAt: string;             // ISO 8601 timestamp
}

type WorkflowStatus = 'draft' | 'in_progress' | 'completed' | 'rejected';
```

---

## Required API Endpoints

### 1. Workflow Management

#### Create Workflow
```
POST /api/spaces/{spaceId}/workflows
Content-Type: multipart/form-data

Body:
{
  title: string;              // Required
  description?: string;       // Optional
  file: File;                 // Required - document file
}

Response: 201 Created
{
  success: true;
  data: DocumentWorkflow;
}
```

#### Get All Workflows in Space
```
GET /api/spaces/{spaceId}/workflows?page=1&limit=20

Response: 200 OK
{
  success: true;
  data: DocumentWorkflow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }
}
```

#### Get Single Workflow
```
GET /api/spaces/{spaceId}/workflows/{workflowId}

Response: 200 OK
{
  success: true;
  data: DocumentWorkflow;
}
```

#### Update Workflow (title/description only)
```
PATCH /api/spaces/{spaceId}/workflows/{workflowId}

Body:
{
  title?: string;
  description?: string;
}

Response: 200 OK
{
  success: true;
  data: DocumentWorkflow;
}
```

#### Delete Workflow
```
DELETE /api/spaces/{spaceId}/workflows/{workflowId}

Response: 204 No Content
```

### 2. Validator Management

#### Add Validator
```
POST /api/spaces/{spaceId}/workflows/{workflowId}/validators

Body:
{
  userId: string;           // Required
  note?: string;            // Optional
  position?: number;        // Insert position (default: end)
}

Response: 201 Created
{
  success: true;
  data: DocumentWorkflow;  // Updated workflow
}
```

#### Remove Validator
```
DELETE /api/spaces/{spaceId}/workflows/{workflowId}/validators/{validatorId}

Response: 200 OK
{
  success: true;
  data: DocumentWorkflow;
}
```

#### Update Validator Note
```
PATCH /api/spaces/{spaceId}/workflows/{workflowId}/validators/{validatorId}/note

Body:
{
  note: string;
}

Response: 200 OK
{
  success: true;
  data: DocumentWorkflow;
}
```

#### Update Validator Status (Approve/Reject)
```
PATCH /api/spaces/{spaceId}/workflows/{workflowId}/validators/{validatorId}/status

Body:
{
  status: 'approved' | 'rejected';
}

Response: 200 OK
{
  success: true;
  data: DocumentWorkflow;
}
```

### 3. Comments

#### Add Comment
```
POST /api/spaces/{spaceId}/workflows/{workflowId}/validators/{validatorId}/comments

Body:
{
  content: string;          // Required
}

Response: 201 Created
{
  success: true;
  data: ValidationComment;
}
```

#### Get Comments for Validator
```
GET /api/spaces/{spaceId}/workflows/{workflowId}/validators/{validatorId}/comments

Response: 200 OK
{
  success: true;
  data: ValidationComment[];
}
```

### 4. Notifications

#### Resend Notification
```
POST /api/spaces/{spaceId}/workflows/{workflowId}/validators/{validatorId}/notify

Response: 200 OK
{
  success: true;
  message: "Notification sent successfully";
}
```

### 5. File Download

#### Download Document
```
GET /api/spaces/{spaceId}/workflows/{workflowId}/document/download

Response: 200 OK
Content-Type: application/octet-stream
Content-Disposition: attachment; filename="document.pdf"

[Binary file data]
```

---

## Business Logic Requirements

### Workflow Status Rules
1. **draft → in_progress**: When first validator is added
2. **in_progress → completed**: When all validators have status = 'approved'
3. **in_progress → rejected**: When any validator has status = 'rejected'
4. Status transitions are automatic based on validator states

### Validator Ordering
- Validators array must maintain order
- When inserting at position N, shift existing validators
- Order field must be sequential (0, 1, 2, ...)
- When removing validator, recalculate all orders

### Permissions
| Action | Document Owner | Validator | Workspace Owner/Admin | Other Members |
|--------|---------------|-----------|----------------------|---------------|
| Create workflow | ✅ | ✅ | ✅ | ✅ |
| Add validators | ✅ | ❌ | ✅ | ❌ |
| Remove validators | ✅ | ❌ | ✅ | ❌ |
| Update notes | ✅ | ❌ | ✅ | ❌ |
| Approve/Reject | ❌ | ✅ (own node) | ✅ | ❌ |
| Add comments | ✅ | ✅ | ✅ | ✅ (if in space) |
| Delete workflow | ✅ | ❌ | ✅ | ❌ |
| View workflow | ✅ | ✅ | ✅ | ✅ (if in space) |

### Notification Logic
- Send email/push notification when:
  1. User is added as validator
  2. Workflow status changes to completed/rejected
  3. New comment is added (notify all stakeholders)
  4. Manual resend is triggered

### File Storage
- Use cloud storage (S3, Azure Blob, Google Cloud Storage)
- Generate signed URLs for secure file access
- Set appropriate CORS headers
- Implement file size validation (10MB limit)
- Validate file types (whitelist: PDF, DOC, DOCX, TXT, JPG, PNG)
- Store original filename and metadata

---

## Database Schema Suggestion

### Tables

#### workflows
```sql
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  file_url VARCHAR(500) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('draft', 'in_progress', 'completed', 'rejected')),
  created_by_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  INDEX idx_space_id (space_id),
  INDEX idx_created_by_id (created_by_id),
  INDEX idx_status (status)
);
```

#### validators
```sql
CREATE TABLE validators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  note TEXT,
  order_position INTEGER NOT NULL,
  notified_at TIMESTAMP,
  validated_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  INDEX idx_workflow_id (workflow_id),
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  UNIQUE (workflow_id, order_position)
);
```

#### validation_comments
```sql
CREATE TABLE validation_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  validator_id UUID NOT NULL REFERENCES validators(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  INDEX idx_validator_id (validator_id),
  INDEX idx_author_id (author_id)
);
```

### Indexes
- Add composite index on `(space_id, status)` for filtering workflows
- Add composite index on `(workflow_id, order_position)` for ordering validators
- Add full-text search index on `title` and `description` if needed

---

## Frontend Integration Points

### Current Frontend Implementation
The frontend is currently using **localStorage** for data persistence (demo/development mode). When the backend is ready, replace the following functions in `src/lib/documentWorkflow.ts`:

#### Functions to Replace
- `getWorkflows()` → Call `GET /api/spaces/{spaceId}/workflows`
- `createWorkflow()` → Call `POST /api/spaces/{spaceId}/workflows`
- `addValidator()` → Call `POST /api/spaces/{spaceId}/workflows/{workflowId}/validators`
- `removeValidator()` → Call `DELETE /api/spaces/{spaceId}/workflows/{workflowId}/validators/{validatorId}`
- `updateValidatorStatus()` → Call `PATCH /api/spaces/{spaceId}/workflows/{workflowId}/validators/{validatorId}/status`
- `addComment()` → Call `POST /api/spaces/{spaceId}/workflows/{workflowId}/validators/{validatorId}/comments`
- `updateValidatorNote()` → Call `PATCH /api/spaces/{spaceId}/workflows/{workflowId}/validators/{validatorId}/note`
- `resendNotification()` → Call `POST /api/spaces/{spaceId}/workflows/{workflowId}/validators/{validatorId}/notify`
- `deleteWorkflow()` → Call `DELETE /api/spaces/{spaceId}/workflows/{workflowId}`

### API Service Integration Example
```typescript
// In src/lib/api.ts, add:

class ApiService {
  // ... existing methods ...

  // Workflows
  async getWorkflows(spaceId: string, page = 1, limit = 20) {
    return this.request<DocumentWorkflow[]>(
      `/spaces/${spaceId}/workflows?page=${page}&limit=${limit}`
    );
  }

  async createWorkflow(spaceId: string, data: FormData) {
    const token = this.getToken();
    const response = await fetch(`${API_BASE_URL}/spaces/${spaceId}/workflows`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: data, // FormData includes file
    });
    return response.json();
  }

  async addValidator(spaceId: string, workflowId: string, data: {
    userId: string;
    note?: string;
    position?: number;
  }) {
    return this.request<DocumentWorkflow>(
      `/spaces/${spaceId}/workflows/${workflowId}/validators`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  // ... other workflow methods ...
}
```

---

## File Structure

### Frontend Files Created
```
src/
├── lib/
│   └── documentWorkflow.ts          # Types, utilities, localStorage functions
├── components/
│   └── workflow/
│       ├── index.ts                 # Barrel export
│       ├── DocumentWorkflowView.tsx # Main container component
│       ├── ValidationNode.tsx       # Individual validator circle
│       ├── CommentsModal.tsx        # Comment thread modal
│       └── AddValidatorModal.tsx    # Add validator dialog
```

### Integration Point
- `src/components/workspace/WorkspaceDetailView.tsx` - Added "Workflow" tab

---

## UI/UX Features Implemented

### Visual Design
1. **Horizontal Chain Layout**
   - Document icon (start) → Validators → Completion icon (end)
   - Plus buttons between nodes to insert validators
   - Arrows connecting nodes

2. **Validator Node**
   - 64px circular avatar with initials or image
   - Status-colored border (3px):
     - Grey: Pending (animated pulse effect)
     - Green: Approved
     - Red: Rejected
   - Small status badge icon at bottom-right
   - Hover shows remove button
   - Comments icon with count badge
   - Bell icon for resend notification (pending only)
   - Approve/Reject buttons (only for assigned validator)

3. **Comments Modal**
   - Chat-style interface
   - User avatars and names
   - Timestamps (relative: "2h ago")
   - Owner's note displayed at top
   - Real-time textarea input

4. **Responsive Design**
   - Horizontal scroll for long chains
   - Mobile-friendly modal dialogs
   - Dark mode support throughout

### Animations
- Framer Motion animations for:
  - Node entrance/exit
  - Modal transitions
  - Hover effects
  - Button interactions
  - Status changes

---

## Testing Checklist for Backend

### Functional Tests
- [ ] Create workflow with file upload
- [ ] Get all workflows for a space
- [ ] Get single workflow by ID
- [ ] Add validator at end of chain
- [ ] Add validator at specific position (middle)
- [ ] Add validator at start (position 0)
- [ ] Remove validator and verify order recalculation
- [ ] Approve document as validator
- [ ] Reject document as validator
- [ ] Add comment on validator node
- [ ] Update validator note as owner
- [ ] Resend notification
- [ ] Delete workflow
- [ ] Download document file

### Permission Tests
- [ ] Non-owner cannot add validators
- [ ] Non-owner cannot remove validators
- [ ] Validator can only approve/reject their own node
- [ ] Non-member cannot access space workflows

### Status Transition Tests
- [ ] draft → in_progress (add first validator)
- [ ] in_progress → completed (all approved)
- [ ] in_progress → rejected (one rejected)
- [ ] Cannot modify completed workflow

### File Upload Tests
- [ ] Accept valid file types (PDF, DOC, DOCX, TXT, JPG, PNG)
- [ ] Reject invalid file types
- [ ] Reject files > 10MB
- [ ] Generate secure download URLs
- [ ] Verify file metadata storage

### Notification Tests
- [ ] Email sent when validator added
- [ ] Email sent when status changes
- [ ] Email sent on new comment
- [ ] Manual resend triggers email

---

## Security Considerations

1. **File Upload Security**
   - Validate file size server-side (don't trust client)
   - Validate MIME type using file content, not extension
   - Scan files for viruses/malware
   - Use separate storage domain to prevent XSS
   - Generate time-limited signed URLs

2. **Authorization**
   - Verify user is workspace member for all operations
   - Verify ownership for sensitive operations (add/remove validators)
   - Validate validator can only approve/reject their own node

3. **Input Validation**
   - Sanitize all text inputs (title, description, comments, notes)
   - Validate UUIDs format
   - Validate order positions are within bounds

4. **Rate Limiting**
   - Limit workflow creation (e.g., 10 per hour per user)
   - Limit notification resends (e.g., 1 per 5 minutes per validator)
   - Limit comment posting (prevent spam)

---

## Performance Optimization

1. **Database**
   - Add indexes on foreign keys
   - Use pagination for workflow lists
   - Denormalize user names to avoid joins
   - Consider caching for frequently accessed workflows

2. **File Storage**
   - Use CDN for file delivery
   - Compress images before storage
   - Generate thumbnails for image documents
   - Cache signed URLs (with short TTL)

3. **Queries**
   - Eager load validators and comments
   - Use select fields to limit data transfer
   - Implement cursor-based pagination for large datasets

---

## Migration Strategy

When transitioning from localStorage to backend:

1. **Phase 1: Backend Development**
   - Implement all API endpoints
   - Test thoroughly
   - Deploy to staging

2. **Phase 2: Frontend Integration**
   - Create new API service functions
   - Replace localStorage calls incrementally
   - Add loading states and error handling
   - Test with real backend

3. **Phase 3: Data Migration**
   - No migration needed (localStorage is temporary)
   - Users will start fresh with backend

4. **Phase 4: Cleanup**
   - Remove localStorage functions
   - Remove demo data generators
   - Update documentation

---

## Future Enhancements (Optional)

1. **Advanced Features**
   - Conditional workflows (if A rejects, skip B)
   - Parallel validators (multiple validators at same stage)
   - Workflow templates
   - Version control for documents
   - Digital signatures

2. **Integrations**
   - Email notifications (high priority)
   - Slack/Teams notifications
   - Calendar integration for deadlines
   - DocuSign integration

3. **Analytics**
   - Average approval time
   - Rejection rate by validator
   - Bottleneck identification
   - Workflow completion metrics

---

## Support & Questions

For questions about the frontend implementation or UI/UX decisions, contact the frontend team.

For backend architecture decisions or API design questions, please discuss with the team leads before implementation.

---

**Document Version:** 1.0  
**Last Updated:** February 7, 2026  
**Frontend Status:** ✅ Complete (using localStorage)  
**Backend Status:** ⏳ Pending Implementation
