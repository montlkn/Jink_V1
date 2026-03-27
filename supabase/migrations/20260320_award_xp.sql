-- Create the award_xp RPC referenced by check_and_award_achievements
CREATE OR REPLACE FUNCTION award_xp(
  p_user_id UUID,
  p_amount INT,
  p_reason TEXT DEFAULT 'scan'
) RETURNS void AS $$
BEGIN
  -- Insert transaction record
  INSERT INTO xp_transactions (user_id, amount, reason, source_type, event_uuid)
  VALUES (p_user_id, p_amount, p_reason, p_reason, gen_random_uuid());

  -- Increment profile XP
  UPDATE profiles SET total_xp = COALESCE(total_xp, 0) + p_amount WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
