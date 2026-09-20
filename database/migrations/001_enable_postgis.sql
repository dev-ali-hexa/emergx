-- ==============================================================================
-- Migration 001: Enable PostGIS & UUID Extensions
-- Project: EmergeX Emergency Healthcare Navigator
-- Phase: 1 — Database Foundation
-- Description: Enables spatial geography capabilities and UUID generation.
-- ==============================================================================

-- Enable PostGIS extension for spatial queries and geography(Point, 4326)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Enable UUID extension for unique primary key generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;
