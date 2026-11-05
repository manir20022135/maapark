CREATE TABLE public.team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    bio TEXT,
    image_url TEXT,
    skills TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access
CREATE POLICY "allow_public_select" ON public.team_members FOR SELECT TO public USING (true);

-- Insert sample data based on the website's team section
INSERT INTO public.team_members (name, role, bio, image_url, skills) VALUES
(
    'Prof. (Dr) Hemeswari Bhuyan', 
    'Founder & Mentor', 
    'Former Principal Regional College of Nursing, Guwahati. Recognised PhD supervisor. Vice Principal/HOD RSN, The Assam Royal Global University. Captain MNS (TA) Guwahati. 38+ years of experience, 27 publications, 1 book, 3 patents.', 
    'team-photos/dr.h.b.jpeg', 
    ARRAY['Healthcare Leadership', 'Nursing Education', 'Community Health', 'Innovation']
),
(
    'Manirul Hussain', 
    'Co-Founder & Lead Developer', 
    'Founder and chief developer of MaaCare. A nursing student at The Assam Royal Global University, he combined clinical knowledge with technology to build an AI-powered platform for maternal healthcare under the mentorship of Prof. (Dr) Hemeswari Bhuyan.', 
    'team-photos/manirul hussain.jpeg', 
    ARRAY['Full-Stack Dev', 'AI & ML', 'Health Tech', 'Product Design']
),
(
    'Julfikar Ali', 
    'Project Assistant & Investigator', 
    'Dedicated nursing professional pursuing BSc in Nursing at RGU Guwahati. Works under the guidance of Prof. (Dr) Hemeswari Bhuyan, contributing clinical care and health education skills to promote holistic well-being.', 
    'team-photos/julfikar.jpeg', 
    ARRAY['Clinical Nursing', 'Patient Care', 'Health Education', 'Outreach']
),
(
    'Shaznur Ahmed',
    'Project Operations & Coordination Officer',
    'Highly dedicated and reliable, playing a pivotal role through effective Stakeholder and Resource Management. Ensures smooth coordination with mentors, partners, and team members while efficiently managing time, budget, and tools. His consistent support keeps the project on track, especially during final development and Play Store preparation.',
    'team-photos/shaznur .jpeg',
    ARRAY['Operations Management', 'Strategic Planning', 'Stakeholder Management']
);
