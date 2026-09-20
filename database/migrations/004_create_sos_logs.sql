-- ==============================================================================
-- Migration 004: Create SOS Logs Table
-- Project: EmergeX Emergency Healthcare Navigator
-- Phase: 1 — Database Foundation
-- Description: Creates sos_logs table for tracking emergency dispatch actions.
--              Maintains user_id compatibility for future auth without fake tables.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS sos_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT, -- Open identifier for future authentication integration
    latitude DOUBLE PRECISION NOT NULL CONSTRAINT chk_sos_latitude CHECK (latitude >= -90.0 AND latitude <= 90.0),
    longitude DOUBLE PRECISION NOT NULL CONSTRAINT chk_sos_longitude CHECK (longitude >= -180.0 AND longitude <= 180.0),
    message TEXT,
    contacts_notified JSONB NOT NULL DEFAULT '[]'::JSONB,
    status TEXT NOT NULL DEFAULT 'initiated' CONSTRAINT chk_sos_status CHECK (status IN ('initiated', 'dispatched', 'resolved', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Comments for schema clarity
COMMENT ON TABLE sos_logs IS 'Audit and dispatch log for emergency SOS requests';
COMMENT ON COLUMN sos_logs.contacts_notified IS 'JSON array of emergency contacts alerted (e.g. phone numbers, delivery status)';
COMMENT ON COLUMN sos_logs.status IS 'Lifecycle state: initiated, dispatched, resolved, or cancelled';
