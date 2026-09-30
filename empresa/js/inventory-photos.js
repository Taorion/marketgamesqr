(() => {
  const MAX_BYTES = 500000;
  const input = document.getElementById("inventoryPhotoInput");
  const preview = document.getElementById("inventoryPhotoPreview");
  const remove = document.getElementById("inventoryPhotoRemove");
  const message = document.getElementById("inventoryPhotoMessage");
  let selectedFile = null;
  let removed = false;
  let previewUrl = "";
  let revision = 0;
  const observers = new WeakMap();
  const requests = new Map();

  function readPhoto(productId) {
    const key = `${businessScopeKey()}:${productId}`;
    if (!requests.has(key)) {
      requests.set(key, api(`/api/business/inventory/products/${encodeURIComponent(productId)}/photo`, {
        headers: authHeaders(), noClientCache: true, cache: "no-store",
      }).finally(() => requests.delete(key)));
    }
    return requests.get(key);
  }

  function clearPreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = "";
    preview.removeAttribute("src");
    preview.hidden = true;
  }

  function reset(product = null) {
    const currentRevision = ++revision;
    selectedFile = null;
    removed = false;
    input.value = "";
    input.setCustomValidity("");
    clearPreview();
    remove.hidden = !product?.has_photo;
    message.textContent = "JPG, PNG o WebP. Máximo 500 KB.";
    if (product?.has_photo) {
      const scope = businessScopeKey();
      readPhoto(product.id).then((data) => {
        if (revision !== currentRevision || scope !== businessScopeKey()) return;
        preview.src = data.data_url;
        preview.hidden = false;
      }).catch(() => {
        if (revision === currentRevision) message.textContent = "No se pudo cargar la vista previa. La foto guardada se conserva.";
      });
    }
  }

  input?.addEventListener("change", () => {
    const file = input.files?.[0];
    if (!file) return;
    ++revision;
    const error = file.size > MAX_BYTES ? "La foto supera 500 KB. Elige una imagen más pequeña."
      : !["image/jpeg", "image/png", "image/webp"].includes(file.type) || !file.size
        ? "Selecciona una foto JPG, PNG o WebP válida." : "";
    input.setCustomValidity(error);
    if (error) {
      selectedFile = null;
      message.textContent = error;
      remove.hidden = false;
      input.reportValidity();
      return;
    }
    selectedFile = file;
    removed = false;
    clearPreview();
    previewUrl = URL.createObjectURL(file);
    preview.src = previewUrl;
    preview.hidden = false;
    remove.hidden = false;
    message.textContent = `${file.name} · ${Math.ceil(file.size / 1000)} KB. Se guardará con el producto.`;
  });

  remove?.addEventListener("click", () => {
    ++revision;
    selectedFile = null;
    removed = true;
    input.value = "";
    input.setCustomValidity("");
    clearPreview();
    remove.hidden = true;
    message.textContent = "La foto se quitará al guardar el producto.";
  });

  window.inventoryPhotoEditor = {
    reset,
    async payload() {
      if (!input.checkValidity()) throw new Error(input.validationMessage);
      if (removed) return { photo_data_url: null };
      if (!selectedFile) return {};
      const file = selectedFile;
      if (file.size > MAX_BYTES) throw new Error("La foto debe pesar como máximo 500 KB.");
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("No se pudo leer la foto. Vuelve a seleccionarla."));
        reader.readAsDataURL(file);
      });
      return { photo_data_url: dataUrl };
    },
    markup(product) {
      return product.has_photo ? `<img class="inventory-product-photo" data-inventory-photo="${escapeHtml(product.id)}" width="72" height="72" alt="Foto de ${escapeHtml(product.name || "producto")}" decoding="async">` : "";
    },
    observe(root) {
      if (!root) return;
      observers.get(root)?.disconnect();
      const scope = businessScopeKey();
      const load = (img) => readPhoto(img.dataset.inventoryPhoto).then((data) => {
        if (img.isConnected && scope === businessScopeKey()) img.src = data.data_url;
      }).catch(() => { img.hidden = true; });
      const images = root.querySelectorAll("img[data-inventory-photo]");
      if (!("IntersectionObserver" in window)) { images.forEach(load); return; }
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(({ target, isIntersecting }) => {
          if (!isIntersecting) return;
          observer.unobserve(target);
          load(target);
        });
      }, { rootMargin: "120px" });
      observers.set(root, observer);
      images.forEach((img) => observer.observe(img));
    },
  };
})();
