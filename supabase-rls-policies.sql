-- Enable Row Level Security on all tables
-- Run these commands in your Supabase SQL editor

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can only see and update their own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid()::text = email OR auth.role() = 'service_role');

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid()::text = email OR auth.role() = 'service_role');

-- Enable RLS on activities table
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Users can see activities they created or are participants/collaborators in
CREATE POLICY "Users can view own activities" ON activities
  FOR SELECT USING (
    created_by = (SELECT id FROM users WHERE email = auth.uid()::text)
    OR participants::text LIKE '%' || (auth.uid()::text) || '%'
    OR collaborators::text LIKE '%' || (auth.uid()::text) || '%'
    OR auth.role() = 'service_role'
  );

CREATE POLICY "Users can create activities" ON activities
  FOR INSERT WITH CHECK (
    created_by = (SELECT id FROM users WHERE email = auth.uid()::text)
    OR auth.role() = 'service_role'
  );

CREATE POLICY "Users can update own activities" ON activities
  FOR UPDATE USING (
    created_by = (SELECT id FROM users WHERE email = auth.uid()::text)
    OR auth.role() = 'service_role'
  );

CREATE POLICY "Users can delete own activities" ON activities
  FOR DELETE USING (
    created_by = (SELECT id FROM users WHERE email = auth.uid()::text)
    OR auth.role() = 'service_role'
  );

-- Enable RLS on subtasks table
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;

-- Users can see subtasks they created or are assigned to
CREATE POLICY "Users can view accessible subtasks" ON subtasks
  FOR SELECT USING (
    created_by = (SELECT id FROM users WHERE email = auth.uid()::text)
    OR participants::text LIKE '%' || (auth.uid()::text) || '%'
    OR auth.role() = 'service_role'
  );

CREATE POLICY "Users can create subtasks" ON subtasks
  FOR INSERT WITH CHECK (
    created_by = (SELECT id FROM users WHERE email = auth.uid()::text)
    OR auth.role() = 'service_role'
  );

CREATE POLICY "Users can update accessible subtasks" ON subtasks
  FOR UPDATE USING (
    created_by = (SELECT id FROM users WHERE email = auth.uid()::text)
    OR participants::text LIKE '%' || (auth.uid()::text) || '%'
    OR auth.role() = 'service_role'
  );

CREATE POLICY "Users can delete own subtasks" ON subtasks
  FOR DELETE USING (
    created_by = (SELECT id FROM users WHERE email = auth.uid()::text)
    OR auth.role() = 'service_role'
  );

-- Enable RLS on contacts table
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own contacts" ON contacts
  FOR SELECT USING (
    created_by = (SELECT id FROM users WHERE email = auth.uid()::text)
    OR auth.role() = 'service_role'
  );

CREATE POLICY "Users can create contacts" ON contacts
  FOR INSERT WITH CHECK (
    created_by = (SELECT id FROM users WHERE email = auth.uid()::text)
    OR auth.role() = 'service_role'
  );

CREATE POLICY "Users can update own contacts" ON contacts
  FOR UPDATE USING (
    created_by = (SELECT id FROM users WHERE email = auth.uid()::text)
    OR auth.role() = 'service_role'
  );

CREATE POLICY "Users can delete own contacts" ON contacts
  FOR DELETE USING (
    created_by = (SELECT id FROM users WHERE email = auth.uid()::text)
    OR auth.role() = 'service_role'
  );

-- Enable RLS on user_preferences table
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences" ON user_preferences
  FOR SELECT USING (
    user_id = (SELECT id FROM users WHERE email = auth.uid()::text)
    OR auth.role() = 'service_role'
  );

CREATE POLICY "Users can update own preferences" ON user_preferences
  FOR INSERT WITH CHECK (
    user_id = (SELECT id FROM users WHERE email = auth.uid()::text)
    OR auth.role() = 'service_role'
  );

CREATE POLICY "Users can update own preferences" ON user_preferences
  FOR UPDATE USING (
    user_id = (SELECT id FROM users WHERE email = auth.uid()::text)
    OR auth.role() = 'service_role'
  );

