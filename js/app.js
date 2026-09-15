const STATUS_LABELS = {
  planned: 'В планах',
  reading: 'Читаю',
  finished: 'Прочитано',
  dropped: 'Брошено',
};

const state = {
  filterStatus: '',
  filterQuery: '',
  sortBy: 'updated',
  pendingBook: null,
  currentBookPageId: null,
  returnHash: '#shelf',
};

let lastRecommendationGenre = null;

console.log('%c Моя Полка запущена', 'color: #a78bfa; font-weight: bold; font-size: 14px');

function initTheme() {
  const theme = getTheme();
  applyTheme(theme);

  document.getElementById('theme-toggle').addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    setTheme(next);
  });
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const button = document.getElementById('theme-toggle');
  if (button) {
    button.textContent = theme === 'dark' ? '☀️' : '🌙';
  }
}

function route() {
  const hash = window.location.hash || '#shelf';

  if (hash.startsWith('#book/')) {
    const id = decodeURIComponent(hash.slice(6));
    renderBookPage(id);
    return;
  }

  state.pendingBook = null;
  state.currentBookPageId = null;

  const tab = hash.slice(1) || 'shelf';
  showTab(tab);
}

function navigate(hash) {
  if (window.location.hash === hash) {
    route();
  } else {
    window.location.hash = hash;
  }
}

function openBook(book) {
  state.returnHash = window.location.hash || '#shelf';
  state.pendingBook = book;
  window.location.hash = `#book/${encodeURIComponent(book.id)}`;
}

function initTabs() {
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => navigate(`#${tab.dataset.tab}`));
  });

  const logo = document.querySelector('.header__logo');
  if (logo) {
    logo.addEventListener('click', () => navigate('#shelf'));
  }
}

function showTab(name) {
  const tabs = document.querySelectorAll('.tab');
  const contents = document.querySelectorAll('.tab-content');

  tabs.forEach((t) => t.classList.toggle('tab--active', t.dataset.tab === name));
  contents.forEach((c) =>
    c.classList.toggle('tab-content--active', c.id === `tab-${name}`)
  );

  if (name === 'shelf') refreshShelf();
}

function initSearch() {
  const form = document.getElementById('search-form');
  const input = document.getElementById('search-input');
  const submitButton = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const query = input.value.trim();
    if (!query) return;

    clearGenreChips();
    await runSearch(() => searchBooks(query), submitButton);
  });
}

function initGenreChips() {
  const chips = document.querySelectorAll('.genre-chip');

  chips.forEach((chip) => {
    chip.addEventListener('click', async () => {
      const genre = chip.dataset.genre;
      if (!genre) return;

      chips.forEach((c) => c.classList.remove('genre-chip--active'));
      chip.classList.add('genre-chip--active');

      document.getElementById('search-input').value = '';

      await runSearch(() => searchByGenre(genre));
    });
  });
}

function clearGenreChips() {
  document.querySelectorAll('.genre-chip').forEach((c) =>
    c.classList.remove('genre-chip--active')
  );
}

