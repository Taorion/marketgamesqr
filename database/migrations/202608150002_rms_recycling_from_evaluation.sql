-- Reciclaje también puede originarse directamente en Evaluación.
-- La fase se conserva para que Inteligencia RMS pueda reconstruir el viaje
-- comercial del lead sin presentar una salida desde Negociación inexistente.
alter table rms_recycling_cases
  drop constraint if exists rms_recycling_cases_recycled_from_phase_check;

alter table rms_recycling_cases
  add constraint rms_recycling_cases_recycled_from_phase_check
  check (recycled_from_phase in ('procesamiento', 'accion_correctiva', 'control_anti_fuga'));
