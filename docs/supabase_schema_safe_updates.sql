-- Safe SQL Updates - Only adds what's missing
-- Run this instead of the full schema_additions.sql

-- Add missing columns to user_aesthetic_profiles (only if they don't exist)
DO $$ 
BEGIN
    -- Add subtype columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='user_aesthetic_profiles' AND column_name='subtype_infrastructuralist') THEN
        ALTER TABLE public.user_aesthetic_profiles 
        ADD COLUMN subtype_infrastructuralist INT DEFAULT 0 NOT NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='user_aesthetic_profiles' AND column_name='subtype_naturalist') THEN
        ALTER TABLE public.user_aesthetic_profiles 
        ADD COLUMN subtype_naturalist INT DEFAULT 0 NOT NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='user_aesthetic_profiles' AND column_name='primary_archetype') THEN
        ALTER TABLE public.user_aesthetic_profiles 
        ADD COLUMN primary_archetype TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='user_aesthetic_profiles' AND column_name='secondary_archetype') THEN
        ALTER TABLE public.user_aesthetic_profiles 
        ADD COLUMN secondary_archetype TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='user_aesthetic_profiles' AND column_name='quiz_completion_date') THEN
        ALTER TABLE public.user_aesthetic_profiles 
        ADD COLUMN quiz_completion_date TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='user_aesthetic_profiles' AND column_name='response_confidence_score') THEN
        ALTER TABLE public.user_aesthetic_profiles 
        ADD COLUMN response_confidence_score FLOAT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='user_aesthetic_profiles' AND column_name='category_separation_score') THEN
        ALTER TABLE public.user_aesthetic_profiles 
        ADD COLUMN category_separation_score FLOAT;
    END IF;
END $$;

-- Convert affinity columns from INTEGER to FLOAT to support decimal scores (like 0.5 for tertiary)
DO $$
BEGIN
    -- Check if affinity columns are INTEGER type and convert to FLOAT
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='user_aesthetic_profiles' AND column_name='affinity_classicist' AND data_type='integer') THEN
        ALTER TABLE public.user_aesthetic_profiles 
        ALTER COLUMN affinity_classicist TYPE FLOAT;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='user_aesthetic_profiles' AND column_name='affinity_romantic' AND data_type='integer') THEN
        ALTER TABLE public.user_aesthetic_profiles 
        ALTER COLUMN affinity_romantic TYPE FLOAT;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='user_aesthetic_profiles' AND column_name='affinity_stylist' AND data_type='integer') THEN
        ALTER TABLE public.user_aesthetic_profiles 
        ALTER COLUMN affinity_stylist TYPE FLOAT;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='user_aesthetic_profiles' AND column_name='affinity_modernist' AND data_type='integer') THEN
        ALTER TABLE public.user_aesthetic_profiles 
        ALTER COLUMN affinity_modernist TYPE FLOAT;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='user_aesthetic_profiles' AND column_name='affinity_industrialist' AND data_type='integer') THEN
        ALTER TABLE public.user_aesthetic_profiles 
        ALTER COLUMN affinity_industrialist TYPE FLOAT;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='user_aesthetic_profiles' AND column_name='affinity_visionary' AND data_type='integer') THEN
        ALTER TABLE public.user_aesthetic_profiles 
        ALTER COLUMN affinity_visionary TYPE FLOAT;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='user_aesthetic_profiles' AND column_name='affinity_pop_culturalist' AND data_type='integer') THEN
        ALTER TABLE public.user_aesthetic_profiles 
        ALTER COLUMN affinity_pop_culturalist TYPE FLOAT;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='user_aesthetic_profiles' AND column_name='affinity_vernacularist' AND data_type='integer') THEN
        ALTER TABLE public.user_aesthetic_profiles 
        ALTER COLUMN affinity_vernacularist TYPE FLOAT;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='user_aesthetic_profiles' AND column_name='affinity_austerist' AND data_type='integer') THEN
        ALTER TABLE public.user_aesthetic_profiles 
        ALTER COLUMN affinity_austerist TYPE FLOAT;
    END IF;
    
    -- Also convert subtype columns to FLOAT if they're INTEGER
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='user_aesthetic_profiles' AND column_name='subtype_infrastructuralist' AND data_type='integer') THEN
        ALTER TABLE public.user_aesthetic_profiles 
        ALTER COLUMN subtype_infrastructuralist TYPE FLOAT;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='user_aesthetic_profiles' AND column_name='subtype_naturalist' AND data_type='integer') THEN
        ALTER TABLE public.user_aesthetic_profiles 
        ALTER COLUMN subtype_naturalist TYPE FLOAT;
    END IF;
