if (!Array.prototype.at) {
  Array.prototype.at = function(index) {
    let n = Math.trunc(index) || 0
    if (n < 0) n += this.length
    if (n < 0 || n >= this.length) return undefined
    return this[n]
  }
}

if (!String.prototype.at) {
  String.prototype.at = function(index) {
    return this.slice(index, index + 1)
  }
}

if (!Object.hasOwn) {
  Object.hasOwn = function(obj, prop) {
    return Object.prototype.hasOwnProperty.call(obj, prop)
  }
}

if (!Array.prototype.findLast) {
  Array.prototype.findLast = function(callback) {
    for (let i = this.length - 1; i >= 0; i--) {
      if (callback(this[i], i, this)) return this[i]
    }
    return undefined
  }
}

if (!Array.prototype.findLastIndex) {
  Array.prototype.findLastIndex = function(callback) {
    for (let i = this.length - 1; i >= 0; i--) {
      if (callback(this[i], i, this)) return i
    }
    return -1
  }
}