export default murmurhash3_32_gc;
/**
 * JS Implementation of MurmurHash3 (r136) (as of May 20, 2011)
 *
 * Modifed to support non-ascii string by encoding to utf-8
 *
 * @author <a href="mailto:gary.court@gmail.com">Gary Court</a>
 * @see http://github.com/garycourt/murmurhash-js
 * @author <a href="mailto:aappleby@gmail.com">Austin Appleby</a>
 * @see http://sites.google.com/site/murmurhash/
 *
 * @param {string} str string to hash
 * @param {number} seed Positive integer only
 * @return {number} 32-bit positive integer hash
 */
declare function murmurhash3_32_gc(str: string, seed: number): number;
//# sourceMappingURL=murmurhash3_gc.d.ts.map