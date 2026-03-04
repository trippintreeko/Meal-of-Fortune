-- User feedback: bug reports and feature requests from the app.
-- View submissions in Supabase Dashboard → Table Editor → feedback.

CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('bug', 'feature')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  app_version TEXT,
  device_info JSONB,
  content JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved'))
);

CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.feedback (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON public.feedback (feedback_type);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON public.feedback (status);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Anyone (authenticated or anonymous) can insert bug/feature feedback.
CREATE POLICY "Allow insert feedback"
  ON public.feedback
  FOR INSERT
  WITH CHECK (feedback_type IN ('bug', 'feature'));

-- Only service role (Dashboard, backend) can read/update. App uses anon key and has no SELECT.
-- To let users see their own submissions from the app, add:
-- CREATE POLICY "Users can read own feedback" ON public.feedback FOR SELECT USING (auth.uid() = user_id);

COMMENT ON TABLE public.feedback IS 'In-app bug reports and feature requests; view in Supabase Dashboard.';