async function runSearch(searchFn, submitButton) {
  const results = document.getElementById('search-results');

  if (submitButton) submitButton.disabled = true;
  results.innerHTML = '<p class="search-results__status">Ищу книги…</p>';

  try {
    const books = await searchFn();

    if (books.length === 0) {
      results.innerHTML =
        '<p class="search-results__status">Ничего не найдено. Попробуй другой запрос.</p>';
      return;
    }

    results.innerHTML = '';
    books.forEach((book) => results.appendChild(createBookCard(book)));
  } catch (error) {
    console.error(error);
    results.innerHTML = `<p class="search-results__status search-results__status--error">Ошибка: ${error.message}</p>`;
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
}

function createBookCard(book) {
  const card = document.createElement('article');
  card.className = 'book-card';

  card.appendChild(createCover(book));

  const body = document.createElement('div');
  body.className = 'book-card__body';

  const title = document.createElement('h3');
  title.className = 'book-card__title';
  title.textContent = book.title;
  body.appendChild(title);

  const authors = document.createElement('p');
  authors.className = 'book-card__authors';
  authors.textContent = book.authors.length ? book.authors.join(', ') : 'Автор неизвестен';
  body.appendChild(authors);

  const metaParts = [];
  if (book.year) metaParts.push(book.year);
  if (book.pages) metaParts.push(`${book.pages} стр.`);
  if (metaParts.length) {
    const meta = document.createElement('p');
    meta.className = 'book-card__meta';
    meta.textContent = metaParts.join(' · ');
    body.appendChild(meta);
  }

  if (book.status) {
    const badges = document.createElement('div');
    badges.className = 'book-card__badges';

    const statusBadge = document.createElement('span');
    statusBadge.className = `badge badge--${book.status}`;
    statusBadge.textContent = STATUS_LABELS[book.status] || book.status;
    badges.appendChild(statusBadge);

    if (book.rating) {
      const ratingBadge = document.createElement('span');
      ratingBadge.className = 'badge badge--rating';
      ratingBadge.textContent = `★ ${book.rating}/10`;
      badges.appendChild(ratingBadge);
    }

    body.appendChild(badges);
  }

  if (book.note) {
    const note = document.createElement('p');
    note.className = 'book-card__note';
    note.textContent = book.note;
    body.appendChild(note);
  }

  if (book.tags && book.tags.length) {
    const tags = document.createElement('div');
    tags.className = 'book-card__tags';
    book.tags.forEach((t) => {
      const tag = document.createElement('span');
      tag.className = 'book-card__tag';
      tag.textContent = t;
      tags.appendChild(tag);
    });
    body.appendChild(tags);
  }

  if (book.status === 'reading' && book.pages && book.currentPage) {
    const pct = Math.min(100, Math.round((book.currentPage / book.pages) * 100));
    const progress = document.createElement('div');
    progress.className = 'book-card__progress';
    const fill = document.createElement('div');
    fill.className = 'book-card__progress-fill';
    fill.style.width = pct + '%';
    progress.appendChild(fill);
    body.appendChild(progress);
  }

  card.appendChild(body);

  if (book.status) {
    const actions = document.createElement('div');
    actions.className = 'book-card__actions';

    const select = document.createElement('select');
    select.className = 'book-card__status-select';
    Object.entries(STATUS_LABELS).forEach(([value, label]) => {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = label;
      if (value === book.status) opt.selected = true;
      select.appendChild(opt);
    });

    select.addEventListener('click', (e) => e.stopPropagation());
    select.addEventListener('mousedown', (e) => e.stopPropagation());
    select.addEventListener('change', (e) => {
      e.stopPropagation();
      updateBook(book.id, { status: select.value });
      showToast('Статус обновлён', 'success');
      refreshShelf();
    });

    actions.appendChild(select);
    card.appendChild(actions);
  }

  card.addEventListener('click', () => openBook(book));

  return card;
}

function createCover(book) {
  const cover = document.createElement('img');
  cover.className = 'book-card__cover';
  cover.alt = '';
  cover.loading = 'lazy';

  if (book.cover) {
    cover.src = book.cover;
  } else {
    cover.style.visibility = 'hidden';
  }

  cover.addEventListener('error', () => {
    cover.style.visibility = 'hidden';
  });

  return cover;
}

function initFilters() {
  const statusSelect = document.getElementById('filter-status');
  const sortSelect = document.getElementById('filter-sort');
  const searchInput = document.getElementById('filter-search');

  statusSelect.addEventListener('change', () => {
    state.filterStatus = statusSelect.value;
    refreshShelf();
  });

  sortSelect.addEventListener('change', () => {
    state.sortBy = sortSelect.value;
    refreshShelf();
  });

  searchInput.addEventListener('input', () => {
    state.filterQuery = searchInput.value.trim().toLowerCase();
    refreshShelf();
  });
}

function sortBooks(books) {
  const sorted = [...books];

  switch (state.sortBy) {
    case 'added':
      sorted.sort((a, b) => (b.addedAt || '').localeCompare(a.addedAt || ''));
      break;
    case 'rating':
      sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      break;
    case 'title':
      sorted.sort((a, b) => a.title.localeCompare(b.title, 'ru'));
      break;
    case 'author':
      sorted.sort((a, b) => {
        const aAuthor = a.authors?.[0] || '';
        const bAuthor = b.authors?.[0] || '';
        return aAuthor.localeCompare(bAuthor, 'ru');
      });
      break;
    default:
      sorted.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  }

  return sorted;
}

function refreshShelf() {
  const list = document.getElementById('shelf-list');
  const empty = document.getElementById('shelf-empty');

  if (!list || !empty) return;

  renderStats();
  renderGoal();

  let books = getAllBooks();

  if (state.filterStatus) {
    books = books.filter((b) => b.status === state.filterStatus);
  }

  if (state.filterQuery) {
    const q = state.filterQuery;
    books = books.filter((b) => {
      const inTitle = b.title.toLowerCase().includes(q);
      const inAuthors = (b.authors || []).some((a) => a.toLowerCase().includes(q));
      const inNote = (b.note || '').toLowerCase().includes(q);
      const inTags = (b.tags || []).some((t) => t.toLowerCase().includes(q));
      return inTitle || inAuthors || inNote || inTags;
    });
  }

  books = sortBooks(books);

  list.innerHTML = '';

  if (books.length === 0) {
    const total = getAllBooks().length;
    if (total === 0) {
      empty.querySelector('.empty-state__title').textContent = 'Полка пока пуста';
      empty.querySelector('.empty-state__text').textContent =
        'Перейди на вкладку «Найти книгу», чтобы добавить первую.';
    } else {
      empty.querySelector('.empty-state__title').textContent = 'Ничего не найдено';
      empty.querySelector('.empty-state__text').textContent =
        'Попробуй изменить фильтр или поисковый запрос.';
    }
    empty.style.display = 'flex';
    renderRecommendations();
    return;
  }

  empty.style.display = 'none';
  books.forEach((book) => list.appendChild(createBookCard(book)));
  renderRecommendations();
}

function renderStats() {
  const container = document.getElementById('stats-panel');
  const books = getAllBooks();

  if (books.length === 0) {
    container.innerHTML = '';
    return;
  }

  const currentYear = new Date().getFullYear();

  const total = books.length;
  const finished = books.filter((b) => b.status === 'finished').length;
  const reading = books.filter((b) => b.status === 'reading').length;

  const finishedThisYear = books.filter((b) => {
    if (b.status !== 'finished') return false;
    if (!b.updatedAt) return false;
    return new Date(b.updatedAt).getFullYear() === currentYear;
  }).length;

  const rated = books.filter((b) => b.rating);
  const avgRating = rated.length
    ? (rated.reduce((sum, b) => sum + b.rating, 0) / rated.length).toFixed(1)
    : '—';

  const genreCounts = {};
  books.forEach((b) => {
    (b.genres || []).forEach((g) => {
      genreCounts[g] = (genreCounts[g] || 0) + 1;
    });
  });
  const topGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([g]) => g);

  const stats = [
    { value: total, label: 'Всего книг' },
    { value: finished, label: 'Прочитано' },
    { value: finishedThisYear, label: `В ${currentYear}` },
    { value: reading, label: 'Читаю сейчас' },
    { value: avgRating, label: 'Средняя оценка' },
  ];

  container.innerHTML = '';
  stats.forEach((s) => {
    const item = document.createElement('div');
    item.className = 'stat-item';
    item.innerHTML = `<div class="stat-item__value">${s.value}</div>
      <div class="stat-item__label">${s.label}</div>`;
    container.appendChild(item);
  });

  if (topGenres.length) {
    const genresItem = document.createElement('div');
    genresItem.className = 'stat-item stat-item--wide';
    genresItem.innerHTML = `<div class="stat-item__value stat-item__value--small">${topGenres.join(' · ')}</div>
      <div class="stat-item__label">Топ жанров</div>`;
    container.appendChild(genresItem);
  }
}

