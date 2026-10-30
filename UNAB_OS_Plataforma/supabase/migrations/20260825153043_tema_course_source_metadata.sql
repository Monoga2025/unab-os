-- Official source metadata returned by Moodle. These values are displayed as
-- captured; Universidad OS does not infer a category or calculate progress.

alter table public.tema_courses
  add column category_name text,
  add column progress_percent numeric(5,2);

alter table public.tema_courses
  add constraint tema_courses_category_name_check check (
    category_name is null or length(btrim(category_name)) between 1 and 1000
  ),
  add constraint tema_courses_progress_percent_check check (
    progress_percent is null or progress_percent between 0 and 100
  );
