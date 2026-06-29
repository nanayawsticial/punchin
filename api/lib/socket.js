let _io = null;

function setIO(io) {
  _io = io;
}

function getIO() {
  return _io;
}

function emitToOrg(organizationId, event, data) {
  if (_io) {
    _io.to(`org:${organizationId}`).emit(event, data);
  }
}

module.exports = {
  setIO,
  getIO,
  emitToOrg
};