function renderGoal() {
  const container = document.getElementById('goal-panel');
  const goal = getGoal();
  const books = getAllBooks();
  const currentYear = new Date().getFullYear();

  if (!goal) {
    container.innerHTML = '';
    return;
  }

  const finishedThisYear = books.filter((b) => {
    if (b.status !== 'finished') return false;
    if (!b.updatedAt) return false;
    return new Date(b.updatedAt).getFullYear() === currentYear;
  }).length;

  const pct = Math.min(100, Math.round((finishedThisYear / goal) * 100));

  container.innerHTML = `
    <div class="goal-header">
      <span class="goal-label">Цель на ${currentYear}</span>
      <span class="goal-progress-text">${finishedThisYear} из ${goal}</span>
    </div>
    <div class="goal-bar">
      <div class="goal-bar__fill" style="width: ${pct}%"></div>
    </div>
  `;
}

async function renderRecommendations() {
  const container = document.getElementById('recommendations');
  if (!container) return;

  const books = getAllBooks();

  if (books.length < 3) {
    container.innerHTML = '';
    lastRecommendationGenre = null;
    return;
  }

  const genreCounts = {};
  books.forEach((b) => {
    (b.genres || []).forEach((g) => {
      genreCounts[g] = (genreCounts[g] || 0) + 1;
    });
  });

  const topGenre = Object.entries(genreCounts)
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])[0]?.[0];

  if (!topGenre) {
    container.innerHTML = '';
    lastRecommendationGenre = null;
    return;
  }

  if (
    topGenre === lastRecommendationGenre &&
    container.querySelector('.recommendations__grid')
  ) {
    return;
  }

  lastRecommendationGenre = topGenre;
  container.innerHTML = `<h2 class="recommendations__title">Возможно, тебе понравится: ${topGenre}</h2><div class="recommendations__grid"><p class="search-results__status">Загружаю…</p></div>`;

  const grid = container.querySelector('.recommendations__grid');

  try {
    const recs = await searchByGenre(topGenre, 12);
    const shelfIds = new Set(books.map((b) => b.id));
    const filtered = recs.filter((r) => !shelfIds.has(r.id)).slice(0, 4);

    if (filtered.length === 0) {
      container.innerHTML = '';
      lastRecommendationGenre = null;
      return;
    }

    grid.innerHTML = '';
    filtered.forEach((book) => grid.appendChild(createBookCard(book)));
  } catch (error) {
    console.warn('Рекомендации:', error);
    container.innerHTML = '';
    lastRecommendationGenre = null;
  }
}

