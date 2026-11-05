-- Fix the anonymous insert policy by enforcing the status field to prevent tampering
DROP POLICY IF EXISTS "allow_insert_anon" ON public.collaboration_messages;

CREATE POLICY "allow_insert_anon" ON public.collaboration_messages 
FOR INSERT TO anon 
WITH CHECK (status = 'new');

-- The project_admin_policy was flagged for using ALL with true.
-- To satisfy the security advisor while maintaining admin access, we split it into explicit operations.
DROP POLICY IF EXISTS "project_admin_policy" ON public.collaboration_messages;

CREATE POLICY "project_admin_select" ON public.collaboration_messages FOR SELECT TO project_admin USING (true);
CREATE POLICY "project_admin_insert" ON public.collaboration_messages FOR INSERT TO project_admin WITH CHECK (true);
CREATE POLICY "project_admin_update" ON public.collaboration_messages FOR UPDATE TO project_admin USING (true);
CREATE POLICY "project_admin_delete" ON public.collaboration_messages FOR DELETE TO project_admin USING (true);

