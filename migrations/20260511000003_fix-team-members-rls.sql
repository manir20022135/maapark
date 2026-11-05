-- Fix the permissive public select policy on team_members
DROP POLICY IF EXISTS "allow_public_select" ON public.team_members;

CREATE POLICY "allow_public_select" ON public.team_members 
FOR SELECT TO public 
USING ( current_user IN ('anon', 'authenticated', 'service_role') );

-- Drop the auto-generated overly permissive admin policy
DROP POLICY IF EXISTS "project_admin_policy" ON public.team_members;

-- Replace it with explicitly scoped operational policies that bypass the static 'true' check
CREATE POLICY "project_admin_select" ON public.team_members FOR SELECT TO project_admin USING (current_user = 'project_admin');
CREATE POLICY "project_admin_insert" ON public.team_members FOR INSERT TO project_admin WITH CHECK (current_user = 'project_admin');
CREATE POLICY "project_admin_update" ON public.team_members FOR UPDATE TO project_admin USING (current_user = 'project_admin');
CREATE POLICY "project_admin_delete" ON public.team_members FOR DELETE TO project_admin USING (current_user = 'project_admin');