function initBookBack() {
  const backButton = document.getElementById('book-back');
  backButton.addEventListener('click', () => navigate(state.returnHash));
}

async function renderBookPage(id) {
  state.currentBookPageId = id;

  const contents = document.querySelectorAll('.tab-content');
  contents.forEach((c) =>
    c.classList.toggle('tab-content--active', c.id === 'tab-book')
  );

  const tabs = document.querySelectorAll('.tab');
  tabs.forEach((t) => t.classList.remove('tab--active'));

  const shelfBook = getBookById(id);
  const pending =
    state.pendingBook && state.pendingBook.id === id ? state.pendingBook : null;

  let book = shelfBook || pending;

  const coverEl = document.getElementById('book-page-cover');
  const titleEl = document.getElementById('book-page-title');
  const authorsEl = document.getElementById('book-page-authors');
  const metaEl = document.getElementById('book-page-meta');
  const genresEl = document.getElementById('book-page-genres');
  const descEl = document.getElementById('book-page-description');
  const shelfContainer = document.getElementById('book-page-shelf');

  if (!book) {
    try {
      const details = await getBookDetails(id);
      if (state.currentBookPageId !== id) return;

      if (details && details.title) {
        book = {
          id,
          title: details.title,
          authors: [],
          cover: '',
          year: null,
          pages: null,
          genres: (details.subjects || []).slice(0, 3),
        };
      }
    } catch (e) {
      console.warn(e);
    }
  }

  if (!book) {
    coverEl.hidden = true;
    titleEl.textContent = 'Книга не найдена';
    authorsEl.textContent = '';
    metaEl.textContent = '';
    genresEl.innerHTML = '';
    descEl.textContent = 'Не удалось загрузить информацию об этой книге.';
    descEl.className = 'book-page__description book-page__description--empty';
    shelfContainer.innerHTML = '';
    return;
  }

  if (book.cover) {
    coverEl.src = book.cover;
    coverEl.hidden = false;
    coverEl.onerror = () => {
      coverEl.hidden = true;
    };
  } else {
    coverEl.hidden = true;
    coverEl.removeAttribute('src');
  }

  titleEl.textContent = book.title;
  authorsEl.textContent = book.authors && book.authors.length
    ? book.authors.join(', ')
    : 'Автор неизвестен';

  const metaParts = [];
  if (book.year) metaParts.push(book.year);
  if (book.pages) metaParts.push(`${book.pages} стр.`);
  metaEl.textContent = metaParts.join(' · ');
  metaEl.hidden = metaParts.length === 0;

  genresEl.innerHTML = '';
  if (book.genres && book.genres.length) {
    book.genres.forEach((genre) => {
      const tag = document.createElement('span');
      tag.className = 'book-page__genre';
      tag.textContent = genre;
      genresEl.appendChild(tag);
    });
  }

  renderAddSection(book);

  descEl.textContent = 'Загружаю описание…';
  descEl.className = 'book-page__description book-page__description--loading';

  renderShelfSection(book);

  try {
    const details = await getBookDetails(id);
    if (state.currentBookPageId !== id) return;

    if (details && details.description) {
      descEl.textContent = details.description;
      descEl.className = 'book-page__description';
    } else {
      descEl.textContent = 'Описание для этой книги пока недоступно.';
      descEl.className = 'book-page__description book-page__description--empty';
    }

    if (
      details &&
      details.subjects &&
      details.subjects.length &&
      (!book.genres || !book.genres.length)
    ) {
      details.subjects.slice(0, 5).forEach((genre) => {
        const tag = document.createElement('span');
        tag.className = 'book-page__genre';
        tag.textContent = genre;
        genresEl.appendChild(tag);
      });
    }
  } catch (e) {
    console.warn(e);
    if (state.currentBookPageId === id) {
      descEl.textContent = 'Не удалось загрузить описание.';
      descEl.className = 'book-page__description book-page__description--empty';
    }
  }
}

