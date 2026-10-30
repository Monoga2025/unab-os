begin;
insert into courses values ('dynamics-101','Dynamics',true);
insert into units values ('newtonian-motion','dynamics-101','Newtonian Motion');
insert into topics values ('forces','newtonian-motion','Forces and acceleration');
insert into objectives values ('fbd','forces','Construct free-body diagrams',true),('newton','forces','Apply Newton''s second law',true),('friction','forces','Model kinetic friction',true),('circular','forces','Analyze uniform circular motion',true);
insert into resources values ('teacher-force-note','fbd','teacher',true),('teacher-newton-note','newton','teacher',true);
insert into exercise_versions values ('fbd-v1','fbd',1),('fbd-v2','fbd',2),('newton-v1','newton',1),('newton-v2','newton',2),('friction-v1','friction',1),('friction-v2','friction',2),('circular-v1','circular',1),('circular-v2','circular',2);
do $$ begin
  if (select count(*) from courses where title='Dynamics') <> 1 or (select count(*) from units) <> 1 or (select count(*) from objectives) not between 3 and 5 then raise exception 'Dynamics seed invariant failed'; end if;
  if exists(select 1 from objectives o where o.m4_eligible and (select count(*) from exercise_versions v where v.objective_id=o.id) < 2) then raise exception 'M4-eligible objectives need two versions'; end if;
end $$;
commit;
