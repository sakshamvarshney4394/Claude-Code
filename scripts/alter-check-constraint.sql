-- Step 4: Alter CHECK constraint to remove 'Closed' from allowed values
ALTER TABLE samples
DROP CONSTRAINT IF EXISTS samples_output_check;

ALTER TABLE samples
ADD CONSTRAINT samples_output_check
CHECK (output IN ('Pending', 'Onboard', 'Not Interested', 'Interested but need time'));

-- Test that 'Closed' is now rejected
-- This should fail with a CHECK constraint violation
-- INSERT INTO samples (sample_id, party_name, product_id, sample_submission_date, output)
-- VALUES (gen_random_uuid(), 'Test Client', (SELECT product_id FROM products LIMIT 1), CURRENT_DATE, 'Closed');