function renderAddSection(book) {
  const container = document.getElementById('book-page-add');
  if (!container) return;
  container.innerHTML = '';

  const shelfBook = getBookById(book.id);
  if (shelfBook) return;

  const label = document.createElement('div');
  label.className = 'book-page__add-label';
  label.textContent = 'Добавить на полку';
  container.appendChild(label);

  const row = document.createElement('div');
  row.className = 'book-page__add-row';

  const statuses = [
    ['planned', 'В планах'],
    ['reading', 'Читаю'],
    ['finished', 'Прочитано'],
    ['dropped', 'Брошено'],
  ];

  statuses.forEach(([value, text]) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'book-page__add-btn';
    btn.textContent = text;

    btn.addEventListener('click', () => {
      addBook(book, value);
      showToast(`Добавлено: ${STATUS_LABELS[value]}`, 'success');
      renderAddSection(book);
      renderShelfSection(book);
    });

    row.appendChild(btn);
  });

  container.appendChild(row);
}

function renderShelfSection(book) {
  const container = document.getElementById('book-page-shelf');
  container.innerHTML = '';

  const shelfBook = getBookById(book.id);

  if (!shelfBook) {
    return;
  }

  const title = document.createElement('h2');
  title.className = 'book-page__section-title';
  title.textContent = 'Моя полка';
  container.appendChild(title);

  const card = document.createElement('div');
  card.className = 'shelf-card';

  card.appendChild(buildStatusField(shelfBook, book));
  card.appendChild(buildRatingField(shelfBook));

  if (shelfBook.status === 'reading' || shelfBook.status === 'finished') {
    card.appendChild(buildProgressField(shelfBook));
  }

  card.appendChild(buildTagsField(shelfBook));
  card.appendChild(buildNoteField(shelfBook));
  card.appendChild(buildDeleteRow(shelfBook, book));

  container.appendChild(card);
}

