import '@testing-library/jest-dom';

window.matchMedia = window.matchMedia || function() {
  return {
    matches: false,
    addListener: function() {},
    removeListener: function() {},
    addEventListener: function() {},
    removeEventListener: function() {},
    dispatchEvent: function() { return false; },
  };
};

if (!window.ResizeObserver) {
  window.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  global.ResizeObserver = window.ResizeObserver;
}

if (!window.DataTransfer) {
  window.DataTransfer = class DataTransfer {
    constructor() {
      this.data = {};
      this.dropEffect = 'none';
      this.effectAllowed = 'all';
    }
    setData(format, data) {
      this.data[format] = data;
    }
    getData(format) {
      return this.data[format] || '';
    }
    clearData(format) {
      if (format) delete this.data[format];
      else this.data = {};
    }
  };
}
