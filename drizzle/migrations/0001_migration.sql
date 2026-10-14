
create policy "admins manage site media" on storage.objects for all to authenticated
  using (bucket_id = 'site-media' and public.has_role(auth.uid(), 'admin'))
  with check (bucket_id = 'site-media' and public.has_role(auth.uid(), 'admin'));