function buildStatusField(shelfBook, book) {
  const field = document.createElement('div');
  field.className = 'shelf-field';

  const label = document.createElement('div');
  label.className = 'shelf-field__label';
  label.textContent = 'Статус';
  field.appendChild(label);

  const segments = document.createElement('div');
  segments.className = 'status-segments';

  Object.entries(STATUS_LABELS).forEach(([value, text]) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'status-segment';
    btn.textContent = text;
    if (value === shelfBook.status) btn.classList.add('status-segment--active');

    btn.addEventListener('click', () => {
      if (value === shelfBook.status) return;
      updateBook(shelfBook.id, { status: value });
      showToast('Статус обновлён', 'success');
      renderShelfSection(book);
    });

    segments.appendChild(btn);
  });

  field.appendChild(segments);
  return field;
}

function buildRatingField(shelfBook) {
  const field = document.createElement('div');
  field.className = 'shelf-field';

  const label = document.createElement('div');
  label.className = 'shelf-field__label';
  label.textContent = shelfBook.rating
    ? `Оценка · ${shelfBook.rating} из 10`
    : 'Оценка';
  field.appendChild(label);

  const row = document.createElement('div');
  row.className = 'rating-row';

  for (let i = 1; i <= 10; i += 1) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'rating-star';
    btn.textContent = i;
    if (shelfBook.rating === i) btn.classList.add('rating-star--active');

    btn.addEventListener('click', () => {
      const newRating = shelfBook.rating === i ? null : i;
      updateBook(shelfBook.id, { rating: newRating });

      row.querySelectorAll('.rating-star').forEach((b, index) => {
        b.classList.toggle('rating-star--active', index + 1 === newRating);
      });

      label.textContent = newRating ? `Оценка · ${newRating} из 10` : 'Оценка';
      showToast(newRating ? `Оценка ${newRating}/10` : 'Оценка убрана', 'success');
    });

    row.appendChild(btn);
  }

  field.appendChild(row);
  return field;
}

function buildProgressField(shelfBook) {
  const field = document.createElement('div');
  field.className = 'shelf-field';

  const label = document.createElement('div');
  label.className = 'shelf-field__label';
  label.textContent = 'Прогресс чтения';
  field.appendChild(label);

  const wrap = document.createElement('div');
  wrap.className = 'progress-field';

  const input = document.createElement('input');
  input.type = 'number';
  input.className = 'progress-input';
  input.min = '0';
  if (shelfBook.pages) input.max = String(shelfBook.pages);
  input.value = shelfBook.currentPage || '';
  input.placeholder = '0';

  const slash = document.createElement('span');
  slash.className = 'progress-slash';
  slash.textContent = 'из';

  const total = document.createElement('span');
  total.className = 'progress-slash';
  total.textContent = shelfBook.pages || '?';

  const percent = document.createElement('span');
  percent.className = 'progress-percent';

  const updatePercent = (value) => {
    if (!shelfBook.pages || !value) {
      percent.textContent = '';
      return;
    }
    const pct = Math.min(100, Math.round((value / shelfBook.pages) * 100));
    percent.textContent = `${pct}%`;
  };

  updatePercent(shelfBook.currentPage || 0);

  let timeoutId;
  input.addEventListener('input', () => {
    const value = input.value ? Number(input.value) : 0;
    updatePercent(value);
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      updateBook(shelfBook.id, { currentPage: value });
      showToast('Прогресс сохранён', 'success');
    }, 700);
  });

  wrap.appendChild(input);
  wrap.appendChild(slash);
  wrap.appendChild(total);
  wrap.appendChild(percent);

  field.appendChild(wrap);
  return field;
}

