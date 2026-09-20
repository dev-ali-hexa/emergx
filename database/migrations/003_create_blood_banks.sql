-- ==============================================================================
-- Migration 003: Create Blood Banks Table
-- Project: EmergeX Emergency Healthcare Navigator
-- Phase: 1 — Database Foundation
-- Description: Creates blood_banks table with PostGIS geography point,
--              coordinate validation, blood group array, and auto-sync triggers.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS blood_banks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    latitude DOUBLE PRECISION NOT NULL CONSTRAINT chk_blood_bank_latitude CHECK (latitude >= -90.0 AND latitude <= 90.0),
    longitude DOUBLE PRECISION NOT NULL CONSTRAINT chk_blood_bank_longitude CHECK (longitude >= -180.0 AND longitude <= 180.0),
    location geography(Point, 4326),
    available_blood_groups TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Comments for schema clarity
COMMENT ON TABLE blood_banks IS 'Blood banks and depository units with available blood groups';
COMMENT ON COLUMN blood_banks.available_blood_groups IS 'Array of blood groups currently stored (e.g. A+, O-, etc.)';

-- Trigger function to automatically keep PostGIS geography location in sync with latitude/longitude
CREATE OR REPLACE FUNCTION sync_blood_bank_location()
RETURNS TRIGGER AS $$
BEGIN
    NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
    NEW.updated_at := timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_blood_banks_sync_location ON blood_banks;
CREATE TRIGGER trg_blood_banks_sync_location
BEFORE INSERT OR UPDATE ON blood_banks
FOR EACH ROW
EXECUTE FUNCTION sync_blood_bank_location();
