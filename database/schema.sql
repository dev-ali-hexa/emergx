-- ==============================================================================
-- EmergeX Complete Database Schema (Consolidated)
-- Project: EmergeX Emergency Healthcare Navigator
-- Phase: 1 — Database Foundation
-- Description: Consolidated schema script containing migrations 001 through 005.
--              Safe to execute directly in the Supabase SQL Editor.
-- ==============================================================================

-- 1. Enable Extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Hospitals Table
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

-- 3. Blood Banks Table
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

-- 4. SOS Logs Table
CREATE TABLE IF NOT EXISTS sos_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT,
    latitude DOUBLE PRECISION NOT NULL CONSTRAINT chk_sos_latitude CHECK (latitude >= -90.0 AND latitude <= 90.0),
    longitude DOUBLE PRECISION NOT NULL CONSTRAINT chk_sos_longitude CHECK (longitude >= -180.0 AND longitude <= 180.0),
    message TEXT,
    contacts_notified JSONB NOT NULL DEFAULT '[]'::JSONB,
    status TEXT NOT NULL DEFAULT 'initiated' CONSTRAINT chk_sos_status CHECK (status IN ('initiated', 'dispatched', 'resolved', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_hospitals_location ON hospitals USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_blood_banks_location ON blood_banks USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_hospitals_active ON hospitals (is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_blood_banks_active ON blood_banks (is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_hospitals_emergency ON hospitals (emergency_available, beds_available) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_sos_logs_created_at ON sos_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sos_logs_status ON sos_logs (status);

-- 6. Geospatial Search Stored Functions (Phase 3)
CREATE OR REPLACE FUNCTION get_nearby_hospitals(
    user_lat DOUBLE PRECISION,
    user_lng DOUBLE PRECISION,
    radius_meters DOUBLE PRECISION DEFAULT 10000,
    emergency_filter BOOLEAN DEFAULT false,
    specialty_filter TEXT DEFAULT NULL,
    max_results INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    address TEXT,
    phone TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    distance_km DOUBLE PRECISION,
    specialties TEXT[],
    emergency_available BOOLEAN,
    beds_available INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_location geography(Point, 4326);
    clean_specialty TEXT;
BEGIN
    user_location := ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography;
    clean_specialty := NULLIF(TRIM(specialty_filter), '');
    
    RETURN QUERY
    SELECT 
        h.id,
        h.name,
        h.address,
        h.phone,
        h.latitude,
        h.longitude,
        ROUND((ST_Distance(h.location, user_location) / 1000.0)::numeric, 2)::DOUBLE PRECISION AS distance_km,
        h.specialties,
        h.emergency_available,
        h.beds_available
    FROM hospitals h
    WHERE h.is_active = true
      AND ST_DWithin(h.location, user_location, radius_meters)
      AND (NOT emergency_filter OR h.emergency_available = true)
      AND (
          clean_specialty IS NULL 
          OR EXISTS (
              SELECT 1 FROM unnest(h.specialties) s 
              WHERE LOWER(TRIM(s)) = LOWER(clean_specialty)
          )
      )
    ORDER BY ST_Distance(h.location, user_location) ASC
    LIMIT max_results;
END;
$$;