-- Enable RLS on quick_wins table
ALTER TABLE quick_wins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quick wins" ON quick_wins
  FOR SELECT USING (
    created_by = (SELECT id FROM users WHERE email = auth.uid()::text)
    OR auth.role() = 'service_role'
  );

CREATE POLICY "Users can create quick wins" ON quick_wins
  FOR INSERT WITH CHECK (
    created_by = (SELECT id FROM users WHERE email = auth.uid()::text)
    OR auth.role() = 'service_role'
  );

CREATE POLICY "Users can update own quick wins" ON quick_wins
  FOR UPDATE USING (
    created_by = (SELECT id FROM users WHERE email = auth.uid()::text)
    OR auth.role() = 'service_role'
  );

-- Enable RLS on roadblocks table
ALTER TABLE roadblocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view accessible roadblocks" ON roadblocks
  FOR SELECT USING (
    created_by = (SELECT id FROM users WHERE email = auth.uid()::text)
    OR assigned_to = (auth.uid()::text)
    OR auth.role() = 'service_role'
  );

CREATE POLICY "Users can create roadblocks" ON roadblocks
  FOR INSERT WITH CHECK (
    created_by = (SELECT id FROM users WHERE email = auth.uid()::text)
    OR auth.role() = 'service_role'
  );

CREATE POLICY "Users can update accessible roadblocks" ON roadblocks
  FOR UPDATE USING (
    created_by = (SELECT id FROM users WHERE email = auth.uid()::text)
    OR assigned_to = (auth.uid()::text)
    OR auth.role() = 'service_role'
  );

-- Enable RLS on remaining tables
ALTER TABLE daily_task_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_ethos ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_agendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Policies for daily_task_completions
CREATE POLICY "Users can view own task completions" ON daily_task_completions
  FOR ALL USING (
    user_id = (SELECT id FROM users WHERE email = auth.uid()::text)
    OR auth.role() = 'service_role'
  );

-- Policies for weekly_ethos
CREATE POLICY "Users can manage own weekly ethos" ON weekly_ethos
  FOR ALL USING (
    created_by = (SELECT id FROM users WHERE email = auth.uid()::text)
    OR auth.role() = 'service_role'
  );

-- Policies for time_blocks
CREATE POLICY "Users can manage own time blocks" ON time_blocks
  FOR ALL USING (
    user_id = (SELECT id FROM users WHERE email = auth.uid()::text)
    OR auth.role() = 'service_role'
  );

-- Policies for task_comments
CREATE POLICY "Users can view comments on accessible activities" ON task_comments
  FOR SELECT USING (
    activity_id IN (
      SELECT id FROM activities WHERE 
        created_by = (SELECT id FROM users WHERE email = auth.uid()::text)
        OR participants::text LIKE '%' || (auth.uid()::text) || '%'
        OR collaborators::text LIKE '%' || (auth.uid()::text) || '%'
    )
    OR auth.role() = 'service_role'
  );

CREATE POLICY "Users can create comments on accessible activities" ON task_comments
  FOR INSERT WITH CHECK (
    activity_id IN (
      SELECT id FROM activities WHERE 
        created_by = (SELECT id FROM users WHERE email = auth.uid()::text)
        OR participants::text LIKE '%' || (auth.uid()::text) || '%'
        OR collaborators::text LIKE '%' || (auth.uid()::text) || '%'
    )
    AND created_by = (SELECT id FROM users WHERE email = auth.uid()::text)
    OR auth.role() = 'service_role'
  );

-- Policies for daily_agendas
CREATE POLICY "Users can manage own daily agendas" ON daily_agendas
  FOR ALL USING (
    user_id = (SELECT id FROM users WHERE email = auth.uid()::text)
    OR auth.role() = 'service_role'
  );

-- Policies for activity_logs
CREATE POLICY "Users can view logs for accessible activities" ON activity_logs
  FOR SELECT USING (
    activity_id IN (
      SELECT id FROM activities WHERE 
        created_by = (SELECT id FROM users WHERE email = auth.uid()::text)
        OR participants::text LIKE '%' || (auth.uid()::text) || '%'
        OR collaborators::text LIKE '%' || (auth.uid()::text) || '%'
    )
    OR auth.role() = 'service_role'
  );