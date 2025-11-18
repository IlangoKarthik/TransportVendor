-- Migration script to rename field_X columns to proper column names
-- This fixes the issue where columns were created as field_0, field_1, etc.
-- Based on your data structure, adjust the mapping if needed

-- NOTE: Based on your JSON data:
-- field_0 = "Patel Transport Services" -> transport_name
-- field_1 = "Suresh Patel" -> name
-- field_2 = "Ahmedabad" -> vendor_city
-- field_3 = "Gujarat" -> vendor_state
-- field_4 = "Patel Transport - Ahmedabad" -> visiting_card
-- field_5 = "Tempo, Light Truck" -> vehicle_type
-- field_6 = "Ahmedabad, Surat, Vadodara" -> main_service_city
-- field_7 = "Broker" -> owner_broker
-- field_8 = "+91-9123456780" -> whatsapp_number
-- field_9 = "+91-9123456781" -> alternate_number
-- field_10 = "Gujarat" -> main_service_state
-- field_11 = "N" -> return_service
-- field_12 = "N" -> any_association
-- field_13 = null -> association_name
-- field_14 = "Verified" -> verification
-- field_15 = "Best for local..." -> notes

DO $$ 
BEGIN
  -- Rename field_0 to transport_name (based on your data: "Patel Transport Services")
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'field_0')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'transport_name') THEN
    ALTER TABLE vendors RENAME COLUMN field_0 TO transport_name;
  END IF;

  -- Rename field_1 to name (based on your data: "Suresh Patel")
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'field_1')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'name') THEN
    ALTER TABLE vendors RENAME COLUMN field_1 TO name;
  END IF;

  -- Rename field_2 to vendor_city (based on your data: "Ahmedabad")
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'field_2')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'vendor_city') THEN
    ALTER TABLE vendors RENAME COLUMN field_2 TO vendor_city;
  END IF;

  -- Rename field_3 to vendor_state (based on your data: "Gujarat")
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'field_3')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'vendor_state') THEN
    ALTER TABLE vendors RENAME COLUMN field_3 TO vendor_state;
  END IF;

  -- Rename field_4 to visiting_card
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'field_4')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'visiting_card') THEN
    ALTER TABLE vendors RENAME COLUMN field_4 TO visiting_card;
  END IF;

  -- Rename field_5 to vehicle_type
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'field_5')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'vehicle_type') THEN
    ALTER TABLE vendors RENAME COLUMN field_5 TO vehicle_type;
  END IF;

  -- Rename field_6 to main_service_city
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'field_6')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'main_service_city') THEN
    ALTER TABLE vendors RENAME COLUMN field_6 TO main_service_city;
  END IF;

  -- Rename field_7 to owner_broker
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'field_7')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'owner_broker') THEN
    ALTER TABLE vendors RENAME COLUMN field_7 TO owner_broker;
  END IF;

  -- Rename field_8 to whatsapp_number
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'field_8')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'whatsapp_number') THEN
    ALTER TABLE vendors RENAME COLUMN field_8 TO whatsapp_number;
  END IF;

  -- Rename field_9 to alternate_number
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'field_9')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'alternate_number') THEN
    ALTER TABLE vendors RENAME COLUMN field_9 TO alternate_number;
  END IF;

  -- Rename field_10 to main_service_state
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'field_10')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'main_service_state') THEN
    ALTER TABLE vendors RENAME COLUMN field_10 TO main_service_state;
  END IF;

  -- Rename field_11 to return_service
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'field_11')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'return_service') THEN
    ALTER TABLE vendors RENAME COLUMN field_11 TO return_service;
  END IF;

  -- Rename field_12 to any_association
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'field_12')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'any_association') THEN
    ALTER TABLE vendors RENAME COLUMN field_12 TO any_association;
  END IF;

  -- Rename field_13 to association_name
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'field_13')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'association_name') THEN
    ALTER TABLE vendors RENAME COLUMN field_13 TO association_name;
  END IF;

  -- Rename field_14 to verification
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'field_14')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'verification') THEN
    ALTER TABLE vendors RENAME COLUMN field_14 TO verification;
  END IF;

  -- Handle field_15 and notes column
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'field_15')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'notes') THEN
    ALTER TABLE vendors RENAME COLUMN field_15 TO notes;
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'field_15')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'notes') THEN
    -- Copy data from field_15 to notes if notes is null
    UPDATE vendors SET notes = field_15 WHERE notes IS NULL AND field_15 IS NOT NULL;
    -- Drop field_15
    ALTER TABLE vendors DROP COLUMN field_15;
  END IF;

  RAISE NOTICE 'Column renaming completed';
END $$;

