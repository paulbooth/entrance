/*
 * Shuffles list in-place
 */
Array.prototype.shuffle =  function() {
  var i, j, t;
  for (i = 1; i < this.length; i++) {
    j = Math.floor(Math.random()*(1+i));  // choose j in [0..i]
    if (j != i) {
      t = this[i];                        // swap list[i] and list[j]
      this[i] = this[j];
      this[j] = t;
    }
  }
}