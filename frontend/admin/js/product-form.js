/* Product add/edit form. In edit mode, loads the product, lets you manage
   existing images (set primary / delete), and append new ones. */
(function () {
  'use strict';
  const { svg, escapeHtml, toast, confirmModal } = window.AdminUI;
  const CATS = ['Sofas', 'Beds', 'Chairs', 'Dining Tables', 'Bufies/Cabinets', 'Custom Furniture', 'Other'];
  const STOCK = [['in_stock', 'In stock'], ['made_to_order', 'Made to order'], ['out_of_stock', 'Out of stock']];

  let content, editId = null, newFiles = [];

  document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(location.search);
    editId = params.get('id');
    const shell = await AdminShell.init(editId ? 'products' : 'product-form', editId ? 'Edit Product' : 'Add Product');
    content = shell.content;
    renderForm();
    if (editId) loadProduct(editId);
  });

  function renderForm() {
    content.innerHTML = `
      <form class="admin-form" id="pForm" novalidate>
        <div class="panel">
          <div class="panel__head"><h3>Product details</h3></div>
          <div class="panel__body">
            <div class="field">
              <label for="name">Product name <span class="req">*</span></label>
              <input type="text" id="name" name="name" required maxlength="160">
              <div class="error">Please enter a product name.</div>
            </div>
            <div class="form-row">
              <div class="field">
                <label for="category">Category <span class="req">*</span></label>
                <select id="category" name="category">${CATS.map((c) => `<option>${c}</option>`).join('')}</select>
              </div>
              <div class="field">
                <label for="stock_status">Stock status</label>
                <select id="stock_status" name="stock_status">${STOCK.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>
              </div>
            </div>
            <div class="form-row">
              <div class="field">
                <label for="price">Price (ETB) <span class="req">*</span></label>
                <input type="number" id="price" name="price" min="0" step="0.01" required>
                <div class="error">Enter a valid price.</div>
              </div>
              <div class="field">
                <label for="discount_price">Discount price (ETB) <span class="muted" style="font-weight:400">(optional)</span></label>
                <input type="number" id="discount_price" name="discount_price" min="0" step="0.01">
                <div class="error">Discount must be lower than the price.</div>
              </div>
            </div>
            <div class="field">
              <label for="description">Description</label>
              <textarea id="description" name="description" maxlength="4000" placeholder="Materials, size, finish, what's included…"></textarea>
            </div>
            <div class="check-row">
              <label class="check"><input type="checkbox" id="availability" checked> Available</label>
              <label class="check"><input type="checkbox" id="featured"> Featured on homepage</label>
              <label class="check"><input type="checkbox" id="is_published" checked> Published (visible on site)</label>
            </div>
          </div>
        </div>

        <div class="panel">
          <div class="panel__head"><h3>Images</h3><span class="switch-hint">JPG, PNG or WebP · up to 5 MB each · first image is the cover</span></div>
          <div class="panel__body">
            <div id="existingImages" class="img-manage" style="display:none"></div>
            <div class="upload-drop" id="dropZone" style="margin-top:14px">
              <div class="ico">${svg('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>', 34)}</div>
              <p style="margin:0"><b>Tap to upload</b> or drag images here</p>
              <small class="muted">You can select multiple images</small>
              <input type="file" id="images" accept="image/jpeg,image/png,image/webp" multiple hidden>
            </div>
            <div class="preview-grid" id="newPreview"></div>
          </div>
        </div>

        <div class="util-row" style="justify-content:flex-end">
          <a href="products.html" class="btn btn--outline">Cancel</a>
          <button type="submit" class="btn btn--primary" id="saveBtn">${editId ? 'Save changes' : 'Add product'}</button>
        </div>
      </form>`;

    // Upload wiring
    const dz = document.getElementById('dropZone');
    const input = document.getElementById('images');
    dz.addEventListener('click', () => input.click());
    ['dragover', 'dragenter'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add('drag'); }));
    ['dragleave', 'drop'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove('drag'); }));
    dz.addEventListener('drop', (e) => { addFiles(e.dataTransfer.files); });
    input.addEventListener('change', () => addFiles(input.files));

    document.getElementById('pForm').addEventListener('submit', submit);
  }

  function addFiles(fileList) {
    for (const f of fileList) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) { toast(`${f.name}: unsupported type.`, 'error'); continue; }
      if (f.size > 5 * 1024 * 1024) { toast(`${f.name} is larger than 5 MB.`, 'error'); continue; }
      newFiles.push(f);
    }
    renderNewPreview();
  }

  function renderNewPreview() {
    const wrap = document.getElementById('newPreview');
    wrap.innerHTML = newFiles.map((f, i) => {
      const url = URL.createObjectURL(f);
      return `<div class="preview-item"><img src="${url}" alt=""><button type="button" data-i="${i}" aria-label="Remove">×</button></div>`;
    }).join('');
    wrap.querySelectorAll('button[data-i]').forEach((b) => b.addEventListener('click', () => { newFiles.splice(+b.dataset.i, 1); renderNewPreview(); }));
  }

  async function loadProduct(id) {
    try {
      const { product: p } = await API.get(`/admin/products/${id}`);
      const f = document.getElementById('pForm');
      f.name.value = p.name;
      f.category.value = p.category;
      f.stock_status.value = p.stock_status;
      f.price.value = p.price;
      f.discount_price.value = p.discount_price ?? '';
      f.description.value = p.description || '';
      document.getElementById('availability').checked = p.availability;
      document.getElementById('featured').checked = p.featured;
      document.getElementById('is_published').checked = p.is_published;
      renderExisting(p.images || [], id);
    } catch (e) { toast(e.message, 'error'); }
  }

  function renderExisting(images, productId) {
    const wrap = document.getElementById('existingImages');
    if (!images.length) { wrap.style.display = 'none'; return; }
    wrap.style.display = 'grid';
    wrap.innerHTML = images.map((im) => `
      <div class="img-manage__item" data-img="${im.id}">
        ${im.is_primary ? '<span class="primary-tag">Cover</span>' : ''}
        <img src="${im.url}" alt="">
        <div class="tools">
          <button type="button" data-act="primary" title="Set as cover">${svg('<path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z"/>', 14)}</button>
          <button type="button" data-act="del" title="Delete">${svg('<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>', 14)}</button>
        </div>
      </div>`).join('');
    wrap.querySelectorAll('.img-manage__item').forEach((item) => {
      const imgId = item.dataset.img;
      item.querySelector('[data-act=primary]').onclick = async () => {
        try { await API.patch(`/admin/products/${productId}/images/${imgId}/primary`, {}); toast('Cover image updated.', 'success'); loadProduct(productId); }
        catch (e) { toast(e.message, 'error'); }
      };
      item.querySelector('[data-act=del]').onclick = async () => {
        const ok = await confirmModal({ title: 'Delete image', message: 'Remove this image?', confirmText: 'Delete' });
        if (!ok) return;
        try { await API.del(`/admin/products/${productId}/images/${imgId}`); toast('Image removed.', 'success'); loadProduct(productId); }
        catch (e) { toast(e.message, 'error'); }
      };
    });
  }

  function setInvalid(el, invalid) { el.closest('.field').classList.toggle('invalid', invalid); }

  async function submit(e) {
    e.preventDefault();
    const f = e.target;
    let ok = true;
    if (f.name.value.trim().length < 2) { setInvalid(f.name, true); ok = false; } else setInvalid(f.name, false);
    if (!f.price.value || +f.price.value < 0) { setInvalid(f.price, true); ok = false; } else setInvalid(f.price, false);
    const disc = f.discount_price.value;
    if (disc && (+disc < 0 || +disc >= +f.price.value)) { setInvalid(f.discount_price, true); ok = false; } else setInvalid(f.discount_price, false);
    if (!ok) { toast('Please correct the highlighted fields.', 'error'); return; }

    const fd = new FormData();
    fd.append('name', f.name.value.trim());
    fd.append('category', f.category.value);
    fd.append('stock_status', f.stock_status.value);
    fd.append('price', f.price.value);
    if (disc) fd.append('discount_price', disc);
    fd.append('description', f.description.value.trim());
    fd.append('availability', document.getElementById('availability').checked);
    fd.append('featured', document.getElementById('featured').checked);
    fd.append('is_published', document.getElementById('is_published').checked);
    newFiles.forEach((file) => fd.append('images', file));

    const btn = document.getElementById('saveBtn');
    btn.disabled = true; btn.textContent = 'Saving…';
    try {
      if (editId) {
        await API.putForm(`/admin/products/${editId}`, fd);
        toast('Product updated successfully.', 'success');
      } else {
        await API.postForm('/admin/products', fd);
        toast('Product added successfully.', 'success');
      }
      location.href = 'products.html';
    } catch (err) {
      if (err.fields) Object.entries(err.fields).forEach(([k, v]) => { if (f[k]) setInvalid(f[k], true); });
      toast(err.message || 'Unable to save the product.', 'error');
      btn.disabled = false; btn.textContent = editId ? 'Save changes' : 'Add product';
    }
  }
})();
