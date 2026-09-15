const STORAGE_KEY = 'moya-polka:shelf';
const GOAL_KEY = 'moya-polka:goal';
const THEME_KEY = 'moya-polka:theme';

function loadShelf() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error('Не удалось прочитать полку:', error);
    return [];
  }
}

function saveShelf(books) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
}

function getAllBooks() {
  return loadShelf();
}

function getBookById(id) {
  return loadShelf().find((book) => book.id === id) || null;
}

function addBook(book, status) {
  const books = loadShelf();
  const now = new Date().toISOString();
  const existing = books.find((b) => b.id === book.id);

  if (existing) {
    existing.status = status;
    existing.updatedAt = now;
  } else {
    books.push({
      id: book.id,
      title: book.title,
      authors: book.authors || [],
      cover: book.cover || '',
      year: book.year || null,
      pages: book.pages || null,
      genres: book.genres || [],
      status: status || 'planned',
      rating: null,
      note: '',
      tags: [],
      currentPage: 0,
      addedAt: now,
      updatedAt: now,
    });
  }

  saveShelf(books);
}

function updateBook(id, patch) {
  const books = loadShelf();
  const book = books.find((b) => b.id === id);
  if (!book) return;

  Object.assign(book, patch, { updatedAt: new Date().toISOString() });
  saveShelf(books);
}

function removeBook(id) {
  saveShelf(loadShelf().filter((book) => book.id !== id));
}

function replaceAll(data) {
  if (!Array.isArray(data)) {
    throw new Error('Неверный формат файла: ожидался массив книг');
  }
  saveShelf(data);
}

function exportData() {
  return JSON.stringify(loadShelf(), null, 2);
}

function getGoal() {
  const raw = localStorage.getItem(GOAL_KEY);
  return raw ? parseInt(raw, 10) : null;
}

function setGoal(value) {
  if (value) {
    localStorage.setItem(GOAL_KEY, String(value));
  } else {
    localStorage.removeItem(GOAL_KEY);
  }
}

function getTheme() {
  return localStorage.getItem(THEME_KEY) || 'dark';
}

function setTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
}