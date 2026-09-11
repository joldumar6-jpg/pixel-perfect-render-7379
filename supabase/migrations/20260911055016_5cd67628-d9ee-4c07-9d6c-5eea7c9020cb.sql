CREATE POLICY "Ver ficheiros do repositorio" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'documentos');
CREATE POLICY "Carregar ficheiros no repositorio" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documentos' AND owner = auth.uid());
CREATE POLICY "Atualizar ficheiros proprios" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'documentos' AND (owner = auth.uid() OR public.is_chefe()))
WITH CHECK (bucket_id = 'documentos');
CREATE POLICY "Eliminar ficheiros proprios ou chefe" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'documentos' AND (owner = auth.uid() OR public.is_chefe()));