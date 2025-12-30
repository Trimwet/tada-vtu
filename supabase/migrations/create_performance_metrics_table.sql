-- Create performance_metrics table for monitoring app performance
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    value DECIMAL(10,2) NOT NULL,
    rating VARCHAR(20) NOT NULL CHECK (rating IN ('good', 'needs-improvement', 'poor')),
    timestamp TIMESTAMPTZ NOT NULL,
    url TEXT NOT NULL,
    user_agent TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_performance_metrics_name ON performance_metrics(name);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_rating ON performance_metrics(rating);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON performance_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_created_at ON performance_metrics(created_at);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_user_id ON performance_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_url ON performance_metrics(url);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_performance_metrics_name_timestamp ON performance_metrics(name, timestamp);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_rating_created_at ON performance_metrics(rating, created_at);

-- Enable Row Level Security
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies for performance metrics
-- Allow anonymous inserts for performance monitoring
CREATE POLICY "Allow anonymous performance metric inserts" ON performance_metrics
    FOR INSERT 
    WITH CHECK (true);

-- Allow users to read their own metrics
CREATE POLICY "Users can read own performance metrics" ON performance_metrics
    FOR SELECT 
    USING (auth.uid() = user_id OR user_id IS NULL);

-- Allow admins to read all metrics
CREATE POLICY "Admins can read all performance metrics" ON performance_metrics
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Create function to clean up old performance metrics (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_performance_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM performance_metrics 
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    -- Log cleanup
    INSERT INTO system_logs (event_type, message, created_at)
    VALUES ('performance_cleanup', 'Cleaned up old performance metrics', NOW());
END;
$$;

-- Create a scheduled job to run cleanup weekly (if pg_cron is available)
-- SELECT cron.schedule('cleanup-performance-metrics', '0 2 * * 0', 'SELECT cleanup_old_performance_metrics();');

-- Create view for performance analytics dashboard
CREATE OR REPLACE VIEW performance_analytics AS
SELECT 
    name,
    COUNT(*) as total_count,
    AVG(value) as average_value,
    MIN(value) as min_value,
    MAX(value) as max_value,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY value) as median_value,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY value) as p95_value,
    COUNT(CASE WHEN rating = 'good' THEN 1 END) as good_count,
    COUNT(CASE WHEN rating = 'needs-improvement' THEN 1 END) as needs_improvement_count,
    COUNT(CASE WHEN rating = 'poor' THEN 1 END) as poor_count,
    ROUND(
        COUNT(CASE WHEN rating = 'good' THEN 1 END) * 100.0 / COUNT(*), 
        2
    ) as good_percentage,
    DATE_TRUNC('hour', created_at) as hour_bucket
FROM performance_metrics 
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY name, DATE_TRUNC('hour', created_at)
ORDER BY hour_bucket DESC, name;

-- Grant permissions
GRANT SELECT ON performance_analytics TO authenticated;
GRANT SELECT ON performance_analytics TO anon;

-- Create function to get performance summary
CREATE OR REPLACE FUNCTION get_performance_summary(
    timeframe_hours INTEGER DEFAULT 24,
    metric_name TEXT DEFAULT NULL
)
RETURNS TABLE (
    metric_name TEXT,
    total_samples BIGINT,
    avg_value NUMERIC,
    p50_value NUMERIC,
    p95_value NUMERIC,
    p99_value NUMERIC,
    good_rate NUMERIC,
    poor_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pm.name::TEXT,
        COUNT(*)::BIGINT as total_samples,
        ROUND(AVG(pm.value), 2) as avg_value,
        ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY pm.value), 2) as p50_value,
        ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY pm.value), 2) as p95_value,
        ROUND(PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY pm.value), 2) as p99_value,
        ROUND(
            COUNT(CASE WHEN pm.rating = 'good' THEN 1 END) * 100.0 / COUNT(*), 
            2
        ) as good_rate,
        ROUND(
            COUNT(CASE WHEN pm.rating = 'poor' THEN 1 END) * 100.0 / COUNT(*), 
            2
        ) as poor_rate
    FROM performance_metrics pm
    WHERE pm.created_at >= NOW() - (timeframe_hours || ' hours')::INTERVAL
    AND (metric_name IS NULL OR pm.name = metric_name)
    GROUP BY pm.name
    ORDER BY total_samples DESC;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_performance_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_performance_summary TO anon;

-- Insert initial comment
COMMENT ON TABLE performance_metrics IS 'Stores client-side performance metrics for monitoring app performance';
COMMENT ON COLUMN performance_metrics.name IS 'Name of the performance metric (e.g., CLS, FID, LCP, etc.)';
COMMENT ON COLUMN performance_metrics.value IS 'Numeric value of the metric';
COMMENT ON COLUMN performance_metrics.rating IS 'Performance rating based on Google Core Web Vitals thresholds';
COMMENT ON COLUMN performance_metrics.timestamp IS 'When the metric was recorded on the client';
COMMENT ON COLUMN performance_metrics.url IS 'URL where the metric was recorded';
COMMENT ON COLUMN performance_metrics.user_agent IS 'Browser user agent string';
COMMENT ON COLUMN performance_metrics.user_id IS 'Associated user ID if available';