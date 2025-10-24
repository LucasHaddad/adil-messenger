module.exports = {
  createId: () => 'test-cuid-' + Math.random().toString(36).substr(2, 9),
  init: () => ({
    createId: () => 'test-cuid-' + Math.random().toString(36).substr(2, 9),
  }),
  getConstants: () => ({}),
  isCuid: id => typeof id === 'string' && id.length > 0,
};