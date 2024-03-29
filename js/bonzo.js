/*!
  * Bonzo: DOM Utility (c) Dustin Diaz 2011
  * https://github.com/ded/bonzo
  * License MIT
  */
!function (name, definition) {
  if (typeof module != 'undefined') module.exports = definition()
  else if (typeof define == 'function' && define.amd) define(name, definition)
  else this[name] = definition()
}('bonzo', function() {
  var context = this
    , old = context.bonzo
    , win = window
    , doc = win.document
    , html = doc.documentElement
    , parentNode = 'parentNode'
    , query = null
    , specialAttributes = /^checked|value|selected$/
    , specialTags = /select|fieldset|table|tbody|tfoot|td|tr|colgroup/i
    , table = [ '<table>', '</table>', 1 ]
    , td = [ '<table><tbody><tr>', '</tr></tbody></table>', 3 ]
    , option = [ '<select>', '</select>', 1 ]
    , tagMap = {
        thead: table, tbody: table, tfoot: table, colgroup: table, caption: table
        , tr: [ '<table><tbody>', '</tbody></table>', 2 ]
        , th: td , td: td
        , col: [ '<table><colgroup>', '</colgroup></table>', 2 ]
        , fieldset: [ '<form>', '</form>', 1 ]
        , legend: [ '<form><fieldset>', '</fieldset></form>', 2 ]
        , option: option
        , optgroup: option }
    , stateAttributes = /^checked|selected$/
    , ie = /msie/i.test(navigator.userAgent)
    , uidList = []
    , uuids = 0
    , digit = /^-?[\d\.]+$/
    , px = 'px'
    , setAttribute = 'setAttribute'
    , getAttribute = 'getAttribute'
    , byTag = 'getElementsByTagName'
    , features = function() {
        var e = doc.createElement('p')
        e.innerHTML = '<a href="#x">x</a><table style="float:left;"></table>'
        return {
          hrefExtended: e[byTag]('a')[0][getAttribute]('href') != '#x' // IE < 8
          , autoTbody: e[byTag]('tbody').length !== 0 // IE < 8
          , computedStyle: doc.defaultView && doc.defaultView.getComputedStyle
          , cssFloat: e[byTag]('table')[0].style.styleFloat ? 'styleFloat' : 'cssFloat'
          , transform: function () {
              var props = ['webkitTransform', 'MozTransform', 'OTransform', 'msTransform', 'Transform'], i
              for (i = 0; i < props.length; i++) {
                if (props[i] in e.style) return props[i]
              }
            }()
        }
      }()
    , trimReplace = /(^\s*|\s*$)/g
    , unitless = { lineHeight: 1, zoom: 1, zIndex: 1, opacity: 1 }
    , trim = String.prototype.trim ?
        function (s) {
          return s.trim()
        } :
        function (s) {
          return s.replace(trimReplace, '')
        }

  function classReg(c) {
    return new RegExp("(^|\\s+)" + c + "(\\s+|$)")
  }

  function each(ar, fn, scope) {
    for (var i = 0, l = ar.length; i < l; i++) fn.call(scope || ar[i], ar[i], i, ar)
    return ar
  }

  function camelize(s) {
    return s.replace(/-(.)/g, function (m, m1) {
      return m1.toUpperCase()
    })
  }

  function isNode(node) {
    return node && node.nodeName && node.nodeType == 1
  }

  function some(ar, fn, scope, i) {
    for (i = 0, j = ar.length; i < j; ++i) if (fn.call(scope, ar[i], i, ar)) return true
    return false
  }

  function styleProperty(p) {
      (p == 'transform' && (p = features.transform)) ||
        (/^transform-?[Oo]rigin$/.test(p) && (p = features.transform + "Origin")) ||
        (p == 'float' && (p = features.cssFloat))
      return p ? camelize(p) : null
  }

  var getStyle = features.computedStyle ?
    function (el, property) {
      var value = null
        , computed = doc.defaultView.getComputedStyle(el, '')
      computed && (value = computed[property])
      return el.style[property] || value
    } :

    (ie && html.currentStyle) ?

    function (el, property) {
      if (property == 'opacity') {
        var val = 100
        try {
          val = el.filters['DXImageTransform.Microsoft.Alpha'].opacity
        } catch (e1) {
          try {
            val = el.filters('alpha').opacity
          } catch (e2) {}
        }
        return val / 100
      }
      var value = el.currentStyle ? el.currentStyle[property] : null
      return el.style[property] || value
    } :

    function (el, property) {
      return el.style[property]
    }

  // this insert method is intense
  function insert(target, host, fn) {
    var i = 0, self = host || this, r = []
      // target nodes could be a css selector if it's a string and a selector engine is present
      // otherwise, just use target
      , nodes = query && typeof target == 'string' && target.charAt(0) != '<' ? query(target) : target
    // normalize each node in case it's still a string and we need to create nodes on the fly
    each(normalize(nodes), function (t) {
      each(self, function (el) {
        var n = !el[parentNode] || (el[parentNode] && !el[parentNode][parentNode]) ?
          function () {
            var c = el.cloneNode(true)
            // check for existence of an event cloner
            // preferably https://github.com/fat/bean
            // otherwise Bonzo won't do this for you
            self.$ && self.cloneEvents && self.$(c).cloneEvents(el)
            return c
          }() : el
        fn(t, n)
        r[i] = n
        i++
      })
    }, this)
    each(r, function (e, i) {
      self[i] = e
    })
    self.length = i
    return self
  }

  function xy(el, x, y) {
    var $el = bonzo(el)
      , style = $el.css('position')
      , offset = $el.offset()
      , rel = 'relative'
      , isRel = style == rel
      , delta = [parseInt($el.css('left'), 10), parseInt($el.css('top'), 10)]

    if (style == 'static') {
      $el.css('position', rel)
      style = rel
    }

    isNaN(delta[0]) && (delta[0] = isRel ? 0 : el.offsetLeft)
    isNaN(delta[1]) && (delta[1] = isRel ? 0 : el.offsetTop)

    x != null && (el.style.left = x - offset.left + delta[0] + px)
    y != null && (el.style.top = y - offset.top + delta[1] + px)

  }

  function hasClass(el, c) {
    return classReg(c).test(el.className)
  }
  function addClass(el, c) {
    el.className = trim(el.className + ' ' + c)
  }
  function removeClass(el, c) {
    el.className = trim(el.className.replace(classReg(c), ' '))
  }

  // this allows method calling for setting values
  // example:

  // bonzo(elements).css('color', function (el) {
  //   return el.getAttribute('data-original-color')
  // })

  function setter(el, v) {
    return typeof v == 'function' ? v(el) : v
  }

  function Bonzo(elements) {
    this.length = 0
    if (elements) {
      elements = typeof elements !== 'string' &&
        !elements.nodeType &&
        typeof elements.length !== 'undefined' ?
          elements :
          [elements]
      this.length = elements.length
      for (var i = 0; i < elements.length; i++) {
        this[i] = elements[i]
      }
    }
  }

  Bonzo.prototype = {

      get: function (index) {
        return this[index]
      }

    , each: function (fn, scope) {
        return each(this, fn, scope)
      }

    , map: function (fn, reject) {
        var m = [], n, i
        for (i = 0; i < this.length; i++) {
          n = fn.call(this, this[i], i)
          reject ? (reject(n) && m.push(n)) : m.push(n)
        }
        return m
      }

    , first: function () {
        return bonzo(this[0])
      }

    , last: function () {
        return bonzo(this[this.length - 1])
      }

    , html: function (h, text) {
        var method = text ?
          html.textContent === undefined ?
            'innerText' :
            'textContent' :
          'innerHTML', m;
        function append(el) {
          while (el.firstChild) el.removeChild(el.firstChild)
          each(normalize(h), function (node) {
            el.appendChild(node)
          })
        }
        return typeof h !== 'undefined' ?
            this.each(function (el) {
              !text && (m = el.tagName.match(specialTags)) ?
                append(el, m[0]) :
                (el[method] = h)
            }) :
          this[0] ? this[0][method] : ''
      }

    , text: function (text) {
        return this.html(text, 1)
      }

    , addClass: function (c) {
        return this.each(function (el) {
          hasClass(el, setter(el, c)) || addClass(el, setter(el, c))
        })
      }

    , removeClass: function (c) {
        return this.each(function (el) {
          hasClass(el, setter(el, c)) && removeClass(el, setter(el, c))
        })
      }

    , hasClass: function (c) {
        return some(this, function (el) {
          return hasClass(el, c)
        })
      }

    , toggleClass: function (c, condition) {
        return this.each(function (el) {
          typeof condition !== 'undefined' ?
            condition ? addClass(el, c) : removeClass(el, c) :
            hasClass(el, c) ? removeClass(el, c) : addClass(el, c)
        })
      }

    , show: function (type) {
        return this.each(function (el) {
          el.style.display = type || ''
        })
      }

    , hide: function () {
        return this.each(function (el) {
          el.style.display = 'none'
        })
      }

    , append: function (node) {
        return this.each(function (el) {
          each(normalize(node), function (i) {
            el.appendChild(i)
          })
        })
      }

    , prepend: function (node) {
        return this.each(function (el) {
          var first = el.firstChild
          each(normalize(node), function (i) {
            el.insertBefore(i, first)
          })
        })
      }

    , appendTo: function (target, host) {
        return insert.call(this, target, host, function (t, el) {
          t.appendChild(el)
        })
      }

    , prependTo: function (target, host) {
        return insert.call(this, target, host, function (t, el) {
          t.insertBefore(el, t.firstChild)
        })
      }

    , next: function () {
        return this.related('nextSibling')
      }

    , previous: function () {
        return this.related('previousSibling')
      }

    , related: function (method) {
        return this.map(
          function (el) {
            el = el[method]
            while (el && el.nodeType !== 1) {
              el = el[method]
            }
            return el || 0
          },
          function (el) {
            return el
          }
        )
      }

    , before: function (node) {
        return this.each(function (el) {
          each(bonzo.create(node), function (i) {
            el[parentNode].insertBefore(i, el)
          })
        })
      }

    , after: function (node) {
        return this.each(function (el) {
          each(bonzo.create(node), function (i) {
            el[parentNode].insertBefore(i, el.nextSibling)
          })
        })
      }

    , insertBefore: function (target, host) {
        return insert.call(this, target, host, function (t, el) {
          t[parentNode].insertBefore(el, t)
        })
      }

    , insertAfter: function (target, host) {
        return insert.call(this, target, host, function (t, el) {
          var sibling = t.nextSibling
          if (sibling) {
            t[parentNode].insertBefore(el, sibling);
          }
          else {
            t[parentNode].appendChild(el)
          }
        })
      }

    , replaceWith: function(html) {
        return this.each(function (el) {
          el.parentNode.replaceChild(bonzo.create(html)[0], el)
        })
      }

    , css: function (o, v, p) {
        // is this a request for just getting a style?
        if (v === undefined && typeof o == 'string') {
          // repurpose 'v'
          v = this[0]
          if (!v) {
            return null
          }
          if (v === doc || v === win) {
            p = (v === doc) ? bonzo.doc() : bonzo.viewport()
            return o == 'width' ? p.width : o == 'height' ? p.height : ''
          }
          return (o = styleProperty(o)) ? getStyle(v, o) : null
        }
        var iter = o
        if (typeof o == 'string') {
          iter = {}
          iter[o] = v
        }

        if (ie && iter.opacity) {
          // oh this 'ol gamut
          iter.filter = 'alpha(opacity=' + (iter.opacity * 100) + ')'
          // give it layout
          iter.zoom = o.zoom || 1;
          delete iter.opacity;
        }

        function fn(el, p, v) {
          for (var k in iter) {
            if (iter.hasOwnProperty(k)) {
              v = iter[k];
              // change "5" to "5px" - unless you're line-height, which is allowed
              (p = styleProperty(k)) && digit.test(v) && !(p in unitless) && (v += px)
              el.style[p] = setter(el, v)
            }
          }
        }
        return this.each(fn)
      }

    , offset: function (x, y) {
        if (typeof x == 'number' || typeof y == 'number') {
          return this.each(function (el) {
            xy(el, x, y)
          })
        }
        var el = this[0]
          , width = el.offsetWidth
          , height = el.offsetHeight
          , top = el.offsetTop
          , left = el.offsetLeft
        while (el = el.offsetParent) {
          top = top + el.offsetTop
          left = left + el.offsetLeft
        }

        return {
            top: top
          , left: left
          , height: height
          , width: width
        }
      }

    , dim: function () {
        var el = this[0]
          , orig = !el.offsetWidth && !el.offsetHeight ?
             // el isn't visible, can't be measured properly, so fix that
             function (t, s) {
                s = {
                    position: el.style.position || ''
                  , visibility: el.style.visibility || ''
                  , display: el.style.display || ''
                }
                t.first().css({
                    position: 'absolute'
                  , visibility: 'hidden'
                  , display: 'block'
                })
                return s
              }(this) : null
          , width = el.offsetWidth
          , height = el.offsetHeight

        orig && this.first().css(orig)
        return {
            height: height
          , width: width
        }
      }

    , attr: function (k, v) {
        var el = this[0]
        if (typeof k != 'string' && !(k instanceof String)) {
          for (var n in k) {
            k.hasOwnProperty(n) && this.attr(n, k[n])
          }
          return this
        }
        return typeof v == 'undefined' ?
          specialAttributes.test(k) ?
            stateAttributes.test(k) && typeof el[k] == 'string' ?
              true : el[k] : (k == 'href' || k =='src') && features.hrefExtended ?
                el[getAttribute](k, 2) : el[getAttribute](k) :
          this.each(function (el) {
            specialAttributes.test(k) ? (el[k] = setter(el, v)) : el[setAttribute](k, setter(el, v))
          })
      }

    , val: function (s) {
        return (typeof s == 'string') ? this.attr('value', s) : this[0].value
      }

    , removeAttr: function (k) {
        return this.each(function (el) {
          stateAttributes.test(k) ? (el[k] = false) : el.removeAttribute(k)
        })
      }

    , data: function (k, v) {
        var el = this[0], uid, o
        if (typeof v === 'undefined') {
          el[getAttribute]('data-node-uid') || el[setAttribute]('data-node-uid', ++uuids)
          uid = el[getAttribute]('data-node-uid')
          uidList[uid] || (uidList[uid] = {})
          return uidList[uid][k]
        } else {
          return this.each(function (el) {
            el[getAttribute]('data-node-uid') || el[setAttribute]('data-node-uid', ++uuids)
            uid = el[getAttribute]('data-node-uid')
            o = uidList[uid] || (uidList[uid] = {})
            o[k] = v
          })
        }
      }

    , remove: function () {
        return this.each(function (el) {
          el[parentNode] && el[parentNode].removeChild(el)
        })
      }

    , empty: function () {
        return this.each(function (el) {
          while (el.firstChild) {
            el.removeChild(el.firstChild)
          }
        })
      }

    , detach: function () {
        return this.map(function (el) {
          return el[parentNode].removeChild(el)
        })
      }

    , scrollTop: function (y) {
        return scroll.call(this, null, y, 'y')
      }

    , scrollLeft: function (x) {
        return scroll.call(this, x, null, 'x')
      }

    , toggle: function(callback) {
        this.each(function (el) {
          el.style.display = (el.offsetWidth || el.offsetHeight) ? 'none' : 'block'
        })
        callback && callback()
        return this
      }
  }

  function normalize(node) {
    return typeof node == 'string' ? bonzo.create(node) : isNode(node) ? [node] : node // assume [nodes]
  }

  function scroll(x, y, type) {
    var el = this[0]
    if (x == null && y == null) {
      return (isBody(el) ? getWindowScroll() : { x: el.scrollLeft, y: el.scrollTop })[type]
    }
    if (isBody(el)) {
      win.scrollTo(x, y)
    } else {
      x != null && (el.scrollLeft = x)
      y != null && (el.scrollTop = y)
    }
    return this
  }

  function isBody(element) {
    return element === win || (/^(?:body|html)$/i).test(element.tagName)
  }

  function getWindowScroll() {
    return { x: win.pageXOffset || html.scrollLeft, y: win.pageYOffset || html.scrollTop }
  }

  function bonzo(els, host) {
    return new Bonzo(els, host)
  }

  bonzo.setQueryEngine = function (q) {
    query = q;
    delete bonzo.setQueryEngine
  }

  bonzo.aug = function (o, target) {
    for (var k in o) {
      o.hasOwnProperty(k) && ((target || Bonzo.prototype)[k] = o[k])
    }
  }

  bonzo.create = function (node) {
    return typeof node == 'string' && node !== '' ?
      function () {
        var tag = /^\s*<([^\s>]+)/.exec(node)
          , el = doc.createElement('div')
          , els = []
          , p = tag ? tagMap[tag[1].toLowerCase()] : null
          , dep = p ? p[2] + 1 : 1
          , pn = parentNode
          , tb = features.autoTbody && p && p[0] == '<table>' && !(/<tbody/i).test(node)

        el.innerHTML = p ? (p[0] + node + p[1]) : node
        while (dep--) el = el.firstChild
        do {
          // tbody special case for IE<8, creates tbody on any empty table
          // we don't want it if we're just after a <thead>, <caption>, etc.
          if ((!tag || el.nodeType == 1) && (!tb || el.tagName.toLowerCase() != 'tbody')) {
            els.push(el)
          }
        } while (el = el.nextSibling)
        // IE < 9 gives us a parentNode which messes up insert() check for cloning
        // `dep` > 1 can also cause problems with the insert() check (must do this last)
        each(els, function(el) { el[pn] && el[pn].removeChild(el) })
        return els

      }() : isNode(node) ? [node.cloneNode(true)] : []
  }

  bonzo.doc = function () {
    var vp = bonzo.viewport()
    return {
        width: Math.max(doc.body.scrollWidth, html.scrollWidth, vp.width)
      , height: Math.max(doc.body.scrollHeight, html.scrollHeight, vp.height)
    }
  }

  bonzo.firstChild = function (el) {
    for (var c = el.childNodes, i = 0, j = (c && c.length) || 0, e; i < j; i++) {
      if (c[i].nodeType === 1) e = c[j = i]
    }
    return e
  }

  bonzo.viewport = function () {
    return {
        width: ie ? html.clientWidth : self.innerWidth
      , height: ie ? html.clientHeight : self.innerHeight
    }
  }

  bonzo.isAncestor = 'compareDocumentPosition' in html ?
    function (container, element) {
      return (container.compareDocumentPosition(element) & 16) == 16
    } : 'contains' in html ?
    function (container, element) {
      return container !== element && container.contains(element);
    } :
    function (container, element) {
      while (element = element[parentNode]) {
        if (element === container) {
          return true
        }
      }
      return false
    }

  bonzo.noConflict = function () {
    context.bonzo = old
    return this
  }

  return bonzo
})