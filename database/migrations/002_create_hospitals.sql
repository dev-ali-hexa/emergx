-- ==============================================================================
-- Migration 002: Create Hospitals Table
-- Project: EmergeX Emergency Healthcare Navigator
-- Phase: 1 — Database Foundation
-- Description: Creates hospitals table with PostGIS geography point,
--              coordinate range constraints, specialty array, and auto-sync triggers.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS hospitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    latitude DOUBLE PRECISION NOT NULL CONSTRAINT chk_hospital_latitude CHECK (latitude >= -90.0 AND latitude <= 90.0),
    longitude DOUBLE PRECISION NOT NULL CONSTRAINT chk_hospital_longitude CHECK (longitude >= -180.0 AND longitude <= 180.0),
    location geography(Point, 4326),
    specialties TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
    emergency_available BOOLEAN NOT NULL DEFAULT true,
    beds_available INTEGER NOT NULL DEFAULT 0 CONSTRAINT chk_hospital_beds CHECK (beds_available >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Comments for schema clarity
COMMENT ON TABLE hospitals IS 'Healthcare facilities and hospitals with emergency capabilities';
COMMENT ON COLUMN hospitals.location IS 'Spatial Point in WGS 84 (EPSG:4326) geography for distance calculation';
COMMENT ON COLUMN hospitals.specialties IS 'Array of medical specialties supported (e.g. Cardiology, Trauma, ICU)';

-- Trigger function to automatically keep PostGIS geography location in sync with latitude/longitude
CREATE OR REPLACE FUNCTION sync_hospital_location()
RETURNS TRIGGER AS $$
BEGIN
    NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
    NEW.updated_at := timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_hospitals_sync_location ON hospitals;
CREATE TRIGGER trg_hospitals_sync_location
BEFORE INSERT OR UPDATE ON hospitals
FOR EACH ROW
EXECUTE FUNCTION sync_hospital_location();
