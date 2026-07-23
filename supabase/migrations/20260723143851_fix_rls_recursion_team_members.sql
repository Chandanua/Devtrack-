-- Fix infinite recursion in RLS policies
-- Root cause: team_members SELECT policy references itself and teams,
-- while teams SELECT policy references team_members → circular dependency

-- 1. teams: any authenticated user can see all teams (organizational data)
DROP POLICY IF EXISTS "select_teams" ON teams;
CREATE POLICY "select_teams" ON teams
  FOR SELECT TO authenticated USING (true);

-- 2. team_members: any authenticated user can see all team memberships
--    (breaks self-reference and circular reference to teams)
DROP POLICY IF EXISTS "select_team_members" ON team_members;
CREATE POLICY "select_team_members" ON team_members
  FOR SELECT TO authenticated USING (true);

-- 3. team_members INSERT: user can add themselves OR team creator can add
--    (references teams which now has USING(true) — no recursion)
DROP POLICY IF EXISTS "insert_team_members" ON team_members;
CREATE POLICY "insert_team_members" ON team_members
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = team_members.team_id AND t.created_by = auth.uid()
    )
  );

-- 4. team_members DELETE: user can remove themselves OR team creator can remove
DROP POLICY IF EXISTS "delete_team_members" ON team_members;
CREATE POLICY "delete_team_members" ON team_members
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = team_members.team_id AND t.created_by = auth.uid()
    )
  );

-- 5. teams UPDATE: only creator can update (no reference to team_members)
DROP POLICY IF EXISTS "update_teams" ON teams;
CREATE POLICY "update_teams" ON teams
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());
