module.exports = async () => {
  process.env.NODE_ENV = 'test';
  global.__GLOBAL_RESOURCES__ = [];
};
