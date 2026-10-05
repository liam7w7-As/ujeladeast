// Only a missing RPC permits the pre-migration path, never a timeout or failed write.
export const missingStudyRpc = error => ['PGRST202', '42883'].includes(error?.code);

export function studySaveError(error) {
  if (error?.code === 'P0003') {
    const locked = new Error('Completa las semanas anteriores antes de continuar con esta lección. Tu borrador se conserva.');
    locked.code = 'study_week_locked';
    return locked;
  }
  if (error?.code === 'P0002') {
    const revised = new Error('La lección cambió. Vuelve a abrirla; tu borrador se conserva.');
    revised.code = 'study_content_changed';
    return revised;
  }
  return error;
}
