-- Function to generate secure gift room token
CREATE OR REPLACE FUNCTION public.generate_gift_room_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  token TEXT;
BEGIN
  -- Generate a cryptographically secure token
  token := encode(gen_random_bytes(32), 'base64');
  -- Make it URL-safe
  token := replace(replace(replace(token, '+', '-'), '/', '_'), '=', '');
  RETURN token;
END;
$$;