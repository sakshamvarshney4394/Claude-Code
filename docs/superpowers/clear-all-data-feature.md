# Clear All Data Button Feature Implementation

## Overview
This document describes the implementation of the "Clear All Data" button feature for the Sample Tracking app. The feature allows users to delete all samples and their associated visits while preserving the products and users data.

## Changes Made

### 1. Backend API Endpoint (`app/api/samples/route.ts`)
Added a `DELETE` method to the samples API route that:
- First deletes all visits (due to foreign key constraint: visits.sample_id references samples.sample_id)
- Then deletes all samples
- Returns `{ deleted: true }` on success or an error object on failure

### 2. Frontend Component (`app/samples/page.tsx`)
Added:
- State variables for tracking clearing status (`clearing`) and clear operation errors (`clearError`)
- A "Clear All Data" button that:
  - Is only rendered when there are samples to clear (`samples.length > 0`)
  - Shows a confirmation dialog using `window.confirm` before proceeding
  - Calls the DELETE `/api/samples` endpoint
  - Reloads the samples list upon successful deletion
  - Shows error messages if the operation fails
  - Displays a loading state during the operation

## Technical Details

### Data Deletion Order
The implementation respects the foreign key constraint between the `visits` and `samples` tables:
1. Visits are deleted first (since they reference samples via `sample_id`)
2. Samples are deleted second
This order prevents foreign key constraint violations.

### Error Handling
- Backend: Returns appropriate error messages if either deletion operation fails
- Frontend: Catches network errors and displays user-friendly error messages

### User Experience
- Confirmation dialog prevents accidental data deletion
- Visual feedback during operation (button shows "Clearing..." and is disabled)
- Error state is shown if the operation fails
- Button automatically hides when no samples remain

## Verification Steps
To verify the implementation works correctly:

1. Start the development server: `npm run dev`
2. Navigate to http://localhost:3000/samples
3. Create a test sample via the "Create New Sample" button
4. Verify the "Clear All Data" button appears at the bottom of the samples list
5. Click the button and confirm the deletion in the browser dialog
6. Verify the samples list is now empty and the button is hidden
7. Verify that products and users data remain intact by checking:
   - http://localhost:3000/api/products
   - http://localhost:3000/api/users
8. Test error handling by temporarily breaking the DELETE endpoint (optional)

## Files Modified
- `app/api/samples/route.ts` - Added DELETE endpoint
- `app/samples/page.tsx` - Added Clear All Data button and related logic

## Related Documentation
- See `INSTRUCTIONS.md` for the original feature specifications and approved design
- See `docs/superpowers/plans/2026-08-07-clear-all-data-button.md` for the original implementation plan
