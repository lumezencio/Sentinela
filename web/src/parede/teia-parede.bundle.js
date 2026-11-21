var Zx=Object.create;var Cu=Object.defineProperty,Kx=Object.defineProperties,Jx=Object.getOwnPropertyDescriptor,Qx=Object.getOwnPropertyDescriptors,tb=Object.getOwnPropertyNames,Xp=Object.getOwnPropertySymbols,eb=Object.getPrototypeOf,$p=Object.prototype.hasOwnProperty,nb=Object.prototype.propertyIsEnumerable;var Yp=e=>{throw TypeError(e)};var Au=(e,t,n)=>t in e?Cu(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n,qe=(e,t)=>{for(var n in t||(t={}))$p.call(t,n)&&Au(e,n,t[n]);if(Xp)for(var n of Xp(t))nb.call(t,n)&&Au(e,n,t[n]);return e},jn=(e,t)=>Kx(e,Qx(t));var fn=(e,t)=>()=>{try{return t||e((t={exports:{}}).exports,t),t.exports}catch(n){throw t=0,n}};var ib=(e,t,n,i)=>{if(t&&typeof t=="object"||typeof t=="function")for(let r of tb(t))!$p.call(e,r)&&r!==n&&Cu(e,r,{get:()=>t[r],enumerable:!(i=Jx(t,r))||i.enumerable});return e};var rb=(e,t,n)=>(n=e!=null?Zx(eb(e)):{},ib(t||!e||!e.__esModule?Cu(n,"default",{value:e,enumerable:!0}):n,e));var Zp=(e,t,n)=>Au(e,typeof t!="symbol"?t+"":t,n),Kp=(e,t,n)=>t.has(e)||Yp("Cannot "+n);var Xa=(e,t,n)=>(Kp(e,t,"read from private field"),n?n.call(e):t.get(e)),Ru=(e,t,n)=>t.has(e)?Yp("Cannot add the same private member more than once"):t instanceof WeakSet?t.add(e):t.set(e,n),Pu=(e,t,n,i)=>(Kp(e,t,"write to private field"),i?i.call(e,n):t.set(e,n),n);var gd=fn((GF,j0)=>{j0.exports=function(t){return t===0?"x":t===1?"y":t===2?"z":"c"+(t+1)}});var Br=fn((WF,q0)=>{var _T=gd();q0.exports=function(t){return n;function n(i,r){let s=r&&r.indent||0,o=r&&r.join!==void 0?r.join:`
`,a=Array(s+1).join(" "),c=[];for(let l=0;l<t;++l){let u=_T(l),h=l===0?"":a;c.push(h+i.replace(/{var}/g,u))}return c.join(o)}}});var K0=fn((jF,pa)=>{var X0=Br();pa.exports=vT;pa.exports.generateCreateBodyFunctionBody=$0;pa.exports.getVectorCode=Z0;pa.exports.getBodyCode=Y0;function vT(e,t){let n=$0(e,t),{Body:i}=new Function(n)();return i}function $0(e,t){return`
${Z0(e,t)}
${Y0(e,t)}
return {Body: Body, Vector: Vector};
`}function Y0(e){let t=X0(e),n=t("{var}",{join:", "});return`
function Body(${n}) {
  this.isPinned = false;
  this.pos = new Vector(${n});
  this.force = new Vector();
  this.velocity = new Vector();
  this.mass = 1;

  this.springCount = 0;
  this.springLength = 0;
}

Body.prototype.reset = function() {
  this.force.reset();
  this.springCount = 0;
  this.springLength = 0;
}

Body.prototype.setPosition = function (${n}) {
  ${t("this.pos.{var} = {var} || 0;",{indent:2})}
};`}function Z0(e,t){let n=X0(e),i="";return t&&(i=`${n(`
   var v{var};
Object.defineProperty(this, '{var}', {
  set: function(v) { 
    if (!Number.isFinite(v)) throw new Error('Cannot set non-numbers to {var}');
    v{var} = v; 
  },
  get: function() { return v{var}; }
});`)}`),`function Vector(${n("{var}",{join:", "})}) {
  ${i}
    if (typeof arguments[0] === 'object') {
      // could be another vector
      let v = arguments[0];
      ${n('if (!Number.isFinite(v.{var})) throw new Error("Expected value is not a finite number at Vector constructor ({var})");',{indent:4})}
      ${n("this.{var} = v.{var};",{indent:4})}
    } else {
      ${n('this.{var} = typeof {var} === "number" ? {var} : 0;',{indent:4})}
    }
  }
  
  Vector.prototype.reset = function () {
    ${n("this.{var} = ",{join:""})}0;
  };`}});var r_=fn((qF,ir)=>{var _d=Br(),nr=gd();ir.exports=yT;ir.exports.generateQuadTreeFunctionBody=J0;ir.exports.getInsertStackCode=i_;ir.exports.getQuadNodeCode=n_;ir.exports.isSamePosition=Q0;ir.exports.getChildBodyCode=e_;ir.exports.setChildBodyCode=t_;function yT(e){let t=J0(e);return new Function(t)()}function J0(e){let t=_d(e),n=Math.pow(2,e);return`
${i_()}
${n_(e)}
${Q0(e)}
${e_(e)}
${t_(e)}

function createQuadTree(options, random) {
  options = options || {};
  options.gravity = typeof options.gravity === 'number' ? options.gravity : -1;
  options.theta = typeof options.theta === 'number' ? options.theta : 0.8;

  var gravity = options.gravity;
  var updateQueue = [];
  var insertStack = new InsertStack();
  var theta = options.theta;

  var nodesCache = [];
  var currentInCache = 0;
  var root = newNode();

  return {
    insertBodies: insertBodies,

    /**
     * Gets root node if it is present
     */
    getRoot: function() {
      return root;
    },

    updateBodyForce: update,

    options: function(newOptions) {
      if (newOptions) {
        if (typeof newOptions.gravity === 'number') {
          gravity = newOptions.gravity;
        }
        if (typeof newOptions.theta === 'number') {
          theta = newOptions.theta;
        }

        return this;
      }

      return {
        gravity: gravity,
        theta: theta
      };
    }
  };

  function newNode() {
    // To avoid pressure on GC we reuse nodes.
    var node = nodesCache[currentInCache];
    if (node) {
${o("      node.")}
      node.body = null;
      node.mass = ${t("node.mass_{var} = ",{join:""})}0;
      ${t("node.min_{var} = node.max_{var} = ",{join:""})}0;
    } else {
      node = new QuadNode();
      nodesCache[currentInCache] = node;
    }

    ++currentInCache;
    return node;
  }

  function update(sourceBody) {
    var queue = updateQueue;
    var v;
    ${t("var d{var};",{indent:4})}
    var r; 
    ${t("var f{var} = 0;",{indent:4})}
    var queueLength = 1;
    var shiftIdx = 0;
    var pushIdx = 1;

    queue[0] = root;

    while (queueLength) {
      var node = queue[shiftIdx];
      var body = node.body;

      queueLength -= 1;
      shiftIdx += 1;
      var differentBody = (body !== sourceBody);
      if (body && differentBody) {
        // If the current node is a leaf node (and it is not source body),
        // calculate the force exerted by the current node on body, and add this
        // amount to body's net force.
        ${t("d{var} = body.pos.{var} - sourceBody.pos.{var};",{indent:8})}
        r = Math.sqrt(${t("d{var} * d{var}",{join:" + "})});

        if (r === 0) {
          // Poor man's protection against zero distance.
          ${t("d{var} = (random.nextDouble() - 0.5) / 50;",{indent:10})}
          r = Math.sqrt(${t("d{var} * d{var}",{join:" + "})});
        }

        // This is standard gravitation force calculation but we divide
        // by r^3 to save two operations when normalizing force vector.
        v = gravity * body.mass * sourceBody.mass / (r * r * r);
        ${t("f{var} += v * d{var};",{indent:8})}
      } else if (differentBody) {
        // Otherwise, calculate the ratio s / r,  where s is the width of the region
        // represented by the internal node, and r is the distance between the body
        // and the node's center-of-mass
        ${t("d{var} = node.mass_{var} / node.mass - sourceBody.pos.{var};",{indent:8})}
        r = Math.sqrt(${t("d{var} * d{var}",{join:" + "})});

        if (r === 0) {
          // Sorry about code duplication. I don't want to create many functions
          // right away. Just want to see performance first.
          ${t("d{var} = (random.nextDouble() - 0.5) / 50;",{indent:10})}
          r = Math.sqrt(${t("d{var} * d{var}",{join:" + "})});
        }
        // If s / r < \u03B8, treat this internal node as a single body, and calculate the
        // force it exerts on sourceBody, and add this amount to sourceBody's net force.
        if ((node.max_${nr(0)} - node.min_${nr(0)}) / r < theta) {
          // in the if statement above we consider node's width only
          // because the region was made into square during tree creation.
          // Thus there is no difference between using width or height.
          v = gravity * node.mass * sourceBody.mass / (r * r * r);
          ${t("f{var} += v * d{var};",{indent:10})}
        } else {
          // Otherwise, run the procedure recursively on each of the current node's children.

          // I intentionally unfolded this loop, to save several CPU cycles.
${s()}
        }
      }
    }

    ${t("sourceBody.force.{var} += f{var};",{indent:4})}
  }

  function insertBodies(bodies) {
    ${t("var {var}min = Number.MAX_VALUE;",{indent:4})}
    ${t("var {var}max = Number.MIN_VALUE;",{indent:4})}
    var i = bodies.length;

    // To reduce quad tree depth we are looking for exact bounding box of all particles.
    while (i--) {
      var pos = bodies[i].pos;
      ${t("if (pos.{var} < {var}min) {var}min = pos.{var};",{indent:6})}
      ${t("if (pos.{var} > {var}max) {var}max = pos.{var};",{indent:6})}
    }

    // Makes the bounds square.
    var maxSideLength = -Infinity;
    ${t("if ({var}max - {var}min > maxSideLength) maxSideLength = {var}max - {var}min ;",{indent:4})}

    currentInCache = 0;
    root = newNode();
    ${t("root.min_{var} = {var}min;",{indent:4})}
    ${t("root.max_{var} = {var}min + maxSideLength;",{indent:4})}

    i = bodies.length - 1;
    if (i >= 0) {
      root.body = bodies[i];
    }
    while (i--) {
      insert(bodies[i], root);
    }
  }

  function insert(newBody) {
    insertStack.reset();
    insertStack.push(root, newBody);

    while (!insertStack.isEmpty()) {
      var stackItem = insertStack.pop();
      var node = stackItem.node;
      var body = stackItem.body;

      if (!node.body) {
        // This is internal node. Update the total mass of the node and center-of-mass.
        ${t("var {var} = body.pos.{var};",{indent:8})}
        node.mass += body.mass;
        ${t("node.mass_{var} += body.mass * {var};",{indent:8})}

        // Recursively insert the body in the appropriate quadrant.
        // But first find the appropriate quadrant.
        var quadIdx = 0; // Assume we are in the 0's quad.
        ${t("var min_{var} = node.min_{var};",{indent:8})}
        ${t("var max_{var} = (min_{var} + node.max_{var}) / 2;",{indent:8})}

${r(8)}

        var child = getChild(node, quadIdx);

        if (!child) {
          // The node is internal but this quadrant is not taken. Add
          // subnode to it.
          child = newNode();
          ${t("child.min_{var} = min_{var};",{indent:10})}
          ${t("child.max_{var} = max_{var};",{indent:10})}
          child.body = body;

          setChild(node, quadIdx, child);
        } else {
          // continue searching in this quadrant.
          insertStack.push(child, body);
        }
      } else {
        // We are trying to add to the leaf node.
        // We have to convert current leaf into internal node
        // and continue adding two nodes.
        var oldBody = node.body;
        node.body = null; // internal nodes do not cary bodies

        if (isSamePosition(oldBody.pos, body.pos)) {
          // Prevent infinite subdivision by bumping one node
          // anywhere in this quadrant
          var retriesCount = 3;
          do {
            var offset = random.nextDouble();
            ${t("var d{var} = (node.max_{var} - node.min_{var}) * offset;",{indent:12})}

            ${t("oldBody.pos.{var} = node.min_{var} + d{var};",{indent:12})}
            retriesCount -= 1;
            // Make sure we don't bump it out of the box. If we do, next iteration should fix it
          } while (retriesCount > 0 && isSamePosition(oldBody.pos, body.pos));

          if (retriesCount === 0 && isSamePosition(oldBody.pos, body.pos)) {
            // This is very bad, we ran out of precision.
            // if we do not return from the method we'll get into
            // infinite loop here. So we sacrifice correctness of layout, and keep the app running
            // Next layout iteration should get larger bounding box in the first step and fix this
            return;
          }
        }
        // Next iteration should subdivide node further.
        insertStack.push(node, oldBody);
        insertStack.push(node, body);
      }
    }
  }
}
return createQuadTree;

`;function r(a){let c=[],l=Array(a+1).join(" ");for(let u=0;u<e;++u)c.push(l+`if (${nr(u)} > max_${nr(u)}) {`),c.push(l+`  quadIdx = quadIdx + ${Math.pow(2,u)};`),c.push(l+`  min_${nr(u)} = max_${nr(u)};`),c.push(l+`  max_${nr(u)} = node.max_${nr(u)};`),c.push(l+"}");return c.join(`
`)}function s(){let a=Array(11).join(" "),c=[];for(let l=0;l<n;++l)c.push(a+`if (node.quad${l}) {`),c.push(a+`  queue[pushIdx] = node.quad${l};`),c.push(a+"  queueLength += 1;"),c.push(a+"  pushIdx += 1;"),c.push(a+"}");return c.join(`
`)}function o(a){let c=[];for(let l=0;l<n;++l)c.push(`${a}quad${l} = null;`);return c.join(`
`)}}function Q0(e){let t=_d(e);return`
  function isSamePosition(point1, point2) {
    ${t("var d{var} = Math.abs(point1.{var} - point2.{var});",{indent:2})}
  
    return ${t("d{var} < 1e-8",{join:" && "})};
  }  
`}function t_(e){var t=Math.pow(2,e);return`
function setChild(node, idx, child) {
  ${n()}
}`;function n(){let i=[];for(let r=0;r<t;++r){let s=r===0?"  ":"  else ";i.push(`${s}if (idx === ${r}) node.quad${r} = child;`)}return i.join(`
`)}}function e_(e){return`function getChild(node, idx) {
${t()}
  return null;
}`;function t(){let n=[],i=Math.pow(2,e);for(let r=0;r<i;++r)n.push(`  if (idx === ${r}) return node.quad${r};`);return n.join(`
`)}}function n_(e){let t=_d(e),n=Math.pow(2,e);var i=`
function QuadNode() {
  // body stored inside this node. In quad tree only leaf nodes (by construction)
  // contain bodies:
  this.body = null;

  // Child nodes are stored in quads. Each quad is presented by number:
  // 0 | 1
  // -----
  // 2 | 3
${r("  this.")}

  // Total mass of current node
  this.mass = 0;

  // Center of mass coordinates
  ${t("this.mass_{var} = 0;",{indent:2})}

  // bounding box coordinates
  ${t("this.min_{var} = 0;",{indent:2})}
  ${t("this.max_{var} = 0;",{indent:2})}
}
`;return i;function r(s){let o=[];for(let a=0;a<n;++a)o.push(`${s}quad${a} = null;`);return o.join(`
`)}}function i_(){return`
/**
 * Our implementation of QuadTree is non-recursive to avoid GC hit
 * This data structure represent stack of elements
 * which we are trying to insert into quad tree.
 */
function InsertStack () {
    this.stack = [];
    this.popIdx = 0;
}

InsertStack.prototype = {
    isEmpty: function() {
        return this.popIdx === 0;
    },
    push: function (node, body) {
        var item = this.stack[this.popIdx];
        if (!item) {
            // we are trying to avoid memory pressure: create new element
            // only when absolutely necessary
            this.stack[this.popIdx] = new InsertStackElement(node, body);
        } else {
            item.node = node;
            item.body = body;
        }
        ++this.popIdx;
    },
    pop: function () {
        if (this.popIdx > 0) {
            return this.stack[--this.popIdx];
        }
    },
    reset: function () {
        this.popIdx = 0;
    }
};

function InsertStackElement(node, body) {
    this.node = node; // QuadTree node
    this.body = body; // physical body which needs to be inserted to node
}
`}});var o_=fn((XF,vd)=>{vd.exports=bT;vd.exports.generateFunctionBody=s_;var xT=Br();function bT(e){let t=s_(e);return new Function("bodies","settings","random",t)}function s_(e){let t=xT(e);return`
  var boundingBox = {
    ${t("min_{var}: 0, max_{var}: 0,",{indent:4})}
  };

  return {
    box: boundingBox,

    update: updateBoundingBox,

    reset: resetBoundingBox,

    getBestNewPosition: function (neighbors) {
      var ${t("base_{var} = 0",{join:", "})};

      if (neighbors.length) {
        for (var i = 0; i < neighbors.length; ++i) {
          let neighborPos = neighbors[i].pos;
          ${t("base_{var} += neighborPos.{var};",{indent:10})}
        }

        ${t("base_{var} /= neighbors.length;",{indent:8})}
      } else {
        ${t("base_{var} = (boundingBox.min_{var} + boundingBox.max_{var}) / 2;",{indent:8})}
      }

      var springLength = settings.springLength;
      return {
        ${t("{var}: base_{var} + (random.nextDouble() - 0.5) * springLength,",{indent:8})}
      };
    }
  };

  function updateBoundingBox() {
    var i = bodies.length;
    if (i === 0) return; // No bodies - no borders.

    ${t("var max_{var} = -Infinity;",{indent:4})}
    ${t("var min_{var} = Infinity;",{indent:4})}

    while(i--) {
      // this is O(n), it could be done faster with quadtree, if we check the root node bounds
      var bodyPos = bodies[i].pos;
      ${t("if (bodyPos.{var} < min_{var}) min_{var} = bodyPos.{var};",{indent:6})}
      ${t("if (bodyPos.{var} > max_{var}) max_{var} = bodyPos.{var};",{indent:6})}
    }

    ${t("boundingBox.min_{var} = min_{var};",{indent:4})}
    ${t("boundingBox.max_{var} = max_{var};",{indent:4})}
  }

  function resetBoundingBox() {
    ${t("boundingBox.min_{var} = boundingBox.max_{var} = 0;",{indent:4})}
  }
`}});var c_=fn(($F,yd)=>{var MT=Br();yd.exports=ST;yd.exports.generateCreateDragForceFunctionBody=a_;function ST(e){let t=a_(e);return new Function("options",t)}function a_(e){return`
  if (!Number.isFinite(options.dragCoefficient)) throw new Error('dragCoefficient is not a finite number');

  return {
    update: function(body) {
      ${MT(e)("body.force.{var} -= options.dragCoefficient * body.velocity.{var};",{indent:6})}
    }
  };
`}});var h_=fn((YF,xd)=>{var wT=Br();xd.exports=ET;xd.exports.generateCreateSpringForceFunctionBody=l_;function ET(e){let t=l_(e);return new Function("options","random",t)}function l_(e){let t=wT(e);return`
  if (!Number.isFinite(options.springCoefficient)) throw new Error('Spring coefficient is not a number');
  if (!Number.isFinite(options.springLength)) throw new Error('Spring length is not a number');

  return {
    /**
     * Updates forces acting on a spring
     */
    update: function (spring) {
      var body1 = spring.from;
      var body2 = spring.to;
      var length = spring.length < 0 ? options.springLength : spring.length;
      ${t("var d{var} = body2.pos.{var} - body1.pos.{var};",{indent:6})}
      var r = Math.sqrt(${t("d{var} * d{var}",{join:" + "})});

      if (r === 0) {
        ${t("d{var} = (random.nextDouble() - 0.5) / 50;",{indent:8})}
        r = Math.sqrt(${t("d{var} * d{var}",{join:" + "})});
      }

      var d = r - length;
      var coefficient = ((spring.coefficient > 0) ? spring.coefficient : options.springCoefficient) * d / r;

      ${t("body1.force.{var} += coefficient * d{var}",{indent:6})};
      body1.springCount += 1;
      body1.springLength += r;

      ${t("body2.force.{var} -= coefficient * d{var}",{indent:6})};
      body2.springCount += 1;
      body2.springLength += r;
    }
  };
`}});var f_=fn((ZF,bd)=>{var TT=Br();bd.exports=AT;bd.exports.generateIntegratorFunctionBody=u_;function AT(e){let t=u_(e);return new Function("bodies","timeStep","adaptiveTimeStepWeight",t)}function u_(e){let t=TT(e);return`
  var length = bodies.length;
  if (length === 0) return 0;

  ${t("var d{var} = 0, t{var} = 0;",{indent:2})}

  for (var i = 0; i < length; ++i) {
    var body = bodies[i];
    if (body.isPinned) continue;

    if (adaptiveTimeStepWeight && body.springCount) {
      timeStep = (adaptiveTimeStepWeight * body.springLength/body.springCount);
    }

    var coeff = timeStep / body.mass;

    ${t("body.velocity.{var} += coeff * body.force.{var};",{indent:4})}
    ${t("var v{var} = body.velocity.{var};",{indent:4})}
    var v = Math.sqrt(${t("v{var} * v{var}",{join:" + "})});

    if (v > 1) {
      // We normalize it so that we move within timeStep range. 
      // for the case when v <= 1 - we let velocity to fade out.
      ${t("body.velocity.{var} = v{var} / v;",{indent:6})}
    }

    ${t("d{var} = timeStep * body.velocity.{var};",{indent:4})}

    ${t("body.pos.{var} += d{var};",{indent:4})}

    ${t("t{var} += Math.abs(d{var});",{indent:4})}
  }

  return (${t("t{var} * t{var}",{join:" + "})})/length;
`}});var p_=fn((KF,d_)=>{d_.exports=CT;function CT(e,t,n,i){this.from=e,this.to=t,this.length=n,this.coefficient=i}});var __=fn((JF,g_)=>{g_.exports=m_;function m_(e,t){var n;if(e||(e={}),t){for(n in t)if(t.hasOwnProperty(n)){var i=e.hasOwnProperty(n),r=typeof t[n],s=!i||typeof e[n]!==r;s?e[n]=t[n]:r==="object"&&(e[n]=m_(e[n],t[n]))}}return e}});var Md=fn((QF,v_)=>{"use strict";function RT(e){IT(e);let t=PT(e);return e.on=t.on,e.off=t.off,e.fire=t.fire,e}function PT(e){let t=Object.create(null);return{on:function(n,i,r){if(typeof i!="function")throw new Error("callback is expected to be a function");let s=t[n];return s||(s=t[n]=[]),s.push({callback:i,ctx:r}),e},off:function(n,i){if(typeof n>"u")return t=Object.create(null),e;if(t[n])if(typeof i!="function")delete t[n];else{let r=t[n];for(let s=0;s<r.length;++s)r[s].callback===i&&r.splice(s,1)}return e},fire:function(n){let i=t[n];if(!i)return e;let r;arguments.length>1&&(r=Array.prototype.slice.call(arguments,1));for(let s=0;s<i.length;++s){let o=i[s];o.callback.apply(o.ctx,r)}return e}}}function IT(e){if(!e)throw new Error("Eventify cannot use falsy object as events subject");let t=["on","fire","off"];for(let n=0;n<t.length;++n)if(e.hasOwnProperty(t[n]))throw new Error("Subject cannot be eventified, since it already has property '"+t[n]+"'")}v_.exports=RT});var x_=fn((tU,_h)=>{_h.exports=Sd;_h.exports.random=Sd,_h.exports.randomIterator=NT;function Sd(e){var t=typeof e=="number"?e:+new Date;return new Vr(t)}function Vr(e){this.seed=e}Vr.prototype.next=OT;Vr.prototype.nextDouble=wd;Vr.prototype.uniform=wd;Vr.prototype.gaussian=DT;Vr.prototype.random=wd;function DT(){var e,t,n;do t=this.nextDouble()*2-1,n=this.nextDouble()*2-1,e=t*t+n*n;while(e>=1||e===0);return t*Math.sqrt(-2*Math.log(e)/e)}Vr.prototype.levy=LT;function LT(){var e=1.5,t=Math.pow(y_(1+e)*Math.sin(Math.PI*e/2)/(y_((1+e)/2)*e*Math.pow(2,(e-1)/2)),1/e);return this.gaussian()*t/Math.pow(Math.abs(this.gaussian()),1/e)}function y_(e){return Math.sqrt(2*Math.PI/e)*Math.pow(1/Math.E*(e+1/(12*e-1/(10*e))),e)}function wd(){var e=this.seed;return e=e+2127912214+(e<<12)&4294967295,e=(e^3345072700^e>>>19)&4294967295,e=e+374761393+(e<<5)&4294967295,e=(e+3550635116^e<<9)&4294967295,e=e+4251993797+(e<<3)&4294967295,e=(e^3042594569^e>>>16)&4294967295,this.seed=e,(e&268435455)/268435456}function OT(e){return Math.floor(this.nextDouble()*e)}function NT(e,t){var n=t||Sd();if(typeof n.next!="function")throw new Error("customRandom does not match expected API: next() function is missing");return{forEach:r,shuffle:i};function i(){var s,o,a;for(s=e.length-1;s>0;--s)o=n.next(s+1),a=e[o],e[o]=e[s],e[s]=a;return e}function r(s){var o,a,c;for(o=e.length-1;o>0;--o)a=n.next(o+1),c=e[a],e[a]=e[o],e[o]=c,s(c);e.length&&s(e[0])}}});var Ed=fn((eU,M_)=>{M_.exports=HT;var FT=K0(),UT=r_(),zT=o_(),kT=c_(),BT=h_(),VT=f_(),b_={};function HT(e){var t=p_(),n=__(),i=Md();if(e){if(e.springCoeff!==void 0)throw new Error("springCoeff was renamed to springCoefficient");if(e.dragCoeff!==void 0)throw new Error("dragCoeff was renamed to dragCoefficient")}e=n(e,{springLength:10,springCoefficient:.8,gravity:-12,theta:.8,dragCoefficient:.9,timeStep:.5,adaptiveTimeStepWeight:0,dimensions:2,debug:!1});var r=b_[e.dimensions];if(!r){var s=e.dimensions;r={Body:FT(s,e.debug),createQuadTree:UT(s),createBounds:zT(s),createDragForce:kT(s),createSpringForce:BT(s),integrate:VT(s)},b_[s]=r}var o=r.Body,a=r.createQuadTree,c=r.createBounds,l=r.createDragForce,u=r.createSpringForce,h=r.integrate,d=z=>new o(z),f=x_().random(42),m=[],_=[],g=a(e,f),p=c(m,e,f),b=u(e,f),x=l(e),v=0,M=[],S=new Map,C=0;w("nbody",N),w("spring",k);var P={bodies:m,quadTree:g,springs:_,settings:e,addForce:w,removeForce:R,getForces:V,step:function(){for(var z=0;z<M.length;++z)M[z](C);var G=h(m,e.timeStep,e.adaptiveTimeStepWeight);return C+=1,G},addBody:function(z){if(!z)throw new Error("Body is required");return m.push(z),z},addBodyAt:function(z){if(!z)throw new Error("Body position is required");var G=d(z);return m.push(G),G},removeBody:function(z){if(z){var G=m.indexOf(z);if(!(G<0))return m.splice(G,1),m.length===0&&p.reset(),!0}},addSpring:function(z,G,K,j){if(!z||!G)throw new Error("Cannot add null spring to force simulator");typeof K!="number"&&(K=-1);var at=new t(z,G,K,j>=0?j:-1);return _.push(at),at},getTotalMovement:function(){return v},removeSpring:function(z){if(z){var G=_.indexOf(z);if(G>-1)return _.splice(G,1),!0}},getBestNewBodyPosition:function(z){return p.getBestNewPosition(z)},getBBox:T,getBoundingBox:T,invalidateBBox:function(){console.warn("invalidateBBox() is deprecated, bounds always recomputed on `getBBox()` call")},gravity:function(z){return z!==void 0?(e.gravity=z,g.options({gravity:z}),this):e.gravity},theta:function(z){return z!==void 0?(e.theta=z,g.options({theta:z}),this):e.theta},random:f};return GT(e,P),i(P),P;function T(){return p.update(),p.box}function w(z,G){if(S.has(z))throw new Error("Force "+z+" is already added");S.set(z,G),M.push(G)}function R(z){var G=M.indexOf(S.get(z));G<0||(M.splice(G,1),S.delete(z))}function V(){return S}function N(){if(m.length!==0){g.insertBodies(m);for(var z=m.length;z--;){var G=m[z];G.isPinned||(G.reset(),g.updateBodyForce(G),x.update(G))}}}function k(){for(var z=_.length;z--;)b.update(_[z])}}function GT(e,t){for(var n in e)WT(e,t,n)}function WT(e,t,n){if(e.hasOwnProperty(n)&&typeof t[n]!="function"){var i=Number.isFinite(e[n]);i?t[n]=function(r){if(r!==void 0){if(!Number.isFinite(r))throw new Error("Value of "+n+" should be a valid number.");return e[n]=r,t}return e[n]}:t[n]=function(r){return r!==void 0?(e[n]=r,t):e[n]}}}});var S_=fn((nU,Td)=>{Td.exports=qT;Td.exports.simulator=Ed();var jT=Md();function qT(e,t){if(!e)throw new Error("Graph structure cannot be undefined");var n=t&&t.createSimulator||Ed(),i=n(t);if(Array.isArray(t))throw new Error("Physics settings is expected to be an object");var r=e.version>19?N:V;t&&typeof t.nodeMass=="function"&&(r=t.nodeMass);var s=new Map,o={},a=0,c=i.settings.springTransform||XT;x(),g();var l=!1,u={step:function(){if(a===0)return h(!0),!0;var k=i.step();u.lastMove=k,u.fire("step");var z=k/a,G=z<=.01;return h(G),G},getNodePosition:function(k){return R(k).pos},setNodePosition:function(k){var z=R(k);z.setPosition.apply(z,Array.prototype.slice.call(arguments,1))},getLinkPosition:function(k){var z=o[k];if(z)return{from:z.from.pos,to:z.to.pos}},getGraphRect:function(){return i.getBBox()},forEachBody:d,pinNode:function(k,z){var G=R(k.id);G.isPinned=!!z},isNodePinned:function(k){return R(k.id).isPinned},dispose:function(){e.off("changed",b),u.fire("disposed")},getBody:_,getSpring:m,getForceVectorLength:f,simulator:i,graph:e,lastMove:0};return jT(u),u;function h(k){l!==k&&(l=k,p(k))}function d(k){s.forEach(k)}function f(){var k=0,z=0;return d(function(G){k+=Math.abs(G.force.x),z+=Math.abs(G.force.y)}),Math.sqrt(k*k+z*z)}function m(k,z){var G;if(z===void 0)typeof k!="object"?G=k:G=k.id;else{var K=e.hasLink(k,z);if(!K)return;G=K.id}return o[G]}function _(k){return s.get(k)}function g(){e.on("changed",b)}function p(k){u.fire("stable",k)}function b(k){for(var z=0;z<k.length;++z){var G=k[z];G.changeType==="add"?(G.node&&v(G.node.id),G.link&&S(G.link)):G.changeType==="remove"&&(G.node&&M(G.node),G.link&&C(G.link))}a=e.getNodesCount()}function x(){a=0,e.forEachNode(function(k){v(k.id),a+=1}),e.forEachLink(S)}function v(k){var z=s.get(k);if(!z){var G=e.getNode(k);if(!G)throw new Error("initBody() was called with unknown node id");var K=G.position;if(!K){var j=P(G);K=i.getBestNewBodyPosition(j)}z=i.addBodyAt(K),z.id=k,s.set(k,z),T(k),w(G)&&(z.isPinned=!0)}}function M(k){var z=k.id,G=s.get(z);G&&(s.delete(z),i.removeBody(G))}function S(k){T(k.fromId),T(k.toId);var z=s.get(k.fromId),G=s.get(k.toId),K=i.addSpring(z,G,k.length);c(k,K),o[k.id]=K}function C(k){var z=o[k.id];if(z){var G=e.getNode(k.fromId),K=e.getNode(k.toId);G&&T(G.id),K&&T(K.id),delete o[k.id],i.removeSpring(z)}}function P(k){var z=[];if(!k.links)return z;for(var G=Math.min(k.links.length,2),K=0;K<G;++K){var j=k.links[K],at=j.fromId!==k.id?s.get(j.fromId):s.get(j.toId);at&&at.pos&&z.push(at)}return z}function T(k){var z=s.get(k);if(z.mass=r(k),Number.isNaN(z.mass))throw new Error("Node mass should be a number")}function w(k){return k&&(k.isPinned||k.data&&k.data.isPinned)}function R(k){var z=s.get(k);return z||(v(k),z=s.get(k)),z}function V(k){var z=e.getLinks(k);return z?1+z.length/3:1}function N(k){var z=e.getLinks(k);return z?1+z.size/3:1}}function XT(){}});typeof Object.hasOwn!="function"&&Object.defineProperty(Object,"hasOwn",{value:(e,t)=>Object.prototype.hasOwnProperty.call(e,t),configurable:!0,writable:!0});typeof window.queueMicrotask!="function"&&(window.queueMicrotask=e=>{Promise.resolve().then(e).catch(t=>{window.setTimeout(()=>{throw t},0)})});if(typeof window.AbortController!="function"){class e{constructor(){this.aborted=!1,this.onabort=null}addEventListener(){}removeEventListener(){}}window.AbortController=class{constructor(){this.signal=new e}abort(){this.signal.aborted=!0,typeof this.signal.onabort=="function"&&this.signal.onabort()}}}var Pe={LEFT:0,MIDDLE:1,RIGHT:2,ROTATE:0,DOLLY:1,PAN:2},Un={ROTATE:0,PAN:1,DOLLY_PAN:2,DOLLY_ROTATE:3},Pm=0,mf=1,Im=2;var gf=1,Dm=2,di=3,Pi=0,We=1,pi=2,Qn=0,Er=1,Ji=2,_f=3,vf=4,Lm=5,Yi=100,Om=101,Nm=102,Fm=103,Um=104,zm=200,km=201,Bm=202,Vm=203,Mc=204,Sc=205,Hm=206,Gm=207,Wm=208,jm=209,qm=210,Xm=211,$m=212,Ym=213,Zm=214,il=0,rl=1,sl=2,Tr=3,ol=4,al=5,cl=6,ll=7,hl=0,Km=1,Jm=2,Oi=0,ul=1,fl=2,dl=3,pl=4,ml=5,gl=6,_l=7;var yf=300,Dr=301,Lr=302,vl=303,yl=304,ea=306,wc=1e3,$i=1001,Ec=1002,Ln=1003,Qm=1004;var na=1005;var Kn=1006,xl=1007;var Qi=1008;var ti=1009,xf=1010,bf=1011,Ls=1012,bl=1013,tr=1014,mi=1015,zn=1016,Ml=1017,Sl=1018,Os=1020,Mf=35902,Sf=35899,wf=1021,Ef=1022,kn=1023,vs=1026,Ns=1027,Tf=1028,wl=1029,Af=1030,El=1031;var Tl=1033,ia=33776,ra=33777,sa=33778,oa=33779,Al=35840,Cl=35841,Rl=35842,Pl=35843,Il=36196,Dl=37492,Ll=37496,Ol=37808,Nl=37809,Fl=37810,Ul=37811,zl=37812,kl=37813,Bl=37814,Vl=37815,Hl=37816,Gl=37817,Wl=37818,jl=37819,ql=37820,Xl=37821,$l=36492,Yl=36494,Zl=36495,Kl=36283,Jl=36284,Ql=36285,th=36286;var To=2300,Tc=2301,xc=2302,of=2400,af=2401,cf=2402;var tg=3200,eg=3201;var eh=0,ng=1,Ni="",He="srgb",Ar="srgb-linear",Ao="linear",ae="srgb";var wr=7680;var lf=519,ig=512,rg=513,sg=514,Cf=515,og=516,ag=517,cg=518,lg=519,Ac=35044;var Rf="300 es",Zn=2e3,Co=2001;var ai=class{addEventListener(t,n){this._listeners===void 0&&(this._listeners={});let i=this._listeners;i[t]===void 0&&(i[t]=[]),i[t].indexOf(n)===-1&&i[t].push(n)}hasEventListener(t,n){let i=this._listeners;return i===void 0?!1:i[t]!==void 0&&i[t].indexOf(n)!==-1}removeEventListener(t,n){let i=this._listeners;if(i===void 0)return;let r=i[t];if(r!==void 0){let s=r.indexOf(n);s!==-1&&r.splice(s,1)}}dispatchEvent(t){let n=this._listeners;if(n===void 0)return;let i=n[t.type];if(i!==void 0){t.target=this;let r=i.slice(0);for(let s=0,o=r.length;s<o;s++)r[s].call(this,t);t.target=null}}},Xe=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],Jp=1234567,Mo=Math.PI/180,ys=180/Math.PI;function Ci(){let e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,n=Math.random()*4294967295|0,i=Math.random()*4294967295|0;return(Xe[e&255]+Xe[e>>8&255]+Xe[e>>16&255]+Xe[e>>24&255]+"-"+Xe[t&255]+Xe[t>>8&255]+"-"+Xe[t>>16&15|64]+Xe[t>>24&255]+"-"+Xe[n&63|128]+Xe[n>>8&255]+"-"+Xe[n>>16&255]+Xe[n>>24&255]+Xe[i&255]+Xe[i>>8&255]+Xe[i>>16&255]+Xe[i>>24&255]).toLowerCase()}function Kt(e,t,n){return Math.max(t,Math.min(n,e))}function Pf(e,t){return(e%t+t)%t}function sb(e,t,n,i,r){return i+(e-t)*(r-i)/(n-t)}function ob(e,t,n){return e!==t?(n-e)/(t-e):0}function So(e,t,n){return(1-n)*e+n*t}function ab(e,t,n,i){return So(e,t,1-Math.exp(-n*i))}function cb(e,t=1){return t-Math.abs(Pf(e,t*2)-t)}function lb(e,t,n){return e<=t?0:e>=n?1:(e=(e-t)/(n-t),e*e*(3-2*e))}function hb(e,t,n){return e<=t?0:e>=n?1:(e=(e-t)/(n-t),e*e*e*(e*(e*6-15)+10))}function ub(e,t){return e+Math.floor(Math.random()*(t-e+1))}function fb(e,t){return e+Math.random()*(t-e)}function db(e){return e*(.5-Math.random())}function pb(e){e!==void 0&&(Jp=e);let t=Jp+=1831565813;return t=Math.imul(t^t>>>15,t|1),t^=t+Math.imul(t^t>>>7,t|61),((t^t>>>14)>>>0)/4294967296}function mb(e){return e*Mo}function gb(e){return e*ys}function _b(e){return(e&e-1)===0&&e!==0}function vb(e){return Math.pow(2,Math.ceil(Math.log(e)/Math.LN2))}function yb(e){return Math.pow(2,Math.floor(Math.log(e)/Math.LN2))}function xb(e,t,n,i,r){let s=Math.cos,o=Math.sin,a=s(n/2),c=o(n/2),l=s((t+i)/2),u=o((t+i)/2),h=s((t-i)/2),d=o((t-i)/2),f=s((i-t)/2),m=o((i-t)/2);switch(r){case"XYX":e.set(a*u,c*h,c*d,a*l);break;case"YZY":e.set(c*d,a*u,c*h,a*l);break;case"ZXZ":e.set(c*h,c*d,a*u,a*l);break;case"XZX":e.set(a*u,c*m,c*f,a*l);break;case"YXY":e.set(c*f,a*u,c*m,a*l);break;case"ZYZ":e.set(c*m,c*f,a*u,a*l);break;default:console.warn("THREE.MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+r)}}function Yn(e,t){switch(t.constructor){case Float32Array:return e;case Uint32Array:return e/4294967295;case Uint16Array:return e/65535;case Uint8Array:return e/255;case Int32Array:return Math.max(e/2147483647,-1);case Int16Array:return Math.max(e/32767,-1);case Int8Array:return Math.max(e/127,-1);default:throw new Error("Invalid component type.")}}function fe(e,t){switch(t.constructor){case Float32Array:return e;case Uint32Array:return Math.round(e*4294967295);case Uint16Array:return Math.round(e*65535);case Uint8Array:return Math.round(e*255);case Int32Array:return Math.round(e*2147483647);case Int16Array:return Math.round(e*32767);case Int8Array:return Math.round(e*127);default:throw new Error("Invalid component type.")}}var pe={DEG2RAD:Mo,RAD2DEG:ys,generateUUID:Ci,clamp:Kt,euclideanModulo:Pf,mapLinear:sb,inverseLerp:ob,lerp:So,damp:ab,pingpong:cb,smoothstep:lb,smootherstep:hb,randInt:ub,randFloat:fb,randFloatSpread:db,seededRandom:pb,degToRad:mb,radToDeg:gb,isPowerOfTwo:_b,ceilPowerOfTwo:vb,floorPowerOfTwo:yb,setQuaternionFromProperEuler:xb,normalize:fe,denormalize:Yn},it=class e{constructor(t=0,n=0){e.prototype.isVector2=!0,this.x=t,this.y=n}get width(){return this.x}set width(t){this.x=t}get height(){return this.y}set height(t){this.y=t}set(t,n){return this.x=t,this.y=n,this}setScalar(t){return this.x=t,this.y=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setComponent(t,n){switch(t){case 0:this.x=n;break;case 1:this.y=n;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y)}copy(t){return this.x=t.x,this.y=t.y,this}add(t){return this.x+=t.x,this.y+=t.y,this}addScalar(t){return this.x+=t,this.y+=t,this}addVectors(t,n){return this.x=t.x+n.x,this.y=t.y+n.y,this}addScaledVector(t,n){return this.x+=t.x*n,this.y+=t.y*n,this}sub(t){return this.x-=t.x,this.y-=t.y,this}subScalar(t){return this.x-=t,this.y-=t,this}subVectors(t,n){return this.x=t.x-n.x,this.y=t.y-n.y,this}multiply(t){return this.x*=t.x,this.y*=t.y,this}multiplyScalar(t){return this.x*=t,this.y*=t,this}divide(t){return this.x/=t.x,this.y/=t.y,this}divideScalar(t){return this.multiplyScalar(1/t)}applyMatrix3(t){let n=this.x,i=this.y,r=t.elements;return this.x=r[0]*n+r[3]*i+r[6],this.y=r[1]*n+r[4]*i+r[7],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this}clamp(t,n){return this.x=Kt(this.x,t.x,n.x),this.y=Kt(this.y,t.y,n.y),this}clampScalar(t,n){return this.x=Kt(this.x,t,n),this.y=Kt(this.y,t,n),this}clampLength(t,n){let i=this.length();return this.divideScalar(i||1).multiplyScalar(Kt(i,t,n))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(t){return this.x*t.x+this.y*t.y}cross(t){return this.x*t.y-this.y*t.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(t){let n=Math.sqrt(this.lengthSq()*t.lengthSq());if(n===0)return Math.PI/2;let i=this.dot(t)/n;return Math.acos(Kt(i,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){let n=this.x-t.x,i=this.y-t.y;return n*n+i*i}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,n){return this.x+=(t.x-this.x)*n,this.y+=(t.y-this.y)*n,this}lerpVectors(t,n,i){return this.x=t.x+(n.x-t.x)*i,this.y=t.y+(n.y-t.y)*i,this}equals(t){return t.x===this.x&&t.y===this.y}fromArray(t,n=0){return this.x=t[n],this.y=t[n+1],this}toArray(t=[],n=0){return t[n]=this.x,t[n+1]=this.y,t}fromBufferAttribute(t,n){return this.x=t.getX(n),this.y=t.getY(n),this}rotateAround(t,n){let i=Math.cos(n),r=Math.sin(n),s=this.x-t.x,o=this.y-t.y;return this.x=s*i-o*r+t.x,this.y=s*r+o*i+t.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}},Ne=class{constructor(t=0,n=0,i=0,r=1){this.isQuaternion=!0,this._x=t,this._y=n,this._z=i,this._w=r}static slerpFlat(t,n,i,r,s,o,a){let c=i[r+0],l=i[r+1],u=i[r+2],h=i[r+3],d=s[o+0],f=s[o+1],m=s[o+2],_=s[o+3];if(a===0){t[n+0]=c,t[n+1]=l,t[n+2]=u,t[n+3]=h;return}if(a===1){t[n+0]=d,t[n+1]=f,t[n+2]=m,t[n+3]=_;return}if(h!==_||c!==d||l!==f||u!==m){let g=1-a,p=c*d+l*f+u*m+h*_,b=p>=0?1:-1,x=1-p*p;if(x>Number.EPSILON){let M=Math.sqrt(x),S=Math.atan2(M,p*b);g=Math.sin(g*S)/M,a=Math.sin(a*S)/M}let v=a*b;if(c=c*g+d*v,l=l*g+f*v,u=u*g+m*v,h=h*g+_*v,g===1-a){let M=1/Math.sqrt(c*c+l*l+u*u+h*h);c*=M,l*=M,u*=M,h*=M}}t[n]=c,t[n+1]=l,t[n+2]=u,t[n+3]=h}static multiplyQuaternionsFlat(t,n,i,r,s,o){let a=i[r],c=i[r+1],l=i[r+2],u=i[r+3],h=s[o],d=s[o+1],f=s[o+2],m=s[o+3];return t[n]=a*m+u*h+c*f-l*d,t[n+1]=c*m+u*d+l*h-a*f,t[n+2]=l*m+u*f+a*d-c*h,t[n+3]=u*m-a*h-c*d-l*f,t}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get w(){return this._w}set w(t){this._w=t,this._onChangeCallback()}set(t,n,i,r){return this._x=t,this._y=n,this._z=i,this._w=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(t){return this._x=t.x,this._y=t.y,this._z=t.z,this._w=t.w,this._onChangeCallback(),this}setFromEuler(t,n=!0){let i=t._x,r=t._y,s=t._z,o=t._order,a=Math.cos,c=Math.sin,l=a(i/2),u=a(r/2),h=a(s/2),d=c(i/2),f=c(r/2),m=c(s/2);switch(o){case"XYZ":this._x=d*u*h+l*f*m,this._y=l*f*h-d*u*m,this._z=l*u*m+d*f*h,this._w=l*u*h-d*f*m;break;case"YXZ":this._x=d*u*h+l*f*m,this._y=l*f*h-d*u*m,this._z=l*u*m-d*f*h,this._w=l*u*h+d*f*m;break;case"ZXY":this._x=d*u*h-l*f*m,this._y=l*f*h+d*u*m,this._z=l*u*m+d*f*h,this._w=l*u*h-d*f*m;break;case"ZYX":this._x=d*u*h-l*f*m,this._y=l*f*h+d*u*m,this._z=l*u*m-d*f*h,this._w=l*u*h+d*f*m;break;case"YZX":this._x=d*u*h+l*f*m,this._y=l*f*h+d*u*m,this._z=l*u*m-d*f*h,this._w=l*u*h-d*f*m;break;case"XZY":this._x=d*u*h-l*f*m,this._y=l*f*h-d*u*m,this._z=l*u*m+d*f*h,this._w=l*u*h+d*f*m;break;default:console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: "+o)}return n===!0&&this._onChangeCallback(),this}setFromAxisAngle(t,n){let i=n/2,r=Math.sin(i);return this._x=t.x*r,this._y=t.y*r,this._z=t.z*r,this._w=Math.cos(i),this._onChangeCallback(),this}setFromRotationMatrix(t){let n=t.elements,i=n[0],r=n[4],s=n[8],o=n[1],a=n[5],c=n[9],l=n[2],u=n[6],h=n[10],d=i+a+h;if(d>0){let f=.5/Math.sqrt(d+1);this._w=.25/f,this._x=(u-c)*f,this._y=(s-l)*f,this._z=(o-r)*f}else if(i>a&&i>h){let f=2*Math.sqrt(1+i-a-h);this._w=(u-c)/f,this._x=.25*f,this._y=(r+o)/f,this._z=(s+l)/f}else if(a>h){let f=2*Math.sqrt(1+a-i-h);this._w=(s-l)/f,this._x=(r+o)/f,this._y=.25*f,this._z=(c+u)/f}else{let f=2*Math.sqrt(1+h-i-a);this._w=(o-r)/f,this._x=(s+l)/f,this._y=(c+u)/f,this._z=.25*f}return this._onChangeCallback(),this}setFromUnitVectors(t,n){let i=t.dot(n)+1;return i<1e-8?(i=0,Math.abs(t.x)>Math.abs(t.z)?(this._x=-t.y,this._y=t.x,this._z=0,this._w=i):(this._x=0,this._y=-t.z,this._z=t.y,this._w=i)):(this._x=t.y*n.z-t.z*n.y,this._y=t.z*n.x-t.x*n.z,this._z=t.x*n.y-t.y*n.x,this._w=i),this.normalize()}angleTo(t){return 2*Math.acos(Math.abs(Kt(this.dot(t),-1,1)))}rotateTowards(t,n){let i=this.angleTo(t);if(i===0)return this;let r=Math.min(1,n/i);return this.slerp(t,r),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(t){return this._x*t._x+this._y*t._y+this._z*t._z+this._w*t._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let t=this.length();return t===0?(this._x=0,this._y=0,this._z=0,this._w=1):(t=1/t,this._x=this._x*t,this._y=this._y*t,this._z=this._z*t,this._w=this._w*t),this._onChangeCallback(),this}multiply(t){return this.multiplyQuaternions(this,t)}premultiply(t){return this.multiplyQuaternions(t,this)}multiplyQuaternions(t,n){let i=t._x,r=t._y,s=t._z,o=t._w,a=n._x,c=n._y,l=n._z,u=n._w;return this._x=i*u+o*a+r*l-s*c,this._y=r*u+o*c+s*a-i*l,this._z=s*u+o*l+i*c-r*a,this._w=o*u-i*a-r*c-s*l,this._onChangeCallback(),this}slerp(t,n){if(n===0)return this;if(n===1)return this.copy(t);let i=this._x,r=this._y,s=this._z,o=this._w,a=o*t._w+i*t._x+r*t._y+s*t._z;if(a<0?(this._w=-t._w,this._x=-t._x,this._y=-t._y,this._z=-t._z,a=-a):this.copy(t),a>=1)return this._w=o,this._x=i,this._y=r,this._z=s,this;let c=1-a*a;if(c<=Number.EPSILON){let f=1-n;return this._w=f*o+n*this._w,this._x=f*i+n*this._x,this._y=f*r+n*this._y,this._z=f*s+n*this._z,this.normalize(),this}let l=Math.sqrt(c),u=Math.atan2(l,a),h=Math.sin((1-n)*u)/l,d=Math.sin(n*u)/l;return this._w=o*h+this._w*d,this._x=i*h+this._x*d,this._y=r*h+this._y*d,this._z=s*h+this._z*d,this._onChangeCallback(),this}slerpQuaternions(t,n,i){return this.copy(t).slerp(n,i)}random(){let t=2*Math.PI*Math.random(),n=2*Math.PI*Math.random(),i=Math.random(),r=Math.sqrt(1-i),s=Math.sqrt(i);return this.set(r*Math.sin(t),r*Math.cos(t),s*Math.sin(n),s*Math.cos(n))}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._w===this._w}fromArray(t,n=0){return this._x=t[n],this._y=t[n+1],this._z=t[n+2],this._w=t[n+3],this._onChangeCallback(),this}toArray(t=[],n=0){return t[n]=this._x,t[n+1]=this._y,t[n+2]=this._z,t[n+3]=this._w,t}fromBufferAttribute(t,n){return this._x=t.getX(n),this._y=t.getY(n),this._z=t.getZ(n),this._w=t.getW(n),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}},I=class e{constructor(t=0,n=0,i=0){e.prototype.isVector3=!0,this.x=t,this.y=n,this.z=i}set(t,n,i){return i===void 0&&(i=this.z),this.x=t,this.y=n,this.z=i,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setComponent(t,n){switch(t){case 0:this.x=n;break;case 1:this.y=n;break;case 2:this.z=n;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this}addVectors(t,n){return this.x=t.x+n.x,this.y=t.y+n.y,this.z=t.z+n.z,this}addScaledVector(t,n){return this.x+=t.x*n,this.y+=t.y*n,this.z+=t.z*n,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this}subVectors(t,n){return this.x=t.x-n.x,this.y=t.y-n.y,this.z=t.z-n.z,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this}multiplyVectors(t,n){return this.x=t.x*n.x,this.y=t.y*n.y,this.z=t.z*n.z,this}applyEuler(t){return this.applyQuaternion(Qp.setFromEuler(t))}applyAxisAngle(t,n){return this.applyQuaternion(Qp.setFromAxisAngle(t,n))}applyMatrix3(t){let n=this.x,i=this.y,r=this.z,s=t.elements;return this.x=s[0]*n+s[3]*i+s[6]*r,this.y=s[1]*n+s[4]*i+s[7]*r,this.z=s[2]*n+s[5]*i+s[8]*r,this}applyNormalMatrix(t){return this.applyMatrix3(t).normalize()}applyMatrix4(t){let n=this.x,i=this.y,r=this.z,s=t.elements,o=1/(s[3]*n+s[7]*i+s[11]*r+s[15]);return this.x=(s[0]*n+s[4]*i+s[8]*r+s[12])*o,this.y=(s[1]*n+s[5]*i+s[9]*r+s[13])*o,this.z=(s[2]*n+s[6]*i+s[10]*r+s[14])*o,this}applyQuaternion(t){let n=this.x,i=this.y,r=this.z,s=t.x,o=t.y,a=t.z,c=t.w,l=2*(o*r-a*i),u=2*(a*n-s*r),h=2*(s*i-o*n);return this.x=n+c*l+o*h-a*u,this.y=i+c*u+a*l-s*h,this.z=r+c*h+s*u-o*l,this}project(t){return this.applyMatrix4(t.matrixWorldInverse).applyMatrix4(t.projectionMatrix)}unproject(t){return this.applyMatrix4(t.projectionMatrixInverse).applyMatrix4(t.matrixWorld)}transformDirection(t){let n=this.x,i=this.y,r=this.z,s=t.elements;return this.x=s[0]*n+s[4]*i+s[8]*r,this.y=s[1]*n+s[5]*i+s[9]*r,this.z=s[2]*n+s[6]*i+s[10]*r,this.normalize()}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this}divideScalar(t){return this.multiplyScalar(1/t)}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this}clamp(t,n){return this.x=Kt(this.x,t.x,n.x),this.y=Kt(this.y,t.y,n.y),this.z=Kt(this.z,t.z,n.z),this}clampScalar(t,n){return this.x=Kt(this.x,t,n),this.y=Kt(this.y,t,n),this.z=Kt(this.z,t,n),this}clampLength(t,n){let i=this.length();return this.divideScalar(i||1).multiplyScalar(Kt(i,t,n))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,n){return this.x+=(t.x-this.x)*n,this.y+=(t.y-this.y)*n,this.z+=(t.z-this.z)*n,this}lerpVectors(t,n,i){return this.x=t.x+(n.x-t.x)*i,this.y=t.y+(n.y-t.y)*i,this.z=t.z+(n.z-t.z)*i,this}cross(t){return this.crossVectors(this,t)}crossVectors(t,n){let i=t.x,r=t.y,s=t.z,o=n.x,a=n.y,c=n.z;return this.x=r*c-s*a,this.y=s*o-i*c,this.z=i*a-r*o,this}projectOnVector(t){let n=t.lengthSq();if(n===0)return this.set(0,0,0);let i=t.dot(this)/n;return this.copy(t).multiplyScalar(i)}projectOnPlane(t){return Iu.copy(this).projectOnVector(t),this.sub(Iu)}reflect(t){return this.sub(Iu.copy(t).multiplyScalar(2*this.dot(t)))}angleTo(t){let n=Math.sqrt(this.lengthSq()*t.lengthSq());if(n===0)return Math.PI/2;let i=this.dot(t)/n;return Math.acos(Kt(i,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){let n=this.x-t.x,i=this.y-t.y,r=this.z-t.z;return n*n+i*i+r*r}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)+Math.abs(this.z-t.z)}setFromSpherical(t){return this.setFromSphericalCoords(t.radius,t.phi,t.theta)}setFromSphericalCoords(t,n,i){let r=Math.sin(n)*t;return this.x=r*Math.sin(i),this.y=Math.cos(n)*t,this.z=r*Math.cos(i),this}setFromCylindrical(t){return this.setFromCylindricalCoords(t.radius,t.theta,t.y)}setFromCylindricalCoords(t,n,i){return this.x=t*Math.sin(n),this.y=i,this.z=t*Math.cos(n),this}setFromMatrixPosition(t){let n=t.elements;return this.x=n[12],this.y=n[13],this.z=n[14],this}setFromMatrixScale(t){let n=this.setFromMatrixColumn(t,0).length(),i=this.setFromMatrixColumn(t,1).length(),r=this.setFromMatrixColumn(t,2).length();return this.x=n,this.y=i,this.z=r,this}setFromMatrixColumn(t,n){return this.fromArray(t.elements,n*4)}setFromMatrix3Column(t,n){return this.fromArray(t.elements,n*3)}setFromEuler(t){return this.x=t._x,this.y=t._y,this.z=t._z,this}setFromColor(t){return this.x=t.r,this.y=t.g,this.z=t.b,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z}fromArray(t,n=0){return this.x=t[n],this.y=t[n+1],this.z=t[n+2],this}toArray(t=[],n=0){return t[n]=this.x,t[n+1]=this.y,t[n+2]=this.z,t}fromBufferAttribute(t,n){return this.x=t.getX(n),this.y=t.getY(n),this.z=t.getZ(n),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let t=Math.random()*Math.PI*2,n=Math.random()*2-1,i=Math.sqrt(1-n*n);return this.x=i*Math.cos(t),this.y=n,this.z=i*Math.sin(t),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}},Iu=new I,Qp=new Ne,Xt=class e{constructor(t,n,i,r,s,o,a,c,l){e.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],t!==void 0&&this.set(t,n,i,r,s,o,a,c,l)}set(t,n,i,r,s,o,a,c,l){let u=this.elements;return u[0]=t,u[1]=r,u[2]=a,u[3]=n,u[4]=s,u[5]=c,u[6]=i,u[7]=o,u[8]=l,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(t){let n=this.elements,i=t.elements;return n[0]=i[0],n[1]=i[1],n[2]=i[2],n[3]=i[3],n[4]=i[4],n[5]=i[5],n[6]=i[6],n[7]=i[7],n[8]=i[8],this}extractBasis(t,n,i){return t.setFromMatrix3Column(this,0),n.setFromMatrix3Column(this,1),i.setFromMatrix3Column(this,2),this}setFromMatrix4(t){let n=t.elements;return this.set(n[0],n[4],n[8],n[1],n[5],n[9],n[2],n[6],n[10]),this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,n){let i=t.elements,r=n.elements,s=this.elements,o=i[0],a=i[3],c=i[6],l=i[1],u=i[4],h=i[7],d=i[2],f=i[5],m=i[8],_=r[0],g=r[3],p=r[6],b=r[1],x=r[4],v=r[7],M=r[2],S=r[5],C=r[8];return s[0]=o*_+a*b+c*M,s[3]=o*g+a*x+c*S,s[6]=o*p+a*v+c*C,s[1]=l*_+u*b+h*M,s[4]=l*g+u*x+h*S,s[7]=l*p+u*v+h*C,s[2]=d*_+f*b+m*M,s[5]=d*g+f*x+m*S,s[8]=d*p+f*v+m*C,this}multiplyScalar(t){let n=this.elements;return n[0]*=t,n[3]*=t,n[6]*=t,n[1]*=t,n[4]*=t,n[7]*=t,n[2]*=t,n[5]*=t,n[8]*=t,this}determinant(){let t=this.elements,n=t[0],i=t[1],r=t[2],s=t[3],o=t[4],a=t[5],c=t[6],l=t[7],u=t[8];return n*o*u-n*a*l-i*s*u+i*a*c+r*s*l-r*o*c}invert(){let t=this.elements,n=t[0],i=t[1],r=t[2],s=t[3],o=t[4],a=t[5],c=t[6],l=t[7],u=t[8],h=u*o-a*l,d=a*c-u*s,f=l*s-o*c,m=n*h+i*d+r*f;if(m===0)return this.set(0,0,0,0,0,0,0,0,0);let _=1/m;return t[0]=h*_,t[1]=(r*l-u*i)*_,t[2]=(a*i-r*o)*_,t[3]=d*_,t[4]=(u*n-r*c)*_,t[5]=(r*s-a*n)*_,t[6]=f*_,t[7]=(i*c-l*n)*_,t[8]=(o*n-i*s)*_,this}transpose(){let t,n=this.elements;return t=n[1],n[1]=n[3],n[3]=t,t=n[2],n[2]=n[6],n[6]=t,t=n[5],n[5]=n[7],n[7]=t,this}getNormalMatrix(t){return this.setFromMatrix4(t).invert().transpose()}transposeIntoArray(t){let n=this.elements;return t[0]=n[0],t[1]=n[3],t[2]=n[6],t[3]=n[1],t[4]=n[4],t[5]=n[7],t[6]=n[2],t[7]=n[5],t[8]=n[8],this}setUvTransform(t,n,i,r,s,o,a){let c=Math.cos(s),l=Math.sin(s);return this.set(i*c,i*l,-i*(c*o+l*a)+o+t,-r*l,r*c,-r*(-l*o+c*a)+a+n,0,0,1),this}scale(t,n){return this.premultiply(Du.makeScale(t,n)),this}rotate(t){return this.premultiply(Du.makeRotation(-t)),this}translate(t,n){return this.premultiply(Du.makeTranslation(t,n)),this}makeTranslation(t,n){return t.isVector2?this.set(1,0,t.x,0,1,t.y,0,0,1):this.set(1,0,t,0,1,n,0,0,1),this}makeRotation(t){let n=Math.cos(t),i=Math.sin(t);return this.set(n,-i,0,i,n,0,0,0,1),this}makeScale(t,n){return this.set(t,0,0,0,n,0,0,0,1),this}equals(t){let n=this.elements,i=t.elements;for(let r=0;r<9;r++)if(n[r]!==i[r])return!1;return!0}fromArray(t,n=0){for(let i=0;i<9;i++)this.elements[i]=t[i+n];return this}toArray(t=[],n=0){let i=this.elements;return t[n]=i[0],t[n+1]=i[1],t[n+2]=i[2],t[n+3]=i[3],t[n+4]=i[4],t[n+5]=i[5],t[n+6]=i[6],t[n+7]=i[7],t[n+8]=i[8],t}clone(){return new this.constructor().fromArray(this.elements)}},Du=new Xt;function If(e){for(let t=e.length-1;t>=0;--t)if(e[t]>=65535)return!0;return!1}function xs(e){return document.createElementNS("http://www.w3.org/1999/xhtml",e)}function hg(){let e=xs("canvas");return e.style.display="block",e}var tm={};function bs(e){e in tm||(tm[e]=!0,console.warn(e))}function ug(e,t,n){return new Promise(function(i,r){function s(){switch(e.clientWaitSync(t,e.SYNC_FLUSH_COMMANDS_BIT,0)){case e.WAIT_FAILED:r();break;case e.TIMEOUT_EXPIRED:setTimeout(s,n);break;default:i()}}setTimeout(s,n)})}var em=new Xt().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),nm=new Xt().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function bb(){let e={enabled:!0,workingColorSpace:Ar,spaces:{},convert:function(r,s,o){return this.enabled===!1||s===o||!s||!o||(this.spaces[s].transfer===ae&&(r.r=Ri(r.r),r.g=Ri(r.g),r.b=Ri(r.b)),this.spaces[s].primaries!==this.spaces[o].primaries&&(r.applyMatrix3(this.spaces[s].toXYZ),r.applyMatrix3(this.spaces[o].fromXYZ)),this.spaces[o].transfer===ae&&(r.r=_s(r.r),r.g=_s(r.g),r.b=_s(r.b))),r},workingToColorSpace:function(r,s){return this.convert(r,this.workingColorSpace,s)},colorSpaceToWorking:function(r,s){return this.convert(r,s,this.workingColorSpace)},getPrimaries:function(r){return this.spaces[r].primaries},getTransfer:function(r){return r===Ni?Ao:this.spaces[r].transfer},getToneMappingMode:function(r){return this.spaces[r].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(r,s=this.workingColorSpace){return r.fromArray(this.spaces[s].luminanceCoefficients)},define:function(r){Object.assign(this.spaces,r)},_getMatrix:function(r,s,o){return r.copy(this.spaces[s].toXYZ).multiply(this.spaces[o].fromXYZ)},_getDrawingBufferColorSpace:function(r){return this.spaces[r].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(r=this.workingColorSpace){return this.spaces[r].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(r,s){return bs("THREE.ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),e.workingToColorSpace(r,s)},toWorkingColorSpace:function(r,s){return bs("THREE.ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),e.colorSpaceToWorking(r,s)}},t=[.64,.33,.3,.6,.15,.06],n=[.2126,.7152,.0722],i=[.3127,.329];return e.define({[Ar]:{primaries:t,whitePoint:i,transfer:Ao,toXYZ:em,fromXYZ:nm,luminanceCoefficients:n,workingColorSpaceConfig:{unpackColorSpace:He},outputColorSpaceConfig:{drawingBufferColorSpace:He}},[He]:{primaries:t,whitePoint:i,transfer:ae,toXYZ:em,fromXYZ:nm,luminanceCoefficients:n,outputColorSpaceConfig:{drawingBufferColorSpace:He}}}),e}var ie=bb();function Ri(e){return e<.04045?e*.0773993808:Math.pow(e*.9478672986+.0521327014,2.4)}function _s(e){return e<.0031308?e*12.92:1.055*Math.pow(e,.41666)-.055}var ts,Cc=class{static getDataURL(t,n="image/png"){if(/^data:/i.test(t.src)||typeof HTMLCanvasElement=="undefined")return t.src;let i;if(t instanceof HTMLCanvasElement)i=t;else{ts===void 0&&(ts=xs("canvas")),ts.width=t.width,ts.height=t.height;let r=ts.getContext("2d");t instanceof ImageData?r.putImageData(t,0,0):r.drawImage(t,0,0,t.width,t.height),i=ts}return i.toDataURL(n)}static sRGBToLinear(t){if(typeof HTMLImageElement!="undefined"&&t instanceof HTMLImageElement||typeof HTMLCanvasElement!="undefined"&&t instanceof HTMLCanvasElement||typeof ImageBitmap!="undefined"&&t instanceof ImageBitmap){let n=xs("canvas");n.width=t.width,n.height=t.height;let i=n.getContext("2d");i.drawImage(t,0,0,t.width,t.height);let r=i.getImageData(0,0,t.width,t.height),s=r.data;for(let o=0;o<s.length;o++)s[o]=Ri(s[o]/255)*255;return i.putImageData(r,0,0),n}else if(t.data){let n=t.data.slice(0);for(let i=0;i<n.length;i++)n instanceof Uint8Array||n instanceof Uint8ClampedArray?n[i]=Math.floor(Ri(n[i]/255)*255):n[i]=Ri(n[i]);return{data:n,width:t.width,height:t.height}}else return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),t}},Mb=0,Ms=class{constructor(t=null){this.isSource=!0,Object.defineProperty(this,"id",{value:Mb++}),this.uuid=Ci(),this.data=t,this.dataReady=!0,this.version=0}getSize(t){let n=this.data;return typeof HTMLVideoElement!="undefined"&&n instanceof HTMLVideoElement?t.set(n.videoWidth,n.videoHeight,0):n instanceof VideoFrame?t.set(n.displayHeight,n.displayWidth,0):n!==null?t.set(n.width,n.height,n.depth||0):t.set(0,0,0),t}set needsUpdate(t){t===!0&&this.version++}toJSON(t){let n=t===void 0||typeof t=="string";if(!n&&t.images[this.uuid]!==void 0)return t.images[this.uuid];let i={uuid:this.uuid,url:""},r=this.data;if(r!==null){let s;if(Array.isArray(r)){s=[];for(let o=0,a=r.length;o<a;o++)r[o].isDataTexture?s.push(Lu(r[o].image)):s.push(Lu(r[o]))}else s=Lu(r);i.url=s}return n||(t.images[this.uuid]=i),i}};function Lu(e){return typeof HTMLImageElement!="undefined"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement!="undefined"&&e instanceof HTMLCanvasElement||typeof ImageBitmap!="undefined"&&e instanceof ImageBitmap?Cc.getDataURL(e):e.data?{data:Array.from(e.data),width:e.width,height:e.height,type:e.data.constructor.name}:(console.warn("THREE.Texture: Unable to serialize Texture."),{})}var Sb=0,Ou=new I,an=class e extends ai{constructor(t=e.DEFAULT_IMAGE,n=e.DEFAULT_MAPPING,i=$i,r=$i,s=Kn,o=Qi,a=kn,c=ti,l=e.DEFAULT_ANISOTROPY,u=Ni){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:Sb++}),this.uuid=Ci(),this.name="",this.source=new Ms(t),this.mipmaps=[],this.mapping=n,this.channel=0,this.wrapS=i,this.wrapT=r,this.magFilter=s,this.minFilter=o,this.anisotropy=l,this.format=a,this.internalFormat=null,this.type=c,this.offset=new it(0,0),this.repeat=new it(1,1),this.center=new it(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Xt,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=u,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(t&&t.depth&&t.depth>1),this.pmremVersion=0}get width(){return this.source.getSize(Ou).x}get height(){return this.source.getSize(Ou).y}get depth(){return this.source.getSize(Ou).z}get image(){return this.source.data}set image(t=null){this.source.data=t}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(t,n){this.updateRanges.push({start:t,count:n})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(t){return this.name=t.name,this.source=t.source,this.mipmaps=t.mipmaps.slice(0),this.mapping=t.mapping,this.channel=t.channel,this.wrapS=t.wrapS,this.wrapT=t.wrapT,this.magFilter=t.magFilter,this.minFilter=t.minFilter,this.anisotropy=t.anisotropy,this.format=t.format,this.internalFormat=t.internalFormat,this.type=t.type,this.offset.copy(t.offset),this.repeat.copy(t.repeat),this.center.copy(t.center),this.rotation=t.rotation,this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrix.copy(t.matrix),this.generateMipmaps=t.generateMipmaps,this.premultiplyAlpha=t.premultiplyAlpha,this.flipY=t.flipY,this.unpackAlignment=t.unpackAlignment,this.colorSpace=t.colorSpace,this.renderTarget=t.renderTarget,this.isRenderTargetTexture=t.isRenderTargetTexture,this.isArrayTexture=t.isArrayTexture,this.userData=JSON.parse(JSON.stringify(t.userData)),this.needsUpdate=!0,this}setValues(t){for(let n in t){let i=t[n];if(i===void 0){console.warn(`THREE.Texture.setValues(): parameter '${n}' has value of undefined.`);continue}let r=this[n];if(r===void 0){console.warn(`THREE.Texture.setValues(): property '${n}' does not exist.`);continue}r&&i&&r.isVector2&&i.isVector2||r&&i&&r.isVector3&&i.isVector3||r&&i&&r.isMatrix3&&i.isMatrix3?r.copy(i):this[n]=i}}toJSON(t){let n=t===void 0||typeof t=="string";if(!n&&t.textures[this.uuid]!==void 0)return t.textures[this.uuid];let i={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(t).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(i.userData=this.userData),n||(t.textures[this.uuid]=i),i}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(t){if(this.mapping!==yf)return t;if(t.applyMatrix3(this.matrix),t.x<0||t.x>1)switch(this.wrapS){case wc:t.x=t.x-Math.floor(t.x);break;case $i:t.x=t.x<0?0:1;break;case Ec:Math.abs(Math.floor(t.x)%2)===1?t.x=Math.ceil(t.x)-t.x:t.x=t.x-Math.floor(t.x);break}if(t.y<0||t.y>1)switch(this.wrapT){case wc:t.y=t.y-Math.floor(t.y);break;case $i:t.y=t.y<0?0:1;break;case Ec:Math.abs(Math.floor(t.y)%2)===1?t.y=Math.ceil(t.y)-t.y:t.y=t.y-Math.floor(t.y);break}return this.flipY&&(t.y=1-t.y),t}set needsUpdate(t){t===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(t){t===!0&&this.pmremVersion++}};an.DEFAULT_IMAGE=null;an.DEFAULT_MAPPING=yf;an.DEFAULT_ANISOTROPY=1;var de=class e{constructor(t=0,n=0,i=0,r=1){e.prototype.isVector4=!0,this.x=t,this.y=n,this.z=i,this.w=r}get width(){return this.z}set width(t){this.z=t}get height(){return this.w}set height(t){this.w=t}set(t,n,i,r){return this.x=t,this.y=n,this.z=i,this.w=r,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this.w=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setW(t){return this.w=t,this}setComponent(t,n){switch(t){case 0:this.x=n;break;case 1:this.y=n;break;case 2:this.z=n;break;case 3:this.w=n;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this.w=t.w!==void 0?t.w:1,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this.w+=t.w,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this.w+=t,this}addVectors(t,n){return this.x=t.x+n.x,this.y=t.y+n.y,this.z=t.z+n.z,this.w=t.w+n.w,this}addScaledVector(t,n){return this.x+=t.x*n,this.y+=t.y*n,this.z+=t.z*n,this.w+=t.w*n,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this.w-=t.w,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this.w-=t,this}subVectors(t,n){return this.x=t.x-n.x,this.y=t.y-n.y,this.z=t.z-n.z,this.w=t.w-n.w,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this.w*=t.w,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this.w*=t,this}applyMatrix4(t){let n=this.x,i=this.y,r=this.z,s=this.w,o=t.elements;return this.x=o[0]*n+o[4]*i+o[8]*r+o[12]*s,this.y=o[1]*n+o[5]*i+o[9]*r+o[13]*s,this.z=o[2]*n+o[6]*i+o[10]*r+o[14]*s,this.w=o[3]*n+o[7]*i+o[11]*r+o[15]*s,this}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this.w/=t.w,this}divideScalar(t){return this.multiplyScalar(1/t)}setAxisAngleFromQuaternion(t){this.w=2*Math.acos(t.w);let n=Math.sqrt(1-t.w*t.w);return n<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=t.x/n,this.y=t.y/n,this.z=t.z/n),this}setAxisAngleFromRotationMatrix(t){let n,i,r,s,c=t.elements,l=c[0],u=c[4],h=c[8],d=c[1],f=c[5],m=c[9],_=c[2],g=c[6],p=c[10];if(Math.abs(u-d)<.01&&Math.abs(h-_)<.01&&Math.abs(m-g)<.01){if(Math.abs(u+d)<.1&&Math.abs(h+_)<.1&&Math.abs(m+g)<.1&&Math.abs(l+f+p-3)<.1)return this.set(1,0,0,0),this;n=Math.PI;let x=(l+1)/2,v=(f+1)/2,M=(p+1)/2,S=(u+d)/4,C=(h+_)/4,P=(m+g)/4;return x>v&&x>M?x<.01?(i=0,r=.707106781,s=.707106781):(i=Math.sqrt(x),r=S/i,s=C/i):v>M?v<.01?(i=.707106781,r=0,s=.707106781):(r=Math.sqrt(v),i=S/r,s=P/r):M<.01?(i=.707106781,r=.707106781,s=0):(s=Math.sqrt(M),i=C/s,r=P/s),this.set(i,r,s,n),this}let b=Math.sqrt((g-m)*(g-m)+(h-_)*(h-_)+(d-u)*(d-u));return Math.abs(b)<.001&&(b=1),this.x=(g-m)/b,this.y=(h-_)/b,this.z=(d-u)/b,this.w=Math.acos((l+f+p-1)/2),this}setFromMatrixPosition(t){let n=t.elements;return this.x=n[12],this.y=n[13],this.z=n[14],this.w=n[15],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this.w=Math.min(this.w,t.w),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this.w=Math.max(this.w,t.w),this}clamp(t,n){return this.x=Kt(this.x,t.x,n.x),this.y=Kt(this.y,t.y,n.y),this.z=Kt(this.z,t.z,n.z),this.w=Kt(this.w,t.w,n.w),this}clampScalar(t,n){return this.x=Kt(this.x,t,n),this.y=Kt(this.y,t,n),this.z=Kt(this.z,t,n),this.w=Kt(this.w,t,n),this}clampLength(t,n){let i=this.length();return this.divideScalar(i||1).multiplyScalar(Kt(i,t,n))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z+this.w*t.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,n){return this.x+=(t.x-this.x)*n,this.y+=(t.y-this.y)*n,this.z+=(t.z-this.z)*n,this.w+=(t.w-this.w)*n,this}lerpVectors(t,n,i){return this.x=t.x+(n.x-t.x)*i,this.y=t.y+(n.y-t.y)*i,this.z=t.z+(n.z-t.z)*i,this.w=t.w+(n.w-t.w)*i,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z&&t.w===this.w}fromArray(t,n=0){return this.x=t[n],this.y=t[n+1],this.z=t[n+2],this.w=t[n+3],this}toArray(t=[],n=0){return t[n]=this.x,t[n+1]=this.y,t[n+2]=this.z,t[n+3]=this.w,t}fromBufferAttribute(t,n){return this.x=t.getX(n),this.y=t.getY(n),this.z=t.getZ(n),this.w=t.getW(n),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}},Rc=class extends ai{constructor(t=1,n=1,i={}){super(),i=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:Kn,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1},i),this.isRenderTarget=!0,this.width=t,this.height=n,this.depth=i.depth,this.scissor=new de(0,0,t,n),this.scissorTest=!1,this.viewport=new de(0,0,t,n);let r={width:t,height:n,depth:i.depth},s=new an(r);this.textures=[];let o=i.count;for(let a=0;a<o;a++)this.textures[a]=s.clone(),this.textures[a].isRenderTargetTexture=!0,this.textures[a].renderTarget=this;this._setTextureOptions(i),this.depthBuffer=i.depthBuffer,this.stencilBuffer=i.stencilBuffer,this.resolveDepthBuffer=i.resolveDepthBuffer,this.resolveStencilBuffer=i.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=i.depthTexture,this.samples=i.samples,this.multiview=i.multiview}_setTextureOptions(t={}){let n={minFilter:Kn,generateMipmaps:!1,flipY:!1,internalFormat:null};t.mapping!==void 0&&(n.mapping=t.mapping),t.wrapS!==void 0&&(n.wrapS=t.wrapS),t.wrapT!==void 0&&(n.wrapT=t.wrapT),t.wrapR!==void 0&&(n.wrapR=t.wrapR),t.magFilter!==void 0&&(n.magFilter=t.magFilter),t.minFilter!==void 0&&(n.minFilter=t.minFilter),t.format!==void 0&&(n.format=t.format),t.type!==void 0&&(n.type=t.type),t.anisotropy!==void 0&&(n.anisotropy=t.anisotropy),t.colorSpace!==void 0&&(n.colorSpace=t.colorSpace),t.flipY!==void 0&&(n.flipY=t.flipY),t.generateMipmaps!==void 0&&(n.generateMipmaps=t.generateMipmaps),t.internalFormat!==void 0&&(n.internalFormat=t.internalFormat);for(let i=0;i<this.textures.length;i++)this.textures[i].setValues(n)}get texture(){return this.textures[0]}set texture(t){this.textures[0]=t}set depthTexture(t){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),t!==null&&(t.renderTarget=this),this._depthTexture=t}get depthTexture(){return this._depthTexture}setSize(t,n,i=1){if(this.width!==t||this.height!==n||this.depth!==i){this.width=t,this.height=n,this.depth=i;for(let r=0,s=this.textures.length;r<s;r++)this.textures[r].image.width=t,this.textures[r].image.height=n,this.textures[r].image.depth=i,this.textures[r].isArrayTexture=this.textures[r].image.depth>1;this.dispose()}this.viewport.set(0,0,t,n),this.scissor.set(0,0,t,n)}clone(){return new this.constructor().copy(this)}copy(t){this.width=t.width,this.height=t.height,this.depth=t.depth,this.scissor.copy(t.scissor),this.scissorTest=t.scissorTest,this.viewport.copy(t.viewport),this.textures.length=0;for(let n=0,i=t.textures.length;n<i;n++){this.textures[n]=t.textures[n].clone(),this.textures[n].isRenderTargetTexture=!0,this.textures[n].renderTarget=this;let r=Object.assign({},t.textures[n].image);this.textures[n].source=new Ms(r)}return this.depthBuffer=t.depthBuffer,this.stencilBuffer=t.stencilBuffer,this.resolveDepthBuffer=t.resolveDepthBuffer,this.resolveStencilBuffer=t.resolveStencilBuffer,t.depthTexture!==null&&(this.depthTexture=t.depthTexture.clone()),this.samples=t.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}},Ke=class extends Rc{constructor(t=1,n=1,i={}){super(t,n,i),this.isWebGLRenderTarget=!0}},Ro=class extends an{constructor(t=null,n=1,i=1,r=1){super(null),this.isDataArrayTexture=!0,this.image={data:t,width:n,height:i,depth:r},this.magFilter=Ln,this.minFilter=Ln,this.wrapR=$i,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(t){this.layerUpdates.add(t)}clearLayerUpdates(){this.layerUpdates.clear()}};var Pc=class extends an{constructor(t=null,n=1,i=1,r=1){super(null),this.isData3DTexture=!0,this.image={data:t,width:n,height:i,depth:r},this.magFilter=Ln,this.minFilter=Ln,this.wrapR=$i,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}};var pn=class{constructor(t=new I(1/0,1/0,1/0),n=new I(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=t,this.max=n}set(t,n){return this.min.copy(t),this.max.copy(n),this}setFromArray(t){this.makeEmpty();for(let n=0,i=t.length;n<i;n+=3)this.expandByPoint(qn.fromArray(t,n));return this}setFromBufferAttribute(t){this.makeEmpty();for(let n=0,i=t.count;n<i;n++)this.expandByPoint(qn.fromBufferAttribute(t,n));return this}setFromPoints(t){this.makeEmpty();for(let n=0,i=t.length;n<i;n++)this.expandByPoint(t[n]);return this}setFromCenterAndSize(t,n){let i=qn.copy(n).multiplyScalar(.5);return this.min.copy(t).sub(i),this.max.copy(t).add(i),this}setFromObject(t,n=!1){return this.makeEmpty(),this.expandByObject(t,n)}clone(){return new this.constructor().copy(this)}copy(t){return this.min.copy(t.min),this.max.copy(t.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(t){return this.isEmpty()?t.set(0,0,0):t.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(t){return this.isEmpty()?t.set(0,0,0):t.subVectors(this.max,this.min)}expandByPoint(t){return this.min.min(t),this.max.max(t),this}expandByVector(t){return this.min.sub(t),this.max.add(t),this}expandByScalar(t){return this.min.addScalar(-t),this.max.addScalar(t),this}expandByObject(t,n=!1){t.updateWorldMatrix(!1,!1);let i=t.geometry;if(i!==void 0){let s=i.getAttribute("position");if(n===!0&&s!==void 0&&t.isInstancedMesh!==!0)for(let o=0,a=s.count;o<a;o++)t.isMesh===!0?t.getVertexPosition(o,qn):qn.fromBufferAttribute(s,o),qn.applyMatrix4(t.matrixWorld),this.expandByPoint(qn);else t.boundingBox!==void 0?(t.boundingBox===null&&t.computeBoundingBox(),$a.copy(t.boundingBox)):(i.boundingBox===null&&i.computeBoundingBox(),$a.copy(i.boundingBox)),$a.applyMatrix4(t.matrixWorld),this.union($a)}let r=t.children;for(let s=0,o=r.length;s<o;s++)this.expandByObject(r[s],n);return this}containsPoint(t){return t.x>=this.min.x&&t.x<=this.max.x&&t.y>=this.min.y&&t.y<=this.max.y&&t.z>=this.min.z&&t.z<=this.max.z}containsBox(t){return this.min.x<=t.min.x&&t.max.x<=this.max.x&&this.min.y<=t.min.y&&t.max.y<=this.max.y&&this.min.z<=t.min.z&&t.max.z<=this.max.z}getParameter(t,n){return n.set((t.x-this.min.x)/(this.max.x-this.min.x),(t.y-this.min.y)/(this.max.y-this.min.y),(t.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(t){return t.max.x>=this.min.x&&t.min.x<=this.max.x&&t.max.y>=this.min.y&&t.min.y<=this.max.y&&t.max.z>=this.min.z&&t.min.z<=this.max.z}intersectsSphere(t){return this.clampPoint(t.center,qn),qn.distanceToSquared(t.center)<=t.radius*t.radius}intersectsPlane(t){let n,i;return t.normal.x>0?(n=t.normal.x*this.min.x,i=t.normal.x*this.max.x):(n=t.normal.x*this.max.x,i=t.normal.x*this.min.x),t.normal.y>0?(n+=t.normal.y*this.min.y,i+=t.normal.y*this.max.y):(n+=t.normal.y*this.max.y,i+=t.normal.y*this.min.y),t.normal.z>0?(n+=t.normal.z*this.min.z,i+=t.normal.z*this.max.z):(n+=t.normal.z*this.max.z,i+=t.normal.z*this.min.z),n<=-t.constant&&i>=-t.constant}intersectsTriangle(t){if(this.isEmpty())return!1;this.getCenter(fo),Ya.subVectors(this.max,fo),es.subVectors(t.a,fo),ns.subVectors(t.b,fo),is.subVectors(t.c,fo),Hi.subVectors(ns,es),Gi.subVectors(is,ns),xr.subVectors(es,is);let n=[0,-Hi.z,Hi.y,0,-Gi.z,Gi.y,0,-xr.z,xr.y,Hi.z,0,-Hi.x,Gi.z,0,-Gi.x,xr.z,0,-xr.x,-Hi.y,Hi.x,0,-Gi.y,Gi.x,0,-xr.y,xr.x,0];return!Nu(n,es,ns,is,Ya)||(n=[1,0,0,0,1,0,0,0,1],!Nu(n,es,ns,is,Ya))?!1:(Za.crossVectors(Hi,Gi),n=[Za.x,Za.y,Za.z],Nu(n,es,ns,is,Ya))}clampPoint(t,n){return n.copy(t).clamp(this.min,this.max)}distanceToPoint(t){return this.clampPoint(t,qn).distanceTo(t)}getBoundingSphere(t){return this.isEmpty()?t.makeEmpty():(this.getCenter(t.center),t.radius=this.getSize(qn).length()*.5),t}intersect(t){return this.min.max(t.min),this.max.min(t.max),this.isEmpty()&&this.makeEmpty(),this}union(t){return this.min.min(t.min),this.max.max(t.max),this}applyMatrix4(t){return this.isEmpty()?this:(Mi[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(t),Mi[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(t),Mi[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(t),Mi[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(t),Mi[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(t),Mi[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(t),Mi[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(t),Mi[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(t),this.setFromPoints(Mi),this)}translate(t){return this.min.add(t),this.max.add(t),this}equals(t){return t.min.equals(this.min)&&t.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(t){return this.min.fromArray(t.min),this.max.fromArray(t.max),this}},Mi=[new I,new I,new I,new I,new I,new I,new I,new I],qn=new I,$a=new pn,es=new I,ns=new I,is=new I,Hi=new I,Gi=new I,xr=new I,fo=new I,Ya=new I,Za=new I,br=new I;function Nu(e,t,n,i,r){for(let s=0,o=e.length-3;s<=o;s+=3){br.fromArray(e,s);let a=r.x*Math.abs(br.x)+r.y*Math.abs(br.y)+r.z*Math.abs(br.z),c=t.dot(br),l=n.dot(br),u=i.dot(br);if(Math.max(-Math.max(c,l,u),Math.min(c,l,u))>a)return!1}return!0}var wb=new pn,po=new I,Fu=new I,ci=class{constructor(t=new I,n=-1){this.isSphere=!0,this.center=t,this.radius=n}set(t,n){return this.center.copy(t),this.radius=n,this}setFromPoints(t,n){let i=this.center;n!==void 0?i.copy(n):wb.setFromPoints(t).getCenter(i);let r=0;for(let s=0,o=t.length;s<o;s++)r=Math.max(r,i.distanceToSquared(t[s]));return this.radius=Math.sqrt(r),this}copy(t){return this.center.copy(t.center),this.radius=t.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(t){return t.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(t){return t.distanceTo(this.center)-this.radius}intersectsSphere(t){let n=this.radius+t.radius;return t.center.distanceToSquared(this.center)<=n*n}intersectsBox(t){return t.intersectsSphere(this)}intersectsPlane(t){return Math.abs(t.distanceToPoint(this.center))<=this.radius}clampPoint(t,n){let i=this.center.distanceToSquared(t);return n.copy(t),i>this.radius*this.radius&&(n.sub(this.center).normalize(),n.multiplyScalar(this.radius).add(this.center)),n}getBoundingBox(t){return this.isEmpty()?(t.makeEmpty(),t):(t.set(this.center,this.center),t.expandByScalar(this.radius),t)}applyMatrix4(t){return this.center.applyMatrix4(t),this.radius=this.radius*t.getMaxScaleOnAxis(),this}translate(t){return this.center.add(t),this}expandByPoint(t){if(this.isEmpty())return this.center.copy(t),this.radius=0,this;po.subVectors(t,this.center);let n=po.lengthSq();if(n>this.radius*this.radius){let i=Math.sqrt(n),r=(i-this.radius)*.5;this.center.addScaledVector(po,r/i),this.radius+=r}return this}union(t){return t.isEmpty()?this:this.isEmpty()?(this.copy(t),this):(this.center.equals(t.center)===!0?this.radius=Math.max(this.radius,t.radius):(Fu.subVectors(t.center,this.center).setLength(t.radius),this.expandByPoint(po.copy(t.center).add(Fu)),this.expandByPoint(po.copy(t.center).sub(Fu))),this)}equals(t){return t.center.equals(this.center)&&t.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(t){return this.radius=t.radius,this.center.fromArray(t.center),this}},Si=new I,Uu=new I,Ka=new I,Wi=new I,zu=new I,Ja=new I,ku=new I,Ii=class{constructor(t=new I,n=new I(0,0,-1)){this.origin=t,this.direction=n}set(t,n){return this.origin.copy(t),this.direction.copy(n),this}copy(t){return this.origin.copy(t.origin),this.direction.copy(t.direction),this}at(t,n){return n.copy(this.origin).addScaledVector(this.direction,t)}lookAt(t){return this.direction.copy(t).sub(this.origin).normalize(),this}recast(t){return this.origin.copy(this.at(t,Si)),this}closestPointToPoint(t,n){n.subVectors(t,this.origin);let i=n.dot(this.direction);return i<0?n.copy(this.origin):n.copy(this.origin).addScaledVector(this.direction,i)}distanceToPoint(t){return Math.sqrt(this.distanceSqToPoint(t))}distanceSqToPoint(t){let n=Si.subVectors(t,this.origin).dot(this.direction);return n<0?this.origin.distanceToSquared(t):(Si.copy(this.origin).addScaledVector(this.direction,n),Si.distanceToSquared(t))}distanceSqToSegment(t,n,i,r){Uu.copy(t).add(n).multiplyScalar(.5),Ka.copy(n).sub(t).normalize(),Wi.copy(this.origin).sub(Uu);let s=t.distanceTo(n)*.5,o=-this.direction.dot(Ka),a=Wi.dot(this.direction),c=-Wi.dot(Ka),l=Wi.lengthSq(),u=Math.abs(1-o*o),h,d,f,m;if(u>0)if(h=o*c-a,d=o*a-c,m=s*u,h>=0)if(d>=-m)if(d<=m){let _=1/u;h*=_,d*=_,f=h*(h+o*d+2*a)+d*(o*h+d+2*c)+l}else d=s,h=Math.max(0,-(o*d+a)),f=-h*h+d*(d+2*c)+l;else d=-s,h=Math.max(0,-(o*d+a)),f=-h*h+d*(d+2*c)+l;else d<=-m?(h=Math.max(0,-(-o*s+a)),d=h>0?-s:Math.min(Math.max(-s,-c),s),f=-h*h+d*(d+2*c)+l):d<=m?(h=0,d=Math.min(Math.max(-s,-c),s),f=d*(d+2*c)+l):(h=Math.max(0,-(o*s+a)),d=h>0?s:Math.min(Math.max(-s,-c),s),f=-h*h+d*(d+2*c)+l);else d=o>0?-s:s,h=Math.max(0,-(o*d+a)),f=-h*h+d*(d+2*c)+l;return i&&i.copy(this.origin).addScaledVector(this.direction,h),r&&r.copy(Uu).addScaledVector(Ka,d),f}intersectSphere(t,n){Si.subVectors(t.center,this.origin);let i=Si.dot(this.direction),r=Si.dot(Si)-i*i,s=t.radius*t.radius;if(r>s)return null;let o=Math.sqrt(s-r),a=i-o,c=i+o;return c<0?null:a<0?this.at(c,n):this.at(a,n)}intersectsSphere(t){return t.radius<0?!1:this.distanceSqToPoint(t.center)<=t.radius*t.radius}distanceToPlane(t){let n=t.normal.dot(this.direction);if(n===0)return t.distanceToPoint(this.origin)===0?0:null;let i=-(this.origin.dot(t.normal)+t.constant)/n;return i>=0?i:null}intersectPlane(t,n){let i=this.distanceToPlane(t);return i===null?null:this.at(i,n)}intersectsPlane(t){let n=t.distanceToPoint(this.origin);return n===0||t.normal.dot(this.direction)*n<0}intersectBox(t,n){let i,r,s,o,a,c,l=1/this.direction.x,u=1/this.direction.y,h=1/this.direction.z,d=this.origin;return l>=0?(i=(t.min.x-d.x)*l,r=(t.max.x-d.x)*l):(i=(t.max.x-d.x)*l,r=(t.min.x-d.x)*l),u>=0?(s=(t.min.y-d.y)*u,o=(t.max.y-d.y)*u):(s=(t.max.y-d.y)*u,o=(t.min.y-d.y)*u),i>o||s>r||((s>i||isNaN(i))&&(i=s),(o<r||isNaN(r))&&(r=o),h>=0?(a=(t.min.z-d.z)*h,c=(t.max.z-d.z)*h):(a=(t.max.z-d.z)*h,c=(t.min.z-d.z)*h),i>c||a>r)||((a>i||i!==i)&&(i=a),(c<r||r!==r)&&(r=c),r<0)?null:this.at(i>=0?i:r,n)}intersectsBox(t){return this.intersectBox(t,Si)!==null}intersectTriangle(t,n,i,r,s){zu.subVectors(n,t),Ja.subVectors(i,t),ku.crossVectors(zu,Ja);let o=this.direction.dot(ku),a;if(o>0){if(r)return null;a=1}else if(o<0)a=-1,o=-o;else return null;Wi.subVectors(this.origin,t);let c=a*this.direction.dot(Ja.crossVectors(Wi,Ja));if(c<0)return null;let l=a*this.direction.dot(zu.cross(Wi));if(l<0||c+l>o)return null;let u=-a*Wi.dot(ku);return u<0?null:this.at(u/o,s)}applyMatrix4(t){return this.origin.applyMatrix4(t),this.direction.transformDirection(t),this}equals(t){return t.origin.equals(this.origin)&&t.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}},Vt=class e{constructor(t,n,i,r,s,o,a,c,l,u,h,d,f,m,_,g){e.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],t!==void 0&&this.set(t,n,i,r,s,o,a,c,l,u,h,d,f,m,_,g)}set(t,n,i,r,s,o,a,c,l,u,h,d,f,m,_,g){let p=this.elements;return p[0]=t,p[4]=n,p[8]=i,p[12]=r,p[1]=s,p[5]=o,p[9]=a,p[13]=c,p[2]=l,p[6]=u,p[10]=h,p[14]=d,p[3]=f,p[7]=m,p[11]=_,p[15]=g,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new e().fromArray(this.elements)}copy(t){let n=this.elements,i=t.elements;return n[0]=i[0],n[1]=i[1],n[2]=i[2],n[3]=i[3],n[4]=i[4],n[5]=i[5],n[6]=i[6],n[7]=i[7],n[8]=i[8],n[9]=i[9],n[10]=i[10],n[11]=i[11],n[12]=i[12],n[13]=i[13],n[14]=i[14],n[15]=i[15],this}copyPosition(t){let n=this.elements,i=t.elements;return n[12]=i[12],n[13]=i[13],n[14]=i[14],this}setFromMatrix3(t){let n=t.elements;return this.set(n[0],n[3],n[6],0,n[1],n[4],n[7],0,n[2],n[5],n[8],0,0,0,0,1),this}extractBasis(t,n,i){return t.setFromMatrixColumn(this,0),n.setFromMatrixColumn(this,1),i.setFromMatrixColumn(this,2),this}makeBasis(t,n,i){return this.set(t.x,n.x,i.x,0,t.y,n.y,i.y,0,t.z,n.z,i.z,0,0,0,0,1),this}extractRotation(t){let n=this.elements,i=t.elements,r=1/rs.setFromMatrixColumn(t,0).length(),s=1/rs.setFromMatrixColumn(t,1).length(),o=1/rs.setFromMatrixColumn(t,2).length();return n[0]=i[0]*r,n[1]=i[1]*r,n[2]=i[2]*r,n[3]=0,n[4]=i[4]*s,n[5]=i[5]*s,n[6]=i[6]*s,n[7]=0,n[8]=i[8]*o,n[9]=i[9]*o,n[10]=i[10]*o,n[11]=0,n[12]=0,n[13]=0,n[14]=0,n[15]=1,this}makeRotationFromEuler(t){let n=this.elements,i=t.x,r=t.y,s=t.z,o=Math.cos(i),a=Math.sin(i),c=Math.cos(r),l=Math.sin(r),u=Math.cos(s),h=Math.sin(s);if(t.order==="XYZ"){let d=o*u,f=o*h,m=a*u,_=a*h;n[0]=c*u,n[4]=-c*h,n[8]=l,n[1]=f+m*l,n[5]=d-_*l,n[9]=-a*c,n[2]=_-d*l,n[6]=m+f*l,n[10]=o*c}else if(t.order==="YXZ"){let d=c*u,f=c*h,m=l*u,_=l*h;n[0]=d+_*a,n[4]=m*a-f,n[8]=o*l,n[1]=o*h,n[5]=o*u,n[9]=-a,n[2]=f*a-m,n[6]=_+d*a,n[10]=o*c}else if(t.order==="ZXY"){let d=c*u,f=c*h,m=l*u,_=l*h;n[0]=d-_*a,n[4]=-o*h,n[8]=m+f*a,n[1]=f+m*a,n[5]=o*u,n[9]=_-d*a,n[2]=-o*l,n[6]=a,n[10]=o*c}else if(t.order==="ZYX"){let d=o*u,f=o*h,m=a*u,_=a*h;n[0]=c*u,n[4]=m*l-f,n[8]=d*l+_,n[1]=c*h,n[5]=_*l+d,n[9]=f*l-m,n[2]=-l,n[6]=a*c,n[10]=o*c}else if(t.order==="YZX"){let d=o*c,f=o*l,m=a*c,_=a*l;n[0]=c*u,n[4]=_-d*h,n[8]=m*h+f,n[1]=h,n[5]=o*u,n[9]=-a*u,n[2]=-l*u,n[6]=f*h+m,n[10]=d-_*h}else if(t.order==="XZY"){let d=o*c,f=o*l,m=a*c,_=a*l;n[0]=c*u,n[4]=-h,n[8]=l*u,n[1]=d*h+_,n[5]=o*u,n[9]=f*h-m,n[2]=m*h-f,n[6]=a*u,n[10]=_*h+d}return n[3]=0,n[7]=0,n[11]=0,n[12]=0,n[13]=0,n[14]=0,n[15]=1,this}makeRotationFromQuaternion(t){return this.compose(Eb,t,Tb)}lookAt(t,n,i){let r=this.elements;return xn.subVectors(t,n),xn.lengthSq()===0&&(xn.z=1),xn.normalize(),ji.crossVectors(i,xn),ji.lengthSq()===0&&(Math.abs(i.z)===1?xn.x+=1e-4:xn.z+=1e-4,xn.normalize(),ji.crossVectors(i,xn)),ji.normalize(),Qa.crossVectors(xn,ji),r[0]=ji.x,r[4]=Qa.x,r[8]=xn.x,r[1]=ji.y,r[5]=Qa.y,r[9]=xn.y,r[2]=ji.z,r[6]=Qa.z,r[10]=xn.z,this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,n){let i=t.elements,r=n.elements,s=this.elements,o=i[0],a=i[4],c=i[8],l=i[12],u=i[1],h=i[5],d=i[9],f=i[13],m=i[2],_=i[6],g=i[10],p=i[14],b=i[3],x=i[7],v=i[11],M=i[15],S=r[0],C=r[4],P=r[8],T=r[12],w=r[1],R=r[5],V=r[9],N=r[13],k=r[2],z=r[6],G=r[10],K=r[14],j=r[3],at=r[7],_t=r[11],$=r[15];return s[0]=o*S+a*w+c*k+l*j,s[4]=o*C+a*R+c*z+l*at,s[8]=o*P+a*V+c*G+l*_t,s[12]=o*T+a*N+c*K+l*$,s[1]=u*S+h*w+d*k+f*j,s[5]=u*C+h*R+d*z+f*at,s[9]=u*P+h*V+d*G+f*_t,s[13]=u*T+h*N+d*K+f*$,s[2]=m*S+_*w+g*k+p*j,s[6]=m*C+_*R+g*z+p*at,s[10]=m*P+_*V+g*G+p*_t,s[14]=m*T+_*N+g*K+p*$,s[3]=b*S+x*w+v*k+M*j,s[7]=b*C+x*R+v*z+M*at,s[11]=b*P+x*V+v*G+M*_t,s[15]=b*T+x*N+v*K+M*$,this}multiplyScalar(t){let n=this.elements;return n[0]*=t,n[4]*=t,n[8]*=t,n[12]*=t,n[1]*=t,n[5]*=t,n[9]*=t,n[13]*=t,n[2]*=t,n[6]*=t,n[10]*=t,n[14]*=t,n[3]*=t,n[7]*=t,n[11]*=t,n[15]*=t,this}determinant(){let t=this.elements,n=t[0],i=t[4],r=t[8],s=t[12],o=t[1],a=t[5],c=t[9],l=t[13],u=t[2],h=t[6],d=t[10],f=t[14],m=t[3],_=t[7],g=t[11],p=t[15];return m*(+s*c*h-r*l*h-s*a*d+i*l*d+r*a*f-i*c*f)+_*(+n*c*f-n*l*d+s*o*d-r*o*f+r*l*u-s*c*u)+g*(+n*l*h-n*a*f-s*o*h+i*o*f+s*a*u-i*l*u)+p*(-r*a*u-n*c*h+n*a*d+r*o*h-i*o*d+i*c*u)}transpose(){let t=this.elements,n;return n=t[1],t[1]=t[4],t[4]=n,n=t[2],t[2]=t[8],t[8]=n,n=t[6],t[6]=t[9],t[9]=n,n=t[3],t[3]=t[12],t[12]=n,n=t[7],t[7]=t[13],t[13]=n,n=t[11],t[11]=t[14],t[14]=n,this}setPosition(t,n,i){let r=this.elements;return t.isVector3?(r[12]=t.x,r[13]=t.y,r[14]=t.z):(r[12]=t,r[13]=n,r[14]=i),this}invert(){let t=this.elements,n=t[0],i=t[1],r=t[2],s=t[3],o=t[4],a=t[5],c=t[6],l=t[7],u=t[8],h=t[9],d=t[10],f=t[11],m=t[12],_=t[13],g=t[14],p=t[15],b=h*g*l-_*d*l+_*c*f-a*g*f-h*c*p+a*d*p,x=m*d*l-u*g*l-m*c*f+o*g*f+u*c*p-o*d*p,v=u*_*l-m*h*l+m*a*f-o*_*f-u*a*p+o*h*p,M=m*h*c-u*_*c-m*a*d+o*_*d+u*a*g-o*h*g,S=n*b+i*x+r*v+s*M;if(S===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let C=1/S;return t[0]=b*C,t[1]=(_*d*s-h*g*s-_*r*f+i*g*f+h*r*p-i*d*p)*C,t[2]=(a*g*s-_*c*s+_*r*l-i*g*l-a*r*p+i*c*p)*C,t[3]=(h*c*s-a*d*s-h*r*l+i*d*l+a*r*f-i*c*f)*C,t[4]=x*C,t[5]=(u*g*s-m*d*s+m*r*f-n*g*f-u*r*p+n*d*p)*C,t[6]=(m*c*s-o*g*s-m*r*l+n*g*l+o*r*p-n*c*p)*C,t[7]=(o*d*s-u*c*s+u*r*l-n*d*l-o*r*f+n*c*f)*C,t[8]=v*C,t[9]=(m*h*s-u*_*s-m*i*f+n*_*f+u*i*p-n*h*p)*C,t[10]=(o*_*s-m*a*s+m*i*l-n*_*l-o*i*p+n*a*p)*C,t[11]=(u*a*s-o*h*s-u*i*l+n*h*l+o*i*f-n*a*f)*C,t[12]=M*C,t[13]=(u*_*r-m*h*r+m*i*d-n*_*d-u*i*g+n*h*g)*C,t[14]=(m*a*r-o*_*r-m*i*c+n*_*c+o*i*g-n*a*g)*C,t[15]=(o*h*r-u*a*r+u*i*c-n*h*c-o*i*d+n*a*d)*C,this}scale(t){let n=this.elements,i=t.x,r=t.y,s=t.z;return n[0]*=i,n[4]*=r,n[8]*=s,n[1]*=i,n[5]*=r,n[9]*=s,n[2]*=i,n[6]*=r,n[10]*=s,n[3]*=i,n[7]*=r,n[11]*=s,this}getMaxScaleOnAxis(){let t=this.elements,n=t[0]*t[0]+t[1]*t[1]+t[2]*t[2],i=t[4]*t[4]+t[5]*t[5]+t[6]*t[6],r=t[8]*t[8]+t[9]*t[9]+t[10]*t[10];return Math.sqrt(Math.max(n,i,r))}makeTranslation(t,n,i){return t.isVector3?this.set(1,0,0,t.x,0,1,0,t.y,0,0,1,t.z,0,0,0,1):this.set(1,0,0,t,0,1,0,n,0,0,1,i,0,0,0,1),this}makeRotationX(t){let n=Math.cos(t),i=Math.sin(t);return this.set(1,0,0,0,0,n,-i,0,0,i,n,0,0,0,0,1),this}makeRotationY(t){let n=Math.cos(t),i=Math.sin(t);return this.set(n,0,i,0,0,1,0,0,-i,0,n,0,0,0,0,1),this}makeRotationZ(t){let n=Math.cos(t),i=Math.sin(t);return this.set(n,-i,0,0,i,n,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(t,n){let i=Math.cos(n),r=Math.sin(n),s=1-i,o=t.x,a=t.y,c=t.z,l=s*o,u=s*a;return this.set(l*o+i,l*a-r*c,l*c+r*a,0,l*a+r*c,u*a+i,u*c-r*o,0,l*c-r*a,u*c+r*o,s*c*c+i,0,0,0,0,1),this}makeScale(t,n,i){return this.set(t,0,0,0,0,n,0,0,0,0,i,0,0,0,0,1),this}makeShear(t,n,i,r,s,o){return this.set(1,i,s,0,t,1,o,0,n,r,1,0,0,0,0,1),this}compose(t,n,i){let r=this.elements,s=n._x,o=n._y,a=n._z,c=n._w,l=s+s,u=o+o,h=a+a,d=s*l,f=s*u,m=s*h,_=o*u,g=o*h,p=a*h,b=c*l,x=c*u,v=c*h,M=i.x,S=i.y,C=i.z;return r[0]=(1-(_+p))*M,r[1]=(f+v)*M,r[2]=(m-x)*M,r[3]=0,r[4]=(f-v)*S,r[5]=(1-(d+p))*S,r[6]=(g+b)*S,r[7]=0,r[8]=(m+x)*C,r[9]=(g-b)*C,r[10]=(1-(d+_))*C,r[11]=0,r[12]=t.x,r[13]=t.y,r[14]=t.z,r[15]=1,this}decompose(t,n,i){let r=this.elements,s=rs.set(r[0],r[1],r[2]).length(),o=rs.set(r[4],r[5],r[6]).length(),a=rs.set(r[8],r[9],r[10]).length();this.determinant()<0&&(s=-s),t.x=r[12],t.y=r[13],t.z=r[14],Xn.copy(this);let l=1/s,u=1/o,h=1/a;return Xn.elements[0]*=l,Xn.elements[1]*=l,Xn.elements[2]*=l,Xn.elements[4]*=u,Xn.elements[5]*=u,Xn.elements[6]*=u,Xn.elements[8]*=h,Xn.elements[9]*=h,Xn.elements[10]*=h,n.setFromRotationMatrix(Xn),i.x=s,i.y=o,i.z=a,this}makePerspective(t,n,i,r,s,o,a=Zn,c=!1){let l=this.elements,u=2*s/(n-t),h=2*s/(i-r),d=(n+t)/(n-t),f=(i+r)/(i-r),m,_;if(c)m=s/(o-s),_=o*s/(o-s);else if(a===Zn)m=-(o+s)/(o-s),_=-2*o*s/(o-s);else if(a===Co)m=-o/(o-s),_=-o*s/(o-s);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+a);return l[0]=u,l[4]=0,l[8]=d,l[12]=0,l[1]=0,l[5]=h,l[9]=f,l[13]=0,l[2]=0,l[6]=0,l[10]=m,l[14]=_,l[3]=0,l[7]=0,l[11]=-1,l[15]=0,this}makeOrthographic(t,n,i,r,s,o,a=Zn,c=!1){let l=this.elements,u=2/(n-t),h=2/(i-r),d=-(n+t)/(n-t),f=-(i+r)/(i-r),m,_;if(c)m=1/(o-s),_=o/(o-s);else if(a===Zn)m=-2/(o-s),_=-(o+s)/(o-s);else if(a===Co)m=-1/(o-s),_=-s/(o-s);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+a);return l[0]=u,l[4]=0,l[8]=0,l[12]=d,l[1]=0,l[5]=h,l[9]=0,l[13]=f,l[2]=0,l[6]=0,l[10]=m,l[14]=_,l[3]=0,l[7]=0,l[11]=0,l[15]=1,this}equals(t){let n=this.elements,i=t.elements;for(let r=0;r<16;r++)if(n[r]!==i[r])return!1;return!0}fromArray(t,n=0){for(let i=0;i<16;i++)this.elements[i]=t[i+n];return this}toArray(t=[],n=0){let i=this.elements;return t[n]=i[0],t[n+1]=i[1],t[n+2]=i[2],t[n+3]=i[3],t[n+4]=i[4],t[n+5]=i[5],t[n+6]=i[6],t[n+7]=i[7],t[n+8]=i[8],t[n+9]=i[9],t[n+10]=i[10],t[n+11]=i[11],t[n+12]=i[12],t[n+13]=i[13],t[n+14]=i[14],t[n+15]=i[15],t}},rs=new I,Xn=new Vt,Eb=new I(0,0,0),Tb=new I(1,1,1),ji=new I,Qa=new I,xn=new I,im=new Vt,rm=new Ne,On=class e{constructor(t=0,n=0,i=0,r=e.DEFAULT_ORDER){this.isEuler=!0,this._x=t,this._y=n,this._z=i,this._order=r}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get order(){return this._order}set order(t){this._order=t,this._onChangeCallback()}set(t,n,i,r=this._order){return this._x=t,this._y=n,this._z=i,this._order=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(t){return this._x=t._x,this._y=t._y,this._z=t._z,this._order=t._order,this._onChangeCallback(),this}setFromRotationMatrix(t,n=this._order,i=!0){let r=t.elements,s=r[0],o=r[4],a=r[8],c=r[1],l=r[5],u=r[9],h=r[2],d=r[6],f=r[10];switch(n){case"XYZ":this._y=Math.asin(Kt(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(-u,f),this._z=Math.atan2(-o,s)):(this._x=Math.atan2(d,l),this._z=0);break;case"YXZ":this._x=Math.asin(-Kt(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(a,f),this._z=Math.atan2(c,l)):(this._y=Math.atan2(-h,s),this._z=0);break;case"ZXY":this._x=Math.asin(Kt(d,-1,1)),Math.abs(d)<.9999999?(this._y=Math.atan2(-h,f),this._z=Math.atan2(-o,l)):(this._y=0,this._z=Math.atan2(c,s));break;case"ZYX":this._y=Math.asin(-Kt(h,-1,1)),Math.abs(h)<.9999999?(this._x=Math.atan2(d,f),this._z=Math.atan2(c,s)):(this._x=0,this._z=Math.atan2(-o,l));break;case"YZX":this._z=Math.asin(Kt(c,-1,1)),Math.abs(c)<.9999999?(this._x=Math.atan2(-u,l),this._y=Math.atan2(-h,s)):(this._x=0,this._y=Math.atan2(a,f));break;case"XZY":this._z=Math.asin(-Kt(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(d,l),this._y=Math.atan2(a,s)):(this._x=Math.atan2(-u,f),this._y=0);break;default:console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: "+n)}return this._order=n,i===!0&&this._onChangeCallback(),this}setFromQuaternion(t,n,i){return im.makeRotationFromQuaternion(t),this.setFromRotationMatrix(im,n,i)}setFromVector3(t,n=this._order){return this.set(t.x,t.y,t.z,n)}reorder(t){return rm.setFromEuler(this),this.setFromQuaternion(rm,t)}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._order===this._order}fromArray(t){return this._x=t[0],this._y=t[1],this._z=t[2],t[3]!==void 0&&(this._order=t[3]),this._onChangeCallback(),this}toArray(t=[],n=0){return t[n]=this._x,t[n+1]=this._y,t[n+2]=this._z,t[n+3]=this._order,t}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}};On.DEFAULT_ORDER="XYZ";var Ss=class{constructor(){this.mask=1}set(t){this.mask=(1<<t|0)>>>0}enable(t){this.mask|=1<<t|0}enableAll(){this.mask=-1}toggle(t){this.mask^=1<<t|0}disable(t){this.mask&=~(1<<t|0)}disableAll(){this.mask=0}test(t){return(this.mask&t.mask)!==0}isEnabled(t){return(this.mask&(1<<t|0))!==0}},Ab=0,sm=new I,ss=new Ne,wi=new Vt,tc=new I,mo=new I,Cb=new I,Rb=new Ne,om=new I(1,0,0),am=new I(0,1,0),cm=new I(0,0,1),lm={type:"added"},Pb={type:"removed"},os={type:"childadded",child:null},Bu={type:"childremoved",child:null},Be=class e extends ai{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:Ab++}),this.uuid=Ci(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=e.DEFAULT_UP.clone();let t=new I,n=new On,i=new Ne,r=new I(1,1,1);function s(){i.setFromEuler(n,!1)}function o(){n.setFromQuaternion(i,void 0,!1)}n._onChange(s),i._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:t},rotation:{configurable:!0,enumerable:!0,value:n},quaternion:{configurable:!0,enumerable:!0,value:i},scale:{configurable:!0,enumerable:!0,value:r},modelViewMatrix:{value:new Vt},normalMatrix:{value:new Xt}}),this.matrix=new Vt,this.matrixWorld=new Vt,this.matrixAutoUpdate=e.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=e.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new Ss,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(t){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(t),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(t){return this.quaternion.premultiply(t),this}setRotationFromAxisAngle(t,n){this.quaternion.setFromAxisAngle(t,n)}setRotationFromEuler(t){this.quaternion.setFromEuler(t,!0)}setRotationFromMatrix(t){this.quaternion.setFromRotationMatrix(t)}setRotationFromQuaternion(t){this.quaternion.copy(t)}rotateOnAxis(t,n){return ss.setFromAxisAngle(t,n),this.quaternion.multiply(ss),this}rotateOnWorldAxis(t,n){return ss.setFromAxisAngle(t,n),this.quaternion.premultiply(ss),this}rotateX(t){return this.rotateOnAxis(om,t)}rotateY(t){return this.rotateOnAxis(am,t)}rotateZ(t){return this.rotateOnAxis(cm,t)}translateOnAxis(t,n){return sm.copy(t).applyQuaternion(this.quaternion),this.position.add(sm.multiplyScalar(n)),this}translateX(t){return this.translateOnAxis(om,t)}translateY(t){return this.translateOnAxis(am,t)}translateZ(t){return this.translateOnAxis(cm,t)}localToWorld(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(this.matrixWorld)}worldToLocal(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(wi.copy(this.matrixWorld).invert())}lookAt(t,n,i){t.isVector3?tc.copy(t):tc.set(t,n,i);let r=this.parent;this.updateWorldMatrix(!0,!1),mo.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?wi.lookAt(mo,tc,this.up):wi.lookAt(tc,mo,this.up),this.quaternion.setFromRotationMatrix(wi),r&&(wi.extractRotation(r.matrixWorld),ss.setFromRotationMatrix(wi),this.quaternion.premultiply(ss.invert()))}add(t){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.add(arguments[n]);return this}return t===this?(console.error("THREE.Object3D.add: object can't be added as a child of itself.",t),this):(t&&t.isObject3D?(t.removeFromParent(),t.parent=this,this.children.push(t),t.dispatchEvent(lm),os.child=t,this.dispatchEvent(os),os.child=null):console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",t),this)}remove(t){if(arguments.length>1){for(let i=0;i<arguments.length;i++)this.remove(arguments[i]);return this}let n=this.children.indexOf(t);return n!==-1&&(t.parent=null,this.children.splice(n,1),t.dispatchEvent(Pb),Bu.child=t,this.dispatchEvent(Bu),Bu.child=null),this}removeFromParent(){let t=this.parent;return t!==null&&t.remove(this),this}clear(){return this.remove(...this.children)}attach(t){return this.updateWorldMatrix(!0,!1),wi.copy(this.matrixWorld).invert(),t.parent!==null&&(t.parent.updateWorldMatrix(!0,!1),wi.multiply(t.parent.matrixWorld)),t.applyMatrix4(wi),t.removeFromParent(),t.parent=this,this.children.push(t),t.updateWorldMatrix(!1,!0),t.dispatchEvent(lm),os.child=t,this.dispatchEvent(os),os.child=null,this}getObjectById(t){return this.getObjectByProperty("id",t)}getObjectByName(t){return this.getObjectByProperty("name",t)}getObjectByProperty(t,n){if(this[t]===n)return this;for(let i=0,r=this.children.length;i<r;i++){let o=this.children[i].getObjectByProperty(t,n);if(o!==void 0)return o}}getObjectsByProperty(t,n,i=[]){this[t]===n&&i.push(this);let r=this.children;for(let s=0,o=r.length;s<o;s++)r[s].getObjectsByProperty(t,n,i);return i}getWorldPosition(t){return this.updateWorldMatrix(!0,!1),t.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(mo,t,Cb),t}getWorldScale(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(mo,Rb,t),t}getWorldDirection(t){this.updateWorldMatrix(!0,!1);let n=this.matrixWorld.elements;return t.set(n[8],n[9],n[10]).normalize()}raycast(){}traverse(t){t(this);let n=this.children;for(let i=0,r=n.length;i<r;i++)n[i].traverse(t)}traverseVisible(t){if(this.visible===!1)return;t(this);let n=this.children;for(let i=0,r=n.length;i<r;i++)n[i].traverseVisible(t)}traverseAncestors(t){let n=this.parent;n!==null&&(t(n),n.traverseAncestors(t))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(t){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||t)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,t=!0);let n=this.children;for(let i=0,r=n.length;i<r;i++)n[i].updateMatrixWorld(t)}updateWorldMatrix(t,n){let i=this.parent;if(t===!0&&i!==null&&i.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),n===!0){let r=this.children;for(let s=0,o=r.length;s<o;s++)r[s].updateWorldMatrix(!1,!0)}}toJSON(t){let n=t===void 0||typeof t=="string",i={};n&&(t={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},i.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});let r={};r.uuid=this.uuid,r.type=this.type,this.name!==""&&(r.name=this.name),this.castShadow===!0&&(r.castShadow=!0),this.receiveShadow===!0&&(r.receiveShadow=!0),this.visible===!1&&(r.visible=!1),this.frustumCulled===!1&&(r.frustumCulled=!1),this.renderOrder!==0&&(r.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(r.userData=this.userData),r.layers=this.layers.mask,r.matrix=this.matrix.toArray(),r.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(r.matrixAutoUpdate=!1),this.isInstancedMesh&&(r.type="InstancedMesh",r.count=this.count,r.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(r.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(r.type="BatchedMesh",r.perObjectFrustumCulled=this.perObjectFrustumCulled,r.sortObjects=this.sortObjects,r.drawRanges=this._drawRanges,r.reservedRanges=this._reservedRanges,r.geometryInfo=this._geometryInfo.map(a=>jn(qe({},a),{boundingBox:a.boundingBox?a.boundingBox.toJSON():void 0,boundingSphere:a.boundingSphere?a.boundingSphere.toJSON():void 0})),r.instanceInfo=this._instanceInfo.map(a=>qe({},a)),r.availableInstanceIds=this._availableInstanceIds.slice(),r.availableGeometryIds=this._availableGeometryIds.slice(),r.nextIndexStart=this._nextIndexStart,r.nextVertexStart=this._nextVertexStart,r.geometryCount=this._geometryCount,r.maxInstanceCount=this._maxInstanceCount,r.maxVertexCount=this._maxVertexCount,r.maxIndexCount=this._maxIndexCount,r.geometryInitialized=this._geometryInitialized,r.matricesTexture=this._matricesTexture.toJSON(t),r.indirectTexture=this._indirectTexture.toJSON(t),this._colorsTexture!==null&&(r.colorsTexture=this._colorsTexture.toJSON(t)),this.boundingSphere!==null&&(r.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(r.boundingBox=this.boundingBox.toJSON()));function s(a,c){return a[c.uuid]===void 0&&(a[c.uuid]=c.toJSON(t)),c.uuid}if(this.isScene)this.background&&(this.background.isColor?r.background=this.background.toJSON():this.background.isTexture&&(r.background=this.background.toJSON(t).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(r.environment=this.environment.toJSON(t).uuid);else if(this.isMesh||this.isLine||this.isPoints){r.geometry=s(t.geometries,this.geometry);let a=this.geometry.parameters;if(a!==void 0&&a.shapes!==void 0){let c=a.shapes;if(Array.isArray(c))for(let l=0,u=c.length;l<u;l++){let h=c[l];s(t.shapes,h)}else s(t.shapes,c)}}if(this.isSkinnedMesh&&(r.bindMode=this.bindMode,r.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(s(t.skeletons,this.skeleton),r.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){let a=[];for(let c=0,l=this.material.length;c<l;c++)a.push(s(t.materials,this.material[c]));r.material=a}else r.material=s(t.materials,this.material);if(this.children.length>0){r.children=[];for(let a=0;a<this.children.length;a++)r.children.push(this.children[a].toJSON(t).object)}if(this.animations.length>0){r.animations=[];for(let a=0;a<this.animations.length;a++){let c=this.animations[a];r.animations.push(s(t.animations,c))}}if(n){let a=o(t.geometries),c=o(t.materials),l=o(t.textures),u=o(t.images),h=o(t.shapes),d=o(t.skeletons),f=o(t.animations),m=o(t.nodes);a.length>0&&(i.geometries=a),c.length>0&&(i.materials=c),l.length>0&&(i.textures=l),u.length>0&&(i.images=u),h.length>0&&(i.shapes=h),d.length>0&&(i.skeletons=d),f.length>0&&(i.animations=f),m.length>0&&(i.nodes=m)}return i.object=r,i;function o(a){let c=[];for(let l in a){let u=a[l];delete u.metadata,c.push(u)}return c}}clone(t){return new this.constructor().copy(this,t)}copy(t,n=!0){if(this.name=t.name,this.up.copy(t.up),this.position.copy(t.position),this.rotation.order=t.rotation.order,this.quaternion.copy(t.quaternion),this.scale.copy(t.scale),this.matrix.copy(t.matrix),this.matrixWorld.copy(t.matrixWorld),this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrixWorldAutoUpdate=t.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=t.matrixWorldNeedsUpdate,this.layers.mask=t.layers.mask,this.visible=t.visible,this.castShadow=t.castShadow,this.receiveShadow=t.receiveShadow,this.frustumCulled=t.frustumCulled,this.renderOrder=t.renderOrder,this.animations=t.animations.slice(),this.userData=JSON.parse(JSON.stringify(t.userData)),n===!0)for(let i=0;i<t.children.length;i++){let r=t.children[i];this.add(r.clone())}return this}};Be.DEFAULT_UP=new I(0,1,0);Be.DEFAULT_MATRIX_AUTO_UPDATE=!0;Be.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;var $n=new I,Ei=new I,Vu=new I,Ti=new I,as=new I,cs=new I,hm=new I,Hu=new I,Gu=new I,Wu=new I,ju=new de,qu=new de,Xu=new de,Ai=class e{constructor(t=new I,n=new I,i=new I){this.a=t,this.b=n,this.c=i}static getNormal(t,n,i,r){r.subVectors(i,n),$n.subVectors(t,n),r.cross($n);let s=r.lengthSq();return s>0?r.multiplyScalar(1/Math.sqrt(s)):r.set(0,0,0)}static getBarycoord(t,n,i,r,s){$n.subVectors(r,n),Ei.subVectors(i,n),Vu.subVectors(t,n);let o=$n.dot($n),a=$n.dot(Ei),c=$n.dot(Vu),l=Ei.dot(Ei),u=Ei.dot(Vu),h=o*l-a*a;if(h===0)return s.set(0,0,0),null;let d=1/h,f=(l*c-a*u)*d,m=(o*u-a*c)*d;return s.set(1-f-m,m,f)}static containsPoint(t,n,i,r){return this.getBarycoord(t,n,i,r,Ti)===null?!1:Ti.x>=0&&Ti.y>=0&&Ti.x+Ti.y<=1}static getInterpolation(t,n,i,r,s,o,a,c){return this.getBarycoord(t,n,i,r,Ti)===null?(c.x=0,c.y=0,"z"in c&&(c.z=0),"w"in c&&(c.w=0),null):(c.setScalar(0),c.addScaledVector(s,Ti.x),c.addScaledVector(o,Ti.y),c.addScaledVector(a,Ti.z),c)}static getInterpolatedAttribute(t,n,i,r,s,o){return ju.setScalar(0),qu.setScalar(0),Xu.setScalar(0),ju.fromBufferAttribute(t,n),qu.fromBufferAttribute(t,i),Xu.fromBufferAttribute(t,r),o.setScalar(0),o.addScaledVector(ju,s.x),o.addScaledVector(qu,s.y),o.addScaledVector(Xu,s.z),o}static isFrontFacing(t,n,i,r){return $n.subVectors(i,n),Ei.subVectors(t,n),$n.cross(Ei).dot(r)<0}set(t,n,i){return this.a.copy(t),this.b.copy(n),this.c.copy(i),this}setFromPointsAndIndices(t,n,i,r){return this.a.copy(t[n]),this.b.copy(t[i]),this.c.copy(t[r]),this}setFromAttributeAndIndices(t,n,i,r){return this.a.fromBufferAttribute(t,n),this.b.fromBufferAttribute(t,i),this.c.fromBufferAttribute(t,r),this}clone(){return new this.constructor().copy(this)}copy(t){return this.a.copy(t.a),this.b.copy(t.b),this.c.copy(t.c),this}getArea(){return $n.subVectors(this.c,this.b),Ei.subVectors(this.a,this.b),$n.cross(Ei).length()*.5}getMidpoint(t){return t.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(t){return e.getNormal(this.a,this.b,this.c,t)}getPlane(t){return t.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(t,n){return e.getBarycoord(t,this.a,this.b,this.c,n)}getInterpolation(t,n,i,r,s){return e.getInterpolation(t,this.a,this.b,this.c,n,i,r,s)}containsPoint(t){return e.containsPoint(t,this.a,this.b,this.c)}isFrontFacing(t){return e.isFrontFacing(this.a,this.b,this.c,t)}intersectsBox(t){return t.intersectsTriangle(this)}closestPointToPoint(t,n){let i=this.a,r=this.b,s=this.c,o,a;as.subVectors(r,i),cs.subVectors(s,i),Hu.subVectors(t,i);let c=as.dot(Hu),l=cs.dot(Hu);if(c<=0&&l<=0)return n.copy(i);Gu.subVectors(t,r);let u=as.dot(Gu),h=cs.dot(Gu);if(u>=0&&h<=u)return n.copy(r);let d=c*h-u*l;if(d<=0&&c>=0&&u<=0)return o=c/(c-u),n.copy(i).addScaledVector(as,o);Wu.subVectors(t,s);let f=as.dot(Wu),m=cs.dot(Wu);if(m>=0&&f<=m)return n.copy(s);let _=f*l-c*m;if(_<=0&&l>=0&&m<=0)return a=l/(l-m),n.copy(i).addScaledVector(cs,a);let g=u*m-f*h;if(g<=0&&h-u>=0&&f-m>=0)return hm.subVectors(s,r),a=(h-u)/(h-u+(f-m)),n.copy(r).addScaledVector(hm,a);let p=1/(g+_+d);return o=_*p,a=d*p,n.copy(i).addScaledVector(as,o).addScaledVector(cs,a)}equals(t){return t.a.equals(this.a)&&t.b.equals(this.b)&&t.c.equals(this.c)}},fg={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},qi={h:0,s:0,l:0},ec={h:0,s:0,l:0};function $u(e,t,n){return n<0&&(n+=1),n>1&&(n-=1),n<1/6?e+(t-e)*6*n:n<1/2?t:n<2/3?e+(t-e)*6*(2/3-n):e}var Ot=class{constructor(t,n,i){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(t,n,i)}set(t,n,i){if(n===void 0&&i===void 0){let r=t;r&&r.isColor?this.copy(r):typeof r=="number"?this.setHex(r):typeof r=="string"&&this.setStyle(r)}else this.setRGB(t,n,i);return this}setScalar(t){return this.r=t,this.g=t,this.b=t,this}setHex(t,n=He){return t=Math.floor(t),this.r=(t>>16&255)/255,this.g=(t>>8&255)/255,this.b=(t&255)/255,ie.colorSpaceToWorking(this,n),this}setRGB(t,n,i,r=ie.workingColorSpace){return this.r=t,this.g=n,this.b=i,ie.colorSpaceToWorking(this,r),this}setHSL(t,n,i,r=ie.workingColorSpace){if(t=Pf(t,1),n=Kt(n,0,1),i=Kt(i,0,1),n===0)this.r=this.g=this.b=i;else{let s=i<=.5?i*(1+n):i+n-i*n,o=2*i-s;this.r=$u(o,s,t+1/3),this.g=$u(o,s,t),this.b=$u(o,s,t-1/3)}return ie.colorSpaceToWorking(this,r),this}setStyle(t,n=He){function i(s){s!==void 0&&parseFloat(s)<1&&console.warn("THREE.Color: Alpha component of "+t+" will be ignored.")}let r;if(r=/^(\w+)\(([^\)]*)\)/.exec(t)){let s,o=r[1],a=r[2];switch(o){case"rgb":case"rgba":if(s=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return i(s[4]),this.setRGB(Math.min(255,parseInt(s[1],10))/255,Math.min(255,parseInt(s[2],10))/255,Math.min(255,parseInt(s[3],10))/255,n);if(s=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return i(s[4]),this.setRGB(Math.min(100,parseInt(s[1],10))/100,Math.min(100,parseInt(s[2],10))/100,Math.min(100,parseInt(s[3],10))/100,n);break;case"hsl":case"hsla":if(s=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return i(s[4]),this.setHSL(parseFloat(s[1])/360,parseFloat(s[2])/100,parseFloat(s[3])/100,n);break;default:console.warn("THREE.Color: Unknown color model "+t)}}else if(r=/^\#([A-Fa-f\d]+)$/.exec(t)){let s=r[1],o=s.length;if(o===3)return this.setRGB(parseInt(s.charAt(0),16)/15,parseInt(s.charAt(1),16)/15,parseInt(s.charAt(2),16)/15,n);if(o===6)return this.setHex(parseInt(s,16),n);console.warn("THREE.Color: Invalid hex color "+t)}else if(t&&t.length>0)return this.setColorName(t,n);return this}setColorName(t,n=He){let i=fg[t.toLowerCase()];return i!==void 0?this.setHex(i,n):console.warn("THREE.Color: Unknown color "+t),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(t){return this.r=t.r,this.g=t.g,this.b=t.b,this}copySRGBToLinear(t){return this.r=Ri(t.r),this.g=Ri(t.g),this.b=Ri(t.b),this}copyLinearToSRGB(t){return this.r=_s(t.r),this.g=_s(t.g),this.b=_s(t.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(t=He){return ie.workingToColorSpace($e.copy(this),t),Math.round(Kt($e.r*255,0,255))*65536+Math.round(Kt($e.g*255,0,255))*256+Math.round(Kt($e.b*255,0,255))}getHexString(t=He){return("000000"+this.getHex(t).toString(16)).slice(-6)}getHSL(t,n=ie.workingColorSpace){ie.workingToColorSpace($e.copy(this),n);let i=$e.r,r=$e.g,s=$e.b,o=Math.max(i,r,s),a=Math.min(i,r,s),c,l,u=(a+o)/2;if(a===o)c=0,l=0;else{let h=o-a;switch(l=u<=.5?h/(o+a):h/(2-o-a),o){case i:c=(r-s)/h+(r<s?6:0);break;case r:c=(s-i)/h+2;break;case s:c=(i-r)/h+4;break}c/=6}return t.h=c,t.s=l,t.l=u,t}getRGB(t,n=ie.workingColorSpace){return ie.workingToColorSpace($e.copy(this),n),t.r=$e.r,t.g=$e.g,t.b=$e.b,t}getStyle(t=He){ie.workingToColorSpace($e.copy(this),t);let n=$e.r,i=$e.g,r=$e.b;return t!==He?`color(${t} ${n.toFixed(3)} ${i.toFixed(3)} ${r.toFixed(3)})`:`rgb(${Math.round(n*255)},${Math.round(i*255)},${Math.round(r*255)})`}offsetHSL(t,n,i){return this.getHSL(qi),this.setHSL(qi.h+t,qi.s+n,qi.l+i)}add(t){return this.r+=t.r,this.g+=t.g,this.b+=t.b,this}addColors(t,n){return this.r=t.r+n.r,this.g=t.g+n.g,this.b=t.b+n.b,this}addScalar(t){return this.r+=t,this.g+=t,this.b+=t,this}sub(t){return this.r=Math.max(0,this.r-t.r),this.g=Math.max(0,this.g-t.g),this.b=Math.max(0,this.b-t.b),this}multiply(t){return this.r*=t.r,this.g*=t.g,this.b*=t.b,this}multiplyScalar(t){return this.r*=t,this.g*=t,this.b*=t,this}lerp(t,n){return this.r+=(t.r-this.r)*n,this.g+=(t.g-this.g)*n,this.b+=(t.b-this.b)*n,this}lerpColors(t,n,i){return this.r=t.r+(n.r-t.r)*i,this.g=t.g+(n.g-t.g)*i,this.b=t.b+(n.b-t.b)*i,this}lerpHSL(t,n){this.getHSL(qi),t.getHSL(ec);let i=So(qi.h,ec.h,n),r=So(qi.s,ec.s,n),s=So(qi.l,ec.l,n);return this.setHSL(i,r,s),this}setFromVector3(t){return this.r=t.x,this.g=t.y,this.b=t.z,this}applyMatrix3(t){let n=this.r,i=this.g,r=this.b,s=t.elements;return this.r=s[0]*n+s[3]*i+s[6]*r,this.g=s[1]*n+s[4]*i+s[7]*r,this.b=s[2]*n+s[5]*i+s[8]*r,this}equals(t){return t.r===this.r&&t.g===this.g&&t.b===this.b}fromArray(t,n=0){return this.r=t[n],this.g=t[n+1],this.b=t[n+2],this}toArray(t=[],n=0){return t[n]=this.r,t[n+1]=this.g,t[n+2]=this.b,t}fromBufferAttribute(t,n){return this.r=t.getX(n),this.g=t.getY(n),this.b=t.getZ(n),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}},$e=new Ot;Ot.NAMES=fg;var Ib=0,Nn=class extends ai{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:Ib++}),this.uuid=Ci(),this.name="",this.type="Material",this.blending=Er,this.side=Pi,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=Mc,this.blendDst=Sc,this.blendEquation=Yi,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Ot(0,0,0),this.blendAlpha=0,this.depthFunc=Tr,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=lf,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=wr,this.stencilZFail=wr,this.stencilZPass=wr,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(t){this._alphaTest>0!=t>0&&this.version++,this._alphaTest=t}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(t){if(t!==void 0)for(let n in t){let i=t[n];if(i===void 0){console.warn(`THREE.Material: parameter '${n}' has value of undefined.`);continue}let r=this[n];if(r===void 0){console.warn(`THREE.Material: '${n}' is not a property of THREE.${this.type}.`);continue}r&&r.isColor?r.set(i):r&&r.isVector3&&i&&i.isVector3?r.copy(i):this[n]=i}}toJSON(t){let n=t===void 0||typeof t=="string";n&&(t={textures:{},images:{}});let i={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};i.uuid=this.uuid,i.type=this.type,this.name!==""&&(i.name=this.name),this.color&&this.color.isColor&&(i.color=this.color.getHex()),this.roughness!==void 0&&(i.roughness=this.roughness),this.metalness!==void 0&&(i.metalness=this.metalness),this.sheen!==void 0&&(i.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(i.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(i.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(i.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(i.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(i.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(i.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(i.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(i.shininess=this.shininess),this.clearcoat!==void 0&&(i.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(i.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(i.clearcoatMap=this.clearcoatMap.toJSON(t).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(i.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(t).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(i.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(t).uuid,i.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(i.sheenColorMap=this.sheenColorMap.toJSON(t).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(i.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(t).uuid),this.dispersion!==void 0&&(i.dispersion=this.dispersion),this.iridescence!==void 0&&(i.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(i.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(i.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(i.iridescenceMap=this.iridescenceMap.toJSON(t).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(i.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(t).uuid),this.anisotropy!==void 0&&(i.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(i.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(i.anisotropyMap=this.anisotropyMap.toJSON(t).uuid),this.map&&this.map.isTexture&&(i.map=this.map.toJSON(t).uuid),this.matcap&&this.matcap.isTexture&&(i.matcap=this.matcap.toJSON(t).uuid),this.alphaMap&&this.alphaMap.isTexture&&(i.alphaMap=this.alphaMap.toJSON(t).uuid),this.lightMap&&this.lightMap.isTexture&&(i.lightMap=this.lightMap.toJSON(t).uuid,i.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(i.aoMap=this.aoMap.toJSON(t).uuid,i.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(i.bumpMap=this.bumpMap.toJSON(t).uuid,i.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(i.normalMap=this.normalMap.toJSON(t).uuid,i.normalMapType=this.normalMapType,i.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(i.displacementMap=this.displacementMap.toJSON(t).uuid,i.displacementScale=this.displacementScale,i.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(i.roughnessMap=this.roughnessMap.toJSON(t).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(i.metalnessMap=this.metalnessMap.toJSON(t).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(i.emissiveMap=this.emissiveMap.toJSON(t).uuid),this.specularMap&&this.specularMap.isTexture&&(i.specularMap=this.specularMap.toJSON(t).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(i.specularIntensityMap=this.specularIntensityMap.toJSON(t).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(i.specularColorMap=this.specularColorMap.toJSON(t).uuid),this.envMap&&this.envMap.isTexture&&(i.envMap=this.envMap.toJSON(t).uuid,this.combine!==void 0&&(i.combine=this.combine)),this.envMapRotation!==void 0&&(i.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(i.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(i.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(i.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(i.gradientMap=this.gradientMap.toJSON(t).uuid),this.transmission!==void 0&&(i.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(i.transmissionMap=this.transmissionMap.toJSON(t).uuid),this.thickness!==void 0&&(i.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(i.thicknessMap=this.thicknessMap.toJSON(t).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(i.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(i.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(i.size=this.size),this.shadowSide!==null&&(i.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(i.sizeAttenuation=this.sizeAttenuation),this.blending!==Er&&(i.blending=this.blending),this.side!==Pi&&(i.side=this.side),this.vertexColors===!0&&(i.vertexColors=!0),this.opacity<1&&(i.opacity=this.opacity),this.transparent===!0&&(i.transparent=!0),this.blendSrc!==Mc&&(i.blendSrc=this.blendSrc),this.blendDst!==Sc&&(i.blendDst=this.blendDst),this.blendEquation!==Yi&&(i.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(i.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(i.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(i.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(i.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(i.blendAlpha=this.blendAlpha),this.depthFunc!==Tr&&(i.depthFunc=this.depthFunc),this.depthTest===!1&&(i.depthTest=this.depthTest),this.depthWrite===!1&&(i.depthWrite=this.depthWrite),this.colorWrite===!1&&(i.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(i.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==lf&&(i.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(i.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(i.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==wr&&(i.stencilFail=this.stencilFail),this.stencilZFail!==wr&&(i.stencilZFail=this.stencilZFail),this.stencilZPass!==wr&&(i.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(i.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(i.rotation=this.rotation),this.polygonOffset===!0&&(i.polygonOffset=!0),this.polygonOffsetFactor!==0&&(i.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(i.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(i.linewidth=this.linewidth),this.dashSize!==void 0&&(i.dashSize=this.dashSize),this.gapSize!==void 0&&(i.gapSize=this.gapSize),this.scale!==void 0&&(i.scale=this.scale),this.dithering===!0&&(i.dithering=!0),this.alphaTest>0&&(i.alphaTest=this.alphaTest),this.alphaHash===!0&&(i.alphaHash=!0),this.alphaToCoverage===!0&&(i.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(i.premultipliedAlpha=!0),this.forceSinglePass===!0&&(i.forceSinglePass=!0),this.wireframe===!0&&(i.wireframe=!0),this.wireframeLinewidth>1&&(i.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(i.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(i.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(i.flatShading=!0),this.visible===!1&&(i.visible=!1),this.toneMapped===!1&&(i.toneMapped=!1),this.fog===!1&&(i.fog=!1),Object.keys(this.userData).length>0&&(i.userData=this.userData);function r(s){let o=[];for(let a in s){let c=s[a];delete c.metadata,o.push(c)}return o}if(n){let s=r(t.textures),o=r(t.images);s.length>0&&(i.textures=s),o.length>0&&(i.images=o)}return i}clone(){return new this.constructor().copy(this)}copy(t){this.name=t.name,this.blending=t.blending,this.side=t.side,this.vertexColors=t.vertexColors,this.opacity=t.opacity,this.transparent=t.transparent,this.blendSrc=t.blendSrc,this.blendDst=t.blendDst,this.blendEquation=t.blendEquation,this.blendSrcAlpha=t.blendSrcAlpha,this.blendDstAlpha=t.blendDstAlpha,this.blendEquationAlpha=t.blendEquationAlpha,this.blendColor.copy(t.blendColor),this.blendAlpha=t.blendAlpha,this.depthFunc=t.depthFunc,this.depthTest=t.depthTest,this.depthWrite=t.depthWrite,this.stencilWriteMask=t.stencilWriteMask,this.stencilFunc=t.stencilFunc,this.stencilRef=t.stencilRef,this.stencilFuncMask=t.stencilFuncMask,this.stencilFail=t.stencilFail,this.stencilZFail=t.stencilZFail,this.stencilZPass=t.stencilZPass,this.stencilWrite=t.stencilWrite;let n=t.clippingPlanes,i=null;if(n!==null){let r=n.length;i=new Array(r);for(let s=0;s!==r;++s)i[s]=n[s].clone()}return this.clippingPlanes=i,this.clipIntersection=t.clipIntersection,this.clipShadows=t.clipShadows,this.shadowSide=t.shadowSide,this.colorWrite=t.colorWrite,this.precision=t.precision,this.polygonOffset=t.polygonOffset,this.polygonOffsetFactor=t.polygonOffsetFactor,this.polygonOffsetUnits=t.polygonOffsetUnits,this.dithering=t.dithering,this.alphaTest=t.alphaTest,this.alphaHash=t.alphaHash,this.alphaToCoverage=t.alphaToCoverage,this.premultipliedAlpha=t.premultipliedAlpha,this.forceSinglePass=t.forceSinglePass,this.visible=t.visible,this.toneMapped=t.toneMapped,this.userData=JSON.parse(JSON.stringify(t.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(t){t===!0&&this.version++}},Mn=class extends Nn{constructor(t){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new Ot(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new On,this.combine=hl,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.combine=t.combine,this.reflectivity=t.reflectivity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.fog=t.fog,this}};var De=new I,nc=new it,Db=0,Ze=class{constructor(t,n,i=!1){if(Array.isArray(t))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:Db++}),this.name="",this.array=t,this.itemSize=n,this.count=t!==void 0?t.length/n:0,this.normalized=i,this.usage=Ac,this.updateRanges=[],this.gpuType=mi,this.version=0}onUploadCallback(){}set needsUpdate(t){t===!0&&this.version++}setUsage(t){return this.usage=t,this}addUpdateRange(t,n){this.updateRanges.push({start:t,count:n})}clearUpdateRanges(){this.updateRanges.length=0}copy(t){return this.name=t.name,this.array=new t.array.constructor(t.array),this.itemSize=t.itemSize,this.count=t.count,this.normalized=t.normalized,this.usage=t.usage,this.gpuType=t.gpuType,this}copyAt(t,n,i){t*=this.itemSize,i*=n.itemSize;for(let r=0,s=this.itemSize;r<s;r++)this.array[t+r]=n.array[i+r];return this}copyArray(t){return this.array.set(t),this}applyMatrix3(t){if(this.itemSize===2)for(let n=0,i=this.count;n<i;n++)nc.fromBufferAttribute(this,n),nc.applyMatrix3(t),this.setXY(n,nc.x,nc.y);else if(this.itemSize===3)for(let n=0,i=this.count;n<i;n++)De.fromBufferAttribute(this,n),De.applyMatrix3(t),this.setXYZ(n,De.x,De.y,De.z);return this}applyMatrix4(t){for(let n=0,i=this.count;n<i;n++)De.fromBufferAttribute(this,n),De.applyMatrix4(t),this.setXYZ(n,De.x,De.y,De.z);return this}applyNormalMatrix(t){for(let n=0,i=this.count;n<i;n++)De.fromBufferAttribute(this,n),De.applyNormalMatrix(t),this.setXYZ(n,De.x,De.y,De.z);return this}transformDirection(t){for(let n=0,i=this.count;n<i;n++)De.fromBufferAttribute(this,n),De.transformDirection(t),this.setXYZ(n,De.x,De.y,De.z);return this}set(t,n=0){return this.array.set(t,n),this}getComponent(t,n){let i=this.array[t*this.itemSize+n];return this.normalized&&(i=Yn(i,this.array)),i}setComponent(t,n,i){return this.normalized&&(i=fe(i,this.array)),this.array[t*this.itemSize+n]=i,this}getX(t){let n=this.array[t*this.itemSize];return this.normalized&&(n=Yn(n,this.array)),n}setX(t,n){return this.normalized&&(n=fe(n,this.array)),this.array[t*this.itemSize]=n,this}getY(t){let n=this.array[t*this.itemSize+1];return this.normalized&&(n=Yn(n,this.array)),n}setY(t,n){return this.normalized&&(n=fe(n,this.array)),this.array[t*this.itemSize+1]=n,this}getZ(t){let n=this.array[t*this.itemSize+2];return this.normalized&&(n=Yn(n,this.array)),n}setZ(t,n){return this.normalized&&(n=fe(n,this.array)),this.array[t*this.itemSize+2]=n,this}getW(t){let n=this.array[t*this.itemSize+3];return this.normalized&&(n=Yn(n,this.array)),n}setW(t,n){return this.normalized&&(n=fe(n,this.array)),this.array[t*this.itemSize+3]=n,this}setXY(t,n,i){return t*=this.itemSize,this.normalized&&(n=fe(n,this.array),i=fe(i,this.array)),this.array[t+0]=n,this.array[t+1]=i,this}setXYZ(t,n,i,r){return t*=this.itemSize,this.normalized&&(n=fe(n,this.array),i=fe(i,this.array),r=fe(r,this.array)),this.array[t+0]=n,this.array[t+1]=i,this.array[t+2]=r,this}setXYZW(t,n,i,r,s){return t*=this.itemSize,this.normalized&&(n=fe(n,this.array),i=fe(i,this.array),r=fe(r,this.array),s=fe(s,this.array)),this.array[t+0]=n,this.array[t+1]=i,this.array[t+2]=r,this.array[t+3]=s,this}onUpload(t){return this.onUploadCallback=t,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let t={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(t.name=this.name),this.usage!==Ac&&(t.usage=this.usage),t}};var Po=class extends Ze{constructor(t,n,i){super(new Uint16Array(t),n,i)}};var Io=class extends Ze{constructor(t,n,i){super(new Uint32Array(t),n,i)}};var ce=class extends Ze{constructor(t,n,i){super(new Float32Array(t),n,i)}},Lb=0,Dn=new Vt,Yu=new Be,ls=new I,bn=new pn,go=new pn,ke=new I,ve=class e extends ai{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Lb++}),this.uuid=Ci(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(t){return Array.isArray(t)?this.index=new(If(t)?Io:Po)(t,1):this.index=t,this}setIndirect(t){return this.indirect=t,this}getIndirect(){return this.indirect}getAttribute(t){return this.attributes[t]}setAttribute(t,n){return this.attributes[t]=n,this}deleteAttribute(t){return delete this.attributes[t],this}hasAttribute(t){return this.attributes[t]!==void 0}addGroup(t,n,i=0){this.groups.push({start:t,count:n,materialIndex:i})}clearGroups(){this.groups=[]}setDrawRange(t,n){this.drawRange.start=t,this.drawRange.count=n}applyMatrix4(t){let n=this.attributes.position;n!==void 0&&(n.applyMatrix4(t),n.needsUpdate=!0);let i=this.attributes.normal;if(i!==void 0){let s=new Xt().getNormalMatrix(t);i.applyNormalMatrix(s),i.needsUpdate=!0}let r=this.attributes.tangent;return r!==void 0&&(r.transformDirection(t),r.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(t){return Dn.makeRotationFromQuaternion(t),this.applyMatrix4(Dn),this}rotateX(t){return Dn.makeRotationX(t),this.applyMatrix4(Dn),this}rotateY(t){return Dn.makeRotationY(t),this.applyMatrix4(Dn),this}rotateZ(t){return Dn.makeRotationZ(t),this.applyMatrix4(Dn),this}translate(t,n,i){return Dn.makeTranslation(t,n,i),this.applyMatrix4(Dn),this}scale(t,n,i){return Dn.makeScale(t,n,i),this.applyMatrix4(Dn),this}lookAt(t){return Yu.lookAt(t),Yu.updateMatrix(),this.applyMatrix4(Yu.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(ls).negate(),this.translate(ls.x,ls.y,ls.z),this}setFromPoints(t){let n=this.getAttribute("position");if(n===void 0){let i=[];for(let r=0,s=t.length;r<s;r++){let o=t[r];i.push(o.x,o.y,o.z||0)}this.setAttribute("position",new ce(i,3))}else{let i=Math.min(t.length,n.count);for(let r=0;r<i;r++){let s=t[r];n.setXYZ(r,s.x,s.y,s.z||0)}t.length>n.count&&console.warn("THREE.BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),n.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new pn);let t=this.attributes.position,n=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new I(-1/0,-1/0,-1/0),new I(1/0,1/0,1/0));return}if(t!==void 0){if(this.boundingBox.setFromBufferAttribute(t),n)for(let i=0,r=n.length;i<r;i++){let s=n[i];bn.setFromBufferAttribute(s),this.morphTargetsRelative?(ke.addVectors(this.boundingBox.min,bn.min),this.boundingBox.expandByPoint(ke),ke.addVectors(this.boundingBox.max,bn.max),this.boundingBox.expandByPoint(ke)):(this.boundingBox.expandByPoint(bn.min),this.boundingBox.expandByPoint(bn.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new ci);let t=this.attributes.position,n=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new I,1/0);return}if(t){let i=this.boundingSphere.center;if(bn.setFromBufferAttribute(t),n)for(let s=0,o=n.length;s<o;s++){let a=n[s];go.setFromBufferAttribute(a),this.morphTargetsRelative?(ke.addVectors(bn.min,go.min),bn.expandByPoint(ke),ke.addVectors(bn.max,go.max),bn.expandByPoint(ke)):(bn.expandByPoint(go.min),bn.expandByPoint(go.max))}bn.getCenter(i);let r=0;for(let s=0,o=t.count;s<o;s++)ke.fromBufferAttribute(t,s),r=Math.max(r,i.distanceToSquared(ke));if(n)for(let s=0,o=n.length;s<o;s++){let a=n[s],c=this.morphTargetsRelative;for(let l=0,u=a.count;l<u;l++)ke.fromBufferAttribute(a,l),c&&(ls.fromBufferAttribute(t,l),ke.add(ls)),r=Math.max(r,i.distanceToSquared(ke))}this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){let t=this.index,n=this.attributes;if(t===null||n.position===void 0||n.normal===void 0||n.uv===void 0){console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}let i=n.position,r=n.normal,s=n.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new Ze(new Float32Array(4*i.count),4));let o=this.getAttribute("tangent"),a=[],c=[];for(let P=0;P<i.count;P++)a[P]=new I,c[P]=new I;let l=new I,u=new I,h=new I,d=new it,f=new it,m=new it,_=new I,g=new I;function p(P,T,w){l.fromBufferAttribute(i,P),u.fromBufferAttribute(i,T),h.fromBufferAttribute(i,w),d.fromBufferAttribute(s,P),f.fromBufferAttribute(s,T),m.fromBufferAttribute(s,w),u.sub(l),h.sub(l),f.sub(d),m.sub(d);let R=1/(f.x*m.y-m.x*f.y);isFinite(R)&&(_.copy(u).multiplyScalar(m.y).addScaledVector(h,-f.y).multiplyScalar(R),g.copy(h).multiplyScalar(f.x).addScaledVector(u,-m.x).multiplyScalar(R),a[P].add(_),a[T].add(_),a[w].add(_),c[P].add(g),c[T].add(g),c[w].add(g))}let b=this.groups;b.length===0&&(b=[{start:0,count:t.count}]);for(let P=0,T=b.length;P<T;++P){let w=b[P],R=w.start,V=w.count;for(let N=R,k=R+V;N<k;N+=3)p(t.getX(N+0),t.getX(N+1),t.getX(N+2))}let x=new I,v=new I,M=new I,S=new I;function C(P){M.fromBufferAttribute(r,P),S.copy(M);let T=a[P];x.copy(T),x.sub(M.multiplyScalar(M.dot(T))).normalize(),v.crossVectors(S,T);let R=v.dot(c[P])<0?-1:1;o.setXYZW(P,x.x,x.y,x.z,R)}for(let P=0,T=b.length;P<T;++P){let w=b[P],R=w.start,V=w.count;for(let N=R,k=R+V;N<k;N+=3)C(t.getX(N+0)),C(t.getX(N+1)),C(t.getX(N+2))}}computeVertexNormals(){let t=this.index,n=this.getAttribute("position");if(n!==void 0){let i=this.getAttribute("normal");if(i===void 0)i=new Ze(new Float32Array(n.count*3),3),this.setAttribute("normal",i);else for(let d=0,f=i.count;d<f;d++)i.setXYZ(d,0,0,0);let r=new I,s=new I,o=new I,a=new I,c=new I,l=new I,u=new I,h=new I;if(t)for(let d=0,f=t.count;d<f;d+=3){let m=t.getX(d+0),_=t.getX(d+1),g=t.getX(d+2);r.fromBufferAttribute(n,m),s.fromBufferAttribute(n,_),o.fromBufferAttribute(n,g),u.subVectors(o,s),h.subVectors(r,s),u.cross(h),a.fromBufferAttribute(i,m),c.fromBufferAttribute(i,_),l.fromBufferAttribute(i,g),a.add(u),c.add(u),l.add(u),i.setXYZ(m,a.x,a.y,a.z),i.setXYZ(_,c.x,c.y,c.z),i.setXYZ(g,l.x,l.y,l.z)}else for(let d=0,f=n.count;d<f;d+=3)r.fromBufferAttribute(n,d+0),s.fromBufferAttribute(n,d+1),o.fromBufferAttribute(n,d+2),u.subVectors(o,s),h.subVectors(r,s),u.cross(h),i.setXYZ(d+0,u.x,u.y,u.z),i.setXYZ(d+1,u.x,u.y,u.z),i.setXYZ(d+2,u.x,u.y,u.z);this.normalizeNormals(),i.needsUpdate=!0}}normalizeNormals(){let t=this.attributes.normal;for(let n=0,i=t.count;n<i;n++)ke.fromBufferAttribute(t,n),ke.normalize(),t.setXYZ(n,ke.x,ke.y,ke.z)}toNonIndexed(){function t(a,c){let l=a.array,u=a.itemSize,h=a.normalized,d=new l.constructor(c.length*u),f=0,m=0;for(let _=0,g=c.length;_<g;_++){a.isInterleavedBufferAttribute?f=c[_]*a.data.stride+a.offset:f=c[_]*u;for(let p=0;p<u;p++)d[m++]=l[f++]}return new Ze(d,u,h)}if(this.index===null)return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;let n=new e,i=this.index.array,r=this.attributes;for(let a in r){let c=r[a],l=t(c,i);n.setAttribute(a,l)}let s=this.morphAttributes;for(let a in s){let c=[],l=s[a];for(let u=0,h=l.length;u<h;u++){let d=l[u],f=t(d,i);c.push(f)}n.morphAttributes[a]=c}n.morphTargetsRelative=this.morphTargetsRelative;let o=this.groups;for(let a=0,c=o.length;a<c;a++){let l=o[a];n.addGroup(l.start,l.count,l.materialIndex)}return n}toJSON(){let t={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(t.uuid=this.uuid,t.type=this.type,this.name!==""&&(t.name=this.name),Object.keys(this.userData).length>0&&(t.userData=this.userData),this.parameters!==void 0){let c=this.parameters;for(let l in c)c[l]!==void 0&&(t[l]=c[l]);return t}t.data={attributes:{}};let n=this.index;n!==null&&(t.data.index={type:n.array.constructor.name,array:Array.prototype.slice.call(n.array)});let i=this.attributes;for(let c in i){let l=i[c];t.data.attributes[c]=l.toJSON(t.data)}let r={},s=!1;for(let c in this.morphAttributes){let l=this.morphAttributes[c],u=[];for(let h=0,d=l.length;h<d;h++){let f=l[h];u.push(f.toJSON(t.data))}u.length>0&&(r[c]=u,s=!0)}s&&(t.data.morphAttributes=r,t.data.morphTargetsRelative=this.morphTargetsRelative);let o=this.groups;o.length>0&&(t.data.groups=JSON.parse(JSON.stringify(o)));let a=this.boundingSphere;return a!==null&&(t.data.boundingSphere=a.toJSON()),t}clone(){return new this.constructor().copy(this)}copy(t){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let n={};this.name=t.name;let i=t.index;i!==null&&this.setIndex(i.clone());let r=t.attributes;for(let l in r){let u=r[l];this.setAttribute(l,u.clone(n))}let s=t.morphAttributes;for(let l in s){let u=[],h=s[l];for(let d=0,f=h.length;d<f;d++)u.push(h[d].clone(n));this.morphAttributes[l]=u}this.morphTargetsRelative=t.morphTargetsRelative;let o=t.groups;for(let l=0,u=o.length;l<u;l++){let h=o[l];this.addGroup(h.start,h.count,h.materialIndex)}let a=t.boundingBox;a!==null&&(this.boundingBox=a.clone());let c=t.boundingSphere;return c!==null&&(this.boundingSphere=c.clone()),this.drawRange.start=t.drawRange.start,this.drawRange.count=t.drawRange.count,this.userData=t.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}},um=new Vt,Mr=new Ii,ic=new ci,fm=new I,rc=new I,sc=new I,oc=new I,Zu=new I,ac=new I,dm=new I,cc=new I,we=class extends Be{constructor(t=new ve,n=new Mn){super(),this.isMesh=!0,this.type="Mesh",this.geometry=t,this.material=n,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(t,n){return super.copy(t,n),t.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=t.morphTargetInfluences.slice()),t.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},t.morphTargetDictionary)),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}updateMorphTargets(){let n=this.geometry.morphAttributes,i=Object.keys(n);if(i.length>0){let r=n[i[0]];if(r!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,o=r.length;s<o;s++){let a=r[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=s}}}}getVertexPosition(t,n){let i=this.geometry,r=i.attributes.position,s=i.morphAttributes.position,o=i.morphTargetsRelative;n.fromBufferAttribute(r,t);let a=this.morphTargetInfluences;if(s&&a){ac.set(0,0,0);for(let c=0,l=s.length;c<l;c++){let u=a[c],h=s[c];u!==0&&(Zu.fromBufferAttribute(h,t),o?ac.addScaledVector(Zu,u):ac.addScaledVector(Zu.sub(n),u))}n.add(ac)}return n}raycast(t,n){let i=this.geometry,r=this.material,s=this.matrixWorld;r!==void 0&&(i.boundingSphere===null&&i.computeBoundingSphere(),ic.copy(i.boundingSphere),ic.applyMatrix4(s),Mr.copy(t.ray).recast(t.near),!(ic.containsPoint(Mr.origin)===!1&&(Mr.intersectSphere(ic,fm)===null||Mr.origin.distanceToSquared(fm)>(t.far-t.near)**2))&&(um.copy(s).invert(),Mr.copy(t.ray).applyMatrix4(um),!(i.boundingBox!==null&&Mr.intersectsBox(i.boundingBox)===!1)&&this._computeIntersections(t,n,Mr)))}_computeIntersections(t,n,i){let r,s=this.geometry,o=this.material,a=s.index,c=s.attributes.position,l=s.attributes.uv,u=s.attributes.uv1,h=s.attributes.normal,d=s.groups,f=s.drawRange;if(a!==null)if(Array.isArray(o))for(let m=0,_=d.length;m<_;m++){let g=d[m],p=o[g.materialIndex],b=Math.max(g.start,f.start),x=Math.min(a.count,Math.min(g.start+g.count,f.start+f.count));for(let v=b,M=x;v<M;v+=3){let S=a.getX(v),C=a.getX(v+1),P=a.getX(v+2);r=lc(this,p,t,i,l,u,h,S,C,P),r&&(r.faceIndex=Math.floor(v/3),r.face.materialIndex=g.materialIndex,n.push(r))}}else{let m=Math.max(0,f.start),_=Math.min(a.count,f.start+f.count);for(let g=m,p=_;g<p;g+=3){let b=a.getX(g),x=a.getX(g+1),v=a.getX(g+2);r=lc(this,o,t,i,l,u,h,b,x,v),r&&(r.faceIndex=Math.floor(g/3),n.push(r))}}else if(c!==void 0)if(Array.isArray(o))for(let m=0,_=d.length;m<_;m++){let g=d[m],p=o[g.materialIndex],b=Math.max(g.start,f.start),x=Math.min(c.count,Math.min(g.start+g.count,f.start+f.count));for(let v=b,M=x;v<M;v+=3){let S=v,C=v+1,P=v+2;r=lc(this,p,t,i,l,u,h,S,C,P),r&&(r.faceIndex=Math.floor(v/3),r.face.materialIndex=g.materialIndex,n.push(r))}}else{let m=Math.max(0,f.start),_=Math.min(c.count,f.start+f.count);for(let g=m,p=_;g<p;g+=3){let b=g,x=g+1,v=g+2;r=lc(this,o,t,i,l,u,h,b,x,v),r&&(r.faceIndex=Math.floor(g/3),n.push(r))}}}};function Ob(e,t,n,i,r,s,o,a){let c;if(t.side===We?c=i.intersectTriangle(o,s,r,!0,a):c=i.intersectTriangle(r,s,o,t.side===Pi,a),c===null)return null;cc.copy(a),cc.applyMatrix4(e.matrixWorld);let l=n.ray.origin.distanceTo(cc);return l<n.near||l>n.far?null:{distance:l,point:cc.clone(),object:e}}function lc(e,t,n,i,r,s,o,a,c,l){e.getVertexPosition(a,rc),e.getVertexPosition(c,sc),e.getVertexPosition(l,oc);let u=Ob(e,t,n,i,rc,sc,oc,dm);if(u){let h=new I;Ai.getBarycoord(dm,rc,sc,oc,h),r&&(u.uv=Ai.getInterpolatedAttribute(r,a,c,l,h,new it)),s&&(u.uv1=Ai.getInterpolatedAttribute(s,a,c,l,h,new it)),o&&(u.normal=Ai.getInterpolatedAttribute(o,a,c,l,h,new I),u.normal.dot(i.direction)>0&&u.normal.multiplyScalar(-1));let d={a,b:c,c:l,normal:new I,materialIndex:0};Ai.getNormal(rc,sc,oc,d.normal),u.face=d,u.barycoord=h}return u}var ws=class e extends ve{constructor(t=1,n=1,i=1,r=1,s=1,o=1){super(),this.type="BoxGeometry",this.parameters={width:t,height:n,depth:i,widthSegments:r,heightSegments:s,depthSegments:o};let a=this;r=Math.floor(r),s=Math.floor(s),o=Math.floor(o);let c=[],l=[],u=[],h=[],d=0,f=0;m("z","y","x",-1,-1,i,n,t,o,s,0),m("z","y","x",1,-1,i,n,-t,o,s,1),m("x","z","y",1,1,t,i,n,r,o,2),m("x","z","y",1,-1,t,i,-n,r,o,3),m("x","y","z",1,-1,t,n,i,r,s,4),m("x","y","z",-1,-1,t,n,-i,r,s,5),this.setIndex(c),this.setAttribute("position",new ce(l,3)),this.setAttribute("normal",new ce(u,3)),this.setAttribute("uv",new ce(h,2));function m(_,g,p,b,x,v,M,S,C,P,T){let w=v/C,R=M/P,V=v/2,N=M/2,k=S/2,z=C+1,G=P+1,K=0,j=0,at=new I;for(let _t=0;_t<G;_t++){let $=_t*R-N;for(let rt=0;rt<z;rt++){let pt=rt*w-V;at[_]=pt*b,at[g]=$*x,at[p]=k,l.push(at.x,at.y,at.z),at[_]=0,at[g]=0,at[p]=S>0?1:-1,u.push(at.x,at.y,at.z),h.push(rt/C),h.push(1-_t/P),K+=1}}for(let _t=0;_t<P;_t++)for(let $=0;$<C;$++){let rt=d+$+z*_t,pt=d+$+z*(_t+1),zt=d+($+1)+z*(_t+1),Lt=d+($+1)+z*_t;c.push(rt,pt,Lt),c.push(pt,zt,Lt),j+=6}a.addGroup(f,j,T),f+=j,d+=K}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new e(t.width,t.height,t.depth,t.widthSegments,t.heightSegments,t.depthSegments)}};function Or(e){let t={};for(let n in e){t[n]={};for(let i in e[n]){let r=e[n][i];r&&(r.isColor||r.isMatrix3||r.isMatrix4||r.isVector2||r.isVector3||r.isVector4||r.isTexture||r.isQuaternion)?r.isRenderTargetTexture?(console.warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),t[n][i]=null):t[n][i]=r.clone():Array.isArray(r)?t[n][i]=r.slice():t[n][i]=r}}return t}function Je(e){let t={};for(let n=0;n<e.length;n++){let i=Or(e[n]);for(let r in i)t[r]=i[r]}return t}function Nb(e){let t=[];for(let n=0;n<e.length;n++)t.push(e[n].clone());return t}function Df(e){let t=e.getRenderTarget();return t===null?e.outputColorSpace:t.isXRRenderTarget===!0?t.texture.colorSpace:ie.workingColorSpace}var Fi={clone:Or,merge:Je},Fb=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,Ub=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`,Le=class extends Nn{constructor(t){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=Fb,this.fragmentShader=Ub,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,t!==void 0&&this.setValues(t)}copy(t){return super.copy(t),this.fragmentShader=t.fragmentShader,this.vertexShader=t.vertexShader,this.uniforms=Or(t.uniforms),this.uniformsGroups=Nb(t.uniformsGroups),this.defines=Object.assign({},t.defines),this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.fog=t.fog,this.lights=t.lights,this.clipping=t.clipping,this.extensions=Object.assign({},t.extensions),this.glslVersion=t.glslVersion,this}toJSON(t){let n=super.toJSON(t);n.glslVersion=this.glslVersion,n.uniforms={};for(let r in this.uniforms){let o=this.uniforms[r].value;o&&o.isTexture?n.uniforms[r]={type:"t",value:o.toJSON(t).uuid}:o&&o.isColor?n.uniforms[r]={type:"c",value:o.getHex()}:o&&o.isVector2?n.uniforms[r]={type:"v2",value:o.toArray()}:o&&o.isVector3?n.uniforms[r]={type:"v3",value:o.toArray()}:o&&o.isVector4?n.uniforms[r]={type:"v4",value:o.toArray()}:o&&o.isMatrix3?n.uniforms[r]={type:"m3",value:o.toArray()}:o&&o.isMatrix4?n.uniforms[r]={type:"m4",value:o.toArray()}:n.uniforms[r]={value:o}}Object.keys(this.defines).length>0&&(n.defines=this.defines),n.vertexShader=this.vertexShader,n.fragmentShader=this.fragmentShader,n.lights=this.lights,n.clipping=this.clipping;let i={};for(let r in this.extensions)this.extensions[r]===!0&&(i[r]=!0);return Object.keys(i).length>0&&(n.extensions=i),n}},Do=class extends Be{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new Vt,this.projectionMatrix=new Vt,this.projectionMatrixInverse=new Vt,this.coordinateSystem=Zn,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(t,n){return super.copy(t,n),this.matrixWorldInverse.copy(t.matrixWorldInverse),this.projectionMatrix.copy(t.projectionMatrix),this.projectionMatrixInverse.copy(t.projectionMatrixInverse),this.coordinateSystem=t.coordinateSystem,this}getWorldDirection(t){return super.getWorldDirection(t).negate()}updateMatrixWorld(t){super.updateMatrixWorld(t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(t,n){super.updateWorldMatrix(t,n),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}},Xi=new I,pm=new it,mm=new it,Ge=class extends Do{constructor(t=50,n=1,i=.1,r=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=t,this.zoom=1,this.near=i,this.far=r,this.focus=10,this.aspect=n,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(t,n){return super.copy(t,n),this.fov=t.fov,this.zoom=t.zoom,this.near=t.near,this.far=t.far,this.focus=t.focus,this.aspect=t.aspect,this.view=t.view===null?null:Object.assign({},t.view),this.filmGauge=t.filmGauge,this.filmOffset=t.filmOffset,this}setFocalLength(t){let n=.5*this.getFilmHeight()/t;this.fov=ys*2*Math.atan(n),this.updateProjectionMatrix()}getFocalLength(){let t=Math.tan(Mo*.5*this.fov);return .5*this.getFilmHeight()/t}getEffectiveFOV(){return ys*2*Math.atan(Math.tan(Mo*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(t,n,i){Xi.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(Xi.x,Xi.y).multiplyScalar(-t/Xi.z),Xi.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),i.set(Xi.x,Xi.y).multiplyScalar(-t/Xi.z)}getViewSize(t,n){return this.getViewBounds(t,pm,mm),n.subVectors(mm,pm)}setViewOffset(t,n,i,r,s,o){this.aspect=t/n,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=n,this.view.offsetX=i,this.view.offsetY=r,this.view.width=s,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let t=this.near,n=t*Math.tan(Mo*.5*this.fov)/this.zoom,i=2*n,r=this.aspect*i,s=-.5*r,o=this.view;if(this.view!==null&&this.view.enabled){let c=o.fullWidth,l=o.fullHeight;s+=o.offsetX*r/c,n-=o.offsetY*i/l,r*=o.width/c,i*=o.height/l}let a=this.filmOffset;a!==0&&(s+=t*a/this.getFilmWidth()),this.projectionMatrix.makePerspective(s,s+r,n,n-i,t,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){let n=super.toJSON(t);return n.object.fov=this.fov,n.object.zoom=this.zoom,n.object.near=this.near,n.object.far=this.far,n.object.focus=this.focus,n.object.aspect=this.aspect,this.view!==null&&(n.object.view=Object.assign({},this.view)),n.object.filmGauge=this.filmGauge,n.object.filmOffset=this.filmOffset,n}},hs=-90,us=1,Ic=class extends Be{constructor(t,n,i){super(),this.type="CubeCamera",this.renderTarget=i,this.coordinateSystem=null,this.activeMipmapLevel=0;let r=new Ge(hs,us,t,n);r.layers=this.layers,this.add(r);let s=new Ge(hs,us,t,n);s.layers=this.layers,this.add(s);let o=new Ge(hs,us,t,n);o.layers=this.layers,this.add(o);let a=new Ge(hs,us,t,n);a.layers=this.layers,this.add(a);let c=new Ge(hs,us,t,n);c.layers=this.layers,this.add(c);let l=new Ge(hs,us,t,n);l.layers=this.layers,this.add(l)}updateCoordinateSystem(){let t=this.coordinateSystem,n=this.children.concat(),[i,r,s,o,a,c]=n;for(let l of n)this.remove(l);if(t===Zn)i.up.set(0,1,0),i.lookAt(1,0,0),r.up.set(0,1,0),r.lookAt(-1,0,0),s.up.set(0,0,-1),s.lookAt(0,1,0),o.up.set(0,0,1),o.lookAt(0,-1,0),a.up.set(0,1,0),a.lookAt(0,0,1),c.up.set(0,1,0),c.lookAt(0,0,-1);else if(t===Co)i.up.set(0,-1,0),i.lookAt(-1,0,0),r.up.set(0,-1,0),r.lookAt(1,0,0),s.up.set(0,0,1),s.lookAt(0,1,0),o.up.set(0,0,-1),o.lookAt(0,-1,0),a.up.set(0,-1,0),a.lookAt(0,0,1),c.up.set(0,-1,0),c.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+t);for(let l of n)this.add(l),l.updateMatrixWorld()}update(t,n){this.parent===null&&this.updateMatrixWorld();let{renderTarget:i,activeMipmapLevel:r}=this;this.coordinateSystem!==t.coordinateSystem&&(this.coordinateSystem=t.coordinateSystem,this.updateCoordinateSystem());let[s,o,a,c,l,u]=this.children,h=t.getRenderTarget(),d=t.getActiveCubeFace(),f=t.getActiveMipmapLevel(),m=t.xr.enabled;t.xr.enabled=!1;let _=i.texture.generateMipmaps;i.texture.generateMipmaps=!1,t.setRenderTarget(i,0,r),t.render(n,s),t.setRenderTarget(i,1,r),t.render(n,o),t.setRenderTarget(i,2,r),t.render(n,a),t.setRenderTarget(i,3,r),t.render(n,c),t.setRenderTarget(i,4,r),t.render(n,l),i.texture.generateMipmaps=_,t.setRenderTarget(i,5,r),t.render(n,u),t.setRenderTarget(h,d,f),t.xr.enabled=m,i.texture.needsPMREMUpdate=!0}},Lo=class extends an{constructor(t=[],n=Dr,i,r,s,o,a,c,l,u){super(t,n,i,r,s,o,a,c,l,u),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(t){this.image=t}},Dc=class extends Ke{constructor(t=1,n={}){super(t,t,n),this.isWebGLCubeRenderTarget=!0;let i={width:t,height:t,depth:1},r=[i,i,i,i,i,i];this.texture=new Lo(r),this._setTextureOptions(n),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(t,n){this.texture.type=n.type,this.texture.colorSpace=n.colorSpace,this.texture.generateMipmaps=n.generateMipmaps,this.texture.minFilter=n.minFilter,this.texture.magFilter=n.magFilter;let i={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},r=new ws(5,5,5),s=new Le({name:"CubemapFromEquirect",uniforms:Or(i.uniforms),vertexShader:i.vertexShader,fragmentShader:i.fragmentShader,side:We,blending:Qn});s.uniforms.tEquirect.value=n;let o=new we(r,s),a=n.minFilter;return n.minFilter===Qi&&(n.minFilter=Kn),new Ic(1,10,this).update(t,o),n.minFilter=a,o.geometry.dispose(),o.material.dispose(),this}clear(t,n=!0,i=!0,r=!0){let s=t.getRenderTarget();for(let o=0;o<6;o++)t.setRenderTarget(this,o),t.clear(n,i,r);t.setRenderTarget(s)}},Ye=class extends Be{constructor(){super(),this.isGroup=!0,this.type="Group"}},zb={type:"move"},Es=class{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Ye,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Ye,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new I,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new I),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Ye,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new I,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new I),this._grip}dispatchEvent(t){return this._targetRay!==null&&this._targetRay.dispatchEvent(t),this._grip!==null&&this._grip.dispatchEvent(t),this._hand!==null&&this._hand.dispatchEvent(t),this}connect(t){if(t&&t.hand){let n=this._hand;if(n)for(let i of t.hand.values())this._getHandJoint(n,i)}return this.dispatchEvent({type:"connected",data:t}),this}disconnect(t){return this.dispatchEvent({type:"disconnected",data:t}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(t,n,i){let r=null,s=null,o=null,a=this._targetRay,c=this._grip,l=this._hand;if(t&&n.session.visibilityState!=="visible-blurred"){if(l&&t.hand){o=!0;for(let _ of t.hand.values()){let g=n.getJointPose(_,i),p=this._getHandJoint(l,_);g!==null&&(p.matrix.fromArray(g.transform.matrix),p.matrix.decompose(p.position,p.rotation,p.scale),p.matrixWorldNeedsUpdate=!0,p.jointRadius=g.radius),p.visible=g!==null}let u=l.joints["index-finger-tip"],h=l.joints["thumb-tip"],d=u.position.distanceTo(h.position),f=.02,m=.005;l.inputState.pinching&&d>f+m?(l.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:t.handedness,target:this})):!l.inputState.pinching&&d<=f-m&&(l.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:t.handedness,target:this}))}else c!==null&&t.gripSpace&&(s=n.getPose(t.gripSpace,i),s!==null&&(c.matrix.fromArray(s.transform.matrix),c.matrix.decompose(c.position,c.rotation,c.scale),c.matrixWorldNeedsUpdate=!0,s.linearVelocity?(c.hasLinearVelocity=!0,c.linearVelocity.copy(s.linearVelocity)):c.hasLinearVelocity=!1,s.angularVelocity?(c.hasAngularVelocity=!0,c.angularVelocity.copy(s.angularVelocity)):c.hasAngularVelocity=!1));a!==null&&(r=n.getPose(t.targetRaySpace,i),r===null&&s!==null&&(r=s),r!==null&&(a.matrix.fromArray(r.transform.matrix),a.matrix.decompose(a.position,a.rotation,a.scale),a.matrixWorldNeedsUpdate=!0,r.linearVelocity?(a.hasLinearVelocity=!0,a.linearVelocity.copy(r.linearVelocity)):a.hasLinearVelocity=!1,r.angularVelocity?(a.hasAngularVelocity=!0,a.angularVelocity.copy(r.angularVelocity)):a.hasAngularVelocity=!1,this.dispatchEvent(zb)))}return a!==null&&(a.visible=r!==null),c!==null&&(c.visible=s!==null),l!==null&&(l.visible=o!==null),this}_getHandJoint(t,n){if(t.joints[n.jointName]===void 0){let i=new Ye;i.matrixAutoUpdate=!1,i.visible=!1,t.joints[n.jointName]=i,t.add(i)}return t.joints[n.jointName]}},Oo=class e{constructor(t,n=25e-5){this.isFogExp2=!0,this.name="",this.color=new Ot(t),this.density=n}clone(){return new e(this.color,this.density)}toJSON(){return{type:"FogExp2",name:this.name,color:this.color.getHex(),density:this.density}}};var No=class extends Be{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new On,this.environmentIntensity=1,this.environmentRotation=new On,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__!="undefined"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(t,n){return super.copy(t,n),t.background!==null&&(this.background=t.background.clone()),t.environment!==null&&(this.environment=t.environment.clone()),t.fog!==null&&(this.fog=t.fog.clone()),this.backgroundBlurriness=t.backgroundBlurriness,this.backgroundIntensity=t.backgroundIntensity,this.backgroundRotation.copy(t.backgroundRotation),this.environmentIntensity=t.environmentIntensity,this.environmentRotation.copy(t.environmentRotation),t.overrideMaterial!==null&&(this.overrideMaterial=t.overrideMaterial.clone()),this.matrixAutoUpdate=t.matrixAutoUpdate,this}toJSON(t){let n=super.toJSON(t);return this.fog!==null&&(n.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(n.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(n.object.backgroundIntensity=this.backgroundIntensity),n.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(n.object.environmentIntensity=this.environmentIntensity),n.object.environmentRotation=this.environmentRotation.toArray(),n}},Lc=class{constructor(t,n){this.isInterleavedBuffer=!0,this.array=t,this.stride=n,this.count=t!==void 0?t.length/n:0,this.usage=Ac,this.updateRanges=[],this.version=0,this.uuid=Ci()}onUploadCallback(){}set needsUpdate(t){t===!0&&this.version++}setUsage(t){return this.usage=t,this}addUpdateRange(t,n){this.updateRanges.push({start:t,count:n})}clearUpdateRanges(){this.updateRanges.length=0}copy(t){return this.array=new t.array.constructor(t.array),this.count=t.count,this.stride=t.stride,this.usage=t.usage,this}copyAt(t,n,i){t*=this.stride,i*=n.stride;for(let r=0,s=this.stride;r<s;r++)this.array[t+r]=n.array[i+r];return this}set(t,n=0){return this.array.set(t,n),this}clone(t){t.arrayBuffers===void 0&&(t.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=Ci()),t.arrayBuffers[this.array.buffer._uuid]===void 0&&(t.arrayBuffers[this.array.buffer._uuid]=this.array.slice(0).buffer);let n=new this.array.constructor(t.arrayBuffers[this.array.buffer._uuid]),i=new this.constructor(n,this.stride);return i.setUsage(this.usage),i}onUpload(t){return this.onUploadCallback=t,this}toJSON(t){return t.arrayBuffers===void 0&&(t.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=Ci()),t.arrayBuffers[this.array.buffer._uuid]===void 0&&(t.arrayBuffers[this.array.buffer._uuid]=Array.from(new Uint32Array(this.array.buffer))),{uuid:this.uuid,buffer:this.array.buffer._uuid,type:this.array.constructor.name,stride:this.stride}}},on=new I,Fo=class e{constructor(t,n,i,r=!1){this.isInterleavedBufferAttribute=!0,this.name="",this.data=t,this.itemSize=n,this.offset=i,this.normalized=r}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(t){this.data.needsUpdate=t}applyMatrix4(t){for(let n=0,i=this.data.count;n<i;n++)on.fromBufferAttribute(this,n),on.applyMatrix4(t),this.setXYZ(n,on.x,on.y,on.z);return this}applyNormalMatrix(t){for(let n=0,i=this.count;n<i;n++)on.fromBufferAttribute(this,n),on.applyNormalMatrix(t),this.setXYZ(n,on.x,on.y,on.z);return this}transformDirection(t){for(let n=0,i=this.count;n<i;n++)on.fromBufferAttribute(this,n),on.transformDirection(t),this.setXYZ(n,on.x,on.y,on.z);return this}getComponent(t,n){let i=this.array[t*this.data.stride+this.offset+n];return this.normalized&&(i=Yn(i,this.array)),i}setComponent(t,n,i){return this.normalized&&(i=fe(i,this.array)),this.data.array[t*this.data.stride+this.offset+n]=i,this}setX(t,n){return this.normalized&&(n=fe(n,this.array)),this.data.array[t*this.data.stride+this.offset]=n,this}setY(t,n){return this.normalized&&(n=fe(n,this.array)),this.data.array[t*this.data.stride+this.offset+1]=n,this}setZ(t,n){return this.normalized&&(n=fe(n,this.array)),this.data.array[t*this.data.stride+this.offset+2]=n,this}setW(t,n){return this.normalized&&(n=fe(n,this.array)),this.data.array[t*this.data.stride+this.offset+3]=n,this}getX(t){let n=this.data.array[t*this.data.stride+this.offset];return this.normalized&&(n=Yn(n,this.array)),n}getY(t){let n=this.data.array[t*this.data.stride+this.offset+1];return this.normalized&&(n=Yn(n,this.array)),n}getZ(t){let n=this.data.array[t*this.data.stride+this.offset+2];return this.normalized&&(n=Yn(n,this.array)),n}getW(t){let n=this.data.array[t*this.data.stride+this.offset+3];return this.normalized&&(n=Yn(n,this.array)),n}setXY(t,n,i){return t=t*this.data.stride+this.offset,this.normalized&&(n=fe(n,this.array),i=fe(i,this.array)),this.data.array[t+0]=n,this.data.array[t+1]=i,this}setXYZ(t,n,i,r){return t=t*this.data.stride+this.offset,this.normalized&&(n=fe(n,this.array),i=fe(i,this.array),r=fe(r,this.array)),this.data.array[t+0]=n,this.data.array[t+1]=i,this.data.array[t+2]=r,this}setXYZW(t,n,i,r,s){return t=t*this.data.stride+this.offset,this.normalized&&(n=fe(n,this.array),i=fe(i,this.array),r=fe(r,this.array),s=fe(s,this.array)),this.data.array[t+0]=n,this.data.array[t+1]=i,this.data.array[t+2]=r,this.data.array[t+3]=s,this}clone(t){if(t===void 0){console.log("THREE.InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.");let n=[];for(let i=0;i<this.count;i++){let r=i*this.data.stride+this.offset;for(let s=0;s<this.itemSize;s++)n.push(this.data.array[r+s])}return new Ze(new this.array.constructor(n),this.itemSize,this.normalized)}else return t.interleavedBuffers===void 0&&(t.interleavedBuffers={}),t.interleavedBuffers[this.data.uuid]===void 0&&(t.interleavedBuffers[this.data.uuid]=this.data.clone(t)),new e(t.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}toJSON(t){if(t===void 0){console.log("THREE.InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.");let n=[];for(let i=0;i<this.count;i++){let r=i*this.data.stride+this.offset;for(let s=0;s<this.itemSize;s++)n.push(this.data.array[r+s])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:n,normalized:this.normalized}}else return t.interleavedBuffers===void 0&&(t.interleavedBuffers={}),t.interleavedBuffers[this.data.uuid]===void 0&&(t.interleavedBuffers[this.data.uuid]=this.data.toJSON(t)),{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}},li=class extends Nn{constructor(t){super(),this.isSpriteMaterial=!0,this.type="SpriteMaterial",this.color=new Ot(16777215),this.map=null,this.alphaMap=null,this.rotation=0,this.sizeAttenuation=!0,this.transparent=!0,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.alphaMap=t.alphaMap,this.rotation=t.rotation,this.sizeAttenuation=t.sizeAttenuation,this.fog=t.fog,this}},fs,_o=new I,ds=new I,ps=new I,ms=new it,vo=new it,dg=new Vt,hc=new I,yo=new I,uc=new I,gm=new it,Ku=new it,_m=new it,hi=class extends Be{constructor(t=new li){if(super(),this.isSprite=!0,this.type="Sprite",fs===void 0){fs=new ve;let n=new Float32Array([-.5,-.5,0,0,0,.5,-.5,0,1,0,.5,.5,0,1,1,-.5,.5,0,0,1]),i=new Lc(n,5);fs.setIndex([0,1,2,0,2,3]),fs.setAttribute("position",new Fo(i,3,0,!1)),fs.setAttribute("uv",new Fo(i,2,3,!1))}this.geometry=fs,this.material=t,this.center=new it(.5,.5),this.count=1}raycast(t,n){t.camera===null&&console.error('THREE.Sprite: "Raycaster.camera" needs to be set in order to raycast against sprites.'),ds.setFromMatrixScale(this.matrixWorld),dg.copy(t.camera.matrixWorld),this.modelViewMatrix.multiplyMatrices(t.camera.matrixWorldInverse,this.matrixWorld),ps.setFromMatrixPosition(this.modelViewMatrix),t.camera.isPerspectiveCamera&&this.material.sizeAttenuation===!1&&ds.multiplyScalar(-ps.z);let i=this.material.rotation,r,s;i!==0&&(s=Math.cos(i),r=Math.sin(i));let o=this.center;fc(hc.set(-.5,-.5,0),ps,o,ds,r,s),fc(yo.set(.5,-.5,0),ps,o,ds,r,s),fc(uc.set(.5,.5,0),ps,o,ds,r,s),gm.set(0,0),Ku.set(1,0),_m.set(1,1);let a=t.ray.intersectTriangle(hc,yo,uc,!1,_o);if(a===null&&(fc(yo.set(-.5,.5,0),ps,o,ds,r,s),Ku.set(0,1),a=t.ray.intersectTriangle(hc,uc,yo,!1,_o),a===null))return;let c=t.ray.origin.distanceTo(_o);c<t.near||c>t.far||n.push({distance:c,point:_o.clone(),uv:Ai.getInterpolation(_o,hc,yo,uc,gm,Ku,_m,new it),face:null,object:this})}copy(t,n){return super.copy(t,n),t.center!==void 0&&this.center.copy(t.center),this.material=t.material,this}};function fc(e,t,n,i,r,s){ms.subVectors(e,n).addScalar(.5).multiply(i),r!==void 0?(vo.x=s*ms.x-r*ms.y,vo.y=r*ms.x+s*ms.y):vo.copy(ms),e.copy(t),e.x+=vo.x,e.y+=vo.y,e.applyMatrix4(dg)}var Ju=new I,kb=new I,Bb=new Xt,dn=class{constructor(t=new I(1,0,0),n=0){this.isPlane=!0,this.normal=t,this.constant=n}set(t,n){return this.normal.copy(t),this.constant=n,this}setComponents(t,n,i,r){return this.normal.set(t,n,i),this.constant=r,this}setFromNormalAndCoplanarPoint(t,n){return this.normal.copy(t),this.constant=-n.dot(this.normal),this}setFromCoplanarPoints(t,n,i){let r=Ju.subVectors(i,n).cross(kb.subVectors(t,n)).normalize();return this.setFromNormalAndCoplanarPoint(r,t),this}copy(t){return this.normal.copy(t.normal),this.constant=t.constant,this}normalize(){let t=1/this.normal.length();return this.normal.multiplyScalar(t),this.constant*=t,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(t){return this.normal.dot(t)+this.constant}distanceToSphere(t){return this.distanceToPoint(t.center)-t.radius}projectPoint(t,n){return n.copy(t).addScaledVector(this.normal,-this.distanceToPoint(t))}intersectLine(t,n){let i=t.delta(Ju),r=this.normal.dot(i);if(r===0)return this.distanceToPoint(t.start)===0?n.copy(t.start):null;let s=-(t.start.dot(this.normal)+this.constant)/r;return s<0||s>1?null:n.copy(t.start).addScaledVector(i,s)}intersectsLine(t){let n=this.distanceToPoint(t.start),i=this.distanceToPoint(t.end);return n<0&&i>0||i<0&&n>0}intersectsBox(t){return t.intersectsPlane(this)}intersectsSphere(t){return t.intersectsPlane(this)}coplanarPoint(t){return t.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(t,n){let i=n||Bb.getNormalMatrix(t),r=this.coplanarPoint(Ju).applyMatrix4(t),s=this.normal.applyMatrix3(i).normalize();return this.constant=-r.dot(s),this}translate(t){return this.constant-=t.dot(this.normal),this}equals(t){return t.normal.equals(this.normal)&&t.constant===this.constant}clone(){return new this.constructor().copy(this)}},Sr=new ci,Vb=new it(.5,.5),dc=new I,Ts=class{constructor(t=new dn,n=new dn,i=new dn,r=new dn,s=new dn,o=new dn){this.planes=[t,n,i,r,s,o]}set(t,n,i,r,s,o){let a=this.planes;return a[0].copy(t),a[1].copy(n),a[2].copy(i),a[3].copy(r),a[4].copy(s),a[5].copy(o),this}copy(t){let n=this.planes;for(let i=0;i<6;i++)n[i].copy(t.planes[i]);return this}setFromProjectionMatrix(t,n=Zn,i=!1){let r=this.planes,s=t.elements,o=s[0],a=s[1],c=s[2],l=s[3],u=s[4],h=s[5],d=s[6],f=s[7],m=s[8],_=s[9],g=s[10],p=s[11],b=s[12],x=s[13],v=s[14],M=s[15];if(r[0].setComponents(l-o,f-u,p-m,M-b).normalize(),r[1].setComponents(l+o,f+u,p+m,M+b).normalize(),r[2].setComponents(l+a,f+h,p+_,M+x).normalize(),r[3].setComponents(l-a,f-h,p-_,M-x).normalize(),i)r[4].setComponents(c,d,g,v).normalize(),r[5].setComponents(l-c,f-d,p-g,M-v).normalize();else if(r[4].setComponents(l-c,f-d,p-g,M-v).normalize(),n===Zn)r[5].setComponents(l+c,f+d,p+g,M+v).normalize();else if(n===Co)r[5].setComponents(c,d,g,v).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+n);return this}intersectsObject(t){if(t.boundingSphere!==void 0)t.boundingSphere===null&&t.computeBoundingSphere(),Sr.copy(t.boundingSphere).applyMatrix4(t.matrixWorld);else{let n=t.geometry;n.boundingSphere===null&&n.computeBoundingSphere(),Sr.copy(n.boundingSphere).applyMatrix4(t.matrixWorld)}return this.intersectsSphere(Sr)}intersectsSprite(t){Sr.center.set(0,0,0);let n=Vb.distanceTo(t.center);return Sr.radius=.7071067811865476+n,Sr.applyMatrix4(t.matrixWorld),this.intersectsSphere(Sr)}intersectsSphere(t){let n=this.planes,i=t.center,r=-t.radius;for(let s=0;s<6;s++)if(n[s].distanceToPoint(i)<r)return!1;return!0}intersectsBox(t){let n=this.planes;for(let i=0;i<6;i++){let r=n[i];if(dc.x=r.normal.x>0?t.max.x:t.min.x,dc.y=r.normal.y>0?t.max.y:t.min.y,dc.z=r.normal.z>0?t.max.z:t.min.z,r.distanceToPoint(dc)<0)return!1}return!0}containsPoint(t){let n=this.planes;for(let i=0;i<6;i++)if(n[i].distanceToPoint(t)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}};var Jn=class extends Nn{constructor(t){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new Ot(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.linewidth=t.linewidth,this.linecap=t.linecap,this.linejoin=t.linejoin,this.fog=t.fog,this}},Oc=new I,Nc=new I,vm=new Vt,xo=new Ii,pc=new ci,Qu=new I,ym=new I,ui=class extends Be{constructor(t=new ve,n=new Jn){super(),this.isLine=!0,this.type="Line",this.geometry=t,this.material=n,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(t,n){return super.copy(t,n),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}computeLineDistances(){let t=this.geometry;if(t.index===null){let n=t.attributes.position,i=[0];for(let r=1,s=n.count;r<s;r++)Oc.fromBufferAttribute(n,r-1),Nc.fromBufferAttribute(n,r),i[r]=i[r-1],i[r]+=Oc.distanceTo(Nc);t.setAttribute("lineDistance",new ce(i,1))}else console.warn("THREE.Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}raycast(t,n){let i=this.geometry,r=this.matrixWorld,s=t.params.Line.threshold,o=i.drawRange;if(i.boundingSphere===null&&i.computeBoundingSphere(),pc.copy(i.boundingSphere),pc.applyMatrix4(r),pc.radius+=s,t.ray.intersectsSphere(pc)===!1)return;vm.copy(r).invert(),xo.copy(t.ray).applyMatrix4(vm);let a=s/((this.scale.x+this.scale.y+this.scale.z)/3),c=a*a,l=this.isLineSegments?2:1,u=i.index,d=i.attributes.position;if(u!==null){let f=Math.max(0,o.start),m=Math.min(u.count,o.start+o.count);for(let _=f,g=m-1;_<g;_+=l){let p=u.getX(_),b=u.getX(_+1),x=mc(this,t,xo,c,p,b,_);x&&n.push(x)}if(this.isLineLoop){let _=u.getX(m-1),g=u.getX(f),p=mc(this,t,xo,c,_,g,m-1);p&&n.push(p)}}else{let f=Math.max(0,o.start),m=Math.min(d.count,o.start+o.count);for(let _=f,g=m-1;_<g;_+=l){let p=mc(this,t,xo,c,_,_+1,_);p&&n.push(p)}if(this.isLineLoop){let _=mc(this,t,xo,c,m-1,f,m-1);_&&n.push(_)}}}updateMorphTargets(){let n=this.geometry.morphAttributes,i=Object.keys(n);if(i.length>0){let r=n[i[0]];if(r!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,o=r.length;s<o;s++){let a=r[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=s}}}}};function mc(e,t,n,i,r,s,o){let a=e.geometry.attributes.position;if(Oc.fromBufferAttribute(a,r),Nc.fromBufferAttribute(a,s),n.distanceSqToSegment(Oc,Nc,Qu,ym)>i)return;Qu.applyMatrix4(e.matrixWorld);let l=t.ray.origin.distanceTo(Qu);if(!(l<t.near||l>t.far))return{distance:l,point:ym.clone().applyMatrix4(e.matrixWorld),index:o,face:null,faceIndex:null,barycoord:null,object:e}}var xm=new I,bm=new I,Fc=class extends ui{constructor(t,n){super(t,n),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){let t=this.geometry;if(t.index===null){let n=t.attributes.position,i=[];for(let r=0,s=n.count;r<s;r+=2)xm.fromBufferAttribute(n,r),bm.fromBufferAttribute(n,r+1),i[r]=r===0?0:i[r-1],i[r+1]=i[r]+xm.distanceTo(bm);t.setAttribute("lineDistance",new ce(i,1))}else console.warn("THREE.LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}};var As=class extends Nn{constructor(t){super(),this.isPointsMaterial=!0,this.type="PointsMaterial",this.color=new Ot(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.alphaMap=t.alphaMap,this.size=t.size,this.sizeAttenuation=t.sizeAttenuation,this.fog=t.fog,this}},Mm=new Vt,hf=new Ii,gc=new ci,_c=new I,Uo=class extends Be{constructor(t=new ve,n=new As){super(),this.isPoints=!0,this.type="Points",this.geometry=t,this.material=n,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(t,n){return super.copy(t,n),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}raycast(t,n){let i=this.geometry,r=this.matrixWorld,s=t.params.Points.threshold,o=i.drawRange;if(i.boundingSphere===null&&i.computeBoundingSphere(),gc.copy(i.boundingSphere),gc.applyMatrix4(r),gc.radius+=s,t.ray.intersectsSphere(gc)===!1)return;Mm.copy(r).invert(),hf.copy(t.ray).applyMatrix4(Mm);let a=s/((this.scale.x+this.scale.y+this.scale.z)/3),c=a*a,l=i.index,h=i.attributes.position;if(l!==null){let d=Math.max(0,o.start),f=Math.min(l.count,o.start+o.count);for(let m=d,_=f;m<_;m++){let g=l.getX(m);_c.fromBufferAttribute(h,g),Sm(_c,g,c,r,t,n,this)}}else{let d=Math.max(0,o.start),f=Math.min(h.count,o.start+o.count);for(let m=d,_=f;m<_;m++)_c.fromBufferAttribute(h,m),Sm(_c,m,c,r,t,n,this)}}updateMorphTargets(){let n=this.geometry.morphAttributes,i=Object.keys(n);if(i.length>0){let r=n[i[0]];if(r!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,o=r.length;s<o;s++){let a=r[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=s}}}}};function Sm(e,t,n,i,r,s,o){let a=hf.distanceSqToPoint(e);if(a<n){let c=new I;hf.closestPointToPoint(e,c),c.applyMatrix4(i);let l=r.ray.origin.distanceTo(c);if(l<r.near||l>r.far)return;s.push({distance:l,distanceToRay:Math.sqrt(a),point:c,index:t,face:null,faceIndex:null,barycoord:null,object:o})}}var zo=class extends an{constructor(t,n,i,r,s,o,a,c,l){super(t,n,i,r,s,o,a,c,l),this.isCanvasTexture=!0,this.needsUpdate=!0}},ko=class extends an{constructor(t,n,i=tr,r,s,o,a=Ln,c=Ln,l,u=vs,h=1){if(u!==vs&&u!==Ns)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");let d={width:t,height:n,depth:h};super(d,r,s,o,a,c,u,i,l),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(t){return super.copy(t),this.source=new Ms(Object.assign({},t.image)),this.compareFunction=t.compareFunction,this}toJSON(t){let n=super.toJSON(t);return this.compareFunction!==null&&(n.compareFunction=this.compareFunction),n}},Bo=class extends an{constructor(t=null){super(),this.sourceTexture=t,this.isExternalTexture=!0}copy(t){return super.copy(t),this.sourceTexture=t.sourceTexture,this}};var Cs=class e extends ve{constructor(t=1,n=1,i=1,r=32,s=1,o=!1,a=0,c=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:t,radiusBottom:n,height:i,radialSegments:r,heightSegments:s,openEnded:o,thetaStart:a,thetaLength:c};let l=this;r=Math.floor(r),s=Math.floor(s);let u=[],h=[],d=[],f=[],m=0,_=[],g=i/2,p=0;b(),o===!1&&(t>0&&x(!0),n>0&&x(!1)),this.setIndex(u),this.setAttribute("position",new ce(h,3)),this.setAttribute("normal",new ce(d,3)),this.setAttribute("uv",new ce(f,2));function b(){let v=new I,M=new I,S=0,C=(n-t)/i;for(let P=0;P<=s;P++){let T=[],w=P/s,R=w*(n-t)+t;for(let V=0;V<=r;V++){let N=V/r,k=N*c+a,z=Math.sin(k),G=Math.cos(k);M.x=R*z,M.y=-w*i+g,M.z=R*G,h.push(M.x,M.y,M.z),v.set(z,C,G).normalize(),d.push(v.x,v.y,v.z),f.push(N,1-w),T.push(m++)}_.push(T)}for(let P=0;P<r;P++)for(let T=0;T<s;T++){let w=_[T][P],R=_[T+1][P],V=_[T+1][P+1],N=_[T][P+1];(t>0||T!==0)&&(u.push(w,R,N),S+=3),(n>0||T!==s-1)&&(u.push(R,V,N),S+=3)}l.addGroup(p,S,0),p+=S}function x(v){let M=m,S=new it,C=new I,P=0,T=v===!0?t:n,w=v===!0?1:-1;for(let V=1;V<=r;V++)h.push(0,g*w,0),d.push(0,w,0),f.push(.5,.5),m++;let R=m;for(let V=0;V<=r;V++){let k=V/r*c+a,z=Math.cos(k),G=Math.sin(k);C.x=T*G,C.y=g*w,C.z=T*z,h.push(C.x,C.y,C.z),d.push(0,w,0),S.x=z*.5+.5,S.y=G*.5*w+.5,f.push(S.x,S.y),m++}for(let V=0;V<r;V++){let N=M+V,k=R+V;v===!0?u.push(k,k+1,N):u.push(k+1,k,N),P+=3}l.addGroup(p,P,v===!0?1:2),p+=P}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new e(t.radiusTop,t.radiusBottom,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}},Vo=class e extends Cs{constructor(t=1,n=1,i=32,r=1,s=!1,o=0,a=Math.PI*2){super(0,t,n,i,r,s,o,a),this.type="ConeGeometry",this.parameters={radius:t,height:n,radialSegments:i,heightSegments:r,openEnded:s,thetaStart:o,thetaLength:a}}static fromJSON(t){return new e(t.radius,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}};var Fn=class{constructor(){this.type="Curve",this.arcLengthDivisions=200,this.needsUpdate=!1,this.cacheArcLengths=null}getPoint(){console.warn("THREE.Curve: .getPoint() not implemented.")}getPointAt(t,n){let i=this.getUtoTmapping(t);return this.getPoint(i,n)}getPoints(t=5){let n=[];for(let i=0;i<=t;i++)n.push(this.getPoint(i/t));return n}getSpacedPoints(t=5){let n=[];for(let i=0;i<=t;i++)n.push(this.getPointAt(i/t));return n}getLength(){let t=this.getLengths();return t[t.length-1]}getLengths(t=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===t+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;let n=[],i,r=this.getPoint(0),s=0;n.push(0);for(let o=1;o<=t;o++)i=this.getPoint(o/t),s+=i.distanceTo(r),n.push(s),r=i;return this.cacheArcLengths=n,n}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(t,n=null){let i=this.getLengths(),r=0,s=i.length,o;n?o=n:o=t*i[s-1];let a=0,c=s-1,l;for(;a<=c;)if(r=Math.floor(a+(c-a)/2),l=i[r]-o,l<0)a=r+1;else if(l>0)c=r-1;else{c=r;break}if(r=c,i[r]===o)return r/(s-1);let u=i[r],d=i[r+1]-u,f=(o-u)/d;return(r+f)/(s-1)}getTangent(t,n){let r=t-1e-4,s=t+1e-4;r<0&&(r=0),s>1&&(s=1);let o=this.getPoint(r),a=this.getPoint(s),c=n||(o.isVector2?new it:new I);return c.copy(a).sub(o).normalize(),c}getTangentAt(t,n){let i=this.getUtoTmapping(t);return this.getTangent(i,n)}computeFrenetFrames(t,n=!1){let i=new I,r=[],s=[],o=[],a=new I,c=new Vt;for(let f=0;f<=t;f++){let m=f/t;r[f]=this.getTangentAt(m,new I)}s[0]=new I,o[0]=new I;let l=Number.MAX_VALUE,u=Math.abs(r[0].x),h=Math.abs(r[0].y),d=Math.abs(r[0].z);u<=l&&(l=u,i.set(1,0,0)),h<=l&&(l=h,i.set(0,1,0)),d<=l&&i.set(0,0,1),a.crossVectors(r[0],i).normalize(),s[0].crossVectors(r[0],a),o[0].crossVectors(r[0],s[0]);for(let f=1;f<=t;f++){if(s[f]=s[f-1].clone(),o[f]=o[f-1].clone(),a.crossVectors(r[f-1],r[f]),a.length()>Number.EPSILON){a.normalize();let m=Math.acos(Kt(r[f-1].dot(r[f]),-1,1));s[f].applyMatrix4(c.makeRotationAxis(a,m))}o[f].crossVectors(r[f],s[f])}if(n===!0){let f=Math.acos(Kt(s[0].dot(s[t]),-1,1));f/=t,r[0].dot(a.crossVectors(s[0],s[t]))>0&&(f=-f);for(let m=1;m<=t;m++)s[m].applyMatrix4(c.makeRotationAxis(r[m],f*m)),o[m].crossVectors(r[m],s[m])}return{tangents:r,normals:s,binormals:o}}clone(){return new this.constructor().copy(this)}copy(t){return this.arcLengthDivisions=t.arcLengthDivisions,this}toJSON(){let t={metadata:{version:4.7,type:"Curve",generator:"Curve.toJSON"}};return t.arcLengthDivisions=this.arcLengthDivisions,t.type=this.type,t}fromJSON(t){return this.arcLengthDivisions=t.arcLengthDivisions,this}},fi=class extends Fn{constructor(t=0,n=0,i=1,r=1,s=0,o=Math.PI*2,a=!1,c=0){super(),this.isEllipseCurve=!0,this.type="EllipseCurve",this.aX=t,this.aY=n,this.xRadius=i,this.yRadius=r,this.aStartAngle=s,this.aEndAngle=o,this.aClockwise=a,this.aRotation=c}getPoint(t,n=new it){let i=n,r=Math.PI*2,s=this.aEndAngle-this.aStartAngle,o=Math.abs(s)<Number.EPSILON;for(;s<0;)s+=r;for(;s>r;)s-=r;s<Number.EPSILON&&(o?s=0:s=r),this.aClockwise===!0&&!o&&(s===r?s=-r:s=s-r);let a=this.aStartAngle+t*s,c=this.aX+this.xRadius*Math.cos(a),l=this.aY+this.yRadius*Math.sin(a);if(this.aRotation!==0){let u=Math.cos(this.aRotation),h=Math.sin(this.aRotation),d=c-this.aX,f=l-this.aY;c=d*u-f*h+this.aX,l=d*h+f*u+this.aY}return i.set(c,l)}copy(t){return super.copy(t),this.aX=t.aX,this.aY=t.aY,this.xRadius=t.xRadius,this.yRadius=t.yRadius,this.aStartAngle=t.aStartAngle,this.aEndAngle=t.aEndAngle,this.aClockwise=t.aClockwise,this.aRotation=t.aRotation,this}toJSON(){let t=super.toJSON();return t.aX=this.aX,t.aY=this.aY,t.xRadius=this.xRadius,t.yRadius=this.yRadius,t.aStartAngle=this.aStartAngle,t.aEndAngle=this.aEndAngle,t.aClockwise=this.aClockwise,t.aRotation=this.aRotation,t}fromJSON(t){return super.fromJSON(t),this.aX=t.aX,this.aY=t.aY,this.xRadius=t.xRadius,this.yRadius=t.yRadius,this.aStartAngle=t.aStartAngle,this.aEndAngle=t.aEndAngle,this.aClockwise=t.aClockwise,this.aRotation=t.aRotation,this}},Uc=class extends fi{constructor(t,n,i,r,s,o){super(t,n,i,i,r,s,o),this.isArcCurve=!0,this.type="ArcCurve"}};function Lf(){let e=0,t=0,n=0,i=0;function r(s,o,a,c){e=s,t=a,n=-3*s+3*o-2*a-c,i=2*s-2*o+a+c}return{initCatmullRom:function(s,o,a,c,l){r(o,a,l*(a-s),l*(c-o))},initNonuniformCatmullRom:function(s,o,a,c,l,u,h){let d=(o-s)/l-(a-s)/(l+u)+(a-o)/u,f=(a-o)/u-(c-o)/(u+h)+(c-a)/h;d*=u,f*=u,r(o,a,d,f)},calc:function(s){let o=s*s,a=o*s;return e+t*s+n*o+i*a}}}var vc=new I,tf=new Lf,ef=new Lf,nf=new Lf,zc=class extends Fn{constructor(t=[],n=!1,i="centripetal",r=.5){super(),this.isCatmullRomCurve3=!0,this.type="CatmullRomCurve3",this.points=t,this.closed=n,this.curveType=i,this.tension=r}getPoint(t,n=new I){let i=n,r=this.points,s=r.length,o=(s-(this.closed?0:1))*t,a=Math.floor(o),c=o-a;this.closed?a+=a>0?0:(Math.floor(Math.abs(a)/s)+1)*s:c===0&&a===s-1&&(a=s-2,c=1);let l,u;this.closed||a>0?l=r[(a-1)%s]:(vc.subVectors(r[0],r[1]).add(r[0]),l=vc);let h=r[a%s],d=r[(a+1)%s];if(this.closed||a+2<s?u=r[(a+2)%s]:(vc.subVectors(r[s-1],r[s-2]).add(r[s-1]),u=vc),this.curveType==="centripetal"||this.curveType==="chordal"){let f=this.curveType==="chordal"?.5:.25,m=Math.pow(l.distanceToSquared(h),f),_=Math.pow(h.distanceToSquared(d),f),g=Math.pow(d.distanceToSquared(u),f);_<1e-4&&(_=1),m<1e-4&&(m=_),g<1e-4&&(g=_),tf.initNonuniformCatmullRom(l.x,h.x,d.x,u.x,m,_,g),ef.initNonuniformCatmullRom(l.y,h.y,d.y,u.y,m,_,g),nf.initNonuniformCatmullRom(l.z,h.z,d.z,u.z,m,_,g)}else this.curveType==="catmullrom"&&(tf.initCatmullRom(l.x,h.x,d.x,u.x,this.tension),ef.initCatmullRom(l.y,h.y,d.y,u.y,this.tension),nf.initCatmullRom(l.z,h.z,d.z,u.z,this.tension));return i.set(tf.calc(c),ef.calc(c),nf.calc(c)),i}copy(t){super.copy(t),this.points=[];for(let n=0,i=t.points.length;n<i;n++){let r=t.points[n];this.points.push(r.clone())}return this.closed=t.closed,this.curveType=t.curveType,this.tension=t.tension,this}toJSON(){let t=super.toJSON();t.points=[];for(let n=0,i=this.points.length;n<i;n++){let r=this.points[n];t.points.push(r.toArray())}return t.closed=this.closed,t.curveType=this.curveType,t.tension=this.tension,t}fromJSON(t){super.fromJSON(t),this.points=[];for(let n=0,i=t.points.length;n<i;n++){let r=t.points[n];this.points.push(new I().fromArray(r))}return this.closed=t.closed,this.curveType=t.curveType,this.tension=t.tension,this}};function wm(e,t,n,i,r){let s=(i-t)*.5,o=(r-n)*.5,a=e*e,c=e*a;return(2*n-2*i+s+o)*c+(-3*n+3*i-2*s-o)*a+s*e+n}function Hb(e,t){let n=1-e;return n*n*t}function Gb(e,t){return 2*(1-e)*e*t}function Wb(e,t){return e*e*t}function wo(e,t,n,i){return Hb(e,t)+Gb(e,n)+Wb(e,i)}function jb(e,t){let n=1-e;return n*n*n*t}function qb(e,t){let n=1-e;return 3*n*n*e*t}function Xb(e,t){return 3*(1-e)*e*e*t}function $b(e,t){return e*e*e*t}function Eo(e,t,n,i,r){return jb(e,t)+qb(e,n)+Xb(e,i)+$b(e,r)}var kc=class extends Fn{constructor(t=new it,n=new it,i=new it,r=new it){super(),this.isCubicBezierCurve=!0,this.type="CubicBezierCurve",this.v0=t,this.v1=n,this.v2=i,this.v3=r}getPoint(t,n=new it){let i=n,r=this.v0,s=this.v1,o=this.v2,a=this.v3;return i.set(Eo(t,r.x,s.x,o.x,a.x),Eo(t,r.y,s.y,o.y,a.y)),i}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this.v3.copy(t.v3),this}toJSON(){let t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t.v3=this.v3.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this.v3.fromArray(t.v3),this}},Rs=class extends Fn{constructor(t=new I,n=new I,i=new I,r=new I){super(),this.isCubicBezierCurve3=!0,this.type="CubicBezierCurve3",this.v0=t,this.v1=n,this.v2=i,this.v3=r}getPoint(t,n=new I){let i=n,r=this.v0,s=this.v1,o=this.v2,a=this.v3;return i.set(Eo(t,r.x,s.x,o.x,a.x),Eo(t,r.y,s.y,o.y,a.y),Eo(t,r.z,s.z,o.z,a.z)),i}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this.v3.copy(t.v3),this}toJSON(){let t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t.v3=this.v3.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this.v3.fromArray(t.v3),this}},Bc=class extends Fn{constructor(t=new it,n=new it){super(),this.isLineCurve=!0,this.type="LineCurve",this.v1=t,this.v2=n}getPoint(t,n=new it){let i=n;return t===1?i.copy(this.v2):(i.copy(this.v2).sub(this.v1),i.multiplyScalar(t).add(this.v1)),i}getPointAt(t,n){return this.getPoint(t,n)}getTangent(t,n=new it){return n.subVectors(this.v2,this.v1).normalize()}getTangentAt(t,n){return this.getTangent(t,n)}copy(t){return super.copy(t),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){let t=super.toJSON();return t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}},Vc=class extends Fn{constructor(t=new I,n=new I){super(),this.isLineCurve3=!0,this.type="LineCurve3",this.v1=t,this.v2=n}getPoint(t,n=new I){let i=n;return t===1?i.copy(this.v2):(i.copy(this.v2).sub(this.v1),i.multiplyScalar(t).add(this.v1)),i}getPointAt(t,n){return this.getPoint(t,n)}getTangent(t,n=new I){return n.subVectors(this.v2,this.v1).normalize()}getTangentAt(t,n){return this.getTangent(t,n)}copy(t){return super.copy(t),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){let t=super.toJSON();return t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}},Hc=class extends Fn{constructor(t=new it,n=new it,i=new it){super(),this.isQuadraticBezierCurve=!0,this.type="QuadraticBezierCurve",this.v0=t,this.v1=n,this.v2=i}getPoint(t,n=new it){let i=n,r=this.v0,s=this.v1,o=this.v2;return i.set(wo(t,r.x,s.x,o.x),wo(t,r.y,s.y,o.y)),i}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){let t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}},Cr=class extends Fn{constructor(t=new I,n=new I,i=new I){super(),this.isQuadraticBezierCurve3=!0,this.type="QuadraticBezierCurve3",this.v0=t,this.v1=n,this.v2=i}getPoint(t,n=new I){let i=n,r=this.v0,s=this.v1,o=this.v2;return i.set(wo(t,r.x,s.x,o.x),wo(t,r.y,s.y,o.y),wo(t,r.z,s.z,o.z)),i}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){let t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}},Gc=class extends Fn{constructor(t=[]){super(),this.isSplineCurve=!0,this.type="SplineCurve",this.points=t}getPoint(t,n=new it){let i=n,r=this.points,s=(r.length-1)*t,o=Math.floor(s),a=s-o,c=r[o===0?o:o-1],l=r[o],u=r[o>r.length-2?r.length-1:o+1],h=r[o>r.length-3?r.length-1:o+2];return i.set(wm(a,c.x,l.x,u.x,h.x),wm(a,c.y,l.y,u.y,h.y)),i}copy(t){super.copy(t),this.points=[];for(let n=0,i=t.points.length;n<i;n++){let r=t.points[n];this.points.push(r.clone())}return this}toJSON(){let t=super.toJSON();t.points=[];for(let n=0,i=this.points.length;n<i;n++){let r=this.points[n];t.points.push(r.toArray())}return t}fromJSON(t){super.fromJSON(t),this.points=[];for(let n=0,i=t.points.length;n<i;n++){let r=t.points[n];this.points.push(new it().fromArray(r))}return this}},Yb=Object.freeze({__proto__:null,ArcCurve:Uc,CatmullRomCurve3:zc,CubicBezierCurve:kc,CubicBezierCurve3:Rs,EllipseCurve:fi,LineCurve:Bc,LineCurve3:Vc,QuadraticBezierCurve:Hc,QuadraticBezierCurve3:Cr,SplineCurve:Gc});var Ho=class e extends ve{constructor(t=1,n=1,i=1,r=1){super(),this.type="PlaneGeometry",this.parameters={width:t,height:n,widthSegments:i,heightSegments:r};let s=t/2,o=n/2,a=Math.floor(i),c=Math.floor(r),l=a+1,u=c+1,h=t/a,d=n/c,f=[],m=[],_=[],g=[];for(let p=0;p<u;p++){let b=p*d-o;for(let x=0;x<l;x++){let v=x*h-s;m.push(v,-b,0),_.push(0,0,1),g.push(x/a),g.push(1-p/c)}}for(let p=0;p<c;p++)for(let b=0;b<a;b++){let x=b+l*p,v=b+l*(p+1),M=b+1+l*(p+1),S=b+1+l*p;f.push(x,v,S),f.push(v,M,S)}this.setIndex(f),this.setAttribute("position",new ce(m,3)),this.setAttribute("normal",new ce(_,3)),this.setAttribute("uv",new ce(g,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new e(t.width,t.height,t.widthSegments,t.heightSegments)}};var Di=class e extends ve{constructor(t=1,n=32,i=16,r=0,s=Math.PI*2,o=0,a=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:t,widthSegments:n,heightSegments:i,phiStart:r,phiLength:s,thetaStart:o,thetaLength:a},n=Math.max(3,Math.floor(n)),i=Math.max(2,Math.floor(i));let c=Math.min(o+a,Math.PI),l=0,u=[],h=new I,d=new I,f=[],m=[],_=[],g=[];for(let p=0;p<=i;p++){let b=[],x=p/i,v=0;p===0&&o===0?v=.5/n:p===i&&c===Math.PI&&(v=-.5/n);for(let M=0;M<=n;M++){let S=M/n;h.x=-t*Math.cos(r+S*s)*Math.sin(o+x*a),h.y=t*Math.cos(o+x*a),h.z=t*Math.sin(r+S*s)*Math.sin(o+x*a),m.push(h.x,h.y,h.z),d.copy(h).normalize(),_.push(d.x,d.y,d.z),g.push(S+v,1-x),b.push(l++)}u.push(b)}for(let p=0;p<i;p++)for(let b=0;b<n;b++){let x=u[p][b+1],v=u[p][b],M=u[p+1][b],S=u[p+1][b+1];(p!==0||o>0)&&f.push(x,v,S),(p!==i-1||c<Math.PI)&&f.push(v,M,S)}this.setIndex(f),this.setAttribute("position",new ce(m,3)),this.setAttribute("normal",new ce(_,3)),this.setAttribute("uv",new ce(g,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new e(t.radius,t.widthSegments,t.heightSegments,t.phiStart,t.phiLength,t.thetaStart,t.thetaLength)}};var Go=class e extends ve{constructor(t=1,n=.4,i=12,r=48,s=Math.PI*2){super(),this.type="TorusGeometry",this.parameters={radius:t,tube:n,radialSegments:i,tubularSegments:r,arc:s},i=Math.floor(i),r=Math.floor(r);let o=[],a=[],c=[],l=[],u=new I,h=new I,d=new I;for(let f=0;f<=i;f++)for(let m=0;m<=r;m++){let _=m/r*s,g=f/i*Math.PI*2;h.x=(t+n*Math.cos(g))*Math.cos(_),h.y=(t+n*Math.cos(g))*Math.sin(_),h.z=n*Math.sin(g),a.push(h.x,h.y,h.z),u.x=t*Math.cos(_),u.y=t*Math.sin(_),d.subVectors(h,u).normalize(),c.push(d.x,d.y,d.z),l.push(m/r),l.push(f/i)}for(let f=1;f<=i;f++)for(let m=1;m<=r;m++){let _=(r+1)*f+m-1,g=(r+1)*(f-1)+m-1,p=(r+1)*(f-1)+m,b=(r+1)*f+m;o.push(_,g,b),o.push(g,p,b)}this.setIndex(o),this.setAttribute("position",new ce(a,3)),this.setAttribute("normal",new ce(c,3)),this.setAttribute("uv",new ce(l,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new e(t.radius,t.tube,t.radialSegments,t.tubularSegments,t.arc)}};var Wo=class e extends ve{constructor(t=new Cr(new I(-1,-1,0),new I(-1,1,0),new I(1,1,0)),n=64,i=1,r=8,s=!1){super(),this.type="TubeGeometry",this.parameters={path:t,tubularSegments:n,radius:i,radialSegments:r,closed:s};let o=t.computeFrenetFrames(n,s);this.tangents=o.tangents,this.normals=o.normals,this.binormals=o.binormals;let a=new I,c=new I,l=new it,u=new I,h=[],d=[],f=[],m=[];_(),this.setIndex(m),this.setAttribute("position",new ce(h,3)),this.setAttribute("normal",new ce(d,3)),this.setAttribute("uv",new ce(f,2));function _(){for(let x=0;x<n;x++)g(x);g(s===!1?n:0),b(),p()}function g(x){u=t.getPointAt(x/n,u);let v=o.normals[x],M=o.binormals[x];for(let S=0;S<=r;S++){let C=S/r*Math.PI*2,P=Math.sin(C),T=-Math.cos(C);c.x=T*v.x+P*M.x,c.y=T*v.y+P*M.y,c.z=T*v.z+P*M.z,c.normalize(),d.push(c.x,c.y,c.z),a.x=u.x+i*c.x,a.y=u.y+i*c.y,a.z=u.z+i*c.z,h.push(a.x,a.y,a.z)}}function p(){for(let x=1;x<=n;x++)for(let v=1;v<=r;v++){let M=(r+1)*(x-1)+(v-1),S=(r+1)*x+(v-1),C=(r+1)*x+v,P=(r+1)*(x-1)+v;m.push(M,S,P),m.push(S,C,P)}}function b(){for(let x=0;x<=n;x++)for(let v=0;v<=r;v++)l.x=x/n,l.y=v/r,f.push(l.x,l.y)}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}toJSON(){let t=super.toJSON();return t.path=this.parameters.path.toJSON(),t}static fromJSON(t){return new e(new Yb[t.path.type]().fromJSON(t.path),t.tubularSegments,t.radius,t.radialSegments,t.closed)}};var jo=class extends Le{constructor(t){super(t),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}},qo=class extends Nn{constructor(t){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new Ot(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Ot(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=eh,this.normalScale=new it(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new On,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.defines={STANDARD:""},this.color.copy(t.color),this.roughness=t.roughness,this.metalness=t.metalness,this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.emissive.copy(t.emissive),this.emissiveMap=t.emissiveMap,this.emissiveIntensity=t.emissiveIntensity,this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.roughnessMap=t.roughnessMap,this.metalnessMap=t.metalnessMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.envMapIntensity=t.envMapIntensity,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.flatShading=t.flatShading,this.fog=t.fog,this}};var Xo=class extends Nn{constructor(t){super(),this.isMeshLambertMaterial=!0,this.type="MeshLambertMaterial",this.color=new Ot(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Ot(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=eh,this.normalScale=new it(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new On,this.combine=hl,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.emissive.copy(t.emissive),this.emissiveMap=t.emissiveMap,this.emissiveIntensity=t.emissiveIntensity,this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.combine=t.combine,this.reflectivity=t.reflectivity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.flatShading=t.flatShading,this.fog=t.fog,this}},Wc=class extends Nn{constructor(t){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=tg,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(t)}copy(t){return super.copy(t),this.depthPacking=t.depthPacking,this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this}},jc=class extends Nn{constructor(t){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(t)}copy(t){return super.copy(t),this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this}};function yc(e,t){return!e||e.constructor===t?e:typeof t.BYTES_PER_ELEMENT=="number"?new t(e):Array.prototype.slice.call(e)}function Zb(e){return ArrayBuffer.isView(e)&&!(e instanceof DataView)}var Rr=class{constructor(t,n,i,r){this.parameterPositions=t,this._cachedIndex=0,this.resultBuffer=r!==void 0?r:new n.constructor(i),this.sampleValues=n,this.valueSize=i,this.settings=null,this.DefaultSettings_={}}evaluate(t){let n=this.parameterPositions,i=this._cachedIndex,r=n[i],s=n[i-1];t:{e:{let o;n:{i:if(!(t<r)){for(let a=i+2;;){if(r===void 0){if(t<s)break i;return i=n.length,this._cachedIndex=i,this.copySampleValue_(i-1)}if(i===a)break;if(s=r,r=n[++i],t<r)break e}o=n.length;break n}if(!(t>=s)){let a=n[1];t<a&&(i=2,s=a);for(let c=i-2;;){if(s===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(i===c)break;if(r=s,s=n[--i-1],t>=s)break e}o=i,i=0;break n}break t}for(;i<o;){let a=i+o>>>1;t<n[a]?o=a:i=a+1}if(r=n[i],s=n[i-1],s===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(r===void 0)return i=n.length,this._cachedIndex=i,this.copySampleValue_(i-1)}this._cachedIndex=i,this.intervalChanged_(i,s,r)}return this.interpolate_(i,s,t,r)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(t){let n=this.resultBuffer,i=this.sampleValues,r=this.valueSize,s=t*r;for(let o=0;o!==r;++o)n[o]=i[s+o];return n}interpolate_(){throw new Error("call to abstract method")}intervalChanged_(){}},qc=class extends Rr{constructor(t,n,i,r){super(t,n,i,r),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:of,endingEnd:of}}intervalChanged_(t,n,i){let r=this.parameterPositions,s=t-2,o=t+1,a=r[s],c=r[o];if(a===void 0)switch(this.getSettings_().endingStart){case af:s=t,a=2*n-i;break;case cf:s=r.length-2,a=n+r[s]-r[s+1];break;default:s=t,a=i}if(c===void 0)switch(this.getSettings_().endingEnd){case af:o=t,c=2*i-n;break;case cf:o=1,c=i+r[1]-r[0];break;default:o=t-1,c=n}let l=(i-n)*.5,u=this.valueSize;this._weightPrev=l/(n-a),this._weightNext=l/(c-i),this._offsetPrev=s*u,this._offsetNext=o*u}interpolate_(t,n,i,r){let s=this.resultBuffer,o=this.sampleValues,a=this.valueSize,c=t*a,l=c-a,u=this._offsetPrev,h=this._offsetNext,d=this._weightPrev,f=this._weightNext,m=(i-n)/(r-n),_=m*m,g=_*m,p=-d*g+2*d*_-d*m,b=(1+d)*g+(-1.5-2*d)*_+(-.5+d)*m+1,x=(-1-f)*g+(1.5+f)*_+.5*m,v=f*g-f*_;for(let M=0;M!==a;++M)s[M]=p*o[u+M]+b*o[l+M]+x*o[c+M]+v*o[h+M];return s}},Xc=class extends Rr{constructor(t,n,i,r){super(t,n,i,r)}interpolate_(t,n,i,r){let s=this.resultBuffer,o=this.sampleValues,a=this.valueSize,c=t*a,l=c-a,u=(i-n)/(r-n),h=1-u;for(let d=0;d!==a;++d)s[d]=o[l+d]*h+o[c+d]*u;return s}},$c=class extends Rr{constructor(t,n,i,r){super(t,n,i,r)}interpolate_(t){return this.copySampleValue_(t-1)}},Sn=class{constructor(t,n,i,r){if(t===void 0)throw new Error("THREE.KeyframeTrack: track name is undefined");if(n===void 0||n.length===0)throw new Error("THREE.KeyframeTrack: no keyframes in track named "+t);this.name=t,this.times=yc(n,this.TimeBufferType),this.values=yc(i,this.ValueBufferType),this.setInterpolation(r||this.DefaultInterpolation)}static toJSON(t){let n=t.constructor,i;if(n.toJSON!==this.toJSON)i=n.toJSON(t);else{i={name:t.name,times:yc(t.times,Array),values:yc(t.values,Array)};let r=t.getInterpolation();r!==t.DefaultInterpolation&&(i.interpolation=r)}return i.type=t.ValueTypeName,i}InterpolantFactoryMethodDiscrete(t){return new $c(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodLinear(t){return new Xc(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodSmooth(t){return new qc(this.times,this.values,this.getValueSize(),t)}setInterpolation(t){let n;switch(t){case To:n=this.InterpolantFactoryMethodDiscrete;break;case Tc:n=this.InterpolantFactoryMethodLinear;break;case xc:n=this.InterpolantFactoryMethodSmooth;break}if(n===void 0){let i="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(t!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw new Error(i);return console.warn("THREE.KeyframeTrack:",i),this}return this.createInterpolant=n,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return To;case this.InterpolantFactoryMethodLinear:return Tc;case this.InterpolantFactoryMethodSmooth:return xc}}getValueSize(){return this.values.length/this.times.length}shift(t){if(t!==0){let n=this.times;for(let i=0,r=n.length;i!==r;++i)n[i]+=t}return this}scale(t){if(t!==1){let n=this.times;for(let i=0,r=n.length;i!==r;++i)n[i]*=t}return this}trim(t,n){let i=this.times,r=i.length,s=0,o=r-1;for(;s!==r&&i[s]<t;)++s;for(;o!==-1&&i[o]>n;)--o;if(++o,s!==0||o!==r){s>=o&&(o=Math.max(o,1),s=o-1);let a=this.getValueSize();this.times=i.slice(s,o),this.values=this.values.slice(s*a,o*a)}return this}validate(){let t=!0,n=this.getValueSize();n-Math.floor(n)!==0&&(console.error("THREE.KeyframeTrack: Invalid value size in track.",this),t=!1);let i=this.times,r=this.values,s=i.length;s===0&&(console.error("THREE.KeyframeTrack: Track is empty.",this),t=!1);let o=null;for(let a=0;a!==s;a++){let c=i[a];if(typeof c=="number"&&isNaN(c)){console.error("THREE.KeyframeTrack: Time is not a valid number.",this,a,c),t=!1;break}if(o!==null&&o>c){console.error("THREE.KeyframeTrack: Out of order keys.",this,a,c,o),t=!1;break}o=c}if(r!==void 0&&Zb(r))for(let a=0,c=r.length;a!==c;++a){let l=r[a];if(isNaN(l)){console.error("THREE.KeyframeTrack: Value is not a valid number.",this,a,l),t=!1;break}}return t}optimize(){let t=this.times.slice(),n=this.values.slice(),i=this.getValueSize(),r=this.getInterpolation()===xc,s=t.length-1,o=1;for(let a=1;a<s;++a){let c=!1,l=t[a],u=t[a+1];if(l!==u&&(a!==1||l!==t[0]))if(r)c=!0;else{let h=a*i,d=h-i,f=h+i;for(let m=0;m!==i;++m){let _=n[h+m];if(_!==n[d+m]||_!==n[f+m]){c=!0;break}}}if(c){if(a!==o){t[o]=t[a];let h=a*i,d=o*i;for(let f=0;f!==i;++f)n[d+f]=n[h+f]}++o}}if(s>0){t[o]=t[s];for(let a=s*i,c=o*i,l=0;l!==i;++l)n[c+l]=n[a+l];++o}return o!==t.length?(this.times=t.slice(0,o),this.values=n.slice(0,o*i)):(this.times=t,this.values=n),this}clone(){let t=this.times.slice(),n=this.values.slice(),i=this.constructor,r=new i(this.name,t,n);return r.createInterpolant=this.createInterpolant,r}};Sn.prototype.ValueTypeName="";Sn.prototype.TimeBufferType=Float32Array;Sn.prototype.ValueBufferType=Float32Array;Sn.prototype.DefaultInterpolation=Tc;var Zi=class extends Sn{constructor(t,n,i){super(t,n,i)}};Zi.prototype.ValueTypeName="bool";Zi.prototype.ValueBufferType=Array;Zi.prototype.DefaultInterpolation=To;Zi.prototype.InterpolantFactoryMethodLinear=void 0;Zi.prototype.InterpolantFactoryMethodSmooth=void 0;var Yc=class extends Sn{constructor(t,n,i,r){super(t,n,i,r)}};Yc.prototype.ValueTypeName="color";var Zc=class extends Sn{constructor(t,n,i,r){super(t,n,i,r)}};Zc.prototype.ValueTypeName="number";var Kc=class extends Rr{constructor(t,n,i,r){super(t,n,i,r)}interpolate_(t,n,i,r){let s=this.resultBuffer,o=this.sampleValues,a=this.valueSize,c=(i-n)/(r-n),l=t*a;for(let u=l+a;l!==u;l+=4)Ne.slerpFlat(s,0,o,l-a,o,l,c);return s}},$o=class extends Sn{constructor(t,n,i,r){super(t,n,i,r)}InterpolantFactoryMethodLinear(t){return new Kc(this.times,this.values,this.getValueSize(),t)}};$o.prototype.ValueTypeName="quaternion";$o.prototype.InterpolantFactoryMethodSmooth=void 0;var Ki=class extends Sn{constructor(t,n,i){super(t,n,i)}};Ki.prototype.ValueTypeName="string";Ki.prototype.ValueBufferType=Array;Ki.prototype.DefaultInterpolation=To;Ki.prototype.InterpolantFactoryMethodLinear=void 0;Ki.prototype.InterpolantFactoryMethodSmooth=void 0;var Jc=class extends Sn{constructor(t,n,i,r){super(t,n,i,r)}};Jc.prototype.ValueTypeName="vector";var bc={enabled:!1,files:{},add:function(e,t){this.enabled!==!1&&(this.files[e]=t)},get:function(e){if(this.enabled!==!1)return this.files[e]},remove:function(e){delete this.files[e]},clear:function(){this.files={}}},Qc=class{constructor(t,n,i){let r=this,s=!1,o=0,a=0,c,l=[];this.onStart=void 0,this.onLoad=t,this.onProgress=n,this.onError=i,this.abortController=new AbortController,this.itemStart=function(u){a++,s===!1&&r.onStart!==void 0&&r.onStart(u,o,a),s=!0},this.itemEnd=function(u){o++,r.onProgress!==void 0&&r.onProgress(u,o,a),o===a&&(s=!1,r.onLoad!==void 0&&r.onLoad())},this.itemError=function(u){r.onError!==void 0&&r.onError(u)},this.resolveURL=function(u){return c?c(u):u},this.setURLModifier=function(u){return c=u,this},this.addHandler=function(u,h){return l.push(u,h),this},this.removeHandler=function(u){let h=l.indexOf(u);return h!==-1&&l.splice(h,2),this},this.getHandler=function(u){for(let h=0,d=l.length;h<d;h+=2){let f=l[h],m=l[h+1];if(f.global&&(f.lastIndex=0),f.test(u))return m}return null},this.abort=function(){return this.abortController.abort(),this.abortController=new AbortController,this}}},pg=new Qc,Ps=class{constructor(t){this.manager=t!==void 0?t:pg,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={}}load(){}loadAsync(t,n){let i=this;return new Promise(function(r,s){i.load(t,r,n,s)})}parse(){}setCrossOrigin(t){return this.crossOrigin=t,this}setWithCredentials(t){return this.withCredentials=t,this}setPath(t){return this.path=t,this}setResourcePath(t){return this.resourcePath=t,this}setRequestHeader(t){return this.requestHeader=t,this}abort(){return this}};Ps.DEFAULT_MATERIAL_NAME="__DEFAULT";var gs=new WeakMap,tl=class extends Ps{constructor(t){super(t)}load(t,n,i,r){this.path!==void 0&&(t=this.path+t),t=this.manager.resolveURL(t);let s=this,o=bc.get(`image:${t}`);if(o!==void 0){if(o.complete===!0)s.manager.itemStart(t),setTimeout(function(){n&&n(o),s.manager.itemEnd(t)},0);else{let h=gs.get(o);h===void 0&&(h=[],gs.set(o,h)),h.push({onLoad:n,onError:r})}return o}let a=xs("img");function c(){u(),n&&n(this);let h=gs.get(this)||[];for(let d=0;d<h.length;d++){let f=h[d];f.onLoad&&f.onLoad(this)}gs.delete(this),s.manager.itemEnd(t)}function l(h){u(),r&&r(h),bc.remove(`image:${t}`);let d=gs.get(this)||[];for(let f=0;f<d.length;f++){let m=d[f];m.onError&&m.onError(h)}gs.delete(this),s.manager.itemError(t),s.manager.itemEnd(t)}function u(){a.removeEventListener("load",c,!1),a.removeEventListener("error",l,!1)}return a.addEventListener("load",c,!1),a.addEventListener("error",l,!1),t.slice(0,5)!=="data:"&&this.crossOrigin!==void 0&&(a.crossOrigin=this.crossOrigin),bc.add(`image:${t}`,a),s.manager.itemStart(t),a.src=t,a}};var Yo=class extends Ps{constructor(t){super(t)}load(t,n,i,r){let s=new an,o=new tl(this.manager);return o.setCrossOrigin(this.crossOrigin),o.setPath(this.path),o.load(t,function(a){s.image=a,s.needsUpdate=!0,n!==void 0&&n(s)},i,r),s}},Is=class extends Be{constructor(t,n=1){super(),this.isLight=!0,this.type="Light",this.color=new Ot(t),this.intensity=n}dispose(){}copy(t,n){return super.copy(t,n),this.color.copy(t.color),this.intensity=t.intensity,this}toJSON(t){let n=super.toJSON(t);return n.object.color=this.color.getHex(),n.object.intensity=this.intensity,this.groundColor!==void 0&&(n.object.groundColor=this.groundColor.getHex()),this.distance!==void 0&&(n.object.distance=this.distance),this.angle!==void 0&&(n.object.angle=this.angle),this.decay!==void 0&&(n.object.decay=this.decay),this.penumbra!==void 0&&(n.object.penumbra=this.penumbra),this.shadow!==void 0&&(n.object.shadow=this.shadow.toJSON()),this.target!==void 0&&(n.object.target=this.target.uuid),n}};var rf=new Vt,Em=new I,Tm=new I,el=class{constructor(t){this.camera=t,this.intensity=1,this.bias=0,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new it(512,512),this.mapType=ti,this.map=null,this.mapPass=null,this.matrix=new Vt,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new Ts,this._frameExtents=new it(1,1),this._viewportCount=1,this._viewports=[new de(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(t){let n=this.camera,i=this.matrix;Em.setFromMatrixPosition(t.matrixWorld),n.position.copy(Em),Tm.setFromMatrixPosition(t.target.matrixWorld),n.lookAt(Tm),n.updateMatrixWorld(),rf.multiplyMatrices(n.projectionMatrix,n.matrixWorldInverse),this._frustum.setFromProjectionMatrix(rf,n.coordinateSystem,n.reversedDepth),n.reversedDepth?i.set(.5,0,0,.5,0,.5,0,.5,0,0,1,0,0,0,0,1):i.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),i.multiply(rf)}getViewport(t){return this._viewports[t]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(t){return this.camera=t.camera.clone(),this.intensity=t.intensity,this.bias=t.bias,this.radius=t.radius,this.autoUpdate=t.autoUpdate,this.needsUpdate=t.needsUpdate,this.normalBias=t.normalBias,this.blurSamples=t.blurSamples,this.mapSize.copy(t.mapSize),this}clone(){return new this.constructor().copy(this)}toJSON(){let t={};return this.intensity!==1&&(t.intensity=this.intensity),this.bias!==0&&(t.bias=this.bias),this.normalBias!==0&&(t.normalBias=this.normalBias),this.radius!==1&&(t.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(t.mapSize=this.mapSize.toArray()),t.camera=this.camera.toJSON(!1).object,delete t.camera.matrix,t}};var Am=new Vt,bo=new I,sf=new I,uf=class extends el{constructor(){super(new Ge(90,1,.5,500)),this.isPointLightShadow=!0,this._frameExtents=new it(4,2),this._viewportCount=6,this._viewports=[new de(2,1,1,1),new de(0,1,1,1),new de(3,1,1,1),new de(1,1,1,1),new de(3,0,1,1),new de(1,0,1,1)],this._cubeDirections=[new I(1,0,0),new I(-1,0,0),new I(0,0,1),new I(0,0,-1),new I(0,1,0),new I(0,-1,0)],this._cubeUps=[new I(0,1,0),new I(0,1,0),new I(0,1,0),new I(0,1,0),new I(0,0,1),new I(0,0,-1)]}updateMatrices(t,n=0){let i=this.camera,r=this.matrix,s=t.distance||i.far;s!==i.far&&(i.far=s,i.updateProjectionMatrix()),bo.setFromMatrixPosition(t.matrixWorld),i.position.copy(bo),sf.copy(i.position),sf.add(this._cubeDirections[n]),i.up.copy(this._cubeUps[n]),i.lookAt(sf),i.updateMatrixWorld(),r.makeTranslation(-bo.x,-bo.y,-bo.z),Am.multiplyMatrices(i.projectionMatrix,i.matrixWorldInverse),this._frustum.setFromProjectionMatrix(Am,i.coordinateSystem,i.reversedDepth)}},Zo=class extends Is{constructor(t,n,i=0,r=2){super(t,n),this.isPointLight=!0,this.type="PointLight",this.distance=i,this.decay=r,this.shadow=new uf}get power(){return this.intensity*4*Math.PI}set power(t){this.intensity=t/(4*Math.PI)}dispose(){this.shadow.dispose()}copy(t,n){return super.copy(t,n),this.distance=t.distance,this.decay=t.decay,this.shadow=t.shadow.clone(),this}},Pr=class extends Do{constructor(t=-1,n=1,i=1,r=-1,s=.1,o=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=t,this.right=n,this.top=i,this.bottom=r,this.near=s,this.far=o,this.updateProjectionMatrix()}copy(t,n){return super.copy(t,n),this.left=t.left,this.right=t.right,this.top=t.top,this.bottom=t.bottom,this.near=t.near,this.far=t.far,this.zoom=t.zoom,this.view=t.view===null?null:Object.assign({},t.view),this}setViewOffset(t,n,i,r,s,o){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=n,this.view.offsetX=i,this.view.offsetY=r,this.view.width=s,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let t=(this.right-this.left)/(2*this.zoom),n=(this.top-this.bottom)/(2*this.zoom),i=(this.right+this.left)/2,r=(this.top+this.bottom)/2,s=i-t,o=i+t,a=r+n,c=r-n;if(this.view!==null&&this.view.enabled){let l=(this.right-this.left)/this.view.fullWidth/this.zoom,u=(this.top-this.bottom)/this.view.fullHeight/this.zoom;s+=l*this.view.offsetX,o=s+l*this.view.width,a-=u*this.view.offsetY,c=a-u*this.view.height}this.projectionMatrix.makeOrthographic(s,o,a,c,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){let n=super.toJSON(t);return n.object.zoom=this.zoom,n.object.left=this.left,n.object.right=this.right,n.object.top=this.top,n.object.bottom=this.bottom,n.object.near=this.near,n.object.far=this.far,this.view!==null&&(n.object.view=Object.assign({},this.view)),n}},ff=class extends el{constructor(){super(new Pr(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}},Ko=class extends Is{constructor(t,n){super(t,n),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(Be.DEFAULT_UP),this.updateMatrix(),this.target=new Be,this.shadow=new ff}dispose(){this.shadow.dispose()}copy(t){return super.copy(t),this.target=t.target.clone(),this.shadow=t.shadow.clone(),this}},Ir=class extends Is{constructor(t,n){super(t,n),this.isAmbientLight=!0,this.type="AmbientLight"}};var nl=class extends Ge{constructor(t=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=t}},Jo=class{constructor(t=!0){this.autoStart=t,this.startTime=0,this.oldTime=0,this.elapsedTime=0,this.running=!1}start(){this.startTime=performance.now(),this.oldTime=this.startTime,this.elapsedTime=0,this.running=!0}stop(){this.getElapsedTime(),this.running=!1,this.autoStart=!1}getElapsedTime(){return this.getDelta(),this.elapsedTime}getDelta(){let t=0;if(this.autoStart&&!this.running)return this.start(),0;if(this.running){let n=performance.now();t=(n-this.oldTime)/1e3,this.oldTime=n,this.elapsedTime+=t}return t}};var Of="\\[\\]\\.:\\/",Kb=new RegExp("["+Of+"]","g"),Nf="[^"+Of+"]",Jb="[^"+Of.replace("\\.","")+"]",Qb=/((?:WC+[\/:])*)/.source.replace("WC",Nf),t1=/(WCOD+)?/.source.replace("WCOD",Jb),e1=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",Nf),n1=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",Nf),i1=new RegExp("^"+Qb+t1+e1+n1+"$"),r1=["material","materials","bones","map"],df=class{constructor(t,n,i){let r=i||Se.parseTrackName(n);this._targetGroup=t,this._bindings=t.subscribe_(n,r)}getValue(t,n){this.bind();let i=this._targetGroup.nCachedObjects_,r=this._bindings[i];r!==void 0&&r.getValue(t,n)}setValue(t,n){let i=this._bindings;for(let r=this._targetGroup.nCachedObjects_,s=i.length;r!==s;++r)i[r].setValue(t,n)}bind(){let t=this._bindings;for(let n=this._targetGroup.nCachedObjects_,i=t.length;n!==i;++n)t[n].bind()}unbind(){let t=this._bindings;for(let n=this._targetGroup.nCachedObjects_,i=t.length;n!==i;++n)t[n].unbind()}},Se=class e{constructor(t,n,i){this.path=n,this.parsedPath=i||e.parseTrackName(n),this.node=e.findNode(t,this.parsedPath.nodeName),this.rootNode=t,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(t,n,i){return t&&t.isAnimationObjectGroup?new e.Composite(t,n,i):new e(t,n,i)}static sanitizeNodeName(t){return t.replace(/\s/g,"_").replace(Kb,"")}static parseTrackName(t){let n=i1.exec(t);if(n===null)throw new Error("PropertyBinding: Cannot parse trackName: "+t);let i={nodeName:n[2],objectName:n[3],objectIndex:n[4],propertyName:n[5],propertyIndex:n[6]},r=i.nodeName&&i.nodeName.lastIndexOf(".");if(r!==void 0&&r!==-1){let s=i.nodeName.substring(r+1);r1.indexOf(s)!==-1&&(i.nodeName=i.nodeName.substring(0,r),i.objectName=s)}if(i.propertyName===null||i.propertyName.length===0)throw new Error("PropertyBinding: can not parse propertyName from trackName: "+t);return i}static findNode(t,n){if(n===void 0||n===""||n==="."||n===-1||n===t.name||n===t.uuid)return t;if(t.skeleton){let i=t.skeleton.getBoneByName(n);if(i!==void 0)return i}if(t.children){let i=function(s){for(let o=0;o<s.length;o++){let a=s[o];if(a.name===n||a.uuid===n)return a;let c=i(a.children);if(c)return c}return null},r=i(t.children);if(r)return r}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(t,n){t[n]=this.targetObject[this.propertyName]}_getValue_array(t,n){let i=this.resolvedProperty;for(let r=0,s=i.length;r!==s;++r)t[n++]=i[r]}_getValue_arrayElement(t,n){t[n]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(t,n){this.resolvedProperty.toArray(t,n)}_setValue_direct(t,n){this.targetObject[this.propertyName]=t[n]}_setValue_direct_setNeedsUpdate(t,n){this.targetObject[this.propertyName]=t[n],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(t,n){this.targetObject[this.propertyName]=t[n],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(t,n){let i=this.resolvedProperty;for(let r=0,s=i.length;r!==s;++r)i[r]=t[n++]}_setValue_array_setNeedsUpdate(t,n){let i=this.resolvedProperty;for(let r=0,s=i.length;r!==s;++r)i[r]=t[n++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(t,n){let i=this.resolvedProperty;for(let r=0,s=i.length;r!==s;++r)i[r]=t[n++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(t,n){this.resolvedProperty[this.propertyIndex]=t[n]}_setValue_arrayElement_setNeedsUpdate(t,n){this.resolvedProperty[this.propertyIndex]=t[n],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(t,n){this.resolvedProperty[this.propertyIndex]=t[n],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(t,n){this.resolvedProperty.fromArray(t,n)}_setValue_fromArray_setNeedsUpdate(t,n){this.resolvedProperty.fromArray(t,n),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(t,n){this.resolvedProperty.fromArray(t,n),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(t,n){this.bind(),this.getValue(t,n)}_setValue_unbound(t,n){this.bind(),this.setValue(t,n)}bind(){let t=this.node,n=this.parsedPath,i=n.objectName,r=n.propertyName,s=n.propertyIndex;if(t||(t=e.findNode(this.rootNode,n.nodeName),this.node=t),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!t){console.warn("THREE.PropertyBinding: No target node found for track: "+this.path+".");return}if(i){let l=n.objectIndex;switch(i){case"materials":if(!t.material){console.error("THREE.PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!t.material.materials){console.error("THREE.PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}t=t.material.materials;break;case"bones":if(!t.skeleton){console.error("THREE.PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}t=t.skeleton.bones;for(let u=0;u<t.length;u++)if(t[u].name===l){l=u;break}break;case"map":if("map"in t){t=t.map;break}if(!t.material){console.error("THREE.PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!t.material.map){console.error("THREE.PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}t=t.material.map;break;default:if(t[i]===void 0){console.error("THREE.PropertyBinding: Can not bind to objectName of node undefined.",this);return}t=t[i]}if(l!==void 0){if(t[l]===void 0){console.error("THREE.PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,t);return}t=t[l]}}let o=t[r];if(o===void 0){let l=n.nodeName;console.error("THREE.PropertyBinding: Trying to update property for track: "+l+"."+r+" but it wasn't found.",t);return}let a=this.Versioning.None;this.targetObject=t,t.isMaterial===!0?a=this.Versioning.NeedsUpdate:t.isObject3D===!0&&(a=this.Versioning.MatrixWorldNeedsUpdate);let c=this.BindingType.Direct;if(s!==void 0){if(r==="morphTargetInfluences"){if(!t.geometry){console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!t.geometry.morphAttributes){console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}t.morphTargetDictionary[s]!==void 0&&(s=t.morphTargetDictionary[s])}c=this.BindingType.ArrayElement,this.resolvedProperty=o,this.propertyIndex=s}else o.fromArray!==void 0&&o.toArray!==void 0?(c=this.BindingType.HasFromToArray,this.resolvedProperty=o):Array.isArray(o)?(c=this.BindingType.EntireArray,this.resolvedProperty=o):this.propertyName=r;this.getValue=this.GetterByBindingType[c],this.setValue=this.SetterByBindingTypeAndVersioning[c][a]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}};Se.Composite=df;Se.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};Se.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};Se.prototype.GetterByBindingType=[Se.prototype._getValue_direct,Se.prototype._getValue_array,Se.prototype._getValue_arrayElement,Se.prototype._getValue_toArray];Se.prototype.SetterByBindingTypeAndVersioning=[[Se.prototype._setValue_direct,Se.prototype._setValue_direct_setNeedsUpdate,Se.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[Se.prototype._setValue_array,Se.prototype._setValue_array_setNeedsUpdate,Se.prototype._setValue_array_setMatrixWorldNeedsUpdate],[Se.prototype._setValue_arrayElement,Se.prototype._setValue_arrayElement_setNeedsUpdate,Se.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[Se.prototype._setValue_fromArray,Se.prototype._setValue_fromArray_setNeedsUpdate,Se.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];var aD=new Float32Array(1);var Cm=new Vt,Li=class{constructor(t,n,i=0,r=1/0){this.ray=new Ii(t,n),this.near=i,this.far=r,this.camera=null,this.layers=new Ss,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(t,n){this.ray.set(t,n)}setFromCamera(t,n){n.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(n.matrixWorld),this.ray.direction.set(t.x,t.y,.5).unproject(n).sub(this.ray.origin).normalize(),this.camera=n):n.isOrthographicCamera?(this.ray.origin.set(t.x,t.y,(n.near+n.far)/(n.near-n.far)).unproject(n),this.ray.direction.set(0,0,-1).transformDirection(n.matrixWorld),this.camera=n):console.error("THREE.Raycaster: Unsupported camera type: "+n.type)}setFromXRController(t){return Cm.identity().extractRotation(t.matrixWorld),this.ray.origin.setFromMatrixPosition(t.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(Cm),this}intersectObject(t,n=!0,i=[]){return pf(t,this,i,n),i.sort(Rm),i}intersectObjects(t,n=!0,i=[]){for(let r=0,s=t.length;r<s;r++)pf(t[r],this,i,n);return i.sort(Rm),i}};function Rm(e,t){return e.distance-t.distance}function pf(e,t,n,i){let r=!0;if(e.layers.test(t.layers)&&e.raycast(t,n)===!1&&(r=!1),r===!0&&i===!0){let s=e.children;for(let o=0,a=s.length;o<a;o++)pf(s[o],t,n,!0)}}var Qo=class{constructor(){this._previousTime=0,this._currentTime=0,this._startTime=performance.now(),this._delta=0,this._elapsed=0,this._timescale=1,this._document=null,this._pageVisibilityHandler=null}connect(t){this._document=t,t.hidden!==void 0&&(this._pageVisibilityHandler=s1.bind(this),t.addEventListener("visibilitychange",this._pageVisibilityHandler,!1))}disconnect(){this._pageVisibilityHandler!==null&&(this._document.removeEventListener("visibilitychange",this._pageVisibilityHandler),this._pageVisibilityHandler=null),this._document=null}getDelta(){return this._delta/1e3}getElapsed(){return this._elapsed/1e3}getTimescale(){return this._timescale}setTimescale(t){return this._timescale=t,this}reset(){return this._currentTime=performance.now()-this._startTime,this}dispose(){this.disconnect()}update(t){return this._pageVisibilityHandler!==null&&this._document.hidden===!0?this._delta=0:(this._previousTime=this._currentTime,this._currentTime=(t!==void 0?t:performance.now())-this._startTime,this._delta=(this._currentTime-this._previousTime)*this._timescale,this._elapsed+=this._delta),this}};function s1(){this._document.hidden===!1&&this.reset()}var Ds=class{constructor(t=1,n=0,i=0){this.radius=t,this.phi=n,this.theta=i}set(t,n,i){return this.radius=t,this.phi=n,this.theta=i,this}copy(t){return this.radius=t.radius,this.phi=t.phi,this.theta=t.theta,this}makeSafe(){return this.phi=Kt(this.phi,1e-6,Math.PI-1e-6),this}setFromVector3(t){return this.setFromCartesianCoords(t.x,t.y,t.z)}setFromCartesianCoords(t,n,i){return this.radius=Math.sqrt(t*t+n*n+i*i),this.radius===0?(this.theta=0,this.phi=0):(this.theta=Math.atan2(t,i),this.phi=Math.acos(Kt(n/this.radius,-1,1))),this}clone(){return new this.constructor().copy(this)}};var ta=class extends Fc{constructor(t=10,n=10,i=4473924,r=8947848){i=new Ot(i),r=new Ot(r);let s=n/2,o=t/n,a=t/2,c=[],l=[];for(let d=0,f=0,m=-a;d<=n;d++,m+=o){c.push(-a,0,m,a,0,m),c.push(m,0,-a,m,0,a);let _=d===s?i:r;_.toArray(l,f),f+=3,_.toArray(l,f),f+=3,_.toArray(l,f),f+=3,_.toArray(l,f),f+=3}let u=new ve;u.setAttribute("position",new ce(c,3)),u.setAttribute("color",new ce(l,3));let h=new Jn({vertexColors:!0,toneMapped:!1});super(u,h),this.type="GridHelper"}dispose(){this.geometry.dispose(),this.material.dispose()}};var wn=class extends ai{constructor(t,n=null){super(),this.object=t,this.domElement=n,this.enabled=!0,this.state=-1,this.keys={},this.mouseButtons={LEFT:null,MIDDLE:null,RIGHT:null},this.touches={ONE:null,TWO:null}}connect(t){if(t===void 0){console.warn("THREE.Controls: connect() now requires an element.");return}this.domElement!==null&&this.disconnect(),this.domElement=t}disconnect(){}dispose(){}update(){}};function Ff(e,t,n,i){let r=o1(i);switch(n){case wf:return e*t;case Tf:return e*t/r.components*r.byteLength;case wl:return e*t/r.components*r.byteLength;case Af:return e*t*2/r.components*r.byteLength;case El:return e*t*2/r.components*r.byteLength;case Ef:return e*t*3/r.components*r.byteLength;case kn:return e*t*4/r.components*r.byteLength;case Tl:return e*t*4/r.components*r.byteLength;case ia:case ra:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*8;case sa:case oa:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*16;case Cl:case Pl:return Math.max(e,16)*Math.max(t,8)/4;case Al:case Rl:return Math.max(e,8)*Math.max(t,8)/2;case Il:case Dl:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*8;case Ll:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*16;case Ol:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*16;case Nl:return Math.floor((e+4)/5)*Math.floor((t+3)/4)*16;case Fl:return Math.floor((e+4)/5)*Math.floor((t+4)/5)*16;case Ul:return Math.floor((e+5)/6)*Math.floor((t+4)/5)*16;case zl:return Math.floor((e+5)/6)*Math.floor((t+5)/6)*16;case kl:return Math.floor((e+7)/8)*Math.floor((t+4)/5)*16;case Bl:return Math.floor((e+7)/8)*Math.floor((t+5)/6)*16;case Vl:return Math.floor((e+7)/8)*Math.floor((t+7)/8)*16;case Hl:return Math.floor((e+9)/10)*Math.floor((t+4)/5)*16;case Gl:return Math.floor((e+9)/10)*Math.floor((t+5)/6)*16;case Wl:return Math.floor((e+9)/10)*Math.floor((t+7)/8)*16;case jl:return Math.floor((e+9)/10)*Math.floor((t+9)/10)*16;case ql:return Math.floor((e+11)/12)*Math.floor((t+9)/10)*16;case Xl:return Math.floor((e+11)/12)*Math.floor((t+11)/12)*16;case $l:case Yl:case Zl:return Math.ceil(e/4)*Math.ceil(t/4)*16;case Kl:case Jl:return Math.ceil(e/4)*Math.ceil(t/4)*8;case Ql:case th:return Math.ceil(e/4)*Math.ceil(t/4)*16}throw new Error(`Unable to determine texture byte length for ${n} format.`)}function o1(e){switch(e){case ti:case xf:return{byteLength:1,components:1};case Ls:case bf:case zn:return{byteLength:2,components:1};case Ml:case Sl:return{byteLength:2,components:4};case tr:case bl:case mi:return{byteLength:4,components:1};case Mf:case Sf:return{byteLength:4,components:3}}throw new Error(`Unknown texture type ${e}.`)}typeof __THREE_DEVTOOLS__!="undefined"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:"180"}}));typeof window!="undefined"&&(window.__THREE__?console.warn("WARNING: Multiple instances of Three.js being imported."):window.__THREE__="180");function zg(){let e=null,t=!1,n=null,i=null;function r(s,o){n(s,o),i=e.requestAnimationFrame(r)}return{start:function(){t!==!0&&n!==null&&(i=e.requestAnimationFrame(r),t=!0)},stop:function(){e.cancelAnimationFrame(i),t=!1},setAnimationLoop:function(s){n=s},setContext:function(s){e=s}}}function a1(e){let t=new WeakMap;function n(a,c){let l=a.array,u=a.usage,h=l.byteLength,d=e.createBuffer();e.bindBuffer(c,d),e.bufferData(c,l,u),a.onUploadCallback();let f;if(l instanceof Float32Array)f=e.FLOAT;else if(typeof Float16Array!="undefined"&&l instanceof Float16Array)f=e.HALF_FLOAT;else if(l instanceof Uint16Array)a.isFloat16BufferAttribute?f=e.HALF_FLOAT:f=e.UNSIGNED_SHORT;else if(l instanceof Int16Array)f=e.SHORT;else if(l instanceof Uint32Array)f=e.UNSIGNED_INT;else if(l instanceof Int32Array)f=e.INT;else if(l instanceof Int8Array)f=e.BYTE;else if(l instanceof Uint8Array)f=e.UNSIGNED_BYTE;else if(l instanceof Uint8ClampedArray)f=e.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+l);return{buffer:d,type:f,bytesPerElement:l.BYTES_PER_ELEMENT,version:a.version,size:h}}function i(a,c,l){let u=c.array,h=c.updateRanges;if(e.bindBuffer(l,a),h.length===0)e.bufferSubData(l,0,u);else{h.sort((f,m)=>f.start-m.start);let d=0;for(let f=1;f<h.length;f++){let m=h[d],_=h[f];_.start<=m.start+m.count+1?m.count=Math.max(m.count,_.start+_.count-m.start):(++d,h[d]=_)}h.length=d+1;for(let f=0,m=h.length;f<m;f++){let _=h[f];e.bufferSubData(l,_.start*u.BYTES_PER_ELEMENT,u,_.start,_.count)}c.clearUpdateRanges()}c.onUploadCallback()}function r(a){return a.isInterleavedBufferAttribute&&(a=a.data),t.get(a)}function s(a){a.isInterleavedBufferAttribute&&(a=a.data);let c=t.get(a);c&&(e.deleteBuffer(c.buffer),t.delete(a))}function o(a,c){if(a.isInterleavedBufferAttribute&&(a=a.data),a.isGLBufferAttribute){let u=t.get(a);(!u||u.version<a.version)&&t.set(a,{buffer:a.buffer,type:a.type,bytesPerElement:a.elementSize,version:a.version});return}let l=t.get(a);if(l===void 0)t.set(a,n(a,c));else if(l.version<a.version){if(l.size!==a.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");i(l.buffer,a,c),l.version=a.version}}return{get:r,remove:s,update:o}}var c1=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,l1=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,h1=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,u1=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,f1=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,d1=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,p1=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,m1=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,g1=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec3 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 ).rgb;
	}
#endif`,_1=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,v1=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,y1=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,x1=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,b1=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,M1=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,S1=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,w1=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,E1=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,T1=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,A1=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,C1=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,R1=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,P1=`#if defined( USE_COLOR_ALPHA )
	vColor = vec4( 1.0 );
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec3( 1.0 );
#endif
#ifdef USE_COLOR
	vColor *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.xyz *= instanceColor.xyz;
#endif
#ifdef USE_BATCHING_COLOR
	vec3 batchingColor = getBatchingColor( getIndirectIndex( gl_DrawID ) );
	vColor.xyz *= batchingColor.xyz;
#endif`,I1=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
mat3 transposeMat3( const in mat3 m ) {
	mat3 tmp;
	tmp[ 0 ] = vec3( m[ 0 ].x, m[ 1 ].x, m[ 2 ].x );
	tmp[ 1 ] = vec3( m[ 0 ].y, m[ 1 ].y, m[ 2 ].y );
	tmp[ 2 ] = vec3( m[ 0 ].z, m[ 1 ].z, m[ 2 ].z );
	return tmp;
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,D1=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,L1=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,O1=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,N1=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,F1=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,U1=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,z1="gl_FragColor = linearToOutputTexel( gl_FragColor );",k1=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,B1=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
	#else
		vec4 envColor = vec4( 0.0 );
	#endif
	#ifdef ENVMAP_BLENDING_MULTIPLY
		outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_MIX )
		outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_ADD )
		outgoingLight += envColor.xyz * specularStrength * reflectivity;
	#endif
#endif`,V1=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,H1=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,G1=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,W1=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,j1=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,q1=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,X1=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,$1=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,Y1=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,Z1=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,K1=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,J1=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,Q1=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif`,tM=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, roughness * roughness) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,eM=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,nM=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,iM=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,rM=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,sM=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb * ( 1.0 - metalnessFactor );
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = mix( min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = mix( vec3( 0.04 ), diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.07, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,oM=`struct PhysicalMaterial {
	vec3 diffuseColor;
	float roughness;
	vec3 specularColor;
	float specularF90;
	float dispersion;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		float v = 0.5 / ( gv + gl );
		return saturate(v);
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColor;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transposeMat3( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float a = roughness < 0.25 ? -339.2 * r2 + 161.4 * roughness - 25.9 : -8.48 * r2 + 14.3 * roughness - 9.95;
	float b = roughness < 0.25 ? 44.0 * r2 - 23.7 * roughness + 3.26 : 1.97 * r2 - 3.27 * roughness + 0.72;
	float DG = exp( a * dotNV + b ) + ( roughness < 0.25 ? 0.0 : 0.1 * ( roughness - 0.25 ) );
	return saturate( DG * RECIPROCAL_PI );
}
vec2 DFGApprox( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	const vec4 c0 = vec4( - 1, - 0.0275, - 0.572, 0.022 );
	const vec4 c1 = vec4( 1, 0.0425, 1.04, - 0.04 );
	vec4 r = roughness * c0 + c1;
	float a004 = min( r.x * r.x, exp2( - 9.28 * dotNV ) ) * r.x + r.y;
	vec2 fab = vec2( - 1.04, 1.04 ) * a004 + r.zw;
	return fab;
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColor * t2.x + ( vec3( 1.0 ) - material.specularColor ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseColor * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
	#endif
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnel, material.roughness, singleScattering, multiScattering );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScattering, multiScattering );
	#endif
	vec3 totalScattering = singleScattering + multiScattering;
	vec3 diffuse = material.diffuseColor * ( 1.0 - max( max( totalScattering.r, totalScattering.g ), totalScattering.b ) );
	reflectedLight.indirectSpecular += radiance * singleScattering;
	reflectedLight.indirectSpecular += multiScattering * cosineWeightedIrradiance;
	reflectedLight.indirectDiffuse += diffuse * cosineWeightedIrradiance;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,aM=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnel = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,cM=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )
		iblIrradiance += getIBLIrradiance( geometryNormal );
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,lM=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,hM=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,uM=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,fM=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,dM=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,pM=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,mM=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,gM=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,_M=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,vM=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,yM=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,xM=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,bM=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,MM=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,SM=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,wM=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,EM=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,TM=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,AM=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,CM=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,RM=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,PM=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,IM=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,DM=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,LM=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,OM=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,NM=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,FM=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return depth * ( near - far ) - near;
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return ( near * far ) / ( ( far - near ) * depth - far );
}`,UM=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,zM=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,kM=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,BM=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,VM=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,HM=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,GM=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform sampler2D pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	float texture2DCompare( sampler2D depths, vec2 uv, float compare ) {
		float depth = unpackRGBAToDepth( texture2D( depths, uv ) );
		#ifdef USE_REVERSED_DEPTH_BUFFER
			return step( depth, compare );
		#else
			return step( compare, depth );
		#endif
	}
	vec2 texture2DDistribution( sampler2D shadow, vec2 uv ) {
		return unpackRGBATo2Half( texture2D( shadow, uv ) );
	}
	float VSMShadow( sampler2D shadow, vec2 uv, float compare ) {
		float occlusion = 1.0;
		vec2 distribution = texture2DDistribution( shadow, uv );
		#ifdef USE_REVERSED_DEPTH_BUFFER
			float hard_shadow = step( distribution.x, compare );
		#else
			float hard_shadow = step( compare, distribution.x );
		#endif
		if ( hard_shadow != 1.0 ) {
			float distance = compare - distribution.x;
			float variance = max( 0.00000, distribution.y * distribution.y );
			float softness_probability = variance / (variance + distance * distance );			softness_probability = clamp( ( softness_probability - 0.3 ) / ( 0.95 - 0.3 ), 0.0, 1.0 );			occlusion = clamp( max( hard_shadow, softness_probability ), 0.0, 1.0 );
		}
		return occlusion;
	}
	float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
		float shadow = 1.0;
		shadowCoord.xyz /= shadowCoord.w;
		shadowCoord.z += shadowBias;
		bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
		bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
		if ( frustumTest ) {
		#if defined( SHADOWMAP_TYPE_PCF )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx0 = - texelSize.x * shadowRadius;
			float dy0 = - texelSize.y * shadowRadius;
			float dx1 = + texelSize.x * shadowRadius;
			float dy1 = + texelSize.y * shadowRadius;
			float dx2 = dx0 / 2.0;
			float dy2 = dy0 / 2.0;
			float dx3 = dx1 / 2.0;
			float dy3 = dy1 / 2.0;
			shadow = (
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )
			) * ( 1.0 / 17.0 );
		#elif defined( SHADOWMAP_TYPE_PCF_SOFT )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx = texelSize.x;
			float dy = texelSize.y;
			vec2 uv = shadowCoord.xy;
			vec2 f = fract( uv * shadowMapSize + 0.5 );
			uv -= f * texelSize;
			shadow = (
				texture2DCompare( shadowMap, uv, shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( dx, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( 0.0, dy ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + texelSize, shadowCoord.z ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, 0.0 ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 0.0 ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, dy ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( 0.0, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 0.0, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( texture2DCompare( shadowMap, uv + vec2( dx, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( dx, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( mix( texture2DCompare( shadowMap, uv + vec2( -dx, -dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, -dy ), shadowCoord.z ),
						  f.x ),
					 mix( texture2DCompare( shadowMap, uv + vec2( -dx, 2.0 * dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 2.0 * dy ), shadowCoord.z ),
						  f.x ),
					 f.y )
			) * ( 1.0 / 9.0 );
		#elif defined( SHADOWMAP_TYPE_VSM )
			shadow = VSMShadow( shadowMap, shadowCoord.xy, shadowCoord.z );
		#else
			shadow = texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z );
		#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	vec2 cubeToUV( vec3 v, float texelSizeY ) {
		vec3 absV = abs( v );
		float scaleToCube = 1.0 / max( absV.x, max( absV.y, absV.z ) );
		absV *= scaleToCube;
		v *= scaleToCube * ( 1.0 - 2.0 * texelSizeY );
		vec2 planar = v.xy;
		float almostATexel = 1.5 * texelSizeY;
		float almostOne = 1.0 - almostATexel;
		if ( absV.z >= almostOne ) {
			if ( v.z > 0.0 )
				planar.x = 4.0 - v.x;
		} else if ( absV.x >= almostOne ) {
			float signX = sign( v.x );
			planar.x = v.z * signX + 2.0 * signX;
		} else if ( absV.y >= almostOne ) {
			float signY = sign( v.y );
			planar.x = v.x + 2.0 * signY + 2.0;
			planar.y = v.z * signY - 2.0;
		}
		return vec2( 0.125, 0.25 ) * planar + vec2( 0.375, 0.75 );
	}
	float getPointShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		
		float lightToPositionLength = length( lightToPosition );
		if ( lightToPositionLength - shadowCameraFar <= 0.0 && lightToPositionLength - shadowCameraNear >= 0.0 ) {
			float dp = ( lightToPositionLength - shadowCameraNear ) / ( shadowCameraFar - shadowCameraNear );			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			vec2 texelSize = vec2( 1.0 ) / ( shadowMapSize * vec2( 4.0, 2.0 ) );
			#if defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_PCF_SOFT ) || defined( SHADOWMAP_TYPE_VSM )
				vec2 offset = vec2( - 1, 1 ) * shadowRadius * texelSize.y;
				shadow = (
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxx, texelSize.y ), dp )
				) * ( 1.0 / 9.0 );
			#else
				shadow = texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp );
			#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
#endif`,WM=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,jM=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,qM=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,XM=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,$M=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,YM=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,ZM=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,KM=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,JM=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,QM=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,tS=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,eS=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,nS=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,iS=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,rS=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,sS=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,oS=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,aS=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,cS=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,lS=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,hS=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float flipEnvMap;
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,uS=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,fS=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,dS=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,pS=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,mS=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,gS=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = packDepthToRGBA( dist );
}`,_S=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,vS=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,yS=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,xS=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,bS=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,MS=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,SS=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,wS=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,ES=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,TS=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,AS=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,CS=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <packing>
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( packNormalToRGB( normal ), diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,RS=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,PS=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,IS=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,DS=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
		float sheenEnergyComp = 1.0 - 0.157 * max3( material.sheenColor );
		outgoingLight = outgoingLight * sheenEnergyComp + sheenSpecularDirect + sheenSpecularIndirect;
	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,LS=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,OS=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,NS=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,FS=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,US=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,zS=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <packing>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,kS=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,BS=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,Jt={alphahash_fragment:c1,alphahash_pars_fragment:l1,alphamap_fragment:h1,alphamap_pars_fragment:u1,alphatest_fragment:f1,alphatest_pars_fragment:d1,aomap_fragment:p1,aomap_pars_fragment:m1,batching_pars_vertex:g1,batching_vertex:_1,begin_vertex:v1,beginnormal_vertex:y1,bsdfs:x1,iridescence_fragment:b1,bumpmap_pars_fragment:M1,clipping_planes_fragment:S1,clipping_planes_pars_fragment:w1,clipping_planes_pars_vertex:E1,clipping_planes_vertex:T1,color_fragment:A1,color_pars_fragment:C1,color_pars_vertex:R1,color_vertex:P1,common:I1,cube_uv_reflection_fragment:D1,defaultnormal_vertex:L1,displacementmap_pars_vertex:O1,displacementmap_vertex:N1,emissivemap_fragment:F1,emissivemap_pars_fragment:U1,colorspace_fragment:z1,colorspace_pars_fragment:k1,envmap_fragment:B1,envmap_common_pars_fragment:V1,envmap_pars_fragment:H1,envmap_pars_vertex:G1,envmap_physical_pars_fragment:tM,envmap_vertex:W1,fog_vertex:j1,fog_pars_vertex:q1,fog_fragment:X1,fog_pars_fragment:$1,gradientmap_pars_fragment:Y1,lightmap_pars_fragment:Z1,lights_lambert_fragment:K1,lights_lambert_pars_fragment:J1,lights_pars_begin:Q1,lights_toon_fragment:eM,lights_toon_pars_fragment:nM,lights_phong_fragment:iM,lights_phong_pars_fragment:rM,lights_physical_fragment:sM,lights_physical_pars_fragment:oM,lights_fragment_begin:aM,lights_fragment_maps:cM,lights_fragment_end:lM,logdepthbuf_fragment:hM,logdepthbuf_pars_fragment:uM,logdepthbuf_pars_vertex:fM,logdepthbuf_vertex:dM,map_fragment:pM,map_pars_fragment:mM,map_particle_fragment:gM,map_particle_pars_fragment:_M,metalnessmap_fragment:vM,metalnessmap_pars_fragment:yM,morphinstance_vertex:xM,morphcolor_vertex:bM,morphnormal_vertex:MM,morphtarget_pars_vertex:SM,morphtarget_vertex:wM,normal_fragment_begin:EM,normal_fragment_maps:TM,normal_pars_fragment:AM,normal_pars_vertex:CM,normal_vertex:RM,normalmap_pars_fragment:PM,clearcoat_normal_fragment_begin:IM,clearcoat_normal_fragment_maps:DM,clearcoat_pars_fragment:LM,iridescence_pars_fragment:OM,opaque_fragment:NM,packing:FM,premultiplied_alpha_fragment:UM,project_vertex:zM,dithering_fragment:kM,dithering_pars_fragment:BM,roughnessmap_fragment:VM,roughnessmap_pars_fragment:HM,shadowmap_pars_fragment:GM,shadowmap_pars_vertex:WM,shadowmap_vertex:jM,shadowmask_pars_fragment:qM,skinbase_vertex:XM,skinning_pars_vertex:$M,skinning_vertex:YM,skinnormal_vertex:ZM,specularmap_fragment:KM,specularmap_pars_fragment:JM,tonemapping_fragment:QM,tonemapping_pars_fragment:tS,transmission_fragment:eS,transmission_pars_fragment:nS,uv_pars_fragment:iS,uv_pars_vertex:rS,uv_vertex:sS,worldpos_vertex:oS,background_vert:aS,background_frag:cS,backgroundCube_vert:lS,backgroundCube_frag:hS,cube_vert:uS,cube_frag:fS,depth_vert:dS,depth_frag:pS,distanceRGBA_vert:mS,distanceRGBA_frag:gS,equirect_vert:_S,equirect_frag:vS,linedashed_vert:yS,linedashed_frag:xS,meshbasic_vert:bS,meshbasic_frag:MS,meshlambert_vert:SS,meshlambert_frag:wS,meshmatcap_vert:ES,meshmatcap_frag:TS,meshnormal_vert:AS,meshnormal_frag:CS,meshphong_vert:RS,meshphong_frag:PS,meshphysical_vert:IS,meshphysical_frag:DS,meshtoon_vert:LS,meshtoon_frag:OS,points_vert:NS,points_frag:FS,shadow_vert:US,shadow_frag:zS,sprite_vert:kS,sprite_frag:BS},gt={common:{diffuse:{value:new Ot(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Xt},alphaMap:{value:null},alphaMapTransform:{value:new Xt},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Xt}},envmap:{envMap:{value:null},envMapRotation:{value:new Xt},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Xt}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Xt}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Xt},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Xt},normalScale:{value:new it(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Xt},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Xt}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Xt}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Xt}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Ot(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new Ot(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Xt},alphaTest:{value:0},uvTransform:{value:new Xt}},sprite:{diffuse:{value:new Ot(16777215)},opacity:{value:1},center:{value:new it(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Xt},alphaMap:{value:null},alphaMapTransform:{value:new Xt},alphaTest:{value:0}}},gi={basic:{uniforms:Je([gt.common,gt.specularmap,gt.envmap,gt.aomap,gt.lightmap,gt.fog]),vertexShader:Jt.meshbasic_vert,fragmentShader:Jt.meshbasic_frag},lambert:{uniforms:Je([gt.common,gt.specularmap,gt.envmap,gt.aomap,gt.lightmap,gt.emissivemap,gt.bumpmap,gt.normalmap,gt.displacementmap,gt.fog,gt.lights,{emissive:{value:new Ot(0)}}]),vertexShader:Jt.meshlambert_vert,fragmentShader:Jt.meshlambert_frag},phong:{uniforms:Je([gt.common,gt.specularmap,gt.envmap,gt.aomap,gt.lightmap,gt.emissivemap,gt.bumpmap,gt.normalmap,gt.displacementmap,gt.fog,gt.lights,{emissive:{value:new Ot(0)},specular:{value:new Ot(1118481)},shininess:{value:30}}]),vertexShader:Jt.meshphong_vert,fragmentShader:Jt.meshphong_frag},standard:{uniforms:Je([gt.common,gt.envmap,gt.aomap,gt.lightmap,gt.emissivemap,gt.bumpmap,gt.normalmap,gt.displacementmap,gt.roughnessmap,gt.metalnessmap,gt.fog,gt.lights,{emissive:{value:new Ot(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Jt.meshphysical_vert,fragmentShader:Jt.meshphysical_frag},toon:{uniforms:Je([gt.common,gt.aomap,gt.lightmap,gt.emissivemap,gt.bumpmap,gt.normalmap,gt.displacementmap,gt.gradientmap,gt.fog,gt.lights,{emissive:{value:new Ot(0)}}]),vertexShader:Jt.meshtoon_vert,fragmentShader:Jt.meshtoon_frag},matcap:{uniforms:Je([gt.common,gt.bumpmap,gt.normalmap,gt.displacementmap,gt.fog,{matcap:{value:null}}]),vertexShader:Jt.meshmatcap_vert,fragmentShader:Jt.meshmatcap_frag},points:{uniforms:Je([gt.points,gt.fog]),vertexShader:Jt.points_vert,fragmentShader:Jt.points_frag},dashed:{uniforms:Je([gt.common,gt.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Jt.linedashed_vert,fragmentShader:Jt.linedashed_frag},depth:{uniforms:Je([gt.common,gt.displacementmap]),vertexShader:Jt.depth_vert,fragmentShader:Jt.depth_frag},normal:{uniforms:Je([gt.common,gt.bumpmap,gt.normalmap,gt.displacementmap,{opacity:{value:1}}]),vertexShader:Jt.meshnormal_vert,fragmentShader:Jt.meshnormal_frag},sprite:{uniforms:Je([gt.sprite,gt.fog]),vertexShader:Jt.sprite_vert,fragmentShader:Jt.sprite_frag},background:{uniforms:{uvTransform:{value:new Xt},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Jt.background_vert,fragmentShader:Jt.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Xt}},vertexShader:Jt.backgroundCube_vert,fragmentShader:Jt.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Jt.cube_vert,fragmentShader:Jt.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Jt.equirect_vert,fragmentShader:Jt.equirect_frag},distanceRGBA:{uniforms:Je([gt.common,gt.displacementmap,{referencePosition:{value:new I},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Jt.distanceRGBA_vert,fragmentShader:Jt.distanceRGBA_frag},shadow:{uniforms:Je([gt.lights,gt.fog,{color:{value:new Ot(0)},opacity:{value:1}}]),vertexShader:Jt.shadow_vert,fragmentShader:Jt.shadow_frag}};gi.physical={uniforms:Je([gi.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Xt},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Xt},clearcoatNormalScale:{value:new it(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Xt},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Xt},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Xt},sheen:{value:0},sheenColor:{value:new Ot(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Xt},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Xt},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Xt},transmissionSamplerSize:{value:new it},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Xt},attenuationDistance:{value:0},attenuationColor:{value:new Ot(0)},specularColor:{value:new Ot(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Xt},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Xt},anisotropyVector:{value:new it},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Xt}}]),vertexShader:Jt.meshphysical_vert,fragmentShader:Jt.meshphysical_frag};var nh={r:0,b:0,g:0},Nr=new On,VS=new Vt;function HS(e,t,n,i,r,s,o){let a=new Ot(0),c=s===!0?0:1,l,u,h=null,d=0,f=null;function m(x){let v=x.isScene===!0?x.background:null;return v&&v.isTexture&&(v=(x.backgroundBlurriness>0?n:t).get(v)),v}function _(x){let v=!1,M=m(x);M===null?p(a,c):M&&M.isColor&&(p(M,1),v=!0);let S=e.xr.getEnvironmentBlendMode();S==="additive"?i.buffers.color.setClear(0,0,0,1,o):S==="alpha-blend"&&i.buffers.color.setClear(0,0,0,0,o),(e.autoClear||v)&&(i.buffers.depth.setTest(!0),i.buffers.depth.setMask(!0),i.buffers.color.setMask(!0),e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil))}function g(x,v){let M=m(v);M&&(M.isCubeTexture||M.mapping===ea)?(u===void 0&&(u=new we(new ws(1,1,1),new Le({name:"BackgroundCubeMaterial",uniforms:Or(gi.backgroundCube.uniforms),vertexShader:gi.backgroundCube.vertexShader,fragmentShader:gi.backgroundCube.fragmentShader,side:We,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),u.geometry.deleteAttribute("normal"),u.geometry.deleteAttribute("uv"),u.onBeforeRender=function(S,C,P){this.matrixWorld.copyPosition(P.matrixWorld)},Object.defineProperty(u.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),r.update(u)),Nr.copy(v.backgroundRotation),Nr.x*=-1,Nr.y*=-1,Nr.z*=-1,M.isCubeTexture&&M.isRenderTargetTexture===!1&&(Nr.y*=-1,Nr.z*=-1),u.material.uniforms.envMap.value=M,u.material.uniforms.flipEnvMap.value=M.isCubeTexture&&M.isRenderTargetTexture===!1?-1:1,u.material.uniforms.backgroundBlurriness.value=v.backgroundBlurriness,u.material.uniforms.backgroundIntensity.value=v.backgroundIntensity,u.material.uniforms.backgroundRotation.value.setFromMatrix4(VS.makeRotationFromEuler(Nr)),u.material.toneMapped=ie.getTransfer(M.colorSpace)!==ae,(h!==M||d!==M.version||f!==e.toneMapping)&&(u.material.needsUpdate=!0,h=M,d=M.version,f=e.toneMapping),u.layers.enableAll(),x.unshift(u,u.geometry,u.material,0,0,null)):M&&M.isTexture&&(l===void 0&&(l=new we(new Ho(2,2),new Le({name:"BackgroundMaterial",uniforms:Or(gi.background.uniforms),vertexShader:gi.background.vertexShader,fragmentShader:gi.background.fragmentShader,side:Pi,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute("normal"),Object.defineProperty(l.material,"map",{get:function(){return this.uniforms.t2D.value}}),r.update(l)),l.material.uniforms.t2D.value=M,l.material.uniforms.backgroundIntensity.value=v.backgroundIntensity,l.material.toneMapped=ie.getTransfer(M.colorSpace)!==ae,M.matrixAutoUpdate===!0&&M.updateMatrix(),l.material.uniforms.uvTransform.value.copy(M.matrix),(h!==M||d!==M.version||f!==e.toneMapping)&&(l.material.needsUpdate=!0,h=M,d=M.version,f=e.toneMapping),l.layers.enableAll(),x.unshift(l,l.geometry,l.material,0,0,null))}function p(x,v){x.getRGB(nh,Df(e)),i.buffers.color.setClear(nh.r,nh.g,nh.b,v,o)}function b(){u!==void 0&&(u.geometry.dispose(),u.material.dispose(),u=void 0),l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0)}return{getClearColor:function(){return a},setClearColor:function(x,v=1){a.set(x),c=v,p(a,c)},getClearAlpha:function(){return c},setClearAlpha:function(x){c=x,p(a,c)},render:_,addToRenderList:g,dispose:b}}function GS(e,t){let n=e.getParameter(e.MAX_VERTEX_ATTRIBS),i={},r=d(null),s=r,o=!1;function a(w,R,V,N,k){let z=!1,G=h(N,V,R);s!==G&&(s=G,l(s.object)),z=f(w,N,V,k),z&&m(w,N,V,k),k!==null&&t.update(k,e.ELEMENT_ARRAY_BUFFER),(z||o)&&(o=!1,v(w,R,V,N),k!==null&&e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,t.get(k).buffer))}function c(){return e.createVertexArray()}function l(w){return e.bindVertexArray(w)}function u(w){return e.deleteVertexArray(w)}function h(w,R,V){let N=V.wireframe===!0,k=i[w.id];k===void 0&&(k={},i[w.id]=k);let z=k[R.id];z===void 0&&(z={},k[R.id]=z);let G=z[N];return G===void 0&&(G=d(c()),z[N]=G),G}function d(w){let R=[],V=[],N=[];for(let k=0;k<n;k++)R[k]=0,V[k]=0,N[k]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:R,enabledAttributes:V,attributeDivisors:N,object:w,attributes:{},index:null}}function f(w,R,V,N){let k=s.attributes,z=R.attributes,G=0,K=V.getAttributes();for(let j in K)if(K[j].location>=0){let _t=k[j],$=z[j];if($===void 0&&(j==="instanceMatrix"&&w.instanceMatrix&&($=w.instanceMatrix),j==="instanceColor"&&w.instanceColor&&($=w.instanceColor)),_t===void 0||_t.attribute!==$||$&&_t.data!==$.data)return!0;G++}return s.attributesNum!==G||s.index!==N}function m(w,R,V,N){let k={},z=R.attributes,G=0,K=V.getAttributes();for(let j in K)if(K[j].location>=0){let _t=z[j];_t===void 0&&(j==="instanceMatrix"&&w.instanceMatrix&&(_t=w.instanceMatrix),j==="instanceColor"&&w.instanceColor&&(_t=w.instanceColor));let $={};$.attribute=_t,_t&&_t.data&&($.data=_t.data),k[j]=$,G++}s.attributes=k,s.attributesNum=G,s.index=N}function _(){let w=s.newAttributes;for(let R=0,V=w.length;R<V;R++)w[R]=0}function g(w){p(w,0)}function p(w,R){let V=s.newAttributes,N=s.enabledAttributes,k=s.attributeDivisors;V[w]=1,N[w]===0&&(e.enableVertexAttribArray(w),N[w]=1),k[w]!==R&&(e.vertexAttribDivisor(w,R),k[w]=R)}function b(){let w=s.newAttributes,R=s.enabledAttributes;for(let V=0,N=R.length;V<N;V++)R[V]!==w[V]&&(e.disableVertexAttribArray(V),R[V]=0)}function x(w,R,V,N,k,z,G){G===!0?e.vertexAttribIPointer(w,R,V,k,z):e.vertexAttribPointer(w,R,V,N,k,z)}function v(w,R,V,N){_();let k=N.attributes,z=V.getAttributes(),G=R.defaultAttributeValues;for(let K in z){let j=z[K];if(j.location>=0){let at=k[K];if(at===void 0&&(K==="instanceMatrix"&&w.instanceMatrix&&(at=w.instanceMatrix),K==="instanceColor"&&w.instanceColor&&(at=w.instanceColor)),at!==void 0){let _t=at.normalized,$=at.itemSize,rt=t.get(at);if(rt===void 0)continue;let pt=rt.buffer,zt=rt.type,Lt=rt.bytesPerElement,X=zt===e.INT||zt===e.UNSIGNED_INT||at.gpuType===bl;if(at.isInterleavedBufferAttribute){let tt=at.data,yt=tt.stride,Bt=at.offset;if(tt.isInstancedInterleavedBuffer){for(let It=0;It<j.locationSize;It++)p(j.location+It,tt.meshPerAttribute);w.isInstancedMesh!==!0&&N._maxInstanceCount===void 0&&(N._maxInstanceCount=tt.meshPerAttribute*tt.count)}else for(let It=0;It<j.locationSize;It++)g(j.location+It);e.bindBuffer(e.ARRAY_BUFFER,pt);for(let It=0;It<j.locationSize;It++)x(j.location+It,$/j.locationSize,zt,_t,yt*Lt,(Bt+$/j.locationSize*It)*Lt,X)}else{if(at.isInstancedBufferAttribute){for(let tt=0;tt<j.locationSize;tt++)p(j.location+tt,at.meshPerAttribute);w.isInstancedMesh!==!0&&N._maxInstanceCount===void 0&&(N._maxInstanceCount=at.meshPerAttribute*at.count)}else for(let tt=0;tt<j.locationSize;tt++)g(j.location+tt);e.bindBuffer(e.ARRAY_BUFFER,pt);for(let tt=0;tt<j.locationSize;tt++)x(j.location+tt,$/j.locationSize,zt,_t,$*Lt,$/j.locationSize*tt*Lt,X)}}else if(G!==void 0){let _t=G[K];if(_t!==void 0)switch(_t.length){case 2:e.vertexAttrib2fv(j.location,_t);break;case 3:e.vertexAttrib3fv(j.location,_t);break;case 4:e.vertexAttrib4fv(j.location,_t);break;default:e.vertexAttrib1fv(j.location,_t)}}}}b()}function M(){P();for(let w in i){let R=i[w];for(let V in R){let N=R[V];for(let k in N)u(N[k].object),delete N[k];delete R[V]}delete i[w]}}function S(w){if(i[w.id]===void 0)return;let R=i[w.id];for(let V in R){let N=R[V];for(let k in N)u(N[k].object),delete N[k];delete R[V]}delete i[w.id]}function C(w){for(let R in i){let V=i[R];if(V[w.id]===void 0)continue;let N=V[w.id];for(let k in N)u(N[k].object),delete N[k];delete V[w.id]}}function P(){T(),o=!0,s!==r&&(s=r,l(s.object))}function T(){r.geometry=null,r.program=null,r.wireframe=!1}return{setup:a,reset:P,resetDefaultState:T,dispose:M,releaseStatesOfGeometry:S,releaseStatesOfProgram:C,initAttributes:_,enableAttribute:g,disableUnusedAttributes:b}}function WS(e,t,n){let i;function r(l){i=l}function s(l,u){e.drawArrays(i,l,u),n.update(u,i,1)}function o(l,u,h){h!==0&&(e.drawArraysInstanced(i,l,u,h),n.update(u,i,h))}function a(l,u,h){if(h===0)return;t.get("WEBGL_multi_draw").multiDrawArraysWEBGL(i,l,0,u,0,h);let f=0;for(let m=0;m<h;m++)f+=u[m];n.update(f,i,1)}function c(l,u,h,d){if(h===0)return;let f=t.get("WEBGL_multi_draw");if(f===null)for(let m=0;m<l.length;m++)o(l[m],u[m],d[m]);else{f.multiDrawArraysInstancedWEBGL(i,l,0,u,0,d,0,h);let m=0;for(let _=0;_<h;_++)m+=u[_]*d[_];n.update(m,i,1)}}this.setMode=r,this.render=s,this.renderInstances=o,this.renderMultiDraw=a,this.renderMultiDrawInstances=c}function jS(e,t,n,i){let r;function s(){if(r!==void 0)return r;if(t.has("EXT_texture_filter_anisotropic")===!0){let C=t.get("EXT_texture_filter_anisotropic");r=e.getParameter(C.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else r=0;return r}function o(C){return!(C!==kn&&i.convert(C)!==e.getParameter(e.IMPLEMENTATION_COLOR_READ_FORMAT))}function a(C){let P=C===zn&&(t.has("EXT_color_buffer_half_float")||t.has("EXT_color_buffer_float"));return!(C!==ti&&i.convert(C)!==e.getParameter(e.IMPLEMENTATION_COLOR_READ_TYPE)&&C!==mi&&!P)}function c(C){if(C==="highp"){if(e.getShaderPrecisionFormat(e.VERTEX_SHADER,e.HIGH_FLOAT).precision>0&&e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.HIGH_FLOAT).precision>0)return"highp";C="mediump"}return C==="mediump"&&e.getShaderPrecisionFormat(e.VERTEX_SHADER,e.MEDIUM_FLOAT).precision>0&&e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let l=n.precision!==void 0?n.precision:"highp",u=c(l);u!==l&&(console.warn("THREE.WebGLRenderer:",l,"not supported, using",u,"instead."),l=u);let h=n.logarithmicDepthBuffer===!0,d=n.reversedDepthBuffer===!0&&t.has("EXT_clip_control"),f=e.getParameter(e.MAX_TEXTURE_IMAGE_UNITS),m=e.getParameter(e.MAX_VERTEX_TEXTURE_IMAGE_UNITS),_=e.getParameter(e.MAX_TEXTURE_SIZE),g=e.getParameter(e.MAX_CUBE_MAP_TEXTURE_SIZE),p=e.getParameter(e.MAX_VERTEX_ATTRIBS),b=e.getParameter(e.MAX_VERTEX_UNIFORM_VECTORS),x=e.getParameter(e.MAX_VARYING_VECTORS),v=e.getParameter(e.MAX_FRAGMENT_UNIFORM_VECTORS),M=m>0,S=e.getParameter(e.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:s,getMaxPrecision:c,textureFormatReadable:o,textureTypeReadable:a,precision:l,logarithmicDepthBuffer:h,reversedDepthBuffer:d,maxTextures:f,maxVertexTextures:m,maxTextureSize:_,maxCubemapSize:g,maxAttributes:p,maxVertexUniforms:b,maxVaryings:x,maxFragmentUniforms:v,vertexTextures:M,maxSamples:S}}function qS(e){let t=this,n=null,i=0,r=!1,s=!1,o=new dn,a=new Xt,c={value:null,needsUpdate:!1};this.uniform=c,this.numPlanes=0,this.numIntersection=0,this.init=function(h,d){let f=h.length!==0||d||i!==0||r;return r=d,i=h.length,f},this.beginShadows=function(){s=!0,u(null)},this.endShadows=function(){s=!1},this.setGlobalState=function(h,d){n=u(h,d,0)},this.setState=function(h,d,f){let m=h.clippingPlanes,_=h.clipIntersection,g=h.clipShadows,p=e.get(h);if(!r||m===null||m.length===0||s&&!g)s?u(null):l();else{let b=s?0:i,x=b*4,v=p.clippingState||null;c.value=v,v=u(m,d,x,f);for(let M=0;M!==x;++M)v[M]=n[M];p.clippingState=v,this.numIntersection=_?this.numPlanes:0,this.numPlanes+=b}};function l(){c.value!==n&&(c.value=n,c.needsUpdate=i>0),t.numPlanes=i,t.numIntersection=0}function u(h,d,f,m){let _=h!==null?h.length:0,g=null;if(_!==0){if(g=c.value,m!==!0||g===null){let p=f+_*4,b=d.matrixWorldInverse;a.getNormalMatrix(b),(g===null||g.length<p)&&(g=new Float32Array(p));for(let x=0,v=f;x!==_;++x,v+=4)o.copy(h[x]).applyMatrix4(b,a),o.normal.toArray(g,v),g[v+3]=o.constant}c.value=g,c.needsUpdate=!0}return t.numPlanes=_,t.numIntersection=0,g}}function XS(e){let t=new WeakMap;function n(o,a){return a===vl?o.mapping=Dr:a===yl&&(o.mapping=Lr),o}function i(o){if(o&&o.isTexture){let a=o.mapping;if(a===vl||a===yl)if(t.has(o)){let c=t.get(o).texture;return n(c,o.mapping)}else{let c=o.image;if(c&&c.height>0){let l=new Dc(c.height);return l.fromEquirectangularTexture(e,o),t.set(o,l),o.addEventListener("dispose",r),n(l.texture,o.mapping)}else return null}}return o}function r(o){let a=o.target;a.removeEventListener("dispose",r);let c=t.get(a);c!==void 0&&(t.delete(a),c.dispose())}function s(){t=new WeakMap}return{get:i,dispose:s}}var Us=4,mg=[.125,.215,.35,.446,.526,.582],zr=20,Uf=new Pr,gg=new Ot,zf=null,kf=0,Bf=0,Vf=!1,Ur=(1+Math.sqrt(5))/2,Fs=1/Ur,_g=[new I(-Ur,Fs,0),new I(Ur,Fs,0),new I(-Fs,0,Ur),new I(Fs,0,Ur),new I(0,Ur,-Fs),new I(0,Ur,Fs),new I(-1,1,-1),new I(1,1,-1),new I(-1,1,1),new I(1,1,1)],$S=new I,sh=class{constructor(t){this._renderer=t,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene(t,n=0,i=.1,r=100,s={}){let{size:o=256,position:a=$S}=s;zf=this._renderer.getRenderTarget(),kf=this._renderer.getActiveCubeFace(),Bf=this._renderer.getActiveMipmapLevel(),Vf=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(o);let c=this._allocateTargets();return c.depthBuffer=!0,this._sceneToCubeUV(t,i,r,c,a),n>0&&this._blur(c,0,0,n),this._applyPMREM(c),this._cleanup(c),c}fromEquirectangular(t,n=null){return this._fromTexture(t,n)}fromCubemap(t,n=null){return this._fromTexture(t,n)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=xg(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=yg(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose()}_setSize(t){this._lodMax=Math.floor(Math.log2(t)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let t=0;t<this._lodPlanes.length;t++)this._lodPlanes[t].dispose()}_cleanup(t){this._renderer.setRenderTarget(zf,kf,Bf),this._renderer.xr.enabled=Vf,t.scissorTest=!1,ih(t,0,0,t.width,t.height)}_fromTexture(t,n){t.mapping===Dr||t.mapping===Lr?this._setSize(t.image.length===0?16:t.image[0].width||t.image[0].image.width):this._setSize(t.image.width/4),zf=this._renderer.getRenderTarget(),kf=this._renderer.getActiveCubeFace(),Bf=this._renderer.getActiveMipmapLevel(),Vf=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;let i=n||this._allocateTargets();return this._textureToCubeUV(t,i),this._applyPMREM(i),this._cleanup(i),i}_allocateTargets(){let t=3*Math.max(this._cubeSize,112),n=4*this._cubeSize,i={magFilter:Kn,minFilter:Kn,generateMipmaps:!1,type:zn,format:kn,colorSpace:Ar,depthBuffer:!1},r=vg(t,n,i);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==t||this._pingPongRenderTarget.height!==n){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=vg(t,n,i);let{_lodMax:s}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=YS(s)),this._blurMaterial=ZS(s,t,n)}return r}_compileMaterial(t){let n=new we(this._lodPlanes[0],t);this._renderer.compile(n,Uf)}_sceneToCubeUV(t,n,i,r,s){let c=new Ge(90,1,n,i),l=[1,-1,1,1,1,1],u=[1,1,1,-1,-1,-1],h=this._renderer,d=h.autoClear,f=h.toneMapping;h.getClearColor(gg),h.toneMapping=Oi,h.autoClear=!1,h.state.buffers.depth.getReversed()&&(h.setRenderTarget(r),h.clearDepth(),h.setRenderTarget(null));let _=new Mn({name:"PMREM.Background",side:We,depthWrite:!1,depthTest:!1}),g=new we(new ws,_),p=!1,b=t.background;b?b.isColor&&(_.color.copy(b),t.background=null,p=!0):(_.color.copy(gg),p=!0);for(let x=0;x<6;x++){let v=x%3;v===0?(c.up.set(0,l[x],0),c.position.set(s.x,s.y,s.z),c.lookAt(s.x+u[x],s.y,s.z)):v===1?(c.up.set(0,0,l[x]),c.position.set(s.x,s.y,s.z),c.lookAt(s.x,s.y+u[x],s.z)):(c.up.set(0,l[x],0),c.position.set(s.x,s.y,s.z),c.lookAt(s.x,s.y,s.z+u[x]));let M=this._cubeSize;ih(r,v*M,x>2?M:0,M,M),h.setRenderTarget(r),p&&h.render(g,c),h.render(t,c)}g.geometry.dispose(),g.material.dispose(),h.toneMapping=f,h.autoClear=d,t.background=b}_textureToCubeUV(t,n){let i=this._renderer,r=t.mapping===Dr||t.mapping===Lr;r?(this._cubemapMaterial===null&&(this._cubemapMaterial=xg()),this._cubemapMaterial.uniforms.flipEnvMap.value=t.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=yg());let s=r?this._cubemapMaterial:this._equirectMaterial,o=new we(this._lodPlanes[0],s),a=s.uniforms;a.envMap.value=t;let c=this._cubeSize;ih(n,0,0,3*c,2*c),i.setRenderTarget(n),i.render(o,Uf)}_applyPMREM(t){let n=this._renderer,i=n.autoClear;n.autoClear=!1;let r=this._lodPlanes.length;for(let s=1;s<r;s++){let o=Math.sqrt(this._sigmas[s]*this._sigmas[s]-this._sigmas[s-1]*this._sigmas[s-1]),a=_g[(r-s-1)%_g.length];this._blur(t,s-1,s,o,a)}n.autoClear=i}_blur(t,n,i,r,s){let o=this._pingPongRenderTarget;this._halfBlur(t,o,n,i,r,"latitudinal",s),this._halfBlur(o,t,i,i,r,"longitudinal",s)}_halfBlur(t,n,i,r,s,o,a){let c=this._renderer,l=this._blurMaterial;o!=="latitudinal"&&o!=="longitudinal"&&console.error("blur direction must be either latitudinal or longitudinal!");let u=3,h=new we(this._lodPlanes[r],l),d=l.uniforms,f=this._sizeLods[i]-1,m=isFinite(s)?Math.PI/(2*f):2*Math.PI/(2*zr-1),_=s/m,g=isFinite(s)?1+Math.floor(u*_):zr;g>zr&&console.warn(`sigmaRadians, ${s}, is too large and will clip, as it requested ${g} samples when the maximum is set to ${zr}`);let p=[],b=0;for(let C=0;C<zr;++C){let P=C/_,T=Math.exp(-P*P/2);p.push(T),C===0?b+=T:C<g&&(b+=2*T)}for(let C=0;C<p.length;C++)p[C]=p[C]/b;d.envMap.value=t.texture,d.samples.value=g,d.weights.value=p,d.latitudinal.value=o==="latitudinal",a&&(d.poleAxis.value=a);let{_lodMax:x}=this;d.dTheta.value=m,d.mipInt.value=x-i;let v=this._sizeLods[r],M=3*v*(r>x-Us?r-x+Us:0),S=4*(this._cubeSize-v);ih(n,M,S,3*v,2*v),c.setRenderTarget(n),c.render(h,Uf)}};function YS(e){let t=[],n=[],i=[],r=e,s=e-Us+1+mg.length;for(let o=0;o<s;o++){let a=Math.pow(2,r);n.push(a);let c=1/a;o>e-Us?c=mg[o-e+Us-1]:o===0&&(c=0),i.push(c);let l=1/(a-2),u=-l,h=1+l,d=[u,u,h,u,h,h,u,u,h,h,u,h],f=6,m=6,_=3,g=2,p=1,b=new Float32Array(_*m*f),x=new Float32Array(g*m*f),v=new Float32Array(p*m*f);for(let S=0;S<f;S++){let C=S%3*2/3-1,P=S>2?0:-1,T=[C,P,0,C+2/3,P,0,C+2/3,P+1,0,C,P,0,C+2/3,P+1,0,C,P+1,0];b.set(T,_*m*S),x.set(d,g*m*S);let w=[S,S,S,S,S,S];v.set(w,p*m*S)}let M=new ve;M.setAttribute("position",new Ze(b,_)),M.setAttribute("uv",new Ze(x,g)),M.setAttribute("faceIndex",new Ze(v,p)),t.push(M),r>Us&&r--}return{lodPlanes:t,sizeLods:n,sigmas:i}}function vg(e,t,n){let i=new Ke(e,t,n);return i.texture.mapping=ea,i.texture.name="PMREM.cubeUv",i.scissorTest=!0,i}function ih(e,t,n,i,r){e.viewport.set(t,n,i,r),e.scissor.set(t,n,i,r)}function ZS(e,t,n){let i=new Float32Array(zr),r=new I(0,1,0);return new Le({name:"SphericalGaussianBlur",defines:{n:zr,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/n,CUBEUV_MAX_MIP:`${e}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:i},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:r}},vertexShader:Jf(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:Qn,depthTest:!1,depthWrite:!1})}function yg(){return new Le({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:Jf(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:Qn,depthTest:!1,depthWrite:!1})}function xg(){return new Le({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Jf(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:Qn,depthTest:!1,depthWrite:!1})}function Jf(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}function KS(e){let t=new WeakMap,n=null;function i(a){if(a&&a.isTexture){let c=a.mapping,l=c===vl||c===yl,u=c===Dr||c===Lr;if(l||u){let h=t.get(a),d=h!==void 0?h.texture.pmremVersion:0;if(a.isRenderTargetTexture&&a.pmremVersion!==d)return n===null&&(n=new sh(e)),h=l?n.fromEquirectangular(a,h):n.fromCubemap(a,h),h.texture.pmremVersion=a.pmremVersion,t.set(a,h),h.texture;if(h!==void 0)return h.texture;{let f=a.image;return l&&f&&f.height>0||u&&f&&r(f)?(n===null&&(n=new sh(e)),h=l?n.fromEquirectangular(a):n.fromCubemap(a),h.texture.pmremVersion=a.pmremVersion,t.set(a,h),a.addEventListener("dispose",s),h.texture):null}}}return a}function r(a){let c=0,l=6;for(let u=0;u<l;u++)a[u]!==void 0&&c++;return c===l}function s(a){let c=a.target;c.removeEventListener("dispose",s);let l=t.get(c);l!==void 0&&(t.delete(c),l.dispose())}function o(){t=new WeakMap,n!==null&&(n.dispose(),n=null)}return{get:i,dispose:o}}function JS(e){let t={};function n(i){if(t[i]!==void 0)return t[i];let r;switch(i){case"WEBGL_depth_texture":r=e.getExtension("WEBGL_depth_texture")||e.getExtension("MOZ_WEBGL_depth_texture")||e.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":r=e.getExtension("EXT_texture_filter_anisotropic")||e.getExtension("MOZ_EXT_texture_filter_anisotropic")||e.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":r=e.getExtension("WEBGL_compressed_texture_s3tc")||e.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||e.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":r=e.getExtension("WEBGL_compressed_texture_pvrtc")||e.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:r=e.getExtension(i)}return t[i]=r,r}return{has:function(i){return n(i)!==null},init:function(){n("EXT_color_buffer_float"),n("WEBGL_clip_cull_distance"),n("OES_texture_float_linear"),n("EXT_color_buffer_half_float"),n("WEBGL_multisampled_render_to_texture"),n("WEBGL_render_shared_exponent")},get:function(i){let r=n(i);return r===null&&bs("THREE.WebGLRenderer: "+i+" extension not supported."),r}}}function QS(e,t,n,i){let r={},s=new WeakMap;function o(h){let d=h.target;d.index!==null&&t.remove(d.index);for(let m in d.attributes)t.remove(d.attributes[m]);d.removeEventListener("dispose",o),delete r[d.id];let f=s.get(d);f&&(t.remove(f),s.delete(d)),i.releaseStatesOfGeometry(d),d.isInstancedBufferGeometry===!0&&delete d._maxInstanceCount,n.memory.geometries--}function a(h,d){return r[d.id]===!0||(d.addEventListener("dispose",o),r[d.id]=!0,n.memory.geometries++),d}function c(h){let d=h.attributes;for(let f in d)t.update(d[f],e.ARRAY_BUFFER)}function l(h){let d=[],f=h.index,m=h.attributes.position,_=0;if(f!==null){let b=f.array;_=f.version;for(let x=0,v=b.length;x<v;x+=3){let M=b[x+0],S=b[x+1],C=b[x+2];d.push(M,S,S,C,C,M)}}else if(m!==void 0){let b=m.array;_=m.version;for(let x=0,v=b.length/3-1;x<v;x+=3){let M=x+0,S=x+1,C=x+2;d.push(M,S,S,C,C,M)}}else return;let g=new(If(d)?Io:Po)(d,1);g.version=_;let p=s.get(h);p&&t.remove(p),s.set(h,g)}function u(h){let d=s.get(h);if(d){let f=h.index;f!==null&&d.version<f.version&&l(h)}else l(h);return s.get(h)}return{get:a,update:c,getWireframeAttribute:u}}function tw(e,t,n){let i;function r(d){i=d}let s,o;function a(d){s=d.type,o=d.bytesPerElement}function c(d,f){e.drawElements(i,f,s,d*o),n.update(f,i,1)}function l(d,f,m){m!==0&&(e.drawElementsInstanced(i,f,s,d*o,m),n.update(f,i,m))}function u(d,f,m){if(m===0)return;t.get("WEBGL_multi_draw").multiDrawElementsWEBGL(i,f,0,s,d,0,m);let g=0;for(let p=0;p<m;p++)g+=f[p];n.update(g,i,1)}function h(d,f,m,_){if(m===0)return;let g=t.get("WEBGL_multi_draw");if(g===null)for(let p=0;p<d.length;p++)l(d[p]/o,f[p],_[p]);else{g.multiDrawElementsInstancedWEBGL(i,f,0,s,d,0,_,0,m);let p=0;for(let b=0;b<m;b++)p+=f[b]*_[b];n.update(p,i,1)}}this.setMode=r,this.setIndex=a,this.render=c,this.renderInstances=l,this.renderMultiDraw=u,this.renderMultiDrawInstances=h}function ew(e){let t={geometries:0,textures:0},n={frame:0,calls:0,triangles:0,points:0,lines:0};function i(s,o,a){switch(n.calls++,o){case e.TRIANGLES:n.triangles+=a*(s/3);break;case e.LINES:n.lines+=a*(s/2);break;case e.LINE_STRIP:n.lines+=a*(s-1);break;case e.LINE_LOOP:n.lines+=a*s;break;case e.POINTS:n.points+=a*s;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",o);break}}function r(){n.calls=0,n.triangles=0,n.points=0,n.lines=0}return{memory:t,render:n,programs:null,autoReset:!0,reset:r,update:i}}function nw(e,t,n){let i=new WeakMap,r=new de;function s(o,a,c){let l=o.morphTargetInfluences,u=a.morphAttributes.position||a.morphAttributes.normal||a.morphAttributes.color,h=u!==void 0?u.length:0,d=i.get(a);if(d===void 0||d.count!==h){let T=function(){C.dispose(),i.delete(a),a.removeEventListener("dispose",T)};d!==void 0&&d.texture.dispose();let f=a.morphAttributes.position!==void 0,m=a.morphAttributes.normal!==void 0,_=a.morphAttributes.color!==void 0,g=a.morphAttributes.position||[],p=a.morphAttributes.normal||[],b=a.morphAttributes.color||[],x=0;f===!0&&(x=1),m===!0&&(x=2),_===!0&&(x=3);let v=a.attributes.position.count*x,M=1;v>t.maxTextureSize&&(M=Math.ceil(v/t.maxTextureSize),v=t.maxTextureSize);let S=new Float32Array(v*M*4*h),C=new Ro(S,v,M,h);C.type=mi,C.needsUpdate=!0;let P=x*4;for(let w=0;w<h;w++){let R=g[w],V=p[w],N=b[w],k=v*M*4*w;for(let z=0;z<R.count;z++){let G=z*P;f===!0&&(r.fromBufferAttribute(R,z),S[k+G+0]=r.x,S[k+G+1]=r.y,S[k+G+2]=r.z,S[k+G+3]=0),m===!0&&(r.fromBufferAttribute(V,z),S[k+G+4]=r.x,S[k+G+5]=r.y,S[k+G+6]=r.z,S[k+G+7]=0),_===!0&&(r.fromBufferAttribute(N,z),S[k+G+8]=r.x,S[k+G+9]=r.y,S[k+G+10]=r.z,S[k+G+11]=N.itemSize===4?r.w:1)}}d={count:h,texture:C,size:new it(v,M)},i.set(a,d),a.addEventListener("dispose",T)}if(o.isInstancedMesh===!0&&o.morphTexture!==null)c.getUniforms().setValue(e,"morphTexture",o.morphTexture,n);else{let f=0;for(let _=0;_<l.length;_++)f+=l[_];let m=a.morphTargetsRelative?1:1-f;c.getUniforms().setValue(e,"morphTargetBaseInfluence",m),c.getUniforms().setValue(e,"morphTargetInfluences",l)}c.getUniforms().setValue(e,"morphTargetsTexture",d.texture,n),c.getUniforms().setValue(e,"morphTargetsTextureSize",d.size)}return{update:s}}function iw(e,t,n,i){let r=new WeakMap;function s(c){let l=i.render.frame,u=c.geometry,h=t.get(c,u);if(r.get(h)!==l&&(t.update(h),r.set(h,l)),c.isInstancedMesh&&(c.hasEventListener("dispose",a)===!1&&c.addEventListener("dispose",a),r.get(c)!==l&&(n.update(c.instanceMatrix,e.ARRAY_BUFFER),c.instanceColor!==null&&n.update(c.instanceColor,e.ARRAY_BUFFER),r.set(c,l))),c.isSkinnedMesh){let d=c.skeleton;r.get(d)!==l&&(d.update(),r.set(d,l))}return h}function o(){r=new WeakMap}function a(c){let l=c.target;l.removeEventListener("dispose",a),n.remove(l.instanceMatrix),l.instanceColor!==null&&n.remove(l.instanceColor)}return{update:s,dispose:o}}var kg=new an,bg=new ko(1,1),Bg=new Ro,Vg=new Pc,Hg=new Lo,Mg=[],Sg=[],wg=new Float32Array(16),Eg=new Float32Array(9),Tg=new Float32Array(4);function ks(e,t,n){let i=e[0];if(i<=0||i>0)return e;let r=t*n,s=Mg[r];if(s===void 0&&(s=new Float32Array(r),Mg[r]=s),t!==0){i.toArray(s,0);for(let o=1,a=0;o!==t;++o)a+=n,e[o].toArray(s,a)}return s}function Fe(e,t){if(e.length!==t.length)return!1;for(let n=0,i=e.length;n<i;n++)if(e[n]!==t[n])return!1;return!0}function Ue(e,t){for(let n=0,i=t.length;n<i;n++)e[n]=t[n]}function ah(e,t){let n=Sg[t];n===void 0&&(n=new Int32Array(t),Sg[t]=n);for(let i=0;i!==t;++i)n[i]=e.allocateTextureUnit();return n}function rw(e,t){let n=this.cache;n[0]!==t&&(e.uniform1f(this.addr,t),n[0]=t)}function sw(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2f(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(Fe(n,t))return;e.uniform2fv(this.addr,t),Ue(n,t)}}function ow(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3f(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else if(t.r!==void 0)(n[0]!==t.r||n[1]!==t.g||n[2]!==t.b)&&(e.uniform3f(this.addr,t.r,t.g,t.b),n[0]=t.r,n[1]=t.g,n[2]=t.b);else{if(Fe(n,t))return;e.uniform3fv(this.addr,t),Ue(n,t)}}function aw(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4f(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(Fe(n,t))return;e.uniform4fv(this.addr,t),Ue(n,t)}}function cw(e,t){let n=this.cache,i=t.elements;if(i===void 0){if(Fe(n,t))return;e.uniformMatrix2fv(this.addr,!1,t),Ue(n,t)}else{if(Fe(n,i))return;Tg.set(i),e.uniformMatrix2fv(this.addr,!1,Tg),Ue(n,i)}}function lw(e,t){let n=this.cache,i=t.elements;if(i===void 0){if(Fe(n,t))return;e.uniformMatrix3fv(this.addr,!1,t),Ue(n,t)}else{if(Fe(n,i))return;Eg.set(i),e.uniformMatrix3fv(this.addr,!1,Eg),Ue(n,i)}}function hw(e,t){let n=this.cache,i=t.elements;if(i===void 0){if(Fe(n,t))return;e.uniformMatrix4fv(this.addr,!1,t),Ue(n,t)}else{if(Fe(n,i))return;wg.set(i),e.uniformMatrix4fv(this.addr,!1,wg),Ue(n,i)}}function uw(e,t){let n=this.cache;n[0]!==t&&(e.uniform1i(this.addr,t),n[0]=t)}function fw(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2i(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(Fe(n,t))return;e.uniform2iv(this.addr,t),Ue(n,t)}}function dw(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3i(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else{if(Fe(n,t))return;e.uniform3iv(this.addr,t),Ue(n,t)}}function pw(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4i(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(Fe(n,t))return;e.uniform4iv(this.addr,t),Ue(n,t)}}function mw(e,t){let n=this.cache;n[0]!==t&&(e.uniform1ui(this.addr,t),n[0]=t)}function gw(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2ui(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(Fe(n,t))return;e.uniform2uiv(this.addr,t),Ue(n,t)}}function _w(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3ui(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else{if(Fe(n,t))return;e.uniform3uiv(this.addr,t),Ue(n,t)}}function vw(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4ui(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(Fe(n,t))return;e.uniform4uiv(this.addr,t),Ue(n,t)}}function yw(e,t,n){let i=this.cache,r=n.allocateTextureUnit();i[0]!==r&&(e.uniform1i(this.addr,r),i[0]=r);let s;this.type===e.SAMPLER_2D_SHADOW?(bg.compareFunction=Cf,s=bg):s=kg,n.setTexture2D(t||s,r)}function xw(e,t,n){let i=this.cache,r=n.allocateTextureUnit();i[0]!==r&&(e.uniform1i(this.addr,r),i[0]=r),n.setTexture3D(t||Vg,r)}function bw(e,t,n){let i=this.cache,r=n.allocateTextureUnit();i[0]!==r&&(e.uniform1i(this.addr,r),i[0]=r),n.setTextureCube(t||Hg,r)}function Mw(e,t,n){let i=this.cache,r=n.allocateTextureUnit();i[0]!==r&&(e.uniform1i(this.addr,r),i[0]=r),n.setTexture2DArray(t||Bg,r)}function Sw(e){switch(e){case 5126:return rw;case 35664:return sw;case 35665:return ow;case 35666:return aw;case 35674:return cw;case 35675:return lw;case 35676:return hw;case 5124:case 35670:return uw;case 35667:case 35671:return fw;case 35668:case 35672:return dw;case 35669:case 35673:return pw;case 5125:return mw;case 36294:return gw;case 36295:return _w;case 36296:return vw;case 35678:case 36198:case 36298:case 36306:case 35682:return yw;case 35679:case 36299:case 36307:return xw;case 35680:case 36300:case 36308:case 36293:return bw;case 36289:case 36303:case 36311:case 36292:return Mw}}function ww(e,t){e.uniform1fv(this.addr,t)}function Ew(e,t){let n=ks(t,this.size,2);e.uniform2fv(this.addr,n)}function Tw(e,t){let n=ks(t,this.size,3);e.uniform3fv(this.addr,n)}function Aw(e,t){let n=ks(t,this.size,4);e.uniform4fv(this.addr,n)}function Cw(e,t){let n=ks(t,this.size,4);e.uniformMatrix2fv(this.addr,!1,n)}function Rw(e,t){let n=ks(t,this.size,9);e.uniformMatrix3fv(this.addr,!1,n)}function Pw(e,t){let n=ks(t,this.size,16);e.uniformMatrix4fv(this.addr,!1,n)}function Iw(e,t){e.uniform1iv(this.addr,t)}function Dw(e,t){e.uniform2iv(this.addr,t)}function Lw(e,t){e.uniform3iv(this.addr,t)}function Ow(e,t){e.uniform4iv(this.addr,t)}function Nw(e,t){e.uniform1uiv(this.addr,t)}function Fw(e,t){e.uniform2uiv(this.addr,t)}function Uw(e,t){e.uniform3uiv(this.addr,t)}function zw(e,t){e.uniform4uiv(this.addr,t)}function kw(e,t,n){let i=this.cache,r=t.length,s=ah(n,r);Fe(i,s)||(e.uniform1iv(this.addr,s),Ue(i,s));for(let o=0;o!==r;++o)n.setTexture2D(t[o]||kg,s[o])}function Bw(e,t,n){let i=this.cache,r=t.length,s=ah(n,r);Fe(i,s)||(e.uniform1iv(this.addr,s),Ue(i,s));for(let o=0;o!==r;++o)n.setTexture3D(t[o]||Vg,s[o])}function Vw(e,t,n){let i=this.cache,r=t.length,s=ah(n,r);Fe(i,s)||(e.uniform1iv(this.addr,s),Ue(i,s));for(let o=0;o!==r;++o)n.setTextureCube(t[o]||Hg,s[o])}function Hw(e,t,n){let i=this.cache,r=t.length,s=ah(n,r);Fe(i,s)||(e.uniform1iv(this.addr,s),Ue(i,s));for(let o=0;o!==r;++o)n.setTexture2DArray(t[o]||Bg,s[o])}function Gw(e){switch(e){case 5126:return ww;case 35664:return Ew;case 35665:return Tw;case 35666:return Aw;case 35674:return Cw;case 35675:return Rw;case 35676:return Pw;case 5124:case 35670:return Iw;case 35667:case 35671:return Dw;case 35668:case 35672:return Lw;case 35669:case 35673:return Ow;case 5125:return Nw;case 36294:return Fw;case 36295:return Uw;case 36296:return zw;case 35678:case 36198:case 36298:case 36306:case 35682:return kw;case 35679:case 36299:case 36307:return Bw;case 35680:case 36300:case 36308:case 36293:return Vw;case 36289:case 36303:case 36311:case 36292:return Hw}}var Gf=class{constructor(t,n,i){this.id=t,this.addr=i,this.cache=[],this.type=n.type,this.setValue=Sw(n.type)}},Wf=class{constructor(t,n,i){this.id=t,this.addr=i,this.cache=[],this.type=n.type,this.size=n.size,this.setValue=Gw(n.type)}},jf=class{constructor(t){this.id=t,this.seq=[],this.map={}}setValue(t,n,i){let r=this.seq;for(let s=0,o=r.length;s!==o;++s){let a=r[s];a.setValue(t,n[a.id],i)}}},Hf=/(\w+)(\])?(\[|\.)?/g;function Ag(e,t){e.seq.push(t),e.map[t.id]=t}function Ww(e,t,n){let i=e.name,r=i.length;for(Hf.lastIndex=0;;){let s=Hf.exec(i),o=Hf.lastIndex,a=s[1],c=s[2]==="]",l=s[3];if(c&&(a=a|0),l===void 0||l==="["&&o+2===r){Ag(n,l===void 0?new Gf(a,e,t):new Wf(a,e,t));break}else{let h=n.map[a];h===void 0&&(h=new jf(a),Ag(n,h)),n=h}}}var zs=class{constructor(t,n){this.seq=[],this.map={};let i=t.getProgramParameter(n,t.ACTIVE_UNIFORMS);for(let r=0;r<i;++r){let s=t.getActiveUniform(n,r),o=t.getUniformLocation(n,s.name);Ww(s,o,this)}}setValue(t,n,i,r){let s=this.map[n];s!==void 0&&s.setValue(t,i,r)}setOptional(t,n,i){let r=n[i];r!==void 0&&this.setValue(t,i,r)}static upload(t,n,i,r){for(let s=0,o=n.length;s!==o;++s){let a=n[s],c=i[a.id];c.needsUpdate!==!1&&a.setValue(t,c.value,r)}}static seqWithValue(t,n){let i=[];for(let r=0,s=t.length;r!==s;++r){let o=t[r];o.id in n&&i.push(o)}return i}};function Cg(e,t,n){let i=e.createShader(t);return e.shaderSource(i,n),e.compileShader(i),i}var jw=37297,qw=0;function Xw(e,t){let n=e.split(`
`),i=[],r=Math.max(t-6,0),s=Math.min(t+6,n.length);for(let o=r;o<s;o++){let a=o+1;i.push(`${a===t?">":" "} ${a}: ${n[o]}`)}return i.join(`
`)}var Rg=new Xt;function $w(e){ie._getMatrix(Rg,ie.workingColorSpace,e);let t=`mat3( ${Rg.elements.map(n=>n.toFixed(4))} )`;switch(ie.getTransfer(e)){case Ao:return[t,"LinearTransferOETF"];case ae:return[t,"sRGBTransferOETF"];default:return console.warn("THREE.WebGLProgram: Unsupported color space: ",e),[t,"LinearTransferOETF"]}}function Pg(e,t,n){let i=e.getShaderParameter(t,e.COMPILE_STATUS),s=(e.getShaderInfoLog(t)||"").trim();if(i&&s==="")return"";let o=/ERROR: 0:(\d+)/.exec(s);if(o){let a=parseInt(o[1]);return n.toUpperCase()+`

`+s+`

`+Xw(e.getShaderSource(t),a)}else return s}function Yw(e,t){let n=$w(t);return[`vec4 ${e}( vec4 value ) {`,`	return ${n[1]}( vec4( value.rgb * ${n[0]}, value.a ) );`,"}"].join(`
`)}function Zw(e,t){let n;switch(t){case ul:n="Linear";break;case fl:n="Reinhard";break;case dl:n="Cineon";break;case pl:n="ACESFilmic";break;case gl:n="AgX";break;case _l:n="Neutral";break;case ml:n="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",t),n="Linear"}return"vec3 "+e+"( vec3 color ) { return "+n+"ToneMapping( color ); }"}var rh=new I;function Kw(){ie.getLuminanceCoefficients(rh);let e=rh.x.toFixed(4),t=rh.y.toFixed(4),n=rh.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${e}, ${t}, ${n} );`,"	return dot( weights, rgb );","}"].join(`
`)}function Jw(e){return[e.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",e.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(aa).join(`
`)}function Qw(e){let t=[];for(let n in e){let i=e[n];i!==!1&&t.push("#define "+n+" "+i)}return t.join(`
`)}function tE(e,t){let n={},i=e.getProgramParameter(t,e.ACTIVE_ATTRIBUTES);for(let r=0;r<i;r++){let s=e.getActiveAttrib(t,r),o=s.name,a=1;s.type===e.FLOAT_MAT2&&(a=2),s.type===e.FLOAT_MAT3&&(a=3),s.type===e.FLOAT_MAT4&&(a=4),n[o]={type:s.type,location:e.getAttribLocation(t,o),locationSize:a}}return n}function aa(e){return e!==""}function Ig(e,t){let n=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return e.replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,n).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows)}function Dg(e,t){return e.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}var eE=/^[ \t]*#include +<([\w\d./]+)>/gm;function qf(e){return e.replace(eE,iE)}var nE=new Map;function iE(e,t){let n=Jt[t];if(n===void 0){let i=nE.get(t);if(i!==void 0)n=Jt[i],console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',t,i);else throw new Error("Can not resolve #include <"+t+">")}return qf(n)}var rE=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Lg(e){return e.replace(rE,sE)}function sE(e,t,n,i){let r="";for(let s=parseInt(t);s<parseInt(n);s++)r+=i.replace(/\[\s*i\s*\]/g,"[ "+s+" ]").replace(/UNROLLED_LOOP_INDEX/g,s);return r}function Og(e){let t=`precision ${e.precision} float;
	precision ${e.precision} int;
	precision ${e.precision} sampler2D;
	precision ${e.precision} samplerCube;
	precision ${e.precision} sampler3D;
	precision ${e.precision} sampler2DArray;
	precision ${e.precision} sampler2DShadow;
	precision ${e.precision} samplerCubeShadow;
	precision ${e.precision} sampler2DArrayShadow;
	precision ${e.precision} isampler2D;
	precision ${e.precision} isampler3D;
	precision ${e.precision} isamplerCube;
	precision ${e.precision} isampler2DArray;
	precision ${e.precision} usampler2D;
	precision ${e.precision} usampler3D;
	precision ${e.precision} usamplerCube;
	precision ${e.precision} usampler2DArray;
	`;return e.precision==="highp"?t+=`
#define HIGH_PRECISION`:e.precision==="mediump"?t+=`
#define MEDIUM_PRECISION`:e.precision==="lowp"&&(t+=`
#define LOW_PRECISION`),t}function oE(e){let t="SHADOWMAP_TYPE_BASIC";return e.shadowMapType===gf?t="SHADOWMAP_TYPE_PCF":e.shadowMapType===Dm?t="SHADOWMAP_TYPE_PCF_SOFT":e.shadowMapType===di&&(t="SHADOWMAP_TYPE_VSM"),t}function aE(e){let t="ENVMAP_TYPE_CUBE";if(e.envMap)switch(e.envMapMode){case Dr:case Lr:t="ENVMAP_TYPE_CUBE";break;case ea:t="ENVMAP_TYPE_CUBE_UV";break}return t}function cE(e){let t="ENVMAP_MODE_REFLECTION";return e.envMap&&e.envMapMode===Lr&&(t="ENVMAP_MODE_REFRACTION"),t}function lE(e){let t="ENVMAP_BLENDING_NONE";if(e.envMap)switch(e.combine){case hl:t="ENVMAP_BLENDING_MULTIPLY";break;case Km:t="ENVMAP_BLENDING_MIX";break;case Jm:t="ENVMAP_BLENDING_ADD";break}return t}function hE(e){let t=e.envMapCubeUVHeight;if(t===null)return null;let n=Math.log2(t)-2,i=1/t;return{texelWidth:1/(3*Math.max(Math.pow(2,n),112)),texelHeight:i,maxMip:n}}function uE(e,t,n,i){let r=e.getContext(),s=n.defines,o=n.vertexShader,a=n.fragmentShader,c=oE(n),l=aE(n),u=cE(n),h=lE(n),d=hE(n),f=Jw(n),m=Qw(s),_=r.createProgram(),g,p,b=n.glslVersion?"#version "+n.glslVersion+`
`:"";n.isRawShaderMaterial?(g=["#define SHADER_TYPE "+n.shaderType,"#define SHADER_NAME "+n.shaderName,m].filter(aa).join(`
`),g.length>0&&(g+=`
`),p=["#define SHADER_TYPE "+n.shaderType,"#define SHADER_NAME "+n.shaderName,m].filter(aa).join(`
`),p.length>0&&(p+=`
`)):(g=[Og(n),"#define SHADER_TYPE "+n.shaderType,"#define SHADER_NAME "+n.shaderName,m,n.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",n.batching?"#define USE_BATCHING":"",n.batchingColor?"#define USE_BATCHING_COLOR":"",n.instancing?"#define USE_INSTANCING":"",n.instancingColor?"#define USE_INSTANCING_COLOR":"",n.instancingMorph?"#define USE_INSTANCING_MORPH":"",n.useFog&&n.fog?"#define USE_FOG":"",n.useFog&&n.fogExp2?"#define FOG_EXP2":"",n.map?"#define USE_MAP":"",n.envMap?"#define USE_ENVMAP":"",n.envMap?"#define "+u:"",n.lightMap?"#define USE_LIGHTMAP":"",n.aoMap?"#define USE_AOMAP":"",n.bumpMap?"#define USE_BUMPMAP":"",n.normalMap?"#define USE_NORMALMAP":"",n.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",n.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",n.displacementMap?"#define USE_DISPLACEMENTMAP":"",n.emissiveMap?"#define USE_EMISSIVEMAP":"",n.anisotropy?"#define USE_ANISOTROPY":"",n.anisotropyMap?"#define USE_ANISOTROPYMAP":"",n.clearcoatMap?"#define USE_CLEARCOATMAP":"",n.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",n.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",n.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",n.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",n.specularMap?"#define USE_SPECULARMAP":"",n.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",n.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",n.roughnessMap?"#define USE_ROUGHNESSMAP":"",n.metalnessMap?"#define USE_METALNESSMAP":"",n.alphaMap?"#define USE_ALPHAMAP":"",n.alphaHash?"#define USE_ALPHAHASH":"",n.transmission?"#define USE_TRANSMISSION":"",n.transmissionMap?"#define USE_TRANSMISSIONMAP":"",n.thicknessMap?"#define USE_THICKNESSMAP":"",n.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",n.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",n.mapUv?"#define MAP_UV "+n.mapUv:"",n.alphaMapUv?"#define ALPHAMAP_UV "+n.alphaMapUv:"",n.lightMapUv?"#define LIGHTMAP_UV "+n.lightMapUv:"",n.aoMapUv?"#define AOMAP_UV "+n.aoMapUv:"",n.emissiveMapUv?"#define EMISSIVEMAP_UV "+n.emissiveMapUv:"",n.bumpMapUv?"#define BUMPMAP_UV "+n.bumpMapUv:"",n.normalMapUv?"#define NORMALMAP_UV "+n.normalMapUv:"",n.displacementMapUv?"#define DISPLACEMENTMAP_UV "+n.displacementMapUv:"",n.metalnessMapUv?"#define METALNESSMAP_UV "+n.metalnessMapUv:"",n.roughnessMapUv?"#define ROUGHNESSMAP_UV "+n.roughnessMapUv:"",n.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+n.anisotropyMapUv:"",n.clearcoatMapUv?"#define CLEARCOATMAP_UV "+n.clearcoatMapUv:"",n.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+n.clearcoatNormalMapUv:"",n.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+n.clearcoatRoughnessMapUv:"",n.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+n.iridescenceMapUv:"",n.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+n.iridescenceThicknessMapUv:"",n.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+n.sheenColorMapUv:"",n.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+n.sheenRoughnessMapUv:"",n.specularMapUv?"#define SPECULARMAP_UV "+n.specularMapUv:"",n.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+n.specularColorMapUv:"",n.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+n.specularIntensityMapUv:"",n.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+n.transmissionMapUv:"",n.thicknessMapUv?"#define THICKNESSMAP_UV "+n.thicknessMapUv:"",n.vertexTangents&&n.flatShading===!1?"#define USE_TANGENT":"",n.vertexColors?"#define USE_COLOR":"",n.vertexAlphas?"#define USE_COLOR_ALPHA":"",n.vertexUv1s?"#define USE_UV1":"",n.vertexUv2s?"#define USE_UV2":"",n.vertexUv3s?"#define USE_UV3":"",n.pointsUvs?"#define USE_POINTS_UV":"",n.flatShading?"#define FLAT_SHADED":"",n.skinning?"#define USE_SKINNING":"",n.morphTargets?"#define USE_MORPHTARGETS":"",n.morphNormals&&n.flatShading===!1?"#define USE_MORPHNORMALS":"",n.morphColors?"#define USE_MORPHCOLORS":"",n.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+n.morphTextureStride:"",n.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+n.morphTargetsCount:"",n.doubleSided?"#define DOUBLE_SIDED":"",n.flipSided?"#define FLIP_SIDED":"",n.shadowMapEnabled?"#define USE_SHADOWMAP":"",n.shadowMapEnabled?"#define "+c:"",n.sizeAttenuation?"#define USE_SIZEATTENUATION":"",n.numLightProbes>0?"#define USE_LIGHT_PROBES":"",n.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",n.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(aa).join(`
`),p=[Og(n),"#define SHADER_TYPE "+n.shaderType,"#define SHADER_NAME "+n.shaderName,m,n.useFog&&n.fog?"#define USE_FOG":"",n.useFog&&n.fogExp2?"#define FOG_EXP2":"",n.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",n.map?"#define USE_MAP":"",n.matcap?"#define USE_MATCAP":"",n.envMap?"#define USE_ENVMAP":"",n.envMap?"#define "+l:"",n.envMap?"#define "+u:"",n.envMap?"#define "+h:"",d?"#define CUBEUV_TEXEL_WIDTH "+d.texelWidth:"",d?"#define CUBEUV_TEXEL_HEIGHT "+d.texelHeight:"",d?"#define CUBEUV_MAX_MIP "+d.maxMip+".0":"",n.lightMap?"#define USE_LIGHTMAP":"",n.aoMap?"#define USE_AOMAP":"",n.bumpMap?"#define USE_BUMPMAP":"",n.normalMap?"#define USE_NORMALMAP":"",n.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",n.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",n.emissiveMap?"#define USE_EMISSIVEMAP":"",n.anisotropy?"#define USE_ANISOTROPY":"",n.anisotropyMap?"#define USE_ANISOTROPYMAP":"",n.clearcoat?"#define USE_CLEARCOAT":"",n.clearcoatMap?"#define USE_CLEARCOATMAP":"",n.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",n.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",n.dispersion?"#define USE_DISPERSION":"",n.iridescence?"#define USE_IRIDESCENCE":"",n.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",n.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",n.specularMap?"#define USE_SPECULARMAP":"",n.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",n.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",n.roughnessMap?"#define USE_ROUGHNESSMAP":"",n.metalnessMap?"#define USE_METALNESSMAP":"",n.alphaMap?"#define USE_ALPHAMAP":"",n.alphaTest?"#define USE_ALPHATEST":"",n.alphaHash?"#define USE_ALPHAHASH":"",n.sheen?"#define USE_SHEEN":"",n.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",n.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",n.transmission?"#define USE_TRANSMISSION":"",n.transmissionMap?"#define USE_TRANSMISSIONMAP":"",n.thicknessMap?"#define USE_THICKNESSMAP":"",n.vertexTangents&&n.flatShading===!1?"#define USE_TANGENT":"",n.vertexColors||n.instancingColor||n.batchingColor?"#define USE_COLOR":"",n.vertexAlphas?"#define USE_COLOR_ALPHA":"",n.vertexUv1s?"#define USE_UV1":"",n.vertexUv2s?"#define USE_UV2":"",n.vertexUv3s?"#define USE_UV3":"",n.pointsUvs?"#define USE_POINTS_UV":"",n.gradientMap?"#define USE_GRADIENTMAP":"",n.flatShading?"#define FLAT_SHADED":"",n.doubleSided?"#define DOUBLE_SIDED":"",n.flipSided?"#define FLIP_SIDED":"",n.shadowMapEnabled?"#define USE_SHADOWMAP":"",n.shadowMapEnabled?"#define "+c:"",n.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",n.numLightProbes>0?"#define USE_LIGHT_PROBES":"",n.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",n.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",n.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",n.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",n.toneMapping!==Oi?"#define TONE_MAPPING":"",n.toneMapping!==Oi?Jt.tonemapping_pars_fragment:"",n.toneMapping!==Oi?Zw("toneMapping",n.toneMapping):"",n.dithering?"#define DITHERING":"",n.opaque?"#define OPAQUE":"",Jt.colorspace_pars_fragment,Yw("linearToOutputTexel",n.outputColorSpace),Kw(),n.useDepthPacking?"#define DEPTH_PACKING "+n.depthPacking:"",`
`].filter(aa).join(`
`)),o=qf(o),o=Ig(o,n),o=Dg(o,n),a=qf(a),a=Ig(a,n),a=Dg(a,n),o=Lg(o),a=Lg(a),n.isRawShaderMaterial!==!0&&(b=`#version 300 es
`,g=[f,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+g,p=["#define varying in",n.glslVersion===Rf?"":"layout(location = 0) out highp vec4 pc_fragColor;",n.glslVersion===Rf?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+p);let x=b+g+o,v=b+p+a,M=Cg(r,r.VERTEX_SHADER,x),S=Cg(r,r.FRAGMENT_SHADER,v);r.attachShader(_,M),r.attachShader(_,S),n.index0AttributeName!==void 0?r.bindAttribLocation(_,0,n.index0AttributeName):n.morphTargets===!0&&r.bindAttribLocation(_,0,"position"),r.linkProgram(_);function C(R){if(e.debug.checkShaderErrors){let V=r.getProgramInfoLog(_)||"",N=r.getShaderInfoLog(M)||"",k=r.getShaderInfoLog(S)||"",z=V.trim(),G=N.trim(),K=k.trim(),j=!0,at=!0;if(r.getProgramParameter(_,r.LINK_STATUS)===!1)if(j=!1,typeof e.debug.onShaderError=="function")e.debug.onShaderError(r,_,M,S);else{let _t=Pg(r,M,"vertex"),$=Pg(r,S,"fragment");console.error("THREE.WebGLProgram: Shader Error "+r.getError()+" - VALIDATE_STATUS "+r.getProgramParameter(_,r.VALIDATE_STATUS)+`

Material Name: `+R.name+`
Material Type: `+R.type+`

Program Info Log: `+z+`
`+_t+`
`+$)}else z!==""?console.warn("THREE.WebGLProgram: Program Info Log:",z):(G===""||K==="")&&(at=!1);at&&(R.diagnostics={runnable:j,programLog:z,vertexShader:{log:G,prefix:g},fragmentShader:{log:K,prefix:p}})}r.deleteShader(M),r.deleteShader(S),P=new zs(r,_),T=tE(r,_)}let P;this.getUniforms=function(){return P===void 0&&C(this),P};let T;this.getAttributes=function(){return T===void 0&&C(this),T};let w=n.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return w===!1&&(w=r.getProgramParameter(_,jw)),w},this.destroy=function(){i.releaseStatesOfProgram(this),r.deleteProgram(_),this.program=void 0},this.type=n.shaderType,this.name=n.shaderName,this.id=qw++,this.cacheKey=t,this.usedTimes=1,this.program=_,this.vertexShader=M,this.fragmentShader=S,this}var fE=0,Xf=class{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(t){let n=t.vertexShader,i=t.fragmentShader,r=this._getShaderStage(n),s=this._getShaderStage(i),o=this._getShaderCacheForMaterial(t);return o.has(r)===!1&&(o.add(r),r.usedTimes++),o.has(s)===!1&&(o.add(s),s.usedTimes++),this}remove(t){let n=this.materialCache.get(t);for(let i of n)i.usedTimes--,i.usedTimes===0&&this.shaderCache.delete(i.code);return this.materialCache.delete(t),this}getVertexShaderID(t){return this._getShaderStage(t.vertexShader).id}getFragmentShaderID(t){return this._getShaderStage(t.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(t){let n=this.materialCache,i=n.get(t);return i===void 0&&(i=new Set,n.set(t,i)),i}_getShaderStage(t){let n=this.shaderCache,i=n.get(t);return i===void 0&&(i=new $f(t),n.set(t,i)),i}},$f=class{constructor(t){this.id=fE++,this.code=t,this.usedTimes=0}};function dE(e,t,n,i,r,s,o){let a=new Ss,c=new Xf,l=new Set,u=[],h=r.logarithmicDepthBuffer,d=r.vertexTextures,f=r.precision,m={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function _(T){return l.add(T),T===0?"uv":`uv${T}`}function g(T,w,R,V,N){let k=V.fog,z=N.geometry,G=T.isMeshStandardMaterial?V.environment:null,K=(T.isMeshStandardMaterial?n:t).get(T.envMap||G),j=K&&K.mapping===ea?K.image.height:null,at=m[T.type];T.precision!==null&&(f=r.getMaxPrecision(T.precision),f!==T.precision&&console.warn("THREE.WebGLProgram.getParameters:",T.precision,"not supported, using",f,"instead."));let _t=z.morphAttributes.position||z.morphAttributes.normal||z.morphAttributes.color,$=_t!==void 0?_t.length:0,rt=0;z.morphAttributes.position!==void 0&&(rt=1),z.morphAttributes.normal!==void 0&&(rt=2),z.morphAttributes.color!==void 0&&(rt=3);let pt,zt,Lt,X;if(at){let oe=gi[at];pt=oe.vertexShader,zt=oe.fragmentShader}else pt=T.vertexShader,zt=T.fragmentShader,c.update(T),Lt=c.getVertexShaderID(T),X=c.getFragmentShaderID(T);let tt=e.getRenderTarget(),yt=e.state.buffers.depth.getReversed(),Bt=N.isInstancedMesh===!0,It=N.isBatchedMesh===!0,Qt=!!T.map,Re=!!T.matcap,B=!!K,xe=!!T.aoMap,Wt=!!T.lightMap,kt=!!T.bumpMap,wt=!!T.normalMap,_e=!!T.displacementMap,Tt=!!T.emissiveMap,qt=!!T.metalnessMap,Ie=!!T.roughnessMap,Ae=T.anisotropy>0,L=T.clearcoat>0,E=T.dispersion>0,W=T.iridescence>0,J=T.sheen>0,st=T.transmission>0,Y=Ae&&!!T.anisotropyMap,Pt=L&&!!T.clearcoatMap,ft=L&&!!T.clearcoatNormalMap,Et=L&&!!T.clearcoatRoughnessMap,At=W&&!!T.iridescenceMap,ot=W&&!!T.iridescenceThicknessMap,vt=J&&!!T.sheenColorMap,Ft=J&&!!T.sheenRoughnessMap,Mt=!!T.specularMap,mt=!!T.specularColorMap,jt=!!T.specularIntensityMap,H=st&&!!T.transmissionMap,ht=st&&!!T.thicknessMap,dt=!!T.gradientMap,xt=!!T.alphaMap,lt=T.alphaTest>0,et=!!T.alphaHash,bt=!!T.extensions,Ht=Oi;T.toneMapped&&(tt===null||tt.isXRRenderTarget===!0)&&(Ht=e.toneMapping);let he={shaderID:at,shaderType:T.type,shaderName:T.name,vertexShader:pt,fragmentShader:zt,defines:T.defines,customVertexShaderID:Lt,customFragmentShaderID:X,isRawShaderMaterial:T.isRawShaderMaterial===!0,glslVersion:T.glslVersion,precision:f,batching:It,batchingColor:It&&N._colorsTexture!==null,instancing:Bt,instancingColor:Bt&&N.instanceColor!==null,instancingMorph:Bt&&N.morphTexture!==null,supportsVertexTextures:d,outputColorSpace:tt===null?e.outputColorSpace:tt.isXRRenderTarget===!0?tt.texture.colorSpace:Ar,alphaToCoverage:!!T.alphaToCoverage,map:Qt,matcap:Re,envMap:B,envMapMode:B&&K.mapping,envMapCubeUVHeight:j,aoMap:xe,lightMap:Wt,bumpMap:kt,normalMap:wt,displacementMap:d&&_e,emissiveMap:Tt,normalMapObjectSpace:wt&&T.normalMapType===ng,normalMapTangentSpace:wt&&T.normalMapType===eh,metalnessMap:qt,roughnessMap:Ie,anisotropy:Ae,anisotropyMap:Y,clearcoat:L,clearcoatMap:Pt,clearcoatNormalMap:ft,clearcoatRoughnessMap:Et,dispersion:E,iridescence:W,iridescenceMap:At,iridescenceThicknessMap:ot,sheen:J,sheenColorMap:vt,sheenRoughnessMap:Ft,specularMap:Mt,specularColorMap:mt,specularIntensityMap:jt,transmission:st,transmissionMap:H,thicknessMap:ht,gradientMap:dt,opaque:T.transparent===!1&&T.blending===Er&&T.alphaToCoverage===!1,alphaMap:xt,alphaTest:lt,alphaHash:et,combine:T.combine,mapUv:Qt&&_(T.map.channel),aoMapUv:xe&&_(T.aoMap.channel),lightMapUv:Wt&&_(T.lightMap.channel),bumpMapUv:kt&&_(T.bumpMap.channel),normalMapUv:wt&&_(T.normalMap.channel),displacementMapUv:_e&&_(T.displacementMap.channel),emissiveMapUv:Tt&&_(T.emissiveMap.channel),metalnessMapUv:qt&&_(T.metalnessMap.channel),roughnessMapUv:Ie&&_(T.roughnessMap.channel),anisotropyMapUv:Y&&_(T.anisotropyMap.channel),clearcoatMapUv:Pt&&_(T.clearcoatMap.channel),clearcoatNormalMapUv:ft&&_(T.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:Et&&_(T.clearcoatRoughnessMap.channel),iridescenceMapUv:At&&_(T.iridescenceMap.channel),iridescenceThicknessMapUv:ot&&_(T.iridescenceThicknessMap.channel),sheenColorMapUv:vt&&_(T.sheenColorMap.channel),sheenRoughnessMapUv:Ft&&_(T.sheenRoughnessMap.channel),specularMapUv:Mt&&_(T.specularMap.channel),specularColorMapUv:mt&&_(T.specularColorMap.channel),specularIntensityMapUv:jt&&_(T.specularIntensityMap.channel),transmissionMapUv:H&&_(T.transmissionMap.channel),thicknessMapUv:ht&&_(T.thicknessMap.channel),alphaMapUv:xt&&_(T.alphaMap.channel),vertexTangents:!!z.attributes.tangent&&(wt||Ae),vertexColors:T.vertexColors,vertexAlphas:T.vertexColors===!0&&!!z.attributes.color&&z.attributes.color.itemSize===4,pointsUvs:N.isPoints===!0&&!!z.attributes.uv&&(Qt||xt),fog:!!k,useFog:T.fog===!0,fogExp2:!!k&&k.isFogExp2,flatShading:T.flatShading===!0&&T.wireframe===!1,sizeAttenuation:T.sizeAttenuation===!0,logarithmicDepthBuffer:h,reversedDepthBuffer:yt,skinning:N.isSkinnedMesh===!0,morphTargets:z.morphAttributes.position!==void 0,morphNormals:z.morphAttributes.normal!==void 0,morphColors:z.morphAttributes.color!==void 0,morphTargetsCount:$,morphTextureStride:rt,numDirLights:w.directional.length,numPointLights:w.point.length,numSpotLights:w.spot.length,numSpotLightMaps:w.spotLightMap.length,numRectAreaLights:w.rectArea.length,numHemiLights:w.hemi.length,numDirLightShadows:w.directionalShadowMap.length,numPointLightShadows:w.pointShadowMap.length,numSpotLightShadows:w.spotShadowMap.length,numSpotLightShadowsWithMaps:w.numSpotLightShadowsWithMaps,numLightProbes:w.numLightProbes,numClippingPlanes:o.numPlanes,numClipIntersection:o.numIntersection,dithering:T.dithering,shadowMapEnabled:e.shadowMap.enabled&&R.length>0,shadowMapType:e.shadowMap.type,toneMapping:Ht,decodeVideoTexture:Qt&&T.map.isVideoTexture===!0&&ie.getTransfer(T.map.colorSpace)===ae,decodeVideoTextureEmissive:Tt&&T.emissiveMap.isVideoTexture===!0&&ie.getTransfer(T.emissiveMap.colorSpace)===ae,premultipliedAlpha:T.premultipliedAlpha,doubleSided:T.side===pi,flipSided:T.side===We,useDepthPacking:T.depthPacking>=0,depthPacking:T.depthPacking||0,index0AttributeName:T.index0AttributeName,extensionClipCullDistance:bt&&T.extensions.clipCullDistance===!0&&i.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(bt&&T.extensions.multiDraw===!0||It)&&i.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:i.has("KHR_parallel_shader_compile"),customProgramCacheKey:T.customProgramCacheKey()};return he.vertexUv1s=l.has(1),he.vertexUv2s=l.has(2),he.vertexUv3s=l.has(3),l.clear(),he}function p(T){let w=[];if(T.shaderID?w.push(T.shaderID):(w.push(T.customVertexShaderID),w.push(T.customFragmentShaderID)),T.defines!==void 0)for(let R in T.defines)w.push(R),w.push(T.defines[R]);return T.isRawShaderMaterial===!1&&(b(w,T),x(w,T),w.push(e.outputColorSpace)),w.push(T.customProgramCacheKey),w.join()}function b(T,w){T.push(w.precision),T.push(w.outputColorSpace),T.push(w.envMapMode),T.push(w.envMapCubeUVHeight),T.push(w.mapUv),T.push(w.alphaMapUv),T.push(w.lightMapUv),T.push(w.aoMapUv),T.push(w.bumpMapUv),T.push(w.normalMapUv),T.push(w.displacementMapUv),T.push(w.emissiveMapUv),T.push(w.metalnessMapUv),T.push(w.roughnessMapUv),T.push(w.anisotropyMapUv),T.push(w.clearcoatMapUv),T.push(w.clearcoatNormalMapUv),T.push(w.clearcoatRoughnessMapUv),T.push(w.iridescenceMapUv),T.push(w.iridescenceThicknessMapUv),T.push(w.sheenColorMapUv),T.push(w.sheenRoughnessMapUv),T.push(w.specularMapUv),T.push(w.specularColorMapUv),T.push(w.specularIntensityMapUv),T.push(w.transmissionMapUv),T.push(w.thicknessMapUv),T.push(w.combine),T.push(w.fogExp2),T.push(w.sizeAttenuation),T.push(w.morphTargetsCount),T.push(w.morphAttributeCount),T.push(w.numDirLights),T.push(w.numPointLights),T.push(w.numSpotLights),T.push(w.numSpotLightMaps),T.push(w.numHemiLights),T.push(w.numRectAreaLights),T.push(w.numDirLightShadows),T.push(w.numPointLightShadows),T.push(w.numSpotLightShadows),T.push(w.numSpotLightShadowsWithMaps),T.push(w.numLightProbes),T.push(w.shadowMapType),T.push(w.toneMapping),T.push(w.numClippingPlanes),T.push(w.numClipIntersection),T.push(w.depthPacking)}function x(T,w){a.disableAll(),w.supportsVertexTextures&&a.enable(0),w.instancing&&a.enable(1),w.instancingColor&&a.enable(2),w.instancingMorph&&a.enable(3),w.matcap&&a.enable(4),w.envMap&&a.enable(5),w.normalMapObjectSpace&&a.enable(6),w.normalMapTangentSpace&&a.enable(7),w.clearcoat&&a.enable(8),w.iridescence&&a.enable(9),w.alphaTest&&a.enable(10),w.vertexColors&&a.enable(11),w.vertexAlphas&&a.enable(12),w.vertexUv1s&&a.enable(13),w.vertexUv2s&&a.enable(14),w.vertexUv3s&&a.enable(15),w.vertexTangents&&a.enable(16),w.anisotropy&&a.enable(17),w.alphaHash&&a.enable(18),w.batching&&a.enable(19),w.dispersion&&a.enable(20),w.batchingColor&&a.enable(21),w.gradientMap&&a.enable(22),T.push(a.mask),a.disableAll(),w.fog&&a.enable(0),w.useFog&&a.enable(1),w.flatShading&&a.enable(2),w.logarithmicDepthBuffer&&a.enable(3),w.reversedDepthBuffer&&a.enable(4),w.skinning&&a.enable(5),w.morphTargets&&a.enable(6),w.morphNormals&&a.enable(7),w.morphColors&&a.enable(8),w.premultipliedAlpha&&a.enable(9),w.shadowMapEnabled&&a.enable(10),w.doubleSided&&a.enable(11),w.flipSided&&a.enable(12),w.useDepthPacking&&a.enable(13),w.dithering&&a.enable(14),w.transmission&&a.enable(15),w.sheen&&a.enable(16),w.opaque&&a.enable(17),w.pointsUvs&&a.enable(18),w.decodeVideoTexture&&a.enable(19),w.decodeVideoTextureEmissive&&a.enable(20),w.alphaToCoverage&&a.enable(21),T.push(a.mask)}function v(T){let w=m[T.type],R;if(w){let V=gi[w];R=Fi.clone(V.uniforms)}else R=T.uniforms;return R}function M(T,w){let R;for(let V=0,N=u.length;V<N;V++){let k=u[V];if(k.cacheKey===w){R=k,++R.usedTimes;break}}return R===void 0&&(R=new uE(e,w,T,s),u.push(R)),R}function S(T){if(--T.usedTimes===0){let w=u.indexOf(T);u[w]=u[u.length-1],u.pop(),T.destroy()}}function C(T){c.remove(T)}function P(){c.dispose()}return{getParameters:g,getProgramCacheKey:p,getUniforms:v,acquireProgram:M,releaseProgram:S,releaseShaderCache:C,programs:u,dispose:P}}function pE(){let e=new WeakMap;function t(o){return e.has(o)}function n(o){let a=e.get(o);return a===void 0&&(a={},e.set(o,a)),a}function i(o){e.delete(o)}function r(o,a,c){e.get(o)[a]=c}function s(){e=new WeakMap}return{has:t,get:n,remove:i,update:r,dispose:s}}function mE(e,t){return e.groupOrder!==t.groupOrder?e.groupOrder-t.groupOrder:e.renderOrder!==t.renderOrder?e.renderOrder-t.renderOrder:e.material.id!==t.material.id?e.material.id-t.material.id:e.z!==t.z?e.z-t.z:e.id-t.id}function Ng(e,t){return e.groupOrder!==t.groupOrder?e.groupOrder-t.groupOrder:e.renderOrder!==t.renderOrder?e.renderOrder-t.renderOrder:e.z!==t.z?t.z-e.z:e.id-t.id}function Fg(){let e=[],t=0,n=[],i=[],r=[];function s(){t=0,n.length=0,i.length=0,r.length=0}function o(h,d,f,m,_,g){let p=e[t];return p===void 0?(p={id:h.id,object:h,geometry:d,material:f,groupOrder:m,renderOrder:h.renderOrder,z:_,group:g},e[t]=p):(p.id=h.id,p.object=h,p.geometry=d,p.material=f,p.groupOrder=m,p.renderOrder=h.renderOrder,p.z=_,p.group=g),t++,p}function a(h,d,f,m,_,g){let p=o(h,d,f,m,_,g);f.transmission>0?i.push(p):f.transparent===!0?r.push(p):n.push(p)}function c(h,d,f,m,_,g){let p=o(h,d,f,m,_,g);f.transmission>0?i.unshift(p):f.transparent===!0?r.unshift(p):n.unshift(p)}function l(h,d){n.length>1&&n.sort(h||mE),i.length>1&&i.sort(d||Ng),r.length>1&&r.sort(d||Ng)}function u(){for(let h=t,d=e.length;h<d;h++){let f=e[h];if(f.id===null)break;f.id=null,f.object=null,f.geometry=null,f.material=null,f.group=null}}return{opaque:n,transmissive:i,transparent:r,init:s,push:a,unshift:c,finish:u,sort:l}}function gE(){let e=new WeakMap;function t(i,r){let s=e.get(i),o;return s===void 0?(o=new Fg,e.set(i,[o])):r>=s.length?(o=new Fg,s.push(o)):o=s[r],o}function n(){e=new WeakMap}return{get:t,dispose:n}}function _E(){let e={};return{get:function(t){if(e[t.id]!==void 0)return e[t.id];let n;switch(t.type){case"DirectionalLight":n={direction:new I,color:new Ot};break;case"SpotLight":n={position:new I,direction:new I,color:new Ot,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":n={position:new I,color:new Ot,distance:0,decay:0};break;case"HemisphereLight":n={direction:new I,skyColor:new Ot,groundColor:new Ot};break;case"RectAreaLight":n={color:new Ot,position:new I,halfWidth:new I,halfHeight:new I};break}return e[t.id]=n,n}}}function vE(){let e={};return{get:function(t){if(e[t.id]!==void 0)return e[t.id];let n;switch(t.type){case"DirectionalLight":n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new it};break;case"SpotLight":n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new it};break;case"PointLight":n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new it,shadowCameraNear:1,shadowCameraFar:1e3};break}return e[t.id]=n,n}}}var yE=0;function xE(e,t){return(t.castShadow?2:0)-(e.castShadow?2:0)+(t.map?1:0)-(e.map?1:0)}function bE(e){let t=new _E,n=vE(),i={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let l=0;l<9;l++)i.probe.push(new I);let r=new I,s=new Vt,o=new Vt;function a(l){let u=0,h=0,d=0;for(let T=0;T<9;T++)i.probe[T].set(0,0,0);let f=0,m=0,_=0,g=0,p=0,b=0,x=0,v=0,M=0,S=0,C=0;l.sort(xE);for(let T=0,w=l.length;T<w;T++){let R=l[T],V=R.color,N=R.intensity,k=R.distance,z=R.shadow&&R.shadow.map?R.shadow.map.texture:null;if(R.isAmbientLight)u+=V.r*N,h+=V.g*N,d+=V.b*N;else if(R.isLightProbe){for(let G=0;G<9;G++)i.probe[G].addScaledVector(R.sh.coefficients[G],N);C++}else if(R.isDirectionalLight){let G=t.get(R);if(G.color.copy(R.color).multiplyScalar(R.intensity),R.castShadow){let K=R.shadow,j=n.get(R);j.shadowIntensity=K.intensity,j.shadowBias=K.bias,j.shadowNormalBias=K.normalBias,j.shadowRadius=K.radius,j.shadowMapSize=K.mapSize,i.directionalShadow[f]=j,i.directionalShadowMap[f]=z,i.directionalShadowMatrix[f]=R.shadow.matrix,b++}i.directional[f]=G,f++}else if(R.isSpotLight){let G=t.get(R);G.position.setFromMatrixPosition(R.matrixWorld),G.color.copy(V).multiplyScalar(N),G.distance=k,G.coneCos=Math.cos(R.angle),G.penumbraCos=Math.cos(R.angle*(1-R.penumbra)),G.decay=R.decay,i.spot[_]=G;let K=R.shadow;if(R.map&&(i.spotLightMap[M]=R.map,M++,K.updateMatrices(R),R.castShadow&&S++),i.spotLightMatrix[_]=K.matrix,R.castShadow){let j=n.get(R);j.shadowIntensity=K.intensity,j.shadowBias=K.bias,j.shadowNormalBias=K.normalBias,j.shadowRadius=K.radius,j.shadowMapSize=K.mapSize,i.spotShadow[_]=j,i.spotShadowMap[_]=z,v++}_++}else if(R.isRectAreaLight){let G=t.get(R);G.color.copy(V).multiplyScalar(N),G.halfWidth.set(R.width*.5,0,0),G.halfHeight.set(0,R.height*.5,0),i.rectArea[g]=G,g++}else if(R.isPointLight){let G=t.get(R);if(G.color.copy(R.color).multiplyScalar(R.intensity),G.distance=R.distance,G.decay=R.decay,R.castShadow){let K=R.shadow,j=n.get(R);j.shadowIntensity=K.intensity,j.shadowBias=K.bias,j.shadowNormalBias=K.normalBias,j.shadowRadius=K.radius,j.shadowMapSize=K.mapSize,j.shadowCameraNear=K.camera.near,j.shadowCameraFar=K.camera.far,i.pointShadow[m]=j,i.pointShadowMap[m]=z,i.pointShadowMatrix[m]=R.shadow.matrix,x++}i.point[m]=G,m++}else if(R.isHemisphereLight){let G=t.get(R);G.skyColor.copy(R.color).multiplyScalar(N),G.groundColor.copy(R.groundColor).multiplyScalar(N),i.hemi[p]=G,p++}}g>0&&(e.has("OES_texture_float_linear")===!0?(i.rectAreaLTC1=gt.LTC_FLOAT_1,i.rectAreaLTC2=gt.LTC_FLOAT_2):(i.rectAreaLTC1=gt.LTC_HALF_1,i.rectAreaLTC2=gt.LTC_HALF_2)),i.ambient[0]=u,i.ambient[1]=h,i.ambient[2]=d;let P=i.hash;(P.directionalLength!==f||P.pointLength!==m||P.spotLength!==_||P.rectAreaLength!==g||P.hemiLength!==p||P.numDirectionalShadows!==b||P.numPointShadows!==x||P.numSpotShadows!==v||P.numSpotMaps!==M||P.numLightProbes!==C)&&(i.directional.length=f,i.spot.length=_,i.rectArea.length=g,i.point.length=m,i.hemi.length=p,i.directionalShadow.length=b,i.directionalShadowMap.length=b,i.pointShadow.length=x,i.pointShadowMap.length=x,i.spotShadow.length=v,i.spotShadowMap.length=v,i.directionalShadowMatrix.length=b,i.pointShadowMatrix.length=x,i.spotLightMatrix.length=v+M-S,i.spotLightMap.length=M,i.numSpotLightShadowsWithMaps=S,i.numLightProbes=C,P.directionalLength=f,P.pointLength=m,P.spotLength=_,P.rectAreaLength=g,P.hemiLength=p,P.numDirectionalShadows=b,P.numPointShadows=x,P.numSpotShadows=v,P.numSpotMaps=M,P.numLightProbes=C,i.version=yE++)}function c(l,u){let h=0,d=0,f=0,m=0,_=0,g=u.matrixWorldInverse;for(let p=0,b=l.length;p<b;p++){let x=l[p];if(x.isDirectionalLight){let v=i.directional[h];v.direction.setFromMatrixPosition(x.matrixWorld),r.setFromMatrixPosition(x.target.matrixWorld),v.direction.sub(r),v.direction.transformDirection(g),h++}else if(x.isSpotLight){let v=i.spot[f];v.position.setFromMatrixPosition(x.matrixWorld),v.position.applyMatrix4(g),v.direction.setFromMatrixPosition(x.matrixWorld),r.setFromMatrixPosition(x.target.matrixWorld),v.direction.sub(r),v.direction.transformDirection(g),f++}else if(x.isRectAreaLight){let v=i.rectArea[m];v.position.setFromMatrixPosition(x.matrixWorld),v.position.applyMatrix4(g),o.identity(),s.copy(x.matrixWorld),s.premultiply(g),o.extractRotation(s),v.halfWidth.set(x.width*.5,0,0),v.halfHeight.set(0,x.height*.5,0),v.halfWidth.applyMatrix4(o),v.halfHeight.applyMatrix4(o),m++}else if(x.isPointLight){let v=i.point[d];v.position.setFromMatrixPosition(x.matrixWorld),v.position.applyMatrix4(g),d++}else if(x.isHemisphereLight){let v=i.hemi[_];v.direction.setFromMatrixPosition(x.matrixWorld),v.direction.transformDirection(g),_++}}}return{setup:a,setupView:c,state:i}}function Ug(e){let t=new bE(e),n=[],i=[];function r(u){l.camera=u,n.length=0,i.length=0}function s(u){n.push(u)}function o(u){i.push(u)}function a(){t.setup(n)}function c(u){t.setupView(n,u)}let l={lightsArray:n,shadowsArray:i,camera:null,lights:t,transmissionRenderTarget:{}};return{init:r,state:l,setupLights:a,setupLightsView:c,pushLight:s,pushShadow:o}}function ME(e){let t=new WeakMap;function n(r,s=0){let o=t.get(r),a;return o===void 0?(a=new Ug(e),t.set(r,[a])):s>=o.length?(a=new Ug(e),o.push(a)):a=o[s],a}function i(){t=new WeakMap}return{get:n,dispose:i}}var SE=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,wE=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
#include <packing>
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = unpackRGBATo2Half( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ) );
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = unpackRGBAToDepth( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ) );
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( squared_mean - mean * mean );
	gl_FragColor = pack2HalfToRGBA( vec2( mean, std_dev ) );
}`;function EE(e,t,n){let i=new Ts,r=new it,s=new it,o=new de,a=new Wc({depthPacking:eg}),c=new jc,l={},u=n.maxTextureSize,h={[Pi]:We,[We]:Pi,[pi]:pi},d=new Le({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new it},radius:{value:4}},vertexShader:SE,fragmentShader:wE}),f=d.clone();f.defines.HORIZONTAL_PASS=1;let m=new ve;m.setAttribute("position",new Ze(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let _=new we(m,d),g=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=gf;let p=this.type;this.render=function(S,C,P){if(g.enabled===!1||g.autoUpdate===!1&&g.needsUpdate===!1||S.length===0)return;let T=e.getRenderTarget(),w=e.getActiveCubeFace(),R=e.getActiveMipmapLevel(),V=e.state;V.setBlending(Qn),V.buffers.depth.getReversed()===!0?V.buffers.color.setClear(0,0,0,0):V.buffers.color.setClear(1,1,1,1),V.buffers.depth.setTest(!0),V.setScissorTest(!1);let N=p!==di&&this.type===di,k=p===di&&this.type!==di;for(let z=0,G=S.length;z<G;z++){let K=S[z],j=K.shadow;if(j===void 0){console.warn("THREE.WebGLShadowMap:",K,"has no shadow.");continue}if(j.autoUpdate===!1&&j.needsUpdate===!1)continue;r.copy(j.mapSize);let at=j.getFrameExtents();if(r.multiply(at),s.copy(j.mapSize),(r.x>u||r.y>u)&&(r.x>u&&(s.x=Math.floor(u/at.x),r.x=s.x*at.x,j.mapSize.x=s.x),r.y>u&&(s.y=Math.floor(u/at.y),r.y=s.y*at.y,j.mapSize.y=s.y)),j.map===null||N===!0||k===!0){let $=this.type!==di?{minFilter:Ln,magFilter:Ln}:{};j.map!==null&&j.map.dispose(),j.map=new Ke(r.x,r.y,$),j.map.texture.name=K.name+".shadowMap",j.camera.updateProjectionMatrix()}e.setRenderTarget(j.map),e.clear();let _t=j.getViewportCount();for(let $=0;$<_t;$++){let rt=j.getViewport($);o.set(s.x*rt.x,s.y*rt.y,s.x*rt.z,s.y*rt.w),V.viewport(o),j.updateMatrices(K,$),i=j.getFrustum(),v(C,P,j.camera,K,this.type)}j.isPointLightShadow!==!0&&this.type===di&&b(j,P),j.needsUpdate=!1}p=this.type,g.needsUpdate=!1,e.setRenderTarget(T,w,R)};function b(S,C){let P=t.update(_);d.defines.VSM_SAMPLES!==S.blurSamples&&(d.defines.VSM_SAMPLES=S.blurSamples,f.defines.VSM_SAMPLES=S.blurSamples,d.needsUpdate=!0,f.needsUpdate=!0),S.mapPass===null&&(S.mapPass=new Ke(r.x,r.y)),d.uniforms.shadow_pass.value=S.map.texture,d.uniforms.resolution.value=S.mapSize,d.uniforms.radius.value=S.radius,e.setRenderTarget(S.mapPass),e.clear(),e.renderBufferDirect(C,null,P,d,_,null),f.uniforms.shadow_pass.value=S.mapPass.texture,f.uniforms.resolution.value=S.mapSize,f.uniforms.radius.value=S.radius,e.setRenderTarget(S.map),e.clear(),e.renderBufferDirect(C,null,P,f,_,null)}function x(S,C,P,T){let w=null,R=P.isPointLight===!0?S.customDistanceMaterial:S.customDepthMaterial;if(R!==void 0)w=R;else if(w=P.isPointLight===!0?c:a,e.localClippingEnabled&&C.clipShadows===!0&&Array.isArray(C.clippingPlanes)&&C.clippingPlanes.length!==0||C.displacementMap&&C.displacementScale!==0||C.alphaMap&&C.alphaTest>0||C.map&&C.alphaTest>0||C.alphaToCoverage===!0){let V=w.uuid,N=C.uuid,k=l[V];k===void 0&&(k={},l[V]=k);let z=k[N];z===void 0&&(z=w.clone(),k[N]=z,C.addEventListener("dispose",M)),w=z}if(w.visible=C.visible,w.wireframe=C.wireframe,T===di?w.side=C.shadowSide!==null?C.shadowSide:C.side:w.side=C.shadowSide!==null?C.shadowSide:h[C.side],w.alphaMap=C.alphaMap,w.alphaTest=C.alphaToCoverage===!0?.5:C.alphaTest,w.map=C.map,w.clipShadows=C.clipShadows,w.clippingPlanes=C.clippingPlanes,w.clipIntersection=C.clipIntersection,w.displacementMap=C.displacementMap,w.displacementScale=C.displacementScale,w.displacementBias=C.displacementBias,w.wireframeLinewidth=C.wireframeLinewidth,w.linewidth=C.linewidth,P.isPointLight===!0&&w.isMeshDistanceMaterial===!0){let V=e.properties.get(w);V.light=P}return w}function v(S,C,P,T,w){if(S.visible===!1)return;if(S.layers.test(C.layers)&&(S.isMesh||S.isLine||S.isPoints)&&(S.castShadow||S.receiveShadow&&w===di)&&(!S.frustumCulled||i.intersectsObject(S))){S.modelViewMatrix.multiplyMatrices(P.matrixWorldInverse,S.matrixWorld);let N=t.update(S),k=S.material;if(Array.isArray(k)){let z=N.groups;for(let G=0,K=z.length;G<K;G++){let j=z[G],at=k[j.materialIndex];if(at&&at.visible){let _t=x(S,at,T,w);S.onBeforeShadow(e,S,C,P,N,_t,j),e.renderBufferDirect(P,null,N,_t,S,j),S.onAfterShadow(e,S,C,P,N,_t,j)}}}else if(k.visible){let z=x(S,k,T,w);S.onBeforeShadow(e,S,C,P,N,z,null),e.renderBufferDirect(P,null,N,z,S,null),S.onAfterShadow(e,S,C,P,N,z,null)}}let V=S.children;for(let N=0,k=V.length;N<k;N++)v(V[N],C,P,T,w)}function M(S){S.target.removeEventListener("dispose",M);for(let P in l){let T=l[P],w=S.target.uuid;w in T&&(T[w].dispose(),delete T[w])}}}var TE={[il]:rl,[sl]:cl,[ol]:ll,[Tr]:al,[rl]:il,[cl]:sl,[ll]:ol,[al]:Tr};function AE(e,t){function n(){let H=!1,ht=new de,dt=null,xt=new de(0,0,0,0);return{setMask:function(lt){dt!==lt&&!H&&(e.colorMask(lt,lt,lt,lt),dt=lt)},setLocked:function(lt){H=lt},setClear:function(lt,et,bt,Ht,he){he===!0&&(lt*=Ht,et*=Ht,bt*=Ht),ht.set(lt,et,bt,Ht),xt.equals(ht)===!1&&(e.clearColor(lt,et,bt,Ht),xt.copy(ht))},reset:function(){H=!1,dt=null,xt.set(-1,0,0,0)}}}function i(){let H=!1,ht=!1,dt=null,xt=null,lt=null;return{setReversed:function(et){if(ht!==et){let bt=t.get("EXT_clip_control");et?bt.clipControlEXT(bt.LOWER_LEFT_EXT,bt.ZERO_TO_ONE_EXT):bt.clipControlEXT(bt.LOWER_LEFT_EXT,bt.NEGATIVE_ONE_TO_ONE_EXT),ht=et;let Ht=lt;lt=null,this.setClear(Ht)}},getReversed:function(){return ht},setTest:function(et){et?tt(e.DEPTH_TEST):yt(e.DEPTH_TEST)},setMask:function(et){dt!==et&&!H&&(e.depthMask(et),dt=et)},setFunc:function(et){if(ht&&(et=TE[et]),xt!==et){switch(et){case il:e.depthFunc(e.NEVER);break;case rl:e.depthFunc(e.ALWAYS);break;case sl:e.depthFunc(e.LESS);break;case Tr:e.depthFunc(e.LEQUAL);break;case ol:e.depthFunc(e.EQUAL);break;case al:e.depthFunc(e.GEQUAL);break;case cl:e.depthFunc(e.GREATER);break;case ll:e.depthFunc(e.NOTEQUAL);break;default:e.depthFunc(e.LEQUAL)}xt=et}},setLocked:function(et){H=et},setClear:function(et){lt!==et&&(ht&&(et=1-et),e.clearDepth(et),lt=et)},reset:function(){H=!1,dt=null,xt=null,lt=null,ht=!1}}}function r(){let H=!1,ht=null,dt=null,xt=null,lt=null,et=null,bt=null,Ht=null,he=null;return{setTest:function(oe){H||(oe?tt(e.STENCIL_TEST):yt(e.STENCIL_TEST))},setMask:function(oe){ht!==oe&&!H&&(e.stencilMask(oe),ht=oe)},setFunc:function(oe,Wn,nn){(dt!==oe||xt!==Wn||lt!==nn)&&(e.stencilFunc(oe,Wn,nn),dt=oe,xt=Wn,lt=nn)},setOp:function(oe,Wn,nn){(et!==oe||bt!==Wn||Ht!==nn)&&(e.stencilOp(oe,Wn,nn),et=oe,bt=Wn,Ht=nn)},setLocked:function(oe){H=oe},setClear:function(oe){he!==oe&&(e.clearStencil(oe),he=oe)},reset:function(){H=!1,ht=null,dt=null,xt=null,lt=null,et=null,bt=null,Ht=null,he=null}}}let s=new n,o=new i,a=new r,c=new WeakMap,l=new WeakMap,u={},h={},d=new WeakMap,f=[],m=null,_=!1,g=null,p=null,b=null,x=null,v=null,M=null,S=null,C=new Ot(0,0,0),P=0,T=!1,w=null,R=null,V=null,N=null,k=null,z=e.getParameter(e.MAX_COMBINED_TEXTURE_IMAGE_UNITS),G=!1,K=0,j=e.getParameter(e.VERSION);j.indexOf("WebGL")!==-1?(K=parseFloat(/^WebGL (\d)/.exec(j)[1]),G=K>=1):j.indexOf("OpenGL ES")!==-1&&(K=parseFloat(/^OpenGL ES (\d)/.exec(j)[1]),G=K>=2);let at=null,_t={},$=e.getParameter(e.SCISSOR_BOX),rt=e.getParameter(e.VIEWPORT),pt=new de().fromArray($),zt=new de().fromArray(rt);function Lt(H,ht,dt,xt){let lt=new Uint8Array(4),et=e.createTexture();e.bindTexture(H,et),e.texParameteri(H,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(H,e.TEXTURE_MAG_FILTER,e.NEAREST);for(let bt=0;bt<dt;bt++)H===e.TEXTURE_3D||H===e.TEXTURE_2D_ARRAY?e.texImage3D(ht,0,e.RGBA,1,1,xt,0,e.RGBA,e.UNSIGNED_BYTE,lt):e.texImage2D(ht+bt,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,lt);return et}let X={};X[e.TEXTURE_2D]=Lt(e.TEXTURE_2D,e.TEXTURE_2D,1),X[e.TEXTURE_CUBE_MAP]=Lt(e.TEXTURE_CUBE_MAP,e.TEXTURE_CUBE_MAP_POSITIVE_X,6),X[e.TEXTURE_2D_ARRAY]=Lt(e.TEXTURE_2D_ARRAY,e.TEXTURE_2D_ARRAY,1,1),X[e.TEXTURE_3D]=Lt(e.TEXTURE_3D,e.TEXTURE_3D,1,1),s.setClear(0,0,0,1),o.setClear(1),a.setClear(0),tt(e.DEPTH_TEST),o.setFunc(Tr),kt(!1),wt(mf),tt(e.CULL_FACE),xe(Qn);function tt(H){u[H]!==!0&&(e.enable(H),u[H]=!0)}function yt(H){u[H]!==!1&&(e.disable(H),u[H]=!1)}function Bt(H,ht){return h[H]!==ht?(e.bindFramebuffer(H,ht),h[H]=ht,H===e.DRAW_FRAMEBUFFER&&(h[e.FRAMEBUFFER]=ht),H===e.FRAMEBUFFER&&(h[e.DRAW_FRAMEBUFFER]=ht),!0):!1}function It(H,ht){let dt=f,xt=!1;if(H){dt=d.get(ht),dt===void 0&&(dt=[],d.set(ht,dt));let lt=H.textures;if(dt.length!==lt.length||dt[0]!==e.COLOR_ATTACHMENT0){for(let et=0,bt=lt.length;et<bt;et++)dt[et]=e.COLOR_ATTACHMENT0+et;dt.length=lt.length,xt=!0}}else dt[0]!==e.BACK&&(dt[0]=e.BACK,xt=!0);xt&&e.drawBuffers(dt)}function Qt(H){return m!==H?(e.useProgram(H),m=H,!0):!1}let Re={[Yi]:e.FUNC_ADD,[Om]:e.FUNC_SUBTRACT,[Nm]:e.FUNC_REVERSE_SUBTRACT};Re[Fm]=e.MIN,Re[Um]=e.MAX;let B={[zm]:e.ZERO,[km]:e.ONE,[Bm]:e.SRC_COLOR,[Mc]:e.SRC_ALPHA,[qm]:e.SRC_ALPHA_SATURATE,[Wm]:e.DST_COLOR,[Hm]:e.DST_ALPHA,[Vm]:e.ONE_MINUS_SRC_COLOR,[Sc]:e.ONE_MINUS_SRC_ALPHA,[jm]:e.ONE_MINUS_DST_COLOR,[Gm]:e.ONE_MINUS_DST_ALPHA,[Xm]:e.CONSTANT_COLOR,[$m]:e.ONE_MINUS_CONSTANT_COLOR,[Ym]:e.CONSTANT_ALPHA,[Zm]:e.ONE_MINUS_CONSTANT_ALPHA};function xe(H,ht,dt,xt,lt,et,bt,Ht,he,oe){if(H===Qn){_===!0&&(yt(e.BLEND),_=!1);return}if(_===!1&&(tt(e.BLEND),_=!0),H!==Lm){if(H!==g||oe!==T){if((p!==Yi||v!==Yi)&&(e.blendEquation(e.FUNC_ADD),p=Yi,v=Yi),oe)switch(H){case Er:e.blendFuncSeparate(e.ONE,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA);break;case Ji:e.blendFunc(e.ONE,e.ONE);break;case _f:e.blendFuncSeparate(e.ZERO,e.ONE_MINUS_SRC_COLOR,e.ZERO,e.ONE);break;case vf:e.blendFuncSeparate(e.DST_COLOR,e.ONE_MINUS_SRC_ALPHA,e.ZERO,e.ONE);break;default:console.error("THREE.WebGLState: Invalid blending: ",H);break}else switch(H){case Er:e.blendFuncSeparate(e.SRC_ALPHA,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA);break;case Ji:e.blendFuncSeparate(e.SRC_ALPHA,e.ONE,e.ONE,e.ONE);break;case _f:console.error("THREE.WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case vf:console.error("THREE.WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:console.error("THREE.WebGLState: Invalid blending: ",H);break}b=null,x=null,M=null,S=null,C.set(0,0,0),P=0,g=H,T=oe}return}lt=lt||ht,et=et||dt,bt=bt||xt,(ht!==p||lt!==v)&&(e.blendEquationSeparate(Re[ht],Re[lt]),p=ht,v=lt),(dt!==b||xt!==x||et!==M||bt!==S)&&(e.blendFuncSeparate(B[dt],B[xt],B[et],B[bt]),b=dt,x=xt,M=et,S=bt),(Ht.equals(C)===!1||he!==P)&&(e.blendColor(Ht.r,Ht.g,Ht.b,he),C.copy(Ht),P=he),g=H,T=!1}function Wt(H,ht){H.side===pi?yt(e.CULL_FACE):tt(e.CULL_FACE);let dt=H.side===We;ht&&(dt=!dt),kt(dt),H.blending===Er&&H.transparent===!1?xe(Qn):xe(H.blending,H.blendEquation,H.blendSrc,H.blendDst,H.blendEquationAlpha,H.blendSrcAlpha,H.blendDstAlpha,H.blendColor,H.blendAlpha,H.premultipliedAlpha),o.setFunc(H.depthFunc),o.setTest(H.depthTest),o.setMask(H.depthWrite),s.setMask(H.colorWrite);let xt=H.stencilWrite;a.setTest(xt),xt&&(a.setMask(H.stencilWriteMask),a.setFunc(H.stencilFunc,H.stencilRef,H.stencilFuncMask),a.setOp(H.stencilFail,H.stencilZFail,H.stencilZPass)),Tt(H.polygonOffset,H.polygonOffsetFactor,H.polygonOffsetUnits),H.alphaToCoverage===!0?tt(e.SAMPLE_ALPHA_TO_COVERAGE):yt(e.SAMPLE_ALPHA_TO_COVERAGE)}function kt(H){w!==H&&(H?e.frontFace(e.CW):e.frontFace(e.CCW),w=H)}function wt(H){H!==Pm?(tt(e.CULL_FACE),H!==R&&(H===mf?e.cullFace(e.BACK):H===Im?e.cullFace(e.FRONT):e.cullFace(e.FRONT_AND_BACK))):yt(e.CULL_FACE),R=H}function _e(H){H!==V&&(G&&e.lineWidth(H),V=H)}function Tt(H,ht,dt){H?(tt(e.POLYGON_OFFSET_FILL),(N!==ht||k!==dt)&&(e.polygonOffset(ht,dt),N=ht,k=dt)):yt(e.POLYGON_OFFSET_FILL)}function qt(H){H?tt(e.SCISSOR_TEST):yt(e.SCISSOR_TEST)}function Ie(H){H===void 0&&(H=e.TEXTURE0+z-1),at!==H&&(e.activeTexture(H),at=H)}function Ae(H,ht,dt){dt===void 0&&(at===null?dt=e.TEXTURE0+z-1:dt=at);let xt=_t[dt];xt===void 0&&(xt={type:void 0,texture:void 0},_t[dt]=xt),(xt.type!==H||xt.texture!==ht)&&(at!==dt&&(e.activeTexture(dt),at=dt),e.bindTexture(H,ht||X[H]),xt.type=H,xt.texture=ht)}function L(){let H=_t[at];H!==void 0&&H.type!==void 0&&(e.bindTexture(H.type,null),H.type=void 0,H.texture=void 0)}function E(){try{e.compressedTexImage2D(...arguments)}catch(H){console.error("THREE.WebGLState:",H)}}function W(){try{e.compressedTexImage3D(...arguments)}catch(H){console.error("THREE.WebGLState:",H)}}function J(){try{e.texSubImage2D(...arguments)}catch(H){console.error("THREE.WebGLState:",H)}}function st(){try{e.texSubImage3D(...arguments)}catch(H){console.error("THREE.WebGLState:",H)}}function Y(){try{e.compressedTexSubImage2D(...arguments)}catch(H){console.error("THREE.WebGLState:",H)}}function Pt(){try{e.compressedTexSubImage3D(...arguments)}catch(H){console.error("THREE.WebGLState:",H)}}function ft(){try{e.texStorage2D(...arguments)}catch(H){console.error("THREE.WebGLState:",H)}}function Et(){try{e.texStorage3D(...arguments)}catch(H){console.error("THREE.WebGLState:",H)}}function At(){try{e.texImage2D(...arguments)}catch(H){console.error("THREE.WebGLState:",H)}}function ot(){try{e.texImage3D(...arguments)}catch(H){console.error("THREE.WebGLState:",H)}}function vt(H){pt.equals(H)===!1&&(e.scissor(H.x,H.y,H.z,H.w),pt.copy(H))}function Ft(H){zt.equals(H)===!1&&(e.viewport(H.x,H.y,H.z,H.w),zt.copy(H))}function Mt(H,ht){let dt=l.get(ht);dt===void 0&&(dt=new WeakMap,l.set(ht,dt));let xt=dt.get(H);xt===void 0&&(xt=e.getUniformBlockIndex(ht,H.name),dt.set(H,xt))}function mt(H,ht){let xt=l.get(ht).get(H);c.get(ht)!==xt&&(e.uniformBlockBinding(ht,xt,H.__bindingPointIndex),c.set(ht,xt))}function jt(){e.disable(e.BLEND),e.disable(e.CULL_FACE),e.disable(e.DEPTH_TEST),e.disable(e.POLYGON_OFFSET_FILL),e.disable(e.SCISSOR_TEST),e.disable(e.STENCIL_TEST),e.disable(e.SAMPLE_ALPHA_TO_COVERAGE),e.blendEquation(e.FUNC_ADD),e.blendFunc(e.ONE,e.ZERO),e.blendFuncSeparate(e.ONE,e.ZERO,e.ONE,e.ZERO),e.blendColor(0,0,0,0),e.colorMask(!0,!0,!0,!0),e.clearColor(0,0,0,0),e.depthMask(!0),e.depthFunc(e.LESS),o.setReversed(!1),e.clearDepth(1),e.stencilMask(4294967295),e.stencilFunc(e.ALWAYS,0,4294967295),e.stencilOp(e.KEEP,e.KEEP,e.KEEP),e.clearStencil(0),e.cullFace(e.BACK),e.frontFace(e.CCW),e.polygonOffset(0,0),e.activeTexture(e.TEXTURE0),e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindFramebuffer(e.DRAW_FRAMEBUFFER,null),e.bindFramebuffer(e.READ_FRAMEBUFFER,null),e.useProgram(null),e.lineWidth(1),e.scissor(0,0,e.canvas.width,e.canvas.height),e.viewport(0,0,e.canvas.width,e.canvas.height),u={},at=null,_t={},h={},d=new WeakMap,f=[],m=null,_=!1,g=null,p=null,b=null,x=null,v=null,M=null,S=null,C=new Ot(0,0,0),P=0,T=!1,w=null,R=null,V=null,N=null,k=null,pt.set(0,0,e.canvas.width,e.canvas.height),zt.set(0,0,e.canvas.width,e.canvas.height),s.reset(),o.reset(),a.reset()}return{buffers:{color:s,depth:o,stencil:a},enable:tt,disable:yt,bindFramebuffer:Bt,drawBuffers:It,useProgram:Qt,setBlending:xe,setMaterial:Wt,setFlipSided:kt,setCullFace:wt,setLineWidth:_e,setPolygonOffset:Tt,setScissorTest:qt,activeTexture:Ie,bindTexture:Ae,unbindTexture:L,compressedTexImage2D:E,compressedTexImage3D:W,texImage2D:At,texImage3D:ot,updateUBOMapping:Mt,uniformBlockBinding:mt,texStorage2D:ft,texStorage3D:Et,texSubImage2D:J,texSubImage3D:st,compressedTexSubImage2D:Y,compressedTexSubImage3D:Pt,scissor:vt,viewport:Ft,reset:jt}}function CE(e,t,n,i,r,s,o){let a=t.has("WEBGL_multisampled_render_to_texture")?t.get("WEBGL_multisampled_render_to_texture"):null,c=typeof navigator=="undefined"?!1:/OculusBrowser/g.test(navigator.userAgent),l=new it,u=new WeakMap,h,d=new WeakMap,f=!1;try{f=typeof OffscreenCanvas!="undefined"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch(L){}function m(L,E){return f?new OffscreenCanvas(L,E):xs("canvas")}function _(L,E,W){let J=1,st=Ae(L);if((st.width>W||st.height>W)&&(J=W/Math.max(st.width,st.height)),J<1)if(typeof HTMLImageElement!="undefined"&&L instanceof HTMLImageElement||typeof HTMLCanvasElement!="undefined"&&L instanceof HTMLCanvasElement||typeof ImageBitmap!="undefined"&&L instanceof ImageBitmap||typeof VideoFrame!="undefined"&&L instanceof VideoFrame){let Y=Math.floor(J*st.width),Pt=Math.floor(J*st.height);h===void 0&&(h=m(Y,Pt));let ft=E?m(Y,Pt):h;return ft.width=Y,ft.height=Pt,ft.getContext("2d").drawImage(L,0,0,Y,Pt),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+st.width+"x"+st.height+") to ("+Y+"x"+Pt+")."),ft}else return"data"in L&&console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+st.width+"x"+st.height+")."),L;return L}function g(L){return L.generateMipmaps}function p(L){e.generateMipmap(L)}function b(L){return L.isWebGLCubeRenderTarget?e.TEXTURE_CUBE_MAP:L.isWebGL3DRenderTarget?e.TEXTURE_3D:L.isWebGLArrayRenderTarget||L.isCompressedArrayTexture?e.TEXTURE_2D_ARRAY:e.TEXTURE_2D}function x(L,E,W,J,st=!1){if(L!==null){if(e[L]!==void 0)return e[L];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+L+"'")}let Y=E;if(E===e.RED&&(W===e.FLOAT&&(Y=e.R32F),W===e.HALF_FLOAT&&(Y=e.R16F),W===e.UNSIGNED_BYTE&&(Y=e.R8)),E===e.RED_INTEGER&&(W===e.UNSIGNED_BYTE&&(Y=e.R8UI),W===e.UNSIGNED_SHORT&&(Y=e.R16UI),W===e.UNSIGNED_INT&&(Y=e.R32UI),W===e.BYTE&&(Y=e.R8I),W===e.SHORT&&(Y=e.R16I),W===e.INT&&(Y=e.R32I)),E===e.RG&&(W===e.FLOAT&&(Y=e.RG32F),W===e.HALF_FLOAT&&(Y=e.RG16F),W===e.UNSIGNED_BYTE&&(Y=e.RG8)),E===e.RG_INTEGER&&(W===e.UNSIGNED_BYTE&&(Y=e.RG8UI),W===e.UNSIGNED_SHORT&&(Y=e.RG16UI),W===e.UNSIGNED_INT&&(Y=e.RG32UI),W===e.BYTE&&(Y=e.RG8I),W===e.SHORT&&(Y=e.RG16I),W===e.INT&&(Y=e.RG32I)),E===e.RGB_INTEGER&&(W===e.UNSIGNED_BYTE&&(Y=e.RGB8UI),W===e.UNSIGNED_SHORT&&(Y=e.RGB16UI),W===e.UNSIGNED_INT&&(Y=e.RGB32UI),W===e.BYTE&&(Y=e.RGB8I),W===e.SHORT&&(Y=e.RGB16I),W===e.INT&&(Y=e.RGB32I)),E===e.RGBA_INTEGER&&(W===e.UNSIGNED_BYTE&&(Y=e.RGBA8UI),W===e.UNSIGNED_SHORT&&(Y=e.RGBA16UI),W===e.UNSIGNED_INT&&(Y=e.RGBA32UI),W===e.BYTE&&(Y=e.RGBA8I),W===e.SHORT&&(Y=e.RGBA16I),W===e.INT&&(Y=e.RGBA32I)),E===e.RGB&&(W===e.UNSIGNED_INT_5_9_9_9_REV&&(Y=e.RGB9_E5),W===e.UNSIGNED_INT_10F_11F_11F_REV&&(Y=e.R11F_G11F_B10F)),E===e.RGBA){let Pt=st?Ao:ie.getTransfer(J);W===e.FLOAT&&(Y=e.RGBA32F),W===e.HALF_FLOAT&&(Y=e.RGBA16F),W===e.UNSIGNED_BYTE&&(Y=Pt===ae?e.SRGB8_ALPHA8:e.RGBA8),W===e.UNSIGNED_SHORT_4_4_4_4&&(Y=e.RGBA4),W===e.UNSIGNED_SHORT_5_5_5_1&&(Y=e.RGB5_A1)}return(Y===e.R16F||Y===e.R32F||Y===e.RG16F||Y===e.RG32F||Y===e.RGBA16F||Y===e.RGBA32F)&&t.get("EXT_color_buffer_float"),Y}function v(L,E){let W;return L?E===null||E===tr||E===Os?W=e.DEPTH24_STENCIL8:E===mi?W=e.DEPTH32F_STENCIL8:E===Ls&&(W=e.DEPTH24_STENCIL8,console.warn("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):E===null||E===tr||E===Os?W=e.DEPTH_COMPONENT24:E===mi?W=e.DEPTH_COMPONENT32F:E===Ls&&(W=e.DEPTH_COMPONENT16),W}function M(L,E){return g(L)===!0||L.isFramebufferTexture&&L.minFilter!==Ln&&L.minFilter!==Kn?Math.log2(Math.max(E.width,E.height))+1:L.mipmaps!==void 0&&L.mipmaps.length>0?L.mipmaps.length:L.isCompressedTexture&&Array.isArray(L.image)?E.mipmaps.length:1}function S(L){let E=L.target;E.removeEventListener("dispose",S),P(E),E.isVideoTexture&&u.delete(E)}function C(L){let E=L.target;E.removeEventListener("dispose",C),w(E)}function P(L){let E=i.get(L);if(E.__webglInit===void 0)return;let W=L.source,J=d.get(W);if(J){let st=J[E.__cacheKey];st.usedTimes--,st.usedTimes===0&&T(L),Object.keys(J).length===0&&d.delete(W)}i.remove(L)}function T(L){let E=i.get(L);e.deleteTexture(E.__webglTexture);let W=L.source,J=d.get(W);delete J[E.__cacheKey],o.memory.textures--}function w(L){let E=i.get(L);if(L.depthTexture&&(L.depthTexture.dispose(),i.remove(L.depthTexture)),L.isWebGLCubeRenderTarget)for(let J=0;J<6;J++){if(Array.isArray(E.__webglFramebuffer[J]))for(let st=0;st<E.__webglFramebuffer[J].length;st++)e.deleteFramebuffer(E.__webglFramebuffer[J][st]);else e.deleteFramebuffer(E.__webglFramebuffer[J]);E.__webglDepthbuffer&&e.deleteRenderbuffer(E.__webglDepthbuffer[J])}else{if(Array.isArray(E.__webglFramebuffer))for(let J=0;J<E.__webglFramebuffer.length;J++)e.deleteFramebuffer(E.__webglFramebuffer[J]);else e.deleteFramebuffer(E.__webglFramebuffer);if(E.__webglDepthbuffer&&e.deleteRenderbuffer(E.__webglDepthbuffer),E.__webglMultisampledFramebuffer&&e.deleteFramebuffer(E.__webglMultisampledFramebuffer),E.__webglColorRenderbuffer)for(let J=0;J<E.__webglColorRenderbuffer.length;J++)E.__webglColorRenderbuffer[J]&&e.deleteRenderbuffer(E.__webglColorRenderbuffer[J]);E.__webglDepthRenderbuffer&&e.deleteRenderbuffer(E.__webglDepthRenderbuffer)}let W=L.textures;for(let J=0,st=W.length;J<st;J++){let Y=i.get(W[J]);Y.__webglTexture&&(e.deleteTexture(Y.__webglTexture),o.memory.textures--),i.remove(W[J])}i.remove(L)}let R=0;function V(){R=0}function N(){let L=R;return L>=r.maxTextures&&console.warn("THREE.WebGLTextures: Trying to use "+L+" texture units while this GPU supports only "+r.maxTextures),R+=1,L}function k(L){let E=[];return E.push(L.wrapS),E.push(L.wrapT),E.push(L.wrapR||0),E.push(L.magFilter),E.push(L.minFilter),E.push(L.anisotropy),E.push(L.internalFormat),E.push(L.format),E.push(L.type),E.push(L.generateMipmaps),E.push(L.premultiplyAlpha),E.push(L.flipY),E.push(L.unpackAlignment),E.push(L.colorSpace),E.join()}function z(L,E){let W=i.get(L);if(L.isVideoTexture&&qt(L),L.isRenderTargetTexture===!1&&L.isExternalTexture!==!0&&L.version>0&&W.__version!==L.version){let J=L.image;if(J===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if(J.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{X(W,L,E);return}}else L.isExternalTexture&&(W.__webglTexture=L.sourceTexture?L.sourceTexture:null);n.bindTexture(e.TEXTURE_2D,W.__webglTexture,e.TEXTURE0+E)}function G(L,E){let W=i.get(L);if(L.isRenderTargetTexture===!1&&L.version>0&&W.__version!==L.version){X(W,L,E);return}n.bindTexture(e.TEXTURE_2D_ARRAY,W.__webglTexture,e.TEXTURE0+E)}function K(L,E){let W=i.get(L);if(L.isRenderTargetTexture===!1&&L.version>0&&W.__version!==L.version){X(W,L,E);return}n.bindTexture(e.TEXTURE_3D,W.__webglTexture,e.TEXTURE0+E)}function j(L,E){let W=i.get(L);if(L.version>0&&W.__version!==L.version){tt(W,L,E);return}n.bindTexture(e.TEXTURE_CUBE_MAP,W.__webglTexture,e.TEXTURE0+E)}let at={[wc]:e.REPEAT,[$i]:e.CLAMP_TO_EDGE,[Ec]:e.MIRRORED_REPEAT},_t={[Ln]:e.NEAREST,[Qm]:e.NEAREST_MIPMAP_NEAREST,[na]:e.NEAREST_MIPMAP_LINEAR,[Kn]:e.LINEAR,[xl]:e.LINEAR_MIPMAP_NEAREST,[Qi]:e.LINEAR_MIPMAP_LINEAR},$={[ig]:e.NEVER,[lg]:e.ALWAYS,[rg]:e.LESS,[Cf]:e.LEQUAL,[sg]:e.EQUAL,[cg]:e.GEQUAL,[og]:e.GREATER,[ag]:e.NOTEQUAL};function rt(L,E){if(E.type===mi&&t.has("OES_texture_float_linear")===!1&&(E.magFilter===Kn||E.magFilter===xl||E.magFilter===na||E.magFilter===Qi||E.minFilter===Kn||E.minFilter===xl||E.minFilter===na||E.minFilter===Qi)&&console.warn("THREE.WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),e.texParameteri(L,e.TEXTURE_WRAP_S,at[E.wrapS]),e.texParameteri(L,e.TEXTURE_WRAP_T,at[E.wrapT]),(L===e.TEXTURE_3D||L===e.TEXTURE_2D_ARRAY)&&e.texParameteri(L,e.TEXTURE_WRAP_R,at[E.wrapR]),e.texParameteri(L,e.TEXTURE_MAG_FILTER,_t[E.magFilter]),e.texParameteri(L,e.TEXTURE_MIN_FILTER,_t[E.minFilter]),E.compareFunction&&(e.texParameteri(L,e.TEXTURE_COMPARE_MODE,e.COMPARE_REF_TO_TEXTURE),e.texParameteri(L,e.TEXTURE_COMPARE_FUNC,$[E.compareFunction])),t.has("EXT_texture_filter_anisotropic")===!0){if(E.magFilter===Ln||E.minFilter!==na&&E.minFilter!==Qi||E.type===mi&&t.has("OES_texture_float_linear")===!1)return;if(E.anisotropy>1||i.get(E).__currentAnisotropy){let W=t.get("EXT_texture_filter_anisotropic");e.texParameterf(L,W.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(E.anisotropy,r.getMaxAnisotropy())),i.get(E).__currentAnisotropy=E.anisotropy}}}function pt(L,E){let W=!1;L.__webglInit===void 0&&(L.__webglInit=!0,E.addEventListener("dispose",S));let J=E.source,st=d.get(J);st===void 0&&(st={},d.set(J,st));let Y=k(E);if(Y!==L.__cacheKey){st[Y]===void 0&&(st[Y]={texture:e.createTexture(),usedTimes:0},o.memory.textures++,W=!0),st[Y].usedTimes++;let Pt=st[L.__cacheKey];Pt!==void 0&&(st[L.__cacheKey].usedTimes--,Pt.usedTimes===0&&T(E)),L.__cacheKey=Y,L.__webglTexture=st[Y].texture}return W}function zt(L,E,W){return Math.floor(Math.floor(L/W)/E)}function Lt(L,E,W,J){let Y=L.updateRanges;if(Y.length===0)n.texSubImage2D(e.TEXTURE_2D,0,0,0,E.width,E.height,W,J,E.data);else{Y.sort((ot,vt)=>ot.start-vt.start);let Pt=0;for(let ot=1;ot<Y.length;ot++){let vt=Y[Pt],Ft=Y[ot],Mt=vt.start+vt.count,mt=zt(Ft.start,E.width,4),jt=zt(vt.start,E.width,4);Ft.start<=Mt+1&&mt===jt&&zt(Ft.start+Ft.count-1,E.width,4)===mt?vt.count=Math.max(vt.count,Ft.start+Ft.count-vt.start):(++Pt,Y[Pt]=Ft)}Y.length=Pt+1;let ft=e.getParameter(e.UNPACK_ROW_LENGTH),Et=e.getParameter(e.UNPACK_SKIP_PIXELS),At=e.getParameter(e.UNPACK_SKIP_ROWS);e.pixelStorei(e.UNPACK_ROW_LENGTH,E.width);for(let ot=0,vt=Y.length;ot<vt;ot++){let Ft=Y[ot],Mt=Math.floor(Ft.start/4),mt=Math.ceil(Ft.count/4),jt=Mt%E.width,H=Math.floor(Mt/E.width),ht=mt,dt=1;e.pixelStorei(e.UNPACK_SKIP_PIXELS,jt),e.pixelStorei(e.UNPACK_SKIP_ROWS,H),n.texSubImage2D(e.TEXTURE_2D,0,jt,H,ht,dt,W,J,E.data)}L.clearUpdateRanges(),e.pixelStorei(e.UNPACK_ROW_LENGTH,ft),e.pixelStorei(e.UNPACK_SKIP_PIXELS,Et),e.pixelStorei(e.UNPACK_SKIP_ROWS,At)}}function X(L,E,W){let J=e.TEXTURE_2D;(E.isDataArrayTexture||E.isCompressedArrayTexture)&&(J=e.TEXTURE_2D_ARRAY),E.isData3DTexture&&(J=e.TEXTURE_3D);let st=pt(L,E),Y=E.source;n.bindTexture(J,L.__webglTexture,e.TEXTURE0+W);let Pt=i.get(Y);if(Y.version!==Pt.__version||st===!0){n.activeTexture(e.TEXTURE0+W);let ft=ie.getPrimaries(ie.workingColorSpace),Et=E.colorSpace===Ni?null:ie.getPrimaries(E.colorSpace),At=E.colorSpace===Ni||ft===Et?e.NONE:e.BROWSER_DEFAULT_WEBGL;e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,E.flipY),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,E.premultiplyAlpha),e.pixelStorei(e.UNPACK_ALIGNMENT,E.unpackAlignment),e.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,At);let ot=_(E.image,!1,r.maxTextureSize);ot=Ie(E,ot);let vt=s.convert(E.format,E.colorSpace),Ft=s.convert(E.type),Mt=x(E.internalFormat,vt,Ft,E.colorSpace,E.isVideoTexture);rt(J,E);let mt,jt=E.mipmaps,H=E.isVideoTexture!==!0,ht=Pt.__version===void 0||st===!0,dt=Y.dataReady,xt=M(E,ot);if(E.isDepthTexture)Mt=v(E.format===Ns,E.type),ht&&(H?n.texStorage2D(e.TEXTURE_2D,1,Mt,ot.width,ot.height):n.texImage2D(e.TEXTURE_2D,0,Mt,ot.width,ot.height,0,vt,Ft,null));else if(E.isDataTexture)if(jt.length>0){H&&ht&&n.texStorage2D(e.TEXTURE_2D,xt,Mt,jt[0].width,jt[0].height);for(let lt=0,et=jt.length;lt<et;lt++)mt=jt[lt],H?dt&&n.texSubImage2D(e.TEXTURE_2D,lt,0,0,mt.width,mt.height,vt,Ft,mt.data):n.texImage2D(e.TEXTURE_2D,lt,Mt,mt.width,mt.height,0,vt,Ft,mt.data);E.generateMipmaps=!1}else H?(ht&&n.texStorage2D(e.TEXTURE_2D,xt,Mt,ot.width,ot.height),dt&&Lt(E,ot,vt,Ft)):n.texImage2D(e.TEXTURE_2D,0,Mt,ot.width,ot.height,0,vt,Ft,ot.data);else if(E.isCompressedTexture)if(E.isCompressedArrayTexture){H&&ht&&n.texStorage3D(e.TEXTURE_2D_ARRAY,xt,Mt,jt[0].width,jt[0].height,ot.depth);for(let lt=0,et=jt.length;lt<et;lt++)if(mt=jt[lt],E.format!==kn)if(vt!==null)if(H){if(dt)if(E.layerUpdates.size>0){let bt=Ff(mt.width,mt.height,E.format,E.type);for(let Ht of E.layerUpdates){let he=mt.data.subarray(Ht*bt/mt.data.BYTES_PER_ELEMENT,(Ht+1)*bt/mt.data.BYTES_PER_ELEMENT);n.compressedTexSubImage3D(e.TEXTURE_2D_ARRAY,lt,0,0,Ht,mt.width,mt.height,1,vt,he)}E.clearLayerUpdates()}else n.compressedTexSubImage3D(e.TEXTURE_2D_ARRAY,lt,0,0,0,mt.width,mt.height,ot.depth,vt,mt.data)}else n.compressedTexImage3D(e.TEXTURE_2D_ARRAY,lt,Mt,mt.width,mt.height,ot.depth,0,mt.data,0,0);else console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else H?dt&&n.texSubImage3D(e.TEXTURE_2D_ARRAY,lt,0,0,0,mt.width,mt.height,ot.depth,vt,Ft,mt.data):n.texImage3D(e.TEXTURE_2D_ARRAY,lt,Mt,mt.width,mt.height,ot.depth,0,vt,Ft,mt.data)}else{H&&ht&&n.texStorage2D(e.TEXTURE_2D,xt,Mt,jt[0].width,jt[0].height);for(let lt=0,et=jt.length;lt<et;lt++)mt=jt[lt],E.format!==kn?vt!==null?H?dt&&n.compressedTexSubImage2D(e.TEXTURE_2D,lt,0,0,mt.width,mt.height,vt,mt.data):n.compressedTexImage2D(e.TEXTURE_2D,lt,Mt,mt.width,mt.height,0,mt.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):H?dt&&n.texSubImage2D(e.TEXTURE_2D,lt,0,0,mt.width,mt.height,vt,Ft,mt.data):n.texImage2D(e.TEXTURE_2D,lt,Mt,mt.width,mt.height,0,vt,Ft,mt.data)}else if(E.isDataArrayTexture)if(H){if(ht&&n.texStorage3D(e.TEXTURE_2D_ARRAY,xt,Mt,ot.width,ot.height,ot.depth),dt)if(E.layerUpdates.size>0){let lt=Ff(ot.width,ot.height,E.format,E.type);for(let et of E.layerUpdates){let bt=ot.data.subarray(et*lt/ot.data.BYTES_PER_ELEMENT,(et+1)*lt/ot.data.BYTES_PER_ELEMENT);n.texSubImage3D(e.TEXTURE_2D_ARRAY,0,0,0,et,ot.width,ot.height,1,vt,Ft,bt)}E.clearLayerUpdates()}else n.texSubImage3D(e.TEXTURE_2D_ARRAY,0,0,0,0,ot.width,ot.height,ot.depth,vt,Ft,ot.data)}else n.texImage3D(e.TEXTURE_2D_ARRAY,0,Mt,ot.width,ot.height,ot.depth,0,vt,Ft,ot.data);else if(E.isData3DTexture)H?(ht&&n.texStorage3D(e.TEXTURE_3D,xt,Mt,ot.width,ot.height,ot.depth),dt&&n.texSubImage3D(e.TEXTURE_3D,0,0,0,0,ot.width,ot.height,ot.depth,vt,Ft,ot.data)):n.texImage3D(e.TEXTURE_3D,0,Mt,ot.width,ot.height,ot.depth,0,vt,Ft,ot.data);else if(E.isFramebufferTexture){if(ht)if(H)n.texStorage2D(e.TEXTURE_2D,xt,Mt,ot.width,ot.height);else{let lt=ot.width,et=ot.height;for(let bt=0;bt<xt;bt++)n.texImage2D(e.TEXTURE_2D,bt,Mt,lt,et,0,vt,Ft,null),lt>>=1,et>>=1}}else if(jt.length>0){if(H&&ht){let lt=Ae(jt[0]);n.texStorage2D(e.TEXTURE_2D,xt,Mt,lt.width,lt.height)}for(let lt=0,et=jt.length;lt<et;lt++)mt=jt[lt],H?dt&&n.texSubImage2D(e.TEXTURE_2D,lt,0,0,vt,Ft,mt):n.texImage2D(e.TEXTURE_2D,lt,Mt,vt,Ft,mt);E.generateMipmaps=!1}else if(H){if(ht){let lt=Ae(ot);n.texStorage2D(e.TEXTURE_2D,xt,Mt,lt.width,lt.height)}dt&&n.texSubImage2D(e.TEXTURE_2D,0,0,0,vt,Ft,ot)}else n.texImage2D(e.TEXTURE_2D,0,Mt,vt,Ft,ot);g(E)&&p(J),Pt.__version=Y.version,E.onUpdate&&E.onUpdate(E)}L.__version=E.version}function tt(L,E,W){if(E.image.length!==6)return;let J=pt(L,E),st=E.source;n.bindTexture(e.TEXTURE_CUBE_MAP,L.__webglTexture,e.TEXTURE0+W);let Y=i.get(st);if(st.version!==Y.__version||J===!0){n.activeTexture(e.TEXTURE0+W);let Pt=ie.getPrimaries(ie.workingColorSpace),ft=E.colorSpace===Ni?null:ie.getPrimaries(E.colorSpace),Et=E.colorSpace===Ni||Pt===ft?e.NONE:e.BROWSER_DEFAULT_WEBGL;e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,E.flipY),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,E.premultiplyAlpha),e.pixelStorei(e.UNPACK_ALIGNMENT,E.unpackAlignment),e.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,Et);let At=E.isCompressedTexture||E.image[0].isCompressedTexture,ot=E.image[0]&&E.image[0].isDataTexture,vt=[];for(let et=0;et<6;et++)!At&&!ot?vt[et]=_(E.image[et],!0,r.maxCubemapSize):vt[et]=ot?E.image[et].image:E.image[et],vt[et]=Ie(E,vt[et]);let Ft=vt[0],Mt=s.convert(E.format,E.colorSpace),mt=s.convert(E.type),jt=x(E.internalFormat,Mt,mt,E.colorSpace),H=E.isVideoTexture!==!0,ht=Y.__version===void 0||J===!0,dt=st.dataReady,xt=M(E,Ft);rt(e.TEXTURE_CUBE_MAP,E);let lt;if(At){H&&ht&&n.texStorage2D(e.TEXTURE_CUBE_MAP,xt,jt,Ft.width,Ft.height);for(let et=0;et<6;et++){lt=vt[et].mipmaps;for(let bt=0;bt<lt.length;bt++){let Ht=lt[bt];E.format!==kn?Mt!==null?H?dt&&n.compressedTexSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+et,bt,0,0,Ht.width,Ht.height,Mt,Ht.data):n.compressedTexImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+et,bt,jt,Ht.width,Ht.height,0,Ht.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):H?dt&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+et,bt,0,0,Ht.width,Ht.height,Mt,mt,Ht.data):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+et,bt,jt,Ht.width,Ht.height,0,Mt,mt,Ht.data)}}}else{if(lt=E.mipmaps,H&&ht){lt.length>0&&xt++;let et=Ae(vt[0]);n.texStorage2D(e.TEXTURE_CUBE_MAP,xt,jt,et.width,et.height)}for(let et=0;et<6;et++)if(ot){H?dt&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+et,0,0,0,vt[et].width,vt[et].height,Mt,mt,vt[et].data):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+et,0,jt,vt[et].width,vt[et].height,0,Mt,mt,vt[et].data);for(let bt=0;bt<lt.length;bt++){let he=lt[bt].image[et].image;H?dt&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+et,bt+1,0,0,he.width,he.height,Mt,mt,he.data):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+et,bt+1,jt,he.width,he.height,0,Mt,mt,he.data)}}else{H?dt&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+et,0,0,0,Mt,mt,vt[et]):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+et,0,jt,Mt,mt,vt[et]);for(let bt=0;bt<lt.length;bt++){let Ht=lt[bt];H?dt&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+et,bt+1,0,0,Mt,mt,Ht.image[et]):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+et,bt+1,jt,Mt,mt,Ht.image[et])}}}g(E)&&p(e.TEXTURE_CUBE_MAP),Y.__version=st.version,E.onUpdate&&E.onUpdate(E)}L.__version=E.version}function yt(L,E,W,J,st,Y){let Pt=s.convert(W.format,W.colorSpace),ft=s.convert(W.type),Et=x(W.internalFormat,Pt,ft,W.colorSpace),At=i.get(E),ot=i.get(W);if(ot.__renderTarget=E,!At.__hasExternalTextures){let vt=Math.max(1,E.width>>Y),Ft=Math.max(1,E.height>>Y);st===e.TEXTURE_3D||st===e.TEXTURE_2D_ARRAY?n.texImage3D(st,Y,Et,vt,Ft,E.depth,0,Pt,ft,null):n.texImage2D(st,Y,Et,vt,Ft,0,Pt,ft,null)}n.bindFramebuffer(e.FRAMEBUFFER,L),Tt(E)?a.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,J,st,ot.__webglTexture,0,_e(E)):(st===e.TEXTURE_2D||st>=e.TEXTURE_CUBE_MAP_POSITIVE_X&&st<=e.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&e.framebufferTexture2D(e.FRAMEBUFFER,J,st,ot.__webglTexture,Y),n.bindFramebuffer(e.FRAMEBUFFER,null)}function Bt(L,E,W){if(e.bindRenderbuffer(e.RENDERBUFFER,L),E.depthBuffer){let J=E.depthTexture,st=J&&J.isDepthTexture?J.type:null,Y=v(E.stencilBuffer,st),Pt=E.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,ft=_e(E);Tt(E)?a.renderbufferStorageMultisampleEXT(e.RENDERBUFFER,ft,Y,E.width,E.height):W?e.renderbufferStorageMultisample(e.RENDERBUFFER,ft,Y,E.width,E.height):e.renderbufferStorage(e.RENDERBUFFER,Y,E.width,E.height),e.framebufferRenderbuffer(e.FRAMEBUFFER,Pt,e.RENDERBUFFER,L)}else{let J=E.textures;for(let st=0;st<J.length;st++){let Y=J[st],Pt=s.convert(Y.format,Y.colorSpace),ft=s.convert(Y.type),Et=x(Y.internalFormat,Pt,ft,Y.colorSpace),At=_e(E);W&&Tt(E)===!1?e.renderbufferStorageMultisample(e.RENDERBUFFER,At,Et,E.width,E.height):Tt(E)?a.renderbufferStorageMultisampleEXT(e.RENDERBUFFER,At,Et,E.width,E.height):e.renderbufferStorage(e.RENDERBUFFER,Et,E.width,E.height)}}e.bindRenderbuffer(e.RENDERBUFFER,null)}function It(L,E){if(E&&E.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(n.bindFramebuffer(e.FRAMEBUFFER,L),!(E.depthTexture&&E.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");let J=i.get(E.depthTexture);J.__renderTarget=E,(!J.__webglTexture||E.depthTexture.image.width!==E.width||E.depthTexture.image.height!==E.height)&&(E.depthTexture.image.width=E.width,E.depthTexture.image.height=E.height,E.depthTexture.needsUpdate=!0),z(E.depthTexture,0);let st=J.__webglTexture,Y=_e(E);if(E.depthTexture.format===vs)Tt(E)?a.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,e.DEPTH_ATTACHMENT,e.TEXTURE_2D,st,0,Y):e.framebufferTexture2D(e.FRAMEBUFFER,e.DEPTH_ATTACHMENT,e.TEXTURE_2D,st,0);else if(E.depthTexture.format===Ns)Tt(E)?a.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,e.DEPTH_STENCIL_ATTACHMENT,e.TEXTURE_2D,st,0,Y):e.framebufferTexture2D(e.FRAMEBUFFER,e.DEPTH_STENCIL_ATTACHMENT,e.TEXTURE_2D,st,0);else throw new Error("Unknown depthTexture format")}function Qt(L){let E=i.get(L),W=L.isWebGLCubeRenderTarget===!0;if(E.__boundDepthTexture!==L.depthTexture){let J=L.depthTexture;if(E.__depthDisposeCallback&&E.__depthDisposeCallback(),J){let st=()=>{delete E.__boundDepthTexture,delete E.__depthDisposeCallback,J.removeEventListener("dispose",st)};J.addEventListener("dispose",st),E.__depthDisposeCallback=st}E.__boundDepthTexture=J}if(L.depthTexture&&!E.__autoAllocateDepthBuffer){if(W)throw new Error("target.depthTexture not supported in Cube render targets");let J=L.texture.mipmaps;J&&J.length>0?It(E.__webglFramebuffer[0],L):It(E.__webglFramebuffer,L)}else if(W){E.__webglDepthbuffer=[];for(let J=0;J<6;J++)if(n.bindFramebuffer(e.FRAMEBUFFER,E.__webglFramebuffer[J]),E.__webglDepthbuffer[J]===void 0)E.__webglDepthbuffer[J]=e.createRenderbuffer(),Bt(E.__webglDepthbuffer[J],L,!1);else{let st=L.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,Y=E.__webglDepthbuffer[J];e.bindRenderbuffer(e.RENDERBUFFER,Y),e.framebufferRenderbuffer(e.FRAMEBUFFER,st,e.RENDERBUFFER,Y)}}else{let J=L.texture.mipmaps;if(J&&J.length>0?n.bindFramebuffer(e.FRAMEBUFFER,E.__webglFramebuffer[0]):n.bindFramebuffer(e.FRAMEBUFFER,E.__webglFramebuffer),E.__webglDepthbuffer===void 0)E.__webglDepthbuffer=e.createRenderbuffer(),Bt(E.__webglDepthbuffer,L,!1);else{let st=L.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,Y=E.__webglDepthbuffer;e.bindRenderbuffer(e.RENDERBUFFER,Y),e.framebufferRenderbuffer(e.FRAMEBUFFER,st,e.RENDERBUFFER,Y)}}n.bindFramebuffer(e.FRAMEBUFFER,null)}function Re(L,E,W){let J=i.get(L);E!==void 0&&yt(J.__webglFramebuffer,L,L.texture,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,0),W!==void 0&&Qt(L)}function B(L){let E=L.texture,W=i.get(L),J=i.get(E);L.addEventListener("dispose",C);let st=L.textures,Y=L.isWebGLCubeRenderTarget===!0,Pt=st.length>1;if(Pt||(J.__webglTexture===void 0&&(J.__webglTexture=e.createTexture()),J.__version=E.version,o.memory.textures++),Y){W.__webglFramebuffer=[];for(let ft=0;ft<6;ft++)if(E.mipmaps&&E.mipmaps.length>0){W.__webglFramebuffer[ft]=[];for(let Et=0;Et<E.mipmaps.length;Et++)W.__webglFramebuffer[ft][Et]=e.createFramebuffer()}else W.__webglFramebuffer[ft]=e.createFramebuffer()}else{if(E.mipmaps&&E.mipmaps.length>0){W.__webglFramebuffer=[];for(let ft=0;ft<E.mipmaps.length;ft++)W.__webglFramebuffer[ft]=e.createFramebuffer()}else W.__webglFramebuffer=e.createFramebuffer();if(Pt)for(let ft=0,Et=st.length;ft<Et;ft++){let At=i.get(st[ft]);At.__webglTexture===void 0&&(At.__webglTexture=e.createTexture(),o.memory.textures++)}if(L.samples>0&&Tt(L)===!1){W.__webglMultisampledFramebuffer=e.createFramebuffer(),W.__webglColorRenderbuffer=[],n.bindFramebuffer(e.FRAMEBUFFER,W.__webglMultisampledFramebuffer);for(let ft=0;ft<st.length;ft++){let Et=st[ft];W.__webglColorRenderbuffer[ft]=e.createRenderbuffer(),e.bindRenderbuffer(e.RENDERBUFFER,W.__webglColorRenderbuffer[ft]);let At=s.convert(Et.format,Et.colorSpace),ot=s.convert(Et.type),vt=x(Et.internalFormat,At,ot,Et.colorSpace,L.isXRRenderTarget===!0),Ft=_e(L);e.renderbufferStorageMultisample(e.RENDERBUFFER,Ft,vt,L.width,L.height),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+ft,e.RENDERBUFFER,W.__webglColorRenderbuffer[ft])}e.bindRenderbuffer(e.RENDERBUFFER,null),L.depthBuffer&&(W.__webglDepthRenderbuffer=e.createRenderbuffer(),Bt(W.__webglDepthRenderbuffer,L,!0)),n.bindFramebuffer(e.FRAMEBUFFER,null)}}if(Y){n.bindTexture(e.TEXTURE_CUBE_MAP,J.__webglTexture),rt(e.TEXTURE_CUBE_MAP,E);for(let ft=0;ft<6;ft++)if(E.mipmaps&&E.mipmaps.length>0)for(let Et=0;Et<E.mipmaps.length;Et++)yt(W.__webglFramebuffer[ft][Et],L,E,e.COLOR_ATTACHMENT0,e.TEXTURE_CUBE_MAP_POSITIVE_X+ft,Et);else yt(W.__webglFramebuffer[ft],L,E,e.COLOR_ATTACHMENT0,e.TEXTURE_CUBE_MAP_POSITIVE_X+ft,0);g(E)&&p(e.TEXTURE_CUBE_MAP),n.unbindTexture()}else if(Pt){for(let ft=0,Et=st.length;ft<Et;ft++){let At=st[ft],ot=i.get(At),vt=e.TEXTURE_2D;(L.isWebGL3DRenderTarget||L.isWebGLArrayRenderTarget)&&(vt=L.isWebGL3DRenderTarget?e.TEXTURE_3D:e.TEXTURE_2D_ARRAY),n.bindTexture(vt,ot.__webglTexture),rt(vt,At),yt(W.__webglFramebuffer,L,At,e.COLOR_ATTACHMENT0+ft,vt,0),g(At)&&p(vt)}n.unbindTexture()}else{let ft=e.TEXTURE_2D;if((L.isWebGL3DRenderTarget||L.isWebGLArrayRenderTarget)&&(ft=L.isWebGL3DRenderTarget?e.TEXTURE_3D:e.TEXTURE_2D_ARRAY),n.bindTexture(ft,J.__webglTexture),rt(ft,E),E.mipmaps&&E.mipmaps.length>0)for(let Et=0;Et<E.mipmaps.length;Et++)yt(W.__webglFramebuffer[Et],L,E,e.COLOR_ATTACHMENT0,ft,Et);else yt(W.__webglFramebuffer,L,E,e.COLOR_ATTACHMENT0,ft,0);g(E)&&p(ft),n.unbindTexture()}L.depthBuffer&&Qt(L)}function xe(L){let E=L.textures;for(let W=0,J=E.length;W<J;W++){let st=E[W];if(g(st)){let Y=b(L),Pt=i.get(st).__webglTexture;n.bindTexture(Y,Pt),p(Y),n.unbindTexture()}}}let Wt=[],kt=[];function wt(L){if(L.samples>0){if(Tt(L)===!1){let E=L.textures,W=L.width,J=L.height,st=e.COLOR_BUFFER_BIT,Y=L.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,Pt=i.get(L),ft=E.length>1;if(ft)for(let At=0;At<E.length;At++)n.bindFramebuffer(e.FRAMEBUFFER,Pt.__webglMultisampledFramebuffer),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+At,e.RENDERBUFFER,null),n.bindFramebuffer(e.FRAMEBUFFER,Pt.__webglFramebuffer),e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0+At,e.TEXTURE_2D,null,0);n.bindFramebuffer(e.READ_FRAMEBUFFER,Pt.__webglMultisampledFramebuffer);let Et=L.texture.mipmaps;Et&&Et.length>0?n.bindFramebuffer(e.DRAW_FRAMEBUFFER,Pt.__webglFramebuffer[0]):n.bindFramebuffer(e.DRAW_FRAMEBUFFER,Pt.__webglFramebuffer);for(let At=0;At<E.length;At++){if(L.resolveDepthBuffer&&(L.depthBuffer&&(st|=e.DEPTH_BUFFER_BIT),L.stencilBuffer&&L.resolveStencilBuffer&&(st|=e.STENCIL_BUFFER_BIT)),ft){e.framebufferRenderbuffer(e.READ_FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.RENDERBUFFER,Pt.__webglColorRenderbuffer[At]);let ot=i.get(E[At]).__webglTexture;e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,ot,0)}e.blitFramebuffer(0,0,W,J,0,0,W,J,st,e.NEAREST),c===!0&&(Wt.length=0,kt.length=0,Wt.push(e.COLOR_ATTACHMENT0+At),L.depthBuffer&&L.resolveDepthBuffer===!1&&(Wt.push(Y),kt.push(Y),e.invalidateFramebuffer(e.DRAW_FRAMEBUFFER,kt)),e.invalidateFramebuffer(e.READ_FRAMEBUFFER,Wt))}if(n.bindFramebuffer(e.READ_FRAMEBUFFER,null),n.bindFramebuffer(e.DRAW_FRAMEBUFFER,null),ft)for(let At=0;At<E.length;At++){n.bindFramebuffer(e.FRAMEBUFFER,Pt.__webglMultisampledFramebuffer),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+At,e.RENDERBUFFER,Pt.__webglColorRenderbuffer[At]);let ot=i.get(E[At]).__webglTexture;n.bindFramebuffer(e.FRAMEBUFFER,Pt.__webglFramebuffer),e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0+At,e.TEXTURE_2D,ot,0)}n.bindFramebuffer(e.DRAW_FRAMEBUFFER,Pt.__webglMultisampledFramebuffer)}else if(L.depthBuffer&&L.resolveDepthBuffer===!1&&c){let E=L.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT;e.invalidateFramebuffer(e.DRAW_FRAMEBUFFER,[E])}}}function _e(L){return Math.min(r.maxSamples,L.samples)}function Tt(L){let E=i.get(L);return L.samples>0&&t.has("WEBGL_multisampled_render_to_texture")===!0&&E.__useRenderToTexture!==!1}function qt(L){let E=o.render.frame;u.get(L)!==E&&(u.set(L,E),L.update())}function Ie(L,E){let W=L.colorSpace,J=L.format,st=L.type;return L.isCompressedTexture===!0||L.isVideoTexture===!0||W!==Ar&&W!==Ni&&(ie.getTransfer(W)===ae?(J!==kn||st!==ti)&&console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):console.error("THREE.WebGLTextures: Unsupported texture color space:",W)),E}function Ae(L){return typeof HTMLImageElement!="undefined"&&L instanceof HTMLImageElement?(l.width=L.naturalWidth||L.width,l.height=L.naturalHeight||L.height):typeof VideoFrame!="undefined"&&L instanceof VideoFrame?(l.width=L.displayWidth,l.height=L.displayHeight):(l.width=L.width,l.height=L.height),l}this.allocateTextureUnit=N,this.resetTextureUnits=V,this.setTexture2D=z,this.setTexture2DArray=G,this.setTexture3D=K,this.setTextureCube=j,this.rebindTextures=Re,this.setupRenderTarget=B,this.updateRenderTargetMipmap=xe,this.updateMultisampleRenderTarget=wt,this.setupDepthRenderbuffer=Qt,this.setupFrameBufferTexture=yt,this.useMultisampledRTT=Tt}function RE(e,t){function n(i,r=Ni){let s,o=ie.getTransfer(r);if(i===ti)return e.UNSIGNED_BYTE;if(i===Ml)return e.UNSIGNED_SHORT_4_4_4_4;if(i===Sl)return e.UNSIGNED_SHORT_5_5_5_1;if(i===Mf)return e.UNSIGNED_INT_5_9_9_9_REV;if(i===Sf)return e.UNSIGNED_INT_10F_11F_11F_REV;if(i===xf)return e.BYTE;if(i===bf)return e.SHORT;if(i===Ls)return e.UNSIGNED_SHORT;if(i===bl)return e.INT;if(i===tr)return e.UNSIGNED_INT;if(i===mi)return e.FLOAT;if(i===zn)return e.HALF_FLOAT;if(i===wf)return e.ALPHA;if(i===Ef)return e.RGB;if(i===kn)return e.RGBA;if(i===vs)return e.DEPTH_COMPONENT;if(i===Ns)return e.DEPTH_STENCIL;if(i===Tf)return e.RED;if(i===wl)return e.RED_INTEGER;if(i===Af)return e.RG;if(i===El)return e.RG_INTEGER;if(i===Tl)return e.RGBA_INTEGER;if(i===ia||i===ra||i===sa||i===oa)if(o===ae)if(s=t.get("WEBGL_compressed_texture_s3tc_srgb"),s!==null){if(i===ia)return s.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(i===ra)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(i===sa)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(i===oa)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(s=t.get("WEBGL_compressed_texture_s3tc"),s!==null){if(i===ia)return s.COMPRESSED_RGB_S3TC_DXT1_EXT;if(i===ra)return s.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(i===sa)return s.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(i===oa)return s.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(i===Al||i===Cl||i===Rl||i===Pl)if(s=t.get("WEBGL_compressed_texture_pvrtc"),s!==null){if(i===Al)return s.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(i===Cl)return s.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(i===Rl)return s.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(i===Pl)return s.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(i===Il||i===Dl||i===Ll)if(s=t.get("WEBGL_compressed_texture_etc"),s!==null){if(i===Il||i===Dl)return o===ae?s.COMPRESSED_SRGB8_ETC2:s.COMPRESSED_RGB8_ETC2;if(i===Ll)return o===ae?s.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:s.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(i===Ol||i===Nl||i===Fl||i===Ul||i===zl||i===kl||i===Bl||i===Vl||i===Hl||i===Gl||i===Wl||i===jl||i===ql||i===Xl)if(s=t.get("WEBGL_compressed_texture_astc"),s!==null){if(i===Ol)return o===ae?s.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:s.COMPRESSED_RGBA_ASTC_4x4_KHR;if(i===Nl)return o===ae?s.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:s.COMPRESSED_RGBA_ASTC_5x4_KHR;if(i===Fl)return o===ae?s.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:s.COMPRESSED_RGBA_ASTC_5x5_KHR;if(i===Ul)return o===ae?s.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:s.COMPRESSED_RGBA_ASTC_6x5_KHR;if(i===zl)return o===ae?s.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:s.COMPRESSED_RGBA_ASTC_6x6_KHR;if(i===kl)return o===ae?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:s.COMPRESSED_RGBA_ASTC_8x5_KHR;if(i===Bl)return o===ae?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:s.COMPRESSED_RGBA_ASTC_8x6_KHR;if(i===Vl)return o===ae?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:s.COMPRESSED_RGBA_ASTC_8x8_KHR;if(i===Hl)return o===ae?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:s.COMPRESSED_RGBA_ASTC_10x5_KHR;if(i===Gl)return o===ae?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:s.COMPRESSED_RGBA_ASTC_10x6_KHR;if(i===Wl)return o===ae?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:s.COMPRESSED_RGBA_ASTC_10x8_KHR;if(i===jl)return o===ae?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:s.COMPRESSED_RGBA_ASTC_10x10_KHR;if(i===ql)return o===ae?s.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:s.COMPRESSED_RGBA_ASTC_12x10_KHR;if(i===Xl)return o===ae?s.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:s.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(i===$l||i===Yl||i===Zl)if(s=t.get("EXT_texture_compression_bptc"),s!==null){if(i===$l)return o===ae?s.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:s.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(i===Yl)return s.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(i===Zl)return s.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(i===Kl||i===Jl||i===Ql||i===th)if(s=t.get("EXT_texture_compression_rgtc"),s!==null){if(i===Kl)return s.COMPRESSED_RED_RGTC1_EXT;if(i===Jl)return s.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(i===Ql)return s.COMPRESSED_RED_GREEN_RGTC2_EXT;if(i===th)return s.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return i===Os?e.UNSIGNED_INT_24_8:e[i]!==void 0?e[i]:null}return{convert:n}}var PE=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,IE=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`,Yf=class{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(t,n){if(this.texture===null){let i=new Bo(t.texture);(t.depthNear!==n.depthNear||t.depthFar!==n.depthFar)&&(this.depthNear=t.depthNear,this.depthFar=t.depthFar),this.texture=i}}getMesh(t){if(this.texture!==null&&this.mesh===null){let n=t.cameras[0].viewport,i=new Le({vertexShader:PE,fragmentShader:IE,uniforms:{depthColor:{value:this.texture},depthWidth:{value:n.z},depthHeight:{value:n.w}}});this.mesh=new we(new Ho(20,20),i)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}},Zf=class extends ai{constructor(t,n){super();let i=this,r=null,s=1,o=null,a="local-floor",c=1,l=null,u=null,h=null,d=null,f=null,m=null,_=typeof XRWebGLBinding!="undefined",g=new Yf,p={},b=n.getContextAttributes(),x=null,v=null,M=[],S=[],C=new it,P=null,T=new Ge;T.viewport=new de;let w=new Ge;w.viewport=new de;let R=[T,w],V=new nl,N=null,k=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(X){let tt=M[X];return tt===void 0&&(tt=new Es,M[X]=tt),tt.getTargetRaySpace()},this.getControllerGrip=function(X){let tt=M[X];return tt===void 0&&(tt=new Es,M[X]=tt),tt.getGripSpace()},this.getHand=function(X){let tt=M[X];return tt===void 0&&(tt=new Es,M[X]=tt),tt.getHandSpace()};function z(X){let tt=S.indexOf(X.inputSource);if(tt===-1)return;let yt=M[tt];yt!==void 0&&(yt.update(X.inputSource,X.frame,l||o),yt.dispatchEvent({type:X.type,data:X.inputSource}))}function G(){r.removeEventListener("select",z),r.removeEventListener("selectstart",z),r.removeEventListener("selectend",z),r.removeEventListener("squeeze",z),r.removeEventListener("squeezestart",z),r.removeEventListener("squeezeend",z),r.removeEventListener("end",G),r.removeEventListener("inputsourceschange",K);for(let X=0;X<M.length;X++){let tt=S[X];tt!==null&&(S[X]=null,M[X].disconnect(tt))}N=null,k=null,g.reset();for(let X in p)delete p[X];t.setRenderTarget(x),f=null,d=null,h=null,r=null,v=null,Lt.stop(),i.isPresenting=!1,t.setPixelRatio(P),t.setSize(C.width,C.height,!1),i.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(X){s=X,i.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(X){a=X,i.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return l||o},this.setReferenceSpace=function(X){l=X},this.getBaseLayer=function(){return d!==null?d:f},this.getBinding=function(){return h===null&&_&&(h=new XRWebGLBinding(r,n)),h},this.getFrame=function(){return m},this.getSession=function(){return r},this.setSession=async function(X){if(r=X,r!==null){if(x=t.getRenderTarget(),r.addEventListener("select",z),r.addEventListener("selectstart",z),r.addEventListener("selectend",z),r.addEventListener("squeeze",z),r.addEventListener("squeezestart",z),r.addEventListener("squeezeend",z),r.addEventListener("end",G),r.addEventListener("inputsourceschange",K),b.xrCompatible!==!0&&await n.makeXRCompatible(),P=t.getPixelRatio(),t.getSize(C),_&&"createProjectionLayer"in XRWebGLBinding.prototype){let yt=null,Bt=null,It=null;b.depth&&(It=b.stencil?n.DEPTH24_STENCIL8:n.DEPTH_COMPONENT24,yt=b.stencil?Ns:vs,Bt=b.stencil?Os:tr);let Qt={colorFormat:n.RGBA8,depthFormat:It,scaleFactor:s};h=this.getBinding(),d=h.createProjectionLayer(Qt),r.updateRenderState({layers:[d]}),t.setPixelRatio(1),t.setSize(d.textureWidth,d.textureHeight,!1),v=new Ke(d.textureWidth,d.textureHeight,{format:kn,type:ti,depthTexture:new ko(d.textureWidth,d.textureHeight,Bt,void 0,void 0,void 0,void 0,void 0,void 0,yt),stencilBuffer:b.stencil,colorSpace:t.outputColorSpace,samples:b.antialias?4:0,resolveDepthBuffer:d.ignoreDepthValues===!1,resolveStencilBuffer:d.ignoreDepthValues===!1})}else{let yt={antialias:b.antialias,alpha:!0,depth:b.depth,stencil:b.stencil,framebufferScaleFactor:s};f=new XRWebGLLayer(r,n,yt),r.updateRenderState({baseLayer:f}),t.setPixelRatio(1),t.setSize(f.framebufferWidth,f.framebufferHeight,!1),v=new Ke(f.framebufferWidth,f.framebufferHeight,{format:kn,type:ti,colorSpace:t.outputColorSpace,stencilBuffer:b.stencil,resolveDepthBuffer:f.ignoreDepthValues===!1,resolveStencilBuffer:f.ignoreDepthValues===!1})}v.isXRRenderTarget=!0,this.setFoveation(c),l=null,o=await r.requestReferenceSpace(a),Lt.setContext(r),Lt.start(),i.isPresenting=!0,i.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(r!==null)return r.environmentBlendMode},this.getDepthTexture=function(){return g.getDepthTexture()};function K(X){for(let tt=0;tt<X.removed.length;tt++){let yt=X.removed[tt],Bt=S.indexOf(yt);Bt>=0&&(S[Bt]=null,M[Bt].disconnect(yt))}for(let tt=0;tt<X.added.length;tt++){let yt=X.added[tt],Bt=S.indexOf(yt);if(Bt===-1){for(let Qt=0;Qt<M.length;Qt++)if(Qt>=S.length){S.push(yt),Bt=Qt;break}else if(S[Qt]===null){S[Qt]=yt,Bt=Qt;break}if(Bt===-1)break}let It=M[Bt];It&&It.connect(yt)}}let j=new I,at=new I;function _t(X,tt,yt){j.setFromMatrixPosition(tt.matrixWorld),at.setFromMatrixPosition(yt.matrixWorld);let Bt=j.distanceTo(at),It=tt.projectionMatrix.elements,Qt=yt.projectionMatrix.elements,Re=It[14]/(It[10]-1),B=It[14]/(It[10]+1),xe=(It[9]+1)/It[5],Wt=(It[9]-1)/It[5],kt=(It[8]-1)/It[0],wt=(Qt[8]+1)/Qt[0],_e=Re*kt,Tt=Re*wt,qt=Bt/(-kt+wt),Ie=qt*-kt;if(tt.matrixWorld.decompose(X.position,X.quaternion,X.scale),X.translateX(Ie),X.translateZ(qt),X.matrixWorld.compose(X.position,X.quaternion,X.scale),X.matrixWorldInverse.copy(X.matrixWorld).invert(),It[10]===-1)X.projectionMatrix.copy(tt.projectionMatrix),X.projectionMatrixInverse.copy(tt.projectionMatrixInverse);else{let Ae=Re+qt,L=B+qt,E=_e-Ie,W=Tt+(Bt-Ie),J=xe*B/L*Ae,st=Wt*B/L*Ae;X.projectionMatrix.makePerspective(E,W,J,st,Ae,L),X.projectionMatrixInverse.copy(X.projectionMatrix).invert()}}function $(X,tt){tt===null?X.matrixWorld.copy(X.matrix):X.matrixWorld.multiplyMatrices(tt.matrixWorld,X.matrix),X.matrixWorldInverse.copy(X.matrixWorld).invert()}this.updateCamera=function(X){if(r===null)return;let tt=X.near,yt=X.far;g.texture!==null&&(g.depthNear>0&&(tt=g.depthNear),g.depthFar>0&&(yt=g.depthFar)),V.near=w.near=T.near=tt,V.far=w.far=T.far=yt,(N!==V.near||k!==V.far)&&(r.updateRenderState({depthNear:V.near,depthFar:V.far}),N=V.near,k=V.far),V.layers.mask=X.layers.mask|6,T.layers.mask=V.layers.mask&3,w.layers.mask=V.layers.mask&5;let Bt=X.parent,It=V.cameras;$(V,Bt);for(let Qt=0;Qt<It.length;Qt++)$(It[Qt],Bt);It.length===2?_t(V,T,w):V.projectionMatrix.copy(T.projectionMatrix),rt(X,V,Bt)};function rt(X,tt,yt){yt===null?X.matrix.copy(tt.matrixWorld):(X.matrix.copy(yt.matrixWorld),X.matrix.invert(),X.matrix.multiply(tt.matrixWorld)),X.matrix.decompose(X.position,X.quaternion,X.scale),X.updateMatrixWorld(!0),X.projectionMatrix.copy(tt.projectionMatrix),X.projectionMatrixInverse.copy(tt.projectionMatrixInverse),X.isPerspectiveCamera&&(X.fov=ys*2*Math.atan(1/X.projectionMatrix.elements[5]),X.zoom=1)}this.getCamera=function(){return V},this.getFoveation=function(){if(!(d===null&&f===null))return c},this.setFoveation=function(X){c=X,d!==null&&(d.fixedFoveation=X),f!==null&&f.fixedFoveation!==void 0&&(f.fixedFoveation=X)},this.hasDepthSensing=function(){return g.texture!==null},this.getDepthSensingMesh=function(){return g.getMesh(V)},this.getCameraTexture=function(X){return p[X]};let pt=null;function zt(X,tt){if(u=tt.getViewerPose(l||o),m=tt,u!==null){let yt=u.views;f!==null&&(t.setRenderTargetFramebuffer(v,f.framebuffer),t.setRenderTarget(v));let Bt=!1;yt.length!==V.cameras.length&&(V.cameras.length=0,Bt=!0);for(let B=0;B<yt.length;B++){let xe=yt[B],Wt=null;if(f!==null)Wt=f.getViewport(xe);else{let wt=h.getViewSubImage(d,xe);Wt=wt.viewport,B===0&&(t.setRenderTargetTextures(v,wt.colorTexture,wt.depthStencilTexture),t.setRenderTarget(v))}let kt=R[B];kt===void 0&&(kt=new Ge,kt.layers.enable(B),kt.viewport=new de,R[B]=kt),kt.matrix.fromArray(xe.transform.matrix),kt.matrix.decompose(kt.position,kt.quaternion,kt.scale),kt.projectionMatrix.fromArray(xe.projectionMatrix),kt.projectionMatrixInverse.copy(kt.projectionMatrix).invert(),kt.viewport.set(Wt.x,Wt.y,Wt.width,Wt.height),B===0&&(V.matrix.copy(kt.matrix),V.matrix.decompose(V.position,V.quaternion,V.scale)),Bt===!0&&V.cameras.push(kt)}let It=r.enabledFeatures;if(It&&It.includes("depth-sensing")&&r.depthUsage=="gpu-optimized"&&_){h=i.getBinding();let B=h.getDepthInformation(yt[0]);B&&B.isValid&&B.texture&&g.init(B,r.renderState)}if(It&&It.includes("camera-access")&&_){t.state.unbindTexture(),h=i.getBinding();for(let B=0;B<yt.length;B++){let xe=yt[B].camera;if(xe){let Wt=p[xe];Wt||(Wt=new Bo,p[xe]=Wt);let kt=h.getCameraImage(xe);Wt.sourceTexture=kt}}}}for(let yt=0;yt<M.length;yt++){let Bt=S[yt],It=M[yt];Bt!==null&&It!==void 0&&It.update(Bt,tt,l||o)}pt&&pt(X,tt),tt.detectedPlanes&&i.dispatchEvent({type:"planesdetected",data:tt}),m=null}let Lt=new zg;Lt.setAnimationLoop(zt),this.setAnimationLoop=function(X){pt=X},this.dispose=function(){}}},Fr=new On,DE=new Vt;function LE(e,t){function n(g,p){g.matrixAutoUpdate===!0&&g.updateMatrix(),p.value.copy(g.matrix)}function i(g,p){p.color.getRGB(g.fogColor.value,Df(e)),p.isFog?(g.fogNear.value=p.near,g.fogFar.value=p.far):p.isFogExp2&&(g.fogDensity.value=p.density)}function r(g,p,b,x,v){p.isMeshBasicMaterial||p.isMeshLambertMaterial?s(g,p):p.isMeshToonMaterial?(s(g,p),h(g,p)):p.isMeshPhongMaterial?(s(g,p),u(g,p)):p.isMeshStandardMaterial?(s(g,p),d(g,p),p.isMeshPhysicalMaterial&&f(g,p,v)):p.isMeshMatcapMaterial?(s(g,p),m(g,p)):p.isMeshDepthMaterial?s(g,p):p.isMeshDistanceMaterial?(s(g,p),_(g,p)):p.isMeshNormalMaterial?s(g,p):p.isLineBasicMaterial?(o(g,p),p.isLineDashedMaterial&&a(g,p)):p.isPointsMaterial?c(g,p,b,x):p.isSpriteMaterial?l(g,p):p.isShadowMaterial?(g.color.value.copy(p.color),g.opacity.value=p.opacity):p.isShaderMaterial&&(p.uniformsNeedUpdate=!1)}function s(g,p){g.opacity.value=p.opacity,p.color&&g.diffuse.value.copy(p.color),p.emissive&&g.emissive.value.copy(p.emissive).multiplyScalar(p.emissiveIntensity),p.map&&(g.map.value=p.map,n(p.map,g.mapTransform)),p.alphaMap&&(g.alphaMap.value=p.alphaMap,n(p.alphaMap,g.alphaMapTransform)),p.bumpMap&&(g.bumpMap.value=p.bumpMap,n(p.bumpMap,g.bumpMapTransform),g.bumpScale.value=p.bumpScale,p.side===We&&(g.bumpScale.value*=-1)),p.normalMap&&(g.normalMap.value=p.normalMap,n(p.normalMap,g.normalMapTransform),g.normalScale.value.copy(p.normalScale),p.side===We&&g.normalScale.value.negate()),p.displacementMap&&(g.displacementMap.value=p.displacementMap,n(p.displacementMap,g.displacementMapTransform),g.displacementScale.value=p.displacementScale,g.displacementBias.value=p.displacementBias),p.emissiveMap&&(g.emissiveMap.value=p.emissiveMap,n(p.emissiveMap,g.emissiveMapTransform)),p.specularMap&&(g.specularMap.value=p.specularMap,n(p.specularMap,g.specularMapTransform)),p.alphaTest>0&&(g.alphaTest.value=p.alphaTest);let b=t.get(p),x=b.envMap,v=b.envMapRotation;x&&(g.envMap.value=x,Fr.copy(v),Fr.x*=-1,Fr.y*=-1,Fr.z*=-1,x.isCubeTexture&&x.isRenderTargetTexture===!1&&(Fr.y*=-1,Fr.z*=-1),g.envMapRotation.value.setFromMatrix4(DE.makeRotationFromEuler(Fr)),g.flipEnvMap.value=x.isCubeTexture&&x.isRenderTargetTexture===!1?-1:1,g.reflectivity.value=p.reflectivity,g.ior.value=p.ior,g.refractionRatio.value=p.refractionRatio),p.lightMap&&(g.lightMap.value=p.lightMap,g.lightMapIntensity.value=p.lightMapIntensity,n(p.lightMap,g.lightMapTransform)),p.aoMap&&(g.aoMap.value=p.aoMap,g.aoMapIntensity.value=p.aoMapIntensity,n(p.aoMap,g.aoMapTransform))}function o(g,p){g.diffuse.value.copy(p.color),g.opacity.value=p.opacity,p.map&&(g.map.value=p.map,n(p.map,g.mapTransform))}function a(g,p){g.dashSize.value=p.dashSize,g.totalSize.value=p.dashSize+p.gapSize,g.scale.value=p.scale}function c(g,p,b,x){g.diffuse.value.copy(p.color),g.opacity.value=p.opacity,g.size.value=p.size*b,g.scale.value=x*.5,p.map&&(g.map.value=p.map,n(p.map,g.uvTransform)),p.alphaMap&&(g.alphaMap.value=p.alphaMap,n(p.alphaMap,g.alphaMapTransform)),p.alphaTest>0&&(g.alphaTest.value=p.alphaTest)}function l(g,p){g.diffuse.value.copy(p.color),g.opacity.value=p.opacity,g.rotation.value=p.rotation,p.map&&(g.map.value=p.map,n(p.map,g.mapTransform)),p.alphaMap&&(g.alphaMap.value=p.alphaMap,n(p.alphaMap,g.alphaMapTransform)),p.alphaTest>0&&(g.alphaTest.value=p.alphaTest)}function u(g,p){g.specular.value.copy(p.specular),g.shininess.value=Math.max(p.shininess,1e-4)}function h(g,p){p.gradientMap&&(g.gradientMap.value=p.gradientMap)}function d(g,p){g.metalness.value=p.metalness,p.metalnessMap&&(g.metalnessMap.value=p.metalnessMap,n(p.metalnessMap,g.metalnessMapTransform)),g.roughness.value=p.roughness,p.roughnessMap&&(g.roughnessMap.value=p.roughnessMap,n(p.roughnessMap,g.roughnessMapTransform)),p.envMap&&(g.envMapIntensity.value=p.envMapIntensity)}function f(g,p,b){g.ior.value=p.ior,p.sheen>0&&(g.sheenColor.value.copy(p.sheenColor).multiplyScalar(p.sheen),g.sheenRoughness.value=p.sheenRoughness,p.sheenColorMap&&(g.sheenColorMap.value=p.sheenColorMap,n(p.sheenColorMap,g.sheenColorMapTransform)),p.sheenRoughnessMap&&(g.sheenRoughnessMap.value=p.sheenRoughnessMap,n(p.sheenRoughnessMap,g.sheenRoughnessMapTransform))),p.clearcoat>0&&(g.clearcoat.value=p.clearcoat,g.clearcoatRoughness.value=p.clearcoatRoughness,p.clearcoatMap&&(g.clearcoatMap.value=p.clearcoatMap,n(p.clearcoatMap,g.clearcoatMapTransform)),p.clearcoatRoughnessMap&&(g.clearcoatRoughnessMap.value=p.clearcoatRoughnessMap,n(p.clearcoatRoughnessMap,g.clearcoatRoughnessMapTransform)),p.clearcoatNormalMap&&(g.clearcoatNormalMap.value=p.clearcoatNormalMap,n(p.clearcoatNormalMap,g.clearcoatNormalMapTransform),g.clearcoatNormalScale.value.copy(p.clearcoatNormalScale),p.side===We&&g.clearcoatNormalScale.value.negate())),p.dispersion>0&&(g.dispersion.value=p.dispersion),p.iridescence>0&&(g.iridescence.value=p.iridescence,g.iridescenceIOR.value=p.iridescenceIOR,g.iridescenceThicknessMinimum.value=p.iridescenceThicknessRange[0],g.iridescenceThicknessMaximum.value=p.iridescenceThicknessRange[1],p.iridescenceMap&&(g.iridescenceMap.value=p.iridescenceMap,n(p.iridescenceMap,g.iridescenceMapTransform)),p.iridescenceThicknessMap&&(g.iridescenceThicknessMap.value=p.iridescenceThicknessMap,n(p.iridescenceThicknessMap,g.iridescenceThicknessMapTransform))),p.transmission>0&&(g.transmission.value=p.transmission,g.transmissionSamplerMap.value=b.texture,g.transmissionSamplerSize.value.set(b.width,b.height),p.transmissionMap&&(g.transmissionMap.value=p.transmissionMap,n(p.transmissionMap,g.transmissionMapTransform)),g.thickness.value=p.thickness,p.thicknessMap&&(g.thicknessMap.value=p.thicknessMap,n(p.thicknessMap,g.thicknessMapTransform)),g.attenuationDistance.value=p.attenuationDistance,g.attenuationColor.value.copy(p.attenuationColor)),p.anisotropy>0&&(g.anisotropyVector.value.set(p.anisotropy*Math.cos(p.anisotropyRotation),p.anisotropy*Math.sin(p.anisotropyRotation)),p.anisotropyMap&&(g.anisotropyMap.value=p.anisotropyMap,n(p.anisotropyMap,g.anisotropyMapTransform))),g.specularIntensity.value=p.specularIntensity,g.specularColor.value.copy(p.specularColor),p.specularColorMap&&(g.specularColorMap.value=p.specularColorMap,n(p.specularColorMap,g.specularColorMapTransform)),p.specularIntensityMap&&(g.specularIntensityMap.value=p.specularIntensityMap,n(p.specularIntensityMap,g.specularIntensityMapTransform))}function m(g,p){p.matcap&&(g.matcap.value=p.matcap)}function _(g,p){let b=t.get(p).light;g.referencePosition.value.setFromMatrixPosition(b.matrixWorld),g.nearDistance.value=b.shadow.camera.near,g.farDistance.value=b.shadow.camera.far}return{refreshFogUniforms:i,refreshMaterialUniforms:r}}function OE(e,t,n,i){let r={},s={},o=[],a=e.getParameter(e.MAX_UNIFORM_BUFFER_BINDINGS);function c(b,x){let v=x.program;i.uniformBlockBinding(b,v)}function l(b,x){let v=r[b.id];v===void 0&&(m(b),v=u(b),r[b.id]=v,b.addEventListener("dispose",g));let M=x.program;i.updateUBOMapping(b,M);let S=t.render.frame;s[b.id]!==S&&(d(b),s[b.id]=S)}function u(b){let x=h();b.__bindingPointIndex=x;let v=e.createBuffer(),M=b.__size,S=b.usage;return e.bindBuffer(e.UNIFORM_BUFFER,v),e.bufferData(e.UNIFORM_BUFFER,M,S),e.bindBuffer(e.UNIFORM_BUFFER,null),e.bindBufferBase(e.UNIFORM_BUFFER,x,v),v}function h(){for(let b=0;b<a;b++)if(o.indexOf(b)===-1)return o.push(b),b;return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function d(b){let x=r[b.id],v=b.uniforms,M=b.__cache;e.bindBuffer(e.UNIFORM_BUFFER,x);for(let S=0,C=v.length;S<C;S++){let P=Array.isArray(v[S])?v[S]:[v[S]];for(let T=0,w=P.length;T<w;T++){let R=P[T];if(f(R,S,T,M)===!0){let V=R.__offset,N=Array.isArray(R.value)?R.value:[R.value],k=0;for(let z=0;z<N.length;z++){let G=N[z],K=_(G);typeof G=="number"||typeof G=="boolean"?(R.__data[0]=G,e.bufferSubData(e.UNIFORM_BUFFER,V+k,R.__data)):G.isMatrix3?(R.__data[0]=G.elements[0],R.__data[1]=G.elements[1],R.__data[2]=G.elements[2],R.__data[3]=0,R.__data[4]=G.elements[3],R.__data[5]=G.elements[4],R.__data[6]=G.elements[5],R.__data[7]=0,R.__data[8]=G.elements[6],R.__data[9]=G.elements[7],R.__data[10]=G.elements[8],R.__data[11]=0):(G.toArray(R.__data,k),k+=K.storage/Float32Array.BYTES_PER_ELEMENT)}e.bufferSubData(e.UNIFORM_BUFFER,V,R.__data)}}}e.bindBuffer(e.UNIFORM_BUFFER,null)}function f(b,x,v,M){let S=b.value,C=x+"_"+v;if(M[C]===void 0)return typeof S=="number"||typeof S=="boolean"?M[C]=S:M[C]=S.clone(),!0;{let P=M[C];if(typeof S=="number"||typeof S=="boolean"){if(P!==S)return M[C]=S,!0}else if(P.equals(S)===!1)return P.copy(S),!0}return!1}function m(b){let x=b.uniforms,v=0,M=16;for(let C=0,P=x.length;C<P;C++){let T=Array.isArray(x[C])?x[C]:[x[C]];for(let w=0,R=T.length;w<R;w++){let V=T[w],N=Array.isArray(V.value)?V.value:[V.value];for(let k=0,z=N.length;k<z;k++){let G=N[k],K=_(G),j=v%M,at=j%K.boundary,_t=j+at;v+=at,_t!==0&&M-_t<K.storage&&(v+=M-_t),V.__data=new Float32Array(K.storage/Float32Array.BYTES_PER_ELEMENT),V.__offset=v,v+=K.storage}}}let S=v%M;return S>0&&(v+=M-S),b.__size=v,b.__cache={},this}function _(b){let x={boundary:0,storage:0};return typeof b=="number"||typeof b=="boolean"?(x.boundary=4,x.storage=4):b.isVector2?(x.boundary=8,x.storage=8):b.isVector3||b.isColor?(x.boundary=16,x.storage=12):b.isVector4?(x.boundary=16,x.storage=16):b.isMatrix3?(x.boundary=48,x.storage=48):b.isMatrix4?(x.boundary=64,x.storage=64):b.isTexture?console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group."):console.warn("THREE.WebGLRenderer: Unsupported uniform value type.",b),x}function g(b){let x=b.target;x.removeEventListener("dispose",g);let v=o.indexOf(x.__bindingPointIndex);o.splice(v,1),e.deleteBuffer(r[x.id]),delete r[x.id],delete s[x.id]}function p(){for(let b in r)e.deleteBuffer(r[b]);o=[],r={},s={}}return{bind:c,update:l,dispose:p}}var oh=class{constructor(t={}){let{canvas:n=hg(),context:i=null,depth:r=!0,stencil:s=!1,alpha:o=!1,antialias:a=!1,premultipliedAlpha:c=!0,preserveDrawingBuffer:l=!1,powerPreference:u="default",failIfMajorPerformanceCaveat:h=!1,reversedDepthBuffer:d=!1}=t;this.isWebGLRenderer=!0;let f;if(i!==null){if(typeof WebGLRenderingContext!="undefined"&&i instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");f=i.getContextAttributes().alpha}else f=o;let m=new Uint32Array(4),_=new Int32Array(4),g=null,p=null,b=[],x=[];this.domElement=n,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=Oi,this.toneMappingExposure=1,this.transmissionResolutionScale=1;let v=this,M=!1;this._outputColorSpace=He;let S=0,C=0,P=null,T=-1,w=null,R=new de,V=new de,N=null,k=new Ot(0),z=0,G=n.width,K=n.height,j=1,at=null,_t=null,$=new de(0,0,G,K),rt=new de(0,0,G,K),pt=!1,zt=new Ts,Lt=!1,X=!1,tt=new Vt,yt=new I,Bt=new de,It={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},Qt=!1;function Re(){return P===null?j:1}let B=i;function xe(y,A){return n.getContext(y,A)}try{let y={alpha:!0,depth:r,stencil:s,antialias:a,premultipliedAlpha:c,preserveDrawingBuffer:l,powerPreference:u,failIfMajorPerformanceCaveat:h};if("setAttribute"in n&&n.setAttribute("data-engine",`three.js r${"180"}`),n.addEventListener("webglcontextlost",dt,!1),n.addEventListener("webglcontextrestored",xt,!1),n.addEventListener("webglcontextcreationerror",lt,!1),B===null){let A="webgl2";if(B=xe(A,y),B===null)throw xe(A)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(y){throw console.error("THREE.WebGLRenderer: "+y.message),y}let Wt,kt,wt,_e,Tt,qt,Ie,Ae,L,E,W,J,st,Y,Pt,ft,Et,At,ot,vt,Ft,Mt,mt,jt;function H(){Wt=new JS(B),Wt.init(),Mt=new RE(B,Wt),kt=new jS(B,Wt,t,Mt),wt=new AE(B,Wt),kt.reversedDepthBuffer&&d&&wt.buffers.depth.setReversed(!0),_e=new ew(B),Tt=new pE,qt=new CE(B,Wt,wt,Tt,kt,Mt,_e),Ie=new XS(v),Ae=new KS(v),L=new a1(B),mt=new GS(B,L),E=new QS(B,L,_e,mt),W=new iw(B,E,L,_e),ot=new nw(B,kt,qt),ft=new qS(Tt),J=new dE(v,Ie,Ae,Wt,kt,mt,ft),st=new LE(v,Tt),Y=new gE,Pt=new ME(Wt),At=new HS(v,Ie,Ae,wt,W,f,c),Et=new EE(v,W,kt),jt=new OE(B,_e,kt,wt),vt=new WS(B,Wt,_e),Ft=new tw(B,Wt,_e),_e.programs=J.programs,v.capabilities=kt,v.extensions=Wt,v.properties=Tt,v.renderLists=Y,v.shadowMap=Et,v.state=wt,v.info=_e}H();let ht=new Zf(v,B);this.xr=ht,this.getContext=function(){return B},this.getContextAttributes=function(){return B.getContextAttributes()},this.forceContextLoss=function(){let y=Wt.get("WEBGL_lose_context");y&&y.loseContext()},this.forceContextRestore=function(){let y=Wt.get("WEBGL_lose_context");y&&y.restoreContext()},this.getPixelRatio=function(){return j},this.setPixelRatio=function(y){y!==void 0&&(j=y,this.setSize(G,K,!1))},this.getSize=function(y){return y.set(G,K)},this.setSize=function(y,A,D=!0){if(ht.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}G=y,K=A,n.width=Math.floor(y*j),n.height=Math.floor(A*j),D===!0&&(n.style.width=y+"px",n.style.height=A+"px"),this.setViewport(0,0,y,A)},this.getDrawingBufferSize=function(y){return y.set(G*j,K*j).floor()},this.setDrawingBufferSize=function(y,A,D){G=y,K=A,j=D,n.width=Math.floor(y*D),n.height=Math.floor(A*D),this.setViewport(0,0,y,A)},this.getCurrentViewport=function(y){return y.copy(R)},this.getViewport=function(y){return y.copy($)},this.setViewport=function(y,A,D,U){y.isVector4?$.set(y.x,y.y,y.z,y.w):$.set(y,A,D,U),wt.viewport(R.copy($).multiplyScalar(j).round())},this.getScissor=function(y){return y.copy(rt)},this.setScissor=function(y,A,D,U){y.isVector4?rt.set(y.x,y.y,y.z,y.w):rt.set(y,A,D,U),wt.scissor(V.copy(rt).multiplyScalar(j).round())},this.getScissorTest=function(){return pt},this.setScissorTest=function(y){wt.setScissorTest(pt=y)},this.setOpaqueSort=function(y){at=y},this.setTransparentSort=function(y){_t=y},this.getClearColor=function(y){return y.copy(At.getClearColor())},this.setClearColor=function(){At.setClearColor(...arguments)},this.getClearAlpha=function(){return At.getClearAlpha()},this.setClearAlpha=function(){At.setClearAlpha(...arguments)},this.clear=function(y=!0,A=!0,D=!0){let U=0;if(y){let O=!1;if(P!==null){let q=P.texture.format;O=q===Tl||q===El||q===wl}if(O){let q=P.texture.type,Z=q===ti||q===tr||q===Ls||q===Os||q===Ml||q===Sl,ct=At.getClearColor(),Q=At.getClearAlpha(),ut=ct.r,St=ct.g,nt=ct.b;Z?(m[0]=ut,m[1]=St,m[2]=nt,m[3]=Q,B.clearBufferuiv(B.COLOR,0,m)):(_[0]=ut,_[1]=St,_[2]=nt,_[3]=Q,B.clearBufferiv(B.COLOR,0,_))}else U|=B.COLOR_BUFFER_BIT}A&&(U|=B.DEPTH_BUFFER_BIT),D&&(U|=B.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),B.clear(U)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){n.removeEventListener("webglcontextlost",dt,!1),n.removeEventListener("webglcontextrestored",xt,!1),n.removeEventListener("webglcontextcreationerror",lt,!1),At.dispose(),Y.dispose(),Pt.dispose(),Tt.dispose(),Ie.dispose(),Ae.dispose(),W.dispose(),mt.dispose(),jt.dispose(),J.dispose(),ht.dispose(),ht.removeEventListener("sessionstart",nn),ht.removeEventListener("sessionend",ao),bi.stop()};function dt(y){y.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),M=!0}function xt(){console.log("THREE.WebGLRenderer: Context Restored."),M=!1;let y=_e.autoReset,A=Et.enabled,D=Et.autoUpdate,U=Et.needsUpdate,O=Et.type;H(),_e.autoReset=y,Et.enabled=A,Et.autoUpdate=D,Et.needsUpdate=U,Et.type=O}function lt(y){console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ",y.statusMessage)}function et(y){let A=y.target;A.removeEventListener("dispose",et),bt(A)}function bt(y){Ht(y),Tt.remove(y)}function Ht(y){let A=Tt.get(y).programs;A!==void 0&&(A.forEach(function(D){J.releaseProgram(D)}),y.isShaderMaterial&&J.releaseShaderCache(y))}this.renderBufferDirect=function(y,A,D,U,O,q){A===null&&(A=It);let Z=O.isMesh&&O.matrixWorld.determinant()<0,ct=qa(y,A,D,U,O);wt.setMaterial(U,Z);let Q=D.index,ut=1;if(U.wireframe===!0){if(Q=E.getWireframeAttribute(D),Q===void 0)return;ut=2}let St=D.drawRange,nt=D.attributes.position,Ct=St.start*ut,Gt=(St.start+St.count)*ut;q!==null&&(Ct=Math.max(Ct,q.start*ut),Gt=Math.min(Gt,(q.start+q.count)*ut)),Q!==null?(Ct=Math.max(Ct,0),Gt=Math.min(Gt,Q.count)):nt!=null&&(Ct=Math.max(Ct,0),Gt=Math.min(Gt,nt.count));let te=Gt-Ct;if(te<0||te===1/0)return;mt.setup(O,U,ct,D,Q);let se,ee=vt;if(Q!==null&&(se=L.get(Q),ee=Ft,ee.setIndex(se)),O.isMesh)U.wireframe===!0?(wt.setLineWidth(U.wireframeLinewidth*Re()),ee.setMode(B.LINES)):ee.setMode(B.TRIANGLES);else if(O.isLine){let Dt=U.linewidth;Dt===void 0&&(Dt=1),wt.setLineWidth(Dt*Re()),O.isLineSegments?ee.setMode(B.LINES):O.isLineLoop?ee.setMode(B.LINE_LOOP):ee.setMode(B.LINE_STRIP)}else O.isPoints?ee.setMode(B.POINTS):O.isSprite&&ee.setMode(B.TRIANGLES);if(O.isBatchedMesh)if(O._multiDrawInstances!==null)bs("THREE.WebGLRenderer: renderMultiDrawInstances has been deprecated and will be removed in r184. Append to renderMultiDraw arguments and use indirection."),ee.renderMultiDrawInstances(O._multiDrawStarts,O._multiDrawCounts,O._multiDrawCount,O._multiDrawInstances);else if(Wt.get("WEBGL_multi_draw"))ee.renderMultiDraw(O._multiDrawStarts,O._multiDrawCounts,O._multiDrawCount);else{let Dt=O._multiDrawStarts,be=O._multiDrawCounts,ne=O._multiDrawCount,rn=Q?L.get(Q).bytesPerElement:1,Qr=Tt.get(U).currentProgram.getUniforms();for(let yn=0;yn<ne;yn++)Qr.setValue(B,"_gl_DrawID",yn),ee.render(Dt[yn]/rn,be[yn])}else if(O.isInstancedMesh)ee.renderInstances(Ct,te,O.count);else if(D.isInstancedBufferGeometry){let Dt=D._maxInstanceCount!==void 0?D._maxInstanceCount:1/0,be=Math.min(D.instanceCount,Dt);ee.renderInstances(Ct,te,be)}else ee.render(Ct,te)};function he(y,A,D){y.transparent===!0&&y.side===pi&&y.forceSinglePass===!1?(y.side=We,y.needsUpdate=!0,vr(y,A,D),y.side=Pi,y.needsUpdate=!0,vr(y,A,D),y.side=pi):vr(y,A,D)}this.compile=function(y,A,D=null){D===null&&(D=y),p=Pt.get(D),p.init(A),x.push(p),D.traverseVisible(function(O){O.isLight&&O.layers.test(A.layers)&&(p.pushLight(O),O.castShadow&&p.pushShadow(O))}),y!==D&&y.traverseVisible(function(O){O.isLight&&O.layers.test(A.layers)&&(p.pushLight(O),O.castShadow&&p.pushShadow(O))}),p.setupLights();let U=new Set;return y.traverse(function(O){if(!(O.isMesh||O.isPoints||O.isLine||O.isSprite))return;let q=O.material;if(q)if(Array.isArray(q))for(let Z=0;Z<q.length;Z++){let ct=q[Z];he(ct,D,O),U.add(ct)}else he(q,D,O),U.add(q)}),p=x.pop(),U},this.compileAsync=function(y,A,D=null){let U=this.compile(y,A,D);return new Promise(O=>{function q(){if(U.forEach(function(Z){Tt.get(Z).currentProgram.isReady()&&U.delete(Z)}),U.size===0){O(y);return}setTimeout(q,10)}Wt.get("KHR_parallel_shader_compile")!==null?q():setTimeout(q,10)})};let oe=null;function Wn(y){oe&&oe(y)}function nn(){bi.stop()}function ao(){bi.start()}let bi=new zg;bi.setAnimationLoop(Wn),typeof self!="undefined"&&bi.setContext(self),this.setAnimationLoop=function(y){oe=y,ht.setAnimationLoop(y),y===null?bi.stop():bi.start()},ht.addEventListener("sessionstart",nn),ht.addEventListener("sessionend",ao),this.render=function(y,A){if(A!==void 0&&A.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(M===!0)return;if(y.matrixWorldAutoUpdate===!0&&y.updateMatrixWorld(),A.parent===null&&A.matrixWorldAutoUpdate===!0&&A.updateMatrixWorld(),ht.enabled===!0&&ht.isPresenting===!0&&(ht.cameraAutoUpdate===!0&&ht.updateCamera(A),A=ht.getCamera()),y.isScene===!0&&y.onBeforeRender(v,y,A,P),p=Pt.get(y,x.length),p.init(A),x.push(p),tt.multiplyMatrices(A.projectionMatrix,A.matrixWorldInverse),zt.setFromProjectionMatrix(tt,Zn,A.reversedDepth),X=this.localClippingEnabled,Lt=ft.init(this.clippingPlanes,X),g=Y.get(y,b.length),g.init(),b.push(g),ht.enabled===!0&&ht.isPresenting===!0){let q=v.xr.getDepthSensingMesh();q!==null&&co(q,A,-1/0,v.sortObjects)}co(y,A,0,v.sortObjects),g.finish(),v.sortObjects===!0&&g.sort(at,_t),Qt=ht.enabled===!1||ht.isPresenting===!1||ht.hasDepthSensing()===!1,Qt&&At.addToRenderList(g,y),this.info.render.frame++,Lt===!0&&ft.beginShadows();let D=p.state.shadowsArray;Et.render(D,y,A),Lt===!0&&ft.endShadows(),this.info.autoReset===!0&&this.info.reset();let U=g.opaque,O=g.transmissive;if(p.setupLights(),A.isArrayCamera){let q=A.cameras;if(O.length>0)for(let Z=0,ct=q.length;Z<ct;Z++){let Q=q[Z];Ga(U,O,y,Q)}Qt&&At.render(y);for(let Z=0,ct=q.length;Z<ct;Z++){let Q=q[Z];Ha(g,y,Q,Q.viewport)}}else O.length>0&&Ga(U,O,y,A),Qt&&At.render(y),Ha(g,y,A);P!==null&&C===0&&(qt.updateMultisampleRenderTarget(P),qt.updateRenderTargetMipmap(P)),y.isScene===!0&&y.onAfterRender(v,y,A),mt.resetDefaultState(),T=-1,w=null,x.pop(),x.length>0?(p=x[x.length-1],Lt===!0&&ft.setGlobalState(v.clippingPlanes,p.state.camera)):p=null,b.pop(),b.length>0?g=b[b.length-1]:g=null};function co(y,A,D,U){if(y.visible===!1)return;if(y.layers.test(A.layers)){if(y.isGroup)D=y.renderOrder;else if(y.isLOD)y.autoUpdate===!0&&y.update(A);else if(y.isLight)p.pushLight(y),y.castShadow&&p.pushShadow(y);else if(y.isSprite){if(!y.frustumCulled||zt.intersectsSprite(y)){U&&Bt.setFromMatrixPosition(y.matrixWorld).applyMatrix4(tt);let Z=W.update(y),ct=y.material;ct.visible&&g.push(y,Z,ct,D,Bt.z,null)}}else if((y.isMesh||y.isLine||y.isPoints)&&(!y.frustumCulled||zt.intersectsObject(y))){let Z=W.update(y),ct=y.material;if(U&&(y.boundingSphere!==void 0?(y.boundingSphere===null&&y.computeBoundingSphere(),Bt.copy(y.boundingSphere.center)):(Z.boundingSphere===null&&Z.computeBoundingSphere(),Bt.copy(Z.boundingSphere.center)),Bt.applyMatrix4(y.matrixWorld).applyMatrix4(tt)),Array.isArray(ct)){let Q=Z.groups;for(let ut=0,St=Q.length;ut<St;ut++){let nt=Q[ut],Ct=ct[nt.materialIndex];Ct&&Ct.visible&&g.push(y,Z,Ct,D,Bt.z,nt)}}else ct.visible&&g.push(y,Z,ct,D,Bt.z,null)}}let q=y.children;for(let Z=0,ct=q.length;Z<ct;Z++)co(q[Z],A,D,U)}function Ha(y,A,D,U){let O=y.opaque,q=y.transmissive,Z=y.transparent;p.setupLightsView(D),Lt===!0&&ft.setGlobalState(v.clippingPlanes,D),U&&wt.viewport(R.copy(U)),O.length>0&&_r(O,A,D),q.length>0&&_r(q,A,D),Z.length>0&&_r(Z,A,D),wt.buffers.depth.setTest(!0),wt.buffers.depth.setMask(!0),wt.buffers.color.setMask(!0),wt.setPolygonOffset(!1)}function Ga(y,A,D,U){if((D.isScene===!0?D.overrideMaterial:null)!==null)return;p.state.transmissionRenderTarget[U.id]===void 0&&(p.state.transmissionRenderTarget[U.id]=new Ke(1,1,{generateMipmaps:!0,type:Wt.has("EXT_color_buffer_half_float")||Wt.has("EXT_color_buffer_float")?zn:ti,minFilter:Qi,samples:4,stencilBuffer:s,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:ie.workingColorSpace}));let q=p.state.transmissionRenderTarget[U.id],Z=U.viewport||R;q.setSize(Z.z*v.transmissionResolutionScale,Z.w*v.transmissionResolutionScale);let ct=v.getRenderTarget(),Q=v.getActiveCubeFace(),ut=v.getActiveMipmapLevel();v.setRenderTarget(q),v.getClearColor(k),z=v.getClearAlpha(),z<1&&v.setClearColor(16777215,.5),v.clear(),Qt&&At.render(D);let St=v.toneMapping;v.toneMapping=Oi;let nt=U.viewport;if(U.viewport!==void 0&&(U.viewport=void 0),p.setupLightsView(U),Lt===!0&&ft.setGlobalState(v.clippingPlanes,U),_r(y,D,U),qt.updateMultisampleRenderTarget(q),qt.updateRenderTargetMipmap(q),Wt.has("WEBGL_multisampled_render_to_texture")===!1){let Ct=!1;for(let Gt=0,te=A.length;Gt<te;Gt++){let se=A[Gt],ee=se.object,Dt=se.geometry,be=se.material,ne=se.group;if(be.side===pi&&ee.layers.test(U.layers)){let rn=be.side;be.side=We,be.needsUpdate=!0,lo(ee,D,U,Dt,be,ne),be.side=rn,be.needsUpdate=!0,Ct=!0}}Ct===!0&&(qt.updateMultisampleRenderTarget(q),qt.updateRenderTargetMipmap(q))}v.setRenderTarget(ct,Q,ut),v.setClearColor(k,z),nt!==void 0&&(U.viewport=nt),v.toneMapping=St}function _r(y,A,D){let U=A.isScene===!0?A.overrideMaterial:null;for(let O=0,q=y.length;O<q;O++){let Z=y[O],ct=Z.object,Q=Z.geometry,ut=Z.group,St=Z.material;St.allowOverride===!0&&U!==null&&(St=U),ct.layers.test(D.layers)&&lo(ct,A,D,Q,St,ut)}}function lo(y,A,D,U,O,q){y.onBeforeRender(v,A,D,U,O,q),y.modelViewMatrix.multiplyMatrices(D.matrixWorldInverse,y.matrixWorld),y.normalMatrix.getNormalMatrix(y.modelViewMatrix),O.onBeforeRender(v,A,D,U,y,q),O.transparent===!0&&O.side===pi&&O.forceSinglePass===!1?(O.side=We,O.needsUpdate=!0,v.renderBufferDirect(D,A,U,O,y,q),O.side=Pi,O.needsUpdate=!0,v.renderBufferDirect(D,A,U,O,y,q),O.side=pi):v.renderBufferDirect(D,A,U,O,y,q),y.onAfterRender(v,A,D,U,O,q)}function vr(y,A,D){A.isScene!==!0&&(A=It);let U=Tt.get(y),O=p.state.lights,q=p.state.shadowsArray,Z=O.state.version,ct=J.getParameters(y,O.state,q,A,D),Q=J.getProgramCacheKey(ct),ut=U.programs;U.environment=y.isMeshStandardMaterial?A.environment:null,U.fog=A.fog,U.envMap=(y.isMeshStandardMaterial?Ae:Ie).get(y.envMap||U.environment),U.envMapRotation=U.environment!==null&&y.envMap===null?A.environmentRotation:y.envMapRotation,ut===void 0&&(y.addEventListener("dispose",et),ut=new Map,U.programs=ut);let St=ut.get(Q);if(St!==void 0){if(U.currentProgram===St&&U.lightsStateVersion===Z)return ja(y,ct),St}else ct.uniforms=J.getUniforms(y),y.onBeforeCompile(ct,v),St=J.acquireProgram(ct,Q),ut.set(Q,St),U.uniforms=ct.uniforms;let nt=U.uniforms;return(!y.isShaderMaterial&&!y.isRawShaderMaterial||y.clipping===!0)&&(nt.clippingPlanes=ft.uniform),ja(y,ct),U.needsLights=Jr(y),U.lightsStateVersion=Z,U.needsLights&&(nt.ambientLightColor.value=O.state.ambient,nt.lightProbe.value=O.state.probe,nt.directionalLights.value=O.state.directional,nt.directionalLightShadows.value=O.state.directionalShadow,nt.spotLights.value=O.state.spot,nt.spotLightShadows.value=O.state.spotShadow,nt.rectAreaLights.value=O.state.rectArea,nt.ltc_1.value=O.state.rectAreaLTC1,nt.ltc_2.value=O.state.rectAreaLTC2,nt.pointLights.value=O.state.point,nt.pointLightShadows.value=O.state.pointShadow,nt.hemisphereLights.value=O.state.hemi,nt.directionalShadowMap.value=O.state.directionalShadowMap,nt.directionalShadowMatrix.value=O.state.directionalShadowMatrix,nt.spotShadowMap.value=O.state.spotShadowMap,nt.spotLightMatrix.value=O.state.spotLightMatrix,nt.spotLightMap.value=O.state.spotLightMap,nt.pointShadowMap.value=O.state.pointShadowMap,nt.pointShadowMatrix.value=O.state.pointShadowMatrix),U.currentProgram=St,U.uniformsList=null,St}function Wa(y){if(y.uniformsList===null){let A=y.currentProgram.getUniforms();y.uniformsList=zs.seqWithValue(A.seq,y.uniforms)}return y.uniformsList}function ja(y,A){let D=Tt.get(y);D.outputColorSpace=A.outputColorSpace,D.batching=A.batching,D.batchingColor=A.batchingColor,D.instancing=A.instancing,D.instancingColor=A.instancingColor,D.instancingMorph=A.instancingMorph,D.skinning=A.skinning,D.morphTargets=A.morphTargets,D.morphNormals=A.morphNormals,D.morphColors=A.morphColors,D.morphTargetsCount=A.morphTargetsCount,D.numClippingPlanes=A.numClippingPlanes,D.numIntersection=A.numClipIntersection,D.vertexAlphas=A.vertexAlphas,D.vertexTangents=A.vertexTangents,D.toneMapping=A.toneMapping}function qa(y,A,D,U,O){A.isScene!==!0&&(A=It),qt.resetTextureUnits();let q=A.fog,Z=U.isMeshStandardMaterial?A.environment:null,ct=P===null?v.outputColorSpace:P.isXRRenderTarget===!0?P.texture.colorSpace:Ar,Q=(U.isMeshStandardMaterial?Ae:Ie).get(U.envMap||Z),ut=U.vertexColors===!0&&!!D.attributes.color&&D.attributes.color.itemSize===4,St=!!D.attributes.tangent&&(!!U.normalMap||U.anisotropy>0),nt=!!D.morphAttributes.position,Ct=!!D.morphAttributes.normal,Gt=!!D.morphAttributes.color,te=Oi;U.toneMapped&&(P===null||P.isXRRenderTarget===!0)&&(te=v.toneMapping);let se=D.morphAttributes.position||D.morphAttributes.normal||D.morphAttributes.color,ee=se!==void 0?se.length:0,Dt=Tt.get(U),be=p.state.lights;if(Lt===!0&&(X===!0||y!==w)){let sn=y===w&&U.id===T;ft.setState(U,y,sn)}let ne=!1;U.version===Dt.__version?(Dt.needsLights&&Dt.lightsStateVersion!==be.state.version||Dt.outputColorSpace!==ct||O.isBatchedMesh&&Dt.batching===!1||!O.isBatchedMesh&&Dt.batching===!0||O.isBatchedMesh&&Dt.batchingColor===!0&&O.colorTexture===null||O.isBatchedMesh&&Dt.batchingColor===!1&&O.colorTexture!==null||O.isInstancedMesh&&Dt.instancing===!1||!O.isInstancedMesh&&Dt.instancing===!0||O.isSkinnedMesh&&Dt.skinning===!1||!O.isSkinnedMesh&&Dt.skinning===!0||O.isInstancedMesh&&Dt.instancingColor===!0&&O.instanceColor===null||O.isInstancedMesh&&Dt.instancingColor===!1&&O.instanceColor!==null||O.isInstancedMesh&&Dt.instancingMorph===!0&&O.morphTexture===null||O.isInstancedMesh&&Dt.instancingMorph===!1&&O.morphTexture!==null||Dt.envMap!==Q||U.fog===!0&&Dt.fog!==q||Dt.numClippingPlanes!==void 0&&(Dt.numClippingPlanes!==ft.numPlanes||Dt.numIntersection!==ft.numIntersection)||Dt.vertexAlphas!==ut||Dt.vertexTangents!==St||Dt.morphTargets!==nt||Dt.morphNormals!==Ct||Dt.morphColors!==Gt||Dt.toneMapping!==te||Dt.morphTargetsCount!==ee)&&(ne=!0):(ne=!0,Dt.__version=U.version);let rn=Dt.currentProgram;ne===!0&&(rn=vr(U,A,O));let Qr=!1,yn=!1,uo=!1,Ce=rn.getUniforms(),Pn=Dt.uniforms;if(wt.useProgram(rn.program)&&(Qr=!0,yn=!0,uo=!0),U.id!==T&&(T=U.id,yn=!0),Qr||w!==y){wt.buffers.depth.getReversed()&&y.reversedDepth!==!0&&(y._reversedDepth=!0,y.updateProjectionMatrix()),Ce.setValue(B,"projectionMatrix",y.projectionMatrix),Ce.setValue(B,"viewMatrix",y.matrixWorldInverse);let un=Ce.map.cameraPosition;un!==void 0&&un.setValue(B,yt.setFromMatrixPosition(y.matrixWorld)),kt.logarithmicDepthBuffer&&Ce.setValue(B,"logDepthBufFC",2/(Math.log(y.far+1)/Math.LN2)),(U.isMeshPhongMaterial||U.isMeshToonMaterial||U.isMeshLambertMaterial||U.isMeshBasicMaterial||U.isMeshStandardMaterial||U.isShaderMaterial)&&Ce.setValue(B,"isOrthographic",y.isOrthographicCamera===!0),w!==y&&(w=y,yn=!0,uo=!0)}if(O.isSkinnedMesh){Ce.setOptional(B,O,"bindMatrix"),Ce.setOptional(B,O,"bindMatrixInverse");let sn=O.skeleton;sn&&(sn.boneTexture===null&&sn.computeBoneTexture(),Ce.setValue(B,"boneTexture",sn.boneTexture,qt))}O.isBatchedMesh&&(Ce.setOptional(B,O,"batchingTexture"),Ce.setValue(B,"batchingTexture",O._matricesTexture,qt),Ce.setOptional(B,O,"batchingIdTexture"),Ce.setValue(B,"batchingIdTexture",O._indirectTexture,qt),Ce.setOptional(B,O,"batchingColorTexture"),O._colorsTexture!==null&&Ce.setValue(B,"batchingColorTexture",O._colorsTexture,qt));let In=D.morphAttributes;if((In.position!==void 0||In.normal!==void 0||In.color!==void 0)&&ot.update(O,D,rn),(yn||Dt.receiveShadow!==O.receiveShadow)&&(Dt.receiveShadow=O.receiveShadow,Ce.setValue(B,"receiveShadow",O.receiveShadow)),U.isMeshGouraudMaterial&&U.envMap!==null&&(Pn.envMap.value=Q,Pn.flipEnvMap.value=Q.isCubeTexture&&Q.isRenderTargetTexture===!1?-1:1),U.isMeshStandardMaterial&&U.envMap===null&&A.environment!==null&&(Pn.envMapIntensity.value=A.environmentIntensity),yn&&(Ce.setValue(B,"toneMappingExposure",v.toneMappingExposure),Dt.needsLights&&ho(Pn,uo),q&&U.fog===!0&&st.refreshFogUniforms(Pn,q),st.refreshMaterialUniforms(Pn,U,j,K,p.state.transmissionRenderTarget[y.id]),zs.upload(B,Wa(Dt),Pn,qt)),U.isShaderMaterial&&U.uniformsNeedUpdate===!0&&(zs.upload(B,Wa(Dt),Pn,qt),U.uniformsNeedUpdate=!1),U.isSpriteMaterial&&Ce.setValue(B,"center",O.center),Ce.setValue(B,"modelViewMatrix",O.modelViewMatrix),Ce.setValue(B,"normalMatrix",O.normalMatrix),Ce.setValue(B,"modelMatrix",O.matrixWorld),U.isShaderMaterial||U.isRawShaderMaterial){let sn=U.uniformsGroups;for(let un=0,Tu=sn.length;un<Tu;un++){let yr=sn[un];jt.update(yr,rn),jt.bind(yr,rn)}}return rn}function ho(y,A){y.ambientLightColor.needsUpdate=A,y.lightProbe.needsUpdate=A,y.directionalLights.needsUpdate=A,y.directionalLightShadows.needsUpdate=A,y.pointLights.needsUpdate=A,y.pointLightShadows.needsUpdate=A,y.spotLights.needsUpdate=A,y.spotLightShadows.needsUpdate=A,y.rectAreaLights.needsUpdate=A,y.hemisphereLights.needsUpdate=A}function Jr(y){return y.isMeshLambertMaterial||y.isMeshToonMaterial||y.isMeshPhongMaterial||y.isMeshStandardMaterial||y.isShadowMaterial||y.isShaderMaterial&&y.lights===!0}this.getActiveCubeFace=function(){return S},this.getActiveMipmapLevel=function(){return C},this.getRenderTarget=function(){return P},this.setRenderTargetTextures=function(y,A,D){let U=Tt.get(y);U.__autoAllocateDepthBuffer=y.resolveDepthBuffer===!1,U.__autoAllocateDepthBuffer===!1&&(U.__useRenderToTexture=!1),Tt.get(y.texture).__webglTexture=A,Tt.get(y.depthTexture).__webglTexture=U.__autoAllocateDepthBuffer?void 0:D,U.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(y,A){let D=Tt.get(y);D.__webglFramebuffer=A,D.__useDefaultFramebuffer=A===void 0};let wu=B.createFramebuffer();this.setRenderTarget=function(y,A=0,D=0){P=y,S=A,C=D;let U=!0,O=null,q=!1,Z=!1;if(y){let Q=Tt.get(y);if(Q.__useDefaultFramebuffer!==void 0)wt.bindFramebuffer(B.FRAMEBUFFER,null),U=!1;else if(Q.__webglFramebuffer===void 0)qt.setupRenderTarget(y);else if(Q.__hasExternalTextures)qt.rebindTextures(y,Tt.get(y.texture).__webglTexture,Tt.get(y.depthTexture).__webglTexture);else if(y.depthBuffer){let nt=y.depthTexture;if(Q.__boundDepthTexture!==nt){if(nt!==null&&Tt.has(nt)&&(y.width!==nt.image.width||y.height!==nt.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");qt.setupDepthRenderbuffer(y)}}let ut=y.texture;(ut.isData3DTexture||ut.isDataArrayTexture||ut.isCompressedArrayTexture)&&(Z=!0);let St=Tt.get(y).__webglFramebuffer;y.isWebGLCubeRenderTarget?(Array.isArray(St[A])?O=St[A][D]:O=St[A],q=!0):y.samples>0&&qt.useMultisampledRTT(y)===!1?O=Tt.get(y).__webglMultisampledFramebuffer:Array.isArray(St)?O=St[D]:O=St,R.copy(y.viewport),V.copy(y.scissor),N=y.scissorTest}else R.copy($).multiplyScalar(j).floor(),V.copy(rt).multiplyScalar(j).floor(),N=pt;if(D!==0&&(O=wu),wt.bindFramebuffer(B.FRAMEBUFFER,O)&&U&&wt.drawBuffers(y,O),wt.viewport(R),wt.scissor(V),wt.setScissorTest(N),q){let Q=Tt.get(y.texture);B.framebufferTexture2D(B.FRAMEBUFFER,B.COLOR_ATTACHMENT0,B.TEXTURE_CUBE_MAP_POSITIVE_X+A,Q.__webglTexture,D)}else if(Z){let Q=A;for(let ut=0;ut<y.textures.length;ut++){let St=Tt.get(y.textures[ut]);B.framebufferTextureLayer(B.FRAMEBUFFER,B.COLOR_ATTACHMENT0+ut,St.__webglTexture,D,Q)}}else if(y!==null&&D!==0){let Q=Tt.get(y.texture);B.framebufferTexture2D(B.FRAMEBUFFER,B.COLOR_ATTACHMENT0,B.TEXTURE_2D,Q.__webglTexture,D)}T=-1},this.readRenderTargetPixels=function(y,A,D,U,O,q,Z,ct=0){if(!(y&&y.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Q=Tt.get(y).__webglFramebuffer;if(y.isWebGLCubeRenderTarget&&Z!==void 0&&(Q=Q[Z]),Q){wt.bindFramebuffer(B.FRAMEBUFFER,Q);try{let ut=y.textures[ct],St=ut.format,nt=ut.type;if(!kt.textureFormatReadable(St)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!kt.textureTypeReadable(nt)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}A>=0&&A<=y.width-U&&D>=0&&D<=y.height-O&&(y.textures.length>1&&B.readBuffer(B.COLOR_ATTACHMENT0+ct),B.readPixels(A,D,U,O,Mt.convert(St),Mt.convert(nt),q))}finally{let ut=P!==null?Tt.get(P).__webglFramebuffer:null;wt.bindFramebuffer(B.FRAMEBUFFER,ut)}}},this.readRenderTargetPixelsAsync=async function(y,A,D,U,O,q,Z,ct=0){if(!(y&&y.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Q=Tt.get(y).__webglFramebuffer;if(y.isWebGLCubeRenderTarget&&Z!==void 0&&(Q=Q[Z]),Q)if(A>=0&&A<=y.width-U&&D>=0&&D<=y.height-O){wt.bindFramebuffer(B.FRAMEBUFFER,Q);let ut=y.textures[ct],St=ut.format,nt=ut.type;if(!kt.textureFormatReadable(St))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!kt.textureTypeReadable(nt))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");let Ct=B.createBuffer();B.bindBuffer(B.PIXEL_PACK_BUFFER,Ct),B.bufferData(B.PIXEL_PACK_BUFFER,q.byteLength,B.STREAM_READ),y.textures.length>1&&B.readBuffer(B.COLOR_ATTACHMENT0+ct),B.readPixels(A,D,U,O,Mt.convert(St),Mt.convert(nt),0);let Gt=P!==null?Tt.get(P).__webglFramebuffer:null;wt.bindFramebuffer(B.FRAMEBUFFER,Gt);let te=B.fenceSync(B.SYNC_GPU_COMMANDS_COMPLETE,0);return B.flush(),await ug(B,te,4),B.bindBuffer(B.PIXEL_PACK_BUFFER,Ct),B.getBufferSubData(B.PIXEL_PACK_BUFFER,0,q),B.deleteBuffer(Ct),B.deleteSync(te),q}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(y,A=null,D=0){let U=Math.pow(2,-D),O=Math.floor(y.image.width*U),q=Math.floor(y.image.height*U),Z=A!==null?A.x:0,ct=A!==null?A.y:0;qt.setTexture2D(y,0),B.copyTexSubImage2D(B.TEXTURE_2D,D,0,0,Z,ct,O,q),wt.unbindTexture()};let Eu=B.createFramebuffer(),F=B.createFramebuffer();this.copyTextureToTexture=function(y,A,D=null,U=null,O=0,q=null){q===null&&(O!==0?(bs("WebGLRenderer: copyTextureToTexture function signature has changed to support src and dst mipmap levels."),q=O,O=0):q=0);let Z,ct,Q,ut,St,nt,Ct,Gt,te,se=y.isCompressedTexture?y.mipmaps[q]:y.image;if(D!==null)Z=D.max.x-D.min.x,ct=D.max.y-D.min.y,Q=D.isBox3?D.max.z-D.min.z:1,ut=D.min.x,St=D.min.y,nt=D.isBox3?D.min.z:0;else{let In=Math.pow(2,-O);Z=Math.floor(se.width*In),ct=Math.floor(se.height*In),y.isDataArrayTexture?Q=se.depth:y.isData3DTexture?Q=Math.floor(se.depth*In):Q=1,ut=0,St=0,nt=0}U!==null?(Ct=U.x,Gt=U.y,te=U.z):(Ct=0,Gt=0,te=0);let ee=Mt.convert(A.format),Dt=Mt.convert(A.type),be;A.isData3DTexture?(qt.setTexture3D(A,0),be=B.TEXTURE_3D):A.isDataArrayTexture||A.isCompressedArrayTexture?(qt.setTexture2DArray(A,0),be=B.TEXTURE_2D_ARRAY):(qt.setTexture2D(A,0),be=B.TEXTURE_2D),B.pixelStorei(B.UNPACK_FLIP_Y_WEBGL,A.flipY),B.pixelStorei(B.UNPACK_PREMULTIPLY_ALPHA_WEBGL,A.premultiplyAlpha),B.pixelStorei(B.UNPACK_ALIGNMENT,A.unpackAlignment);let ne=B.getParameter(B.UNPACK_ROW_LENGTH),rn=B.getParameter(B.UNPACK_IMAGE_HEIGHT),Qr=B.getParameter(B.UNPACK_SKIP_PIXELS),yn=B.getParameter(B.UNPACK_SKIP_ROWS),uo=B.getParameter(B.UNPACK_SKIP_IMAGES);B.pixelStorei(B.UNPACK_ROW_LENGTH,se.width),B.pixelStorei(B.UNPACK_IMAGE_HEIGHT,se.height),B.pixelStorei(B.UNPACK_SKIP_PIXELS,ut),B.pixelStorei(B.UNPACK_SKIP_ROWS,St),B.pixelStorei(B.UNPACK_SKIP_IMAGES,nt);let Ce=y.isDataArrayTexture||y.isData3DTexture,Pn=A.isDataArrayTexture||A.isData3DTexture;if(y.isDepthTexture){let In=Tt.get(y),sn=Tt.get(A),un=Tt.get(In.__renderTarget),Tu=Tt.get(sn.__renderTarget);wt.bindFramebuffer(B.READ_FRAMEBUFFER,un.__webglFramebuffer),wt.bindFramebuffer(B.DRAW_FRAMEBUFFER,Tu.__webglFramebuffer);for(let yr=0;yr<Q;yr++)Ce&&(B.framebufferTextureLayer(B.READ_FRAMEBUFFER,B.COLOR_ATTACHMENT0,Tt.get(y).__webglTexture,O,nt+yr),B.framebufferTextureLayer(B.DRAW_FRAMEBUFFER,B.COLOR_ATTACHMENT0,Tt.get(A).__webglTexture,q,te+yr)),B.blitFramebuffer(ut,St,Z,ct,Ct,Gt,Z,ct,B.DEPTH_BUFFER_BIT,B.NEAREST);wt.bindFramebuffer(B.READ_FRAMEBUFFER,null),wt.bindFramebuffer(B.DRAW_FRAMEBUFFER,null)}else if(O!==0||y.isRenderTargetTexture||Tt.has(y)){let In=Tt.get(y),sn=Tt.get(A);wt.bindFramebuffer(B.READ_FRAMEBUFFER,Eu),wt.bindFramebuffer(B.DRAW_FRAMEBUFFER,F);for(let un=0;un<Q;un++)Ce?B.framebufferTextureLayer(B.READ_FRAMEBUFFER,B.COLOR_ATTACHMENT0,In.__webglTexture,O,nt+un):B.framebufferTexture2D(B.READ_FRAMEBUFFER,B.COLOR_ATTACHMENT0,B.TEXTURE_2D,In.__webglTexture,O),Pn?B.framebufferTextureLayer(B.DRAW_FRAMEBUFFER,B.COLOR_ATTACHMENT0,sn.__webglTexture,q,te+un):B.framebufferTexture2D(B.DRAW_FRAMEBUFFER,B.COLOR_ATTACHMENT0,B.TEXTURE_2D,sn.__webglTexture,q),O!==0?B.blitFramebuffer(ut,St,Z,ct,Ct,Gt,Z,ct,B.COLOR_BUFFER_BIT,B.NEAREST):Pn?B.copyTexSubImage3D(be,q,Ct,Gt,te+un,ut,St,Z,ct):B.copyTexSubImage2D(be,q,Ct,Gt,ut,St,Z,ct);wt.bindFramebuffer(B.READ_FRAMEBUFFER,null),wt.bindFramebuffer(B.DRAW_FRAMEBUFFER,null)}else Pn?y.isDataTexture||y.isData3DTexture?B.texSubImage3D(be,q,Ct,Gt,te,Z,ct,Q,ee,Dt,se.data):A.isCompressedArrayTexture?B.compressedTexSubImage3D(be,q,Ct,Gt,te,Z,ct,Q,ee,se.data):B.texSubImage3D(be,q,Ct,Gt,te,Z,ct,Q,ee,Dt,se):y.isDataTexture?B.texSubImage2D(B.TEXTURE_2D,q,Ct,Gt,Z,ct,ee,Dt,se.data):y.isCompressedTexture?B.compressedTexSubImage2D(B.TEXTURE_2D,q,Ct,Gt,se.width,se.height,ee,se.data):B.texSubImage2D(B.TEXTURE_2D,q,Ct,Gt,Z,ct,ee,Dt,se);B.pixelStorei(B.UNPACK_ROW_LENGTH,ne),B.pixelStorei(B.UNPACK_IMAGE_HEIGHT,rn),B.pixelStorei(B.UNPACK_SKIP_PIXELS,Qr),B.pixelStorei(B.UNPACK_SKIP_ROWS,yn),B.pixelStorei(B.UNPACK_SKIP_IMAGES,uo),q===0&&A.generateMipmaps&&B.generateMipmap(be),wt.unbindTexture()},this.initRenderTarget=function(y){Tt.get(y).__webglFramebuffer===void 0&&qt.setupRenderTarget(y)},this.initTexture=function(y){y.isCubeTexture?qt.setTextureCube(y,0):y.isData3DTexture?qt.setTexture3D(y,0):y.isDataArrayTexture||y.isCompressedArrayTexture?qt.setTexture2DArray(y,0):qt.setTexture2D(y,0),wt.unbindTexture()},this.resetState=function(){S=0,C=0,P=null,wt.reset(),mt.reset()},typeof __THREE_DEVTOOLS__!="undefined"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return Zn}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(t){this._outputColorSpace=t;let n=this.getContext();n.drawingBufferColorSpace=ie._getDrawingBufferColorSpace(t),n.unpackColorSpace=ie._getUnpackColorSpace()}};var Bs=new dn,Ui=new it,Gg=new I,Qf=new it,ch=new it,lh=new I,td=new I,Wg=new Vt,jg=new I,qg=new I,Qe=null,_i=null,zi=[],er={NONE:-1,PAN:0,ROTATE:1},hh=class extends wn{constructor(t,n,i=null){super(n,i),this.objects=t,this.recursive=!0,this.transformGroup=!1,this.rotateSpeed=1,this.raycaster=new Li,this.mouseButtons={LEFT:Pe.PAN,MIDDLE:Pe.PAN,RIGHT:Pe.ROTATE},this.touches={ONE:Un.PAN},this._onPointerMove=NE.bind(this),this._onPointerDown=FE.bind(this),this._onPointerCancel=UE.bind(this),this._onContextMenu=zE.bind(this),i!==null&&this.connect(i)}connect(t){super.connect(t),this.domElement.addEventListener("pointermove",this._onPointerMove),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointerup",this._onPointerCancel),this.domElement.addEventListener("pointerleave",this._onPointerCancel),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.style.touchAction="none"}disconnect(){this.domElement.removeEventListener("pointermove",this._onPointerMove),this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.removeEventListener("pointerup",this._onPointerCancel),this.domElement.removeEventListener("pointerleave",this._onPointerCancel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.domElement.style.touchAction="auto",this.domElement.style.cursor=""}dispose(){this.disconnect()}_updatePointer(t){let n=this.domElement.getBoundingClientRect();Ui.x=(t.clientX-n.left)/n.width*2-1,Ui.y=-(t.clientY-n.top)/n.height*2+1}_updateState(t){let n;if(t.pointerType==="touch")n=this.touches.ONE;else switch(t.button){case 0:n=this.mouseButtons.LEFT;break;case 1:n=this.mouseButtons.MIDDLE;break;case 2:n=this.mouseButtons.RIGHT;break;default:n=null}switch(n){case Pe.PAN:case Un.PAN:this.state=er.PAN;break;case Pe.ROTATE:case Un.ROTATE:this.state=er.ROTATE;break;default:this.state=er.NONE}}};function NE(e){let t=this.object,n=this.domElement,i=this.raycaster;if(this.enabled!==!1){if(this._updatePointer(e),i.setFromCamera(Ui,t),Qe)this.state===er.PAN?i.ray.intersectPlane(Bs,lh)&&(Qe.position.copy(lh.sub(Gg).applyMatrix4(Wg)),this.dispatchEvent({type:"drag",object:Qe})):this.state===er.ROTATE&&(Qf.subVectors(Ui,ch).multiplyScalar(this.rotateSpeed),Qe.rotateOnWorldAxis(jg,Qf.x),Qe.rotateOnWorldAxis(qg.normalize(),-Qf.y),this.dispatchEvent({type:"drag",object:Qe})),ch.copy(Ui);else if(e.pointerType==="mouse"||e.pointerType==="pen")if(zi.length=0,i.setFromCamera(Ui,t),i.intersectObjects(this.objects,this.recursive,zi),zi.length>0){let r=zi[0].object;Bs.setFromNormalAndCoplanarPoint(t.getWorldDirection(Bs.normal),td.setFromMatrixPosition(r.matrixWorld)),_i!==r&&_i!==null&&(this.dispatchEvent({type:"hoveroff",object:_i}),n.style.cursor="auto",_i=null),_i!==r&&(this.dispatchEvent({type:"hoveron",object:r}),n.style.cursor="pointer",_i=r)}else _i!==null&&(this.dispatchEvent({type:"hoveroff",object:_i}),n.style.cursor="auto",_i=null);ch.copy(Ui)}}function FE(e){let t=this.object,n=this.domElement,i=this.raycaster;this.enabled!==!1&&(this._updatePointer(e),this._updateState(e),zi.length=0,i.setFromCamera(Ui,t),i.intersectObjects(this.objects,this.recursive,zi),zi.length>0&&(this.transformGroup===!0?Qe=Xg(zi[0].object):Qe=zi[0].object,Bs.setFromNormalAndCoplanarPoint(t.getWorldDirection(Bs.normal),td.setFromMatrixPosition(Qe.matrixWorld)),i.ray.intersectPlane(Bs,lh)&&(this.state===er.PAN?(Wg.copy(Qe.parent.matrixWorld).invert(),Gg.copy(lh).sub(td.setFromMatrixPosition(Qe.matrixWorld)),n.style.cursor="move",this.dispatchEvent({type:"dragstart",object:Qe})):this.state===er.ROTATE&&(jg.set(0,1,0).applyQuaternion(t.quaternion).normalize(),qg.set(1,0,0).applyQuaternion(t.quaternion).normalize(),n.style.cursor="move",this.dispatchEvent({type:"dragstart",object:Qe})))),ch.copy(Ui))}function UE(){this.enabled!==!1&&(Qe&&(this.dispatchEvent({type:"dragend",object:Qe}),Qe=null),this.domElement.style.cursor=_i?"pointer":"auto",this.state=er.NONE)}function zE(e){this.enabled!==!1&&e.preventDefault()}function Xg(e,t=null){return e.isGroup&&(t=e),e.parent===null?t:Xg(e.parent,t)}function ed(e,t,n){var i,r=1;e==null&&(e=0),t==null&&(t=0),n==null&&(n=0);function s(){var o,a=i.length,c,l=0,u=0,h=0;for(o=0;o<a;++o)c=i[o],l+=c.x||0,u+=c.y||0,h+=c.z||0;for(l=(l/a-e)*r,u=(u/a-t)*r,h=(h/a-n)*r,o=0;o<a;++o)c=i[o],l&&(c.x-=l),u&&(c.y-=u),h&&(c.z-=h)}return s.initialize=function(o){i=o},s.x=function(o){return arguments.length?(e=+o,s):e},s.y=function(o){return arguments.length?(t=+o,s):t},s.z=function(o){return arguments.length?(n=+o,s):n},s.strength=function(o){return arguments.length?(r=+o,s):r},s}function $g(e){let t=+this._x.call(null,e);return Yg(this.cover(t),t,e)}function Yg(e,t,n){if(isNaN(t))return e;var i,r=e._root,s={data:n},o=e._x0,a=e._x1,c,l,u,h,d;if(!r)return e._root=s,e;for(;r.length;)if((u=t>=(c=(o+a)/2))?o=c:a=c,i=r,!(r=r[h=+u]))return i[h]=s,e;if(l=+e._x.call(null,r.data),t===l)return s.next=r,i?i[h]=s:e._root=s,e;do i=i?i[h]=new Array(2):e._root=new Array(2),(u=t>=(c=(o+a)/2))?o=c:a=c;while((h=+u)==(d=+(l>=c)));return i[d]=r,i[h]=s,e}function Zg(e){Array.isArray(e)||(e=Array.from(e));let t=e.length,n=new Float64Array(t),i=1/0,r=-1/0;for(let s=0,o;s<t;++s)isNaN(o=+this._x.call(null,e[s]))||(n[s]=o,o<i&&(i=o),o>r&&(r=o));if(i>r)return this;this.cover(i).cover(r);for(let s=0;s<t;++s)Yg(this,n[s],e[s]);return this}function Kg(e){if(isNaN(e=+e))return this;var t=this._x0,n=this._x1;if(isNaN(t))n=(t=Math.floor(e))+1;else{for(var i=n-t||1,r=this._root,s,o;t>e||e>=n;)switch(o=+(e<t),s=new Array(2),s[o]=r,r=s,i*=2,o){case 0:n=t+i;break;case 1:t=n-i;break}this._root&&this._root.length&&(this._root=r)}return this._x0=t,this._x1=n,this}function Jg(){var e=[];return this.visit(function(t){if(!t.length)do e.push(t.data);while(t=t.next)}),e}function Qg(e){return arguments.length?this.cover(+e[0][0]).cover(+e[1][0]):isNaN(this._x0)?void 0:[[this._x0],[this._x1]]}function Bn(e,t,n){this.node=e,this.x0=t,this.x1=n}function t0(e,t){var n,i=this._x0,r,s,o=this._x1,a=[],c=this._root,l,u;for(c&&a.push(new Bn(c,i,o)),t==null?t=1/0:(i=e-t,o=e+t);l=a.pop();)if(!(!(c=l.node)||(r=l.x0)>o||(s=l.x1)<i))if(c.length){var h=(r+s)/2;a.push(new Bn(c[1],h,s),new Bn(c[0],r,h)),(u=+(e>=h))&&(l=a[a.length-1],a[a.length-1]=a[a.length-1-u],a[a.length-1-u]=l)}else{var d=Math.abs(e-+this._x.call(null,c.data));d<t&&(t=d,i=e-d,o=e+d,n=c.data)}return n}function e0(e){if(isNaN(c=+this._x.call(null,e)))return this;var t,n=this._root,i,r,s,o=this._x0,a=this._x1,c,l,u,h,d;if(!n)return this;if(n.length)for(;;){if((u=c>=(l=(o+a)/2))?o=l:a=l,t=n,!(n=n[h=+u]))return this;if(!n.length)break;t[h+1&1]&&(i=t,d=h)}for(;n.data!==e;)if(r=n,!(n=n.next))return this;return(s=n.next)&&delete n.next,r?(s?r.next=s:delete r.next,this):t?(s?t[h]=s:delete t[h],(n=t[0]||t[1])&&n===(t[1]||t[0])&&!n.length&&(i?i[d]=n:this._root=n),this):(this._root=s,this)}function n0(e){for(var t=0,n=e.length;t<n;++t)this.remove(e[t]);return this}function i0(){return this._root}function r0(){var e=0;return this.visit(function(t){if(!t.length)do++e;while(t=t.next)}),e}function s0(e){var t=[],n,i=this._root,r,s,o;for(i&&t.push(new Bn(i,this._x0,this._x1));n=t.pop();)if(!e(i=n.node,s=n.x0,o=n.x1)&&i.length){var a=(s+o)/2;(r=i[1])&&t.push(new Bn(r,a,o)),(r=i[0])&&t.push(new Bn(r,s,a))}return this}function o0(e){var t=[],n=[],i;for(this._root&&t.push(new Bn(this._root,this._x0,this._x1));i=t.pop();){var r=i.node;if(r.length){var s,o=i.x0,a=i.x1,c=(o+a)/2;(s=r[0])&&t.push(new Bn(s,o,c)),(s=r[1])&&t.push(new Bn(s,c,a))}n.push(i)}for(;i=n.pop();)e(i.node,i.x0,i.x1);return this}function a0(e){return e[0]}function c0(e){return arguments.length?(this._x=e,this):this._x}function ca(e,t){var n=new nd(t==null?a0:t,NaN,NaN);return e==null?n:n.addAll(e)}function nd(e,t,n){this._x=e,this._x0=t,this._x1=n,this._root=void 0}function l0(e){for(var t={data:e.data},n=t;e=e.next;)n=n.next={data:e.data};return t}var mn=ca.prototype=nd.prototype;mn.copy=function(){var e=new nd(this._x,this._x0,this._x1),t=this._root,n,i;if(!t)return e;if(!t.length)return e._root=l0(t),e;for(n=[{source:t,target:e._root=new Array(2)}];t=n.pop();)for(var r=0;r<2;++r)(i=t.source[r])&&(i.length?n.push({source:i,target:t.target[r]=new Array(2)}):t.target[r]=l0(i));return e};mn.add=$g;mn.addAll=Zg;mn.cover=Kg;mn.data=Jg;mn.extent=Qg;mn.find=t0;mn.remove=e0;mn.removeAll=n0;mn.root=i0;mn.size=r0;mn.visit=s0;mn.visitAfter=o0;mn.x=c0;function kE(e){let t=+this._x.call(null,e),n=+this._y.call(null,e);return u0(this.cover(t,n),t,n,e)}function u0(e,t,n,i){if(isNaN(t)||isNaN(n))return e;var r,s=e._root,o={data:i},a=e._x0,c=e._y0,l=e._x1,u=e._y1,h,d,f,m,_,g,p,b;if(!s)return e._root=o,e;for(;s.length;)if((_=t>=(h=(a+l)/2))?a=h:l=h,(g=n>=(d=(c+u)/2))?c=d:u=d,r=s,!(s=s[p=g<<1|_]))return r[p]=o,e;if(f=+e._x.call(null,s.data),m=+e._y.call(null,s.data),t===f&&n===m)return o.next=s,r?r[p]=o:e._root=o,e;do r=r?r[p]=new Array(4):e._root=new Array(4),(_=t>=(h=(a+l)/2))?a=h:l=h,(g=n>=(d=(c+u)/2))?c=d:u=d;while((p=g<<1|_)===(b=(m>=d)<<1|f>=h));return r[b]=s,r[p]=o,e}function BE(e){Array.isArray(e)||(e=Array.from(e));let t=e.length,n=new Float64Array(t),i=new Float64Array(t),r=1/0,s=r,o=-r,a=o;for(let c=0,l,u,h;c<t;++c){if(isNaN(u=+this._x.call(null,l=e[c]))||isNaN(h=+this._y.call(null,l))){n[c]=NaN;continue}n[c]=u,i[c]=h,u<r&&(r=u),u>o&&(o=u),h<s&&(s=h),h>a&&(a=h)}if(r>o||s>a)return this;this.cover(r,s).cover(o,a);for(let c=0;c<t;++c)u0(this,n[c],i[c],e[c]);return this}function VE(e,t){if(isNaN(e=+e)||isNaN(t=+t))return this;var n=this._x0,i=this._y0,r=this._x1,s=this._y1;if(isNaN(n))r=(n=Math.floor(e))+1,s=(i=Math.floor(t))+1;else{for(var o=r-n||1,a=this._root,c,l;n>e||e>=r||i>t||t>=s;)switch(l=(t<i)<<1|e<n,c=new Array(4),c[l]=a,a=c,o*=2,l){case 0:r=n+o,s=i+o;break;case 1:n=r-o,s=i+o;break;case 2:r=n+o,i=s-o;break;case 3:n=r-o,i=s-o;break}this._root&&this._root.length&&(this._root=a)}return this._x0=n,this._y0=i,this._x1=r,this._y1=s,this}function HE(){var e=[];return this.visit(function(t){if(!t.length)do e.push(t.data);while(t=t.next)}),e}function GE(e){return arguments.length?this.cover(+e[0][0],+e[0][1]).cover(+e[1][0],+e[1][1]):isNaN(this._x0)?void 0:[[this._x0,this._y0],[this._x1,this._y1]]}function cn(e,t,n,i,r){this.node=e,this.x0=t,this.y0=n,this.x1=i,this.y1=r}function WE(e,t,n){var i,r=this._x0,s=this._y0,o,a,c,l,u=this._x1,h=this._y1,d=[],f=this._root,m,_;for(f&&d.push(new cn(f,r,s,u,h)),n==null?n=1/0:(r=e-n,s=t-n,u=e+n,h=t+n,n*=n);m=d.pop();)if(!(!(f=m.node)||(o=m.x0)>u||(a=m.y0)>h||(c=m.x1)<r||(l=m.y1)<s))if(f.length){var g=(o+c)/2,p=(a+l)/2;d.push(new cn(f[3],g,p,c,l),new cn(f[2],o,p,g,l),new cn(f[1],g,a,c,p),new cn(f[0],o,a,g,p)),(_=(t>=p)<<1|e>=g)&&(m=d[d.length-1],d[d.length-1]=d[d.length-1-_],d[d.length-1-_]=m)}else{var b=e-+this._x.call(null,f.data),x=t-+this._y.call(null,f.data),v=b*b+x*x;if(v<n){var M=Math.sqrt(n=v);r=e-M,s=t-M,u=e+M,h=t+M,i=f.data}}return i}function jE(e){if(isNaN(u=+this._x.call(null,e))||isNaN(h=+this._y.call(null,e)))return this;var t,n=this._root,i,r,s,o=this._x0,a=this._y0,c=this._x1,l=this._y1,u,h,d,f,m,_,g,p;if(!n)return this;if(n.length)for(;;){if((m=u>=(d=(o+c)/2))?o=d:c=d,(_=h>=(f=(a+l)/2))?a=f:l=f,t=n,!(n=n[g=_<<1|m]))return this;if(!n.length)break;(t[g+1&3]||t[g+2&3]||t[g+3&3])&&(i=t,p=g)}for(;n.data!==e;)if(r=n,!(n=n.next))return this;return(s=n.next)&&delete n.next,r?(s?r.next=s:delete r.next,this):t?(s?t[g]=s:delete t[g],(n=t[0]||t[1]||t[2]||t[3])&&n===(t[3]||t[2]||t[1]||t[0])&&!n.length&&(i?i[p]=n:this._root=n),this):(this._root=s,this)}function qE(e){for(var t=0,n=e.length;t<n;++t)this.remove(e[t]);return this}function XE(){return this._root}function $E(){var e=0;return this.visit(function(t){if(!t.length)do++e;while(t=t.next)}),e}function YE(e){var t=[],n,i=this._root,r,s,o,a,c;for(i&&t.push(new cn(i,this._x0,this._y0,this._x1,this._y1));n=t.pop();)if(!e(i=n.node,s=n.x0,o=n.y0,a=n.x1,c=n.y1)&&i.length){var l=(s+a)/2,u=(o+c)/2;(r=i[3])&&t.push(new cn(r,l,u,a,c)),(r=i[2])&&t.push(new cn(r,s,u,l,c)),(r=i[1])&&t.push(new cn(r,l,o,a,u)),(r=i[0])&&t.push(new cn(r,s,o,l,u))}return this}function ZE(e){var t=[],n=[],i;for(this._root&&t.push(new cn(this._root,this._x0,this._y0,this._x1,this._y1));i=t.pop();){var r=i.node;if(r.length){var s,o=i.x0,a=i.y0,c=i.x1,l=i.y1,u=(o+c)/2,h=(a+l)/2;(s=r[0])&&t.push(new cn(s,o,a,u,h)),(s=r[1])&&t.push(new cn(s,u,a,c,h)),(s=r[2])&&t.push(new cn(s,o,h,u,l)),(s=r[3])&&t.push(new cn(s,u,h,c,l))}n.push(i)}for(;i=n.pop();)e(i.node,i.x0,i.y0,i.x1,i.y1);return this}function KE(e){return e[0]}function JE(e){return arguments.length?(this._x=e,this):this._x}function QE(e){return e[1]}function tT(e){return arguments.length?(this._y=e,this):this._y}function id(e,t,n){var i=new rd(t==null?KE:t,n==null?QE:n,NaN,NaN,NaN,NaN);return e==null?i:i.addAll(e)}function rd(e,t,n,i,r,s){this._x=e,this._y=t,this._x0=n,this._y0=i,this._x1=r,this._y1=s,this._root=void 0}function h0(e){for(var t={data:e.data},n=t;e=e.next;)n=n.next={data:e.data};return t}var ln=id.prototype=rd.prototype;ln.copy=function(){var e=new rd(this._x,this._y,this._x0,this._y0,this._x1,this._y1),t=this._root,n,i;if(!t)return e;if(!t.length)return e._root=h0(t),e;for(n=[{source:t,target:e._root=new Array(4)}];t=n.pop();)for(var r=0;r<4;++r)(i=t.source[r])&&(i.length?n.push({source:i,target:t.target[r]=new Array(4)}):t.target[r]=h0(i));return e};ln.add=kE;ln.addAll=BE;ln.cover=VE;ln.data=HE;ln.extent=GE;ln.find=WE;ln.remove=jE;ln.removeAll=qE;ln.root=XE;ln.size=$E;ln.visit=YE;ln.visitAfter=ZE;ln.x=JE;ln.y=tT;function f0(e){let t=+this._x.call(null,e),n=+this._y.call(null,e),i=+this._z.call(null,e);return d0(this.cover(t,n,i),t,n,i,e)}function d0(e,t,n,i,r){if(isNaN(t)||isNaN(n)||isNaN(i))return e;var s,o=e._root,a={data:r},c=e._x0,l=e._y0,u=e._z0,h=e._x1,d=e._y1,f=e._z1,m,_,g,p,b,x,v,M,S,C,P;if(!o)return e._root=a,e;for(;o.length;)if((v=t>=(m=(c+h)/2))?c=m:h=m,(M=n>=(_=(l+d)/2))?l=_:d=_,(S=i>=(g=(u+f)/2))?u=g:f=g,s=o,!(o=o[C=S<<2|M<<1|v]))return s[C]=a,e;if(p=+e._x.call(null,o.data),b=+e._y.call(null,o.data),x=+e._z.call(null,o.data),t===p&&n===b&&i===x)return a.next=o,s?s[C]=a:e._root=a,e;do s=s?s[C]=new Array(8):e._root=new Array(8),(v=t>=(m=(c+h)/2))?c=m:h=m,(M=n>=(_=(l+d)/2))?l=_:d=_,(S=i>=(g=(u+f)/2))?u=g:f=g;while((C=S<<2|M<<1|v)===(P=(x>=g)<<2|(b>=_)<<1|p>=m));return s[P]=o,s[C]=a,e}function p0(e){Array.isArray(e)||(e=Array.from(e));let t=e.length,n=new Float64Array(t),i=new Float64Array(t),r=new Float64Array(t),s=1/0,o=1/0,a=1/0,c=-1/0,l=-1/0,u=-1/0;for(let h=0,d,f,m,_;h<t;++h)isNaN(f=+this._x.call(null,d=e[h]))||isNaN(m=+this._y.call(null,d))||isNaN(_=+this._z.call(null,d))||(n[h]=f,i[h]=m,r[h]=_,f<s&&(s=f),f>c&&(c=f),m<o&&(o=m),m>l&&(l=m),_<a&&(a=_),_>u&&(u=_));if(s>c||o>l||a>u)return this;this.cover(s,o,a).cover(c,l,u);for(let h=0;h<t;++h)d0(this,n[h],i[h],r[h],e[h]);return this}function m0(e,t,n){if(isNaN(e=+e)||isNaN(t=+t)||isNaN(n=+n))return this;var i=this._x0,r=this._y0,s=this._z0,o=this._x1,a=this._y1,c=this._z1;if(isNaN(i))o=(i=Math.floor(e))+1,a=(r=Math.floor(t))+1,c=(s=Math.floor(n))+1;else{for(var l=o-i||1,u=this._root,h,d;i>e||e>=o||r>t||t>=a||s>n||n>=c;)switch(d=(n<s)<<2|(t<r)<<1|e<i,h=new Array(8),h[d]=u,u=h,l*=2,d){case 0:o=i+l,a=r+l,c=s+l;break;case 1:i=o-l,a=r+l,c=s+l;break;case 2:o=i+l,r=a-l,c=s+l;break;case 3:i=o-l,r=a-l,c=s+l;break;case 4:o=i+l,a=r+l,s=c-l;break;case 5:i=o-l,a=r+l,s=c-l;break;case 6:o=i+l,r=a-l,s=c-l;break;case 7:i=o-l,r=a-l,s=c-l;break}this._root&&this._root.length&&(this._root=u)}return this._x0=i,this._y0=r,this._z0=s,this._x1=o,this._y1=a,this._z1=c,this}function g0(){var e=[];return this.visit(function(t){if(!t.length)do e.push(t.data);while(t=t.next)}),e}function _0(e){return arguments.length?this.cover(+e[0][0],+e[0][1],+e[0][2]).cover(+e[1][0],+e[1][1],+e[1][2]):isNaN(this._x0)?void 0:[[this._x0,this._y0,this._z0],[this._x1,this._y1,this._z1]]}function ue(e,t,n,i,r,s,o){this.node=e,this.x0=t,this.y0=n,this.z0=i,this.x1=r,this.y1=s,this.z1=o}function v0(e,t,n,i){var r,s=this._x0,o=this._y0,a=this._z0,c,l,u,h,d,f,m=this._x1,_=this._y1,g=this._z1,p=[],b=this._root,x,v;for(b&&p.push(new ue(b,s,o,a,m,_,g)),i==null?i=1/0:(s=e-i,o=t-i,a=n-i,m=e+i,_=t+i,g=n+i,i*=i);x=p.pop();)if(!(!(b=x.node)||(c=x.x0)>m||(l=x.y0)>_||(u=x.z0)>g||(h=x.x1)<s||(d=x.y1)<o||(f=x.z1)<a))if(b.length){var M=(c+h)/2,S=(l+d)/2,C=(u+f)/2;p.push(new ue(b[7],M,S,C,h,d,f),new ue(b[6],c,S,C,M,d,f),new ue(b[5],M,l,C,h,S,f),new ue(b[4],c,l,C,M,S,f),new ue(b[3],M,S,u,h,d,C),new ue(b[2],c,S,u,M,d,C),new ue(b[1],M,l,u,h,S,C),new ue(b[0],c,l,u,M,S,C)),(v=(n>=C)<<2|(t>=S)<<1|e>=M)&&(x=p[p.length-1],p[p.length-1]=p[p.length-1-v],p[p.length-1-v]=x)}else{var P=e-+this._x.call(null,b.data),T=t-+this._y.call(null,b.data),w=n-+this._z.call(null,b.data),R=P*P+T*T+w*w;if(R<i){var V=Math.sqrt(i=R);s=e-V,o=t-V,a=n-V,m=e+V,_=t+V,g=n+V,r=b.data}}return r}var eT=(e,t,n,i,r,s)=>Math.sqrt((e-i)**2+(t-r)**2+(n-s)**2);function y0(e,t,n,i){let r=[],s=e-i,o=t-i,a=n-i,c=e+i,l=t+i,u=n+i;return this.visit((h,d,f,m,_,g,p)=>{if(!h.length)do{let b=h.data;eT(e,t,n,this._x(b),this._y(b),this._z(b))<=i&&r.push(b)}while(h=h.next);return d>c||f>l||m>u||_<s||g<o||p<a}),r}function x0(e){if(isNaN(d=+this._x.call(null,e))||isNaN(f=+this._y.call(null,e))||isNaN(m=+this._z.call(null,e)))return this;var t,n=this._root,i,r,s,o=this._x0,a=this._y0,c=this._z0,l=this._x1,u=this._y1,h=this._z1,d,f,m,_,g,p,b,x,v,M,S;if(!n)return this;if(n.length)for(;;){if((b=d>=(_=(o+l)/2))?o=_:l=_,(x=f>=(g=(a+u)/2))?a=g:u=g,(v=m>=(p=(c+h)/2))?c=p:h=p,t=n,!(n=n[M=v<<2|x<<1|b]))return this;if(!n.length)break;(t[M+1&7]||t[M+2&7]||t[M+3&7]||t[M+4&7]||t[M+5&7]||t[M+6&7]||t[M+7&7])&&(i=t,S=M)}for(;n.data!==e;)if(r=n,!(n=n.next))return this;return(s=n.next)&&delete n.next,r?(s?r.next=s:delete r.next,this):t?(s?t[M]=s:delete t[M],(n=t[0]||t[1]||t[2]||t[3]||t[4]||t[5]||t[6]||t[7])&&n===(t[7]||t[6]||t[5]||t[4]||t[3]||t[2]||t[1]||t[0])&&!n.length&&(i?i[S]=n:this._root=n),this):(this._root=s,this)}function b0(e){for(var t=0,n=e.length;t<n;++t)this.remove(e[t]);return this}function M0(){return this._root}function S0(){var e=0;return this.visit(function(t){if(!t.length)do++e;while(t=t.next)}),e}function w0(e){var t=[],n,i=this._root,r,s,o,a,c,l,u;for(i&&t.push(new ue(i,this._x0,this._y0,this._z0,this._x1,this._y1,this._z1));n=t.pop();)if(!e(i=n.node,s=n.x0,o=n.y0,a=n.z0,c=n.x1,l=n.y1,u=n.z1)&&i.length){var h=(s+c)/2,d=(o+l)/2,f=(a+u)/2;(r=i[7])&&t.push(new ue(r,h,d,f,c,l,u)),(r=i[6])&&t.push(new ue(r,s,d,f,h,l,u)),(r=i[5])&&t.push(new ue(r,h,o,f,c,d,u)),(r=i[4])&&t.push(new ue(r,s,o,f,h,d,u)),(r=i[3])&&t.push(new ue(r,h,d,a,c,l,f)),(r=i[2])&&t.push(new ue(r,s,d,a,h,l,f)),(r=i[1])&&t.push(new ue(r,h,o,a,c,d,f)),(r=i[0])&&t.push(new ue(r,s,o,a,h,d,f))}return this}function E0(e){var t=[],n=[],i;for(this._root&&t.push(new ue(this._root,this._x0,this._y0,this._z0,this._x1,this._y1,this._z1));i=t.pop();){var r=i.node;if(r.length){var s,o=i.x0,a=i.y0,c=i.z0,l=i.x1,u=i.y1,h=i.z1,d=(o+l)/2,f=(a+u)/2,m=(c+h)/2;(s=r[0])&&t.push(new ue(s,o,a,c,d,f,m)),(s=r[1])&&t.push(new ue(s,d,a,c,l,f,m)),(s=r[2])&&t.push(new ue(s,o,f,c,d,u,m)),(s=r[3])&&t.push(new ue(s,d,f,c,l,u,m)),(s=r[4])&&t.push(new ue(s,o,a,m,d,f,h)),(s=r[5])&&t.push(new ue(s,d,a,m,l,f,h)),(s=r[6])&&t.push(new ue(s,o,f,m,d,u,h)),(s=r[7])&&t.push(new ue(s,d,f,m,l,u,h))}n.push(i)}for(;i=n.pop();)e(i.node,i.x0,i.y0,i.z0,i.x1,i.y1,i.z1);return this}function T0(e){return e[0]}function A0(e){return arguments.length?(this._x=e,this):this._x}function C0(e){return e[1]}function R0(e){return arguments.length?(this._y=e,this):this._y}function P0(e){return e[2]}function I0(e){return arguments.length?(this._z=e,this):this._z}function la(e,t,n,i){var r=new sd(t==null?T0:t,n==null?C0:n,i==null?P0:i,NaN,NaN,NaN,NaN,NaN,NaN);return e==null?r:r.addAll(e)}function sd(e,t,n,i,r,s,o,a,c){this._x=e,this._y=t,this._z=n,this._x0=i,this._y0=r,this._z0=s,this._x1=o,this._y1=a,this._z1=c,this._root=void 0}function D0(e){for(var t={data:e.data},n=t;e=e.next;)n=n.next={data:e.data};return t}var je=la.prototype=sd.prototype;je.copy=function(){var e=new sd(this._x,this._y,this._z,this._x0,this._y0,this._z0,this._x1,this._y1,this._z1),t=this._root,n,i;if(!t)return e;if(!t.length)return e._root=D0(t),e;for(n=[{source:t,target:e._root=new Array(8)}];t=n.pop();)for(var r=0;r<8;++r)(i=t.source[r])&&(i.length?n.push({source:i,target:t.target[r]=new Array(8)}):t.target[r]=D0(i));return e};je.add=f0;je.addAll=p0;je.cover=m0;je.data=g0;je.extent=_0;je.find=v0;je.findAllWithinRadius=y0;je.remove=x0;je.removeAll=b0;je.root=M0;je.size=S0;je.visit=w0;je.visitAfter=E0;je.x=A0;je.y=R0;je.z=I0;function Vn(e){return function(){return e}}function ei(e){return(e()-.5)*1e-6}function nT(e){return e.index}function L0(e,t){var n=e.get(t);if(!n)throw new Error("node not found: "+t);return n}function od(e){var t=nT,n=d,i,r=Vn(30),s,o,a,c,l,u,h=1;e==null&&(e=[]);function d(p){return 1/Math.min(c[p.source.index],c[p.target.index])}function f(p){for(var b=0,x=e.length;b<h;++b)for(var v=0,M,S,C,P=0,T=0,w=0,R,V;v<x;++v)M=e[v],S=M.source,C=M.target,P=C.x+C.vx-S.x-S.vx||ei(u),a>1&&(T=C.y+C.vy-S.y-S.vy||ei(u)),a>2&&(w=C.z+C.vz-S.z-S.vz||ei(u)),R=Math.sqrt(P*P+T*T+w*w),R=(R-s[v])/R*p*i[v],P*=R,T*=R,w*=R,C.vx-=P*(V=l[v]),a>1&&(C.vy-=T*V),a>2&&(C.vz-=w*V),S.vx+=P*(V=1-V),a>1&&(S.vy+=T*V),a>2&&(S.vz+=w*V)}function m(){if(o){var p,b=o.length,x=e.length,v=new Map(o.map((S,C)=>[t(S,C,o),S])),M;for(p=0,c=new Array(b);p<x;++p)M=e[p],M.index=p,typeof M.source!="object"&&(M.source=L0(v,M.source)),typeof M.target!="object"&&(M.target=L0(v,M.target)),c[M.source.index]=(c[M.source.index]||0)+1,c[M.target.index]=(c[M.target.index]||0)+1;for(p=0,l=new Array(x);p<x;++p)M=e[p],l[p]=c[M.source.index]/(c[M.source.index]+c[M.target.index]);i=new Array(x),_(),s=new Array(x),g()}}function _(){if(o)for(var p=0,b=e.length;p<b;++p)i[p]=+n(e[p],p,e)}function g(){if(o)for(var p=0,b=e.length;p<b;++p)s[p]=+r(e[p],p,e)}return f.initialize=function(p,...b){o=p,u=b.find(x=>typeof x=="function")||Math.random,a=b.find(x=>[1,2,3].includes(x))||2,m()},f.links=function(p){return arguments.length?(e=p,m(),f):e},f.id=function(p){return arguments.length?(t=p,f):t},f.iterations=function(p){return arguments.length?(h=+p,f):h},f.strength=function(p){return arguments.length?(n=typeof p=="function"?p:Vn(+p),_(),f):n},f.distance=function(p){return arguments.length?(r=typeof p=="function"?p:Vn(+p),g(),f):r},f}var iT={value:()=>{}};function ad(){for(var e=0,t=arguments.length,n={},i;e<t;++e){if(!(i=arguments[e]+"")||i in n||/[\s.]/.test(i))throw new Error("illegal type: "+i);n[i]=[]}return new uh(n)}function uh(e){this._=e}function rT(e,t){return e.trim().split(/^|\s+/).map(function(n){var i="",r=n.indexOf(".");if(r>=0&&(i=n.slice(r+1),n=n.slice(0,r)),n&&!t.hasOwnProperty(n))throw new Error("unknown type: "+n);return{type:n,name:i}})}uh.prototype=ad.prototype={constructor:uh,on:function(e,t){var n=this._,i=rT(e+"",n),r,s=-1,o=i.length;if(arguments.length<2){for(;++s<o;)if((r=(e=i[s]).type)&&(r=sT(n[r],e.name)))return r;return}if(t!=null&&typeof t!="function")throw new Error("invalid callback: "+t);for(;++s<o;)if(r=(e=i[s]).type)n[r]=O0(n[r],e.name,t);else if(t==null)for(r in n)n[r]=O0(n[r],e.name,null);return this},copy:function(){var e={},t=this._;for(var n in t)e[n]=t[n].slice();return new uh(e)},call:function(e,t){if((r=arguments.length-2)>0)for(var n=new Array(r),i=0,r,s;i<r;++i)n[i]=arguments[i+2];if(!this._.hasOwnProperty(e))throw new Error("unknown type: "+e);for(s=this._[e],i=0,r=s.length;i<r;++i)s[i].value.apply(t,n)},apply:function(e,t,n){if(!this._.hasOwnProperty(e))throw new Error("unknown type: "+e);for(var i=this._[e],r=0,s=i.length;r<s;++r)i[r].value.apply(t,n)}};function sT(e,t){for(var n=0,i=e.length,r;n<i;++n)if((r=e[n]).name===t)return r.value}function O0(e,t,n){for(var i=0,r=e.length;i<r;++i)if(e[i].name===t){e[i]=iT,e=e.slice(0,i).concat(e.slice(i+1));break}return n!=null&&e.push({name:t,value:n}),e}var Vs=0,ua=0,ha=0,F0=1e3,fh,fa,dh=0,kr=0,ph=0,da=typeof performance=="object"&&performance.now?performance:Date,U0=typeof window=="object"&&window.requestAnimationFrame?window.requestAnimationFrame.bind(window):function(e){setTimeout(e,17)};function z0(){return kr||(U0(oT),kr=da.now()+ph)}function oT(){kr=0}function cd(){this._call=this._time=this._next=null}cd.prototype=hd.prototype={constructor:cd,restart:function(e,t,n){if(typeof e!="function")throw new TypeError("callback is not a function");n=(n==null?z0():+n)+(t==null?0:+t),!this._next&&fa!==this&&(fa?fa._next=this:fh=this,fa=this),this._call=e,this._time=n,ld()},stop:function(){this._call&&(this._call=null,this._time=1/0,ld())}};function hd(e,t,n){var i=new cd;return i.restart(e,t,n),i}function aT(){z0(),++Vs;for(var e=fh,t;e;)(t=kr-e._time)>=0&&e._call.call(void 0,t),e=e._next;--Vs}function N0(){kr=(dh=da.now())+ph,Vs=ua=0;try{aT()}finally{Vs=0,lT(),kr=0}}function cT(){var e=da.now(),t=e-dh;t>F0&&(ph-=t,dh=e)}function lT(){for(var e,t=fh,n,i=1/0;t;)t._call?(i>t._time&&(i=t._time),e=t,t=t._next):(n=t._next,t._next=null,t=e?e._next=n:fh=n);fa=e,ld(i)}function ld(e){if(!Vs){ua&&(ua=clearTimeout(ua));var t=e-kr;t>24?(e<1/0&&(ua=setTimeout(N0,Math.ceil(e-da.now()-ph)+1)),ha&&(ha=clearInterval(ha))):(ha||(dh=da.now(),ha=setInterval(cT,F0)),Vs=1,U0(N0))}}function k0(){let e=1;return()=>(e=(1664525*e+1013904223)%4294967296)/4294967296}var B0=3;function mh(e){return e.x}function ud(e){return e.y}function V0(e){return e.z}var hT=10,uT=Math.PI*(3-Math.sqrt(5)),fT=Math.PI*20/(9+Math.sqrt(221));function fd(e,t){t=t||2;var n=Math.min(B0,Math.max(1,Math.round(t))),i,r=1,s=.001,o=1-Math.pow(s,1/300),a=0,c=.6,l=new Map,u=hd(f),h=ad("tick","end"),d=k0();e==null&&(e=[]);function f(){m(),h.call("tick",i),r<s&&(u.stop(),h.call("end",i))}function m(p){var b,x=e.length,v;p===void 0&&(p=1);for(var M=0;M<p;++M)for(r+=(a-r)*o,l.forEach(function(S){S(r)}),b=0;b<x;++b)v=e[b],v.fx==null?v.x+=v.vx*=c:(v.x=v.fx,v.vx=0),n>1&&(v.fy==null?v.y+=v.vy*=c:(v.y=v.fy,v.vy=0)),n>2&&(v.fz==null?v.z+=v.vz*=c:(v.z=v.fz,v.vz=0));return i}function _(){for(var p=0,b=e.length,x;p<b;++p){if(x=e[p],x.index=p,x.fx!=null&&(x.x=x.fx),x.fy!=null&&(x.y=x.fy),x.fz!=null&&(x.z=x.fz),isNaN(x.x)||n>1&&isNaN(x.y)||n>2&&isNaN(x.z)){var v=hT*(n>2?Math.cbrt(.5+p):n>1?Math.sqrt(.5+p):p),M=p*uT,S=p*fT;n===1?x.x=v:n===2?(x.x=v*Math.cos(M),x.y=v*Math.sin(M)):(x.x=v*Math.sin(M)*Math.cos(S),x.y=v*Math.cos(M),x.z=v*Math.sin(M)*Math.sin(S))}(isNaN(x.vx)||n>1&&isNaN(x.vy)||n>2&&isNaN(x.vz))&&(x.vx=0,n>1&&(x.vy=0),n>2&&(x.vz=0))}}function g(p){return p.initialize&&p.initialize(e,d,n),p}return _(),i={tick:m,restart:function(){return u.restart(f),i},stop:function(){return u.stop(),i},numDimensions:function(p){return arguments.length?(n=Math.min(B0,Math.max(1,Math.round(p))),l.forEach(g),i):n},nodes:function(p){return arguments.length?(e=p,_(),l.forEach(g),i):e},alpha:function(p){return arguments.length?(r=+p,i):r},alphaMin:function(p){return arguments.length?(s=+p,i):s},alphaDecay:function(p){return arguments.length?(o=+p,i):+o},alphaTarget:function(p){return arguments.length?(a=+p,i):a},velocityDecay:function(p){return arguments.length?(c=1-p,i):1-c},randomSource:function(p){return arguments.length?(d=p,l.forEach(g),i):d},force:function(p,b){return arguments.length>1?(b==null?l.delete(p):l.set(p,g(b)),i):l.get(p)},find:function(){var p=Array.prototype.slice.call(arguments),b=p.shift()||0,x=(n>1?p.shift():null)||0,v=(n>2?p.shift():null)||0,M=p.shift()||1/0,S=0,C=e.length,P,T,w,R,V,N;for(M*=M,S=0;S<C;++S)V=e[S],P=b-V.x,T=x-(V.y||0),w=v-(V.z||0),R=P*P+T*T+w*w,R<M&&(N=V,M=R);return N},on:function(p,b){return arguments.length>1?(h.on(p,b),i):h.on(p)}}}function dd(){var e,t,n,i,r,s=Vn(-30),o,a=1,c=1/0,l=.81;function u(m){var _,g=e.length,p=(t===1?ca(e,mh):t===2?id(e,mh,ud):t===3?la(e,mh,ud,V0):null).visitAfter(d);for(r=m,_=0;_<g;++_)n=e[_],p.visit(f)}function h(){if(e){var m,_=e.length,g;for(o=new Array(_),m=0;m<_;++m)g=e[m],o[g.index]=+s(g,m,e)}}function d(m){var _=0,g,p,b=0,x,v,M,S,C=m.length;if(C){for(x=v=M=S=0;S<C;++S)(g=m[S])&&(p=Math.abs(g.value))&&(_+=g.value,b+=p,x+=p*(g.x||0),v+=p*(g.y||0),M+=p*(g.z||0));_*=Math.sqrt(4/C),m.x=x/b,t>1&&(m.y=v/b),t>2&&(m.z=M/b)}else{g=m,g.x=g.data.x,t>1&&(g.y=g.data.y),t>2&&(g.z=g.data.z);do _+=o[g.data.index];while(g=g.next)}m.value=_}function f(m,_,g,p,b){if(!m.value)return!0;var x=[g,p,b][t-1],v=m.x-n.x,M=t>1?m.y-n.y:0,S=t>2?m.z-n.z:0,C=x-_,P=v*v+M*M+S*S;if(C*C/l<P)return P<c&&(v===0&&(v=ei(i),P+=v*v),t>1&&M===0&&(M=ei(i),P+=M*M),t>2&&S===0&&(S=ei(i),P+=S*S),P<a&&(P=Math.sqrt(a*P)),n.vx+=v*m.value*r/P,t>1&&(n.vy+=M*m.value*r/P),t>2&&(n.vz+=S*m.value*r/P)),!0;if(m.length||P>=c)return;(m.data!==n||m.next)&&(v===0&&(v=ei(i),P+=v*v),t>1&&M===0&&(M=ei(i),P+=M*M),t>2&&S===0&&(S=ei(i),P+=S*S),P<a&&(P=Math.sqrt(a*P)));do m.data!==n&&(C=o[m.data.index]*r/P,n.vx+=v*C,t>1&&(n.vy+=M*C),t>2&&(n.vz+=S*C));while(m=m.next)}return u.initialize=function(m,..._){e=m,i=_.find(g=>typeof g=="function")||Math.random,t=_.find(g=>[1,2,3].includes(g))||2,h()},u.strength=function(m){return arguments.length?(s=typeof m=="function"?m:Vn(+m),h(),u):s},u.distanceMin=function(m){return arguments.length?(a=m*m,u):Math.sqrt(a)},u.distanceMax=function(m){return arguments.length?(c=m*m,u):Math.sqrt(c)},u.theta=function(m){return arguments.length?(l=m*m,u):Math.sqrt(l)},u}function pd(e,t,n,i){var r,s,o=Vn(.1),a,c;typeof e!="function"&&(e=Vn(+e)),t==null&&(t=0),n==null&&(n=0),i==null&&(i=0);function l(h){for(var d=0,f=r.length;d<f;++d){var m=r[d],_=m.x-t||1e-6,g=(m.y||0)-n||1e-6,p=(m.z||0)-i||1e-6,b=Math.sqrt(_*_+g*g+p*p),x=(c[d]-b)*a[d]*h/b;m.vx+=_*x,s>1&&(m.vy+=g*x),s>2&&(m.vz+=p*x)}}function u(){if(r){var h,d=r.length;for(a=new Array(d),c=new Array(d),h=0;h<d;++h)c[h]=+e(r[h],h,r),a[h]=isNaN(c[h])?0:+o(r[h],h,r)}}return l.initialize=function(h,...d){r=h,s=d.find(f=>[1,2,3].includes(f))||2,u()},l.strength=function(h){return arguments.length?(o=typeof h=="function"?h:Vn(+h),u(),l):o},l.radius=function(h){return arguments.length?(e=typeof h=="function"?h:Vn(+h),u(),l):e},l.x=function(h){return arguments.length?(t=+h,l):t},l.y=function(h){return arguments.length?(n=+h,l):n},l.z=function(h){return arguments.length?(i=+h,l):i},l}function md(e){pT(e);let t=dT(e);return e.on=t.on,e.off=t.off,e.fire=t.fire,e}function dT(e){let t=Object.create(null);return{on:function(n,i,r){if(typeof i!="function")throw new Error("callback is expected to be a function");let s=t[n];return s||(s=t[n]=[]),s.push({callback:i,ctx:r}),e},off:function(n,i){if(typeof n=="undefined")return t=Object.create(null),e;if(t[n])if(typeof i!="function")delete t[n];else{let o=t[n];for(let a=0;a<o.length;++a)o[a].callback===i&&o.splice(a,1)}return e},fire:function(n){let i=t[n];if(!i)return e;let r;arguments.length>1&&(r=Array.prototype.slice.call(arguments,1));for(let s=0;s<i.length;++s){let o=i[s];o.callback.apply(o.ctx,r)}return e}}}function pT(e){if(!e)throw new Error("Eventify cannot use falsy object as events subject");let t=["on","fire","off"];for(let n=0;n<t.length;++n)if(e.hasOwnProperty(t[n]))throw new Error("Subject cannot be eventified, since it already has property '"+t[n]+"'")}var W0=mT;function mT(e){if(e=e||{},"uniqueLinkId"in e&&(console.warn("ngraph.graph: Starting from version 0.14 `uniqueLinkId` is deprecated.\nUse `multigraph` option instead\n",`
`,`Note: there is also change in default behavior: From now on each graph
is considered to be not a multigraph by default (each edge is unique).`),e.multigraph=e.uniqueLinkId),e.multigraph===void 0&&(e.multigraph=!1),typeof Map!="function")throw new Error("ngraph.graph requires `Map` to be defined. Please polyfill it before using ngraph");var t=new Map,n=new Map,i={},r=0,s=e.multigraph?v:x,o=[],a=K,c=K,l=K,u=K,h={version:20,addNode:_,addLink:b,removeLink:P,removeNode:p,getNode:g,getNodeCount:M,getLinkCount:S,getEdgeCount:S,getLinksCount:S,getNodesCount:M,getLinks:C,forEachNode:_t,forEachLinkedNode:k,forEachLink:N,beginUpdate:l,endUpdate:u,clear:V,hasLink:w,hasNode:g,getLink:w,getLinkById:R};return md(h),d(),h;function d(){var $=h.on;h.on=rt;function rt(){return h.beginUpdate=l=j,h.endUpdate=u=at,a=f,c=m,h.on=$,$.apply(h,arguments)}}function f($,rt){o.push({link:$,changeType:rt})}function m($,rt){o.push({node:$,changeType:rt})}function _($,rt){if($===void 0)throw new Error("Invalid node identifier");l();var pt=g($);return pt?(pt.data=rt,c(pt,"update")):(pt=new gT($,rt),c(pt,"add")),t.set($,pt),u(),pt}function g($){return t.get($)}function p($){var rt=g($);if(!rt)return!1;l();var pt=rt.links;return pt&&(pt.forEach(T),rt.links=null),t.delete($),c(rt,"remove"),u(),!0}function b($,rt,pt){l();var zt=g($)||_($),Lt=g(rt)||_(rt),X=s($,rt,pt),tt=n.has(X.id);return n.set(X.id,X),H0(zt,X),$!==rt&&H0(Lt,X),a(X,tt?"update":"add"),u(),X}function x($,rt,pt){var zt=gh($,rt),Lt=n.get(zt);return Lt?(Lt.data=pt,Lt):new G0($,rt,pt,zt)}function v($,rt,pt){var zt=gh($,rt),Lt=i.hasOwnProperty(zt);if(Lt||w($,rt)){Lt||(i[zt]=0);var X="@"+ ++i[zt];zt=gh($+X,rt+X)}return new G0($,rt,pt,zt)}function M(){return t.size}function S(){return n.size}function C($){var rt=g($);return rt?rt.links:null}function P($,rt){return rt!==void 0&&($=w($,rt)),T($)}function T($){if(!$||!n.get($.id))return!1;l(),n.delete($.id);var rt=g($.fromId),pt=g($.toId);return rt&&rt.links.delete($),pt&&pt.links.delete($),a($,"remove"),u(),!0}function w($,rt){if(!($===void 0||rt===void 0))return n.get(gh($,rt))}function R($){if($!==void 0)return n.get($)}function V(){l(),_t(function($){p($.id)}),u()}function N($){if(typeof $=="function")for(var rt=n.values(),pt=rt.next();!pt.done;){if($(pt.value))return!0;pt=rt.next()}}function k($,rt,pt){var zt=g($);if(zt&&zt.links&&typeof rt=="function")return pt?G(zt.links,$,rt):z(zt.links,$,rt)}function z($,rt,pt){for(var zt,Lt=$.values(),X=Lt.next();!X.done;){var tt=X.value,yt=tt.fromId===rt?tt.toId:tt.fromId;if(zt=pt(t.get(yt),tt),zt)return!0;X=Lt.next()}}function G($,rt,pt){for(var zt,Lt=$.values(),X=Lt.next();!X.done;){var tt=X.value;if(tt.fromId===rt&&(zt=pt(t.get(tt.toId),tt),zt))return!0;X=Lt.next()}}function K(){}function j(){r+=1}function at(){r-=1,r===0&&o.length>0&&(h.fire("changed",o),o.length=0)}function _t($){if(typeof $!="function")throw new Error("Function is expected to iterate over graph nodes. You passed "+$);for(var rt=t.values(),pt=rt.next();!pt.done;){if($(pt.value))return!0;pt=rt.next()}}}function gT(e,t){this.id=e,this.links=null,this.data=t}function H0(e,t){e.links?e.links.add(t):e.links=new Set([t])}function G0(e,t,n,i){this.fromId=e,this.toId=t,this.data=n,this.id=i}function gh(e,t){return e.toString()+"\u{1F449} "+t.toString()}var Bv=rb(S_(),1);function $T(e){var t=typeof e;return e!=null&&(t=="object"||t=="function")}var ma=$T;var YT=typeof global=="object"&&global&&global.Object===Object&&global,w_=YT;var ZT=typeof self=="object"&&self&&self.Object===Object&&self,KT=w_||ZT||Function("return this")(),vh=KT;var JT=function(){return vh.Date.now()},yh=JT;var QT=/\s/;function tA(e){for(var t=e.length;t--&&QT.test(e.charAt(t)););return t}var E_=tA;var eA=/^\s+/;function nA(e){return e&&e.slice(0,E_(e)+1).replace(eA,"")}var T_=nA;var iA=vh.Symbol,Hs=iA;var A_=Object.prototype,rA=A_.hasOwnProperty,sA=A_.toString,ga=Hs?Hs.toStringTag:void 0;function oA(e){var t=rA.call(e,ga),n=e[ga];try{e[ga]=void 0;var i=!0}catch(s){}var r=sA.call(e);return i&&(t?e[ga]=n:delete e[ga]),r}var C_=oA;var aA=Object.prototype,cA=aA.toString;function lA(e){return cA.call(e)}var R_=lA;var hA="[object Null]",uA="[object Undefined]",P_=Hs?Hs.toStringTag:void 0;function fA(e){return e==null?e===void 0?uA:hA:P_&&P_ in Object(e)?C_(e):R_(e)}var I_=fA;function dA(e){return e!=null&&typeof e=="object"}var D_=dA;var pA="[object Symbol]";function mA(e){return typeof e=="symbol"||D_(e)&&I_(e)==pA}var L_=mA;var O_=NaN,gA=/^[-+]0x[0-9a-f]+$/i,_A=/^0b[01]+$/i,vA=/^0o[0-7]+$/i,yA=parseInt;function xA(e){if(typeof e=="number")return e;if(L_(e))return O_;if(ma(e)){var t=typeof e.valueOf=="function"?e.valueOf():e;e=ma(t)?t+"":t}if(typeof e!="string")return e===0?e:+e;e=T_(e);var n=_A.test(e);return n||vA.test(e)?yA(e.slice(2),n?2:8):gA.test(e)?O_:+e}var Ad=xA;var bA="Expected a function",MA=Math.max,SA=Math.min;function wA(e,t,n){var i,r,s,o,a,c,l=0,u=!1,h=!1,d=!0;if(typeof e!="function")throw new TypeError(bA);t=Ad(t)||0,ma(n)&&(u=!!n.leading,h="maxWait"in n,s=h?MA(Ad(n.maxWait)||0,t):s,d="trailing"in n?!!n.trailing:d);function f(S){var C=i,P=r;return i=r=void 0,l=S,o=e.apply(P,C),o}function m(S){return l=S,a=setTimeout(p,t),u?f(S):o}function _(S){var C=S-c,P=S-l,T=t-C;return h?SA(T,s-P):T}function g(S){var C=S-c,P=S-l;return c===void 0||C>=t||C<0||h&&P>=s}function p(){var S=yh();if(g(S))return b(S);a=setTimeout(p,_(S))}function b(S){return a=void 0,d&&i?f(S):(i=r=void 0,o)}function x(){a!==void 0&&clearTimeout(a),l=0,i=c=r=a=void 0}function v(){return a===void 0?o:b(yh())}function M(){var S=yh(),C=g(S);if(i=arguments,r=this,c=S,C){if(a===void 0)return m(c);if(h)return clearTimeout(a),a=setTimeout(p,t),f(c)}return a===void 0&&(a=setTimeout(p,t)),o}return M.cancel=x,M.flush=v,M}var N_=wA;function F_(e,t){(t==null||t>e.length)&&(t=e.length);for(var n=0,i=Array(t);n<t;n++)i[n]=e[n];return i}function EA(e){if(Array.isArray(e))return e}function TA(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}function AA(e,t,n){return Object.defineProperty(e,"prototype",{writable:!1}),e}function CA(e,t){var n=e==null?null:typeof Symbol!="undefined"&&e[Symbol.iterator]||e["@@iterator"];if(n!=null){var i,r,s,o,a=[],c=!0,l=!1;try{if(s=(n=n.call(e)).next,t!==0)for(;!(c=(i=s.call(n)).done)&&(a.push(i.value),a.length!==t);c=!0);}catch(u){l=!0,r=u}finally{try{if(!c&&n.return!=null&&(o=n.return(),Object(o)!==o))return}finally{if(l)throw r}}return a}}function RA(){throw new TypeError(`Invalid attempt to destructure non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}function PA(e,t){return EA(e)||CA(e,t)||IA(e,t)||RA()}function IA(e,t){if(e){if(typeof e=="string")return F_(e,t);var n={}.toString.call(e).slice(8,-1);return n==="Object"&&e.constructor&&(n=e.constructor.name),n==="Map"||n==="Set"?Array.from(e):n==="Arguments"||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)?F_(e,t):void 0}}var DA=AA(function e(t,n){var i=n.default,r=i===void 0?null:i,s=n.triggerUpdate,o=s===void 0?!0:s,a=n.onChange,c=a===void 0?function(l,u){}:a;TA(this,e),this.name=t,this.defaultVal=r,this.triggerUpdate=o,this.onChange=c});function rr(e){var t=e.stateInit,n=t===void 0?function(){return{}}:t,i=e.props,r=i===void 0?{}:i,s=e.methods,o=s===void 0?{}:s,a=e.aliases,c=a===void 0?{}:a,l=e.init,u=l===void 0?function(){}:l,h=e.update,d=h===void 0?function(){}:h,f=Object.keys(r).map(function(m){return new DA(m,r[m])});return function m(){for(var _=arguments.length,g=new Array(_),p=0;p<_;p++)g[p]=arguments[p];var b=!!(this instanceof m&&this.constructor),x=b?g.shift():void 0,v=g[0],M=v===void 0?{}:v,S=Object.assign({},n instanceof Function?n(M):n,{initialised:!1}),C={};function P(R){return T(R,M),w(),P}var T=function(V,N){u.call(P,V,S,N),S.initialised=!0},w=N_(function(){S.initialised&&(d.call(P,S,C),C={})},1);return f.forEach(function(R){P[R.name]=V(R);function V(N){var k=N.name,z=N.triggerUpdate,G=z===void 0?!1:z,K=N.onChange,j=K===void 0?function($,rt){}:K,at=N.defaultVal,_t=at===void 0?null:at;return function($){var rt=S[k];if(!arguments.length)return rt;var pt=$===void 0?_t:$;return S[k]=pt,j.call(P,pt,S,rt),!C.hasOwnProperty(k)&&(C[k]=rt),G&&w(),P}}}),Object.keys(o).forEach(function(R){P[R]=function(){for(var V,N=arguments.length,k=new Array(N),z=0;z<N;z++)k[z]=arguments[z];return(V=o[R]).call.apply(V,[P,S].concat(k))}}),Object.entries(c).forEach(function(R){var V=PA(R,2),N=V[0],k=V[1];return P[N]=P[k]}),P.resetProps=function(){return f.forEach(function(R){P[R.name](R.defaultVal)}),P},P.resetProps(),S._rerender=w,b&&x&&P(x),P}}var Zt=(function(e){return typeof e=="function"?e:typeof e=="string"?function(t){return t[e]}:function(t){return e}});function _a(e,t){return e==null||t==null?NaN:e<t?-1:e>t?1:e>=t?0:NaN}function LA(e,t){return e==null||t==null?NaN:t<e?-1:t>e?1:t>=e?0:NaN}function z_(e){let t,n,i;e.length!==2?(t=_a,n=(a,c)=>_a(e(a),c),i=(a,c)=>e(a)-c):(t=e===_a||e===LA?e:OA,n=e,i=e);function r(a,c,l=0,u=a.length){if(l<u){if(t(c,c)!==0)return u;do{let h=l+u>>>1;n(a[h],c)<0?l=h+1:u=h}while(l<u)}return l}function s(a,c,l=0,u=a.length){if(l<u){if(t(c,c)!==0)return u;do{let h=l+u>>>1;n(a[h],c)<=0?l=h+1:u=h}while(l<u)}return l}function o(a,c,l=0,u=a.length){let h=r(a,c,l,u-1);return h>l&&i(a[h-1],c)>-i(a[h],c)?h-1:h}return{left:r,center:o,right:s}}function OA(){return 0}function NA(e){return e===null?NaN:+e}var k_=z_(_a),FA=k_.right,UU=k_.left,zU=z_(NA).center;var kU=B_(V_),BU=B_(UA);function B_(e){return function(t,n,i=n){if(!((n=+n)>=0))throw new RangeError("invalid rx");if(!((i=+i)>=0))throw new RangeError("invalid ry");let{data:r,width:s,height:o}=t;if(!((s=Math.floor(s))>=0))throw new RangeError("invalid width");if(!((o=Math.floor(o!==void 0?o:r.length/s))>=0))throw new RangeError("invalid height");if(!s||!o||!n&&!i)return t;let a=n&&e(n),c=i&&e(i),l=r.slice();return a&&c?(Gs(a,l,r,s,o),Gs(a,r,l,s,o),Gs(a,l,r,s,o),Ws(c,r,l,s,o),Ws(c,l,r,s,o),Ws(c,r,l,s,o)):a?(Gs(a,r,l,s,o),Gs(a,l,r,s,o),Gs(a,r,l,s,o)):c&&(Ws(c,r,l,s,o),Ws(c,l,r,s,o),Ws(c,r,l,s,o)),t}}function Gs(e,t,n,i,r){for(let s=0,o=i*r;s<o;)e(t,n,s,s+=i,1)}function Ws(e,t,n,i,r){for(let s=0,o=i*r;s<i;++s)e(t,n,s,s+o,i)}function UA(e){let t=V_(e);return(n,i,r,s,o)=>{r<<=2,s<<=2,o<<=2,t(n,i,r+0,s+0,o),t(n,i,r+1,s+1,o),t(n,i,r+2,s+2,o),t(n,i,r+3,s+3,o)}}function V_(e){let t=Math.floor(e);if(t===e)return zA(e);let n=e-t,i=2*e+1;return(r,s,o,a,c)=>{if(!((a-=c)>=o))return;let l=t*s[o],u=c*t,h=u+c;for(let d=o,f=o+u;d<f;d+=c)l+=s[Math.min(a,d)];for(let d=o,f=a;d<=f;d+=c)l+=s[Math.min(a,d+u)],r[d]=(l+n*(s[Math.max(o,d-h)]+s[Math.min(a,d+h)]))/i,l-=s[Math.max(o,d-u)]}}function zA(e){let t=2*e+1;return(n,i,r,s,o)=>{if(!((s-=o)>=r))return;let a=e*i[r],c=o*e;for(let l=r,u=r+c;l<u;l+=o)a+=i[Math.min(s,l)];for(let l=r,u=s;l<=u;l+=o)a+=i[Math.min(s,l+c)],n[l]=a/t,a-=i[Math.max(r,l-c)]}}var va=class extends Map{constructor(t,n=VA){if(super(),Object.defineProperties(this,{_intern:{value:new Map},_key:{value:n}}),t!=null)for(let[i,r]of t)this.set(i,r)}get(t){return super.get(U_(this,t))}has(t){return super.has(U_(this,t))}set(t,n){return super.set(kA(this,t),n)}delete(t){return super.delete(BA(this,t))}};function U_({_intern:e,_key:t},n){let i=t(n);return e.has(i)?e.get(i):n}function kA({_intern:e,_key:t},n){let i=t(n);return e.has(i)?e.get(i):(e.set(i,n),n)}function BA({_intern:e,_key:t},n){let i=t(n);return e.has(i)&&(n=e.get(i),e.delete(i)),n}function VA(e){return e!==null&&typeof e=="object"?e.valueOf():e}var HA=Array.prototype,VU=HA.slice;var HU=Math.sqrt(50),GU=Math.sqrt(10),WU=Math.sqrt(2);function H_(e,t){let n;if(t===void 0)for(let i of e)i!=null&&(n<i||n===void 0&&i>=i)&&(n=i);else{let i=-1;for(let r of e)(r=t(r,++i,e))!=null&&(n<r||n===void 0&&r>=r)&&(n=r)}return n}function G_(e,t){let n;if(t===void 0)for(let i of e)i!=null&&(n>i||n===void 0&&i>=i)&&(n=i);else{let i=-1;for(let r of e)(r=t(r,++i,e))!=null&&(n>r||n===void 0&&r>=r)&&(n=r)}return n}var jU=GA(Math.random);function GA(e){return function(n,i=0,r=n.length){let s=r-(i=+i);for(;s;){let o=e()*s--|0,a=n[s+i];n[s+i]=n[o+i],n[o+i]=a}return n}}function Id(e,t){(t==null||t>e.length)&&(t=e.length);for(var n=0,i=Array(t);n<t;n++)i[n]=e[n];return i}function WA(e){if(Array.isArray(e))return e}function jA(e){if(Array.isArray(e))return Id(e)}function W_(e,t,n){if(typeof e=="function"?e===t:e.has(t))return arguments.length<3?t:n;throw new TypeError("Private element is not present on this object")}function qA(e,t){if(t.has(e))throw new TypeError("Cannot initialize the same private elements twice on an object")}function XA(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}function tn(e,t){return e.get(W_(e,t))}function js(e,t,n){qA(e,t),t.set(e,n)}function xh(e,t,n){return e.set(W_(e,t),n),n}function $A(e,t){for(var n=0;n<t.length;n++){var i=t[n];i.enumerable=i.enumerable||!1,i.configurable=!0,"value"in i&&(i.writable=!0),Object.defineProperty(e,i2(i.key),i)}}function YA(e,t,n){return t&&$A(e.prototype,t),Object.defineProperty(e,"prototype",{writable:!1}),e}function ZA(e){if(typeof Symbol!="undefined"&&e[Symbol.iterator]!=null||e["@@iterator"]!=null)return Array.from(e)}function KA(e,t){var n=e==null?null:typeof Symbol!="undefined"&&e[Symbol.iterator]||e["@@iterator"];if(n!=null){var i,r,s,o,a=[],c=!0,l=!1;try{if(s=(n=n.call(e)).next,t!==0)for(;!(c=(i=s.call(n)).done)&&(a.push(i.value),a.length!==t);c=!0);}catch(u){l=!0,r=u}finally{try{if(!c&&n.return!=null&&(o=n.return(),Object(o)!==o))return}finally{if(l)throw r}}return a}}function JA(){throw new TypeError(`Invalid attempt to destructure non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}function QA(){throw new TypeError(`Invalid attempt to spread non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}function t2(e,t){return WA(e)||KA(e,t)||j_(e,t)||JA()}function e2(e){return jA(e)||ZA(e)||j_(e)||QA()}function n2(e,t){if(typeof e!="object"||!e)return e;var n=e[Symbol.toPrimitive];if(n!==void 0){var i=n.call(e,t);if(typeof i!="object")return i;throw new TypeError("@@toPrimitive must return a primitive value.")}return String(e)}function i2(e){var t=n2(e,"string");return typeof t=="symbol"?t:t+""}function j_(e,t){if(e){if(typeof e=="string")return Id(e,t);var n={}.toString.call(e).slice(8,-1);return n==="Object"&&e.constructor&&(n=e.constructor.name),n==="Map"||n==="Set"?Array.from(e):n==="Arguments"||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)?Id(e,t):void 0}}var qs=new WeakMap,ya=new WeakMap,Xs=new WeakMap,Cd=new WeakMap,Rd=new WeakMap,Pd=new WeakMap,q_=(function(){function e(){XA(this,e),js(this,qs,new Map),js(this,ya,new Map),js(this,Xs,function(t){return t}),js(this,Cd,function(){return{}}),js(this,Rd,function(){}),js(this,Pd,function(){})}return YA(e,[{key:"getObj",value:function(n){return tn(qs,this).get(tn(Xs,this).call(this,n))}},{key:"getData",value:function(n){return tn(ya,this).get(n)}},{key:"entries",value:function(){return e2(tn(ya,this).entries()).map(function(n){var i=t2(n,2),r=i[0],s=i[1];return[s,r]})}},{key:"id",value:function(n){return xh(Xs,this,Zt(n)),this}},{key:"onCreateObj",value:function(n){return xh(Cd,this,n),this}},{key:"onUpdateObj",value:function(n){return xh(Rd,this,n),this}},{key:"onRemoveObj",value:function(n){return xh(Pd,this,n),this}},{key:"digest",value:function(n){var i=this;n.filter(function(s){return!tn(qs,i).has(tn(Xs,i).call(i,s))}).forEach(function(s){var o=tn(Cd,i).call(i,s);tn(qs,i).set(tn(Xs,i).call(i,s),o),tn(ya,i).set(o,s)});var r=new Map(n.map(function(s){return[tn(Xs,i).call(i,s),s]}));return tn(qs,this).forEach(function(s,o){r.has(o)?tn(Rd,i).call(i,s,r.get(o)):(tn(Pd,i).call(i,s,o),tn(qs,i).delete(o),tn(ya,i).delete(s))}),this}},{key:"clear",value:function(){return this.digest([]),this}}])})();function Ks(e,t,n){e.prototype=t.prototype=n,n.constructor=e}function Ma(e,t){var n=Object.create(e.prototype);for(var i in t)n[i]=t[i];return n}function sr(){}var jr=.7,Zs=1/jr,$s="\\s*([+-]?\\d+)\\s*",xa="\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)\\s*",vi="\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)%\\s*",r2=/^#([0-9a-f]{3,8})$/,s2=new RegExp(`^rgb\\(${$s},${$s},${$s}\\)$`),o2=new RegExp(`^rgb\\(${vi},${vi},${vi}\\)$`),a2=new RegExp(`^rgba\\(${$s},${$s},${$s},${xa}\\)$`),c2=new RegExp(`^rgba\\(${vi},${vi},${vi},${xa}\\)$`),l2=new RegExp(`^hsl\\(${xa},${vi},${vi}\\)$`),h2=new RegExp(`^hsla\\(${xa},${vi},${vi},${xa}\\)$`),X_={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074};Ks(sr,Eh,{copy(e){return Object.assign(new this.constructor,this,e)},displayable(){return this.rgb().displayable()},hex:$_,formatHex:$_,formatHex8:u2,formatHsl:f2,formatRgb:Y_,toString:Y_});function $_(){return this.rgb().formatHex()}function u2(){return this.rgb().formatHex8()}function f2(){return rv(this).formatHsl()}function Y_(){return this.rgb().formatRgb()}function Eh(e){var t,n;return e=(e+"").trim().toLowerCase(),(t=r2.exec(e))?(n=t[1].length,t=parseInt(t[1],16),n===6?Z_(t):n===3?new Ve(t>>8&15|t>>4&240,t>>4&15|t&240,(t&15)<<4|t&15,1):n===8?bh(t>>24&255,t>>16&255,t>>8&255,(t&255)/255):n===4?bh(t>>12&15|t>>8&240,t>>8&15|t>>4&240,t>>4&15|t&240,((t&15)<<4|t&15)/255):null):(t=s2.exec(e))?new Ve(t[1],t[2],t[3],1):(t=o2.exec(e))?new Ve(t[1]*255/100,t[2]*255/100,t[3]*255/100,1):(t=a2.exec(e))?bh(t[1],t[2],t[3],t[4]):(t=c2.exec(e))?bh(t[1]*255/100,t[2]*255/100,t[3]*255/100,t[4]):(t=l2.exec(e))?Q_(t[1],t[2]/100,t[3]/100,1):(t=h2.exec(e))?Q_(t[1],t[2]/100,t[3]/100,t[4]):X_.hasOwnProperty(e)?Z_(X_[e]):e==="transparent"?new Ve(NaN,NaN,NaN,0):null}function Z_(e){return new Ve(e>>16&255,e>>8&255,e&255,1)}function bh(e,t,n,i){return i<=0&&(e=t=n=NaN),new Ve(e,t,n,i)}function Ud(e){return e instanceof sr||(e=Eh(e)),e?(e=e.rgb(),new Ve(e.r,e.g,e.b,e.opacity)):new Ve}function qr(e,t,n,i){return arguments.length===1?Ud(e):new Ve(e,t,n,i==null?1:i)}function Ve(e,t,n,i){this.r=+e,this.g=+t,this.b=+n,this.opacity=+i}Ks(Ve,qr,Ma(sr,{brighter(e){return e=e==null?Zs:Math.pow(Zs,e),new Ve(this.r*e,this.g*e,this.b*e,this.opacity)},darker(e){return e=e==null?jr:Math.pow(jr,e),new Ve(this.r*e,this.g*e,this.b*e,this.opacity)},rgb(){return this},clamp(){return new Ve(Gr(this.r),Gr(this.g),Gr(this.b),Sh(this.opacity))},displayable(){return-.5<=this.r&&this.r<255.5&&-.5<=this.g&&this.g<255.5&&-.5<=this.b&&this.b<255.5&&0<=this.opacity&&this.opacity<=1},hex:K_,formatHex:K_,formatHex8:d2,formatRgb:J_,toString:J_}));function K_(){return`#${Hr(this.r)}${Hr(this.g)}${Hr(this.b)}`}function d2(){return`#${Hr(this.r)}${Hr(this.g)}${Hr(this.b)}${Hr((isNaN(this.opacity)?1:this.opacity)*255)}`}function J_(){let e=Sh(this.opacity);return`${e===1?"rgb(":"rgba("}${Gr(this.r)}, ${Gr(this.g)}, ${Gr(this.b)}${e===1?")":`, ${e})`}`}function Sh(e){return isNaN(e)?1:Math.max(0,Math.min(1,e))}function Gr(e){return Math.max(0,Math.min(255,Math.round(e)||0))}function Hr(e){return e=Gr(e),(e<16?"0":"")+e.toString(16)}function Q_(e,t,n,i){return i<=0?e=t=n=NaN:n<=0||n>=1?e=t=NaN:t<=0&&(e=NaN),new ni(e,t,n,i)}function rv(e){if(e instanceof ni)return new ni(e.h,e.s,e.l,e.opacity);if(e instanceof sr||(e=Eh(e)),!e)return new ni;if(e instanceof ni)return e;e=e.rgb();var t=e.r/255,n=e.g/255,i=e.b/255,r=Math.min(t,n,i),s=Math.max(t,n,i),o=NaN,a=s-r,c=(s+r)/2;return a?(t===s?o=(n-i)/a+(n<i)*6:n===s?o=(i-t)/a+2:o=(t-n)/a+4,a/=c<.5?s+r:2-s-r,o*=60):a=c>0&&c<1?0:o,new ni(o,a,c,e.opacity)}function Th(e,t,n,i){return arguments.length===1?rv(e):new ni(e,t,n,i==null?1:i)}function ni(e,t,n,i){this.h=+e,this.s=+t,this.l=+n,this.opacity=+i}Ks(ni,Th,Ma(sr,{brighter(e){return e=e==null?Zs:Math.pow(Zs,e),new ni(this.h,this.s,this.l*e,this.opacity)},darker(e){return e=e==null?jr:Math.pow(jr,e),new ni(this.h,this.s,this.l*e,this.opacity)},rgb(){var e=this.h%360+(this.h<0)*360,t=isNaN(e)||isNaN(this.s)?0:this.s,n=this.l,i=n+(n<.5?n:1-n)*t,r=2*n-i;return new Ve(Dd(e>=240?e-240:e+120,r,i),Dd(e,r,i),Dd(e<120?e+240:e-120,r,i),this.opacity)},clamp(){return new ni(tv(this.h),Mh(this.s),Mh(this.l),Sh(this.opacity))},displayable(){return(0<=this.s&&this.s<=1||isNaN(this.s))&&0<=this.l&&this.l<=1&&0<=this.opacity&&this.opacity<=1},formatHsl(){let e=Sh(this.opacity);return`${e===1?"hsl(":"hsla("}${tv(this.h)}, ${Mh(this.s)*100}%, ${Mh(this.l)*100}%${e===1?")":`, ${e})`}`}}));function tv(e){return e=(e||0)%360,e<0?e+360:e}function Mh(e){return Math.max(0,Math.min(1,e||0))}function Dd(e,t,n){return(e<60?t+(n-t)*e/60:e<180?n:e<240?t+(n-t)*(240-e)/60:t)*255}var sv=Math.PI/180,ov=180/Math.PI,wh=18,av=.96422,cv=1,lv=.82521,hv=4/29,Ys=6/29,uv=3*Ys*Ys,p2=Ys*Ys*Ys;function fv(e){if(e instanceof yi)return new yi(e.l,e.a,e.b,e.opacity);if(e instanceof ki)return pv(e);e instanceof Ve||(e=Ud(e));var t=Fd(e.r),n=Fd(e.g),i=Fd(e.b),r=Ld((.2225045*t+.7168786*n+.0606169*i)/cv),s,o;return t===n&&n===i?s=o=r:(s=Ld((.4360747*t+.3850649*n+.1430804*i)/av),o=Ld((.0139322*t+.0971045*n+.7141733*i)/lv)),new yi(116*r-16,500*(s-r),200*(r-o),e.opacity)}function dv(e,t,n,i){return arguments.length===1?fv(e):new yi(e,t,n,i==null?1:i)}function yi(e,t,n,i){this.l=+e,this.a=+t,this.b=+n,this.opacity=+i}Ks(yi,dv,Ma(sr,{brighter(e){return new yi(this.l+wh*(e==null?1:e),this.a,this.b,this.opacity)},darker(e){return new yi(this.l-wh*(e==null?1:e),this.a,this.b,this.opacity)},rgb(){var e=(this.l+16)/116,t=isNaN(this.a)?e:e+this.a/500,n=isNaN(this.b)?e:e-this.b/200;return t=av*Od(t),e=cv*Od(e),n=lv*Od(n),new Ve(Nd(3.1338561*t-1.6168667*e-.4906146*n),Nd(-.9787684*t+1.9161415*e+.033454*n),Nd(.0719453*t-.2289914*e+1.4052427*n),this.opacity)}}));function Ld(e){return e>p2?Math.pow(e,1/3):e/uv+hv}function Od(e){return e>Ys?e*e*e:uv*(e-hv)}function Nd(e){return 255*(e<=.0031308?12.92*e:1.055*Math.pow(e,1/2.4)-.055)}function Fd(e){return(e/=255)<=.04045?e/12.92:Math.pow((e+.055)/1.055,2.4)}function m2(e){if(e instanceof ki)return new ki(e.h,e.c,e.l,e.opacity);if(e instanceof yi||(e=fv(e)),e.a===0&&e.b===0)return new ki(NaN,0<e.l&&e.l<100?0:NaN,e.l,e.opacity);var t=Math.atan2(e.b,e.a)*ov;return new ki(t<0?t+360:t,Math.sqrt(e.a*e.a+e.b*e.b),e.l,e.opacity)}function Ah(e,t,n,i){return arguments.length===1?m2(e):new ki(e,t,n,i==null?1:i)}function ki(e,t,n,i){this.h=+e,this.c=+t,this.l=+n,this.opacity=+i}function pv(e){if(isNaN(e.h))return new yi(e.l,0,0,e.opacity);var t=e.h*sv;return new yi(e.l,Math.cos(t)*e.c,Math.sin(t)*e.c,e.opacity)}Ks(ki,Ah,Ma(sr,{brighter(e){return new ki(this.h,this.c,this.l+wh*(e==null?1:e),this.opacity)},darker(e){return new ki(this.h,this.c,this.l-wh*(e==null?1:e),this.opacity)},rgb(){return pv(this).rgb()}}));var mv=-.14861,zd=1.78277,kd=-.29227,Ch=-.90649,ba=1.97294,ev=ba*Ch,nv=ba*zd,iv=zd*kd-Ch*mv;function g2(e){if(e instanceof Wr)return new Wr(e.h,e.s,e.l,e.opacity);e instanceof Ve||(e=Ud(e));var t=e.r/255,n=e.g/255,i=e.b/255,r=(iv*i+ev*t-nv*n)/(iv+ev-nv),s=i-r,o=(ba*(n-r)-kd*s)/Ch,a=Math.sqrt(o*o+s*s)/(ba*r*(1-r)),c=a?Math.atan2(o,s)*ov-120:NaN;return new Wr(c<0?c+360:c,a,r,e.opacity)}function Hn(e,t,n,i){return arguments.length===1?g2(e):new Wr(e,t,n,i==null?1:i)}function Wr(e,t,n,i){this.h=+e,this.s=+t,this.l=+n,this.opacity=+i}Ks(Wr,Hn,Ma(sr,{brighter(e){return e=e==null?Zs:Math.pow(Zs,e),new Wr(this.h,this.s,this.l*e,this.opacity)},darker(e){return e=e==null?jr:Math.pow(jr,e),new Wr(this.h,this.s,this.l*e,this.opacity)},rgb(){var e=isNaN(this.h)?0:(this.h+120)*sv,t=+this.l,n=isNaN(this.s)?0:this.s*t*(1-t),i=Math.cos(e),r=Math.sin(e);return new Ve(255*(t+n*(mv*i+zd*r)),255*(t+n*(kd*i+Ch*r)),255*(t+n*(ba*i)),this.opacity)}}));function vv(e,t,n,i,r){var s=e*e,o=s*e;return((1-3*e+3*s-o)*t+(4-6*s+3*o)*n+(1+3*e+3*s-3*o)*i+o*r)/6}function _2(e){var t=e.length-1;return function(n){var i=n<=0?n=0:n>=1?(n=1,t-1):Math.floor(n*t),r=e[i],s=e[i+1],o=i>0?e[i-1]:2*r-s,a=i<t-1?e[i+2]:2*s-r;return vv((n-i/t)*t,o,r,s,a)}}function v2(e){var t=e.length;return function(n){var i=Math.floor(((n%=1)<0?++n:n)*t),r=e[(i+t-1)%t],s=e[i%t],o=e[(i+1)%t],a=e[(i+2)%t];return vv((n-i/t)*t,r,s,o,a)}}var Vd=e=>()=>e;function yv(e,t){return function(n){return e+n*t}}function y2(e,t,n){return e=Math.pow(e,n),t=Math.pow(t,n)-e,n=1/n,function(i){return Math.pow(e+i*t,n)}}function Hd(e,t){var n=t-e;return n?yv(e,n>180||n<-180?n-360*Math.round(n/360):n):Vd(isNaN(e)?t:e)}function x2(e){return(e=+e)==1?gn:function(t,n){return n-t?y2(t,n,e):Vd(isNaN(t)?n:t)}}function gn(e,t){var n=t-e;return n?yv(e,n):Vd(isNaN(e)?t:e)}var JU=(function e(t){var n=x2(t);function i(r,s){var o=n((r=qr(r)).r,(s=qr(s)).r),a=n(r.g,s.g),c=n(r.b,s.b),l=gn(r.opacity,s.opacity);return function(u){return r.r=o(u),r.g=a(u),r.b=c(u),r.opacity=l(u),r+""}}return i.gamma=e,i})(1);function xv(e){return function(t){var n=t.length,i=new Array(n),r=new Array(n),s=new Array(n),o,a;for(o=0;o<n;++o)a=qr(t[o]),i[o]=a.r||0,r[o]=a.g||0,s[o]=a.b||0;return i=e(i),r=e(r),s=e(s),a.opacity=1,function(c){return a.r=i(c),a.g=r(c),a.b=s(c),a+""}}}var bv=xv(_2),QU=xv(v2);function Js(e,t){return e=+e,t=+t,function(n){return e*(1-n)+t*n}}var b2=/[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g,t5=new RegExp(b2.source,"g");var gv=180/Math.PI,Bd={translateX:0,translateY:0,rotate:0,skewX:0,scaleX:1,scaleY:1};function Mv(e,t,n,i,r,s){var o,a,c;return(o=Math.sqrt(e*e+t*t))&&(e/=o,t/=o),(c=e*n+t*i)&&(n-=e*c,i-=t*c),(a=Math.sqrt(n*n+i*i))&&(n/=a,i/=a,c/=a),e*i<t*n&&(e=-e,t=-t,c=-c,o=-o),{translateX:r,translateY:s,rotate:Math.atan2(t,e)*gv,skewX:Math.atan(c)*gv,scaleX:o,scaleY:a}}var Rh;function M2(e){let t=new(typeof DOMMatrix=="function"?DOMMatrix:WebKitCSSMatrix)(e+"");return t.isIdentity?Bd:Mv(t.a,t.b,t.c,t.d,t.e,t.f)}function S2(e){return e==null||(Rh||(Rh=document.createElementNS("http://www.w3.org/2000/svg","g")),Rh.setAttribute("transform",e),!(e=Rh.transform.baseVal.consolidate()))?Bd:(e=e.matrix,Mv(e.a,e.b,e.c,e.d,e.e,e.f))}function Sv(e,t,n,i){function r(l){return l.length?l.pop()+" ":""}function s(l,u,h,d,f,m){if(l!==h||u!==d){var _=f.push("translate(",null,t,null,n);m.push({i:_-4,x:Js(l,h)},{i:_-2,x:Js(u,d)})}else(h||d)&&f.push("translate("+h+t+d+n)}function o(l,u,h,d){l!==u?(l-u>180?u+=360:u-l>180&&(l+=360),d.push({i:h.push(r(h)+"rotate(",null,i)-2,x:Js(l,u)})):u&&h.push(r(h)+"rotate("+u+i)}function a(l,u,h,d){l!==u?d.push({i:h.push(r(h)+"skewX(",null,i)-2,x:Js(l,u)}):u&&h.push(r(h)+"skewX("+u+i)}function c(l,u,h,d,f,m){if(l!==h||u!==d){var _=f.push(r(f)+"scale(",null,",",null,")");m.push({i:_-4,x:Js(l,h)},{i:_-2,x:Js(u,d)})}else(h!==1||d!==1)&&f.push(r(f)+"scale("+h+","+d+")")}return function(l,u){var h=[],d=[];return l=e(l),u=e(u),s(l.translateX,l.translateY,u.translateX,u.translateY,h,d),o(l.rotate,u.rotate,h,d),a(l.skewX,u.skewX,h,d),c(l.scaleX,l.scaleY,u.scaleX,u.scaleY,h,d),l=u=null,function(f){for(var m=-1,_=d.length,g;++m<_;)h[(g=d[m]).i]=g.x(f);return h.join("")}}}var e5=Sv(M2,"px, ","px)","deg)"),n5=Sv(S2,", ",")",")"),w2=1e-12;function _v(e){return((e=Math.exp(e))+1/e)/2}function E2(e){return((e=Math.exp(e))-1/e)/2}function T2(e){return((e=Math.exp(2*e))-1)/(e+1)}var i5=(function e(t,n,i){function r(s,o){var a=s[0],c=s[1],l=s[2],u=o[0],h=o[1],d=o[2],f=u-a,m=h-c,_=f*f+m*m,g,p;if(_<w2)p=Math.log(d/l)/t,g=function(C){return[a+C*f,c+C*m,l*Math.exp(t*C*p)]};else{var b=Math.sqrt(_),x=(d*d-l*l+i*_)/(2*l*n*b),v=(d*d-l*l-i*_)/(2*d*n*b),M=Math.log(Math.sqrt(x*x+1)-x),S=Math.log(Math.sqrt(v*v+1)-v);p=(S-M)/t,g=function(C){var P=C*p,T=_v(M),w=l/(n*b)*(T*T2(t*P+M)-E2(M));return[a+w*f,c+w*m,l*T/_v(t*P+M)]}}return g.duration=Math.abs(p)*1e3*t/Math.SQRT2,g}return r.rho=function(s){var o=Math.max(.001,+s),a=o*o,c=a*a;return e(o,a,c)},r})(Math.SQRT2,2,4);function wv(e){return function(t,n){var i=e((t=Th(t)).h,(n=Th(n)).h),r=gn(t.s,n.s),s=gn(t.l,n.l),o=gn(t.opacity,n.opacity);return function(a){return t.h=i(a),t.s=r(a),t.l=s(a),t.opacity=o(a),t+""}}}var r5=wv(Hd),s5=wv(gn);function Ev(e){return function(t,n){var i=e((t=Ah(t)).h,(n=Ah(n)).h),r=gn(t.c,n.c),s=gn(t.l,n.l),o=gn(t.opacity,n.opacity);return function(a){return t.h=i(a),t.c=r(a),t.l=s(a),t.opacity=o(a),t+""}}}var o5=Ev(Hd),a5=Ev(gn);function Tv(e){return(function t(n){n=+n;function i(r,s){var o=e((r=Hn(r)).h,(s=Hn(s)).h),a=gn(r.s,s.s),c=gn(r.l,s.l),l=gn(r.opacity,s.opacity);return function(u){return r.h=o(u),r.s=a(u),r.l=c(Math.pow(u,n)),r.opacity=l(u),r+""}}return i.gamma=t,i})(1)}var c5=Tv(Hd),Ph=Tv(gn);function A2(e,t){switch(arguments.length){case 0:break;case 1:this.range(e);break;default:this.range(t).domain(e);break}return this}var Av=Symbol("implicit");function Gd(){var e=new va,t=[],n=[],i=Av;function r(s){let o=e.get(s);if(o===void 0){if(i!==Av)return i;e.set(s,o=t.push(s)-1)}return n[o%n.length]}return r.domain=function(s){if(!arguments.length)return t.slice();t=[],e=new va;for(let o of s)e.has(o)||e.set(o,t.push(o)-1);return r},r.range=function(s){return arguments.length?(n=Array.from(s),r):n.slice()},r.unknown=function(s){return arguments.length?(i=s,r):i},r.copy=function(){return Gd(t,n).unknown(i)},A2.apply(r,arguments),r}function $t(e){for(var t=e.length/6|0,n=new Array(t),i=0;i<t;)n[i]="#"+e.slice(i*6,++i*6);return n}var x5=$t("1f77b4ff7f0e2ca02cd627289467bd8c564be377c27f7f7fbcbd2217becf"),b5=$t("7fc97fbeaed4fdc086ffff99386cb0f0027fbf5b17666666"),M5=$t("1b9e77d95f027570b3e7298a66a61ee6ab02a6761d666666"),S5=$t("4269d0efb118ff725c6cc5b03ca951ff8ab7a463f297bbf59c6b4e9498a0"),Cv=$t("a6cee31f78b4b2df8a33a02cfb9a99e31a1cfdbf6fff7f00cab2d66a3d9affff99b15928"),w5=$t("fbb4aeb3cde3ccebc5decbe4fed9a6ffffcce5d8bdfddaecf2f2f2"),E5=$t("b3e2cdfdcdaccbd5e8f4cae4e6f5c9fff2aef1e2cccccccc"),T5=$t("e41a1c377eb84daf4a984ea3ff7f00ffff33a65628f781bf999999"),A5=$t("66c2a5fc8d628da0cbe78ac3a6d854ffd92fe5c494b3b3b3"),C5=$t("8dd3c7ffffb3bebadafb807280b1d3fdb462b3de69fccde5d9d9d9bc80bdccebc5ffed6f"),R5=$t("4e79a7f28e2ce1575976b7b259a14fedc949af7aa1ff9da79c755fbab0ab"),ye=e=>bv(e[e.length-1]),C2=new Array(3).concat("d8b365f5f5f55ab4ac","a6611adfc27d80cdc1018571","a6611adfc27df5f5f580cdc1018571","8c510ad8b365f6e8c3c7eae55ab4ac01665e","8c510ad8b365f6e8c3f5f5f5c7eae55ab4ac01665e","8c510abf812ddfc27df6e8c3c7eae580cdc135978f01665e","8c510abf812ddfc27df6e8c3f5f5f5c7eae580cdc135978f01665e","5430058c510abf812ddfc27df6e8c3c7eae580cdc135978f01665e003c30","5430058c510abf812ddfc27df6e8c3f5f5f5c7eae580cdc135978f01665e003c30").map($t),P5=ye(C2),R2=new Array(3).concat("af8dc3f7f7f77fbf7b","7b3294c2a5cfa6dba0008837","7b3294c2a5cff7f7f7a6dba0008837","762a83af8dc3e7d4e8d9f0d37fbf7b1b7837","762a83af8dc3e7d4e8f7f7f7d9f0d37fbf7b1b7837","762a839970abc2a5cfe7d4e8d9f0d3a6dba05aae611b7837","762a839970abc2a5cfe7d4e8f7f7f7d9f0d3a6dba05aae611b7837","40004b762a839970abc2a5cfe7d4e8d9f0d3a6dba05aae611b783700441b","40004b762a839970abc2a5cfe7d4e8f7f7f7d9f0d3a6dba05aae611b783700441b").map($t),I5=ye(R2),P2=new Array(3).concat("e9a3c9f7f7f7a1d76a","d01c8bf1b6dab8e1864dac26","d01c8bf1b6daf7f7f7b8e1864dac26","c51b7de9a3c9fde0efe6f5d0a1d76a4d9221","c51b7de9a3c9fde0eff7f7f7e6f5d0a1d76a4d9221","c51b7dde77aef1b6dafde0efe6f5d0b8e1867fbc414d9221","c51b7dde77aef1b6dafde0eff7f7f7e6f5d0b8e1867fbc414d9221","8e0152c51b7dde77aef1b6dafde0efe6f5d0b8e1867fbc414d9221276419","8e0152c51b7dde77aef1b6dafde0eff7f7f7e6f5d0b8e1867fbc414d9221276419").map($t),D5=ye(P2),I2=new Array(3).concat("998ec3f7f7f7f1a340","5e3c99b2abd2fdb863e66101","5e3c99b2abd2f7f7f7fdb863e66101","542788998ec3d8daebfee0b6f1a340b35806","542788998ec3d8daebf7f7f7fee0b6f1a340b35806","5427888073acb2abd2d8daebfee0b6fdb863e08214b35806","5427888073acb2abd2d8daebf7f7f7fee0b6fdb863e08214b35806","2d004b5427888073acb2abd2d8daebfee0b6fdb863e08214b358067f3b08","2d004b5427888073acb2abd2d8daebf7f7f7fee0b6fdb863e08214b358067f3b08").map($t),L5=ye(I2),D2=new Array(3).concat("ef8a62f7f7f767a9cf","ca0020f4a58292c5de0571b0","ca0020f4a582f7f7f792c5de0571b0","b2182bef8a62fddbc7d1e5f067a9cf2166ac","b2182bef8a62fddbc7f7f7f7d1e5f067a9cf2166ac","b2182bd6604df4a582fddbc7d1e5f092c5de4393c32166ac","b2182bd6604df4a582fddbc7f7f7f7d1e5f092c5de4393c32166ac","67001fb2182bd6604df4a582fddbc7d1e5f092c5de4393c32166ac053061","67001fb2182bd6604df4a582fddbc7f7f7f7d1e5f092c5de4393c32166ac053061").map($t),O5=ye(D2),L2=new Array(3).concat("ef8a62ffffff999999","ca0020f4a582bababa404040","ca0020f4a582ffffffbababa404040","b2182bef8a62fddbc7e0e0e09999994d4d4d","b2182bef8a62fddbc7ffffffe0e0e09999994d4d4d","b2182bd6604df4a582fddbc7e0e0e0bababa8787874d4d4d","b2182bd6604df4a582fddbc7ffffffe0e0e0bababa8787874d4d4d","67001fb2182bd6604df4a582fddbc7e0e0e0bababa8787874d4d4d1a1a1a","67001fb2182bd6604df4a582fddbc7ffffffe0e0e0bababa8787874d4d4d1a1a1a").map($t),N5=ye(L2),O2=new Array(3).concat("fc8d59ffffbf91bfdb","d7191cfdae61abd9e92c7bb6","d7191cfdae61ffffbfabd9e92c7bb6","d73027fc8d59fee090e0f3f891bfdb4575b4","d73027fc8d59fee090ffffbfe0f3f891bfdb4575b4","d73027f46d43fdae61fee090e0f3f8abd9e974add14575b4","d73027f46d43fdae61fee090ffffbfe0f3f8abd9e974add14575b4","a50026d73027f46d43fdae61fee090e0f3f8abd9e974add14575b4313695","a50026d73027f46d43fdae61fee090ffffbfe0f3f8abd9e974add14575b4313695").map($t),F5=ye(O2),N2=new Array(3).concat("fc8d59ffffbf91cf60","d7191cfdae61a6d96a1a9641","d7191cfdae61ffffbfa6d96a1a9641","d73027fc8d59fee08bd9ef8b91cf601a9850","d73027fc8d59fee08bffffbfd9ef8b91cf601a9850","d73027f46d43fdae61fee08bd9ef8ba6d96a66bd631a9850","d73027f46d43fdae61fee08bffffbfd9ef8ba6d96a66bd631a9850","a50026d73027f46d43fdae61fee08bd9ef8ba6d96a66bd631a9850006837","a50026d73027f46d43fdae61fee08bffffbfd9ef8ba6d96a66bd631a9850006837").map($t),U5=ye(N2),F2=new Array(3).concat("fc8d59ffffbf99d594","d7191cfdae61abdda42b83ba","d7191cfdae61ffffbfabdda42b83ba","d53e4ffc8d59fee08be6f59899d5943288bd","d53e4ffc8d59fee08bffffbfe6f59899d5943288bd","d53e4ff46d43fdae61fee08be6f598abdda466c2a53288bd","d53e4ff46d43fdae61fee08bffffbfe6f598abdda466c2a53288bd","9e0142d53e4ff46d43fdae61fee08be6f598abdda466c2a53288bd5e4fa2","9e0142d53e4ff46d43fdae61fee08bffffbfe6f598abdda466c2a53288bd5e4fa2").map($t),z5=ye(F2),U2=new Array(3).concat("e5f5f999d8c92ca25f","edf8fbb2e2e266c2a4238b45","edf8fbb2e2e266c2a42ca25f006d2c","edf8fbccece699d8c966c2a42ca25f006d2c","edf8fbccece699d8c966c2a441ae76238b45005824","f7fcfde5f5f9ccece699d8c966c2a441ae76238b45005824","f7fcfde5f5f9ccece699d8c966c2a441ae76238b45006d2c00441b").map($t),k5=ye(U2),z2=new Array(3).concat("e0ecf49ebcda8856a7","edf8fbb3cde38c96c688419d","edf8fbb3cde38c96c68856a7810f7c","edf8fbbfd3e69ebcda8c96c68856a7810f7c","edf8fbbfd3e69ebcda8c96c68c6bb188419d6e016b","f7fcfde0ecf4bfd3e69ebcda8c96c68c6bb188419d6e016b","f7fcfde0ecf4bfd3e69ebcda8c96c68c6bb188419d810f7c4d004b").map($t),B5=ye(z2),k2=new Array(3).concat("e0f3dba8ddb543a2ca","f0f9e8bae4bc7bccc42b8cbe","f0f9e8bae4bc7bccc443a2ca0868ac","f0f9e8ccebc5a8ddb57bccc443a2ca0868ac","f0f9e8ccebc5a8ddb57bccc44eb3d32b8cbe08589e","f7fcf0e0f3dbccebc5a8ddb57bccc44eb3d32b8cbe08589e","f7fcf0e0f3dbccebc5a8ddb57bccc44eb3d32b8cbe0868ac084081").map($t),V5=ye(k2),B2=new Array(3).concat("fee8c8fdbb84e34a33","fef0d9fdcc8afc8d59d7301f","fef0d9fdcc8afc8d59e34a33b30000","fef0d9fdd49efdbb84fc8d59e34a33b30000","fef0d9fdd49efdbb84fc8d59ef6548d7301f990000","fff7ecfee8c8fdd49efdbb84fc8d59ef6548d7301f990000","fff7ecfee8c8fdd49efdbb84fc8d59ef6548d7301fb300007f0000").map($t),H5=ye(B2),V2=new Array(3).concat("ece2f0a6bddb1c9099","f6eff7bdc9e167a9cf02818a","f6eff7bdc9e167a9cf1c9099016c59","f6eff7d0d1e6a6bddb67a9cf1c9099016c59","f6eff7d0d1e6a6bddb67a9cf3690c002818a016450","fff7fbece2f0d0d1e6a6bddb67a9cf3690c002818a016450","fff7fbece2f0d0d1e6a6bddb67a9cf3690c002818a016c59014636").map($t),G5=ye(V2),H2=new Array(3).concat("ece7f2a6bddb2b8cbe","f1eef6bdc9e174a9cf0570b0","f1eef6bdc9e174a9cf2b8cbe045a8d","f1eef6d0d1e6a6bddb74a9cf2b8cbe045a8d","f1eef6d0d1e6a6bddb74a9cf3690c00570b0034e7b","fff7fbece7f2d0d1e6a6bddb74a9cf3690c00570b0034e7b","fff7fbece7f2d0d1e6a6bddb74a9cf3690c00570b0045a8d023858").map($t),W5=ye(H2),G2=new Array(3).concat("e7e1efc994c7dd1c77","f1eef6d7b5d8df65b0ce1256","f1eef6d7b5d8df65b0dd1c77980043","f1eef6d4b9dac994c7df65b0dd1c77980043","f1eef6d4b9dac994c7df65b0e7298ace125691003f","f7f4f9e7e1efd4b9dac994c7df65b0e7298ace125691003f","f7f4f9e7e1efd4b9dac994c7df65b0e7298ace125698004367001f").map($t),j5=ye(G2),W2=new Array(3).concat("fde0ddfa9fb5c51b8a","feebe2fbb4b9f768a1ae017e","feebe2fbb4b9f768a1c51b8a7a0177","feebe2fcc5c0fa9fb5f768a1c51b8a7a0177","feebe2fcc5c0fa9fb5f768a1dd3497ae017e7a0177","fff7f3fde0ddfcc5c0fa9fb5f768a1dd3497ae017e7a0177","fff7f3fde0ddfcc5c0fa9fb5f768a1dd3497ae017e7a017749006a").map($t),q5=ye(W2),j2=new Array(3).concat("edf8b17fcdbb2c7fb8","ffffcca1dab441b6c4225ea8","ffffcca1dab441b6c42c7fb8253494","ffffccc7e9b47fcdbb41b6c42c7fb8253494","ffffccc7e9b47fcdbb41b6c41d91c0225ea80c2c84","ffffd9edf8b1c7e9b47fcdbb41b6c41d91c0225ea80c2c84","ffffd9edf8b1c7e9b47fcdbb41b6c41d91c0225ea8253494081d58").map($t),X5=ye(j2),q2=new Array(3).concat("f7fcb9addd8e31a354","ffffccc2e69978c679238443","ffffccc2e69978c67931a354006837","ffffccd9f0a3addd8e78c67931a354006837","ffffccd9f0a3addd8e78c67941ab5d238443005a32","ffffe5f7fcb9d9f0a3addd8e78c67941ab5d238443005a32","ffffe5f7fcb9d9f0a3addd8e78c67941ab5d238443006837004529").map($t),$5=ye(q2),X2=new Array(3).concat("fff7bcfec44fd95f0e","ffffd4fed98efe9929cc4c02","ffffd4fed98efe9929d95f0e993404","ffffd4fee391fec44ffe9929d95f0e993404","ffffd4fee391fec44ffe9929ec7014cc4c028c2d04","ffffe5fff7bcfee391fec44ffe9929ec7014cc4c028c2d04","ffffe5fff7bcfee391fec44ffe9929ec7014cc4c02993404662506").map($t),Y5=ye(X2),$2=new Array(3).concat("ffeda0feb24cf03b20","ffffb2fecc5cfd8d3ce31a1c","ffffb2fecc5cfd8d3cf03b20bd0026","ffffb2fed976feb24cfd8d3cf03b20bd0026","ffffb2fed976feb24cfd8d3cfc4e2ae31a1cb10026","ffffccffeda0fed976feb24cfd8d3cfc4e2ae31a1cb10026","ffffccffeda0fed976feb24cfd8d3cfc4e2ae31a1cbd0026800026").map($t),Z5=ye($2),Y2=new Array(3).concat("deebf79ecae13182bd","eff3ffbdd7e76baed62171b5","eff3ffbdd7e76baed63182bd08519c","eff3ffc6dbef9ecae16baed63182bd08519c","eff3ffc6dbef9ecae16baed64292c62171b5084594","f7fbffdeebf7c6dbef9ecae16baed64292c62171b5084594","f7fbffdeebf7c6dbef9ecae16baed64292c62171b508519c08306b").map($t),K5=ye(Y2),Z2=new Array(3).concat("e5f5e0a1d99b31a354","edf8e9bae4b374c476238b45","edf8e9bae4b374c47631a354006d2c","edf8e9c7e9c0a1d99b74c47631a354006d2c","edf8e9c7e9c0a1d99b74c47641ab5d238b45005a32","f7fcf5e5f5e0c7e9c0a1d99b74c47641ab5d238b45005a32","f7fcf5e5f5e0c7e9c0a1d99b74c47641ab5d238b45006d2c00441b").map($t),J5=ye(Z2),K2=new Array(3).concat("f0f0f0bdbdbd636363","f7f7f7cccccc969696525252","f7f7f7cccccc969696636363252525","f7f7f7d9d9d9bdbdbd969696636363252525","f7f7f7d9d9d9bdbdbd969696737373525252252525","fffffff0f0f0d9d9d9bdbdbd969696737373525252252525","fffffff0f0f0d9d9d9bdbdbd969696737373525252252525000000").map($t),Q5=ye(K2),J2=new Array(3).concat("efedf5bcbddc756bb1","f2f0f7cbc9e29e9ac86a51a3","f2f0f7cbc9e29e9ac8756bb154278f","f2f0f7dadaebbcbddc9e9ac8756bb154278f","f2f0f7dadaebbcbddc9e9ac8807dba6a51a34a1486","fcfbfdefedf5dadaebbcbddc9e9ac8807dba6a51a34a1486","fcfbfdefedf5dadaebbcbddc9e9ac8807dba6a51a354278f3f007d").map($t),t4=ye(J2),Q2=new Array(3).concat("fee0d2fc9272de2d26","fee5d9fcae91fb6a4acb181d","fee5d9fcae91fb6a4ade2d26a50f15","fee5d9fcbba1fc9272fb6a4ade2d26a50f15","fee5d9fcbba1fc9272fb6a4aef3b2ccb181d99000d","fff5f0fee0d2fcbba1fc9272fb6a4aef3b2ccb181d99000d","fff5f0fee0d2fcbba1fc9272fb6a4aef3b2ccb181da50f1567000d").map($t),e4=ye(Q2),tC=new Array(3).concat("fee6cefdae6be6550d","feeddefdbe85fd8d3cd94701","feeddefdbe85fd8d3ce6550da63603","feeddefdd0a2fdae6bfd8d3ce6550da63603","feeddefdd0a2fdae6bfd8d3cf16913d948018c2d04","fff5ebfee6cefdd0a2fdae6bfd8d3cf16913d948018c2d04","fff5ebfee6cefdd0a2fdae6bfd8d3cf16913d94801a636037f2704").map($t),n4=ye(tC);var i4=Ph(Hn(300,.5,0),Hn(-240,.5,1)),r4=Ph(Hn(-100,.75,.35),Hn(80,1.5,.8)),s4=Ph(Hn(260,.75,.35),Hn(80,1.5,.8)),o4=Hn();var a4=qr(),c4=Math.PI/3,l4=Math.PI*2/3;function Ih(e){var t=e.length;return function(n){return e[Math.max(0,Math.min(t-1,Math.floor(n*t)))]}}var h4=Ih($t("44015444025645045745055946075a46085c460a5d460b5e470d60470e6147106347116447136548146748166848176948186a481a6c481b6d481c6e481d6f481f70482071482173482374482475482576482677482878482979472a7a472c7a472d7b472e7c472f7d46307e46327e46337f463480453581453781453882443983443a83443b84433d84433e85423f854240864241864142874144874045884046883f47883f48893e49893e4a893e4c8a3d4d8a3d4e8a3c4f8a3c508b3b518b3b528b3a538b3a548c39558c39568c38588c38598c375a8c375b8d365c8d365d8d355e8d355f8d34608d34618d33628d33638d32648e32658e31668e31678e31688e30698e306a8e2f6b8e2f6c8e2e6d8e2e6e8e2e6f8e2d708e2d718e2c718e2c728e2c738e2b748e2b758e2a768e2a778e2a788e29798e297a8e297b8e287c8e287d8e277e8e277f8e27808e26818e26828e26828e25838e25848e25858e24868e24878e23888e23898e238a8d228b8d228c8d228d8d218e8d218f8d21908d21918c20928c20928c20938c1f948c1f958b1f968b1f978b1f988b1f998a1f9a8a1e9b8a1e9c891e9d891f9e891f9f881fa0881fa1881fa1871fa28720a38620a48621a58521a68522a78522a88423a98324aa8325ab8225ac8226ad8127ad8128ae8029af7f2ab07f2cb17e2db27d2eb37c2fb47c31b57b32b67a34b67935b77937b87838b9773aba763bbb753dbc743fbc7340bd7242be7144bf7046c06f48c16e4ac16d4cc26c4ec36b50c46a52c56954c56856c66758c7655ac8645cc8635ec96260ca6063cb5f65cb5e67cc5c69cd5b6ccd5a6ece5870cf5773d05675d05477d1537ad1517cd2507fd34e81d34d84d44b86d54989d5488bd6468ed64590d74393d74195d84098d83e9bd93c9dd93ba0da39a2da37a5db36a8db34aadc32addc30b0dd2fb2dd2db5de2bb8de29bade28bddf26c0df25c2df23c5e021c8e020cae11fcde11dd0e11cd2e21bd5e21ad8e219dae319dde318dfe318e2e418e5e419e7e419eae51aece51befe51cf1e51df4e61ef6e620f8e621fbe723fde725")),u4=Ih($t("00000401000501010601010802010902020b02020d03030f03031204041405041606051806051a07061c08071e0907200a08220b09240c09260d0a290e0b2b100b2d110c2f120d31130d34140e36150e38160f3b180f3d19103f1a10421c10441d11471e114920114b21114e22115024125325125527125829115a2a115c2c115f2d11612f116331116533106734106936106b38106c390f6e3b0f703d0f713f0f72400f74420f75440f764510774710784910784a10794c117a4e117b4f127b51127c52137c54137d56147d57157e59157e5a167e5c167f5d177f5f187f601880621980641a80651a80671b80681c816a1c816b1d816d1d816e1e81701f81721f817320817521817621817822817922827b23827c23827e24828025828125818326818426818627818827818928818b29818c29818e2a81902a81912b81932b80942c80962c80982d80992d809b2e7f9c2e7f9e2f7fa02f7fa1307ea3307ea5317ea6317da8327daa337dab337cad347cae347bb0357bb2357bb3367ab5367ab73779b83779ba3878bc3978bd3977bf3a77c03a76c23b75c43c75c53c74c73d73c83e73ca3e72cc3f71cd4071cf4070d0416fd2426fd3436ed5446dd6456cd8456cd9466bdb476adc4869de4968df4a68e04c67e24d66e34e65e44f64e55064e75263e85362e95462ea5661eb5760ec5860ed5a5fee5b5eef5d5ef05f5ef1605df2625df2645cf3655cf4675cf4695cf56b5cf66c5cf66e5cf7705cf7725cf8745cf8765cf9785df9795df97b5dfa7d5efa7f5efa815ffb835ffb8560fb8761fc8961fc8a62fc8c63fc8e64fc9065fd9266fd9467fd9668fd9869fd9a6afd9b6bfe9d6cfe9f6dfea16efea36ffea571fea772fea973feaa74feac76feae77feb078feb27afeb47bfeb67cfeb77efeb97ffebb81febd82febf84fec185fec287fec488fec68afec88cfeca8dfecc8ffecd90fecf92fed194fed395fed597fed799fed89afdda9cfddc9efddea0fde0a1fde2a3fde3a5fde5a7fde7a9fde9aafdebacfcecaefceeb0fcf0b2fcf2b4fcf4b6fcf6b8fcf7b9fcf9bbfcfbbdfcfdbf")),f4=Ih($t("00000401000501010601010802010a02020c02020e03021004031204031405041706041907051b08051d09061f0a07220b07240c08260d08290e092b10092d110a30120a32140b34150b37160b39180c3c190c3e1b0c411c0c431e0c451f0c48210c4a230c4c240c4f260c51280b53290b552b0b572d0b592f0a5b310a5c320a5e340a5f3609613809623909633b09643d09653e0966400a67420a68440a68450a69470b6a490b6a4a0c6b4c0c6b4d0d6c4f0d6c510e6c520e6d540f6d550f6d57106e59106e5a116e5c126e5d126e5f136e61136e62146e64156e65156e67166e69166e6a176e6c186e6d186e6f196e71196e721a6e741a6e751b6e771c6d781c6d7a1d6d7c1d6d7d1e6d7f1e6c801f6c82206c84206b85216b87216b88226a8a226a8c23698d23698f24699025689225689326679526679727669827669a28659b29649d29649f2a63a02a63a22b62a32c61a52c60a62d60a82e5fa92e5eab2f5ead305dae305cb0315bb1325ab3325ab43359b63458b73557b93556ba3655bc3754bd3853bf3952c03a51c13a50c33b4fc43c4ec63d4dc73e4cc83f4bca404acb4149cc4248ce4347cf4446d04545d24644d34743d44842d54a41d74b3fd84c3ed94d3dda4e3cdb503bdd513ade5238df5337e05536e15635e25734e35933e45a31e55c30e65d2fe75e2ee8602de9612bea632aeb6429eb6628ec6726ed6925ee6a24ef6c23ef6e21f06f20f1711ff1731df2741cf3761bf37819f47918f57b17f57d15f67e14f68013f78212f78410f8850ff8870ef8890cf98b0bf98c0af98e09fa9008fa9207fa9407fb9606fb9706fb9906fb9b06fb9d07fc9f07fca108fca309fca50afca60cfca80dfcaa0ffcac11fcae12fcb014fcb216fcb418fbb61afbb81dfbba1ffbbc21fbbe23fac026fac228fac42afac62df9c72ff9c932f9cb35f8cd37f8cf3af7d13df7d340f6d543f6d746f5d949f5db4cf4dd4ff4df53f4e156f3e35af3e55df2e661f2e865f2ea69f1ec6df1ed71f1ef75f1f179f2f27df2f482f3f586f3f68af4f88ef5f992f6fa96f8fb9af9fc9dfafda1fcffa4")),d4=Ih($t("0d088710078813078916078a19068c1b068d1d068e20068f2206902406912605912805922a05932c05942e05952f059631059733059735049837049938049a3a049a3c049b3e049c3f049c41049d43039e44039e46039f48039f4903a04b03a14c02a14e02a25002a25102a35302a35502a45601a45801a45901a55b01a55c01a65e01a66001a66100a76300a76400a76600a76700a86900a86a00a86c00a86e00a86f00a87100a87201a87401a87501a87701a87801a87a02a87b02a87d03a87e03a88004a88104a78305a78405a78606a68707a68808a68a09a58b0aa58d0ba58e0ca48f0da4910ea3920fa39410a29511a19613a19814a099159f9a169f9c179e9d189d9e199da01a9ca11b9ba21d9aa31e9aa51f99a62098a72197a82296aa2395ab2494ac2694ad2793ae2892b02991b12a90b22b8fb32c8eb42e8db52f8cb6308bb7318ab83289ba3388bb3488bc3587bd3786be3885bf3984c03a83c13b82c23c81c33d80c43e7fc5407ec6417dc7427cc8437bc9447aca457acb4679cc4778cc4977cd4a76ce4b75cf4c74d04d73d14e72d24f71d35171d45270d5536fd5546ed6556dd7566cd8576bd9586ada5a6ada5b69db5c68dc5d67dd5e66de5f65de6164df6263e06363e16462e26561e26660e3685fe4695ee56a5de56b5de66c5ce76e5be76f5ae87059e97158e97257ea7457eb7556eb7655ec7754ed7953ed7a52ee7b51ef7c51ef7e50f07f4ff0804ef1814df1834cf2844bf3854bf3874af48849f48948f58b47f58c46f68d45f68f44f79044f79143f79342f89441f89540f9973ff9983ef99a3efa9b3dfa9c3cfa9e3bfb9f3afba139fba238fca338fca537fca636fca835fca934fdab33fdac33fdae32fdaf31fdb130fdb22ffdb42ffdb52efeb72dfeb82cfeba2cfebb2bfebd2afebe2afec029fdc229fdc328fdc527fdc627fdc827fdca26fdcb26fccd25fcce25fcd025fcd225fbd324fbd524fbd724fad824fada24f9dc24f9dd25f8df25f8e125f7e225f7e425f6e626f6e826f5e926f5eb27f4ed27f3ee27f3f027f2f227f1f426f1f525f0f724f0f921"));function Dh(e){"@babel/helpers - typeof";return Dh=typeof Symbol=="function"&&typeof Symbol.iterator=="symbol"?function(t){return typeof t}:function(t){return t&&typeof Symbol=="function"&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},Dh(e)}var eC=/^\s+/,nC=/\s+$/;function Rt(e,t){if(e=e||"",t=t||{},e instanceof Rt)return e;if(!(this instanceof Rt))return new Rt(e,t);var n=iC(e);this._originalInput=e,this._r=n.r,this._g=n.g,this._b=n.b,this._a=n.a,this._roundA=Math.round(100*this._a)/100,this._format=t.format||n.format,this._gradientType=t.gradientType,this._r<1&&(this._r=Math.round(this._r)),this._g<1&&(this._g=Math.round(this._g)),this._b<1&&(this._b=Math.round(this._b)),this._ok=n.ok}Rt.prototype={isDark:function(){return this.getBrightness()<128},isLight:function(){return!this.isDark()},isValid:function(){return this._ok},getOriginalInput:function(){return this._originalInput},getFormat:function(){return this._format},getAlpha:function(){return this._a},getBrightness:function(){var t=this.toRgb();return(t.r*299+t.g*587+t.b*114)/1e3},getLuminance:function(){var t=this.toRgb(),n,i,r,s,o,a;return n=t.r/255,i=t.g/255,r=t.b/255,n<=.03928?s=n/12.92:s=Math.pow((n+.055)/1.055,2.4),i<=.03928?o=i/12.92:o=Math.pow((i+.055)/1.055,2.4),r<=.03928?a=r/12.92:a=Math.pow((r+.055)/1.055,2.4),.2126*s+.7152*o+.0722*a},setAlpha:function(t){return this._a=Nv(t),this._roundA=Math.round(100*this._a)/100,this},toHsv:function(){var t=Pv(this._r,this._g,this._b);return{h:t.h*360,s:t.s,v:t.v,a:this._a}},toHsvString:function(){var t=Pv(this._r,this._g,this._b),n=Math.round(t.h*360),i=Math.round(t.s*100),r=Math.round(t.v*100);return this._a==1?"hsv("+n+", "+i+"%, "+r+"%)":"hsva("+n+", "+i+"%, "+r+"%, "+this._roundA+")"},toHsl:function(){var t=Rv(this._r,this._g,this._b);return{h:t.h*360,s:t.s,l:t.l,a:this._a}},toHslString:function(){var t=Rv(this._r,this._g,this._b),n=Math.round(t.h*360),i=Math.round(t.s*100),r=Math.round(t.l*100);return this._a==1?"hsl("+n+", "+i+"%, "+r+"%)":"hsla("+n+", "+i+"%, "+r+"%, "+this._roundA+")"},toHex:function(t){return Iv(this._r,this._g,this._b,t)},toHexString:function(t){return"#"+this.toHex(t)},toHex8:function(t){return aC(this._r,this._g,this._b,this._a,t)},toHex8String:function(t){return"#"+this.toHex8(t)},toRgb:function(){return{r:Math.round(this._r),g:Math.round(this._g),b:Math.round(this._b),a:this._a}},toRgbString:function(){return this._a==1?"rgb("+Math.round(this._r)+", "+Math.round(this._g)+", "+Math.round(this._b)+")":"rgba("+Math.round(this._r)+", "+Math.round(this._g)+", "+Math.round(this._b)+", "+this._roundA+")"},toPercentageRgb:function(){return{r:Math.round(Ee(this._r,255)*100)+"%",g:Math.round(Ee(this._g,255)*100)+"%",b:Math.round(Ee(this._b,255)*100)+"%",a:this._a}},toPercentageRgbString:function(){return this._a==1?"rgb("+Math.round(Ee(this._r,255)*100)+"%, "+Math.round(Ee(this._g,255)*100)+"%, "+Math.round(Ee(this._b,255)*100)+"%)":"rgba("+Math.round(Ee(this._r,255)*100)+"%, "+Math.round(Ee(this._g,255)*100)+"%, "+Math.round(Ee(this._b,255)*100)+"%, "+this._roundA+")"},toName:function(){return this._a===0?"transparent":this._a<1?!1:yC[Iv(this._r,this._g,this._b,!0)]||!1},toFilter:function(t){var n="#"+Dv(this._r,this._g,this._b,this._a),i=n,r=this._gradientType?"GradientType = 1, ":"";if(t){var s=Rt(t);i="#"+Dv(s._r,s._g,s._b,s._a)}return"progid:DXImageTransform.Microsoft.gradient("+r+"startColorstr="+n+",endColorstr="+i+")"},toString:function(t){var n=!!t;t=t||this._format;var i=!1,r=this._a<1&&this._a>=0,s=!n&&r&&(t==="hex"||t==="hex6"||t==="hex3"||t==="hex4"||t==="hex8"||t==="name");return s?t==="name"&&this._a===0?this.toName():this.toRgbString():(t==="rgb"&&(i=this.toRgbString()),t==="prgb"&&(i=this.toPercentageRgbString()),(t==="hex"||t==="hex6")&&(i=this.toHexString()),t==="hex3"&&(i=this.toHexString(!0)),t==="hex4"&&(i=this.toHex8String(!0)),t==="hex8"&&(i=this.toHex8String()),t==="name"&&(i=this.toName()),t==="hsl"&&(i=this.toHslString()),t==="hsv"&&(i=this.toHsvString()),i||this.toHexString())},clone:function(){return Rt(this.toString())},_applyModification:function(t,n){var i=t.apply(null,[this].concat([].slice.call(n)));return this._r=i._r,this._g=i._g,this._b=i._b,this.setAlpha(i._a),this},lighten:function(){return this._applyModification(uC,arguments)},brighten:function(){return this._applyModification(fC,arguments)},darken:function(){return this._applyModification(dC,arguments)},desaturate:function(){return this._applyModification(cC,arguments)},saturate:function(){return this._applyModification(lC,arguments)},greyscale:function(){return this._applyModification(hC,arguments)},spin:function(){return this._applyModification(pC,arguments)},_applyCombination:function(t,n){return t.apply(null,[this].concat([].slice.call(n)))},analogous:function(){return this._applyCombination(_C,arguments)},complement:function(){return this._applyCombination(mC,arguments)},monochromatic:function(){return this._applyCombination(vC,arguments)},splitcomplement:function(){return this._applyCombination(gC,arguments)},triad:function(){return this._applyCombination(Lv,[3])},tetrad:function(){return this._applyCombination(Lv,[4])}};Rt.fromRatio=function(e,t){if(Dh(e)=="object"){var n={};for(var i in e)e.hasOwnProperty(i)&&(i==="a"?n[i]=e[i]:n[i]=Sa(e[i]));e=n}return Rt(e,t)};function iC(e){var t={r:0,g:0,b:0},n=1,i=null,r=null,s=null,o=!1,a=!1;return typeof e=="string"&&(e=SC(e)),Dh(e)=="object"&&(Bi(e.r)&&Bi(e.g)&&Bi(e.b)?(t=rC(e.r,e.g,e.b),o=!0,a=String(e.r).substr(-1)==="%"?"prgb":"rgb"):Bi(e.h)&&Bi(e.s)&&Bi(e.v)?(i=Sa(e.s),r=Sa(e.v),t=oC(e.h,i,r),o=!0,a="hsv"):Bi(e.h)&&Bi(e.s)&&Bi(e.l)&&(i=Sa(e.s),s=Sa(e.l),t=sC(e.h,i,s),o=!0,a="hsl"),e.hasOwnProperty("a")&&(n=e.a)),n=Nv(n),{ok:o,format:e.format||a,r:Math.min(255,Math.max(t.r,0)),g:Math.min(255,Math.max(t.g,0)),b:Math.min(255,Math.max(t.b,0)),a:n}}function rC(e,t,n){return{r:Ee(e,255)*255,g:Ee(t,255)*255,b:Ee(n,255)*255}}function Rv(e,t,n){e=Ee(e,255),t=Ee(t,255),n=Ee(n,255);var i=Math.max(e,t,n),r=Math.min(e,t,n),s,o,a=(i+r)/2;if(i==r)s=o=0;else{var c=i-r;switch(o=a>.5?c/(2-i-r):c/(i+r),i){case e:s=(t-n)/c+(t<n?6:0);break;case t:s=(n-e)/c+2;break;case n:s=(e-t)/c+4;break}s/=6}return{h:s,s:o,l:a}}function sC(e,t,n){var i,r,s;e=Ee(e,360),t=Ee(t,100),n=Ee(n,100);function o(l,u,h){return h<0&&(h+=1),h>1&&(h-=1),h<1/6?l+(u-l)*6*h:h<1/2?u:h<2/3?l+(u-l)*(2/3-h)*6:l}if(t===0)i=r=s=n;else{var a=n<.5?n*(1+t):n+t-n*t,c=2*n-a;i=o(c,a,e+1/3),r=o(c,a,e),s=o(c,a,e-1/3)}return{r:i*255,g:r*255,b:s*255}}function Pv(e,t,n){e=Ee(e,255),t=Ee(t,255),n=Ee(n,255);var i=Math.max(e,t,n),r=Math.min(e,t,n),s,o,a=i,c=i-r;if(o=i===0?0:c/i,i==r)s=0;else{switch(i){case e:s=(t-n)/c+(t<n?6:0);break;case t:s=(n-e)/c+2;break;case n:s=(e-t)/c+4;break}s/=6}return{h:s,s:o,v:a}}function oC(e,t,n){e=Ee(e,360)*6,t=Ee(t,100),n=Ee(n,100);var i=Math.floor(e),r=e-i,s=n*(1-t),o=n*(1-r*t),a=n*(1-(1-r)*t),c=i%6,l=[n,o,s,s,a,n][c],u=[a,n,n,o,s,s][c],h=[s,s,a,n,n,o][c];return{r:l*255,g:u*255,b:h*255}}function Iv(e,t,n,i){var r=[ri(Math.round(e).toString(16)),ri(Math.round(t).toString(16)),ri(Math.round(n).toString(16))];return i&&r[0].charAt(0)==r[0].charAt(1)&&r[1].charAt(0)==r[1].charAt(1)&&r[2].charAt(0)==r[2].charAt(1)?r[0].charAt(0)+r[1].charAt(0)+r[2].charAt(0):r.join("")}function aC(e,t,n,i,r){var s=[ri(Math.round(e).toString(16)),ri(Math.round(t).toString(16)),ri(Math.round(n).toString(16)),ri(Fv(i))];return r&&s[0].charAt(0)==s[0].charAt(1)&&s[1].charAt(0)==s[1].charAt(1)&&s[2].charAt(0)==s[2].charAt(1)&&s[3].charAt(0)==s[3].charAt(1)?s[0].charAt(0)+s[1].charAt(0)+s[2].charAt(0)+s[3].charAt(0):s.join("")}function Dv(e,t,n,i){var r=[ri(Fv(i)),ri(Math.round(e).toString(16)),ri(Math.round(t).toString(16)),ri(Math.round(n).toString(16))];return r.join("")}Rt.equals=function(e,t){return!e||!t?!1:Rt(e).toRgbString()==Rt(t).toRgbString()};Rt.random=function(){return Rt.fromRatio({r:Math.random(),g:Math.random(),b:Math.random()})};function cC(e,t){t=t===0?0:t||10;var n=Rt(e).toHsl();return n.s-=t/100,n.s=Lh(n.s),Rt(n)}function lC(e,t){t=t===0?0:t||10;var n=Rt(e).toHsl();return n.s+=t/100,n.s=Lh(n.s),Rt(n)}function hC(e){return Rt(e).desaturate(100)}function uC(e,t){t=t===0?0:t||10;var n=Rt(e).toHsl();return n.l+=t/100,n.l=Lh(n.l),Rt(n)}function fC(e,t){t=t===0?0:t||10;var n=Rt(e).toRgb();return n.r=Math.max(0,Math.min(255,n.r-Math.round(255*-(t/100)))),n.g=Math.max(0,Math.min(255,n.g-Math.round(255*-(t/100)))),n.b=Math.max(0,Math.min(255,n.b-Math.round(255*-(t/100)))),Rt(n)}function dC(e,t){t=t===0?0:t||10;var n=Rt(e).toHsl();return n.l-=t/100,n.l=Lh(n.l),Rt(n)}function pC(e,t){var n=Rt(e).toHsl(),i=(n.h+t)%360;return n.h=i<0?360+i:i,Rt(n)}function mC(e){var t=Rt(e).toHsl();return t.h=(t.h+180)%360,Rt(t)}function Lv(e,t){if(isNaN(t)||t<=0)throw new Error("Argument to polyad must be a positive number");for(var n=Rt(e).toHsl(),i=[Rt(e)],r=360/t,s=1;s<t;s++)i.push(Rt({h:(n.h+s*r)%360,s:n.s,l:n.l}));return i}function gC(e){var t=Rt(e).toHsl(),n=t.h;return[Rt(e),Rt({h:(n+72)%360,s:t.s,l:t.l}),Rt({h:(n+216)%360,s:t.s,l:t.l})]}function _C(e,t,n){t=t||6,n=n||30;var i=Rt(e).toHsl(),r=360/n,s=[Rt(e)];for(i.h=(i.h-(r*t>>1)+720)%360;--t;)i.h=(i.h+r)%360,s.push(Rt(i));return s}function vC(e,t){t=t||6;for(var n=Rt(e).toHsv(),i=n.h,r=n.s,s=n.v,o=[],a=1/t;t--;)o.push(Rt({h:i,s:r,v:s})),s=(s+a)%1;return o}Rt.mix=function(e,t,n){n=n===0?0:n||50;var i=Rt(e).toRgb(),r=Rt(t).toRgb(),s=n/100,o={r:(r.r-i.r)*s+i.r,g:(r.g-i.g)*s+i.g,b:(r.b-i.b)*s+i.b,a:(r.a-i.a)*s+i.a};return Rt(o)};Rt.readability=function(e,t){var n=Rt(e),i=Rt(t);return(Math.max(n.getLuminance(),i.getLuminance())+.05)/(Math.min(n.getLuminance(),i.getLuminance())+.05)};Rt.isReadable=function(e,t,n){var i=Rt.readability(e,t),r,s;switch(s=!1,r=wC(n),r.level+r.size){case"AAsmall":case"AAAlarge":s=i>=4.5;break;case"AAlarge":s=i>=3;break;case"AAAsmall":s=i>=7;break}return s};Rt.mostReadable=function(e,t,n){var i=null,r=0,s,o,a,c;n=n||{},o=n.includeFallbackColors,a=n.level,c=n.size;for(var l=0;l<t.length;l++)s=Rt.readability(e,t[l]),s>r&&(r=s,i=Rt(t[l]));return Rt.isReadable(e,i,{level:a,size:c})||!o?i:(n.includeFallbackColors=!1,Rt.mostReadable(e,["#fff","#000"],n))};var Wd=Rt.names={aliceblue:"f0f8ff",antiquewhite:"faebd7",aqua:"0ff",aquamarine:"7fffd4",azure:"f0ffff",beige:"f5f5dc",bisque:"ffe4c4",black:"000",blanchedalmond:"ffebcd",blue:"00f",blueviolet:"8a2be2",brown:"a52a2a",burlywood:"deb887",burntsienna:"ea7e5d",cadetblue:"5f9ea0",chartreuse:"7fff00",chocolate:"d2691e",coral:"ff7f50",cornflowerblue:"6495ed",cornsilk:"fff8dc",crimson:"dc143c",cyan:"0ff",darkblue:"00008b",darkcyan:"008b8b",darkgoldenrod:"b8860b",darkgray:"a9a9a9",darkgreen:"006400",darkgrey:"a9a9a9",darkkhaki:"bdb76b",darkmagenta:"8b008b",darkolivegreen:"556b2f",darkorange:"ff8c00",darkorchid:"9932cc",darkred:"8b0000",darksalmon:"e9967a",darkseagreen:"8fbc8f",darkslateblue:"483d8b",darkslategray:"2f4f4f",darkslategrey:"2f4f4f",darkturquoise:"00ced1",darkviolet:"9400d3",deeppink:"ff1493",deepskyblue:"00bfff",dimgray:"696969",dimgrey:"696969",dodgerblue:"1e90ff",firebrick:"b22222",floralwhite:"fffaf0",forestgreen:"228b22",fuchsia:"f0f",gainsboro:"dcdcdc",ghostwhite:"f8f8ff",gold:"ffd700",goldenrod:"daa520",gray:"808080",green:"008000",greenyellow:"adff2f",grey:"808080",honeydew:"f0fff0",hotpink:"ff69b4",indianred:"cd5c5c",indigo:"4b0082",ivory:"fffff0",khaki:"f0e68c",lavender:"e6e6fa",lavenderblush:"fff0f5",lawngreen:"7cfc00",lemonchiffon:"fffacd",lightblue:"add8e6",lightcoral:"f08080",lightcyan:"e0ffff",lightgoldenrodyellow:"fafad2",lightgray:"d3d3d3",lightgreen:"90ee90",lightgrey:"d3d3d3",lightpink:"ffb6c1",lightsalmon:"ffa07a",lightseagreen:"20b2aa",lightskyblue:"87cefa",lightslategray:"789",lightslategrey:"789",lightsteelblue:"b0c4de",lightyellow:"ffffe0",lime:"0f0",limegreen:"32cd32",linen:"faf0e6",magenta:"f0f",maroon:"800000",mediumaquamarine:"66cdaa",mediumblue:"0000cd",mediumorchid:"ba55d3",mediumpurple:"9370db",mediumseagreen:"3cb371",mediumslateblue:"7b68ee",mediumspringgreen:"00fa9a",mediumturquoise:"48d1cc",mediumvioletred:"c71585",midnightblue:"191970",mintcream:"f5fffa",mistyrose:"ffe4e1",moccasin:"ffe4b5",navajowhite:"ffdead",navy:"000080",oldlace:"fdf5e6",olive:"808000",olivedrab:"6b8e23",orange:"ffa500",orangered:"ff4500",orchid:"da70d6",palegoldenrod:"eee8aa",palegreen:"98fb98",paleturquoise:"afeeee",palevioletred:"db7093",papayawhip:"ffefd5",peachpuff:"ffdab9",peru:"cd853f",pink:"ffc0cb",plum:"dda0dd",powderblue:"b0e0e6",purple:"800080",rebeccapurple:"663399",red:"f00",rosybrown:"bc8f8f",royalblue:"4169e1",saddlebrown:"8b4513",salmon:"fa8072",sandybrown:"f4a460",seagreen:"2e8b57",seashell:"fff5ee",sienna:"a0522d",silver:"c0c0c0",skyblue:"87ceeb",slateblue:"6a5acd",slategray:"708090",slategrey:"708090",snow:"fffafa",springgreen:"00ff7f",steelblue:"4682b4",tan:"d2b48c",teal:"008080",thistle:"d8bfd8",tomato:"ff6347",turquoise:"40e0d0",violet:"ee82ee",wheat:"f5deb3",white:"fff",whitesmoke:"f5f5f5",yellow:"ff0",yellowgreen:"9acd32"},yC=Rt.hexNames=xC(Wd);function xC(e){var t={};for(var n in e)e.hasOwnProperty(n)&&(t[e[n]]=n);return t}function Nv(e){return e=parseFloat(e),(isNaN(e)||e<0||e>1)&&(e=1),e}function Ee(e,t){bC(e)&&(e="100%");var n=MC(e);return e=Math.min(t,Math.max(0,parseFloat(e))),n&&(e=parseInt(e*t,10)/100),Math.abs(e-t)<1e-6?1:e%t/parseFloat(t)}function Lh(e){return Math.min(1,Math.max(0,e))}function En(e){return parseInt(e,16)}function bC(e){return typeof e=="string"&&e.indexOf(".")!=-1&&parseFloat(e)===1}function MC(e){return typeof e=="string"&&e.indexOf("%")!=-1}function ri(e){return e.length==1?"0"+e:""+e}function Sa(e){return e<=1&&(e=e*100+"%"),e}function Fv(e){return Math.round(parseFloat(e)*255).toString(16)}function Ov(e){return En(e)/255}var ii=(function(){var e="[-\\+]?\\d+%?",t="[-\\+]?\\d*\\.\\d+%?",n="(?:"+t+")|(?:"+e+")",i="[\\s|\\(]+("+n+")[,|\\s]+("+n+")[,|\\s]+("+n+")\\s*\\)?",r="[\\s|\\(]+("+n+")[,|\\s]+("+n+")[,|\\s]+("+n+")[,|\\s]+("+n+")\\s*\\)?";return{CSS_UNIT:new RegExp(n),rgb:new RegExp("rgb"+i),rgba:new RegExp("rgba"+r),hsl:new RegExp("hsl"+i),hsla:new RegExp("hsla"+r),hsv:new RegExp("hsv"+i),hsva:new RegExp("hsva"+r),hex3:/^#?([0-9a-fA-F]{1})([0-9a-fA-F]{1})([0-9a-fA-F]{1})$/,hex6:/^#?([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/,hex4:/^#?([0-9a-fA-F]{1})([0-9a-fA-F]{1})([0-9a-fA-F]{1})([0-9a-fA-F]{1})$/,hex8:/^#?([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/}})();function Bi(e){return!!ii.CSS_UNIT.exec(e)}function SC(e){e=e.replace(eC,"").replace(nC,"").toLowerCase();var t=!1;if(Wd[e])e=Wd[e],t=!0;else if(e=="transparent")return{r:0,g:0,b:0,a:0,format:"name"};var n;return(n=ii.rgb.exec(e))?{r:n[1],g:n[2],b:n[3]}:(n=ii.rgba.exec(e))?{r:n[1],g:n[2],b:n[3],a:n[4]}:(n=ii.hsl.exec(e))?{h:n[1],s:n[2],l:n[3]}:(n=ii.hsla.exec(e))?{h:n[1],s:n[2],l:n[3],a:n[4]}:(n=ii.hsv.exec(e))?{h:n[1],s:n[2],v:n[3]}:(n=ii.hsva.exec(e))?{h:n[1],s:n[2],v:n[3],a:n[4]}:(n=ii.hex8.exec(e))?{r:En(n[1]),g:En(n[2]),b:En(n[3]),a:Ov(n[4]),format:t?"name":"hex8"}:(n=ii.hex6.exec(e))?{r:En(n[1]),g:En(n[2]),b:En(n[3]),format:t?"name":"hex"}:(n=ii.hex4.exec(e))?{r:En(n[1]+""+n[1]),g:En(n[2]+""+n[2]),b:En(n[3]+""+n[3]),a:Ov(n[4]+""+n[4]),format:t?"name":"hex8"}:(n=ii.hex3.exec(e))?{r:En(n[1]+""+n[1]),g:En(n[2]+""+n[2]),b:En(n[3]+""+n[3]),format:t?"name":"hex"}:!1}function wC(e){var t,n;return e=e||{level:"AA",size:"small"},t=(e.level||"AA").toUpperCase(),n=(e.size||"small").toLowerCase(),t!=="AA"&&t!=="AAA"&&(t="AA"),n!=="small"&&n!=="large"&&(n="small"),{level:t,size:n}}var Vv=e=>{e instanceof Array?e.forEach(Vv):(e.map&&e.map.dispose(),e.dispose())},Xd=e=>{e.geometry&&e.geometry.dispose(),e.material&&Vv(e.material),e.texture&&e.texture.dispose(),e.children&&e.children.forEach(Xd)},Uv=e=>{for(;e.children.length;){let t=e.children[0];e.remove(t),Xd(t)}},Ea,Qs,Xr=class extends q_{constructor(n,{dataBindAttr:i="__data",objBindAttr:r="__threeObj"}={}){super();Zp(this,"scene");Ru(this,Ea);Ru(this,Qs);this.scene=n,Pu(this,Ea,i),Pu(this,Qs,r),this.onRemoveObj(()=>{})}onCreateObj(n){return super.onCreateObj(i=>{let r=n(i);return i[Xa(this,Qs)]=r,r[Xa(this,Ea)]=i,this.scene.add(r),r}),this}onRemoveObj(n){return super.onRemoveObj((i,r)=>{let s=super.getData(i);n(i,r),this.scene.remove(i),Xd(i),delete s[Xa(this,Qs)]}),this}};Ea=new WeakMap,Qs=new WeakMap;var wa=e=>isNaN(e)?parseInt(Rt(e).toHex(),16):e,jd=e=>isNaN(e)?Rt(e).getAlpha():1,EC=Gd(Cv);function zv(e,t,n){!t||typeof n!="string"||e.filter(i=>!i[n]).forEach(i=>{i[n]=EC(t(i))})}function TC({nodes:e,links:t},n,{nodeFilter:i=()=>!0,onLoopError:r=s=>{throw`Invalid DAG structure! Found cycle in node path: ${s.join(" -> ")}.`}}={}){let s={};e.forEach(l=>s[n(l)]={data:l,out:[],depth:-1,skip:!i(l)}),t.forEach(({source:l,target:u})=>{let h=_(l),d=_(u);if(!s.hasOwnProperty(h))throw`Missing source node with id: ${h}`;if(!s.hasOwnProperty(d))throw`Missing target node with id: ${d}`;let f=s[h],m=s[d];f.out.push(m);function _(g){return typeof g=="object"?n(g):g}});let o=[];return c(Object.values(s)),Object.assign({},...Object.entries(s).filter(([,l])=>!l.skip).map(([l,u])=>({[l]:u.depth})));function c(l,u=[],h=0){for(let d=0,f=l.length;d<f;d++){let m=l[d];if(u.indexOf(m)!==-1){let _=[...u.slice(u.indexOf(m)),m].map(g=>n(g.data));o.some(g=>g.length===_.length&&g.every((p,b)=>p===_[b]))||(o.push(_),r(_));continue}h>m.depth&&(m.depth=h,c(m.out,[...u,m],h+(m.skip?0:1)))}}}var Ut=window.THREE?window.THREE:{Group:Ye,Mesh:we,MeshLambertMaterial:Xo,Color:Ot,BufferGeometry:ve,BufferAttribute:Ze,Matrix4:Vt,Vector3:I,SphereGeometry:Di,CylinderGeometry:Cs,TubeGeometry:Wo,ConeGeometry:Vo,Line:ui,LineBasicMaterial:Jn,QuadraticBezierCurve3:Cr,CubicBezierCurve3:Rs,Box3:pn},kv={graph:W0,forcelayout:Bv.default},AC=2,qd=new Ut.BufferGeometry().setAttribute?"setAttribute":"addAttribute",Oh=new Ut.BufferGeometry().applyMatrix4?"applyMatrix4":"applyMatrix",CC=rr({props:{jsonUrl:{onChange:function(e,t){e&&!t.fetchingJson&&(t.fetchingJson=!0,t.onLoading(),fetch(e).then(n=>n.json()).then(n=>{t.fetchingJson=!1,t.onFinishLoading(n),this.graphData(n)}))},triggerUpdate:!1},graphData:{default:{nodes:[],links:[]},onChange(e,t){t.engineRunning=!1}},numDimensions:{default:3,onChange(e,t){let n=t.d3ForceLayout.force("charge");n&&n.strength(e>2?-60:-30),e<3&&i(t.graphData.nodes,"z"),e<2&&i(t.graphData.nodes,"y");function i(r,s){r.forEach(o=>{delete o[s],delete o[`v${s}`]})}}},dagMode:{onChange(e,t){!e&&t.forceEngine==="d3"&&(t.graphData.nodes||[]).forEach(n=>n.fx=n.fy=n.fz=void 0)}},dagLevelDistance:{},dagNodeFilter:{default:e=>!0},onDagError:{triggerUpdate:!1},nodeRelSize:{default:4},nodeId:{default:"id"},nodeVal:{default:"val"},nodeResolution:{default:8},nodeColor:{default:"color"},nodeAutoColorBy:{},nodeOpacity:{default:.75},nodeVisibility:{default:!0},nodeThreeObject:{},nodeThreeObjectExtend:{default:!1},nodePositionUpdate:{triggerUpdate:!1},linkSource:{default:"source"},linkTarget:{default:"target"},linkVisibility:{default:!0},linkColor:{default:"color"},linkAutoColorBy:{},linkOpacity:{default:.2},linkWidth:{},linkResolution:{default:6},linkCurvature:{default:0,triggerUpdate:!1},linkCurveRotation:{default:0,triggerUpdate:!1},linkMaterial:{},linkThreeObject:{},linkThreeObjectExtend:{default:!1},linkPositionUpdate:{triggerUpdate:!1},linkDirectionalArrowLength:{default:0},linkDirectionalArrowColor:{},linkDirectionalArrowRelPos:{default:.5,triggerUpdate:!1},linkDirectionalArrowResolution:{default:8},linkDirectionalParticles:{default:0},linkDirectionalParticleSpeed:{default:.01,triggerUpdate:!1},linkDirectionalParticleOffset:{default:0,triggerUpdate:!1},linkDirectionalParticleWidth:{default:.5},linkDirectionalParticleColor:{},linkDirectionalParticleResolution:{default:4},linkDirectionalParticleThreeObject:{},forceEngine:{default:"d3"},d3AlphaMin:{default:0},d3AlphaDecay:{default:.0228,triggerUpdate:!1,onChange(e,t){t.d3ForceLayout.alphaDecay(e)}},d3AlphaTarget:{default:0,triggerUpdate:!1,onChange(e,t){t.d3ForceLayout.alphaTarget(e)}},d3VelocityDecay:{default:.4,triggerUpdate:!1,onChange(e,t){t.d3ForceLayout.velocityDecay(e)}},ngraphPhysics:{default:{timeStep:20,gravity:-1.2,theta:.8,springLength:30,springCoefficient:8e-4,dragCoefficient:.02}},warmupTicks:{default:0,triggerUpdate:!1},cooldownTicks:{default:1/0,triggerUpdate:!1},cooldownTime:{default:15e3,triggerUpdate:!1},onLoading:{default:()=>{},triggerUpdate:!1},onFinishLoading:{default:()=>{},triggerUpdate:!1},onUpdate:{default:()=>{},triggerUpdate:!1},onFinishUpdate:{default:()=>{},triggerUpdate:!1},onEngineTick:{default:()=>{},triggerUpdate:!1},onEngineStop:{default:()=>{},triggerUpdate:!1}},methods:{refresh:function(e){return e._flushObjects=!0,e._rerender(),this},d3Force:function(e,t,n){return n===void 0?e.d3ForceLayout.force(t):(e.d3ForceLayout.force(t,n),this)},d3ReheatSimulation:function(e){return e.d3ForceLayout.alpha(1),this.resetCountdown(),this},resetCountdown:function(e){return e.cntTicks=0,e.startTickTime=new Date,e.engineRunning=!0,this},tickFrame:function(e){let t=e.forceEngine!=="ngraph";return e.engineRunning&&e.layout&&n(),i(),r(),this;function n(){++e.cntTicks>e.cooldownTicks||new Date-e.startTickTime>e.cooldownTime||t&&e.d3AlphaMin>0&&e.d3ForceLayout.alpha()<e.d3AlphaMin?(e.engineRunning=!1,e.onEngineStop()):(e.layout[t?"tick":"step"](),e.onEngineTick());let s=Zt(e.nodeThreeObjectExtend);e.nodeDataMapper.entries().forEach(([h,d])=>{if(!d)return;let f=t?h:e.layout.getNodePosition(h[e.nodeId]),m=s(h);(!e.nodePositionUpdate||!e.nodePositionUpdate(m?d.children[0]:d,{x:f.x,y:f.y,z:f.z},h)||m)&&(d.position.x=f.x,d.position.y=f.y||0,d.position.z=f.z||0)});let o=Zt(e.linkWidth),a=Zt(e.linkCurvature),c=Zt(e.linkCurveRotation),l=Zt(e.linkThreeObjectExtend);e.linkDataMapper.entries().forEach(([h,d])=>{if(!d)return;let f=t?h:e.layout.getLinkPosition(e.layout.graph.getLink(h.source,h.target).id),m=f[t?"source":"from"],_=f[t?"target":"to"];if(!m||!_||!m.hasOwnProperty("x")||!_.hasOwnProperty("x"))return;u(h);let g=l(h);if(e.linkPositionUpdate&&e.linkPositionUpdate(g?d.children[1]:d,{start:{x:m.x,y:m.y,z:m.z},end:{x:_.x,y:_.y,z:_.z}},h)&&!g)return;let p=30,b=h.__curve,x=d.children.length?d.children[0]:d;if(x.type==="Line"){if(b){let v=b.getPoints(p);x.geometry.getAttribute("position").array.length!==v.length*3&&x.geometry[qd]("position",new Ut.BufferAttribute(new Float32Array(v.length*3),3)),x.geometry.setFromPoints(v)}else{let v=x.geometry.getAttribute("position");(!v||!v.array||v.array.length!==6)&&x.geometry[qd]("position",v=new Ut.BufferAttribute(new Float32Array(6),3)),v.array[0]=m.x,v.array[1]=m.y||0,v.array[2]=m.z||0,v.array[3]=_.x,v.array[4]=_.y||0,v.array[5]=_.z||0,v.needsUpdate=!0}x.geometry.computeBoundingSphere()}else if(x.type==="Mesh")if(b){x.geometry.type.match(/^Tube(Buffer)?Geometry$/)||(x.position.set(0,0,0),x.rotation.set(0,0,0),x.scale.set(1,1,1));let M=Math.ceil(o(h)*10)/10/2,S=new Ut.TubeGeometry(b,p,M,e.linkResolution,!1);x.geometry.dispose(),x.geometry=S}else{if(!x.geometry.type.match(/^Cylinder(Buffer)?Geometry$/)){let P=Math.ceil(o(h)*10)/10/2,T=new Ut.CylinderGeometry(P,P,1,e.linkResolution,1,!1);T[Oh](new Ut.Matrix4().makeTranslation(0,1/2,0)),T[Oh](new Ut.Matrix4().makeRotationX(Math.PI/2)),x.geometry.dispose(),x.geometry=T}let v=new Ut.Vector3(m.x,m.y||0,m.z||0),M=new Ut.Vector3(_.x,_.y||0,_.z||0),S=v.distanceTo(M);x.position.x=v.x,x.position.y=v.y,x.position.z=v.z,x.scale.z=S,x.parent.localToWorld(M),x.lookAt(M)}});function u(h){let d=t?h:e.layout.getLinkPosition(e.layout.graph.getLink(h.source,h.target).id),f=d[t?"source":"from"],m=d[t?"target":"to"];if(!f||!m||!f.hasOwnProperty("x")||!m.hasOwnProperty("x"))return;let _=a(h);if(!_)h.__curve=null;else{let g=new Ut.Vector3(f.x,f.y||0,f.z||0),p=new Ut.Vector3(m.x,m.y||0,m.z||0),b=g.distanceTo(p),x,v=c(h);if(b>0){let M=m.x-f.x,S=m.y-f.y||0,C=new Ut.Vector3().subVectors(p,g),P=C.clone().multiplyScalar(_).cross(M!==0||S!==0?new Ut.Vector3(0,0,1):new Ut.Vector3(0,1,0)).applyAxisAngle(C.normalize(),v).add(new Ut.Vector3().addVectors(g,p).divideScalar(2));x=new Ut.QuadraticBezierCurve3(g,P,p)}else{let M=_*70,S=-v,C=S+Math.PI/2;x=new Ut.CubicBezierCurve3(g,new Ut.Vector3(M*Math.cos(C),M*Math.sin(C),0).add(g),new Ut.Vector3(M*Math.cos(S),M*Math.sin(S),0).add(g),p)}h.__curve=x}}}function i(){let s=Zt(e.linkDirectionalArrowRelPos),o=Zt(e.linkDirectionalArrowLength),a=Zt(e.nodeVal);e.arrowDataMapper.entries().forEach(([c,l])=>{if(!l)return;let u=t?c:e.layout.getLinkPosition(e.layout.graph.getLink(c.source,c.target).id),h=u[t?"source":"from"],d=u[t?"target":"to"];if(!h||!d||!h.hasOwnProperty("x")||!d.hasOwnProperty("x"))return;let f=Math.cbrt(Math.max(0,a(h)||1))*e.nodeRelSize,m=Math.cbrt(Math.max(0,a(d)||1))*e.nodeRelSize,_=o(c),g=s(c),p=c.__curve?C=>c.__curve.getPoint(C):C=>{let P=(T,w,R,V)=>w[T]+(R[T]-w[T])*V||0;return{x:P("x",h,d,C),y:P("y",h,d,C),z:P("z",h,d,C)}},b=c.__curve?c.__curve.getLength():Math.sqrt(["x","y","z"].map(C=>Math.pow((d[C]||0)-(h[C]||0),2)).reduce((C,P)=>C+P,0)),x=f+_+(b-f-m-_)*g,v=p(x/b),M=p((x-_)/b);["x","y","z"].forEach(C=>l.position[C]=M[C]);let S=new Ut.Vector3(...["x","y","z"].map(C=>v[C]));l.parent.localToWorld(S),l.lookAt(S)})}function r(){let s=Zt(e.linkDirectionalParticleSpeed),o=Zt(e.linkDirectionalParticleOffset);e.graphData.links.forEach(a=>{let c=e.particlesDataMapper.getObj(a),l=c&&c.children,u=a.__singleHopPhotonsObj&&a.__singleHopPhotonsObj.children;if((!u||!u.length)&&(!l||!l.length))return;let h=t?a:e.layout.getLinkPosition(e.layout.graph.getLink(a.source,a.target).id),d=h[t?"source":"from"],f=h[t?"target":"to"];if(!d||!f||!d.hasOwnProperty("x")||!f.hasOwnProperty("x"))return;let m=s(a),_=Math.abs(o(a)),g=a.__curve?b=>a.__curve.getPoint(b):b=>{let x=(v,M,S,C)=>M[v]+(S[v]-M[v])*C||0;return{x:x("x",d,f,b),y:x("y",d,f,b),z:x("z",d,f,b)}};[...l||[],...u||[]].forEach((b,x)=>{let v=b.parent.__linkThreeObjType==="singleHopPhotons";if(b.hasOwnProperty("__progressRatio")||(b.__progressRatio=v?m<0?1:0:(x+_)/l.length),b.__progressRatio+=m,b.__progressRatio>=1||b.__progressRatio<0)if(!v)b.__progressRatio=b.__progressRatio%1,b.__progressRatio<0&&b.__progressRatio++;else{b.parent.remove(b),Uv(b);return}let M=b.__progressRatio,S=g(M);b.geometry.type!=="SphereGeometry"&&b.lookAt(S.x,S.y,S.z),["x","y","z"].forEach(C=>b.position[C]=S[C])})})}},emitParticle:function(e,t){if(t&&e.graphData.links.includes(t)){if(!t.__singleHopPhotonsObj){let i=new Ut.Group;i.__linkThreeObjType="singleHopPhotons",t.__singleHopPhotonsObj=i,e.graphScene.add(i)}let n=Zt(e.linkDirectionalParticleThreeObject)(t);if(n&&e.linkDirectionalParticleThreeObject===n&&(n=n.clone()),!n){let i=Zt(e.linkDirectionalParticleWidth),r=Math.ceil(i(t)*10)/10/2,s=e.linkDirectionalParticleResolution,o=new Ut.SphereGeometry(r,s,s),a=Zt(e.linkColor),l=Zt(e.linkDirectionalParticleColor)(t)||a(t)||"#f0f0f0",u=new Ut.Color(wa(l)),h=e.linkOpacity*3,d=new Ut.MeshLambertMaterial({color:u,transparent:!0,opacity:h});n=new Ut.Mesh(o,d)}t.__singleHopPhotonsObj.add(n)}return this},getGraphBbox:function(e,t=()=>!0){if(!e.initialised)return null;let n=(function i(r){let s=[];if(r.geometry){r.geometry.computeBoundingBox();let o=new Ut.Box3;o.copy(r.geometry.boundingBox).applyMatrix4(r.matrixWorld),s.push(o)}return s.concat(...(r.children||[]).filter(o=>!o.hasOwnProperty("__graphObjType")||o.__graphObjType==="node"&&t(o.__data)).map(i))})(e.graphScene);return n.length?Object.assign(...["x","y","z"].map(i=>({[i]:[G_(n,r=>r.min[i]),H_(n,r=>r.max[i])]}))):null}},stateInit:()=>({d3ForceLayout:fd().force("link",od()).force("charge",dd()).force("center",ed()).force("dagRadial",null).stop(),engineRunning:!1}),init(e,t){t.graphScene=e,t.nodeDataMapper=new Xr(e,{objBindAttr:"__threeObj"}),t.linkDataMapper=new Xr(e,{objBindAttr:"__lineObj"}),t.arrowDataMapper=new Xr(e,{objBindAttr:"__arrowObj"}),t.particlesDataMapper=new Xr(e,{objBindAttr:"__photonsObj"})},update(e,t){let n=i=>i.some(r=>t.hasOwnProperty(r));if(e.engineRunning=!1,typeof e.onUpdate=="function"&&e.onUpdate(),e.nodeAutoColorBy!==null&&n(["nodeAutoColorBy","graphData","nodeColor"])&&zv(e.graphData.nodes,Zt(e.nodeAutoColorBy),e.nodeColor),e.linkAutoColorBy!==null&&n(["linkAutoColorBy","graphData","linkColor"])&&zv(e.graphData.links,Zt(e.linkAutoColorBy),e.linkColor),e._flushObjects||n(["graphData","nodeThreeObject","nodeThreeObjectExtend","nodeVal","nodeColor","nodeVisibility","nodeRelSize","nodeResolution","nodeOpacity"])){let i=Zt(e.nodeThreeObject),r=Zt(e.nodeThreeObjectExtend),s=Zt(e.nodeVal),o=Zt(e.nodeColor),a=Zt(e.nodeVisibility),c={},l={};(e._flushObjects||n(["nodeThreeObject","nodeThreeObjectExtend"]))&&e.nodeDataMapper.clear(),e.nodeDataMapper.onCreateObj(u=>{let h=i(u),d=r(u);h&&e.nodeThreeObject===h&&(h=h.clone());let f;return h&&!d?f=h:(f=new Ut.Mesh,f.__graphDefaultObj=!0,h&&d&&f.add(h)),f.__graphObjType="node",f}).onUpdateObj((u,h)=>{if(u.__graphDefaultObj){let d=s(h)||1,f=Math.cbrt(d)*e.nodeRelSize,m=e.nodeResolution;(!u.geometry.type.match(/^Sphere(Buffer)?Geometry$/)||u.geometry.parameters.radius!==f||u.geometry.parameters.widthSegments!==m)&&(c.hasOwnProperty(d)||(c[d]=new Ut.SphereGeometry(f,m,m)),u.geometry.dispose(),u.geometry=c[d]);let _=o(h),g=new Ut.Color(wa(_||"#ffffaa")),p=e.nodeOpacity*jd(_);(u.material.type!=="MeshLambertMaterial"||!u.material.color.equals(g)||u.material.opacity!==p)&&(l.hasOwnProperty(_)||(l[_]=new Ut.MeshLambertMaterial({color:g,transparent:!0,opacity:p})),u.material.dispose(),u.material=l[_])}}).digest(e.graphData.nodes.filter(a))}if(e._flushObjects||n(["graphData","linkThreeObject","linkThreeObjectExtend","linkMaterial","linkColor","linkWidth","linkVisibility","linkResolution","linkOpacity","linkDirectionalArrowLength","linkDirectionalArrowColor","linkDirectionalArrowResolution","linkDirectionalParticles","linkDirectionalParticleWidth","linkDirectionalParticleColor","linkDirectionalParticleResolution","linkDirectionalParticleThreeObject"])){let i=Zt(e.linkThreeObject),r=Zt(e.linkThreeObjectExtend),s=Zt(e.linkMaterial),o=Zt(e.linkVisibility),a=Zt(e.linkColor),c=Zt(e.linkWidth),l={},u={},h={},d=e.graphData.links.filter(o);if((e._flushObjects||n(["linkThreeObject","linkThreeObjectExtend","linkWidth"]))&&e.linkDataMapper.clear(),e.linkDataMapper.onRemoveObj(f=>{let m=f.__data&&f.__data.__singleHopPhotonsObj;m&&(m.parent.remove(m),Uv(m),delete f.__data.__singleHopPhotonsObj)}).onCreateObj(f=>{let m=i(f),_=r(f);m&&e.linkThreeObject===m&&(m=m.clone());let g;if(!m||_)if(!!c(f))g=new Ut.Mesh;else{let x=new Ut.BufferGeometry;x[qd]("position",new Ut.BufferAttribute(new Float32Array(6),3)),g=new Ut.Line(x)}let p;return m?_?(p=new Ut.Group,p.__graphDefaultObj=!0,p.add(g),p.add(m)):p=m:(p=g,p.__graphDefaultObj=!0),p.renderOrder=10,p.__graphObjType="link",p}).onUpdateObj((f,m)=>{if(f.__graphDefaultObj){let _=f.children.length?f.children[0]:f,g=Math.ceil(c(m)*10)/10,p=!!g;if(p){let x=g/2,v=e.linkResolution;if(!_.geometry.type.match(/^Cylinder(Buffer)?Geometry$/)||_.geometry.parameters.radiusTop!==x||_.geometry.parameters.radialSegments!==v){if(!l.hasOwnProperty(g)){let M=new Ut.CylinderGeometry(x,x,1,v,1,!1);M[Oh](new Ut.Matrix4().makeTranslation(0,1/2,0)),M[Oh](new Ut.Matrix4().makeRotationX(Math.PI/2)),l[g]=M}_.geometry.dispose(),_.geometry=l[g]}}let b=s(m);if(b)_.material=b;else{let x=a(m),v=new Ut.Color(wa(x||"#f0f0f0")),M=e.linkOpacity*jd(x),S=p?"MeshLambertMaterial":"LineBasicMaterial";if(_.material.type!==S||!_.material.color.equals(v)||_.material.opacity!==M){let C=p?u:h;C.hasOwnProperty(x)||(C[x]=new Ut[S]({color:v,transparent:M<1,opacity:M,depthWrite:M>=1})),_.material.dispose(),_.material=C[x]}}}}).digest(d),e.linkDirectionalArrowLength||t.hasOwnProperty("linkDirectionalArrowLength")){let f=Zt(e.linkDirectionalArrowLength),m=Zt(e.linkDirectionalArrowColor);e.arrowDataMapper.onCreateObj(()=>{let _=new Ut.Mesh(void 0,new Ut.MeshLambertMaterial({transparent:!0}));return _.__linkThreeObjType="arrow",_}).onUpdateObj((_,g)=>{let p=f(g),b=e.linkDirectionalArrowResolution;if(!_.geometry.type.match(/^Cone(Buffer)?Geometry$/)||_.geometry.parameters.height!==p||_.geometry.parameters.radialSegments!==b){let v=new Ut.ConeGeometry(p*.25,p,b);v.translate(0,p/2,0),v.rotateX(Math.PI/2),_.geometry.dispose(),_.geometry=v}let x=m(g)||a(g)||"#f0f0f0";_.material.color=new Ut.Color(wa(x)),_.material.opacity=e.linkOpacity*3*jd(x)}).digest(d.filter(f))}if(e.linkDirectionalParticles||t.hasOwnProperty("linkDirectionalParticles")){let f=Zt(e.linkDirectionalParticles),m=Zt(e.linkDirectionalParticleWidth),_=Zt(e.linkDirectionalParticleColor),g=Zt(e.linkDirectionalParticleThreeObject),p={},b={};e.particlesDataMapper.onCreateObj(()=>{let x=new Ut.Group;return x.__linkThreeObjType="photons",x.__photonDataMapper=new Xr(x),x}).onUpdateObj((x,v)=>{let M=!!x.children.length&&x.children[0],S=g(v),C,P;if(S)C=S.geometry,P=S.material;else{let w=Math.ceil(m(v)*10)/10/2,R=e.linkDirectionalParticleResolution;M&&M.geometry.parameters.radius===w&&M.geometry.parameters.widthSegments===R?C=M.geometry:(b.hasOwnProperty(w)||(b[w]=new Ut.SphereGeometry(w,R,R)),C=b[w]);let V=_(v)||a(v)||"#f0f0f0",N=new Ut.Color(wa(V)),k=e.linkOpacity*3;M&&M.material.color.equals(N)&&M.material.opacity===k?P=M.material:(p.hasOwnProperty(V)||(p[V]=new Ut.MeshLambertMaterial({color:N,transparent:!0,opacity:k})),P=p[V])}M&&(M.geometry!==C&&M.geometry.dispose(),M.material!==P&&M.material.dispose());let T=Math.round(Math.abs(f(v)));x.__photonDataMapper.id(w=>w.idx).onCreateObj(()=>new Ut.Mesh(C,P)).onUpdateObj(w=>{w.geometry=C,w.material=P}).digest([...new Array(T)].map((w,R)=>({idx:R})))}).digest(d.filter(f))}}if(e._flushObjects=!1,n(["graphData","nodeId","linkSource","linkTarget","numDimensions","forceEngine","dagMode","dagNodeFilter","dagLevelDistance"])){e.engineRunning=!1,e.graphData.links.forEach(s=>{s.source=s[e.linkSource],s.target=s[e.linkTarget]});let i=e.forceEngine!=="ngraph",r;if(i){(r=e.d3ForceLayout).stop().alpha(1).numDimensions(e.numDimensions).nodes(e.graphData.nodes);let s=e.d3ForceLayout.force("link");s&&s.id(l=>l[e.nodeId]).links(e.graphData.links);let o=e.dagMode&&TC(e.graphData,l=>l[e.nodeId],{nodeFilter:e.dagNodeFilter,onLoopError:e.onDagError||void 0}),a=Math.max(...Object.values(o||[])),c=e.dagLevelDistance||e.graphData.nodes.length/(a||1)*AC*(["radialin","radialout"].indexOf(e.dagMode)!==-1?.7:1);if(["lr","rl","td","bu","zin","zout"].includes(t.dagMode)){let l=["lr","rl"].includes(t.dagMode)?"fx":["td","bu"].includes(t.dagMode)?"fy":"fz";e.graphData.nodes.filter(e.dagNodeFilter).forEach(u=>delete u[l])}if(["lr","rl","td","bu","zin","zout"].includes(e.dagMode)){let l=["rl","td","zout"].includes(e.dagMode),u=d=>(o[d[e.nodeId]]-a/2)*c*(l?-1:1),h=["lr","rl"].includes(e.dagMode)?"fx":["td","bu"].includes(e.dagMode)?"fy":"fz";e.graphData.nodes.filter(e.dagNodeFilter).forEach(d=>d[h]=u(d))}e.d3ForceLayout.force("dagRadial",["radialin","radialout"].indexOf(e.dagMode)!==-1?pd(l=>{let u=o[l[e.nodeId]]||-1;return(e.dagMode==="radialin"?a-u:u)*c}).strength(l=>e.dagNodeFilter(l)?1:0):null)}else{let s=kv.graph();e.graphData.nodes.forEach(o=>{s.addNode(o[e.nodeId])}),e.graphData.links.forEach(o=>{s.addLink(o.source,o.target)}),r=kv.forcelayout(s,qe({dimensions:e.numDimensions},e.ngraphPhysics)),r.graph=s}for(let s=0;s<e.warmupTicks&&!(i&&e.d3AlphaMin>0&&e.d3ForceLayout.alpha()<e.d3AlphaMin);s++)r[i?"tick":"step"]();e.layout=r,this.resetCountdown()}e.engineRunning=!0,e.onFinishUpdate()}});function RC(e,t=Object,n=!1){var s;class i extends t{constructor(...a){super(...a),this.__kapsuleInstance=new e(...n?[this]:[],...a)}}let r=e();return(s=r._destructor)==null||s.call(r),Object.keys(r).forEach(o=>i.prototype[o]=function(...a){let c=this.__kapsuleInstance[o](...a);return c===this.__kapsuleInstance?this:c}),i}var PC=window.THREE?window.THREE:{Group:Ye},$d=RC(CC,PC.Group,!0);var Nh=class{constructor(){throw new Error("WebGPU fora do bundle da Teia")}};var Yd={type:"change"},Jd={type:"start"},Qd={type:"end"},Hv=1e-6,le={NONE:-1,ROTATE:0,ZOOM:1,PAN:2,TOUCH_ROTATE:3,TOUCH_ZOOM_PAN:4},Fh=new it,or=new it,IC=new I,Uh=new I,Zd=new I,to=new Ne,Gv=new I,zh=new I,Kd=new I,kh=new I,Bh=class extends wn{constructor(t,n=null){super(t,n),this.screen={left:0,top:0,width:0,height:0},this.rotateSpeed=1,this.zoomSpeed=1.2,this.panSpeed=.3,this.noRotate=!1,this.noZoom=!1,this.noPan=!1,this.staticMoving=!1,this.dynamicDampingFactor=.2,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.keys=["KeyA","KeyS","KeyD"],this.mouseButtons={LEFT:Pe.ROTATE,MIDDLE:Pe.DOLLY,RIGHT:Pe.PAN},this.target=new I,this.state=le.NONE,this.keyState=le.NONE,this._lastPosition=new I,this._lastZoom=1,this._touchZoomDistanceStart=0,this._touchZoomDistanceEnd=0,this._lastAngle=0,this._eye=new I,this._movePrev=new it,this._moveCurr=new it,this._lastAxis=new I,this._zoomStart=new it,this._zoomEnd=new it,this._panStart=new it,this._panEnd=new it,this._pointers=[],this._pointerPositions={},this._onPointerMove=LC.bind(this),this._onPointerDown=DC.bind(this),this._onPointerUp=OC.bind(this),this._onPointerCancel=NC.bind(this),this._onContextMenu=HC.bind(this),this._onMouseWheel=VC.bind(this),this._onKeyDown=UC.bind(this),this._onKeyUp=FC.bind(this),this._onTouchStart=GC.bind(this),this._onTouchMove=WC.bind(this),this._onTouchEnd=jC.bind(this),this._onMouseDown=zC.bind(this),this._onMouseMove=kC.bind(this),this._onMouseUp=BC.bind(this),this._target0=this.target.clone(),this._position0=this.object.position.clone(),this._up0=this.object.up.clone(),this._zoom0=this.object.zoom,n!==null&&(this.connect(n),this.handleResize()),this.update()}connect(t){super.connect(t),window.addEventListener("keydown",this._onKeyDown),window.addEventListener("keyup",this._onKeyUp),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerCancel),this.domElement.addEventListener("wheel",this._onMouseWheel,{passive:!1}),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.style.touchAction="none"}disconnect(){window.removeEventListener("keydown",this._onKeyDown),window.removeEventListener("keyup",this._onKeyUp),this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.removeEventListener("pointermove",this._onPointerMove),this.domElement.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerCancel),this.domElement.removeEventListener("wheel",this._onMouseWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.domElement.style.touchAction="auto"}dispose(){this.disconnect()}handleResize(){let t=this.domElement.getBoundingClientRect(),n=this.domElement.ownerDocument.documentElement;this.screen.left=t.left+window.pageXOffset-n.clientLeft,this.screen.top=t.top+window.pageYOffset-n.clientTop,this.screen.width=t.width,this.screen.height=t.height}update(){this._eye.subVectors(this.object.position,this.target),this.noRotate||this._rotateCamera(),this.noZoom||this._zoomCamera(),this.noPan||this._panCamera(),this.object.position.addVectors(this.target,this._eye),this.object.isPerspectiveCamera?(this._checkDistances(),this.object.lookAt(this.target),this._lastPosition.distanceToSquared(this.object.position)>Hv&&(this.dispatchEvent(Yd),this._lastPosition.copy(this.object.position))):this.object.isOrthographicCamera?(this.object.lookAt(this.target),(this._lastPosition.distanceToSquared(this.object.position)>Hv||this._lastZoom!==this.object.zoom)&&(this.dispatchEvent(Yd),this._lastPosition.copy(this.object.position),this._lastZoom=this.object.zoom)):console.warn("THREE.TrackballControls: Unsupported camera type.")}reset(){this.state=le.NONE,this.keyState=le.NONE,this.target.copy(this._target0),this.object.position.copy(this._position0),this.object.up.copy(this._up0),this.object.zoom=this._zoom0,this.object.updateProjectionMatrix(),this._eye.subVectors(this.object.position,this.target),this.object.lookAt(this.target),this.dispatchEvent(Yd),this._lastPosition.copy(this.object.position),this._lastZoom=this.object.zoom}_panCamera(){if(or.copy(this._panEnd).sub(this._panStart),or.lengthSq()){if(this.object.isOrthographicCamera){let t=(this.object.right-this.object.left)/this.object.zoom/this.domElement.clientWidth,n=(this.object.top-this.object.bottom)/this.object.zoom/this.domElement.clientWidth;or.x*=t,or.y*=n}or.multiplyScalar(this._eye.length()*this.panSpeed),Uh.copy(this._eye).cross(this.object.up).setLength(or.x),Uh.add(IC.copy(this.object.up).setLength(or.y)),this.object.position.add(Uh),this.target.add(Uh),this.staticMoving?this._panStart.copy(this._panEnd):this._panStart.add(or.subVectors(this._panEnd,this._panStart).multiplyScalar(this.dynamicDampingFactor))}}_rotateCamera(){kh.set(this._moveCurr.x-this._movePrev.x,this._moveCurr.y-this._movePrev.y,0);let t=kh.length();t?(this._eye.copy(this.object.position).sub(this.target),Gv.copy(this._eye).normalize(),zh.copy(this.object.up).normalize(),Kd.crossVectors(zh,Gv).normalize(),zh.setLength(this._moveCurr.y-this._movePrev.y),Kd.setLength(this._moveCurr.x-this._movePrev.x),kh.copy(zh.add(Kd)),Zd.crossVectors(kh,this._eye).normalize(),t*=this.rotateSpeed,to.setFromAxisAngle(Zd,t),this._eye.applyQuaternion(to),this.object.up.applyQuaternion(to),this._lastAxis.copy(Zd),this._lastAngle=t):!this.staticMoving&&this._lastAngle&&(this._lastAngle*=Math.sqrt(1-this.dynamicDampingFactor),this._eye.copy(this.object.position).sub(this.target),to.setFromAxisAngle(this._lastAxis,this._lastAngle),this._eye.applyQuaternion(to),this.object.up.applyQuaternion(to)),this._movePrev.copy(this._moveCurr)}_zoomCamera(){let t;this.state===le.TOUCH_ZOOM_PAN?(t=this._touchZoomDistanceStart/this._touchZoomDistanceEnd,this._touchZoomDistanceStart=this._touchZoomDistanceEnd,this.object.isPerspectiveCamera?this._eye.multiplyScalar(t):this.object.isOrthographicCamera?(this.object.zoom=pe.clamp(this.object.zoom/t,this.minZoom,this.maxZoom),this._lastZoom!==this.object.zoom&&this.object.updateProjectionMatrix()):console.warn("THREE.TrackballControls: Unsupported camera type")):(t=1+(this._zoomEnd.y-this._zoomStart.y)*this.zoomSpeed,t!==1&&t>0&&(this.object.isPerspectiveCamera?this._eye.multiplyScalar(t):this.object.isOrthographicCamera?(this.object.zoom=pe.clamp(this.object.zoom/t,this.minZoom,this.maxZoom),this._lastZoom!==this.object.zoom&&this.object.updateProjectionMatrix()):console.warn("THREE.TrackballControls: Unsupported camera type")),this.staticMoving?this._zoomStart.copy(this._zoomEnd):this._zoomStart.y+=(this._zoomEnd.y-this._zoomStart.y)*this.dynamicDampingFactor)}_getMouseOnScreen(t,n){return Fh.set((t-this.screen.left)/this.screen.width,(n-this.screen.top)/this.screen.height),Fh}_getMouseOnCircle(t,n){return Fh.set((t-this.screen.width*.5-this.screen.left)/(this.screen.width*.5),(this.screen.height+2*(this.screen.top-n))/this.screen.width),Fh}_addPointer(t){this._pointers.push(t)}_removePointer(t){delete this._pointerPositions[t.pointerId];for(let n=0;n<this._pointers.length;n++)if(this._pointers[n].pointerId==t.pointerId){this._pointers.splice(n,1);return}}_trackPointer(t){let n=this._pointerPositions[t.pointerId];n===void 0&&(n=new it,this._pointerPositions[t.pointerId]=n),n.set(t.pageX,t.pageY)}_getSecondPointerPosition(t){let n=t.pointerId===this._pointers[0].pointerId?this._pointers[1]:this._pointers[0];return this._pointerPositions[n.pointerId]}_checkDistances(){(!this.noZoom||!this.noPan)&&(this._eye.lengthSq()>this.maxDistance*this.maxDistance&&(this.object.position.addVectors(this.target,this._eye.setLength(this.maxDistance)),this._zoomStart.copy(this._zoomEnd)),this._eye.lengthSq()<this.minDistance*this.minDistance&&(this.object.position.addVectors(this.target,this._eye.setLength(this.minDistance)),this._zoomStart.copy(this._zoomEnd)))}};function DC(e){this.enabled!==!1&&(this._pointers.length===0&&(this.domElement.setPointerCapture(e.pointerId),this.domElement.addEventListener("pointermove",this._onPointerMove),this.domElement.addEventListener("pointerup",this._onPointerUp)),this._addPointer(e),e.pointerType==="touch"?this._onTouchStart(e):this._onMouseDown(e))}function LC(e){this.enabled!==!1&&(e.pointerType==="touch"?this._onTouchMove(e):this._onMouseMove(e))}function OC(e){this.enabled!==!1&&(e.pointerType==="touch"?this._onTouchEnd(e):this._onMouseUp(),this._removePointer(e),this._pointers.length===0&&(this.domElement.releasePointerCapture(e.pointerId),this.domElement.removeEventListener("pointermove",this._onPointerMove),this.domElement.removeEventListener("pointerup",this._onPointerUp)))}function NC(e){this._removePointer(e)}function FC(){this.enabled!==!1&&(this.keyState=le.NONE,window.addEventListener("keydown",this._onKeyDown))}function UC(e){this.enabled!==!1&&(window.removeEventListener("keydown",this._onKeyDown),this.keyState===le.NONE&&(e.code===this.keys[le.ROTATE]&&!this.noRotate?this.keyState=le.ROTATE:e.code===this.keys[le.ZOOM]&&!this.noZoom?this.keyState=le.ZOOM:e.code===this.keys[le.PAN]&&!this.noPan&&(this.keyState=le.PAN)))}function zC(e){let t;switch(e.button){case 0:t=this.mouseButtons.LEFT;break;case 1:t=this.mouseButtons.MIDDLE;break;case 2:t=this.mouseButtons.RIGHT;break;default:t=-1}switch(t){case Pe.DOLLY:this.state=le.ZOOM;break;case Pe.ROTATE:this.state=le.ROTATE;break;case Pe.PAN:this.state=le.PAN;break;default:this.state=le.NONE}let n=this.keyState!==le.NONE?this.keyState:this.state;n===le.ROTATE&&!this.noRotate?(this._moveCurr.copy(this._getMouseOnCircle(e.pageX,e.pageY)),this._movePrev.copy(this._moveCurr)):n===le.ZOOM&&!this.noZoom?(this._zoomStart.copy(this._getMouseOnScreen(e.pageX,e.pageY)),this._zoomEnd.copy(this._zoomStart)):n===le.PAN&&!this.noPan&&(this._panStart.copy(this._getMouseOnScreen(e.pageX,e.pageY)),this._panEnd.copy(this._panStart)),this.dispatchEvent(Jd)}function kC(e){let t=this.keyState!==le.NONE?this.keyState:this.state;t===le.ROTATE&&!this.noRotate?(this._movePrev.copy(this._moveCurr),this._moveCurr.copy(this._getMouseOnCircle(e.pageX,e.pageY))):t===le.ZOOM&&!this.noZoom?this._zoomEnd.copy(this._getMouseOnScreen(e.pageX,e.pageY)):t===le.PAN&&!this.noPan&&this._panEnd.copy(this._getMouseOnScreen(e.pageX,e.pageY))}function BC(){this.state=le.NONE,this.dispatchEvent(Qd)}function VC(e){if(this.enabled!==!1&&this.noZoom!==!0){switch(e.preventDefault(),e.deltaMode){case 2:this._zoomStart.y-=e.deltaY*.025;break;case 1:this._zoomStart.y-=e.deltaY*.01;break;default:this._zoomStart.y-=e.deltaY*25e-5;break}this.dispatchEvent(Jd),this.dispatchEvent(Qd)}}function HC(e){this.enabled!==!1&&e.preventDefault()}function GC(e){if(this._trackPointer(e),this._pointers.length===1)this.state=le.TOUCH_ROTATE,this._moveCurr.copy(this._getMouseOnCircle(this._pointers[0].pageX,this._pointers[0].pageY)),this._movePrev.copy(this._moveCurr);else{this.state=le.TOUCH_ZOOM_PAN;let t=this._pointers[0].pageX-this._pointers[1].pageX,n=this._pointers[0].pageY-this._pointers[1].pageY;this._touchZoomDistanceEnd=this._touchZoomDistanceStart=Math.sqrt(t*t+n*n);let i=(this._pointers[0].pageX+this._pointers[1].pageX)/2,r=(this._pointers[0].pageY+this._pointers[1].pageY)/2;this._panStart.copy(this._getMouseOnScreen(i,r)),this._panEnd.copy(this._panStart)}this.dispatchEvent(Jd)}function WC(e){if(this._trackPointer(e),this._pointers.length===1)this._movePrev.copy(this._moveCurr),this._moveCurr.copy(this._getMouseOnCircle(e.pageX,e.pageY));else{let t=this._getSecondPointerPosition(e),n=e.pageX-t.x,i=e.pageY-t.y;this._touchZoomDistanceEnd=Math.sqrt(n*n+i*i);let r=(e.pageX+t.x)/2,s=(e.pageY+t.y)/2;this._panEnd.copy(this._getMouseOnScreen(r,s))}}function jC(e){switch(this._pointers.length){case 0:this.state=le.NONE;break;case 1:this.state=le.TOUCH_ROTATE,this._moveCurr.copy(this._getMouseOnCircle(e.pageX,e.pageY)),this._movePrev.copy(this._moveCurr);break;case 2:this.state=le.TOUCH_ZOOM_PAN;for(let t=0;t<this._pointers.length;t++)if(this._pointers[t].pointerId!==e.pointerId){let n=this._pointerPositions[this._pointers[t].pointerId];this._moveCurr.copy(this._getMouseOnCircle(n.x,n.y)),this._movePrev.copy(this._moveCurr);break}break}this.dispatchEvent(Qd)}var Nt={IDLE:Symbol(),ROTATE:Symbol(),PAN:Symbol(),SCALE:Symbol(),FOV:Symbol(),FOCUS:Symbol(),ZROTATE:Symbol(),TOUCH_MULTI:Symbol(),ANIMATION_FOCUS:Symbol(),ANIMATION_ROTATE:Symbol()},me={NONE:Symbol(),ONE_FINGER:Symbol(),ONE_FINGER_SWITCHED:Symbol(),TWO_FINGER:Symbol(),MULT_FINGER:Symbol(),CURSOR:Symbol()},Yt={x:0,y:0},Tn={camera:new Vt,gizmos:new Vt},Me={type:"change"},oi={type:"start"},Gn={type:"end"},qC=new Li,Oe=new I,Wv=new Vt,jv=new Vt,si=new I,Vh=1e-6,Hh=class extends wn{constructor(t,n=null,i=null){super(t,n),this.scene=i,this.target=new I,this._currentTarget=new I,this.radiusFactor=.67,this.mouseActions=[],this._mouseOp=null,this._v2_1=new it,this._v3_1=new I,this._v3_2=new I,this._m4_1=new Vt,this._m4_2=new Vt,this._quat=new Ne,this._translationMatrix=new Vt,this._rotationMatrix=new Vt,this._scaleMatrix=new Vt,this._rotationAxis=new I,this._cameraMatrixState=new Vt,this._cameraProjectionState=new Vt,this._fovState=1,this._upState=new I,this._zoomState=1,this._nearPos=0,this._farPos=0,this._gizmoMatrixState=new Vt,this._up0=new I,this._zoom0=1,this._fov0=0,this._initialNear=0,this._nearPos0=0,this._initialFar=0,this._farPos0=0,this._cameraMatrixState0=new Vt,this._gizmoMatrixState0=new Vt,this._target0=new I,this._button=-1,this._touchStart=[],this._touchCurrent=[],this._input=me.NONE,this._switchSensibility=32,this._startFingerDistance=0,this._currentFingerDistance=0,this._startFingerRotation=0,this._currentFingerRotation=0,this._devPxRatio=0,this._downValid=!0,this._nclicks=0,this._downEvents=[],this._downStart=0,this._clickStart=0,this._maxDownTime=250,this._maxInterval=300,this._posThreshold=24,this._movementThreshold=24,this._currentCursorPosition=new I,this._startCursorPosition=new I,this._grid=null,this._gridPosition=new I,this._gizmos=new Ye,this._curvePts=128,this._timeStart=-1,this._animationId=-1,this.focusAnimationTime=500,this._timePrev=0,this._timeCurrent=0,this._anglePrev=0,this._angleCurrent=0,this._cursorPosPrev=new I,this._cursorPosCurr=new I,this._wPrev=0,this._wCurr=0,this.adjustNearFar=!1,this.scaleFactor=1.1,this.dampingFactor=25,this.wMax=20,this.enableAnimations=!0,this.enableGrid=!1,this.cursorZoom=!1,this.minFov=5,this.maxFov=90,this.rotateSpeed=1,this.enablePan=!0,this.enableRotate=!0,this.enableZoom=!0,this.enableGizmos=!0,this.enableFocus=!0,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this._tbRadius=1,this._state=Nt.IDLE,this.setCamera(t),this.scene!=null&&this.scene.add(this._gizmos),this.initializeMouseActions(),this._onContextMenu=$C.bind(this),this._onWheel=QC.bind(this),this._onPointerUp=JC.bind(this),this._onPointerMove=KC.bind(this),this._onPointerDown=ZC.bind(this),this._onPointerCancel=YC.bind(this),this._onWindowResize=XC.bind(this),n!==null&&this.connect(n)}connect(t){super.connect(t),this.domElement.style.touchAction="none",this._devPxRatio=window.devicePixelRatio,this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.addEventListener("wheel",this._onWheel,{passive:!1}),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerCancel),window.addEventListener("resize",this._onWindowResize)}disconnect(){this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.removeEventListener("pointercancel",this._onPointerCancel),this.domElement.removeEventListener("wheel",this._onWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),window.removeEventListener("pointermove",this._onPointerMove),window.removeEventListener("pointerup",this._onPointerUp),window.removeEventListener("resize",this._onWindowResize)}onSinglePanStart(t,n){if(this.enabled)switch(this.dispatchEvent(oi),this.setCenter(t.clientX,t.clientY),n){case"PAN":if(!this.enablePan)return;this._animationId!=-1&&(cancelAnimationFrame(this._animationId),this._animationId=-1,this._timeStart=-1,this.activateGizmos(!1),this.dispatchEvent(Me)),this.updateTbState(Nt.PAN,!0),this._startCursorPosition.copy(this.unprojectOnTbPlane(this.object,Yt.x,Yt.y,this.domElement)),this.enableGrid&&(this.drawGrid(),this.dispatchEvent(Me));break;case"ROTATE":if(!this.enableRotate)return;this._animationId!=-1&&(cancelAnimationFrame(this._animationId),this._animationId=-1,this._timeStart=-1),this.updateTbState(Nt.ROTATE,!0),this._startCursorPosition.copy(this.unprojectOnTbSurface(this.object,Yt.x,Yt.y,this.domElement,this._tbRadius)),this.activateGizmos(!0),this.enableAnimations&&(this._timePrev=this._timeCurrent=performance.now(),this._angleCurrent=this._anglePrev=0,this._cursorPosPrev.copy(this._startCursorPosition),this._cursorPosCurr.copy(this._cursorPosPrev),this._wCurr=0,this._wPrev=this._wCurr),this.dispatchEvent(Me);break;case"FOV":if(!this.object.isPerspectiveCamera||!this.enableZoom)return;this._animationId!=-1&&(cancelAnimationFrame(this._animationId),this._animationId=-1,this._timeStart=-1,this.activateGizmos(!1),this.dispatchEvent(Me)),this.updateTbState(Nt.FOV,!0),this._startCursorPosition.setY(this.getCursorNDC(Yt.x,Yt.y,this.domElement).y*.5),this._currentCursorPosition.copy(this._startCursorPosition);break;case"ZOOM":if(!this.enableZoom)return;this._animationId!=-1&&(cancelAnimationFrame(this._animationId),this._animationId=-1,this._timeStart=-1,this.activateGizmos(!1),this.dispatchEvent(Me)),this.updateTbState(Nt.SCALE,!0),this._startCursorPosition.setY(this.getCursorNDC(Yt.x,Yt.y,this.domElement).y*.5),this._currentCursorPosition.copy(this._startCursorPosition);break}}onSinglePanMove(t,n){if(this.enabled){let i=n!=this._state;switch(this.setCenter(t.clientX,t.clientY),n){case Nt.PAN:this.enablePan&&(i?(this.dispatchEvent(Gn),this.dispatchEvent(oi),this.updateTbState(n,!0),this._startCursorPosition.copy(this.unprojectOnTbPlane(this.object,Yt.x,Yt.y,this.domElement)),this.enableGrid&&this.drawGrid(),this.activateGizmos(!1)):(this._currentCursorPosition.copy(this.unprojectOnTbPlane(this.object,Yt.x,Yt.y,this.domElement)),this.applyTransformMatrix(this.pan(this._startCursorPosition,this._currentCursorPosition))));break;case Nt.ROTATE:if(this.enableRotate)if(i)this.dispatchEvent(Gn),this.dispatchEvent(oi),this.updateTbState(n,!0),this._startCursorPosition.copy(this.unprojectOnTbSurface(this.object,Yt.x,Yt.y,this.domElement,this._tbRadius)),this.enableGrid&&this.disposeGrid(),this.activateGizmos(!0);else{this._currentCursorPosition.copy(this.unprojectOnTbSurface(this.object,Yt.x,Yt.y,this.domElement,this._tbRadius));let r=this._startCursorPosition.distanceTo(this._currentCursorPosition),s=this._startCursorPosition.angleTo(this._currentCursorPosition),o=Math.max(r/this._tbRadius,s)*this.rotateSpeed;this.applyTransformMatrix(this.rotate(this.calculateRotationAxis(this._startCursorPosition,this._currentCursorPosition),o)),this.enableAnimations&&(this._timePrev=this._timeCurrent,this._timeCurrent=performance.now(),this._anglePrev=this._angleCurrent,this._angleCurrent=o,this._cursorPosPrev.copy(this._cursorPosCurr),this._cursorPosCurr.copy(this._currentCursorPosition),this._wPrev=this._wCurr,this._wCurr=this.calculateAngularSpeed(this._anglePrev,this._angleCurrent,this._timePrev,this._timeCurrent))}break;case Nt.SCALE:if(this.enableZoom)if(i)this.dispatchEvent(Gn),this.dispatchEvent(oi),this.updateTbState(n,!0),this._startCursorPosition.setY(this.getCursorNDC(Yt.x,Yt.y,this.domElement).y*.5),this._currentCursorPosition.copy(this._startCursorPosition),this.enableGrid&&this.disposeGrid(),this.activateGizmos(!1);else{this._currentCursorPosition.setY(this.getCursorNDC(Yt.x,Yt.y,this.domElement).y*.5);let s=this._currentCursorPosition.y-this._startCursorPosition.y,o=1;s<0?o=1/Math.pow(this.scaleFactor,-s*8):s>0&&(o=Math.pow(this.scaleFactor,s*8)),this._v3_1.setFromMatrixPosition(this._gizmoMatrixState),this.applyTransformMatrix(this.scale(o,this._v3_1))}break;case Nt.FOV:if(this.enableZoom&&this.object.isPerspectiveCamera)if(i)this.dispatchEvent(Gn),this.dispatchEvent(oi),this.updateTbState(n,!0),this._startCursorPosition.setY(this.getCursorNDC(Yt.x,Yt.y,this.domElement).y*.5),this._currentCursorPosition.copy(this._startCursorPosition),this.enableGrid&&this.disposeGrid(),this.activateGizmos(!1);else{this._currentCursorPosition.setY(this.getCursorNDC(Yt.x,Yt.y,this.domElement).y*.5);let s=this._currentCursorPosition.y-this._startCursorPosition.y,o=1;s<0?o=1/Math.pow(this.scaleFactor,-s*8):s>0&&(o=Math.pow(this.scaleFactor,s*8)),this._v3_1.setFromMatrixPosition(this._cameraMatrixState);let a=this._v3_1.distanceTo(this._gizmos.position),c=a/o;c=pe.clamp(c,this.minDistance,this.maxDistance);let l=a*Math.tan(pe.DEG2RAD*this._fovState*.5),u=pe.RAD2DEG*(Math.atan(l/c)*2);u=pe.clamp(u,this.minFov,this.maxFov);let h=l/Math.tan(pe.DEG2RAD*(u/2));o=a/h,this._v3_2.setFromMatrixPosition(this._gizmoMatrixState),this.setFov(u),this.applyTransformMatrix(this.scale(o,this._v3_2,!1)),Oe.copy(this._gizmos.position).sub(this.object.position).normalize().multiplyScalar(h/a),this._m4_1.makeTranslation(Oe.x,Oe.y,Oe.z)}break}this.dispatchEvent(Me)}}onSinglePanEnd(){if(this._state==Nt.ROTATE){if(!this.enableRotate)return;if(this.enableAnimations)if(performance.now()-this._timeCurrent<120){let n=Math.abs((this._wPrev+this._wCurr)/2),i=this;this._animationId=window.requestAnimationFrame(function(r){i.updateTbState(Nt.ANIMATION_ROTATE,!0);let s=i.calculateRotationAxis(i._cursorPosPrev,i._cursorPosCurr);i.onRotationAnim(r,s,Math.min(n,i.wMax))})}else this.updateTbState(Nt.IDLE,!1),this.activateGizmos(!1),this.dispatchEvent(Me);else this.updateTbState(Nt.IDLE,!1),this.activateGizmos(!1),this.dispatchEvent(Me)}else(this._state==Nt.PAN||this._state==Nt.IDLE)&&(this.updateTbState(Nt.IDLE,!1),this.enableGrid&&this.disposeGrid(),this.activateGizmos(!1),this.dispatchEvent(Me));this.dispatchEvent(Gn)}onDoubleTap(t){if(this.enabled&&this.enablePan&&this.enableFocus&&this.scene!=null){this.dispatchEvent(oi),this.setCenter(t.clientX,t.clientY);let n=this.unprojectOnObj(this.getCursorNDC(Yt.x,Yt.y,this.domElement),this.object);if(n!=null&&this.enableAnimations){let i=this;this._animationId!=-1&&window.cancelAnimationFrame(this._animationId),this._timeStart=-1,this._animationId=window.requestAnimationFrame(function(r){i.updateTbState(Nt.ANIMATION_FOCUS,!0),i.onFocusAnim(r,n,i._cameraMatrixState,i._gizmoMatrixState)})}else n!=null&&!this.enableAnimations&&(this.updateTbState(Nt.FOCUS,!0),this.focus(n,this.scaleFactor),this.updateTbState(Nt.IDLE,!1),this.dispatchEvent(Me))}this.dispatchEvent(Gn)}onDoublePanStart(){this.enabled&&this.enablePan&&(this.dispatchEvent(oi),this.updateTbState(Nt.PAN,!0),this.setCenter((this._touchCurrent[0].clientX+this._touchCurrent[1].clientX)/2,(this._touchCurrent[0].clientY+this._touchCurrent[1].clientY)/2),this._startCursorPosition.copy(this.unprojectOnTbPlane(this.object,Yt.x,Yt.y,this.domElement,!0)),this._currentCursorPosition.copy(this._startCursorPosition),this.activateGizmos(!1))}onDoublePanMove(){this.enabled&&this.enablePan&&(this.setCenter((this._touchCurrent[0].clientX+this._touchCurrent[1].clientX)/2,(this._touchCurrent[0].clientY+this._touchCurrent[1].clientY)/2),this._state!=Nt.PAN&&(this.updateTbState(Nt.PAN,!0),this._startCursorPosition.copy(this._currentCursorPosition)),this._currentCursorPosition.copy(this.unprojectOnTbPlane(this.object,Yt.x,Yt.y,this.domElement,!0)),this.applyTransformMatrix(this.pan(this._startCursorPosition,this._currentCursorPosition,!0)),this.dispatchEvent(Me))}onDoublePanEnd(){this.updateTbState(Nt.IDLE,!1),this.dispatchEvent(Gn)}onRotateStart(){this.enabled&&this.enableRotate&&(this.dispatchEvent(oi),this.updateTbState(Nt.ZROTATE,!0),this._startFingerRotation=this.getAngle(this._touchCurrent[1],this._touchCurrent[0])+this.getAngle(this._touchStart[1],this._touchStart[0]),this._currentFingerRotation=this._startFingerRotation,this.object.getWorldDirection(this._rotationAxis),!this.enablePan&&!this.enableZoom&&this.activateGizmos(!0))}onRotateMove(){if(this.enabled&&this.enableRotate){this.setCenter((this._touchCurrent[0].clientX+this._touchCurrent[1].clientX)/2,(this._touchCurrent[0].clientY+this._touchCurrent[1].clientY)/2);let t;this._state!=Nt.ZROTATE&&(this.updateTbState(Nt.ZROTATE,!0),this._startFingerRotation=this._currentFingerRotation),this._currentFingerRotation=this.getAngle(this._touchCurrent[1],this._touchCurrent[0])+this.getAngle(this._touchStart[1],this._touchStart[0]),this.enablePan?(this._v3_2.setFromMatrixPosition(this._gizmoMatrixState),t=this.unprojectOnTbPlane(this.object,Yt.x,Yt.y,this.domElement).applyQuaternion(this.object.quaternion).multiplyScalar(1/this.object.zoom).add(this._v3_2)):t=new I().setFromMatrixPosition(this._gizmoMatrixState);let n=pe.DEG2RAD*(this._startFingerRotation-this._currentFingerRotation);this.applyTransformMatrix(this.zRotate(t,n)),this.dispatchEvent(Me)}}onRotateEnd(){this.updateTbState(Nt.IDLE,!1),this.activateGizmos(!1),this.dispatchEvent(Gn)}onPinchStart(){this.enabled&&this.enableZoom&&(this.dispatchEvent(oi),this.updateTbState(Nt.SCALE,!0),this._startFingerDistance=this.calculatePointersDistance(this._touchCurrent[0],this._touchCurrent[1]),this._currentFingerDistance=this._startFingerDistance,this.activateGizmos(!1))}onPinchMove(){if(this.enabled&&this.enableZoom){this.setCenter((this._touchCurrent[0].clientX+this._touchCurrent[1].clientX)/2,(this._touchCurrent[0].clientY+this._touchCurrent[1].clientY)/2);let t=12;this._state!=Nt.SCALE&&(this._startFingerDistance=this._currentFingerDistance,this.updateTbState(Nt.SCALE,!0)),this._currentFingerDistance=Math.max(this.calculatePointersDistance(this._touchCurrent[0],this._touchCurrent[1]),t*this._devPxRatio);let n=this._currentFingerDistance/this._startFingerDistance,i;this.enablePan?this.object.isOrthographicCamera?i=this.unprojectOnTbPlane(this.object,Yt.x,Yt.y,this.domElement).applyQuaternion(this.object.quaternion).multiplyScalar(1/this.object.zoom).add(this._gizmos.position):this.object.isPerspectiveCamera&&(i=this.unprojectOnTbPlane(this.object,Yt.x,Yt.y,this.domElement).applyQuaternion(this.object.quaternion).add(this._gizmos.position)):i=this._gizmos.position,this.applyTransformMatrix(this.scale(n,i)),this.dispatchEvent(Me)}}onPinchEnd(){this.updateTbState(Nt.IDLE,!1),this.dispatchEvent(Gn)}onTriplePanStart(){if(this.enabled&&this.enableZoom){this.dispatchEvent(oi),this.updateTbState(Nt.SCALE,!0);let t=0,n=0,i=this._touchCurrent.length;for(let r=0;r<i;r++)t+=this._touchCurrent[r].clientX,n+=this._touchCurrent[r].clientY;this.setCenter(t/i,n/i),this._startCursorPosition.setY(this.getCursorNDC(Yt.x,Yt.y,this.domElement).y*.5),this._currentCursorPosition.copy(this._startCursorPosition)}}onTriplePanMove(){if(this.enabled&&this.enableZoom){let t=0,n=0,i=this._touchCurrent.length;for(let d=0;d<i;d++)t+=this._touchCurrent[d].clientX,n+=this._touchCurrent[d].clientY;this.setCenter(t/i,n/i);let r=8;this._currentCursorPosition.setY(this.getCursorNDC(Yt.x,Yt.y,this.domElement).y*.5);let s=this._currentCursorPosition.y-this._startCursorPosition.y,o=1;s<0?o=1/Math.pow(this.scaleFactor,-s*r):s>0&&(o=Math.pow(this.scaleFactor,s*r)),this._v3_1.setFromMatrixPosition(this._cameraMatrixState);let a=this._v3_1.distanceTo(this._gizmos.position),c=a/o;c=pe.clamp(c,this.minDistance,this.maxDistance);let l=a*Math.tan(pe.DEG2RAD*this._fovState*.5),u=pe.RAD2DEG*(Math.atan(l/c)*2);u=pe.clamp(u,this.minFov,this.maxFov);let h=l/Math.tan(pe.DEG2RAD*(u/2));o=a/h,this._v3_2.setFromMatrixPosition(this._gizmoMatrixState),this.setFov(u),this.applyTransformMatrix(this.scale(o,this._v3_2,!1)),Oe.copy(this._gizmos.position).sub(this.object.position).normalize().multiplyScalar(h/a),this._m4_1.makeTranslation(Oe.x,Oe.y,Oe.z),this.dispatchEvent(Me)}}onTriplePanEnd(){this.updateTbState(Nt.IDLE,!1),this.dispatchEvent(Gn)}setCenter(t,n){Yt.x=t,Yt.y=n}initializeMouseActions(){this.setMouseAction("PAN",0,"CTRL"),this.setMouseAction("PAN",2),this.setMouseAction("ROTATE",0),this.setMouseAction("ZOOM","WHEEL"),this.setMouseAction("ZOOM",1),this.setMouseAction("FOV","WHEEL","SHIFT"),this.setMouseAction("FOV",1,"SHIFT")}compareMouseAction(t,n){return t.operation==n.operation?t.mouse==n.mouse&&t.key==n.key:!1}setMouseAction(t,n,i=null){let r=["PAN","ROTATE","ZOOM","FOV"],s=[0,1,2,"WHEEL"],o=["CTRL","SHIFT",null],a;if(!r.includes(t)||!s.includes(n)||!o.includes(i)||n=="WHEEL"&&t!="ZOOM"&&t!="FOV")return!1;switch(t){case"PAN":a=Nt.PAN;break;case"ROTATE":a=Nt.ROTATE;break;case"ZOOM":a=Nt.SCALE;break;case"FOV":a=Nt.FOV;break}let c={operation:t,mouse:n,key:i,state:a};for(let l=0;l<this.mouseActions.length;l++)if(this.mouseActions[l].mouse==c.mouse&&this.mouseActions[l].key==c.key)return this.mouseActions.splice(l,1,c),!0;return this.mouseActions.push(c),!0}unsetMouseAction(t,n=null){for(let i=0;i<this.mouseActions.length;i++)if(this.mouseActions[i].mouse==t&&this.mouseActions[i].key==n)return this.mouseActions.splice(i,1),!0;return!1}getOpFromAction(t,n){let i;for(let r=0;r<this.mouseActions.length;r++)if(i=this.mouseActions[r],i.mouse==t&&i.key==n)return i.operation;if(n!=null){for(let r=0;r<this.mouseActions.length;r++)if(i=this.mouseActions[r],i.mouse==t&&i.key==null)return i.operation}return null}getOpStateFromAction(t,n){let i;for(let r=0;r<this.mouseActions.length;r++)if(i=this.mouseActions[r],i.mouse==t&&i.key==n)return i.state;if(n!=null){for(let r=0;r<this.mouseActions.length;r++)if(i=this.mouseActions[r],i.mouse==t&&i.key==null)return i.state}return null}getAngle(t,n){return Math.atan2(n.clientY-t.clientY,n.clientX-t.clientX)*180/Math.PI}updateTouchEvent(t){for(let n=0;n<this._touchCurrent.length;n++)if(this._touchCurrent[n].pointerId==t.pointerId){this._touchCurrent.splice(n,1,t);break}}applyTransformMatrix(t){if(t.camera!=null&&(this._m4_1.copy(this._cameraMatrixState).premultiply(t.camera),this._m4_1.decompose(this.object.position,this.object.quaternion,this.object.scale),this.object.updateMatrix(),(this._state==Nt.ROTATE||this._state==Nt.ZROTATE||this._state==Nt.ANIMATION_ROTATE)&&this.object.up.copy(this._upState).applyQuaternion(this.object.quaternion)),t.gizmos!=null&&(this._m4_1.copy(this._gizmoMatrixState).premultiply(t.gizmos),this._m4_1.decompose(this._gizmos.position,this._gizmos.quaternion,this._gizmos.scale),this._gizmos.updateMatrix()),this._state==Nt.SCALE||this._state==Nt.FOCUS||this._state==Nt.ANIMATION_FOCUS)if(this._tbRadius=this.calculateTbRadius(this.object),this.adjustNearFar){let n=this.object.position.distanceTo(this._gizmos.position),i=new pn;i.setFromObject(this._gizmos);let r=new ci;i.getBoundingSphere(r);let s=Math.max(this._nearPos0,r.radius+r.center.length()),o=n-this._initialNear,a=Math.min(s,o);this.object.near=n-a;let c=Math.min(this._farPos0,-r.radius+r.center.length()),l=n-this._initialFar,u=Math.min(c,l);this.object.far=n-u,this.object.updateProjectionMatrix()}else{let n=!1;this.object.near!=this._initialNear&&(this.object.near=this._initialNear,n=!0),this.object.far!=this._initialFar&&(this.object.far=this._initialFar,n=!0),n&&this.object.updateProjectionMatrix()}}calculateAngularSpeed(t,n,i,r){let s=n-t,o=(r-i)/1e3;return o==0?0:s/o}calculatePointersDistance(t,n){return Math.sqrt(Math.pow(n.clientX-t.clientX,2)+Math.pow(n.clientY-t.clientY,2))}calculateRotationAxis(t,n){return this._rotationMatrix.extractRotation(this._cameraMatrixState),this._quat.setFromRotationMatrix(this._rotationMatrix),this._rotationAxis.crossVectors(t,n).applyQuaternion(this._quat),this._rotationAxis.normalize().clone()}calculateTbRadius(t){let n=t.position.distanceTo(this._gizmos.position);if(t.type=="PerspectiveCamera"){let i=pe.DEG2RAD*t.fov*.5,r=Math.atan(t.aspect*Math.tan(i));return Math.tan(Math.min(i,r))*n*this.radiusFactor}else if(t.type=="OrthographicCamera")return Math.min(t.top,t.right)*this.radiusFactor}focus(t,n,i=1){Oe.copy(t).sub(this._gizmos.position).multiplyScalar(i),this._translationMatrix.makeTranslation(Oe.x,Oe.y,Oe.z),Wv.copy(this._gizmoMatrixState),this._gizmoMatrixState.premultiply(this._translationMatrix),this._gizmoMatrixState.decompose(this._gizmos.position,this._gizmos.quaternion,this._gizmos.scale),jv.copy(this._cameraMatrixState),this._cameraMatrixState.premultiply(this._translationMatrix),this._cameraMatrixState.decompose(this.object.position,this.object.quaternion,this.object.scale),this.enableZoom&&this.applyTransformMatrix(this.scale(n,this._gizmos.position)),this._gizmoMatrixState.copy(Wv),this._cameraMatrixState.copy(jv)}drawGrid(){if(this.scene!=null){let i,r,s,o;if(this.object.isOrthographicCamera){let a=this.object.right-this.object.left,c=this.object.bottom-this.object.top;s=Math.max(a,c),o=s/20,i=s/this.object.zoom*3,r=i/o*this.object.zoom}else if(this.object.isPerspectiveCamera){let a=this.object.position.distanceTo(this._gizmos.position),c=pe.DEG2RAD*this.object.fov*.5,l=Math.atan(this.object.aspect*Math.tan(c));s=Math.tan(Math.max(c,l))*a*2,o=s/20,i=s*3,r=i/o}this._grid==null&&(this._grid=new ta(i,r,8947848,8947848),this._grid.position.copy(this._gizmos.position),this._gridPosition.copy(this._grid.position),this._grid.quaternion.copy(this.object.quaternion),this._grid.rotateX(Math.PI*.5),this.scene.add(this._grid))}}dispose(){this._animationId!=-1&&window.cancelAnimationFrame(this._animationId),this.disconnect(),this.scene!==null&&this.scene.remove(this._gizmos),this.disposeGrid()}disposeGrid(){this._grid!=null&&this.scene!=null&&(this.scene.remove(this._grid),this._grid=null)}easeOutCubic(t){return 1-Math.pow(1-t,3)}activateGizmos(t){let n=this._gizmos.children[0],i=this._gizmos.children[1],r=this._gizmos.children[2];t?(n.material.setValues({opacity:1}),i.material.setValues({opacity:1}),r.material.setValues({opacity:1})):(n.material.setValues({opacity:.6}),i.material.setValues({opacity:.6}),r.material.setValues({opacity:.6}))}getCursorNDC(t,n,i){let r=i.getBoundingClientRect();return this._v2_1.setX((t-r.left)/r.width*2-1),this._v2_1.setY((r.bottom-n)/r.height*2-1),this._v2_1.clone()}getCursorPosition(t,n,i){return this._v2_1.copy(this.getCursorNDC(t,n,i)),this._v2_1.x*=(this.object.right-this.object.left)*.5,this._v2_1.y*=(this.object.top-this.object.bottom)*.5,this._v2_1.clone()}setCamera(t){t.lookAt(this.target),t.updateMatrix(),t.type=="PerspectiveCamera"&&(this._fov0=t.fov,this._fovState=t.fov),this._cameraMatrixState0.copy(t.matrix),this._cameraMatrixState.copy(this._cameraMatrixState0),this._cameraProjectionState.copy(t.projectionMatrix),this._zoom0=t.zoom,this._zoomState=this._zoom0,this._initialNear=t.near,this._nearPos0=t.position.distanceTo(this.target)-t.near,this._nearPos=this._initialNear,this._initialFar=t.far,this._farPos0=t.position.distanceTo(this.target)-t.far,this._farPos=this._initialFar,this._up0.copy(t.up),this._upState.copy(t.up),this.object=t,this.object.updateProjectionMatrix(),this._tbRadius=this.calculateTbRadius(t),this.makeGizmos(this.target,this._tbRadius)}setGizmosVisible(t){this._gizmos.visible=t,this.dispatchEvent(Me)}setTbRadius(t){this.radiusFactor=t,this._tbRadius=this.calculateTbRadius(this.object);let i=new fi(0,0,this._tbRadius,this._tbRadius).getPoints(this._curvePts),r=new ve().setFromPoints(i);for(let s in this._gizmos.children)this._gizmos.children[s].geometry=r;this.dispatchEvent(Me)}makeGizmos(t,n){let r=new fi(0,0,n,n).getPoints(this._curvePts),s=new ve().setFromPoints(r),o=new Jn({color:16744576,fog:!1,transparent:!0,opacity:.6}),a=new Jn({color:8454016,fog:!1,transparent:!0,opacity:.6}),c=new Jn({color:8421631,fog:!1,transparent:!0,opacity:.6}),l=new ui(s,o),u=new ui(s,a),h=new ui(s,c),d=Math.PI*.5;if(l.rotation.x=d,u.rotation.y=d,this._gizmoMatrixState0.identity().setPosition(t),this._gizmoMatrixState.copy(this._gizmoMatrixState0),this.object.zoom!==1){let f=1/this.object.zoom;this._scaleMatrix.makeScale(f,f,f),this._translationMatrix.makeTranslation(-t.x,-t.y,-t.z),this._gizmoMatrixState.premultiply(this._translationMatrix).premultiply(this._scaleMatrix),this._translationMatrix.makeTranslation(t.x,t.y,t.z),this._gizmoMatrixState.premultiply(this._translationMatrix)}this._gizmoMatrixState.decompose(this._gizmos.position,this._gizmos.quaternion,this._gizmos.scale),this._gizmos.traverse(function(f){f.isLine&&(f.geometry.dispose(),f.material.dispose())}),this._gizmos.clear(),this._gizmos.add(l),this._gizmos.add(u),this._gizmos.add(h)}onFocusAnim(t,n,i,r){if(this._timeStart==-1&&(this._timeStart=t),this._state==Nt.ANIMATION_FOCUS){let o=(t-this._timeStart)/this.focusAnimationTime;if(this._gizmoMatrixState.copy(r),o>=1)this._gizmoMatrixState.decompose(this._gizmos.position,this._gizmos.quaternion,this._gizmos.scale),this.focus(n,this.scaleFactor),this._timeStart=-1,this.updateTbState(Nt.IDLE,!1),this.activateGizmos(!1),this.dispatchEvent(Me);else{let a=this.easeOutCubic(o),c=1-a+this.scaleFactor*a;this._gizmoMatrixState.decompose(this._gizmos.position,this._gizmos.quaternion,this._gizmos.scale),this.focus(n,c,a),this.dispatchEvent(Me);let l=this;this._animationId=window.requestAnimationFrame(function(u){l.onFocusAnim(u,n,i,r.clone())})}}else this._animationId=-1,this._timeStart=-1}onRotationAnim(t,n,i){if(this._timeStart==-1&&(this._anglePrev=0,this._angleCurrent=0,this._timeStart=t),this._state==Nt.ANIMATION_ROTATE){let r=(t-this._timeStart)/1e3;if(i+-this.dampingFactor*r>0){this._angleCurrent=.5*-this.dampingFactor*Math.pow(r,2)+i*r+0,this.applyTransformMatrix(this.rotate(n,this._angleCurrent)),this.dispatchEvent(Me);let o=this;this._animationId=window.requestAnimationFrame(function(a){o.onRotationAnim(a,n,i)})}else this._animationId=-1,this._timeStart=-1,this.updateTbState(Nt.IDLE,!1),this.activateGizmos(!1),this.dispatchEvent(Me)}else this._animationId=-1,this._timeStart=-1,this._state!=Nt.ROTATE&&(this.activateGizmos(!1),this.dispatchEvent(Me))}pan(t,n,i=!1){let r=t.clone().sub(n);if(this.object.isOrthographicCamera)r.multiplyScalar(1/this.object.zoom);else if(this.object.isPerspectiveCamera&&i){this._v3_1.setFromMatrixPosition(this._cameraMatrixState0),this._v3_2.setFromMatrixPosition(this._gizmoMatrixState0);let s=this._v3_1.distanceTo(this._v3_2)/this.object.position.distanceTo(this._gizmos.position);r.multiplyScalar(1/s)}return this._v3_1.set(r.x,r.y,0).applyQuaternion(this.object.quaternion),this._m4_1.makeTranslation(this._v3_1.x,this._v3_1.y,this._v3_1.z),this.setTransformationMatrices(this._m4_1,this._m4_1),Tn}reset(){this.target.copy(this._target0),this.object.zoom=this._zoom0,this.object.isPerspectiveCamera&&(this.object.fov=this._fov0),this.object.near=this._nearPos,this.object.far=this._farPos,this._cameraMatrixState.copy(this._cameraMatrixState0),this._cameraMatrixState.decompose(this.object.position,this.object.quaternion,this.object.scale),this.object.up.copy(this._up0),this.object.updateMatrix(),this.object.updateProjectionMatrix(),this._gizmoMatrixState.copy(this._gizmoMatrixState0),this._gizmoMatrixState0.decompose(this._gizmos.position,this._gizmos.quaternion,this._gizmos.scale),this._gizmos.updateMatrix(),this._tbRadius=this.calculateTbRadius(this.object),this.makeGizmos(this._gizmos.position,this._tbRadius),this.object.lookAt(this._gizmos.position),this.updateTbState(Nt.IDLE,!1),this.dispatchEvent(Me)}rotate(t,n){let i=this._gizmos.position;return this._translationMatrix.makeTranslation(-i.x,-i.y,-i.z),this._rotationMatrix.makeRotationAxis(t,-n),this._m4_1.makeTranslation(i.x,i.y,i.z),this._m4_1.multiply(this._rotationMatrix),this._m4_1.multiply(this._translationMatrix),this.setTransformationMatrices(this._m4_1),Tn}copyState(){let t;this.object.isOrthographicCamera?t=JSON.stringify({arcballState:{cameraFar:this.object.far,cameraMatrix:this.object.matrix,cameraNear:this.object.near,cameraUp:this.object.up,cameraZoom:this.object.zoom,gizmoMatrix:this._gizmos.matrix,target:this.target}}):this.object.isPerspectiveCamera&&(t=JSON.stringify({arcballState:{cameraFar:this.object.far,cameraFov:this.object.fov,cameraMatrix:this.object.matrix,cameraNear:this.object.near,cameraUp:this.object.up,cameraZoom:this.object.zoom,gizmoMatrix:this._gizmos.matrix,target:this.target}})),navigator.clipboard.writeText(t)}pasteState(){let t=this;navigator.clipboard.readText().then(function(i){t.setStateFromJSON(i)})}saveState(){this.object.updateMatrix(),this._gizmos.updateMatrix(),this._target0.copy(this.target),this._cameraMatrixState0.copy(this.object.matrix),this._gizmoMatrixState0.copy(this._gizmos.matrix),this._nearPos=this.object.near,this._farPos=this.object.far,this._zoom0=this.object.zoom,this._up0.copy(this.object.up),this.object.isPerspectiveCamera&&(this._fov0=this.object.fov)}scale(t,n,i=!0){si.copy(n);let r=1/t;if(this.object.isOrthographicCamera){this.object.zoom=this._zoomState,this.object.zoom*=t,this.object.zoom>this.maxZoom?(this.object.zoom=this.maxZoom,r=this._zoomState/this.maxZoom):this.object.zoom<this.minZoom&&(this.object.zoom=this.minZoom,r=this._zoomState/this.minZoom),this.object.updateProjectionMatrix(),this._v3_1.setFromMatrixPosition(this._gizmoMatrixState),this._scaleMatrix.makeScale(r,r,r),this._translationMatrix.makeTranslation(-this._v3_1.x,-this._v3_1.y,-this._v3_1.z),this._m4_2.makeTranslation(this._v3_1.x,this._v3_1.y,this._v3_1.z).multiply(this._scaleMatrix),this._m4_2.multiply(this._translationMatrix),si.sub(this._v3_1);let s=si.clone().multiplyScalar(r);return si.sub(s),this._m4_1.makeTranslation(si.x,si.y,si.z),this._m4_2.premultiply(this._m4_1),this.setTransformationMatrices(this._m4_1,this._m4_2),Tn}else if(this.object.isPerspectiveCamera){this._v3_1.setFromMatrixPosition(this._cameraMatrixState),this._v3_2.setFromMatrixPosition(this._gizmoMatrixState);let s=this._v3_1.distanceTo(si),o=s-s*r,a=s-o;if(a<this.minDistance?(r=this.minDistance/s,o=s-s*r):a>this.maxDistance&&(r=this.maxDistance/s,o=s-s*r),Oe.copy(si).sub(this._v3_1).normalize().multiplyScalar(o),this._m4_1.makeTranslation(Oe.x,Oe.y,Oe.z),i){let c=this._v3_2;s=c.distanceTo(si),o=s-s*r,Oe.copy(si).sub(this._v3_2).normalize().multiplyScalar(o),this._translationMatrix.makeTranslation(c.x,c.y,c.z),this._scaleMatrix.makeScale(r,r,r),this._m4_2.makeTranslation(Oe.x,Oe.y,Oe.z).multiply(this._translationMatrix),this._m4_2.multiply(this._scaleMatrix),this._translationMatrix.makeTranslation(-c.x,-c.y,-c.z),this._m4_2.multiply(this._translationMatrix),this.setTransformationMatrices(this._m4_1,this._m4_2)}else this.setTransformationMatrices(this._m4_1);return Tn}}setFov(t){this.object.isPerspectiveCamera&&(this.object.fov=pe.clamp(t,this.minFov,this.maxFov),this.object.updateProjectionMatrix())}setTransformationMatrices(t=null,n=null){t!=null?Tn.camera!=null?Tn.camera.copy(t):Tn.camera=t.clone():Tn.camera=null,n!=null?Tn.gizmos!=null?Tn.gizmos.copy(n):Tn.gizmos=n.clone():Tn.gizmos=null}zRotate(t,n){return this._rotationMatrix.makeRotationAxis(this._rotationAxis,n),this._translationMatrix.makeTranslation(-t.x,-t.y,-t.z),this._m4_1.makeTranslation(t.x,t.y,t.z),this._m4_1.multiply(this._rotationMatrix),this._m4_1.multiply(this._translationMatrix),this._v3_1.setFromMatrixPosition(this._gizmoMatrixState).sub(t),this._v3_2.copy(this._v3_1).applyAxisAngle(this._rotationAxis,n),this._v3_2.sub(this._v3_1),this._m4_2.makeTranslation(this._v3_2.x,this._v3_2.y,this._v3_2.z),this.setTransformationMatrices(this._m4_1,this._m4_2),Tn}getRaycaster(){return qC}unprojectOnObj(t,n){let i=this.getRaycaster();i.near=n.near,i.far=n.far,i.setFromCamera(t,n);let r=i.intersectObjects(this.scene.children,!0);for(let s=0;s<r.length;s++)if(r[s].object.uuid!=this._gizmos.uuid&&r[s].face!=null)return r[s].point.clone();return null}unprojectOnTbSurface(t,n,i,r,s){if(t.type=="OrthographicCamera"){this._v2_1.copy(this.getCursorPosition(n,i,r)),this._v3_1.set(this._v2_1.x,this._v2_1.y,0);let o=Math.pow(this._v2_1.x,2),a=Math.pow(this._v2_1.y,2),c=Math.pow(this._tbRadius,2);return o+a<=c*.5?this._v3_1.setZ(Math.sqrt(c-(o+a))):this._v3_1.setZ(c*.5/Math.sqrt(o+a)),this._v3_1}else if(t.type=="PerspectiveCamera"){this._v2_1.copy(this.getCursorNDC(n,i,r)),this._v3_1.set(this._v2_1.x,this._v2_1.y,-1),this._v3_1.applyMatrix4(t.projectionMatrixInverse);let o=this._v3_1.clone().normalize(),a=t.position.distanceTo(this._gizmos.position),c=Math.pow(s,2),l=this._v3_1.z,u=Math.sqrt(Math.pow(this._v3_1.x,2)+Math.pow(this._v3_1.y,2));if(u==0)return o.set(this._v3_1.x,this._v3_1.y,s),o;let h=l/u,d=a,f=Math.pow(h,2)+1,m=2*h*d,_=Math.pow(d,2)-c,g=Math.pow(m,2)-4*f*_;if(g>=0&&(this._v2_1.setX((-m-Math.sqrt(g))/(2*f)),this._v2_1.setY(h*this._v2_1.x+d),pe.RAD2DEG*this._v2_1.angle()>=45)){let x=Math.sqrt(Math.pow(this._v2_1.x,2)+Math.pow(a-this._v2_1.y,2));return o.multiplyScalar(x),o.z+=a,o}f=h,m=d,_=-c*.5,g=Math.pow(m,2)-4*f*_,this._v2_1.setX((-m-Math.sqrt(g))/(2*f)),this._v2_1.setY(h*this._v2_1.x+d);let p=Math.sqrt(Math.pow(this._v2_1.x,2)+Math.pow(a-this._v2_1.y,2));return o.multiplyScalar(p),o.z+=a,o}}unprojectOnTbPlane(t,n,i,r,s=!1){if(t.type=="OrthographicCamera")return this._v2_1.copy(this.getCursorPosition(n,i,r)),this._v3_1.set(this._v2_1.x,this._v2_1.y,0),this._v3_1.clone();if(t.type=="PerspectiveCamera"){this._v2_1.copy(this.getCursorNDC(n,i,r)),this._v3_1.set(this._v2_1.x,this._v2_1.y,-1),this._v3_1.applyMatrix4(t.projectionMatrixInverse);let o=this._v3_1.clone().normalize(),a=this._v3_1.z,c=Math.sqrt(Math.pow(this._v3_1.x,2)+Math.pow(this._v3_1.y,2)),l;if(s?l=this._v3_1.setFromMatrixPosition(this._cameraMatrixState0).distanceTo(this._v3_2.setFromMatrixPosition(this._gizmoMatrixState0)):l=t.position.distanceTo(this._gizmos.position),c==0)return o.set(0,0,0),o;let u=a/c,h=l,d=-h/u,f=Math.sqrt(Math.pow(h,2)+Math.pow(d,2));return o.multiplyScalar(f),o.z=0,o}}updateMatrixState(){this._cameraMatrixState.copy(this.object.matrix),this._gizmoMatrixState.copy(this._gizmos.matrix),this.object.isOrthographicCamera?(this._cameraProjectionState.copy(this.object.projectionMatrix),this.object.updateProjectionMatrix(),this._zoomState=this.object.zoom):this.object.isPerspectiveCamera&&(this._fovState=this.object.fov)}updateTbState(t,n){this._state=t,n&&this.updateMatrixState()}update(){if(this.target.equals(this._currentTarget)===!1&&(this._gizmos.position.copy(this.target),this._tbRadius=this.calculateTbRadius(this.object),this.makeGizmos(this.target,this._tbRadius),this._currentTarget.copy(this.target)),this.object.isOrthographicCamera){if(this.object.zoom>this.maxZoom||this.object.zoom<this.minZoom){let t=pe.clamp(this.object.zoom,this.minZoom,this.maxZoom);this.applyTransformMatrix(this.scale(t/this.object.zoom,this._gizmos.position,!0))}}else if(this.object.isPerspectiveCamera){let t=this.object.position.distanceTo(this._gizmos.position);if(t>this.maxDistance+Vh||t<this.minDistance-Vh){let i=pe.clamp(t,this.minDistance,this.maxDistance);this.applyTransformMatrix(this.scale(i/t,this._gizmos.position)),this.updateMatrixState()}(this.object.fov<this.minFov||this.object.fov>this.maxFov)&&(this.object.fov=pe.clamp(this.object.fov,this.minFov,this.maxFov),this.object.updateProjectionMatrix());let n=this._tbRadius;if(this._tbRadius=this.calculateTbRadius(this.object),n<this._tbRadius-Vh||n>this._tbRadius+Vh){let i=(this._gizmos.scale.x+this._gizmos.scale.y+this._gizmos.scale.z)/3,r=this._tbRadius/i,o=new fi(0,0,r,r).getPoints(this._curvePts),a=new ve().setFromPoints(o);for(let c in this._gizmos.children)this._gizmos.children[c].geometry=a}}this.object.lookAt(this._gizmos.position)}setStateFromJSON(t){let n=JSON.parse(t);if(n.arcballState!=null){this.target.fromArray(n.arcballState.target),this._cameraMatrixState.fromArray(n.arcballState.cameraMatrix.elements),this._cameraMatrixState.decompose(this.object.position,this.object.quaternion,this.object.scale),this.object.up.copy(n.arcballState.cameraUp),this.object.near=n.arcballState.cameraNear,this.object.far=n.arcballState.cameraFar,this.object.zoom=n.arcballState.cameraZoom,this.object.isPerspectiveCamera&&(this.object.fov=n.arcballState.cameraFov),this._gizmoMatrixState.fromArray(n.arcballState.gizmoMatrix.elements),this._gizmoMatrixState.decompose(this._gizmos.position,this._gizmos.quaternion,this._gizmos.scale),this.object.updateMatrix(),this.object.updateProjectionMatrix(),this._gizmos.updateMatrix(),this._tbRadius=this.calculateTbRadius(this.object);let i=new Vt().copy(this._gizmoMatrixState0);this.makeGizmos(this._gizmos.position,this._tbRadius),this._gizmoMatrixState0.copy(i),this.object.lookAt(this._gizmos.position),this.updateTbState(Nt.IDLE,!1),this.dispatchEvent(Me)}}};function XC(){let e=(this._gizmos.scale.x+this._gizmos.scale.y+this._gizmos.scale.z)/3;this._tbRadius=this.calculateTbRadius(this.object);let t=this._tbRadius/e,i=new fi(0,0,t,t).getPoints(this._curvePts),r=new ve().setFromPoints(i);for(let s in this._gizmos.children)this._gizmos.children[s].geometry=r;this.dispatchEvent(Me)}function $C(e){if(this.enabled){for(let t=0;t<this.mouseActions.length;t++)if(this.mouseActions[t].mouse==2){e.preventDefault();break}}}function YC(){this._touchStart.splice(0,this._touchStart.length),this._touchCurrent.splice(0,this._touchCurrent.length),this._input=me.NONE}function ZC(e){if(e.button==0&&e.isPrimary?(this._downValid=!0,this._downEvents.push(e),this._downStart=performance.now()):this._downValid=!1,e.pointerType=="touch"&&this._input!=me.CURSOR)switch(this._touchStart.push(e),this._touchCurrent.push(e),this._input){case me.NONE:this._input=me.ONE_FINGER,this.onSinglePanStart(e,"ROTATE"),window.addEventListener("pointermove",this._onPointerMove),window.addEventListener("pointerup",this._onPointerUp);break;case me.ONE_FINGER:case me.ONE_FINGER_SWITCHED:this._input=me.TWO_FINGER,this.onRotateStart(),this.onPinchStart(),this.onDoublePanStart();break;case me.TWO_FINGER:this._input=me.MULT_FINGER,this.onTriplePanStart(e);break}else if(e.pointerType!="touch"&&this._input==me.NONE){let t=null;e.ctrlKey||e.metaKey?t="CTRL":e.shiftKey&&(t="SHIFT"),this._mouseOp=this.getOpFromAction(e.button,t),this._mouseOp!=null&&(window.addEventListener("pointermove",this._onPointerMove),window.addEventListener("pointerup",this._onPointerUp),this._input=me.CURSOR,this._button=e.button,this.onSinglePanStart(e,this._mouseOp))}}function KC(e){if(e.pointerType=="touch"&&this._input!=me.CURSOR)switch(this._input){case me.ONE_FINGER:this.updateTouchEvent(e),this.onSinglePanMove(e,Nt.ROTATE);break;case me.ONE_FINGER_SWITCHED:if(this.calculatePointersDistance(this._touchCurrent[0],e)*this._devPxRatio>=this._switchSensibility){this._input=me.ONE_FINGER,this.updateTouchEvent(e),this.onSinglePanStart(e,"ROTATE");break}break;case me.TWO_FINGER:this.updateTouchEvent(e),this.onRotateMove(),this.onPinchMove(),this.onDoublePanMove();break;case me.MULT_FINGER:this.updateTouchEvent(e),this.onTriplePanMove(e);break}else if(e.pointerType!="touch"&&this._input==me.CURSOR){let t=null;e.ctrlKey||e.metaKey?t="CTRL":e.shiftKey&&(t="SHIFT");let n=this.getOpStateFromAction(this._button,t);n!=null&&this.onSinglePanMove(e,n)}this._downValid&&this.calculatePointersDistance(this._downEvents[this._downEvents.length-1],e)*this._devPxRatio>this._movementThreshold&&(this._downValid=!1)}function JC(e){if(e.pointerType=="touch"&&this._input!=me.CURSOR){let t=this._touchCurrent.length;for(let n=0;n<t;n++)if(this._touchCurrent[n].pointerId==e.pointerId){this._touchCurrent.splice(n,1),this._touchStart.splice(n,1);break}switch(this._input){case me.ONE_FINGER:case me.ONE_FINGER_SWITCHED:window.removeEventListener("pointermove",this._onPointerMove),window.removeEventListener("pointerup",this._onPointerUp),this._input=me.NONE,this.onSinglePanEnd();break;case me.TWO_FINGER:this.onDoublePanEnd(e),this.onPinchEnd(e),this.onRotateEnd(e),this._input=me.ONE_FINGER_SWITCHED;break;case me.MULT_FINGER:this._touchCurrent.length==0&&(window.removeEventListener("pointermove",this._onPointerMove),window.removeEventListener("pointerup",this._onPointerUp),this._input=me.NONE,this.onTriplePanEnd());break}}else e.pointerType!="touch"&&this._input==me.CURSOR&&(window.removeEventListener("pointermove",this._onPointerMove),window.removeEventListener("pointerup",this._onPointerUp),this._input=me.NONE,this.onSinglePanEnd(),this._button=-1);if(e.isPrimary)if(this._downValid)if(e.timeStamp-this._downEvents[this._downEvents.length-1].timeStamp<=this._maxDownTime)if(this._nclicks==0)this._nclicks=1,this._clickStart=performance.now();else{let n=e.timeStamp-this._clickStart,i=this.calculatePointersDistance(this._downEvents[1],this._downEvents[0])*this._devPxRatio;n<=this._maxInterval&&i<=this._posThreshold?(this._nclicks=0,this._downEvents.splice(0,this._downEvents.length),this.onDoubleTap(e)):(this._nclicks=1,this._downEvents.shift(),this._clickStart=performance.now())}else this._downValid=!1,this._nclicks=0,this._downEvents.splice(0,this._downEvents.length);else this._nclicks=0,this._downEvents.splice(0,this._downEvents.length)}function QC(e){if(this.enabled&&this.enableZoom){let t=null;e.ctrlKey||e.metaKey?t="CTRL":e.shiftKey&&(t="SHIFT");let n=this.getOpFromAction("WHEEL",t);if(n!=null){e.preventDefault(),this.dispatchEvent(oi);let i=125,r=e.deltaY/i,s=1;switch(r>0?s=1/this.scaleFactor:r<0&&(s=this.scaleFactor),n){case"ZOOM":if(this.updateTbState(Nt.SCALE,!0),r>0?s=1/Math.pow(this.scaleFactor,r):r<0&&(s=Math.pow(this.scaleFactor,-r)),this.cursorZoom&&this.enablePan){let o;this.object.isOrthographicCamera?o=this.unprojectOnTbPlane(this.object,e.clientX,e.clientY,this.domElement).applyQuaternion(this.object.quaternion).multiplyScalar(1/this.object.zoom).add(this._gizmos.position):this.object.isPerspectiveCamera&&(o=this.unprojectOnTbPlane(this.object,e.clientX,e.clientY,this.domElement).applyQuaternion(this.object.quaternion).add(this._gizmos.position)),this.applyTransformMatrix(this.scale(s,o))}else this.applyTransformMatrix(this.scale(s,this._gizmos.position));this._grid!=null&&(this.disposeGrid(),this.drawGrid()),this.updateTbState(Nt.IDLE,!1),this.dispatchEvent(Me),this.dispatchEvent(Gn);break;case"FOV":if(this.object.isPerspectiveCamera){this.updateTbState(Nt.FOV,!0),e.deltaX!=0&&(r=e.deltaX/i,s=1,r>0?s=1/Math.pow(this.scaleFactor,r):r<0&&(s=Math.pow(this.scaleFactor,-r))),this._v3_1.setFromMatrixPosition(this._cameraMatrixState);let o=this._v3_1.distanceTo(this._gizmos.position),a=o/s;a=pe.clamp(a,this.minDistance,this.maxDistance);let c=o*Math.tan(pe.DEG2RAD*this.object.fov*.5),l=pe.RAD2DEG*(Math.atan(c/a)*2);l>this.maxFov?l=this.maxFov:l<this.minFov&&(l=this.minFov);let u=c/Math.tan(pe.DEG2RAD*(l/2));s=o/u,this.setFov(l),this.applyTransformMatrix(this.scale(s,this._gizmos.position,!1))}this._grid!=null&&(this.disposeGrid(),this.drawGrid()),this.updateTbState(Nt.IDLE,!1),this.dispatchEvent(Me),this.dispatchEvent(Gn);break}}}}var qv={type:"change"},ep={type:"start"},$v={type:"end"},Gh=new Ii,Xv=new dn,tR=Math.cos(70*pe.DEG2RAD),ze=new I,_n=2*Math.PI,ge={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},tp=1e-6,Wh=class extends wn{constructor(t,n=null){super(t,n),this.state=ge.NONE,this.target=new I,this.cursor=new I,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.keyRotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:Pe.ROTATE,MIDDLE:Pe.DOLLY,RIGHT:Pe.PAN},this.touches={ONE:Un.ROTATE,TWO:Un.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._domElementKeyEvents=null,this._lastPosition=new I,this._lastQuaternion=new Ne,this._lastTargetPosition=new I,this._quat=new Ne().setFromUnitVectors(t.up,new I(0,1,0)),this._quatInverse=this._quat.clone().invert(),this._spherical=new Ds,this._sphericalDelta=new Ds,this._scale=1,this._panOffset=new I,this._rotateStart=new it,this._rotateEnd=new it,this._rotateDelta=new it,this._panStart=new it,this._panEnd=new it,this._panDelta=new it,this._dollyStart=new it,this._dollyEnd=new it,this._dollyDelta=new it,this._dollyDirection=new I,this._mouse=new it,this._performCursorZoom=!1,this._pointers=[],this._pointerPositions={},this._controlActive=!1,this._onPointerMove=nR.bind(this),this._onPointerDown=eR.bind(this),this._onPointerUp=iR.bind(this),this._onContextMenu=hR.bind(this),this._onMouseWheel=oR.bind(this),this._onKeyDown=aR.bind(this),this._onTouchStart=cR.bind(this),this._onTouchMove=lR.bind(this),this._onMouseDown=rR.bind(this),this._onMouseMove=sR.bind(this),this._interceptControlDown=uR.bind(this),this._interceptControlUp=fR.bind(this),this.domElement!==null&&this.connect(this.domElement),this.update()}connect(t){super.connect(t),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerUp),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.addEventListener("wheel",this._onMouseWheel,{passive:!1}),this.domElement.getRootNode().addEventListener("keydown",this._interceptControlDown,{passive:!0,capture:!0}),this.domElement.style.touchAction="none"}disconnect(){this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.removeEventListener("pointermove",this._onPointerMove),this.domElement.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerUp),this.domElement.removeEventListener("wheel",this._onMouseWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.stopListenToKeyEvents(),this.domElement.getRootNode().removeEventListener("keydown",this._interceptControlDown,{capture:!0}),this.domElement.style.touchAction="auto"}dispose(){this.disconnect()}getPolarAngle(){return this._spherical.phi}getAzimuthalAngle(){return this._spherical.theta}getDistance(){return this.object.position.distanceTo(this.target)}listenToKeyEvents(t){t.addEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=t}stopListenToKeyEvents(){this._domElementKeyEvents!==null&&(this._domElementKeyEvents.removeEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=null)}saveState(){this.target0.copy(this.target),this.position0.copy(this.object.position),this.zoom0=this.object.zoom}reset(){this.target.copy(this.target0),this.object.position.copy(this.position0),this.object.zoom=this.zoom0,this.object.updateProjectionMatrix(),this.dispatchEvent(qv),this.update(),this.state=ge.NONE}update(t=null){let n=this.object.position;ze.copy(n).sub(this.target),ze.applyQuaternion(this._quat),this._spherical.setFromVector3(ze),this.autoRotate&&this.state===ge.NONE&&this._rotateLeft(this._getAutoRotationAngle(t)),this.enableDamping?(this._spherical.theta+=this._sphericalDelta.theta*this.dampingFactor,this._spherical.phi+=this._sphericalDelta.phi*this.dampingFactor):(this._spherical.theta+=this._sphericalDelta.theta,this._spherical.phi+=this._sphericalDelta.phi);let i=this.minAzimuthAngle,r=this.maxAzimuthAngle;isFinite(i)&&isFinite(r)&&(i<-Math.PI?i+=_n:i>Math.PI&&(i-=_n),r<-Math.PI?r+=_n:r>Math.PI&&(r-=_n),i<=r?this._spherical.theta=Math.max(i,Math.min(r,this._spherical.theta)):this._spherical.theta=this._spherical.theta>(i+r)/2?Math.max(i,this._spherical.theta):Math.min(r,this._spherical.theta)),this._spherical.phi=Math.max(this.minPolarAngle,Math.min(this.maxPolarAngle,this._spherical.phi)),this._spherical.makeSafe(),this.enableDamping===!0?this.target.addScaledVector(this._panOffset,this.dampingFactor):this.target.add(this._panOffset),this.target.sub(this.cursor),this.target.clampLength(this.minTargetRadius,this.maxTargetRadius),this.target.add(this.cursor);let s=!1;if(this.zoomToCursor&&this._performCursorZoom||this.object.isOrthographicCamera)this._spherical.radius=this._clampDistance(this._spherical.radius);else{let o=this._spherical.radius;this._spherical.radius=this._clampDistance(this._spherical.radius*this._scale),s=o!=this._spherical.radius}if(ze.setFromSpherical(this._spherical),ze.applyQuaternion(this._quatInverse),n.copy(this.target).add(ze),this.object.lookAt(this.target),this.enableDamping===!0?(this._sphericalDelta.theta*=1-this.dampingFactor,this._sphericalDelta.phi*=1-this.dampingFactor,this._panOffset.multiplyScalar(1-this.dampingFactor)):(this._sphericalDelta.set(0,0,0),this._panOffset.set(0,0,0)),this.zoomToCursor&&this._performCursorZoom){let o=null;if(this.object.isPerspectiveCamera){let a=ze.length();o=this._clampDistance(a*this._scale);let c=a-o;this.object.position.addScaledVector(this._dollyDirection,c),this.object.updateMatrixWorld(),s=!!c}else if(this.object.isOrthographicCamera){let a=new I(this._mouse.x,this._mouse.y,0);a.unproject(this.object);let c=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),this.object.updateProjectionMatrix(),s=c!==this.object.zoom;let l=new I(this._mouse.x,this._mouse.y,0);l.unproject(this.object),this.object.position.sub(l).add(a),this.object.updateMatrixWorld(),o=ze.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),this.zoomToCursor=!1;o!==null&&(this.screenSpacePanning?this.target.set(0,0,-1).transformDirection(this.object.matrix).multiplyScalar(o).add(this.object.position):(Gh.origin.copy(this.object.position),Gh.direction.set(0,0,-1).transformDirection(this.object.matrix),Math.abs(this.object.up.dot(Gh.direction))<tR?this.object.lookAt(this.target):(Xv.setFromNormalAndCoplanarPoint(this.object.up,this.target),Gh.intersectPlane(Xv,this.target))))}else if(this.object.isOrthographicCamera){let o=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),o!==this.object.zoom&&(this.object.updateProjectionMatrix(),s=!0)}return this._scale=1,this._performCursorZoom=!1,s||this._lastPosition.distanceToSquared(this.object.position)>tp||8*(1-this._lastQuaternion.dot(this.object.quaternion))>tp||this._lastTargetPosition.distanceToSquared(this.target)>tp?(this.dispatchEvent(qv),this._lastPosition.copy(this.object.position),this._lastQuaternion.copy(this.object.quaternion),this._lastTargetPosition.copy(this.target),!0):!1}_getAutoRotationAngle(t){return t!==null?_n/60*this.autoRotateSpeed*t:_n/60/60*this.autoRotateSpeed}_getZoomScale(t){let n=Math.abs(t*.01);return Math.pow(.95,this.zoomSpeed*n)}_rotateLeft(t){this._sphericalDelta.theta-=t}_rotateUp(t){this._sphericalDelta.phi-=t}_panLeft(t,n){ze.setFromMatrixColumn(n,0),ze.multiplyScalar(-t),this._panOffset.add(ze)}_panUp(t,n){this.screenSpacePanning===!0?ze.setFromMatrixColumn(n,1):(ze.setFromMatrixColumn(n,0),ze.crossVectors(this.object.up,ze)),ze.multiplyScalar(t),this._panOffset.add(ze)}_pan(t,n){let i=this.domElement;if(this.object.isPerspectiveCamera){let r=this.object.position;ze.copy(r).sub(this.target);let s=ze.length();s*=Math.tan(this.object.fov/2*Math.PI/180),this._panLeft(2*t*s/i.clientHeight,this.object.matrix),this._panUp(2*n*s/i.clientHeight,this.object.matrix)}else this.object.isOrthographicCamera?(this._panLeft(t*(this.object.right-this.object.left)/this.object.zoom/i.clientWidth,this.object.matrix),this._panUp(n*(this.object.top-this.object.bottom)/this.object.zoom/i.clientHeight,this.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),this.enablePan=!1)}_dollyOut(t){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale/=t:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_dollyIn(t){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale*=t:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_updateZoomParameters(t,n){if(!this.zoomToCursor)return;this._performCursorZoom=!0;let i=this.domElement.getBoundingClientRect(),r=t-i.left,s=n-i.top,o=i.width,a=i.height;this._mouse.x=r/o*2-1,this._mouse.y=-(s/a)*2+1,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()}_clampDistance(t){return Math.max(this.minDistance,Math.min(this.maxDistance,t))}_handleMouseDownRotate(t){this._rotateStart.set(t.clientX,t.clientY)}_handleMouseDownDolly(t){this._updateZoomParameters(t.clientX,t.clientX),this._dollyStart.set(t.clientX,t.clientY)}_handleMouseDownPan(t){this._panStart.set(t.clientX,t.clientY)}_handleMouseMoveRotate(t){this._rotateEnd.set(t.clientX,t.clientY),this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let n=this.domElement;this._rotateLeft(_n*this._rotateDelta.x/n.clientHeight),this._rotateUp(_n*this._rotateDelta.y/n.clientHeight),this._rotateStart.copy(this._rotateEnd),this.update()}_handleMouseMoveDolly(t){this._dollyEnd.set(t.clientX,t.clientY),this._dollyDelta.subVectors(this._dollyEnd,this._dollyStart),this._dollyDelta.y>0?this._dollyOut(this._getZoomScale(this._dollyDelta.y)):this._dollyDelta.y<0&&this._dollyIn(this._getZoomScale(this._dollyDelta.y)),this._dollyStart.copy(this._dollyEnd),this.update()}_handleMouseMovePan(t){this._panEnd.set(t.clientX,t.clientY),this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd),this.update()}_handleMouseWheel(t){this._updateZoomParameters(t.clientX,t.clientY),t.deltaY<0?this._dollyIn(this._getZoomScale(t.deltaY)):t.deltaY>0&&this._dollyOut(this._getZoomScale(t.deltaY)),this.update()}_handleKeyDown(t){let n=!1;switch(t.code){case this.keys.UP:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateUp(_n*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,this.keyPanSpeed),n=!0;break;case this.keys.BOTTOM:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateUp(-_n*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,-this.keyPanSpeed),n=!0;break;case this.keys.LEFT:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateLeft(_n*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(this.keyPanSpeed,0),n=!0;break;case this.keys.RIGHT:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateLeft(-_n*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(-this.keyPanSpeed,0),n=!0;break}n&&(t.preventDefault(),this.update())}_handleTouchStartRotate(t){if(this._pointers.length===1)this._rotateStart.set(t.pageX,t.pageY);else{let n=this._getSecondPointerPosition(t),i=.5*(t.pageX+n.x),r=.5*(t.pageY+n.y);this._rotateStart.set(i,r)}}_handleTouchStartPan(t){if(this._pointers.length===1)this._panStart.set(t.pageX,t.pageY);else{let n=this._getSecondPointerPosition(t),i=.5*(t.pageX+n.x),r=.5*(t.pageY+n.y);this._panStart.set(i,r)}}_handleTouchStartDolly(t){let n=this._getSecondPointerPosition(t),i=t.pageX-n.x,r=t.pageY-n.y,s=Math.sqrt(i*i+r*r);this._dollyStart.set(0,s)}_handleTouchStartDollyPan(t){this.enableZoom&&this._handleTouchStartDolly(t),this.enablePan&&this._handleTouchStartPan(t)}_handleTouchStartDollyRotate(t){this.enableZoom&&this._handleTouchStartDolly(t),this.enableRotate&&this._handleTouchStartRotate(t)}_handleTouchMoveRotate(t){if(this._pointers.length==1)this._rotateEnd.set(t.pageX,t.pageY);else{let i=this._getSecondPointerPosition(t),r=.5*(t.pageX+i.x),s=.5*(t.pageY+i.y);this._rotateEnd.set(r,s)}this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let n=this.domElement;this._rotateLeft(_n*this._rotateDelta.x/n.clientHeight),this._rotateUp(_n*this._rotateDelta.y/n.clientHeight),this._rotateStart.copy(this._rotateEnd)}_handleTouchMovePan(t){if(this._pointers.length===1)this._panEnd.set(t.pageX,t.pageY);else{let n=this._getSecondPointerPosition(t),i=.5*(t.pageX+n.x),r=.5*(t.pageY+n.y);this._panEnd.set(i,r)}this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd)}_handleTouchMoveDolly(t){let n=this._getSecondPointerPosition(t),i=t.pageX-n.x,r=t.pageY-n.y,s=Math.sqrt(i*i+r*r);this._dollyEnd.set(0,s),this._dollyDelta.set(0,Math.pow(this._dollyEnd.y/this._dollyStart.y,this.zoomSpeed)),this._dollyOut(this._dollyDelta.y),this._dollyStart.copy(this._dollyEnd);let o=(t.pageX+n.x)*.5,a=(t.pageY+n.y)*.5;this._updateZoomParameters(o,a)}_handleTouchMoveDollyPan(t){this.enableZoom&&this._handleTouchMoveDolly(t),this.enablePan&&this._handleTouchMovePan(t)}_handleTouchMoveDollyRotate(t){this.enableZoom&&this._handleTouchMoveDolly(t),this.enableRotate&&this._handleTouchMoveRotate(t)}_addPointer(t){this._pointers.push(t.pointerId)}_removePointer(t){delete this._pointerPositions[t.pointerId];for(let n=0;n<this._pointers.length;n++)if(this._pointers[n]==t.pointerId){this._pointers.splice(n,1);return}}_isTrackingPointer(t){for(let n=0;n<this._pointers.length;n++)if(this._pointers[n]==t.pointerId)return!0;return!1}_trackPointer(t){let n=this._pointerPositions[t.pointerId];n===void 0&&(n=new it,this._pointerPositions[t.pointerId]=n),n.set(t.pageX,t.pageY)}_getSecondPointerPosition(t){let n=t.pointerId===this._pointers[0]?this._pointers[1]:this._pointers[0];return this._pointerPositions[n]}_customWheelEvent(t){let n=t.deltaMode,i={clientX:t.clientX,clientY:t.clientY,deltaY:t.deltaY};switch(n){case 1:i.deltaY*=16;break;case 2:i.deltaY*=100;break}return t.ctrlKey&&!this._controlActive&&(i.deltaY*=10),i}};function eR(e){this.enabled!==!1&&(this._pointers.length===0&&(this.domElement.setPointerCapture(e.pointerId),this.domElement.addEventListener("pointermove",this._onPointerMove),this.domElement.addEventListener("pointerup",this._onPointerUp)),!this._isTrackingPointer(e)&&(this._addPointer(e),e.pointerType==="touch"?this._onTouchStart(e):this._onMouseDown(e)))}function nR(e){this.enabled!==!1&&(e.pointerType==="touch"?this._onTouchMove(e):this._onMouseMove(e))}function iR(e){switch(this._removePointer(e),this._pointers.length){case 0:this.domElement.releasePointerCapture(e.pointerId),this.domElement.removeEventListener("pointermove",this._onPointerMove),this.domElement.removeEventListener("pointerup",this._onPointerUp),this.dispatchEvent($v),this.state=ge.NONE;break;case 1:let t=this._pointers[0],n=this._pointerPositions[t];this._onTouchStart({pointerId:t,pageX:n.x,pageY:n.y});break}}function rR(e){let t;switch(e.button){case 0:t=this.mouseButtons.LEFT;break;case 1:t=this.mouseButtons.MIDDLE;break;case 2:t=this.mouseButtons.RIGHT;break;default:t=-1}switch(t){case Pe.DOLLY:if(this.enableZoom===!1)return;this._handleMouseDownDolly(e),this.state=ge.DOLLY;break;case Pe.ROTATE:if(e.ctrlKey||e.metaKey||e.shiftKey){if(this.enablePan===!1)return;this._handleMouseDownPan(e),this.state=ge.PAN}else{if(this.enableRotate===!1)return;this._handleMouseDownRotate(e),this.state=ge.ROTATE}break;case Pe.PAN:if(e.ctrlKey||e.metaKey||e.shiftKey){if(this.enableRotate===!1)return;this._handleMouseDownRotate(e),this.state=ge.ROTATE}else{if(this.enablePan===!1)return;this._handleMouseDownPan(e),this.state=ge.PAN}break;default:this.state=ge.NONE}this.state!==ge.NONE&&this.dispatchEvent(ep)}function sR(e){switch(this.state){case ge.ROTATE:if(this.enableRotate===!1)return;this._handleMouseMoveRotate(e);break;case ge.DOLLY:if(this.enableZoom===!1)return;this._handleMouseMoveDolly(e);break;case ge.PAN:if(this.enablePan===!1)return;this._handleMouseMovePan(e);break}}function oR(e){this.enabled===!1||this.enableZoom===!1||this.state!==ge.NONE||(e.preventDefault(),this.dispatchEvent(ep),this._handleMouseWheel(this._customWheelEvent(e)),this.dispatchEvent($v))}function aR(e){this.enabled!==!1&&this._handleKeyDown(e)}function cR(e){switch(this._trackPointer(e),this._pointers.length){case 1:switch(this.touches.ONE){case Un.ROTATE:if(this.enableRotate===!1)return;this._handleTouchStartRotate(e),this.state=ge.TOUCH_ROTATE;break;case Un.PAN:if(this.enablePan===!1)return;this._handleTouchStartPan(e),this.state=ge.TOUCH_PAN;break;default:this.state=ge.NONE}break;case 2:switch(this.touches.TWO){case Un.DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchStartDollyPan(e),this.state=ge.TOUCH_DOLLY_PAN;break;case Un.DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchStartDollyRotate(e),this.state=ge.TOUCH_DOLLY_ROTATE;break;default:this.state=ge.NONE}break;default:this.state=ge.NONE}this.state!==ge.NONE&&this.dispatchEvent(ep)}function lR(e){switch(this._trackPointer(e),this.state){case ge.TOUCH_ROTATE:if(this.enableRotate===!1)return;this._handleTouchMoveRotate(e),this.update();break;case ge.TOUCH_PAN:if(this.enablePan===!1)return;this._handleTouchMovePan(e),this.update();break;case ge.TOUCH_DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchMoveDollyPan(e),this.update();break;case ge.TOUCH_DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchMoveDollyRotate(e),this.update();break;default:this.state=ge.NONE}}function hR(e){this.enabled!==!1&&e.preventDefault()}function uR(e){e.key==="Control"&&(this._controlActive=!0,this.domElement.getRootNode().addEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function fR(e){e.key==="Control"&&(this._controlActive=!1,this.domElement.getRootNode().removeEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}var dR={type:"change"},Yv=1e-6,Zv=new Ne,jh=class extends wn{constructor(t,n=null){super(t,n),this.movementSpeed=1,this.rollSpeed=.005,this.dragToLook=!1,this.autoForward=!1,this._moveState={up:0,down:0,left:0,right:0,forward:0,back:0,pitchUp:0,pitchDown:0,yawLeft:0,yawRight:0,rollLeft:0,rollRight:0},this._moveVector=new I(0,0,0),this._rotationVector=new I(0,0,0),this._lastQuaternion=new Ne,this._lastPosition=new I,this._status=0,this._onKeyDown=pR.bind(this),this._onKeyUp=mR.bind(this),this._onPointerMove=_R.bind(this),this._onPointerDown=gR.bind(this),this._onPointerUp=vR.bind(this),this._onPointerCancel=yR.bind(this),this._onContextMenu=xR.bind(this),n!==null&&this.connect(n)}connect(t){super.connect(t),window.addEventListener("keydown",this._onKeyDown),window.addEventListener("keyup",this._onKeyUp),this.domElement.addEventListener("pointermove",this._onPointerMove),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointerup",this._onPointerUp),this.domElement.addEventListener("pointercancel",this._onPointerCancel),this.domElement.addEventListener("contextmenu",this._onContextMenu)}disconnect(){window.removeEventListener("keydown",this._onKeyDown),window.removeEventListener("keyup",this._onKeyUp),this.domElement.removeEventListener("pointermove",this._onPointerMove),this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerCancel),this.domElement.removeEventListener("contextmenu",this._onContextMenu)}dispose(){this.disconnect()}update(t){if(this.enabled===!1)return;let n=this.object,i=t*this.movementSpeed,r=t*this.rollSpeed;n.translateX(this._moveVector.x*i),n.translateY(this._moveVector.y*i),n.translateZ(this._moveVector.z*i),Zv.set(this._rotationVector.x*r,this._rotationVector.y*r,this._rotationVector.z*r,1).normalize(),n.quaternion.multiply(Zv),(this._lastPosition.distanceToSquared(n.position)>Yv||8*(1-this._lastQuaternion.dot(n.quaternion))>Yv)&&(this.dispatchEvent(dR),this._lastQuaternion.copy(n.quaternion),this._lastPosition.copy(n.position))}_updateMovementVector(){let t=this._moveState.forward||this.autoForward&&!this._moveState.back?1:0;this._moveVector.x=-this._moveState.left+this._moveState.right,this._moveVector.y=-this._moveState.down+this._moveState.up,this._moveVector.z=-t+this._moveState.back}_updateRotationVector(){this._rotationVector.x=-this._moveState.pitchDown+this._moveState.pitchUp,this._rotationVector.y=-this._moveState.yawRight+this._moveState.yawLeft,this._rotationVector.z=-this._moveState.rollRight+this._moveState.rollLeft}_getContainerDimensions(){return this.domElement!=document?{size:[this.domElement.offsetWidth,this.domElement.offsetHeight],offset:[this.domElement.offsetLeft,this.domElement.offsetTop]}:{size:[window.innerWidth,window.innerHeight],offset:[0,0]}}};function pR(e){if(!(e.altKey||this.enabled===!1)){switch(e.code){case"ShiftLeft":case"ShiftRight":this.movementSpeedMultiplier=.1;break;case"KeyW":this._moveState.forward=1;break;case"KeyS":this._moveState.back=1;break;case"KeyA":this._moveState.left=1;break;case"KeyD":this._moveState.right=1;break;case"KeyR":this._moveState.up=1;break;case"KeyF":this._moveState.down=1;break;case"ArrowUp":this._moveState.pitchUp=1;break;case"ArrowDown":this._moveState.pitchDown=1;break;case"ArrowLeft":this._moveState.yawLeft=1;break;case"ArrowRight":this._moveState.yawRight=1;break;case"KeyQ":this._moveState.rollLeft=1;break;case"KeyE":this._moveState.rollRight=1;break}this._updateMovementVector(),this._updateRotationVector()}}function mR(e){if(this.enabled!==!1){switch(e.code){case"ShiftLeft":case"ShiftRight":this.movementSpeedMultiplier=1;break;case"KeyW":this._moveState.forward=0;break;case"KeyS":this._moveState.back=0;break;case"KeyA":this._moveState.left=0;break;case"KeyD":this._moveState.right=0;break;case"KeyR":this._moveState.up=0;break;case"KeyF":this._moveState.down=0;break;case"ArrowUp":this._moveState.pitchUp=0;break;case"ArrowDown":this._moveState.pitchDown=0;break;case"ArrowLeft":this._moveState.yawLeft=0;break;case"ArrowRight":this._moveState.yawRight=0;break;case"KeyQ":this._moveState.rollLeft=0;break;case"KeyE":this._moveState.rollRight=0;break}this._updateMovementVector(),this._updateRotationVector()}}function gR(e){if(this.enabled!==!1)if(this.dragToLook)this._status++;else{switch(e.button){case 0:this._moveState.forward=1;break;case 2:this._moveState.back=1;break}this._updateMovementVector()}}function _R(e){if(this.enabled!==!1&&(!this.dragToLook||this._status>0)){let t=this._getContainerDimensions(),n=t.size[0]/2,i=t.size[1]/2;this._moveState.yawLeft=-(e.pageX-t.offset[0]-n)/n,this._moveState.pitchDown=(e.pageY-t.offset[1]-i)/i,this._updateRotationVector()}}function vR(e){if(this.enabled!==!1){if(this.dragToLook)this._status--,this._moveState.yawLeft=this._moveState.pitchDown=0;else{switch(e.button){case 0:this._moveState.forward=0;break;case 2:this._moveState.back=0;break}this._updateMovementVector()}this._updateRotationVector()}}function yR(){this.enabled!==!1&&(this.dragToLook?(this._status=0,this._moveState.yawLeft=this._moveState.pitchDown=0):(this._moveState.forward=0,this._moveState.back=0,this._updateMovementVector()),this._updateRotationVector())}function xR(e){this.enabled!==!1&&e.preventDefault()}var eo={name:"CopyShader",uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform float opacity;

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = opacity * texel;


		}`};var An=class{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error("THREE.Pass: .render() must be implemented in derived pass.")}dispose(){}},bR=new Pr(-1,1,1,-1,0,1),np=class extends ve{constructor(){super(),this.setAttribute("position",new ce([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new ce([0,2,0,0,2,0],2))}},MR=new np,ar=class{constructor(t){this._mesh=new we(MR,t)}dispose(){this._mesh.geometry.dispose()}render(t){t.render(this._mesh,bR)}get material(){return this._mesh.material}set material(t){this._mesh.material=t}};var qh=class extends An{constructor(t,n="tDiffuse"){super(),this.textureID=n,this.uniforms=null,this.material=null,t instanceof Le?(this.uniforms=t.uniforms,this.material=t):t&&(this.uniforms=Fi.clone(t.uniforms),this.material=new Le({name:t.name!==void 0?t.name:"unspecified",defines:Object.assign({},t.defines),uniforms:this.uniforms,vertexShader:t.vertexShader,fragmentShader:t.fragmentShader})),this._fsQuad=new ar(this.material)}render(t,n,i){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=i.texture),this._fsQuad.material=this.material,this.renderToScreen?(t.setRenderTarget(null),this._fsQuad.render(t)):(t.setRenderTarget(n),this.clear&&t.clear(t.autoClearColor,t.autoClearDepth,t.autoClearStencil),this._fsQuad.render(t))}dispose(){this.material.dispose(),this._fsQuad.dispose()}};var Ta=class extends An{constructor(t,n){super(),this.scene=t,this.camera=n,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(t,n,i){let r=t.getContext(),s=t.state;s.buffers.color.setMask(!1),s.buffers.depth.setMask(!1),s.buffers.color.setLocked(!0),s.buffers.depth.setLocked(!0);let o,a;this.inverse?(o=0,a=1):(o=1,a=0),s.buffers.stencil.setTest(!0),s.buffers.stencil.setOp(r.REPLACE,r.REPLACE,r.REPLACE),s.buffers.stencil.setFunc(r.ALWAYS,o,4294967295),s.buffers.stencil.setClear(a),s.buffers.stencil.setLocked(!0),t.setRenderTarget(i),this.clear&&t.clear(),t.render(this.scene,this.camera),t.setRenderTarget(n),this.clear&&t.clear(),t.render(this.scene,this.camera),s.buffers.color.setLocked(!1),s.buffers.depth.setLocked(!1),s.buffers.color.setMask(!0),s.buffers.depth.setMask(!0),s.buffers.stencil.setLocked(!1),s.buffers.stencil.setFunc(r.EQUAL,1,4294967295),s.buffers.stencil.setOp(r.KEEP,r.KEEP,r.KEEP),s.buffers.stencil.setLocked(!0)}},Xh=class extends An{constructor(){super(),this.needsSwap=!1}render(t){t.state.buffers.stencil.setLocked(!1),t.state.buffers.stencil.setTest(!1)}};var $h=class{constructor(t,n){if(this.renderer=t,this._pixelRatio=t.getPixelRatio(),n===void 0){let i=t.getSize(new it);this._width=i.width,this._height=i.height,n=new Ke(this._width*this._pixelRatio,this._height*this._pixelRatio,{type:zn}),n.texture.name="EffectComposer.rt1"}else this._width=n.width,this._height=n.height;this.renderTarget1=n,this.renderTarget2=n.clone(),this.renderTarget2.texture.name="EffectComposer.rt2",this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],this.copyPass=new qh(eo),this.copyPass.material.blending=Qn,this.clock=new Jo}swapBuffers(){let t=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=t}addPass(t){this.passes.push(t),t.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(t,n){this.passes.splice(n,0,t),t.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(t){let n=this.passes.indexOf(t);n!==-1&&this.passes.splice(n,1)}isLastEnabledPass(t){for(let n=t+1;n<this.passes.length;n++)if(this.passes[n].enabled)return!1;return!0}render(t){t===void 0&&(t=this.clock.getDelta());let n=this.renderer.getRenderTarget(),i=!1;for(let r=0,s=this.passes.length;r<s;r++){let o=this.passes[r];if(o.enabled!==!1){if(o.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(r),o.render(this.renderer,this.writeBuffer,this.readBuffer,t,i),o.needsSwap){if(i){let a=this.renderer.getContext(),c=this.renderer.state.buffers.stencil;c.setFunc(a.NOTEQUAL,1,4294967295),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,t),c.setFunc(a.EQUAL,1,4294967295)}this.swapBuffers()}Ta!==void 0&&(o instanceof Ta?i=!0:o instanceof Xh&&(i=!1))}}this.renderer.setRenderTarget(n)}reset(t){if(t===void 0){let n=this.renderer.getSize(new it);this._pixelRatio=this.renderer.getPixelRatio(),this._width=n.width,this._height=n.height,t=this.renderTarget1.clone(),t.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=t,this.renderTarget2=t.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(t,n){this._width=t,this._height=n;let i=this._width*this._pixelRatio,r=this._height*this._pixelRatio;this.renderTarget1.setSize(i,r),this.renderTarget2.setSize(i,r);for(let s=0;s<this.passes.length;s++)this.passes[s].setSize(i,r)}setPixelRatio(t){this._pixelRatio=t,this.setSize(this._width,this._height)}dispose(){this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.copyPass.dispose()}};var Yh=class extends An{constructor(t,n,i=null,r=null,s=null){super(),this.scene=t,this.camera=n,this.overrideMaterial=i,this.clearColor=r,this.clearAlpha=s,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this._oldClearColor=new Ot}render(t,n,i){let r=t.autoClear;t.autoClear=!1;let s,o;this.overrideMaterial!==null&&(o=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),this.clearColor!==null&&(t.getClearColor(this._oldClearColor),t.setClearColor(this.clearColor,t.getClearAlpha())),this.clearAlpha!==null&&(s=t.getClearAlpha(),t.setClearAlpha(this.clearAlpha)),this.clearDepth==!0&&t.clearDepth(),t.setRenderTarget(this.renderToScreen?null:i),this.clear===!0&&t.clear(t.autoClearColor,t.autoClearDepth,t.autoClearStencil),t.render(this.scene,this.camera),this.clearColor!==null&&t.setClearColor(this._oldClearColor),this.clearAlpha!==null&&t.setClearAlpha(s),this.overrideMaterial!==null&&(this.scene.overrideMaterial=o),t.autoClear=r}};function hn(){return hn=Object.assign?Object.assign.bind():function(e){for(var t=1;t<arguments.length;t++){var n=arguments[t];for(var i in n)({}).hasOwnProperty.call(n,i)&&(e[i]=n[i])}return e},hn.apply(null,arguments)}function Kv(e){if(e===void 0)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return e}function cr(e,t){return cr=Object.setPrototypeOf?Object.setPrototypeOf.bind():function(n,i){return n.__proto__=i,n},cr(e,t)}function Jv(e,t){e.prototype=Object.create(t.prototype),e.prototype.constructor=e,cr(e,t)}function Zh(e){return Zh=Object.setPrototypeOf?Object.getPrototypeOf.bind():function(t){return t.__proto__||Object.getPrototypeOf(t)},Zh(e)}function Qv(e){try{return Function.toString.call(e).indexOf("[native code]")!==-1}catch(t){return typeof e=="function"}}function ip(){try{var e=!Boolean.prototype.valueOf.call(Reflect.construct(Boolean,[],function(){}))}catch(t){}return(ip=function(){return!!e})()}function ty(e,t,n){if(ip())return Reflect.construct.apply(null,arguments);var i=[null];i.push.apply(i,t);var r=new(e.bind.apply(e,i));return n&&cr(r,n.prototype),r}function Kh(e){var t=typeof Map=="function"?new Map:void 0;return Kh=function(i){if(i===null||!Qv(i))return i;if(typeof i!="function")throw new TypeError("Super expression must either be null or a function");if(t!==void 0){if(t.has(i))return t.get(i);t.set(i,r)}function r(){return ty(i,arguments,Zh(this).constructor)}return r.prototype=Object.create(i.prototype,{constructor:{value:r,enumerable:!1,writable:!0,configurable:!0}}),cr(r,i)},Kh(e)}var vn=(function(e){Jv(t,e);function t(n){var i;if(1)i=e.call(this,"An error occurred. See https://github.com/styled-components/polished/blob/main/src/internalHelpers/errors.md#"+n+" for more information.")||this;else for(var r,s,o;o<r;o++);return Kv(i)}return t})(Kh(Error));function ey(e,t){return e.substr(-t.length)===t}var SR=/^([+-]?(?:\d+|\d*\.\d+))([a-z]*|%)$/;function ny(e){if(typeof e!="string")return e;var t=e.match(SR);return t?parseFloat(e):e}var wR=function(t){return function(n,i){i===void 0&&(i="16px");var r=n,s=i;if(typeof n=="string"){if(!ey(n,"px"))throw new vn(69,t,n);r=ny(n)}if(typeof i=="string"){if(!ey(i,"px"))throw new vn(70,t,i);s=ny(i)}if(typeof r=="string")throw new vn(71,n,t);if(typeof s=="string")throw new vn(72,i,t);return""+r/s+t}},ry=wR,Mz=ry("em");var Sz=ry("rem");function rp(e){return Math.round(e*255)}function ER(e,t,n){return rp(e)+","+rp(t)+","+rp(n)}function Aa(e,t,n,i){if(i===void 0&&(i=ER),t===0)return i(n,n,n);var r=(e%360+360)%360/60,s=(1-Math.abs(2*n-1))*t,o=s*(1-Math.abs(r%2-1)),a=0,c=0,l=0;r>=0&&r<1?(a=s,c=o):r>=1&&r<2?(a=o,c=s):r>=2&&r<3?(c=s,l=o):r>=3&&r<4?(c=o,l=s):r>=4&&r<5?(a=o,l=s):r>=5&&r<6&&(a=s,l=o);var u=n-s/2,h=a+u,d=c+u,f=l+u;return i(h,d,f)}var iy={aliceblue:"f0f8ff",antiquewhite:"faebd7",aqua:"00ffff",aquamarine:"7fffd4",azure:"f0ffff",beige:"f5f5dc",bisque:"ffe4c4",black:"000",blanchedalmond:"ffebcd",blue:"0000ff",blueviolet:"8a2be2",brown:"a52a2a",burlywood:"deb887",cadetblue:"5f9ea0",chartreuse:"7fff00",chocolate:"d2691e",coral:"ff7f50",cornflowerblue:"6495ed",cornsilk:"fff8dc",crimson:"dc143c",cyan:"00ffff",darkblue:"00008b",darkcyan:"008b8b",darkgoldenrod:"b8860b",darkgray:"a9a9a9",darkgreen:"006400",darkgrey:"a9a9a9",darkkhaki:"bdb76b",darkmagenta:"8b008b",darkolivegreen:"556b2f",darkorange:"ff8c00",darkorchid:"9932cc",darkred:"8b0000",darksalmon:"e9967a",darkseagreen:"8fbc8f",darkslateblue:"483d8b",darkslategray:"2f4f4f",darkslategrey:"2f4f4f",darkturquoise:"00ced1",darkviolet:"9400d3",deeppink:"ff1493",deepskyblue:"00bfff",dimgray:"696969",dimgrey:"696969",dodgerblue:"1e90ff",firebrick:"b22222",floralwhite:"fffaf0",forestgreen:"228b22",fuchsia:"ff00ff",gainsboro:"dcdcdc",ghostwhite:"f8f8ff",gold:"ffd700",goldenrod:"daa520",gray:"808080",green:"008000",greenyellow:"adff2f",grey:"808080",honeydew:"f0fff0",hotpink:"ff69b4",indianred:"cd5c5c",indigo:"4b0082",ivory:"fffff0",khaki:"f0e68c",lavender:"e6e6fa",lavenderblush:"fff0f5",lawngreen:"7cfc00",lemonchiffon:"fffacd",lightblue:"add8e6",lightcoral:"f08080",lightcyan:"e0ffff",lightgoldenrodyellow:"fafad2",lightgray:"d3d3d3",lightgreen:"90ee90",lightgrey:"d3d3d3",lightpink:"ffb6c1",lightsalmon:"ffa07a",lightseagreen:"20b2aa",lightskyblue:"87cefa",lightslategray:"789",lightslategrey:"789",lightsteelblue:"b0c4de",lightyellow:"ffffe0",lime:"0f0",limegreen:"32cd32",linen:"faf0e6",magenta:"f0f",maroon:"800000",mediumaquamarine:"66cdaa",mediumblue:"0000cd",mediumorchid:"ba55d3",mediumpurple:"9370db",mediumseagreen:"3cb371",mediumslateblue:"7b68ee",mediumspringgreen:"00fa9a",mediumturquoise:"48d1cc",mediumvioletred:"c71585",midnightblue:"191970",mintcream:"f5fffa",mistyrose:"ffe4e1",moccasin:"ffe4b5",navajowhite:"ffdead",navy:"000080",oldlace:"fdf5e6",olive:"808000",olivedrab:"6b8e23",orange:"ffa500",orangered:"ff4500",orchid:"da70d6",palegoldenrod:"eee8aa",palegreen:"98fb98",paleturquoise:"afeeee",palevioletred:"db7093",papayawhip:"ffefd5",peachpuff:"ffdab9",peru:"cd853f",pink:"ffc0cb",plum:"dda0dd",powderblue:"b0e0e6",purple:"800080",rebeccapurple:"639",red:"f00",rosybrown:"bc8f8f",royalblue:"4169e1",saddlebrown:"8b4513",salmon:"fa8072",sandybrown:"f4a460",seagreen:"2e8b57",seashell:"fff5ee",sienna:"a0522d",silver:"c0c0c0",skyblue:"87ceeb",slateblue:"6a5acd",slategray:"708090",slategrey:"708090",snow:"fffafa",springgreen:"00ff7f",steelblue:"4682b4",tan:"d2b48c",teal:"008080",thistle:"d8bfd8",tomato:"ff6347",turquoise:"40e0d0",violet:"ee82ee",wheat:"f5deb3",white:"fff",whitesmoke:"f5f5f5",yellow:"ff0",yellowgreen:"9acd32"};function TR(e){if(typeof e!="string")return e;var t=e.toLowerCase();return iy[t]?"#"+iy[t]:e}var AR=/^#[a-fA-F0-9]{6}$/,CR=/^#[a-fA-F0-9]{8}$/,RR=/^#[a-fA-F0-9]{3}$/,PR=/^#[a-fA-F0-9]{4}$/,sp=/^rgb\(\s*(\d{1,3})\s*(?:,)?\s*(\d{1,3})\s*(?:,)?\s*(\d{1,3})\s*\)$/i,IR=/^rgb(?:a)?\(\s*(\d{1,3})\s*(?:,)?\s*(\d{1,3})\s*(?:,)?\s*(\d{1,3})\s*(?:,|\/)\s*([-+]?\d*[.]?\d+[%]?)\s*\)$/i,DR=/^hsl\(\s*(\d{0,3}[.]?[0-9]+(?:deg)?)\s*(?:,)?\s*(\d{1,3}[.]?[0-9]?)%\s*(?:,)?\s*(\d{1,3}[.]?[0-9]?)%\s*\)$/i,LR=/^hsl(?:a)?\(\s*(\d{0,3}[.]?[0-9]+(?:deg)?)\s*(?:,)?\s*(\d{1,3}[.]?[0-9]?)%\s*(?:,)?\s*(\d{1,3}[.]?[0-9]?)%\s*(?:,|\/)\s*([-+]?\d*[.]?\d+[%]?)\s*\)$/i;function lr(e){if(typeof e!="string")throw new vn(3);var t=TR(e);if(t.match(AR))return{red:parseInt(""+t[1]+t[2],16),green:parseInt(""+t[3]+t[4],16),blue:parseInt(""+t[5]+t[6],16)};if(t.match(CR)){var n=parseFloat((parseInt(""+t[7]+t[8],16)/255).toFixed(2));return{red:parseInt(""+t[1]+t[2],16),green:parseInt(""+t[3]+t[4],16),blue:parseInt(""+t[5]+t[6],16),alpha:n}}if(t.match(RR))return{red:parseInt(""+t[1]+t[1],16),green:parseInt(""+t[2]+t[2],16),blue:parseInt(""+t[3]+t[3],16)};if(t.match(PR)){var i=parseFloat((parseInt(""+t[4]+t[4],16)/255).toFixed(2));return{red:parseInt(""+t[1]+t[1],16),green:parseInt(""+t[2]+t[2],16),blue:parseInt(""+t[3]+t[3],16),alpha:i}}var r=sp.exec(t);if(r)return{red:parseInt(""+r[1],10),green:parseInt(""+r[2],10),blue:parseInt(""+r[3],10)};var s=IR.exec(t.substring(0,50));if(s)return{red:parseInt(""+s[1],10),green:parseInt(""+s[2],10),blue:parseInt(""+s[3],10),alpha:parseFloat(""+s[4])>1?parseFloat(""+s[4])/100:parseFloat(""+s[4])};var o=DR.exec(t);if(o){var a=parseInt(""+o[1],10),c=parseInt(""+o[2],10)/100,l=parseInt(""+o[3],10)/100,u="rgb("+Aa(a,c,l)+")",h=sp.exec(u);if(!h)throw new vn(4,t,u);return{red:parseInt(""+h[1],10),green:parseInt(""+h[2],10),blue:parseInt(""+h[3],10)}}var d=LR.exec(t.substring(0,50));if(d){var f=parseInt(""+d[1],10),m=parseInt(""+d[2],10)/100,_=parseInt(""+d[3],10)/100,g="rgb("+Aa(f,m,_)+")",p=sp.exec(g);if(!p)throw new vn(4,t,g);return{red:parseInt(""+p[1],10),green:parseInt(""+p[2],10),blue:parseInt(""+p[3],10),alpha:parseFloat(""+d[4])>1?parseFloat(""+d[4])/100:parseFloat(""+d[4])}}throw new vn(5)}function OR(e){var t=e.red/255,n=e.green/255,i=e.blue/255,r=Math.max(t,n,i),s=Math.min(t,n,i),o=(r+s)/2;if(r===s)return e.alpha!==void 0?{hue:0,saturation:0,lightness:o,alpha:e.alpha}:{hue:0,saturation:0,lightness:o};var a,c=r-s,l=o>.5?c/(2-r-s):c/(r+s);switch(r){case t:a=(n-i)/c+(n<i?6:0);break;case n:a=(i-t)/c+2;break;default:a=(t-n)/c+4;break}return a*=60,e.alpha!==void 0?{hue:a,saturation:l,lightness:o,alpha:e.alpha}:{hue:a,saturation:l,lightness:o}}function hr(e){return OR(lr(e))}var NR=function(t){return t.length===7&&t[1]===t[2]&&t[3]===t[4]&&t[5]===t[6]?"#"+t[1]+t[3]+t[5]:t},ap=NR;function $r(e){var t=e.toString(16);return t.length===1?"0"+t:t}function op(e){return $r(Math.round(e*255))}function FR(e,t,n){return ap("#"+op(e)+op(t)+op(n))}function Jh(e,t,n){return Aa(e,t,n,FR)}function UR(e,t,n){if(typeof e=="number"&&typeof t=="number"&&typeof n=="number")return Jh(e,t,n);if(typeof e=="object"&&t===void 0&&n===void 0)return Jh(e.hue,e.saturation,e.lightness);throw new vn(1)}function zR(e,t,n,i){if(typeof e=="number"&&typeof t=="number"&&typeof n=="number"&&typeof i=="number")return i>=1?Jh(e,t,n):"rgba("+Aa(e,t,n)+","+i+")";if(typeof e=="object"&&t===void 0&&n===void 0&&i===void 0)return e.alpha>=1?Jh(e.hue,e.saturation,e.lightness):"rgba("+Aa(e.hue,e.saturation,e.lightness)+","+e.alpha+")";throw new vn(2)}function cp(e,t,n){if(typeof e=="number"&&typeof t=="number"&&typeof n=="number")return ap("#"+$r(e)+$r(t)+$r(n));if(typeof e=="object"&&t===void 0&&n===void 0)return ap("#"+$r(e.red)+$r(e.green)+$r(e.blue));throw new vn(6)}function Qh(e,t,n,i){if(typeof e=="string"&&typeof t=="number"){var r=lr(e);return"rgba("+r.red+","+r.green+","+r.blue+","+t+")"}else{if(typeof e=="number"&&typeof t=="number"&&typeof n=="number"&&typeof i=="number")return i>=1?cp(e,t,n):"rgba("+e+","+t+","+n+","+i+")";if(typeof e=="object"&&t===void 0&&n===void 0&&i===void 0)return e.alpha>=1?cp(e.red,e.green,e.blue):"rgba("+e.red+","+e.green+","+e.blue+","+e.alpha+")"}throw new vn(7)}var kR=function(t){return typeof t.red=="number"&&typeof t.green=="number"&&typeof t.blue=="number"&&(typeof t.alpha!="number"||typeof t.alpha=="undefined")},BR=function(t){return typeof t.red=="number"&&typeof t.green=="number"&&typeof t.blue=="number"&&typeof t.alpha=="number"},VR=function(t){return typeof t.hue=="number"&&typeof t.saturation=="number"&&typeof t.lightness=="number"&&(typeof t.alpha!="number"||typeof t.alpha=="undefined")},HR=function(t){return typeof t.hue=="number"&&typeof t.saturation=="number"&&typeof t.lightness=="number"&&typeof t.alpha=="number"};function ur(e){if(typeof e!="object")throw new vn(8);if(BR(e))return Qh(e);if(kR(e))return cp(e);if(HR(e))return zR(e);if(VR(e))return UR(e);throw new vn(8)}function sy(e,t,n){return function(){var r=n.concat(Array.prototype.slice.call(arguments));return r.length>=t?e.apply(this,r):sy(e,t,r)}}function Cn(e){return sy(e,e.length,[])}function GR(e,t){if(t==="transparent")return t;var n=hr(t);return ur(hn({},n,{hue:n.hue+parseFloat(e)}))}var wz=Cn(GR);function no(e,t,n){return Math.max(e,Math.min(t,n))}function WR(e,t){if(t==="transparent")return t;var n=hr(t);return ur(hn({},n,{lightness:no(0,1,n.lightness-parseFloat(e))}))}var Ez=Cn(WR);function jR(e,t){if(t==="transparent")return t;var n=hr(t);return ur(hn({},n,{saturation:no(0,1,n.saturation-parseFloat(e))}))}var Tz=Cn(jR);function qR(e,t){if(t==="transparent")return t;var n=hr(t);return ur(hn({},n,{lightness:no(0,1,n.lightness+parseFloat(e))}))}var Az=Cn(qR);function XR(e,t,n){if(t==="transparent")return n;if(n==="transparent")return t;if(e===0)return n;var i=lr(t),r=hn({},i,{alpha:typeof i.alpha=="number"?i.alpha:1}),s=lr(n),o=hn({},s,{alpha:typeof s.alpha=="number"?s.alpha:1}),a=r.alpha-o.alpha,c=parseFloat(e)*2-1,l=c*a===-1?c:c+a,u=1+c*a,h=(l/u+1)/2,d=1-h,f={red:Math.floor(r.red*h+o.red*d),green:Math.floor(r.green*h+o.green*d),blue:Math.floor(r.blue*h+o.blue*d),alpha:r.alpha*parseFloat(e)+o.alpha*(1-parseFloat(e))};return Qh(f)}var $R=Cn(XR),oy=$R;function YR(e,t){if(t==="transparent")return t;var n=lr(t),i=typeof n.alpha=="number"?n.alpha:1,r=hn({},n,{alpha:no(0,1,(i*100+parseFloat(e)*100)/100)});return Qh(r)}var ZR=Cn(YR),ay=ZR;function KR(e,t){if(t==="transparent")return t;var n=hr(t);return ur(hn({},n,{saturation:no(0,1,n.saturation+parseFloat(e))}))}var Cz=Cn(KR);function JR(e,t){return t==="transparent"?t:ur(hn({},hr(t),{hue:parseFloat(e)}))}var Rz=Cn(JR);function QR(e,t){return t==="transparent"?t:ur(hn({},hr(t),{lightness:parseFloat(e)}))}var Pz=Cn(QR);function tP(e,t){return t==="transparent"?t:ur(hn({},hr(t),{saturation:parseFloat(e)}))}var Iz=Cn(tP);function eP(e,t){return t==="transparent"?t:oy(parseFloat(e),"rgb(0, 0, 0)",t)}var Dz=Cn(eP);function nP(e,t){return t==="transparent"?t:oy(parseFloat(e),"rgb(255, 255, 255)",t)}var Lz=Cn(nP);function iP(e,t){if(t==="transparent")return t;var n=lr(t),i=typeof n.alpha=="number"?n.alpha:1,r=hn({},n,{alpha:no(0,1,+(i*100-parseFloat(e)*100).toFixed(2)/100)});return Qh(r)}var Oz=Cn(iP);var fr=Object.freeze({Linear:Object.freeze({None:function(e){return e},In:function(e){return e},Out:function(e){return e},InOut:function(e){return e}}),Quadratic:Object.freeze({In:function(e){return e*e},Out:function(e){return e*(2-e)},InOut:function(e){return(e*=2)<1?.5*e*e:-.5*(--e*(e-2)-1)}}),Cubic:Object.freeze({In:function(e){return e*e*e},Out:function(e){return--e*e*e+1},InOut:function(e){return(e*=2)<1?.5*e*e*e:.5*((e-=2)*e*e+2)}}),Quartic:Object.freeze({In:function(e){return e*e*e*e},Out:function(e){return 1- --e*e*e*e},InOut:function(e){return(e*=2)<1?.5*e*e*e*e:-.5*((e-=2)*e*e*e-2)}}),Quintic:Object.freeze({In:function(e){return e*e*e*e*e},Out:function(e){return--e*e*e*e*e+1},InOut:function(e){return(e*=2)<1?.5*e*e*e*e*e:.5*((e-=2)*e*e*e*e+2)}}),Sinusoidal:Object.freeze({In:function(e){return 1-Math.sin((1-e)*Math.PI/2)},Out:function(e){return Math.sin(e*Math.PI/2)},InOut:function(e){return .5*(1-Math.sin(Math.PI*(.5-e)))}}),Exponential:Object.freeze({In:function(e){return e===0?0:Math.pow(1024,e-1)},Out:function(e){return e===1?1:1-Math.pow(2,-10*e)},InOut:function(e){return e===0?0:e===1?1:(e*=2)<1?.5*Math.pow(1024,e-1):.5*(-Math.pow(2,-10*(e-1))+2)}}),Circular:Object.freeze({In:function(e){return 1-Math.sqrt(1-e*e)},Out:function(e){return Math.sqrt(1- --e*e)},InOut:function(e){return(e*=2)<1?-.5*(Math.sqrt(1-e*e)-1):.5*(Math.sqrt(1-(e-=2)*e)+1)}}),Elastic:Object.freeze({In:function(e){return e===0?0:e===1?1:-Math.pow(2,10*(e-1))*Math.sin((e-1.1)*5*Math.PI)},Out:function(e){return e===0?0:e===1?1:Math.pow(2,-10*e)*Math.sin((e-.1)*5*Math.PI)+1},InOut:function(e){return e===0?0:e===1?1:(e*=2,e<1?-.5*Math.pow(2,10*(e-1))*Math.sin((e-1.1)*5*Math.PI):.5*Math.pow(2,-10*(e-1))*Math.sin((e-1.1)*5*Math.PI)+1)}}),Back:Object.freeze({In:function(e){var t=1.70158;return e===1?1:e*e*((t+1)*e-t)},Out:function(e){var t=1.70158;return e===0?0:--e*e*((t+1)*e+t)+1},InOut:function(e){var t=2.5949095;return(e*=2)<1?.5*(e*e*((t+1)*e-t)):.5*((e-=2)*e*((t+1)*e+t)+2)}}),Bounce:Object.freeze({In:function(e){return 1-fr.Bounce.Out(1-e)},Out:function(e){return e<.36363636363636365?7.5625*e*e:e<.7272727272727273?7.5625*(e-=.5454545454545454)*e+.75:e<.9090909090909091?7.5625*(e-=.8181818181818182)*e+.9375:7.5625*(e-=.9545454545454546)*e+.984375},InOut:function(e){return e<.5?fr.Bounce.In(e*2)*.5:fr.Bounce.Out(e*2-1)*.5+.5}}),generatePow:function(e){return e===void 0&&(e=4),e=e<Number.EPSILON?Number.EPSILON:e,e=e>1e4?1e4:e,{In:function(t){return Math.pow(t,e)},Out:function(t){return 1-Math.pow(1-t,e)},InOut:function(t){return t<.5?Math.pow(t*2,e)/2:(1-Math.pow(2-t*2,e))/2+.5}}}}),Ca=function(){return performance.now()},hp=(function(){function e(){for(var t=[],n=0;n<arguments.length;n++)t[n]=arguments[n];this._tweens={},this._tweensAddedDuringUpdate={},this.add.apply(this,t)}return e.prototype.getAll=function(){var t=this;return Object.keys(this._tweens).map(function(n){return t._tweens[n]})},e.prototype.removeAll=function(){this._tweens={}},e.prototype.add=function(){for(var t,n=[],i=0;i<arguments.length;i++)n[i]=arguments[i];for(var r=0,s=n;r<s.length;r++){var o=s[r];(t=o._group)===null||t===void 0||t.remove(o),o._group=this,this._tweens[o.getId()]=o,this._tweensAddedDuringUpdate[o.getId()]=o}},e.prototype.remove=function(){for(var t=[],n=0;n<arguments.length;n++)t[n]=arguments[n];for(var i=0,r=t;i<r.length;i++){var s=r[i];s._group=void 0,delete this._tweens[s.getId()],delete this._tweensAddedDuringUpdate[s.getId()]}},e.prototype.allStopped=function(){return this.getAll().every(function(t){return!t.isPlaying()})},e.prototype.update=function(t,n){t===void 0&&(t=Ca()),n===void 0&&(n=!0);var i=Object.keys(this._tweens);if(i.length!==0)for(;i.length>0;){this._tweensAddedDuringUpdate={};for(var r=0;r<i.length;r++){var s=this._tweens[i[r]],o=!n;s&&s.update(t,o)===!1&&!n&&this.remove(s)}i=Object.keys(this._tweensAddedDuringUpdate)}},e})(),io={Linear:function(e,t){var n=e.length-1,i=n*t,r=Math.floor(i),s=io.Utils.Linear;return t<0?s(e[0],e[1],i):t>1?s(e[n],e[n-1],n-i):s(e[r],e[r+1>n?n:r+1],i-r)},Bezier:function(e,t){for(var n=0,i=e.length-1,r=Math.pow,s=io.Utils.Bernstein,o=0;o<=i;o++)n+=r(1-t,i-o)*r(t,o)*e[o]*s(i,o);return n},CatmullRom:function(e,t){var n=e.length-1,i=n*t,r=Math.floor(i),s=io.Utils.CatmullRom;return e[0]===e[n]?(t<0&&(r=Math.floor(i=n*(1+t))),s(e[(r-1+n)%n],e[r],e[(r+1)%n],e[(r+2)%n],i-r)):t<0?e[0]-(s(e[0],e[0],e[1],e[1],-i)-e[0]):t>1?e[n]-(s(e[n],e[n],e[n-1],e[n-1],i-n)-e[n]):s(e[r?r-1:0],e[r],e[n<r+1?n:r+1],e[n<r+2?n:r+2],i-r)},Utils:{Linear:function(e,t,n){return(t-e)*n+e},Bernstein:function(e,t){var n=io.Utils.Factorial;return n(e)/n(t)/n(e-t)},Factorial:(function(){var e=[1];return function(t){var n=1;if(e[t])return e[t];for(var i=t;i>1;i--)n*=i;return e[t]=n,n}})(),CatmullRom:function(e,t,n,i,r){var s=(n-e)*.5,o=(i-t)*.5,a=r*r,c=r*a;return(2*t-2*n+s+o)*c+(-3*t+3*n-2*s-o)*a+s*r+t}}},cy=(function(){function e(){}return e.nextId=function(){return e._nextId++},e._nextId=0,e})(),lp=new hp,up=(function(){function e(t,n){this._isPaused=!1,this._pauseStart=0,this._valuesStart={},this._valuesEnd={},this._valuesStartRepeat={},this._duration=1e3,this._isDynamic=!1,this._initialRepeat=0,this._repeat=0,this._yoyo=!1,this._isPlaying=!1,this._reversed=!1,this._delayTime=0,this._startTime=0,this._easingFunction=fr.Linear.None,this._interpolationFunction=io.Linear,this._chainedTweens=[],this._onStartCallbackFired=!1,this._onEveryStartCallbackFired=!1,this._id=cy.nextId(),this._isChainStopped=!1,this._propertiesAreSetUp=!1,this._goToEnd=!1,this._object=t,typeof n=="object"?(this._group=n,n.add(this)):n===!0&&(this._group=lp,lp.add(this))}return e.prototype.getId=function(){return this._id},e.prototype.isPlaying=function(){return this._isPlaying},e.prototype.isPaused=function(){return this._isPaused},e.prototype.getDuration=function(){return this._duration},e.prototype.to=function(t,n){if(n===void 0&&(n=1e3),this._isPlaying)throw new Error("Can not call Tween.to() while Tween is already started or paused. Stop the Tween first.");return this._valuesEnd=t,this._propertiesAreSetUp=!1,this._duration=n<0?0:n,this},e.prototype.duration=function(t){return t===void 0&&(t=1e3),this._duration=t<0?0:t,this},e.prototype.dynamic=function(t){return t===void 0&&(t=!1),this._isDynamic=t,this},e.prototype.start=function(t,n){if(t===void 0&&(t=Ca()),n===void 0&&(n=!1),this._isPlaying)return this;if(this._repeat=this._initialRepeat,this._reversed){this._reversed=!1;for(var i in this._valuesStartRepeat)this._swapEndStartRepeatValues(i),this._valuesStart[i]=this._valuesStartRepeat[i]}if(this._isPlaying=!0,this._isPaused=!1,this._onStartCallbackFired=!1,this._onEveryStartCallbackFired=!1,this._isChainStopped=!1,this._startTime=t,this._startTime+=this._delayTime,!this._propertiesAreSetUp||n){if(this._propertiesAreSetUp=!0,!this._isDynamic){var r={};for(var s in this._valuesEnd)r[s]=this._valuesEnd[s];this._valuesEnd=r}this._setupProperties(this._object,this._valuesStart,this._valuesEnd,this._valuesStartRepeat,n)}return this},e.prototype.startFromCurrentValues=function(t){return this.start(t,!0)},e.prototype._setupProperties=function(t,n,i,r,s){for(var o in i){var a=t[o],c=Array.isArray(a),l=c?"array":typeof a,u=!c&&Array.isArray(i[o]);if(!(l==="undefined"||l==="function")){if(u){var h=i[o];if(h.length===0)continue;for(var d=[a],f=0,m=h.length;f<m;f+=1){var _=this._handleRelativeValue(a,h[f]);if(isNaN(_)){u=!1,console.warn("Found invalid interpolation list. Skipping.");break}d.push(_)}u&&(i[o]=d)}if((l==="object"||c)&&a&&!u){n[o]=c?[]:{};var g=a;for(var p in g)n[o][p]=g[p];r[o]=c?[]:{};var h=i[o];if(!this._isDynamic){var b={};for(var p in h)b[p]=h[p];i[o]=h=b}this._setupProperties(g,n[o],h,r[o],s)}else(typeof n[o]=="undefined"||s)&&(n[o]=a),c||(n[o]*=1),u?r[o]=i[o].slice().reverse():r[o]=n[o]||0}}},e.prototype.stop=function(){return this._isChainStopped||(this._isChainStopped=!0,this.stopChainedTweens()),this._isPlaying?(this._isPlaying=!1,this._isPaused=!1,this._onStopCallback&&this._onStopCallback(this._object),this):this},e.prototype.end=function(){return this._goToEnd=!0,this.update(this._startTime+this._duration),this},e.prototype.pause=function(t){return t===void 0&&(t=Ca()),this._isPaused||!this._isPlaying?this:(this._isPaused=!0,this._pauseStart=t,this)},e.prototype.resume=function(t){return t===void 0&&(t=Ca()),!this._isPaused||!this._isPlaying?this:(this._isPaused=!1,this._startTime+=t-this._pauseStart,this._pauseStart=0,this)},e.prototype.stopChainedTweens=function(){for(var t=0,n=this._chainedTweens.length;t<n;t++)this._chainedTweens[t].stop();return this},e.prototype.group=function(t){return t?(t.add(this),this):(console.warn("tween.group() without args has been removed, use group.add(tween) instead."),this)},e.prototype.remove=function(){var t;return(t=this._group)===null||t===void 0||t.remove(this),this},e.prototype.delay=function(t){return t===void 0&&(t=0),this._delayTime=t,this},e.prototype.repeat=function(t){return t===void 0&&(t=0),this._initialRepeat=t,this._repeat=t,this},e.prototype.repeatDelay=function(t){return this._repeatDelayTime=t,this},e.prototype.yoyo=function(t){return t===void 0&&(t=!1),this._yoyo=t,this},e.prototype.easing=function(t){return t===void 0&&(t=fr.Linear.None),this._easingFunction=t,this},e.prototype.interpolation=function(t){return t===void 0&&(t=io.Linear),this._interpolationFunction=t,this},e.prototype.chain=function(){for(var t=[],n=0;n<arguments.length;n++)t[n]=arguments[n];return this._chainedTweens=t,this},e.prototype.onStart=function(t){return this._onStartCallback=t,this},e.prototype.onEveryStart=function(t){return this._onEveryStartCallback=t,this},e.prototype.onUpdate=function(t){return this._onUpdateCallback=t,this},e.prototype.onRepeat=function(t){return this._onRepeatCallback=t,this},e.prototype.onComplete=function(t){return this._onCompleteCallback=t,this},e.prototype.onStop=function(t){return this._onStopCallback=t,this},e.prototype.update=function(t,n){var i=this,r;if(t===void 0&&(t=Ca()),n===void 0&&(n=e.autoStartOnUpdate),this._isPaused)return!0;var s;if(!this._goToEnd&&!this._isPlaying)if(n)this.start(t,!0);else return!1;if(this._goToEnd=!1,t<this._startTime)return!0;this._onStartCallbackFired===!1&&(this._onStartCallback&&this._onStartCallback(this._object),this._onStartCallbackFired=!0),this._onEveryStartCallbackFired===!1&&(this._onEveryStartCallback&&this._onEveryStartCallback(this._object),this._onEveryStartCallbackFired=!0);var o=t-this._startTime,a=this._duration+((r=this._repeatDelayTime)!==null&&r!==void 0?r:this._delayTime),c=this._duration+this._repeat*a,l=function(){if(i._duration===0||o>c)return 1;var _=Math.trunc(o/a),g=o-_*a,p=Math.min(g/i._duration,1);return p===0&&o===i._duration?1:p},u=l(),h=this._easingFunction(u);if(this._updateProperties(this._object,this._valuesStart,this._valuesEnd,h),this._onUpdateCallback&&this._onUpdateCallback(this._object,u),this._duration===0||o>=this._duration)if(this._repeat>0){var d=Math.min(Math.trunc((o-this._duration)/a)+1,this._repeat);isFinite(this._repeat)&&(this._repeat-=d);for(s in this._valuesStartRepeat)!this._yoyo&&typeof this._valuesEnd[s]=="string"&&(this._valuesStartRepeat[s]=this._valuesStartRepeat[s]+parseFloat(this._valuesEnd[s])),this._yoyo&&this._swapEndStartRepeatValues(s),this._valuesStart[s]=this._valuesStartRepeat[s];return this._yoyo&&(this._reversed=!this._reversed),this._startTime+=a*d,this._onRepeatCallback&&this._onRepeatCallback(this._object),this._onEveryStartCallbackFired=!1,!0}else{this._onCompleteCallback&&this._onCompleteCallback(this._object);for(var f=0,m=this._chainedTweens.length;f<m;f++)this._chainedTweens[f].start(this._startTime+this._duration,!1);return this._isPlaying=!1,!1}return!0},e.prototype._updateProperties=function(t,n,i,r){for(var s in i)if(n[s]!==void 0){var o=n[s]||0,a=i[s],c=Array.isArray(t[s]),l=Array.isArray(a),u=!c&&l;u?t[s]=this._interpolationFunction(a,r):typeof a=="object"&&a?this._updateProperties(t[s],o,a,r):(a=this._handleRelativeValue(o,a),typeof a=="number"&&(t[s]=o+(a-o)*r))}},e.prototype._handleRelativeValue=function(t,n){return typeof n!="string"?n:n.charAt(0)==="+"||n.charAt(0)==="-"?t+parseFloat(n):parseFloat(n)},e.prototype._swapEndStartRepeatValues=function(t){var n=this._valuesStartRepeat[t],i=this._valuesEnd[t];typeof i=="string"?this._valuesStartRepeat[t]=this._valuesStartRepeat[t]+parseFloat(i):this._valuesStartRepeat[t]=this._valuesEnd[t],this._valuesEnd[t]=n},e.autoStartOnUpdate=!1,e})();var Fz=cy.nextId,xi=lp,Uz=xi.getAll.bind(xi),zz=xi.removeAll.bind(xi),kz=xi.add.bind(xi),Bz=xi.remove.bind(xi),Vz=xi.update.bind(xi);var fp="http://www.w3.org/1999/xhtml",ly={svg:"http://www.w3.org/2000/svg",xhtml:fp,xlink:"http://www.w3.org/1999/xlink",xml:"http://www.w3.org/XML/1998/namespace",xmlns:"http://www.w3.org/2000/xmlns/"};function hy(e){var t=e+="",n=t.indexOf(":");return n>=0&&(t=e.slice(0,n))!=="xmlns"&&(e=e.slice(n+1)),ly.hasOwnProperty(t)?{space:ly[t],local:e}:e}function rP(e){return function(){var t=this.ownerDocument,n=this.namespaceURI;return n===fp&&t.documentElement.namespaceURI===fp?t.createElement(e):t.createElementNS(n,e)}}function sP(e){return function(){return this.ownerDocument.createElementNS(e.space,e.local)}}function uy(e){var t=hy(e);return(t.local?sP:rP)(t)}function oP(){}function fy(e){return e==null?oP:function(){return this.querySelector(e)}}function aP(e){typeof e!="function"&&(e=fy(e));for(var t=this._groups,n=t.length,i=new Array(n),r=0;r<n;++r)for(var s=t[r],o=s.length,a=i[r]=new Array(o),c,l,u=0;u<o;++u)(c=s[u])&&(l=e.call(c,c.__data__,u,s))&&("__data__"in c&&(l.__data__=c.__data__),a[u]=l);return new Rn(i,this._parents)}function cP(e){return e==null?[]:Array.isArray(e)?e:Array.from(e)}function lP(){return[]}function hP(e){return e==null?lP:function(){return this.querySelectorAll(e)}}function uP(e){return function(){return cP(e.apply(this,arguments))}}function fP(e){typeof e=="function"?e=uP(e):e=hP(e);for(var t=this._groups,n=t.length,i=[],r=[],s=0;s<n;++s)for(var o=t[s],a=o.length,c,l=0;l<a;++l)(c=o[l])&&(i.push(e.call(c,c.__data__,l,o)),r.push(c));return new Rn(i,r)}function dP(e){return function(){return this.matches(e)}}function dy(e){return function(t){return t.matches(e)}}var pP=Array.prototype.find;function mP(e){return function(){return pP.call(this.children,e)}}function gP(){return this.firstElementChild}function _P(e){return this.select(e==null?gP:mP(typeof e=="function"?e:dy(e)))}var vP=Array.prototype.filter;function yP(){return Array.from(this.children)}function xP(e){return function(){return vP.call(this.children,e)}}function bP(e){return this.selectAll(e==null?yP:xP(typeof e=="function"?e:dy(e)))}function MP(e){typeof e!="function"&&(e=dP(e));for(var t=this._groups,n=t.length,i=new Array(n),r=0;r<n;++r)for(var s=t[r],o=s.length,a=i[r]=[],c,l=0;l<o;++l)(c=s[l])&&e.call(c,c.__data__,l,s)&&a.push(c);return new Rn(i,this._parents)}function py(e){return new Array(e.length)}function SP(){return new Rn(this._enter||this._groups.map(py),this._parents)}function tu(e,t){this.ownerDocument=e.ownerDocument,this.namespaceURI=e.namespaceURI,this._next=null,this._parent=e,this.__data__=t}tu.prototype={constructor:tu,appendChild:function(e){return this._parent.insertBefore(e,this._next)},insertBefore:function(e,t){return this._parent.insertBefore(e,t)},querySelector:function(e){return this._parent.querySelector(e)},querySelectorAll:function(e){return this._parent.querySelectorAll(e)}};function wP(e){return function(){return e}}function EP(e,t,n,i,r,s){for(var o=0,a,c=t.length,l=s.length;o<l;++o)(a=t[o])?(a.__data__=s[o],i[o]=a):n[o]=new tu(e,s[o]);for(;o<c;++o)(a=t[o])&&(r[o]=a)}function TP(e,t,n,i,r,s,o){var a,c,l=new Map,u=t.length,h=s.length,d=new Array(u),f;for(a=0;a<u;++a)(c=t[a])&&(d[a]=f=o.call(c,c.__data__,a,t)+"",l.has(f)?r[a]=c:l.set(f,c));for(a=0;a<h;++a)f=o.call(e,s[a],a,s)+"",(c=l.get(f))?(i[a]=c,c.__data__=s[a],l.delete(f)):n[a]=new tu(e,s[a]);for(a=0;a<u;++a)(c=t[a])&&l.get(d[a])===c&&(r[a]=c)}function AP(e){return e.__data__}function CP(e,t){if(!arguments.length)return Array.from(this,AP);var n=t?TP:EP,i=this._parents,r=this._groups;typeof e!="function"&&(e=wP(e));for(var s=r.length,o=new Array(s),a=new Array(s),c=new Array(s),l=0;l<s;++l){var u=i[l],h=r[l],d=h.length,f=RP(e.call(u,u&&u.__data__,l,i)),m=f.length,_=a[l]=new Array(m),g=o[l]=new Array(m),p=c[l]=new Array(d);n(u,h,_,g,p,f,t);for(var b=0,x=0,v,M;b<m;++b)if(v=_[b]){for(b>=x&&(x=b+1);!(M=g[x])&&++x<m;);v._next=M||null}}return o=new Rn(o,i),o._enter=a,o._exit=c,o}function RP(e){return typeof e=="object"&&"length"in e?e:Array.from(e)}function PP(){return new Rn(this._exit||this._groups.map(py),this._parents)}function IP(e,t,n){var i=this.enter(),r=this,s=this.exit();return typeof e=="function"?(i=e(i),i&&(i=i.selection())):i=i.append(e+""),t!=null&&(r=t(r),r&&(r=r.selection())),n==null?s.remove():n(s),i&&r?i.merge(r).order():r}function DP(e){for(var t=e.selection?e.selection():e,n=this._groups,i=t._groups,r=n.length,s=i.length,o=Math.min(r,s),a=new Array(r),c=0;c<o;++c)for(var l=n[c],u=i[c],h=l.length,d=a[c]=new Array(h),f,m=0;m<h;++m)(f=l[m]||u[m])&&(d[m]=f);for(;c<r;++c)a[c]=n[c];return new Rn(a,this._parents)}function LP(){for(var e=this._groups,t=-1,n=e.length;++t<n;)for(var i=e[t],r=i.length-1,s=i[r],o;--r>=0;)(o=i[r])&&(s&&o.compareDocumentPosition(s)^4&&s.parentNode.insertBefore(o,s),s=o);return this}function OP(e){e||(e=NP);function t(h,d){return h&&d?e(h.__data__,d.__data__):!h-!d}for(var n=this._groups,i=n.length,r=new Array(i),s=0;s<i;++s){for(var o=n[s],a=o.length,c=r[s]=new Array(a),l,u=0;u<a;++u)(l=o[u])&&(c[u]=l);c.sort(t)}return new Rn(r,this._parents).order()}function NP(e,t){return e<t?-1:e>t?1:e>=t?0:NaN}function FP(){var e=arguments[0];return arguments[0]=this,e.apply(null,arguments),this}function UP(){return Array.from(this)}function zP(){for(var e=this._groups,t=0,n=e.length;t<n;++t)for(var i=e[t],r=0,s=i.length;r<s;++r){var o=i[r];if(o)return o}return null}function kP(){let e=0;for(let t of this)++e;return e}function BP(){return!this.node()}function VP(e){for(var t=this._groups,n=0,i=t.length;n<i;++n)for(var r=t[n],s=0,o=r.length,a;s<o;++s)(a=r[s])&&e.call(a,a.__data__,s,r);return this}function HP(e){return function(){this.removeAttribute(e)}}function GP(e){return function(){this.removeAttributeNS(e.space,e.local)}}function WP(e,t){return function(){this.setAttribute(e,t)}}function jP(e,t){return function(){this.setAttributeNS(e.space,e.local,t)}}function qP(e,t){return function(){var n=t.apply(this,arguments);n==null?this.removeAttribute(e):this.setAttribute(e,n)}}function XP(e,t){return function(){var n=t.apply(this,arguments);n==null?this.removeAttributeNS(e.space,e.local):this.setAttributeNS(e.space,e.local,n)}}function $P(e,t){var n=hy(e);if(arguments.length<2){var i=this.node();return n.local?i.getAttributeNS(n.space,n.local):i.getAttribute(n)}return this.each((t==null?n.local?GP:HP:typeof t=="function"?n.local?XP:qP:n.local?jP:WP)(n,t))}function my(e){return e.ownerDocument&&e.ownerDocument.defaultView||e.document&&e||e.defaultView}function YP(e){return function(){this.style.removeProperty(e)}}function ZP(e,t,n){return function(){this.style.setProperty(e,t,n)}}function KP(e,t,n){return function(){var i=t.apply(this,arguments);i==null?this.style.removeProperty(e):this.style.setProperty(e,i,n)}}function JP(e,t,n){return arguments.length>1?this.each((t==null?YP:typeof t=="function"?KP:ZP)(e,t,n==null?"":n)):QP(this.node(),e)}function QP(e,t){return e.style.getPropertyValue(t)||my(e).getComputedStyle(e,null).getPropertyValue(t)}function t3(e){return function(){delete this[e]}}function e3(e,t){return function(){this[e]=t}}function n3(e,t){return function(){var n=t.apply(this,arguments);n==null?delete this[e]:this[e]=n}}function i3(e,t){return arguments.length>1?this.each((t==null?t3:typeof t=="function"?n3:e3)(e,t)):this.node()[e]}function gy(e){return e.trim().split(/^|\s+/)}function pp(e){return e.classList||new _y(e)}function _y(e){this._node=e,this._names=gy(e.getAttribute("class")||"")}_y.prototype={add:function(e){var t=this._names.indexOf(e);t<0&&(this._names.push(e),this._node.setAttribute("class",this._names.join(" ")))},remove:function(e){var t=this._names.indexOf(e);t>=0&&(this._names.splice(t,1),this._node.setAttribute("class",this._names.join(" ")))},contains:function(e){return this._names.indexOf(e)>=0}};function vy(e,t){for(var n=pp(e),i=-1,r=t.length;++i<r;)n.add(t[i])}function yy(e,t){for(var n=pp(e),i=-1,r=t.length;++i<r;)n.remove(t[i])}function r3(e){return function(){vy(this,e)}}function s3(e){return function(){yy(this,e)}}function o3(e,t){return function(){(t.apply(this,arguments)?vy:yy)(this,e)}}function a3(e,t){var n=gy(e+"");if(arguments.length<2){for(var i=pp(this.node()),r=-1,s=n.length;++r<s;)if(!i.contains(n[r]))return!1;return!0}return this.each((typeof t=="function"?o3:t?r3:s3)(n,t))}function c3(){this.textContent=""}function l3(e){return function(){this.textContent=e}}function h3(e){return function(){var t=e.apply(this,arguments);this.textContent=t==null?"":t}}function u3(e){return arguments.length?this.each(e==null?c3:(typeof e=="function"?h3:l3)(e)):this.node().textContent}function f3(){this.innerHTML=""}function d3(e){return function(){this.innerHTML=e}}function p3(e){return function(){var t=e.apply(this,arguments);this.innerHTML=t==null?"":t}}function m3(e){return arguments.length?this.each(e==null?f3:(typeof e=="function"?p3:d3)(e)):this.node().innerHTML}function g3(){this.nextSibling&&this.parentNode.appendChild(this)}function _3(){return this.each(g3)}function v3(){this.previousSibling&&this.parentNode.insertBefore(this,this.parentNode.firstChild)}function y3(){return this.each(v3)}function x3(e){var t=typeof e=="function"?e:uy(e);return this.select(function(){return this.appendChild(t.apply(this,arguments))})}function b3(){return null}function M3(e,t){var n=typeof e=="function"?e:uy(e),i=t==null?b3:typeof t=="function"?t:fy(t);return this.select(function(){return this.insertBefore(n.apply(this,arguments),i.apply(this,arguments)||null)})}function S3(){var e=this.parentNode;e&&e.removeChild(this)}function w3(){return this.each(S3)}function E3(){var e=this.cloneNode(!1),t=this.parentNode;return t?t.insertBefore(e,this.nextSibling):e}function T3(){var e=this.cloneNode(!0),t=this.parentNode;return t?t.insertBefore(e,this.nextSibling):e}function A3(e){return this.select(e?T3:E3)}function C3(e){return arguments.length?this.property("__data__",e):this.node().__data__}function R3(e){return function(t){e.call(this,t,this.__data__)}}function P3(e){return e.trim().split(/^|\s+/).map(function(t){var n="",i=t.indexOf(".");return i>=0&&(n=t.slice(i+1),t=t.slice(0,i)),{type:t,name:n}})}function I3(e){return function(){var t=this.__on;if(t){for(var n=0,i=-1,r=t.length,s;n<r;++n)s=t[n],(!e.type||s.type===e.type)&&s.name===e.name?this.removeEventListener(s.type,s.listener,s.options):t[++i]=s;++i?t.length=i:delete this.__on}}}function D3(e,t,n){return function(){var i=this.__on,r,s=R3(t);if(i){for(var o=0,a=i.length;o<a;++o)if((r=i[o]).type===e.type&&r.name===e.name){this.removeEventListener(r.type,r.listener,r.options),this.addEventListener(r.type,r.listener=s,r.options=n),r.value=t;return}}this.addEventListener(e.type,s,n),r={type:e.type,name:e.name,value:t,listener:s,options:n},i?i.push(r):this.__on=[r]}}function L3(e,t,n){var i=P3(e+""),r,s=i.length,o;if(arguments.length<2){var a=this.node().__on;if(a){for(var c=0,l=a.length,u;c<l;++c)for(r=0,u=a[c];r<s;++r)if((o=i[r]).type===u.type&&o.name===u.name)return u.value}return}for(a=t?D3:I3,r=0;r<s;++r)this.each(a(i[r],t,n));return this}function xy(e,t,n){var i=my(e),r=i.CustomEvent;typeof r=="function"?r=new r(t,n):(r=i.document.createEvent("Event"),n?(r.initEvent(t,n.bubbles,n.cancelable),r.detail=n.detail):r.initEvent(t,!1,!1)),e.dispatchEvent(r)}function O3(e,t){return function(){return xy(this,e,t)}}function N3(e,t){return function(){return xy(this,e,t.apply(this,arguments))}}function F3(e,t){return this.each((typeof t=="function"?N3:O3)(e,t))}function*U3(){for(var e=this._groups,t=0,n=e.length;t<n;++t)for(var i=e[t],r=0,s=i.length,o;r<s;++r)(o=i[r])&&(yield o)}var by=[null];function Rn(e,t){this._groups=e,this._parents=t}function z3(){return new Rn([[document.documentElement]],by)}function k3(){return this}Rn.prototype=z3.prototype={constructor:Rn,select:aP,selectAll:fP,selectChild:_P,selectChildren:bP,filter:MP,data:CP,enter:SP,exit:PP,join:IP,merge:DP,selection:k3,order:LP,sort:OP,call:FP,nodes:UP,node:zP,size:kP,empty:BP,each:VP,attr:$P,style:JP,property:i3,classed:a3,text:u3,html:m3,raise:_3,lower:y3,append:x3,insert:M3,remove:w3,clone:A3,datum:C3,on:L3,dispatch:F3,[Symbol.iterator]:U3};function My(e){return typeof e=="string"?new Rn([[document.querySelector(e)]],[document.documentElement]):new Rn([[e]],by)}var B3=0;function V3(){return new dp}function dp(){this._="@"+(++B3).toString(36)}dp.prototype=V3.prototype={constructor:dp,get:function(e){for(var t=this._;!(t in e);)if(!(e=e.parentNode))return;return e[t]},set:function(e,t){return e[this._]=t},remove:function(e){return this._ in e&&delete e[this._]},toString:function(){return this._}};function H3(e){let t;for(;t=e.sourceEvent;)e=t;return e}function Sy(e,t){if(e=H3(e),t===void 0&&(t=e.currentTarget),t){var n=t.ownerSVGElement||t;if(n.createSVGPoint){var i=n.createSVGPoint();return i.x=e.clientX,i.y=e.clientY,i=i.matrixTransform(t.getScreenCTM().inverse()),[i.x,i.y]}if(t.getBoundingClientRect){var r=t.getBoundingClientRect();return[e.clientX-r.left-t.clientLeft,e.clientY-r.top-t.clientTop]}}return[e.pageX,e.pageY]}var Te,Ty,_p,dr,mp,su,Ay,nu,Cy,vp,gp,G3,Pa=Symbol.for("pv"),ou={},au=[],W3=/^m(i|n|o|s|text|space)$/,yp=Array.isArray,xp=au.slice,pr=Object.assign;function Yr(e){e&&e.parentNode&&e.remove()}function bp(e,t,n){var i,r,s,o=pr({},e.props),a=arguments.length;for(s in t)s=="key"?i=t[s]:s=="ref"&&typeof e.type!="function"?r=t[s]:o[s]=t[s];return a>2&&(o.children=a>3?xp.call(arguments,2):n),Ra(e.type,o,i!==void 0?i:e.key,r!==void 0?r:e.ref,null)}function Ra(e,t,n,i,r){var s={type:e,props:t,key:n,ref:i,__k:null,__:null,__b:0,__e:null,__c:null,constructor:Pa,__v:r||++Ty,__i:-1,__u:0};return!r&&Te.vnode&&Te.vnode(s),s}function cu(e){return e.children}function iu(e,t){this.props=e,this.context=t,this.__g=0}function mr(e,t){if(t==null)return e.__&&mr(e.__,e.__i+1);for(var n;t<e.__k.length;t++)if((n=e.__k[t])&&n.__e)return n.__e;return typeof e.type!="function"||e.props.__P?null:mr(e)}function j3(e){var t,n=e.__v,i=n.__e,r=[],s=[],o=e.__P;o&&((t=pr({constructor:Pa},n)).__v=n.__v+1,Te.vnode&&Te.vnode(t),Mp(o,t,n,e.__n,o.namespaceURI,32&n.__u?[i]:null,r,i||mr(n),32&n.__u,s),t.__v=n.__v,t.__.__k[t.__i]=t,Oy(r,t,s),n.__=n.__e=null,t.__e!=i&&Ry(t))}function Ry(e){if((e=e.__)&&e.__c&&!e.props.__P)return e.__e=null,e.__k.some(function(t){return t&&(e.__e=t.__e)}),Ry(e)}function wy(e){(8&e.__g||(e.__g|=8,dr.push(e),su++))&&mp==Te.debounceRendering||((mp=Te.debounceRendering)||queueMicrotask)(Py)}function Py(){try{for(var e,t=1;dr.length;)dr.length>t&&dr.sort(Ay),e=dr.shift(),t=dr.length,8&e.__g&&j3(e)}finally{(su=dr.length)&&(mp||queueMicrotask)(Py)}}function Iy(e,t,n,i,r,s,o,a,c,l,u){var h,d,f,m,_,g,p=i.__k||au,b=t.length;for(c=q3(n,t,p,c,b),h=0;h<b;h++)(f=n.__k[h])!=null&&(d=~f.__i&&p[f.__i]||ou,f.__i=h,g=Mp(e,f,d,r,s,o,a,c,l,u),m=f.__e,(d.ref!=f.ref||8&d.__u)&&(d.ref&&Sp(d.ref,null,f,d),f.ref&&u.push(f.ref,f.__c||m,f)),_=_||m,4&f.__u?(c=Dy(f,c,e,!d.__v),d.__e&&(d.__e=null)):typeof f.type=="function"&&g!==void 0?c=g:m&&(c=m.nextSibling),f.__u&=-21);return n.__e=_,c}function q3(e,t,n,i,r){var s,o,a,c,l,u,h,d,f,m=n.length,_=m,g=0,p=0,b=e.__k=Array(r);for(s=0;s<r;s++)(o=t[s])!=null&&typeof o!="boolean"&&typeof o!="function"?(typeof o!="object"||o.constructor===String?o=b[s]=Ra(null,o):yp(o)?o=b[s]=Ra(cu,{children:o}):o.constructor===Pa&&o.__b?o=b[s]=Ra(o.type,o.props,o.key,o.ref,o.__v):b[s]=o,c=s+g,o.__=e,o.__b=e.__b+1,a=null,~(l=o.__i=X3(o,n,c,_))&&(_--,(a=n[l])&&(a.__u|=2)),a&&a.__v?(o.__u|=16,l==c-1?g--:l==c+1?g++:l!=c&&(l>c?g--:g++,p=1)):(~l||(r>m?g--:r<m&&g++),typeof o.type!="function"&&(o.__u|=4))):b[s]=null;if(p){for(u=[],h=[],s=0;s<r;s++)if((o=b[s])&&16&o.__u){for(g=0,d=u.length;g<d;)u[f=g+d>>1]<o.__i?g=f+1:d=f;u[g]=o.__i,h[s]=g+1}for(g=u.length;s--;)h[s]&&(h[s]==g?g--:b[s].__u|=4)}if(_)for(s=0;s<m;s++)!(a=n[s])||2&a.__u||(a.__e==i&&(i=mr(a)),wp(a,a));return i}function Dy(e,t,n,i){var r,s,o,a;if(typeof e.type=="function"){if(e.props.__P)return t;if(r=e.__k)for(s=0;s<r.length;s++)r[s]&&(r[s].__=e,t=Dy(r[s],t,n,!1));return t}for(t&&!t.parentNode&&(t=mr(e))&&!t.parentNode&&(t=null),o=e.__e,a=t;a&&a.nodeType==8;)a=a.nextSibling;for(o!=a&&(!i&&n.moveBefore&&o.parentNode?n.moveBefore(o,t):n.insertBefore(o,t||null)),t=o;(t=t&&t.nextSibling)&&t.nodeType==8&&!t.data.startsWith("$s"););return t}function X3(e,t,n,i){var r,s=e.key,o=e.type,a=t[n],c=a&&!(2&a.__u);if(a===null&&s==null||c&&s==a.key&&o==a.type)return n;if(i>(c?1:0)){for(r=n-1;r>=0;r--)if((a=t[r])&&!(2&a.__u)&&s==a.key&&o==a.type)return r;for(r=n+1;r<t.length;r++)if((a=t[r])&&!(2&a.__u)&&s==a.key&&o==a.type)return r}return-1}function Ey(e,t,n){n==null&&(n=""),t[0]=="-"?e.setProperty(t,n):e[t]=n}function eu(e,t,n,i,r){var s,o;if(t=="style")if(typeof n=="string")e.style.cssText=n;else{if(typeof i=="string"&&(e.style.cssText=i=""),i)for(t in i)n&&t in n||Ey(e.style,t);if(n)for(t in n)i&&n[t]==i[t]||Ey(e.style,t,n[t])}else if(t[0]=="o"&&t[1]=="n")typeof n!="function"&&(n=null),typeof i!="function"&&(i=null),(e.__e||(e.__e={}))[t]=n,n&&i||(o=gp[t]||(gp[t]=$3(t)),(e.__a||(e.__a={}))[t]=vp,s=t!=(t=t.replace(Cy,"$1")),(t=t.slice(2))[0]<"a"&&(t=t.toLowerCase()),n?e.addEventListener(t,o,s):e.removeEventListener(t,o,s));else{if(r=="http://www.w3.org/2000/svg")t=t.replace(/xlink(H|:h)/,"h").replace(/sName$/,"s");else if(t!="width"&&t!="height"&&t!="href"&&t!="list"&&t!="form"&&t!="tabIndex"&&t!="download"&&t!="rowSpan"&&t!="colSpan"&&t!="role"&&t!="popover"&&t in e)try{return void(e[t]=n==null?"":n)}catch(a){}if(typeof n=="function")return;n==null||n===!1&&t[4]!="-"?e.removeAttribute(t):e.setAttribute(t,t=="popover"&&n==1?"":n)}}function $3(e){return function(t){var n=this.__e;if(n){if(n=n[e],t[nu]==null)t[nu]=vp++;else if(t[nu]<this.__a[e])return;return n(Te.event?Te.event(t):t)}}}function Mp(e,t,n,i,r,s,o,a,c,l){var u,h,d,f,m,_,g,p,b,x,v,M,S,C,P,T,w,R,V=t.type;if(t.constructor!==Pa)return null;128&n.__u&&(c=32&n.__u,u=n.__c.__z)&&(t.__u|=c,h=s=[],u.nodeType==8?a=ru(u,s):s.push(u),a=s[0]||a),(u=Te.__b)&&u(t);t:if(typeof V=="function"){d=o.length;try{if(p=t.props,b=(u=V.prototype)&&u.render,x=(u=V.contextType)&&i[u.__c],v=u?x?x.props.value:u.__:i,(f=n.__c)?(t.__c=f,2&f.__g&&(f.__g|=1)):(b?t.__c=f=new V(p,v):(t.__c=f=new iu(p,v),f.constructor=V,f.render=Z3),x&&x.sub(f),f.state||(f.state={}),f.__n=i,f.__g|=8,f.__h=[],f.__k=[]),b&&(f.__s||(f.__s=f.state),V.getDerivedStateFromProps&&(f.__s==f.state&&(f.__s=pr({},f.__s)),pr(f.__s,V.getDerivedStateFromProps(p,f.__s)))),m=f.props,_=f.state,f.__v=t,n.__c){if(p!==m&&b&&!V.getDerivedStateFromProps&&f.componentWillReceiveProps&&f.componentWillReceiveProps(p,v),t.__v==n.__v&&!(8&f.__g)||!(4&f.__g)&&f.shouldComponentUpdate&&f.shouldComponentUpdate(p,f.__s,v)===!1){t.__v!=n.__v&&(f.props=p,f.state=f.__s,f.__g&=-9),t.__e=n.__e,t.__k=n.__k,t.__k.some(function(N){N&&(N.__=t)}),au.push.apply(f.__h,f.__k),f.__k=[],f.__h.length&&o.push(f),a=mr(n);break t}f.componentWillUpdate&&f.componentWillUpdate(p,f.__s,v),b&&f.componentDidUpdate&&f.__h.push(function(){f.componentDidUpdate(m,_,g)})}else b&&!V.getDerivedStateFromProps&&f.componentWillMount&&f.componentWillMount(),b&&f.componentDidMount&&f.__h.push(f.componentDidMount);f.context=v,f.props=p,f.__P=e,f.__g&=-5,M=Te.__r,S=b?25:0;do f.__g&=-9,M&&M(t),u=f.render(f.props,f.state=f.__s,f.context);while(8&f.__g&&++S<25);b&&(au.push.apply(f.__h,f.__k),f.__k=[]),f.state=f.__s,f.getChildContext&&(i=pr({},i,f.getChildContext())),b&&n.__c&&f.getSnapshotBeforeUpdate&&(g=f.getSnapshotBeforeUpdate(m,_)),C=u&&u.type===cu&&u.key==null?u.props.children:u,p.__P&&(u=a,r=(e=p.__P).namespaceURI,c=s=null,n.props&&n.props.__P!=e&&(n.__k.some(function(N){N&&wp(N,N)}),n.__k=null),a=n.__k?mr(n,0):null),a=Iy(e,yp(C)?C:[C],t,n,i,r,s,o,a,c,l),p.__P&&(t.__e=null,a=u),t.__u&=-161,h&&h.some(Yr),f.__h.length&&o.push(f),1&f.__g&&(f.__g&=-4)}catch(N){if(o.length=d,t.__v=null,c||s)if(N&&N.then){if(t.__u|=128|c,s){for(~(w=s.indexOf(a||void 0))||(w=s.length);(R=s[w-1])&&R.nodeType==8;)w--;for(;w<s.length;w++)if(R=s[w])if(s[w]=null,P){if(R==T)break}else{if(R.nodeType!=8)break;R.data.startsWith("$s")&&(T=ru(P=R))}}if(!P){for(;a&&a.nodeType==8&&a.nextSibling;)a=a.nextSibling;P=a}(u=ru(P=t.__c.__z||(t.__c.__z=P)))?(t.__e=P,a=u):t.__e=a,a=a&&a.nextSibling}else s&&s.some(Yr);else t.__e=n.__e;t.__k||(t.__k=n.__k||[]),N&&N.then||Ly(t),Te.__e(N,t,n)}}else a=t.__e=Y3(n.__e,t,n,i,r,s,o,c,l,e);return(u=Te.diffed)&&u(t),a}function ru(e,t){if(e&&e.nodeType==8&&e.data.startsWith("$s"))for(var n=1;e=e.nextSibling;){if(e.nodeType==8){if(e.data.startsWith("$s"))n++;else if(e.data.startsWith("/$s")&&!--n)return e}t&&t.push(e)}}function Ly(e){e&&(e.__c&&(e.__c.__g|=4),e.__k&&e.__k.some(Ly))}function Oy(e,t,n){for(var i=0;i<n.length;)Sp(n[i++],n[i++],n[i++]);Te.__c&&Te.__c(t,e),e.some(function(r){try{e=r.__h,r.__h=[],e.some(function(s){s.call(r)})}catch(s){Te.__e(s,r.__v)}})}function Y3(e,t,n,i,r,s,o,a,c,l){var u,h,d,f,m,_,g,p,b=n.props||ou,x=t.props,v=t.type;if(v=="svg"?r="http://www.w3.org/2000/svg":v=="math"?r="http://www.w3.org/1998/Math/MathML":r||(r="http://www.w3.org/1999/xhtml"),s){for(u=0;u<s.length;u++)if((m=s[u])&&(v?m.localName==v:m.nodeType==3)){e=m,s[u]=null;break}}if(!e){if(p=l.ownerDocument||document,!v)return p.createTextNode(x);e=p.createElementNS(r,v,x.is?x:l),a&&(Te.__m&&Te.__m(t,s),a=!1),s=null}if(v){if(l=v=="template"&&e.content||e,s=v=="textarea"&&x.defaultValue!=null?null:s&&xp.call(l.childNodes),!a&&s)for(b={},u=0;u<e.attributes.length;u++)b[(m=e.attributes[u]).name]=m.value;for(u in b)m=b[u],u=="dangerouslySetInnerHTML"?d=m:u=="children"||u in x||u=="value"&&"defaultValue"in x||u=="checked"&&"defaultChecked"in x||eu(e,u,null,m,r);for(u in x)m=x[u],u=="children"?f=m:u=="dangerouslySetInnerHTML"?h=m:u=="value"?_=m:u=="checked"?g=m:a&&typeof m!="function"||b[u]===m||eu(e,u,m,b[u],r);h?(a||d&&(h.__html==d.__html||h.__html==e.innerHTML)||(e.innerHTML=h.__html),t.__k=[]):(d&&(e.textContent=""),(v=="foreignObject"||r=="http://www.w3.org/1998/Math/MathML"&&W3.test(v))&&(r="http://www.w3.org/1999/xhtml"),Iy(l,yp(f)?f:[f],t,n,i,r,s,o,s?s[0]:n.__k&&mr(n,0),a,c),s&&s.some(Yr)),a&&v!="textarea"||(u="value",v=="progress"&&_==null?e.removeAttribute(u):_==null||_===e[u]&&(v!="progress"||_)||eu(e,u,_,b[u],r),u="checked",g!=null&&g!=e[u]&&eu(e,u,g,b[u],r))}else b===x||a&&e.data==x||(e.data=x);return e}function Sp(e,t,n,i){try{typeof e=="function"?t?t.__x=e(t)||1:i&&(i=i.__c||i.__e)&&(t=i.__x)&&(i.__x=null,typeof t=="function"?t():e(null)):e.current=t}catch(r){Te.__e(r,n)}}function wp(e,t,n){var i,r,s,o;if(Te.unmount&&Te.unmount(e),!(i=e.ref)||i.current&&i.current!=e.__e||Sp(i,null,t,e),i=e.__c){if(i.componentWillUnmount)try{i.componentWillUnmount()}catch(a){Te.__e(a,t)}i.__P=i.__n=null}if(i=e.__k)for(o=0;o<i.length;o++)i[o]&&wp(i[o],t,typeof e.type!="function"||n&&!e.props.__P);!n&&(i=e.__c)&&(i=i.__z)&&(r=ru(i,s=[]))&&(i==e.__e&&s.some(Yr),Yr(r),Yr(i)),n||Yr(e.__e),e.__e=e.__c=e.__=null}function Z3(e,t,n){return this.constructor(e,n)}function Ny(e,t){var n,i,r,s;Te.__&&Te.__(e,t),t.nodeType==9&&(t=t.documentElement),i=(n=e&&32&e.__u)?null:t.__k,t.__k=Ra(cu,{children:[e]}),r=[],s=[],Mp(t,t.__k,i||ou,ou,t.namespaceURI,i?null:t.firstChild?xp.call(t.childNodes):null,r,i?i.__e:t.firstChild,n,s),Oy(r,t.__k,s),t.__k.props.children=null}Te={__e:function(e,t,n,i){for(var r,s,o;t=t.__;)if((r=t.__c)&&!(1&r.__g)){r.__g|=4;try{if((o=(s=r.constructor)&&s.getDerivedStateFromError)&&r.setState(s.getDerivedStateFromError(e)),r.componentDidCatch&&(r.componentDidCatch(e,i||{}),o=1),o&&8&r.__g)return void(r.__g|=2)}catch(a){e=a}}throw su=0,e}},Ty=0,_p=function(e){return e!=null&&e.constructor===Pa},iu.prototype.setState=function(e,t){var n=this.__s;n&&n!=this.state||(n=this.__s=pr({},this.state)),typeof e=="function"&&(e=e(pr({},n),this.props)),e&&(pr(n,e),this.__v&&(t&&this.__k.push(t),wy(this)))},iu.prototype.forceUpdate=function(e){this.__v&&(this.__g|=4,e&&this.__h.push(e),wy(this))},iu.prototype.render=cu,dr=[],su=0,Ay=function(e,t){return e.__v.__b-t.__v.__b},nu=Symbol(),Cy=/(PointerCapture)$|Capture$/i,vp=0,gp={},G3=0;var Ep=e=>{var n;if(typeof e!="object")return e;let t=bp(e);return t.props&&(t.props=qe({},t.props),(n=t==null?void 0:t.props)!=null&&n.children&&(t.props.children=Array.isArray(t.props.children)?t.props.children.map(Ep):Ep(t.props.children))),t},K3=e=>_p(bp(e)),J3=(e,t)=>{delete t.__k,Ny(Ep(e),t)};var Fy=rr({props:{content:{default:!1},offsetX:{triggerUpdate:!1},offsetY:{triggerUpdate:!1}},methods:{positionFromEvent(e,t){let n=e.container,i=Sy(t,n),r=n.offsetWidth,s=n.offsetHeight,o=[e.offsetX===null||e.offsetX===void 0?`-${i[0]/r*100}%`:typeof e.offsetX=="number"?`calc(-50% + ${e.offsetX}px)`:e.offsetX,e.offsetY===null||e.offsetY===void 0?s>130&&s-i[1]<100?"calc(-100% - 6px)":"21px":typeof e.offsetY=="number"?e.offsetY<0?`calc(-100% - ${Math.abs(e.offsetY)}px)`:`${e.offsetY}px`:e.offsetY];return e.tooltipEl.style("left",i[0]+"px").style("top",i[1]+"px").style("transform",`translate(${o.join(",")})`),this}},init:function(e,t,{style:n={}}={}){let i=!!e&&typeof e=="object"&&!!e.node&&typeof e.node=="function",r=My(i?e.node():e);t.container=r.node(),r.style("position")==="static"&&r.style("position","relative"),t.tooltipEl=r.append("div").attr("class","float-tooltip-kap"),Object.entries(n).forEach(([o,a])=>t.tooltipEl.style(o,a)),t.tooltipEl.style("left","-10000px").style("display","none");let s=`tooltip-${Math.round(Math.random()*1e12)}`;t.mouseInside=!1,r.on(`mousemove.${s}`,o=>{t.mouseInside=!0,this.positionFromEvent(o),t.content&&t.tooltipEl.style("display","inline")}),r.on(`mouseover.${s}`,()=>{t.mouseInside=!0,t.content&&t.tooltipEl.style("display","inline")}),r.on(`mouseout.${s}`,()=>{t.mouseInside=!1,t.tooltipEl.style("display","none")})},update:function(e){e.tooltipEl.style("display",e.content&&e.mouseInside?"inline":"none"),e.content?e.content instanceof HTMLElement?(e.tooltipEl.text(""),e.tooltipEl.append(()=>e.content)):typeof e.content=="string"?e.tooltipEl.html(e.content):K3(e.content)?(e.tooltipEl.text(""),J3(e.content,e.tooltipEl.node())):(e.tooltipEl.style("display","none"),console.warn("Tooltip content is invalid, skipping.",e.content,e.content.toString())):e.tooltipEl.text("")}});var Uy=e=>{e instanceof Array?e.forEach(Uy):(e.map&&e.map.dispose(),e.dispose())},zy=e=>{e.geometry&&e.geometry.dispose(),e.material&&Uy(e.material),e.texture&&e.texture.dispose(),e.children&&e.children.forEach(zy)},Q3=e=>{for(;e.children.length;){let t=e.children[0];e.remove(t),zy(t)}},re=window.THREE?window.THREE:{WebGLRenderer:oh,Scene:No,PerspectiveCamera:Ge,Raycaster:Li,SRGBColorSpace:He,TextureLoader:Yo,Vector2:it,Vector3:I,Box3:pn,Color:Ot,Mesh:we,SphereGeometry:Di,MeshBasicMaterial:Mn,BackSide:We,Timer:Qo},Tp=rr({props:{width:{default:window.innerWidth,onChange(e,t,n){isNaN(e)&&(t.width=n)}},height:{default:window.innerHeight,onChange(e,t,n){isNaN(e)&&(t.height=n)}},viewOffset:{default:[0,0]},backgroundColor:{default:"#000011"},backgroundImageUrl:{},onBackgroundImageLoaded:{},showNavInfo:{default:!0},skyRadius:{default:5e4},objects:{default:[]},lights:{default:[]},enablePointerInteraction:{default:!0,onChange(e,t){t.hoverObj=null,t.tooltip&&t.tooltip.content(null)},triggerUpdate:!1},pointerRaycasterThrottleMs:{default:50,triggerUpdate:!1},lineHoverPrecision:{default:1,triggerUpdate:!1},pointsHoverPrecision:{default:1,triggerUpdate:!1},hoverOrderComparator:{triggerUpdate:!1},hoverFilter:{default:()=>!0,triggerUpdate:!1},tooltipContent:{triggerUpdate:!1},hoverDuringDrag:{default:!1,triggerUpdate:!1},clickAfterDrag:{default:!1,triggerUpdate:!1},onHover:{default:()=>{},triggerUpdate:!1},onClick:{default:()=>{},triggerUpdate:!1},onRightClick:{triggerUpdate:!1}},methods:{tick:function(e){var t,n;if(e.initialised){e.controls.enabled&&((n=(t=e.controls).update)==null||n.call(t,Math.min(1,e.timer.update().getDelta()))),e.postProcessingComposer?e.postProcessingComposer.render():e.renderer.render(e.scene,e.camera),e.extraRenderers.forEach(r=>r.render(e.scene,e.camera));let i=+new Date;if(e.enablePointerInteraction&&i-e.lastRaycasterCheck>=e.pointerRaycasterThrottleMs){e.lastRaycasterCheck=i;let r=null;if(e.hoverDuringDrag||!e.isPointerDragging){let s=this.intersectingObjects(e.pointerPos.x,e.pointerPos.y);e.hoverOrderComparator&&s.sort((a,c)=>e.hoverOrderComparator(a.object,c.object,a,c));let o=s.find(a=>e.hoverFilter(a.object))||null;r=o?o.object:null,e.intersection=o||null}r!==e.hoverObj&&(e.onHover(r,e.hoverObj,e.intersection),e.tooltip.content(r&&Zt(e.tooltipContent)(r,e.intersection)||null),e.hoverObj=r)}e.tweenGroup.update()}return this},getPointerPos:function(e){let{x:t,y:n}=e.pointerPos;return{x:t,y:n}},cameraPosition:function(e,t,n,i){var c,l;let r=e.camera;if(t&&e.initialised){let u=t,h=n||{x:0,y:0,z:0};if((c=e.povPosTween)==null||c.end(),(l=e.povTgtTween)==null||l.end(),!i)s(u),o(h);else{let d=Object.assign({},r.position),f=a();e.tweenGroup.add(e.povPosTween=new up(d).to(u,i).easing(fr.Quadratic.Out).onUpdate(s).onComplete(function(){e.povPosTween=void 0,e.tweenGroup.remove(this)}).start()),e.tweenGroup.add(e.povTgtTween=new up(f).to(h,i/3).easing(fr.Quadratic.Out).onUpdate(o).onComplete(function(){e.povTgtTween=void 0,e.tweenGroup.remove(this)}).start())}return this}return Object.assign({},r.position,{lookAt:a()});function s(u){let{x:h,y:d,z:f}=u;h!==void 0&&(r.position.x=h),d!==void 0&&(r.position.y=d),f!==void 0&&(r.position.z=f)}function o(u){let h=new re.Vector3(u.x,u.y,u.z);e.controls.enabled&&e.controls.target?e.controls.target=h:r.lookAt(h)}function a(){return Object.assign(new re.Vector3(0,0,-1e3).applyQuaternion(r.quaternion).add(r.position))}},zoomToFit:function(e,t=0,n=10,i,r){return this.fitToBbox(this.getBbox(i),t,n,r)},fitToBbox:function(e,t,n=0,i=10,r=!1){let s=e.camera;if(t){s.updateMatrixWorld();let o=new re.Vector3,a=new re.Vector3,c=new re.Vector3,l=new re.Vector3;s.getWorldPosition(l),s.getWorldDirection(c),o.crossVectors(c,s.up).normalize(),a.crossVectors(o,c).normalize();let h=(1-i*2/e.height)*s.fov/2*(Math.PI/180),d=Math.atan(Math.tan(h)*s.aspect),f=new re.Vector3((t.x[0]+t.x[1])/2,(t.y[0]+t.y[1])/2,(t.z[0]+t.z[1])/2),m=r?c.clone().multiplyScalar(l.distanceTo(f)).add(l):f,_=Math.max(0,...[new re.Vector3(t.x[0],t.y[0],t.z[0]),new re.Vector3(t.x[0],t.y[0],t.z[1]),new re.Vector3(t.x[0],t.y[1],t.z[0]),new re.Vector3(t.x[0],t.y[1],t.z[1]),new re.Vector3(t.x[1],t.y[0],t.z[0]),new re.Vector3(t.x[1],t.y[0],t.z[1]),new re.Vector3(t.x[1],t.y[1],t.z[0]),new re.Vector3(t.x[1],t.y[1],t.z[1])].map(b=>{let x=b.clone().sub(m);return Math.max(Math.abs(x.dot(a))/Math.tan(h),Math.abs(x.dot(o))/Math.tan(d))-x.dot(c)})),g=c.clone().negate(),p={x:m.x+g.x*_,y:m.y+g.y*_,z:m.z+g.z*_};this.cameraPosition(p,m,n)}return this},getBbox:function(e,t=()=>!0){let n=new re.Box3,i=e.objects.filter(t);return i.length?(i.forEach(r=>n.expandByObject(r)),Object.assign(...["x","y","z"].map(r=>({[r]:[n.min[r],n.max[r]]})))):null},getScreenCoords:function(e,t,n,i){let r=new re.Vector3(t,n,i);return r.project(this.camera()),{x:(r.x+1)*e.width/2,y:-(r.y-1)*e.height/2}},getSceneCoords:function(e,t,n,i=0){let r=new re.Vector2(t/e.width*2-1,-(n/e.height)*2+1),s=new re.Raycaster;return s.setFromCamera(r,e.camera),Object.assign({},s.ray.at(i,new re.Vector3))},intersectingObjects:function(e,t,n){let i=new re.Vector2(t/e.width*2-1,-(n/e.height)*2+1),r=new re.Raycaster;return r.params.Line.threshold=e.lineHoverPrecision,r.params.Points.threshold=e.pointsHoverPrecision,r.setFromCamera(i,e.camera),r.intersectObjects(e.objects,!0)},renderer:e=>e.renderer,scene:e=>e.scene,camera:e=>e.camera,postProcessingComposer:e=>e.postProcessingComposer,controls:e=>e.controls,_destructor:function(e){var t,n,i;Q3(e.scene),(t=e.controls)==null||t.dispose(),(n=e.renderer)==null||n.dispose(),(i=e.postProcessingComposer)==null||i.dispose()}},stateInit:()=>({scene:new re.Scene,camera:new re.PerspectiveCamera,timer:new re.Timer,tweenGroup:new hp,lastRaycasterCheck:0}),init(e,t,{controlType:n="trackball",useWebGPU:i=!1,rendererConfig:r={},extraRenderers:s=[],waitForLoadComplete:o=!0}={}){e.innerHTML="",e.appendChild(t.container=document.createElement("div")),t.container.className="scene-container",t.container.style.position="relative",t.container.appendChild(t.navInfo=document.createElement("div")),t.navInfo.className="scene-nav-info",t.navInfo.textContent={orbit:"Left-click: rotate, Mouse-wheel/middle-click: zoom, Right-click: pan",trackball:"Left-click: rotate, Mouse-wheel/middle-click: zoom, Right-click: pan",arcball:"Left-click: rotate, Mouse-wheel/middle-click: zoom, Right-click: pan",fly:"WASD: move, R|F: up | down, Q|E: roll, up|down: pitch, left|right: yaw"}[n]||"",t.navInfo.style.display=t.showNavInfo?null:"none",t.tooltip=new Fy(t.container),t.pointerPos=new re.Vector2,t.pointerPos.x=-2,t.pointerPos.y=-2,["pointermove","pointerdown"].forEach(a=>t.container.addEventListener(a,c=>{if(a==="pointerdown"&&(t.isPointerPressed=!0),!t.isPointerDragging&&c.type==="pointermove"&&(c.pressure>0||t.isPointerPressed)&&(c.pointerType==="mouse"||c.movementX===void 0||[c.movementX,c.movementY].some(u=>Math.abs(u)>1))&&(t.isPointerDragging=!0),t.enablePointerInteraction){let u=l(t.container);t.pointerPos.x=c.pageX-u.left,t.pointerPos.y=c.pageY-u.top}function l(u){let h=u.getBoundingClientRect(),d=window.pageXOffset||document.documentElement.scrollLeft,f=window.pageYOffset||document.documentElement.scrollTop;return{top:h.top+f,left:h.left+d}}},{passive:!0})),t.container.addEventListener("pointerup",a=>{t.isPointerPressed&&(t.isPointerPressed=!1,!(t.isPointerDragging&&(t.isPointerDragging=!1,!t.clickAfterDrag))&&requestAnimationFrame(()=>{a.button===0&&t.onClick(t.hoverObj||null,a,t.intersection),a.button===2&&t.onRightClick&&t.onRightClick(t.hoverObj||null,a,t.intersection)}))},{passive:!0,capture:!0}),t.container.addEventListener("contextmenu",a=>{t.onRightClick&&a.preventDefault()}),t.renderer=new(i?Nh:re.WebGLRenderer)(Object.assign({antialias:!0,alpha:!0},r)),t.renderer.setPixelRatio(Math.min(2,window.devicePixelRatio)),t.container.appendChild(t.renderer.domElement),t.extraRenderers=s,t.extraRenderers.forEach(a=>{a.domElement.style.position="absolute",a.domElement.style.top="0px",a.domElement.style.pointerEvents="none",t.container.appendChild(a.domElement)}),t.postProcessingComposer=new $h(t.renderer),t.postProcessingComposer.addPass(new Yh(t.scene,t.camera)),t.controls=new(tI(n)?n:{trackball:Bh,arcball:Hh,orbit:Wh,fly:jh}[n])(t.camera,t.renderer.domElement),n==="fly"&&(t.controls.movementSpeed=300,t.controls.rollSpeed=Math.PI/6,t.controls.dragToLook=!0),(n==="trackball"||n==="arcball"||n==="orbit")&&(t.controls.minDistance=.1,t.controls.maxDistance=t.skyRadius,t.controls.addEventListener("start",()=>{t.controlsEngaged=!0}),t.controls.addEventListener("change",()=>{t.controlsEngaged&&(t.controlsDragging=!0)}),t.controls.addEventListener("end",()=>{t.controlsEngaged=!1,t.controlsDragging=!1}),t.renderer.domElement.style.cursor=null),[t.renderer,t.postProcessingComposer,...t.extraRenderers].forEach(a=>a.setSize(t.width,t.height)),t.camera.aspect=t.width/t.height,t.camera.updateProjectionMatrix(),t.camera.position.z=1e3,t.scene.add(t.skysphere=new re.Mesh),t.skysphere.visible=!1,t.loadComplete=t.scene.visible=!o},update(e,t){if(e.width&&e.height&&(t.hasOwnProperty("width")||t.hasOwnProperty("height"))){let i=e.width,r=e.height;e.container.style.width=`${i}px`,e.container.style.height=`${r}px`,[e.renderer,e.postProcessingComposer,...e.extraRenderers].forEach(o=>o.setSize(i,r)),e.camera.aspect=i/r;let s=e.viewOffset.slice(0,2);s.some(o=>o)&&e.camera.setViewOffset(i,r,...s,i,r),e.camera.updateProjectionMatrix()}if(t.hasOwnProperty("viewOffset")){let i=e.width,r=e.height,s=e.viewOffset.slice(0,2);s.some(o=>o)?e.camera.setViewOffset(i,r,...s,i,r):e.camera.clearViewOffset()}if(t.hasOwnProperty("skyRadius")&&e.skyRadius&&(e.controls.hasOwnProperty("maxDistance")&&t.skyRadius&&(e.controls.maxDistance=Math.min(e.controls.maxDistance,e.skyRadius)),e.camera.far=e.skyRadius*2.5,e.camera.updateProjectionMatrix(),e.skysphere.geometry=new re.SphereGeometry(e.skyRadius)),t.hasOwnProperty("backgroundColor")){let i=lr(e.backgroundColor).alpha;i===void 0&&(i=1),e.renderer.setClearColor(new re.Color(ay(1,e.backgroundColor)),i)}t.hasOwnProperty("backgroundImageUrl")&&(e.backgroundImageUrl?new re.TextureLoader().load(e.backgroundImageUrl,i=>{i.colorSpace=re.SRGBColorSpace,e.skysphere.material=new re.MeshBasicMaterial({map:i,side:re.BackSide}),e.skysphere.visible=!0,e.onBackgroundImageLoaded&&setTimeout(e.onBackgroundImageLoaded),!e.loadComplete&&n()}):(e.skysphere.visible=!1,e.skysphere.material.map=null,!e.loadComplete&&n())),t.hasOwnProperty("showNavInfo")&&(e.navInfo.style.display=e.showNavInfo?null:"none"),t.hasOwnProperty("lights")&&((t.lights||[]).forEach(i=>e.scene.remove(i)),e.lights.forEach(i=>e.scene.add(i))),t.hasOwnProperty("objects")&&((t.objects||[]).forEach(i=>e.scene.remove(i)),e.objects.forEach(i=>e.scene.add(i)));function n(){e.loadComplete=e.scene.visible=!0}}});function tI(e){return typeof e=="function"&&Function.prototype.toString.call(e).startsWith("class")}function Cp(e,t){(t==null||t>e.length)&&(t=e.length);for(var n=0,i=Array(t);n<t;n++)i[n]=e[n];return i}function eI(e){if(Array.isArray(e))return Cp(e)}function Ia(e,t,n){return(t=sI(t))in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function nI(e){if(typeof Symbol!="undefined"&&e[Symbol.iterator]!=null||e["@@iterator"]!=null)return Array.from(e)}function iI(){throw new TypeError(`Invalid attempt to spread non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}function ky(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(e);t&&(i=i.filter(function(r){return Object.getOwnPropertyDescriptor(e,r).enumerable})),n.push.apply(n,i)}return n}function lu(e){for(var t=1;t<arguments.length;t++){var n=arguments[t]!=null?arguments[t]:{};t%2?ky(Object(n),!0).forEach(function(i){Ia(e,i,n[i])}):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):ky(Object(n)).forEach(function(i){Object.defineProperty(e,i,Object.getOwnPropertyDescriptor(n,i))})}return e}function uu(e){return eI(e)||nI(e)||oI(e)||iI()}function rI(e,t){if(typeof e!="object"||!e)return e;var n=e[Symbol.toPrimitive];if(n!==void 0){var i=n.call(e,t);if(typeof i!="object")return i;throw new TypeError("@@toPrimitive must return a primitive value.")}return(t==="string"?String:Number)(e)}function sI(e){var t=rI(e,"string");return typeof t=="symbol"?t:t+""}function oI(e,t){if(e){if(typeof e=="string")return Cp(e,t);var n={}.toString.call(e).slice(8,-1);return n==="Object"&&e.constructor&&(n=e.constructor.name),n==="Map"||n==="Set"?Array.from(e):n==="Arguments"||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)?Cp(e,t):void 0}}function By(e,t){var n=new t;return n._destructor&&n._destructor(),{linkProp:function(r){return{default:n[r](),onChange:function(o,a){a[e][r](o)},triggerUpdate:!1}},linkMethod:function(r){return function(s){for(var o=s[e],a=arguments.length,c=new Array(a>1?a-1:0),l=1;l<a;l++)c[l-1]=arguments[l];var u=o[r].apply(o,c);return u===o?this:u}}}}var Ap=window.THREE?window.THREE:{AmbientLight:Ir,DirectionalLight:Ko,REVISION:"180"},aI=170,Vy=By("forceGraph",$d),cI=Object.assign.apply(Object,uu(["jsonUrl","graphData","numDimensions","dagMode","dagLevelDistance","dagNodeFilter","onDagError","nodeRelSize","nodeId","nodeVal","nodeResolution","nodeColor","nodeAutoColorBy","nodeOpacity","nodeVisibility","nodeThreeObject","nodeThreeObjectExtend","nodePositionUpdate","linkSource","linkTarget","linkVisibility","linkColor","linkAutoColorBy","linkOpacity","linkWidth","linkResolution","linkCurvature","linkCurveRotation","linkMaterial","linkThreeObject","linkThreeObjectExtend","linkPositionUpdate","linkDirectionalArrowLength","linkDirectionalArrowColor","linkDirectionalArrowRelPos","linkDirectionalArrowResolution","linkDirectionalParticles","linkDirectionalParticleSpeed","linkDirectionalParticleOffset","linkDirectionalParticleWidth","linkDirectionalParticleColor","linkDirectionalParticleResolution","linkDirectionalParticleThreeObject","forceEngine","d3AlphaDecay","d3VelocityDecay","d3AlphaMin","ngraphPhysics","warmupTicks","cooldownTicks","cooldownTime","onEngineTick","onEngineStop"].map(function(e){return Ia({},e,Vy.linkProp(e))}))),lI=Object.assign.apply(Object,uu(["refresh","getGraphBbox","d3Force","d3ReheatSimulation","emitParticle"].map(function(e){return Ia({},e,Vy.linkMethod(e))}))),hu=By("renderObjs",Tp),hI=Object.assign.apply(Object,uu(["width","height","backgroundColor","showNavInfo","enablePointerInteraction"].map(function(e){return Ia({},e,hu.linkProp(e))}))),uI=Object.assign.apply(Object,uu(["lights","cameraPosition","postProcessingComposer"].map(function(e){return Ia({},e,hu.linkMethod(e))})).concat([{graph2ScreenCoords:hu.linkMethod("getScreenCoords"),screen2GraphCoords:hu.linkMethod("getSceneCoords")}])),Hy=rr({props:lu(lu({nodeLabel:{default:"name",triggerUpdate:!1},linkLabel:{default:"name",triggerUpdate:!1},linkHoverPrecision:{default:1,onChange:function(t,n){return n.renderObjs.lineHoverPrecision(t)},triggerUpdate:!1},enableNavigationControls:{default:!0,onChange:function(t,n){var i=n.renderObjs.controls();i&&(i.enabled=t,t&&i.domElement&&i.domElement.dispatchEvent(new PointerEvent("pointerup")))},triggerUpdate:!1},enableNodeDrag:{default:!0,triggerUpdate:!1},onNodeDrag:{default:function(){},triggerUpdate:!1},onNodeDragEnd:{default:function(){},triggerUpdate:!1},onNodeClick:{triggerUpdate:!1},onNodeRightClick:{triggerUpdate:!1},onNodeHover:{triggerUpdate:!1},onLinkClick:{triggerUpdate:!1},onLinkRightClick:{triggerUpdate:!1},onLinkHover:{triggerUpdate:!1},onBackgroundClick:{triggerUpdate:!1},onBackgroundRightClick:{triggerUpdate:!1},showPointerCursor:{default:!0,triggerUpdate:!1}},cI),hI),methods:lu(lu({zoomToFit:function(t,n,i){for(var r,s=arguments.length,o=new Array(s>3?s-3:0),a=3;a<s;a++)o[a-3]=arguments[a];return t.renderObjs.fitToBbox((r=t.forceGraph).getGraphBbox.apply(r,o),n,i),this},pauseAnimation:function(t){return t.animationFrameRequestId!==null&&(cancelAnimationFrame(t.animationFrameRequestId),t.animationFrameRequestId=null),this},resumeAnimation:function(t){return t.animationFrameRequestId===null&&this._animationCycle(),this},_animationCycle:function(t){t.enablePointerInteraction&&(this.renderer().domElement.style.cursor=null),t.forceGraph.tickFrame(),t.renderObjs.tick(),t.animationFrameRequestId=requestAnimationFrame(this._animationCycle)},scene:function(t){return t.renderObjs.scene()},camera:function(t){return t.renderObjs.camera()},renderer:function(t){return t.renderObjs.renderer()},controls:function(t){return t.renderObjs.controls()},tbControls:function(t){return t.renderObjs.tbControls()},_destructor:function(){this.pauseAnimation(),this.graphData({nodes:[],links:[]})}},lI),uI),stateInit:function(t){var n=t.controlType,i=t.rendererConfig,r=t.extraRenderers,s=new $d;return{forceGraph:s,renderObjs:Tp({controlType:n,rendererConfig:i,extraRenderers:r}).objects([s]).lights([new Ap.AmbientLight(13421772,Math.PI),new Ap.DirectionalLight(16777215,.6*Math.PI)])}},init:function(t,n){t.innerHTML="",t.appendChild(n.container=document.createElement("div")),n.container.style.position="relative";var i=document.createElement("div");n.container.appendChild(i),n.renderObjs(i);var r=n.renderObjs.camera(),s=n.renderObjs.renderer(),o=n.renderObjs.controls();o.enabled=!!n.enableNavigationControls,n.lastSetCameraZ=r.position.z;var a;n.container.appendChild(a=document.createElement("div")),a.className="graph-info-msg",a.textContent="",n.forceGraph.onLoading(function(){a.textContent="Loading..."}).onFinishLoading(function(){a.textContent=""}).onUpdate(function(){n.graphData=n.forceGraph.graphData(),r.position.x===0&&r.position.y===0&&r.position.z===n.lastSetCameraZ&&n.graphData.nodes.length&&(r.lookAt(n.forceGraph.position),n.lastSetCameraZ=r.position.z=Math.cbrt(n.graphData.nodes.length)*aI)}).onFinishUpdate(function(){if(n._dragControls){var c=n.graphData.nodes.find(function(u){return u.__initialFixedPos&&!u.__disposeControlsAfterDrag});c?c.__disposeControlsAfterDrag=!0:n._dragControls.dispose(),n._dragControls=void 0}if(n.enableNodeDrag&&n.enablePointerInteraction&&n.forceEngine==="d3"){var l=n._dragControls=new hh(n.graphData.nodes.map(function(u){return u.__threeObj}).filter(function(u){return u}),r,s.domElement);l.addEventListener("dragstart",function(u){var h=Vi(u.object);if(h){o.enabled=!1,u.object.__initialPos=u.object.position.clone(),u.object.__prevPos=u.object.position.clone();var d=h.__data;!d.__initialFixedPos&&(d.__initialFixedPos={fx:d.fx,fy:d.fy,fz:d.fz}),!d.__initialPos&&(d.__initialPos={x:d.x,y:d.y,z:d.z}),["x","y","z"].forEach(function(f){return d["f".concat(f)]=d[f]}),s.domElement.classList.add("grabbable")}}),l.addEventListener("drag",function(u){var h=Vi(u.object);if(h){if(!u.object.hasOwnProperty("__graphObjType")){var d=u.object.__initialPos,f=u.object.__prevPos,m=u.object.position;h.position.add(m.clone().sub(f)),f.copy(m),m.copy(d)}var _=h.__data,g=h.position,p={x:g.x-_.x,y:g.y-_.y,z:g.z-_.z};["x","y","z"].forEach(function(b){return _["f".concat(b)]=_[b]=g[b]}),n.forceGraph.d3AlphaTarget(.3).resetCountdown(),_.__dragged=!0,n.onNodeDrag(_,p)}}),l.addEventListener("dragend",function(u){var h=Vi(u.object);if(h){delete u.object.__initialPos,delete u.object.__prevPos;var d=h.__data;d.__disposeControlsAfterDrag&&(l.dispose(),delete d.__disposeControlsAfterDrag);var f=d.__initialFixedPos,m=d.__initialPos,_={x:m.x-d.x,y:m.y-d.y,z:m.z-d.z};if(f&&(["x","y","z"].forEach(function(p){var b="f".concat(p);f[b]===void 0&&delete d[b]}),delete d.__initialFixedPos,delete d.__initialPos,d.__dragged&&(delete d.__dragged,n.onNodeDragEnd(d,_))),n.forceGraph.d3AlphaTarget(0).resetCountdown(),n.enableNavigationControls){var g;o.enabled=!0,o._status&&((g=o._onPointerCancel)===null||g===void 0||g.call(o)),o.domElement&&o.domElement.ownerDocument&&o.domElement.ownerDocument.dispatchEvent(new PointerEvent("pointerup",{pointerType:"touch"}))}s.domElement.classList.remove("grabbable")}})}}),Ap.REVISION<155&&(n.renderObjs.renderer().useLegacyLights=!1),n.renderObjs.hoverOrderComparator(function(c,l){var u=Vi(c);if(!u)return 1;var h=Vi(l);if(!h)return-1;var d=function(m){return m.__graphObjType==="node"};return d(h)-d(u)}).tooltipContent(function(c){var l=Vi(c);return l&&Zt(n["".concat(l.__graphObjType,"Label")])(l.__data)||""}).hoverDuringDrag(!1).onHover(function(c){var l=Vi(c);if(l!==n.hoverObj){var u=n.hoverObj?n.hoverObj.__graphObjType:null,h=n.hoverObj?n.hoverObj.__data:null,d=l?l.__graphObjType:null,f=l?l.__data:null;if(u&&u!==d){var m=n["on".concat(u==="node"?"Node":"Link","Hover")];m&&m(null,h)}if(d){var _=n["on".concat(d==="node"?"Node":"Link","Hover")];_&&_(f,u===d?h:null)}s.domElement.classList[(l&&n["on".concat(d==="node"?"Node":"Link","Click")]||!l&&n.onBackgroundClick)&&Zt(n.showPointerCursor)(f)?"add":"remove"]("clickable"),n.hoverObj=l}}).clickAfterDrag(!1).onClick(function(c,l){var u=Vi(c);if(u){var h=n["on".concat(u.__graphObjType==="node"?"Node":"Link","Click")];h&&h(u.__data,l)}else n.onBackgroundClick&&n.onBackgroundClick(l)}).onRightClick(function(c,l){var u=Vi(c);if(u){var h=n["on".concat(u.__graphObjType==="node"?"Node":"Link","RightClick")];h&&h(u.__data,l)}else n.onBackgroundRightClick&&n.onBackgroundRightClick(l)}),this._animationCycle()}});function Vi(e){for(var t=e;t&&!t.hasOwnProperty("__graphObjType");)t=t.parent;return t}var Gy={name:"LuminosityHighPassShader",uniforms:{tDiffuse:{value:null},luminosityThreshold:{value:1},smoothWidth:{value:1},defaultColor:{value:new Ot(0)},defaultOpacity:{value:0}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform sampler2D tDiffuse;
		uniform vec3 defaultColor;
		uniform float defaultOpacity;
		uniform float luminosityThreshold;
		uniform float smoothWidth;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );

			float v = luminance( texel.xyz );

			vec4 outputColor = vec4( defaultColor.rgb, defaultOpacity );

			float alpha = smoothstep( luminosityThreshold, luminosityThreshold + smoothWidth, v );

			gl_FragColor = mix( outputColor, texel, alpha );

		}`};var ro=class e extends An{constructor(t,n=1,i,r){super(),this.strength=n,this.radius=i,this.threshold=r,this.resolution=t!==void 0?new it(t.x,t.y):new it(256,256),this.clearColor=new Ot(0,0,0),this.needsSwap=!1,this.renderTargetsHorizontal=[],this.renderTargetsVertical=[],this.nMips=5;let s=Math.round(this.resolution.x/2),o=Math.round(this.resolution.y/2);this.renderTargetBright=new Ke(s,o,{type:zn}),this.renderTargetBright.texture.name="UnrealBloomPass.bright",this.renderTargetBright.texture.generateMipmaps=!1;for(let u=0;u<this.nMips;u++){let h=new Ke(s,o,{type:zn});h.texture.name="UnrealBloomPass.h"+u,h.texture.generateMipmaps=!1,this.renderTargetsHorizontal.push(h);let d=new Ke(s,o,{type:zn});d.texture.name="UnrealBloomPass.v"+u,d.texture.generateMipmaps=!1,this.renderTargetsVertical.push(d),s=Math.round(s/2),o=Math.round(o/2)}let a=Gy;this.highPassUniforms=Fi.clone(a.uniforms),this.highPassUniforms.luminosityThreshold.value=r,this.highPassUniforms.smoothWidth.value=.01,this.materialHighPassFilter=new Le({uniforms:this.highPassUniforms,vertexShader:a.vertexShader,fragmentShader:a.fragmentShader}),this.separableBlurMaterials=[];let c=[3,5,7,9,11];s=Math.round(this.resolution.x/2),o=Math.round(this.resolution.y/2);for(let u=0;u<this.nMips;u++)this.separableBlurMaterials.push(this._getSeparableBlurMaterial(c[u])),this.separableBlurMaterials[u].uniforms.invSize.value=new it(1/s,1/o),s=Math.round(s/2),o=Math.round(o/2);this.compositeMaterial=this._getCompositeMaterial(this.nMips),this.compositeMaterial.uniforms.blurTexture1.value=this.renderTargetsVertical[0].texture,this.compositeMaterial.uniforms.blurTexture2.value=this.renderTargetsVertical[1].texture,this.compositeMaterial.uniforms.blurTexture3.value=this.renderTargetsVertical[2].texture,this.compositeMaterial.uniforms.blurTexture4.value=this.renderTargetsVertical[3].texture,this.compositeMaterial.uniforms.blurTexture5.value=this.renderTargetsVertical[4].texture,this.compositeMaterial.uniforms.bloomStrength.value=n,this.compositeMaterial.uniforms.bloomRadius.value=.1;let l=[1,.8,.6,.4,.2];this.compositeMaterial.uniforms.bloomFactors.value=l,this.bloomTintColors=[new I(1,1,1),new I(1,1,1),new I(1,1,1),new I(1,1,1),new I(1,1,1)],this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,this.copyUniforms=Fi.clone(eo.uniforms),this.blendMaterial=new Le({uniforms:this.copyUniforms,vertexShader:eo.vertexShader,fragmentShader:eo.fragmentShader,blending:Ji,depthTest:!1,depthWrite:!1,transparent:!0}),this._oldClearColor=new Ot,this._oldClearAlpha=1,this._basic=new Mn,this._fsQuad=new ar(null)}dispose(){for(let t=0;t<this.renderTargetsHorizontal.length;t++)this.renderTargetsHorizontal[t].dispose();for(let t=0;t<this.renderTargetsVertical.length;t++)this.renderTargetsVertical[t].dispose();this.renderTargetBright.dispose();for(let t=0;t<this.separableBlurMaterials.length;t++)this.separableBlurMaterials[t].dispose();this.compositeMaterial.dispose(),this.blendMaterial.dispose(),this._basic.dispose(),this._fsQuad.dispose()}setSize(t,n){let i=Math.round(t/2),r=Math.round(n/2);this.renderTargetBright.setSize(i,r);for(let s=0;s<this.nMips;s++)this.renderTargetsHorizontal[s].setSize(i,r),this.renderTargetsVertical[s].setSize(i,r),this.separableBlurMaterials[s].uniforms.invSize.value=new it(1/i,1/r),i=Math.round(i/2),r=Math.round(r/2)}render(t,n,i,r,s){t.getClearColor(this._oldClearColor),this._oldClearAlpha=t.getClearAlpha();let o=t.autoClear;t.autoClear=!1,t.setClearColor(this.clearColor,0),s&&t.state.buffers.stencil.setTest(!1),this.renderToScreen&&(this._fsQuad.material=this._basic,this._basic.map=i.texture,t.setRenderTarget(null),t.clear(),this._fsQuad.render(t)),this.highPassUniforms.tDiffuse.value=i.texture,this.highPassUniforms.luminosityThreshold.value=this.threshold,this._fsQuad.material=this.materialHighPassFilter,t.setRenderTarget(this.renderTargetBright),t.clear(),this._fsQuad.render(t);let a=this.renderTargetBright;for(let c=0;c<this.nMips;c++)this._fsQuad.material=this.separableBlurMaterials[c],this.separableBlurMaterials[c].uniforms.colorTexture.value=a.texture,this.separableBlurMaterials[c].uniforms.direction.value=e.BlurDirectionX,t.setRenderTarget(this.renderTargetsHorizontal[c]),t.clear(),this._fsQuad.render(t),this.separableBlurMaterials[c].uniforms.colorTexture.value=this.renderTargetsHorizontal[c].texture,this.separableBlurMaterials[c].uniforms.direction.value=e.BlurDirectionY,t.setRenderTarget(this.renderTargetsVertical[c]),t.clear(),this._fsQuad.render(t),a=this.renderTargetsVertical[c];this._fsQuad.material=this.compositeMaterial,this.compositeMaterial.uniforms.bloomStrength.value=this.strength,this.compositeMaterial.uniforms.bloomRadius.value=this.radius,this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,t.setRenderTarget(this.renderTargetsHorizontal[0]),t.clear(),this._fsQuad.render(t),this._fsQuad.material=this.blendMaterial,this.copyUniforms.tDiffuse.value=this.renderTargetsHorizontal[0].texture,s&&t.state.buffers.stencil.setTest(!0),this.renderToScreen?(t.setRenderTarget(null),this._fsQuad.render(t)):(t.setRenderTarget(i),this._fsQuad.render(t)),t.setClearColor(this._oldClearColor,this._oldClearAlpha),t.autoClear=o}_getSeparableBlurMaterial(t){let n=[];for(let i=0;i<t;i++)n.push(.39894*Math.exp(-.5*i*i/(t*t))/t);return new Le({defines:{KERNEL_RADIUS:t},uniforms:{colorTexture:{value:null},invSize:{value:new it(.5,.5)},direction:{value:new it(.5,.5)},gaussianCoefficients:{value:n}},vertexShader:`varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,fragmentShader:`#include <common>
				varying vec2 vUv;
				uniform sampler2D colorTexture;
				uniform vec2 invSize;
				uniform vec2 direction;
				uniform float gaussianCoefficients[KERNEL_RADIUS];

				void main() {
					float weightSum = gaussianCoefficients[0];
					vec3 diffuseSum = texture2D( colorTexture, vUv ).rgb * weightSum;
					for( int i = 1; i < KERNEL_RADIUS; i ++ ) {
						float x = float(i);
						float w = gaussianCoefficients[i];
						vec2 uvOffset = direction * invSize * x;
						vec3 sample1 = texture2D( colorTexture, vUv + uvOffset ).rgb;
						vec3 sample2 = texture2D( colorTexture, vUv - uvOffset ).rgb;
						diffuseSum += (sample1 + sample2) * w;
						weightSum += 2.0 * w;
					}
					gl_FragColor = vec4(diffuseSum/weightSum, 1.0);
				}`})}_getCompositeMaterial(t){return new Le({defines:{NUM_MIPS:t},uniforms:{blurTexture1:{value:null},blurTexture2:{value:null},blurTexture3:{value:null},blurTexture4:{value:null},blurTexture5:{value:null},bloomStrength:{value:1},bloomFactors:{value:null},bloomTintColors:{value:null},bloomRadius:{value:0}},vertexShader:`varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,fragmentShader:`varying vec2 vUv;
				uniform sampler2D blurTexture1;
				uniform sampler2D blurTexture2;
				uniform sampler2D blurTexture3;
				uniform sampler2D blurTexture4;
				uniform sampler2D blurTexture5;
				uniform float bloomStrength;
				uniform float bloomRadius;
				uniform float bloomFactors[NUM_MIPS];
				uniform vec3 bloomTintColors[NUM_MIPS];

				float lerpBloomFactor(const in float factor) {
					float mirrorFactor = 1.2 - factor;
					return mix(factor, mirrorFactor, bloomRadius);
				}

				void main() {
					gl_FragColor = bloomStrength * ( lerpBloomFactor(bloomFactors[0]) * vec4(bloomTintColors[0], 1.0) * texture2D(blurTexture1, vUv) +
						lerpBloomFactor(bloomFactors[1]) * vec4(bloomTintColors[1], 1.0) * texture2D(blurTexture2, vUv) +
						lerpBloomFactor(bloomFactors[2]) * vec4(bloomTintColors[2], 1.0) * texture2D(blurTexture3, vUv) +
						lerpBloomFactor(bloomFactors[3]) * vec4(bloomTintColors[3], 1.0) * texture2D(blurTexture4, vUv) +
						lerpBloomFactor(bloomFactors[4]) * vec4(bloomTintColors[4], 1.0) * texture2D(blurTexture5, vUv) );
				}`})}};ro.BlurDirectionX=new it(1,0);ro.BlurDirectionY=new it(0,1);var Da={name:"OutputShader",uniforms:{tDiffuse:{value:null},toneMappingExposure:{value:1}},vertexShader:`
		precision highp float;

		uniform mat4 modelViewMatrix;
		uniform mat4 projectionMatrix;

		attribute vec3 position;
		attribute vec2 uv;

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		precision highp float;

		uniform sampler2D tDiffuse;

		#include <tonemapping_pars_fragment>
		#include <colorspace_pars_fragment>

		varying vec2 vUv;

		void main() {

			gl_FragColor = texture2D( tDiffuse, vUv );

			// tone mapping

			#ifdef LINEAR_TONE_MAPPING

				gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );

			#elif defined( REINHARD_TONE_MAPPING )

				gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );

			#elif defined( CINEON_TONE_MAPPING )

				gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );

			#elif defined( ACES_FILMIC_TONE_MAPPING )

				gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );

			#elif defined( AGX_TONE_MAPPING )

				gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );

			#elif defined( NEUTRAL_TONE_MAPPING )

				gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );

			#elif defined( CUSTOM_TONE_MAPPING )

				gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );

			#endif

			// color space

			#ifdef SRGB_TRANSFER

				gl_FragColor = sRGBTransferOETF( gl_FragColor );

			#endif

		}`};var fu=class extends An{constructor(){super(),this.uniforms=Fi.clone(Da.uniforms),this.material=new jo({name:Da.name,uniforms:this.uniforms,vertexShader:Da.vertexShader,fragmentShader:Da.fragmentShader}),this._fsQuad=new ar(this.material),this._outputColorSpace=null,this._toneMapping=null}render(t,n,i){this.uniforms.tDiffuse.value=i.texture,this.uniforms.toneMappingExposure.value=t.toneMappingExposure,(this._outputColorSpace!==t.outputColorSpace||this._toneMapping!==t.toneMapping)&&(this._outputColorSpace=t.outputColorSpace,this._toneMapping=t.toneMapping,this.material.defines={},ie.getTransfer(this._outputColorSpace)===ae&&(this.material.defines.SRGB_TRANSFER=""),this._toneMapping===ul?this.material.defines.LINEAR_TONE_MAPPING="":this._toneMapping===fl?this.material.defines.REINHARD_TONE_MAPPING="":this._toneMapping===dl?this.material.defines.CINEON_TONE_MAPPING="":this._toneMapping===pl?this.material.defines.ACES_FILMIC_TONE_MAPPING="":this._toneMapping===gl?this.material.defines.AGX_TONE_MAPPING="":this._toneMapping===_l?this.material.defines.NEUTRAL_TONE_MAPPING="":this._toneMapping===ml&&(this.material.defines.CUSTOM_TONE_MAPPING=""),this.material.needsUpdate=!0),this.renderToScreen===!0?(t.setRenderTarget(null),this._fsQuad.render(t)):(t.setRenderTarget(n),this.clear&&t.clear(t.autoClearColor,t.autoClearDepth,t.autoClearStencil),this._fsQuad.render(t))}dispose(){this.material.dispose(),this._fsQuad.dispose()}};var gr={online:{rotulo:"Online",icone:"i-online",peso:5},suspeito:{rotulo:"Online",icone:"i-online",peso:5,dica:"verificando"},instavel:{rotulo:"Inst\xE1vel",icone:"i-instavel",peso:2},offline:{rotulo:"Offline",icone:"i-offline",peso:0},inalcancavel:{rotulo:"Inalcan\xE7\xE1vel",icone:"i-inalcancavel",peso:1},pausado:{rotulo:"Pausado",icone:"i-pausado",peso:4},desconhecido:{rotulo:"Aguardando",icone:"i-desconhecido",peso:3}};var fI=/[\u0000-\u001f\u007f-\u009f\u00ad\u061c\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff\ufff9-\ufffb]/g,dI=45;function pI(e,t){if(e==null)return"";let n=String(e).replace(fI,"");return t===void 0?n:n.slice(0,t)}function Wy(e){if(typeof e!="string")return"";let t=pI(e).trim();return t.length>dI?"":t}function La(e){let t=2166136261;for(let n of new TextEncoder().encode(String(e)))t^=n,t=Math.imul(t,16777619)>>>0;return t>>>0}var jy="#4CA878",Rp="#7A8194",qy={online:{cor:jy,forma:"cheia",pulsa:!1,treme:!1,opacidade:1},instavel:{cor:"#D9A441",forma:"anel",pulsa:!1,treme:!1,opacidade:1},suspeito:{cor:jy,forma:"cheia",pulsa:!1,treme:!0,opacidade:1},offline:{cor:"#D97373",forma:"cruz",pulsa:!0,treme:!1,opacidade:1},pausado:{cor:Rp,forma:"translucida",pulsa:!1,treme:!1,opacidade:.45},inalcancavel:{cor:Rp,forma:"elo",pulsa:!1,treme:!1,opacidade:.7},desconhecido:{cor:Rp,forma:"anel",pulsa:!1,treme:!1,opacidade:.7}};function Oa(e){let t=Object.hasOwn(qy,e)?e:"desconhecido";return jn(qe({},qy[t]),{rotulo:gr[t].rotulo})}var Xy=["#7FB2E5","#B79CE8","#E58FB8","#E8A27C","#C9C46A","#6CC6B8","#9AA7F0","#D69AD6"],mI=/^#[0-9A-Fa-f]{6}$/;function Pp(e){var n;let t=e==null?void 0:e.cor;return typeof t=="string"&&mI.test(t)?t:Xy[La(String((n=e==null?void 0:e.slug)!=null?n:""))%Xy.length]}function gI(e,t){return e>3e3||t!=null&&t<30?"agrupado":e>1e3?"reduzido":"completo"}function Ip(e=()=>performance.now()){let t=[],n=[];function i(){if(t.length<2)return null;let r=t[t.length-1]-t[0];return r<1e3?null:(t.length-1)*1e3/r}return{quadro(){let r=e();t.push(r);let s=r-3e3,o=0;for(;o<t.length&&t[o]<s;)o++;o&&(t=t.slice(o));let a=i();a!==null&&n.push({t:r,v:a});let c=r-3e4,l=0;for(;l<n.length&&n[l].t<c;)l++;l&&(n=n.slice(l))},media(){return i()},abaixoDe(r,s){if(!n.length)return!1;let o=n[n.length-1],a=null;for(let c=n.length-1;c>=0&&n[c].v<r;c--)a=n[c].t;return a===null?!1:o.t-a>=s*1e3}}}function $y(e,t){return e!=null&&e>=50&&!t}var _I=24,vI=5,yI=6e4;function Yy(e){return e.abaixoDe(_I,vI)}function Dp({total:e,agrupadoPorFps:t=!1,queda:n=!1,agora:i=0,ultimaEntrada:r=-1/0}){let s=gI(e,null);return s==="agrupado"?{nivel:"agrupado",agrupadoPorFps:!1,ultimaEntrada:r}:t?{nivel:"agrupado",agrupadoPorFps:!0,ultimaEntrada:r}:n&&i-r>=yI?{nivel:"agrupado",agrupadoPorFps:!0,ultimaEntrada:i}:{nivel:s,agrupadoPorFps:!1,ultimaEntrada:r}}function Zy(e){return jn(qe({},e),{agrupadoPorFps:!1})}var Qy=["a","b","c","d","e"];var xI=12,Na=230,Ky=60,du=18*Math.PI/180,Zr=Math.PI*2,Lp=(e,t)=>La(`${e}#${t}`)/4294967296;function bI(e,t){let n=new Set;for(let o of t)o.classe!=="sentinela"&&n.add(o.classe);let i=new Map;for(let o of e)i.set(o.slug,Number.isFinite(o.ordem)?o.ordem:0);let r=[...n].sort((o,a)=>{let c=i.has(o)?i.get(o):1/0,l=i.has(a)?i.get(a):1/0;return c!==l?c<l?-1:1:o<a?-1:o>a?1:0}),s=new Map;return r.forEach((o,a)=>s.set(o,{i:a,n:r.length})),s}function pu(e,t){let n=e/t*Zr,i=Math.cos(n)*Na,r=t>1&&t%2===1&&e===t-1?0:e%2===0?Ky:-Ky,s=Math.sin(n)*Na;return{x:i,y:r*Math.cos(du)-s*Math.sin(du),z:r*Math.sin(du)+s*Math.cos(du)}}function MI(e,t,n){let i=pu(e,n),r=Lp(t,1)*2-1,s=Math.sqrt(1-r*r),o=Lp(t,2)*Zr,a=18+Lp(t,3)*28;return{x:i.x+s*Math.cos(o)*a,y:i.y+r*a,z:i.z+s*Math.sin(o)*a}}var SI=5,wI=(e,t)=>e<t?-1:e>t?1:0,Op=new Map;function EI(e){if(!Op.has(e)){let t=[];for(let n=0;t.length<e;n++){let i=20+n*11,r=Math.max(1,Math.floor(Zr*i/SI));for(let s=0;s<r&&t.length<e;s++)t.push({r:n,i:s,n:r,raio:i})}Op.set(e,t)}return Op.get(e)}function TI(e,t,n,i,r){let s=pu(e,r),{r:o,i:a,n:c,raio:l}=EI(i)[n],u=(a+.5*(o%2))/c*Zr+o*.4;return{x:s.x+Math.cos(u)*l,y:s.y+Math.sin(u*2)*3,z:s.z+Math.sin(u)*l}}var so=64,Jy=9;function AI(e,t){let n=e/t*Zr;return{x:Math.cos(n+.9)*120,y:0,z:Math.sin(n+.9)*120}}function CI(e,t,n,i,r){let s=e/r*Zr,o=(n%so+.5)/so,a=Math.floor(n/so),c=60+o*260+a%8*Jy,l=s+o*2.6+.9;return{x:Math.cos(l)*c,y:Math.floor(a/8)*Jy,z:Math.sin(l)*c}}var RI=3.17;function PI(e){return tx(e,Math.PI/2+e*RI,0,0)}function tx(e,t,n,i){let r=90+e*26+n,s=e/xI*Math.PI,o=e*.7,a=Math.cos(t)*r,c=Math.sin(t)*r,l=i*Math.cos(s)-c*Math.sin(s),u=i*Math.sin(s)+c*Math.cos(s);return{x:a*Math.cos(o)-u*Math.sin(o),y:l,z:a*Math.sin(o)+u*Math.cos(o)}}function II(e,t,n){let i=Math.floor(n/so),r=(n%so+.5)/so*Zr;return tx(e,r,(i%8+1)*8,Math.floor(i/8)*8)}var ex=(e,t)=>(e-(t-1)/2)*70,DI=(e,t)=>({x:ex(e,t),y:90,z:0});function LI(e,t,n,i,r){let s=n%12,o=Math.floor(n/12);return{x:ex(e,r)+(s-5.5)*5.5,y:40-o*6,z:s%2*4+o%2*3}}var Np={a:{hub:pu,item:(e,t,n,i,r)=>MI(e,t,r),slots:!1},b:{hub:pu,item:TI},c:{hub:AI,item:CI},d:{hub:PI,item:II},e:{hub:DI,item:LI}};function nx(e,t,n){var c;let i=(c=Np[e])!=null?c:Np.a,r=Np[e]?e:"a",s=new Map;s.set("srv",{x:0,y:r==="e"?200:0,z:0});let o=bI(t,n);for(let[l,{i:u,n:h}]of o)s.set(`h-${l}`,i.hub(u,h));let a=new Map;for(let l of n)o.has(l.classe)&&(a.has(l.classe)||a.set(l.classe,[]),a.get(l.classe).push(l.id));for(let[l,u]of a){let{i:h,n:d}=o.get(l);if(i.slots===!1){for(let g of u)s.set(g,i.item(h,g,0,0,d));continue}let f=64;for(;f<2*u.length;)f*=4;let m=new Set,_=u.map(g=>({id:g,h:La(g)}));_.sort((g,p)=>g.h-p.h||wI(g.id,p.id));for(let{id:g,h:p}of _){let b=p%f;for(;m.has(b);)b=(b+1)%f;m.add(b),s.set(g,i.item(h,g,b,f,d))}}return s}var Ua=Math.PI/180,OI=1.15,NI=40,FI=.45,Up=(e,t)=>({x:e.x-t.x,y:e.y-t.y,z:e.z-t.z}),mu=(e,t)=>({x:e.x+t.x,y:e.y+t.y,z:e.z+t.z}),oo=(e,t)=>({x:e.x*t,y:e.y*t,z:e.z*t}),Fp=(e,t)=>e.x*t.x+e.y*t.y+e.z*t.z,gu=(e,t)=>({x:e.y*t.z-e.z*t.y,y:e.z*t.x-e.x*t.z,z:e.x*t.y-e.y*t.x}),_u=e=>Math.hypot(e.x,e.y,e.z);function Fa(e){let t=_u(e);return t<1e-9?{x:0,y:0,z:1}:oo(e,1/t)}function sx(e,t,n=0,i=1){let r=0;for(let s of t)r=Math.max(r,_u(Up(s,e)));return Math.max(i,r+n)}function UI(e,t,{aspecto:n=1,fracao:i=1,folga:r=OI}={}){let s=Math.tan(t*Ua/2),o=Math.max(.15,Math.min(i,n*i)),a=Math.atan(s*o);return e/Math.sin(a)*r}function zI(e,t,n=NI,i=FI){let r=t.x-e.x,s=t.z-e.z;Math.hypot(r,s)<1e-6&&(r=0,s=1);let o=Math.hypot(r,s);r/=o,s/=o;let a=n*Ua,c=Math.cos(a),l=Math.sin(a);return Fa({x:r*c-s*l,y:i,z:r*l+s*c})}function ox({alvo:e,de:t,raio:n,fov:i,largura:r,altura:s,margens:o={}}){let{esquerda:a=0,direita:c=0,cima:l=0,baixo:u=0}=o,h=Math.max(1,r-a-c),d=Math.max(1,s-l-u),f=Math.min(h,d)/s,m=UI(n,i,{fracao:f}),_=zI(t,e),g=oo(_,-1),p=gu(g,{x:0,y:1,z:0});_u(p)<1e-6&&(p={x:1,y:0,z:0}),p=Fa(p);let b=gu(p,g),x=2*m*Math.tan(i*Ua/2)/s,v=(a-c)/2,M=(u-l)/2,S=mu(e,mu(oo(p,-v*x),oo(b,-M*x)));return{camera:mu(S,oo(_,m)),olhar:S,distancia:m}}function kI(e,t,n,i,r){let s=Fa(Up(n,t)),o=gu(s,{x:0,y:1,z:0});_u(o)<1e-6&&(o={x:1,y:0,z:0}),o=Fa(o);let a=gu(o,s),c=Up(e,t),l=Fp(c,s),u=r/2/Math.tan(i*Ua/2)/l;return{x:Fp(c,o)*u,y:Fp(c,a)*u,profundidade:l}}var vu=2600,BI={min:.72,max:1.12,referencia:420};function ax({ndc:e,distancia:t,largura:n,altura:i,margem:r=40}){if(!e||!(e.z>-1&&e.z<1)||!(t>0)||t>vu)return{visivel:!1};let s=(e.x+1)/2*n,o=(1-e.y)/2*i;if(s<-r||s>n+r||o<-r||o>i+r)return{visivel:!1};let{min:a,max:c,referencia:l}=BI,u=Math.min(c,Math.max(a,l/t));return{visivel:!0,x:Math.round(s),y:Math.round(o),escala:Math.round(u*100)/100}}function cx({x:e,y:t,largura:n,altura:i,palcoL:r,palcoA:s,desloque:o=0,folga:a=4}){if(!(e>=0&&e<=r&&t>=0&&t<=s))return{visivel:!1};let c=r-a-n/2,l=a+n/2,u=l>c?r/2:Math.min(c,Math.max(l,e)),h=s-a-i-o,d=a-o,f=d>h?d:Math.min(h,Math.max(d,t));return{visivel:!0,x:Math.round(u),y:Math.round(f)}}var ix={lado:60,vertical:46};function VI(e,t,n,i){let r=e.x-t.x,s=e.z-t.z;return{x:t.x+r*n+s*i,y:e.y,z:t.z-r*i+s*n}}function rx(e,t,n,i,r,s){let o=1/0,a=-1/0,c=1/0,l=-1/0;for(let[u,h]of s)for(let d of e){let f=VI(d,t,u,h),m=kI(f,n,t,i,r);if(!(m.profundidade>1))return null;let _=r/2/Math.tan(i*Ua/2)/m.profundidade,g=(d.raio||0)*_,p=d.rotulo?Math.max(g,ix.lado):g,b=d.rotulo?Math.max(g,ix.vertical):g;o=Math.min(o,m.x-p),a=Math.max(a,m.x+p),c=Math.min(c,m.y-b),l=Math.max(l,m.y+b)}return{x0:o,x1:a,y0:c,y1:l}}function lx({pontos:e,alvo:t,direcao:n,fov:i,largura:r,altura:s,margens:o={},folga:a=4,minimo:c=120,maximo:l=2200,passos:u=12}){let{esquerda:h=0,direita:d=0,cima:f=0,baixo:m=0}=o,_=Math.max(1,r-h-d-2*a),g=Math.max(1,s-f-m-2*a),p=Fa(n),b=Array.from({length:u},(w,R)=>[Math.cos(R*2*Math.PI/u),Math.sin(R*2*Math.PI/u)]),x=w=>mu(t,oo(p,w)),v=w=>{let R=rx(e,t,x(w),i,s,b);return R&&R.x1-R.x0<=_&&R.y1-R.y0<=g},M=l,S=v(l),C=!0;if(S||(C=!1,b.length=1,S=v(l)),S){let w=c,R=l;v(w)&&(R=w);for(let V=0;V<24&&R-w>.5;V++){let N=(w+R)/2;v(N)?R=N:w=N}M=R}let P=rx(e,t,x(M),i,s,b)||{x0:0,x1:0,y0:0,y1:0},T={x:Math.round((h-d)/2-(P.x0+P.x1)/2),y:Math.round((m-f)/2-(P.y0+P.y1)/2)};return{camera:x(M),olhar:t,distancia:M,desvio:T,coube:S,girar:C}}function hx(e,{folga:t=4,limite:n=1/0}={}){let r=[],s=[],o=(a,c)=>r.some(l=>Math.abs(l.x-a.x)<(l.l+a.l)/2+t-1e-6&&c<l.topo+l.a+t-1e-6&&c+a.a+t-1e-6>l.topo);for(let a of e){let c=null;if(!o(a,a.topo))c=a.topo;else{let u=[];for(let h of r)Math.abs(h.x-a.x)<(h.l+a.l)/2+t-1e-6&&u.push(h.topo-t-a.a,h.topo+h.a+t);for(let h of u)h<-1e-6||h+a.a>n+1e-6||o(a,h)||(c===null||Math.abs(h-a.topo)<Math.abs(c-a.topo)-1e-6)&&(c=h);c===null&&(c=Math.max(a.topo,...r.map(h=>h.topo+h.a+t)))}let l=c-a.topo;s.push(l),r.push({x:a.x,topo:c,l:a.l,a:a.a})}return s}function ux(e,t,{folga:n=4,limite:i=1/0,maxDeslocamento:r=1/0}={}){let o=[];return e.map((a,c)=>{let l=t[c]||0,u=a.topo+l,h=u>=-1e-6&&u+a.a<=i+1e-6,d=Math.abs(l)<=r+1e-6,f=o.some(_=>Math.abs(_.x-a.x)<(_.l+a.l)/2+n-1e-6&&u<_.topo+_.a+n-1e-6&&u+a.a+n-1e-6>_.topo),m=c===0||h&&d&&!f;return m&&o.push({x:a.x,topo:u,l:a.l,a:a.a}),m})}var fx="#BCC2CE",dx="rgba(6,10,25,0.94)";function px({raio:e,distancia:t,fovGraus:n,alturaPx:i}){if(!(i>0))return 0;if(!(t>0))return 1/0;let r=Math.tan(n*Math.PI/360);return 2*e*i/(2*t*r)}function mx({diametroPx:e,totalNos:t}){return t<=3e3&&e>=24}function gx(e){return e>0?Math.min(1,e/180):0}function _x(e){return Math.min(15,Math.max(11,Math.round(e*.3)))}function vx({limite:e,criar:t,liberar:n}){let i=new Map;return{obter(r,s){let o=i.get(r);if(o)return i.delete(r),o.quadro=s,i.set(r,o),o.recurso;if(o={recurso:t(r),quadro:s},i.set(r,o),i.size>e)for(let[a,c]of i){if(i.size<=e)break;c.quadro>=s||(i.delete(a),n(c.recurso))}return o.recurso},get tamanho(){return i.size},liberarTudo(){for(let r of i.values())n(r.recurso);i.clear()}}}function yx(e,t,n=[]){let i=[...n];return e.map(r=>{for(let s of i)if(Math.abs(r.x-s.x)*2<r.l+s.l+2*t&&Math.abs(r.y-s.y)*2<r.a+s.a+2*t)return!1;return i.push(r),!0})}var xu="#060a19",xx="#A78BFA",Mx="#2DD4BF",HI="#dfe4ff",bu=.15,en={equipamento:2.4,haloEquipamento:13,marca:8.5,classe:6.5,haloClasse:44,nucleo:14,haloServidor:110},Kr=()=>{};function Sx(){let e=new Map;return{obter(t,n){let i=e.get(t);if(!i){i=n();let r=i.dispose.bind(i);i.dispose=()=>{},i.liberarDeVerdade=r,e.set(t,i)}return i},get tamanho(){return e.size},liberar(){for(let t of e.values())t.liberarDeVerdade();e.clear()}}}var yu=(e,t)=>{let n=document.createElement("canvas");return n.width=e,n.height=t,n};function kp(e){let t=new zo(e);return t.colorSpace=He,t}var GI=e=>e<.25?1-.45*e/.25:.55*(1-(e-.25)/.75);function wx(e,t){let n=e.getContext("2d");n.clearRect(0,0,128,128);let i=n.createRadialGradient(64,64,0,64,64,64);for(let r=0;r<=16;r++){let s=r/16;i.addColorStop(s,`rgba(255,255,255,${(GI(s)**t).toFixed(4)})`)}n.fillStyle=i,n.fillRect(0,0,128,128)}function Bp(e){return e.obter("tex:brilho",()=>{let t=yu(128,128);wx(t,1);let n=kp(t);return n.userData.canvas=t,n})}function Vp(e,t=!0){let n=Bp(e);wx(n.userData.canvas,t?2.2:1),n.needsUpdate=!0}function Ex(e,t){return e.obter(`tex:${t}`,()=>{let n=yu(64,64),i=n.getContext("2d");return i.strokeStyle="#ffffff",i.lineCap="round",t==="anel"?(i.lineWidth=5,i.beginPath(),i.arc(32,32,24,0,Math.PI*2),i.stroke()):t==="elo"?(i.lineWidth=6,i.beginPath(),i.arc(32,32,24,Math.PI*.28,Math.PI*1.72),i.stroke()):(i.lineWidth=8,i.beginPath(),i.moveTo(16,16),i.lineTo(48,48),i.moveTo(48,16),i.lineTo(16,48),i.stroke()),kp(n)})}function Tx(e){let t=e.obter("mat:selecao",()=>new li({map:Ex(e,"anel"),color:Mx,transparent:!0,depthTest:!1,depthWrite:!1})),n=new hi(t);return n.raycast=Kr,n.renderOrder=10,n.visible=!1,n}var Ax=(e,t)=>t?bu:e;function Cx(e,t,n,i){let r=Ax(n,i);return e.obter(`mat:${t}:${r}`,()=>new qo({color:t,emissive:t,emissiveIntensity:.6,roughness:.45,metalness:.1,transparent:r<1,opacity:r,depthWrite:r>=1}))}function Rx(e,t,n,i){let r=Ax(n,i);return e.obter(`halo:${t}:${r}`,()=>new li({map:Bp(e),color:t,transparent:!0,opacity:r,depthWrite:!1,blending:Ji}))}function WI(e,t,n,i){let r=i?bu:.95;return e.obter(`marca:${t}:${n}:${r}`,()=>new li({map:Ex(e,t),color:n,transparent:!0,opacity:r,depthWrite:!1,depthTest:!1}))}var Hp=(e,t,n)=>e.obter(`geo:esfera:${t.toFixed(2)}:${n}`,()=>new Di(t,n,n));function Px(e,t,n){let i=new Ye,r=new hi,s=new we(Hp(e,en.equipamento,n)),o=new hi;return o.renderOrder=10,i.add(r,s,o),i.userData={halo:r,esfera:s,marca:o,escala:t,aparencia:null,semente:Math.random()*100},i}function za(e,t,n,i){let r=Oa(n),s=e.userData,o=s.escala;s.aparencia=r,s.esfera.material=Cx(t,r.cor,r.opacidade,i),s.halo.material=Rx(t,r.cor,.55*r.opacidade,i);let a=en.haloEquipamento*o;s.halo.scale.set(a,a,1),s.esfera.scale.setScalar(o),s.esfera.position.set(0,0,0);let c=r.forma==="anel"||r.forma==="cruz"||r.forma==="elo";if(s.marca.visible=c,c){s.marca.material=WI(t,r.forma,r.cor,i);let l=en.marca*o*(r.forma==="cruz"?.8:1);s.marca.scale.set(l,l,1)}return r}function Ix(e,t,{esmaecido:n=!1,resolucao:i=16}={}){let r=Px(e,1,i);return za(r,e,t,n),r}function Dx(e,t){let{raio:n,estado:i,esmaecido:r=!1}=t,s=Px(e,n/en.equipamento,24);return za(s,e,i,r),s}var zp=30,bx=`600 ${zp}px ui-monospace, "Cascadia Mono", "SF Mono", Consolas, monospace`,jI=14,qI=9;function Lx(e){let t=yu(2,2).getContext("2d");t.font=bx;let n=Math.ceil(t.measureText(e).width)+2*jI,i=zp+2*qI,r=yu(n,i),s=r.getContext("2d"),o=i/2;s.fillStyle=dx,s.beginPath(),s.moveTo(o,0),s.lineTo(n-o,0),s.arc(n-o,o,o,-Math.PI/2,Math.PI/2),s.lineTo(o,i),s.arc(o,o,o,Math.PI/2,Math.PI*3/2),s.closePath(),s.fill(),s.font=bx,s.fillStyle=fx,s.textAlign="center",s.textBaseline="middle",s.fillText(e,n/2,i/2+1);let a=kp(r);return a.userData.aspecto=n/i,a.userData.letra=zp/i,a.liberarDeVerdade=a.dispose.bind(a),a.dispose=()=>{},a}function Ox(){let e=new hi(new li({transparent:!0,opacity:0,depthTest:!1,depthWrite:!1,fog:!1}));return e.raycast=Kr,e.renderOrder=12,e.visible=!1,e}function Nx(e,{cor:t,esmaecido:n=!1}){let i=new Ye,r=new hi;r.raycast=Kr,r.scale.set(en.haloClasse,en.haloClasse,1);let s=new we(Hp(e,en.classe,32));return i.add(r,s),i.userData={halo:r,esfera:s},Gp(i,e,t,n),i}function Gp(e,t,n,i){let r=e.userData;r.esfera.material=Cx(t,n,1,i),r.halo.material=Rx(t,n,.9,i)}function Fx(e){let t=new Ye,n=new hi(e.obter("srv:halo",()=>new li({map:Bp(e),color:xx,transparent:!0,depthWrite:!1,blending:Ji})));n.scale.set(en.haloServidor,en.haloServidor,1),n.raycast=Kr;let i=new we(Hp(e,en.nucleo,48),e.obter("srv:nucleo",()=>new Mn({color:HI}))),r=e.obter("srv:geo-anel",()=>new Go(26,.6,8,96)),s=new we(r,e.obter("srv:anel1",()=>new Mn({color:Mx,transparent:!0,opacity:.7}))),o=new we(r,e.obter("srv:anel2",()=>new Mn({color:xx,transparent:!0,opacity:.7})));return o.scale.setScalar(1.35),s.raycast=Kr,o.raycast=Kr,t.add(n,i,s,o),t.userData={aneis:[s,o]},t}function Ux(e=1500,t=366){let n=t,i=()=>(n=n*16807%2147483647)/2147483647,r=new Float32Array(e*3);for(let c=0;c<e;c++){let l=i()*2-1,u=Math.sqrt(1-l*l),h=i()*Math.PI*2,d=1800+i()*1400;r[c*3]=u*Math.cos(h)*d,r[c*3+1]=l*d,r[c*3+2]=u*Math.sin(h)*d}let s=new ve;s.setAttribute("position",new ce(r,3));let o=new As({color:"#c4b5fd",size:1.6,sizeAttenuation:!1,transparent:!0,opacity:.55,depthWrite:!1,fog:!1}),a=new Uo(s,o);return a.raycast=Kr,a}var Ba="sentinela",ka=e=>e&&e.classe!==Ba;function Wp(e){let t=new Map;for(let[n,i]of e)ka(i)&&t.set(n,{classe:i.classe,estado:i.estado});return t}function kx(e,t){let n=[],i=[],r=[],s=[];for(let[o,a]of t){if(!ka(a))continue;let c=e.get(o);c?c.classe!==a.classe?r.push(o):c.estado!==a.estado&&s.push(o):n.push(o)}for(let o of e.keys())ka(t.get(o))||i.push(o);return{adicionar:n,remover:i,mudouClasse:r,mudouEstado:s}}function Bx(e){let t=new Map;for(let n of e.itens.values())ka(n)&&t.set(n.classe,(t.get(n.classe)||0)+1);return e.ordemClasses.filter(n=>n&&n.slug!==Ba&&(t.get(n.slug)||0)>0).map(n=>({slug:n.slug,nome:n.nome,cor:n.cor,ordem:n.ordem,total:t.get(n.slug)}))}var zx=e=>Object.hasOwn(gr,e)?gr[e].peso:gr.desconhecido.peso,XI=e=>Object.hasOwn(gr,e)?e:"desconhecido";function $I(e){let t=null;for(let n of e){let i=XI(n);(t===null||zx(i)<zx(t))&&(t=i)}return t!=null?t:"desconhecido"}function jp(e){let t=new Map;for(let i of e.values())ka(i)&&(t.has(i.classe)||t.set(i.classe,[]),t.get(i.classe).push(i.estado));let n=new Map;for(let[i,r]of t)n.set(i,{total:r.length,pior:$I(r)});return n}function Mu(e){let t=Math.max(0,Number(e)||0);return Math.min(30,5+2.2*Math.cbrt(t))}function Su(e,t){return`${e!=null?e:""} \xB7 ${t}`.trim()}function Vx(e){return((Number(e)||0)%12+12)%12%2===1}var Hx={x:0,y:260,z:520},Gx={x:0,y:60,z:620},Wx={x:0,y:40,z:0},ZI={a:.18,b:.07,c:.05,d:.1,e:.12},KI={a:!0,b:!0,c:!1,d:!1,e:!0},JI=900,qp=1200,QI=3e3,jx=Na+40,qx={lado:60,cima:32},tD=1350,eD=250,nD=300,Xx=.0012,Va=4,$x=e=>Qy.includes(e)?e:"a",iD=e=>e*e*(3-2*e);function rD(e,t){let n=parseInt(e.slice(1),16);return`rgba(${n>>16&255},${n>>8&255},${n&255},${t})`}function Yx(e,t={}){let n=t.aoClicarEquipamento||null,i=typeof t.margens=="function"?t.margens:()=>({}),r=t.aoClicarClasse||(()=>{}),s=!!t.movimentoReduzido,o=t.particulas!==!1,a=t.interativo!==!1,c=!!t.caberNaTela,l=t.rotulosIp===!0,u=typeof t.obstaculos=="function"?t.obstaculos:()=>[],h={estilo:$x(t.estilo),nivel:"completo",total:0,agrupadoPorFps:!1,ultimaEntradaFps:-1/0,foco:null,girando:!s,store:null,pausado:!1,destruido:!1,bloom:null,inicioRender:null,ultimoCheque:0,ultimaLeitura:-1/0,transicao:null},d=Sx(),f=Ip(),m=null,_=vx({limite:nD,criar:Lx,liberar:F=>F.liberarDeVerdade()}),g=0,p=0,b=[],x=[],v={id:"srv",tipo:"servidor",fx:0,fy:0,fz:0,x:0,y:0,z:0},M=new Map,S=new Map,C=new Map,P=new Map,T=new Set,w=new Map,R=null;e.classList.add("teia-cena");let V=document.createElement("div"),N=new Hy(e,{controlType:"orbit",rendererConfig:{antialias:!0,alpha:!1,powerPreference:"high-performance"}});N.backgroundColor(xu).showNavInfo(!1).enableNodeDrag(!1).width(e.clientWidth||window.innerWidth).height(e.clientHeight||window.innerHeight).nodeThreeObject(X).nodeLabel(Bt).linkWidth(F=>F.tronco?1.2:0).linkDirectionalParticleWidth(2.2).linkDirectionalParticleSpeed(.006).linkDirectionalParticleColor(F=>F.cor).cooldownTicks(160).onNodeClick(mt).onNodeHover(F=>{e.style.cursor=F?"pointer":""}),Qt();let k=e.querySelector(".float-tooltip-kap");k&&Object.assign(k.style,{position:"absolute",pointerEvents:"none",padding:"4px 8px",borderRadius:"8px",font:"12px Inter, system-ui, sans-serif",color:"#E2E8F0",background:"rgba(15,23,42,.92)",whiteSpace:"normal",overflowWrap:"anywhere",maxWidth:"min(360px, 80vw)"});let z=e.querySelector(".graph-info-msg");z&&(z.style.display="none");let G=document.createElement("div");G.className="teia-rotulos",G.setAttribute("aria-hidden","true"),e.appendChild(G);let K=new Map,j=new I,at=N.scene();at.background=new Ot(xu),at.fog=new Oo(xu,Xx);let _t=new Zo(14673151,2.4,0,0);N.lights([new Ir(16777215,.35),_t]);let $=Ux(1500);at.add($);let rt=Tx(d);at.add(rt);let pt=N.controls();pt.minDistance=60,pt.maxDistance=vu,pt.enableDamping=!s,pt.dampingFactor=.08,pt.autoRotateSpeed=.6,pt.autoRotate=h.girando,a||(pt.enableRotate=!1,pt.enableZoom=!1,pt.enablePan=!1,N.enablePointerInteraction(!1).onNodeClick(null).onNodeHover(null));let zt=N.d3Force("charge");N.d3Force("center",null);{let F=h.estilo==="e"?Gx:Hx;N.cameraPosition(c?ao(F):F,h.estilo==="e"?Wx:{x:0,y:0,z:0})}function Lt(F){return h.foco!==null&&F!==h.foco}function X(F){if(F.tipo==="servidor")return Fx(d);if(F.tipo==="classe")return Nx(d,{cor:F.cor,esmaecido:Lt(F.slug)});if(F.tipo==="grupo"){let A=Dx(d,{raio:Mu(F.total),estado:F.estado,esmaecido:Lt(F.slug)});return tt(F,A),A}let y=Ix(d,F.estado,{esmaecido:Lt(F.classe),resolucao:h.nivel==="completo"?16:8});return tt(F,y),y}function tt(F,y){let A=y.userData.aparencia;!s&&A&&(A.pulsa||A.treme)?T.add(F):T.delete(F)}function yt(F){let y=F.__threeObj;y&&(F.tipo==="classe"?Gp(y,d,F.cor,Lt(F.slug)):F.tipo==="grupo"?(za(y,d,F.estado,Lt(F.slug)),tt(F,y)):F.tipo==="equip"&&(za(y,d,F.estado,Lt(F.classe)),tt(F,y)))}function Bt(F){var y,A;if(F.tipo==="servidor")V.textContent="Sentinela";else if(F.tipo==="classe")V.textContent=Su(F.nome,F.total);else if(F.tipo==="grupo")V.textContent=`${Su(F.nome,F.total)} \xB7 pior: ${Oa(F.estado).rotulo}`;else{let D=(y=h.store)==null?void 0:y.itens.get(F.id);V.textContent=`${(A=D==null?void 0:D.nome)!=null?A:F.id} \xB7 ${Oa(F.estado).rotulo}`}return V}function It(F){let y=F.slug;return Lt(y)?rD(F.cor,bu):F.cor}function Qt(){let F=KI[h.estilo],y=o&&!s&&h.nivel==="completo";e.dataset.particulas=y?"sim":"nao",N.linkColor(A=>It(A)).linkOpacity(ZI[h.estilo]).linkVisibility(A=>A.tronco||F).linkDirectionalParticles(A=>A.tronco&&y?4:0)}function Re(F,y,A,D,U){let O=`${F.id}>${y.id}`,q=P.get(O);return(!q||q.cor!==A||q.source!==F||q.target!==y)&&(q={source:F,target:y,cor:A,slug:D,tronco:U,chave:O},P.set(O,q)),q}function B(){let F=[];for(let y of h.store.itens.values())y.classe!==Ba&&F.push(y);return F}function xe(F){let y=new Set;for(let A of F){y.add(A.slug);let D=Pp(A),U=S.get(A.slug);U?(U.nome!==A.nome||U.cor!==D||U.total!==A.total)&&(Object.assign(U,{nome:A.nome,cor:D,total:A.total}),yt(U)):(U={id:`h-${A.slug}`,tipo:"classe",slug:A.slug,ordem:A.ordem,nome:A.nome,cor:D,total:A.total},S.set(A.slug,U))}for(let A of[...S.keys()])y.has(A)||S.delete(A)}function Wt(F){let y=jp(h.store.itens),A=new Set;for(let D of F){let U=y.get(D.slug);if(!U)continue;A.add(D.slug);let O=Pp(D),q=C.get(D.slug);q?q.total!==U.total?(C.set(D.slug,jn(qe({},q),{__threeObj:void 0,nome:D.nome,cor:O,total:U.total,estado:U.pior})),T.delete(q)):(q.estado!==U.pior||q.nome!==D.nome||q.cor!==O)&&(Object.assign(q,{nome:D.nome,cor:O,estado:U.pior}),yt(q)):(q={id:`g-${D.slug}`,tipo:"grupo",slug:D.slug,ordem:D.ordem,nome:D.nome,cor:O,total:U.total,estado:U.pior},C.set(D.slug,q))}for(let[D,U]of[...C])A.has(D)||(C.delete(D),T.delete(U))}function kt(F){let y=h.store.itens;for(let A of F.remover)T.delete(M.get(A)),M.delete(A);for(let A of F.adicionar){let D=y.get(A);M.set(A,{id:A,tipo:"equip",classe:D.classe,estado:D.estado})}for(let A of F.mudouClasse){let D=M.get(A),U=y.get(A);D&&(D.classe=U.classe,D.estado=U.estado,D.semPosicao=!0,yt(D))}for(let A of F.mudouEstado){let D=M.get(A);D&&(D.estado=y.get(A).estado,yt(D))}for(let A of F.adicionar)M.get(A).semPosicao=!0}function wt({todos:F=!1,animar:y=!1}={}){var q,Z,ct;let A=nx(h.estilo,h.store.ordemClasses,B()),D=h.estilo!=="a",U=A.get("srv");_t.position.set(U.x,U.y,U.z);let O=new Map([[v,U]]);for(let Q of S.values()){let ut=A.get(Q.id);ut&&O.set(Q,ut)}for(let Q of C.values()){let ut=A.get(`h-${Q.slug}`);ut&&O.set(Q,ut)}for(let Q of M.values()){let ut=A.get(Q.id);ut&&(D?O.set(Q,ut):(F||Q.semPosicao)&&(delete Q.fx,delete Q.fy,delete Q.fz,Object.assign(Q,{x:ut.x,y:ut.y,z:ut.z,vx:0,vy:0,vz:0})),Q.semPosicao=!1)}if(y&&!s){let Q=new Map;for(let[ut,St]of O)Q.set(ut,{x:(q=ut.x)!=null?q:St.x,y:(Z=ut.y)!=null?Z:St.y,z:(ct=ut.z)!=null?ct:St.z});h.transicao={inicio:null,de:Q,para:O}}else{h.transicao=null;for(let[Q,ut]of O)Object.assign(Q,{fx:ut.x,fy:ut.y,fz:ut.z,x:ut.x,y:ut.y,z:ut.z})}}function _e(){let F=N.d3Force("link");h.estilo==="a"&&h.nivel!=="agrupado"?(N.d3Force("charge")||N.d3Force("charge",zt),zt.strength(-14),F.distance(y=>y.tronco?Na:26).strength(y=>y.tronco?0:.9)):(N.d3Force("charge",null),F.strength(0))}function Tt(){let F=[v],y=[],A=new Set,D=O=>{A.add(O.chave),y.push(O)};if(h.nivel==="agrupado")for(let O of C.values())F.push(O),D(Re(v,O,O.cor,O.slug,!0));else{for(let O of S.values())F.push(O),D(Re(v,O,O.cor,O.slug,!0));for(let O of M.values()){F.push(O);let q=S.get(O.classe);D(q?Re(q,O,q.cor,q.slug,!1):Re(v,O,"#7A8194",O.classe,!1))}}for(let O of[...P.keys()])A.has(O)||P.delete(O);N.graphData({nodes:F,links:y});let U=0;for(let O of F)O.tipo==="equip"&&(U+=1);e.dataset.nosGrafo=String(U),R&&(R=M.get(R.id)||null),qt()}function qt(){let F=[v,...h.nivel==="agrupado"?C.values():S.values()],y=new Set;for(let A of F){y.add(A.id);let D=A===v?"SENTINELA":Su(A.nome,A.total),U=K.get(A.id);if(!U){let O=document.createElement("div");O.className="teia-rotulo";let q=document.createElement("span");O.appendChild(q),O.hidden=!0,G.appendChild(O),U={el:O,span:q,texto:null,ultimo:""},K.set(A.id,U)}U.no=A,U.texto!==D&&(U.span.textContent=D,U.texto=D),U.el.classList.toggle("servidor",A===v),U.el.classList.toggle("abaixo",A!==v&&Vx(A.ordem)),U.el.classList.toggle("esmaecido",A!==v&&Lt(A.slug)),A.cor&&U.el.style.setProperty("--cor-classe",A.cor)}for(let[A,D]of[...K])y.has(A)||(D.el.remove(),K.delete(A))}function Ie(){let F=N.camera(),y=N.width(),A=N.height(),D=[];for(let Z of K.values()){let ct=ot(Z.no);j.set(ct.x,ct.y,ct.z);let Q=j.distanceTo(F.position);j.project(F);let ut=ax({ndc:j,distancia:Q,largura:y,altura:A});if(!ut.visivel){Z.el.hidden||(Z.el.hidden=!0);continue}Z.el.hidden&&(Z.el.hidden=!1);let St=Z.span.textContent;Z.medidoPara!==St&&(Z.medidoPara=St,Z.larg=Z.span.offsetWidth,Z.alt=Z.span.offsetHeight);let nt=Z.larg*ut.escala,Ct=Z.alt*ut.escala,Gt=Z.el.classList.contains("servidor")?30:Z.el.classList.contains("abaixo")?14:-(14+Ct),te=cx({x:ut.x,y:ut.y,largura:nt,altura:Ct,palcoL:y,palcoA:A,desloque:Gt}),se=te.visivel&&b.some(ee=>{let Dt=te.y+Gt+Ct/2;return Math.abs(te.x-ee.x)<(nt+ee.l)/2&&Math.abs(Dt-ee.y)<(Ct+ee.a)/2});if(!te.visivel||se){Z.el.hidden||(Z.el.hidden=!0);continue}D.push({r:Z,pos:ut,dentro:te,larg:nt,alt:Ct,deslocado:Gt})}D.sort((Z,ct)=>Z.r.no===v?-1:ct.r.no===v?1:(ct.r.no.total||0)-(Z.r.no.total||0));let U=D.map(Z=>{if(Z.r.no===v){let ct=Math.round(36*Z.pos.escala);return{x:Z.dentro.x,topo:Z.dentro.y-ct,l:Math.max(Z.larg,ct*2),a:ct+Z.deslocado+Z.alt}}return{x:Z.dentro.x,topo:Z.dentro.y+Z.deslocado,l:Z.larg,a:Z.alt}}),O=hx(U,{limite:A}),q=ux(U,O,{limite:A,maxDeslocamento:48});D.forEach((Z,ct)=>{let{r:Q,pos:ut,dentro:St}=Z;if(!q[ct]){Q.el.hidden||(Q.el.hidden=!0),Q.ultimo="";return}let nt=St.y+O[ct],Ct=`${St.x},${nt},${ut.escala}`;Ct!==Q.ultimo&&(Q.ultimo=Ct,Q.el.style.transform=`translate3d(${St.x}px, ${nt}px, 0)`,Q.el.style.setProperty("--escala",String(ut.escala)))})}function Ae(F){let y=R;if(!y||h.nivel==="agrupado"){rt.visible=!1;return}let A=ot(y);rt.position.set(A.x,A.y,A.z);let D=en.haloEquipamento*(s?.95:.9+.12*Math.sin(F*4));rt.scale.set(D,D,1),rt.visible=!0}function L(){e.dataset.nos=String(h.nivel==="agrupado"?0:M.size),e.dataset.equipamentos=String(h.total),e.dataset.classes=[...(h.nivel==="agrupado"?C:S).keys()].join(","),e.dataset.nivel=h.nivel,e.dataset.movimento=s?"reduzido":"normal",e.dataset.girando=h.girando?"sim":"nao"}function E(){!h.store||h.foco!==null||R||h.transicao||W()!==h.chaveVista&&bt()}let W=()=>`${JSON.stringify(i()||{})}|${h.nivel}|${N.width()}x${N.height()}|${S.size}`;function J(){E();let F=N.camera().position,y=`${Math.round(F.x)},${Math.round(F.y)},${Math.round(F.z)}`;e.dataset.camera!==y&&(e.dataset.camera=y);let A=N.renderer().info.memory,D=String(A.geometries),U=String(A.textures);if(e.dataset.geometrias!==D&&(e.dataset.geometrias=D),e.dataset.texturas!==U&&(e.dataset.texturas=U),l){let O=String(p);e.dataset.rotulosIp!==O&&(e.dataset.rotulosIp=O),st()}}function st(){let F=e.getBoundingClientRect(),y=[],A=O=>{!O||!(O.width>0)||!(O.height>0)||y.push({x:O.left-F.left+O.width/2,y:O.top-F.top+O.height/2,l:O.width,a:O.height})};for(let O of K.values())O.el.hidden||A(O.span.getBoundingClientRect());let D=[];try{D=u()||[]}catch(O){D=[]}let U=y.length;for(let O of D)A(O);b=y.slice(U),x=y}function Y(F){F.rotuloIp&&F.rotuloIp.visible&&(F.rotuloIp.visible=!1)}function Pt(){var St;if(!l)return;if(h.nivel==="agrupado"||!h.store){for(let nt of M.values())nt.__threeObj&&Y(nt.__threeObj.userData);p=0;return}g+=1;let F=N.camera(),y=F.position,A=N.height(),D=N.width(),U=F.fov||50,O=2*Math.tan(U*Math.PI/360)/A,q=[];for(let nt of M.values()){let Ct=nt.__threeObj;if(!Ct)continue;let Gt=Ct.userData;if(Lt(nt.classe)){Y(Gt);continue}let te=Ct.position.distanceTo(y),se=px({raio:en.equipamento,distancia:te,fovGraus:U,alturaPx:A}),ee=nt===R?h.total<=3e3:mx({diametroPx:se,totalNos:h.total}),Dt=0,be=0;ee&&(j.copy(Ct.position).project(F),(j.z>1||Math.abs(j.x)>1.2||Math.abs(j.y)>1.2)&&(ee=!1),Dt=(j.x+1)/2*D,be=(1-j.y)/2*A);let ne=ee?Wy((St=h.store.itens.get(nt.id))==null?void 0:St.ip):"";if(!ne){Y(Gt);continue}let rn=nt===R?-1:te;q.push({obj:Ct,u:Gt,texto:ne,distancia:te,diametroPx:se,x:Dt,y:be,prio:rn})}q.sort((nt,Ct)=>nt.prio-Ct.prio);let Z=[];for(let nt of q){nt.tex=_.obter(nt.texto,g),nt.alturaPx=_x(nt.diametroPx)/nt.tex.userData.letra;let Ct=nt.alturaPx*nt.tex.userData.aspecto,Gt=nt.alturaPx;nt.caixa={x:nt.x,y:nt.y,l:Ct,a:Gt},nt.x-Ct/2>=Va&&nt.x+Ct/2<=D-Va&&nt.y-Gt/2>=Va&&nt.y+Gt/2<=A-Va?Z.push(nt):Y(nt.u)}let ct=yx(Z.map(nt=>nt.caixa),Va,x),Q=performance.now(),ut=0;Z.forEach((nt,Ct)=>{if(!ct[Ct]){Y(nt.u);return}nt.u.rotuloIp||(nt.u.rotuloIp=Ox(),nt.obj.add(nt.u.rotuloIp));let Gt=nt.u.rotuloIp,te=Gt.material;te.map!==nt.tex&&(te.map||(te.needsUpdate=!0),te.map=nt.tex),Gt.visible||(nt.u.ipDesde=Q),te.opacity=s?1:gx(Q-nt.u.ipDesde+16);let se=nt.alturaPx*nt.distancia*O;Gt.scale.set(se*nt.tex.userData.aspecto,se,1),Gt.visible=!0,ut+=1}),p=ut}function ft(F){let y=h.nivel;if(h.nivel=F,F!=="completo"&&Ga(),F==="agrupado"){for(let A of M.values())T.delete(A);M.clear(),w=new Map}else{for(let A of C.values())T.delete(A);C.clear()}if(y!==F&&F!=="agrupado"&&y!=="agrupado"){for(let A of M.values())T.delete(A);N.nodeThreeObject(A=>X(A))}}function Et(F){if(h.destruido)return;h.store=F,h.total=Wp(F.itens).size;let y=Dp({total:h.total,agrupadoPorFps:h.agrupadoPorFps,ultimaEntrada:h.ultimaEntradaFps});h.agrupadoPorFps=y.agrupadoPorFps,y.nivel!==h.nivel&&ft(y.nivel);let A=Bx(F);if(xe(A),h.nivel==="agrupado")Wt(A),w=new Map;else{let q=kx(w,F.itens);kt(q),w=Wp(F.itens)}let D=A.map(q=>q.slug).join(","),U=D!==h.conjuntoClasses,O=h.conjuntoClasses===void 0;h.conjuntoClasses=D,wt(U&&!O?{animar:!0}:{}),_e(),Qt(),Tt(),L(),U&&!h.foco&&!R&&bt()}function At(F){if(h.destruido||!h.store)return;let y=h.store.itens.get(F);if(!y)return;if(h.nivel==="agrupado"){let U=C.get(y.classe);if(!U)return;let O=jp(h.store.itens).get(y.classe);O&&O.pior!==U.estado&&(U.estado=O.pior,yt(U));return}let A=M.get(F);if(!A||A.estado===y.estado)return;A.estado=y.estado;let D=w.get(F);D&&(D.estado=y.estado),yt(A)}function ot(F){var y,A,D,U,O,q;return{x:(A=(y=F.fx)!=null?y:F.x)!=null?A:0,y:(U=(D=F.fy)!=null?D:F.y)!=null?U:0,z:(q=(O=F.fz)!=null?O:F.z)!=null?q:0}}function vt(F,y,A){nn(),Ht(0);let D=N.camera(),U=ox({alvo:F,de:y,raio:A,fov:D.fov||50,largura:N.width(),altura:N.height(),margens:i()||{}});N.cameraPosition(U.camera,U.olhar,s?0:qp)}function Ft(F,y){let A=[];for(let D of M.values())D.classe===F&&A.push(ot(D));return sx(y,A,en.haloEquipamento/2,40)}function Mt(F){h.girando=F&&!s,pt.autoRotate=h.girando,e.dataset.girando=h.girando?"sim":"nao"}function mt(F){if(F.tipo==="equip")n?n(F.id):xt(F.id);else if(F.tipo==="classe"||F.tipo==="grupo")r(F.slug);else if(F.tipo==="servidor"&&h.store&&n){for(let y of h.store.itens.values())if(y.classe===Ba){n(y.id);break}}}function jt(){for(let F of S.values())yt(F);for(let F of C.values())yt(F);for(let F of M.values())yt(F);Qt(),qt()}function H(F){if(!h.destruido){if(h.foco=F!=null?F:null,R&&R.classe!==h.foco&&(R=null),jt(),h.foco===null){Mt(!0);return}Mt(!1),ht()}}function ht(){let F=h.nivel==="agrupado",y=F?C.get(h.foco):S.get(h.foco);if(!y)return;let A=ot(y),D=F?Mu(y.total)*2+30:Ft(h.foco,A);vt(A,ot(v),D)}function dt(){h.destruido||(R?xt(R.id):h.foco?ht():bt())}function xt(F){if(h.destruido||!h.store)return;let y=h.store.itens.get(F);if(!y)return;if(h.nivel==="agrupado"){C.has(y.classe)&&H(y.classe);return}let A=M.get(F);if(!A)return;Mt(!1),R=A;let D=S.get(A.classe),U=D?Math.max(36,.55*Ft(A.classe,ot(D))):36;vt(ot(A),ot(D||v),U)}function lt(){R=null}function et(){vr(),h.agrupadoPorFps&&(h.agrupadoPorFps=Zy({agrupadoPorFps:!0}).agrupadoPorFps,h.store&&Et(h.store))}function bt(){let F=h.estilo==="e",y=F?Gx:Hx,A=F?Wx:{x:0,y:0,z:0};if(!h.store){nn(),N.cameraPosition(c?ao(y):y,A,s?0:qp);return}h.chaveVista=W();let D=lx({pontos:oe(),alvo:A,direcao:{x:y.x-A.x,y:y.y-A.y,z:y.z-A.z},fov:N.camera().fov||50,largura:N.width(),altura:N.height(),margens:i()||{},maximo:vu-400});Wn(D.desvio),Ht(D.distancia),!D.girar&&h.girando?(Mt(!1),h.giroSuspenso=!0):D.girar&&h.giroSuspenso&&(h.giroSuspenso=!1,Mt(!0)),N.cameraPosition(D.camera,A,s?0:qp)}function Ht(F){at.fog&&(at.fog.density=Math.min(Xx,1.1/Math.max(1,F)))}function he(F){return h.transicao&&h.transicao.para.get(F)||ot(F)}function oe(){let F=[jn(qe({},he(v)),{raio:38,rotulo:!0})],y=h.nivel==="agrupado";for(let A of y?C.values():S.values()){let D=y?Mu(A.total):h.estilo==="a"?75:12;F.push(jn(qe({},he(A)),{raio:D,rotulo:!0}))}if(!y){let A=[...M.values()],D=Math.max(1,Math.ceil(A.length/1500));for(let U=0;U<A.length;U+=D)F.push(jn(qe({},he(A[U])),{raio:en.haloEquipamento/2}))}return F}function Wn(F){let y=N.camera();if(!y||typeof y.setViewOffset!="function")return;let A=N.width(),D=N.height();if(e.dataset.desvio=F?`${F.x},${F.y}`:"0,0",!F||!F.x&&!F.y){nn();return}y.setViewOffset(A,D,-F.x,F.y,A,D)}function nn(){let F=N.camera();F&&F.view&&F.view.enabled&&typeof F.clearViewOffset=="function"&&F.clearViewOffset()}function ao(F){let y=N.width(),A=N.height();if(!(y>0&&A>0))return F;let D=Math.tan((N.camera().fov||50)*Math.PI/360),U=D*(y/A),O=Math.max(.5,1-2*qx.lado/y),q=Math.max(.5,1-2*qx.cima/A),Z=Math.max(jx/(U*O),jx/(D*q)),ct=Math.hypot(F.x,F.y,F.z),Q=Math.min(tD,Math.max(ct,Z))/ct;return{x:F.x*Q,y:F.y*Q,z:F.z*Q}}function bi(){h.destruido||(et(),R=null,h.foco!==null&&(h.foco=null,jt()),Mt(!0),bt())}function co(F){if(h.destruido)return;let y=$x(F);y!==h.estilo&&(h.estilo=y,et(),h.store&&(wt({todos:!0,animar:y!=="a"}),_e(),Qt(),N.d3ReheatSimulation()),!h.foco&&!R?bt():h.transicao||dt())}function Ha(){let F=f.media();if(h.nivel!=="completo"||!$y(F,s)){h.bloom=!1;return}let y=N.postProcessingComposer(),A=new ro(new it(N.width(),N.height()),1,.5,.55),D=new fu;y.addPass(A),y.addPass(D),Vp(d,!0),h.bloom={passe:A,saida:D}}function Ga(){if(h.bloom){let F=N.postProcessingComposer();F.removePass(h.bloom.passe),F.removePass(h.bloom.saida),h.bloom.passe.dispose(),h.bloom.saida.dispose(),Vp(d,!1)}h.bloom!==null&&(h.bloom=!1)}function _r(F){var O;if(m=requestAnimationFrame(_r),f.quadro(),h.inicioRender===null&&(h.inicioRender=F),h.bloom===null&&F-h.inicioRender>=QI&&Ha(),F-h.ultimoCheque>=1e3&&(h.ultimoCheque=F,h.store&&!h.agrupadoPorFps)){let q=Dp({total:h.total,agrupadoPorFps:!1,queda:Yy(f),agora:F,ultimaEntrada:h.ultimaEntradaFps});q.agrupadoPorFps&&(h.agrupadoPorFps=!0,h.ultimaEntradaFps=q.ultimaEntrada,Et(h.store))}let y=h.transicao;if(y){y.inicio===null&&(y.inicio=F);let q=iD(Math.min(1,(F-y.inicio)/JI));for(let[Z,ct]of y.para){let Q=y.de.get(Z);Z.fx=Q.x+(ct.x-Q.x)*q,Z.fy=Q.y+(ct.y-Q.y)*q,Z.fz=Q.z+(ct.z-Q.z)*q}q>=1&&(h.transicao=null,dt())}F-h.ultimaLeitura>=eD&&(h.ultimaLeitura=F,J());let A=F/1e3;if(Ae(A),Ie(),Pt(),s)return;let D=(O=v.__threeObj)==null?void 0:O.userData.aneis;D&&(D[0].rotation.x=A*.5,D[0].rotation.y=A*.3,D[1].rotation.y=-A*.25,D[1].rotation.z=A*.2),$.rotation.y=A*.004,$.rotation.x=Math.sin(A*.05)*.02;let U=Math.abs(Math.sin(A*3.2));for(let q of T){let Z=q.__threeObj;if(!Z)continue;let ct=Z.userData,Q=ct.escala||1;if(ct.aparencia.pulsa){let ut=Q>1?.25:.55,St=Q>1?1:1.4,nt=en.haloEquipamento*Q*(1+ut*U)*St;ct.halo.scale.set(nt,nt,1),ct.esfera.scale.setScalar(Q*(Q>1?.95+.1*U:.85+.3*U))}else ct.aparencia.treme&&ct.esfera.position.set(Math.sin(A*37+ct.semente)*.35,Math.cos(A*41+ct.semente)*.35,0)}}function lo(){m===null&&(m=requestAnimationFrame(_r))}function vr(){f=Ip(),h.inicioRender=null,h.ultimoCheque=0}function Wa(){h.destruido||h.pausado||(h.pausado=!0,m!==null&&cancelAnimationFrame(m),m=null,N.pauseAnimation())}function ja(){h.destruido||!h.pausado||(h.pausado=!1,N.resumeAnimation(),et(),lo())}function qa(){document.visibilityState==="visible"&&!h.pausado&&vr()}document.addEventListener("visibilitychange",qa);function ho(){let F=e.clientWidth,y=e.clientHeight;F>0&&y>0&&(F!==N.width()||y!==N.height())&&(N.width(F).height(y),!R&&h.foco===null?bt():nn())}let Jr=null;typeof ResizeObserver=="function"?(Jr=new ResizeObserver(ho),Jr.observe(e)):window.addEventListener("resize",ho);function wu(F){F.traverse(y=>{var D,U;(D=y.geometry)==null||D.dispose();let A=Array.isArray(y.material)?y.material:y.material?[y.material]:[];for(let O of A)(U=O.map)==null||U.dispose(),O.dispose()})}function Eu(){var A;if(h.destruido)return;h.destruido=!0,m!==null&&cancelAnimationFrame(m),m=null,document.removeEventListener("visibilitychange",qa),Jr?Jr.disconnect():window.removeEventListener("resize",ho);let F=N.renderer(),y=N.postProcessingComposer();N.pauseAnimation(),N.onNodeClick(null).onNodeHover(null),wu(at),d.liberar(),_.liberarTudo(),N._destructor();for(let D of y.passes)(A=D.dispose)==null||A.call(D);for(y.dispose(),pt.dispose(),at.clear(),at.fog=null,F.dispose(),F.forceContextLoss(),T.clear(),K.clear(),R=null,M.clear(),S.clear(),C.clear(),P.clear();e.firstChild;)e.removeChild(e.firstChild);e.style.cursor="",e.classList.remove("teia-cena"),delete e.dataset.nos,delete e.dataset.equipamentos,delete e.dataset.nivel,delete e.dataset.movimento;for(let D of["nosGrafo","girando","particulas","camera","geometrias","texturas","rotulosIp"])delete e.dataset[D]}return L(),lo(),{sincronizar:Et,atualizarEstado:At,definirEstilo:co,focarClasse:H,focarEquipamento:xt,limparSelecao:lt,reenquadrar:dt,verTudo:bi,pausar:Wa,retomar:ja,destruir:Eu,nivel:()=>h.nivel}}window.SentinelaTeiaParede={montarTeia:Yx};
