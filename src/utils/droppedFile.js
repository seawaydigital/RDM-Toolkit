let _droppedFiles = null;

/**
 * Fired on `window` when files are dropped onto a tool that is already open.
 * The hash does not change in that case, so nothing remounts to pick the files
 * up — the mounted DropZone listens for this instead.
 */
export const DROPPED_FILES_EVENT = 'rdm:files-dropped';

export function setDroppedFiles(files) {
  _droppedFiles = files;
}

/** True while files are waiting for a DropZone to collect them. */
export function hasPendingDroppedFiles() {
  return _droppedFiles !== null && _droppedFiles.length > 0;
}

export function getDroppedFiles() {
  const f = _droppedFiles;
  _droppedFiles = null;
  return f;
}
