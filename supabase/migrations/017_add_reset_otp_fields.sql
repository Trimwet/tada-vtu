-- Add OTP fields for PIN reset functionality
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS reset_otp TEXT,
ADD COLUMN IF NOT EXISTS reset_otp_expires TIMESTAMPTZ;

-- Add index for faster OTP lookups
CREATE INDEX IF NOT EXISTS idx_profiles_reset_otp ON profiles(email, reset_otp) WHERE reset_otp IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN profiles.reset_otp IS 'Temporary OTP for PIN reset verification';
COMMENT ON COLUMN profiles.reset_otp_expires IS 'Expiration timestamp for reset OTP';