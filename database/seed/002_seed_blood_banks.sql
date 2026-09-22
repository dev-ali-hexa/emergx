-- ==============================================================================
-- Seed Data 002: Demo / Mock Blood Banks
-- Project: EmergeX Emergency Healthcare Navigator
-- Phase: 1 — Database Foundation
--
-- IMPORTANT DISCLAIMER:
-- The records below are SYNTHETIC DEMO / MOCK DATA generated solely for hackathon
-- testing and integration. They do NOT represent real clinical blood bank stock.
-- ==============================================================================

INSERT INTO blood_banks (id, name, address, phone, latitude, longitude, available_blood_groups, is_active)
VALUES
    (
        'b0000000-0000-0000-0000-000000000001',
        'Red Cross Central Blood Bank [DEMO]',
        'Central Circle, Shivaji Nagar, Bengaluru, KA 560051',
        '+91-80-5550-0201',
        12.9800000,
        77.6000000,
        ARRAY['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
        true
    ),
    (
        'b0000000-0000-0000-0000-000000000002',
        'City Trauma Blood Depository [DEMO]',
        '14 Ring Rd, Koramangala, Bengaluru, KA 560034',
        '+91-80-5550-0202',
        12.9360000,
        77.6250000,
        ARRAY['A+', 'B+', 'O+', 'O-'],
        true
    ),
    (
        'b0000000-0000-0000-0000-000000000003',
        'Lifeline Pediatric & Maternal Blood Reserve [DEMO]',
        '90 Palace Cross Rd, Bengaluru, KA 560020',
        '+91-80-5550-0203',
        12.9920000,
        77.5930000,
        ARRAY['A+', 'B+', 'AB+', 'O+'],
        true
    ),
    (
        'b0000000-0000-0000-0000-000000000004',
        'West District Rotary Blood Storage Unit [DEMO]',
        '66 Chord Rd, Vijayanagar, Bengaluru, KA 560040',
        '+91-80-5550-0204',
        12.9610000,
        77.5380000,
        ARRAY['A+', 'A-', 'B+', 'B-', 'O+', 'O-'],
        true
    )
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    address = EXCLUDED.address,
    phone = EXCLUDED.phone,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    available_blood_groups = EXCLUDED.available_blood_groups,
    is_active = EXCLUDED.is_active;
