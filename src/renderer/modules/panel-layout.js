(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DeskBuddyPanelLayout = factory();
  }
}(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const PET_BASE_SIZE = 138;
  const PET_RIGHT_OFFSET = 34;
  const PET_BOTTOM_OFFSET = 32;
  const PANEL_LEFT_MARGIN = 18;
  const PANEL_TOP_MARGIN = 18;
  const PANEL_GAP = 20;
  const MIN_PANEL_BOTTOM = PET_BASE_SIZE + PET_BOTTOM_OFFSET + PANEL_GAP;
  const MIN_PANEL_WIDTH = 260;
  const MIN_PANEL_HEIGHT = 200;

  function toFiniteNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function getPetVisualSize(scale = 1) {
    return PET_BASE_SIZE * toFiniteNumber(scale, 1);
  }

  function getDesiredPanelBottom(scale = 1) {
    return Math.max(
      MIN_PANEL_BOTTOM,
      Math.round(getPetVisualSize(scale) + PET_BOTTOM_OFFSET + PANEL_GAP),
    );
  }

  function getPanelLayout({ scale = 1, panelWidth = 0, panelHeight = 0 } = {}) {
    const petVisualSize = getPetVisualSize(scale);
    const desiredBottom = getDesiredPanelBottom(scale);

    return {
      desiredBottom,
      petVisualSize,
      requiredWidth: Math.ceil(Math.max(toFiniteNumber(panelWidth, 0), petVisualSize) + PET_RIGHT_OFFSET + PANEL_LEFT_MARGIN),
      requiredHeight: Math.ceil(toFiniteNumber(panelHeight, 0) + desiredBottom + PANEL_TOP_MARGIN),
    };
  }

  function clampPanelSize({ panelWidth = 0, panelHeight = 0, targetWidth = 0, targetHeight = 0, desiredBottom = MIN_PANEL_BOTTOM } = {}) {
    const availablePanelWidth = Math.max(
      MIN_PANEL_WIDTH,
      toFiniteNumber(targetWidth, 0) - PET_RIGHT_OFFSET - PANEL_LEFT_MARGIN,
    );
    const availablePanelHeight = Math.max(
      MIN_PANEL_HEIGHT,
      toFiniteNumber(targetHeight, 0) - toFiniteNumber(desiredBottom, MIN_PANEL_BOTTOM) - PANEL_TOP_MARGIN,
    );

    return {
      panelWidth: Math.max(MIN_PANEL_WIDTH, Math.min(toFiniteNumber(panelWidth, MIN_PANEL_WIDTH), availablePanelWidth)),
      panelHeight: Math.max(MIN_PANEL_HEIGHT, Math.min(toFiniteNumber(panelHeight, MIN_PANEL_HEIGHT), availablePanelHeight)),
      availablePanelWidth,
      availablePanelHeight,
    };
  }

  function getWindowResizePlan({ bounds, requiredWidth = 0, requiredHeight = 0, screen = {} } = {}) {
    const currentBounds = {
      x: toFiniteNumber(bounds && bounds.x, 0),
      y: toFiniteNumber(bounds && bounds.y, 0),
      width: toFiniteNumber(bounds && bounds.width, 0),
      height: toFiniteNumber(bounds && bounds.height, 0),
    };
    const screenLeft = toFiniteNumber(screen.availLeft, 0);
    const screenTop = toFiniteNumber(screen.availTop, 0);
    const maxWidthKeepingRight = Math.max(
      currentBounds.width,
      currentBounds.x + currentBounds.width - screenLeft,
    );
    const maxHeightKeepingBottom = Math.max(
      currentBounds.height,
      currentBounds.y + currentBounds.height - screenTop,
    );
    const requestedWidth = Math.max(currentBounds.width, toFiniteNumber(requiredWidth, currentBounds.width));
    const requestedHeight = Math.max(currentBounds.height, toFiniteNumber(requiredHeight, currentBounds.height));
    const width = Math.min(requestedWidth, maxWidthKeepingRight);
    const height = Math.min(requestedHeight, maxHeightKeepingBottom);
    const deltaWidth = Math.max(0, width - currentBounds.width);
    const deltaHeight = Math.max(0, height - currentBounds.height);

    return {
      x: currentBounds.x - deltaWidth,
      y: currentBounds.y - deltaHeight,
      width,
      height,
      deltaWidth,
      deltaHeight,
      shouldResize: deltaWidth > 0 || deltaHeight > 0,
    };
  }

  return {
    PET_BASE_SIZE,
    PET_RIGHT_OFFSET,
    PET_BOTTOM_OFFSET,
    PANEL_LEFT_MARGIN,
    PANEL_TOP_MARGIN,
    PANEL_GAP,
    MIN_PANEL_BOTTOM,
    getPetVisualSize,
    getDesiredPanelBottom,
    getPanelLayout,
    clampPanelSize,
    getWindowResizePlan,
  };
}));