function buildTagsField(shelfBook) {
  const field = document.createElement('div');
  field.className = 'shelf-field';

  const label = document.createElement('div');
  label.className = 'shelf-field__label';
  label.textContent = 'Метки';
  field.appendChild(label);

  const row = document.createElement('div');
  row.className = 'tags-row';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'tag-input';
  input.placeholder = '+ Добавить метку';
  input.maxLength = 30;

  const renderChips = (tags) => {
    row.querySelectorAll('.tag-chip').forEach((chip) => chip.remove());

    tags.forEach((tag) => {
      const chip = document.createElement('span');
      chip.className = 'tag-chip';

      const text = document.createElement('span');
      text.textContent = tag;
      chip.appendChild(text);

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'tag-chip__remove';
      remove.setAttribute('aria-label', `Удалить метку ${tag}`);
      remove.textContent = '×';
      remove.addEventListener('click', () => {
        const fresh = getBookById(shelfBook.id);
        const newTags = (fresh.tags || []).filter((t) => t !== tag);
        updateBook(shelfBook.id, { tags: newTags });
        renderChips(newTags);
      });

      chip.appendChild(remove);
      row.insertBefore(chip, input);
    });
  };

  input.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();

    const raw = input.value.trim().replace(/^#/, '');
    if (!raw) return;

    const fresh = getBookById(shelfBook.id);
    const current = fresh.tags || [];
    if (current.includes(raw)) {
      input.value = '';
      return;
    }

    const newTags = [...current, raw];
    updateBook(shelfBook.id, { tags: newTags });
    input.value = '';
    renderChips(newTags);
    showToast(`Метка «${raw}» добавлена`, 'success');
  });

  row.appendChild(input);
  renderChips(shelfBook.tags || []);

  field.appendChild(row);
  return field;
}

function buildNoteField(shelfBook) {
  const field = document.createElement('div');
  field.className = 'shelf-field';

  const label = document.createElement('div');
  label.className = 'shelf-field__label';
  label.textContent = 'О чём эта книга';
  field.appendChild(label);

  const textarea = document.createElement('textarea');
  textarea.className = 'note-input';
  textarea.rows = 6;
  textarea.value = shelfBook.note || '';
  textarea.placeholder = 'Краткая выжимка — чтобы через год вспомнить суть. Что запомнилось, что забрал для себя.';

  let timeoutId;
  textarea.addEventListener('input', () => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      updateBook(shelfBook.id, { note: textarea.value.trim() });
      showToast('Заметка сохранена', 'success');
    }, 800);
  });

  field.appendChild(textarea);
  return field;
}

function buildDeleteRow(shelfBook, book) {
  const row = document.createElement('div');
  row.className = 'shelf-card__danger';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn btn--danger';
  btn.textContent = 'Удалить с полки';
  btn.addEventListener('click', () => {
    if (!confirm(`Удалить «${shelfBook.title}» с полки?`)) return;
    removeBook(shelfBook.id);
    showToast('Удалено', 'info');
    renderAddSection(book);
    renderShelfSection(book);
  });

  row.appendChild(btn);
  return row;
}

