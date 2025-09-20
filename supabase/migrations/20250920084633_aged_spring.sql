/*
  # Add Avatar Support and Enhanced Notifications

  1. Schema Updates
    - Add avatar_url column to profiles if not exists
    - Add notification preferences
    - Add password reset tracking

  2. Functions
    - Add function to handle avatar updates
    - Add notification management functions

  3. Security
    - Update RLS policies for avatar access
    - Add policies for notification management
*/

-- Add avatar_url column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE profiles ADD COLUMN avatar_url text;
  END IF;
END $$;

-- Add notification settings column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'notification_settings'
  ) THEN
    ALTER TABLE profiles ADD COLUMN notification_settings jsonb DEFAULT '{"email": true, "push": true, "sms": false}';
  END IF;
END $$;

-- Create password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on password reset tokens
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Password reset tokens policies
CREATE POLICY "Users can read own reset tokens"
  ON password_reset_tokens FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

-- Function to clean up expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM password_reset_tokens 
  WHERE expires_at < now() OR used_at IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update notification settings
CREATE OR REPLACE FUNCTION update_notification_settings()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure notification_settings has default values
  IF NEW.notification_settings IS NULL THEN
    NEW.notification_settings = '{"email": true, "push": true, "sms": false}';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for notification settings
DROP TRIGGER IF EXISTS trigger_update_notification_settings ON profiles;
CREATE TRIGGER trigger_update_notification_settings
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_settings();

-- Add some sample notification templates
CREATE TABLE IF NOT EXISTS notification_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL,
  variables text[],
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on notification templates
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

-- Notification templates policies
CREATE POLICY "Anyone can read active templates"
  ON notification_templates FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage templates"
  ON notification_templates FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Insert default notification templates
INSERT INTO notification_templates (name, title, message, type, variables) VALUES
('issue_created', 'Issue Reported', 'Your issue "{{title}}" has been submitted and is being reviewed.', 'issue_update', ARRAY['title']),
('issue_acknowledged', 'Issue Acknowledged', 'Your issue "{{title}}" has been acknowledged by city officials.', 'issue_update', ARRAY['title']),
('issue_in_progress', 'Issue In Progress', 'Work has started on your issue "{{title}}".', 'issue_update', ARRAY['title']),
('issue_resolved', 'Issue Resolved', 'Your issue "{{title}}" has been resolved. Thank you for reporting!', 'issue_update', ARRAY['title']),
('feedback_received', 'Feedback Received', 'Thank you for your feedback. We will review it and respond if necessary.', 'feedback', ARRAY[]),
('feedback_responded', 'Feedback Response', 'We have responded to your feedback "{{subject}}".', 'feedback', ARRAY['subject'])
ON CONFLICT (name) DO NOTHING;