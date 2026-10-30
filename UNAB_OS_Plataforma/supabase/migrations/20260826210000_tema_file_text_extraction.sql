alter table public.tema_files
  add column extracted_text text,
  add column text_extraction_status text not null default 'not_extracted'
    constraint tema_files_text_extraction_status_check check (
      text_extraction_status in ('not_extracted', 'ready', 'ocr_needed', 'unsupported', 'failed')
    );

alter table public.tema_files
  add constraint tema_files_extracted_text_size_check check (
    extracted_text is null or length(extracted_text) <= 24000
  );

create index tema_files_owner_text_extraction_idx
  on public.tema_files (owner_id, text_extraction_status)
  where catalog_visible;

create or replace function public.reset_tema_file_text_on_digest_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.sha256 is distinct from old.sha256 then
    new.extracted_text := null;
    new.text_extraction_status := 'not_extracted';
  end if;
  return new;
end;
$$;

create trigger reset_tema_file_text_on_digest_change
before update of sha256 on public.tema_files
for each row execute function public.reset_tema_file_text_on_digest_change();

revoke all on function public.reset_tema_file_text_on_digest_change() from public, anon, authenticated;
grant execute on function public.reset_tema_file_text_on_digest_change() to service_role;