function initBackup() {
  const exportButton = document.getElementById('btn-export');
  const exportMdButton = document.getElementById('btn-export-md');
  const importInput = document.getElementById('file-import');

  exportButton.addEventListener('click', () => {
    const data = exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `moya-polka-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();

    URL.revokeObjectURL(url);
    showToast('Файл скачан', 'success');
  });

  exportMdButton.addEventListener('click', exportMarkdown);

  importInput.addEventListener('change', async () => {
    const file = importInput.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      replaceAll(data);
      refreshShelf();
      showToast('Данные загружены', 'success');
    } catch (error) {
      console.error(error);
      showToast(`Ошибка: ${error.message}`, 'error');
    } finally {
      importInput.value = '';
    }
  });
}

function exportMarkdown() {
  const books = getAllBooks();

  if (books.length === 0) {
    showToast('Полка пуста', 'info');
    return;
  }

  const byStatus = { reading: [], planned: [], finished: [], dropped: [] };
  books.forEach((b) => {
    if (byStatus[b.status]) byStatus[b.status].push(b);
  });

  let md = `# Моя Полка\n\n`;
  md += `_Экспортировано ${new Date().toLocaleDateString('ru-RU')}_\n\n`;

  const sections = [
    ['reading', 'Читаю'],
    ['planned', 'В планах'],
    ['finished', 'Прочитано'],
    ['dropped', 'Брошено'],
  ];

  sections.forEach(([key, title]) => {
    const list = byStatus[key];
    if (!list.length) return;

    md += `## ${title} (${list.length})\n\n`;

    list.forEach((book) => {
      md += `### ${book.title}\n\n`;
      if (book.authors?.length) md += `**Автор:** ${book.authors.join(', ')}\n\n`;
      if (book.year) md += `**Год:** ${book.year}\n\n`;
      if (book.rating) md += `**Оценка:** ${book.rating}/10\n\n`;
      if (book.tags?.length) md += `**Метки:** ${book.tags.join(', ')}\n\n`;
      if (book.currentPage && book.pages) {
        md += `**Прогресс:** ${book.currentPage} из ${book.pages} страниц\n\n`;
      }
      if (book.note) {
        md += `> ${book.note}\n\n`;
      }
      md += `---\n\n`;
    });
  });

  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `moya-polka-${new Date().toISOString().slice(0, 10)}.md`;
  link.click();
  URL.revokeObjectURL(url);
  showToast('Markdown скачан', 'success');
}

function initSettings() {
  const goalInput = document.getElementById('goal-input');
  const minusButton = document.getElementById('goal-minus');
  const plusButton = document.getElementById('goal-plus');

  const goal = getGoal();
  if (goal) goalInput.value = goal;

  renderGoalPreview();

  goalInput.addEventListener('input', () => {
    const value = goalInput.value ? parseInt(goalInput.value, 10) : null;
    setGoal(value && value > 0 ? value : null);
    renderGoalPreview();
    updateGoalButtons();
  });

  minusButton.addEventListener('click', () => {
    const current = parseInt(goalInput.value, 10) || 0;
    const next = Math.max(1, current - 1);
    goalInput.value = next;
    setGoal(next);
    renderGoalPreview();
    updateGoalButtons();
  });

  plusButton.addEventListener('click', () => {
    const current = parseInt(goalInput.value, 10) || 0;
    const next = Math.min(365, current + 1);
    goalInput.value = next;
    setGoal(next);
    renderGoalPreview();
    updateGoalButtons();
  });

  function updateGoalButtons() {
    const value = parseInt(goalInput.value, 10) || 0;
    minusButton.disabled = value <= 1;
    plusButton.disabled = value >= 365;
  }

  updateGoalButtons();
}

function renderGoalPreview() {
  const preview = document.getElementById('goal-preview');
  if (!preview) return;

  const goal = getGoal();

  if (!goal) {
    preview.innerHTML = `<div class="goal-preview__label">Цель пока не задана</div>`;
    return;
  }

  const books = getAllBooks();
  const currentYear = new Date().getFullYear();

  const finishedThisYear = books.filter((b) => {
    if (b.status !== 'finished') return false;
    if (!b.updatedAt) return false;
    return new Date(b.updatedAt).getFullYear() === currentYear;
  }).length;

  const pct = Math.min(100, Math.round((finishedThisYear / goal) * 100));

  preview.innerHTML = `
    <div class="goal-preview__header">
      <span class="goal-preview__label">Прогресс за ${currentYear}</span>
      <span class="goal-preview__value">${finishedThisYear} из ${goal} · ${pct}%</span>
    </div>
    <div class="goal-preview__bar">
      <div class="goal-preview__fill" style="width: ${pct}%"></div>
    </div>
  `;
}

let toastTimeoutId = null;

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast toast--visible toast--${type}`;

  clearTimeout(toastTimeoutId);
  toastTimeoutId = setTimeout(() => {
    toast.classList.remove('toast--visible');
  }, 2500);
}

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initTabs();
  initSearch();
  initGenreChips();
  initFilters();
  initBookBack();
  initBackup();
  initSettings();
  route();
});

window.addEventListener('hashchange', route);