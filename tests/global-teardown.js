module.exports = async () => {
  // Force cleanup of any remaining resources
  if (global.gc) {
    global.gc();
  }
};
