const objectToString = Object.prototype.toString
const toTypeString = (value) => objectToString.call(value)
const isFunction = data => toTypeString(data) === '[object Function]'

class miniVue {
  constructor(options) {
    this.$options = options;
    this.initState(options.data)
    this.compile(options.el);
    if (options.created) {
      options.created.call(this)
    }
  }
  initState(data) {
    if(isFunction(data)) {
      const $data = data()
      this.$data = $data;
      this.observe(this.$data);
    } else {
      console.error('data It has to be a function')
    }
  }
  observe(data) {
    Object.keys(data).forEach(key => {
      let value = data[key]
      let dep = new Dep();
      Object.defineProperty(data, key, {
        configurable: true,
        enumerable: true,
        get() {
          console.log(Dep.target)
          Dep.target && dep.addSub(Dep.target)
          return value
        },
        set(newVal) {
          if (newVal !== value)
            value = newVal
          dep.notify(newVal)
        }
      })
    })
  }
  compile(el) {
    let element = document.querySelector(el);
    this.compileNodes(element)
  }
  compileNodes(element) {
    let childNodes = element.childNodes;
    Array.from(childNodes).forEach(node => {
      if (node.nodeType === 3) {

        // 文本类型处理
        let nodeContent = node.textContent;
        let reg = /\{\{\s*(\S*)\s*\}\}/;
        if (reg.test(nodeContent)) {
          node.textContent = this.$data[RegExp.$1]
          new Watcher(this, RegExp.$1, newVal => {
            node.textContent = newVal
          })
        }
      } else if (node.nodeType === 1) {
        this.compileElement(node)
      }

      if (node.childNodes.length > 0) {
        this.compileNodes(node)
      }
    })
  }
  compileElement(node) {
    // 元素属性
    let nodeAttrs = node.attributes;
    Array.from(nodeAttrs).forEach(attr => {
      const attrName = attr.name,
        exp = attr.value;
      if (this.isDirective(attrName)) {

        const dir = attrName.substring(2)
        this[dir] && this[dir](node, this, exp)
      }
      if (this.isEvent(attrName)) {
        const eName = attrName.substring(1)
        this.eventHandler(node, this, exp, eName)
      }
    })
  }
  isDirective(attr) {
    return attr.indexOf('h-') === 0
  }
  isEvent(attr) {
    return attr.indexOf('@') === 0
  }
  text(node, vm, exp) {
    this.update(node, vm, exp, 'text')
  }
  html(node, vm, exp) {
    this.update(node, vm, exp, 'html')
  }
  model(node, vm, exp) {
    // data => view
    this.update(node, vm, exp, 'model')
    // view => data
    node.addEventListener("input", e => {
      vm.$data[exp] = e.target.value
    })
  }
  update(node, vm, exp, dir) {
    let updaterFn = this[dir + 'Updater']
    updaterFn && updaterFn(node, vm.$data[exp])
    new Watcher(vm, exp, val => {
      updaterFn && updaterFn(node, val)
    })
  }
  eventHandler(node, vm, exp, eName) {
    const fn = vm.$options.methods && vm.$options.methods[exp]
    if (eName, fn) {
      node.addEventListener(eName, fn.bind(vm))
    }

  }
  htmlUpdater(node, val) {
    node.innerHTML = val
  }
  textUpdater(node, val) {
    node.textContent = val
  }
  modelUpdater(node, val) {
    node.value = val
  }

}
class Dep {
  constructor() {
    this.subs = []
  }
  addSub(sub) {
    this.subs.push(sub) // 把收集到的依赖放在subs里
  }
  notify(newVal) {
    this.subs.forEach(v => {
      v.update(newVal) // v就是watcher实例 触发更新
    })
  }
}
class Watcher {
  constructor(vm, exp, cb) {
    Dep.target = this; // 把watcher 实例放在target上
    vm.$data[exp]; // 为了触发 get 添加Dep
    Dep.target = null; // 设置为空 因为get已经把watcher存储到subs上了
    this.cb = cb // 设置callback函数
  }
  update(newVal) {
    this.cb(newVal) //更新
  }
}