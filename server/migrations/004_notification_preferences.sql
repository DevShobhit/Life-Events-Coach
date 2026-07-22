CREATE TABLE IF NOT EXISTS notification_preferences (
    user_id VARCHAR(100) PRIMARY KEY,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    timezone VARCHAR(100) NOT NULL DEFAULT 'UTC',
    local_time TIME NOT NULL DEFAULT '09:00:00',
    delivery_status VARCHAR(30) NOT NULL DEFAULT 'not_configured',
    last_delivery_at TIMESTAMPTZ NULL
);
