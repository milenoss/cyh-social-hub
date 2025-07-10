/*
  # Create get_challenges_with_stats RPC function

  1. New Functions
    - `get_challenges_with_stats()` - Returns challenges with participant statistics
      - Returns all public challenges with creator information
      - Includes participant count, completed count, active count, and average progress
      - Optimized query with proper joins and aggregations

  2. Security
    - Grant execute permissions to anon and authenticated users
    - Function uses security definer to ensure proper access
*/

CREATE OR REPLACE FUNCTION public.get_challenges_with_stats()
RETURNS TABLE (
    id uuid,
    title text,
    description text,
    category text,
    difficulty text,
    duration_days integer,
    points_reward integer,
    tags text[],
    is_public boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    created_by uuid,
    creator jsonb,
    stats jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.title,
        c.description,
        c.category,
        c.difficulty,
        c.duration_days,
        c.points_reward,
        c.tags,
        c.is_public,
        c.created_at,
        c.updated_at,
        c.created_by,
        jsonb_build_object(
            'id', p.id,
            'username', p.username,
            'display_name', p.display_name,
            'avatar_url', p.avatar_url
        ) AS creator,
        jsonb_build_object(
            'participant_count', COALESCE(cp_stats.participant_count, 0),
            'completed_count', COALESCE(cp_stats.completed_count, 0),
            'active_count', COALESCE(cp_stats.active_count, 0),
            'average_progress', COALESCE(cp_stats.average_progress, 0)
        ) AS stats
    FROM
        challenges c
    LEFT JOIN
        profiles p ON c.created_by = p.user_id
    LEFT JOIN (
        SELECT
            cp.challenge_id,
            COUNT(cp.user_id) AS participant_count,
            COUNT(CASE WHEN cp.status = 'completed' THEN 1 END) AS completed_count,
            COUNT(CASE WHEN cp.status = 'active' THEN 1 END) AS active_count,
            COALESCE(AVG(cp.progress), 0) AS average_progress
        FROM
            challenge_participants cp
        GROUP BY
            cp.challenge_id
    ) AS cp_stats ON c.id = cp_stats.challenge_id
    WHERE
        c.is_public = TRUE
    ORDER BY
        c.created_at DESC;
END;
$$;

-- Grant execute permissions to anon and authenticated users
GRANT EXECUTE ON FUNCTION public.get_challenges_with_stats() TO anon;
GRANT EXECUTE ON FUNCTION public.get_challenges_with_stats() TO authenticated;