let _droppedFiles = null;

export function setDroppedFiles(files) {
  _droppedFiles = files;
}

export function getDroppedFiles() {
  const f = _droppedFiles;
  _droppedFiles = null;
  return f;
}
