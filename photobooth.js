(function () {
  const config = window.FEEDBACK_CONFIG || {};
  const statusElement = document.getElementById('photobooth-status');
  const galleryElement = document.getElementById('photobooth-gallery');
  const photoForm = document.getElementById('photobooth-form');
  const loginForm = document.getElementById('admin-login-form');
  const adminStatusElement = document.getElementById('admin-status');
  const adminSession = document.getElementById('admin-session');
  const adminModal = document.getElementById('admin-modal');
  const adminActiveStatus = document.getElementById('admin-active-status');
  const bucketName = 'photobooth-photos';
  const maxPhotoSize = 5 * 1024 * 1024;
  const allowedPhotoTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const photoExtensions = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp'
  };
  const isConfigured = config.supabaseUrl && config.supabaseAnonKey &&
    !config.supabaseUrl.includes('PASTE_YOUR') && !config.supabaseAnonKey.includes('PASTE_YOUR');

  function openAdminModal() {
    if (!adminModal.open) {
      adminModal.showModal();
    }
  }

  document.getElementById('admin-trigger').addEventListener('click', openAdminModal);
  document.getElementById('admin-modal-close').addEventListener('click', function () {
    adminModal.close();
  });
  document.addEventListener('keydown', function (event) {
    if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'a') {
      event.preventDefault();
      openAdminModal();
    }
  });

  if (!isConfigured || !window.supabase) {
    setStatus(!isConfigured
      ? 'Photobooth-ul online nu este configurat încă. Urmează pașii din supabase-setup.sql și completează feedback-config.js.'
      : 'Biblioteca Supabase nu s-a încărcat. Verifică conexiunea la internet și reîncarcă pagina.');
    photoForm.addEventListener('submit', function (event) {
      event.preventDefault();
      setStatus('Formularul nu poate publica fotografii până când conexiunea Supabase nu este configurată.');
    });
    loginForm.addEventListener('submit', function (event) {
      event.preventDefault();
      setAdminStatus('Autentificarea nu este disponibilă până când conexiunea Supabase nu este configurată.');
    });
    return;
  }

  const supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      storage: window.sessionStorage,
      persistSession: true,
      autoRefreshToken: true
    }
  });
  let isAdmin = false;

  function setStatus(message) {
    statusElement.textContent = message;
  }

  function setAdminStatus(message) {
    adminStatusElement.textContent = message;
  }

  function setBusy(form, busy) {
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = busy;
    submitButton.textContent = busy ? 'Se procesează...' : (form === photoForm ? 'Publică fotografia' : 'Autentificare');
  }

  function isMissingSchemaError(message) {
    return /column .* does not exist|field .* does not exist|relation .* does not exist|missing.*column|not exist/i.test(message || '');
  }

  async function loadPhotos() {
    setStatus('Se încarcă fotografiile...');

    const { data, error } = await supabase
      .from('photobooth_photos')
      .select('id, image_path, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      if (/photobooth_photos.*schema cache|schema cache.*photobooth_photos|relation .*photobooth_photos.*does not exist/i.test(error.message)) {
        setStatus('Photobooth nu este configurat în Supabase încă. Rulează secțiunea Photobooth din supabase-setup.sql în SQL Editor-ul proiectului, apoi reîncarcă pagina.');
        return;
      }
      setStatus(`Nu s-a putut încărca galeria: ${error.message}`);
      return;
    }

    galleryElement.replaceChildren();
    if (data.length === 0) {
      setStatus('Încă nu există fotografii. Fii primul care postează una!');
      return;
    }

    setStatus('');
    data.forEach(function (entry) {
      const card = document.createElement('article');
      card.className = 'feedback-card';

      const imageUrl = supabase.storage.from(bucketName).getPublicUrl(entry.image_path).data.publicUrl;
      const imageLink = document.createElement('a');
      imageLink.className = 'feedback-photo-link';
      imageLink.href = imageUrl;
      imageLink.target = '_blank';
      imageLink.rel = 'noopener noreferrer';

      const image = document.createElement('img');
      image.className = 'feedback-photo';
      image.src = imageUrl;
      image.alt = 'Fotografie publicată în photobooth';
      image.loading = 'lazy';
      imageLink.appendChild(image);
      card.appendChild(imageLink);

      const date = document.createElement('p');
      date.className = 'feedback-date';
      date.textContent = new Intl.DateTimeFormat('ro-RO', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(new Date(entry.created_at));
      card.appendChild(date);

      if (isAdmin) {
        const deleteButton = document.createElement('button');
        deleteButton.className = 'feedback-delete';
        deleteButton.type = 'button';
        deleteButton.textContent = 'Șterge fotografia';
        deleteButton.addEventListener('click', function () {
          deletePhoto(entry);
        });
        card.appendChild(deleteButton);
      }

      galleryElement.appendChild(card);
    });
  }

  async function refreshAdminState() {
    isAdmin = false;
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      loginForm.hidden = false;
      adminSession.hidden = true;
      adminActiveStatus.hidden = true;
      setAdminStatus(`Nu s-a putut verifica sesiunea: ${sessionError.message}`);
      await loadPhotos();
      return;
    }

    if (!session) {
      loginForm.hidden = false;
      adminSession.hidden = true;
      adminActiveStatus.hidden = true;
      await loadPhotos();
      return;
    }

    const { data, error } = await supabase.rpc('is_feedback_admin');
    if (error) {
      loginForm.hidden = false;
      adminSession.hidden = true;
      adminActiveStatus.hidden = true;
      const message = /feedback_admins|is_feedback_admin|does not exist|function .* not exist/i.test(error.message)
        ? 'Configurarea administratorului nu este finalizată. Rulează scriptul SQL din supabase-setup.sql și adaugă UUID-ul contului în public.feedback_admins.'
        : `Nu s-a putut verifica accesul de administrator: ${error.message}`;
      setAdminStatus(message);
      await loadPhotos();
      return;
    }

    isAdmin = data === true;
    loginForm.hidden = isAdmin;
    adminSession.hidden = !isAdmin;
    adminActiveStatus.hidden = !isAdmin;
    setAdminStatus(isAdmin ? 'Acces de administrator activ.' : 'Acest cont nu are drepturi de administrator.');
    await loadPhotos();
  }

  async function deletePhoto(entry) {
    if (!window.confirm('Sigur vrei să ștergi această fotografie?')) {
      return;
    }

    const { data, error: deleteError } = await supabase
      .from('photobooth_photos')
      .delete()
      .eq('id', entry.id)
      .select('id');

    if (deleteError) {
      setStatus(`Nu s-a putut șterge fotografia: ${deleteError.message}`);
      return;
    }

    if (data.length === 0) {
      setStatus('Fotografia nu a fost ștearsă. Verifică dacă ești autentificat ca administrator.');
      return;
    }

    if (entry.image_path) {
      const { error: imageError } = await supabase.storage.from(bucketName).remove([entry.image_path]);
      if (imageError) {
        await loadPhotos();
        setStatus(`Fotografia a fost ștearsă din tabel, dar fișierul nu a putut fi eliminat: ${imageError.message}`);
        return;
      }
    }

    await loadPhotos();
    if (!statusElement.textContent) {
      setStatus('Fotografia a fost ștearsă.');
    }
  }

  function readPhotoAsDataUrl(file) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.addEventListener('load', function () {
        if (typeof reader.result !== 'string') {
          reject(new Error('Fotografia nu a putut fi citită.'));
          return;
        }
        resolve(reader.result);
      });
      reader.addEventListener('error', function () {
        reject(new Error('Fotografia nu a putut fi citită.'));
      });
      reader.readAsDataURL(file);
    });
  }

  function dataUrlToBlob(dataUrl, expectedType) {
    const separatorIndex = dataUrl.indexOf(',');
    if (separatorIndex < 0 || !dataUrl.slice(0, separatorIndex).includes(expectedType)) {
      throw new Error('Formatul fotografiei nu este valid.');
    }

    const binary = window.atob(dataUrl.slice(separatorIndex + 1));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return new Blob([bytes], { type: expectedType });
  }

  photoForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    setBusy(photoForm, true);

    try {
      const formData = new FormData(photoForm);
      const photo = formData.get('photo');
      if (!photo || photo.size === 0) {
        throw new Error('Alege o fotografie pentru a o publica.');
      }
      if (!allowedPhotoTypes.includes(photo.type)) {
        throw new Error('Alege o imagine PNG, JPEG sau WebP.');
      }
      if (photo.size > maxPhotoSize) {
        throw new Error('Fotografia trebuie să aibă maximum 5 MB.');
      }

      const photoDataUrl = await readPhotoAsDataUrl(photo);
      const photoBlob = dataUrlToBlob(photoDataUrl, photo.type);
      const imagePath = `${crypto.randomUUID()}.${photoExtensions[photo.type]}`;

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(imagePath, photoBlob, { contentType: photo.type, upsert: false });

      if (uploadError) {
        throw new Error(`Fotografia nu a putut fi încărcată: ${uploadError.message}`);
      }

      const { error: insertError } = await supabase.from('photobooth_photos').insert({ image_path: imagePath });
      if (insertError) {
        const { error: cleanupError } = await supabase.storage.from(bucketName).remove([imagePath]);
        if (cleanupError) {
          throw new Error(`${insertError.message} Fotografia temporară nu a putut fi ștearsă: ${cleanupError.message}`);
        }
        throw new Error(`Fotografia nu a putut fi publicată: ${insertError.message}`);
      }

      photoForm.reset();
      await loadPhotos();
      if (!statusElement.textContent) {
        setStatus('Fotografia a fost publicată.');
      }
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(photoForm, false);
    }
  });

  loginForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    setBusy(loginForm, true);
    setAdminStatus('');

    try {
      const formData = new FormData(loginForm);
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.get('email'),
        password: formData.get('password')
      });

      if (error) {
        setAdminStatus(`Autentificarea a eșuat: ${error.message}`);
      } else {
        loginForm.reset();
        await refreshAdminState();
      }
    } catch (error) {
      setAdminStatus(`Autentificarea a eșuat: ${error.message}`);
    } finally {
      setBusy(loginForm, false);
    }
  });

  document.getElementById('admin-logout').addEventListener('click', async function () {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setAdminStatus(`Deconectarea a eșuat: ${error.message}`);
        return;
      }
      isAdmin = false;
      setAdminStatus('Te-ai deconectat.');
      await refreshAdminState();
    } catch (error) {
      setAdminStatus(`Deconectarea a eșuat: ${error.message}`);
    }
  });

  supabase.auth.onAuthStateChange(function () {
    window.setTimeout(function () {
      refreshAdminState().catch(function (error) {
        setAdminStatus(`Nu s-a putut actualiza sesiunea: ${error.message}`);
      });
    }, 0);
  });

  refreshAdminState().catch(function (error) {
    setStatus(`Nu s-a putut inițializa Photobooth: ${error.message}`);
  });
})();
