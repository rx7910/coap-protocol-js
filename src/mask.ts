/**
 * packet mask
 * @type {number}
 */

export const versionMask = parseInt("11000000", 2);
export const versionShift = 6;
export const typeMask = parseInt("00110000", 2);
export const typeShift = 4;
export const tklMask = parseInt("00001111", 2);
export const tklShift = 0;
export const optionDeltaMask = parseInt("11110000", 2);
export const optionLengthMask = parseInt("00001111", 2);
