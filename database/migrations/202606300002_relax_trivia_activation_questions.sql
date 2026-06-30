alter table business_trivias drop constraint if exists business_trivias_questions_count;

alter table business_trivias
  add constraint business_trivias_questions_array
  check (jsonb_typeof(questions) = 'array');
