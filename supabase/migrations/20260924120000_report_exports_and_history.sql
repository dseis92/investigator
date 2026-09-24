-- Track the generated representation of each report event so the matter
-- workspace can distinguish a browser print from a branded PDF export.

alter table public.reports
  add column if not exists output_format text not null default 'print',
  add column if not exists file_name text,
  add column if not exists byte_size integer;

alter table public.reports
  drop constraint if exists reports_output_format_check;

alter table public.reports
  add constraint reports_output_format_check
  check (output_format in ('pdf', 'print'));

create index if not exists reports_matter_generated_idx
  on public.reports(matter_id, generated_at desc);
