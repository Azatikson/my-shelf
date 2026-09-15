const OPEN_LIBRARY_SEARCH_API = 'https://openlibrary.org/search.json';
const OPEN_LIBRARY_COVERS_API = 'https://covers.openlibrary.org/b';
const OPEN_LIBRARY_WORKS_API = 'https://openlibrary.org';

const OPEN_LIBRARY_FIELDS = [
  'key', 'title', 'author_name', 'first_publish_year',
  'cover_i', 'cover_edition_key', 'number_of_pages_median',
  'subject', 'language'
].join(',');

async function searchBooks(query, maxResults = 20) {
  const url = `${OPEN_LIBRARY_SEARCH_API}?q=${encodeURIComponent(query)}`
    + `&fields=${OPEN_LIBRARY_FIELDS}`
    + `&limit=${maxResults}`;

  return fetchBooks(url);
}

async function searchByGenre(genre, maxResults = 20) {
  const url = `${OPEN_LIBRARY_SEARCH_API}?q=subject:${encodeURIComponent(genre)}`
    + `&fields=${OPEN_LIBRARY_FIELDS}`
    + `&limit=${maxResults}`;

  return fetchBooks(url);
}

async function fetchBooks(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Open Library вернул ошибку: ${response.status}`);
  }

  const data = await response.json();
  return (data.docs || []).map(normalizeBook);
}

async function getBookDetails(bookId) {
  if (!bookId || !bookId.startsWith('/works/')) {
    return null;
  }

  const url = `${OPEN_LIBRARY_WORKS_API}${bookId}.json`;
  const response = await fetch(url);

  if (!response.ok) return null;

  const data = await response.json();

  let description = '';
  if (typeof data.description === 'string') {
    description = data.description;
  } else if (data.description && typeof data.description.value === 'string') {
    description = data.description.value;
  }

  return {
    description,
    subjects: data.subjects || [],
    title: data.title || '',
  };
}

function normalizeBook(doc) {
  let cover = '';

  if (doc.cover_i) {
    cover = `${OPEN_LIBRARY_COVERS_API}/id/${doc.cover_i}-M.jpg`;
  } else if (doc.cover_edition_key) {
    cover = `${OPEN_LIBRARY_COVERS_API}/olid/${doc.cover_edition_key}-M.jpg`;
  }

  return {
    id: doc.key || crypto.randomUUID(),
    title: doc.title || 'Без названия',
    authors: doc.author_name || [],
    description: '',
    cover,
    year: doc.first_publish_year || null,
    pages: doc.number_of_pages_median || null,
    genres: (doc.subject || []).slice(0, 5),
  };
}