END $$;

-- Create quiz_responses table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.quiz_responses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    question_id BIGINT REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
    selected_option_id BIGINT REFERENCES public.question_options(id) ON DELETE CASCADE,
    
    -- Response metadata for confidence scoring
    response_time_ms INTEGER,
    response_timestamp TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, question_id)
);

-- Create indexes if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace 
                   WHERE c.relname = 'idx_quiz_responses_user_id' AND n.nspname = 'public') THEN
        CREATE INDEX idx_quiz_responses_user_id ON public.quiz_responses(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace 
                   WHERE c.relname = 'idx_quiz_responses_question_id' AND n.nspname = 'public') THEN
        CREATE INDEX idx_quiz_responses_question_id ON public.quiz_responses(question_id);
    END IF;
END $$;

-- Drop and recreate the enhanced calculation function
DROP FUNCTION IF EXISTS public.calculate_aesthetic_profile(UUID);

CREATE OR REPLACE FUNCTION public.calculate_aesthetic_profile(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    archetype_scores RECORD;
    top_archetype TEXT;
    second_archetype TEXT;
    industrialist_score FLOAT;
    vernacularist_score FLOAT;
    infrastructuralist_score FLOAT;
    naturalist_score FLOAT;
    total_responses INTEGER;
    avg_response_time FLOAT;
    confidence_score FLOAT;
    separation_score FLOAT;
BEGIN
    -- Calculate total scores for each archetype
    SELECT 
        COALESCE(SUM((qo.aesthetic_scores->>'classicist')::FLOAT), 0) as classicist,
        COALESCE(SUM((qo.aesthetic_scores->>'romantic')::FLOAT), 0) as romantic,
        COALESCE(SUM((qo.aesthetic_scores->>'stylist')::FLOAT), 0) as stylist,
        COALESCE(SUM((qo.aesthetic_scores->>'modernist')::FLOAT), 0) as modernist,
        COALESCE(SUM((qo.aesthetic_scores->>'industrialist')::FLOAT), 0) as industrialist,
        COALESCE(SUM((qo.aesthetic_scores->>'visionary')::FLOAT), 0) as visionary,
        COALESCE(SUM((qo.aesthetic_scores->>'pop_culturalist')::FLOAT), 0) as pop_culturalist,
        COALESCE(SUM((qo.aesthetic_scores->>'vernacularist')::FLOAT), 0) as vernacularist,
        COALESCE(SUM((qo.aesthetic_scores->>'austerist')::FLOAT), 0) as austerist,
        COALESCE(SUM((qo.aesthetic_scores->>'infrastructuralist')::FLOAT), 0) as infrastructuralist,
        COALESCE(SUM((qo.aesthetic_scores->>'naturalist')::FLOAT), 0) as naturalist,
        COUNT(*) as total_responses,
        AVG(CASE WHEN qr.response_time_ms > 0 THEN qr.response_time_ms ELSE NULL END) as avg_response_time
    INTO archetype_scores
    FROM public.quiz_responses qr
    JOIN public.question_options qo ON qr.selected_option_id = qo.id
    WHERE qr.user_id = p_user_id;

    -- Store individual scores for subtype logic
    industrialist_score := archetype_scores.industrialist;
    vernacularist_score := archetype_scores.vernacularist;
    infrastructuralist_score := archetype_scores.infrastructuralist;
    naturalist_score := archetype_scores.naturalist;
    
    -- Enhanced confidence scoring based on response patterns
    IF archetype_scores.avg_response_time > 0 THEN
        -- Fast responses (< 3s) show high confidence: 0.9-1.0
        -- Medium responses (3-8s) show medium confidence: 0.6-0.9
        -- Slow responses (> 8s) show low confidence: 0.3-0.6
        IF archetype_scores.avg_response_time < 3000 THEN
            confidence_score := 0.9 + (3000 - archetype_scores.avg_response_time) / 10000.0;
        ELSIF archetype_scores.avg_response_time < 8000 THEN
            confidence_score := 0.6 + (8000 - archetype_scores.avg_response_time) / 16667.0;
        ELSE
            confidence_score := GREATEST(0.3, 0.6 - (archetype_scores.avg_response_time - 8000) / 20000.0);
        END IF;
        
        -- Cap at reasonable bounds
        confidence_score := GREATEST(0.2, LEAST(1.0, confidence_score));
    ELSE
        confidence_score := 0.5; -- default if no timing data
    END IF;

    -- Find primary and secondary archetypes (excluding subtypes initially)
    WITH archetype_ranking AS (
        SELECT archetype, score,
               ROW_NUMBER() OVER (ORDER BY score DESC) as rank
        FROM (
            VALUES 
                ('classicist', archetype_scores.classicist),
                ('romantic', archetype_scores.romantic),
                ('stylist', archetype_scores.stylist),
                ('modernist', archetype_scores.modernist),
                ('industrialist', archetype_scores.industrialist),
                ('visionary', archetype_scores.visionary),
                ('pop_culturalist', archetype_scores.pop_culturalist),
                ('vernacularist', archetype_scores.vernacularist),
                ('austerist', archetype_scores.austerist)
        ) AS scores(archetype, score)
        WHERE score > 0
    )
    SELECT 
        MAX(CASE WHEN rank = 1 THEN archetype END),
        MAX(CASE WHEN rank = 2 THEN archetype END),
        MAX(CASE WHEN rank = 1 THEN score END) - COALESCE(MAX(CASE WHEN rank = 2 THEN score END), 0)
    INTO top_archetype, second_archetype, separation_score
    FROM archetype_ranking;
    
    -- Calculate category separation score (0-1, higher = more distinct preferences)
    separation_score := LEAST(1.0, separation_score / 50.0);

    -- Apply subtype resolution logic
    IF top_archetype = 'industrialist' AND 
       industrialist_score > 40 AND 
       infrastructuralist_score::FLOAT / NULLIF(industrialist_score, 0) > 0.6 THEN
        top_archetype := 'infrastructuralist';
    END IF;
    
    IF top_archetype = 'vernacularist' AND 
       vernacularist_score > 40 AND 
       naturalist_score::FLOAT / NULLIF(vernacularist_score, 0) > 0.6 THEN
        top_archetype := 'naturalist';
    END IF;

    -- Update the user's profile
    UPDATE public.user_aesthetic_profiles 
    SET 
        affinity_classicist = archetype_scores.classicist,
        affinity_romantic = archetype_scores.romantic,
        affinity_stylist = archetype_scores.stylist,
        affinity_modernist = archetype_scores.modernist,
        affinity_industrialist = archetype_scores.industrialist,
        affinity_visionary = archetype_scores.visionary,
        affinity_pop_culturalist = archetype_scores.pop_culturalist,
        affinity_vernacularist = archetype_scores.vernacularist,
        affinity_austerist = archetype_scores.austerist,
        subtype_infrastructuralist = infrastructuralist_score,
        subtype_naturalist = naturalist_score,
        primary_archetype = top_archetype,
        secondary_archetype = second_archetype,
        onboarding_quiz_complete = TRUE,
        quiz_completion_date = NOW(),
        response_confidence_score = confidence_score,
        category_separation_score = separation_score,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- If no profile exists, create one
    IF NOT FOUND THEN
        INSERT INTO public.user_aesthetic_profiles (
            user_id,
            affinity_classicist, affinity_romantic, affinity_stylist,
            affinity_modernist, affinity_industrialist, affinity_visionary,
            affinity_pop_culturalist, affinity_vernacularist, affinity_austerist,
            subtype_infrastructuralist, subtype_naturalist,
            primary_archetype, secondary_archetype,
            onboarding_quiz_complete, quiz_completion_date,
            response_confidence_score, category_separation_score
        ) VALUES (
            p_user_id,
            archetype_scores.classicist, archetype_scores.romantic, archetype_scores.stylist,
            archetype_scores.modernist, archetype_scores.industrialist, archetype_scores.visionary,
            archetype_scores.pop_culturalist, archetype_scores.vernacularist, archetype_scores.austerist,
            infrastructuralist_score, naturalist_score,
            top_archetype, second_archetype,
            TRUE, NOW(),
            confidence_score, separation_score
        );
    END IF;
END;
$$;

-- Drop and recreate helper functions
DROP FUNCTION IF EXISTS public.get_user_aesthetic_profile(UUID);
DROP FUNCTION IF EXISTS public.user_needs_onboarding(UUID);

CREATE OR REPLACE FUNCTION public.get_user_aesthetic_profile(p_user_id UUID)
RETURNS TABLE (
    user_id UUID,
    primary_archetype TEXT,
    secondary_archetype TEXT,
    archetype_scores JSONB,
    quiz_complete BOOLEAN,
    confidence_score FLOAT,
    completion_date TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        uap.user_id,
        uap.primary_archetype,
        uap.secondary_archetype,
        jsonb_build_object(
            'classicist', uap.affinity_classicist,
            'romantic', uap.affinity_romantic,
            'stylist', uap.affinity_stylist,
            'modernist', uap.affinity_modernist,
            'industrialist', uap.affinity_industrialist,
            'visionary', uap.affinity_visionary,
            'pop_culturalist', uap.affinity_pop_culturalist,
            'vernacularist', uap.affinity_vernacularist,
            'austerist', uap.affinity_austerist,
            'infrastructuralist', uap.subtype_infrastructuralist,
            'naturalist', uap.subtype_naturalist
        ) as archetype_scores,
        uap.onboarding_quiz_complete,
        uap.response_confidence_score,
        uap.quiz_completion_date
    FROM public.user_aesthetic_profiles uap
    WHERE uap.user_id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.user_needs_onboarding(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    needs_onboarding BOOLEAN;
BEGIN
    SELECT NOT COALESCE(onboarding_quiz_complete, FALSE)
    INTO needs_onboarding
    FROM public.user_aesthetic_profiles
    WHERE user_id = p_user_id;
    
    -- If no profile exists, user needs onboarding
    IF needs_onboarding IS NULL THEN
        needs_onboarding := TRUE;
    END IF;
    
    RETURN needs_onboarding;
END;
$$;

-- Enable RLS on quiz_responses if not already enabled
ALTER TABLE public.quiz_responses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then recreate
DROP POLICY IF EXISTS "Users can view their own quiz responses" ON public.quiz_responses;
DROP POLICY IF EXISTS "Users can insert their own quiz responses" ON public.quiz_responses;
DROP POLICY IF EXISTS "Users can update their own quiz responses" ON public.quiz_responses;

CREATE POLICY "Users can view their own quiz responses" 
    ON public.quiz_responses FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quiz responses" 
    ON public.quiz_responses FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quiz responses" 
    ON public.quiz_responses FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Create archetype metadata table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.aesthetic_archetypes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    vibe_keywords TEXT[],
    color_hex TEXT,
    urban_expression TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert archetype metadata (will skip if already exists)
INSERT INTO public.aesthetic_archetypes (id, name, description, vibe_keywords, color_hex, urban_expression) VALUES
('classicist', 'The Classicist', 'Embodies reverence for enduring principles of order, harmony, and grandeur inherited from Greek and Roman antiquity.', ARRAY['Formal', 'Symmetrical', 'Grand', 'Rational', 'Ornate', 'Enduring'], '#8B4513', 'Grand boulevards, formal squares, monumental civic buildings, hierarchical street networks'),
('romantic', 'The Romantic', 'Prioritizes emotion, narrative, and individualism over rational order. Finds beauty in the expressive, historical, layered.', ARRAY['Expressive', 'Story-Driven', 'Whimsical', 'Layered', 'Evocative', 'Atmospheric'], '#8B008B', 'Winding medieval streets, hidden courtyards, Gothic cathedrals, picturesque neighborhoods'),
('stylist', 'The Stylist', 'Defined by appreciation for glamour, surface, and visual rhythm. A confident and polished aesthetic.', ARRAY['Glamorous', 'Geometric', 'Luxurious', 'Polished', 'Confident', 'Sophisticated'], '#FFD700', 'Luxury shopping districts, boutique hotels, high-end residential towers, designed nightlife districts'),
('modernist', 'The Modernist', 'Driven by belief in universal principles, functionalism, and rejection of unnecessary ornament.', ARRAY['Clean', 'Intentional', 'Minimal', 'Universal', 'Functional', 'Sleek', 'Systematic'], '#2F4F4F', 'Glass office towers, modernist housing estates, clean transit systems, rational street grids'),
('industrialist', 'The Industrialist', 'Finds beauty in the raw, utilitarian, and exposed. Values honesty, durability, and character from use and age.', ARRAY['Raw', 'Utilitarian', 'Edgy', 'Exposed', 'Functional', 'Urban', 'Authentic'], '#A0522D', 'Converted warehouses, exposed infrastructure, industrial districts, working waterfronts'),
('visionary', 'The Visionary', 'Defined by relentless drive to push boundaries, experiment with form, and speculate on the future.', ARRAY['Sculptural', 'Unconventional', 'Dynamic', 'Bold', 'Innovative', 'Playful', 'Experimental'], '#FF6347', 'Iconic cultural buildings, experimental housing, tech campuses, futuristic transit hubs'),
('pop_culturalist', 'The Pop Culturalist', 'Engages with aesthetics of commercialism, mass media, and spectacle, often with theatricality and irony.', ARRAY['Thematic', 'Iconic', 'Commercial', 'Ironic', 'Spectacular', 'Theatrical', 'Accessible'], '#FF69B4', 'Times Square, Las Vegas Strip, theme parks, shopping malls, entertainment districts'),
('vernacularist', 'The Vernacularist', 'Champions localized, indigenous, and community-born design traditions developed outside elite academic structures.', ARRAY['Rooted', 'Climatic', 'Communal', 'Tactile', 'Intuitive', 'Regional', 'Sustainable'], '#228B22', 'Historic neighborhoods, local markets, craft districts, sustainable communities, cultural quarters'),
('austerist', 'The Austerist', 'Efficiency-driven design optimized for function, cost, and standardization. The pragmatic backbone of the built environment.', ARRAY['Efficient', 'Systematic', 'Practical', 'Standardized', 'Functional', 'Universal', 'Cost-Conscious'], '#696969', 'Business parks, strip malls, apartment complexes, institutional buildings, suburban office parks'),
('infrastructuralist', 'The Infrastructuralist', 'Celebrates the monumental scale and systematic complexity of large-scale infrastructure and megastructures.', ARRAY['Megascale', 'Systematic', 'Technological', 'Engineering', 'Monumental'], '#4682B4', 'Bridges, transit hubs, power plants, megastructures, engineering landmarks'),
('naturalist', 'The Naturalist', 'Values inherent beauty of natural materials and creation of serene, grounded environments through craft and organic forms.', ARRAY['Material Honest', 'Craft', 'Organic', 'Serene', 'Grounded'], '#8FBC8F', 'Craft districts, sustainable communities, natural parks, artisanal markets')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    vibe_keywords = EXCLUDED.vibe_keywords,
    color_hex = EXCLUDED.color_hex,
    urban_expression = EXCLUDED.urban_expression;

-- Enable RLS and create policy for archetype metadata
ALTER TABLE public.aesthetic_archetypes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Archetype metadata is publicly readable" ON public.aesthetic_archetypes;
CREATE POLICY "Archetype metadata is publicly readable" 
    ON public.aesthetic_archetypes FOR SELECT 
    TO PUBLIC 
    USING (true);