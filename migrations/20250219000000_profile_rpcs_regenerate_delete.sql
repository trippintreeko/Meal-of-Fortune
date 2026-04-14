-- RPC: Regenerate friend code for the current user.
-- Uses existing generate_friend_code(); updates profile and returns new code.
CREATE OR REPLACE FUNCTION public.regenerate_friend_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username TEXT;
  v_new_code TEXT;
BEGIN
  SELECT username INTO v_username FROM profiles WHERE auth_id = auth.uid() LIMIT 1;
  IF v_username IS NULL THEN
    RAISE EXCEPTION 'Not authenticated or profile not found';
  END IF;
  v_new_code := public.generate_friend_code(v_username);
  UPDATE profiles SET friend_code = v_new_code, updated_at = NOW() WHERE auth_id = auth.uid();
  RETURN v_new_code;
END;
$$;

COMMENT ON FUNCTION public.regenerate_friend_code() IS 'Generate a new unique friend_code for the current user and update their profile';

-- RPC: Delete current user's profile (client then signs out; auth user deletion requires Edge Function with admin).
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM profiles WHERE auth_id = auth.uid();
  -- Auth user deletion must be done via Supabase Dashboard, Edge Function with service role, or Auth API.
  -- Client should call signOut() after this.
END;
$$;

COMMENT ON FUNCTION public.delete_my_account() IS 'Delete the current user profile. Client must call signOut() after. For full account deletion use an Edge Function to delete auth.users.';
