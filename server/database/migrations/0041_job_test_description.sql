-- The AI scores a test description as the real posting. The flag does not hide the job.
ALTER TABLE "job" ADD COLUMN "is_test_description" boolean DEFAULT false NOT NULL;
