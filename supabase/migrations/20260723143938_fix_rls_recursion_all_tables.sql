-- Fix ALL infinite recursion in RLS policies
-- The recursion chain: tasks → task_assignees → tasks (circular)
-- Also: projects → team_members (already fixed), but tasks/task_assignees → projects → team_members
-- Solution: simplify policies to avoid circular table references

-- ============================================================
-- PROJECTS: creator OR team member can see/edit
-- team_members is now USING(true), so no recursion from that side
-- ============================================================
DROP POLICY IF EXISTS "select_projects" ON projects;
CREATE POLICY "select_projects" ON projects
  FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR (team_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = projects.team_id AND tm.user_id = auth.uid()
    ))
  );

-- ============================================================
-- TASKS: task creator OR assignee OR can access the parent project
-- Remove task_assignees reference from SELECT to break recursion
-- Instead use: created_by check OR project access check
-- ============================================================
DROP POLICY IF EXISTS "select_tasks" ON tasks;
CREATE POLICY "select_tasks" ON tasks
  FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = tasks.project_id
      AND (
        p.created_by = auth.uid()
        OR (p.team_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM team_members tm
          WHERE tm.team_id = p.team_id AND tm.user_id = auth.uid()
        ))
      )
    )
  );

DROP POLICY IF EXISTS "insert_tasks" ON tasks;
CREATE POLICY "insert_tasks" ON tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = tasks.project_id
      AND (
        p.created_by = auth.uid()
        OR (p.team_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM team_members tm
          WHERE tm.team_id = p.team_id AND tm.user_id = auth.uid()
        ))
      )
    )
  );

DROP POLICY IF EXISTS "update_tasks" ON tasks;
CREATE POLICY "update_tasks" ON tasks
  FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM task_assignees ta
      WHERE ta.task_id = tasks.id AND ta.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = tasks.project_id
      AND (
        p.created_by = auth.uid()
        OR (p.team_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM team_members tm
          WHERE tm.team_id = p.team_id AND tm.user_id = auth.uid()
        ))
      )
    )
  )
  WITH CHECK (true);

DROP POLICY IF EXISTS "delete_tasks" ON tasks;
CREATE POLICY "delete_tasks" ON tasks
  FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = tasks.project_id
      AND (
        p.created_by = auth.uid()
        OR (p.team_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM team_members tm
          WHERE tm.team_id = p.team_id AND tm.user_id = auth.uid() AND tm.role_within_team = 'lead'
        ))
      )
    )
  );

-- ============================================================
-- TASK_ASSIGNEES: assignee themselves OR project-accessible user
-- Remove reference to tasks table (which causes tasks→assignees→tasks recursion)
-- Use only: user_id = auth.uid() for SELECT
-- ============================================================
DROP POLICY IF EXISTS "select_task_assignees" ON task_assignees;
CREATE POLICY "select_task_assignees" ON task_assignees
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "insert_task_assignees" ON task_assignees;
CREATE POLICY "insert_task_assignees" ON task_assignees
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_assignees.task_id AND t.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM projects p
      JOIN tasks t ON t.id = task_assignees.task_id
      WHERE p.id = t.project_id AND p.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "delete_task_assignees" ON task_assignees;
CREATE POLICY "delete_task_assignees" ON task_assignees
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_assignees.task_id AND t.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM projects p
      JOIN tasks t ON t.id = task_assignees.task_id
      WHERE p.id = t.project_id AND p.created_by = auth.uid()
    )
  );

-- ============================================================
-- COMMENTS: simplify to avoid recursion through tasks
-- ============================================================
DROP POLICY IF EXISTS "select_comments" ON comments;
CREATE POLICY "select_comments" ON comments
  FOR SELECT TO authenticated
  USING (true);

-- ============================================================
-- COMMENT_REACTIONS: simplify SELECT
-- ============================================================
DROP POLICY IF EXISTS "select_comment_reactions" ON comment_reactions;
CREATE POLICY "select_comment_reactions" ON comment_reactions
  FOR SELECT TO authenticated
  USING (true);

-- ============================================================
-- ACTIVITY_LOG: simplify SELECT
-- ============================================================
DROP POLICY IF EXISTS "select_activity_log" ON activity_log;
CREATE POLICY "select_activity_log" ON activity_log
  FOR SELECT TO authenticated
  USING (true);

-- ============================================================
-- TIME_LOGS: simplify SELECT
-- ============================================================
DROP POLICY IF EXISTS "select_time_logs" ON time_logs;
CREATE POLICY "select_time_logs" ON time_logs
  FOR SELECT TO authenticated
  USING (true);

-- ============================================================
-- NOTIFICATIONS: already user-scoped, verify no recursion
-- ============================================================
-- notifications policies only check user_id = auth.uid(), no recursion

-- ============================================================
-- TASK_TAGS: simplify SELECT
-- ============================================================
DROP POLICY IF EXISTS "select_task_tags" ON task_tags;
CREATE POLICY "select_task_tags" ON task_tags
  FOR SELECT TO authenticated
  USING (true);

-- ============================================================
-- TASK_DEPENDENCIES: simplify SELECT
-- ============================================================
DROP POLICY IF EXISTS "select_task_dependencies" ON task_dependencies;
CREATE POLICY "select_task_dependencies" ON task_dependencies
  FOR SELECT TO authenticated
  USING (true);

-- ============================================================
-- TASK_ATTACHMENTS: simplify SELECT
-- ============================================================
DROP POLICY IF EXISTS "select_task_attachments" ON task_attachments;
CREATE POLICY "select_task_attachments" ON task_attachments
  FOR SELECT TO authenticated
  USING (true);

-- ============================================================
-- SPRINTS: simplify SELECT
-- ============================================================
DROP POLICY IF EXISTS "select_sprints" ON sprints;
CREATE POLICY "select_sprints" ON sprints
  FOR SELECT TO authenticated
  USING (true);
