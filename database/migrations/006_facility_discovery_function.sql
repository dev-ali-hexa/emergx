-- ==============================================================================
-- Migration 006: Create PostGIS Facility Discovery Function
-- Project: EmergeX Emergency Healthcare Navigator
-- Phase: 3 — Backend Facility Discovery & PostGIS Geospatial Matching
-- Description: Creates a high-performance PostgreSQL/PostGIS stored function
--              for geodesic facility search utilizing existing GIST spatial index.
-- ==============================================================================

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
    -- Construct PostGIS WGS 84 geography point from user coordinates
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
      -- Spatial radius filter utilizing idx_hospitals_location GIST index
      AND ST_DWithin(h.location, user_location, radius_meters)
      -- Optional emergency department operational filter
      AND (NOT emergency_filter OR h.emergency_available = true)
      -- Optional case-insensitive specialty filter
      AND (
          clean_specialty IS NULL 
          OR EXISTS (
              SELECT 1 FROM unnest(h.specialties) s 
              WHERE LOWER(TRIM(s)) = LOWER(clean_specialty)
          )
      )
    -- Nearest-first geodesic ordering
    ORDER BY ST_Distance(h.location, user_location) ASC
    LIMIT max_results;
END;
$$;

COMMENT ON FUNCTION get_nearby_hospitals IS 'Searches nearby hospitals within a radius in meters, sorted nearest-first using PostGIS ST_DWithin and ST_Distance.';
