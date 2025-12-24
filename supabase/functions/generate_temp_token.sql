-- Function to generate temp reservation token
CREATE OR REPLACE FUNCTION public.generate_temp_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  token TEXT;
BEGIN
  -- Generate a shorter temp token
  token := encode(gen_random_bytes(16), 'base64');
  -- Make it URL-safe
  token := replace(replace(replace(token, '+', '-'), '/', '_'), '=', '');
  RETURN token;
END;
$$;