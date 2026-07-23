/*
# Performance optimizations: RPC function, indexes, and storage bucket

1. New RPC Function
- `get_project_task_counts` — returns task counts per project in a single query,
  eliminating N+1 queries on the projects list page.

2. New Indexes
- `idx_tasks_status_project` — composite index for filtering tasks by project + status
- `idx_time_logs_user_end` — index for finding active timers per user
- `idx_notifications_user_unread` — index for fetching unread notifications per user
- `idx_comments_task_created` — index for fetching comments by task ordered by date

3. Storage
- Create `task-attachments` bucket for file uploads (public read, authenticated write)

4. Security
- Storage policies: authenticated users can upload, everyone can read
*/

-- RPC function for project task counts
CREATE OR REPLACE FUNCTION get_project_task_counts()
RETURNS TABLE (project_id uuid, total bigint, completed bigint)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    t.project_id,
    COUNT(*)::bigint AS total,
    COUNT(*) FILTER (WHERE t.status = 'completed')::bigint AS completed
  FROM tasks t
  WHERE t.parent_task_id IS NULL
  GROUP BY t.project_id;
$$;

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_tasks_status_project ON tasks (project_id, status);
CREATE INDEX IF NOT EXISTS idx_time_logs_user_end ON time_logs (user_id, end_time);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications (user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_task_created ON comments (task_id, created_at);

-- Storage bucket for task attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-attachments', 'task-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "task_attachments_read" ON storage.objects;
CREATE POLICY "task_attachments_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'task-attachments');

DROP POLICY IF EXISTS "task_attachments_upload" ON storage.objects;
CREATE POLICY "task_attachments_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'task-attachments');

DROP POLICY IF EXISTS "task_attachments_delete" ON storage.objects;
CREATE POLICY "task_attachments_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'task-attachments');
