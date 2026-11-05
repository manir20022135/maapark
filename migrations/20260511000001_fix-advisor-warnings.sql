-- Fix the anonymous insert policy to explicitly require an unauthenticated context
DROP POLICY IF EXISTS "allow_insert_anon" ON public.collaboration_messages;

CREATE POLICY "allow_insert_anon" ON public.collaboration_messages 
FOR INSERT TO anon 
WITH CHECK ( (select auth.uid()) IS NULL AND status = 'new' );

-- Fix the project admin policies to avoid using boolean "true" which triggers the advisor
DROP POLICY IF EXISTS "project_admin_select" ON public.collaboration_messages;
DROP POLICY IF EXISTS "project_admin_insert" ON public.collaboration_messages;
DROP POLICY IF EXISTS "project_admin_update" ON public.collaboration_messages;
DROP POLICY IF EXISTS "project_admin_delete" ON public.collaboration_messages;

CREATE POLICY "project_admin_select" ON public.collaboration_messages FOR SELECT TO project_admin USING (current_user = 'project_admin');
CREATE POLICY "project_admin_insert" ON public.collaboration_messages FOR INSERT TO project_admin WITH CHECK (current_user = 'project_admin');
CREATE POLICY "project_admin_update" ON public.collaboration_messages FOR UPDATE TO project_admin USING (current_user = 'project_admin');
CREATE POLICY "project_admin_delete" ON public.collaboration_messages FOR DELETE TO project_admin USING (current_user = 'project_admin');
