-- ==============================================================================
-- Migration 005: Create Spatial & Performance Indexes
-- Project: EmergeX Emergency Healthcare Navigator
-- Phase: 1 — Database Foundation
-- Description: Creates GIST spatial indexes for geospatial queries and selective
--              partial indexes for active emergency facility filtering.
-- ==============================================================================

-- 1. Spatial Indexes (PostGIS GIST)
-- Optimizes ST_DWithin and KNN distance-sorted queries
CREATE INDEX IF NOT EXISTS idx_hospitals_location 
    ON hospitals USING GIST (location);

CREATE INDEX IF NOT EXISTS idx_blood_banks_location 
    ON blood_banks USING GIST (location);

-- 2. Partial Operational Indexes
-- Optimizes filtering for operational facilities only
CREATE INDEX IF NOT EXISTS idx_hospitals_active 
    ON hospitals (is_active) 
    WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_blood_banks_active 
    ON blood_banks (is_active) 
    WHERE is_active = true;

-- Optimizes emergency capacity queries
CREATE INDEX IF NOT EXISTS idx_hospitals_emergency 
    ON hospitals (emergency_available, beds_available) 
    WHERE is_active = true;

-- 3. SOS Logs Query Indexes
CREATE INDEX IF NOT EXISTS idx_sos_logs_created_at 
    ON sos_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sos_logs_status 
    ON sos_logs (status);
