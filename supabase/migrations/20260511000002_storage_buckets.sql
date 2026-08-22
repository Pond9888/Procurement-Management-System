-- =============================================================
-- Sprint 5: Supabase Storage buckets for document uploads
-- =============================================================

-- grd-pdfs bucket (already used in Sprint 4, ensure it exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('grd-pdfs', 'grd-pdfs', true)
ON CONFLICT (id) DO NOTHING;

-- grd-docs bucket for supporting document uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('grd-docs', 'grd-docs', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policy: authenticated users can read all docs
CREATE POLICY "authenticated read grd-docs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'grd-docs');

-- RLS policy: service role can do everything (used by API routes via createServiceClient)
-- Note: service_role bypasses RLS by default — no explicit policy needed.

-- RLS policy: authenticated users can read PDFs
CREATE POLICY "authenticated read grd-pdfs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'grd-pdfs');
