(() => {
  'use strict';
  const labels = { IDENTITY: 'Cédula', RUT: 'RUT actualizado', BANK: 'Certificado bancario', CONTRACT: 'Contrato firmado y autenticado' };
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function open({ record, dialog, request, download, isCurrent }) {
    let current = record;
    const editable = a => a && (['DRAFT', 'CHANGES_REQUESTED', 'SUBMITTED'].includes(a.status) || (a.status === 'APPROVED' && a.approval_mode === 'ADMIN_OVERRIDE'));
    const canSubmit = () => editable(current.application) && current.application.status !== 'SUBMITTED' && Object.keys(labels).every(kind => current.documents.some(doc => doc.kind === kind));
    const d = dialog('Documentos de ' + record.name, `
      <section class="full seller-document-intro"><p>Adjunta los documentos que el vendedor ya entregó al equipo de Qori. La carga queda registrada con tu usuario y requiere revisión antes de aprobar el expediente.</p><p><strong>${esc(record.name)}</strong><br>${esc(record.email)}</p></section>
      <div class="full seller-document-grid" data-documents></div>
      <section class="full seller-document-submit" data-submit-section>
        <h3>Preparar la revisión</h3><p>Confirma la recepción de los cuatro documentos. Las condiciones aceptadas por el vendedor durante su registro se conservan.</p>
        <label class="checkbox-row"><input name="documents_received" type="checkbox" required><span>Recibí del vendedor los cuatro documentos completos y legibles.</span></label>
        <label class="checkbox-row"><input name="signed_and_notarized" type="checkbox" required><span>El contrato adjunto está firmado y autenticado ante notaría.</span></label>
        <label><span>Nota para el historial del expediente</span><textarea name="note" minlength="15" maxlength="2000" required placeholder="Documentación recibida y adjuntada por el equipo de Qori."></textarea></label>
      </section>`, async form => {
      if (!canSubmit()) throw Error('Completa los documentos o actualiza el expediente antes de enviarlo.');
      await request(`/api/seller/admin/applications/${record.id}/submit`, {
        documents_received: form.has('documents_received'), signed_and_notarized: form.has('signed_and_notarized'), note: form.get('note'),
        document_hashes: Object.fromEntries(current.documents.map(doc => [doc.kind, doc.sha256]))
      }, 'POST');
    });
    const message = d.querySelector('[role=status]');
    const save = d.querySelector('[type=submit]');
    save.textContent = 'Enviar expediente a revisión';
    function render() {
      const allow = editable(current.application);
      d.querySelector('[data-documents]').innerHTML = Object.entries(labels).map(([kind, label]) => {
        const doc = current.documents.find(item => item.kind === kind);
        return `<article class="seller-document-card"><h3>${label}</h3><p>${doc ? `${esc(doc.filename)} · ${Math.ceil(doc.byte_size / 1024)} KB` : 'Sin adjuntar'}</p>${doc ? `<button type="button" class="secondary-button" data-download="${doc.id}">Descargar ${label.toLowerCase()}</button>` : ''}${allow ? `<label><span>${doc ? 'Reemplazar' : 'Adjuntar'} ${label.toLowerCase()}</span><input type="file" data-upload="${kind}" accept="application/pdf,image/jpeg,image/png"></label>` : ''}<small>PDF, JPG o PNG · máximo 8 MB</small></article>`;
      }).join('');
      save.disabled = !canSubmit();
      d.querySelector('[data-submit-section]').hidden = !allow || current.application.status === 'SUBMITTED';
      d.querySelectorAll('[data-submit-section] input,[data-submit-section] textarea').forEach(input => { input.disabled = !allow || current.application.status === 'SUBMITTED'; });
      if (!allow) message.textContent = 'Este expediente no admite cambios. Para reemplazar documentos aprobados, solicita correcciones desde Revisar expediente.';
      else if (current.application.status === 'SUBMITTED') message.textContent = 'Expediente enviado. Puedes revisarlo desde Administrar → Revisar expediente. Si reemplazas un archivo, deberás enviarlo nuevamente.';
      d.querySelectorAll('[data-download]').forEach(button => button.onclick = async () => {
        const doc = current.documents.find(item => item.id === button.dataset.download);
        try { await download('/api/seller/documents/' + doc.id, doc.filename); }
        catch (error) { if (isCurrent() && d.isConnected) message.textContent = error.message; }
      });
      d.querySelectorAll('[data-upload]').forEach(input => input.onchange = async () => {
        const file = input.files[0];
        if (!file || d.dataset.saving) return;
        if (!file.size || file.size > 8 * 1024 * 1024) { message.textContent = 'Selecciona un documento de hasta 8 MB con contenido.'; input.value = ''; return; }
        if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) { message.textContent = 'Selecciona un PDF, JPG o PNG.'; input.value = ''; return; }
        d.dataset.saving = 'true';
        d.querySelectorAll('button,input,textarea').forEach(control => { control.disabled = true; });
        message.textContent = 'Adjuntando documento…';
        try {
          const content_base64 = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = () => reject(Error('No se pudo leer el archivo.')); reader.readAsDataURL(file); });
          if (!isCurrent() || !d.isConnected) return;
          const previous = current.documents.find(doc => doc.kind === input.dataset.upload);
          await request(`/api/seller/admin/applications/${record.id}/documents/${input.dataset.upload}`, { filename: file.name, content_base64, expected_sha256: previous?.sha256 || null }, 'PUT');
          if (!isCurrent() || !d.isConnected) return;
          current = (await request(`/api/admin/accounts/sellers/${record.id}`)).record;
          if (!isCurrent() || !d.isConnected) return;
          message.textContent = 'Documento adjuntado. La aprobación documental sigue pendiente.';
        } catch (error) {
          if (isCurrent() && d.isConnected) message.textContent = error.message;
        } finally {
          delete d.dataset.saving;
          if (isCurrent() && d.isConnected) { d.querySelectorAll('button,input,textarea').forEach(control => { control.disabled = false; }); render(); }
        }
      });
    }
    render();
  }
  window.QoriSellerDocuments = { open };
})();
