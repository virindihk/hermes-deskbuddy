// @ts-check

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    /** @type {any} */ (root).DeskBuddyPetHitTest = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /**
   * @typedef {Object} RectLike
   * @property {number} left
   * @property {number} top
   * @property {number} width
   * @property {number} height
   * @property {number} [right]
   * @property {number} [bottom]
   */

  /**
   * @typedef {Object} ImageSize
   * @property {number} width
   * @property {number} height
   */

  /**
   * @typedef {Object} ImagePoint
   * @property {number} x
   * @property {number} y
   */

  const PET_HIT_ALPHA_THRESHOLD = 24;

  /**
   * @param {RectLike | null | undefined} rect
   * @returns {(RectLike & { right: number, bottom: number }) | null}
   */
  function getRectBounds(rect) {
    if (!rect) return null;

    const left = Number(rect.left);
    const top = Number(rect.top);
    const width = Number(rect.width);
    const height = Number(rect.height);
    if (![left, top, width, height].every(Number.isFinite) || width <= 0 || height <= 0) {
      return null;
    }

    return {
      left,
      top,
      width,
      height,
      right: left + width,
      bottom: top + height,
    };
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {RectLike | null | undefined} rect
   * @returns {boolean}
   */
  function pointInRect(x, y, rect) {
    const bounds = getRectBounds(rect);
    if (!bounds) return false;

    return x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom;
  }

  /**
   * Maps a window-space point to an object-fit: contain image pixel coordinate.
   * Returns null when the point falls in transparent letterbox/pillarbox space.
   *
   * @param {number} x
   * @param {number} y
   * @param {RectLike | null | undefined} rect
   * @param {ImageSize | null | undefined} imageSize
   * @returns {ImagePoint | null}
   */
  function mapPointToContainedImage(x, y, rect, imageSize) {
    const bounds = getRectBounds(rect);
    if (!bounds || !pointInRect(x, y, bounds)) return null;

    const imageWidth = Number(imageSize && imageSize.width);
    const imageHeight = Number(imageSize && imageSize.height);
    if (!Number.isFinite(imageWidth) || !Number.isFinite(imageHeight) || imageWidth <= 0 || imageHeight <= 0) {
      return null;
    }

    const imageAspect = imageWidth / imageHeight;
    const rectAspect = bounds.width / bounds.height;
    let displayWidth = bounds.width;
    let displayHeight = bounds.height;
    let offsetX = 0;
    let offsetY = 0;

    if (imageAspect > rectAspect) {
      displayHeight = bounds.width / imageAspect;
      offsetY = (bounds.height - displayHeight) / 2;
    } else {
      displayWidth = bounds.height * imageAspect;
      offsetX = (bounds.width - displayWidth) / 2;
    }

    const localX = x - bounds.left - offsetX;
    const localY = y - bounds.top - offsetY;
    if (localX < 0 || localX > displayWidth || localY < 0 || localY > displayHeight) {
      return null;
    }

    return {
      x: Math.max(0, Math.min(imageWidth - 1, Math.floor((localX / displayWidth) * imageWidth))),
      y: Math.max(0, Math.min(imageHeight - 1, Math.floor((localY / displayHeight) * imageHeight))),
    };
  }

  /**
   * @param {number} alpha
   * @param {number} [threshold]
   * @returns {boolean}
   */
  function isAlphaHit(alpha, threshold = PET_HIT_ALPHA_THRESHOLD) {
    return Number(alpha) >= threshold;
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {RectLike | null | undefined} rect
   * @returns {boolean}
   */
  function isFallbackShapeHit(x, y, rect) {
    const bounds = getRectBounds(rect);
    if (!bounds || !pointInRect(x, y, bounds)) return false;

    const dx = (x - (bounds.left + bounds.width / 2)) / (bounds.width * 0.46);
    const dy = (y - (bounds.top + bounds.height * 0.56)) / (bounds.height * 0.50);
    return (dx * dx + dy * dy) <= 1;
  }

  return {
    PET_HIT_ALPHA_THRESHOLD,
    pointInRect,
    mapPointToContainedImage,
    isAlphaHit,
    isFallbackShapeHit,
  };
}));
