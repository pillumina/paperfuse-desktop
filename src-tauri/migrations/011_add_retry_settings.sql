-- Migration: 011_add_retry_settings
-- Description: Add retry configuration to settings table

-- Insert default retry configuration
INSERT INTO settings (key, value, updated_at)
VALUES (
    'retry_config',
    '{"maxRetries":3,"maxRetryDurationSecs":300,"initialBackoffMs":1000,"maxBackoffMs":30000,"backoffMultiplier":2.0,"jitterFactor":0.1,"requestTimeoutSecs":120,"retryOnRateLimit":true,"retryOnServerError":true,"retryOnNetworkError":true}',
    datetime('now')
)
ON CONFLICT(key) DO NOTHING;
