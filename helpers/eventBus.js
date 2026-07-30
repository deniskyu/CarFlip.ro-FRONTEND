import mitt from 'mitt';

export const emitter = mitt();


const _stickyValues = new Map();

export const emitSticky = (event, value) => {
    _stickyValues.set(event, value);
    emitter.emit(event, value);
};

export const getSticky = (event, fallback = null) => (
    _stickyValues.has(event) ? _stickyValues.get(event) : fallback
);