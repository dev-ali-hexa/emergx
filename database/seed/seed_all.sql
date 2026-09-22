-- ==============================================================================
-- Consolidated Seed Data (All Mock / Demo Records)
-- Project: EmergeX Emergency Healthcare Navigator
-- Phase: 1 — Database Foundation
--
-- IMPORTANT:
-- This script contains ONLY synthetic demo/mock records for hackathon evaluation.
-- Safe to execute in the Supabase SQL Editor after database/schema.sql.
-- ==============================================================================

-- 1. Seed Demo Hospitals
INSERT INTO hospitals (id, name, address, phone, latitude, longitude, specialties, emergency_available, beds_available, is_active)
VALUES
    (
        'a0000000-0000-0000-0000-000000000001',
        'Metro Central Trauma & Emergency Hospital [DEMO]',
        '100 MG Road, Central District, Bengaluru, KA 560001',
        '+91-80-5550-0101',
        12.9716000,
        77.5946000,
        ARRAY['Trauma', 'Cardiology', 'ICU', 'Orthopedics', 'General Surgery'],
        true,
        18,
        true
    ),
    (
        'a0000000-0000-0000-0000-000000000002',
        'Apex Cardiac & Vascular Emergency Center [DEMO]',
        '45 Jayanagar 4th Block, Bengaluru, KA 560011',
        '+91-80-5550-0102',
        12.9279000,
        77.5837000,
        ARRAY['Cardiology', 'Cardiothoracic Surgery', 'Vascular Surgery', 'ICU'],
        true,
        12,
        true
    ),
    (
        'a0000000-0000-0000-0000-000000000003',
        'Koramangala Surgical & Critical Care [DEMO]',
        '12 Intermediate Ring Rd, Koramangala, Bengaluru, KA 560034',
        '+91-80-5550-0103',
        12.9352000,
        77.6245000,
        ARRAY['Trauma', 'Neurosurgery', 'Critical Care', 'Burn Unit'],
        true,
        8,
        true
    ),
    (
        'a0000000-0000-0000-0000-000000000004',
        'Lifeline Children & Maternity Emergency Center [DEMO]',
        '88 Palace Cross Rd, Vasanth Nagar, Bengaluru, KA 560020',
        '+91-80-5550-0104',
        12.9915000,
        77.5925000,
        ARRAY['Pediatrics', 'Obstetrics', 'Neonatal ICU', 'Pediatric Surgery'],
        true,
        15,
        true
    ),
    (
        'a0000000-0000-0000-0000-000000000005',
        'St. Jude Community Outpatient Clinic [DEMO]',
        '24 Domlur Layout, Old Airport Rd, Bengaluru, KA 560071',
        '+91-80-5550-0105',
        12.9611000,
        77.6387000,
        ARRAY['General Medicine', 'Outpatient', 'Minor Procedures'],
        false,
        0,
        true
    ),
    (
        'a0000000-0000-0000-0000-000000000006',
        'Sunrise Multispecialty & Trauma Hospital [DEMO]',
        '17 Malleshwaram 8th Cross, Bengaluru, KA 560003',
        '+91-80-5550-0106',
        13.0034000,
        77.5645000,
        ARRAY['Orthopedics', 'General Surgery', 'Nephrology', 'Pulmonology', 'Trauma'],
        true,
        22,
        true
    ),
    (
        'a0000000-0000-0000-0000-000000000007',
        'Northstar Neurological & Stroke Institute [DEMO]',
        '5 Bellary Rd, Hebbal, Bengaluru, KA 560024',
        '+91-80-5550-0107',
        13.0358000,
        77.5970000,
        ARRAY['Neurology', 'Neurosurgery', 'Stroke Unit', 'ICU'],
        true,
        6,
        true
    ),
    (
        'a0000000-0000-0000-0000-000000000008',
        'South Valley Emergency & Toxicological Care [DEMO]',
        '33 HSR Layout Sector 1, Bengaluru, KA 560102',
        '+91-80-5550-0108',
        12.9116000,
        77.6438000,
        ARRAY['Trauma', 'Emergency Medicine', 'Toxicology', 'ICU'],
        true,
        14,
        true
    ),
    (
        'a0000000-0000-0000-0000-000000000009',
        'Hope Oncology & Specialized Infusion Center [DEMO]',
        '9 Indiranagar 100 Feet Rd, Bengaluru, KA 560038',
        '+91-80-5550-0109',
        12.9856000,
        77.6620000,
        ARRAY['Oncology', 'Hematology', 'Palliative Care'],
        false,
        4,
        true
    ),
    (
        'a0000000-0000-0000-0000-000000000010',
        'Westside Urgent Care & Emergency Hub [DEMO]',
        '64 Vijayanagar Chord Rd, Bengaluru, KA 560040',
        '+91-80-5550-0110',
        12.9602000,
        77.5372000,
        ARRAY['Emergency Medicine', 'General Surgery', 'ICU', 'Dialysis', 'Trauma'],
        true,
        25,
        true
    )
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    address = EXCLUDED.address,
    phone = EXCLUDED.phone,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    specialties = EXCLUDED.specialties,
    emergency_available = EXCLUDED.emergency_available,
    beds_available = EXCLUDED.beds_available,
    is_active = EXCLUDED.is_active;

-- 2. Seed Demo Blood Banks
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
