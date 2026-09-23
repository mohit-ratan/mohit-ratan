// Use UTC so every application instance chooses the same calendar date.
function datedMediaPath(folder, filename, now = new Date()) {
  return `${folder}/${now.toISOString().slice(0, 10).replace(/-/g, '/')}/${filename}`;
}

module.exports = { datedMediaPath };
