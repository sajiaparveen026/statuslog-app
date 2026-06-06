-- ============================================
-- WORK TRACKER APP — SUPABASE DATABASE SCHEMA
-- Run this in your Supabase SQL Editor
-- ============================================


-- 1. USERS TABLE
-- Stores extra info about each person (on top of Supabase's built-in auth)
CREATE TABLE users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'employee')),
  created_at TIMESTAMP DEFAULT NOW()
);


-- 2. PROJECTS TABLE
-- List of projects / process names that employees can choose from
CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);


-- 3. ENTRIES TABLE
-- Each daily work entry submitted by an employee
CREATE TABLE entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  entry_date DATE NOT NULL,
  actual_count INTEGER NOT NULL,
  status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'in-progress', 'done')),
  created_at TIMESTAMP DEFAULT NOW()
);


-- ============================================
-- SAMPLE PROJECTS (optional, to get started)
-- ============================================
INSERT INTO projects (name) VALUES
  ('Project Alpha'),
  ('Project Beta'),
  ('Project Gamma');


-- ============================================
-- ROW LEVEL SECURITY (RLS) — keeps data safe
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Anyone logged in can read projects
CREATE POLICY "Logged in users can read projects"
  ON projects FOR SELECT
  TO authenticated
  USING (true);

-- Employees can insert their own entries
CREATE POLICY "Employees can insert own entries"
  ON entries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Employees can read their own entries
CREATE POLICY "Employees can read own entries"
  ON entries FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can read ALL entries (we handle this in app logic for now)
-- You can add a proper admin policy later once roles are set up
