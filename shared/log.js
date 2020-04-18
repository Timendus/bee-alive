const log = (...args) => {
  console.log(...args);
};
log.error = (...args) => {
  console.error(...args);
};
log.warn = (...args) => {
  console.warn(...args);
};
log.info = (...args) => {
  console.info(...args);
};
log.debug = (...args) => {
  // console.debug(...args);
};
module.exports = log;
