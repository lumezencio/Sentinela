var Wx=Object.create;var Mu=Object.defineProperty,jx=Object.defineProperties,qx=Object.getOwnPropertyDescriptor,Xx=Object.getOwnPropertyDescriptors,$x=Object.getOwnPropertyNames,Gp=Object.getOwnPropertySymbols,Yx=Object.getPrototypeOf,Wp=Object.prototype.hasOwnProperty,Zx=Object.prototype.propertyIsEnumerable;var jp=t=>{throw TypeError(t)};var bu=(t,e,n)=>e in t?Mu(t,e,{enumerable:!0,configurable:!0,writable:!0,value:n}):t[e]=n,Tn=(t,e)=>{for(var n in e||(e={}))Wp.call(e,n)&&bu(t,n,e[n]);if(Gp)for(var n of Gp(e))Zx.call(e,n)&&bu(t,n,e[n]);return t},Zi=(t,e)=>jx(t,Xx(e));var gn=(t,e)=>()=>{try{return e||t((e={exports:{}}).exports,e),e.exports}catch(n){throw e=0,n}};var Kx=(t,e,n,i)=>{if(e&&typeof e=="object"||typeof e=="function")for(let r of $x(e))!Wp.call(t,r)&&r!==n&&Mu(t,r,{get:()=>e[r],enumerable:!(i=qx(e,r))||i.enumerable});return t};var Jx=(t,e,n)=>(n=t!=null?Wx(Yx(t)):{},Kx(e||!t||!t.__esModule?Mu(n,"default",{value:t,enumerable:!0}):n,t));var qp=(t,e,n)=>bu(t,typeof e!="symbol"?e+"":e,n),Xp=(t,e,n)=>e.has(t)||jp("Cannot "+n);var $a=(t,e,n)=>(Xp(t,e,"read from private field"),n?n.call(t):e.get(t)),Su=(t,e,n)=>e.has(t)?jp("Cannot add the same private member more than once"):e instanceof WeakSet?e.add(t):e.set(t,n),wu=(t,e,n,i)=>(Xp(t,e,"write to private field"),i?i.call(t,n):e.set(t,n),n);var hd=gn((LF,V0)=>{V0.exports=function(e){return e===0?"x":e===1?"y":e===2?"z":"c"+(e+1)}});var Xr=gn((OF,H0)=>{var uT=hd();H0.exports=function(e){return n;function n(i,r){let s=r&&r.indent||0,o=r&&r.join!==void 0?r.join:`
`,a=Array(s+1).join(" "),c=[];for(let l=0;l<e;++l){let u=uT(l),h=l===0?"":a;c.push(h+i.replace(/{var}/g,u))}return c.join(o)}}});var X0=gn((NF,ba)=>{var G0=Xr();ba.exports=fT;ba.exports.generateCreateBodyFunctionBody=W0;ba.exports.getVectorCode=q0;ba.exports.getBodyCode=j0;function fT(t,e){let n=W0(t,e),{Body:i}=new Function(n)();return i}function W0(t,e){return`
${q0(t,e)}
${j0(t,e)}
return {Body: Body, Vector: Vector};
`}function j0(t){let e=G0(t),n=e("{var}",{join:", "});return`
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
  ${e("this.pos.{var} = {var} || 0;",{indent:2})}
};`}function q0(t,e){let n=G0(t),i="";return e&&(i=`${n(`
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
  };`}});var e_=gn((FF,fr)=>{var ud=Xr(),ur=hd();fr.exports=dT;fr.exports.generateQuadTreeFunctionBody=$0;fr.exports.getInsertStackCode=Q0;fr.exports.getQuadNodeCode=J0;fr.exports.isSamePosition=Y0;fr.exports.getChildBodyCode=K0;fr.exports.setChildBodyCode=Z0;function dT(t){let e=$0(t);return new Function(e)()}function $0(t){let e=ud(t),n=Math.pow(2,t);return`
${Q0()}
${J0(t)}
${Y0(t)}
${K0(t)}
${Z0(t)}

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
      node.mass = ${e("node.mass_{var} = ",{join:""})}0;
      ${e("node.min_{var} = node.max_{var} = ",{join:""})}0;
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
    ${e("var d{var};",{indent:4})}
    var r; 
    ${e("var f{var} = 0;",{indent:4})}
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
        ${e("d{var} = body.pos.{var} - sourceBody.pos.{var};",{indent:8})}
        r = Math.sqrt(${e("d{var} * d{var}",{join:" + "})});

        if (r === 0) {
          // Poor man's protection against zero distance.
          ${e("d{var} = (random.nextDouble() - 0.5) / 50;",{indent:10})}
          r = Math.sqrt(${e("d{var} * d{var}",{join:" + "})});
        }

        // This is standard gravitation force calculation but we divide
        // by r^3 to save two operations when normalizing force vector.
        v = gravity * body.mass * sourceBody.mass / (r * r * r);
        ${e("f{var} += v * d{var};",{indent:8})}
      } else if (differentBody) {
        // Otherwise, calculate the ratio s / r,  where s is the width of the region
        // represented by the internal node, and r is the distance between the body
        // and the node's center-of-mass
        ${e("d{var} = node.mass_{var} / node.mass - sourceBody.pos.{var};",{indent:8})}
        r = Math.sqrt(${e("d{var} * d{var}",{join:" + "})});

        if (r === 0) {
          // Sorry about code duplication. I don't want to create many functions
          // right away. Just want to see performance first.
          ${e("d{var} = (random.nextDouble() - 0.5) / 50;",{indent:10})}
          r = Math.sqrt(${e("d{var} * d{var}",{join:" + "})});
        }
        // If s / r < \u03B8, treat this internal node as a single body, and calculate the
        // force it exerts on sourceBody, and add this amount to sourceBody's net force.
        if ((node.max_${ur(0)} - node.min_${ur(0)}) / r < theta) {
          // in the if statement above we consider node's width only
          // because the region was made into square during tree creation.
          // Thus there is no difference between using width or height.
          v = gravity * node.mass * sourceBody.mass / (r * r * r);
          ${e("f{var} += v * d{var};",{indent:10})}
        } else {
          // Otherwise, run the procedure recursively on each of the current node's children.

          // I intentionally unfolded this loop, to save several CPU cycles.
${s()}
        }
      }
    }

    ${e("sourceBody.force.{var} += f{var};",{indent:4})}
  }

  function insertBodies(bodies) {
    ${e("var {var}min = Number.MAX_VALUE;",{indent:4})}
    ${e("var {var}max = Number.MIN_VALUE;",{indent:4})}
    var i = bodies.length;

    // To reduce quad tree depth we are looking for exact bounding box of all particles.
    while (i--) {
      var pos = bodies[i].pos;
      ${e("if (pos.{var} < {var}min) {var}min = pos.{var};",{indent:6})}
      ${e("if (pos.{var} > {var}max) {var}max = pos.{var};",{indent:6})}
    }

    // Makes the bounds square.
    var maxSideLength = -Infinity;
    ${e("if ({var}max - {var}min > maxSideLength) maxSideLength = {var}max - {var}min ;",{indent:4})}

    currentInCache = 0;
    root = newNode();
    ${e("root.min_{var} = {var}min;",{indent:4})}
    ${e("root.max_{var} = {var}min + maxSideLength;",{indent:4})}

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
        ${e("var {var} = body.pos.{var};",{indent:8})}
        node.mass += body.mass;
        ${e("node.mass_{var} += body.mass * {var};",{indent:8})}

        // Recursively insert the body in the appropriate quadrant.
        // But first find the appropriate quadrant.
        var quadIdx = 0; // Assume we are in the 0's quad.
        ${e("var min_{var} = node.min_{var};",{indent:8})}
        ${e("var max_{var} = (min_{var} + node.max_{var}) / 2;",{indent:8})}

${r(8)}

        var child = getChild(node, quadIdx);

        if (!child) {
          // The node is internal but this quadrant is not taken. Add
          // subnode to it.
          child = newNode();
          ${e("child.min_{var} = min_{var};",{indent:10})}
          ${e("child.max_{var} = max_{var};",{indent:10})}
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
            ${e("var d{var} = (node.max_{var} - node.min_{var}) * offset;",{indent:12})}

            ${e("oldBody.pos.{var} = node.min_{var} + d{var};",{indent:12})}
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

`;function r(a){let c=[],l=Array(a+1).join(" ");for(let u=0;u<t;++u)c.push(l+`if (${ur(u)} > max_${ur(u)}) {`),c.push(l+`  quadIdx = quadIdx + ${Math.pow(2,u)};`),c.push(l+`  min_${ur(u)} = max_${ur(u)};`),c.push(l+`  max_${ur(u)} = node.max_${ur(u)};`),c.push(l+"}");return c.join(`
`)}function s(){let a=Array(11).join(" "),c=[];for(let l=0;l<n;++l)c.push(a+`if (node.quad${l}) {`),c.push(a+`  queue[pushIdx] = node.quad${l};`),c.push(a+"  queueLength += 1;"),c.push(a+"  pushIdx += 1;"),c.push(a+"}");return c.join(`
`)}function o(a){let c=[];for(let l=0;l<n;++l)c.push(`${a}quad${l} = null;`);return c.join(`
`)}}function Y0(t){let e=ud(t);return`
  function isSamePosition(point1, point2) {
    ${e("var d{var} = Math.abs(point1.{var} - point2.{var});",{indent:2})}
  
    return ${e("d{var} < 1e-8",{join:" && "})};
  }  
`}function Z0(t){var e=Math.pow(2,t);return`
function setChild(node, idx, child) {
  ${n()}
}`;function n(){let i=[];for(let r=0;r<e;++r){let s=r===0?"  ":"  else ";i.push(`${s}if (idx === ${r}) node.quad${r} = child;`)}return i.join(`
`)}}function K0(t){return`function getChild(node, idx) {
${e()}
  return null;
}`;function e(){let n=[],i=Math.pow(2,t);for(let r=0;r<i;++r)n.push(`  if (idx === ${r}) return node.quad${r};`);return n.join(`
`)}}function J0(t){let e=ud(t),n=Math.pow(2,t);var i=`
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
  ${e("this.mass_{var} = 0;",{indent:2})}

  // bounding box coordinates
  ${e("this.min_{var} = 0;",{indent:2})}
  ${e("this.max_{var} = 0;",{indent:2})}
}
`;return i;function r(s){let o=[];for(let a=0;a<n;++a)o.push(`${s}quad${a} = null;`);return o.join(`
`)}}function Q0(){return`
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
`}});var n_=gn((UF,fd)=>{fd.exports=mT;fd.exports.generateFunctionBody=t_;var pT=Xr();function mT(t){let e=t_(t);return new Function("bodies","settings","random",e)}function t_(t){let e=pT(t);return`
  var boundingBox = {
    ${e("min_{var}: 0, max_{var}: 0,",{indent:4})}
  };

  return {
    box: boundingBox,

    update: updateBoundingBox,

    reset: resetBoundingBox,

    getBestNewPosition: function (neighbors) {
      var ${e("base_{var} = 0",{join:", "})};

      if (neighbors.length) {
        for (var i = 0; i < neighbors.length; ++i) {
          let neighborPos = neighbors[i].pos;
          ${e("base_{var} += neighborPos.{var};",{indent:10})}
        }

        ${e("base_{var} /= neighbors.length;",{indent:8})}
      } else {
        ${e("base_{var} = (boundingBox.min_{var} + boundingBox.max_{var}) / 2;",{indent:8})}
      }

      var springLength = settings.springLength;
      return {
        ${e("{var}: base_{var} + (random.nextDouble() - 0.5) * springLength,",{indent:8})}
      };
    }
  };

  function updateBoundingBox() {
    var i = bodies.length;
    if (i === 0) return; // No bodies - no borders.

    ${e("var max_{var} = -Infinity;",{indent:4})}
    ${e("var min_{var} = Infinity;",{indent:4})}

    while(i--) {
      // this is O(n), it could be done faster with quadtree, if we check the root node bounds
      var bodyPos = bodies[i].pos;
      ${e("if (bodyPos.{var} < min_{var}) min_{var} = bodyPos.{var};",{indent:6})}
      ${e("if (bodyPos.{var} > max_{var}) max_{var} = bodyPos.{var};",{indent:6})}
    }

    ${e("boundingBox.min_{var} = min_{var};",{indent:4})}
    ${e("boundingBox.max_{var} = max_{var};",{indent:4})}
  }

  function resetBoundingBox() {
    ${e("boundingBox.min_{var} = boundingBox.max_{var} = 0;",{indent:4})}
  }
`}});var r_=gn((zF,dd)=>{var gT=Xr();dd.exports=_T;dd.exports.generateCreateDragForceFunctionBody=i_;function _T(t){let e=i_(t);return new Function("options",e)}function i_(t){return`
  if (!Number.isFinite(options.dragCoefficient)) throw new Error('dragCoefficient is not a finite number');

  return {
    update: function(body) {
      ${gT(t)("body.force.{var} -= options.dragCoefficient * body.velocity.{var};",{indent:6})}
    }
  };
`}});var o_=gn((kF,pd)=>{var vT=Xr();pd.exports=yT;pd.exports.generateCreateSpringForceFunctionBody=s_;function yT(t){let e=s_(t);return new Function("options","random",e)}function s_(t){let e=vT(t);return`
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
      ${e("var d{var} = body2.pos.{var} - body1.pos.{var};",{indent:6})}
      var r = Math.sqrt(${e("d{var} * d{var}",{join:" + "})});

      if (r === 0) {
        ${e("d{var} = (random.nextDouble() - 0.5) / 50;",{indent:8})}
        r = Math.sqrt(${e("d{var} * d{var}",{join:" + "})});
      }

      var d = r - length;
      var coefficient = ((spring.coefficient > 0) ? spring.coefficient : options.springCoefficient) * d / r;

      ${e("body1.force.{var} += coefficient * d{var}",{indent:6})};
      body1.springCount += 1;
      body1.springLength += r;

      ${e("body2.force.{var} -= coefficient * d{var}",{indent:6})};
      body2.springCount += 1;
      body2.springLength += r;
    }
  };
`}});var c_=gn((BF,md)=>{var xT=Xr();md.exports=bT;md.exports.generateIntegratorFunctionBody=a_;function bT(t){let e=a_(t);return new Function("bodies","timeStep","adaptiveTimeStepWeight",e)}function a_(t){let e=xT(t);return`
  var length = bodies.length;
  if (length === 0) return 0;

  ${e("var d{var} = 0, t{var} = 0;",{indent:2})}

  for (var i = 0; i < length; ++i) {
    var body = bodies[i];
    if (body.isPinned) continue;

    if (adaptiveTimeStepWeight && body.springCount) {
      timeStep = (adaptiveTimeStepWeight * body.springLength/body.springCount);
    }

    var coeff = timeStep / body.mass;

    ${e("body.velocity.{var} += coeff * body.force.{var};",{indent:4})}
    ${e("var v{var} = body.velocity.{var};",{indent:4})}
    var v = Math.sqrt(${e("v{var} * v{var}",{join:" + "})});

    if (v > 1) {
      // We normalize it so that we move within timeStep range. 
      // for the case when v <= 1 - we let velocity to fade out.
      ${e("body.velocity.{var} = v{var} / v;",{indent:6})}
    }

    ${e("d{var} = timeStep * body.velocity.{var};",{indent:4})}

    ${e("body.pos.{var} += d{var};",{indent:4})}

    ${e("t{var} += Math.abs(d{var});",{indent:4})}
  }

  return (${e("t{var} * t{var}",{join:" + "})})/length;
`}});var h_=gn((VF,l_)=>{l_.exports=MT;function MT(t,e,n,i){this.from=t,this.to=e,this.length=n,this.coefficient=i}});var d_=gn((HF,f_)=>{f_.exports=u_;function u_(t,e){var n;if(t||(t={}),e){for(n in e)if(e.hasOwnProperty(n)){var i=t.hasOwnProperty(n),r=typeof e[n],s=!i||typeof t[n]!==r;s?t[n]=e[n]:r==="object"&&(t[n]=u_(t[n],e[n]))}}return t}});var gd=gn((GF,p_)=>{"use strict";function ST(t){ET(t);let e=wT(t);return t.on=e.on,t.off=e.off,t.fire=e.fire,t}function wT(t){let e=Object.create(null);return{on:function(n,i,r){if(typeof i!="function")throw new Error("callback is expected to be a function");let s=e[n];return s||(s=e[n]=[]),s.push({callback:i,ctx:r}),t},off:function(n,i){if(typeof n>"u")return e=Object.create(null),t;if(e[n])if(typeof i!="function")delete e[n];else{let r=e[n];for(let s=0;s<r.length;++s)r[s].callback===i&&r.splice(s,1)}return t},fire:function(n){let i=e[n];if(!i)return t;let r;arguments.length>1&&(r=Array.prototype.slice.call(arguments,1));for(let s=0;s<i.length;++s){let o=i[s];o.callback.apply(o.ctx,r)}return t}}}function ET(t){if(!t)throw new Error("Eventify cannot use falsy object as events subject");let e=["on","fire","off"];for(let n=0;n<e.length;++n)if(t.hasOwnProperty(e[n]))throw new Error("Subject cannot be eventified, since it already has property '"+e[n]+"'")}p_.exports=ST});var g_=gn((WF,vh)=>{vh.exports=_d;vh.exports.random=_d,vh.exports.randomIterator=RT;function _d(t){var e=typeof t=="number"?t:+new Date;return new $r(e)}function $r(t){this.seed=t}$r.prototype.next=CT;$r.prototype.nextDouble=vd;$r.prototype.uniform=vd;$r.prototype.gaussian=TT;$r.prototype.random=vd;function TT(){var t,e,n;do e=this.nextDouble()*2-1,n=this.nextDouble()*2-1,t=e*e+n*n;while(t>=1||t===0);return e*Math.sqrt(-2*Math.log(t)/t)}$r.prototype.levy=AT;function AT(){var t=1.5,e=Math.pow(m_(1+t)*Math.sin(Math.PI*t/2)/(m_((1+t)/2)*t*Math.pow(2,(t-1)/2)),1/t);return this.gaussian()*e/Math.pow(Math.abs(this.gaussian()),1/t)}function m_(t){return Math.sqrt(2*Math.PI/t)*Math.pow(1/Math.E*(t+1/(12*t-1/(10*t))),t)}function vd(){var t=this.seed;return t=t+2127912214+(t<<12)&4294967295,t=(t^3345072700^t>>>19)&4294967295,t=t+374761393+(t<<5)&4294967295,t=(t+3550635116^t<<9)&4294967295,t=t+4251993797+(t<<3)&4294967295,t=(t^3042594569^t>>>16)&4294967295,this.seed=t,(t&268435455)/268435456}function CT(t){return Math.floor(this.nextDouble()*t)}function RT(t,e){var n=e||_d();if(typeof n.next!="function")throw new Error("customRandom does not match expected API: next() function is missing");return{forEach:r,shuffle:i};function i(){var s,o,a;for(s=t.length-1;s>0;--s)o=n.next(s+1),a=t[o],t[o]=t[s],t[s]=a;return t}function r(s){var o,a,c;for(o=t.length-1;o>0;--o)a=n.next(o+1),c=t[a],t[a]=t[o],t[o]=c,s(c);t.length&&s(t[0])}}});var yd=gn((jF,v_)=>{v_.exports=FT;var PT=X0(),IT=e_(),DT=n_(),LT=r_(),OT=o_(),NT=c_(),__={};function FT(t){var e=h_(),n=d_(),i=gd();if(t){if(t.springCoeff!==void 0)throw new Error("springCoeff was renamed to springCoefficient");if(t.dragCoeff!==void 0)throw new Error("dragCoeff was renamed to dragCoefficient")}t=n(t,{springLength:10,springCoefficient:.8,gravity:-12,theta:.8,dragCoefficient:.9,timeStep:.5,adaptiveTimeStepWeight:0,dimensions:2,debug:!1});var r=__[t.dimensions];if(!r){var s=t.dimensions;r={Body:PT(s,t.debug),createQuadTree:IT(s),createBounds:DT(s),createDragForce:LT(s),createSpringForce:OT(s),integrate:NT(s)},__[s]=r}var o=r.Body,a=r.createQuadTree,c=r.createBounds,l=r.createDragForce,u=r.createSpringForce,h=r.integrate,f=D=>new o(D),d=g_().random(42),m=[],_=[],g=a(t,d),p=c(m,t,d),x=u(t,d),y=l(t),v=0,b=[],M=new Map,A=0;w("nbody",U),w("spring",O);var C={bodies:m,quadTree:g,springs:_,settings:t,addForce:w,removeForce:P,getForces:z,step:function(){for(var D=0;D<b.length;++D)b[D](A);var V=h(m,t.timeStep,t.adaptiveTimeStepWeight);return A+=1,V},addBody:function(D){if(!D)throw new Error("Body is required");return m.push(D),D},addBodyAt:function(D){if(!D)throw new Error("Body position is required");var V=f(D);return m.push(V),V},removeBody:function(D){if(D){var V=m.indexOf(D);if(!(V<0))return m.splice(V,1),m.length===0&&p.reset(),!0}},addSpring:function(D,V,Q,j){if(!D||!V)throw new Error("Cannot add null spring to force simulator");typeof Q!="number"&&(Q=-1);var ae=new e(D,V,Q,j>=0?j:-1);return _.push(ae),ae},getTotalMovement:function(){return v},removeSpring:function(D){if(D){var V=_.indexOf(D);if(V>-1)return _.splice(V,1),!0}},getBestNewBodyPosition:function(D){return p.getBestNewPosition(D)},getBBox:T,getBoundingBox:T,invalidateBBox:function(){console.warn("invalidateBBox() is deprecated, bounds always recomputed on `getBBox()` call")},gravity:function(D){return D!==void 0?(t.gravity=D,g.options({gravity:D}),this):t.gravity},theta:function(D){return D!==void 0?(t.theta=D,g.options({theta:D}),this):t.theta},random:d};return UT(t,C),i(C),C;function T(){return p.update(),p.box}function w(D,V){if(M.has(D))throw new Error("Force "+D+" is already added");M.set(D,V),b.push(V)}function P(D){var V=b.indexOf(M.get(D));V<0||(b.splice(V,1),M.delete(D))}function z(){return M}function U(){if(m.length!==0){g.insertBodies(m);for(var D=m.length;D--;){var V=m[D];V.isPinned||(V.reset(),g.updateBodyForce(V),y.update(V))}}}function O(){for(var D=_.length;D--;)x.update(_[D])}}function UT(t,e){for(var n in t)zT(t,e,n)}function zT(t,e,n){if(t.hasOwnProperty(n)&&typeof e[n]!="function"){var i=Number.isFinite(t[n]);i?e[n]=function(r){if(r!==void 0){if(!Number.isFinite(r))throw new Error("Value of "+n+" should be a valid number.");return t[n]=r,e}return t[n]}:e[n]=function(r){return r!==void 0?(t[n]=r,e):t[n]}}}});var y_=gn((qF,xd)=>{xd.exports=BT;xd.exports.simulator=yd();var kT=gd();function BT(t,e){if(!t)throw new Error("Graph structure cannot be undefined");var n=e&&e.createSimulator||yd(),i=n(e);if(Array.isArray(e))throw new Error("Physics settings is expected to be an object");var r=t.version>19?U:z;e&&typeof e.nodeMass=="function"&&(r=e.nodeMass);var s=new Map,o={},a=0,c=i.settings.springTransform||VT;y(),g();var l=!1,u={step:function(){if(a===0)return h(!0),!0;var O=i.step();u.lastMove=O,u.fire("step");var D=O/a,V=D<=.01;return h(V),V},getNodePosition:function(O){return P(O).pos},setNodePosition:function(O){var D=P(O);D.setPosition.apply(D,Array.prototype.slice.call(arguments,1))},getLinkPosition:function(O){var D=o[O];if(D)return{from:D.from.pos,to:D.to.pos}},getGraphRect:function(){return i.getBBox()},forEachBody:f,pinNode:function(O,D){var V=P(O.id);V.isPinned=!!D},isNodePinned:function(O){return P(O.id).isPinned},dispose:function(){t.off("changed",x),u.fire("disposed")},getBody:_,getSpring:m,getForceVectorLength:d,simulator:i,graph:t,lastMove:0};return kT(u),u;function h(O){l!==O&&(l=O,p(O))}function f(O){s.forEach(O)}function d(){var O=0,D=0;return f(function(V){O+=Math.abs(V.force.x),D+=Math.abs(V.force.y)}),Math.sqrt(O*O+D*D)}function m(O,D){var V;if(D===void 0)typeof O!="object"?V=O:V=O.id;else{var Q=t.hasLink(O,D);if(!Q)return;V=Q.id}return o[V]}function _(O){return s.get(O)}function g(){t.on("changed",x)}function p(O){u.fire("stable",O)}function x(O){for(var D=0;D<O.length;++D){var V=O[D];V.changeType==="add"?(V.node&&v(V.node.id),V.link&&M(V.link)):V.changeType==="remove"&&(V.node&&b(V.node),V.link&&A(V.link))}a=t.getNodesCount()}function y(){a=0,t.forEachNode(function(O){v(O.id),a+=1}),t.forEachLink(M)}function v(O){var D=s.get(O);if(!D){var V=t.getNode(O);if(!V)throw new Error("initBody() was called with unknown node id");var Q=V.position;if(!Q){var j=C(V);Q=i.getBestNewBodyPosition(j)}D=i.addBodyAt(Q),D.id=O,s.set(O,D),T(O),w(V)&&(D.isPinned=!0)}}function b(O){var D=O.id,V=s.get(D);V&&(s.delete(D),i.removeBody(V))}function M(O){T(O.fromId),T(O.toId);var D=s.get(O.fromId),V=s.get(O.toId),Q=i.addSpring(D,V,O.length);c(O,Q),o[O.id]=Q}function A(O){var D=o[O.id];if(D){var V=t.getNode(O.fromId),Q=t.getNode(O.toId);V&&T(V.id),Q&&T(Q.id),delete o[O.id],i.removeSpring(D)}}function C(O){var D=[];if(!O.links)return D;for(var V=Math.min(O.links.length,2),Q=0;Q<V;++Q){var j=O.links[Q],ae=j.fromId!==O.id?s.get(j.fromId):s.get(j.toId);ae&&ae.pos&&D.push(ae)}return D}function T(O){var D=s.get(O);if(D.mass=r(O),Number.isNaN(D.mass))throw new Error("Node mass should be a number")}function w(O){return O&&(O.isPinned||O.data&&O.data.isPinned)}function P(O){var D=s.get(O);return D||(v(O),D=s.get(O)),D}function z(O){var D=t.getLinks(O);return D?1+D.length/3:1}function U(O){var D=t.getLinks(O);return D?1+D.size/3:1}}function VT(){}});typeof Object.hasOwn!="function"&&Object.defineProperty(Object,"hasOwn",{value:(t,e)=>Object.prototype.hasOwnProperty.call(t,e),configurable:!0,writable:!0});typeof window.queueMicrotask!="function"&&(window.queueMicrotask=t=>{Promise.resolve().then(t).catch(e=>{window.setTimeout(()=>{throw e},0)})});if(typeof window.AbortController!="function"){class t{constructor(){this.aborted=!1,this.onabort=null}addEventListener(){}removeEventListener(){}}window.AbortController=class{constructor(){this.signal=new t}abort(){this.signal.aborted=!0,typeof this.signal.onabort=="function"&&this.signal.onabort()}}}var Ut={LEFT:0,MIDDLE:1,RIGHT:2,ROTATE:0,DOLLY:1,PAN:2},jn={ROTATE:0,PAN:1,DOLLY_PAN:2,DOLLY_ROTATE:3},Tm=0,lf=1,Am=2;var hf=1,Cm=2,yi=3,Ui=0,Kt=1,xi=2,si=0,Dr=1,ar=2,uf=3,ff=4,Rm=5,rr=100,Pm=101,Im=102,Dm=103,Lm=104,Om=200,Nm=201,Fm=202,Um=203,Sc=204,wc=205,zm=206,km=207,Bm=208,Vm=209,Hm=210,Gm=211,Wm=212,jm=213,qm=214,rl=0,sl=1,ol=2,Lr=3,al=4,cl=5,ll=6,hl=7,ul=0,Xm=1,$m=2,Vi=0,fl=1,dl=2,pl=3,ml=4,gl=5,_l=6,vl=7;var df=300,kr=301,Br=302,yl=303,xl=304,ca=306,Ec=1e3,ir=1001,Tc=1002,Vn=1003,Ym=1004;var la=1005;var ii=1006,bl=1007;var cr=1008;var oi=1009,pf=1010,mf=1011,Vs=1012,Ml=1013,lr=1014,bi=1015,qn=1016,Sl=1017,wl=1018,Hs=1020,gf=35902,_f=35899,vf=1021,yf=1022,Xn=1023,Ts=1026,Gs=1027,xf=1028,El=1029,bf=1030,Tl=1031;var Al=1033,ha=33776,ua=33777,fa=33778,da=33779,Cl=35840,Rl=35841,Pl=35842,Il=35843,Dl=36196,Ll=37492,Ol=37496,Nl=37808,Fl=37809,Ul=37810,zl=37811,kl=37812,Bl=37813,Vl=37814,Hl=37815,Gl=37816,Wl=37817,jl=37818,ql=37819,Xl=37820,$l=37821,Yl=36492,Zl=36494,Kl=36495,Jl=36283,Ql=36284,eh=36285,th=36286;var Lo=2300,Ac=2301,bc=2302,Qu=2400,ef=2401,tf=2402;var Zm=3200,Km=3201;var nh=0,Jm=1,Hi="",Yt="srgb",Or="srgb-linear",Oo="linear",lt="srgb";var Ir=7680;var nf=519,Qm=512,eg=513,tg=514,Mf=515,ng=516,ig=517,rg=518,sg=519,Cc=35044;var Sf="300 es",ni=2e3,No=2001;var di=class{addEventListener(e,n){this._listeners===void 0&&(this._listeners={});let i=this._listeners;i[e]===void 0&&(i[e]=[]),i[e].indexOf(n)===-1&&i[e].push(n)}hasEventListener(e,n){let i=this._listeners;return i===void 0?!1:i[e]!==void 0&&i[e].indexOf(n)!==-1}removeEventListener(e,n){let i=this._listeners;if(i===void 0)return;let r=i[e];if(r!==void 0){let s=r.indexOf(n);s!==-1&&r.splice(s,1)}}dispatchEvent(e){let n=this._listeners;if(n===void 0)return;let i=n[e.type];if(i!==void 0){e.target=this;let r=i.slice(0);for(let s=0,o=r.length;s<o;s++)r[s].call(this,e);e.target=null}}},Qt=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],$p=1234567,Ro=Math.PI/180,As=180/Math.PI;function Ni(){let t=Math.random()*4294967295|0,e=Math.random()*4294967295|0,n=Math.random()*4294967295|0,i=Math.random()*4294967295|0;return(Qt[t&255]+Qt[t>>8&255]+Qt[t>>16&255]+Qt[t>>24&255]+"-"+Qt[e&255]+Qt[e>>8&255]+"-"+Qt[e>>16&15|64]+Qt[e>>24&255]+"-"+Qt[n&63|128]+Qt[n>>8&255]+"-"+Qt[n>>16&255]+Qt[n>>24&255]+Qt[i&255]+Qt[i>>8&255]+Qt[i>>16&255]+Qt[i>>24&255]).toLowerCase()}function tt(t,e,n){return Math.max(e,Math.min(n,t))}function wf(t,e){return(t%e+e)%e}function Qx(t,e,n,i,r){return i+(t-e)*(r-i)/(n-e)}function eb(t,e,n){return t!==e?(n-t)/(e-t):0}function Po(t,e,n){return(1-n)*t+n*e}function tb(t,e,n,i){return Po(t,e,1-Math.exp(-n*i))}function nb(t,e=1){return e-Math.abs(wf(t,e*2)-e)}function ib(t,e,n){return t<=e?0:t>=n?1:(t=(t-e)/(n-e),t*t*(3-2*t))}function rb(t,e,n){return t<=e?0:t>=n?1:(t=(t-e)/(n-e),t*t*t*(t*(t*6-15)+10))}function sb(t,e){return t+Math.floor(Math.random()*(e-t+1))}function ob(t,e){return t+Math.random()*(e-t)}function ab(t){return t*(.5-Math.random())}function cb(t){t!==void 0&&($p=t);let e=$p+=1831565813;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}function lb(t){return t*Ro}function hb(t){return t*As}function ub(t){return(t&t-1)===0&&t!==0}function fb(t){return Math.pow(2,Math.ceil(Math.log(t)/Math.LN2))}function db(t){return Math.pow(2,Math.floor(Math.log(t)/Math.LN2))}function pb(t,e,n,i,r){let s=Math.cos,o=Math.sin,a=s(n/2),c=o(n/2),l=s((e+i)/2),u=o((e+i)/2),h=s((e-i)/2),f=o((e-i)/2),d=s((i-e)/2),m=o((i-e)/2);switch(r){case"XYX":t.set(a*u,c*h,c*f,a*l);break;case"YZY":t.set(c*f,a*u,c*h,a*l);break;case"ZXZ":t.set(c*h,c*f,a*u,a*l);break;case"XZX":t.set(a*u,c*m,c*d,a*l);break;case"YXY":t.set(c*d,a*u,c*m,a*l);break;case"ZYZ":t.set(c*m,c*d,a*u,a*l);break;default:console.warn("THREE.MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+r)}}function ti(t,e){switch(e.constructor){case Float32Array:return t;case Uint32Array:return t/4294967295;case Uint16Array:return t/65535;case Uint8Array:return t/255;case Int32Array:return Math.max(t/2147483647,-1);case Int16Array:return Math.max(t/32767,-1);case Int8Array:return Math.max(t/127,-1);default:throw new Error("Invalid component type.")}}function pt(t,e){switch(e.constructor){case Float32Array:return t;case Uint32Array:return Math.round(t*4294967295);case Uint16Array:return Math.round(t*65535);case Uint8Array:return Math.round(t*255);case Int32Array:return Math.round(t*2147483647);case Int16Array:return Math.round(t*32767);case Int8Array:return Math.round(t*127);default:throw new Error("Invalid component type.")}}var gt={DEG2RAD:Ro,RAD2DEG:As,generateUUID:Ni,clamp:tt,euclideanModulo:wf,mapLinear:Qx,inverseLerp:eb,lerp:Po,damp:tb,pingpong:nb,smoothstep:ib,smootherstep:rb,randInt:sb,randFloat:ob,randFloatSpread:ab,seededRandom:cb,degToRad:lb,radToDeg:hb,isPowerOfTwo:ub,ceilPowerOfTwo:fb,floorPowerOfTwo:db,setQuaternionFromProperEuler:pb,normalize:pt,denormalize:ti},ie=class t{constructor(e=0,n=0){t.prototype.isVector2=!0,this.x=e,this.y=n}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,n){return this.x=e,this.y=n,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,n){switch(e){case 0:this.x=n;break;case 1:this.y=n;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,n){return this.x=e.x+n.x,this.y=e.y+n.y,this}addScaledVector(e,n){return this.x+=e.x*n,this.y+=e.y*n,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,n){return this.x=e.x-n.x,this.y=e.y-n.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){let n=this.x,i=this.y,r=e.elements;return this.x=r[0]*n+r[3]*i+r[6],this.y=r[1]*n+r[4]*i+r[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,n){return this.x=tt(this.x,e.x,n.x),this.y=tt(this.y,e.y,n.y),this}clampScalar(e,n){return this.x=tt(this.x,e,n),this.y=tt(this.y,e,n),this}clampLength(e,n){let i=this.length();return this.divideScalar(i||1).multiplyScalar(tt(i,e,n))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){let n=Math.sqrt(this.lengthSq()*e.lengthSq());if(n===0)return Math.PI/2;let i=this.dot(e)/n;return Math.acos(tt(i,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let n=this.x-e.x,i=this.y-e.y;return n*n+i*i}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,n){return this.x+=(e.x-this.x)*n,this.y+=(e.y-this.y)*n,this}lerpVectors(e,n,i){return this.x=e.x+(n.x-e.x)*i,this.y=e.y+(n.y-e.y)*i,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,n=0){return this.x=e[n],this.y=e[n+1],this}toArray(e=[],n=0){return e[n]=this.x,e[n+1]=this.y,e}fromBufferAttribute(e,n){return this.x=e.getX(n),this.y=e.getY(n),this}rotateAround(e,n){let i=Math.cos(n),r=Math.sin(n),s=this.x-e.x,o=this.y-e.y;return this.x=s*i-o*r+e.x,this.y=s*r+o*i+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}},Ht=class{constructor(e=0,n=0,i=0,r=1){this.isQuaternion=!0,this._x=e,this._y=n,this._z=i,this._w=r}static slerpFlat(e,n,i,r,s,o,a){let c=i[r+0],l=i[r+1],u=i[r+2],h=i[r+3],f=s[o+0],d=s[o+1],m=s[o+2],_=s[o+3];if(a===0){e[n+0]=c,e[n+1]=l,e[n+2]=u,e[n+3]=h;return}if(a===1){e[n+0]=f,e[n+1]=d,e[n+2]=m,e[n+3]=_;return}if(h!==_||c!==f||l!==d||u!==m){let g=1-a,p=c*f+l*d+u*m+h*_,x=p>=0?1:-1,y=1-p*p;if(y>Number.EPSILON){let b=Math.sqrt(y),M=Math.atan2(b,p*x);g=Math.sin(g*M)/b,a=Math.sin(a*M)/b}let v=a*x;if(c=c*g+f*v,l=l*g+d*v,u=u*g+m*v,h=h*g+_*v,g===1-a){let b=1/Math.sqrt(c*c+l*l+u*u+h*h);c*=b,l*=b,u*=b,h*=b}}e[n]=c,e[n+1]=l,e[n+2]=u,e[n+3]=h}static multiplyQuaternionsFlat(e,n,i,r,s,o){let a=i[r],c=i[r+1],l=i[r+2],u=i[r+3],h=s[o],f=s[o+1],d=s[o+2],m=s[o+3];return e[n]=a*m+u*h+c*d-l*f,e[n+1]=c*m+u*f+l*h-a*d,e[n+2]=l*m+u*d+a*f-c*h,e[n+3]=u*m-a*h-c*f-l*d,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,n,i,r){return this._x=e,this._y=n,this._z=i,this._w=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,n=!0){let i=e._x,r=e._y,s=e._z,o=e._order,a=Math.cos,c=Math.sin,l=a(i/2),u=a(r/2),h=a(s/2),f=c(i/2),d=c(r/2),m=c(s/2);switch(o){case"XYZ":this._x=f*u*h+l*d*m,this._y=l*d*h-f*u*m,this._z=l*u*m+f*d*h,this._w=l*u*h-f*d*m;break;case"YXZ":this._x=f*u*h+l*d*m,this._y=l*d*h-f*u*m,this._z=l*u*m-f*d*h,this._w=l*u*h+f*d*m;break;case"ZXY":this._x=f*u*h-l*d*m,this._y=l*d*h+f*u*m,this._z=l*u*m+f*d*h,this._w=l*u*h-f*d*m;break;case"ZYX":this._x=f*u*h-l*d*m,this._y=l*d*h+f*u*m,this._z=l*u*m-f*d*h,this._w=l*u*h+f*d*m;break;case"YZX":this._x=f*u*h+l*d*m,this._y=l*d*h+f*u*m,this._z=l*u*m-f*d*h,this._w=l*u*h-f*d*m;break;case"XZY":this._x=f*u*h-l*d*m,this._y=l*d*h-f*u*m,this._z=l*u*m+f*d*h,this._w=l*u*h+f*d*m;break;default:console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: "+o)}return n===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,n){let i=n/2,r=Math.sin(i);return this._x=e.x*r,this._y=e.y*r,this._z=e.z*r,this._w=Math.cos(i),this._onChangeCallback(),this}setFromRotationMatrix(e){let n=e.elements,i=n[0],r=n[4],s=n[8],o=n[1],a=n[5],c=n[9],l=n[2],u=n[6],h=n[10],f=i+a+h;if(f>0){let d=.5/Math.sqrt(f+1);this._w=.25/d,this._x=(u-c)*d,this._y=(s-l)*d,this._z=(o-r)*d}else if(i>a&&i>h){let d=2*Math.sqrt(1+i-a-h);this._w=(u-c)/d,this._x=.25*d,this._y=(r+o)/d,this._z=(s+l)/d}else if(a>h){let d=2*Math.sqrt(1+a-i-h);this._w=(s-l)/d,this._x=(r+o)/d,this._y=.25*d,this._z=(c+u)/d}else{let d=2*Math.sqrt(1+h-i-a);this._w=(o-r)/d,this._x=(s+l)/d,this._y=(c+u)/d,this._z=.25*d}return this._onChangeCallback(),this}setFromUnitVectors(e,n){let i=e.dot(n)+1;return i<1e-8?(i=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=i):(this._x=0,this._y=-e.z,this._z=e.y,this._w=i)):(this._x=e.y*n.z-e.z*n.y,this._y=e.z*n.x-e.x*n.z,this._z=e.x*n.y-e.y*n.x,this._w=i),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(tt(this.dot(e),-1,1)))}rotateTowards(e,n){let i=this.angleTo(e);if(i===0)return this;let r=Math.min(1,n/i);return this.slerp(e,r),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,n){let i=e._x,r=e._y,s=e._z,o=e._w,a=n._x,c=n._y,l=n._z,u=n._w;return this._x=i*u+o*a+r*l-s*c,this._y=r*u+o*c+s*a-i*l,this._z=s*u+o*l+i*c-r*a,this._w=o*u-i*a-r*c-s*l,this._onChangeCallback(),this}slerp(e,n){if(n===0)return this;if(n===1)return this.copy(e);let i=this._x,r=this._y,s=this._z,o=this._w,a=o*e._w+i*e._x+r*e._y+s*e._z;if(a<0?(this._w=-e._w,this._x=-e._x,this._y=-e._y,this._z=-e._z,a=-a):this.copy(e),a>=1)return this._w=o,this._x=i,this._y=r,this._z=s,this;let c=1-a*a;if(c<=Number.EPSILON){let d=1-n;return this._w=d*o+n*this._w,this._x=d*i+n*this._x,this._y=d*r+n*this._y,this._z=d*s+n*this._z,this.normalize(),this}let l=Math.sqrt(c),u=Math.atan2(l,a),h=Math.sin((1-n)*u)/l,f=Math.sin(n*u)/l;return this._w=o*h+this._w*f,this._x=i*h+this._x*f,this._y=r*h+this._y*f,this._z=s*h+this._z*f,this._onChangeCallback(),this}slerpQuaternions(e,n,i){return this.copy(e).slerp(n,i)}random(){let e=2*Math.PI*Math.random(),n=2*Math.PI*Math.random(),i=Math.random(),r=Math.sqrt(1-i),s=Math.sqrt(i);return this.set(r*Math.sin(e),r*Math.cos(e),s*Math.sin(n),s*Math.cos(n))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,n=0){return this._x=e[n],this._y=e[n+1],this._z=e[n+2],this._w=e[n+3],this._onChangeCallback(),this}toArray(e=[],n=0){return e[n]=this._x,e[n+1]=this._y,e[n+2]=this._z,e[n+3]=this._w,e}fromBufferAttribute(e,n){return this._x=e.getX(n),this._y=e.getY(n),this._z=e.getZ(n),this._w=e.getW(n),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}},R=class t{constructor(e=0,n=0,i=0){t.prototype.isVector3=!0,this.x=e,this.y=n,this.z=i}set(e,n,i){return i===void 0&&(i=this.z),this.x=e,this.y=n,this.z=i,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,n){switch(e){case 0:this.x=n;break;case 1:this.y=n;break;case 2:this.z=n;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,n){return this.x=e.x+n.x,this.y=e.y+n.y,this.z=e.z+n.z,this}addScaledVector(e,n){return this.x+=e.x*n,this.y+=e.y*n,this.z+=e.z*n,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,n){return this.x=e.x-n.x,this.y=e.y-n.y,this.z=e.z-n.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,n){return this.x=e.x*n.x,this.y=e.y*n.y,this.z=e.z*n.z,this}applyEuler(e){return this.applyQuaternion(Yp.setFromEuler(e))}applyAxisAngle(e,n){return this.applyQuaternion(Yp.setFromAxisAngle(e,n))}applyMatrix3(e){let n=this.x,i=this.y,r=this.z,s=e.elements;return this.x=s[0]*n+s[3]*i+s[6]*r,this.y=s[1]*n+s[4]*i+s[7]*r,this.z=s[2]*n+s[5]*i+s[8]*r,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){let n=this.x,i=this.y,r=this.z,s=e.elements,o=1/(s[3]*n+s[7]*i+s[11]*r+s[15]);return this.x=(s[0]*n+s[4]*i+s[8]*r+s[12])*o,this.y=(s[1]*n+s[5]*i+s[9]*r+s[13])*o,this.z=(s[2]*n+s[6]*i+s[10]*r+s[14])*o,this}applyQuaternion(e){let n=this.x,i=this.y,r=this.z,s=e.x,o=e.y,a=e.z,c=e.w,l=2*(o*r-a*i),u=2*(a*n-s*r),h=2*(s*i-o*n);return this.x=n+c*l+o*h-a*u,this.y=i+c*u+a*l-s*h,this.z=r+c*h+s*u-o*l,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){let n=this.x,i=this.y,r=this.z,s=e.elements;return this.x=s[0]*n+s[4]*i+s[8]*r,this.y=s[1]*n+s[5]*i+s[9]*r,this.z=s[2]*n+s[6]*i+s[10]*r,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,n){return this.x=tt(this.x,e.x,n.x),this.y=tt(this.y,e.y,n.y),this.z=tt(this.z,e.z,n.z),this}clampScalar(e,n){return this.x=tt(this.x,e,n),this.y=tt(this.y,e,n),this.z=tt(this.z,e,n),this}clampLength(e,n){let i=this.length();return this.divideScalar(i||1).multiplyScalar(tt(i,e,n))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,n){return this.x+=(e.x-this.x)*n,this.y+=(e.y-this.y)*n,this.z+=(e.z-this.z)*n,this}lerpVectors(e,n,i){return this.x=e.x+(n.x-e.x)*i,this.y=e.y+(n.y-e.y)*i,this.z=e.z+(n.z-e.z)*i,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,n){let i=e.x,r=e.y,s=e.z,o=n.x,a=n.y,c=n.z;return this.x=r*c-s*a,this.y=s*o-i*c,this.z=i*a-r*o,this}projectOnVector(e){let n=e.lengthSq();if(n===0)return this.set(0,0,0);let i=e.dot(this)/n;return this.copy(e).multiplyScalar(i)}projectOnPlane(e){return Eu.copy(this).projectOnVector(e),this.sub(Eu)}reflect(e){return this.sub(Eu.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){let n=Math.sqrt(this.lengthSq()*e.lengthSq());if(n===0)return Math.PI/2;let i=this.dot(e)/n;return Math.acos(tt(i,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let n=this.x-e.x,i=this.y-e.y,r=this.z-e.z;return n*n+i*i+r*r}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,n,i){let r=Math.sin(n)*e;return this.x=r*Math.sin(i),this.y=Math.cos(n)*e,this.z=r*Math.cos(i),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,n,i){return this.x=e*Math.sin(n),this.y=i,this.z=e*Math.cos(n),this}setFromMatrixPosition(e){let n=e.elements;return this.x=n[12],this.y=n[13],this.z=n[14],this}setFromMatrixScale(e){let n=this.setFromMatrixColumn(e,0).length(),i=this.setFromMatrixColumn(e,1).length(),r=this.setFromMatrixColumn(e,2).length();return this.x=n,this.y=i,this.z=r,this}setFromMatrixColumn(e,n){return this.fromArray(e.elements,n*4)}setFromMatrix3Column(e,n){return this.fromArray(e.elements,n*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,n=0){return this.x=e[n],this.y=e[n+1],this.z=e[n+2],this}toArray(e=[],n=0){return e[n]=this.x,e[n+1]=this.y,e[n+2]=this.z,e}fromBufferAttribute(e,n){return this.x=e.getX(n),this.y=e.getY(n),this.z=e.getZ(n),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let e=Math.random()*Math.PI*2,n=Math.random()*2-1,i=Math.sqrt(1-n*n);return this.x=i*Math.cos(e),this.y=n,this.z=i*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}},Eu=new R,Yp=new Ht,Ke=class t{constructor(e,n,i,r,s,o,a,c,l){t.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,n,i,r,s,o,a,c,l)}set(e,n,i,r,s,o,a,c,l){let u=this.elements;return u[0]=e,u[1]=r,u[2]=a,u[3]=n,u[4]=s,u[5]=c,u[6]=i,u[7]=o,u[8]=l,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){let n=this.elements,i=e.elements;return n[0]=i[0],n[1]=i[1],n[2]=i[2],n[3]=i[3],n[4]=i[4],n[5]=i[5],n[6]=i[6],n[7]=i[7],n[8]=i[8],this}extractBasis(e,n,i){return e.setFromMatrix3Column(this,0),n.setFromMatrix3Column(this,1),i.setFromMatrix3Column(this,2),this}setFromMatrix4(e){let n=e.elements;return this.set(n[0],n[4],n[8],n[1],n[5],n[9],n[2],n[6],n[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,n){let i=e.elements,r=n.elements,s=this.elements,o=i[0],a=i[3],c=i[6],l=i[1],u=i[4],h=i[7],f=i[2],d=i[5],m=i[8],_=r[0],g=r[3],p=r[6],x=r[1],y=r[4],v=r[7],b=r[2],M=r[5],A=r[8];return s[0]=o*_+a*x+c*b,s[3]=o*g+a*y+c*M,s[6]=o*p+a*v+c*A,s[1]=l*_+u*x+h*b,s[4]=l*g+u*y+h*M,s[7]=l*p+u*v+h*A,s[2]=f*_+d*x+m*b,s[5]=f*g+d*y+m*M,s[8]=f*p+d*v+m*A,this}multiplyScalar(e){let n=this.elements;return n[0]*=e,n[3]*=e,n[6]*=e,n[1]*=e,n[4]*=e,n[7]*=e,n[2]*=e,n[5]*=e,n[8]*=e,this}determinant(){let e=this.elements,n=e[0],i=e[1],r=e[2],s=e[3],o=e[4],a=e[5],c=e[6],l=e[7],u=e[8];return n*o*u-n*a*l-i*s*u+i*a*c+r*s*l-r*o*c}invert(){let e=this.elements,n=e[0],i=e[1],r=e[2],s=e[3],o=e[4],a=e[5],c=e[6],l=e[7],u=e[8],h=u*o-a*l,f=a*c-u*s,d=l*s-o*c,m=n*h+i*f+r*d;if(m===0)return this.set(0,0,0,0,0,0,0,0,0);let _=1/m;return e[0]=h*_,e[1]=(r*l-u*i)*_,e[2]=(a*i-r*o)*_,e[3]=f*_,e[4]=(u*n-r*c)*_,e[5]=(r*s-a*n)*_,e[6]=d*_,e[7]=(i*c-l*n)*_,e[8]=(o*n-i*s)*_,this}transpose(){let e,n=this.elements;return e=n[1],n[1]=n[3],n[3]=e,e=n[2],n[2]=n[6],n[6]=e,e=n[5],n[5]=n[7],n[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){let n=this.elements;return e[0]=n[0],e[1]=n[3],e[2]=n[6],e[3]=n[1],e[4]=n[4],e[5]=n[7],e[6]=n[2],e[7]=n[5],e[8]=n[8],this}setUvTransform(e,n,i,r,s,o,a){let c=Math.cos(s),l=Math.sin(s);return this.set(i*c,i*l,-i*(c*o+l*a)+o+e,-r*l,r*c,-r*(-l*o+c*a)+a+n,0,0,1),this}scale(e,n){return this.premultiply(Tu.makeScale(e,n)),this}rotate(e){return this.premultiply(Tu.makeRotation(-e)),this}translate(e,n){return this.premultiply(Tu.makeTranslation(e,n)),this}makeTranslation(e,n){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,n,0,0,1),this}makeRotation(e){let n=Math.cos(e),i=Math.sin(e);return this.set(n,-i,0,i,n,0,0,0,1),this}makeScale(e,n){return this.set(e,0,0,0,n,0,0,0,1),this}equals(e){let n=this.elements,i=e.elements;for(let r=0;r<9;r++)if(n[r]!==i[r])return!1;return!0}fromArray(e,n=0){for(let i=0;i<9;i++)this.elements[i]=e[i+n];return this}toArray(e=[],n=0){let i=this.elements;return e[n]=i[0],e[n+1]=i[1],e[n+2]=i[2],e[n+3]=i[3],e[n+4]=i[4],e[n+5]=i[5],e[n+6]=i[6],e[n+7]=i[7],e[n+8]=i[8],e}clone(){return new this.constructor().fromArray(this.elements)}},Tu=new Ke;function Ef(t){for(let e=t.length-1;e>=0;--e)if(t[e]>=65535)return!0;return!1}function Cs(t){return document.createElementNS("http://www.w3.org/1999/xhtml",t)}function og(){let t=Cs("canvas");return t.style.display="block",t}var Zp={};function Rs(t){t in Zp||(Zp[t]=!0,console.warn(t))}function ag(t,e,n){return new Promise(function(i,r){function s(){switch(t.clientWaitSync(e,t.SYNC_FLUSH_COMMANDS_BIT,0)){case t.WAIT_FAILED:r();break;case t.TIMEOUT_EXPIRED:setTimeout(s,n);break;default:i()}}setTimeout(s,n)})}var Kp=new Ke().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),Jp=new Ke().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function mb(){let t={enabled:!0,workingColorSpace:Or,spaces:{},convert:function(r,s,o){return this.enabled===!1||s===o||!s||!o||(this.spaces[s].transfer===lt&&(r.r=Fi(r.r),r.g=Fi(r.g),r.b=Fi(r.b)),this.spaces[s].primaries!==this.spaces[o].primaries&&(r.applyMatrix3(this.spaces[s].toXYZ),r.applyMatrix3(this.spaces[o].fromXYZ)),this.spaces[o].transfer===lt&&(r.r=Es(r.r),r.g=Es(r.g),r.b=Es(r.b))),r},workingToColorSpace:function(r,s){return this.convert(r,this.workingColorSpace,s)},colorSpaceToWorking:function(r,s){return this.convert(r,s,this.workingColorSpace)},getPrimaries:function(r){return this.spaces[r].primaries},getTransfer:function(r){return r===Hi?Oo:this.spaces[r].transfer},getToneMappingMode:function(r){return this.spaces[r].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(r,s=this.workingColorSpace){return r.fromArray(this.spaces[s].luminanceCoefficients)},define:function(r){Object.assign(this.spaces,r)},_getMatrix:function(r,s,o){return r.copy(this.spaces[s].toXYZ).multiply(this.spaces[o].fromXYZ)},_getDrawingBufferColorSpace:function(r){return this.spaces[r].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(r=this.workingColorSpace){return this.spaces[r].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(r,s){return Rs("THREE.ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),t.workingToColorSpace(r,s)},toWorkingColorSpace:function(r,s){return Rs("THREE.ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),t.colorSpaceToWorking(r,s)}},e=[.64,.33,.3,.6,.15,.06],n=[.2126,.7152,.0722],i=[.3127,.329];return t.define({[Or]:{primaries:e,whitePoint:i,transfer:Oo,toXYZ:Kp,fromXYZ:Jp,luminanceCoefficients:n,workingColorSpaceConfig:{unpackColorSpace:Yt},outputColorSpaceConfig:{drawingBufferColorSpace:Yt}},[Yt]:{primaries:e,whitePoint:i,transfer:lt,toXYZ:Kp,fromXYZ:Jp,luminanceCoefficients:n,outputColorSpaceConfig:{drawingBufferColorSpace:Yt}}}),t}var st=mb();function Fi(t){return t<.04045?t*.0773993808:Math.pow(t*.9478672986+.0521327014,2.4)}function Es(t){return t<.0031308?t*12.92:1.055*Math.pow(t,.41666)-.055}var cs,Rc=class{static getDataURL(e,n="image/png"){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement=="undefined")return e.src;let i;if(e instanceof HTMLCanvasElement)i=e;else{cs===void 0&&(cs=Cs("canvas")),cs.width=e.width,cs.height=e.height;let r=cs.getContext("2d");e instanceof ImageData?r.putImageData(e,0,0):r.drawImage(e,0,0,e.width,e.height),i=cs}return i.toDataURL(n)}static sRGBToLinear(e){if(typeof HTMLImageElement!="undefined"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement!="undefined"&&e instanceof HTMLCanvasElement||typeof ImageBitmap!="undefined"&&e instanceof ImageBitmap){let n=Cs("canvas");n.width=e.width,n.height=e.height;let i=n.getContext("2d");i.drawImage(e,0,0,e.width,e.height);let r=i.getImageData(0,0,e.width,e.height),s=r.data;for(let o=0;o<s.length;o++)s[o]=Fi(s[o]/255)*255;return i.putImageData(r,0,0),n}else if(e.data){let n=e.data.slice(0);for(let i=0;i<n.length;i++)n instanceof Uint8Array||n instanceof Uint8ClampedArray?n[i]=Math.floor(Fi(n[i]/255)*255):n[i]=Fi(n[i]);return{data:n,width:e.width,height:e.height}}else return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}},gb=0,Ps=class{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:gb++}),this.uuid=Ni(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){let n=this.data;return typeof HTMLVideoElement!="undefined"&&n instanceof HTMLVideoElement?e.set(n.videoWidth,n.videoHeight,0):n instanceof VideoFrame?e.set(n.displayHeight,n.displayWidth,0):n!==null?e.set(n.width,n.height,n.depth||0):e.set(0,0,0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){let n=e===void 0||typeof e=="string";if(!n&&e.images[this.uuid]!==void 0)return e.images[this.uuid];let i={uuid:this.uuid,url:""},r=this.data;if(r!==null){let s;if(Array.isArray(r)){s=[];for(let o=0,a=r.length;o<a;o++)r[o].isDataTexture?s.push(Au(r[o].image)):s.push(Au(r[o]))}else s=Au(r);i.url=s}return n||(e.images[this.uuid]=i),i}};function Au(t){return typeof HTMLImageElement!="undefined"&&t instanceof HTMLImageElement||typeof HTMLCanvasElement!="undefined"&&t instanceof HTMLCanvasElement||typeof ImageBitmap!="undefined"&&t instanceof ImageBitmap?Rc.getDataURL(t):t.data?{data:Array.from(t.data),width:t.width,height:t.height,type:t.data.constructor.name}:(console.warn("THREE.Texture: Unable to serialize Texture."),{})}var _b=0,Cu=new R,hn=class t extends di{constructor(e=t.DEFAULT_IMAGE,n=t.DEFAULT_MAPPING,i=ir,r=ir,s=ii,o=cr,a=Xn,c=oi,l=t.DEFAULT_ANISOTROPY,u=Hi){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:_b++}),this.uuid=Ni(),this.name="",this.source=new Ps(e),this.mipmaps=[],this.mapping=n,this.channel=0,this.wrapS=i,this.wrapT=r,this.magFilter=s,this.minFilter=o,this.anisotropy=l,this.format=a,this.internalFormat=null,this.type=c,this.offset=new ie(0,0),this.repeat=new ie(1,1),this.center=new ie(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Ke,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=u,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(e&&e.depth&&e.depth>1),this.pmremVersion=0}get width(){return this.source.getSize(Cu).x}get height(){return this.source.getSize(Cu).y}get depth(){return this.source.getSize(Cu).z}get image(){return this.source.data}set image(e=null){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,n){this.updateRanges.push({start:e,count:n})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(let n in e){let i=e[n];if(i===void 0){console.warn(`THREE.Texture.setValues(): parameter '${n}' has value of undefined.`);continue}let r=this[n];if(r===void 0){console.warn(`THREE.Texture.setValues(): property '${n}' does not exist.`);continue}r&&i&&r.isVector2&&i.isVector2||r&&i&&r.isVector3&&i.isVector3||r&&i&&r.isMatrix3&&i.isMatrix3?r.copy(i):this[n]=i}}toJSON(e){let n=e===void 0||typeof e=="string";if(!n&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];let i={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(i.userData=this.userData),n||(e.textures[this.uuid]=i),i}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==df)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case Ec:e.x=e.x-Math.floor(e.x);break;case ir:e.x=e.x<0?0:1;break;case Tc:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case Ec:e.y=e.y-Math.floor(e.y);break;case ir:e.y=e.y<0?0:1;break;case Tc:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}};hn.DEFAULT_IMAGE=null;hn.DEFAULT_MAPPING=df;hn.DEFAULT_ANISOTROPY=1;var mt=class t{constructor(e=0,n=0,i=0,r=1){t.prototype.isVector4=!0,this.x=e,this.y=n,this.z=i,this.w=r}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,n,i,r){return this.x=e,this.y=n,this.z=i,this.w=r,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,n){switch(e){case 0:this.x=n;break;case 1:this.y=n;break;case 2:this.z=n;break;case 3:this.w=n;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,n){return this.x=e.x+n.x,this.y=e.y+n.y,this.z=e.z+n.z,this.w=e.w+n.w,this}addScaledVector(e,n){return this.x+=e.x*n,this.y+=e.y*n,this.z+=e.z*n,this.w+=e.w*n,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,n){return this.x=e.x-n.x,this.y=e.y-n.y,this.z=e.z-n.z,this.w=e.w-n.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){let n=this.x,i=this.y,r=this.z,s=this.w,o=e.elements;return this.x=o[0]*n+o[4]*i+o[8]*r+o[12]*s,this.y=o[1]*n+o[5]*i+o[9]*r+o[13]*s,this.z=o[2]*n+o[6]*i+o[10]*r+o[14]*s,this.w=o[3]*n+o[7]*i+o[11]*r+o[15]*s,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);let n=Math.sqrt(1-e.w*e.w);return n<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/n,this.y=e.y/n,this.z=e.z/n),this}setAxisAngleFromRotationMatrix(e){let n,i,r,s,c=e.elements,l=c[0],u=c[4],h=c[8],f=c[1],d=c[5],m=c[9],_=c[2],g=c[6],p=c[10];if(Math.abs(u-f)<.01&&Math.abs(h-_)<.01&&Math.abs(m-g)<.01){if(Math.abs(u+f)<.1&&Math.abs(h+_)<.1&&Math.abs(m+g)<.1&&Math.abs(l+d+p-3)<.1)return this.set(1,0,0,0),this;n=Math.PI;let y=(l+1)/2,v=(d+1)/2,b=(p+1)/2,M=(u+f)/4,A=(h+_)/4,C=(m+g)/4;return y>v&&y>b?y<.01?(i=0,r=.707106781,s=.707106781):(i=Math.sqrt(y),r=M/i,s=A/i):v>b?v<.01?(i=.707106781,r=0,s=.707106781):(r=Math.sqrt(v),i=M/r,s=C/r):b<.01?(i=.707106781,r=.707106781,s=0):(s=Math.sqrt(b),i=A/s,r=C/s),this.set(i,r,s,n),this}let x=Math.sqrt((g-m)*(g-m)+(h-_)*(h-_)+(f-u)*(f-u));return Math.abs(x)<.001&&(x=1),this.x=(g-m)/x,this.y=(h-_)/x,this.z=(f-u)/x,this.w=Math.acos((l+d+p-1)/2),this}setFromMatrixPosition(e){let n=e.elements;return this.x=n[12],this.y=n[13],this.z=n[14],this.w=n[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,n){return this.x=tt(this.x,e.x,n.x),this.y=tt(this.y,e.y,n.y),this.z=tt(this.z,e.z,n.z),this.w=tt(this.w,e.w,n.w),this}clampScalar(e,n){return this.x=tt(this.x,e,n),this.y=tt(this.y,e,n),this.z=tt(this.z,e,n),this.w=tt(this.w,e,n),this}clampLength(e,n){let i=this.length();return this.divideScalar(i||1).multiplyScalar(tt(i,e,n))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,n){return this.x+=(e.x-this.x)*n,this.y+=(e.y-this.y)*n,this.z+=(e.z-this.z)*n,this.w+=(e.w-this.w)*n,this}lerpVectors(e,n,i){return this.x=e.x+(n.x-e.x)*i,this.y=e.y+(n.y-e.y)*i,this.z=e.z+(n.z-e.z)*i,this.w=e.w+(n.w-e.w)*i,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,n=0){return this.x=e[n],this.y=e[n+1],this.z=e[n+2],this.w=e[n+3],this}toArray(e=[],n=0){return e[n]=this.x,e[n+1]=this.y,e[n+2]=this.z,e[n+3]=this.w,e}fromBufferAttribute(e,n){return this.x=e.getX(n),this.y=e.getY(n),this.z=e.getZ(n),this.w=e.getW(n),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}},Pc=class extends di{constructor(e=1,n=1,i={}){super(),i=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:ii,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1},i),this.isRenderTarget=!0,this.width=e,this.height=n,this.depth=i.depth,this.scissor=new mt(0,0,e,n),this.scissorTest=!1,this.viewport=new mt(0,0,e,n);let r={width:e,height:n,depth:i.depth},s=new hn(r);this.textures=[];let o=i.count;for(let a=0;a<o;a++)this.textures[a]=s.clone(),this.textures[a].isRenderTargetTexture=!0,this.textures[a].renderTarget=this;this._setTextureOptions(i),this.depthBuffer=i.depthBuffer,this.stencilBuffer=i.stencilBuffer,this.resolveDepthBuffer=i.resolveDepthBuffer,this.resolveStencilBuffer=i.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=i.depthTexture,this.samples=i.samples,this.multiview=i.multiview}_setTextureOptions(e={}){let n={minFilter:ii,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(n.mapping=e.mapping),e.wrapS!==void 0&&(n.wrapS=e.wrapS),e.wrapT!==void 0&&(n.wrapT=e.wrapT),e.wrapR!==void 0&&(n.wrapR=e.wrapR),e.magFilter!==void 0&&(n.magFilter=e.magFilter),e.minFilter!==void 0&&(n.minFilter=e.minFilter),e.format!==void 0&&(n.format=e.format),e.type!==void 0&&(n.type=e.type),e.anisotropy!==void 0&&(n.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(n.colorSpace=e.colorSpace),e.flipY!==void 0&&(n.flipY=e.flipY),e.generateMipmaps!==void 0&&(n.generateMipmaps=e.generateMipmaps),e.internalFormat!==void 0&&(n.internalFormat=e.internalFormat);for(let i=0;i<this.textures.length;i++)this.textures[i].setValues(n)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),e!==null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,n,i=1){if(this.width!==e||this.height!==n||this.depth!==i){this.width=e,this.height=n,this.depth=i;for(let r=0,s=this.textures.length;r<s;r++)this.textures[r].image.width=e,this.textures[r].image.height=n,this.textures[r].image.depth=i,this.textures[r].isArrayTexture=this.textures[r].image.depth>1;this.dispose()}this.viewport.set(0,0,e,n),this.scissor.set(0,0,e,n)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let n=0,i=e.textures.length;n<i;n++){this.textures[n]=e.textures[n].clone(),this.textures[n].isRenderTargetTexture=!0,this.textures[n].renderTarget=this;let r=Object.assign({},e.textures[n].image);this.textures[n].source=new Ps(r)}return this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}},rn=class extends Pc{constructor(e=1,n=1,i={}){super(e,n,i),this.isWebGLRenderTarget=!0}},Fo=class extends hn{constructor(e=null,n=1,i=1,r=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:n,height:i,depth:r},this.magFilter=Vn,this.minFilter=Vn,this.wrapR=ir,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}};var Ic=class extends hn{constructor(e=null,n=1,i=1,r=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:n,height:i,depth:r},this.magFilter=Vn,this.minFilter=Vn,this.wrapR=ir,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}};var vn=class{constructor(e=new R(1/0,1/0,1/0),n=new R(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=n}set(e,n){return this.min.copy(e),this.max.copy(n),this}setFromArray(e){this.makeEmpty();for(let n=0,i=e.length;n<i;n+=3)this.expandByPoint(Jn.fromArray(e,n));return this}setFromBufferAttribute(e){this.makeEmpty();for(let n=0,i=e.count;n<i;n++)this.expandByPoint(Jn.fromBufferAttribute(e,n));return this}setFromPoints(e){this.makeEmpty();for(let n=0,i=e.length;n<i;n++)this.expandByPoint(e[n]);return this}setFromCenterAndSize(e,n){let i=Jn.copy(n).multiplyScalar(.5);return this.min.copy(e).sub(i),this.max.copy(e).add(i),this}setFromObject(e,n=!1){return this.makeEmpty(),this.expandByObject(e,n)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,n=!1){e.updateWorldMatrix(!1,!1);let i=e.geometry;if(i!==void 0){let s=i.getAttribute("position");if(n===!0&&s!==void 0&&e.isInstancedMesh!==!0)for(let o=0,a=s.count;o<a;o++)e.isMesh===!0?e.getVertexPosition(o,Jn):Jn.fromBufferAttribute(s,o),Jn.applyMatrix4(e.matrixWorld),this.expandByPoint(Jn);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),Ya.copy(e.boundingBox)):(i.boundingBox===null&&i.computeBoundingBox(),Ya.copy(i.boundingBox)),Ya.applyMatrix4(e.matrixWorld),this.union(Ya)}let r=e.children;for(let s=0,o=r.length;s<o;s++)this.expandByObject(r[s],n);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,n){return n.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,Jn),Jn.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let n,i;return e.normal.x>0?(n=e.normal.x*this.min.x,i=e.normal.x*this.max.x):(n=e.normal.x*this.max.x,i=e.normal.x*this.min.x),e.normal.y>0?(n+=e.normal.y*this.min.y,i+=e.normal.y*this.max.y):(n+=e.normal.y*this.max.y,i+=e.normal.y*this.min.y),e.normal.z>0?(n+=e.normal.z*this.min.z,i+=e.normal.z*this.max.z):(n+=e.normal.z*this.max.z,i+=e.normal.z*this.min.z),n<=-e.constant&&i>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(xo),Za.subVectors(this.max,xo),ls.subVectors(e.a,xo),hs.subVectors(e.b,xo),us.subVectors(e.c,xo),Ki.subVectors(hs,ls),Ji.subVectors(us,hs),Ar.subVectors(ls,us);let n=[0,-Ki.z,Ki.y,0,-Ji.z,Ji.y,0,-Ar.z,Ar.y,Ki.z,0,-Ki.x,Ji.z,0,-Ji.x,Ar.z,0,-Ar.x,-Ki.y,Ki.x,0,-Ji.y,Ji.x,0,-Ar.y,Ar.x,0];return!Ru(n,ls,hs,us,Za)||(n=[1,0,0,0,1,0,0,0,1],!Ru(n,ls,hs,us,Za))?!1:(Ka.crossVectors(Ki,Ji),n=[Ka.x,Ka.y,Ka.z],Ru(n,ls,hs,us,Za))}clampPoint(e,n){return n.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,Jn).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(Jn).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(Ri[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),Ri[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),Ri[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),Ri[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),Ri[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),Ri[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),Ri[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),Ri[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(Ri),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}},Ri=[new R,new R,new R,new R,new R,new R,new R,new R],Jn=new R,Ya=new vn,ls=new R,hs=new R,us=new R,Ki=new R,Ji=new R,Ar=new R,xo=new R,Za=new R,Ka=new R,Cr=new R;function Ru(t,e,n,i,r){for(let s=0,o=t.length-3;s<=o;s+=3){Cr.fromArray(t,s);let a=r.x*Math.abs(Cr.x)+r.y*Math.abs(Cr.y)+r.z*Math.abs(Cr.z),c=e.dot(Cr),l=n.dot(Cr),u=i.dot(Cr);if(Math.max(-Math.max(c,l,u),Math.min(c,l,u))>a)return!1}return!0}var vb=new vn,bo=new R,Pu=new R,pi=class{constructor(e=new R,n=-1){this.isSphere=!0,this.center=e,this.radius=n}set(e,n){return this.center.copy(e),this.radius=n,this}setFromPoints(e,n){let i=this.center;n!==void 0?i.copy(n):vb.setFromPoints(e).getCenter(i);let r=0;for(let s=0,o=e.length;s<o;s++)r=Math.max(r,i.distanceToSquared(e[s]));return this.radius=Math.sqrt(r),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){let n=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=n*n}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,n){let i=this.center.distanceToSquared(e);return n.copy(e),i>this.radius*this.radius&&(n.sub(this.center).normalize(),n.multiplyScalar(this.radius).add(this.center)),n}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;bo.subVectors(e,this.center);let n=bo.lengthSq();if(n>this.radius*this.radius){let i=Math.sqrt(n),r=(i-this.radius)*.5;this.center.addScaledVector(bo,r/i),this.radius+=r}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(Pu.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(bo.copy(e.center).add(Pu)),this.expandByPoint(bo.copy(e.center).sub(Pu))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}},Pi=new R,Iu=new R,Ja=new R,Qi=new R,Du=new R,Qa=new R,Lu=new R,zi=class{constructor(e=new R,n=new R(0,0,-1)){this.origin=e,this.direction=n}set(e,n){return this.origin.copy(e),this.direction.copy(n),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,n){return n.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,Pi)),this}closestPointToPoint(e,n){n.subVectors(e,this.origin);let i=n.dot(this.direction);return i<0?n.copy(this.origin):n.copy(this.origin).addScaledVector(this.direction,i)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){let n=Pi.subVectors(e,this.origin).dot(this.direction);return n<0?this.origin.distanceToSquared(e):(Pi.copy(this.origin).addScaledVector(this.direction,n),Pi.distanceToSquared(e))}distanceSqToSegment(e,n,i,r){Iu.copy(e).add(n).multiplyScalar(.5),Ja.copy(n).sub(e).normalize(),Qi.copy(this.origin).sub(Iu);let s=e.distanceTo(n)*.5,o=-this.direction.dot(Ja),a=Qi.dot(this.direction),c=-Qi.dot(Ja),l=Qi.lengthSq(),u=Math.abs(1-o*o),h,f,d,m;if(u>0)if(h=o*c-a,f=o*a-c,m=s*u,h>=0)if(f>=-m)if(f<=m){let _=1/u;h*=_,f*=_,d=h*(h+o*f+2*a)+f*(o*h+f+2*c)+l}else f=s,h=Math.max(0,-(o*f+a)),d=-h*h+f*(f+2*c)+l;else f=-s,h=Math.max(0,-(o*f+a)),d=-h*h+f*(f+2*c)+l;else f<=-m?(h=Math.max(0,-(-o*s+a)),f=h>0?-s:Math.min(Math.max(-s,-c),s),d=-h*h+f*(f+2*c)+l):f<=m?(h=0,f=Math.min(Math.max(-s,-c),s),d=f*(f+2*c)+l):(h=Math.max(0,-(o*s+a)),f=h>0?s:Math.min(Math.max(-s,-c),s),d=-h*h+f*(f+2*c)+l);else f=o>0?-s:s,h=Math.max(0,-(o*f+a)),d=-h*h+f*(f+2*c)+l;return i&&i.copy(this.origin).addScaledVector(this.direction,h),r&&r.copy(Iu).addScaledVector(Ja,f),d}intersectSphere(e,n){Pi.subVectors(e.center,this.origin);let i=Pi.dot(this.direction),r=Pi.dot(Pi)-i*i,s=e.radius*e.radius;if(r>s)return null;let o=Math.sqrt(s-r),a=i-o,c=i+o;return c<0?null:a<0?this.at(c,n):this.at(a,n)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){let n=e.normal.dot(this.direction);if(n===0)return e.distanceToPoint(this.origin)===0?0:null;let i=-(this.origin.dot(e.normal)+e.constant)/n;return i>=0?i:null}intersectPlane(e,n){let i=this.distanceToPlane(e);return i===null?null:this.at(i,n)}intersectsPlane(e){let n=e.distanceToPoint(this.origin);return n===0||e.normal.dot(this.direction)*n<0}intersectBox(e,n){let i,r,s,o,a,c,l=1/this.direction.x,u=1/this.direction.y,h=1/this.direction.z,f=this.origin;return l>=0?(i=(e.min.x-f.x)*l,r=(e.max.x-f.x)*l):(i=(e.max.x-f.x)*l,r=(e.min.x-f.x)*l),u>=0?(s=(e.min.y-f.y)*u,o=(e.max.y-f.y)*u):(s=(e.max.y-f.y)*u,o=(e.min.y-f.y)*u),i>o||s>r||((s>i||isNaN(i))&&(i=s),(o<r||isNaN(r))&&(r=o),h>=0?(a=(e.min.z-f.z)*h,c=(e.max.z-f.z)*h):(a=(e.max.z-f.z)*h,c=(e.min.z-f.z)*h),i>c||a>r)||((a>i||i!==i)&&(i=a),(c<r||r!==r)&&(r=c),r<0)?null:this.at(i>=0?i:r,n)}intersectsBox(e){return this.intersectBox(e,Pi)!==null}intersectTriangle(e,n,i,r,s){Du.subVectors(n,e),Qa.subVectors(i,e),Lu.crossVectors(Du,Qa);let o=this.direction.dot(Lu),a;if(o>0){if(r)return null;a=1}else if(o<0)a=-1,o=-o;else return null;Qi.subVectors(this.origin,e);let c=a*this.direction.dot(Qa.crossVectors(Qi,Qa));if(c<0)return null;let l=a*this.direction.dot(Du.cross(Qi));if(l<0||c+l>o)return null;let u=-a*Qi.dot(Lu);return u<0?null:this.at(u/o,s)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}},qe=class t{constructor(e,n,i,r,s,o,a,c,l,u,h,f,d,m,_,g){t.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,n,i,r,s,o,a,c,l,u,h,f,d,m,_,g)}set(e,n,i,r,s,o,a,c,l,u,h,f,d,m,_,g){let p=this.elements;return p[0]=e,p[4]=n,p[8]=i,p[12]=r,p[1]=s,p[5]=o,p[9]=a,p[13]=c,p[2]=l,p[6]=u,p[10]=h,p[14]=f,p[3]=d,p[7]=m,p[11]=_,p[15]=g,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new t().fromArray(this.elements)}copy(e){let n=this.elements,i=e.elements;return n[0]=i[0],n[1]=i[1],n[2]=i[2],n[3]=i[3],n[4]=i[4],n[5]=i[5],n[6]=i[6],n[7]=i[7],n[8]=i[8],n[9]=i[9],n[10]=i[10],n[11]=i[11],n[12]=i[12],n[13]=i[13],n[14]=i[14],n[15]=i[15],this}copyPosition(e){let n=this.elements,i=e.elements;return n[12]=i[12],n[13]=i[13],n[14]=i[14],this}setFromMatrix3(e){let n=e.elements;return this.set(n[0],n[3],n[6],0,n[1],n[4],n[7],0,n[2],n[5],n[8],0,0,0,0,1),this}extractBasis(e,n,i){return e.setFromMatrixColumn(this,0),n.setFromMatrixColumn(this,1),i.setFromMatrixColumn(this,2),this}makeBasis(e,n,i){return this.set(e.x,n.x,i.x,0,e.y,n.y,i.y,0,e.z,n.z,i.z,0,0,0,0,1),this}extractRotation(e){let n=this.elements,i=e.elements,r=1/fs.setFromMatrixColumn(e,0).length(),s=1/fs.setFromMatrixColumn(e,1).length(),o=1/fs.setFromMatrixColumn(e,2).length();return n[0]=i[0]*r,n[1]=i[1]*r,n[2]=i[2]*r,n[3]=0,n[4]=i[4]*s,n[5]=i[5]*s,n[6]=i[6]*s,n[7]=0,n[8]=i[8]*o,n[9]=i[9]*o,n[10]=i[10]*o,n[11]=0,n[12]=0,n[13]=0,n[14]=0,n[15]=1,this}makeRotationFromEuler(e){let n=this.elements,i=e.x,r=e.y,s=e.z,o=Math.cos(i),a=Math.sin(i),c=Math.cos(r),l=Math.sin(r),u=Math.cos(s),h=Math.sin(s);if(e.order==="XYZ"){let f=o*u,d=o*h,m=a*u,_=a*h;n[0]=c*u,n[4]=-c*h,n[8]=l,n[1]=d+m*l,n[5]=f-_*l,n[9]=-a*c,n[2]=_-f*l,n[6]=m+d*l,n[10]=o*c}else if(e.order==="YXZ"){let f=c*u,d=c*h,m=l*u,_=l*h;n[0]=f+_*a,n[4]=m*a-d,n[8]=o*l,n[1]=o*h,n[5]=o*u,n[9]=-a,n[2]=d*a-m,n[6]=_+f*a,n[10]=o*c}else if(e.order==="ZXY"){let f=c*u,d=c*h,m=l*u,_=l*h;n[0]=f-_*a,n[4]=-o*h,n[8]=m+d*a,n[1]=d+m*a,n[5]=o*u,n[9]=_-f*a,n[2]=-o*l,n[6]=a,n[10]=o*c}else if(e.order==="ZYX"){let f=o*u,d=o*h,m=a*u,_=a*h;n[0]=c*u,n[4]=m*l-d,n[8]=f*l+_,n[1]=c*h,n[5]=_*l+f,n[9]=d*l-m,n[2]=-l,n[6]=a*c,n[10]=o*c}else if(e.order==="YZX"){let f=o*c,d=o*l,m=a*c,_=a*l;n[0]=c*u,n[4]=_-f*h,n[8]=m*h+d,n[1]=h,n[5]=o*u,n[9]=-a*u,n[2]=-l*u,n[6]=d*h+m,n[10]=f-_*h}else if(e.order==="XZY"){let f=o*c,d=o*l,m=a*c,_=a*l;n[0]=c*u,n[4]=-h,n[8]=l*u,n[1]=f*h+_,n[5]=o*u,n[9]=d*h-m,n[2]=m*h-d,n[6]=a*u,n[10]=_*h+f}return n[3]=0,n[7]=0,n[11]=0,n[12]=0,n[13]=0,n[14]=0,n[15]=1,this}makeRotationFromQuaternion(e){return this.compose(yb,e,xb)}lookAt(e,n,i){let r=this.elements;return An.subVectors(e,n),An.lengthSq()===0&&(An.z=1),An.normalize(),er.crossVectors(i,An),er.lengthSq()===0&&(Math.abs(i.z)===1?An.x+=1e-4:An.z+=1e-4,An.normalize(),er.crossVectors(i,An)),er.normalize(),ec.crossVectors(An,er),r[0]=er.x,r[4]=ec.x,r[8]=An.x,r[1]=er.y,r[5]=ec.y,r[9]=An.y,r[2]=er.z,r[6]=ec.z,r[10]=An.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,n){let i=e.elements,r=n.elements,s=this.elements,o=i[0],a=i[4],c=i[8],l=i[12],u=i[1],h=i[5],f=i[9],d=i[13],m=i[2],_=i[6],g=i[10],p=i[14],x=i[3],y=i[7],v=i[11],b=i[15],M=r[0],A=r[4],C=r[8],T=r[12],w=r[1],P=r[5],z=r[9],U=r[13],O=r[2],D=r[6],V=r[10],Q=r[14],j=r[3],ae=r[7],ye=r[11],Z=r[15];return s[0]=o*M+a*w+c*O+l*j,s[4]=o*A+a*P+c*D+l*ae,s[8]=o*C+a*z+c*V+l*ye,s[12]=o*T+a*U+c*Q+l*Z,s[1]=u*M+h*w+f*O+d*j,s[5]=u*A+h*P+f*D+d*ae,s[9]=u*C+h*z+f*V+d*ye,s[13]=u*T+h*U+f*Q+d*Z,s[2]=m*M+_*w+g*O+p*j,s[6]=m*A+_*P+g*D+p*ae,s[10]=m*C+_*z+g*V+p*ye,s[14]=m*T+_*U+g*Q+p*Z,s[3]=x*M+y*w+v*O+b*j,s[7]=x*A+y*P+v*D+b*ae,s[11]=x*C+y*z+v*V+b*ye,s[15]=x*T+y*U+v*Q+b*Z,this}multiplyScalar(e){let n=this.elements;return n[0]*=e,n[4]*=e,n[8]*=e,n[12]*=e,n[1]*=e,n[5]*=e,n[9]*=e,n[13]*=e,n[2]*=e,n[6]*=e,n[10]*=e,n[14]*=e,n[3]*=e,n[7]*=e,n[11]*=e,n[15]*=e,this}determinant(){let e=this.elements,n=e[0],i=e[4],r=e[8],s=e[12],o=e[1],a=e[5],c=e[9],l=e[13],u=e[2],h=e[6],f=e[10],d=e[14],m=e[3],_=e[7],g=e[11],p=e[15];return m*(+s*c*h-r*l*h-s*a*f+i*l*f+r*a*d-i*c*d)+_*(+n*c*d-n*l*f+s*o*f-r*o*d+r*l*u-s*c*u)+g*(+n*l*h-n*a*d-s*o*h+i*o*d+s*a*u-i*l*u)+p*(-r*a*u-n*c*h+n*a*f+r*o*h-i*o*f+i*c*u)}transpose(){let e=this.elements,n;return n=e[1],e[1]=e[4],e[4]=n,n=e[2],e[2]=e[8],e[8]=n,n=e[6],e[6]=e[9],e[9]=n,n=e[3],e[3]=e[12],e[12]=n,n=e[7],e[7]=e[13],e[13]=n,n=e[11],e[11]=e[14],e[14]=n,this}setPosition(e,n,i){let r=this.elements;return e.isVector3?(r[12]=e.x,r[13]=e.y,r[14]=e.z):(r[12]=e,r[13]=n,r[14]=i),this}invert(){let e=this.elements,n=e[0],i=e[1],r=e[2],s=e[3],o=e[4],a=e[5],c=e[6],l=e[7],u=e[8],h=e[9],f=e[10],d=e[11],m=e[12],_=e[13],g=e[14],p=e[15],x=h*g*l-_*f*l+_*c*d-a*g*d-h*c*p+a*f*p,y=m*f*l-u*g*l-m*c*d+o*g*d+u*c*p-o*f*p,v=u*_*l-m*h*l+m*a*d-o*_*d-u*a*p+o*h*p,b=m*h*c-u*_*c-m*a*f+o*_*f+u*a*g-o*h*g,M=n*x+i*y+r*v+s*b;if(M===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let A=1/M;return e[0]=x*A,e[1]=(_*f*s-h*g*s-_*r*d+i*g*d+h*r*p-i*f*p)*A,e[2]=(a*g*s-_*c*s+_*r*l-i*g*l-a*r*p+i*c*p)*A,e[3]=(h*c*s-a*f*s-h*r*l+i*f*l+a*r*d-i*c*d)*A,e[4]=y*A,e[5]=(u*g*s-m*f*s+m*r*d-n*g*d-u*r*p+n*f*p)*A,e[6]=(m*c*s-o*g*s-m*r*l+n*g*l+o*r*p-n*c*p)*A,e[7]=(o*f*s-u*c*s+u*r*l-n*f*l-o*r*d+n*c*d)*A,e[8]=v*A,e[9]=(m*h*s-u*_*s-m*i*d+n*_*d+u*i*p-n*h*p)*A,e[10]=(o*_*s-m*a*s+m*i*l-n*_*l-o*i*p+n*a*p)*A,e[11]=(u*a*s-o*h*s-u*i*l+n*h*l+o*i*d-n*a*d)*A,e[12]=b*A,e[13]=(u*_*r-m*h*r+m*i*f-n*_*f-u*i*g+n*h*g)*A,e[14]=(m*a*r-o*_*r-m*i*c+n*_*c+o*i*g-n*a*g)*A,e[15]=(o*h*r-u*a*r+u*i*c-n*h*c-o*i*f+n*a*f)*A,this}scale(e){let n=this.elements,i=e.x,r=e.y,s=e.z;return n[0]*=i,n[4]*=r,n[8]*=s,n[1]*=i,n[5]*=r,n[9]*=s,n[2]*=i,n[6]*=r,n[10]*=s,n[3]*=i,n[7]*=r,n[11]*=s,this}getMaxScaleOnAxis(){let e=this.elements,n=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],i=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],r=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(n,i,r))}makeTranslation(e,n,i){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,n,0,0,1,i,0,0,0,1),this}makeRotationX(e){let n=Math.cos(e),i=Math.sin(e);return this.set(1,0,0,0,0,n,-i,0,0,i,n,0,0,0,0,1),this}makeRotationY(e){let n=Math.cos(e),i=Math.sin(e);return this.set(n,0,i,0,0,1,0,0,-i,0,n,0,0,0,0,1),this}makeRotationZ(e){let n=Math.cos(e),i=Math.sin(e);return this.set(n,-i,0,0,i,n,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,n){let i=Math.cos(n),r=Math.sin(n),s=1-i,o=e.x,a=e.y,c=e.z,l=s*o,u=s*a;return this.set(l*o+i,l*a-r*c,l*c+r*a,0,l*a+r*c,u*a+i,u*c-r*o,0,l*c-r*a,u*c+r*o,s*c*c+i,0,0,0,0,1),this}makeScale(e,n,i){return this.set(e,0,0,0,0,n,0,0,0,0,i,0,0,0,0,1),this}makeShear(e,n,i,r,s,o){return this.set(1,i,s,0,e,1,o,0,n,r,1,0,0,0,0,1),this}compose(e,n,i){let r=this.elements,s=n._x,o=n._y,a=n._z,c=n._w,l=s+s,u=o+o,h=a+a,f=s*l,d=s*u,m=s*h,_=o*u,g=o*h,p=a*h,x=c*l,y=c*u,v=c*h,b=i.x,M=i.y,A=i.z;return r[0]=(1-(_+p))*b,r[1]=(d+v)*b,r[2]=(m-y)*b,r[3]=0,r[4]=(d-v)*M,r[5]=(1-(f+p))*M,r[6]=(g+x)*M,r[7]=0,r[8]=(m+y)*A,r[9]=(g-x)*A,r[10]=(1-(f+_))*A,r[11]=0,r[12]=e.x,r[13]=e.y,r[14]=e.z,r[15]=1,this}decompose(e,n,i){let r=this.elements,s=fs.set(r[0],r[1],r[2]).length(),o=fs.set(r[4],r[5],r[6]).length(),a=fs.set(r[8],r[9],r[10]).length();this.determinant()<0&&(s=-s),e.x=r[12],e.y=r[13],e.z=r[14],Qn.copy(this);let l=1/s,u=1/o,h=1/a;return Qn.elements[0]*=l,Qn.elements[1]*=l,Qn.elements[2]*=l,Qn.elements[4]*=u,Qn.elements[5]*=u,Qn.elements[6]*=u,Qn.elements[8]*=h,Qn.elements[9]*=h,Qn.elements[10]*=h,n.setFromRotationMatrix(Qn),i.x=s,i.y=o,i.z=a,this}makePerspective(e,n,i,r,s,o,a=ni,c=!1){let l=this.elements,u=2*s/(n-e),h=2*s/(i-r),f=(n+e)/(n-e),d=(i+r)/(i-r),m,_;if(c)m=s/(o-s),_=o*s/(o-s);else if(a===ni)m=-(o+s)/(o-s),_=-2*o*s/(o-s);else if(a===No)m=-o/(o-s),_=-o*s/(o-s);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+a);return l[0]=u,l[4]=0,l[8]=f,l[12]=0,l[1]=0,l[5]=h,l[9]=d,l[13]=0,l[2]=0,l[6]=0,l[10]=m,l[14]=_,l[3]=0,l[7]=0,l[11]=-1,l[15]=0,this}makeOrthographic(e,n,i,r,s,o,a=ni,c=!1){let l=this.elements,u=2/(n-e),h=2/(i-r),f=-(n+e)/(n-e),d=-(i+r)/(i-r),m,_;if(c)m=1/(o-s),_=o/(o-s);else if(a===ni)m=-2/(o-s),_=-(o+s)/(o-s);else if(a===No)m=-1/(o-s),_=-s/(o-s);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+a);return l[0]=u,l[4]=0,l[8]=0,l[12]=f,l[1]=0,l[5]=h,l[9]=0,l[13]=d,l[2]=0,l[6]=0,l[10]=m,l[14]=_,l[3]=0,l[7]=0,l[11]=0,l[15]=1,this}equals(e){let n=this.elements,i=e.elements;for(let r=0;r<16;r++)if(n[r]!==i[r])return!1;return!0}fromArray(e,n=0){for(let i=0;i<16;i++)this.elements[i]=e[i+n];return this}toArray(e=[],n=0){let i=this.elements;return e[n]=i[0],e[n+1]=i[1],e[n+2]=i[2],e[n+3]=i[3],e[n+4]=i[4],e[n+5]=i[5],e[n+6]=i[6],e[n+7]=i[7],e[n+8]=i[8],e[n+9]=i[9],e[n+10]=i[10],e[n+11]=i[11],e[n+12]=i[12],e[n+13]=i[13],e[n+14]=i[14],e[n+15]=i[15],e}},fs=new R,Qn=new qe,yb=new R(0,0,0),xb=new R(1,1,1),er=new R,ec=new R,An=new R,Qp=new qe,em=new Ht,Hn=class t{constructor(e=0,n=0,i=0,r=t.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=n,this._z=i,this._order=r}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,n,i,r=this._order){return this._x=e,this._y=n,this._z=i,this._order=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,n=this._order,i=!0){let r=e.elements,s=r[0],o=r[4],a=r[8],c=r[1],l=r[5],u=r[9],h=r[2],f=r[6],d=r[10];switch(n){case"XYZ":this._y=Math.asin(tt(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(-u,d),this._z=Math.atan2(-o,s)):(this._x=Math.atan2(f,l),this._z=0);break;case"YXZ":this._x=Math.asin(-tt(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(a,d),this._z=Math.atan2(c,l)):(this._y=Math.atan2(-h,s),this._z=0);break;case"ZXY":this._x=Math.asin(tt(f,-1,1)),Math.abs(f)<.9999999?(this._y=Math.atan2(-h,d),this._z=Math.atan2(-o,l)):(this._y=0,this._z=Math.atan2(c,s));break;case"ZYX":this._y=Math.asin(-tt(h,-1,1)),Math.abs(h)<.9999999?(this._x=Math.atan2(f,d),this._z=Math.atan2(c,s)):(this._x=0,this._z=Math.atan2(-o,l));break;case"YZX":this._z=Math.asin(tt(c,-1,1)),Math.abs(c)<.9999999?(this._x=Math.atan2(-u,l),this._y=Math.atan2(-h,s)):(this._x=0,this._y=Math.atan2(a,d));break;case"XZY":this._z=Math.asin(-tt(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(f,l),this._y=Math.atan2(a,s)):(this._x=Math.atan2(-u,d),this._y=0);break;default:console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: "+n)}return this._order=n,i===!0&&this._onChangeCallback(),this}setFromQuaternion(e,n,i){return Qp.makeRotationFromQuaternion(e),this.setFromRotationMatrix(Qp,n,i)}setFromVector3(e,n=this._order){return this.set(e.x,e.y,e.z,n)}reorder(e){return em.setFromEuler(this),this.setFromQuaternion(em,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],n=0){return e[n]=this._x,e[n+1]=this._y,e[n+2]=this._z,e[n+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}};Hn.DEFAULT_ORDER="XYZ";var Is=class{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}},bb=0,tm=new R,ds=new Ht,Ii=new qe,tc=new R,Mo=new R,Mb=new R,Sb=new Ht,nm=new R(1,0,0),im=new R(0,1,0),rm=new R(0,0,1),sm={type:"added"},wb={type:"removed"},ps={type:"childadded",child:null},Ou={type:"childremoved",child:null},Xt=class t extends di{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:bb++}),this.uuid=Ni(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=t.DEFAULT_UP.clone();let e=new R,n=new Hn,i=new Ht,r=new R(1,1,1);function s(){i.setFromEuler(n,!1)}function o(){n.setFromQuaternion(i,void 0,!1)}n._onChange(s),i._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:n},quaternion:{configurable:!0,enumerable:!0,value:i},scale:{configurable:!0,enumerable:!0,value:r},modelViewMatrix:{value:new qe},normalMatrix:{value:new Ke}}),this.matrix=new qe,this.matrixWorld=new qe,this.matrixAutoUpdate=t.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=t.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new Is,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,n){this.quaternion.setFromAxisAngle(e,n)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,n){return ds.setFromAxisAngle(e,n),this.quaternion.multiply(ds),this}rotateOnWorldAxis(e,n){return ds.setFromAxisAngle(e,n),this.quaternion.premultiply(ds),this}rotateX(e){return this.rotateOnAxis(nm,e)}rotateY(e){return this.rotateOnAxis(im,e)}rotateZ(e){return this.rotateOnAxis(rm,e)}translateOnAxis(e,n){return tm.copy(e).applyQuaternion(this.quaternion),this.position.add(tm.multiplyScalar(n)),this}translateX(e){return this.translateOnAxis(nm,e)}translateY(e){return this.translateOnAxis(im,e)}translateZ(e){return this.translateOnAxis(rm,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(Ii.copy(this.matrixWorld).invert())}lookAt(e,n,i){e.isVector3?tc.copy(e):tc.set(e,n,i);let r=this.parent;this.updateWorldMatrix(!0,!1),Mo.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?Ii.lookAt(Mo,tc,this.up):Ii.lookAt(tc,Mo,this.up),this.quaternion.setFromRotationMatrix(Ii),r&&(Ii.extractRotation(r.matrixWorld),ds.setFromRotationMatrix(Ii),this.quaternion.premultiply(ds.invert()))}add(e){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.add(arguments[n]);return this}return e===this?(console.error("THREE.Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(sm),ps.child=e,this.dispatchEvent(ps),ps.child=null):console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let i=0;i<arguments.length;i++)this.remove(arguments[i]);return this}let n=this.children.indexOf(e);return n!==-1&&(e.parent=null,this.children.splice(n,1),e.dispatchEvent(wb),Ou.child=e,this.dispatchEvent(Ou),Ou.child=null),this}removeFromParent(){let e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),Ii.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),Ii.multiply(e.parent.matrixWorld)),e.applyMatrix4(Ii),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(sm),ps.child=e,this.dispatchEvent(ps),ps.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,n){if(this[e]===n)return this;for(let i=0,r=this.children.length;i<r;i++){let o=this.children[i].getObjectByProperty(e,n);if(o!==void 0)return o}}getObjectsByProperty(e,n,i=[]){this[e]===n&&i.push(this);let r=this.children;for(let s=0,o=r.length;s<o;s++)r[s].getObjectsByProperty(e,n,i);return i}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Mo,e,Mb),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Mo,Sb,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);let n=this.matrixWorld.elements;return e.set(n[8],n[9],n[10]).normalize()}raycast(){}traverse(e){e(this);let n=this.children;for(let i=0,r=n.length;i<r;i++)n[i].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);let n=this.children;for(let i=0,r=n.length;i<r;i++)n[i].traverseVisible(e)}traverseAncestors(e){let n=this.parent;n!==null&&(e(n),n.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);let n=this.children;for(let i=0,r=n.length;i<r;i++)n[i].updateMatrixWorld(e)}updateWorldMatrix(e,n){let i=this.parent;if(e===!0&&i!==null&&i.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),n===!0){let r=this.children;for(let s=0,o=r.length;s<o;s++)r[s].updateWorldMatrix(!1,!0)}}toJSON(e){let n=e===void 0||typeof e=="string",i={};n&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},i.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});let r={};r.uuid=this.uuid,r.type=this.type,this.name!==""&&(r.name=this.name),this.castShadow===!0&&(r.castShadow=!0),this.receiveShadow===!0&&(r.receiveShadow=!0),this.visible===!1&&(r.visible=!1),this.frustumCulled===!1&&(r.frustumCulled=!1),this.renderOrder!==0&&(r.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(r.userData=this.userData),r.layers=this.layers.mask,r.matrix=this.matrix.toArray(),r.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(r.matrixAutoUpdate=!1),this.isInstancedMesh&&(r.type="InstancedMesh",r.count=this.count,r.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(r.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(r.type="BatchedMesh",r.perObjectFrustumCulled=this.perObjectFrustumCulled,r.sortObjects=this.sortObjects,r.drawRanges=this._drawRanges,r.reservedRanges=this._reservedRanges,r.geometryInfo=this._geometryInfo.map(a=>Zi(Tn({},a),{boundingBox:a.boundingBox?a.boundingBox.toJSON():void 0,boundingSphere:a.boundingSphere?a.boundingSphere.toJSON():void 0})),r.instanceInfo=this._instanceInfo.map(a=>Tn({},a)),r.availableInstanceIds=this._availableInstanceIds.slice(),r.availableGeometryIds=this._availableGeometryIds.slice(),r.nextIndexStart=this._nextIndexStart,r.nextVertexStart=this._nextVertexStart,r.geometryCount=this._geometryCount,r.maxInstanceCount=this._maxInstanceCount,r.maxVertexCount=this._maxVertexCount,r.maxIndexCount=this._maxIndexCount,r.geometryInitialized=this._geometryInitialized,r.matricesTexture=this._matricesTexture.toJSON(e),r.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(r.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(r.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(r.boundingBox=this.boundingBox.toJSON()));function s(a,c){return a[c.uuid]===void 0&&(a[c.uuid]=c.toJSON(e)),c.uuid}if(this.isScene)this.background&&(this.background.isColor?r.background=this.background.toJSON():this.background.isTexture&&(r.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(r.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){r.geometry=s(e.geometries,this.geometry);let a=this.geometry.parameters;if(a!==void 0&&a.shapes!==void 0){let c=a.shapes;if(Array.isArray(c))for(let l=0,u=c.length;l<u;l++){let h=c[l];s(e.shapes,h)}else s(e.shapes,c)}}if(this.isSkinnedMesh&&(r.bindMode=this.bindMode,r.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(s(e.skeletons,this.skeleton),r.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){let a=[];for(let c=0,l=this.material.length;c<l;c++)a.push(s(e.materials,this.material[c]));r.material=a}else r.material=s(e.materials,this.material);if(this.children.length>0){r.children=[];for(let a=0;a<this.children.length;a++)r.children.push(this.children[a].toJSON(e).object)}if(this.animations.length>0){r.animations=[];for(let a=0;a<this.animations.length;a++){let c=this.animations[a];r.animations.push(s(e.animations,c))}}if(n){let a=o(e.geometries),c=o(e.materials),l=o(e.textures),u=o(e.images),h=o(e.shapes),f=o(e.skeletons),d=o(e.animations),m=o(e.nodes);a.length>0&&(i.geometries=a),c.length>0&&(i.materials=c),l.length>0&&(i.textures=l),u.length>0&&(i.images=u),h.length>0&&(i.shapes=h),f.length>0&&(i.skeletons=f),d.length>0&&(i.animations=d),m.length>0&&(i.nodes=m)}return i.object=r,i;function o(a){let c=[];for(let l in a){let u=a[l];delete u.metadata,c.push(u)}return c}}clone(e){return new this.constructor().copy(this,e)}copy(e,n=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),n===!0)for(let i=0;i<e.children.length;i++){let r=e.children[i];this.add(r.clone())}return this}};Xt.DEFAULT_UP=new R(0,1,0);Xt.DEFAULT_MATRIX_AUTO_UPDATE=!0;Xt.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;var ei=new R,Di=new R,Nu=new R,Li=new R,ms=new R,gs=new R,om=new R,Fu=new R,Uu=new R,zu=new R,ku=new mt,Bu=new mt,Vu=new mt,Oi=class t{constructor(e=new R,n=new R,i=new R){this.a=e,this.b=n,this.c=i}static getNormal(e,n,i,r){r.subVectors(i,n),ei.subVectors(e,n),r.cross(ei);let s=r.lengthSq();return s>0?r.multiplyScalar(1/Math.sqrt(s)):r.set(0,0,0)}static getBarycoord(e,n,i,r,s){ei.subVectors(r,n),Di.subVectors(i,n),Nu.subVectors(e,n);let o=ei.dot(ei),a=ei.dot(Di),c=ei.dot(Nu),l=Di.dot(Di),u=Di.dot(Nu),h=o*l-a*a;if(h===0)return s.set(0,0,0),null;let f=1/h,d=(l*c-a*u)*f,m=(o*u-a*c)*f;return s.set(1-d-m,m,d)}static containsPoint(e,n,i,r){return this.getBarycoord(e,n,i,r,Li)===null?!1:Li.x>=0&&Li.y>=0&&Li.x+Li.y<=1}static getInterpolation(e,n,i,r,s,o,a,c){return this.getBarycoord(e,n,i,r,Li)===null?(c.x=0,c.y=0,"z"in c&&(c.z=0),"w"in c&&(c.w=0),null):(c.setScalar(0),c.addScaledVector(s,Li.x),c.addScaledVector(o,Li.y),c.addScaledVector(a,Li.z),c)}static getInterpolatedAttribute(e,n,i,r,s,o){return ku.setScalar(0),Bu.setScalar(0),Vu.setScalar(0),ku.fromBufferAttribute(e,n),Bu.fromBufferAttribute(e,i),Vu.fromBufferAttribute(e,r),o.setScalar(0),o.addScaledVector(ku,s.x),o.addScaledVector(Bu,s.y),o.addScaledVector(Vu,s.z),o}static isFrontFacing(e,n,i,r){return ei.subVectors(i,n),Di.subVectors(e,n),ei.cross(Di).dot(r)<0}set(e,n,i){return this.a.copy(e),this.b.copy(n),this.c.copy(i),this}setFromPointsAndIndices(e,n,i,r){return this.a.copy(e[n]),this.b.copy(e[i]),this.c.copy(e[r]),this}setFromAttributeAndIndices(e,n,i,r){return this.a.fromBufferAttribute(e,n),this.b.fromBufferAttribute(e,i),this.c.fromBufferAttribute(e,r),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return ei.subVectors(this.c,this.b),Di.subVectors(this.a,this.b),ei.cross(Di).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return t.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,n){return t.getBarycoord(e,this.a,this.b,this.c,n)}getInterpolation(e,n,i,r,s){return t.getInterpolation(e,this.a,this.b,this.c,n,i,r,s)}containsPoint(e){return t.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return t.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,n){let i=this.a,r=this.b,s=this.c,o,a;ms.subVectors(r,i),gs.subVectors(s,i),Fu.subVectors(e,i);let c=ms.dot(Fu),l=gs.dot(Fu);if(c<=0&&l<=0)return n.copy(i);Uu.subVectors(e,r);let u=ms.dot(Uu),h=gs.dot(Uu);if(u>=0&&h<=u)return n.copy(r);let f=c*h-u*l;if(f<=0&&c>=0&&u<=0)return o=c/(c-u),n.copy(i).addScaledVector(ms,o);zu.subVectors(e,s);let d=ms.dot(zu),m=gs.dot(zu);if(m>=0&&d<=m)return n.copy(s);let _=d*l-c*m;if(_<=0&&l>=0&&m<=0)return a=l/(l-m),n.copy(i).addScaledVector(gs,a);let g=u*m-d*h;if(g<=0&&h-u>=0&&d-m>=0)return om.subVectors(s,r),a=(h-u)/(h-u+(d-m)),n.copy(r).addScaledVector(om,a);let p=1/(g+_+f);return o=_*p,a=f*p,n.copy(i).addScaledVector(ms,o).addScaledVector(gs,a)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}},cg={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},tr={h:0,s:0,l:0},nc={h:0,s:0,l:0};function Hu(t,e,n){return n<0&&(n+=1),n>1&&(n-=1),n<1/6?t+(e-t)*6*n:n<1/2?e:n<2/3?t+(e-t)*6*(2/3-n):t}var Fe=class{constructor(e,n,i){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,n,i)}set(e,n,i){if(n===void 0&&i===void 0){let r=e;r&&r.isColor?this.copy(r):typeof r=="number"?this.setHex(r):typeof r=="string"&&this.setStyle(r)}else this.setRGB(e,n,i);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,n=Yt){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,st.colorSpaceToWorking(this,n),this}setRGB(e,n,i,r=st.workingColorSpace){return this.r=e,this.g=n,this.b=i,st.colorSpaceToWorking(this,r),this}setHSL(e,n,i,r=st.workingColorSpace){if(e=wf(e,1),n=tt(n,0,1),i=tt(i,0,1),n===0)this.r=this.g=this.b=i;else{let s=i<=.5?i*(1+n):i+n-i*n,o=2*i-s;this.r=Hu(o,s,e+1/3),this.g=Hu(o,s,e),this.b=Hu(o,s,e-1/3)}return st.colorSpaceToWorking(this,r),this}setStyle(e,n=Yt){function i(s){s!==void 0&&parseFloat(s)<1&&console.warn("THREE.Color: Alpha component of "+e+" will be ignored.")}let r;if(r=/^(\w+)\(([^\)]*)\)/.exec(e)){let s,o=r[1],a=r[2];switch(o){case"rgb":case"rgba":if(s=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return i(s[4]),this.setRGB(Math.min(255,parseInt(s[1],10))/255,Math.min(255,parseInt(s[2],10))/255,Math.min(255,parseInt(s[3],10))/255,n);if(s=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return i(s[4]),this.setRGB(Math.min(100,parseInt(s[1],10))/100,Math.min(100,parseInt(s[2],10))/100,Math.min(100,parseInt(s[3],10))/100,n);break;case"hsl":case"hsla":if(s=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return i(s[4]),this.setHSL(parseFloat(s[1])/360,parseFloat(s[2])/100,parseFloat(s[3])/100,n);break;default:console.warn("THREE.Color: Unknown color model "+e)}}else if(r=/^\#([A-Fa-f\d]+)$/.exec(e)){let s=r[1],o=s.length;if(o===3)return this.setRGB(parseInt(s.charAt(0),16)/15,parseInt(s.charAt(1),16)/15,parseInt(s.charAt(2),16)/15,n);if(o===6)return this.setHex(parseInt(s,16),n);console.warn("THREE.Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,n);return this}setColorName(e,n=Yt){let i=cg[e.toLowerCase()];return i!==void 0?this.setHex(i,n):console.warn("THREE.Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=Fi(e.r),this.g=Fi(e.g),this.b=Fi(e.b),this}copyLinearToSRGB(e){return this.r=Es(e.r),this.g=Es(e.g),this.b=Es(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=Yt){return st.workingToColorSpace(en.copy(this),e),Math.round(tt(en.r*255,0,255))*65536+Math.round(tt(en.g*255,0,255))*256+Math.round(tt(en.b*255,0,255))}getHexString(e=Yt){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,n=st.workingColorSpace){st.workingToColorSpace(en.copy(this),n);let i=en.r,r=en.g,s=en.b,o=Math.max(i,r,s),a=Math.min(i,r,s),c,l,u=(a+o)/2;if(a===o)c=0,l=0;else{let h=o-a;switch(l=u<=.5?h/(o+a):h/(2-o-a),o){case i:c=(r-s)/h+(r<s?6:0);break;case r:c=(s-i)/h+2;break;case s:c=(i-r)/h+4;break}c/=6}return e.h=c,e.s=l,e.l=u,e}getRGB(e,n=st.workingColorSpace){return st.workingToColorSpace(en.copy(this),n),e.r=en.r,e.g=en.g,e.b=en.b,e}getStyle(e=Yt){st.workingToColorSpace(en.copy(this),e);let n=en.r,i=en.g,r=en.b;return e!==Yt?`color(${e} ${n.toFixed(3)} ${i.toFixed(3)} ${r.toFixed(3)})`:`rgb(${Math.round(n*255)},${Math.round(i*255)},${Math.round(r*255)})`}offsetHSL(e,n,i){return this.getHSL(tr),this.setHSL(tr.h+e,tr.s+n,tr.l+i)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,n){return this.r=e.r+n.r,this.g=e.g+n.g,this.b=e.b+n.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,n){return this.r+=(e.r-this.r)*n,this.g+=(e.g-this.g)*n,this.b+=(e.b-this.b)*n,this}lerpColors(e,n,i){return this.r=e.r+(n.r-e.r)*i,this.g=e.g+(n.g-e.g)*i,this.b=e.b+(n.b-e.b)*i,this}lerpHSL(e,n){this.getHSL(tr),e.getHSL(nc);let i=Po(tr.h,nc.h,n),r=Po(tr.s,nc.s,n),s=Po(tr.l,nc.l,n);return this.setHSL(i,r,s),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){let n=this.r,i=this.g,r=this.b,s=e.elements;return this.r=s[0]*n+s[3]*i+s[6]*r,this.g=s[1]*n+s[4]*i+s[7]*r,this.b=s[2]*n+s[5]*i+s[8]*r,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,n=0){return this.r=e[n],this.g=e[n+1],this.b=e[n+2],this}toArray(e=[],n=0){return e[n]=this.r,e[n+1]=this.g,e[n+2]=this.b,e}fromBufferAttribute(e,n){return this.r=e.getX(n),this.g=e.getY(n),this.b=e.getZ(n),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}},en=new Fe;Fe.NAMES=cg;var Eb=0,Gn=class extends di{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:Eb++}),this.uuid=Ni(),this.name="",this.type="Material",this.blending=Dr,this.side=Ui,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=Sc,this.blendDst=wc,this.blendEquation=rr,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Fe(0,0,0),this.blendAlpha=0,this.depthFunc=Lr,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=nf,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Ir,this.stencilZFail=Ir,this.stencilZPass=Ir,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(let n in e){let i=e[n];if(i===void 0){console.warn(`THREE.Material: parameter '${n}' has value of undefined.`);continue}let r=this[n];if(r===void 0){console.warn(`THREE.Material: '${n}' is not a property of THREE.${this.type}.`);continue}r&&r.isColor?r.set(i):r&&r.isVector3&&i&&i.isVector3?r.copy(i):this[n]=i}}toJSON(e){let n=e===void 0||typeof e=="string";n&&(e={textures:{},images:{}});let i={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};i.uuid=this.uuid,i.type=this.type,this.name!==""&&(i.name=this.name),this.color&&this.color.isColor&&(i.color=this.color.getHex()),this.roughness!==void 0&&(i.roughness=this.roughness),this.metalness!==void 0&&(i.metalness=this.metalness),this.sheen!==void 0&&(i.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(i.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(i.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(i.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(i.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(i.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(i.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(i.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(i.shininess=this.shininess),this.clearcoat!==void 0&&(i.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(i.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(i.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(i.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(i.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,i.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(i.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(i.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(i.dispersion=this.dispersion),this.iridescence!==void 0&&(i.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(i.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(i.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(i.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(i.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(i.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(i.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(i.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(i.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(i.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(i.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(i.lightMap=this.lightMap.toJSON(e).uuid,i.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(i.aoMap=this.aoMap.toJSON(e).uuid,i.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(i.bumpMap=this.bumpMap.toJSON(e).uuid,i.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(i.normalMap=this.normalMap.toJSON(e).uuid,i.normalMapType=this.normalMapType,i.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(i.displacementMap=this.displacementMap.toJSON(e).uuid,i.displacementScale=this.displacementScale,i.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(i.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(i.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(i.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(i.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(i.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(i.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(i.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(i.combine=this.combine)),this.envMapRotation!==void 0&&(i.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(i.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(i.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(i.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(i.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(i.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(i.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(i.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(i.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(i.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(i.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(i.size=this.size),this.shadowSide!==null&&(i.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(i.sizeAttenuation=this.sizeAttenuation),this.blending!==Dr&&(i.blending=this.blending),this.side!==Ui&&(i.side=this.side),this.vertexColors===!0&&(i.vertexColors=!0),this.opacity<1&&(i.opacity=this.opacity),this.transparent===!0&&(i.transparent=!0),this.blendSrc!==Sc&&(i.blendSrc=this.blendSrc),this.blendDst!==wc&&(i.blendDst=this.blendDst),this.blendEquation!==rr&&(i.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(i.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(i.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(i.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(i.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(i.blendAlpha=this.blendAlpha),this.depthFunc!==Lr&&(i.depthFunc=this.depthFunc),this.depthTest===!1&&(i.depthTest=this.depthTest),this.depthWrite===!1&&(i.depthWrite=this.depthWrite),this.colorWrite===!1&&(i.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(i.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==nf&&(i.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(i.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(i.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==Ir&&(i.stencilFail=this.stencilFail),this.stencilZFail!==Ir&&(i.stencilZFail=this.stencilZFail),this.stencilZPass!==Ir&&(i.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(i.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(i.rotation=this.rotation),this.polygonOffset===!0&&(i.polygonOffset=!0),this.polygonOffsetFactor!==0&&(i.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(i.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(i.linewidth=this.linewidth),this.dashSize!==void 0&&(i.dashSize=this.dashSize),this.gapSize!==void 0&&(i.gapSize=this.gapSize),this.scale!==void 0&&(i.scale=this.scale),this.dithering===!0&&(i.dithering=!0),this.alphaTest>0&&(i.alphaTest=this.alphaTest),this.alphaHash===!0&&(i.alphaHash=!0),this.alphaToCoverage===!0&&(i.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(i.premultipliedAlpha=!0),this.forceSinglePass===!0&&(i.forceSinglePass=!0),this.wireframe===!0&&(i.wireframe=!0),this.wireframeLinewidth>1&&(i.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(i.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(i.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(i.flatShading=!0),this.visible===!1&&(i.visible=!1),this.toneMapped===!1&&(i.toneMapped=!1),this.fog===!1&&(i.fog=!1),Object.keys(this.userData).length>0&&(i.userData=this.userData);function r(s){let o=[];for(let a in s){let c=s[a];delete c.metadata,o.push(c)}return o}if(n){let s=r(e.textures),o=r(e.images);s.length>0&&(i.textures=s),o.length>0&&(i.images=o)}return i}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;let n=e.clippingPlanes,i=null;if(n!==null){let r=n.length;i=new Array(r);for(let s=0;s!==r;++s)i[s]=n[s].clone()}return this.clippingPlanes=i,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}},Rn=class extends Gn{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new Fe(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Hn,this.combine=ul,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}};var kt=new R,ic=new ie,Tb=0,nn=class{constructor(e,n,i=!1){if(Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:Tb++}),this.name="",this.array=e,this.itemSize=n,this.count=e!==void 0?e.length/n:0,this.normalized=i,this.usage=Cc,this.updateRanges=[],this.gpuType=bi,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,n){this.updateRanges.push({start:e,count:n})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,n,i){e*=this.itemSize,i*=n.itemSize;for(let r=0,s=this.itemSize;r<s;r++)this.array[e+r]=n.array[i+r];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let n=0,i=this.count;n<i;n++)ic.fromBufferAttribute(this,n),ic.applyMatrix3(e),this.setXY(n,ic.x,ic.y);else if(this.itemSize===3)for(let n=0,i=this.count;n<i;n++)kt.fromBufferAttribute(this,n),kt.applyMatrix3(e),this.setXYZ(n,kt.x,kt.y,kt.z);return this}applyMatrix4(e){for(let n=0,i=this.count;n<i;n++)kt.fromBufferAttribute(this,n),kt.applyMatrix4(e),this.setXYZ(n,kt.x,kt.y,kt.z);return this}applyNormalMatrix(e){for(let n=0,i=this.count;n<i;n++)kt.fromBufferAttribute(this,n),kt.applyNormalMatrix(e),this.setXYZ(n,kt.x,kt.y,kt.z);return this}transformDirection(e){for(let n=0,i=this.count;n<i;n++)kt.fromBufferAttribute(this,n),kt.transformDirection(e),this.setXYZ(n,kt.x,kt.y,kt.z);return this}set(e,n=0){return this.array.set(e,n),this}getComponent(e,n){let i=this.array[e*this.itemSize+n];return this.normalized&&(i=ti(i,this.array)),i}setComponent(e,n,i){return this.normalized&&(i=pt(i,this.array)),this.array[e*this.itemSize+n]=i,this}getX(e){let n=this.array[e*this.itemSize];return this.normalized&&(n=ti(n,this.array)),n}setX(e,n){return this.normalized&&(n=pt(n,this.array)),this.array[e*this.itemSize]=n,this}getY(e){let n=this.array[e*this.itemSize+1];return this.normalized&&(n=ti(n,this.array)),n}setY(e,n){return this.normalized&&(n=pt(n,this.array)),this.array[e*this.itemSize+1]=n,this}getZ(e){let n=this.array[e*this.itemSize+2];return this.normalized&&(n=ti(n,this.array)),n}setZ(e,n){return this.normalized&&(n=pt(n,this.array)),this.array[e*this.itemSize+2]=n,this}getW(e){let n=this.array[e*this.itemSize+3];return this.normalized&&(n=ti(n,this.array)),n}setW(e,n){return this.normalized&&(n=pt(n,this.array)),this.array[e*this.itemSize+3]=n,this}setXY(e,n,i){return e*=this.itemSize,this.normalized&&(n=pt(n,this.array),i=pt(i,this.array)),this.array[e+0]=n,this.array[e+1]=i,this}setXYZ(e,n,i,r){return e*=this.itemSize,this.normalized&&(n=pt(n,this.array),i=pt(i,this.array),r=pt(r,this.array)),this.array[e+0]=n,this.array[e+1]=i,this.array[e+2]=r,this}setXYZW(e,n,i,r,s){return e*=this.itemSize,this.normalized&&(n=pt(n,this.array),i=pt(i,this.array),r=pt(r,this.array),s=pt(s,this.array)),this.array[e+0]=n,this.array[e+1]=i,this.array[e+2]=r,this.array[e+3]=s,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==Cc&&(e.usage=this.usage),e}};var Uo=class extends nn{constructor(e,n,i){super(new Uint16Array(e),n,i)}};var zo=class extends nn{constructor(e,n,i){super(new Uint32Array(e),n,i)}};var ht=class extends nn{constructor(e,n,i){super(new Float32Array(e),n,i)}},Ab=0,Bn=new qe,Gu=new Xt,_s=new R,Cn=new vn,So=new vn,qt=new R,Mt=class t extends di{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Ab++}),this.uuid=Ni(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(Ef(e)?zo:Uo)(e,1):this.index=e,this}setIndirect(e){return this.indirect=e,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,n){return this.attributes[e]=n,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,n,i=0){this.groups.push({start:e,count:n,materialIndex:i})}clearGroups(){this.groups=[]}setDrawRange(e,n){this.drawRange.start=e,this.drawRange.count=n}applyMatrix4(e){let n=this.attributes.position;n!==void 0&&(n.applyMatrix4(e),n.needsUpdate=!0);let i=this.attributes.normal;if(i!==void 0){let s=new Ke().getNormalMatrix(e);i.applyNormalMatrix(s),i.needsUpdate=!0}let r=this.attributes.tangent;return r!==void 0&&(r.transformDirection(e),r.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(e){return Bn.makeRotationFromQuaternion(e),this.applyMatrix4(Bn),this}rotateX(e){return Bn.makeRotationX(e),this.applyMatrix4(Bn),this}rotateY(e){return Bn.makeRotationY(e),this.applyMatrix4(Bn),this}rotateZ(e){return Bn.makeRotationZ(e),this.applyMatrix4(Bn),this}translate(e,n,i){return Bn.makeTranslation(e,n,i),this.applyMatrix4(Bn),this}scale(e,n,i){return Bn.makeScale(e,n,i),this.applyMatrix4(Bn),this}lookAt(e){return Gu.lookAt(e),Gu.updateMatrix(),this.applyMatrix4(Gu.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(_s).negate(),this.translate(_s.x,_s.y,_s.z),this}setFromPoints(e){let n=this.getAttribute("position");if(n===void 0){let i=[];for(let r=0,s=e.length;r<s;r++){let o=e[r];i.push(o.x,o.y,o.z||0)}this.setAttribute("position",new ht(i,3))}else{let i=Math.min(e.length,n.count);for(let r=0;r<i;r++){let s=e[r];n.setXYZ(r,s.x,s.y,s.z||0)}e.length>n.count&&console.warn("THREE.BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),n.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new vn);let e=this.attributes.position,n=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new R(-1/0,-1/0,-1/0),new R(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),n)for(let i=0,r=n.length;i<r;i++){let s=n[i];Cn.setFromBufferAttribute(s),this.morphTargetsRelative?(qt.addVectors(this.boundingBox.min,Cn.min),this.boundingBox.expandByPoint(qt),qt.addVectors(this.boundingBox.max,Cn.max),this.boundingBox.expandByPoint(qt)):(this.boundingBox.expandByPoint(Cn.min),this.boundingBox.expandByPoint(Cn.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new pi);let e=this.attributes.position,n=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new R,1/0);return}if(e){let i=this.boundingSphere.center;if(Cn.setFromBufferAttribute(e),n)for(let s=0,o=n.length;s<o;s++){let a=n[s];So.setFromBufferAttribute(a),this.morphTargetsRelative?(qt.addVectors(Cn.min,So.min),Cn.expandByPoint(qt),qt.addVectors(Cn.max,So.max),Cn.expandByPoint(qt)):(Cn.expandByPoint(So.min),Cn.expandByPoint(So.max))}Cn.getCenter(i);let r=0;for(let s=0,o=e.count;s<o;s++)qt.fromBufferAttribute(e,s),r=Math.max(r,i.distanceToSquared(qt));if(n)for(let s=0,o=n.length;s<o;s++){let a=n[s],c=this.morphTargetsRelative;for(let l=0,u=a.count;l<u;l++)qt.fromBufferAttribute(a,l),c&&(_s.fromBufferAttribute(e,l),qt.add(_s)),r=Math.max(r,i.distanceToSquared(qt))}this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){let e=this.index,n=this.attributes;if(e===null||n.position===void 0||n.normal===void 0||n.uv===void 0){console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}let i=n.position,r=n.normal,s=n.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new nn(new Float32Array(4*i.count),4));let o=this.getAttribute("tangent"),a=[],c=[];for(let C=0;C<i.count;C++)a[C]=new R,c[C]=new R;let l=new R,u=new R,h=new R,f=new ie,d=new ie,m=new ie,_=new R,g=new R;function p(C,T,w){l.fromBufferAttribute(i,C),u.fromBufferAttribute(i,T),h.fromBufferAttribute(i,w),f.fromBufferAttribute(s,C),d.fromBufferAttribute(s,T),m.fromBufferAttribute(s,w),u.sub(l),h.sub(l),d.sub(f),m.sub(f);let P=1/(d.x*m.y-m.x*d.y);isFinite(P)&&(_.copy(u).multiplyScalar(m.y).addScaledVector(h,-d.y).multiplyScalar(P),g.copy(h).multiplyScalar(d.x).addScaledVector(u,-m.x).multiplyScalar(P),a[C].add(_),a[T].add(_),a[w].add(_),c[C].add(g),c[T].add(g),c[w].add(g))}let x=this.groups;x.length===0&&(x=[{start:0,count:e.count}]);for(let C=0,T=x.length;C<T;++C){let w=x[C],P=w.start,z=w.count;for(let U=P,O=P+z;U<O;U+=3)p(e.getX(U+0),e.getX(U+1),e.getX(U+2))}let y=new R,v=new R,b=new R,M=new R;function A(C){b.fromBufferAttribute(r,C),M.copy(b);let T=a[C];y.copy(T),y.sub(b.multiplyScalar(b.dot(T))).normalize(),v.crossVectors(M,T);let P=v.dot(c[C])<0?-1:1;o.setXYZW(C,y.x,y.y,y.z,P)}for(let C=0,T=x.length;C<T;++C){let w=x[C],P=w.start,z=w.count;for(let U=P,O=P+z;U<O;U+=3)A(e.getX(U+0)),A(e.getX(U+1)),A(e.getX(U+2))}}computeVertexNormals(){let e=this.index,n=this.getAttribute("position");if(n!==void 0){let i=this.getAttribute("normal");if(i===void 0)i=new nn(new Float32Array(n.count*3),3),this.setAttribute("normal",i);else for(let f=0,d=i.count;f<d;f++)i.setXYZ(f,0,0,0);let r=new R,s=new R,o=new R,a=new R,c=new R,l=new R,u=new R,h=new R;if(e)for(let f=0,d=e.count;f<d;f+=3){let m=e.getX(f+0),_=e.getX(f+1),g=e.getX(f+2);r.fromBufferAttribute(n,m),s.fromBufferAttribute(n,_),o.fromBufferAttribute(n,g),u.subVectors(o,s),h.subVectors(r,s),u.cross(h),a.fromBufferAttribute(i,m),c.fromBufferAttribute(i,_),l.fromBufferAttribute(i,g),a.add(u),c.add(u),l.add(u),i.setXYZ(m,a.x,a.y,a.z),i.setXYZ(_,c.x,c.y,c.z),i.setXYZ(g,l.x,l.y,l.z)}else for(let f=0,d=n.count;f<d;f+=3)r.fromBufferAttribute(n,f+0),s.fromBufferAttribute(n,f+1),o.fromBufferAttribute(n,f+2),u.subVectors(o,s),h.subVectors(r,s),u.cross(h),i.setXYZ(f+0,u.x,u.y,u.z),i.setXYZ(f+1,u.x,u.y,u.z),i.setXYZ(f+2,u.x,u.y,u.z);this.normalizeNormals(),i.needsUpdate=!0}}normalizeNormals(){let e=this.attributes.normal;for(let n=0,i=e.count;n<i;n++)qt.fromBufferAttribute(e,n),qt.normalize(),e.setXYZ(n,qt.x,qt.y,qt.z)}toNonIndexed(){function e(a,c){let l=a.array,u=a.itemSize,h=a.normalized,f=new l.constructor(c.length*u),d=0,m=0;for(let _=0,g=c.length;_<g;_++){a.isInterleavedBufferAttribute?d=c[_]*a.data.stride+a.offset:d=c[_]*u;for(let p=0;p<u;p++)f[m++]=l[d++]}return new nn(f,u,h)}if(this.index===null)return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;let n=new t,i=this.index.array,r=this.attributes;for(let a in r){let c=r[a],l=e(c,i);n.setAttribute(a,l)}let s=this.morphAttributes;for(let a in s){let c=[],l=s[a];for(let u=0,h=l.length;u<h;u++){let f=l[u],d=e(f,i);c.push(d)}n.morphAttributes[a]=c}n.morphTargetsRelative=this.morphTargetsRelative;let o=this.groups;for(let a=0,c=o.length;a<c;a++){let l=o[a];n.addGroup(l.start,l.count,l.materialIndex)}return n}toJSON(){let e={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0){let c=this.parameters;for(let l in c)c[l]!==void 0&&(e[l]=c[l]);return e}e.data={attributes:{}};let n=this.index;n!==null&&(e.data.index={type:n.array.constructor.name,array:Array.prototype.slice.call(n.array)});let i=this.attributes;for(let c in i){let l=i[c];e.data.attributes[c]=l.toJSON(e.data)}let r={},s=!1;for(let c in this.morphAttributes){let l=this.morphAttributes[c],u=[];for(let h=0,f=l.length;h<f;h++){let d=l[h];u.push(d.toJSON(e.data))}u.length>0&&(r[c]=u,s=!0)}s&&(e.data.morphAttributes=r,e.data.morphTargetsRelative=this.morphTargetsRelative);let o=this.groups;o.length>0&&(e.data.groups=JSON.parse(JSON.stringify(o)));let a=this.boundingSphere;return a!==null&&(e.data.boundingSphere=a.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let n={};this.name=e.name;let i=e.index;i!==null&&this.setIndex(i.clone());let r=e.attributes;for(let l in r){let u=r[l];this.setAttribute(l,u.clone(n))}let s=e.morphAttributes;for(let l in s){let u=[],h=s[l];for(let f=0,d=h.length;f<d;f++)u.push(h[f].clone(n));this.morphAttributes[l]=u}this.morphTargetsRelative=e.morphTargetsRelative;let o=e.groups;for(let l=0,u=o.length;l<u;l++){let h=o[l];this.addGroup(h.start,h.count,h.materialIndex)}let a=e.boundingBox;a!==null&&(this.boundingBox=a.clone());let c=e.boundingSphere;return c!==null&&(this.boundingSphere=c.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}},am=new qe,Rr=new zi,rc=new pi,cm=new R,sc=new R,oc=new R,ac=new R,Wu=new R,cc=new R,lm=new R,lc=new R,Ct=class extends Xt{constructor(e=new Mt,n=new Rn){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=n,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,n){return super.copy(e,n),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){let n=this.geometry.morphAttributes,i=Object.keys(n);if(i.length>0){let r=n[i[0]];if(r!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,o=r.length;s<o;s++){let a=r[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=s}}}}getVertexPosition(e,n){let i=this.geometry,r=i.attributes.position,s=i.morphAttributes.position,o=i.morphTargetsRelative;n.fromBufferAttribute(r,e);let a=this.morphTargetInfluences;if(s&&a){cc.set(0,0,0);for(let c=0,l=s.length;c<l;c++){let u=a[c],h=s[c];u!==0&&(Wu.fromBufferAttribute(h,e),o?cc.addScaledVector(Wu,u):cc.addScaledVector(Wu.sub(n),u))}n.add(cc)}return n}raycast(e,n){let i=this.geometry,r=this.material,s=this.matrixWorld;r!==void 0&&(i.boundingSphere===null&&i.computeBoundingSphere(),rc.copy(i.boundingSphere),rc.applyMatrix4(s),Rr.copy(e.ray).recast(e.near),!(rc.containsPoint(Rr.origin)===!1&&(Rr.intersectSphere(rc,cm)===null||Rr.origin.distanceToSquared(cm)>(e.far-e.near)**2))&&(am.copy(s).invert(),Rr.copy(e.ray).applyMatrix4(am),!(i.boundingBox!==null&&Rr.intersectsBox(i.boundingBox)===!1)&&this._computeIntersections(e,n,Rr)))}_computeIntersections(e,n,i){let r,s=this.geometry,o=this.material,a=s.index,c=s.attributes.position,l=s.attributes.uv,u=s.attributes.uv1,h=s.attributes.normal,f=s.groups,d=s.drawRange;if(a!==null)if(Array.isArray(o))for(let m=0,_=f.length;m<_;m++){let g=f[m],p=o[g.materialIndex],x=Math.max(g.start,d.start),y=Math.min(a.count,Math.min(g.start+g.count,d.start+d.count));for(let v=x,b=y;v<b;v+=3){let M=a.getX(v),A=a.getX(v+1),C=a.getX(v+2);r=hc(this,p,e,i,l,u,h,M,A,C),r&&(r.faceIndex=Math.floor(v/3),r.face.materialIndex=g.materialIndex,n.push(r))}}else{let m=Math.max(0,d.start),_=Math.min(a.count,d.start+d.count);for(let g=m,p=_;g<p;g+=3){let x=a.getX(g),y=a.getX(g+1),v=a.getX(g+2);r=hc(this,o,e,i,l,u,h,x,y,v),r&&(r.faceIndex=Math.floor(g/3),n.push(r))}}else if(c!==void 0)if(Array.isArray(o))for(let m=0,_=f.length;m<_;m++){let g=f[m],p=o[g.materialIndex],x=Math.max(g.start,d.start),y=Math.min(c.count,Math.min(g.start+g.count,d.start+d.count));for(let v=x,b=y;v<b;v+=3){let M=v,A=v+1,C=v+2;r=hc(this,p,e,i,l,u,h,M,A,C),r&&(r.faceIndex=Math.floor(v/3),r.face.materialIndex=g.materialIndex,n.push(r))}}else{let m=Math.max(0,d.start),_=Math.min(c.count,d.start+d.count);for(let g=m,p=_;g<p;g+=3){let x=g,y=g+1,v=g+2;r=hc(this,o,e,i,l,u,h,x,y,v),r&&(r.faceIndex=Math.floor(g/3),n.push(r))}}}};function Cb(t,e,n,i,r,s,o,a){let c;if(e.side===Kt?c=i.intersectTriangle(o,s,r,!0,a):c=i.intersectTriangle(r,s,o,e.side===Ui,a),c===null)return null;lc.copy(a),lc.applyMatrix4(t.matrixWorld);let l=n.ray.origin.distanceTo(lc);return l<n.near||l>n.far?null:{distance:l,point:lc.clone(),object:t}}function hc(t,e,n,i,r,s,o,a,c,l){t.getVertexPosition(a,sc),t.getVertexPosition(c,oc),t.getVertexPosition(l,ac);let u=Cb(t,e,n,i,sc,oc,ac,lm);if(u){let h=new R;Oi.getBarycoord(lm,sc,oc,ac,h),r&&(u.uv=Oi.getInterpolatedAttribute(r,a,c,l,h,new ie)),s&&(u.uv1=Oi.getInterpolatedAttribute(s,a,c,l,h,new ie)),o&&(u.normal=Oi.getInterpolatedAttribute(o,a,c,l,h,new R),u.normal.dot(i.direction)>0&&u.normal.multiplyScalar(-1));let f={a,b:c,c:l,normal:new R,materialIndex:0};Oi.getNormal(sc,oc,ac,f.normal),u.face=f,u.barycoord=h}return u}var Ds=class t extends Mt{constructor(e=1,n=1,i=1,r=1,s=1,o=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:n,depth:i,widthSegments:r,heightSegments:s,depthSegments:o};let a=this;r=Math.floor(r),s=Math.floor(s),o=Math.floor(o);let c=[],l=[],u=[],h=[],f=0,d=0;m("z","y","x",-1,-1,i,n,e,o,s,0),m("z","y","x",1,-1,i,n,-e,o,s,1),m("x","z","y",1,1,e,i,n,r,o,2),m("x","z","y",1,-1,e,i,-n,r,o,3),m("x","y","z",1,-1,e,n,i,r,s,4),m("x","y","z",-1,-1,e,n,-i,r,s,5),this.setIndex(c),this.setAttribute("position",new ht(l,3)),this.setAttribute("normal",new ht(u,3)),this.setAttribute("uv",new ht(h,2));function m(_,g,p,x,y,v,b,M,A,C,T){let w=v/A,P=b/C,z=v/2,U=b/2,O=M/2,D=A+1,V=C+1,Q=0,j=0,ae=new R;for(let ye=0;ye<V;ye++){let Z=ye*P-U;for(let re=0;re<D;re++){let me=re*w-z;ae[_]=me*x,ae[g]=Z*y,ae[p]=O,l.push(ae.x,ae.y,ae.z),ae[_]=0,ae[g]=0,ae[p]=M>0?1:-1,u.push(ae.x,ae.y,ae.z),h.push(re/A),h.push(1-ye/C),Q+=1}}for(let ye=0;ye<C;ye++)for(let Z=0;Z<A;Z++){let re=f+Z+D*ye,me=f+Z+D*(ye+1),Ge=f+(Z+1)+D*(ye+1),Ne=f+(Z+1)+D*ye;c.push(re,me,Ne),c.push(me,Ge,Ne),j+=6}a.addGroup(d,j,T),d+=j,f+=Q}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new t(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}};function Vr(t){let e={};for(let n in t){e[n]={};for(let i in t[n]){let r=t[n][i];r&&(r.isColor||r.isMatrix3||r.isMatrix4||r.isVector2||r.isVector3||r.isVector4||r.isTexture||r.isQuaternion)?r.isRenderTargetTexture?(console.warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[n][i]=null):e[n][i]=r.clone():Array.isArray(r)?e[n][i]=r.slice():e[n][i]=r}}return e}function sn(t){let e={};for(let n=0;n<t.length;n++){let i=Vr(t[n]);for(let r in i)e[r]=i[r]}return e}function Rb(t){let e=[];for(let n=0;n<t.length;n++)e.push(t[n].clone());return e}function Tf(t){let e=t.getRenderTarget();return e===null?t.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:st.workingColorSpace}var Gi={clone:Vr,merge:sn},Pb=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,Ib=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`,Bt=class extends Gn{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=Pb,this.fragmentShader=Ib,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=Vr(e.uniforms),this.uniformsGroups=Rb(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this}toJSON(e){let n=super.toJSON(e);n.glslVersion=this.glslVersion,n.uniforms={};for(let r in this.uniforms){let o=this.uniforms[r].value;o&&o.isTexture?n.uniforms[r]={type:"t",value:o.toJSON(e).uuid}:o&&o.isColor?n.uniforms[r]={type:"c",value:o.getHex()}:o&&o.isVector2?n.uniforms[r]={type:"v2",value:o.toArray()}:o&&o.isVector3?n.uniforms[r]={type:"v3",value:o.toArray()}:o&&o.isVector4?n.uniforms[r]={type:"v4",value:o.toArray()}:o&&o.isMatrix3?n.uniforms[r]={type:"m3",value:o.toArray()}:o&&o.isMatrix4?n.uniforms[r]={type:"m4",value:o.toArray()}:n.uniforms[r]={value:o}}Object.keys(this.defines).length>0&&(n.defines=this.defines),n.vertexShader=this.vertexShader,n.fragmentShader=this.fragmentShader,n.lights=this.lights,n.clipping=this.clipping;let i={};for(let r in this.extensions)this.extensions[r]===!0&&(i[r]=!0);return Object.keys(i).length>0&&(n.extensions=i),n}},ko=class extends Xt{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new qe,this.projectionMatrix=new qe,this.projectionMatrixInverse=new qe,this.coordinateSystem=ni,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,n){return super.copy(e,n),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(e,n){super.updateWorldMatrix(e,n),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}},nr=new R,hm=new ie,um=new ie,Zt=class extends ko{constructor(e=50,n=1,i=.1,r=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=i,this.far=r,this.focus=10,this.aspect=n,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,n){return super.copy(e,n),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){let n=.5*this.getFilmHeight()/e;this.fov=As*2*Math.atan(n),this.updateProjectionMatrix()}getFocalLength(){let e=Math.tan(Ro*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return As*2*Math.atan(Math.tan(Ro*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,n,i){nr.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(nr.x,nr.y).multiplyScalar(-e/nr.z),nr.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),i.set(nr.x,nr.y).multiplyScalar(-e/nr.z)}getViewSize(e,n){return this.getViewBounds(e,hm,um),n.subVectors(um,hm)}setViewOffset(e,n,i,r,s,o){this.aspect=e/n,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=n,this.view.offsetX=i,this.view.offsetY=r,this.view.width=s,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=this.near,n=e*Math.tan(Ro*.5*this.fov)/this.zoom,i=2*n,r=this.aspect*i,s=-.5*r,o=this.view;if(this.view!==null&&this.view.enabled){let c=o.fullWidth,l=o.fullHeight;s+=o.offsetX*r/c,n-=o.offsetY*i/l,r*=o.width/c,i*=o.height/l}let a=this.filmOffset;a!==0&&(s+=e*a/this.getFilmWidth()),this.projectionMatrix.makePerspective(s,s+r,n,n-i,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let n=super.toJSON(e);return n.object.fov=this.fov,n.object.zoom=this.zoom,n.object.near=this.near,n.object.far=this.far,n.object.focus=this.focus,n.object.aspect=this.aspect,this.view!==null&&(n.object.view=Object.assign({},this.view)),n.object.filmGauge=this.filmGauge,n.object.filmOffset=this.filmOffset,n}},vs=-90,ys=1,Dc=class extends Xt{constructor(e,n,i){super(),this.type="CubeCamera",this.renderTarget=i,this.coordinateSystem=null,this.activeMipmapLevel=0;let r=new Zt(vs,ys,e,n);r.layers=this.layers,this.add(r);let s=new Zt(vs,ys,e,n);s.layers=this.layers,this.add(s);let o=new Zt(vs,ys,e,n);o.layers=this.layers,this.add(o);let a=new Zt(vs,ys,e,n);a.layers=this.layers,this.add(a);let c=new Zt(vs,ys,e,n);c.layers=this.layers,this.add(c);let l=new Zt(vs,ys,e,n);l.layers=this.layers,this.add(l)}updateCoordinateSystem(){let e=this.coordinateSystem,n=this.children.concat(),[i,r,s,o,a,c]=n;for(let l of n)this.remove(l);if(e===ni)i.up.set(0,1,0),i.lookAt(1,0,0),r.up.set(0,1,0),r.lookAt(-1,0,0),s.up.set(0,0,-1),s.lookAt(0,1,0),o.up.set(0,0,1),o.lookAt(0,-1,0),a.up.set(0,1,0),a.lookAt(0,0,1),c.up.set(0,1,0),c.lookAt(0,0,-1);else if(e===No)i.up.set(0,-1,0),i.lookAt(-1,0,0),r.up.set(0,-1,0),r.lookAt(1,0,0),s.up.set(0,0,1),s.lookAt(0,1,0),o.up.set(0,0,-1),o.lookAt(0,-1,0),a.up.set(0,-1,0),a.lookAt(0,0,1),c.up.set(0,-1,0),c.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(let l of n)this.add(l),l.updateMatrixWorld()}update(e,n){this.parent===null&&this.updateMatrixWorld();let{renderTarget:i,activeMipmapLevel:r}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());let[s,o,a,c,l,u]=this.children,h=e.getRenderTarget(),f=e.getActiveCubeFace(),d=e.getActiveMipmapLevel(),m=e.xr.enabled;e.xr.enabled=!1;let _=i.texture.generateMipmaps;i.texture.generateMipmaps=!1,e.setRenderTarget(i,0,r),e.render(n,s),e.setRenderTarget(i,1,r),e.render(n,o),e.setRenderTarget(i,2,r),e.render(n,a),e.setRenderTarget(i,3,r),e.render(n,c),e.setRenderTarget(i,4,r),e.render(n,l),i.texture.generateMipmaps=_,e.setRenderTarget(i,5,r),e.render(n,u),e.setRenderTarget(h,f,d),e.xr.enabled=m,i.texture.needsPMREMUpdate=!0}},Bo=class extends hn{constructor(e=[],n=kr,i,r,s,o,a,c,l,u){super(e,n,i,r,s,o,a,c,l,u),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}},Lc=class extends rn{constructor(e=1,n={}){super(e,e,n),this.isWebGLCubeRenderTarget=!0;let i={width:e,height:e,depth:1},r=[i,i,i,i,i,i];this.texture=new Bo(r),this._setTextureOptions(n),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,n){this.texture.type=n.type,this.texture.colorSpace=n.colorSpace,this.texture.generateMipmaps=n.generateMipmaps,this.texture.minFilter=n.minFilter,this.texture.magFilter=n.magFilter;let i={uniforms:{tEquirect:{value:null}},vertexShader:`

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
			`},r=new Ds(5,5,5),s=new Bt({name:"CubemapFromEquirect",uniforms:Vr(i.uniforms),vertexShader:i.vertexShader,fragmentShader:i.fragmentShader,side:Kt,blending:si});s.uniforms.tEquirect.value=n;let o=new Ct(r,s),a=n.minFilter;return n.minFilter===cr&&(n.minFilter=ii),new Dc(1,10,this).update(e,o),n.minFilter=a,o.geometry.dispose(),o.material.dispose(),this}clear(e,n=!0,i=!0,r=!0){let s=e.getRenderTarget();for(let o=0;o<6;o++)e.setRenderTarget(this,o),e.clear(n,i,r);e.setRenderTarget(s)}},tn=class extends Xt{constructor(){super(),this.isGroup=!0,this.type="Group"}},Db={type:"move"},Ls=class{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new tn,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new tn,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new R,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new R),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new tn,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new R,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new R),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){let n=this._hand;if(n)for(let i of e.hand.values())this._getHandJoint(n,i)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,n,i){let r=null,s=null,o=null,a=this._targetRay,c=this._grip,l=this._hand;if(e&&n.session.visibilityState!=="visible-blurred"){if(l&&e.hand){o=!0;for(let _ of e.hand.values()){let g=n.getJointPose(_,i),p=this._getHandJoint(l,_);g!==null&&(p.matrix.fromArray(g.transform.matrix),p.matrix.decompose(p.position,p.rotation,p.scale),p.matrixWorldNeedsUpdate=!0,p.jointRadius=g.radius),p.visible=g!==null}let u=l.joints["index-finger-tip"],h=l.joints["thumb-tip"],f=u.position.distanceTo(h.position),d=.02,m=.005;l.inputState.pinching&&f>d+m?(l.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!l.inputState.pinching&&f<=d-m&&(l.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else c!==null&&e.gripSpace&&(s=n.getPose(e.gripSpace,i),s!==null&&(c.matrix.fromArray(s.transform.matrix),c.matrix.decompose(c.position,c.rotation,c.scale),c.matrixWorldNeedsUpdate=!0,s.linearVelocity?(c.hasLinearVelocity=!0,c.linearVelocity.copy(s.linearVelocity)):c.hasLinearVelocity=!1,s.angularVelocity?(c.hasAngularVelocity=!0,c.angularVelocity.copy(s.angularVelocity)):c.hasAngularVelocity=!1));a!==null&&(r=n.getPose(e.targetRaySpace,i),r===null&&s!==null&&(r=s),r!==null&&(a.matrix.fromArray(r.transform.matrix),a.matrix.decompose(a.position,a.rotation,a.scale),a.matrixWorldNeedsUpdate=!0,r.linearVelocity?(a.hasLinearVelocity=!0,a.linearVelocity.copy(r.linearVelocity)):a.hasLinearVelocity=!1,r.angularVelocity?(a.hasAngularVelocity=!0,a.angularVelocity.copy(r.angularVelocity)):a.hasAngularVelocity=!1,this.dispatchEvent(Db)))}return a!==null&&(a.visible=r!==null),c!==null&&(c.visible=s!==null),l!==null&&(l.visible=o!==null),this}_getHandJoint(e,n){if(e.joints[n.jointName]===void 0){let i=new tn;i.matrixAutoUpdate=!1,i.visible=!1,e.joints[n.jointName]=i,e.add(i)}return e.joints[n.jointName]}},Vo=class t{constructor(e,n=25e-5){this.isFogExp2=!0,this.name="",this.color=new Fe(e),this.density=n}clone(){return new t(this.color,this.density)}toJSON(){return{type:"FogExp2",name:this.name,color:this.color.getHex(),density:this.density}}};var Ho=class extends Xt{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new Hn,this.environmentIntensity=1,this.environmentRotation=new Hn,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__!="undefined"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,n){return super.copy(e,n),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){let n=super.toJSON(e);return this.fog!==null&&(n.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(n.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(n.object.backgroundIntensity=this.backgroundIntensity),n.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(n.object.environmentIntensity=this.environmentIntensity),n.object.environmentRotation=this.environmentRotation.toArray(),n}},Oc=class{constructor(e,n){this.isInterleavedBuffer=!0,this.array=e,this.stride=n,this.count=e!==void 0?e.length/n:0,this.usage=Cc,this.updateRanges=[],this.version=0,this.uuid=Ni()}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,n){this.updateRanges.push({start:e,count:n})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.array=new e.array.constructor(e.array),this.count=e.count,this.stride=e.stride,this.usage=e.usage,this}copyAt(e,n,i){e*=this.stride,i*=n.stride;for(let r=0,s=this.stride;r<s;r++)this.array[e+r]=n.array[i+r];return this}set(e,n=0){return this.array.set(e,n),this}clone(e){e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=Ni()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=this.array.slice(0).buffer);let n=new this.array.constructor(e.arrayBuffers[this.array.buffer._uuid]),i=new this.constructor(n,this.stride);return i.setUsage(this.usage),i}onUpload(e){return this.onUploadCallback=e,this}toJSON(e){return e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=Ni()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=Array.from(new Uint32Array(this.array.buffer))),{uuid:this.uuid,buffer:this.array.buffer._uuid,type:this.array.constructor.name,stride:this.stride}}},ln=new R,Go=class t{constructor(e,n,i,r=!1){this.isInterleavedBufferAttribute=!0,this.name="",this.data=e,this.itemSize=n,this.offset=i,this.normalized=r}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(e){this.data.needsUpdate=e}applyMatrix4(e){for(let n=0,i=this.data.count;n<i;n++)ln.fromBufferAttribute(this,n),ln.applyMatrix4(e),this.setXYZ(n,ln.x,ln.y,ln.z);return this}applyNormalMatrix(e){for(let n=0,i=this.count;n<i;n++)ln.fromBufferAttribute(this,n),ln.applyNormalMatrix(e),this.setXYZ(n,ln.x,ln.y,ln.z);return this}transformDirection(e){for(let n=0,i=this.count;n<i;n++)ln.fromBufferAttribute(this,n),ln.transformDirection(e),this.setXYZ(n,ln.x,ln.y,ln.z);return this}getComponent(e,n){let i=this.array[e*this.data.stride+this.offset+n];return this.normalized&&(i=ti(i,this.array)),i}setComponent(e,n,i){return this.normalized&&(i=pt(i,this.array)),this.data.array[e*this.data.stride+this.offset+n]=i,this}setX(e,n){return this.normalized&&(n=pt(n,this.array)),this.data.array[e*this.data.stride+this.offset]=n,this}setY(e,n){return this.normalized&&(n=pt(n,this.array)),this.data.array[e*this.data.stride+this.offset+1]=n,this}setZ(e,n){return this.normalized&&(n=pt(n,this.array)),this.data.array[e*this.data.stride+this.offset+2]=n,this}setW(e,n){return this.normalized&&(n=pt(n,this.array)),this.data.array[e*this.data.stride+this.offset+3]=n,this}getX(e){let n=this.data.array[e*this.data.stride+this.offset];return this.normalized&&(n=ti(n,this.array)),n}getY(e){let n=this.data.array[e*this.data.stride+this.offset+1];return this.normalized&&(n=ti(n,this.array)),n}getZ(e){let n=this.data.array[e*this.data.stride+this.offset+2];return this.normalized&&(n=ti(n,this.array)),n}getW(e){let n=this.data.array[e*this.data.stride+this.offset+3];return this.normalized&&(n=ti(n,this.array)),n}setXY(e,n,i){return e=e*this.data.stride+this.offset,this.normalized&&(n=pt(n,this.array),i=pt(i,this.array)),this.data.array[e+0]=n,this.data.array[e+1]=i,this}setXYZ(e,n,i,r){return e=e*this.data.stride+this.offset,this.normalized&&(n=pt(n,this.array),i=pt(i,this.array),r=pt(r,this.array)),this.data.array[e+0]=n,this.data.array[e+1]=i,this.data.array[e+2]=r,this}setXYZW(e,n,i,r,s){return e=e*this.data.stride+this.offset,this.normalized&&(n=pt(n,this.array),i=pt(i,this.array),r=pt(r,this.array),s=pt(s,this.array)),this.data.array[e+0]=n,this.data.array[e+1]=i,this.data.array[e+2]=r,this.data.array[e+3]=s,this}clone(e){if(e===void 0){console.log("THREE.InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.");let n=[];for(let i=0;i<this.count;i++){let r=i*this.data.stride+this.offset;for(let s=0;s<this.itemSize;s++)n.push(this.data.array[r+s])}return new nn(new this.array.constructor(n),this.itemSize,this.normalized)}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.clone(e)),new t(e.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}toJSON(e){if(e===void 0){console.log("THREE.InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.");let n=[];for(let i=0;i<this.count;i++){let r=i*this.data.stride+this.offset;for(let s=0;s<this.itemSize;s++)n.push(this.data.array[r+s])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:n,normalized:this.normalized}}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.toJSON(e)),{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}},mi=class extends Gn{constructor(e){super(),this.isSpriteMaterial=!0,this.type="SpriteMaterial",this.color=new Fe(16777215),this.map=null,this.alphaMap=null,this.rotation=0,this.sizeAttenuation=!0,this.transparent=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.rotation=e.rotation,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}},xs,wo=new R,bs=new R,Ms=new R,Ss=new ie,Eo=new ie,lg=new qe,uc=new R,To=new R,fc=new R,fm=new ie,ju=new ie,dm=new ie,gi=class extends Xt{constructor(e=new mi){if(super(),this.isSprite=!0,this.type="Sprite",xs===void 0){xs=new Mt;let n=new Float32Array([-.5,-.5,0,0,0,.5,-.5,0,1,0,.5,.5,0,1,1,-.5,.5,0,0,1]),i=new Oc(n,5);xs.setIndex([0,1,2,0,2,3]),xs.setAttribute("position",new Go(i,3,0,!1)),xs.setAttribute("uv",new Go(i,2,3,!1))}this.geometry=xs,this.material=e,this.center=new ie(.5,.5),this.count=1}raycast(e,n){e.camera===null&&console.error('THREE.Sprite: "Raycaster.camera" needs to be set in order to raycast against sprites.'),bs.setFromMatrixScale(this.matrixWorld),lg.copy(e.camera.matrixWorld),this.modelViewMatrix.multiplyMatrices(e.camera.matrixWorldInverse,this.matrixWorld),Ms.setFromMatrixPosition(this.modelViewMatrix),e.camera.isPerspectiveCamera&&this.material.sizeAttenuation===!1&&bs.multiplyScalar(-Ms.z);let i=this.material.rotation,r,s;i!==0&&(s=Math.cos(i),r=Math.sin(i));let o=this.center;dc(uc.set(-.5,-.5,0),Ms,o,bs,r,s),dc(To.set(.5,-.5,0),Ms,o,bs,r,s),dc(fc.set(.5,.5,0),Ms,o,bs,r,s),fm.set(0,0),ju.set(1,0),dm.set(1,1);let a=e.ray.intersectTriangle(uc,To,fc,!1,wo);if(a===null&&(dc(To.set(-.5,.5,0),Ms,o,bs,r,s),ju.set(0,1),a=e.ray.intersectTriangle(uc,fc,To,!1,wo),a===null))return;let c=e.ray.origin.distanceTo(wo);c<e.near||c>e.far||n.push({distance:c,point:wo.clone(),uv:Oi.getInterpolation(wo,uc,To,fc,fm,ju,dm,new ie),face:null,object:this})}copy(e,n){return super.copy(e,n),e.center!==void 0&&this.center.copy(e.center),this.material=e.material,this}};function dc(t,e,n,i,r,s){Ss.subVectors(t,n).addScalar(.5).multiply(i),r!==void 0?(Eo.x=s*Ss.x-r*Ss.y,Eo.y=r*Ss.x+s*Ss.y):Eo.copy(Ss),t.copy(e),t.x+=Eo.x,t.y+=Eo.y,t.applyMatrix4(lg)}var qu=new R,Lb=new R,Ob=new Ke,_n=class{constructor(e=new R(1,0,0),n=0){this.isPlane=!0,this.normal=e,this.constant=n}set(e,n){return this.normal.copy(e),this.constant=n,this}setComponents(e,n,i,r){return this.normal.set(e,n,i),this.constant=r,this}setFromNormalAndCoplanarPoint(e,n){return this.normal.copy(e),this.constant=-n.dot(this.normal),this}setFromCoplanarPoints(e,n,i){let r=qu.subVectors(i,n).cross(Lb.subVectors(e,n)).normalize();return this.setFromNormalAndCoplanarPoint(r,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){let e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,n){return n.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,n){let i=e.delta(qu),r=this.normal.dot(i);if(r===0)return this.distanceToPoint(e.start)===0?n.copy(e.start):null;let s=-(e.start.dot(this.normal)+this.constant)/r;return s<0||s>1?null:n.copy(e.start).addScaledVector(i,s)}intersectsLine(e){let n=this.distanceToPoint(e.start),i=this.distanceToPoint(e.end);return n<0&&i>0||i<0&&n>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,n){let i=n||Ob.getNormalMatrix(e),r=this.coplanarPoint(qu).applyMatrix4(e),s=this.normal.applyMatrix3(i).normalize();return this.constant=-r.dot(s),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}},Pr=new pi,Nb=new ie(.5,.5),pc=new R,Os=class{constructor(e=new _n,n=new _n,i=new _n,r=new _n,s=new _n,o=new _n){this.planes=[e,n,i,r,s,o]}set(e,n,i,r,s,o){let a=this.planes;return a[0].copy(e),a[1].copy(n),a[2].copy(i),a[3].copy(r),a[4].copy(s),a[5].copy(o),this}copy(e){let n=this.planes;for(let i=0;i<6;i++)n[i].copy(e.planes[i]);return this}setFromProjectionMatrix(e,n=ni,i=!1){let r=this.planes,s=e.elements,o=s[0],a=s[1],c=s[2],l=s[3],u=s[4],h=s[5],f=s[6],d=s[7],m=s[8],_=s[9],g=s[10],p=s[11],x=s[12],y=s[13],v=s[14],b=s[15];if(r[0].setComponents(l-o,d-u,p-m,b-x).normalize(),r[1].setComponents(l+o,d+u,p+m,b+x).normalize(),r[2].setComponents(l+a,d+h,p+_,b+y).normalize(),r[3].setComponents(l-a,d-h,p-_,b-y).normalize(),i)r[4].setComponents(c,f,g,v).normalize(),r[5].setComponents(l-c,d-f,p-g,b-v).normalize();else if(r[4].setComponents(l-c,d-f,p-g,b-v).normalize(),n===ni)r[5].setComponents(l+c,d+f,p+g,b+v).normalize();else if(n===No)r[5].setComponents(c,f,g,v).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+n);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),Pr.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{let n=e.geometry;n.boundingSphere===null&&n.computeBoundingSphere(),Pr.copy(n.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(Pr)}intersectsSprite(e){Pr.center.set(0,0,0);let n=Nb.distanceTo(e.center);return Pr.radius=.7071067811865476+n,Pr.applyMatrix4(e.matrixWorld),this.intersectsSphere(Pr)}intersectsSphere(e){let n=this.planes,i=e.center,r=-e.radius;for(let s=0;s<6;s++)if(n[s].distanceToPoint(i)<r)return!1;return!0}intersectsBox(e){let n=this.planes;for(let i=0;i<6;i++){let r=n[i];if(pc.x=r.normal.x>0?e.max.x:e.min.x,pc.y=r.normal.y>0?e.max.y:e.min.y,pc.z=r.normal.z>0?e.max.z:e.min.z,r.distanceToPoint(pc)<0)return!1}return!0}containsPoint(e){let n=this.planes;for(let i=0;i<6;i++)if(n[i].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}};var ri=class extends Gn{constructor(e){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new Fe(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.linewidth=e.linewidth,this.linecap=e.linecap,this.linejoin=e.linejoin,this.fog=e.fog,this}},Nc=new R,Fc=new R,pm=new qe,Ao=new zi,mc=new pi,Xu=new R,mm=new R,_i=class extends Xt{constructor(e=new Mt,n=new ri){super(),this.isLine=!0,this.type="Line",this.geometry=e,this.material=n,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,n){return super.copy(e,n),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}computeLineDistances(){let e=this.geometry;if(e.index===null){let n=e.attributes.position,i=[0];for(let r=1,s=n.count;r<s;r++)Nc.fromBufferAttribute(n,r-1),Fc.fromBufferAttribute(n,r),i[r]=i[r-1],i[r]+=Nc.distanceTo(Fc);e.setAttribute("lineDistance",new ht(i,1))}else console.warn("THREE.Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}raycast(e,n){let i=this.geometry,r=this.matrixWorld,s=e.params.Line.threshold,o=i.drawRange;if(i.boundingSphere===null&&i.computeBoundingSphere(),mc.copy(i.boundingSphere),mc.applyMatrix4(r),mc.radius+=s,e.ray.intersectsSphere(mc)===!1)return;pm.copy(r).invert(),Ao.copy(e.ray).applyMatrix4(pm);let a=s/((this.scale.x+this.scale.y+this.scale.z)/3),c=a*a,l=this.isLineSegments?2:1,u=i.index,f=i.attributes.position;if(u!==null){let d=Math.max(0,o.start),m=Math.min(u.count,o.start+o.count);for(let _=d,g=m-1;_<g;_+=l){let p=u.getX(_),x=u.getX(_+1),y=gc(this,e,Ao,c,p,x,_);y&&n.push(y)}if(this.isLineLoop){let _=u.getX(m-1),g=u.getX(d),p=gc(this,e,Ao,c,_,g,m-1);p&&n.push(p)}}else{let d=Math.max(0,o.start),m=Math.min(f.count,o.start+o.count);for(let _=d,g=m-1;_<g;_+=l){let p=gc(this,e,Ao,c,_,_+1,_);p&&n.push(p)}if(this.isLineLoop){let _=gc(this,e,Ao,c,m-1,d,m-1);_&&n.push(_)}}}updateMorphTargets(){let n=this.geometry.morphAttributes,i=Object.keys(n);if(i.length>0){let r=n[i[0]];if(r!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,o=r.length;s<o;s++){let a=r[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=s}}}}};function gc(t,e,n,i,r,s,o){let a=t.geometry.attributes.position;if(Nc.fromBufferAttribute(a,r),Fc.fromBufferAttribute(a,s),n.distanceSqToSegment(Nc,Fc,Xu,mm)>i)return;Xu.applyMatrix4(t.matrixWorld);let l=e.ray.origin.distanceTo(Xu);if(!(l<e.near||l>e.far))return{distance:l,point:mm.clone().applyMatrix4(t.matrixWorld),index:o,face:null,faceIndex:null,barycoord:null,object:t}}var gm=new R,_m=new R,Uc=class extends _i{constructor(e,n){super(e,n),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){let e=this.geometry;if(e.index===null){let n=e.attributes.position,i=[];for(let r=0,s=n.count;r<s;r+=2)gm.fromBufferAttribute(n,r),_m.fromBufferAttribute(n,r+1),i[r]=r===0?0:i[r-1],i[r+1]=i[r]+gm.distanceTo(_m);e.setAttribute("lineDistance",new ht(i,1))}else console.warn("THREE.LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}};var Ns=class extends Gn{constructor(e){super(),this.isPointsMaterial=!0,this.type="PointsMaterial",this.color=new Fe(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.size=e.size,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}},vm=new qe,rf=new zi,_c=new pi,vc=new R,Wo=class extends Xt{constructor(e=new Mt,n=new Ns){super(),this.isPoints=!0,this.type="Points",this.geometry=e,this.material=n,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,n){return super.copy(e,n),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}raycast(e,n){let i=this.geometry,r=this.matrixWorld,s=e.params.Points.threshold,o=i.drawRange;if(i.boundingSphere===null&&i.computeBoundingSphere(),_c.copy(i.boundingSphere),_c.applyMatrix4(r),_c.radius+=s,e.ray.intersectsSphere(_c)===!1)return;vm.copy(r).invert(),rf.copy(e.ray).applyMatrix4(vm);let a=s/((this.scale.x+this.scale.y+this.scale.z)/3),c=a*a,l=i.index,h=i.attributes.position;if(l!==null){let f=Math.max(0,o.start),d=Math.min(l.count,o.start+o.count);for(let m=f,_=d;m<_;m++){let g=l.getX(m);vc.fromBufferAttribute(h,g),ym(vc,g,c,r,e,n,this)}}else{let f=Math.max(0,o.start),d=Math.min(h.count,o.start+o.count);for(let m=f,_=d;m<_;m++)vc.fromBufferAttribute(h,m),ym(vc,m,c,r,e,n,this)}}updateMorphTargets(){let n=this.geometry.morphAttributes,i=Object.keys(n);if(i.length>0){let r=n[i[0]];if(r!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,o=r.length;s<o;s++){let a=r[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=s}}}}};function ym(t,e,n,i,r,s,o){let a=rf.distanceSqToPoint(t);if(a<n){let c=new R;rf.closestPointToPoint(t,c),c.applyMatrix4(i);let l=r.ray.origin.distanceTo(c);if(l<r.near||l>r.far)return;s.push({distance:l,distanceToRay:Math.sqrt(a),point:c,index:e,face:null,faceIndex:null,barycoord:null,object:o})}}var jo=class extends hn{constructor(e,n,i,r,s,o,a,c,l){super(e,n,i,r,s,o,a,c,l),this.isCanvasTexture=!0,this.needsUpdate=!0}},qo=class extends hn{constructor(e,n,i=lr,r,s,o,a=Vn,c=Vn,l,u=Ts,h=1){if(u!==Ts&&u!==Gs)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");let f={width:e,height:n,depth:h};super(f,r,s,o,a,c,u,i,l),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new Ps(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){let n=super.toJSON(e);return this.compareFunction!==null&&(n.compareFunction=this.compareFunction),n}},Xo=class extends hn{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}};var Fs=class t extends Mt{constructor(e=1,n=1,i=1,r=32,s=1,o=!1,a=0,c=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:e,radiusBottom:n,height:i,radialSegments:r,heightSegments:s,openEnded:o,thetaStart:a,thetaLength:c};let l=this;r=Math.floor(r),s=Math.floor(s);let u=[],h=[],f=[],d=[],m=0,_=[],g=i/2,p=0;x(),o===!1&&(e>0&&y(!0),n>0&&y(!1)),this.setIndex(u),this.setAttribute("position",new ht(h,3)),this.setAttribute("normal",new ht(f,3)),this.setAttribute("uv",new ht(d,2));function x(){let v=new R,b=new R,M=0,A=(n-e)/i;for(let C=0;C<=s;C++){let T=[],w=C/s,P=w*(n-e)+e;for(let z=0;z<=r;z++){let U=z/r,O=U*c+a,D=Math.sin(O),V=Math.cos(O);b.x=P*D,b.y=-w*i+g,b.z=P*V,h.push(b.x,b.y,b.z),v.set(D,A,V).normalize(),f.push(v.x,v.y,v.z),d.push(U,1-w),T.push(m++)}_.push(T)}for(let C=0;C<r;C++)for(let T=0;T<s;T++){let w=_[T][C],P=_[T+1][C],z=_[T+1][C+1],U=_[T][C+1];(e>0||T!==0)&&(u.push(w,P,U),M+=3),(n>0||T!==s-1)&&(u.push(P,z,U),M+=3)}l.addGroup(p,M,0),p+=M}function y(v){let b=m,M=new ie,A=new R,C=0,T=v===!0?e:n,w=v===!0?1:-1;for(let z=1;z<=r;z++)h.push(0,g*w,0),f.push(0,w,0),d.push(.5,.5),m++;let P=m;for(let z=0;z<=r;z++){let O=z/r*c+a,D=Math.cos(O),V=Math.sin(O);A.x=T*V,A.y=g*w,A.z=T*D,h.push(A.x,A.y,A.z),f.push(0,w,0),M.x=D*.5+.5,M.y=V*.5*w+.5,d.push(M.x,M.y),m++}for(let z=0;z<r;z++){let U=b+z,O=P+z;v===!0?u.push(O,O+1,U):u.push(O+1,O,U),C+=3}l.addGroup(p,C,v===!0?1:2),p+=C}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new t(e.radiusTop,e.radiusBottom,e.height,e.radialSegments,e.heightSegments,e.openEnded,e.thetaStart,e.thetaLength)}},$o=class t extends Fs{constructor(e=1,n=1,i=32,r=1,s=!1,o=0,a=Math.PI*2){super(0,e,n,i,r,s,o,a),this.type="ConeGeometry",this.parameters={radius:e,height:n,radialSegments:i,heightSegments:r,openEnded:s,thetaStart:o,thetaLength:a}}static fromJSON(e){return new t(e.radius,e.height,e.radialSegments,e.heightSegments,e.openEnded,e.thetaStart,e.thetaLength)}};var Wn=class{constructor(){this.type="Curve",this.arcLengthDivisions=200,this.needsUpdate=!1,this.cacheArcLengths=null}getPoint(){console.warn("THREE.Curve: .getPoint() not implemented.")}getPointAt(e,n){let i=this.getUtoTmapping(e);return this.getPoint(i,n)}getPoints(e=5){let n=[];for(let i=0;i<=e;i++)n.push(this.getPoint(i/e));return n}getSpacedPoints(e=5){let n=[];for(let i=0;i<=e;i++)n.push(this.getPointAt(i/e));return n}getLength(){let e=this.getLengths();return e[e.length-1]}getLengths(e=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===e+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;let n=[],i,r=this.getPoint(0),s=0;n.push(0);for(let o=1;o<=e;o++)i=this.getPoint(o/e),s+=i.distanceTo(r),n.push(s),r=i;return this.cacheArcLengths=n,n}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(e,n=null){let i=this.getLengths(),r=0,s=i.length,o;n?o=n:o=e*i[s-1];let a=0,c=s-1,l;for(;a<=c;)if(r=Math.floor(a+(c-a)/2),l=i[r]-o,l<0)a=r+1;else if(l>0)c=r-1;else{c=r;break}if(r=c,i[r]===o)return r/(s-1);let u=i[r],f=i[r+1]-u,d=(o-u)/f;return(r+d)/(s-1)}getTangent(e,n){let r=e-1e-4,s=e+1e-4;r<0&&(r=0),s>1&&(s=1);let o=this.getPoint(r),a=this.getPoint(s),c=n||(o.isVector2?new ie:new R);return c.copy(a).sub(o).normalize(),c}getTangentAt(e,n){let i=this.getUtoTmapping(e);return this.getTangent(i,n)}computeFrenetFrames(e,n=!1){let i=new R,r=[],s=[],o=[],a=new R,c=new qe;for(let d=0;d<=e;d++){let m=d/e;r[d]=this.getTangentAt(m,new R)}s[0]=new R,o[0]=new R;let l=Number.MAX_VALUE,u=Math.abs(r[0].x),h=Math.abs(r[0].y),f=Math.abs(r[0].z);u<=l&&(l=u,i.set(1,0,0)),h<=l&&(l=h,i.set(0,1,0)),f<=l&&i.set(0,0,1),a.crossVectors(r[0],i).normalize(),s[0].crossVectors(r[0],a),o[0].crossVectors(r[0],s[0]);for(let d=1;d<=e;d++){if(s[d]=s[d-1].clone(),o[d]=o[d-1].clone(),a.crossVectors(r[d-1],r[d]),a.length()>Number.EPSILON){a.normalize();let m=Math.acos(tt(r[d-1].dot(r[d]),-1,1));s[d].applyMatrix4(c.makeRotationAxis(a,m))}o[d].crossVectors(r[d],s[d])}if(n===!0){let d=Math.acos(tt(s[0].dot(s[e]),-1,1));d/=e,r[0].dot(a.crossVectors(s[0],s[e]))>0&&(d=-d);for(let m=1;m<=e;m++)s[m].applyMatrix4(c.makeRotationAxis(r[m],d*m)),o[m].crossVectors(r[m],s[m])}return{tangents:r,normals:s,binormals:o}}clone(){return new this.constructor().copy(this)}copy(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}toJSON(){let e={metadata:{version:4.7,type:"Curve",generator:"Curve.toJSON"}};return e.arcLengthDivisions=this.arcLengthDivisions,e.type=this.type,e}fromJSON(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}},vi=class extends Wn{constructor(e=0,n=0,i=1,r=1,s=0,o=Math.PI*2,a=!1,c=0){super(),this.isEllipseCurve=!0,this.type="EllipseCurve",this.aX=e,this.aY=n,this.xRadius=i,this.yRadius=r,this.aStartAngle=s,this.aEndAngle=o,this.aClockwise=a,this.aRotation=c}getPoint(e,n=new ie){let i=n,r=Math.PI*2,s=this.aEndAngle-this.aStartAngle,o=Math.abs(s)<Number.EPSILON;for(;s<0;)s+=r;for(;s>r;)s-=r;s<Number.EPSILON&&(o?s=0:s=r),this.aClockwise===!0&&!o&&(s===r?s=-r:s=s-r);let a=this.aStartAngle+e*s,c=this.aX+this.xRadius*Math.cos(a),l=this.aY+this.yRadius*Math.sin(a);if(this.aRotation!==0){let u=Math.cos(this.aRotation),h=Math.sin(this.aRotation),f=c-this.aX,d=l-this.aY;c=f*u-d*h+this.aX,l=f*h+d*u+this.aY}return i.set(c,l)}copy(e){return super.copy(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}toJSON(){let e=super.toJSON();return e.aX=this.aX,e.aY=this.aY,e.xRadius=this.xRadius,e.yRadius=this.yRadius,e.aStartAngle=this.aStartAngle,e.aEndAngle=this.aEndAngle,e.aClockwise=this.aClockwise,e.aRotation=this.aRotation,e}fromJSON(e){return super.fromJSON(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}},zc=class extends vi{constructor(e,n,i,r,s,o){super(e,n,i,i,r,s,o),this.isArcCurve=!0,this.type="ArcCurve"}};function Af(){let t=0,e=0,n=0,i=0;function r(s,o,a,c){t=s,e=a,n=-3*s+3*o-2*a-c,i=2*s-2*o+a+c}return{initCatmullRom:function(s,o,a,c,l){r(o,a,l*(a-s),l*(c-o))},initNonuniformCatmullRom:function(s,o,a,c,l,u,h){let f=(o-s)/l-(a-s)/(l+u)+(a-o)/u,d=(a-o)/u-(c-o)/(u+h)+(c-a)/h;f*=u,d*=u,r(o,a,f,d)},calc:function(s){let o=s*s,a=o*s;return t+e*s+n*o+i*a}}}var yc=new R,$u=new Af,Yu=new Af,Zu=new Af,kc=class extends Wn{constructor(e=[],n=!1,i="centripetal",r=.5){super(),this.isCatmullRomCurve3=!0,this.type="CatmullRomCurve3",this.points=e,this.closed=n,this.curveType=i,this.tension=r}getPoint(e,n=new R){let i=n,r=this.points,s=r.length,o=(s-(this.closed?0:1))*e,a=Math.floor(o),c=o-a;this.closed?a+=a>0?0:(Math.floor(Math.abs(a)/s)+1)*s:c===0&&a===s-1&&(a=s-2,c=1);let l,u;this.closed||a>0?l=r[(a-1)%s]:(yc.subVectors(r[0],r[1]).add(r[0]),l=yc);let h=r[a%s],f=r[(a+1)%s];if(this.closed||a+2<s?u=r[(a+2)%s]:(yc.subVectors(r[s-1],r[s-2]).add(r[s-1]),u=yc),this.curveType==="centripetal"||this.curveType==="chordal"){let d=this.curveType==="chordal"?.5:.25,m=Math.pow(l.distanceToSquared(h),d),_=Math.pow(h.distanceToSquared(f),d),g=Math.pow(f.distanceToSquared(u),d);_<1e-4&&(_=1),m<1e-4&&(m=_),g<1e-4&&(g=_),$u.initNonuniformCatmullRom(l.x,h.x,f.x,u.x,m,_,g),Yu.initNonuniformCatmullRom(l.y,h.y,f.y,u.y,m,_,g),Zu.initNonuniformCatmullRom(l.z,h.z,f.z,u.z,m,_,g)}else this.curveType==="catmullrom"&&($u.initCatmullRom(l.x,h.x,f.x,u.x,this.tension),Yu.initCatmullRom(l.y,h.y,f.y,u.y,this.tension),Zu.initCatmullRom(l.z,h.z,f.z,u.z,this.tension));return i.set($u.calc(c),Yu.calc(c),Zu.calc(c)),i}copy(e){super.copy(e),this.points=[];for(let n=0,i=e.points.length;n<i;n++){let r=e.points[n];this.points.push(r.clone())}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}toJSON(){let e=super.toJSON();e.points=[];for(let n=0,i=this.points.length;n<i;n++){let r=this.points[n];e.points.push(r.toArray())}return e.closed=this.closed,e.curveType=this.curveType,e.tension=this.tension,e}fromJSON(e){super.fromJSON(e),this.points=[];for(let n=0,i=e.points.length;n<i;n++){let r=e.points[n];this.points.push(new R().fromArray(r))}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}};function xm(t,e,n,i,r){let s=(i-e)*.5,o=(r-n)*.5,a=t*t,c=t*a;return(2*n-2*i+s+o)*c+(-3*n+3*i-2*s-o)*a+s*t+n}function Fb(t,e){let n=1-t;return n*n*e}function Ub(t,e){return 2*(1-t)*t*e}function zb(t,e){return t*t*e}function Io(t,e,n,i){return Fb(t,e)+Ub(t,n)+zb(t,i)}function kb(t,e){let n=1-t;return n*n*n*e}function Bb(t,e){let n=1-t;return 3*n*n*t*e}function Vb(t,e){return 3*(1-t)*t*t*e}function Hb(t,e){return t*t*t*e}function Do(t,e,n,i,r){return kb(t,e)+Bb(t,n)+Vb(t,i)+Hb(t,r)}var Bc=class extends Wn{constructor(e=new ie,n=new ie,i=new ie,r=new ie){super(),this.isCubicBezierCurve=!0,this.type="CubicBezierCurve",this.v0=e,this.v1=n,this.v2=i,this.v3=r}getPoint(e,n=new ie){let i=n,r=this.v0,s=this.v1,o=this.v2,a=this.v3;return i.set(Do(e,r.x,s.x,o.x,a.x),Do(e,r.y,s.y,o.y,a.y)),i}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}},Us=class extends Wn{constructor(e=new R,n=new R,i=new R,r=new R){super(),this.isCubicBezierCurve3=!0,this.type="CubicBezierCurve3",this.v0=e,this.v1=n,this.v2=i,this.v3=r}getPoint(e,n=new R){let i=n,r=this.v0,s=this.v1,o=this.v2,a=this.v3;return i.set(Do(e,r.x,s.x,o.x,a.x),Do(e,r.y,s.y,o.y,a.y),Do(e,r.z,s.z,o.z,a.z)),i}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}},Vc=class extends Wn{constructor(e=new ie,n=new ie){super(),this.isLineCurve=!0,this.type="LineCurve",this.v1=e,this.v2=n}getPoint(e,n=new ie){let i=n;return e===1?i.copy(this.v2):(i.copy(this.v2).sub(this.v1),i.multiplyScalar(e).add(this.v1)),i}getPointAt(e,n){return this.getPoint(e,n)}getTangent(e,n=new ie){return n.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,n){return this.getTangent(e,n)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},Hc=class extends Wn{constructor(e=new R,n=new R){super(),this.isLineCurve3=!0,this.type="LineCurve3",this.v1=e,this.v2=n}getPoint(e,n=new R){let i=n;return e===1?i.copy(this.v2):(i.copy(this.v2).sub(this.v1),i.multiplyScalar(e).add(this.v1)),i}getPointAt(e,n){return this.getPoint(e,n)}getTangent(e,n=new R){return n.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,n){return this.getTangent(e,n)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},Gc=class extends Wn{constructor(e=new ie,n=new ie,i=new ie){super(),this.isQuadraticBezierCurve=!0,this.type="QuadraticBezierCurve",this.v0=e,this.v1=n,this.v2=i}getPoint(e,n=new ie){let i=n,r=this.v0,s=this.v1,o=this.v2;return i.set(Io(e,r.x,s.x,o.x),Io(e,r.y,s.y,o.y)),i}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},Nr=class extends Wn{constructor(e=new R,n=new R,i=new R){super(),this.isQuadraticBezierCurve3=!0,this.type="QuadraticBezierCurve3",this.v0=e,this.v1=n,this.v2=i}getPoint(e,n=new R){let i=n,r=this.v0,s=this.v1,o=this.v2;return i.set(Io(e,r.x,s.x,o.x),Io(e,r.y,s.y,o.y),Io(e,r.z,s.z,o.z)),i}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},Wc=class extends Wn{constructor(e=[]){super(),this.isSplineCurve=!0,this.type="SplineCurve",this.points=e}getPoint(e,n=new ie){let i=n,r=this.points,s=(r.length-1)*e,o=Math.floor(s),a=s-o,c=r[o===0?o:o-1],l=r[o],u=r[o>r.length-2?r.length-1:o+1],h=r[o>r.length-3?r.length-1:o+2];return i.set(xm(a,c.x,l.x,u.x,h.x),xm(a,c.y,l.y,u.y,h.y)),i}copy(e){super.copy(e),this.points=[];for(let n=0,i=e.points.length;n<i;n++){let r=e.points[n];this.points.push(r.clone())}return this}toJSON(){let e=super.toJSON();e.points=[];for(let n=0,i=this.points.length;n<i;n++){let r=this.points[n];e.points.push(r.toArray())}return e}fromJSON(e){super.fromJSON(e),this.points=[];for(let n=0,i=e.points.length;n<i;n++){let r=e.points[n];this.points.push(new ie().fromArray(r))}return this}},Gb=Object.freeze({__proto__:null,ArcCurve:zc,CatmullRomCurve3:kc,CubicBezierCurve:Bc,CubicBezierCurve3:Us,EllipseCurve:vi,LineCurve:Vc,LineCurve3:Hc,QuadraticBezierCurve:Gc,QuadraticBezierCurve3:Nr,SplineCurve:Wc});var Yo=class t extends Mt{constructor(e=1,n=1,i=1,r=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:n,widthSegments:i,heightSegments:r};let s=e/2,o=n/2,a=Math.floor(i),c=Math.floor(r),l=a+1,u=c+1,h=e/a,f=n/c,d=[],m=[],_=[],g=[];for(let p=0;p<u;p++){let x=p*f-o;for(let y=0;y<l;y++){let v=y*h-s;m.push(v,-x,0),_.push(0,0,1),g.push(y/a),g.push(1-p/c)}}for(let p=0;p<c;p++)for(let x=0;x<a;x++){let y=x+l*p,v=x+l*(p+1),b=x+1+l*(p+1),M=x+1+l*p;d.push(y,v,M),d.push(v,b,M)}this.setIndex(d),this.setAttribute("position",new ht(m,3)),this.setAttribute("normal",new ht(_,3)),this.setAttribute("uv",new ht(g,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new t(e.width,e.height,e.widthSegments,e.heightSegments)}};var ki=class t extends Mt{constructor(e=1,n=32,i=16,r=0,s=Math.PI*2,o=0,a=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:e,widthSegments:n,heightSegments:i,phiStart:r,phiLength:s,thetaStart:o,thetaLength:a},n=Math.max(3,Math.floor(n)),i=Math.max(2,Math.floor(i));let c=Math.min(o+a,Math.PI),l=0,u=[],h=new R,f=new R,d=[],m=[],_=[],g=[];for(let p=0;p<=i;p++){let x=[],y=p/i,v=0;p===0&&o===0?v=.5/n:p===i&&c===Math.PI&&(v=-.5/n);for(let b=0;b<=n;b++){let M=b/n;h.x=-e*Math.cos(r+M*s)*Math.sin(o+y*a),h.y=e*Math.cos(o+y*a),h.z=e*Math.sin(r+M*s)*Math.sin(o+y*a),m.push(h.x,h.y,h.z),f.copy(h).normalize(),_.push(f.x,f.y,f.z),g.push(M+v,1-y),x.push(l++)}u.push(x)}for(let p=0;p<i;p++)for(let x=0;x<n;x++){let y=u[p][x+1],v=u[p][x],b=u[p+1][x],M=u[p+1][x+1];(p!==0||o>0)&&d.push(y,v,M),(p!==i-1||c<Math.PI)&&d.push(v,b,M)}this.setIndex(d),this.setAttribute("position",new ht(m,3)),this.setAttribute("normal",new ht(_,3)),this.setAttribute("uv",new ht(g,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new t(e.radius,e.widthSegments,e.heightSegments,e.phiStart,e.phiLength,e.thetaStart,e.thetaLength)}};var Zo=class t extends Mt{constructor(e=1,n=.4,i=12,r=48,s=Math.PI*2){super(),this.type="TorusGeometry",this.parameters={radius:e,tube:n,radialSegments:i,tubularSegments:r,arc:s},i=Math.floor(i),r=Math.floor(r);let o=[],a=[],c=[],l=[],u=new R,h=new R,f=new R;for(let d=0;d<=i;d++)for(let m=0;m<=r;m++){let _=m/r*s,g=d/i*Math.PI*2;h.x=(e+n*Math.cos(g))*Math.cos(_),h.y=(e+n*Math.cos(g))*Math.sin(_),h.z=n*Math.sin(g),a.push(h.x,h.y,h.z),u.x=e*Math.cos(_),u.y=e*Math.sin(_),f.subVectors(h,u).normalize(),c.push(f.x,f.y,f.z),l.push(m/r),l.push(d/i)}for(let d=1;d<=i;d++)for(let m=1;m<=r;m++){let _=(r+1)*d+m-1,g=(r+1)*(d-1)+m-1,p=(r+1)*(d-1)+m,x=(r+1)*d+m;o.push(_,g,x),o.push(g,p,x)}this.setIndex(o),this.setAttribute("position",new ht(a,3)),this.setAttribute("normal",new ht(c,3)),this.setAttribute("uv",new ht(l,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new t(e.radius,e.tube,e.radialSegments,e.tubularSegments,e.arc)}};var Ko=class t extends Mt{constructor(e=new Nr(new R(-1,-1,0),new R(-1,1,0),new R(1,1,0)),n=64,i=1,r=8,s=!1){super(),this.type="TubeGeometry",this.parameters={path:e,tubularSegments:n,radius:i,radialSegments:r,closed:s};let o=e.computeFrenetFrames(n,s);this.tangents=o.tangents,this.normals=o.normals,this.binormals=o.binormals;let a=new R,c=new R,l=new ie,u=new R,h=[],f=[],d=[],m=[];_(),this.setIndex(m),this.setAttribute("position",new ht(h,3)),this.setAttribute("normal",new ht(f,3)),this.setAttribute("uv",new ht(d,2));function _(){for(let y=0;y<n;y++)g(y);g(s===!1?n:0),x(),p()}function g(y){u=e.getPointAt(y/n,u);let v=o.normals[y],b=o.binormals[y];for(let M=0;M<=r;M++){let A=M/r*Math.PI*2,C=Math.sin(A),T=-Math.cos(A);c.x=T*v.x+C*b.x,c.y=T*v.y+C*b.y,c.z=T*v.z+C*b.z,c.normalize(),f.push(c.x,c.y,c.z),a.x=u.x+i*c.x,a.y=u.y+i*c.y,a.z=u.z+i*c.z,h.push(a.x,a.y,a.z)}}function p(){for(let y=1;y<=n;y++)for(let v=1;v<=r;v++){let b=(r+1)*(y-1)+(v-1),M=(r+1)*y+(v-1),A=(r+1)*y+v,C=(r+1)*(y-1)+v;m.push(b,M,C),m.push(M,A,C)}}function x(){for(let y=0;y<=n;y++)for(let v=0;v<=r;v++)l.x=y/n,l.y=v/r,d.push(l.x,l.y)}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}toJSON(){let e=super.toJSON();return e.path=this.parameters.path.toJSON(),e}static fromJSON(e){return new t(new Gb[e.path.type]().fromJSON(e.path),e.tubularSegments,e.radius,e.radialSegments,e.closed)}};var Jo=class extends Bt{constructor(e){super(e),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}},Qo=class extends Gn{constructor(e){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new Fe(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Fe(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=nh,this.normalScale=new ie(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Hn,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:""},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.envMapIntensity=e.envMapIntensity,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}};var ea=class extends Gn{constructor(e){super(),this.isMeshLambertMaterial=!0,this.type="MeshLambertMaterial",this.color=new Fe(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Fe(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=nh,this.normalScale=new ie(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Hn,this.combine=ul,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}},jc=class extends Gn{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=Zm,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}},qc=class extends Gn{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}};function xc(t,e){return!t||t.constructor===e?t:typeof e.BYTES_PER_ELEMENT=="number"?new e(t):Array.prototype.slice.call(t)}function Wb(t){return ArrayBuffer.isView(t)&&!(t instanceof DataView)}var Fr=class{constructor(e,n,i,r){this.parameterPositions=e,this._cachedIndex=0,this.resultBuffer=r!==void 0?r:new n.constructor(i),this.sampleValues=n,this.valueSize=i,this.settings=null,this.DefaultSettings_={}}evaluate(e){let n=this.parameterPositions,i=this._cachedIndex,r=n[i],s=n[i-1];e:{t:{let o;n:{i:if(!(e<r)){for(let a=i+2;;){if(r===void 0){if(e<s)break i;return i=n.length,this._cachedIndex=i,this.copySampleValue_(i-1)}if(i===a)break;if(s=r,r=n[++i],e<r)break t}o=n.length;break n}if(!(e>=s)){let a=n[1];e<a&&(i=2,s=a);for(let c=i-2;;){if(s===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(i===c)break;if(r=s,s=n[--i-1],e>=s)break t}o=i,i=0;break n}break e}for(;i<o;){let a=i+o>>>1;e<n[a]?o=a:i=a+1}if(r=n[i],s=n[i-1],s===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(r===void 0)return i=n.length,this._cachedIndex=i,this.copySampleValue_(i-1)}this._cachedIndex=i,this.intervalChanged_(i,s,r)}return this.interpolate_(i,s,e,r)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(e){let n=this.resultBuffer,i=this.sampleValues,r=this.valueSize,s=e*r;for(let o=0;o!==r;++o)n[o]=i[s+o];return n}interpolate_(){throw new Error("call to abstract method")}intervalChanged_(){}},Xc=class extends Fr{constructor(e,n,i,r){super(e,n,i,r),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:Qu,endingEnd:Qu}}intervalChanged_(e,n,i){let r=this.parameterPositions,s=e-2,o=e+1,a=r[s],c=r[o];if(a===void 0)switch(this.getSettings_().endingStart){case ef:s=e,a=2*n-i;break;case tf:s=r.length-2,a=n+r[s]-r[s+1];break;default:s=e,a=i}if(c===void 0)switch(this.getSettings_().endingEnd){case ef:o=e,c=2*i-n;break;case tf:o=1,c=i+r[1]-r[0];break;default:o=e-1,c=n}let l=(i-n)*.5,u=this.valueSize;this._weightPrev=l/(n-a),this._weightNext=l/(c-i),this._offsetPrev=s*u,this._offsetNext=o*u}interpolate_(e,n,i,r){let s=this.resultBuffer,o=this.sampleValues,a=this.valueSize,c=e*a,l=c-a,u=this._offsetPrev,h=this._offsetNext,f=this._weightPrev,d=this._weightNext,m=(i-n)/(r-n),_=m*m,g=_*m,p=-f*g+2*f*_-f*m,x=(1+f)*g+(-1.5-2*f)*_+(-.5+f)*m+1,y=(-1-d)*g+(1.5+d)*_+.5*m,v=d*g-d*_;for(let b=0;b!==a;++b)s[b]=p*o[u+b]+x*o[l+b]+y*o[c+b]+v*o[h+b];return s}},$c=class extends Fr{constructor(e,n,i,r){super(e,n,i,r)}interpolate_(e,n,i,r){let s=this.resultBuffer,o=this.sampleValues,a=this.valueSize,c=e*a,l=c-a,u=(i-n)/(r-n),h=1-u;for(let f=0;f!==a;++f)s[f]=o[l+f]*h+o[c+f]*u;return s}},Yc=class extends Fr{constructor(e,n,i,r){super(e,n,i,r)}interpolate_(e){return this.copySampleValue_(e-1)}},Pn=class{constructor(e,n,i,r){if(e===void 0)throw new Error("THREE.KeyframeTrack: track name is undefined");if(n===void 0||n.length===0)throw new Error("THREE.KeyframeTrack: no keyframes in track named "+e);this.name=e,this.times=xc(n,this.TimeBufferType),this.values=xc(i,this.ValueBufferType),this.setInterpolation(r||this.DefaultInterpolation)}static toJSON(e){let n=e.constructor,i;if(n.toJSON!==this.toJSON)i=n.toJSON(e);else{i={name:e.name,times:xc(e.times,Array),values:xc(e.values,Array)};let r=e.getInterpolation();r!==e.DefaultInterpolation&&(i.interpolation=r)}return i.type=e.ValueTypeName,i}InterpolantFactoryMethodDiscrete(e){return new Yc(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodLinear(e){return new $c(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodSmooth(e){return new Xc(this.times,this.values,this.getValueSize(),e)}setInterpolation(e){let n;switch(e){case Lo:n=this.InterpolantFactoryMethodDiscrete;break;case Ac:n=this.InterpolantFactoryMethodLinear;break;case bc:n=this.InterpolantFactoryMethodSmooth;break}if(n===void 0){let i="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(e!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw new Error(i);return console.warn("THREE.KeyframeTrack:",i),this}return this.createInterpolant=n,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return Lo;case this.InterpolantFactoryMethodLinear:return Ac;case this.InterpolantFactoryMethodSmooth:return bc}}getValueSize(){return this.values.length/this.times.length}shift(e){if(e!==0){let n=this.times;for(let i=0,r=n.length;i!==r;++i)n[i]+=e}return this}scale(e){if(e!==1){let n=this.times;for(let i=0,r=n.length;i!==r;++i)n[i]*=e}return this}trim(e,n){let i=this.times,r=i.length,s=0,o=r-1;for(;s!==r&&i[s]<e;)++s;for(;o!==-1&&i[o]>n;)--o;if(++o,s!==0||o!==r){s>=o&&(o=Math.max(o,1),s=o-1);let a=this.getValueSize();this.times=i.slice(s,o),this.values=this.values.slice(s*a,o*a)}return this}validate(){let e=!0,n=this.getValueSize();n-Math.floor(n)!==0&&(console.error("THREE.KeyframeTrack: Invalid value size in track.",this),e=!1);let i=this.times,r=this.values,s=i.length;s===0&&(console.error("THREE.KeyframeTrack: Track is empty.",this),e=!1);let o=null;for(let a=0;a!==s;a++){let c=i[a];if(typeof c=="number"&&isNaN(c)){console.error("THREE.KeyframeTrack: Time is not a valid number.",this,a,c),e=!1;break}if(o!==null&&o>c){console.error("THREE.KeyframeTrack: Out of order keys.",this,a,c,o),e=!1;break}o=c}if(r!==void 0&&Wb(r))for(let a=0,c=r.length;a!==c;++a){let l=r[a];if(isNaN(l)){console.error("THREE.KeyframeTrack: Value is not a valid number.",this,a,l),e=!1;break}}return e}optimize(){let e=this.times.slice(),n=this.values.slice(),i=this.getValueSize(),r=this.getInterpolation()===bc,s=e.length-1,o=1;for(let a=1;a<s;++a){let c=!1,l=e[a],u=e[a+1];if(l!==u&&(a!==1||l!==e[0]))if(r)c=!0;else{let h=a*i,f=h-i,d=h+i;for(let m=0;m!==i;++m){let _=n[h+m];if(_!==n[f+m]||_!==n[d+m]){c=!0;break}}}if(c){if(a!==o){e[o]=e[a];let h=a*i,f=o*i;for(let d=0;d!==i;++d)n[f+d]=n[h+d]}++o}}if(s>0){e[o]=e[s];for(let a=s*i,c=o*i,l=0;l!==i;++l)n[c+l]=n[a+l];++o}return o!==e.length?(this.times=e.slice(0,o),this.values=n.slice(0,o*i)):(this.times=e,this.values=n),this}clone(){let e=this.times.slice(),n=this.values.slice(),i=this.constructor,r=new i(this.name,e,n);return r.createInterpolant=this.createInterpolant,r}};Pn.prototype.ValueTypeName="";Pn.prototype.TimeBufferType=Float32Array;Pn.prototype.ValueBufferType=Float32Array;Pn.prototype.DefaultInterpolation=Ac;var sr=class extends Pn{constructor(e,n,i){super(e,n,i)}};sr.prototype.ValueTypeName="bool";sr.prototype.ValueBufferType=Array;sr.prototype.DefaultInterpolation=Lo;sr.prototype.InterpolantFactoryMethodLinear=void 0;sr.prototype.InterpolantFactoryMethodSmooth=void 0;var Zc=class extends Pn{constructor(e,n,i,r){super(e,n,i,r)}};Zc.prototype.ValueTypeName="color";var Kc=class extends Pn{constructor(e,n,i,r){super(e,n,i,r)}};Kc.prototype.ValueTypeName="number";var Jc=class extends Fr{constructor(e,n,i,r){super(e,n,i,r)}interpolate_(e,n,i,r){let s=this.resultBuffer,o=this.sampleValues,a=this.valueSize,c=(i-n)/(r-n),l=e*a;for(let u=l+a;l!==u;l+=4)Ht.slerpFlat(s,0,o,l-a,o,l,c);return s}},ta=class extends Pn{constructor(e,n,i,r){super(e,n,i,r)}InterpolantFactoryMethodLinear(e){return new Jc(this.times,this.values,this.getValueSize(),e)}};ta.prototype.ValueTypeName="quaternion";ta.prototype.InterpolantFactoryMethodSmooth=void 0;var or=class extends Pn{constructor(e,n,i){super(e,n,i)}};or.prototype.ValueTypeName="string";or.prototype.ValueBufferType=Array;or.prototype.DefaultInterpolation=Lo;or.prototype.InterpolantFactoryMethodLinear=void 0;or.prototype.InterpolantFactoryMethodSmooth=void 0;var Qc=class extends Pn{constructor(e,n,i,r){super(e,n,i,r)}};Qc.prototype.ValueTypeName="vector";var Mc={enabled:!1,files:{},add:function(t,e){this.enabled!==!1&&(this.files[t]=e)},get:function(t){if(this.enabled!==!1)return this.files[t]},remove:function(t){delete this.files[t]},clear:function(){this.files={}}},el=class{constructor(e,n,i){let r=this,s=!1,o=0,a=0,c,l=[];this.onStart=void 0,this.onLoad=e,this.onProgress=n,this.onError=i,this.abortController=new AbortController,this.itemStart=function(u){a++,s===!1&&r.onStart!==void 0&&r.onStart(u,o,a),s=!0},this.itemEnd=function(u){o++,r.onProgress!==void 0&&r.onProgress(u,o,a),o===a&&(s=!1,r.onLoad!==void 0&&r.onLoad())},this.itemError=function(u){r.onError!==void 0&&r.onError(u)},this.resolveURL=function(u){return c?c(u):u},this.setURLModifier=function(u){return c=u,this},this.addHandler=function(u,h){return l.push(u,h),this},this.removeHandler=function(u){let h=l.indexOf(u);return h!==-1&&l.splice(h,2),this},this.getHandler=function(u){for(let h=0,f=l.length;h<f;h+=2){let d=l[h],m=l[h+1];if(d.global&&(d.lastIndex=0),d.test(u))return m}return null},this.abort=function(){return this.abortController.abort(),this.abortController=new AbortController,this}}},hg=new el,zs=class{constructor(e){this.manager=e!==void 0?e:hg,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={}}load(){}loadAsync(e,n){let i=this;return new Promise(function(r,s){i.load(e,r,n,s)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}abort(){return this}};zs.DEFAULT_MATERIAL_NAME="__DEFAULT";var ws=new WeakMap,tl=class extends zs{constructor(e){super(e)}load(e,n,i,r){this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);let s=this,o=Mc.get(`image:${e}`);if(o!==void 0){if(o.complete===!0)s.manager.itemStart(e),setTimeout(function(){n&&n(o),s.manager.itemEnd(e)},0);else{let h=ws.get(o);h===void 0&&(h=[],ws.set(o,h)),h.push({onLoad:n,onError:r})}return o}let a=Cs("img");function c(){u(),n&&n(this);let h=ws.get(this)||[];for(let f=0;f<h.length;f++){let d=h[f];d.onLoad&&d.onLoad(this)}ws.delete(this),s.manager.itemEnd(e)}function l(h){u(),r&&r(h),Mc.remove(`image:${e}`);let f=ws.get(this)||[];for(let d=0;d<f.length;d++){let m=f[d];m.onError&&m.onError(h)}ws.delete(this),s.manager.itemError(e),s.manager.itemEnd(e)}function u(){a.removeEventListener("load",c,!1),a.removeEventListener("error",l,!1)}return a.addEventListener("load",c,!1),a.addEventListener("error",l,!1),e.slice(0,5)!=="data:"&&this.crossOrigin!==void 0&&(a.crossOrigin=this.crossOrigin),Mc.add(`image:${e}`,a),s.manager.itemStart(e),a.src=e,a}};var na=class extends zs{constructor(e){super(e)}load(e,n,i,r){let s=new hn,o=new tl(this.manager);return o.setCrossOrigin(this.crossOrigin),o.setPath(this.path),o.load(e,function(a){s.image=a,s.needsUpdate=!0,n!==void 0&&n(s)},i,r),s}},ks=class extends Xt{constructor(e,n=1){super(),this.isLight=!0,this.type="Light",this.color=new Fe(e),this.intensity=n}dispose(){}copy(e,n){return super.copy(e,n),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){let n=super.toJSON(e);return n.object.color=this.color.getHex(),n.object.intensity=this.intensity,this.groundColor!==void 0&&(n.object.groundColor=this.groundColor.getHex()),this.distance!==void 0&&(n.object.distance=this.distance),this.angle!==void 0&&(n.object.angle=this.angle),this.decay!==void 0&&(n.object.decay=this.decay),this.penumbra!==void 0&&(n.object.penumbra=this.penumbra),this.shadow!==void 0&&(n.object.shadow=this.shadow.toJSON()),this.target!==void 0&&(n.object.target=this.target.uuid),n}};var Ku=new qe,bm=new R,Mm=new R,nl=class{constructor(e){this.camera=e,this.intensity=1,this.bias=0,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new ie(512,512),this.mapType=oi,this.map=null,this.mapPass=null,this.matrix=new qe,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new Os,this._frameExtents=new ie(1,1),this._viewportCount=1,this._viewports=[new mt(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(e){let n=this.camera,i=this.matrix;bm.setFromMatrixPosition(e.matrixWorld),n.position.copy(bm),Mm.setFromMatrixPosition(e.target.matrixWorld),n.lookAt(Mm),n.updateMatrixWorld(),Ku.multiplyMatrices(n.projectionMatrix,n.matrixWorldInverse),this._frustum.setFromProjectionMatrix(Ku,n.coordinateSystem,n.reversedDepth),n.reversedDepth?i.set(.5,0,0,.5,0,.5,0,.5,0,0,1,0,0,0,0,1):i.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),i.multiply(Ku)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.intensity=e.intensity,this.bias=e.bias,this.radius=e.radius,this.autoUpdate=e.autoUpdate,this.needsUpdate=e.needsUpdate,this.normalBias=e.normalBias,this.blurSamples=e.blurSamples,this.mapSize.copy(e.mapSize),this}clone(){return new this.constructor().copy(this)}toJSON(){let e={};return this.intensity!==1&&(e.intensity=this.intensity),this.bias!==0&&(e.bias=this.bias),this.normalBias!==0&&(e.normalBias=this.normalBias),this.radius!==1&&(e.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(e.mapSize=this.mapSize.toArray()),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}};var Sm=new qe,Co=new R,Ju=new R,sf=class extends nl{constructor(){super(new Zt(90,1,.5,500)),this.isPointLightShadow=!0,this._frameExtents=new ie(4,2),this._viewportCount=6,this._viewports=[new mt(2,1,1,1),new mt(0,1,1,1),new mt(3,1,1,1),new mt(1,1,1,1),new mt(3,0,1,1),new mt(1,0,1,1)],this._cubeDirections=[new R(1,0,0),new R(-1,0,0),new R(0,0,1),new R(0,0,-1),new R(0,1,0),new R(0,-1,0)],this._cubeUps=[new R(0,1,0),new R(0,1,0),new R(0,1,0),new R(0,1,0),new R(0,0,1),new R(0,0,-1)]}updateMatrices(e,n=0){let i=this.camera,r=this.matrix,s=e.distance||i.far;s!==i.far&&(i.far=s,i.updateProjectionMatrix()),Co.setFromMatrixPosition(e.matrixWorld),i.position.copy(Co),Ju.copy(i.position),Ju.add(this._cubeDirections[n]),i.up.copy(this._cubeUps[n]),i.lookAt(Ju),i.updateMatrixWorld(),r.makeTranslation(-Co.x,-Co.y,-Co.z),Sm.multiplyMatrices(i.projectionMatrix,i.matrixWorldInverse),this._frustum.setFromProjectionMatrix(Sm,i.coordinateSystem,i.reversedDepth)}},ia=class extends ks{constructor(e,n,i=0,r=2){super(e,n),this.isPointLight=!0,this.type="PointLight",this.distance=i,this.decay=r,this.shadow=new sf}get power(){return this.intensity*4*Math.PI}set power(e){this.intensity=e/(4*Math.PI)}dispose(){this.shadow.dispose()}copy(e,n){return super.copy(e,n),this.distance=e.distance,this.decay=e.decay,this.shadow=e.shadow.clone(),this}},Ur=class extends ko{constructor(e=-1,n=1,i=1,r=-1,s=.1,o=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=n,this.top=i,this.bottom=r,this.near=s,this.far=o,this.updateProjectionMatrix()}copy(e,n){return super.copy(e,n),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,n,i,r,s,o){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=n,this.view.offsetX=i,this.view.offsetY=r,this.view.width=s,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=(this.right-this.left)/(2*this.zoom),n=(this.top-this.bottom)/(2*this.zoom),i=(this.right+this.left)/2,r=(this.top+this.bottom)/2,s=i-e,o=i+e,a=r+n,c=r-n;if(this.view!==null&&this.view.enabled){let l=(this.right-this.left)/this.view.fullWidth/this.zoom,u=(this.top-this.bottom)/this.view.fullHeight/this.zoom;s+=l*this.view.offsetX,o=s+l*this.view.width,a-=u*this.view.offsetY,c=a-u*this.view.height}this.projectionMatrix.makeOrthographic(s,o,a,c,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let n=super.toJSON(e);return n.object.zoom=this.zoom,n.object.left=this.left,n.object.right=this.right,n.object.top=this.top,n.object.bottom=this.bottom,n.object.near=this.near,n.object.far=this.far,this.view!==null&&(n.object.view=Object.assign({},this.view)),n}},of=class extends nl{constructor(){super(new Ur(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}},ra=class extends ks{constructor(e,n){super(e,n),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(Xt.DEFAULT_UP),this.updateMatrix(),this.target=new Xt,this.shadow=new of}dispose(){this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}},zr=class extends ks{constructor(e,n){super(e,n),this.isAmbientLight=!0,this.type="AmbientLight"}};var il=class extends Zt{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e}},sa=class{constructor(e=!0){this.autoStart=e,this.startTime=0,this.oldTime=0,this.elapsedTime=0,this.running=!1}start(){this.startTime=performance.now(),this.oldTime=this.startTime,this.elapsedTime=0,this.running=!0}stop(){this.getElapsedTime(),this.running=!1,this.autoStart=!1}getElapsedTime(){return this.getDelta(),this.elapsedTime}getDelta(){let e=0;if(this.autoStart&&!this.running)return this.start(),0;if(this.running){let n=performance.now();e=(n-this.oldTime)/1e3,this.oldTime=n,this.elapsedTime+=e}return e}};var Cf="\\[\\]\\.:\\/",jb=new RegExp("["+Cf+"]","g"),Rf="[^"+Cf+"]",qb="[^"+Cf.replace("\\.","")+"]",Xb=/((?:WC+[\/:])*)/.source.replace("WC",Rf),$b=/(WCOD+)?/.source.replace("WCOD",qb),Yb=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",Rf),Zb=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",Rf),Kb=new RegExp("^"+Xb+$b+Yb+Zb+"$"),Jb=["material","materials","bones","map"],af=class{constructor(e,n,i){let r=i||At.parseTrackName(n);this._targetGroup=e,this._bindings=e.subscribe_(n,r)}getValue(e,n){this.bind();let i=this._targetGroup.nCachedObjects_,r=this._bindings[i];r!==void 0&&r.getValue(e,n)}setValue(e,n){let i=this._bindings;for(let r=this._targetGroup.nCachedObjects_,s=i.length;r!==s;++r)i[r].setValue(e,n)}bind(){let e=this._bindings;for(let n=this._targetGroup.nCachedObjects_,i=e.length;n!==i;++n)e[n].bind()}unbind(){let e=this._bindings;for(let n=this._targetGroup.nCachedObjects_,i=e.length;n!==i;++n)e[n].unbind()}},At=class t{constructor(e,n,i){this.path=n,this.parsedPath=i||t.parseTrackName(n),this.node=t.findNode(e,this.parsedPath.nodeName),this.rootNode=e,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(e,n,i){return e&&e.isAnimationObjectGroup?new t.Composite(e,n,i):new t(e,n,i)}static sanitizeNodeName(e){return e.replace(/\s/g,"_").replace(jb,"")}static parseTrackName(e){let n=Kb.exec(e);if(n===null)throw new Error("PropertyBinding: Cannot parse trackName: "+e);let i={nodeName:n[2],objectName:n[3],objectIndex:n[4],propertyName:n[5],propertyIndex:n[6]},r=i.nodeName&&i.nodeName.lastIndexOf(".");if(r!==void 0&&r!==-1){let s=i.nodeName.substring(r+1);Jb.indexOf(s)!==-1&&(i.nodeName=i.nodeName.substring(0,r),i.objectName=s)}if(i.propertyName===null||i.propertyName.length===0)throw new Error("PropertyBinding: can not parse propertyName from trackName: "+e);return i}static findNode(e,n){if(n===void 0||n===""||n==="."||n===-1||n===e.name||n===e.uuid)return e;if(e.skeleton){let i=e.skeleton.getBoneByName(n);if(i!==void 0)return i}if(e.children){let i=function(s){for(let o=0;o<s.length;o++){let a=s[o];if(a.name===n||a.uuid===n)return a;let c=i(a.children);if(c)return c}return null},r=i(e.children);if(r)return r}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(e,n){e[n]=this.targetObject[this.propertyName]}_getValue_array(e,n){let i=this.resolvedProperty;for(let r=0,s=i.length;r!==s;++r)e[n++]=i[r]}_getValue_arrayElement(e,n){e[n]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(e,n){this.resolvedProperty.toArray(e,n)}_setValue_direct(e,n){this.targetObject[this.propertyName]=e[n]}_setValue_direct_setNeedsUpdate(e,n){this.targetObject[this.propertyName]=e[n],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(e,n){this.targetObject[this.propertyName]=e[n],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(e,n){let i=this.resolvedProperty;for(let r=0,s=i.length;r!==s;++r)i[r]=e[n++]}_setValue_array_setNeedsUpdate(e,n){let i=this.resolvedProperty;for(let r=0,s=i.length;r!==s;++r)i[r]=e[n++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(e,n){let i=this.resolvedProperty;for(let r=0,s=i.length;r!==s;++r)i[r]=e[n++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(e,n){this.resolvedProperty[this.propertyIndex]=e[n]}_setValue_arrayElement_setNeedsUpdate(e,n){this.resolvedProperty[this.propertyIndex]=e[n],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(e,n){this.resolvedProperty[this.propertyIndex]=e[n],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(e,n){this.resolvedProperty.fromArray(e,n)}_setValue_fromArray_setNeedsUpdate(e,n){this.resolvedProperty.fromArray(e,n),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(e,n){this.resolvedProperty.fromArray(e,n),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(e,n){this.bind(),this.getValue(e,n)}_setValue_unbound(e,n){this.bind(),this.setValue(e,n)}bind(){let e=this.node,n=this.parsedPath,i=n.objectName,r=n.propertyName,s=n.propertyIndex;if(e||(e=t.findNode(this.rootNode,n.nodeName),this.node=e),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!e){console.warn("THREE.PropertyBinding: No target node found for track: "+this.path+".");return}if(i){let l=n.objectIndex;switch(i){case"materials":if(!e.material){console.error("THREE.PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.materials){console.error("THREE.PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}e=e.material.materials;break;case"bones":if(!e.skeleton){console.error("THREE.PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}e=e.skeleton.bones;for(let u=0;u<e.length;u++)if(e[u].name===l){l=u;break}break;case"map":if("map"in e){e=e.map;break}if(!e.material){console.error("THREE.PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.map){console.error("THREE.PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}e=e.material.map;break;default:if(e[i]===void 0){console.error("THREE.PropertyBinding: Can not bind to objectName of node undefined.",this);return}e=e[i]}if(l!==void 0){if(e[l]===void 0){console.error("THREE.PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,e);return}e=e[l]}}let o=e[r];if(o===void 0){let l=n.nodeName;console.error("THREE.PropertyBinding: Trying to update property for track: "+l+"."+r+" but it wasn't found.",e);return}let a=this.Versioning.None;this.targetObject=e,e.isMaterial===!0?a=this.Versioning.NeedsUpdate:e.isObject3D===!0&&(a=this.Versioning.MatrixWorldNeedsUpdate);let c=this.BindingType.Direct;if(s!==void 0){if(r==="morphTargetInfluences"){if(!e.geometry){console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!e.geometry.morphAttributes){console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}e.morphTargetDictionary[s]!==void 0&&(s=e.morphTargetDictionary[s])}c=this.BindingType.ArrayElement,this.resolvedProperty=o,this.propertyIndex=s}else o.fromArray!==void 0&&o.toArray!==void 0?(c=this.BindingType.HasFromToArray,this.resolvedProperty=o):Array.isArray(o)?(c=this.BindingType.EntireArray,this.resolvedProperty=o):this.propertyName=r;this.getValue=this.GetterByBindingType[c],this.setValue=this.SetterByBindingTypeAndVersioning[c][a]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}};At.Composite=af;At.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};At.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};At.prototype.GetterByBindingType=[At.prototype._getValue_direct,At.prototype._getValue_array,At.prototype._getValue_arrayElement,At.prototype._getValue_toArray];At.prototype.SetterByBindingTypeAndVersioning=[[At.prototype._setValue_direct,At.prototype._setValue_direct_setNeedsUpdate,At.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[At.prototype._setValue_array,At.prototype._setValue_array_setNeedsUpdate,At.prototype._setValue_array_setMatrixWorldNeedsUpdate],[At.prototype._setValue_arrayElement,At.prototype._setValue_arrayElement_setNeedsUpdate,At.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[At.prototype._setValue_fromArray,At.prototype._setValue_fromArray_setNeedsUpdate,At.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];var KI=new Float32Array(1);var wm=new qe,Bi=class{constructor(e,n,i=0,r=1/0){this.ray=new zi(e,n),this.near=i,this.far=r,this.camera=null,this.layers=new Is,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(e,n){this.ray.set(e,n)}setFromCamera(e,n){n.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(n.matrixWorld),this.ray.direction.set(e.x,e.y,.5).unproject(n).sub(this.ray.origin).normalize(),this.camera=n):n.isOrthographicCamera?(this.ray.origin.set(e.x,e.y,(n.near+n.far)/(n.near-n.far)).unproject(n),this.ray.direction.set(0,0,-1).transformDirection(n.matrixWorld),this.camera=n):console.error("THREE.Raycaster: Unsupported camera type: "+n.type)}setFromXRController(e){return wm.identity().extractRotation(e.matrixWorld),this.ray.origin.setFromMatrixPosition(e.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(wm),this}intersectObject(e,n=!0,i=[]){return cf(e,this,i,n),i.sort(Em),i}intersectObjects(e,n=!0,i=[]){for(let r=0,s=e.length;r<s;r++)cf(e[r],this,i,n);return i.sort(Em),i}};function Em(t,e){return t.distance-e.distance}function cf(t,e,n,i){let r=!0;if(t.layers.test(e.layers)&&t.raycast(e,n)===!1&&(r=!1),r===!0&&i===!0){let s=t.children;for(let o=0,a=s.length;o<a;o++)cf(s[o],e,n,!0)}}var oa=class{constructor(){this._previousTime=0,this._currentTime=0,this._startTime=performance.now(),this._delta=0,this._elapsed=0,this._timescale=1,this._document=null,this._pageVisibilityHandler=null}connect(e){this._document=e,e.hidden!==void 0&&(this._pageVisibilityHandler=Qb.bind(this),e.addEventListener("visibilitychange",this._pageVisibilityHandler,!1))}disconnect(){this._pageVisibilityHandler!==null&&(this._document.removeEventListener("visibilitychange",this._pageVisibilityHandler),this._pageVisibilityHandler=null),this._document=null}getDelta(){return this._delta/1e3}getElapsed(){return this._elapsed/1e3}getTimescale(){return this._timescale}setTimescale(e){return this._timescale=e,this}reset(){return this._currentTime=performance.now()-this._startTime,this}dispose(){this.disconnect()}update(e){return this._pageVisibilityHandler!==null&&this._document.hidden===!0?this._delta=0:(this._previousTime=this._currentTime,this._currentTime=(e!==void 0?e:performance.now())-this._startTime,this._delta=(this._currentTime-this._previousTime)*this._timescale,this._elapsed+=this._delta),this}};function Qb(){this._document.hidden===!1&&this.reset()}var Bs=class{constructor(e=1,n=0,i=0){this.radius=e,this.phi=n,this.theta=i}set(e,n,i){return this.radius=e,this.phi=n,this.theta=i,this}copy(e){return this.radius=e.radius,this.phi=e.phi,this.theta=e.theta,this}makeSafe(){return this.phi=tt(this.phi,1e-6,Math.PI-1e-6),this}setFromVector3(e){return this.setFromCartesianCoords(e.x,e.y,e.z)}setFromCartesianCoords(e,n,i){return this.radius=Math.sqrt(e*e+n*n+i*i),this.radius===0?(this.theta=0,this.phi=0):(this.theta=Math.atan2(e,i),this.phi=Math.acos(tt(n/this.radius,-1,1))),this}clone(){return new this.constructor().copy(this)}};var aa=class extends Uc{constructor(e=10,n=10,i=4473924,r=8947848){i=new Fe(i),r=new Fe(r);let s=n/2,o=e/n,a=e/2,c=[],l=[];for(let f=0,d=0,m=-a;f<=n;f++,m+=o){c.push(-a,0,m,a,0,m),c.push(m,0,-a,m,0,a);let _=f===s?i:r;_.toArray(l,d),d+=3,_.toArray(l,d),d+=3,_.toArray(l,d),d+=3,_.toArray(l,d),d+=3}let u=new Mt;u.setAttribute("position",new ht(c,3)),u.setAttribute("color",new ht(l,3));let h=new ri({vertexColors:!0,toneMapped:!1});super(u,h),this.type="GridHelper"}dispose(){this.geometry.dispose(),this.material.dispose()}};var In=class extends di{constructor(e,n=null){super(),this.object=e,this.domElement=n,this.enabled=!0,this.state=-1,this.keys={},this.mouseButtons={LEFT:null,MIDDLE:null,RIGHT:null},this.touches={ONE:null,TWO:null}}connect(e){if(e===void 0){console.warn("THREE.Controls: connect() now requires an element.");return}this.domElement!==null&&this.disconnect(),this.domElement=e}disconnect(){}dispose(){}update(){}};function Pf(t,e,n,i){let r=e1(i);switch(n){case vf:return t*e;case xf:return t*e/r.components*r.byteLength;case El:return t*e/r.components*r.byteLength;case bf:return t*e*2/r.components*r.byteLength;case Tl:return t*e*2/r.components*r.byteLength;case yf:return t*e*3/r.components*r.byteLength;case Xn:return t*e*4/r.components*r.byteLength;case Al:return t*e*4/r.components*r.byteLength;case ha:case ua:return Math.floor((t+3)/4)*Math.floor((e+3)/4)*8;case fa:case da:return Math.floor((t+3)/4)*Math.floor((e+3)/4)*16;case Rl:case Il:return Math.max(t,16)*Math.max(e,8)/4;case Cl:case Pl:return Math.max(t,8)*Math.max(e,8)/2;case Dl:case Ll:return Math.floor((t+3)/4)*Math.floor((e+3)/4)*8;case Ol:return Math.floor((t+3)/4)*Math.floor((e+3)/4)*16;case Nl:return Math.floor((t+3)/4)*Math.floor((e+3)/4)*16;case Fl:return Math.floor((t+4)/5)*Math.floor((e+3)/4)*16;case Ul:return Math.floor((t+4)/5)*Math.floor((e+4)/5)*16;case zl:return Math.floor((t+5)/6)*Math.floor((e+4)/5)*16;case kl:return Math.floor((t+5)/6)*Math.floor((e+5)/6)*16;case Bl:return Math.floor((t+7)/8)*Math.floor((e+4)/5)*16;case Vl:return Math.floor((t+7)/8)*Math.floor((e+5)/6)*16;case Hl:return Math.floor((t+7)/8)*Math.floor((e+7)/8)*16;case Gl:return Math.floor((t+9)/10)*Math.floor((e+4)/5)*16;case Wl:return Math.floor((t+9)/10)*Math.floor((e+5)/6)*16;case jl:return Math.floor((t+9)/10)*Math.floor((e+7)/8)*16;case ql:return Math.floor((t+9)/10)*Math.floor((e+9)/10)*16;case Xl:return Math.floor((t+11)/12)*Math.floor((e+9)/10)*16;case $l:return Math.floor((t+11)/12)*Math.floor((e+11)/12)*16;case Yl:case Zl:case Kl:return Math.ceil(t/4)*Math.ceil(e/4)*16;case Jl:case Ql:return Math.ceil(t/4)*Math.ceil(e/4)*8;case eh:case th:return Math.ceil(t/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${n} format.`)}function e1(t){switch(t){case oi:case pf:return{byteLength:1,components:1};case Vs:case mf:case qn:return{byteLength:2,components:1};case Sl:case wl:return{byteLength:2,components:4};case lr:case Ml:case bi:return{byteLength:4,components:1};case gf:case _f:return{byteLength:4,components:3}}throw new Error(`Unknown texture type ${t}.`)}typeof __THREE_DEVTOOLS__!="undefined"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:"180"}}));typeof window!="undefined"&&(window.__THREE__?console.warn("WARNING: Multiple instances of Three.js being imported."):window.__THREE__="180");function Og(){let t=null,e=!1,n=null,i=null;function r(s,o){n(s,o),i=t.requestAnimationFrame(r)}return{start:function(){e!==!0&&n!==null&&(i=t.requestAnimationFrame(r),e=!0)},stop:function(){t.cancelAnimationFrame(i),e=!1},setAnimationLoop:function(s){n=s},setContext:function(s){t=s}}}function t1(t){let e=new WeakMap;function n(a,c){let l=a.array,u=a.usage,h=l.byteLength,f=t.createBuffer();t.bindBuffer(c,f),t.bufferData(c,l,u),a.onUploadCallback();let d;if(l instanceof Float32Array)d=t.FLOAT;else if(typeof Float16Array!="undefined"&&l instanceof Float16Array)d=t.HALF_FLOAT;else if(l instanceof Uint16Array)a.isFloat16BufferAttribute?d=t.HALF_FLOAT:d=t.UNSIGNED_SHORT;else if(l instanceof Int16Array)d=t.SHORT;else if(l instanceof Uint32Array)d=t.UNSIGNED_INT;else if(l instanceof Int32Array)d=t.INT;else if(l instanceof Int8Array)d=t.BYTE;else if(l instanceof Uint8Array)d=t.UNSIGNED_BYTE;else if(l instanceof Uint8ClampedArray)d=t.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+l);return{buffer:f,type:d,bytesPerElement:l.BYTES_PER_ELEMENT,version:a.version,size:h}}function i(a,c,l){let u=c.array,h=c.updateRanges;if(t.bindBuffer(l,a),h.length===0)t.bufferSubData(l,0,u);else{h.sort((d,m)=>d.start-m.start);let f=0;for(let d=1;d<h.length;d++){let m=h[f],_=h[d];_.start<=m.start+m.count+1?m.count=Math.max(m.count,_.start+_.count-m.start):(++f,h[f]=_)}h.length=f+1;for(let d=0,m=h.length;d<m;d++){let _=h[d];t.bufferSubData(l,_.start*u.BYTES_PER_ELEMENT,u,_.start,_.count)}c.clearUpdateRanges()}c.onUploadCallback()}function r(a){return a.isInterleavedBufferAttribute&&(a=a.data),e.get(a)}function s(a){a.isInterleavedBufferAttribute&&(a=a.data);let c=e.get(a);c&&(t.deleteBuffer(c.buffer),e.delete(a))}function o(a,c){if(a.isInterleavedBufferAttribute&&(a=a.data),a.isGLBufferAttribute){let u=e.get(a);(!u||u.version<a.version)&&e.set(a,{buffer:a.buffer,type:a.type,bytesPerElement:a.elementSize,version:a.version});return}let l=e.get(a);if(l===void 0)e.set(a,n(a,c));else if(l.version<a.version){if(l.size!==a.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");i(l.buffer,a,c),l.version=a.version}}return{get:r,remove:s,update:o}}var n1=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,i1=`#ifdef USE_ALPHAHASH
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
#endif`,r1=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,s1=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,o1=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,a1=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,c1=`#ifdef USE_AOMAP
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
#endif`,l1=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,h1=`#ifdef USE_BATCHING
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
#endif`,u1=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,f1=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,d1=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,p1=`float G_BlinnPhong_Implicit( ) {
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
} // validated`,m1=`#ifdef USE_IRIDESCENCE
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
#endif`,g1=`#ifdef USE_BUMPMAP
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
#endif`,_1=`#if NUM_CLIPPING_PLANES > 0
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
#endif`,v1=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,y1=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,x1=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,b1=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,M1=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,S1=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,w1=`#if defined( USE_COLOR_ALPHA )
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
#endif`,E1=`#define PI 3.141592653589793
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
} // validated`,T1=`#ifdef ENVMAP_TYPE_CUBE_UV
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
#endif`,A1=`vec3 transformedNormal = objectNormal;
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
#endif`,C1=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,R1=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,P1=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,I1=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,D1="gl_FragColor = linearToOutputTexel( gl_FragColor );",L1=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,O1=`#ifdef USE_ENVMAP
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
#endif`,N1=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,F1=`#ifdef USE_ENVMAP
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
#endif`,U1=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,z1=`#ifdef USE_ENVMAP
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
#endif`,k1=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,B1=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,V1=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,H1=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,G1=`#ifdef USE_GRADIENTMAP
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
}`,W1=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,j1=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,q1=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,X1=`uniform bool receiveShadow;
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
#endif`,$1=`#ifdef USE_ENVMAP
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
#endif`,Y1=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,Z1=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,K1=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,J1=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,Q1=`PhysicalMaterial material;
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
#endif`,eM=`struct PhysicalMaterial {
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
}`,tM=`
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
#endif`,nM=`#if defined( RE_IndirectDiffuse )
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
#endif`,iM=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,rM=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,sM=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,oM=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,aM=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,cM=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,lM=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,hM=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
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
#endif`,uM=`#if defined( USE_POINTS_UV )
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
#endif`,fM=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,dM=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,pM=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,mM=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,gM=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,_M=`#ifdef USE_MORPHTARGETS
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
#endif`,vM=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,yM=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
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
vec3 nonPerturbedNormal = normal;`,xM=`#ifdef USE_NORMALMAP_OBJECTSPACE
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
#endif`,bM=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,MM=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,SM=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,wM=`#ifdef USE_NORMALMAP
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
#endif`,EM=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,TM=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,AM=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,CM=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,RM=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,PM=`vec3 packNormalToRGB( const in vec3 normal ) {
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
}`,IM=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,DM=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,LM=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,OM=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,NM=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,FM=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,UM=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,zM=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,kM=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
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
#endif`,BM=`float getShadowMask() {
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
}`,VM=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,HM=`#ifdef USE_SKINNING
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
#endif`,GM=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,WM=`#ifdef USE_SKINNING
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
#endif`,jM=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,qM=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,XM=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,$M=`#ifndef saturate
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
vec3 CustomToneMapping( vec3 color ) { return color; }`,YM=`#ifdef USE_TRANSMISSION
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
#endif`,ZM=`#ifdef USE_TRANSMISSION
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
#endif`,KM=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,JM=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,QM=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,eS=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,tS=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,nS=`uniform sampler2D t2D;
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
}`,iS=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,rS=`#ifdef ENVMAP_TYPE_CUBE
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
}`,sS=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,oS=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,aS=`#include <common>
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
}`,cS=`#if DEPTH_PACKING == 3200
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
}`,lS=`#define DISTANCE
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
}`,hS=`#define DISTANCE
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
}`,uS=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,fS=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,dS=`uniform float scale;
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
}`,pS=`uniform vec3 diffuse;
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
}`,mS=`#include <common>
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
}`,gS=`uniform vec3 diffuse;
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
}`,_S=`#define LAMBERT
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
}`,vS=`#define LAMBERT
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
}`,yS=`#define MATCAP
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
}`,xS=`#define MATCAP
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
}`,bS=`#define NORMAL
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
}`,MS=`#define NORMAL
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
}`,SS=`#define PHONG
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
}`,wS=`#define PHONG
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
}`,ES=`#define STANDARD
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
}`,TS=`#define STANDARD
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
}`,AS=`#define TOON
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
}`,CS=`#define TOON
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
}`,RS=`uniform float size;
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
}`,PS=`uniform vec3 diffuse;
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
}`,IS=`#include <common>
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
}`,DS=`uniform vec3 color;
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
}`,LS=`uniform float rotation;
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
}`,OS=`uniform vec3 diffuse;
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
}`,nt={alphahash_fragment:n1,alphahash_pars_fragment:i1,alphamap_fragment:r1,alphamap_pars_fragment:s1,alphatest_fragment:o1,alphatest_pars_fragment:a1,aomap_fragment:c1,aomap_pars_fragment:l1,batching_pars_vertex:h1,batching_vertex:u1,begin_vertex:f1,beginnormal_vertex:d1,bsdfs:p1,iridescence_fragment:m1,bumpmap_pars_fragment:g1,clipping_planes_fragment:_1,clipping_planes_pars_fragment:v1,clipping_planes_pars_vertex:y1,clipping_planes_vertex:x1,color_fragment:b1,color_pars_fragment:M1,color_pars_vertex:S1,color_vertex:w1,common:E1,cube_uv_reflection_fragment:T1,defaultnormal_vertex:A1,displacementmap_pars_vertex:C1,displacementmap_vertex:R1,emissivemap_fragment:P1,emissivemap_pars_fragment:I1,colorspace_fragment:D1,colorspace_pars_fragment:L1,envmap_fragment:O1,envmap_common_pars_fragment:N1,envmap_pars_fragment:F1,envmap_pars_vertex:U1,envmap_physical_pars_fragment:$1,envmap_vertex:z1,fog_vertex:k1,fog_pars_vertex:B1,fog_fragment:V1,fog_pars_fragment:H1,gradientmap_pars_fragment:G1,lightmap_pars_fragment:W1,lights_lambert_fragment:j1,lights_lambert_pars_fragment:q1,lights_pars_begin:X1,lights_toon_fragment:Y1,lights_toon_pars_fragment:Z1,lights_phong_fragment:K1,lights_phong_pars_fragment:J1,lights_physical_fragment:Q1,lights_physical_pars_fragment:eM,lights_fragment_begin:tM,lights_fragment_maps:nM,lights_fragment_end:iM,logdepthbuf_fragment:rM,logdepthbuf_pars_fragment:sM,logdepthbuf_pars_vertex:oM,logdepthbuf_vertex:aM,map_fragment:cM,map_pars_fragment:lM,map_particle_fragment:hM,map_particle_pars_fragment:uM,metalnessmap_fragment:fM,metalnessmap_pars_fragment:dM,morphinstance_vertex:pM,morphcolor_vertex:mM,morphnormal_vertex:gM,morphtarget_pars_vertex:_M,morphtarget_vertex:vM,normal_fragment_begin:yM,normal_fragment_maps:xM,normal_pars_fragment:bM,normal_pars_vertex:MM,normal_vertex:SM,normalmap_pars_fragment:wM,clearcoat_normal_fragment_begin:EM,clearcoat_normal_fragment_maps:TM,clearcoat_pars_fragment:AM,iridescence_pars_fragment:CM,opaque_fragment:RM,packing:PM,premultiplied_alpha_fragment:IM,project_vertex:DM,dithering_fragment:LM,dithering_pars_fragment:OM,roughnessmap_fragment:NM,roughnessmap_pars_fragment:FM,shadowmap_pars_fragment:UM,shadowmap_pars_vertex:zM,shadowmap_vertex:kM,shadowmask_pars_fragment:BM,skinbase_vertex:VM,skinning_pars_vertex:HM,skinning_vertex:GM,skinnormal_vertex:WM,specularmap_fragment:jM,specularmap_pars_fragment:qM,tonemapping_fragment:XM,tonemapping_pars_fragment:$M,transmission_fragment:YM,transmission_pars_fragment:ZM,uv_pars_fragment:KM,uv_pars_vertex:JM,uv_vertex:QM,worldpos_vertex:eS,background_vert:tS,background_frag:nS,backgroundCube_vert:iS,backgroundCube_frag:rS,cube_vert:sS,cube_frag:oS,depth_vert:aS,depth_frag:cS,distanceRGBA_vert:lS,distanceRGBA_frag:hS,equirect_vert:uS,equirect_frag:fS,linedashed_vert:dS,linedashed_frag:pS,meshbasic_vert:mS,meshbasic_frag:gS,meshlambert_vert:_S,meshlambert_frag:vS,meshmatcap_vert:yS,meshmatcap_frag:xS,meshnormal_vert:bS,meshnormal_frag:MS,meshphong_vert:SS,meshphong_frag:wS,meshphysical_vert:ES,meshphysical_frag:TS,meshtoon_vert:AS,meshtoon_frag:CS,points_vert:RS,points_frag:PS,shadow_vert:IS,shadow_frag:DS,sprite_vert:LS,sprite_frag:OS},ve={common:{diffuse:{value:new Fe(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Ke},alphaMap:{value:null},alphaMapTransform:{value:new Ke},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Ke}},envmap:{envMap:{value:null},envMapRotation:{value:new Ke},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Ke}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Ke}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Ke},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Ke},normalScale:{value:new ie(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Ke},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Ke}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Ke}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Ke}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Fe(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new Fe(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Ke},alphaTest:{value:0},uvTransform:{value:new Ke}},sprite:{diffuse:{value:new Fe(16777215)},opacity:{value:1},center:{value:new ie(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Ke},alphaMap:{value:null},alphaMapTransform:{value:new Ke},alphaTest:{value:0}}},Mi={basic:{uniforms:sn([ve.common,ve.specularmap,ve.envmap,ve.aomap,ve.lightmap,ve.fog]),vertexShader:nt.meshbasic_vert,fragmentShader:nt.meshbasic_frag},lambert:{uniforms:sn([ve.common,ve.specularmap,ve.envmap,ve.aomap,ve.lightmap,ve.emissivemap,ve.bumpmap,ve.normalmap,ve.displacementmap,ve.fog,ve.lights,{emissive:{value:new Fe(0)}}]),vertexShader:nt.meshlambert_vert,fragmentShader:nt.meshlambert_frag},phong:{uniforms:sn([ve.common,ve.specularmap,ve.envmap,ve.aomap,ve.lightmap,ve.emissivemap,ve.bumpmap,ve.normalmap,ve.displacementmap,ve.fog,ve.lights,{emissive:{value:new Fe(0)},specular:{value:new Fe(1118481)},shininess:{value:30}}]),vertexShader:nt.meshphong_vert,fragmentShader:nt.meshphong_frag},standard:{uniforms:sn([ve.common,ve.envmap,ve.aomap,ve.lightmap,ve.emissivemap,ve.bumpmap,ve.normalmap,ve.displacementmap,ve.roughnessmap,ve.metalnessmap,ve.fog,ve.lights,{emissive:{value:new Fe(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:nt.meshphysical_vert,fragmentShader:nt.meshphysical_frag},toon:{uniforms:sn([ve.common,ve.aomap,ve.lightmap,ve.emissivemap,ve.bumpmap,ve.normalmap,ve.displacementmap,ve.gradientmap,ve.fog,ve.lights,{emissive:{value:new Fe(0)}}]),vertexShader:nt.meshtoon_vert,fragmentShader:nt.meshtoon_frag},matcap:{uniforms:sn([ve.common,ve.bumpmap,ve.normalmap,ve.displacementmap,ve.fog,{matcap:{value:null}}]),vertexShader:nt.meshmatcap_vert,fragmentShader:nt.meshmatcap_frag},points:{uniforms:sn([ve.points,ve.fog]),vertexShader:nt.points_vert,fragmentShader:nt.points_frag},dashed:{uniforms:sn([ve.common,ve.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:nt.linedashed_vert,fragmentShader:nt.linedashed_frag},depth:{uniforms:sn([ve.common,ve.displacementmap]),vertexShader:nt.depth_vert,fragmentShader:nt.depth_frag},normal:{uniforms:sn([ve.common,ve.bumpmap,ve.normalmap,ve.displacementmap,{opacity:{value:1}}]),vertexShader:nt.meshnormal_vert,fragmentShader:nt.meshnormal_frag},sprite:{uniforms:sn([ve.sprite,ve.fog]),vertexShader:nt.sprite_vert,fragmentShader:nt.sprite_frag},background:{uniforms:{uvTransform:{value:new Ke},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:nt.background_vert,fragmentShader:nt.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Ke}},vertexShader:nt.backgroundCube_vert,fragmentShader:nt.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:nt.cube_vert,fragmentShader:nt.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:nt.equirect_vert,fragmentShader:nt.equirect_frag},distanceRGBA:{uniforms:sn([ve.common,ve.displacementmap,{referencePosition:{value:new R},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:nt.distanceRGBA_vert,fragmentShader:nt.distanceRGBA_frag},shadow:{uniforms:sn([ve.lights,ve.fog,{color:{value:new Fe(0)},opacity:{value:1}}]),vertexShader:nt.shadow_vert,fragmentShader:nt.shadow_frag}};Mi.physical={uniforms:sn([Mi.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Ke},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Ke},clearcoatNormalScale:{value:new ie(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Ke},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Ke},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Ke},sheen:{value:0},sheenColor:{value:new Fe(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Ke},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Ke},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Ke},transmissionSamplerSize:{value:new ie},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Ke},attenuationDistance:{value:0},attenuationColor:{value:new Fe(0)},specularColor:{value:new Fe(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Ke},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Ke},anisotropyVector:{value:new ie},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Ke}}]),vertexShader:nt.meshphysical_vert,fragmentShader:nt.meshphysical_frag};var ih={r:0,b:0,g:0},Hr=new Hn,NS=new qe;function FS(t,e,n,i,r,s,o){let a=new Fe(0),c=s===!0?0:1,l,u,h=null,f=0,d=null;function m(y){let v=y.isScene===!0?y.background:null;return v&&v.isTexture&&(v=(y.backgroundBlurriness>0?n:e).get(v)),v}function _(y){let v=!1,b=m(y);b===null?p(a,c):b&&b.isColor&&(p(b,1),v=!0);let M=t.xr.getEnvironmentBlendMode();M==="additive"?i.buffers.color.setClear(0,0,0,1,o):M==="alpha-blend"&&i.buffers.color.setClear(0,0,0,0,o),(t.autoClear||v)&&(i.buffers.depth.setTest(!0),i.buffers.depth.setMask(!0),i.buffers.color.setMask(!0),t.clear(t.autoClearColor,t.autoClearDepth,t.autoClearStencil))}function g(y,v){let b=m(v);b&&(b.isCubeTexture||b.mapping===ca)?(u===void 0&&(u=new Ct(new Ds(1,1,1),new Bt({name:"BackgroundCubeMaterial",uniforms:Vr(Mi.backgroundCube.uniforms),vertexShader:Mi.backgroundCube.vertexShader,fragmentShader:Mi.backgroundCube.fragmentShader,side:Kt,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),u.geometry.deleteAttribute("normal"),u.geometry.deleteAttribute("uv"),u.onBeforeRender=function(M,A,C){this.matrixWorld.copyPosition(C.matrixWorld)},Object.defineProperty(u.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),r.update(u)),Hr.copy(v.backgroundRotation),Hr.x*=-1,Hr.y*=-1,Hr.z*=-1,b.isCubeTexture&&b.isRenderTargetTexture===!1&&(Hr.y*=-1,Hr.z*=-1),u.material.uniforms.envMap.value=b,u.material.uniforms.flipEnvMap.value=b.isCubeTexture&&b.isRenderTargetTexture===!1?-1:1,u.material.uniforms.backgroundBlurriness.value=v.backgroundBlurriness,u.material.uniforms.backgroundIntensity.value=v.backgroundIntensity,u.material.uniforms.backgroundRotation.value.setFromMatrix4(NS.makeRotationFromEuler(Hr)),u.material.toneMapped=st.getTransfer(b.colorSpace)!==lt,(h!==b||f!==b.version||d!==t.toneMapping)&&(u.material.needsUpdate=!0,h=b,f=b.version,d=t.toneMapping),u.layers.enableAll(),y.unshift(u,u.geometry,u.material,0,0,null)):b&&b.isTexture&&(l===void 0&&(l=new Ct(new Yo(2,2),new Bt({name:"BackgroundMaterial",uniforms:Vr(Mi.background.uniforms),vertexShader:Mi.background.vertexShader,fragmentShader:Mi.background.fragmentShader,side:Ui,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute("normal"),Object.defineProperty(l.material,"map",{get:function(){return this.uniforms.t2D.value}}),r.update(l)),l.material.uniforms.t2D.value=b,l.material.uniforms.backgroundIntensity.value=v.backgroundIntensity,l.material.toneMapped=st.getTransfer(b.colorSpace)!==lt,b.matrixAutoUpdate===!0&&b.updateMatrix(),l.material.uniforms.uvTransform.value.copy(b.matrix),(h!==b||f!==b.version||d!==t.toneMapping)&&(l.material.needsUpdate=!0,h=b,f=b.version,d=t.toneMapping),l.layers.enableAll(),y.unshift(l,l.geometry,l.material,0,0,null))}function p(y,v){y.getRGB(ih,Tf(t)),i.buffers.color.setClear(ih.r,ih.g,ih.b,v,o)}function x(){u!==void 0&&(u.geometry.dispose(),u.material.dispose(),u=void 0),l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0)}return{getClearColor:function(){return a},setClearColor:function(y,v=1){a.set(y),c=v,p(a,c)},getClearAlpha:function(){return c},setClearAlpha:function(y){c=y,p(a,c)},render:_,addToRenderList:g,dispose:x}}function US(t,e){let n=t.getParameter(t.MAX_VERTEX_ATTRIBS),i={},r=f(null),s=r,o=!1;function a(w,P,z,U,O){let D=!1,V=h(U,z,P);s!==V&&(s=V,l(s.object)),D=d(w,U,z,O),D&&m(w,U,z,O),O!==null&&e.update(O,t.ELEMENT_ARRAY_BUFFER),(D||o)&&(o=!1,v(w,P,z,U),O!==null&&t.bindBuffer(t.ELEMENT_ARRAY_BUFFER,e.get(O).buffer))}function c(){return t.createVertexArray()}function l(w){return t.bindVertexArray(w)}function u(w){return t.deleteVertexArray(w)}function h(w,P,z){let U=z.wireframe===!0,O=i[w.id];O===void 0&&(O={},i[w.id]=O);let D=O[P.id];D===void 0&&(D={},O[P.id]=D);let V=D[U];return V===void 0&&(V=f(c()),D[U]=V),V}function f(w){let P=[],z=[],U=[];for(let O=0;O<n;O++)P[O]=0,z[O]=0,U[O]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:P,enabledAttributes:z,attributeDivisors:U,object:w,attributes:{},index:null}}function d(w,P,z,U){let O=s.attributes,D=P.attributes,V=0,Q=z.getAttributes();for(let j in Q)if(Q[j].location>=0){let ye=O[j],Z=D[j];if(Z===void 0&&(j==="instanceMatrix"&&w.instanceMatrix&&(Z=w.instanceMatrix),j==="instanceColor"&&w.instanceColor&&(Z=w.instanceColor)),ye===void 0||ye.attribute!==Z||Z&&ye.data!==Z.data)return!0;V++}return s.attributesNum!==V||s.index!==U}function m(w,P,z,U){let O={},D=P.attributes,V=0,Q=z.getAttributes();for(let j in Q)if(Q[j].location>=0){let ye=D[j];ye===void 0&&(j==="instanceMatrix"&&w.instanceMatrix&&(ye=w.instanceMatrix),j==="instanceColor"&&w.instanceColor&&(ye=w.instanceColor));let Z={};Z.attribute=ye,ye&&ye.data&&(Z.data=ye.data),O[j]=Z,V++}s.attributes=O,s.attributesNum=V,s.index=U}function _(){let w=s.newAttributes;for(let P=0,z=w.length;P<z;P++)w[P]=0}function g(w){p(w,0)}function p(w,P){let z=s.newAttributes,U=s.enabledAttributes,O=s.attributeDivisors;z[w]=1,U[w]===0&&(t.enableVertexAttribArray(w),U[w]=1),O[w]!==P&&(t.vertexAttribDivisor(w,P),O[w]=P)}function x(){let w=s.newAttributes,P=s.enabledAttributes;for(let z=0,U=P.length;z<U;z++)P[z]!==w[z]&&(t.disableVertexAttribArray(z),P[z]=0)}function y(w,P,z,U,O,D,V){V===!0?t.vertexAttribIPointer(w,P,z,O,D):t.vertexAttribPointer(w,P,z,U,O,D)}function v(w,P,z,U){_();let O=U.attributes,D=z.getAttributes(),V=P.defaultAttributeValues;for(let Q in D){let j=D[Q];if(j.location>=0){let ae=O[Q];if(ae===void 0&&(Q==="instanceMatrix"&&w.instanceMatrix&&(ae=w.instanceMatrix),Q==="instanceColor"&&w.instanceColor&&(ae=w.instanceColor)),ae!==void 0){let ye=ae.normalized,Z=ae.itemSize,re=e.get(ae);if(re===void 0)continue;let me=re.buffer,Ge=re.type,Ne=re.bytesPerElement,X=Ge===t.INT||Ge===t.UNSIGNED_INT||ae.gpuType===Ml;if(ae.isInterleavedBufferAttribute){let ee=ae.data,be=ee.stride,je=ae.offset;if(ee.isInstancedInterleavedBuffer){for(let Le=0;Le<j.locationSize;Le++)p(j.location+Le,ee.meshPerAttribute);w.isInstancedMesh!==!0&&U._maxInstanceCount===void 0&&(U._maxInstanceCount=ee.meshPerAttribute*ee.count)}else for(let Le=0;Le<j.locationSize;Le++)g(j.location+Le);t.bindBuffer(t.ARRAY_BUFFER,me);for(let Le=0;Le<j.locationSize;Le++)y(j.location+Le,Z/j.locationSize,Ge,ye,be*Ne,(je+Z/j.locationSize*Le)*Ne,X)}else{if(ae.isInstancedBufferAttribute){for(let ee=0;ee<j.locationSize;ee++)p(j.location+ee,ae.meshPerAttribute);w.isInstancedMesh!==!0&&U._maxInstanceCount===void 0&&(U._maxInstanceCount=ae.meshPerAttribute*ae.count)}else for(let ee=0;ee<j.locationSize;ee++)g(j.location+ee);t.bindBuffer(t.ARRAY_BUFFER,me);for(let ee=0;ee<j.locationSize;ee++)y(j.location+ee,Z/j.locationSize,Ge,ye,Z*Ne,Z/j.locationSize*ee*Ne,X)}}else if(V!==void 0){let ye=V[Q];if(ye!==void 0)switch(ye.length){case 2:t.vertexAttrib2fv(j.location,ye);break;case 3:t.vertexAttrib3fv(j.location,ye);break;case 4:t.vertexAttrib4fv(j.location,ye);break;default:t.vertexAttrib1fv(j.location,ye)}}}}x()}function b(){C();for(let w in i){let P=i[w];for(let z in P){let U=P[z];for(let O in U)u(U[O].object),delete U[O];delete P[z]}delete i[w]}}function M(w){if(i[w.id]===void 0)return;let P=i[w.id];for(let z in P){let U=P[z];for(let O in U)u(U[O].object),delete U[O];delete P[z]}delete i[w.id]}function A(w){for(let P in i){let z=i[P];if(z[w.id]===void 0)continue;let U=z[w.id];for(let O in U)u(U[O].object),delete U[O];delete z[w.id]}}function C(){T(),o=!0,s!==r&&(s=r,l(s.object))}function T(){r.geometry=null,r.program=null,r.wireframe=!1}return{setup:a,reset:C,resetDefaultState:T,dispose:b,releaseStatesOfGeometry:M,releaseStatesOfProgram:A,initAttributes:_,enableAttribute:g,disableUnusedAttributes:x}}function zS(t,e,n){let i;function r(l){i=l}function s(l,u){t.drawArrays(i,l,u),n.update(u,i,1)}function o(l,u,h){h!==0&&(t.drawArraysInstanced(i,l,u,h),n.update(u,i,h))}function a(l,u,h){if(h===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(i,l,0,u,0,h);let d=0;for(let m=0;m<h;m++)d+=u[m];n.update(d,i,1)}function c(l,u,h,f){if(h===0)return;let d=e.get("WEBGL_multi_draw");if(d===null)for(let m=0;m<l.length;m++)o(l[m],u[m],f[m]);else{d.multiDrawArraysInstancedWEBGL(i,l,0,u,0,f,0,h);let m=0;for(let _=0;_<h;_++)m+=u[_]*f[_];n.update(m,i,1)}}this.setMode=r,this.render=s,this.renderInstances=o,this.renderMultiDraw=a,this.renderMultiDrawInstances=c}function kS(t,e,n,i){let r;function s(){if(r!==void 0)return r;if(e.has("EXT_texture_filter_anisotropic")===!0){let A=e.get("EXT_texture_filter_anisotropic");r=t.getParameter(A.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else r=0;return r}function o(A){return!(A!==Xn&&i.convert(A)!==t.getParameter(t.IMPLEMENTATION_COLOR_READ_FORMAT))}function a(A){let C=A===qn&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(A!==oi&&i.convert(A)!==t.getParameter(t.IMPLEMENTATION_COLOR_READ_TYPE)&&A!==bi&&!C)}function c(A){if(A==="highp"){if(t.getShaderPrecisionFormat(t.VERTEX_SHADER,t.HIGH_FLOAT).precision>0&&t.getShaderPrecisionFormat(t.FRAGMENT_SHADER,t.HIGH_FLOAT).precision>0)return"highp";A="mediump"}return A==="mediump"&&t.getShaderPrecisionFormat(t.VERTEX_SHADER,t.MEDIUM_FLOAT).precision>0&&t.getShaderPrecisionFormat(t.FRAGMENT_SHADER,t.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let l=n.precision!==void 0?n.precision:"highp",u=c(l);u!==l&&(console.warn("THREE.WebGLRenderer:",l,"not supported, using",u,"instead."),l=u);let h=n.logarithmicDepthBuffer===!0,f=n.reversedDepthBuffer===!0&&e.has("EXT_clip_control"),d=t.getParameter(t.MAX_TEXTURE_IMAGE_UNITS),m=t.getParameter(t.MAX_VERTEX_TEXTURE_IMAGE_UNITS),_=t.getParameter(t.MAX_TEXTURE_SIZE),g=t.getParameter(t.MAX_CUBE_MAP_TEXTURE_SIZE),p=t.getParameter(t.MAX_VERTEX_ATTRIBS),x=t.getParameter(t.MAX_VERTEX_UNIFORM_VECTORS),y=t.getParameter(t.MAX_VARYING_VECTORS),v=t.getParameter(t.MAX_FRAGMENT_UNIFORM_VECTORS),b=m>0,M=t.getParameter(t.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:s,getMaxPrecision:c,textureFormatReadable:o,textureTypeReadable:a,precision:l,logarithmicDepthBuffer:h,reversedDepthBuffer:f,maxTextures:d,maxVertexTextures:m,maxTextureSize:_,maxCubemapSize:g,maxAttributes:p,maxVertexUniforms:x,maxVaryings:y,maxFragmentUniforms:v,vertexTextures:b,maxSamples:M}}function BS(t){let e=this,n=null,i=0,r=!1,s=!1,o=new _n,a=new Ke,c={value:null,needsUpdate:!1};this.uniform=c,this.numPlanes=0,this.numIntersection=0,this.init=function(h,f){let d=h.length!==0||f||i!==0||r;return r=f,i=h.length,d},this.beginShadows=function(){s=!0,u(null)},this.endShadows=function(){s=!1},this.setGlobalState=function(h,f){n=u(h,f,0)},this.setState=function(h,f,d){let m=h.clippingPlanes,_=h.clipIntersection,g=h.clipShadows,p=t.get(h);if(!r||m===null||m.length===0||s&&!g)s?u(null):l();else{let x=s?0:i,y=x*4,v=p.clippingState||null;c.value=v,v=u(m,f,y,d);for(let b=0;b!==y;++b)v[b]=n[b];p.clippingState=v,this.numIntersection=_?this.numPlanes:0,this.numPlanes+=x}};function l(){c.value!==n&&(c.value=n,c.needsUpdate=i>0),e.numPlanes=i,e.numIntersection=0}function u(h,f,d,m){let _=h!==null?h.length:0,g=null;if(_!==0){if(g=c.value,m!==!0||g===null){let p=d+_*4,x=f.matrixWorldInverse;a.getNormalMatrix(x),(g===null||g.length<p)&&(g=new Float32Array(p));for(let y=0,v=d;y!==_;++y,v+=4)o.copy(h[y]).applyMatrix4(x,a),o.normal.toArray(g,v),g[v+3]=o.constant}c.value=g,c.needsUpdate=!0}return e.numPlanes=_,e.numIntersection=0,g}}function VS(t){let e=new WeakMap;function n(o,a){return a===yl?o.mapping=kr:a===xl&&(o.mapping=Br),o}function i(o){if(o&&o.isTexture){let a=o.mapping;if(a===yl||a===xl)if(e.has(o)){let c=e.get(o).texture;return n(c,o.mapping)}else{let c=o.image;if(c&&c.height>0){let l=new Lc(c.height);return l.fromEquirectangularTexture(t,o),e.set(o,l),o.addEventListener("dispose",r),n(l.texture,o.mapping)}else return null}}return o}function r(o){let a=o.target;a.removeEventListener("dispose",r);let c=e.get(a);c!==void 0&&(e.delete(a),c.dispose())}function s(){e=new WeakMap}return{get:i,dispose:s}}var js=4,ug=[.125,.215,.35,.446,.526,.582],jr=20,If=new Ur,fg=new Fe,Df=null,Lf=0,Of=0,Nf=!1,Wr=(1+Math.sqrt(5))/2,Ws=1/Wr,dg=[new R(-Wr,Ws,0),new R(Wr,Ws,0),new R(-Ws,0,Wr),new R(Ws,0,Wr),new R(0,Wr,-Ws),new R(0,Wr,Ws),new R(-1,1,-1),new R(1,1,-1),new R(-1,1,1),new R(1,1,1)],HS=new R,oh=class{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene(e,n=0,i=.1,r=100,s={}){let{size:o=256,position:a=HS}=s;Df=this._renderer.getRenderTarget(),Lf=this._renderer.getActiveCubeFace(),Of=this._renderer.getActiveMipmapLevel(),Nf=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(o);let c=this._allocateTargets();return c.depthBuffer=!0,this._sceneToCubeUV(e,i,r,c,a),n>0&&this._blur(c,0,0,n),this._applyPMREM(c),this._cleanup(c),c}fromEquirectangular(e,n=null){return this._fromTexture(e,n)}fromCubemap(e,n=null){return this._fromTexture(e,n)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=gg(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=mg(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose()}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodPlanes.length;e++)this._lodPlanes[e].dispose()}_cleanup(e){this._renderer.setRenderTarget(Df,Lf,Of),this._renderer.xr.enabled=Nf,e.scissorTest=!1,rh(e,0,0,e.width,e.height)}_fromTexture(e,n){e.mapping===kr||e.mapping===Br?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),Df=this._renderer.getRenderTarget(),Lf=this._renderer.getActiveCubeFace(),Of=this._renderer.getActiveMipmapLevel(),Nf=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;let i=n||this._allocateTargets();return this._textureToCubeUV(e,i),this._applyPMREM(i),this._cleanup(i),i}_allocateTargets(){let e=3*Math.max(this._cubeSize,112),n=4*this._cubeSize,i={magFilter:ii,minFilter:ii,generateMipmaps:!1,type:qn,format:Xn,colorSpace:Or,depthBuffer:!1},r=pg(e,n,i);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==n){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=pg(e,n,i);let{_lodMax:s}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=GS(s)),this._blurMaterial=WS(s,e,n)}return r}_compileMaterial(e){let n=new Ct(this._lodPlanes[0],e);this._renderer.compile(n,If)}_sceneToCubeUV(e,n,i,r,s){let c=new Zt(90,1,n,i),l=[1,-1,1,1,1,1],u=[1,1,1,-1,-1,-1],h=this._renderer,f=h.autoClear,d=h.toneMapping;h.getClearColor(fg),h.toneMapping=Vi,h.autoClear=!1,h.state.buffers.depth.getReversed()&&(h.setRenderTarget(r),h.clearDepth(),h.setRenderTarget(null));let _=new Rn({name:"PMREM.Background",side:Kt,depthWrite:!1,depthTest:!1}),g=new Ct(new Ds,_),p=!1,x=e.background;x?x.isColor&&(_.color.copy(x),e.background=null,p=!0):(_.color.copy(fg),p=!0);for(let y=0;y<6;y++){let v=y%3;v===0?(c.up.set(0,l[y],0),c.position.set(s.x,s.y,s.z),c.lookAt(s.x+u[y],s.y,s.z)):v===1?(c.up.set(0,0,l[y]),c.position.set(s.x,s.y,s.z),c.lookAt(s.x,s.y+u[y],s.z)):(c.up.set(0,l[y],0),c.position.set(s.x,s.y,s.z),c.lookAt(s.x,s.y,s.z+u[y]));let b=this._cubeSize;rh(r,v*b,y>2?b:0,b,b),h.setRenderTarget(r),p&&h.render(g,c),h.render(e,c)}g.geometry.dispose(),g.material.dispose(),h.toneMapping=d,h.autoClear=f,e.background=x}_textureToCubeUV(e,n){let i=this._renderer,r=e.mapping===kr||e.mapping===Br;r?(this._cubemapMaterial===null&&(this._cubemapMaterial=gg()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=mg());let s=r?this._cubemapMaterial:this._equirectMaterial,o=new Ct(this._lodPlanes[0],s),a=s.uniforms;a.envMap.value=e;let c=this._cubeSize;rh(n,0,0,3*c,2*c),i.setRenderTarget(n),i.render(o,If)}_applyPMREM(e){let n=this._renderer,i=n.autoClear;n.autoClear=!1;let r=this._lodPlanes.length;for(let s=1;s<r;s++){let o=Math.sqrt(this._sigmas[s]*this._sigmas[s]-this._sigmas[s-1]*this._sigmas[s-1]),a=dg[(r-s-1)%dg.length];this._blur(e,s-1,s,o,a)}n.autoClear=i}_blur(e,n,i,r,s){let o=this._pingPongRenderTarget;this._halfBlur(e,o,n,i,r,"latitudinal",s),this._halfBlur(o,e,i,i,r,"longitudinal",s)}_halfBlur(e,n,i,r,s,o,a){let c=this._renderer,l=this._blurMaterial;o!=="latitudinal"&&o!=="longitudinal"&&console.error("blur direction must be either latitudinal or longitudinal!");let u=3,h=new Ct(this._lodPlanes[r],l),f=l.uniforms,d=this._sizeLods[i]-1,m=isFinite(s)?Math.PI/(2*d):2*Math.PI/(2*jr-1),_=s/m,g=isFinite(s)?1+Math.floor(u*_):jr;g>jr&&console.warn(`sigmaRadians, ${s}, is too large and will clip, as it requested ${g} samples when the maximum is set to ${jr}`);let p=[],x=0;for(let A=0;A<jr;++A){let C=A/_,T=Math.exp(-C*C/2);p.push(T),A===0?x+=T:A<g&&(x+=2*T)}for(let A=0;A<p.length;A++)p[A]=p[A]/x;f.envMap.value=e.texture,f.samples.value=g,f.weights.value=p,f.latitudinal.value=o==="latitudinal",a&&(f.poleAxis.value=a);let{_lodMax:y}=this;f.dTheta.value=m,f.mipInt.value=y-i;let v=this._sizeLods[r],b=3*v*(r>y-js?r-y+js:0),M=4*(this._cubeSize-v);rh(n,b,M,3*v,2*v),c.setRenderTarget(n),c.render(h,If)}};function GS(t){let e=[],n=[],i=[],r=t,s=t-js+1+ug.length;for(let o=0;o<s;o++){let a=Math.pow(2,r);n.push(a);let c=1/a;o>t-js?c=ug[o-t+js-1]:o===0&&(c=0),i.push(c);let l=1/(a-2),u=-l,h=1+l,f=[u,u,h,u,h,h,u,u,h,h,u,h],d=6,m=6,_=3,g=2,p=1,x=new Float32Array(_*m*d),y=new Float32Array(g*m*d),v=new Float32Array(p*m*d);for(let M=0;M<d;M++){let A=M%3*2/3-1,C=M>2?0:-1,T=[A,C,0,A+2/3,C,0,A+2/3,C+1,0,A,C,0,A+2/3,C+1,0,A,C+1,0];x.set(T,_*m*M),y.set(f,g*m*M);let w=[M,M,M,M,M,M];v.set(w,p*m*M)}let b=new Mt;b.setAttribute("position",new nn(x,_)),b.setAttribute("uv",new nn(y,g)),b.setAttribute("faceIndex",new nn(v,p)),e.push(b),r>js&&r--}return{lodPlanes:e,sizeLods:n,sigmas:i}}function pg(t,e,n){let i=new rn(t,e,n);return i.texture.mapping=ca,i.texture.name="PMREM.cubeUv",i.scissorTest=!0,i}function rh(t,e,n,i,r){t.viewport.set(e,n,i,r),t.scissor.set(e,n,i,r)}function WS(t,e,n){let i=new Float32Array(jr),r=new R(0,1,0);return new Bt({name:"SphericalGaussianBlur",defines:{n:jr,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/n,CUBEUV_MAX_MIP:`${t}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:i},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:r}},vertexShader:qf(),fragmentShader:`

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
		`,blending:si,depthTest:!1,depthWrite:!1})}function mg(){return new Bt({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:qf(),fragmentShader:`

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
		`,blending:si,depthTest:!1,depthWrite:!1})}function gg(){return new Bt({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:qf(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:si,depthTest:!1,depthWrite:!1})}function qf(){return`

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
	`}function jS(t){let e=new WeakMap,n=null;function i(a){if(a&&a.isTexture){let c=a.mapping,l=c===yl||c===xl,u=c===kr||c===Br;if(l||u){let h=e.get(a),f=h!==void 0?h.texture.pmremVersion:0;if(a.isRenderTargetTexture&&a.pmremVersion!==f)return n===null&&(n=new oh(t)),h=l?n.fromEquirectangular(a,h):n.fromCubemap(a,h),h.texture.pmremVersion=a.pmremVersion,e.set(a,h),h.texture;if(h!==void 0)return h.texture;{let d=a.image;return l&&d&&d.height>0||u&&d&&r(d)?(n===null&&(n=new oh(t)),h=l?n.fromEquirectangular(a):n.fromCubemap(a),h.texture.pmremVersion=a.pmremVersion,e.set(a,h),a.addEventListener("dispose",s),h.texture):null}}}return a}function r(a){let c=0,l=6;for(let u=0;u<l;u++)a[u]!==void 0&&c++;return c===l}function s(a){let c=a.target;c.removeEventListener("dispose",s);let l=e.get(c);l!==void 0&&(e.delete(c),l.dispose())}function o(){e=new WeakMap,n!==null&&(n.dispose(),n=null)}return{get:i,dispose:o}}function qS(t){let e={};function n(i){if(e[i]!==void 0)return e[i];let r;switch(i){case"WEBGL_depth_texture":r=t.getExtension("WEBGL_depth_texture")||t.getExtension("MOZ_WEBGL_depth_texture")||t.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":r=t.getExtension("EXT_texture_filter_anisotropic")||t.getExtension("MOZ_EXT_texture_filter_anisotropic")||t.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":r=t.getExtension("WEBGL_compressed_texture_s3tc")||t.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||t.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":r=t.getExtension("WEBGL_compressed_texture_pvrtc")||t.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:r=t.getExtension(i)}return e[i]=r,r}return{has:function(i){return n(i)!==null},init:function(){n("EXT_color_buffer_float"),n("WEBGL_clip_cull_distance"),n("OES_texture_float_linear"),n("EXT_color_buffer_half_float"),n("WEBGL_multisampled_render_to_texture"),n("WEBGL_render_shared_exponent")},get:function(i){let r=n(i);return r===null&&Rs("THREE.WebGLRenderer: "+i+" extension not supported."),r}}}function XS(t,e,n,i){let r={},s=new WeakMap;function o(h){let f=h.target;f.index!==null&&e.remove(f.index);for(let m in f.attributes)e.remove(f.attributes[m]);f.removeEventListener("dispose",o),delete r[f.id];let d=s.get(f);d&&(e.remove(d),s.delete(f)),i.releaseStatesOfGeometry(f),f.isInstancedBufferGeometry===!0&&delete f._maxInstanceCount,n.memory.geometries--}function a(h,f){return r[f.id]===!0||(f.addEventListener("dispose",o),r[f.id]=!0,n.memory.geometries++),f}function c(h){let f=h.attributes;for(let d in f)e.update(f[d],t.ARRAY_BUFFER)}function l(h){let f=[],d=h.index,m=h.attributes.position,_=0;if(d!==null){let x=d.array;_=d.version;for(let y=0,v=x.length;y<v;y+=3){let b=x[y+0],M=x[y+1],A=x[y+2];f.push(b,M,M,A,A,b)}}else if(m!==void 0){let x=m.array;_=m.version;for(let y=0,v=x.length/3-1;y<v;y+=3){let b=y+0,M=y+1,A=y+2;f.push(b,M,M,A,A,b)}}else return;let g=new(Ef(f)?zo:Uo)(f,1);g.version=_;let p=s.get(h);p&&e.remove(p),s.set(h,g)}function u(h){let f=s.get(h);if(f){let d=h.index;d!==null&&f.version<d.version&&l(h)}else l(h);return s.get(h)}return{get:a,update:c,getWireframeAttribute:u}}function $S(t,e,n){let i;function r(f){i=f}let s,o;function a(f){s=f.type,o=f.bytesPerElement}function c(f,d){t.drawElements(i,d,s,f*o),n.update(d,i,1)}function l(f,d,m){m!==0&&(t.drawElementsInstanced(i,d,s,f*o,m),n.update(d,i,m))}function u(f,d,m){if(m===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(i,d,0,s,f,0,m);let g=0;for(let p=0;p<m;p++)g+=d[p];n.update(g,i,1)}function h(f,d,m,_){if(m===0)return;let g=e.get("WEBGL_multi_draw");if(g===null)for(let p=0;p<f.length;p++)l(f[p]/o,d[p],_[p]);else{g.multiDrawElementsInstancedWEBGL(i,d,0,s,f,0,_,0,m);let p=0;for(let x=0;x<m;x++)p+=d[x]*_[x];n.update(p,i,1)}}this.setMode=r,this.setIndex=a,this.render=c,this.renderInstances=l,this.renderMultiDraw=u,this.renderMultiDrawInstances=h}function YS(t){let e={geometries:0,textures:0},n={frame:0,calls:0,triangles:0,points:0,lines:0};function i(s,o,a){switch(n.calls++,o){case t.TRIANGLES:n.triangles+=a*(s/3);break;case t.LINES:n.lines+=a*(s/2);break;case t.LINE_STRIP:n.lines+=a*(s-1);break;case t.LINE_LOOP:n.lines+=a*s;break;case t.POINTS:n.points+=a*s;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",o);break}}function r(){n.calls=0,n.triangles=0,n.points=0,n.lines=0}return{memory:e,render:n,programs:null,autoReset:!0,reset:r,update:i}}function ZS(t,e,n){let i=new WeakMap,r=new mt;function s(o,a,c){let l=o.morphTargetInfluences,u=a.morphAttributes.position||a.morphAttributes.normal||a.morphAttributes.color,h=u!==void 0?u.length:0,f=i.get(a);if(f===void 0||f.count!==h){let T=function(){A.dispose(),i.delete(a),a.removeEventListener("dispose",T)};f!==void 0&&f.texture.dispose();let d=a.morphAttributes.position!==void 0,m=a.morphAttributes.normal!==void 0,_=a.morphAttributes.color!==void 0,g=a.morphAttributes.position||[],p=a.morphAttributes.normal||[],x=a.morphAttributes.color||[],y=0;d===!0&&(y=1),m===!0&&(y=2),_===!0&&(y=3);let v=a.attributes.position.count*y,b=1;v>e.maxTextureSize&&(b=Math.ceil(v/e.maxTextureSize),v=e.maxTextureSize);let M=new Float32Array(v*b*4*h),A=new Fo(M,v,b,h);A.type=bi,A.needsUpdate=!0;let C=y*4;for(let w=0;w<h;w++){let P=g[w],z=p[w],U=x[w],O=v*b*4*w;for(let D=0;D<P.count;D++){let V=D*C;d===!0&&(r.fromBufferAttribute(P,D),M[O+V+0]=r.x,M[O+V+1]=r.y,M[O+V+2]=r.z,M[O+V+3]=0),m===!0&&(r.fromBufferAttribute(z,D),M[O+V+4]=r.x,M[O+V+5]=r.y,M[O+V+6]=r.z,M[O+V+7]=0),_===!0&&(r.fromBufferAttribute(U,D),M[O+V+8]=r.x,M[O+V+9]=r.y,M[O+V+10]=r.z,M[O+V+11]=U.itemSize===4?r.w:1)}}f={count:h,texture:A,size:new ie(v,b)},i.set(a,f),a.addEventListener("dispose",T)}if(o.isInstancedMesh===!0&&o.morphTexture!==null)c.getUniforms().setValue(t,"morphTexture",o.morphTexture,n);else{let d=0;for(let _=0;_<l.length;_++)d+=l[_];let m=a.morphTargetsRelative?1:1-d;c.getUniforms().setValue(t,"morphTargetBaseInfluence",m),c.getUniforms().setValue(t,"morphTargetInfluences",l)}c.getUniforms().setValue(t,"morphTargetsTexture",f.texture,n),c.getUniforms().setValue(t,"morphTargetsTextureSize",f.size)}return{update:s}}function KS(t,e,n,i){let r=new WeakMap;function s(c){let l=i.render.frame,u=c.geometry,h=e.get(c,u);if(r.get(h)!==l&&(e.update(h),r.set(h,l)),c.isInstancedMesh&&(c.hasEventListener("dispose",a)===!1&&c.addEventListener("dispose",a),r.get(c)!==l&&(n.update(c.instanceMatrix,t.ARRAY_BUFFER),c.instanceColor!==null&&n.update(c.instanceColor,t.ARRAY_BUFFER),r.set(c,l))),c.isSkinnedMesh){let f=c.skeleton;r.get(f)!==l&&(f.update(),r.set(f,l))}return h}function o(){r=new WeakMap}function a(c){let l=c.target;l.removeEventListener("dispose",a),n.remove(l.instanceMatrix),l.instanceColor!==null&&n.remove(l.instanceColor)}return{update:s,dispose:o}}var Ng=new hn,_g=new qo(1,1),Fg=new Fo,Ug=new Ic,zg=new Bo,vg=[],yg=[],xg=new Float32Array(16),bg=new Float32Array(9),Mg=new Float32Array(4);function Xs(t,e,n){let i=t[0];if(i<=0||i>0)return t;let r=e*n,s=vg[r];if(s===void 0&&(s=new Float32Array(r),vg[r]=s),e!==0){i.toArray(s,0);for(let o=1,a=0;o!==e;++o)a+=n,t[o].toArray(s,a)}return s}function Gt(t,e){if(t.length!==e.length)return!1;for(let n=0,i=t.length;n<i;n++)if(t[n]!==e[n])return!1;return!0}function Wt(t,e){for(let n=0,i=e.length;n<i;n++)t[n]=e[n]}function ch(t,e){let n=yg[e];n===void 0&&(n=new Int32Array(e),yg[e]=n);for(let i=0;i!==e;++i)n[i]=t.allocateTextureUnit();return n}function JS(t,e){let n=this.cache;n[0]!==e&&(t.uniform1f(this.addr,e),n[0]=e)}function QS(t,e){let n=this.cache;if(e.x!==void 0)(n[0]!==e.x||n[1]!==e.y)&&(t.uniform2f(this.addr,e.x,e.y),n[0]=e.x,n[1]=e.y);else{if(Gt(n,e))return;t.uniform2fv(this.addr,e),Wt(n,e)}}function ew(t,e){let n=this.cache;if(e.x!==void 0)(n[0]!==e.x||n[1]!==e.y||n[2]!==e.z)&&(t.uniform3f(this.addr,e.x,e.y,e.z),n[0]=e.x,n[1]=e.y,n[2]=e.z);else if(e.r!==void 0)(n[0]!==e.r||n[1]!==e.g||n[2]!==e.b)&&(t.uniform3f(this.addr,e.r,e.g,e.b),n[0]=e.r,n[1]=e.g,n[2]=e.b);else{if(Gt(n,e))return;t.uniform3fv(this.addr,e),Wt(n,e)}}function tw(t,e){let n=this.cache;if(e.x!==void 0)(n[0]!==e.x||n[1]!==e.y||n[2]!==e.z||n[3]!==e.w)&&(t.uniform4f(this.addr,e.x,e.y,e.z,e.w),n[0]=e.x,n[1]=e.y,n[2]=e.z,n[3]=e.w);else{if(Gt(n,e))return;t.uniform4fv(this.addr,e),Wt(n,e)}}function nw(t,e){let n=this.cache,i=e.elements;if(i===void 0){if(Gt(n,e))return;t.uniformMatrix2fv(this.addr,!1,e),Wt(n,e)}else{if(Gt(n,i))return;Mg.set(i),t.uniformMatrix2fv(this.addr,!1,Mg),Wt(n,i)}}function iw(t,e){let n=this.cache,i=e.elements;if(i===void 0){if(Gt(n,e))return;t.uniformMatrix3fv(this.addr,!1,e),Wt(n,e)}else{if(Gt(n,i))return;bg.set(i),t.uniformMatrix3fv(this.addr,!1,bg),Wt(n,i)}}function rw(t,e){let n=this.cache,i=e.elements;if(i===void 0){if(Gt(n,e))return;t.uniformMatrix4fv(this.addr,!1,e),Wt(n,e)}else{if(Gt(n,i))return;xg.set(i),t.uniformMatrix4fv(this.addr,!1,xg),Wt(n,i)}}function sw(t,e){let n=this.cache;n[0]!==e&&(t.uniform1i(this.addr,e),n[0]=e)}function ow(t,e){let n=this.cache;if(e.x!==void 0)(n[0]!==e.x||n[1]!==e.y)&&(t.uniform2i(this.addr,e.x,e.y),n[0]=e.x,n[1]=e.y);else{if(Gt(n,e))return;t.uniform2iv(this.addr,e),Wt(n,e)}}function aw(t,e){let n=this.cache;if(e.x!==void 0)(n[0]!==e.x||n[1]!==e.y||n[2]!==e.z)&&(t.uniform3i(this.addr,e.x,e.y,e.z),n[0]=e.x,n[1]=e.y,n[2]=e.z);else{if(Gt(n,e))return;t.uniform3iv(this.addr,e),Wt(n,e)}}function cw(t,e){let n=this.cache;if(e.x!==void 0)(n[0]!==e.x||n[1]!==e.y||n[2]!==e.z||n[3]!==e.w)&&(t.uniform4i(this.addr,e.x,e.y,e.z,e.w),n[0]=e.x,n[1]=e.y,n[2]=e.z,n[3]=e.w);else{if(Gt(n,e))return;t.uniform4iv(this.addr,e),Wt(n,e)}}function lw(t,e){let n=this.cache;n[0]!==e&&(t.uniform1ui(this.addr,e),n[0]=e)}function hw(t,e){let n=this.cache;if(e.x!==void 0)(n[0]!==e.x||n[1]!==e.y)&&(t.uniform2ui(this.addr,e.x,e.y),n[0]=e.x,n[1]=e.y);else{if(Gt(n,e))return;t.uniform2uiv(this.addr,e),Wt(n,e)}}function uw(t,e){let n=this.cache;if(e.x!==void 0)(n[0]!==e.x||n[1]!==e.y||n[2]!==e.z)&&(t.uniform3ui(this.addr,e.x,e.y,e.z),n[0]=e.x,n[1]=e.y,n[2]=e.z);else{if(Gt(n,e))return;t.uniform3uiv(this.addr,e),Wt(n,e)}}function fw(t,e){let n=this.cache;if(e.x!==void 0)(n[0]!==e.x||n[1]!==e.y||n[2]!==e.z||n[3]!==e.w)&&(t.uniform4ui(this.addr,e.x,e.y,e.z,e.w),n[0]=e.x,n[1]=e.y,n[2]=e.z,n[3]=e.w);else{if(Gt(n,e))return;t.uniform4uiv(this.addr,e),Wt(n,e)}}function dw(t,e,n){let i=this.cache,r=n.allocateTextureUnit();i[0]!==r&&(t.uniform1i(this.addr,r),i[0]=r);let s;this.type===t.SAMPLER_2D_SHADOW?(_g.compareFunction=Mf,s=_g):s=Ng,n.setTexture2D(e||s,r)}function pw(t,e,n){let i=this.cache,r=n.allocateTextureUnit();i[0]!==r&&(t.uniform1i(this.addr,r),i[0]=r),n.setTexture3D(e||Ug,r)}function mw(t,e,n){let i=this.cache,r=n.allocateTextureUnit();i[0]!==r&&(t.uniform1i(this.addr,r),i[0]=r),n.setTextureCube(e||zg,r)}function gw(t,e,n){let i=this.cache,r=n.allocateTextureUnit();i[0]!==r&&(t.uniform1i(this.addr,r),i[0]=r),n.setTexture2DArray(e||Fg,r)}function _w(t){switch(t){case 5126:return JS;case 35664:return QS;case 35665:return ew;case 35666:return tw;case 35674:return nw;case 35675:return iw;case 35676:return rw;case 5124:case 35670:return sw;case 35667:case 35671:return ow;case 35668:case 35672:return aw;case 35669:case 35673:return cw;case 5125:return lw;case 36294:return hw;case 36295:return uw;case 36296:return fw;case 35678:case 36198:case 36298:case 36306:case 35682:return dw;case 35679:case 36299:case 36307:return pw;case 35680:case 36300:case 36308:case 36293:return mw;case 36289:case 36303:case 36311:case 36292:return gw}}function vw(t,e){t.uniform1fv(this.addr,e)}function yw(t,e){let n=Xs(e,this.size,2);t.uniform2fv(this.addr,n)}function xw(t,e){let n=Xs(e,this.size,3);t.uniform3fv(this.addr,n)}function bw(t,e){let n=Xs(e,this.size,4);t.uniform4fv(this.addr,n)}function Mw(t,e){let n=Xs(e,this.size,4);t.uniformMatrix2fv(this.addr,!1,n)}function Sw(t,e){let n=Xs(e,this.size,9);t.uniformMatrix3fv(this.addr,!1,n)}function ww(t,e){let n=Xs(e,this.size,16);t.uniformMatrix4fv(this.addr,!1,n)}function Ew(t,e){t.uniform1iv(this.addr,e)}function Tw(t,e){t.uniform2iv(this.addr,e)}function Aw(t,e){t.uniform3iv(this.addr,e)}function Cw(t,e){t.uniform4iv(this.addr,e)}function Rw(t,e){t.uniform1uiv(this.addr,e)}function Pw(t,e){t.uniform2uiv(this.addr,e)}function Iw(t,e){t.uniform3uiv(this.addr,e)}function Dw(t,e){t.uniform4uiv(this.addr,e)}function Lw(t,e,n){let i=this.cache,r=e.length,s=ch(n,r);Gt(i,s)||(t.uniform1iv(this.addr,s),Wt(i,s));for(let o=0;o!==r;++o)n.setTexture2D(e[o]||Ng,s[o])}function Ow(t,e,n){let i=this.cache,r=e.length,s=ch(n,r);Gt(i,s)||(t.uniform1iv(this.addr,s),Wt(i,s));for(let o=0;o!==r;++o)n.setTexture3D(e[o]||Ug,s[o])}function Nw(t,e,n){let i=this.cache,r=e.length,s=ch(n,r);Gt(i,s)||(t.uniform1iv(this.addr,s),Wt(i,s));for(let o=0;o!==r;++o)n.setTextureCube(e[o]||zg,s[o])}function Fw(t,e,n){let i=this.cache,r=e.length,s=ch(n,r);Gt(i,s)||(t.uniform1iv(this.addr,s),Wt(i,s));for(let o=0;o!==r;++o)n.setTexture2DArray(e[o]||Fg,s[o])}function Uw(t){switch(t){case 5126:return vw;case 35664:return yw;case 35665:return xw;case 35666:return bw;case 35674:return Mw;case 35675:return Sw;case 35676:return ww;case 5124:case 35670:return Ew;case 35667:case 35671:return Tw;case 35668:case 35672:return Aw;case 35669:case 35673:return Cw;case 5125:return Rw;case 36294:return Pw;case 36295:return Iw;case 36296:return Dw;case 35678:case 36198:case 36298:case 36306:case 35682:return Lw;case 35679:case 36299:case 36307:return Ow;case 35680:case 36300:case 36308:case 36293:return Nw;case 36289:case 36303:case 36311:case 36292:return Fw}}var Uf=class{constructor(e,n,i){this.id=e,this.addr=i,this.cache=[],this.type=n.type,this.setValue=_w(n.type)}},zf=class{constructor(e,n,i){this.id=e,this.addr=i,this.cache=[],this.type=n.type,this.size=n.size,this.setValue=Uw(n.type)}},kf=class{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,n,i){let r=this.seq;for(let s=0,o=r.length;s!==o;++s){let a=r[s];a.setValue(e,n[a.id],i)}}},Ff=/(\w+)(\])?(\[|\.)?/g;function Sg(t,e){t.seq.push(e),t.map[e.id]=e}function zw(t,e,n){let i=t.name,r=i.length;for(Ff.lastIndex=0;;){let s=Ff.exec(i),o=Ff.lastIndex,a=s[1],c=s[2]==="]",l=s[3];if(c&&(a=a|0),l===void 0||l==="["&&o+2===r){Sg(n,l===void 0?new Uf(a,t,e):new zf(a,t,e));break}else{let h=n.map[a];h===void 0&&(h=new kf(a),Sg(n,h)),n=h}}}var qs=class{constructor(e,n){this.seq=[],this.map={};let i=e.getProgramParameter(n,e.ACTIVE_UNIFORMS);for(let r=0;r<i;++r){let s=e.getActiveUniform(n,r),o=e.getUniformLocation(n,s.name);zw(s,o,this)}}setValue(e,n,i,r){let s=this.map[n];s!==void 0&&s.setValue(e,i,r)}setOptional(e,n,i){let r=n[i];r!==void 0&&this.setValue(e,i,r)}static upload(e,n,i,r){for(let s=0,o=n.length;s!==o;++s){let a=n[s],c=i[a.id];c.needsUpdate!==!1&&a.setValue(e,c.value,r)}}static seqWithValue(e,n){let i=[];for(let r=0,s=e.length;r!==s;++r){let o=e[r];o.id in n&&i.push(o)}return i}};function wg(t,e,n){let i=t.createShader(e);return t.shaderSource(i,n),t.compileShader(i),i}var kw=37297,Bw=0;function Vw(t,e){let n=t.split(`
`),i=[],r=Math.max(e-6,0),s=Math.min(e+6,n.length);for(let o=r;o<s;o++){let a=o+1;i.push(`${a===e?">":" "} ${a}: ${n[o]}`)}return i.join(`
`)}var Eg=new Ke;function Hw(t){st._getMatrix(Eg,st.workingColorSpace,t);let e=`mat3( ${Eg.elements.map(n=>n.toFixed(4))} )`;switch(st.getTransfer(t)){case Oo:return[e,"LinearTransferOETF"];case lt:return[e,"sRGBTransferOETF"];default:return console.warn("THREE.WebGLProgram: Unsupported color space: ",t),[e,"LinearTransferOETF"]}}function Tg(t,e,n){let i=t.getShaderParameter(e,t.COMPILE_STATUS),s=(t.getShaderInfoLog(e)||"").trim();if(i&&s==="")return"";let o=/ERROR: 0:(\d+)/.exec(s);if(o){let a=parseInt(o[1]);return n.toUpperCase()+`

`+s+`

`+Vw(t.getShaderSource(e),a)}else return s}function Gw(t,e){let n=Hw(e);return[`vec4 ${t}( vec4 value ) {`,`	return ${n[1]}( vec4( value.rgb * ${n[0]}, value.a ) );`,"}"].join(`
`)}function Ww(t,e){let n;switch(e){case fl:n="Linear";break;case dl:n="Reinhard";break;case pl:n="Cineon";break;case ml:n="ACESFilmic";break;case _l:n="AgX";break;case vl:n="Neutral";break;case gl:n="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",e),n="Linear"}return"vec3 "+t+"( vec3 color ) { return "+n+"ToneMapping( color ); }"}var sh=new R;function jw(){st.getLuminanceCoefficients(sh);let t=sh.x.toFixed(4),e=sh.y.toFixed(4),n=sh.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${t}, ${e}, ${n} );`,"	return dot( weights, rgb );","}"].join(`
`)}function qw(t){return[t.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",t.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(pa).join(`
`)}function Xw(t){let e=[];for(let n in t){let i=t[n];i!==!1&&e.push("#define "+n+" "+i)}return e.join(`
`)}function $w(t,e){let n={},i=t.getProgramParameter(e,t.ACTIVE_ATTRIBUTES);for(let r=0;r<i;r++){let s=t.getActiveAttrib(e,r),o=s.name,a=1;s.type===t.FLOAT_MAT2&&(a=2),s.type===t.FLOAT_MAT3&&(a=3),s.type===t.FLOAT_MAT4&&(a=4),n[o]={type:s.type,location:t.getAttribLocation(e,o),locationSize:a}}return n}function pa(t){return t!==""}function Ag(t,e){let n=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return t.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,n).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function Cg(t,e){return t.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}var Yw=/^[ \t]*#include +<([\w\d./]+)>/gm;function Bf(t){return t.replace(Yw,Kw)}var Zw=new Map;function Kw(t,e){let n=nt[e];if(n===void 0){let i=Zw.get(e);if(i!==void 0)n=nt[i],console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,i);else throw new Error("Can not resolve #include <"+e+">")}return Bf(n)}var Jw=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Rg(t){return t.replace(Jw,Qw)}function Qw(t,e,n,i){let r="";for(let s=parseInt(e);s<parseInt(n);s++)r+=i.replace(/\[\s*i\s*\]/g,"[ "+s+" ]").replace(/UNROLLED_LOOP_INDEX/g,s);return r}function Pg(t){let e=`precision ${t.precision} float;
	precision ${t.precision} int;
	precision ${t.precision} sampler2D;
	precision ${t.precision} samplerCube;
	precision ${t.precision} sampler3D;
	precision ${t.precision} sampler2DArray;
	precision ${t.precision} sampler2DShadow;
	precision ${t.precision} samplerCubeShadow;
	precision ${t.precision} sampler2DArrayShadow;
	precision ${t.precision} isampler2D;
	precision ${t.precision} isampler3D;
	precision ${t.precision} isamplerCube;
	precision ${t.precision} isampler2DArray;
	precision ${t.precision} usampler2D;
	precision ${t.precision} usampler3D;
	precision ${t.precision} usamplerCube;
	precision ${t.precision} usampler2DArray;
	`;return t.precision==="highp"?e+=`
#define HIGH_PRECISION`:t.precision==="mediump"?e+=`
#define MEDIUM_PRECISION`:t.precision==="lowp"&&(e+=`
#define LOW_PRECISION`),e}function eE(t){let e="SHADOWMAP_TYPE_BASIC";return t.shadowMapType===hf?e="SHADOWMAP_TYPE_PCF":t.shadowMapType===Cm?e="SHADOWMAP_TYPE_PCF_SOFT":t.shadowMapType===yi&&(e="SHADOWMAP_TYPE_VSM"),e}function tE(t){let e="ENVMAP_TYPE_CUBE";if(t.envMap)switch(t.envMapMode){case kr:case Br:e="ENVMAP_TYPE_CUBE";break;case ca:e="ENVMAP_TYPE_CUBE_UV";break}return e}function nE(t){let e="ENVMAP_MODE_REFLECTION";return t.envMap&&t.envMapMode===Br&&(e="ENVMAP_MODE_REFRACTION"),e}function iE(t){let e="ENVMAP_BLENDING_NONE";if(t.envMap)switch(t.combine){case ul:e="ENVMAP_BLENDING_MULTIPLY";break;case Xm:e="ENVMAP_BLENDING_MIX";break;case $m:e="ENVMAP_BLENDING_ADD";break}return e}function rE(t){let e=t.envMapCubeUVHeight;if(e===null)return null;let n=Math.log2(e)-2,i=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,n),112)),texelHeight:i,maxMip:n}}function sE(t,e,n,i){let r=t.getContext(),s=n.defines,o=n.vertexShader,a=n.fragmentShader,c=eE(n),l=tE(n),u=nE(n),h=iE(n),f=rE(n),d=qw(n),m=Xw(s),_=r.createProgram(),g,p,x=n.glslVersion?"#version "+n.glslVersion+`
`:"";n.isRawShaderMaterial?(g=["#define SHADER_TYPE "+n.shaderType,"#define SHADER_NAME "+n.shaderName,m].filter(pa).join(`
`),g.length>0&&(g+=`
`),p=["#define SHADER_TYPE "+n.shaderType,"#define SHADER_NAME "+n.shaderName,m].filter(pa).join(`
`),p.length>0&&(p+=`
`)):(g=[Pg(n),"#define SHADER_TYPE "+n.shaderType,"#define SHADER_NAME "+n.shaderName,m,n.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",n.batching?"#define USE_BATCHING":"",n.batchingColor?"#define USE_BATCHING_COLOR":"",n.instancing?"#define USE_INSTANCING":"",n.instancingColor?"#define USE_INSTANCING_COLOR":"",n.instancingMorph?"#define USE_INSTANCING_MORPH":"",n.useFog&&n.fog?"#define USE_FOG":"",n.useFog&&n.fogExp2?"#define FOG_EXP2":"",n.map?"#define USE_MAP":"",n.envMap?"#define USE_ENVMAP":"",n.envMap?"#define "+u:"",n.lightMap?"#define USE_LIGHTMAP":"",n.aoMap?"#define USE_AOMAP":"",n.bumpMap?"#define USE_BUMPMAP":"",n.normalMap?"#define USE_NORMALMAP":"",n.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",n.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",n.displacementMap?"#define USE_DISPLACEMENTMAP":"",n.emissiveMap?"#define USE_EMISSIVEMAP":"",n.anisotropy?"#define USE_ANISOTROPY":"",n.anisotropyMap?"#define USE_ANISOTROPYMAP":"",n.clearcoatMap?"#define USE_CLEARCOATMAP":"",n.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",n.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",n.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",n.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",n.specularMap?"#define USE_SPECULARMAP":"",n.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",n.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",n.roughnessMap?"#define USE_ROUGHNESSMAP":"",n.metalnessMap?"#define USE_METALNESSMAP":"",n.alphaMap?"#define USE_ALPHAMAP":"",n.alphaHash?"#define USE_ALPHAHASH":"",n.transmission?"#define USE_TRANSMISSION":"",n.transmissionMap?"#define USE_TRANSMISSIONMAP":"",n.thicknessMap?"#define USE_THICKNESSMAP":"",n.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",n.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",n.mapUv?"#define MAP_UV "+n.mapUv:"",n.alphaMapUv?"#define ALPHAMAP_UV "+n.alphaMapUv:"",n.lightMapUv?"#define LIGHTMAP_UV "+n.lightMapUv:"",n.aoMapUv?"#define AOMAP_UV "+n.aoMapUv:"",n.emissiveMapUv?"#define EMISSIVEMAP_UV "+n.emissiveMapUv:"",n.bumpMapUv?"#define BUMPMAP_UV "+n.bumpMapUv:"",n.normalMapUv?"#define NORMALMAP_UV "+n.normalMapUv:"",n.displacementMapUv?"#define DISPLACEMENTMAP_UV "+n.displacementMapUv:"",n.metalnessMapUv?"#define METALNESSMAP_UV "+n.metalnessMapUv:"",n.roughnessMapUv?"#define ROUGHNESSMAP_UV "+n.roughnessMapUv:"",n.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+n.anisotropyMapUv:"",n.clearcoatMapUv?"#define CLEARCOATMAP_UV "+n.clearcoatMapUv:"",n.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+n.clearcoatNormalMapUv:"",n.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+n.clearcoatRoughnessMapUv:"",n.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+n.iridescenceMapUv:"",n.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+n.iridescenceThicknessMapUv:"",n.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+n.sheenColorMapUv:"",n.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+n.sheenRoughnessMapUv:"",n.specularMapUv?"#define SPECULARMAP_UV "+n.specularMapUv:"",n.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+n.specularColorMapUv:"",n.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+n.specularIntensityMapUv:"",n.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+n.transmissionMapUv:"",n.thicknessMapUv?"#define THICKNESSMAP_UV "+n.thicknessMapUv:"",n.vertexTangents&&n.flatShading===!1?"#define USE_TANGENT":"",n.vertexColors?"#define USE_COLOR":"",n.vertexAlphas?"#define USE_COLOR_ALPHA":"",n.vertexUv1s?"#define USE_UV1":"",n.vertexUv2s?"#define USE_UV2":"",n.vertexUv3s?"#define USE_UV3":"",n.pointsUvs?"#define USE_POINTS_UV":"",n.flatShading?"#define FLAT_SHADED":"",n.skinning?"#define USE_SKINNING":"",n.morphTargets?"#define USE_MORPHTARGETS":"",n.morphNormals&&n.flatShading===!1?"#define USE_MORPHNORMALS":"",n.morphColors?"#define USE_MORPHCOLORS":"",n.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+n.morphTextureStride:"",n.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+n.morphTargetsCount:"",n.doubleSided?"#define DOUBLE_SIDED":"",n.flipSided?"#define FLIP_SIDED":"",n.shadowMapEnabled?"#define USE_SHADOWMAP":"",n.shadowMapEnabled?"#define "+c:"",n.sizeAttenuation?"#define USE_SIZEATTENUATION":"",n.numLightProbes>0?"#define USE_LIGHT_PROBES":"",n.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",n.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(pa).join(`
`),p=[Pg(n),"#define SHADER_TYPE "+n.shaderType,"#define SHADER_NAME "+n.shaderName,m,n.useFog&&n.fog?"#define USE_FOG":"",n.useFog&&n.fogExp2?"#define FOG_EXP2":"",n.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",n.map?"#define USE_MAP":"",n.matcap?"#define USE_MATCAP":"",n.envMap?"#define USE_ENVMAP":"",n.envMap?"#define "+l:"",n.envMap?"#define "+u:"",n.envMap?"#define "+h:"",f?"#define CUBEUV_TEXEL_WIDTH "+f.texelWidth:"",f?"#define CUBEUV_TEXEL_HEIGHT "+f.texelHeight:"",f?"#define CUBEUV_MAX_MIP "+f.maxMip+".0":"",n.lightMap?"#define USE_LIGHTMAP":"",n.aoMap?"#define USE_AOMAP":"",n.bumpMap?"#define USE_BUMPMAP":"",n.normalMap?"#define USE_NORMALMAP":"",n.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",n.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",n.emissiveMap?"#define USE_EMISSIVEMAP":"",n.anisotropy?"#define USE_ANISOTROPY":"",n.anisotropyMap?"#define USE_ANISOTROPYMAP":"",n.clearcoat?"#define USE_CLEARCOAT":"",n.clearcoatMap?"#define USE_CLEARCOATMAP":"",n.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",n.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",n.dispersion?"#define USE_DISPERSION":"",n.iridescence?"#define USE_IRIDESCENCE":"",n.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",n.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",n.specularMap?"#define USE_SPECULARMAP":"",n.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",n.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",n.roughnessMap?"#define USE_ROUGHNESSMAP":"",n.metalnessMap?"#define USE_METALNESSMAP":"",n.alphaMap?"#define USE_ALPHAMAP":"",n.alphaTest?"#define USE_ALPHATEST":"",n.alphaHash?"#define USE_ALPHAHASH":"",n.sheen?"#define USE_SHEEN":"",n.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",n.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",n.transmission?"#define USE_TRANSMISSION":"",n.transmissionMap?"#define USE_TRANSMISSIONMAP":"",n.thicknessMap?"#define USE_THICKNESSMAP":"",n.vertexTangents&&n.flatShading===!1?"#define USE_TANGENT":"",n.vertexColors||n.instancingColor||n.batchingColor?"#define USE_COLOR":"",n.vertexAlphas?"#define USE_COLOR_ALPHA":"",n.vertexUv1s?"#define USE_UV1":"",n.vertexUv2s?"#define USE_UV2":"",n.vertexUv3s?"#define USE_UV3":"",n.pointsUvs?"#define USE_POINTS_UV":"",n.gradientMap?"#define USE_GRADIENTMAP":"",n.flatShading?"#define FLAT_SHADED":"",n.doubleSided?"#define DOUBLE_SIDED":"",n.flipSided?"#define FLIP_SIDED":"",n.shadowMapEnabled?"#define USE_SHADOWMAP":"",n.shadowMapEnabled?"#define "+c:"",n.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",n.numLightProbes>0?"#define USE_LIGHT_PROBES":"",n.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",n.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",n.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",n.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",n.toneMapping!==Vi?"#define TONE_MAPPING":"",n.toneMapping!==Vi?nt.tonemapping_pars_fragment:"",n.toneMapping!==Vi?Ww("toneMapping",n.toneMapping):"",n.dithering?"#define DITHERING":"",n.opaque?"#define OPAQUE":"",nt.colorspace_pars_fragment,Gw("linearToOutputTexel",n.outputColorSpace),jw(),n.useDepthPacking?"#define DEPTH_PACKING "+n.depthPacking:"",`
`].filter(pa).join(`
`)),o=Bf(o),o=Ag(o,n),o=Cg(o,n),a=Bf(a),a=Ag(a,n),a=Cg(a,n),o=Rg(o),a=Rg(a),n.isRawShaderMaterial!==!0&&(x=`#version 300 es
`,g=[d,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+g,p=["#define varying in",n.glslVersion===Sf?"":"layout(location = 0) out highp vec4 pc_fragColor;",n.glslVersion===Sf?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+p);let y=x+g+o,v=x+p+a,b=wg(r,r.VERTEX_SHADER,y),M=wg(r,r.FRAGMENT_SHADER,v);r.attachShader(_,b),r.attachShader(_,M),n.index0AttributeName!==void 0?r.bindAttribLocation(_,0,n.index0AttributeName):n.morphTargets===!0&&r.bindAttribLocation(_,0,"position"),r.linkProgram(_);function A(P){if(t.debug.checkShaderErrors){let z=r.getProgramInfoLog(_)||"",U=r.getShaderInfoLog(b)||"",O=r.getShaderInfoLog(M)||"",D=z.trim(),V=U.trim(),Q=O.trim(),j=!0,ae=!0;if(r.getProgramParameter(_,r.LINK_STATUS)===!1)if(j=!1,typeof t.debug.onShaderError=="function")t.debug.onShaderError(r,_,b,M);else{let ye=Tg(r,b,"vertex"),Z=Tg(r,M,"fragment");console.error("THREE.WebGLProgram: Shader Error "+r.getError()+" - VALIDATE_STATUS "+r.getProgramParameter(_,r.VALIDATE_STATUS)+`

Material Name: `+P.name+`
Material Type: `+P.type+`

Program Info Log: `+D+`
`+ye+`
`+Z)}else D!==""?console.warn("THREE.WebGLProgram: Program Info Log:",D):(V===""||Q==="")&&(ae=!1);ae&&(P.diagnostics={runnable:j,programLog:D,vertexShader:{log:V,prefix:g},fragmentShader:{log:Q,prefix:p}})}r.deleteShader(b),r.deleteShader(M),C=new qs(r,_),T=$w(r,_)}let C;this.getUniforms=function(){return C===void 0&&A(this),C};let T;this.getAttributes=function(){return T===void 0&&A(this),T};let w=n.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return w===!1&&(w=r.getProgramParameter(_,kw)),w},this.destroy=function(){i.releaseStatesOfProgram(this),r.deleteProgram(_),this.program=void 0},this.type=n.shaderType,this.name=n.shaderName,this.id=Bw++,this.cacheKey=e,this.usedTimes=1,this.program=_,this.vertexShader=b,this.fragmentShader=M,this}var oE=0,Vf=class{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e){let n=e.vertexShader,i=e.fragmentShader,r=this._getShaderStage(n),s=this._getShaderStage(i),o=this._getShaderCacheForMaterial(e);return o.has(r)===!1&&(o.add(r),r.usedTimes++),o.has(s)===!1&&(o.add(s),s.usedTimes++),this}remove(e){let n=this.materialCache.get(e);for(let i of n)i.usedTimes--,i.usedTimes===0&&this.shaderCache.delete(i.code);return this.materialCache.delete(e),this}getVertexShaderID(e){return this._getShaderStage(e.vertexShader).id}getFragmentShaderID(e){return this._getShaderStage(e.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){let n=this.materialCache,i=n.get(e);return i===void 0&&(i=new Set,n.set(e,i)),i}_getShaderStage(e){let n=this.shaderCache,i=n.get(e);return i===void 0&&(i=new Hf(e),n.set(e,i)),i}},Hf=class{constructor(e){this.id=oE++,this.code=e,this.usedTimes=0}};function aE(t,e,n,i,r,s,o){let a=new Is,c=new Vf,l=new Set,u=[],h=r.logarithmicDepthBuffer,f=r.vertexTextures,d=r.precision,m={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function _(T){return l.add(T),T===0?"uv":`uv${T}`}function g(T,w,P,z,U){let O=z.fog,D=U.geometry,V=T.isMeshStandardMaterial?z.environment:null,Q=(T.isMeshStandardMaterial?n:e).get(T.envMap||V),j=Q&&Q.mapping===ca?Q.image.height:null,ae=m[T.type];T.precision!==null&&(d=r.getMaxPrecision(T.precision),d!==T.precision&&console.warn("THREE.WebGLProgram.getParameters:",T.precision,"not supported, using",d,"instead."));let ye=D.morphAttributes.position||D.morphAttributes.normal||D.morphAttributes.color,Z=ye!==void 0?ye.length:0,re=0;D.morphAttributes.position!==void 0&&(re=1),D.morphAttributes.normal!==void 0&&(re=2),D.morphAttributes.color!==void 0&&(re=3);let me,Ge,Ne,X;if(ae){let at=Mi[ae];me=at.vertexShader,Ge=at.fragmentShader}else me=T.vertexShader,Ge=T.fragmentShader,c.update(T),Ne=c.getVertexShaderID(T),X=c.getFragmentShaderID(T);let ee=t.getRenderTarget(),be=t.state.buffers.depth.getReversed(),je=U.isInstancedMesh===!0,Le=U.isBatchedMesh===!0,it=!!T.map,Nt=!!T.matcap,N=!!Q,wt=!!T.aoMap,$e=!!T.lightMap,We=!!T.bumpMap,Ee=!!T.normalMap,xt=!!T.displacementMap,Ae=!!T.emissiveMap,Ze=!!T.metalnessMap,zt=!!T.roughnessMap,It=T.anisotropy>0,I=T.clearcoat>0,S=T.dispersion>0,G=T.iridescence>0,J=T.sheen>0,se=T.transmission>0,K=It&&!!T.anisotropyMap,Re=I&&!!T.clearcoatMap,fe=I&&!!T.clearcoatNormalMap,Se=I&&!!T.clearcoatRoughnessMap,Pe=G&&!!T.iridescenceMap,le=G&&!!T.iridescenceThicknessMap,ge=J&&!!T.sheenColorMap,Be=J&&!!T.sheenRoughnessMap,Ie=!!T.specularMap,_e=!!T.specularColorMap,Ye=!!T.specularIntensityMap,B=se&&!!T.transmissionMap,ce=se&&!!T.thicknessMap,de=!!T.gradientMap,we=!!T.alphaMap,oe=T.alphaTest>0,te=!!T.alphaHash,Te=!!T.extensions,Xe=Vi;T.toneMapped&&(ee===null||ee.isXRRenderTarget===!0)&&(Xe=t.toneMapping);let vt={shaderID:ae,shaderType:T.type,shaderName:T.name,vertexShader:me,fragmentShader:Ge,defines:T.defines,customVertexShaderID:Ne,customFragmentShaderID:X,isRawShaderMaterial:T.isRawShaderMaterial===!0,glslVersion:T.glslVersion,precision:d,batching:Le,batchingColor:Le&&U._colorsTexture!==null,instancing:je,instancingColor:je&&U.instanceColor!==null,instancingMorph:je&&U.morphTexture!==null,supportsVertexTextures:f,outputColorSpace:ee===null?t.outputColorSpace:ee.isXRRenderTarget===!0?ee.texture.colorSpace:Or,alphaToCoverage:!!T.alphaToCoverage,map:it,matcap:Nt,envMap:N,envMapMode:N&&Q.mapping,envMapCubeUVHeight:j,aoMap:wt,lightMap:$e,bumpMap:We,normalMap:Ee,displacementMap:f&&xt,emissiveMap:Ae,normalMapObjectSpace:Ee&&T.normalMapType===Jm,normalMapTangentSpace:Ee&&T.normalMapType===nh,metalnessMap:Ze,roughnessMap:zt,anisotropy:It,anisotropyMap:K,clearcoat:I,clearcoatMap:Re,clearcoatNormalMap:fe,clearcoatRoughnessMap:Se,dispersion:S,iridescence:G,iridescenceMap:Pe,iridescenceThicknessMap:le,sheen:J,sheenColorMap:ge,sheenRoughnessMap:Be,specularMap:Ie,specularColorMap:_e,specularIntensityMap:Ye,transmission:se,transmissionMap:B,thicknessMap:ce,gradientMap:de,opaque:T.transparent===!1&&T.blending===Dr&&T.alphaToCoverage===!1,alphaMap:we,alphaTest:oe,alphaHash:te,combine:T.combine,mapUv:it&&_(T.map.channel),aoMapUv:wt&&_(T.aoMap.channel),lightMapUv:$e&&_(T.lightMap.channel),bumpMapUv:We&&_(T.bumpMap.channel),normalMapUv:Ee&&_(T.normalMap.channel),displacementMapUv:xt&&_(T.displacementMap.channel),emissiveMapUv:Ae&&_(T.emissiveMap.channel),metalnessMapUv:Ze&&_(T.metalnessMap.channel),roughnessMapUv:zt&&_(T.roughnessMap.channel),anisotropyMapUv:K&&_(T.anisotropyMap.channel),clearcoatMapUv:Re&&_(T.clearcoatMap.channel),clearcoatNormalMapUv:fe&&_(T.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:Se&&_(T.clearcoatRoughnessMap.channel),iridescenceMapUv:Pe&&_(T.iridescenceMap.channel),iridescenceThicknessMapUv:le&&_(T.iridescenceThicknessMap.channel),sheenColorMapUv:ge&&_(T.sheenColorMap.channel),sheenRoughnessMapUv:Be&&_(T.sheenRoughnessMap.channel),specularMapUv:Ie&&_(T.specularMap.channel),specularColorMapUv:_e&&_(T.specularColorMap.channel),specularIntensityMapUv:Ye&&_(T.specularIntensityMap.channel),transmissionMapUv:B&&_(T.transmissionMap.channel),thicknessMapUv:ce&&_(T.thicknessMap.channel),alphaMapUv:we&&_(T.alphaMap.channel),vertexTangents:!!D.attributes.tangent&&(Ee||It),vertexColors:T.vertexColors,vertexAlphas:T.vertexColors===!0&&!!D.attributes.color&&D.attributes.color.itemSize===4,pointsUvs:U.isPoints===!0&&!!D.attributes.uv&&(it||we),fog:!!O,useFog:T.fog===!0,fogExp2:!!O&&O.isFogExp2,flatShading:T.flatShading===!0&&T.wireframe===!1,sizeAttenuation:T.sizeAttenuation===!0,logarithmicDepthBuffer:h,reversedDepthBuffer:be,skinning:U.isSkinnedMesh===!0,morphTargets:D.morphAttributes.position!==void 0,morphNormals:D.morphAttributes.normal!==void 0,morphColors:D.morphAttributes.color!==void 0,morphTargetsCount:Z,morphTextureStride:re,numDirLights:w.directional.length,numPointLights:w.point.length,numSpotLights:w.spot.length,numSpotLightMaps:w.spotLightMap.length,numRectAreaLights:w.rectArea.length,numHemiLights:w.hemi.length,numDirLightShadows:w.directionalShadowMap.length,numPointLightShadows:w.pointShadowMap.length,numSpotLightShadows:w.spotShadowMap.length,numSpotLightShadowsWithMaps:w.numSpotLightShadowsWithMaps,numLightProbes:w.numLightProbes,numClippingPlanes:o.numPlanes,numClipIntersection:o.numIntersection,dithering:T.dithering,shadowMapEnabled:t.shadowMap.enabled&&P.length>0,shadowMapType:t.shadowMap.type,toneMapping:Xe,decodeVideoTexture:it&&T.map.isVideoTexture===!0&&st.getTransfer(T.map.colorSpace)===lt,decodeVideoTextureEmissive:Ae&&T.emissiveMap.isVideoTexture===!0&&st.getTransfer(T.emissiveMap.colorSpace)===lt,premultipliedAlpha:T.premultipliedAlpha,doubleSided:T.side===xi,flipSided:T.side===Kt,useDepthPacking:T.depthPacking>=0,depthPacking:T.depthPacking||0,index0AttributeName:T.index0AttributeName,extensionClipCullDistance:Te&&T.extensions.clipCullDistance===!0&&i.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(Te&&T.extensions.multiDraw===!0||Le)&&i.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:i.has("KHR_parallel_shader_compile"),customProgramCacheKey:T.customProgramCacheKey()};return vt.vertexUv1s=l.has(1),vt.vertexUv2s=l.has(2),vt.vertexUv3s=l.has(3),l.clear(),vt}function p(T){let w=[];if(T.shaderID?w.push(T.shaderID):(w.push(T.customVertexShaderID),w.push(T.customFragmentShaderID)),T.defines!==void 0)for(let P in T.defines)w.push(P),w.push(T.defines[P]);return T.isRawShaderMaterial===!1&&(x(w,T),y(w,T),w.push(t.outputColorSpace)),w.push(T.customProgramCacheKey),w.join()}function x(T,w){T.push(w.precision),T.push(w.outputColorSpace),T.push(w.envMapMode),T.push(w.envMapCubeUVHeight),T.push(w.mapUv),T.push(w.alphaMapUv),T.push(w.lightMapUv),T.push(w.aoMapUv),T.push(w.bumpMapUv),T.push(w.normalMapUv),T.push(w.displacementMapUv),T.push(w.emissiveMapUv),T.push(w.metalnessMapUv),T.push(w.roughnessMapUv),T.push(w.anisotropyMapUv),T.push(w.clearcoatMapUv),T.push(w.clearcoatNormalMapUv),T.push(w.clearcoatRoughnessMapUv),T.push(w.iridescenceMapUv),T.push(w.iridescenceThicknessMapUv),T.push(w.sheenColorMapUv),T.push(w.sheenRoughnessMapUv),T.push(w.specularMapUv),T.push(w.specularColorMapUv),T.push(w.specularIntensityMapUv),T.push(w.transmissionMapUv),T.push(w.thicknessMapUv),T.push(w.combine),T.push(w.fogExp2),T.push(w.sizeAttenuation),T.push(w.morphTargetsCount),T.push(w.morphAttributeCount),T.push(w.numDirLights),T.push(w.numPointLights),T.push(w.numSpotLights),T.push(w.numSpotLightMaps),T.push(w.numHemiLights),T.push(w.numRectAreaLights),T.push(w.numDirLightShadows),T.push(w.numPointLightShadows),T.push(w.numSpotLightShadows),T.push(w.numSpotLightShadowsWithMaps),T.push(w.numLightProbes),T.push(w.shadowMapType),T.push(w.toneMapping),T.push(w.numClippingPlanes),T.push(w.numClipIntersection),T.push(w.depthPacking)}function y(T,w){a.disableAll(),w.supportsVertexTextures&&a.enable(0),w.instancing&&a.enable(1),w.instancingColor&&a.enable(2),w.instancingMorph&&a.enable(3),w.matcap&&a.enable(4),w.envMap&&a.enable(5),w.normalMapObjectSpace&&a.enable(6),w.normalMapTangentSpace&&a.enable(7),w.clearcoat&&a.enable(8),w.iridescence&&a.enable(9),w.alphaTest&&a.enable(10),w.vertexColors&&a.enable(11),w.vertexAlphas&&a.enable(12),w.vertexUv1s&&a.enable(13),w.vertexUv2s&&a.enable(14),w.vertexUv3s&&a.enable(15),w.vertexTangents&&a.enable(16),w.anisotropy&&a.enable(17),w.alphaHash&&a.enable(18),w.batching&&a.enable(19),w.dispersion&&a.enable(20),w.batchingColor&&a.enable(21),w.gradientMap&&a.enable(22),T.push(a.mask),a.disableAll(),w.fog&&a.enable(0),w.useFog&&a.enable(1),w.flatShading&&a.enable(2),w.logarithmicDepthBuffer&&a.enable(3),w.reversedDepthBuffer&&a.enable(4),w.skinning&&a.enable(5),w.morphTargets&&a.enable(6),w.morphNormals&&a.enable(7),w.morphColors&&a.enable(8),w.premultipliedAlpha&&a.enable(9),w.shadowMapEnabled&&a.enable(10),w.doubleSided&&a.enable(11),w.flipSided&&a.enable(12),w.useDepthPacking&&a.enable(13),w.dithering&&a.enable(14),w.transmission&&a.enable(15),w.sheen&&a.enable(16),w.opaque&&a.enable(17),w.pointsUvs&&a.enable(18),w.decodeVideoTexture&&a.enable(19),w.decodeVideoTextureEmissive&&a.enable(20),w.alphaToCoverage&&a.enable(21),T.push(a.mask)}function v(T){let w=m[T.type],P;if(w){let z=Mi[w];P=Gi.clone(z.uniforms)}else P=T.uniforms;return P}function b(T,w){let P;for(let z=0,U=u.length;z<U;z++){let O=u[z];if(O.cacheKey===w){P=O,++P.usedTimes;break}}return P===void 0&&(P=new sE(t,w,T,s),u.push(P)),P}function M(T){if(--T.usedTimes===0){let w=u.indexOf(T);u[w]=u[u.length-1],u.pop(),T.destroy()}}function A(T){c.remove(T)}function C(){c.dispose()}return{getParameters:g,getProgramCacheKey:p,getUniforms:v,acquireProgram:b,releaseProgram:M,releaseShaderCache:A,programs:u,dispose:C}}function cE(){let t=new WeakMap;function e(o){return t.has(o)}function n(o){let a=t.get(o);return a===void 0&&(a={},t.set(o,a)),a}function i(o){t.delete(o)}function r(o,a,c){t.get(o)[a]=c}function s(){t=new WeakMap}return{has:e,get:n,remove:i,update:r,dispose:s}}function lE(t,e){return t.groupOrder!==e.groupOrder?t.groupOrder-e.groupOrder:t.renderOrder!==e.renderOrder?t.renderOrder-e.renderOrder:t.material.id!==e.material.id?t.material.id-e.material.id:t.z!==e.z?t.z-e.z:t.id-e.id}function Ig(t,e){return t.groupOrder!==e.groupOrder?t.groupOrder-e.groupOrder:t.renderOrder!==e.renderOrder?t.renderOrder-e.renderOrder:t.z!==e.z?e.z-t.z:t.id-e.id}function Dg(){let t=[],e=0,n=[],i=[],r=[];function s(){e=0,n.length=0,i.length=0,r.length=0}function o(h,f,d,m,_,g){let p=t[e];return p===void 0?(p={id:h.id,object:h,geometry:f,material:d,groupOrder:m,renderOrder:h.renderOrder,z:_,group:g},t[e]=p):(p.id=h.id,p.object=h,p.geometry=f,p.material=d,p.groupOrder=m,p.renderOrder=h.renderOrder,p.z=_,p.group=g),e++,p}function a(h,f,d,m,_,g){let p=o(h,f,d,m,_,g);d.transmission>0?i.push(p):d.transparent===!0?r.push(p):n.push(p)}function c(h,f,d,m,_,g){let p=o(h,f,d,m,_,g);d.transmission>0?i.unshift(p):d.transparent===!0?r.unshift(p):n.unshift(p)}function l(h,f){n.length>1&&n.sort(h||lE),i.length>1&&i.sort(f||Ig),r.length>1&&r.sort(f||Ig)}function u(){for(let h=e,f=t.length;h<f;h++){let d=t[h];if(d.id===null)break;d.id=null,d.object=null,d.geometry=null,d.material=null,d.group=null}}return{opaque:n,transmissive:i,transparent:r,init:s,push:a,unshift:c,finish:u,sort:l}}function hE(){let t=new WeakMap;function e(i,r){let s=t.get(i),o;return s===void 0?(o=new Dg,t.set(i,[o])):r>=s.length?(o=new Dg,s.push(o)):o=s[r],o}function n(){t=new WeakMap}return{get:e,dispose:n}}function uE(){let t={};return{get:function(e){if(t[e.id]!==void 0)return t[e.id];let n;switch(e.type){case"DirectionalLight":n={direction:new R,color:new Fe};break;case"SpotLight":n={position:new R,direction:new R,color:new Fe,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":n={position:new R,color:new Fe,distance:0,decay:0};break;case"HemisphereLight":n={direction:new R,skyColor:new Fe,groundColor:new Fe};break;case"RectAreaLight":n={color:new Fe,position:new R,halfWidth:new R,halfHeight:new R};break}return t[e.id]=n,n}}}function fE(){let t={};return{get:function(e){if(t[e.id]!==void 0)return t[e.id];let n;switch(e.type){case"DirectionalLight":n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ie};break;case"SpotLight":n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ie};break;case"PointLight":n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ie,shadowCameraNear:1,shadowCameraFar:1e3};break}return t[e.id]=n,n}}}var dE=0;function pE(t,e){return(e.castShadow?2:0)-(t.castShadow?2:0)+(e.map?1:0)-(t.map?1:0)}function mE(t){let e=new uE,n=fE(),i={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let l=0;l<9;l++)i.probe.push(new R);let r=new R,s=new qe,o=new qe;function a(l){let u=0,h=0,f=0;for(let T=0;T<9;T++)i.probe[T].set(0,0,0);let d=0,m=0,_=0,g=0,p=0,x=0,y=0,v=0,b=0,M=0,A=0;l.sort(pE);for(let T=0,w=l.length;T<w;T++){let P=l[T],z=P.color,U=P.intensity,O=P.distance,D=P.shadow&&P.shadow.map?P.shadow.map.texture:null;if(P.isAmbientLight)u+=z.r*U,h+=z.g*U,f+=z.b*U;else if(P.isLightProbe){for(let V=0;V<9;V++)i.probe[V].addScaledVector(P.sh.coefficients[V],U);A++}else if(P.isDirectionalLight){let V=e.get(P);if(V.color.copy(P.color).multiplyScalar(P.intensity),P.castShadow){let Q=P.shadow,j=n.get(P);j.shadowIntensity=Q.intensity,j.shadowBias=Q.bias,j.shadowNormalBias=Q.normalBias,j.shadowRadius=Q.radius,j.shadowMapSize=Q.mapSize,i.directionalShadow[d]=j,i.directionalShadowMap[d]=D,i.directionalShadowMatrix[d]=P.shadow.matrix,x++}i.directional[d]=V,d++}else if(P.isSpotLight){let V=e.get(P);V.position.setFromMatrixPosition(P.matrixWorld),V.color.copy(z).multiplyScalar(U),V.distance=O,V.coneCos=Math.cos(P.angle),V.penumbraCos=Math.cos(P.angle*(1-P.penumbra)),V.decay=P.decay,i.spot[_]=V;let Q=P.shadow;if(P.map&&(i.spotLightMap[b]=P.map,b++,Q.updateMatrices(P),P.castShadow&&M++),i.spotLightMatrix[_]=Q.matrix,P.castShadow){let j=n.get(P);j.shadowIntensity=Q.intensity,j.shadowBias=Q.bias,j.shadowNormalBias=Q.normalBias,j.shadowRadius=Q.radius,j.shadowMapSize=Q.mapSize,i.spotShadow[_]=j,i.spotShadowMap[_]=D,v++}_++}else if(P.isRectAreaLight){let V=e.get(P);V.color.copy(z).multiplyScalar(U),V.halfWidth.set(P.width*.5,0,0),V.halfHeight.set(0,P.height*.5,0),i.rectArea[g]=V,g++}else if(P.isPointLight){let V=e.get(P);if(V.color.copy(P.color).multiplyScalar(P.intensity),V.distance=P.distance,V.decay=P.decay,P.castShadow){let Q=P.shadow,j=n.get(P);j.shadowIntensity=Q.intensity,j.shadowBias=Q.bias,j.shadowNormalBias=Q.normalBias,j.shadowRadius=Q.radius,j.shadowMapSize=Q.mapSize,j.shadowCameraNear=Q.camera.near,j.shadowCameraFar=Q.camera.far,i.pointShadow[m]=j,i.pointShadowMap[m]=D,i.pointShadowMatrix[m]=P.shadow.matrix,y++}i.point[m]=V,m++}else if(P.isHemisphereLight){let V=e.get(P);V.skyColor.copy(P.color).multiplyScalar(U),V.groundColor.copy(P.groundColor).multiplyScalar(U),i.hemi[p]=V,p++}}g>0&&(t.has("OES_texture_float_linear")===!0?(i.rectAreaLTC1=ve.LTC_FLOAT_1,i.rectAreaLTC2=ve.LTC_FLOAT_2):(i.rectAreaLTC1=ve.LTC_HALF_1,i.rectAreaLTC2=ve.LTC_HALF_2)),i.ambient[0]=u,i.ambient[1]=h,i.ambient[2]=f;let C=i.hash;(C.directionalLength!==d||C.pointLength!==m||C.spotLength!==_||C.rectAreaLength!==g||C.hemiLength!==p||C.numDirectionalShadows!==x||C.numPointShadows!==y||C.numSpotShadows!==v||C.numSpotMaps!==b||C.numLightProbes!==A)&&(i.directional.length=d,i.spot.length=_,i.rectArea.length=g,i.point.length=m,i.hemi.length=p,i.directionalShadow.length=x,i.directionalShadowMap.length=x,i.pointShadow.length=y,i.pointShadowMap.length=y,i.spotShadow.length=v,i.spotShadowMap.length=v,i.directionalShadowMatrix.length=x,i.pointShadowMatrix.length=y,i.spotLightMatrix.length=v+b-M,i.spotLightMap.length=b,i.numSpotLightShadowsWithMaps=M,i.numLightProbes=A,C.directionalLength=d,C.pointLength=m,C.spotLength=_,C.rectAreaLength=g,C.hemiLength=p,C.numDirectionalShadows=x,C.numPointShadows=y,C.numSpotShadows=v,C.numSpotMaps=b,C.numLightProbes=A,i.version=dE++)}function c(l,u){let h=0,f=0,d=0,m=0,_=0,g=u.matrixWorldInverse;for(let p=0,x=l.length;p<x;p++){let y=l[p];if(y.isDirectionalLight){let v=i.directional[h];v.direction.setFromMatrixPosition(y.matrixWorld),r.setFromMatrixPosition(y.target.matrixWorld),v.direction.sub(r),v.direction.transformDirection(g),h++}else if(y.isSpotLight){let v=i.spot[d];v.position.setFromMatrixPosition(y.matrixWorld),v.position.applyMatrix4(g),v.direction.setFromMatrixPosition(y.matrixWorld),r.setFromMatrixPosition(y.target.matrixWorld),v.direction.sub(r),v.direction.transformDirection(g),d++}else if(y.isRectAreaLight){let v=i.rectArea[m];v.position.setFromMatrixPosition(y.matrixWorld),v.position.applyMatrix4(g),o.identity(),s.copy(y.matrixWorld),s.premultiply(g),o.extractRotation(s),v.halfWidth.set(y.width*.5,0,0),v.halfHeight.set(0,y.height*.5,0),v.halfWidth.applyMatrix4(o),v.halfHeight.applyMatrix4(o),m++}else if(y.isPointLight){let v=i.point[f];v.position.setFromMatrixPosition(y.matrixWorld),v.position.applyMatrix4(g),f++}else if(y.isHemisphereLight){let v=i.hemi[_];v.direction.setFromMatrixPosition(y.matrixWorld),v.direction.transformDirection(g),_++}}}return{setup:a,setupView:c,state:i}}function Lg(t){let e=new mE(t),n=[],i=[];function r(u){l.camera=u,n.length=0,i.length=0}function s(u){n.push(u)}function o(u){i.push(u)}function a(){e.setup(n)}function c(u){e.setupView(n,u)}let l={lightsArray:n,shadowsArray:i,camera:null,lights:e,transmissionRenderTarget:{}};return{init:r,state:l,setupLights:a,setupLightsView:c,pushLight:s,pushShadow:o}}function gE(t){let e=new WeakMap;function n(r,s=0){let o=e.get(r),a;return o===void 0?(a=new Lg(t),e.set(r,[a])):s>=o.length?(a=new Lg(t),o.push(a)):a=o[s],a}function i(){e=new WeakMap}return{get:n,dispose:i}}var _E=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,vE=`uniform sampler2D shadow_pass;
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
}`;function yE(t,e,n){let i=new Os,r=new ie,s=new ie,o=new mt,a=new jc({depthPacking:Km}),c=new qc,l={},u=n.maxTextureSize,h={[Ui]:Kt,[Kt]:Ui,[xi]:xi},f=new Bt({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new ie},radius:{value:4}},vertexShader:_E,fragmentShader:vE}),d=f.clone();d.defines.HORIZONTAL_PASS=1;let m=new Mt;m.setAttribute("position",new nn(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let _=new Ct(m,f),g=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=hf;let p=this.type;this.render=function(M,A,C){if(g.enabled===!1||g.autoUpdate===!1&&g.needsUpdate===!1||M.length===0)return;let T=t.getRenderTarget(),w=t.getActiveCubeFace(),P=t.getActiveMipmapLevel(),z=t.state;z.setBlending(si),z.buffers.depth.getReversed()===!0?z.buffers.color.setClear(0,0,0,0):z.buffers.color.setClear(1,1,1,1),z.buffers.depth.setTest(!0),z.setScissorTest(!1);let U=p!==yi&&this.type===yi,O=p===yi&&this.type!==yi;for(let D=0,V=M.length;D<V;D++){let Q=M[D],j=Q.shadow;if(j===void 0){console.warn("THREE.WebGLShadowMap:",Q,"has no shadow.");continue}if(j.autoUpdate===!1&&j.needsUpdate===!1)continue;r.copy(j.mapSize);let ae=j.getFrameExtents();if(r.multiply(ae),s.copy(j.mapSize),(r.x>u||r.y>u)&&(r.x>u&&(s.x=Math.floor(u/ae.x),r.x=s.x*ae.x,j.mapSize.x=s.x),r.y>u&&(s.y=Math.floor(u/ae.y),r.y=s.y*ae.y,j.mapSize.y=s.y)),j.map===null||U===!0||O===!0){let Z=this.type!==yi?{minFilter:Vn,magFilter:Vn}:{};j.map!==null&&j.map.dispose(),j.map=new rn(r.x,r.y,Z),j.map.texture.name=Q.name+".shadowMap",j.camera.updateProjectionMatrix()}t.setRenderTarget(j.map),t.clear();let ye=j.getViewportCount();for(let Z=0;Z<ye;Z++){let re=j.getViewport(Z);o.set(s.x*re.x,s.y*re.y,s.x*re.z,s.y*re.w),z.viewport(o),j.updateMatrices(Q,Z),i=j.getFrustum(),v(A,C,j.camera,Q,this.type)}j.isPointLightShadow!==!0&&this.type===yi&&x(j,C),j.needsUpdate=!1}p=this.type,g.needsUpdate=!1,t.setRenderTarget(T,w,P)};function x(M,A){let C=e.update(_);f.defines.VSM_SAMPLES!==M.blurSamples&&(f.defines.VSM_SAMPLES=M.blurSamples,d.defines.VSM_SAMPLES=M.blurSamples,f.needsUpdate=!0,d.needsUpdate=!0),M.mapPass===null&&(M.mapPass=new rn(r.x,r.y)),f.uniforms.shadow_pass.value=M.map.texture,f.uniforms.resolution.value=M.mapSize,f.uniforms.radius.value=M.radius,t.setRenderTarget(M.mapPass),t.clear(),t.renderBufferDirect(A,null,C,f,_,null),d.uniforms.shadow_pass.value=M.mapPass.texture,d.uniforms.resolution.value=M.mapSize,d.uniforms.radius.value=M.radius,t.setRenderTarget(M.map),t.clear(),t.renderBufferDirect(A,null,C,d,_,null)}function y(M,A,C,T){let w=null,P=C.isPointLight===!0?M.customDistanceMaterial:M.customDepthMaterial;if(P!==void 0)w=P;else if(w=C.isPointLight===!0?c:a,t.localClippingEnabled&&A.clipShadows===!0&&Array.isArray(A.clippingPlanes)&&A.clippingPlanes.length!==0||A.displacementMap&&A.displacementScale!==0||A.alphaMap&&A.alphaTest>0||A.map&&A.alphaTest>0||A.alphaToCoverage===!0){let z=w.uuid,U=A.uuid,O=l[z];O===void 0&&(O={},l[z]=O);let D=O[U];D===void 0&&(D=w.clone(),O[U]=D,A.addEventListener("dispose",b)),w=D}if(w.visible=A.visible,w.wireframe=A.wireframe,T===yi?w.side=A.shadowSide!==null?A.shadowSide:A.side:w.side=A.shadowSide!==null?A.shadowSide:h[A.side],w.alphaMap=A.alphaMap,w.alphaTest=A.alphaToCoverage===!0?.5:A.alphaTest,w.map=A.map,w.clipShadows=A.clipShadows,w.clippingPlanes=A.clippingPlanes,w.clipIntersection=A.clipIntersection,w.displacementMap=A.displacementMap,w.displacementScale=A.displacementScale,w.displacementBias=A.displacementBias,w.wireframeLinewidth=A.wireframeLinewidth,w.linewidth=A.linewidth,C.isPointLight===!0&&w.isMeshDistanceMaterial===!0){let z=t.properties.get(w);z.light=C}return w}function v(M,A,C,T,w){if(M.visible===!1)return;if(M.layers.test(A.layers)&&(M.isMesh||M.isLine||M.isPoints)&&(M.castShadow||M.receiveShadow&&w===yi)&&(!M.frustumCulled||i.intersectsObject(M))){M.modelViewMatrix.multiplyMatrices(C.matrixWorldInverse,M.matrixWorld);let U=e.update(M),O=M.material;if(Array.isArray(O)){let D=U.groups;for(let V=0,Q=D.length;V<Q;V++){let j=D[V],ae=O[j.materialIndex];if(ae&&ae.visible){let ye=y(M,ae,T,w);M.onBeforeShadow(t,M,A,C,U,ye,j),t.renderBufferDirect(C,null,U,ye,M,j),M.onAfterShadow(t,M,A,C,U,ye,j)}}}else if(O.visible){let D=y(M,O,T,w);M.onBeforeShadow(t,M,A,C,U,D,null),t.renderBufferDirect(C,null,U,D,M,null),M.onAfterShadow(t,M,A,C,U,D,null)}}let z=M.children;for(let U=0,O=z.length;U<O;U++)v(z[U],A,C,T,w)}function b(M){M.target.removeEventListener("dispose",b);for(let C in l){let T=l[C],w=M.target.uuid;w in T&&(T[w].dispose(),delete T[w])}}}var xE={[rl]:sl,[ol]:ll,[al]:hl,[Lr]:cl,[sl]:rl,[ll]:ol,[hl]:al,[cl]:Lr};function bE(t,e){function n(){let B=!1,ce=new mt,de=null,we=new mt(0,0,0,0);return{setMask:function(oe){de!==oe&&!B&&(t.colorMask(oe,oe,oe,oe),de=oe)},setLocked:function(oe){B=oe},setClear:function(oe,te,Te,Xe,vt){vt===!0&&(oe*=Xe,te*=Xe,Te*=Xe),ce.set(oe,te,Te,Xe),we.equals(ce)===!1&&(t.clearColor(oe,te,Te,Xe),we.copy(ce))},reset:function(){B=!1,de=null,we.set(-1,0,0,0)}}}function i(){let B=!1,ce=!1,de=null,we=null,oe=null;return{setReversed:function(te){if(ce!==te){let Te=e.get("EXT_clip_control");te?Te.clipControlEXT(Te.LOWER_LEFT_EXT,Te.ZERO_TO_ONE_EXT):Te.clipControlEXT(Te.LOWER_LEFT_EXT,Te.NEGATIVE_ONE_TO_ONE_EXT),ce=te;let Xe=oe;oe=null,this.setClear(Xe)}},getReversed:function(){return ce},setTest:function(te){te?ee(t.DEPTH_TEST):be(t.DEPTH_TEST)},setMask:function(te){de!==te&&!B&&(t.depthMask(te),de=te)},setFunc:function(te){if(ce&&(te=xE[te]),we!==te){switch(te){case rl:t.depthFunc(t.NEVER);break;case sl:t.depthFunc(t.ALWAYS);break;case ol:t.depthFunc(t.LESS);break;case Lr:t.depthFunc(t.LEQUAL);break;case al:t.depthFunc(t.EQUAL);break;case cl:t.depthFunc(t.GEQUAL);break;case ll:t.depthFunc(t.GREATER);break;case hl:t.depthFunc(t.NOTEQUAL);break;default:t.depthFunc(t.LEQUAL)}we=te}},setLocked:function(te){B=te},setClear:function(te){oe!==te&&(ce&&(te=1-te),t.clearDepth(te),oe=te)},reset:function(){B=!1,de=null,we=null,oe=null,ce=!1}}}function r(){let B=!1,ce=null,de=null,we=null,oe=null,te=null,Te=null,Xe=null,vt=null;return{setTest:function(at){B||(at?ee(t.STENCIL_TEST):be(t.STENCIL_TEST))},setMask:function(at){ce!==at&&!B&&(t.stencilMask(at),ce=at)},setFunc:function(at,Un,Sn){(de!==at||we!==Un||oe!==Sn)&&(t.stencilFunc(at,Un,Sn),de=at,we=Un,oe=Sn)},setOp:function(at,Un,Sn){(te!==at||Te!==Un||Xe!==Sn)&&(t.stencilOp(at,Un,Sn),te=at,Te=Un,Xe=Sn)},setLocked:function(at){B=at},setClear:function(at){vt!==at&&(t.clearStencil(at),vt=at)},reset:function(){B=!1,ce=null,de=null,we=null,oe=null,te=null,Te=null,Xe=null,vt=null}}}let s=new n,o=new i,a=new r,c=new WeakMap,l=new WeakMap,u={},h={},f=new WeakMap,d=[],m=null,_=!1,g=null,p=null,x=null,y=null,v=null,b=null,M=null,A=new Fe(0,0,0),C=0,T=!1,w=null,P=null,z=null,U=null,O=null,D=t.getParameter(t.MAX_COMBINED_TEXTURE_IMAGE_UNITS),V=!1,Q=0,j=t.getParameter(t.VERSION);j.indexOf("WebGL")!==-1?(Q=parseFloat(/^WebGL (\d)/.exec(j)[1]),V=Q>=1):j.indexOf("OpenGL ES")!==-1&&(Q=parseFloat(/^OpenGL ES (\d)/.exec(j)[1]),V=Q>=2);let ae=null,ye={},Z=t.getParameter(t.SCISSOR_BOX),re=t.getParameter(t.VIEWPORT),me=new mt().fromArray(Z),Ge=new mt().fromArray(re);function Ne(B,ce,de,we){let oe=new Uint8Array(4),te=t.createTexture();t.bindTexture(B,te),t.texParameteri(B,t.TEXTURE_MIN_FILTER,t.NEAREST),t.texParameteri(B,t.TEXTURE_MAG_FILTER,t.NEAREST);for(let Te=0;Te<de;Te++)B===t.TEXTURE_3D||B===t.TEXTURE_2D_ARRAY?t.texImage3D(ce,0,t.RGBA,1,1,we,0,t.RGBA,t.UNSIGNED_BYTE,oe):t.texImage2D(ce+Te,0,t.RGBA,1,1,0,t.RGBA,t.UNSIGNED_BYTE,oe);return te}let X={};X[t.TEXTURE_2D]=Ne(t.TEXTURE_2D,t.TEXTURE_2D,1),X[t.TEXTURE_CUBE_MAP]=Ne(t.TEXTURE_CUBE_MAP,t.TEXTURE_CUBE_MAP_POSITIVE_X,6),X[t.TEXTURE_2D_ARRAY]=Ne(t.TEXTURE_2D_ARRAY,t.TEXTURE_2D_ARRAY,1,1),X[t.TEXTURE_3D]=Ne(t.TEXTURE_3D,t.TEXTURE_3D,1,1),s.setClear(0,0,0,1),o.setClear(1),a.setClear(0),ee(t.DEPTH_TEST),o.setFunc(Lr),We(!1),Ee(lf),ee(t.CULL_FACE),wt(si);function ee(B){u[B]!==!0&&(t.enable(B),u[B]=!0)}function be(B){u[B]!==!1&&(t.disable(B),u[B]=!1)}function je(B,ce){return h[B]!==ce?(t.bindFramebuffer(B,ce),h[B]=ce,B===t.DRAW_FRAMEBUFFER&&(h[t.FRAMEBUFFER]=ce),B===t.FRAMEBUFFER&&(h[t.DRAW_FRAMEBUFFER]=ce),!0):!1}function Le(B,ce){let de=d,we=!1;if(B){de=f.get(ce),de===void 0&&(de=[],f.set(ce,de));let oe=B.textures;if(de.length!==oe.length||de[0]!==t.COLOR_ATTACHMENT0){for(let te=0,Te=oe.length;te<Te;te++)de[te]=t.COLOR_ATTACHMENT0+te;de.length=oe.length,we=!0}}else de[0]!==t.BACK&&(de[0]=t.BACK,we=!0);we&&t.drawBuffers(de)}function it(B){return m!==B?(t.useProgram(B),m=B,!0):!1}let Nt={[rr]:t.FUNC_ADD,[Pm]:t.FUNC_SUBTRACT,[Im]:t.FUNC_REVERSE_SUBTRACT};Nt[Dm]=t.MIN,Nt[Lm]=t.MAX;let N={[Om]:t.ZERO,[Nm]:t.ONE,[Fm]:t.SRC_COLOR,[Sc]:t.SRC_ALPHA,[Hm]:t.SRC_ALPHA_SATURATE,[Bm]:t.DST_COLOR,[zm]:t.DST_ALPHA,[Um]:t.ONE_MINUS_SRC_COLOR,[wc]:t.ONE_MINUS_SRC_ALPHA,[Vm]:t.ONE_MINUS_DST_COLOR,[km]:t.ONE_MINUS_DST_ALPHA,[Gm]:t.CONSTANT_COLOR,[Wm]:t.ONE_MINUS_CONSTANT_COLOR,[jm]:t.CONSTANT_ALPHA,[qm]:t.ONE_MINUS_CONSTANT_ALPHA};function wt(B,ce,de,we,oe,te,Te,Xe,vt,at){if(B===si){_===!0&&(be(t.BLEND),_=!1);return}if(_===!1&&(ee(t.BLEND),_=!0),B!==Rm){if(B!==g||at!==T){if((p!==rr||v!==rr)&&(t.blendEquation(t.FUNC_ADD),p=rr,v=rr),at)switch(B){case Dr:t.blendFuncSeparate(t.ONE,t.ONE_MINUS_SRC_ALPHA,t.ONE,t.ONE_MINUS_SRC_ALPHA);break;case ar:t.blendFunc(t.ONE,t.ONE);break;case uf:t.blendFuncSeparate(t.ZERO,t.ONE_MINUS_SRC_COLOR,t.ZERO,t.ONE);break;case ff:t.blendFuncSeparate(t.DST_COLOR,t.ONE_MINUS_SRC_ALPHA,t.ZERO,t.ONE);break;default:console.error("THREE.WebGLState: Invalid blending: ",B);break}else switch(B){case Dr:t.blendFuncSeparate(t.SRC_ALPHA,t.ONE_MINUS_SRC_ALPHA,t.ONE,t.ONE_MINUS_SRC_ALPHA);break;case ar:t.blendFuncSeparate(t.SRC_ALPHA,t.ONE,t.ONE,t.ONE);break;case uf:console.error("THREE.WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case ff:console.error("THREE.WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:console.error("THREE.WebGLState: Invalid blending: ",B);break}x=null,y=null,b=null,M=null,A.set(0,0,0),C=0,g=B,T=at}return}oe=oe||ce,te=te||de,Te=Te||we,(ce!==p||oe!==v)&&(t.blendEquationSeparate(Nt[ce],Nt[oe]),p=ce,v=oe),(de!==x||we!==y||te!==b||Te!==M)&&(t.blendFuncSeparate(N[de],N[we],N[te],N[Te]),x=de,y=we,b=te,M=Te),(Xe.equals(A)===!1||vt!==C)&&(t.blendColor(Xe.r,Xe.g,Xe.b,vt),A.copy(Xe),C=vt),g=B,T=!1}function $e(B,ce){B.side===xi?be(t.CULL_FACE):ee(t.CULL_FACE);let de=B.side===Kt;ce&&(de=!de),We(de),B.blending===Dr&&B.transparent===!1?wt(si):wt(B.blending,B.blendEquation,B.blendSrc,B.blendDst,B.blendEquationAlpha,B.blendSrcAlpha,B.blendDstAlpha,B.blendColor,B.blendAlpha,B.premultipliedAlpha),o.setFunc(B.depthFunc),o.setTest(B.depthTest),o.setMask(B.depthWrite),s.setMask(B.colorWrite);let we=B.stencilWrite;a.setTest(we),we&&(a.setMask(B.stencilWriteMask),a.setFunc(B.stencilFunc,B.stencilRef,B.stencilFuncMask),a.setOp(B.stencilFail,B.stencilZFail,B.stencilZPass)),Ae(B.polygonOffset,B.polygonOffsetFactor,B.polygonOffsetUnits),B.alphaToCoverage===!0?ee(t.SAMPLE_ALPHA_TO_COVERAGE):be(t.SAMPLE_ALPHA_TO_COVERAGE)}function We(B){w!==B&&(B?t.frontFace(t.CW):t.frontFace(t.CCW),w=B)}function Ee(B){B!==Tm?(ee(t.CULL_FACE),B!==P&&(B===lf?t.cullFace(t.BACK):B===Am?t.cullFace(t.FRONT):t.cullFace(t.FRONT_AND_BACK))):be(t.CULL_FACE),P=B}function xt(B){B!==z&&(V&&t.lineWidth(B),z=B)}function Ae(B,ce,de){B?(ee(t.POLYGON_OFFSET_FILL),(U!==ce||O!==de)&&(t.polygonOffset(ce,de),U=ce,O=de)):be(t.POLYGON_OFFSET_FILL)}function Ze(B){B?ee(t.SCISSOR_TEST):be(t.SCISSOR_TEST)}function zt(B){B===void 0&&(B=t.TEXTURE0+D-1),ae!==B&&(t.activeTexture(B),ae=B)}function It(B,ce,de){de===void 0&&(ae===null?de=t.TEXTURE0+D-1:de=ae);let we=ye[de];we===void 0&&(we={type:void 0,texture:void 0},ye[de]=we),(we.type!==B||we.texture!==ce)&&(ae!==de&&(t.activeTexture(de),ae=de),t.bindTexture(B,ce||X[B]),we.type=B,we.texture=ce)}function I(){let B=ye[ae];B!==void 0&&B.type!==void 0&&(t.bindTexture(B.type,null),B.type=void 0,B.texture=void 0)}function S(){try{t.compressedTexImage2D(...arguments)}catch(B){console.error("THREE.WebGLState:",B)}}function G(){try{t.compressedTexImage3D(...arguments)}catch(B){console.error("THREE.WebGLState:",B)}}function J(){try{t.texSubImage2D(...arguments)}catch(B){console.error("THREE.WebGLState:",B)}}function se(){try{t.texSubImage3D(...arguments)}catch(B){console.error("THREE.WebGLState:",B)}}function K(){try{t.compressedTexSubImage2D(...arguments)}catch(B){console.error("THREE.WebGLState:",B)}}function Re(){try{t.compressedTexSubImage3D(...arguments)}catch(B){console.error("THREE.WebGLState:",B)}}function fe(){try{t.texStorage2D(...arguments)}catch(B){console.error("THREE.WebGLState:",B)}}function Se(){try{t.texStorage3D(...arguments)}catch(B){console.error("THREE.WebGLState:",B)}}function Pe(){try{t.texImage2D(...arguments)}catch(B){console.error("THREE.WebGLState:",B)}}function le(){try{t.texImage3D(...arguments)}catch(B){console.error("THREE.WebGLState:",B)}}function ge(B){me.equals(B)===!1&&(t.scissor(B.x,B.y,B.z,B.w),me.copy(B))}function Be(B){Ge.equals(B)===!1&&(t.viewport(B.x,B.y,B.z,B.w),Ge.copy(B))}function Ie(B,ce){let de=l.get(ce);de===void 0&&(de=new WeakMap,l.set(ce,de));let we=de.get(B);we===void 0&&(we=t.getUniformBlockIndex(ce,B.name),de.set(B,we))}function _e(B,ce){let we=l.get(ce).get(B);c.get(ce)!==we&&(t.uniformBlockBinding(ce,we,B.__bindingPointIndex),c.set(ce,we))}function Ye(){t.disable(t.BLEND),t.disable(t.CULL_FACE),t.disable(t.DEPTH_TEST),t.disable(t.POLYGON_OFFSET_FILL),t.disable(t.SCISSOR_TEST),t.disable(t.STENCIL_TEST),t.disable(t.SAMPLE_ALPHA_TO_COVERAGE),t.blendEquation(t.FUNC_ADD),t.blendFunc(t.ONE,t.ZERO),t.blendFuncSeparate(t.ONE,t.ZERO,t.ONE,t.ZERO),t.blendColor(0,0,0,0),t.colorMask(!0,!0,!0,!0),t.clearColor(0,0,0,0),t.depthMask(!0),t.depthFunc(t.LESS),o.setReversed(!1),t.clearDepth(1),t.stencilMask(4294967295),t.stencilFunc(t.ALWAYS,0,4294967295),t.stencilOp(t.KEEP,t.KEEP,t.KEEP),t.clearStencil(0),t.cullFace(t.BACK),t.frontFace(t.CCW),t.polygonOffset(0,0),t.activeTexture(t.TEXTURE0),t.bindFramebuffer(t.FRAMEBUFFER,null),t.bindFramebuffer(t.DRAW_FRAMEBUFFER,null),t.bindFramebuffer(t.READ_FRAMEBUFFER,null),t.useProgram(null),t.lineWidth(1),t.scissor(0,0,t.canvas.width,t.canvas.height),t.viewport(0,0,t.canvas.width,t.canvas.height),u={},ae=null,ye={},h={},f=new WeakMap,d=[],m=null,_=!1,g=null,p=null,x=null,y=null,v=null,b=null,M=null,A=new Fe(0,0,0),C=0,T=!1,w=null,P=null,z=null,U=null,O=null,me.set(0,0,t.canvas.width,t.canvas.height),Ge.set(0,0,t.canvas.width,t.canvas.height),s.reset(),o.reset(),a.reset()}return{buffers:{color:s,depth:o,stencil:a},enable:ee,disable:be,bindFramebuffer:je,drawBuffers:Le,useProgram:it,setBlending:wt,setMaterial:$e,setFlipSided:We,setCullFace:Ee,setLineWidth:xt,setPolygonOffset:Ae,setScissorTest:Ze,activeTexture:zt,bindTexture:It,unbindTexture:I,compressedTexImage2D:S,compressedTexImage3D:G,texImage2D:Pe,texImage3D:le,updateUBOMapping:Ie,uniformBlockBinding:_e,texStorage2D:fe,texStorage3D:Se,texSubImage2D:J,texSubImage3D:se,compressedTexSubImage2D:K,compressedTexSubImage3D:Re,scissor:ge,viewport:Be,reset:Ye}}function ME(t,e,n,i,r,s,o){let a=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,c=typeof navigator=="undefined"?!1:/OculusBrowser/g.test(navigator.userAgent),l=new ie,u=new WeakMap,h,f=new WeakMap,d=!1;try{d=typeof OffscreenCanvas!="undefined"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch(I){}function m(I,S){return d?new OffscreenCanvas(I,S):Cs("canvas")}function _(I,S,G){let J=1,se=It(I);if((se.width>G||se.height>G)&&(J=G/Math.max(se.width,se.height)),J<1)if(typeof HTMLImageElement!="undefined"&&I instanceof HTMLImageElement||typeof HTMLCanvasElement!="undefined"&&I instanceof HTMLCanvasElement||typeof ImageBitmap!="undefined"&&I instanceof ImageBitmap||typeof VideoFrame!="undefined"&&I instanceof VideoFrame){let K=Math.floor(J*se.width),Re=Math.floor(J*se.height);h===void 0&&(h=m(K,Re));let fe=S?m(K,Re):h;return fe.width=K,fe.height=Re,fe.getContext("2d").drawImage(I,0,0,K,Re),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+se.width+"x"+se.height+") to ("+K+"x"+Re+")."),fe}else return"data"in I&&console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+se.width+"x"+se.height+")."),I;return I}function g(I){return I.generateMipmaps}function p(I){t.generateMipmap(I)}function x(I){return I.isWebGLCubeRenderTarget?t.TEXTURE_CUBE_MAP:I.isWebGL3DRenderTarget?t.TEXTURE_3D:I.isWebGLArrayRenderTarget||I.isCompressedArrayTexture?t.TEXTURE_2D_ARRAY:t.TEXTURE_2D}function y(I,S,G,J,se=!1){if(I!==null){if(t[I]!==void 0)return t[I];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+I+"'")}let K=S;if(S===t.RED&&(G===t.FLOAT&&(K=t.R32F),G===t.HALF_FLOAT&&(K=t.R16F),G===t.UNSIGNED_BYTE&&(K=t.R8)),S===t.RED_INTEGER&&(G===t.UNSIGNED_BYTE&&(K=t.R8UI),G===t.UNSIGNED_SHORT&&(K=t.R16UI),G===t.UNSIGNED_INT&&(K=t.R32UI),G===t.BYTE&&(K=t.R8I),G===t.SHORT&&(K=t.R16I),G===t.INT&&(K=t.R32I)),S===t.RG&&(G===t.FLOAT&&(K=t.RG32F),G===t.HALF_FLOAT&&(K=t.RG16F),G===t.UNSIGNED_BYTE&&(K=t.RG8)),S===t.RG_INTEGER&&(G===t.UNSIGNED_BYTE&&(K=t.RG8UI),G===t.UNSIGNED_SHORT&&(K=t.RG16UI),G===t.UNSIGNED_INT&&(K=t.RG32UI),G===t.BYTE&&(K=t.RG8I),G===t.SHORT&&(K=t.RG16I),G===t.INT&&(K=t.RG32I)),S===t.RGB_INTEGER&&(G===t.UNSIGNED_BYTE&&(K=t.RGB8UI),G===t.UNSIGNED_SHORT&&(K=t.RGB16UI),G===t.UNSIGNED_INT&&(K=t.RGB32UI),G===t.BYTE&&(K=t.RGB8I),G===t.SHORT&&(K=t.RGB16I),G===t.INT&&(K=t.RGB32I)),S===t.RGBA_INTEGER&&(G===t.UNSIGNED_BYTE&&(K=t.RGBA8UI),G===t.UNSIGNED_SHORT&&(K=t.RGBA16UI),G===t.UNSIGNED_INT&&(K=t.RGBA32UI),G===t.BYTE&&(K=t.RGBA8I),G===t.SHORT&&(K=t.RGBA16I),G===t.INT&&(K=t.RGBA32I)),S===t.RGB&&(G===t.UNSIGNED_INT_5_9_9_9_REV&&(K=t.RGB9_E5),G===t.UNSIGNED_INT_10F_11F_11F_REV&&(K=t.R11F_G11F_B10F)),S===t.RGBA){let Re=se?Oo:st.getTransfer(J);G===t.FLOAT&&(K=t.RGBA32F),G===t.HALF_FLOAT&&(K=t.RGBA16F),G===t.UNSIGNED_BYTE&&(K=Re===lt?t.SRGB8_ALPHA8:t.RGBA8),G===t.UNSIGNED_SHORT_4_4_4_4&&(K=t.RGBA4),G===t.UNSIGNED_SHORT_5_5_5_1&&(K=t.RGB5_A1)}return(K===t.R16F||K===t.R32F||K===t.RG16F||K===t.RG32F||K===t.RGBA16F||K===t.RGBA32F)&&e.get("EXT_color_buffer_float"),K}function v(I,S){let G;return I?S===null||S===lr||S===Hs?G=t.DEPTH24_STENCIL8:S===bi?G=t.DEPTH32F_STENCIL8:S===Vs&&(G=t.DEPTH24_STENCIL8,console.warn("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):S===null||S===lr||S===Hs?G=t.DEPTH_COMPONENT24:S===bi?G=t.DEPTH_COMPONENT32F:S===Vs&&(G=t.DEPTH_COMPONENT16),G}function b(I,S){return g(I)===!0||I.isFramebufferTexture&&I.minFilter!==Vn&&I.minFilter!==ii?Math.log2(Math.max(S.width,S.height))+1:I.mipmaps!==void 0&&I.mipmaps.length>0?I.mipmaps.length:I.isCompressedTexture&&Array.isArray(I.image)?S.mipmaps.length:1}function M(I){let S=I.target;S.removeEventListener("dispose",M),C(S),S.isVideoTexture&&u.delete(S)}function A(I){let S=I.target;S.removeEventListener("dispose",A),w(S)}function C(I){let S=i.get(I);if(S.__webglInit===void 0)return;let G=I.source,J=f.get(G);if(J){let se=J[S.__cacheKey];se.usedTimes--,se.usedTimes===0&&T(I),Object.keys(J).length===0&&f.delete(G)}i.remove(I)}function T(I){let S=i.get(I);t.deleteTexture(S.__webglTexture);let G=I.source,J=f.get(G);delete J[S.__cacheKey],o.memory.textures--}function w(I){let S=i.get(I);if(I.depthTexture&&(I.depthTexture.dispose(),i.remove(I.depthTexture)),I.isWebGLCubeRenderTarget)for(let J=0;J<6;J++){if(Array.isArray(S.__webglFramebuffer[J]))for(let se=0;se<S.__webglFramebuffer[J].length;se++)t.deleteFramebuffer(S.__webglFramebuffer[J][se]);else t.deleteFramebuffer(S.__webglFramebuffer[J]);S.__webglDepthbuffer&&t.deleteRenderbuffer(S.__webglDepthbuffer[J])}else{if(Array.isArray(S.__webglFramebuffer))for(let J=0;J<S.__webglFramebuffer.length;J++)t.deleteFramebuffer(S.__webglFramebuffer[J]);else t.deleteFramebuffer(S.__webglFramebuffer);if(S.__webglDepthbuffer&&t.deleteRenderbuffer(S.__webglDepthbuffer),S.__webglMultisampledFramebuffer&&t.deleteFramebuffer(S.__webglMultisampledFramebuffer),S.__webglColorRenderbuffer)for(let J=0;J<S.__webglColorRenderbuffer.length;J++)S.__webglColorRenderbuffer[J]&&t.deleteRenderbuffer(S.__webglColorRenderbuffer[J]);S.__webglDepthRenderbuffer&&t.deleteRenderbuffer(S.__webglDepthRenderbuffer)}let G=I.textures;for(let J=0,se=G.length;J<se;J++){let K=i.get(G[J]);K.__webglTexture&&(t.deleteTexture(K.__webglTexture),o.memory.textures--),i.remove(G[J])}i.remove(I)}let P=0;function z(){P=0}function U(){let I=P;return I>=r.maxTextures&&console.warn("THREE.WebGLTextures: Trying to use "+I+" texture units while this GPU supports only "+r.maxTextures),P+=1,I}function O(I){let S=[];return S.push(I.wrapS),S.push(I.wrapT),S.push(I.wrapR||0),S.push(I.magFilter),S.push(I.minFilter),S.push(I.anisotropy),S.push(I.internalFormat),S.push(I.format),S.push(I.type),S.push(I.generateMipmaps),S.push(I.premultiplyAlpha),S.push(I.flipY),S.push(I.unpackAlignment),S.push(I.colorSpace),S.join()}function D(I,S){let G=i.get(I);if(I.isVideoTexture&&Ze(I),I.isRenderTargetTexture===!1&&I.isExternalTexture!==!0&&I.version>0&&G.__version!==I.version){let J=I.image;if(J===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if(J.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{X(G,I,S);return}}else I.isExternalTexture&&(G.__webglTexture=I.sourceTexture?I.sourceTexture:null);n.bindTexture(t.TEXTURE_2D,G.__webglTexture,t.TEXTURE0+S)}function V(I,S){let G=i.get(I);if(I.isRenderTargetTexture===!1&&I.version>0&&G.__version!==I.version){X(G,I,S);return}n.bindTexture(t.TEXTURE_2D_ARRAY,G.__webglTexture,t.TEXTURE0+S)}function Q(I,S){let G=i.get(I);if(I.isRenderTargetTexture===!1&&I.version>0&&G.__version!==I.version){X(G,I,S);return}n.bindTexture(t.TEXTURE_3D,G.__webglTexture,t.TEXTURE0+S)}function j(I,S){let G=i.get(I);if(I.version>0&&G.__version!==I.version){ee(G,I,S);return}n.bindTexture(t.TEXTURE_CUBE_MAP,G.__webglTexture,t.TEXTURE0+S)}let ae={[Ec]:t.REPEAT,[ir]:t.CLAMP_TO_EDGE,[Tc]:t.MIRRORED_REPEAT},ye={[Vn]:t.NEAREST,[Ym]:t.NEAREST_MIPMAP_NEAREST,[la]:t.NEAREST_MIPMAP_LINEAR,[ii]:t.LINEAR,[bl]:t.LINEAR_MIPMAP_NEAREST,[cr]:t.LINEAR_MIPMAP_LINEAR},Z={[Qm]:t.NEVER,[sg]:t.ALWAYS,[eg]:t.LESS,[Mf]:t.LEQUAL,[tg]:t.EQUAL,[rg]:t.GEQUAL,[ng]:t.GREATER,[ig]:t.NOTEQUAL};function re(I,S){if(S.type===bi&&e.has("OES_texture_float_linear")===!1&&(S.magFilter===ii||S.magFilter===bl||S.magFilter===la||S.magFilter===cr||S.minFilter===ii||S.minFilter===bl||S.minFilter===la||S.minFilter===cr)&&console.warn("THREE.WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),t.texParameteri(I,t.TEXTURE_WRAP_S,ae[S.wrapS]),t.texParameteri(I,t.TEXTURE_WRAP_T,ae[S.wrapT]),(I===t.TEXTURE_3D||I===t.TEXTURE_2D_ARRAY)&&t.texParameteri(I,t.TEXTURE_WRAP_R,ae[S.wrapR]),t.texParameteri(I,t.TEXTURE_MAG_FILTER,ye[S.magFilter]),t.texParameteri(I,t.TEXTURE_MIN_FILTER,ye[S.minFilter]),S.compareFunction&&(t.texParameteri(I,t.TEXTURE_COMPARE_MODE,t.COMPARE_REF_TO_TEXTURE),t.texParameteri(I,t.TEXTURE_COMPARE_FUNC,Z[S.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(S.magFilter===Vn||S.minFilter!==la&&S.minFilter!==cr||S.type===bi&&e.has("OES_texture_float_linear")===!1)return;if(S.anisotropy>1||i.get(S).__currentAnisotropy){let G=e.get("EXT_texture_filter_anisotropic");t.texParameterf(I,G.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(S.anisotropy,r.getMaxAnisotropy())),i.get(S).__currentAnisotropy=S.anisotropy}}}function me(I,S){let G=!1;I.__webglInit===void 0&&(I.__webglInit=!0,S.addEventListener("dispose",M));let J=S.source,se=f.get(J);se===void 0&&(se={},f.set(J,se));let K=O(S);if(K!==I.__cacheKey){se[K]===void 0&&(se[K]={texture:t.createTexture(),usedTimes:0},o.memory.textures++,G=!0),se[K].usedTimes++;let Re=se[I.__cacheKey];Re!==void 0&&(se[I.__cacheKey].usedTimes--,Re.usedTimes===0&&T(S)),I.__cacheKey=K,I.__webglTexture=se[K].texture}return G}function Ge(I,S,G){return Math.floor(Math.floor(I/G)/S)}function Ne(I,S,G,J){let K=I.updateRanges;if(K.length===0)n.texSubImage2D(t.TEXTURE_2D,0,0,0,S.width,S.height,G,J,S.data);else{K.sort((le,ge)=>le.start-ge.start);let Re=0;for(let le=1;le<K.length;le++){let ge=K[Re],Be=K[le],Ie=ge.start+ge.count,_e=Ge(Be.start,S.width,4),Ye=Ge(ge.start,S.width,4);Be.start<=Ie+1&&_e===Ye&&Ge(Be.start+Be.count-1,S.width,4)===_e?ge.count=Math.max(ge.count,Be.start+Be.count-ge.start):(++Re,K[Re]=Be)}K.length=Re+1;let fe=t.getParameter(t.UNPACK_ROW_LENGTH),Se=t.getParameter(t.UNPACK_SKIP_PIXELS),Pe=t.getParameter(t.UNPACK_SKIP_ROWS);t.pixelStorei(t.UNPACK_ROW_LENGTH,S.width);for(let le=0,ge=K.length;le<ge;le++){let Be=K[le],Ie=Math.floor(Be.start/4),_e=Math.ceil(Be.count/4),Ye=Ie%S.width,B=Math.floor(Ie/S.width),ce=_e,de=1;t.pixelStorei(t.UNPACK_SKIP_PIXELS,Ye),t.pixelStorei(t.UNPACK_SKIP_ROWS,B),n.texSubImage2D(t.TEXTURE_2D,0,Ye,B,ce,de,G,J,S.data)}I.clearUpdateRanges(),t.pixelStorei(t.UNPACK_ROW_LENGTH,fe),t.pixelStorei(t.UNPACK_SKIP_PIXELS,Se),t.pixelStorei(t.UNPACK_SKIP_ROWS,Pe)}}function X(I,S,G){let J=t.TEXTURE_2D;(S.isDataArrayTexture||S.isCompressedArrayTexture)&&(J=t.TEXTURE_2D_ARRAY),S.isData3DTexture&&(J=t.TEXTURE_3D);let se=me(I,S),K=S.source;n.bindTexture(J,I.__webglTexture,t.TEXTURE0+G);let Re=i.get(K);if(K.version!==Re.__version||se===!0){n.activeTexture(t.TEXTURE0+G);let fe=st.getPrimaries(st.workingColorSpace),Se=S.colorSpace===Hi?null:st.getPrimaries(S.colorSpace),Pe=S.colorSpace===Hi||fe===Se?t.NONE:t.BROWSER_DEFAULT_WEBGL;t.pixelStorei(t.UNPACK_FLIP_Y_WEBGL,S.flipY),t.pixelStorei(t.UNPACK_PREMULTIPLY_ALPHA_WEBGL,S.premultiplyAlpha),t.pixelStorei(t.UNPACK_ALIGNMENT,S.unpackAlignment),t.pixelStorei(t.UNPACK_COLORSPACE_CONVERSION_WEBGL,Pe);let le=_(S.image,!1,r.maxTextureSize);le=zt(S,le);let ge=s.convert(S.format,S.colorSpace),Be=s.convert(S.type),Ie=y(S.internalFormat,ge,Be,S.colorSpace,S.isVideoTexture);re(J,S);let _e,Ye=S.mipmaps,B=S.isVideoTexture!==!0,ce=Re.__version===void 0||se===!0,de=K.dataReady,we=b(S,le);if(S.isDepthTexture)Ie=v(S.format===Gs,S.type),ce&&(B?n.texStorage2D(t.TEXTURE_2D,1,Ie,le.width,le.height):n.texImage2D(t.TEXTURE_2D,0,Ie,le.width,le.height,0,ge,Be,null));else if(S.isDataTexture)if(Ye.length>0){B&&ce&&n.texStorage2D(t.TEXTURE_2D,we,Ie,Ye[0].width,Ye[0].height);for(let oe=0,te=Ye.length;oe<te;oe++)_e=Ye[oe],B?de&&n.texSubImage2D(t.TEXTURE_2D,oe,0,0,_e.width,_e.height,ge,Be,_e.data):n.texImage2D(t.TEXTURE_2D,oe,Ie,_e.width,_e.height,0,ge,Be,_e.data);S.generateMipmaps=!1}else B?(ce&&n.texStorage2D(t.TEXTURE_2D,we,Ie,le.width,le.height),de&&Ne(S,le,ge,Be)):n.texImage2D(t.TEXTURE_2D,0,Ie,le.width,le.height,0,ge,Be,le.data);else if(S.isCompressedTexture)if(S.isCompressedArrayTexture){B&&ce&&n.texStorage3D(t.TEXTURE_2D_ARRAY,we,Ie,Ye[0].width,Ye[0].height,le.depth);for(let oe=0,te=Ye.length;oe<te;oe++)if(_e=Ye[oe],S.format!==Xn)if(ge!==null)if(B){if(de)if(S.layerUpdates.size>0){let Te=Pf(_e.width,_e.height,S.format,S.type);for(let Xe of S.layerUpdates){let vt=_e.data.subarray(Xe*Te/_e.data.BYTES_PER_ELEMENT,(Xe+1)*Te/_e.data.BYTES_PER_ELEMENT);n.compressedTexSubImage3D(t.TEXTURE_2D_ARRAY,oe,0,0,Xe,_e.width,_e.height,1,ge,vt)}S.clearLayerUpdates()}else n.compressedTexSubImage3D(t.TEXTURE_2D_ARRAY,oe,0,0,0,_e.width,_e.height,le.depth,ge,_e.data)}else n.compressedTexImage3D(t.TEXTURE_2D_ARRAY,oe,Ie,_e.width,_e.height,le.depth,0,_e.data,0,0);else console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else B?de&&n.texSubImage3D(t.TEXTURE_2D_ARRAY,oe,0,0,0,_e.width,_e.height,le.depth,ge,Be,_e.data):n.texImage3D(t.TEXTURE_2D_ARRAY,oe,Ie,_e.width,_e.height,le.depth,0,ge,Be,_e.data)}else{B&&ce&&n.texStorage2D(t.TEXTURE_2D,we,Ie,Ye[0].width,Ye[0].height);for(let oe=0,te=Ye.length;oe<te;oe++)_e=Ye[oe],S.format!==Xn?ge!==null?B?de&&n.compressedTexSubImage2D(t.TEXTURE_2D,oe,0,0,_e.width,_e.height,ge,_e.data):n.compressedTexImage2D(t.TEXTURE_2D,oe,Ie,_e.width,_e.height,0,_e.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):B?de&&n.texSubImage2D(t.TEXTURE_2D,oe,0,0,_e.width,_e.height,ge,Be,_e.data):n.texImage2D(t.TEXTURE_2D,oe,Ie,_e.width,_e.height,0,ge,Be,_e.data)}else if(S.isDataArrayTexture)if(B){if(ce&&n.texStorage3D(t.TEXTURE_2D_ARRAY,we,Ie,le.width,le.height,le.depth),de)if(S.layerUpdates.size>0){let oe=Pf(le.width,le.height,S.format,S.type);for(let te of S.layerUpdates){let Te=le.data.subarray(te*oe/le.data.BYTES_PER_ELEMENT,(te+1)*oe/le.data.BYTES_PER_ELEMENT);n.texSubImage3D(t.TEXTURE_2D_ARRAY,0,0,0,te,le.width,le.height,1,ge,Be,Te)}S.clearLayerUpdates()}else n.texSubImage3D(t.TEXTURE_2D_ARRAY,0,0,0,0,le.width,le.height,le.depth,ge,Be,le.data)}else n.texImage3D(t.TEXTURE_2D_ARRAY,0,Ie,le.width,le.height,le.depth,0,ge,Be,le.data);else if(S.isData3DTexture)B?(ce&&n.texStorage3D(t.TEXTURE_3D,we,Ie,le.width,le.height,le.depth),de&&n.texSubImage3D(t.TEXTURE_3D,0,0,0,0,le.width,le.height,le.depth,ge,Be,le.data)):n.texImage3D(t.TEXTURE_3D,0,Ie,le.width,le.height,le.depth,0,ge,Be,le.data);else if(S.isFramebufferTexture){if(ce)if(B)n.texStorage2D(t.TEXTURE_2D,we,Ie,le.width,le.height);else{let oe=le.width,te=le.height;for(let Te=0;Te<we;Te++)n.texImage2D(t.TEXTURE_2D,Te,Ie,oe,te,0,ge,Be,null),oe>>=1,te>>=1}}else if(Ye.length>0){if(B&&ce){let oe=It(Ye[0]);n.texStorage2D(t.TEXTURE_2D,we,Ie,oe.width,oe.height)}for(let oe=0,te=Ye.length;oe<te;oe++)_e=Ye[oe],B?de&&n.texSubImage2D(t.TEXTURE_2D,oe,0,0,ge,Be,_e):n.texImage2D(t.TEXTURE_2D,oe,Ie,ge,Be,_e);S.generateMipmaps=!1}else if(B){if(ce){let oe=It(le);n.texStorage2D(t.TEXTURE_2D,we,Ie,oe.width,oe.height)}de&&n.texSubImage2D(t.TEXTURE_2D,0,0,0,ge,Be,le)}else n.texImage2D(t.TEXTURE_2D,0,Ie,ge,Be,le);g(S)&&p(J),Re.__version=K.version,S.onUpdate&&S.onUpdate(S)}I.__version=S.version}function ee(I,S,G){if(S.image.length!==6)return;let J=me(I,S),se=S.source;n.bindTexture(t.TEXTURE_CUBE_MAP,I.__webglTexture,t.TEXTURE0+G);let K=i.get(se);if(se.version!==K.__version||J===!0){n.activeTexture(t.TEXTURE0+G);let Re=st.getPrimaries(st.workingColorSpace),fe=S.colorSpace===Hi?null:st.getPrimaries(S.colorSpace),Se=S.colorSpace===Hi||Re===fe?t.NONE:t.BROWSER_DEFAULT_WEBGL;t.pixelStorei(t.UNPACK_FLIP_Y_WEBGL,S.flipY),t.pixelStorei(t.UNPACK_PREMULTIPLY_ALPHA_WEBGL,S.premultiplyAlpha),t.pixelStorei(t.UNPACK_ALIGNMENT,S.unpackAlignment),t.pixelStorei(t.UNPACK_COLORSPACE_CONVERSION_WEBGL,Se);let Pe=S.isCompressedTexture||S.image[0].isCompressedTexture,le=S.image[0]&&S.image[0].isDataTexture,ge=[];for(let te=0;te<6;te++)!Pe&&!le?ge[te]=_(S.image[te],!0,r.maxCubemapSize):ge[te]=le?S.image[te].image:S.image[te],ge[te]=zt(S,ge[te]);let Be=ge[0],Ie=s.convert(S.format,S.colorSpace),_e=s.convert(S.type),Ye=y(S.internalFormat,Ie,_e,S.colorSpace),B=S.isVideoTexture!==!0,ce=K.__version===void 0||J===!0,de=se.dataReady,we=b(S,Be);re(t.TEXTURE_CUBE_MAP,S);let oe;if(Pe){B&&ce&&n.texStorage2D(t.TEXTURE_CUBE_MAP,we,Ye,Be.width,Be.height);for(let te=0;te<6;te++){oe=ge[te].mipmaps;for(let Te=0;Te<oe.length;Te++){let Xe=oe[Te];S.format!==Xn?Ie!==null?B?de&&n.compressedTexSubImage2D(t.TEXTURE_CUBE_MAP_POSITIVE_X+te,Te,0,0,Xe.width,Xe.height,Ie,Xe.data):n.compressedTexImage2D(t.TEXTURE_CUBE_MAP_POSITIVE_X+te,Te,Ye,Xe.width,Xe.height,0,Xe.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):B?de&&n.texSubImage2D(t.TEXTURE_CUBE_MAP_POSITIVE_X+te,Te,0,0,Xe.width,Xe.height,Ie,_e,Xe.data):n.texImage2D(t.TEXTURE_CUBE_MAP_POSITIVE_X+te,Te,Ye,Xe.width,Xe.height,0,Ie,_e,Xe.data)}}}else{if(oe=S.mipmaps,B&&ce){oe.length>0&&we++;let te=It(ge[0]);n.texStorage2D(t.TEXTURE_CUBE_MAP,we,Ye,te.width,te.height)}for(let te=0;te<6;te++)if(le){B?de&&n.texSubImage2D(t.TEXTURE_CUBE_MAP_POSITIVE_X+te,0,0,0,ge[te].width,ge[te].height,Ie,_e,ge[te].data):n.texImage2D(t.TEXTURE_CUBE_MAP_POSITIVE_X+te,0,Ye,ge[te].width,ge[te].height,0,Ie,_e,ge[te].data);for(let Te=0;Te<oe.length;Te++){let vt=oe[Te].image[te].image;B?de&&n.texSubImage2D(t.TEXTURE_CUBE_MAP_POSITIVE_X+te,Te+1,0,0,vt.width,vt.height,Ie,_e,vt.data):n.texImage2D(t.TEXTURE_CUBE_MAP_POSITIVE_X+te,Te+1,Ye,vt.width,vt.height,0,Ie,_e,vt.data)}}else{B?de&&n.texSubImage2D(t.TEXTURE_CUBE_MAP_POSITIVE_X+te,0,0,0,Ie,_e,ge[te]):n.texImage2D(t.TEXTURE_CUBE_MAP_POSITIVE_X+te,0,Ye,Ie,_e,ge[te]);for(let Te=0;Te<oe.length;Te++){let Xe=oe[Te];B?de&&n.texSubImage2D(t.TEXTURE_CUBE_MAP_POSITIVE_X+te,Te+1,0,0,Ie,_e,Xe.image[te]):n.texImage2D(t.TEXTURE_CUBE_MAP_POSITIVE_X+te,Te+1,Ye,Ie,_e,Xe.image[te])}}}g(S)&&p(t.TEXTURE_CUBE_MAP),K.__version=se.version,S.onUpdate&&S.onUpdate(S)}I.__version=S.version}function be(I,S,G,J,se,K){let Re=s.convert(G.format,G.colorSpace),fe=s.convert(G.type),Se=y(G.internalFormat,Re,fe,G.colorSpace),Pe=i.get(S),le=i.get(G);if(le.__renderTarget=S,!Pe.__hasExternalTextures){let ge=Math.max(1,S.width>>K),Be=Math.max(1,S.height>>K);se===t.TEXTURE_3D||se===t.TEXTURE_2D_ARRAY?n.texImage3D(se,K,Se,ge,Be,S.depth,0,Re,fe,null):n.texImage2D(se,K,Se,ge,Be,0,Re,fe,null)}n.bindFramebuffer(t.FRAMEBUFFER,I),Ae(S)?a.framebufferTexture2DMultisampleEXT(t.FRAMEBUFFER,J,se,le.__webglTexture,0,xt(S)):(se===t.TEXTURE_2D||se>=t.TEXTURE_CUBE_MAP_POSITIVE_X&&se<=t.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&t.framebufferTexture2D(t.FRAMEBUFFER,J,se,le.__webglTexture,K),n.bindFramebuffer(t.FRAMEBUFFER,null)}function je(I,S,G){if(t.bindRenderbuffer(t.RENDERBUFFER,I),S.depthBuffer){let J=S.depthTexture,se=J&&J.isDepthTexture?J.type:null,K=v(S.stencilBuffer,se),Re=S.stencilBuffer?t.DEPTH_STENCIL_ATTACHMENT:t.DEPTH_ATTACHMENT,fe=xt(S);Ae(S)?a.renderbufferStorageMultisampleEXT(t.RENDERBUFFER,fe,K,S.width,S.height):G?t.renderbufferStorageMultisample(t.RENDERBUFFER,fe,K,S.width,S.height):t.renderbufferStorage(t.RENDERBUFFER,K,S.width,S.height),t.framebufferRenderbuffer(t.FRAMEBUFFER,Re,t.RENDERBUFFER,I)}else{let J=S.textures;for(let se=0;se<J.length;se++){let K=J[se],Re=s.convert(K.format,K.colorSpace),fe=s.convert(K.type),Se=y(K.internalFormat,Re,fe,K.colorSpace),Pe=xt(S);G&&Ae(S)===!1?t.renderbufferStorageMultisample(t.RENDERBUFFER,Pe,Se,S.width,S.height):Ae(S)?a.renderbufferStorageMultisampleEXT(t.RENDERBUFFER,Pe,Se,S.width,S.height):t.renderbufferStorage(t.RENDERBUFFER,Se,S.width,S.height)}}t.bindRenderbuffer(t.RENDERBUFFER,null)}function Le(I,S){if(S&&S.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(n.bindFramebuffer(t.FRAMEBUFFER,I),!(S.depthTexture&&S.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");let J=i.get(S.depthTexture);J.__renderTarget=S,(!J.__webglTexture||S.depthTexture.image.width!==S.width||S.depthTexture.image.height!==S.height)&&(S.depthTexture.image.width=S.width,S.depthTexture.image.height=S.height,S.depthTexture.needsUpdate=!0),D(S.depthTexture,0);let se=J.__webglTexture,K=xt(S);if(S.depthTexture.format===Ts)Ae(S)?a.framebufferTexture2DMultisampleEXT(t.FRAMEBUFFER,t.DEPTH_ATTACHMENT,t.TEXTURE_2D,se,0,K):t.framebufferTexture2D(t.FRAMEBUFFER,t.DEPTH_ATTACHMENT,t.TEXTURE_2D,se,0);else if(S.depthTexture.format===Gs)Ae(S)?a.framebufferTexture2DMultisampleEXT(t.FRAMEBUFFER,t.DEPTH_STENCIL_ATTACHMENT,t.TEXTURE_2D,se,0,K):t.framebufferTexture2D(t.FRAMEBUFFER,t.DEPTH_STENCIL_ATTACHMENT,t.TEXTURE_2D,se,0);else throw new Error("Unknown depthTexture format")}function it(I){let S=i.get(I),G=I.isWebGLCubeRenderTarget===!0;if(S.__boundDepthTexture!==I.depthTexture){let J=I.depthTexture;if(S.__depthDisposeCallback&&S.__depthDisposeCallback(),J){let se=()=>{delete S.__boundDepthTexture,delete S.__depthDisposeCallback,J.removeEventListener("dispose",se)};J.addEventListener("dispose",se),S.__depthDisposeCallback=se}S.__boundDepthTexture=J}if(I.depthTexture&&!S.__autoAllocateDepthBuffer){if(G)throw new Error("target.depthTexture not supported in Cube render targets");let J=I.texture.mipmaps;J&&J.length>0?Le(S.__webglFramebuffer[0],I):Le(S.__webglFramebuffer,I)}else if(G){S.__webglDepthbuffer=[];for(let J=0;J<6;J++)if(n.bindFramebuffer(t.FRAMEBUFFER,S.__webglFramebuffer[J]),S.__webglDepthbuffer[J]===void 0)S.__webglDepthbuffer[J]=t.createRenderbuffer(),je(S.__webglDepthbuffer[J],I,!1);else{let se=I.stencilBuffer?t.DEPTH_STENCIL_ATTACHMENT:t.DEPTH_ATTACHMENT,K=S.__webglDepthbuffer[J];t.bindRenderbuffer(t.RENDERBUFFER,K),t.framebufferRenderbuffer(t.FRAMEBUFFER,se,t.RENDERBUFFER,K)}}else{let J=I.texture.mipmaps;if(J&&J.length>0?n.bindFramebuffer(t.FRAMEBUFFER,S.__webglFramebuffer[0]):n.bindFramebuffer(t.FRAMEBUFFER,S.__webglFramebuffer),S.__webglDepthbuffer===void 0)S.__webglDepthbuffer=t.createRenderbuffer(),je(S.__webglDepthbuffer,I,!1);else{let se=I.stencilBuffer?t.DEPTH_STENCIL_ATTACHMENT:t.DEPTH_ATTACHMENT,K=S.__webglDepthbuffer;t.bindRenderbuffer(t.RENDERBUFFER,K),t.framebufferRenderbuffer(t.FRAMEBUFFER,se,t.RENDERBUFFER,K)}}n.bindFramebuffer(t.FRAMEBUFFER,null)}function Nt(I,S,G){let J=i.get(I);S!==void 0&&be(J.__webglFramebuffer,I,I.texture,t.COLOR_ATTACHMENT0,t.TEXTURE_2D,0),G!==void 0&&it(I)}function N(I){let S=I.texture,G=i.get(I),J=i.get(S);I.addEventListener("dispose",A);let se=I.textures,K=I.isWebGLCubeRenderTarget===!0,Re=se.length>1;if(Re||(J.__webglTexture===void 0&&(J.__webglTexture=t.createTexture()),J.__version=S.version,o.memory.textures++),K){G.__webglFramebuffer=[];for(let fe=0;fe<6;fe++)if(S.mipmaps&&S.mipmaps.length>0){G.__webglFramebuffer[fe]=[];for(let Se=0;Se<S.mipmaps.length;Se++)G.__webglFramebuffer[fe][Se]=t.createFramebuffer()}else G.__webglFramebuffer[fe]=t.createFramebuffer()}else{if(S.mipmaps&&S.mipmaps.length>0){G.__webglFramebuffer=[];for(let fe=0;fe<S.mipmaps.length;fe++)G.__webglFramebuffer[fe]=t.createFramebuffer()}else G.__webglFramebuffer=t.createFramebuffer();if(Re)for(let fe=0,Se=se.length;fe<Se;fe++){let Pe=i.get(se[fe]);Pe.__webglTexture===void 0&&(Pe.__webglTexture=t.createTexture(),o.memory.textures++)}if(I.samples>0&&Ae(I)===!1){G.__webglMultisampledFramebuffer=t.createFramebuffer(),G.__webglColorRenderbuffer=[],n.bindFramebuffer(t.FRAMEBUFFER,G.__webglMultisampledFramebuffer);for(let fe=0;fe<se.length;fe++){let Se=se[fe];G.__webglColorRenderbuffer[fe]=t.createRenderbuffer(),t.bindRenderbuffer(t.RENDERBUFFER,G.__webglColorRenderbuffer[fe]);let Pe=s.convert(Se.format,Se.colorSpace),le=s.convert(Se.type),ge=y(Se.internalFormat,Pe,le,Se.colorSpace,I.isXRRenderTarget===!0),Be=xt(I);t.renderbufferStorageMultisample(t.RENDERBUFFER,Be,ge,I.width,I.height),t.framebufferRenderbuffer(t.FRAMEBUFFER,t.COLOR_ATTACHMENT0+fe,t.RENDERBUFFER,G.__webglColorRenderbuffer[fe])}t.bindRenderbuffer(t.RENDERBUFFER,null),I.depthBuffer&&(G.__webglDepthRenderbuffer=t.createRenderbuffer(),je(G.__webglDepthRenderbuffer,I,!0)),n.bindFramebuffer(t.FRAMEBUFFER,null)}}if(K){n.bindTexture(t.TEXTURE_CUBE_MAP,J.__webglTexture),re(t.TEXTURE_CUBE_MAP,S);for(let fe=0;fe<6;fe++)if(S.mipmaps&&S.mipmaps.length>0)for(let Se=0;Se<S.mipmaps.length;Se++)be(G.__webglFramebuffer[fe][Se],I,S,t.COLOR_ATTACHMENT0,t.TEXTURE_CUBE_MAP_POSITIVE_X+fe,Se);else be(G.__webglFramebuffer[fe],I,S,t.COLOR_ATTACHMENT0,t.TEXTURE_CUBE_MAP_POSITIVE_X+fe,0);g(S)&&p(t.TEXTURE_CUBE_MAP),n.unbindTexture()}else if(Re){for(let fe=0,Se=se.length;fe<Se;fe++){let Pe=se[fe],le=i.get(Pe),ge=t.TEXTURE_2D;(I.isWebGL3DRenderTarget||I.isWebGLArrayRenderTarget)&&(ge=I.isWebGL3DRenderTarget?t.TEXTURE_3D:t.TEXTURE_2D_ARRAY),n.bindTexture(ge,le.__webglTexture),re(ge,Pe),be(G.__webglFramebuffer,I,Pe,t.COLOR_ATTACHMENT0+fe,ge,0),g(Pe)&&p(ge)}n.unbindTexture()}else{let fe=t.TEXTURE_2D;if((I.isWebGL3DRenderTarget||I.isWebGLArrayRenderTarget)&&(fe=I.isWebGL3DRenderTarget?t.TEXTURE_3D:t.TEXTURE_2D_ARRAY),n.bindTexture(fe,J.__webglTexture),re(fe,S),S.mipmaps&&S.mipmaps.length>0)for(let Se=0;Se<S.mipmaps.length;Se++)be(G.__webglFramebuffer[Se],I,S,t.COLOR_ATTACHMENT0,fe,Se);else be(G.__webglFramebuffer,I,S,t.COLOR_ATTACHMENT0,fe,0);g(S)&&p(fe),n.unbindTexture()}I.depthBuffer&&it(I)}function wt(I){let S=I.textures;for(let G=0,J=S.length;G<J;G++){let se=S[G];if(g(se)){let K=x(I),Re=i.get(se).__webglTexture;n.bindTexture(K,Re),p(K),n.unbindTexture()}}}let $e=[],We=[];function Ee(I){if(I.samples>0){if(Ae(I)===!1){let S=I.textures,G=I.width,J=I.height,se=t.COLOR_BUFFER_BIT,K=I.stencilBuffer?t.DEPTH_STENCIL_ATTACHMENT:t.DEPTH_ATTACHMENT,Re=i.get(I),fe=S.length>1;if(fe)for(let Pe=0;Pe<S.length;Pe++)n.bindFramebuffer(t.FRAMEBUFFER,Re.__webglMultisampledFramebuffer),t.framebufferRenderbuffer(t.FRAMEBUFFER,t.COLOR_ATTACHMENT0+Pe,t.RENDERBUFFER,null),n.bindFramebuffer(t.FRAMEBUFFER,Re.__webglFramebuffer),t.framebufferTexture2D(t.DRAW_FRAMEBUFFER,t.COLOR_ATTACHMENT0+Pe,t.TEXTURE_2D,null,0);n.bindFramebuffer(t.READ_FRAMEBUFFER,Re.__webglMultisampledFramebuffer);let Se=I.texture.mipmaps;Se&&Se.length>0?n.bindFramebuffer(t.DRAW_FRAMEBUFFER,Re.__webglFramebuffer[0]):n.bindFramebuffer(t.DRAW_FRAMEBUFFER,Re.__webglFramebuffer);for(let Pe=0;Pe<S.length;Pe++){if(I.resolveDepthBuffer&&(I.depthBuffer&&(se|=t.DEPTH_BUFFER_BIT),I.stencilBuffer&&I.resolveStencilBuffer&&(se|=t.STENCIL_BUFFER_BIT)),fe){t.framebufferRenderbuffer(t.READ_FRAMEBUFFER,t.COLOR_ATTACHMENT0,t.RENDERBUFFER,Re.__webglColorRenderbuffer[Pe]);let le=i.get(S[Pe]).__webglTexture;t.framebufferTexture2D(t.DRAW_FRAMEBUFFER,t.COLOR_ATTACHMENT0,t.TEXTURE_2D,le,0)}t.blitFramebuffer(0,0,G,J,0,0,G,J,se,t.NEAREST),c===!0&&($e.length=0,We.length=0,$e.push(t.COLOR_ATTACHMENT0+Pe),I.depthBuffer&&I.resolveDepthBuffer===!1&&($e.push(K),We.push(K),t.invalidateFramebuffer(t.DRAW_FRAMEBUFFER,We)),t.invalidateFramebuffer(t.READ_FRAMEBUFFER,$e))}if(n.bindFramebuffer(t.READ_FRAMEBUFFER,null),n.bindFramebuffer(t.DRAW_FRAMEBUFFER,null),fe)for(let Pe=0;Pe<S.length;Pe++){n.bindFramebuffer(t.FRAMEBUFFER,Re.__webglMultisampledFramebuffer),t.framebufferRenderbuffer(t.FRAMEBUFFER,t.COLOR_ATTACHMENT0+Pe,t.RENDERBUFFER,Re.__webglColorRenderbuffer[Pe]);let le=i.get(S[Pe]).__webglTexture;n.bindFramebuffer(t.FRAMEBUFFER,Re.__webglFramebuffer),t.framebufferTexture2D(t.DRAW_FRAMEBUFFER,t.COLOR_ATTACHMENT0+Pe,t.TEXTURE_2D,le,0)}n.bindFramebuffer(t.DRAW_FRAMEBUFFER,Re.__webglMultisampledFramebuffer)}else if(I.depthBuffer&&I.resolveDepthBuffer===!1&&c){let S=I.stencilBuffer?t.DEPTH_STENCIL_ATTACHMENT:t.DEPTH_ATTACHMENT;t.invalidateFramebuffer(t.DRAW_FRAMEBUFFER,[S])}}}function xt(I){return Math.min(r.maxSamples,I.samples)}function Ae(I){let S=i.get(I);return I.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&S.__useRenderToTexture!==!1}function Ze(I){let S=o.render.frame;u.get(I)!==S&&(u.set(I,S),I.update())}function zt(I,S){let G=I.colorSpace,J=I.format,se=I.type;return I.isCompressedTexture===!0||I.isVideoTexture===!0||G!==Or&&G!==Hi&&(st.getTransfer(G)===lt?(J!==Xn||se!==oi)&&console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):console.error("THREE.WebGLTextures: Unsupported texture color space:",G)),S}function It(I){return typeof HTMLImageElement!="undefined"&&I instanceof HTMLImageElement?(l.width=I.naturalWidth||I.width,l.height=I.naturalHeight||I.height):typeof VideoFrame!="undefined"&&I instanceof VideoFrame?(l.width=I.displayWidth,l.height=I.displayHeight):(l.width=I.width,l.height=I.height),l}this.allocateTextureUnit=U,this.resetTextureUnits=z,this.setTexture2D=D,this.setTexture2DArray=V,this.setTexture3D=Q,this.setTextureCube=j,this.rebindTextures=Nt,this.setupRenderTarget=N,this.updateRenderTargetMipmap=wt,this.updateMultisampleRenderTarget=Ee,this.setupDepthRenderbuffer=it,this.setupFrameBufferTexture=be,this.useMultisampledRTT=Ae}function SE(t,e){function n(i,r=Hi){let s,o=st.getTransfer(r);if(i===oi)return t.UNSIGNED_BYTE;if(i===Sl)return t.UNSIGNED_SHORT_4_4_4_4;if(i===wl)return t.UNSIGNED_SHORT_5_5_5_1;if(i===gf)return t.UNSIGNED_INT_5_9_9_9_REV;if(i===_f)return t.UNSIGNED_INT_10F_11F_11F_REV;if(i===pf)return t.BYTE;if(i===mf)return t.SHORT;if(i===Vs)return t.UNSIGNED_SHORT;if(i===Ml)return t.INT;if(i===lr)return t.UNSIGNED_INT;if(i===bi)return t.FLOAT;if(i===qn)return t.HALF_FLOAT;if(i===vf)return t.ALPHA;if(i===yf)return t.RGB;if(i===Xn)return t.RGBA;if(i===Ts)return t.DEPTH_COMPONENT;if(i===Gs)return t.DEPTH_STENCIL;if(i===xf)return t.RED;if(i===El)return t.RED_INTEGER;if(i===bf)return t.RG;if(i===Tl)return t.RG_INTEGER;if(i===Al)return t.RGBA_INTEGER;if(i===ha||i===ua||i===fa||i===da)if(o===lt)if(s=e.get("WEBGL_compressed_texture_s3tc_srgb"),s!==null){if(i===ha)return s.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(i===ua)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(i===fa)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(i===da)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(s=e.get("WEBGL_compressed_texture_s3tc"),s!==null){if(i===ha)return s.COMPRESSED_RGB_S3TC_DXT1_EXT;if(i===ua)return s.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(i===fa)return s.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(i===da)return s.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(i===Cl||i===Rl||i===Pl||i===Il)if(s=e.get("WEBGL_compressed_texture_pvrtc"),s!==null){if(i===Cl)return s.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(i===Rl)return s.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(i===Pl)return s.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(i===Il)return s.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(i===Dl||i===Ll||i===Ol)if(s=e.get("WEBGL_compressed_texture_etc"),s!==null){if(i===Dl||i===Ll)return o===lt?s.COMPRESSED_SRGB8_ETC2:s.COMPRESSED_RGB8_ETC2;if(i===Ol)return o===lt?s.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:s.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(i===Nl||i===Fl||i===Ul||i===zl||i===kl||i===Bl||i===Vl||i===Hl||i===Gl||i===Wl||i===jl||i===ql||i===Xl||i===$l)if(s=e.get("WEBGL_compressed_texture_astc"),s!==null){if(i===Nl)return o===lt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:s.COMPRESSED_RGBA_ASTC_4x4_KHR;if(i===Fl)return o===lt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:s.COMPRESSED_RGBA_ASTC_5x4_KHR;if(i===Ul)return o===lt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:s.COMPRESSED_RGBA_ASTC_5x5_KHR;if(i===zl)return o===lt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:s.COMPRESSED_RGBA_ASTC_6x5_KHR;if(i===kl)return o===lt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:s.COMPRESSED_RGBA_ASTC_6x6_KHR;if(i===Bl)return o===lt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:s.COMPRESSED_RGBA_ASTC_8x5_KHR;if(i===Vl)return o===lt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:s.COMPRESSED_RGBA_ASTC_8x6_KHR;if(i===Hl)return o===lt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:s.COMPRESSED_RGBA_ASTC_8x8_KHR;if(i===Gl)return o===lt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:s.COMPRESSED_RGBA_ASTC_10x5_KHR;if(i===Wl)return o===lt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:s.COMPRESSED_RGBA_ASTC_10x6_KHR;if(i===jl)return o===lt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:s.COMPRESSED_RGBA_ASTC_10x8_KHR;if(i===ql)return o===lt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:s.COMPRESSED_RGBA_ASTC_10x10_KHR;if(i===Xl)return o===lt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:s.COMPRESSED_RGBA_ASTC_12x10_KHR;if(i===$l)return o===lt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:s.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(i===Yl||i===Zl||i===Kl)if(s=e.get("EXT_texture_compression_bptc"),s!==null){if(i===Yl)return o===lt?s.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:s.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(i===Zl)return s.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(i===Kl)return s.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(i===Jl||i===Ql||i===eh||i===th)if(s=e.get("EXT_texture_compression_rgtc"),s!==null){if(i===Jl)return s.COMPRESSED_RED_RGTC1_EXT;if(i===Ql)return s.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(i===eh)return s.COMPRESSED_RED_GREEN_RGTC2_EXT;if(i===th)return s.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return i===Hs?t.UNSIGNED_INT_24_8:t[i]!==void 0?t[i]:null}return{convert:n}}var wE=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,EE=`
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

}`,Gf=class{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,n){if(this.texture===null){let i=new Xo(e.texture);(e.depthNear!==n.depthNear||e.depthFar!==n.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=i}}getMesh(e){if(this.texture!==null&&this.mesh===null){let n=e.cameras[0].viewport,i=new Bt({vertexShader:wE,fragmentShader:EE,uniforms:{depthColor:{value:this.texture},depthWidth:{value:n.z},depthHeight:{value:n.w}}});this.mesh=new Ct(new Yo(20,20),i)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}},Wf=class extends di{constructor(e,n){super();let i=this,r=null,s=1,o=null,a="local-floor",c=1,l=null,u=null,h=null,f=null,d=null,m=null,_=typeof XRWebGLBinding!="undefined",g=new Gf,p={},x=n.getContextAttributes(),y=null,v=null,b=[],M=[],A=new ie,C=null,T=new Zt;T.viewport=new mt;let w=new Zt;w.viewport=new mt;let P=[T,w],z=new il,U=null,O=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(X){let ee=b[X];return ee===void 0&&(ee=new Ls,b[X]=ee),ee.getTargetRaySpace()},this.getControllerGrip=function(X){let ee=b[X];return ee===void 0&&(ee=new Ls,b[X]=ee),ee.getGripSpace()},this.getHand=function(X){let ee=b[X];return ee===void 0&&(ee=new Ls,b[X]=ee),ee.getHandSpace()};function D(X){let ee=M.indexOf(X.inputSource);if(ee===-1)return;let be=b[ee];be!==void 0&&(be.update(X.inputSource,X.frame,l||o),be.dispatchEvent({type:X.type,data:X.inputSource}))}function V(){r.removeEventListener("select",D),r.removeEventListener("selectstart",D),r.removeEventListener("selectend",D),r.removeEventListener("squeeze",D),r.removeEventListener("squeezestart",D),r.removeEventListener("squeezeend",D),r.removeEventListener("end",V),r.removeEventListener("inputsourceschange",Q);for(let X=0;X<b.length;X++){let ee=M[X];ee!==null&&(M[X]=null,b[X].disconnect(ee))}U=null,O=null,g.reset();for(let X in p)delete p[X];e.setRenderTarget(y),d=null,f=null,h=null,r=null,v=null,Ne.stop(),i.isPresenting=!1,e.setPixelRatio(C),e.setSize(A.width,A.height,!1),i.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(X){s=X,i.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(X){a=X,i.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return l||o},this.setReferenceSpace=function(X){l=X},this.getBaseLayer=function(){return f!==null?f:d},this.getBinding=function(){return h===null&&_&&(h=new XRWebGLBinding(r,n)),h},this.getFrame=function(){return m},this.getSession=function(){return r},this.setSession=async function(X){if(r=X,r!==null){if(y=e.getRenderTarget(),r.addEventListener("select",D),r.addEventListener("selectstart",D),r.addEventListener("selectend",D),r.addEventListener("squeeze",D),r.addEventListener("squeezestart",D),r.addEventListener("squeezeend",D),r.addEventListener("end",V),r.addEventListener("inputsourceschange",Q),x.xrCompatible!==!0&&await n.makeXRCompatible(),C=e.getPixelRatio(),e.getSize(A),_&&"createProjectionLayer"in XRWebGLBinding.prototype){let be=null,je=null,Le=null;x.depth&&(Le=x.stencil?n.DEPTH24_STENCIL8:n.DEPTH_COMPONENT24,be=x.stencil?Gs:Ts,je=x.stencil?Hs:lr);let it={colorFormat:n.RGBA8,depthFormat:Le,scaleFactor:s};h=this.getBinding(),f=h.createProjectionLayer(it),r.updateRenderState({layers:[f]}),e.setPixelRatio(1),e.setSize(f.textureWidth,f.textureHeight,!1),v=new rn(f.textureWidth,f.textureHeight,{format:Xn,type:oi,depthTexture:new qo(f.textureWidth,f.textureHeight,je,void 0,void 0,void 0,void 0,void 0,void 0,be),stencilBuffer:x.stencil,colorSpace:e.outputColorSpace,samples:x.antialias?4:0,resolveDepthBuffer:f.ignoreDepthValues===!1,resolveStencilBuffer:f.ignoreDepthValues===!1})}else{let be={antialias:x.antialias,alpha:!0,depth:x.depth,stencil:x.stencil,framebufferScaleFactor:s};d=new XRWebGLLayer(r,n,be),r.updateRenderState({baseLayer:d}),e.setPixelRatio(1),e.setSize(d.framebufferWidth,d.framebufferHeight,!1),v=new rn(d.framebufferWidth,d.framebufferHeight,{format:Xn,type:oi,colorSpace:e.outputColorSpace,stencilBuffer:x.stencil,resolveDepthBuffer:d.ignoreDepthValues===!1,resolveStencilBuffer:d.ignoreDepthValues===!1})}v.isXRRenderTarget=!0,this.setFoveation(c),l=null,o=await r.requestReferenceSpace(a),Ne.setContext(r),Ne.start(),i.isPresenting=!0,i.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(r!==null)return r.environmentBlendMode},this.getDepthTexture=function(){return g.getDepthTexture()};function Q(X){for(let ee=0;ee<X.removed.length;ee++){let be=X.removed[ee],je=M.indexOf(be);je>=0&&(M[je]=null,b[je].disconnect(be))}for(let ee=0;ee<X.added.length;ee++){let be=X.added[ee],je=M.indexOf(be);if(je===-1){for(let it=0;it<b.length;it++)if(it>=M.length){M.push(be),je=it;break}else if(M[it]===null){M[it]=be,je=it;break}if(je===-1)break}let Le=b[je];Le&&Le.connect(be)}}let j=new R,ae=new R;function ye(X,ee,be){j.setFromMatrixPosition(ee.matrixWorld),ae.setFromMatrixPosition(be.matrixWorld);let je=j.distanceTo(ae),Le=ee.projectionMatrix.elements,it=be.projectionMatrix.elements,Nt=Le[14]/(Le[10]-1),N=Le[14]/(Le[10]+1),wt=(Le[9]+1)/Le[5],$e=(Le[9]-1)/Le[5],We=(Le[8]-1)/Le[0],Ee=(it[8]+1)/it[0],xt=Nt*We,Ae=Nt*Ee,Ze=je/(-We+Ee),zt=Ze*-We;if(ee.matrixWorld.decompose(X.position,X.quaternion,X.scale),X.translateX(zt),X.translateZ(Ze),X.matrixWorld.compose(X.position,X.quaternion,X.scale),X.matrixWorldInverse.copy(X.matrixWorld).invert(),Le[10]===-1)X.projectionMatrix.copy(ee.projectionMatrix),X.projectionMatrixInverse.copy(ee.projectionMatrixInverse);else{let It=Nt+Ze,I=N+Ze,S=xt-zt,G=Ae+(je-zt),J=wt*N/I*It,se=$e*N/I*It;X.projectionMatrix.makePerspective(S,G,J,se,It,I),X.projectionMatrixInverse.copy(X.projectionMatrix).invert()}}function Z(X,ee){ee===null?X.matrixWorld.copy(X.matrix):X.matrixWorld.multiplyMatrices(ee.matrixWorld,X.matrix),X.matrixWorldInverse.copy(X.matrixWorld).invert()}this.updateCamera=function(X){if(r===null)return;let ee=X.near,be=X.far;g.texture!==null&&(g.depthNear>0&&(ee=g.depthNear),g.depthFar>0&&(be=g.depthFar)),z.near=w.near=T.near=ee,z.far=w.far=T.far=be,(U!==z.near||O!==z.far)&&(r.updateRenderState({depthNear:z.near,depthFar:z.far}),U=z.near,O=z.far),z.layers.mask=X.layers.mask|6,T.layers.mask=z.layers.mask&3,w.layers.mask=z.layers.mask&5;let je=X.parent,Le=z.cameras;Z(z,je);for(let it=0;it<Le.length;it++)Z(Le[it],je);Le.length===2?ye(z,T,w):z.projectionMatrix.copy(T.projectionMatrix),re(X,z,je)};function re(X,ee,be){be===null?X.matrix.copy(ee.matrixWorld):(X.matrix.copy(be.matrixWorld),X.matrix.invert(),X.matrix.multiply(ee.matrixWorld)),X.matrix.decompose(X.position,X.quaternion,X.scale),X.updateMatrixWorld(!0),X.projectionMatrix.copy(ee.projectionMatrix),X.projectionMatrixInverse.copy(ee.projectionMatrixInverse),X.isPerspectiveCamera&&(X.fov=As*2*Math.atan(1/X.projectionMatrix.elements[5]),X.zoom=1)}this.getCamera=function(){return z},this.getFoveation=function(){if(!(f===null&&d===null))return c},this.setFoveation=function(X){c=X,f!==null&&(f.fixedFoveation=X),d!==null&&d.fixedFoveation!==void 0&&(d.fixedFoveation=X)},this.hasDepthSensing=function(){return g.texture!==null},this.getDepthSensingMesh=function(){return g.getMesh(z)},this.getCameraTexture=function(X){return p[X]};let me=null;function Ge(X,ee){if(u=ee.getViewerPose(l||o),m=ee,u!==null){let be=u.views;d!==null&&(e.setRenderTargetFramebuffer(v,d.framebuffer),e.setRenderTarget(v));let je=!1;be.length!==z.cameras.length&&(z.cameras.length=0,je=!0);for(let N=0;N<be.length;N++){let wt=be[N],$e=null;if(d!==null)$e=d.getViewport(wt);else{let Ee=h.getViewSubImage(f,wt);$e=Ee.viewport,N===0&&(e.setRenderTargetTextures(v,Ee.colorTexture,Ee.depthStencilTexture),e.setRenderTarget(v))}let We=P[N];We===void 0&&(We=new Zt,We.layers.enable(N),We.viewport=new mt,P[N]=We),We.matrix.fromArray(wt.transform.matrix),We.matrix.decompose(We.position,We.quaternion,We.scale),We.projectionMatrix.fromArray(wt.projectionMatrix),We.projectionMatrixInverse.copy(We.projectionMatrix).invert(),We.viewport.set($e.x,$e.y,$e.width,$e.height),N===0&&(z.matrix.copy(We.matrix),z.matrix.decompose(z.position,z.quaternion,z.scale)),je===!0&&z.cameras.push(We)}let Le=r.enabledFeatures;if(Le&&Le.includes("depth-sensing")&&r.depthUsage=="gpu-optimized"&&_){h=i.getBinding();let N=h.getDepthInformation(be[0]);N&&N.isValid&&N.texture&&g.init(N,r.renderState)}if(Le&&Le.includes("camera-access")&&_){e.state.unbindTexture(),h=i.getBinding();for(let N=0;N<be.length;N++){let wt=be[N].camera;if(wt){let $e=p[wt];$e||($e=new Xo,p[wt]=$e);let We=h.getCameraImage(wt);$e.sourceTexture=We}}}}for(let be=0;be<b.length;be++){let je=M[be],Le=b[be];je!==null&&Le!==void 0&&Le.update(je,ee,l||o)}me&&me(X,ee),ee.detectedPlanes&&i.dispatchEvent({type:"planesdetected",data:ee}),m=null}let Ne=new Og;Ne.setAnimationLoop(Ge),this.setAnimationLoop=function(X){me=X},this.dispose=function(){}}},Gr=new Hn,TE=new qe;function AE(t,e){function n(g,p){g.matrixAutoUpdate===!0&&g.updateMatrix(),p.value.copy(g.matrix)}function i(g,p){p.color.getRGB(g.fogColor.value,Tf(t)),p.isFog?(g.fogNear.value=p.near,g.fogFar.value=p.far):p.isFogExp2&&(g.fogDensity.value=p.density)}function r(g,p,x,y,v){p.isMeshBasicMaterial||p.isMeshLambertMaterial?s(g,p):p.isMeshToonMaterial?(s(g,p),h(g,p)):p.isMeshPhongMaterial?(s(g,p),u(g,p)):p.isMeshStandardMaterial?(s(g,p),f(g,p),p.isMeshPhysicalMaterial&&d(g,p,v)):p.isMeshMatcapMaterial?(s(g,p),m(g,p)):p.isMeshDepthMaterial?s(g,p):p.isMeshDistanceMaterial?(s(g,p),_(g,p)):p.isMeshNormalMaterial?s(g,p):p.isLineBasicMaterial?(o(g,p),p.isLineDashedMaterial&&a(g,p)):p.isPointsMaterial?c(g,p,x,y):p.isSpriteMaterial?l(g,p):p.isShadowMaterial?(g.color.value.copy(p.color),g.opacity.value=p.opacity):p.isShaderMaterial&&(p.uniformsNeedUpdate=!1)}function s(g,p){g.opacity.value=p.opacity,p.color&&g.diffuse.value.copy(p.color),p.emissive&&g.emissive.value.copy(p.emissive).multiplyScalar(p.emissiveIntensity),p.map&&(g.map.value=p.map,n(p.map,g.mapTransform)),p.alphaMap&&(g.alphaMap.value=p.alphaMap,n(p.alphaMap,g.alphaMapTransform)),p.bumpMap&&(g.bumpMap.value=p.bumpMap,n(p.bumpMap,g.bumpMapTransform),g.bumpScale.value=p.bumpScale,p.side===Kt&&(g.bumpScale.value*=-1)),p.normalMap&&(g.normalMap.value=p.normalMap,n(p.normalMap,g.normalMapTransform),g.normalScale.value.copy(p.normalScale),p.side===Kt&&g.normalScale.value.negate()),p.displacementMap&&(g.displacementMap.value=p.displacementMap,n(p.displacementMap,g.displacementMapTransform),g.displacementScale.value=p.displacementScale,g.displacementBias.value=p.displacementBias),p.emissiveMap&&(g.emissiveMap.value=p.emissiveMap,n(p.emissiveMap,g.emissiveMapTransform)),p.specularMap&&(g.specularMap.value=p.specularMap,n(p.specularMap,g.specularMapTransform)),p.alphaTest>0&&(g.alphaTest.value=p.alphaTest);let x=e.get(p),y=x.envMap,v=x.envMapRotation;y&&(g.envMap.value=y,Gr.copy(v),Gr.x*=-1,Gr.y*=-1,Gr.z*=-1,y.isCubeTexture&&y.isRenderTargetTexture===!1&&(Gr.y*=-1,Gr.z*=-1),g.envMapRotation.value.setFromMatrix4(TE.makeRotationFromEuler(Gr)),g.flipEnvMap.value=y.isCubeTexture&&y.isRenderTargetTexture===!1?-1:1,g.reflectivity.value=p.reflectivity,g.ior.value=p.ior,g.refractionRatio.value=p.refractionRatio),p.lightMap&&(g.lightMap.value=p.lightMap,g.lightMapIntensity.value=p.lightMapIntensity,n(p.lightMap,g.lightMapTransform)),p.aoMap&&(g.aoMap.value=p.aoMap,g.aoMapIntensity.value=p.aoMapIntensity,n(p.aoMap,g.aoMapTransform))}function o(g,p){g.diffuse.value.copy(p.color),g.opacity.value=p.opacity,p.map&&(g.map.value=p.map,n(p.map,g.mapTransform))}function a(g,p){g.dashSize.value=p.dashSize,g.totalSize.value=p.dashSize+p.gapSize,g.scale.value=p.scale}function c(g,p,x,y){g.diffuse.value.copy(p.color),g.opacity.value=p.opacity,g.size.value=p.size*x,g.scale.value=y*.5,p.map&&(g.map.value=p.map,n(p.map,g.uvTransform)),p.alphaMap&&(g.alphaMap.value=p.alphaMap,n(p.alphaMap,g.alphaMapTransform)),p.alphaTest>0&&(g.alphaTest.value=p.alphaTest)}function l(g,p){g.diffuse.value.copy(p.color),g.opacity.value=p.opacity,g.rotation.value=p.rotation,p.map&&(g.map.value=p.map,n(p.map,g.mapTransform)),p.alphaMap&&(g.alphaMap.value=p.alphaMap,n(p.alphaMap,g.alphaMapTransform)),p.alphaTest>0&&(g.alphaTest.value=p.alphaTest)}function u(g,p){g.specular.value.copy(p.specular),g.shininess.value=Math.max(p.shininess,1e-4)}function h(g,p){p.gradientMap&&(g.gradientMap.value=p.gradientMap)}function f(g,p){g.metalness.value=p.metalness,p.metalnessMap&&(g.metalnessMap.value=p.metalnessMap,n(p.metalnessMap,g.metalnessMapTransform)),g.roughness.value=p.roughness,p.roughnessMap&&(g.roughnessMap.value=p.roughnessMap,n(p.roughnessMap,g.roughnessMapTransform)),p.envMap&&(g.envMapIntensity.value=p.envMapIntensity)}function d(g,p,x){g.ior.value=p.ior,p.sheen>0&&(g.sheenColor.value.copy(p.sheenColor).multiplyScalar(p.sheen),g.sheenRoughness.value=p.sheenRoughness,p.sheenColorMap&&(g.sheenColorMap.value=p.sheenColorMap,n(p.sheenColorMap,g.sheenColorMapTransform)),p.sheenRoughnessMap&&(g.sheenRoughnessMap.value=p.sheenRoughnessMap,n(p.sheenRoughnessMap,g.sheenRoughnessMapTransform))),p.clearcoat>0&&(g.clearcoat.value=p.clearcoat,g.clearcoatRoughness.value=p.clearcoatRoughness,p.clearcoatMap&&(g.clearcoatMap.value=p.clearcoatMap,n(p.clearcoatMap,g.clearcoatMapTransform)),p.clearcoatRoughnessMap&&(g.clearcoatRoughnessMap.value=p.clearcoatRoughnessMap,n(p.clearcoatRoughnessMap,g.clearcoatRoughnessMapTransform)),p.clearcoatNormalMap&&(g.clearcoatNormalMap.value=p.clearcoatNormalMap,n(p.clearcoatNormalMap,g.clearcoatNormalMapTransform),g.clearcoatNormalScale.value.copy(p.clearcoatNormalScale),p.side===Kt&&g.clearcoatNormalScale.value.negate())),p.dispersion>0&&(g.dispersion.value=p.dispersion),p.iridescence>0&&(g.iridescence.value=p.iridescence,g.iridescenceIOR.value=p.iridescenceIOR,g.iridescenceThicknessMinimum.value=p.iridescenceThicknessRange[0],g.iridescenceThicknessMaximum.value=p.iridescenceThicknessRange[1],p.iridescenceMap&&(g.iridescenceMap.value=p.iridescenceMap,n(p.iridescenceMap,g.iridescenceMapTransform)),p.iridescenceThicknessMap&&(g.iridescenceThicknessMap.value=p.iridescenceThicknessMap,n(p.iridescenceThicknessMap,g.iridescenceThicknessMapTransform))),p.transmission>0&&(g.transmission.value=p.transmission,g.transmissionSamplerMap.value=x.texture,g.transmissionSamplerSize.value.set(x.width,x.height),p.transmissionMap&&(g.transmissionMap.value=p.transmissionMap,n(p.transmissionMap,g.transmissionMapTransform)),g.thickness.value=p.thickness,p.thicknessMap&&(g.thicknessMap.value=p.thicknessMap,n(p.thicknessMap,g.thicknessMapTransform)),g.attenuationDistance.value=p.attenuationDistance,g.attenuationColor.value.copy(p.attenuationColor)),p.anisotropy>0&&(g.anisotropyVector.value.set(p.anisotropy*Math.cos(p.anisotropyRotation),p.anisotropy*Math.sin(p.anisotropyRotation)),p.anisotropyMap&&(g.anisotropyMap.value=p.anisotropyMap,n(p.anisotropyMap,g.anisotropyMapTransform))),g.specularIntensity.value=p.specularIntensity,g.specularColor.value.copy(p.specularColor),p.specularColorMap&&(g.specularColorMap.value=p.specularColorMap,n(p.specularColorMap,g.specularColorMapTransform)),p.specularIntensityMap&&(g.specularIntensityMap.value=p.specularIntensityMap,n(p.specularIntensityMap,g.specularIntensityMapTransform))}function m(g,p){p.matcap&&(g.matcap.value=p.matcap)}function _(g,p){let x=e.get(p).light;g.referencePosition.value.setFromMatrixPosition(x.matrixWorld),g.nearDistance.value=x.shadow.camera.near,g.farDistance.value=x.shadow.camera.far}return{refreshFogUniforms:i,refreshMaterialUniforms:r}}function CE(t,e,n,i){let r={},s={},o=[],a=t.getParameter(t.MAX_UNIFORM_BUFFER_BINDINGS);function c(x,y){let v=y.program;i.uniformBlockBinding(x,v)}function l(x,y){let v=r[x.id];v===void 0&&(m(x),v=u(x),r[x.id]=v,x.addEventListener("dispose",g));let b=y.program;i.updateUBOMapping(x,b);let M=e.render.frame;s[x.id]!==M&&(f(x),s[x.id]=M)}function u(x){let y=h();x.__bindingPointIndex=y;let v=t.createBuffer(),b=x.__size,M=x.usage;return t.bindBuffer(t.UNIFORM_BUFFER,v),t.bufferData(t.UNIFORM_BUFFER,b,M),t.bindBuffer(t.UNIFORM_BUFFER,null),t.bindBufferBase(t.UNIFORM_BUFFER,y,v),v}function h(){for(let x=0;x<a;x++)if(o.indexOf(x)===-1)return o.push(x),x;return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function f(x){let y=r[x.id],v=x.uniforms,b=x.__cache;t.bindBuffer(t.UNIFORM_BUFFER,y);for(let M=0,A=v.length;M<A;M++){let C=Array.isArray(v[M])?v[M]:[v[M]];for(let T=0,w=C.length;T<w;T++){let P=C[T];if(d(P,M,T,b)===!0){let z=P.__offset,U=Array.isArray(P.value)?P.value:[P.value],O=0;for(let D=0;D<U.length;D++){let V=U[D],Q=_(V);typeof V=="number"||typeof V=="boolean"?(P.__data[0]=V,t.bufferSubData(t.UNIFORM_BUFFER,z+O,P.__data)):V.isMatrix3?(P.__data[0]=V.elements[0],P.__data[1]=V.elements[1],P.__data[2]=V.elements[2],P.__data[3]=0,P.__data[4]=V.elements[3],P.__data[5]=V.elements[4],P.__data[6]=V.elements[5],P.__data[7]=0,P.__data[8]=V.elements[6],P.__data[9]=V.elements[7],P.__data[10]=V.elements[8],P.__data[11]=0):(V.toArray(P.__data,O),O+=Q.storage/Float32Array.BYTES_PER_ELEMENT)}t.bufferSubData(t.UNIFORM_BUFFER,z,P.__data)}}}t.bindBuffer(t.UNIFORM_BUFFER,null)}function d(x,y,v,b){let M=x.value,A=y+"_"+v;if(b[A]===void 0)return typeof M=="number"||typeof M=="boolean"?b[A]=M:b[A]=M.clone(),!0;{let C=b[A];if(typeof M=="number"||typeof M=="boolean"){if(C!==M)return b[A]=M,!0}else if(C.equals(M)===!1)return C.copy(M),!0}return!1}function m(x){let y=x.uniforms,v=0,b=16;for(let A=0,C=y.length;A<C;A++){let T=Array.isArray(y[A])?y[A]:[y[A]];for(let w=0,P=T.length;w<P;w++){let z=T[w],U=Array.isArray(z.value)?z.value:[z.value];for(let O=0,D=U.length;O<D;O++){let V=U[O],Q=_(V),j=v%b,ae=j%Q.boundary,ye=j+ae;v+=ae,ye!==0&&b-ye<Q.storage&&(v+=b-ye),z.__data=new Float32Array(Q.storage/Float32Array.BYTES_PER_ELEMENT),z.__offset=v,v+=Q.storage}}}let M=v%b;return M>0&&(v+=b-M),x.__size=v,x.__cache={},this}function _(x){let y={boundary:0,storage:0};return typeof x=="number"||typeof x=="boolean"?(y.boundary=4,y.storage=4):x.isVector2?(y.boundary=8,y.storage=8):x.isVector3||x.isColor?(y.boundary=16,y.storage=12):x.isVector4?(y.boundary=16,y.storage=16):x.isMatrix3?(y.boundary=48,y.storage=48):x.isMatrix4?(y.boundary=64,y.storage=64):x.isTexture?console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group."):console.warn("THREE.WebGLRenderer: Unsupported uniform value type.",x),y}function g(x){let y=x.target;y.removeEventListener("dispose",g);let v=o.indexOf(y.__bindingPointIndex);o.splice(v,1),t.deleteBuffer(r[y.id]),delete r[y.id],delete s[y.id]}function p(){for(let x in r)t.deleteBuffer(r[x]);o=[],r={},s={}}return{bind:c,update:l,dispose:p}}var ah=class{constructor(e={}){let{canvas:n=og(),context:i=null,depth:r=!0,stencil:s=!1,alpha:o=!1,antialias:a=!1,premultipliedAlpha:c=!0,preserveDrawingBuffer:l=!1,powerPreference:u="default",failIfMajorPerformanceCaveat:h=!1,reversedDepthBuffer:f=!1}=e;this.isWebGLRenderer=!0;let d;if(i!==null){if(typeof WebGLRenderingContext!="undefined"&&i instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");d=i.getContextAttributes().alpha}else d=o;let m=new Uint32Array(4),_=new Int32Array(4),g=null,p=null,x=[],y=[];this.domElement=n,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=Vi,this.toneMappingExposure=1,this.transmissionResolutionScale=1;let v=this,b=!1;this._outputColorSpace=Yt;let M=0,A=0,C=null,T=-1,w=null,P=new mt,z=new mt,U=null,O=new Fe(0),D=0,V=n.width,Q=n.height,j=1,ae=null,ye=null,Z=new mt(0,0,V,Q),re=new mt(0,0,V,Q),me=!1,Ge=new Os,Ne=!1,X=!1,ee=new qe,be=new R,je=new mt,Le={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},it=!1;function Nt(){return C===null?j:1}let N=i;function wt(E,F){return n.getContext(E,F)}try{let E={alpha:!0,depth:r,stencil:s,antialias:a,premultipliedAlpha:c,preserveDrawingBuffer:l,powerPreference:u,failIfMajorPerformanceCaveat:h};if("setAttribute"in n&&n.setAttribute("data-engine",`three.js r${"180"}`),n.addEventListener("webglcontextlost",de,!1),n.addEventListener("webglcontextrestored",we,!1),n.addEventListener("webglcontextcreationerror",oe,!1),N===null){let F="webgl2";if(N=wt(F,E),N===null)throw wt(F)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(E){throw console.error("THREE.WebGLRenderer: "+E.message),E}let $e,We,Ee,xt,Ae,Ze,zt,It,I,S,G,J,se,K,Re,fe,Se,Pe,le,ge,Be,Ie,_e,Ye;function B(){$e=new qS(N),$e.init(),Ie=new SE(N,$e),We=new kS(N,$e,e,Ie),Ee=new bE(N,$e),We.reversedDepthBuffer&&f&&Ee.buffers.depth.setReversed(!0),xt=new YS(N),Ae=new cE,Ze=new ME(N,$e,Ee,Ae,We,Ie,xt),zt=new VS(v),It=new jS(v),I=new t1(N),_e=new US(N,I),S=new XS(N,I,xt,_e),G=new KS(N,S,I,xt),le=new ZS(N,We,Ze),fe=new BS(Ae),J=new aE(v,zt,It,$e,We,_e,fe),se=new AE(v,Ae),K=new hE,Re=new gE($e),Pe=new FS(v,zt,It,Ee,G,d,c),Se=new yE(v,G,We),Ye=new CE(N,xt,We,Ee),ge=new zS(N,$e,xt),Be=new $S(N,$e,xt),xt.programs=J.programs,v.capabilities=We,v.extensions=$e,v.properties=Ae,v.renderLists=K,v.shadowMap=Se,v.state=Ee,v.info=xt}B();let ce=new Wf(v,N);this.xr=ce,this.getContext=function(){return N},this.getContextAttributes=function(){return N.getContextAttributes()},this.forceContextLoss=function(){let E=$e.get("WEBGL_lose_context");E&&E.loseContext()},this.forceContextRestore=function(){let E=$e.get("WEBGL_lose_context");E&&E.restoreContext()},this.getPixelRatio=function(){return j},this.setPixelRatio=function(E){E!==void 0&&(j=E,this.setSize(V,Q,!1))},this.getSize=function(E){return E.set(V,Q)},this.setSize=function(E,F,H=!0){if(ce.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}V=E,Q=F,n.width=Math.floor(E*j),n.height=Math.floor(F*j),H===!0&&(n.style.width=E+"px",n.style.height=F+"px"),this.setViewport(0,0,E,F)},this.getDrawingBufferSize=function(E){return E.set(V*j,Q*j).floor()},this.setDrawingBufferSize=function(E,F,H){V=E,Q=F,j=H,n.width=Math.floor(E*H),n.height=Math.floor(F*H),this.setViewport(0,0,E,F)},this.getCurrentViewport=function(E){return E.copy(P)},this.getViewport=function(E){return E.copy(Z)},this.setViewport=function(E,F,H,q){E.isVector4?Z.set(E.x,E.y,E.z,E.w):Z.set(E,F,H,q),Ee.viewport(P.copy(Z).multiplyScalar(j).round())},this.getScissor=function(E){return E.copy(re)},this.setScissor=function(E,F,H,q){E.isVector4?re.set(E.x,E.y,E.z,E.w):re.set(E,F,H,q),Ee.scissor(z.copy(re).multiplyScalar(j).round())},this.getScissorTest=function(){return me},this.setScissorTest=function(E){Ee.setScissorTest(me=E)},this.setOpaqueSort=function(E){ae=E},this.setTransparentSort=function(E){ye=E},this.getClearColor=function(E){return E.copy(Pe.getClearColor())},this.setClearColor=function(){Pe.setClearColor(...arguments)},this.getClearAlpha=function(){return Pe.getClearAlpha()},this.setClearAlpha=function(){Pe.setClearAlpha(...arguments)},this.clear=function(E=!0,F=!0,H=!0){let q=0;if(E){let L=!1;if(C!==null){let ne=C.texture.format;L=ne===Al||ne===Tl||ne===El}if(L){let ne=C.texture.type,he=ne===oi||ne===lr||ne===Vs||ne===Hs||ne===Sl||ne===wl,xe=Pe.getClearColor(),Me=Pe.getClearAlpha(),ze=xe.r,Ve=xe.g,Oe=xe.b;he?(m[0]=ze,m[1]=Ve,m[2]=Oe,m[3]=Me,N.clearBufferuiv(N.COLOR,0,m)):(_[0]=ze,_[1]=Ve,_[2]=Oe,_[3]=Me,N.clearBufferiv(N.COLOR,0,_))}else q|=N.COLOR_BUFFER_BIT}F&&(q|=N.DEPTH_BUFFER_BIT),H&&(q|=N.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),N.clear(q)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){n.removeEventListener("webglcontextlost",de,!1),n.removeEventListener("webglcontextrestored",we,!1),n.removeEventListener("webglcontextcreationerror",oe,!1),Pe.dispose(),K.dispose(),Re.dispose(),Ae.dispose(),zt.dispose(),It.dispose(),G.dispose(),_e.dispose(),Ye.dispose(),J.dispose(),ce.dispose(),ce.removeEventListener("sessionstart",Sn),ce.removeEventListener("sessionend",go),Ai.stop()};function de(E){E.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),b=!0}function we(){console.log("THREE.WebGLRenderer: Context Restored."),b=!1;let E=xt.autoReset,F=Se.enabled,H=Se.autoUpdate,q=Se.needsUpdate,L=Se.type;B(),xt.autoReset=E,Se.enabled=F,Se.autoUpdate=H,Se.needsUpdate=q,Se.type=L}function oe(E){console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ",E.statusMessage)}function te(E){let F=E.target;F.removeEventListener("dispose",te),Te(F)}function Te(E){Xe(E),Ae.remove(E)}function Xe(E){let F=Ae.get(E).programs;F!==void 0&&(F.forEach(function(H){J.releaseProgram(H)}),E.isShaderMaterial&&J.releaseShaderCache(E))}this.renderBufferDirect=function(E,F,H,q,L,ne){F===null&&(F=Le);let he=L.isMesh&&L.matrixWorld.determinant()<0,xe=W(E,F,H,q,L);Ee.setMaterial(q,he);let Me=H.index,ze=1;if(q.wireframe===!0){if(Me=S.getWireframeAttribute(H),Me===void 0)return;ze=2}let Ve=H.drawRange,Oe=H.attributes.position,rt=Ve.start*ze,ft=(Ve.start+Ve.count)*ze;ne!==null&&(rt=Math.max(rt,ne.start*ze),ft=Math.min(ft,(ne.start+ne.count)*ze)),Me!==null?(rt=Math.max(rt,0),ft=Math.min(ft,Me.count)):Oe!=null&&(rt=Math.max(rt,0),ft=Math.min(ft,Oe.count));let Ot=ft-rt;if(Ot<0||Ot===1/0)return;_e.setup(L,q,xe,H,Me);let Tt,bt=ge;if(Me!==null&&(Tt=I.get(Me),bt=Be,bt.setIndex(Tt)),L.isMesh)q.wireframe===!0?(Ee.setLineWidth(q.wireframeLinewidth*Nt()),bt.setMode(N.LINES)):bt.setMode(N.TRIANGLES);else if(L.isLine){let ke=q.linewidth;ke===void 0&&(ke=1),Ee.setLineWidth(ke*Nt()),L.isLineSegments?bt.setMode(N.LINES):L.isLineLoop?bt.setMode(N.LINE_LOOP):bt.setMode(N.LINE_STRIP)}else L.isPoints?bt.setMode(N.POINTS):L.isSprite&&bt.setMode(N.TRIANGLES);if(L.isBatchedMesh)if(L._multiDrawInstances!==null)Rs("THREE.WebGLRenderer: renderMultiDrawInstances has been deprecated and will be removed in r184. Append to renderMultiDraw arguments and use indirection."),bt.renderMultiDrawInstances(L._multiDrawStarts,L._multiDrawCounts,L._multiDrawCount,L._multiDrawInstances);else if($e.get("WEBGL_multi_draw"))bt.renderMultiDraw(L._multiDrawStarts,L._multiDrawCounts,L._multiDrawCount);else{let ke=L._multiDrawStarts,Dt=L._multiDrawCounts,ct=L._multiDrawCount,wn=Me?I.get(Me).bytesPerElement:1,as=Ae.get(q).currentProgram.getUniforms();for(let En=0;En<ct;En++)as.setValue(N,"_gl_DrawID",En),bt.render(ke[En]/wn,Dt[En])}else if(L.isInstancedMesh)bt.renderInstances(rt,Ot,L.count);else if(H.isInstancedBufferGeometry){let ke=H._maxInstanceCount!==void 0?H._maxInstanceCount:1/0,Dt=Math.min(H.instanceCount,ke);bt.renderInstances(rt,Ot,Dt)}else bt.render(rt,Ot)};function vt(E,F,H){E.transparent===!0&&E.side===xi&&E.forceSinglePass===!1?(E.side=Kt,E.needsUpdate=!0,os(E,F,H),E.side=Ui,E.needsUpdate=!0,os(E,F,H),E.side=xi):os(E,F,H)}this.compile=function(E,F,H=null){H===null&&(H=E),p=Re.get(H),p.init(F),y.push(p),H.traverseVisible(function(L){L.isLight&&L.layers.test(F.layers)&&(p.pushLight(L),L.castShadow&&p.pushShadow(L))}),E!==H&&E.traverseVisible(function(L){L.isLight&&L.layers.test(F.layers)&&(p.pushLight(L),L.castShadow&&p.pushShadow(L))}),p.setupLights();let q=new Set;return E.traverse(function(L){if(!(L.isMesh||L.isPoints||L.isLine||L.isSprite))return;let ne=L.material;if(ne)if(Array.isArray(ne))for(let he=0;he<ne.length;he++){let xe=ne[he];vt(xe,H,L),q.add(xe)}else vt(ne,H,L),q.add(ne)}),p=y.pop(),q},this.compileAsync=function(E,F,H=null){let q=this.compile(E,F,H);return new Promise(L=>{function ne(){if(q.forEach(function(he){Ae.get(he).currentProgram.isReady()&&q.delete(he)}),q.size===0){L(E);return}setTimeout(ne,10)}$e.get("KHR_parallel_shader_compile")!==null?ne():setTimeout(ne,10)})};let at=null;function Un(E){at&&at(E)}function Sn(){Ai.stop()}function go(){Ai.start()}let Ai=new Og;Ai.setAnimationLoop(Un),typeof self!="undefined"&&Ai.setContext(self),this.setAnimationLoop=function(E){at=E,ce.setAnimationLoop(E),E===null?Ai.stop():Ai.start()},ce.addEventListener("sessionstart",Sn),ce.addEventListener("sessionend",go),this.render=function(E,F){if(F!==void 0&&F.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(b===!0)return;if(E.matrixWorldAutoUpdate===!0&&E.updateMatrixWorld(),F.parent===null&&F.matrixWorldAutoUpdate===!0&&F.updateMatrixWorld(),ce.enabled===!0&&ce.isPresenting===!0&&(ce.cameraAutoUpdate===!0&&ce.updateCamera(F),F=ce.getCamera()),E.isScene===!0&&E.onBeforeRender(v,E,F,C),p=Re.get(E,y.length),p.init(F),y.push(p),ee.multiplyMatrices(F.projectionMatrix,F.matrixWorldInverse),Ge.setFromProjectionMatrix(ee,ni,F.reversedDepth),X=this.localClippingEnabled,Ne=fe.init(this.clippingPlanes,X),g=K.get(E,x.length),g.init(),x.push(g),ce.enabled===!0&&ce.isPresenting===!0){let ne=v.xr.getDepthSensingMesh();ne!==null&&_o(ne,F,-1/0,v.sortObjects)}_o(E,F,0,v.sortObjects),g.finish(),v.sortObjects===!0&&g.sort(ae,ye),it=ce.enabled===!1||ce.isPresenting===!1||ce.hasDepthSensing()===!1,it&&Pe.addToRenderList(g,E),this.info.render.frame++,Ne===!0&&fe.beginShadows();let H=p.state.shadowsArray;Se.render(H,E,F),Ne===!0&&fe.endShadows(),this.info.autoReset===!0&&this.info.reset();let q=g.opaque,L=g.transmissive;if(p.setupLights(),F.isArrayCamera){let ne=F.cameras;if(L.length>0)for(let he=0,xe=ne.length;he<xe;he++){let Me=ne[he];ss(q,L,E,Me)}it&&Pe.render(E);for(let he=0,xe=ne.length;he<xe;he++){let Me=ne[he];vo(g,E,Me,Me.viewport)}}else L.length>0&&ss(q,L,E,F),it&&Pe.render(E),vo(g,E,F);C!==null&&A===0&&(Ze.updateMultisampleRenderTarget(C),Ze.updateRenderTargetMipmap(C)),E.isScene===!0&&E.onAfterRender(v,E,F),_e.resetDefaultState(),T=-1,w=null,y.pop(),y.length>0?(p=y[y.length-1],Ne===!0&&fe.setGlobalState(v.clippingPlanes,p.state.camera)):p=null,x.pop(),x.length>0?g=x[x.length-1]:g=null};function _o(E,F,H,q){if(E.visible===!1)return;if(E.layers.test(F.layers)){if(E.isGroup)H=E.renderOrder;else if(E.isLOD)E.autoUpdate===!0&&E.update(F);else if(E.isLight)p.pushLight(E),E.castShadow&&p.pushShadow(E);else if(E.isSprite){if(!E.frustumCulled||Ge.intersectsSprite(E)){q&&je.setFromMatrixPosition(E.matrixWorld).applyMatrix4(ee);let he=G.update(E),xe=E.material;xe.visible&&g.push(E,he,xe,H,je.z,null)}}else if((E.isMesh||E.isLine||E.isPoints)&&(!E.frustumCulled||Ge.intersectsObject(E))){let he=G.update(E),xe=E.material;if(q&&(E.boundingSphere!==void 0?(E.boundingSphere===null&&E.computeBoundingSphere(),je.copy(E.boundingSphere.center)):(he.boundingSphere===null&&he.computeBoundingSphere(),je.copy(he.boundingSphere.center)),je.applyMatrix4(E.matrixWorld).applyMatrix4(ee)),Array.isArray(xe)){let Me=he.groups;for(let ze=0,Ve=Me.length;ze<Ve;ze++){let Oe=Me[ze],rt=xe[Oe.materialIndex];rt&&rt.visible&&g.push(E,he,rt,H,je.z,Oe)}}else xe.visible&&g.push(E,he,xe,H,je.z,null)}}let ne=E.children;for(let he=0,xe=ne.length;he<xe;he++)_o(ne[he],F,H,q)}function vo(E,F,H,q){let L=E.opaque,ne=E.transmissive,he=E.transparent;p.setupLightsView(H),Ne===!0&&fe.setGlobalState(v.clippingPlanes,H),q&&Ee.viewport(P.copy(q)),L.length>0&&Ci(L,F,H),ne.length>0&&Ci(ne,F,H),he.length>0&&Ci(he,F,H),Ee.buffers.depth.setTest(!0),Ee.buffers.depth.setMask(!0),Ee.buffers.color.setMask(!0),Ee.setPolygonOffset(!1)}function ss(E,F,H,q){if((H.isScene===!0?H.overrideMaterial:null)!==null)return;p.state.transmissionRenderTarget[q.id]===void 0&&(p.state.transmissionRenderTarget[q.id]=new rn(1,1,{generateMipmaps:!0,type:$e.has("EXT_color_buffer_half_float")||$e.has("EXT_color_buffer_float")?qn:oi,minFilter:cr,samples:4,stencilBuffer:s,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:st.workingColorSpace}));let ne=p.state.transmissionRenderTarget[q.id],he=q.viewport||P;ne.setSize(he.z*v.transmissionResolutionScale,he.w*v.transmissionResolutionScale);let xe=v.getRenderTarget(),Me=v.getActiveCubeFace(),ze=v.getActiveMipmapLevel();v.setRenderTarget(ne),v.getClearColor(O),D=v.getClearAlpha(),D<1&&v.setClearColor(16777215,.5),v.clear(),it&&Pe.render(H);let Ve=v.toneMapping;v.toneMapping=Vi;let Oe=q.viewport;if(q.viewport!==void 0&&(q.viewport=void 0),p.setupLightsView(q),Ne===!0&&fe.setGlobalState(v.clippingPlanes,q),Ci(E,H,q),Ze.updateMultisampleRenderTarget(ne),Ze.updateRenderTargetMipmap(ne),$e.has("WEBGL_multisampled_render_to_texture")===!1){let rt=!1;for(let ft=0,Ot=F.length;ft<Ot;ft++){let Tt=F[ft],bt=Tt.object,ke=Tt.geometry,Dt=Tt.material,ct=Tt.group;if(Dt.side===xi&&bt.layers.test(q.layers)){let wn=Dt.side;Dt.side=Kt,Dt.needsUpdate=!0,Xa(bt,H,q,ke,Dt,ct),Dt.side=wn,Dt.needsUpdate=!0,rt=!0}}rt===!0&&(Ze.updateMultisampleRenderTarget(ne),Ze.updateRenderTargetMipmap(ne))}v.setRenderTarget(xe,Me,ze),v.setClearColor(O,D),Oe!==void 0&&(q.viewport=Oe),v.toneMapping=Ve}function Ci(E,F,H){let q=F.isScene===!0?F.overrideMaterial:null;for(let L=0,ne=E.length;L<ne;L++){let he=E[L],xe=he.object,Me=he.geometry,ze=he.group,Ve=he.material;Ve.allowOverride===!0&&q!==null&&(Ve=q),xe.layers.test(H.layers)&&Xa(xe,F,H,Me,Ve,ze)}}function Xa(E,F,H,q,L,ne){E.onBeforeRender(v,F,H,q,L,ne),E.modelViewMatrix.multiplyMatrices(H.matrixWorldInverse,E.matrixWorld),E.normalMatrix.getNormalMatrix(E.modelViewMatrix),L.onBeforeRender(v,F,H,q,E,ne),L.transparent===!0&&L.side===xi&&L.forceSinglePass===!1?(L.side=Kt,L.needsUpdate=!0,v.renderBufferDirect(H,F,q,L,E,ne),L.side=Ui,L.needsUpdate=!0,v.renderBufferDirect(H,F,q,L,E,ne),L.side=xi):v.renderBufferDirect(H,F,q,L,E,ne),E.onAfterRender(v,F,H,q,L,ne)}function os(E,F,H){F.isScene!==!0&&(F=Le);let q=Ae.get(E),L=p.state.lights,ne=p.state.shadowsArray,he=L.state.version,xe=J.getParameters(E,L.state,ne,F,H),Me=J.getProgramCacheKey(xe),ze=q.programs;q.environment=E.isMeshStandardMaterial?F.environment:null,q.fog=F.fog,q.envMap=(E.isMeshStandardMaterial?It:zt).get(E.envMap||q.environment),q.envMapRotation=q.environment!==null&&E.envMap===null?F.environmentRotation:E.envMapRotation,ze===void 0&&(E.addEventListener("dispose",te),ze=new Map,q.programs=ze);let Ve=ze.get(Me);if(Ve!==void 0){if(q.currentProgram===Ve&&q.lightsStateVersion===he)return Y(E,xe),Ve}else xe.uniforms=J.getUniforms(E),E.onBeforeCompile(xe,v),Ve=J.acquireProgram(xe,Me),ze.set(Me,Ve),q.uniforms=xe.uniforms;let Oe=q.uniforms;return(!E.isShaderMaterial&&!E.isRawShaderMaterial||E.clipping===!0)&&(Oe.clippingPlanes=fe.uniform),Y(E,xe),q.needsLights=pe(E),q.lightsStateVersion=he,q.needsLights&&(Oe.ambientLightColor.value=L.state.ambient,Oe.lightProbe.value=L.state.probe,Oe.directionalLights.value=L.state.directional,Oe.directionalLightShadows.value=L.state.directionalShadow,Oe.spotLights.value=L.state.spot,Oe.spotLightShadows.value=L.state.spotShadow,Oe.rectAreaLights.value=L.state.rectArea,Oe.ltc_1.value=L.state.rectAreaLTC1,Oe.ltc_2.value=L.state.rectAreaLTC2,Oe.pointLights.value=L.state.point,Oe.pointLightShadows.value=L.state.pointShadow,Oe.hemisphereLights.value=L.state.hemi,Oe.directionalShadowMap.value=L.state.directionalShadowMap,Oe.directionalShadowMatrix.value=L.state.directionalShadowMatrix,Oe.spotShadowMap.value=L.state.spotShadowMap,Oe.spotLightMatrix.value=L.state.spotLightMatrix,Oe.spotLightMap.value=L.state.spotLightMap,Oe.pointShadowMap.value=L.state.pointShadowMap,Oe.pointShadowMatrix.value=L.state.pointShadowMatrix),q.currentProgram=Ve,q.uniformsList=null,Ve}function k(E){if(E.uniformsList===null){let F=E.currentProgram.getUniforms();E.uniformsList=qs.seqWithValue(F.seq,E.uniforms)}return E.uniformsList}function Y(E,F){let H=Ae.get(E);H.outputColorSpace=F.outputColorSpace,H.batching=F.batching,H.batchingColor=F.batchingColor,H.instancing=F.instancing,H.instancingColor=F.instancingColor,H.instancingMorph=F.instancingMorph,H.skinning=F.skinning,H.morphTargets=F.morphTargets,H.morphNormals=F.morphNormals,H.morphColors=F.morphColors,H.morphTargetsCount=F.morphTargetsCount,H.numClippingPlanes=F.numClippingPlanes,H.numIntersection=F.numClipIntersection,H.vertexAlphas=F.vertexAlphas,H.vertexTangents=F.vertexTangents,H.toneMapping=F.toneMapping}function W(E,F,H,q,L){F.isScene!==!0&&(F=Le),Ze.resetTextureUnits();let ne=F.fog,he=q.isMeshStandardMaterial?F.environment:null,xe=C===null?v.outputColorSpace:C.isXRRenderTarget===!0?C.texture.colorSpace:Or,Me=(q.isMeshStandardMaterial?It:zt).get(q.envMap||he),ze=q.vertexColors===!0&&!!H.attributes.color&&H.attributes.color.itemSize===4,Ve=!!H.attributes.tangent&&(!!q.normalMap||q.anisotropy>0),Oe=!!H.morphAttributes.position,rt=!!H.morphAttributes.normal,ft=!!H.morphAttributes.color,Ot=Vi;q.toneMapped&&(C===null||C.isXRRenderTarget===!0)&&(Ot=v.toneMapping);let Tt=H.morphAttributes.position||H.morphAttributes.normal||H.morphAttributes.color,bt=Tt!==void 0?Tt.length:0,ke=Ae.get(q),Dt=p.state.lights;if(Ne===!0&&(X===!0||E!==w)){let cn=E===w&&q.id===T;fe.setState(q,E,cn)}let ct=!1;q.version===ke.__version?(ke.needsLights&&ke.lightsStateVersion!==Dt.state.version||ke.outputColorSpace!==xe||L.isBatchedMesh&&ke.batching===!1||!L.isBatchedMesh&&ke.batching===!0||L.isBatchedMesh&&ke.batchingColor===!0&&L.colorTexture===null||L.isBatchedMesh&&ke.batchingColor===!1&&L.colorTexture!==null||L.isInstancedMesh&&ke.instancing===!1||!L.isInstancedMesh&&ke.instancing===!0||L.isSkinnedMesh&&ke.skinning===!1||!L.isSkinnedMesh&&ke.skinning===!0||L.isInstancedMesh&&ke.instancingColor===!0&&L.instanceColor===null||L.isInstancedMesh&&ke.instancingColor===!1&&L.instanceColor!==null||L.isInstancedMesh&&ke.instancingMorph===!0&&L.morphTexture===null||L.isInstancedMesh&&ke.instancingMorph===!1&&L.morphTexture!==null||ke.envMap!==Me||q.fog===!0&&ke.fog!==ne||ke.numClippingPlanes!==void 0&&(ke.numClippingPlanes!==fe.numPlanes||ke.numIntersection!==fe.numIntersection)||ke.vertexAlphas!==ze||ke.vertexTangents!==Ve||ke.morphTargets!==Oe||ke.morphNormals!==rt||ke.morphColors!==ft||ke.toneMapping!==Ot||ke.morphTargetsCount!==bt)&&(ct=!0):(ct=!0,ke.__version=q.version);let wn=ke.currentProgram;ct===!0&&(wn=os(q,F,L));let as=!1,En=!1,yo=!1,Lt=wn.getUniforms(),zn=ke.uniforms;if(Ee.useProgram(wn.program)&&(as=!0,En=!0,yo=!0),q.id!==T&&(T=q.id,En=!0),as||w!==E){Ee.buffers.depth.getReversed()&&E.reversedDepth!==!0&&(E._reversedDepth=!0,E.updateProjectionMatrix()),Lt.setValue(N,"projectionMatrix",E.projectionMatrix),Lt.setValue(N,"viewMatrix",E.matrixWorldInverse);let mn=Lt.map.cameraPosition;mn!==void 0&&mn.setValue(N,be.setFromMatrixPosition(E.matrixWorld)),We.logarithmicDepthBuffer&&Lt.setValue(N,"logDepthBufFC",2/(Math.log(E.far+1)/Math.LN2)),(q.isMeshPhongMaterial||q.isMeshToonMaterial||q.isMeshLambertMaterial||q.isMeshBasicMaterial||q.isMeshStandardMaterial||q.isShaderMaterial)&&Lt.setValue(N,"isOrthographic",E.isOrthographicCamera===!0),w!==E&&(w=E,En=!0,yo=!0)}if(L.isSkinnedMesh){Lt.setOptional(N,L,"bindMatrix"),Lt.setOptional(N,L,"bindMatrixInverse");let cn=L.skeleton;cn&&(cn.boneTexture===null&&cn.computeBoneTexture(),Lt.setValue(N,"boneTexture",cn.boneTexture,Ze))}L.isBatchedMesh&&(Lt.setOptional(N,L,"batchingTexture"),Lt.setValue(N,"batchingTexture",L._matricesTexture,Ze),Lt.setOptional(N,L,"batchingIdTexture"),Lt.setValue(N,"batchingIdTexture",L._indirectTexture,Ze),Lt.setOptional(N,L,"batchingColorTexture"),L._colorsTexture!==null&&Lt.setValue(N,"batchingColorTexture",L._colorsTexture,Ze));let kn=H.morphAttributes;if((kn.position!==void 0||kn.normal!==void 0||kn.color!==void 0)&&le.update(L,H,wn),(En||ke.receiveShadow!==L.receiveShadow)&&(ke.receiveShadow=L.receiveShadow,Lt.setValue(N,"receiveShadow",L.receiveShadow)),q.isMeshGouraudMaterial&&q.envMap!==null&&(zn.envMap.value=Me,zn.flipEnvMap.value=Me.isCubeTexture&&Me.isRenderTargetTexture===!1?-1:1),q.isMeshStandardMaterial&&q.envMap===null&&F.environment!==null&&(zn.envMapIntensity.value=F.environmentIntensity),En&&(Lt.setValue(N,"toneMappingExposure",v.toneMappingExposure),ke.needsLights&&$(zn,yo),ne&&q.fog===!0&&se.refreshFogUniforms(zn,ne),se.refreshMaterialUniforms(zn,q,j,Q,p.state.transmissionRenderTarget[E.id]),qs.upload(N,k(ke),zn,Ze)),q.isShaderMaterial&&q.uniformsNeedUpdate===!0&&(qs.upload(N,k(ke),zn,Ze),q.uniformsNeedUpdate=!1),q.isSpriteMaterial&&Lt.setValue(N,"center",L.center),Lt.setValue(N,"modelViewMatrix",L.modelViewMatrix),Lt.setValue(N,"normalMatrix",L.normalMatrix),Lt.setValue(N,"modelMatrix",L.matrixWorld),q.isShaderMaterial||q.isRawShaderMaterial){let cn=q.uniformsGroups;for(let mn=0,xu=cn.length;mn<xu;mn++){let Tr=cn[mn];Ye.update(Tr,wn),Ye.bind(Tr,wn)}}return wn}function $(E,F){E.ambientLightColor.needsUpdate=F,E.lightProbe.needsUpdate=F,E.directionalLights.needsUpdate=F,E.directionalLightShadows.needsUpdate=F,E.pointLights.needsUpdate=F,E.pointLightShadows.needsUpdate=F,E.spotLights.needsUpdate=F,E.spotLightShadows.needsUpdate=F,E.rectAreaLights.needsUpdate=F,E.hemisphereLights.needsUpdate=F}function pe(E){return E.isMeshLambertMaterial||E.isMeshToonMaterial||E.isMeshPhongMaterial||E.isMeshStandardMaterial||E.isShadowMaterial||E.isShaderMaterial&&E.lights===!0}this.getActiveCubeFace=function(){return M},this.getActiveMipmapLevel=function(){return A},this.getRenderTarget=function(){return C},this.setRenderTargetTextures=function(E,F,H){let q=Ae.get(E);q.__autoAllocateDepthBuffer=E.resolveDepthBuffer===!1,q.__autoAllocateDepthBuffer===!1&&(q.__useRenderToTexture=!1),Ae.get(E.texture).__webglTexture=F,Ae.get(E.depthTexture).__webglTexture=q.__autoAllocateDepthBuffer?void 0:H,q.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(E,F){let H=Ae.get(E);H.__webglFramebuffer=F,H.__useDefaultFramebuffer=F===void 0};let ue=N.createFramebuffer();this.setRenderTarget=function(E,F=0,H=0){C=E,M=F,A=H;let q=!0,L=null,ne=!1,he=!1;if(E){let Me=Ae.get(E);if(Me.__useDefaultFramebuffer!==void 0)Ee.bindFramebuffer(N.FRAMEBUFFER,null),q=!1;else if(Me.__webglFramebuffer===void 0)Ze.setupRenderTarget(E);else if(Me.__hasExternalTextures)Ze.rebindTextures(E,Ae.get(E.texture).__webglTexture,Ae.get(E.depthTexture).__webglTexture);else if(E.depthBuffer){let Oe=E.depthTexture;if(Me.__boundDepthTexture!==Oe){if(Oe!==null&&Ae.has(Oe)&&(E.width!==Oe.image.width||E.height!==Oe.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");Ze.setupDepthRenderbuffer(E)}}let ze=E.texture;(ze.isData3DTexture||ze.isDataArrayTexture||ze.isCompressedArrayTexture)&&(he=!0);let Ve=Ae.get(E).__webglFramebuffer;E.isWebGLCubeRenderTarget?(Array.isArray(Ve[F])?L=Ve[F][H]:L=Ve[F],ne=!0):E.samples>0&&Ze.useMultisampledRTT(E)===!1?L=Ae.get(E).__webglMultisampledFramebuffer:Array.isArray(Ve)?L=Ve[H]:L=Ve,P.copy(E.viewport),z.copy(E.scissor),U=E.scissorTest}else P.copy(Z).multiplyScalar(j).floor(),z.copy(re).multiplyScalar(j).floor(),U=me;if(H!==0&&(L=ue),Ee.bindFramebuffer(N.FRAMEBUFFER,L)&&q&&Ee.drawBuffers(E,L),Ee.viewport(P),Ee.scissor(z),Ee.setScissorTest(U),ne){let Me=Ae.get(E.texture);N.framebufferTexture2D(N.FRAMEBUFFER,N.COLOR_ATTACHMENT0,N.TEXTURE_CUBE_MAP_POSITIVE_X+F,Me.__webglTexture,H)}else if(he){let Me=F;for(let ze=0;ze<E.textures.length;ze++){let Ve=Ae.get(E.textures[ze]);N.framebufferTextureLayer(N.FRAMEBUFFER,N.COLOR_ATTACHMENT0+ze,Ve.__webglTexture,H,Me)}}else if(E!==null&&H!==0){let Me=Ae.get(E.texture);N.framebufferTexture2D(N.FRAMEBUFFER,N.COLOR_ATTACHMENT0,N.TEXTURE_2D,Me.__webglTexture,H)}T=-1},this.readRenderTargetPixels=function(E,F,H,q,L,ne,he,xe=0){if(!(E&&E.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Me=Ae.get(E).__webglFramebuffer;if(E.isWebGLCubeRenderTarget&&he!==void 0&&(Me=Me[he]),Me){Ee.bindFramebuffer(N.FRAMEBUFFER,Me);try{let ze=E.textures[xe],Ve=ze.format,Oe=ze.type;if(!We.textureFormatReadable(Ve)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!We.textureTypeReadable(Oe)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}F>=0&&F<=E.width-q&&H>=0&&H<=E.height-L&&(E.textures.length>1&&N.readBuffer(N.COLOR_ATTACHMENT0+xe),N.readPixels(F,H,q,L,Ie.convert(Ve),Ie.convert(Oe),ne))}finally{let ze=C!==null?Ae.get(C).__webglFramebuffer:null;Ee.bindFramebuffer(N.FRAMEBUFFER,ze)}}},this.readRenderTargetPixelsAsync=async function(E,F,H,q,L,ne,he,xe=0){if(!(E&&E.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Me=Ae.get(E).__webglFramebuffer;if(E.isWebGLCubeRenderTarget&&he!==void 0&&(Me=Me[he]),Me)if(F>=0&&F<=E.width-q&&H>=0&&H<=E.height-L){Ee.bindFramebuffer(N.FRAMEBUFFER,Me);let ze=E.textures[xe],Ve=ze.format,Oe=ze.type;if(!We.textureFormatReadable(Ve))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!We.textureTypeReadable(Oe))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");let rt=N.createBuffer();N.bindBuffer(N.PIXEL_PACK_BUFFER,rt),N.bufferData(N.PIXEL_PACK_BUFFER,ne.byteLength,N.STREAM_READ),E.textures.length>1&&N.readBuffer(N.COLOR_ATTACHMENT0+xe),N.readPixels(F,H,q,L,Ie.convert(Ve),Ie.convert(Oe),0);let ft=C!==null?Ae.get(C).__webglFramebuffer:null;Ee.bindFramebuffer(N.FRAMEBUFFER,ft);let Ot=N.fenceSync(N.SYNC_GPU_COMMANDS_COMPLETE,0);return N.flush(),await ag(N,Ot,4),N.bindBuffer(N.PIXEL_PACK_BUFFER,rt),N.getBufferSubData(N.PIXEL_PACK_BUFFER,0,ne),N.deleteBuffer(rt),N.deleteSync(Ot),ne}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(E,F=null,H=0){let q=Math.pow(2,-H),L=Math.floor(E.image.width*q),ne=Math.floor(E.image.height*q),he=F!==null?F.x:0,xe=F!==null?F.y:0;Ze.setTexture2D(E,0),N.copyTexSubImage2D(N.TEXTURE_2D,H,0,0,he,xe,L,ne),Ee.unbindTexture()};let Ce=N.createFramebuffer(),Ft=N.createFramebuffer();this.copyTextureToTexture=function(E,F,H=null,q=null,L=0,ne=null){ne===null&&(L!==0?(Rs("WebGLRenderer: copyTextureToTexture function signature has changed to support src and dst mipmap levels."),ne=L,L=0):ne=0);let he,xe,Me,ze,Ve,Oe,rt,ft,Ot,Tt=E.isCompressedTexture?E.mipmaps[ne]:E.image;if(H!==null)he=H.max.x-H.min.x,xe=H.max.y-H.min.y,Me=H.isBox3?H.max.z-H.min.z:1,ze=H.min.x,Ve=H.min.y,Oe=H.isBox3?H.min.z:0;else{let kn=Math.pow(2,-L);he=Math.floor(Tt.width*kn),xe=Math.floor(Tt.height*kn),E.isDataArrayTexture?Me=Tt.depth:E.isData3DTexture?Me=Math.floor(Tt.depth*kn):Me=1,ze=0,Ve=0,Oe=0}q!==null?(rt=q.x,ft=q.y,Ot=q.z):(rt=0,ft=0,Ot=0);let bt=Ie.convert(F.format),ke=Ie.convert(F.type),Dt;F.isData3DTexture?(Ze.setTexture3D(F,0),Dt=N.TEXTURE_3D):F.isDataArrayTexture||F.isCompressedArrayTexture?(Ze.setTexture2DArray(F,0),Dt=N.TEXTURE_2D_ARRAY):(Ze.setTexture2D(F,0),Dt=N.TEXTURE_2D),N.pixelStorei(N.UNPACK_FLIP_Y_WEBGL,F.flipY),N.pixelStorei(N.UNPACK_PREMULTIPLY_ALPHA_WEBGL,F.premultiplyAlpha),N.pixelStorei(N.UNPACK_ALIGNMENT,F.unpackAlignment);let ct=N.getParameter(N.UNPACK_ROW_LENGTH),wn=N.getParameter(N.UNPACK_IMAGE_HEIGHT),as=N.getParameter(N.UNPACK_SKIP_PIXELS),En=N.getParameter(N.UNPACK_SKIP_ROWS),yo=N.getParameter(N.UNPACK_SKIP_IMAGES);N.pixelStorei(N.UNPACK_ROW_LENGTH,Tt.width),N.pixelStorei(N.UNPACK_IMAGE_HEIGHT,Tt.height),N.pixelStorei(N.UNPACK_SKIP_PIXELS,ze),N.pixelStorei(N.UNPACK_SKIP_ROWS,Ve),N.pixelStorei(N.UNPACK_SKIP_IMAGES,Oe);let Lt=E.isDataArrayTexture||E.isData3DTexture,zn=F.isDataArrayTexture||F.isData3DTexture;if(E.isDepthTexture){let kn=Ae.get(E),cn=Ae.get(F),mn=Ae.get(kn.__renderTarget),xu=Ae.get(cn.__renderTarget);Ee.bindFramebuffer(N.READ_FRAMEBUFFER,mn.__webglFramebuffer),Ee.bindFramebuffer(N.DRAW_FRAMEBUFFER,xu.__webglFramebuffer);for(let Tr=0;Tr<Me;Tr++)Lt&&(N.framebufferTextureLayer(N.READ_FRAMEBUFFER,N.COLOR_ATTACHMENT0,Ae.get(E).__webglTexture,L,Oe+Tr),N.framebufferTextureLayer(N.DRAW_FRAMEBUFFER,N.COLOR_ATTACHMENT0,Ae.get(F).__webglTexture,ne,Ot+Tr)),N.blitFramebuffer(ze,Ve,he,xe,rt,ft,he,xe,N.DEPTH_BUFFER_BIT,N.NEAREST);Ee.bindFramebuffer(N.READ_FRAMEBUFFER,null),Ee.bindFramebuffer(N.DRAW_FRAMEBUFFER,null)}else if(L!==0||E.isRenderTargetTexture||Ae.has(E)){let kn=Ae.get(E),cn=Ae.get(F);Ee.bindFramebuffer(N.READ_FRAMEBUFFER,Ce),Ee.bindFramebuffer(N.DRAW_FRAMEBUFFER,Ft);for(let mn=0;mn<Me;mn++)Lt?N.framebufferTextureLayer(N.READ_FRAMEBUFFER,N.COLOR_ATTACHMENT0,kn.__webglTexture,L,Oe+mn):N.framebufferTexture2D(N.READ_FRAMEBUFFER,N.COLOR_ATTACHMENT0,N.TEXTURE_2D,kn.__webglTexture,L),zn?N.framebufferTextureLayer(N.DRAW_FRAMEBUFFER,N.COLOR_ATTACHMENT0,cn.__webglTexture,ne,Ot+mn):N.framebufferTexture2D(N.DRAW_FRAMEBUFFER,N.COLOR_ATTACHMENT0,N.TEXTURE_2D,cn.__webglTexture,ne),L!==0?N.blitFramebuffer(ze,Ve,he,xe,rt,ft,he,xe,N.COLOR_BUFFER_BIT,N.NEAREST):zn?N.copyTexSubImage3D(Dt,ne,rt,ft,Ot+mn,ze,Ve,he,xe):N.copyTexSubImage2D(Dt,ne,rt,ft,ze,Ve,he,xe);Ee.bindFramebuffer(N.READ_FRAMEBUFFER,null),Ee.bindFramebuffer(N.DRAW_FRAMEBUFFER,null)}else zn?E.isDataTexture||E.isData3DTexture?N.texSubImage3D(Dt,ne,rt,ft,Ot,he,xe,Me,bt,ke,Tt.data):F.isCompressedArrayTexture?N.compressedTexSubImage3D(Dt,ne,rt,ft,Ot,he,xe,Me,bt,Tt.data):N.texSubImage3D(Dt,ne,rt,ft,Ot,he,xe,Me,bt,ke,Tt):E.isDataTexture?N.texSubImage2D(N.TEXTURE_2D,ne,rt,ft,he,xe,bt,ke,Tt.data):E.isCompressedTexture?N.compressedTexSubImage2D(N.TEXTURE_2D,ne,rt,ft,Tt.width,Tt.height,bt,Tt.data):N.texSubImage2D(N.TEXTURE_2D,ne,rt,ft,he,xe,bt,ke,Tt);N.pixelStorei(N.UNPACK_ROW_LENGTH,ct),N.pixelStorei(N.UNPACK_IMAGE_HEIGHT,wn),N.pixelStorei(N.UNPACK_SKIP_PIXELS,as),N.pixelStorei(N.UNPACK_SKIP_ROWS,En),N.pixelStorei(N.UNPACK_SKIP_IMAGES,yo),ne===0&&F.generateMipmaps&&N.generateMipmap(Dt),Ee.unbindTexture()},this.initRenderTarget=function(E){Ae.get(E).__webglFramebuffer===void 0&&Ze.setupRenderTarget(E)},this.initTexture=function(E){E.isCubeTexture?Ze.setTextureCube(E,0):E.isData3DTexture?Ze.setTexture3D(E,0):E.isDataArrayTexture||E.isCompressedArrayTexture?Ze.setTexture2DArray(E,0):Ze.setTexture2D(E,0),Ee.unbindTexture()},this.resetState=function(){M=0,A=0,C=null,Ee.reset(),_e.reset()},typeof __THREE_DEVTOOLS__!="undefined"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return ni}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;let n=this.getContext();n.drawingBufferColorSpace=st._getDrawingBufferColorSpace(e),n.unpackColorSpace=st._getUnpackColorSpace()}};var $s=new _n,Wi=new ie,kg=new R,Xf=new ie,lh=new ie,hh=new R,$f=new R,Bg=new qe,Vg=new R,Hg=new R,on=null,Si=null,ji=[],hr={NONE:-1,PAN:0,ROTATE:1},uh=class extends In{constructor(e,n,i=null){super(n,i),this.objects=e,this.recursive=!0,this.transformGroup=!1,this.rotateSpeed=1,this.raycaster=new Bi,this.mouseButtons={LEFT:Ut.PAN,MIDDLE:Ut.PAN,RIGHT:Ut.ROTATE},this.touches={ONE:jn.PAN},this._onPointerMove=RE.bind(this),this._onPointerDown=PE.bind(this),this._onPointerCancel=IE.bind(this),this._onContextMenu=DE.bind(this),i!==null&&this.connect(i)}connect(e){super.connect(e),this.domElement.addEventListener("pointermove",this._onPointerMove),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointerup",this._onPointerCancel),this.domElement.addEventListener("pointerleave",this._onPointerCancel),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.style.touchAction="none"}disconnect(){this.domElement.removeEventListener("pointermove",this._onPointerMove),this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.removeEventListener("pointerup",this._onPointerCancel),this.domElement.removeEventListener("pointerleave",this._onPointerCancel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.domElement.style.touchAction="auto",this.domElement.style.cursor=""}dispose(){this.disconnect()}_updatePointer(e){let n=this.domElement.getBoundingClientRect();Wi.x=(e.clientX-n.left)/n.width*2-1,Wi.y=-(e.clientY-n.top)/n.height*2+1}_updateState(e){let n;if(e.pointerType==="touch")n=this.touches.ONE;else switch(e.button){case 0:n=this.mouseButtons.LEFT;break;case 1:n=this.mouseButtons.MIDDLE;break;case 2:n=this.mouseButtons.RIGHT;break;default:n=null}switch(n){case Ut.PAN:case jn.PAN:this.state=hr.PAN;break;case Ut.ROTATE:case jn.ROTATE:this.state=hr.ROTATE;break;default:this.state=hr.NONE}}};function RE(t){let e=this.object,n=this.domElement,i=this.raycaster;if(this.enabled!==!1){if(this._updatePointer(t),i.setFromCamera(Wi,e),on)this.state===hr.PAN?i.ray.intersectPlane($s,hh)&&(on.position.copy(hh.sub(kg).applyMatrix4(Bg)),this.dispatchEvent({type:"drag",object:on})):this.state===hr.ROTATE&&(Xf.subVectors(Wi,lh).multiplyScalar(this.rotateSpeed),on.rotateOnWorldAxis(Vg,Xf.x),on.rotateOnWorldAxis(Hg.normalize(),-Xf.y),this.dispatchEvent({type:"drag",object:on})),lh.copy(Wi);else if(t.pointerType==="mouse"||t.pointerType==="pen")if(ji.length=0,i.setFromCamera(Wi,e),i.intersectObjects(this.objects,this.recursive,ji),ji.length>0){let r=ji[0].object;$s.setFromNormalAndCoplanarPoint(e.getWorldDirection($s.normal),$f.setFromMatrixPosition(r.matrixWorld)),Si!==r&&Si!==null&&(this.dispatchEvent({type:"hoveroff",object:Si}),n.style.cursor="auto",Si=null),Si!==r&&(this.dispatchEvent({type:"hoveron",object:r}),n.style.cursor="pointer",Si=r)}else Si!==null&&(this.dispatchEvent({type:"hoveroff",object:Si}),n.style.cursor="auto",Si=null);lh.copy(Wi)}}function PE(t){let e=this.object,n=this.domElement,i=this.raycaster;this.enabled!==!1&&(this._updatePointer(t),this._updateState(t),ji.length=0,i.setFromCamera(Wi,e),i.intersectObjects(this.objects,this.recursive,ji),ji.length>0&&(this.transformGroup===!0?on=Gg(ji[0].object):on=ji[0].object,$s.setFromNormalAndCoplanarPoint(e.getWorldDirection($s.normal),$f.setFromMatrixPosition(on.matrixWorld)),i.ray.intersectPlane($s,hh)&&(this.state===hr.PAN?(Bg.copy(on.parent.matrixWorld).invert(),kg.copy(hh).sub($f.setFromMatrixPosition(on.matrixWorld)),n.style.cursor="move",this.dispatchEvent({type:"dragstart",object:on})):this.state===hr.ROTATE&&(Vg.set(0,1,0).applyQuaternion(e.quaternion).normalize(),Hg.set(1,0,0).applyQuaternion(e.quaternion).normalize(),n.style.cursor="move",this.dispatchEvent({type:"dragstart",object:on})))),lh.copy(Wi))}function IE(){this.enabled!==!1&&(on&&(this.dispatchEvent({type:"dragend",object:on}),on=null),this.domElement.style.cursor=Si?"pointer":"auto",this.state=hr.NONE)}function DE(t){this.enabled!==!1&&t.preventDefault()}function Gg(t,e=null){return t.isGroup&&(e=t),t.parent===null?e:Gg(t.parent,e)}function Yf(t,e,n){var i,r=1;t==null&&(t=0),e==null&&(e=0),n==null&&(n=0);function s(){var o,a=i.length,c,l=0,u=0,h=0;for(o=0;o<a;++o)c=i[o],l+=c.x||0,u+=c.y||0,h+=c.z||0;for(l=(l/a-t)*r,u=(u/a-e)*r,h=(h/a-n)*r,o=0;o<a;++o)c=i[o],l&&(c.x-=l),u&&(c.y-=u),h&&(c.z-=h)}return s.initialize=function(o){i=o},s.x=function(o){return arguments.length?(t=+o,s):t},s.y=function(o){return arguments.length?(e=+o,s):e},s.z=function(o){return arguments.length?(n=+o,s):n},s.strength=function(o){return arguments.length?(r=+o,s):r},s}function Wg(t){let e=+this._x.call(null,t);return jg(this.cover(e),e,t)}function jg(t,e,n){if(isNaN(e))return t;var i,r=t._root,s={data:n},o=t._x0,a=t._x1,c,l,u,h,f;if(!r)return t._root=s,t;for(;r.length;)if((u=e>=(c=(o+a)/2))?o=c:a=c,i=r,!(r=r[h=+u]))return i[h]=s,t;if(l=+t._x.call(null,r.data),e===l)return s.next=r,i?i[h]=s:t._root=s,t;do i=i?i[h]=new Array(2):t._root=new Array(2),(u=e>=(c=(o+a)/2))?o=c:a=c;while((h=+u)==(f=+(l>=c)));return i[f]=r,i[h]=s,t}function qg(t){Array.isArray(t)||(t=Array.from(t));let e=t.length,n=new Float64Array(e),i=1/0,r=-1/0;for(let s=0,o;s<e;++s)isNaN(o=+this._x.call(null,t[s]))||(n[s]=o,o<i&&(i=o),o>r&&(r=o));if(i>r)return this;this.cover(i).cover(r);for(let s=0;s<e;++s)jg(this,n[s],t[s]);return this}function Xg(t){if(isNaN(t=+t))return this;var e=this._x0,n=this._x1;if(isNaN(e))n=(e=Math.floor(t))+1;else{for(var i=n-e||1,r=this._root,s,o;e>t||t>=n;)switch(o=+(t<e),s=new Array(2),s[o]=r,r=s,i*=2,o){case 0:n=e+i;break;case 1:e=n-i;break}this._root&&this._root.length&&(this._root=r)}return this._x0=e,this._x1=n,this}function $g(){var t=[];return this.visit(function(e){if(!e.length)do t.push(e.data);while(e=e.next)}),t}function Yg(t){return arguments.length?this.cover(+t[0][0]).cover(+t[1][0]):isNaN(this._x0)?void 0:[[this._x0],[this._x1]]}function $n(t,e,n){this.node=t,this.x0=e,this.x1=n}function Zg(t,e){var n,i=this._x0,r,s,o=this._x1,a=[],c=this._root,l,u;for(c&&a.push(new $n(c,i,o)),e==null?e=1/0:(i=t-e,o=t+e);l=a.pop();)if(!(!(c=l.node)||(r=l.x0)>o||(s=l.x1)<i))if(c.length){var h=(r+s)/2;a.push(new $n(c[1],h,s),new $n(c[0],r,h)),(u=+(t>=h))&&(l=a[a.length-1],a[a.length-1]=a[a.length-1-u],a[a.length-1-u]=l)}else{var f=Math.abs(t-+this._x.call(null,c.data));f<e&&(e=f,i=t-f,o=t+f,n=c.data)}return n}function Kg(t){if(isNaN(c=+this._x.call(null,t)))return this;var e,n=this._root,i,r,s,o=this._x0,a=this._x1,c,l,u,h,f;if(!n)return this;if(n.length)for(;;){if((u=c>=(l=(o+a)/2))?o=l:a=l,e=n,!(n=n[h=+u]))return this;if(!n.length)break;e[h+1&1]&&(i=e,f=h)}for(;n.data!==t;)if(r=n,!(n=n.next))return this;return(s=n.next)&&delete n.next,r?(s?r.next=s:delete r.next,this):e?(s?e[h]=s:delete e[h],(n=e[0]||e[1])&&n===(e[1]||e[0])&&!n.length&&(i?i[f]=n:this._root=n),this):(this._root=s,this)}function Jg(t){for(var e=0,n=t.length;e<n;++e)this.remove(t[e]);return this}function Qg(){return this._root}function e0(){var t=0;return this.visit(function(e){if(!e.length)do++t;while(e=e.next)}),t}function t0(t){var e=[],n,i=this._root,r,s,o;for(i&&e.push(new $n(i,this._x0,this._x1));n=e.pop();)if(!t(i=n.node,s=n.x0,o=n.x1)&&i.length){var a=(s+o)/2;(r=i[1])&&e.push(new $n(r,a,o)),(r=i[0])&&e.push(new $n(r,s,a))}return this}function n0(t){var e=[],n=[],i;for(this._root&&e.push(new $n(this._root,this._x0,this._x1));i=e.pop();){var r=i.node;if(r.length){var s,o=i.x0,a=i.x1,c=(o+a)/2;(s=r[0])&&e.push(new $n(s,o,c)),(s=r[1])&&e.push(new $n(s,c,a))}n.push(i)}for(;i=n.pop();)t(i.node,i.x0,i.x1);return this}function i0(t){return t[0]}function r0(t){return arguments.length?(this._x=t,this):this._x}function ma(t,e){var n=new Zf(e==null?i0:e,NaN,NaN);return t==null?n:n.addAll(t)}function Zf(t,e,n){this._x=t,this._x0=e,this._x1=n,this._root=void 0}function s0(t){for(var e={data:t.data},n=e;t=t.next;)n=n.next={data:t.data};return e}var yn=ma.prototype=Zf.prototype;yn.copy=function(){var t=new Zf(this._x,this._x0,this._x1),e=this._root,n,i;if(!e)return t;if(!e.length)return t._root=s0(e),t;for(n=[{source:e,target:t._root=new Array(2)}];e=n.pop();)for(var r=0;r<2;++r)(i=e.source[r])&&(i.length?n.push({source:i,target:e.target[r]=new Array(2)}):e.target[r]=s0(i));return t};yn.add=Wg;yn.addAll=qg;yn.cover=Xg;yn.data=$g;yn.extent=Yg;yn.find=Zg;yn.remove=Kg;yn.removeAll=Jg;yn.root=Qg;yn.size=e0;yn.visit=t0;yn.visitAfter=n0;yn.x=r0;function LE(t){let e=+this._x.call(null,t),n=+this._y.call(null,t);return a0(this.cover(e,n),e,n,t)}function a0(t,e,n,i){if(isNaN(e)||isNaN(n))return t;var r,s=t._root,o={data:i},a=t._x0,c=t._y0,l=t._x1,u=t._y1,h,f,d,m,_,g,p,x;if(!s)return t._root=o,t;for(;s.length;)if((_=e>=(h=(a+l)/2))?a=h:l=h,(g=n>=(f=(c+u)/2))?c=f:u=f,r=s,!(s=s[p=g<<1|_]))return r[p]=o,t;if(d=+t._x.call(null,s.data),m=+t._y.call(null,s.data),e===d&&n===m)return o.next=s,r?r[p]=o:t._root=o,t;do r=r?r[p]=new Array(4):t._root=new Array(4),(_=e>=(h=(a+l)/2))?a=h:l=h,(g=n>=(f=(c+u)/2))?c=f:u=f;while((p=g<<1|_)===(x=(m>=f)<<1|d>=h));return r[x]=s,r[p]=o,t}function OE(t){Array.isArray(t)||(t=Array.from(t));let e=t.length,n=new Float64Array(e),i=new Float64Array(e),r=1/0,s=r,o=-r,a=o;for(let c=0,l,u,h;c<e;++c){if(isNaN(u=+this._x.call(null,l=t[c]))||isNaN(h=+this._y.call(null,l))){n[c]=NaN;continue}n[c]=u,i[c]=h,u<r&&(r=u),u>o&&(o=u),h<s&&(s=h),h>a&&(a=h)}if(r>o||s>a)return this;this.cover(r,s).cover(o,a);for(let c=0;c<e;++c)a0(this,n[c],i[c],t[c]);return this}function NE(t,e){if(isNaN(t=+t)||isNaN(e=+e))return this;var n=this._x0,i=this._y0,r=this._x1,s=this._y1;if(isNaN(n))r=(n=Math.floor(t))+1,s=(i=Math.floor(e))+1;else{for(var o=r-n||1,a=this._root,c,l;n>t||t>=r||i>e||e>=s;)switch(l=(e<i)<<1|t<n,c=new Array(4),c[l]=a,a=c,o*=2,l){case 0:r=n+o,s=i+o;break;case 1:n=r-o,s=i+o;break;case 2:r=n+o,i=s-o;break;case 3:n=r-o,i=s-o;break}this._root&&this._root.length&&(this._root=a)}return this._x0=n,this._y0=i,this._x1=r,this._y1=s,this}function FE(){var t=[];return this.visit(function(e){if(!e.length)do t.push(e.data);while(e=e.next)}),t}function UE(t){return arguments.length?this.cover(+t[0][0],+t[0][1]).cover(+t[1][0],+t[1][1]):isNaN(this._x0)?void 0:[[this._x0,this._y0],[this._x1,this._y1]]}function un(t,e,n,i,r){this.node=t,this.x0=e,this.y0=n,this.x1=i,this.y1=r}function zE(t,e,n){var i,r=this._x0,s=this._y0,o,a,c,l,u=this._x1,h=this._y1,f=[],d=this._root,m,_;for(d&&f.push(new un(d,r,s,u,h)),n==null?n=1/0:(r=t-n,s=e-n,u=t+n,h=e+n,n*=n);m=f.pop();)if(!(!(d=m.node)||(o=m.x0)>u||(a=m.y0)>h||(c=m.x1)<r||(l=m.y1)<s))if(d.length){var g=(o+c)/2,p=(a+l)/2;f.push(new un(d[3],g,p,c,l),new un(d[2],o,p,g,l),new un(d[1],g,a,c,p),new un(d[0],o,a,g,p)),(_=(e>=p)<<1|t>=g)&&(m=f[f.length-1],f[f.length-1]=f[f.length-1-_],f[f.length-1-_]=m)}else{var x=t-+this._x.call(null,d.data),y=e-+this._y.call(null,d.data),v=x*x+y*y;if(v<n){var b=Math.sqrt(n=v);r=t-b,s=e-b,u=t+b,h=e+b,i=d.data}}return i}function kE(t){if(isNaN(u=+this._x.call(null,t))||isNaN(h=+this._y.call(null,t)))return this;var e,n=this._root,i,r,s,o=this._x0,a=this._y0,c=this._x1,l=this._y1,u,h,f,d,m,_,g,p;if(!n)return this;if(n.length)for(;;){if((m=u>=(f=(o+c)/2))?o=f:c=f,(_=h>=(d=(a+l)/2))?a=d:l=d,e=n,!(n=n[g=_<<1|m]))return this;if(!n.length)break;(e[g+1&3]||e[g+2&3]||e[g+3&3])&&(i=e,p=g)}for(;n.data!==t;)if(r=n,!(n=n.next))return this;return(s=n.next)&&delete n.next,r?(s?r.next=s:delete r.next,this):e?(s?e[g]=s:delete e[g],(n=e[0]||e[1]||e[2]||e[3])&&n===(e[3]||e[2]||e[1]||e[0])&&!n.length&&(i?i[p]=n:this._root=n),this):(this._root=s,this)}function BE(t){for(var e=0,n=t.length;e<n;++e)this.remove(t[e]);return this}function VE(){return this._root}function HE(){var t=0;return this.visit(function(e){if(!e.length)do++t;while(e=e.next)}),t}function GE(t){var e=[],n,i=this._root,r,s,o,a,c;for(i&&e.push(new un(i,this._x0,this._y0,this._x1,this._y1));n=e.pop();)if(!t(i=n.node,s=n.x0,o=n.y0,a=n.x1,c=n.y1)&&i.length){var l=(s+a)/2,u=(o+c)/2;(r=i[3])&&e.push(new un(r,l,u,a,c)),(r=i[2])&&e.push(new un(r,s,u,l,c)),(r=i[1])&&e.push(new un(r,l,o,a,u)),(r=i[0])&&e.push(new un(r,s,o,l,u))}return this}function WE(t){var e=[],n=[],i;for(this._root&&e.push(new un(this._root,this._x0,this._y0,this._x1,this._y1));i=e.pop();){var r=i.node;if(r.length){var s,o=i.x0,a=i.y0,c=i.x1,l=i.y1,u=(o+c)/2,h=(a+l)/2;(s=r[0])&&e.push(new un(s,o,a,u,h)),(s=r[1])&&e.push(new un(s,u,a,c,h)),(s=r[2])&&e.push(new un(s,o,h,u,l)),(s=r[3])&&e.push(new un(s,u,h,c,l))}n.push(i)}for(;i=n.pop();)t(i.node,i.x0,i.y0,i.x1,i.y1);return this}function jE(t){return t[0]}function qE(t){return arguments.length?(this._x=t,this):this._x}function XE(t){return t[1]}function $E(t){return arguments.length?(this._y=t,this):this._y}function Kf(t,e,n){var i=new Jf(e==null?jE:e,n==null?XE:n,NaN,NaN,NaN,NaN);return t==null?i:i.addAll(t)}function Jf(t,e,n,i,r,s){this._x=t,this._y=e,this._x0=n,this._y0=i,this._x1=r,this._y1=s,this._root=void 0}function o0(t){for(var e={data:t.data},n=e;t=t.next;)n=n.next={data:t.data};return e}var fn=Kf.prototype=Jf.prototype;fn.copy=function(){var t=new Jf(this._x,this._y,this._x0,this._y0,this._x1,this._y1),e=this._root,n,i;if(!e)return t;if(!e.length)return t._root=o0(e),t;for(n=[{source:e,target:t._root=new Array(4)}];e=n.pop();)for(var r=0;r<4;++r)(i=e.source[r])&&(i.length?n.push({source:i,target:e.target[r]=new Array(4)}):e.target[r]=o0(i));return t};fn.add=LE;fn.addAll=OE;fn.cover=NE;fn.data=FE;fn.extent=UE;fn.find=zE;fn.remove=kE;fn.removeAll=BE;fn.root=VE;fn.size=HE;fn.visit=GE;fn.visitAfter=WE;fn.x=qE;fn.y=$E;function c0(t){let e=+this._x.call(null,t),n=+this._y.call(null,t),i=+this._z.call(null,t);return l0(this.cover(e,n,i),e,n,i,t)}function l0(t,e,n,i,r){if(isNaN(e)||isNaN(n)||isNaN(i))return t;var s,o=t._root,a={data:r},c=t._x0,l=t._y0,u=t._z0,h=t._x1,f=t._y1,d=t._z1,m,_,g,p,x,y,v,b,M,A,C;if(!o)return t._root=a,t;for(;o.length;)if((v=e>=(m=(c+h)/2))?c=m:h=m,(b=n>=(_=(l+f)/2))?l=_:f=_,(M=i>=(g=(u+d)/2))?u=g:d=g,s=o,!(o=o[A=M<<2|b<<1|v]))return s[A]=a,t;if(p=+t._x.call(null,o.data),x=+t._y.call(null,o.data),y=+t._z.call(null,o.data),e===p&&n===x&&i===y)return a.next=o,s?s[A]=a:t._root=a,t;do s=s?s[A]=new Array(8):t._root=new Array(8),(v=e>=(m=(c+h)/2))?c=m:h=m,(b=n>=(_=(l+f)/2))?l=_:f=_,(M=i>=(g=(u+d)/2))?u=g:d=g;while((A=M<<2|b<<1|v)===(C=(y>=g)<<2|(x>=_)<<1|p>=m));return s[C]=o,s[A]=a,t}function h0(t){Array.isArray(t)||(t=Array.from(t));let e=t.length,n=new Float64Array(e),i=new Float64Array(e),r=new Float64Array(e),s=1/0,o=1/0,a=1/0,c=-1/0,l=-1/0,u=-1/0;for(let h=0,f,d,m,_;h<e;++h)isNaN(d=+this._x.call(null,f=t[h]))||isNaN(m=+this._y.call(null,f))||isNaN(_=+this._z.call(null,f))||(n[h]=d,i[h]=m,r[h]=_,d<s&&(s=d),d>c&&(c=d),m<o&&(o=m),m>l&&(l=m),_<a&&(a=_),_>u&&(u=_));if(s>c||o>l||a>u)return this;this.cover(s,o,a).cover(c,l,u);for(let h=0;h<e;++h)l0(this,n[h],i[h],r[h],t[h]);return this}function u0(t,e,n){if(isNaN(t=+t)||isNaN(e=+e)||isNaN(n=+n))return this;var i=this._x0,r=this._y0,s=this._z0,o=this._x1,a=this._y1,c=this._z1;if(isNaN(i))o=(i=Math.floor(t))+1,a=(r=Math.floor(e))+1,c=(s=Math.floor(n))+1;else{for(var l=o-i||1,u=this._root,h,f;i>t||t>=o||r>e||e>=a||s>n||n>=c;)switch(f=(n<s)<<2|(e<r)<<1|t<i,h=new Array(8),h[f]=u,u=h,l*=2,f){case 0:o=i+l,a=r+l,c=s+l;break;case 1:i=o-l,a=r+l,c=s+l;break;case 2:o=i+l,r=a-l,c=s+l;break;case 3:i=o-l,r=a-l,c=s+l;break;case 4:o=i+l,a=r+l,s=c-l;break;case 5:i=o-l,a=r+l,s=c-l;break;case 6:o=i+l,r=a-l,s=c-l;break;case 7:i=o-l,r=a-l,s=c-l;break}this._root&&this._root.length&&(this._root=u)}return this._x0=i,this._y0=r,this._z0=s,this._x1=o,this._y1=a,this._z1=c,this}function f0(){var t=[];return this.visit(function(e){if(!e.length)do t.push(e.data);while(e=e.next)}),t}function d0(t){return arguments.length?this.cover(+t[0][0],+t[0][1],+t[0][2]).cover(+t[1][0],+t[1][1],+t[1][2]):isNaN(this._x0)?void 0:[[this._x0,this._y0,this._z0],[this._x1,this._y1,this._z1]]}function dt(t,e,n,i,r,s,o){this.node=t,this.x0=e,this.y0=n,this.z0=i,this.x1=r,this.y1=s,this.z1=o}function p0(t,e,n,i){var r,s=this._x0,o=this._y0,a=this._z0,c,l,u,h,f,d,m=this._x1,_=this._y1,g=this._z1,p=[],x=this._root,y,v;for(x&&p.push(new dt(x,s,o,a,m,_,g)),i==null?i=1/0:(s=t-i,o=e-i,a=n-i,m=t+i,_=e+i,g=n+i,i*=i);y=p.pop();)if(!(!(x=y.node)||(c=y.x0)>m||(l=y.y0)>_||(u=y.z0)>g||(h=y.x1)<s||(f=y.y1)<o||(d=y.z1)<a))if(x.length){var b=(c+h)/2,M=(l+f)/2,A=(u+d)/2;p.push(new dt(x[7],b,M,A,h,f,d),new dt(x[6],c,M,A,b,f,d),new dt(x[5],b,l,A,h,M,d),new dt(x[4],c,l,A,b,M,d),new dt(x[3],b,M,u,h,f,A),new dt(x[2],c,M,u,b,f,A),new dt(x[1],b,l,u,h,M,A),new dt(x[0],c,l,u,b,M,A)),(v=(n>=A)<<2|(e>=M)<<1|t>=b)&&(y=p[p.length-1],p[p.length-1]=p[p.length-1-v],p[p.length-1-v]=y)}else{var C=t-+this._x.call(null,x.data),T=e-+this._y.call(null,x.data),w=n-+this._z.call(null,x.data),P=C*C+T*T+w*w;if(P<i){var z=Math.sqrt(i=P);s=t-z,o=e-z,a=n-z,m=t+z,_=e+z,g=n+z,r=x.data}}return r}var YE=(t,e,n,i,r,s)=>Math.sqrt((t-i)**2+(e-r)**2+(n-s)**2);function m0(t,e,n,i){let r=[],s=t-i,o=e-i,a=n-i,c=t+i,l=e+i,u=n+i;return this.visit((h,f,d,m,_,g,p)=>{if(!h.length)do{let x=h.data;YE(t,e,n,this._x(x),this._y(x),this._z(x))<=i&&r.push(x)}while(h=h.next);return f>c||d>l||m>u||_<s||g<o||p<a}),r}function g0(t){if(isNaN(f=+this._x.call(null,t))||isNaN(d=+this._y.call(null,t))||isNaN(m=+this._z.call(null,t)))return this;var e,n=this._root,i,r,s,o=this._x0,a=this._y0,c=this._z0,l=this._x1,u=this._y1,h=this._z1,f,d,m,_,g,p,x,y,v,b,M;if(!n)return this;if(n.length)for(;;){if((x=f>=(_=(o+l)/2))?o=_:l=_,(y=d>=(g=(a+u)/2))?a=g:u=g,(v=m>=(p=(c+h)/2))?c=p:h=p,e=n,!(n=n[b=v<<2|y<<1|x]))return this;if(!n.length)break;(e[b+1&7]||e[b+2&7]||e[b+3&7]||e[b+4&7]||e[b+5&7]||e[b+6&7]||e[b+7&7])&&(i=e,M=b)}for(;n.data!==t;)if(r=n,!(n=n.next))return this;return(s=n.next)&&delete n.next,r?(s?r.next=s:delete r.next,this):e?(s?e[b]=s:delete e[b],(n=e[0]||e[1]||e[2]||e[3]||e[4]||e[5]||e[6]||e[7])&&n===(e[7]||e[6]||e[5]||e[4]||e[3]||e[2]||e[1]||e[0])&&!n.length&&(i?i[M]=n:this._root=n),this):(this._root=s,this)}function _0(t){for(var e=0,n=t.length;e<n;++e)this.remove(t[e]);return this}function v0(){return this._root}function y0(){var t=0;return this.visit(function(e){if(!e.length)do++t;while(e=e.next)}),t}function x0(t){var e=[],n,i=this._root,r,s,o,a,c,l,u;for(i&&e.push(new dt(i,this._x0,this._y0,this._z0,this._x1,this._y1,this._z1));n=e.pop();)if(!t(i=n.node,s=n.x0,o=n.y0,a=n.z0,c=n.x1,l=n.y1,u=n.z1)&&i.length){var h=(s+c)/2,f=(o+l)/2,d=(a+u)/2;(r=i[7])&&e.push(new dt(r,h,f,d,c,l,u)),(r=i[6])&&e.push(new dt(r,s,f,d,h,l,u)),(r=i[5])&&e.push(new dt(r,h,o,d,c,f,u)),(r=i[4])&&e.push(new dt(r,s,o,d,h,f,u)),(r=i[3])&&e.push(new dt(r,h,f,a,c,l,d)),(r=i[2])&&e.push(new dt(r,s,f,a,h,l,d)),(r=i[1])&&e.push(new dt(r,h,o,a,c,f,d)),(r=i[0])&&e.push(new dt(r,s,o,a,h,f,d))}return this}function b0(t){var e=[],n=[],i;for(this._root&&e.push(new dt(this._root,this._x0,this._y0,this._z0,this._x1,this._y1,this._z1));i=e.pop();){var r=i.node;if(r.length){var s,o=i.x0,a=i.y0,c=i.z0,l=i.x1,u=i.y1,h=i.z1,f=(o+l)/2,d=(a+u)/2,m=(c+h)/2;(s=r[0])&&e.push(new dt(s,o,a,c,f,d,m)),(s=r[1])&&e.push(new dt(s,f,a,c,l,d,m)),(s=r[2])&&e.push(new dt(s,o,d,c,f,u,m)),(s=r[3])&&e.push(new dt(s,f,d,c,l,u,m)),(s=r[4])&&e.push(new dt(s,o,a,m,f,d,h)),(s=r[5])&&e.push(new dt(s,f,a,m,l,d,h)),(s=r[6])&&e.push(new dt(s,o,d,m,f,u,h)),(s=r[7])&&e.push(new dt(s,f,d,m,l,u,h))}n.push(i)}for(;i=n.pop();)t(i.node,i.x0,i.y0,i.z0,i.x1,i.y1,i.z1);return this}function M0(t){return t[0]}function S0(t){return arguments.length?(this._x=t,this):this._x}function w0(t){return t[1]}function E0(t){return arguments.length?(this._y=t,this):this._y}function T0(t){return t[2]}function A0(t){return arguments.length?(this._z=t,this):this._z}function ga(t,e,n,i){var r=new Qf(e==null?M0:e,n==null?w0:n,i==null?T0:i,NaN,NaN,NaN,NaN,NaN,NaN);return t==null?r:r.addAll(t)}function Qf(t,e,n,i,r,s,o,a,c){this._x=t,this._y=e,this._z=n,this._x0=i,this._y0=r,this._z0=s,this._x1=o,this._y1=a,this._z1=c,this._root=void 0}function C0(t){for(var e={data:t.data},n=e;t=t.next;)n=n.next={data:t.data};return e}var Jt=ga.prototype=Qf.prototype;Jt.copy=function(){var t=new Qf(this._x,this._y,this._z,this._x0,this._y0,this._z0,this._x1,this._y1,this._z1),e=this._root,n,i;if(!e)return t;if(!e.length)return t._root=C0(e),t;for(n=[{source:e,target:t._root=new Array(8)}];e=n.pop();)for(var r=0;r<8;++r)(i=e.source[r])&&(i.length?n.push({source:i,target:e.target[r]=new Array(8)}):e.target[r]=C0(i));return t};Jt.add=c0;Jt.addAll=h0;Jt.cover=u0;Jt.data=f0;Jt.extent=d0;Jt.find=p0;Jt.findAllWithinRadius=m0;Jt.remove=g0;Jt.removeAll=_0;Jt.root=v0;Jt.size=y0;Jt.visit=x0;Jt.visitAfter=b0;Jt.x=S0;Jt.y=E0;Jt.z=A0;function Yn(t){return function(){return t}}function ai(t){return(t()-.5)*1e-6}function ZE(t){return t.index}function R0(t,e){var n=t.get(e);if(!n)throw new Error("node not found: "+e);return n}function ed(t){var e=ZE,n=f,i,r=Yn(30),s,o,a,c,l,u,h=1;t==null&&(t=[]);function f(p){return 1/Math.min(c[p.source.index],c[p.target.index])}function d(p){for(var x=0,y=t.length;x<h;++x)for(var v=0,b,M,A,C=0,T=0,w=0,P,z;v<y;++v)b=t[v],M=b.source,A=b.target,C=A.x+A.vx-M.x-M.vx||ai(u),a>1&&(T=A.y+A.vy-M.y-M.vy||ai(u)),a>2&&(w=A.z+A.vz-M.z-M.vz||ai(u)),P=Math.sqrt(C*C+T*T+w*w),P=(P-s[v])/P*p*i[v],C*=P,T*=P,w*=P,A.vx-=C*(z=l[v]),a>1&&(A.vy-=T*z),a>2&&(A.vz-=w*z),M.vx+=C*(z=1-z),a>1&&(M.vy+=T*z),a>2&&(M.vz+=w*z)}function m(){if(o){var p,x=o.length,y=t.length,v=new Map(o.map((M,A)=>[e(M,A,o),M])),b;for(p=0,c=new Array(x);p<y;++p)b=t[p],b.index=p,typeof b.source!="object"&&(b.source=R0(v,b.source)),typeof b.target!="object"&&(b.target=R0(v,b.target)),c[b.source.index]=(c[b.source.index]||0)+1,c[b.target.index]=(c[b.target.index]||0)+1;for(p=0,l=new Array(y);p<y;++p)b=t[p],l[p]=c[b.source.index]/(c[b.source.index]+c[b.target.index]);i=new Array(y),_(),s=new Array(y),g()}}function _(){if(o)for(var p=0,x=t.length;p<x;++p)i[p]=+n(t[p],p,t)}function g(){if(o)for(var p=0,x=t.length;p<x;++p)s[p]=+r(t[p],p,t)}return d.initialize=function(p,...x){o=p,u=x.find(y=>typeof y=="function")||Math.random,a=x.find(y=>[1,2,3].includes(y))||2,m()},d.links=function(p){return arguments.length?(t=p,m(),d):t},d.id=function(p){return arguments.length?(e=p,d):e},d.iterations=function(p){return arguments.length?(h=+p,d):h},d.strength=function(p){return arguments.length?(n=typeof p=="function"?p:Yn(+p),_(),d):n},d.distance=function(p){return arguments.length?(r=typeof p=="function"?p:Yn(+p),g(),d):r},d}var KE={value:()=>{}};function td(){for(var t=0,e=arguments.length,n={},i;t<e;++t){if(!(i=arguments[t]+"")||i in n||/[\s.]/.test(i))throw new Error("illegal type: "+i);n[i]=[]}return new fh(n)}function fh(t){this._=t}function JE(t,e){return t.trim().split(/^|\s+/).map(function(n){var i="",r=n.indexOf(".");if(r>=0&&(i=n.slice(r+1),n=n.slice(0,r)),n&&!e.hasOwnProperty(n))throw new Error("unknown type: "+n);return{type:n,name:i}})}fh.prototype=td.prototype={constructor:fh,on:function(t,e){var n=this._,i=JE(t+"",n),r,s=-1,o=i.length;if(arguments.length<2){for(;++s<o;)if((r=(t=i[s]).type)&&(r=QE(n[r],t.name)))return r;return}if(e!=null&&typeof e!="function")throw new Error("invalid callback: "+e);for(;++s<o;)if(r=(t=i[s]).type)n[r]=P0(n[r],t.name,e);else if(e==null)for(r in n)n[r]=P0(n[r],t.name,null);return this},copy:function(){var t={},e=this._;for(var n in e)t[n]=e[n].slice();return new fh(t)},call:function(t,e){if((r=arguments.length-2)>0)for(var n=new Array(r),i=0,r,s;i<r;++i)n[i]=arguments[i+2];if(!this._.hasOwnProperty(t))throw new Error("unknown type: "+t);for(s=this._[t],i=0,r=s.length;i<r;++i)s[i].value.apply(e,n)},apply:function(t,e,n){if(!this._.hasOwnProperty(t))throw new Error("unknown type: "+t);for(var i=this._[t],r=0,s=i.length;r<s;++r)i[r].value.apply(e,n)}};function QE(t,e){for(var n=0,i=t.length,r;n<i;++n)if((r=t[n]).name===e)return r.value}function P0(t,e,n){for(var i=0,r=t.length;i<r;++i)if(t[i].name===e){t[i]=KE,t=t.slice(0,i).concat(t.slice(i+1));break}return n!=null&&t.push({name:e,value:n}),t}var Ys=0,va=0,_a=0,D0=1e3,dh,ya,ph=0,qr=0,mh=0,xa=typeof performance=="object"&&performance.now?performance:Date,L0=typeof window=="object"&&window.requestAnimationFrame?window.requestAnimationFrame.bind(window):function(t){setTimeout(t,17)};function O0(){return qr||(L0(eT),qr=xa.now()+mh)}function eT(){qr=0}function nd(){this._call=this._time=this._next=null}nd.prototype=rd.prototype={constructor:nd,restart:function(t,e,n){if(typeof t!="function")throw new TypeError("callback is not a function");n=(n==null?O0():+n)+(e==null?0:+e),!this._next&&ya!==this&&(ya?ya._next=this:dh=this,ya=this),this._call=t,this._time=n,id()},stop:function(){this._call&&(this._call=null,this._time=1/0,id())}};function rd(t,e,n){var i=new nd;return i.restart(t,e,n),i}function tT(){O0(),++Ys;for(var t=dh,e;t;)(e=qr-t._time)>=0&&t._call.call(void 0,e),t=t._next;--Ys}function I0(){qr=(ph=xa.now())+mh,Ys=va=0;try{tT()}finally{Ys=0,iT(),qr=0}}function nT(){var t=xa.now(),e=t-ph;e>D0&&(mh-=e,ph=t)}function iT(){for(var t,e=dh,n,i=1/0;e;)e._call?(i>e._time&&(i=e._time),t=e,e=e._next):(n=e._next,e._next=null,e=t?t._next=n:dh=n);ya=t,id(i)}function id(t){if(!Ys){va&&(va=clearTimeout(va));var e=t-qr;e>24?(t<1/0&&(va=setTimeout(I0,Math.ceil(t-xa.now()-mh)+1)),_a&&(_a=clearInterval(_a))):(_a||(ph=xa.now(),_a=setInterval(nT,D0)),Ys=1,L0(I0))}}function N0(){let t=1;return()=>(t=(1664525*t+1013904223)%4294967296)/4294967296}var F0=3;function gh(t){return t.x}function sd(t){return t.y}function U0(t){return t.z}var rT=10,sT=Math.PI*(3-Math.sqrt(5)),oT=Math.PI*20/(9+Math.sqrt(221));function od(t,e){e=e||2;var n=Math.min(F0,Math.max(1,Math.round(e))),i,r=1,s=.001,o=1-Math.pow(s,1/300),a=0,c=.6,l=new Map,u=rd(d),h=td("tick","end"),f=N0();t==null&&(t=[]);function d(){m(),h.call("tick",i),r<s&&(u.stop(),h.call("end",i))}function m(p){var x,y=t.length,v;p===void 0&&(p=1);for(var b=0;b<p;++b)for(r+=(a-r)*o,l.forEach(function(M){M(r)}),x=0;x<y;++x)v=t[x],v.fx==null?v.x+=v.vx*=c:(v.x=v.fx,v.vx=0),n>1&&(v.fy==null?v.y+=v.vy*=c:(v.y=v.fy,v.vy=0)),n>2&&(v.fz==null?v.z+=v.vz*=c:(v.z=v.fz,v.vz=0));return i}function _(){for(var p=0,x=t.length,y;p<x;++p){if(y=t[p],y.index=p,y.fx!=null&&(y.x=y.fx),y.fy!=null&&(y.y=y.fy),y.fz!=null&&(y.z=y.fz),isNaN(y.x)||n>1&&isNaN(y.y)||n>2&&isNaN(y.z)){var v=rT*(n>2?Math.cbrt(.5+p):n>1?Math.sqrt(.5+p):p),b=p*sT,M=p*oT;n===1?y.x=v:n===2?(y.x=v*Math.cos(b),y.y=v*Math.sin(b)):(y.x=v*Math.sin(b)*Math.cos(M),y.y=v*Math.cos(b),y.z=v*Math.sin(b)*Math.sin(M))}(isNaN(y.vx)||n>1&&isNaN(y.vy)||n>2&&isNaN(y.vz))&&(y.vx=0,n>1&&(y.vy=0),n>2&&(y.vz=0))}}function g(p){return p.initialize&&p.initialize(t,f,n),p}return _(),i={tick:m,restart:function(){return u.restart(d),i},stop:function(){return u.stop(),i},numDimensions:function(p){return arguments.length?(n=Math.min(F0,Math.max(1,Math.round(p))),l.forEach(g),i):n},nodes:function(p){return arguments.length?(t=p,_(),l.forEach(g),i):t},alpha:function(p){return arguments.length?(r=+p,i):r},alphaMin:function(p){return arguments.length?(s=+p,i):s},alphaDecay:function(p){return arguments.length?(o=+p,i):+o},alphaTarget:function(p){return arguments.length?(a=+p,i):a},velocityDecay:function(p){return arguments.length?(c=1-p,i):1-c},randomSource:function(p){return arguments.length?(f=p,l.forEach(g),i):f},force:function(p,x){return arguments.length>1?(x==null?l.delete(p):l.set(p,g(x)),i):l.get(p)},find:function(){var p=Array.prototype.slice.call(arguments),x=p.shift()||0,y=(n>1?p.shift():null)||0,v=(n>2?p.shift():null)||0,b=p.shift()||1/0,M=0,A=t.length,C,T,w,P,z,U;for(b*=b,M=0;M<A;++M)z=t[M],C=x-z.x,T=y-(z.y||0),w=v-(z.z||0),P=C*C+T*T+w*w,P<b&&(U=z,b=P);return U},on:function(p,x){return arguments.length>1?(h.on(p,x),i):h.on(p)}}}function ad(){var t,e,n,i,r,s=Yn(-30),o,a=1,c=1/0,l=.81;function u(m){var _,g=t.length,p=(e===1?ma(t,gh):e===2?Kf(t,gh,sd):e===3?ga(t,gh,sd,U0):null).visitAfter(f);for(r=m,_=0;_<g;++_)n=t[_],p.visit(d)}function h(){if(t){var m,_=t.length,g;for(o=new Array(_),m=0;m<_;++m)g=t[m],o[g.index]=+s(g,m,t)}}function f(m){var _=0,g,p,x=0,y,v,b,M,A=m.length;if(A){for(y=v=b=M=0;M<A;++M)(g=m[M])&&(p=Math.abs(g.value))&&(_+=g.value,x+=p,y+=p*(g.x||0),v+=p*(g.y||0),b+=p*(g.z||0));_*=Math.sqrt(4/A),m.x=y/x,e>1&&(m.y=v/x),e>2&&(m.z=b/x)}else{g=m,g.x=g.data.x,e>1&&(g.y=g.data.y),e>2&&(g.z=g.data.z);do _+=o[g.data.index];while(g=g.next)}m.value=_}function d(m,_,g,p,x){if(!m.value)return!0;var y=[g,p,x][e-1],v=m.x-n.x,b=e>1?m.y-n.y:0,M=e>2?m.z-n.z:0,A=y-_,C=v*v+b*b+M*M;if(A*A/l<C)return C<c&&(v===0&&(v=ai(i),C+=v*v),e>1&&b===0&&(b=ai(i),C+=b*b),e>2&&M===0&&(M=ai(i),C+=M*M),C<a&&(C=Math.sqrt(a*C)),n.vx+=v*m.value*r/C,e>1&&(n.vy+=b*m.value*r/C),e>2&&(n.vz+=M*m.value*r/C)),!0;if(m.length||C>=c)return;(m.data!==n||m.next)&&(v===0&&(v=ai(i),C+=v*v),e>1&&b===0&&(b=ai(i),C+=b*b),e>2&&M===0&&(M=ai(i),C+=M*M),C<a&&(C=Math.sqrt(a*C)));do m.data!==n&&(A=o[m.data.index]*r/C,n.vx+=v*A,e>1&&(n.vy+=b*A),e>2&&(n.vz+=M*A));while(m=m.next)}return u.initialize=function(m,..._){t=m,i=_.find(g=>typeof g=="function")||Math.random,e=_.find(g=>[1,2,3].includes(g))||2,h()},u.strength=function(m){return arguments.length?(s=typeof m=="function"?m:Yn(+m),h(),u):s},u.distanceMin=function(m){return arguments.length?(a=m*m,u):Math.sqrt(a)},u.distanceMax=function(m){return arguments.length?(c=m*m,u):Math.sqrt(c)},u.theta=function(m){return arguments.length?(l=m*m,u):Math.sqrt(l)},u}function cd(t,e,n,i){var r,s,o=Yn(.1),a,c;typeof t!="function"&&(t=Yn(+t)),e==null&&(e=0),n==null&&(n=0),i==null&&(i=0);function l(h){for(var f=0,d=r.length;f<d;++f){var m=r[f],_=m.x-e||1e-6,g=(m.y||0)-n||1e-6,p=(m.z||0)-i||1e-6,x=Math.sqrt(_*_+g*g+p*p),y=(c[f]-x)*a[f]*h/x;m.vx+=_*y,s>1&&(m.vy+=g*y),s>2&&(m.vz+=p*y)}}function u(){if(r){var h,f=r.length;for(a=new Array(f),c=new Array(f),h=0;h<f;++h)c[h]=+t(r[h],h,r),a[h]=isNaN(c[h])?0:+o(r[h],h,r)}}return l.initialize=function(h,...f){r=h,s=f.find(d=>[1,2,3].includes(d))||2,u()},l.strength=function(h){return arguments.length?(o=typeof h=="function"?h:Yn(+h),u(),l):o},l.radius=function(h){return arguments.length?(t=typeof h=="function"?h:Yn(+h),u(),l):t},l.x=function(h){return arguments.length?(e=+h,l):e},l.y=function(h){return arguments.length?(n=+h,l):n},l.z=function(h){return arguments.length?(i=+h,l):i},l}function ld(t){cT(t);let e=aT(t);return t.on=e.on,t.off=e.off,t.fire=e.fire,t}function aT(t){let e=Object.create(null);return{on:function(n,i,r){if(typeof i!="function")throw new Error("callback is expected to be a function");let s=e[n];return s||(s=e[n]=[]),s.push({callback:i,ctx:r}),t},off:function(n,i){if(typeof n=="undefined")return e=Object.create(null),t;if(e[n])if(typeof i!="function")delete e[n];else{let o=e[n];for(let a=0;a<o.length;++a)o[a].callback===i&&o.splice(a,1)}return t},fire:function(n){let i=e[n];if(!i)return t;let r;arguments.length>1&&(r=Array.prototype.slice.call(arguments,1));for(let s=0;s<i.length;++s){let o=i[s];o.callback.apply(o.ctx,r)}return t}}}function cT(t){if(!t)throw new Error("Eventify cannot use falsy object as events subject");let e=["on","fire","off"];for(let n=0;n<e.length;++n)if(t.hasOwnProperty(e[n]))throw new Error("Subject cannot be eventified, since it already has property '"+e[n]+"'")}var B0=lT;function lT(t){if(t=t||{},"uniqueLinkId"in t&&(console.warn("ngraph.graph: Starting from version 0.14 `uniqueLinkId` is deprecated.\nUse `multigraph` option instead\n",`
`,`Note: there is also change in default behavior: From now on each graph
is considered to be not a multigraph by default (each edge is unique).`),t.multigraph=t.uniqueLinkId),t.multigraph===void 0&&(t.multigraph=!1),typeof Map!="function")throw new Error("ngraph.graph requires `Map` to be defined. Please polyfill it before using ngraph");var e=new Map,n=new Map,i={},r=0,s=t.multigraph?v:y,o=[],a=Q,c=Q,l=Q,u=Q,h={version:20,addNode:_,addLink:x,removeLink:C,removeNode:p,getNode:g,getNodeCount:b,getLinkCount:M,getEdgeCount:M,getLinksCount:M,getNodesCount:b,getLinks:A,forEachNode:ye,forEachLinkedNode:O,forEachLink:U,beginUpdate:l,endUpdate:u,clear:z,hasLink:w,hasNode:g,getLink:w,getLinkById:P};return ld(h),f(),h;function f(){var Z=h.on;h.on=re;function re(){return h.beginUpdate=l=j,h.endUpdate=u=ae,a=d,c=m,h.on=Z,Z.apply(h,arguments)}}function d(Z,re){o.push({link:Z,changeType:re})}function m(Z,re){o.push({node:Z,changeType:re})}function _(Z,re){if(Z===void 0)throw new Error("Invalid node identifier");l();var me=g(Z);return me?(me.data=re,c(me,"update")):(me=new hT(Z,re),c(me,"add")),e.set(Z,me),u(),me}function g(Z){return e.get(Z)}function p(Z){var re=g(Z);if(!re)return!1;l();var me=re.links;return me&&(me.forEach(T),re.links=null),e.delete(Z),c(re,"remove"),u(),!0}function x(Z,re,me){l();var Ge=g(Z)||_(Z),Ne=g(re)||_(re),X=s(Z,re,me),ee=n.has(X.id);return n.set(X.id,X),z0(Ge,X),Z!==re&&z0(Ne,X),a(X,ee?"update":"add"),u(),X}function y(Z,re,me){var Ge=_h(Z,re),Ne=n.get(Ge);return Ne?(Ne.data=me,Ne):new k0(Z,re,me,Ge)}function v(Z,re,me){var Ge=_h(Z,re),Ne=i.hasOwnProperty(Ge);if(Ne||w(Z,re)){Ne||(i[Ge]=0);var X="@"+ ++i[Ge];Ge=_h(Z+X,re+X)}return new k0(Z,re,me,Ge)}function b(){return e.size}function M(){return n.size}function A(Z){var re=g(Z);return re?re.links:null}function C(Z,re){return re!==void 0&&(Z=w(Z,re)),T(Z)}function T(Z){if(!Z||!n.get(Z.id))return!1;l(),n.delete(Z.id);var re=g(Z.fromId),me=g(Z.toId);return re&&re.links.delete(Z),me&&me.links.delete(Z),a(Z,"remove"),u(),!0}function w(Z,re){if(!(Z===void 0||re===void 0))return n.get(_h(Z,re))}function P(Z){if(Z!==void 0)return n.get(Z)}function z(){l(),ye(function(Z){p(Z.id)}),u()}function U(Z){if(typeof Z=="function")for(var re=n.values(),me=re.next();!me.done;){if(Z(me.value))return!0;me=re.next()}}function O(Z,re,me){var Ge=g(Z);if(Ge&&Ge.links&&typeof re=="function")return me?V(Ge.links,Z,re):D(Ge.links,Z,re)}function D(Z,re,me){for(var Ge,Ne=Z.values(),X=Ne.next();!X.done;){var ee=X.value,be=ee.fromId===re?ee.toId:ee.fromId;if(Ge=me(e.get(be),ee),Ge)return!0;X=Ne.next()}}function V(Z,re,me){for(var Ge,Ne=Z.values(),X=Ne.next();!X.done;){var ee=X.value;if(ee.fromId===re&&(Ge=me(e.get(ee.toId),ee),Ge))return!0;X=Ne.next()}}function Q(){}function j(){r+=1}function ae(){r-=1,r===0&&o.length>0&&(h.fire("changed",o),o.length=0)}function ye(Z){if(typeof Z!="function")throw new Error("Function is expected to iterate over graph nodes. You passed "+Z);for(var re=e.values(),me=re.next();!me.done;){if(Z(me.value))return!0;me=re.next()}}}function hT(t,e){this.id=t,this.links=null,this.data=e}function z0(t,e){t.links?t.links.add(e):t.links=new Set([e])}function k0(t,e,n,i){this.fromId=t,this.toId=e,this.data=n,this.id=i}function _h(t,e){return t.toString()+"\u{1F449} "+e.toString()}var Fv=Jx(y_(),1);function HT(t){var e=typeof t;return t!=null&&(e=="object"||e=="function")}var Ma=HT;var GT=typeof global=="object"&&global&&global.Object===Object&&global,x_=GT;var WT=typeof self=="object"&&self&&self.Object===Object&&self,jT=x_||WT||Function("return this")(),yh=jT;var qT=function(){return yh.Date.now()},xh=qT;var XT=/\s/;function $T(t){for(var e=t.length;e--&&XT.test(t.charAt(e)););return e}var b_=$T;var YT=/^\s+/;function ZT(t){return t&&t.slice(0,b_(t)+1).replace(YT,"")}var M_=ZT;var KT=yh.Symbol,Zs=KT;var S_=Object.prototype,JT=S_.hasOwnProperty,QT=S_.toString,Sa=Zs?Zs.toStringTag:void 0;function eA(t){var e=JT.call(t,Sa),n=t[Sa];try{t[Sa]=void 0;var i=!0}catch(s){}var r=QT.call(t);return i&&(e?t[Sa]=n:delete t[Sa]),r}var w_=eA;var tA=Object.prototype,nA=tA.toString;function iA(t){return nA.call(t)}var E_=iA;var rA="[object Null]",sA="[object Undefined]",T_=Zs?Zs.toStringTag:void 0;function oA(t){return t==null?t===void 0?sA:rA:T_&&T_ in Object(t)?w_(t):E_(t)}var A_=oA;function aA(t){return t!=null&&typeof t=="object"}var C_=aA;var cA="[object Symbol]";function lA(t){return typeof t=="symbol"||C_(t)&&A_(t)==cA}var R_=lA;var P_=NaN,hA=/^[-+]0x[0-9a-f]+$/i,uA=/^0b[01]+$/i,fA=/^0o[0-7]+$/i,dA=parseInt;function pA(t){if(typeof t=="number")return t;if(R_(t))return P_;if(Ma(t)){var e=typeof t.valueOf=="function"?t.valueOf():t;t=Ma(e)?e+"":e}if(typeof t!="string")return t===0?t:+t;t=M_(t);var n=uA.test(t);return n||fA.test(t)?dA(t.slice(2),n?2:8):hA.test(t)?P_:+t}var bd=pA;var mA="Expected a function",gA=Math.max,_A=Math.min;function vA(t,e,n){var i,r,s,o,a,c,l=0,u=!1,h=!1,f=!0;if(typeof t!="function")throw new TypeError(mA);e=bd(e)||0,Ma(n)&&(u=!!n.leading,h="maxWait"in n,s=h?gA(bd(n.maxWait)||0,e):s,f="trailing"in n?!!n.trailing:f);function d(M){var A=i,C=r;return i=r=void 0,l=M,o=t.apply(C,A),o}function m(M){return l=M,a=setTimeout(p,e),u?d(M):o}function _(M){var A=M-c,C=M-l,T=e-A;return h?_A(T,s-C):T}function g(M){var A=M-c,C=M-l;return c===void 0||A>=e||A<0||h&&C>=s}function p(){var M=xh();if(g(M))return x(M);a=setTimeout(p,_(M))}function x(M){return a=void 0,f&&i?d(M):(i=r=void 0,o)}function y(){a!==void 0&&clearTimeout(a),l=0,i=c=r=a=void 0}function v(){return a===void 0?o:x(xh())}function b(){var M=xh(),A=g(M);if(i=arguments,r=this,c=M,A){if(a===void 0)return m(c);if(h)return clearTimeout(a),a=setTimeout(p,e),d(c)}return a===void 0&&(a=setTimeout(p,e)),o}return b.cancel=y,b.flush=v,b}var I_=vA;function D_(t,e){(e==null||e>t.length)&&(e=t.length);for(var n=0,i=Array(e);n<e;n++)i[n]=t[n];return i}function yA(t){if(Array.isArray(t))return t}function xA(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}function bA(t,e,n){return Object.defineProperty(t,"prototype",{writable:!1}),t}function MA(t,e){var n=t==null?null:typeof Symbol!="undefined"&&t[Symbol.iterator]||t["@@iterator"];if(n!=null){var i,r,s,o,a=[],c=!0,l=!1;try{if(s=(n=n.call(t)).next,e!==0)for(;!(c=(i=s.call(n)).done)&&(a.push(i.value),a.length!==e);c=!0);}catch(u){l=!0,r=u}finally{try{if(!c&&n.return!=null&&(o=n.return(),Object(o)!==o))return}finally{if(l)throw r}}return a}}function SA(){throw new TypeError(`Invalid attempt to destructure non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}function wA(t,e){return yA(t)||MA(t,e)||EA(t,e)||SA()}function EA(t,e){if(t){if(typeof t=="string")return D_(t,e);var n={}.toString.call(t).slice(8,-1);return n==="Object"&&t.constructor&&(n=t.constructor.name),n==="Map"||n==="Set"?Array.from(t):n==="Arguments"||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)?D_(t,e):void 0}}var TA=bA(function t(e,n){var i=n.default,r=i===void 0?null:i,s=n.triggerUpdate,o=s===void 0?!0:s,a=n.onChange,c=a===void 0?function(l,u){}:a;xA(this,t),this.name=e,this.defaultVal=r,this.triggerUpdate=o,this.onChange=c});function dr(t){var e=t.stateInit,n=e===void 0?function(){return{}}:e,i=t.props,r=i===void 0?{}:i,s=t.methods,o=s===void 0?{}:s,a=t.aliases,c=a===void 0?{}:a,l=t.init,u=l===void 0?function(){}:l,h=t.update,f=h===void 0?function(){}:h,d=Object.keys(r).map(function(m){return new TA(m,r[m])});return function m(){for(var _=arguments.length,g=new Array(_),p=0;p<_;p++)g[p]=arguments[p];var x=!!(this instanceof m&&this.constructor),y=x?g.shift():void 0,v=g[0],b=v===void 0?{}:v,M=Object.assign({},n instanceof Function?n(b):n,{initialised:!1}),A={};function C(P){return T(P,b),w(),C}var T=function(z,U){u.call(C,z,M,U),M.initialised=!0},w=I_(function(){M.initialised&&(f.call(C,M,A),A={})},1);return d.forEach(function(P){C[P.name]=z(P);function z(U){var O=U.name,D=U.triggerUpdate,V=D===void 0?!1:D,Q=U.onChange,j=Q===void 0?function(Z,re){}:Q,ae=U.defaultVal,ye=ae===void 0?null:ae;return function(Z){var re=M[O];if(!arguments.length)return re;var me=Z===void 0?ye:Z;return M[O]=me,j.call(C,me,M,re),!A.hasOwnProperty(O)&&(A[O]=re),V&&w(),C}}}),Object.keys(o).forEach(function(P){C[P]=function(){for(var z,U=arguments.length,O=new Array(U),D=0;D<U;D++)O[D]=arguments[D];return(z=o[P]).call.apply(z,[C,M].concat(O))}}),Object.entries(c).forEach(function(P){var z=wA(P,2),U=z[0],O=z[1];return C[U]=C[O]}),C.resetProps=function(){return d.forEach(function(P){C[P.name](P.defaultVal)}),C},C.resetProps(),M._rerender=w,x&&y&&C(y),C}}var et=(function(t){return typeof t=="function"?t:typeof t=="string"?function(e){return e[t]}:function(e){return t}});function wa(t,e){return t==null||e==null?NaN:t<e?-1:t>e?1:t>=e?0:NaN}function AA(t,e){return t==null||e==null?NaN:e<t?-1:e>t?1:e>=t?0:NaN}function O_(t){let e,n,i;t.length!==2?(e=wa,n=(a,c)=>wa(t(a),c),i=(a,c)=>t(a)-c):(e=t===wa||t===AA?t:CA,n=t,i=t);function r(a,c,l=0,u=a.length){if(l<u){if(e(c,c)!==0)return u;do{let h=l+u>>>1;n(a[h],c)<0?l=h+1:u=h}while(l<u)}return l}function s(a,c,l=0,u=a.length){if(l<u){if(e(c,c)!==0)return u;do{let h=l+u>>>1;n(a[h],c)<=0?l=h+1:u=h}while(l<u)}return l}function o(a,c,l=0,u=a.length){let h=r(a,c,l,u-1);return h>l&&i(a[h-1],c)>-i(a[h],c)?h-1:h}return{left:r,center:o,right:s}}function CA(){return 0}function RA(t){return t===null?NaN:+t}var N_=O_(wa),PA=N_.right,AU=N_.left,CU=O_(RA).center;var RU=F_(U_),PU=F_(IA);function F_(t){return function(e,n,i=n){if(!((n=+n)>=0))throw new RangeError("invalid rx");if(!((i=+i)>=0))throw new RangeError("invalid ry");let{data:r,width:s,height:o}=e;if(!((s=Math.floor(s))>=0))throw new RangeError("invalid width");if(!((o=Math.floor(o!==void 0?o:r.length/s))>=0))throw new RangeError("invalid height");if(!s||!o||!n&&!i)return e;let a=n&&t(n),c=i&&t(i),l=r.slice();return a&&c?(Ks(a,l,r,s,o),Ks(a,r,l,s,o),Ks(a,l,r,s,o),Js(c,r,l,s,o),Js(c,l,r,s,o),Js(c,r,l,s,o)):a?(Ks(a,r,l,s,o),Ks(a,l,r,s,o),Ks(a,r,l,s,o)):c&&(Js(c,r,l,s,o),Js(c,l,r,s,o),Js(c,r,l,s,o)),e}}function Ks(t,e,n,i,r){for(let s=0,o=i*r;s<o;)t(e,n,s,s+=i,1)}function Js(t,e,n,i,r){for(let s=0,o=i*r;s<i;++s)t(e,n,s,s+o,i)}function IA(t){let e=U_(t);return(n,i,r,s,o)=>{r<<=2,s<<=2,o<<=2,e(n,i,r+0,s+0,o),e(n,i,r+1,s+1,o),e(n,i,r+2,s+2,o),e(n,i,r+3,s+3,o)}}function U_(t){let e=Math.floor(t);if(e===t)return DA(t);let n=t-e,i=2*t+1;return(r,s,o,a,c)=>{if(!((a-=c)>=o))return;let l=e*s[o],u=c*e,h=u+c;for(let f=o,d=o+u;f<d;f+=c)l+=s[Math.min(a,f)];for(let f=o,d=a;f<=d;f+=c)l+=s[Math.min(a,f+u)],r[f]=(l+n*(s[Math.max(o,f-h)]+s[Math.min(a,f+h)]))/i,l-=s[Math.max(o,f-u)]}}function DA(t){let e=2*t+1;return(n,i,r,s,o)=>{if(!((s-=o)>=r))return;let a=t*i[r],c=o*t;for(let l=r,u=r+c;l<u;l+=o)a+=i[Math.min(s,l)];for(let l=r,u=s;l<=u;l+=o)a+=i[Math.min(s,l+c)],n[l]=a/e,a-=i[Math.max(r,l-c)]}}var Ea=class extends Map{constructor(e,n=NA){if(super(),Object.defineProperties(this,{_intern:{value:new Map},_key:{value:n}}),e!=null)for(let[i,r]of e)this.set(i,r)}get(e){return super.get(L_(this,e))}has(e){return super.has(L_(this,e))}set(e,n){return super.set(LA(this,e),n)}delete(e){return super.delete(OA(this,e))}};function L_({_intern:t,_key:e},n){let i=e(n);return t.has(i)?t.get(i):n}function LA({_intern:t,_key:e},n){let i=e(n);return t.has(i)?t.get(i):(t.set(i,n),n)}function OA({_intern:t,_key:e},n){let i=e(n);return t.has(i)&&(n=t.get(i),t.delete(i)),n}function NA(t){return t!==null&&typeof t=="object"?t.valueOf():t}var FA=Array.prototype,IU=FA.slice;var DU=Math.sqrt(50),LU=Math.sqrt(10),OU=Math.sqrt(2);function z_(t,e){let n;if(e===void 0)for(let i of t)i!=null&&(n<i||n===void 0&&i>=i)&&(n=i);else{let i=-1;for(let r of t)(r=e(r,++i,t))!=null&&(n<r||n===void 0&&r>=r)&&(n=r)}return n}function k_(t,e){let n;if(e===void 0)for(let i of t)i!=null&&(n>i||n===void 0&&i>=i)&&(n=i);else{let i=-1;for(let r of t)(r=e(r,++i,t))!=null&&(n>r||n===void 0&&r>=r)&&(n=r)}return n}var NU=UA(Math.random);function UA(t){return function(n,i=0,r=n.length){let s=r-(i=+i);for(;s;){let o=t()*s--|0,a=n[s+i];n[s+i]=n[o+i],n[o+i]=a}return n}}function Ed(t,e){(e==null||e>t.length)&&(e=t.length);for(var n=0,i=Array(e);n<e;n++)i[n]=t[n];return i}function zA(t){if(Array.isArray(t))return t}function kA(t){if(Array.isArray(t))return Ed(t)}function B_(t,e,n){if(typeof t=="function"?t===e:t.has(e))return arguments.length<3?e:n;throw new TypeError("Private element is not present on this object")}function BA(t,e){if(e.has(t))throw new TypeError("Cannot initialize the same private elements twice on an object")}function VA(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}function an(t,e){return t.get(B_(t,e))}function Qs(t,e,n){BA(t,e),e.set(t,n)}function bh(t,e,n){return t.set(B_(t,e),n),n}function HA(t,e){for(var n=0;n<e.length;n++){var i=e[n];i.enumerable=i.enumerable||!1,i.configurable=!0,"value"in i&&(i.writable=!0),Object.defineProperty(t,KA(i.key),i)}}function GA(t,e,n){return e&&HA(t.prototype,e),Object.defineProperty(t,"prototype",{writable:!1}),t}function WA(t){if(typeof Symbol!="undefined"&&t[Symbol.iterator]!=null||t["@@iterator"]!=null)return Array.from(t)}function jA(t,e){var n=t==null?null:typeof Symbol!="undefined"&&t[Symbol.iterator]||t["@@iterator"];if(n!=null){var i,r,s,o,a=[],c=!0,l=!1;try{if(s=(n=n.call(t)).next,e!==0)for(;!(c=(i=s.call(n)).done)&&(a.push(i.value),a.length!==e);c=!0);}catch(u){l=!0,r=u}finally{try{if(!c&&n.return!=null&&(o=n.return(),Object(o)!==o))return}finally{if(l)throw r}}return a}}function qA(){throw new TypeError(`Invalid attempt to destructure non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}function XA(){throw new TypeError(`Invalid attempt to spread non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}function $A(t,e){return zA(t)||jA(t,e)||V_(t,e)||qA()}function YA(t){return kA(t)||WA(t)||V_(t)||XA()}function ZA(t,e){if(typeof t!="object"||!t)return t;var n=t[Symbol.toPrimitive];if(n!==void 0){var i=n.call(t,e);if(typeof i!="object")return i;throw new TypeError("@@toPrimitive must return a primitive value.")}return String(t)}function KA(t){var e=ZA(t,"string");return typeof e=="symbol"?e:e+""}function V_(t,e){if(t){if(typeof t=="string")return Ed(t,e);var n={}.toString.call(t).slice(8,-1);return n==="Object"&&t.constructor&&(n=t.constructor.name),n==="Map"||n==="Set"?Array.from(t):n==="Arguments"||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)?Ed(t,e):void 0}}var eo=new WeakMap,Ta=new WeakMap,to=new WeakMap,Md=new WeakMap,Sd=new WeakMap,wd=new WeakMap,H_=(function(){function t(){VA(this,t),Qs(this,eo,new Map),Qs(this,Ta,new Map),Qs(this,to,function(e){return e}),Qs(this,Md,function(){return{}}),Qs(this,Sd,function(){}),Qs(this,wd,function(){})}return GA(t,[{key:"getObj",value:function(n){return an(eo,this).get(an(to,this).call(this,n))}},{key:"getData",value:function(n){return an(Ta,this).get(n)}},{key:"entries",value:function(){return YA(an(Ta,this).entries()).map(function(n){var i=$A(n,2),r=i[0],s=i[1];return[s,r]})}},{key:"id",value:function(n){return bh(to,this,et(n)),this}},{key:"onCreateObj",value:function(n){return bh(Md,this,n),this}},{key:"onUpdateObj",value:function(n){return bh(Sd,this,n),this}},{key:"onRemoveObj",value:function(n){return bh(wd,this,n),this}},{key:"digest",value:function(n){var i=this;n.filter(function(s){return!an(eo,i).has(an(to,i).call(i,s))}).forEach(function(s){var o=an(Md,i).call(i,s);an(eo,i).set(an(to,i).call(i,s),o),an(Ta,i).set(o,s)});var r=new Map(n.map(function(s){return[an(to,i).call(i,s),s]}));return an(eo,this).forEach(function(s,o){r.has(o)?an(Sd,i).call(i,s,r.get(o)):(an(wd,i).call(i,s,o),an(eo,i).delete(o),an(Ta,i).delete(s))}),this}},{key:"clear",value:function(){return this.digest([]),this}}])})();function so(t,e,n){t.prototype=e.prototype=n,n.constructor=t}function Ra(t,e){var n=Object.create(t.prototype);for(var i in e)n[i]=e[i];return n}function pr(){}var Jr=.7,ro=1/Jr,no="\\s*([+-]?\\d+)\\s*",Aa="\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)\\s*",wi="\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)%\\s*",JA=/^#([0-9a-f]{3,8})$/,QA=new RegExp(`^rgb\\(${no},${no},${no}\\)$`),e2=new RegExp(`^rgb\\(${wi},${wi},${wi}\\)$`),t2=new RegExp(`^rgba\\(${no},${no},${no},${Aa}\\)$`),n2=new RegExp(`^rgba\\(${wi},${wi},${wi},${Aa}\\)$`),i2=new RegExp(`^hsl\\(${Aa},${wi},${wi}\\)$`),r2=new RegExp(`^hsla\\(${Aa},${wi},${wi},${Aa}\\)$`),G_={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074};so(pr,Th,{copy(t){return Object.assign(new this.constructor,this,t)},displayable(){return this.rgb().displayable()},hex:W_,formatHex:W_,formatHex8:s2,formatHsl:o2,formatRgb:j_,toString:j_});function W_(){return this.rgb().formatHex()}function s2(){return this.rgb().formatHex8()}function o2(){return ev(this).formatHsl()}function j_(){return this.rgb().formatRgb()}function Th(t){var e,n;return t=(t+"").trim().toLowerCase(),(e=JA.exec(t))?(n=e[1].length,e=parseInt(e[1],16),n===6?q_(e):n===3?new $t(e>>8&15|e>>4&240,e>>4&15|e&240,(e&15)<<4|e&15,1):n===8?Mh(e>>24&255,e>>16&255,e>>8&255,(e&255)/255):n===4?Mh(e>>12&15|e>>8&240,e>>8&15|e>>4&240,e>>4&15|e&240,((e&15)<<4|e&15)/255):null):(e=QA.exec(t))?new $t(e[1],e[2],e[3],1):(e=e2.exec(t))?new $t(e[1]*255/100,e[2]*255/100,e[3]*255/100,1):(e=t2.exec(t))?Mh(e[1],e[2],e[3],e[4]):(e=n2.exec(t))?Mh(e[1]*255/100,e[2]*255/100,e[3]*255/100,e[4]):(e=i2.exec(t))?Y_(e[1],e[2]/100,e[3]/100,1):(e=r2.exec(t))?Y_(e[1],e[2]/100,e[3]/100,e[4]):G_.hasOwnProperty(t)?q_(G_[t]):t==="transparent"?new $t(NaN,NaN,NaN,0):null}function q_(t){return new $t(t>>16&255,t>>8&255,t&255,1)}function Mh(t,e,n,i){return i<=0&&(t=e=n=NaN),new $t(t,e,n,i)}function Id(t){return t instanceof pr||(t=Th(t)),t?(t=t.rgb(),new $t(t.r,t.g,t.b,t.opacity)):new $t}function Qr(t,e,n,i){return arguments.length===1?Id(t):new $t(t,e,n,i==null?1:i)}function $t(t,e,n,i){this.r=+t,this.g=+e,this.b=+n,this.opacity=+i}so($t,Qr,Ra(pr,{brighter(t){return t=t==null?ro:Math.pow(ro,t),new $t(this.r*t,this.g*t,this.b*t,this.opacity)},darker(t){return t=t==null?Jr:Math.pow(Jr,t),new $t(this.r*t,this.g*t,this.b*t,this.opacity)},rgb(){return this},clamp(){return new $t(Zr(this.r),Zr(this.g),Zr(this.b),wh(this.opacity))},displayable(){return-.5<=this.r&&this.r<255.5&&-.5<=this.g&&this.g<255.5&&-.5<=this.b&&this.b<255.5&&0<=this.opacity&&this.opacity<=1},hex:X_,formatHex:X_,formatHex8:a2,formatRgb:$_,toString:$_}));function X_(){return`#${Yr(this.r)}${Yr(this.g)}${Yr(this.b)}`}function a2(){return`#${Yr(this.r)}${Yr(this.g)}${Yr(this.b)}${Yr((isNaN(this.opacity)?1:this.opacity)*255)}`}function $_(){let t=wh(this.opacity);return`${t===1?"rgb(":"rgba("}${Zr(this.r)}, ${Zr(this.g)}, ${Zr(this.b)}${t===1?")":`, ${t})`}`}function wh(t){return isNaN(t)?1:Math.max(0,Math.min(1,t))}function Zr(t){return Math.max(0,Math.min(255,Math.round(t)||0))}function Yr(t){return t=Zr(t),(t<16?"0":"")+t.toString(16)}function Y_(t,e,n,i){return i<=0?t=e=n=NaN:n<=0||n>=1?t=e=NaN:e<=0&&(t=NaN),new ci(t,e,n,i)}function ev(t){if(t instanceof ci)return new ci(t.h,t.s,t.l,t.opacity);if(t instanceof pr||(t=Th(t)),!t)return new ci;if(t instanceof ci)return t;t=t.rgb();var e=t.r/255,n=t.g/255,i=t.b/255,r=Math.min(e,n,i),s=Math.max(e,n,i),o=NaN,a=s-r,c=(s+r)/2;return a?(e===s?o=(n-i)/a+(n<i)*6:n===s?o=(i-e)/a+2:o=(e-n)/a+4,a/=c<.5?s+r:2-s-r,o*=60):a=c>0&&c<1?0:o,new ci(o,a,c,t.opacity)}function Ah(t,e,n,i){return arguments.length===1?ev(t):new ci(t,e,n,i==null?1:i)}function ci(t,e,n,i){this.h=+t,this.s=+e,this.l=+n,this.opacity=+i}so(ci,Ah,Ra(pr,{brighter(t){return t=t==null?ro:Math.pow(ro,t),new ci(this.h,this.s,this.l*t,this.opacity)},darker(t){return t=t==null?Jr:Math.pow(Jr,t),new ci(this.h,this.s,this.l*t,this.opacity)},rgb(){var t=this.h%360+(this.h<0)*360,e=isNaN(t)||isNaN(this.s)?0:this.s,n=this.l,i=n+(n<.5?n:1-n)*e,r=2*n-i;return new $t(Td(t>=240?t-240:t+120,r,i),Td(t,r,i),Td(t<120?t+240:t-120,r,i),this.opacity)},clamp(){return new ci(Z_(this.h),Sh(this.s),Sh(this.l),wh(this.opacity))},displayable(){return(0<=this.s&&this.s<=1||isNaN(this.s))&&0<=this.l&&this.l<=1&&0<=this.opacity&&this.opacity<=1},formatHsl(){let t=wh(this.opacity);return`${t===1?"hsl(":"hsla("}${Z_(this.h)}, ${Sh(this.s)*100}%, ${Sh(this.l)*100}%${t===1?")":`, ${t})`}`}}));function Z_(t){return t=(t||0)%360,t<0?t+360:t}function Sh(t){return Math.max(0,Math.min(1,t||0))}function Td(t,e,n){return(t<60?e+(n-e)*t/60:t<180?n:t<240?e+(n-e)*(240-t)/60:e)*255}var tv=Math.PI/180,nv=180/Math.PI,Eh=18,iv=.96422,rv=1,sv=.82521,ov=4/29,io=6/29,av=3*io*io,c2=io*io*io;function cv(t){if(t instanceof Ei)return new Ei(t.l,t.a,t.b,t.opacity);if(t instanceof qi)return hv(t);t instanceof $t||(t=Id(t));var e=Pd(t.r),n=Pd(t.g),i=Pd(t.b),r=Ad((.2225045*e+.7168786*n+.0606169*i)/rv),s,o;return e===n&&n===i?s=o=r:(s=Ad((.4360747*e+.3850649*n+.1430804*i)/iv),o=Ad((.0139322*e+.0971045*n+.7141733*i)/sv)),new Ei(116*r-16,500*(s-r),200*(r-o),t.opacity)}function lv(t,e,n,i){return arguments.length===1?cv(t):new Ei(t,e,n,i==null?1:i)}function Ei(t,e,n,i){this.l=+t,this.a=+e,this.b=+n,this.opacity=+i}so(Ei,lv,Ra(pr,{brighter(t){return new Ei(this.l+Eh*(t==null?1:t),this.a,this.b,this.opacity)},darker(t){return new Ei(this.l-Eh*(t==null?1:t),this.a,this.b,this.opacity)},rgb(){var t=(this.l+16)/116,e=isNaN(this.a)?t:t+this.a/500,n=isNaN(this.b)?t:t-this.b/200;return e=iv*Cd(e),t=rv*Cd(t),n=sv*Cd(n),new $t(Rd(3.1338561*e-1.6168667*t-.4906146*n),Rd(-.9787684*e+1.9161415*t+.033454*n),Rd(.0719453*e-.2289914*t+1.4052427*n),this.opacity)}}));function Ad(t){return t>c2?Math.pow(t,1/3):t/av+ov}function Cd(t){return t>io?t*t*t:av*(t-ov)}function Rd(t){return 255*(t<=.0031308?12.92*t:1.055*Math.pow(t,1/2.4)-.055)}function Pd(t){return(t/=255)<=.04045?t/12.92:Math.pow((t+.055)/1.055,2.4)}function l2(t){if(t instanceof qi)return new qi(t.h,t.c,t.l,t.opacity);if(t instanceof Ei||(t=cv(t)),t.a===0&&t.b===0)return new qi(NaN,0<t.l&&t.l<100?0:NaN,t.l,t.opacity);var e=Math.atan2(t.b,t.a)*nv;return new qi(e<0?e+360:e,Math.sqrt(t.a*t.a+t.b*t.b),t.l,t.opacity)}function Ch(t,e,n,i){return arguments.length===1?l2(t):new qi(t,e,n,i==null?1:i)}function qi(t,e,n,i){this.h=+t,this.c=+e,this.l=+n,this.opacity=+i}function hv(t){if(isNaN(t.h))return new Ei(t.l,0,0,t.opacity);var e=t.h*tv;return new Ei(t.l,Math.cos(e)*t.c,Math.sin(e)*t.c,t.opacity)}so(qi,Ch,Ra(pr,{brighter(t){return new qi(this.h,this.c,this.l+Eh*(t==null?1:t),this.opacity)},darker(t){return new qi(this.h,this.c,this.l-Eh*(t==null?1:t),this.opacity)},rgb(){return hv(this).rgb()}}));var uv=-.14861,Dd=1.78277,Ld=-.29227,Rh=-.90649,Ca=1.97294,K_=Ca*Rh,J_=Ca*Dd,Q_=Dd*Ld-Rh*uv;function h2(t){if(t instanceof Kr)return new Kr(t.h,t.s,t.l,t.opacity);t instanceof $t||(t=Id(t));var e=t.r/255,n=t.g/255,i=t.b/255,r=(Q_*i+K_*e-J_*n)/(Q_+K_-J_),s=i-r,o=(Ca*(n-r)-Ld*s)/Rh,a=Math.sqrt(o*o+s*s)/(Ca*r*(1-r)),c=a?Math.atan2(o,s)*nv-120:NaN;return new Kr(c<0?c+360:c,a,r,t.opacity)}function Zn(t,e,n,i){return arguments.length===1?h2(t):new Kr(t,e,n,i==null?1:i)}function Kr(t,e,n,i){this.h=+t,this.s=+e,this.l=+n,this.opacity=+i}so(Kr,Zn,Ra(pr,{brighter(t){return t=t==null?ro:Math.pow(ro,t),new Kr(this.h,this.s,this.l*t,this.opacity)},darker(t){return t=t==null?Jr:Math.pow(Jr,t),new Kr(this.h,this.s,this.l*t,this.opacity)},rgb(){var t=isNaN(this.h)?0:(this.h+120)*tv,e=+this.l,n=isNaN(this.s)?0:this.s*e*(1-e),i=Math.cos(t),r=Math.sin(t);return new $t(255*(e+n*(uv*i+Dd*r)),255*(e+n*(Ld*i+Rh*r)),255*(e+n*(Ca*i)),this.opacity)}}));function pv(t,e,n,i,r){var s=t*t,o=s*t;return((1-3*t+3*s-o)*e+(4-6*s+3*o)*n+(1+3*t+3*s-3*o)*i+o*r)/6}function u2(t){var e=t.length-1;return function(n){var i=n<=0?n=0:n>=1?(n=1,e-1):Math.floor(n*e),r=t[i],s=t[i+1],o=i>0?t[i-1]:2*r-s,a=i<e-1?t[i+2]:2*s-r;return pv((n-i/e)*e,o,r,s,a)}}function f2(t){var e=t.length;return function(n){var i=Math.floor(((n%=1)<0?++n:n)*e),r=t[(i+e-1)%e],s=t[i%e],o=t[(i+1)%e],a=t[(i+2)%e];return pv((n-i/e)*e,r,s,o,a)}}var Nd=t=>()=>t;function mv(t,e){return function(n){return t+n*e}}function d2(t,e,n){return t=Math.pow(t,n),e=Math.pow(e,n)-t,n=1/n,function(i){return Math.pow(t+i*e,n)}}function Fd(t,e){var n=e-t;return n?mv(t,n>180||n<-180?n-360*Math.round(n/360):n):Nd(isNaN(t)?e:t)}function p2(t){return(t=+t)==1?xn:function(e,n){return n-e?d2(e,n,t):Nd(isNaN(e)?n:e)}}function xn(t,e){var n=e-t;return n?mv(t,n):Nd(isNaN(t)?e:t)}var HU=(function t(e){var n=p2(e);function i(r,s){var o=n((r=Qr(r)).r,(s=Qr(s)).r),a=n(r.g,s.g),c=n(r.b,s.b),l=xn(r.opacity,s.opacity);return function(u){return r.r=o(u),r.g=a(u),r.b=c(u),r.opacity=l(u),r+""}}return i.gamma=t,i})(1);function gv(t){return function(e){var n=e.length,i=new Array(n),r=new Array(n),s=new Array(n),o,a;for(o=0;o<n;++o)a=Qr(e[o]),i[o]=a.r||0,r[o]=a.g||0,s[o]=a.b||0;return i=t(i),r=t(r),s=t(s),a.opacity=1,function(c){return a.r=i(c),a.g=r(c),a.b=s(c),a+""}}}var _v=gv(u2),GU=gv(f2);function oo(t,e){return t=+t,e=+e,function(n){return t*(1-n)+e*n}}var m2=/[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g,WU=new RegExp(m2.source,"g");var fv=180/Math.PI,Od={translateX:0,translateY:0,rotate:0,skewX:0,scaleX:1,scaleY:1};function vv(t,e,n,i,r,s){var o,a,c;return(o=Math.sqrt(t*t+e*e))&&(t/=o,e/=o),(c=t*n+e*i)&&(n-=t*c,i-=e*c),(a=Math.sqrt(n*n+i*i))&&(n/=a,i/=a,c/=a),t*i<e*n&&(t=-t,e=-e,c=-c,o=-o),{translateX:r,translateY:s,rotate:Math.atan2(e,t)*fv,skewX:Math.atan(c)*fv,scaleX:o,scaleY:a}}var Ph;function g2(t){let e=new(typeof DOMMatrix=="function"?DOMMatrix:WebKitCSSMatrix)(t+"");return e.isIdentity?Od:vv(e.a,e.b,e.c,e.d,e.e,e.f)}function _2(t){return t==null||(Ph||(Ph=document.createElementNS("http://www.w3.org/2000/svg","g")),Ph.setAttribute("transform",t),!(t=Ph.transform.baseVal.consolidate()))?Od:(t=t.matrix,vv(t.a,t.b,t.c,t.d,t.e,t.f))}function yv(t,e,n,i){function r(l){return l.length?l.pop()+" ":""}function s(l,u,h,f,d,m){if(l!==h||u!==f){var _=d.push("translate(",null,e,null,n);m.push({i:_-4,x:oo(l,h)},{i:_-2,x:oo(u,f)})}else(h||f)&&d.push("translate("+h+e+f+n)}function o(l,u,h,f){l!==u?(l-u>180?u+=360:u-l>180&&(l+=360),f.push({i:h.push(r(h)+"rotate(",null,i)-2,x:oo(l,u)})):u&&h.push(r(h)+"rotate("+u+i)}function a(l,u,h,f){l!==u?f.push({i:h.push(r(h)+"skewX(",null,i)-2,x:oo(l,u)}):u&&h.push(r(h)+"skewX("+u+i)}function c(l,u,h,f,d,m){if(l!==h||u!==f){var _=d.push(r(d)+"scale(",null,",",null,")");m.push({i:_-4,x:oo(l,h)},{i:_-2,x:oo(u,f)})}else(h!==1||f!==1)&&d.push(r(d)+"scale("+h+","+f+")")}return function(l,u){var h=[],f=[];return l=t(l),u=t(u),s(l.translateX,l.translateY,u.translateX,u.translateY,h,f),o(l.rotate,u.rotate,h,f),a(l.skewX,u.skewX,h,f),c(l.scaleX,l.scaleY,u.scaleX,u.scaleY,h,f),l=u=null,function(d){for(var m=-1,_=f.length,g;++m<_;)h[(g=f[m]).i]=g.x(d);return h.join("")}}}var jU=yv(g2,"px, ","px)","deg)"),qU=yv(_2,", ",")",")"),v2=1e-12;function dv(t){return((t=Math.exp(t))+1/t)/2}function y2(t){return((t=Math.exp(t))-1/t)/2}function x2(t){return((t=Math.exp(2*t))-1)/(t+1)}var XU=(function t(e,n,i){function r(s,o){var a=s[0],c=s[1],l=s[2],u=o[0],h=o[1],f=o[2],d=u-a,m=h-c,_=d*d+m*m,g,p;if(_<v2)p=Math.log(f/l)/e,g=function(A){return[a+A*d,c+A*m,l*Math.exp(e*A*p)]};else{var x=Math.sqrt(_),y=(f*f-l*l+i*_)/(2*l*n*x),v=(f*f-l*l-i*_)/(2*f*n*x),b=Math.log(Math.sqrt(y*y+1)-y),M=Math.log(Math.sqrt(v*v+1)-v);p=(M-b)/e,g=function(A){var C=A*p,T=dv(b),w=l/(n*x)*(T*x2(e*C+b)-y2(b));return[a+w*d,c+w*m,l*T/dv(e*C+b)]}}return g.duration=Math.abs(p)*1e3*e/Math.SQRT2,g}return r.rho=function(s){var o=Math.max(.001,+s),a=o*o,c=a*a;return t(o,a,c)},r})(Math.SQRT2,2,4);function xv(t){return function(e,n){var i=t((e=Ah(e)).h,(n=Ah(n)).h),r=xn(e.s,n.s),s=xn(e.l,n.l),o=xn(e.opacity,n.opacity);return function(a){return e.h=i(a),e.s=r(a),e.l=s(a),e.opacity=o(a),e+""}}}var $U=xv(Fd),YU=xv(xn);function bv(t){return function(e,n){var i=t((e=Ch(e)).h,(n=Ch(n)).h),r=xn(e.c,n.c),s=xn(e.l,n.l),o=xn(e.opacity,n.opacity);return function(a){return e.h=i(a),e.c=r(a),e.l=s(a),e.opacity=o(a),e+""}}}var ZU=bv(Fd),KU=bv(xn);function Mv(t){return(function e(n){n=+n;function i(r,s){var o=t((r=Zn(r)).h,(s=Zn(s)).h),a=xn(r.s,s.s),c=xn(r.l,s.l),l=xn(r.opacity,s.opacity);return function(u){return r.h=o(u),r.s=a(u),r.l=c(Math.pow(u,n)),r.opacity=l(u),r+""}}return i.gamma=e,i})(1)}var JU=Mv(Fd),Ih=Mv(xn);function b2(t,e){switch(arguments.length){case 0:break;case 1:this.range(t);break;default:this.range(e).domain(t);break}return this}var Sv=Symbol("implicit");function Ud(){var t=new Ea,e=[],n=[],i=Sv;function r(s){let o=t.get(s);if(o===void 0){if(i!==Sv)return i;t.set(s,o=e.push(s)-1)}return n[o%n.length]}return r.domain=function(s){if(!arguments.length)return e.slice();e=[],t=new Ea;for(let o of s)t.has(o)||t.set(o,e.push(o)-1);return r},r.range=function(s){return arguments.length?(n=Array.from(s),r):n.slice()},r.unknown=function(s){return arguments.length?(i=s,r):i},r.copy=function(){return Ud(e,n).unknown(i)},b2.apply(r,arguments),r}function Je(t){for(var e=t.length/6|0,n=new Array(e),i=0;i<e;)n[i]="#"+t.slice(i*6,++i*6);return n}var h5=Je("1f77b4ff7f0e2ca02cd627289467bd8c564be377c27f7f7fbcbd2217becf"),u5=Je("7fc97fbeaed4fdc086ffff99386cb0f0027fbf5b17666666"),f5=Je("1b9e77d95f027570b3e7298a66a61ee6ab02a6761d666666"),d5=Je("4269d0efb118ff725c6cc5b03ca951ff8ab7a463f297bbf59c6b4e9498a0"),wv=Je("a6cee31f78b4b2df8a33a02cfb9a99e31a1cfdbf6fff7f00cab2d66a3d9affff99b15928"),p5=Je("fbb4aeb3cde3ccebc5decbe4fed9a6ffffcce5d8bdfddaecf2f2f2"),m5=Je("b3e2cdfdcdaccbd5e8f4cae4e6f5c9fff2aef1e2cccccccc"),g5=Je("e41a1c377eb84daf4a984ea3ff7f00ffff33a65628f781bf999999"),_5=Je("66c2a5fc8d628da0cbe78ac3a6d854ffd92fe5c494b3b3b3"),v5=Je("8dd3c7ffffb3bebadafb807280b1d3fdb462b3de69fccde5d9d9d9bc80bdccebc5ffed6f"),y5=Je("4e79a7f28e2ce1575976b7b259a14fedc949af7aa1ff9da79c755fbab0ab"),St=t=>_v(t[t.length-1]),M2=new Array(3).concat("d8b365f5f5f55ab4ac","a6611adfc27d80cdc1018571","a6611adfc27df5f5f580cdc1018571","8c510ad8b365f6e8c3c7eae55ab4ac01665e","8c510ad8b365f6e8c3f5f5f5c7eae55ab4ac01665e","8c510abf812ddfc27df6e8c3c7eae580cdc135978f01665e","8c510abf812ddfc27df6e8c3f5f5f5c7eae580cdc135978f01665e","5430058c510abf812ddfc27df6e8c3c7eae580cdc135978f01665e003c30","5430058c510abf812ddfc27df6e8c3f5f5f5c7eae580cdc135978f01665e003c30").map(Je),x5=St(M2),S2=new Array(3).concat("af8dc3f7f7f77fbf7b","7b3294c2a5cfa6dba0008837","7b3294c2a5cff7f7f7a6dba0008837","762a83af8dc3e7d4e8d9f0d37fbf7b1b7837","762a83af8dc3e7d4e8f7f7f7d9f0d37fbf7b1b7837","762a839970abc2a5cfe7d4e8d9f0d3a6dba05aae611b7837","762a839970abc2a5cfe7d4e8f7f7f7d9f0d3a6dba05aae611b7837","40004b762a839970abc2a5cfe7d4e8d9f0d3a6dba05aae611b783700441b","40004b762a839970abc2a5cfe7d4e8f7f7f7d9f0d3a6dba05aae611b783700441b").map(Je),b5=St(S2),w2=new Array(3).concat("e9a3c9f7f7f7a1d76a","d01c8bf1b6dab8e1864dac26","d01c8bf1b6daf7f7f7b8e1864dac26","c51b7de9a3c9fde0efe6f5d0a1d76a4d9221","c51b7de9a3c9fde0eff7f7f7e6f5d0a1d76a4d9221","c51b7dde77aef1b6dafde0efe6f5d0b8e1867fbc414d9221","c51b7dde77aef1b6dafde0eff7f7f7e6f5d0b8e1867fbc414d9221","8e0152c51b7dde77aef1b6dafde0efe6f5d0b8e1867fbc414d9221276419","8e0152c51b7dde77aef1b6dafde0eff7f7f7e6f5d0b8e1867fbc414d9221276419").map(Je),M5=St(w2),E2=new Array(3).concat("998ec3f7f7f7f1a340","5e3c99b2abd2fdb863e66101","5e3c99b2abd2f7f7f7fdb863e66101","542788998ec3d8daebfee0b6f1a340b35806","542788998ec3d8daebf7f7f7fee0b6f1a340b35806","5427888073acb2abd2d8daebfee0b6fdb863e08214b35806","5427888073acb2abd2d8daebf7f7f7fee0b6fdb863e08214b35806","2d004b5427888073acb2abd2d8daebfee0b6fdb863e08214b358067f3b08","2d004b5427888073acb2abd2d8daebf7f7f7fee0b6fdb863e08214b358067f3b08").map(Je),S5=St(E2),T2=new Array(3).concat("ef8a62f7f7f767a9cf","ca0020f4a58292c5de0571b0","ca0020f4a582f7f7f792c5de0571b0","b2182bef8a62fddbc7d1e5f067a9cf2166ac","b2182bef8a62fddbc7f7f7f7d1e5f067a9cf2166ac","b2182bd6604df4a582fddbc7d1e5f092c5de4393c32166ac","b2182bd6604df4a582fddbc7f7f7f7d1e5f092c5de4393c32166ac","67001fb2182bd6604df4a582fddbc7d1e5f092c5de4393c32166ac053061","67001fb2182bd6604df4a582fddbc7f7f7f7d1e5f092c5de4393c32166ac053061").map(Je),w5=St(T2),A2=new Array(3).concat("ef8a62ffffff999999","ca0020f4a582bababa404040","ca0020f4a582ffffffbababa404040","b2182bef8a62fddbc7e0e0e09999994d4d4d","b2182bef8a62fddbc7ffffffe0e0e09999994d4d4d","b2182bd6604df4a582fddbc7e0e0e0bababa8787874d4d4d","b2182bd6604df4a582fddbc7ffffffe0e0e0bababa8787874d4d4d","67001fb2182bd6604df4a582fddbc7e0e0e0bababa8787874d4d4d1a1a1a","67001fb2182bd6604df4a582fddbc7ffffffe0e0e0bababa8787874d4d4d1a1a1a").map(Je),E5=St(A2),C2=new Array(3).concat("fc8d59ffffbf91bfdb","d7191cfdae61abd9e92c7bb6","d7191cfdae61ffffbfabd9e92c7bb6","d73027fc8d59fee090e0f3f891bfdb4575b4","d73027fc8d59fee090ffffbfe0f3f891bfdb4575b4","d73027f46d43fdae61fee090e0f3f8abd9e974add14575b4","d73027f46d43fdae61fee090ffffbfe0f3f8abd9e974add14575b4","a50026d73027f46d43fdae61fee090e0f3f8abd9e974add14575b4313695","a50026d73027f46d43fdae61fee090ffffbfe0f3f8abd9e974add14575b4313695").map(Je),T5=St(C2),R2=new Array(3).concat("fc8d59ffffbf91cf60","d7191cfdae61a6d96a1a9641","d7191cfdae61ffffbfa6d96a1a9641","d73027fc8d59fee08bd9ef8b91cf601a9850","d73027fc8d59fee08bffffbfd9ef8b91cf601a9850","d73027f46d43fdae61fee08bd9ef8ba6d96a66bd631a9850","d73027f46d43fdae61fee08bffffbfd9ef8ba6d96a66bd631a9850","a50026d73027f46d43fdae61fee08bd9ef8ba6d96a66bd631a9850006837","a50026d73027f46d43fdae61fee08bffffbfd9ef8ba6d96a66bd631a9850006837").map(Je),A5=St(R2),P2=new Array(3).concat("fc8d59ffffbf99d594","d7191cfdae61abdda42b83ba","d7191cfdae61ffffbfabdda42b83ba","d53e4ffc8d59fee08be6f59899d5943288bd","d53e4ffc8d59fee08bffffbfe6f59899d5943288bd","d53e4ff46d43fdae61fee08be6f598abdda466c2a53288bd","d53e4ff46d43fdae61fee08bffffbfe6f598abdda466c2a53288bd","9e0142d53e4ff46d43fdae61fee08be6f598abdda466c2a53288bd5e4fa2","9e0142d53e4ff46d43fdae61fee08bffffbfe6f598abdda466c2a53288bd5e4fa2").map(Je),C5=St(P2),I2=new Array(3).concat("e5f5f999d8c92ca25f","edf8fbb2e2e266c2a4238b45","edf8fbb2e2e266c2a42ca25f006d2c","edf8fbccece699d8c966c2a42ca25f006d2c","edf8fbccece699d8c966c2a441ae76238b45005824","f7fcfde5f5f9ccece699d8c966c2a441ae76238b45005824","f7fcfde5f5f9ccece699d8c966c2a441ae76238b45006d2c00441b").map(Je),R5=St(I2),D2=new Array(3).concat("e0ecf49ebcda8856a7","edf8fbb3cde38c96c688419d","edf8fbb3cde38c96c68856a7810f7c","edf8fbbfd3e69ebcda8c96c68856a7810f7c","edf8fbbfd3e69ebcda8c96c68c6bb188419d6e016b","f7fcfde0ecf4bfd3e69ebcda8c96c68c6bb188419d6e016b","f7fcfde0ecf4bfd3e69ebcda8c96c68c6bb188419d810f7c4d004b").map(Je),P5=St(D2),L2=new Array(3).concat("e0f3dba8ddb543a2ca","f0f9e8bae4bc7bccc42b8cbe","f0f9e8bae4bc7bccc443a2ca0868ac","f0f9e8ccebc5a8ddb57bccc443a2ca0868ac","f0f9e8ccebc5a8ddb57bccc44eb3d32b8cbe08589e","f7fcf0e0f3dbccebc5a8ddb57bccc44eb3d32b8cbe08589e","f7fcf0e0f3dbccebc5a8ddb57bccc44eb3d32b8cbe0868ac084081").map(Je),I5=St(L2),O2=new Array(3).concat("fee8c8fdbb84e34a33","fef0d9fdcc8afc8d59d7301f","fef0d9fdcc8afc8d59e34a33b30000","fef0d9fdd49efdbb84fc8d59e34a33b30000","fef0d9fdd49efdbb84fc8d59ef6548d7301f990000","fff7ecfee8c8fdd49efdbb84fc8d59ef6548d7301f990000","fff7ecfee8c8fdd49efdbb84fc8d59ef6548d7301fb300007f0000").map(Je),D5=St(O2),N2=new Array(3).concat("ece2f0a6bddb1c9099","f6eff7bdc9e167a9cf02818a","f6eff7bdc9e167a9cf1c9099016c59","f6eff7d0d1e6a6bddb67a9cf1c9099016c59","f6eff7d0d1e6a6bddb67a9cf3690c002818a016450","fff7fbece2f0d0d1e6a6bddb67a9cf3690c002818a016450","fff7fbece2f0d0d1e6a6bddb67a9cf3690c002818a016c59014636").map(Je),L5=St(N2),F2=new Array(3).concat("ece7f2a6bddb2b8cbe","f1eef6bdc9e174a9cf0570b0","f1eef6bdc9e174a9cf2b8cbe045a8d","f1eef6d0d1e6a6bddb74a9cf2b8cbe045a8d","f1eef6d0d1e6a6bddb74a9cf3690c00570b0034e7b","fff7fbece7f2d0d1e6a6bddb74a9cf3690c00570b0034e7b","fff7fbece7f2d0d1e6a6bddb74a9cf3690c00570b0045a8d023858").map(Je),O5=St(F2),U2=new Array(3).concat("e7e1efc994c7dd1c77","f1eef6d7b5d8df65b0ce1256","f1eef6d7b5d8df65b0dd1c77980043","f1eef6d4b9dac994c7df65b0dd1c77980043","f1eef6d4b9dac994c7df65b0e7298ace125691003f","f7f4f9e7e1efd4b9dac994c7df65b0e7298ace125691003f","f7f4f9e7e1efd4b9dac994c7df65b0e7298ace125698004367001f").map(Je),N5=St(U2),z2=new Array(3).concat("fde0ddfa9fb5c51b8a","feebe2fbb4b9f768a1ae017e","feebe2fbb4b9f768a1c51b8a7a0177","feebe2fcc5c0fa9fb5f768a1c51b8a7a0177","feebe2fcc5c0fa9fb5f768a1dd3497ae017e7a0177","fff7f3fde0ddfcc5c0fa9fb5f768a1dd3497ae017e7a0177","fff7f3fde0ddfcc5c0fa9fb5f768a1dd3497ae017e7a017749006a").map(Je),F5=St(z2),k2=new Array(3).concat("edf8b17fcdbb2c7fb8","ffffcca1dab441b6c4225ea8","ffffcca1dab441b6c42c7fb8253494","ffffccc7e9b47fcdbb41b6c42c7fb8253494","ffffccc7e9b47fcdbb41b6c41d91c0225ea80c2c84","ffffd9edf8b1c7e9b47fcdbb41b6c41d91c0225ea80c2c84","ffffd9edf8b1c7e9b47fcdbb41b6c41d91c0225ea8253494081d58").map(Je),U5=St(k2),B2=new Array(3).concat("f7fcb9addd8e31a354","ffffccc2e69978c679238443","ffffccc2e69978c67931a354006837","ffffccd9f0a3addd8e78c67931a354006837","ffffccd9f0a3addd8e78c67941ab5d238443005a32","ffffe5f7fcb9d9f0a3addd8e78c67941ab5d238443005a32","ffffe5f7fcb9d9f0a3addd8e78c67941ab5d238443006837004529").map(Je),z5=St(B2),V2=new Array(3).concat("fff7bcfec44fd95f0e","ffffd4fed98efe9929cc4c02","ffffd4fed98efe9929d95f0e993404","ffffd4fee391fec44ffe9929d95f0e993404","ffffd4fee391fec44ffe9929ec7014cc4c028c2d04","ffffe5fff7bcfee391fec44ffe9929ec7014cc4c028c2d04","ffffe5fff7bcfee391fec44ffe9929ec7014cc4c02993404662506").map(Je),k5=St(V2),H2=new Array(3).concat("ffeda0feb24cf03b20","ffffb2fecc5cfd8d3ce31a1c","ffffb2fecc5cfd8d3cf03b20bd0026","ffffb2fed976feb24cfd8d3cf03b20bd0026","ffffb2fed976feb24cfd8d3cfc4e2ae31a1cb10026","ffffccffeda0fed976feb24cfd8d3cfc4e2ae31a1cb10026","ffffccffeda0fed976feb24cfd8d3cfc4e2ae31a1cbd0026800026").map(Je),B5=St(H2),G2=new Array(3).concat("deebf79ecae13182bd","eff3ffbdd7e76baed62171b5","eff3ffbdd7e76baed63182bd08519c","eff3ffc6dbef9ecae16baed63182bd08519c","eff3ffc6dbef9ecae16baed64292c62171b5084594","f7fbffdeebf7c6dbef9ecae16baed64292c62171b5084594","f7fbffdeebf7c6dbef9ecae16baed64292c62171b508519c08306b").map(Je),V5=St(G2),W2=new Array(3).concat("e5f5e0a1d99b31a354","edf8e9bae4b374c476238b45","edf8e9bae4b374c47631a354006d2c","edf8e9c7e9c0a1d99b74c47631a354006d2c","edf8e9c7e9c0a1d99b74c47641ab5d238b45005a32","f7fcf5e5f5e0c7e9c0a1d99b74c47641ab5d238b45005a32","f7fcf5e5f5e0c7e9c0a1d99b74c47641ab5d238b45006d2c00441b").map(Je),H5=St(W2),j2=new Array(3).concat("f0f0f0bdbdbd636363","f7f7f7cccccc969696525252","f7f7f7cccccc969696636363252525","f7f7f7d9d9d9bdbdbd969696636363252525","f7f7f7d9d9d9bdbdbd969696737373525252252525","fffffff0f0f0d9d9d9bdbdbd969696737373525252252525","fffffff0f0f0d9d9d9bdbdbd969696737373525252252525000000").map(Je),G5=St(j2),q2=new Array(3).concat("efedf5bcbddc756bb1","f2f0f7cbc9e29e9ac86a51a3","f2f0f7cbc9e29e9ac8756bb154278f","f2f0f7dadaebbcbddc9e9ac8756bb154278f","f2f0f7dadaebbcbddc9e9ac8807dba6a51a34a1486","fcfbfdefedf5dadaebbcbddc9e9ac8807dba6a51a34a1486","fcfbfdefedf5dadaebbcbddc9e9ac8807dba6a51a354278f3f007d").map(Je),W5=St(q2),X2=new Array(3).concat("fee0d2fc9272de2d26","fee5d9fcae91fb6a4acb181d","fee5d9fcae91fb6a4ade2d26a50f15","fee5d9fcbba1fc9272fb6a4ade2d26a50f15","fee5d9fcbba1fc9272fb6a4aef3b2ccb181d99000d","fff5f0fee0d2fcbba1fc9272fb6a4aef3b2ccb181d99000d","fff5f0fee0d2fcbba1fc9272fb6a4aef3b2ccb181da50f1567000d").map(Je),j5=St(X2),$2=new Array(3).concat("fee6cefdae6be6550d","feeddefdbe85fd8d3cd94701","feeddefdbe85fd8d3ce6550da63603","feeddefdd0a2fdae6bfd8d3ce6550da63603","feeddefdd0a2fdae6bfd8d3cf16913d948018c2d04","fff5ebfee6cefdd0a2fdae6bfd8d3cf16913d948018c2d04","fff5ebfee6cefdd0a2fdae6bfd8d3cf16913d94801a636037f2704").map(Je),q5=St($2);var X5=Ih(Zn(300,.5,0),Zn(-240,.5,1)),$5=Ih(Zn(-100,.75,.35),Zn(80,1.5,.8)),Y5=Ih(Zn(260,.75,.35),Zn(80,1.5,.8)),Z5=Zn();var K5=Qr(),J5=Math.PI/3,Q5=Math.PI*2/3;function Dh(t){var e=t.length;return function(n){return t[Math.max(0,Math.min(e-1,Math.floor(n*e)))]}}var e4=Dh(Je("44015444025645045745055946075a46085c460a5d460b5e470d60470e6147106347116447136548146748166848176948186a481a6c481b6d481c6e481d6f481f70482071482173482374482475482576482677482878482979472a7a472c7a472d7b472e7c472f7d46307e46327e46337f463480453581453781453882443983443a83443b84433d84433e85423f854240864241864142874144874045884046883f47883f48893e49893e4a893e4c8a3d4d8a3d4e8a3c4f8a3c508b3b518b3b528b3a538b3a548c39558c39568c38588c38598c375a8c375b8d365c8d365d8d355e8d355f8d34608d34618d33628d33638d32648e32658e31668e31678e31688e30698e306a8e2f6b8e2f6c8e2e6d8e2e6e8e2e6f8e2d708e2d718e2c718e2c728e2c738e2b748e2b758e2a768e2a778e2a788e29798e297a8e297b8e287c8e287d8e277e8e277f8e27808e26818e26828e26828e25838e25848e25858e24868e24878e23888e23898e238a8d228b8d228c8d228d8d218e8d218f8d21908d21918c20928c20928c20938c1f948c1f958b1f968b1f978b1f988b1f998a1f9a8a1e9b8a1e9c891e9d891f9e891f9f881fa0881fa1881fa1871fa28720a38620a48621a58521a68522a78522a88423a98324aa8325ab8225ac8226ad8127ad8128ae8029af7f2ab07f2cb17e2db27d2eb37c2fb47c31b57b32b67a34b67935b77937b87838b9773aba763bbb753dbc743fbc7340bd7242be7144bf7046c06f48c16e4ac16d4cc26c4ec36b50c46a52c56954c56856c66758c7655ac8645cc8635ec96260ca6063cb5f65cb5e67cc5c69cd5b6ccd5a6ece5870cf5773d05675d05477d1537ad1517cd2507fd34e81d34d84d44b86d54989d5488bd6468ed64590d74393d74195d84098d83e9bd93c9dd93ba0da39a2da37a5db36a8db34aadc32addc30b0dd2fb2dd2db5de2bb8de29bade28bddf26c0df25c2df23c5e021c8e020cae11fcde11dd0e11cd2e21bd5e21ad8e219dae319dde318dfe318e2e418e5e419e7e419eae51aece51befe51cf1e51df4e61ef6e620f8e621fbe723fde725")),t4=Dh(Je("00000401000501010601010802010902020b02020d03030f03031204041405041606051806051a07061c08071e0907200a08220b09240c09260d0a290e0b2b100b2d110c2f120d31130d34140e36150e38160f3b180f3d19103f1a10421c10441d11471e114920114b21114e22115024125325125527125829115a2a115c2c115f2d11612f116331116533106734106936106b38106c390f6e3b0f703d0f713f0f72400f74420f75440f764510774710784910784a10794c117a4e117b4f127b51127c52137c54137d56147d57157e59157e5a167e5c167f5d177f5f187f601880621980641a80651a80671b80681c816a1c816b1d816d1d816e1e81701f81721f817320817521817621817822817922827b23827c23827e24828025828125818326818426818627818827818928818b29818c29818e2a81902a81912b81932b80942c80962c80982d80992d809b2e7f9c2e7f9e2f7fa02f7fa1307ea3307ea5317ea6317da8327daa337dab337cad347cae347bb0357bb2357bb3367ab5367ab73779b83779ba3878bc3978bd3977bf3a77c03a76c23b75c43c75c53c74c73d73c83e73ca3e72cc3f71cd4071cf4070d0416fd2426fd3436ed5446dd6456cd8456cd9466bdb476adc4869de4968df4a68e04c67e24d66e34e65e44f64e55064e75263e85362e95462ea5661eb5760ec5860ed5a5fee5b5eef5d5ef05f5ef1605df2625df2645cf3655cf4675cf4695cf56b5cf66c5cf66e5cf7705cf7725cf8745cf8765cf9785df9795df97b5dfa7d5efa7f5efa815ffb835ffb8560fb8761fc8961fc8a62fc8c63fc8e64fc9065fd9266fd9467fd9668fd9869fd9a6afd9b6bfe9d6cfe9f6dfea16efea36ffea571fea772fea973feaa74feac76feae77feb078feb27afeb47bfeb67cfeb77efeb97ffebb81febd82febf84fec185fec287fec488fec68afec88cfeca8dfecc8ffecd90fecf92fed194fed395fed597fed799fed89afdda9cfddc9efddea0fde0a1fde2a3fde3a5fde5a7fde7a9fde9aafdebacfcecaefceeb0fcf0b2fcf2b4fcf4b6fcf6b8fcf7b9fcf9bbfcfbbdfcfdbf")),n4=Dh(Je("00000401000501010601010802010a02020c02020e03021004031204031405041706041907051b08051d09061f0a07220b07240c08260d08290e092b10092d110a30120a32140b34150b37160b39180c3c190c3e1b0c411c0c431e0c451f0c48210c4a230c4c240c4f260c51280b53290b552b0b572d0b592f0a5b310a5c320a5e340a5f3609613809623909633b09643d09653e0966400a67420a68440a68450a69470b6a490b6a4a0c6b4c0c6b4d0d6c4f0d6c510e6c520e6d540f6d550f6d57106e59106e5a116e5c126e5d126e5f136e61136e62146e64156e65156e67166e69166e6a176e6c186e6d186e6f196e71196e721a6e741a6e751b6e771c6d781c6d7a1d6d7c1d6d7d1e6d7f1e6c801f6c82206c84206b85216b87216b88226a8a226a8c23698d23698f24699025689225689326679526679727669827669a28659b29649d29649f2a63a02a63a22b62a32c61a52c60a62d60a82e5fa92e5eab2f5ead305dae305cb0315bb1325ab3325ab43359b63458b73557b93556ba3655bc3754bd3853bf3952c03a51c13a50c33b4fc43c4ec63d4dc73e4cc83f4bca404acb4149cc4248ce4347cf4446d04545d24644d34743d44842d54a41d74b3fd84c3ed94d3dda4e3cdb503bdd513ade5238df5337e05536e15635e25734e35933e45a31e55c30e65d2fe75e2ee8602de9612bea632aeb6429eb6628ec6726ed6925ee6a24ef6c23ef6e21f06f20f1711ff1731df2741cf3761bf37819f47918f57b17f57d15f67e14f68013f78212f78410f8850ff8870ef8890cf98b0bf98c0af98e09fa9008fa9207fa9407fb9606fb9706fb9906fb9b06fb9d07fc9f07fca108fca309fca50afca60cfca80dfcaa0ffcac11fcae12fcb014fcb216fcb418fbb61afbb81dfbba1ffbbc21fbbe23fac026fac228fac42afac62df9c72ff9c932f9cb35f8cd37f8cf3af7d13df7d340f6d543f6d746f5d949f5db4cf4dd4ff4df53f4e156f3e35af3e55df2e661f2e865f2ea69f1ec6df1ed71f1ef75f1f179f2f27df2f482f3f586f3f68af4f88ef5f992f6fa96f8fb9af9fc9dfafda1fcffa4")),i4=Dh(Je("0d088710078813078916078a19068c1b068d1d068e20068f2206902406912605912805922a05932c05942e05952f059631059733059735049837049938049a3a049a3c049b3e049c3f049c41049d43039e44039e46039f48039f4903a04b03a14c02a14e02a25002a25102a35302a35502a45601a45801a45901a55b01a55c01a65e01a66001a66100a76300a76400a76600a76700a86900a86a00a86c00a86e00a86f00a87100a87201a87401a87501a87701a87801a87a02a87b02a87d03a87e03a88004a88104a78305a78405a78606a68707a68808a68a09a58b0aa58d0ba58e0ca48f0da4910ea3920fa39410a29511a19613a19814a099159f9a169f9c179e9d189d9e199da01a9ca11b9ba21d9aa31e9aa51f99a62098a72197a82296aa2395ab2494ac2694ad2793ae2892b02991b12a90b22b8fb32c8eb42e8db52f8cb6308bb7318ab83289ba3388bb3488bc3587bd3786be3885bf3984c03a83c13b82c23c81c33d80c43e7fc5407ec6417dc7427cc8437bc9447aca457acb4679cc4778cc4977cd4a76ce4b75cf4c74d04d73d14e72d24f71d35171d45270d5536fd5546ed6556dd7566cd8576bd9586ada5a6ada5b69db5c68dc5d67dd5e66de5f65de6164df6263e06363e16462e26561e26660e3685fe4695ee56a5de56b5de66c5ce76e5be76f5ae87059e97158e97257ea7457eb7556eb7655ec7754ed7953ed7a52ee7b51ef7c51ef7e50f07f4ff0804ef1814df1834cf2844bf3854bf3874af48849f48948f58b47f58c46f68d45f68f44f79044f79143f79342f89441f89540f9973ff9983ef99a3efa9b3dfa9c3cfa9e3bfb9f3afba139fba238fca338fca537fca636fca835fca934fdab33fdac33fdae32fdaf31fdb130fdb22ffdb42ffdb52efeb72dfeb82cfeba2cfebb2bfebd2afebe2afec029fdc229fdc328fdc527fdc627fdc827fdca26fdcb26fccd25fcce25fcd025fcd225fbd324fbd524fbd724fad824fada24f9dc24f9dd25f8df25f8e125f7e225f7e425f6e626f6e826f5e926f5eb27f4ed27f3ee27f3f027f2f227f1f426f1f525f0f724f0f921"));function Lh(t){"@babel/helpers - typeof";return Lh=typeof Symbol=="function"&&typeof Symbol.iterator=="symbol"?function(e){return typeof e}:function(e){return e&&typeof Symbol=="function"&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e},Lh(t)}var Y2=/^\s+/,Z2=/\s+$/;function De(t,e){if(t=t||"",e=e||{},t instanceof De)return t;if(!(this instanceof De))return new De(t,e);var n=K2(t);this._originalInput=t,this._r=n.r,this._g=n.g,this._b=n.b,this._a=n.a,this._roundA=Math.round(100*this._a)/100,this._format=e.format||n.format,this._gradientType=e.gradientType,this._r<1&&(this._r=Math.round(this._r)),this._g<1&&(this._g=Math.round(this._g)),this._b<1&&(this._b=Math.round(this._b)),this._ok=n.ok}De.prototype={isDark:function(){return this.getBrightness()<128},isLight:function(){return!this.isDark()},isValid:function(){return this._ok},getOriginalInput:function(){return this._originalInput},getFormat:function(){return this._format},getAlpha:function(){return this._a},getBrightness:function(){var e=this.toRgb();return(e.r*299+e.g*587+e.b*114)/1e3},getLuminance:function(){var e=this.toRgb(),n,i,r,s,o,a;return n=e.r/255,i=e.g/255,r=e.b/255,n<=.03928?s=n/12.92:s=Math.pow((n+.055)/1.055,2.4),i<=.03928?o=i/12.92:o=Math.pow((i+.055)/1.055,2.4),r<=.03928?a=r/12.92:a=Math.pow((r+.055)/1.055,2.4),.2126*s+.7152*o+.0722*a},setAlpha:function(e){return this._a=Iv(e),this._roundA=Math.round(100*this._a)/100,this},toHsv:function(){var e=Tv(this._r,this._g,this._b);return{h:e.h*360,s:e.s,v:e.v,a:this._a}},toHsvString:function(){var e=Tv(this._r,this._g,this._b),n=Math.round(e.h*360),i=Math.round(e.s*100),r=Math.round(e.v*100);return this._a==1?"hsv("+n+", "+i+"%, "+r+"%)":"hsva("+n+", "+i+"%, "+r+"%, "+this._roundA+")"},toHsl:function(){var e=Ev(this._r,this._g,this._b);return{h:e.h*360,s:e.s,l:e.l,a:this._a}},toHslString:function(){var e=Ev(this._r,this._g,this._b),n=Math.round(e.h*360),i=Math.round(e.s*100),r=Math.round(e.l*100);return this._a==1?"hsl("+n+", "+i+"%, "+r+"%)":"hsla("+n+", "+i+"%, "+r+"%, "+this._roundA+")"},toHex:function(e){return Av(this._r,this._g,this._b,e)},toHexString:function(e){return"#"+this.toHex(e)},toHex8:function(e){return tC(this._r,this._g,this._b,this._a,e)},toHex8String:function(e){return"#"+this.toHex8(e)},toRgb:function(){return{r:Math.round(this._r),g:Math.round(this._g),b:Math.round(this._b),a:this._a}},toRgbString:function(){return this._a==1?"rgb("+Math.round(this._r)+", "+Math.round(this._g)+", "+Math.round(this._b)+")":"rgba("+Math.round(this._r)+", "+Math.round(this._g)+", "+Math.round(this._b)+", "+this._roundA+")"},toPercentageRgb:function(){return{r:Math.round(Rt(this._r,255)*100)+"%",g:Math.round(Rt(this._g,255)*100)+"%",b:Math.round(Rt(this._b,255)*100)+"%",a:this._a}},toPercentageRgbString:function(){return this._a==1?"rgb("+Math.round(Rt(this._r,255)*100)+"%, "+Math.round(Rt(this._g,255)*100)+"%, "+Math.round(Rt(this._b,255)*100)+"%)":"rgba("+Math.round(Rt(this._r,255)*100)+"%, "+Math.round(Rt(this._g,255)*100)+"%, "+Math.round(Rt(this._b,255)*100)+"%, "+this._roundA+")"},toName:function(){return this._a===0?"transparent":this._a<1?!1:dC[Av(this._r,this._g,this._b,!0)]||!1},toFilter:function(e){var n="#"+Cv(this._r,this._g,this._b,this._a),i=n,r=this._gradientType?"GradientType = 1, ":"";if(e){var s=De(e);i="#"+Cv(s._r,s._g,s._b,s._a)}return"progid:DXImageTransform.Microsoft.gradient("+r+"startColorstr="+n+",endColorstr="+i+")"},toString:function(e){var n=!!e;e=e||this._format;var i=!1,r=this._a<1&&this._a>=0,s=!n&&r&&(e==="hex"||e==="hex6"||e==="hex3"||e==="hex4"||e==="hex8"||e==="name");return s?e==="name"&&this._a===0?this.toName():this.toRgbString():(e==="rgb"&&(i=this.toRgbString()),e==="prgb"&&(i=this.toPercentageRgbString()),(e==="hex"||e==="hex6")&&(i=this.toHexString()),e==="hex3"&&(i=this.toHexString(!0)),e==="hex4"&&(i=this.toHex8String(!0)),e==="hex8"&&(i=this.toHex8String()),e==="name"&&(i=this.toName()),e==="hsl"&&(i=this.toHslString()),e==="hsv"&&(i=this.toHsvString()),i||this.toHexString())},clone:function(){return De(this.toString())},_applyModification:function(e,n){var i=e.apply(null,[this].concat([].slice.call(n)));return this._r=i._r,this._g=i._g,this._b=i._b,this.setAlpha(i._a),this},lighten:function(){return this._applyModification(sC,arguments)},brighten:function(){return this._applyModification(oC,arguments)},darken:function(){return this._applyModification(aC,arguments)},desaturate:function(){return this._applyModification(nC,arguments)},saturate:function(){return this._applyModification(iC,arguments)},greyscale:function(){return this._applyModification(rC,arguments)},spin:function(){return this._applyModification(cC,arguments)},_applyCombination:function(e,n){return e.apply(null,[this].concat([].slice.call(n)))},analogous:function(){return this._applyCombination(uC,arguments)},complement:function(){return this._applyCombination(lC,arguments)},monochromatic:function(){return this._applyCombination(fC,arguments)},splitcomplement:function(){return this._applyCombination(hC,arguments)},triad:function(){return this._applyCombination(Rv,[3])},tetrad:function(){return this._applyCombination(Rv,[4])}};De.fromRatio=function(t,e){if(Lh(t)=="object"){var n={};for(var i in t)t.hasOwnProperty(i)&&(i==="a"?n[i]=t[i]:n[i]=Pa(t[i]));t=n}return De(t,e)};function K2(t){var e={r:0,g:0,b:0},n=1,i=null,r=null,s=null,o=!1,a=!1;return typeof t=="string"&&(t=_C(t)),Lh(t)=="object"&&(Xi(t.r)&&Xi(t.g)&&Xi(t.b)?(e=J2(t.r,t.g,t.b),o=!0,a=String(t.r).substr(-1)==="%"?"prgb":"rgb"):Xi(t.h)&&Xi(t.s)&&Xi(t.v)?(i=Pa(t.s),r=Pa(t.v),e=eC(t.h,i,r),o=!0,a="hsv"):Xi(t.h)&&Xi(t.s)&&Xi(t.l)&&(i=Pa(t.s),s=Pa(t.l),e=Q2(t.h,i,s),o=!0,a="hsl"),t.hasOwnProperty("a")&&(n=t.a)),n=Iv(n),{ok:o,format:t.format||a,r:Math.min(255,Math.max(e.r,0)),g:Math.min(255,Math.max(e.g,0)),b:Math.min(255,Math.max(e.b,0)),a:n}}function J2(t,e,n){return{r:Rt(t,255)*255,g:Rt(e,255)*255,b:Rt(n,255)*255}}function Ev(t,e,n){t=Rt(t,255),e=Rt(e,255),n=Rt(n,255);var i=Math.max(t,e,n),r=Math.min(t,e,n),s,o,a=(i+r)/2;if(i==r)s=o=0;else{var c=i-r;switch(o=a>.5?c/(2-i-r):c/(i+r),i){case t:s=(e-n)/c+(e<n?6:0);break;case e:s=(n-t)/c+2;break;case n:s=(t-e)/c+4;break}s/=6}return{h:s,s:o,l:a}}function Q2(t,e,n){var i,r,s;t=Rt(t,360),e=Rt(e,100),n=Rt(n,100);function o(l,u,h){return h<0&&(h+=1),h>1&&(h-=1),h<1/6?l+(u-l)*6*h:h<1/2?u:h<2/3?l+(u-l)*(2/3-h)*6:l}if(e===0)i=r=s=n;else{var a=n<.5?n*(1+e):n+e-n*e,c=2*n-a;i=o(c,a,t+1/3),r=o(c,a,t),s=o(c,a,t-1/3)}return{r:i*255,g:r*255,b:s*255}}function Tv(t,e,n){t=Rt(t,255),e=Rt(e,255),n=Rt(n,255);var i=Math.max(t,e,n),r=Math.min(t,e,n),s,o,a=i,c=i-r;if(o=i===0?0:c/i,i==r)s=0;else{switch(i){case t:s=(e-n)/c+(e<n?6:0);break;case e:s=(n-t)/c+2;break;case n:s=(t-e)/c+4;break}s/=6}return{h:s,s:o,v:a}}function eC(t,e,n){t=Rt(t,360)*6,e=Rt(e,100),n=Rt(n,100);var i=Math.floor(t),r=t-i,s=n*(1-e),o=n*(1-r*e),a=n*(1-(1-r)*e),c=i%6,l=[n,o,s,s,a,n][c],u=[a,n,n,o,s,s][c],h=[s,s,a,n,n,o][c];return{r:l*255,g:u*255,b:h*255}}function Av(t,e,n,i){var r=[hi(Math.round(t).toString(16)),hi(Math.round(e).toString(16)),hi(Math.round(n).toString(16))];return i&&r[0].charAt(0)==r[0].charAt(1)&&r[1].charAt(0)==r[1].charAt(1)&&r[2].charAt(0)==r[2].charAt(1)?r[0].charAt(0)+r[1].charAt(0)+r[2].charAt(0):r.join("")}function tC(t,e,n,i,r){var s=[hi(Math.round(t).toString(16)),hi(Math.round(e).toString(16)),hi(Math.round(n).toString(16)),hi(Dv(i))];return r&&s[0].charAt(0)==s[0].charAt(1)&&s[1].charAt(0)==s[1].charAt(1)&&s[2].charAt(0)==s[2].charAt(1)&&s[3].charAt(0)==s[3].charAt(1)?s[0].charAt(0)+s[1].charAt(0)+s[2].charAt(0)+s[3].charAt(0):s.join("")}function Cv(t,e,n,i){var r=[hi(Dv(i)),hi(Math.round(t).toString(16)),hi(Math.round(e).toString(16)),hi(Math.round(n).toString(16))];return r.join("")}De.equals=function(t,e){return!t||!e?!1:De(t).toRgbString()==De(e).toRgbString()};De.random=function(){return De.fromRatio({r:Math.random(),g:Math.random(),b:Math.random()})};function nC(t,e){e=e===0?0:e||10;var n=De(t).toHsl();return n.s-=e/100,n.s=Oh(n.s),De(n)}function iC(t,e){e=e===0?0:e||10;var n=De(t).toHsl();return n.s+=e/100,n.s=Oh(n.s),De(n)}function rC(t){return De(t).desaturate(100)}function sC(t,e){e=e===0?0:e||10;var n=De(t).toHsl();return n.l+=e/100,n.l=Oh(n.l),De(n)}function oC(t,e){e=e===0?0:e||10;var n=De(t).toRgb();return n.r=Math.max(0,Math.min(255,n.r-Math.round(255*-(e/100)))),n.g=Math.max(0,Math.min(255,n.g-Math.round(255*-(e/100)))),n.b=Math.max(0,Math.min(255,n.b-Math.round(255*-(e/100)))),De(n)}function aC(t,e){e=e===0?0:e||10;var n=De(t).toHsl();return n.l-=e/100,n.l=Oh(n.l),De(n)}function cC(t,e){var n=De(t).toHsl(),i=(n.h+e)%360;return n.h=i<0?360+i:i,De(n)}function lC(t){var e=De(t).toHsl();return e.h=(e.h+180)%360,De(e)}function Rv(t,e){if(isNaN(e)||e<=0)throw new Error("Argument to polyad must be a positive number");for(var n=De(t).toHsl(),i=[De(t)],r=360/e,s=1;s<e;s++)i.push(De({h:(n.h+s*r)%360,s:n.s,l:n.l}));return i}function hC(t){var e=De(t).toHsl(),n=e.h;return[De(t),De({h:(n+72)%360,s:e.s,l:e.l}),De({h:(n+216)%360,s:e.s,l:e.l})]}function uC(t,e,n){e=e||6,n=n||30;var i=De(t).toHsl(),r=360/n,s=[De(t)];for(i.h=(i.h-(r*e>>1)+720)%360;--e;)i.h=(i.h+r)%360,s.push(De(i));return s}function fC(t,e){e=e||6;for(var n=De(t).toHsv(),i=n.h,r=n.s,s=n.v,o=[],a=1/e;e--;)o.push(De({h:i,s:r,v:s})),s=(s+a)%1;return o}De.mix=function(t,e,n){n=n===0?0:n||50;var i=De(t).toRgb(),r=De(e).toRgb(),s=n/100,o={r:(r.r-i.r)*s+i.r,g:(r.g-i.g)*s+i.g,b:(r.b-i.b)*s+i.b,a:(r.a-i.a)*s+i.a};return De(o)};De.readability=function(t,e){var n=De(t),i=De(e);return(Math.max(n.getLuminance(),i.getLuminance())+.05)/(Math.min(n.getLuminance(),i.getLuminance())+.05)};De.isReadable=function(t,e,n){var i=De.readability(t,e),r,s;switch(s=!1,r=vC(n),r.level+r.size){case"AAsmall":case"AAAlarge":s=i>=4.5;break;case"AAlarge":s=i>=3;break;case"AAAsmall":s=i>=7;break}return s};De.mostReadable=function(t,e,n){var i=null,r=0,s,o,a,c;n=n||{},o=n.includeFallbackColors,a=n.level,c=n.size;for(var l=0;l<e.length;l++)s=De.readability(t,e[l]),s>r&&(r=s,i=De(e[l]));return De.isReadable(t,i,{level:a,size:c})||!o?i:(n.includeFallbackColors=!1,De.mostReadable(t,["#fff","#000"],n))};var zd=De.names={aliceblue:"f0f8ff",antiquewhite:"faebd7",aqua:"0ff",aquamarine:"7fffd4",azure:"f0ffff",beige:"f5f5dc",bisque:"ffe4c4",black:"000",blanchedalmond:"ffebcd",blue:"00f",blueviolet:"8a2be2",brown:"a52a2a",burlywood:"deb887",burntsienna:"ea7e5d",cadetblue:"5f9ea0",chartreuse:"7fff00",chocolate:"d2691e",coral:"ff7f50",cornflowerblue:"6495ed",cornsilk:"fff8dc",crimson:"dc143c",cyan:"0ff",darkblue:"00008b",darkcyan:"008b8b",darkgoldenrod:"b8860b",darkgray:"a9a9a9",darkgreen:"006400",darkgrey:"a9a9a9",darkkhaki:"bdb76b",darkmagenta:"8b008b",darkolivegreen:"556b2f",darkorange:"ff8c00",darkorchid:"9932cc",darkred:"8b0000",darksalmon:"e9967a",darkseagreen:"8fbc8f",darkslateblue:"483d8b",darkslategray:"2f4f4f",darkslategrey:"2f4f4f",darkturquoise:"00ced1",darkviolet:"9400d3",deeppink:"ff1493",deepskyblue:"00bfff",dimgray:"696969",dimgrey:"696969",dodgerblue:"1e90ff",firebrick:"b22222",floralwhite:"fffaf0",forestgreen:"228b22",fuchsia:"f0f",gainsboro:"dcdcdc",ghostwhite:"f8f8ff",gold:"ffd700",goldenrod:"daa520",gray:"808080",green:"008000",greenyellow:"adff2f",grey:"808080",honeydew:"f0fff0",hotpink:"ff69b4",indianred:"cd5c5c",indigo:"4b0082",ivory:"fffff0",khaki:"f0e68c",lavender:"e6e6fa",lavenderblush:"fff0f5",lawngreen:"7cfc00",lemonchiffon:"fffacd",lightblue:"add8e6",lightcoral:"f08080",lightcyan:"e0ffff",lightgoldenrodyellow:"fafad2",lightgray:"d3d3d3",lightgreen:"90ee90",lightgrey:"d3d3d3",lightpink:"ffb6c1",lightsalmon:"ffa07a",lightseagreen:"20b2aa",lightskyblue:"87cefa",lightslategray:"789",lightslategrey:"789",lightsteelblue:"b0c4de",lightyellow:"ffffe0",lime:"0f0",limegreen:"32cd32",linen:"faf0e6",magenta:"f0f",maroon:"800000",mediumaquamarine:"66cdaa",mediumblue:"0000cd",mediumorchid:"ba55d3",mediumpurple:"9370db",mediumseagreen:"3cb371",mediumslateblue:"7b68ee",mediumspringgreen:"00fa9a",mediumturquoise:"48d1cc",mediumvioletred:"c71585",midnightblue:"191970",mintcream:"f5fffa",mistyrose:"ffe4e1",moccasin:"ffe4b5",navajowhite:"ffdead",navy:"000080",oldlace:"fdf5e6",olive:"808000",olivedrab:"6b8e23",orange:"ffa500",orangered:"ff4500",orchid:"da70d6",palegoldenrod:"eee8aa",palegreen:"98fb98",paleturquoise:"afeeee",palevioletred:"db7093",papayawhip:"ffefd5",peachpuff:"ffdab9",peru:"cd853f",pink:"ffc0cb",plum:"dda0dd",powderblue:"b0e0e6",purple:"800080",rebeccapurple:"663399",red:"f00",rosybrown:"bc8f8f",royalblue:"4169e1",saddlebrown:"8b4513",salmon:"fa8072",sandybrown:"f4a460",seagreen:"2e8b57",seashell:"fff5ee",sienna:"a0522d",silver:"c0c0c0",skyblue:"87ceeb",slateblue:"6a5acd",slategray:"708090",slategrey:"708090",snow:"fffafa",springgreen:"00ff7f",steelblue:"4682b4",tan:"d2b48c",teal:"008080",thistle:"d8bfd8",tomato:"ff6347",turquoise:"40e0d0",violet:"ee82ee",wheat:"f5deb3",white:"fff",whitesmoke:"f5f5f5",yellow:"ff0",yellowgreen:"9acd32"},dC=De.hexNames=pC(zd);function pC(t){var e={};for(var n in t)t.hasOwnProperty(n)&&(e[t[n]]=n);return e}function Iv(t){return t=parseFloat(t),(isNaN(t)||t<0||t>1)&&(t=1),t}function Rt(t,e){mC(t)&&(t="100%");var n=gC(t);return t=Math.min(e,Math.max(0,parseFloat(t))),n&&(t=parseInt(t*e,10)/100),Math.abs(t-e)<1e-6?1:t%e/parseFloat(e)}function Oh(t){return Math.min(1,Math.max(0,t))}function Dn(t){return parseInt(t,16)}function mC(t){return typeof t=="string"&&t.indexOf(".")!=-1&&parseFloat(t)===1}function gC(t){return typeof t=="string"&&t.indexOf("%")!=-1}function hi(t){return t.length==1?"0"+t:""+t}function Pa(t){return t<=1&&(t=t*100+"%"),t}function Dv(t){return Math.round(parseFloat(t)*255).toString(16)}function Pv(t){return Dn(t)/255}var li=(function(){var t="[-\\+]?\\d+%?",e="[-\\+]?\\d*\\.\\d+%?",n="(?:"+e+")|(?:"+t+")",i="[\\s|\\(]+("+n+")[,|\\s]+("+n+")[,|\\s]+("+n+")\\s*\\)?",r="[\\s|\\(]+("+n+")[,|\\s]+("+n+")[,|\\s]+("+n+")[,|\\s]+("+n+")\\s*\\)?";return{CSS_UNIT:new RegExp(n),rgb:new RegExp("rgb"+i),rgba:new RegExp("rgba"+r),hsl:new RegExp("hsl"+i),hsla:new RegExp("hsla"+r),hsv:new RegExp("hsv"+i),hsva:new RegExp("hsva"+r),hex3:/^#?([0-9a-fA-F]{1})([0-9a-fA-F]{1})([0-9a-fA-F]{1})$/,hex6:/^#?([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/,hex4:/^#?([0-9a-fA-F]{1})([0-9a-fA-F]{1})([0-9a-fA-F]{1})([0-9a-fA-F]{1})$/,hex8:/^#?([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/}})();function Xi(t){return!!li.CSS_UNIT.exec(t)}function _C(t){t=t.replace(Y2,"").replace(Z2,"").toLowerCase();var e=!1;if(zd[t])t=zd[t],e=!0;else if(t=="transparent")return{r:0,g:0,b:0,a:0,format:"name"};var n;return(n=li.rgb.exec(t))?{r:n[1],g:n[2],b:n[3]}:(n=li.rgba.exec(t))?{r:n[1],g:n[2],b:n[3],a:n[4]}:(n=li.hsl.exec(t))?{h:n[1],s:n[2],l:n[3]}:(n=li.hsla.exec(t))?{h:n[1],s:n[2],l:n[3],a:n[4]}:(n=li.hsv.exec(t))?{h:n[1],s:n[2],v:n[3]}:(n=li.hsva.exec(t))?{h:n[1],s:n[2],v:n[3],a:n[4]}:(n=li.hex8.exec(t))?{r:Dn(n[1]),g:Dn(n[2]),b:Dn(n[3]),a:Pv(n[4]),format:e?"name":"hex8"}:(n=li.hex6.exec(t))?{r:Dn(n[1]),g:Dn(n[2]),b:Dn(n[3]),format:e?"name":"hex"}:(n=li.hex4.exec(t))?{r:Dn(n[1]+""+n[1]),g:Dn(n[2]+""+n[2]),b:Dn(n[3]+""+n[3]),a:Pv(n[4]+""+n[4]),format:e?"name":"hex8"}:(n=li.hex3.exec(t))?{r:Dn(n[1]+""+n[1]),g:Dn(n[2]+""+n[2]),b:Dn(n[3]+""+n[3]),format:e?"name":"hex"}:!1}function vC(t){var e,n;return t=t||{level:"AA",size:"small"},e=(t.level||"AA").toUpperCase(),n=(t.size||"small").toLowerCase(),e!=="AA"&&e!=="AAA"&&(e="AA"),n!=="small"&&n!=="large"&&(n="small"),{level:e,size:n}}var Uv=t=>{t instanceof Array?t.forEach(Uv):(t.map&&t.map.dispose(),t.dispose())},Vd=t=>{t.geometry&&t.geometry.dispose(),t.material&&Uv(t.material),t.texture&&t.texture.dispose(),t.children&&t.children.forEach(Vd)},Lv=t=>{for(;t.children.length;){let e=t.children[0];t.remove(e),Vd(e)}},Da,ao,es=class extends H_{constructor(n,{dataBindAttr:i="__data",objBindAttr:r="__threeObj"}={}){super();qp(this,"scene");Su(this,Da);Su(this,ao);this.scene=n,wu(this,Da,i),wu(this,ao,r),this.onRemoveObj(()=>{})}onCreateObj(n){return super.onCreateObj(i=>{let r=n(i);return i[$a(this,ao)]=r,r[$a(this,Da)]=i,this.scene.add(r),r}),this}onRemoveObj(n){return super.onRemoveObj((i,r)=>{let s=super.getData(i);n(i,r),this.scene.remove(i),Vd(i),delete s[$a(this,ao)]}),this}};Da=new WeakMap,ao=new WeakMap;var Ia=t=>isNaN(t)?parseInt(De(t).toHex(),16):t,kd=t=>isNaN(t)?De(t).getAlpha():1,yC=Ud(wv);function Ov(t,e,n){!e||typeof n!="string"||t.filter(i=>!i[n]).forEach(i=>{i[n]=yC(e(i))})}function xC({nodes:t,links:e},n,{nodeFilter:i=()=>!0,onLoopError:r=s=>{throw`Invalid DAG structure! Found cycle in node path: ${s.join(" -> ")}.`}}={}){let s={};t.forEach(l=>s[n(l)]={data:l,out:[],depth:-1,skip:!i(l)}),e.forEach(({source:l,target:u})=>{let h=_(l),f=_(u);if(!s.hasOwnProperty(h))throw`Missing source node with id: ${h}`;if(!s.hasOwnProperty(f))throw`Missing target node with id: ${f}`;let d=s[h],m=s[f];d.out.push(m);function _(g){return typeof g=="object"?n(g):g}});let o=[];return c(Object.values(s)),Object.assign({},...Object.entries(s).filter(([,l])=>!l.skip).map(([l,u])=>({[l]:u.depth})));function c(l,u=[],h=0){for(let f=0,d=l.length;f<d;f++){let m=l[f];if(u.indexOf(m)!==-1){let _=[...u.slice(u.indexOf(m)),m].map(g=>n(g.data));o.some(g=>g.length===_.length&&g.every((p,x)=>p===_[x]))||(o.push(_),r(_));continue}h>m.depth&&(m.depth=h,c(m.out,[...u,m],h+(m.skip?0:1)))}}}var He=window.THREE?window.THREE:{Group:tn,Mesh:Ct,MeshLambertMaterial:ea,Color:Fe,BufferGeometry:Mt,BufferAttribute:nn,Matrix4:qe,Vector3:R,SphereGeometry:ki,CylinderGeometry:Fs,TubeGeometry:Ko,ConeGeometry:$o,Line:_i,LineBasicMaterial:ri,QuadraticBezierCurve3:Nr,CubicBezierCurve3:Us,Box3:vn},Nv={graph:B0,forcelayout:Fv.default},bC=2,Bd=new He.BufferGeometry().setAttribute?"setAttribute":"addAttribute",Nh=new He.BufferGeometry().applyMatrix4?"applyMatrix4":"applyMatrix",MC=dr({props:{jsonUrl:{onChange:function(t,e){t&&!e.fetchingJson&&(e.fetchingJson=!0,e.onLoading(),fetch(t).then(n=>n.json()).then(n=>{e.fetchingJson=!1,e.onFinishLoading(n),this.graphData(n)}))},triggerUpdate:!1},graphData:{default:{nodes:[],links:[]},onChange(t,e){e.engineRunning=!1}},numDimensions:{default:3,onChange(t,e){let n=e.d3ForceLayout.force("charge");n&&n.strength(t>2?-60:-30),t<3&&i(e.graphData.nodes,"z"),t<2&&i(e.graphData.nodes,"y");function i(r,s){r.forEach(o=>{delete o[s],delete o[`v${s}`]})}}},dagMode:{onChange(t,e){!t&&e.forceEngine==="d3"&&(e.graphData.nodes||[]).forEach(n=>n.fx=n.fy=n.fz=void 0)}},dagLevelDistance:{},dagNodeFilter:{default:t=>!0},onDagError:{triggerUpdate:!1},nodeRelSize:{default:4},nodeId:{default:"id"},nodeVal:{default:"val"},nodeResolution:{default:8},nodeColor:{default:"color"},nodeAutoColorBy:{},nodeOpacity:{default:.75},nodeVisibility:{default:!0},nodeThreeObject:{},nodeThreeObjectExtend:{default:!1},nodePositionUpdate:{triggerUpdate:!1},linkSource:{default:"source"},linkTarget:{default:"target"},linkVisibility:{default:!0},linkColor:{default:"color"},linkAutoColorBy:{},linkOpacity:{default:.2},linkWidth:{},linkResolution:{default:6},linkCurvature:{default:0,triggerUpdate:!1},linkCurveRotation:{default:0,triggerUpdate:!1},linkMaterial:{},linkThreeObject:{},linkThreeObjectExtend:{default:!1},linkPositionUpdate:{triggerUpdate:!1},linkDirectionalArrowLength:{default:0},linkDirectionalArrowColor:{},linkDirectionalArrowRelPos:{default:.5,triggerUpdate:!1},linkDirectionalArrowResolution:{default:8},linkDirectionalParticles:{default:0},linkDirectionalParticleSpeed:{default:.01,triggerUpdate:!1},linkDirectionalParticleOffset:{default:0,triggerUpdate:!1},linkDirectionalParticleWidth:{default:.5},linkDirectionalParticleColor:{},linkDirectionalParticleResolution:{default:4},linkDirectionalParticleThreeObject:{},forceEngine:{default:"d3"},d3AlphaMin:{default:0},d3AlphaDecay:{default:.0228,triggerUpdate:!1,onChange(t,e){e.d3ForceLayout.alphaDecay(t)}},d3AlphaTarget:{default:0,triggerUpdate:!1,onChange(t,e){e.d3ForceLayout.alphaTarget(t)}},d3VelocityDecay:{default:.4,triggerUpdate:!1,onChange(t,e){e.d3ForceLayout.velocityDecay(t)}},ngraphPhysics:{default:{timeStep:20,gravity:-1.2,theta:.8,springLength:30,springCoefficient:8e-4,dragCoefficient:.02}},warmupTicks:{default:0,triggerUpdate:!1},cooldownTicks:{default:1/0,triggerUpdate:!1},cooldownTime:{default:15e3,triggerUpdate:!1},onLoading:{default:()=>{},triggerUpdate:!1},onFinishLoading:{default:()=>{},triggerUpdate:!1},onUpdate:{default:()=>{},triggerUpdate:!1},onFinishUpdate:{default:()=>{},triggerUpdate:!1},onEngineTick:{default:()=>{},triggerUpdate:!1},onEngineStop:{default:()=>{},triggerUpdate:!1}},methods:{refresh:function(t){return t._flushObjects=!0,t._rerender(),this},d3Force:function(t,e,n){return n===void 0?t.d3ForceLayout.force(e):(t.d3ForceLayout.force(e,n),this)},d3ReheatSimulation:function(t){return t.d3ForceLayout.alpha(1),this.resetCountdown(),this},resetCountdown:function(t){return t.cntTicks=0,t.startTickTime=new Date,t.engineRunning=!0,this},tickFrame:function(t){let e=t.forceEngine!=="ngraph";return t.engineRunning&&t.layout&&n(),i(),r(),this;function n(){++t.cntTicks>t.cooldownTicks||new Date-t.startTickTime>t.cooldownTime||e&&t.d3AlphaMin>0&&t.d3ForceLayout.alpha()<t.d3AlphaMin?(t.engineRunning=!1,t.onEngineStop()):(t.layout[e?"tick":"step"](),t.onEngineTick());let s=et(t.nodeThreeObjectExtend);t.nodeDataMapper.entries().forEach(([h,f])=>{if(!f)return;let d=e?h:t.layout.getNodePosition(h[t.nodeId]),m=s(h);(!t.nodePositionUpdate||!t.nodePositionUpdate(m?f.children[0]:f,{x:d.x,y:d.y,z:d.z},h)||m)&&(f.position.x=d.x,f.position.y=d.y||0,f.position.z=d.z||0)});let o=et(t.linkWidth),a=et(t.linkCurvature),c=et(t.linkCurveRotation),l=et(t.linkThreeObjectExtend);t.linkDataMapper.entries().forEach(([h,f])=>{if(!f)return;let d=e?h:t.layout.getLinkPosition(t.layout.graph.getLink(h.source,h.target).id),m=d[e?"source":"from"],_=d[e?"target":"to"];if(!m||!_||!m.hasOwnProperty("x")||!_.hasOwnProperty("x"))return;u(h);let g=l(h);if(t.linkPositionUpdate&&t.linkPositionUpdate(g?f.children[1]:f,{start:{x:m.x,y:m.y,z:m.z},end:{x:_.x,y:_.y,z:_.z}},h)&&!g)return;let p=30,x=h.__curve,y=f.children.length?f.children[0]:f;if(y.type==="Line"){if(x){let v=x.getPoints(p);y.geometry.getAttribute("position").array.length!==v.length*3&&y.geometry[Bd]("position",new He.BufferAttribute(new Float32Array(v.length*3),3)),y.geometry.setFromPoints(v)}else{let v=y.geometry.getAttribute("position");(!v||!v.array||v.array.length!==6)&&y.geometry[Bd]("position",v=new He.BufferAttribute(new Float32Array(6),3)),v.array[0]=m.x,v.array[1]=m.y||0,v.array[2]=m.z||0,v.array[3]=_.x,v.array[4]=_.y||0,v.array[5]=_.z||0,v.needsUpdate=!0}y.geometry.computeBoundingSphere()}else if(y.type==="Mesh")if(x){y.geometry.type.match(/^Tube(Buffer)?Geometry$/)||(y.position.set(0,0,0),y.rotation.set(0,0,0),y.scale.set(1,1,1));let b=Math.ceil(o(h)*10)/10/2,M=new He.TubeGeometry(x,p,b,t.linkResolution,!1);y.geometry.dispose(),y.geometry=M}else{if(!y.geometry.type.match(/^Cylinder(Buffer)?Geometry$/)){let C=Math.ceil(o(h)*10)/10/2,T=new He.CylinderGeometry(C,C,1,t.linkResolution,1,!1);T[Nh](new He.Matrix4().makeTranslation(0,1/2,0)),T[Nh](new He.Matrix4().makeRotationX(Math.PI/2)),y.geometry.dispose(),y.geometry=T}let v=new He.Vector3(m.x,m.y||0,m.z||0),b=new He.Vector3(_.x,_.y||0,_.z||0),M=v.distanceTo(b);y.position.x=v.x,y.position.y=v.y,y.position.z=v.z,y.scale.z=M,y.parent.localToWorld(b),y.lookAt(b)}});function u(h){let f=e?h:t.layout.getLinkPosition(t.layout.graph.getLink(h.source,h.target).id),d=f[e?"source":"from"],m=f[e?"target":"to"];if(!d||!m||!d.hasOwnProperty("x")||!m.hasOwnProperty("x"))return;let _=a(h);if(!_)h.__curve=null;else{let g=new He.Vector3(d.x,d.y||0,d.z||0),p=new He.Vector3(m.x,m.y||0,m.z||0),x=g.distanceTo(p),y,v=c(h);if(x>0){let b=m.x-d.x,M=m.y-d.y||0,A=new He.Vector3().subVectors(p,g),C=A.clone().multiplyScalar(_).cross(b!==0||M!==0?new He.Vector3(0,0,1):new He.Vector3(0,1,0)).applyAxisAngle(A.normalize(),v).add(new He.Vector3().addVectors(g,p).divideScalar(2));y=new He.QuadraticBezierCurve3(g,C,p)}else{let b=_*70,M=-v,A=M+Math.PI/2;y=new He.CubicBezierCurve3(g,new He.Vector3(b*Math.cos(A),b*Math.sin(A),0).add(g),new He.Vector3(b*Math.cos(M),b*Math.sin(M),0).add(g),p)}h.__curve=y}}}function i(){let s=et(t.linkDirectionalArrowRelPos),o=et(t.linkDirectionalArrowLength),a=et(t.nodeVal);t.arrowDataMapper.entries().forEach(([c,l])=>{if(!l)return;let u=e?c:t.layout.getLinkPosition(t.layout.graph.getLink(c.source,c.target).id),h=u[e?"source":"from"],f=u[e?"target":"to"];if(!h||!f||!h.hasOwnProperty("x")||!f.hasOwnProperty("x"))return;let d=Math.cbrt(Math.max(0,a(h)||1))*t.nodeRelSize,m=Math.cbrt(Math.max(0,a(f)||1))*t.nodeRelSize,_=o(c),g=s(c),p=c.__curve?A=>c.__curve.getPoint(A):A=>{let C=(T,w,P,z)=>w[T]+(P[T]-w[T])*z||0;return{x:C("x",h,f,A),y:C("y",h,f,A),z:C("z",h,f,A)}},x=c.__curve?c.__curve.getLength():Math.sqrt(["x","y","z"].map(A=>Math.pow((f[A]||0)-(h[A]||0),2)).reduce((A,C)=>A+C,0)),y=d+_+(x-d-m-_)*g,v=p(y/x),b=p((y-_)/x);["x","y","z"].forEach(A=>l.position[A]=b[A]);let M=new He.Vector3(...["x","y","z"].map(A=>v[A]));l.parent.localToWorld(M),l.lookAt(M)})}function r(){let s=et(t.linkDirectionalParticleSpeed),o=et(t.linkDirectionalParticleOffset);t.graphData.links.forEach(a=>{let c=t.particlesDataMapper.getObj(a),l=c&&c.children,u=a.__singleHopPhotonsObj&&a.__singleHopPhotonsObj.children;if((!u||!u.length)&&(!l||!l.length))return;let h=e?a:t.layout.getLinkPosition(t.layout.graph.getLink(a.source,a.target).id),f=h[e?"source":"from"],d=h[e?"target":"to"];if(!f||!d||!f.hasOwnProperty("x")||!d.hasOwnProperty("x"))return;let m=s(a),_=Math.abs(o(a)),g=a.__curve?x=>a.__curve.getPoint(x):x=>{let y=(v,b,M,A)=>b[v]+(M[v]-b[v])*A||0;return{x:y("x",f,d,x),y:y("y",f,d,x),z:y("z",f,d,x)}};[...l||[],...u||[]].forEach((x,y)=>{let v=x.parent.__linkThreeObjType==="singleHopPhotons";if(x.hasOwnProperty("__progressRatio")||(x.__progressRatio=v?m<0?1:0:(y+_)/l.length),x.__progressRatio+=m,x.__progressRatio>=1||x.__progressRatio<0)if(!v)x.__progressRatio=x.__progressRatio%1,x.__progressRatio<0&&x.__progressRatio++;else{x.parent.remove(x),Lv(x);return}let b=x.__progressRatio,M=g(b);x.geometry.type!=="SphereGeometry"&&x.lookAt(M.x,M.y,M.z),["x","y","z"].forEach(A=>x.position[A]=M[A])})})}},emitParticle:function(t,e){if(e&&t.graphData.links.includes(e)){if(!e.__singleHopPhotonsObj){let i=new He.Group;i.__linkThreeObjType="singleHopPhotons",e.__singleHopPhotonsObj=i,t.graphScene.add(i)}let n=et(t.linkDirectionalParticleThreeObject)(e);if(n&&t.linkDirectionalParticleThreeObject===n&&(n=n.clone()),!n){let i=et(t.linkDirectionalParticleWidth),r=Math.ceil(i(e)*10)/10/2,s=t.linkDirectionalParticleResolution,o=new He.SphereGeometry(r,s,s),a=et(t.linkColor),l=et(t.linkDirectionalParticleColor)(e)||a(e)||"#f0f0f0",u=new He.Color(Ia(l)),h=t.linkOpacity*3,f=new He.MeshLambertMaterial({color:u,transparent:!0,opacity:h});n=new He.Mesh(o,f)}e.__singleHopPhotonsObj.add(n)}return this},getGraphBbox:function(t,e=()=>!0){if(!t.initialised)return null;let n=(function i(r){let s=[];if(r.geometry){r.geometry.computeBoundingBox();let o=new He.Box3;o.copy(r.geometry.boundingBox).applyMatrix4(r.matrixWorld),s.push(o)}return s.concat(...(r.children||[]).filter(o=>!o.hasOwnProperty("__graphObjType")||o.__graphObjType==="node"&&e(o.__data)).map(i))})(t.graphScene);return n.length?Object.assign(...["x","y","z"].map(i=>({[i]:[k_(n,r=>r.min[i]),z_(n,r=>r.max[i])]}))):null}},stateInit:()=>({d3ForceLayout:od().force("link",ed()).force("charge",ad()).force("center",Yf()).force("dagRadial",null).stop(),engineRunning:!1}),init(t,e){e.graphScene=t,e.nodeDataMapper=new es(t,{objBindAttr:"__threeObj"}),e.linkDataMapper=new es(t,{objBindAttr:"__lineObj"}),e.arrowDataMapper=new es(t,{objBindAttr:"__arrowObj"}),e.particlesDataMapper=new es(t,{objBindAttr:"__photonsObj"})},update(t,e){let n=i=>i.some(r=>e.hasOwnProperty(r));if(t.engineRunning=!1,typeof t.onUpdate=="function"&&t.onUpdate(),t.nodeAutoColorBy!==null&&n(["nodeAutoColorBy","graphData","nodeColor"])&&Ov(t.graphData.nodes,et(t.nodeAutoColorBy),t.nodeColor),t.linkAutoColorBy!==null&&n(["linkAutoColorBy","graphData","linkColor"])&&Ov(t.graphData.links,et(t.linkAutoColorBy),t.linkColor),t._flushObjects||n(["graphData","nodeThreeObject","nodeThreeObjectExtend","nodeVal","nodeColor","nodeVisibility","nodeRelSize","nodeResolution","nodeOpacity"])){let i=et(t.nodeThreeObject),r=et(t.nodeThreeObjectExtend),s=et(t.nodeVal),o=et(t.nodeColor),a=et(t.nodeVisibility),c={},l={};(t._flushObjects||n(["nodeThreeObject","nodeThreeObjectExtend"]))&&t.nodeDataMapper.clear(),t.nodeDataMapper.onCreateObj(u=>{let h=i(u),f=r(u);h&&t.nodeThreeObject===h&&(h=h.clone());let d;return h&&!f?d=h:(d=new He.Mesh,d.__graphDefaultObj=!0,h&&f&&d.add(h)),d.__graphObjType="node",d}).onUpdateObj((u,h)=>{if(u.__graphDefaultObj){let f=s(h)||1,d=Math.cbrt(f)*t.nodeRelSize,m=t.nodeResolution;(!u.geometry.type.match(/^Sphere(Buffer)?Geometry$/)||u.geometry.parameters.radius!==d||u.geometry.parameters.widthSegments!==m)&&(c.hasOwnProperty(f)||(c[f]=new He.SphereGeometry(d,m,m)),u.geometry.dispose(),u.geometry=c[f]);let _=o(h),g=new He.Color(Ia(_||"#ffffaa")),p=t.nodeOpacity*kd(_);(u.material.type!=="MeshLambertMaterial"||!u.material.color.equals(g)||u.material.opacity!==p)&&(l.hasOwnProperty(_)||(l[_]=new He.MeshLambertMaterial({color:g,transparent:!0,opacity:p})),u.material.dispose(),u.material=l[_])}}).digest(t.graphData.nodes.filter(a))}if(t._flushObjects||n(["graphData","linkThreeObject","linkThreeObjectExtend","linkMaterial","linkColor","linkWidth","linkVisibility","linkResolution","linkOpacity","linkDirectionalArrowLength","linkDirectionalArrowColor","linkDirectionalArrowResolution","linkDirectionalParticles","linkDirectionalParticleWidth","linkDirectionalParticleColor","linkDirectionalParticleResolution","linkDirectionalParticleThreeObject"])){let i=et(t.linkThreeObject),r=et(t.linkThreeObjectExtend),s=et(t.linkMaterial),o=et(t.linkVisibility),a=et(t.linkColor),c=et(t.linkWidth),l={},u={},h={},f=t.graphData.links.filter(o);if((t._flushObjects||n(["linkThreeObject","linkThreeObjectExtend","linkWidth"]))&&t.linkDataMapper.clear(),t.linkDataMapper.onRemoveObj(d=>{let m=d.__data&&d.__data.__singleHopPhotonsObj;m&&(m.parent.remove(m),Lv(m),delete d.__data.__singleHopPhotonsObj)}).onCreateObj(d=>{let m=i(d),_=r(d);m&&t.linkThreeObject===m&&(m=m.clone());let g;if(!m||_)if(!!c(d))g=new He.Mesh;else{let y=new He.BufferGeometry;y[Bd]("position",new He.BufferAttribute(new Float32Array(6),3)),g=new He.Line(y)}let p;return m?_?(p=new He.Group,p.__graphDefaultObj=!0,p.add(g),p.add(m)):p=m:(p=g,p.__graphDefaultObj=!0),p.renderOrder=10,p.__graphObjType="link",p}).onUpdateObj((d,m)=>{if(d.__graphDefaultObj){let _=d.children.length?d.children[0]:d,g=Math.ceil(c(m)*10)/10,p=!!g;if(p){let y=g/2,v=t.linkResolution;if(!_.geometry.type.match(/^Cylinder(Buffer)?Geometry$/)||_.geometry.parameters.radiusTop!==y||_.geometry.parameters.radialSegments!==v){if(!l.hasOwnProperty(g)){let b=new He.CylinderGeometry(y,y,1,v,1,!1);b[Nh](new He.Matrix4().makeTranslation(0,1/2,0)),b[Nh](new He.Matrix4().makeRotationX(Math.PI/2)),l[g]=b}_.geometry.dispose(),_.geometry=l[g]}}let x=s(m);if(x)_.material=x;else{let y=a(m),v=new He.Color(Ia(y||"#f0f0f0")),b=t.linkOpacity*kd(y),M=p?"MeshLambertMaterial":"LineBasicMaterial";if(_.material.type!==M||!_.material.color.equals(v)||_.material.opacity!==b){let A=p?u:h;A.hasOwnProperty(y)||(A[y]=new He[M]({color:v,transparent:b<1,opacity:b,depthWrite:b>=1})),_.material.dispose(),_.material=A[y]}}}}).digest(f),t.linkDirectionalArrowLength||e.hasOwnProperty("linkDirectionalArrowLength")){let d=et(t.linkDirectionalArrowLength),m=et(t.linkDirectionalArrowColor);t.arrowDataMapper.onCreateObj(()=>{let _=new He.Mesh(void 0,new He.MeshLambertMaterial({transparent:!0}));return _.__linkThreeObjType="arrow",_}).onUpdateObj((_,g)=>{let p=d(g),x=t.linkDirectionalArrowResolution;if(!_.geometry.type.match(/^Cone(Buffer)?Geometry$/)||_.geometry.parameters.height!==p||_.geometry.parameters.radialSegments!==x){let v=new He.ConeGeometry(p*.25,p,x);v.translate(0,p/2,0),v.rotateX(Math.PI/2),_.geometry.dispose(),_.geometry=v}let y=m(g)||a(g)||"#f0f0f0";_.material.color=new He.Color(Ia(y)),_.material.opacity=t.linkOpacity*3*kd(y)}).digest(f.filter(d))}if(t.linkDirectionalParticles||e.hasOwnProperty("linkDirectionalParticles")){let d=et(t.linkDirectionalParticles),m=et(t.linkDirectionalParticleWidth),_=et(t.linkDirectionalParticleColor),g=et(t.linkDirectionalParticleThreeObject),p={},x={};t.particlesDataMapper.onCreateObj(()=>{let y=new He.Group;return y.__linkThreeObjType="photons",y.__photonDataMapper=new es(y),y}).onUpdateObj((y,v)=>{let b=!!y.children.length&&y.children[0],M=g(v),A,C;if(M)A=M.geometry,C=M.material;else{let w=Math.ceil(m(v)*10)/10/2,P=t.linkDirectionalParticleResolution;b&&b.geometry.parameters.radius===w&&b.geometry.parameters.widthSegments===P?A=b.geometry:(x.hasOwnProperty(w)||(x[w]=new He.SphereGeometry(w,P,P)),A=x[w]);let z=_(v)||a(v)||"#f0f0f0",U=new He.Color(Ia(z)),O=t.linkOpacity*3;b&&b.material.color.equals(U)&&b.material.opacity===O?C=b.material:(p.hasOwnProperty(z)||(p[z]=new He.MeshLambertMaterial({color:U,transparent:!0,opacity:O})),C=p[z])}b&&(b.geometry!==A&&b.geometry.dispose(),b.material!==C&&b.material.dispose());let T=Math.round(Math.abs(d(v)));y.__photonDataMapper.id(w=>w.idx).onCreateObj(()=>new He.Mesh(A,C)).onUpdateObj(w=>{w.geometry=A,w.material=C}).digest([...new Array(T)].map((w,P)=>({idx:P})))}).digest(f.filter(d))}}if(t._flushObjects=!1,n(["graphData","nodeId","linkSource","linkTarget","numDimensions","forceEngine","dagMode","dagNodeFilter","dagLevelDistance"])){t.engineRunning=!1,t.graphData.links.forEach(s=>{s.source=s[t.linkSource],s.target=s[t.linkTarget]});let i=t.forceEngine!=="ngraph",r;if(i){(r=t.d3ForceLayout).stop().alpha(1).numDimensions(t.numDimensions).nodes(t.graphData.nodes);let s=t.d3ForceLayout.force("link");s&&s.id(l=>l[t.nodeId]).links(t.graphData.links);let o=t.dagMode&&xC(t.graphData,l=>l[t.nodeId],{nodeFilter:t.dagNodeFilter,onLoopError:t.onDagError||void 0}),a=Math.max(...Object.values(o||[])),c=t.dagLevelDistance||t.graphData.nodes.length/(a||1)*bC*(["radialin","radialout"].indexOf(t.dagMode)!==-1?.7:1);if(["lr","rl","td","bu","zin","zout"].includes(e.dagMode)){let l=["lr","rl"].includes(e.dagMode)?"fx":["td","bu"].includes(e.dagMode)?"fy":"fz";t.graphData.nodes.filter(t.dagNodeFilter).forEach(u=>delete u[l])}if(["lr","rl","td","bu","zin","zout"].includes(t.dagMode)){let l=["rl","td","zout"].includes(t.dagMode),u=f=>(o[f[t.nodeId]]-a/2)*c*(l?-1:1),h=["lr","rl"].includes(t.dagMode)?"fx":["td","bu"].includes(t.dagMode)?"fy":"fz";t.graphData.nodes.filter(t.dagNodeFilter).forEach(f=>f[h]=u(f))}t.d3ForceLayout.force("dagRadial",["radialin","radialout"].indexOf(t.dagMode)!==-1?cd(l=>{let u=o[l[t.nodeId]]||-1;return(t.dagMode==="radialin"?a-u:u)*c}).strength(l=>t.dagNodeFilter(l)?1:0):null)}else{let s=Nv.graph();t.graphData.nodes.forEach(o=>{s.addNode(o[t.nodeId])}),t.graphData.links.forEach(o=>{s.addLink(o.source,o.target)}),r=Nv.forcelayout(s,Tn({dimensions:t.numDimensions},t.ngraphPhysics)),r.graph=s}for(let s=0;s<t.warmupTicks&&!(i&&t.d3AlphaMin>0&&t.d3ForceLayout.alpha()<t.d3AlphaMin);s++)r[i?"tick":"step"]();t.layout=r,this.resetCountdown()}t.engineRunning=!0,t.onFinishUpdate()}});function SC(t,e=Object,n=!1){var s;class i extends e{constructor(...a){super(...a),this.__kapsuleInstance=new t(...n?[this]:[],...a)}}let r=t();return(s=r._destructor)==null||s.call(r),Object.keys(r).forEach(o=>i.prototype[o]=function(...a){let c=this.__kapsuleInstance[o](...a);return c===this.__kapsuleInstance?this:c}),i}var wC=window.THREE?window.THREE:{Group:tn},Hd=SC(MC,wC.Group,!0);var Fh=class{constructor(){throw new Error("WebGPU fora do bundle da Teia")}};var Gd={type:"change"},qd={type:"start"},Xd={type:"end"},zv=1e-6,ut={NONE:-1,ROTATE:0,ZOOM:1,PAN:2,TOUCH_ROTATE:3,TOUCH_ZOOM_PAN:4},Uh=new ie,mr=new ie,EC=new R,zh=new R,Wd=new R,co=new Ht,kv=new R,kh=new R,jd=new R,Bh=new R,Vh=class extends In{constructor(e,n=null){super(e,n),this.screen={left:0,top:0,width:0,height:0},this.rotateSpeed=1,this.zoomSpeed=1.2,this.panSpeed=.3,this.noRotate=!1,this.noZoom=!1,this.noPan=!1,this.staticMoving=!1,this.dynamicDampingFactor=.2,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.keys=["KeyA","KeyS","KeyD"],this.mouseButtons={LEFT:Ut.ROTATE,MIDDLE:Ut.DOLLY,RIGHT:Ut.PAN},this.target=new R,this.state=ut.NONE,this.keyState=ut.NONE,this._lastPosition=new R,this._lastZoom=1,this._touchZoomDistanceStart=0,this._touchZoomDistanceEnd=0,this._lastAngle=0,this._eye=new R,this._movePrev=new ie,this._moveCurr=new ie,this._lastAxis=new R,this._zoomStart=new ie,this._zoomEnd=new ie,this._panStart=new ie,this._panEnd=new ie,this._pointers=[],this._pointerPositions={},this._onPointerMove=AC.bind(this),this._onPointerDown=TC.bind(this),this._onPointerUp=CC.bind(this),this._onPointerCancel=RC.bind(this),this._onContextMenu=FC.bind(this),this._onMouseWheel=NC.bind(this),this._onKeyDown=IC.bind(this),this._onKeyUp=PC.bind(this),this._onTouchStart=UC.bind(this),this._onTouchMove=zC.bind(this),this._onTouchEnd=kC.bind(this),this._onMouseDown=DC.bind(this),this._onMouseMove=LC.bind(this),this._onMouseUp=OC.bind(this),this._target0=this.target.clone(),this._position0=this.object.position.clone(),this._up0=this.object.up.clone(),this._zoom0=this.object.zoom,n!==null&&(this.connect(n),this.handleResize()),this.update()}connect(e){super.connect(e),window.addEventListener("keydown",this._onKeyDown),window.addEventListener("keyup",this._onKeyUp),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerCancel),this.domElement.addEventListener("wheel",this._onMouseWheel,{passive:!1}),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.style.touchAction="none"}disconnect(){window.removeEventListener("keydown",this._onKeyDown),window.removeEventListener("keyup",this._onKeyUp),this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.removeEventListener("pointermove",this._onPointerMove),this.domElement.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerCancel),this.domElement.removeEventListener("wheel",this._onMouseWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.domElement.style.touchAction="auto"}dispose(){this.disconnect()}handleResize(){let e=this.domElement.getBoundingClientRect(),n=this.domElement.ownerDocument.documentElement;this.screen.left=e.left+window.pageXOffset-n.clientLeft,this.screen.top=e.top+window.pageYOffset-n.clientTop,this.screen.width=e.width,this.screen.height=e.height}update(){this._eye.subVectors(this.object.position,this.target),this.noRotate||this._rotateCamera(),this.noZoom||this._zoomCamera(),this.noPan||this._panCamera(),this.object.position.addVectors(this.target,this._eye),this.object.isPerspectiveCamera?(this._checkDistances(),this.object.lookAt(this.target),this._lastPosition.distanceToSquared(this.object.position)>zv&&(this.dispatchEvent(Gd),this._lastPosition.copy(this.object.position))):this.object.isOrthographicCamera?(this.object.lookAt(this.target),(this._lastPosition.distanceToSquared(this.object.position)>zv||this._lastZoom!==this.object.zoom)&&(this.dispatchEvent(Gd),this._lastPosition.copy(this.object.position),this._lastZoom=this.object.zoom)):console.warn("THREE.TrackballControls: Unsupported camera type.")}reset(){this.state=ut.NONE,this.keyState=ut.NONE,this.target.copy(this._target0),this.object.position.copy(this._position0),this.object.up.copy(this._up0),this.object.zoom=this._zoom0,this.object.updateProjectionMatrix(),this._eye.subVectors(this.object.position,this.target),this.object.lookAt(this.target),this.dispatchEvent(Gd),this._lastPosition.copy(this.object.position),this._lastZoom=this.object.zoom}_panCamera(){if(mr.copy(this._panEnd).sub(this._panStart),mr.lengthSq()){if(this.object.isOrthographicCamera){let e=(this.object.right-this.object.left)/this.object.zoom/this.domElement.clientWidth,n=(this.object.top-this.object.bottom)/this.object.zoom/this.domElement.clientWidth;mr.x*=e,mr.y*=n}mr.multiplyScalar(this._eye.length()*this.panSpeed),zh.copy(this._eye).cross(this.object.up).setLength(mr.x),zh.add(EC.copy(this.object.up).setLength(mr.y)),this.object.position.add(zh),this.target.add(zh),this.staticMoving?this._panStart.copy(this._panEnd):this._panStart.add(mr.subVectors(this._panEnd,this._panStart).multiplyScalar(this.dynamicDampingFactor))}}_rotateCamera(){Bh.set(this._moveCurr.x-this._movePrev.x,this._moveCurr.y-this._movePrev.y,0);let e=Bh.length();e?(this._eye.copy(this.object.position).sub(this.target),kv.copy(this._eye).normalize(),kh.copy(this.object.up).normalize(),jd.crossVectors(kh,kv).normalize(),kh.setLength(this._moveCurr.y-this._movePrev.y),jd.setLength(this._moveCurr.x-this._movePrev.x),Bh.copy(kh.add(jd)),Wd.crossVectors(Bh,this._eye).normalize(),e*=this.rotateSpeed,co.setFromAxisAngle(Wd,e),this._eye.applyQuaternion(co),this.object.up.applyQuaternion(co),this._lastAxis.copy(Wd),this._lastAngle=e):!this.staticMoving&&this._lastAngle&&(this._lastAngle*=Math.sqrt(1-this.dynamicDampingFactor),this._eye.copy(this.object.position).sub(this.target),co.setFromAxisAngle(this._lastAxis,this._lastAngle),this._eye.applyQuaternion(co),this.object.up.applyQuaternion(co)),this._movePrev.copy(this._moveCurr)}_zoomCamera(){let e;this.state===ut.TOUCH_ZOOM_PAN?(e=this._touchZoomDistanceStart/this._touchZoomDistanceEnd,this._touchZoomDistanceStart=this._touchZoomDistanceEnd,this.object.isPerspectiveCamera?this._eye.multiplyScalar(e):this.object.isOrthographicCamera?(this.object.zoom=gt.clamp(this.object.zoom/e,this.minZoom,this.maxZoom),this._lastZoom!==this.object.zoom&&this.object.updateProjectionMatrix()):console.warn("THREE.TrackballControls: Unsupported camera type")):(e=1+(this._zoomEnd.y-this._zoomStart.y)*this.zoomSpeed,e!==1&&e>0&&(this.object.isPerspectiveCamera?this._eye.multiplyScalar(e):this.object.isOrthographicCamera?(this.object.zoom=gt.clamp(this.object.zoom/e,this.minZoom,this.maxZoom),this._lastZoom!==this.object.zoom&&this.object.updateProjectionMatrix()):console.warn("THREE.TrackballControls: Unsupported camera type")),this.staticMoving?this._zoomStart.copy(this._zoomEnd):this._zoomStart.y+=(this._zoomEnd.y-this._zoomStart.y)*this.dynamicDampingFactor)}_getMouseOnScreen(e,n){return Uh.set((e-this.screen.left)/this.screen.width,(n-this.screen.top)/this.screen.height),Uh}_getMouseOnCircle(e,n){return Uh.set((e-this.screen.width*.5-this.screen.left)/(this.screen.width*.5),(this.screen.height+2*(this.screen.top-n))/this.screen.width),Uh}_addPointer(e){this._pointers.push(e)}_removePointer(e){delete this._pointerPositions[e.pointerId];for(let n=0;n<this._pointers.length;n++)if(this._pointers[n].pointerId==e.pointerId){this._pointers.splice(n,1);return}}_trackPointer(e){let n=this._pointerPositions[e.pointerId];n===void 0&&(n=new ie,this._pointerPositions[e.pointerId]=n),n.set(e.pageX,e.pageY)}_getSecondPointerPosition(e){let n=e.pointerId===this._pointers[0].pointerId?this._pointers[1]:this._pointers[0];return this._pointerPositions[n.pointerId]}_checkDistances(){(!this.noZoom||!this.noPan)&&(this._eye.lengthSq()>this.maxDistance*this.maxDistance&&(this.object.position.addVectors(this.target,this._eye.setLength(this.maxDistance)),this._zoomStart.copy(this._zoomEnd)),this._eye.lengthSq()<this.minDistance*this.minDistance&&(this.object.position.addVectors(this.target,this._eye.setLength(this.minDistance)),this._zoomStart.copy(this._zoomEnd)))}};function TC(t){this.enabled!==!1&&(this._pointers.length===0&&(this.domElement.setPointerCapture(t.pointerId),this.domElement.addEventListener("pointermove",this._onPointerMove),this.domElement.addEventListener("pointerup",this._onPointerUp)),this._addPointer(t),t.pointerType==="touch"?this._onTouchStart(t):this._onMouseDown(t))}function AC(t){this.enabled!==!1&&(t.pointerType==="touch"?this._onTouchMove(t):this._onMouseMove(t))}function CC(t){this.enabled!==!1&&(t.pointerType==="touch"?this._onTouchEnd(t):this._onMouseUp(),this._removePointer(t),this._pointers.length===0&&(this.domElement.releasePointerCapture(t.pointerId),this.domElement.removeEventListener("pointermove",this._onPointerMove),this.domElement.removeEventListener("pointerup",this._onPointerUp)))}function RC(t){this._removePointer(t)}function PC(){this.enabled!==!1&&(this.keyState=ut.NONE,window.addEventListener("keydown",this._onKeyDown))}function IC(t){this.enabled!==!1&&(window.removeEventListener("keydown",this._onKeyDown),this.keyState===ut.NONE&&(t.code===this.keys[ut.ROTATE]&&!this.noRotate?this.keyState=ut.ROTATE:t.code===this.keys[ut.ZOOM]&&!this.noZoom?this.keyState=ut.ZOOM:t.code===this.keys[ut.PAN]&&!this.noPan&&(this.keyState=ut.PAN)))}function DC(t){let e;switch(t.button){case 0:e=this.mouseButtons.LEFT;break;case 1:e=this.mouseButtons.MIDDLE;break;case 2:e=this.mouseButtons.RIGHT;break;default:e=-1}switch(e){case Ut.DOLLY:this.state=ut.ZOOM;break;case Ut.ROTATE:this.state=ut.ROTATE;break;case Ut.PAN:this.state=ut.PAN;break;default:this.state=ut.NONE}let n=this.keyState!==ut.NONE?this.keyState:this.state;n===ut.ROTATE&&!this.noRotate?(this._moveCurr.copy(this._getMouseOnCircle(t.pageX,t.pageY)),this._movePrev.copy(this._moveCurr)):n===ut.ZOOM&&!this.noZoom?(this._zoomStart.copy(this._getMouseOnScreen(t.pageX,t.pageY)),this._zoomEnd.copy(this._zoomStart)):n===ut.PAN&&!this.noPan&&(this._panStart.copy(this._getMouseOnScreen(t.pageX,t.pageY)),this._panEnd.copy(this._panStart)),this.dispatchEvent(qd)}function LC(t){let e=this.keyState!==ut.NONE?this.keyState:this.state;e===ut.ROTATE&&!this.noRotate?(this._movePrev.copy(this._moveCurr),this._moveCurr.copy(this._getMouseOnCircle(t.pageX,t.pageY))):e===ut.ZOOM&&!this.noZoom?this._zoomEnd.copy(this._getMouseOnScreen(t.pageX,t.pageY)):e===ut.PAN&&!this.noPan&&this._panEnd.copy(this._getMouseOnScreen(t.pageX,t.pageY))}function OC(){this.state=ut.NONE,this.dispatchEvent(Xd)}function NC(t){if(this.enabled!==!1&&this.noZoom!==!0){switch(t.preventDefault(),t.deltaMode){case 2:this._zoomStart.y-=t.deltaY*.025;break;case 1:this._zoomStart.y-=t.deltaY*.01;break;default:this._zoomStart.y-=t.deltaY*25e-5;break}this.dispatchEvent(qd),this.dispatchEvent(Xd)}}function FC(t){this.enabled!==!1&&t.preventDefault()}function UC(t){if(this._trackPointer(t),this._pointers.length===1)this.state=ut.TOUCH_ROTATE,this._moveCurr.copy(this._getMouseOnCircle(this._pointers[0].pageX,this._pointers[0].pageY)),this._movePrev.copy(this._moveCurr);else{this.state=ut.TOUCH_ZOOM_PAN;let e=this._pointers[0].pageX-this._pointers[1].pageX,n=this._pointers[0].pageY-this._pointers[1].pageY;this._touchZoomDistanceEnd=this._touchZoomDistanceStart=Math.sqrt(e*e+n*n);let i=(this._pointers[0].pageX+this._pointers[1].pageX)/2,r=(this._pointers[0].pageY+this._pointers[1].pageY)/2;this._panStart.copy(this._getMouseOnScreen(i,r)),this._panEnd.copy(this._panStart)}this.dispatchEvent(qd)}function zC(t){if(this._trackPointer(t),this._pointers.length===1)this._movePrev.copy(this._moveCurr),this._moveCurr.copy(this._getMouseOnCircle(t.pageX,t.pageY));else{let e=this._getSecondPointerPosition(t),n=t.pageX-e.x,i=t.pageY-e.y;this._touchZoomDistanceEnd=Math.sqrt(n*n+i*i);let r=(t.pageX+e.x)/2,s=(t.pageY+e.y)/2;this._panEnd.copy(this._getMouseOnScreen(r,s))}}function kC(t){switch(this._pointers.length){case 0:this.state=ut.NONE;break;case 1:this.state=ut.TOUCH_ROTATE,this._moveCurr.copy(this._getMouseOnCircle(t.pageX,t.pageY)),this._movePrev.copy(this._moveCurr);break;case 2:this.state=ut.TOUCH_ZOOM_PAN;for(let e=0;e<this._pointers.length;e++)if(this._pointers[e].pointerId!==t.pointerId){let n=this._pointerPositions[this._pointers[e].pointerId];this._moveCurr.copy(this._getMouseOnCircle(n.x,n.y)),this._movePrev.copy(this._moveCurr);break}break}this.dispatchEvent(Xd)}var Ue={IDLE:Symbol(),ROTATE:Symbol(),PAN:Symbol(),SCALE:Symbol(),FOV:Symbol(),FOCUS:Symbol(),ZROTATE:Symbol(),TOUCH_MULTI:Symbol(),ANIMATION_FOCUS:Symbol(),ANIMATION_ROTATE:Symbol()},_t={NONE:Symbol(),ONE_FINGER:Symbol(),ONE_FINGER_SWITCHED:Symbol(),TWO_FINGER:Symbol(),MULT_FINGER:Symbol(),CURSOR:Symbol()},Qe={x:0,y:0},Ln={camera:new qe,gizmos:new qe},Et={type:"change"},fi={type:"start"},Kn={type:"end"},BC=new Bi,Vt=new R,Bv=new qe,Vv=new qe,ui=new R,Hh=1e-6,Gh=class extends In{constructor(e,n=null,i=null){super(e,n),this.scene=i,this.target=new R,this._currentTarget=new R,this.radiusFactor=.67,this.mouseActions=[],this._mouseOp=null,this._v2_1=new ie,this._v3_1=new R,this._v3_2=new R,this._m4_1=new qe,this._m4_2=new qe,this._quat=new Ht,this._translationMatrix=new qe,this._rotationMatrix=new qe,this._scaleMatrix=new qe,this._rotationAxis=new R,this._cameraMatrixState=new qe,this._cameraProjectionState=new qe,this._fovState=1,this._upState=new R,this._zoomState=1,this._nearPos=0,this._farPos=0,this._gizmoMatrixState=new qe,this._up0=new R,this._zoom0=1,this._fov0=0,this._initialNear=0,this._nearPos0=0,this._initialFar=0,this._farPos0=0,this._cameraMatrixState0=new qe,this._gizmoMatrixState0=new qe,this._target0=new R,this._button=-1,this._touchStart=[],this._touchCurrent=[],this._input=_t.NONE,this._switchSensibility=32,this._startFingerDistance=0,this._currentFingerDistance=0,this._startFingerRotation=0,this._currentFingerRotation=0,this._devPxRatio=0,this._downValid=!0,this._nclicks=0,this._downEvents=[],this._downStart=0,this._clickStart=0,this._maxDownTime=250,this._maxInterval=300,this._posThreshold=24,this._movementThreshold=24,this._currentCursorPosition=new R,this._startCursorPosition=new R,this._grid=null,this._gridPosition=new R,this._gizmos=new tn,this._curvePts=128,this._timeStart=-1,this._animationId=-1,this.focusAnimationTime=500,this._timePrev=0,this._timeCurrent=0,this._anglePrev=0,this._angleCurrent=0,this._cursorPosPrev=new R,this._cursorPosCurr=new R,this._wPrev=0,this._wCurr=0,this.adjustNearFar=!1,this.scaleFactor=1.1,this.dampingFactor=25,this.wMax=20,this.enableAnimations=!0,this.enableGrid=!1,this.cursorZoom=!1,this.minFov=5,this.maxFov=90,this.rotateSpeed=1,this.enablePan=!0,this.enableRotate=!0,this.enableZoom=!0,this.enableGizmos=!0,this.enableFocus=!0,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this._tbRadius=1,this._state=Ue.IDLE,this.setCamera(e),this.scene!=null&&this.scene.add(this._gizmos),this.initializeMouseActions(),this._onContextMenu=HC.bind(this),this._onWheel=XC.bind(this),this._onPointerUp=qC.bind(this),this._onPointerMove=jC.bind(this),this._onPointerDown=WC.bind(this),this._onPointerCancel=GC.bind(this),this._onWindowResize=VC.bind(this),n!==null&&this.connect(n)}connect(e){super.connect(e),this.domElement.style.touchAction="none",this._devPxRatio=window.devicePixelRatio,this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.addEventListener("wheel",this._onWheel,{passive:!1}),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerCancel),window.addEventListener("resize",this._onWindowResize)}disconnect(){this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.removeEventListener("pointercancel",this._onPointerCancel),this.domElement.removeEventListener("wheel",this._onWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),window.removeEventListener("pointermove",this._onPointerMove),window.removeEventListener("pointerup",this._onPointerUp),window.removeEventListener("resize",this._onWindowResize)}onSinglePanStart(e,n){if(this.enabled)switch(this.dispatchEvent(fi),this.setCenter(e.clientX,e.clientY),n){case"PAN":if(!this.enablePan)return;this._animationId!=-1&&(cancelAnimationFrame(this._animationId),this._animationId=-1,this._timeStart=-1,this.activateGizmos(!1),this.dispatchEvent(Et)),this.updateTbState(Ue.PAN,!0),this._startCursorPosition.copy(this.unprojectOnTbPlane(this.object,Qe.x,Qe.y,this.domElement)),this.enableGrid&&(this.drawGrid(),this.dispatchEvent(Et));break;case"ROTATE":if(!this.enableRotate)return;this._animationId!=-1&&(cancelAnimationFrame(this._animationId),this._animationId=-1,this._timeStart=-1),this.updateTbState(Ue.ROTATE,!0),this._startCursorPosition.copy(this.unprojectOnTbSurface(this.object,Qe.x,Qe.y,this.domElement,this._tbRadius)),this.activateGizmos(!0),this.enableAnimations&&(this._timePrev=this._timeCurrent=performance.now(),this._angleCurrent=this._anglePrev=0,this._cursorPosPrev.copy(this._startCursorPosition),this._cursorPosCurr.copy(this._cursorPosPrev),this._wCurr=0,this._wPrev=this._wCurr),this.dispatchEvent(Et);break;case"FOV":if(!this.object.isPerspectiveCamera||!this.enableZoom)return;this._animationId!=-1&&(cancelAnimationFrame(this._animationId),this._animationId=-1,this._timeStart=-1,this.activateGizmos(!1),this.dispatchEvent(Et)),this.updateTbState(Ue.FOV,!0),this._startCursorPosition.setY(this.getCursorNDC(Qe.x,Qe.y,this.domElement).y*.5),this._currentCursorPosition.copy(this._startCursorPosition);break;case"ZOOM":if(!this.enableZoom)return;this._animationId!=-1&&(cancelAnimationFrame(this._animationId),this._animationId=-1,this._timeStart=-1,this.activateGizmos(!1),this.dispatchEvent(Et)),this.updateTbState(Ue.SCALE,!0),this._startCursorPosition.setY(this.getCursorNDC(Qe.x,Qe.y,this.domElement).y*.5),this._currentCursorPosition.copy(this._startCursorPosition);break}}onSinglePanMove(e,n){if(this.enabled){let i=n!=this._state;switch(this.setCenter(e.clientX,e.clientY),n){case Ue.PAN:this.enablePan&&(i?(this.dispatchEvent(Kn),this.dispatchEvent(fi),this.updateTbState(n,!0),this._startCursorPosition.copy(this.unprojectOnTbPlane(this.object,Qe.x,Qe.y,this.domElement)),this.enableGrid&&this.drawGrid(),this.activateGizmos(!1)):(this._currentCursorPosition.copy(this.unprojectOnTbPlane(this.object,Qe.x,Qe.y,this.domElement)),this.applyTransformMatrix(this.pan(this._startCursorPosition,this._currentCursorPosition))));break;case Ue.ROTATE:if(this.enableRotate)if(i)this.dispatchEvent(Kn),this.dispatchEvent(fi),this.updateTbState(n,!0),this._startCursorPosition.copy(this.unprojectOnTbSurface(this.object,Qe.x,Qe.y,this.domElement,this._tbRadius)),this.enableGrid&&this.disposeGrid(),this.activateGizmos(!0);else{this._currentCursorPosition.copy(this.unprojectOnTbSurface(this.object,Qe.x,Qe.y,this.domElement,this._tbRadius));let r=this._startCursorPosition.distanceTo(this._currentCursorPosition),s=this._startCursorPosition.angleTo(this._currentCursorPosition),o=Math.max(r/this._tbRadius,s)*this.rotateSpeed;this.applyTransformMatrix(this.rotate(this.calculateRotationAxis(this._startCursorPosition,this._currentCursorPosition),o)),this.enableAnimations&&(this._timePrev=this._timeCurrent,this._timeCurrent=performance.now(),this._anglePrev=this._angleCurrent,this._angleCurrent=o,this._cursorPosPrev.copy(this._cursorPosCurr),this._cursorPosCurr.copy(this._currentCursorPosition),this._wPrev=this._wCurr,this._wCurr=this.calculateAngularSpeed(this._anglePrev,this._angleCurrent,this._timePrev,this._timeCurrent))}break;case Ue.SCALE:if(this.enableZoom)if(i)this.dispatchEvent(Kn),this.dispatchEvent(fi),this.updateTbState(n,!0),this._startCursorPosition.setY(this.getCursorNDC(Qe.x,Qe.y,this.domElement).y*.5),this._currentCursorPosition.copy(this._startCursorPosition),this.enableGrid&&this.disposeGrid(),this.activateGizmos(!1);else{this._currentCursorPosition.setY(this.getCursorNDC(Qe.x,Qe.y,this.domElement).y*.5);let s=this._currentCursorPosition.y-this._startCursorPosition.y,o=1;s<0?o=1/Math.pow(this.scaleFactor,-s*8):s>0&&(o=Math.pow(this.scaleFactor,s*8)),this._v3_1.setFromMatrixPosition(this._gizmoMatrixState),this.applyTransformMatrix(this.scale(o,this._v3_1))}break;case Ue.FOV:if(this.enableZoom&&this.object.isPerspectiveCamera)if(i)this.dispatchEvent(Kn),this.dispatchEvent(fi),this.updateTbState(n,!0),this._startCursorPosition.setY(this.getCursorNDC(Qe.x,Qe.y,this.domElement).y*.5),this._currentCursorPosition.copy(this._startCursorPosition),this.enableGrid&&this.disposeGrid(),this.activateGizmos(!1);else{this._currentCursorPosition.setY(this.getCursorNDC(Qe.x,Qe.y,this.domElement).y*.5);let s=this._currentCursorPosition.y-this._startCursorPosition.y,o=1;s<0?o=1/Math.pow(this.scaleFactor,-s*8):s>0&&(o=Math.pow(this.scaleFactor,s*8)),this._v3_1.setFromMatrixPosition(this._cameraMatrixState);let a=this._v3_1.distanceTo(this._gizmos.position),c=a/o;c=gt.clamp(c,this.minDistance,this.maxDistance);let l=a*Math.tan(gt.DEG2RAD*this._fovState*.5),u=gt.RAD2DEG*(Math.atan(l/c)*2);u=gt.clamp(u,this.minFov,this.maxFov);let h=l/Math.tan(gt.DEG2RAD*(u/2));o=a/h,this._v3_2.setFromMatrixPosition(this._gizmoMatrixState),this.setFov(u),this.applyTransformMatrix(this.scale(o,this._v3_2,!1)),Vt.copy(this._gizmos.position).sub(this.object.position).normalize().multiplyScalar(h/a),this._m4_1.makeTranslation(Vt.x,Vt.y,Vt.z)}break}this.dispatchEvent(Et)}}onSinglePanEnd(){if(this._state==Ue.ROTATE){if(!this.enableRotate)return;if(this.enableAnimations)if(performance.now()-this._timeCurrent<120){let n=Math.abs((this._wPrev+this._wCurr)/2),i=this;this._animationId=window.requestAnimationFrame(function(r){i.updateTbState(Ue.ANIMATION_ROTATE,!0);let s=i.calculateRotationAxis(i._cursorPosPrev,i._cursorPosCurr);i.onRotationAnim(r,s,Math.min(n,i.wMax))})}else this.updateTbState(Ue.IDLE,!1),this.activateGizmos(!1),this.dispatchEvent(Et);else this.updateTbState(Ue.IDLE,!1),this.activateGizmos(!1),this.dispatchEvent(Et)}else(this._state==Ue.PAN||this._state==Ue.IDLE)&&(this.updateTbState(Ue.IDLE,!1),this.enableGrid&&this.disposeGrid(),this.activateGizmos(!1),this.dispatchEvent(Et));this.dispatchEvent(Kn)}onDoubleTap(e){if(this.enabled&&this.enablePan&&this.enableFocus&&this.scene!=null){this.dispatchEvent(fi),this.setCenter(e.clientX,e.clientY);let n=this.unprojectOnObj(this.getCursorNDC(Qe.x,Qe.y,this.domElement),this.object);if(n!=null&&this.enableAnimations){let i=this;this._animationId!=-1&&window.cancelAnimationFrame(this._animationId),this._timeStart=-1,this._animationId=window.requestAnimationFrame(function(r){i.updateTbState(Ue.ANIMATION_FOCUS,!0),i.onFocusAnim(r,n,i._cameraMatrixState,i._gizmoMatrixState)})}else n!=null&&!this.enableAnimations&&(this.updateTbState(Ue.FOCUS,!0),this.focus(n,this.scaleFactor),this.updateTbState(Ue.IDLE,!1),this.dispatchEvent(Et))}this.dispatchEvent(Kn)}onDoublePanStart(){this.enabled&&this.enablePan&&(this.dispatchEvent(fi),this.updateTbState(Ue.PAN,!0),this.setCenter((this._touchCurrent[0].clientX+this._touchCurrent[1].clientX)/2,(this._touchCurrent[0].clientY+this._touchCurrent[1].clientY)/2),this._startCursorPosition.copy(this.unprojectOnTbPlane(this.object,Qe.x,Qe.y,this.domElement,!0)),this._currentCursorPosition.copy(this._startCursorPosition),this.activateGizmos(!1))}onDoublePanMove(){this.enabled&&this.enablePan&&(this.setCenter((this._touchCurrent[0].clientX+this._touchCurrent[1].clientX)/2,(this._touchCurrent[0].clientY+this._touchCurrent[1].clientY)/2),this._state!=Ue.PAN&&(this.updateTbState(Ue.PAN,!0),this._startCursorPosition.copy(this._currentCursorPosition)),this._currentCursorPosition.copy(this.unprojectOnTbPlane(this.object,Qe.x,Qe.y,this.domElement,!0)),this.applyTransformMatrix(this.pan(this._startCursorPosition,this._currentCursorPosition,!0)),this.dispatchEvent(Et))}onDoublePanEnd(){this.updateTbState(Ue.IDLE,!1),this.dispatchEvent(Kn)}onRotateStart(){this.enabled&&this.enableRotate&&(this.dispatchEvent(fi),this.updateTbState(Ue.ZROTATE,!0),this._startFingerRotation=this.getAngle(this._touchCurrent[1],this._touchCurrent[0])+this.getAngle(this._touchStart[1],this._touchStart[0]),this._currentFingerRotation=this._startFingerRotation,this.object.getWorldDirection(this._rotationAxis),!this.enablePan&&!this.enableZoom&&this.activateGizmos(!0))}onRotateMove(){if(this.enabled&&this.enableRotate){this.setCenter((this._touchCurrent[0].clientX+this._touchCurrent[1].clientX)/2,(this._touchCurrent[0].clientY+this._touchCurrent[1].clientY)/2);let e;this._state!=Ue.ZROTATE&&(this.updateTbState(Ue.ZROTATE,!0),this._startFingerRotation=this._currentFingerRotation),this._currentFingerRotation=this.getAngle(this._touchCurrent[1],this._touchCurrent[0])+this.getAngle(this._touchStart[1],this._touchStart[0]),this.enablePan?(this._v3_2.setFromMatrixPosition(this._gizmoMatrixState),e=this.unprojectOnTbPlane(this.object,Qe.x,Qe.y,this.domElement).applyQuaternion(this.object.quaternion).multiplyScalar(1/this.object.zoom).add(this._v3_2)):e=new R().setFromMatrixPosition(this._gizmoMatrixState);let n=gt.DEG2RAD*(this._startFingerRotation-this._currentFingerRotation);this.applyTransformMatrix(this.zRotate(e,n)),this.dispatchEvent(Et)}}onRotateEnd(){this.updateTbState(Ue.IDLE,!1),this.activateGizmos(!1),this.dispatchEvent(Kn)}onPinchStart(){this.enabled&&this.enableZoom&&(this.dispatchEvent(fi),this.updateTbState(Ue.SCALE,!0),this._startFingerDistance=this.calculatePointersDistance(this._touchCurrent[0],this._touchCurrent[1]),this._currentFingerDistance=this._startFingerDistance,this.activateGizmos(!1))}onPinchMove(){if(this.enabled&&this.enableZoom){this.setCenter((this._touchCurrent[0].clientX+this._touchCurrent[1].clientX)/2,(this._touchCurrent[0].clientY+this._touchCurrent[1].clientY)/2);let e=12;this._state!=Ue.SCALE&&(this._startFingerDistance=this._currentFingerDistance,this.updateTbState(Ue.SCALE,!0)),this._currentFingerDistance=Math.max(this.calculatePointersDistance(this._touchCurrent[0],this._touchCurrent[1]),e*this._devPxRatio);let n=this._currentFingerDistance/this._startFingerDistance,i;this.enablePan?this.object.isOrthographicCamera?i=this.unprojectOnTbPlane(this.object,Qe.x,Qe.y,this.domElement).applyQuaternion(this.object.quaternion).multiplyScalar(1/this.object.zoom).add(this._gizmos.position):this.object.isPerspectiveCamera&&(i=this.unprojectOnTbPlane(this.object,Qe.x,Qe.y,this.domElement).applyQuaternion(this.object.quaternion).add(this._gizmos.position)):i=this._gizmos.position,this.applyTransformMatrix(this.scale(n,i)),this.dispatchEvent(Et)}}onPinchEnd(){this.updateTbState(Ue.IDLE,!1),this.dispatchEvent(Kn)}onTriplePanStart(){if(this.enabled&&this.enableZoom){this.dispatchEvent(fi),this.updateTbState(Ue.SCALE,!0);let e=0,n=0,i=this._touchCurrent.length;for(let r=0;r<i;r++)e+=this._touchCurrent[r].clientX,n+=this._touchCurrent[r].clientY;this.setCenter(e/i,n/i),this._startCursorPosition.setY(this.getCursorNDC(Qe.x,Qe.y,this.domElement).y*.5),this._currentCursorPosition.copy(this._startCursorPosition)}}onTriplePanMove(){if(this.enabled&&this.enableZoom){let e=0,n=0,i=this._touchCurrent.length;for(let f=0;f<i;f++)e+=this._touchCurrent[f].clientX,n+=this._touchCurrent[f].clientY;this.setCenter(e/i,n/i);let r=8;this._currentCursorPosition.setY(this.getCursorNDC(Qe.x,Qe.y,this.domElement).y*.5);let s=this._currentCursorPosition.y-this._startCursorPosition.y,o=1;s<0?o=1/Math.pow(this.scaleFactor,-s*r):s>0&&(o=Math.pow(this.scaleFactor,s*r)),this._v3_1.setFromMatrixPosition(this._cameraMatrixState);let a=this._v3_1.distanceTo(this._gizmos.position),c=a/o;c=gt.clamp(c,this.minDistance,this.maxDistance);let l=a*Math.tan(gt.DEG2RAD*this._fovState*.5),u=gt.RAD2DEG*(Math.atan(l/c)*2);u=gt.clamp(u,this.minFov,this.maxFov);let h=l/Math.tan(gt.DEG2RAD*(u/2));o=a/h,this._v3_2.setFromMatrixPosition(this._gizmoMatrixState),this.setFov(u),this.applyTransformMatrix(this.scale(o,this._v3_2,!1)),Vt.copy(this._gizmos.position).sub(this.object.position).normalize().multiplyScalar(h/a),this._m4_1.makeTranslation(Vt.x,Vt.y,Vt.z),this.dispatchEvent(Et)}}onTriplePanEnd(){this.updateTbState(Ue.IDLE,!1),this.dispatchEvent(Kn)}setCenter(e,n){Qe.x=e,Qe.y=n}initializeMouseActions(){this.setMouseAction("PAN",0,"CTRL"),this.setMouseAction("PAN",2),this.setMouseAction("ROTATE",0),this.setMouseAction("ZOOM","WHEEL"),this.setMouseAction("ZOOM",1),this.setMouseAction("FOV","WHEEL","SHIFT"),this.setMouseAction("FOV",1,"SHIFT")}compareMouseAction(e,n){return e.operation==n.operation?e.mouse==n.mouse&&e.key==n.key:!1}setMouseAction(e,n,i=null){let r=["PAN","ROTATE","ZOOM","FOV"],s=[0,1,2,"WHEEL"],o=["CTRL","SHIFT",null],a;if(!r.includes(e)||!s.includes(n)||!o.includes(i)||n=="WHEEL"&&e!="ZOOM"&&e!="FOV")return!1;switch(e){case"PAN":a=Ue.PAN;break;case"ROTATE":a=Ue.ROTATE;break;case"ZOOM":a=Ue.SCALE;break;case"FOV":a=Ue.FOV;break}let c={operation:e,mouse:n,key:i,state:a};for(let l=0;l<this.mouseActions.length;l++)if(this.mouseActions[l].mouse==c.mouse&&this.mouseActions[l].key==c.key)return this.mouseActions.splice(l,1,c),!0;return this.mouseActions.push(c),!0}unsetMouseAction(e,n=null){for(let i=0;i<this.mouseActions.length;i++)if(this.mouseActions[i].mouse==e&&this.mouseActions[i].key==n)return this.mouseActions.splice(i,1),!0;return!1}getOpFromAction(e,n){let i;for(let r=0;r<this.mouseActions.length;r++)if(i=this.mouseActions[r],i.mouse==e&&i.key==n)return i.operation;if(n!=null){for(let r=0;r<this.mouseActions.length;r++)if(i=this.mouseActions[r],i.mouse==e&&i.key==null)return i.operation}return null}getOpStateFromAction(e,n){let i;for(let r=0;r<this.mouseActions.length;r++)if(i=this.mouseActions[r],i.mouse==e&&i.key==n)return i.state;if(n!=null){for(let r=0;r<this.mouseActions.length;r++)if(i=this.mouseActions[r],i.mouse==e&&i.key==null)return i.state}return null}getAngle(e,n){return Math.atan2(n.clientY-e.clientY,n.clientX-e.clientX)*180/Math.PI}updateTouchEvent(e){for(let n=0;n<this._touchCurrent.length;n++)if(this._touchCurrent[n].pointerId==e.pointerId){this._touchCurrent.splice(n,1,e);break}}applyTransformMatrix(e){if(e.camera!=null&&(this._m4_1.copy(this._cameraMatrixState).premultiply(e.camera),this._m4_1.decompose(this.object.position,this.object.quaternion,this.object.scale),this.object.updateMatrix(),(this._state==Ue.ROTATE||this._state==Ue.ZROTATE||this._state==Ue.ANIMATION_ROTATE)&&this.object.up.copy(this._upState).applyQuaternion(this.object.quaternion)),e.gizmos!=null&&(this._m4_1.copy(this._gizmoMatrixState).premultiply(e.gizmos),this._m4_1.decompose(this._gizmos.position,this._gizmos.quaternion,this._gizmos.scale),this._gizmos.updateMatrix()),this._state==Ue.SCALE||this._state==Ue.FOCUS||this._state==Ue.ANIMATION_FOCUS)if(this._tbRadius=this.calculateTbRadius(this.object),this.adjustNearFar){let n=this.object.position.distanceTo(this._gizmos.position),i=new vn;i.setFromObject(this._gizmos);let r=new pi;i.getBoundingSphere(r);let s=Math.max(this._nearPos0,r.radius+r.center.length()),o=n-this._initialNear,a=Math.min(s,o);this.object.near=n-a;let c=Math.min(this._farPos0,-r.radius+r.center.length()),l=n-this._initialFar,u=Math.min(c,l);this.object.far=n-u,this.object.updateProjectionMatrix()}else{let n=!1;this.object.near!=this._initialNear&&(this.object.near=this._initialNear,n=!0),this.object.far!=this._initialFar&&(this.object.far=this._initialFar,n=!0),n&&this.object.updateProjectionMatrix()}}calculateAngularSpeed(e,n,i,r){let s=n-e,o=(r-i)/1e3;return o==0?0:s/o}calculatePointersDistance(e,n){return Math.sqrt(Math.pow(n.clientX-e.clientX,2)+Math.pow(n.clientY-e.clientY,2))}calculateRotationAxis(e,n){return this._rotationMatrix.extractRotation(this._cameraMatrixState),this._quat.setFromRotationMatrix(this._rotationMatrix),this._rotationAxis.crossVectors(e,n).applyQuaternion(this._quat),this._rotationAxis.normalize().clone()}calculateTbRadius(e){let n=e.position.distanceTo(this._gizmos.position);if(e.type=="PerspectiveCamera"){let i=gt.DEG2RAD*e.fov*.5,r=Math.atan(e.aspect*Math.tan(i));return Math.tan(Math.min(i,r))*n*this.radiusFactor}else if(e.type=="OrthographicCamera")return Math.min(e.top,e.right)*this.radiusFactor}focus(e,n,i=1){Vt.copy(e).sub(this._gizmos.position).multiplyScalar(i),this._translationMatrix.makeTranslation(Vt.x,Vt.y,Vt.z),Bv.copy(this._gizmoMatrixState),this._gizmoMatrixState.premultiply(this._translationMatrix),this._gizmoMatrixState.decompose(this._gizmos.position,this._gizmos.quaternion,this._gizmos.scale),Vv.copy(this._cameraMatrixState),this._cameraMatrixState.premultiply(this._translationMatrix),this._cameraMatrixState.decompose(this.object.position,this.object.quaternion,this.object.scale),this.enableZoom&&this.applyTransformMatrix(this.scale(n,this._gizmos.position)),this._gizmoMatrixState.copy(Bv),this._cameraMatrixState.copy(Vv)}drawGrid(){if(this.scene!=null){let i,r,s,o;if(this.object.isOrthographicCamera){let a=this.object.right-this.object.left,c=this.object.bottom-this.object.top;s=Math.max(a,c),o=s/20,i=s/this.object.zoom*3,r=i/o*this.object.zoom}else if(this.object.isPerspectiveCamera){let a=this.object.position.distanceTo(this._gizmos.position),c=gt.DEG2RAD*this.object.fov*.5,l=Math.atan(this.object.aspect*Math.tan(c));s=Math.tan(Math.max(c,l))*a*2,o=s/20,i=s*3,r=i/o}this._grid==null&&(this._grid=new aa(i,r,8947848,8947848),this._grid.position.copy(this._gizmos.position),this._gridPosition.copy(this._grid.position),this._grid.quaternion.copy(this.object.quaternion),this._grid.rotateX(Math.PI*.5),this.scene.add(this._grid))}}dispose(){this._animationId!=-1&&window.cancelAnimationFrame(this._animationId),this.disconnect(),this.scene!==null&&this.scene.remove(this._gizmos),this.disposeGrid()}disposeGrid(){this._grid!=null&&this.scene!=null&&(this.scene.remove(this._grid),this._grid=null)}easeOutCubic(e){return 1-Math.pow(1-e,3)}activateGizmos(e){let n=this._gizmos.children[0],i=this._gizmos.children[1],r=this._gizmos.children[2];e?(n.material.setValues({opacity:1}),i.material.setValues({opacity:1}),r.material.setValues({opacity:1})):(n.material.setValues({opacity:.6}),i.material.setValues({opacity:.6}),r.material.setValues({opacity:.6}))}getCursorNDC(e,n,i){let r=i.getBoundingClientRect();return this._v2_1.setX((e-r.left)/r.width*2-1),this._v2_1.setY((r.bottom-n)/r.height*2-1),this._v2_1.clone()}getCursorPosition(e,n,i){return this._v2_1.copy(this.getCursorNDC(e,n,i)),this._v2_1.x*=(this.object.right-this.object.left)*.5,this._v2_1.y*=(this.object.top-this.object.bottom)*.5,this._v2_1.clone()}setCamera(e){e.lookAt(this.target),e.updateMatrix(),e.type=="PerspectiveCamera"&&(this._fov0=e.fov,this._fovState=e.fov),this._cameraMatrixState0.copy(e.matrix),this._cameraMatrixState.copy(this._cameraMatrixState0),this._cameraProjectionState.copy(e.projectionMatrix),this._zoom0=e.zoom,this._zoomState=this._zoom0,this._initialNear=e.near,this._nearPos0=e.position.distanceTo(this.target)-e.near,this._nearPos=this._initialNear,this._initialFar=e.far,this._farPos0=e.position.distanceTo(this.target)-e.far,this._farPos=this._initialFar,this._up0.copy(e.up),this._upState.copy(e.up),this.object=e,this.object.updateProjectionMatrix(),this._tbRadius=this.calculateTbRadius(e),this.makeGizmos(this.target,this._tbRadius)}setGizmosVisible(e){this._gizmos.visible=e,this.dispatchEvent(Et)}setTbRadius(e){this.radiusFactor=e,this._tbRadius=this.calculateTbRadius(this.object);let i=new vi(0,0,this._tbRadius,this._tbRadius).getPoints(this._curvePts),r=new Mt().setFromPoints(i);for(let s in this._gizmos.children)this._gizmos.children[s].geometry=r;this.dispatchEvent(Et)}makeGizmos(e,n){let r=new vi(0,0,n,n).getPoints(this._curvePts),s=new Mt().setFromPoints(r),o=new ri({color:16744576,fog:!1,transparent:!0,opacity:.6}),a=new ri({color:8454016,fog:!1,transparent:!0,opacity:.6}),c=new ri({color:8421631,fog:!1,transparent:!0,opacity:.6}),l=new _i(s,o),u=new _i(s,a),h=new _i(s,c),f=Math.PI*.5;if(l.rotation.x=f,u.rotation.y=f,this._gizmoMatrixState0.identity().setPosition(e),this._gizmoMatrixState.copy(this._gizmoMatrixState0),this.object.zoom!==1){let d=1/this.object.zoom;this._scaleMatrix.makeScale(d,d,d),this._translationMatrix.makeTranslation(-e.x,-e.y,-e.z),this._gizmoMatrixState.premultiply(this._translationMatrix).premultiply(this._scaleMatrix),this._translationMatrix.makeTranslation(e.x,e.y,e.z),this._gizmoMatrixState.premultiply(this._translationMatrix)}this._gizmoMatrixState.decompose(this._gizmos.position,this._gizmos.quaternion,this._gizmos.scale),this._gizmos.traverse(function(d){d.isLine&&(d.geometry.dispose(),d.material.dispose())}),this._gizmos.clear(),this._gizmos.add(l),this._gizmos.add(u),this._gizmos.add(h)}onFocusAnim(e,n,i,r){if(this._timeStart==-1&&(this._timeStart=e),this._state==Ue.ANIMATION_FOCUS){let o=(e-this._timeStart)/this.focusAnimationTime;if(this._gizmoMatrixState.copy(r),o>=1)this._gizmoMatrixState.decompose(this._gizmos.position,this._gizmos.quaternion,this._gizmos.scale),this.focus(n,this.scaleFactor),this._timeStart=-1,this.updateTbState(Ue.IDLE,!1),this.activateGizmos(!1),this.dispatchEvent(Et);else{let a=this.easeOutCubic(o),c=1-a+this.scaleFactor*a;this._gizmoMatrixState.decompose(this._gizmos.position,this._gizmos.quaternion,this._gizmos.scale),this.focus(n,c,a),this.dispatchEvent(Et);let l=this;this._animationId=window.requestAnimationFrame(function(u){l.onFocusAnim(u,n,i,r.clone())})}}else this._animationId=-1,this._timeStart=-1}onRotationAnim(e,n,i){if(this._timeStart==-1&&(this._anglePrev=0,this._angleCurrent=0,this._timeStart=e),this._state==Ue.ANIMATION_ROTATE){let r=(e-this._timeStart)/1e3;if(i+-this.dampingFactor*r>0){this._angleCurrent=.5*-this.dampingFactor*Math.pow(r,2)+i*r+0,this.applyTransformMatrix(this.rotate(n,this._angleCurrent)),this.dispatchEvent(Et);let o=this;this._animationId=window.requestAnimationFrame(function(a){o.onRotationAnim(a,n,i)})}else this._animationId=-1,this._timeStart=-1,this.updateTbState(Ue.IDLE,!1),this.activateGizmos(!1),this.dispatchEvent(Et)}else this._animationId=-1,this._timeStart=-1,this._state!=Ue.ROTATE&&(this.activateGizmos(!1),this.dispatchEvent(Et))}pan(e,n,i=!1){let r=e.clone().sub(n);if(this.object.isOrthographicCamera)r.multiplyScalar(1/this.object.zoom);else if(this.object.isPerspectiveCamera&&i){this._v3_1.setFromMatrixPosition(this._cameraMatrixState0),this._v3_2.setFromMatrixPosition(this._gizmoMatrixState0);let s=this._v3_1.distanceTo(this._v3_2)/this.object.position.distanceTo(this._gizmos.position);r.multiplyScalar(1/s)}return this._v3_1.set(r.x,r.y,0).applyQuaternion(this.object.quaternion),this._m4_1.makeTranslation(this._v3_1.x,this._v3_1.y,this._v3_1.z),this.setTransformationMatrices(this._m4_1,this._m4_1),Ln}reset(){this.target.copy(this._target0),this.object.zoom=this._zoom0,this.object.isPerspectiveCamera&&(this.object.fov=this._fov0),this.object.near=this._nearPos,this.object.far=this._farPos,this._cameraMatrixState.copy(this._cameraMatrixState0),this._cameraMatrixState.decompose(this.object.position,this.object.quaternion,this.object.scale),this.object.up.copy(this._up0),this.object.updateMatrix(),this.object.updateProjectionMatrix(),this._gizmoMatrixState.copy(this._gizmoMatrixState0),this._gizmoMatrixState0.decompose(this._gizmos.position,this._gizmos.quaternion,this._gizmos.scale),this._gizmos.updateMatrix(),this._tbRadius=this.calculateTbRadius(this.object),this.makeGizmos(this._gizmos.position,this._tbRadius),this.object.lookAt(this._gizmos.position),this.updateTbState(Ue.IDLE,!1),this.dispatchEvent(Et)}rotate(e,n){let i=this._gizmos.position;return this._translationMatrix.makeTranslation(-i.x,-i.y,-i.z),this._rotationMatrix.makeRotationAxis(e,-n),this._m4_1.makeTranslation(i.x,i.y,i.z),this._m4_1.multiply(this._rotationMatrix),this._m4_1.multiply(this._translationMatrix),this.setTransformationMatrices(this._m4_1),Ln}copyState(){let e;this.object.isOrthographicCamera?e=JSON.stringify({arcballState:{cameraFar:this.object.far,cameraMatrix:this.object.matrix,cameraNear:this.object.near,cameraUp:this.object.up,cameraZoom:this.object.zoom,gizmoMatrix:this._gizmos.matrix,target:this.target}}):this.object.isPerspectiveCamera&&(e=JSON.stringify({arcballState:{cameraFar:this.object.far,cameraFov:this.object.fov,cameraMatrix:this.object.matrix,cameraNear:this.object.near,cameraUp:this.object.up,cameraZoom:this.object.zoom,gizmoMatrix:this._gizmos.matrix,target:this.target}})),navigator.clipboard.writeText(e)}pasteState(){let e=this;navigator.clipboard.readText().then(function(i){e.setStateFromJSON(i)})}saveState(){this.object.updateMatrix(),this._gizmos.updateMatrix(),this._target0.copy(this.target),this._cameraMatrixState0.copy(this.object.matrix),this._gizmoMatrixState0.copy(this._gizmos.matrix),this._nearPos=this.object.near,this._farPos=this.object.far,this._zoom0=this.object.zoom,this._up0.copy(this.object.up),this.object.isPerspectiveCamera&&(this._fov0=this.object.fov)}scale(e,n,i=!0){ui.copy(n);let r=1/e;if(this.object.isOrthographicCamera){this.object.zoom=this._zoomState,this.object.zoom*=e,this.object.zoom>this.maxZoom?(this.object.zoom=this.maxZoom,r=this._zoomState/this.maxZoom):this.object.zoom<this.minZoom&&(this.object.zoom=this.minZoom,r=this._zoomState/this.minZoom),this.object.updateProjectionMatrix(),this._v3_1.setFromMatrixPosition(this._gizmoMatrixState),this._scaleMatrix.makeScale(r,r,r),this._translationMatrix.makeTranslation(-this._v3_1.x,-this._v3_1.y,-this._v3_1.z),this._m4_2.makeTranslation(this._v3_1.x,this._v3_1.y,this._v3_1.z).multiply(this._scaleMatrix),this._m4_2.multiply(this._translationMatrix),ui.sub(this._v3_1);let s=ui.clone().multiplyScalar(r);return ui.sub(s),this._m4_1.makeTranslation(ui.x,ui.y,ui.z),this._m4_2.premultiply(this._m4_1),this.setTransformationMatrices(this._m4_1,this._m4_2),Ln}else if(this.object.isPerspectiveCamera){this._v3_1.setFromMatrixPosition(this._cameraMatrixState),this._v3_2.setFromMatrixPosition(this._gizmoMatrixState);let s=this._v3_1.distanceTo(ui),o=s-s*r,a=s-o;if(a<this.minDistance?(r=this.minDistance/s,o=s-s*r):a>this.maxDistance&&(r=this.maxDistance/s,o=s-s*r),Vt.copy(ui).sub(this._v3_1).normalize().multiplyScalar(o),this._m4_1.makeTranslation(Vt.x,Vt.y,Vt.z),i){let c=this._v3_2;s=c.distanceTo(ui),o=s-s*r,Vt.copy(ui).sub(this._v3_2).normalize().multiplyScalar(o),this._translationMatrix.makeTranslation(c.x,c.y,c.z),this._scaleMatrix.makeScale(r,r,r),this._m4_2.makeTranslation(Vt.x,Vt.y,Vt.z).multiply(this._translationMatrix),this._m4_2.multiply(this._scaleMatrix),this._translationMatrix.makeTranslation(-c.x,-c.y,-c.z),this._m4_2.multiply(this._translationMatrix),this.setTransformationMatrices(this._m4_1,this._m4_2)}else this.setTransformationMatrices(this._m4_1);return Ln}}setFov(e){this.object.isPerspectiveCamera&&(this.object.fov=gt.clamp(e,this.minFov,this.maxFov),this.object.updateProjectionMatrix())}setTransformationMatrices(e=null,n=null){e!=null?Ln.camera!=null?Ln.camera.copy(e):Ln.camera=e.clone():Ln.camera=null,n!=null?Ln.gizmos!=null?Ln.gizmos.copy(n):Ln.gizmos=n.clone():Ln.gizmos=null}zRotate(e,n){return this._rotationMatrix.makeRotationAxis(this._rotationAxis,n),this._translationMatrix.makeTranslation(-e.x,-e.y,-e.z),this._m4_1.makeTranslation(e.x,e.y,e.z),this._m4_1.multiply(this._rotationMatrix),this._m4_1.multiply(this._translationMatrix),this._v3_1.setFromMatrixPosition(this._gizmoMatrixState).sub(e),this._v3_2.copy(this._v3_1).applyAxisAngle(this._rotationAxis,n),this._v3_2.sub(this._v3_1),this._m4_2.makeTranslation(this._v3_2.x,this._v3_2.y,this._v3_2.z),this.setTransformationMatrices(this._m4_1,this._m4_2),Ln}getRaycaster(){return BC}unprojectOnObj(e,n){let i=this.getRaycaster();i.near=n.near,i.far=n.far,i.setFromCamera(e,n);let r=i.intersectObjects(this.scene.children,!0);for(let s=0;s<r.length;s++)if(r[s].object.uuid!=this._gizmos.uuid&&r[s].face!=null)return r[s].point.clone();return null}unprojectOnTbSurface(e,n,i,r,s){if(e.type=="OrthographicCamera"){this._v2_1.copy(this.getCursorPosition(n,i,r)),this._v3_1.set(this._v2_1.x,this._v2_1.y,0);let o=Math.pow(this._v2_1.x,2),a=Math.pow(this._v2_1.y,2),c=Math.pow(this._tbRadius,2);return o+a<=c*.5?this._v3_1.setZ(Math.sqrt(c-(o+a))):this._v3_1.setZ(c*.5/Math.sqrt(o+a)),this._v3_1}else if(e.type=="PerspectiveCamera"){this._v2_1.copy(this.getCursorNDC(n,i,r)),this._v3_1.set(this._v2_1.x,this._v2_1.y,-1),this._v3_1.applyMatrix4(e.projectionMatrixInverse);let o=this._v3_1.clone().normalize(),a=e.position.distanceTo(this._gizmos.position),c=Math.pow(s,2),l=this._v3_1.z,u=Math.sqrt(Math.pow(this._v3_1.x,2)+Math.pow(this._v3_1.y,2));if(u==0)return o.set(this._v3_1.x,this._v3_1.y,s),o;let h=l/u,f=a,d=Math.pow(h,2)+1,m=2*h*f,_=Math.pow(f,2)-c,g=Math.pow(m,2)-4*d*_;if(g>=0&&(this._v2_1.setX((-m-Math.sqrt(g))/(2*d)),this._v2_1.setY(h*this._v2_1.x+f),gt.RAD2DEG*this._v2_1.angle()>=45)){let y=Math.sqrt(Math.pow(this._v2_1.x,2)+Math.pow(a-this._v2_1.y,2));return o.multiplyScalar(y),o.z+=a,o}d=h,m=f,_=-c*.5,g=Math.pow(m,2)-4*d*_,this._v2_1.setX((-m-Math.sqrt(g))/(2*d)),this._v2_1.setY(h*this._v2_1.x+f);let p=Math.sqrt(Math.pow(this._v2_1.x,2)+Math.pow(a-this._v2_1.y,2));return o.multiplyScalar(p),o.z+=a,o}}unprojectOnTbPlane(e,n,i,r,s=!1){if(e.type=="OrthographicCamera")return this._v2_1.copy(this.getCursorPosition(n,i,r)),this._v3_1.set(this._v2_1.x,this._v2_1.y,0),this._v3_1.clone();if(e.type=="PerspectiveCamera"){this._v2_1.copy(this.getCursorNDC(n,i,r)),this._v3_1.set(this._v2_1.x,this._v2_1.y,-1),this._v3_1.applyMatrix4(e.projectionMatrixInverse);let o=this._v3_1.clone().normalize(),a=this._v3_1.z,c=Math.sqrt(Math.pow(this._v3_1.x,2)+Math.pow(this._v3_1.y,2)),l;if(s?l=this._v3_1.setFromMatrixPosition(this._cameraMatrixState0).distanceTo(this._v3_2.setFromMatrixPosition(this._gizmoMatrixState0)):l=e.position.distanceTo(this._gizmos.position),c==0)return o.set(0,0,0),o;let u=a/c,h=l,f=-h/u,d=Math.sqrt(Math.pow(h,2)+Math.pow(f,2));return o.multiplyScalar(d),o.z=0,o}}updateMatrixState(){this._cameraMatrixState.copy(this.object.matrix),this._gizmoMatrixState.copy(this._gizmos.matrix),this.object.isOrthographicCamera?(this._cameraProjectionState.copy(this.object.projectionMatrix),this.object.updateProjectionMatrix(),this._zoomState=this.object.zoom):this.object.isPerspectiveCamera&&(this._fovState=this.object.fov)}updateTbState(e,n){this._state=e,n&&this.updateMatrixState()}update(){if(this.target.equals(this._currentTarget)===!1&&(this._gizmos.position.copy(this.target),this._tbRadius=this.calculateTbRadius(this.object),this.makeGizmos(this.target,this._tbRadius),this._currentTarget.copy(this.target)),this.object.isOrthographicCamera){if(this.object.zoom>this.maxZoom||this.object.zoom<this.minZoom){let e=gt.clamp(this.object.zoom,this.minZoom,this.maxZoom);this.applyTransformMatrix(this.scale(e/this.object.zoom,this._gizmos.position,!0))}}else if(this.object.isPerspectiveCamera){let e=this.object.position.distanceTo(this._gizmos.position);if(e>this.maxDistance+Hh||e<this.minDistance-Hh){let i=gt.clamp(e,this.minDistance,this.maxDistance);this.applyTransformMatrix(this.scale(i/e,this._gizmos.position)),this.updateMatrixState()}(this.object.fov<this.minFov||this.object.fov>this.maxFov)&&(this.object.fov=gt.clamp(this.object.fov,this.minFov,this.maxFov),this.object.updateProjectionMatrix());let n=this._tbRadius;if(this._tbRadius=this.calculateTbRadius(this.object),n<this._tbRadius-Hh||n>this._tbRadius+Hh){let i=(this._gizmos.scale.x+this._gizmos.scale.y+this._gizmos.scale.z)/3,r=this._tbRadius/i,o=new vi(0,0,r,r).getPoints(this._curvePts),a=new Mt().setFromPoints(o);for(let c in this._gizmos.children)this._gizmos.children[c].geometry=a}}this.object.lookAt(this._gizmos.position)}setStateFromJSON(e){let n=JSON.parse(e);if(n.arcballState!=null){this.target.fromArray(n.arcballState.target),this._cameraMatrixState.fromArray(n.arcballState.cameraMatrix.elements),this._cameraMatrixState.decompose(this.object.position,this.object.quaternion,this.object.scale),this.object.up.copy(n.arcballState.cameraUp),this.object.near=n.arcballState.cameraNear,this.object.far=n.arcballState.cameraFar,this.object.zoom=n.arcballState.cameraZoom,this.object.isPerspectiveCamera&&(this.object.fov=n.arcballState.cameraFov),this._gizmoMatrixState.fromArray(n.arcballState.gizmoMatrix.elements),this._gizmoMatrixState.decompose(this._gizmos.position,this._gizmos.quaternion,this._gizmos.scale),this.object.updateMatrix(),this.object.updateProjectionMatrix(),this._gizmos.updateMatrix(),this._tbRadius=this.calculateTbRadius(this.object);let i=new qe().copy(this._gizmoMatrixState0);this.makeGizmos(this._gizmos.position,this._tbRadius),this._gizmoMatrixState0.copy(i),this.object.lookAt(this._gizmos.position),this.updateTbState(Ue.IDLE,!1),this.dispatchEvent(Et)}}};function VC(){let t=(this._gizmos.scale.x+this._gizmos.scale.y+this._gizmos.scale.z)/3;this._tbRadius=this.calculateTbRadius(this.object);let e=this._tbRadius/t,i=new vi(0,0,e,e).getPoints(this._curvePts),r=new Mt().setFromPoints(i);for(let s in this._gizmos.children)this._gizmos.children[s].geometry=r;this.dispatchEvent(Et)}function HC(t){if(this.enabled){for(let e=0;e<this.mouseActions.length;e++)if(this.mouseActions[e].mouse==2){t.preventDefault();break}}}function GC(){this._touchStart.splice(0,this._touchStart.length),this._touchCurrent.splice(0,this._touchCurrent.length),this._input=_t.NONE}function WC(t){if(t.button==0&&t.isPrimary?(this._downValid=!0,this._downEvents.push(t),this._downStart=performance.now()):this._downValid=!1,t.pointerType=="touch"&&this._input!=_t.CURSOR)switch(this._touchStart.push(t),this._touchCurrent.push(t),this._input){case _t.NONE:this._input=_t.ONE_FINGER,this.onSinglePanStart(t,"ROTATE"),window.addEventListener("pointermove",this._onPointerMove),window.addEventListener("pointerup",this._onPointerUp);break;case _t.ONE_FINGER:case _t.ONE_FINGER_SWITCHED:this._input=_t.TWO_FINGER,this.onRotateStart(),this.onPinchStart(),this.onDoublePanStart();break;case _t.TWO_FINGER:this._input=_t.MULT_FINGER,this.onTriplePanStart(t);break}else if(t.pointerType!="touch"&&this._input==_t.NONE){let e=null;t.ctrlKey||t.metaKey?e="CTRL":t.shiftKey&&(e="SHIFT"),this._mouseOp=this.getOpFromAction(t.button,e),this._mouseOp!=null&&(window.addEventListener("pointermove",this._onPointerMove),window.addEventListener("pointerup",this._onPointerUp),this._input=_t.CURSOR,this._button=t.button,this.onSinglePanStart(t,this._mouseOp))}}function jC(t){if(t.pointerType=="touch"&&this._input!=_t.CURSOR)switch(this._input){case _t.ONE_FINGER:this.updateTouchEvent(t),this.onSinglePanMove(t,Ue.ROTATE);break;case _t.ONE_FINGER_SWITCHED:if(this.calculatePointersDistance(this._touchCurrent[0],t)*this._devPxRatio>=this._switchSensibility){this._input=_t.ONE_FINGER,this.updateTouchEvent(t),this.onSinglePanStart(t,"ROTATE");break}break;case _t.TWO_FINGER:this.updateTouchEvent(t),this.onRotateMove(),this.onPinchMove(),this.onDoublePanMove();break;case _t.MULT_FINGER:this.updateTouchEvent(t),this.onTriplePanMove(t);break}else if(t.pointerType!="touch"&&this._input==_t.CURSOR){let e=null;t.ctrlKey||t.metaKey?e="CTRL":t.shiftKey&&(e="SHIFT");let n=this.getOpStateFromAction(this._button,e);n!=null&&this.onSinglePanMove(t,n)}this._downValid&&this.calculatePointersDistance(this._downEvents[this._downEvents.length-1],t)*this._devPxRatio>this._movementThreshold&&(this._downValid=!1)}function qC(t){if(t.pointerType=="touch"&&this._input!=_t.CURSOR){let e=this._touchCurrent.length;for(let n=0;n<e;n++)if(this._touchCurrent[n].pointerId==t.pointerId){this._touchCurrent.splice(n,1),this._touchStart.splice(n,1);break}switch(this._input){case _t.ONE_FINGER:case _t.ONE_FINGER_SWITCHED:window.removeEventListener("pointermove",this._onPointerMove),window.removeEventListener("pointerup",this._onPointerUp),this._input=_t.NONE,this.onSinglePanEnd();break;case _t.TWO_FINGER:this.onDoublePanEnd(t),this.onPinchEnd(t),this.onRotateEnd(t),this._input=_t.ONE_FINGER_SWITCHED;break;case _t.MULT_FINGER:this._touchCurrent.length==0&&(window.removeEventListener("pointermove",this._onPointerMove),window.removeEventListener("pointerup",this._onPointerUp),this._input=_t.NONE,this.onTriplePanEnd());break}}else t.pointerType!="touch"&&this._input==_t.CURSOR&&(window.removeEventListener("pointermove",this._onPointerMove),window.removeEventListener("pointerup",this._onPointerUp),this._input=_t.NONE,this.onSinglePanEnd(),this._button=-1);if(t.isPrimary)if(this._downValid)if(t.timeStamp-this._downEvents[this._downEvents.length-1].timeStamp<=this._maxDownTime)if(this._nclicks==0)this._nclicks=1,this._clickStart=performance.now();else{let n=t.timeStamp-this._clickStart,i=this.calculatePointersDistance(this._downEvents[1],this._downEvents[0])*this._devPxRatio;n<=this._maxInterval&&i<=this._posThreshold?(this._nclicks=0,this._downEvents.splice(0,this._downEvents.length),this.onDoubleTap(t)):(this._nclicks=1,this._downEvents.shift(),this._clickStart=performance.now())}else this._downValid=!1,this._nclicks=0,this._downEvents.splice(0,this._downEvents.length);else this._nclicks=0,this._downEvents.splice(0,this._downEvents.length)}function XC(t){if(this.enabled&&this.enableZoom){let e=null;t.ctrlKey||t.metaKey?e="CTRL":t.shiftKey&&(e="SHIFT");let n=this.getOpFromAction("WHEEL",e);if(n!=null){t.preventDefault(),this.dispatchEvent(fi);let i=125,r=t.deltaY/i,s=1;switch(r>0?s=1/this.scaleFactor:r<0&&(s=this.scaleFactor),n){case"ZOOM":if(this.updateTbState(Ue.SCALE,!0),r>0?s=1/Math.pow(this.scaleFactor,r):r<0&&(s=Math.pow(this.scaleFactor,-r)),this.cursorZoom&&this.enablePan){let o;this.object.isOrthographicCamera?o=this.unprojectOnTbPlane(this.object,t.clientX,t.clientY,this.domElement).applyQuaternion(this.object.quaternion).multiplyScalar(1/this.object.zoom).add(this._gizmos.position):this.object.isPerspectiveCamera&&(o=this.unprojectOnTbPlane(this.object,t.clientX,t.clientY,this.domElement).applyQuaternion(this.object.quaternion).add(this._gizmos.position)),this.applyTransformMatrix(this.scale(s,o))}else this.applyTransformMatrix(this.scale(s,this._gizmos.position));this._grid!=null&&(this.disposeGrid(),this.drawGrid()),this.updateTbState(Ue.IDLE,!1),this.dispatchEvent(Et),this.dispatchEvent(Kn);break;case"FOV":if(this.object.isPerspectiveCamera){this.updateTbState(Ue.FOV,!0),t.deltaX!=0&&(r=t.deltaX/i,s=1,r>0?s=1/Math.pow(this.scaleFactor,r):r<0&&(s=Math.pow(this.scaleFactor,-r))),this._v3_1.setFromMatrixPosition(this._cameraMatrixState);let o=this._v3_1.distanceTo(this._gizmos.position),a=o/s;a=gt.clamp(a,this.minDistance,this.maxDistance);let c=o*Math.tan(gt.DEG2RAD*this.object.fov*.5),l=gt.RAD2DEG*(Math.atan(c/a)*2);l>this.maxFov?l=this.maxFov:l<this.minFov&&(l=this.minFov);let u=c/Math.tan(gt.DEG2RAD*(l/2));s=o/u,this.setFov(l),this.applyTransformMatrix(this.scale(s,this._gizmos.position,!1))}this._grid!=null&&(this.disposeGrid(),this.drawGrid()),this.updateTbState(Ue.IDLE,!1),this.dispatchEvent(Et),this.dispatchEvent(Kn);break}}}}var Hv={type:"change"},Yd={type:"start"},Wv={type:"end"},Wh=new zi,Gv=new _n,$C=Math.cos(70*gt.DEG2RAD),jt=new R,bn=2*Math.PI,yt={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},$d=1e-6,jh=class extends In{constructor(e,n=null){super(e,n),this.state=yt.NONE,this.target=new R,this.cursor=new R,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.keyRotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:Ut.ROTATE,MIDDLE:Ut.DOLLY,RIGHT:Ut.PAN},this.touches={ONE:jn.ROTATE,TWO:jn.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._domElementKeyEvents=null,this._lastPosition=new R,this._lastQuaternion=new Ht,this._lastTargetPosition=new R,this._quat=new Ht().setFromUnitVectors(e.up,new R(0,1,0)),this._quatInverse=this._quat.clone().invert(),this._spherical=new Bs,this._sphericalDelta=new Bs,this._scale=1,this._panOffset=new R,this._rotateStart=new ie,this._rotateEnd=new ie,this._rotateDelta=new ie,this._panStart=new ie,this._panEnd=new ie,this._panDelta=new ie,this._dollyStart=new ie,this._dollyEnd=new ie,this._dollyDelta=new ie,this._dollyDirection=new R,this._mouse=new ie,this._performCursorZoom=!1,this._pointers=[],this._pointerPositions={},this._controlActive=!1,this._onPointerMove=ZC.bind(this),this._onPointerDown=YC.bind(this),this._onPointerUp=KC.bind(this),this._onContextMenu=rR.bind(this),this._onMouseWheel=eR.bind(this),this._onKeyDown=tR.bind(this),this._onTouchStart=nR.bind(this),this._onTouchMove=iR.bind(this),this._onMouseDown=JC.bind(this),this._onMouseMove=QC.bind(this),this._interceptControlDown=sR.bind(this),this._interceptControlUp=oR.bind(this),this.domElement!==null&&this.connect(this.domElement),this.update()}connect(e){super.connect(e),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerUp),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.addEventListener("wheel",this._onMouseWheel,{passive:!1}),this.domElement.getRootNode().addEventListener("keydown",this._interceptControlDown,{passive:!0,capture:!0}),this.domElement.style.touchAction="none"}disconnect(){this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.removeEventListener("pointermove",this._onPointerMove),this.domElement.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerUp),this.domElement.removeEventListener("wheel",this._onMouseWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.stopListenToKeyEvents(),this.domElement.getRootNode().removeEventListener("keydown",this._interceptControlDown,{capture:!0}),this.domElement.style.touchAction="auto"}dispose(){this.disconnect()}getPolarAngle(){return this._spherical.phi}getAzimuthalAngle(){return this._spherical.theta}getDistance(){return this.object.position.distanceTo(this.target)}listenToKeyEvents(e){e.addEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=e}stopListenToKeyEvents(){this._domElementKeyEvents!==null&&(this._domElementKeyEvents.removeEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=null)}saveState(){this.target0.copy(this.target),this.position0.copy(this.object.position),this.zoom0=this.object.zoom}reset(){this.target.copy(this.target0),this.object.position.copy(this.position0),this.object.zoom=this.zoom0,this.object.updateProjectionMatrix(),this.dispatchEvent(Hv),this.update(),this.state=yt.NONE}update(e=null){let n=this.object.position;jt.copy(n).sub(this.target),jt.applyQuaternion(this._quat),this._spherical.setFromVector3(jt),this.autoRotate&&this.state===yt.NONE&&this._rotateLeft(this._getAutoRotationAngle(e)),this.enableDamping?(this._spherical.theta+=this._sphericalDelta.theta*this.dampingFactor,this._spherical.phi+=this._sphericalDelta.phi*this.dampingFactor):(this._spherical.theta+=this._sphericalDelta.theta,this._spherical.phi+=this._sphericalDelta.phi);let i=this.minAzimuthAngle,r=this.maxAzimuthAngle;isFinite(i)&&isFinite(r)&&(i<-Math.PI?i+=bn:i>Math.PI&&(i-=bn),r<-Math.PI?r+=bn:r>Math.PI&&(r-=bn),i<=r?this._spherical.theta=Math.max(i,Math.min(r,this._spherical.theta)):this._spherical.theta=this._spherical.theta>(i+r)/2?Math.max(i,this._spherical.theta):Math.min(r,this._spherical.theta)),this._spherical.phi=Math.max(this.minPolarAngle,Math.min(this.maxPolarAngle,this._spherical.phi)),this._spherical.makeSafe(),this.enableDamping===!0?this.target.addScaledVector(this._panOffset,this.dampingFactor):this.target.add(this._panOffset),this.target.sub(this.cursor),this.target.clampLength(this.minTargetRadius,this.maxTargetRadius),this.target.add(this.cursor);let s=!1;if(this.zoomToCursor&&this._performCursorZoom||this.object.isOrthographicCamera)this._spherical.radius=this._clampDistance(this._spherical.radius);else{let o=this._spherical.radius;this._spherical.radius=this._clampDistance(this._spherical.radius*this._scale),s=o!=this._spherical.radius}if(jt.setFromSpherical(this._spherical),jt.applyQuaternion(this._quatInverse),n.copy(this.target).add(jt),this.object.lookAt(this.target),this.enableDamping===!0?(this._sphericalDelta.theta*=1-this.dampingFactor,this._sphericalDelta.phi*=1-this.dampingFactor,this._panOffset.multiplyScalar(1-this.dampingFactor)):(this._sphericalDelta.set(0,0,0),this._panOffset.set(0,0,0)),this.zoomToCursor&&this._performCursorZoom){let o=null;if(this.object.isPerspectiveCamera){let a=jt.length();o=this._clampDistance(a*this._scale);let c=a-o;this.object.position.addScaledVector(this._dollyDirection,c),this.object.updateMatrixWorld(),s=!!c}else if(this.object.isOrthographicCamera){let a=new R(this._mouse.x,this._mouse.y,0);a.unproject(this.object);let c=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),this.object.updateProjectionMatrix(),s=c!==this.object.zoom;let l=new R(this._mouse.x,this._mouse.y,0);l.unproject(this.object),this.object.position.sub(l).add(a),this.object.updateMatrixWorld(),o=jt.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),this.zoomToCursor=!1;o!==null&&(this.screenSpacePanning?this.target.set(0,0,-1).transformDirection(this.object.matrix).multiplyScalar(o).add(this.object.position):(Wh.origin.copy(this.object.position),Wh.direction.set(0,0,-1).transformDirection(this.object.matrix),Math.abs(this.object.up.dot(Wh.direction))<$C?this.object.lookAt(this.target):(Gv.setFromNormalAndCoplanarPoint(this.object.up,this.target),Wh.intersectPlane(Gv,this.target))))}else if(this.object.isOrthographicCamera){let o=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),o!==this.object.zoom&&(this.object.updateProjectionMatrix(),s=!0)}return this._scale=1,this._performCursorZoom=!1,s||this._lastPosition.distanceToSquared(this.object.position)>$d||8*(1-this._lastQuaternion.dot(this.object.quaternion))>$d||this._lastTargetPosition.distanceToSquared(this.target)>$d?(this.dispatchEvent(Hv),this._lastPosition.copy(this.object.position),this._lastQuaternion.copy(this.object.quaternion),this._lastTargetPosition.copy(this.target),!0):!1}_getAutoRotationAngle(e){return e!==null?bn/60*this.autoRotateSpeed*e:bn/60/60*this.autoRotateSpeed}_getZoomScale(e){let n=Math.abs(e*.01);return Math.pow(.95,this.zoomSpeed*n)}_rotateLeft(e){this._sphericalDelta.theta-=e}_rotateUp(e){this._sphericalDelta.phi-=e}_panLeft(e,n){jt.setFromMatrixColumn(n,0),jt.multiplyScalar(-e),this._panOffset.add(jt)}_panUp(e,n){this.screenSpacePanning===!0?jt.setFromMatrixColumn(n,1):(jt.setFromMatrixColumn(n,0),jt.crossVectors(this.object.up,jt)),jt.multiplyScalar(e),this._panOffset.add(jt)}_pan(e,n){let i=this.domElement;if(this.object.isPerspectiveCamera){let r=this.object.position;jt.copy(r).sub(this.target);let s=jt.length();s*=Math.tan(this.object.fov/2*Math.PI/180),this._panLeft(2*e*s/i.clientHeight,this.object.matrix),this._panUp(2*n*s/i.clientHeight,this.object.matrix)}else this.object.isOrthographicCamera?(this._panLeft(e*(this.object.right-this.object.left)/this.object.zoom/i.clientWidth,this.object.matrix),this._panUp(n*(this.object.top-this.object.bottom)/this.object.zoom/i.clientHeight,this.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),this.enablePan=!1)}_dollyOut(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale/=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_dollyIn(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale*=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_updateZoomParameters(e,n){if(!this.zoomToCursor)return;this._performCursorZoom=!0;let i=this.domElement.getBoundingClientRect(),r=e-i.left,s=n-i.top,o=i.width,a=i.height;this._mouse.x=r/o*2-1,this._mouse.y=-(s/a)*2+1,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()}_clampDistance(e){return Math.max(this.minDistance,Math.min(this.maxDistance,e))}_handleMouseDownRotate(e){this._rotateStart.set(e.clientX,e.clientY)}_handleMouseDownDolly(e){this._updateZoomParameters(e.clientX,e.clientX),this._dollyStart.set(e.clientX,e.clientY)}_handleMouseDownPan(e){this._panStart.set(e.clientX,e.clientY)}_handleMouseMoveRotate(e){this._rotateEnd.set(e.clientX,e.clientY),this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let n=this.domElement;this._rotateLeft(bn*this._rotateDelta.x/n.clientHeight),this._rotateUp(bn*this._rotateDelta.y/n.clientHeight),this._rotateStart.copy(this._rotateEnd),this.update()}_handleMouseMoveDolly(e){this._dollyEnd.set(e.clientX,e.clientY),this._dollyDelta.subVectors(this._dollyEnd,this._dollyStart),this._dollyDelta.y>0?this._dollyOut(this._getZoomScale(this._dollyDelta.y)):this._dollyDelta.y<0&&this._dollyIn(this._getZoomScale(this._dollyDelta.y)),this._dollyStart.copy(this._dollyEnd),this.update()}_handleMouseMovePan(e){this._panEnd.set(e.clientX,e.clientY),this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd),this.update()}_handleMouseWheel(e){this._updateZoomParameters(e.clientX,e.clientY),e.deltaY<0?this._dollyIn(this._getZoomScale(e.deltaY)):e.deltaY>0&&this._dollyOut(this._getZoomScale(e.deltaY)),this.update()}_handleKeyDown(e){let n=!1;switch(e.code){case this.keys.UP:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateUp(bn*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,this.keyPanSpeed),n=!0;break;case this.keys.BOTTOM:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateUp(-bn*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,-this.keyPanSpeed),n=!0;break;case this.keys.LEFT:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateLeft(bn*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(this.keyPanSpeed,0),n=!0;break;case this.keys.RIGHT:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateLeft(-bn*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(-this.keyPanSpeed,0),n=!0;break}n&&(e.preventDefault(),this.update())}_handleTouchStartRotate(e){if(this._pointers.length===1)this._rotateStart.set(e.pageX,e.pageY);else{let n=this._getSecondPointerPosition(e),i=.5*(e.pageX+n.x),r=.5*(e.pageY+n.y);this._rotateStart.set(i,r)}}_handleTouchStartPan(e){if(this._pointers.length===1)this._panStart.set(e.pageX,e.pageY);else{let n=this._getSecondPointerPosition(e),i=.5*(e.pageX+n.x),r=.5*(e.pageY+n.y);this._panStart.set(i,r)}}_handleTouchStartDolly(e){let n=this._getSecondPointerPosition(e),i=e.pageX-n.x,r=e.pageY-n.y,s=Math.sqrt(i*i+r*r);this._dollyStart.set(0,s)}_handleTouchStartDollyPan(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enablePan&&this._handleTouchStartPan(e)}_handleTouchStartDollyRotate(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enableRotate&&this._handleTouchStartRotate(e)}_handleTouchMoveRotate(e){if(this._pointers.length==1)this._rotateEnd.set(e.pageX,e.pageY);else{let i=this._getSecondPointerPosition(e),r=.5*(e.pageX+i.x),s=.5*(e.pageY+i.y);this._rotateEnd.set(r,s)}this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let n=this.domElement;this._rotateLeft(bn*this._rotateDelta.x/n.clientHeight),this._rotateUp(bn*this._rotateDelta.y/n.clientHeight),this._rotateStart.copy(this._rotateEnd)}_handleTouchMovePan(e){if(this._pointers.length===1)this._panEnd.set(e.pageX,e.pageY);else{let n=this._getSecondPointerPosition(e),i=.5*(e.pageX+n.x),r=.5*(e.pageY+n.y);this._panEnd.set(i,r)}this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd)}_handleTouchMoveDolly(e){let n=this._getSecondPointerPosition(e),i=e.pageX-n.x,r=e.pageY-n.y,s=Math.sqrt(i*i+r*r);this._dollyEnd.set(0,s),this._dollyDelta.set(0,Math.pow(this._dollyEnd.y/this._dollyStart.y,this.zoomSpeed)),this._dollyOut(this._dollyDelta.y),this._dollyStart.copy(this._dollyEnd);let o=(e.pageX+n.x)*.5,a=(e.pageY+n.y)*.5;this._updateZoomParameters(o,a)}_handleTouchMoveDollyPan(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enablePan&&this._handleTouchMovePan(e)}_handleTouchMoveDollyRotate(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enableRotate&&this._handleTouchMoveRotate(e)}_addPointer(e){this._pointers.push(e.pointerId)}_removePointer(e){delete this._pointerPositions[e.pointerId];for(let n=0;n<this._pointers.length;n++)if(this._pointers[n]==e.pointerId){this._pointers.splice(n,1);return}}_isTrackingPointer(e){for(let n=0;n<this._pointers.length;n++)if(this._pointers[n]==e.pointerId)return!0;return!1}_trackPointer(e){let n=this._pointerPositions[e.pointerId];n===void 0&&(n=new ie,this._pointerPositions[e.pointerId]=n),n.set(e.pageX,e.pageY)}_getSecondPointerPosition(e){let n=e.pointerId===this._pointers[0]?this._pointers[1]:this._pointers[0];return this._pointerPositions[n]}_customWheelEvent(e){let n=e.deltaMode,i={clientX:e.clientX,clientY:e.clientY,deltaY:e.deltaY};switch(n){case 1:i.deltaY*=16;break;case 2:i.deltaY*=100;break}return e.ctrlKey&&!this._controlActive&&(i.deltaY*=10),i}};function YC(t){this.enabled!==!1&&(this._pointers.length===0&&(this.domElement.setPointerCapture(t.pointerId),this.domElement.addEventListener("pointermove",this._onPointerMove),this.domElement.addEventListener("pointerup",this._onPointerUp)),!this._isTrackingPointer(t)&&(this._addPointer(t),t.pointerType==="touch"?this._onTouchStart(t):this._onMouseDown(t)))}function ZC(t){this.enabled!==!1&&(t.pointerType==="touch"?this._onTouchMove(t):this._onMouseMove(t))}function KC(t){switch(this._removePointer(t),this._pointers.length){case 0:this.domElement.releasePointerCapture(t.pointerId),this.domElement.removeEventListener("pointermove",this._onPointerMove),this.domElement.removeEventListener("pointerup",this._onPointerUp),this.dispatchEvent(Wv),this.state=yt.NONE;break;case 1:let e=this._pointers[0],n=this._pointerPositions[e];this._onTouchStart({pointerId:e,pageX:n.x,pageY:n.y});break}}function JC(t){let e;switch(t.button){case 0:e=this.mouseButtons.LEFT;break;case 1:e=this.mouseButtons.MIDDLE;break;case 2:e=this.mouseButtons.RIGHT;break;default:e=-1}switch(e){case Ut.DOLLY:if(this.enableZoom===!1)return;this._handleMouseDownDolly(t),this.state=yt.DOLLY;break;case Ut.ROTATE:if(t.ctrlKey||t.metaKey||t.shiftKey){if(this.enablePan===!1)return;this._handleMouseDownPan(t),this.state=yt.PAN}else{if(this.enableRotate===!1)return;this._handleMouseDownRotate(t),this.state=yt.ROTATE}break;case Ut.PAN:if(t.ctrlKey||t.metaKey||t.shiftKey){if(this.enableRotate===!1)return;this._handleMouseDownRotate(t),this.state=yt.ROTATE}else{if(this.enablePan===!1)return;this._handleMouseDownPan(t),this.state=yt.PAN}break;default:this.state=yt.NONE}this.state!==yt.NONE&&this.dispatchEvent(Yd)}function QC(t){switch(this.state){case yt.ROTATE:if(this.enableRotate===!1)return;this._handleMouseMoveRotate(t);break;case yt.DOLLY:if(this.enableZoom===!1)return;this._handleMouseMoveDolly(t);break;case yt.PAN:if(this.enablePan===!1)return;this._handleMouseMovePan(t);break}}function eR(t){this.enabled===!1||this.enableZoom===!1||this.state!==yt.NONE||(t.preventDefault(),this.dispatchEvent(Yd),this._handleMouseWheel(this._customWheelEvent(t)),this.dispatchEvent(Wv))}function tR(t){this.enabled!==!1&&this._handleKeyDown(t)}function nR(t){switch(this._trackPointer(t),this._pointers.length){case 1:switch(this.touches.ONE){case jn.ROTATE:if(this.enableRotate===!1)return;this._handleTouchStartRotate(t),this.state=yt.TOUCH_ROTATE;break;case jn.PAN:if(this.enablePan===!1)return;this._handleTouchStartPan(t),this.state=yt.TOUCH_PAN;break;default:this.state=yt.NONE}break;case 2:switch(this.touches.TWO){case jn.DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchStartDollyPan(t),this.state=yt.TOUCH_DOLLY_PAN;break;case jn.DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchStartDollyRotate(t),this.state=yt.TOUCH_DOLLY_ROTATE;break;default:this.state=yt.NONE}break;default:this.state=yt.NONE}this.state!==yt.NONE&&this.dispatchEvent(Yd)}function iR(t){switch(this._trackPointer(t),this.state){case yt.TOUCH_ROTATE:if(this.enableRotate===!1)return;this._handleTouchMoveRotate(t),this.update();break;case yt.TOUCH_PAN:if(this.enablePan===!1)return;this._handleTouchMovePan(t),this.update();break;case yt.TOUCH_DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchMoveDollyPan(t),this.update();break;case yt.TOUCH_DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchMoveDollyRotate(t),this.update();break;default:this.state=yt.NONE}}function rR(t){this.enabled!==!1&&t.preventDefault()}function sR(t){t.key==="Control"&&(this._controlActive=!0,this.domElement.getRootNode().addEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function oR(t){t.key==="Control"&&(this._controlActive=!1,this.domElement.getRootNode().removeEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}var aR={type:"change"},jv=1e-6,qv=new Ht,qh=class extends In{constructor(e,n=null){super(e,n),this.movementSpeed=1,this.rollSpeed=.005,this.dragToLook=!1,this.autoForward=!1,this._moveState={up:0,down:0,left:0,right:0,forward:0,back:0,pitchUp:0,pitchDown:0,yawLeft:0,yawRight:0,rollLeft:0,rollRight:0},this._moveVector=new R(0,0,0),this._rotationVector=new R(0,0,0),this._lastQuaternion=new Ht,this._lastPosition=new R,this._status=0,this._onKeyDown=cR.bind(this),this._onKeyUp=lR.bind(this),this._onPointerMove=uR.bind(this),this._onPointerDown=hR.bind(this),this._onPointerUp=fR.bind(this),this._onPointerCancel=dR.bind(this),this._onContextMenu=pR.bind(this),n!==null&&this.connect(n)}connect(e){super.connect(e),window.addEventListener("keydown",this._onKeyDown),window.addEventListener("keyup",this._onKeyUp),this.domElement.addEventListener("pointermove",this._onPointerMove),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointerup",this._onPointerUp),this.domElement.addEventListener("pointercancel",this._onPointerCancel),this.domElement.addEventListener("contextmenu",this._onContextMenu)}disconnect(){window.removeEventListener("keydown",this._onKeyDown),window.removeEventListener("keyup",this._onKeyUp),this.domElement.removeEventListener("pointermove",this._onPointerMove),this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerCancel),this.domElement.removeEventListener("contextmenu",this._onContextMenu)}dispose(){this.disconnect()}update(e){if(this.enabled===!1)return;let n=this.object,i=e*this.movementSpeed,r=e*this.rollSpeed;n.translateX(this._moveVector.x*i),n.translateY(this._moveVector.y*i),n.translateZ(this._moveVector.z*i),qv.set(this._rotationVector.x*r,this._rotationVector.y*r,this._rotationVector.z*r,1).normalize(),n.quaternion.multiply(qv),(this._lastPosition.distanceToSquared(n.position)>jv||8*(1-this._lastQuaternion.dot(n.quaternion))>jv)&&(this.dispatchEvent(aR),this._lastQuaternion.copy(n.quaternion),this._lastPosition.copy(n.position))}_updateMovementVector(){let e=this._moveState.forward||this.autoForward&&!this._moveState.back?1:0;this._moveVector.x=-this._moveState.left+this._moveState.right,this._moveVector.y=-this._moveState.down+this._moveState.up,this._moveVector.z=-e+this._moveState.back}_updateRotationVector(){this._rotationVector.x=-this._moveState.pitchDown+this._moveState.pitchUp,this._rotationVector.y=-this._moveState.yawRight+this._moveState.yawLeft,this._rotationVector.z=-this._moveState.rollRight+this._moveState.rollLeft}_getContainerDimensions(){return this.domElement!=document?{size:[this.domElement.offsetWidth,this.domElement.offsetHeight],offset:[this.domElement.offsetLeft,this.domElement.offsetTop]}:{size:[window.innerWidth,window.innerHeight],offset:[0,0]}}};function cR(t){if(!(t.altKey||this.enabled===!1)){switch(t.code){case"ShiftLeft":case"ShiftRight":this.movementSpeedMultiplier=.1;break;case"KeyW":this._moveState.forward=1;break;case"KeyS":this._moveState.back=1;break;case"KeyA":this._moveState.left=1;break;case"KeyD":this._moveState.right=1;break;case"KeyR":this._moveState.up=1;break;case"KeyF":this._moveState.down=1;break;case"ArrowUp":this._moveState.pitchUp=1;break;case"ArrowDown":this._moveState.pitchDown=1;break;case"ArrowLeft":this._moveState.yawLeft=1;break;case"ArrowRight":this._moveState.yawRight=1;break;case"KeyQ":this._moveState.rollLeft=1;break;case"KeyE":this._moveState.rollRight=1;break}this._updateMovementVector(),this._updateRotationVector()}}function lR(t){if(this.enabled!==!1){switch(t.code){case"ShiftLeft":case"ShiftRight":this.movementSpeedMultiplier=1;break;case"KeyW":this._moveState.forward=0;break;case"KeyS":this._moveState.back=0;break;case"KeyA":this._moveState.left=0;break;case"KeyD":this._moveState.right=0;break;case"KeyR":this._moveState.up=0;break;case"KeyF":this._moveState.down=0;break;case"ArrowUp":this._moveState.pitchUp=0;break;case"ArrowDown":this._moveState.pitchDown=0;break;case"ArrowLeft":this._moveState.yawLeft=0;break;case"ArrowRight":this._moveState.yawRight=0;break;case"KeyQ":this._moveState.rollLeft=0;break;case"KeyE":this._moveState.rollRight=0;break}this._updateMovementVector(),this._updateRotationVector()}}function hR(t){if(this.enabled!==!1)if(this.dragToLook)this._status++;else{switch(t.button){case 0:this._moveState.forward=1;break;case 2:this._moveState.back=1;break}this._updateMovementVector()}}function uR(t){if(this.enabled!==!1&&(!this.dragToLook||this._status>0)){let e=this._getContainerDimensions(),n=e.size[0]/2,i=e.size[1]/2;this._moveState.yawLeft=-(t.pageX-e.offset[0]-n)/n,this._moveState.pitchDown=(t.pageY-e.offset[1]-i)/i,this._updateRotationVector()}}function fR(t){if(this.enabled!==!1){if(this.dragToLook)this._status--,this._moveState.yawLeft=this._moveState.pitchDown=0;else{switch(t.button){case 0:this._moveState.forward=0;break;case 2:this._moveState.back=0;break}this._updateMovementVector()}this._updateRotationVector()}}function dR(){this.enabled!==!1&&(this.dragToLook?(this._status=0,this._moveState.yawLeft=this._moveState.pitchDown=0):(this._moveState.forward=0,this._moveState.back=0,this._updateMovementVector()),this._updateRotationVector())}function pR(t){this.enabled!==!1&&t.preventDefault()}var lo={name:"CopyShader",uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

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


		}`};var On=class{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error("THREE.Pass: .render() must be implemented in derived pass.")}dispose(){}},mR=new Ur(-1,1,1,-1,0,1),Zd=class extends Mt{constructor(){super(),this.setAttribute("position",new ht([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new ht([0,2,0,0,2,0],2))}},gR=new Zd,gr=class{constructor(e){this._mesh=new Ct(gR,e)}dispose(){this._mesh.geometry.dispose()}render(e){e.render(this._mesh,mR)}get material(){return this._mesh.material}set material(e){this._mesh.material=e}};var Xh=class extends On{constructor(e,n="tDiffuse"){super(),this.textureID=n,this.uniforms=null,this.material=null,e instanceof Bt?(this.uniforms=e.uniforms,this.material=e):e&&(this.uniforms=Gi.clone(e.uniforms),this.material=new Bt({name:e.name!==void 0?e.name:"unspecified",defines:Object.assign({},e.defines),uniforms:this.uniforms,vertexShader:e.vertexShader,fragmentShader:e.fragmentShader})),this._fsQuad=new gr(this.material)}render(e,n,i){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=i.texture),this._fsQuad.material=this.material,this.renderToScreen?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(n),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this._fsQuad.render(e))}dispose(){this.material.dispose(),this._fsQuad.dispose()}};var La=class extends On{constructor(e,n){super(),this.scene=e,this.camera=n,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(e,n,i){let r=e.getContext(),s=e.state;s.buffers.color.setMask(!1),s.buffers.depth.setMask(!1),s.buffers.color.setLocked(!0),s.buffers.depth.setLocked(!0);let o,a;this.inverse?(o=0,a=1):(o=1,a=0),s.buffers.stencil.setTest(!0),s.buffers.stencil.setOp(r.REPLACE,r.REPLACE,r.REPLACE),s.buffers.stencil.setFunc(r.ALWAYS,o,4294967295),s.buffers.stencil.setClear(a),s.buffers.stencil.setLocked(!0),e.setRenderTarget(i),this.clear&&e.clear(),e.render(this.scene,this.camera),e.setRenderTarget(n),this.clear&&e.clear(),e.render(this.scene,this.camera),s.buffers.color.setLocked(!1),s.buffers.depth.setLocked(!1),s.buffers.color.setMask(!0),s.buffers.depth.setMask(!0),s.buffers.stencil.setLocked(!1),s.buffers.stencil.setFunc(r.EQUAL,1,4294967295),s.buffers.stencil.setOp(r.KEEP,r.KEEP,r.KEEP),s.buffers.stencil.setLocked(!0)}},$h=class extends On{constructor(){super(),this.needsSwap=!1}render(e){e.state.buffers.stencil.setLocked(!1),e.state.buffers.stencil.setTest(!1)}};var Yh=class{constructor(e,n){if(this.renderer=e,this._pixelRatio=e.getPixelRatio(),n===void 0){let i=e.getSize(new ie);this._width=i.width,this._height=i.height,n=new rn(this._width*this._pixelRatio,this._height*this._pixelRatio,{type:qn}),n.texture.name="EffectComposer.rt1"}else this._width=n.width,this._height=n.height;this.renderTarget1=n,this.renderTarget2=n.clone(),this.renderTarget2.texture.name="EffectComposer.rt2",this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],this.copyPass=new Xh(lo),this.copyPass.material.blending=si,this.clock=new sa}swapBuffers(){let e=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=e}addPass(e){this.passes.push(e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(e,n){this.passes.splice(n,0,e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(e){let n=this.passes.indexOf(e);n!==-1&&this.passes.splice(n,1)}isLastEnabledPass(e){for(let n=e+1;n<this.passes.length;n++)if(this.passes[n].enabled)return!1;return!0}render(e){e===void 0&&(e=this.clock.getDelta());let n=this.renderer.getRenderTarget(),i=!1;for(let r=0,s=this.passes.length;r<s;r++){let o=this.passes[r];if(o.enabled!==!1){if(o.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(r),o.render(this.renderer,this.writeBuffer,this.readBuffer,e,i),o.needsSwap){if(i){let a=this.renderer.getContext(),c=this.renderer.state.buffers.stencil;c.setFunc(a.NOTEQUAL,1,4294967295),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,e),c.setFunc(a.EQUAL,1,4294967295)}this.swapBuffers()}La!==void 0&&(o instanceof La?i=!0:o instanceof $h&&(i=!1))}}this.renderer.setRenderTarget(n)}reset(e){if(e===void 0){let n=this.renderer.getSize(new ie);this._pixelRatio=this.renderer.getPixelRatio(),this._width=n.width,this._height=n.height,e=this.renderTarget1.clone(),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=e,this.renderTarget2=e.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(e,n){this._width=e,this._height=n;let i=this._width*this._pixelRatio,r=this._height*this._pixelRatio;this.renderTarget1.setSize(i,r),this.renderTarget2.setSize(i,r);for(let s=0;s<this.passes.length;s++)this.passes[s].setSize(i,r)}setPixelRatio(e){this._pixelRatio=e,this.setSize(this._width,this._height)}dispose(){this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.copyPass.dispose()}};var Zh=class extends On{constructor(e,n,i=null,r=null,s=null){super(),this.scene=e,this.camera=n,this.overrideMaterial=i,this.clearColor=r,this.clearAlpha=s,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this._oldClearColor=new Fe}render(e,n,i){let r=e.autoClear;e.autoClear=!1;let s,o;this.overrideMaterial!==null&&(o=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),this.clearColor!==null&&(e.getClearColor(this._oldClearColor),e.setClearColor(this.clearColor,e.getClearAlpha())),this.clearAlpha!==null&&(s=e.getClearAlpha(),e.setClearAlpha(this.clearAlpha)),this.clearDepth==!0&&e.clearDepth(),e.setRenderTarget(this.renderToScreen?null:i),this.clear===!0&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),e.render(this.scene,this.camera),this.clearColor!==null&&e.setClearColor(this._oldClearColor),this.clearAlpha!==null&&e.setClearAlpha(s),this.overrideMaterial!==null&&(this.scene.overrideMaterial=o),e.autoClear=r}};function dn(){return dn=Object.assign?Object.assign.bind():function(t){for(var e=1;e<arguments.length;e++){var n=arguments[e];for(var i in n)({}).hasOwnProperty.call(n,i)&&(t[i]=n[i])}return t},dn.apply(null,arguments)}function Xv(t){if(t===void 0)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return t}function _r(t,e){return _r=Object.setPrototypeOf?Object.setPrototypeOf.bind():function(n,i){return n.__proto__=i,n},_r(t,e)}function $v(t,e){t.prototype=Object.create(e.prototype),t.prototype.constructor=t,_r(t,e)}function Kh(t){return Kh=Object.setPrototypeOf?Object.getPrototypeOf.bind():function(e){return e.__proto__||Object.getPrototypeOf(e)},Kh(t)}function Yv(t){try{return Function.toString.call(t).indexOf("[native code]")!==-1}catch(e){return typeof t=="function"}}function Kd(){try{var t=!Boolean.prototype.valueOf.call(Reflect.construct(Boolean,[],function(){}))}catch(e){}return(Kd=function(){return!!t})()}function Zv(t,e,n){if(Kd())return Reflect.construct.apply(null,arguments);var i=[null];i.push.apply(i,e);var r=new(t.bind.apply(t,i));return n&&_r(r,n.prototype),r}function Jh(t){var e=typeof Map=="function"?new Map:void 0;return Jh=function(i){if(i===null||!Yv(i))return i;if(typeof i!="function")throw new TypeError("Super expression must either be null or a function");if(e!==void 0){if(e.has(i))return e.get(i);e.set(i,r)}function r(){return Zv(i,arguments,Kh(this).constructor)}return r.prototype=Object.create(i.prototype,{constructor:{value:r,enumerable:!1,writable:!0,configurable:!0}}),_r(r,i)},Jh(t)}var Mn=(function(t){$v(e,t);function e(n){var i;if(1)i=t.call(this,"An error occurred. See https://github.com/styled-components/polished/blob/main/src/internalHelpers/errors.md#"+n+" for more information.")||this;else for(var r,s,o;o<r;o++);return Xv(i)}return e})(Jh(Error));function Kv(t,e){return t.substr(-e.length)===e}var _R=/^([+-]?(?:\d+|\d*\.\d+))([a-z]*|%)$/;function Jv(t){if(typeof t!="string")return t;var e=t.match(_R);return e?parseFloat(t):t}var vR=function(e){return function(n,i){i===void 0&&(i="16px");var r=n,s=i;if(typeof n=="string"){if(!Kv(n,"px"))throw new Mn(69,e,n);r=Jv(n)}if(typeof i=="string"){if(!Kv(i,"px"))throw new Mn(70,e,i);s=Jv(i)}if(typeof r=="string")throw new Mn(71,n,e);if(typeof s=="string")throw new Mn(72,i,e);return""+r/s+e}},ey=vR,fz=ey("em");var dz=ey("rem");function Jd(t){return Math.round(t*255)}function yR(t,e,n){return Jd(t)+","+Jd(e)+","+Jd(n)}function Oa(t,e,n,i){if(i===void 0&&(i=yR),e===0)return i(n,n,n);var r=(t%360+360)%360/60,s=(1-Math.abs(2*n-1))*e,o=s*(1-Math.abs(r%2-1)),a=0,c=0,l=0;r>=0&&r<1?(a=s,c=o):r>=1&&r<2?(a=o,c=s):r>=2&&r<3?(c=s,l=o):r>=3&&r<4?(c=o,l=s):r>=4&&r<5?(a=o,l=s):r>=5&&r<6&&(a=s,l=o);var u=n-s/2,h=a+u,f=c+u,d=l+u;return i(h,f,d)}var Qv={aliceblue:"f0f8ff",antiquewhite:"faebd7",aqua:"00ffff",aquamarine:"7fffd4",azure:"f0ffff",beige:"f5f5dc",bisque:"ffe4c4",black:"000",blanchedalmond:"ffebcd",blue:"0000ff",blueviolet:"8a2be2",brown:"a52a2a",burlywood:"deb887",cadetblue:"5f9ea0",chartreuse:"7fff00",chocolate:"d2691e",coral:"ff7f50",cornflowerblue:"6495ed",cornsilk:"fff8dc",crimson:"dc143c",cyan:"00ffff",darkblue:"00008b",darkcyan:"008b8b",darkgoldenrod:"b8860b",darkgray:"a9a9a9",darkgreen:"006400",darkgrey:"a9a9a9",darkkhaki:"bdb76b",darkmagenta:"8b008b",darkolivegreen:"556b2f",darkorange:"ff8c00",darkorchid:"9932cc",darkred:"8b0000",darksalmon:"e9967a",darkseagreen:"8fbc8f",darkslateblue:"483d8b",darkslategray:"2f4f4f",darkslategrey:"2f4f4f",darkturquoise:"00ced1",darkviolet:"9400d3",deeppink:"ff1493",deepskyblue:"00bfff",dimgray:"696969",dimgrey:"696969",dodgerblue:"1e90ff",firebrick:"b22222",floralwhite:"fffaf0",forestgreen:"228b22",fuchsia:"ff00ff",gainsboro:"dcdcdc",ghostwhite:"f8f8ff",gold:"ffd700",goldenrod:"daa520",gray:"808080",green:"008000",greenyellow:"adff2f",grey:"808080",honeydew:"f0fff0",hotpink:"ff69b4",indianred:"cd5c5c",indigo:"4b0082",ivory:"fffff0",khaki:"f0e68c",lavender:"e6e6fa",lavenderblush:"fff0f5",lawngreen:"7cfc00",lemonchiffon:"fffacd",lightblue:"add8e6",lightcoral:"f08080",lightcyan:"e0ffff",lightgoldenrodyellow:"fafad2",lightgray:"d3d3d3",lightgreen:"90ee90",lightgrey:"d3d3d3",lightpink:"ffb6c1",lightsalmon:"ffa07a",lightseagreen:"20b2aa",lightskyblue:"87cefa",lightslategray:"789",lightslategrey:"789",lightsteelblue:"b0c4de",lightyellow:"ffffe0",lime:"0f0",limegreen:"32cd32",linen:"faf0e6",magenta:"f0f",maroon:"800000",mediumaquamarine:"66cdaa",mediumblue:"0000cd",mediumorchid:"ba55d3",mediumpurple:"9370db",mediumseagreen:"3cb371",mediumslateblue:"7b68ee",mediumspringgreen:"00fa9a",mediumturquoise:"48d1cc",mediumvioletred:"c71585",midnightblue:"191970",mintcream:"f5fffa",mistyrose:"ffe4e1",moccasin:"ffe4b5",navajowhite:"ffdead",navy:"000080",oldlace:"fdf5e6",olive:"808000",olivedrab:"6b8e23",orange:"ffa500",orangered:"ff4500",orchid:"da70d6",palegoldenrod:"eee8aa",palegreen:"98fb98",paleturquoise:"afeeee",palevioletred:"db7093",papayawhip:"ffefd5",peachpuff:"ffdab9",peru:"cd853f",pink:"ffc0cb",plum:"dda0dd",powderblue:"b0e0e6",purple:"800080",rebeccapurple:"639",red:"f00",rosybrown:"bc8f8f",royalblue:"4169e1",saddlebrown:"8b4513",salmon:"fa8072",sandybrown:"f4a460",seagreen:"2e8b57",seashell:"fff5ee",sienna:"a0522d",silver:"c0c0c0",skyblue:"87ceeb",slateblue:"6a5acd",slategray:"708090",slategrey:"708090",snow:"fffafa",springgreen:"00ff7f",steelblue:"4682b4",tan:"d2b48c",teal:"008080",thistle:"d8bfd8",tomato:"ff6347",turquoise:"40e0d0",violet:"ee82ee",wheat:"f5deb3",white:"fff",whitesmoke:"f5f5f5",yellow:"ff0",yellowgreen:"9acd32"};function xR(t){if(typeof t!="string")return t;var e=t.toLowerCase();return Qv[e]?"#"+Qv[e]:t}var bR=/^#[a-fA-F0-9]{6}$/,MR=/^#[a-fA-F0-9]{8}$/,SR=/^#[a-fA-F0-9]{3}$/,wR=/^#[a-fA-F0-9]{4}$/,Qd=/^rgb\(\s*(\d{1,3})\s*(?:,)?\s*(\d{1,3})\s*(?:,)?\s*(\d{1,3})\s*\)$/i,ER=/^rgb(?:a)?\(\s*(\d{1,3})\s*(?:,)?\s*(\d{1,3})\s*(?:,)?\s*(\d{1,3})\s*(?:,|\/)\s*([-+]?\d*[.]?\d+[%]?)\s*\)$/i,TR=/^hsl\(\s*(\d{0,3}[.]?[0-9]+(?:deg)?)\s*(?:,)?\s*(\d{1,3}[.]?[0-9]?)%\s*(?:,)?\s*(\d{1,3}[.]?[0-9]?)%\s*\)$/i,AR=/^hsl(?:a)?\(\s*(\d{0,3}[.]?[0-9]+(?:deg)?)\s*(?:,)?\s*(\d{1,3}[.]?[0-9]?)%\s*(?:,)?\s*(\d{1,3}[.]?[0-9]?)%\s*(?:,|\/)\s*([-+]?\d*[.]?\d+[%]?)\s*\)$/i;function vr(t){if(typeof t!="string")throw new Mn(3);var e=xR(t);if(e.match(bR))return{red:parseInt(""+e[1]+e[2],16),green:parseInt(""+e[3]+e[4],16),blue:parseInt(""+e[5]+e[6],16)};if(e.match(MR)){var n=parseFloat((parseInt(""+e[7]+e[8],16)/255).toFixed(2));return{red:parseInt(""+e[1]+e[2],16),green:parseInt(""+e[3]+e[4],16),blue:parseInt(""+e[5]+e[6],16),alpha:n}}if(e.match(SR))return{red:parseInt(""+e[1]+e[1],16),green:parseInt(""+e[2]+e[2],16),blue:parseInt(""+e[3]+e[3],16)};if(e.match(wR)){var i=parseFloat((parseInt(""+e[4]+e[4],16)/255).toFixed(2));return{red:parseInt(""+e[1]+e[1],16),green:parseInt(""+e[2]+e[2],16),blue:parseInt(""+e[3]+e[3],16),alpha:i}}var r=Qd.exec(e);if(r)return{red:parseInt(""+r[1],10),green:parseInt(""+r[2],10),blue:parseInt(""+r[3],10)};var s=ER.exec(e.substring(0,50));if(s)return{red:parseInt(""+s[1],10),green:parseInt(""+s[2],10),blue:parseInt(""+s[3],10),alpha:parseFloat(""+s[4])>1?parseFloat(""+s[4])/100:parseFloat(""+s[4])};var o=TR.exec(e);if(o){var a=parseInt(""+o[1],10),c=parseInt(""+o[2],10)/100,l=parseInt(""+o[3],10)/100,u="rgb("+Oa(a,c,l)+")",h=Qd.exec(u);if(!h)throw new Mn(4,e,u);return{red:parseInt(""+h[1],10),green:parseInt(""+h[2],10),blue:parseInt(""+h[3],10)}}var f=AR.exec(e.substring(0,50));if(f){var d=parseInt(""+f[1],10),m=parseInt(""+f[2],10)/100,_=parseInt(""+f[3],10)/100,g="rgb("+Oa(d,m,_)+")",p=Qd.exec(g);if(!p)throw new Mn(4,e,g);return{red:parseInt(""+p[1],10),green:parseInt(""+p[2],10),blue:parseInt(""+p[3],10),alpha:parseFloat(""+f[4])>1?parseFloat(""+f[4])/100:parseFloat(""+f[4])}}throw new Mn(5)}function CR(t){var e=t.red/255,n=t.green/255,i=t.blue/255,r=Math.max(e,n,i),s=Math.min(e,n,i),o=(r+s)/2;if(r===s)return t.alpha!==void 0?{hue:0,saturation:0,lightness:o,alpha:t.alpha}:{hue:0,saturation:0,lightness:o};var a,c=r-s,l=o>.5?c/(2-r-s):c/(r+s);switch(r){case e:a=(n-i)/c+(n<i?6:0);break;case n:a=(i-e)/c+2;break;default:a=(e-n)/c+4;break}return a*=60,t.alpha!==void 0?{hue:a,saturation:l,lightness:o,alpha:t.alpha}:{hue:a,saturation:l,lightness:o}}function yr(t){return CR(vr(t))}var RR=function(e){return e.length===7&&e[1]===e[2]&&e[3]===e[4]&&e[5]===e[6]?"#"+e[1]+e[3]+e[5]:e},tp=RR;function ts(t){var e=t.toString(16);return e.length===1?"0"+e:e}function ep(t){return ts(Math.round(t*255))}function PR(t,e,n){return tp("#"+ep(t)+ep(e)+ep(n))}function Qh(t,e,n){return Oa(t,e,n,PR)}function IR(t,e,n){if(typeof t=="number"&&typeof e=="number"&&typeof n=="number")return Qh(t,e,n);if(typeof t=="object"&&e===void 0&&n===void 0)return Qh(t.hue,t.saturation,t.lightness);throw new Mn(1)}function DR(t,e,n,i){if(typeof t=="number"&&typeof e=="number"&&typeof n=="number"&&typeof i=="number")return i>=1?Qh(t,e,n):"rgba("+Oa(t,e,n)+","+i+")";if(typeof t=="object"&&e===void 0&&n===void 0&&i===void 0)return t.alpha>=1?Qh(t.hue,t.saturation,t.lightness):"rgba("+Oa(t.hue,t.saturation,t.lightness)+","+t.alpha+")";throw new Mn(2)}function np(t,e,n){if(typeof t=="number"&&typeof e=="number"&&typeof n=="number")return tp("#"+ts(t)+ts(e)+ts(n));if(typeof t=="object"&&e===void 0&&n===void 0)return tp("#"+ts(t.red)+ts(t.green)+ts(t.blue));throw new Mn(6)}function eu(t,e,n,i){if(typeof t=="string"&&typeof e=="number"){var r=vr(t);return"rgba("+r.red+","+r.green+","+r.blue+","+e+")"}else{if(typeof t=="number"&&typeof e=="number"&&typeof n=="number"&&typeof i=="number")return i>=1?np(t,e,n):"rgba("+t+","+e+","+n+","+i+")";if(typeof t=="object"&&e===void 0&&n===void 0&&i===void 0)return t.alpha>=1?np(t.red,t.green,t.blue):"rgba("+t.red+","+t.green+","+t.blue+","+t.alpha+")"}throw new Mn(7)}var LR=function(e){return typeof e.red=="number"&&typeof e.green=="number"&&typeof e.blue=="number"&&(typeof e.alpha!="number"||typeof e.alpha=="undefined")},OR=function(e){return typeof e.red=="number"&&typeof e.green=="number"&&typeof e.blue=="number"&&typeof e.alpha=="number"},NR=function(e){return typeof e.hue=="number"&&typeof e.saturation=="number"&&typeof e.lightness=="number"&&(typeof e.alpha!="number"||typeof e.alpha=="undefined")},FR=function(e){return typeof e.hue=="number"&&typeof e.saturation=="number"&&typeof e.lightness=="number"&&typeof e.alpha=="number"};function xr(t){if(typeof t!="object")throw new Mn(8);if(OR(t))return eu(t);if(LR(t))return np(t);if(FR(t))return DR(t);if(NR(t))return IR(t);throw new Mn(8)}function ty(t,e,n){return function(){var r=n.concat(Array.prototype.slice.call(arguments));return r.length>=e?t.apply(this,r):ty(t,e,r)}}function Nn(t){return ty(t,t.length,[])}function UR(t,e){if(e==="transparent")return e;var n=yr(e);return xr(dn({},n,{hue:n.hue+parseFloat(t)}))}var pz=Nn(UR);function ho(t,e,n){return Math.max(t,Math.min(e,n))}function zR(t,e){if(e==="transparent")return e;var n=yr(e);return xr(dn({},n,{lightness:ho(0,1,n.lightness-parseFloat(t))}))}var mz=Nn(zR);function kR(t,e){if(e==="transparent")return e;var n=yr(e);return xr(dn({},n,{saturation:ho(0,1,n.saturation-parseFloat(t))}))}var gz=Nn(kR);function BR(t,e){if(e==="transparent")return e;var n=yr(e);return xr(dn({},n,{lightness:ho(0,1,n.lightness+parseFloat(t))}))}var _z=Nn(BR);function VR(t,e,n){if(e==="transparent")return n;if(n==="transparent")return e;if(t===0)return n;var i=vr(e),r=dn({},i,{alpha:typeof i.alpha=="number"?i.alpha:1}),s=vr(n),o=dn({},s,{alpha:typeof s.alpha=="number"?s.alpha:1}),a=r.alpha-o.alpha,c=parseFloat(t)*2-1,l=c*a===-1?c:c+a,u=1+c*a,h=(l/u+1)/2,f=1-h,d={red:Math.floor(r.red*h+o.red*f),green:Math.floor(r.green*h+o.green*f),blue:Math.floor(r.blue*h+o.blue*f),alpha:r.alpha*parseFloat(t)+o.alpha*(1-parseFloat(t))};return eu(d)}var HR=Nn(VR),ny=HR;function GR(t,e){if(e==="transparent")return e;var n=vr(e),i=typeof n.alpha=="number"?n.alpha:1,r=dn({},n,{alpha:ho(0,1,(i*100+parseFloat(t)*100)/100)});return eu(r)}var WR=Nn(GR),iy=WR;function jR(t,e){if(e==="transparent")return e;var n=yr(e);return xr(dn({},n,{saturation:ho(0,1,n.saturation+parseFloat(t))}))}var vz=Nn(jR);function qR(t,e){return e==="transparent"?e:xr(dn({},yr(e),{hue:parseFloat(t)}))}var yz=Nn(qR);function XR(t,e){return e==="transparent"?e:xr(dn({},yr(e),{lightness:parseFloat(t)}))}var xz=Nn(XR);function $R(t,e){return e==="transparent"?e:xr(dn({},yr(e),{saturation:parseFloat(t)}))}var bz=Nn($R);function YR(t,e){return e==="transparent"?e:ny(parseFloat(t),"rgb(0, 0, 0)",e)}var Mz=Nn(YR);function ZR(t,e){return e==="transparent"?e:ny(parseFloat(t),"rgb(255, 255, 255)",e)}var Sz=Nn(ZR);function KR(t,e){if(e==="transparent")return e;var n=vr(e),i=typeof n.alpha=="number"?n.alpha:1,r=dn({},n,{alpha:ho(0,1,+(i*100-parseFloat(t)*100).toFixed(2)/100)});return eu(r)}var wz=Nn(KR);var br=Object.freeze({Linear:Object.freeze({None:function(t){return t},In:function(t){return t},Out:function(t){return t},InOut:function(t){return t}}),Quadratic:Object.freeze({In:function(t){return t*t},Out:function(t){return t*(2-t)},InOut:function(t){return(t*=2)<1?.5*t*t:-.5*(--t*(t-2)-1)}}),Cubic:Object.freeze({In:function(t){return t*t*t},Out:function(t){return--t*t*t+1},InOut:function(t){return(t*=2)<1?.5*t*t*t:.5*((t-=2)*t*t+2)}}),Quartic:Object.freeze({In:function(t){return t*t*t*t},Out:function(t){return 1- --t*t*t*t},InOut:function(t){return(t*=2)<1?.5*t*t*t*t:-.5*((t-=2)*t*t*t-2)}}),Quintic:Object.freeze({In:function(t){return t*t*t*t*t},Out:function(t){return--t*t*t*t*t+1},InOut:function(t){return(t*=2)<1?.5*t*t*t*t*t:.5*((t-=2)*t*t*t*t+2)}}),Sinusoidal:Object.freeze({In:function(t){return 1-Math.sin((1-t)*Math.PI/2)},Out:function(t){return Math.sin(t*Math.PI/2)},InOut:function(t){return .5*(1-Math.sin(Math.PI*(.5-t)))}}),Exponential:Object.freeze({In:function(t){return t===0?0:Math.pow(1024,t-1)},Out:function(t){return t===1?1:1-Math.pow(2,-10*t)},InOut:function(t){return t===0?0:t===1?1:(t*=2)<1?.5*Math.pow(1024,t-1):.5*(-Math.pow(2,-10*(t-1))+2)}}),Circular:Object.freeze({In:function(t){return 1-Math.sqrt(1-t*t)},Out:function(t){return Math.sqrt(1- --t*t)},InOut:function(t){return(t*=2)<1?-.5*(Math.sqrt(1-t*t)-1):.5*(Math.sqrt(1-(t-=2)*t)+1)}}),Elastic:Object.freeze({In:function(t){return t===0?0:t===1?1:-Math.pow(2,10*(t-1))*Math.sin((t-1.1)*5*Math.PI)},Out:function(t){return t===0?0:t===1?1:Math.pow(2,-10*t)*Math.sin((t-.1)*5*Math.PI)+1},InOut:function(t){return t===0?0:t===1?1:(t*=2,t<1?-.5*Math.pow(2,10*(t-1))*Math.sin((t-1.1)*5*Math.PI):.5*Math.pow(2,-10*(t-1))*Math.sin((t-1.1)*5*Math.PI)+1)}}),Back:Object.freeze({In:function(t){var e=1.70158;return t===1?1:t*t*((e+1)*t-e)},Out:function(t){var e=1.70158;return t===0?0:--t*t*((e+1)*t+e)+1},InOut:function(t){var e=2.5949095;return(t*=2)<1?.5*(t*t*((e+1)*t-e)):.5*((t-=2)*t*((e+1)*t+e)+2)}}),Bounce:Object.freeze({In:function(t){return 1-br.Bounce.Out(1-t)},Out:function(t){return t<.36363636363636365?7.5625*t*t:t<.7272727272727273?7.5625*(t-=.5454545454545454)*t+.75:t<.9090909090909091?7.5625*(t-=.8181818181818182)*t+.9375:7.5625*(t-=.9545454545454546)*t+.984375},InOut:function(t){return t<.5?br.Bounce.In(t*2)*.5:br.Bounce.Out(t*2-1)*.5+.5}}),generatePow:function(t){return t===void 0&&(t=4),t=t<Number.EPSILON?Number.EPSILON:t,t=t>1e4?1e4:t,{In:function(e){return Math.pow(e,t)},Out:function(e){return 1-Math.pow(1-e,t)},InOut:function(e){return e<.5?Math.pow(e*2,t)/2:(1-Math.pow(2-e*2,t))/2+.5}}}}),Na=function(){return performance.now()},rp=(function(){function t(){for(var e=[],n=0;n<arguments.length;n++)e[n]=arguments[n];this._tweens={},this._tweensAddedDuringUpdate={},this.add.apply(this,e)}return t.prototype.getAll=function(){var e=this;return Object.keys(this._tweens).map(function(n){return e._tweens[n]})},t.prototype.removeAll=function(){this._tweens={}},t.prototype.add=function(){for(var e,n=[],i=0;i<arguments.length;i++)n[i]=arguments[i];for(var r=0,s=n;r<s.length;r++){var o=s[r];(e=o._group)===null||e===void 0||e.remove(o),o._group=this,this._tweens[o.getId()]=o,this._tweensAddedDuringUpdate[o.getId()]=o}},t.prototype.remove=function(){for(var e=[],n=0;n<arguments.length;n++)e[n]=arguments[n];for(var i=0,r=e;i<r.length;i++){var s=r[i];s._group=void 0,delete this._tweens[s.getId()],delete this._tweensAddedDuringUpdate[s.getId()]}},t.prototype.allStopped=function(){return this.getAll().every(function(e){return!e.isPlaying()})},t.prototype.update=function(e,n){e===void 0&&(e=Na()),n===void 0&&(n=!0);var i=Object.keys(this._tweens);if(i.length!==0)for(;i.length>0;){this._tweensAddedDuringUpdate={};for(var r=0;r<i.length;r++){var s=this._tweens[i[r]],o=!n;s&&s.update(e,o)===!1&&!n&&this.remove(s)}i=Object.keys(this._tweensAddedDuringUpdate)}},t})(),uo={Linear:function(t,e){var n=t.length-1,i=n*e,r=Math.floor(i),s=uo.Utils.Linear;return e<0?s(t[0],t[1],i):e>1?s(t[n],t[n-1],n-i):s(t[r],t[r+1>n?n:r+1],i-r)},Bezier:function(t,e){for(var n=0,i=t.length-1,r=Math.pow,s=uo.Utils.Bernstein,o=0;o<=i;o++)n+=r(1-e,i-o)*r(e,o)*t[o]*s(i,o);return n},CatmullRom:function(t,e){var n=t.length-1,i=n*e,r=Math.floor(i),s=uo.Utils.CatmullRom;return t[0]===t[n]?(e<0&&(r=Math.floor(i=n*(1+e))),s(t[(r-1+n)%n],t[r],t[(r+1)%n],t[(r+2)%n],i-r)):e<0?t[0]-(s(t[0],t[0],t[1],t[1],-i)-t[0]):e>1?t[n]-(s(t[n],t[n],t[n-1],t[n-1],i-n)-t[n]):s(t[r?r-1:0],t[r],t[n<r+1?n:r+1],t[n<r+2?n:r+2],i-r)},Utils:{Linear:function(t,e,n){return(e-t)*n+t},Bernstein:function(t,e){var n=uo.Utils.Factorial;return n(t)/n(e)/n(t-e)},Factorial:(function(){var t=[1];return function(e){var n=1;if(t[e])return t[e];for(var i=e;i>1;i--)n*=i;return t[e]=n,n}})(),CatmullRom:function(t,e,n,i,r){var s=(n-t)*.5,o=(i-e)*.5,a=r*r,c=r*a;return(2*e-2*n+s+o)*c+(-3*e+3*n-2*s-o)*a+s*r+e}}},ry=(function(){function t(){}return t.nextId=function(){return t._nextId++},t._nextId=0,t})(),ip=new rp,sp=(function(){function t(e,n){this._isPaused=!1,this._pauseStart=0,this._valuesStart={},this._valuesEnd={},this._valuesStartRepeat={},this._duration=1e3,this._isDynamic=!1,this._initialRepeat=0,this._repeat=0,this._yoyo=!1,this._isPlaying=!1,this._reversed=!1,this._delayTime=0,this._startTime=0,this._easingFunction=br.Linear.None,this._interpolationFunction=uo.Linear,this._chainedTweens=[],this._onStartCallbackFired=!1,this._onEveryStartCallbackFired=!1,this._id=ry.nextId(),this._isChainStopped=!1,this._propertiesAreSetUp=!1,this._goToEnd=!1,this._object=e,typeof n=="object"?(this._group=n,n.add(this)):n===!0&&(this._group=ip,ip.add(this))}return t.prototype.getId=function(){return this._id},t.prototype.isPlaying=function(){return this._isPlaying},t.prototype.isPaused=function(){return this._isPaused},t.prototype.getDuration=function(){return this._duration},t.prototype.to=function(e,n){if(n===void 0&&(n=1e3),this._isPlaying)throw new Error("Can not call Tween.to() while Tween is already started or paused. Stop the Tween first.");return this._valuesEnd=e,this._propertiesAreSetUp=!1,this._duration=n<0?0:n,this},t.prototype.duration=function(e){return e===void 0&&(e=1e3),this._duration=e<0?0:e,this},t.prototype.dynamic=function(e){return e===void 0&&(e=!1),this._isDynamic=e,this},t.prototype.start=function(e,n){if(e===void 0&&(e=Na()),n===void 0&&(n=!1),this._isPlaying)return this;if(this._repeat=this._initialRepeat,this._reversed){this._reversed=!1;for(var i in this._valuesStartRepeat)this._swapEndStartRepeatValues(i),this._valuesStart[i]=this._valuesStartRepeat[i]}if(this._isPlaying=!0,this._isPaused=!1,this._onStartCallbackFired=!1,this._onEveryStartCallbackFired=!1,this._isChainStopped=!1,this._startTime=e,this._startTime+=this._delayTime,!this._propertiesAreSetUp||n){if(this._propertiesAreSetUp=!0,!this._isDynamic){var r={};for(var s in this._valuesEnd)r[s]=this._valuesEnd[s];this._valuesEnd=r}this._setupProperties(this._object,this._valuesStart,this._valuesEnd,this._valuesStartRepeat,n)}return this},t.prototype.startFromCurrentValues=function(e){return this.start(e,!0)},t.prototype._setupProperties=function(e,n,i,r,s){for(var o in i){var a=e[o],c=Array.isArray(a),l=c?"array":typeof a,u=!c&&Array.isArray(i[o]);if(!(l==="undefined"||l==="function")){if(u){var h=i[o];if(h.length===0)continue;for(var f=[a],d=0,m=h.length;d<m;d+=1){var _=this._handleRelativeValue(a,h[d]);if(isNaN(_)){u=!1,console.warn("Found invalid interpolation list. Skipping.");break}f.push(_)}u&&(i[o]=f)}if((l==="object"||c)&&a&&!u){n[o]=c?[]:{};var g=a;for(var p in g)n[o][p]=g[p];r[o]=c?[]:{};var h=i[o];if(!this._isDynamic){var x={};for(var p in h)x[p]=h[p];i[o]=h=x}this._setupProperties(g,n[o],h,r[o],s)}else(typeof n[o]=="undefined"||s)&&(n[o]=a),c||(n[o]*=1),u?r[o]=i[o].slice().reverse():r[o]=n[o]||0}}},t.prototype.stop=function(){return this._isChainStopped||(this._isChainStopped=!0,this.stopChainedTweens()),this._isPlaying?(this._isPlaying=!1,this._isPaused=!1,this._onStopCallback&&this._onStopCallback(this._object),this):this},t.prototype.end=function(){return this._goToEnd=!0,this.update(this._startTime+this._duration),this},t.prototype.pause=function(e){return e===void 0&&(e=Na()),this._isPaused||!this._isPlaying?this:(this._isPaused=!0,this._pauseStart=e,this)},t.prototype.resume=function(e){return e===void 0&&(e=Na()),!this._isPaused||!this._isPlaying?this:(this._isPaused=!1,this._startTime+=e-this._pauseStart,this._pauseStart=0,this)},t.prototype.stopChainedTweens=function(){for(var e=0,n=this._chainedTweens.length;e<n;e++)this._chainedTweens[e].stop();return this},t.prototype.group=function(e){return e?(e.add(this),this):(console.warn("tween.group() without args has been removed, use group.add(tween) instead."),this)},t.prototype.remove=function(){var e;return(e=this._group)===null||e===void 0||e.remove(this),this},t.prototype.delay=function(e){return e===void 0&&(e=0),this._delayTime=e,this},t.prototype.repeat=function(e){return e===void 0&&(e=0),this._initialRepeat=e,this._repeat=e,this},t.prototype.repeatDelay=function(e){return this._repeatDelayTime=e,this},t.prototype.yoyo=function(e){return e===void 0&&(e=!1),this._yoyo=e,this},t.prototype.easing=function(e){return e===void 0&&(e=br.Linear.None),this._easingFunction=e,this},t.prototype.interpolation=function(e){return e===void 0&&(e=uo.Linear),this._interpolationFunction=e,this},t.prototype.chain=function(){for(var e=[],n=0;n<arguments.length;n++)e[n]=arguments[n];return this._chainedTweens=e,this},t.prototype.onStart=function(e){return this._onStartCallback=e,this},t.prototype.onEveryStart=function(e){return this._onEveryStartCallback=e,this},t.prototype.onUpdate=function(e){return this._onUpdateCallback=e,this},t.prototype.onRepeat=function(e){return this._onRepeatCallback=e,this},t.prototype.onComplete=function(e){return this._onCompleteCallback=e,this},t.prototype.onStop=function(e){return this._onStopCallback=e,this},t.prototype.update=function(e,n){var i=this,r;if(e===void 0&&(e=Na()),n===void 0&&(n=t.autoStartOnUpdate),this._isPaused)return!0;var s;if(!this._goToEnd&&!this._isPlaying)if(n)this.start(e,!0);else return!1;if(this._goToEnd=!1,e<this._startTime)return!0;this._onStartCallbackFired===!1&&(this._onStartCallback&&this._onStartCallback(this._object),this._onStartCallbackFired=!0),this._onEveryStartCallbackFired===!1&&(this._onEveryStartCallback&&this._onEveryStartCallback(this._object),this._onEveryStartCallbackFired=!0);var o=e-this._startTime,a=this._duration+((r=this._repeatDelayTime)!==null&&r!==void 0?r:this._delayTime),c=this._duration+this._repeat*a,l=function(){if(i._duration===0||o>c)return 1;var _=Math.trunc(o/a),g=o-_*a,p=Math.min(g/i._duration,1);return p===0&&o===i._duration?1:p},u=l(),h=this._easingFunction(u);if(this._updateProperties(this._object,this._valuesStart,this._valuesEnd,h),this._onUpdateCallback&&this._onUpdateCallback(this._object,u),this._duration===0||o>=this._duration)if(this._repeat>0){var f=Math.min(Math.trunc((o-this._duration)/a)+1,this._repeat);isFinite(this._repeat)&&(this._repeat-=f);for(s in this._valuesStartRepeat)!this._yoyo&&typeof this._valuesEnd[s]=="string"&&(this._valuesStartRepeat[s]=this._valuesStartRepeat[s]+parseFloat(this._valuesEnd[s])),this._yoyo&&this._swapEndStartRepeatValues(s),this._valuesStart[s]=this._valuesStartRepeat[s];return this._yoyo&&(this._reversed=!this._reversed),this._startTime+=a*f,this._onRepeatCallback&&this._onRepeatCallback(this._object),this._onEveryStartCallbackFired=!1,!0}else{this._onCompleteCallback&&this._onCompleteCallback(this._object);for(var d=0,m=this._chainedTweens.length;d<m;d++)this._chainedTweens[d].start(this._startTime+this._duration,!1);return this._isPlaying=!1,!1}return!0},t.prototype._updateProperties=function(e,n,i,r){for(var s in i)if(n[s]!==void 0){var o=n[s]||0,a=i[s],c=Array.isArray(e[s]),l=Array.isArray(a),u=!c&&l;u?e[s]=this._interpolationFunction(a,r):typeof a=="object"&&a?this._updateProperties(e[s],o,a,r):(a=this._handleRelativeValue(o,a),typeof a=="number"&&(e[s]=o+(a-o)*r))}},t.prototype._handleRelativeValue=function(e,n){return typeof n!="string"?n:n.charAt(0)==="+"||n.charAt(0)==="-"?e+parseFloat(n):parseFloat(n)},t.prototype._swapEndStartRepeatValues=function(e){var n=this._valuesStartRepeat[e],i=this._valuesEnd[e];typeof i=="string"?this._valuesStartRepeat[e]=this._valuesStartRepeat[e]+parseFloat(i):this._valuesStartRepeat[e]=this._valuesEnd[e],this._valuesEnd[e]=n},t.autoStartOnUpdate=!1,t})();var Tz=ry.nextId,Ti=ip,Az=Ti.getAll.bind(Ti),Cz=Ti.removeAll.bind(Ti),Rz=Ti.add.bind(Ti),Pz=Ti.remove.bind(Ti),Iz=Ti.update.bind(Ti);var op="http://www.w3.org/1999/xhtml",sy={svg:"http://www.w3.org/2000/svg",xhtml:op,xlink:"http://www.w3.org/1999/xlink",xml:"http://www.w3.org/XML/1998/namespace",xmlns:"http://www.w3.org/2000/xmlns/"};function oy(t){var e=t+="",n=e.indexOf(":");return n>=0&&(e=t.slice(0,n))!=="xmlns"&&(t=t.slice(n+1)),sy.hasOwnProperty(e)?{space:sy[e],local:t}:t}function JR(t){return function(){var e=this.ownerDocument,n=this.namespaceURI;return n===op&&e.documentElement.namespaceURI===op?e.createElement(t):e.createElementNS(n,t)}}function QR(t){return function(){return this.ownerDocument.createElementNS(t.space,t.local)}}function ay(t){var e=oy(t);return(e.local?QR:JR)(e)}function eP(){}function cy(t){return t==null?eP:function(){return this.querySelector(t)}}function tP(t){typeof t!="function"&&(t=cy(t));for(var e=this._groups,n=e.length,i=new Array(n),r=0;r<n;++r)for(var s=e[r],o=s.length,a=i[r]=new Array(o),c,l,u=0;u<o;++u)(c=s[u])&&(l=t.call(c,c.__data__,u,s))&&("__data__"in c&&(l.__data__=c.__data__),a[u]=l);return new Fn(i,this._parents)}function nP(t){return t==null?[]:Array.isArray(t)?t:Array.from(t)}function iP(){return[]}function rP(t){return t==null?iP:function(){return this.querySelectorAll(t)}}function sP(t){return function(){return nP(t.apply(this,arguments))}}function oP(t){typeof t=="function"?t=sP(t):t=rP(t);for(var e=this._groups,n=e.length,i=[],r=[],s=0;s<n;++s)for(var o=e[s],a=o.length,c,l=0;l<a;++l)(c=o[l])&&(i.push(t.call(c,c.__data__,l,o)),r.push(c));return new Fn(i,r)}function aP(t){return function(){return this.matches(t)}}function ly(t){return function(e){return e.matches(t)}}var cP=Array.prototype.find;function lP(t){return function(){return cP.call(this.children,t)}}function hP(){return this.firstElementChild}function uP(t){return this.select(t==null?hP:lP(typeof t=="function"?t:ly(t)))}var fP=Array.prototype.filter;function dP(){return Array.from(this.children)}function pP(t){return function(){return fP.call(this.children,t)}}function mP(t){return this.selectAll(t==null?dP:pP(typeof t=="function"?t:ly(t)))}function gP(t){typeof t!="function"&&(t=aP(t));for(var e=this._groups,n=e.length,i=new Array(n),r=0;r<n;++r)for(var s=e[r],o=s.length,a=i[r]=[],c,l=0;l<o;++l)(c=s[l])&&t.call(c,c.__data__,l,s)&&a.push(c);return new Fn(i,this._parents)}function hy(t){return new Array(t.length)}function _P(){return new Fn(this._enter||this._groups.map(hy),this._parents)}function tu(t,e){this.ownerDocument=t.ownerDocument,this.namespaceURI=t.namespaceURI,this._next=null,this._parent=t,this.__data__=e}tu.prototype={constructor:tu,appendChild:function(t){return this._parent.insertBefore(t,this._next)},insertBefore:function(t,e){return this._parent.insertBefore(t,e)},querySelector:function(t){return this._parent.querySelector(t)},querySelectorAll:function(t){return this._parent.querySelectorAll(t)}};function vP(t){return function(){return t}}function yP(t,e,n,i,r,s){for(var o=0,a,c=e.length,l=s.length;o<l;++o)(a=e[o])?(a.__data__=s[o],i[o]=a):n[o]=new tu(t,s[o]);for(;o<c;++o)(a=e[o])&&(r[o]=a)}function xP(t,e,n,i,r,s,o){var a,c,l=new Map,u=e.length,h=s.length,f=new Array(u),d;for(a=0;a<u;++a)(c=e[a])&&(f[a]=d=o.call(c,c.__data__,a,e)+"",l.has(d)?r[a]=c:l.set(d,c));for(a=0;a<h;++a)d=o.call(t,s[a],a,s)+"",(c=l.get(d))?(i[a]=c,c.__data__=s[a],l.delete(d)):n[a]=new tu(t,s[a]);for(a=0;a<u;++a)(c=e[a])&&l.get(f[a])===c&&(r[a]=c)}function bP(t){return t.__data__}function MP(t,e){if(!arguments.length)return Array.from(this,bP);var n=e?xP:yP,i=this._parents,r=this._groups;typeof t!="function"&&(t=vP(t));for(var s=r.length,o=new Array(s),a=new Array(s),c=new Array(s),l=0;l<s;++l){var u=i[l],h=r[l],f=h.length,d=SP(t.call(u,u&&u.__data__,l,i)),m=d.length,_=a[l]=new Array(m),g=o[l]=new Array(m),p=c[l]=new Array(f);n(u,h,_,g,p,d,e);for(var x=0,y=0,v,b;x<m;++x)if(v=_[x]){for(x>=y&&(y=x+1);!(b=g[y])&&++y<m;);v._next=b||null}}return o=new Fn(o,i),o._enter=a,o._exit=c,o}function SP(t){return typeof t=="object"&&"length"in t?t:Array.from(t)}function wP(){return new Fn(this._exit||this._groups.map(hy),this._parents)}function EP(t,e,n){var i=this.enter(),r=this,s=this.exit();return typeof t=="function"?(i=t(i),i&&(i=i.selection())):i=i.append(t+""),e!=null&&(r=e(r),r&&(r=r.selection())),n==null?s.remove():n(s),i&&r?i.merge(r).order():r}function TP(t){for(var e=t.selection?t.selection():t,n=this._groups,i=e._groups,r=n.length,s=i.length,o=Math.min(r,s),a=new Array(r),c=0;c<o;++c)for(var l=n[c],u=i[c],h=l.length,f=a[c]=new Array(h),d,m=0;m<h;++m)(d=l[m]||u[m])&&(f[m]=d);for(;c<r;++c)a[c]=n[c];return new Fn(a,this._parents)}function AP(){for(var t=this._groups,e=-1,n=t.length;++e<n;)for(var i=t[e],r=i.length-1,s=i[r],o;--r>=0;)(o=i[r])&&(s&&o.compareDocumentPosition(s)^4&&s.parentNode.insertBefore(o,s),s=o);return this}function CP(t){t||(t=RP);function e(h,f){return h&&f?t(h.__data__,f.__data__):!h-!f}for(var n=this._groups,i=n.length,r=new Array(i),s=0;s<i;++s){for(var o=n[s],a=o.length,c=r[s]=new Array(a),l,u=0;u<a;++u)(l=o[u])&&(c[u]=l);c.sort(e)}return new Fn(r,this._parents).order()}function RP(t,e){return t<e?-1:t>e?1:t>=e?0:NaN}function PP(){var t=arguments[0];return arguments[0]=this,t.apply(null,arguments),this}function IP(){return Array.from(this)}function DP(){for(var t=this._groups,e=0,n=t.length;e<n;++e)for(var i=t[e],r=0,s=i.length;r<s;++r){var o=i[r];if(o)return o}return null}function LP(){let t=0;for(let e of this)++t;return t}function OP(){return!this.node()}function NP(t){for(var e=this._groups,n=0,i=e.length;n<i;++n)for(var r=e[n],s=0,o=r.length,a;s<o;++s)(a=r[s])&&t.call(a,a.__data__,s,r);return this}function FP(t){return function(){this.removeAttribute(t)}}function UP(t){return function(){this.removeAttributeNS(t.space,t.local)}}function zP(t,e){return function(){this.setAttribute(t,e)}}function kP(t,e){return function(){this.setAttributeNS(t.space,t.local,e)}}function BP(t,e){return function(){var n=e.apply(this,arguments);n==null?this.removeAttribute(t):this.setAttribute(t,n)}}function VP(t,e){return function(){var n=e.apply(this,arguments);n==null?this.removeAttributeNS(t.space,t.local):this.setAttributeNS(t.space,t.local,n)}}function HP(t,e){var n=oy(t);if(arguments.length<2){var i=this.node();return n.local?i.getAttributeNS(n.space,n.local):i.getAttribute(n)}return this.each((e==null?n.local?UP:FP:typeof e=="function"?n.local?VP:BP:n.local?kP:zP)(n,e))}function uy(t){return t.ownerDocument&&t.ownerDocument.defaultView||t.document&&t||t.defaultView}function GP(t){return function(){this.style.removeProperty(t)}}function WP(t,e,n){return function(){this.style.setProperty(t,e,n)}}function jP(t,e,n){return function(){var i=e.apply(this,arguments);i==null?this.style.removeProperty(t):this.style.setProperty(t,i,n)}}function qP(t,e,n){return arguments.length>1?this.each((e==null?GP:typeof e=="function"?jP:WP)(t,e,n==null?"":n)):XP(this.node(),t)}function XP(t,e){return t.style.getPropertyValue(e)||uy(t).getComputedStyle(t,null).getPropertyValue(e)}function $P(t){return function(){delete this[t]}}function YP(t,e){return function(){this[t]=e}}function ZP(t,e){return function(){var n=e.apply(this,arguments);n==null?delete this[t]:this[t]=n}}function KP(t,e){return arguments.length>1?this.each((e==null?$P:typeof e=="function"?ZP:YP)(t,e)):this.node()[t]}function fy(t){return t.trim().split(/^|\s+/)}function cp(t){return t.classList||new dy(t)}function dy(t){this._node=t,this._names=fy(t.getAttribute("class")||"")}dy.prototype={add:function(t){var e=this._names.indexOf(t);e<0&&(this._names.push(t),this._node.setAttribute("class",this._names.join(" ")))},remove:function(t){var e=this._names.indexOf(t);e>=0&&(this._names.splice(e,1),this._node.setAttribute("class",this._names.join(" ")))},contains:function(t){return this._names.indexOf(t)>=0}};function py(t,e){for(var n=cp(t),i=-1,r=e.length;++i<r;)n.add(e[i])}function my(t,e){for(var n=cp(t),i=-1,r=e.length;++i<r;)n.remove(e[i])}function JP(t){return function(){py(this,t)}}function QP(t){return function(){my(this,t)}}function e3(t,e){return function(){(e.apply(this,arguments)?py:my)(this,t)}}function t3(t,e){var n=fy(t+"");if(arguments.length<2){for(var i=cp(this.node()),r=-1,s=n.length;++r<s;)if(!i.contains(n[r]))return!1;return!0}return this.each((typeof e=="function"?e3:e?JP:QP)(n,e))}function n3(){this.textContent=""}function i3(t){return function(){this.textContent=t}}function r3(t){return function(){var e=t.apply(this,arguments);this.textContent=e==null?"":e}}function s3(t){return arguments.length?this.each(t==null?n3:(typeof t=="function"?r3:i3)(t)):this.node().textContent}function o3(){this.innerHTML=""}function a3(t){return function(){this.innerHTML=t}}function c3(t){return function(){var e=t.apply(this,arguments);this.innerHTML=e==null?"":e}}function l3(t){return arguments.length?this.each(t==null?o3:(typeof t=="function"?c3:a3)(t)):this.node().innerHTML}function h3(){this.nextSibling&&this.parentNode.appendChild(this)}function u3(){return this.each(h3)}function f3(){this.previousSibling&&this.parentNode.insertBefore(this,this.parentNode.firstChild)}function d3(){return this.each(f3)}function p3(t){var e=typeof t=="function"?t:ay(t);return this.select(function(){return this.appendChild(e.apply(this,arguments))})}function m3(){return null}function g3(t,e){var n=typeof t=="function"?t:ay(t),i=e==null?m3:typeof e=="function"?e:cy(e);return this.select(function(){return this.insertBefore(n.apply(this,arguments),i.apply(this,arguments)||null)})}function _3(){var t=this.parentNode;t&&t.removeChild(this)}function v3(){return this.each(_3)}function y3(){var t=this.cloneNode(!1),e=this.parentNode;return e?e.insertBefore(t,this.nextSibling):t}function x3(){var t=this.cloneNode(!0),e=this.parentNode;return e?e.insertBefore(t,this.nextSibling):t}function b3(t){return this.select(t?x3:y3)}function M3(t){return arguments.length?this.property("__data__",t):this.node().__data__}function S3(t){return function(e){t.call(this,e,this.__data__)}}function w3(t){return t.trim().split(/^|\s+/).map(function(e){var n="",i=e.indexOf(".");return i>=0&&(n=e.slice(i+1),e=e.slice(0,i)),{type:e,name:n}})}function E3(t){return function(){var e=this.__on;if(e){for(var n=0,i=-1,r=e.length,s;n<r;++n)s=e[n],(!t.type||s.type===t.type)&&s.name===t.name?this.removeEventListener(s.type,s.listener,s.options):e[++i]=s;++i?e.length=i:delete this.__on}}}function T3(t,e,n){return function(){var i=this.__on,r,s=S3(e);if(i){for(var o=0,a=i.length;o<a;++o)if((r=i[o]).type===t.type&&r.name===t.name){this.removeEventListener(r.type,r.listener,r.options),this.addEventListener(r.type,r.listener=s,r.options=n),r.value=e;return}}this.addEventListener(t.type,s,n),r={type:t.type,name:t.name,value:e,listener:s,options:n},i?i.push(r):this.__on=[r]}}function A3(t,e,n){var i=w3(t+""),r,s=i.length,o;if(arguments.length<2){var a=this.node().__on;if(a){for(var c=0,l=a.length,u;c<l;++c)for(r=0,u=a[c];r<s;++r)if((o=i[r]).type===u.type&&o.name===u.name)return u.value}return}for(a=e?T3:E3,r=0;r<s;++r)this.each(a(i[r],e,n));return this}function gy(t,e,n){var i=uy(t),r=i.CustomEvent;typeof r=="function"?r=new r(e,n):(r=i.document.createEvent("Event"),n?(r.initEvent(e,n.bubbles,n.cancelable),r.detail=n.detail):r.initEvent(e,!1,!1)),t.dispatchEvent(r)}function C3(t,e){return function(){return gy(this,t,e)}}function R3(t,e){return function(){return gy(this,t,e.apply(this,arguments))}}function P3(t,e){return this.each((typeof e=="function"?R3:C3)(t,e))}function*I3(){for(var t=this._groups,e=0,n=t.length;e<n;++e)for(var i=t[e],r=0,s=i.length,o;r<s;++r)(o=i[r])&&(yield o)}var _y=[null];function Fn(t,e){this._groups=t,this._parents=e}function D3(){return new Fn([[document.documentElement]],_y)}function L3(){return this}Fn.prototype=D3.prototype={constructor:Fn,select:tP,selectAll:oP,selectChild:uP,selectChildren:mP,filter:gP,data:MP,enter:_P,exit:wP,join:EP,merge:TP,selection:L3,order:AP,sort:CP,call:PP,nodes:IP,node:DP,size:LP,empty:OP,each:NP,attr:HP,style:qP,property:KP,classed:t3,text:s3,html:l3,raise:u3,lower:d3,append:p3,insert:g3,remove:v3,clone:b3,datum:M3,on:A3,dispatch:P3,[Symbol.iterator]:I3};function vy(t){return typeof t=="string"?new Fn([[document.querySelector(t)]],[document.documentElement]):new Fn([[t]],_y)}var O3=0;function N3(){return new ap}function ap(){this._="@"+(++O3).toString(36)}ap.prototype=N3.prototype={constructor:ap,get:function(t){for(var e=this._;!(e in t);)if(!(t=t.parentNode))return;return t[e]},set:function(t,e){return t[this._]=e},remove:function(t){return this._ in t&&delete t[this._]},toString:function(){return this._}};function F3(t){let e;for(;e=t.sourceEvent;)t=e;return t}function yy(t,e){if(t=F3(t),e===void 0&&(e=t.currentTarget),e){var n=e.ownerSVGElement||e;if(n.createSVGPoint){var i=n.createSVGPoint();return i.x=t.clientX,i.y=t.clientY,i=i.matrixTransform(e.getScreenCTM().inverse()),[i.x,i.y]}if(e.getBoundingClientRect){var r=e.getBoundingClientRect();return[t.clientX-r.left-e.clientLeft,t.clientY-r.top-e.clientTop]}}return[t.pageX,t.pageY]}var Pt,My,up,Mr,lp,ou,Sy,iu,wy,fp,hp,U3,Ua=Symbol.for("pv"),au={},cu=[],z3=/^m(i|n|o|s|text|space)$/,dp=Array.isArray,pp=cu.slice,Sr=Object.assign;function ns(t){t&&t.parentNode&&t.remove()}function mp(t,e,n){var i,r,s,o=Sr({},t.props),a=arguments.length;for(s in e)s=="key"?i=e[s]:s=="ref"&&typeof t.type!="function"?r=e[s]:o[s]=e[s];return a>2&&(o.children=a>3?pp.call(arguments,2):n),Fa(t.type,o,i!==void 0?i:t.key,r!==void 0?r:t.ref,null)}function Fa(t,e,n,i,r){var s={type:t,props:e,key:n,ref:i,__k:null,__:null,__b:0,__e:null,__c:null,constructor:Ua,__v:r||++My,__i:-1,__u:0};return!r&&Pt.vnode&&Pt.vnode(s),s}function lu(t){return t.children}function ru(t,e){this.props=t,this.context=e,this.__g=0}function wr(t,e){if(e==null)return t.__&&wr(t.__,t.__i+1);for(var n;e<t.__k.length;e++)if((n=t.__k[e])&&n.__e)return n.__e;return typeof t.type!="function"||t.props.__P?null:wr(t)}function k3(t){var e,n=t.__v,i=n.__e,r=[],s=[],o=t.__P;o&&((e=Sr({constructor:Ua},n)).__v=n.__v+1,Pt.vnode&&Pt.vnode(e),gp(o,e,n,t.__n,o.namespaceURI,32&n.__u?[i]:null,r,i||wr(n),32&n.__u,s),e.__v=n.__v,e.__.__k[e.__i]=e,Py(r,e,s),n.__=n.__e=null,e.__e!=i&&Ey(e))}function Ey(t){if((t=t.__)&&t.__c&&!t.props.__P)return t.__e=null,t.__k.some(function(e){return e&&(t.__e=e.__e)}),Ey(t)}function xy(t){(8&t.__g||(t.__g|=8,Mr.push(t),ou++))&&lp==Pt.debounceRendering||((lp=Pt.debounceRendering)||queueMicrotask)(Ty)}function Ty(){try{for(var t,e=1;Mr.length;)Mr.length>e&&Mr.sort(Sy),t=Mr.shift(),e=Mr.length,8&t.__g&&k3(t)}finally{(ou=Mr.length)&&(lp||queueMicrotask)(Ty)}}function Ay(t,e,n,i,r,s,o,a,c,l,u){var h,f,d,m,_,g,p=i.__k||cu,x=e.length;for(c=B3(n,e,p,c,x),h=0;h<x;h++)(d=n.__k[h])!=null&&(f=~d.__i&&p[d.__i]||au,d.__i=h,g=gp(t,d,f,r,s,o,a,c,l,u),m=d.__e,(f.ref!=d.ref||8&f.__u)&&(f.ref&&_p(f.ref,null,d,f),d.ref&&u.push(d.ref,d.__c||m,d)),_=_||m,4&d.__u?(c=Cy(d,c,t,!f.__v),f.__e&&(f.__e=null)):typeof d.type=="function"&&g!==void 0?c=g:m&&(c=m.nextSibling),d.__u&=-21);return n.__e=_,c}function B3(t,e,n,i,r){var s,o,a,c,l,u,h,f,d,m=n.length,_=m,g=0,p=0,x=t.__k=Array(r);for(s=0;s<r;s++)(o=e[s])!=null&&typeof o!="boolean"&&typeof o!="function"?(typeof o!="object"||o.constructor===String?o=x[s]=Fa(null,o):dp(o)?o=x[s]=Fa(lu,{children:o}):o.constructor===Ua&&o.__b?o=x[s]=Fa(o.type,o.props,o.key,o.ref,o.__v):x[s]=o,c=s+g,o.__=t,o.__b=t.__b+1,a=null,~(l=o.__i=V3(o,n,c,_))&&(_--,(a=n[l])&&(a.__u|=2)),a&&a.__v?(o.__u|=16,l==c-1?g--:l==c+1?g++:l!=c&&(l>c?g--:g++,p=1)):(~l||(r>m?g--:r<m&&g++),typeof o.type!="function"&&(o.__u|=4))):x[s]=null;if(p){for(u=[],h=[],s=0;s<r;s++)if((o=x[s])&&16&o.__u){for(g=0,f=u.length;g<f;)u[d=g+f>>1]<o.__i?g=d+1:f=d;u[g]=o.__i,h[s]=g+1}for(g=u.length;s--;)h[s]&&(h[s]==g?g--:x[s].__u|=4)}if(_)for(s=0;s<m;s++)!(a=n[s])||2&a.__u||(a.__e==i&&(i=wr(a)),vp(a,a));return i}function Cy(t,e,n,i){var r,s,o,a;if(typeof t.type=="function"){if(t.props.__P)return e;if(r=t.__k)for(s=0;s<r.length;s++)r[s]&&(r[s].__=t,e=Cy(r[s],e,n,!1));return e}for(e&&!e.parentNode&&(e=wr(t))&&!e.parentNode&&(e=null),o=t.__e,a=e;a&&a.nodeType==8;)a=a.nextSibling;for(o!=a&&(!i&&n.moveBefore&&o.parentNode?n.moveBefore(o,e):n.insertBefore(o,e||null)),e=o;(e=e&&e.nextSibling)&&e.nodeType==8&&!e.data.startsWith("$s"););return e}function V3(t,e,n,i){var r,s=t.key,o=t.type,a=e[n],c=a&&!(2&a.__u);if(a===null&&s==null||c&&s==a.key&&o==a.type)return n;if(i>(c?1:0)){for(r=n-1;r>=0;r--)if((a=e[r])&&!(2&a.__u)&&s==a.key&&o==a.type)return r;for(r=n+1;r<e.length;r++)if((a=e[r])&&!(2&a.__u)&&s==a.key&&o==a.type)return r}return-1}function by(t,e,n){n==null&&(n=""),e[0]=="-"?t.setProperty(e,n):t[e]=n}function nu(t,e,n,i,r){var s,o;if(e=="style")if(typeof n=="string")t.style.cssText=n;else{if(typeof i=="string"&&(t.style.cssText=i=""),i)for(e in i)n&&e in n||by(t.style,e);if(n)for(e in n)i&&n[e]==i[e]||by(t.style,e,n[e])}else if(e[0]=="o"&&e[1]=="n")typeof n!="function"&&(n=null),typeof i!="function"&&(i=null),(t.__e||(t.__e={}))[e]=n,n&&i||(o=hp[e]||(hp[e]=H3(e)),(t.__a||(t.__a={}))[e]=fp,s=e!=(e=e.replace(wy,"$1")),(e=e.slice(2))[0]<"a"&&(e=e.toLowerCase()),n?t.addEventListener(e,o,s):t.removeEventListener(e,o,s));else{if(r=="http://www.w3.org/2000/svg")e=e.replace(/xlink(H|:h)/,"h").replace(/sName$/,"s");else if(e!="width"&&e!="height"&&e!="href"&&e!="list"&&e!="form"&&e!="tabIndex"&&e!="download"&&e!="rowSpan"&&e!="colSpan"&&e!="role"&&e!="popover"&&e in t)try{return void(t[e]=n==null?"":n)}catch(a){}if(typeof n=="function")return;n==null||n===!1&&e[4]!="-"?t.removeAttribute(e):t.setAttribute(e,e=="popover"&&n==1?"":n)}}function H3(t){return function(e){var n=this.__e;if(n){if(n=n[t],e[iu]==null)e[iu]=fp++;else if(e[iu]<this.__a[t])return;return n(Pt.event?Pt.event(e):e)}}}function gp(t,e,n,i,r,s,o,a,c,l){var u,h,f,d,m,_,g,p,x,y,v,b,M,A,C,T,w,P,z=e.type;if(e.constructor!==Ua)return null;128&n.__u&&(c=32&n.__u,u=n.__c.__z)&&(e.__u|=c,h=s=[],u.nodeType==8?a=su(u,s):s.push(u),a=s[0]||a),(u=Pt.__b)&&u(e);e:if(typeof z=="function"){f=o.length;try{if(p=e.props,x=(u=z.prototype)&&u.render,y=(u=z.contextType)&&i[u.__c],v=u?y?y.props.value:u.__:i,(d=n.__c)?(e.__c=d,2&d.__g&&(d.__g|=1)):(x?e.__c=d=new z(p,v):(e.__c=d=new ru(p,v),d.constructor=z,d.render=W3),y&&y.sub(d),d.state||(d.state={}),d.__n=i,d.__g|=8,d.__h=[],d.__k=[]),x&&(d.__s||(d.__s=d.state),z.getDerivedStateFromProps&&(d.__s==d.state&&(d.__s=Sr({},d.__s)),Sr(d.__s,z.getDerivedStateFromProps(p,d.__s)))),m=d.props,_=d.state,d.__v=e,n.__c){if(p!==m&&x&&!z.getDerivedStateFromProps&&d.componentWillReceiveProps&&d.componentWillReceiveProps(p,v),e.__v==n.__v&&!(8&d.__g)||!(4&d.__g)&&d.shouldComponentUpdate&&d.shouldComponentUpdate(p,d.__s,v)===!1){e.__v!=n.__v&&(d.props=p,d.state=d.__s,d.__g&=-9),e.__e=n.__e,e.__k=n.__k,e.__k.some(function(U){U&&(U.__=e)}),cu.push.apply(d.__h,d.__k),d.__k=[],d.__h.length&&o.push(d),a=wr(n);break e}d.componentWillUpdate&&d.componentWillUpdate(p,d.__s,v),x&&d.componentDidUpdate&&d.__h.push(function(){d.componentDidUpdate(m,_,g)})}else x&&!z.getDerivedStateFromProps&&d.componentWillMount&&d.componentWillMount(),x&&d.componentDidMount&&d.__h.push(d.componentDidMount);d.context=v,d.props=p,d.__P=t,d.__g&=-5,b=Pt.__r,M=x?25:0;do d.__g&=-9,b&&b(e),u=d.render(d.props,d.state=d.__s,d.context);while(8&d.__g&&++M<25);x&&(cu.push.apply(d.__h,d.__k),d.__k=[]),d.state=d.__s,d.getChildContext&&(i=Sr({},i,d.getChildContext())),x&&n.__c&&d.getSnapshotBeforeUpdate&&(g=d.getSnapshotBeforeUpdate(m,_)),A=u&&u.type===lu&&u.key==null?u.props.children:u,p.__P&&(u=a,r=(t=p.__P).namespaceURI,c=s=null,n.props&&n.props.__P!=t&&(n.__k.some(function(U){U&&vp(U,U)}),n.__k=null),a=n.__k?wr(n,0):null),a=Ay(t,dp(A)?A:[A],e,n,i,r,s,o,a,c,l),p.__P&&(e.__e=null,a=u),e.__u&=-161,h&&h.some(ns),d.__h.length&&o.push(d),1&d.__g&&(d.__g&=-4)}catch(U){if(o.length=f,e.__v=null,c||s)if(U&&U.then){if(e.__u|=128|c,s){for(~(w=s.indexOf(a||void 0))||(w=s.length);(P=s[w-1])&&P.nodeType==8;)w--;for(;w<s.length;w++)if(P=s[w])if(s[w]=null,C){if(P==T)break}else{if(P.nodeType!=8)break;P.data.startsWith("$s")&&(T=su(C=P))}}if(!C){for(;a&&a.nodeType==8&&a.nextSibling;)a=a.nextSibling;C=a}(u=su(C=e.__c.__z||(e.__c.__z=C)))?(e.__e=C,a=u):e.__e=a,a=a&&a.nextSibling}else s&&s.some(ns);else e.__e=n.__e;e.__k||(e.__k=n.__k||[]),U&&U.then||Ry(e),Pt.__e(U,e,n)}}else a=e.__e=G3(n.__e,e,n,i,r,s,o,c,l,t);return(u=Pt.diffed)&&u(e),a}function su(t,e){if(t&&t.nodeType==8&&t.data.startsWith("$s"))for(var n=1;t=t.nextSibling;){if(t.nodeType==8){if(t.data.startsWith("$s"))n++;else if(t.data.startsWith("/$s")&&!--n)return t}e&&e.push(t)}}function Ry(t){t&&(t.__c&&(t.__c.__g|=4),t.__k&&t.__k.some(Ry))}function Py(t,e,n){for(var i=0;i<n.length;)_p(n[i++],n[i++],n[i++]);Pt.__c&&Pt.__c(e,t),t.some(function(r){try{t=r.__h,r.__h=[],t.some(function(s){s.call(r)})}catch(s){Pt.__e(s,r.__v)}})}function G3(t,e,n,i,r,s,o,a,c,l){var u,h,f,d,m,_,g,p,x=n.props||au,y=e.props,v=e.type;if(v=="svg"?r="http://www.w3.org/2000/svg":v=="math"?r="http://www.w3.org/1998/Math/MathML":r||(r="http://www.w3.org/1999/xhtml"),s){for(u=0;u<s.length;u++)if((m=s[u])&&(v?m.localName==v:m.nodeType==3)){t=m,s[u]=null;break}}if(!t){if(p=l.ownerDocument||document,!v)return p.createTextNode(y);t=p.createElementNS(r,v,y.is?y:l),a&&(Pt.__m&&Pt.__m(e,s),a=!1),s=null}if(v){if(l=v=="template"&&t.content||t,s=v=="textarea"&&y.defaultValue!=null?null:s&&pp.call(l.childNodes),!a&&s)for(x={},u=0;u<t.attributes.length;u++)x[(m=t.attributes[u]).name]=m.value;for(u in x)m=x[u],u=="dangerouslySetInnerHTML"?f=m:u=="children"||u in y||u=="value"&&"defaultValue"in y||u=="checked"&&"defaultChecked"in y||nu(t,u,null,m,r);for(u in y)m=y[u],u=="children"?d=m:u=="dangerouslySetInnerHTML"?h=m:u=="value"?_=m:u=="checked"?g=m:a&&typeof m!="function"||x[u]===m||nu(t,u,m,x[u],r);h?(a||f&&(h.__html==f.__html||h.__html==t.innerHTML)||(t.innerHTML=h.__html),e.__k=[]):(f&&(t.textContent=""),(v=="foreignObject"||r=="http://www.w3.org/1998/Math/MathML"&&z3.test(v))&&(r="http://www.w3.org/1999/xhtml"),Ay(l,dp(d)?d:[d],e,n,i,r,s,o,s?s[0]:n.__k&&wr(n,0),a,c),s&&s.some(ns)),a&&v!="textarea"||(u="value",v=="progress"&&_==null?t.removeAttribute(u):_==null||_===t[u]&&(v!="progress"||_)||nu(t,u,_,x[u],r),u="checked",g!=null&&g!=t[u]&&nu(t,u,g,x[u],r))}else x===y||a&&t.data==y||(t.data=y);return t}function _p(t,e,n,i){try{typeof t=="function"?e?e.__x=t(e)||1:i&&(i=i.__c||i.__e)&&(e=i.__x)&&(i.__x=null,typeof e=="function"?e():t(null)):t.current=e}catch(r){Pt.__e(r,n)}}function vp(t,e,n){var i,r,s,o;if(Pt.unmount&&Pt.unmount(t),!(i=t.ref)||i.current&&i.current!=t.__e||_p(i,null,e,t),i=t.__c){if(i.componentWillUnmount)try{i.componentWillUnmount()}catch(a){Pt.__e(a,e)}i.__P=i.__n=null}if(i=t.__k)for(o=0;o<i.length;o++)i[o]&&vp(i[o],e,typeof t.type!="function"||n&&!t.props.__P);!n&&(i=t.__c)&&(i=i.__z)&&(r=su(i,s=[]))&&(i==t.__e&&s.some(ns),ns(r),ns(i)),n||ns(t.__e),t.__e=t.__c=t.__=null}function W3(t,e,n){return this.constructor(t,n)}function Iy(t,e){var n,i,r,s;Pt.__&&Pt.__(t,e),e.nodeType==9&&(e=e.documentElement),i=(n=t&&32&t.__u)?null:e.__k,e.__k=Fa(lu,{children:[t]}),r=[],s=[],gp(e,e.__k,i||au,au,e.namespaceURI,i?null:e.firstChild?pp.call(e.childNodes):null,r,i?i.__e:e.firstChild,n,s),Py(r,e.__k,s),e.__k.props.children=null}Pt={__e:function(t,e,n,i){for(var r,s,o;e=e.__;)if((r=e.__c)&&!(1&r.__g)){r.__g|=4;try{if((o=(s=r.constructor)&&s.getDerivedStateFromError)&&r.setState(s.getDerivedStateFromError(t)),r.componentDidCatch&&(r.componentDidCatch(t,i||{}),o=1),o&&8&r.__g)return void(r.__g|=2)}catch(a){t=a}}throw ou=0,t}},My=0,up=function(t){return t!=null&&t.constructor===Ua},ru.prototype.setState=function(t,e){var n=this.__s;n&&n!=this.state||(n=this.__s=Sr({},this.state)),typeof t=="function"&&(t=t(Sr({},n),this.props)),t&&(Sr(n,t),this.__v&&(e&&this.__k.push(e),xy(this)))},ru.prototype.forceUpdate=function(t){this.__v&&(this.__g|=4,t&&this.__h.push(t),xy(this))},ru.prototype.render=lu,Mr=[],ou=0,Sy=function(t,e){return t.__v.__b-e.__v.__b},iu=Symbol(),wy=/(PointerCapture)$|Capture$/i,fp=0,hp={},U3=0;var yp=t=>{var n;if(typeof t!="object")return t;let e=mp(t);return e.props&&(e.props=Tn({},e.props),(n=e==null?void 0:e.props)!=null&&n.children&&(e.props.children=Array.isArray(e.props.children)?e.props.children.map(yp):yp(e.props.children))),e},j3=t=>up(mp(t)),q3=(t,e)=>{delete e.__k,Iy(yp(t),e)};var Dy=dr({props:{content:{default:!1},offsetX:{triggerUpdate:!1},offsetY:{triggerUpdate:!1}},methods:{positionFromEvent(t,e){let n=t.container,i=yy(e,n),r=n.offsetWidth,s=n.offsetHeight,o=[t.offsetX===null||t.offsetX===void 0?`-${i[0]/r*100}%`:typeof t.offsetX=="number"?`calc(-50% + ${t.offsetX}px)`:t.offsetX,t.offsetY===null||t.offsetY===void 0?s>130&&s-i[1]<100?"calc(-100% - 6px)":"21px":typeof t.offsetY=="number"?t.offsetY<0?`calc(-100% - ${Math.abs(t.offsetY)}px)`:`${t.offsetY}px`:t.offsetY];return t.tooltipEl.style("left",i[0]+"px").style("top",i[1]+"px").style("transform",`translate(${o.join(",")})`),this}},init:function(t,e,{style:n={}}={}){let i=!!t&&typeof t=="object"&&!!t.node&&typeof t.node=="function",r=vy(i?t.node():t);e.container=r.node(),r.style("position")==="static"&&r.style("position","relative"),e.tooltipEl=r.append("div").attr("class","float-tooltip-kap"),Object.entries(n).forEach(([o,a])=>e.tooltipEl.style(o,a)),e.tooltipEl.style("left","-10000px").style("display","none");let s=`tooltip-${Math.round(Math.random()*1e12)}`;e.mouseInside=!1,r.on(`mousemove.${s}`,o=>{e.mouseInside=!0,this.positionFromEvent(o),e.content&&e.tooltipEl.style("display","inline")}),r.on(`mouseover.${s}`,()=>{e.mouseInside=!0,e.content&&e.tooltipEl.style("display","inline")}),r.on(`mouseout.${s}`,()=>{e.mouseInside=!1,e.tooltipEl.style("display","none")})},update:function(t){t.tooltipEl.style("display",t.content&&t.mouseInside?"inline":"none"),t.content?t.content instanceof HTMLElement?(t.tooltipEl.text(""),t.tooltipEl.append(()=>t.content)):typeof t.content=="string"?t.tooltipEl.html(t.content):j3(t.content)?(t.tooltipEl.text(""),q3(t.content,t.tooltipEl.node())):(t.tooltipEl.style("display","none"),console.warn("Tooltip content is invalid, skipping.",t.content,t.content.toString())):t.tooltipEl.text("")}});var Ly=t=>{t instanceof Array?t.forEach(Ly):(t.map&&t.map.dispose(),t.dispose())},Oy=t=>{t.geometry&&t.geometry.dispose(),t.material&&Ly(t.material),t.texture&&t.texture.dispose(),t.children&&t.children.forEach(Oy)},X3=t=>{for(;t.children.length;){let e=t.children[0];t.remove(e),Oy(e)}},ot=window.THREE?window.THREE:{WebGLRenderer:ah,Scene:Ho,PerspectiveCamera:Zt,Raycaster:Bi,SRGBColorSpace:Yt,TextureLoader:na,Vector2:ie,Vector3:R,Box3:vn,Color:Fe,Mesh:Ct,SphereGeometry:ki,MeshBasicMaterial:Rn,BackSide:Kt,Timer:oa},xp=dr({props:{width:{default:window.innerWidth,onChange(t,e,n){isNaN(t)&&(e.width=n)}},height:{default:window.innerHeight,onChange(t,e,n){isNaN(t)&&(e.height=n)}},viewOffset:{default:[0,0]},backgroundColor:{default:"#000011"},backgroundImageUrl:{},onBackgroundImageLoaded:{},showNavInfo:{default:!0},skyRadius:{default:5e4},objects:{default:[]},lights:{default:[]},enablePointerInteraction:{default:!0,onChange(t,e){e.hoverObj=null,e.tooltip&&e.tooltip.content(null)},triggerUpdate:!1},pointerRaycasterThrottleMs:{default:50,triggerUpdate:!1},lineHoverPrecision:{default:1,triggerUpdate:!1},pointsHoverPrecision:{default:1,triggerUpdate:!1},hoverOrderComparator:{triggerUpdate:!1},hoverFilter:{default:()=>!0,triggerUpdate:!1},tooltipContent:{triggerUpdate:!1},hoverDuringDrag:{default:!1,triggerUpdate:!1},clickAfterDrag:{default:!1,triggerUpdate:!1},onHover:{default:()=>{},triggerUpdate:!1},onClick:{default:()=>{},triggerUpdate:!1},onRightClick:{triggerUpdate:!1}},methods:{tick:function(t){var e,n;if(t.initialised){t.controls.enabled&&((n=(e=t.controls).update)==null||n.call(e,Math.min(1,t.timer.update().getDelta()))),t.postProcessingComposer?t.postProcessingComposer.render():t.renderer.render(t.scene,t.camera),t.extraRenderers.forEach(r=>r.render(t.scene,t.camera));let i=+new Date;if(t.enablePointerInteraction&&i-t.lastRaycasterCheck>=t.pointerRaycasterThrottleMs){t.lastRaycasterCheck=i;let r=null;if(t.hoverDuringDrag||!t.isPointerDragging){let s=this.intersectingObjects(t.pointerPos.x,t.pointerPos.y);t.hoverOrderComparator&&s.sort((a,c)=>t.hoverOrderComparator(a.object,c.object,a,c));let o=s.find(a=>t.hoverFilter(a.object))||null;r=o?o.object:null,t.intersection=o||null}r!==t.hoverObj&&(t.onHover(r,t.hoverObj,t.intersection),t.tooltip.content(r&&et(t.tooltipContent)(r,t.intersection)||null),t.hoverObj=r)}t.tweenGroup.update()}return this},getPointerPos:function(t){let{x:e,y:n}=t.pointerPos;return{x:e,y:n}},cameraPosition:function(t,e,n,i){var c,l;let r=t.camera;if(e&&t.initialised){let u=e,h=n||{x:0,y:0,z:0};if((c=t.povPosTween)==null||c.end(),(l=t.povTgtTween)==null||l.end(),!i)s(u),o(h);else{let f=Object.assign({},r.position),d=a();t.tweenGroup.add(t.povPosTween=new sp(f).to(u,i).easing(br.Quadratic.Out).onUpdate(s).onComplete(function(){t.povPosTween=void 0,t.tweenGroup.remove(this)}).start()),t.tweenGroup.add(t.povTgtTween=new sp(d).to(h,i/3).easing(br.Quadratic.Out).onUpdate(o).onComplete(function(){t.povTgtTween=void 0,t.tweenGroup.remove(this)}).start())}return this}return Object.assign({},r.position,{lookAt:a()});function s(u){let{x:h,y:f,z:d}=u;h!==void 0&&(r.position.x=h),f!==void 0&&(r.position.y=f),d!==void 0&&(r.position.z=d)}function o(u){let h=new ot.Vector3(u.x,u.y,u.z);t.controls.enabled&&t.controls.target?t.controls.target=h:r.lookAt(h)}function a(){return Object.assign(new ot.Vector3(0,0,-1e3).applyQuaternion(r.quaternion).add(r.position))}},zoomToFit:function(t,e=0,n=10,i,r){return this.fitToBbox(this.getBbox(i),e,n,r)},fitToBbox:function(t,e,n=0,i=10,r=!1){let s=t.camera;if(e){s.updateMatrixWorld();let o=new ot.Vector3,a=new ot.Vector3,c=new ot.Vector3,l=new ot.Vector3;s.getWorldPosition(l),s.getWorldDirection(c),o.crossVectors(c,s.up).normalize(),a.crossVectors(o,c).normalize();let h=(1-i*2/t.height)*s.fov/2*(Math.PI/180),f=Math.atan(Math.tan(h)*s.aspect),d=new ot.Vector3((e.x[0]+e.x[1])/2,(e.y[0]+e.y[1])/2,(e.z[0]+e.z[1])/2),m=r?c.clone().multiplyScalar(l.distanceTo(d)).add(l):d,_=Math.max(0,...[new ot.Vector3(e.x[0],e.y[0],e.z[0]),new ot.Vector3(e.x[0],e.y[0],e.z[1]),new ot.Vector3(e.x[0],e.y[1],e.z[0]),new ot.Vector3(e.x[0],e.y[1],e.z[1]),new ot.Vector3(e.x[1],e.y[0],e.z[0]),new ot.Vector3(e.x[1],e.y[0],e.z[1]),new ot.Vector3(e.x[1],e.y[1],e.z[0]),new ot.Vector3(e.x[1],e.y[1],e.z[1])].map(x=>{let y=x.clone().sub(m);return Math.max(Math.abs(y.dot(a))/Math.tan(h),Math.abs(y.dot(o))/Math.tan(f))-y.dot(c)})),g=c.clone().negate(),p={x:m.x+g.x*_,y:m.y+g.y*_,z:m.z+g.z*_};this.cameraPosition(p,m,n)}return this},getBbox:function(t,e=()=>!0){let n=new ot.Box3,i=t.objects.filter(e);return i.length?(i.forEach(r=>n.expandByObject(r)),Object.assign(...["x","y","z"].map(r=>({[r]:[n.min[r],n.max[r]]})))):null},getScreenCoords:function(t,e,n,i){let r=new ot.Vector3(e,n,i);return r.project(this.camera()),{x:(r.x+1)*t.width/2,y:-(r.y-1)*t.height/2}},getSceneCoords:function(t,e,n,i=0){let r=new ot.Vector2(e/t.width*2-1,-(n/t.height)*2+1),s=new ot.Raycaster;return s.setFromCamera(r,t.camera),Object.assign({},s.ray.at(i,new ot.Vector3))},intersectingObjects:function(t,e,n){let i=new ot.Vector2(e/t.width*2-1,-(n/t.height)*2+1),r=new ot.Raycaster;return r.params.Line.threshold=t.lineHoverPrecision,r.params.Points.threshold=t.pointsHoverPrecision,r.setFromCamera(i,t.camera),r.intersectObjects(t.objects,!0)},renderer:t=>t.renderer,scene:t=>t.scene,camera:t=>t.camera,postProcessingComposer:t=>t.postProcessingComposer,controls:t=>t.controls,_destructor:function(t){var e,n,i;X3(t.scene),(e=t.controls)==null||e.dispose(),(n=t.renderer)==null||n.dispose(),(i=t.postProcessingComposer)==null||i.dispose()}},stateInit:()=>({scene:new ot.Scene,camera:new ot.PerspectiveCamera,timer:new ot.Timer,tweenGroup:new rp,lastRaycasterCheck:0}),init(t,e,{controlType:n="trackball",useWebGPU:i=!1,rendererConfig:r={},extraRenderers:s=[],waitForLoadComplete:o=!0}={}){t.innerHTML="",t.appendChild(e.container=document.createElement("div")),e.container.className="scene-container",e.container.style.position="relative",e.container.appendChild(e.navInfo=document.createElement("div")),e.navInfo.className="scene-nav-info",e.navInfo.textContent={orbit:"Left-click: rotate, Mouse-wheel/middle-click: zoom, Right-click: pan",trackball:"Left-click: rotate, Mouse-wheel/middle-click: zoom, Right-click: pan",arcball:"Left-click: rotate, Mouse-wheel/middle-click: zoom, Right-click: pan",fly:"WASD: move, R|F: up | down, Q|E: roll, up|down: pitch, left|right: yaw"}[n]||"",e.navInfo.style.display=e.showNavInfo?null:"none",e.tooltip=new Dy(e.container),e.pointerPos=new ot.Vector2,e.pointerPos.x=-2,e.pointerPos.y=-2,["pointermove","pointerdown"].forEach(a=>e.container.addEventListener(a,c=>{if(a==="pointerdown"&&(e.isPointerPressed=!0),!e.isPointerDragging&&c.type==="pointermove"&&(c.pressure>0||e.isPointerPressed)&&(c.pointerType==="mouse"||c.movementX===void 0||[c.movementX,c.movementY].some(u=>Math.abs(u)>1))&&(e.isPointerDragging=!0),e.enablePointerInteraction){let u=l(e.container);e.pointerPos.x=c.pageX-u.left,e.pointerPos.y=c.pageY-u.top}function l(u){let h=u.getBoundingClientRect(),f=window.pageXOffset||document.documentElement.scrollLeft,d=window.pageYOffset||document.documentElement.scrollTop;return{top:h.top+d,left:h.left+f}}},{passive:!0})),e.container.addEventListener("pointerup",a=>{e.isPointerPressed&&(e.isPointerPressed=!1,!(e.isPointerDragging&&(e.isPointerDragging=!1,!e.clickAfterDrag))&&requestAnimationFrame(()=>{a.button===0&&e.onClick(e.hoverObj||null,a,e.intersection),a.button===2&&e.onRightClick&&e.onRightClick(e.hoverObj||null,a,e.intersection)}))},{passive:!0,capture:!0}),e.container.addEventListener("contextmenu",a=>{e.onRightClick&&a.preventDefault()}),e.renderer=new(i?Fh:ot.WebGLRenderer)(Object.assign({antialias:!0,alpha:!0},r)),e.renderer.setPixelRatio(Math.min(2,window.devicePixelRatio)),e.container.appendChild(e.renderer.domElement),e.extraRenderers=s,e.extraRenderers.forEach(a=>{a.domElement.style.position="absolute",a.domElement.style.top="0px",a.domElement.style.pointerEvents="none",e.container.appendChild(a.domElement)}),e.postProcessingComposer=new Yh(e.renderer),e.postProcessingComposer.addPass(new Zh(e.scene,e.camera)),e.controls=new($3(n)?n:{trackball:Vh,arcball:Gh,orbit:jh,fly:qh}[n])(e.camera,e.renderer.domElement),n==="fly"&&(e.controls.movementSpeed=300,e.controls.rollSpeed=Math.PI/6,e.controls.dragToLook=!0),(n==="trackball"||n==="arcball"||n==="orbit")&&(e.controls.minDistance=.1,e.controls.maxDistance=e.skyRadius,e.controls.addEventListener("start",()=>{e.controlsEngaged=!0}),e.controls.addEventListener("change",()=>{e.controlsEngaged&&(e.controlsDragging=!0)}),e.controls.addEventListener("end",()=>{e.controlsEngaged=!1,e.controlsDragging=!1}),e.renderer.domElement.style.cursor=null),[e.renderer,e.postProcessingComposer,...e.extraRenderers].forEach(a=>a.setSize(e.width,e.height)),e.camera.aspect=e.width/e.height,e.camera.updateProjectionMatrix(),e.camera.position.z=1e3,e.scene.add(e.skysphere=new ot.Mesh),e.skysphere.visible=!1,e.loadComplete=e.scene.visible=!o},update(t,e){if(t.width&&t.height&&(e.hasOwnProperty("width")||e.hasOwnProperty("height"))){let i=t.width,r=t.height;t.container.style.width=`${i}px`,t.container.style.height=`${r}px`,[t.renderer,t.postProcessingComposer,...t.extraRenderers].forEach(o=>o.setSize(i,r)),t.camera.aspect=i/r;let s=t.viewOffset.slice(0,2);s.some(o=>o)&&t.camera.setViewOffset(i,r,...s,i,r),t.camera.updateProjectionMatrix()}if(e.hasOwnProperty("viewOffset")){let i=t.width,r=t.height,s=t.viewOffset.slice(0,2);s.some(o=>o)?t.camera.setViewOffset(i,r,...s,i,r):t.camera.clearViewOffset()}if(e.hasOwnProperty("skyRadius")&&t.skyRadius&&(t.controls.hasOwnProperty("maxDistance")&&e.skyRadius&&(t.controls.maxDistance=Math.min(t.controls.maxDistance,t.skyRadius)),t.camera.far=t.skyRadius*2.5,t.camera.updateProjectionMatrix(),t.skysphere.geometry=new ot.SphereGeometry(t.skyRadius)),e.hasOwnProperty("backgroundColor")){let i=vr(t.backgroundColor).alpha;i===void 0&&(i=1),t.renderer.setClearColor(new ot.Color(iy(1,t.backgroundColor)),i)}e.hasOwnProperty("backgroundImageUrl")&&(t.backgroundImageUrl?new ot.TextureLoader().load(t.backgroundImageUrl,i=>{i.colorSpace=ot.SRGBColorSpace,t.skysphere.material=new ot.MeshBasicMaterial({map:i,side:ot.BackSide}),t.skysphere.visible=!0,t.onBackgroundImageLoaded&&setTimeout(t.onBackgroundImageLoaded),!t.loadComplete&&n()}):(t.skysphere.visible=!1,t.skysphere.material.map=null,!t.loadComplete&&n())),e.hasOwnProperty("showNavInfo")&&(t.navInfo.style.display=t.showNavInfo?null:"none"),e.hasOwnProperty("lights")&&((e.lights||[]).forEach(i=>t.scene.remove(i)),t.lights.forEach(i=>t.scene.add(i))),e.hasOwnProperty("objects")&&((e.objects||[]).forEach(i=>t.scene.remove(i)),t.objects.forEach(i=>t.scene.add(i)));function n(){t.loadComplete=t.scene.visible=!0}}});function $3(t){return typeof t=="function"&&Function.prototype.toString.call(t).startsWith("class")}function Mp(t,e){(e==null||e>t.length)&&(e=t.length);for(var n=0,i=Array(e);n<e;n++)i[n]=t[n];return i}function Y3(t){if(Array.isArray(t))return Mp(t)}function za(t,e,n){return(e=Q3(e))in t?Object.defineProperty(t,e,{value:n,enumerable:!0,configurable:!0,writable:!0}):t[e]=n,t}function Z3(t){if(typeof Symbol!="undefined"&&t[Symbol.iterator]!=null||t["@@iterator"]!=null)return Array.from(t)}function K3(){throw new TypeError(`Invalid attempt to spread non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}function Ny(t,e){var n=Object.keys(t);if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(t);e&&(i=i.filter(function(r){return Object.getOwnPropertyDescriptor(t,r).enumerable})),n.push.apply(n,i)}return n}function hu(t){for(var e=1;e<arguments.length;e++){var n=arguments[e]!=null?arguments[e]:{};e%2?Ny(Object(n),!0).forEach(function(i){za(t,i,n[i])}):Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(n)):Ny(Object(n)).forEach(function(i){Object.defineProperty(t,i,Object.getOwnPropertyDescriptor(n,i))})}return t}function fu(t){return Y3(t)||Z3(t)||eI(t)||K3()}function J3(t,e){if(typeof t!="object"||!t)return t;var n=t[Symbol.toPrimitive];if(n!==void 0){var i=n.call(t,e);if(typeof i!="object")return i;throw new TypeError("@@toPrimitive must return a primitive value.")}return(e==="string"?String:Number)(t)}function Q3(t){var e=J3(t,"string");return typeof e=="symbol"?e:e+""}function eI(t,e){if(t){if(typeof t=="string")return Mp(t,e);var n={}.toString.call(t).slice(8,-1);return n==="Object"&&t.constructor&&(n=t.constructor.name),n==="Map"||n==="Set"?Array.from(t):n==="Arguments"||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)?Mp(t,e):void 0}}function Fy(t,e){var n=new e;return n._destructor&&n._destructor(),{linkProp:function(r){return{default:n[r](),onChange:function(o,a){a[t][r](o)},triggerUpdate:!1}},linkMethod:function(r){return function(s){for(var o=s[t],a=arguments.length,c=new Array(a>1?a-1:0),l=1;l<a;l++)c[l-1]=arguments[l];var u=o[r].apply(o,c);return u===o?this:u}}}}var bp=window.THREE?window.THREE:{AmbientLight:zr,DirectionalLight:ra,REVISION:"180"},tI=170,Uy=Fy("forceGraph",Hd),nI=Object.assign.apply(Object,fu(["jsonUrl","graphData","numDimensions","dagMode","dagLevelDistance","dagNodeFilter","onDagError","nodeRelSize","nodeId","nodeVal","nodeResolution","nodeColor","nodeAutoColorBy","nodeOpacity","nodeVisibility","nodeThreeObject","nodeThreeObjectExtend","nodePositionUpdate","linkSource","linkTarget","linkVisibility","linkColor","linkAutoColorBy","linkOpacity","linkWidth","linkResolution","linkCurvature","linkCurveRotation","linkMaterial","linkThreeObject","linkThreeObjectExtend","linkPositionUpdate","linkDirectionalArrowLength","linkDirectionalArrowColor","linkDirectionalArrowRelPos","linkDirectionalArrowResolution","linkDirectionalParticles","linkDirectionalParticleSpeed","linkDirectionalParticleOffset","linkDirectionalParticleWidth","linkDirectionalParticleColor","linkDirectionalParticleResolution","linkDirectionalParticleThreeObject","forceEngine","d3AlphaDecay","d3VelocityDecay","d3AlphaMin","ngraphPhysics","warmupTicks","cooldownTicks","cooldownTime","onEngineTick","onEngineStop"].map(function(t){return za({},t,Uy.linkProp(t))}))),iI=Object.assign.apply(Object,fu(["refresh","getGraphBbox","d3Force","d3ReheatSimulation","emitParticle"].map(function(t){return za({},t,Uy.linkMethod(t))}))),uu=Fy("renderObjs",xp),rI=Object.assign.apply(Object,fu(["width","height","backgroundColor","showNavInfo","enablePointerInteraction"].map(function(t){return za({},t,uu.linkProp(t))}))),sI=Object.assign.apply(Object,fu(["lights","cameraPosition","postProcessingComposer"].map(function(t){return za({},t,uu.linkMethod(t))})).concat([{graph2ScreenCoords:uu.linkMethod("getScreenCoords"),screen2GraphCoords:uu.linkMethod("getSceneCoords")}])),zy=dr({props:hu(hu({nodeLabel:{default:"name",triggerUpdate:!1},linkLabel:{default:"name",triggerUpdate:!1},linkHoverPrecision:{default:1,onChange:function(e,n){return n.renderObjs.lineHoverPrecision(e)},triggerUpdate:!1},enableNavigationControls:{default:!0,onChange:function(e,n){var i=n.renderObjs.controls();i&&(i.enabled=e,e&&i.domElement&&i.domElement.dispatchEvent(new PointerEvent("pointerup")))},triggerUpdate:!1},enableNodeDrag:{default:!0,triggerUpdate:!1},onNodeDrag:{default:function(){},triggerUpdate:!1},onNodeDragEnd:{default:function(){},triggerUpdate:!1},onNodeClick:{triggerUpdate:!1},onNodeRightClick:{triggerUpdate:!1},onNodeHover:{triggerUpdate:!1},onLinkClick:{triggerUpdate:!1},onLinkRightClick:{triggerUpdate:!1},onLinkHover:{triggerUpdate:!1},onBackgroundClick:{triggerUpdate:!1},onBackgroundRightClick:{triggerUpdate:!1},showPointerCursor:{default:!0,triggerUpdate:!1}},nI),rI),methods:hu(hu({zoomToFit:function(e,n,i){for(var r,s=arguments.length,o=new Array(s>3?s-3:0),a=3;a<s;a++)o[a-3]=arguments[a];return e.renderObjs.fitToBbox((r=e.forceGraph).getGraphBbox.apply(r,o),n,i),this},pauseAnimation:function(e){return e.animationFrameRequestId!==null&&(cancelAnimationFrame(e.animationFrameRequestId),e.animationFrameRequestId=null),this},resumeAnimation:function(e){return e.animationFrameRequestId===null&&this._animationCycle(),this},_animationCycle:function(e){e.enablePointerInteraction&&(this.renderer().domElement.style.cursor=null),e.forceGraph.tickFrame(),e.renderObjs.tick(),e.animationFrameRequestId=requestAnimationFrame(this._animationCycle)},scene:function(e){return e.renderObjs.scene()},camera:function(e){return e.renderObjs.camera()},renderer:function(e){return e.renderObjs.renderer()},controls:function(e){return e.renderObjs.controls()},tbControls:function(e){return e.renderObjs.tbControls()},_destructor:function(){this.pauseAnimation(),this.graphData({nodes:[],links:[]})}},iI),sI),stateInit:function(e){var n=e.controlType,i=e.rendererConfig,r=e.extraRenderers,s=new Hd;return{forceGraph:s,renderObjs:xp({controlType:n,rendererConfig:i,extraRenderers:r}).objects([s]).lights([new bp.AmbientLight(13421772,Math.PI),new bp.DirectionalLight(16777215,.6*Math.PI)])}},init:function(e,n){e.innerHTML="",e.appendChild(n.container=document.createElement("div")),n.container.style.position="relative";var i=document.createElement("div");n.container.appendChild(i),n.renderObjs(i);var r=n.renderObjs.camera(),s=n.renderObjs.renderer(),o=n.renderObjs.controls();o.enabled=!!n.enableNavigationControls,n.lastSetCameraZ=r.position.z;var a;n.container.appendChild(a=document.createElement("div")),a.className="graph-info-msg",a.textContent="",n.forceGraph.onLoading(function(){a.textContent="Loading..."}).onFinishLoading(function(){a.textContent=""}).onUpdate(function(){n.graphData=n.forceGraph.graphData(),r.position.x===0&&r.position.y===0&&r.position.z===n.lastSetCameraZ&&n.graphData.nodes.length&&(r.lookAt(n.forceGraph.position),n.lastSetCameraZ=r.position.z=Math.cbrt(n.graphData.nodes.length)*tI)}).onFinishUpdate(function(){if(n._dragControls){var c=n.graphData.nodes.find(function(u){return u.__initialFixedPos&&!u.__disposeControlsAfterDrag});c?c.__disposeControlsAfterDrag=!0:n._dragControls.dispose(),n._dragControls=void 0}if(n.enableNodeDrag&&n.enablePointerInteraction&&n.forceEngine==="d3"){var l=n._dragControls=new uh(n.graphData.nodes.map(function(u){return u.__threeObj}).filter(function(u){return u}),r,s.domElement);l.addEventListener("dragstart",function(u){var h=$i(u.object);if(h){o.enabled=!1,u.object.__initialPos=u.object.position.clone(),u.object.__prevPos=u.object.position.clone();var f=h.__data;!f.__initialFixedPos&&(f.__initialFixedPos={fx:f.fx,fy:f.fy,fz:f.fz}),!f.__initialPos&&(f.__initialPos={x:f.x,y:f.y,z:f.z}),["x","y","z"].forEach(function(d){return f["f".concat(d)]=f[d]}),s.domElement.classList.add("grabbable")}}),l.addEventListener("drag",function(u){var h=$i(u.object);if(h){if(!u.object.hasOwnProperty("__graphObjType")){var f=u.object.__initialPos,d=u.object.__prevPos,m=u.object.position;h.position.add(m.clone().sub(d)),d.copy(m),m.copy(f)}var _=h.__data,g=h.position,p={x:g.x-_.x,y:g.y-_.y,z:g.z-_.z};["x","y","z"].forEach(function(x){return _["f".concat(x)]=_[x]=g[x]}),n.forceGraph.d3AlphaTarget(.3).resetCountdown(),_.__dragged=!0,n.onNodeDrag(_,p)}}),l.addEventListener("dragend",function(u){var h=$i(u.object);if(h){delete u.object.__initialPos,delete u.object.__prevPos;var f=h.__data;f.__disposeControlsAfterDrag&&(l.dispose(),delete f.__disposeControlsAfterDrag);var d=f.__initialFixedPos,m=f.__initialPos,_={x:m.x-f.x,y:m.y-f.y,z:m.z-f.z};if(d&&(["x","y","z"].forEach(function(p){var x="f".concat(p);d[x]===void 0&&delete f[x]}),delete f.__initialFixedPos,delete f.__initialPos,f.__dragged&&(delete f.__dragged,n.onNodeDragEnd(f,_))),n.forceGraph.d3AlphaTarget(0).resetCountdown(),n.enableNavigationControls){var g;o.enabled=!0,o._status&&((g=o._onPointerCancel)===null||g===void 0||g.call(o)),o.domElement&&o.domElement.ownerDocument&&o.domElement.ownerDocument.dispatchEvent(new PointerEvent("pointerup",{pointerType:"touch"}))}s.domElement.classList.remove("grabbable")}})}}),bp.REVISION<155&&(n.renderObjs.renderer().useLegacyLights=!1),n.renderObjs.hoverOrderComparator(function(c,l){var u=$i(c);if(!u)return 1;var h=$i(l);if(!h)return-1;var f=function(m){return m.__graphObjType==="node"};return f(h)-f(u)}).tooltipContent(function(c){var l=$i(c);return l&&et(n["".concat(l.__graphObjType,"Label")])(l.__data)||""}).hoverDuringDrag(!1).onHover(function(c){var l=$i(c);if(l!==n.hoverObj){var u=n.hoverObj?n.hoverObj.__graphObjType:null,h=n.hoverObj?n.hoverObj.__data:null,f=l?l.__graphObjType:null,d=l?l.__data:null;if(u&&u!==f){var m=n["on".concat(u==="node"?"Node":"Link","Hover")];m&&m(null,h)}if(f){var _=n["on".concat(f==="node"?"Node":"Link","Hover")];_&&_(d,u===f?h:null)}s.domElement.classList[(l&&n["on".concat(f==="node"?"Node":"Link","Click")]||!l&&n.onBackgroundClick)&&et(n.showPointerCursor)(d)?"add":"remove"]("clickable"),n.hoverObj=l}}).clickAfterDrag(!1).onClick(function(c,l){var u=$i(c);if(u){var h=n["on".concat(u.__graphObjType==="node"?"Node":"Link","Click")];h&&h(u.__data,l)}else n.onBackgroundClick&&n.onBackgroundClick(l)}).onRightClick(function(c,l){var u=$i(c);if(u){var h=n["on".concat(u.__graphObjType==="node"?"Node":"Link","RightClick")];h&&h(u.__data,l)}else n.onBackgroundRightClick&&n.onBackgroundRightClick(l)}),this._animationCycle()}});function $i(t){for(var e=t;e&&!e.hasOwnProperty("__graphObjType");)e=e.parent;return e}var ky={name:"LuminosityHighPassShader",uniforms:{tDiffuse:{value:null},luminosityThreshold:{value:1},smoothWidth:{value:1},defaultColor:{value:new Fe(0)},defaultOpacity:{value:0}},vertexShader:`

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

		}`};var fo=class t extends On{constructor(e,n=1,i,r){super(),this.strength=n,this.radius=i,this.threshold=r,this.resolution=e!==void 0?new ie(e.x,e.y):new ie(256,256),this.clearColor=new Fe(0,0,0),this.needsSwap=!1,this.renderTargetsHorizontal=[],this.renderTargetsVertical=[],this.nMips=5;let s=Math.round(this.resolution.x/2),o=Math.round(this.resolution.y/2);this.renderTargetBright=new rn(s,o,{type:qn}),this.renderTargetBright.texture.name="UnrealBloomPass.bright",this.renderTargetBright.texture.generateMipmaps=!1;for(let u=0;u<this.nMips;u++){let h=new rn(s,o,{type:qn});h.texture.name="UnrealBloomPass.h"+u,h.texture.generateMipmaps=!1,this.renderTargetsHorizontal.push(h);let f=new rn(s,o,{type:qn});f.texture.name="UnrealBloomPass.v"+u,f.texture.generateMipmaps=!1,this.renderTargetsVertical.push(f),s=Math.round(s/2),o=Math.round(o/2)}let a=ky;this.highPassUniforms=Gi.clone(a.uniforms),this.highPassUniforms.luminosityThreshold.value=r,this.highPassUniforms.smoothWidth.value=.01,this.materialHighPassFilter=new Bt({uniforms:this.highPassUniforms,vertexShader:a.vertexShader,fragmentShader:a.fragmentShader}),this.separableBlurMaterials=[];let c=[3,5,7,9,11];s=Math.round(this.resolution.x/2),o=Math.round(this.resolution.y/2);for(let u=0;u<this.nMips;u++)this.separableBlurMaterials.push(this._getSeparableBlurMaterial(c[u])),this.separableBlurMaterials[u].uniforms.invSize.value=new ie(1/s,1/o),s=Math.round(s/2),o=Math.round(o/2);this.compositeMaterial=this._getCompositeMaterial(this.nMips),this.compositeMaterial.uniforms.blurTexture1.value=this.renderTargetsVertical[0].texture,this.compositeMaterial.uniforms.blurTexture2.value=this.renderTargetsVertical[1].texture,this.compositeMaterial.uniforms.blurTexture3.value=this.renderTargetsVertical[2].texture,this.compositeMaterial.uniforms.blurTexture4.value=this.renderTargetsVertical[3].texture,this.compositeMaterial.uniforms.blurTexture5.value=this.renderTargetsVertical[4].texture,this.compositeMaterial.uniforms.bloomStrength.value=n,this.compositeMaterial.uniforms.bloomRadius.value=.1;let l=[1,.8,.6,.4,.2];this.compositeMaterial.uniforms.bloomFactors.value=l,this.bloomTintColors=[new R(1,1,1),new R(1,1,1),new R(1,1,1),new R(1,1,1),new R(1,1,1)],this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,this.copyUniforms=Gi.clone(lo.uniforms),this.blendMaterial=new Bt({uniforms:this.copyUniforms,vertexShader:lo.vertexShader,fragmentShader:lo.fragmentShader,blending:ar,depthTest:!1,depthWrite:!1,transparent:!0}),this._oldClearColor=new Fe,this._oldClearAlpha=1,this._basic=new Rn,this._fsQuad=new gr(null)}dispose(){for(let e=0;e<this.renderTargetsHorizontal.length;e++)this.renderTargetsHorizontal[e].dispose();for(let e=0;e<this.renderTargetsVertical.length;e++)this.renderTargetsVertical[e].dispose();this.renderTargetBright.dispose();for(let e=0;e<this.separableBlurMaterials.length;e++)this.separableBlurMaterials[e].dispose();this.compositeMaterial.dispose(),this.blendMaterial.dispose(),this._basic.dispose(),this._fsQuad.dispose()}setSize(e,n){let i=Math.round(e/2),r=Math.round(n/2);this.renderTargetBright.setSize(i,r);for(let s=0;s<this.nMips;s++)this.renderTargetsHorizontal[s].setSize(i,r),this.renderTargetsVertical[s].setSize(i,r),this.separableBlurMaterials[s].uniforms.invSize.value=new ie(1/i,1/r),i=Math.round(i/2),r=Math.round(r/2)}render(e,n,i,r,s){e.getClearColor(this._oldClearColor),this._oldClearAlpha=e.getClearAlpha();let o=e.autoClear;e.autoClear=!1,e.setClearColor(this.clearColor,0),s&&e.state.buffers.stencil.setTest(!1),this.renderToScreen&&(this._fsQuad.material=this._basic,this._basic.map=i.texture,e.setRenderTarget(null),e.clear(),this._fsQuad.render(e)),this.highPassUniforms.tDiffuse.value=i.texture,this.highPassUniforms.luminosityThreshold.value=this.threshold,this._fsQuad.material=this.materialHighPassFilter,e.setRenderTarget(this.renderTargetBright),e.clear(),this._fsQuad.render(e);let a=this.renderTargetBright;for(let c=0;c<this.nMips;c++)this._fsQuad.material=this.separableBlurMaterials[c],this.separableBlurMaterials[c].uniforms.colorTexture.value=a.texture,this.separableBlurMaterials[c].uniforms.direction.value=t.BlurDirectionX,e.setRenderTarget(this.renderTargetsHorizontal[c]),e.clear(),this._fsQuad.render(e),this.separableBlurMaterials[c].uniforms.colorTexture.value=this.renderTargetsHorizontal[c].texture,this.separableBlurMaterials[c].uniforms.direction.value=t.BlurDirectionY,e.setRenderTarget(this.renderTargetsVertical[c]),e.clear(),this._fsQuad.render(e),a=this.renderTargetsVertical[c];this._fsQuad.material=this.compositeMaterial,this.compositeMaterial.uniforms.bloomStrength.value=this.strength,this.compositeMaterial.uniforms.bloomRadius.value=this.radius,this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,e.setRenderTarget(this.renderTargetsHorizontal[0]),e.clear(),this._fsQuad.render(e),this._fsQuad.material=this.blendMaterial,this.copyUniforms.tDiffuse.value=this.renderTargetsHorizontal[0].texture,s&&e.state.buffers.stencil.setTest(!0),this.renderToScreen?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(i),this._fsQuad.render(e)),e.setClearColor(this._oldClearColor,this._oldClearAlpha),e.autoClear=o}_getSeparableBlurMaterial(e){let n=[];for(let i=0;i<e;i++)n.push(.39894*Math.exp(-.5*i*i/(e*e))/e);return new Bt({defines:{KERNEL_RADIUS:e},uniforms:{colorTexture:{value:null},invSize:{value:new ie(.5,.5)},direction:{value:new ie(.5,.5)},gaussianCoefficients:{value:n}},vertexShader:`varying vec2 vUv;
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
				}`})}_getCompositeMaterial(e){return new Bt({defines:{NUM_MIPS:e},uniforms:{blurTexture1:{value:null},blurTexture2:{value:null},blurTexture3:{value:null},blurTexture4:{value:null},blurTexture5:{value:null},bloomStrength:{value:1},bloomFactors:{value:null},bloomTintColors:{value:null},bloomRadius:{value:0}},vertexShader:`varying vec2 vUv;
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
				}`})}};fo.BlurDirectionX=new ie(1,0);fo.BlurDirectionY=new ie(0,1);var ka={name:"OutputShader",uniforms:{tDiffuse:{value:null},toneMappingExposure:{value:1}},vertexShader:`
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

		}`};var du=class extends On{constructor(){super(),this.uniforms=Gi.clone(ka.uniforms),this.material=new Jo({name:ka.name,uniforms:this.uniforms,vertexShader:ka.vertexShader,fragmentShader:ka.fragmentShader}),this._fsQuad=new gr(this.material),this._outputColorSpace=null,this._toneMapping=null}render(e,n,i){this.uniforms.tDiffuse.value=i.texture,this.uniforms.toneMappingExposure.value=e.toneMappingExposure,(this._outputColorSpace!==e.outputColorSpace||this._toneMapping!==e.toneMapping)&&(this._outputColorSpace=e.outputColorSpace,this._toneMapping=e.toneMapping,this.material.defines={},st.getTransfer(this._outputColorSpace)===lt&&(this.material.defines.SRGB_TRANSFER=""),this._toneMapping===fl?this.material.defines.LINEAR_TONE_MAPPING="":this._toneMapping===dl?this.material.defines.REINHARD_TONE_MAPPING="":this._toneMapping===pl?this.material.defines.CINEON_TONE_MAPPING="":this._toneMapping===ml?this.material.defines.ACES_FILMIC_TONE_MAPPING="":this._toneMapping===_l?this.material.defines.AGX_TONE_MAPPING="":this._toneMapping===vl?this.material.defines.NEUTRAL_TONE_MAPPING="":this._toneMapping===gl&&(this.material.defines.CUSTOM_TONE_MAPPING=""),this.material.needsUpdate=!0),this.renderToScreen===!0?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(n),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this._fsQuad.render(e))}dispose(){this.material.dispose(),this._fsQuad.dispose()}};var Er={online:{rotulo:"Online",icone:"i-online",peso:5},suspeito:{rotulo:"Online",icone:"i-online",peso:5,dica:"verificando"},instavel:{rotulo:"Inst\xE1vel",icone:"i-instavel",peso:2},offline:{rotulo:"Offline",icone:"i-offline",peso:0},inalcancavel:{rotulo:"Inalcan\xE7\xE1vel",icone:"i-inalcancavel",peso:1},pausado:{rotulo:"Pausado",icone:"i-pausado",peso:4},desconhecido:{rotulo:"Aguardando",icone:"i-desconhecido",peso:3}};var oI=/[\u0000-\u001f\u007f-\u009f\u00ad\u061c\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff\ufff9-\ufffb]/g,aI=45;function By(t){if(typeof t!="string")return"";let e=t.replace(oI,"").trim();return e.length>aI?"":e}function po(t){let e=2166136261;for(let n of new TextEncoder().encode(String(t)))e^=n,e=Math.imul(e,16777619)>>>0;return e>>>0}var Vy="#4CA878",Sp="#7A8194",Hy={online:{cor:Vy,forma:"cheia",pulsa:!1,treme:!1,opacidade:1},instavel:{cor:"#D9A441",forma:"anel",pulsa:!1,treme:!1,opacidade:1},suspeito:{cor:Vy,forma:"cheia",pulsa:!1,treme:!0,opacidade:1},offline:{cor:"#D97373",forma:"cruz",pulsa:!0,treme:!1,opacidade:1},pausado:{cor:Sp,forma:"translucida",pulsa:!1,treme:!1,opacidade:.45},inalcancavel:{cor:Sp,forma:"elo",pulsa:!1,treme:!1,opacidade:.7},desconhecido:{cor:Sp,forma:"anel",pulsa:!1,treme:!1,opacidade:.7}};function Ba(t){let e=Object.hasOwn(Hy,t)?t:"desconhecido";return Zi(Tn({},Hy[e]),{rotulo:Er[e].rotulo})}var Gy=["#7FB2E5","#B79CE8","#E58FB8","#E8A27C","#C9C46A","#6CC6B8","#9AA7F0","#D69AD6"],cI=/^#[0-9A-Fa-f]{6}$/;function wp(t){var n;let e=t==null?void 0:t.cor;return typeof e=="string"&&cI.test(e)?e:Gy[po(String((n=t==null?void 0:t.slug)!=null?n:""))%Gy.length]}function lI(t,e){return t>3e3||e!=null&&e<30?"agrupado":t>1e3?"reduzido":"completo"}function Ep(t=()=>performance.now()){let e=[],n=[];function i(){if(e.length<2)return null;let r=e[e.length-1]-e[0];return r<1e3?null:(e.length-1)*1e3/r}return{quadro(){let r=t();e.push(r);let s=r-3e3,o=0;for(;o<e.length&&e[o]<s;)o++;o&&(e=e.slice(o));let a=i();a!==null&&n.push({t:r,v:a});let c=r-3e4,l=0;for(;l<n.length&&n[l].t<c;)l++;l&&(n=n.slice(l))},media(){return i()},abaixoDe(r,s){if(!n.length)return!1;let o=n[n.length-1],a=null;for(let c=n.length-1;c>=0&&n[c].v<r;c--)a=n[c].t;return a===null?!1:o.t-a>=s*1e3}}}function Wy(t,e){return t!=null&&t>=50&&!e}var hI=24,uI=5,fI=6e4;function jy(t){return t.abaixoDe(hI,uI)}function Tp({total:t,agrupadoPorFps:e=!1,queda:n=!1,agora:i=0,ultimaEntrada:r=-1/0}){let s=lI(t,null);return s==="agrupado"?{nivel:"agrupado",agrupadoPorFps:!1,ultimaEntrada:r}:e?{nivel:"agrupado",agrupadoPorFps:!0,ultimaEntrada:r}:n&&i-r>=fI?{nivel:"agrupado",agrupadoPorFps:!0,ultimaEntrada:i}:{nivel:s,agrupadoPorFps:!1,ultimaEntrada:r}}function qy(t){return Zi(Tn({},t),{agrupadoPorFps:!1})}var Zy=["a","b","c","d","e"];var Yi=12,Va=230,Xy=60,pu=18*Math.PI/180,is=Math.PI*2,Ap=(t,e)=>po(`${t}#${e}`)/4294967296,$y=t=>((Number(t)||0)%Yi+Yi)%Yi;function mu(t){let e=t/Yi*is,n=Math.cos(e)*Va,i=t%2===0?Xy:-Xy,r=Math.sin(e)*Va;return{x:n,y:i*Math.cos(pu)-r*Math.sin(pu),z:i*Math.sin(pu)+r*Math.cos(pu)}}function dI(t,e,n){let i=Ap(e,1)*2-1,r=Math.sqrt(1-i*i),s=Ap(e,2)*is,o=18+Ap(e,3)*28;return{x:n.x+r*Math.cos(s)*o,y:n.y+i*o,z:n.z+r*Math.sin(s)*o}}var pI=5,mI=(t,e)=>t<e?-1:t>e?1:0,Cp=new Map;function gI(t){if(!Cp.has(t)){let e=[];for(let n=0;e.length<t;n++){let i=20+n*11,r=Math.max(1,Math.floor(is*i/pI));for(let s=0;s<r&&e.length<t;s++)e.push({r:n,i:s,n:r,raio:i})}Cp.set(t,e)}return Cp.get(t)}function _I(t,e,n,i){let r=mu(t),{r:s,i:o,n:a,raio:c}=gI(i)[n],l=(o+.5*(s%2))/a*is+s*.4;return{x:r.x+Math.cos(l)*c,y:r.y+Math.sin(l*2)*3,z:r.z+Math.sin(l)*c}}var mo=64,Yy=9;function vI(t){let e=t/Yi*is;return{x:Math.cos(e+.9)*120,y:0,z:Math.sin(e+.9)*120}}function yI(t,e,n){let i=t/Yi*is,r=(n%mo+.5)/mo,s=Math.floor(n/mo),o=60+r*260+s%8*Yy,a=i+r*2.6+.9;return{x:Math.cos(a)*o,y:Math.floor(s/8)*Yy,z:Math.sin(a)*o}}var xI=3.17;function bI(t){return Ky(t,Math.PI/2+t*xI,0,0)}function Ky(t,e,n,i){let r=90+t*26+n,s=t/Yi*Math.PI,o=t*.7,a=Math.cos(e)*r,c=Math.sin(e)*r,l=i*Math.cos(s)-c*Math.sin(s),u=i*Math.sin(s)+c*Math.cos(s);return{x:a*Math.cos(o)-u*Math.sin(o),y:l,z:a*Math.sin(o)+u*Math.cos(o)}}function MI(t,e,n){let i=Math.floor(n/mo),r=(n%mo+.5)/mo*is;return Ky(t,r,(i%8+1)*8,Math.floor(i/8)*8)}var Jy=t=>(t-(Yi-1)/2)*70,SI=t=>({x:Jy(t),y:90,z:0});function wI(t,e,n){let i=n%12,r=Math.floor(n/12);return{x:Jy(t)+(i-5.5)*5.5,y:40-r*6,z:i%2*4+r%2*3}}var Rp={a:{hub:mu,item:(t,e)=>dI(t,e,mu(t)),slots:!1},b:{hub:mu,item:_I},c:{hub:vI,item:yI},d:{hub:bI,item:MI},e:{hub:SI,item:wI}};function Qy(t,e,n){var c;let i=(c=Rp[t])!=null?c:Rp.a,r=Rp[t]?t:"a",s=new Map;s.set("srv",{x:0,y:r==="e"?200:0,z:0});let o=new Map;for(let l of[...e].sort((u,h)=>u.ordem-h.ordem||(u.slug<h.slug?-1:1)))o.set(l.slug,l.ordem),l.slug!=="sentinela"&&s.set(`h-${l.slug}`,i.hub($y(l.ordem)));let a=new Map;for(let l of n)a.has(l.classe)||a.set(l.classe,[]),a.get(l.classe).push(l.id);for(let[l,u]of a){let h=o.has(l)?$y(o.get(l)):po(String(l))%Yi;if(i.slots===!1){for(let _ of u)s.set(_,i.item(h,_));continue}let f=64;for(;f<2*u.length;)f*=4;let d=new Set,m=u.map(_=>({id:_,h:po(_)}));m.sort((_,g)=>_.h-g.h||mI(_.id,g.id));for(let{id:_,h:g}of m){let p=g%f;for(;d.has(p);)p=(p+1)%f;d.add(p),s.set(_,i.item(h,_,p,f))}}return s}var Ip=Math.PI/180,EI=1.15,TI=40,AI=.45,CI=(t,e)=>({x:t.x-e.x,y:t.y-e.y,z:t.z-e.z}),Pp=(t,e)=>({x:t.x+e.x,y:t.y+e.y,z:t.z+e.z}),Ha=(t,e)=>({x:t.x*e,y:t.y*e,z:t.z*e});var ex=(t,e)=>({x:t.y*e.z-t.z*e.y,y:t.z*e.x-t.x*e.z,z:t.x*e.y-t.y*e.x}),Dp=t=>Math.hypot(t.x,t.y,t.z);function tx(t){let e=Dp(t);return e<1e-9?{x:0,y:0,z:1}:Ha(t,1/e)}function nx(t,e,n=0,i=1){let r=0;for(let s of e)r=Math.max(r,Dp(CI(s,t)));return Math.max(i,r+n)}function RI(t,e,{aspecto:n=1,fracao:i=1,folga:r=EI}={}){let s=Math.tan(e*Ip/2),o=Math.max(.15,Math.min(i,n*i)),a=Math.atan(s*o);return t/Math.sin(a)*r}function PI(t,e,n=TI,i=AI){let r=e.x-t.x,s=e.z-t.z;Math.hypot(r,s)<1e-6&&(r=0,s=1);let o=Math.hypot(r,s);r/=o,s/=o;let a=n*Ip,c=Math.cos(a),l=Math.sin(a);return tx({x:r*c-s*l,y:i,z:r*l+s*c})}function ix({alvo:t,de:e,raio:n,fov:i,largura:r,altura:s,margens:o={}}){let{esquerda:a=0,direita:c=0,cima:l=0,baixo:u=0}=o,h=Math.max(1,r-a-c),f=Math.max(1,s-l-u),d=Math.min(h,f)/s,m=RI(n,i,{fracao:d}),_=PI(e,t),g=Ha(_,-1),p=ex(g,{x:0,y:1,z:0});Dp(p)<1e-6&&(p={x:1,y:0,z:0}),p=tx(p);let x=ex(p,g),y=2*m*Math.tan(i*Ip/2)/s,v=(a-c)/2,b=(u-l)/2,M=Pp(t,Pp(Ha(p,-v*y),Ha(x,-b*y)));return{camera:Pp(M,Ha(_,m)),olhar:M,distancia:m}}var Lp=1500,II={min:.72,max:1.12,referencia:420};function rx({ndc:t,distancia:e,largura:n,altura:i,margem:r=40}){if(!t||!(t.z>-1&&t.z<1)||!(e>0)||e>Lp)return{visivel:!1};let s=(t.x+1)/2*n,o=(1-t.y)/2*i;if(s<-r||s>n+r||o<-r||o>i+r)return{visivel:!1};let{min:a,max:c,referencia:l}=II,u=Math.min(c,Math.max(a,l/e));return{visivel:!0,x:Math.round(s),y:Math.round(o),escala:Math.round(u*100)/100}}function sx({x:t,y:e,largura:n,altura:i,palcoL:r,palcoA:s,desloque:o=0,folga:a=4}){if(!(t>=0&&t<=r&&e>=0&&e<=s))return{visivel:!1};let c=r-a-n/2,l=a+n/2,u=l>c?r/2:Math.min(c,Math.max(l,t)),h=s-a-i-o,f=a-o,d=f>h?f:Math.min(h,Math.max(f,e));return{visivel:!0,x:Math.round(u),y:Math.round(d)}}var ox="#BCC2CE",ax="rgba(14,16,22,0.94)";function cx({raio:t,distancia:e,fovGraus:n,alturaPx:i}){if(!(i>0))return 0;if(!(e>0))return 1/0;let r=Math.tan(n*Math.PI/360);return 2*t*i/(2*e*r)}function lx({diametroPx:t,totalNos:e}){return e<=3e3&&t>=24}function hx(t){return t>0?Math.min(1,t/180):0}function ux(t){return Math.min(15,Math.max(11,Math.round(t*.3)))}function fx({limite:t,criar:e,liberar:n}){let i=new Map;return{obter(r,s){let o=i.get(r);if(o)return i.delete(r),o.quadro=s,i.set(r,o),o.recurso;if(o={recurso:e(r),quadro:s},i.set(r,o),i.size>t)for(let[a,c]of i){if(i.size<=t)break;c.quadro>=s||(i.delete(a),n(c.recurso))}return o.recurso},get tamanho(){return i.size},liberarTudo(){for(let r of i.values())n(r.recurso);i.clear()}}}function dx(t,e,n=[]){let i=[...n];return t.map(r=>{for(let s of i)if(Math.abs(r.x-s.x)*2<r.l+s.l+2*e&&Math.abs(r.y-s.y)*2<r.a+s.a+2*e)return!1;return i.push(r),!0})}var _u="#0e1016",px="#8793E8",gx="#68C7BC",DI="#dfe4ff",vu=.15,pn={equipamento:2.4,haloEquipamento:13,marca:8.5,classe:6.5,haloClasse:44,nucleo:14,haloServidor:110},rs=()=>{};function _x(){let t=new Map;return{obter(e,n){let i=t.get(e);if(!i){i=n();let r=i.dispose.bind(i);i.dispose=()=>{},i.liberarDeVerdade=r,t.set(e,i)}return i},get tamanho(){return t.size},liberar(){for(let e of t.values())e.liberarDeVerdade();t.clear()}}}var gu=(t,e)=>{let n=document.createElement("canvas");return n.width=t,n.height=e,n};function Np(t){let e=new jo(t);return e.colorSpace=Yt,e}var LI=t=>t<.25?1-.45*t/.25:.55*(1-(t-.25)/.75);function vx(t,e){let n=t.getContext("2d");n.clearRect(0,0,128,128);let i=n.createRadialGradient(64,64,0,64,64,64);for(let r=0;r<=16;r++){let s=r/16;i.addColorStop(s,`rgba(255,255,255,${(LI(s)**e).toFixed(4)})`)}n.fillStyle=i,n.fillRect(0,0,128,128)}function Fp(t){return t.obter("tex:brilho",()=>{let e=gu(128,128);vx(e,1);let n=Np(e);return n.userData.canvas=e,n})}function Up(t,e=!0){let n=Fp(t);vx(n.userData.canvas,e?2.2:1),n.needsUpdate=!0}function yx(t,e){return t.obter(`tex:${e}`,()=>{let n=gu(64,64),i=n.getContext("2d");return i.strokeStyle="#ffffff",i.lineCap="round",e==="anel"?(i.lineWidth=5,i.beginPath(),i.arc(32,32,24,0,Math.PI*2),i.stroke()):e==="elo"?(i.lineWidth=6,i.beginPath(),i.arc(32,32,24,Math.PI*.28,Math.PI*1.72),i.stroke()):(i.lineWidth=8,i.beginPath(),i.moveTo(16,16),i.lineTo(48,48),i.moveTo(48,16),i.lineTo(16,48),i.stroke()),Np(n)})}function xx(t){let e=t.obter("mat:selecao",()=>new mi({map:yx(t,"anel"),color:gx,transparent:!0,depthTest:!1,depthWrite:!1})),n=new gi(e);return n.raycast=rs,n.renderOrder=10,n.visible=!1,n}var bx=(t,e)=>e?vu:t;function Mx(t,e,n,i){let r=bx(n,i);return t.obter(`mat:${e}:${r}`,()=>new Qo({color:e,emissive:e,emissiveIntensity:.6,roughness:.45,metalness:.1,transparent:r<1,opacity:r,depthWrite:r>=1}))}function Sx(t,e,n,i){let r=bx(n,i);return t.obter(`halo:${e}:${r}`,()=>new mi({map:Fp(t),color:e,transparent:!0,opacity:r,depthWrite:!1,blending:ar}))}function OI(t,e,n,i){let r=i?vu:.95;return t.obter(`marca:${e}:${n}:${r}`,()=>new mi({map:yx(t,e),color:n,transparent:!0,opacity:r,depthWrite:!1,depthTest:!1}))}var zp=(t,e,n)=>t.obter(`geo:esfera:${e.toFixed(2)}:${n}`,()=>new ki(e,n,n));function wx(t,e,n){let i=new tn,r=new gi,s=new Ct(zp(t,pn.equipamento,n)),o=new gi;return o.renderOrder=10,i.add(r,s,o),i.userData={halo:r,esfera:s,marca:o,escala:e,aparencia:null,semente:Math.random()*100},i}function Ga(t,e,n,i){let r=Ba(n),s=t.userData,o=s.escala;s.aparencia=r,s.esfera.material=Mx(e,r.cor,r.opacidade,i),s.halo.material=Sx(e,r.cor,.55*r.opacidade,i);let a=pn.haloEquipamento*o;s.halo.scale.set(a,a,1),s.esfera.scale.setScalar(o),s.esfera.position.set(0,0,0);let c=r.forma==="anel"||r.forma==="cruz"||r.forma==="elo";if(s.marca.visible=c,c){s.marca.material=OI(e,r.forma,r.cor,i);let l=pn.marca*o*(r.forma==="cruz"?.8:1);s.marca.scale.set(l,l,1)}return r}function Ex(t,e,{esmaecido:n=!1,resolucao:i=16}={}){let r=wx(t,1,i);return Ga(r,t,e,n),r}function Tx(t,e){let{raio:n,estado:i,esmaecido:r=!1}=e,s=wx(t,n/pn.equipamento,24);return Ga(s,t,i,r),s}var Op=30,mx=`600 ${Op}px ui-monospace, "Cascadia Mono", "SF Mono", Consolas, monospace`,NI=14,FI=9;function Ax(t){let e=gu(2,2).getContext("2d");e.font=mx;let n=Math.ceil(e.measureText(t).width)+2*NI,i=Op+2*FI,r=gu(n,i),s=r.getContext("2d"),o=i/2;s.fillStyle=ax,s.beginPath(),s.moveTo(o,0),s.lineTo(n-o,0),s.arc(n-o,o,o,-Math.PI/2,Math.PI/2),s.lineTo(o,i),s.arc(o,o,o,Math.PI/2,Math.PI*3/2),s.closePath(),s.fill(),s.font=mx,s.fillStyle=ox,s.textAlign="center",s.textBaseline="middle",s.fillText(t,n/2,i/2+1);let a=Np(r);return a.userData.aspecto=n/i,a.userData.letra=Op/i,a.liberarDeVerdade=a.dispose.bind(a),a.dispose=()=>{},a}function Cx(){let t=new gi(new mi({transparent:!0,opacity:0,depthTest:!1,depthWrite:!1,fog:!1}));return t.raycast=rs,t.renderOrder=12,t.visible=!1,t}function Rx(t,{cor:e,esmaecido:n=!1}){let i=new tn,r=new gi;r.raycast=rs,r.scale.set(pn.haloClasse,pn.haloClasse,1);let s=new Ct(zp(t,pn.classe,32));return i.add(r,s),i.userData={halo:r,esfera:s},kp(i,t,e,n),i}function kp(t,e,n,i){let r=t.userData;r.esfera.material=Mx(e,n,1,i),r.halo.material=Sx(e,n,.9,i)}function Px(t){let e=new tn,n=new gi(t.obter("srv:halo",()=>new mi({map:Fp(t),color:px,transparent:!0,depthWrite:!1,blending:ar})));n.scale.set(pn.haloServidor,pn.haloServidor,1),n.raycast=rs;let i=new Ct(zp(t,pn.nucleo,48),t.obter("srv:nucleo",()=>new Rn({color:DI}))),r=t.obter("srv:geo-anel",()=>new Zo(26,.6,8,96)),s=new Ct(r,t.obter("srv:anel1",()=>new Rn({color:gx,transparent:!0,opacity:.7}))),o=new Ct(r,t.obter("srv:anel2",()=>new Rn({color:px,transparent:!0,opacity:.7})));return o.scale.setScalar(1.35),s.raycast=rs,o.raycast=rs,e.add(n,i,s,o),e.userData={aneis:[s,o]},e}function Ix(t=1500,e=366){let n=e,i=()=>(n=n*16807%2147483647)/2147483647,r=new Float32Array(t*3);for(let c=0;c<t;c++){let l=i()*2-1,u=Math.sqrt(1-l*l),h=i()*Math.PI*2,f=1800+i()*1400;r[c*3]=u*Math.cos(h)*f,r[c*3+1]=l*f,r[c*3+2]=u*Math.sin(h)*f}let s=new Mt;s.setAttribute("position",new ht(r,3));let o=new Ns({color:"#c8d0ff",size:1.6,sizeAttenuation:!1,transparent:!0,opacity:.55,depthWrite:!1,fog:!1}),a=new Wo(s,o);return a.raycast=rs,a}var ja="sentinela",Wa=t=>t&&t.classe!==ja;function Bp(t){let e=new Map;for(let[n,i]of t)Wa(i)&&e.set(n,{classe:i.classe,estado:i.estado});return e}function Lx(t,e){let n=[],i=[],r=[],s=[];for(let[o,a]of e){if(!Wa(a))continue;let c=t.get(o);c?c.classe!==a.classe?r.push(o):c.estado!==a.estado&&s.push(o):n.push(o)}for(let o of t.keys())Wa(e.get(o))||i.push(o);return{adicionar:n,remover:i,mudouClasse:r,mudouEstado:s}}function Ox(t){let e=new Map;for(let n of t.itens.values())Wa(n)&&e.set(n.classe,(e.get(n.classe)||0)+1);return t.ordemClasses.filter(n=>n&&n.slug!==ja).map(n=>({slug:n.slug,nome:n.nome,cor:n.cor,ordem:n.ordem,total:e.get(n.slug)||0}))}var Dx=t=>Object.hasOwn(Er,t)?Er[t].peso:Er.desconhecido.peso,UI=t=>Object.hasOwn(Er,t)?t:"desconhecido";function zI(t){let e=null;for(let n of t){let i=UI(n);(e===null||Dx(i)<Dx(e))&&(e=i)}return e!=null?e:"desconhecido"}function Vp(t){let e=new Map;for(let i of t.values())Wa(i)&&(e.has(i.classe)||e.set(i.classe,[]),e.get(i.classe).push(i.estado));let n=new Map;for(let[i,r]of e)n.set(i,{total:r.length,pior:zI(r)});return n}function Hp(t){let e=Math.max(0,Number(t)||0);return Math.min(30,5+2.2*Math.cbrt(e))}function yu(t,e){return`${t!=null?t:""} \xB7 ${e}`.trim()}function Nx(t){return((Number(t)||0)%12+12)%12%2===1}var Fx={x:0,y:260,z:520},Ux={x:0,y:60,z:620},zx={x:0,y:40,z:0},BI={a:.18,b:.07,c:.05,d:.1,e:.12},VI={a:!0,b:!0,c:!1,d:!1,e:!0},HI=900,kx=1200,GI=3e3,Bx=Va+40,Vx={lado:60,cima:32},WI=Lp-150,jI=250,qI=300,qa=4,Hx=t=>Zy.includes(t)?t:"a",XI=t=>t*t*(3-2*t);function $I(t,e){let n=parseInt(t.slice(1),16);return`rgba(${n>>16&255},${n>>8&255},${n&255},${e})`}function Gx(t,e={}){let n=e.aoClicarEquipamento||null,i=typeof e.margens=="function"?e.margens:()=>({}),r=e.aoClicarClasse||(()=>{}),s=!!e.movimentoReduzido,o=e.particulas!==!1,a=e.interativo!==!1,c=!!e.caberNaTela,l=e.rotulosIp===!0,u=typeof e.obstaculos=="function"?e.obstaculos:()=>[],h={estilo:Hx(e.estilo),nivel:"completo",total:0,agrupadoPorFps:!1,ultimaEntradaFps:-1/0,foco:null,girando:!s,store:null,pausado:!1,destruido:!1,bloom:null,inicioRender:null,ultimoCheque:0,ultimaLeitura:-1/0,transicao:null},f=_x(),d=Ep(),m=null,_=fx({limite:qI,criar:Ax,liberar:k=>k.liberarDeVerdade()}),g=0,p=0,x=[],y=[],v={id:"srv",tipo:"servidor",fx:0,fy:0,fz:0,x:0,y:0,z:0},b=new Map,M=new Map,A=new Map,C=new Map,T=new Set,w=new Map,P=null;t.classList.add("teia-cena");let z=document.createElement("div"),U=new zy(t,{controlType:"orbit",rendererConfig:{antialias:!0,alpha:!1,powerPreference:"high-performance"}});U.backgroundColor(_u).showNavInfo(!1).enableNodeDrag(!1).width(t.clientWidth||window.innerWidth).height(t.clientHeight||window.innerHeight).nodeThreeObject(X).nodeLabel(je).linkWidth(k=>k.tronco?1.2:0).linkDirectionalParticleWidth(2.2).linkDirectionalParticleSpeed(.006).linkDirectionalParticleColor(k=>k.cor).cooldownTicks(160).onNodeClick(Be).onNodeHover(k=>{t.style.cursor=k?"pointer":""}),it();let O=t.querySelector(".float-tooltip-kap");O&&Object.assign(O.style,{position:"absolute",pointerEvents:"none",padding:"4px 8px",borderRadius:"8px",font:"12px system-ui, sans-serif",color:"#E8EBF2",background:"rgba(27,31,40,.85)",whiteSpace:"nowrap",maxWidth:"min(360px, 80vw)",overflow:"hidden",textOverflow:"ellipsis"});let D=t.querySelector(".graph-info-msg");D&&(D.style.display="none");let V=document.createElement("div");V.className="teia-rotulos",V.setAttribute("aria-hidden","true"),t.appendChild(V);let Q=new Map,j=new R,ae=U.scene();ae.background=new Fe(_u),ae.fog=new Vo(_u,.0012);let ye=new ia(14673151,2.4,0,0);U.lights([new zr(16777215,.35),ye]);let Z=Ix(1500);ae.add(Z);let re=xx(f);ae.add(re);let me=U.controls();me.minDistance=60,me.maxDistance=1600,me.enableDamping=!s,me.dampingFactor=.08,me.autoRotateSpeed=.6,me.autoRotate=h.girando,a||(me.enableRotate=!1,me.enableZoom=!1,me.enablePan=!1,U.enablePointerInteraction(!1).onNodeClick(null).onNodeHover(null));let Ge=U.d3Force("charge");U.d3Force("center",null);{let k=h.estilo==="e"?Ux:Fx;U.cameraPosition(c?te(k):k,h.estilo==="e"?zx:{x:0,y:0,z:0})}function Ne(k){return h.foco!==null&&k!==h.foco}function X(k){if(k.tipo==="servidor")return Px(f);if(k.tipo==="classe")return Rx(f,{cor:k.cor,esmaecido:Ne(k.slug)});if(k.tipo==="grupo"){let W=Tx(f,{raio:Hp(k.total),estado:k.estado,esmaecido:Ne(k.slug)});return ee(k,W),W}let Y=Ex(f,k.estado,{esmaecido:Ne(k.classe),resolucao:h.nivel==="completo"?16:8});return ee(k,Y),Y}function ee(k,Y){let W=Y.userData.aparencia;!s&&W&&(W.pulsa||W.treme)?T.add(k):T.delete(k)}function be(k){let Y=k.__threeObj;Y&&(k.tipo==="classe"?kp(Y,f,k.cor,Ne(k.slug)):k.tipo==="grupo"?(Ga(Y,f,k.estado,Ne(k.slug)),ee(k,Y)):k.tipo==="equip"&&(Ga(Y,f,k.estado,Ne(k.classe)),ee(k,Y)))}function je(k){var Y,W;if(k.tipo==="servidor")z.textContent="Sentinela";else if(k.tipo==="classe")z.textContent=yu(k.nome,k.total);else if(k.tipo==="grupo")z.textContent=`${yu(k.nome,k.total)} \xB7 pior: ${Ba(k.estado).rotulo}`;else{let $=(Y=h.store)==null?void 0:Y.itens.get(k.id);z.textContent=`${(W=$==null?void 0:$.nome)!=null?W:k.id} \xB7 ${Ba(k.estado).rotulo}`}return z}function Le(k){let Y=k.slug;return Ne(Y)?$I(k.cor,vu):k.cor}function it(){let k=VI[h.estilo],Y=o&&!s&&h.nivel==="completo";t.dataset.particulas=Y?"sim":"nao",U.linkColor(W=>Le(W)).linkOpacity(BI[h.estilo]).linkVisibility(W=>W.tronco||k).linkDirectionalParticles(W=>W.tronco&&Y?4:0)}function Nt(k,Y,W,$,pe){let ue=`${k.id}>${Y.id}`,Ce=C.get(ue);return(!Ce||Ce.cor!==W||Ce.source!==k||Ce.target!==Y)&&(Ce={source:k,target:Y,cor:W,slug:$,tronco:pe,chave:ue},C.set(ue,Ce)),Ce}function N(){let k=[];for(let Y of h.store.itens.values())Y.classe!==ja&&k.push(Y);return k}function wt(k){let Y=new Set;for(let W of k){Y.add(W.slug);let $=wp(W),pe=M.get(W.slug);pe?(pe.nome!==W.nome||pe.cor!==$||pe.total!==W.total)&&(Object.assign(pe,{nome:W.nome,cor:$,total:W.total}),be(pe)):(pe={id:`h-${W.slug}`,tipo:"classe",slug:W.slug,ordem:W.ordem,nome:W.nome,cor:$,total:W.total},M.set(W.slug,pe))}for(let W of[...M.keys()])Y.has(W)||M.delete(W)}function $e(k){let Y=Vp(h.store.itens),W=new Set;for(let $ of k){let pe=Y.get($.slug);if(!pe)continue;W.add($.slug);let ue=wp($),Ce=A.get($.slug);Ce?Ce.total!==pe.total?(A.set($.slug,Zi(Tn({},Ce),{__threeObj:void 0,nome:$.nome,cor:ue,total:pe.total,estado:pe.pior})),T.delete(Ce)):(Ce.estado!==pe.pior||Ce.nome!==$.nome||Ce.cor!==ue)&&(Object.assign(Ce,{nome:$.nome,cor:ue,estado:pe.pior}),be(Ce)):(Ce={id:`g-${$.slug}`,tipo:"grupo",slug:$.slug,ordem:$.ordem,nome:$.nome,cor:ue,total:pe.total,estado:pe.pior},A.set($.slug,Ce))}for(let[$,pe]of[...A])W.has($)||(A.delete($),T.delete(pe))}function We(k){let Y=h.store.itens;for(let W of k.remover)T.delete(b.get(W)),b.delete(W);for(let W of k.adicionar){let $=Y.get(W);b.set(W,{id:W,tipo:"equip",classe:$.classe,estado:$.estado})}for(let W of k.mudouClasse){let $=b.get(W),pe=Y.get(W);$&&($.classe=pe.classe,$.estado=pe.estado,$.semPosicao=!0,be($))}for(let W of k.mudouEstado){let $=b.get(W);$&&($.estado=Y.get(W).estado,be($))}for(let W of k.adicionar)b.get(W).semPosicao=!0}function Ee({todos:k=!1,animar:Y=!1}={}){var Ce,Ft,E;let W=Qy(h.estilo,h.store.ordemClasses,N()),$=h.estilo!=="a",pe=W.get("srv");ye.position.set(pe.x,pe.y,pe.z);let ue=new Map([[v,pe]]);for(let F of M.values()){let H=W.get(F.id);H&&ue.set(F,H)}for(let F of A.values()){let H=W.get(`h-${F.slug}`);H&&ue.set(F,H)}for(let F of b.values()){let H=W.get(F.id);H&&($?ue.set(F,H):(k||F.semPosicao)&&(delete F.fx,delete F.fy,delete F.fz,Object.assign(F,{x:H.x,y:H.y,z:H.z,vx:0,vy:0,vz:0})),F.semPosicao=!1)}if(Y&&!s){let F=new Map;for(let[H,q]of ue)F.set(H,{x:(Ce=H.x)!=null?Ce:q.x,y:(Ft=H.y)!=null?Ft:q.y,z:(E=H.z)!=null?E:q.z});h.transicao={inicio:null,de:F,para:ue}}else{h.transicao=null;for(let[F,H]of ue)Object.assign(F,{fx:H.x,fy:H.y,fz:H.z,x:H.x,y:H.y,z:H.z})}}function xt(){let k=U.d3Force("link");h.estilo==="a"&&h.nivel!=="agrupado"?(U.d3Force("charge")||U.d3Force("charge",Ge),Ge.strength(-14),k.distance(Y=>Y.tronco?Va:26).strength(Y=>Y.tronco?0:.9)):(U.d3Force("charge",null),k.strength(0))}function Ae(){let k=[v],Y=[],W=new Set,$=ue=>{W.add(ue.chave),Y.push(ue)};if(h.nivel==="agrupado")for(let ue of A.values())k.push(ue),$(Nt(v,ue,ue.cor,ue.slug,!0));else{for(let ue of M.values())k.push(ue),$(Nt(v,ue,ue.cor,ue.slug,!0));for(let ue of b.values()){k.push(ue);let Ce=M.get(ue.classe);$(Ce?Nt(Ce,ue,Ce.cor,Ce.slug,!1):Nt(v,ue,"#7A8194",ue.classe,!1))}}for(let ue of[...C.keys()])W.has(ue)||C.delete(ue);U.graphData({nodes:k,links:Y});let pe=0;for(let ue of k)ue.tipo==="equip"&&(pe+=1);t.dataset.nosGrafo=String(pe),P&&(P=b.get(P.id)||null),Ze()}function Ze(){let k=[v,...h.nivel==="agrupado"?A.values():M.values()],Y=new Set;for(let W of k){Y.add(W.id);let $=W===v?"SENTINELA":yu(W.nome,W.total),pe=Q.get(W.id);if(!pe){let ue=document.createElement("div");ue.className="teia-rotulo";let Ce=document.createElement("span");ue.appendChild(Ce),ue.hidden=!0,V.appendChild(ue),pe={el:ue,span:Ce,texto:null,ultimo:""},Q.set(W.id,pe)}pe.no=W,pe.texto!==$&&(pe.span.textContent=$,pe.texto=$),pe.el.classList.toggle("servidor",W===v),pe.el.classList.toggle("abaixo",W!==v&&Nx(W.ordem)),pe.el.classList.toggle("esmaecido",W!==v&&Ne(W.slug)),W.cor&&pe.el.style.setProperty("--cor-classe",W.cor)}for(let[W,$]of[...Q])Y.has(W)||($.el.remove(),Q.delete(W))}function zt(){let k=U.camera(),Y=U.width(),W=U.height();for(let $ of Q.values()){let pe=Se($.no);j.set(pe.x,pe.y,pe.z);let ue=j.distanceTo(k.position);j.project(k);let Ce=rx({ndc:j,distancia:ue,largura:Y,altura:W});if(!Ce.visivel){$.el.hidden||($.el.hidden=!0);continue}$.el.hidden&&($.el.hidden=!1);let Ft=$.span.textContent;$.medidoPara!==Ft&&($.medidoPara=Ft,$.larg=$.span.offsetWidth,$.alt=$.span.offsetHeight);let E=sx({x:Ce.x,y:Ce.y,largura:$.larg*Ce.escala,altura:$.alt*Ce.escala,palcoL:Y,palcoA:W,desloque:$.el.classList.contains("servidor")?30:14}),F=$.el.classList.contains("servidor")?30:14,H=E.visivel&&x.some(L=>{let ne=$.larg*Ce.escala,he=$.alt*Ce.escala,xe=E.y+F+he/2;return Math.abs(E.x-L.x)<(ne+L.l)/2&&Math.abs(xe-L.y)<(he+L.a)/2});if(!E.visivel||H){$.el.hidden||($.el.hidden=!0);continue}let q=`${E.x},${E.y},${Ce.escala}`;q!==$.ultimo&&($.ultimo=q,$.el.style.transform=`translate3d(${E.x}px, ${E.y}px, 0)`,$.el.style.setProperty("--escala",String(Ce.escala)))}}function It(k){let Y=P;if(!Y||h.nivel==="agrupado"){re.visible=!1;return}let W=Se(Y);re.position.set(W.x,W.y,W.z);let $=pn.haloEquipamento*(s?.95:.9+.12*Math.sin(k*4));re.scale.set($,$,1),re.visible=!0}function I(){t.dataset.nos=String(h.nivel==="agrupado"?0:b.size),t.dataset.equipamentos=String(h.total),t.dataset.nivel=h.nivel,t.dataset.movimento=s?"reduzido":"normal",t.dataset.girando=h.girando?"sim":"nao"}function S(){let k=U.camera().position,Y=`${Math.round(k.x)},${Math.round(k.y)},${Math.round(k.z)}`;t.dataset.camera!==Y&&(t.dataset.camera=Y);let W=U.renderer().info.memory,$=String(W.geometries),pe=String(W.textures);if(t.dataset.geometrias!==$&&(t.dataset.geometrias=$),t.dataset.texturas!==pe&&(t.dataset.texturas=pe),l){let ue=String(p);t.dataset.rotulosIp!==ue&&(t.dataset.rotulosIp=ue),G()}}function G(){let k=t.getBoundingClientRect(),Y=[],W=ue=>{!ue||!(ue.width>0)||!(ue.height>0)||Y.push({x:ue.left-k.left+ue.width/2,y:ue.top-k.top+ue.height/2,l:ue.width,a:ue.height})};for(let ue of Q.values())ue.el.hidden||W(ue.span.getBoundingClientRect());let $=[];try{$=u()||[]}catch(ue){$=[]}let pe=Y.length;for(let ue of $)W(ue);x=Y.slice(pe),y=Y}function J(k){k.rotuloIp&&k.rotuloIp.visible&&(k.rotuloIp.visible=!1)}function se(){var q;if(!l)return;if(h.nivel==="agrupado"||!h.store){for(let L of b.values())L.__threeObj&&J(L.__threeObj.userData);p=0;return}g+=1;let k=U.camera(),Y=k.position,W=U.height(),$=U.width(),pe=k.fov||50,ue=2*Math.tan(pe*Math.PI/360)/W,Ce=[];for(let L of b.values()){let ne=L.__threeObj;if(!ne)continue;let he=ne.userData;if(Ne(L.classe)){J(he);continue}let xe=ne.position.distanceTo(Y),Me=cx({raio:pn.equipamento,distancia:xe,fovGraus:pe,alturaPx:W}),ze=L===P?h.total<=3e3:lx({diametroPx:Me,totalNos:h.total}),Ve=0,Oe=0;ze&&(j.copy(ne.position).project(k),(j.z>1||Math.abs(j.x)>1.2||Math.abs(j.y)>1.2)&&(ze=!1),Ve=(j.x+1)/2*$,Oe=(1-j.y)/2*W);let rt=ze?By((q=h.store.itens.get(L.id))==null?void 0:q.ip):"";if(!rt){J(he);continue}let ft=L===P?-1:xe;Ce.push({obj:ne,u:he,texto:rt,distancia:xe,diametroPx:Me,x:Ve,y:Oe,prio:ft})}Ce.sort((L,ne)=>L.prio-ne.prio);let Ft=[];for(let L of Ce){L.tex=_.obter(L.texto,g),L.alturaPx=ux(L.diametroPx)/L.tex.userData.letra;let ne=L.alturaPx*L.tex.userData.aspecto,he=L.alturaPx;L.caixa={x:L.x,y:L.y,l:ne,a:he},L.x-ne/2>=qa&&L.x+ne/2<=$-qa&&L.y-he/2>=qa&&L.y+he/2<=W-qa?Ft.push(L):J(L.u)}let E=dx(Ft.map(L=>L.caixa),qa,y),F=performance.now(),H=0;Ft.forEach((L,ne)=>{if(!E[ne]){J(L.u);return}L.u.rotuloIp||(L.u.rotuloIp=Cx(),L.obj.add(L.u.rotuloIp));let he=L.u.rotuloIp,xe=he.material;xe.map!==L.tex&&(xe.map||(xe.needsUpdate=!0),xe.map=L.tex),he.visible||(L.u.ipDesde=F),xe.opacity=s?1:hx(F-L.u.ipDesde+16);let Me=L.alturaPx*L.distancia*ue;he.scale.set(Me*L.tex.userData.aspecto,Me,1),he.visible=!0,H+=1}),p=H}function K(k){let Y=h.nivel;if(h.nivel=k,k!=="completo"&&at(),k==="agrupado"){for(let W of b.values())T.delete(W);b.clear(),w=new Map}else{for(let W of A.values())T.delete(W);A.clear()}if(Y!==k&&k!=="agrupado"&&Y!=="agrupado"){for(let W of b.values())T.delete(W);U.nodeThreeObject(W=>X(W))}}function Re(k){if(h.destruido)return;h.store=k,h.total=Bp(k.itens).size;let Y=Tp({total:h.total,agrupadoPorFps:h.agrupadoPorFps,ultimaEntrada:h.ultimaEntradaFps});h.agrupadoPorFps=Y.agrupadoPorFps,Y.nivel!==h.nivel&&K(Y.nivel);let W=Ox(k);if(wt(W),h.nivel==="agrupado")$e(W),w=new Map;else{let $=Lx(w,k.itens);We($),w=Bp(k.itens)}Ee(),xt(),it(),Ae(),I()}function fe(k){if(h.destruido||!h.store)return;let Y=h.store.itens.get(k);if(!Y)return;if(h.nivel==="agrupado"){let pe=A.get(Y.classe);if(!pe)return;let ue=Vp(h.store.itens).get(Y.classe);ue&&ue.pior!==pe.estado&&(pe.estado=ue.pior,be(pe));return}let W=b.get(k);if(!W||W.estado===Y.estado)return;W.estado=Y.estado;let $=w.get(k);$&&($.estado=Y.estado),be(W)}function Se(k){var Y,W,$,pe,ue,Ce;return{x:(W=(Y=k.fx)!=null?Y:k.x)!=null?W:0,y:(pe=($=k.fy)!=null?$:k.y)!=null?pe:0,z:(Ce=(ue=k.fz)!=null?ue:k.z)!=null?Ce:0}}function Pe(k,Y,W){let $=U.camera(),pe=ix({alvo:k,de:Y,raio:W,fov:$.fov||50,largura:U.width(),altura:U.height(),margens:i()||{}});U.cameraPosition(pe.camera,pe.olhar,s?0:kx)}function le(k,Y){let W=[];for(let $ of b.values())$.classe===k&&W.push(Se($));return nx(Y,W,pn.haloEquipamento/2,40)}function ge(k){h.girando=k&&!s,me.autoRotate=h.girando,t.dataset.girando=h.girando?"sim":"nao"}function Be(k){if(k.tipo==="equip")n?n(k.id):ce(k.id);else if(k.tipo==="classe"||k.tipo==="grupo")r(k.slug);else if(k.tipo==="servidor"&&h.store&&n){for(let Y of h.store.itens.values())if(Y.classe===ja){n(Y.id);break}}}function Ie(){for(let k of M.values())be(k);for(let k of A.values())be(k);for(let k of b.values())be(k);it(),Ze()}function _e(k){if(!h.destruido){if(h.foco=k!=null?k:null,P&&P.classe!==h.foco&&(P=null),Ie(),h.foco===null){ge(!0);return}ge(!1),Ye()}}function Ye(){let k=h.nivel==="agrupado",Y=k?A.get(h.foco):M.get(h.foco);if(!Y)return;let W=Se(Y),$=k?Hp(Y.total)*2+30:le(h.foco,W);Pe(W,Se(v),$)}function B(){h.destruido||(P?ce(P.id):h.foco&&Ye())}function ce(k){if(h.destruido||!h.store)return;let Y=h.store.itens.get(k);if(!Y)return;if(h.nivel==="agrupado"){A.has(Y.classe)&&_e(Y.classe);return}let W=b.get(k);if(!W)return;ge(!1),P=W;let $=M.get(W.classe),pe=$?Math.max(36,.55*le(W.classe,Se($))):36;Pe(Se(W),Se($||v),pe)}function de(){P=null}function we(){go(),h.agrupadoPorFps&&(h.agrupadoPorFps=qy({agrupadoPorFps:!0}).agrupadoPorFps,h.store&&Re(h.store))}function oe(){let k=h.estilo==="e",Y=k?Ux:Fx;U.cameraPosition(c?te(Y):Y,k?zx:{x:0,y:0,z:0},s?0:kx)}function te(k){let Y=U.width(),W=U.height();if(!(Y>0&&W>0))return k;let $=Math.tan((U.camera().fov||50)*Math.PI/360),pe=$*(Y/W),ue=Math.max(.5,1-2*Vx.lado/Y),Ce=Math.max(.5,1-2*Vx.cima/W),Ft=Math.max(Bx/(pe*ue),Bx/($*Ce)),E=Math.hypot(k.x,k.y,k.z),F=Math.min(WI,Math.max(E,Ft))/E;return{x:k.x*F,y:k.y*F,z:k.z*F}}function Te(){h.destruido||(we(),P=null,h.foco!==null&&(h.foco=null,Ie()),ge(!0),oe())}function Xe(k){if(h.destruido)return;let Y=Hx(k);Y!==h.estilo&&(h.estilo=Y,we(),h.store&&(Ee({todos:!0,animar:Y!=="a"}),xt(),it(),U.d3ReheatSimulation()),!h.foco&&!P?oe():h.transicao||B())}function vt(){let k=d.media();if(h.nivel!=="completo"||!Wy(k,s)){h.bloom=!1;return}let Y=U.postProcessingComposer(),W=new fo(new ie(U.width(),U.height()),1,.5,.55),$=new du;Y.addPass(W),Y.addPass($),Up(f,!0),h.bloom={passe:W,saida:$}}function at(){if(h.bloom){let k=U.postProcessingComposer();k.removePass(h.bloom.passe),k.removePass(h.bloom.saida),h.bloom.passe.dispose(),h.bloom.saida.dispose(),Up(f,!1)}h.bloom!==null&&(h.bloom=!1)}function Un(k){var ue;if(m=requestAnimationFrame(Un),d.quadro(),h.inicioRender===null&&(h.inicioRender=k),h.bloom===null&&k-h.inicioRender>=GI&&vt(),k-h.ultimoCheque>=1e3&&(h.ultimoCheque=k,h.store&&!h.agrupadoPorFps)){let Ce=Tp({total:h.total,agrupadoPorFps:!1,queda:jy(d),agora:k,ultimaEntrada:h.ultimaEntradaFps});Ce.agrupadoPorFps&&(h.agrupadoPorFps=!0,h.ultimaEntradaFps=Ce.ultimaEntrada,Re(h.store))}let Y=h.transicao;if(Y){Y.inicio===null&&(Y.inicio=k);let Ce=XI(Math.min(1,(k-Y.inicio)/HI));for(let[Ft,E]of Y.para){let F=Y.de.get(Ft);Ft.fx=F.x+(E.x-F.x)*Ce,Ft.fy=F.y+(E.y-F.y)*Ce,Ft.fz=F.z+(E.z-F.z)*Ce}Ce>=1&&(h.transicao=null,B())}k-h.ultimaLeitura>=jI&&(h.ultimaLeitura=k,S());let W=k/1e3;if(It(W),zt(),se(),s)return;let $=(ue=v.__threeObj)==null?void 0:ue.userData.aneis;$&&($[0].rotation.x=W*.5,$[0].rotation.y=W*.3,$[1].rotation.y=-W*.25,$[1].rotation.z=W*.2),Z.rotation.y=W*.004,Z.rotation.x=Math.sin(W*.05)*.02;let pe=Math.abs(Math.sin(W*3.2));for(let Ce of T){let Ft=Ce.__threeObj;if(!Ft)continue;let E=Ft.userData,F=E.escala||1;if(E.aparencia.pulsa){let H=F>1?.25:.55,q=F>1?1:1.4,L=pn.haloEquipamento*F*(1+H*pe)*q;E.halo.scale.set(L,L,1),E.esfera.scale.setScalar(F*(F>1?.95+.1*pe:.85+.3*pe))}else E.aparencia.treme&&E.esfera.position.set(Math.sin(W*37+E.semente)*.35,Math.cos(W*41+E.semente)*.35,0)}}function Sn(){m===null&&(m=requestAnimationFrame(Un))}function go(){d=Ep(),h.inicioRender=null,h.ultimoCheque=0}function Ai(){h.destruido||h.pausado||(h.pausado=!0,m!==null&&cancelAnimationFrame(m),m=null,U.pauseAnimation())}function _o(){h.destruido||!h.pausado||(h.pausado=!1,U.resumeAnimation(),we(),Sn())}function vo(){document.visibilityState==="visible"&&!h.pausado&&go()}document.addEventListener("visibilitychange",vo);function ss(){let k=t.clientWidth,Y=t.clientHeight;k>0&&Y>0&&(k!==U.width()||Y!==U.height())&&(U.width(k).height(Y),c&&!P&&h.foco===null&&oe())}let Ci=null;typeof ResizeObserver=="function"?(Ci=new ResizeObserver(ss),Ci.observe(t)):window.addEventListener("resize",ss);function Xa(k){k.traverse(Y=>{var $,pe;($=Y.geometry)==null||$.dispose();let W=Array.isArray(Y.material)?Y.material:Y.material?[Y.material]:[];for(let ue of W)(pe=ue.map)==null||pe.dispose(),ue.dispose()})}function os(){var W;if(h.destruido)return;h.destruido=!0,m!==null&&cancelAnimationFrame(m),m=null,document.removeEventListener("visibilitychange",vo),Ci?Ci.disconnect():window.removeEventListener("resize",ss);let k=U.renderer(),Y=U.postProcessingComposer();U.pauseAnimation(),U.onNodeClick(null).onNodeHover(null),Xa(ae),f.liberar(),_.liberarTudo(),U._destructor();for(let $ of Y.passes)(W=$.dispose)==null||W.call($);Y.dispose(),me.dispose(),ae.clear(),ae.fog=null,k.dispose(),k.forceContextLoss(),T.clear(),Q.clear(),P=null,b.clear(),M.clear(),A.clear(),C.clear(),t.replaceChildren(),t.style.cursor="",t.classList.remove("teia-cena"),delete t.dataset.nos,delete t.dataset.equipamentos,delete t.dataset.nivel,delete t.dataset.movimento;for(let $ of["nosGrafo","girando","particulas","camera","geometrias","texturas","rotulosIp"])delete t.dataset[$]}return I(),Sn(),{sincronizar:Re,atualizarEstado:fe,definirEstilo:Xe,focarClasse:_e,focarEquipamento:ce,limparSelecao:de,reenquadrar:B,verTudo:Te,pausar:Ai,retomar:_o,destruir:os,nivel:()=>h.nivel}}window.SentinelaTeiaParede={montarTeia:Gx};
