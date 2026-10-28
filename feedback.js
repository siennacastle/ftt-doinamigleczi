(function () {
  const config = window.FEEDBACK_CONFIG || {};
  const statusElement = document.getElementById('feedback-status');
  const adminStatusElement = document.getElementById('admin-status');
  const feedbackForm = document.getElementById('feedback-form');
  const feedbackList = document.getElementById('feedback-list');
  const loginForm = document.getElementById('admin-login-form');
  const adminSession = document.getElementById('admin-session');
  const adminModal = document.getElementById('admin-modal');
  const adminActiveStatus = document.getElementById('admin-active-status');
  const bucketName = 'feedback-photos';
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
      ? 'Feedback-ul online nu este configurat încă. Urmează pașii din supabase-setup.sql și completează feedback-config.js.'
      : 'Biblioteca Supabase nu s-a încărcat. Verifică conexiunea la internet și reîncarcă pagina.');
    feedbackForm.addEventListener('submit', function (event) {
      event.preventDefault();
      setStatus('Formularul nu poate publica mesaje până când conexiunea Supabase nu este configurată.');
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
    submitButton.textContent = busy ? 'Se procesează...' :
      (form === feedbackForm ? 'Publică feedback-ul' : 'Autentificare');
  }

  function isMissingSchemaError(message) {
    return /column .* does not exist|field .* does not exist|relation .* does not exist|missing.*column|not exist/i.test(message || '');
  }

  function normalizeFeedbackEntry(entry) {
    const authorName = entry.author_name || entry.name || entry.full_name || entry.nume || 'Anonim';
    const authorType = entry.author_type || entry.role || entry.type || 'spectator';
    const messageText = entry.message || entry.comment || entry.mesaj || '';
    const imagePath = entry.image_path || entry.photo_path || entry.image || null;

    return Object.assign({}, entry, {
      author_name: authorName,
      author_type: authorType,
      message: messageText,
      image_path: imagePath
    });
  }

  async function loadFeedback() {
    setStatus('Se încarcă feedback-ul...');

    const candidateQueries = [
      'id, author_name, author_type, message, image_path, created_at',
      'id, name, role, message, image_path, created_at',
      'id, full_name, role, message, image_path, created_at',
      '*'
    ];

    let data = [];
    let lastError = null;

    for (const query of candidateQueries) {
      const result = await supabase.from('feedback').select(query).order('created_at', { ascending: false });
      if (!result.error) {
        data = Array.isArray(result.data) ? result.data : [];
        lastError = null;
        break;
      }

      lastError = result.error;
      if (!isMissingSchemaError(result.error.message)) {
        break;
      }
    }

    if (lastError && data.length === 0 && !isMissingSchemaError(lastError.message)) {
      setStatus(`Nu s-a putut încărca feedback-ul: ${lastError.message}`);
      return;
    }

    if (lastError && data.length === 0 && isMissingSchemaError(lastError.message)) {
      setStatus('Structura tabelului de feedback nu corespunde cu configurația aplicației. Rulează din nou scriptul SQL din supabase-setup.sql și verifică coloanele din tabel.');
      return;
    }

    feedbackList.replaceChildren();
    if (data.length === 0) {
      setStatus('Încă nu există mesaje. Poți fi primul care lasă un feedback!');
      return;
    }

    setStatus('');
    data.map(normalizeFeedbackEntry).forEach(function (entry) {
      const card = document.createElement('article');
      card.className = 'feedback-card';

      const author = document.createElement('h3');
      author.textContent = entry.author_name;
      card.appendChild(author);

      const authorType = document.createElement('p');
      authorType.className = 'feedback-role';
      const roleLabels = {
        participant: 'Participant/Actor',
        spectator: 'Spectator',
        volunteer: 'Voluntar'
      };
      authorType.textContent = roleLabels[entry.author_type] || 'Spectator';
      card.appendChild(authorType);

      const date = document.createElement('p');
      date.className = 'feedback-date';
      date.textContent = new Intl.DateTimeFormat('ro-RO', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(new Date(entry.created_at));
      card.appendChild(date);

      const message = document.createElement('p');
      message.textContent = entry.message;
      card.appendChild(message);

      if (entry.image_path) {
        const imageUrl = supabase.storage.from(bucketName).getPublicUrl(entry.image_path).data.publicUrl;
        const imageLink = document.createElement('a');
        imageLink.className = 'feedback-photo-link';
        imageLink.href = imageUrl;
        imageLink.target = '_blank';
        imageLink.rel = 'noopener noreferrer';

        const image = document.createElement('img');
        image.className = 'feedback-photo';
        image.src = imageUrl;
        image.alt = `Fotografie atașată de ${entry.author_name}`;
        image.loading = 'lazy';
        imageLink.appendChild(image);
        card.appendChild(imageLink);
      }

      if (isAdmin) {
        const deleteButton = document.createElement('button');
        deleteButton.className = 'feedback-delete';
        deleteButton.type = 'button';
        deleteButton.textContent = 'Șterge mesajul';
        deleteButton.addEventListener('click', function () {
          deleteFeedback(entry);
        });
        card.appendChild(deleteButton);
      }

      feedbackList.appendChild(card);
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
      await loadFeedback();
      return;
    }

    if (!session) {
      isAdmin = false;
      loginForm.hidden = false;
      adminSession.hidden = true;
      adminActiveStatus.hidden = true;
      await loadFeedback();
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
      await loadFeedback();
      return;
    }

    isAdmin = data === true;
    loginForm.hidden = isAdmin;
    adminSession.hidden = !isAdmin;
    adminActiveStatus.hidden = !isAdmin;
    setAdminStatus(isAdmin ? 'Acces de administrator activ.' : 'Acest cont nu are drepturi de administrator.');
    await loadFeedback();
  }

  async function deleteFeedback(entry) {
    if (!window.confirm('Sigur vrei să ștergi acest mesaj?')) {
      return;
    }

    const { data, error: deleteError } = await supabase
      .from('feedback')
      .delete()
      .eq('id', entry.id)
      .select('id');

    if (deleteError) {
      setStatus(`Nu s-a putut șterge mesajul: ${deleteError.message}`);
      return;
    }

    if (data.length === 0) {
      setStatus('Mesajul nu a fost șters. Verifică dacă ești autentificat ca administrator.');
      return;
    }

    if (entry.image_path) {
      const { error: imageError } = await supabase.storage.from(bucketName).remove([entry.image_path]);
      if (imageError) {
        await loadFeedback();
        setStatus(`Mesajul a fost șters, dar fotografia nu a putut fi ștearsă: ${imageError.message}`);
        return;
      }
    }

    await loadFeedback();
    if (!statusElement.textContent) {
      setStatus('Mesajul a fost șters.');
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

  async function insertFeedback(entry) {
    const attempts = [
      {
        author_name: entry.author_name,
        author_type: entry.author_type,
        message: entry.message,
        image_path: entry.image_path
      },
      {
        name: entry.author_name,
        role: entry.author_type,
        message: entry.message,
        image_path: entry.image_path
      },
      {
        full_name: entry.author_name,
        role: entry.author_type,
        message: entry.message,
        image_path: entry.image_path
      }
    ];

    let lastError = null;
    for (const payload of attempts) {
      const { error } = await supabase.from('feedback').insert(payload);
      if (!error) {
        return;
      }

      lastError = error;
      if (!isMissingSchemaError(error.message)) {
        break;
      }
    }

    throw new Error(`Mesajul nu a putut fi publicat: ${lastError ? lastError.message : 'Eroare necunoscută.'}`);
  }

  feedbackForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    setBusy(feedbackForm, true);

    try {
      const formData = new FormData(feedbackForm);
      const photo = formData.get('photo');
      let imagePath = null;

      if (photo.size > 0) {
        if (!allowedPhotoTypes.includes(photo.type)) {
          throw new Error('Alege o imagine PNG, JPEG sau WebP.');
        }
        if (photo.size > maxPhotoSize) {
          throw new Error('Fotografia trebuie să aibă maximum 5 MB.');
        }

        const photoDataUrl = await readPhotoAsDataUrl(photo);
        const photoBlob = dataUrlToBlob(photoDataUrl, photo.type);
        imagePath = `${crypto.randomUUID()}.${photoExtensions[photo.type]}`;
        const { error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(imagePath, photoBlob, { contentType: photo.type, upsert: false });

        if (uploadError) {
          throw new Error(`Fotografia nu a putut fi încărcată: ${uploadError.message}`);
        }
      }

      try {
        await insertFeedback({
          author_name: formData.get('author_name').trim(),
          author_type: formData.get('author_type'),
          message: formData.get('message').trim(),
          image_path: imagePath
        });
      } catch (insertError) {
        if (imagePath) {
          const { error: cleanupError } = await supabase.storage.from(bucketName).remove([imagePath]);
          if (cleanupError) {
            throw new Error(`${insertError.message} Fotografia temporară nu a putut fi ștearsă: ${cleanupError.message}`);
          }
        }
        throw insertError;
      }

      feedbackForm.reset();
      await loadFeedback();
      if (!statusElement.textContent) {
        setStatus('Mulțumim! Feedback-ul tău a fost publicat.');
      }
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(feedbackForm, false);
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
    setStatus(`Nu s-a putut inițializa secțiunea Feedback: ${error.message}`);
  });
})();
