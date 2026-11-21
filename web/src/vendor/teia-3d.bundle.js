var Fx=Object.create;var kp=Object.defineProperty;var Ux=Object.getOwnPropertyDescriptor;var zx=Object.getOwnPropertyNames;var kx=Object.getPrototypeOf,Bx=Object.prototype.hasOwnProperty;var hn=(e,t)=>()=>{try{return t||e((t={exports:{}}).exports,t),t.exports}catch(n){throw t=0,n}};var Vx=(e,t,n,i)=>{if(t&&typeof t=="object"||typeof t=="function")for(let r of zx(t))!Bx.call(e,r)&&r!==n&&kp(e,r,{get:()=>t[r],enumerable:!(i=Ux(t,r))||i.enumerable});return e};var Hx=(e,t,n)=>(n=e!=null?Fx(kx(e)):{},Vx(t||!e||!e.__esModule?kp(n,"default",{value:e,enumerable:!0}):n,e));var ad=hn((AF,L0)=>{L0.exports=function(t){return t===0?"x":t===1?"y":t===2?"z":"c"+(t+1)}});var zr=hn((CF,O0)=>{var eT=ad();O0.exports=function(t){return n;function n(i,r){let s=r&&r.indent||0,o=r&&r.join!==void 0?r.join:`
`,a=Array(s+1).join(" "),c=[];for(let l=0;l<t;++l){let u=eT(l),h=l===0?"":a;c.push(h+i.replace(/{var}/g,u))}return c.join(o)}}});var k0=hn((RF,ua)=>{var N0=zr();ua.exports=nT;ua.exports.generateCreateBodyFunctionBody=F0;ua.exports.getVectorCode=z0;ua.exports.getBodyCode=U0;function nT(e,t){let n=F0(e,t),{Body:i}=new Function(n)();return i}function F0(e,t){return`
${z0(e,t)}
${U0(e,t)}
return {Body: Body, Vector: Vector};
`}function U0(e){let t=N0(e),n=t("{var}",{join:", "});return`
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
};`}function z0(e,t){let n=N0(e),i="";return t&&(i=`${n(`
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
  };`}});var q0=hn((PF,er)=>{var cd=zr(),tr=ad();er.exports=iT;er.exports.generateQuadTreeFunctionBody=B0;er.exports.getInsertStackCode=j0;er.exports.getQuadNodeCode=W0;er.exports.isSamePosition=V0;er.exports.getChildBodyCode=G0;er.exports.setChildBodyCode=H0;function iT(e){let t=B0(e);return new Function(t)()}function B0(e){let t=cd(e),n=Math.pow(2,e);return`
${j0()}
${W0(e)}
${V0(e)}
${G0(e)}
${H0(e)}

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
        if ((node.max_${tr(0)} - node.min_${tr(0)}) / r < theta) {
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

`;function r(a){let c=[],l=Array(a+1).join(" ");for(let u=0;u<e;++u)c.push(l+`if (${tr(u)} > max_${tr(u)}) {`),c.push(l+`  quadIdx = quadIdx + ${Math.pow(2,u)};`),c.push(l+`  min_${tr(u)} = max_${tr(u)};`),c.push(l+`  max_${tr(u)} = node.max_${tr(u)};`),c.push(l+"}");return c.join(`
`)}function s(){let a=Array(11).join(" "),c=[];for(let l=0;l<n;++l)c.push(a+`if (node.quad${l}) {`),c.push(a+`  queue[pushIdx] = node.quad${l};`),c.push(a+"  queueLength += 1;"),c.push(a+"  pushIdx += 1;"),c.push(a+"}");return c.join(`
`)}function o(a){let c=[];for(let l=0;l<n;++l)c.push(`${a}quad${l} = null;`);return c.join(`
`)}}function V0(e){let t=cd(e);return`
  function isSamePosition(point1, point2) {
    ${t("var d{var} = Math.abs(point1.{var} - point2.{var});",{indent:2})}
  
    return ${t("d{var} < 1e-8",{join:" && "})};
  }  
`}function H0(e){var t=Math.pow(2,e);return`
function setChild(node, idx, child) {
  ${n()}
}`;function n(){let i=[];for(let r=0;r<t;++r){let s=r===0?"  ":"  else ";i.push(`${s}if (idx === ${r}) node.quad${r} = child;`)}return i.join(`
`)}}function G0(e){return`function getChild(node, idx) {
${t()}
  return null;
}`;function t(){let n=[],i=Math.pow(2,e);for(let r=0;r<i;++r)n.push(`  if (idx === ${r}) return node.quad${r};`);return n.join(`
`)}}function W0(e){let t=cd(e),n=Math.pow(2,e);var i=`
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
`)}}function j0(){return`
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
`}});var $0=hn((IF,ld)=>{ld.exports=sT;ld.exports.generateFunctionBody=X0;var rT=zr();function sT(e){let t=X0(e);return new Function("bodies","settings","random",t)}function X0(e){let t=rT(e);return`
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
`}});var Z0=hn((DF,hd)=>{var oT=zr();hd.exports=aT;hd.exports.generateCreateDragForceFunctionBody=Y0;function aT(e){let t=Y0(e);return new Function("options",t)}function Y0(e){return`
  if (!Number.isFinite(options.dragCoefficient)) throw new Error('dragCoefficient is not a finite number');

  return {
    update: function(body) {
      ${oT(e)("body.force.{var} -= options.dragCoefficient * body.velocity.{var};",{indent:6})}
    }
  };
`}});var J0=hn((LF,ud)=>{var cT=zr();ud.exports=lT;ud.exports.generateCreateSpringForceFunctionBody=K0;function lT(e){let t=K0(e);return new Function("options","random",t)}function K0(e){let t=cT(e);return`
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
`}});var t_=hn((OF,fd)=>{var hT=zr();fd.exports=uT;fd.exports.generateIntegratorFunctionBody=Q0;function uT(e){let t=Q0(e);return new Function("bodies","timeStep","adaptiveTimeStepWeight",t)}function Q0(e){let t=hT(e);return`
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
`}});var n_=hn((NF,e_)=>{e_.exports=fT;function fT(e,t,n,i){this.from=e,this.to=t,this.length=n,this.coefficient=i}});var s_=hn((FF,r_)=>{r_.exports=i_;function i_(e,t){var n;if(e||(e={}),t){for(n in t)if(t.hasOwnProperty(n)){var i=e.hasOwnProperty(n),r=typeof t[n],s=!i||typeof e[n]!==r;s?e[n]=t[n]:r==="object"&&(e[n]=i_(e[n],t[n]))}}return e}});var dd=hn((UF,o_)=>{"use strict";function dT(e){mT(e);let t=pT(e);return e.on=t.on,e.off=t.off,e.fire=t.fire,e}function pT(e){let t=Object.create(null);return{on:function(n,i,r){if(typeof i!="function")throw new Error("callback is expected to be a function");let s=t[n];return s||(s=t[n]=[]),s.push({callback:i,ctx:r}),e},off:function(n,i){if(typeof n>"u")return t=Object.create(null),e;if(t[n])if(typeof i!="function")delete t[n];else{let r=t[n];for(let s=0;s<r.length;++s)r[s].callback===i&&r.splice(s,1)}return e},fire:function(n){let i=t[n];if(!i)return e;let r;arguments.length>1&&(r=Array.prototype.slice.call(arguments,1));for(let s=0;s<i.length;++s){let o=i[s];o.callback.apply(o.ctx,r)}return e}}}function mT(e){if(!e)throw new Error("Eventify cannot use falsy object as events subject");let t=["on","fire","off"];for(let n=0;n<t.length;++n)if(e.hasOwnProperty(t[n]))throw new Error("Subject cannot be eventified, since it already has property '"+t[n]+"'")}o_.exports=dT});var c_=hn((zF,fh)=>{fh.exports=pd;fh.exports.random=pd,fh.exports.randomIterator=yT;function pd(e){var t=typeof e=="number"?e:+new Date;return new kr(t)}function kr(e){this.seed=e}kr.prototype.next=vT;kr.prototype.nextDouble=md;kr.prototype.uniform=md;kr.prototype.gaussian=gT;kr.prototype.random=md;function gT(){var e,t,n;do t=this.nextDouble()*2-1,n=this.nextDouble()*2-1,e=t*t+n*n;while(e>=1||e===0);return t*Math.sqrt(-2*Math.log(e)/e)}kr.prototype.levy=_T;function _T(){var e=1.5,t=Math.pow(a_(1+e)*Math.sin(Math.PI*e/2)/(a_((1+e)/2)*e*Math.pow(2,(e-1)/2)),1/e);return this.gaussian()*t/Math.pow(Math.abs(this.gaussian()),1/e)}function a_(e){return Math.sqrt(2*Math.PI/e)*Math.pow(1/Math.E*(e+1/(12*e-1/(10*e))),e)}function md(){var e=this.seed;return e=e+2127912214+(e<<12)&4294967295,e=(e^3345072700^e>>>19)&4294967295,e=e+374761393+(e<<5)&4294967295,e=(e+3550635116^e<<9)&4294967295,e=e+4251993797+(e<<3)&4294967295,e=(e^3042594569^e>>>16)&4294967295,this.seed=e,(e&268435455)/268435456}function vT(e){return Math.floor(this.nextDouble()*e)}function yT(e,t){var n=t||pd();if(typeof n.next!="function")throw new Error("customRandom does not match expected API: next() function is missing");return{forEach:r,shuffle:i};function i(){var s,o,a;for(s=e.length-1;s>0;--s)o=n.next(s+1),a=e[o],e[o]=e[s],e[s]=a;return e}function r(s){var o,a,c;for(o=e.length-1;o>0;--o)a=n.next(o+1),c=e[a],e[a]=e[o],e[o]=c,s(c);e.length&&s(e[0])}}});var gd=hn((kF,h_)=>{h_.exports=TT;var xT=k0(),bT=q0(),MT=$0(),ST=Z0(),wT=J0(),ET=t_(),l_={};function TT(e){var t=n_(),n=s_(),i=dd();if(e){if(e.springCoeff!==void 0)throw new Error("springCoeff was renamed to springCoefficient");if(e.dragCoeff!==void 0)throw new Error("dragCoeff was renamed to dragCoefficient")}e=n(e,{springLength:10,springCoefficient:.8,gravity:-12,theta:.8,dragCoefficient:.9,timeStep:.5,adaptiveTimeStepWeight:0,dimensions:2,debug:!1});var r=l_[e.dimensions];if(!r){var s=e.dimensions;r={Body:xT(s,e.debug),createQuadTree:bT(s),createBounds:MT(s),createDragForce:ST(s),createSpringForce:wT(s),integrate:ET(s)},l_[s]=r}var o=r.Body,a=r.createQuadTree,c=r.createBounds,l=r.createDragForce,u=r.createSpringForce,h=r.integrate,f=U=>new o(U),d=c_().random(42),m=[],_=[],g=a(e,d),p=c(m,e,d),b=u(e,d),x=l(e),v=0,M=[],S=new Map,C=0;w("nbody",N),w("spring",z);var P={bodies:m,quadTree:g,springs:_,settings:e,addForce:w,removeForce:R,getForces:V,step:function(){for(var U=0;U<M.length;++U)M[U](C);var G=h(m,e.timeStep,e.adaptiveTimeStepWeight);return C+=1,G},addBody:function(U){if(!U)throw new Error("Body is required");return m.push(U),U},addBodyAt:function(U){if(!U)throw new Error("Body position is required");var G=f(U);return m.push(G),G},removeBody:function(U){if(U){var G=m.indexOf(U);if(!(G<0))return m.splice(G,1),m.length===0&&p.reset(),!0}},addSpring:function(U,G,K,q){if(!U||!G)throw new Error("Cannot add null spring to force simulator");typeof K!="number"&&(K=-1);var ot=new t(U,G,K,q>=0?q:-1);return _.push(ot),ot},getTotalMovement:function(){return v},removeSpring:function(U){if(U){var G=_.indexOf(U);if(G>-1)return _.splice(G,1),!0}},getBestNewBodyPosition:function(U){return p.getBestNewPosition(U)},getBBox:T,getBoundingBox:T,invalidateBBox:function(){console.warn("invalidateBBox() is deprecated, bounds always recomputed on `getBBox()` call")},gravity:function(U){return U!==void 0?(e.gravity=U,g.options({gravity:U}),this):e.gravity},theta:function(U){return U!==void 0?(e.theta=U,g.options({theta:U}),this):e.theta},random:d};return AT(e,P),i(P),P;function T(){return p.update(),p.box}function w(U,G){if(S.has(U))throw new Error("Force "+U+" is already added");S.set(U,G),M.push(G)}function R(U){var G=M.indexOf(S.get(U));G<0||(M.splice(G,1),S.delete(U))}function V(){return S}function N(){if(m.length!==0){g.insertBodies(m);for(var U=m.length;U--;){var G=m[U];G.isPinned||(G.reset(),g.updateBodyForce(G),x.update(G))}}}function z(){for(var U=_.length;U--;)b.update(_[U])}}function AT(e,t){for(var n in e)CT(e,t,n)}function CT(e,t,n){if(e.hasOwnProperty(n)&&typeof t[n]!="function"){var i=Number.isFinite(e[n]);i?t[n]=function(r){if(r!==void 0){if(!Number.isFinite(r))throw new Error("Value of "+n+" should be a valid number.");return e[n]=r,t}return e[n]}:t[n]=function(r){return r!==void 0?(e[n]=r,t):e[n]}}}});var u_=hn((BF,_d)=>{_d.exports=PT;_d.exports.simulator=gd();var RT=dd();function PT(e,t){if(!e)throw new Error("Graph structure cannot be undefined");var n=t&&t.createSimulator||gd(),i=n(t);if(Array.isArray(t))throw new Error("Physics settings is expected to be an object");var r=e.version>19?N:V;t&&typeof t.nodeMass=="function"&&(r=t.nodeMass);var s=new Map,o={},a=0,c=i.settings.springTransform||IT;x(),g();var l=!1,u={step:function(){if(a===0)return h(!0),!0;var z=i.step();u.lastMove=z,u.fire("step");var U=z/a,G=U<=.01;return h(G),G},getNodePosition:function(z){return R(z).pos},setNodePosition:function(z){var U=R(z);U.setPosition.apply(U,Array.prototype.slice.call(arguments,1))},getLinkPosition:function(z){var U=o[z];if(U)return{from:U.from.pos,to:U.to.pos}},getGraphRect:function(){return i.getBBox()},forEachBody:f,pinNode:function(z,U){var G=R(z.id);G.isPinned=!!U},isNodePinned:function(z){return R(z.id).isPinned},dispose:function(){e.off("changed",b),u.fire("disposed")},getBody:_,getSpring:m,getForceVectorLength:d,simulator:i,graph:e,lastMove:0};return RT(u),u;function h(z){l!==z&&(l=z,p(z))}function f(z){s.forEach(z)}function d(){var z=0,U=0;return f(function(G){z+=Math.abs(G.force.x),U+=Math.abs(G.force.y)}),Math.sqrt(z*z+U*U)}function m(z,U){var G;if(U===void 0)typeof z!="object"?G=z:G=z.id;else{var K=e.hasLink(z,U);if(!K)return;G=K.id}return o[G]}function _(z){return s.get(z)}function g(){e.on("changed",b)}function p(z){u.fire("stable",z)}function b(z){for(var U=0;U<z.length;++U){var G=z[U];G.changeType==="add"?(G.node&&v(G.node.id),G.link&&S(G.link)):G.changeType==="remove"&&(G.node&&M(G.node),G.link&&C(G.link))}a=e.getNodesCount()}function x(){a=0,e.forEachNode(function(z){v(z.id),a+=1}),e.forEachLink(S)}function v(z){var U=s.get(z);if(!U){var G=e.getNode(z);if(!G)throw new Error("initBody() was called with unknown node id");var K=G.position;if(!K){var q=P(G);K=i.getBestNewBodyPosition(q)}U=i.addBodyAt(K),U.id=z,s.set(z,U),T(z),w(G)&&(U.isPinned=!0)}}function M(z){var U=z.id,G=s.get(U);G&&(s.delete(U),i.removeBody(G))}function S(z){T(z.fromId),T(z.toId);var U=s.get(z.fromId),G=s.get(z.toId),K=i.addSpring(U,G,z.length);c(z,K),o[z.id]=K}function C(z){var U=o[z.id];if(U){var G=e.getNode(z.fromId),K=e.getNode(z.toId);G&&T(G.id),K&&T(K.id),delete o[z.id],i.removeSpring(U)}}function P(z){var U=[];if(!z.links)return U;for(var G=Math.min(z.links.length,2),K=0;K<G;++K){var q=z.links[K],ot=q.fromId!==z.id?s.get(q.fromId):s.get(q.toId);ot&&ot.pos&&U.push(ot)}return U}function T(z){var U=s.get(z);if(U.mass=r(z),Number.isNaN(U.mass))throw new Error("Node mass should be a number")}function w(z){return z&&(z.isPinned||z.data&&z.data.isPinned)}function R(z){var U=s.get(z);return U||(v(z),U=s.get(z)),U}function V(z){var U=e.getLinks(z);return U?1+U.length/3:1}function N(z){var U=e.getLinks(z);return U?1+U.size/3:1}}function IT(){}});var Pe={LEFT:0,MIDDLE:1,RIGHT:2,ROTATE:0,DOLLY:1,PAN:2},Fn={ROTATE:0,PAN:1,DOLLY_PAN:2,DOLLY_ROTATE:3},vm=0,of=1,ym=2;var af=1,xm=2,ui=3,Ci=0,We=1,fi=2,Kn=0,Sr=1,Zi=2,cf=3,lf=4,bm=5,Xi=100,Mm=101,Sm=102,wm=103,Em=104,Tm=200,Am=201,Cm=202,Rm=203,_c=204,vc=205,Pm=206,Im=207,Dm=208,Lm=209,Om=210,Nm=211,Fm=212,Um=213,zm=214,Jc=0,Qc=1,tl=2,wr=3,el=4,nl=5,il=6,rl=7,sl=0,km=1,Bm=2,Di=0,ol=1,al=2,cl=3,ll=4,hl=5,ul=6,fl=7;var hf=300,Pr=301,Ir=302,dl=303,pl=304,Jo=306,yc=1e3,qi=1001,xc=1002,Dn=1003,Vm=1004;var Qo=1005;var Yn=1006,ml=1007;var Ki=1008;var Jn=1009,uf=1010,ff=1011,Is=1012,gl=1013,Ji=1014,di=1015,Un=1016,_l=1017,vl=1018,Ds=1020,df=35902,pf=35899,mf=1021,gf=1022,zn=1023,gs=1026,Ls=1027,_f=1028,yl=1029,vf=1030,xl=1031;var bl=1033,ta=33776,ea=33777,na=33778,ia=33779,Ml=35840,Sl=35841,wl=35842,El=35843,Tl=36196,Al=37492,Cl=37496,Rl=37808,Pl=37809,Il=37810,Dl=37811,Ll=37812,Ol=37813,Nl=37814,Fl=37815,Ul=37816,zl=37817,kl=37818,Bl=37819,Vl=37820,Hl=37821,Gl=36492,Wl=36494,jl=36495,ql=36283,Xl=36284,$l=36285,Yl=36286;var So=2300,bc=2301,mc=2302,Zu=2400,Ku=2401,Ju=2402;var Hm=3200,Gm=3201;var Zl=0,Wm=1,Li="",He="srgb",Er="srgb-linear",wo="linear",ae="srgb";var Mr=7680;var Qu=519,jm=512,qm=513,Xm=514,yf=515,$m=516,Ym=517,Zm=518,Km=519,Mc=35044;var xf="300 es",$n=2e3,Eo=2001;var si=class{addEventListener(t,n){this._listeners===void 0&&(this._listeners={});let i=this._listeners;i[t]===void 0&&(i[t]=[]),i[t].indexOf(n)===-1&&i[t].push(n)}hasEventListener(t,n){let i=this._listeners;return i===void 0?!1:i[t]!==void 0&&i[t].indexOf(n)!==-1}removeEventListener(t,n){let i=this._listeners;if(i===void 0)return;let r=i[t];if(r!==void 0){let s=r.indexOf(n);s!==-1&&r.splice(s,1)}}dispatchEvent(t){let n=this._listeners;if(n===void 0)return;let i=n[t.type];if(i!==void 0){t.target=this;let r=i.slice(0);for(let s=0,o=r.length;s<o;s++)r[s].call(this,t);t.target=null}}},qe=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],Bp=1234567,yo=Math.PI/180,_s=180/Math.PI;function Ti(){let e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,n=Math.random()*4294967295|0,i=Math.random()*4294967295|0;return(qe[e&255]+qe[e>>8&255]+qe[e>>16&255]+qe[e>>24&255]+"-"+qe[t&255]+qe[t>>8&255]+"-"+qe[t>>16&15|64]+qe[t>>24&255]+"-"+qe[n&63|128]+qe[n>>8&255]+"-"+qe[n>>16&255]+qe[n>>24&255]+qe[i&255]+qe[i>>8&255]+qe[i>>16&255]+qe[i>>24&255]).toLowerCase()}function Kt(e,t,n){return Math.max(t,Math.min(n,e))}function bf(e,t){return(e%t+t)%t}function Gx(e,t,n,i,r){return i+(e-t)*(r-i)/(n-t)}function Wx(e,t,n){return e!==t?(n-e)/(t-e):0}function xo(e,t,n){return(1-n)*e+n*t}function jx(e,t,n,i){return xo(e,t,1-Math.exp(-n*i))}function qx(e,t=1){return t-Math.abs(bf(e,t*2)-t)}function Xx(e,t,n){return e<=t?0:e>=n?1:(e=(e-t)/(n-t),e*e*(3-2*e))}function $x(e,t,n){return e<=t?0:e>=n?1:(e=(e-t)/(n-t),e*e*e*(e*(e*6-15)+10))}function Yx(e,t){return e+Math.floor(Math.random()*(t-e+1))}function Zx(e,t){return e+Math.random()*(t-e)}function Kx(e){return e*(.5-Math.random())}function Jx(e){e!==void 0&&(Bp=e);let t=Bp+=1831565813;return t=Math.imul(t^t>>>15,t|1),t^=t+Math.imul(t^t>>>7,t|61),((t^t>>>14)>>>0)/4294967296}function Qx(e){return e*yo}function tb(e){return e*_s}function eb(e){return(e&e-1)===0&&e!==0}function nb(e){return Math.pow(2,Math.ceil(Math.log(e)/Math.LN2))}function ib(e){return Math.pow(2,Math.floor(Math.log(e)/Math.LN2))}function rb(e,t,n,i,r){let s=Math.cos,o=Math.sin,a=s(n/2),c=o(n/2),l=s((t+i)/2),u=o((t+i)/2),h=s((t-i)/2),f=o((t-i)/2),d=s((i-t)/2),m=o((i-t)/2);switch(r){case"XYX":e.set(a*u,c*h,c*f,a*l);break;case"YZY":e.set(c*f,a*u,c*h,a*l);break;case"ZXZ":e.set(c*h,c*f,a*u,a*l);break;case"XZX":e.set(a*u,c*m,c*d,a*l);break;case"YXY":e.set(c*d,a*u,c*m,a*l);break;case"ZYZ":e.set(c*m,c*d,a*u,a*l);break;default:console.warn("THREE.MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+r)}}function Xn(e,t){switch(t.constructor){case Float32Array:return e;case Uint32Array:return e/4294967295;case Uint16Array:return e/65535;case Uint8Array:return e/255;case Int32Array:return Math.max(e/2147483647,-1);case Int16Array:return Math.max(e/32767,-1);case Int8Array:return Math.max(e/127,-1);default:throw new Error("Invalid component type.")}}function fe(e,t){switch(t.constructor){case Float32Array:return e;case Uint32Array:return Math.round(e*4294967295);case Uint16Array:return Math.round(e*65535);case Uint8Array:return Math.round(e*255);case Int32Array:return Math.round(e*2147483647);case Int16Array:return Math.round(e*32767);case Int8Array:return Math.round(e*127);default:throw new Error("Invalid component type.")}}var pe={DEG2RAD:yo,RAD2DEG:_s,generateUUID:Ti,clamp:Kt,euclideanModulo:bf,mapLinear:Gx,inverseLerp:Wx,lerp:xo,damp:jx,pingpong:qx,smoothstep:Xx,smootherstep:$x,randInt:Yx,randFloat:Zx,randFloatSpread:Kx,seededRandom:Jx,degToRad:Qx,radToDeg:tb,isPowerOfTwo:eb,ceilPowerOfTwo:nb,floorPowerOfTwo:ib,setQuaternionFromProperEuler:rb,normalize:fe,denormalize:Xn},et=class e{constructor(t=0,n=0){e.prototype.isVector2=!0,this.x=t,this.y=n}get width(){return this.x}set width(t){this.x=t}get height(){return this.y}set height(t){this.y=t}set(t,n){return this.x=t,this.y=n,this}setScalar(t){return this.x=t,this.y=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setComponent(t,n){switch(t){case 0:this.x=n;break;case 1:this.y=n;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y)}copy(t){return this.x=t.x,this.y=t.y,this}add(t){return this.x+=t.x,this.y+=t.y,this}addScalar(t){return this.x+=t,this.y+=t,this}addVectors(t,n){return this.x=t.x+n.x,this.y=t.y+n.y,this}addScaledVector(t,n){return this.x+=t.x*n,this.y+=t.y*n,this}sub(t){return this.x-=t.x,this.y-=t.y,this}subScalar(t){return this.x-=t,this.y-=t,this}subVectors(t,n){return this.x=t.x-n.x,this.y=t.y-n.y,this}multiply(t){return this.x*=t.x,this.y*=t.y,this}multiplyScalar(t){return this.x*=t,this.y*=t,this}divide(t){return this.x/=t.x,this.y/=t.y,this}divideScalar(t){return this.multiplyScalar(1/t)}applyMatrix3(t){let n=this.x,i=this.y,r=t.elements;return this.x=r[0]*n+r[3]*i+r[6],this.y=r[1]*n+r[4]*i+r[7],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this}clamp(t,n){return this.x=Kt(this.x,t.x,n.x),this.y=Kt(this.y,t.y,n.y),this}clampScalar(t,n){return this.x=Kt(this.x,t,n),this.y=Kt(this.y,t,n),this}clampLength(t,n){let i=this.length();return this.divideScalar(i||1).multiplyScalar(Kt(i,t,n))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(t){return this.x*t.x+this.y*t.y}cross(t){return this.x*t.y-this.y*t.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(t){let n=Math.sqrt(this.lengthSq()*t.lengthSq());if(n===0)return Math.PI/2;let i=this.dot(t)/n;return Math.acos(Kt(i,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){let n=this.x-t.x,i=this.y-t.y;return n*n+i*i}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,n){return this.x+=(t.x-this.x)*n,this.y+=(t.y-this.y)*n,this}lerpVectors(t,n,i){return this.x=t.x+(n.x-t.x)*i,this.y=t.y+(n.y-t.y)*i,this}equals(t){return t.x===this.x&&t.y===this.y}fromArray(t,n=0){return this.x=t[n],this.y=t[n+1],this}toArray(t=[],n=0){return t[n]=this.x,t[n+1]=this.y,t}fromBufferAttribute(t,n){return this.x=t.getX(n),this.y=t.getY(n),this}rotateAround(t,n){let i=Math.cos(n),r=Math.sin(n),s=this.x-t.x,o=this.y-t.y;return this.x=s*i-o*r+t.x,this.y=s*r+o*i+t.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}},Ne=class{constructor(t=0,n=0,i=0,r=1){this.isQuaternion=!0,this._x=t,this._y=n,this._z=i,this._w=r}static slerpFlat(t,n,i,r,s,o,a){let c=i[r+0],l=i[r+1],u=i[r+2],h=i[r+3],f=s[o+0],d=s[o+1],m=s[o+2],_=s[o+3];if(a===0){t[n+0]=c,t[n+1]=l,t[n+2]=u,t[n+3]=h;return}if(a===1){t[n+0]=f,t[n+1]=d,t[n+2]=m,t[n+3]=_;return}if(h!==_||c!==f||l!==d||u!==m){let g=1-a,p=c*f+l*d+u*m+h*_,b=p>=0?1:-1,x=1-p*p;if(x>Number.EPSILON){let M=Math.sqrt(x),S=Math.atan2(M,p*b);g=Math.sin(g*S)/M,a=Math.sin(a*S)/M}let v=a*b;if(c=c*g+f*v,l=l*g+d*v,u=u*g+m*v,h=h*g+_*v,g===1-a){let M=1/Math.sqrt(c*c+l*l+u*u+h*h);c*=M,l*=M,u*=M,h*=M}}t[n]=c,t[n+1]=l,t[n+2]=u,t[n+3]=h}static multiplyQuaternionsFlat(t,n,i,r,s,o){let a=i[r],c=i[r+1],l=i[r+2],u=i[r+3],h=s[o],f=s[o+1],d=s[o+2],m=s[o+3];return t[n]=a*m+u*h+c*d-l*f,t[n+1]=c*m+u*f+l*h-a*d,t[n+2]=l*m+u*d+a*f-c*h,t[n+3]=u*m-a*h-c*f-l*d,t}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get w(){return this._w}set w(t){this._w=t,this._onChangeCallback()}set(t,n,i,r){return this._x=t,this._y=n,this._z=i,this._w=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(t){return this._x=t.x,this._y=t.y,this._z=t.z,this._w=t.w,this._onChangeCallback(),this}setFromEuler(t,n=!0){let i=t._x,r=t._y,s=t._z,o=t._order,a=Math.cos,c=Math.sin,l=a(i/2),u=a(r/2),h=a(s/2),f=c(i/2),d=c(r/2),m=c(s/2);switch(o){case"XYZ":this._x=f*u*h+l*d*m,this._y=l*d*h-f*u*m,this._z=l*u*m+f*d*h,this._w=l*u*h-f*d*m;break;case"YXZ":this._x=f*u*h+l*d*m,this._y=l*d*h-f*u*m,this._z=l*u*m-f*d*h,this._w=l*u*h+f*d*m;break;case"ZXY":this._x=f*u*h-l*d*m,this._y=l*d*h+f*u*m,this._z=l*u*m+f*d*h,this._w=l*u*h-f*d*m;break;case"ZYX":this._x=f*u*h-l*d*m,this._y=l*d*h+f*u*m,this._z=l*u*m-f*d*h,this._w=l*u*h+f*d*m;break;case"YZX":this._x=f*u*h+l*d*m,this._y=l*d*h+f*u*m,this._z=l*u*m-f*d*h,this._w=l*u*h-f*d*m;break;case"XZY":this._x=f*u*h-l*d*m,this._y=l*d*h-f*u*m,this._z=l*u*m+f*d*h,this._w=l*u*h+f*d*m;break;default:console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: "+o)}return n===!0&&this._onChangeCallback(),this}setFromAxisAngle(t,n){let i=n/2,r=Math.sin(i);return this._x=t.x*r,this._y=t.y*r,this._z=t.z*r,this._w=Math.cos(i),this._onChangeCallback(),this}setFromRotationMatrix(t){let n=t.elements,i=n[0],r=n[4],s=n[8],o=n[1],a=n[5],c=n[9],l=n[2],u=n[6],h=n[10],f=i+a+h;if(f>0){let d=.5/Math.sqrt(f+1);this._w=.25/d,this._x=(u-c)*d,this._y=(s-l)*d,this._z=(o-r)*d}else if(i>a&&i>h){let d=2*Math.sqrt(1+i-a-h);this._w=(u-c)/d,this._x=.25*d,this._y=(r+o)/d,this._z=(s+l)/d}else if(a>h){let d=2*Math.sqrt(1+a-i-h);this._w=(s-l)/d,this._x=(r+o)/d,this._y=.25*d,this._z=(c+u)/d}else{let d=2*Math.sqrt(1+h-i-a);this._w=(o-r)/d,this._x=(s+l)/d,this._y=(c+u)/d,this._z=.25*d}return this._onChangeCallback(),this}setFromUnitVectors(t,n){let i=t.dot(n)+1;return i<1e-8?(i=0,Math.abs(t.x)>Math.abs(t.z)?(this._x=-t.y,this._y=t.x,this._z=0,this._w=i):(this._x=0,this._y=-t.z,this._z=t.y,this._w=i)):(this._x=t.y*n.z-t.z*n.y,this._y=t.z*n.x-t.x*n.z,this._z=t.x*n.y-t.y*n.x,this._w=i),this.normalize()}angleTo(t){return 2*Math.acos(Math.abs(Kt(this.dot(t),-1,1)))}rotateTowards(t,n){let i=this.angleTo(t);if(i===0)return this;let r=Math.min(1,n/i);return this.slerp(t,r),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(t){return this._x*t._x+this._y*t._y+this._z*t._z+this._w*t._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let t=this.length();return t===0?(this._x=0,this._y=0,this._z=0,this._w=1):(t=1/t,this._x=this._x*t,this._y=this._y*t,this._z=this._z*t,this._w=this._w*t),this._onChangeCallback(),this}multiply(t){return this.multiplyQuaternions(this,t)}premultiply(t){return this.multiplyQuaternions(t,this)}multiplyQuaternions(t,n){let i=t._x,r=t._y,s=t._z,o=t._w,a=n._x,c=n._y,l=n._z,u=n._w;return this._x=i*u+o*a+r*l-s*c,this._y=r*u+o*c+s*a-i*l,this._z=s*u+o*l+i*c-r*a,this._w=o*u-i*a-r*c-s*l,this._onChangeCallback(),this}slerp(t,n){if(n===0)return this;if(n===1)return this.copy(t);let i=this._x,r=this._y,s=this._z,o=this._w,a=o*t._w+i*t._x+r*t._y+s*t._z;if(a<0?(this._w=-t._w,this._x=-t._x,this._y=-t._y,this._z=-t._z,a=-a):this.copy(t),a>=1)return this._w=o,this._x=i,this._y=r,this._z=s,this;let c=1-a*a;if(c<=Number.EPSILON){let d=1-n;return this._w=d*o+n*this._w,this._x=d*i+n*this._x,this._y=d*r+n*this._y,this._z=d*s+n*this._z,this.normalize(),this}let l=Math.sqrt(c),u=Math.atan2(l,a),h=Math.sin((1-n)*u)/l,f=Math.sin(n*u)/l;return this._w=o*h+this._w*f,this._x=i*h+this._x*f,this._y=r*h+this._y*f,this._z=s*h+this._z*f,this._onChangeCallback(),this}slerpQuaternions(t,n,i){return this.copy(t).slerp(n,i)}random(){let t=2*Math.PI*Math.random(),n=2*Math.PI*Math.random(),i=Math.random(),r=Math.sqrt(1-i),s=Math.sqrt(i);return this.set(r*Math.sin(t),r*Math.cos(t),s*Math.sin(n),s*Math.cos(n))}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._w===this._w}fromArray(t,n=0){return this._x=t[n],this._y=t[n+1],this._z=t[n+2],this._w=t[n+3],this._onChangeCallback(),this}toArray(t=[],n=0){return t[n]=this._x,t[n+1]=this._y,t[n+2]=this._z,t[n+3]=this._w,t}fromBufferAttribute(t,n){return this._x=t.getX(n),this._y=t.getY(n),this._z=t.getZ(n),this._w=t.getW(n),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}},I=class e{constructor(t=0,n=0,i=0){e.prototype.isVector3=!0,this.x=t,this.y=n,this.z=i}set(t,n,i){return i===void 0&&(i=this.z),this.x=t,this.y=n,this.z=i,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setComponent(t,n){switch(t){case 0:this.x=n;break;case 1:this.y=n;break;case 2:this.z=n;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this}addVectors(t,n){return this.x=t.x+n.x,this.y=t.y+n.y,this.z=t.z+n.z,this}addScaledVector(t,n){return this.x+=t.x*n,this.y+=t.y*n,this.z+=t.z*n,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this}subVectors(t,n){return this.x=t.x-n.x,this.y=t.y-n.y,this.z=t.z-n.z,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this}multiplyVectors(t,n){return this.x=t.x*n.x,this.y=t.y*n.y,this.z=t.z*n.z,this}applyEuler(t){return this.applyQuaternion(Vp.setFromEuler(t))}applyAxisAngle(t,n){return this.applyQuaternion(Vp.setFromAxisAngle(t,n))}applyMatrix3(t){let n=this.x,i=this.y,r=this.z,s=t.elements;return this.x=s[0]*n+s[3]*i+s[6]*r,this.y=s[1]*n+s[4]*i+s[7]*r,this.z=s[2]*n+s[5]*i+s[8]*r,this}applyNormalMatrix(t){return this.applyMatrix3(t).normalize()}applyMatrix4(t){let n=this.x,i=this.y,r=this.z,s=t.elements,o=1/(s[3]*n+s[7]*i+s[11]*r+s[15]);return this.x=(s[0]*n+s[4]*i+s[8]*r+s[12])*o,this.y=(s[1]*n+s[5]*i+s[9]*r+s[13])*o,this.z=(s[2]*n+s[6]*i+s[10]*r+s[14])*o,this}applyQuaternion(t){let n=this.x,i=this.y,r=this.z,s=t.x,o=t.y,a=t.z,c=t.w,l=2*(o*r-a*i),u=2*(a*n-s*r),h=2*(s*i-o*n);return this.x=n+c*l+o*h-a*u,this.y=i+c*u+a*l-s*h,this.z=r+c*h+s*u-o*l,this}project(t){return this.applyMatrix4(t.matrixWorldInverse).applyMatrix4(t.projectionMatrix)}unproject(t){return this.applyMatrix4(t.projectionMatrixInverse).applyMatrix4(t.matrixWorld)}transformDirection(t){let n=this.x,i=this.y,r=this.z,s=t.elements;return this.x=s[0]*n+s[4]*i+s[8]*r,this.y=s[1]*n+s[5]*i+s[9]*r,this.z=s[2]*n+s[6]*i+s[10]*r,this.normalize()}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this}divideScalar(t){return this.multiplyScalar(1/t)}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this}clamp(t,n){return this.x=Kt(this.x,t.x,n.x),this.y=Kt(this.y,t.y,n.y),this.z=Kt(this.z,t.z,n.z),this}clampScalar(t,n){return this.x=Kt(this.x,t,n),this.y=Kt(this.y,t,n),this.z=Kt(this.z,t,n),this}clampLength(t,n){let i=this.length();return this.divideScalar(i||1).multiplyScalar(Kt(i,t,n))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,n){return this.x+=(t.x-this.x)*n,this.y+=(t.y-this.y)*n,this.z+=(t.z-this.z)*n,this}lerpVectors(t,n,i){return this.x=t.x+(n.x-t.x)*i,this.y=t.y+(n.y-t.y)*i,this.z=t.z+(n.z-t.z)*i,this}cross(t){return this.crossVectors(this,t)}crossVectors(t,n){let i=t.x,r=t.y,s=t.z,o=n.x,a=n.y,c=n.z;return this.x=r*c-s*a,this.y=s*o-i*c,this.z=i*a-r*o,this}projectOnVector(t){let n=t.lengthSq();if(n===0)return this.set(0,0,0);let i=t.dot(this)/n;return this.copy(t).multiplyScalar(i)}projectOnPlane(t){return Mu.copy(this).projectOnVector(t),this.sub(Mu)}reflect(t){return this.sub(Mu.copy(t).multiplyScalar(2*this.dot(t)))}angleTo(t){let n=Math.sqrt(this.lengthSq()*t.lengthSq());if(n===0)return Math.PI/2;let i=this.dot(t)/n;return Math.acos(Kt(i,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){let n=this.x-t.x,i=this.y-t.y,r=this.z-t.z;return n*n+i*i+r*r}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)+Math.abs(this.z-t.z)}setFromSpherical(t){return this.setFromSphericalCoords(t.radius,t.phi,t.theta)}setFromSphericalCoords(t,n,i){let r=Math.sin(n)*t;return this.x=r*Math.sin(i),this.y=Math.cos(n)*t,this.z=r*Math.cos(i),this}setFromCylindrical(t){return this.setFromCylindricalCoords(t.radius,t.theta,t.y)}setFromCylindricalCoords(t,n,i){return this.x=t*Math.sin(n),this.y=i,this.z=t*Math.cos(n),this}setFromMatrixPosition(t){let n=t.elements;return this.x=n[12],this.y=n[13],this.z=n[14],this}setFromMatrixScale(t){let n=this.setFromMatrixColumn(t,0).length(),i=this.setFromMatrixColumn(t,1).length(),r=this.setFromMatrixColumn(t,2).length();return this.x=n,this.y=i,this.z=r,this}setFromMatrixColumn(t,n){return this.fromArray(t.elements,n*4)}setFromMatrix3Column(t,n){return this.fromArray(t.elements,n*3)}setFromEuler(t){return this.x=t._x,this.y=t._y,this.z=t._z,this}setFromColor(t){return this.x=t.r,this.y=t.g,this.z=t.b,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z}fromArray(t,n=0){return this.x=t[n],this.y=t[n+1],this.z=t[n+2],this}toArray(t=[],n=0){return t[n]=this.x,t[n+1]=this.y,t[n+2]=this.z,t}fromBufferAttribute(t,n){return this.x=t.getX(n),this.y=t.getY(n),this.z=t.getZ(n),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let t=Math.random()*Math.PI*2,n=Math.random()*2-1,i=Math.sqrt(1-n*n);return this.x=i*Math.cos(t),this.y=n,this.z=i*Math.sin(t),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}},Mu=new I,Vp=new Ne,Xt=class e{constructor(t,n,i,r,s,o,a,c,l){e.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],t!==void 0&&this.set(t,n,i,r,s,o,a,c,l)}set(t,n,i,r,s,o,a,c,l){let u=this.elements;return u[0]=t,u[1]=r,u[2]=a,u[3]=n,u[4]=s,u[5]=c,u[6]=i,u[7]=o,u[8]=l,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(t){let n=this.elements,i=t.elements;return n[0]=i[0],n[1]=i[1],n[2]=i[2],n[3]=i[3],n[4]=i[4],n[5]=i[5],n[6]=i[6],n[7]=i[7],n[8]=i[8],this}extractBasis(t,n,i){return t.setFromMatrix3Column(this,0),n.setFromMatrix3Column(this,1),i.setFromMatrix3Column(this,2),this}setFromMatrix4(t){let n=t.elements;return this.set(n[0],n[4],n[8],n[1],n[5],n[9],n[2],n[6],n[10]),this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,n){let i=t.elements,r=n.elements,s=this.elements,o=i[0],a=i[3],c=i[6],l=i[1],u=i[4],h=i[7],f=i[2],d=i[5],m=i[8],_=r[0],g=r[3],p=r[6],b=r[1],x=r[4],v=r[7],M=r[2],S=r[5],C=r[8];return s[0]=o*_+a*b+c*M,s[3]=o*g+a*x+c*S,s[6]=o*p+a*v+c*C,s[1]=l*_+u*b+h*M,s[4]=l*g+u*x+h*S,s[7]=l*p+u*v+h*C,s[2]=f*_+d*b+m*M,s[5]=f*g+d*x+m*S,s[8]=f*p+d*v+m*C,this}multiplyScalar(t){let n=this.elements;return n[0]*=t,n[3]*=t,n[6]*=t,n[1]*=t,n[4]*=t,n[7]*=t,n[2]*=t,n[5]*=t,n[8]*=t,this}determinant(){let t=this.elements,n=t[0],i=t[1],r=t[2],s=t[3],o=t[4],a=t[5],c=t[6],l=t[7],u=t[8];return n*o*u-n*a*l-i*s*u+i*a*c+r*s*l-r*o*c}invert(){let t=this.elements,n=t[0],i=t[1],r=t[2],s=t[3],o=t[4],a=t[5],c=t[6],l=t[7],u=t[8],h=u*o-a*l,f=a*c-u*s,d=l*s-o*c,m=n*h+i*f+r*d;if(m===0)return this.set(0,0,0,0,0,0,0,0,0);let _=1/m;return t[0]=h*_,t[1]=(r*l-u*i)*_,t[2]=(a*i-r*o)*_,t[3]=f*_,t[4]=(u*n-r*c)*_,t[5]=(r*s-a*n)*_,t[6]=d*_,t[7]=(i*c-l*n)*_,t[8]=(o*n-i*s)*_,this}transpose(){let t,n=this.elements;return t=n[1],n[1]=n[3],n[3]=t,t=n[2],n[2]=n[6],n[6]=t,t=n[5],n[5]=n[7],n[7]=t,this}getNormalMatrix(t){return this.setFromMatrix4(t).invert().transpose()}transposeIntoArray(t){let n=this.elements;return t[0]=n[0],t[1]=n[3],t[2]=n[6],t[3]=n[1],t[4]=n[4],t[5]=n[7],t[6]=n[2],t[7]=n[5],t[8]=n[8],this}setUvTransform(t,n,i,r,s,o,a){let c=Math.cos(s),l=Math.sin(s);return this.set(i*c,i*l,-i*(c*o+l*a)+o+t,-r*l,r*c,-r*(-l*o+c*a)+a+n,0,0,1),this}scale(t,n){return this.premultiply(Su.makeScale(t,n)),this}rotate(t){return this.premultiply(Su.makeRotation(-t)),this}translate(t,n){return this.premultiply(Su.makeTranslation(t,n)),this}makeTranslation(t,n){return t.isVector2?this.set(1,0,t.x,0,1,t.y,0,0,1):this.set(1,0,t,0,1,n,0,0,1),this}makeRotation(t){let n=Math.cos(t),i=Math.sin(t);return this.set(n,-i,0,i,n,0,0,0,1),this}makeScale(t,n){return this.set(t,0,0,0,n,0,0,0,1),this}equals(t){let n=this.elements,i=t.elements;for(let r=0;r<9;r++)if(n[r]!==i[r])return!1;return!0}fromArray(t,n=0){for(let i=0;i<9;i++)this.elements[i]=t[i+n];return this}toArray(t=[],n=0){let i=this.elements;return t[n]=i[0],t[n+1]=i[1],t[n+2]=i[2],t[n+3]=i[3],t[n+4]=i[4],t[n+5]=i[5],t[n+6]=i[6],t[n+7]=i[7],t[n+8]=i[8],t}clone(){return new this.constructor().fromArray(this.elements)}},Su=new Xt;function Mf(e){for(let t=e.length-1;t>=0;--t)if(e[t]>=65535)return!0;return!1}function vs(e){return document.createElementNS("http://www.w3.org/1999/xhtml",e)}function Jm(){let e=vs("canvas");return e.style.display="block",e}var Hp={};function ys(e){e in Hp||(Hp[e]=!0,console.warn(e))}function Qm(e,t,n){return new Promise(function(i,r){function s(){switch(e.clientWaitSync(t,e.SYNC_FLUSH_COMMANDS_BIT,0)){case e.WAIT_FAILED:r();break;case e.TIMEOUT_EXPIRED:setTimeout(s,n);break;default:i()}}setTimeout(s,n)})}var Gp=new Xt().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),Wp=new Xt().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function sb(){let e={enabled:!0,workingColorSpace:Er,spaces:{},convert:function(r,s,o){return this.enabled===!1||s===o||!s||!o||(this.spaces[s].transfer===ae&&(r.r=Ai(r.r),r.g=Ai(r.g),r.b=Ai(r.b)),this.spaces[s].primaries!==this.spaces[o].primaries&&(r.applyMatrix3(this.spaces[s].toXYZ),r.applyMatrix3(this.spaces[o].fromXYZ)),this.spaces[o].transfer===ae&&(r.r=ms(r.r),r.g=ms(r.g),r.b=ms(r.b))),r},workingToColorSpace:function(r,s){return this.convert(r,this.workingColorSpace,s)},colorSpaceToWorking:function(r,s){return this.convert(r,s,this.workingColorSpace)},getPrimaries:function(r){return this.spaces[r].primaries},getTransfer:function(r){return r===Li?wo:this.spaces[r].transfer},getToneMappingMode:function(r){return this.spaces[r].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(r,s=this.workingColorSpace){return r.fromArray(this.spaces[s].luminanceCoefficients)},define:function(r){Object.assign(this.spaces,r)},_getMatrix:function(r,s,o){return r.copy(this.spaces[s].toXYZ).multiply(this.spaces[o].fromXYZ)},_getDrawingBufferColorSpace:function(r){return this.spaces[r].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(r=this.workingColorSpace){return this.spaces[r].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(r,s){return ys("THREE.ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),e.workingToColorSpace(r,s)},toWorkingColorSpace:function(r,s){return ys("THREE.ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),e.colorSpaceToWorking(r,s)}},t=[.64,.33,.3,.6,.15,.06],n=[.2126,.7152,.0722],i=[.3127,.329];return e.define({[Er]:{primaries:t,whitePoint:i,transfer:wo,toXYZ:Gp,fromXYZ:Wp,luminanceCoefficients:n,workingColorSpaceConfig:{unpackColorSpace:He},outputColorSpaceConfig:{drawingBufferColorSpace:He}},[He]:{primaries:t,whitePoint:i,transfer:ae,toXYZ:Gp,fromXYZ:Wp,luminanceCoefficients:n,outputColorSpaceConfig:{drawingBufferColorSpace:He}}}),e}var ee=sb();function Ai(e){return e<.04045?e*.0773993808:Math.pow(e*.9478672986+.0521327014,2.4)}function ms(e){return e<.0031308?e*12.92:1.055*Math.pow(e,.41666)-.055}var Jr,Sc=class{static getDataURL(t,n="image/png"){if(/^data:/i.test(t.src)||typeof HTMLCanvasElement>"u")return t.src;let i;if(t instanceof HTMLCanvasElement)i=t;else{Jr===void 0&&(Jr=vs("canvas")),Jr.width=t.width,Jr.height=t.height;let r=Jr.getContext("2d");t instanceof ImageData?r.putImageData(t,0,0):r.drawImage(t,0,0,t.width,t.height),i=Jr}return i.toDataURL(n)}static sRGBToLinear(t){if(typeof HTMLImageElement<"u"&&t instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&t instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&t instanceof ImageBitmap){let n=vs("canvas");n.width=t.width,n.height=t.height;let i=n.getContext("2d");i.drawImage(t,0,0,t.width,t.height);let r=i.getImageData(0,0,t.width,t.height),s=r.data;for(let o=0;o<s.length;o++)s[o]=Ai(s[o]/255)*255;return i.putImageData(r,0,0),n}else if(t.data){let n=t.data.slice(0);for(let i=0;i<n.length;i++)n instanceof Uint8Array||n instanceof Uint8ClampedArray?n[i]=Math.floor(Ai(n[i]/255)*255):n[i]=Ai(n[i]);return{data:n,width:t.width,height:t.height}}else return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),t}},ob=0,xs=class{constructor(t=null){this.isSource=!0,Object.defineProperty(this,"id",{value:ob++}),this.uuid=Ti(),this.data=t,this.dataReady=!0,this.version=0}getSize(t){let n=this.data;return typeof HTMLVideoElement<"u"&&n instanceof HTMLVideoElement?t.set(n.videoWidth,n.videoHeight,0):n instanceof VideoFrame?t.set(n.displayHeight,n.displayWidth,0):n!==null?t.set(n.width,n.height,n.depth||0):t.set(0,0,0),t}set needsUpdate(t){t===!0&&this.version++}toJSON(t){let n=t===void 0||typeof t=="string";if(!n&&t.images[this.uuid]!==void 0)return t.images[this.uuid];let i={uuid:this.uuid,url:""},r=this.data;if(r!==null){let s;if(Array.isArray(r)){s=[];for(let o=0,a=r.length;o<a;o++)r[o].isDataTexture?s.push(wu(r[o].image)):s.push(wu(r[o]))}else s=wu(r);i.url=s}return n||(t.images[this.uuid]=i),i}};function wu(e){return typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap?Sc.getDataURL(e):e.data?{data:Array.from(e.data),width:e.width,height:e.height,type:e.data.constructor.name}:(console.warn("THREE.Texture: Unable to serialize Texture."),{})}var ab=0,Eu=new I,sn=class e extends si{constructor(t=e.DEFAULT_IMAGE,n=e.DEFAULT_MAPPING,i=qi,r=qi,s=Yn,o=Ki,a=zn,c=Jn,l=e.DEFAULT_ANISOTROPY,u=Li){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:ab++}),this.uuid=Ti(),this.name="",this.source=new xs(t),this.mipmaps=[],this.mapping=n,this.channel=0,this.wrapS=i,this.wrapT=r,this.magFilter=s,this.minFilter=o,this.anisotropy=l,this.format=a,this.internalFormat=null,this.type=c,this.offset=new et(0,0),this.repeat=new et(1,1),this.center=new et(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Xt,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=u,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(t&&t.depth&&t.depth>1),this.pmremVersion=0}get width(){return this.source.getSize(Eu).x}get height(){return this.source.getSize(Eu).y}get depth(){return this.source.getSize(Eu).z}get image(){return this.source.data}set image(t=null){this.source.data=t}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(t,n){this.updateRanges.push({start:t,count:n})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(t){return this.name=t.name,this.source=t.source,this.mipmaps=t.mipmaps.slice(0),this.mapping=t.mapping,this.channel=t.channel,this.wrapS=t.wrapS,this.wrapT=t.wrapT,this.magFilter=t.magFilter,this.minFilter=t.minFilter,this.anisotropy=t.anisotropy,this.format=t.format,this.internalFormat=t.internalFormat,this.type=t.type,this.offset.copy(t.offset),this.repeat.copy(t.repeat),this.center.copy(t.center),this.rotation=t.rotation,this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrix.copy(t.matrix),this.generateMipmaps=t.generateMipmaps,this.premultiplyAlpha=t.premultiplyAlpha,this.flipY=t.flipY,this.unpackAlignment=t.unpackAlignment,this.colorSpace=t.colorSpace,this.renderTarget=t.renderTarget,this.isRenderTargetTexture=t.isRenderTargetTexture,this.isArrayTexture=t.isArrayTexture,this.userData=JSON.parse(JSON.stringify(t.userData)),this.needsUpdate=!0,this}setValues(t){for(let n in t){let i=t[n];if(i===void 0){console.warn(`THREE.Texture.setValues(): parameter '${n}' has value of undefined.`);continue}let r=this[n];if(r===void 0){console.warn(`THREE.Texture.setValues(): property '${n}' does not exist.`);continue}r&&i&&r.isVector2&&i.isVector2||r&&i&&r.isVector3&&i.isVector3||r&&i&&r.isMatrix3&&i.isMatrix3?r.copy(i):this[n]=i}}toJSON(t){let n=t===void 0||typeof t=="string";if(!n&&t.textures[this.uuid]!==void 0)return t.textures[this.uuid];let i={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(t).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(i.userData=this.userData),n||(t.textures[this.uuid]=i),i}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(t){if(this.mapping!==hf)return t;if(t.applyMatrix3(this.matrix),t.x<0||t.x>1)switch(this.wrapS){case yc:t.x=t.x-Math.floor(t.x);break;case qi:t.x=t.x<0?0:1;break;case xc:Math.abs(Math.floor(t.x)%2)===1?t.x=Math.ceil(t.x)-t.x:t.x=t.x-Math.floor(t.x);break}if(t.y<0||t.y>1)switch(this.wrapT){case yc:t.y=t.y-Math.floor(t.y);break;case qi:t.y=t.y<0?0:1;break;case xc:Math.abs(Math.floor(t.y)%2)===1?t.y=Math.ceil(t.y)-t.y:t.y=t.y-Math.floor(t.y);break}return this.flipY&&(t.y=1-t.y),t}set needsUpdate(t){t===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(t){t===!0&&this.pmremVersion++}};sn.DEFAULT_IMAGE=null;sn.DEFAULT_MAPPING=hf;sn.DEFAULT_ANISOTROPY=1;var de=class e{constructor(t=0,n=0,i=0,r=1){e.prototype.isVector4=!0,this.x=t,this.y=n,this.z=i,this.w=r}get width(){return this.z}set width(t){this.z=t}get height(){return this.w}set height(t){this.w=t}set(t,n,i,r){return this.x=t,this.y=n,this.z=i,this.w=r,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this.w=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setW(t){return this.w=t,this}setComponent(t,n){switch(t){case 0:this.x=n;break;case 1:this.y=n;break;case 2:this.z=n;break;case 3:this.w=n;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this.w=t.w!==void 0?t.w:1,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this.w+=t.w,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this.w+=t,this}addVectors(t,n){return this.x=t.x+n.x,this.y=t.y+n.y,this.z=t.z+n.z,this.w=t.w+n.w,this}addScaledVector(t,n){return this.x+=t.x*n,this.y+=t.y*n,this.z+=t.z*n,this.w+=t.w*n,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this.w-=t.w,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this.w-=t,this}subVectors(t,n){return this.x=t.x-n.x,this.y=t.y-n.y,this.z=t.z-n.z,this.w=t.w-n.w,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this.w*=t.w,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this.w*=t,this}applyMatrix4(t){let n=this.x,i=this.y,r=this.z,s=this.w,o=t.elements;return this.x=o[0]*n+o[4]*i+o[8]*r+o[12]*s,this.y=o[1]*n+o[5]*i+o[9]*r+o[13]*s,this.z=o[2]*n+o[6]*i+o[10]*r+o[14]*s,this.w=o[3]*n+o[7]*i+o[11]*r+o[15]*s,this}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this.w/=t.w,this}divideScalar(t){return this.multiplyScalar(1/t)}setAxisAngleFromQuaternion(t){this.w=2*Math.acos(t.w);let n=Math.sqrt(1-t.w*t.w);return n<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=t.x/n,this.y=t.y/n,this.z=t.z/n),this}setAxisAngleFromRotationMatrix(t){let n,i,r,s,c=t.elements,l=c[0],u=c[4],h=c[8],f=c[1],d=c[5],m=c[9],_=c[2],g=c[6],p=c[10];if(Math.abs(u-f)<.01&&Math.abs(h-_)<.01&&Math.abs(m-g)<.01){if(Math.abs(u+f)<.1&&Math.abs(h+_)<.1&&Math.abs(m+g)<.1&&Math.abs(l+d+p-3)<.1)return this.set(1,0,0,0),this;n=Math.PI;let x=(l+1)/2,v=(d+1)/2,M=(p+1)/2,S=(u+f)/4,C=(h+_)/4,P=(m+g)/4;return x>v&&x>M?x<.01?(i=0,r=.707106781,s=.707106781):(i=Math.sqrt(x),r=S/i,s=C/i):v>M?v<.01?(i=.707106781,r=0,s=.707106781):(r=Math.sqrt(v),i=S/r,s=P/r):M<.01?(i=.707106781,r=.707106781,s=0):(s=Math.sqrt(M),i=C/s,r=P/s),this.set(i,r,s,n),this}let b=Math.sqrt((g-m)*(g-m)+(h-_)*(h-_)+(f-u)*(f-u));return Math.abs(b)<.001&&(b=1),this.x=(g-m)/b,this.y=(h-_)/b,this.z=(f-u)/b,this.w=Math.acos((l+d+p-1)/2),this}setFromMatrixPosition(t){let n=t.elements;return this.x=n[12],this.y=n[13],this.z=n[14],this.w=n[15],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this.w=Math.min(this.w,t.w),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this.w=Math.max(this.w,t.w),this}clamp(t,n){return this.x=Kt(this.x,t.x,n.x),this.y=Kt(this.y,t.y,n.y),this.z=Kt(this.z,t.z,n.z),this.w=Kt(this.w,t.w,n.w),this}clampScalar(t,n){return this.x=Kt(this.x,t,n),this.y=Kt(this.y,t,n),this.z=Kt(this.z,t,n),this.w=Kt(this.w,t,n),this}clampLength(t,n){let i=this.length();return this.divideScalar(i||1).multiplyScalar(Kt(i,t,n))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z+this.w*t.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,n){return this.x+=(t.x-this.x)*n,this.y+=(t.y-this.y)*n,this.z+=(t.z-this.z)*n,this.w+=(t.w-this.w)*n,this}lerpVectors(t,n,i){return this.x=t.x+(n.x-t.x)*i,this.y=t.y+(n.y-t.y)*i,this.z=t.z+(n.z-t.z)*i,this.w=t.w+(n.w-t.w)*i,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z&&t.w===this.w}fromArray(t,n=0){return this.x=t[n],this.y=t[n+1],this.z=t[n+2],this.w=t[n+3],this}toArray(t=[],n=0){return t[n]=this.x,t[n+1]=this.y,t[n+2]=this.z,t[n+3]=this.w,t}fromBufferAttribute(t,n){return this.x=t.getX(n),this.y=t.getY(n),this.z=t.getZ(n),this.w=t.getW(n),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}},wc=class extends si{constructor(t=1,n=1,i={}){super(),i=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:Yn,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1},i),this.isRenderTarget=!0,this.width=t,this.height=n,this.depth=i.depth,this.scissor=new de(0,0,t,n),this.scissorTest=!1,this.viewport=new de(0,0,t,n);let r={width:t,height:n,depth:i.depth},s=new sn(r);this.textures=[];let o=i.count;for(let a=0;a<o;a++)this.textures[a]=s.clone(),this.textures[a].isRenderTargetTexture=!0,this.textures[a].renderTarget=this;this._setTextureOptions(i),this.depthBuffer=i.depthBuffer,this.stencilBuffer=i.stencilBuffer,this.resolveDepthBuffer=i.resolveDepthBuffer,this.resolveStencilBuffer=i.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=i.depthTexture,this.samples=i.samples,this.multiview=i.multiview}_setTextureOptions(t={}){let n={minFilter:Yn,generateMipmaps:!1,flipY:!1,internalFormat:null};t.mapping!==void 0&&(n.mapping=t.mapping),t.wrapS!==void 0&&(n.wrapS=t.wrapS),t.wrapT!==void 0&&(n.wrapT=t.wrapT),t.wrapR!==void 0&&(n.wrapR=t.wrapR),t.magFilter!==void 0&&(n.magFilter=t.magFilter),t.minFilter!==void 0&&(n.minFilter=t.minFilter),t.format!==void 0&&(n.format=t.format),t.type!==void 0&&(n.type=t.type),t.anisotropy!==void 0&&(n.anisotropy=t.anisotropy),t.colorSpace!==void 0&&(n.colorSpace=t.colorSpace),t.flipY!==void 0&&(n.flipY=t.flipY),t.generateMipmaps!==void 0&&(n.generateMipmaps=t.generateMipmaps),t.internalFormat!==void 0&&(n.internalFormat=t.internalFormat);for(let i=0;i<this.textures.length;i++)this.textures[i].setValues(n)}get texture(){return this.textures[0]}set texture(t){this.textures[0]=t}set depthTexture(t){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),t!==null&&(t.renderTarget=this),this._depthTexture=t}get depthTexture(){return this._depthTexture}setSize(t,n,i=1){if(this.width!==t||this.height!==n||this.depth!==i){this.width=t,this.height=n,this.depth=i;for(let r=0,s=this.textures.length;r<s;r++)this.textures[r].image.width=t,this.textures[r].image.height=n,this.textures[r].image.depth=i,this.textures[r].isArrayTexture=this.textures[r].image.depth>1;this.dispose()}this.viewport.set(0,0,t,n),this.scissor.set(0,0,t,n)}clone(){return new this.constructor().copy(this)}copy(t){this.width=t.width,this.height=t.height,this.depth=t.depth,this.scissor.copy(t.scissor),this.scissorTest=t.scissorTest,this.viewport.copy(t.viewport),this.textures.length=0;for(let n=0,i=t.textures.length;n<i;n++){this.textures[n]=t.textures[n].clone(),this.textures[n].isRenderTargetTexture=!0,this.textures[n].renderTarget=this;let r=Object.assign({},t.textures[n].image);this.textures[n].source=new xs(r)}return this.depthBuffer=t.depthBuffer,this.stencilBuffer=t.stencilBuffer,this.resolveDepthBuffer=t.resolveDepthBuffer,this.resolveStencilBuffer=t.resolveStencilBuffer,t.depthTexture!==null&&(this.depthTexture=t.depthTexture.clone()),this.samples=t.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}},Ze=class extends wc{constructor(t=1,n=1,i={}){super(t,n,i),this.isWebGLRenderTarget=!0}},To=class extends sn{constructor(t=null,n=1,i=1,r=1){super(null),this.isDataArrayTexture=!0,this.image={data:t,width:n,height:i,depth:r},this.magFilter=Dn,this.minFilter=Dn,this.wrapR=qi,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(t){this.layerUpdates.add(t)}clearLayerUpdates(){this.layerUpdates.clear()}};var Ec=class extends sn{constructor(t=null,n=1,i=1,r=1){super(null),this.isData3DTexture=!0,this.image={data:t,width:n,height:i,depth:r},this.magFilter=Dn,this.minFilter=Dn,this.wrapR=qi,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}};var fn=class{constructor(t=new I(1/0,1/0,1/0),n=new I(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=t,this.max=n}set(t,n){return this.min.copy(t),this.max.copy(n),this}setFromArray(t){this.makeEmpty();for(let n=0,i=t.length;n<i;n+=3)this.expandByPoint(Wn.fromArray(t,n));return this}setFromBufferAttribute(t){this.makeEmpty();for(let n=0,i=t.count;n<i;n++)this.expandByPoint(Wn.fromBufferAttribute(t,n));return this}setFromPoints(t){this.makeEmpty();for(let n=0,i=t.length;n<i;n++)this.expandByPoint(t[n]);return this}setFromCenterAndSize(t,n){let i=Wn.copy(n).multiplyScalar(.5);return this.min.copy(t).sub(i),this.max.copy(t).add(i),this}setFromObject(t,n=!1){return this.makeEmpty(),this.expandByObject(t,n)}clone(){return new this.constructor().copy(this)}copy(t){return this.min.copy(t.min),this.max.copy(t.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(t){return this.isEmpty()?t.set(0,0,0):t.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(t){return this.isEmpty()?t.set(0,0,0):t.subVectors(this.max,this.min)}expandByPoint(t){return this.min.min(t),this.max.max(t),this}expandByVector(t){return this.min.sub(t),this.max.add(t),this}expandByScalar(t){return this.min.addScalar(-t),this.max.addScalar(t),this}expandByObject(t,n=!1){t.updateWorldMatrix(!1,!1);let i=t.geometry;if(i!==void 0){let s=i.getAttribute("position");if(n===!0&&s!==void 0&&t.isInstancedMesh!==!0)for(let o=0,a=s.count;o<a;o++)t.isMesh===!0?t.getVertexPosition(o,Wn):Wn.fromBufferAttribute(s,o),Wn.applyMatrix4(t.matrixWorld),this.expandByPoint(Wn);else t.boundingBox!==void 0?(t.boundingBox===null&&t.computeBoundingBox(),Ga.copy(t.boundingBox)):(i.boundingBox===null&&i.computeBoundingBox(),Ga.copy(i.boundingBox)),Ga.applyMatrix4(t.matrixWorld),this.union(Ga)}let r=t.children;for(let s=0,o=r.length;s<o;s++)this.expandByObject(r[s],n);return this}containsPoint(t){return t.x>=this.min.x&&t.x<=this.max.x&&t.y>=this.min.y&&t.y<=this.max.y&&t.z>=this.min.z&&t.z<=this.max.z}containsBox(t){return this.min.x<=t.min.x&&t.max.x<=this.max.x&&this.min.y<=t.min.y&&t.max.y<=this.max.y&&this.min.z<=t.min.z&&t.max.z<=this.max.z}getParameter(t,n){return n.set((t.x-this.min.x)/(this.max.x-this.min.x),(t.y-this.min.y)/(this.max.y-this.min.y),(t.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(t){return t.max.x>=this.min.x&&t.min.x<=this.max.x&&t.max.y>=this.min.y&&t.min.y<=this.max.y&&t.max.z>=this.min.z&&t.min.z<=this.max.z}intersectsSphere(t){return this.clampPoint(t.center,Wn),Wn.distanceToSquared(t.center)<=t.radius*t.radius}intersectsPlane(t){let n,i;return t.normal.x>0?(n=t.normal.x*this.min.x,i=t.normal.x*this.max.x):(n=t.normal.x*this.max.x,i=t.normal.x*this.min.x),t.normal.y>0?(n+=t.normal.y*this.min.y,i+=t.normal.y*this.max.y):(n+=t.normal.y*this.max.y,i+=t.normal.y*this.min.y),t.normal.z>0?(n+=t.normal.z*this.min.z,i+=t.normal.z*this.max.z):(n+=t.normal.z*this.max.z,i+=t.normal.z*this.min.z),n<=-t.constant&&i>=-t.constant}intersectsTriangle(t){if(this.isEmpty())return!1;this.getCenter(lo),Wa.subVectors(this.max,lo),Qr.subVectors(t.a,lo),ts.subVectors(t.b,lo),es.subVectors(t.c,lo),Bi.subVectors(ts,Qr),Vi.subVectors(es,ts),vr.subVectors(Qr,es);let n=[0,-Bi.z,Bi.y,0,-Vi.z,Vi.y,0,-vr.z,vr.y,Bi.z,0,-Bi.x,Vi.z,0,-Vi.x,vr.z,0,-vr.x,-Bi.y,Bi.x,0,-Vi.y,Vi.x,0,-vr.y,vr.x,0];return!Tu(n,Qr,ts,es,Wa)||(n=[1,0,0,0,1,0,0,0,1],!Tu(n,Qr,ts,es,Wa))?!1:(ja.crossVectors(Bi,Vi),n=[ja.x,ja.y,ja.z],Tu(n,Qr,ts,es,Wa))}clampPoint(t,n){return n.copy(t).clamp(this.min,this.max)}distanceToPoint(t){return this.clampPoint(t,Wn).distanceTo(t)}getBoundingSphere(t){return this.isEmpty()?t.makeEmpty():(this.getCenter(t.center),t.radius=this.getSize(Wn).length()*.5),t}intersect(t){return this.min.max(t.min),this.max.min(t.max),this.isEmpty()&&this.makeEmpty(),this}union(t){return this.min.min(t.min),this.max.max(t.max),this}applyMatrix4(t){return this.isEmpty()?this:(xi[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(t),xi[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(t),xi[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(t),xi[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(t),xi[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(t),xi[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(t),xi[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(t),xi[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(t),this.setFromPoints(xi),this)}translate(t){return this.min.add(t),this.max.add(t),this}equals(t){return t.min.equals(this.min)&&t.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(t){return this.min.fromArray(t.min),this.max.fromArray(t.max),this}},xi=[new I,new I,new I,new I,new I,new I,new I,new I],Wn=new I,Ga=new fn,Qr=new I,ts=new I,es=new I,Bi=new I,Vi=new I,vr=new I,lo=new I,Wa=new I,ja=new I,yr=new I;function Tu(e,t,n,i,r){for(let s=0,o=e.length-3;s<=o;s+=3){yr.fromArray(e,s);let a=r.x*Math.abs(yr.x)+r.y*Math.abs(yr.y)+r.z*Math.abs(yr.z),c=t.dot(yr),l=n.dot(yr),u=i.dot(yr);if(Math.max(-Math.max(c,l,u),Math.min(c,l,u))>a)return!1}return!0}var cb=new fn,ho=new I,Au=new I,oi=class{constructor(t=new I,n=-1){this.isSphere=!0,this.center=t,this.radius=n}set(t,n){return this.center.copy(t),this.radius=n,this}setFromPoints(t,n){let i=this.center;n!==void 0?i.copy(n):cb.setFromPoints(t).getCenter(i);let r=0;for(let s=0,o=t.length;s<o;s++)r=Math.max(r,i.distanceToSquared(t[s]));return this.radius=Math.sqrt(r),this}copy(t){return this.center.copy(t.center),this.radius=t.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(t){return t.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(t){return t.distanceTo(this.center)-this.radius}intersectsSphere(t){let n=this.radius+t.radius;return t.center.distanceToSquared(this.center)<=n*n}intersectsBox(t){return t.intersectsSphere(this)}intersectsPlane(t){return Math.abs(t.distanceToPoint(this.center))<=this.radius}clampPoint(t,n){let i=this.center.distanceToSquared(t);return n.copy(t),i>this.radius*this.radius&&(n.sub(this.center).normalize(),n.multiplyScalar(this.radius).add(this.center)),n}getBoundingBox(t){return this.isEmpty()?(t.makeEmpty(),t):(t.set(this.center,this.center),t.expandByScalar(this.radius),t)}applyMatrix4(t){return this.center.applyMatrix4(t),this.radius=this.radius*t.getMaxScaleOnAxis(),this}translate(t){return this.center.add(t),this}expandByPoint(t){if(this.isEmpty())return this.center.copy(t),this.radius=0,this;ho.subVectors(t,this.center);let n=ho.lengthSq();if(n>this.radius*this.radius){let i=Math.sqrt(n),r=(i-this.radius)*.5;this.center.addScaledVector(ho,r/i),this.radius+=r}return this}union(t){return t.isEmpty()?this:this.isEmpty()?(this.copy(t),this):(this.center.equals(t.center)===!0?this.radius=Math.max(this.radius,t.radius):(Au.subVectors(t.center,this.center).setLength(t.radius),this.expandByPoint(ho.copy(t.center).add(Au)),this.expandByPoint(ho.copy(t.center).sub(Au))),this)}equals(t){return t.center.equals(this.center)&&t.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(t){return this.radius=t.radius,this.center.fromArray(t.center),this}},bi=new I,Cu=new I,qa=new I,Hi=new I,Ru=new I,Xa=new I,Pu=new I,Ri=class{constructor(t=new I,n=new I(0,0,-1)){this.origin=t,this.direction=n}set(t,n){return this.origin.copy(t),this.direction.copy(n),this}copy(t){return this.origin.copy(t.origin),this.direction.copy(t.direction),this}at(t,n){return n.copy(this.origin).addScaledVector(this.direction,t)}lookAt(t){return this.direction.copy(t).sub(this.origin).normalize(),this}recast(t){return this.origin.copy(this.at(t,bi)),this}closestPointToPoint(t,n){n.subVectors(t,this.origin);let i=n.dot(this.direction);return i<0?n.copy(this.origin):n.copy(this.origin).addScaledVector(this.direction,i)}distanceToPoint(t){return Math.sqrt(this.distanceSqToPoint(t))}distanceSqToPoint(t){let n=bi.subVectors(t,this.origin).dot(this.direction);return n<0?this.origin.distanceToSquared(t):(bi.copy(this.origin).addScaledVector(this.direction,n),bi.distanceToSquared(t))}distanceSqToSegment(t,n,i,r){Cu.copy(t).add(n).multiplyScalar(.5),qa.copy(n).sub(t).normalize(),Hi.copy(this.origin).sub(Cu);let s=t.distanceTo(n)*.5,o=-this.direction.dot(qa),a=Hi.dot(this.direction),c=-Hi.dot(qa),l=Hi.lengthSq(),u=Math.abs(1-o*o),h,f,d,m;if(u>0)if(h=o*c-a,f=o*a-c,m=s*u,h>=0)if(f>=-m)if(f<=m){let _=1/u;h*=_,f*=_,d=h*(h+o*f+2*a)+f*(o*h+f+2*c)+l}else f=s,h=Math.max(0,-(o*f+a)),d=-h*h+f*(f+2*c)+l;else f=-s,h=Math.max(0,-(o*f+a)),d=-h*h+f*(f+2*c)+l;else f<=-m?(h=Math.max(0,-(-o*s+a)),f=h>0?-s:Math.min(Math.max(-s,-c),s),d=-h*h+f*(f+2*c)+l):f<=m?(h=0,f=Math.min(Math.max(-s,-c),s),d=f*(f+2*c)+l):(h=Math.max(0,-(o*s+a)),f=h>0?s:Math.min(Math.max(-s,-c),s),d=-h*h+f*(f+2*c)+l);else f=o>0?-s:s,h=Math.max(0,-(o*f+a)),d=-h*h+f*(f+2*c)+l;return i&&i.copy(this.origin).addScaledVector(this.direction,h),r&&r.copy(Cu).addScaledVector(qa,f),d}intersectSphere(t,n){bi.subVectors(t.center,this.origin);let i=bi.dot(this.direction),r=bi.dot(bi)-i*i,s=t.radius*t.radius;if(r>s)return null;let o=Math.sqrt(s-r),a=i-o,c=i+o;return c<0?null:a<0?this.at(c,n):this.at(a,n)}intersectsSphere(t){return t.radius<0?!1:this.distanceSqToPoint(t.center)<=t.radius*t.radius}distanceToPlane(t){let n=t.normal.dot(this.direction);if(n===0)return t.distanceToPoint(this.origin)===0?0:null;let i=-(this.origin.dot(t.normal)+t.constant)/n;return i>=0?i:null}intersectPlane(t,n){let i=this.distanceToPlane(t);return i===null?null:this.at(i,n)}intersectsPlane(t){let n=t.distanceToPoint(this.origin);return n===0||t.normal.dot(this.direction)*n<0}intersectBox(t,n){let i,r,s,o,a,c,l=1/this.direction.x,u=1/this.direction.y,h=1/this.direction.z,f=this.origin;return l>=0?(i=(t.min.x-f.x)*l,r=(t.max.x-f.x)*l):(i=(t.max.x-f.x)*l,r=(t.min.x-f.x)*l),u>=0?(s=(t.min.y-f.y)*u,o=(t.max.y-f.y)*u):(s=(t.max.y-f.y)*u,o=(t.min.y-f.y)*u),i>o||s>r||((s>i||isNaN(i))&&(i=s),(o<r||isNaN(r))&&(r=o),h>=0?(a=(t.min.z-f.z)*h,c=(t.max.z-f.z)*h):(a=(t.max.z-f.z)*h,c=(t.min.z-f.z)*h),i>c||a>r)||((a>i||i!==i)&&(i=a),(c<r||r!==r)&&(r=c),r<0)?null:this.at(i>=0?i:r,n)}intersectsBox(t){return this.intersectBox(t,bi)!==null}intersectTriangle(t,n,i,r,s){Ru.subVectors(n,t),Xa.subVectors(i,t),Pu.crossVectors(Ru,Xa);let o=this.direction.dot(Pu),a;if(o>0){if(r)return null;a=1}else if(o<0)a=-1,o=-o;else return null;Hi.subVectors(this.origin,t);let c=a*this.direction.dot(Xa.crossVectors(Hi,Xa));if(c<0)return null;let l=a*this.direction.dot(Ru.cross(Hi));if(l<0||c+l>o)return null;let u=-a*Hi.dot(Pu);return u<0?null:this.at(u/o,s)}applyMatrix4(t){return this.origin.applyMatrix4(t),this.direction.transformDirection(t),this}equals(t){return t.origin.equals(this.origin)&&t.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}},Vt=class e{constructor(t,n,i,r,s,o,a,c,l,u,h,f,d,m,_,g){e.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],t!==void 0&&this.set(t,n,i,r,s,o,a,c,l,u,h,f,d,m,_,g)}set(t,n,i,r,s,o,a,c,l,u,h,f,d,m,_,g){let p=this.elements;return p[0]=t,p[4]=n,p[8]=i,p[12]=r,p[1]=s,p[5]=o,p[9]=a,p[13]=c,p[2]=l,p[6]=u,p[10]=h,p[14]=f,p[3]=d,p[7]=m,p[11]=_,p[15]=g,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new e().fromArray(this.elements)}copy(t){let n=this.elements,i=t.elements;return n[0]=i[0],n[1]=i[1],n[2]=i[2],n[3]=i[3],n[4]=i[4],n[5]=i[5],n[6]=i[6],n[7]=i[7],n[8]=i[8],n[9]=i[9],n[10]=i[10],n[11]=i[11],n[12]=i[12],n[13]=i[13],n[14]=i[14],n[15]=i[15],this}copyPosition(t){let n=this.elements,i=t.elements;return n[12]=i[12],n[13]=i[13],n[14]=i[14],this}setFromMatrix3(t){let n=t.elements;return this.set(n[0],n[3],n[6],0,n[1],n[4],n[7],0,n[2],n[5],n[8],0,0,0,0,1),this}extractBasis(t,n,i){return t.setFromMatrixColumn(this,0),n.setFromMatrixColumn(this,1),i.setFromMatrixColumn(this,2),this}makeBasis(t,n,i){return this.set(t.x,n.x,i.x,0,t.y,n.y,i.y,0,t.z,n.z,i.z,0,0,0,0,1),this}extractRotation(t){let n=this.elements,i=t.elements,r=1/ns.setFromMatrixColumn(t,0).length(),s=1/ns.setFromMatrixColumn(t,1).length(),o=1/ns.setFromMatrixColumn(t,2).length();return n[0]=i[0]*r,n[1]=i[1]*r,n[2]=i[2]*r,n[3]=0,n[4]=i[4]*s,n[5]=i[5]*s,n[6]=i[6]*s,n[7]=0,n[8]=i[8]*o,n[9]=i[9]*o,n[10]=i[10]*o,n[11]=0,n[12]=0,n[13]=0,n[14]=0,n[15]=1,this}makeRotationFromEuler(t){let n=this.elements,i=t.x,r=t.y,s=t.z,o=Math.cos(i),a=Math.sin(i),c=Math.cos(r),l=Math.sin(r),u=Math.cos(s),h=Math.sin(s);if(t.order==="XYZ"){let f=o*u,d=o*h,m=a*u,_=a*h;n[0]=c*u,n[4]=-c*h,n[8]=l,n[1]=d+m*l,n[5]=f-_*l,n[9]=-a*c,n[2]=_-f*l,n[6]=m+d*l,n[10]=o*c}else if(t.order==="YXZ"){let f=c*u,d=c*h,m=l*u,_=l*h;n[0]=f+_*a,n[4]=m*a-d,n[8]=o*l,n[1]=o*h,n[5]=o*u,n[9]=-a,n[2]=d*a-m,n[6]=_+f*a,n[10]=o*c}else if(t.order==="ZXY"){let f=c*u,d=c*h,m=l*u,_=l*h;n[0]=f-_*a,n[4]=-o*h,n[8]=m+d*a,n[1]=d+m*a,n[5]=o*u,n[9]=_-f*a,n[2]=-o*l,n[6]=a,n[10]=o*c}else if(t.order==="ZYX"){let f=o*u,d=o*h,m=a*u,_=a*h;n[0]=c*u,n[4]=m*l-d,n[8]=f*l+_,n[1]=c*h,n[5]=_*l+f,n[9]=d*l-m,n[2]=-l,n[6]=a*c,n[10]=o*c}else if(t.order==="YZX"){let f=o*c,d=o*l,m=a*c,_=a*l;n[0]=c*u,n[4]=_-f*h,n[8]=m*h+d,n[1]=h,n[5]=o*u,n[9]=-a*u,n[2]=-l*u,n[6]=d*h+m,n[10]=f-_*h}else if(t.order==="XZY"){let f=o*c,d=o*l,m=a*c,_=a*l;n[0]=c*u,n[4]=-h,n[8]=l*u,n[1]=f*h+_,n[5]=o*u,n[9]=d*h-m,n[2]=m*h-d,n[6]=a*u,n[10]=_*h+f}return n[3]=0,n[7]=0,n[11]=0,n[12]=0,n[13]=0,n[14]=0,n[15]=1,this}makeRotationFromQuaternion(t){return this.compose(lb,t,hb)}lookAt(t,n,i){let r=this.elements;return yn.subVectors(t,n),yn.lengthSq()===0&&(yn.z=1),yn.normalize(),Gi.crossVectors(i,yn),Gi.lengthSq()===0&&(Math.abs(i.z)===1?yn.x+=1e-4:yn.z+=1e-4,yn.normalize(),Gi.crossVectors(i,yn)),Gi.normalize(),$a.crossVectors(yn,Gi),r[0]=Gi.x,r[4]=$a.x,r[8]=yn.x,r[1]=Gi.y,r[5]=$a.y,r[9]=yn.y,r[2]=Gi.z,r[6]=$a.z,r[10]=yn.z,this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,n){let i=t.elements,r=n.elements,s=this.elements,o=i[0],a=i[4],c=i[8],l=i[12],u=i[1],h=i[5],f=i[9],d=i[13],m=i[2],_=i[6],g=i[10],p=i[14],b=i[3],x=i[7],v=i[11],M=i[15],S=r[0],C=r[4],P=r[8],T=r[12],w=r[1],R=r[5],V=r[9],N=r[13],z=r[2],U=r[6],G=r[10],K=r[14],q=r[3],ot=r[7],gt=r[11],Y=r[15];return s[0]=o*S+a*w+c*z+l*q,s[4]=o*C+a*R+c*U+l*ot,s[8]=o*P+a*V+c*G+l*gt,s[12]=o*T+a*N+c*K+l*Y,s[1]=u*S+h*w+f*z+d*q,s[5]=u*C+h*R+f*U+d*ot,s[9]=u*P+h*V+f*G+d*gt,s[13]=u*T+h*N+f*K+d*Y,s[2]=m*S+_*w+g*z+p*q,s[6]=m*C+_*R+g*U+p*ot,s[10]=m*P+_*V+g*G+p*gt,s[14]=m*T+_*N+g*K+p*Y,s[3]=b*S+x*w+v*z+M*q,s[7]=b*C+x*R+v*U+M*ot,s[11]=b*P+x*V+v*G+M*gt,s[15]=b*T+x*N+v*K+M*Y,this}multiplyScalar(t){let n=this.elements;return n[0]*=t,n[4]*=t,n[8]*=t,n[12]*=t,n[1]*=t,n[5]*=t,n[9]*=t,n[13]*=t,n[2]*=t,n[6]*=t,n[10]*=t,n[14]*=t,n[3]*=t,n[7]*=t,n[11]*=t,n[15]*=t,this}determinant(){let t=this.elements,n=t[0],i=t[4],r=t[8],s=t[12],o=t[1],a=t[5],c=t[9],l=t[13],u=t[2],h=t[6],f=t[10],d=t[14],m=t[3],_=t[7],g=t[11],p=t[15];return m*(+s*c*h-r*l*h-s*a*f+i*l*f+r*a*d-i*c*d)+_*(+n*c*d-n*l*f+s*o*f-r*o*d+r*l*u-s*c*u)+g*(+n*l*h-n*a*d-s*o*h+i*o*d+s*a*u-i*l*u)+p*(-r*a*u-n*c*h+n*a*f+r*o*h-i*o*f+i*c*u)}transpose(){let t=this.elements,n;return n=t[1],t[1]=t[4],t[4]=n,n=t[2],t[2]=t[8],t[8]=n,n=t[6],t[6]=t[9],t[9]=n,n=t[3],t[3]=t[12],t[12]=n,n=t[7],t[7]=t[13],t[13]=n,n=t[11],t[11]=t[14],t[14]=n,this}setPosition(t,n,i){let r=this.elements;return t.isVector3?(r[12]=t.x,r[13]=t.y,r[14]=t.z):(r[12]=t,r[13]=n,r[14]=i),this}invert(){let t=this.elements,n=t[0],i=t[1],r=t[2],s=t[3],o=t[4],a=t[5],c=t[6],l=t[7],u=t[8],h=t[9],f=t[10],d=t[11],m=t[12],_=t[13],g=t[14],p=t[15],b=h*g*l-_*f*l+_*c*d-a*g*d-h*c*p+a*f*p,x=m*f*l-u*g*l-m*c*d+o*g*d+u*c*p-o*f*p,v=u*_*l-m*h*l+m*a*d-o*_*d-u*a*p+o*h*p,M=m*h*c-u*_*c-m*a*f+o*_*f+u*a*g-o*h*g,S=n*b+i*x+r*v+s*M;if(S===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let C=1/S;return t[0]=b*C,t[1]=(_*f*s-h*g*s-_*r*d+i*g*d+h*r*p-i*f*p)*C,t[2]=(a*g*s-_*c*s+_*r*l-i*g*l-a*r*p+i*c*p)*C,t[3]=(h*c*s-a*f*s-h*r*l+i*f*l+a*r*d-i*c*d)*C,t[4]=x*C,t[5]=(u*g*s-m*f*s+m*r*d-n*g*d-u*r*p+n*f*p)*C,t[6]=(m*c*s-o*g*s-m*r*l+n*g*l+o*r*p-n*c*p)*C,t[7]=(o*f*s-u*c*s+u*r*l-n*f*l-o*r*d+n*c*d)*C,t[8]=v*C,t[9]=(m*h*s-u*_*s-m*i*d+n*_*d+u*i*p-n*h*p)*C,t[10]=(o*_*s-m*a*s+m*i*l-n*_*l-o*i*p+n*a*p)*C,t[11]=(u*a*s-o*h*s-u*i*l+n*h*l+o*i*d-n*a*d)*C,t[12]=M*C,t[13]=(u*_*r-m*h*r+m*i*f-n*_*f-u*i*g+n*h*g)*C,t[14]=(m*a*r-o*_*r-m*i*c+n*_*c+o*i*g-n*a*g)*C,t[15]=(o*h*r-u*a*r+u*i*c-n*h*c-o*i*f+n*a*f)*C,this}scale(t){let n=this.elements,i=t.x,r=t.y,s=t.z;return n[0]*=i,n[4]*=r,n[8]*=s,n[1]*=i,n[5]*=r,n[9]*=s,n[2]*=i,n[6]*=r,n[10]*=s,n[3]*=i,n[7]*=r,n[11]*=s,this}getMaxScaleOnAxis(){let t=this.elements,n=t[0]*t[0]+t[1]*t[1]+t[2]*t[2],i=t[4]*t[4]+t[5]*t[5]+t[6]*t[6],r=t[8]*t[8]+t[9]*t[9]+t[10]*t[10];return Math.sqrt(Math.max(n,i,r))}makeTranslation(t,n,i){return t.isVector3?this.set(1,0,0,t.x,0,1,0,t.y,0,0,1,t.z,0,0,0,1):this.set(1,0,0,t,0,1,0,n,0,0,1,i,0,0,0,1),this}makeRotationX(t){let n=Math.cos(t),i=Math.sin(t);return this.set(1,0,0,0,0,n,-i,0,0,i,n,0,0,0,0,1),this}makeRotationY(t){let n=Math.cos(t),i=Math.sin(t);return this.set(n,0,i,0,0,1,0,0,-i,0,n,0,0,0,0,1),this}makeRotationZ(t){let n=Math.cos(t),i=Math.sin(t);return this.set(n,-i,0,0,i,n,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(t,n){let i=Math.cos(n),r=Math.sin(n),s=1-i,o=t.x,a=t.y,c=t.z,l=s*o,u=s*a;return this.set(l*o+i,l*a-r*c,l*c+r*a,0,l*a+r*c,u*a+i,u*c-r*o,0,l*c-r*a,u*c+r*o,s*c*c+i,0,0,0,0,1),this}makeScale(t,n,i){return this.set(t,0,0,0,0,n,0,0,0,0,i,0,0,0,0,1),this}makeShear(t,n,i,r,s,o){return this.set(1,i,s,0,t,1,o,0,n,r,1,0,0,0,0,1),this}compose(t,n,i){let r=this.elements,s=n._x,o=n._y,a=n._z,c=n._w,l=s+s,u=o+o,h=a+a,f=s*l,d=s*u,m=s*h,_=o*u,g=o*h,p=a*h,b=c*l,x=c*u,v=c*h,M=i.x,S=i.y,C=i.z;return r[0]=(1-(_+p))*M,r[1]=(d+v)*M,r[2]=(m-x)*M,r[3]=0,r[4]=(d-v)*S,r[5]=(1-(f+p))*S,r[6]=(g+b)*S,r[7]=0,r[8]=(m+x)*C,r[9]=(g-b)*C,r[10]=(1-(f+_))*C,r[11]=0,r[12]=t.x,r[13]=t.y,r[14]=t.z,r[15]=1,this}decompose(t,n,i){let r=this.elements,s=ns.set(r[0],r[1],r[2]).length(),o=ns.set(r[4],r[5],r[6]).length(),a=ns.set(r[8],r[9],r[10]).length();this.determinant()<0&&(s=-s),t.x=r[12],t.y=r[13],t.z=r[14],jn.copy(this);let l=1/s,u=1/o,h=1/a;return jn.elements[0]*=l,jn.elements[1]*=l,jn.elements[2]*=l,jn.elements[4]*=u,jn.elements[5]*=u,jn.elements[6]*=u,jn.elements[8]*=h,jn.elements[9]*=h,jn.elements[10]*=h,n.setFromRotationMatrix(jn),i.x=s,i.y=o,i.z=a,this}makePerspective(t,n,i,r,s,o,a=$n,c=!1){let l=this.elements,u=2*s/(n-t),h=2*s/(i-r),f=(n+t)/(n-t),d=(i+r)/(i-r),m,_;if(c)m=s/(o-s),_=o*s/(o-s);else if(a===$n)m=-(o+s)/(o-s),_=-2*o*s/(o-s);else if(a===Eo)m=-o/(o-s),_=-o*s/(o-s);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+a);return l[0]=u,l[4]=0,l[8]=f,l[12]=0,l[1]=0,l[5]=h,l[9]=d,l[13]=0,l[2]=0,l[6]=0,l[10]=m,l[14]=_,l[3]=0,l[7]=0,l[11]=-1,l[15]=0,this}makeOrthographic(t,n,i,r,s,o,a=$n,c=!1){let l=this.elements,u=2/(n-t),h=2/(i-r),f=-(n+t)/(n-t),d=-(i+r)/(i-r),m,_;if(c)m=1/(o-s),_=o/(o-s);else if(a===$n)m=-2/(o-s),_=-(o+s)/(o-s);else if(a===Eo)m=-1/(o-s),_=-s/(o-s);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+a);return l[0]=u,l[4]=0,l[8]=0,l[12]=f,l[1]=0,l[5]=h,l[9]=0,l[13]=d,l[2]=0,l[6]=0,l[10]=m,l[14]=_,l[3]=0,l[7]=0,l[11]=0,l[15]=1,this}equals(t){let n=this.elements,i=t.elements;for(let r=0;r<16;r++)if(n[r]!==i[r])return!1;return!0}fromArray(t,n=0){for(let i=0;i<16;i++)this.elements[i]=t[i+n];return this}toArray(t=[],n=0){let i=this.elements;return t[n]=i[0],t[n+1]=i[1],t[n+2]=i[2],t[n+3]=i[3],t[n+4]=i[4],t[n+5]=i[5],t[n+6]=i[6],t[n+7]=i[7],t[n+8]=i[8],t[n+9]=i[9],t[n+10]=i[10],t[n+11]=i[11],t[n+12]=i[12],t[n+13]=i[13],t[n+14]=i[14],t[n+15]=i[15],t}},ns=new I,jn=new Vt,lb=new I(0,0,0),hb=new I(1,1,1),Gi=new I,$a=new I,yn=new I,jp=new Vt,qp=new Ne,Ln=class e{constructor(t=0,n=0,i=0,r=e.DEFAULT_ORDER){this.isEuler=!0,this._x=t,this._y=n,this._z=i,this._order=r}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get order(){return this._order}set order(t){this._order=t,this._onChangeCallback()}set(t,n,i,r=this._order){return this._x=t,this._y=n,this._z=i,this._order=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(t){return this._x=t._x,this._y=t._y,this._z=t._z,this._order=t._order,this._onChangeCallback(),this}setFromRotationMatrix(t,n=this._order,i=!0){let r=t.elements,s=r[0],o=r[4],a=r[8],c=r[1],l=r[5],u=r[9],h=r[2],f=r[6],d=r[10];switch(n){case"XYZ":this._y=Math.asin(Kt(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(-u,d),this._z=Math.atan2(-o,s)):(this._x=Math.atan2(f,l),this._z=0);break;case"YXZ":this._x=Math.asin(-Kt(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(a,d),this._z=Math.atan2(c,l)):(this._y=Math.atan2(-h,s),this._z=0);break;case"ZXY":this._x=Math.asin(Kt(f,-1,1)),Math.abs(f)<.9999999?(this._y=Math.atan2(-h,d),this._z=Math.atan2(-o,l)):(this._y=0,this._z=Math.atan2(c,s));break;case"ZYX":this._y=Math.asin(-Kt(h,-1,1)),Math.abs(h)<.9999999?(this._x=Math.atan2(f,d),this._z=Math.atan2(c,s)):(this._x=0,this._z=Math.atan2(-o,l));break;case"YZX":this._z=Math.asin(Kt(c,-1,1)),Math.abs(c)<.9999999?(this._x=Math.atan2(-u,l),this._y=Math.atan2(-h,s)):(this._x=0,this._y=Math.atan2(a,d));break;case"XZY":this._z=Math.asin(-Kt(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(f,l),this._y=Math.atan2(a,s)):(this._x=Math.atan2(-u,d),this._y=0);break;default:console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: "+n)}return this._order=n,i===!0&&this._onChangeCallback(),this}setFromQuaternion(t,n,i){return jp.makeRotationFromQuaternion(t),this.setFromRotationMatrix(jp,n,i)}setFromVector3(t,n=this._order){return this.set(t.x,t.y,t.z,n)}reorder(t){return qp.setFromEuler(this),this.setFromQuaternion(qp,t)}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._order===this._order}fromArray(t){return this._x=t[0],this._y=t[1],this._z=t[2],t[3]!==void 0&&(this._order=t[3]),this._onChangeCallback(),this}toArray(t=[],n=0){return t[n]=this._x,t[n+1]=this._y,t[n+2]=this._z,t[n+3]=this._order,t}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}};Ln.DEFAULT_ORDER="XYZ";var bs=class{constructor(){this.mask=1}set(t){this.mask=(1<<t|0)>>>0}enable(t){this.mask|=1<<t|0}enableAll(){this.mask=-1}toggle(t){this.mask^=1<<t|0}disable(t){this.mask&=~(1<<t|0)}disableAll(){this.mask=0}test(t){return(this.mask&t.mask)!==0}isEnabled(t){return(this.mask&(1<<t|0))!==0}},ub=0,Xp=new I,is=new Ne,Mi=new Vt,Ya=new I,uo=new I,fb=new I,db=new Ne,$p=new I(1,0,0),Yp=new I(0,1,0),Zp=new I(0,0,1),Kp={type:"added"},pb={type:"removed"},rs={type:"childadded",child:null},Iu={type:"childremoved",child:null},Be=class e extends si{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:ub++}),this.uuid=Ti(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=e.DEFAULT_UP.clone();let t=new I,n=new Ln,i=new Ne,r=new I(1,1,1);function s(){i.setFromEuler(n,!1)}function o(){n.setFromQuaternion(i,void 0,!1)}n._onChange(s),i._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:t},rotation:{configurable:!0,enumerable:!0,value:n},quaternion:{configurable:!0,enumerable:!0,value:i},scale:{configurable:!0,enumerable:!0,value:r},modelViewMatrix:{value:new Vt},normalMatrix:{value:new Xt}}),this.matrix=new Vt,this.matrixWorld=new Vt,this.matrixAutoUpdate=e.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=e.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new bs,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(t){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(t),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(t){return this.quaternion.premultiply(t),this}setRotationFromAxisAngle(t,n){this.quaternion.setFromAxisAngle(t,n)}setRotationFromEuler(t){this.quaternion.setFromEuler(t,!0)}setRotationFromMatrix(t){this.quaternion.setFromRotationMatrix(t)}setRotationFromQuaternion(t){this.quaternion.copy(t)}rotateOnAxis(t,n){return is.setFromAxisAngle(t,n),this.quaternion.multiply(is),this}rotateOnWorldAxis(t,n){return is.setFromAxisAngle(t,n),this.quaternion.premultiply(is),this}rotateX(t){return this.rotateOnAxis($p,t)}rotateY(t){return this.rotateOnAxis(Yp,t)}rotateZ(t){return this.rotateOnAxis(Zp,t)}translateOnAxis(t,n){return Xp.copy(t).applyQuaternion(this.quaternion),this.position.add(Xp.multiplyScalar(n)),this}translateX(t){return this.translateOnAxis($p,t)}translateY(t){return this.translateOnAxis(Yp,t)}translateZ(t){return this.translateOnAxis(Zp,t)}localToWorld(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(this.matrixWorld)}worldToLocal(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(Mi.copy(this.matrixWorld).invert())}lookAt(t,n,i){t.isVector3?Ya.copy(t):Ya.set(t,n,i);let r=this.parent;this.updateWorldMatrix(!0,!1),uo.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?Mi.lookAt(uo,Ya,this.up):Mi.lookAt(Ya,uo,this.up),this.quaternion.setFromRotationMatrix(Mi),r&&(Mi.extractRotation(r.matrixWorld),is.setFromRotationMatrix(Mi),this.quaternion.premultiply(is.invert()))}add(t){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.add(arguments[n]);return this}return t===this?(console.error("THREE.Object3D.add: object can't be added as a child of itself.",t),this):(t&&t.isObject3D?(t.removeFromParent(),t.parent=this,this.children.push(t),t.dispatchEvent(Kp),rs.child=t,this.dispatchEvent(rs),rs.child=null):console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",t),this)}remove(t){if(arguments.length>1){for(let i=0;i<arguments.length;i++)this.remove(arguments[i]);return this}let n=this.children.indexOf(t);return n!==-1&&(t.parent=null,this.children.splice(n,1),t.dispatchEvent(pb),Iu.child=t,this.dispatchEvent(Iu),Iu.child=null),this}removeFromParent(){let t=this.parent;return t!==null&&t.remove(this),this}clear(){return this.remove(...this.children)}attach(t){return this.updateWorldMatrix(!0,!1),Mi.copy(this.matrixWorld).invert(),t.parent!==null&&(t.parent.updateWorldMatrix(!0,!1),Mi.multiply(t.parent.matrixWorld)),t.applyMatrix4(Mi),t.removeFromParent(),t.parent=this,this.children.push(t),t.updateWorldMatrix(!1,!0),t.dispatchEvent(Kp),rs.child=t,this.dispatchEvent(rs),rs.child=null,this}getObjectById(t){return this.getObjectByProperty("id",t)}getObjectByName(t){return this.getObjectByProperty("name",t)}getObjectByProperty(t,n){if(this[t]===n)return this;for(let i=0,r=this.children.length;i<r;i++){let o=this.children[i].getObjectByProperty(t,n);if(o!==void 0)return o}}getObjectsByProperty(t,n,i=[]){this[t]===n&&i.push(this);let r=this.children;for(let s=0,o=r.length;s<o;s++)r[s].getObjectsByProperty(t,n,i);return i}getWorldPosition(t){return this.updateWorldMatrix(!0,!1),t.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(uo,t,fb),t}getWorldScale(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(uo,db,t),t}getWorldDirection(t){this.updateWorldMatrix(!0,!1);let n=this.matrixWorld.elements;return t.set(n[8],n[9],n[10]).normalize()}raycast(){}traverse(t){t(this);let n=this.children;for(let i=0,r=n.length;i<r;i++)n[i].traverse(t)}traverseVisible(t){if(this.visible===!1)return;t(this);let n=this.children;for(let i=0,r=n.length;i<r;i++)n[i].traverseVisible(t)}traverseAncestors(t){let n=this.parent;n!==null&&(t(n),n.traverseAncestors(t))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(t){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||t)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,t=!0);let n=this.children;for(let i=0,r=n.length;i<r;i++)n[i].updateMatrixWorld(t)}updateWorldMatrix(t,n){let i=this.parent;if(t===!0&&i!==null&&i.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),n===!0){let r=this.children;for(let s=0,o=r.length;s<o;s++)r[s].updateWorldMatrix(!1,!0)}}toJSON(t){let n=t===void 0||typeof t=="string",i={};n&&(t={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},i.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});let r={};r.uuid=this.uuid,r.type=this.type,this.name!==""&&(r.name=this.name),this.castShadow===!0&&(r.castShadow=!0),this.receiveShadow===!0&&(r.receiveShadow=!0),this.visible===!1&&(r.visible=!1),this.frustumCulled===!1&&(r.frustumCulled=!1),this.renderOrder!==0&&(r.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(r.userData=this.userData),r.layers=this.layers.mask,r.matrix=this.matrix.toArray(),r.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(r.matrixAutoUpdate=!1),this.isInstancedMesh&&(r.type="InstancedMesh",r.count=this.count,r.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(r.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(r.type="BatchedMesh",r.perObjectFrustumCulled=this.perObjectFrustumCulled,r.sortObjects=this.sortObjects,r.drawRanges=this._drawRanges,r.reservedRanges=this._reservedRanges,r.geometryInfo=this._geometryInfo.map(a=>({...a,boundingBox:a.boundingBox?a.boundingBox.toJSON():void 0,boundingSphere:a.boundingSphere?a.boundingSphere.toJSON():void 0})),r.instanceInfo=this._instanceInfo.map(a=>({...a})),r.availableInstanceIds=this._availableInstanceIds.slice(),r.availableGeometryIds=this._availableGeometryIds.slice(),r.nextIndexStart=this._nextIndexStart,r.nextVertexStart=this._nextVertexStart,r.geometryCount=this._geometryCount,r.maxInstanceCount=this._maxInstanceCount,r.maxVertexCount=this._maxVertexCount,r.maxIndexCount=this._maxIndexCount,r.geometryInitialized=this._geometryInitialized,r.matricesTexture=this._matricesTexture.toJSON(t),r.indirectTexture=this._indirectTexture.toJSON(t),this._colorsTexture!==null&&(r.colorsTexture=this._colorsTexture.toJSON(t)),this.boundingSphere!==null&&(r.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(r.boundingBox=this.boundingBox.toJSON()));function s(a,c){return a[c.uuid]===void 0&&(a[c.uuid]=c.toJSON(t)),c.uuid}if(this.isScene)this.background&&(this.background.isColor?r.background=this.background.toJSON():this.background.isTexture&&(r.background=this.background.toJSON(t).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(r.environment=this.environment.toJSON(t).uuid);else if(this.isMesh||this.isLine||this.isPoints){r.geometry=s(t.geometries,this.geometry);let a=this.geometry.parameters;if(a!==void 0&&a.shapes!==void 0){let c=a.shapes;if(Array.isArray(c))for(let l=0,u=c.length;l<u;l++){let h=c[l];s(t.shapes,h)}else s(t.shapes,c)}}if(this.isSkinnedMesh&&(r.bindMode=this.bindMode,r.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(s(t.skeletons,this.skeleton),r.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){let a=[];for(let c=0,l=this.material.length;c<l;c++)a.push(s(t.materials,this.material[c]));r.material=a}else r.material=s(t.materials,this.material);if(this.children.length>0){r.children=[];for(let a=0;a<this.children.length;a++)r.children.push(this.children[a].toJSON(t).object)}if(this.animations.length>0){r.animations=[];for(let a=0;a<this.animations.length;a++){let c=this.animations[a];r.animations.push(s(t.animations,c))}}if(n){let a=o(t.geometries),c=o(t.materials),l=o(t.textures),u=o(t.images),h=o(t.shapes),f=o(t.skeletons),d=o(t.animations),m=o(t.nodes);a.length>0&&(i.geometries=a),c.length>0&&(i.materials=c),l.length>0&&(i.textures=l),u.length>0&&(i.images=u),h.length>0&&(i.shapes=h),f.length>0&&(i.skeletons=f),d.length>0&&(i.animations=d),m.length>0&&(i.nodes=m)}return i.object=r,i;function o(a){let c=[];for(let l in a){let u=a[l];delete u.metadata,c.push(u)}return c}}clone(t){return new this.constructor().copy(this,t)}copy(t,n=!0){if(this.name=t.name,this.up.copy(t.up),this.position.copy(t.position),this.rotation.order=t.rotation.order,this.quaternion.copy(t.quaternion),this.scale.copy(t.scale),this.matrix.copy(t.matrix),this.matrixWorld.copy(t.matrixWorld),this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrixWorldAutoUpdate=t.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=t.matrixWorldNeedsUpdate,this.layers.mask=t.layers.mask,this.visible=t.visible,this.castShadow=t.castShadow,this.receiveShadow=t.receiveShadow,this.frustumCulled=t.frustumCulled,this.renderOrder=t.renderOrder,this.animations=t.animations.slice(),this.userData=JSON.parse(JSON.stringify(t.userData)),n===!0)for(let i=0;i<t.children.length;i++){let r=t.children[i];this.add(r.clone())}return this}};Be.DEFAULT_UP=new I(0,1,0);Be.DEFAULT_MATRIX_AUTO_UPDATE=!0;Be.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;var qn=new I,Si=new I,Du=new I,wi=new I,ss=new I,os=new I,Jp=new I,Lu=new I,Ou=new I,Nu=new I,Fu=new de,Uu=new de,zu=new de,Ei=class e{constructor(t=new I,n=new I,i=new I){this.a=t,this.b=n,this.c=i}static getNormal(t,n,i,r){r.subVectors(i,n),qn.subVectors(t,n),r.cross(qn);let s=r.lengthSq();return s>0?r.multiplyScalar(1/Math.sqrt(s)):r.set(0,0,0)}static getBarycoord(t,n,i,r,s){qn.subVectors(r,n),Si.subVectors(i,n),Du.subVectors(t,n);let o=qn.dot(qn),a=qn.dot(Si),c=qn.dot(Du),l=Si.dot(Si),u=Si.dot(Du),h=o*l-a*a;if(h===0)return s.set(0,0,0),null;let f=1/h,d=(l*c-a*u)*f,m=(o*u-a*c)*f;return s.set(1-d-m,m,d)}static containsPoint(t,n,i,r){return this.getBarycoord(t,n,i,r,wi)===null?!1:wi.x>=0&&wi.y>=0&&wi.x+wi.y<=1}static getInterpolation(t,n,i,r,s,o,a,c){return this.getBarycoord(t,n,i,r,wi)===null?(c.x=0,c.y=0,"z"in c&&(c.z=0),"w"in c&&(c.w=0),null):(c.setScalar(0),c.addScaledVector(s,wi.x),c.addScaledVector(o,wi.y),c.addScaledVector(a,wi.z),c)}static getInterpolatedAttribute(t,n,i,r,s,o){return Fu.setScalar(0),Uu.setScalar(0),zu.setScalar(0),Fu.fromBufferAttribute(t,n),Uu.fromBufferAttribute(t,i),zu.fromBufferAttribute(t,r),o.setScalar(0),o.addScaledVector(Fu,s.x),o.addScaledVector(Uu,s.y),o.addScaledVector(zu,s.z),o}static isFrontFacing(t,n,i,r){return qn.subVectors(i,n),Si.subVectors(t,n),qn.cross(Si).dot(r)<0}set(t,n,i){return this.a.copy(t),this.b.copy(n),this.c.copy(i),this}setFromPointsAndIndices(t,n,i,r){return this.a.copy(t[n]),this.b.copy(t[i]),this.c.copy(t[r]),this}setFromAttributeAndIndices(t,n,i,r){return this.a.fromBufferAttribute(t,n),this.b.fromBufferAttribute(t,i),this.c.fromBufferAttribute(t,r),this}clone(){return new this.constructor().copy(this)}copy(t){return this.a.copy(t.a),this.b.copy(t.b),this.c.copy(t.c),this}getArea(){return qn.subVectors(this.c,this.b),Si.subVectors(this.a,this.b),qn.cross(Si).length()*.5}getMidpoint(t){return t.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(t){return e.getNormal(this.a,this.b,this.c,t)}getPlane(t){return t.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(t,n){return e.getBarycoord(t,this.a,this.b,this.c,n)}getInterpolation(t,n,i,r,s){return e.getInterpolation(t,this.a,this.b,this.c,n,i,r,s)}containsPoint(t){return e.containsPoint(t,this.a,this.b,this.c)}isFrontFacing(t){return e.isFrontFacing(this.a,this.b,this.c,t)}intersectsBox(t){return t.intersectsTriangle(this)}closestPointToPoint(t,n){let i=this.a,r=this.b,s=this.c,o,a;ss.subVectors(r,i),os.subVectors(s,i),Lu.subVectors(t,i);let c=ss.dot(Lu),l=os.dot(Lu);if(c<=0&&l<=0)return n.copy(i);Ou.subVectors(t,r);let u=ss.dot(Ou),h=os.dot(Ou);if(u>=0&&h<=u)return n.copy(r);let f=c*h-u*l;if(f<=0&&c>=0&&u<=0)return o=c/(c-u),n.copy(i).addScaledVector(ss,o);Nu.subVectors(t,s);let d=ss.dot(Nu),m=os.dot(Nu);if(m>=0&&d<=m)return n.copy(s);let _=d*l-c*m;if(_<=0&&l>=0&&m<=0)return a=l/(l-m),n.copy(i).addScaledVector(os,a);let g=u*m-d*h;if(g<=0&&h-u>=0&&d-m>=0)return Jp.subVectors(s,r),a=(h-u)/(h-u+(d-m)),n.copy(r).addScaledVector(Jp,a);let p=1/(g+_+f);return o=_*p,a=f*p,n.copy(i).addScaledVector(ss,o).addScaledVector(os,a)}equals(t){return t.a.equals(this.a)&&t.b.equals(this.b)&&t.c.equals(this.c)}},tg={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},Wi={h:0,s:0,l:0},Za={h:0,s:0,l:0};function ku(e,t,n){return n<0&&(n+=1),n>1&&(n-=1),n<1/6?e+(t-e)*6*n:n<1/2?t:n<2/3?e+(t-e)*6*(2/3-n):e}var Ot=class{constructor(t,n,i){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(t,n,i)}set(t,n,i){if(n===void 0&&i===void 0){let r=t;r&&r.isColor?this.copy(r):typeof r=="number"?this.setHex(r):typeof r=="string"&&this.setStyle(r)}else this.setRGB(t,n,i);return this}setScalar(t){return this.r=t,this.g=t,this.b=t,this}setHex(t,n=He){return t=Math.floor(t),this.r=(t>>16&255)/255,this.g=(t>>8&255)/255,this.b=(t&255)/255,ee.colorSpaceToWorking(this,n),this}setRGB(t,n,i,r=ee.workingColorSpace){return this.r=t,this.g=n,this.b=i,ee.colorSpaceToWorking(this,r),this}setHSL(t,n,i,r=ee.workingColorSpace){if(t=bf(t,1),n=Kt(n,0,1),i=Kt(i,0,1),n===0)this.r=this.g=this.b=i;else{let s=i<=.5?i*(1+n):i+n-i*n,o=2*i-s;this.r=ku(o,s,t+1/3),this.g=ku(o,s,t),this.b=ku(o,s,t-1/3)}return ee.colorSpaceToWorking(this,r),this}setStyle(t,n=He){function i(s){s!==void 0&&parseFloat(s)<1&&console.warn("THREE.Color: Alpha component of "+t+" will be ignored.")}let r;if(r=/^(\w+)\(([^\)]*)\)/.exec(t)){let s,o=r[1],a=r[2];switch(o){case"rgb":case"rgba":if(s=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return i(s[4]),this.setRGB(Math.min(255,parseInt(s[1],10))/255,Math.min(255,parseInt(s[2],10))/255,Math.min(255,parseInt(s[3],10))/255,n);if(s=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return i(s[4]),this.setRGB(Math.min(100,parseInt(s[1],10))/100,Math.min(100,parseInt(s[2],10))/100,Math.min(100,parseInt(s[3],10))/100,n);break;case"hsl":case"hsla":if(s=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return i(s[4]),this.setHSL(parseFloat(s[1])/360,parseFloat(s[2])/100,parseFloat(s[3])/100,n);break;default:console.warn("THREE.Color: Unknown color model "+t)}}else if(r=/^\#([A-Fa-f\d]+)$/.exec(t)){let s=r[1],o=s.length;if(o===3)return this.setRGB(parseInt(s.charAt(0),16)/15,parseInt(s.charAt(1),16)/15,parseInt(s.charAt(2),16)/15,n);if(o===6)return this.setHex(parseInt(s,16),n);console.warn("THREE.Color: Invalid hex color "+t)}else if(t&&t.length>0)return this.setColorName(t,n);return this}setColorName(t,n=He){let i=tg[t.toLowerCase()];return i!==void 0?this.setHex(i,n):console.warn("THREE.Color: Unknown color "+t),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(t){return this.r=t.r,this.g=t.g,this.b=t.b,this}copySRGBToLinear(t){return this.r=Ai(t.r),this.g=Ai(t.g),this.b=Ai(t.b),this}copyLinearToSRGB(t){return this.r=ms(t.r),this.g=ms(t.g),this.b=ms(t.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(t=He){return ee.workingToColorSpace(Xe.copy(this),t),Math.round(Kt(Xe.r*255,0,255))*65536+Math.round(Kt(Xe.g*255,0,255))*256+Math.round(Kt(Xe.b*255,0,255))}getHexString(t=He){return("000000"+this.getHex(t).toString(16)).slice(-6)}getHSL(t,n=ee.workingColorSpace){ee.workingToColorSpace(Xe.copy(this),n);let i=Xe.r,r=Xe.g,s=Xe.b,o=Math.max(i,r,s),a=Math.min(i,r,s),c,l,u=(a+o)/2;if(a===o)c=0,l=0;else{let h=o-a;switch(l=u<=.5?h/(o+a):h/(2-o-a),o){case i:c=(r-s)/h+(r<s?6:0);break;case r:c=(s-i)/h+2;break;case s:c=(i-r)/h+4;break}c/=6}return t.h=c,t.s=l,t.l=u,t}getRGB(t,n=ee.workingColorSpace){return ee.workingToColorSpace(Xe.copy(this),n),t.r=Xe.r,t.g=Xe.g,t.b=Xe.b,t}getStyle(t=He){ee.workingToColorSpace(Xe.copy(this),t);let n=Xe.r,i=Xe.g,r=Xe.b;return t!==He?`color(${t} ${n.toFixed(3)} ${i.toFixed(3)} ${r.toFixed(3)})`:`rgb(${Math.round(n*255)},${Math.round(i*255)},${Math.round(r*255)})`}offsetHSL(t,n,i){return this.getHSL(Wi),this.setHSL(Wi.h+t,Wi.s+n,Wi.l+i)}add(t){return this.r+=t.r,this.g+=t.g,this.b+=t.b,this}addColors(t,n){return this.r=t.r+n.r,this.g=t.g+n.g,this.b=t.b+n.b,this}addScalar(t){return this.r+=t,this.g+=t,this.b+=t,this}sub(t){return this.r=Math.max(0,this.r-t.r),this.g=Math.max(0,this.g-t.g),this.b=Math.max(0,this.b-t.b),this}multiply(t){return this.r*=t.r,this.g*=t.g,this.b*=t.b,this}multiplyScalar(t){return this.r*=t,this.g*=t,this.b*=t,this}lerp(t,n){return this.r+=(t.r-this.r)*n,this.g+=(t.g-this.g)*n,this.b+=(t.b-this.b)*n,this}lerpColors(t,n,i){return this.r=t.r+(n.r-t.r)*i,this.g=t.g+(n.g-t.g)*i,this.b=t.b+(n.b-t.b)*i,this}lerpHSL(t,n){this.getHSL(Wi),t.getHSL(Za);let i=xo(Wi.h,Za.h,n),r=xo(Wi.s,Za.s,n),s=xo(Wi.l,Za.l,n);return this.setHSL(i,r,s),this}setFromVector3(t){return this.r=t.x,this.g=t.y,this.b=t.z,this}applyMatrix3(t){let n=this.r,i=this.g,r=this.b,s=t.elements;return this.r=s[0]*n+s[3]*i+s[6]*r,this.g=s[1]*n+s[4]*i+s[7]*r,this.b=s[2]*n+s[5]*i+s[8]*r,this}equals(t){return t.r===this.r&&t.g===this.g&&t.b===this.b}fromArray(t,n=0){return this.r=t[n],this.g=t[n+1],this.b=t[n+2],this}toArray(t=[],n=0){return t[n]=this.r,t[n+1]=this.g,t[n+2]=this.b,t}fromBufferAttribute(t,n){return this.r=t.getX(n),this.g=t.getY(n),this.b=t.getZ(n),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}},Xe=new Ot;Ot.NAMES=tg;var mb=0,On=class extends si{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:mb++}),this.uuid=Ti(),this.name="",this.type="Material",this.blending=Sr,this.side=Ci,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=_c,this.blendDst=vc,this.blendEquation=Xi,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Ot(0,0,0),this.blendAlpha=0,this.depthFunc=wr,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=Qu,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Mr,this.stencilZFail=Mr,this.stencilZPass=Mr,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(t){this._alphaTest>0!=t>0&&this.version++,this._alphaTest=t}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(t){if(t!==void 0)for(let n in t){let i=t[n];if(i===void 0){console.warn(`THREE.Material: parameter '${n}' has value of undefined.`);continue}let r=this[n];if(r===void 0){console.warn(`THREE.Material: '${n}' is not a property of THREE.${this.type}.`);continue}r&&r.isColor?r.set(i):r&&r.isVector3&&i&&i.isVector3?r.copy(i):this[n]=i}}toJSON(t){let n=t===void 0||typeof t=="string";n&&(t={textures:{},images:{}});let i={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};i.uuid=this.uuid,i.type=this.type,this.name!==""&&(i.name=this.name),this.color&&this.color.isColor&&(i.color=this.color.getHex()),this.roughness!==void 0&&(i.roughness=this.roughness),this.metalness!==void 0&&(i.metalness=this.metalness),this.sheen!==void 0&&(i.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(i.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(i.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(i.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(i.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(i.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(i.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(i.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(i.shininess=this.shininess),this.clearcoat!==void 0&&(i.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(i.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(i.clearcoatMap=this.clearcoatMap.toJSON(t).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(i.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(t).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(i.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(t).uuid,i.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(i.sheenColorMap=this.sheenColorMap.toJSON(t).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(i.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(t).uuid),this.dispersion!==void 0&&(i.dispersion=this.dispersion),this.iridescence!==void 0&&(i.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(i.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(i.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(i.iridescenceMap=this.iridescenceMap.toJSON(t).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(i.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(t).uuid),this.anisotropy!==void 0&&(i.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(i.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(i.anisotropyMap=this.anisotropyMap.toJSON(t).uuid),this.map&&this.map.isTexture&&(i.map=this.map.toJSON(t).uuid),this.matcap&&this.matcap.isTexture&&(i.matcap=this.matcap.toJSON(t).uuid),this.alphaMap&&this.alphaMap.isTexture&&(i.alphaMap=this.alphaMap.toJSON(t).uuid),this.lightMap&&this.lightMap.isTexture&&(i.lightMap=this.lightMap.toJSON(t).uuid,i.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(i.aoMap=this.aoMap.toJSON(t).uuid,i.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(i.bumpMap=this.bumpMap.toJSON(t).uuid,i.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(i.normalMap=this.normalMap.toJSON(t).uuid,i.normalMapType=this.normalMapType,i.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(i.displacementMap=this.displacementMap.toJSON(t).uuid,i.displacementScale=this.displacementScale,i.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(i.roughnessMap=this.roughnessMap.toJSON(t).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(i.metalnessMap=this.metalnessMap.toJSON(t).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(i.emissiveMap=this.emissiveMap.toJSON(t).uuid),this.specularMap&&this.specularMap.isTexture&&(i.specularMap=this.specularMap.toJSON(t).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(i.specularIntensityMap=this.specularIntensityMap.toJSON(t).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(i.specularColorMap=this.specularColorMap.toJSON(t).uuid),this.envMap&&this.envMap.isTexture&&(i.envMap=this.envMap.toJSON(t).uuid,this.combine!==void 0&&(i.combine=this.combine)),this.envMapRotation!==void 0&&(i.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(i.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(i.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(i.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(i.gradientMap=this.gradientMap.toJSON(t).uuid),this.transmission!==void 0&&(i.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(i.transmissionMap=this.transmissionMap.toJSON(t).uuid),this.thickness!==void 0&&(i.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(i.thicknessMap=this.thicknessMap.toJSON(t).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(i.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(i.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(i.size=this.size),this.shadowSide!==null&&(i.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(i.sizeAttenuation=this.sizeAttenuation),this.blending!==Sr&&(i.blending=this.blending),this.side!==Ci&&(i.side=this.side),this.vertexColors===!0&&(i.vertexColors=!0),this.opacity<1&&(i.opacity=this.opacity),this.transparent===!0&&(i.transparent=!0),this.blendSrc!==_c&&(i.blendSrc=this.blendSrc),this.blendDst!==vc&&(i.blendDst=this.blendDst),this.blendEquation!==Xi&&(i.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(i.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(i.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(i.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(i.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(i.blendAlpha=this.blendAlpha),this.depthFunc!==wr&&(i.depthFunc=this.depthFunc),this.depthTest===!1&&(i.depthTest=this.depthTest),this.depthWrite===!1&&(i.depthWrite=this.depthWrite),this.colorWrite===!1&&(i.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(i.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==Qu&&(i.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(i.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(i.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==Mr&&(i.stencilFail=this.stencilFail),this.stencilZFail!==Mr&&(i.stencilZFail=this.stencilZFail),this.stencilZPass!==Mr&&(i.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(i.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(i.rotation=this.rotation),this.polygonOffset===!0&&(i.polygonOffset=!0),this.polygonOffsetFactor!==0&&(i.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(i.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(i.linewidth=this.linewidth),this.dashSize!==void 0&&(i.dashSize=this.dashSize),this.gapSize!==void 0&&(i.gapSize=this.gapSize),this.scale!==void 0&&(i.scale=this.scale),this.dithering===!0&&(i.dithering=!0),this.alphaTest>0&&(i.alphaTest=this.alphaTest),this.alphaHash===!0&&(i.alphaHash=!0),this.alphaToCoverage===!0&&(i.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(i.premultipliedAlpha=!0),this.forceSinglePass===!0&&(i.forceSinglePass=!0),this.wireframe===!0&&(i.wireframe=!0),this.wireframeLinewidth>1&&(i.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(i.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(i.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(i.flatShading=!0),this.visible===!1&&(i.visible=!1),this.toneMapped===!1&&(i.toneMapped=!1),this.fog===!1&&(i.fog=!1),Object.keys(this.userData).length>0&&(i.userData=this.userData);function r(s){let o=[];for(let a in s){let c=s[a];delete c.metadata,o.push(c)}return o}if(n){let s=r(t.textures),o=r(t.images);s.length>0&&(i.textures=s),o.length>0&&(i.images=o)}return i}clone(){return new this.constructor().copy(this)}copy(t){this.name=t.name,this.blending=t.blending,this.side=t.side,this.vertexColors=t.vertexColors,this.opacity=t.opacity,this.transparent=t.transparent,this.blendSrc=t.blendSrc,this.blendDst=t.blendDst,this.blendEquation=t.blendEquation,this.blendSrcAlpha=t.blendSrcAlpha,this.blendDstAlpha=t.blendDstAlpha,this.blendEquationAlpha=t.blendEquationAlpha,this.blendColor.copy(t.blendColor),this.blendAlpha=t.blendAlpha,this.depthFunc=t.depthFunc,this.depthTest=t.depthTest,this.depthWrite=t.depthWrite,this.stencilWriteMask=t.stencilWriteMask,this.stencilFunc=t.stencilFunc,this.stencilRef=t.stencilRef,this.stencilFuncMask=t.stencilFuncMask,this.stencilFail=t.stencilFail,this.stencilZFail=t.stencilZFail,this.stencilZPass=t.stencilZPass,this.stencilWrite=t.stencilWrite;let n=t.clippingPlanes,i=null;if(n!==null){let r=n.length;i=new Array(r);for(let s=0;s!==r;++s)i[s]=n[s].clone()}return this.clippingPlanes=i,this.clipIntersection=t.clipIntersection,this.clipShadows=t.clipShadows,this.shadowSide=t.shadowSide,this.colorWrite=t.colorWrite,this.precision=t.precision,this.polygonOffset=t.polygonOffset,this.polygonOffsetFactor=t.polygonOffsetFactor,this.polygonOffsetUnits=t.polygonOffsetUnits,this.dithering=t.dithering,this.alphaTest=t.alphaTest,this.alphaHash=t.alphaHash,this.alphaToCoverage=t.alphaToCoverage,this.premultipliedAlpha=t.premultipliedAlpha,this.forceSinglePass=t.forceSinglePass,this.visible=t.visible,this.toneMapped=t.toneMapped,this.userData=JSON.parse(JSON.stringify(t.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(t){t===!0&&this.version++}},bn=class extends On{constructor(t){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new Ot(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Ln,this.combine=sl,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.combine=t.combine,this.reflectivity=t.reflectivity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.fog=t.fog,this}};var De=new I,Ka=new et,gb=0,Ye=class{constructor(t,n,i=!1){if(Array.isArray(t))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:gb++}),this.name="",this.array=t,this.itemSize=n,this.count=t!==void 0?t.length/n:0,this.normalized=i,this.usage=Mc,this.updateRanges=[],this.gpuType=di,this.version=0}onUploadCallback(){}set needsUpdate(t){t===!0&&this.version++}setUsage(t){return this.usage=t,this}addUpdateRange(t,n){this.updateRanges.push({start:t,count:n})}clearUpdateRanges(){this.updateRanges.length=0}copy(t){return this.name=t.name,this.array=new t.array.constructor(t.array),this.itemSize=t.itemSize,this.count=t.count,this.normalized=t.normalized,this.usage=t.usage,this.gpuType=t.gpuType,this}copyAt(t,n,i){t*=this.itemSize,i*=n.itemSize;for(let r=0,s=this.itemSize;r<s;r++)this.array[t+r]=n.array[i+r];return this}copyArray(t){return this.array.set(t),this}applyMatrix3(t){if(this.itemSize===2)for(let n=0,i=this.count;n<i;n++)Ka.fromBufferAttribute(this,n),Ka.applyMatrix3(t),this.setXY(n,Ka.x,Ka.y);else if(this.itemSize===3)for(let n=0,i=this.count;n<i;n++)De.fromBufferAttribute(this,n),De.applyMatrix3(t),this.setXYZ(n,De.x,De.y,De.z);return this}applyMatrix4(t){for(let n=0,i=this.count;n<i;n++)De.fromBufferAttribute(this,n),De.applyMatrix4(t),this.setXYZ(n,De.x,De.y,De.z);return this}applyNormalMatrix(t){for(let n=0,i=this.count;n<i;n++)De.fromBufferAttribute(this,n),De.applyNormalMatrix(t),this.setXYZ(n,De.x,De.y,De.z);return this}transformDirection(t){for(let n=0,i=this.count;n<i;n++)De.fromBufferAttribute(this,n),De.transformDirection(t),this.setXYZ(n,De.x,De.y,De.z);return this}set(t,n=0){return this.array.set(t,n),this}getComponent(t,n){let i=this.array[t*this.itemSize+n];return this.normalized&&(i=Xn(i,this.array)),i}setComponent(t,n,i){return this.normalized&&(i=fe(i,this.array)),this.array[t*this.itemSize+n]=i,this}getX(t){let n=this.array[t*this.itemSize];return this.normalized&&(n=Xn(n,this.array)),n}setX(t,n){return this.normalized&&(n=fe(n,this.array)),this.array[t*this.itemSize]=n,this}getY(t){let n=this.array[t*this.itemSize+1];return this.normalized&&(n=Xn(n,this.array)),n}setY(t,n){return this.normalized&&(n=fe(n,this.array)),this.array[t*this.itemSize+1]=n,this}getZ(t){let n=this.array[t*this.itemSize+2];return this.normalized&&(n=Xn(n,this.array)),n}setZ(t,n){return this.normalized&&(n=fe(n,this.array)),this.array[t*this.itemSize+2]=n,this}getW(t){let n=this.array[t*this.itemSize+3];return this.normalized&&(n=Xn(n,this.array)),n}setW(t,n){return this.normalized&&(n=fe(n,this.array)),this.array[t*this.itemSize+3]=n,this}setXY(t,n,i){return t*=this.itemSize,this.normalized&&(n=fe(n,this.array),i=fe(i,this.array)),this.array[t+0]=n,this.array[t+1]=i,this}setXYZ(t,n,i,r){return t*=this.itemSize,this.normalized&&(n=fe(n,this.array),i=fe(i,this.array),r=fe(r,this.array)),this.array[t+0]=n,this.array[t+1]=i,this.array[t+2]=r,this}setXYZW(t,n,i,r,s){return t*=this.itemSize,this.normalized&&(n=fe(n,this.array),i=fe(i,this.array),r=fe(r,this.array),s=fe(s,this.array)),this.array[t+0]=n,this.array[t+1]=i,this.array[t+2]=r,this.array[t+3]=s,this}onUpload(t){return this.onUploadCallback=t,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let t={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(t.name=this.name),this.usage!==Mc&&(t.usage=this.usage),t}};var Ao=class extends Ye{constructor(t,n,i){super(new Uint16Array(t),n,i)}};var Co=class extends Ye{constructor(t,n,i){super(new Uint32Array(t),n,i)}};var ce=class extends Ye{constructor(t,n,i){super(new Float32Array(t),n,i)}},_b=0,In=new Vt,Bu=new Be,as=new I,xn=new fn,fo=new fn,ke=new I,ve=class e extends si{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:_b++}),this.uuid=Ti(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(t){return Array.isArray(t)?this.index=new(Mf(t)?Co:Ao)(t,1):this.index=t,this}setIndirect(t){return this.indirect=t,this}getIndirect(){return this.indirect}getAttribute(t){return this.attributes[t]}setAttribute(t,n){return this.attributes[t]=n,this}deleteAttribute(t){return delete this.attributes[t],this}hasAttribute(t){return this.attributes[t]!==void 0}addGroup(t,n,i=0){this.groups.push({start:t,count:n,materialIndex:i})}clearGroups(){this.groups=[]}setDrawRange(t,n){this.drawRange.start=t,this.drawRange.count=n}applyMatrix4(t){let n=this.attributes.position;n!==void 0&&(n.applyMatrix4(t),n.needsUpdate=!0);let i=this.attributes.normal;if(i!==void 0){let s=new Xt().getNormalMatrix(t);i.applyNormalMatrix(s),i.needsUpdate=!0}let r=this.attributes.tangent;return r!==void 0&&(r.transformDirection(t),r.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(t){return In.makeRotationFromQuaternion(t),this.applyMatrix4(In),this}rotateX(t){return In.makeRotationX(t),this.applyMatrix4(In),this}rotateY(t){return In.makeRotationY(t),this.applyMatrix4(In),this}rotateZ(t){return In.makeRotationZ(t),this.applyMatrix4(In),this}translate(t,n,i){return In.makeTranslation(t,n,i),this.applyMatrix4(In),this}scale(t,n,i){return In.makeScale(t,n,i),this.applyMatrix4(In),this}lookAt(t){return Bu.lookAt(t),Bu.updateMatrix(),this.applyMatrix4(Bu.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(as).negate(),this.translate(as.x,as.y,as.z),this}setFromPoints(t){let n=this.getAttribute("position");if(n===void 0){let i=[];for(let r=0,s=t.length;r<s;r++){let o=t[r];i.push(o.x,o.y,o.z||0)}this.setAttribute("position",new ce(i,3))}else{let i=Math.min(t.length,n.count);for(let r=0;r<i;r++){let s=t[r];n.setXYZ(r,s.x,s.y,s.z||0)}t.length>n.count&&console.warn("THREE.BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),n.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new fn);let t=this.attributes.position,n=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new I(-1/0,-1/0,-1/0),new I(1/0,1/0,1/0));return}if(t!==void 0){if(this.boundingBox.setFromBufferAttribute(t),n)for(let i=0,r=n.length;i<r;i++){let s=n[i];xn.setFromBufferAttribute(s),this.morphTargetsRelative?(ke.addVectors(this.boundingBox.min,xn.min),this.boundingBox.expandByPoint(ke),ke.addVectors(this.boundingBox.max,xn.max),this.boundingBox.expandByPoint(ke)):(this.boundingBox.expandByPoint(xn.min),this.boundingBox.expandByPoint(xn.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new oi);let t=this.attributes.position,n=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new I,1/0);return}if(t){let i=this.boundingSphere.center;if(xn.setFromBufferAttribute(t),n)for(let s=0,o=n.length;s<o;s++){let a=n[s];fo.setFromBufferAttribute(a),this.morphTargetsRelative?(ke.addVectors(xn.min,fo.min),xn.expandByPoint(ke),ke.addVectors(xn.max,fo.max),xn.expandByPoint(ke)):(xn.expandByPoint(fo.min),xn.expandByPoint(fo.max))}xn.getCenter(i);let r=0;for(let s=0,o=t.count;s<o;s++)ke.fromBufferAttribute(t,s),r=Math.max(r,i.distanceToSquared(ke));if(n)for(let s=0,o=n.length;s<o;s++){let a=n[s],c=this.morphTargetsRelative;for(let l=0,u=a.count;l<u;l++)ke.fromBufferAttribute(a,l),c&&(as.fromBufferAttribute(t,l),ke.add(as)),r=Math.max(r,i.distanceToSquared(ke))}this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){let t=this.index,n=this.attributes;if(t===null||n.position===void 0||n.normal===void 0||n.uv===void 0){console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}let i=n.position,r=n.normal,s=n.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new Ye(new Float32Array(4*i.count),4));let o=this.getAttribute("tangent"),a=[],c=[];for(let P=0;P<i.count;P++)a[P]=new I,c[P]=new I;let l=new I,u=new I,h=new I,f=new et,d=new et,m=new et,_=new I,g=new I;function p(P,T,w){l.fromBufferAttribute(i,P),u.fromBufferAttribute(i,T),h.fromBufferAttribute(i,w),f.fromBufferAttribute(s,P),d.fromBufferAttribute(s,T),m.fromBufferAttribute(s,w),u.sub(l),h.sub(l),d.sub(f),m.sub(f);let R=1/(d.x*m.y-m.x*d.y);isFinite(R)&&(_.copy(u).multiplyScalar(m.y).addScaledVector(h,-d.y).multiplyScalar(R),g.copy(h).multiplyScalar(d.x).addScaledVector(u,-m.x).multiplyScalar(R),a[P].add(_),a[T].add(_),a[w].add(_),c[P].add(g),c[T].add(g),c[w].add(g))}let b=this.groups;b.length===0&&(b=[{start:0,count:t.count}]);for(let P=0,T=b.length;P<T;++P){let w=b[P],R=w.start,V=w.count;for(let N=R,z=R+V;N<z;N+=3)p(t.getX(N+0),t.getX(N+1),t.getX(N+2))}let x=new I,v=new I,M=new I,S=new I;function C(P){M.fromBufferAttribute(r,P),S.copy(M);let T=a[P];x.copy(T),x.sub(M.multiplyScalar(M.dot(T))).normalize(),v.crossVectors(S,T);let R=v.dot(c[P])<0?-1:1;o.setXYZW(P,x.x,x.y,x.z,R)}for(let P=0,T=b.length;P<T;++P){let w=b[P],R=w.start,V=w.count;for(let N=R,z=R+V;N<z;N+=3)C(t.getX(N+0)),C(t.getX(N+1)),C(t.getX(N+2))}}computeVertexNormals(){let t=this.index,n=this.getAttribute("position");if(n!==void 0){let i=this.getAttribute("normal");if(i===void 0)i=new Ye(new Float32Array(n.count*3),3),this.setAttribute("normal",i);else for(let f=0,d=i.count;f<d;f++)i.setXYZ(f,0,0,0);let r=new I,s=new I,o=new I,a=new I,c=new I,l=new I,u=new I,h=new I;if(t)for(let f=0,d=t.count;f<d;f+=3){let m=t.getX(f+0),_=t.getX(f+1),g=t.getX(f+2);r.fromBufferAttribute(n,m),s.fromBufferAttribute(n,_),o.fromBufferAttribute(n,g),u.subVectors(o,s),h.subVectors(r,s),u.cross(h),a.fromBufferAttribute(i,m),c.fromBufferAttribute(i,_),l.fromBufferAttribute(i,g),a.add(u),c.add(u),l.add(u),i.setXYZ(m,a.x,a.y,a.z),i.setXYZ(_,c.x,c.y,c.z),i.setXYZ(g,l.x,l.y,l.z)}else for(let f=0,d=n.count;f<d;f+=3)r.fromBufferAttribute(n,f+0),s.fromBufferAttribute(n,f+1),o.fromBufferAttribute(n,f+2),u.subVectors(o,s),h.subVectors(r,s),u.cross(h),i.setXYZ(f+0,u.x,u.y,u.z),i.setXYZ(f+1,u.x,u.y,u.z),i.setXYZ(f+2,u.x,u.y,u.z);this.normalizeNormals(),i.needsUpdate=!0}}normalizeNormals(){let t=this.attributes.normal;for(let n=0,i=t.count;n<i;n++)ke.fromBufferAttribute(t,n),ke.normalize(),t.setXYZ(n,ke.x,ke.y,ke.z)}toNonIndexed(){function t(a,c){let l=a.array,u=a.itemSize,h=a.normalized,f=new l.constructor(c.length*u),d=0,m=0;for(let _=0,g=c.length;_<g;_++){a.isInterleavedBufferAttribute?d=c[_]*a.data.stride+a.offset:d=c[_]*u;for(let p=0;p<u;p++)f[m++]=l[d++]}return new Ye(f,u,h)}if(this.index===null)return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;let n=new e,i=this.index.array,r=this.attributes;for(let a in r){let c=r[a],l=t(c,i);n.setAttribute(a,l)}let s=this.morphAttributes;for(let a in s){let c=[],l=s[a];for(let u=0,h=l.length;u<h;u++){let f=l[u],d=t(f,i);c.push(d)}n.morphAttributes[a]=c}n.morphTargetsRelative=this.morphTargetsRelative;let o=this.groups;for(let a=0,c=o.length;a<c;a++){let l=o[a];n.addGroup(l.start,l.count,l.materialIndex)}return n}toJSON(){let t={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(t.uuid=this.uuid,t.type=this.type,this.name!==""&&(t.name=this.name),Object.keys(this.userData).length>0&&(t.userData=this.userData),this.parameters!==void 0){let c=this.parameters;for(let l in c)c[l]!==void 0&&(t[l]=c[l]);return t}t.data={attributes:{}};let n=this.index;n!==null&&(t.data.index={type:n.array.constructor.name,array:Array.prototype.slice.call(n.array)});let i=this.attributes;for(let c in i){let l=i[c];t.data.attributes[c]=l.toJSON(t.data)}let r={},s=!1;for(let c in this.morphAttributes){let l=this.morphAttributes[c],u=[];for(let h=0,f=l.length;h<f;h++){let d=l[h];u.push(d.toJSON(t.data))}u.length>0&&(r[c]=u,s=!0)}s&&(t.data.morphAttributes=r,t.data.morphTargetsRelative=this.morphTargetsRelative);let o=this.groups;o.length>0&&(t.data.groups=JSON.parse(JSON.stringify(o)));let a=this.boundingSphere;return a!==null&&(t.data.boundingSphere=a.toJSON()),t}clone(){return new this.constructor().copy(this)}copy(t){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let n={};this.name=t.name;let i=t.index;i!==null&&this.setIndex(i.clone());let r=t.attributes;for(let l in r){let u=r[l];this.setAttribute(l,u.clone(n))}let s=t.morphAttributes;for(let l in s){let u=[],h=s[l];for(let f=0,d=h.length;f<d;f++)u.push(h[f].clone(n));this.morphAttributes[l]=u}this.morphTargetsRelative=t.morphTargetsRelative;let o=t.groups;for(let l=0,u=o.length;l<u;l++){let h=o[l];this.addGroup(h.start,h.count,h.materialIndex)}let a=t.boundingBox;a!==null&&(this.boundingBox=a.clone());let c=t.boundingSphere;return c!==null&&(this.boundingSphere=c.clone()),this.drawRange.start=t.drawRange.start,this.drawRange.count=t.drawRange.count,this.userData=t.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}},Qp=new Vt,xr=new Ri,Ja=new oi,tm=new I,Qa=new I,tc=new I,ec=new I,Vu=new I,nc=new I,em=new I,ic=new I,we=class extends Be{constructor(t=new ve,n=new bn){super(),this.isMesh=!0,this.type="Mesh",this.geometry=t,this.material=n,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(t,n){return super.copy(t,n),t.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=t.morphTargetInfluences.slice()),t.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},t.morphTargetDictionary)),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}updateMorphTargets(){let n=this.geometry.morphAttributes,i=Object.keys(n);if(i.length>0){let r=n[i[0]];if(r!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,o=r.length;s<o;s++){let a=r[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=s}}}}getVertexPosition(t,n){let i=this.geometry,r=i.attributes.position,s=i.morphAttributes.position,o=i.morphTargetsRelative;n.fromBufferAttribute(r,t);let a=this.morphTargetInfluences;if(s&&a){nc.set(0,0,0);for(let c=0,l=s.length;c<l;c++){let u=a[c],h=s[c];u!==0&&(Vu.fromBufferAttribute(h,t),o?nc.addScaledVector(Vu,u):nc.addScaledVector(Vu.sub(n),u))}n.add(nc)}return n}raycast(t,n){let i=this.geometry,r=this.material,s=this.matrixWorld;r!==void 0&&(i.boundingSphere===null&&i.computeBoundingSphere(),Ja.copy(i.boundingSphere),Ja.applyMatrix4(s),xr.copy(t.ray).recast(t.near),!(Ja.containsPoint(xr.origin)===!1&&(xr.intersectSphere(Ja,tm)===null||xr.origin.distanceToSquared(tm)>(t.far-t.near)**2))&&(Qp.copy(s).invert(),xr.copy(t.ray).applyMatrix4(Qp),!(i.boundingBox!==null&&xr.intersectsBox(i.boundingBox)===!1)&&this._computeIntersections(t,n,xr)))}_computeIntersections(t,n,i){let r,s=this.geometry,o=this.material,a=s.index,c=s.attributes.position,l=s.attributes.uv,u=s.attributes.uv1,h=s.attributes.normal,f=s.groups,d=s.drawRange;if(a!==null)if(Array.isArray(o))for(let m=0,_=f.length;m<_;m++){let g=f[m],p=o[g.materialIndex],b=Math.max(g.start,d.start),x=Math.min(a.count,Math.min(g.start+g.count,d.start+d.count));for(let v=b,M=x;v<M;v+=3){let S=a.getX(v),C=a.getX(v+1),P=a.getX(v+2);r=rc(this,p,t,i,l,u,h,S,C,P),r&&(r.faceIndex=Math.floor(v/3),r.face.materialIndex=g.materialIndex,n.push(r))}}else{let m=Math.max(0,d.start),_=Math.min(a.count,d.start+d.count);for(let g=m,p=_;g<p;g+=3){let b=a.getX(g),x=a.getX(g+1),v=a.getX(g+2);r=rc(this,o,t,i,l,u,h,b,x,v),r&&(r.faceIndex=Math.floor(g/3),n.push(r))}}else if(c!==void 0)if(Array.isArray(o))for(let m=0,_=f.length;m<_;m++){let g=f[m],p=o[g.materialIndex],b=Math.max(g.start,d.start),x=Math.min(c.count,Math.min(g.start+g.count,d.start+d.count));for(let v=b,M=x;v<M;v+=3){let S=v,C=v+1,P=v+2;r=rc(this,p,t,i,l,u,h,S,C,P),r&&(r.faceIndex=Math.floor(v/3),r.face.materialIndex=g.materialIndex,n.push(r))}}else{let m=Math.max(0,d.start),_=Math.min(c.count,d.start+d.count);for(let g=m,p=_;g<p;g+=3){let b=g,x=g+1,v=g+2;r=rc(this,o,t,i,l,u,h,b,x,v),r&&(r.faceIndex=Math.floor(g/3),n.push(r))}}}};function vb(e,t,n,i,r,s,o,a){let c;if(t.side===We?c=i.intersectTriangle(o,s,r,!0,a):c=i.intersectTriangle(r,s,o,t.side===Ci,a),c===null)return null;ic.copy(a),ic.applyMatrix4(e.matrixWorld);let l=n.ray.origin.distanceTo(ic);return l<n.near||l>n.far?null:{distance:l,point:ic.clone(),object:e}}function rc(e,t,n,i,r,s,o,a,c,l){e.getVertexPosition(a,Qa),e.getVertexPosition(c,tc),e.getVertexPosition(l,ec);let u=vb(e,t,n,i,Qa,tc,ec,em);if(u){let h=new I;Ei.getBarycoord(em,Qa,tc,ec,h),r&&(u.uv=Ei.getInterpolatedAttribute(r,a,c,l,h,new et)),s&&(u.uv1=Ei.getInterpolatedAttribute(s,a,c,l,h,new et)),o&&(u.normal=Ei.getInterpolatedAttribute(o,a,c,l,h,new I),u.normal.dot(i.direction)>0&&u.normal.multiplyScalar(-1));let f={a,b:c,c:l,normal:new I,materialIndex:0};Ei.getNormal(Qa,tc,ec,f.normal),u.face=f,u.barycoord=h}return u}var Ms=class e extends ve{constructor(t=1,n=1,i=1,r=1,s=1,o=1){super(),this.type="BoxGeometry",this.parameters={width:t,height:n,depth:i,widthSegments:r,heightSegments:s,depthSegments:o};let a=this;r=Math.floor(r),s=Math.floor(s),o=Math.floor(o);let c=[],l=[],u=[],h=[],f=0,d=0;m("z","y","x",-1,-1,i,n,t,o,s,0),m("z","y","x",1,-1,i,n,-t,o,s,1),m("x","z","y",1,1,t,i,n,r,o,2),m("x","z","y",1,-1,t,i,-n,r,o,3),m("x","y","z",1,-1,t,n,i,r,s,4),m("x","y","z",-1,-1,t,n,-i,r,s,5),this.setIndex(c),this.setAttribute("position",new ce(l,3)),this.setAttribute("normal",new ce(u,3)),this.setAttribute("uv",new ce(h,2));function m(_,g,p,b,x,v,M,S,C,P,T){let w=v/C,R=M/P,V=v/2,N=M/2,z=S/2,U=C+1,G=P+1,K=0,q=0,ot=new I;for(let gt=0;gt<G;gt++){let Y=gt*R-N;for(let it=0;it<U;it++){let dt=it*w-V;ot[_]=dt*b,ot[g]=Y*x,ot[p]=z,l.push(ot.x,ot.y,ot.z),ot[_]=0,ot[g]=0,ot[p]=S>0?1:-1,u.push(ot.x,ot.y,ot.z),h.push(it/C),h.push(1-gt/P),K+=1}}for(let gt=0;gt<P;gt++)for(let Y=0;Y<C;Y++){let it=f+Y+U*gt,dt=f+Y+U*(gt+1),zt=f+(Y+1)+U*(gt+1),Lt=f+(Y+1)+U*gt;c.push(it,dt,Lt),c.push(dt,zt,Lt),q+=6}a.addGroup(d,q,T),d+=q,f+=K}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new e(t.width,t.height,t.depth,t.widthSegments,t.heightSegments,t.depthSegments)}};function Dr(e){let t={};for(let n in e){t[n]={};for(let i in e[n]){let r=e[n][i];r&&(r.isColor||r.isMatrix3||r.isMatrix4||r.isVector2||r.isVector3||r.isVector4||r.isTexture||r.isQuaternion)?r.isRenderTargetTexture?(console.warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),t[n][i]=null):t[n][i]=r.clone():Array.isArray(r)?t[n][i]=r.slice():t[n][i]=r}}return t}function Ke(e){let t={};for(let n=0;n<e.length;n++){let i=Dr(e[n]);for(let r in i)t[r]=i[r]}return t}function yb(e){let t=[];for(let n=0;n<e.length;n++)t.push(e[n].clone());return t}function Sf(e){let t=e.getRenderTarget();return t===null?e.outputColorSpace:t.isXRRenderTarget===!0?t.texture.colorSpace:ee.workingColorSpace}var Oi={clone:Dr,merge:Ke},xb=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,bb=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`,Le=class extends On{constructor(t){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=xb,this.fragmentShader=bb,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,t!==void 0&&this.setValues(t)}copy(t){return super.copy(t),this.fragmentShader=t.fragmentShader,this.vertexShader=t.vertexShader,this.uniforms=Dr(t.uniforms),this.uniformsGroups=yb(t.uniformsGroups),this.defines=Object.assign({},t.defines),this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.fog=t.fog,this.lights=t.lights,this.clipping=t.clipping,this.extensions=Object.assign({},t.extensions),this.glslVersion=t.glslVersion,this}toJSON(t){let n=super.toJSON(t);n.glslVersion=this.glslVersion,n.uniforms={};for(let r in this.uniforms){let o=this.uniforms[r].value;o&&o.isTexture?n.uniforms[r]={type:"t",value:o.toJSON(t).uuid}:o&&o.isColor?n.uniforms[r]={type:"c",value:o.getHex()}:o&&o.isVector2?n.uniforms[r]={type:"v2",value:o.toArray()}:o&&o.isVector3?n.uniforms[r]={type:"v3",value:o.toArray()}:o&&o.isVector4?n.uniforms[r]={type:"v4",value:o.toArray()}:o&&o.isMatrix3?n.uniforms[r]={type:"m3",value:o.toArray()}:o&&o.isMatrix4?n.uniforms[r]={type:"m4",value:o.toArray()}:n.uniforms[r]={value:o}}Object.keys(this.defines).length>0&&(n.defines=this.defines),n.vertexShader=this.vertexShader,n.fragmentShader=this.fragmentShader,n.lights=this.lights,n.clipping=this.clipping;let i={};for(let r in this.extensions)this.extensions[r]===!0&&(i[r]=!0);return Object.keys(i).length>0&&(n.extensions=i),n}},Ro=class extends Be{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new Vt,this.projectionMatrix=new Vt,this.projectionMatrixInverse=new Vt,this.coordinateSystem=$n,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(t,n){return super.copy(t,n),this.matrixWorldInverse.copy(t.matrixWorldInverse),this.projectionMatrix.copy(t.projectionMatrix),this.projectionMatrixInverse.copy(t.projectionMatrixInverse),this.coordinateSystem=t.coordinateSystem,this}getWorldDirection(t){return super.getWorldDirection(t).negate()}updateMatrixWorld(t){super.updateMatrixWorld(t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(t,n){super.updateWorldMatrix(t,n),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}},ji=new I,nm=new et,im=new et,Ge=class extends Ro{constructor(t=50,n=1,i=.1,r=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=t,this.zoom=1,this.near=i,this.far=r,this.focus=10,this.aspect=n,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(t,n){return super.copy(t,n),this.fov=t.fov,this.zoom=t.zoom,this.near=t.near,this.far=t.far,this.focus=t.focus,this.aspect=t.aspect,this.view=t.view===null?null:Object.assign({},t.view),this.filmGauge=t.filmGauge,this.filmOffset=t.filmOffset,this}setFocalLength(t){let n=.5*this.getFilmHeight()/t;this.fov=_s*2*Math.atan(n),this.updateProjectionMatrix()}getFocalLength(){let t=Math.tan(yo*.5*this.fov);return .5*this.getFilmHeight()/t}getEffectiveFOV(){return _s*2*Math.atan(Math.tan(yo*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(t,n,i){ji.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(ji.x,ji.y).multiplyScalar(-t/ji.z),ji.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),i.set(ji.x,ji.y).multiplyScalar(-t/ji.z)}getViewSize(t,n){return this.getViewBounds(t,nm,im),n.subVectors(im,nm)}setViewOffset(t,n,i,r,s,o){this.aspect=t/n,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=n,this.view.offsetX=i,this.view.offsetY=r,this.view.width=s,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let t=this.near,n=t*Math.tan(yo*.5*this.fov)/this.zoom,i=2*n,r=this.aspect*i,s=-.5*r,o=this.view;if(this.view!==null&&this.view.enabled){let c=o.fullWidth,l=o.fullHeight;s+=o.offsetX*r/c,n-=o.offsetY*i/l,r*=o.width/c,i*=o.height/l}let a=this.filmOffset;a!==0&&(s+=t*a/this.getFilmWidth()),this.projectionMatrix.makePerspective(s,s+r,n,n-i,t,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){let n=super.toJSON(t);return n.object.fov=this.fov,n.object.zoom=this.zoom,n.object.near=this.near,n.object.far=this.far,n.object.focus=this.focus,n.object.aspect=this.aspect,this.view!==null&&(n.object.view=Object.assign({},this.view)),n.object.filmGauge=this.filmGauge,n.object.filmOffset=this.filmOffset,n}},cs=-90,ls=1,Tc=class extends Be{constructor(t,n,i){super(),this.type="CubeCamera",this.renderTarget=i,this.coordinateSystem=null,this.activeMipmapLevel=0;let r=new Ge(cs,ls,t,n);r.layers=this.layers,this.add(r);let s=new Ge(cs,ls,t,n);s.layers=this.layers,this.add(s);let o=new Ge(cs,ls,t,n);o.layers=this.layers,this.add(o);let a=new Ge(cs,ls,t,n);a.layers=this.layers,this.add(a);let c=new Ge(cs,ls,t,n);c.layers=this.layers,this.add(c);let l=new Ge(cs,ls,t,n);l.layers=this.layers,this.add(l)}updateCoordinateSystem(){let t=this.coordinateSystem,n=this.children.concat(),[i,r,s,o,a,c]=n;for(let l of n)this.remove(l);if(t===$n)i.up.set(0,1,0),i.lookAt(1,0,0),r.up.set(0,1,0),r.lookAt(-1,0,0),s.up.set(0,0,-1),s.lookAt(0,1,0),o.up.set(0,0,1),o.lookAt(0,-1,0),a.up.set(0,1,0),a.lookAt(0,0,1),c.up.set(0,1,0),c.lookAt(0,0,-1);else if(t===Eo)i.up.set(0,-1,0),i.lookAt(-1,0,0),r.up.set(0,-1,0),r.lookAt(1,0,0),s.up.set(0,0,1),s.lookAt(0,1,0),o.up.set(0,0,-1),o.lookAt(0,-1,0),a.up.set(0,-1,0),a.lookAt(0,0,1),c.up.set(0,-1,0),c.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+t);for(let l of n)this.add(l),l.updateMatrixWorld()}update(t,n){this.parent===null&&this.updateMatrixWorld();let{renderTarget:i,activeMipmapLevel:r}=this;this.coordinateSystem!==t.coordinateSystem&&(this.coordinateSystem=t.coordinateSystem,this.updateCoordinateSystem());let[s,o,a,c,l,u]=this.children,h=t.getRenderTarget(),f=t.getActiveCubeFace(),d=t.getActiveMipmapLevel(),m=t.xr.enabled;t.xr.enabled=!1;let _=i.texture.generateMipmaps;i.texture.generateMipmaps=!1,t.setRenderTarget(i,0,r),t.render(n,s),t.setRenderTarget(i,1,r),t.render(n,o),t.setRenderTarget(i,2,r),t.render(n,a),t.setRenderTarget(i,3,r),t.render(n,c),t.setRenderTarget(i,4,r),t.render(n,l),i.texture.generateMipmaps=_,t.setRenderTarget(i,5,r),t.render(n,u),t.setRenderTarget(h,f,d),t.xr.enabled=m,i.texture.needsPMREMUpdate=!0}},Po=class extends sn{constructor(t=[],n=Pr,i,r,s,o,a,c,l,u){super(t,n,i,r,s,o,a,c,l,u),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(t){this.image=t}},Ac=class extends Ze{constructor(t=1,n={}){super(t,t,n),this.isWebGLCubeRenderTarget=!0;let i={width:t,height:t,depth:1},r=[i,i,i,i,i,i];this.texture=new Po(r),this._setTextureOptions(n),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(t,n){this.texture.type=n.type,this.texture.colorSpace=n.colorSpace,this.texture.generateMipmaps=n.generateMipmaps,this.texture.minFilter=n.minFilter,this.texture.magFilter=n.magFilter;let i={uniforms:{tEquirect:{value:null}},vertexShader:`

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
			`},r=new Ms(5,5,5),s=new Le({name:"CubemapFromEquirect",uniforms:Dr(i.uniforms),vertexShader:i.vertexShader,fragmentShader:i.fragmentShader,side:We,blending:Kn});s.uniforms.tEquirect.value=n;let o=new we(r,s),a=n.minFilter;return n.minFilter===Ki&&(n.minFilter=Yn),new Tc(1,10,this).update(t,o),n.minFilter=a,o.geometry.dispose(),o.material.dispose(),this}clear(t,n=!0,i=!0,r=!0){let s=t.getRenderTarget();for(let o=0;o<6;o++)t.setRenderTarget(this,o),t.clear(n,i,r);t.setRenderTarget(s)}},$e=class extends Be{constructor(){super(),this.isGroup=!0,this.type="Group"}},Mb={type:"move"},Ss=class{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new $e,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new $e,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new I,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new I),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new $e,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new I,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new I),this._grip}dispatchEvent(t){return this._targetRay!==null&&this._targetRay.dispatchEvent(t),this._grip!==null&&this._grip.dispatchEvent(t),this._hand!==null&&this._hand.dispatchEvent(t),this}connect(t){if(t&&t.hand){let n=this._hand;if(n)for(let i of t.hand.values())this._getHandJoint(n,i)}return this.dispatchEvent({type:"connected",data:t}),this}disconnect(t){return this.dispatchEvent({type:"disconnected",data:t}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(t,n,i){let r=null,s=null,o=null,a=this._targetRay,c=this._grip,l=this._hand;if(t&&n.session.visibilityState!=="visible-blurred"){if(l&&t.hand){o=!0;for(let _ of t.hand.values()){let g=n.getJointPose(_,i),p=this._getHandJoint(l,_);g!==null&&(p.matrix.fromArray(g.transform.matrix),p.matrix.decompose(p.position,p.rotation,p.scale),p.matrixWorldNeedsUpdate=!0,p.jointRadius=g.radius),p.visible=g!==null}let u=l.joints["index-finger-tip"],h=l.joints["thumb-tip"],f=u.position.distanceTo(h.position),d=.02,m=.005;l.inputState.pinching&&f>d+m?(l.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:t.handedness,target:this})):!l.inputState.pinching&&f<=d-m&&(l.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:t.handedness,target:this}))}else c!==null&&t.gripSpace&&(s=n.getPose(t.gripSpace,i),s!==null&&(c.matrix.fromArray(s.transform.matrix),c.matrix.decompose(c.position,c.rotation,c.scale),c.matrixWorldNeedsUpdate=!0,s.linearVelocity?(c.hasLinearVelocity=!0,c.linearVelocity.copy(s.linearVelocity)):c.hasLinearVelocity=!1,s.angularVelocity?(c.hasAngularVelocity=!0,c.angularVelocity.copy(s.angularVelocity)):c.hasAngularVelocity=!1));a!==null&&(r=n.getPose(t.targetRaySpace,i),r===null&&s!==null&&(r=s),r!==null&&(a.matrix.fromArray(r.transform.matrix),a.matrix.decompose(a.position,a.rotation,a.scale),a.matrixWorldNeedsUpdate=!0,r.linearVelocity?(a.hasLinearVelocity=!0,a.linearVelocity.copy(r.linearVelocity)):a.hasLinearVelocity=!1,r.angularVelocity?(a.hasAngularVelocity=!0,a.angularVelocity.copy(r.angularVelocity)):a.hasAngularVelocity=!1,this.dispatchEvent(Mb)))}return a!==null&&(a.visible=r!==null),c!==null&&(c.visible=s!==null),l!==null&&(l.visible=o!==null),this}_getHandJoint(t,n){if(t.joints[n.jointName]===void 0){let i=new $e;i.matrixAutoUpdate=!1,i.visible=!1,t.joints[n.jointName]=i,t.add(i)}return t.joints[n.jointName]}},Io=class e{constructor(t,n=25e-5){this.isFogExp2=!0,this.name="",this.color=new Ot(t),this.density=n}clone(){return new e(this.color,this.density)}toJSON(){return{type:"FogExp2",name:this.name,color:this.color.getHex(),density:this.density}}};var Do=class extends Be{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new Ln,this.environmentIntensity=1,this.environmentRotation=new Ln,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(t,n){return super.copy(t,n),t.background!==null&&(this.background=t.background.clone()),t.environment!==null&&(this.environment=t.environment.clone()),t.fog!==null&&(this.fog=t.fog.clone()),this.backgroundBlurriness=t.backgroundBlurriness,this.backgroundIntensity=t.backgroundIntensity,this.backgroundRotation.copy(t.backgroundRotation),this.environmentIntensity=t.environmentIntensity,this.environmentRotation.copy(t.environmentRotation),t.overrideMaterial!==null&&(this.overrideMaterial=t.overrideMaterial.clone()),this.matrixAutoUpdate=t.matrixAutoUpdate,this}toJSON(t){let n=super.toJSON(t);return this.fog!==null&&(n.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(n.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(n.object.backgroundIntensity=this.backgroundIntensity),n.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(n.object.environmentIntensity=this.environmentIntensity),n.object.environmentRotation=this.environmentRotation.toArray(),n}},Cc=class{constructor(t,n){this.isInterleavedBuffer=!0,this.array=t,this.stride=n,this.count=t!==void 0?t.length/n:0,this.usage=Mc,this.updateRanges=[],this.version=0,this.uuid=Ti()}onUploadCallback(){}set needsUpdate(t){t===!0&&this.version++}setUsage(t){return this.usage=t,this}addUpdateRange(t,n){this.updateRanges.push({start:t,count:n})}clearUpdateRanges(){this.updateRanges.length=0}copy(t){return this.array=new t.array.constructor(t.array),this.count=t.count,this.stride=t.stride,this.usage=t.usage,this}copyAt(t,n,i){t*=this.stride,i*=n.stride;for(let r=0,s=this.stride;r<s;r++)this.array[t+r]=n.array[i+r];return this}set(t,n=0){return this.array.set(t,n),this}clone(t){t.arrayBuffers===void 0&&(t.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=Ti()),t.arrayBuffers[this.array.buffer._uuid]===void 0&&(t.arrayBuffers[this.array.buffer._uuid]=this.array.slice(0).buffer);let n=new this.array.constructor(t.arrayBuffers[this.array.buffer._uuid]),i=new this.constructor(n,this.stride);return i.setUsage(this.usage),i}onUpload(t){return this.onUploadCallback=t,this}toJSON(t){return t.arrayBuffers===void 0&&(t.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=Ti()),t.arrayBuffers[this.array.buffer._uuid]===void 0&&(t.arrayBuffers[this.array.buffer._uuid]=Array.from(new Uint32Array(this.array.buffer))),{uuid:this.uuid,buffer:this.array.buffer._uuid,type:this.array.constructor.name,stride:this.stride}}},rn=new I,Lo=class e{constructor(t,n,i,r=!1){this.isInterleavedBufferAttribute=!0,this.name="",this.data=t,this.itemSize=n,this.offset=i,this.normalized=r}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(t){this.data.needsUpdate=t}applyMatrix4(t){for(let n=0,i=this.data.count;n<i;n++)rn.fromBufferAttribute(this,n),rn.applyMatrix4(t),this.setXYZ(n,rn.x,rn.y,rn.z);return this}applyNormalMatrix(t){for(let n=0,i=this.count;n<i;n++)rn.fromBufferAttribute(this,n),rn.applyNormalMatrix(t),this.setXYZ(n,rn.x,rn.y,rn.z);return this}transformDirection(t){for(let n=0,i=this.count;n<i;n++)rn.fromBufferAttribute(this,n),rn.transformDirection(t),this.setXYZ(n,rn.x,rn.y,rn.z);return this}getComponent(t,n){let i=this.array[t*this.data.stride+this.offset+n];return this.normalized&&(i=Xn(i,this.array)),i}setComponent(t,n,i){return this.normalized&&(i=fe(i,this.array)),this.data.array[t*this.data.stride+this.offset+n]=i,this}setX(t,n){return this.normalized&&(n=fe(n,this.array)),this.data.array[t*this.data.stride+this.offset]=n,this}setY(t,n){return this.normalized&&(n=fe(n,this.array)),this.data.array[t*this.data.stride+this.offset+1]=n,this}setZ(t,n){return this.normalized&&(n=fe(n,this.array)),this.data.array[t*this.data.stride+this.offset+2]=n,this}setW(t,n){return this.normalized&&(n=fe(n,this.array)),this.data.array[t*this.data.stride+this.offset+3]=n,this}getX(t){let n=this.data.array[t*this.data.stride+this.offset];return this.normalized&&(n=Xn(n,this.array)),n}getY(t){let n=this.data.array[t*this.data.stride+this.offset+1];return this.normalized&&(n=Xn(n,this.array)),n}getZ(t){let n=this.data.array[t*this.data.stride+this.offset+2];return this.normalized&&(n=Xn(n,this.array)),n}getW(t){let n=this.data.array[t*this.data.stride+this.offset+3];return this.normalized&&(n=Xn(n,this.array)),n}setXY(t,n,i){return t=t*this.data.stride+this.offset,this.normalized&&(n=fe(n,this.array),i=fe(i,this.array)),this.data.array[t+0]=n,this.data.array[t+1]=i,this}setXYZ(t,n,i,r){return t=t*this.data.stride+this.offset,this.normalized&&(n=fe(n,this.array),i=fe(i,this.array),r=fe(r,this.array)),this.data.array[t+0]=n,this.data.array[t+1]=i,this.data.array[t+2]=r,this}setXYZW(t,n,i,r,s){return t=t*this.data.stride+this.offset,this.normalized&&(n=fe(n,this.array),i=fe(i,this.array),r=fe(r,this.array),s=fe(s,this.array)),this.data.array[t+0]=n,this.data.array[t+1]=i,this.data.array[t+2]=r,this.data.array[t+3]=s,this}clone(t){if(t===void 0){console.log("THREE.InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.");let n=[];for(let i=0;i<this.count;i++){let r=i*this.data.stride+this.offset;for(let s=0;s<this.itemSize;s++)n.push(this.data.array[r+s])}return new Ye(new this.array.constructor(n),this.itemSize,this.normalized)}else return t.interleavedBuffers===void 0&&(t.interleavedBuffers={}),t.interleavedBuffers[this.data.uuid]===void 0&&(t.interleavedBuffers[this.data.uuid]=this.data.clone(t)),new e(t.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}toJSON(t){if(t===void 0){console.log("THREE.InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.");let n=[];for(let i=0;i<this.count;i++){let r=i*this.data.stride+this.offset;for(let s=0;s<this.itemSize;s++)n.push(this.data.array[r+s])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:n,normalized:this.normalized}}else return t.interleavedBuffers===void 0&&(t.interleavedBuffers={}),t.interleavedBuffers[this.data.uuid]===void 0&&(t.interleavedBuffers[this.data.uuid]=this.data.toJSON(t)),{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}},ai=class extends On{constructor(t){super(),this.isSpriteMaterial=!0,this.type="SpriteMaterial",this.color=new Ot(16777215),this.map=null,this.alphaMap=null,this.rotation=0,this.sizeAttenuation=!0,this.transparent=!0,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.alphaMap=t.alphaMap,this.rotation=t.rotation,this.sizeAttenuation=t.sizeAttenuation,this.fog=t.fog,this}},hs,po=new I,us=new I,fs=new I,ds=new et,mo=new et,eg=new Vt,sc=new I,go=new I,oc=new I,rm=new et,Hu=new et,sm=new et,ci=class extends Be{constructor(t=new ai){if(super(),this.isSprite=!0,this.type="Sprite",hs===void 0){hs=new ve;let n=new Float32Array([-.5,-.5,0,0,0,.5,-.5,0,1,0,.5,.5,0,1,1,-.5,.5,0,0,1]),i=new Cc(n,5);hs.setIndex([0,1,2,0,2,3]),hs.setAttribute("position",new Lo(i,3,0,!1)),hs.setAttribute("uv",new Lo(i,2,3,!1))}this.geometry=hs,this.material=t,this.center=new et(.5,.5),this.count=1}raycast(t,n){t.camera===null&&console.error('THREE.Sprite: "Raycaster.camera" needs to be set in order to raycast against sprites.'),us.setFromMatrixScale(this.matrixWorld),eg.copy(t.camera.matrixWorld),this.modelViewMatrix.multiplyMatrices(t.camera.matrixWorldInverse,this.matrixWorld),fs.setFromMatrixPosition(this.modelViewMatrix),t.camera.isPerspectiveCamera&&this.material.sizeAttenuation===!1&&us.multiplyScalar(-fs.z);let i=this.material.rotation,r,s;i!==0&&(s=Math.cos(i),r=Math.sin(i));let o=this.center;ac(sc.set(-.5,-.5,0),fs,o,us,r,s),ac(go.set(.5,-.5,0),fs,o,us,r,s),ac(oc.set(.5,.5,0),fs,o,us,r,s),rm.set(0,0),Hu.set(1,0),sm.set(1,1);let a=t.ray.intersectTriangle(sc,go,oc,!1,po);if(a===null&&(ac(go.set(-.5,.5,0),fs,o,us,r,s),Hu.set(0,1),a=t.ray.intersectTriangle(sc,oc,go,!1,po),a===null))return;let c=t.ray.origin.distanceTo(po);c<t.near||c>t.far||n.push({distance:c,point:po.clone(),uv:Ei.getInterpolation(po,sc,go,oc,rm,Hu,sm,new et),face:null,object:this})}copy(t,n){return super.copy(t,n),t.center!==void 0&&this.center.copy(t.center),this.material=t.material,this}};function ac(e,t,n,i,r,s){ds.subVectors(e,n).addScalar(.5).multiply(i),r!==void 0?(mo.x=s*ds.x-r*ds.y,mo.y=r*ds.x+s*ds.y):mo.copy(ds),e.copy(t),e.x+=mo.x,e.y+=mo.y,e.applyMatrix4(eg)}var Gu=new I,Sb=new I,wb=new Xt,un=class{constructor(t=new I(1,0,0),n=0){this.isPlane=!0,this.normal=t,this.constant=n}set(t,n){return this.normal.copy(t),this.constant=n,this}setComponents(t,n,i,r){return this.normal.set(t,n,i),this.constant=r,this}setFromNormalAndCoplanarPoint(t,n){return this.normal.copy(t),this.constant=-n.dot(this.normal),this}setFromCoplanarPoints(t,n,i){let r=Gu.subVectors(i,n).cross(Sb.subVectors(t,n)).normalize();return this.setFromNormalAndCoplanarPoint(r,t),this}copy(t){return this.normal.copy(t.normal),this.constant=t.constant,this}normalize(){let t=1/this.normal.length();return this.normal.multiplyScalar(t),this.constant*=t,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(t){return this.normal.dot(t)+this.constant}distanceToSphere(t){return this.distanceToPoint(t.center)-t.radius}projectPoint(t,n){return n.copy(t).addScaledVector(this.normal,-this.distanceToPoint(t))}intersectLine(t,n){let i=t.delta(Gu),r=this.normal.dot(i);if(r===0)return this.distanceToPoint(t.start)===0?n.copy(t.start):null;let s=-(t.start.dot(this.normal)+this.constant)/r;return s<0||s>1?null:n.copy(t.start).addScaledVector(i,s)}intersectsLine(t){let n=this.distanceToPoint(t.start),i=this.distanceToPoint(t.end);return n<0&&i>0||i<0&&n>0}intersectsBox(t){return t.intersectsPlane(this)}intersectsSphere(t){return t.intersectsPlane(this)}coplanarPoint(t){return t.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(t,n){let i=n||wb.getNormalMatrix(t),r=this.coplanarPoint(Gu).applyMatrix4(t),s=this.normal.applyMatrix3(i).normalize();return this.constant=-r.dot(s),this}translate(t){return this.constant-=t.dot(this.normal),this}equals(t){return t.normal.equals(this.normal)&&t.constant===this.constant}clone(){return new this.constructor().copy(this)}},br=new oi,Eb=new et(.5,.5),cc=new I,ws=class{constructor(t=new un,n=new un,i=new un,r=new un,s=new un,o=new un){this.planes=[t,n,i,r,s,o]}set(t,n,i,r,s,o){let a=this.planes;return a[0].copy(t),a[1].copy(n),a[2].copy(i),a[3].copy(r),a[4].copy(s),a[5].copy(o),this}copy(t){let n=this.planes;for(let i=0;i<6;i++)n[i].copy(t.planes[i]);return this}setFromProjectionMatrix(t,n=$n,i=!1){let r=this.planes,s=t.elements,o=s[0],a=s[1],c=s[2],l=s[3],u=s[4],h=s[5],f=s[6],d=s[7],m=s[8],_=s[9],g=s[10],p=s[11],b=s[12],x=s[13],v=s[14],M=s[15];if(r[0].setComponents(l-o,d-u,p-m,M-b).normalize(),r[1].setComponents(l+o,d+u,p+m,M+b).normalize(),r[2].setComponents(l+a,d+h,p+_,M+x).normalize(),r[3].setComponents(l-a,d-h,p-_,M-x).normalize(),i)r[4].setComponents(c,f,g,v).normalize(),r[5].setComponents(l-c,d-f,p-g,M-v).normalize();else if(r[4].setComponents(l-c,d-f,p-g,M-v).normalize(),n===$n)r[5].setComponents(l+c,d+f,p+g,M+v).normalize();else if(n===Eo)r[5].setComponents(c,f,g,v).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+n);return this}intersectsObject(t){if(t.boundingSphere!==void 0)t.boundingSphere===null&&t.computeBoundingSphere(),br.copy(t.boundingSphere).applyMatrix4(t.matrixWorld);else{let n=t.geometry;n.boundingSphere===null&&n.computeBoundingSphere(),br.copy(n.boundingSphere).applyMatrix4(t.matrixWorld)}return this.intersectsSphere(br)}intersectsSprite(t){br.center.set(0,0,0);let n=Eb.distanceTo(t.center);return br.radius=.7071067811865476+n,br.applyMatrix4(t.matrixWorld),this.intersectsSphere(br)}intersectsSphere(t){let n=this.planes,i=t.center,r=-t.radius;for(let s=0;s<6;s++)if(n[s].distanceToPoint(i)<r)return!1;return!0}intersectsBox(t){let n=this.planes;for(let i=0;i<6;i++){let r=n[i];if(cc.x=r.normal.x>0?t.max.x:t.min.x,cc.y=r.normal.y>0?t.max.y:t.min.y,cc.z=r.normal.z>0?t.max.z:t.min.z,r.distanceToPoint(cc)<0)return!1}return!0}containsPoint(t){let n=this.planes;for(let i=0;i<6;i++)if(n[i].distanceToPoint(t)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}};var Zn=class extends On{constructor(t){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new Ot(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.linewidth=t.linewidth,this.linecap=t.linecap,this.linejoin=t.linejoin,this.fog=t.fog,this}},Rc=new I,Pc=new I,om=new Vt,_o=new Ri,lc=new oi,Wu=new I,am=new I,li=class extends Be{constructor(t=new ve,n=new Zn){super(),this.isLine=!0,this.type="Line",this.geometry=t,this.material=n,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(t,n){return super.copy(t,n),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}computeLineDistances(){let t=this.geometry;if(t.index===null){let n=t.attributes.position,i=[0];for(let r=1,s=n.count;r<s;r++)Rc.fromBufferAttribute(n,r-1),Pc.fromBufferAttribute(n,r),i[r]=i[r-1],i[r]+=Rc.distanceTo(Pc);t.setAttribute("lineDistance",new ce(i,1))}else console.warn("THREE.Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}raycast(t,n){let i=this.geometry,r=this.matrixWorld,s=t.params.Line.threshold,o=i.drawRange;if(i.boundingSphere===null&&i.computeBoundingSphere(),lc.copy(i.boundingSphere),lc.applyMatrix4(r),lc.radius+=s,t.ray.intersectsSphere(lc)===!1)return;om.copy(r).invert(),_o.copy(t.ray).applyMatrix4(om);let a=s/((this.scale.x+this.scale.y+this.scale.z)/3),c=a*a,l=this.isLineSegments?2:1,u=i.index,f=i.attributes.position;if(u!==null){let d=Math.max(0,o.start),m=Math.min(u.count,o.start+o.count);for(let _=d,g=m-1;_<g;_+=l){let p=u.getX(_),b=u.getX(_+1),x=hc(this,t,_o,c,p,b,_);x&&n.push(x)}if(this.isLineLoop){let _=u.getX(m-1),g=u.getX(d),p=hc(this,t,_o,c,_,g,m-1);p&&n.push(p)}}else{let d=Math.max(0,o.start),m=Math.min(f.count,o.start+o.count);for(let _=d,g=m-1;_<g;_+=l){let p=hc(this,t,_o,c,_,_+1,_);p&&n.push(p)}if(this.isLineLoop){let _=hc(this,t,_o,c,m-1,d,m-1);_&&n.push(_)}}}updateMorphTargets(){let n=this.geometry.morphAttributes,i=Object.keys(n);if(i.length>0){let r=n[i[0]];if(r!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,o=r.length;s<o;s++){let a=r[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=s}}}}};function hc(e,t,n,i,r,s,o){let a=e.geometry.attributes.position;if(Rc.fromBufferAttribute(a,r),Pc.fromBufferAttribute(a,s),n.distanceSqToSegment(Rc,Pc,Wu,am)>i)return;Wu.applyMatrix4(e.matrixWorld);let l=t.ray.origin.distanceTo(Wu);if(!(l<t.near||l>t.far))return{distance:l,point:am.clone().applyMatrix4(e.matrixWorld),index:o,face:null,faceIndex:null,barycoord:null,object:e}}var cm=new I,lm=new I,Ic=class extends li{constructor(t,n){super(t,n),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){let t=this.geometry;if(t.index===null){let n=t.attributes.position,i=[];for(let r=0,s=n.count;r<s;r+=2)cm.fromBufferAttribute(n,r),lm.fromBufferAttribute(n,r+1),i[r]=r===0?0:i[r-1],i[r+1]=i[r]+cm.distanceTo(lm);t.setAttribute("lineDistance",new ce(i,1))}else console.warn("THREE.LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}};var Es=class extends On{constructor(t){super(),this.isPointsMaterial=!0,this.type="PointsMaterial",this.color=new Ot(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.alphaMap=t.alphaMap,this.size=t.size,this.sizeAttenuation=t.sizeAttenuation,this.fog=t.fog,this}},hm=new Vt,tf=new Ri,uc=new oi,fc=new I,Oo=class extends Be{constructor(t=new ve,n=new Es){super(),this.isPoints=!0,this.type="Points",this.geometry=t,this.material=n,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(t,n){return super.copy(t,n),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}raycast(t,n){let i=this.geometry,r=this.matrixWorld,s=t.params.Points.threshold,o=i.drawRange;if(i.boundingSphere===null&&i.computeBoundingSphere(),uc.copy(i.boundingSphere),uc.applyMatrix4(r),uc.radius+=s,t.ray.intersectsSphere(uc)===!1)return;hm.copy(r).invert(),tf.copy(t.ray).applyMatrix4(hm);let a=s/((this.scale.x+this.scale.y+this.scale.z)/3),c=a*a,l=i.index,h=i.attributes.position;if(l!==null){let f=Math.max(0,o.start),d=Math.min(l.count,o.start+o.count);for(let m=f,_=d;m<_;m++){let g=l.getX(m);fc.fromBufferAttribute(h,g),um(fc,g,c,r,t,n,this)}}else{let f=Math.max(0,o.start),d=Math.min(h.count,o.start+o.count);for(let m=f,_=d;m<_;m++)fc.fromBufferAttribute(h,m),um(fc,m,c,r,t,n,this)}}updateMorphTargets(){let n=this.geometry.morphAttributes,i=Object.keys(n);if(i.length>0){let r=n[i[0]];if(r!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,o=r.length;s<o;s++){let a=r[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=s}}}}};function um(e,t,n,i,r,s,o){let a=tf.distanceSqToPoint(e);if(a<n){let c=new I;tf.closestPointToPoint(e,c),c.applyMatrix4(i);let l=r.ray.origin.distanceTo(c);if(l<r.near||l>r.far)return;s.push({distance:l,distanceToRay:Math.sqrt(a),point:c,index:t,face:null,faceIndex:null,barycoord:null,object:o})}}var No=class extends sn{constructor(t,n,i,r,s,o,a,c,l){super(t,n,i,r,s,o,a,c,l),this.isCanvasTexture=!0,this.needsUpdate=!0}},Fo=class extends sn{constructor(t,n,i=Ji,r,s,o,a=Dn,c=Dn,l,u=gs,h=1){if(u!==gs&&u!==Ls)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");let f={width:t,height:n,depth:h};super(f,r,s,o,a,c,u,i,l),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(t){return super.copy(t),this.source=new xs(Object.assign({},t.image)),this.compareFunction=t.compareFunction,this}toJSON(t){let n=super.toJSON(t);return this.compareFunction!==null&&(n.compareFunction=this.compareFunction),n}},Uo=class extends sn{constructor(t=null){super(),this.sourceTexture=t,this.isExternalTexture=!0}copy(t){return super.copy(t),this.sourceTexture=t.sourceTexture,this}};var Ts=class e extends ve{constructor(t=1,n=1,i=1,r=32,s=1,o=!1,a=0,c=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:t,radiusBottom:n,height:i,radialSegments:r,heightSegments:s,openEnded:o,thetaStart:a,thetaLength:c};let l=this;r=Math.floor(r),s=Math.floor(s);let u=[],h=[],f=[],d=[],m=0,_=[],g=i/2,p=0;b(),o===!1&&(t>0&&x(!0),n>0&&x(!1)),this.setIndex(u),this.setAttribute("position",new ce(h,3)),this.setAttribute("normal",new ce(f,3)),this.setAttribute("uv",new ce(d,2));function b(){let v=new I,M=new I,S=0,C=(n-t)/i;for(let P=0;P<=s;P++){let T=[],w=P/s,R=w*(n-t)+t;for(let V=0;V<=r;V++){let N=V/r,z=N*c+a,U=Math.sin(z),G=Math.cos(z);M.x=R*U,M.y=-w*i+g,M.z=R*G,h.push(M.x,M.y,M.z),v.set(U,C,G).normalize(),f.push(v.x,v.y,v.z),d.push(N,1-w),T.push(m++)}_.push(T)}for(let P=0;P<r;P++)for(let T=0;T<s;T++){let w=_[T][P],R=_[T+1][P],V=_[T+1][P+1],N=_[T][P+1];(t>0||T!==0)&&(u.push(w,R,N),S+=3),(n>0||T!==s-1)&&(u.push(R,V,N),S+=3)}l.addGroup(p,S,0),p+=S}function x(v){let M=m,S=new et,C=new I,P=0,T=v===!0?t:n,w=v===!0?1:-1;for(let V=1;V<=r;V++)h.push(0,g*w,0),f.push(0,w,0),d.push(.5,.5),m++;let R=m;for(let V=0;V<=r;V++){let z=V/r*c+a,U=Math.cos(z),G=Math.sin(z);C.x=T*G,C.y=g*w,C.z=T*U,h.push(C.x,C.y,C.z),f.push(0,w,0),S.x=U*.5+.5,S.y=G*.5*w+.5,d.push(S.x,S.y),m++}for(let V=0;V<r;V++){let N=M+V,z=R+V;v===!0?u.push(z,z+1,N):u.push(z+1,z,N),P+=3}l.addGroup(p,P,v===!0?1:2),p+=P}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new e(t.radiusTop,t.radiusBottom,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}},zo=class e extends Ts{constructor(t=1,n=1,i=32,r=1,s=!1,o=0,a=Math.PI*2){super(0,t,n,i,r,s,o,a),this.type="ConeGeometry",this.parameters={radius:t,height:n,radialSegments:i,heightSegments:r,openEnded:s,thetaStart:o,thetaLength:a}}static fromJSON(t){return new e(t.radius,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}};var Nn=class{constructor(){this.type="Curve",this.arcLengthDivisions=200,this.needsUpdate=!1,this.cacheArcLengths=null}getPoint(){console.warn("THREE.Curve: .getPoint() not implemented.")}getPointAt(t,n){let i=this.getUtoTmapping(t);return this.getPoint(i,n)}getPoints(t=5){let n=[];for(let i=0;i<=t;i++)n.push(this.getPoint(i/t));return n}getSpacedPoints(t=5){let n=[];for(let i=0;i<=t;i++)n.push(this.getPointAt(i/t));return n}getLength(){let t=this.getLengths();return t[t.length-1]}getLengths(t=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===t+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;let n=[],i,r=this.getPoint(0),s=0;n.push(0);for(let o=1;o<=t;o++)i=this.getPoint(o/t),s+=i.distanceTo(r),n.push(s),r=i;return this.cacheArcLengths=n,n}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(t,n=null){let i=this.getLengths(),r=0,s=i.length,o;n?o=n:o=t*i[s-1];let a=0,c=s-1,l;for(;a<=c;)if(r=Math.floor(a+(c-a)/2),l=i[r]-o,l<0)a=r+1;else if(l>0)c=r-1;else{c=r;break}if(r=c,i[r]===o)return r/(s-1);let u=i[r],f=i[r+1]-u,d=(o-u)/f;return(r+d)/(s-1)}getTangent(t,n){let r=t-1e-4,s=t+1e-4;r<0&&(r=0),s>1&&(s=1);let o=this.getPoint(r),a=this.getPoint(s),c=n||(o.isVector2?new et:new I);return c.copy(a).sub(o).normalize(),c}getTangentAt(t,n){let i=this.getUtoTmapping(t);return this.getTangent(i,n)}computeFrenetFrames(t,n=!1){let i=new I,r=[],s=[],o=[],a=new I,c=new Vt;for(let d=0;d<=t;d++){let m=d/t;r[d]=this.getTangentAt(m,new I)}s[0]=new I,o[0]=new I;let l=Number.MAX_VALUE,u=Math.abs(r[0].x),h=Math.abs(r[0].y),f=Math.abs(r[0].z);u<=l&&(l=u,i.set(1,0,0)),h<=l&&(l=h,i.set(0,1,0)),f<=l&&i.set(0,0,1),a.crossVectors(r[0],i).normalize(),s[0].crossVectors(r[0],a),o[0].crossVectors(r[0],s[0]);for(let d=1;d<=t;d++){if(s[d]=s[d-1].clone(),o[d]=o[d-1].clone(),a.crossVectors(r[d-1],r[d]),a.length()>Number.EPSILON){a.normalize();let m=Math.acos(Kt(r[d-1].dot(r[d]),-1,1));s[d].applyMatrix4(c.makeRotationAxis(a,m))}o[d].crossVectors(r[d],s[d])}if(n===!0){let d=Math.acos(Kt(s[0].dot(s[t]),-1,1));d/=t,r[0].dot(a.crossVectors(s[0],s[t]))>0&&(d=-d);for(let m=1;m<=t;m++)s[m].applyMatrix4(c.makeRotationAxis(r[m],d*m)),o[m].crossVectors(r[m],s[m])}return{tangents:r,normals:s,binormals:o}}clone(){return new this.constructor().copy(this)}copy(t){return this.arcLengthDivisions=t.arcLengthDivisions,this}toJSON(){let t={metadata:{version:4.7,type:"Curve",generator:"Curve.toJSON"}};return t.arcLengthDivisions=this.arcLengthDivisions,t.type=this.type,t}fromJSON(t){return this.arcLengthDivisions=t.arcLengthDivisions,this}},hi=class extends Nn{constructor(t=0,n=0,i=1,r=1,s=0,o=Math.PI*2,a=!1,c=0){super(),this.isEllipseCurve=!0,this.type="EllipseCurve",this.aX=t,this.aY=n,this.xRadius=i,this.yRadius=r,this.aStartAngle=s,this.aEndAngle=o,this.aClockwise=a,this.aRotation=c}getPoint(t,n=new et){let i=n,r=Math.PI*2,s=this.aEndAngle-this.aStartAngle,o=Math.abs(s)<Number.EPSILON;for(;s<0;)s+=r;for(;s>r;)s-=r;s<Number.EPSILON&&(o?s=0:s=r),this.aClockwise===!0&&!o&&(s===r?s=-r:s=s-r);let a=this.aStartAngle+t*s,c=this.aX+this.xRadius*Math.cos(a),l=this.aY+this.yRadius*Math.sin(a);if(this.aRotation!==0){let u=Math.cos(this.aRotation),h=Math.sin(this.aRotation),f=c-this.aX,d=l-this.aY;c=f*u-d*h+this.aX,l=f*h+d*u+this.aY}return i.set(c,l)}copy(t){return super.copy(t),this.aX=t.aX,this.aY=t.aY,this.xRadius=t.xRadius,this.yRadius=t.yRadius,this.aStartAngle=t.aStartAngle,this.aEndAngle=t.aEndAngle,this.aClockwise=t.aClockwise,this.aRotation=t.aRotation,this}toJSON(){let t=super.toJSON();return t.aX=this.aX,t.aY=this.aY,t.xRadius=this.xRadius,t.yRadius=this.yRadius,t.aStartAngle=this.aStartAngle,t.aEndAngle=this.aEndAngle,t.aClockwise=this.aClockwise,t.aRotation=this.aRotation,t}fromJSON(t){return super.fromJSON(t),this.aX=t.aX,this.aY=t.aY,this.xRadius=t.xRadius,this.yRadius=t.yRadius,this.aStartAngle=t.aStartAngle,this.aEndAngle=t.aEndAngle,this.aClockwise=t.aClockwise,this.aRotation=t.aRotation,this}},Dc=class extends hi{constructor(t,n,i,r,s,o){super(t,n,i,i,r,s,o),this.isArcCurve=!0,this.type="ArcCurve"}};function wf(){let e=0,t=0,n=0,i=0;function r(s,o,a,c){e=s,t=a,n=-3*s+3*o-2*a-c,i=2*s-2*o+a+c}return{initCatmullRom:function(s,o,a,c,l){r(o,a,l*(a-s),l*(c-o))},initNonuniformCatmullRom:function(s,o,a,c,l,u,h){let f=(o-s)/l-(a-s)/(l+u)+(a-o)/u,d=(a-o)/u-(c-o)/(u+h)+(c-a)/h;f*=u,d*=u,r(o,a,f,d)},calc:function(s){let o=s*s,a=o*s;return e+t*s+n*o+i*a}}}var dc=new I,ju=new wf,qu=new wf,Xu=new wf,Lc=class extends Nn{constructor(t=[],n=!1,i="centripetal",r=.5){super(),this.isCatmullRomCurve3=!0,this.type="CatmullRomCurve3",this.points=t,this.closed=n,this.curveType=i,this.tension=r}getPoint(t,n=new I){let i=n,r=this.points,s=r.length,o=(s-(this.closed?0:1))*t,a=Math.floor(o),c=o-a;this.closed?a+=a>0?0:(Math.floor(Math.abs(a)/s)+1)*s:c===0&&a===s-1&&(a=s-2,c=1);let l,u;this.closed||a>0?l=r[(a-1)%s]:(dc.subVectors(r[0],r[1]).add(r[0]),l=dc);let h=r[a%s],f=r[(a+1)%s];if(this.closed||a+2<s?u=r[(a+2)%s]:(dc.subVectors(r[s-1],r[s-2]).add(r[s-1]),u=dc),this.curveType==="centripetal"||this.curveType==="chordal"){let d=this.curveType==="chordal"?.5:.25,m=Math.pow(l.distanceToSquared(h),d),_=Math.pow(h.distanceToSquared(f),d),g=Math.pow(f.distanceToSquared(u),d);_<1e-4&&(_=1),m<1e-4&&(m=_),g<1e-4&&(g=_),ju.initNonuniformCatmullRom(l.x,h.x,f.x,u.x,m,_,g),qu.initNonuniformCatmullRom(l.y,h.y,f.y,u.y,m,_,g),Xu.initNonuniformCatmullRom(l.z,h.z,f.z,u.z,m,_,g)}else this.curveType==="catmullrom"&&(ju.initCatmullRom(l.x,h.x,f.x,u.x,this.tension),qu.initCatmullRom(l.y,h.y,f.y,u.y,this.tension),Xu.initCatmullRom(l.z,h.z,f.z,u.z,this.tension));return i.set(ju.calc(c),qu.calc(c),Xu.calc(c)),i}copy(t){super.copy(t),this.points=[];for(let n=0,i=t.points.length;n<i;n++){let r=t.points[n];this.points.push(r.clone())}return this.closed=t.closed,this.curveType=t.curveType,this.tension=t.tension,this}toJSON(){let t=super.toJSON();t.points=[];for(let n=0,i=this.points.length;n<i;n++){let r=this.points[n];t.points.push(r.toArray())}return t.closed=this.closed,t.curveType=this.curveType,t.tension=this.tension,t}fromJSON(t){super.fromJSON(t),this.points=[];for(let n=0,i=t.points.length;n<i;n++){let r=t.points[n];this.points.push(new I().fromArray(r))}return this.closed=t.closed,this.curveType=t.curveType,this.tension=t.tension,this}};function fm(e,t,n,i,r){let s=(i-t)*.5,o=(r-n)*.5,a=e*e,c=e*a;return(2*n-2*i+s+o)*c+(-3*n+3*i-2*s-o)*a+s*e+n}function Tb(e,t){let n=1-e;return n*n*t}function Ab(e,t){return 2*(1-e)*e*t}function Cb(e,t){return e*e*t}function bo(e,t,n,i){return Tb(e,t)+Ab(e,n)+Cb(e,i)}function Rb(e,t){let n=1-e;return n*n*n*t}function Pb(e,t){let n=1-e;return 3*n*n*e*t}function Ib(e,t){return 3*(1-e)*e*e*t}function Db(e,t){return e*e*e*t}function Mo(e,t,n,i,r){return Rb(e,t)+Pb(e,n)+Ib(e,i)+Db(e,r)}var Oc=class extends Nn{constructor(t=new et,n=new et,i=new et,r=new et){super(),this.isCubicBezierCurve=!0,this.type="CubicBezierCurve",this.v0=t,this.v1=n,this.v2=i,this.v3=r}getPoint(t,n=new et){let i=n,r=this.v0,s=this.v1,o=this.v2,a=this.v3;return i.set(Mo(t,r.x,s.x,o.x,a.x),Mo(t,r.y,s.y,o.y,a.y)),i}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this.v3.copy(t.v3),this}toJSON(){let t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t.v3=this.v3.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this.v3.fromArray(t.v3),this}},As=class extends Nn{constructor(t=new I,n=new I,i=new I,r=new I){super(),this.isCubicBezierCurve3=!0,this.type="CubicBezierCurve3",this.v0=t,this.v1=n,this.v2=i,this.v3=r}getPoint(t,n=new I){let i=n,r=this.v0,s=this.v1,o=this.v2,a=this.v3;return i.set(Mo(t,r.x,s.x,o.x,a.x),Mo(t,r.y,s.y,o.y,a.y),Mo(t,r.z,s.z,o.z,a.z)),i}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this.v3.copy(t.v3),this}toJSON(){let t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t.v3=this.v3.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this.v3.fromArray(t.v3),this}},Nc=class extends Nn{constructor(t=new et,n=new et){super(),this.isLineCurve=!0,this.type="LineCurve",this.v1=t,this.v2=n}getPoint(t,n=new et){let i=n;return t===1?i.copy(this.v2):(i.copy(this.v2).sub(this.v1),i.multiplyScalar(t).add(this.v1)),i}getPointAt(t,n){return this.getPoint(t,n)}getTangent(t,n=new et){return n.subVectors(this.v2,this.v1).normalize()}getTangentAt(t,n){return this.getTangent(t,n)}copy(t){return super.copy(t),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){let t=super.toJSON();return t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}},Fc=class extends Nn{constructor(t=new I,n=new I){super(),this.isLineCurve3=!0,this.type="LineCurve3",this.v1=t,this.v2=n}getPoint(t,n=new I){let i=n;return t===1?i.copy(this.v2):(i.copy(this.v2).sub(this.v1),i.multiplyScalar(t).add(this.v1)),i}getPointAt(t,n){return this.getPoint(t,n)}getTangent(t,n=new I){return n.subVectors(this.v2,this.v1).normalize()}getTangentAt(t,n){return this.getTangent(t,n)}copy(t){return super.copy(t),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){let t=super.toJSON();return t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}},Uc=class extends Nn{constructor(t=new et,n=new et,i=new et){super(),this.isQuadraticBezierCurve=!0,this.type="QuadraticBezierCurve",this.v0=t,this.v1=n,this.v2=i}getPoint(t,n=new et){let i=n,r=this.v0,s=this.v1,o=this.v2;return i.set(bo(t,r.x,s.x,o.x),bo(t,r.y,s.y,o.y)),i}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){let t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}},Tr=class extends Nn{constructor(t=new I,n=new I,i=new I){super(),this.isQuadraticBezierCurve3=!0,this.type="QuadraticBezierCurve3",this.v0=t,this.v1=n,this.v2=i}getPoint(t,n=new I){let i=n,r=this.v0,s=this.v1,o=this.v2;return i.set(bo(t,r.x,s.x,o.x),bo(t,r.y,s.y,o.y),bo(t,r.z,s.z,o.z)),i}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){let t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}},zc=class extends Nn{constructor(t=[]){super(),this.isSplineCurve=!0,this.type="SplineCurve",this.points=t}getPoint(t,n=new et){let i=n,r=this.points,s=(r.length-1)*t,o=Math.floor(s),a=s-o,c=r[o===0?o:o-1],l=r[o],u=r[o>r.length-2?r.length-1:o+1],h=r[o>r.length-3?r.length-1:o+2];return i.set(fm(a,c.x,l.x,u.x,h.x),fm(a,c.y,l.y,u.y,h.y)),i}copy(t){super.copy(t),this.points=[];for(let n=0,i=t.points.length;n<i;n++){let r=t.points[n];this.points.push(r.clone())}return this}toJSON(){let t=super.toJSON();t.points=[];for(let n=0,i=this.points.length;n<i;n++){let r=this.points[n];t.points.push(r.toArray())}return t}fromJSON(t){super.fromJSON(t),this.points=[];for(let n=0,i=t.points.length;n<i;n++){let r=t.points[n];this.points.push(new et().fromArray(r))}return this}},Lb=Object.freeze({__proto__:null,ArcCurve:Dc,CatmullRomCurve3:Lc,CubicBezierCurve:Oc,CubicBezierCurve3:As,EllipseCurve:hi,LineCurve:Nc,LineCurve3:Fc,QuadraticBezierCurve:Uc,QuadraticBezierCurve3:Tr,SplineCurve:zc});var ko=class e extends ve{constructor(t=1,n=1,i=1,r=1){super(),this.type="PlaneGeometry",this.parameters={width:t,height:n,widthSegments:i,heightSegments:r};let s=t/2,o=n/2,a=Math.floor(i),c=Math.floor(r),l=a+1,u=c+1,h=t/a,f=n/c,d=[],m=[],_=[],g=[];for(let p=0;p<u;p++){let b=p*f-o;for(let x=0;x<l;x++){let v=x*h-s;m.push(v,-b,0),_.push(0,0,1),g.push(x/a),g.push(1-p/c)}}for(let p=0;p<c;p++)for(let b=0;b<a;b++){let x=b+l*p,v=b+l*(p+1),M=b+1+l*(p+1),S=b+1+l*p;d.push(x,v,S),d.push(v,M,S)}this.setIndex(d),this.setAttribute("position",new ce(m,3)),this.setAttribute("normal",new ce(_,3)),this.setAttribute("uv",new ce(g,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new e(t.width,t.height,t.widthSegments,t.heightSegments)}};var Pi=class e extends ve{constructor(t=1,n=32,i=16,r=0,s=Math.PI*2,o=0,a=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:t,widthSegments:n,heightSegments:i,phiStart:r,phiLength:s,thetaStart:o,thetaLength:a},n=Math.max(3,Math.floor(n)),i=Math.max(2,Math.floor(i));let c=Math.min(o+a,Math.PI),l=0,u=[],h=new I,f=new I,d=[],m=[],_=[],g=[];for(let p=0;p<=i;p++){let b=[],x=p/i,v=0;p===0&&o===0?v=.5/n:p===i&&c===Math.PI&&(v=-.5/n);for(let M=0;M<=n;M++){let S=M/n;h.x=-t*Math.cos(r+S*s)*Math.sin(o+x*a),h.y=t*Math.cos(o+x*a),h.z=t*Math.sin(r+S*s)*Math.sin(o+x*a),m.push(h.x,h.y,h.z),f.copy(h).normalize(),_.push(f.x,f.y,f.z),g.push(S+v,1-x),b.push(l++)}u.push(b)}for(let p=0;p<i;p++)for(let b=0;b<n;b++){let x=u[p][b+1],v=u[p][b],M=u[p+1][b],S=u[p+1][b+1];(p!==0||o>0)&&d.push(x,v,S),(p!==i-1||c<Math.PI)&&d.push(v,M,S)}this.setIndex(d),this.setAttribute("position",new ce(m,3)),this.setAttribute("normal",new ce(_,3)),this.setAttribute("uv",new ce(g,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new e(t.radius,t.widthSegments,t.heightSegments,t.phiStart,t.phiLength,t.thetaStart,t.thetaLength)}};var Bo=class e extends ve{constructor(t=1,n=.4,i=12,r=48,s=Math.PI*2){super(),this.type="TorusGeometry",this.parameters={radius:t,tube:n,radialSegments:i,tubularSegments:r,arc:s},i=Math.floor(i),r=Math.floor(r);let o=[],a=[],c=[],l=[],u=new I,h=new I,f=new I;for(let d=0;d<=i;d++)for(let m=0;m<=r;m++){let _=m/r*s,g=d/i*Math.PI*2;h.x=(t+n*Math.cos(g))*Math.cos(_),h.y=(t+n*Math.cos(g))*Math.sin(_),h.z=n*Math.sin(g),a.push(h.x,h.y,h.z),u.x=t*Math.cos(_),u.y=t*Math.sin(_),f.subVectors(h,u).normalize(),c.push(f.x,f.y,f.z),l.push(m/r),l.push(d/i)}for(let d=1;d<=i;d++)for(let m=1;m<=r;m++){let _=(r+1)*d+m-1,g=(r+1)*(d-1)+m-1,p=(r+1)*(d-1)+m,b=(r+1)*d+m;o.push(_,g,b),o.push(g,p,b)}this.setIndex(o),this.setAttribute("position",new ce(a,3)),this.setAttribute("normal",new ce(c,3)),this.setAttribute("uv",new ce(l,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new e(t.radius,t.tube,t.radialSegments,t.tubularSegments,t.arc)}};var Vo=class e extends ve{constructor(t=new Tr(new I(-1,-1,0),new I(-1,1,0),new I(1,1,0)),n=64,i=1,r=8,s=!1){super(),this.type="TubeGeometry",this.parameters={path:t,tubularSegments:n,radius:i,radialSegments:r,closed:s};let o=t.computeFrenetFrames(n,s);this.tangents=o.tangents,this.normals=o.normals,this.binormals=o.binormals;let a=new I,c=new I,l=new et,u=new I,h=[],f=[],d=[],m=[];_(),this.setIndex(m),this.setAttribute("position",new ce(h,3)),this.setAttribute("normal",new ce(f,3)),this.setAttribute("uv",new ce(d,2));function _(){for(let x=0;x<n;x++)g(x);g(s===!1?n:0),b(),p()}function g(x){u=t.getPointAt(x/n,u);let v=o.normals[x],M=o.binormals[x];for(let S=0;S<=r;S++){let C=S/r*Math.PI*2,P=Math.sin(C),T=-Math.cos(C);c.x=T*v.x+P*M.x,c.y=T*v.y+P*M.y,c.z=T*v.z+P*M.z,c.normalize(),f.push(c.x,c.y,c.z),a.x=u.x+i*c.x,a.y=u.y+i*c.y,a.z=u.z+i*c.z,h.push(a.x,a.y,a.z)}}function p(){for(let x=1;x<=n;x++)for(let v=1;v<=r;v++){let M=(r+1)*(x-1)+(v-1),S=(r+1)*x+(v-1),C=(r+1)*x+v,P=(r+1)*(x-1)+v;m.push(M,S,P),m.push(S,C,P)}}function b(){for(let x=0;x<=n;x++)for(let v=0;v<=r;v++)l.x=x/n,l.y=v/r,d.push(l.x,l.y)}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}toJSON(){let t=super.toJSON();return t.path=this.parameters.path.toJSON(),t}static fromJSON(t){return new e(new Lb[t.path.type]().fromJSON(t.path),t.tubularSegments,t.radius,t.radialSegments,t.closed)}};var Ho=class extends Le{constructor(t){super(t),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}},Go=class extends On{constructor(t){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new Ot(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Ot(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Zl,this.normalScale=new et(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Ln,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.defines={STANDARD:""},this.color.copy(t.color),this.roughness=t.roughness,this.metalness=t.metalness,this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.emissive.copy(t.emissive),this.emissiveMap=t.emissiveMap,this.emissiveIntensity=t.emissiveIntensity,this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.roughnessMap=t.roughnessMap,this.metalnessMap=t.metalnessMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.envMapIntensity=t.envMapIntensity,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.flatShading=t.flatShading,this.fog=t.fog,this}};var Wo=class extends On{constructor(t){super(),this.isMeshLambertMaterial=!0,this.type="MeshLambertMaterial",this.color=new Ot(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Ot(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Zl,this.normalScale=new et(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Ln,this.combine=sl,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.emissive.copy(t.emissive),this.emissiveMap=t.emissiveMap,this.emissiveIntensity=t.emissiveIntensity,this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.combine=t.combine,this.reflectivity=t.reflectivity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.flatShading=t.flatShading,this.fog=t.fog,this}},kc=class extends On{constructor(t){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=Hm,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(t)}copy(t){return super.copy(t),this.depthPacking=t.depthPacking,this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this}},Bc=class extends On{constructor(t){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(t)}copy(t){return super.copy(t),this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this}};function pc(e,t){return!e||e.constructor===t?e:typeof t.BYTES_PER_ELEMENT=="number"?new t(e):Array.prototype.slice.call(e)}function Ob(e){return ArrayBuffer.isView(e)&&!(e instanceof DataView)}var Ar=class{constructor(t,n,i,r){this.parameterPositions=t,this._cachedIndex=0,this.resultBuffer=r!==void 0?r:new n.constructor(i),this.sampleValues=n,this.valueSize=i,this.settings=null,this.DefaultSettings_={}}evaluate(t){let n=this.parameterPositions,i=this._cachedIndex,r=n[i],s=n[i-1];t:{e:{let o;n:{i:if(!(t<r)){for(let a=i+2;;){if(r===void 0){if(t<s)break i;return i=n.length,this._cachedIndex=i,this.copySampleValue_(i-1)}if(i===a)break;if(s=r,r=n[++i],t<r)break e}o=n.length;break n}if(!(t>=s)){let a=n[1];t<a&&(i=2,s=a);for(let c=i-2;;){if(s===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(i===c)break;if(r=s,s=n[--i-1],t>=s)break e}o=i,i=0;break n}break t}for(;i<o;){let a=i+o>>>1;t<n[a]?o=a:i=a+1}if(r=n[i],s=n[i-1],s===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(r===void 0)return i=n.length,this._cachedIndex=i,this.copySampleValue_(i-1)}this._cachedIndex=i,this.intervalChanged_(i,s,r)}return this.interpolate_(i,s,t,r)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(t){let n=this.resultBuffer,i=this.sampleValues,r=this.valueSize,s=t*r;for(let o=0;o!==r;++o)n[o]=i[s+o];return n}interpolate_(){throw new Error("call to abstract method")}intervalChanged_(){}},Vc=class extends Ar{constructor(t,n,i,r){super(t,n,i,r),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:Zu,endingEnd:Zu}}intervalChanged_(t,n,i){let r=this.parameterPositions,s=t-2,o=t+1,a=r[s],c=r[o];if(a===void 0)switch(this.getSettings_().endingStart){case Ku:s=t,a=2*n-i;break;case Ju:s=r.length-2,a=n+r[s]-r[s+1];break;default:s=t,a=i}if(c===void 0)switch(this.getSettings_().endingEnd){case Ku:o=t,c=2*i-n;break;case Ju:o=1,c=i+r[1]-r[0];break;default:o=t-1,c=n}let l=(i-n)*.5,u=this.valueSize;this._weightPrev=l/(n-a),this._weightNext=l/(c-i),this._offsetPrev=s*u,this._offsetNext=o*u}interpolate_(t,n,i,r){let s=this.resultBuffer,o=this.sampleValues,a=this.valueSize,c=t*a,l=c-a,u=this._offsetPrev,h=this._offsetNext,f=this._weightPrev,d=this._weightNext,m=(i-n)/(r-n),_=m*m,g=_*m,p=-f*g+2*f*_-f*m,b=(1+f)*g+(-1.5-2*f)*_+(-.5+f)*m+1,x=(-1-d)*g+(1.5+d)*_+.5*m,v=d*g-d*_;for(let M=0;M!==a;++M)s[M]=p*o[u+M]+b*o[l+M]+x*o[c+M]+v*o[h+M];return s}},Hc=class extends Ar{constructor(t,n,i,r){super(t,n,i,r)}interpolate_(t,n,i,r){let s=this.resultBuffer,o=this.sampleValues,a=this.valueSize,c=t*a,l=c-a,u=(i-n)/(r-n),h=1-u;for(let f=0;f!==a;++f)s[f]=o[l+f]*h+o[c+f]*u;return s}},Gc=class extends Ar{constructor(t,n,i,r){super(t,n,i,r)}interpolate_(t){return this.copySampleValue_(t-1)}},Mn=class{constructor(t,n,i,r){if(t===void 0)throw new Error("THREE.KeyframeTrack: track name is undefined");if(n===void 0||n.length===0)throw new Error("THREE.KeyframeTrack: no keyframes in track named "+t);this.name=t,this.times=pc(n,this.TimeBufferType),this.values=pc(i,this.ValueBufferType),this.setInterpolation(r||this.DefaultInterpolation)}static toJSON(t){let n=t.constructor,i;if(n.toJSON!==this.toJSON)i=n.toJSON(t);else{i={name:t.name,times:pc(t.times,Array),values:pc(t.values,Array)};let r=t.getInterpolation();r!==t.DefaultInterpolation&&(i.interpolation=r)}return i.type=t.ValueTypeName,i}InterpolantFactoryMethodDiscrete(t){return new Gc(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodLinear(t){return new Hc(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodSmooth(t){return new Vc(this.times,this.values,this.getValueSize(),t)}setInterpolation(t){let n;switch(t){case So:n=this.InterpolantFactoryMethodDiscrete;break;case bc:n=this.InterpolantFactoryMethodLinear;break;case mc:n=this.InterpolantFactoryMethodSmooth;break}if(n===void 0){let i="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(t!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw new Error(i);return console.warn("THREE.KeyframeTrack:",i),this}return this.createInterpolant=n,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return So;case this.InterpolantFactoryMethodLinear:return bc;case this.InterpolantFactoryMethodSmooth:return mc}}getValueSize(){return this.values.length/this.times.length}shift(t){if(t!==0){let n=this.times;for(let i=0,r=n.length;i!==r;++i)n[i]+=t}return this}scale(t){if(t!==1){let n=this.times;for(let i=0,r=n.length;i!==r;++i)n[i]*=t}return this}trim(t,n){let i=this.times,r=i.length,s=0,o=r-1;for(;s!==r&&i[s]<t;)++s;for(;o!==-1&&i[o]>n;)--o;if(++o,s!==0||o!==r){s>=o&&(o=Math.max(o,1),s=o-1);let a=this.getValueSize();this.times=i.slice(s,o),this.values=this.values.slice(s*a,o*a)}return this}validate(){let t=!0,n=this.getValueSize();n-Math.floor(n)!==0&&(console.error("THREE.KeyframeTrack: Invalid value size in track.",this),t=!1);let i=this.times,r=this.values,s=i.length;s===0&&(console.error("THREE.KeyframeTrack: Track is empty.",this),t=!1);let o=null;for(let a=0;a!==s;a++){let c=i[a];if(typeof c=="number"&&isNaN(c)){console.error("THREE.KeyframeTrack: Time is not a valid number.",this,a,c),t=!1;break}if(o!==null&&o>c){console.error("THREE.KeyframeTrack: Out of order keys.",this,a,c,o),t=!1;break}o=c}if(r!==void 0&&Ob(r))for(let a=0,c=r.length;a!==c;++a){let l=r[a];if(isNaN(l)){console.error("THREE.KeyframeTrack: Value is not a valid number.",this,a,l),t=!1;break}}return t}optimize(){let t=this.times.slice(),n=this.values.slice(),i=this.getValueSize(),r=this.getInterpolation()===mc,s=t.length-1,o=1;for(let a=1;a<s;++a){let c=!1,l=t[a],u=t[a+1];if(l!==u&&(a!==1||l!==t[0]))if(r)c=!0;else{let h=a*i,f=h-i,d=h+i;for(let m=0;m!==i;++m){let _=n[h+m];if(_!==n[f+m]||_!==n[d+m]){c=!0;break}}}if(c){if(a!==o){t[o]=t[a];let h=a*i,f=o*i;for(let d=0;d!==i;++d)n[f+d]=n[h+d]}++o}}if(s>0){t[o]=t[s];for(let a=s*i,c=o*i,l=0;l!==i;++l)n[c+l]=n[a+l];++o}return o!==t.length?(this.times=t.slice(0,o),this.values=n.slice(0,o*i)):(this.times=t,this.values=n),this}clone(){let t=this.times.slice(),n=this.values.slice(),i=this.constructor,r=new i(this.name,t,n);return r.createInterpolant=this.createInterpolant,r}};Mn.prototype.ValueTypeName="";Mn.prototype.TimeBufferType=Float32Array;Mn.prototype.ValueBufferType=Float32Array;Mn.prototype.DefaultInterpolation=bc;var $i=class extends Mn{constructor(t,n,i){super(t,n,i)}};$i.prototype.ValueTypeName="bool";$i.prototype.ValueBufferType=Array;$i.prototype.DefaultInterpolation=So;$i.prototype.InterpolantFactoryMethodLinear=void 0;$i.prototype.InterpolantFactoryMethodSmooth=void 0;var Wc=class extends Mn{constructor(t,n,i,r){super(t,n,i,r)}};Wc.prototype.ValueTypeName="color";var jc=class extends Mn{constructor(t,n,i,r){super(t,n,i,r)}};jc.prototype.ValueTypeName="number";var qc=class extends Ar{constructor(t,n,i,r){super(t,n,i,r)}interpolate_(t,n,i,r){let s=this.resultBuffer,o=this.sampleValues,a=this.valueSize,c=(i-n)/(r-n),l=t*a;for(let u=l+a;l!==u;l+=4)Ne.slerpFlat(s,0,o,l-a,o,l,c);return s}},jo=class extends Mn{constructor(t,n,i,r){super(t,n,i,r)}InterpolantFactoryMethodLinear(t){return new qc(this.times,this.values,this.getValueSize(),t)}};jo.prototype.ValueTypeName="quaternion";jo.prototype.InterpolantFactoryMethodSmooth=void 0;var Yi=class extends Mn{constructor(t,n,i){super(t,n,i)}};Yi.prototype.ValueTypeName="string";Yi.prototype.ValueBufferType=Array;Yi.prototype.DefaultInterpolation=So;Yi.prototype.InterpolantFactoryMethodLinear=void 0;Yi.prototype.InterpolantFactoryMethodSmooth=void 0;var Xc=class extends Mn{constructor(t,n,i,r){super(t,n,i,r)}};Xc.prototype.ValueTypeName="vector";var gc={enabled:!1,files:{},add:function(e,t){this.enabled!==!1&&(this.files[e]=t)},get:function(e){if(this.enabled!==!1)return this.files[e]},remove:function(e){delete this.files[e]},clear:function(){this.files={}}},$c=class{constructor(t,n,i){let r=this,s=!1,o=0,a=0,c,l=[];this.onStart=void 0,this.onLoad=t,this.onProgress=n,this.onError=i,this.abortController=new AbortController,this.itemStart=function(u){a++,s===!1&&r.onStart!==void 0&&r.onStart(u,o,a),s=!0},this.itemEnd=function(u){o++,r.onProgress!==void 0&&r.onProgress(u,o,a),o===a&&(s=!1,r.onLoad!==void 0&&r.onLoad())},this.itemError=function(u){r.onError!==void 0&&r.onError(u)},this.resolveURL=function(u){return c?c(u):u},this.setURLModifier=function(u){return c=u,this},this.addHandler=function(u,h){return l.push(u,h),this},this.removeHandler=function(u){let h=l.indexOf(u);return h!==-1&&l.splice(h,2),this},this.getHandler=function(u){for(let h=0,f=l.length;h<f;h+=2){let d=l[h],m=l[h+1];if(d.global&&(d.lastIndex=0),d.test(u))return m}return null},this.abort=function(){return this.abortController.abort(),this.abortController=new AbortController,this}}},ng=new $c,Cs=class{constructor(t){this.manager=t!==void 0?t:ng,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={}}load(){}loadAsync(t,n){let i=this;return new Promise(function(r,s){i.load(t,r,n,s)})}parse(){}setCrossOrigin(t){return this.crossOrigin=t,this}setWithCredentials(t){return this.withCredentials=t,this}setPath(t){return this.path=t,this}setResourcePath(t){return this.resourcePath=t,this}setRequestHeader(t){return this.requestHeader=t,this}abort(){return this}};Cs.DEFAULT_MATERIAL_NAME="__DEFAULT";var ps=new WeakMap,Yc=class extends Cs{constructor(t){super(t)}load(t,n,i,r){this.path!==void 0&&(t=this.path+t),t=this.manager.resolveURL(t);let s=this,o=gc.get(`image:${t}`);if(o!==void 0){if(o.complete===!0)s.manager.itemStart(t),setTimeout(function(){n&&n(o),s.manager.itemEnd(t)},0);else{let h=ps.get(o);h===void 0&&(h=[],ps.set(o,h)),h.push({onLoad:n,onError:r})}return o}let a=vs("img");function c(){u(),n&&n(this);let h=ps.get(this)||[];for(let f=0;f<h.length;f++){let d=h[f];d.onLoad&&d.onLoad(this)}ps.delete(this),s.manager.itemEnd(t)}function l(h){u(),r&&r(h),gc.remove(`image:${t}`);let f=ps.get(this)||[];for(let d=0;d<f.length;d++){let m=f[d];m.onError&&m.onError(h)}ps.delete(this),s.manager.itemError(t),s.manager.itemEnd(t)}function u(){a.removeEventListener("load",c,!1),a.removeEventListener("error",l,!1)}return a.addEventListener("load",c,!1),a.addEventListener("error",l,!1),t.slice(0,5)!=="data:"&&this.crossOrigin!==void 0&&(a.crossOrigin=this.crossOrigin),gc.add(`image:${t}`,a),s.manager.itemStart(t),a.src=t,a}};var qo=class extends Cs{constructor(t){super(t)}load(t,n,i,r){let s=new sn,o=new Yc(this.manager);return o.setCrossOrigin(this.crossOrigin),o.setPath(this.path),o.load(t,function(a){s.image=a,s.needsUpdate=!0,n!==void 0&&n(s)},i,r),s}},Rs=class extends Be{constructor(t,n=1){super(),this.isLight=!0,this.type="Light",this.color=new Ot(t),this.intensity=n}dispose(){}copy(t,n){return super.copy(t,n),this.color.copy(t.color),this.intensity=t.intensity,this}toJSON(t){let n=super.toJSON(t);return n.object.color=this.color.getHex(),n.object.intensity=this.intensity,this.groundColor!==void 0&&(n.object.groundColor=this.groundColor.getHex()),this.distance!==void 0&&(n.object.distance=this.distance),this.angle!==void 0&&(n.object.angle=this.angle),this.decay!==void 0&&(n.object.decay=this.decay),this.penumbra!==void 0&&(n.object.penumbra=this.penumbra),this.shadow!==void 0&&(n.object.shadow=this.shadow.toJSON()),this.target!==void 0&&(n.object.target=this.target.uuid),n}};var $u=new Vt,dm=new I,pm=new I,Zc=class{constructor(t){this.camera=t,this.intensity=1,this.bias=0,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new et(512,512),this.mapType=Jn,this.map=null,this.mapPass=null,this.matrix=new Vt,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new ws,this._frameExtents=new et(1,1),this._viewportCount=1,this._viewports=[new de(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(t){let n=this.camera,i=this.matrix;dm.setFromMatrixPosition(t.matrixWorld),n.position.copy(dm),pm.setFromMatrixPosition(t.target.matrixWorld),n.lookAt(pm),n.updateMatrixWorld(),$u.multiplyMatrices(n.projectionMatrix,n.matrixWorldInverse),this._frustum.setFromProjectionMatrix($u,n.coordinateSystem,n.reversedDepth),n.reversedDepth?i.set(.5,0,0,.5,0,.5,0,.5,0,0,1,0,0,0,0,1):i.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),i.multiply($u)}getViewport(t){return this._viewports[t]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(t){return this.camera=t.camera.clone(),this.intensity=t.intensity,this.bias=t.bias,this.radius=t.radius,this.autoUpdate=t.autoUpdate,this.needsUpdate=t.needsUpdate,this.normalBias=t.normalBias,this.blurSamples=t.blurSamples,this.mapSize.copy(t.mapSize),this}clone(){return new this.constructor().copy(this)}toJSON(){let t={};return this.intensity!==1&&(t.intensity=this.intensity),this.bias!==0&&(t.bias=this.bias),this.normalBias!==0&&(t.normalBias=this.normalBias),this.radius!==1&&(t.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(t.mapSize=this.mapSize.toArray()),t.camera=this.camera.toJSON(!1).object,delete t.camera.matrix,t}};var mm=new Vt,vo=new I,Yu=new I,ef=class extends Zc{constructor(){super(new Ge(90,1,.5,500)),this.isPointLightShadow=!0,this._frameExtents=new et(4,2),this._viewportCount=6,this._viewports=[new de(2,1,1,1),new de(0,1,1,1),new de(3,1,1,1),new de(1,1,1,1),new de(3,0,1,1),new de(1,0,1,1)],this._cubeDirections=[new I(1,0,0),new I(-1,0,0),new I(0,0,1),new I(0,0,-1),new I(0,1,0),new I(0,-1,0)],this._cubeUps=[new I(0,1,0),new I(0,1,0),new I(0,1,0),new I(0,1,0),new I(0,0,1),new I(0,0,-1)]}updateMatrices(t,n=0){let i=this.camera,r=this.matrix,s=t.distance||i.far;s!==i.far&&(i.far=s,i.updateProjectionMatrix()),vo.setFromMatrixPosition(t.matrixWorld),i.position.copy(vo),Yu.copy(i.position),Yu.add(this._cubeDirections[n]),i.up.copy(this._cubeUps[n]),i.lookAt(Yu),i.updateMatrixWorld(),r.makeTranslation(-vo.x,-vo.y,-vo.z),mm.multiplyMatrices(i.projectionMatrix,i.matrixWorldInverse),this._frustum.setFromProjectionMatrix(mm,i.coordinateSystem,i.reversedDepth)}},Xo=class extends Rs{constructor(t,n,i=0,r=2){super(t,n),this.isPointLight=!0,this.type="PointLight",this.distance=i,this.decay=r,this.shadow=new ef}get power(){return this.intensity*4*Math.PI}set power(t){this.intensity=t/(4*Math.PI)}dispose(){this.shadow.dispose()}copy(t,n){return super.copy(t,n),this.distance=t.distance,this.decay=t.decay,this.shadow=t.shadow.clone(),this}},Cr=class extends Ro{constructor(t=-1,n=1,i=1,r=-1,s=.1,o=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=t,this.right=n,this.top=i,this.bottom=r,this.near=s,this.far=o,this.updateProjectionMatrix()}copy(t,n){return super.copy(t,n),this.left=t.left,this.right=t.right,this.top=t.top,this.bottom=t.bottom,this.near=t.near,this.far=t.far,this.zoom=t.zoom,this.view=t.view===null?null:Object.assign({},t.view),this}setViewOffset(t,n,i,r,s,o){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=n,this.view.offsetX=i,this.view.offsetY=r,this.view.width=s,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let t=(this.right-this.left)/(2*this.zoom),n=(this.top-this.bottom)/(2*this.zoom),i=(this.right+this.left)/2,r=(this.top+this.bottom)/2,s=i-t,o=i+t,a=r+n,c=r-n;if(this.view!==null&&this.view.enabled){let l=(this.right-this.left)/this.view.fullWidth/this.zoom,u=(this.top-this.bottom)/this.view.fullHeight/this.zoom;s+=l*this.view.offsetX,o=s+l*this.view.width,a-=u*this.view.offsetY,c=a-u*this.view.height}this.projectionMatrix.makeOrthographic(s,o,a,c,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){let n=super.toJSON(t);return n.object.zoom=this.zoom,n.object.left=this.left,n.object.right=this.right,n.object.top=this.top,n.object.bottom=this.bottom,n.object.near=this.near,n.object.far=this.far,this.view!==null&&(n.object.view=Object.assign({},this.view)),n}},nf=class extends Zc{constructor(){super(new Cr(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}},$o=class extends Rs{constructor(t,n){super(t,n),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(Be.DEFAULT_UP),this.updateMatrix(),this.target=new Be,this.shadow=new nf}dispose(){this.shadow.dispose()}copy(t){return super.copy(t),this.target=t.target.clone(),this.shadow=t.shadow.clone(),this}},Rr=class extends Rs{constructor(t,n){super(t,n),this.isAmbientLight=!0,this.type="AmbientLight"}};var Kc=class extends Ge{constructor(t=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=t}},Yo=class{constructor(t=!0){this.autoStart=t,this.startTime=0,this.oldTime=0,this.elapsedTime=0,this.running=!1}start(){this.startTime=performance.now(),this.oldTime=this.startTime,this.elapsedTime=0,this.running=!0}stop(){this.getElapsedTime(),this.running=!1,this.autoStart=!1}getElapsedTime(){return this.getDelta(),this.elapsedTime}getDelta(){let t=0;if(this.autoStart&&!this.running)return this.start(),0;if(this.running){let n=performance.now();t=(n-this.oldTime)/1e3,this.oldTime=n,this.elapsedTime+=t}return t}};var Ef="\\[\\]\\.:\\/",Nb=new RegExp("["+Ef+"]","g"),Tf="[^"+Ef+"]",Fb="[^"+Ef.replace("\\.","")+"]",Ub=/((?:WC+[\/:])*)/.source.replace("WC",Tf),zb=/(WCOD+)?/.source.replace("WCOD",Fb),kb=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",Tf),Bb=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",Tf),Vb=new RegExp("^"+Ub+zb+kb+Bb+"$"),Hb=["material","materials","bones","map"],rf=class{constructor(t,n,i){let r=i||Se.parseTrackName(n);this._targetGroup=t,this._bindings=t.subscribe_(n,r)}getValue(t,n){this.bind();let i=this._targetGroup.nCachedObjects_,r=this._bindings[i];r!==void 0&&r.getValue(t,n)}setValue(t,n){let i=this._bindings;for(let r=this._targetGroup.nCachedObjects_,s=i.length;r!==s;++r)i[r].setValue(t,n)}bind(){let t=this._bindings;for(let n=this._targetGroup.nCachedObjects_,i=t.length;n!==i;++n)t[n].bind()}unbind(){let t=this._bindings;for(let n=this._targetGroup.nCachedObjects_,i=t.length;n!==i;++n)t[n].unbind()}},Se=class e{constructor(t,n,i){this.path=n,this.parsedPath=i||e.parseTrackName(n),this.node=e.findNode(t,this.parsedPath.nodeName),this.rootNode=t,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(t,n,i){return t&&t.isAnimationObjectGroup?new e.Composite(t,n,i):new e(t,n,i)}static sanitizeNodeName(t){return t.replace(/\s/g,"_").replace(Nb,"")}static parseTrackName(t){let n=Vb.exec(t);if(n===null)throw new Error("PropertyBinding: Cannot parse trackName: "+t);let i={nodeName:n[2],objectName:n[3],objectIndex:n[4],propertyName:n[5],propertyIndex:n[6]},r=i.nodeName&&i.nodeName.lastIndexOf(".");if(r!==void 0&&r!==-1){let s=i.nodeName.substring(r+1);Hb.indexOf(s)!==-1&&(i.nodeName=i.nodeName.substring(0,r),i.objectName=s)}if(i.propertyName===null||i.propertyName.length===0)throw new Error("PropertyBinding: can not parse propertyName from trackName: "+t);return i}static findNode(t,n){if(n===void 0||n===""||n==="."||n===-1||n===t.name||n===t.uuid)return t;if(t.skeleton){let i=t.skeleton.getBoneByName(n);if(i!==void 0)return i}if(t.children){let i=function(s){for(let o=0;o<s.length;o++){let a=s[o];if(a.name===n||a.uuid===n)return a;let c=i(a.children);if(c)return c}return null},r=i(t.children);if(r)return r}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(t,n){t[n]=this.targetObject[this.propertyName]}_getValue_array(t,n){let i=this.resolvedProperty;for(let r=0,s=i.length;r!==s;++r)t[n++]=i[r]}_getValue_arrayElement(t,n){t[n]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(t,n){this.resolvedProperty.toArray(t,n)}_setValue_direct(t,n){this.targetObject[this.propertyName]=t[n]}_setValue_direct_setNeedsUpdate(t,n){this.targetObject[this.propertyName]=t[n],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(t,n){this.targetObject[this.propertyName]=t[n],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(t,n){let i=this.resolvedProperty;for(let r=0,s=i.length;r!==s;++r)i[r]=t[n++]}_setValue_array_setNeedsUpdate(t,n){let i=this.resolvedProperty;for(let r=0,s=i.length;r!==s;++r)i[r]=t[n++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(t,n){let i=this.resolvedProperty;for(let r=0,s=i.length;r!==s;++r)i[r]=t[n++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(t,n){this.resolvedProperty[this.propertyIndex]=t[n]}_setValue_arrayElement_setNeedsUpdate(t,n){this.resolvedProperty[this.propertyIndex]=t[n],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(t,n){this.resolvedProperty[this.propertyIndex]=t[n],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(t,n){this.resolvedProperty.fromArray(t,n)}_setValue_fromArray_setNeedsUpdate(t,n){this.resolvedProperty.fromArray(t,n),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(t,n){this.resolvedProperty.fromArray(t,n),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(t,n){this.bind(),this.getValue(t,n)}_setValue_unbound(t,n){this.bind(),this.setValue(t,n)}bind(){let t=this.node,n=this.parsedPath,i=n.objectName,r=n.propertyName,s=n.propertyIndex;if(t||(t=e.findNode(this.rootNode,n.nodeName),this.node=t),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!t){console.warn("THREE.PropertyBinding: No target node found for track: "+this.path+".");return}if(i){let l=n.objectIndex;switch(i){case"materials":if(!t.material){console.error("THREE.PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!t.material.materials){console.error("THREE.PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}t=t.material.materials;break;case"bones":if(!t.skeleton){console.error("THREE.PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}t=t.skeleton.bones;for(let u=0;u<t.length;u++)if(t[u].name===l){l=u;break}break;case"map":if("map"in t){t=t.map;break}if(!t.material){console.error("THREE.PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!t.material.map){console.error("THREE.PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}t=t.material.map;break;default:if(t[i]===void 0){console.error("THREE.PropertyBinding: Can not bind to objectName of node undefined.",this);return}t=t[i]}if(l!==void 0){if(t[l]===void 0){console.error("THREE.PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,t);return}t=t[l]}}let o=t[r];if(o===void 0){let l=n.nodeName;console.error("THREE.PropertyBinding: Trying to update property for track: "+l+"."+r+" but it wasn't found.",t);return}let a=this.Versioning.None;this.targetObject=t,t.isMaterial===!0?a=this.Versioning.NeedsUpdate:t.isObject3D===!0&&(a=this.Versioning.MatrixWorldNeedsUpdate);let c=this.BindingType.Direct;if(s!==void 0){if(r==="morphTargetInfluences"){if(!t.geometry){console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!t.geometry.morphAttributes){console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}t.morphTargetDictionary[s]!==void 0&&(s=t.morphTargetDictionary[s])}c=this.BindingType.ArrayElement,this.resolvedProperty=o,this.propertyIndex=s}else o.fromArray!==void 0&&o.toArray!==void 0?(c=this.BindingType.HasFromToArray,this.resolvedProperty=o):Array.isArray(o)?(c=this.BindingType.EntireArray,this.resolvedProperty=o):this.propertyName=r;this.getValue=this.GetterByBindingType[c],this.setValue=this.SetterByBindingTypeAndVersioning[c][a]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}};Se.Composite=rf;Se.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};Se.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};Se.prototype.GetterByBindingType=[Se.prototype._getValue_direct,Se.prototype._getValue_array,Se.prototype._getValue_arrayElement,Se.prototype._getValue_toArray];Se.prototype.SetterByBindingTypeAndVersioning=[[Se.prototype._setValue_direct,Se.prototype._setValue_direct_setNeedsUpdate,Se.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[Se.prototype._setValue_array,Se.prototype._setValue_array_setNeedsUpdate,Se.prototype._setValue_array_setMatrixWorldNeedsUpdate],[Se.prototype._setValue_arrayElement,Se.prototype._setValue_arrayElement_setNeedsUpdate,Se.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[Se.prototype._setValue_fromArray,Se.prototype._setValue_fromArray_setNeedsUpdate,Se.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];var qI=new Float32Array(1);var gm=new Vt,Ii=class{constructor(t,n,i=0,r=1/0){this.ray=new Ri(t,n),this.near=i,this.far=r,this.camera=null,this.layers=new bs,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(t,n){this.ray.set(t,n)}setFromCamera(t,n){n.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(n.matrixWorld),this.ray.direction.set(t.x,t.y,.5).unproject(n).sub(this.ray.origin).normalize(),this.camera=n):n.isOrthographicCamera?(this.ray.origin.set(t.x,t.y,(n.near+n.far)/(n.near-n.far)).unproject(n),this.ray.direction.set(0,0,-1).transformDirection(n.matrixWorld),this.camera=n):console.error("THREE.Raycaster: Unsupported camera type: "+n.type)}setFromXRController(t){return gm.identity().extractRotation(t.matrixWorld),this.ray.origin.setFromMatrixPosition(t.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(gm),this}intersectObject(t,n=!0,i=[]){return sf(t,this,i,n),i.sort(_m),i}intersectObjects(t,n=!0,i=[]){for(let r=0,s=t.length;r<s;r++)sf(t[r],this,i,n);return i.sort(_m),i}};function _m(e,t){return e.distance-t.distance}function sf(e,t,n,i){let r=!0;if(e.layers.test(t.layers)&&e.raycast(t,n)===!1&&(r=!1),r===!0&&i===!0){let s=e.children;for(let o=0,a=s.length;o<a;o++)sf(s[o],t,n,!0)}}var Zo=class{constructor(){this._previousTime=0,this._currentTime=0,this._startTime=performance.now(),this._delta=0,this._elapsed=0,this._timescale=1,this._document=null,this._pageVisibilityHandler=null}connect(t){this._document=t,t.hidden!==void 0&&(this._pageVisibilityHandler=Gb.bind(this),t.addEventListener("visibilitychange",this._pageVisibilityHandler,!1))}disconnect(){this._pageVisibilityHandler!==null&&(this._document.removeEventListener("visibilitychange",this._pageVisibilityHandler),this._pageVisibilityHandler=null),this._document=null}getDelta(){return this._delta/1e3}getElapsed(){return this._elapsed/1e3}getTimescale(){return this._timescale}setTimescale(t){return this._timescale=t,this}reset(){return this._currentTime=performance.now()-this._startTime,this}dispose(){this.disconnect()}update(t){return this._pageVisibilityHandler!==null&&this._document.hidden===!0?this._delta=0:(this._previousTime=this._currentTime,this._currentTime=(t!==void 0?t:performance.now())-this._startTime,this._delta=(this._currentTime-this._previousTime)*this._timescale,this._elapsed+=this._delta),this}};function Gb(){this._document.hidden===!1&&this.reset()}var Ps=class{constructor(t=1,n=0,i=0){this.radius=t,this.phi=n,this.theta=i}set(t,n,i){return this.radius=t,this.phi=n,this.theta=i,this}copy(t){return this.radius=t.radius,this.phi=t.phi,this.theta=t.theta,this}makeSafe(){return this.phi=Kt(this.phi,1e-6,Math.PI-1e-6),this}setFromVector3(t){return this.setFromCartesianCoords(t.x,t.y,t.z)}setFromCartesianCoords(t,n,i){return this.radius=Math.sqrt(t*t+n*n+i*i),this.radius===0?(this.theta=0,this.phi=0):(this.theta=Math.atan2(t,i),this.phi=Math.acos(Kt(n/this.radius,-1,1))),this}clone(){return new this.constructor().copy(this)}};var Ko=class extends Ic{constructor(t=10,n=10,i=4473924,r=8947848){i=new Ot(i),r=new Ot(r);let s=n/2,o=t/n,a=t/2,c=[],l=[];for(let f=0,d=0,m=-a;f<=n;f++,m+=o){c.push(-a,0,m,a,0,m),c.push(m,0,-a,m,0,a);let _=f===s?i:r;_.toArray(l,d),d+=3,_.toArray(l,d),d+=3,_.toArray(l,d),d+=3,_.toArray(l,d),d+=3}let u=new ve;u.setAttribute("position",new ce(c,3)),u.setAttribute("color",new ce(l,3));let h=new Zn({vertexColors:!0,toneMapped:!1});super(u,h),this.type="GridHelper"}dispose(){this.geometry.dispose(),this.material.dispose()}};var Sn=class extends si{constructor(t,n=null){super(),this.object=t,this.domElement=n,this.enabled=!0,this.state=-1,this.keys={},this.mouseButtons={LEFT:null,MIDDLE:null,RIGHT:null},this.touches={ONE:null,TWO:null}}connect(t){if(t===void 0){console.warn("THREE.Controls: connect() now requires an element.");return}this.domElement!==null&&this.disconnect(),this.domElement=t}disconnect(){}dispose(){}update(){}};function Af(e,t,n,i){let r=Wb(i);switch(n){case mf:return e*t;case _f:return e*t/r.components*r.byteLength;case yl:return e*t/r.components*r.byteLength;case vf:return e*t*2/r.components*r.byteLength;case xl:return e*t*2/r.components*r.byteLength;case gf:return e*t*3/r.components*r.byteLength;case zn:return e*t*4/r.components*r.byteLength;case bl:return e*t*4/r.components*r.byteLength;case ta:case ea:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*8;case na:case ia:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*16;case Sl:case El:return Math.max(e,16)*Math.max(t,8)/4;case Ml:case wl:return Math.max(e,8)*Math.max(t,8)/2;case Tl:case Al:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*8;case Cl:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*16;case Rl:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*16;case Pl:return Math.floor((e+4)/5)*Math.floor((t+3)/4)*16;case Il:return Math.floor((e+4)/5)*Math.floor((t+4)/5)*16;case Dl:return Math.floor((e+5)/6)*Math.floor((t+4)/5)*16;case Ll:return Math.floor((e+5)/6)*Math.floor((t+5)/6)*16;case Ol:return Math.floor((e+7)/8)*Math.floor((t+4)/5)*16;case Nl:return Math.floor((e+7)/8)*Math.floor((t+5)/6)*16;case Fl:return Math.floor((e+7)/8)*Math.floor((t+7)/8)*16;case Ul:return Math.floor((e+9)/10)*Math.floor((t+4)/5)*16;case zl:return Math.floor((e+9)/10)*Math.floor((t+5)/6)*16;case kl:return Math.floor((e+9)/10)*Math.floor((t+7)/8)*16;case Bl:return Math.floor((e+9)/10)*Math.floor((t+9)/10)*16;case Vl:return Math.floor((e+11)/12)*Math.floor((t+9)/10)*16;case Hl:return Math.floor((e+11)/12)*Math.floor((t+11)/12)*16;case Gl:case Wl:case jl:return Math.ceil(e/4)*Math.ceil(t/4)*16;case ql:case Xl:return Math.ceil(e/4)*Math.ceil(t/4)*8;case $l:case Yl:return Math.ceil(e/4)*Math.ceil(t/4)*16}throw new Error(`Unable to determine texture byte length for ${n} format.`)}function Wb(e){switch(e){case Jn:case uf:return{byteLength:1,components:1};case Is:case ff:case Un:return{byteLength:2,components:1};case _l:case vl:return{byteLength:2,components:4};case Ji:case gl:case di:return{byteLength:4,components:1};case df:case pf:return{byteLength:4,components:3}}throw new Error(`Unknown texture type ${e}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:"180"}}));typeof window<"u"&&(window.__THREE__?console.warn("WARNING: Multiple instances of Three.js being imported."):window.__THREE__="180");function Tg(){let e=null,t=!1,n=null,i=null;function r(s,o){n(s,o),i=e.requestAnimationFrame(r)}return{start:function(){t!==!0&&n!==null&&(i=e.requestAnimationFrame(r),t=!0)},stop:function(){e.cancelAnimationFrame(i),t=!1},setAnimationLoop:function(s){n=s},setContext:function(s){e=s}}}function jb(e){let t=new WeakMap;function n(a,c){let l=a.array,u=a.usage,h=l.byteLength,f=e.createBuffer();e.bindBuffer(c,f),e.bufferData(c,l,u),a.onUploadCallback();let d;if(l instanceof Float32Array)d=e.FLOAT;else if(typeof Float16Array<"u"&&l instanceof Float16Array)d=e.HALF_FLOAT;else if(l instanceof Uint16Array)a.isFloat16BufferAttribute?d=e.HALF_FLOAT:d=e.UNSIGNED_SHORT;else if(l instanceof Int16Array)d=e.SHORT;else if(l instanceof Uint32Array)d=e.UNSIGNED_INT;else if(l instanceof Int32Array)d=e.INT;else if(l instanceof Int8Array)d=e.BYTE;else if(l instanceof Uint8Array)d=e.UNSIGNED_BYTE;else if(l instanceof Uint8ClampedArray)d=e.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+l);return{buffer:f,type:d,bytesPerElement:l.BYTES_PER_ELEMENT,version:a.version,size:h}}function i(a,c,l){let u=c.array,h=c.updateRanges;if(e.bindBuffer(l,a),h.length===0)e.bufferSubData(l,0,u);else{h.sort((d,m)=>d.start-m.start);let f=0;for(let d=1;d<h.length;d++){let m=h[f],_=h[d];_.start<=m.start+m.count+1?m.count=Math.max(m.count,_.start+_.count-m.start):(++f,h[f]=_)}h.length=f+1;for(let d=0,m=h.length;d<m;d++){let _=h[d];e.bufferSubData(l,_.start*u.BYTES_PER_ELEMENT,u,_.start,_.count)}c.clearUpdateRanges()}c.onUploadCallback()}function r(a){return a.isInterleavedBufferAttribute&&(a=a.data),t.get(a)}function s(a){a.isInterleavedBufferAttribute&&(a=a.data);let c=t.get(a);c&&(e.deleteBuffer(c.buffer),t.delete(a))}function o(a,c){if(a.isInterleavedBufferAttribute&&(a=a.data),a.isGLBufferAttribute){let u=t.get(a);(!u||u.version<a.version)&&t.set(a,{buffer:a.buffer,type:a.type,bytesPerElement:a.elementSize,version:a.version});return}let l=t.get(a);if(l===void 0)t.set(a,n(a,c));else if(l.version<a.version){if(l.size!==a.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");i(l.buffer,a,c),l.version=a.version}}return{get:r,remove:s,update:o}}var qb=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,Xb=`#ifdef USE_ALPHAHASH
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
#endif`,$b=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,Yb=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Zb=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,Kb=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,Jb=`#ifdef USE_AOMAP
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
#endif`,Qb=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,t1=`#ifdef USE_BATCHING
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
#endif`,e1=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,n1=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,i1=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,r1=`float G_BlinnPhong_Implicit( ) {
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
} // validated`,s1=`#ifdef USE_IRIDESCENCE
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
#endif`,o1=`#ifdef USE_BUMPMAP
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
#endif`,a1=`#if NUM_CLIPPING_PLANES > 0
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
#endif`,c1=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,l1=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,h1=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,u1=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,f1=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,d1=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,p1=`#if defined( USE_COLOR_ALPHA )
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
#endif`,m1=`#define PI 3.141592653589793
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
} // validated`,g1=`#ifdef ENVMAP_TYPE_CUBE_UV
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
#endif`,_1=`vec3 transformedNormal = objectNormal;
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
#endif`,v1=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,y1=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,x1=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,b1=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,M1="gl_FragColor = linearToOutputTexel( gl_FragColor );",S1=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,w1=`#ifdef USE_ENVMAP
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
#endif`,E1=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,T1=`#ifdef USE_ENVMAP
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
#endif`,A1=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,C1=`#ifdef USE_ENVMAP
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
#endif`,R1=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,P1=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,I1=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,D1=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,L1=`#ifdef USE_GRADIENTMAP
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
}`,O1=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,N1=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,F1=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,U1=`uniform bool receiveShadow;
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
#endif`,z1=`#ifdef USE_ENVMAP
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
#endif`,k1=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,B1=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,V1=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,H1=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,G1=`PhysicalMaterial material;
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
#endif`,W1=`struct PhysicalMaterial {
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
}`,j1=`
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
#endif`,q1=`#if defined( RE_IndirectDiffuse )
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
#endif`,X1=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,$1=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,Y1=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Z1=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,K1=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,J1=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,Q1=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,tM=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
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
#endif`,eM=`#if defined( USE_POINTS_UV )
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
#endif`,nM=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,iM=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,rM=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,sM=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,oM=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,aM=`#ifdef USE_MORPHTARGETS
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
#endif`,cM=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,lM=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
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
vec3 nonPerturbedNormal = normal;`,hM=`#ifdef USE_NORMALMAP_OBJECTSPACE
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
#endif`,uM=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,fM=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,dM=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,pM=`#ifdef USE_NORMALMAP
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
#endif`,mM=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,gM=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,_M=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,vM=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,yM=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,xM=`vec3 packNormalToRGB( const in vec3 normal ) {
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
}`,bM=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,MM=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,SM=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,wM=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,EM=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,TM=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,AM=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,CM=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,RM=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
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
#endif`,PM=`float getShadowMask() {
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
}`,IM=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,DM=`#ifdef USE_SKINNING
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
#endif`,LM=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,OM=`#ifdef USE_SKINNING
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
#endif`,NM=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,FM=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,UM=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,zM=`#ifndef saturate
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
vec3 CustomToneMapping( vec3 color ) { return color; }`,kM=`#ifdef USE_TRANSMISSION
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
#endif`,BM=`#ifdef USE_TRANSMISSION
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
#endif`,VM=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,HM=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,GM=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,WM=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,jM=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,qM=`uniform sampler2D t2D;
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
}`,XM=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,$M=`#ifdef ENVMAP_TYPE_CUBE
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
}`,YM=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,ZM=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,KM=`#include <common>
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
}`,JM=`#if DEPTH_PACKING == 3200
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
}`,QM=`#define DISTANCE
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
}`,tS=`#define DISTANCE
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
}`,eS=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,nS=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,iS=`uniform float scale;
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
}`,rS=`uniform vec3 diffuse;
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
}`,sS=`#include <common>
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
}`,oS=`uniform vec3 diffuse;
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
}`,aS=`#define LAMBERT
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
}`,cS=`#define LAMBERT
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
}`,lS=`#define MATCAP
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
}`,hS=`#define MATCAP
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
}`,uS=`#define NORMAL
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
}`,fS=`#define NORMAL
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
}`,dS=`#define PHONG
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
}`,pS=`#define PHONG
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
}`,mS=`#define STANDARD
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
}`,gS=`#define STANDARD
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
}`,_S=`#define TOON
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
}`,vS=`#define TOON
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
}`,yS=`uniform float size;
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
}`,xS=`uniform vec3 diffuse;
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
}`,bS=`#include <common>
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
}`,MS=`uniform vec3 color;
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
}`,SS=`uniform float rotation;
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
}`,wS=`uniform vec3 diffuse;
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
}`,Jt={alphahash_fragment:qb,alphahash_pars_fragment:Xb,alphamap_fragment:$b,alphamap_pars_fragment:Yb,alphatest_fragment:Zb,alphatest_pars_fragment:Kb,aomap_fragment:Jb,aomap_pars_fragment:Qb,batching_pars_vertex:t1,batching_vertex:e1,begin_vertex:n1,beginnormal_vertex:i1,bsdfs:r1,iridescence_fragment:s1,bumpmap_pars_fragment:o1,clipping_planes_fragment:a1,clipping_planes_pars_fragment:c1,clipping_planes_pars_vertex:l1,clipping_planes_vertex:h1,color_fragment:u1,color_pars_fragment:f1,color_pars_vertex:d1,color_vertex:p1,common:m1,cube_uv_reflection_fragment:g1,defaultnormal_vertex:_1,displacementmap_pars_vertex:v1,displacementmap_vertex:y1,emissivemap_fragment:x1,emissivemap_pars_fragment:b1,colorspace_fragment:M1,colorspace_pars_fragment:S1,envmap_fragment:w1,envmap_common_pars_fragment:E1,envmap_pars_fragment:T1,envmap_pars_vertex:A1,envmap_physical_pars_fragment:z1,envmap_vertex:C1,fog_vertex:R1,fog_pars_vertex:P1,fog_fragment:I1,fog_pars_fragment:D1,gradientmap_pars_fragment:L1,lightmap_pars_fragment:O1,lights_lambert_fragment:N1,lights_lambert_pars_fragment:F1,lights_pars_begin:U1,lights_toon_fragment:k1,lights_toon_pars_fragment:B1,lights_phong_fragment:V1,lights_phong_pars_fragment:H1,lights_physical_fragment:G1,lights_physical_pars_fragment:W1,lights_fragment_begin:j1,lights_fragment_maps:q1,lights_fragment_end:X1,logdepthbuf_fragment:$1,logdepthbuf_pars_fragment:Y1,logdepthbuf_pars_vertex:Z1,logdepthbuf_vertex:K1,map_fragment:J1,map_pars_fragment:Q1,map_particle_fragment:tM,map_particle_pars_fragment:eM,metalnessmap_fragment:nM,metalnessmap_pars_fragment:iM,morphinstance_vertex:rM,morphcolor_vertex:sM,morphnormal_vertex:oM,morphtarget_pars_vertex:aM,morphtarget_vertex:cM,normal_fragment_begin:lM,normal_fragment_maps:hM,normal_pars_fragment:uM,normal_pars_vertex:fM,normal_vertex:dM,normalmap_pars_fragment:pM,clearcoat_normal_fragment_begin:mM,clearcoat_normal_fragment_maps:gM,clearcoat_pars_fragment:_M,iridescence_pars_fragment:vM,opaque_fragment:yM,packing:xM,premultiplied_alpha_fragment:bM,project_vertex:MM,dithering_fragment:SM,dithering_pars_fragment:wM,roughnessmap_fragment:EM,roughnessmap_pars_fragment:TM,shadowmap_pars_fragment:AM,shadowmap_pars_vertex:CM,shadowmap_vertex:RM,shadowmask_pars_fragment:PM,skinbase_vertex:IM,skinning_pars_vertex:DM,skinning_vertex:LM,skinnormal_vertex:OM,specularmap_fragment:NM,specularmap_pars_fragment:FM,tonemapping_fragment:UM,tonemapping_pars_fragment:zM,transmission_fragment:kM,transmission_pars_fragment:BM,uv_pars_fragment:VM,uv_pars_vertex:HM,uv_vertex:GM,worldpos_vertex:WM,background_vert:jM,background_frag:qM,backgroundCube_vert:XM,backgroundCube_frag:$M,cube_vert:YM,cube_frag:ZM,depth_vert:KM,depth_frag:JM,distanceRGBA_vert:QM,distanceRGBA_frag:tS,equirect_vert:eS,equirect_frag:nS,linedashed_vert:iS,linedashed_frag:rS,meshbasic_vert:sS,meshbasic_frag:oS,meshlambert_vert:aS,meshlambert_frag:cS,meshmatcap_vert:lS,meshmatcap_frag:hS,meshnormal_vert:uS,meshnormal_frag:fS,meshphong_vert:dS,meshphong_frag:pS,meshphysical_vert:mS,meshphysical_frag:gS,meshtoon_vert:_S,meshtoon_frag:vS,points_vert:yS,points_frag:xS,shadow_vert:bS,shadow_frag:MS,sprite_vert:SS,sprite_frag:wS},mt={common:{diffuse:{value:new Ot(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Xt},alphaMap:{value:null},alphaMapTransform:{value:new Xt},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Xt}},envmap:{envMap:{value:null},envMapRotation:{value:new Xt},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Xt}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Xt}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Xt},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Xt},normalScale:{value:new et(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Xt},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Xt}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Xt}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Xt}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Ot(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new Ot(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Xt},alphaTest:{value:0},uvTransform:{value:new Xt}},sprite:{diffuse:{value:new Ot(16777215)},opacity:{value:1},center:{value:new et(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Xt},alphaMap:{value:null},alphaMapTransform:{value:new Xt},alphaTest:{value:0}}},pi={basic:{uniforms:Ke([mt.common,mt.specularmap,mt.envmap,mt.aomap,mt.lightmap,mt.fog]),vertexShader:Jt.meshbasic_vert,fragmentShader:Jt.meshbasic_frag},lambert:{uniforms:Ke([mt.common,mt.specularmap,mt.envmap,mt.aomap,mt.lightmap,mt.emissivemap,mt.bumpmap,mt.normalmap,mt.displacementmap,mt.fog,mt.lights,{emissive:{value:new Ot(0)}}]),vertexShader:Jt.meshlambert_vert,fragmentShader:Jt.meshlambert_frag},phong:{uniforms:Ke([mt.common,mt.specularmap,mt.envmap,mt.aomap,mt.lightmap,mt.emissivemap,mt.bumpmap,mt.normalmap,mt.displacementmap,mt.fog,mt.lights,{emissive:{value:new Ot(0)},specular:{value:new Ot(1118481)},shininess:{value:30}}]),vertexShader:Jt.meshphong_vert,fragmentShader:Jt.meshphong_frag},standard:{uniforms:Ke([mt.common,mt.envmap,mt.aomap,mt.lightmap,mt.emissivemap,mt.bumpmap,mt.normalmap,mt.displacementmap,mt.roughnessmap,mt.metalnessmap,mt.fog,mt.lights,{emissive:{value:new Ot(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Jt.meshphysical_vert,fragmentShader:Jt.meshphysical_frag},toon:{uniforms:Ke([mt.common,mt.aomap,mt.lightmap,mt.emissivemap,mt.bumpmap,mt.normalmap,mt.displacementmap,mt.gradientmap,mt.fog,mt.lights,{emissive:{value:new Ot(0)}}]),vertexShader:Jt.meshtoon_vert,fragmentShader:Jt.meshtoon_frag},matcap:{uniforms:Ke([mt.common,mt.bumpmap,mt.normalmap,mt.displacementmap,mt.fog,{matcap:{value:null}}]),vertexShader:Jt.meshmatcap_vert,fragmentShader:Jt.meshmatcap_frag},points:{uniforms:Ke([mt.points,mt.fog]),vertexShader:Jt.points_vert,fragmentShader:Jt.points_frag},dashed:{uniforms:Ke([mt.common,mt.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Jt.linedashed_vert,fragmentShader:Jt.linedashed_frag},depth:{uniforms:Ke([mt.common,mt.displacementmap]),vertexShader:Jt.depth_vert,fragmentShader:Jt.depth_frag},normal:{uniforms:Ke([mt.common,mt.bumpmap,mt.normalmap,mt.displacementmap,{opacity:{value:1}}]),vertexShader:Jt.meshnormal_vert,fragmentShader:Jt.meshnormal_frag},sprite:{uniforms:Ke([mt.sprite,mt.fog]),vertexShader:Jt.sprite_vert,fragmentShader:Jt.sprite_frag},background:{uniforms:{uvTransform:{value:new Xt},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Jt.background_vert,fragmentShader:Jt.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Xt}},vertexShader:Jt.backgroundCube_vert,fragmentShader:Jt.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Jt.cube_vert,fragmentShader:Jt.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Jt.equirect_vert,fragmentShader:Jt.equirect_frag},distanceRGBA:{uniforms:Ke([mt.common,mt.displacementmap,{referencePosition:{value:new I},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Jt.distanceRGBA_vert,fragmentShader:Jt.distanceRGBA_frag},shadow:{uniforms:Ke([mt.lights,mt.fog,{color:{value:new Ot(0)},opacity:{value:1}}]),vertexShader:Jt.shadow_vert,fragmentShader:Jt.shadow_frag}};pi.physical={uniforms:Ke([pi.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Xt},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Xt},clearcoatNormalScale:{value:new et(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Xt},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Xt},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Xt},sheen:{value:0},sheenColor:{value:new Ot(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Xt},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Xt},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Xt},transmissionSamplerSize:{value:new et},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Xt},attenuationDistance:{value:0},attenuationColor:{value:new Ot(0)},specularColor:{value:new Ot(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Xt},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Xt},anisotropyVector:{value:new et},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Xt}}]),vertexShader:Jt.meshphysical_vert,fragmentShader:Jt.meshphysical_frag};var Kl={r:0,b:0,g:0},Lr=new Ln,ES=new Vt;function TS(e,t,n,i,r,s,o){let a=new Ot(0),c=s===!0?0:1,l,u,h=null,f=0,d=null;function m(x){let v=x.isScene===!0?x.background:null;return v&&v.isTexture&&(v=(x.backgroundBlurriness>0?n:t).get(v)),v}function _(x){let v=!1,M=m(x);M===null?p(a,c):M&&M.isColor&&(p(M,1),v=!0);let S=e.xr.getEnvironmentBlendMode();S==="additive"?i.buffers.color.setClear(0,0,0,1,o):S==="alpha-blend"&&i.buffers.color.setClear(0,0,0,0,o),(e.autoClear||v)&&(i.buffers.depth.setTest(!0),i.buffers.depth.setMask(!0),i.buffers.color.setMask(!0),e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil))}function g(x,v){let M=m(v);M&&(M.isCubeTexture||M.mapping===Jo)?(u===void 0&&(u=new we(new Ms(1,1,1),new Le({name:"BackgroundCubeMaterial",uniforms:Dr(pi.backgroundCube.uniforms),vertexShader:pi.backgroundCube.vertexShader,fragmentShader:pi.backgroundCube.fragmentShader,side:We,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),u.geometry.deleteAttribute("normal"),u.geometry.deleteAttribute("uv"),u.onBeforeRender=function(S,C,P){this.matrixWorld.copyPosition(P.matrixWorld)},Object.defineProperty(u.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),r.update(u)),Lr.copy(v.backgroundRotation),Lr.x*=-1,Lr.y*=-1,Lr.z*=-1,M.isCubeTexture&&M.isRenderTargetTexture===!1&&(Lr.y*=-1,Lr.z*=-1),u.material.uniforms.envMap.value=M,u.material.uniforms.flipEnvMap.value=M.isCubeTexture&&M.isRenderTargetTexture===!1?-1:1,u.material.uniforms.backgroundBlurriness.value=v.backgroundBlurriness,u.material.uniforms.backgroundIntensity.value=v.backgroundIntensity,u.material.uniforms.backgroundRotation.value.setFromMatrix4(ES.makeRotationFromEuler(Lr)),u.material.toneMapped=ee.getTransfer(M.colorSpace)!==ae,(h!==M||f!==M.version||d!==e.toneMapping)&&(u.material.needsUpdate=!0,h=M,f=M.version,d=e.toneMapping),u.layers.enableAll(),x.unshift(u,u.geometry,u.material,0,0,null)):M&&M.isTexture&&(l===void 0&&(l=new we(new ko(2,2),new Le({name:"BackgroundMaterial",uniforms:Dr(pi.background.uniforms),vertexShader:pi.background.vertexShader,fragmentShader:pi.background.fragmentShader,side:Ci,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute("normal"),Object.defineProperty(l.material,"map",{get:function(){return this.uniforms.t2D.value}}),r.update(l)),l.material.uniforms.t2D.value=M,l.material.uniforms.backgroundIntensity.value=v.backgroundIntensity,l.material.toneMapped=ee.getTransfer(M.colorSpace)!==ae,M.matrixAutoUpdate===!0&&M.updateMatrix(),l.material.uniforms.uvTransform.value.copy(M.matrix),(h!==M||f!==M.version||d!==e.toneMapping)&&(l.material.needsUpdate=!0,h=M,f=M.version,d=e.toneMapping),l.layers.enableAll(),x.unshift(l,l.geometry,l.material,0,0,null))}function p(x,v){x.getRGB(Kl,Sf(e)),i.buffers.color.setClear(Kl.r,Kl.g,Kl.b,v,o)}function b(){u!==void 0&&(u.geometry.dispose(),u.material.dispose(),u=void 0),l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0)}return{getClearColor:function(){return a},setClearColor:function(x,v=1){a.set(x),c=v,p(a,c)},getClearAlpha:function(){return c},setClearAlpha:function(x){c=x,p(a,c)},render:_,addToRenderList:g,dispose:b}}function AS(e,t){let n=e.getParameter(e.MAX_VERTEX_ATTRIBS),i={},r=f(null),s=r,o=!1;function a(w,R,V,N,z){let U=!1,G=h(N,V,R);s!==G&&(s=G,l(s.object)),U=d(w,N,V,z),U&&m(w,N,V,z),z!==null&&t.update(z,e.ELEMENT_ARRAY_BUFFER),(U||o)&&(o=!1,v(w,R,V,N),z!==null&&e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,t.get(z).buffer))}function c(){return e.createVertexArray()}function l(w){return e.bindVertexArray(w)}function u(w){return e.deleteVertexArray(w)}function h(w,R,V){let N=V.wireframe===!0,z=i[w.id];z===void 0&&(z={},i[w.id]=z);let U=z[R.id];U===void 0&&(U={},z[R.id]=U);let G=U[N];return G===void 0&&(G=f(c()),U[N]=G),G}function f(w){let R=[],V=[],N=[];for(let z=0;z<n;z++)R[z]=0,V[z]=0,N[z]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:R,enabledAttributes:V,attributeDivisors:N,object:w,attributes:{},index:null}}function d(w,R,V,N){let z=s.attributes,U=R.attributes,G=0,K=V.getAttributes();for(let q in K)if(K[q].location>=0){let gt=z[q],Y=U[q];if(Y===void 0&&(q==="instanceMatrix"&&w.instanceMatrix&&(Y=w.instanceMatrix),q==="instanceColor"&&w.instanceColor&&(Y=w.instanceColor)),gt===void 0||gt.attribute!==Y||Y&&gt.data!==Y.data)return!0;G++}return s.attributesNum!==G||s.index!==N}function m(w,R,V,N){let z={},U=R.attributes,G=0,K=V.getAttributes();for(let q in K)if(K[q].location>=0){let gt=U[q];gt===void 0&&(q==="instanceMatrix"&&w.instanceMatrix&&(gt=w.instanceMatrix),q==="instanceColor"&&w.instanceColor&&(gt=w.instanceColor));let Y={};Y.attribute=gt,gt&&gt.data&&(Y.data=gt.data),z[q]=Y,G++}s.attributes=z,s.attributesNum=G,s.index=N}function _(){let w=s.newAttributes;for(let R=0,V=w.length;R<V;R++)w[R]=0}function g(w){p(w,0)}function p(w,R){let V=s.newAttributes,N=s.enabledAttributes,z=s.attributeDivisors;V[w]=1,N[w]===0&&(e.enableVertexAttribArray(w),N[w]=1),z[w]!==R&&(e.vertexAttribDivisor(w,R),z[w]=R)}function b(){let w=s.newAttributes,R=s.enabledAttributes;for(let V=0,N=R.length;V<N;V++)R[V]!==w[V]&&(e.disableVertexAttribArray(V),R[V]=0)}function x(w,R,V,N,z,U,G){G===!0?e.vertexAttribIPointer(w,R,V,z,U):e.vertexAttribPointer(w,R,V,N,z,U)}function v(w,R,V,N){_();let z=N.attributes,U=V.getAttributes(),G=R.defaultAttributeValues;for(let K in U){let q=U[K];if(q.location>=0){let ot=z[K];if(ot===void 0&&(K==="instanceMatrix"&&w.instanceMatrix&&(ot=w.instanceMatrix),K==="instanceColor"&&w.instanceColor&&(ot=w.instanceColor)),ot!==void 0){let gt=ot.normalized,Y=ot.itemSize,it=t.get(ot);if(it===void 0)continue;let dt=it.buffer,zt=it.type,Lt=it.bytesPerElement,$=zt===e.INT||zt===e.UNSIGNED_INT||ot.gpuType===gl;if(ot.isInterleavedBufferAttribute){let Q=ot.data,yt=Q.stride,Bt=ot.offset;if(Q.isInstancedInterleavedBuffer){for(let It=0;It<q.locationSize;It++)p(q.location+It,Q.meshPerAttribute);w.isInstancedMesh!==!0&&N._maxInstanceCount===void 0&&(N._maxInstanceCount=Q.meshPerAttribute*Q.count)}else for(let It=0;It<q.locationSize;It++)g(q.location+It);e.bindBuffer(e.ARRAY_BUFFER,dt);for(let It=0;It<q.locationSize;It++)x(q.location+It,Y/q.locationSize,zt,gt,yt*Lt,(Bt+Y/q.locationSize*It)*Lt,$)}else{if(ot.isInstancedBufferAttribute){for(let Q=0;Q<q.locationSize;Q++)p(q.location+Q,ot.meshPerAttribute);w.isInstancedMesh!==!0&&N._maxInstanceCount===void 0&&(N._maxInstanceCount=ot.meshPerAttribute*ot.count)}else for(let Q=0;Q<q.locationSize;Q++)g(q.location+Q);e.bindBuffer(e.ARRAY_BUFFER,dt);for(let Q=0;Q<q.locationSize;Q++)x(q.location+Q,Y/q.locationSize,zt,gt,Y*Lt,Y/q.locationSize*Q*Lt,$)}}else if(G!==void 0){let gt=G[K];if(gt!==void 0)switch(gt.length){case 2:e.vertexAttrib2fv(q.location,gt);break;case 3:e.vertexAttrib3fv(q.location,gt);break;case 4:e.vertexAttrib4fv(q.location,gt);break;default:e.vertexAttrib1fv(q.location,gt)}}}}b()}function M(){P();for(let w in i){let R=i[w];for(let V in R){let N=R[V];for(let z in N)u(N[z].object),delete N[z];delete R[V]}delete i[w]}}function S(w){if(i[w.id]===void 0)return;let R=i[w.id];for(let V in R){let N=R[V];for(let z in N)u(N[z].object),delete N[z];delete R[V]}delete i[w.id]}function C(w){for(let R in i){let V=i[R];if(V[w.id]===void 0)continue;let N=V[w.id];for(let z in N)u(N[z].object),delete N[z];delete V[w.id]}}function P(){T(),o=!0,s!==r&&(s=r,l(s.object))}function T(){r.geometry=null,r.program=null,r.wireframe=!1}return{setup:a,reset:P,resetDefaultState:T,dispose:M,releaseStatesOfGeometry:S,releaseStatesOfProgram:C,initAttributes:_,enableAttribute:g,disableUnusedAttributes:b}}function CS(e,t,n){let i;function r(l){i=l}function s(l,u){e.drawArrays(i,l,u),n.update(u,i,1)}function o(l,u,h){h!==0&&(e.drawArraysInstanced(i,l,u,h),n.update(u,i,h))}function a(l,u,h){if(h===0)return;t.get("WEBGL_multi_draw").multiDrawArraysWEBGL(i,l,0,u,0,h);let d=0;for(let m=0;m<h;m++)d+=u[m];n.update(d,i,1)}function c(l,u,h,f){if(h===0)return;let d=t.get("WEBGL_multi_draw");if(d===null)for(let m=0;m<l.length;m++)o(l[m],u[m],f[m]);else{d.multiDrawArraysInstancedWEBGL(i,l,0,u,0,f,0,h);let m=0;for(let _=0;_<h;_++)m+=u[_]*f[_];n.update(m,i,1)}}this.setMode=r,this.render=s,this.renderInstances=o,this.renderMultiDraw=a,this.renderMultiDrawInstances=c}function RS(e,t,n,i){let r;function s(){if(r!==void 0)return r;if(t.has("EXT_texture_filter_anisotropic")===!0){let C=t.get("EXT_texture_filter_anisotropic");r=e.getParameter(C.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else r=0;return r}function o(C){return!(C!==zn&&i.convert(C)!==e.getParameter(e.IMPLEMENTATION_COLOR_READ_FORMAT))}function a(C){let P=C===Un&&(t.has("EXT_color_buffer_half_float")||t.has("EXT_color_buffer_float"));return!(C!==Jn&&i.convert(C)!==e.getParameter(e.IMPLEMENTATION_COLOR_READ_TYPE)&&C!==di&&!P)}function c(C){if(C==="highp"){if(e.getShaderPrecisionFormat(e.VERTEX_SHADER,e.HIGH_FLOAT).precision>0&&e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.HIGH_FLOAT).precision>0)return"highp";C="mediump"}return C==="mediump"&&e.getShaderPrecisionFormat(e.VERTEX_SHADER,e.MEDIUM_FLOAT).precision>0&&e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let l=n.precision!==void 0?n.precision:"highp",u=c(l);u!==l&&(console.warn("THREE.WebGLRenderer:",l,"not supported, using",u,"instead."),l=u);let h=n.logarithmicDepthBuffer===!0,f=n.reversedDepthBuffer===!0&&t.has("EXT_clip_control"),d=e.getParameter(e.MAX_TEXTURE_IMAGE_UNITS),m=e.getParameter(e.MAX_VERTEX_TEXTURE_IMAGE_UNITS),_=e.getParameter(e.MAX_TEXTURE_SIZE),g=e.getParameter(e.MAX_CUBE_MAP_TEXTURE_SIZE),p=e.getParameter(e.MAX_VERTEX_ATTRIBS),b=e.getParameter(e.MAX_VERTEX_UNIFORM_VECTORS),x=e.getParameter(e.MAX_VARYING_VECTORS),v=e.getParameter(e.MAX_FRAGMENT_UNIFORM_VECTORS),M=m>0,S=e.getParameter(e.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:s,getMaxPrecision:c,textureFormatReadable:o,textureTypeReadable:a,precision:l,logarithmicDepthBuffer:h,reversedDepthBuffer:f,maxTextures:d,maxVertexTextures:m,maxTextureSize:_,maxCubemapSize:g,maxAttributes:p,maxVertexUniforms:b,maxVaryings:x,maxFragmentUniforms:v,vertexTextures:M,maxSamples:S}}function PS(e){let t=this,n=null,i=0,r=!1,s=!1,o=new un,a=new Xt,c={value:null,needsUpdate:!1};this.uniform=c,this.numPlanes=0,this.numIntersection=0,this.init=function(h,f){let d=h.length!==0||f||i!==0||r;return r=f,i=h.length,d},this.beginShadows=function(){s=!0,u(null)},this.endShadows=function(){s=!1},this.setGlobalState=function(h,f){n=u(h,f,0)},this.setState=function(h,f,d){let m=h.clippingPlanes,_=h.clipIntersection,g=h.clipShadows,p=e.get(h);if(!r||m===null||m.length===0||s&&!g)s?u(null):l();else{let b=s?0:i,x=b*4,v=p.clippingState||null;c.value=v,v=u(m,f,x,d);for(let M=0;M!==x;++M)v[M]=n[M];p.clippingState=v,this.numIntersection=_?this.numPlanes:0,this.numPlanes+=b}};function l(){c.value!==n&&(c.value=n,c.needsUpdate=i>0),t.numPlanes=i,t.numIntersection=0}function u(h,f,d,m){let _=h!==null?h.length:0,g=null;if(_!==0){if(g=c.value,m!==!0||g===null){let p=d+_*4,b=f.matrixWorldInverse;a.getNormalMatrix(b),(g===null||g.length<p)&&(g=new Float32Array(p));for(let x=0,v=d;x!==_;++x,v+=4)o.copy(h[x]).applyMatrix4(b,a),o.normal.toArray(g,v),g[v+3]=o.constant}c.value=g,c.needsUpdate=!0}return t.numPlanes=_,t.numIntersection=0,g}}function IS(e){let t=new WeakMap;function n(o,a){return a===dl?o.mapping=Pr:a===pl&&(o.mapping=Ir),o}function i(o){if(o&&o.isTexture){let a=o.mapping;if(a===dl||a===pl)if(t.has(o)){let c=t.get(o).texture;return n(c,o.mapping)}else{let c=o.image;if(c&&c.height>0){let l=new Ac(c.height);return l.fromEquirectangularTexture(e,o),t.set(o,l),o.addEventListener("dispose",r),n(l.texture,o.mapping)}else return null}}return o}function r(o){let a=o.target;a.removeEventListener("dispose",r);let c=t.get(a);c!==void 0&&(t.delete(a),c.dispose())}function s(){t=new WeakMap}return{get:i,dispose:s}}var Ns=4,ig=[.125,.215,.35,.446,.526,.582],Fr=20,Cf=new Cr,rg=new Ot,Rf=null,Pf=0,If=0,Df=!1,Nr=(1+Math.sqrt(5))/2,Os=1/Nr,sg=[new I(-Nr,Os,0),new I(Nr,Os,0),new I(-Os,0,Nr),new I(Os,0,Nr),new I(0,Nr,-Os),new I(0,Nr,Os),new I(-1,1,-1),new I(1,1,-1),new I(-1,1,1),new I(1,1,1)],DS=new I,th=class{constructor(t){this._renderer=t,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene(t,n=0,i=.1,r=100,s={}){let{size:o=256,position:a=DS}=s;Rf=this._renderer.getRenderTarget(),Pf=this._renderer.getActiveCubeFace(),If=this._renderer.getActiveMipmapLevel(),Df=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(o);let c=this._allocateTargets();return c.depthBuffer=!0,this._sceneToCubeUV(t,i,r,c,a),n>0&&this._blur(c,0,0,n),this._applyPMREM(c),this._cleanup(c),c}fromEquirectangular(t,n=null){return this._fromTexture(t,n)}fromCubemap(t,n=null){return this._fromTexture(t,n)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=cg(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=ag(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose()}_setSize(t){this._lodMax=Math.floor(Math.log2(t)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let t=0;t<this._lodPlanes.length;t++)this._lodPlanes[t].dispose()}_cleanup(t){this._renderer.setRenderTarget(Rf,Pf,If),this._renderer.xr.enabled=Df,t.scissorTest=!1,Jl(t,0,0,t.width,t.height)}_fromTexture(t,n){t.mapping===Pr||t.mapping===Ir?this._setSize(t.image.length===0?16:t.image[0].width||t.image[0].image.width):this._setSize(t.image.width/4),Rf=this._renderer.getRenderTarget(),Pf=this._renderer.getActiveCubeFace(),If=this._renderer.getActiveMipmapLevel(),Df=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;let i=n||this._allocateTargets();return this._textureToCubeUV(t,i),this._applyPMREM(i),this._cleanup(i),i}_allocateTargets(){let t=3*Math.max(this._cubeSize,112),n=4*this._cubeSize,i={magFilter:Yn,minFilter:Yn,generateMipmaps:!1,type:Un,format:zn,colorSpace:Er,depthBuffer:!1},r=og(t,n,i);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==t||this._pingPongRenderTarget.height!==n){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=og(t,n,i);let{_lodMax:s}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=LS(s)),this._blurMaterial=OS(s,t,n)}return r}_compileMaterial(t){let n=new we(this._lodPlanes[0],t);this._renderer.compile(n,Cf)}_sceneToCubeUV(t,n,i,r,s){let c=new Ge(90,1,n,i),l=[1,-1,1,1,1,1],u=[1,1,1,-1,-1,-1],h=this._renderer,f=h.autoClear,d=h.toneMapping;h.getClearColor(rg),h.toneMapping=Di,h.autoClear=!1,h.state.buffers.depth.getReversed()&&(h.setRenderTarget(r),h.clearDepth(),h.setRenderTarget(null));let _=new bn({name:"PMREM.Background",side:We,depthWrite:!1,depthTest:!1}),g=new we(new Ms,_),p=!1,b=t.background;b?b.isColor&&(_.color.copy(b),t.background=null,p=!0):(_.color.copy(rg),p=!0);for(let x=0;x<6;x++){let v=x%3;v===0?(c.up.set(0,l[x],0),c.position.set(s.x,s.y,s.z),c.lookAt(s.x+u[x],s.y,s.z)):v===1?(c.up.set(0,0,l[x]),c.position.set(s.x,s.y,s.z),c.lookAt(s.x,s.y+u[x],s.z)):(c.up.set(0,l[x],0),c.position.set(s.x,s.y,s.z),c.lookAt(s.x,s.y,s.z+u[x]));let M=this._cubeSize;Jl(r,v*M,x>2?M:0,M,M),h.setRenderTarget(r),p&&h.render(g,c),h.render(t,c)}g.geometry.dispose(),g.material.dispose(),h.toneMapping=d,h.autoClear=f,t.background=b}_textureToCubeUV(t,n){let i=this._renderer,r=t.mapping===Pr||t.mapping===Ir;r?(this._cubemapMaterial===null&&(this._cubemapMaterial=cg()),this._cubemapMaterial.uniforms.flipEnvMap.value=t.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=ag());let s=r?this._cubemapMaterial:this._equirectMaterial,o=new we(this._lodPlanes[0],s),a=s.uniforms;a.envMap.value=t;let c=this._cubeSize;Jl(n,0,0,3*c,2*c),i.setRenderTarget(n),i.render(o,Cf)}_applyPMREM(t){let n=this._renderer,i=n.autoClear;n.autoClear=!1;let r=this._lodPlanes.length;for(let s=1;s<r;s++){let o=Math.sqrt(this._sigmas[s]*this._sigmas[s]-this._sigmas[s-1]*this._sigmas[s-1]),a=sg[(r-s-1)%sg.length];this._blur(t,s-1,s,o,a)}n.autoClear=i}_blur(t,n,i,r,s){let o=this._pingPongRenderTarget;this._halfBlur(t,o,n,i,r,"latitudinal",s),this._halfBlur(o,t,i,i,r,"longitudinal",s)}_halfBlur(t,n,i,r,s,o,a){let c=this._renderer,l=this._blurMaterial;o!=="latitudinal"&&o!=="longitudinal"&&console.error("blur direction must be either latitudinal or longitudinal!");let u=3,h=new we(this._lodPlanes[r],l),f=l.uniforms,d=this._sizeLods[i]-1,m=isFinite(s)?Math.PI/(2*d):2*Math.PI/(2*Fr-1),_=s/m,g=isFinite(s)?1+Math.floor(u*_):Fr;g>Fr&&console.warn(`sigmaRadians, ${s}, is too large and will clip, as it requested ${g} samples when the maximum is set to ${Fr}`);let p=[],b=0;for(let C=0;C<Fr;++C){let P=C/_,T=Math.exp(-P*P/2);p.push(T),C===0?b+=T:C<g&&(b+=2*T)}for(let C=0;C<p.length;C++)p[C]=p[C]/b;f.envMap.value=t.texture,f.samples.value=g,f.weights.value=p,f.latitudinal.value=o==="latitudinal",a&&(f.poleAxis.value=a);let{_lodMax:x}=this;f.dTheta.value=m,f.mipInt.value=x-i;let v=this._sizeLods[r],M=3*v*(r>x-Ns?r-x+Ns:0),S=4*(this._cubeSize-v);Jl(n,M,S,3*v,2*v),c.setRenderTarget(n),c.render(h,Cf)}};function LS(e){let t=[],n=[],i=[],r=e,s=e-Ns+1+ig.length;for(let o=0;o<s;o++){let a=Math.pow(2,r);n.push(a);let c=1/a;o>e-Ns?c=ig[o-e+Ns-1]:o===0&&(c=0),i.push(c);let l=1/(a-2),u=-l,h=1+l,f=[u,u,h,u,h,h,u,u,h,h,u,h],d=6,m=6,_=3,g=2,p=1,b=new Float32Array(_*m*d),x=new Float32Array(g*m*d),v=new Float32Array(p*m*d);for(let S=0;S<d;S++){let C=S%3*2/3-1,P=S>2?0:-1,T=[C,P,0,C+2/3,P,0,C+2/3,P+1,0,C,P,0,C+2/3,P+1,0,C,P+1,0];b.set(T,_*m*S),x.set(f,g*m*S);let w=[S,S,S,S,S,S];v.set(w,p*m*S)}let M=new ve;M.setAttribute("position",new Ye(b,_)),M.setAttribute("uv",new Ye(x,g)),M.setAttribute("faceIndex",new Ye(v,p)),t.push(M),r>Ns&&r--}return{lodPlanes:t,sizeLods:n,sigmas:i}}function og(e,t,n){let i=new Ze(e,t,n);return i.texture.mapping=Jo,i.texture.name="PMREM.cubeUv",i.scissorTest=!0,i}function Jl(e,t,n,i,r){e.viewport.set(t,n,i,r),e.scissor.set(t,n,i,r)}function OS(e,t,n){let i=new Float32Array(Fr),r=new I(0,1,0);return new Le({name:"SphericalGaussianBlur",defines:{n:Fr,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/n,CUBEUV_MAX_MIP:`${e}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:i},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:r}},vertexShader:Gf(),fragmentShader:`

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
		`,blending:Kn,depthTest:!1,depthWrite:!1})}function ag(){return new Le({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:Gf(),fragmentShader:`

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
		`,blending:Kn,depthTest:!1,depthWrite:!1})}function cg(){return new Le({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Gf(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:Kn,depthTest:!1,depthWrite:!1})}function Gf(){return`

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
	`}function NS(e){let t=new WeakMap,n=null;function i(a){if(a&&a.isTexture){let c=a.mapping,l=c===dl||c===pl,u=c===Pr||c===Ir;if(l||u){let h=t.get(a),f=h!==void 0?h.texture.pmremVersion:0;if(a.isRenderTargetTexture&&a.pmremVersion!==f)return n===null&&(n=new th(e)),h=l?n.fromEquirectangular(a,h):n.fromCubemap(a,h),h.texture.pmremVersion=a.pmremVersion,t.set(a,h),h.texture;if(h!==void 0)return h.texture;{let d=a.image;return l&&d&&d.height>0||u&&d&&r(d)?(n===null&&(n=new th(e)),h=l?n.fromEquirectangular(a):n.fromCubemap(a),h.texture.pmremVersion=a.pmremVersion,t.set(a,h),a.addEventListener("dispose",s),h.texture):null}}}return a}function r(a){let c=0,l=6;for(let u=0;u<l;u++)a[u]!==void 0&&c++;return c===l}function s(a){let c=a.target;c.removeEventListener("dispose",s);let l=t.get(c);l!==void 0&&(t.delete(c),l.dispose())}function o(){t=new WeakMap,n!==null&&(n.dispose(),n=null)}return{get:i,dispose:o}}function FS(e){let t={};function n(i){if(t[i]!==void 0)return t[i];let r;switch(i){case"WEBGL_depth_texture":r=e.getExtension("WEBGL_depth_texture")||e.getExtension("MOZ_WEBGL_depth_texture")||e.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":r=e.getExtension("EXT_texture_filter_anisotropic")||e.getExtension("MOZ_EXT_texture_filter_anisotropic")||e.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":r=e.getExtension("WEBGL_compressed_texture_s3tc")||e.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||e.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":r=e.getExtension("WEBGL_compressed_texture_pvrtc")||e.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:r=e.getExtension(i)}return t[i]=r,r}return{has:function(i){return n(i)!==null},init:function(){n("EXT_color_buffer_float"),n("WEBGL_clip_cull_distance"),n("OES_texture_float_linear"),n("EXT_color_buffer_half_float"),n("WEBGL_multisampled_render_to_texture"),n("WEBGL_render_shared_exponent")},get:function(i){let r=n(i);return r===null&&ys("THREE.WebGLRenderer: "+i+" extension not supported."),r}}}function US(e,t,n,i){let r={},s=new WeakMap;function o(h){let f=h.target;f.index!==null&&t.remove(f.index);for(let m in f.attributes)t.remove(f.attributes[m]);f.removeEventListener("dispose",o),delete r[f.id];let d=s.get(f);d&&(t.remove(d),s.delete(f)),i.releaseStatesOfGeometry(f),f.isInstancedBufferGeometry===!0&&delete f._maxInstanceCount,n.memory.geometries--}function a(h,f){return r[f.id]===!0||(f.addEventListener("dispose",o),r[f.id]=!0,n.memory.geometries++),f}function c(h){let f=h.attributes;for(let d in f)t.update(f[d],e.ARRAY_BUFFER)}function l(h){let f=[],d=h.index,m=h.attributes.position,_=0;if(d!==null){let b=d.array;_=d.version;for(let x=0,v=b.length;x<v;x+=3){let M=b[x+0],S=b[x+1],C=b[x+2];f.push(M,S,S,C,C,M)}}else if(m!==void 0){let b=m.array;_=m.version;for(let x=0,v=b.length/3-1;x<v;x+=3){let M=x+0,S=x+1,C=x+2;f.push(M,S,S,C,C,M)}}else return;let g=new(Mf(f)?Co:Ao)(f,1);g.version=_;let p=s.get(h);p&&t.remove(p),s.set(h,g)}function u(h){let f=s.get(h);if(f){let d=h.index;d!==null&&f.version<d.version&&l(h)}else l(h);return s.get(h)}return{get:a,update:c,getWireframeAttribute:u}}function zS(e,t,n){let i;function r(f){i=f}let s,o;function a(f){s=f.type,o=f.bytesPerElement}function c(f,d){e.drawElements(i,d,s,f*o),n.update(d,i,1)}function l(f,d,m){m!==0&&(e.drawElementsInstanced(i,d,s,f*o,m),n.update(d,i,m))}function u(f,d,m){if(m===0)return;t.get("WEBGL_multi_draw").multiDrawElementsWEBGL(i,d,0,s,f,0,m);let g=0;for(let p=0;p<m;p++)g+=d[p];n.update(g,i,1)}function h(f,d,m,_){if(m===0)return;let g=t.get("WEBGL_multi_draw");if(g===null)for(let p=0;p<f.length;p++)l(f[p]/o,d[p],_[p]);else{g.multiDrawElementsInstancedWEBGL(i,d,0,s,f,0,_,0,m);let p=0;for(let b=0;b<m;b++)p+=d[b]*_[b];n.update(p,i,1)}}this.setMode=r,this.setIndex=a,this.render=c,this.renderInstances=l,this.renderMultiDraw=u,this.renderMultiDrawInstances=h}function kS(e){let t={geometries:0,textures:0},n={frame:0,calls:0,triangles:0,points:0,lines:0};function i(s,o,a){switch(n.calls++,o){case e.TRIANGLES:n.triangles+=a*(s/3);break;case e.LINES:n.lines+=a*(s/2);break;case e.LINE_STRIP:n.lines+=a*(s-1);break;case e.LINE_LOOP:n.lines+=a*s;break;case e.POINTS:n.points+=a*s;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",o);break}}function r(){n.calls=0,n.triangles=0,n.points=0,n.lines=0}return{memory:t,render:n,programs:null,autoReset:!0,reset:r,update:i}}function BS(e,t,n){let i=new WeakMap,r=new de;function s(o,a,c){let l=o.morphTargetInfluences,u=a.morphAttributes.position||a.morphAttributes.normal||a.morphAttributes.color,h=u!==void 0?u.length:0,f=i.get(a);if(f===void 0||f.count!==h){let T=function(){C.dispose(),i.delete(a),a.removeEventListener("dispose",T)};f!==void 0&&f.texture.dispose();let d=a.morphAttributes.position!==void 0,m=a.morphAttributes.normal!==void 0,_=a.morphAttributes.color!==void 0,g=a.morphAttributes.position||[],p=a.morphAttributes.normal||[],b=a.morphAttributes.color||[],x=0;d===!0&&(x=1),m===!0&&(x=2),_===!0&&(x=3);let v=a.attributes.position.count*x,M=1;v>t.maxTextureSize&&(M=Math.ceil(v/t.maxTextureSize),v=t.maxTextureSize);let S=new Float32Array(v*M*4*h),C=new To(S,v,M,h);C.type=di,C.needsUpdate=!0;let P=x*4;for(let w=0;w<h;w++){let R=g[w],V=p[w],N=b[w],z=v*M*4*w;for(let U=0;U<R.count;U++){let G=U*P;d===!0&&(r.fromBufferAttribute(R,U),S[z+G+0]=r.x,S[z+G+1]=r.y,S[z+G+2]=r.z,S[z+G+3]=0),m===!0&&(r.fromBufferAttribute(V,U),S[z+G+4]=r.x,S[z+G+5]=r.y,S[z+G+6]=r.z,S[z+G+7]=0),_===!0&&(r.fromBufferAttribute(N,U),S[z+G+8]=r.x,S[z+G+9]=r.y,S[z+G+10]=r.z,S[z+G+11]=N.itemSize===4?r.w:1)}}f={count:h,texture:C,size:new et(v,M)},i.set(a,f),a.addEventListener("dispose",T)}if(o.isInstancedMesh===!0&&o.morphTexture!==null)c.getUniforms().setValue(e,"morphTexture",o.morphTexture,n);else{let d=0;for(let _=0;_<l.length;_++)d+=l[_];let m=a.morphTargetsRelative?1:1-d;c.getUniforms().setValue(e,"morphTargetBaseInfluence",m),c.getUniforms().setValue(e,"morphTargetInfluences",l)}c.getUniforms().setValue(e,"morphTargetsTexture",f.texture,n),c.getUniforms().setValue(e,"morphTargetsTextureSize",f.size)}return{update:s}}function VS(e,t,n,i){let r=new WeakMap;function s(c){let l=i.render.frame,u=c.geometry,h=t.get(c,u);if(r.get(h)!==l&&(t.update(h),r.set(h,l)),c.isInstancedMesh&&(c.hasEventListener("dispose",a)===!1&&c.addEventListener("dispose",a),r.get(c)!==l&&(n.update(c.instanceMatrix,e.ARRAY_BUFFER),c.instanceColor!==null&&n.update(c.instanceColor,e.ARRAY_BUFFER),r.set(c,l))),c.isSkinnedMesh){let f=c.skeleton;r.get(f)!==l&&(f.update(),r.set(f,l))}return h}function o(){r=new WeakMap}function a(c){let l=c.target;l.removeEventListener("dispose",a),n.remove(l.instanceMatrix),l.instanceColor!==null&&n.remove(l.instanceColor)}return{update:s,dispose:o}}var Ag=new sn,lg=new Fo(1,1),Cg=new To,Rg=new Ec,Pg=new Po,hg=[],ug=[],fg=new Float32Array(16),dg=new Float32Array(9),pg=new Float32Array(4);function Us(e,t,n){let i=e[0];if(i<=0||i>0)return e;let r=t*n,s=hg[r];if(s===void 0&&(s=new Float32Array(r),hg[r]=s),t!==0){i.toArray(s,0);for(let o=1,a=0;o!==t;++o)a+=n,e[o].toArray(s,a)}return s}function Fe(e,t){if(e.length!==t.length)return!1;for(let n=0,i=e.length;n<i;n++)if(e[n]!==t[n])return!1;return!0}function Ue(e,t){for(let n=0,i=t.length;n<i;n++)e[n]=t[n]}function nh(e,t){let n=ug[t];n===void 0&&(n=new Int32Array(t),ug[t]=n);for(let i=0;i!==t;++i)n[i]=e.allocateTextureUnit();return n}function HS(e,t){let n=this.cache;n[0]!==t&&(e.uniform1f(this.addr,t),n[0]=t)}function GS(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2f(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(Fe(n,t))return;e.uniform2fv(this.addr,t),Ue(n,t)}}function WS(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3f(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else if(t.r!==void 0)(n[0]!==t.r||n[1]!==t.g||n[2]!==t.b)&&(e.uniform3f(this.addr,t.r,t.g,t.b),n[0]=t.r,n[1]=t.g,n[2]=t.b);else{if(Fe(n,t))return;e.uniform3fv(this.addr,t),Ue(n,t)}}function jS(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4f(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(Fe(n,t))return;e.uniform4fv(this.addr,t),Ue(n,t)}}function qS(e,t){let n=this.cache,i=t.elements;if(i===void 0){if(Fe(n,t))return;e.uniformMatrix2fv(this.addr,!1,t),Ue(n,t)}else{if(Fe(n,i))return;pg.set(i),e.uniformMatrix2fv(this.addr,!1,pg),Ue(n,i)}}function XS(e,t){let n=this.cache,i=t.elements;if(i===void 0){if(Fe(n,t))return;e.uniformMatrix3fv(this.addr,!1,t),Ue(n,t)}else{if(Fe(n,i))return;dg.set(i),e.uniformMatrix3fv(this.addr,!1,dg),Ue(n,i)}}function $S(e,t){let n=this.cache,i=t.elements;if(i===void 0){if(Fe(n,t))return;e.uniformMatrix4fv(this.addr,!1,t),Ue(n,t)}else{if(Fe(n,i))return;fg.set(i),e.uniformMatrix4fv(this.addr,!1,fg),Ue(n,i)}}function YS(e,t){let n=this.cache;n[0]!==t&&(e.uniform1i(this.addr,t),n[0]=t)}function ZS(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2i(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(Fe(n,t))return;e.uniform2iv(this.addr,t),Ue(n,t)}}function KS(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3i(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else{if(Fe(n,t))return;e.uniform3iv(this.addr,t),Ue(n,t)}}function JS(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4i(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(Fe(n,t))return;e.uniform4iv(this.addr,t),Ue(n,t)}}function QS(e,t){let n=this.cache;n[0]!==t&&(e.uniform1ui(this.addr,t),n[0]=t)}function tw(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2ui(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(Fe(n,t))return;e.uniform2uiv(this.addr,t),Ue(n,t)}}function ew(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3ui(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else{if(Fe(n,t))return;e.uniform3uiv(this.addr,t),Ue(n,t)}}function nw(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4ui(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(Fe(n,t))return;e.uniform4uiv(this.addr,t),Ue(n,t)}}function iw(e,t,n){let i=this.cache,r=n.allocateTextureUnit();i[0]!==r&&(e.uniform1i(this.addr,r),i[0]=r);let s;this.type===e.SAMPLER_2D_SHADOW?(lg.compareFunction=yf,s=lg):s=Ag,n.setTexture2D(t||s,r)}function rw(e,t,n){let i=this.cache,r=n.allocateTextureUnit();i[0]!==r&&(e.uniform1i(this.addr,r),i[0]=r),n.setTexture3D(t||Rg,r)}function sw(e,t,n){let i=this.cache,r=n.allocateTextureUnit();i[0]!==r&&(e.uniform1i(this.addr,r),i[0]=r),n.setTextureCube(t||Pg,r)}function ow(e,t,n){let i=this.cache,r=n.allocateTextureUnit();i[0]!==r&&(e.uniform1i(this.addr,r),i[0]=r),n.setTexture2DArray(t||Cg,r)}function aw(e){switch(e){case 5126:return HS;case 35664:return GS;case 35665:return WS;case 35666:return jS;case 35674:return qS;case 35675:return XS;case 35676:return $S;case 5124:case 35670:return YS;case 35667:case 35671:return ZS;case 35668:case 35672:return KS;case 35669:case 35673:return JS;case 5125:return QS;case 36294:return tw;case 36295:return ew;case 36296:return nw;case 35678:case 36198:case 36298:case 36306:case 35682:return iw;case 35679:case 36299:case 36307:return rw;case 35680:case 36300:case 36308:case 36293:return sw;case 36289:case 36303:case 36311:case 36292:return ow}}function cw(e,t){e.uniform1fv(this.addr,t)}function lw(e,t){let n=Us(t,this.size,2);e.uniform2fv(this.addr,n)}function hw(e,t){let n=Us(t,this.size,3);e.uniform3fv(this.addr,n)}function uw(e,t){let n=Us(t,this.size,4);e.uniform4fv(this.addr,n)}function fw(e,t){let n=Us(t,this.size,4);e.uniformMatrix2fv(this.addr,!1,n)}function dw(e,t){let n=Us(t,this.size,9);e.uniformMatrix3fv(this.addr,!1,n)}function pw(e,t){let n=Us(t,this.size,16);e.uniformMatrix4fv(this.addr,!1,n)}function mw(e,t){e.uniform1iv(this.addr,t)}function gw(e,t){e.uniform2iv(this.addr,t)}function _w(e,t){e.uniform3iv(this.addr,t)}function vw(e,t){e.uniform4iv(this.addr,t)}function yw(e,t){e.uniform1uiv(this.addr,t)}function xw(e,t){e.uniform2uiv(this.addr,t)}function bw(e,t){e.uniform3uiv(this.addr,t)}function Mw(e,t){e.uniform4uiv(this.addr,t)}function Sw(e,t,n){let i=this.cache,r=t.length,s=nh(n,r);Fe(i,s)||(e.uniform1iv(this.addr,s),Ue(i,s));for(let o=0;o!==r;++o)n.setTexture2D(t[o]||Ag,s[o])}function ww(e,t,n){let i=this.cache,r=t.length,s=nh(n,r);Fe(i,s)||(e.uniform1iv(this.addr,s),Ue(i,s));for(let o=0;o!==r;++o)n.setTexture3D(t[o]||Rg,s[o])}function Ew(e,t,n){let i=this.cache,r=t.length,s=nh(n,r);Fe(i,s)||(e.uniform1iv(this.addr,s),Ue(i,s));for(let o=0;o!==r;++o)n.setTextureCube(t[o]||Pg,s[o])}function Tw(e,t,n){let i=this.cache,r=t.length,s=nh(n,r);Fe(i,s)||(e.uniform1iv(this.addr,s),Ue(i,s));for(let o=0;o!==r;++o)n.setTexture2DArray(t[o]||Cg,s[o])}function Aw(e){switch(e){case 5126:return cw;case 35664:return lw;case 35665:return hw;case 35666:return uw;case 35674:return fw;case 35675:return dw;case 35676:return pw;case 5124:case 35670:return mw;case 35667:case 35671:return gw;case 35668:case 35672:return _w;case 35669:case 35673:return vw;case 5125:return yw;case 36294:return xw;case 36295:return bw;case 36296:return Mw;case 35678:case 36198:case 36298:case 36306:case 35682:return Sw;case 35679:case 36299:case 36307:return ww;case 35680:case 36300:case 36308:case 36293:return Ew;case 36289:case 36303:case 36311:case 36292:return Tw}}var Of=class{constructor(t,n,i){this.id=t,this.addr=i,this.cache=[],this.type=n.type,this.setValue=aw(n.type)}},Nf=class{constructor(t,n,i){this.id=t,this.addr=i,this.cache=[],this.type=n.type,this.size=n.size,this.setValue=Aw(n.type)}},Ff=class{constructor(t){this.id=t,this.seq=[],this.map={}}setValue(t,n,i){let r=this.seq;for(let s=0,o=r.length;s!==o;++s){let a=r[s];a.setValue(t,n[a.id],i)}}},Lf=/(\w+)(\])?(\[|\.)?/g;function mg(e,t){e.seq.push(t),e.map[t.id]=t}function Cw(e,t,n){let i=e.name,r=i.length;for(Lf.lastIndex=0;;){let s=Lf.exec(i),o=Lf.lastIndex,a=s[1],c=s[2]==="]",l=s[3];if(c&&(a=a|0),l===void 0||l==="["&&o+2===r){mg(n,l===void 0?new Of(a,e,t):new Nf(a,e,t));break}else{let h=n.map[a];h===void 0&&(h=new Ff(a),mg(n,h)),n=h}}}var Fs=class{constructor(t,n){this.seq=[],this.map={};let i=t.getProgramParameter(n,t.ACTIVE_UNIFORMS);for(let r=0;r<i;++r){let s=t.getActiveUniform(n,r),o=t.getUniformLocation(n,s.name);Cw(s,o,this)}}setValue(t,n,i,r){let s=this.map[n];s!==void 0&&s.setValue(t,i,r)}setOptional(t,n,i){let r=n[i];r!==void 0&&this.setValue(t,i,r)}static upload(t,n,i,r){for(let s=0,o=n.length;s!==o;++s){let a=n[s],c=i[a.id];c.needsUpdate!==!1&&a.setValue(t,c.value,r)}}static seqWithValue(t,n){let i=[];for(let r=0,s=t.length;r!==s;++r){let o=t[r];o.id in n&&i.push(o)}return i}};function gg(e,t,n){let i=e.createShader(t);return e.shaderSource(i,n),e.compileShader(i),i}var Rw=37297,Pw=0;function Iw(e,t){let n=e.split(`
`),i=[],r=Math.max(t-6,0),s=Math.min(t+6,n.length);for(let o=r;o<s;o++){let a=o+1;i.push(`${a===t?">":" "} ${a}: ${n[o]}`)}return i.join(`
`)}var _g=new Xt;function Dw(e){ee._getMatrix(_g,ee.workingColorSpace,e);let t=`mat3( ${_g.elements.map(n=>n.toFixed(4))} )`;switch(ee.getTransfer(e)){case wo:return[t,"LinearTransferOETF"];case ae:return[t,"sRGBTransferOETF"];default:return console.warn("THREE.WebGLProgram: Unsupported color space: ",e),[t,"LinearTransferOETF"]}}function vg(e,t,n){let i=e.getShaderParameter(t,e.COMPILE_STATUS),s=(e.getShaderInfoLog(t)||"").trim();if(i&&s==="")return"";let o=/ERROR: 0:(\d+)/.exec(s);if(o){let a=parseInt(o[1]);return n.toUpperCase()+`

`+s+`

`+Iw(e.getShaderSource(t),a)}else return s}function Lw(e,t){let n=Dw(t);return[`vec4 ${e}( vec4 value ) {`,`	return ${n[1]}( vec4( value.rgb * ${n[0]}, value.a ) );`,"}"].join(`
`)}function Ow(e,t){let n;switch(t){case ol:n="Linear";break;case al:n="Reinhard";break;case cl:n="Cineon";break;case ll:n="ACESFilmic";break;case ul:n="AgX";break;case fl:n="Neutral";break;case hl:n="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",t),n="Linear"}return"vec3 "+e+"( vec3 color ) { return "+n+"ToneMapping( color ); }"}var Ql=new I;function Nw(){ee.getLuminanceCoefficients(Ql);let e=Ql.x.toFixed(4),t=Ql.y.toFixed(4),n=Ql.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${e}, ${t}, ${n} );`,"	return dot( weights, rgb );","}"].join(`
`)}function Fw(e){return[e.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",e.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(ra).join(`
`)}function Uw(e){let t=[];for(let n in e){let i=e[n];i!==!1&&t.push("#define "+n+" "+i)}return t.join(`
`)}function zw(e,t){let n={},i=e.getProgramParameter(t,e.ACTIVE_ATTRIBUTES);for(let r=0;r<i;r++){let s=e.getActiveAttrib(t,r),o=s.name,a=1;s.type===e.FLOAT_MAT2&&(a=2),s.type===e.FLOAT_MAT3&&(a=3),s.type===e.FLOAT_MAT4&&(a=4),n[o]={type:s.type,location:e.getAttribLocation(t,o),locationSize:a}}return n}function ra(e){return e!==""}function yg(e,t){let n=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return e.replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,n).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows)}function xg(e,t){return e.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}var kw=/^[ \t]*#include +<([\w\d./]+)>/gm;function Uf(e){return e.replace(kw,Vw)}var Bw=new Map;function Vw(e,t){let n=Jt[t];if(n===void 0){let i=Bw.get(t);if(i!==void 0)n=Jt[i],console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',t,i);else throw new Error("Can not resolve #include <"+t+">")}return Uf(n)}var Hw=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function bg(e){return e.replace(Hw,Gw)}function Gw(e,t,n,i){let r="";for(let s=parseInt(t);s<parseInt(n);s++)r+=i.replace(/\[\s*i\s*\]/g,"[ "+s+" ]").replace(/UNROLLED_LOOP_INDEX/g,s);return r}function Mg(e){let t=`precision ${e.precision} float;
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
#define LOW_PRECISION`),t}function Ww(e){let t="SHADOWMAP_TYPE_BASIC";return e.shadowMapType===af?t="SHADOWMAP_TYPE_PCF":e.shadowMapType===xm?t="SHADOWMAP_TYPE_PCF_SOFT":e.shadowMapType===ui&&(t="SHADOWMAP_TYPE_VSM"),t}function jw(e){let t="ENVMAP_TYPE_CUBE";if(e.envMap)switch(e.envMapMode){case Pr:case Ir:t="ENVMAP_TYPE_CUBE";break;case Jo:t="ENVMAP_TYPE_CUBE_UV";break}return t}function qw(e){let t="ENVMAP_MODE_REFLECTION";return e.envMap&&e.envMapMode===Ir&&(t="ENVMAP_MODE_REFRACTION"),t}function Xw(e){let t="ENVMAP_BLENDING_NONE";if(e.envMap)switch(e.combine){case sl:t="ENVMAP_BLENDING_MULTIPLY";break;case km:t="ENVMAP_BLENDING_MIX";break;case Bm:t="ENVMAP_BLENDING_ADD";break}return t}function $w(e){let t=e.envMapCubeUVHeight;if(t===null)return null;let n=Math.log2(t)-2,i=1/t;return{texelWidth:1/(3*Math.max(Math.pow(2,n),112)),texelHeight:i,maxMip:n}}function Yw(e,t,n,i){let r=e.getContext(),s=n.defines,o=n.vertexShader,a=n.fragmentShader,c=Ww(n),l=jw(n),u=qw(n),h=Xw(n),f=$w(n),d=Fw(n),m=Uw(s),_=r.createProgram(),g,p,b=n.glslVersion?"#version "+n.glslVersion+`
`:"";n.isRawShaderMaterial?(g=["#define SHADER_TYPE "+n.shaderType,"#define SHADER_NAME "+n.shaderName,m].filter(ra).join(`
`),g.length>0&&(g+=`
`),p=["#define SHADER_TYPE "+n.shaderType,"#define SHADER_NAME "+n.shaderName,m].filter(ra).join(`
`),p.length>0&&(p+=`
`)):(g=[Mg(n),"#define SHADER_TYPE "+n.shaderType,"#define SHADER_NAME "+n.shaderName,m,n.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",n.batching?"#define USE_BATCHING":"",n.batchingColor?"#define USE_BATCHING_COLOR":"",n.instancing?"#define USE_INSTANCING":"",n.instancingColor?"#define USE_INSTANCING_COLOR":"",n.instancingMorph?"#define USE_INSTANCING_MORPH":"",n.useFog&&n.fog?"#define USE_FOG":"",n.useFog&&n.fogExp2?"#define FOG_EXP2":"",n.map?"#define USE_MAP":"",n.envMap?"#define USE_ENVMAP":"",n.envMap?"#define "+u:"",n.lightMap?"#define USE_LIGHTMAP":"",n.aoMap?"#define USE_AOMAP":"",n.bumpMap?"#define USE_BUMPMAP":"",n.normalMap?"#define USE_NORMALMAP":"",n.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",n.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",n.displacementMap?"#define USE_DISPLACEMENTMAP":"",n.emissiveMap?"#define USE_EMISSIVEMAP":"",n.anisotropy?"#define USE_ANISOTROPY":"",n.anisotropyMap?"#define USE_ANISOTROPYMAP":"",n.clearcoatMap?"#define USE_CLEARCOATMAP":"",n.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",n.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",n.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",n.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",n.specularMap?"#define USE_SPECULARMAP":"",n.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",n.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",n.roughnessMap?"#define USE_ROUGHNESSMAP":"",n.metalnessMap?"#define USE_METALNESSMAP":"",n.alphaMap?"#define USE_ALPHAMAP":"",n.alphaHash?"#define USE_ALPHAHASH":"",n.transmission?"#define USE_TRANSMISSION":"",n.transmissionMap?"#define USE_TRANSMISSIONMAP":"",n.thicknessMap?"#define USE_THICKNESSMAP":"",n.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",n.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",n.mapUv?"#define MAP_UV "+n.mapUv:"",n.alphaMapUv?"#define ALPHAMAP_UV "+n.alphaMapUv:"",n.lightMapUv?"#define LIGHTMAP_UV "+n.lightMapUv:"",n.aoMapUv?"#define AOMAP_UV "+n.aoMapUv:"",n.emissiveMapUv?"#define EMISSIVEMAP_UV "+n.emissiveMapUv:"",n.bumpMapUv?"#define BUMPMAP_UV "+n.bumpMapUv:"",n.normalMapUv?"#define NORMALMAP_UV "+n.normalMapUv:"",n.displacementMapUv?"#define DISPLACEMENTMAP_UV "+n.displacementMapUv:"",n.metalnessMapUv?"#define METALNESSMAP_UV "+n.metalnessMapUv:"",n.roughnessMapUv?"#define ROUGHNESSMAP_UV "+n.roughnessMapUv:"",n.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+n.anisotropyMapUv:"",n.clearcoatMapUv?"#define CLEARCOATMAP_UV "+n.clearcoatMapUv:"",n.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+n.clearcoatNormalMapUv:"",n.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+n.clearcoatRoughnessMapUv:"",n.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+n.iridescenceMapUv:"",n.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+n.iridescenceThicknessMapUv:"",n.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+n.sheenColorMapUv:"",n.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+n.sheenRoughnessMapUv:"",n.specularMapUv?"#define SPECULARMAP_UV "+n.specularMapUv:"",n.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+n.specularColorMapUv:"",n.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+n.specularIntensityMapUv:"",n.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+n.transmissionMapUv:"",n.thicknessMapUv?"#define THICKNESSMAP_UV "+n.thicknessMapUv:"",n.vertexTangents&&n.flatShading===!1?"#define USE_TANGENT":"",n.vertexColors?"#define USE_COLOR":"",n.vertexAlphas?"#define USE_COLOR_ALPHA":"",n.vertexUv1s?"#define USE_UV1":"",n.vertexUv2s?"#define USE_UV2":"",n.vertexUv3s?"#define USE_UV3":"",n.pointsUvs?"#define USE_POINTS_UV":"",n.flatShading?"#define FLAT_SHADED":"",n.skinning?"#define USE_SKINNING":"",n.morphTargets?"#define USE_MORPHTARGETS":"",n.morphNormals&&n.flatShading===!1?"#define USE_MORPHNORMALS":"",n.morphColors?"#define USE_MORPHCOLORS":"",n.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+n.morphTextureStride:"",n.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+n.morphTargetsCount:"",n.doubleSided?"#define DOUBLE_SIDED":"",n.flipSided?"#define FLIP_SIDED":"",n.shadowMapEnabled?"#define USE_SHADOWMAP":"",n.shadowMapEnabled?"#define "+c:"",n.sizeAttenuation?"#define USE_SIZEATTENUATION":"",n.numLightProbes>0?"#define USE_LIGHT_PROBES":"",n.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",n.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(ra).join(`
`),p=[Mg(n),"#define SHADER_TYPE "+n.shaderType,"#define SHADER_NAME "+n.shaderName,m,n.useFog&&n.fog?"#define USE_FOG":"",n.useFog&&n.fogExp2?"#define FOG_EXP2":"",n.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",n.map?"#define USE_MAP":"",n.matcap?"#define USE_MATCAP":"",n.envMap?"#define USE_ENVMAP":"",n.envMap?"#define "+l:"",n.envMap?"#define "+u:"",n.envMap?"#define "+h:"",f?"#define CUBEUV_TEXEL_WIDTH "+f.texelWidth:"",f?"#define CUBEUV_TEXEL_HEIGHT "+f.texelHeight:"",f?"#define CUBEUV_MAX_MIP "+f.maxMip+".0":"",n.lightMap?"#define USE_LIGHTMAP":"",n.aoMap?"#define USE_AOMAP":"",n.bumpMap?"#define USE_BUMPMAP":"",n.normalMap?"#define USE_NORMALMAP":"",n.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",n.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",n.emissiveMap?"#define USE_EMISSIVEMAP":"",n.anisotropy?"#define USE_ANISOTROPY":"",n.anisotropyMap?"#define USE_ANISOTROPYMAP":"",n.clearcoat?"#define USE_CLEARCOAT":"",n.clearcoatMap?"#define USE_CLEARCOATMAP":"",n.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",n.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",n.dispersion?"#define USE_DISPERSION":"",n.iridescence?"#define USE_IRIDESCENCE":"",n.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",n.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",n.specularMap?"#define USE_SPECULARMAP":"",n.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",n.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",n.roughnessMap?"#define USE_ROUGHNESSMAP":"",n.metalnessMap?"#define USE_METALNESSMAP":"",n.alphaMap?"#define USE_ALPHAMAP":"",n.alphaTest?"#define USE_ALPHATEST":"",n.alphaHash?"#define USE_ALPHAHASH":"",n.sheen?"#define USE_SHEEN":"",n.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",n.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",n.transmission?"#define USE_TRANSMISSION":"",n.transmissionMap?"#define USE_TRANSMISSIONMAP":"",n.thicknessMap?"#define USE_THICKNESSMAP":"",n.vertexTangents&&n.flatShading===!1?"#define USE_TANGENT":"",n.vertexColors||n.instancingColor||n.batchingColor?"#define USE_COLOR":"",n.vertexAlphas?"#define USE_COLOR_ALPHA":"",n.vertexUv1s?"#define USE_UV1":"",n.vertexUv2s?"#define USE_UV2":"",n.vertexUv3s?"#define USE_UV3":"",n.pointsUvs?"#define USE_POINTS_UV":"",n.gradientMap?"#define USE_GRADIENTMAP":"",n.flatShading?"#define FLAT_SHADED":"",n.doubleSided?"#define DOUBLE_SIDED":"",n.flipSided?"#define FLIP_SIDED":"",n.shadowMapEnabled?"#define USE_SHADOWMAP":"",n.shadowMapEnabled?"#define "+c:"",n.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",n.numLightProbes>0?"#define USE_LIGHT_PROBES":"",n.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",n.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",n.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",n.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",n.toneMapping!==Di?"#define TONE_MAPPING":"",n.toneMapping!==Di?Jt.tonemapping_pars_fragment:"",n.toneMapping!==Di?Ow("toneMapping",n.toneMapping):"",n.dithering?"#define DITHERING":"",n.opaque?"#define OPAQUE":"",Jt.colorspace_pars_fragment,Lw("linearToOutputTexel",n.outputColorSpace),Nw(),n.useDepthPacking?"#define DEPTH_PACKING "+n.depthPacking:"",`
`].filter(ra).join(`
`)),o=Uf(o),o=yg(o,n),o=xg(o,n),a=Uf(a),a=yg(a,n),a=xg(a,n),o=bg(o),a=bg(a),n.isRawShaderMaterial!==!0&&(b=`#version 300 es
`,g=[d,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+g,p=["#define varying in",n.glslVersion===xf?"":"layout(location = 0) out highp vec4 pc_fragColor;",n.glslVersion===xf?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+p);let x=b+g+o,v=b+p+a,M=gg(r,r.VERTEX_SHADER,x),S=gg(r,r.FRAGMENT_SHADER,v);r.attachShader(_,M),r.attachShader(_,S),n.index0AttributeName!==void 0?r.bindAttribLocation(_,0,n.index0AttributeName):n.morphTargets===!0&&r.bindAttribLocation(_,0,"position"),r.linkProgram(_);function C(R){if(e.debug.checkShaderErrors){let V=r.getProgramInfoLog(_)||"",N=r.getShaderInfoLog(M)||"",z=r.getShaderInfoLog(S)||"",U=V.trim(),G=N.trim(),K=z.trim(),q=!0,ot=!0;if(r.getProgramParameter(_,r.LINK_STATUS)===!1)if(q=!1,typeof e.debug.onShaderError=="function")e.debug.onShaderError(r,_,M,S);else{let gt=vg(r,M,"vertex"),Y=vg(r,S,"fragment");console.error("THREE.WebGLProgram: Shader Error "+r.getError()+" - VALIDATE_STATUS "+r.getProgramParameter(_,r.VALIDATE_STATUS)+`

Material Name: `+R.name+`
Material Type: `+R.type+`

Program Info Log: `+U+`
`+gt+`
`+Y)}else U!==""?console.warn("THREE.WebGLProgram: Program Info Log:",U):(G===""||K==="")&&(ot=!1);ot&&(R.diagnostics={runnable:q,programLog:U,vertexShader:{log:G,prefix:g},fragmentShader:{log:K,prefix:p}})}r.deleteShader(M),r.deleteShader(S),P=new Fs(r,_),T=zw(r,_)}let P;this.getUniforms=function(){return P===void 0&&C(this),P};let T;this.getAttributes=function(){return T===void 0&&C(this),T};let w=n.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return w===!1&&(w=r.getProgramParameter(_,Rw)),w},this.destroy=function(){i.releaseStatesOfProgram(this),r.deleteProgram(_),this.program=void 0},this.type=n.shaderType,this.name=n.shaderName,this.id=Pw++,this.cacheKey=t,this.usedTimes=1,this.program=_,this.vertexShader=M,this.fragmentShader=S,this}var Zw=0,zf=class{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(t){let n=t.vertexShader,i=t.fragmentShader,r=this._getShaderStage(n),s=this._getShaderStage(i),o=this._getShaderCacheForMaterial(t);return o.has(r)===!1&&(o.add(r),r.usedTimes++),o.has(s)===!1&&(o.add(s),s.usedTimes++),this}remove(t){let n=this.materialCache.get(t);for(let i of n)i.usedTimes--,i.usedTimes===0&&this.shaderCache.delete(i.code);return this.materialCache.delete(t),this}getVertexShaderID(t){return this._getShaderStage(t.vertexShader).id}getFragmentShaderID(t){return this._getShaderStage(t.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(t){let n=this.materialCache,i=n.get(t);return i===void 0&&(i=new Set,n.set(t,i)),i}_getShaderStage(t){let n=this.shaderCache,i=n.get(t);return i===void 0&&(i=new kf(t),n.set(t,i)),i}},kf=class{constructor(t){this.id=Zw++,this.code=t,this.usedTimes=0}};function Kw(e,t,n,i,r,s,o){let a=new bs,c=new zf,l=new Set,u=[],h=r.logarithmicDepthBuffer,f=r.vertexTextures,d=r.precision,m={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function _(T){return l.add(T),T===0?"uv":`uv${T}`}function g(T,w,R,V,N){let z=V.fog,U=N.geometry,G=T.isMeshStandardMaterial?V.environment:null,K=(T.isMeshStandardMaterial?n:t).get(T.envMap||G),q=K&&K.mapping===Jo?K.image.height:null,ot=m[T.type];T.precision!==null&&(d=r.getMaxPrecision(T.precision),d!==T.precision&&console.warn("THREE.WebGLProgram.getParameters:",T.precision,"not supported, using",d,"instead."));let gt=U.morphAttributes.position||U.morphAttributes.normal||U.morphAttributes.color,Y=gt!==void 0?gt.length:0,it=0;U.morphAttributes.position!==void 0&&(it=1),U.morphAttributes.normal!==void 0&&(it=2),U.morphAttributes.color!==void 0&&(it=3);let dt,zt,Lt,$;if(ot){let se=pi[ot];dt=se.vertexShader,zt=se.fragmentShader}else dt=T.vertexShader,zt=T.fragmentShader,c.update(T),Lt=c.getVertexShaderID(T),$=c.getFragmentShaderID(T);let Q=e.getRenderTarget(),yt=e.state.buffers.depth.getReversed(),Bt=N.isInstancedMesh===!0,It=N.isBatchedMesh===!0,Qt=!!T.map,Re=!!T.matcap,k=!!K,xe=!!T.aoMap,Gt=!!T.lightMap,kt=!!T.bumpMap,wt=!!T.normalMap,_e=!!T.displacementMap,Tt=!!T.emissiveMap,jt=!!T.metalnessMap,Ie=!!T.roughnessMap,Ae=T.anisotropy>0,D=T.clearcoat>0,E=T.dispersion>0,W=T.iridescence>0,J=T.sheen>0,rt=T.transmission>0,Z=Ae&&!!T.anisotropyMap,Rt=D&&!!T.clearcoatMap,ht=D&&!!T.clearcoatNormalMap,Et=D&&!!T.clearcoatRoughnessMap,At=W&&!!T.iridescenceMap,st=W&&!!T.iridescenceThicknessMap,_t=J&&!!T.sheenColorMap,Ft=J&&!!T.sheenRoughnessMap,Mt=!!T.specularMap,pt=!!T.specularColorMap,Wt=!!T.specularIntensityMap,H=rt&&!!T.transmissionMap,lt=rt&&!!T.thicknessMap,ft=!!T.gradientMap,xt=!!T.alphaMap,at=T.alphaTest>0,tt=!!T.alphaHash,bt=!!T.extensions,Ht=Di;T.toneMapped&&(Q===null||Q.isXRRenderTarget===!0)&&(Ht=e.toneMapping);let he={shaderID:ot,shaderType:T.type,shaderName:T.name,vertexShader:dt,fragmentShader:zt,defines:T.defines,customVertexShaderID:Lt,customFragmentShaderID:$,isRawShaderMaterial:T.isRawShaderMaterial===!0,glslVersion:T.glslVersion,precision:d,batching:It,batchingColor:It&&N._colorsTexture!==null,instancing:Bt,instancingColor:Bt&&N.instanceColor!==null,instancingMorph:Bt&&N.morphTexture!==null,supportsVertexTextures:f,outputColorSpace:Q===null?e.outputColorSpace:Q.isXRRenderTarget===!0?Q.texture.colorSpace:Er,alphaToCoverage:!!T.alphaToCoverage,map:Qt,matcap:Re,envMap:k,envMapMode:k&&K.mapping,envMapCubeUVHeight:q,aoMap:xe,lightMap:Gt,bumpMap:kt,normalMap:wt,displacementMap:f&&_e,emissiveMap:Tt,normalMapObjectSpace:wt&&T.normalMapType===Wm,normalMapTangentSpace:wt&&T.normalMapType===Zl,metalnessMap:jt,roughnessMap:Ie,anisotropy:Ae,anisotropyMap:Z,clearcoat:D,clearcoatMap:Rt,clearcoatNormalMap:ht,clearcoatRoughnessMap:Et,dispersion:E,iridescence:W,iridescenceMap:At,iridescenceThicknessMap:st,sheen:J,sheenColorMap:_t,sheenRoughnessMap:Ft,specularMap:Mt,specularColorMap:pt,specularIntensityMap:Wt,transmission:rt,transmissionMap:H,thicknessMap:lt,gradientMap:ft,opaque:T.transparent===!1&&T.blending===Sr&&T.alphaToCoverage===!1,alphaMap:xt,alphaTest:at,alphaHash:tt,combine:T.combine,mapUv:Qt&&_(T.map.channel),aoMapUv:xe&&_(T.aoMap.channel),lightMapUv:Gt&&_(T.lightMap.channel),bumpMapUv:kt&&_(T.bumpMap.channel),normalMapUv:wt&&_(T.normalMap.channel),displacementMapUv:_e&&_(T.displacementMap.channel),emissiveMapUv:Tt&&_(T.emissiveMap.channel),metalnessMapUv:jt&&_(T.metalnessMap.channel),roughnessMapUv:Ie&&_(T.roughnessMap.channel),anisotropyMapUv:Z&&_(T.anisotropyMap.channel),clearcoatMapUv:Rt&&_(T.clearcoatMap.channel),clearcoatNormalMapUv:ht&&_(T.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:Et&&_(T.clearcoatRoughnessMap.channel),iridescenceMapUv:At&&_(T.iridescenceMap.channel),iridescenceThicknessMapUv:st&&_(T.iridescenceThicknessMap.channel),sheenColorMapUv:_t&&_(T.sheenColorMap.channel),sheenRoughnessMapUv:Ft&&_(T.sheenRoughnessMap.channel),specularMapUv:Mt&&_(T.specularMap.channel),specularColorMapUv:pt&&_(T.specularColorMap.channel),specularIntensityMapUv:Wt&&_(T.specularIntensityMap.channel),transmissionMapUv:H&&_(T.transmissionMap.channel),thicknessMapUv:lt&&_(T.thicknessMap.channel),alphaMapUv:xt&&_(T.alphaMap.channel),vertexTangents:!!U.attributes.tangent&&(wt||Ae),vertexColors:T.vertexColors,vertexAlphas:T.vertexColors===!0&&!!U.attributes.color&&U.attributes.color.itemSize===4,pointsUvs:N.isPoints===!0&&!!U.attributes.uv&&(Qt||xt),fog:!!z,useFog:T.fog===!0,fogExp2:!!z&&z.isFogExp2,flatShading:T.flatShading===!0&&T.wireframe===!1,sizeAttenuation:T.sizeAttenuation===!0,logarithmicDepthBuffer:h,reversedDepthBuffer:yt,skinning:N.isSkinnedMesh===!0,morphTargets:U.morphAttributes.position!==void 0,morphNormals:U.morphAttributes.normal!==void 0,morphColors:U.morphAttributes.color!==void 0,morphTargetsCount:Y,morphTextureStride:it,numDirLights:w.directional.length,numPointLights:w.point.length,numSpotLights:w.spot.length,numSpotLightMaps:w.spotLightMap.length,numRectAreaLights:w.rectArea.length,numHemiLights:w.hemi.length,numDirLightShadows:w.directionalShadowMap.length,numPointLightShadows:w.pointShadowMap.length,numSpotLightShadows:w.spotShadowMap.length,numSpotLightShadowsWithMaps:w.numSpotLightShadowsWithMaps,numLightProbes:w.numLightProbes,numClippingPlanes:o.numPlanes,numClipIntersection:o.numIntersection,dithering:T.dithering,shadowMapEnabled:e.shadowMap.enabled&&R.length>0,shadowMapType:e.shadowMap.type,toneMapping:Ht,decodeVideoTexture:Qt&&T.map.isVideoTexture===!0&&ee.getTransfer(T.map.colorSpace)===ae,decodeVideoTextureEmissive:Tt&&T.emissiveMap.isVideoTexture===!0&&ee.getTransfer(T.emissiveMap.colorSpace)===ae,premultipliedAlpha:T.premultipliedAlpha,doubleSided:T.side===fi,flipSided:T.side===We,useDepthPacking:T.depthPacking>=0,depthPacking:T.depthPacking||0,index0AttributeName:T.index0AttributeName,extensionClipCullDistance:bt&&T.extensions.clipCullDistance===!0&&i.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(bt&&T.extensions.multiDraw===!0||It)&&i.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:i.has("KHR_parallel_shader_compile"),customProgramCacheKey:T.customProgramCacheKey()};return he.vertexUv1s=l.has(1),he.vertexUv2s=l.has(2),he.vertexUv3s=l.has(3),l.clear(),he}function p(T){let w=[];if(T.shaderID?w.push(T.shaderID):(w.push(T.customVertexShaderID),w.push(T.customFragmentShaderID)),T.defines!==void 0)for(let R in T.defines)w.push(R),w.push(T.defines[R]);return T.isRawShaderMaterial===!1&&(b(w,T),x(w,T),w.push(e.outputColorSpace)),w.push(T.customProgramCacheKey),w.join()}function b(T,w){T.push(w.precision),T.push(w.outputColorSpace),T.push(w.envMapMode),T.push(w.envMapCubeUVHeight),T.push(w.mapUv),T.push(w.alphaMapUv),T.push(w.lightMapUv),T.push(w.aoMapUv),T.push(w.bumpMapUv),T.push(w.normalMapUv),T.push(w.displacementMapUv),T.push(w.emissiveMapUv),T.push(w.metalnessMapUv),T.push(w.roughnessMapUv),T.push(w.anisotropyMapUv),T.push(w.clearcoatMapUv),T.push(w.clearcoatNormalMapUv),T.push(w.clearcoatRoughnessMapUv),T.push(w.iridescenceMapUv),T.push(w.iridescenceThicknessMapUv),T.push(w.sheenColorMapUv),T.push(w.sheenRoughnessMapUv),T.push(w.specularMapUv),T.push(w.specularColorMapUv),T.push(w.specularIntensityMapUv),T.push(w.transmissionMapUv),T.push(w.thicknessMapUv),T.push(w.combine),T.push(w.fogExp2),T.push(w.sizeAttenuation),T.push(w.morphTargetsCount),T.push(w.morphAttributeCount),T.push(w.numDirLights),T.push(w.numPointLights),T.push(w.numSpotLights),T.push(w.numSpotLightMaps),T.push(w.numHemiLights),T.push(w.numRectAreaLights),T.push(w.numDirLightShadows),T.push(w.numPointLightShadows),T.push(w.numSpotLightShadows),T.push(w.numSpotLightShadowsWithMaps),T.push(w.numLightProbes),T.push(w.shadowMapType),T.push(w.toneMapping),T.push(w.numClippingPlanes),T.push(w.numClipIntersection),T.push(w.depthPacking)}function x(T,w){a.disableAll(),w.supportsVertexTextures&&a.enable(0),w.instancing&&a.enable(1),w.instancingColor&&a.enable(2),w.instancingMorph&&a.enable(3),w.matcap&&a.enable(4),w.envMap&&a.enable(5),w.normalMapObjectSpace&&a.enable(6),w.normalMapTangentSpace&&a.enable(7),w.clearcoat&&a.enable(8),w.iridescence&&a.enable(9),w.alphaTest&&a.enable(10),w.vertexColors&&a.enable(11),w.vertexAlphas&&a.enable(12),w.vertexUv1s&&a.enable(13),w.vertexUv2s&&a.enable(14),w.vertexUv3s&&a.enable(15),w.vertexTangents&&a.enable(16),w.anisotropy&&a.enable(17),w.alphaHash&&a.enable(18),w.batching&&a.enable(19),w.dispersion&&a.enable(20),w.batchingColor&&a.enable(21),w.gradientMap&&a.enable(22),T.push(a.mask),a.disableAll(),w.fog&&a.enable(0),w.useFog&&a.enable(1),w.flatShading&&a.enable(2),w.logarithmicDepthBuffer&&a.enable(3),w.reversedDepthBuffer&&a.enable(4),w.skinning&&a.enable(5),w.morphTargets&&a.enable(6),w.morphNormals&&a.enable(7),w.morphColors&&a.enable(8),w.premultipliedAlpha&&a.enable(9),w.shadowMapEnabled&&a.enable(10),w.doubleSided&&a.enable(11),w.flipSided&&a.enable(12),w.useDepthPacking&&a.enable(13),w.dithering&&a.enable(14),w.transmission&&a.enable(15),w.sheen&&a.enable(16),w.opaque&&a.enable(17),w.pointsUvs&&a.enable(18),w.decodeVideoTexture&&a.enable(19),w.decodeVideoTextureEmissive&&a.enable(20),w.alphaToCoverage&&a.enable(21),T.push(a.mask)}function v(T){let w=m[T.type],R;if(w){let V=pi[w];R=Oi.clone(V.uniforms)}else R=T.uniforms;return R}function M(T,w){let R;for(let V=0,N=u.length;V<N;V++){let z=u[V];if(z.cacheKey===w){R=z,++R.usedTimes;break}}return R===void 0&&(R=new Yw(e,w,T,s),u.push(R)),R}function S(T){if(--T.usedTimes===0){let w=u.indexOf(T);u[w]=u[u.length-1],u.pop(),T.destroy()}}function C(T){c.remove(T)}function P(){c.dispose()}return{getParameters:g,getProgramCacheKey:p,getUniforms:v,acquireProgram:M,releaseProgram:S,releaseShaderCache:C,programs:u,dispose:P}}function Jw(){let e=new WeakMap;function t(o){return e.has(o)}function n(o){let a=e.get(o);return a===void 0&&(a={},e.set(o,a)),a}function i(o){e.delete(o)}function r(o,a,c){e.get(o)[a]=c}function s(){e=new WeakMap}return{has:t,get:n,remove:i,update:r,dispose:s}}function Qw(e,t){return e.groupOrder!==t.groupOrder?e.groupOrder-t.groupOrder:e.renderOrder!==t.renderOrder?e.renderOrder-t.renderOrder:e.material.id!==t.material.id?e.material.id-t.material.id:e.z!==t.z?e.z-t.z:e.id-t.id}function Sg(e,t){return e.groupOrder!==t.groupOrder?e.groupOrder-t.groupOrder:e.renderOrder!==t.renderOrder?e.renderOrder-t.renderOrder:e.z!==t.z?t.z-e.z:e.id-t.id}function wg(){let e=[],t=0,n=[],i=[],r=[];function s(){t=0,n.length=0,i.length=0,r.length=0}function o(h,f,d,m,_,g){let p=e[t];return p===void 0?(p={id:h.id,object:h,geometry:f,material:d,groupOrder:m,renderOrder:h.renderOrder,z:_,group:g},e[t]=p):(p.id=h.id,p.object=h,p.geometry=f,p.material=d,p.groupOrder=m,p.renderOrder=h.renderOrder,p.z=_,p.group=g),t++,p}function a(h,f,d,m,_,g){let p=o(h,f,d,m,_,g);d.transmission>0?i.push(p):d.transparent===!0?r.push(p):n.push(p)}function c(h,f,d,m,_,g){let p=o(h,f,d,m,_,g);d.transmission>0?i.unshift(p):d.transparent===!0?r.unshift(p):n.unshift(p)}function l(h,f){n.length>1&&n.sort(h||Qw),i.length>1&&i.sort(f||Sg),r.length>1&&r.sort(f||Sg)}function u(){for(let h=t,f=e.length;h<f;h++){let d=e[h];if(d.id===null)break;d.id=null,d.object=null,d.geometry=null,d.material=null,d.group=null}}return{opaque:n,transmissive:i,transparent:r,init:s,push:a,unshift:c,finish:u,sort:l}}function tE(){let e=new WeakMap;function t(i,r){let s=e.get(i),o;return s===void 0?(o=new wg,e.set(i,[o])):r>=s.length?(o=new wg,s.push(o)):o=s[r],o}function n(){e=new WeakMap}return{get:t,dispose:n}}function eE(){let e={};return{get:function(t){if(e[t.id]!==void 0)return e[t.id];let n;switch(t.type){case"DirectionalLight":n={direction:new I,color:new Ot};break;case"SpotLight":n={position:new I,direction:new I,color:new Ot,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":n={position:new I,color:new Ot,distance:0,decay:0};break;case"HemisphereLight":n={direction:new I,skyColor:new Ot,groundColor:new Ot};break;case"RectAreaLight":n={color:new Ot,position:new I,halfWidth:new I,halfHeight:new I};break}return e[t.id]=n,n}}}function nE(){let e={};return{get:function(t){if(e[t.id]!==void 0)return e[t.id];let n;switch(t.type){case"DirectionalLight":n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new et};break;case"SpotLight":n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new et};break;case"PointLight":n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new et,shadowCameraNear:1,shadowCameraFar:1e3};break}return e[t.id]=n,n}}}var iE=0;function rE(e,t){return(t.castShadow?2:0)-(e.castShadow?2:0)+(t.map?1:0)-(e.map?1:0)}function sE(e){let t=new eE,n=nE(),i={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let l=0;l<9;l++)i.probe.push(new I);let r=new I,s=new Vt,o=new Vt;function a(l){let u=0,h=0,f=0;for(let T=0;T<9;T++)i.probe[T].set(0,0,0);let d=0,m=0,_=0,g=0,p=0,b=0,x=0,v=0,M=0,S=0,C=0;l.sort(rE);for(let T=0,w=l.length;T<w;T++){let R=l[T],V=R.color,N=R.intensity,z=R.distance,U=R.shadow&&R.shadow.map?R.shadow.map.texture:null;if(R.isAmbientLight)u+=V.r*N,h+=V.g*N,f+=V.b*N;else if(R.isLightProbe){for(let G=0;G<9;G++)i.probe[G].addScaledVector(R.sh.coefficients[G],N);C++}else if(R.isDirectionalLight){let G=t.get(R);if(G.color.copy(R.color).multiplyScalar(R.intensity),R.castShadow){let K=R.shadow,q=n.get(R);q.shadowIntensity=K.intensity,q.shadowBias=K.bias,q.shadowNormalBias=K.normalBias,q.shadowRadius=K.radius,q.shadowMapSize=K.mapSize,i.directionalShadow[d]=q,i.directionalShadowMap[d]=U,i.directionalShadowMatrix[d]=R.shadow.matrix,b++}i.directional[d]=G,d++}else if(R.isSpotLight){let G=t.get(R);G.position.setFromMatrixPosition(R.matrixWorld),G.color.copy(V).multiplyScalar(N),G.distance=z,G.coneCos=Math.cos(R.angle),G.penumbraCos=Math.cos(R.angle*(1-R.penumbra)),G.decay=R.decay,i.spot[_]=G;let K=R.shadow;if(R.map&&(i.spotLightMap[M]=R.map,M++,K.updateMatrices(R),R.castShadow&&S++),i.spotLightMatrix[_]=K.matrix,R.castShadow){let q=n.get(R);q.shadowIntensity=K.intensity,q.shadowBias=K.bias,q.shadowNormalBias=K.normalBias,q.shadowRadius=K.radius,q.shadowMapSize=K.mapSize,i.spotShadow[_]=q,i.spotShadowMap[_]=U,v++}_++}else if(R.isRectAreaLight){let G=t.get(R);G.color.copy(V).multiplyScalar(N),G.halfWidth.set(R.width*.5,0,0),G.halfHeight.set(0,R.height*.5,0),i.rectArea[g]=G,g++}else if(R.isPointLight){let G=t.get(R);if(G.color.copy(R.color).multiplyScalar(R.intensity),G.distance=R.distance,G.decay=R.decay,R.castShadow){let K=R.shadow,q=n.get(R);q.shadowIntensity=K.intensity,q.shadowBias=K.bias,q.shadowNormalBias=K.normalBias,q.shadowRadius=K.radius,q.shadowMapSize=K.mapSize,q.shadowCameraNear=K.camera.near,q.shadowCameraFar=K.camera.far,i.pointShadow[m]=q,i.pointShadowMap[m]=U,i.pointShadowMatrix[m]=R.shadow.matrix,x++}i.point[m]=G,m++}else if(R.isHemisphereLight){let G=t.get(R);G.skyColor.copy(R.color).multiplyScalar(N),G.groundColor.copy(R.groundColor).multiplyScalar(N),i.hemi[p]=G,p++}}g>0&&(e.has("OES_texture_float_linear")===!0?(i.rectAreaLTC1=mt.LTC_FLOAT_1,i.rectAreaLTC2=mt.LTC_FLOAT_2):(i.rectAreaLTC1=mt.LTC_HALF_1,i.rectAreaLTC2=mt.LTC_HALF_2)),i.ambient[0]=u,i.ambient[1]=h,i.ambient[2]=f;let P=i.hash;(P.directionalLength!==d||P.pointLength!==m||P.spotLength!==_||P.rectAreaLength!==g||P.hemiLength!==p||P.numDirectionalShadows!==b||P.numPointShadows!==x||P.numSpotShadows!==v||P.numSpotMaps!==M||P.numLightProbes!==C)&&(i.directional.length=d,i.spot.length=_,i.rectArea.length=g,i.point.length=m,i.hemi.length=p,i.directionalShadow.length=b,i.directionalShadowMap.length=b,i.pointShadow.length=x,i.pointShadowMap.length=x,i.spotShadow.length=v,i.spotShadowMap.length=v,i.directionalShadowMatrix.length=b,i.pointShadowMatrix.length=x,i.spotLightMatrix.length=v+M-S,i.spotLightMap.length=M,i.numSpotLightShadowsWithMaps=S,i.numLightProbes=C,P.directionalLength=d,P.pointLength=m,P.spotLength=_,P.rectAreaLength=g,P.hemiLength=p,P.numDirectionalShadows=b,P.numPointShadows=x,P.numSpotShadows=v,P.numSpotMaps=M,P.numLightProbes=C,i.version=iE++)}function c(l,u){let h=0,f=0,d=0,m=0,_=0,g=u.matrixWorldInverse;for(let p=0,b=l.length;p<b;p++){let x=l[p];if(x.isDirectionalLight){let v=i.directional[h];v.direction.setFromMatrixPosition(x.matrixWorld),r.setFromMatrixPosition(x.target.matrixWorld),v.direction.sub(r),v.direction.transformDirection(g),h++}else if(x.isSpotLight){let v=i.spot[d];v.position.setFromMatrixPosition(x.matrixWorld),v.position.applyMatrix4(g),v.direction.setFromMatrixPosition(x.matrixWorld),r.setFromMatrixPosition(x.target.matrixWorld),v.direction.sub(r),v.direction.transformDirection(g),d++}else if(x.isRectAreaLight){let v=i.rectArea[m];v.position.setFromMatrixPosition(x.matrixWorld),v.position.applyMatrix4(g),o.identity(),s.copy(x.matrixWorld),s.premultiply(g),o.extractRotation(s),v.halfWidth.set(x.width*.5,0,0),v.halfHeight.set(0,x.height*.5,0),v.halfWidth.applyMatrix4(o),v.halfHeight.applyMatrix4(o),m++}else if(x.isPointLight){let v=i.point[f];v.position.setFromMatrixPosition(x.matrixWorld),v.position.applyMatrix4(g),f++}else if(x.isHemisphereLight){let v=i.hemi[_];v.direction.setFromMatrixPosition(x.matrixWorld),v.direction.transformDirection(g),_++}}}return{setup:a,setupView:c,state:i}}function Eg(e){let t=new sE(e),n=[],i=[];function r(u){l.camera=u,n.length=0,i.length=0}function s(u){n.push(u)}function o(u){i.push(u)}function a(){t.setup(n)}function c(u){t.setupView(n,u)}let l={lightsArray:n,shadowsArray:i,camera:null,lights:t,transmissionRenderTarget:{}};return{init:r,state:l,setupLights:a,setupLightsView:c,pushLight:s,pushShadow:o}}function oE(e){let t=new WeakMap;function n(r,s=0){let o=t.get(r),a;return o===void 0?(a=new Eg(e),t.set(r,[a])):s>=o.length?(a=new Eg(e),o.push(a)):a=o[s],a}function i(){t=new WeakMap}return{get:n,dispose:i}}var aE=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,cE=`uniform sampler2D shadow_pass;
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
}`;function lE(e,t,n){let i=new ws,r=new et,s=new et,o=new de,a=new kc({depthPacking:Gm}),c=new Bc,l={},u=n.maxTextureSize,h={[Ci]:We,[We]:Ci,[fi]:fi},f=new Le({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new et},radius:{value:4}},vertexShader:aE,fragmentShader:cE}),d=f.clone();d.defines.HORIZONTAL_PASS=1;let m=new ve;m.setAttribute("position",new Ye(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let _=new we(m,f),g=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=af;let p=this.type;this.render=function(S,C,P){if(g.enabled===!1||g.autoUpdate===!1&&g.needsUpdate===!1||S.length===0)return;let T=e.getRenderTarget(),w=e.getActiveCubeFace(),R=e.getActiveMipmapLevel(),V=e.state;V.setBlending(Kn),V.buffers.depth.getReversed()===!0?V.buffers.color.setClear(0,0,0,0):V.buffers.color.setClear(1,1,1,1),V.buffers.depth.setTest(!0),V.setScissorTest(!1);let N=p!==ui&&this.type===ui,z=p===ui&&this.type!==ui;for(let U=0,G=S.length;U<G;U++){let K=S[U],q=K.shadow;if(q===void 0){console.warn("THREE.WebGLShadowMap:",K,"has no shadow.");continue}if(q.autoUpdate===!1&&q.needsUpdate===!1)continue;r.copy(q.mapSize);let ot=q.getFrameExtents();if(r.multiply(ot),s.copy(q.mapSize),(r.x>u||r.y>u)&&(r.x>u&&(s.x=Math.floor(u/ot.x),r.x=s.x*ot.x,q.mapSize.x=s.x),r.y>u&&(s.y=Math.floor(u/ot.y),r.y=s.y*ot.y,q.mapSize.y=s.y)),q.map===null||N===!0||z===!0){let Y=this.type!==ui?{minFilter:Dn,magFilter:Dn}:{};q.map!==null&&q.map.dispose(),q.map=new Ze(r.x,r.y,Y),q.map.texture.name=K.name+".shadowMap",q.camera.updateProjectionMatrix()}e.setRenderTarget(q.map),e.clear();let gt=q.getViewportCount();for(let Y=0;Y<gt;Y++){let it=q.getViewport(Y);o.set(s.x*it.x,s.y*it.y,s.x*it.z,s.y*it.w),V.viewport(o),q.updateMatrices(K,Y),i=q.getFrustum(),v(C,P,q.camera,K,this.type)}q.isPointLightShadow!==!0&&this.type===ui&&b(q,P),q.needsUpdate=!1}p=this.type,g.needsUpdate=!1,e.setRenderTarget(T,w,R)};function b(S,C){let P=t.update(_);f.defines.VSM_SAMPLES!==S.blurSamples&&(f.defines.VSM_SAMPLES=S.blurSamples,d.defines.VSM_SAMPLES=S.blurSamples,f.needsUpdate=!0,d.needsUpdate=!0),S.mapPass===null&&(S.mapPass=new Ze(r.x,r.y)),f.uniforms.shadow_pass.value=S.map.texture,f.uniforms.resolution.value=S.mapSize,f.uniforms.radius.value=S.radius,e.setRenderTarget(S.mapPass),e.clear(),e.renderBufferDirect(C,null,P,f,_,null),d.uniforms.shadow_pass.value=S.mapPass.texture,d.uniforms.resolution.value=S.mapSize,d.uniforms.radius.value=S.radius,e.setRenderTarget(S.map),e.clear(),e.renderBufferDirect(C,null,P,d,_,null)}function x(S,C,P,T){let w=null,R=P.isPointLight===!0?S.customDistanceMaterial:S.customDepthMaterial;if(R!==void 0)w=R;else if(w=P.isPointLight===!0?c:a,e.localClippingEnabled&&C.clipShadows===!0&&Array.isArray(C.clippingPlanes)&&C.clippingPlanes.length!==0||C.displacementMap&&C.displacementScale!==0||C.alphaMap&&C.alphaTest>0||C.map&&C.alphaTest>0||C.alphaToCoverage===!0){let V=w.uuid,N=C.uuid,z=l[V];z===void 0&&(z={},l[V]=z);let U=z[N];U===void 0&&(U=w.clone(),z[N]=U,C.addEventListener("dispose",M)),w=U}if(w.visible=C.visible,w.wireframe=C.wireframe,T===ui?w.side=C.shadowSide!==null?C.shadowSide:C.side:w.side=C.shadowSide!==null?C.shadowSide:h[C.side],w.alphaMap=C.alphaMap,w.alphaTest=C.alphaToCoverage===!0?.5:C.alphaTest,w.map=C.map,w.clipShadows=C.clipShadows,w.clippingPlanes=C.clippingPlanes,w.clipIntersection=C.clipIntersection,w.displacementMap=C.displacementMap,w.displacementScale=C.displacementScale,w.displacementBias=C.displacementBias,w.wireframeLinewidth=C.wireframeLinewidth,w.linewidth=C.linewidth,P.isPointLight===!0&&w.isMeshDistanceMaterial===!0){let V=e.properties.get(w);V.light=P}return w}function v(S,C,P,T,w){if(S.visible===!1)return;if(S.layers.test(C.layers)&&(S.isMesh||S.isLine||S.isPoints)&&(S.castShadow||S.receiveShadow&&w===ui)&&(!S.frustumCulled||i.intersectsObject(S))){S.modelViewMatrix.multiplyMatrices(P.matrixWorldInverse,S.matrixWorld);let N=t.update(S),z=S.material;if(Array.isArray(z)){let U=N.groups;for(let G=0,K=U.length;G<K;G++){let q=U[G],ot=z[q.materialIndex];if(ot&&ot.visible){let gt=x(S,ot,T,w);S.onBeforeShadow(e,S,C,P,N,gt,q),e.renderBufferDirect(P,null,N,gt,S,q),S.onAfterShadow(e,S,C,P,N,gt,q)}}}else if(z.visible){let U=x(S,z,T,w);S.onBeforeShadow(e,S,C,P,N,U,null),e.renderBufferDirect(P,null,N,U,S,null),S.onAfterShadow(e,S,C,P,N,U,null)}}let V=S.children;for(let N=0,z=V.length;N<z;N++)v(V[N],C,P,T,w)}function M(S){S.target.removeEventListener("dispose",M);for(let P in l){let T=l[P],w=S.target.uuid;w in T&&(T[w].dispose(),delete T[w])}}}var hE={[Jc]:Qc,[tl]:il,[el]:rl,[wr]:nl,[Qc]:Jc,[il]:tl,[rl]:el,[nl]:wr};function uE(e,t){function n(){let H=!1,lt=new de,ft=null,xt=new de(0,0,0,0);return{setMask:function(at){ft!==at&&!H&&(e.colorMask(at,at,at,at),ft=at)},setLocked:function(at){H=at},setClear:function(at,tt,bt,Ht,he){he===!0&&(at*=Ht,tt*=Ht,bt*=Ht),lt.set(at,tt,bt,Ht),xt.equals(lt)===!1&&(e.clearColor(at,tt,bt,Ht),xt.copy(lt))},reset:function(){H=!1,ft=null,xt.set(-1,0,0,0)}}}function i(){let H=!1,lt=!1,ft=null,xt=null,at=null;return{setReversed:function(tt){if(lt!==tt){let bt=t.get("EXT_clip_control");tt?bt.clipControlEXT(bt.LOWER_LEFT_EXT,bt.ZERO_TO_ONE_EXT):bt.clipControlEXT(bt.LOWER_LEFT_EXT,bt.NEGATIVE_ONE_TO_ONE_EXT),lt=tt;let Ht=at;at=null,this.setClear(Ht)}},getReversed:function(){return lt},setTest:function(tt){tt?Q(e.DEPTH_TEST):yt(e.DEPTH_TEST)},setMask:function(tt){ft!==tt&&!H&&(e.depthMask(tt),ft=tt)},setFunc:function(tt){if(lt&&(tt=hE[tt]),xt!==tt){switch(tt){case Jc:e.depthFunc(e.NEVER);break;case Qc:e.depthFunc(e.ALWAYS);break;case tl:e.depthFunc(e.LESS);break;case wr:e.depthFunc(e.LEQUAL);break;case el:e.depthFunc(e.EQUAL);break;case nl:e.depthFunc(e.GEQUAL);break;case il:e.depthFunc(e.GREATER);break;case rl:e.depthFunc(e.NOTEQUAL);break;default:e.depthFunc(e.LEQUAL)}xt=tt}},setLocked:function(tt){H=tt},setClear:function(tt){at!==tt&&(lt&&(tt=1-tt),e.clearDepth(tt),at=tt)},reset:function(){H=!1,ft=null,xt=null,at=null,lt=!1}}}function r(){let H=!1,lt=null,ft=null,xt=null,at=null,tt=null,bt=null,Ht=null,he=null;return{setTest:function(se){H||(se?Q(e.STENCIL_TEST):yt(e.STENCIL_TEST))},setMask:function(se){lt!==se&&!H&&(e.stencilMask(se),lt=se)},setFunc:function(se,Gn,en){(ft!==se||xt!==Gn||at!==en)&&(e.stencilFunc(se,Gn,en),ft=se,xt=Gn,at=en)},setOp:function(se,Gn,en){(tt!==se||bt!==Gn||Ht!==en)&&(e.stencilOp(se,Gn,en),tt=se,bt=Gn,Ht=en)},setLocked:function(se){H=se},setClear:function(se){he!==se&&(e.clearStencil(se),he=se)},reset:function(){H=!1,lt=null,ft=null,xt=null,at=null,tt=null,bt=null,Ht=null,he=null}}}let s=new n,o=new i,a=new r,c=new WeakMap,l=new WeakMap,u={},h={},f=new WeakMap,d=[],m=null,_=!1,g=null,p=null,b=null,x=null,v=null,M=null,S=null,C=new Ot(0,0,0),P=0,T=!1,w=null,R=null,V=null,N=null,z=null,U=e.getParameter(e.MAX_COMBINED_TEXTURE_IMAGE_UNITS),G=!1,K=0,q=e.getParameter(e.VERSION);q.indexOf("WebGL")!==-1?(K=parseFloat(/^WebGL (\d)/.exec(q)[1]),G=K>=1):q.indexOf("OpenGL ES")!==-1&&(K=parseFloat(/^OpenGL ES (\d)/.exec(q)[1]),G=K>=2);let ot=null,gt={},Y=e.getParameter(e.SCISSOR_BOX),it=e.getParameter(e.VIEWPORT),dt=new de().fromArray(Y),zt=new de().fromArray(it);function Lt(H,lt,ft,xt){let at=new Uint8Array(4),tt=e.createTexture();e.bindTexture(H,tt),e.texParameteri(H,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(H,e.TEXTURE_MAG_FILTER,e.NEAREST);for(let bt=0;bt<ft;bt++)H===e.TEXTURE_3D||H===e.TEXTURE_2D_ARRAY?e.texImage3D(lt,0,e.RGBA,1,1,xt,0,e.RGBA,e.UNSIGNED_BYTE,at):e.texImage2D(lt+bt,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,at);return tt}let $={};$[e.TEXTURE_2D]=Lt(e.TEXTURE_2D,e.TEXTURE_2D,1),$[e.TEXTURE_CUBE_MAP]=Lt(e.TEXTURE_CUBE_MAP,e.TEXTURE_CUBE_MAP_POSITIVE_X,6),$[e.TEXTURE_2D_ARRAY]=Lt(e.TEXTURE_2D_ARRAY,e.TEXTURE_2D_ARRAY,1,1),$[e.TEXTURE_3D]=Lt(e.TEXTURE_3D,e.TEXTURE_3D,1,1),s.setClear(0,0,0,1),o.setClear(1),a.setClear(0),Q(e.DEPTH_TEST),o.setFunc(wr),kt(!1),wt(of),Q(e.CULL_FACE),xe(Kn);function Q(H){u[H]!==!0&&(e.enable(H),u[H]=!0)}function yt(H){u[H]!==!1&&(e.disable(H),u[H]=!1)}function Bt(H,lt){return h[H]!==lt?(e.bindFramebuffer(H,lt),h[H]=lt,H===e.DRAW_FRAMEBUFFER&&(h[e.FRAMEBUFFER]=lt),H===e.FRAMEBUFFER&&(h[e.DRAW_FRAMEBUFFER]=lt),!0):!1}function It(H,lt){let ft=d,xt=!1;if(H){ft=f.get(lt),ft===void 0&&(ft=[],f.set(lt,ft));let at=H.textures;if(ft.length!==at.length||ft[0]!==e.COLOR_ATTACHMENT0){for(let tt=0,bt=at.length;tt<bt;tt++)ft[tt]=e.COLOR_ATTACHMENT0+tt;ft.length=at.length,xt=!0}}else ft[0]!==e.BACK&&(ft[0]=e.BACK,xt=!0);xt&&e.drawBuffers(ft)}function Qt(H){return m!==H?(e.useProgram(H),m=H,!0):!1}let Re={[Xi]:e.FUNC_ADD,[Mm]:e.FUNC_SUBTRACT,[Sm]:e.FUNC_REVERSE_SUBTRACT};Re[wm]=e.MIN,Re[Em]=e.MAX;let k={[Tm]:e.ZERO,[Am]:e.ONE,[Cm]:e.SRC_COLOR,[_c]:e.SRC_ALPHA,[Om]:e.SRC_ALPHA_SATURATE,[Dm]:e.DST_COLOR,[Pm]:e.DST_ALPHA,[Rm]:e.ONE_MINUS_SRC_COLOR,[vc]:e.ONE_MINUS_SRC_ALPHA,[Lm]:e.ONE_MINUS_DST_COLOR,[Im]:e.ONE_MINUS_DST_ALPHA,[Nm]:e.CONSTANT_COLOR,[Fm]:e.ONE_MINUS_CONSTANT_COLOR,[Um]:e.CONSTANT_ALPHA,[zm]:e.ONE_MINUS_CONSTANT_ALPHA};function xe(H,lt,ft,xt,at,tt,bt,Ht,he,se){if(H===Kn){_===!0&&(yt(e.BLEND),_=!1);return}if(_===!1&&(Q(e.BLEND),_=!0),H!==bm){if(H!==g||se!==T){if((p!==Xi||v!==Xi)&&(e.blendEquation(e.FUNC_ADD),p=Xi,v=Xi),se)switch(H){case Sr:e.blendFuncSeparate(e.ONE,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA);break;case Zi:e.blendFunc(e.ONE,e.ONE);break;case cf:e.blendFuncSeparate(e.ZERO,e.ONE_MINUS_SRC_COLOR,e.ZERO,e.ONE);break;case lf:e.blendFuncSeparate(e.DST_COLOR,e.ONE_MINUS_SRC_ALPHA,e.ZERO,e.ONE);break;default:console.error("THREE.WebGLState: Invalid blending: ",H);break}else switch(H){case Sr:e.blendFuncSeparate(e.SRC_ALPHA,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA);break;case Zi:e.blendFuncSeparate(e.SRC_ALPHA,e.ONE,e.ONE,e.ONE);break;case cf:console.error("THREE.WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case lf:console.error("THREE.WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:console.error("THREE.WebGLState: Invalid blending: ",H);break}b=null,x=null,M=null,S=null,C.set(0,0,0),P=0,g=H,T=se}return}at=at||lt,tt=tt||ft,bt=bt||xt,(lt!==p||at!==v)&&(e.blendEquationSeparate(Re[lt],Re[at]),p=lt,v=at),(ft!==b||xt!==x||tt!==M||bt!==S)&&(e.blendFuncSeparate(k[ft],k[xt],k[tt],k[bt]),b=ft,x=xt,M=tt,S=bt),(Ht.equals(C)===!1||he!==P)&&(e.blendColor(Ht.r,Ht.g,Ht.b,he),C.copy(Ht),P=he),g=H,T=!1}function Gt(H,lt){H.side===fi?yt(e.CULL_FACE):Q(e.CULL_FACE);let ft=H.side===We;lt&&(ft=!ft),kt(ft),H.blending===Sr&&H.transparent===!1?xe(Kn):xe(H.blending,H.blendEquation,H.blendSrc,H.blendDst,H.blendEquationAlpha,H.blendSrcAlpha,H.blendDstAlpha,H.blendColor,H.blendAlpha,H.premultipliedAlpha),o.setFunc(H.depthFunc),o.setTest(H.depthTest),o.setMask(H.depthWrite),s.setMask(H.colorWrite);let xt=H.stencilWrite;a.setTest(xt),xt&&(a.setMask(H.stencilWriteMask),a.setFunc(H.stencilFunc,H.stencilRef,H.stencilFuncMask),a.setOp(H.stencilFail,H.stencilZFail,H.stencilZPass)),Tt(H.polygonOffset,H.polygonOffsetFactor,H.polygonOffsetUnits),H.alphaToCoverage===!0?Q(e.SAMPLE_ALPHA_TO_COVERAGE):yt(e.SAMPLE_ALPHA_TO_COVERAGE)}function kt(H){w!==H&&(H?e.frontFace(e.CW):e.frontFace(e.CCW),w=H)}function wt(H){H!==vm?(Q(e.CULL_FACE),H!==R&&(H===of?e.cullFace(e.BACK):H===ym?e.cullFace(e.FRONT):e.cullFace(e.FRONT_AND_BACK))):yt(e.CULL_FACE),R=H}function _e(H){H!==V&&(G&&e.lineWidth(H),V=H)}function Tt(H,lt,ft){H?(Q(e.POLYGON_OFFSET_FILL),(N!==lt||z!==ft)&&(e.polygonOffset(lt,ft),N=lt,z=ft)):yt(e.POLYGON_OFFSET_FILL)}function jt(H){H?Q(e.SCISSOR_TEST):yt(e.SCISSOR_TEST)}function Ie(H){H===void 0&&(H=e.TEXTURE0+U-1),ot!==H&&(e.activeTexture(H),ot=H)}function Ae(H,lt,ft){ft===void 0&&(ot===null?ft=e.TEXTURE0+U-1:ft=ot);let xt=gt[ft];xt===void 0&&(xt={type:void 0,texture:void 0},gt[ft]=xt),(xt.type!==H||xt.texture!==lt)&&(ot!==ft&&(e.activeTexture(ft),ot=ft),e.bindTexture(H,lt||$[H]),xt.type=H,xt.texture=lt)}function D(){let H=gt[ot];H!==void 0&&H.type!==void 0&&(e.bindTexture(H.type,null),H.type=void 0,H.texture=void 0)}function E(){try{e.compressedTexImage2D(...arguments)}catch(H){console.error("THREE.WebGLState:",H)}}function W(){try{e.compressedTexImage3D(...arguments)}catch(H){console.error("THREE.WebGLState:",H)}}function J(){try{e.texSubImage2D(...arguments)}catch(H){console.error("THREE.WebGLState:",H)}}function rt(){try{e.texSubImage3D(...arguments)}catch(H){console.error("THREE.WebGLState:",H)}}function Z(){try{e.compressedTexSubImage2D(...arguments)}catch(H){console.error("THREE.WebGLState:",H)}}function Rt(){try{e.compressedTexSubImage3D(...arguments)}catch(H){console.error("THREE.WebGLState:",H)}}function ht(){try{e.texStorage2D(...arguments)}catch(H){console.error("THREE.WebGLState:",H)}}function Et(){try{e.texStorage3D(...arguments)}catch(H){console.error("THREE.WebGLState:",H)}}function At(){try{e.texImage2D(...arguments)}catch(H){console.error("THREE.WebGLState:",H)}}function st(){try{e.texImage3D(...arguments)}catch(H){console.error("THREE.WebGLState:",H)}}function _t(H){dt.equals(H)===!1&&(e.scissor(H.x,H.y,H.z,H.w),dt.copy(H))}function Ft(H){zt.equals(H)===!1&&(e.viewport(H.x,H.y,H.z,H.w),zt.copy(H))}function Mt(H,lt){let ft=l.get(lt);ft===void 0&&(ft=new WeakMap,l.set(lt,ft));let xt=ft.get(H);xt===void 0&&(xt=e.getUniformBlockIndex(lt,H.name),ft.set(H,xt))}function pt(H,lt){let xt=l.get(lt).get(H);c.get(lt)!==xt&&(e.uniformBlockBinding(lt,xt,H.__bindingPointIndex),c.set(lt,xt))}function Wt(){e.disable(e.BLEND),e.disable(e.CULL_FACE),e.disable(e.DEPTH_TEST),e.disable(e.POLYGON_OFFSET_FILL),e.disable(e.SCISSOR_TEST),e.disable(e.STENCIL_TEST),e.disable(e.SAMPLE_ALPHA_TO_COVERAGE),e.blendEquation(e.FUNC_ADD),e.blendFunc(e.ONE,e.ZERO),e.blendFuncSeparate(e.ONE,e.ZERO,e.ONE,e.ZERO),e.blendColor(0,0,0,0),e.colorMask(!0,!0,!0,!0),e.clearColor(0,0,0,0),e.depthMask(!0),e.depthFunc(e.LESS),o.setReversed(!1),e.clearDepth(1),e.stencilMask(4294967295),e.stencilFunc(e.ALWAYS,0,4294967295),e.stencilOp(e.KEEP,e.KEEP,e.KEEP),e.clearStencil(0),e.cullFace(e.BACK),e.frontFace(e.CCW),e.polygonOffset(0,0),e.activeTexture(e.TEXTURE0),e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindFramebuffer(e.DRAW_FRAMEBUFFER,null),e.bindFramebuffer(e.READ_FRAMEBUFFER,null),e.useProgram(null),e.lineWidth(1),e.scissor(0,0,e.canvas.width,e.canvas.height),e.viewport(0,0,e.canvas.width,e.canvas.height),u={},ot=null,gt={},h={},f=new WeakMap,d=[],m=null,_=!1,g=null,p=null,b=null,x=null,v=null,M=null,S=null,C=new Ot(0,0,0),P=0,T=!1,w=null,R=null,V=null,N=null,z=null,dt.set(0,0,e.canvas.width,e.canvas.height),zt.set(0,0,e.canvas.width,e.canvas.height),s.reset(),o.reset(),a.reset()}return{buffers:{color:s,depth:o,stencil:a},enable:Q,disable:yt,bindFramebuffer:Bt,drawBuffers:It,useProgram:Qt,setBlending:xe,setMaterial:Gt,setFlipSided:kt,setCullFace:wt,setLineWidth:_e,setPolygonOffset:Tt,setScissorTest:jt,activeTexture:Ie,bindTexture:Ae,unbindTexture:D,compressedTexImage2D:E,compressedTexImage3D:W,texImage2D:At,texImage3D:st,updateUBOMapping:Mt,uniformBlockBinding:pt,texStorage2D:ht,texStorage3D:Et,texSubImage2D:J,texSubImage3D:rt,compressedTexSubImage2D:Z,compressedTexSubImage3D:Rt,scissor:_t,viewport:Ft,reset:Wt}}function fE(e,t,n,i,r,s,o){let a=t.has("WEBGL_multisampled_render_to_texture")?t.get("WEBGL_multisampled_render_to_texture"):null,c=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),l=new et,u=new WeakMap,h,f=new WeakMap,d=!1;try{d=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function m(D,E){return d?new OffscreenCanvas(D,E):vs("canvas")}function _(D,E,W){let J=1,rt=Ae(D);if((rt.width>W||rt.height>W)&&(J=W/Math.max(rt.width,rt.height)),J<1)if(typeof HTMLImageElement<"u"&&D instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&D instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&D instanceof ImageBitmap||typeof VideoFrame<"u"&&D instanceof VideoFrame){let Z=Math.floor(J*rt.width),Rt=Math.floor(J*rt.height);h===void 0&&(h=m(Z,Rt));let ht=E?m(Z,Rt):h;return ht.width=Z,ht.height=Rt,ht.getContext("2d").drawImage(D,0,0,Z,Rt),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+rt.width+"x"+rt.height+") to ("+Z+"x"+Rt+")."),ht}else return"data"in D&&console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+rt.width+"x"+rt.height+")."),D;return D}function g(D){return D.generateMipmaps}function p(D){e.generateMipmap(D)}function b(D){return D.isWebGLCubeRenderTarget?e.TEXTURE_CUBE_MAP:D.isWebGL3DRenderTarget?e.TEXTURE_3D:D.isWebGLArrayRenderTarget||D.isCompressedArrayTexture?e.TEXTURE_2D_ARRAY:e.TEXTURE_2D}function x(D,E,W,J,rt=!1){if(D!==null){if(e[D]!==void 0)return e[D];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+D+"'")}let Z=E;if(E===e.RED&&(W===e.FLOAT&&(Z=e.R32F),W===e.HALF_FLOAT&&(Z=e.R16F),W===e.UNSIGNED_BYTE&&(Z=e.R8)),E===e.RED_INTEGER&&(W===e.UNSIGNED_BYTE&&(Z=e.R8UI),W===e.UNSIGNED_SHORT&&(Z=e.R16UI),W===e.UNSIGNED_INT&&(Z=e.R32UI),W===e.BYTE&&(Z=e.R8I),W===e.SHORT&&(Z=e.R16I),W===e.INT&&(Z=e.R32I)),E===e.RG&&(W===e.FLOAT&&(Z=e.RG32F),W===e.HALF_FLOAT&&(Z=e.RG16F),W===e.UNSIGNED_BYTE&&(Z=e.RG8)),E===e.RG_INTEGER&&(W===e.UNSIGNED_BYTE&&(Z=e.RG8UI),W===e.UNSIGNED_SHORT&&(Z=e.RG16UI),W===e.UNSIGNED_INT&&(Z=e.RG32UI),W===e.BYTE&&(Z=e.RG8I),W===e.SHORT&&(Z=e.RG16I),W===e.INT&&(Z=e.RG32I)),E===e.RGB_INTEGER&&(W===e.UNSIGNED_BYTE&&(Z=e.RGB8UI),W===e.UNSIGNED_SHORT&&(Z=e.RGB16UI),W===e.UNSIGNED_INT&&(Z=e.RGB32UI),W===e.BYTE&&(Z=e.RGB8I),W===e.SHORT&&(Z=e.RGB16I),W===e.INT&&(Z=e.RGB32I)),E===e.RGBA_INTEGER&&(W===e.UNSIGNED_BYTE&&(Z=e.RGBA8UI),W===e.UNSIGNED_SHORT&&(Z=e.RGBA16UI),W===e.UNSIGNED_INT&&(Z=e.RGBA32UI),W===e.BYTE&&(Z=e.RGBA8I),W===e.SHORT&&(Z=e.RGBA16I),W===e.INT&&(Z=e.RGBA32I)),E===e.RGB&&(W===e.UNSIGNED_INT_5_9_9_9_REV&&(Z=e.RGB9_E5),W===e.UNSIGNED_INT_10F_11F_11F_REV&&(Z=e.R11F_G11F_B10F)),E===e.RGBA){let Rt=rt?wo:ee.getTransfer(J);W===e.FLOAT&&(Z=e.RGBA32F),W===e.HALF_FLOAT&&(Z=e.RGBA16F),W===e.UNSIGNED_BYTE&&(Z=Rt===ae?e.SRGB8_ALPHA8:e.RGBA8),W===e.UNSIGNED_SHORT_4_4_4_4&&(Z=e.RGBA4),W===e.UNSIGNED_SHORT_5_5_5_1&&(Z=e.RGB5_A1)}return(Z===e.R16F||Z===e.R32F||Z===e.RG16F||Z===e.RG32F||Z===e.RGBA16F||Z===e.RGBA32F)&&t.get("EXT_color_buffer_float"),Z}function v(D,E){let W;return D?E===null||E===Ji||E===Ds?W=e.DEPTH24_STENCIL8:E===di?W=e.DEPTH32F_STENCIL8:E===Is&&(W=e.DEPTH24_STENCIL8,console.warn("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):E===null||E===Ji||E===Ds?W=e.DEPTH_COMPONENT24:E===di?W=e.DEPTH_COMPONENT32F:E===Is&&(W=e.DEPTH_COMPONENT16),W}function M(D,E){return g(D)===!0||D.isFramebufferTexture&&D.minFilter!==Dn&&D.minFilter!==Yn?Math.log2(Math.max(E.width,E.height))+1:D.mipmaps!==void 0&&D.mipmaps.length>0?D.mipmaps.length:D.isCompressedTexture&&Array.isArray(D.image)?E.mipmaps.length:1}function S(D){let E=D.target;E.removeEventListener("dispose",S),P(E),E.isVideoTexture&&u.delete(E)}function C(D){let E=D.target;E.removeEventListener("dispose",C),w(E)}function P(D){let E=i.get(D);if(E.__webglInit===void 0)return;let W=D.source,J=f.get(W);if(J){let rt=J[E.__cacheKey];rt.usedTimes--,rt.usedTimes===0&&T(D),Object.keys(J).length===0&&f.delete(W)}i.remove(D)}function T(D){let E=i.get(D);e.deleteTexture(E.__webglTexture);let W=D.source,J=f.get(W);delete J[E.__cacheKey],o.memory.textures--}function w(D){let E=i.get(D);if(D.depthTexture&&(D.depthTexture.dispose(),i.remove(D.depthTexture)),D.isWebGLCubeRenderTarget)for(let J=0;J<6;J++){if(Array.isArray(E.__webglFramebuffer[J]))for(let rt=0;rt<E.__webglFramebuffer[J].length;rt++)e.deleteFramebuffer(E.__webglFramebuffer[J][rt]);else e.deleteFramebuffer(E.__webglFramebuffer[J]);E.__webglDepthbuffer&&e.deleteRenderbuffer(E.__webglDepthbuffer[J])}else{if(Array.isArray(E.__webglFramebuffer))for(let J=0;J<E.__webglFramebuffer.length;J++)e.deleteFramebuffer(E.__webglFramebuffer[J]);else e.deleteFramebuffer(E.__webglFramebuffer);if(E.__webglDepthbuffer&&e.deleteRenderbuffer(E.__webglDepthbuffer),E.__webglMultisampledFramebuffer&&e.deleteFramebuffer(E.__webglMultisampledFramebuffer),E.__webglColorRenderbuffer)for(let J=0;J<E.__webglColorRenderbuffer.length;J++)E.__webglColorRenderbuffer[J]&&e.deleteRenderbuffer(E.__webglColorRenderbuffer[J]);E.__webglDepthRenderbuffer&&e.deleteRenderbuffer(E.__webglDepthRenderbuffer)}let W=D.textures;for(let J=0,rt=W.length;J<rt;J++){let Z=i.get(W[J]);Z.__webglTexture&&(e.deleteTexture(Z.__webglTexture),o.memory.textures--),i.remove(W[J])}i.remove(D)}let R=0;function V(){R=0}function N(){let D=R;return D>=r.maxTextures&&console.warn("THREE.WebGLTextures: Trying to use "+D+" texture units while this GPU supports only "+r.maxTextures),R+=1,D}function z(D){let E=[];return E.push(D.wrapS),E.push(D.wrapT),E.push(D.wrapR||0),E.push(D.magFilter),E.push(D.minFilter),E.push(D.anisotropy),E.push(D.internalFormat),E.push(D.format),E.push(D.type),E.push(D.generateMipmaps),E.push(D.premultiplyAlpha),E.push(D.flipY),E.push(D.unpackAlignment),E.push(D.colorSpace),E.join()}function U(D,E){let W=i.get(D);if(D.isVideoTexture&&jt(D),D.isRenderTargetTexture===!1&&D.isExternalTexture!==!0&&D.version>0&&W.__version!==D.version){let J=D.image;if(J===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if(J.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{$(W,D,E);return}}else D.isExternalTexture&&(W.__webglTexture=D.sourceTexture?D.sourceTexture:null);n.bindTexture(e.TEXTURE_2D,W.__webglTexture,e.TEXTURE0+E)}function G(D,E){let W=i.get(D);if(D.isRenderTargetTexture===!1&&D.version>0&&W.__version!==D.version){$(W,D,E);return}n.bindTexture(e.TEXTURE_2D_ARRAY,W.__webglTexture,e.TEXTURE0+E)}function K(D,E){let W=i.get(D);if(D.isRenderTargetTexture===!1&&D.version>0&&W.__version!==D.version){$(W,D,E);return}n.bindTexture(e.TEXTURE_3D,W.__webglTexture,e.TEXTURE0+E)}function q(D,E){let W=i.get(D);if(D.version>0&&W.__version!==D.version){Q(W,D,E);return}n.bindTexture(e.TEXTURE_CUBE_MAP,W.__webglTexture,e.TEXTURE0+E)}let ot={[yc]:e.REPEAT,[qi]:e.CLAMP_TO_EDGE,[xc]:e.MIRRORED_REPEAT},gt={[Dn]:e.NEAREST,[Vm]:e.NEAREST_MIPMAP_NEAREST,[Qo]:e.NEAREST_MIPMAP_LINEAR,[Yn]:e.LINEAR,[ml]:e.LINEAR_MIPMAP_NEAREST,[Ki]:e.LINEAR_MIPMAP_LINEAR},Y={[jm]:e.NEVER,[Km]:e.ALWAYS,[qm]:e.LESS,[yf]:e.LEQUAL,[Xm]:e.EQUAL,[Zm]:e.GEQUAL,[$m]:e.GREATER,[Ym]:e.NOTEQUAL};function it(D,E){if(E.type===di&&t.has("OES_texture_float_linear")===!1&&(E.magFilter===Yn||E.magFilter===ml||E.magFilter===Qo||E.magFilter===Ki||E.minFilter===Yn||E.minFilter===ml||E.minFilter===Qo||E.minFilter===Ki)&&console.warn("THREE.WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),e.texParameteri(D,e.TEXTURE_WRAP_S,ot[E.wrapS]),e.texParameteri(D,e.TEXTURE_WRAP_T,ot[E.wrapT]),(D===e.TEXTURE_3D||D===e.TEXTURE_2D_ARRAY)&&e.texParameteri(D,e.TEXTURE_WRAP_R,ot[E.wrapR]),e.texParameteri(D,e.TEXTURE_MAG_FILTER,gt[E.magFilter]),e.texParameteri(D,e.TEXTURE_MIN_FILTER,gt[E.minFilter]),E.compareFunction&&(e.texParameteri(D,e.TEXTURE_COMPARE_MODE,e.COMPARE_REF_TO_TEXTURE),e.texParameteri(D,e.TEXTURE_COMPARE_FUNC,Y[E.compareFunction])),t.has("EXT_texture_filter_anisotropic")===!0){if(E.magFilter===Dn||E.minFilter!==Qo&&E.minFilter!==Ki||E.type===di&&t.has("OES_texture_float_linear")===!1)return;if(E.anisotropy>1||i.get(E).__currentAnisotropy){let W=t.get("EXT_texture_filter_anisotropic");e.texParameterf(D,W.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(E.anisotropy,r.getMaxAnisotropy())),i.get(E).__currentAnisotropy=E.anisotropy}}}function dt(D,E){let W=!1;D.__webglInit===void 0&&(D.__webglInit=!0,E.addEventListener("dispose",S));let J=E.source,rt=f.get(J);rt===void 0&&(rt={},f.set(J,rt));let Z=z(E);if(Z!==D.__cacheKey){rt[Z]===void 0&&(rt[Z]={texture:e.createTexture(),usedTimes:0},o.memory.textures++,W=!0),rt[Z].usedTimes++;let Rt=rt[D.__cacheKey];Rt!==void 0&&(rt[D.__cacheKey].usedTimes--,Rt.usedTimes===0&&T(E)),D.__cacheKey=Z,D.__webglTexture=rt[Z].texture}return W}function zt(D,E,W){return Math.floor(Math.floor(D/W)/E)}function Lt(D,E,W,J){let Z=D.updateRanges;if(Z.length===0)n.texSubImage2D(e.TEXTURE_2D,0,0,0,E.width,E.height,W,J,E.data);else{Z.sort((st,_t)=>st.start-_t.start);let Rt=0;for(let st=1;st<Z.length;st++){let _t=Z[Rt],Ft=Z[st],Mt=_t.start+_t.count,pt=zt(Ft.start,E.width,4),Wt=zt(_t.start,E.width,4);Ft.start<=Mt+1&&pt===Wt&&zt(Ft.start+Ft.count-1,E.width,4)===pt?_t.count=Math.max(_t.count,Ft.start+Ft.count-_t.start):(++Rt,Z[Rt]=Ft)}Z.length=Rt+1;let ht=e.getParameter(e.UNPACK_ROW_LENGTH),Et=e.getParameter(e.UNPACK_SKIP_PIXELS),At=e.getParameter(e.UNPACK_SKIP_ROWS);e.pixelStorei(e.UNPACK_ROW_LENGTH,E.width);for(let st=0,_t=Z.length;st<_t;st++){let Ft=Z[st],Mt=Math.floor(Ft.start/4),pt=Math.ceil(Ft.count/4),Wt=Mt%E.width,H=Math.floor(Mt/E.width),lt=pt,ft=1;e.pixelStorei(e.UNPACK_SKIP_PIXELS,Wt),e.pixelStorei(e.UNPACK_SKIP_ROWS,H),n.texSubImage2D(e.TEXTURE_2D,0,Wt,H,lt,ft,W,J,E.data)}D.clearUpdateRanges(),e.pixelStorei(e.UNPACK_ROW_LENGTH,ht),e.pixelStorei(e.UNPACK_SKIP_PIXELS,Et),e.pixelStorei(e.UNPACK_SKIP_ROWS,At)}}function $(D,E,W){let J=e.TEXTURE_2D;(E.isDataArrayTexture||E.isCompressedArrayTexture)&&(J=e.TEXTURE_2D_ARRAY),E.isData3DTexture&&(J=e.TEXTURE_3D);let rt=dt(D,E),Z=E.source;n.bindTexture(J,D.__webglTexture,e.TEXTURE0+W);let Rt=i.get(Z);if(Z.version!==Rt.__version||rt===!0){n.activeTexture(e.TEXTURE0+W);let ht=ee.getPrimaries(ee.workingColorSpace),Et=E.colorSpace===Li?null:ee.getPrimaries(E.colorSpace),At=E.colorSpace===Li||ht===Et?e.NONE:e.BROWSER_DEFAULT_WEBGL;e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,E.flipY),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,E.premultiplyAlpha),e.pixelStorei(e.UNPACK_ALIGNMENT,E.unpackAlignment),e.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,At);let st=_(E.image,!1,r.maxTextureSize);st=Ie(E,st);let _t=s.convert(E.format,E.colorSpace),Ft=s.convert(E.type),Mt=x(E.internalFormat,_t,Ft,E.colorSpace,E.isVideoTexture);it(J,E);let pt,Wt=E.mipmaps,H=E.isVideoTexture!==!0,lt=Rt.__version===void 0||rt===!0,ft=Z.dataReady,xt=M(E,st);if(E.isDepthTexture)Mt=v(E.format===Ls,E.type),lt&&(H?n.texStorage2D(e.TEXTURE_2D,1,Mt,st.width,st.height):n.texImage2D(e.TEXTURE_2D,0,Mt,st.width,st.height,0,_t,Ft,null));else if(E.isDataTexture)if(Wt.length>0){H&&lt&&n.texStorage2D(e.TEXTURE_2D,xt,Mt,Wt[0].width,Wt[0].height);for(let at=0,tt=Wt.length;at<tt;at++)pt=Wt[at],H?ft&&n.texSubImage2D(e.TEXTURE_2D,at,0,0,pt.width,pt.height,_t,Ft,pt.data):n.texImage2D(e.TEXTURE_2D,at,Mt,pt.width,pt.height,0,_t,Ft,pt.data);E.generateMipmaps=!1}else H?(lt&&n.texStorage2D(e.TEXTURE_2D,xt,Mt,st.width,st.height),ft&&Lt(E,st,_t,Ft)):n.texImage2D(e.TEXTURE_2D,0,Mt,st.width,st.height,0,_t,Ft,st.data);else if(E.isCompressedTexture)if(E.isCompressedArrayTexture){H&&lt&&n.texStorage3D(e.TEXTURE_2D_ARRAY,xt,Mt,Wt[0].width,Wt[0].height,st.depth);for(let at=0,tt=Wt.length;at<tt;at++)if(pt=Wt[at],E.format!==zn)if(_t!==null)if(H){if(ft)if(E.layerUpdates.size>0){let bt=Af(pt.width,pt.height,E.format,E.type);for(let Ht of E.layerUpdates){let he=pt.data.subarray(Ht*bt/pt.data.BYTES_PER_ELEMENT,(Ht+1)*bt/pt.data.BYTES_PER_ELEMENT);n.compressedTexSubImage3D(e.TEXTURE_2D_ARRAY,at,0,0,Ht,pt.width,pt.height,1,_t,he)}E.clearLayerUpdates()}else n.compressedTexSubImage3D(e.TEXTURE_2D_ARRAY,at,0,0,0,pt.width,pt.height,st.depth,_t,pt.data)}else n.compressedTexImage3D(e.TEXTURE_2D_ARRAY,at,Mt,pt.width,pt.height,st.depth,0,pt.data,0,0);else console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else H?ft&&n.texSubImage3D(e.TEXTURE_2D_ARRAY,at,0,0,0,pt.width,pt.height,st.depth,_t,Ft,pt.data):n.texImage3D(e.TEXTURE_2D_ARRAY,at,Mt,pt.width,pt.height,st.depth,0,_t,Ft,pt.data)}else{H&&lt&&n.texStorage2D(e.TEXTURE_2D,xt,Mt,Wt[0].width,Wt[0].height);for(let at=0,tt=Wt.length;at<tt;at++)pt=Wt[at],E.format!==zn?_t!==null?H?ft&&n.compressedTexSubImage2D(e.TEXTURE_2D,at,0,0,pt.width,pt.height,_t,pt.data):n.compressedTexImage2D(e.TEXTURE_2D,at,Mt,pt.width,pt.height,0,pt.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):H?ft&&n.texSubImage2D(e.TEXTURE_2D,at,0,0,pt.width,pt.height,_t,Ft,pt.data):n.texImage2D(e.TEXTURE_2D,at,Mt,pt.width,pt.height,0,_t,Ft,pt.data)}else if(E.isDataArrayTexture)if(H){if(lt&&n.texStorage3D(e.TEXTURE_2D_ARRAY,xt,Mt,st.width,st.height,st.depth),ft)if(E.layerUpdates.size>0){let at=Af(st.width,st.height,E.format,E.type);for(let tt of E.layerUpdates){let bt=st.data.subarray(tt*at/st.data.BYTES_PER_ELEMENT,(tt+1)*at/st.data.BYTES_PER_ELEMENT);n.texSubImage3D(e.TEXTURE_2D_ARRAY,0,0,0,tt,st.width,st.height,1,_t,Ft,bt)}E.clearLayerUpdates()}else n.texSubImage3D(e.TEXTURE_2D_ARRAY,0,0,0,0,st.width,st.height,st.depth,_t,Ft,st.data)}else n.texImage3D(e.TEXTURE_2D_ARRAY,0,Mt,st.width,st.height,st.depth,0,_t,Ft,st.data);else if(E.isData3DTexture)H?(lt&&n.texStorage3D(e.TEXTURE_3D,xt,Mt,st.width,st.height,st.depth),ft&&n.texSubImage3D(e.TEXTURE_3D,0,0,0,0,st.width,st.height,st.depth,_t,Ft,st.data)):n.texImage3D(e.TEXTURE_3D,0,Mt,st.width,st.height,st.depth,0,_t,Ft,st.data);else if(E.isFramebufferTexture){if(lt)if(H)n.texStorage2D(e.TEXTURE_2D,xt,Mt,st.width,st.height);else{let at=st.width,tt=st.height;for(let bt=0;bt<xt;bt++)n.texImage2D(e.TEXTURE_2D,bt,Mt,at,tt,0,_t,Ft,null),at>>=1,tt>>=1}}else if(Wt.length>0){if(H&&lt){let at=Ae(Wt[0]);n.texStorage2D(e.TEXTURE_2D,xt,Mt,at.width,at.height)}for(let at=0,tt=Wt.length;at<tt;at++)pt=Wt[at],H?ft&&n.texSubImage2D(e.TEXTURE_2D,at,0,0,_t,Ft,pt):n.texImage2D(e.TEXTURE_2D,at,Mt,_t,Ft,pt);E.generateMipmaps=!1}else if(H){if(lt){let at=Ae(st);n.texStorage2D(e.TEXTURE_2D,xt,Mt,at.width,at.height)}ft&&n.texSubImage2D(e.TEXTURE_2D,0,0,0,_t,Ft,st)}else n.texImage2D(e.TEXTURE_2D,0,Mt,_t,Ft,st);g(E)&&p(J),Rt.__version=Z.version,E.onUpdate&&E.onUpdate(E)}D.__version=E.version}function Q(D,E,W){if(E.image.length!==6)return;let J=dt(D,E),rt=E.source;n.bindTexture(e.TEXTURE_CUBE_MAP,D.__webglTexture,e.TEXTURE0+W);let Z=i.get(rt);if(rt.version!==Z.__version||J===!0){n.activeTexture(e.TEXTURE0+W);let Rt=ee.getPrimaries(ee.workingColorSpace),ht=E.colorSpace===Li?null:ee.getPrimaries(E.colorSpace),Et=E.colorSpace===Li||Rt===ht?e.NONE:e.BROWSER_DEFAULT_WEBGL;e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,E.flipY),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,E.premultiplyAlpha),e.pixelStorei(e.UNPACK_ALIGNMENT,E.unpackAlignment),e.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,Et);let At=E.isCompressedTexture||E.image[0].isCompressedTexture,st=E.image[0]&&E.image[0].isDataTexture,_t=[];for(let tt=0;tt<6;tt++)!At&&!st?_t[tt]=_(E.image[tt],!0,r.maxCubemapSize):_t[tt]=st?E.image[tt].image:E.image[tt],_t[tt]=Ie(E,_t[tt]);let Ft=_t[0],Mt=s.convert(E.format,E.colorSpace),pt=s.convert(E.type),Wt=x(E.internalFormat,Mt,pt,E.colorSpace),H=E.isVideoTexture!==!0,lt=Z.__version===void 0||J===!0,ft=rt.dataReady,xt=M(E,Ft);it(e.TEXTURE_CUBE_MAP,E);let at;if(At){H&&lt&&n.texStorage2D(e.TEXTURE_CUBE_MAP,xt,Wt,Ft.width,Ft.height);for(let tt=0;tt<6;tt++){at=_t[tt].mipmaps;for(let bt=0;bt<at.length;bt++){let Ht=at[bt];E.format!==zn?Mt!==null?H?ft&&n.compressedTexSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+tt,bt,0,0,Ht.width,Ht.height,Mt,Ht.data):n.compressedTexImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+tt,bt,Wt,Ht.width,Ht.height,0,Ht.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):H?ft&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+tt,bt,0,0,Ht.width,Ht.height,Mt,pt,Ht.data):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+tt,bt,Wt,Ht.width,Ht.height,0,Mt,pt,Ht.data)}}}else{if(at=E.mipmaps,H&&lt){at.length>0&&xt++;let tt=Ae(_t[0]);n.texStorage2D(e.TEXTURE_CUBE_MAP,xt,Wt,tt.width,tt.height)}for(let tt=0;tt<6;tt++)if(st){H?ft&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+tt,0,0,0,_t[tt].width,_t[tt].height,Mt,pt,_t[tt].data):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+tt,0,Wt,_t[tt].width,_t[tt].height,0,Mt,pt,_t[tt].data);for(let bt=0;bt<at.length;bt++){let he=at[bt].image[tt].image;H?ft&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+tt,bt+1,0,0,he.width,he.height,Mt,pt,he.data):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+tt,bt+1,Wt,he.width,he.height,0,Mt,pt,he.data)}}else{H?ft&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+tt,0,0,0,Mt,pt,_t[tt]):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+tt,0,Wt,Mt,pt,_t[tt]);for(let bt=0;bt<at.length;bt++){let Ht=at[bt];H?ft&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+tt,bt+1,0,0,Mt,pt,Ht.image[tt]):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+tt,bt+1,Wt,Mt,pt,Ht.image[tt])}}}g(E)&&p(e.TEXTURE_CUBE_MAP),Z.__version=rt.version,E.onUpdate&&E.onUpdate(E)}D.__version=E.version}function yt(D,E,W,J,rt,Z){let Rt=s.convert(W.format,W.colorSpace),ht=s.convert(W.type),Et=x(W.internalFormat,Rt,ht,W.colorSpace),At=i.get(E),st=i.get(W);if(st.__renderTarget=E,!At.__hasExternalTextures){let _t=Math.max(1,E.width>>Z),Ft=Math.max(1,E.height>>Z);rt===e.TEXTURE_3D||rt===e.TEXTURE_2D_ARRAY?n.texImage3D(rt,Z,Et,_t,Ft,E.depth,0,Rt,ht,null):n.texImage2D(rt,Z,Et,_t,Ft,0,Rt,ht,null)}n.bindFramebuffer(e.FRAMEBUFFER,D),Tt(E)?a.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,J,rt,st.__webglTexture,0,_e(E)):(rt===e.TEXTURE_2D||rt>=e.TEXTURE_CUBE_MAP_POSITIVE_X&&rt<=e.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&e.framebufferTexture2D(e.FRAMEBUFFER,J,rt,st.__webglTexture,Z),n.bindFramebuffer(e.FRAMEBUFFER,null)}function Bt(D,E,W){if(e.bindRenderbuffer(e.RENDERBUFFER,D),E.depthBuffer){let J=E.depthTexture,rt=J&&J.isDepthTexture?J.type:null,Z=v(E.stencilBuffer,rt),Rt=E.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,ht=_e(E);Tt(E)?a.renderbufferStorageMultisampleEXT(e.RENDERBUFFER,ht,Z,E.width,E.height):W?e.renderbufferStorageMultisample(e.RENDERBUFFER,ht,Z,E.width,E.height):e.renderbufferStorage(e.RENDERBUFFER,Z,E.width,E.height),e.framebufferRenderbuffer(e.FRAMEBUFFER,Rt,e.RENDERBUFFER,D)}else{let J=E.textures;for(let rt=0;rt<J.length;rt++){let Z=J[rt],Rt=s.convert(Z.format,Z.colorSpace),ht=s.convert(Z.type),Et=x(Z.internalFormat,Rt,ht,Z.colorSpace),At=_e(E);W&&Tt(E)===!1?e.renderbufferStorageMultisample(e.RENDERBUFFER,At,Et,E.width,E.height):Tt(E)?a.renderbufferStorageMultisampleEXT(e.RENDERBUFFER,At,Et,E.width,E.height):e.renderbufferStorage(e.RENDERBUFFER,Et,E.width,E.height)}}e.bindRenderbuffer(e.RENDERBUFFER,null)}function It(D,E){if(E&&E.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(n.bindFramebuffer(e.FRAMEBUFFER,D),!(E.depthTexture&&E.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");let J=i.get(E.depthTexture);J.__renderTarget=E,(!J.__webglTexture||E.depthTexture.image.width!==E.width||E.depthTexture.image.height!==E.height)&&(E.depthTexture.image.width=E.width,E.depthTexture.image.height=E.height,E.depthTexture.needsUpdate=!0),U(E.depthTexture,0);let rt=J.__webglTexture,Z=_e(E);if(E.depthTexture.format===gs)Tt(E)?a.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,e.DEPTH_ATTACHMENT,e.TEXTURE_2D,rt,0,Z):e.framebufferTexture2D(e.FRAMEBUFFER,e.DEPTH_ATTACHMENT,e.TEXTURE_2D,rt,0);else if(E.depthTexture.format===Ls)Tt(E)?a.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,e.DEPTH_STENCIL_ATTACHMENT,e.TEXTURE_2D,rt,0,Z):e.framebufferTexture2D(e.FRAMEBUFFER,e.DEPTH_STENCIL_ATTACHMENT,e.TEXTURE_2D,rt,0);else throw new Error("Unknown depthTexture format")}function Qt(D){let E=i.get(D),W=D.isWebGLCubeRenderTarget===!0;if(E.__boundDepthTexture!==D.depthTexture){let J=D.depthTexture;if(E.__depthDisposeCallback&&E.__depthDisposeCallback(),J){let rt=()=>{delete E.__boundDepthTexture,delete E.__depthDisposeCallback,J.removeEventListener("dispose",rt)};J.addEventListener("dispose",rt),E.__depthDisposeCallback=rt}E.__boundDepthTexture=J}if(D.depthTexture&&!E.__autoAllocateDepthBuffer){if(W)throw new Error("target.depthTexture not supported in Cube render targets");let J=D.texture.mipmaps;J&&J.length>0?It(E.__webglFramebuffer[0],D):It(E.__webglFramebuffer,D)}else if(W){E.__webglDepthbuffer=[];for(let J=0;J<6;J++)if(n.bindFramebuffer(e.FRAMEBUFFER,E.__webglFramebuffer[J]),E.__webglDepthbuffer[J]===void 0)E.__webglDepthbuffer[J]=e.createRenderbuffer(),Bt(E.__webglDepthbuffer[J],D,!1);else{let rt=D.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,Z=E.__webglDepthbuffer[J];e.bindRenderbuffer(e.RENDERBUFFER,Z),e.framebufferRenderbuffer(e.FRAMEBUFFER,rt,e.RENDERBUFFER,Z)}}else{let J=D.texture.mipmaps;if(J&&J.length>0?n.bindFramebuffer(e.FRAMEBUFFER,E.__webglFramebuffer[0]):n.bindFramebuffer(e.FRAMEBUFFER,E.__webglFramebuffer),E.__webglDepthbuffer===void 0)E.__webglDepthbuffer=e.createRenderbuffer(),Bt(E.__webglDepthbuffer,D,!1);else{let rt=D.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,Z=E.__webglDepthbuffer;e.bindRenderbuffer(e.RENDERBUFFER,Z),e.framebufferRenderbuffer(e.FRAMEBUFFER,rt,e.RENDERBUFFER,Z)}}n.bindFramebuffer(e.FRAMEBUFFER,null)}function Re(D,E,W){let J=i.get(D);E!==void 0&&yt(J.__webglFramebuffer,D,D.texture,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,0),W!==void 0&&Qt(D)}function k(D){let E=D.texture,W=i.get(D),J=i.get(E);D.addEventListener("dispose",C);let rt=D.textures,Z=D.isWebGLCubeRenderTarget===!0,Rt=rt.length>1;if(Rt||(J.__webglTexture===void 0&&(J.__webglTexture=e.createTexture()),J.__version=E.version,o.memory.textures++),Z){W.__webglFramebuffer=[];for(let ht=0;ht<6;ht++)if(E.mipmaps&&E.mipmaps.length>0){W.__webglFramebuffer[ht]=[];for(let Et=0;Et<E.mipmaps.length;Et++)W.__webglFramebuffer[ht][Et]=e.createFramebuffer()}else W.__webglFramebuffer[ht]=e.createFramebuffer()}else{if(E.mipmaps&&E.mipmaps.length>0){W.__webglFramebuffer=[];for(let ht=0;ht<E.mipmaps.length;ht++)W.__webglFramebuffer[ht]=e.createFramebuffer()}else W.__webglFramebuffer=e.createFramebuffer();if(Rt)for(let ht=0,Et=rt.length;ht<Et;ht++){let At=i.get(rt[ht]);At.__webglTexture===void 0&&(At.__webglTexture=e.createTexture(),o.memory.textures++)}if(D.samples>0&&Tt(D)===!1){W.__webglMultisampledFramebuffer=e.createFramebuffer(),W.__webglColorRenderbuffer=[],n.bindFramebuffer(e.FRAMEBUFFER,W.__webglMultisampledFramebuffer);for(let ht=0;ht<rt.length;ht++){let Et=rt[ht];W.__webglColorRenderbuffer[ht]=e.createRenderbuffer(),e.bindRenderbuffer(e.RENDERBUFFER,W.__webglColorRenderbuffer[ht]);let At=s.convert(Et.format,Et.colorSpace),st=s.convert(Et.type),_t=x(Et.internalFormat,At,st,Et.colorSpace,D.isXRRenderTarget===!0),Ft=_e(D);e.renderbufferStorageMultisample(e.RENDERBUFFER,Ft,_t,D.width,D.height),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+ht,e.RENDERBUFFER,W.__webglColorRenderbuffer[ht])}e.bindRenderbuffer(e.RENDERBUFFER,null),D.depthBuffer&&(W.__webglDepthRenderbuffer=e.createRenderbuffer(),Bt(W.__webglDepthRenderbuffer,D,!0)),n.bindFramebuffer(e.FRAMEBUFFER,null)}}if(Z){n.bindTexture(e.TEXTURE_CUBE_MAP,J.__webglTexture),it(e.TEXTURE_CUBE_MAP,E);for(let ht=0;ht<6;ht++)if(E.mipmaps&&E.mipmaps.length>0)for(let Et=0;Et<E.mipmaps.length;Et++)yt(W.__webglFramebuffer[ht][Et],D,E,e.COLOR_ATTACHMENT0,e.TEXTURE_CUBE_MAP_POSITIVE_X+ht,Et);else yt(W.__webglFramebuffer[ht],D,E,e.COLOR_ATTACHMENT0,e.TEXTURE_CUBE_MAP_POSITIVE_X+ht,0);g(E)&&p(e.TEXTURE_CUBE_MAP),n.unbindTexture()}else if(Rt){for(let ht=0,Et=rt.length;ht<Et;ht++){let At=rt[ht],st=i.get(At),_t=e.TEXTURE_2D;(D.isWebGL3DRenderTarget||D.isWebGLArrayRenderTarget)&&(_t=D.isWebGL3DRenderTarget?e.TEXTURE_3D:e.TEXTURE_2D_ARRAY),n.bindTexture(_t,st.__webglTexture),it(_t,At),yt(W.__webglFramebuffer,D,At,e.COLOR_ATTACHMENT0+ht,_t,0),g(At)&&p(_t)}n.unbindTexture()}else{let ht=e.TEXTURE_2D;if((D.isWebGL3DRenderTarget||D.isWebGLArrayRenderTarget)&&(ht=D.isWebGL3DRenderTarget?e.TEXTURE_3D:e.TEXTURE_2D_ARRAY),n.bindTexture(ht,J.__webglTexture),it(ht,E),E.mipmaps&&E.mipmaps.length>0)for(let Et=0;Et<E.mipmaps.length;Et++)yt(W.__webglFramebuffer[Et],D,E,e.COLOR_ATTACHMENT0,ht,Et);else yt(W.__webglFramebuffer,D,E,e.COLOR_ATTACHMENT0,ht,0);g(E)&&p(ht),n.unbindTexture()}D.depthBuffer&&Qt(D)}function xe(D){let E=D.textures;for(let W=0,J=E.length;W<J;W++){let rt=E[W];if(g(rt)){let Z=b(D),Rt=i.get(rt).__webglTexture;n.bindTexture(Z,Rt),p(Z),n.unbindTexture()}}}let Gt=[],kt=[];function wt(D){if(D.samples>0){if(Tt(D)===!1){let E=D.textures,W=D.width,J=D.height,rt=e.COLOR_BUFFER_BIT,Z=D.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,Rt=i.get(D),ht=E.length>1;if(ht)for(let At=0;At<E.length;At++)n.bindFramebuffer(e.FRAMEBUFFER,Rt.__webglMultisampledFramebuffer),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+At,e.RENDERBUFFER,null),n.bindFramebuffer(e.FRAMEBUFFER,Rt.__webglFramebuffer),e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0+At,e.TEXTURE_2D,null,0);n.bindFramebuffer(e.READ_FRAMEBUFFER,Rt.__webglMultisampledFramebuffer);let Et=D.texture.mipmaps;Et&&Et.length>0?n.bindFramebuffer(e.DRAW_FRAMEBUFFER,Rt.__webglFramebuffer[0]):n.bindFramebuffer(e.DRAW_FRAMEBUFFER,Rt.__webglFramebuffer);for(let At=0;At<E.length;At++){if(D.resolveDepthBuffer&&(D.depthBuffer&&(rt|=e.DEPTH_BUFFER_BIT),D.stencilBuffer&&D.resolveStencilBuffer&&(rt|=e.STENCIL_BUFFER_BIT)),ht){e.framebufferRenderbuffer(e.READ_FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.RENDERBUFFER,Rt.__webglColorRenderbuffer[At]);let st=i.get(E[At]).__webglTexture;e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,st,0)}e.blitFramebuffer(0,0,W,J,0,0,W,J,rt,e.NEAREST),c===!0&&(Gt.length=0,kt.length=0,Gt.push(e.COLOR_ATTACHMENT0+At),D.depthBuffer&&D.resolveDepthBuffer===!1&&(Gt.push(Z),kt.push(Z),e.invalidateFramebuffer(e.DRAW_FRAMEBUFFER,kt)),e.invalidateFramebuffer(e.READ_FRAMEBUFFER,Gt))}if(n.bindFramebuffer(e.READ_FRAMEBUFFER,null),n.bindFramebuffer(e.DRAW_FRAMEBUFFER,null),ht)for(let At=0;At<E.length;At++){n.bindFramebuffer(e.FRAMEBUFFER,Rt.__webglMultisampledFramebuffer),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+At,e.RENDERBUFFER,Rt.__webglColorRenderbuffer[At]);let st=i.get(E[At]).__webglTexture;n.bindFramebuffer(e.FRAMEBUFFER,Rt.__webglFramebuffer),e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0+At,e.TEXTURE_2D,st,0)}n.bindFramebuffer(e.DRAW_FRAMEBUFFER,Rt.__webglMultisampledFramebuffer)}else if(D.depthBuffer&&D.resolveDepthBuffer===!1&&c){let E=D.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT;e.invalidateFramebuffer(e.DRAW_FRAMEBUFFER,[E])}}}function _e(D){return Math.min(r.maxSamples,D.samples)}function Tt(D){let E=i.get(D);return D.samples>0&&t.has("WEBGL_multisampled_render_to_texture")===!0&&E.__useRenderToTexture!==!1}function jt(D){let E=o.render.frame;u.get(D)!==E&&(u.set(D,E),D.update())}function Ie(D,E){let W=D.colorSpace,J=D.format,rt=D.type;return D.isCompressedTexture===!0||D.isVideoTexture===!0||W!==Er&&W!==Li&&(ee.getTransfer(W)===ae?(J!==zn||rt!==Jn)&&console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):console.error("THREE.WebGLTextures: Unsupported texture color space:",W)),E}function Ae(D){return typeof HTMLImageElement<"u"&&D instanceof HTMLImageElement?(l.width=D.naturalWidth||D.width,l.height=D.naturalHeight||D.height):typeof VideoFrame<"u"&&D instanceof VideoFrame?(l.width=D.displayWidth,l.height=D.displayHeight):(l.width=D.width,l.height=D.height),l}this.allocateTextureUnit=N,this.resetTextureUnits=V,this.setTexture2D=U,this.setTexture2DArray=G,this.setTexture3D=K,this.setTextureCube=q,this.rebindTextures=Re,this.setupRenderTarget=k,this.updateRenderTargetMipmap=xe,this.updateMultisampleRenderTarget=wt,this.setupDepthRenderbuffer=Qt,this.setupFrameBufferTexture=yt,this.useMultisampledRTT=Tt}function dE(e,t){function n(i,r=Li){let s,o=ee.getTransfer(r);if(i===Jn)return e.UNSIGNED_BYTE;if(i===_l)return e.UNSIGNED_SHORT_4_4_4_4;if(i===vl)return e.UNSIGNED_SHORT_5_5_5_1;if(i===df)return e.UNSIGNED_INT_5_9_9_9_REV;if(i===pf)return e.UNSIGNED_INT_10F_11F_11F_REV;if(i===uf)return e.BYTE;if(i===ff)return e.SHORT;if(i===Is)return e.UNSIGNED_SHORT;if(i===gl)return e.INT;if(i===Ji)return e.UNSIGNED_INT;if(i===di)return e.FLOAT;if(i===Un)return e.HALF_FLOAT;if(i===mf)return e.ALPHA;if(i===gf)return e.RGB;if(i===zn)return e.RGBA;if(i===gs)return e.DEPTH_COMPONENT;if(i===Ls)return e.DEPTH_STENCIL;if(i===_f)return e.RED;if(i===yl)return e.RED_INTEGER;if(i===vf)return e.RG;if(i===xl)return e.RG_INTEGER;if(i===bl)return e.RGBA_INTEGER;if(i===ta||i===ea||i===na||i===ia)if(o===ae)if(s=t.get("WEBGL_compressed_texture_s3tc_srgb"),s!==null){if(i===ta)return s.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(i===ea)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(i===na)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(i===ia)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(s=t.get("WEBGL_compressed_texture_s3tc"),s!==null){if(i===ta)return s.COMPRESSED_RGB_S3TC_DXT1_EXT;if(i===ea)return s.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(i===na)return s.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(i===ia)return s.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(i===Ml||i===Sl||i===wl||i===El)if(s=t.get("WEBGL_compressed_texture_pvrtc"),s!==null){if(i===Ml)return s.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(i===Sl)return s.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(i===wl)return s.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(i===El)return s.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(i===Tl||i===Al||i===Cl)if(s=t.get("WEBGL_compressed_texture_etc"),s!==null){if(i===Tl||i===Al)return o===ae?s.COMPRESSED_SRGB8_ETC2:s.COMPRESSED_RGB8_ETC2;if(i===Cl)return o===ae?s.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:s.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(i===Rl||i===Pl||i===Il||i===Dl||i===Ll||i===Ol||i===Nl||i===Fl||i===Ul||i===zl||i===kl||i===Bl||i===Vl||i===Hl)if(s=t.get("WEBGL_compressed_texture_astc"),s!==null){if(i===Rl)return o===ae?s.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:s.COMPRESSED_RGBA_ASTC_4x4_KHR;if(i===Pl)return o===ae?s.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:s.COMPRESSED_RGBA_ASTC_5x4_KHR;if(i===Il)return o===ae?s.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:s.COMPRESSED_RGBA_ASTC_5x5_KHR;if(i===Dl)return o===ae?s.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:s.COMPRESSED_RGBA_ASTC_6x5_KHR;if(i===Ll)return o===ae?s.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:s.COMPRESSED_RGBA_ASTC_6x6_KHR;if(i===Ol)return o===ae?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:s.COMPRESSED_RGBA_ASTC_8x5_KHR;if(i===Nl)return o===ae?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:s.COMPRESSED_RGBA_ASTC_8x6_KHR;if(i===Fl)return o===ae?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:s.COMPRESSED_RGBA_ASTC_8x8_KHR;if(i===Ul)return o===ae?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:s.COMPRESSED_RGBA_ASTC_10x5_KHR;if(i===zl)return o===ae?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:s.COMPRESSED_RGBA_ASTC_10x6_KHR;if(i===kl)return o===ae?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:s.COMPRESSED_RGBA_ASTC_10x8_KHR;if(i===Bl)return o===ae?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:s.COMPRESSED_RGBA_ASTC_10x10_KHR;if(i===Vl)return o===ae?s.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:s.COMPRESSED_RGBA_ASTC_12x10_KHR;if(i===Hl)return o===ae?s.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:s.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(i===Gl||i===Wl||i===jl)if(s=t.get("EXT_texture_compression_bptc"),s!==null){if(i===Gl)return o===ae?s.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:s.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(i===Wl)return s.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(i===jl)return s.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(i===ql||i===Xl||i===$l||i===Yl)if(s=t.get("EXT_texture_compression_rgtc"),s!==null){if(i===ql)return s.COMPRESSED_RED_RGTC1_EXT;if(i===Xl)return s.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(i===$l)return s.COMPRESSED_RED_GREEN_RGTC2_EXT;if(i===Yl)return s.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return i===Ds?e.UNSIGNED_INT_24_8:e[i]!==void 0?e[i]:null}return{convert:n}}var pE=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,mE=`
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

}`,Bf=class{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(t,n){if(this.texture===null){let i=new Uo(t.texture);(t.depthNear!==n.depthNear||t.depthFar!==n.depthFar)&&(this.depthNear=t.depthNear,this.depthFar=t.depthFar),this.texture=i}}getMesh(t){if(this.texture!==null&&this.mesh===null){let n=t.cameras[0].viewport,i=new Le({vertexShader:pE,fragmentShader:mE,uniforms:{depthColor:{value:this.texture},depthWidth:{value:n.z},depthHeight:{value:n.w}}});this.mesh=new we(new ko(20,20),i)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}},Vf=class extends si{constructor(t,n){super();let i=this,r=null,s=1,o=null,a="local-floor",c=1,l=null,u=null,h=null,f=null,d=null,m=null,_=typeof XRWebGLBinding<"u",g=new Bf,p={},b=n.getContextAttributes(),x=null,v=null,M=[],S=[],C=new et,P=null,T=new Ge;T.viewport=new de;let w=new Ge;w.viewport=new de;let R=[T,w],V=new Kc,N=null,z=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function($){let Q=M[$];return Q===void 0&&(Q=new Ss,M[$]=Q),Q.getTargetRaySpace()},this.getControllerGrip=function($){let Q=M[$];return Q===void 0&&(Q=new Ss,M[$]=Q),Q.getGripSpace()},this.getHand=function($){let Q=M[$];return Q===void 0&&(Q=new Ss,M[$]=Q),Q.getHandSpace()};function U($){let Q=S.indexOf($.inputSource);if(Q===-1)return;let yt=M[Q];yt!==void 0&&(yt.update($.inputSource,$.frame,l||o),yt.dispatchEvent({type:$.type,data:$.inputSource}))}function G(){r.removeEventListener("select",U),r.removeEventListener("selectstart",U),r.removeEventListener("selectend",U),r.removeEventListener("squeeze",U),r.removeEventListener("squeezestart",U),r.removeEventListener("squeezeend",U),r.removeEventListener("end",G),r.removeEventListener("inputsourceschange",K);for(let $=0;$<M.length;$++){let Q=S[$];Q!==null&&(S[$]=null,M[$].disconnect(Q))}N=null,z=null,g.reset();for(let $ in p)delete p[$];t.setRenderTarget(x),d=null,f=null,h=null,r=null,v=null,Lt.stop(),i.isPresenting=!1,t.setPixelRatio(P),t.setSize(C.width,C.height,!1),i.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function($){s=$,i.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function($){a=$,i.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return l||o},this.setReferenceSpace=function($){l=$},this.getBaseLayer=function(){return f!==null?f:d},this.getBinding=function(){return h===null&&_&&(h=new XRWebGLBinding(r,n)),h},this.getFrame=function(){return m},this.getSession=function(){return r},this.setSession=async function($){if(r=$,r!==null){if(x=t.getRenderTarget(),r.addEventListener("select",U),r.addEventListener("selectstart",U),r.addEventListener("selectend",U),r.addEventListener("squeeze",U),r.addEventListener("squeezestart",U),r.addEventListener("squeezeend",U),r.addEventListener("end",G),r.addEventListener("inputsourceschange",K),b.xrCompatible!==!0&&await n.makeXRCompatible(),P=t.getPixelRatio(),t.getSize(C),_&&"createProjectionLayer"in XRWebGLBinding.prototype){let yt=null,Bt=null,It=null;b.depth&&(It=b.stencil?n.DEPTH24_STENCIL8:n.DEPTH_COMPONENT24,yt=b.stencil?Ls:gs,Bt=b.stencil?Ds:Ji);let Qt={colorFormat:n.RGBA8,depthFormat:It,scaleFactor:s};h=this.getBinding(),f=h.createProjectionLayer(Qt),r.updateRenderState({layers:[f]}),t.setPixelRatio(1),t.setSize(f.textureWidth,f.textureHeight,!1),v=new Ze(f.textureWidth,f.textureHeight,{format:zn,type:Jn,depthTexture:new Fo(f.textureWidth,f.textureHeight,Bt,void 0,void 0,void 0,void 0,void 0,void 0,yt),stencilBuffer:b.stencil,colorSpace:t.outputColorSpace,samples:b.antialias?4:0,resolveDepthBuffer:f.ignoreDepthValues===!1,resolveStencilBuffer:f.ignoreDepthValues===!1})}else{let yt={antialias:b.antialias,alpha:!0,depth:b.depth,stencil:b.stencil,framebufferScaleFactor:s};d=new XRWebGLLayer(r,n,yt),r.updateRenderState({baseLayer:d}),t.setPixelRatio(1),t.setSize(d.framebufferWidth,d.framebufferHeight,!1),v=new Ze(d.framebufferWidth,d.framebufferHeight,{format:zn,type:Jn,colorSpace:t.outputColorSpace,stencilBuffer:b.stencil,resolveDepthBuffer:d.ignoreDepthValues===!1,resolveStencilBuffer:d.ignoreDepthValues===!1})}v.isXRRenderTarget=!0,this.setFoveation(c),l=null,o=await r.requestReferenceSpace(a),Lt.setContext(r),Lt.start(),i.isPresenting=!0,i.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(r!==null)return r.environmentBlendMode},this.getDepthTexture=function(){return g.getDepthTexture()};function K($){for(let Q=0;Q<$.removed.length;Q++){let yt=$.removed[Q],Bt=S.indexOf(yt);Bt>=0&&(S[Bt]=null,M[Bt].disconnect(yt))}for(let Q=0;Q<$.added.length;Q++){let yt=$.added[Q],Bt=S.indexOf(yt);if(Bt===-1){for(let Qt=0;Qt<M.length;Qt++)if(Qt>=S.length){S.push(yt),Bt=Qt;break}else if(S[Qt]===null){S[Qt]=yt,Bt=Qt;break}if(Bt===-1)break}let It=M[Bt];It&&It.connect(yt)}}let q=new I,ot=new I;function gt($,Q,yt){q.setFromMatrixPosition(Q.matrixWorld),ot.setFromMatrixPosition(yt.matrixWorld);let Bt=q.distanceTo(ot),It=Q.projectionMatrix.elements,Qt=yt.projectionMatrix.elements,Re=It[14]/(It[10]-1),k=It[14]/(It[10]+1),xe=(It[9]+1)/It[5],Gt=(It[9]-1)/It[5],kt=(It[8]-1)/It[0],wt=(Qt[8]+1)/Qt[0],_e=Re*kt,Tt=Re*wt,jt=Bt/(-kt+wt),Ie=jt*-kt;if(Q.matrixWorld.decompose($.position,$.quaternion,$.scale),$.translateX(Ie),$.translateZ(jt),$.matrixWorld.compose($.position,$.quaternion,$.scale),$.matrixWorldInverse.copy($.matrixWorld).invert(),It[10]===-1)$.projectionMatrix.copy(Q.projectionMatrix),$.projectionMatrixInverse.copy(Q.projectionMatrixInverse);else{let Ae=Re+jt,D=k+jt,E=_e-Ie,W=Tt+(Bt-Ie),J=xe*k/D*Ae,rt=Gt*k/D*Ae;$.projectionMatrix.makePerspective(E,W,J,rt,Ae,D),$.projectionMatrixInverse.copy($.projectionMatrix).invert()}}function Y($,Q){Q===null?$.matrixWorld.copy($.matrix):$.matrixWorld.multiplyMatrices(Q.matrixWorld,$.matrix),$.matrixWorldInverse.copy($.matrixWorld).invert()}this.updateCamera=function($){if(r===null)return;let Q=$.near,yt=$.far;g.texture!==null&&(g.depthNear>0&&(Q=g.depthNear),g.depthFar>0&&(yt=g.depthFar)),V.near=w.near=T.near=Q,V.far=w.far=T.far=yt,(N!==V.near||z!==V.far)&&(r.updateRenderState({depthNear:V.near,depthFar:V.far}),N=V.near,z=V.far),V.layers.mask=$.layers.mask|6,T.layers.mask=V.layers.mask&3,w.layers.mask=V.layers.mask&5;let Bt=$.parent,It=V.cameras;Y(V,Bt);for(let Qt=0;Qt<It.length;Qt++)Y(It[Qt],Bt);It.length===2?gt(V,T,w):V.projectionMatrix.copy(T.projectionMatrix),it($,V,Bt)};function it($,Q,yt){yt===null?$.matrix.copy(Q.matrixWorld):($.matrix.copy(yt.matrixWorld),$.matrix.invert(),$.matrix.multiply(Q.matrixWorld)),$.matrix.decompose($.position,$.quaternion,$.scale),$.updateMatrixWorld(!0),$.projectionMatrix.copy(Q.projectionMatrix),$.projectionMatrixInverse.copy(Q.projectionMatrixInverse),$.isPerspectiveCamera&&($.fov=_s*2*Math.atan(1/$.projectionMatrix.elements[5]),$.zoom=1)}this.getCamera=function(){return V},this.getFoveation=function(){if(!(f===null&&d===null))return c},this.setFoveation=function($){c=$,f!==null&&(f.fixedFoveation=$),d!==null&&d.fixedFoveation!==void 0&&(d.fixedFoveation=$)},this.hasDepthSensing=function(){return g.texture!==null},this.getDepthSensingMesh=function(){return g.getMesh(V)},this.getCameraTexture=function($){return p[$]};let dt=null;function zt($,Q){if(u=Q.getViewerPose(l||o),m=Q,u!==null){let yt=u.views;d!==null&&(t.setRenderTargetFramebuffer(v,d.framebuffer),t.setRenderTarget(v));let Bt=!1;yt.length!==V.cameras.length&&(V.cameras.length=0,Bt=!0);for(let k=0;k<yt.length;k++){let xe=yt[k],Gt=null;if(d!==null)Gt=d.getViewport(xe);else{let wt=h.getViewSubImage(f,xe);Gt=wt.viewport,k===0&&(t.setRenderTargetTextures(v,wt.colorTexture,wt.depthStencilTexture),t.setRenderTarget(v))}let kt=R[k];kt===void 0&&(kt=new Ge,kt.layers.enable(k),kt.viewport=new de,R[k]=kt),kt.matrix.fromArray(xe.transform.matrix),kt.matrix.decompose(kt.position,kt.quaternion,kt.scale),kt.projectionMatrix.fromArray(xe.projectionMatrix),kt.projectionMatrixInverse.copy(kt.projectionMatrix).invert(),kt.viewport.set(Gt.x,Gt.y,Gt.width,Gt.height),k===0&&(V.matrix.copy(kt.matrix),V.matrix.decompose(V.position,V.quaternion,V.scale)),Bt===!0&&V.cameras.push(kt)}let It=r.enabledFeatures;if(It&&It.includes("depth-sensing")&&r.depthUsage=="gpu-optimized"&&_){h=i.getBinding();let k=h.getDepthInformation(yt[0]);k&&k.isValid&&k.texture&&g.init(k,r.renderState)}if(It&&It.includes("camera-access")&&_){t.state.unbindTexture(),h=i.getBinding();for(let k=0;k<yt.length;k++){let xe=yt[k].camera;if(xe){let Gt=p[xe];Gt||(Gt=new Uo,p[xe]=Gt);let kt=h.getCameraImage(xe);Gt.sourceTexture=kt}}}}for(let yt=0;yt<M.length;yt++){let Bt=S[yt],It=M[yt];Bt!==null&&It!==void 0&&It.update(Bt,Q,l||o)}dt&&dt($,Q),Q.detectedPlanes&&i.dispatchEvent({type:"planesdetected",data:Q}),m=null}let Lt=new Tg;Lt.setAnimationLoop(zt),this.setAnimationLoop=function($){dt=$},this.dispose=function(){}}},Or=new Ln,gE=new Vt;function _E(e,t){function n(g,p){g.matrixAutoUpdate===!0&&g.updateMatrix(),p.value.copy(g.matrix)}function i(g,p){p.color.getRGB(g.fogColor.value,Sf(e)),p.isFog?(g.fogNear.value=p.near,g.fogFar.value=p.far):p.isFogExp2&&(g.fogDensity.value=p.density)}function r(g,p,b,x,v){p.isMeshBasicMaterial||p.isMeshLambertMaterial?s(g,p):p.isMeshToonMaterial?(s(g,p),h(g,p)):p.isMeshPhongMaterial?(s(g,p),u(g,p)):p.isMeshStandardMaterial?(s(g,p),f(g,p),p.isMeshPhysicalMaterial&&d(g,p,v)):p.isMeshMatcapMaterial?(s(g,p),m(g,p)):p.isMeshDepthMaterial?s(g,p):p.isMeshDistanceMaterial?(s(g,p),_(g,p)):p.isMeshNormalMaterial?s(g,p):p.isLineBasicMaterial?(o(g,p),p.isLineDashedMaterial&&a(g,p)):p.isPointsMaterial?c(g,p,b,x):p.isSpriteMaterial?l(g,p):p.isShadowMaterial?(g.color.value.copy(p.color),g.opacity.value=p.opacity):p.isShaderMaterial&&(p.uniformsNeedUpdate=!1)}function s(g,p){g.opacity.value=p.opacity,p.color&&g.diffuse.value.copy(p.color),p.emissive&&g.emissive.value.copy(p.emissive).multiplyScalar(p.emissiveIntensity),p.map&&(g.map.value=p.map,n(p.map,g.mapTransform)),p.alphaMap&&(g.alphaMap.value=p.alphaMap,n(p.alphaMap,g.alphaMapTransform)),p.bumpMap&&(g.bumpMap.value=p.bumpMap,n(p.bumpMap,g.bumpMapTransform),g.bumpScale.value=p.bumpScale,p.side===We&&(g.bumpScale.value*=-1)),p.normalMap&&(g.normalMap.value=p.normalMap,n(p.normalMap,g.normalMapTransform),g.normalScale.value.copy(p.normalScale),p.side===We&&g.normalScale.value.negate()),p.displacementMap&&(g.displacementMap.value=p.displacementMap,n(p.displacementMap,g.displacementMapTransform),g.displacementScale.value=p.displacementScale,g.displacementBias.value=p.displacementBias),p.emissiveMap&&(g.emissiveMap.value=p.emissiveMap,n(p.emissiveMap,g.emissiveMapTransform)),p.specularMap&&(g.specularMap.value=p.specularMap,n(p.specularMap,g.specularMapTransform)),p.alphaTest>0&&(g.alphaTest.value=p.alphaTest);let b=t.get(p),x=b.envMap,v=b.envMapRotation;x&&(g.envMap.value=x,Or.copy(v),Or.x*=-1,Or.y*=-1,Or.z*=-1,x.isCubeTexture&&x.isRenderTargetTexture===!1&&(Or.y*=-1,Or.z*=-1),g.envMapRotation.value.setFromMatrix4(gE.makeRotationFromEuler(Or)),g.flipEnvMap.value=x.isCubeTexture&&x.isRenderTargetTexture===!1?-1:1,g.reflectivity.value=p.reflectivity,g.ior.value=p.ior,g.refractionRatio.value=p.refractionRatio),p.lightMap&&(g.lightMap.value=p.lightMap,g.lightMapIntensity.value=p.lightMapIntensity,n(p.lightMap,g.lightMapTransform)),p.aoMap&&(g.aoMap.value=p.aoMap,g.aoMapIntensity.value=p.aoMapIntensity,n(p.aoMap,g.aoMapTransform))}function o(g,p){g.diffuse.value.copy(p.color),g.opacity.value=p.opacity,p.map&&(g.map.value=p.map,n(p.map,g.mapTransform))}function a(g,p){g.dashSize.value=p.dashSize,g.totalSize.value=p.dashSize+p.gapSize,g.scale.value=p.scale}function c(g,p,b,x){g.diffuse.value.copy(p.color),g.opacity.value=p.opacity,g.size.value=p.size*b,g.scale.value=x*.5,p.map&&(g.map.value=p.map,n(p.map,g.uvTransform)),p.alphaMap&&(g.alphaMap.value=p.alphaMap,n(p.alphaMap,g.alphaMapTransform)),p.alphaTest>0&&(g.alphaTest.value=p.alphaTest)}function l(g,p){g.diffuse.value.copy(p.color),g.opacity.value=p.opacity,g.rotation.value=p.rotation,p.map&&(g.map.value=p.map,n(p.map,g.mapTransform)),p.alphaMap&&(g.alphaMap.value=p.alphaMap,n(p.alphaMap,g.alphaMapTransform)),p.alphaTest>0&&(g.alphaTest.value=p.alphaTest)}function u(g,p){g.specular.value.copy(p.specular),g.shininess.value=Math.max(p.shininess,1e-4)}function h(g,p){p.gradientMap&&(g.gradientMap.value=p.gradientMap)}function f(g,p){g.metalness.value=p.metalness,p.metalnessMap&&(g.metalnessMap.value=p.metalnessMap,n(p.metalnessMap,g.metalnessMapTransform)),g.roughness.value=p.roughness,p.roughnessMap&&(g.roughnessMap.value=p.roughnessMap,n(p.roughnessMap,g.roughnessMapTransform)),p.envMap&&(g.envMapIntensity.value=p.envMapIntensity)}function d(g,p,b){g.ior.value=p.ior,p.sheen>0&&(g.sheenColor.value.copy(p.sheenColor).multiplyScalar(p.sheen),g.sheenRoughness.value=p.sheenRoughness,p.sheenColorMap&&(g.sheenColorMap.value=p.sheenColorMap,n(p.sheenColorMap,g.sheenColorMapTransform)),p.sheenRoughnessMap&&(g.sheenRoughnessMap.value=p.sheenRoughnessMap,n(p.sheenRoughnessMap,g.sheenRoughnessMapTransform))),p.clearcoat>0&&(g.clearcoat.value=p.clearcoat,g.clearcoatRoughness.value=p.clearcoatRoughness,p.clearcoatMap&&(g.clearcoatMap.value=p.clearcoatMap,n(p.clearcoatMap,g.clearcoatMapTransform)),p.clearcoatRoughnessMap&&(g.clearcoatRoughnessMap.value=p.clearcoatRoughnessMap,n(p.clearcoatRoughnessMap,g.clearcoatRoughnessMapTransform)),p.clearcoatNormalMap&&(g.clearcoatNormalMap.value=p.clearcoatNormalMap,n(p.clearcoatNormalMap,g.clearcoatNormalMapTransform),g.clearcoatNormalScale.value.copy(p.clearcoatNormalScale),p.side===We&&g.clearcoatNormalScale.value.negate())),p.dispersion>0&&(g.dispersion.value=p.dispersion),p.iridescence>0&&(g.iridescence.value=p.iridescence,g.iridescenceIOR.value=p.iridescenceIOR,g.iridescenceThicknessMinimum.value=p.iridescenceThicknessRange[0],g.iridescenceThicknessMaximum.value=p.iridescenceThicknessRange[1],p.iridescenceMap&&(g.iridescenceMap.value=p.iridescenceMap,n(p.iridescenceMap,g.iridescenceMapTransform)),p.iridescenceThicknessMap&&(g.iridescenceThicknessMap.value=p.iridescenceThicknessMap,n(p.iridescenceThicknessMap,g.iridescenceThicknessMapTransform))),p.transmission>0&&(g.transmission.value=p.transmission,g.transmissionSamplerMap.value=b.texture,g.transmissionSamplerSize.value.set(b.width,b.height),p.transmissionMap&&(g.transmissionMap.value=p.transmissionMap,n(p.transmissionMap,g.transmissionMapTransform)),g.thickness.value=p.thickness,p.thicknessMap&&(g.thicknessMap.value=p.thicknessMap,n(p.thicknessMap,g.thicknessMapTransform)),g.attenuationDistance.value=p.attenuationDistance,g.attenuationColor.value.copy(p.attenuationColor)),p.anisotropy>0&&(g.anisotropyVector.value.set(p.anisotropy*Math.cos(p.anisotropyRotation),p.anisotropy*Math.sin(p.anisotropyRotation)),p.anisotropyMap&&(g.anisotropyMap.value=p.anisotropyMap,n(p.anisotropyMap,g.anisotropyMapTransform))),g.specularIntensity.value=p.specularIntensity,g.specularColor.value.copy(p.specularColor),p.specularColorMap&&(g.specularColorMap.value=p.specularColorMap,n(p.specularColorMap,g.specularColorMapTransform)),p.specularIntensityMap&&(g.specularIntensityMap.value=p.specularIntensityMap,n(p.specularIntensityMap,g.specularIntensityMapTransform))}function m(g,p){p.matcap&&(g.matcap.value=p.matcap)}function _(g,p){let b=t.get(p).light;g.referencePosition.value.setFromMatrixPosition(b.matrixWorld),g.nearDistance.value=b.shadow.camera.near,g.farDistance.value=b.shadow.camera.far}return{refreshFogUniforms:i,refreshMaterialUniforms:r}}function vE(e,t,n,i){let r={},s={},o=[],a=e.getParameter(e.MAX_UNIFORM_BUFFER_BINDINGS);function c(b,x){let v=x.program;i.uniformBlockBinding(b,v)}function l(b,x){let v=r[b.id];v===void 0&&(m(b),v=u(b),r[b.id]=v,b.addEventListener("dispose",g));let M=x.program;i.updateUBOMapping(b,M);let S=t.render.frame;s[b.id]!==S&&(f(b),s[b.id]=S)}function u(b){let x=h();b.__bindingPointIndex=x;let v=e.createBuffer(),M=b.__size,S=b.usage;return e.bindBuffer(e.UNIFORM_BUFFER,v),e.bufferData(e.UNIFORM_BUFFER,M,S),e.bindBuffer(e.UNIFORM_BUFFER,null),e.bindBufferBase(e.UNIFORM_BUFFER,x,v),v}function h(){for(let b=0;b<a;b++)if(o.indexOf(b)===-1)return o.push(b),b;return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function f(b){let x=r[b.id],v=b.uniforms,M=b.__cache;e.bindBuffer(e.UNIFORM_BUFFER,x);for(let S=0,C=v.length;S<C;S++){let P=Array.isArray(v[S])?v[S]:[v[S]];for(let T=0,w=P.length;T<w;T++){let R=P[T];if(d(R,S,T,M)===!0){let V=R.__offset,N=Array.isArray(R.value)?R.value:[R.value],z=0;for(let U=0;U<N.length;U++){let G=N[U],K=_(G);typeof G=="number"||typeof G=="boolean"?(R.__data[0]=G,e.bufferSubData(e.UNIFORM_BUFFER,V+z,R.__data)):G.isMatrix3?(R.__data[0]=G.elements[0],R.__data[1]=G.elements[1],R.__data[2]=G.elements[2],R.__data[3]=0,R.__data[4]=G.elements[3],R.__data[5]=G.elements[4],R.__data[6]=G.elements[5],R.__data[7]=0,R.__data[8]=G.elements[6],R.__data[9]=G.elements[7],R.__data[10]=G.elements[8],R.__data[11]=0):(G.toArray(R.__data,z),z+=K.storage/Float32Array.BYTES_PER_ELEMENT)}e.bufferSubData(e.UNIFORM_BUFFER,V,R.__data)}}}e.bindBuffer(e.UNIFORM_BUFFER,null)}function d(b,x,v,M){let S=b.value,C=x+"_"+v;if(M[C]===void 0)return typeof S=="number"||typeof S=="boolean"?M[C]=S:M[C]=S.clone(),!0;{let P=M[C];if(typeof S=="number"||typeof S=="boolean"){if(P!==S)return M[C]=S,!0}else if(P.equals(S)===!1)return P.copy(S),!0}return!1}function m(b){let x=b.uniforms,v=0,M=16;for(let C=0,P=x.length;C<P;C++){let T=Array.isArray(x[C])?x[C]:[x[C]];for(let w=0,R=T.length;w<R;w++){let V=T[w],N=Array.isArray(V.value)?V.value:[V.value];for(let z=0,U=N.length;z<U;z++){let G=N[z],K=_(G),q=v%M,ot=q%K.boundary,gt=q+ot;v+=ot,gt!==0&&M-gt<K.storage&&(v+=M-gt),V.__data=new Float32Array(K.storage/Float32Array.BYTES_PER_ELEMENT),V.__offset=v,v+=K.storage}}}let S=v%M;return S>0&&(v+=M-S),b.__size=v,b.__cache={},this}function _(b){let x={boundary:0,storage:0};return typeof b=="number"||typeof b=="boolean"?(x.boundary=4,x.storage=4):b.isVector2?(x.boundary=8,x.storage=8):b.isVector3||b.isColor?(x.boundary=16,x.storage=12):b.isVector4?(x.boundary=16,x.storage=16):b.isMatrix3?(x.boundary=48,x.storage=48):b.isMatrix4?(x.boundary=64,x.storage=64):b.isTexture?console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group."):console.warn("THREE.WebGLRenderer: Unsupported uniform value type.",b),x}function g(b){let x=b.target;x.removeEventListener("dispose",g);let v=o.indexOf(x.__bindingPointIndex);o.splice(v,1),e.deleteBuffer(r[x.id]),delete r[x.id],delete s[x.id]}function p(){for(let b in r)e.deleteBuffer(r[b]);o=[],r={},s={}}return{bind:c,update:l,dispose:p}}var eh=class{constructor(t={}){let{canvas:n=Jm(),context:i=null,depth:r=!0,stencil:s=!1,alpha:o=!1,antialias:a=!1,premultipliedAlpha:c=!0,preserveDrawingBuffer:l=!1,powerPreference:u="default",failIfMajorPerformanceCaveat:h=!1,reversedDepthBuffer:f=!1}=t;this.isWebGLRenderer=!0;let d;if(i!==null){if(typeof WebGLRenderingContext<"u"&&i instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");d=i.getContextAttributes().alpha}else d=o;let m=new Uint32Array(4),_=new Int32Array(4),g=null,p=null,b=[],x=[];this.domElement=n,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=Di,this.toneMappingExposure=1,this.transmissionResolutionScale=1;let v=this,M=!1;this._outputColorSpace=He;let S=0,C=0,P=null,T=-1,w=null,R=new de,V=new de,N=null,z=new Ot(0),U=0,G=n.width,K=n.height,q=1,ot=null,gt=null,Y=new de(0,0,G,K),it=new de(0,0,G,K),dt=!1,zt=new ws,Lt=!1,$=!1,Q=new Vt,yt=new I,Bt=new de,It={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},Qt=!1;function Re(){return P===null?q:1}let k=i;function xe(y,A){return n.getContext(y,A)}try{let y={alpha:!0,depth:r,stencil:s,antialias:a,premultipliedAlpha:c,preserveDrawingBuffer:l,powerPreference:u,failIfMajorPerformanceCaveat:h};if("setAttribute"in n&&n.setAttribute("data-engine",`three.js r${"180"}`),n.addEventListener("webglcontextlost",ft,!1),n.addEventListener("webglcontextrestored",xt,!1),n.addEventListener("webglcontextcreationerror",at,!1),k===null){let A="webgl2";if(k=xe(A,y),k===null)throw xe(A)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(y){throw console.error("THREE.WebGLRenderer: "+y.message),y}let Gt,kt,wt,_e,Tt,jt,Ie,Ae,D,E,W,J,rt,Z,Rt,ht,Et,At,st,_t,Ft,Mt,pt,Wt;function H(){Gt=new FS(k),Gt.init(),Mt=new dE(k,Gt),kt=new RS(k,Gt,t,Mt),wt=new uE(k,Gt),kt.reversedDepthBuffer&&f&&wt.buffers.depth.setReversed(!0),_e=new kS(k),Tt=new Jw,jt=new fE(k,Gt,wt,Tt,kt,Mt,_e),Ie=new IS(v),Ae=new NS(v),D=new jb(k),pt=new AS(k,D),E=new US(k,D,_e,pt),W=new VS(k,E,D,_e),st=new BS(k,kt,jt),ht=new PS(Tt),J=new Kw(v,Ie,Ae,Gt,kt,pt,ht),rt=new _E(v,Tt),Z=new tE,Rt=new oE(Gt),At=new TS(v,Ie,Ae,wt,W,d,c),Et=new lE(v,W,kt),Wt=new vE(k,_e,kt,wt),_t=new CS(k,Gt,_e),Ft=new zS(k,Gt,_e),_e.programs=J.programs,v.capabilities=kt,v.extensions=Gt,v.properties=Tt,v.renderLists=Z,v.shadowMap=Et,v.state=wt,v.info=_e}H();let lt=new Vf(v,k);this.xr=lt,this.getContext=function(){return k},this.getContextAttributes=function(){return k.getContextAttributes()},this.forceContextLoss=function(){let y=Gt.get("WEBGL_lose_context");y&&y.loseContext()},this.forceContextRestore=function(){let y=Gt.get("WEBGL_lose_context");y&&y.restoreContext()},this.getPixelRatio=function(){return q},this.setPixelRatio=function(y){y!==void 0&&(q=y,this.setSize(G,K,!1))},this.getSize=function(y){return y.set(G,K)},this.setSize=function(y,A,O=!0){if(lt.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}G=y,K=A,n.width=Math.floor(y*q),n.height=Math.floor(A*q),O===!0&&(n.style.width=y+"px",n.style.height=A+"px"),this.setViewport(0,0,y,A)},this.getDrawingBufferSize=function(y){return y.set(G*q,K*q).floor()},this.setDrawingBufferSize=function(y,A,O){G=y,K=A,q=O,n.width=Math.floor(y*O),n.height=Math.floor(A*O),this.setViewport(0,0,y,A)},this.getCurrentViewport=function(y){return y.copy(R)},this.getViewport=function(y){return y.copy(Y)},this.setViewport=function(y,A,O,B){y.isVector4?Y.set(y.x,y.y,y.z,y.w):Y.set(y,A,O,B),wt.viewport(R.copy(Y).multiplyScalar(q).round())},this.getScissor=function(y){return y.copy(it)},this.setScissor=function(y,A,O,B){y.isVector4?it.set(y.x,y.y,y.z,y.w):it.set(y,A,O,B),wt.scissor(V.copy(it).multiplyScalar(q).round())},this.getScissorTest=function(){return dt},this.setScissorTest=function(y){wt.setScissorTest(dt=y)},this.setOpaqueSort=function(y){ot=y},this.setTransparentSort=function(y){gt=y},this.getClearColor=function(y){return y.copy(At.getClearColor())},this.setClearColor=function(){At.setClearColor(...arguments)},this.getClearAlpha=function(){return At.getClearAlpha()},this.setClearAlpha=function(){At.setClearAlpha(...arguments)},this.clear=function(y=!0,A=!0,O=!0){let B=0;if(y){let L=!1;if(P!==null){let j=P.texture.format;L=j===bl||j===xl||j===yl}if(L){let j=P.texture.type,X=j===Jn||j===Ji||j===Is||j===Ds||j===_l||j===vl,ct=At.getClearColor(),ut=At.getClearAlpha(),St=ct.r,nt=ct.g,vt=ct.b;X?(m[0]=St,m[1]=nt,m[2]=vt,m[3]=ut,k.clearBufferuiv(k.COLOR,0,m)):(_[0]=St,_[1]=nt,_[2]=vt,_[3]=ut,k.clearBufferiv(k.COLOR,0,_))}else B|=k.COLOR_BUFFER_BIT}A&&(B|=k.DEPTH_BUFFER_BIT),O&&(B|=k.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),k.clear(B)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){n.removeEventListener("webglcontextlost",ft,!1),n.removeEventListener("webglcontextrestored",xt,!1),n.removeEventListener("webglcontextcreationerror",at,!1),At.dispose(),Z.dispose(),Rt.dispose(),Tt.dispose(),Ie.dispose(),Ae.dispose(),W.dispose(),pt.dispose(),Wt.dispose(),J.dispose(),lt.dispose(),lt.removeEventListener("sessionstart",en),lt.removeEventListener("sessionend",ro),yi.stop()};function ft(y){y.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),M=!0}function xt(){console.log("THREE.WebGLRenderer: Context Restored."),M=!1;let y=_e.autoReset,A=Et.enabled,O=Et.autoUpdate,B=Et.needsUpdate,L=Et.type;H(),_e.autoReset=y,Et.enabled=A,Et.autoUpdate=O,Et.needsUpdate=B,Et.type=L}function at(y){console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ",y.statusMessage)}function tt(y){let A=y.target;A.removeEventListener("dispose",tt),bt(A)}function bt(y){Ht(y),Tt.remove(y)}function Ht(y){let A=Tt.get(y).programs;A!==void 0&&(A.forEach(function(O){J.releaseProgram(O)}),y.isShaderMaterial&&J.releaseShaderCache(y))}this.renderBufferDirect=function(y,A,O,B,L,j){A===null&&(A=It);let X=L.isMesh&&L.matrixWorld.determinant()<0,ct=Ha(y,A,O,B,L);wt.setMaterial(B,X);let ut=O.index,St=1;if(B.wireframe===!0){if(ut=E.getWireframeAttribute(O),ut===void 0)return;St=2}let nt=O.drawRange,vt=O.attributes.position,Pt=nt.start*St,qt=(nt.start+nt.count)*St;j!==null&&(Pt=Math.max(Pt,j.start*St),qt=Math.min(qt,(j.start+j.count)*St)),ut!==null?(Pt=Math.max(Pt,0),qt=Math.min(qt,ut.count)):vt!=null&&(Pt=Math.max(Pt,0),qt=Math.min(qt,vt.count));let ne=qt-Pt;if(ne<0||ne===1/0)return;pt.setup(L,B,ct,O,ut);let oe,te=_t;if(ut!==null&&(oe=D.get(ut),te=Ft,te.setIndex(oe)),L.isMesh)B.wireframe===!0?(wt.setLineWidth(B.wireframeLinewidth*Re()),te.setMode(k.LINES)):te.setMode(k.TRIANGLES);else if(L.isLine){let Dt=B.linewidth;Dt===void 0&&(Dt=1),wt.setLineWidth(Dt*Re()),L.isLineSegments?te.setMode(k.LINES):L.isLineLoop?te.setMode(k.LINE_LOOP):te.setMode(k.LINE_STRIP)}else L.isPoints?te.setMode(k.POINTS):L.isSprite&&te.setMode(k.TRIANGLES);if(L.isBatchedMesh)if(L._multiDrawInstances!==null)ys("THREE.WebGLRenderer: renderMultiDrawInstances has been deprecated and will be removed in r184. Append to renderMultiDraw arguments and use indirection."),te.renderMultiDrawInstances(L._multiDrawStarts,L._multiDrawCounts,L._multiDrawCount,L._multiDrawInstances);else if(Gt.get("WEBGL_multi_draw"))te.renderMultiDraw(L._multiDrawStarts,L._multiDrawCounts,L._multiDrawCount);else{let Dt=L._multiDrawStarts,be=L._multiDrawCounts,ie=L._multiDrawCount,_n=ut?D.get(ut).bytesPerElement:1,Kr=Tt.get(B).currentProgram.getUniforms();for(let vn=0;vn<ie;vn++)Kr.setValue(k,"_gl_DrawID",vn),te.render(Dt[vn]/_n,be[vn])}else if(L.isInstancedMesh)te.renderInstances(Pt,ne,L.count);else if(O.isInstancedBufferGeometry){let Dt=O._maxInstanceCount!==void 0?O._maxInstanceCount:1/0,be=Math.min(O.instanceCount,Dt);te.renderInstances(Pt,ne,be)}else te.render(Pt,ne)};function he(y,A,O){y.transparent===!0&&y.side===fi&&y.forceSinglePass===!1?(y.side=We,y.needsUpdate=!0,gr(y,A,O),y.side=Ci,y.needsUpdate=!0,gr(y,A,O),y.side=fi):gr(y,A,O)}this.compile=function(y,A,O=null){O===null&&(O=y),p=Rt.get(O),p.init(A),x.push(p),O.traverseVisible(function(L){L.isLight&&L.layers.test(A.layers)&&(p.pushLight(L),L.castShadow&&p.pushShadow(L))}),y!==O&&y.traverseVisible(function(L){L.isLight&&L.layers.test(A.layers)&&(p.pushLight(L),L.castShadow&&p.pushShadow(L))}),p.setupLights();let B=new Set;return y.traverse(function(L){if(!(L.isMesh||L.isPoints||L.isLine||L.isSprite))return;let j=L.material;if(j)if(Array.isArray(j))for(let X=0;X<j.length;X++){let ct=j[X];he(ct,O,L),B.add(ct)}else he(j,O,L),B.add(j)}),p=x.pop(),B},this.compileAsync=function(y,A,O=null){let B=this.compile(y,A,O);return new Promise(L=>{function j(){if(B.forEach(function(X){Tt.get(X).currentProgram.isReady()&&B.delete(X)}),B.size===0){L(y);return}setTimeout(j,10)}Gt.get("KHR_parallel_shader_compile")!==null?j():setTimeout(j,10)})};let se=null;function Gn(y){se&&se(y)}function en(){yi.stop()}function ro(){yi.start()}let yi=new Tg;yi.setAnimationLoop(Gn),typeof self<"u"&&yi.setContext(self),this.setAnimationLoop=function(y){se=y,lt.setAnimationLoop(y),y===null?yi.stop():yi.start()},lt.addEventListener("sessionstart",en),lt.addEventListener("sessionend",ro),this.render=function(y,A){if(A!==void 0&&A.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(M===!0)return;if(y.matrixWorldAutoUpdate===!0&&y.updateMatrixWorld(),A.parent===null&&A.matrixWorldAutoUpdate===!0&&A.updateMatrixWorld(),lt.enabled===!0&&lt.isPresenting===!0&&(lt.cameraAutoUpdate===!0&&lt.updateCamera(A),A=lt.getCamera()),y.isScene===!0&&y.onBeforeRender(v,y,A,P),p=Rt.get(y,x.length),p.init(A),x.push(p),Q.multiplyMatrices(A.projectionMatrix,A.matrixWorldInverse),zt.setFromProjectionMatrix(Q,$n,A.reversedDepth),$=this.localClippingEnabled,Lt=ht.init(this.clippingPlanes,$),g=Z.get(y,b.length),g.init(),b.push(g),lt.enabled===!0&&lt.isPresenting===!0){let j=v.xr.getDepthSensingMesh();j!==null&&so(j,A,-1/0,v.sortObjects)}so(y,A,0,v.sortObjects),g.finish(),v.sortObjects===!0&&g.sort(ot,gt),Qt=lt.enabled===!1||lt.isPresenting===!1||lt.hasDepthSensing()===!1,Qt&&At.addToRenderList(g,y),this.info.render.frame++,Lt===!0&&ht.beginShadows();let O=p.state.shadowsArray;Et.render(O,y,A),Lt===!0&&ht.endShadows(),this.info.autoReset===!0&&this.info.reset();let B=g.opaque,L=g.transmissive;if(p.setupLights(),A.isArrayCamera){let j=A.cameras;if(L.length>0)for(let X=0,ct=j.length;X<ct;X++){let ut=j[X];ka(B,L,y,ut)}Qt&&At.render(y);for(let X=0,ct=j.length;X<ct;X++){let ut=j[X];za(g,y,ut,ut.viewport)}}else L.length>0&&ka(B,L,y,A),Qt&&At.render(y),za(g,y,A);P!==null&&C===0&&(jt.updateMultisampleRenderTarget(P),jt.updateRenderTargetMipmap(P)),y.isScene===!0&&y.onAfterRender(v,y,A),pt.resetDefaultState(),T=-1,w=null,x.pop(),x.length>0?(p=x[x.length-1],Lt===!0&&ht.setGlobalState(v.clippingPlanes,p.state.camera)):p=null,b.pop(),b.length>0?g=b[b.length-1]:g=null};function so(y,A,O,B){if(y.visible===!1)return;if(y.layers.test(A.layers)){if(y.isGroup)O=y.renderOrder;else if(y.isLOD)y.autoUpdate===!0&&y.update(A);else if(y.isLight)p.pushLight(y),y.castShadow&&p.pushShadow(y);else if(y.isSprite){if(!y.frustumCulled||zt.intersectsSprite(y)){B&&Bt.setFromMatrixPosition(y.matrixWorld).applyMatrix4(Q);let X=W.update(y),ct=y.material;ct.visible&&g.push(y,X,ct,O,Bt.z,null)}}else if((y.isMesh||y.isLine||y.isPoints)&&(!y.frustumCulled||zt.intersectsObject(y))){let X=W.update(y),ct=y.material;if(B&&(y.boundingSphere!==void 0?(y.boundingSphere===null&&y.computeBoundingSphere(),Bt.copy(y.boundingSphere.center)):(X.boundingSphere===null&&X.computeBoundingSphere(),Bt.copy(X.boundingSphere.center)),Bt.applyMatrix4(y.matrixWorld).applyMatrix4(Q)),Array.isArray(ct)){let ut=X.groups;for(let St=0,nt=ut.length;St<nt;St++){let vt=ut[St],Pt=ct[vt.materialIndex];Pt&&Pt.visible&&g.push(y,X,Pt,O,Bt.z,vt)}}else ct.visible&&g.push(y,X,ct,O,Bt.z,null)}}let j=y.children;for(let X=0,ct=j.length;X<ct;X++)so(j[X],A,O,B)}function za(y,A,O,B){let L=y.opaque,j=y.transmissive,X=y.transparent;p.setupLightsView(O),Lt===!0&&ht.setGlobalState(v.clippingPlanes,O),B&&wt.viewport(R.copy(B)),L.length>0&&mr(L,A,O),j.length>0&&mr(j,A,O),X.length>0&&mr(X,A,O),wt.buffers.depth.setTest(!0),wt.buffers.depth.setMask(!0),wt.buffers.color.setMask(!0),wt.setPolygonOffset(!1)}function ka(y,A,O,B){if((O.isScene===!0?O.overrideMaterial:null)!==null)return;p.state.transmissionRenderTarget[B.id]===void 0&&(p.state.transmissionRenderTarget[B.id]=new Ze(1,1,{generateMipmaps:!0,type:Gt.has("EXT_color_buffer_half_float")||Gt.has("EXT_color_buffer_float")?Un:Jn,minFilter:Ki,samples:4,stencilBuffer:s,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:ee.workingColorSpace}));let j=p.state.transmissionRenderTarget[B.id],X=B.viewport||R;j.setSize(X.z*v.transmissionResolutionScale,X.w*v.transmissionResolutionScale);let ct=v.getRenderTarget(),ut=v.getActiveCubeFace(),St=v.getActiveMipmapLevel();v.setRenderTarget(j),v.getClearColor(z),U=v.getClearAlpha(),U<1&&v.setClearColor(16777215,.5),v.clear(),Qt&&At.render(O);let nt=v.toneMapping;v.toneMapping=Di;let vt=B.viewport;if(B.viewport!==void 0&&(B.viewport=void 0),p.setupLightsView(B),Lt===!0&&ht.setGlobalState(v.clippingPlanes,B),mr(y,O,B),jt.updateMultisampleRenderTarget(j),jt.updateRenderTargetMipmap(j),Gt.has("WEBGL_multisampled_render_to_texture")===!1){let Pt=!1;for(let qt=0,ne=A.length;qt<ne;qt++){let oe=A[qt],te=oe.object,Dt=oe.geometry,be=oe.material,ie=oe.group;if(be.side===fi&&te.layers.test(B.layers)){let _n=be.side;be.side=We,be.needsUpdate=!0,oo(te,O,B,Dt,be,ie),be.side=_n,be.needsUpdate=!0,Pt=!0}}Pt===!0&&(jt.updateMultisampleRenderTarget(j),jt.updateRenderTargetMipmap(j))}v.setRenderTarget(ct,ut,St),v.setClearColor(z,U),vt!==void 0&&(B.viewport=vt),v.toneMapping=nt}function mr(y,A,O){let B=A.isScene===!0?A.overrideMaterial:null;for(let L=0,j=y.length;L<j;L++){let X=y[L],ct=X.object,ut=X.geometry,St=X.group,nt=X.material;nt.allowOverride===!0&&B!==null&&(nt=B),ct.layers.test(O.layers)&&oo(ct,A,O,ut,nt,St)}}function oo(y,A,O,B,L,j){y.onBeforeRender(v,A,O,B,L,j),y.modelViewMatrix.multiplyMatrices(O.matrixWorldInverse,y.matrixWorld),y.normalMatrix.getNormalMatrix(y.modelViewMatrix),L.onBeforeRender(v,A,O,B,y,j),L.transparent===!0&&L.side===fi&&L.forceSinglePass===!1?(L.side=We,L.needsUpdate=!0,v.renderBufferDirect(O,A,B,L,y,j),L.side=Ci,L.needsUpdate=!0,v.renderBufferDirect(O,A,B,L,y,j),L.side=fi):v.renderBufferDirect(O,A,B,L,y,j),y.onAfterRender(v,A,O,B,L,j)}function gr(y,A,O){A.isScene!==!0&&(A=It);let B=Tt.get(y),L=p.state.lights,j=p.state.shadowsArray,X=L.state.version,ct=J.getParameters(y,L.state,j,A,O),ut=J.getProgramCacheKey(ct),St=B.programs;B.environment=y.isMeshStandardMaterial?A.environment:null,B.fog=A.fog,B.envMap=(y.isMeshStandardMaterial?Ae:Ie).get(y.envMap||B.environment),B.envMapRotation=B.environment!==null&&y.envMap===null?A.environmentRotation:y.envMapRotation,St===void 0&&(y.addEventListener("dispose",tt),St=new Map,B.programs=St);let nt=St.get(ut);if(nt!==void 0){if(B.currentProgram===nt&&B.lightsStateVersion===X)return Va(y,ct),nt}else ct.uniforms=J.getUniforms(y),y.onBeforeCompile(ct,v),nt=J.acquireProgram(ct,ut),St.set(ut,nt),B.uniforms=ct.uniforms;let vt=B.uniforms;return(!y.isShaderMaterial&&!y.isRawShaderMaterial||y.clipping===!0)&&(vt.clippingPlanes=ht.uniform),Va(y,ct),B.needsLights=Zr(y),B.lightsStateVersion=X,B.needsLights&&(vt.ambientLightColor.value=L.state.ambient,vt.lightProbe.value=L.state.probe,vt.directionalLights.value=L.state.directional,vt.directionalLightShadows.value=L.state.directionalShadow,vt.spotLights.value=L.state.spot,vt.spotLightShadows.value=L.state.spotShadow,vt.rectAreaLights.value=L.state.rectArea,vt.ltc_1.value=L.state.rectAreaLTC1,vt.ltc_2.value=L.state.rectAreaLTC2,vt.pointLights.value=L.state.point,vt.pointLightShadows.value=L.state.pointShadow,vt.hemisphereLights.value=L.state.hemi,vt.directionalShadowMap.value=L.state.directionalShadowMap,vt.directionalShadowMatrix.value=L.state.directionalShadowMatrix,vt.spotShadowMap.value=L.state.spotShadowMap,vt.spotLightMatrix.value=L.state.spotLightMatrix,vt.spotLightMap.value=L.state.spotLightMap,vt.pointShadowMap.value=L.state.pointShadowMap,vt.pointShadowMatrix.value=L.state.pointShadowMatrix),B.currentProgram=nt,B.uniformsList=null,nt}function Ba(y){if(y.uniformsList===null){let A=y.currentProgram.getUniforms();y.uniformsList=Fs.seqWithValue(A.seq,y.uniforms)}return y.uniformsList}function Va(y,A){let O=Tt.get(y);O.outputColorSpace=A.outputColorSpace,O.batching=A.batching,O.batchingColor=A.batchingColor,O.instancing=A.instancing,O.instancingColor=A.instancingColor,O.instancingMorph=A.instancingMorph,O.skinning=A.skinning,O.morphTargets=A.morphTargets,O.morphNormals=A.morphNormals,O.morphColors=A.morphColors,O.morphTargetsCount=A.morphTargetsCount,O.numClippingPlanes=A.numClippingPlanes,O.numIntersection=A.numClipIntersection,O.vertexAlphas=A.vertexAlphas,O.vertexTangents=A.vertexTangents,O.toneMapping=A.toneMapping}function Ha(y,A,O,B,L){A.isScene!==!0&&(A=It),jt.resetTextureUnits();let j=A.fog,X=B.isMeshStandardMaterial?A.environment:null,ct=P===null?v.outputColorSpace:P.isXRRenderTarget===!0?P.texture.colorSpace:Er,ut=(B.isMeshStandardMaterial?Ae:Ie).get(B.envMap||X),St=B.vertexColors===!0&&!!O.attributes.color&&O.attributes.color.itemSize===4,nt=!!O.attributes.tangent&&(!!B.normalMap||B.anisotropy>0),vt=!!O.morphAttributes.position,Pt=!!O.morphAttributes.normal,qt=!!O.morphAttributes.color,ne=Di;B.toneMapped&&(P===null||P.isXRRenderTarget===!0)&&(ne=v.toneMapping);let oe=O.morphAttributes.position||O.morphAttributes.normal||O.morphAttributes.color,te=oe!==void 0?oe.length:0,Dt=Tt.get(B),be=p.state.lights;if(Lt===!0&&($===!0||y!==w)){let nn=y===w&&B.id===T;ht.setState(B,y,nn)}let ie=!1;B.version===Dt.__version?(Dt.needsLights&&Dt.lightsStateVersion!==be.state.version||Dt.outputColorSpace!==ct||L.isBatchedMesh&&Dt.batching===!1||!L.isBatchedMesh&&Dt.batching===!0||L.isBatchedMesh&&Dt.batchingColor===!0&&L.colorTexture===null||L.isBatchedMesh&&Dt.batchingColor===!1&&L.colorTexture!==null||L.isInstancedMesh&&Dt.instancing===!1||!L.isInstancedMesh&&Dt.instancing===!0||L.isSkinnedMesh&&Dt.skinning===!1||!L.isSkinnedMesh&&Dt.skinning===!0||L.isInstancedMesh&&Dt.instancingColor===!0&&L.instanceColor===null||L.isInstancedMesh&&Dt.instancingColor===!1&&L.instanceColor!==null||L.isInstancedMesh&&Dt.instancingMorph===!0&&L.morphTexture===null||L.isInstancedMesh&&Dt.instancingMorph===!1&&L.morphTexture!==null||Dt.envMap!==ut||B.fog===!0&&Dt.fog!==j||Dt.numClippingPlanes!==void 0&&(Dt.numClippingPlanes!==ht.numPlanes||Dt.numIntersection!==ht.numIntersection)||Dt.vertexAlphas!==St||Dt.vertexTangents!==nt||Dt.morphTargets!==vt||Dt.morphNormals!==Pt||Dt.morphColors!==qt||Dt.toneMapping!==ne||Dt.morphTargetsCount!==te)&&(ie=!0):(ie=!0,Dt.__version=B.version);let _n=Dt.currentProgram;ie===!0&&(_n=gr(B,A,L));let Kr=!1,vn=!1,co=!1,Ce=_n.getUniforms(),Rn=Dt.uniforms;if(wt.useProgram(_n.program)&&(Kr=!0,vn=!0,co=!0),B.id!==T&&(T=B.id,vn=!0),Kr||w!==y){wt.buffers.depth.getReversed()&&y.reversedDepth!==!0&&(y._reversedDepth=!0,y.updateProjectionMatrix()),Ce.setValue(k,"projectionMatrix",y.projectionMatrix),Ce.setValue(k,"viewMatrix",y.matrixWorldInverse);let ln=Ce.map.cameraPosition;ln!==void 0&&ln.setValue(k,yt.setFromMatrixPosition(y.matrixWorld)),kt.logarithmicDepthBuffer&&Ce.setValue(k,"logDepthBufFC",2/(Math.log(y.far+1)/Math.LN2)),(B.isMeshPhongMaterial||B.isMeshToonMaterial||B.isMeshLambertMaterial||B.isMeshBasicMaterial||B.isMeshStandardMaterial||B.isShaderMaterial)&&Ce.setValue(k,"isOrthographic",y.isOrthographicCamera===!0),w!==y&&(w=y,vn=!0,co=!0)}if(L.isSkinnedMesh){Ce.setOptional(k,L,"bindMatrix"),Ce.setOptional(k,L,"bindMatrixInverse");let nn=L.skeleton;nn&&(nn.boneTexture===null&&nn.computeBoneTexture(),Ce.setValue(k,"boneTexture",nn.boneTexture,jt))}L.isBatchedMesh&&(Ce.setOptional(k,L,"batchingTexture"),Ce.setValue(k,"batchingTexture",L._matricesTexture,jt),Ce.setOptional(k,L,"batchingIdTexture"),Ce.setValue(k,"batchingIdTexture",L._indirectTexture,jt),Ce.setOptional(k,L,"batchingColorTexture"),L._colorsTexture!==null&&Ce.setValue(k,"batchingColorTexture",L._colorsTexture,jt));let Pn=O.morphAttributes;if((Pn.position!==void 0||Pn.normal!==void 0||Pn.color!==void 0)&&st.update(L,O,_n),(vn||Dt.receiveShadow!==L.receiveShadow)&&(Dt.receiveShadow=L.receiveShadow,Ce.setValue(k,"receiveShadow",L.receiveShadow)),B.isMeshGouraudMaterial&&B.envMap!==null&&(Rn.envMap.value=ut,Rn.flipEnvMap.value=ut.isCubeTexture&&ut.isRenderTargetTexture===!1?-1:1),B.isMeshStandardMaterial&&B.envMap===null&&A.environment!==null&&(Rn.envMapIntensity.value=A.environmentIntensity),vn&&(Ce.setValue(k,"toneMappingExposure",v.toneMappingExposure),Dt.needsLights&&ao(Rn,co),j&&B.fog===!0&&rt.refreshFogUniforms(Rn,j),rt.refreshMaterialUniforms(Rn,B,q,K,p.state.transmissionRenderTarget[y.id]),Fs.upload(k,Ba(Dt),Rn,jt)),B.isShaderMaterial&&B.uniformsNeedUpdate===!0&&(Fs.upload(k,Ba(Dt),Rn,jt),B.uniformsNeedUpdate=!1),B.isSpriteMaterial&&Ce.setValue(k,"center",L.center),Ce.setValue(k,"modelViewMatrix",L.modelViewMatrix),Ce.setValue(k,"normalMatrix",L.normalMatrix),Ce.setValue(k,"modelMatrix",L.matrixWorld),B.isShaderMaterial||B.isRawShaderMaterial){let nn=B.uniformsGroups;for(let ln=0,bu=nn.length;ln<bu;ln++){let _r=nn[ln];Wt.update(_r,_n),Wt.bind(_r,_n)}}return _n}function ao(y,A){y.ambientLightColor.needsUpdate=A,y.lightProbe.needsUpdate=A,y.directionalLights.needsUpdate=A,y.directionalLightShadows.needsUpdate=A,y.pointLights.needsUpdate=A,y.pointLightShadows.needsUpdate=A,y.spotLights.needsUpdate=A,y.spotLightShadows.needsUpdate=A,y.rectAreaLights.needsUpdate=A,y.hemisphereLights.needsUpdate=A}function Zr(y){return y.isMeshLambertMaterial||y.isMeshToonMaterial||y.isMeshPhongMaterial||y.isMeshStandardMaterial||y.isShadowMaterial||y.isShaderMaterial&&y.lights===!0}this.getActiveCubeFace=function(){return S},this.getActiveMipmapLevel=function(){return C},this.getRenderTarget=function(){return P},this.setRenderTargetTextures=function(y,A,O){let B=Tt.get(y);B.__autoAllocateDepthBuffer=y.resolveDepthBuffer===!1,B.__autoAllocateDepthBuffer===!1&&(B.__useRenderToTexture=!1),Tt.get(y.texture).__webglTexture=A,Tt.get(y.depthTexture).__webglTexture=B.__autoAllocateDepthBuffer?void 0:O,B.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(y,A){let O=Tt.get(y);O.__webglFramebuffer=A,O.__useDefaultFramebuffer=A===void 0};let yu=k.createFramebuffer();this.setRenderTarget=function(y,A=0,O=0){P=y,S=A,C=O;let B=!0,L=null,j=!1,X=!1;if(y){let ut=Tt.get(y);if(ut.__useDefaultFramebuffer!==void 0)wt.bindFramebuffer(k.FRAMEBUFFER,null),B=!1;else if(ut.__webglFramebuffer===void 0)jt.setupRenderTarget(y);else if(ut.__hasExternalTextures)jt.rebindTextures(y,Tt.get(y.texture).__webglTexture,Tt.get(y.depthTexture).__webglTexture);else if(y.depthBuffer){let vt=y.depthTexture;if(ut.__boundDepthTexture!==vt){if(vt!==null&&Tt.has(vt)&&(y.width!==vt.image.width||y.height!==vt.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");jt.setupDepthRenderbuffer(y)}}let St=y.texture;(St.isData3DTexture||St.isDataArrayTexture||St.isCompressedArrayTexture)&&(X=!0);let nt=Tt.get(y).__webglFramebuffer;y.isWebGLCubeRenderTarget?(Array.isArray(nt[A])?L=nt[A][O]:L=nt[A],j=!0):y.samples>0&&jt.useMultisampledRTT(y)===!1?L=Tt.get(y).__webglMultisampledFramebuffer:Array.isArray(nt)?L=nt[O]:L=nt,R.copy(y.viewport),V.copy(y.scissor),N=y.scissorTest}else R.copy(Y).multiplyScalar(q).floor(),V.copy(it).multiplyScalar(q).floor(),N=dt;if(O!==0&&(L=yu),wt.bindFramebuffer(k.FRAMEBUFFER,L)&&B&&wt.drawBuffers(y,L),wt.viewport(R),wt.scissor(V),wt.setScissorTest(N),j){let ut=Tt.get(y.texture);k.framebufferTexture2D(k.FRAMEBUFFER,k.COLOR_ATTACHMENT0,k.TEXTURE_CUBE_MAP_POSITIVE_X+A,ut.__webglTexture,O)}else if(X){let ut=A;for(let St=0;St<y.textures.length;St++){let nt=Tt.get(y.textures[St]);k.framebufferTextureLayer(k.FRAMEBUFFER,k.COLOR_ATTACHMENT0+St,nt.__webglTexture,O,ut)}}else if(y!==null&&O!==0){let ut=Tt.get(y.texture);k.framebufferTexture2D(k.FRAMEBUFFER,k.COLOR_ATTACHMENT0,k.TEXTURE_2D,ut.__webglTexture,O)}T=-1},this.readRenderTargetPixels=function(y,A,O,B,L,j,X,ct=0){if(!(y&&y.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let ut=Tt.get(y).__webglFramebuffer;if(y.isWebGLCubeRenderTarget&&X!==void 0&&(ut=ut[X]),ut){wt.bindFramebuffer(k.FRAMEBUFFER,ut);try{let St=y.textures[ct],nt=St.format,vt=St.type;if(!kt.textureFormatReadable(nt)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!kt.textureTypeReadable(vt)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}A>=0&&A<=y.width-B&&O>=0&&O<=y.height-L&&(y.textures.length>1&&k.readBuffer(k.COLOR_ATTACHMENT0+ct),k.readPixels(A,O,B,L,Mt.convert(nt),Mt.convert(vt),j))}finally{let St=P!==null?Tt.get(P).__webglFramebuffer:null;wt.bindFramebuffer(k.FRAMEBUFFER,St)}}},this.readRenderTargetPixelsAsync=async function(y,A,O,B,L,j,X,ct=0){if(!(y&&y.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let ut=Tt.get(y).__webglFramebuffer;if(y.isWebGLCubeRenderTarget&&X!==void 0&&(ut=ut[X]),ut)if(A>=0&&A<=y.width-B&&O>=0&&O<=y.height-L){wt.bindFramebuffer(k.FRAMEBUFFER,ut);let St=y.textures[ct],nt=St.format,vt=St.type;if(!kt.textureFormatReadable(nt))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!kt.textureTypeReadable(vt))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");let Pt=k.createBuffer();k.bindBuffer(k.PIXEL_PACK_BUFFER,Pt),k.bufferData(k.PIXEL_PACK_BUFFER,j.byteLength,k.STREAM_READ),y.textures.length>1&&k.readBuffer(k.COLOR_ATTACHMENT0+ct),k.readPixels(A,O,B,L,Mt.convert(nt),Mt.convert(vt),0);let qt=P!==null?Tt.get(P).__webglFramebuffer:null;wt.bindFramebuffer(k.FRAMEBUFFER,qt);let ne=k.fenceSync(k.SYNC_GPU_COMMANDS_COMPLETE,0);return k.flush(),await Qm(k,ne,4),k.bindBuffer(k.PIXEL_PACK_BUFFER,Pt),k.getBufferSubData(k.PIXEL_PACK_BUFFER,0,j),k.deleteBuffer(Pt),k.deleteSync(ne),j}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(y,A=null,O=0){let B=Math.pow(2,-O),L=Math.floor(y.image.width*B),j=Math.floor(y.image.height*B),X=A!==null?A.x:0,ct=A!==null?A.y:0;jt.setTexture2D(y,0),k.copyTexSubImage2D(k.TEXTURE_2D,O,0,0,X,ct,L,j),wt.unbindTexture()};let xu=k.createFramebuffer(),F=k.createFramebuffer();this.copyTextureToTexture=function(y,A,O=null,B=null,L=0,j=null){j===null&&(L!==0?(ys("WebGLRenderer: copyTextureToTexture function signature has changed to support src and dst mipmap levels."),j=L,L=0):j=0);let X,ct,ut,St,nt,vt,Pt,qt,ne,oe=y.isCompressedTexture?y.mipmaps[j]:y.image;if(O!==null)X=O.max.x-O.min.x,ct=O.max.y-O.min.y,ut=O.isBox3?O.max.z-O.min.z:1,St=O.min.x,nt=O.min.y,vt=O.isBox3?O.min.z:0;else{let Pn=Math.pow(2,-L);X=Math.floor(oe.width*Pn),ct=Math.floor(oe.height*Pn),y.isDataArrayTexture?ut=oe.depth:y.isData3DTexture?ut=Math.floor(oe.depth*Pn):ut=1,St=0,nt=0,vt=0}B!==null?(Pt=B.x,qt=B.y,ne=B.z):(Pt=0,qt=0,ne=0);let te=Mt.convert(A.format),Dt=Mt.convert(A.type),be;A.isData3DTexture?(jt.setTexture3D(A,0),be=k.TEXTURE_3D):A.isDataArrayTexture||A.isCompressedArrayTexture?(jt.setTexture2DArray(A,0),be=k.TEXTURE_2D_ARRAY):(jt.setTexture2D(A,0),be=k.TEXTURE_2D),k.pixelStorei(k.UNPACK_FLIP_Y_WEBGL,A.flipY),k.pixelStorei(k.UNPACK_PREMULTIPLY_ALPHA_WEBGL,A.premultiplyAlpha),k.pixelStorei(k.UNPACK_ALIGNMENT,A.unpackAlignment);let ie=k.getParameter(k.UNPACK_ROW_LENGTH),_n=k.getParameter(k.UNPACK_IMAGE_HEIGHT),Kr=k.getParameter(k.UNPACK_SKIP_PIXELS),vn=k.getParameter(k.UNPACK_SKIP_ROWS),co=k.getParameter(k.UNPACK_SKIP_IMAGES);k.pixelStorei(k.UNPACK_ROW_LENGTH,oe.width),k.pixelStorei(k.UNPACK_IMAGE_HEIGHT,oe.height),k.pixelStorei(k.UNPACK_SKIP_PIXELS,St),k.pixelStorei(k.UNPACK_SKIP_ROWS,nt),k.pixelStorei(k.UNPACK_SKIP_IMAGES,vt);let Ce=y.isDataArrayTexture||y.isData3DTexture,Rn=A.isDataArrayTexture||A.isData3DTexture;if(y.isDepthTexture){let Pn=Tt.get(y),nn=Tt.get(A),ln=Tt.get(Pn.__renderTarget),bu=Tt.get(nn.__renderTarget);wt.bindFramebuffer(k.READ_FRAMEBUFFER,ln.__webglFramebuffer),wt.bindFramebuffer(k.DRAW_FRAMEBUFFER,bu.__webglFramebuffer);for(let _r=0;_r<ut;_r++)Ce&&(k.framebufferTextureLayer(k.READ_FRAMEBUFFER,k.COLOR_ATTACHMENT0,Tt.get(y).__webglTexture,L,vt+_r),k.framebufferTextureLayer(k.DRAW_FRAMEBUFFER,k.COLOR_ATTACHMENT0,Tt.get(A).__webglTexture,j,ne+_r)),k.blitFramebuffer(St,nt,X,ct,Pt,qt,X,ct,k.DEPTH_BUFFER_BIT,k.NEAREST);wt.bindFramebuffer(k.READ_FRAMEBUFFER,null),wt.bindFramebuffer(k.DRAW_FRAMEBUFFER,null)}else if(L!==0||y.isRenderTargetTexture||Tt.has(y)){let Pn=Tt.get(y),nn=Tt.get(A);wt.bindFramebuffer(k.READ_FRAMEBUFFER,xu),wt.bindFramebuffer(k.DRAW_FRAMEBUFFER,F);for(let ln=0;ln<ut;ln++)Ce?k.framebufferTextureLayer(k.READ_FRAMEBUFFER,k.COLOR_ATTACHMENT0,Pn.__webglTexture,L,vt+ln):k.framebufferTexture2D(k.READ_FRAMEBUFFER,k.COLOR_ATTACHMENT0,k.TEXTURE_2D,Pn.__webglTexture,L),Rn?k.framebufferTextureLayer(k.DRAW_FRAMEBUFFER,k.COLOR_ATTACHMENT0,nn.__webglTexture,j,ne+ln):k.framebufferTexture2D(k.DRAW_FRAMEBUFFER,k.COLOR_ATTACHMENT0,k.TEXTURE_2D,nn.__webglTexture,j),L!==0?k.blitFramebuffer(St,nt,X,ct,Pt,qt,X,ct,k.COLOR_BUFFER_BIT,k.NEAREST):Rn?k.copyTexSubImage3D(be,j,Pt,qt,ne+ln,St,nt,X,ct):k.copyTexSubImage2D(be,j,Pt,qt,St,nt,X,ct);wt.bindFramebuffer(k.READ_FRAMEBUFFER,null),wt.bindFramebuffer(k.DRAW_FRAMEBUFFER,null)}else Rn?y.isDataTexture||y.isData3DTexture?k.texSubImage3D(be,j,Pt,qt,ne,X,ct,ut,te,Dt,oe.data):A.isCompressedArrayTexture?k.compressedTexSubImage3D(be,j,Pt,qt,ne,X,ct,ut,te,oe.data):k.texSubImage3D(be,j,Pt,qt,ne,X,ct,ut,te,Dt,oe):y.isDataTexture?k.texSubImage2D(k.TEXTURE_2D,j,Pt,qt,X,ct,te,Dt,oe.data):y.isCompressedTexture?k.compressedTexSubImage2D(k.TEXTURE_2D,j,Pt,qt,oe.width,oe.height,te,oe.data):k.texSubImage2D(k.TEXTURE_2D,j,Pt,qt,X,ct,te,Dt,oe);k.pixelStorei(k.UNPACK_ROW_LENGTH,ie),k.pixelStorei(k.UNPACK_IMAGE_HEIGHT,_n),k.pixelStorei(k.UNPACK_SKIP_PIXELS,Kr),k.pixelStorei(k.UNPACK_SKIP_ROWS,vn),k.pixelStorei(k.UNPACK_SKIP_IMAGES,co),j===0&&A.generateMipmaps&&k.generateMipmap(be),wt.unbindTexture()},this.initRenderTarget=function(y){Tt.get(y).__webglFramebuffer===void 0&&jt.setupRenderTarget(y)},this.initTexture=function(y){y.isCubeTexture?jt.setTextureCube(y,0):y.isData3DTexture?jt.setTexture3D(y,0):y.isDataArrayTexture||y.isCompressedArrayTexture?jt.setTexture2DArray(y,0):jt.setTexture2D(y,0),wt.unbindTexture()},this.resetState=function(){S=0,C=0,P=null,wt.reset(),pt.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return $n}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(t){this._outputColorSpace=t;let n=this.getContext();n.drawingBufferColorSpace=ee._getDrawingBufferColorSpace(t),n.unpackColorSpace=ee._getUnpackColorSpace()}};var zs=new un,Ni=new et,Ig=new I,Wf=new et,ih=new et,rh=new I,jf=new I,Dg=new Vt,Lg=new I,Og=new I,Je=null,mi=null,Fi=[],Qi={NONE:-1,PAN:0,ROTATE:1},sh=class extends Sn{constructor(t,n,i=null){super(n,i),this.objects=t,this.recursive=!0,this.transformGroup=!1,this.rotateSpeed=1,this.raycaster=new Ii,this.mouseButtons={LEFT:Pe.PAN,MIDDLE:Pe.PAN,RIGHT:Pe.ROTATE},this.touches={ONE:Fn.PAN},this._onPointerMove=yE.bind(this),this._onPointerDown=xE.bind(this),this._onPointerCancel=bE.bind(this),this._onContextMenu=ME.bind(this),i!==null&&this.connect(i)}connect(t){super.connect(t),this.domElement.addEventListener("pointermove",this._onPointerMove),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointerup",this._onPointerCancel),this.domElement.addEventListener("pointerleave",this._onPointerCancel),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.style.touchAction="none"}disconnect(){this.domElement.removeEventListener("pointermove",this._onPointerMove),this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.removeEventListener("pointerup",this._onPointerCancel),this.domElement.removeEventListener("pointerleave",this._onPointerCancel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.domElement.style.touchAction="auto",this.domElement.style.cursor=""}dispose(){this.disconnect()}_updatePointer(t){let n=this.domElement.getBoundingClientRect();Ni.x=(t.clientX-n.left)/n.width*2-1,Ni.y=-(t.clientY-n.top)/n.height*2+1}_updateState(t){let n;if(t.pointerType==="touch")n=this.touches.ONE;else switch(t.button){case 0:n=this.mouseButtons.LEFT;break;case 1:n=this.mouseButtons.MIDDLE;break;case 2:n=this.mouseButtons.RIGHT;break;default:n=null}switch(n){case Pe.PAN:case Fn.PAN:this.state=Qi.PAN;break;case Pe.ROTATE:case Fn.ROTATE:this.state=Qi.ROTATE;break;default:this.state=Qi.NONE}}};function yE(e){let t=this.object,n=this.domElement,i=this.raycaster;if(this.enabled!==!1){if(this._updatePointer(e),i.setFromCamera(Ni,t),Je)this.state===Qi.PAN?i.ray.intersectPlane(zs,rh)&&(Je.position.copy(rh.sub(Ig).applyMatrix4(Dg)),this.dispatchEvent({type:"drag",object:Je})):this.state===Qi.ROTATE&&(Wf.subVectors(Ni,ih).multiplyScalar(this.rotateSpeed),Je.rotateOnWorldAxis(Lg,Wf.x),Je.rotateOnWorldAxis(Og.normalize(),-Wf.y),this.dispatchEvent({type:"drag",object:Je})),ih.copy(Ni);else if(e.pointerType==="mouse"||e.pointerType==="pen")if(Fi.length=0,i.setFromCamera(Ni,t),i.intersectObjects(this.objects,this.recursive,Fi),Fi.length>0){let r=Fi[0].object;zs.setFromNormalAndCoplanarPoint(t.getWorldDirection(zs.normal),jf.setFromMatrixPosition(r.matrixWorld)),mi!==r&&mi!==null&&(this.dispatchEvent({type:"hoveroff",object:mi}),n.style.cursor="auto",mi=null),mi!==r&&(this.dispatchEvent({type:"hoveron",object:r}),n.style.cursor="pointer",mi=r)}else mi!==null&&(this.dispatchEvent({type:"hoveroff",object:mi}),n.style.cursor="auto",mi=null);ih.copy(Ni)}}function xE(e){let t=this.object,n=this.domElement,i=this.raycaster;this.enabled!==!1&&(this._updatePointer(e),this._updateState(e),Fi.length=0,i.setFromCamera(Ni,t),i.intersectObjects(this.objects,this.recursive,Fi),Fi.length>0&&(this.transformGroup===!0?Je=Ng(Fi[0].object):Je=Fi[0].object,zs.setFromNormalAndCoplanarPoint(t.getWorldDirection(zs.normal),jf.setFromMatrixPosition(Je.matrixWorld)),i.ray.intersectPlane(zs,rh)&&(this.state===Qi.PAN?(Dg.copy(Je.parent.matrixWorld).invert(),Ig.copy(rh).sub(jf.setFromMatrixPosition(Je.matrixWorld)),n.style.cursor="move",this.dispatchEvent({type:"dragstart",object:Je})):this.state===Qi.ROTATE&&(Lg.set(0,1,0).applyQuaternion(t.quaternion).normalize(),Og.set(1,0,0).applyQuaternion(t.quaternion).normalize(),n.style.cursor="move",this.dispatchEvent({type:"dragstart",object:Je})))),ih.copy(Ni))}function bE(){this.enabled!==!1&&(Je&&(this.dispatchEvent({type:"dragend",object:Je}),Je=null),this.domElement.style.cursor=mi?"pointer":"auto",this.state=Qi.NONE)}function ME(e){this.enabled!==!1&&e.preventDefault()}function Ng(e,t=null){return e.isGroup&&(t=e),e.parent===null?t:Ng(e.parent,t)}function qf(e,t,n){var i,r=1;e==null&&(e=0),t==null&&(t=0),n==null&&(n=0);function s(){var o,a=i.length,c,l=0,u=0,h=0;for(o=0;o<a;++o)c=i[o],l+=c.x||0,u+=c.y||0,h+=c.z||0;for(l=(l/a-e)*r,u=(u/a-t)*r,h=(h/a-n)*r,o=0;o<a;++o)c=i[o],l&&(c.x-=l),u&&(c.y-=u),h&&(c.z-=h)}return s.initialize=function(o){i=o},s.x=function(o){return arguments.length?(e=+o,s):e},s.y=function(o){return arguments.length?(t=+o,s):t},s.z=function(o){return arguments.length?(n=+o,s):n},s.strength=function(o){return arguments.length?(r=+o,s):r},s}function Fg(e){let t=+this._x.call(null,e);return Ug(this.cover(t),t,e)}function Ug(e,t,n){if(isNaN(t))return e;var i,r=e._root,s={data:n},o=e._x0,a=e._x1,c,l,u,h,f;if(!r)return e._root=s,e;for(;r.length;)if((u=t>=(c=(o+a)/2))?o=c:a=c,i=r,!(r=r[h=+u]))return i[h]=s,e;if(l=+e._x.call(null,r.data),t===l)return s.next=r,i?i[h]=s:e._root=s,e;do i=i?i[h]=new Array(2):e._root=new Array(2),(u=t>=(c=(o+a)/2))?o=c:a=c;while((h=+u)==(f=+(l>=c)));return i[f]=r,i[h]=s,e}function zg(e){Array.isArray(e)||(e=Array.from(e));let t=e.length,n=new Float64Array(t),i=1/0,r=-1/0;for(let s=0,o;s<t;++s)isNaN(o=+this._x.call(null,e[s]))||(n[s]=o,o<i&&(i=o),o>r&&(r=o));if(i>r)return this;this.cover(i).cover(r);for(let s=0;s<t;++s)Ug(this,n[s],e[s]);return this}function kg(e){if(isNaN(e=+e))return this;var t=this._x0,n=this._x1;if(isNaN(t))n=(t=Math.floor(e))+1;else{for(var i=n-t||1,r=this._root,s,o;t>e||e>=n;)switch(o=+(e<t),s=new Array(2),s[o]=r,r=s,i*=2,o){case 0:n=t+i;break;case 1:t=n-i;break}this._root&&this._root.length&&(this._root=r)}return this._x0=t,this._x1=n,this}function Bg(){var e=[];return this.visit(function(t){if(!t.length)do e.push(t.data);while(t=t.next)}),e}function Vg(e){return arguments.length?this.cover(+e[0][0]).cover(+e[1][0]):isNaN(this._x0)?void 0:[[this._x0],[this._x1]]}function kn(e,t,n){this.node=e,this.x0=t,this.x1=n}function Hg(e,t){var n,i=this._x0,r,s,o=this._x1,a=[],c=this._root,l,u;for(c&&a.push(new kn(c,i,o)),t==null?t=1/0:(i=e-t,o=e+t);l=a.pop();)if(!(!(c=l.node)||(r=l.x0)>o||(s=l.x1)<i))if(c.length){var h=(r+s)/2;a.push(new kn(c[1],h,s),new kn(c[0],r,h)),(u=+(e>=h))&&(l=a[a.length-1],a[a.length-1]=a[a.length-1-u],a[a.length-1-u]=l)}else{var f=Math.abs(e-+this._x.call(null,c.data));f<t&&(t=f,i=e-f,o=e+f,n=c.data)}return n}function Gg(e){if(isNaN(c=+this._x.call(null,e)))return this;var t,n=this._root,i,r,s,o=this._x0,a=this._x1,c,l,u,h,f;if(!n)return this;if(n.length)for(;;){if((u=c>=(l=(o+a)/2))?o=l:a=l,t=n,!(n=n[h=+u]))return this;if(!n.length)break;t[h+1&1]&&(i=t,f=h)}for(;n.data!==e;)if(r=n,!(n=n.next))return this;return(s=n.next)&&delete n.next,r?(s?r.next=s:delete r.next,this):t?(s?t[h]=s:delete t[h],(n=t[0]||t[1])&&n===(t[1]||t[0])&&!n.length&&(i?i[f]=n:this._root=n),this):(this._root=s,this)}function Wg(e){for(var t=0,n=e.length;t<n;++t)this.remove(e[t]);return this}function jg(){return this._root}function qg(){var e=0;return this.visit(function(t){if(!t.length)do++e;while(t=t.next)}),e}function Xg(e){var t=[],n,i=this._root,r,s,o;for(i&&t.push(new kn(i,this._x0,this._x1));n=t.pop();)if(!e(i=n.node,s=n.x0,o=n.x1)&&i.length){var a=(s+o)/2;(r=i[1])&&t.push(new kn(r,a,o)),(r=i[0])&&t.push(new kn(r,s,a))}return this}function $g(e){var t=[],n=[],i;for(this._root&&t.push(new kn(this._root,this._x0,this._x1));i=t.pop();){var r=i.node;if(r.length){var s,o=i.x0,a=i.x1,c=(o+a)/2;(s=r[0])&&t.push(new kn(s,o,c)),(s=r[1])&&t.push(new kn(s,c,a))}n.push(i)}for(;i=n.pop();)e(i.node,i.x0,i.x1);return this}function Yg(e){return e[0]}function Zg(e){return arguments.length?(this._x=e,this):this._x}function sa(e,t){var n=new Xf(t??Yg,NaN,NaN);return e==null?n:n.addAll(e)}function Xf(e,t,n){this._x=e,this._x0=t,this._x1=n,this._root=void 0}function Kg(e){for(var t={data:e.data},n=t;e=e.next;)n=n.next={data:e.data};return t}var dn=sa.prototype=Xf.prototype;dn.copy=function(){var e=new Xf(this._x,this._x0,this._x1),t=this._root,n,i;if(!t)return e;if(!t.length)return e._root=Kg(t),e;for(n=[{source:t,target:e._root=new Array(2)}];t=n.pop();)for(var r=0;r<2;++r)(i=t.source[r])&&(i.length?n.push({source:i,target:t.target[r]=new Array(2)}):t.target[r]=Kg(i));return e};dn.add=Fg;dn.addAll=zg;dn.cover=kg;dn.data=Bg;dn.extent=Vg;dn.find=Hg;dn.remove=Gg;dn.removeAll=Wg;dn.root=jg;dn.size=qg;dn.visit=Xg;dn.visitAfter=$g;dn.x=Zg;function SE(e){let t=+this._x.call(null,e),n=+this._y.call(null,e);return Qg(this.cover(t,n),t,n,e)}function Qg(e,t,n,i){if(isNaN(t)||isNaN(n))return e;var r,s=e._root,o={data:i},a=e._x0,c=e._y0,l=e._x1,u=e._y1,h,f,d,m,_,g,p,b;if(!s)return e._root=o,e;for(;s.length;)if((_=t>=(h=(a+l)/2))?a=h:l=h,(g=n>=(f=(c+u)/2))?c=f:u=f,r=s,!(s=s[p=g<<1|_]))return r[p]=o,e;if(d=+e._x.call(null,s.data),m=+e._y.call(null,s.data),t===d&&n===m)return o.next=s,r?r[p]=o:e._root=o,e;do r=r?r[p]=new Array(4):e._root=new Array(4),(_=t>=(h=(a+l)/2))?a=h:l=h,(g=n>=(f=(c+u)/2))?c=f:u=f;while((p=g<<1|_)===(b=(m>=f)<<1|d>=h));return r[b]=s,r[p]=o,e}function wE(e){Array.isArray(e)||(e=Array.from(e));let t=e.length,n=new Float64Array(t),i=new Float64Array(t),r=1/0,s=r,o=-r,a=o;for(let c=0,l,u,h;c<t;++c){if(isNaN(u=+this._x.call(null,l=e[c]))||isNaN(h=+this._y.call(null,l))){n[c]=NaN;continue}n[c]=u,i[c]=h,u<r&&(r=u),u>o&&(o=u),h<s&&(s=h),h>a&&(a=h)}if(r>o||s>a)return this;this.cover(r,s).cover(o,a);for(let c=0;c<t;++c)Qg(this,n[c],i[c],e[c]);return this}function EE(e,t){if(isNaN(e=+e)||isNaN(t=+t))return this;var n=this._x0,i=this._y0,r=this._x1,s=this._y1;if(isNaN(n))r=(n=Math.floor(e))+1,s=(i=Math.floor(t))+1;else{for(var o=r-n||1,a=this._root,c,l;n>e||e>=r||i>t||t>=s;)switch(l=(t<i)<<1|e<n,c=new Array(4),c[l]=a,a=c,o*=2,l){case 0:r=n+o,s=i+o;break;case 1:n=r-o,s=i+o;break;case 2:r=n+o,i=s-o;break;case 3:n=r-o,i=s-o;break}this._root&&this._root.length&&(this._root=a)}return this._x0=n,this._y0=i,this._x1=r,this._y1=s,this}function TE(){var e=[];return this.visit(function(t){if(!t.length)do e.push(t.data);while(t=t.next)}),e}function AE(e){return arguments.length?this.cover(+e[0][0],+e[0][1]).cover(+e[1][0],+e[1][1]):isNaN(this._x0)?void 0:[[this._x0,this._y0],[this._x1,this._y1]]}function on(e,t,n,i,r){this.node=e,this.x0=t,this.y0=n,this.x1=i,this.y1=r}function CE(e,t,n){var i,r=this._x0,s=this._y0,o,a,c,l,u=this._x1,h=this._y1,f=[],d=this._root,m,_;for(d&&f.push(new on(d,r,s,u,h)),n==null?n=1/0:(r=e-n,s=t-n,u=e+n,h=t+n,n*=n);m=f.pop();)if(!(!(d=m.node)||(o=m.x0)>u||(a=m.y0)>h||(c=m.x1)<r||(l=m.y1)<s))if(d.length){var g=(o+c)/2,p=(a+l)/2;f.push(new on(d[3],g,p,c,l),new on(d[2],o,p,g,l),new on(d[1],g,a,c,p),new on(d[0],o,a,g,p)),(_=(t>=p)<<1|e>=g)&&(m=f[f.length-1],f[f.length-1]=f[f.length-1-_],f[f.length-1-_]=m)}else{var b=e-+this._x.call(null,d.data),x=t-+this._y.call(null,d.data),v=b*b+x*x;if(v<n){var M=Math.sqrt(n=v);r=e-M,s=t-M,u=e+M,h=t+M,i=d.data}}return i}function RE(e){if(isNaN(u=+this._x.call(null,e))||isNaN(h=+this._y.call(null,e)))return this;var t,n=this._root,i,r,s,o=this._x0,a=this._y0,c=this._x1,l=this._y1,u,h,f,d,m,_,g,p;if(!n)return this;if(n.length)for(;;){if((m=u>=(f=(o+c)/2))?o=f:c=f,(_=h>=(d=(a+l)/2))?a=d:l=d,t=n,!(n=n[g=_<<1|m]))return this;if(!n.length)break;(t[g+1&3]||t[g+2&3]||t[g+3&3])&&(i=t,p=g)}for(;n.data!==e;)if(r=n,!(n=n.next))return this;return(s=n.next)&&delete n.next,r?(s?r.next=s:delete r.next,this):t?(s?t[g]=s:delete t[g],(n=t[0]||t[1]||t[2]||t[3])&&n===(t[3]||t[2]||t[1]||t[0])&&!n.length&&(i?i[p]=n:this._root=n),this):(this._root=s,this)}function PE(e){for(var t=0,n=e.length;t<n;++t)this.remove(e[t]);return this}function IE(){return this._root}function DE(){var e=0;return this.visit(function(t){if(!t.length)do++e;while(t=t.next)}),e}function LE(e){var t=[],n,i=this._root,r,s,o,a,c;for(i&&t.push(new on(i,this._x0,this._y0,this._x1,this._y1));n=t.pop();)if(!e(i=n.node,s=n.x0,o=n.y0,a=n.x1,c=n.y1)&&i.length){var l=(s+a)/2,u=(o+c)/2;(r=i[3])&&t.push(new on(r,l,u,a,c)),(r=i[2])&&t.push(new on(r,s,u,l,c)),(r=i[1])&&t.push(new on(r,l,o,a,u)),(r=i[0])&&t.push(new on(r,s,o,l,u))}return this}function OE(e){var t=[],n=[],i;for(this._root&&t.push(new on(this._root,this._x0,this._y0,this._x1,this._y1));i=t.pop();){var r=i.node;if(r.length){var s,o=i.x0,a=i.y0,c=i.x1,l=i.y1,u=(o+c)/2,h=(a+l)/2;(s=r[0])&&t.push(new on(s,o,a,u,h)),(s=r[1])&&t.push(new on(s,u,a,c,h)),(s=r[2])&&t.push(new on(s,o,h,u,l)),(s=r[3])&&t.push(new on(s,u,h,c,l))}n.push(i)}for(;i=n.pop();)e(i.node,i.x0,i.y0,i.x1,i.y1);return this}function NE(e){return e[0]}function FE(e){return arguments.length?(this._x=e,this):this._x}function UE(e){return e[1]}function zE(e){return arguments.length?(this._y=e,this):this._y}function $f(e,t,n){var i=new Yf(t??NE,n??UE,NaN,NaN,NaN,NaN);return e==null?i:i.addAll(e)}function Yf(e,t,n,i,r,s){this._x=e,this._y=t,this._x0=n,this._y0=i,this._x1=r,this._y1=s,this._root=void 0}function Jg(e){for(var t={data:e.data},n=t;e=e.next;)n=n.next={data:e.data};return t}var an=$f.prototype=Yf.prototype;an.copy=function(){var e=new Yf(this._x,this._y,this._x0,this._y0,this._x1,this._y1),t=this._root,n,i;if(!t)return e;if(!t.length)return e._root=Jg(t),e;for(n=[{source:t,target:e._root=new Array(4)}];t=n.pop();)for(var r=0;r<4;++r)(i=t.source[r])&&(i.length?n.push({source:i,target:t.target[r]=new Array(4)}):t.target[r]=Jg(i));return e};an.add=SE;an.addAll=wE;an.cover=EE;an.data=TE;an.extent=AE;an.find=CE;an.remove=RE;an.removeAll=PE;an.root=IE;an.size=DE;an.visit=LE;an.visitAfter=OE;an.x=FE;an.y=zE;function t0(e){let t=+this._x.call(null,e),n=+this._y.call(null,e),i=+this._z.call(null,e);return e0(this.cover(t,n,i),t,n,i,e)}function e0(e,t,n,i,r){if(isNaN(t)||isNaN(n)||isNaN(i))return e;var s,o=e._root,a={data:r},c=e._x0,l=e._y0,u=e._z0,h=e._x1,f=e._y1,d=e._z1,m,_,g,p,b,x,v,M,S,C,P;if(!o)return e._root=a,e;for(;o.length;)if((v=t>=(m=(c+h)/2))?c=m:h=m,(M=n>=(_=(l+f)/2))?l=_:f=_,(S=i>=(g=(u+d)/2))?u=g:d=g,s=o,!(o=o[C=S<<2|M<<1|v]))return s[C]=a,e;if(p=+e._x.call(null,o.data),b=+e._y.call(null,o.data),x=+e._z.call(null,o.data),t===p&&n===b&&i===x)return a.next=o,s?s[C]=a:e._root=a,e;do s=s?s[C]=new Array(8):e._root=new Array(8),(v=t>=(m=(c+h)/2))?c=m:h=m,(M=n>=(_=(l+f)/2))?l=_:f=_,(S=i>=(g=(u+d)/2))?u=g:d=g;while((C=S<<2|M<<1|v)===(P=(x>=g)<<2|(b>=_)<<1|p>=m));return s[P]=o,s[C]=a,e}function n0(e){Array.isArray(e)||(e=Array.from(e));let t=e.length,n=new Float64Array(t),i=new Float64Array(t),r=new Float64Array(t),s=1/0,o=1/0,a=1/0,c=-1/0,l=-1/0,u=-1/0;for(let h=0,f,d,m,_;h<t;++h)isNaN(d=+this._x.call(null,f=e[h]))||isNaN(m=+this._y.call(null,f))||isNaN(_=+this._z.call(null,f))||(n[h]=d,i[h]=m,r[h]=_,d<s&&(s=d),d>c&&(c=d),m<o&&(o=m),m>l&&(l=m),_<a&&(a=_),_>u&&(u=_));if(s>c||o>l||a>u)return this;this.cover(s,o,a).cover(c,l,u);for(let h=0;h<t;++h)e0(this,n[h],i[h],r[h],e[h]);return this}function i0(e,t,n){if(isNaN(e=+e)||isNaN(t=+t)||isNaN(n=+n))return this;var i=this._x0,r=this._y0,s=this._z0,o=this._x1,a=this._y1,c=this._z1;if(isNaN(i))o=(i=Math.floor(e))+1,a=(r=Math.floor(t))+1,c=(s=Math.floor(n))+1;else{for(var l=o-i||1,u=this._root,h,f;i>e||e>=o||r>t||t>=a||s>n||n>=c;)switch(f=(n<s)<<2|(t<r)<<1|e<i,h=new Array(8),h[f]=u,u=h,l*=2,f){case 0:o=i+l,a=r+l,c=s+l;break;case 1:i=o-l,a=r+l,c=s+l;break;case 2:o=i+l,r=a-l,c=s+l;break;case 3:i=o-l,r=a-l,c=s+l;break;case 4:o=i+l,a=r+l,s=c-l;break;case 5:i=o-l,a=r+l,s=c-l;break;case 6:o=i+l,r=a-l,s=c-l;break;case 7:i=o-l,r=a-l,s=c-l;break}this._root&&this._root.length&&(this._root=u)}return this._x0=i,this._y0=r,this._z0=s,this._x1=o,this._y1=a,this._z1=c,this}function r0(){var e=[];return this.visit(function(t){if(!t.length)do e.push(t.data);while(t=t.next)}),e}function s0(e){return arguments.length?this.cover(+e[0][0],+e[0][1],+e[0][2]).cover(+e[1][0],+e[1][1],+e[1][2]):isNaN(this._x0)?void 0:[[this._x0,this._y0,this._z0],[this._x1,this._y1,this._z1]]}function ue(e,t,n,i,r,s,o){this.node=e,this.x0=t,this.y0=n,this.z0=i,this.x1=r,this.y1=s,this.z1=o}function o0(e,t,n,i){var r,s=this._x0,o=this._y0,a=this._z0,c,l,u,h,f,d,m=this._x1,_=this._y1,g=this._z1,p=[],b=this._root,x,v;for(b&&p.push(new ue(b,s,o,a,m,_,g)),i==null?i=1/0:(s=e-i,o=t-i,a=n-i,m=e+i,_=t+i,g=n+i,i*=i);x=p.pop();)if(!(!(b=x.node)||(c=x.x0)>m||(l=x.y0)>_||(u=x.z0)>g||(h=x.x1)<s||(f=x.y1)<o||(d=x.z1)<a))if(b.length){var M=(c+h)/2,S=(l+f)/2,C=(u+d)/2;p.push(new ue(b[7],M,S,C,h,f,d),new ue(b[6],c,S,C,M,f,d),new ue(b[5],M,l,C,h,S,d),new ue(b[4],c,l,C,M,S,d),new ue(b[3],M,S,u,h,f,C),new ue(b[2],c,S,u,M,f,C),new ue(b[1],M,l,u,h,S,C),new ue(b[0],c,l,u,M,S,C)),(v=(n>=C)<<2|(t>=S)<<1|e>=M)&&(x=p[p.length-1],p[p.length-1]=p[p.length-1-v],p[p.length-1-v]=x)}else{var P=e-+this._x.call(null,b.data),T=t-+this._y.call(null,b.data),w=n-+this._z.call(null,b.data),R=P*P+T*T+w*w;if(R<i){var V=Math.sqrt(i=R);s=e-V,o=t-V,a=n-V,m=e+V,_=t+V,g=n+V,r=b.data}}return r}var kE=(e,t,n,i,r,s)=>Math.sqrt((e-i)**2+(t-r)**2+(n-s)**2);function a0(e,t,n,i){let r=[],s=e-i,o=t-i,a=n-i,c=e+i,l=t+i,u=n+i;return this.visit((h,f,d,m,_,g,p)=>{if(!h.length)do{let b=h.data;kE(e,t,n,this._x(b),this._y(b),this._z(b))<=i&&r.push(b)}while(h=h.next);return f>c||d>l||m>u||_<s||g<o||p<a}),r}function c0(e){if(isNaN(f=+this._x.call(null,e))||isNaN(d=+this._y.call(null,e))||isNaN(m=+this._z.call(null,e)))return this;var t,n=this._root,i,r,s,o=this._x0,a=this._y0,c=this._z0,l=this._x1,u=this._y1,h=this._z1,f,d,m,_,g,p,b,x,v,M,S;if(!n)return this;if(n.length)for(;;){if((b=f>=(_=(o+l)/2))?o=_:l=_,(x=d>=(g=(a+u)/2))?a=g:u=g,(v=m>=(p=(c+h)/2))?c=p:h=p,t=n,!(n=n[M=v<<2|x<<1|b]))return this;if(!n.length)break;(t[M+1&7]||t[M+2&7]||t[M+3&7]||t[M+4&7]||t[M+5&7]||t[M+6&7]||t[M+7&7])&&(i=t,S=M)}for(;n.data!==e;)if(r=n,!(n=n.next))return this;return(s=n.next)&&delete n.next,r?(s?r.next=s:delete r.next,this):t?(s?t[M]=s:delete t[M],(n=t[0]||t[1]||t[2]||t[3]||t[4]||t[5]||t[6]||t[7])&&n===(t[7]||t[6]||t[5]||t[4]||t[3]||t[2]||t[1]||t[0])&&!n.length&&(i?i[S]=n:this._root=n),this):(this._root=s,this)}function l0(e){for(var t=0,n=e.length;t<n;++t)this.remove(e[t]);return this}function h0(){return this._root}function u0(){var e=0;return this.visit(function(t){if(!t.length)do++e;while(t=t.next)}),e}function f0(e){var t=[],n,i=this._root,r,s,o,a,c,l,u;for(i&&t.push(new ue(i,this._x0,this._y0,this._z0,this._x1,this._y1,this._z1));n=t.pop();)if(!e(i=n.node,s=n.x0,o=n.y0,a=n.z0,c=n.x1,l=n.y1,u=n.z1)&&i.length){var h=(s+c)/2,f=(o+l)/2,d=(a+u)/2;(r=i[7])&&t.push(new ue(r,h,f,d,c,l,u)),(r=i[6])&&t.push(new ue(r,s,f,d,h,l,u)),(r=i[5])&&t.push(new ue(r,h,o,d,c,f,u)),(r=i[4])&&t.push(new ue(r,s,o,d,h,f,u)),(r=i[3])&&t.push(new ue(r,h,f,a,c,l,d)),(r=i[2])&&t.push(new ue(r,s,f,a,h,l,d)),(r=i[1])&&t.push(new ue(r,h,o,a,c,f,d)),(r=i[0])&&t.push(new ue(r,s,o,a,h,f,d))}return this}function d0(e){var t=[],n=[],i;for(this._root&&t.push(new ue(this._root,this._x0,this._y0,this._z0,this._x1,this._y1,this._z1));i=t.pop();){var r=i.node;if(r.length){var s,o=i.x0,a=i.y0,c=i.z0,l=i.x1,u=i.y1,h=i.z1,f=(o+l)/2,d=(a+u)/2,m=(c+h)/2;(s=r[0])&&t.push(new ue(s,o,a,c,f,d,m)),(s=r[1])&&t.push(new ue(s,f,a,c,l,d,m)),(s=r[2])&&t.push(new ue(s,o,d,c,f,u,m)),(s=r[3])&&t.push(new ue(s,f,d,c,l,u,m)),(s=r[4])&&t.push(new ue(s,o,a,m,f,d,h)),(s=r[5])&&t.push(new ue(s,f,a,m,l,d,h)),(s=r[6])&&t.push(new ue(s,o,d,m,f,u,h)),(s=r[7])&&t.push(new ue(s,f,d,m,l,u,h))}n.push(i)}for(;i=n.pop();)e(i.node,i.x0,i.y0,i.z0,i.x1,i.y1,i.z1);return this}function p0(e){return e[0]}function m0(e){return arguments.length?(this._x=e,this):this._x}function g0(e){return e[1]}function _0(e){return arguments.length?(this._y=e,this):this._y}function v0(e){return e[2]}function y0(e){return arguments.length?(this._z=e,this):this._z}function oa(e,t,n,i){var r=new Zf(t??p0,n??g0,i??v0,NaN,NaN,NaN,NaN,NaN,NaN);return e==null?r:r.addAll(e)}function Zf(e,t,n,i,r,s,o,a,c){this._x=e,this._y=t,this._z=n,this._x0=i,this._y0=r,this._z0=s,this._x1=o,this._y1=a,this._z1=c,this._root=void 0}function x0(e){for(var t={data:e.data},n=t;e=e.next;)n=n.next={data:e.data};return t}var je=oa.prototype=Zf.prototype;je.copy=function(){var e=new Zf(this._x,this._y,this._z,this._x0,this._y0,this._z0,this._x1,this._y1,this._z1),t=this._root,n,i;if(!t)return e;if(!t.length)return e._root=x0(t),e;for(n=[{source:t,target:e._root=new Array(8)}];t=n.pop();)for(var r=0;r<8;++r)(i=t.source[r])&&(i.length?n.push({source:i,target:t.target[r]=new Array(8)}):t.target[r]=x0(i));return e};je.add=t0;je.addAll=n0;je.cover=i0;je.data=r0;je.extent=s0;je.find=o0;je.findAllWithinRadius=a0;je.remove=c0;je.removeAll=l0;je.root=h0;je.size=u0;je.visit=f0;je.visitAfter=d0;je.x=m0;je.y=_0;je.z=y0;function Bn(e){return function(){return e}}function Qn(e){return(e()-.5)*1e-6}function BE(e){return e.index}function b0(e,t){var n=e.get(t);if(!n)throw new Error("node not found: "+t);return n}function Kf(e){var t=BE,n=f,i,r=Bn(30),s,o,a,c,l,u,h=1;e==null&&(e=[]);function f(p){return 1/Math.min(c[p.source.index],c[p.target.index])}function d(p){for(var b=0,x=e.length;b<h;++b)for(var v=0,M,S,C,P=0,T=0,w=0,R,V;v<x;++v)M=e[v],S=M.source,C=M.target,P=C.x+C.vx-S.x-S.vx||Qn(u),a>1&&(T=C.y+C.vy-S.y-S.vy||Qn(u)),a>2&&(w=C.z+C.vz-S.z-S.vz||Qn(u)),R=Math.sqrt(P*P+T*T+w*w),R=(R-s[v])/R*p*i[v],P*=R,T*=R,w*=R,C.vx-=P*(V=l[v]),a>1&&(C.vy-=T*V),a>2&&(C.vz-=w*V),S.vx+=P*(V=1-V),a>1&&(S.vy+=T*V),a>2&&(S.vz+=w*V)}function m(){if(o){var p,b=o.length,x=e.length,v=new Map(o.map((S,C)=>[t(S,C,o),S])),M;for(p=0,c=new Array(b);p<x;++p)M=e[p],M.index=p,typeof M.source!="object"&&(M.source=b0(v,M.source)),typeof M.target!="object"&&(M.target=b0(v,M.target)),c[M.source.index]=(c[M.source.index]||0)+1,c[M.target.index]=(c[M.target.index]||0)+1;for(p=0,l=new Array(x);p<x;++p)M=e[p],l[p]=c[M.source.index]/(c[M.source.index]+c[M.target.index]);i=new Array(x),_(),s=new Array(x),g()}}function _(){if(o)for(var p=0,b=e.length;p<b;++p)i[p]=+n(e[p],p,e)}function g(){if(o)for(var p=0,b=e.length;p<b;++p)s[p]=+r(e[p],p,e)}return d.initialize=function(p,...b){o=p,u=b.find(x=>typeof x=="function")||Math.random,a=b.find(x=>[1,2,3].includes(x))||2,m()},d.links=function(p){return arguments.length?(e=p,m(),d):e},d.id=function(p){return arguments.length?(t=p,d):t},d.iterations=function(p){return arguments.length?(h=+p,d):h},d.strength=function(p){return arguments.length?(n=typeof p=="function"?p:Bn(+p),_(),d):n},d.distance=function(p){return arguments.length?(r=typeof p=="function"?p:Bn(+p),g(),d):r},d}var VE={value:()=>{}};function Jf(){for(var e=0,t=arguments.length,n={},i;e<t;++e){if(!(i=arguments[e]+"")||i in n||/[\s.]/.test(i))throw new Error("illegal type: "+i);n[i]=[]}return new oh(n)}function oh(e){this._=e}function HE(e,t){return e.trim().split(/^|\s+/).map(function(n){var i="",r=n.indexOf(".");if(r>=0&&(i=n.slice(r+1),n=n.slice(0,r)),n&&!t.hasOwnProperty(n))throw new Error("unknown type: "+n);return{type:n,name:i}})}oh.prototype=Jf.prototype={constructor:oh,on:function(e,t){var n=this._,i=HE(e+"",n),r,s=-1,o=i.length;if(arguments.length<2){for(;++s<o;)if((r=(e=i[s]).type)&&(r=GE(n[r],e.name)))return r;return}if(t!=null&&typeof t!="function")throw new Error("invalid callback: "+t);for(;++s<o;)if(r=(e=i[s]).type)n[r]=M0(n[r],e.name,t);else if(t==null)for(r in n)n[r]=M0(n[r],e.name,null);return this},copy:function(){var e={},t=this._;for(var n in t)e[n]=t[n].slice();return new oh(e)},call:function(e,t){if((r=arguments.length-2)>0)for(var n=new Array(r),i=0,r,s;i<r;++i)n[i]=arguments[i+2];if(!this._.hasOwnProperty(e))throw new Error("unknown type: "+e);for(s=this._[e],i=0,r=s.length;i<r;++i)s[i].value.apply(t,n)},apply:function(e,t,n){if(!this._.hasOwnProperty(e))throw new Error("unknown type: "+e);for(var i=this._[e],r=0,s=i.length;r<s;++r)i[r].value.apply(t,n)}};function GE(e,t){for(var n=0,i=e.length,r;n<i;++n)if((r=e[n]).name===t)return r.value}function M0(e,t,n){for(var i=0,r=e.length;i<r;++i)if(e[i].name===t){e[i]=VE,e=e.slice(0,i).concat(e.slice(i+1));break}return n!=null&&e.push({name:t,value:n}),e}var ks=0,ca=0,aa=0,w0=1e3,ah,la,ch=0,Ur=0,lh=0,ha=typeof performance=="object"&&performance.now?performance:Date,E0=typeof window=="object"&&window.requestAnimationFrame?window.requestAnimationFrame.bind(window):function(e){setTimeout(e,17)};function T0(){return Ur||(E0(WE),Ur=ha.now()+lh)}function WE(){Ur=0}function Qf(){this._call=this._time=this._next=null}Qf.prototype=ed.prototype={constructor:Qf,restart:function(e,t,n){if(typeof e!="function")throw new TypeError("callback is not a function");n=(n==null?T0():+n)+(t==null?0:+t),!this._next&&la!==this&&(la?la._next=this:ah=this,la=this),this._call=e,this._time=n,td()},stop:function(){this._call&&(this._call=null,this._time=1/0,td())}};function ed(e,t,n){var i=new Qf;return i.restart(e,t,n),i}function jE(){T0(),++ks;for(var e=ah,t;e;)(t=Ur-e._time)>=0&&e._call.call(void 0,t),e=e._next;--ks}function S0(){Ur=(ch=ha.now())+lh,ks=ca=0;try{jE()}finally{ks=0,XE(),Ur=0}}function qE(){var e=ha.now(),t=e-ch;t>w0&&(lh-=t,ch=e)}function XE(){for(var e,t=ah,n,i=1/0;t;)t._call?(i>t._time&&(i=t._time),e=t,t=t._next):(n=t._next,t._next=null,t=e?e._next=n:ah=n);la=e,td(i)}function td(e){if(!ks){ca&&(ca=clearTimeout(ca));var t=e-Ur;t>24?(e<1/0&&(ca=setTimeout(S0,Math.ceil(e-ha.now()-lh)+1)),aa&&(aa=clearInterval(aa))):(aa||(ch=ha.now(),aa=setInterval(qE,w0)),ks=1,E0(S0))}}function A0(){let e=1;return()=>(e=(1664525*e+1013904223)%4294967296)/4294967296}var C0=3;function hh(e){return e.x}function nd(e){return e.y}function R0(e){return e.z}var $E=10,YE=Math.PI*(3-Math.sqrt(5)),ZE=Math.PI*20/(9+Math.sqrt(221));function id(e,t){t=t||2;var n=Math.min(C0,Math.max(1,Math.round(t))),i,r=1,s=.001,o=1-Math.pow(s,1/300),a=0,c=.6,l=new Map,u=ed(d),h=Jf("tick","end"),f=A0();e==null&&(e=[]);function d(){m(),h.call("tick",i),r<s&&(u.stop(),h.call("end",i))}function m(p){var b,x=e.length,v;p===void 0&&(p=1);for(var M=0;M<p;++M)for(r+=(a-r)*o,l.forEach(function(S){S(r)}),b=0;b<x;++b)v=e[b],v.fx==null?v.x+=v.vx*=c:(v.x=v.fx,v.vx=0),n>1&&(v.fy==null?v.y+=v.vy*=c:(v.y=v.fy,v.vy=0)),n>2&&(v.fz==null?v.z+=v.vz*=c:(v.z=v.fz,v.vz=0));return i}function _(){for(var p=0,b=e.length,x;p<b;++p){if(x=e[p],x.index=p,x.fx!=null&&(x.x=x.fx),x.fy!=null&&(x.y=x.fy),x.fz!=null&&(x.z=x.fz),isNaN(x.x)||n>1&&isNaN(x.y)||n>2&&isNaN(x.z)){var v=$E*(n>2?Math.cbrt(.5+p):n>1?Math.sqrt(.5+p):p),M=p*YE,S=p*ZE;n===1?x.x=v:n===2?(x.x=v*Math.cos(M),x.y=v*Math.sin(M)):(x.x=v*Math.sin(M)*Math.cos(S),x.y=v*Math.cos(M),x.z=v*Math.sin(M)*Math.sin(S))}(isNaN(x.vx)||n>1&&isNaN(x.vy)||n>2&&isNaN(x.vz))&&(x.vx=0,n>1&&(x.vy=0),n>2&&(x.vz=0))}}function g(p){return p.initialize&&p.initialize(e,f,n),p}return _(),i={tick:m,restart:function(){return u.restart(d),i},stop:function(){return u.stop(),i},numDimensions:function(p){return arguments.length?(n=Math.min(C0,Math.max(1,Math.round(p))),l.forEach(g),i):n},nodes:function(p){return arguments.length?(e=p,_(),l.forEach(g),i):e},alpha:function(p){return arguments.length?(r=+p,i):r},alphaMin:function(p){return arguments.length?(s=+p,i):s},alphaDecay:function(p){return arguments.length?(o=+p,i):+o},alphaTarget:function(p){return arguments.length?(a=+p,i):a},velocityDecay:function(p){return arguments.length?(c=1-p,i):1-c},randomSource:function(p){return arguments.length?(f=p,l.forEach(g),i):f},force:function(p,b){return arguments.length>1?(b==null?l.delete(p):l.set(p,g(b)),i):l.get(p)},find:function(){var p=Array.prototype.slice.call(arguments),b=p.shift()||0,x=(n>1?p.shift():null)||0,v=(n>2?p.shift():null)||0,M=p.shift()||1/0,S=0,C=e.length,P,T,w,R,V,N;for(M*=M,S=0;S<C;++S)V=e[S],P=b-V.x,T=x-(V.y||0),w=v-(V.z||0),R=P*P+T*T+w*w,R<M&&(N=V,M=R);return N},on:function(p,b){return arguments.length>1?(h.on(p,b),i):h.on(p)}}}function rd(){var e,t,n,i,r,s=Bn(-30),o,a=1,c=1/0,l=.81;function u(m){var _,g=e.length,p=(t===1?sa(e,hh):t===2?$f(e,hh,nd):t===3?oa(e,hh,nd,R0):null).visitAfter(f);for(r=m,_=0;_<g;++_)n=e[_],p.visit(d)}function h(){if(e){var m,_=e.length,g;for(o=new Array(_),m=0;m<_;++m)g=e[m],o[g.index]=+s(g,m,e)}}function f(m){var _=0,g,p,b=0,x,v,M,S,C=m.length;if(C){for(x=v=M=S=0;S<C;++S)(g=m[S])&&(p=Math.abs(g.value))&&(_+=g.value,b+=p,x+=p*(g.x||0),v+=p*(g.y||0),M+=p*(g.z||0));_*=Math.sqrt(4/C),m.x=x/b,t>1&&(m.y=v/b),t>2&&(m.z=M/b)}else{g=m,g.x=g.data.x,t>1&&(g.y=g.data.y),t>2&&(g.z=g.data.z);do _+=o[g.data.index];while(g=g.next)}m.value=_}function d(m,_,g,p,b){if(!m.value)return!0;var x=[g,p,b][t-1],v=m.x-n.x,M=t>1?m.y-n.y:0,S=t>2?m.z-n.z:0,C=x-_,P=v*v+M*M+S*S;if(C*C/l<P)return P<c&&(v===0&&(v=Qn(i),P+=v*v),t>1&&M===0&&(M=Qn(i),P+=M*M),t>2&&S===0&&(S=Qn(i),P+=S*S),P<a&&(P=Math.sqrt(a*P)),n.vx+=v*m.value*r/P,t>1&&(n.vy+=M*m.value*r/P),t>2&&(n.vz+=S*m.value*r/P)),!0;if(m.length||P>=c)return;(m.data!==n||m.next)&&(v===0&&(v=Qn(i),P+=v*v),t>1&&M===0&&(M=Qn(i),P+=M*M),t>2&&S===0&&(S=Qn(i),P+=S*S),P<a&&(P=Math.sqrt(a*P)));do m.data!==n&&(C=o[m.data.index]*r/P,n.vx+=v*C,t>1&&(n.vy+=M*C),t>2&&(n.vz+=S*C));while(m=m.next)}return u.initialize=function(m,..._){e=m,i=_.find(g=>typeof g=="function")||Math.random,t=_.find(g=>[1,2,3].includes(g))||2,h()},u.strength=function(m){return arguments.length?(s=typeof m=="function"?m:Bn(+m),h(),u):s},u.distanceMin=function(m){return arguments.length?(a=m*m,u):Math.sqrt(a)},u.distanceMax=function(m){return arguments.length?(c=m*m,u):Math.sqrt(c)},u.theta=function(m){return arguments.length?(l=m*m,u):Math.sqrt(l)},u}function sd(e,t,n,i){var r,s,o=Bn(.1),a,c;typeof e!="function"&&(e=Bn(+e)),t==null&&(t=0),n==null&&(n=0),i==null&&(i=0);function l(h){for(var f=0,d=r.length;f<d;++f){var m=r[f],_=m.x-t||1e-6,g=(m.y||0)-n||1e-6,p=(m.z||0)-i||1e-6,b=Math.sqrt(_*_+g*g+p*p),x=(c[f]-b)*a[f]*h/b;m.vx+=_*x,s>1&&(m.vy+=g*x),s>2&&(m.vz+=p*x)}}function u(){if(r){var h,f=r.length;for(a=new Array(f),c=new Array(f),h=0;h<f;++h)c[h]=+e(r[h],h,r),a[h]=isNaN(c[h])?0:+o(r[h],h,r)}}return l.initialize=function(h,...f){r=h,s=f.find(d=>[1,2,3].includes(d))||2,u()},l.strength=function(h){return arguments.length?(o=typeof h=="function"?h:Bn(+h),u(),l):o},l.radius=function(h){return arguments.length?(e=typeof h=="function"?h:Bn(+h),u(),l):e},l.x=function(h){return arguments.length?(t=+h,l):t},l.y=function(h){return arguments.length?(n=+h,l):n},l.z=function(h){return arguments.length?(i=+h,l):i},l}function od(e){JE(e);let t=KE(e);return e.on=t.on,e.off=t.off,e.fire=t.fire,e}function KE(e){let t=Object.create(null);return{on:function(n,i,r){if(typeof i!="function")throw new Error("callback is expected to be a function");let s=t[n];return s||(s=t[n]=[]),s.push({callback:i,ctx:r}),e},off:function(n,i){if(typeof n>"u")return t=Object.create(null),e;if(t[n])if(typeof i!="function")delete t[n];else{let o=t[n];for(let a=0;a<o.length;++a)o[a].callback===i&&o.splice(a,1)}return e},fire:function(n){let i=t[n];if(!i)return e;let r;arguments.length>1&&(r=Array.prototype.slice.call(arguments,1));for(let s=0;s<i.length;++s){let o=i[s];o.callback.apply(o.ctx,r)}return e}}}function JE(e){if(!e)throw new Error("Eventify cannot use falsy object as events subject");let t=["on","fire","off"];for(let n=0;n<t.length;++n)if(e.hasOwnProperty(t[n]))throw new Error("Subject cannot be eventified, since it already has property '"+t[n]+"'")}var D0=QE;function QE(e){if(e=e||{},"uniqueLinkId"in e&&(console.warn("ngraph.graph: Starting from version 0.14 `uniqueLinkId` is deprecated.\nUse `multigraph` option instead\n",`
`,`Note: there is also change in default behavior: From now on each graph
is considered to be not a multigraph by default (each edge is unique).`),e.multigraph=e.uniqueLinkId),e.multigraph===void 0&&(e.multigraph=!1),typeof Map!="function")throw new Error("ngraph.graph requires `Map` to be defined. Please polyfill it before using ngraph");var t=new Map,n=new Map,i={},r=0,s=e.multigraph?v:x,o=[],a=K,c=K,l=K,u=K,h={version:20,addNode:_,addLink:b,removeLink:P,removeNode:p,getNode:g,getNodeCount:M,getLinkCount:S,getEdgeCount:S,getLinksCount:S,getNodesCount:M,getLinks:C,forEachNode:gt,forEachLinkedNode:z,forEachLink:N,beginUpdate:l,endUpdate:u,clear:V,hasLink:w,hasNode:g,getLink:w,getLinkById:R};return od(h),f(),h;function f(){var Y=h.on;h.on=it;function it(){return h.beginUpdate=l=q,h.endUpdate=u=ot,a=d,c=m,h.on=Y,Y.apply(h,arguments)}}function d(Y,it){o.push({link:Y,changeType:it})}function m(Y,it){o.push({node:Y,changeType:it})}function _(Y,it){if(Y===void 0)throw new Error("Invalid node identifier");l();var dt=g(Y);return dt?(dt.data=it,c(dt,"update")):(dt=new tT(Y,it),c(dt,"add")),t.set(Y,dt),u(),dt}function g(Y){return t.get(Y)}function p(Y){var it=g(Y);if(!it)return!1;l();var dt=it.links;return dt&&(dt.forEach(T),it.links=null),t.delete(Y),c(it,"remove"),u(),!0}function b(Y,it,dt){l();var zt=g(Y)||_(Y),Lt=g(it)||_(it),$=s(Y,it,dt),Q=n.has($.id);return n.set($.id,$),P0(zt,$),Y!==it&&P0(Lt,$),a($,Q?"update":"add"),u(),$}function x(Y,it,dt){var zt=uh(Y,it),Lt=n.get(zt);return Lt?(Lt.data=dt,Lt):new I0(Y,it,dt,zt)}function v(Y,it,dt){var zt=uh(Y,it),Lt=i.hasOwnProperty(zt);if(Lt||w(Y,it)){Lt||(i[zt]=0);var $="@"+ ++i[zt];zt=uh(Y+$,it+$)}return new I0(Y,it,dt,zt)}function M(){return t.size}function S(){return n.size}function C(Y){var it=g(Y);return it?it.links:null}function P(Y,it){return it!==void 0&&(Y=w(Y,it)),T(Y)}function T(Y){if(!Y||!n.get(Y.id))return!1;l(),n.delete(Y.id);var it=g(Y.fromId),dt=g(Y.toId);return it&&it.links.delete(Y),dt&&dt.links.delete(Y),a(Y,"remove"),u(),!0}function w(Y,it){if(!(Y===void 0||it===void 0))return n.get(uh(Y,it))}function R(Y){if(Y!==void 0)return n.get(Y)}function V(){l(),gt(function(Y){p(Y.id)}),u()}function N(Y){if(typeof Y=="function")for(var it=n.values(),dt=it.next();!dt.done;){if(Y(dt.value))return!0;dt=it.next()}}function z(Y,it,dt){var zt=g(Y);if(zt&&zt.links&&typeof it=="function")return dt?G(zt.links,Y,it):U(zt.links,Y,it)}function U(Y,it,dt){for(var zt,Lt=Y.values(),$=Lt.next();!$.done;){var Q=$.value,yt=Q.fromId===it?Q.toId:Q.fromId;if(zt=dt(t.get(yt),Q),zt)return!0;$=Lt.next()}}function G(Y,it,dt){for(var zt,Lt=Y.values(),$=Lt.next();!$.done;){var Q=$.value;if(Q.fromId===it&&(zt=dt(t.get(Q.toId),Q),zt))return!0;$=Lt.next()}}function K(){}function q(){r+=1}function ot(){r-=1,r===0&&o.length>0&&(h.fire("changed",o),o.length=0)}function gt(Y){if(typeof Y!="function")throw new Error("Function is expected to iterate over graph nodes. You passed "+Y);for(var it=t.values(),dt=it.next();!dt.done;){if(Y(dt.value))return!0;dt=it.next()}}}function tT(e,t){this.id=e,this.links=null,this.data=t}function P0(e,t){e.links?e.links.add(t):e.links=new Set([t])}function I0(e,t,n,i){this.fromId=e,this.toId=t,this.data=n,this.id=i}function uh(e,t){return e.toString()+"\u{1F449} "+t.toString()}var Cv=Hx(u_(),1);function DT(e){var t=typeof e;return e!=null&&(t=="object"||t=="function")}var fa=DT;var LT=typeof global=="object"&&global&&global.Object===Object&&global,f_=LT;var OT=typeof self=="object"&&self&&self.Object===Object&&self,NT=f_||OT||Function("return this")(),dh=NT;var FT=function(){return dh.Date.now()},ph=FT;var UT=/\s/;function zT(e){for(var t=e.length;t--&&UT.test(e.charAt(t)););return t}var d_=zT;var kT=/^\s+/;function BT(e){return e&&e.slice(0,d_(e)+1).replace(kT,"")}var p_=BT;var VT=dh.Symbol,Bs=VT;var m_=Object.prototype,HT=m_.hasOwnProperty,GT=m_.toString,da=Bs?Bs.toStringTag:void 0;function WT(e){var t=HT.call(e,da),n=e[da];try{e[da]=void 0;var i=!0}catch{}var r=GT.call(e);return i&&(t?e[da]=n:delete e[da]),r}var g_=WT;var jT=Object.prototype,qT=jT.toString;function XT(e){return qT.call(e)}var __=XT;var $T="[object Null]",YT="[object Undefined]",v_=Bs?Bs.toStringTag:void 0;function ZT(e){return e==null?e===void 0?YT:$T:v_&&v_ in Object(e)?g_(e):__(e)}var y_=ZT;function KT(e){return e!=null&&typeof e=="object"}var x_=KT;var JT="[object Symbol]";function QT(e){return typeof e=="symbol"||x_(e)&&y_(e)==JT}var b_=QT;var M_=NaN,tA=/^[-+]0x[0-9a-f]+$/i,eA=/^0b[01]+$/i,nA=/^0o[0-7]+$/i,iA=parseInt;function rA(e){if(typeof e=="number")return e;if(b_(e))return M_;if(fa(e)){var t=typeof e.valueOf=="function"?e.valueOf():e;e=fa(t)?t+"":t}if(typeof e!="string")return e===0?e:+e;e=p_(e);var n=eA.test(e);return n||nA.test(e)?iA(e.slice(2),n?2:8):tA.test(e)?M_:+e}var vd=rA;var sA="Expected a function",oA=Math.max,aA=Math.min;function cA(e,t,n){var i,r,s,o,a,c,l=0,u=!1,h=!1,f=!0;if(typeof e!="function")throw new TypeError(sA);t=vd(t)||0,fa(n)&&(u=!!n.leading,h="maxWait"in n,s=h?oA(vd(n.maxWait)||0,t):s,f="trailing"in n?!!n.trailing:f);function d(S){var C=i,P=r;return i=r=void 0,l=S,o=e.apply(P,C),o}function m(S){return l=S,a=setTimeout(p,t),u?d(S):o}function _(S){var C=S-c,P=S-l,T=t-C;return h?aA(T,s-P):T}function g(S){var C=S-c,P=S-l;return c===void 0||C>=t||C<0||h&&P>=s}function p(){var S=ph();if(g(S))return b(S);a=setTimeout(p,_(S))}function b(S){return a=void 0,f&&i?d(S):(i=r=void 0,o)}function x(){a!==void 0&&clearTimeout(a),l=0,i=c=r=a=void 0}function v(){return a===void 0?o:b(ph())}function M(){var S=ph(),C=g(S);if(i=arguments,r=this,c=S,C){if(a===void 0)return m(c);if(h)return clearTimeout(a),a=setTimeout(p,t),d(c)}return a===void 0&&(a=setTimeout(p,t)),o}return M.cancel=x,M.flush=v,M}var S_=cA;function w_(e,t){(t==null||t>e.length)&&(t=e.length);for(var n=0,i=Array(t);n<t;n++)i[n]=e[n];return i}function lA(e){if(Array.isArray(e))return e}function hA(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}function uA(e,t,n){return Object.defineProperty(e,"prototype",{writable:!1}),e}function fA(e,t){var n=e==null?null:typeof Symbol<"u"&&e[Symbol.iterator]||e["@@iterator"];if(n!=null){var i,r,s,o,a=[],c=!0,l=!1;try{if(s=(n=n.call(e)).next,t!==0)for(;!(c=(i=s.call(n)).done)&&(a.push(i.value),a.length!==t);c=!0);}catch(u){l=!0,r=u}finally{try{if(!c&&n.return!=null&&(o=n.return(),Object(o)!==o))return}finally{if(l)throw r}}return a}}function dA(){throw new TypeError(`Invalid attempt to destructure non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}function pA(e,t){return lA(e)||fA(e,t)||mA(e,t)||dA()}function mA(e,t){if(e){if(typeof e=="string")return w_(e,t);var n={}.toString.call(e).slice(8,-1);return n==="Object"&&e.constructor&&(n=e.constructor.name),n==="Map"||n==="Set"?Array.from(e):n==="Arguments"||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)?w_(e,t):void 0}}var gA=uA(function e(t,n){var i=n.default,r=i===void 0?null:i,s=n.triggerUpdate,o=s===void 0?!0:s,a=n.onChange,c=a===void 0?function(l,u){}:a;hA(this,e),this.name=t,this.defaultVal=r,this.triggerUpdate=o,this.onChange=c});function nr(e){var t=e.stateInit,n=t===void 0?function(){return{}}:t,i=e.props,r=i===void 0?{}:i,s=e.methods,o=s===void 0?{}:s,a=e.aliases,c=a===void 0?{}:a,l=e.init,u=l===void 0?function(){}:l,h=e.update,f=h===void 0?function(){}:h,d=Object.keys(r).map(function(m){return new gA(m,r[m])});return function m(){for(var _=arguments.length,g=new Array(_),p=0;p<_;p++)g[p]=arguments[p];var b=!!(this instanceof m&&this.constructor),x=b?g.shift():void 0,v=g[0],M=v===void 0?{}:v,S=Object.assign({},n instanceof Function?n(M):n,{initialised:!1}),C={};function P(R){return T(R,M),w(),P}var T=function(V,N){u.call(P,V,S,N),S.initialised=!0},w=S_(function(){S.initialised&&(f.call(P,S,C),C={})},1);return d.forEach(function(R){P[R.name]=V(R);function V(N){var z=N.name,U=N.triggerUpdate,G=U===void 0?!1:U,K=N.onChange,q=K===void 0?function(Y,it){}:K,ot=N.defaultVal,gt=ot===void 0?null:ot;return function(Y){var it=S[z];if(!arguments.length)return it;var dt=Y===void 0?gt:Y;return S[z]=dt,q.call(P,dt,S,it),!C.hasOwnProperty(z)&&(C[z]=it),G&&w(),P}}}),Object.keys(o).forEach(function(R){P[R]=function(){for(var V,N=arguments.length,z=new Array(N),U=0;U<N;U++)z[U]=arguments[U];return(V=o[R]).call.apply(V,[P,S].concat(z))}}),Object.entries(c).forEach(function(R){var V=pA(R,2),N=V[0],z=V[1];return P[N]=P[z]}),P.resetProps=function(){return d.forEach(function(R){P[R.name](R.defaultVal)}),P},P.resetProps(),S._rerender=w,b&&x&&P(x),P}}var Zt=(function(e){return typeof e=="function"?e:typeof e=="string"?function(t){return t[e]}:function(t){return e}});function pa(e,t){return e==null||t==null?NaN:e<t?-1:e>t?1:e>=t?0:NaN}function _A(e,t){return e==null||t==null?NaN:t<e?-1:t>e?1:t>=e?0:NaN}function T_(e){let t,n,i;e.length!==2?(t=pa,n=(a,c)=>pa(e(a),c),i=(a,c)=>e(a)-c):(t=e===pa||e===_A?e:vA,n=e,i=e);function r(a,c,l=0,u=a.length){if(l<u){if(t(c,c)!==0)return u;do{let h=l+u>>>1;n(a[h],c)<0?l=h+1:u=h}while(l<u)}return l}function s(a,c,l=0,u=a.length){if(l<u){if(t(c,c)!==0)return u;do{let h=l+u>>>1;n(a[h],c)<=0?l=h+1:u=h}while(l<u)}return l}function o(a,c,l=0,u=a.length){let h=r(a,c,l,u-1);return h>l&&i(a[h-1],c)>-i(a[h],c)?h-1:h}return{left:r,center:o,right:s}}function vA(){return 0}function yA(e){return e===null?NaN:+e}var A_=T_(pa),xA=A_.right,xU=A_.left,bU=T_(yA).center;var MU=C_(R_),SU=C_(bA);function C_(e){return function(t,n,i=n){if(!((n=+n)>=0))throw new RangeError("invalid rx");if(!((i=+i)>=0))throw new RangeError("invalid ry");let{data:r,width:s,height:o}=t;if(!((s=Math.floor(s))>=0))throw new RangeError("invalid width");if(!((o=Math.floor(o!==void 0?o:r.length/s))>=0))throw new RangeError("invalid height");if(!s||!o||!n&&!i)return t;let a=n&&e(n),c=i&&e(i),l=r.slice();return a&&c?(Vs(a,l,r,s,o),Vs(a,r,l,s,o),Vs(a,l,r,s,o),Hs(c,r,l,s,o),Hs(c,l,r,s,o),Hs(c,r,l,s,o)):a?(Vs(a,r,l,s,o),Vs(a,l,r,s,o),Vs(a,r,l,s,o)):c&&(Hs(c,r,l,s,o),Hs(c,l,r,s,o),Hs(c,r,l,s,o)),t}}function Vs(e,t,n,i,r){for(let s=0,o=i*r;s<o;)e(t,n,s,s+=i,1)}function Hs(e,t,n,i,r){for(let s=0,o=i*r;s<i;++s)e(t,n,s,s+o,i)}function bA(e){let t=R_(e);return(n,i,r,s,o)=>{r<<=2,s<<=2,o<<=2,t(n,i,r+0,s+0,o),t(n,i,r+1,s+1,o),t(n,i,r+2,s+2,o),t(n,i,r+3,s+3,o)}}function R_(e){let t=Math.floor(e);if(t===e)return MA(e);let n=e-t,i=2*e+1;return(r,s,o,a,c)=>{if(!((a-=c)>=o))return;let l=t*s[o],u=c*t,h=u+c;for(let f=o,d=o+u;f<d;f+=c)l+=s[Math.min(a,f)];for(let f=o,d=a;f<=d;f+=c)l+=s[Math.min(a,f+u)],r[f]=(l+n*(s[Math.max(o,f-h)]+s[Math.min(a,f+h)]))/i,l-=s[Math.max(o,f-u)]}}function MA(e){let t=2*e+1;return(n,i,r,s,o)=>{if(!((s-=o)>=r))return;let a=e*i[r],c=o*e;for(let l=r,u=r+c;l<u;l+=o)a+=i[Math.min(s,l)];for(let l=r,u=s;l<=u;l+=o)a+=i[Math.min(s,l+c)],n[l]=a/t,a-=i[Math.max(r,l-c)]}}var ma=class extends Map{constructor(t,n=EA){if(super(),Object.defineProperties(this,{_intern:{value:new Map},_key:{value:n}}),t!=null)for(let[i,r]of t)this.set(i,r)}get(t){return super.get(E_(this,t))}has(t){return super.has(E_(this,t))}set(t,n){return super.set(SA(this,t),n)}delete(t){return super.delete(wA(this,t))}};function E_({_intern:e,_key:t},n){let i=t(n);return e.has(i)?e.get(i):n}function SA({_intern:e,_key:t},n){let i=t(n);return e.has(i)?e.get(i):(e.set(i,n),n)}function wA({_intern:e,_key:t},n){let i=t(n);return e.has(i)&&(n=e.get(i),e.delete(i)),n}function EA(e){return e!==null&&typeof e=="object"?e.valueOf():e}var TA=Array.prototype,wU=TA.slice;var EU=Math.sqrt(50),TU=Math.sqrt(10),AU=Math.sqrt(2);function P_(e,t){let n;if(t===void 0)for(let i of e)i!=null&&(n<i||n===void 0&&i>=i)&&(n=i);else{let i=-1;for(let r of e)(r=t(r,++i,e))!=null&&(n<r||n===void 0&&r>=r)&&(n=r)}return n}function I_(e,t){let n;if(t===void 0)for(let i of e)i!=null&&(n>i||n===void 0&&i>=i)&&(n=i);else{let i=-1;for(let r of e)(r=t(r,++i,e))!=null&&(n>r||n===void 0&&r>=r)&&(n=r)}return n}var CU=AA(Math.random);function AA(e){return function(n,i=0,r=n.length){let s=r-(i=+i);for(;s;){let o=e()*s--|0,a=n[s+i];n[s+i]=n[o+i],n[o+i]=a}return n}}function Md(e,t){(t==null||t>e.length)&&(t=e.length);for(var n=0,i=Array(t);n<t;n++)i[n]=e[n];return i}function CA(e){if(Array.isArray(e))return e}function RA(e){if(Array.isArray(e))return Md(e)}function D_(e,t,n){if(typeof e=="function"?e===t:e.has(t))return arguments.length<3?t:n;throw new TypeError("Private element is not present on this object")}function PA(e,t){if(t.has(e))throw new TypeError("Cannot initialize the same private elements twice on an object")}function IA(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}function Qe(e,t){return e.get(D_(e,t))}function Gs(e,t,n){PA(e,t),t.set(e,n)}function mh(e,t,n){return e.set(D_(e,t),n),n}function DA(e,t){for(var n=0;n<t.length;n++){var i=t[n];i.enumerable=i.enumerable||!1,i.configurable=!0,"value"in i&&(i.writable=!0),Object.defineProperty(e,VA(i.key),i)}}function LA(e,t,n){return t&&DA(e.prototype,t),Object.defineProperty(e,"prototype",{writable:!1}),e}function OA(e){if(typeof Symbol<"u"&&e[Symbol.iterator]!=null||e["@@iterator"]!=null)return Array.from(e)}function NA(e,t){var n=e==null?null:typeof Symbol<"u"&&e[Symbol.iterator]||e["@@iterator"];if(n!=null){var i,r,s,o,a=[],c=!0,l=!1;try{if(s=(n=n.call(e)).next,t!==0)for(;!(c=(i=s.call(n)).done)&&(a.push(i.value),a.length!==t);c=!0);}catch(u){l=!0,r=u}finally{try{if(!c&&n.return!=null&&(o=n.return(),Object(o)!==o))return}finally{if(l)throw r}}return a}}function FA(){throw new TypeError(`Invalid attempt to destructure non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}function UA(){throw new TypeError(`Invalid attempt to spread non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}function zA(e,t){return CA(e)||NA(e,t)||L_(e,t)||FA()}function kA(e){return RA(e)||OA(e)||L_(e)||UA()}function BA(e,t){if(typeof e!="object"||!e)return e;var n=e[Symbol.toPrimitive];if(n!==void 0){var i=n.call(e,t);if(typeof i!="object")return i;throw new TypeError("@@toPrimitive must return a primitive value.")}return String(e)}function VA(e){var t=BA(e,"string");return typeof t=="symbol"?t:t+""}function L_(e,t){if(e){if(typeof e=="string")return Md(e,t);var n={}.toString.call(e).slice(8,-1);return n==="Object"&&e.constructor&&(n=e.constructor.name),n==="Map"||n==="Set"?Array.from(e):n==="Arguments"||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)?Md(e,t):void 0}}var Ws=new WeakMap,ga=new WeakMap,js=new WeakMap,yd=new WeakMap,xd=new WeakMap,bd=new WeakMap,O_=(function(){function e(){IA(this,e),Gs(this,Ws,new Map),Gs(this,ga,new Map),Gs(this,js,function(t){return t}),Gs(this,yd,function(){return{}}),Gs(this,xd,function(){}),Gs(this,bd,function(){})}return LA(e,[{key:"getObj",value:function(n){return Qe(Ws,this).get(Qe(js,this).call(this,n))}},{key:"getData",value:function(n){return Qe(ga,this).get(n)}},{key:"entries",value:function(){return kA(Qe(ga,this).entries()).map(function(n){var i=zA(n,2),r=i[0],s=i[1];return[s,r]})}},{key:"id",value:function(n){return mh(js,this,Zt(n)),this}},{key:"onCreateObj",value:function(n){return mh(yd,this,n),this}},{key:"onUpdateObj",value:function(n){return mh(xd,this,n),this}},{key:"onRemoveObj",value:function(n){return mh(bd,this,n),this}},{key:"digest",value:function(n){var i=this;n.filter(function(s){return!Qe(Ws,i).has(Qe(js,i).call(i,s))}).forEach(function(s){var o=Qe(yd,i).call(i,s);Qe(Ws,i).set(Qe(js,i).call(i,s),o),Qe(ga,i).set(o,s)});var r=new Map(n.map(function(s){return[Qe(js,i).call(i,s),s]}));return Qe(Ws,this).forEach(function(s,o){r.has(o)?Qe(xd,i).call(i,s,r.get(o)):(Qe(bd,i).call(i,s,o),Qe(Ws,i).delete(o),Qe(ga,i).delete(s))}),this}},{key:"clear",value:function(){return this.digest([]),this}}])})();function Ys(e,t,n){e.prototype=t.prototype=n,n.constructor=e}function ya(e,t){var n=Object.create(e.prototype);for(var i in t)n[i]=t[i];return n}function ir(){}var Gr=.7,$s=1/Gr,qs="\\s*([+-]?\\d+)\\s*",_a="\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)\\s*",gi="\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)%\\s*",HA=/^#([0-9a-f]{3,8})$/,GA=new RegExp(`^rgb\\(${qs},${qs},${qs}\\)$`),WA=new RegExp(`^rgb\\(${gi},${gi},${gi}\\)$`),jA=new RegExp(`^rgba\\(${qs},${qs},${qs},${_a}\\)$`),qA=new RegExp(`^rgba\\(${gi},${gi},${gi},${_a}\\)$`),XA=new RegExp(`^hsl\\(${_a},${gi},${gi}\\)$`),$A=new RegExp(`^hsla\\(${_a},${gi},${gi},${_a}\\)$`),N_={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074};Ys(ir,xh,{copy(e){return Object.assign(new this.constructor,this,e)},displayable(){return this.rgb().displayable()},hex:F_,formatHex:F_,formatHex8:YA,formatHsl:ZA,formatRgb:U_,toString:U_});function F_(){return this.rgb().formatHex()}function YA(){return this.rgb().formatHex8()}function ZA(){return q_(this).formatHsl()}function U_(){return this.rgb().formatRgb()}function xh(e){var t,n;return e=(e+"").trim().toLowerCase(),(t=HA.exec(e))?(n=t[1].length,t=parseInt(t[1],16),n===6?z_(t):n===3?new Ve(t>>8&15|t>>4&240,t>>4&15|t&240,(t&15)<<4|t&15,1):n===8?gh(t>>24&255,t>>16&255,t>>8&255,(t&255)/255):n===4?gh(t>>12&15|t>>8&240,t>>8&15|t>>4&240,t>>4&15|t&240,((t&15)<<4|t&15)/255):null):(t=GA.exec(e))?new Ve(t[1],t[2],t[3],1):(t=WA.exec(e))?new Ve(t[1]*255/100,t[2]*255/100,t[3]*255/100,1):(t=jA.exec(e))?gh(t[1],t[2],t[3],t[4]):(t=qA.exec(e))?gh(t[1]*255/100,t[2]*255/100,t[3]*255/100,t[4]):(t=XA.exec(e))?V_(t[1],t[2]/100,t[3]/100,1):(t=$A.exec(e))?V_(t[1],t[2]/100,t[3]/100,t[4]):N_.hasOwnProperty(e)?z_(N_[e]):e==="transparent"?new Ve(NaN,NaN,NaN,0):null}function z_(e){return new Ve(e>>16&255,e>>8&255,e&255,1)}function gh(e,t,n,i){return i<=0&&(e=t=n=NaN),new Ve(e,t,n,i)}function Cd(e){return e instanceof ir||(e=xh(e)),e?(e=e.rgb(),new Ve(e.r,e.g,e.b,e.opacity)):new Ve}function Wr(e,t,n,i){return arguments.length===1?Cd(e):new Ve(e,t,n,i??1)}function Ve(e,t,n,i){this.r=+e,this.g=+t,this.b=+n,this.opacity=+i}Ys(Ve,Wr,ya(ir,{brighter(e){return e=e==null?$s:Math.pow($s,e),new Ve(this.r*e,this.g*e,this.b*e,this.opacity)},darker(e){return e=e==null?Gr:Math.pow(Gr,e),new Ve(this.r*e,this.g*e,this.b*e,this.opacity)},rgb(){return this},clamp(){return new Ve(Vr(this.r),Vr(this.g),Vr(this.b),vh(this.opacity))},displayable(){return-.5<=this.r&&this.r<255.5&&-.5<=this.g&&this.g<255.5&&-.5<=this.b&&this.b<255.5&&0<=this.opacity&&this.opacity<=1},hex:k_,formatHex:k_,formatHex8:KA,formatRgb:B_,toString:B_}));function k_(){return`#${Br(this.r)}${Br(this.g)}${Br(this.b)}`}function KA(){return`#${Br(this.r)}${Br(this.g)}${Br(this.b)}${Br((isNaN(this.opacity)?1:this.opacity)*255)}`}function B_(){let e=vh(this.opacity);return`${e===1?"rgb(":"rgba("}${Vr(this.r)}, ${Vr(this.g)}, ${Vr(this.b)}${e===1?")":`, ${e})`}`}function vh(e){return isNaN(e)?1:Math.max(0,Math.min(1,e))}function Vr(e){return Math.max(0,Math.min(255,Math.round(e)||0))}function Br(e){return e=Vr(e),(e<16?"0":"")+e.toString(16)}function V_(e,t,n,i){return i<=0?e=t=n=NaN:n<=0||n>=1?e=t=NaN:t<=0&&(e=NaN),new ti(e,t,n,i)}function q_(e){if(e instanceof ti)return new ti(e.h,e.s,e.l,e.opacity);if(e instanceof ir||(e=xh(e)),!e)return new ti;if(e instanceof ti)return e;e=e.rgb();var t=e.r/255,n=e.g/255,i=e.b/255,r=Math.min(t,n,i),s=Math.max(t,n,i),o=NaN,a=s-r,c=(s+r)/2;return a?(t===s?o=(n-i)/a+(n<i)*6:n===s?o=(i-t)/a+2:o=(t-n)/a+4,a/=c<.5?s+r:2-s-r,o*=60):a=c>0&&c<1?0:o,new ti(o,a,c,e.opacity)}function bh(e,t,n,i){return arguments.length===1?q_(e):new ti(e,t,n,i??1)}function ti(e,t,n,i){this.h=+e,this.s=+t,this.l=+n,this.opacity=+i}Ys(ti,bh,ya(ir,{brighter(e){return e=e==null?$s:Math.pow($s,e),new ti(this.h,this.s,this.l*e,this.opacity)},darker(e){return e=e==null?Gr:Math.pow(Gr,e),new ti(this.h,this.s,this.l*e,this.opacity)},rgb(){var e=this.h%360+(this.h<0)*360,t=isNaN(e)||isNaN(this.s)?0:this.s,n=this.l,i=n+(n<.5?n:1-n)*t,r=2*n-i;return new Ve(Sd(e>=240?e-240:e+120,r,i),Sd(e,r,i),Sd(e<120?e+240:e-120,r,i),this.opacity)},clamp(){return new ti(H_(this.h),_h(this.s),_h(this.l),vh(this.opacity))},displayable(){return(0<=this.s&&this.s<=1||isNaN(this.s))&&0<=this.l&&this.l<=1&&0<=this.opacity&&this.opacity<=1},formatHsl(){let e=vh(this.opacity);return`${e===1?"hsl(":"hsla("}${H_(this.h)}, ${_h(this.s)*100}%, ${_h(this.l)*100}%${e===1?")":`, ${e})`}`}}));function H_(e){return e=(e||0)%360,e<0?e+360:e}function _h(e){return Math.max(0,Math.min(1,e||0))}function Sd(e,t,n){return(e<60?t+(n-t)*e/60:e<180?n:e<240?t+(n-t)*(240-e)/60:t)*255}var X_=Math.PI/180,$_=180/Math.PI,yh=18,Y_=.96422,Z_=1,K_=.82521,J_=4/29,Xs=6/29,Q_=3*Xs*Xs,JA=Xs*Xs*Xs;function tv(e){if(e instanceof _i)return new _i(e.l,e.a,e.b,e.opacity);if(e instanceof Ui)return nv(e);e instanceof Ve||(e=Cd(e));var t=Ad(e.r),n=Ad(e.g),i=Ad(e.b),r=wd((.2225045*t+.7168786*n+.0606169*i)/Z_),s,o;return t===n&&n===i?s=o=r:(s=wd((.4360747*t+.3850649*n+.1430804*i)/Y_),o=wd((.0139322*t+.0971045*n+.7141733*i)/K_)),new _i(116*r-16,500*(s-r),200*(r-o),e.opacity)}function ev(e,t,n,i){return arguments.length===1?tv(e):new _i(e,t,n,i??1)}function _i(e,t,n,i){this.l=+e,this.a=+t,this.b=+n,this.opacity=+i}Ys(_i,ev,ya(ir,{brighter(e){return new _i(this.l+yh*(e??1),this.a,this.b,this.opacity)},darker(e){return new _i(this.l-yh*(e??1),this.a,this.b,this.opacity)},rgb(){var e=(this.l+16)/116,t=isNaN(this.a)?e:e+this.a/500,n=isNaN(this.b)?e:e-this.b/200;return t=Y_*Ed(t),e=Z_*Ed(e),n=K_*Ed(n),new Ve(Td(3.1338561*t-1.6168667*e-.4906146*n),Td(-.9787684*t+1.9161415*e+.033454*n),Td(.0719453*t-.2289914*e+1.4052427*n),this.opacity)}}));function wd(e){return e>JA?Math.pow(e,1/3):e/Q_+J_}function Ed(e){return e>Xs?e*e*e:Q_*(e-J_)}function Td(e){return 255*(e<=.0031308?12.92*e:1.055*Math.pow(e,1/2.4)-.055)}function Ad(e){return(e/=255)<=.04045?e/12.92:Math.pow((e+.055)/1.055,2.4)}function QA(e){if(e instanceof Ui)return new Ui(e.h,e.c,e.l,e.opacity);if(e instanceof _i||(e=tv(e)),e.a===0&&e.b===0)return new Ui(NaN,0<e.l&&e.l<100?0:NaN,e.l,e.opacity);var t=Math.atan2(e.b,e.a)*$_;return new Ui(t<0?t+360:t,Math.sqrt(e.a*e.a+e.b*e.b),e.l,e.opacity)}function Mh(e,t,n,i){return arguments.length===1?QA(e):new Ui(e,t,n,i??1)}function Ui(e,t,n,i){this.h=+e,this.c=+t,this.l=+n,this.opacity=+i}function nv(e){if(isNaN(e.h))return new _i(e.l,0,0,e.opacity);var t=e.h*X_;return new _i(e.l,Math.cos(t)*e.c,Math.sin(t)*e.c,e.opacity)}Ys(Ui,Mh,ya(ir,{brighter(e){return new Ui(this.h,this.c,this.l+yh*(e??1),this.opacity)},darker(e){return new Ui(this.h,this.c,this.l-yh*(e??1),this.opacity)},rgb(){return nv(this).rgb()}}));var iv=-.14861,Rd=1.78277,Pd=-.29227,Sh=-.90649,va=1.97294,G_=va*Sh,W_=va*Rd,j_=Rd*Pd-Sh*iv;function t2(e){if(e instanceof Hr)return new Hr(e.h,e.s,e.l,e.opacity);e instanceof Ve||(e=Cd(e));var t=e.r/255,n=e.g/255,i=e.b/255,r=(j_*i+G_*t-W_*n)/(j_+G_-W_),s=i-r,o=(va*(n-r)-Pd*s)/Sh,a=Math.sqrt(o*o+s*s)/(va*r*(1-r)),c=a?Math.atan2(o,s)*$_-120:NaN;return new Hr(c<0?c+360:c,a,r,e.opacity)}function Vn(e,t,n,i){return arguments.length===1?t2(e):new Hr(e,t,n,i??1)}function Hr(e,t,n,i){this.h=+e,this.s=+t,this.l=+n,this.opacity=+i}Ys(Hr,Vn,ya(ir,{brighter(e){return e=e==null?$s:Math.pow($s,e),new Hr(this.h,this.s,this.l*e,this.opacity)},darker(e){return e=e==null?Gr:Math.pow(Gr,e),new Hr(this.h,this.s,this.l*e,this.opacity)},rgb(){var e=isNaN(this.h)?0:(this.h+120)*X_,t=+this.l,n=isNaN(this.s)?0:this.s*t*(1-t),i=Math.cos(e),r=Math.sin(e);return new Ve(255*(t+n*(iv*i+Rd*r)),255*(t+n*(Pd*i+Sh*r)),255*(t+n*(va*i)),this.opacity)}}));function ov(e,t,n,i,r){var s=e*e,o=s*e;return((1-3*e+3*s-o)*t+(4-6*s+3*o)*n+(1+3*e+3*s-3*o)*i+o*r)/6}function e2(e){var t=e.length-1;return function(n){var i=n<=0?n=0:n>=1?(n=1,t-1):Math.floor(n*t),r=e[i],s=e[i+1],o=i>0?e[i-1]:2*r-s,a=i<t-1?e[i+2]:2*s-r;return ov((n-i/t)*t,o,r,s,a)}}function n2(e){var t=e.length;return function(n){var i=Math.floor(((n%=1)<0?++n:n)*t),r=e[(i+t-1)%t],s=e[i%t],o=e[(i+1)%t],a=e[(i+2)%t];return ov((n-i/t)*t,r,s,o,a)}}var Dd=e=>()=>e;function av(e,t){return function(n){return e+n*t}}function i2(e,t,n){return e=Math.pow(e,n),t=Math.pow(t,n)-e,n=1/n,function(i){return Math.pow(e+i*t,n)}}function Ld(e,t){var n=t-e;return n?av(e,n>180||n<-180?n-360*Math.round(n/360):n):Dd(isNaN(e)?t:e)}function r2(e){return(e=+e)==1?pn:function(t,n){return n-t?i2(t,n,e):Dd(isNaN(t)?n:t)}}function pn(e,t){var n=t-e;return n?av(e,n):Dd(isNaN(e)?t:e)}var OU=(function e(t){var n=r2(t);function i(r,s){var o=n((r=Wr(r)).r,(s=Wr(s)).r),a=n(r.g,s.g),c=n(r.b,s.b),l=pn(r.opacity,s.opacity);return function(u){return r.r=o(u),r.g=a(u),r.b=c(u),r.opacity=l(u),r+""}}return i.gamma=e,i})(1);function cv(e){return function(t){var n=t.length,i=new Array(n),r=new Array(n),s=new Array(n),o,a;for(o=0;o<n;++o)a=Wr(t[o]),i[o]=a.r||0,r[o]=a.g||0,s[o]=a.b||0;return i=e(i),r=e(r),s=e(s),a.opacity=1,function(c){return a.r=i(c),a.g=r(c),a.b=s(c),a+""}}}var lv=cv(e2),NU=cv(n2);function Zs(e,t){return e=+e,t=+t,function(n){return e*(1-n)+t*n}}var s2=/[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g,FU=new RegExp(s2.source,"g");var rv=180/Math.PI,Id={translateX:0,translateY:0,rotate:0,skewX:0,scaleX:1,scaleY:1};function hv(e,t,n,i,r,s){var o,a,c;return(o=Math.sqrt(e*e+t*t))&&(e/=o,t/=o),(c=e*n+t*i)&&(n-=e*c,i-=t*c),(a=Math.sqrt(n*n+i*i))&&(n/=a,i/=a,c/=a),e*i<t*n&&(e=-e,t=-t,c=-c,o=-o),{translateX:r,translateY:s,rotate:Math.atan2(t,e)*rv,skewX:Math.atan(c)*rv,scaleX:o,scaleY:a}}var wh;function o2(e){let t=new(typeof DOMMatrix=="function"?DOMMatrix:WebKitCSSMatrix)(e+"");return t.isIdentity?Id:hv(t.a,t.b,t.c,t.d,t.e,t.f)}function a2(e){return e==null||(wh||(wh=document.createElementNS("http://www.w3.org/2000/svg","g")),wh.setAttribute("transform",e),!(e=wh.transform.baseVal.consolidate()))?Id:(e=e.matrix,hv(e.a,e.b,e.c,e.d,e.e,e.f))}function uv(e,t,n,i){function r(l){return l.length?l.pop()+" ":""}function s(l,u,h,f,d,m){if(l!==h||u!==f){var _=d.push("translate(",null,t,null,n);m.push({i:_-4,x:Zs(l,h)},{i:_-2,x:Zs(u,f)})}else(h||f)&&d.push("translate("+h+t+f+n)}function o(l,u,h,f){l!==u?(l-u>180?u+=360:u-l>180&&(l+=360),f.push({i:h.push(r(h)+"rotate(",null,i)-2,x:Zs(l,u)})):u&&h.push(r(h)+"rotate("+u+i)}function a(l,u,h,f){l!==u?f.push({i:h.push(r(h)+"skewX(",null,i)-2,x:Zs(l,u)}):u&&h.push(r(h)+"skewX("+u+i)}function c(l,u,h,f,d,m){if(l!==h||u!==f){var _=d.push(r(d)+"scale(",null,",",null,")");m.push({i:_-4,x:Zs(l,h)},{i:_-2,x:Zs(u,f)})}else(h!==1||f!==1)&&d.push(r(d)+"scale("+h+","+f+")")}return function(l,u){var h=[],f=[];return l=e(l),u=e(u),s(l.translateX,l.translateY,u.translateX,u.translateY,h,f),o(l.rotate,u.rotate,h,f),a(l.skewX,u.skewX,h,f),c(l.scaleX,l.scaleY,u.scaleX,u.scaleY,h,f),l=u=null,function(d){for(var m=-1,_=f.length,g;++m<_;)h[(g=f[m]).i]=g.x(d);return h.join("")}}}var UU=uv(o2,"px, ","px)","deg)"),zU=uv(a2,", ",")",")"),c2=1e-12;function sv(e){return((e=Math.exp(e))+1/e)/2}function l2(e){return((e=Math.exp(e))-1/e)/2}function h2(e){return((e=Math.exp(2*e))-1)/(e+1)}var kU=(function e(t,n,i){function r(s,o){var a=s[0],c=s[1],l=s[2],u=o[0],h=o[1],f=o[2],d=u-a,m=h-c,_=d*d+m*m,g,p;if(_<c2)p=Math.log(f/l)/t,g=function(C){return[a+C*d,c+C*m,l*Math.exp(t*C*p)]};else{var b=Math.sqrt(_),x=(f*f-l*l+i*_)/(2*l*n*b),v=(f*f-l*l-i*_)/(2*f*n*b),M=Math.log(Math.sqrt(x*x+1)-x),S=Math.log(Math.sqrt(v*v+1)-v);p=(S-M)/t,g=function(C){var P=C*p,T=sv(M),w=l/(n*b)*(T*h2(t*P+M)-l2(M));return[a+w*d,c+w*m,l*T/sv(t*P+M)]}}return g.duration=Math.abs(p)*1e3*t/Math.SQRT2,g}return r.rho=function(s){var o=Math.max(.001,+s),a=o*o,c=a*a;return e(o,a,c)},r})(Math.SQRT2,2,4);function fv(e){return function(t,n){var i=e((t=bh(t)).h,(n=bh(n)).h),r=pn(t.s,n.s),s=pn(t.l,n.l),o=pn(t.opacity,n.opacity);return function(a){return t.h=i(a),t.s=r(a),t.l=s(a),t.opacity=o(a),t+""}}}var BU=fv(Ld),VU=fv(pn);function dv(e){return function(t,n){var i=e((t=Mh(t)).h,(n=Mh(n)).h),r=pn(t.c,n.c),s=pn(t.l,n.l),o=pn(t.opacity,n.opacity);return function(a){return t.h=i(a),t.c=r(a),t.l=s(a),t.opacity=o(a),t+""}}}var HU=dv(Ld),GU=dv(pn);function pv(e){return(function t(n){n=+n;function i(r,s){var o=e((r=Vn(r)).h,(s=Vn(s)).h),a=pn(r.s,s.s),c=pn(r.l,s.l),l=pn(r.opacity,s.opacity);return function(u){return r.h=o(u),r.s=a(u),r.l=c(Math.pow(u,n)),r.opacity=l(u),r+""}}return i.gamma=t,i})(1)}var WU=pv(Ld),Eh=pv(pn);function u2(e,t){switch(arguments.length){case 0:break;case 1:this.range(e);break;default:this.range(t).domain(e);break}return this}var mv=Symbol("implicit");function Od(){var e=new ma,t=[],n=[],i=mv;function r(s){let o=e.get(s);if(o===void 0){if(i!==mv)return i;e.set(s,o=t.push(s)-1)}return n[o%n.length]}return r.domain=function(s){if(!arguments.length)return t.slice();t=[],e=new ma;for(let o of s)e.has(o)||e.set(o,t.push(o)-1);return r},r.range=function(s){return arguments.length?(n=Array.from(s),r):n.slice()},r.unknown=function(s){return arguments.length?(i=s,r):i},r.copy=function(){return Od(t,n).unknown(i)},u2.apply(r,arguments),r}function $t(e){for(var t=e.length/6|0,n=new Array(t),i=0;i<t;)n[i]="#"+e.slice(i*6,++i*6);return n}var n5=$t("1f77b4ff7f0e2ca02cd627289467bd8c564be377c27f7f7fbcbd2217becf"),i5=$t("7fc97fbeaed4fdc086ffff99386cb0f0027fbf5b17666666"),r5=$t("1b9e77d95f027570b3e7298a66a61ee6ab02a6761d666666"),s5=$t("4269d0efb118ff725c6cc5b03ca951ff8ab7a463f297bbf59c6b4e9498a0"),gv=$t("a6cee31f78b4b2df8a33a02cfb9a99e31a1cfdbf6fff7f00cab2d66a3d9affff99b15928"),o5=$t("fbb4aeb3cde3ccebc5decbe4fed9a6ffffcce5d8bdfddaecf2f2f2"),a5=$t("b3e2cdfdcdaccbd5e8f4cae4e6f5c9fff2aef1e2cccccccc"),c5=$t("e41a1c377eb84daf4a984ea3ff7f00ffff33a65628f781bf999999"),l5=$t("66c2a5fc8d628da0cbe78ac3a6d854ffd92fe5c494b3b3b3"),h5=$t("8dd3c7ffffb3bebadafb807280b1d3fdb462b3de69fccde5d9d9d9bc80bdccebc5ffed6f"),u5=$t("4e79a7f28e2ce1575976b7b259a14fedc949af7aa1ff9da79c755fbab0ab"),ye=e=>lv(e[e.length-1]),f2=new Array(3).concat("d8b365f5f5f55ab4ac","a6611adfc27d80cdc1018571","a6611adfc27df5f5f580cdc1018571","8c510ad8b365f6e8c3c7eae55ab4ac01665e","8c510ad8b365f6e8c3f5f5f5c7eae55ab4ac01665e","8c510abf812ddfc27df6e8c3c7eae580cdc135978f01665e","8c510abf812ddfc27df6e8c3f5f5f5c7eae580cdc135978f01665e","5430058c510abf812ddfc27df6e8c3c7eae580cdc135978f01665e003c30","5430058c510abf812ddfc27df6e8c3f5f5f5c7eae580cdc135978f01665e003c30").map($t),f5=ye(f2),d2=new Array(3).concat("af8dc3f7f7f77fbf7b","7b3294c2a5cfa6dba0008837","7b3294c2a5cff7f7f7a6dba0008837","762a83af8dc3e7d4e8d9f0d37fbf7b1b7837","762a83af8dc3e7d4e8f7f7f7d9f0d37fbf7b1b7837","762a839970abc2a5cfe7d4e8d9f0d3a6dba05aae611b7837","762a839970abc2a5cfe7d4e8f7f7f7d9f0d3a6dba05aae611b7837","40004b762a839970abc2a5cfe7d4e8d9f0d3a6dba05aae611b783700441b","40004b762a839970abc2a5cfe7d4e8f7f7f7d9f0d3a6dba05aae611b783700441b").map($t),d5=ye(d2),p2=new Array(3).concat("e9a3c9f7f7f7a1d76a","d01c8bf1b6dab8e1864dac26","d01c8bf1b6daf7f7f7b8e1864dac26","c51b7de9a3c9fde0efe6f5d0a1d76a4d9221","c51b7de9a3c9fde0eff7f7f7e6f5d0a1d76a4d9221","c51b7dde77aef1b6dafde0efe6f5d0b8e1867fbc414d9221","c51b7dde77aef1b6dafde0eff7f7f7e6f5d0b8e1867fbc414d9221","8e0152c51b7dde77aef1b6dafde0efe6f5d0b8e1867fbc414d9221276419","8e0152c51b7dde77aef1b6dafde0eff7f7f7e6f5d0b8e1867fbc414d9221276419").map($t),p5=ye(p2),m2=new Array(3).concat("998ec3f7f7f7f1a340","5e3c99b2abd2fdb863e66101","5e3c99b2abd2f7f7f7fdb863e66101","542788998ec3d8daebfee0b6f1a340b35806","542788998ec3d8daebf7f7f7fee0b6f1a340b35806","5427888073acb2abd2d8daebfee0b6fdb863e08214b35806","5427888073acb2abd2d8daebf7f7f7fee0b6fdb863e08214b35806","2d004b5427888073acb2abd2d8daebfee0b6fdb863e08214b358067f3b08","2d004b5427888073acb2abd2d8daebf7f7f7fee0b6fdb863e08214b358067f3b08").map($t),m5=ye(m2),g2=new Array(3).concat("ef8a62f7f7f767a9cf","ca0020f4a58292c5de0571b0","ca0020f4a582f7f7f792c5de0571b0","b2182bef8a62fddbc7d1e5f067a9cf2166ac","b2182bef8a62fddbc7f7f7f7d1e5f067a9cf2166ac","b2182bd6604df4a582fddbc7d1e5f092c5de4393c32166ac","b2182bd6604df4a582fddbc7f7f7f7d1e5f092c5de4393c32166ac","67001fb2182bd6604df4a582fddbc7d1e5f092c5de4393c32166ac053061","67001fb2182bd6604df4a582fddbc7f7f7f7d1e5f092c5de4393c32166ac053061").map($t),g5=ye(g2),_2=new Array(3).concat("ef8a62ffffff999999","ca0020f4a582bababa404040","ca0020f4a582ffffffbababa404040","b2182bef8a62fddbc7e0e0e09999994d4d4d","b2182bef8a62fddbc7ffffffe0e0e09999994d4d4d","b2182bd6604df4a582fddbc7e0e0e0bababa8787874d4d4d","b2182bd6604df4a582fddbc7ffffffe0e0e0bababa8787874d4d4d","67001fb2182bd6604df4a582fddbc7e0e0e0bababa8787874d4d4d1a1a1a","67001fb2182bd6604df4a582fddbc7ffffffe0e0e0bababa8787874d4d4d1a1a1a").map($t),_5=ye(_2),v2=new Array(3).concat("fc8d59ffffbf91bfdb","d7191cfdae61abd9e92c7bb6","d7191cfdae61ffffbfabd9e92c7bb6","d73027fc8d59fee090e0f3f891bfdb4575b4","d73027fc8d59fee090ffffbfe0f3f891bfdb4575b4","d73027f46d43fdae61fee090e0f3f8abd9e974add14575b4","d73027f46d43fdae61fee090ffffbfe0f3f8abd9e974add14575b4","a50026d73027f46d43fdae61fee090e0f3f8abd9e974add14575b4313695","a50026d73027f46d43fdae61fee090ffffbfe0f3f8abd9e974add14575b4313695").map($t),v5=ye(v2),y2=new Array(3).concat("fc8d59ffffbf91cf60","d7191cfdae61a6d96a1a9641","d7191cfdae61ffffbfa6d96a1a9641","d73027fc8d59fee08bd9ef8b91cf601a9850","d73027fc8d59fee08bffffbfd9ef8b91cf601a9850","d73027f46d43fdae61fee08bd9ef8ba6d96a66bd631a9850","d73027f46d43fdae61fee08bffffbfd9ef8ba6d96a66bd631a9850","a50026d73027f46d43fdae61fee08bd9ef8ba6d96a66bd631a9850006837","a50026d73027f46d43fdae61fee08bffffbfd9ef8ba6d96a66bd631a9850006837").map($t),y5=ye(y2),x2=new Array(3).concat("fc8d59ffffbf99d594","d7191cfdae61abdda42b83ba","d7191cfdae61ffffbfabdda42b83ba","d53e4ffc8d59fee08be6f59899d5943288bd","d53e4ffc8d59fee08bffffbfe6f59899d5943288bd","d53e4ff46d43fdae61fee08be6f598abdda466c2a53288bd","d53e4ff46d43fdae61fee08bffffbfe6f598abdda466c2a53288bd","9e0142d53e4ff46d43fdae61fee08be6f598abdda466c2a53288bd5e4fa2","9e0142d53e4ff46d43fdae61fee08bffffbfe6f598abdda466c2a53288bd5e4fa2").map($t),x5=ye(x2),b2=new Array(3).concat("e5f5f999d8c92ca25f","edf8fbb2e2e266c2a4238b45","edf8fbb2e2e266c2a42ca25f006d2c","edf8fbccece699d8c966c2a42ca25f006d2c","edf8fbccece699d8c966c2a441ae76238b45005824","f7fcfde5f5f9ccece699d8c966c2a441ae76238b45005824","f7fcfde5f5f9ccece699d8c966c2a441ae76238b45006d2c00441b").map($t),b5=ye(b2),M2=new Array(3).concat("e0ecf49ebcda8856a7","edf8fbb3cde38c96c688419d","edf8fbb3cde38c96c68856a7810f7c","edf8fbbfd3e69ebcda8c96c68856a7810f7c","edf8fbbfd3e69ebcda8c96c68c6bb188419d6e016b","f7fcfde0ecf4bfd3e69ebcda8c96c68c6bb188419d6e016b","f7fcfde0ecf4bfd3e69ebcda8c96c68c6bb188419d810f7c4d004b").map($t),M5=ye(M2),S2=new Array(3).concat("e0f3dba8ddb543a2ca","f0f9e8bae4bc7bccc42b8cbe","f0f9e8bae4bc7bccc443a2ca0868ac","f0f9e8ccebc5a8ddb57bccc443a2ca0868ac","f0f9e8ccebc5a8ddb57bccc44eb3d32b8cbe08589e","f7fcf0e0f3dbccebc5a8ddb57bccc44eb3d32b8cbe08589e","f7fcf0e0f3dbccebc5a8ddb57bccc44eb3d32b8cbe0868ac084081").map($t),S5=ye(S2),w2=new Array(3).concat("fee8c8fdbb84e34a33","fef0d9fdcc8afc8d59d7301f","fef0d9fdcc8afc8d59e34a33b30000","fef0d9fdd49efdbb84fc8d59e34a33b30000","fef0d9fdd49efdbb84fc8d59ef6548d7301f990000","fff7ecfee8c8fdd49efdbb84fc8d59ef6548d7301f990000","fff7ecfee8c8fdd49efdbb84fc8d59ef6548d7301fb300007f0000").map($t),w5=ye(w2),E2=new Array(3).concat("ece2f0a6bddb1c9099","f6eff7bdc9e167a9cf02818a","f6eff7bdc9e167a9cf1c9099016c59","f6eff7d0d1e6a6bddb67a9cf1c9099016c59","f6eff7d0d1e6a6bddb67a9cf3690c002818a016450","fff7fbece2f0d0d1e6a6bddb67a9cf3690c002818a016450","fff7fbece2f0d0d1e6a6bddb67a9cf3690c002818a016c59014636").map($t),E5=ye(E2),T2=new Array(3).concat("ece7f2a6bddb2b8cbe","f1eef6bdc9e174a9cf0570b0","f1eef6bdc9e174a9cf2b8cbe045a8d","f1eef6d0d1e6a6bddb74a9cf2b8cbe045a8d","f1eef6d0d1e6a6bddb74a9cf3690c00570b0034e7b","fff7fbece7f2d0d1e6a6bddb74a9cf3690c00570b0034e7b","fff7fbece7f2d0d1e6a6bddb74a9cf3690c00570b0045a8d023858").map($t),T5=ye(T2),A2=new Array(3).concat("e7e1efc994c7dd1c77","f1eef6d7b5d8df65b0ce1256","f1eef6d7b5d8df65b0dd1c77980043","f1eef6d4b9dac994c7df65b0dd1c77980043","f1eef6d4b9dac994c7df65b0e7298ace125691003f","f7f4f9e7e1efd4b9dac994c7df65b0e7298ace125691003f","f7f4f9e7e1efd4b9dac994c7df65b0e7298ace125698004367001f").map($t),A5=ye(A2),C2=new Array(3).concat("fde0ddfa9fb5c51b8a","feebe2fbb4b9f768a1ae017e","feebe2fbb4b9f768a1c51b8a7a0177","feebe2fcc5c0fa9fb5f768a1c51b8a7a0177","feebe2fcc5c0fa9fb5f768a1dd3497ae017e7a0177","fff7f3fde0ddfcc5c0fa9fb5f768a1dd3497ae017e7a0177","fff7f3fde0ddfcc5c0fa9fb5f768a1dd3497ae017e7a017749006a").map($t),C5=ye(C2),R2=new Array(3).concat("edf8b17fcdbb2c7fb8","ffffcca1dab441b6c4225ea8","ffffcca1dab441b6c42c7fb8253494","ffffccc7e9b47fcdbb41b6c42c7fb8253494","ffffccc7e9b47fcdbb41b6c41d91c0225ea80c2c84","ffffd9edf8b1c7e9b47fcdbb41b6c41d91c0225ea80c2c84","ffffd9edf8b1c7e9b47fcdbb41b6c41d91c0225ea8253494081d58").map($t),R5=ye(R2),P2=new Array(3).concat("f7fcb9addd8e31a354","ffffccc2e69978c679238443","ffffccc2e69978c67931a354006837","ffffccd9f0a3addd8e78c67931a354006837","ffffccd9f0a3addd8e78c67941ab5d238443005a32","ffffe5f7fcb9d9f0a3addd8e78c67941ab5d238443005a32","ffffe5f7fcb9d9f0a3addd8e78c67941ab5d238443006837004529").map($t),P5=ye(P2),I2=new Array(3).concat("fff7bcfec44fd95f0e","ffffd4fed98efe9929cc4c02","ffffd4fed98efe9929d95f0e993404","ffffd4fee391fec44ffe9929d95f0e993404","ffffd4fee391fec44ffe9929ec7014cc4c028c2d04","ffffe5fff7bcfee391fec44ffe9929ec7014cc4c028c2d04","ffffe5fff7bcfee391fec44ffe9929ec7014cc4c02993404662506").map($t),I5=ye(I2),D2=new Array(3).concat("ffeda0feb24cf03b20","ffffb2fecc5cfd8d3ce31a1c","ffffb2fecc5cfd8d3cf03b20bd0026","ffffb2fed976feb24cfd8d3cf03b20bd0026","ffffb2fed976feb24cfd8d3cfc4e2ae31a1cb10026","ffffccffeda0fed976feb24cfd8d3cfc4e2ae31a1cb10026","ffffccffeda0fed976feb24cfd8d3cfc4e2ae31a1cbd0026800026").map($t),D5=ye(D2),L2=new Array(3).concat("deebf79ecae13182bd","eff3ffbdd7e76baed62171b5","eff3ffbdd7e76baed63182bd08519c","eff3ffc6dbef9ecae16baed63182bd08519c","eff3ffc6dbef9ecae16baed64292c62171b5084594","f7fbffdeebf7c6dbef9ecae16baed64292c62171b5084594","f7fbffdeebf7c6dbef9ecae16baed64292c62171b508519c08306b").map($t),L5=ye(L2),O2=new Array(3).concat("e5f5e0a1d99b31a354","edf8e9bae4b374c476238b45","edf8e9bae4b374c47631a354006d2c","edf8e9c7e9c0a1d99b74c47631a354006d2c","edf8e9c7e9c0a1d99b74c47641ab5d238b45005a32","f7fcf5e5f5e0c7e9c0a1d99b74c47641ab5d238b45005a32","f7fcf5e5f5e0c7e9c0a1d99b74c47641ab5d238b45006d2c00441b").map($t),O5=ye(O2),N2=new Array(3).concat("f0f0f0bdbdbd636363","f7f7f7cccccc969696525252","f7f7f7cccccc969696636363252525","f7f7f7d9d9d9bdbdbd969696636363252525","f7f7f7d9d9d9bdbdbd969696737373525252252525","fffffff0f0f0d9d9d9bdbdbd969696737373525252252525","fffffff0f0f0d9d9d9bdbdbd969696737373525252252525000000").map($t),N5=ye(N2),F2=new Array(3).concat("efedf5bcbddc756bb1","f2f0f7cbc9e29e9ac86a51a3","f2f0f7cbc9e29e9ac8756bb154278f","f2f0f7dadaebbcbddc9e9ac8756bb154278f","f2f0f7dadaebbcbddc9e9ac8807dba6a51a34a1486","fcfbfdefedf5dadaebbcbddc9e9ac8807dba6a51a34a1486","fcfbfdefedf5dadaebbcbddc9e9ac8807dba6a51a354278f3f007d").map($t),F5=ye(F2),U2=new Array(3).concat("fee0d2fc9272de2d26","fee5d9fcae91fb6a4acb181d","fee5d9fcae91fb6a4ade2d26a50f15","fee5d9fcbba1fc9272fb6a4ade2d26a50f15","fee5d9fcbba1fc9272fb6a4aef3b2ccb181d99000d","fff5f0fee0d2fcbba1fc9272fb6a4aef3b2ccb181d99000d","fff5f0fee0d2fcbba1fc9272fb6a4aef3b2ccb181da50f1567000d").map($t),U5=ye(U2),z2=new Array(3).concat("fee6cefdae6be6550d","feeddefdbe85fd8d3cd94701","feeddefdbe85fd8d3ce6550da63603","feeddefdd0a2fdae6bfd8d3ce6550da63603","feeddefdd0a2fdae6bfd8d3cf16913d948018c2d04","fff5ebfee6cefdd0a2fdae6bfd8d3cf16913d948018c2d04","fff5ebfee6cefdd0a2fdae6bfd8d3cf16913d94801a636037f2704").map($t),z5=ye(z2);var k5=Eh(Vn(300,.5,0),Vn(-240,.5,1)),B5=Eh(Vn(-100,.75,.35),Vn(80,1.5,.8)),V5=Eh(Vn(260,.75,.35),Vn(80,1.5,.8)),H5=Vn();var G5=Wr(),W5=Math.PI/3,j5=Math.PI*2/3;function Th(e){var t=e.length;return function(n){return e[Math.max(0,Math.min(t-1,Math.floor(n*t)))]}}var q5=Th($t("44015444025645045745055946075a46085c460a5d460b5e470d60470e6147106347116447136548146748166848176948186a481a6c481b6d481c6e481d6f481f70482071482173482374482475482576482677482878482979472a7a472c7a472d7b472e7c472f7d46307e46327e46337f463480453581453781453882443983443a83443b84433d84433e85423f854240864241864142874144874045884046883f47883f48893e49893e4a893e4c8a3d4d8a3d4e8a3c4f8a3c508b3b518b3b528b3a538b3a548c39558c39568c38588c38598c375a8c375b8d365c8d365d8d355e8d355f8d34608d34618d33628d33638d32648e32658e31668e31678e31688e30698e306a8e2f6b8e2f6c8e2e6d8e2e6e8e2e6f8e2d708e2d718e2c718e2c728e2c738e2b748e2b758e2a768e2a778e2a788e29798e297a8e297b8e287c8e287d8e277e8e277f8e27808e26818e26828e26828e25838e25848e25858e24868e24878e23888e23898e238a8d228b8d228c8d228d8d218e8d218f8d21908d21918c20928c20928c20938c1f948c1f958b1f968b1f978b1f988b1f998a1f9a8a1e9b8a1e9c891e9d891f9e891f9f881fa0881fa1881fa1871fa28720a38620a48621a58521a68522a78522a88423a98324aa8325ab8225ac8226ad8127ad8128ae8029af7f2ab07f2cb17e2db27d2eb37c2fb47c31b57b32b67a34b67935b77937b87838b9773aba763bbb753dbc743fbc7340bd7242be7144bf7046c06f48c16e4ac16d4cc26c4ec36b50c46a52c56954c56856c66758c7655ac8645cc8635ec96260ca6063cb5f65cb5e67cc5c69cd5b6ccd5a6ece5870cf5773d05675d05477d1537ad1517cd2507fd34e81d34d84d44b86d54989d5488bd6468ed64590d74393d74195d84098d83e9bd93c9dd93ba0da39a2da37a5db36a8db34aadc32addc30b0dd2fb2dd2db5de2bb8de29bade28bddf26c0df25c2df23c5e021c8e020cae11fcde11dd0e11cd2e21bd5e21ad8e219dae319dde318dfe318e2e418e5e419e7e419eae51aece51befe51cf1e51df4e61ef6e620f8e621fbe723fde725")),X5=Th($t("00000401000501010601010802010902020b02020d03030f03031204041405041606051806051a07061c08071e0907200a08220b09240c09260d0a290e0b2b100b2d110c2f120d31130d34140e36150e38160f3b180f3d19103f1a10421c10441d11471e114920114b21114e22115024125325125527125829115a2a115c2c115f2d11612f116331116533106734106936106b38106c390f6e3b0f703d0f713f0f72400f74420f75440f764510774710784910784a10794c117a4e117b4f127b51127c52137c54137d56147d57157e59157e5a167e5c167f5d177f5f187f601880621980641a80651a80671b80681c816a1c816b1d816d1d816e1e81701f81721f817320817521817621817822817922827b23827c23827e24828025828125818326818426818627818827818928818b29818c29818e2a81902a81912b81932b80942c80962c80982d80992d809b2e7f9c2e7f9e2f7fa02f7fa1307ea3307ea5317ea6317da8327daa337dab337cad347cae347bb0357bb2357bb3367ab5367ab73779b83779ba3878bc3978bd3977bf3a77c03a76c23b75c43c75c53c74c73d73c83e73ca3e72cc3f71cd4071cf4070d0416fd2426fd3436ed5446dd6456cd8456cd9466bdb476adc4869de4968df4a68e04c67e24d66e34e65e44f64e55064e75263e85362e95462ea5661eb5760ec5860ed5a5fee5b5eef5d5ef05f5ef1605df2625df2645cf3655cf4675cf4695cf56b5cf66c5cf66e5cf7705cf7725cf8745cf8765cf9785df9795df97b5dfa7d5efa7f5efa815ffb835ffb8560fb8761fc8961fc8a62fc8c63fc8e64fc9065fd9266fd9467fd9668fd9869fd9a6afd9b6bfe9d6cfe9f6dfea16efea36ffea571fea772fea973feaa74feac76feae77feb078feb27afeb47bfeb67cfeb77efeb97ffebb81febd82febf84fec185fec287fec488fec68afec88cfeca8dfecc8ffecd90fecf92fed194fed395fed597fed799fed89afdda9cfddc9efddea0fde0a1fde2a3fde3a5fde5a7fde7a9fde9aafdebacfcecaefceeb0fcf0b2fcf2b4fcf4b6fcf6b8fcf7b9fcf9bbfcfbbdfcfdbf")),$5=Th($t("00000401000501010601010802010a02020c02020e03021004031204031405041706041907051b08051d09061f0a07220b07240c08260d08290e092b10092d110a30120a32140b34150b37160b39180c3c190c3e1b0c411c0c431e0c451f0c48210c4a230c4c240c4f260c51280b53290b552b0b572d0b592f0a5b310a5c320a5e340a5f3609613809623909633b09643d09653e0966400a67420a68440a68450a69470b6a490b6a4a0c6b4c0c6b4d0d6c4f0d6c510e6c520e6d540f6d550f6d57106e59106e5a116e5c126e5d126e5f136e61136e62146e64156e65156e67166e69166e6a176e6c186e6d186e6f196e71196e721a6e741a6e751b6e771c6d781c6d7a1d6d7c1d6d7d1e6d7f1e6c801f6c82206c84206b85216b87216b88226a8a226a8c23698d23698f24699025689225689326679526679727669827669a28659b29649d29649f2a63a02a63a22b62a32c61a52c60a62d60a82e5fa92e5eab2f5ead305dae305cb0315bb1325ab3325ab43359b63458b73557b93556ba3655bc3754bd3853bf3952c03a51c13a50c33b4fc43c4ec63d4dc73e4cc83f4bca404acb4149cc4248ce4347cf4446d04545d24644d34743d44842d54a41d74b3fd84c3ed94d3dda4e3cdb503bdd513ade5238df5337e05536e15635e25734e35933e45a31e55c30e65d2fe75e2ee8602de9612bea632aeb6429eb6628ec6726ed6925ee6a24ef6c23ef6e21f06f20f1711ff1731df2741cf3761bf37819f47918f57b17f57d15f67e14f68013f78212f78410f8850ff8870ef8890cf98b0bf98c0af98e09fa9008fa9207fa9407fb9606fb9706fb9906fb9b06fb9d07fc9f07fca108fca309fca50afca60cfca80dfcaa0ffcac11fcae12fcb014fcb216fcb418fbb61afbb81dfbba1ffbbc21fbbe23fac026fac228fac42afac62df9c72ff9c932f9cb35f8cd37f8cf3af7d13df7d340f6d543f6d746f5d949f5db4cf4dd4ff4df53f4e156f3e35af3e55df2e661f2e865f2ea69f1ec6df1ed71f1ef75f1f179f2f27df2f482f3f586f3f68af4f88ef5f992f6fa96f8fb9af9fc9dfafda1fcffa4")),Y5=Th($t("0d088710078813078916078a19068c1b068d1d068e20068f2206902406912605912805922a05932c05942e05952f059631059733059735049837049938049a3a049a3c049b3e049c3f049c41049d43039e44039e46039f48039f4903a04b03a14c02a14e02a25002a25102a35302a35502a45601a45801a45901a55b01a55c01a65e01a66001a66100a76300a76400a76600a76700a86900a86a00a86c00a86e00a86f00a87100a87201a87401a87501a87701a87801a87a02a87b02a87d03a87e03a88004a88104a78305a78405a78606a68707a68808a68a09a58b0aa58d0ba58e0ca48f0da4910ea3920fa39410a29511a19613a19814a099159f9a169f9c179e9d189d9e199da01a9ca11b9ba21d9aa31e9aa51f99a62098a72197a82296aa2395ab2494ac2694ad2793ae2892b02991b12a90b22b8fb32c8eb42e8db52f8cb6308bb7318ab83289ba3388bb3488bc3587bd3786be3885bf3984c03a83c13b82c23c81c33d80c43e7fc5407ec6417dc7427cc8437bc9447aca457acb4679cc4778cc4977cd4a76ce4b75cf4c74d04d73d14e72d24f71d35171d45270d5536fd5546ed6556dd7566cd8576bd9586ada5a6ada5b69db5c68dc5d67dd5e66de5f65de6164df6263e06363e16462e26561e26660e3685fe4695ee56a5de56b5de66c5ce76e5be76f5ae87059e97158e97257ea7457eb7556eb7655ec7754ed7953ed7a52ee7b51ef7c51ef7e50f07f4ff0804ef1814df1834cf2844bf3854bf3874af48849f48948f58b47f58c46f68d45f68f44f79044f79143f79342f89441f89540f9973ff9983ef99a3efa9b3dfa9c3cfa9e3bfb9f3afba139fba238fca338fca537fca636fca835fca934fdab33fdac33fdae32fdaf31fdb130fdb22ffdb42ffdb52efeb72dfeb82cfeba2cfebb2bfebd2afebe2afec029fdc229fdc328fdc527fdc627fdc827fdca26fdcb26fccd25fcce25fcd025fcd225fbd324fbd524fbd724fad824fada24f9dc24f9dd25f8df25f8e125f7e225f7e425f6e626f6e826f5e926f5eb27f4ed27f3ee27f3f027f2f227f1f426f1f525f0f724f0f921"));function Ah(e){"@babel/helpers - typeof";return Ah=typeof Symbol=="function"&&typeof Symbol.iterator=="symbol"?function(t){return typeof t}:function(t){return t&&typeof Symbol=="function"&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},Ah(e)}var k2=/^\s+/,B2=/\s+$/;function Ct(e,t){if(e=e||"",t=t||{},e instanceof Ct)return e;if(!(this instanceof Ct))return new Ct(e,t);var n=V2(e);this._originalInput=e,this._r=n.r,this._g=n.g,this._b=n.b,this._a=n.a,this._roundA=Math.round(100*this._a)/100,this._format=t.format||n.format,this._gradientType=t.gradientType,this._r<1&&(this._r=Math.round(this._r)),this._g<1&&(this._g=Math.round(this._g)),this._b<1&&(this._b=Math.round(this._b)),this._ok=n.ok}Ct.prototype={isDark:function(){return this.getBrightness()<128},isLight:function(){return!this.isDark()},isValid:function(){return this._ok},getOriginalInput:function(){return this._originalInput},getFormat:function(){return this._format},getAlpha:function(){return this._a},getBrightness:function(){var t=this.toRgb();return(t.r*299+t.g*587+t.b*114)/1e3},getLuminance:function(){var t=this.toRgb(),n,i,r,s,o,a;return n=t.r/255,i=t.g/255,r=t.b/255,n<=.03928?s=n/12.92:s=Math.pow((n+.055)/1.055,2.4),i<=.03928?o=i/12.92:o=Math.pow((i+.055)/1.055,2.4),r<=.03928?a=r/12.92:a=Math.pow((r+.055)/1.055,2.4),.2126*s+.7152*o+.0722*a},setAlpha:function(t){return this._a=Sv(t),this._roundA=Math.round(100*this._a)/100,this},toHsv:function(){var t=vv(this._r,this._g,this._b);return{h:t.h*360,s:t.s,v:t.v,a:this._a}},toHsvString:function(){var t=vv(this._r,this._g,this._b),n=Math.round(t.h*360),i=Math.round(t.s*100),r=Math.round(t.v*100);return this._a==1?"hsv("+n+", "+i+"%, "+r+"%)":"hsva("+n+", "+i+"%, "+r+"%, "+this._roundA+")"},toHsl:function(){var t=_v(this._r,this._g,this._b);return{h:t.h*360,s:t.s,l:t.l,a:this._a}},toHslString:function(){var t=_v(this._r,this._g,this._b),n=Math.round(t.h*360),i=Math.round(t.s*100),r=Math.round(t.l*100);return this._a==1?"hsl("+n+", "+i+"%, "+r+"%)":"hsla("+n+", "+i+"%, "+r+"%, "+this._roundA+")"},toHex:function(t){return yv(this._r,this._g,this._b,t)},toHexString:function(t){return"#"+this.toHex(t)},toHex8:function(t){return j2(this._r,this._g,this._b,this._a,t)},toHex8String:function(t){return"#"+this.toHex8(t)},toRgb:function(){return{r:Math.round(this._r),g:Math.round(this._g),b:Math.round(this._b),a:this._a}},toRgbString:function(){return this._a==1?"rgb("+Math.round(this._r)+", "+Math.round(this._g)+", "+Math.round(this._b)+")":"rgba("+Math.round(this._r)+", "+Math.round(this._g)+", "+Math.round(this._b)+", "+this._roundA+")"},toPercentageRgb:function(){return{r:Math.round(Ee(this._r,255)*100)+"%",g:Math.round(Ee(this._g,255)*100)+"%",b:Math.round(Ee(this._b,255)*100)+"%",a:this._a}},toPercentageRgbString:function(){return this._a==1?"rgb("+Math.round(Ee(this._r,255)*100)+"%, "+Math.round(Ee(this._g,255)*100)+"%, "+Math.round(Ee(this._b,255)*100)+"%)":"rgba("+Math.round(Ee(this._r,255)*100)+"%, "+Math.round(Ee(this._g,255)*100)+"%, "+Math.round(Ee(this._b,255)*100)+"%, "+this._roundA+")"},toName:function(){return this._a===0?"transparent":this._a<1?!1:iC[yv(this._r,this._g,this._b,!0)]||!1},toFilter:function(t){var n="#"+xv(this._r,this._g,this._b,this._a),i=n,r=this._gradientType?"GradientType = 1, ":"";if(t){var s=Ct(t);i="#"+xv(s._r,s._g,s._b,s._a)}return"progid:DXImageTransform.Microsoft.gradient("+r+"startColorstr="+n+",endColorstr="+i+")"},toString:function(t){var n=!!t;t=t||this._format;var i=!1,r=this._a<1&&this._a>=0,s=!n&&r&&(t==="hex"||t==="hex6"||t==="hex3"||t==="hex4"||t==="hex8"||t==="name");return s?t==="name"&&this._a===0?this.toName():this.toRgbString():(t==="rgb"&&(i=this.toRgbString()),t==="prgb"&&(i=this.toPercentageRgbString()),(t==="hex"||t==="hex6")&&(i=this.toHexString()),t==="hex3"&&(i=this.toHexString(!0)),t==="hex4"&&(i=this.toHex8String(!0)),t==="hex8"&&(i=this.toHex8String()),t==="name"&&(i=this.toName()),t==="hsl"&&(i=this.toHslString()),t==="hsv"&&(i=this.toHsvString()),i||this.toHexString())},clone:function(){return Ct(this.toString())},_applyModification:function(t,n){var i=t.apply(null,[this].concat([].slice.call(n)));return this._r=i._r,this._g=i._g,this._b=i._b,this.setAlpha(i._a),this},lighten:function(){return this._applyModification(Y2,arguments)},brighten:function(){return this._applyModification(Z2,arguments)},darken:function(){return this._applyModification(K2,arguments)},desaturate:function(){return this._applyModification(q2,arguments)},saturate:function(){return this._applyModification(X2,arguments)},greyscale:function(){return this._applyModification($2,arguments)},spin:function(){return this._applyModification(J2,arguments)},_applyCombination:function(t,n){return t.apply(null,[this].concat([].slice.call(n)))},analogous:function(){return this._applyCombination(eC,arguments)},complement:function(){return this._applyCombination(Q2,arguments)},monochromatic:function(){return this._applyCombination(nC,arguments)},splitcomplement:function(){return this._applyCombination(tC,arguments)},triad:function(){return this._applyCombination(bv,[3])},tetrad:function(){return this._applyCombination(bv,[4])}};Ct.fromRatio=function(e,t){if(Ah(e)=="object"){var n={};for(var i in e)e.hasOwnProperty(i)&&(i==="a"?n[i]=e[i]:n[i]=xa(e[i]));e=n}return Ct(e,t)};function V2(e){var t={r:0,g:0,b:0},n=1,i=null,r=null,s=null,o=!1,a=!1;return typeof e=="string"&&(e=aC(e)),Ah(e)=="object"&&(zi(e.r)&&zi(e.g)&&zi(e.b)?(t=H2(e.r,e.g,e.b),o=!0,a=String(e.r).substr(-1)==="%"?"prgb":"rgb"):zi(e.h)&&zi(e.s)&&zi(e.v)?(i=xa(e.s),r=xa(e.v),t=W2(e.h,i,r),o=!0,a="hsv"):zi(e.h)&&zi(e.s)&&zi(e.l)&&(i=xa(e.s),s=xa(e.l),t=G2(e.h,i,s),o=!0,a="hsl"),e.hasOwnProperty("a")&&(n=e.a)),n=Sv(n),{ok:o,format:e.format||a,r:Math.min(255,Math.max(t.r,0)),g:Math.min(255,Math.max(t.g,0)),b:Math.min(255,Math.max(t.b,0)),a:n}}function H2(e,t,n){return{r:Ee(e,255)*255,g:Ee(t,255)*255,b:Ee(n,255)*255}}function _v(e,t,n){e=Ee(e,255),t=Ee(t,255),n=Ee(n,255);var i=Math.max(e,t,n),r=Math.min(e,t,n),s,o,a=(i+r)/2;if(i==r)s=o=0;else{var c=i-r;switch(o=a>.5?c/(2-i-r):c/(i+r),i){case e:s=(t-n)/c+(t<n?6:0);break;case t:s=(n-e)/c+2;break;case n:s=(e-t)/c+4;break}s/=6}return{h:s,s:o,l:a}}function G2(e,t,n){var i,r,s;e=Ee(e,360),t=Ee(t,100),n=Ee(n,100);function o(l,u,h){return h<0&&(h+=1),h>1&&(h-=1),h<1/6?l+(u-l)*6*h:h<1/2?u:h<2/3?l+(u-l)*(2/3-h)*6:l}if(t===0)i=r=s=n;else{var a=n<.5?n*(1+t):n+t-n*t,c=2*n-a;i=o(c,a,e+1/3),r=o(c,a,e),s=o(c,a,e-1/3)}return{r:i*255,g:r*255,b:s*255}}function vv(e,t,n){e=Ee(e,255),t=Ee(t,255),n=Ee(n,255);var i=Math.max(e,t,n),r=Math.min(e,t,n),s,o,a=i,c=i-r;if(o=i===0?0:c/i,i==r)s=0;else{switch(i){case e:s=(t-n)/c+(t<n?6:0);break;case t:s=(n-e)/c+2;break;case n:s=(e-t)/c+4;break}s/=6}return{h:s,s:o,v:a}}function W2(e,t,n){e=Ee(e,360)*6,t=Ee(t,100),n=Ee(n,100);var i=Math.floor(e),r=e-i,s=n*(1-t),o=n*(1-r*t),a=n*(1-(1-r)*t),c=i%6,l=[n,o,s,s,a,n][c],u=[a,n,n,o,s,s][c],h=[s,s,a,n,n,o][c];return{r:l*255,g:u*255,b:h*255}}function yv(e,t,n,i){var r=[ni(Math.round(e).toString(16)),ni(Math.round(t).toString(16)),ni(Math.round(n).toString(16))];return i&&r[0].charAt(0)==r[0].charAt(1)&&r[1].charAt(0)==r[1].charAt(1)&&r[2].charAt(0)==r[2].charAt(1)?r[0].charAt(0)+r[1].charAt(0)+r[2].charAt(0):r.join("")}function j2(e,t,n,i,r){var s=[ni(Math.round(e).toString(16)),ni(Math.round(t).toString(16)),ni(Math.round(n).toString(16)),ni(wv(i))];return r&&s[0].charAt(0)==s[0].charAt(1)&&s[1].charAt(0)==s[1].charAt(1)&&s[2].charAt(0)==s[2].charAt(1)&&s[3].charAt(0)==s[3].charAt(1)?s[0].charAt(0)+s[1].charAt(0)+s[2].charAt(0)+s[3].charAt(0):s.join("")}function xv(e,t,n,i){var r=[ni(wv(i)),ni(Math.round(e).toString(16)),ni(Math.round(t).toString(16)),ni(Math.round(n).toString(16))];return r.join("")}Ct.equals=function(e,t){return!e||!t?!1:Ct(e).toRgbString()==Ct(t).toRgbString()};Ct.random=function(){return Ct.fromRatio({r:Math.random(),g:Math.random(),b:Math.random()})};function q2(e,t){t=t===0?0:t||10;var n=Ct(e).toHsl();return n.s-=t/100,n.s=Ch(n.s),Ct(n)}function X2(e,t){t=t===0?0:t||10;var n=Ct(e).toHsl();return n.s+=t/100,n.s=Ch(n.s),Ct(n)}function $2(e){return Ct(e).desaturate(100)}function Y2(e,t){t=t===0?0:t||10;var n=Ct(e).toHsl();return n.l+=t/100,n.l=Ch(n.l),Ct(n)}function Z2(e,t){t=t===0?0:t||10;var n=Ct(e).toRgb();return n.r=Math.max(0,Math.min(255,n.r-Math.round(255*-(t/100)))),n.g=Math.max(0,Math.min(255,n.g-Math.round(255*-(t/100)))),n.b=Math.max(0,Math.min(255,n.b-Math.round(255*-(t/100)))),Ct(n)}function K2(e,t){t=t===0?0:t||10;var n=Ct(e).toHsl();return n.l-=t/100,n.l=Ch(n.l),Ct(n)}function J2(e,t){var n=Ct(e).toHsl(),i=(n.h+t)%360;return n.h=i<0?360+i:i,Ct(n)}function Q2(e){var t=Ct(e).toHsl();return t.h=(t.h+180)%360,Ct(t)}function bv(e,t){if(isNaN(t)||t<=0)throw new Error("Argument to polyad must be a positive number");for(var n=Ct(e).toHsl(),i=[Ct(e)],r=360/t,s=1;s<t;s++)i.push(Ct({h:(n.h+s*r)%360,s:n.s,l:n.l}));return i}function tC(e){var t=Ct(e).toHsl(),n=t.h;return[Ct(e),Ct({h:(n+72)%360,s:t.s,l:t.l}),Ct({h:(n+216)%360,s:t.s,l:t.l})]}function eC(e,t,n){t=t||6,n=n||30;var i=Ct(e).toHsl(),r=360/n,s=[Ct(e)];for(i.h=(i.h-(r*t>>1)+720)%360;--t;)i.h=(i.h+r)%360,s.push(Ct(i));return s}function nC(e,t){t=t||6;for(var n=Ct(e).toHsv(),i=n.h,r=n.s,s=n.v,o=[],a=1/t;t--;)o.push(Ct({h:i,s:r,v:s})),s=(s+a)%1;return o}Ct.mix=function(e,t,n){n=n===0?0:n||50;var i=Ct(e).toRgb(),r=Ct(t).toRgb(),s=n/100,o={r:(r.r-i.r)*s+i.r,g:(r.g-i.g)*s+i.g,b:(r.b-i.b)*s+i.b,a:(r.a-i.a)*s+i.a};return Ct(o)};Ct.readability=function(e,t){var n=Ct(e),i=Ct(t);return(Math.max(n.getLuminance(),i.getLuminance())+.05)/(Math.min(n.getLuminance(),i.getLuminance())+.05)};Ct.isReadable=function(e,t,n){var i=Ct.readability(e,t),r,s;switch(s=!1,r=cC(n),r.level+r.size){case"AAsmall":case"AAAlarge":s=i>=4.5;break;case"AAlarge":s=i>=3;break;case"AAAsmall":s=i>=7;break}return s};Ct.mostReadable=function(e,t,n){var i=null,r=0,s,o,a,c;n=n||{},o=n.includeFallbackColors,a=n.level,c=n.size;for(var l=0;l<t.length;l++)s=Ct.readability(e,t[l]),s>r&&(r=s,i=Ct(t[l]));return Ct.isReadable(e,i,{level:a,size:c})||!o?i:(n.includeFallbackColors=!1,Ct.mostReadable(e,["#fff","#000"],n))};var Nd=Ct.names={aliceblue:"f0f8ff",antiquewhite:"faebd7",aqua:"0ff",aquamarine:"7fffd4",azure:"f0ffff",beige:"f5f5dc",bisque:"ffe4c4",black:"000",blanchedalmond:"ffebcd",blue:"00f",blueviolet:"8a2be2",brown:"a52a2a",burlywood:"deb887",burntsienna:"ea7e5d",cadetblue:"5f9ea0",chartreuse:"7fff00",chocolate:"d2691e",coral:"ff7f50",cornflowerblue:"6495ed",cornsilk:"fff8dc",crimson:"dc143c",cyan:"0ff",darkblue:"00008b",darkcyan:"008b8b",darkgoldenrod:"b8860b",darkgray:"a9a9a9",darkgreen:"006400",darkgrey:"a9a9a9",darkkhaki:"bdb76b",darkmagenta:"8b008b",darkolivegreen:"556b2f",darkorange:"ff8c00",darkorchid:"9932cc",darkred:"8b0000",darksalmon:"e9967a",darkseagreen:"8fbc8f",darkslateblue:"483d8b",darkslategray:"2f4f4f",darkslategrey:"2f4f4f",darkturquoise:"00ced1",darkviolet:"9400d3",deeppink:"ff1493",deepskyblue:"00bfff",dimgray:"696969",dimgrey:"696969",dodgerblue:"1e90ff",firebrick:"b22222",floralwhite:"fffaf0",forestgreen:"228b22",fuchsia:"f0f",gainsboro:"dcdcdc",ghostwhite:"f8f8ff",gold:"ffd700",goldenrod:"daa520",gray:"808080",green:"008000",greenyellow:"adff2f",grey:"808080",honeydew:"f0fff0",hotpink:"ff69b4",indianred:"cd5c5c",indigo:"4b0082",ivory:"fffff0",khaki:"f0e68c",lavender:"e6e6fa",lavenderblush:"fff0f5",lawngreen:"7cfc00",lemonchiffon:"fffacd",lightblue:"add8e6",lightcoral:"f08080",lightcyan:"e0ffff",lightgoldenrodyellow:"fafad2",lightgray:"d3d3d3",lightgreen:"90ee90",lightgrey:"d3d3d3",lightpink:"ffb6c1",lightsalmon:"ffa07a",lightseagreen:"20b2aa",lightskyblue:"87cefa",lightslategray:"789",lightslategrey:"789",lightsteelblue:"b0c4de",lightyellow:"ffffe0",lime:"0f0",limegreen:"32cd32",linen:"faf0e6",magenta:"f0f",maroon:"800000",mediumaquamarine:"66cdaa",mediumblue:"0000cd",mediumorchid:"ba55d3",mediumpurple:"9370db",mediumseagreen:"3cb371",mediumslateblue:"7b68ee",mediumspringgreen:"00fa9a",mediumturquoise:"48d1cc",mediumvioletred:"c71585",midnightblue:"191970",mintcream:"f5fffa",mistyrose:"ffe4e1",moccasin:"ffe4b5",navajowhite:"ffdead",navy:"000080",oldlace:"fdf5e6",olive:"808000",olivedrab:"6b8e23",orange:"ffa500",orangered:"ff4500",orchid:"da70d6",palegoldenrod:"eee8aa",palegreen:"98fb98",paleturquoise:"afeeee",palevioletred:"db7093",papayawhip:"ffefd5",peachpuff:"ffdab9",peru:"cd853f",pink:"ffc0cb",plum:"dda0dd",powderblue:"b0e0e6",purple:"800080",rebeccapurple:"663399",red:"f00",rosybrown:"bc8f8f",royalblue:"4169e1",saddlebrown:"8b4513",salmon:"fa8072",sandybrown:"f4a460",seagreen:"2e8b57",seashell:"fff5ee",sienna:"a0522d",silver:"c0c0c0",skyblue:"87ceeb",slateblue:"6a5acd",slategray:"708090",slategrey:"708090",snow:"fffafa",springgreen:"00ff7f",steelblue:"4682b4",tan:"d2b48c",teal:"008080",thistle:"d8bfd8",tomato:"ff6347",turquoise:"40e0d0",violet:"ee82ee",wheat:"f5deb3",white:"fff",whitesmoke:"f5f5f5",yellow:"ff0",yellowgreen:"9acd32"},iC=Ct.hexNames=rC(Nd);function rC(e){var t={};for(var n in e)e.hasOwnProperty(n)&&(t[e[n]]=n);return t}function Sv(e){return e=parseFloat(e),(isNaN(e)||e<0||e>1)&&(e=1),e}function Ee(e,t){sC(e)&&(e="100%");var n=oC(e);return e=Math.min(t,Math.max(0,parseFloat(e))),n&&(e=parseInt(e*t,10)/100),Math.abs(e-t)<1e-6?1:e%t/parseFloat(t)}function Ch(e){return Math.min(1,Math.max(0,e))}function wn(e){return parseInt(e,16)}function sC(e){return typeof e=="string"&&e.indexOf(".")!=-1&&parseFloat(e)===1}function oC(e){return typeof e=="string"&&e.indexOf("%")!=-1}function ni(e){return e.length==1?"0"+e:""+e}function xa(e){return e<=1&&(e=e*100+"%"),e}function wv(e){return Math.round(parseFloat(e)*255).toString(16)}function Mv(e){return wn(e)/255}var ei=(function(){var e="[-\\+]?\\d+%?",t="[-\\+]?\\d*\\.\\d+%?",n="(?:"+t+")|(?:"+e+")",i="[\\s|\\(]+("+n+")[,|\\s]+("+n+")[,|\\s]+("+n+")\\s*\\)?",r="[\\s|\\(]+("+n+")[,|\\s]+("+n+")[,|\\s]+("+n+")[,|\\s]+("+n+")\\s*\\)?";return{CSS_UNIT:new RegExp(n),rgb:new RegExp("rgb"+i),rgba:new RegExp("rgba"+r),hsl:new RegExp("hsl"+i),hsla:new RegExp("hsla"+r),hsv:new RegExp("hsv"+i),hsva:new RegExp("hsva"+r),hex3:/^#?([0-9a-fA-F]{1})([0-9a-fA-F]{1})([0-9a-fA-F]{1})$/,hex6:/^#?([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/,hex4:/^#?([0-9a-fA-F]{1})([0-9a-fA-F]{1})([0-9a-fA-F]{1})([0-9a-fA-F]{1})$/,hex8:/^#?([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/}})();function zi(e){return!!ei.CSS_UNIT.exec(e)}function aC(e){e=e.replace(k2,"").replace(B2,"").toLowerCase();var t=!1;if(Nd[e])e=Nd[e],t=!0;else if(e=="transparent")return{r:0,g:0,b:0,a:0,format:"name"};var n;return(n=ei.rgb.exec(e))?{r:n[1],g:n[2],b:n[3]}:(n=ei.rgba.exec(e))?{r:n[1],g:n[2],b:n[3],a:n[4]}:(n=ei.hsl.exec(e))?{h:n[1],s:n[2],l:n[3]}:(n=ei.hsla.exec(e))?{h:n[1],s:n[2],l:n[3],a:n[4]}:(n=ei.hsv.exec(e))?{h:n[1],s:n[2],v:n[3]}:(n=ei.hsva.exec(e))?{h:n[1],s:n[2],v:n[3],a:n[4]}:(n=ei.hex8.exec(e))?{r:wn(n[1]),g:wn(n[2]),b:wn(n[3]),a:Mv(n[4]),format:t?"name":"hex8"}:(n=ei.hex6.exec(e))?{r:wn(n[1]),g:wn(n[2]),b:wn(n[3]),format:t?"name":"hex"}:(n=ei.hex4.exec(e))?{r:wn(n[1]+""+n[1]),g:wn(n[2]+""+n[2]),b:wn(n[3]+""+n[3]),a:Mv(n[4]+""+n[4]),format:t?"name":"hex8"}:(n=ei.hex3.exec(e))?{r:wn(n[1]+""+n[1]),g:wn(n[2]+""+n[2]),b:wn(n[3]+""+n[3]),format:t?"name":"hex"}:!1}function cC(e){var t,n;return e=e||{level:"AA",size:"small"},t=(e.level||"AA").toUpperCase(),n=(e.size||"small").toLowerCase(),t!=="AA"&&t!=="AAA"&&(t="AA"),n!=="small"&&n!=="large"&&(n="small"),{level:t,size:n}}var Rv=e=>{e instanceof Array?e.forEach(Rv):(e.map&&e.map.dispose(),e.dispose())},zd=e=>{e.geometry&&e.geometry.dispose(),e.material&&Rv(e.material),e.texture&&e.texture.dispose(),e.children&&e.children.forEach(zd)},Ev=e=>{for(;e.children.length;){let t=e.children[0];e.remove(t),zd(t)}},jr=class extends O_{constructor(t,{dataBindAttr:n="__data",objBindAttr:i="__threeObj"}={}){super(),this.scene=t,this.#e=n,this.#t=i,this.onRemoveObj(()=>{})}onCreateObj(t){return super.onCreateObj(n=>{let i=t(n);return n[this.#t]=i,i[this.#e]=n,this.scene.add(i),i}),this}onRemoveObj(t){return super.onRemoveObj((n,i)=>{let r=super.getData(n);t(n,i),this.scene.remove(n),zd(n),delete r[this.#t]}),this}scene;#e;#t},ba=e=>isNaN(e)?parseInt(Ct(e).toHex(),16):e,Fd=e=>isNaN(e)?Ct(e).getAlpha():1,lC=Od(gv);function Tv(e,t,n){!t||typeof n!="string"||e.filter(i=>!i[n]).forEach(i=>{i[n]=lC(t(i))})}function hC({nodes:e,links:t},n,{nodeFilter:i=()=>!0,onLoopError:r=s=>{throw`Invalid DAG structure! Found cycle in node path: ${s.join(" -> ")}.`}}={}){let s={};e.forEach(l=>s[n(l)]={data:l,out:[],depth:-1,skip:!i(l)}),t.forEach(({source:l,target:u})=>{let h=_(l),f=_(u);if(!s.hasOwnProperty(h))throw`Missing source node with id: ${h}`;if(!s.hasOwnProperty(f))throw`Missing target node with id: ${f}`;let d=s[h],m=s[f];d.out.push(m);function _(g){return typeof g=="object"?n(g):g}});let o=[];return c(Object.values(s)),Object.assign({},...Object.entries(s).filter(([,l])=>!l.skip).map(([l,u])=>({[l]:u.depth})));function c(l,u=[],h=0){for(let f=0,d=l.length;f<d;f++){let m=l[f];if(u.indexOf(m)!==-1){let _=[...u.slice(u.indexOf(m)),m].map(g=>n(g.data));o.some(g=>g.length===_.length&&g.every((p,b)=>p===_[b]))||(o.push(_),r(_));continue}h>m.depth&&(m.depth=h,c(m.out,[...u,m],h+(m.skip?0:1)))}}}var Ut=window.THREE?window.THREE:{Group:$e,Mesh:we,MeshLambertMaterial:Wo,Color:Ot,BufferGeometry:ve,BufferAttribute:Ye,Matrix4:Vt,Vector3:I,SphereGeometry:Pi,CylinderGeometry:Ts,TubeGeometry:Vo,ConeGeometry:zo,Line:li,LineBasicMaterial:Zn,QuadraticBezierCurve3:Tr,CubicBezierCurve3:As,Box3:fn},Av={graph:D0,forcelayout:Cv.default},uC=2,Ud=new Ut.BufferGeometry().setAttribute?"setAttribute":"addAttribute",Rh=new Ut.BufferGeometry().applyMatrix4?"applyMatrix4":"applyMatrix",fC=nr({props:{jsonUrl:{onChange:function(e,t){e&&!t.fetchingJson&&(t.fetchingJson=!0,t.onLoading(),fetch(e).then(n=>n.json()).then(n=>{t.fetchingJson=!1,t.onFinishLoading(n),this.graphData(n)}))},triggerUpdate:!1},graphData:{default:{nodes:[],links:[]},onChange(e,t){t.engineRunning=!1}},numDimensions:{default:3,onChange(e,t){let n=t.d3ForceLayout.force("charge");n&&n.strength(e>2?-60:-30),e<3&&i(t.graphData.nodes,"z"),e<2&&i(t.graphData.nodes,"y");function i(r,s){r.forEach(o=>{delete o[s],delete o[`v${s}`]})}}},dagMode:{onChange(e,t){!e&&t.forceEngine==="d3"&&(t.graphData.nodes||[]).forEach(n=>n.fx=n.fy=n.fz=void 0)}},dagLevelDistance:{},dagNodeFilter:{default:e=>!0},onDagError:{triggerUpdate:!1},nodeRelSize:{default:4},nodeId:{default:"id"},nodeVal:{default:"val"},nodeResolution:{default:8},nodeColor:{default:"color"},nodeAutoColorBy:{},nodeOpacity:{default:.75},nodeVisibility:{default:!0},nodeThreeObject:{},nodeThreeObjectExtend:{default:!1},nodePositionUpdate:{triggerUpdate:!1},linkSource:{default:"source"},linkTarget:{default:"target"},linkVisibility:{default:!0},linkColor:{default:"color"},linkAutoColorBy:{},linkOpacity:{default:.2},linkWidth:{},linkResolution:{default:6},linkCurvature:{default:0,triggerUpdate:!1},linkCurveRotation:{default:0,triggerUpdate:!1},linkMaterial:{},linkThreeObject:{},linkThreeObjectExtend:{default:!1},linkPositionUpdate:{triggerUpdate:!1},linkDirectionalArrowLength:{default:0},linkDirectionalArrowColor:{},linkDirectionalArrowRelPos:{default:.5,triggerUpdate:!1},linkDirectionalArrowResolution:{default:8},linkDirectionalParticles:{default:0},linkDirectionalParticleSpeed:{default:.01,triggerUpdate:!1},linkDirectionalParticleOffset:{default:0,triggerUpdate:!1},linkDirectionalParticleWidth:{default:.5},linkDirectionalParticleColor:{},linkDirectionalParticleResolution:{default:4},linkDirectionalParticleThreeObject:{},forceEngine:{default:"d3"},d3AlphaMin:{default:0},d3AlphaDecay:{default:.0228,triggerUpdate:!1,onChange(e,t){t.d3ForceLayout.alphaDecay(e)}},d3AlphaTarget:{default:0,triggerUpdate:!1,onChange(e,t){t.d3ForceLayout.alphaTarget(e)}},d3VelocityDecay:{default:.4,triggerUpdate:!1,onChange(e,t){t.d3ForceLayout.velocityDecay(e)}},ngraphPhysics:{default:{timeStep:20,gravity:-1.2,theta:.8,springLength:30,springCoefficient:8e-4,dragCoefficient:.02}},warmupTicks:{default:0,triggerUpdate:!1},cooldownTicks:{default:1/0,triggerUpdate:!1},cooldownTime:{default:15e3,triggerUpdate:!1},onLoading:{default:()=>{},triggerUpdate:!1},onFinishLoading:{default:()=>{},triggerUpdate:!1},onUpdate:{default:()=>{},triggerUpdate:!1},onFinishUpdate:{default:()=>{},triggerUpdate:!1},onEngineTick:{default:()=>{},triggerUpdate:!1},onEngineStop:{default:()=>{},triggerUpdate:!1}},methods:{refresh:function(e){return e._flushObjects=!0,e._rerender(),this},d3Force:function(e,t,n){return n===void 0?e.d3ForceLayout.force(t):(e.d3ForceLayout.force(t,n),this)},d3ReheatSimulation:function(e){return e.d3ForceLayout.alpha(1),this.resetCountdown(),this},resetCountdown:function(e){return e.cntTicks=0,e.startTickTime=new Date,e.engineRunning=!0,this},tickFrame:function(e){let t=e.forceEngine!=="ngraph";return e.engineRunning&&e.layout&&n(),i(),r(),this;function n(){++e.cntTicks>e.cooldownTicks||new Date-e.startTickTime>e.cooldownTime||t&&e.d3AlphaMin>0&&e.d3ForceLayout.alpha()<e.d3AlphaMin?(e.engineRunning=!1,e.onEngineStop()):(e.layout[t?"tick":"step"](),e.onEngineTick());let s=Zt(e.nodeThreeObjectExtend);e.nodeDataMapper.entries().forEach(([h,f])=>{if(!f)return;let d=t?h:e.layout.getNodePosition(h[e.nodeId]),m=s(h);(!e.nodePositionUpdate||!e.nodePositionUpdate(m?f.children[0]:f,{x:d.x,y:d.y,z:d.z},h)||m)&&(f.position.x=d.x,f.position.y=d.y||0,f.position.z=d.z||0)});let o=Zt(e.linkWidth),a=Zt(e.linkCurvature),c=Zt(e.linkCurveRotation),l=Zt(e.linkThreeObjectExtend);e.linkDataMapper.entries().forEach(([h,f])=>{if(!f)return;let d=t?h:e.layout.getLinkPosition(e.layout.graph.getLink(h.source,h.target).id),m=d[t?"source":"from"],_=d[t?"target":"to"];if(!m||!_||!m.hasOwnProperty("x")||!_.hasOwnProperty("x"))return;u(h);let g=l(h);if(e.linkPositionUpdate&&e.linkPositionUpdate(g?f.children[1]:f,{start:{x:m.x,y:m.y,z:m.z},end:{x:_.x,y:_.y,z:_.z}},h)&&!g)return;let p=30,b=h.__curve,x=f.children.length?f.children[0]:f;if(x.type==="Line"){if(b){let v=b.getPoints(p);x.geometry.getAttribute("position").array.length!==v.length*3&&x.geometry[Ud]("position",new Ut.BufferAttribute(new Float32Array(v.length*3),3)),x.geometry.setFromPoints(v)}else{let v=x.geometry.getAttribute("position");(!v||!v.array||v.array.length!==6)&&x.geometry[Ud]("position",v=new Ut.BufferAttribute(new Float32Array(6),3)),v.array[0]=m.x,v.array[1]=m.y||0,v.array[2]=m.z||0,v.array[3]=_.x,v.array[4]=_.y||0,v.array[5]=_.z||0,v.needsUpdate=!0}x.geometry.computeBoundingSphere()}else if(x.type==="Mesh")if(b){x.geometry.type.match(/^Tube(Buffer)?Geometry$/)||(x.position.set(0,0,0),x.rotation.set(0,0,0),x.scale.set(1,1,1));let M=Math.ceil(o(h)*10)/10/2,S=new Ut.TubeGeometry(b,p,M,e.linkResolution,!1);x.geometry.dispose(),x.geometry=S}else{if(!x.geometry.type.match(/^Cylinder(Buffer)?Geometry$/)){let P=Math.ceil(o(h)*10)/10/2,T=new Ut.CylinderGeometry(P,P,1,e.linkResolution,1,!1);T[Rh](new Ut.Matrix4().makeTranslation(0,1/2,0)),T[Rh](new Ut.Matrix4().makeRotationX(Math.PI/2)),x.geometry.dispose(),x.geometry=T}let v=new Ut.Vector3(m.x,m.y||0,m.z||0),M=new Ut.Vector3(_.x,_.y||0,_.z||0),S=v.distanceTo(M);x.position.x=v.x,x.position.y=v.y,x.position.z=v.z,x.scale.z=S,x.parent.localToWorld(M),x.lookAt(M)}});function u(h){let f=t?h:e.layout.getLinkPosition(e.layout.graph.getLink(h.source,h.target).id),d=f[t?"source":"from"],m=f[t?"target":"to"];if(!d||!m||!d.hasOwnProperty("x")||!m.hasOwnProperty("x"))return;let _=a(h);if(!_)h.__curve=null;else{let g=new Ut.Vector3(d.x,d.y||0,d.z||0),p=new Ut.Vector3(m.x,m.y||0,m.z||0),b=g.distanceTo(p),x,v=c(h);if(b>0){let M=m.x-d.x,S=m.y-d.y||0,C=new Ut.Vector3().subVectors(p,g),P=C.clone().multiplyScalar(_).cross(M!==0||S!==0?new Ut.Vector3(0,0,1):new Ut.Vector3(0,1,0)).applyAxisAngle(C.normalize(),v).add(new Ut.Vector3().addVectors(g,p).divideScalar(2));x=new Ut.QuadraticBezierCurve3(g,P,p)}else{let M=_*70,S=-v,C=S+Math.PI/2;x=new Ut.CubicBezierCurve3(g,new Ut.Vector3(M*Math.cos(C),M*Math.sin(C),0).add(g),new Ut.Vector3(M*Math.cos(S),M*Math.sin(S),0).add(g),p)}h.__curve=x}}}function i(){let s=Zt(e.linkDirectionalArrowRelPos),o=Zt(e.linkDirectionalArrowLength),a=Zt(e.nodeVal);e.arrowDataMapper.entries().forEach(([c,l])=>{if(!l)return;let u=t?c:e.layout.getLinkPosition(e.layout.graph.getLink(c.source,c.target).id),h=u[t?"source":"from"],f=u[t?"target":"to"];if(!h||!f||!h.hasOwnProperty("x")||!f.hasOwnProperty("x"))return;let d=Math.cbrt(Math.max(0,a(h)||1))*e.nodeRelSize,m=Math.cbrt(Math.max(0,a(f)||1))*e.nodeRelSize,_=o(c),g=s(c),p=c.__curve?C=>c.__curve.getPoint(C):C=>{let P=(T,w,R,V)=>w[T]+(R[T]-w[T])*V||0;return{x:P("x",h,f,C),y:P("y",h,f,C),z:P("z",h,f,C)}},b=c.__curve?c.__curve.getLength():Math.sqrt(["x","y","z"].map(C=>Math.pow((f[C]||0)-(h[C]||0),2)).reduce((C,P)=>C+P,0)),x=d+_+(b-d-m-_)*g,v=p(x/b),M=p((x-_)/b);["x","y","z"].forEach(C=>l.position[C]=M[C]);let S=new Ut.Vector3(...["x","y","z"].map(C=>v[C]));l.parent.localToWorld(S),l.lookAt(S)})}function r(){let s=Zt(e.linkDirectionalParticleSpeed),o=Zt(e.linkDirectionalParticleOffset);e.graphData.links.forEach(a=>{let c=e.particlesDataMapper.getObj(a),l=c&&c.children,u=a.__singleHopPhotonsObj&&a.__singleHopPhotonsObj.children;if((!u||!u.length)&&(!l||!l.length))return;let h=t?a:e.layout.getLinkPosition(e.layout.graph.getLink(a.source,a.target).id),f=h[t?"source":"from"],d=h[t?"target":"to"];if(!f||!d||!f.hasOwnProperty("x")||!d.hasOwnProperty("x"))return;let m=s(a),_=Math.abs(o(a)),g=a.__curve?b=>a.__curve.getPoint(b):b=>{let x=(v,M,S,C)=>M[v]+(S[v]-M[v])*C||0;return{x:x("x",f,d,b),y:x("y",f,d,b),z:x("z",f,d,b)}};[...l||[],...u||[]].forEach((b,x)=>{let v=b.parent.__linkThreeObjType==="singleHopPhotons";if(b.hasOwnProperty("__progressRatio")||(b.__progressRatio=v?m<0?1:0:(x+_)/l.length),b.__progressRatio+=m,b.__progressRatio>=1||b.__progressRatio<0)if(!v)b.__progressRatio=b.__progressRatio%1,b.__progressRatio<0&&b.__progressRatio++;else{b.parent.remove(b),Ev(b);return}let M=b.__progressRatio,S=g(M);b.geometry.type!=="SphereGeometry"&&b.lookAt(S.x,S.y,S.z),["x","y","z"].forEach(C=>b.position[C]=S[C])})})}},emitParticle:function(e,t){if(t&&e.graphData.links.includes(t)){if(!t.__singleHopPhotonsObj){let i=new Ut.Group;i.__linkThreeObjType="singleHopPhotons",t.__singleHopPhotonsObj=i,e.graphScene.add(i)}let n=Zt(e.linkDirectionalParticleThreeObject)(t);if(n&&e.linkDirectionalParticleThreeObject===n&&(n=n.clone()),!n){let i=Zt(e.linkDirectionalParticleWidth),r=Math.ceil(i(t)*10)/10/2,s=e.linkDirectionalParticleResolution,o=new Ut.SphereGeometry(r,s,s),a=Zt(e.linkColor),l=Zt(e.linkDirectionalParticleColor)(t)||a(t)||"#f0f0f0",u=new Ut.Color(ba(l)),h=e.linkOpacity*3,f=new Ut.MeshLambertMaterial({color:u,transparent:!0,opacity:h});n=new Ut.Mesh(o,f)}t.__singleHopPhotonsObj.add(n)}return this},getGraphBbox:function(e,t=()=>!0){if(!e.initialised)return null;let n=(function i(r){let s=[];if(r.geometry){r.geometry.computeBoundingBox();let o=new Ut.Box3;o.copy(r.geometry.boundingBox).applyMatrix4(r.matrixWorld),s.push(o)}return s.concat(...(r.children||[]).filter(o=>!o.hasOwnProperty("__graphObjType")||o.__graphObjType==="node"&&t(o.__data)).map(i))})(e.graphScene);return n.length?Object.assign(...["x","y","z"].map(i=>({[i]:[I_(n,r=>r.min[i]),P_(n,r=>r.max[i])]}))):null}},stateInit:()=>({d3ForceLayout:id().force("link",Kf()).force("charge",rd()).force("center",qf()).force("dagRadial",null).stop(),engineRunning:!1}),init(e,t){t.graphScene=e,t.nodeDataMapper=new jr(e,{objBindAttr:"__threeObj"}),t.linkDataMapper=new jr(e,{objBindAttr:"__lineObj"}),t.arrowDataMapper=new jr(e,{objBindAttr:"__arrowObj"}),t.particlesDataMapper=new jr(e,{objBindAttr:"__photonsObj"})},update(e,t){let n=i=>i.some(r=>t.hasOwnProperty(r));if(e.engineRunning=!1,typeof e.onUpdate=="function"&&e.onUpdate(),e.nodeAutoColorBy!==null&&n(["nodeAutoColorBy","graphData","nodeColor"])&&Tv(e.graphData.nodes,Zt(e.nodeAutoColorBy),e.nodeColor),e.linkAutoColorBy!==null&&n(["linkAutoColorBy","graphData","linkColor"])&&Tv(e.graphData.links,Zt(e.linkAutoColorBy),e.linkColor),e._flushObjects||n(["graphData","nodeThreeObject","nodeThreeObjectExtend","nodeVal","nodeColor","nodeVisibility","nodeRelSize","nodeResolution","nodeOpacity"])){let i=Zt(e.nodeThreeObject),r=Zt(e.nodeThreeObjectExtend),s=Zt(e.nodeVal),o=Zt(e.nodeColor),a=Zt(e.nodeVisibility),c={},l={};(e._flushObjects||n(["nodeThreeObject","nodeThreeObjectExtend"]))&&e.nodeDataMapper.clear(),e.nodeDataMapper.onCreateObj(u=>{let h=i(u),f=r(u);h&&e.nodeThreeObject===h&&(h=h.clone());let d;return h&&!f?d=h:(d=new Ut.Mesh,d.__graphDefaultObj=!0,h&&f&&d.add(h)),d.__graphObjType="node",d}).onUpdateObj((u,h)=>{if(u.__graphDefaultObj){let f=s(h)||1,d=Math.cbrt(f)*e.nodeRelSize,m=e.nodeResolution;(!u.geometry.type.match(/^Sphere(Buffer)?Geometry$/)||u.geometry.parameters.radius!==d||u.geometry.parameters.widthSegments!==m)&&(c.hasOwnProperty(f)||(c[f]=new Ut.SphereGeometry(d,m,m)),u.geometry.dispose(),u.geometry=c[f]);let _=o(h),g=new Ut.Color(ba(_||"#ffffaa")),p=e.nodeOpacity*Fd(_);(u.material.type!=="MeshLambertMaterial"||!u.material.color.equals(g)||u.material.opacity!==p)&&(l.hasOwnProperty(_)||(l[_]=new Ut.MeshLambertMaterial({color:g,transparent:!0,opacity:p})),u.material.dispose(),u.material=l[_])}}).digest(e.graphData.nodes.filter(a))}if(e._flushObjects||n(["graphData","linkThreeObject","linkThreeObjectExtend","linkMaterial","linkColor","linkWidth","linkVisibility","linkResolution","linkOpacity","linkDirectionalArrowLength","linkDirectionalArrowColor","linkDirectionalArrowResolution","linkDirectionalParticles","linkDirectionalParticleWidth","linkDirectionalParticleColor","linkDirectionalParticleResolution","linkDirectionalParticleThreeObject"])){let i=Zt(e.linkThreeObject),r=Zt(e.linkThreeObjectExtend),s=Zt(e.linkMaterial),o=Zt(e.linkVisibility),a=Zt(e.linkColor),c=Zt(e.linkWidth),l={},u={},h={},f=e.graphData.links.filter(o);if((e._flushObjects||n(["linkThreeObject","linkThreeObjectExtend","linkWidth"]))&&e.linkDataMapper.clear(),e.linkDataMapper.onRemoveObj(d=>{let m=d.__data&&d.__data.__singleHopPhotonsObj;m&&(m.parent.remove(m),Ev(m),delete d.__data.__singleHopPhotonsObj)}).onCreateObj(d=>{let m=i(d),_=r(d);m&&e.linkThreeObject===m&&(m=m.clone());let g;if(!m||_)if(!!c(d))g=new Ut.Mesh;else{let x=new Ut.BufferGeometry;x[Ud]("position",new Ut.BufferAttribute(new Float32Array(6),3)),g=new Ut.Line(x)}let p;return m?_?(p=new Ut.Group,p.__graphDefaultObj=!0,p.add(g),p.add(m)):p=m:(p=g,p.__graphDefaultObj=!0),p.renderOrder=10,p.__graphObjType="link",p}).onUpdateObj((d,m)=>{if(d.__graphDefaultObj){let _=d.children.length?d.children[0]:d,g=Math.ceil(c(m)*10)/10,p=!!g;if(p){let x=g/2,v=e.linkResolution;if(!_.geometry.type.match(/^Cylinder(Buffer)?Geometry$/)||_.geometry.parameters.radiusTop!==x||_.geometry.parameters.radialSegments!==v){if(!l.hasOwnProperty(g)){let M=new Ut.CylinderGeometry(x,x,1,v,1,!1);M[Rh](new Ut.Matrix4().makeTranslation(0,1/2,0)),M[Rh](new Ut.Matrix4().makeRotationX(Math.PI/2)),l[g]=M}_.geometry.dispose(),_.geometry=l[g]}}let b=s(m);if(b)_.material=b;else{let x=a(m),v=new Ut.Color(ba(x||"#f0f0f0")),M=e.linkOpacity*Fd(x),S=p?"MeshLambertMaterial":"LineBasicMaterial";if(_.material.type!==S||!_.material.color.equals(v)||_.material.opacity!==M){let C=p?u:h;C.hasOwnProperty(x)||(C[x]=new Ut[S]({color:v,transparent:M<1,opacity:M,depthWrite:M>=1})),_.material.dispose(),_.material=C[x]}}}}).digest(f),e.linkDirectionalArrowLength||t.hasOwnProperty("linkDirectionalArrowLength")){let d=Zt(e.linkDirectionalArrowLength),m=Zt(e.linkDirectionalArrowColor);e.arrowDataMapper.onCreateObj(()=>{let _=new Ut.Mesh(void 0,new Ut.MeshLambertMaterial({transparent:!0}));return _.__linkThreeObjType="arrow",_}).onUpdateObj((_,g)=>{let p=d(g),b=e.linkDirectionalArrowResolution;if(!_.geometry.type.match(/^Cone(Buffer)?Geometry$/)||_.geometry.parameters.height!==p||_.geometry.parameters.radialSegments!==b){let v=new Ut.ConeGeometry(p*.25,p,b);v.translate(0,p/2,0),v.rotateX(Math.PI/2),_.geometry.dispose(),_.geometry=v}let x=m(g)||a(g)||"#f0f0f0";_.material.color=new Ut.Color(ba(x)),_.material.opacity=e.linkOpacity*3*Fd(x)}).digest(f.filter(d))}if(e.linkDirectionalParticles||t.hasOwnProperty("linkDirectionalParticles")){let d=Zt(e.linkDirectionalParticles),m=Zt(e.linkDirectionalParticleWidth),_=Zt(e.linkDirectionalParticleColor),g=Zt(e.linkDirectionalParticleThreeObject),p={},b={};e.particlesDataMapper.onCreateObj(()=>{let x=new Ut.Group;return x.__linkThreeObjType="photons",x.__photonDataMapper=new jr(x),x}).onUpdateObj((x,v)=>{let M=!!x.children.length&&x.children[0],S=g(v),C,P;if(S)C=S.geometry,P=S.material;else{let w=Math.ceil(m(v)*10)/10/2,R=e.linkDirectionalParticleResolution;M&&M.geometry.parameters.radius===w&&M.geometry.parameters.widthSegments===R?C=M.geometry:(b.hasOwnProperty(w)||(b[w]=new Ut.SphereGeometry(w,R,R)),C=b[w]);let V=_(v)||a(v)||"#f0f0f0",N=new Ut.Color(ba(V)),z=e.linkOpacity*3;M&&M.material.color.equals(N)&&M.material.opacity===z?P=M.material:(p.hasOwnProperty(V)||(p[V]=new Ut.MeshLambertMaterial({color:N,transparent:!0,opacity:z})),P=p[V])}M&&(M.geometry!==C&&M.geometry.dispose(),M.material!==P&&M.material.dispose());let T=Math.round(Math.abs(d(v)));x.__photonDataMapper.id(w=>w.idx).onCreateObj(()=>new Ut.Mesh(C,P)).onUpdateObj(w=>{w.geometry=C,w.material=P}).digest([...new Array(T)].map((w,R)=>({idx:R})))}).digest(f.filter(d))}}if(e._flushObjects=!1,n(["graphData","nodeId","linkSource","linkTarget","numDimensions","forceEngine","dagMode","dagNodeFilter","dagLevelDistance"])){e.engineRunning=!1,e.graphData.links.forEach(s=>{s.source=s[e.linkSource],s.target=s[e.linkTarget]});let i=e.forceEngine!=="ngraph",r;if(i){(r=e.d3ForceLayout).stop().alpha(1).numDimensions(e.numDimensions).nodes(e.graphData.nodes);let s=e.d3ForceLayout.force("link");s&&s.id(l=>l[e.nodeId]).links(e.graphData.links);let o=e.dagMode&&hC(e.graphData,l=>l[e.nodeId],{nodeFilter:e.dagNodeFilter,onLoopError:e.onDagError||void 0}),a=Math.max(...Object.values(o||[])),c=e.dagLevelDistance||e.graphData.nodes.length/(a||1)*uC*(["radialin","radialout"].indexOf(e.dagMode)!==-1?.7:1);if(["lr","rl","td","bu","zin","zout"].includes(t.dagMode)){let l=["lr","rl"].includes(t.dagMode)?"fx":["td","bu"].includes(t.dagMode)?"fy":"fz";e.graphData.nodes.filter(e.dagNodeFilter).forEach(u=>delete u[l])}if(["lr","rl","td","bu","zin","zout"].includes(e.dagMode)){let l=["rl","td","zout"].includes(e.dagMode),u=f=>(o[f[e.nodeId]]-a/2)*c*(l?-1:1),h=["lr","rl"].includes(e.dagMode)?"fx":["td","bu"].includes(e.dagMode)?"fy":"fz";e.graphData.nodes.filter(e.dagNodeFilter).forEach(f=>f[h]=u(f))}e.d3ForceLayout.force("dagRadial",["radialin","radialout"].indexOf(e.dagMode)!==-1?sd(l=>{let u=o[l[e.nodeId]]||-1;return(e.dagMode==="radialin"?a-u:u)*c}).strength(l=>e.dagNodeFilter(l)?1:0):null)}else{let s=Av.graph();e.graphData.nodes.forEach(o=>{s.addNode(o[e.nodeId])}),e.graphData.links.forEach(o=>{s.addLink(o.source,o.target)}),r=Av.forcelayout(s,{dimensions:e.numDimensions,...e.ngraphPhysics}),r.graph=s}for(let s=0;s<e.warmupTicks&&!(i&&e.d3AlphaMin>0&&e.d3ForceLayout.alpha()<e.d3AlphaMin);s++)r[i?"tick":"step"]();e.layout=r,this.resetCountdown()}e.engineRunning=!0,e.onFinishUpdate()}});function dC(e,t=Object,n=!1){class i extends t{constructor(...o){super(...o),this.__kapsuleInstance=new e(...n?[this]:[],...o)}}let r=e();return r._destructor?.(),Object.keys(r).forEach(s=>i.prototype[s]=function(...o){let a=this.__kapsuleInstance[s](...o);return a===this.__kapsuleInstance?this:a}),i}var pC=window.THREE?window.THREE:{Group:$e},kd=dC(fC,pC.Group,!0);var Ph=class{constructor(){throw new Error("WebGPU fora do bundle da Teia")}};var Bd={type:"change"},Gd={type:"start"},Wd={type:"end"},Pv=1e-6,le={NONE:-1,ROTATE:0,ZOOM:1,PAN:2,TOUCH_ROTATE:3,TOUCH_ZOOM_PAN:4},Ih=new et,rr=new et,mC=new I,Dh=new I,Vd=new I,Ks=new Ne,Iv=new I,Lh=new I,Hd=new I,Oh=new I,Nh=class extends Sn{constructor(t,n=null){super(t,n),this.screen={left:0,top:0,width:0,height:0},this.rotateSpeed=1,this.zoomSpeed=1.2,this.panSpeed=.3,this.noRotate=!1,this.noZoom=!1,this.noPan=!1,this.staticMoving=!1,this.dynamicDampingFactor=.2,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.keys=["KeyA","KeyS","KeyD"],this.mouseButtons={LEFT:Pe.ROTATE,MIDDLE:Pe.DOLLY,RIGHT:Pe.PAN},this.target=new I,this.state=le.NONE,this.keyState=le.NONE,this._lastPosition=new I,this._lastZoom=1,this._touchZoomDistanceStart=0,this._touchZoomDistanceEnd=0,this._lastAngle=0,this._eye=new I,this._movePrev=new et,this._moveCurr=new et,this._lastAxis=new I,this._zoomStart=new et,this._zoomEnd=new et,this._panStart=new et,this._panEnd=new et,this._pointers=[],this._pointerPositions={},this._onPointerMove=_C.bind(this),this._onPointerDown=gC.bind(this),this._onPointerUp=vC.bind(this),this._onPointerCancel=yC.bind(this),this._onContextMenu=TC.bind(this),this._onMouseWheel=EC.bind(this),this._onKeyDown=bC.bind(this),this._onKeyUp=xC.bind(this),this._onTouchStart=AC.bind(this),this._onTouchMove=CC.bind(this),this._onTouchEnd=RC.bind(this),this._onMouseDown=MC.bind(this),this._onMouseMove=SC.bind(this),this._onMouseUp=wC.bind(this),this._target0=this.target.clone(),this._position0=this.object.position.clone(),this._up0=this.object.up.clone(),this._zoom0=this.object.zoom,n!==null&&(this.connect(n),this.handleResize()),this.update()}connect(t){super.connect(t),window.addEventListener("keydown",this._onKeyDown),window.addEventListener("keyup",this._onKeyUp),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerCancel),this.domElement.addEventListener("wheel",this._onMouseWheel,{passive:!1}),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.style.touchAction="none"}disconnect(){window.removeEventListener("keydown",this._onKeyDown),window.removeEventListener("keyup",this._onKeyUp),this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.removeEventListener("pointermove",this._onPointerMove),this.domElement.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerCancel),this.domElement.removeEventListener("wheel",this._onMouseWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.domElement.style.touchAction="auto"}dispose(){this.disconnect()}handleResize(){let t=this.domElement.getBoundingClientRect(),n=this.domElement.ownerDocument.documentElement;this.screen.left=t.left+window.pageXOffset-n.clientLeft,this.screen.top=t.top+window.pageYOffset-n.clientTop,this.screen.width=t.width,this.screen.height=t.height}update(){this._eye.subVectors(this.object.position,this.target),this.noRotate||this._rotateCamera(),this.noZoom||this._zoomCamera(),this.noPan||this._panCamera(),this.object.position.addVectors(this.target,this._eye),this.object.isPerspectiveCamera?(this._checkDistances(),this.object.lookAt(this.target),this._lastPosition.distanceToSquared(this.object.position)>Pv&&(this.dispatchEvent(Bd),this._lastPosition.copy(this.object.position))):this.object.isOrthographicCamera?(this.object.lookAt(this.target),(this._lastPosition.distanceToSquared(this.object.position)>Pv||this._lastZoom!==this.object.zoom)&&(this.dispatchEvent(Bd),this._lastPosition.copy(this.object.position),this._lastZoom=this.object.zoom)):console.warn("THREE.TrackballControls: Unsupported camera type.")}reset(){this.state=le.NONE,this.keyState=le.NONE,this.target.copy(this._target0),this.object.position.copy(this._position0),this.object.up.copy(this._up0),this.object.zoom=this._zoom0,this.object.updateProjectionMatrix(),this._eye.subVectors(this.object.position,this.target),this.object.lookAt(this.target),this.dispatchEvent(Bd),this._lastPosition.copy(this.object.position),this._lastZoom=this.object.zoom}_panCamera(){if(rr.copy(this._panEnd).sub(this._panStart),rr.lengthSq()){if(this.object.isOrthographicCamera){let t=(this.object.right-this.object.left)/this.object.zoom/this.domElement.clientWidth,n=(this.object.top-this.object.bottom)/this.object.zoom/this.domElement.clientWidth;rr.x*=t,rr.y*=n}rr.multiplyScalar(this._eye.length()*this.panSpeed),Dh.copy(this._eye).cross(this.object.up).setLength(rr.x),Dh.add(mC.copy(this.object.up).setLength(rr.y)),this.object.position.add(Dh),this.target.add(Dh),this.staticMoving?this._panStart.copy(this._panEnd):this._panStart.add(rr.subVectors(this._panEnd,this._panStart).multiplyScalar(this.dynamicDampingFactor))}}_rotateCamera(){Oh.set(this._moveCurr.x-this._movePrev.x,this._moveCurr.y-this._movePrev.y,0);let t=Oh.length();t?(this._eye.copy(this.object.position).sub(this.target),Iv.copy(this._eye).normalize(),Lh.copy(this.object.up).normalize(),Hd.crossVectors(Lh,Iv).normalize(),Lh.setLength(this._moveCurr.y-this._movePrev.y),Hd.setLength(this._moveCurr.x-this._movePrev.x),Oh.copy(Lh.add(Hd)),Vd.crossVectors(Oh,this._eye).normalize(),t*=this.rotateSpeed,Ks.setFromAxisAngle(Vd,t),this._eye.applyQuaternion(Ks),this.object.up.applyQuaternion(Ks),this._lastAxis.copy(Vd),this._lastAngle=t):!this.staticMoving&&this._lastAngle&&(this._lastAngle*=Math.sqrt(1-this.dynamicDampingFactor),this._eye.copy(this.object.position).sub(this.target),Ks.setFromAxisAngle(this._lastAxis,this._lastAngle),this._eye.applyQuaternion(Ks),this.object.up.applyQuaternion(Ks)),this._movePrev.copy(this._moveCurr)}_zoomCamera(){let t;this.state===le.TOUCH_ZOOM_PAN?(t=this._touchZoomDistanceStart/this._touchZoomDistanceEnd,this._touchZoomDistanceStart=this._touchZoomDistanceEnd,this.object.isPerspectiveCamera?this._eye.multiplyScalar(t):this.object.isOrthographicCamera?(this.object.zoom=pe.clamp(this.object.zoom/t,this.minZoom,this.maxZoom),this._lastZoom!==this.object.zoom&&this.object.updateProjectionMatrix()):console.warn("THREE.TrackballControls: Unsupported camera type")):(t=1+(this._zoomEnd.y-this._zoomStart.y)*this.zoomSpeed,t!==1&&t>0&&(this.object.isPerspectiveCamera?this._eye.multiplyScalar(t):this.object.isOrthographicCamera?(this.object.zoom=pe.clamp(this.object.zoom/t,this.minZoom,this.maxZoom),this._lastZoom!==this.object.zoom&&this.object.updateProjectionMatrix()):console.warn("THREE.TrackballControls: Unsupported camera type")),this.staticMoving?this._zoomStart.copy(this._zoomEnd):this._zoomStart.y+=(this._zoomEnd.y-this._zoomStart.y)*this.dynamicDampingFactor)}_getMouseOnScreen(t,n){return Ih.set((t-this.screen.left)/this.screen.width,(n-this.screen.top)/this.screen.height),Ih}_getMouseOnCircle(t,n){return Ih.set((t-this.screen.width*.5-this.screen.left)/(this.screen.width*.5),(this.screen.height+2*(this.screen.top-n))/this.screen.width),Ih}_addPointer(t){this._pointers.push(t)}_removePointer(t){delete this._pointerPositions[t.pointerId];for(let n=0;n<this._pointers.length;n++)if(this._pointers[n].pointerId==t.pointerId){this._pointers.splice(n,1);return}}_trackPointer(t){let n=this._pointerPositions[t.pointerId];n===void 0&&(n=new et,this._pointerPositions[t.pointerId]=n),n.set(t.pageX,t.pageY)}_getSecondPointerPosition(t){let n=t.pointerId===this._pointers[0].pointerId?this._pointers[1]:this._pointers[0];return this._pointerPositions[n.pointerId]}_checkDistances(){(!this.noZoom||!this.noPan)&&(this._eye.lengthSq()>this.maxDistance*this.maxDistance&&(this.object.position.addVectors(this.target,this._eye.setLength(this.maxDistance)),this._zoomStart.copy(this._zoomEnd)),this._eye.lengthSq()<this.minDistance*this.minDistance&&(this.object.position.addVectors(this.target,this._eye.setLength(this.minDistance)),this._zoomStart.copy(this._zoomEnd)))}};function gC(e){this.enabled!==!1&&(this._pointers.length===0&&(this.domElement.setPointerCapture(e.pointerId),this.domElement.addEventListener("pointermove",this._onPointerMove),this.domElement.addEventListener("pointerup",this._onPointerUp)),this._addPointer(e),e.pointerType==="touch"?this._onTouchStart(e):this._onMouseDown(e))}function _C(e){this.enabled!==!1&&(e.pointerType==="touch"?this._onTouchMove(e):this._onMouseMove(e))}function vC(e){this.enabled!==!1&&(e.pointerType==="touch"?this._onTouchEnd(e):this._onMouseUp(),this._removePointer(e),this._pointers.length===0&&(this.domElement.releasePointerCapture(e.pointerId),this.domElement.removeEventListener("pointermove",this._onPointerMove),this.domElement.removeEventListener("pointerup",this._onPointerUp)))}function yC(e){this._removePointer(e)}function xC(){this.enabled!==!1&&(this.keyState=le.NONE,window.addEventListener("keydown",this._onKeyDown))}function bC(e){this.enabled!==!1&&(window.removeEventListener("keydown",this._onKeyDown),this.keyState===le.NONE&&(e.code===this.keys[le.ROTATE]&&!this.noRotate?this.keyState=le.ROTATE:e.code===this.keys[le.ZOOM]&&!this.noZoom?this.keyState=le.ZOOM:e.code===this.keys[le.PAN]&&!this.noPan&&(this.keyState=le.PAN)))}function MC(e){let t;switch(e.button){case 0:t=this.mouseButtons.LEFT;break;case 1:t=this.mouseButtons.MIDDLE;break;case 2:t=this.mouseButtons.RIGHT;break;default:t=-1}switch(t){case Pe.DOLLY:this.state=le.ZOOM;break;case Pe.ROTATE:this.state=le.ROTATE;break;case Pe.PAN:this.state=le.PAN;break;default:this.state=le.NONE}let n=this.keyState!==le.NONE?this.keyState:this.state;n===le.ROTATE&&!this.noRotate?(this._moveCurr.copy(this._getMouseOnCircle(e.pageX,e.pageY)),this._movePrev.copy(this._moveCurr)):n===le.ZOOM&&!this.noZoom?(this._zoomStart.copy(this._getMouseOnScreen(e.pageX,e.pageY)),this._zoomEnd.copy(this._zoomStart)):n===le.PAN&&!this.noPan&&(this._panStart.copy(this._getMouseOnScreen(e.pageX,e.pageY)),this._panEnd.copy(this._panStart)),this.dispatchEvent(Gd)}function SC(e){let t=this.keyState!==le.NONE?this.keyState:this.state;t===le.ROTATE&&!this.noRotate?(this._movePrev.copy(this._moveCurr),this._moveCurr.copy(this._getMouseOnCircle(e.pageX,e.pageY))):t===le.ZOOM&&!this.noZoom?this._zoomEnd.copy(this._getMouseOnScreen(e.pageX,e.pageY)):t===le.PAN&&!this.noPan&&this._panEnd.copy(this._getMouseOnScreen(e.pageX,e.pageY))}function wC(){this.state=le.NONE,this.dispatchEvent(Wd)}function EC(e){if(this.enabled!==!1&&this.noZoom!==!0){switch(e.preventDefault(),e.deltaMode){case 2:this._zoomStart.y-=e.deltaY*.025;break;case 1:this._zoomStart.y-=e.deltaY*.01;break;default:this._zoomStart.y-=e.deltaY*25e-5;break}this.dispatchEvent(Gd),this.dispatchEvent(Wd)}}function TC(e){this.enabled!==!1&&e.preventDefault()}function AC(e){if(this._trackPointer(e),this._pointers.length===1)this.state=le.TOUCH_ROTATE,this._moveCurr.copy(this._getMouseOnCircle(this._pointers[0].pageX,this._pointers[0].pageY)),this._movePrev.copy(this._moveCurr);else{this.state=le.TOUCH_ZOOM_PAN;let t=this._pointers[0].pageX-this._pointers[1].pageX,n=this._pointers[0].pageY-this._pointers[1].pageY;this._touchZoomDistanceEnd=this._touchZoomDistanceStart=Math.sqrt(t*t+n*n);let i=(this._pointers[0].pageX+this._pointers[1].pageX)/2,r=(this._pointers[0].pageY+this._pointers[1].pageY)/2;this._panStart.copy(this._getMouseOnScreen(i,r)),this._panEnd.copy(this._panStart)}this.dispatchEvent(Gd)}function CC(e){if(this._trackPointer(e),this._pointers.length===1)this._movePrev.copy(this._moveCurr),this._moveCurr.copy(this._getMouseOnCircle(e.pageX,e.pageY));else{let t=this._getSecondPointerPosition(e),n=e.pageX-t.x,i=e.pageY-t.y;this._touchZoomDistanceEnd=Math.sqrt(n*n+i*i);let r=(e.pageX+t.x)/2,s=(e.pageY+t.y)/2;this._panEnd.copy(this._getMouseOnScreen(r,s))}}function RC(e){switch(this._pointers.length){case 0:this.state=le.NONE;break;case 1:this.state=le.TOUCH_ROTATE,this._moveCurr.copy(this._getMouseOnCircle(e.pageX,e.pageY)),this._movePrev.copy(this._moveCurr);break;case 2:this.state=le.TOUCH_ZOOM_PAN;for(let t=0;t<this._pointers.length;t++)if(this._pointers[t].pointerId!==e.pointerId){let n=this._pointerPositions[this._pointers[t].pointerId];this._moveCurr.copy(this._getMouseOnCircle(n.x,n.y)),this._movePrev.copy(this._moveCurr);break}break}this.dispatchEvent(Wd)}var Nt={IDLE:Symbol(),ROTATE:Symbol(),PAN:Symbol(),SCALE:Symbol(),FOV:Symbol(),FOCUS:Symbol(),ZROTATE:Symbol(),TOUCH_MULTI:Symbol(),ANIMATION_FOCUS:Symbol(),ANIMATION_ROTATE:Symbol()},me={NONE:Symbol(),ONE_FINGER:Symbol(),ONE_FINGER_SWITCHED:Symbol(),TWO_FINGER:Symbol(),MULT_FINGER:Symbol(),CURSOR:Symbol()},Yt={x:0,y:0},En={camera:new Vt,gizmos:new Vt},Me={type:"change"},ri={type:"start"},Hn={type:"end"},PC=new Ii,Oe=new I,Dv=new Vt,Lv=new Vt,ii=new I,Fh=1e-6,Uh=class extends Sn{constructor(t,n=null,i=null){super(t,n),this.scene=i,this.target=new I,this._currentTarget=new I,this.radiusFactor=.67,this.mouseActions=[],this._mouseOp=null,this._v2_1=new et,this._v3_1=new I,this._v3_2=new I,this._m4_1=new Vt,this._m4_2=new Vt,this._quat=new Ne,this._translationMatrix=new Vt,this._rotationMatrix=new Vt,this._scaleMatrix=new Vt,this._rotationAxis=new I,this._cameraMatrixState=new Vt,this._cameraProjectionState=new Vt,this._fovState=1,this._upState=new I,this._zoomState=1,this._nearPos=0,this._farPos=0,this._gizmoMatrixState=new Vt,this._up0=new I,this._zoom0=1,this._fov0=0,this._initialNear=0,this._nearPos0=0,this._initialFar=0,this._farPos0=0,this._cameraMatrixState0=new Vt,this._gizmoMatrixState0=new Vt,this._target0=new I,this._button=-1,this._touchStart=[],this._touchCurrent=[],this._input=me.NONE,this._switchSensibility=32,this._startFingerDistance=0,this._currentFingerDistance=0,this._startFingerRotation=0,this._currentFingerRotation=0,this._devPxRatio=0,this._downValid=!0,this._nclicks=0,this._downEvents=[],this._downStart=0,this._clickStart=0,this._maxDownTime=250,this._maxInterval=300,this._posThreshold=24,this._movementThreshold=24,this._currentCursorPosition=new I,this._startCursorPosition=new I,this._grid=null,this._gridPosition=new I,this._gizmos=new $e,this._curvePts=128,this._timeStart=-1,this._animationId=-1,this.focusAnimationTime=500,this._timePrev=0,this._timeCurrent=0,this._anglePrev=0,this._angleCurrent=0,this._cursorPosPrev=new I,this._cursorPosCurr=new I,this._wPrev=0,this._wCurr=0,this.adjustNearFar=!1,this.scaleFactor=1.1,this.dampingFactor=25,this.wMax=20,this.enableAnimations=!0,this.enableGrid=!1,this.cursorZoom=!1,this.minFov=5,this.maxFov=90,this.rotateSpeed=1,this.enablePan=!0,this.enableRotate=!0,this.enableZoom=!0,this.enableGizmos=!0,this.enableFocus=!0,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this._tbRadius=1,this._state=Nt.IDLE,this.setCamera(t),this.scene!=null&&this.scene.add(this._gizmos),this.initializeMouseActions(),this._onContextMenu=DC.bind(this),this._onWheel=UC.bind(this),this._onPointerUp=FC.bind(this),this._onPointerMove=NC.bind(this),this._onPointerDown=OC.bind(this),this._onPointerCancel=LC.bind(this),this._onWindowResize=IC.bind(this),n!==null&&this.connect(n)}connect(t){super.connect(t),this.domElement.style.touchAction="none",this._devPxRatio=window.devicePixelRatio,this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.addEventListener("wheel",this._onWheel,{passive:!1}),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerCancel),window.addEventListener("resize",this._onWindowResize)}disconnect(){this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.removeEventListener("pointercancel",this._onPointerCancel),this.domElement.removeEventListener("wheel",this._onWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),window.removeEventListener("pointermove",this._onPointerMove),window.removeEventListener("pointerup",this._onPointerUp),window.removeEventListener("resize",this._onWindowResize)}onSinglePanStart(t,n){if(this.enabled)switch(this.dispatchEvent(ri),this.setCenter(t.clientX,t.clientY),n){case"PAN":if(!this.enablePan)return;this._animationId!=-1&&(cancelAnimationFrame(this._animationId),this._animationId=-1,this._timeStart=-1,this.activateGizmos(!1),this.dispatchEvent(Me)),this.updateTbState(Nt.PAN,!0),this._startCursorPosition.copy(this.unprojectOnTbPlane(this.object,Yt.x,Yt.y,this.domElement)),this.enableGrid&&(this.drawGrid(),this.dispatchEvent(Me));break;case"ROTATE":if(!this.enableRotate)return;this._animationId!=-1&&(cancelAnimationFrame(this._animationId),this._animationId=-1,this._timeStart=-1),this.updateTbState(Nt.ROTATE,!0),this._startCursorPosition.copy(this.unprojectOnTbSurface(this.object,Yt.x,Yt.y,this.domElement,this._tbRadius)),this.activateGizmos(!0),this.enableAnimations&&(this._timePrev=this._timeCurrent=performance.now(),this._angleCurrent=this._anglePrev=0,this._cursorPosPrev.copy(this._startCursorPosition),this._cursorPosCurr.copy(this._cursorPosPrev),this._wCurr=0,this._wPrev=this._wCurr),this.dispatchEvent(Me);break;case"FOV":if(!this.object.isPerspectiveCamera||!this.enableZoom)return;this._animationId!=-1&&(cancelAnimationFrame(this._animationId),this._animationId=-1,this._timeStart=-1,this.activateGizmos(!1),this.dispatchEvent(Me)),this.updateTbState(Nt.FOV,!0),this._startCursorPosition.setY(this.getCursorNDC(Yt.x,Yt.y,this.domElement).y*.5),this._currentCursorPosition.copy(this._startCursorPosition);break;case"ZOOM":if(!this.enableZoom)return;this._animationId!=-1&&(cancelAnimationFrame(this._animationId),this._animationId=-1,this._timeStart=-1,this.activateGizmos(!1),this.dispatchEvent(Me)),this.updateTbState(Nt.SCALE,!0),this._startCursorPosition.setY(this.getCursorNDC(Yt.x,Yt.y,this.domElement).y*.5),this._currentCursorPosition.copy(this._startCursorPosition);break}}onSinglePanMove(t,n){if(this.enabled){let i=n!=this._state;switch(this.setCenter(t.clientX,t.clientY),n){case Nt.PAN:this.enablePan&&(i?(this.dispatchEvent(Hn),this.dispatchEvent(ri),this.updateTbState(n,!0),this._startCursorPosition.copy(this.unprojectOnTbPlane(this.object,Yt.x,Yt.y,this.domElement)),this.enableGrid&&this.drawGrid(),this.activateGizmos(!1)):(this._currentCursorPosition.copy(this.unprojectOnTbPlane(this.object,Yt.x,Yt.y,this.domElement)),this.applyTransformMatrix(this.pan(this._startCursorPosition,this._currentCursorPosition))));break;case Nt.ROTATE:if(this.enableRotate)if(i)this.dispatchEvent(Hn),this.dispatchEvent(ri),this.updateTbState(n,!0),this._startCursorPosition.copy(this.unprojectOnTbSurface(this.object,Yt.x,Yt.y,this.domElement,this._tbRadius)),this.enableGrid&&this.disposeGrid(),this.activateGizmos(!0);else{this._currentCursorPosition.copy(this.unprojectOnTbSurface(this.object,Yt.x,Yt.y,this.domElement,this._tbRadius));let r=this._startCursorPosition.distanceTo(this._currentCursorPosition),s=this._startCursorPosition.angleTo(this._currentCursorPosition),o=Math.max(r/this._tbRadius,s)*this.rotateSpeed;this.applyTransformMatrix(this.rotate(this.calculateRotationAxis(this._startCursorPosition,this._currentCursorPosition),o)),this.enableAnimations&&(this._timePrev=this._timeCurrent,this._timeCurrent=performance.now(),this._anglePrev=this._angleCurrent,this._angleCurrent=o,this._cursorPosPrev.copy(this._cursorPosCurr),this._cursorPosCurr.copy(this._currentCursorPosition),this._wPrev=this._wCurr,this._wCurr=this.calculateAngularSpeed(this._anglePrev,this._angleCurrent,this._timePrev,this._timeCurrent))}break;case Nt.SCALE:if(this.enableZoom)if(i)this.dispatchEvent(Hn),this.dispatchEvent(ri),this.updateTbState(n,!0),this._startCursorPosition.setY(this.getCursorNDC(Yt.x,Yt.y,this.domElement).y*.5),this._currentCursorPosition.copy(this._startCursorPosition),this.enableGrid&&this.disposeGrid(),this.activateGizmos(!1);else{this._currentCursorPosition.setY(this.getCursorNDC(Yt.x,Yt.y,this.domElement).y*.5);let s=this._currentCursorPosition.y-this._startCursorPosition.y,o=1;s<0?o=1/Math.pow(this.scaleFactor,-s*8):s>0&&(o=Math.pow(this.scaleFactor,s*8)),this._v3_1.setFromMatrixPosition(this._gizmoMatrixState),this.applyTransformMatrix(this.scale(o,this._v3_1))}break;case Nt.FOV:if(this.enableZoom&&this.object.isPerspectiveCamera)if(i)this.dispatchEvent(Hn),this.dispatchEvent(ri),this.updateTbState(n,!0),this._startCursorPosition.setY(this.getCursorNDC(Yt.x,Yt.y,this.domElement).y*.5),this._currentCursorPosition.copy(this._startCursorPosition),this.enableGrid&&this.disposeGrid(),this.activateGizmos(!1);else{this._currentCursorPosition.setY(this.getCursorNDC(Yt.x,Yt.y,this.domElement).y*.5);let s=this._currentCursorPosition.y-this._startCursorPosition.y,o=1;s<0?o=1/Math.pow(this.scaleFactor,-s*8):s>0&&(o=Math.pow(this.scaleFactor,s*8)),this._v3_1.setFromMatrixPosition(this._cameraMatrixState);let a=this._v3_1.distanceTo(this._gizmos.position),c=a/o;c=pe.clamp(c,this.minDistance,this.maxDistance);let l=a*Math.tan(pe.DEG2RAD*this._fovState*.5),u=pe.RAD2DEG*(Math.atan(l/c)*2);u=pe.clamp(u,this.minFov,this.maxFov);let h=l/Math.tan(pe.DEG2RAD*(u/2));o=a/h,this._v3_2.setFromMatrixPosition(this._gizmoMatrixState),this.setFov(u),this.applyTransformMatrix(this.scale(o,this._v3_2,!1)),Oe.copy(this._gizmos.position).sub(this.object.position).normalize().multiplyScalar(h/a),this._m4_1.makeTranslation(Oe.x,Oe.y,Oe.z)}break}this.dispatchEvent(Me)}}onSinglePanEnd(){if(this._state==Nt.ROTATE){if(!this.enableRotate)return;if(this.enableAnimations)if(performance.now()-this._timeCurrent<120){let n=Math.abs((this._wPrev+this._wCurr)/2),i=this;this._animationId=window.requestAnimationFrame(function(r){i.updateTbState(Nt.ANIMATION_ROTATE,!0);let s=i.calculateRotationAxis(i._cursorPosPrev,i._cursorPosCurr);i.onRotationAnim(r,s,Math.min(n,i.wMax))})}else this.updateTbState(Nt.IDLE,!1),this.activateGizmos(!1),this.dispatchEvent(Me);else this.updateTbState(Nt.IDLE,!1),this.activateGizmos(!1),this.dispatchEvent(Me)}else(this._state==Nt.PAN||this._state==Nt.IDLE)&&(this.updateTbState(Nt.IDLE,!1),this.enableGrid&&this.disposeGrid(),this.activateGizmos(!1),this.dispatchEvent(Me));this.dispatchEvent(Hn)}onDoubleTap(t){if(this.enabled&&this.enablePan&&this.enableFocus&&this.scene!=null){this.dispatchEvent(ri),this.setCenter(t.clientX,t.clientY);let n=this.unprojectOnObj(this.getCursorNDC(Yt.x,Yt.y,this.domElement),this.object);if(n!=null&&this.enableAnimations){let i=this;this._animationId!=-1&&window.cancelAnimationFrame(this._animationId),this._timeStart=-1,this._animationId=window.requestAnimationFrame(function(r){i.updateTbState(Nt.ANIMATION_FOCUS,!0),i.onFocusAnim(r,n,i._cameraMatrixState,i._gizmoMatrixState)})}else n!=null&&!this.enableAnimations&&(this.updateTbState(Nt.FOCUS,!0),this.focus(n,this.scaleFactor),this.updateTbState(Nt.IDLE,!1),this.dispatchEvent(Me))}this.dispatchEvent(Hn)}onDoublePanStart(){this.enabled&&this.enablePan&&(this.dispatchEvent(ri),this.updateTbState(Nt.PAN,!0),this.setCenter((this._touchCurrent[0].clientX+this._touchCurrent[1].clientX)/2,(this._touchCurrent[0].clientY+this._touchCurrent[1].clientY)/2),this._startCursorPosition.copy(this.unprojectOnTbPlane(this.object,Yt.x,Yt.y,this.domElement,!0)),this._currentCursorPosition.copy(this._startCursorPosition),this.activateGizmos(!1))}onDoublePanMove(){this.enabled&&this.enablePan&&(this.setCenter((this._touchCurrent[0].clientX+this._touchCurrent[1].clientX)/2,(this._touchCurrent[0].clientY+this._touchCurrent[1].clientY)/2),this._state!=Nt.PAN&&(this.updateTbState(Nt.PAN,!0),this._startCursorPosition.copy(this._currentCursorPosition)),this._currentCursorPosition.copy(this.unprojectOnTbPlane(this.object,Yt.x,Yt.y,this.domElement,!0)),this.applyTransformMatrix(this.pan(this._startCursorPosition,this._currentCursorPosition,!0)),this.dispatchEvent(Me))}onDoublePanEnd(){this.updateTbState(Nt.IDLE,!1),this.dispatchEvent(Hn)}onRotateStart(){this.enabled&&this.enableRotate&&(this.dispatchEvent(ri),this.updateTbState(Nt.ZROTATE,!0),this._startFingerRotation=this.getAngle(this._touchCurrent[1],this._touchCurrent[0])+this.getAngle(this._touchStart[1],this._touchStart[0]),this._currentFingerRotation=this._startFingerRotation,this.object.getWorldDirection(this._rotationAxis),!this.enablePan&&!this.enableZoom&&this.activateGizmos(!0))}onRotateMove(){if(this.enabled&&this.enableRotate){this.setCenter((this._touchCurrent[0].clientX+this._touchCurrent[1].clientX)/2,(this._touchCurrent[0].clientY+this._touchCurrent[1].clientY)/2);let t;this._state!=Nt.ZROTATE&&(this.updateTbState(Nt.ZROTATE,!0),this._startFingerRotation=this._currentFingerRotation),this._currentFingerRotation=this.getAngle(this._touchCurrent[1],this._touchCurrent[0])+this.getAngle(this._touchStart[1],this._touchStart[0]),this.enablePan?(this._v3_2.setFromMatrixPosition(this._gizmoMatrixState),t=this.unprojectOnTbPlane(this.object,Yt.x,Yt.y,this.domElement).applyQuaternion(this.object.quaternion).multiplyScalar(1/this.object.zoom).add(this._v3_2)):t=new I().setFromMatrixPosition(this._gizmoMatrixState);let n=pe.DEG2RAD*(this._startFingerRotation-this._currentFingerRotation);this.applyTransformMatrix(this.zRotate(t,n)),this.dispatchEvent(Me)}}onRotateEnd(){this.updateTbState(Nt.IDLE,!1),this.activateGizmos(!1),this.dispatchEvent(Hn)}onPinchStart(){this.enabled&&this.enableZoom&&(this.dispatchEvent(ri),this.updateTbState(Nt.SCALE,!0),this._startFingerDistance=this.calculatePointersDistance(this._touchCurrent[0],this._touchCurrent[1]),this._currentFingerDistance=this._startFingerDistance,this.activateGizmos(!1))}onPinchMove(){if(this.enabled&&this.enableZoom){this.setCenter((this._touchCurrent[0].clientX+this._touchCurrent[1].clientX)/2,(this._touchCurrent[0].clientY+this._touchCurrent[1].clientY)/2);let t=12;this._state!=Nt.SCALE&&(this._startFingerDistance=this._currentFingerDistance,this.updateTbState(Nt.SCALE,!0)),this._currentFingerDistance=Math.max(this.calculatePointersDistance(this._touchCurrent[0],this._touchCurrent[1]),t*this._devPxRatio);let n=this._currentFingerDistance/this._startFingerDistance,i;this.enablePan?this.object.isOrthographicCamera?i=this.unprojectOnTbPlane(this.object,Yt.x,Yt.y,this.domElement).applyQuaternion(this.object.quaternion).multiplyScalar(1/this.object.zoom).add(this._gizmos.position):this.object.isPerspectiveCamera&&(i=this.unprojectOnTbPlane(this.object,Yt.x,Yt.y,this.domElement).applyQuaternion(this.object.quaternion).add(this._gizmos.position)):i=this._gizmos.position,this.applyTransformMatrix(this.scale(n,i)),this.dispatchEvent(Me)}}onPinchEnd(){this.updateTbState(Nt.IDLE,!1),this.dispatchEvent(Hn)}onTriplePanStart(){if(this.enabled&&this.enableZoom){this.dispatchEvent(ri),this.updateTbState(Nt.SCALE,!0);let t=0,n=0,i=this._touchCurrent.length;for(let r=0;r<i;r++)t+=this._touchCurrent[r].clientX,n+=this._touchCurrent[r].clientY;this.setCenter(t/i,n/i),this._startCursorPosition.setY(this.getCursorNDC(Yt.x,Yt.y,this.domElement).y*.5),this._currentCursorPosition.copy(this._startCursorPosition)}}onTriplePanMove(){if(this.enabled&&this.enableZoom){let t=0,n=0,i=this._touchCurrent.length;for(let f=0;f<i;f++)t+=this._touchCurrent[f].clientX,n+=this._touchCurrent[f].clientY;this.setCenter(t/i,n/i);let r=8;this._currentCursorPosition.setY(this.getCursorNDC(Yt.x,Yt.y,this.domElement).y*.5);let s=this._currentCursorPosition.y-this._startCursorPosition.y,o=1;s<0?o=1/Math.pow(this.scaleFactor,-s*r):s>0&&(o=Math.pow(this.scaleFactor,s*r)),this._v3_1.setFromMatrixPosition(this._cameraMatrixState);let a=this._v3_1.distanceTo(this._gizmos.position),c=a/o;c=pe.clamp(c,this.minDistance,this.maxDistance);let l=a*Math.tan(pe.DEG2RAD*this._fovState*.5),u=pe.RAD2DEG*(Math.atan(l/c)*2);u=pe.clamp(u,this.minFov,this.maxFov);let h=l/Math.tan(pe.DEG2RAD*(u/2));o=a/h,this._v3_2.setFromMatrixPosition(this._gizmoMatrixState),this.setFov(u),this.applyTransformMatrix(this.scale(o,this._v3_2,!1)),Oe.copy(this._gizmos.position).sub(this.object.position).normalize().multiplyScalar(h/a),this._m4_1.makeTranslation(Oe.x,Oe.y,Oe.z),this.dispatchEvent(Me)}}onTriplePanEnd(){this.updateTbState(Nt.IDLE,!1),this.dispatchEvent(Hn)}setCenter(t,n){Yt.x=t,Yt.y=n}initializeMouseActions(){this.setMouseAction("PAN",0,"CTRL"),this.setMouseAction("PAN",2),this.setMouseAction("ROTATE",0),this.setMouseAction("ZOOM","WHEEL"),this.setMouseAction("ZOOM",1),this.setMouseAction("FOV","WHEEL","SHIFT"),this.setMouseAction("FOV",1,"SHIFT")}compareMouseAction(t,n){return t.operation==n.operation?t.mouse==n.mouse&&t.key==n.key:!1}setMouseAction(t,n,i=null){let r=["PAN","ROTATE","ZOOM","FOV"],s=[0,1,2,"WHEEL"],o=["CTRL","SHIFT",null],a;if(!r.includes(t)||!s.includes(n)||!o.includes(i)||n=="WHEEL"&&t!="ZOOM"&&t!="FOV")return!1;switch(t){case"PAN":a=Nt.PAN;break;case"ROTATE":a=Nt.ROTATE;break;case"ZOOM":a=Nt.SCALE;break;case"FOV":a=Nt.FOV;break}let c={operation:t,mouse:n,key:i,state:a};for(let l=0;l<this.mouseActions.length;l++)if(this.mouseActions[l].mouse==c.mouse&&this.mouseActions[l].key==c.key)return this.mouseActions.splice(l,1,c),!0;return this.mouseActions.push(c),!0}unsetMouseAction(t,n=null){for(let i=0;i<this.mouseActions.length;i++)if(this.mouseActions[i].mouse==t&&this.mouseActions[i].key==n)return this.mouseActions.splice(i,1),!0;return!1}getOpFromAction(t,n){let i;for(let r=0;r<this.mouseActions.length;r++)if(i=this.mouseActions[r],i.mouse==t&&i.key==n)return i.operation;if(n!=null){for(let r=0;r<this.mouseActions.length;r++)if(i=this.mouseActions[r],i.mouse==t&&i.key==null)return i.operation}return null}getOpStateFromAction(t,n){let i;for(let r=0;r<this.mouseActions.length;r++)if(i=this.mouseActions[r],i.mouse==t&&i.key==n)return i.state;if(n!=null){for(let r=0;r<this.mouseActions.length;r++)if(i=this.mouseActions[r],i.mouse==t&&i.key==null)return i.state}return null}getAngle(t,n){return Math.atan2(n.clientY-t.clientY,n.clientX-t.clientX)*180/Math.PI}updateTouchEvent(t){for(let n=0;n<this._touchCurrent.length;n++)if(this._touchCurrent[n].pointerId==t.pointerId){this._touchCurrent.splice(n,1,t);break}}applyTransformMatrix(t){if(t.camera!=null&&(this._m4_1.copy(this._cameraMatrixState).premultiply(t.camera),this._m4_1.decompose(this.object.position,this.object.quaternion,this.object.scale),this.object.updateMatrix(),(this._state==Nt.ROTATE||this._state==Nt.ZROTATE||this._state==Nt.ANIMATION_ROTATE)&&this.object.up.copy(this._upState).applyQuaternion(this.object.quaternion)),t.gizmos!=null&&(this._m4_1.copy(this._gizmoMatrixState).premultiply(t.gizmos),this._m4_1.decompose(this._gizmos.position,this._gizmos.quaternion,this._gizmos.scale),this._gizmos.updateMatrix()),this._state==Nt.SCALE||this._state==Nt.FOCUS||this._state==Nt.ANIMATION_FOCUS)if(this._tbRadius=this.calculateTbRadius(this.object),this.adjustNearFar){let n=this.object.position.distanceTo(this._gizmos.position),i=new fn;i.setFromObject(this._gizmos);let r=new oi;i.getBoundingSphere(r);let s=Math.max(this._nearPos0,r.radius+r.center.length()),o=n-this._initialNear,a=Math.min(s,o);this.object.near=n-a;let c=Math.min(this._farPos0,-r.radius+r.center.length()),l=n-this._initialFar,u=Math.min(c,l);this.object.far=n-u,this.object.updateProjectionMatrix()}else{let n=!1;this.object.near!=this._initialNear&&(this.object.near=this._initialNear,n=!0),this.object.far!=this._initialFar&&(this.object.far=this._initialFar,n=!0),n&&this.object.updateProjectionMatrix()}}calculateAngularSpeed(t,n,i,r){let s=n-t,o=(r-i)/1e3;return o==0?0:s/o}calculatePointersDistance(t,n){return Math.sqrt(Math.pow(n.clientX-t.clientX,2)+Math.pow(n.clientY-t.clientY,2))}calculateRotationAxis(t,n){return this._rotationMatrix.extractRotation(this._cameraMatrixState),this._quat.setFromRotationMatrix(this._rotationMatrix),this._rotationAxis.crossVectors(t,n).applyQuaternion(this._quat),this._rotationAxis.normalize().clone()}calculateTbRadius(t){let n=t.position.distanceTo(this._gizmos.position);if(t.type=="PerspectiveCamera"){let i=pe.DEG2RAD*t.fov*.5,r=Math.atan(t.aspect*Math.tan(i));return Math.tan(Math.min(i,r))*n*this.radiusFactor}else if(t.type=="OrthographicCamera")return Math.min(t.top,t.right)*this.radiusFactor}focus(t,n,i=1){Oe.copy(t).sub(this._gizmos.position).multiplyScalar(i),this._translationMatrix.makeTranslation(Oe.x,Oe.y,Oe.z),Dv.copy(this._gizmoMatrixState),this._gizmoMatrixState.premultiply(this._translationMatrix),this._gizmoMatrixState.decompose(this._gizmos.position,this._gizmos.quaternion,this._gizmos.scale),Lv.copy(this._cameraMatrixState),this._cameraMatrixState.premultiply(this._translationMatrix),this._cameraMatrixState.decompose(this.object.position,this.object.quaternion,this.object.scale),this.enableZoom&&this.applyTransformMatrix(this.scale(n,this._gizmos.position)),this._gizmoMatrixState.copy(Dv),this._cameraMatrixState.copy(Lv)}drawGrid(){if(this.scene!=null){let i,r,s,o;if(this.object.isOrthographicCamera){let a=this.object.right-this.object.left,c=this.object.bottom-this.object.top;s=Math.max(a,c),o=s/20,i=s/this.object.zoom*3,r=i/o*this.object.zoom}else if(this.object.isPerspectiveCamera){let a=this.object.position.distanceTo(this._gizmos.position),c=pe.DEG2RAD*this.object.fov*.5,l=Math.atan(this.object.aspect*Math.tan(c));s=Math.tan(Math.max(c,l))*a*2,o=s/20,i=s*3,r=i/o}this._grid==null&&(this._grid=new Ko(i,r,8947848,8947848),this._grid.position.copy(this._gizmos.position),this._gridPosition.copy(this._grid.position),this._grid.quaternion.copy(this.object.quaternion),this._grid.rotateX(Math.PI*.5),this.scene.add(this._grid))}}dispose(){this._animationId!=-1&&window.cancelAnimationFrame(this._animationId),this.disconnect(),this.scene!==null&&this.scene.remove(this._gizmos),this.disposeGrid()}disposeGrid(){this._grid!=null&&this.scene!=null&&(this.scene.remove(this._grid),this._grid=null)}easeOutCubic(t){return 1-Math.pow(1-t,3)}activateGizmos(t){let n=this._gizmos.children[0],i=this._gizmos.children[1],r=this._gizmos.children[2];t?(n.material.setValues({opacity:1}),i.material.setValues({opacity:1}),r.material.setValues({opacity:1})):(n.material.setValues({opacity:.6}),i.material.setValues({opacity:.6}),r.material.setValues({opacity:.6}))}getCursorNDC(t,n,i){let r=i.getBoundingClientRect();return this._v2_1.setX((t-r.left)/r.width*2-1),this._v2_1.setY((r.bottom-n)/r.height*2-1),this._v2_1.clone()}getCursorPosition(t,n,i){return this._v2_1.copy(this.getCursorNDC(t,n,i)),this._v2_1.x*=(this.object.right-this.object.left)*.5,this._v2_1.y*=(this.object.top-this.object.bottom)*.5,this._v2_1.clone()}setCamera(t){t.lookAt(this.target),t.updateMatrix(),t.type=="PerspectiveCamera"&&(this._fov0=t.fov,this._fovState=t.fov),this._cameraMatrixState0.copy(t.matrix),this._cameraMatrixState.copy(this._cameraMatrixState0),this._cameraProjectionState.copy(t.projectionMatrix),this._zoom0=t.zoom,this._zoomState=this._zoom0,this._initialNear=t.near,this._nearPos0=t.position.distanceTo(this.target)-t.near,this._nearPos=this._initialNear,this._initialFar=t.far,this._farPos0=t.position.distanceTo(this.target)-t.far,this._farPos=this._initialFar,this._up0.copy(t.up),this._upState.copy(t.up),this.object=t,this.object.updateProjectionMatrix(),this._tbRadius=this.calculateTbRadius(t),this.makeGizmos(this.target,this._tbRadius)}setGizmosVisible(t){this._gizmos.visible=t,this.dispatchEvent(Me)}setTbRadius(t){this.radiusFactor=t,this._tbRadius=this.calculateTbRadius(this.object);let i=new hi(0,0,this._tbRadius,this._tbRadius).getPoints(this._curvePts),r=new ve().setFromPoints(i);for(let s in this._gizmos.children)this._gizmos.children[s].geometry=r;this.dispatchEvent(Me)}makeGizmos(t,n){let r=new hi(0,0,n,n).getPoints(this._curvePts),s=new ve().setFromPoints(r),o=new Zn({color:16744576,fog:!1,transparent:!0,opacity:.6}),a=new Zn({color:8454016,fog:!1,transparent:!0,opacity:.6}),c=new Zn({color:8421631,fog:!1,transparent:!0,opacity:.6}),l=new li(s,o),u=new li(s,a),h=new li(s,c),f=Math.PI*.5;if(l.rotation.x=f,u.rotation.y=f,this._gizmoMatrixState0.identity().setPosition(t),this._gizmoMatrixState.copy(this._gizmoMatrixState0),this.object.zoom!==1){let d=1/this.object.zoom;this._scaleMatrix.makeScale(d,d,d),this._translationMatrix.makeTranslation(-t.x,-t.y,-t.z),this._gizmoMatrixState.premultiply(this._translationMatrix).premultiply(this._scaleMatrix),this._translationMatrix.makeTranslation(t.x,t.y,t.z),this._gizmoMatrixState.premultiply(this._translationMatrix)}this._gizmoMatrixState.decompose(this._gizmos.position,this._gizmos.quaternion,this._gizmos.scale),this._gizmos.traverse(function(d){d.isLine&&(d.geometry.dispose(),d.material.dispose())}),this._gizmos.clear(),this._gizmos.add(l),this._gizmos.add(u),this._gizmos.add(h)}onFocusAnim(t,n,i,r){if(this._timeStart==-1&&(this._timeStart=t),this._state==Nt.ANIMATION_FOCUS){let o=(t-this._timeStart)/this.focusAnimationTime;if(this._gizmoMatrixState.copy(r),o>=1)this._gizmoMatrixState.decompose(this._gizmos.position,this._gizmos.quaternion,this._gizmos.scale),this.focus(n,this.scaleFactor),this._timeStart=-1,this.updateTbState(Nt.IDLE,!1),this.activateGizmos(!1),this.dispatchEvent(Me);else{let a=this.easeOutCubic(o),c=1-a+this.scaleFactor*a;this._gizmoMatrixState.decompose(this._gizmos.position,this._gizmos.quaternion,this._gizmos.scale),this.focus(n,c,a),this.dispatchEvent(Me);let l=this;this._animationId=window.requestAnimationFrame(function(u){l.onFocusAnim(u,n,i,r.clone())})}}else this._animationId=-1,this._timeStart=-1}onRotationAnim(t,n,i){if(this._timeStart==-1&&(this._anglePrev=0,this._angleCurrent=0,this._timeStart=t),this._state==Nt.ANIMATION_ROTATE){let r=(t-this._timeStart)/1e3;if(i+-this.dampingFactor*r>0){this._angleCurrent=.5*-this.dampingFactor*Math.pow(r,2)+i*r+0,this.applyTransformMatrix(this.rotate(n,this._angleCurrent)),this.dispatchEvent(Me);let o=this;this._animationId=window.requestAnimationFrame(function(a){o.onRotationAnim(a,n,i)})}else this._animationId=-1,this._timeStart=-1,this.updateTbState(Nt.IDLE,!1),this.activateGizmos(!1),this.dispatchEvent(Me)}else this._animationId=-1,this._timeStart=-1,this._state!=Nt.ROTATE&&(this.activateGizmos(!1),this.dispatchEvent(Me))}pan(t,n,i=!1){let r=t.clone().sub(n);if(this.object.isOrthographicCamera)r.multiplyScalar(1/this.object.zoom);else if(this.object.isPerspectiveCamera&&i){this._v3_1.setFromMatrixPosition(this._cameraMatrixState0),this._v3_2.setFromMatrixPosition(this._gizmoMatrixState0);let s=this._v3_1.distanceTo(this._v3_2)/this.object.position.distanceTo(this._gizmos.position);r.multiplyScalar(1/s)}return this._v3_1.set(r.x,r.y,0).applyQuaternion(this.object.quaternion),this._m4_1.makeTranslation(this._v3_1.x,this._v3_1.y,this._v3_1.z),this.setTransformationMatrices(this._m4_1,this._m4_1),En}reset(){this.target.copy(this._target0),this.object.zoom=this._zoom0,this.object.isPerspectiveCamera&&(this.object.fov=this._fov0),this.object.near=this._nearPos,this.object.far=this._farPos,this._cameraMatrixState.copy(this._cameraMatrixState0),this._cameraMatrixState.decompose(this.object.position,this.object.quaternion,this.object.scale),this.object.up.copy(this._up0),this.object.updateMatrix(),this.object.updateProjectionMatrix(),this._gizmoMatrixState.copy(this._gizmoMatrixState0),this._gizmoMatrixState0.decompose(this._gizmos.position,this._gizmos.quaternion,this._gizmos.scale),this._gizmos.updateMatrix(),this._tbRadius=this.calculateTbRadius(this.object),this.makeGizmos(this._gizmos.position,this._tbRadius),this.object.lookAt(this._gizmos.position),this.updateTbState(Nt.IDLE,!1),this.dispatchEvent(Me)}rotate(t,n){let i=this._gizmos.position;return this._translationMatrix.makeTranslation(-i.x,-i.y,-i.z),this._rotationMatrix.makeRotationAxis(t,-n),this._m4_1.makeTranslation(i.x,i.y,i.z),this._m4_1.multiply(this._rotationMatrix),this._m4_1.multiply(this._translationMatrix),this.setTransformationMatrices(this._m4_1),En}copyState(){let t;this.object.isOrthographicCamera?t=JSON.stringify({arcballState:{cameraFar:this.object.far,cameraMatrix:this.object.matrix,cameraNear:this.object.near,cameraUp:this.object.up,cameraZoom:this.object.zoom,gizmoMatrix:this._gizmos.matrix,target:this.target}}):this.object.isPerspectiveCamera&&(t=JSON.stringify({arcballState:{cameraFar:this.object.far,cameraFov:this.object.fov,cameraMatrix:this.object.matrix,cameraNear:this.object.near,cameraUp:this.object.up,cameraZoom:this.object.zoom,gizmoMatrix:this._gizmos.matrix,target:this.target}})),navigator.clipboard.writeText(t)}pasteState(){let t=this;navigator.clipboard.readText().then(function(i){t.setStateFromJSON(i)})}saveState(){this.object.updateMatrix(),this._gizmos.updateMatrix(),this._target0.copy(this.target),this._cameraMatrixState0.copy(this.object.matrix),this._gizmoMatrixState0.copy(this._gizmos.matrix),this._nearPos=this.object.near,this._farPos=this.object.far,this._zoom0=this.object.zoom,this._up0.copy(this.object.up),this.object.isPerspectiveCamera&&(this._fov0=this.object.fov)}scale(t,n,i=!0){ii.copy(n);let r=1/t;if(this.object.isOrthographicCamera){this.object.zoom=this._zoomState,this.object.zoom*=t,this.object.zoom>this.maxZoom?(this.object.zoom=this.maxZoom,r=this._zoomState/this.maxZoom):this.object.zoom<this.minZoom&&(this.object.zoom=this.minZoom,r=this._zoomState/this.minZoom),this.object.updateProjectionMatrix(),this._v3_1.setFromMatrixPosition(this._gizmoMatrixState),this._scaleMatrix.makeScale(r,r,r),this._translationMatrix.makeTranslation(-this._v3_1.x,-this._v3_1.y,-this._v3_1.z),this._m4_2.makeTranslation(this._v3_1.x,this._v3_1.y,this._v3_1.z).multiply(this._scaleMatrix),this._m4_2.multiply(this._translationMatrix),ii.sub(this._v3_1);let s=ii.clone().multiplyScalar(r);return ii.sub(s),this._m4_1.makeTranslation(ii.x,ii.y,ii.z),this._m4_2.premultiply(this._m4_1),this.setTransformationMatrices(this._m4_1,this._m4_2),En}else if(this.object.isPerspectiveCamera){this._v3_1.setFromMatrixPosition(this._cameraMatrixState),this._v3_2.setFromMatrixPosition(this._gizmoMatrixState);let s=this._v3_1.distanceTo(ii),o=s-s*r,a=s-o;if(a<this.minDistance?(r=this.minDistance/s,o=s-s*r):a>this.maxDistance&&(r=this.maxDistance/s,o=s-s*r),Oe.copy(ii).sub(this._v3_1).normalize().multiplyScalar(o),this._m4_1.makeTranslation(Oe.x,Oe.y,Oe.z),i){let c=this._v3_2;s=c.distanceTo(ii),o=s-s*r,Oe.copy(ii).sub(this._v3_2).normalize().multiplyScalar(o),this._translationMatrix.makeTranslation(c.x,c.y,c.z),this._scaleMatrix.makeScale(r,r,r),this._m4_2.makeTranslation(Oe.x,Oe.y,Oe.z).multiply(this._translationMatrix),this._m4_2.multiply(this._scaleMatrix),this._translationMatrix.makeTranslation(-c.x,-c.y,-c.z),this._m4_2.multiply(this._translationMatrix),this.setTransformationMatrices(this._m4_1,this._m4_2)}else this.setTransformationMatrices(this._m4_1);return En}}setFov(t){this.object.isPerspectiveCamera&&(this.object.fov=pe.clamp(t,this.minFov,this.maxFov),this.object.updateProjectionMatrix())}setTransformationMatrices(t=null,n=null){t!=null?En.camera!=null?En.camera.copy(t):En.camera=t.clone():En.camera=null,n!=null?En.gizmos!=null?En.gizmos.copy(n):En.gizmos=n.clone():En.gizmos=null}zRotate(t,n){return this._rotationMatrix.makeRotationAxis(this._rotationAxis,n),this._translationMatrix.makeTranslation(-t.x,-t.y,-t.z),this._m4_1.makeTranslation(t.x,t.y,t.z),this._m4_1.multiply(this._rotationMatrix),this._m4_1.multiply(this._translationMatrix),this._v3_1.setFromMatrixPosition(this._gizmoMatrixState).sub(t),this._v3_2.copy(this._v3_1).applyAxisAngle(this._rotationAxis,n),this._v3_2.sub(this._v3_1),this._m4_2.makeTranslation(this._v3_2.x,this._v3_2.y,this._v3_2.z),this.setTransformationMatrices(this._m4_1,this._m4_2),En}getRaycaster(){return PC}unprojectOnObj(t,n){let i=this.getRaycaster();i.near=n.near,i.far=n.far,i.setFromCamera(t,n);let r=i.intersectObjects(this.scene.children,!0);for(let s=0;s<r.length;s++)if(r[s].object.uuid!=this._gizmos.uuid&&r[s].face!=null)return r[s].point.clone();return null}unprojectOnTbSurface(t,n,i,r,s){if(t.type=="OrthographicCamera"){this._v2_1.copy(this.getCursorPosition(n,i,r)),this._v3_1.set(this._v2_1.x,this._v2_1.y,0);let o=Math.pow(this._v2_1.x,2),a=Math.pow(this._v2_1.y,2),c=Math.pow(this._tbRadius,2);return o+a<=c*.5?this._v3_1.setZ(Math.sqrt(c-(o+a))):this._v3_1.setZ(c*.5/Math.sqrt(o+a)),this._v3_1}else if(t.type=="PerspectiveCamera"){this._v2_1.copy(this.getCursorNDC(n,i,r)),this._v3_1.set(this._v2_1.x,this._v2_1.y,-1),this._v3_1.applyMatrix4(t.projectionMatrixInverse);let o=this._v3_1.clone().normalize(),a=t.position.distanceTo(this._gizmos.position),c=Math.pow(s,2),l=this._v3_1.z,u=Math.sqrt(Math.pow(this._v3_1.x,2)+Math.pow(this._v3_1.y,2));if(u==0)return o.set(this._v3_1.x,this._v3_1.y,s),o;let h=l/u,f=a,d=Math.pow(h,2)+1,m=2*h*f,_=Math.pow(f,2)-c,g=Math.pow(m,2)-4*d*_;if(g>=0&&(this._v2_1.setX((-m-Math.sqrt(g))/(2*d)),this._v2_1.setY(h*this._v2_1.x+f),pe.RAD2DEG*this._v2_1.angle()>=45)){let x=Math.sqrt(Math.pow(this._v2_1.x,2)+Math.pow(a-this._v2_1.y,2));return o.multiplyScalar(x),o.z+=a,o}d=h,m=f,_=-c*.5,g=Math.pow(m,2)-4*d*_,this._v2_1.setX((-m-Math.sqrt(g))/(2*d)),this._v2_1.setY(h*this._v2_1.x+f);let p=Math.sqrt(Math.pow(this._v2_1.x,2)+Math.pow(a-this._v2_1.y,2));return o.multiplyScalar(p),o.z+=a,o}}unprojectOnTbPlane(t,n,i,r,s=!1){if(t.type=="OrthographicCamera")return this._v2_1.copy(this.getCursorPosition(n,i,r)),this._v3_1.set(this._v2_1.x,this._v2_1.y,0),this._v3_1.clone();if(t.type=="PerspectiveCamera"){this._v2_1.copy(this.getCursorNDC(n,i,r)),this._v3_1.set(this._v2_1.x,this._v2_1.y,-1),this._v3_1.applyMatrix4(t.projectionMatrixInverse);let o=this._v3_1.clone().normalize(),a=this._v3_1.z,c=Math.sqrt(Math.pow(this._v3_1.x,2)+Math.pow(this._v3_1.y,2)),l;if(s?l=this._v3_1.setFromMatrixPosition(this._cameraMatrixState0).distanceTo(this._v3_2.setFromMatrixPosition(this._gizmoMatrixState0)):l=t.position.distanceTo(this._gizmos.position),c==0)return o.set(0,0,0),o;let u=a/c,h=l,f=-h/u,d=Math.sqrt(Math.pow(h,2)+Math.pow(f,2));return o.multiplyScalar(d),o.z=0,o}}updateMatrixState(){this._cameraMatrixState.copy(this.object.matrix),this._gizmoMatrixState.copy(this._gizmos.matrix),this.object.isOrthographicCamera?(this._cameraProjectionState.copy(this.object.projectionMatrix),this.object.updateProjectionMatrix(),this._zoomState=this.object.zoom):this.object.isPerspectiveCamera&&(this._fovState=this.object.fov)}updateTbState(t,n){this._state=t,n&&this.updateMatrixState()}update(){if(this.target.equals(this._currentTarget)===!1&&(this._gizmos.position.copy(this.target),this._tbRadius=this.calculateTbRadius(this.object),this.makeGizmos(this.target,this._tbRadius),this._currentTarget.copy(this.target)),this.object.isOrthographicCamera){if(this.object.zoom>this.maxZoom||this.object.zoom<this.minZoom){let t=pe.clamp(this.object.zoom,this.minZoom,this.maxZoom);this.applyTransformMatrix(this.scale(t/this.object.zoom,this._gizmos.position,!0))}}else if(this.object.isPerspectiveCamera){let t=this.object.position.distanceTo(this._gizmos.position);if(t>this.maxDistance+Fh||t<this.minDistance-Fh){let i=pe.clamp(t,this.minDistance,this.maxDistance);this.applyTransformMatrix(this.scale(i/t,this._gizmos.position)),this.updateMatrixState()}(this.object.fov<this.minFov||this.object.fov>this.maxFov)&&(this.object.fov=pe.clamp(this.object.fov,this.minFov,this.maxFov),this.object.updateProjectionMatrix());let n=this._tbRadius;if(this._tbRadius=this.calculateTbRadius(this.object),n<this._tbRadius-Fh||n>this._tbRadius+Fh){let i=(this._gizmos.scale.x+this._gizmos.scale.y+this._gizmos.scale.z)/3,r=this._tbRadius/i,o=new hi(0,0,r,r).getPoints(this._curvePts),a=new ve().setFromPoints(o);for(let c in this._gizmos.children)this._gizmos.children[c].geometry=a}}this.object.lookAt(this._gizmos.position)}setStateFromJSON(t){let n=JSON.parse(t);if(n.arcballState!=null){this.target.fromArray(n.arcballState.target),this._cameraMatrixState.fromArray(n.arcballState.cameraMatrix.elements),this._cameraMatrixState.decompose(this.object.position,this.object.quaternion,this.object.scale),this.object.up.copy(n.arcballState.cameraUp),this.object.near=n.arcballState.cameraNear,this.object.far=n.arcballState.cameraFar,this.object.zoom=n.arcballState.cameraZoom,this.object.isPerspectiveCamera&&(this.object.fov=n.arcballState.cameraFov),this._gizmoMatrixState.fromArray(n.arcballState.gizmoMatrix.elements),this._gizmoMatrixState.decompose(this._gizmos.position,this._gizmos.quaternion,this._gizmos.scale),this.object.updateMatrix(),this.object.updateProjectionMatrix(),this._gizmos.updateMatrix(),this._tbRadius=this.calculateTbRadius(this.object);let i=new Vt().copy(this._gizmoMatrixState0);this.makeGizmos(this._gizmos.position,this._tbRadius),this._gizmoMatrixState0.copy(i),this.object.lookAt(this._gizmos.position),this.updateTbState(Nt.IDLE,!1),this.dispatchEvent(Me)}}};function IC(){let e=(this._gizmos.scale.x+this._gizmos.scale.y+this._gizmos.scale.z)/3;this._tbRadius=this.calculateTbRadius(this.object);let t=this._tbRadius/e,i=new hi(0,0,t,t).getPoints(this._curvePts),r=new ve().setFromPoints(i);for(let s in this._gizmos.children)this._gizmos.children[s].geometry=r;this.dispatchEvent(Me)}function DC(e){if(this.enabled){for(let t=0;t<this.mouseActions.length;t++)if(this.mouseActions[t].mouse==2){e.preventDefault();break}}}function LC(){this._touchStart.splice(0,this._touchStart.length),this._touchCurrent.splice(0,this._touchCurrent.length),this._input=me.NONE}function OC(e){if(e.button==0&&e.isPrimary?(this._downValid=!0,this._downEvents.push(e),this._downStart=performance.now()):this._downValid=!1,e.pointerType=="touch"&&this._input!=me.CURSOR)switch(this._touchStart.push(e),this._touchCurrent.push(e),this._input){case me.NONE:this._input=me.ONE_FINGER,this.onSinglePanStart(e,"ROTATE"),window.addEventListener("pointermove",this._onPointerMove),window.addEventListener("pointerup",this._onPointerUp);break;case me.ONE_FINGER:case me.ONE_FINGER_SWITCHED:this._input=me.TWO_FINGER,this.onRotateStart(),this.onPinchStart(),this.onDoublePanStart();break;case me.TWO_FINGER:this._input=me.MULT_FINGER,this.onTriplePanStart(e);break}else if(e.pointerType!="touch"&&this._input==me.NONE){let t=null;e.ctrlKey||e.metaKey?t="CTRL":e.shiftKey&&(t="SHIFT"),this._mouseOp=this.getOpFromAction(e.button,t),this._mouseOp!=null&&(window.addEventListener("pointermove",this._onPointerMove),window.addEventListener("pointerup",this._onPointerUp),this._input=me.CURSOR,this._button=e.button,this.onSinglePanStart(e,this._mouseOp))}}function NC(e){if(e.pointerType=="touch"&&this._input!=me.CURSOR)switch(this._input){case me.ONE_FINGER:this.updateTouchEvent(e),this.onSinglePanMove(e,Nt.ROTATE);break;case me.ONE_FINGER_SWITCHED:if(this.calculatePointersDistance(this._touchCurrent[0],e)*this._devPxRatio>=this._switchSensibility){this._input=me.ONE_FINGER,this.updateTouchEvent(e),this.onSinglePanStart(e,"ROTATE");break}break;case me.TWO_FINGER:this.updateTouchEvent(e),this.onRotateMove(),this.onPinchMove(),this.onDoublePanMove();break;case me.MULT_FINGER:this.updateTouchEvent(e),this.onTriplePanMove(e);break}else if(e.pointerType!="touch"&&this._input==me.CURSOR){let t=null;e.ctrlKey||e.metaKey?t="CTRL":e.shiftKey&&(t="SHIFT");let n=this.getOpStateFromAction(this._button,t);n!=null&&this.onSinglePanMove(e,n)}this._downValid&&this.calculatePointersDistance(this._downEvents[this._downEvents.length-1],e)*this._devPxRatio>this._movementThreshold&&(this._downValid=!1)}function FC(e){if(e.pointerType=="touch"&&this._input!=me.CURSOR){let t=this._touchCurrent.length;for(let n=0;n<t;n++)if(this._touchCurrent[n].pointerId==e.pointerId){this._touchCurrent.splice(n,1),this._touchStart.splice(n,1);break}switch(this._input){case me.ONE_FINGER:case me.ONE_FINGER_SWITCHED:window.removeEventListener("pointermove",this._onPointerMove),window.removeEventListener("pointerup",this._onPointerUp),this._input=me.NONE,this.onSinglePanEnd();break;case me.TWO_FINGER:this.onDoublePanEnd(e),this.onPinchEnd(e),this.onRotateEnd(e),this._input=me.ONE_FINGER_SWITCHED;break;case me.MULT_FINGER:this._touchCurrent.length==0&&(window.removeEventListener("pointermove",this._onPointerMove),window.removeEventListener("pointerup",this._onPointerUp),this._input=me.NONE,this.onTriplePanEnd());break}}else e.pointerType!="touch"&&this._input==me.CURSOR&&(window.removeEventListener("pointermove",this._onPointerMove),window.removeEventListener("pointerup",this._onPointerUp),this._input=me.NONE,this.onSinglePanEnd(),this._button=-1);if(e.isPrimary)if(this._downValid)if(e.timeStamp-this._downEvents[this._downEvents.length-1].timeStamp<=this._maxDownTime)if(this._nclicks==0)this._nclicks=1,this._clickStart=performance.now();else{let n=e.timeStamp-this._clickStart,i=this.calculatePointersDistance(this._downEvents[1],this._downEvents[0])*this._devPxRatio;n<=this._maxInterval&&i<=this._posThreshold?(this._nclicks=0,this._downEvents.splice(0,this._downEvents.length),this.onDoubleTap(e)):(this._nclicks=1,this._downEvents.shift(),this._clickStart=performance.now())}else this._downValid=!1,this._nclicks=0,this._downEvents.splice(0,this._downEvents.length);else this._nclicks=0,this._downEvents.splice(0,this._downEvents.length)}function UC(e){if(this.enabled&&this.enableZoom){let t=null;e.ctrlKey||e.metaKey?t="CTRL":e.shiftKey&&(t="SHIFT");let n=this.getOpFromAction("WHEEL",t);if(n!=null){e.preventDefault(),this.dispatchEvent(ri);let i=125,r=e.deltaY/i,s=1;switch(r>0?s=1/this.scaleFactor:r<0&&(s=this.scaleFactor),n){case"ZOOM":if(this.updateTbState(Nt.SCALE,!0),r>0?s=1/Math.pow(this.scaleFactor,r):r<0&&(s=Math.pow(this.scaleFactor,-r)),this.cursorZoom&&this.enablePan){let o;this.object.isOrthographicCamera?o=this.unprojectOnTbPlane(this.object,e.clientX,e.clientY,this.domElement).applyQuaternion(this.object.quaternion).multiplyScalar(1/this.object.zoom).add(this._gizmos.position):this.object.isPerspectiveCamera&&(o=this.unprojectOnTbPlane(this.object,e.clientX,e.clientY,this.domElement).applyQuaternion(this.object.quaternion).add(this._gizmos.position)),this.applyTransformMatrix(this.scale(s,o))}else this.applyTransformMatrix(this.scale(s,this._gizmos.position));this._grid!=null&&(this.disposeGrid(),this.drawGrid()),this.updateTbState(Nt.IDLE,!1),this.dispatchEvent(Me),this.dispatchEvent(Hn);break;case"FOV":if(this.object.isPerspectiveCamera){this.updateTbState(Nt.FOV,!0),e.deltaX!=0&&(r=e.deltaX/i,s=1,r>0?s=1/Math.pow(this.scaleFactor,r):r<0&&(s=Math.pow(this.scaleFactor,-r))),this._v3_1.setFromMatrixPosition(this._cameraMatrixState);let o=this._v3_1.distanceTo(this._gizmos.position),a=o/s;a=pe.clamp(a,this.minDistance,this.maxDistance);let c=o*Math.tan(pe.DEG2RAD*this.object.fov*.5),l=pe.RAD2DEG*(Math.atan(c/a)*2);l>this.maxFov?l=this.maxFov:l<this.minFov&&(l=this.minFov);let u=c/Math.tan(pe.DEG2RAD*(l/2));s=o/u,this.setFov(l),this.applyTransformMatrix(this.scale(s,this._gizmos.position,!1))}this._grid!=null&&(this.disposeGrid(),this.drawGrid()),this.updateTbState(Nt.IDLE,!1),this.dispatchEvent(Me),this.dispatchEvent(Hn);break}}}}var Ov={type:"change"},qd={type:"start"},Fv={type:"end"},zh=new Ri,Nv=new un,zC=Math.cos(70*pe.DEG2RAD),ze=new I,mn=2*Math.PI,ge={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},jd=1e-6,kh=class extends Sn{constructor(t,n=null){super(t,n),this.state=ge.NONE,this.target=new I,this.cursor=new I,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.keyRotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:Pe.ROTATE,MIDDLE:Pe.DOLLY,RIGHT:Pe.PAN},this.touches={ONE:Fn.ROTATE,TWO:Fn.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._domElementKeyEvents=null,this._lastPosition=new I,this._lastQuaternion=new Ne,this._lastTargetPosition=new I,this._quat=new Ne().setFromUnitVectors(t.up,new I(0,1,0)),this._quatInverse=this._quat.clone().invert(),this._spherical=new Ps,this._sphericalDelta=new Ps,this._scale=1,this._panOffset=new I,this._rotateStart=new et,this._rotateEnd=new et,this._rotateDelta=new et,this._panStart=new et,this._panEnd=new et,this._panDelta=new et,this._dollyStart=new et,this._dollyEnd=new et,this._dollyDelta=new et,this._dollyDirection=new I,this._mouse=new et,this._performCursorZoom=!1,this._pointers=[],this._pointerPositions={},this._controlActive=!1,this._onPointerMove=BC.bind(this),this._onPointerDown=kC.bind(this),this._onPointerUp=VC.bind(this),this._onContextMenu=$C.bind(this),this._onMouseWheel=WC.bind(this),this._onKeyDown=jC.bind(this),this._onTouchStart=qC.bind(this),this._onTouchMove=XC.bind(this),this._onMouseDown=HC.bind(this),this._onMouseMove=GC.bind(this),this._interceptControlDown=YC.bind(this),this._interceptControlUp=ZC.bind(this),this.domElement!==null&&this.connect(this.domElement),this.update()}connect(t){super.connect(t),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerUp),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.addEventListener("wheel",this._onMouseWheel,{passive:!1}),this.domElement.getRootNode().addEventListener("keydown",this._interceptControlDown,{passive:!0,capture:!0}),this.domElement.style.touchAction="none"}disconnect(){this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.removeEventListener("pointermove",this._onPointerMove),this.domElement.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerUp),this.domElement.removeEventListener("wheel",this._onMouseWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.stopListenToKeyEvents(),this.domElement.getRootNode().removeEventListener("keydown",this._interceptControlDown,{capture:!0}),this.domElement.style.touchAction="auto"}dispose(){this.disconnect()}getPolarAngle(){return this._spherical.phi}getAzimuthalAngle(){return this._spherical.theta}getDistance(){return this.object.position.distanceTo(this.target)}listenToKeyEvents(t){t.addEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=t}stopListenToKeyEvents(){this._domElementKeyEvents!==null&&(this._domElementKeyEvents.removeEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=null)}saveState(){this.target0.copy(this.target),this.position0.copy(this.object.position),this.zoom0=this.object.zoom}reset(){this.target.copy(this.target0),this.object.position.copy(this.position0),this.object.zoom=this.zoom0,this.object.updateProjectionMatrix(),this.dispatchEvent(Ov),this.update(),this.state=ge.NONE}update(t=null){let n=this.object.position;ze.copy(n).sub(this.target),ze.applyQuaternion(this._quat),this._spherical.setFromVector3(ze),this.autoRotate&&this.state===ge.NONE&&this._rotateLeft(this._getAutoRotationAngle(t)),this.enableDamping?(this._spherical.theta+=this._sphericalDelta.theta*this.dampingFactor,this._spherical.phi+=this._sphericalDelta.phi*this.dampingFactor):(this._spherical.theta+=this._sphericalDelta.theta,this._spherical.phi+=this._sphericalDelta.phi);let i=this.minAzimuthAngle,r=this.maxAzimuthAngle;isFinite(i)&&isFinite(r)&&(i<-Math.PI?i+=mn:i>Math.PI&&(i-=mn),r<-Math.PI?r+=mn:r>Math.PI&&(r-=mn),i<=r?this._spherical.theta=Math.max(i,Math.min(r,this._spherical.theta)):this._spherical.theta=this._spherical.theta>(i+r)/2?Math.max(i,this._spherical.theta):Math.min(r,this._spherical.theta)),this._spherical.phi=Math.max(this.minPolarAngle,Math.min(this.maxPolarAngle,this._spherical.phi)),this._spherical.makeSafe(),this.enableDamping===!0?this.target.addScaledVector(this._panOffset,this.dampingFactor):this.target.add(this._panOffset),this.target.sub(this.cursor),this.target.clampLength(this.minTargetRadius,this.maxTargetRadius),this.target.add(this.cursor);let s=!1;if(this.zoomToCursor&&this._performCursorZoom||this.object.isOrthographicCamera)this._spherical.radius=this._clampDistance(this._spherical.radius);else{let o=this._spherical.radius;this._spherical.radius=this._clampDistance(this._spherical.radius*this._scale),s=o!=this._spherical.radius}if(ze.setFromSpherical(this._spherical),ze.applyQuaternion(this._quatInverse),n.copy(this.target).add(ze),this.object.lookAt(this.target),this.enableDamping===!0?(this._sphericalDelta.theta*=1-this.dampingFactor,this._sphericalDelta.phi*=1-this.dampingFactor,this._panOffset.multiplyScalar(1-this.dampingFactor)):(this._sphericalDelta.set(0,0,0),this._panOffset.set(0,0,0)),this.zoomToCursor&&this._performCursorZoom){let o=null;if(this.object.isPerspectiveCamera){let a=ze.length();o=this._clampDistance(a*this._scale);let c=a-o;this.object.position.addScaledVector(this._dollyDirection,c),this.object.updateMatrixWorld(),s=!!c}else if(this.object.isOrthographicCamera){let a=new I(this._mouse.x,this._mouse.y,0);a.unproject(this.object);let c=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),this.object.updateProjectionMatrix(),s=c!==this.object.zoom;let l=new I(this._mouse.x,this._mouse.y,0);l.unproject(this.object),this.object.position.sub(l).add(a),this.object.updateMatrixWorld(),o=ze.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),this.zoomToCursor=!1;o!==null&&(this.screenSpacePanning?this.target.set(0,0,-1).transformDirection(this.object.matrix).multiplyScalar(o).add(this.object.position):(zh.origin.copy(this.object.position),zh.direction.set(0,0,-1).transformDirection(this.object.matrix),Math.abs(this.object.up.dot(zh.direction))<zC?this.object.lookAt(this.target):(Nv.setFromNormalAndCoplanarPoint(this.object.up,this.target),zh.intersectPlane(Nv,this.target))))}else if(this.object.isOrthographicCamera){let o=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),o!==this.object.zoom&&(this.object.updateProjectionMatrix(),s=!0)}return this._scale=1,this._performCursorZoom=!1,s||this._lastPosition.distanceToSquared(this.object.position)>jd||8*(1-this._lastQuaternion.dot(this.object.quaternion))>jd||this._lastTargetPosition.distanceToSquared(this.target)>jd?(this.dispatchEvent(Ov),this._lastPosition.copy(this.object.position),this._lastQuaternion.copy(this.object.quaternion),this._lastTargetPosition.copy(this.target),!0):!1}_getAutoRotationAngle(t){return t!==null?mn/60*this.autoRotateSpeed*t:mn/60/60*this.autoRotateSpeed}_getZoomScale(t){let n=Math.abs(t*.01);return Math.pow(.95,this.zoomSpeed*n)}_rotateLeft(t){this._sphericalDelta.theta-=t}_rotateUp(t){this._sphericalDelta.phi-=t}_panLeft(t,n){ze.setFromMatrixColumn(n,0),ze.multiplyScalar(-t),this._panOffset.add(ze)}_panUp(t,n){this.screenSpacePanning===!0?ze.setFromMatrixColumn(n,1):(ze.setFromMatrixColumn(n,0),ze.crossVectors(this.object.up,ze)),ze.multiplyScalar(t),this._panOffset.add(ze)}_pan(t,n){let i=this.domElement;if(this.object.isPerspectiveCamera){let r=this.object.position;ze.copy(r).sub(this.target);let s=ze.length();s*=Math.tan(this.object.fov/2*Math.PI/180),this._panLeft(2*t*s/i.clientHeight,this.object.matrix),this._panUp(2*n*s/i.clientHeight,this.object.matrix)}else this.object.isOrthographicCamera?(this._panLeft(t*(this.object.right-this.object.left)/this.object.zoom/i.clientWidth,this.object.matrix),this._panUp(n*(this.object.top-this.object.bottom)/this.object.zoom/i.clientHeight,this.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),this.enablePan=!1)}_dollyOut(t){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale/=t:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_dollyIn(t){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale*=t:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_updateZoomParameters(t,n){if(!this.zoomToCursor)return;this._performCursorZoom=!0;let i=this.domElement.getBoundingClientRect(),r=t-i.left,s=n-i.top,o=i.width,a=i.height;this._mouse.x=r/o*2-1,this._mouse.y=-(s/a)*2+1,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()}_clampDistance(t){return Math.max(this.minDistance,Math.min(this.maxDistance,t))}_handleMouseDownRotate(t){this._rotateStart.set(t.clientX,t.clientY)}_handleMouseDownDolly(t){this._updateZoomParameters(t.clientX,t.clientX),this._dollyStart.set(t.clientX,t.clientY)}_handleMouseDownPan(t){this._panStart.set(t.clientX,t.clientY)}_handleMouseMoveRotate(t){this._rotateEnd.set(t.clientX,t.clientY),this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let n=this.domElement;this._rotateLeft(mn*this._rotateDelta.x/n.clientHeight),this._rotateUp(mn*this._rotateDelta.y/n.clientHeight),this._rotateStart.copy(this._rotateEnd),this.update()}_handleMouseMoveDolly(t){this._dollyEnd.set(t.clientX,t.clientY),this._dollyDelta.subVectors(this._dollyEnd,this._dollyStart),this._dollyDelta.y>0?this._dollyOut(this._getZoomScale(this._dollyDelta.y)):this._dollyDelta.y<0&&this._dollyIn(this._getZoomScale(this._dollyDelta.y)),this._dollyStart.copy(this._dollyEnd),this.update()}_handleMouseMovePan(t){this._panEnd.set(t.clientX,t.clientY),this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd),this.update()}_handleMouseWheel(t){this._updateZoomParameters(t.clientX,t.clientY),t.deltaY<0?this._dollyIn(this._getZoomScale(t.deltaY)):t.deltaY>0&&this._dollyOut(this._getZoomScale(t.deltaY)),this.update()}_handleKeyDown(t){let n=!1;switch(t.code){case this.keys.UP:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateUp(mn*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,this.keyPanSpeed),n=!0;break;case this.keys.BOTTOM:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateUp(-mn*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,-this.keyPanSpeed),n=!0;break;case this.keys.LEFT:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateLeft(mn*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(this.keyPanSpeed,0),n=!0;break;case this.keys.RIGHT:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateLeft(-mn*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(-this.keyPanSpeed,0),n=!0;break}n&&(t.preventDefault(),this.update())}_handleTouchStartRotate(t){if(this._pointers.length===1)this._rotateStart.set(t.pageX,t.pageY);else{let n=this._getSecondPointerPosition(t),i=.5*(t.pageX+n.x),r=.5*(t.pageY+n.y);this._rotateStart.set(i,r)}}_handleTouchStartPan(t){if(this._pointers.length===1)this._panStart.set(t.pageX,t.pageY);else{let n=this._getSecondPointerPosition(t),i=.5*(t.pageX+n.x),r=.5*(t.pageY+n.y);this._panStart.set(i,r)}}_handleTouchStartDolly(t){let n=this._getSecondPointerPosition(t),i=t.pageX-n.x,r=t.pageY-n.y,s=Math.sqrt(i*i+r*r);this._dollyStart.set(0,s)}_handleTouchStartDollyPan(t){this.enableZoom&&this._handleTouchStartDolly(t),this.enablePan&&this._handleTouchStartPan(t)}_handleTouchStartDollyRotate(t){this.enableZoom&&this._handleTouchStartDolly(t),this.enableRotate&&this._handleTouchStartRotate(t)}_handleTouchMoveRotate(t){if(this._pointers.length==1)this._rotateEnd.set(t.pageX,t.pageY);else{let i=this._getSecondPointerPosition(t),r=.5*(t.pageX+i.x),s=.5*(t.pageY+i.y);this._rotateEnd.set(r,s)}this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let n=this.domElement;this._rotateLeft(mn*this._rotateDelta.x/n.clientHeight),this._rotateUp(mn*this._rotateDelta.y/n.clientHeight),this._rotateStart.copy(this._rotateEnd)}_handleTouchMovePan(t){if(this._pointers.length===1)this._panEnd.set(t.pageX,t.pageY);else{let n=this._getSecondPointerPosition(t),i=.5*(t.pageX+n.x),r=.5*(t.pageY+n.y);this._panEnd.set(i,r)}this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd)}_handleTouchMoveDolly(t){let n=this._getSecondPointerPosition(t),i=t.pageX-n.x,r=t.pageY-n.y,s=Math.sqrt(i*i+r*r);this._dollyEnd.set(0,s),this._dollyDelta.set(0,Math.pow(this._dollyEnd.y/this._dollyStart.y,this.zoomSpeed)),this._dollyOut(this._dollyDelta.y),this._dollyStart.copy(this._dollyEnd);let o=(t.pageX+n.x)*.5,a=(t.pageY+n.y)*.5;this._updateZoomParameters(o,a)}_handleTouchMoveDollyPan(t){this.enableZoom&&this._handleTouchMoveDolly(t),this.enablePan&&this._handleTouchMovePan(t)}_handleTouchMoveDollyRotate(t){this.enableZoom&&this._handleTouchMoveDolly(t),this.enableRotate&&this._handleTouchMoveRotate(t)}_addPointer(t){this._pointers.push(t.pointerId)}_removePointer(t){delete this._pointerPositions[t.pointerId];for(let n=0;n<this._pointers.length;n++)if(this._pointers[n]==t.pointerId){this._pointers.splice(n,1);return}}_isTrackingPointer(t){for(let n=0;n<this._pointers.length;n++)if(this._pointers[n]==t.pointerId)return!0;return!1}_trackPointer(t){let n=this._pointerPositions[t.pointerId];n===void 0&&(n=new et,this._pointerPositions[t.pointerId]=n),n.set(t.pageX,t.pageY)}_getSecondPointerPosition(t){let n=t.pointerId===this._pointers[0]?this._pointers[1]:this._pointers[0];return this._pointerPositions[n]}_customWheelEvent(t){let n=t.deltaMode,i={clientX:t.clientX,clientY:t.clientY,deltaY:t.deltaY};switch(n){case 1:i.deltaY*=16;break;case 2:i.deltaY*=100;break}return t.ctrlKey&&!this._controlActive&&(i.deltaY*=10),i}};function kC(e){this.enabled!==!1&&(this._pointers.length===0&&(this.domElement.setPointerCapture(e.pointerId),this.domElement.addEventListener("pointermove",this._onPointerMove),this.domElement.addEventListener("pointerup",this._onPointerUp)),!this._isTrackingPointer(e)&&(this._addPointer(e),e.pointerType==="touch"?this._onTouchStart(e):this._onMouseDown(e)))}function BC(e){this.enabled!==!1&&(e.pointerType==="touch"?this._onTouchMove(e):this._onMouseMove(e))}function VC(e){switch(this._removePointer(e),this._pointers.length){case 0:this.domElement.releasePointerCapture(e.pointerId),this.domElement.removeEventListener("pointermove",this._onPointerMove),this.domElement.removeEventListener("pointerup",this._onPointerUp),this.dispatchEvent(Fv),this.state=ge.NONE;break;case 1:let t=this._pointers[0],n=this._pointerPositions[t];this._onTouchStart({pointerId:t,pageX:n.x,pageY:n.y});break}}function HC(e){let t;switch(e.button){case 0:t=this.mouseButtons.LEFT;break;case 1:t=this.mouseButtons.MIDDLE;break;case 2:t=this.mouseButtons.RIGHT;break;default:t=-1}switch(t){case Pe.DOLLY:if(this.enableZoom===!1)return;this._handleMouseDownDolly(e),this.state=ge.DOLLY;break;case Pe.ROTATE:if(e.ctrlKey||e.metaKey||e.shiftKey){if(this.enablePan===!1)return;this._handleMouseDownPan(e),this.state=ge.PAN}else{if(this.enableRotate===!1)return;this._handleMouseDownRotate(e),this.state=ge.ROTATE}break;case Pe.PAN:if(e.ctrlKey||e.metaKey||e.shiftKey){if(this.enableRotate===!1)return;this._handleMouseDownRotate(e),this.state=ge.ROTATE}else{if(this.enablePan===!1)return;this._handleMouseDownPan(e),this.state=ge.PAN}break;default:this.state=ge.NONE}this.state!==ge.NONE&&this.dispatchEvent(qd)}function GC(e){switch(this.state){case ge.ROTATE:if(this.enableRotate===!1)return;this._handleMouseMoveRotate(e);break;case ge.DOLLY:if(this.enableZoom===!1)return;this._handleMouseMoveDolly(e);break;case ge.PAN:if(this.enablePan===!1)return;this._handleMouseMovePan(e);break}}function WC(e){this.enabled===!1||this.enableZoom===!1||this.state!==ge.NONE||(e.preventDefault(),this.dispatchEvent(qd),this._handleMouseWheel(this._customWheelEvent(e)),this.dispatchEvent(Fv))}function jC(e){this.enabled!==!1&&this._handleKeyDown(e)}function qC(e){switch(this._trackPointer(e),this._pointers.length){case 1:switch(this.touches.ONE){case Fn.ROTATE:if(this.enableRotate===!1)return;this._handleTouchStartRotate(e),this.state=ge.TOUCH_ROTATE;break;case Fn.PAN:if(this.enablePan===!1)return;this._handleTouchStartPan(e),this.state=ge.TOUCH_PAN;break;default:this.state=ge.NONE}break;case 2:switch(this.touches.TWO){case Fn.DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchStartDollyPan(e),this.state=ge.TOUCH_DOLLY_PAN;break;case Fn.DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchStartDollyRotate(e),this.state=ge.TOUCH_DOLLY_ROTATE;break;default:this.state=ge.NONE}break;default:this.state=ge.NONE}this.state!==ge.NONE&&this.dispatchEvent(qd)}function XC(e){switch(this._trackPointer(e),this.state){case ge.TOUCH_ROTATE:if(this.enableRotate===!1)return;this._handleTouchMoveRotate(e),this.update();break;case ge.TOUCH_PAN:if(this.enablePan===!1)return;this._handleTouchMovePan(e),this.update();break;case ge.TOUCH_DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchMoveDollyPan(e),this.update();break;case ge.TOUCH_DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchMoveDollyRotate(e),this.update();break;default:this.state=ge.NONE}}function $C(e){this.enabled!==!1&&e.preventDefault()}function YC(e){e.key==="Control"&&(this._controlActive=!0,this.domElement.getRootNode().addEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function ZC(e){e.key==="Control"&&(this._controlActive=!1,this.domElement.getRootNode().removeEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}var KC={type:"change"},Uv=1e-6,zv=new Ne,Bh=class extends Sn{constructor(t,n=null){super(t,n),this.movementSpeed=1,this.rollSpeed=.005,this.dragToLook=!1,this.autoForward=!1,this._moveState={up:0,down:0,left:0,right:0,forward:0,back:0,pitchUp:0,pitchDown:0,yawLeft:0,yawRight:0,rollLeft:0,rollRight:0},this._moveVector=new I(0,0,0),this._rotationVector=new I(0,0,0),this._lastQuaternion=new Ne,this._lastPosition=new I,this._status=0,this._onKeyDown=JC.bind(this),this._onKeyUp=QC.bind(this),this._onPointerMove=eR.bind(this),this._onPointerDown=tR.bind(this),this._onPointerUp=nR.bind(this),this._onPointerCancel=iR.bind(this),this._onContextMenu=rR.bind(this),n!==null&&this.connect(n)}connect(t){super.connect(t),window.addEventListener("keydown",this._onKeyDown),window.addEventListener("keyup",this._onKeyUp),this.domElement.addEventListener("pointermove",this._onPointerMove),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointerup",this._onPointerUp),this.domElement.addEventListener("pointercancel",this._onPointerCancel),this.domElement.addEventListener("contextmenu",this._onContextMenu)}disconnect(){window.removeEventListener("keydown",this._onKeyDown),window.removeEventListener("keyup",this._onKeyUp),this.domElement.removeEventListener("pointermove",this._onPointerMove),this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerCancel),this.domElement.removeEventListener("contextmenu",this._onContextMenu)}dispose(){this.disconnect()}update(t){if(this.enabled===!1)return;let n=this.object,i=t*this.movementSpeed,r=t*this.rollSpeed;n.translateX(this._moveVector.x*i),n.translateY(this._moveVector.y*i),n.translateZ(this._moveVector.z*i),zv.set(this._rotationVector.x*r,this._rotationVector.y*r,this._rotationVector.z*r,1).normalize(),n.quaternion.multiply(zv),(this._lastPosition.distanceToSquared(n.position)>Uv||8*(1-this._lastQuaternion.dot(n.quaternion))>Uv)&&(this.dispatchEvent(KC),this._lastQuaternion.copy(n.quaternion),this._lastPosition.copy(n.position))}_updateMovementVector(){let t=this._moveState.forward||this.autoForward&&!this._moveState.back?1:0;this._moveVector.x=-this._moveState.left+this._moveState.right,this._moveVector.y=-this._moveState.down+this._moveState.up,this._moveVector.z=-t+this._moveState.back}_updateRotationVector(){this._rotationVector.x=-this._moveState.pitchDown+this._moveState.pitchUp,this._rotationVector.y=-this._moveState.yawRight+this._moveState.yawLeft,this._rotationVector.z=-this._moveState.rollRight+this._moveState.rollLeft}_getContainerDimensions(){return this.domElement!=document?{size:[this.domElement.offsetWidth,this.domElement.offsetHeight],offset:[this.domElement.offsetLeft,this.domElement.offsetTop]}:{size:[window.innerWidth,window.innerHeight],offset:[0,0]}}};function JC(e){if(!(e.altKey||this.enabled===!1)){switch(e.code){case"ShiftLeft":case"ShiftRight":this.movementSpeedMultiplier=.1;break;case"KeyW":this._moveState.forward=1;break;case"KeyS":this._moveState.back=1;break;case"KeyA":this._moveState.left=1;break;case"KeyD":this._moveState.right=1;break;case"KeyR":this._moveState.up=1;break;case"KeyF":this._moveState.down=1;break;case"ArrowUp":this._moveState.pitchUp=1;break;case"ArrowDown":this._moveState.pitchDown=1;break;case"ArrowLeft":this._moveState.yawLeft=1;break;case"ArrowRight":this._moveState.yawRight=1;break;case"KeyQ":this._moveState.rollLeft=1;break;case"KeyE":this._moveState.rollRight=1;break}this._updateMovementVector(),this._updateRotationVector()}}function QC(e){if(this.enabled!==!1){switch(e.code){case"ShiftLeft":case"ShiftRight":this.movementSpeedMultiplier=1;break;case"KeyW":this._moveState.forward=0;break;case"KeyS":this._moveState.back=0;break;case"KeyA":this._moveState.left=0;break;case"KeyD":this._moveState.right=0;break;case"KeyR":this._moveState.up=0;break;case"KeyF":this._moveState.down=0;break;case"ArrowUp":this._moveState.pitchUp=0;break;case"ArrowDown":this._moveState.pitchDown=0;break;case"ArrowLeft":this._moveState.yawLeft=0;break;case"ArrowRight":this._moveState.yawRight=0;break;case"KeyQ":this._moveState.rollLeft=0;break;case"KeyE":this._moveState.rollRight=0;break}this._updateMovementVector(),this._updateRotationVector()}}function tR(e){if(this.enabled!==!1)if(this.dragToLook)this._status++;else{switch(e.button){case 0:this._moveState.forward=1;break;case 2:this._moveState.back=1;break}this._updateMovementVector()}}function eR(e){if(this.enabled!==!1&&(!this.dragToLook||this._status>0)){let t=this._getContainerDimensions(),n=t.size[0]/2,i=t.size[1]/2;this._moveState.yawLeft=-(e.pageX-t.offset[0]-n)/n,this._moveState.pitchDown=(e.pageY-t.offset[1]-i)/i,this._updateRotationVector()}}function nR(e){if(this.enabled!==!1){if(this.dragToLook)this._status--,this._moveState.yawLeft=this._moveState.pitchDown=0;else{switch(e.button){case 0:this._moveState.forward=0;break;case 2:this._moveState.back=0;break}this._updateMovementVector()}this._updateRotationVector()}}function iR(){this.enabled!==!1&&(this.dragToLook?(this._status=0,this._moveState.yawLeft=this._moveState.pitchDown=0):(this._moveState.forward=0,this._moveState.back=0,this._updateMovementVector()),this._updateRotationVector())}function rR(e){this.enabled!==!1&&e.preventDefault()}var Js={name:"CopyShader",uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

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


		}`};var Tn=class{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error("THREE.Pass: .render() must be implemented in derived pass.")}dispose(){}},sR=new Cr(-1,1,1,-1,0,1),Xd=class extends ve{constructor(){super(),this.setAttribute("position",new ce([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new ce([0,2,0,0,2,0],2))}},oR=new Xd,sr=class{constructor(t){this._mesh=new we(oR,t)}dispose(){this._mesh.geometry.dispose()}render(t){t.render(this._mesh,sR)}get material(){return this._mesh.material}set material(t){this._mesh.material=t}};var Vh=class extends Tn{constructor(t,n="tDiffuse"){super(),this.textureID=n,this.uniforms=null,this.material=null,t instanceof Le?(this.uniforms=t.uniforms,this.material=t):t&&(this.uniforms=Oi.clone(t.uniforms),this.material=new Le({name:t.name!==void 0?t.name:"unspecified",defines:Object.assign({},t.defines),uniforms:this.uniforms,vertexShader:t.vertexShader,fragmentShader:t.fragmentShader})),this._fsQuad=new sr(this.material)}render(t,n,i){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=i.texture),this._fsQuad.material=this.material,this.renderToScreen?(t.setRenderTarget(null),this._fsQuad.render(t)):(t.setRenderTarget(n),this.clear&&t.clear(t.autoClearColor,t.autoClearDepth,t.autoClearStencil),this._fsQuad.render(t))}dispose(){this.material.dispose(),this._fsQuad.dispose()}};var Ma=class extends Tn{constructor(t,n){super(),this.scene=t,this.camera=n,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(t,n,i){let r=t.getContext(),s=t.state;s.buffers.color.setMask(!1),s.buffers.depth.setMask(!1),s.buffers.color.setLocked(!0),s.buffers.depth.setLocked(!0);let o,a;this.inverse?(o=0,a=1):(o=1,a=0),s.buffers.stencil.setTest(!0),s.buffers.stencil.setOp(r.REPLACE,r.REPLACE,r.REPLACE),s.buffers.stencil.setFunc(r.ALWAYS,o,4294967295),s.buffers.stencil.setClear(a),s.buffers.stencil.setLocked(!0),t.setRenderTarget(i),this.clear&&t.clear(),t.render(this.scene,this.camera),t.setRenderTarget(n),this.clear&&t.clear(),t.render(this.scene,this.camera),s.buffers.color.setLocked(!1),s.buffers.depth.setLocked(!1),s.buffers.color.setMask(!0),s.buffers.depth.setMask(!0),s.buffers.stencil.setLocked(!1),s.buffers.stencil.setFunc(r.EQUAL,1,4294967295),s.buffers.stencil.setOp(r.KEEP,r.KEEP,r.KEEP),s.buffers.stencil.setLocked(!0)}},Hh=class extends Tn{constructor(){super(),this.needsSwap=!1}render(t){t.state.buffers.stencil.setLocked(!1),t.state.buffers.stencil.setTest(!1)}};var Gh=class{constructor(t,n){if(this.renderer=t,this._pixelRatio=t.getPixelRatio(),n===void 0){let i=t.getSize(new et);this._width=i.width,this._height=i.height,n=new Ze(this._width*this._pixelRatio,this._height*this._pixelRatio,{type:Un}),n.texture.name="EffectComposer.rt1"}else this._width=n.width,this._height=n.height;this.renderTarget1=n,this.renderTarget2=n.clone(),this.renderTarget2.texture.name="EffectComposer.rt2",this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],this.copyPass=new Vh(Js),this.copyPass.material.blending=Kn,this.clock=new Yo}swapBuffers(){let t=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=t}addPass(t){this.passes.push(t),t.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(t,n){this.passes.splice(n,0,t),t.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(t){let n=this.passes.indexOf(t);n!==-1&&this.passes.splice(n,1)}isLastEnabledPass(t){for(let n=t+1;n<this.passes.length;n++)if(this.passes[n].enabled)return!1;return!0}render(t){t===void 0&&(t=this.clock.getDelta());let n=this.renderer.getRenderTarget(),i=!1;for(let r=0,s=this.passes.length;r<s;r++){let o=this.passes[r];if(o.enabled!==!1){if(o.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(r),o.render(this.renderer,this.writeBuffer,this.readBuffer,t,i),o.needsSwap){if(i){let a=this.renderer.getContext(),c=this.renderer.state.buffers.stencil;c.setFunc(a.NOTEQUAL,1,4294967295),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,t),c.setFunc(a.EQUAL,1,4294967295)}this.swapBuffers()}Ma!==void 0&&(o instanceof Ma?i=!0:o instanceof Hh&&(i=!1))}}this.renderer.setRenderTarget(n)}reset(t){if(t===void 0){let n=this.renderer.getSize(new et);this._pixelRatio=this.renderer.getPixelRatio(),this._width=n.width,this._height=n.height,t=this.renderTarget1.clone(),t.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=t,this.renderTarget2=t.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(t,n){this._width=t,this._height=n;let i=this._width*this._pixelRatio,r=this._height*this._pixelRatio;this.renderTarget1.setSize(i,r),this.renderTarget2.setSize(i,r);for(let s=0;s<this.passes.length;s++)this.passes[s].setSize(i,r)}setPixelRatio(t){this._pixelRatio=t,this.setSize(this._width,this._height)}dispose(){this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.copyPass.dispose()}};var Wh=class extends Tn{constructor(t,n,i=null,r=null,s=null){super(),this.scene=t,this.camera=n,this.overrideMaterial=i,this.clearColor=r,this.clearAlpha=s,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this._oldClearColor=new Ot}render(t,n,i){let r=t.autoClear;t.autoClear=!1;let s,o;this.overrideMaterial!==null&&(o=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),this.clearColor!==null&&(t.getClearColor(this._oldClearColor),t.setClearColor(this.clearColor,t.getClearAlpha())),this.clearAlpha!==null&&(s=t.getClearAlpha(),t.setClearAlpha(this.clearAlpha)),this.clearDepth==!0&&t.clearDepth(),t.setRenderTarget(this.renderToScreen?null:i),this.clear===!0&&t.clear(t.autoClearColor,t.autoClearDepth,t.autoClearStencil),t.render(this.scene,this.camera),this.clearColor!==null&&t.setClearColor(this._oldClearColor),this.clearAlpha!==null&&t.setClearAlpha(s),this.overrideMaterial!==null&&(this.scene.overrideMaterial=o),t.autoClear=r}};function cn(){return cn=Object.assign?Object.assign.bind():function(e){for(var t=1;t<arguments.length;t++){var n=arguments[t];for(var i in n)({}).hasOwnProperty.call(n,i)&&(e[i]=n[i])}return e},cn.apply(null,arguments)}function kv(e){if(e===void 0)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return e}function or(e,t){return or=Object.setPrototypeOf?Object.setPrototypeOf.bind():function(n,i){return n.__proto__=i,n},or(e,t)}function Bv(e,t){e.prototype=Object.create(t.prototype),e.prototype.constructor=e,or(e,t)}function jh(e){return jh=Object.setPrototypeOf?Object.getPrototypeOf.bind():function(t){return t.__proto__||Object.getPrototypeOf(t)},jh(e)}function Vv(e){try{return Function.toString.call(e).indexOf("[native code]")!==-1}catch{return typeof e=="function"}}function $d(){try{var e=!Boolean.prototype.valueOf.call(Reflect.construct(Boolean,[],function(){}))}catch{}return($d=function(){return!!e})()}function Hv(e,t,n){if($d())return Reflect.construct.apply(null,arguments);var i=[null];i.push.apply(i,t);var r=new(e.bind.apply(e,i));return n&&or(r,n.prototype),r}function qh(e){var t=typeof Map=="function"?new Map:void 0;return qh=function(i){if(i===null||!Vv(i))return i;if(typeof i!="function")throw new TypeError("Super expression must either be null or a function");if(t!==void 0){if(t.has(i))return t.get(i);t.set(i,r)}function r(){return Hv(i,arguments,jh(this).constructor)}return r.prototype=Object.create(i.prototype,{constructor:{value:r,enumerable:!1,writable:!0,configurable:!0}}),or(r,i)},qh(e)}var gn=(function(e){Bv(t,e);function t(n){var i;if(1)i=e.call(this,"An error occurred. See https://github.com/styled-components/polished/blob/main/src/internalHelpers/errors.md#"+n+" for more information.")||this;else for(var r,s,o;o<r;o++);return kv(i)}return t})(qh(Error));function Gv(e,t){return e.substr(-t.length)===t}var aR=/^([+-]?(?:\d+|\d*\.\d+))([a-z]*|%)$/;function Wv(e){if(typeof e!="string")return e;var t=e.match(aR);return t?parseFloat(e):e}var cR=function(t){return function(n,i){i===void 0&&(i="16px");var r=n,s=i;if(typeof n=="string"){if(!Gv(n,"px"))throw new gn(69,t,n);r=Wv(n)}if(typeof i=="string"){if(!Gv(i,"px"))throw new gn(70,t,i);s=Wv(i)}if(typeof r=="string")throw new gn(71,n,t);if(typeof s=="string")throw new gn(72,i,t);return""+r/s+t}},qv=cR,iz=qv("em");var rz=qv("rem");function Yd(e){return Math.round(e*255)}function lR(e,t,n){return Yd(e)+","+Yd(t)+","+Yd(n)}function Sa(e,t,n,i){if(i===void 0&&(i=lR),t===0)return i(n,n,n);var r=(e%360+360)%360/60,s=(1-Math.abs(2*n-1))*t,o=s*(1-Math.abs(r%2-1)),a=0,c=0,l=0;r>=0&&r<1?(a=s,c=o):r>=1&&r<2?(a=o,c=s):r>=2&&r<3?(c=s,l=o):r>=3&&r<4?(c=o,l=s):r>=4&&r<5?(a=o,l=s):r>=5&&r<6&&(a=s,l=o);var u=n-s/2,h=a+u,f=c+u,d=l+u;return i(h,f,d)}var jv={aliceblue:"f0f8ff",antiquewhite:"faebd7",aqua:"00ffff",aquamarine:"7fffd4",azure:"f0ffff",beige:"f5f5dc",bisque:"ffe4c4",black:"000",blanchedalmond:"ffebcd",blue:"0000ff",blueviolet:"8a2be2",brown:"a52a2a",burlywood:"deb887",cadetblue:"5f9ea0",chartreuse:"7fff00",chocolate:"d2691e",coral:"ff7f50",cornflowerblue:"6495ed",cornsilk:"fff8dc",crimson:"dc143c",cyan:"00ffff",darkblue:"00008b",darkcyan:"008b8b",darkgoldenrod:"b8860b",darkgray:"a9a9a9",darkgreen:"006400",darkgrey:"a9a9a9",darkkhaki:"bdb76b",darkmagenta:"8b008b",darkolivegreen:"556b2f",darkorange:"ff8c00",darkorchid:"9932cc",darkred:"8b0000",darksalmon:"e9967a",darkseagreen:"8fbc8f",darkslateblue:"483d8b",darkslategray:"2f4f4f",darkslategrey:"2f4f4f",darkturquoise:"00ced1",darkviolet:"9400d3",deeppink:"ff1493",deepskyblue:"00bfff",dimgray:"696969",dimgrey:"696969",dodgerblue:"1e90ff",firebrick:"b22222",floralwhite:"fffaf0",forestgreen:"228b22",fuchsia:"ff00ff",gainsboro:"dcdcdc",ghostwhite:"f8f8ff",gold:"ffd700",goldenrod:"daa520",gray:"808080",green:"008000",greenyellow:"adff2f",grey:"808080",honeydew:"f0fff0",hotpink:"ff69b4",indianred:"cd5c5c",indigo:"4b0082",ivory:"fffff0",khaki:"f0e68c",lavender:"e6e6fa",lavenderblush:"fff0f5",lawngreen:"7cfc00",lemonchiffon:"fffacd",lightblue:"add8e6",lightcoral:"f08080",lightcyan:"e0ffff",lightgoldenrodyellow:"fafad2",lightgray:"d3d3d3",lightgreen:"90ee90",lightgrey:"d3d3d3",lightpink:"ffb6c1",lightsalmon:"ffa07a",lightseagreen:"20b2aa",lightskyblue:"87cefa",lightslategray:"789",lightslategrey:"789",lightsteelblue:"b0c4de",lightyellow:"ffffe0",lime:"0f0",limegreen:"32cd32",linen:"faf0e6",magenta:"f0f",maroon:"800000",mediumaquamarine:"66cdaa",mediumblue:"0000cd",mediumorchid:"ba55d3",mediumpurple:"9370db",mediumseagreen:"3cb371",mediumslateblue:"7b68ee",mediumspringgreen:"00fa9a",mediumturquoise:"48d1cc",mediumvioletred:"c71585",midnightblue:"191970",mintcream:"f5fffa",mistyrose:"ffe4e1",moccasin:"ffe4b5",navajowhite:"ffdead",navy:"000080",oldlace:"fdf5e6",olive:"808000",olivedrab:"6b8e23",orange:"ffa500",orangered:"ff4500",orchid:"da70d6",palegoldenrod:"eee8aa",palegreen:"98fb98",paleturquoise:"afeeee",palevioletred:"db7093",papayawhip:"ffefd5",peachpuff:"ffdab9",peru:"cd853f",pink:"ffc0cb",plum:"dda0dd",powderblue:"b0e0e6",purple:"800080",rebeccapurple:"639",red:"f00",rosybrown:"bc8f8f",royalblue:"4169e1",saddlebrown:"8b4513",salmon:"fa8072",sandybrown:"f4a460",seagreen:"2e8b57",seashell:"fff5ee",sienna:"a0522d",silver:"c0c0c0",skyblue:"87ceeb",slateblue:"6a5acd",slategray:"708090",slategrey:"708090",snow:"fffafa",springgreen:"00ff7f",steelblue:"4682b4",tan:"d2b48c",teal:"008080",thistle:"d8bfd8",tomato:"ff6347",turquoise:"40e0d0",violet:"ee82ee",wheat:"f5deb3",white:"fff",whitesmoke:"f5f5f5",yellow:"ff0",yellowgreen:"9acd32"};function hR(e){if(typeof e!="string")return e;var t=e.toLowerCase();return jv[t]?"#"+jv[t]:e}var uR=/^#[a-fA-F0-9]{6}$/,fR=/^#[a-fA-F0-9]{8}$/,dR=/^#[a-fA-F0-9]{3}$/,pR=/^#[a-fA-F0-9]{4}$/,Zd=/^rgb\(\s*(\d{1,3})\s*(?:,)?\s*(\d{1,3})\s*(?:,)?\s*(\d{1,3})\s*\)$/i,mR=/^rgb(?:a)?\(\s*(\d{1,3})\s*(?:,)?\s*(\d{1,3})\s*(?:,)?\s*(\d{1,3})\s*(?:,|\/)\s*([-+]?\d*[.]?\d+[%]?)\s*\)$/i,gR=/^hsl\(\s*(\d{0,3}[.]?[0-9]+(?:deg)?)\s*(?:,)?\s*(\d{1,3}[.]?[0-9]?)%\s*(?:,)?\s*(\d{1,3}[.]?[0-9]?)%\s*\)$/i,_R=/^hsl(?:a)?\(\s*(\d{0,3}[.]?[0-9]+(?:deg)?)\s*(?:,)?\s*(\d{1,3}[.]?[0-9]?)%\s*(?:,)?\s*(\d{1,3}[.]?[0-9]?)%\s*(?:,|\/)\s*([-+]?\d*[.]?\d+[%]?)\s*\)$/i;function ar(e){if(typeof e!="string")throw new gn(3);var t=hR(e);if(t.match(uR))return{red:parseInt(""+t[1]+t[2],16),green:parseInt(""+t[3]+t[4],16),blue:parseInt(""+t[5]+t[6],16)};if(t.match(fR)){var n=parseFloat((parseInt(""+t[7]+t[8],16)/255).toFixed(2));return{red:parseInt(""+t[1]+t[2],16),green:parseInt(""+t[3]+t[4],16),blue:parseInt(""+t[5]+t[6],16),alpha:n}}if(t.match(dR))return{red:parseInt(""+t[1]+t[1],16),green:parseInt(""+t[2]+t[2],16),blue:parseInt(""+t[3]+t[3],16)};if(t.match(pR)){var i=parseFloat((parseInt(""+t[4]+t[4],16)/255).toFixed(2));return{red:parseInt(""+t[1]+t[1],16),green:parseInt(""+t[2]+t[2],16),blue:parseInt(""+t[3]+t[3],16),alpha:i}}var r=Zd.exec(t);if(r)return{red:parseInt(""+r[1],10),green:parseInt(""+r[2],10),blue:parseInt(""+r[3],10)};var s=mR.exec(t.substring(0,50));if(s)return{red:parseInt(""+s[1],10),green:parseInt(""+s[2],10),blue:parseInt(""+s[3],10),alpha:parseFloat(""+s[4])>1?parseFloat(""+s[4])/100:parseFloat(""+s[4])};var o=gR.exec(t);if(o){var a=parseInt(""+o[1],10),c=parseInt(""+o[2],10)/100,l=parseInt(""+o[3],10)/100,u="rgb("+Sa(a,c,l)+")",h=Zd.exec(u);if(!h)throw new gn(4,t,u);return{red:parseInt(""+h[1],10),green:parseInt(""+h[2],10),blue:parseInt(""+h[3],10)}}var f=_R.exec(t.substring(0,50));if(f){var d=parseInt(""+f[1],10),m=parseInt(""+f[2],10)/100,_=parseInt(""+f[3],10)/100,g="rgb("+Sa(d,m,_)+")",p=Zd.exec(g);if(!p)throw new gn(4,t,g);return{red:parseInt(""+p[1],10),green:parseInt(""+p[2],10),blue:parseInt(""+p[3],10),alpha:parseFloat(""+f[4])>1?parseFloat(""+f[4])/100:parseFloat(""+f[4])}}throw new gn(5)}function vR(e){var t=e.red/255,n=e.green/255,i=e.blue/255,r=Math.max(t,n,i),s=Math.min(t,n,i),o=(r+s)/2;if(r===s)return e.alpha!==void 0?{hue:0,saturation:0,lightness:o,alpha:e.alpha}:{hue:0,saturation:0,lightness:o};var a,c=r-s,l=o>.5?c/(2-r-s):c/(r+s);switch(r){case t:a=(n-i)/c+(n<i?6:0);break;case n:a=(i-t)/c+2;break;default:a=(t-n)/c+4;break}return a*=60,e.alpha!==void 0?{hue:a,saturation:l,lightness:o,alpha:e.alpha}:{hue:a,saturation:l,lightness:o}}function cr(e){return vR(ar(e))}var yR=function(t){return t.length===7&&t[1]===t[2]&&t[3]===t[4]&&t[5]===t[6]?"#"+t[1]+t[3]+t[5]:t},Jd=yR;function qr(e){var t=e.toString(16);return t.length===1?"0"+t:t}function Kd(e){return qr(Math.round(e*255))}function xR(e,t,n){return Jd("#"+Kd(e)+Kd(t)+Kd(n))}function Xh(e,t,n){return Sa(e,t,n,xR)}function bR(e,t,n){if(typeof e=="number"&&typeof t=="number"&&typeof n=="number")return Xh(e,t,n);if(typeof e=="object"&&t===void 0&&n===void 0)return Xh(e.hue,e.saturation,e.lightness);throw new gn(1)}function MR(e,t,n,i){if(typeof e=="number"&&typeof t=="number"&&typeof n=="number"&&typeof i=="number")return i>=1?Xh(e,t,n):"rgba("+Sa(e,t,n)+","+i+")";if(typeof e=="object"&&t===void 0&&n===void 0&&i===void 0)return e.alpha>=1?Xh(e.hue,e.saturation,e.lightness):"rgba("+Sa(e.hue,e.saturation,e.lightness)+","+e.alpha+")";throw new gn(2)}function Qd(e,t,n){if(typeof e=="number"&&typeof t=="number"&&typeof n=="number")return Jd("#"+qr(e)+qr(t)+qr(n));if(typeof e=="object"&&t===void 0&&n===void 0)return Jd("#"+qr(e.red)+qr(e.green)+qr(e.blue));throw new gn(6)}function $h(e,t,n,i){if(typeof e=="string"&&typeof t=="number"){var r=ar(e);return"rgba("+r.red+","+r.green+","+r.blue+","+t+")"}else{if(typeof e=="number"&&typeof t=="number"&&typeof n=="number"&&typeof i=="number")return i>=1?Qd(e,t,n):"rgba("+e+","+t+","+n+","+i+")";if(typeof e=="object"&&t===void 0&&n===void 0&&i===void 0)return e.alpha>=1?Qd(e.red,e.green,e.blue):"rgba("+e.red+","+e.green+","+e.blue+","+e.alpha+")"}throw new gn(7)}var SR=function(t){return typeof t.red=="number"&&typeof t.green=="number"&&typeof t.blue=="number"&&(typeof t.alpha!="number"||typeof t.alpha>"u")},wR=function(t){return typeof t.red=="number"&&typeof t.green=="number"&&typeof t.blue=="number"&&typeof t.alpha=="number"},ER=function(t){return typeof t.hue=="number"&&typeof t.saturation=="number"&&typeof t.lightness=="number"&&(typeof t.alpha!="number"||typeof t.alpha>"u")},TR=function(t){return typeof t.hue=="number"&&typeof t.saturation=="number"&&typeof t.lightness=="number"&&typeof t.alpha=="number"};function lr(e){if(typeof e!="object")throw new gn(8);if(wR(e))return $h(e);if(SR(e))return Qd(e);if(TR(e))return MR(e);if(ER(e))return bR(e);throw new gn(8)}function Xv(e,t,n){return function(){var r=n.concat(Array.prototype.slice.call(arguments));return r.length>=t?e.apply(this,r):Xv(e,t,r)}}function An(e){return Xv(e,e.length,[])}function AR(e,t){if(t==="transparent")return t;var n=cr(t);return lr(cn({},n,{hue:n.hue+parseFloat(e)}))}var sz=An(AR);function Qs(e,t,n){return Math.max(e,Math.min(t,n))}function CR(e,t){if(t==="transparent")return t;var n=cr(t);return lr(cn({},n,{lightness:Qs(0,1,n.lightness-parseFloat(e))}))}var oz=An(CR);function RR(e,t){if(t==="transparent")return t;var n=cr(t);return lr(cn({},n,{saturation:Qs(0,1,n.saturation-parseFloat(e))}))}var az=An(RR);function PR(e,t){if(t==="transparent")return t;var n=cr(t);return lr(cn({},n,{lightness:Qs(0,1,n.lightness+parseFloat(e))}))}var cz=An(PR);function IR(e,t,n){if(t==="transparent")return n;if(n==="transparent")return t;if(e===0)return n;var i=ar(t),r=cn({},i,{alpha:typeof i.alpha=="number"?i.alpha:1}),s=ar(n),o=cn({},s,{alpha:typeof s.alpha=="number"?s.alpha:1}),a=r.alpha-o.alpha,c=parseFloat(e)*2-1,l=c*a===-1?c:c+a,u=1+c*a,h=(l/u+1)/2,f=1-h,d={red:Math.floor(r.red*h+o.red*f),green:Math.floor(r.green*h+o.green*f),blue:Math.floor(r.blue*h+o.blue*f),alpha:r.alpha*parseFloat(e)+o.alpha*(1-parseFloat(e))};return $h(d)}var DR=An(IR),$v=DR;function LR(e,t){if(t==="transparent")return t;var n=ar(t),i=typeof n.alpha=="number"?n.alpha:1,r=cn({},n,{alpha:Qs(0,1,(i*100+parseFloat(e)*100)/100)});return $h(r)}var OR=An(LR),Yv=OR;function NR(e,t){if(t==="transparent")return t;var n=cr(t);return lr(cn({},n,{saturation:Qs(0,1,n.saturation+parseFloat(e))}))}var lz=An(NR);function FR(e,t){return t==="transparent"?t:lr(cn({},cr(t),{hue:parseFloat(e)}))}var hz=An(FR);function UR(e,t){return t==="transparent"?t:lr(cn({},cr(t),{lightness:parseFloat(e)}))}var uz=An(UR);function zR(e,t){return t==="transparent"?t:lr(cn({},cr(t),{saturation:parseFloat(e)}))}var fz=An(zR);function kR(e,t){return t==="transparent"?t:$v(parseFloat(e),"rgb(0, 0, 0)",t)}var dz=An(kR);function BR(e,t){return t==="transparent"?t:$v(parseFloat(e),"rgb(255, 255, 255)",t)}var pz=An(BR);function VR(e,t){if(t==="transparent")return t;var n=ar(t),i=typeof n.alpha=="number"?n.alpha:1,r=cn({},n,{alpha:Qs(0,1,+(i*100-parseFloat(e)*100).toFixed(2)/100)});return $h(r)}var mz=An(VR);var hr=Object.freeze({Linear:Object.freeze({None:function(e){return e},In:function(e){return e},Out:function(e){return e},InOut:function(e){return e}}),Quadratic:Object.freeze({In:function(e){return e*e},Out:function(e){return e*(2-e)},InOut:function(e){return(e*=2)<1?.5*e*e:-.5*(--e*(e-2)-1)}}),Cubic:Object.freeze({In:function(e){return e*e*e},Out:function(e){return--e*e*e+1},InOut:function(e){return(e*=2)<1?.5*e*e*e:.5*((e-=2)*e*e+2)}}),Quartic:Object.freeze({In:function(e){return e*e*e*e},Out:function(e){return 1- --e*e*e*e},InOut:function(e){return(e*=2)<1?.5*e*e*e*e:-.5*((e-=2)*e*e*e-2)}}),Quintic:Object.freeze({In:function(e){return e*e*e*e*e},Out:function(e){return--e*e*e*e*e+1},InOut:function(e){return(e*=2)<1?.5*e*e*e*e*e:.5*((e-=2)*e*e*e*e+2)}}),Sinusoidal:Object.freeze({In:function(e){return 1-Math.sin((1-e)*Math.PI/2)},Out:function(e){return Math.sin(e*Math.PI/2)},InOut:function(e){return .5*(1-Math.sin(Math.PI*(.5-e)))}}),Exponential:Object.freeze({In:function(e){return e===0?0:Math.pow(1024,e-1)},Out:function(e){return e===1?1:1-Math.pow(2,-10*e)},InOut:function(e){return e===0?0:e===1?1:(e*=2)<1?.5*Math.pow(1024,e-1):.5*(-Math.pow(2,-10*(e-1))+2)}}),Circular:Object.freeze({In:function(e){return 1-Math.sqrt(1-e*e)},Out:function(e){return Math.sqrt(1- --e*e)},InOut:function(e){return(e*=2)<1?-.5*(Math.sqrt(1-e*e)-1):.5*(Math.sqrt(1-(e-=2)*e)+1)}}),Elastic:Object.freeze({In:function(e){return e===0?0:e===1?1:-Math.pow(2,10*(e-1))*Math.sin((e-1.1)*5*Math.PI)},Out:function(e){return e===0?0:e===1?1:Math.pow(2,-10*e)*Math.sin((e-.1)*5*Math.PI)+1},InOut:function(e){return e===0?0:e===1?1:(e*=2,e<1?-.5*Math.pow(2,10*(e-1))*Math.sin((e-1.1)*5*Math.PI):.5*Math.pow(2,-10*(e-1))*Math.sin((e-1.1)*5*Math.PI)+1)}}),Back:Object.freeze({In:function(e){var t=1.70158;return e===1?1:e*e*((t+1)*e-t)},Out:function(e){var t=1.70158;return e===0?0:--e*e*((t+1)*e+t)+1},InOut:function(e){var t=2.5949095;return(e*=2)<1?.5*(e*e*((t+1)*e-t)):.5*((e-=2)*e*((t+1)*e+t)+2)}}),Bounce:Object.freeze({In:function(e){return 1-hr.Bounce.Out(1-e)},Out:function(e){return e<.36363636363636365?7.5625*e*e:e<.7272727272727273?7.5625*(e-=.5454545454545454)*e+.75:e<.9090909090909091?7.5625*(e-=.8181818181818182)*e+.9375:7.5625*(e-=.9545454545454546)*e+.984375},InOut:function(e){return e<.5?hr.Bounce.In(e*2)*.5:hr.Bounce.Out(e*2-1)*.5+.5}}),generatePow:function(e){return e===void 0&&(e=4),e=e<Number.EPSILON?Number.EPSILON:e,e=e>1e4?1e4:e,{In:function(t){return Math.pow(t,e)},Out:function(t){return 1-Math.pow(1-t,e)},InOut:function(t){return t<.5?Math.pow(t*2,e)/2:(1-Math.pow(2-t*2,e))/2+.5}}}}),wa=function(){return performance.now()},ep=(function(){function e(){for(var t=[],n=0;n<arguments.length;n++)t[n]=arguments[n];this._tweens={},this._tweensAddedDuringUpdate={},this.add.apply(this,t)}return e.prototype.getAll=function(){var t=this;return Object.keys(this._tweens).map(function(n){return t._tweens[n]})},e.prototype.removeAll=function(){this._tweens={}},e.prototype.add=function(){for(var t,n=[],i=0;i<arguments.length;i++)n[i]=arguments[i];for(var r=0,s=n;r<s.length;r++){var o=s[r];(t=o._group)===null||t===void 0||t.remove(o),o._group=this,this._tweens[o.getId()]=o,this._tweensAddedDuringUpdate[o.getId()]=o}},e.prototype.remove=function(){for(var t=[],n=0;n<arguments.length;n++)t[n]=arguments[n];for(var i=0,r=t;i<r.length;i++){var s=r[i];s._group=void 0,delete this._tweens[s.getId()],delete this._tweensAddedDuringUpdate[s.getId()]}},e.prototype.allStopped=function(){return this.getAll().every(function(t){return!t.isPlaying()})},e.prototype.update=function(t,n){t===void 0&&(t=wa()),n===void 0&&(n=!0);var i=Object.keys(this._tweens);if(i.length!==0)for(;i.length>0;){this._tweensAddedDuringUpdate={};for(var r=0;r<i.length;r++){var s=this._tweens[i[r]],o=!n;s&&s.update(t,o)===!1&&!n&&this.remove(s)}i=Object.keys(this._tweensAddedDuringUpdate)}},e})(),to={Linear:function(e,t){var n=e.length-1,i=n*t,r=Math.floor(i),s=to.Utils.Linear;return t<0?s(e[0],e[1],i):t>1?s(e[n],e[n-1],n-i):s(e[r],e[r+1>n?n:r+1],i-r)},Bezier:function(e,t){for(var n=0,i=e.length-1,r=Math.pow,s=to.Utils.Bernstein,o=0;o<=i;o++)n+=r(1-t,i-o)*r(t,o)*e[o]*s(i,o);return n},CatmullRom:function(e,t){var n=e.length-1,i=n*t,r=Math.floor(i),s=to.Utils.CatmullRom;return e[0]===e[n]?(t<0&&(r=Math.floor(i=n*(1+t))),s(e[(r-1+n)%n],e[r],e[(r+1)%n],e[(r+2)%n],i-r)):t<0?e[0]-(s(e[0],e[0],e[1],e[1],-i)-e[0]):t>1?e[n]-(s(e[n],e[n],e[n-1],e[n-1],i-n)-e[n]):s(e[r?r-1:0],e[r],e[n<r+1?n:r+1],e[n<r+2?n:r+2],i-r)},Utils:{Linear:function(e,t,n){return(t-e)*n+e},Bernstein:function(e,t){var n=to.Utils.Factorial;return n(e)/n(t)/n(e-t)},Factorial:(function(){var e=[1];return function(t){var n=1;if(e[t])return e[t];for(var i=t;i>1;i--)n*=i;return e[t]=n,n}})(),CatmullRom:function(e,t,n,i,r){var s=(n-e)*.5,o=(i-t)*.5,a=r*r,c=r*a;return(2*t-2*n+s+o)*c+(-3*t+3*n-2*s-o)*a+s*r+t}}},Zv=(function(){function e(){}return e.nextId=function(){return e._nextId++},e._nextId=0,e})(),tp=new ep,np=(function(){function e(t,n){this._isPaused=!1,this._pauseStart=0,this._valuesStart={},this._valuesEnd={},this._valuesStartRepeat={},this._duration=1e3,this._isDynamic=!1,this._initialRepeat=0,this._repeat=0,this._yoyo=!1,this._isPlaying=!1,this._reversed=!1,this._delayTime=0,this._startTime=0,this._easingFunction=hr.Linear.None,this._interpolationFunction=to.Linear,this._chainedTweens=[],this._onStartCallbackFired=!1,this._onEveryStartCallbackFired=!1,this._id=Zv.nextId(),this._isChainStopped=!1,this._propertiesAreSetUp=!1,this._goToEnd=!1,this._object=t,typeof n=="object"?(this._group=n,n.add(this)):n===!0&&(this._group=tp,tp.add(this))}return e.prototype.getId=function(){return this._id},e.prototype.isPlaying=function(){return this._isPlaying},e.prototype.isPaused=function(){return this._isPaused},e.prototype.getDuration=function(){return this._duration},e.prototype.to=function(t,n){if(n===void 0&&(n=1e3),this._isPlaying)throw new Error("Can not call Tween.to() while Tween is already started or paused. Stop the Tween first.");return this._valuesEnd=t,this._propertiesAreSetUp=!1,this._duration=n<0?0:n,this},e.prototype.duration=function(t){return t===void 0&&(t=1e3),this._duration=t<0?0:t,this},e.prototype.dynamic=function(t){return t===void 0&&(t=!1),this._isDynamic=t,this},e.prototype.start=function(t,n){if(t===void 0&&(t=wa()),n===void 0&&(n=!1),this._isPlaying)return this;if(this._repeat=this._initialRepeat,this._reversed){this._reversed=!1;for(var i in this._valuesStartRepeat)this._swapEndStartRepeatValues(i),this._valuesStart[i]=this._valuesStartRepeat[i]}if(this._isPlaying=!0,this._isPaused=!1,this._onStartCallbackFired=!1,this._onEveryStartCallbackFired=!1,this._isChainStopped=!1,this._startTime=t,this._startTime+=this._delayTime,!this._propertiesAreSetUp||n){if(this._propertiesAreSetUp=!0,!this._isDynamic){var r={};for(var s in this._valuesEnd)r[s]=this._valuesEnd[s];this._valuesEnd=r}this._setupProperties(this._object,this._valuesStart,this._valuesEnd,this._valuesStartRepeat,n)}return this},e.prototype.startFromCurrentValues=function(t){return this.start(t,!0)},e.prototype._setupProperties=function(t,n,i,r,s){for(var o in i){var a=t[o],c=Array.isArray(a),l=c?"array":typeof a,u=!c&&Array.isArray(i[o]);if(!(l==="undefined"||l==="function")){if(u){var h=i[o];if(h.length===0)continue;for(var f=[a],d=0,m=h.length;d<m;d+=1){var _=this._handleRelativeValue(a,h[d]);if(isNaN(_)){u=!1,console.warn("Found invalid interpolation list. Skipping.");break}f.push(_)}u&&(i[o]=f)}if((l==="object"||c)&&a&&!u){n[o]=c?[]:{};var g=a;for(var p in g)n[o][p]=g[p];r[o]=c?[]:{};var h=i[o];if(!this._isDynamic){var b={};for(var p in h)b[p]=h[p];i[o]=h=b}this._setupProperties(g,n[o],h,r[o],s)}else(typeof n[o]>"u"||s)&&(n[o]=a),c||(n[o]*=1),u?r[o]=i[o].slice().reverse():r[o]=n[o]||0}}},e.prototype.stop=function(){return this._isChainStopped||(this._isChainStopped=!0,this.stopChainedTweens()),this._isPlaying?(this._isPlaying=!1,this._isPaused=!1,this._onStopCallback&&this._onStopCallback(this._object),this):this},e.prototype.end=function(){return this._goToEnd=!0,this.update(this._startTime+this._duration),this},e.prototype.pause=function(t){return t===void 0&&(t=wa()),this._isPaused||!this._isPlaying?this:(this._isPaused=!0,this._pauseStart=t,this)},e.prototype.resume=function(t){return t===void 0&&(t=wa()),!this._isPaused||!this._isPlaying?this:(this._isPaused=!1,this._startTime+=t-this._pauseStart,this._pauseStart=0,this)},e.prototype.stopChainedTweens=function(){for(var t=0,n=this._chainedTweens.length;t<n;t++)this._chainedTweens[t].stop();return this},e.prototype.group=function(t){return t?(t.add(this),this):(console.warn("tween.group() without args has been removed, use group.add(tween) instead."),this)},e.prototype.remove=function(){var t;return(t=this._group)===null||t===void 0||t.remove(this),this},e.prototype.delay=function(t){return t===void 0&&(t=0),this._delayTime=t,this},e.prototype.repeat=function(t){return t===void 0&&(t=0),this._initialRepeat=t,this._repeat=t,this},e.prototype.repeatDelay=function(t){return this._repeatDelayTime=t,this},e.prototype.yoyo=function(t){return t===void 0&&(t=!1),this._yoyo=t,this},e.prototype.easing=function(t){return t===void 0&&(t=hr.Linear.None),this._easingFunction=t,this},e.prototype.interpolation=function(t){return t===void 0&&(t=to.Linear),this._interpolationFunction=t,this},e.prototype.chain=function(){for(var t=[],n=0;n<arguments.length;n++)t[n]=arguments[n];return this._chainedTweens=t,this},e.prototype.onStart=function(t){return this._onStartCallback=t,this},e.prototype.onEveryStart=function(t){return this._onEveryStartCallback=t,this},e.prototype.onUpdate=function(t){return this._onUpdateCallback=t,this},e.prototype.onRepeat=function(t){return this._onRepeatCallback=t,this},e.prototype.onComplete=function(t){return this._onCompleteCallback=t,this},e.prototype.onStop=function(t){return this._onStopCallback=t,this},e.prototype.update=function(t,n){var i=this,r;if(t===void 0&&(t=wa()),n===void 0&&(n=e.autoStartOnUpdate),this._isPaused)return!0;var s;if(!this._goToEnd&&!this._isPlaying)if(n)this.start(t,!0);else return!1;if(this._goToEnd=!1,t<this._startTime)return!0;this._onStartCallbackFired===!1&&(this._onStartCallback&&this._onStartCallback(this._object),this._onStartCallbackFired=!0),this._onEveryStartCallbackFired===!1&&(this._onEveryStartCallback&&this._onEveryStartCallback(this._object),this._onEveryStartCallbackFired=!0);var o=t-this._startTime,a=this._duration+((r=this._repeatDelayTime)!==null&&r!==void 0?r:this._delayTime),c=this._duration+this._repeat*a,l=function(){if(i._duration===0||o>c)return 1;var _=Math.trunc(o/a),g=o-_*a,p=Math.min(g/i._duration,1);return p===0&&o===i._duration?1:p},u=l(),h=this._easingFunction(u);if(this._updateProperties(this._object,this._valuesStart,this._valuesEnd,h),this._onUpdateCallback&&this._onUpdateCallback(this._object,u),this._duration===0||o>=this._duration)if(this._repeat>0){var f=Math.min(Math.trunc((o-this._duration)/a)+1,this._repeat);isFinite(this._repeat)&&(this._repeat-=f);for(s in this._valuesStartRepeat)!this._yoyo&&typeof this._valuesEnd[s]=="string"&&(this._valuesStartRepeat[s]=this._valuesStartRepeat[s]+parseFloat(this._valuesEnd[s])),this._yoyo&&this._swapEndStartRepeatValues(s),this._valuesStart[s]=this._valuesStartRepeat[s];return this._yoyo&&(this._reversed=!this._reversed),this._startTime+=a*f,this._onRepeatCallback&&this._onRepeatCallback(this._object),this._onEveryStartCallbackFired=!1,!0}else{this._onCompleteCallback&&this._onCompleteCallback(this._object);for(var d=0,m=this._chainedTweens.length;d<m;d++)this._chainedTweens[d].start(this._startTime+this._duration,!1);return this._isPlaying=!1,!1}return!0},e.prototype._updateProperties=function(t,n,i,r){for(var s in i)if(n[s]!==void 0){var o=n[s]||0,a=i[s],c=Array.isArray(t[s]),l=Array.isArray(a),u=!c&&l;u?t[s]=this._interpolationFunction(a,r):typeof a=="object"&&a?this._updateProperties(t[s],o,a,r):(a=this._handleRelativeValue(o,a),typeof a=="number"&&(t[s]=o+(a-o)*r))}},e.prototype._handleRelativeValue=function(t,n){return typeof n!="string"?n:n.charAt(0)==="+"||n.charAt(0)==="-"?t+parseFloat(n):parseFloat(n)},e.prototype._swapEndStartRepeatValues=function(t){var n=this._valuesStartRepeat[t],i=this._valuesEnd[t];typeof i=="string"?this._valuesStartRepeat[t]=this._valuesStartRepeat[t]+parseFloat(i):this._valuesStartRepeat[t]=this._valuesEnd[t],this._valuesEnd[t]=n},e.autoStartOnUpdate=!1,e})();var _z=Zv.nextId,vi=tp,vz=vi.getAll.bind(vi),yz=vi.removeAll.bind(vi),xz=vi.add.bind(vi),bz=vi.remove.bind(vi),Mz=vi.update.bind(vi);var ip="http://www.w3.org/1999/xhtml",Kv={svg:"http://www.w3.org/2000/svg",xhtml:ip,xlink:"http://www.w3.org/1999/xlink",xml:"http://www.w3.org/XML/1998/namespace",xmlns:"http://www.w3.org/2000/xmlns/"};function Jv(e){var t=e+="",n=t.indexOf(":");return n>=0&&(t=e.slice(0,n))!=="xmlns"&&(e=e.slice(n+1)),Kv.hasOwnProperty(t)?{space:Kv[t],local:e}:e}function HR(e){return function(){var t=this.ownerDocument,n=this.namespaceURI;return n===ip&&t.documentElement.namespaceURI===ip?t.createElement(e):t.createElementNS(n,e)}}function GR(e){return function(){return this.ownerDocument.createElementNS(e.space,e.local)}}function Qv(e){var t=Jv(e);return(t.local?GR:HR)(t)}function WR(){}function ty(e){return e==null?WR:function(){return this.querySelector(e)}}function jR(e){typeof e!="function"&&(e=ty(e));for(var t=this._groups,n=t.length,i=new Array(n),r=0;r<n;++r)for(var s=t[r],o=s.length,a=i[r]=new Array(o),c,l,u=0;u<o;++u)(c=s[u])&&(l=e.call(c,c.__data__,u,s))&&("__data__"in c&&(l.__data__=c.__data__),a[u]=l);return new Cn(i,this._parents)}function qR(e){return e==null?[]:Array.isArray(e)?e:Array.from(e)}function XR(){return[]}function $R(e){return e==null?XR:function(){return this.querySelectorAll(e)}}function YR(e){return function(){return qR(e.apply(this,arguments))}}function ZR(e){typeof e=="function"?e=YR(e):e=$R(e);for(var t=this._groups,n=t.length,i=[],r=[],s=0;s<n;++s)for(var o=t[s],a=o.length,c,l=0;l<a;++l)(c=o[l])&&(i.push(e.call(c,c.__data__,l,o)),r.push(c));return new Cn(i,r)}function KR(e){return function(){return this.matches(e)}}function ey(e){return function(t){return t.matches(e)}}var JR=Array.prototype.find;function QR(e){return function(){return JR.call(this.children,e)}}function tP(){return this.firstElementChild}function eP(e){return this.select(e==null?tP:QR(typeof e=="function"?e:ey(e)))}var nP=Array.prototype.filter;function iP(){return Array.from(this.children)}function rP(e){return function(){return nP.call(this.children,e)}}function sP(e){return this.selectAll(e==null?iP:rP(typeof e=="function"?e:ey(e)))}function oP(e){typeof e!="function"&&(e=KR(e));for(var t=this._groups,n=t.length,i=new Array(n),r=0;r<n;++r)for(var s=t[r],o=s.length,a=i[r]=[],c,l=0;l<o;++l)(c=s[l])&&e.call(c,c.__data__,l,s)&&a.push(c);return new Cn(i,this._parents)}function ny(e){return new Array(e.length)}function aP(){return new Cn(this._enter||this._groups.map(ny),this._parents)}function Yh(e,t){this.ownerDocument=e.ownerDocument,this.namespaceURI=e.namespaceURI,this._next=null,this._parent=e,this.__data__=t}Yh.prototype={constructor:Yh,appendChild:function(e){return this._parent.insertBefore(e,this._next)},insertBefore:function(e,t){return this._parent.insertBefore(e,t)},querySelector:function(e){return this._parent.querySelector(e)},querySelectorAll:function(e){return this._parent.querySelectorAll(e)}};function cP(e){return function(){return e}}function lP(e,t,n,i,r,s){for(var o=0,a,c=t.length,l=s.length;o<l;++o)(a=t[o])?(a.__data__=s[o],i[o]=a):n[o]=new Yh(e,s[o]);for(;o<c;++o)(a=t[o])&&(r[o]=a)}function hP(e,t,n,i,r,s,o){var a,c,l=new Map,u=t.length,h=s.length,f=new Array(u),d;for(a=0;a<u;++a)(c=t[a])&&(f[a]=d=o.call(c,c.__data__,a,t)+"",l.has(d)?r[a]=c:l.set(d,c));for(a=0;a<h;++a)d=o.call(e,s[a],a,s)+"",(c=l.get(d))?(i[a]=c,c.__data__=s[a],l.delete(d)):n[a]=new Yh(e,s[a]);for(a=0;a<u;++a)(c=t[a])&&l.get(f[a])===c&&(r[a]=c)}function uP(e){return e.__data__}function fP(e,t){if(!arguments.length)return Array.from(this,uP);var n=t?hP:lP,i=this._parents,r=this._groups;typeof e!="function"&&(e=cP(e));for(var s=r.length,o=new Array(s),a=new Array(s),c=new Array(s),l=0;l<s;++l){var u=i[l],h=r[l],f=h.length,d=dP(e.call(u,u&&u.__data__,l,i)),m=d.length,_=a[l]=new Array(m),g=o[l]=new Array(m),p=c[l]=new Array(f);n(u,h,_,g,p,d,t);for(var b=0,x=0,v,M;b<m;++b)if(v=_[b]){for(b>=x&&(x=b+1);!(M=g[x])&&++x<m;);v._next=M||null}}return o=new Cn(o,i),o._enter=a,o._exit=c,o}function dP(e){return typeof e=="object"&&"length"in e?e:Array.from(e)}function pP(){return new Cn(this._exit||this._groups.map(ny),this._parents)}function mP(e,t,n){var i=this.enter(),r=this,s=this.exit();return typeof e=="function"?(i=e(i),i&&(i=i.selection())):i=i.append(e+""),t!=null&&(r=t(r),r&&(r=r.selection())),n==null?s.remove():n(s),i&&r?i.merge(r).order():r}function gP(e){for(var t=e.selection?e.selection():e,n=this._groups,i=t._groups,r=n.length,s=i.length,o=Math.min(r,s),a=new Array(r),c=0;c<o;++c)for(var l=n[c],u=i[c],h=l.length,f=a[c]=new Array(h),d,m=0;m<h;++m)(d=l[m]||u[m])&&(f[m]=d);for(;c<r;++c)a[c]=n[c];return new Cn(a,this._parents)}function _P(){for(var e=this._groups,t=-1,n=e.length;++t<n;)for(var i=e[t],r=i.length-1,s=i[r],o;--r>=0;)(o=i[r])&&(s&&o.compareDocumentPosition(s)^4&&s.parentNode.insertBefore(o,s),s=o);return this}function vP(e){e||(e=yP);function t(h,f){return h&&f?e(h.__data__,f.__data__):!h-!f}for(var n=this._groups,i=n.length,r=new Array(i),s=0;s<i;++s){for(var o=n[s],a=o.length,c=r[s]=new Array(a),l,u=0;u<a;++u)(l=o[u])&&(c[u]=l);c.sort(t)}return new Cn(r,this._parents).order()}function yP(e,t){return e<t?-1:e>t?1:e>=t?0:NaN}function xP(){var e=arguments[0];return arguments[0]=this,e.apply(null,arguments),this}function bP(){return Array.from(this)}function MP(){for(var e=this._groups,t=0,n=e.length;t<n;++t)for(var i=e[t],r=0,s=i.length;r<s;++r){var o=i[r];if(o)return o}return null}function SP(){let e=0;for(let t of this)++e;return e}function wP(){return!this.node()}function EP(e){for(var t=this._groups,n=0,i=t.length;n<i;++n)for(var r=t[n],s=0,o=r.length,a;s<o;++s)(a=r[s])&&e.call(a,a.__data__,s,r);return this}function TP(e){return function(){this.removeAttribute(e)}}function AP(e){return function(){this.removeAttributeNS(e.space,e.local)}}function CP(e,t){return function(){this.setAttribute(e,t)}}function RP(e,t){return function(){this.setAttributeNS(e.space,e.local,t)}}function PP(e,t){return function(){var n=t.apply(this,arguments);n==null?this.removeAttribute(e):this.setAttribute(e,n)}}function IP(e,t){return function(){var n=t.apply(this,arguments);n==null?this.removeAttributeNS(e.space,e.local):this.setAttributeNS(e.space,e.local,n)}}function DP(e,t){var n=Jv(e);if(arguments.length<2){var i=this.node();return n.local?i.getAttributeNS(n.space,n.local):i.getAttribute(n)}return this.each((t==null?n.local?AP:TP:typeof t=="function"?n.local?IP:PP:n.local?RP:CP)(n,t))}function iy(e){return e.ownerDocument&&e.ownerDocument.defaultView||e.document&&e||e.defaultView}function LP(e){return function(){this.style.removeProperty(e)}}function OP(e,t,n){return function(){this.style.setProperty(e,t,n)}}function NP(e,t,n){return function(){var i=t.apply(this,arguments);i==null?this.style.removeProperty(e):this.style.setProperty(e,i,n)}}function FP(e,t,n){return arguments.length>1?this.each((t==null?LP:typeof t=="function"?NP:OP)(e,t,n??"")):UP(this.node(),e)}function UP(e,t){return e.style.getPropertyValue(t)||iy(e).getComputedStyle(e,null).getPropertyValue(t)}function zP(e){return function(){delete this[e]}}function kP(e,t){return function(){this[e]=t}}function BP(e,t){return function(){var n=t.apply(this,arguments);n==null?delete this[e]:this[e]=n}}function VP(e,t){return arguments.length>1?this.each((t==null?zP:typeof t=="function"?BP:kP)(e,t)):this.node()[e]}function ry(e){return e.trim().split(/^|\s+/)}function sp(e){return e.classList||new sy(e)}function sy(e){this._node=e,this._names=ry(e.getAttribute("class")||"")}sy.prototype={add:function(e){var t=this._names.indexOf(e);t<0&&(this._names.push(e),this._node.setAttribute("class",this._names.join(" ")))},remove:function(e){var t=this._names.indexOf(e);t>=0&&(this._names.splice(t,1),this._node.setAttribute("class",this._names.join(" ")))},contains:function(e){return this._names.indexOf(e)>=0}};function oy(e,t){for(var n=sp(e),i=-1,r=t.length;++i<r;)n.add(t[i])}function ay(e,t){for(var n=sp(e),i=-1,r=t.length;++i<r;)n.remove(t[i])}function HP(e){return function(){oy(this,e)}}function GP(e){return function(){ay(this,e)}}function WP(e,t){return function(){(t.apply(this,arguments)?oy:ay)(this,e)}}function jP(e,t){var n=ry(e+"");if(arguments.length<2){for(var i=sp(this.node()),r=-1,s=n.length;++r<s;)if(!i.contains(n[r]))return!1;return!0}return this.each((typeof t=="function"?WP:t?HP:GP)(n,t))}function qP(){this.textContent=""}function XP(e){return function(){this.textContent=e}}function $P(e){return function(){var t=e.apply(this,arguments);this.textContent=t??""}}function YP(e){return arguments.length?this.each(e==null?qP:(typeof e=="function"?$P:XP)(e)):this.node().textContent}function ZP(){this.innerHTML=""}function KP(e){return function(){this.innerHTML=e}}function JP(e){return function(){var t=e.apply(this,arguments);this.innerHTML=t??""}}function QP(e){return arguments.length?this.each(e==null?ZP:(typeof e=="function"?JP:KP)(e)):this.node().innerHTML}function t3(){this.nextSibling&&this.parentNode.appendChild(this)}function e3(){return this.each(t3)}function n3(){this.previousSibling&&this.parentNode.insertBefore(this,this.parentNode.firstChild)}function i3(){return this.each(n3)}function r3(e){var t=typeof e=="function"?e:Qv(e);return this.select(function(){return this.appendChild(t.apply(this,arguments))})}function s3(){return null}function o3(e,t){var n=typeof e=="function"?e:Qv(e),i=t==null?s3:typeof t=="function"?t:ty(t);return this.select(function(){return this.insertBefore(n.apply(this,arguments),i.apply(this,arguments)||null)})}function a3(){var e=this.parentNode;e&&e.removeChild(this)}function c3(){return this.each(a3)}function l3(){var e=this.cloneNode(!1),t=this.parentNode;return t?t.insertBefore(e,this.nextSibling):e}function h3(){var e=this.cloneNode(!0),t=this.parentNode;return t?t.insertBefore(e,this.nextSibling):e}function u3(e){return this.select(e?h3:l3)}function f3(e){return arguments.length?this.property("__data__",e):this.node().__data__}function d3(e){return function(t){e.call(this,t,this.__data__)}}function p3(e){return e.trim().split(/^|\s+/).map(function(t){var n="",i=t.indexOf(".");return i>=0&&(n=t.slice(i+1),t=t.slice(0,i)),{type:t,name:n}})}function m3(e){return function(){var t=this.__on;if(t){for(var n=0,i=-1,r=t.length,s;n<r;++n)s=t[n],(!e.type||s.type===e.type)&&s.name===e.name?this.removeEventListener(s.type,s.listener,s.options):t[++i]=s;++i?t.length=i:delete this.__on}}}function g3(e,t,n){return function(){var i=this.__on,r,s=d3(t);if(i){for(var o=0,a=i.length;o<a;++o)if((r=i[o]).type===e.type&&r.name===e.name){this.removeEventListener(r.type,r.listener,r.options),this.addEventListener(r.type,r.listener=s,r.options=n),r.value=t;return}}this.addEventListener(e.type,s,n),r={type:e.type,name:e.name,value:t,listener:s,options:n},i?i.push(r):this.__on=[r]}}function _3(e,t,n){var i=p3(e+""),r,s=i.length,o;if(arguments.length<2){var a=this.node().__on;if(a){for(var c=0,l=a.length,u;c<l;++c)for(r=0,u=a[c];r<s;++r)if((o=i[r]).type===u.type&&o.name===u.name)return u.value}return}for(a=t?g3:m3,r=0;r<s;++r)this.each(a(i[r],t,n));return this}function cy(e,t,n){var i=iy(e),r=i.CustomEvent;typeof r=="function"?r=new r(t,n):(r=i.document.createEvent("Event"),n?(r.initEvent(t,n.bubbles,n.cancelable),r.detail=n.detail):r.initEvent(t,!1,!1)),e.dispatchEvent(r)}function v3(e,t){return function(){return cy(this,e,t)}}function y3(e,t){return function(){return cy(this,e,t.apply(this,arguments))}}function x3(e,t){return this.each((typeof t=="function"?y3:v3)(e,t))}function*b3(){for(var e=this._groups,t=0,n=e.length;t<n;++t)for(var i=e[t],r=0,s=i.length,o;r<s;++r)(o=i[r])&&(yield o)}var ly=[null];function Cn(e,t){this._groups=e,this._parents=t}function M3(){return new Cn([[document.documentElement]],ly)}function S3(){return this}Cn.prototype=M3.prototype={constructor:Cn,select:jR,selectAll:ZR,selectChild:eP,selectChildren:sP,filter:oP,data:fP,enter:aP,exit:pP,join:mP,merge:gP,selection:S3,order:_P,sort:vP,call:xP,nodes:bP,node:MP,size:SP,empty:wP,each:EP,attr:DP,style:FP,property:VP,classed:jP,text:YP,html:QP,raise:e3,lower:i3,append:r3,insert:o3,remove:c3,clone:u3,datum:f3,on:_3,dispatch:x3,[Symbol.iterator]:b3};function hy(e){return typeof e=="string"?new Cn([[document.querySelector(e)]],[document.documentElement]):new Cn([[e]],ly)}var w3=0;function E3(){return new rp}function rp(){this._="@"+(++w3).toString(36)}rp.prototype=E3.prototype={constructor:rp,get:function(e){for(var t=this._;!(t in e);)if(!(e=e.parentNode))return;return e[t]},set:function(e,t){return e[this._]=t},remove:function(e){return this._ in e&&delete e[this._]},toString:function(){return this._}};function T3(e){let t;for(;t=e.sourceEvent;)e=t;return e}function uy(e,t){if(e=T3(e),t===void 0&&(t=e.currentTarget),t){var n=t.ownerSVGElement||t;if(n.createSVGPoint){var i=n.createSVGPoint();return i.x=e.clientX,i.y=e.clientY,i=i.matrixTransform(t.getScreenCTM().inverse()),[i.x,i.y]}if(t.getBoundingClientRect){var r=t.getBoundingClientRect();return[e.clientX-r.left-t.clientLeft,e.clientY-r.top-t.clientTop]}}return[e.pageX,e.pageY]}var Te,py,cp,ur,op,tu,my,Kh,gy,lp,ap,A3,Ta=Symbol.for("pv"),eu={},nu=[],C3=/^m(i|n|o|s|text|space)$/,hp=Array.isArray,up=nu.slice,fr=Object.assign;function Xr(e){e&&e.parentNode&&e.remove()}function fp(e,t,n){var i,r,s,o=fr({},e.props),a=arguments.length;for(s in t)s=="key"?i=t[s]:s=="ref"&&typeof e.type!="function"?r=t[s]:o[s]=t[s];return a>2&&(o.children=a>3?up.call(arguments,2):n),Ea(e.type,o,i!==void 0?i:e.key,r!==void 0?r:e.ref,null)}function Ea(e,t,n,i,r){var s={type:e,props:t,key:n,ref:i,__k:null,__:null,__b:0,__e:null,__c:null,constructor:Ta,__v:r||++py,__i:-1,__u:0};return!r&&Te.vnode&&Te.vnode(s),s}function iu(e){return e.children}function Jh(e,t){this.props=e,this.context=t,this.__g=0}function dr(e,t){if(t==null)return e.__&&dr(e.__,e.__i+1);for(var n;t<e.__k.length;t++)if((n=e.__k[t])&&n.__e)return n.__e;return typeof e.type!="function"||e.props.__P?null:dr(e)}function R3(e){var t,n=e.__v,i=n.__e,r=[],s=[],o=e.__P;o&&((t=fr({constructor:Ta},n)).__v=n.__v+1,Te.vnode&&Te.vnode(t),dp(o,t,n,e.__n,o.namespaceURI,32&n.__u?[i]:null,r,i||dr(n),32&n.__u,s),t.__v=n.__v,t.__.__k[t.__i]=t,My(r,t,s),n.__=n.__e=null,t.__e!=i&&_y(t))}function _y(e){if((e=e.__)&&e.__c&&!e.props.__P)return e.__e=null,e.__k.some(function(t){return t&&(e.__e=t.__e)}),_y(e)}function fy(e){(8&e.__g||(e.__g|=8,ur.push(e),tu++))&&op==Te.debounceRendering||((op=Te.debounceRendering)||queueMicrotask)(vy)}function vy(){try{for(var e,t=1;ur.length;)ur.length>t&&ur.sort(my),e=ur.shift(),t=ur.length,8&e.__g&&R3(e)}finally{(tu=ur.length)&&(op||queueMicrotask)(vy)}}function yy(e,t,n,i,r,s,o,a,c,l,u){var h,f,d,m,_,g,p=i.__k||nu,b=t.length;for(c=P3(n,t,p,c,b),h=0;h<b;h++)(d=n.__k[h])!=null&&(f=~d.__i&&p[d.__i]||eu,d.__i=h,g=dp(e,d,f,r,s,o,a,c,l,u),m=d.__e,(f.ref!=d.ref||8&f.__u)&&(f.ref&&pp(f.ref,null,d,f),d.ref&&u.push(d.ref,d.__c||m,d)),_=_||m,4&d.__u?(c=xy(d,c,e,!f.__v),f.__e&&(f.__e=null)):typeof d.type=="function"&&g!==void 0?c=g:m&&(c=m.nextSibling),d.__u&=-21);return n.__e=_,c}function P3(e,t,n,i,r){var s,o,a,c,l,u,h,f,d,m=n.length,_=m,g=0,p=0,b=e.__k=Array(r);for(s=0;s<r;s++)(o=t[s])!=null&&typeof o!="boolean"&&typeof o!="function"?(typeof o!="object"||o.constructor===String?o=b[s]=Ea(null,o):hp(o)?o=b[s]=Ea(iu,{children:o}):o.constructor===Ta&&o.__b?o=b[s]=Ea(o.type,o.props,o.key,o.ref,o.__v):b[s]=o,c=s+g,o.__=e,o.__b=e.__b+1,a=null,~(l=o.__i=I3(o,n,c,_))&&(_--,(a=n[l])&&(a.__u|=2)),a&&a.__v?(o.__u|=16,l==c-1?g--:l==c+1?g++:l!=c&&(l>c?g--:g++,p=1)):(~l||(r>m?g--:r<m&&g++),typeof o.type!="function"&&(o.__u|=4))):b[s]=null;if(p){for(u=[],h=[],s=0;s<r;s++)if((o=b[s])&&16&o.__u){for(g=0,f=u.length;g<f;)u[d=g+f>>1]<o.__i?g=d+1:f=d;u[g]=o.__i,h[s]=g+1}for(g=u.length;s--;)h[s]&&(h[s]==g?g--:b[s].__u|=4)}if(_)for(s=0;s<m;s++)!(a=n[s])||2&a.__u||(a.__e==i&&(i=dr(a)),mp(a,a));return i}function xy(e,t,n,i){var r,s,o,a;if(typeof e.type=="function"){if(e.props.__P)return t;if(r=e.__k)for(s=0;s<r.length;s++)r[s]&&(r[s].__=e,t=xy(r[s],t,n,!1));return t}for(t&&!t.parentNode&&(t=dr(e))&&!t.parentNode&&(t=null),o=e.__e,a=t;a&&a.nodeType==8;)a=a.nextSibling;for(o!=a&&(!i&&n.moveBefore&&o.parentNode?n.moveBefore(o,t):n.insertBefore(o,t||null)),t=o;(t=t&&t.nextSibling)&&t.nodeType==8&&!t.data.startsWith("$s"););return t}function I3(e,t,n,i){var r,s=e.key,o=e.type,a=t[n],c=a&&!(2&a.__u);if(a===null&&s==null||c&&s==a.key&&o==a.type)return n;if(i>(c?1:0)){for(r=n-1;r>=0;r--)if((a=t[r])&&!(2&a.__u)&&s==a.key&&o==a.type)return r;for(r=n+1;r<t.length;r++)if((a=t[r])&&!(2&a.__u)&&s==a.key&&o==a.type)return r}return-1}function dy(e,t,n){n==null&&(n=""),t[0]=="-"?e.setProperty(t,n):e[t]=n}function Zh(e,t,n,i,r){var s,o;if(t=="style")if(typeof n=="string")e.style.cssText=n;else{if(typeof i=="string"&&(e.style.cssText=i=""),i)for(t in i)n&&t in n||dy(e.style,t);if(n)for(t in n)i&&n[t]==i[t]||dy(e.style,t,n[t])}else if(t[0]=="o"&&t[1]=="n")typeof n!="function"&&(n=null),typeof i!="function"&&(i=null),(e.__e||(e.__e={}))[t]=n,n&&i||(o=ap[t]||(ap[t]=D3(t)),(e.__a||(e.__a={}))[t]=lp,s=t!=(t=t.replace(gy,"$1")),(t=t.slice(2))[0]<"a"&&(t=t.toLowerCase()),n?e.addEventListener(t,o,s):e.removeEventListener(t,o,s));else{if(r=="http://www.w3.org/2000/svg")t=t.replace(/xlink(H|:h)/,"h").replace(/sName$/,"s");else if(t!="width"&&t!="height"&&t!="href"&&t!="list"&&t!="form"&&t!="tabIndex"&&t!="download"&&t!="rowSpan"&&t!="colSpan"&&t!="role"&&t!="popover"&&t in e)try{return void(e[t]=n??"")}catch{}if(typeof n=="function")return;n==null||n===!1&&t[4]!="-"?e.removeAttribute(t):e.setAttribute(t,t=="popover"&&n==1?"":n)}}function D3(e){return function(t){var n=this.__e;if(n){if(n=n[e],t[Kh]==null)t[Kh]=lp++;else if(t[Kh]<this.__a[e])return;return n(Te.event?Te.event(t):t)}}}function dp(e,t,n,i,r,s,o,a,c,l){var u,h,f,d,m,_,g,p,b,x,v,M,S,C,P,T,w,R,V=t.type;if(t.constructor!==Ta)return null;128&n.__u&&(c=32&n.__u,u=n.__c.__z)&&(t.__u|=c,h=s=[],u.nodeType==8?a=Qh(u,s):s.push(u),a=s[0]||a),(u=Te.__b)&&u(t);t:if(typeof V=="function"){f=o.length;try{if(p=t.props,b=(u=V.prototype)&&u.render,x=(u=V.contextType)&&i[u.__c],v=u?x?x.props.value:u.__:i,(d=n.__c)?(t.__c=d,2&d.__g&&(d.__g|=1)):(b?t.__c=d=new V(p,v):(t.__c=d=new Jh(p,v),d.constructor=V,d.render=O3),x&&x.sub(d),d.state||(d.state={}),d.__n=i,d.__g|=8,d.__h=[],d.__k=[]),b&&(d.__s||(d.__s=d.state),V.getDerivedStateFromProps&&(d.__s==d.state&&(d.__s=fr({},d.__s)),fr(d.__s,V.getDerivedStateFromProps(p,d.__s)))),m=d.props,_=d.state,d.__v=t,n.__c){if(p!==m&&b&&!V.getDerivedStateFromProps&&d.componentWillReceiveProps&&d.componentWillReceiveProps(p,v),t.__v==n.__v&&!(8&d.__g)||!(4&d.__g)&&d.shouldComponentUpdate&&d.shouldComponentUpdate(p,d.__s,v)===!1){t.__v!=n.__v&&(d.props=p,d.state=d.__s,d.__g&=-9),t.__e=n.__e,t.__k=n.__k,t.__k.some(function(N){N&&(N.__=t)}),nu.push.apply(d.__h,d.__k),d.__k=[],d.__h.length&&o.push(d),a=dr(n);break t}d.componentWillUpdate&&d.componentWillUpdate(p,d.__s,v),b&&d.componentDidUpdate&&d.__h.push(function(){d.componentDidUpdate(m,_,g)})}else b&&!V.getDerivedStateFromProps&&d.componentWillMount&&d.componentWillMount(),b&&d.componentDidMount&&d.__h.push(d.componentDidMount);d.context=v,d.props=p,d.__P=e,d.__g&=-5,M=Te.__r,S=b?25:0;do d.__g&=-9,M&&M(t),u=d.render(d.props,d.state=d.__s,d.context);while(8&d.__g&&++S<25);b&&(nu.push.apply(d.__h,d.__k),d.__k=[]),d.state=d.__s,d.getChildContext&&(i=fr({},i,d.getChildContext())),b&&n.__c&&d.getSnapshotBeforeUpdate&&(g=d.getSnapshotBeforeUpdate(m,_)),C=u&&u.type===iu&&u.key==null?u.props.children:u,p.__P&&(u=a,r=(e=p.__P).namespaceURI,c=s=null,n.props&&n.props.__P!=e&&(n.__k.some(function(N){N&&mp(N,N)}),n.__k=null),a=n.__k?dr(n,0):null),a=yy(e,hp(C)?C:[C],t,n,i,r,s,o,a,c,l),p.__P&&(t.__e=null,a=u),t.__u&=-161,h&&h.some(Xr),d.__h.length&&o.push(d),1&d.__g&&(d.__g&=-4)}catch(N){if(o.length=f,t.__v=null,c||s)if(N&&N.then){if(t.__u|=128|c,s){for(~(w=s.indexOf(a||void 0))||(w=s.length);(R=s[w-1])&&R.nodeType==8;)w--;for(;w<s.length;w++)if(R=s[w])if(s[w]=null,P){if(R==T)break}else{if(R.nodeType!=8)break;R.data.startsWith("$s")&&(T=Qh(P=R))}}if(!P){for(;a&&a.nodeType==8&&a.nextSibling;)a=a.nextSibling;P=a}(u=Qh(P=t.__c.__z||(t.__c.__z=P)))?(t.__e=P,a=u):t.__e=a,a=a&&a.nextSibling}else s&&s.some(Xr);else t.__e=n.__e;t.__k||(t.__k=n.__k||[]),N&&N.then||by(t),Te.__e(N,t,n)}}else a=t.__e=L3(n.__e,t,n,i,r,s,o,c,l,e);return(u=Te.diffed)&&u(t),a}function Qh(e,t){if(e&&e.nodeType==8&&e.data.startsWith("$s"))for(var n=1;e=e.nextSibling;){if(e.nodeType==8){if(e.data.startsWith("$s"))n++;else if(e.data.startsWith("/$s")&&!--n)return e}t&&t.push(e)}}function by(e){e&&(e.__c&&(e.__c.__g|=4),e.__k&&e.__k.some(by))}function My(e,t,n){for(var i=0;i<n.length;)pp(n[i++],n[i++],n[i++]);Te.__c&&Te.__c(t,e),e.some(function(r){try{e=r.__h,r.__h=[],e.some(function(s){s.call(r)})}catch(s){Te.__e(s,r.__v)}})}function L3(e,t,n,i,r,s,o,a,c,l){var u,h,f,d,m,_,g,p,b=n.props||eu,x=t.props,v=t.type;if(v=="svg"?r="http://www.w3.org/2000/svg":v=="math"?r="http://www.w3.org/1998/Math/MathML":r||(r="http://www.w3.org/1999/xhtml"),s){for(u=0;u<s.length;u++)if((m=s[u])&&(v?m.localName==v:m.nodeType==3)){e=m,s[u]=null;break}}if(!e){if(p=l.ownerDocument||document,!v)return p.createTextNode(x);e=p.createElementNS(r,v,x.is?x:l),a&&(Te.__m&&Te.__m(t,s),a=!1),s=null}if(v){if(l=v=="template"&&e.content||e,s=v=="textarea"&&x.defaultValue!=null?null:s&&up.call(l.childNodes),!a&&s)for(b={},u=0;u<e.attributes.length;u++)b[(m=e.attributes[u]).name]=m.value;for(u in b)m=b[u],u=="dangerouslySetInnerHTML"?f=m:u=="children"||u in x||u=="value"&&"defaultValue"in x||u=="checked"&&"defaultChecked"in x||Zh(e,u,null,m,r);for(u in x)m=x[u],u=="children"?d=m:u=="dangerouslySetInnerHTML"?h=m:u=="value"?_=m:u=="checked"?g=m:a&&typeof m!="function"||b[u]===m||Zh(e,u,m,b[u],r);h?(a||f&&(h.__html==f.__html||h.__html==e.innerHTML)||(e.innerHTML=h.__html),t.__k=[]):(f&&(e.textContent=""),(v=="foreignObject"||r=="http://www.w3.org/1998/Math/MathML"&&C3.test(v))&&(r="http://www.w3.org/1999/xhtml"),yy(l,hp(d)?d:[d],t,n,i,r,s,o,s?s[0]:n.__k&&dr(n,0),a,c),s&&s.some(Xr)),a&&v!="textarea"||(u="value",v=="progress"&&_==null?e.removeAttribute(u):_==null||_===e[u]&&(v!="progress"||_)||Zh(e,u,_,b[u],r),u="checked",g!=null&&g!=e[u]&&Zh(e,u,g,b[u],r))}else b===x||a&&e.data==x||(e.data=x);return e}function pp(e,t,n,i){try{typeof e=="function"?t?t.__x=e(t)||1:i&&(i=i.__c||i.__e)&&(t=i.__x)&&(i.__x=null,typeof t=="function"?t():e(null)):e.current=t}catch(r){Te.__e(r,n)}}function mp(e,t,n){var i,r,s,o;if(Te.unmount&&Te.unmount(e),!(i=e.ref)||i.current&&i.current!=e.__e||pp(i,null,t,e),i=e.__c){if(i.componentWillUnmount)try{i.componentWillUnmount()}catch(a){Te.__e(a,t)}i.__P=i.__n=null}if(i=e.__k)for(o=0;o<i.length;o++)i[o]&&mp(i[o],t,typeof e.type!="function"||n&&!e.props.__P);!n&&(i=e.__c)&&(i=i.__z)&&(r=Qh(i,s=[]))&&(i==e.__e&&s.some(Xr),Xr(r),Xr(i)),n||Xr(e.__e),e.__e=e.__c=e.__=null}function O3(e,t,n){return this.constructor(e,n)}function Sy(e,t){var n,i,r,s;Te.__&&Te.__(e,t),t.nodeType==9&&(t=t.documentElement),i=(n=e&&32&e.__u)?null:t.__k,t.__k=Ea(iu,{children:[e]}),r=[],s=[],dp(t,t.__k,i||eu,eu,t.namespaceURI,i?null:t.firstChild?up.call(t.childNodes):null,r,i?i.__e:t.firstChild,n,s),My(r,t.__k,s),t.__k.props.children=null}Te={__e:function(e,t,n,i){for(var r,s,o;t=t.__;)if((r=t.__c)&&!(1&r.__g)){r.__g|=4;try{if((o=(s=r.constructor)&&s.getDerivedStateFromError)&&r.setState(s.getDerivedStateFromError(e)),r.componentDidCatch&&(r.componentDidCatch(e,i||{}),o=1),o&&8&r.__g)return void(r.__g|=2)}catch(a){e=a}}throw tu=0,e}},py=0,cp=function(e){return e!=null&&e.constructor===Ta},Jh.prototype.setState=function(e,t){var n=this.__s;n&&n!=this.state||(n=this.__s=fr({},this.state)),typeof e=="function"&&(e=e(fr({},n),this.props)),e&&(fr(n,e),this.__v&&(t&&this.__k.push(t),fy(this)))},Jh.prototype.forceUpdate=function(e){this.__v&&(this.__g|=4,e&&this.__h.push(e),fy(this))},Jh.prototype.render=iu,ur=[],tu=0,my=function(e,t){return e.__v.__b-t.__v.__b},Kh=Symbol(),gy=/(PointerCapture)$|Capture$/i,lp=0,ap={},A3=0;var gp=e=>{if(typeof e!="object")return e;let t=fp(e);return t.props&&(t.props={...t.props},t?.props?.children&&(t.props.children=Array.isArray(t.props.children)?t.props.children.map(gp):gp(t.props.children))),t},N3=e=>cp(fp(e)),F3=(e,t)=>{delete t.__k,Sy(gp(e),t)};var wy=nr({props:{content:{default:!1},offsetX:{triggerUpdate:!1},offsetY:{triggerUpdate:!1}},methods:{positionFromEvent(e,t){let n=e.container,i=uy(t,n),r=n.offsetWidth,s=n.offsetHeight,o=[e.offsetX===null||e.offsetX===void 0?`-${i[0]/r*100}%`:typeof e.offsetX=="number"?`calc(-50% + ${e.offsetX}px)`:e.offsetX,e.offsetY===null||e.offsetY===void 0?s>130&&s-i[1]<100?"calc(-100% - 6px)":"21px":typeof e.offsetY=="number"?e.offsetY<0?`calc(-100% - ${Math.abs(e.offsetY)}px)`:`${e.offsetY}px`:e.offsetY];return e.tooltipEl.style("left",i[0]+"px").style("top",i[1]+"px").style("transform",`translate(${o.join(",")})`),this}},init:function(e,t,{style:n={}}={}){let i=!!e&&typeof e=="object"&&!!e.node&&typeof e.node=="function",r=hy(i?e.node():e);t.container=r.node(),r.style("position")==="static"&&r.style("position","relative"),t.tooltipEl=r.append("div").attr("class","float-tooltip-kap"),Object.entries(n).forEach(([o,a])=>t.tooltipEl.style(o,a)),t.tooltipEl.style("left","-10000px").style("display","none");let s=`tooltip-${Math.round(Math.random()*1e12)}`;t.mouseInside=!1,r.on(`mousemove.${s}`,o=>{t.mouseInside=!0,this.positionFromEvent(o),t.content&&t.tooltipEl.style("display","inline")}),r.on(`mouseover.${s}`,()=>{t.mouseInside=!0,t.content&&t.tooltipEl.style("display","inline")}),r.on(`mouseout.${s}`,()=>{t.mouseInside=!1,t.tooltipEl.style("display","none")})},update:function(e){e.tooltipEl.style("display",e.content&&e.mouseInside?"inline":"none"),e.content?e.content instanceof HTMLElement?(e.tooltipEl.text(""),e.tooltipEl.append(()=>e.content)):typeof e.content=="string"?e.tooltipEl.html(e.content):N3(e.content)?(e.tooltipEl.text(""),F3(e.content,e.tooltipEl.node())):(e.tooltipEl.style("display","none"),console.warn("Tooltip content is invalid, skipping.",e.content,e.content.toString())):e.tooltipEl.text("")}});var Ey=e=>{e instanceof Array?e.forEach(Ey):(e.map&&e.map.dispose(),e.dispose())},Ty=e=>{e.geometry&&e.geometry.dispose(),e.material&&Ey(e.material),e.texture&&e.texture.dispose(),e.children&&e.children.forEach(Ty)},U3=e=>{for(;e.children.length;){let t=e.children[0];e.remove(t),Ty(t)}},re=window.THREE?window.THREE:{WebGLRenderer:eh,Scene:Do,PerspectiveCamera:Ge,Raycaster:Ii,SRGBColorSpace:He,TextureLoader:qo,Vector2:et,Vector3:I,Box3:fn,Color:Ot,Mesh:we,SphereGeometry:Pi,MeshBasicMaterial:bn,BackSide:We,Timer:Zo},_p=nr({props:{width:{default:window.innerWidth,onChange(e,t,n){isNaN(e)&&(t.width=n)}},height:{default:window.innerHeight,onChange(e,t,n){isNaN(e)&&(t.height=n)}},viewOffset:{default:[0,0]},backgroundColor:{default:"#000011"},backgroundImageUrl:{},onBackgroundImageLoaded:{},showNavInfo:{default:!0},skyRadius:{default:5e4},objects:{default:[]},lights:{default:[]},enablePointerInteraction:{default:!0,onChange(e,t){t.hoverObj=null,t.tooltip&&t.tooltip.content(null)},triggerUpdate:!1},pointerRaycasterThrottleMs:{default:50,triggerUpdate:!1},lineHoverPrecision:{default:1,triggerUpdate:!1},pointsHoverPrecision:{default:1,triggerUpdate:!1},hoverOrderComparator:{triggerUpdate:!1},hoverFilter:{default:()=>!0,triggerUpdate:!1},tooltipContent:{triggerUpdate:!1},hoverDuringDrag:{default:!1,triggerUpdate:!1},clickAfterDrag:{default:!1,triggerUpdate:!1},onHover:{default:()=>{},triggerUpdate:!1},onClick:{default:()=>{},triggerUpdate:!1},onRightClick:{triggerUpdate:!1}},methods:{tick:function(e){if(e.initialised){e.controls.enabled&&e.controls.update?.(Math.min(1,e.timer.update().getDelta())),e.postProcessingComposer?e.postProcessingComposer.render():e.renderer.render(e.scene,e.camera),e.extraRenderers.forEach(n=>n.render(e.scene,e.camera));let t=+new Date;if(e.enablePointerInteraction&&t-e.lastRaycasterCheck>=e.pointerRaycasterThrottleMs){e.lastRaycasterCheck=t;let n=null;if(e.hoverDuringDrag||!e.isPointerDragging){let i=this.intersectingObjects(e.pointerPos.x,e.pointerPos.y);e.hoverOrderComparator&&i.sort((s,o)=>e.hoverOrderComparator(s.object,o.object,s,o));let r=i.find(s=>e.hoverFilter(s.object))||null;n=r?r.object:null,e.intersection=r||null}n!==e.hoverObj&&(e.onHover(n,e.hoverObj,e.intersection),e.tooltip.content(n&&Zt(e.tooltipContent)(n,e.intersection)||null),e.hoverObj=n)}e.tweenGroup.update()}return this},getPointerPos:function(e){let{x:t,y:n}=e.pointerPos;return{x:t,y:n}},cameraPosition:function(e,t,n,i){let r=e.camera;if(t&&e.initialised){let c=t,l=n||{x:0,y:0,z:0};if(e.povPosTween?.end(),e.povTgtTween?.end(),!i)s(c),o(l);else{let u=Object.assign({},r.position),h=a();e.tweenGroup.add(e.povPosTween=new np(u).to(c,i).easing(hr.Quadratic.Out).onUpdate(s).onComplete(function(){e.povPosTween=void 0,e.tweenGroup.remove(this)}).start()),e.tweenGroup.add(e.povTgtTween=new np(h).to(l,i/3).easing(hr.Quadratic.Out).onUpdate(o).onComplete(function(){e.povTgtTween=void 0,e.tweenGroup.remove(this)}).start())}return this}return Object.assign({},r.position,{lookAt:a()});function s(c){let{x:l,y:u,z:h}=c;l!==void 0&&(r.position.x=l),u!==void 0&&(r.position.y=u),h!==void 0&&(r.position.z=h)}function o(c){let l=new re.Vector3(c.x,c.y,c.z);e.controls.enabled&&e.controls.target?e.controls.target=l:r.lookAt(l)}function a(){return Object.assign(new re.Vector3(0,0,-1e3).applyQuaternion(r.quaternion).add(r.position))}},zoomToFit:function(e,t=0,n=10,i,r){return this.fitToBbox(this.getBbox(i),t,n,r)},fitToBbox:function(e,t,n=0,i=10,r=!1){let s=e.camera;if(t){s.updateMatrixWorld();let o=new re.Vector3,a=new re.Vector3,c=new re.Vector3,l=new re.Vector3;s.getWorldPosition(l),s.getWorldDirection(c),o.crossVectors(c,s.up).normalize(),a.crossVectors(o,c).normalize();let h=(1-i*2/e.height)*s.fov/2*(Math.PI/180),f=Math.atan(Math.tan(h)*s.aspect),d=new re.Vector3((t.x[0]+t.x[1])/2,(t.y[0]+t.y[1])/2,(t.z[0]+t.z[1])/2),m=r?c.clone().multiplyScalar(l.distanceTo(d)).add(l):d,_=Math.max(0,...[new re.Vector3(t.x[0],t.y[0],t.z[0]),new re.Vector3(t.x[0],t.y[0],t.z[1]),new re.Vector3(t.x[0],t.y[1],t.z[0]),new re.Vector3(t.x[0],t.y[1],t.z[1]),new re.Vector3(t.x[1],t.y[0],t.z[0]),new re.Vector3(t.x[1],t.y[0],t.z[1]),new re.Vector3(t.x[1],t.y[1],t.z[0]),new re.Vector3(t.x[1],t.y[1],t.z[1])].map(b=>{let x=b.clone().sub(m);return Math.max(Math.abs(x.dot(a))/Math.tan(h),Math.abs(x.dot(o))/Math.tan(f))-x.dot(c)})),g=c.clone().negate(),p={x:m.x+g.x*_,y:m.y+g.y*_,z:m.z+g.z*_};this.cameraPosition(p,m,n)}return this},getBbox:function(e,t=()=>!0){let n=new re.Box3,i=e.objects.filter(t);return i.length?(i.forEach(r=>n.expandByObject(r)),Object.assign(...["x","y","z"].map(r=>({[r]:[n.min[r],n.max[r]]})))):null},getScreenCoords:function(e,t,n,i){let r=new re.Vector3(t,n,i);return r.project(this.camera()),{x:(r.x+1)*e.width/2,y:-(r.y-1)*e.height/2}},getSceneCoords:function(e,t,n,i=0){let r=new re.Vector2(t/e.width*2-1,-(n/e.height)*2+1),s=new re.Raycaster;return s.setFromCamera(r,e.camera),Object.assign({},s.ray.at(i,new re.Vector3))},intersectingObjects:function(e,t,n){let i=new re.Vector2(t/e.width*2-1,-(n/e.height)*2+1),r=new re.Raycaster;return r.params.Line.threshold=e.lineHoverPrecision,r.params.Points.threshold=e.pointsHoverPrecision,r.setFromCamera(i,e.camera),r.intersectObjects(e.objects,!0)},renderer:e=>e.renderer,scene:e=>e.scene,camera:e=>e.camera,postProcessingComposer:e=>e.postProcessingComposer,controls:e=>e.controls,_destructor:function(e){U3(e.scene),e.controls?.dispose(),e.renderer?.dispose(),e.postProcessingComposer?.dispose()}},stateInit:()=>({scene:new re.Scene,camera:new re.PerspectiveCamera,timer:new re.Timer,tweenGroup:new ep,lastRaycasterCheck:0}),init(e,t,{controlType:n="trackball",useWebGPU:i=!1,rendererConfig:r={},extraRenderers:s=[],waitForLoadComplete:o=!0}={}){e.innerHTML="",e.appendChild(t.container=document.createElement("div")),t.container.className="scene-container",t.container.style.position="relative",t.container.appendChild(t.navInfo=document.createElement("div")),t.navInfo.className="scene-nav-info",t.navInfo.textContent={orbit:"Left-click: rotate, Mouse-wheel/middle-click: zoom, Right-click: pan",trackball:"Left-click: rotate, Mouse-wheel/middle-click: zoom, Right-click: pan",arcball:"Left-click: rotate, Mouse-wheel/middle-click: zoom, Right-click: pan",fly:"WASD: move, R|F: up | down, Q|E: roll, up|down: pitch, left|right: yaw"}[n]||"",t.navInfo.style.display=t.showNavInfo?null:"none",t.tooltip=new wy(t.container),t.pointerPos=new re.Vector2,t.pointerPos.x=-2,t.pointerPos.y=-2,["pointermove","pointerdown"].forEach(a=>t.container.addEventListener(a,c=>{if(a==="pointerdown"&&(t.isPointerPressed=!0),!t.isPointerDragging&&c.type==="pointermove"&&(c.pressure>0||t.isPointerPressed)&&(c.pointerType==="mouse"||c.movementX===void 0||[c.movementX,c.movementY].some(u=>Math.abs(u)>1))&&(t.isPointerDragging=!0),t.enablePointerInteraction){let u=l(t.container);t.pointerPos.x=c.pageX-u.left,t.pointerPos.y=c.pageY-u.top}function l(u){let h=u.getBoundingClientRect(),f=window.pageXOffset||document.documentElement.scrollLeft,d=window.pageYOffset||document.documentElement.scrollTop;return{top:h.top+d,left:h.left+f}}},{passive:!0})),t.container.addEventListener("pointerup",a=>{t.isPointerPressed&&(t.isPointerPressed=!1,!(t.isPointerDragging&&(t.isPointerDragging=!1,!t.clickAfterDrag))&&requestAnimationFrame(()=>{a.button===0&&t.onClick(t.hoverObj||null,a,t.intersection),a.button===2&&t.onRightClick&&t.onRightClick(t.hoverObj||null,a,t.intersection)}))},{passive:!0,capture:!0}),t.container.addEventListener("contextmenu",a=>{t.onRightClick&&a.preventDefault()}),t.renderer=new(i?Ph:re.WebGLRenderer)(Object.assign({antialias:!0,alpha:!0},r)),t.renderer.setPixelRatio(Math.min(2,window.devicePixelRatio)),t.container.appendChild(t.renderer.domElement),t.extraRenderers=s,t.extraRenderers.forEach(a=>{a.domElement.style.position="absolute",a.domElement.style.top="0px",a.domElement.style.pointerEvents="none",t.container.appendChild(a.domElement)}),t.postProcessingComposer=new Gh(t.renderer),t.postProcessingComposer.addPass(new Wh(t.scene,t.camera)),t.controls=new(z3(n)?n:{trackball:Nh,arcball:Uh,orbit:kh,fly:Bh}[n])(t.camera,t.renderer.domElement),n==="fly"&&(t.controls.movementSpeed=300,t.controls.rollSpeed=Math.PI/6,t.controls.dragToLook=!0),(n==="trackball"||n==="arcball"||n==="orbit")&&(t.controls.minDistance=.1,t.controls.maxDistance=t.skyRadius,t.controls.addEventListener("start",()=>{t.controlsEngaged=!0}),t.controls.addEventListener("change",()=>{t.controlsEngaged&&(t.controlsDragging=!0)}),t.controls.addEventListener("end",()=>{t.controlsEngaged=!1,t.controlsDragging=!1}),t.renderer.domElement.style.cursor=null),[t.renderer,t.postProcessingComposer,...t.extraRenderers].forEach(a=>a.setSize(t.width,t.height)),t.camera.aspect=t.width/t.height,t.camera.updateProjectionMatrix(),t.camera.position.z=1e3,t.scene.add(t.skysphere=new re.Mesh),t.skysphere.visible=!1,t.loadComplete=t.scene.visible=!o},update(e,t){if(e.width&&e.height&&(t.hasOwnProperty("width")||t.hasOwnProperty("height"))){let i=e.width,r=e.height;e.container.style.width=`${i}px`,e.container.style.height=`${r}px`,[e.renderer,e.postProcessingComposer,...e.extraRenderers].forEach(o=>o.setSize(i,r)),e.camera.aspect=i/r;let s=e.viewOffset.slice(0,2);s.some(o=>o)&&e.camera.setViewOffset(i,r,...s,i,r),e.camera.updateProjectionMatrix()}if(t.hasOwnProperty("viewOffset")){let i=e.width,r=e.height,s=e.viewOffset.slice(0,2);s.some(o=>o)?e.camera.setViewOffset(i,r,...s,i,r):e.camera.clearViewOffset()}if(t.hasOwnProperty("skyRadius")&&e.skyRadius&&(e.controls.hasOwnProperty("maxDistance")&&t.skyRadius&&(e.controls.maxDistance=Math.min(e.controls.maxDistance,e.skyRadius)),e.camera.far=e.skyRadius*2.5,e.camera.updateProjectionMatrix(),e.skysphere.geometry=new re.SphereGeometry(e.skyRadius)),t.hasOwnProperty("backgroundColor")){let i=ar(e.backgroundColor).alpha;i===void 0&&(i=1),e.renderer.setClearColor(new re.Color(Yv(1,e.backgroundColor)),i)}t.hasOwnProperty("backgroundImageUrl")&&(e.backgroundImageUrl?new re.TextureLoader().load(e.backgroundImageUrl,i=>{i.colorSpace=re.SRGBColorSpace,e.skysphere.material=new re.MeshBasicMaterial({map:i,side:re.BackSide}),e.skysphere.visible=!0,e.onBackgroundImageLoaded&&setTimeout(e.onBackgroundImageLoaded),!e.loadComplete&&n()}):(e.skysphere.visible=!1,e.skysphere.material.map=null,!e.loadComplete&&n())),t.hasOwnProperty("showNavInfo")&&(e.navInfo.style.display=e.showNavInfo?null:"none"),t.hasOwnProperty("lights")&&((t.lights||[]).forEach(i=>e.scene.remove(i)),e.lights.forEach(i=>e.scene.add(i))),t.hasOwnProperty("objects")&&((t.objects||[]).forEach(i=>e.scene.remove(i)),e.objects.forEach(i=>e.scene.add(i)));function n(){e.loadComplete=e.scene.visible=!0}}});function z3(e){return typeof e=="function"&&Function.prototype.toString.call(e).startsWith("class")}function yp(e,t){(t==null||t>e.length)&&(t=e.length);for(var n=0,i=Array(t);n<t;n++)i[n]=e[n];return i}function k3(e){if(Array.isArray(e))return yp(e)}function Aa(e,t,n){return(t=G3(t))in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function B3(e){if(typeof Symbol<"u"&&e[Symbol.iterator]!=null||e["@@iterator"]!=null)return Array.from(e)}function V3(){throw new TypeError(`Invalid attempt to spread non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}function Ay(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(e);t&&(i=i.filter(function(r){return Object.getOwnPropertyDescriptor(e,r).enumerable})),n.push.apply(n,i)}return n}function ru(e){for(var t=1;t<arguments.length;t++){var n=arguments[t]!=null?arguments[t]:{};t%2?Ay(Object(n),!0).forEach(function(i){Aa(e,i,n[i])}):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):Ay(Object(n)).forEach(function(i){Object.defineProperty(e,i,Object.getOwnPropertyDescriptor(n,i))})}return e}function ou(e){return k3(e)||B3(e)||W3(e)||V3()}function H3(e,t){if(typeof e!="object"||!e)return e;var n=e[Symbol.toPrimitive];if(n!==void 0){var i=n.call(e,t);if(typeof i!="object")return i;throw new TypeError("@@toPrimitive must return a primitive value.")}return(t==="string"?String:Number)(e)}function G3(e){var t=H3(e,"string");return typeof t=="symbol"?t:t+""}function W3(e,t){if(e){if(typeof e=="string")return yp(e,t);var n={}.toString.call(e).slice(8,-1);return n==="Object"&&e.constructor&&(n=e.constructor.name),n==="Map"||n==="Set"?Array.from(e):n==="Arguments"||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)?yp(e,t):void 0}}function Cy(e,t){var n=new t;return n._destructor&&n._destructor(),{linkProp:function(r){return{default:n[r](),onChange:function(o,a){a[e][r](o)},triggerUpdate:!1}},linkMethod:function(r){return function(s){for(var o=s[e],a=arguments.length,c=new Array(a>1?a-1:0),l=1;l<a;l++)c[l-1]=arguments[l];var u=o[r].apply(o,c);return u===o?this:u}}}}var vp=window.THREE?window.THREE:{AmbientLight:Rr,DirectionalLight:$o,REVISION:"180"},j3=170,Ry=Cy("forceGraph",kd),q3=Object.assign.apply(Object,ou(["jsonUrl","graphData","numDimensions","dagMode","dagLevelDistance","dagNodeFilter","onDagError","nodeRelSize","nodeId","nodeVal","nodeResolution","nodeColor","nodeAutoColorBy","nodeOpacity","nodeVisibility","nodeThreeObject","nodeThreeObjectExtend","nodePositionUpdate","linkSource","linkTarget","linkVisibility","linkColor","linkAutoColorBy","linkOpacity","linkWidth","linkResolution","linkCurvature","linkCurveRotation","linkMaterial","linkThreeObject","linkThreeObjectExtend","linkPositionUpdate","linkDirectionalArrowLength","linkDirectionalArrowColor","linkDirectionalArrowRelPos","linkDirectionalArrowResolution","linkDirectionalParticles","linkDirectionalParticleSpeed","linkDirectionalParticleOffset","linkDirectionalParticleWidth","linkDirectionalParticleColor","linkDirectionalParticleResolution","linkDirectionalParticleThreeObject","forceEngine","d3AlphaDecay","d3VelocityDecay","d3AlphaMin","ngraphPhysics","warmupTicks","cooldownTicks","cooldownTime","onEngineTick","onEngineStop"].map(function(e){return Aa({},e,Ry.linkProp(e))}))),X3=Object.assign.apply(Object,ou(["refresh","getGraphBbox","d3Force","d3ReheatSimulation","emitParticle"].map(function(e){return Aa({},e,Ry.linkMethod(e))}))),su=Cy("renderObjs",_p),$3=Object.assign.apply(Object,ou(["width","height","backgroundColor","showNavInfo","enablePointerInteraction"].map(function(e){return Aa({},e,su.linkProp(e))}))),Y3=Object.assign.apply(Object,ou(["lights","cameraPosition","postProcessingComposer"].map(function(e){return Aa({},e,su.linkMethod(e))})).concat([{graph2ScreenCoords:su.linkMethod("getScreenCoords"),screen2GraphCoords:su.linkMethod("getSceneCoords")}])),Py=nr({props:ru(ru({nodeLabel:{default:"name",triggerUpdate:!1},linkLabel:{default:"name",triggerUpdate:!1},linkHoverPrecision:{default:1,onChange:function(t,n){return n.renderObjs.lineHoverPrecision(t)},triggerUpdate:!1},enableNavigationControls:{default:!0,onChange:function(t,n){var i=n.renderObjs.controls();i&&(i.enabled=t,t&&i.domElement&&i.domElement.dispatchEvent(new PointerEvent("pointerup")))},triggerUpdate:!1},enableNodeDrag:{default:!0,triggerUpdate:!1},onNodeDrag:{default:function(){},triggerUpdate:!1},onNodeDragEnd:{default:function(){},triggerUpdate:!1},onNodeClick:{triggerUpdate:!1},onNodeRightClick:{triggerUpdate:!1},onNodeHover:{triggerUpdate:!1},onLinkClick:{triggerUpdate:!1},onLinkRightClick:{triggerUpdate:!1},onLinkHover:{triggerUpdate:!1},onBackgroundClick:{triggerUpdate:!1},onBackgroundRightClick:{triggerUpdate:!1},showPointerCursor:{default:!0,triggerUpdate:!1}},q3),$3),methods:ru(ru({zoomToFit:function(t,n,i){for(var r,s=arguments.length,o=new Array(s>3?s-3:0),a=3;a<s;a++)o[a-3]=arguments[a];return t.renderObjs.fitToBbox((r=t.forceGraph).getGraphBbox.apply(r,o),n,i),this},pauseAnimation:function(t){return t.animationFrameRequestId!==null&&(cancelAnimationFrame(t.animationFrameRequestId),t.animationFrameRequestId=null),this},resumeAnimation:function(t){return t.animationFrameRequestId===null&&this._animationCycle(),this},_animationCycle:function(t){t.enablePointerInteraction&&(this.renderer().domElement.style.cursor=null),t.forceGraph.tickFrame(),t.renderObjs.tick(),t.animationFrameRequestId=requestAnimationFrame(this._animationCycle)},scene:function(t){return t.renderObjs.scene()},camera:function(t){return t.renderObjs.camera()},renderer:function(t){return t.renderObjs.renderer()},controls:function(t){return t.renderObjs.controls()},tbControls:function(t){return t.renderObjs.tbControls()},_destructor:function(){this.pauseAnimation(),this.graphData({nodes:[],links:[]})}},X3),Y3),stateInit:function(t){var n=t.controlType,i=t.rendererConfig,r=t.extraRenderers,s=new kd;return{forceGraph:s,renderObjs:_p({controlType:n,rendererConfig:i,extraRenderers:r}).objects([s]).lights([new vp.AmbientLight(13421772,Math.PI),new vp.DirectionalLight(16777215,.6*Math.PI)])}},init:function(t,n){t.innerHTML="",t.appendChild(n.container=document.createElement("div")),n.container.style.position="relative";var i=document.createElement("div");n.container.appendChild(i),n.renderObjs(i);var r=n.renderObjs.camera(),s=n.renderObjs.renderer(),o=n.renderObjs.controls();o.enabled=!!n.enableNavigationControls,n.lastSetCameraZ=r.position.z;var a;n.container.appendChild(a=document.createElement("div")),a.className="graph-info-msg",a.textContent="",n.forceGraph.onLoading(function(){a.textContent="Loading..."}).onFinishLoading(function(){a.textContent=""}).onUpdate(function(){n.graphData=n.forceGraph.graphData(),r.position.x===0&&r.position.y===0&&r.position.z===n.lastSetCameraZ&&n.graphData.nodes.length&&(r.lookAt(n.forceGraph.position),n.lastSetCameraZ=r.position.z=Math.cbrt(n.graphData.nodes.length)*j3)}).onFinishUpdate(function(){if(n._dragControls){var c=n.graphData.nodes.find(function(u){return u.__initialFixedPos&&!u.__disposeControlsAfterDrag});c?c.__disposeControlsAfterDrag=!0:n._dragControls.dispose(),n._dragControls=void 0}if(n.enableNodeDrag&&n.enablePointerInteraction&&n.forceEngine==="d3"){var l=n._dragControls=new sh(n.graphData.nodes.map(function(u){return u.__threeObj}).filter(function(u){return u}),r,s.domElement);l.addEventListener("dragstart",function(u){var h=ki(u.object);if(h){o.enabled=!1,u.object.__initialPos=u.object.position.clone(),u.object.__prevPos=u.object.position.clone();var f=h.__data;!f.__initialFixedPos&&(f.__initialFixedPos={fx:f.fx,fy:f.fy,fz:f.fz}),!f.__initialPos&&(f.__initialPos={x:f.x,y:f.y,z:f.z}),["x","y","z"].forEach(function(d){return f["f".concat(d)]=f[d]}),s.domElement.classList.add("grabbable")}}),l.addEventListener("drag",function(u){var h=ki(u.object);if(h){if(!u.object.hasOwnProperty("__graphObjType")){var f=u.object.__initialPos,d=u.object.__prevPos,m=u.object.position;h.position.add(m.clone().sub(d)),d.copy(m),m.copy(f)}var _=h.__data,g=h.position,p={x:g.x-_.x,y:g.y-_.y,z:g.z-_.z};["x","y","z"].forEach(function(b){return _["f".concat(b)]=_[b]=g[b]}),n.forceGraph.d3AlphaTarget(.3).resetCountdown(),_.__dragged=!0,n.onNodeDrag(_,p)}}),l.addEventListener("dragend",function(u){var h=ki(u.object);if(h){delete u.object.__initialPos,delete u.object.__prevPos;var f=h.__data;f.__disposeControlsAfterDrag&&(l.dispose(),delete f.__disposeControlsAfterDrag);var d=f.__initialFixedPos,m=f.__initialPos,_={x:m.x-f.x,y:m.y-f.y,z:m.z-f.z};if(d&&(["x","y","z"].forEach(function(p){var b="f".concat(p);d[b]===void 0&&delete f[b]}),delete f.__initialFixedPos,delete f.__initialPos,f.__dragged&&(delete f.__dragged,n.onNodeDragEnd(f,_))),n.forceGraph.d3AlphaTarget(0).resetCountdown(),n.enableNavigationControls){var g;o.enabled=!0,o._status&&((g=o._onPointerCancel)===null||g===void 0||g.call(o)),o.domElement&&o.domElement.ownerDocument&&o.domElement.ownerDocument.dispatchEvent(new PointerEvent("pointerup",{pointerType:"touch"}))}s.domElement.classList.remove("grabbable")}})}}),vp.REVISION<155&&(n.renderObjs.renderer().useLegacyLights=!1),n.renderObjs.hoverOrderComparator(function(c,l){var u=ki(c);if(!u)return 1;var h=ki(l);if(!h)return-1;var f=function(m){return m.__graphObjType==="node"};return f(h)-f(u)}).tooltipContent(function(c){var l=ki(c);return l&&Zt(n["".concat(l.__graphObjType,"Label")])(l.__data)||""}).hoverDuringDrag(!1).onHover(function(c){var l=ki(c);if(l!==n.hoverObj){var u=n.hoverObj?n.hoverObj.__graphObjType:null,h=n.hoverObj?n.hoverObj.__data:null,f=l?l.__graphObjType:null,d=l?l.__data:null;if(u&&u!==f){var m=n["on".concat(u==="node"?"Node":"Link","Hover")];m&&m(null,h)}if(f){var _=n["on".concat(f==="node"?"Node":"Link","Hover")];_&&_(d,u===f?h:null)}s.domElement.classList[(l&&n["on".concat(f==="node"?"Node":"Link","Click")]||!l&&n.onBackgroundClick)&&Zt(n.showPointerCursor)(d)?"add":"remove"]("clickable"),n.hoverObj=l}}).clickAfterDrag(!1).onClick(function(c,l){var u=ki(c);if(u){var h=n["on".concat(u.__graphObjType==="node"?"Node":"Link","Click")];h&&h(u.__data,l)}else n.onBackgroundClick&&n.onBackgroundClick(l)}).onRightClick(function(c,l){var u=ki(c);if(u){var h=n["on".concat(u.__graphObjType==="node"?"Node":"Link","RightClick")];h&&h(u.__data,l)}else n.onBackgroundRightClick&&n.onBackgroundRightClick(l)}),this._animationCycle()}});function ki(e){for(var t=e;t&&!t.hasOwnProperty("__graphObjType");)t=t.parent;return t}var Iy={name:"LuminosityHighPassShader",uniforms:{tDiffuse:{value:null},luminosityThreshold:{value:1},smoothWidth:{value:1},defaultColor:{value:new Ot(0)},defaultOpacity:{value:0}},vertexShader:`

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

		}`};var eo=class e extends Tn{constructor(t,n=1,i,r){super(),this.strength=n,this.radius=i,this.threshold=r,this.resolution=t!==void 0?new et(t.x,t.y):new et(256,256),this.clearColor=new Ot(0,0,0),this.needsSwap=!1,this.renderTargetsHorizontal=[],this.renderTargetsVertical=[],this.nMips=5;let s=Math.round(this.resolution.x/2),o=Math.round(this.resolution.y/2);this.renderTargetBright=new Ze(s,o,{type:Un}),this.renderTargetBright.texture.name="UnrealBloomPass.bright",this.renderTargetBright.texture.generateMipmaps=!1;for(let u=0;u<this.nMips;u++){let h=new Ze(s,o,{type:Un});h.texture.name="UnrealBloomPass.h"+u,h.texture.generateMipmaps=!1,this.renderTargetsHorizontal.push(h);let f=new Ze(s,o,{type:Un});f.texture.name="UnrealBloomPass.v"+u,f.texture.generateMipmaps=!1,this.renderTargetsVertical.push(f),s=Math.round(s/2),o=Math.round(o/2)}let a=Iy;this.highPassUniforms=Oi.clone(a.uniforms),this.highPassUniforms.luminosityThreshold.value=r,this.highPassUniforms.smoothWidth.value=.01,this.materialHighPassFilter=new Le({uniforms:this.highPassUniforms,vertexShader:a.vertexShader,fragmentShader:a.fragmentShader}),this.separableBlurMaterials=[];let c=[3,5,7,9,11];s=Math.round(this.resolution.x/2),o=Math.round(this.resolution.y/2);for(let u=0;u<this.nMips;u++)this.separableBlurMaterials.push(this._getSeparableBlurMaterial(c[u])),this.separableBlurMaterials[u].uniforms.invSize.value=new et(1/s,1/o),s=Math.round(s/2),o=Math.round(o/2);this.compositeMaterial=this._getCompositeMaterial(this.nMips),this.compositeMaterial.uniforms.blurTexture1.value=this.renderTargetsVertical[0].texture,this.compositeMaterial.uniforms.blurTexture2.value=this.renderTargetsVertical[1].texture,this.compositeMaterial.uniforms.blurTexture3.value=this.renderTargetsVertical[2].texture,this.compositeMaterial.uniforms.blurTexture4.value=this.renderTargetsVertical[3].texture,this.compositeMaterial.uniforms.blurTexture5.value=this.renderTargetsVertical[4].texture,this.compositeMaterial.uniforms.bloomStrength.value=n,this.compositeMaterial.uniforms.bloomRadius.value=.1;let l=[1,.8,.6,.4,.2];this.compositeMaterial.uniforms.bloomFactors.value=l,this.bloomTintColors=[new I(1,1,1),new I(1,1,1),new I(1,1,1),new I(1,1,1),new I(1,1,1)],this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,this.copyUniforms=Oi.clone(Js.uniforms),this.blendMaterial=new Le({uniforms:this.copyUniforms,vertexShader:Js.vertexShader,fragmentShader:Js.fragmentShader,blending:Zi,depthTest:!1,depthWrite:!1,transparent:!0}),this._oldClearColor=new Ot,this._oldClearAlpha=1,this._basic=new bn,this._fsQuad=new sr(null)}dispose(){for(let t=0;t<this.renderTargetsHorizontal.length;t++)this.renderTargetsHorizontal[t].dispose();for(let t=0;t<this.renderTargetsVertical.length;t++)this.renderTargetsVertical[t].dispose();this.renderTargetBright.dispose();for(let t=0;t<this.separableBlurMaterials.length;t++)this.separableBlurMaterials[t].dispose();this.compositeMaterial.dispose(),this.blendMaterial.dispose(),this._basic.dispose(),this._fsQuad.dispose()}setSize(t,n){let i=Math.round(t/2),r=Math.round(n/2);this.renderTargetBright.setSize(i,r);for(let s=0;s<this.nMips;s++)this.renderTargetsHorizontal[s].setSize(i,r),this.renderTargetsVertical[s].setSize(i,r),this.separableBlurMaterials[s].uniforms.invSize.value=new et(1/i,1/r),i=Math.round(i/2),r=Math.round(r/2)}render(t,n,i,r,s){t.getClearColor(this._oldClearColor),this._oldClearAlpha=t.getClearAlpha();let o=t.autoClear;t.autoClear=!1,t.setClearColor(this.clearColor,0),s&&t.state.buffers.stencil.setTest(!1),this.renderToScreen&&(this._fsQuad.material=this._basic,this._basic.map=i.texture,t.setRenderTarget(null),t.clear(),this._fsQuad.render(t)),this.highPassUniforms.tDiffuse.value=i.texture,this.highPassUniforms.luminosityThreshold.value=this.threshold,this._fsQuad.material=this.materialHighPassFilter,t.setRenderTarget(this.renderTargetBright),t.clear(),this._fsQuad.render(t);let a=this.renderTargetBright;for(let c=0;c<this.nMips;c++)this._fsQuad.material=this.separableBlurMaterials[c],this.separableBlurMaterials[c].uniforms.colorTexture.value=a.texture,this.separableBlurMaterials[c].uniforms.direction.value=e.BlurDirectionX,t.setRenderTarget(this.renderTargetsHorizontal[c]),t.clear(),this._fsQuad.render(t),this.separableBlurMaterials[c].uniforms.colorTexture.value=this.renderTargetsHorizontal[c].texture,this.separableBlurMaterials[c].uniforms.direction.value=e.BlurDirectionY,t.setRenderTarget(this.renderTargetsVertical[c]),t.clear(),this._fsQuad.render(t),a=this.renderTargetsVertical[c];this._fsQuad.material=this.compositeMaterial,this.compositeMaterial.uniforms.bloomStrength.value=this.strength,this.compositeMaterial.uniforms.bloomRadius.value=this.radius,this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,t.setRenderTarget(this.renderTargetsHorizontal[0]),t.clear(),this._fsQuad.render(t),this._fsQuad.material=this.blendMaterial,this.copyUniforms.tDiffuse.value=this.renderTargetsHorizontal[0].texture,s&&t.state.buffers.stencil.setTest(!0),this.renderToScreen?(t.setRenderTarget(null),this._fsQuad.render(t)):(t.setRenderTarget(i),this._fsQuad.render(t)),t.setClearColor(this._oldClearColor,this._oldClearAlpha),t.autoClear=o}_getSeparableBlurMaterial(t){let n=[];for(let i=0;i<t;i++)n.push(.39894*Math.exp(-.5*i*i/(t*t))/t);return new Le({defines:{KERNEL_RADIUS:t},uniforms:{colorTexture:{value:null},invSize:{value:new et(.5,.5)},direction:{value:new et(.5,.5)},gaussianCoefficients:{value:n}},vertexShader:`varying vec2 vUv;
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
				}`})}};eo.BlurDirectionX=new et(1,0);eo.BlurDirectionY=new et(0,1);var Ca={name:"OutputShader",uniforms:{tDiffuse:{value:null},toneMappingExposure:{value:1}},vertexShader:`
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

		}`};var au=class extends Tn{constructor(){super(),this.uniforms=Oi.clone(Ca.uniforms),this.material=new Ho({name:Ca.name,uniforms:this.uniforms,vertexShader:Ca.vertexShader,fragmentShader:Ca.fragmentShader}),this._fsQuad=new sr(this.material),this._outputColorSpace=null,this._toneMapping=null}render(t,n,i){this.uniforms.tDiffuse.value=i.texture,this.uniforms.toneMappingExposure.value=t.toneMappingExposure,(this._outputColorSpace!==t.outputColorSpace||this._toneMapping!==t.toneMapping)&&(this._outputColorSpace=t.outputColorSpace,this._toneMapping=t.toneMapping,this.material.defines={},ee.getTransfer(this._outputColorSpace)===ae&&(this.material.defines.SRGB_TRANSFER=""),this._toneMapping===ol?this.material.defines.LINEAR_TONE_MAPPING="":this._toneMapping===al?this.material.defines.REINHARD_TONE_MAPPING="":this._toneMapping===cl?this.material.defines.CINEON_TONE_MAPPING="":this._toneMapping===ll?this.material.defines.ACES_FILMIC_TONE_MAPPING="":this._toneMapping===ul?this.material.defines.AGX_TONE_MAPPING="":this._toneMapping===fl?this.material.defines.NEUTRAL_TONE_MAPPING="":this._toneMapping===hl&&(this.material.defines.CUSTOM_TONE_MAPPING=""),this.material.needsUpdate=!0),this.renderToScreen===!0?(t.setRenderTarget(null),this._fsQuad.render(t)):(t.setRenderTarget(n),this.clear&&t.clear(t.autoClearColor,t.autoClearDepth,t.autoClearStencil),this._fsQuad.render(t))}dispose(){this.material.dispose(),this._fsQuad.dispose()}};var pr={online:{rotulo:"Online",icone:"i-online",peso:5},suspeito:{rotulo:"Online",icone:"i-online",peso:5,dica:"verificando"},instavel:{rotulo:"Inst\xE1vel",icone:"i-instavel",peso:2},offline:{rotulo:"Offline",icone:"i-offline",peso:0},inalcancavel:{rotulo:"Inalcan\xE7\xE1vel",icone:"i-inalcancavel",peso:1},pausado:{rotulo:"Pausado",icone:"i-pausado",peso:4},desconhecido:{rotulo:"Aguardando",icone:"i-desconhecido",peso:3}};var Z3=/[\u0000-\u001f\u007f-\u009f\u00ad\u061c\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff\ufff9-\ufffb]/g,K3=45;function J3(e,t){if(e==null)return"";let n=String(e).replace(Z3,"");return t===void 0?n:n.slice(0,t)}function Dy(e){if(typeof e!="string")return"";let t=J3(e).trim();return t.length>K3?"":t}function Ra(e){let t=2166136261;for(let n of new TextEncoder().encode(String(e)))t^=n,t=Math.imul(t,16777619)>>>0;return t>>>0}var Ly="#4CA878",xp="#7A8194",Oy={online:{cor:Ly,forma:"cheia",pulsa:!1,treme:!1,opacidade:1},instavel:{cor:"#D9A441",forma:"anel",pulsa:!1,treme:!1,opacidade:1},suspeito:{cor:Ly,forma:"cheia",pulsa:!1,treme:!0,opacidade:1},offline:{cor:"#D97373",forma:"cruz",pulsa:!0,treme:!1,opacidade:1},pausado:{cor:xp,forma:"translucida",pulsa:!1,treme:!1,opacidade:.45},inalcancavel:{cor:xp,forma:"elo",pulsa:!1,treme:!1,opacidade:.7},desconhecido:{cor:xp,forma:"anel",pulsa:!1,treme:!1,opacidade:.7}};function Pa(e){let t=Object.hasOwn(Oy,e)?e:"desconhecido";return{...Oy[t],rotulo:pr[t].rotulo}}var Ny=["#7FB2E5","#B79CE8","#E58FB8","#E8A27C","#C9C46A","#6CC6B8","#9AA7F0","#D69AD6"],Q3=/^#[0-9A-Fa-f]{6}$/;function bp(e){let t=e?.cor;return typeof t=="string"&&Q3.test(t)?t:Ny[Ra(String(e?.slug??""))%Ny.length]}function tI(e,t){return e>3e3||t!=null&&t<30?"agrupado":e>1e3?"reduzido":"completo"}function Mp(e=()=>performance.now()){let t=[],n=[];function i(){if(t.length<2)return null;let r=t[t.length-1]-t[0];return r<1e3?null:(t.length-1)*1e3/r}return{quadro(){let r=e();t.push(r);let s=r-3e3,o=0;for(;o<t.length&&t[o]<s;)o++;o&&(t=t.slice(o));let a=i();a!==null&&n.push({t:r,v:a});let c=r-3e4,l=0;for(;l<n.length&&n[l].t<c;)l++;l&&(n=n.slice(l))},media(){return i()},abaixoDe(r,s){if(!n.length)return!1;let o=n[n.length-1],a=null;for(let c=n.length-1;c>=0&&n[c].v<r;c--)a=n[c].t;return a===null?!1:o.t-a>=s*1e3}}}function Fy(e,t){return e!=null&&e>=50&&!t}var eI=24,nI=5,iI=6e4;function Uy(e){return e.abaixoDe(eI,nI)}function Sp({total:e,agrupadoPorFps:t=!1,queda:n=!1,agora:i=0,ultimaEntrada:r=-1/0}){let s=tI(e,null);return s==="agrupado"?{nivel:"agrupado",agrupadoPorFps:!1,ultimaEntrada:r}:t?{nivel:"agrupado",agrupadoPorFps:!0,ultimaEntrada:r}:n&&i-r>=iI?{nivel:"agrupado",agrupadoPorFps:!0,ultimaEntrada:i}:{nivel:s,agrupadoPorFps:!1,ultimaEntrada:r}}function zy(e){return{...e,agrupadoPorFps:!1}}var Ap=["a","b","c","d","e"],rI={a:"Constela\xE7\xE3o",b:"\xD3rbitas",c:"Gal\xE1xia",d:"\xC1tomo",e:"\xC1rvore 3D"},sI=12,Ia=230,ky=60,cu=18*Math.PI/180,$r=Math.PI*2,wp=(e,t)=>Ra(`${e}#${t}`)/4294967296;function oI(e,t){let n=new Set;for(let o of t)o.classe!=="sentinela"&&n.add(o.classe);let i=new Map;for(let o of e)i.set(o.slug,Number.isFinite(o.ordem)?o.ordem:0);let r=[...n].sort((o,a)=>{let c=i.has(o)?i.get(o):1/0,l=i.has(a)?i.get(a):1/0;return c!==l?c<l?-1:1:o<a?-1:o>a?1:0}),s=new Map;return r.forEach((o,a)=>s.set(o,{i:a,n:r.length})),s}function lu(e,t){let n=e/t*$r,i=Math.cos(n)*Ia,r=t>1&&t%2===1&&e===t-1?0:e%2===0?ky:-ky,s=Math.sin(n)*Ia;return{x:i,y:r*Math.cos(cu)-s*Math.sin(cu),z:r*Math.sin(cu)+s*Math.cos(cu)}}function aI(e,t,n){let i=lu(e,n),r=wp(t,1)*2-1,s=Math.sqrt(1-r*r),o=wp(t,2)*$r,a=18+wp(t,3)*28;return{x:i.x+s*Math.cos(o)*a,y:i.y+r*a,z:i.z+s*Math.sin(o)*a}}var cI=5,lI=(e,t)=>e<t?-1:e>t?1:0,Ep=new Map;function hI(e){if(!Ep.has(e)){let t=[];for(let n=0;t.length<e;n++){let i=20+n*11,r=Math.max(1,Math.floor($r*i/cI));for(let s=0;s<r&&t.length<e;s++)t.push({r:n,i:s,n:r,raio:i})}Ep.set(e,t)}return Ep.get(e)}function uI(e,t,n,i,r){let s=lu(e,r),{r:o,i:a,n:c,raio:l}=hI(i)[n],u=(a+.5*(o%2))/c*$r+o*.4;return{x:s.x+Math.cos(u)*l,y:s.y+Math.sin(u*2)*3,z:s.z+Math.sin(u)*l}}var no=64,By=9;function fI(e,t){let n=e/t*$r;return{x:Math.cos(n+.9)*120,y:0,z:Math.sin(n+.9)*120}}function dI(e,t,n,i,r){let s=e/r*$r,o=(n%no+.5)/no,a=Math.floor(n/no),c=60+o*260+a%8*By,l=s+o*2.6+.9;return{x:Math.cos(l)*c,y:Math.floor(a/8)*By,z:Math.sin(l)*c}}var pI=3.17;function mI(e){return Vy(e,Math.PI/2+e*pI,0,0)}function Vy(e,t,n,i){let r=90+e*26+n,s=e/sI*Math.PI,o=e*.7,a=Math.cos(t)*r,c=Math.sin(t)*r,l=i*Math.cos(s)-c*Math.sin(s),u=i*Math.sin(s)+c*Math.cos(s);return{x:a*Math.cos(o)-u*Math.sin(o),y:l,z:a*Math.sin(o)+u*Math.cos(o)}}function gI(e,t,n){let i=Math.floor(n/no),r=(n%no+.5)/no*$r;return Vy(e,r,(i%8+1)*8,Math.floor(i/8)*8)}var Hy=(e,t)=>(e-(t-1)/2)*70,_I=(e,t)=>({x:Hy(e,t),y:90,z:0});function vI(e,t,n,i,r){let s=n%12,o=Math.floor(n/12);return{x:Hy(e,r)+(s-5.5)*5.5,y:40-o*6,z:s%2*4+o%2*3}}var Tp={a:{hub:lu,item:(e,t,n,i,r)=>aI(e,t,r),slots:!1},b:{hub:lu,item:uI},c:{hub:fI,item:dI},d:{hub:mI,item:gI},e:{hub:_I,item:vI}};function Gy(e,t,n){let i=Tp[e]??Tp.a,r=Tp[e]?e:"a",s=new Map;s.set("srv",{x:0,y:r==="e"?200:0,z:0});let o=oI(t,n);for(let[c,{i:l,n:u}]of o)s.set(`h-${c}`,i.hub(l,u));let a=new Map;for(let c of n)o.has(c.classe)&&(a.has(c.classe)||a.set(c.classe,[]),a.get(c.classe).push(c.id));for(let[c,l]of a){let{i:u,n:h}=o.get(c);if(i.slots===!1){for(let _ of l)s.set(_,i.item(u,_,0,0,h));continue}let f=64;for(;f<2*l.length;)f*=4;let d=new Set,m=l.map(_=>({id:_,h:Ra(_)}));m.sort((_,g)=>_.h-g.h||lI(_.id,g.id));for(let{id:_,h:g}of m){let p=g%f;for(;d.has(p);)p=(p+1)%f;d.add(p),s.set(_,i.item(u,_,p,f,h))}}return s}var La=Math.PI/180,yI=1.15,xI=40,bI=.45,Rp=(e,t)=>({x:e.x-t.x,y:e.y-t.y,z:e.z-t.z}),hu=(e,t)=>({x:e.x+t.x,y:e.y+t.y,z:e.z+t.z}),io=(e,t)=>({x:e.x*t,y:e.y*t,z:e.z*t}),Cp=(e,t)=>e.x*t.x+e.y*t.y+e.z*t.z,uu=(e,t)=>({x:e.y*t.z-e.z*t.y,y:e.z*t.x-e.x*t.z,z:e.x*t.y-e.y*t.x}),fu=e=>Math.hypot(e.x,e.y,e.z);function Da(e){let t=fu(e);return t<1e-9?{x:0,y:0,z:1}:io(e,1/t)}function qy(e,t,n=0,i=1){let r=0;for(let s of t)r=Math.max(r,fu(Rp(s,e)));return Math.max(i,r+n)}function MI(e,t,{aspecto:n=1,fracao:i=1,folga:r=yI}={}){let s=Math.tan(t*La/2),o=Math.max(.15,Math.min(i,n*i)),a=Math.atan(s*o);return e/Math.sin(a)*r}function SI(e,t,n=xI,i=bI){let r=t.x-e.x,s=t.z-e.z;Math.hypot(r,s)<1e-6&&(r=0,s=1);let o=Math.hypot(r,s);r/=o,s/=o;let a=n*La,c=Math.cos(a),l=Math.sin(a);return Da({x:r*c-s*l,y:i,z:r*l+s*c})}function Xy({alvo:e,de:t,raio:n,fov:i,largura:r,altura:s,margens:o={}}){let{esquerda:a=0,direita:c=0,cima:l=0,baixo:u=0}=o,h=Math.max(1,r-a-c),f=Math.max(1,s-l-u),d=Math.min(h,f)/s,m=MI(n,i,{fracao:d}),_=SI(t,e),g=io(_,-1),p=uu(g,{x:0,y:1,z:0});fu(p)<1e-6&&(p={x:1,y:0,z:0}),p=Da(p);let b=uu(p,g),x=2*m*Math.tan(i*La/2)/s,v=(a-c)/2,M=(u-l)/2,S=hu(e,hu(io(p,-v*x),io(b,-M*x)));return{camera:hu(S,io(_,m)),olhar:S,distancia:m}}function wI(e,t,n,i,r){let s=Da(Rp(n,t)),o=uu(s,{x:0,y:1,z:0});fu(o)<1e-6&&(o={x:1,y:0,z:0}),o=Da(o);let a=uu(o,s),c=Rp(e,t),l=Cp(c,s),u=r/2/Math.tan(i*La/2)/l;return{x:Cp(c,o)*u,y:Cp(c,a)*u,profundidade:l}}var du=2600,EI={min:.72,max:1.12,referencia:420};function $y({ndc:e,distancia:t,largura:n,altura:i,margem:r=40}){if(!e||!(e.z>-1&&e.z<1)||!(t>0)||t>du)return{visivel:!1};let s=(e.x+1)/2*n,o=(1-e.y)/2*i;if(s<-r||s>n+r||o<-r||o>i+r)return{visivel:!1};let{min:a,max:c,referencia:l}=EI,u=Math.min(c,Math.max(a,l/t));return{visivel:!0,x:Math.round(s),y:Math.round(o),escala:Math.round(u*100)/100}}function Yy({x:e,y:t,largura:n,altura:i,palcoL:r,palcoA:s,desloque:o=0,folga:a=4}){if(!(e>=0&&e<=r&&t>=0&&t<=s))return{visivel:!1};let c=r-a-n/2,l=a+n/2,u=l>c?r/2:Math.min(c,Math.max(l,e)),h=s-a-i-o,f=a-o,d=f>h?f:Math.min(h,Math.max(f,t));return{visivel:!0,x:Math.round(u),y:Math.round(d)}}var Wy={lado:60,vertical:46};function TI(e,t,n,i){let r=e.x-t.x,s=e.z-t.z;return{x:t.x+r*n+s*i,y:e.y,z:t.z-r*i+s*n}}function jy(e,t,n,i,r,s){let o=1/0,a=-1/0,c=1/0,l=-1/0;for(let[u,h]of s)for(let f of e){let d=TI(f,t,u,h),m=wI(d,n,t,i,r);if(!(m.profundidade>1))return null;let _=r/2/Math.tan(i*La/2)/m.profundidade,g=(f.raio||0)*_,p=f.rotulo?Math.max(g,Wy.lado):g,b=f.rotulo?Math.max(g,Wy.vertical):g;o=Math.min(o,m.x-p),a=Math.max(a,m.x+p),c=Math.min(c,m.y-b),l=Math.max(l,m.y+b)}return{x0:o,x1:a,y0:c,y1:l}}function Zy({pontos:e,alvo:t,direcao:n,fov:i,largura:r,altura:s,margens:o={},folga:a=4,minimo:c=120,maximo:l=2200,passos:u=12}){let{esquerda:h=0,direita:f=0,cima:d=0,baixo:m=0}=o,_=Math.max(1,r-h-f-2*a),g=Math.max(1,s-d-m-2*a),p=Da(n),b=Array.from({length:u},(w,R)=>[Math.cos(R*2*Math.PI/u),Math.sin(R*2*Math.PI/u)]),x=w=>hu(t,io(p,w)),v=w=>{let R=jy(e,t,x(w),i,s,b);return R&&R.x1-R.x0<=_&&R.y1-R.y0<=g},M=l,S=v(l),C=!0;if(S||(C=!1,b.length=1,S=v(l)),S){let w=c,R=l;v(w)&&(R=w);for(let V=0;V<24&&R-w>.5;V++){let N=(w+R)/2;v(N)?R=N:w=N}M=R}let P=jy(e,t,x(M),i,s,b)||{x0:0,x1:0,y0:0,y1:0},T={x:Math.round((h-f)/2-(P.x0+P.x1)/2),y:Math.round((m-d)/2-(P.y0+P.y1)/2)};return{camera:x(M),olhar:t,distancia:M,desvio:T,coube:S,girar:C}}function Ky(e,{folga:t=4,limite:n=1/0}={}){let i=[],r=[];for(let s of e){let o=0;for(let a=0;a<12;a++){let c=s.topo+o,l=c+s.a,u=i.find(d=>Math.abs(d.x-s.x)<(d.l+s.l)/2+t&&c<d.topo+d.a+t&&l+t>d.topo);if(!u)break;let h=u.topo+u.a+t-s.topo,f=u.topo-t-s.a-s.topo;s.topo+h+s.a<=n||s.topo+f<0?o=Math.max(o,h):o=Math.min(o,f)}r.push(o),i.push({x:s.x,topo:s.topo+o,l:s.l,a:s.a})}return r}function Jy(e,t,{folga:n=4,limite:i=1/0}={}){let r=[];return e.map((s,o)=>{let a=s.topo+(t[o]||0),c=a>=0&&a+s.a<=i,l=r.some(h=>Math.abs(h.x-s.x)<(h.l+s.l)/2+n&&a<h.topo+h.a+n&&a+s.a+n>h.topo),u=o===0||c&&!l;return u&&r.push({x:s.x,topo:a,l:s.l,a:s.a}),u})}var Qy="#BCC2CE",tx="rgba(6,10,25,0.94)";function ex({raio:e,distancia:t,fovGraus:n,alturaPx:i}){if(!(i>0))return 0;if(!(t>0))return 1/0;let r=Math.tan(n*Math.PI/360);return 2*e*i/(2*t*r)}function nx({diametroPx:e,totalNos:t}){return t<=3e3&&e>=24}function ix(e){return e>0?Math.min(1,e/180):0}function rx(e){return Math.min(15,Math.max(11,Math.round(e*.3)))}function sx({limite:e,criar:t,liberar:n}){let i=new Map;return{obter(r,s){let o=i.get(r);if(o)return i.delete(r),o.quadro=s,i.set(r,o),o.recurso;if(o={recurso:t(r),quadro:s},i.set(r,o),i.size>e)for(let[a,c]of i){if(i.size<=e)break;c.quadro>=s||(i.delete(a),n(c.recurso))}return o.recurso},get tamanho(){return i.size},liberarTudo(){for(let r of i.values())n(r.recurso);i.clear()}}}function ox(e,t,n=[]){let i=[...n];return e.map(r=>{for(let s of i)if(Math.abs(r.x-s.x)*2<r.l+s.l+2*t&&Math.abs(r.y-s.y)*2<r.a+s.a+2*t)return!1;return i.push(r),!0})}var mu="#060a19",ax="#A78BFA",lx="#2DD4BF",AI="#dfe4ff",gu=.15,tn={equipamento:2.4,haloEquipamento:13,marca:8.5,classe:6.5,haloClasse:44,nucleo:14,haloServidor:110},Yr=()=>{};function hx(){let e=new Map;return{obter(t,n){let i=e.get(t);if(!i){i=n();let r=i.dispose.bind(i);i.dispose=()=>{},i.liberarDeVerdade=r,e.set(t,i)}return i},get tamanho(){return e.size},liberar(){for(let t of e.values())t.liberarDeVerdade();e.clear()}}}var pu=(e,t)=>{let n=document.createElement("canvas");return n.width=e,n.height=t,n};function Ip(e){let t=new No(e);return t.colorSpace=He,t}var CI=e=>e<.25?1-.45*e/.25:.55*(1-(e-.25)/.75);function ux(e,t){let n=e.getContext("2d");n.clearRect(0,0,128,128);let i=n.createRadialGradient(64,64,0,64,64,64);for(let r=0;r<=16;r++){let s=r/16;i.addColorStop(s,`rgba(255,255,255,${(CI(s)**t).toFixed(4)})`)}n.fillStyle=i,n.fillRect(0,0,128,128)}function Dp(e){return e.obter("tex:brilho",()=>{let t=pu(128,128);ux(t,1);let n=Ip(t);return n.userData.canvas=t,n})}function Lp(e,t=!0){let n=Dp(e);ux(n.userData.canvas,t?2.2:1),n.needsUpdate=!0}function fx(e,t){return e.obter(`tex:${t}`,()=>{let n=pu(64,64),i=n.getContext("2d");return i.strokeStyle="#ffffff",i.lineCap="round",t==="anel"?(i.lineWidth=5,i.beginPath(),i.arc(32,32,24,0,Math.PI*2),i.stroke()):t==="elo"?(i.lineWidth=6,i.beginPath(),i.arc(32,32,24,Math.PI*.28,Math.PI*1.72),i.stroke()):(i.lineWidth=8,i.beginPath(),i.moveTo(16,16),i.lineTo(48,48),i.moveTo(48,16),i.lineTo(16,48),i.stroke()),Ip(n)})}function dx(e){let t=e.obter("mat:selecao",()=>new ai({map:fx(e,"anel"),color:lx,transparent:!0,depthTest:!1,depthWrite:!1})),n=new ci(t);return n.raycast=Yr,n.renderOrder=10,n.visible=!1,n}var px=(e,t)=>t?gu:e;function mx(e,t,n,i){let r=px(n,i);return e.obter(`mat:${t}:${r}`,()=>new Go({color:t,emissive:t,emissiveIntensity:.6,roughness:.45,metalness:.1,transparent:r<1,opacity:r,depthWrite:r>=1}))}function gx(e,t,n,i){let r=px(n,i);return e.obter(`halo:${t}:${r}`,()=>new ai({map:Dp(e),color:t,transparent:!0,opacity:r,depthWrite:!1,blending:Zi}))}function RI(e,t,n,i){let r=i?gu:.95;return e.obter(`marca:${t}:${n}:${r}`,()=>new ai({map:fx(e,t),color:n,transparent:!0,opacity:r,depthWrite:!1,depthTest:!1}))}var Op=(e,t,n)=>e.obter(`geo:esfera:${t.toFixed(2)}:${n}`,()=>new Pi(t,n,n));function _x(e,t,n){let i=new $e,r=new ci,s=new we(Op(e,tn.equipamento,n)),o=new ci;return o.renderOrder=10,i.add(r,s,o),i.userData={halo:r,esfera:s,marca:o,escala:t,aparencia:null,semente:Math.random()*100},i}function Oa(e,t,n,i){let r=Pa(n),s=e.userData,o=s.escala;s.aparencia=r,s.esfera.material=mx(t,r.cor,r.opacidade,i),s.halo.material=gx(t,r.cor,.55*r.opacidade,i);let a=tn.haloEquipamento*o;s.halo.scale.set(a,a,1),s.esfera.scale.setScalar(o),s.esfera.position.set(0,0,0);let c=r.forma==="anel"||r.forma==="cruz"||r.forma==="elo";if(s.marca.visible=c,c){s.marca.material=RI(t,r.forma,r.cor,i);let l=tn.marca*o*(r.forma==="cruz"?.8:1);s.marca.scale.set(l,l,1)}return r}function vx(e,t,{esmaecido:n=!1,resolucao:i=16}={}){let r=_x(e,1,i);return Oa(r,e,t,n),r}function yx(e,t){let{raio:n,estado:i,esmaecido:r=!1}=t,s=_x(e,n/tn.equipamento,24);return Oa(s,e,i,r),s}var Pp=30,cx=`600 ${Pp}px ui-monospace, "Cascadia Mono", "SF Mono", Consolas, monospace`,PI=14,II=9;function xx(e){let t=pu(2,2).getContext("2d");t.font=cx;let n=Math.ceil(t.measureText(e).width)+2*PI,i=Pp+2*II,r=pu(n,i),s=r.getContext("2d"),o=i/2;s.fillStyle=tx,s.beginPath(),s.moveTo(o,0),s.lineTo(n-o,0),s.arc(n-o,o,o,-Math.PI/2,Math.PI/2),s.lineTo(o,i),s.arc(o,o,o,Math.PI/2,Math.PI*3/2),s.closePath(),s.fill(),s.font=cx,s.fillStyle=Qy,s.textAlign="center",s.textBaseline="middle",s.fillText(e,n/2,i/2+1);let a=Ip(r);return a.userData.aspecto=n/i,a.userData.letra=Pp/i,a.liberarDeVerdade=a.dispose.bind(a),a.dispose=()=>{},a}function bx(){let e=new ci(new ai({transparent:!0,opacity:0,depthTest:!1,depthWrite:!1,fog:!1}));return e.raycast=Yr,e.renderOrder=12,e.visible=!1,e}function Mx(e,{cor:t,esmaecido:n=!1}){let i=new $e,r=new ci;r.raycast=Yr,r.scale.set(tn.haloClasse,tn.haloClasse,1);let s=new we(Op(e,tn.classe,32));return i.add(r,s),i.userData={halo:r,esfera:s},Np(i,e,t,n),i}function Np(e,t,n,i){let r=e.userData;r.esfera.material=mx(t,n,1,i),r.halo.material=gx(t,n,.9,i)}function Sx(e){let t=new $e,n=new ci(e.obter("srv:halo",()=>new ai({map:Dp(e),color:ax,transparent:!0,depthWrite:!1,blending:Zi})));n.scale.set(tn.haloServidor,tn.haloServidor,1),n.raycast=Yr;let i=new we(Op(e,tn.nucleo,48),e.obter("srv:nucleo",()=>new bn({color:AI}))),r=e.obter("srv:geo-anel",()=>new Bo(26,.6,8,96)),s=new we(r,e.obter("srv:anel1",()=>new bn({color:lx,transparent:!0,opacity:.7}))),o=new we(r,e.obter("srv:anel2",()=>new bn({color:ax,transparent:!0,opacity:.7})));return o.scale.setScalar(1.35),s.raycast=Yr,o.raycast=Yr,t.add(n,i,s,o),t.userData={aneis:[s,o]},t}function wx(e=1500,t=366){let n=t,i=()=>(n=n*16807%2147483647)/2147483647,r=new Float32Array(e*3);for(let c=0;c<e;c++){let l=i()*2-1,u=Math.sqrt(1-l*l),h=i()*Math.PI*2,f=1800+i()*1400;r[c*3]=u*Math.cos(h)*f,r[c*3+1]=l*f,r[c*3+2]=u*Math.sin(h)*f}let s=new ve;s.setAttribute("position",new ce(r,3));let o=new Es({color:"#c4b5fd",size:1.6,sizeAttenuation:!1,transparent:!0,opacity:.55,depthWrite:!1,fog:!1}),a=new Oo(s,o);return a.raycast=Yr,a}var Fa="sentinela",Na=e=>e&&e.classe!==Fa;function Fp(e){let t=new Map;for(let[n,i]of e)Na(i)&&t.set(n,{classe:i.classe,estado:i.estado});return t}function Tx(e,t){let n=[],i=[],r=[],s=[];for(let[o,a]of t){if(!Na(a))continue;let c=e.get(o);c?c.classe!==a.classe?r.push(o):c.estado!==a.estado&&s.push(o):n.push(o)}for(let o of e.keys())Na(t.get(o))||i.push(o);return{adicionar:n,remover:i,mudouClasse:r,mudouEstado:s}}function Ax(e){let t=new Map;for(let n of e.itens.values())Na(n)&&t.set(n.classe,(t.get(n.classe)||0)+1);return e.ordemClasses.filter(n=>n&&n.slug!==Fa&&(t.get(n.slug)||0)>0).map(n=>({slug:n.slug,nome:n.nome,cor:n.cor,ordem:n.ordem,total:t.get(n.slug)}))}var Ex=e=>Object.hasOwn(pr,e)?pr[e].peso:pr.desconhecido.peso,DI=e=>Object.hasOwn(pr,e)?e:"desconhecido";function LI(e){let t=null;for(let n of e){let i=DI(n);(t===null||Ex(i)<Ex(t))&&(t=i)}return t??"desconhecido"}function Up(e){let t=new Map;for(let i of e.values())Na(i)&&(t.has(i.classe)||t.set(i.classe,[]),t.get(i.classe).push(i.estado));let n=new Map;for(let[i,r]of t)n.set(i,{total:r.length,pior:LI(r)});return n}function _u(e){let t=Math.max(0,Number(e)||0);return Math.min(30,5+2.2*Math.cbrt(t))}function vu(e,t){return`${e??""} \xB7 ${t}`.trim()}function Cx(e){return((Number(e)||0)%12+12)%12%2===1}var Rx={x:0,y:260,z:520},Px={x:0,y:60,z:620},Ix={x:0,y:40,z:0},NI={a:.18,b:.07,c:.05,d:.1,e:.12},FI={a:!0,b:!0,c:!1,d:!1,e:!0},UI=900,zp=1200,zI=3e3,Dx=Ia+40,Lx={lado:60,cima:32},kI=1350,BI=250,VI=300,Ox=.0012,Ua=4,Nx=e=>Ap.includes(e)?e:"a",HI=e=>e*e*(3-2*e);function GI(e,t){let n=parseInt(e.slice(1),16);return`rgba(${n>>16&255},${n>>8&255},${n&255},${t})`}function WI(e,t={}){let n=t.aoClicarEquipamento||null,i=typeof t.margens=="function"?t.margens:()=>({}),r=t.aoClicarClasse||(()=>{}),s=!!t.movimentoReduzido,o=t.particulas!==!1,a=t.interativo!==!1,c=!!t.caberNaTela,l=t.rotulosIp===!0,u=typeof t.obstaculos=="function"?t.obstaculos:()=>[],h={estilo:Nx(t.estilo),nivel:"completo",total:0,agrupadoPorFps:!1,ultimaEntradaFps:-1/0,foco:null,girando:!s,store:null,pausado:!1,destruido:!1,bloom:null,inicioRender:null,ultimoCheque:0,ultimaLeitura:-1/0,transicao:null},f=hx(),d=Mp(),m=null,_=sx({limite:VI,criar:xx,liberar:F=>F.liberarDeVerdade()}),g=0,p=0,b=[],x=[],v={id:"srv",tipo:"servidor",fx:0,fy:0,fz:0,x:0,y:0,z:0},M=new Map,S=new Map,C=new Map,P=new Map,T=new Set,w=new Map,R=null;e.classList.add("teia-cena");let V=document.createElement("div"),N=new Py(e,{controlType:"orbit",rendererConfig:{antialias:!0,alpha:!1,powerPreference:"high-performance"}});N.backgroundColor(mu).showNavInfo(!1).enableNodeDrag(!1).width(e.clientWidth||window.innerWidth).height(e.clientHeight||window.innerHeight).nodeThreeObject($).nodeLabel(Bt).linkWidth(F=>F.tronco?1.2:0).linkDirectionalParticleWidth(2.2).linkDirectionalParticleSpeed(.006).linkDirectionalParticleColor(F=>F.cor).cooldownTicks(160).onNodeClick(pt).onNodeHover(F=>{e.style.cursor=F?"pointer":""}),Qt();let z=e.querySelector(".float-tooltip-kap");z&&Object.assign(z.style,{position:"absolute",pointerEvents:"none",padding:"4px 8px",borderRadius:"8px",font:"12px Inter, system-ui, sans-serif",color:"#E2E8F0",background:"rgba(15,23,42,.92)",whiteSpace:"normal",overflowWrap:"anywhere",maxWidth:"min(360px, 80vw)"});let U=e.querySelector(".graph-info-msg");U&&(U.style.display="none");let G=document.createElement("div");G.className="teia-rotulos",G.setAttribute("aria-hidden","true"),e.appendChild(G);let K=new Map,q=new I,ot=N.scene();ot.background=new Ot(mu),ot.fog=new Io(mu,Ox);let gt=new Xo(14673151,2.4,0,0);N.lights([new Rr(16777215,.35),gt]);let Y=wx(1500);ot.add(Y);let it=dx(f);ot.add(it);let dt=N.controls();dt.minDistance=60,dt.maxDistance=du,dt.enableDamping=!s,dt.dampingFactor=.08,dt.autoRotateSpeed=.6,dt.autoRotate=h.girando,a||(dt.enableRotate=!1,dt.enableZoom=!1,dt.enablePan=!1,N.enablePointerInteraction(!1).onNodeClick(null).onNodeHover(null));let zt=N.d3Force("charge");N.d3Force("center",null);{let F=h.estilo==="e"?Px:Rx;N.cameraPosition(c?ro(F):F,h.estilo==="e"?Ix:{x:0,y:0,z:0})}function Lt(F){return h.foco!==null&&F!==h.foco}function $(F){if(F.tipo==="servidor")return Sx(f);if(F.tipo==="classe")return Mx(f,{cor:F.cor,esmaecido:Lt(F.slug)});if(F.tipo==="grupo"){let A=yx(f,{raio:_u(F.total),estado:F.estado,esmaecido:Lt(F.slug)});return Q(F,A),A}let y=vx(f,F.estado,{esmaecido:Lt(F.classe),resolucao:h.nivel==="completo"?16:8});return Q(F,y),y}function Q(F,y){let A=y.userData.aparencia;!s&&A&&(A.pulsa||A.treme)?T.add(F):T.delete(F)}function yt(F){let y=F.__threeObj;y&&(F.tipo==="classe"?Np(y,f,F.cor,Lt(F.slug)):F.tipo==="grupo"?(Oa(y,f,F.estado,Lt(F.slug)),Q(F,y)):F.tipo==="equip"&&(Oa(y,f,F.estado,Lt(F.classe)),Q(F,y)))}function Bt(F){if(F.tipo==="servidor")V.textContent="Sentinela";else if(F.tipo==="classe")V.textContent=vu(F.nome,F.total);else if(F.tipo==="grupo")V.textContent=`${vu(F.nome,F.total)} \xB7 pior: ${Pa(F.estado).rotulo}`;else{let y=h.store?.itens.get(F.id);V.textContent=`${y?.nome??F.id} \xB7 ${Pa(F.estado).rotulo}`}return V}function It(F){let y=F.slug;return Lt(y)?GI(F.cor,gu):F.cor}function Qt(){let F=FI[h.estilo],y=o&&!s&&h.nivel==="completo";e.dataset.particulas=y?"sim":"nao",N.linkColor(A=>It(A)).linkOpacity(NI[h.estilo]).linkVisibility(A=>A.tronco||F).linkDirectionalParticles(A=>A.tronco&&y?4:0)}function Re(F,y,A,O,B){let L=`${F.id}>${y.id}`,j=P.get(L);return(!j||j.cor!==A||j.source!==F||j.target!==y)&&(j={source:F,target:y,cor:A,slug:O,tronco:B,chave:L},P.set(L,j)),j}function k(){let F=[];for(let y of h.store.itens.values())y.classe!==Fa&&F.push(y);return F}function xe(F){let y=new Set;for(let A of F){y.add(A.slug);let O=bp(A),B=S.get(A.slug);B?(B.nome!==A.nome||B.cor!==O||B.total!==A.total)&&(Object.assign(B,{nome:A.nome,cor:O,total:A.total}),yt(B)):(B={id:`h-${A.slug}`,tipo:"classe",slug:A.slug,ordem:A.ordem,nome:A.nome,cor:O,total:A.total},S.set(A.slug,B))}for(let A of[...S.keys()])y.has(A)||S.delete(A)}function Gt(F){let y=Up(h.store.itens),A=new Set;for(let O of F){let B=y.get(O.slug);if(!B)continue;A.add(O.slug);let L=bp(O),j=C.get(O.slug);j?j.total!==B.total?(C.set(O.slug,{...j,__threeObj:void 0,nome:O.nome,cor:L,total:B.total,estado:B.pior}),T.delete(j)):(j.estado!==B.pior||j.nome!==O.nome||j.cor!==L)&&(Object.assign(j,{nome:O.nome,cor:L,estado:B.pior}),yt(j)):(j={id:`g-${O.slug}`,tipo:"grupo",slug:O.slug,ordem:O.ordem,nome:O.nome,cor:L,total:B.total,estado:B.pior},C.set(O.slug,j))}for(let[O,B]of[...C])A.has(O)||(C.delete(O),T.delete(B))}function kt(F){let y=h.store.itens;for(let A of F.remover)T.delete(M.get(A)),M.delete(A);for(let A of F.adicionar){let O=y.get(A);M.set(A,{id:A,tipo:"equip",classe:O.classe,estado:O.estado})}for(let A of F.mudouClasse){let O=M.get(A),B=y.get(A);O&&(O.classe=B.classe,O.estado=B.estado,O.semPosicao=!0,yt(O))}for(let A of F.mudouEstado){let O=M.get(A);O&&(O.estado=y.get(A).estado,yt(O))}for(let A of F.adicionar)M.get(A).semPosicao=!0}function wt({todos:F=!1,animar:y=!1}={}){let A=Gy(h.estilo,h.store.ordemClasses,k()),O=h.estilo!=="a",B=A.get("srv");gt.position.set(B.x,B.y,B.z);let L=new Map([[v,B]]);for(let j of S.values()){let X=A.get(j.id);X&&L.set(j,X)}for(let j of C.values()){let X=A.get(`h-${j.slug}`);X&&L.set(j,X)}for(let j of M.values()){let X=A.get(j.id);X&&(O?L.set(j,X):(F||j.semPosicao)&&(delete j.fx,delete j.fy,delete j.fz,Object.assign(j,{x:X.x,y:X.y,z:X.z,vx:0,vy:0,vz:0})),j.semPosicao=!1)}if(y&&!s){let j=new Map;for(let[X,ct]of L)j.set(X,{x:X.x??ct.x,y:X.y??ct.y,z:X.z??ct.z});h.transicao={inicio:null,de:j,para:L}}else{h.transicao=null;for(let[j,X]of L)Object.assign(j,{fx:X.x,fy:X.y,fz:X.z,x:X.x,y:X.y,z:X.z})}}function _e(){let F=N.d3Force("link");h.estilo==="a"&&h.nivel!=="agrupado"?(N.d3Force("charge")||N.d3Force("charge",zt),zt.strength(-14),F.distance(y=>y.tronco?Ia:26).strength(y=>y.tronco?0:.9)):(N.d3Force("charge",null),F.strength(0))}function Tt(){let F=[v],y=[],A=new Set,O=L=>{A.add(L.chave),y.push(L)};if(h.nivel==="agrupado")for(let L of C.values())F.push(L),O(Re(v,L,L.cor,L.slug,!0));else{for(let L of S.values())F.push(L),O(Re(v,L,L.cor,L.slug,!0));for(let L of M.values()){F.push(L);let j=S.get(L.classe);O(j?Re(j,L,j.cor,j.slug,!1):Re(v,L,"#7A8194",L.classe,!1))}}for(let L of[...P.keys()])A.has(L)||P.delete(L);N.graphData({nodes:F,links:y});let B=0;for(let L of F)L.tipo==="equip"&&(B+=1);e.dataset.nosGrafo=String(B),R&&(R=M.get(R.id)||null),jt()}function jt(){let F=[v,...h.nivel==="agrupado"?C.values():S.values()],y=new Set;for(let A of F){y.add(A.id);let O=A===v?"SENTINELA":vu(A.nome,A.total),B=K.get(A.id);if(!B){let L=document.createElement("div");L.className="teia-rotulo";let j=document.createElement("span");L.appendChild(j),L.hidden=!0,G.appendChild(L),B={el:L,span:j,texto:null,ultimo:""},K.set(A.id,B)}B.no=A,B.texto!==O&&(B.span.textContent=O,B.texto=O),B.el.classList.toggle("servidor",A===v),B.el.classList.toggle("abaixo",A!==v&&Cx(A.ordem)),B.el.classList.toggle("esmaecido",A!==v&&Lt(A.slug)),A.cor&&B.el.style.setProperty("--cor-classe",A.cor)}for(let[A,O]of[...K])y.has(A)||(O.el.remove(),K.delete(A))}function Ie(){let F=N.camera(),y=N.width(),A=N.height(),O=[];for(let X of K.values()){let ct=st(X.no);q.set(ct.x,ct.y,ct.z);let ut=q.distanceTo(F.position);q.project(F);let St=$y({ndc:q,distancia:ut,largura:y,altura:A});if(!St.visivel){X.el.hidden||(X.el.hidden=!0);continue}X.el.hidden&&(X.el.hidden=!1);let nt=X.span.textContent;X.medidoPara!==nt&&(X.medidoPara=nt,X.larg=X.span.offsetWidth,X.alt=X.span.offsetHeight);let vt=X.larg*St.escala,Pt=X.alt*St.escala,qt=X.el.classList.contains("servidor")?30:X.el.classList.contains("abaixo")?14:-(14+Pt),ne=Yy({x:St.x,y:St.y,largura:vt,altura:Pt,palcoL:y,palcoA:A,desloque:qt}),oe=ne.visivel&&b.some(te=>{let Dt=ne.y+qt+Pt/2;return Math.abs(ne.x-te.x)<(vt+te.l)/2&&Math.abs(Dt-te.y)<(Pt+te.a)/2});if(!ne.visivel||oe){X.el.hidden||(X.el.hidden=!0);continue}O.push({r:X,pos:St,dentro:ne,larg:vt,alt:Pt,deslocado:qt})}O.sort((X,ct)=>X.r.no===v?-1:ct.r.no===v?1:(ct.r.no.total||0)-(X.r.no.total||0));let B=O.map(X=>({x:X.dentro.x,topo:X.dentro.y+X.deslocado,l:X.larg,a:X.alt})),L=Ky(B,{limite:A}),j=Jy(B,L,{limite:A});O.forEach((X,ct)=>{let{r:ut,pos:St,dentro:nt}=X;if(!j[ct]){ut.el.hidden||(ut.el.hidden=!0),ut.ultimo="";return}let vt=nt.y+L[ct],Pt=`${nt.x},${vt},${St.escala}`;Pt!==ut.ultimo&&(ut.ultimo=Pt,ut.el.style.transform=`translate3d(${nt.x}px, ${vt}px, 0)`,ut.el.style.setProperty("--escala",String(St.escala)))})}function Ae(F){let y=R;if(!y||h.nivel==="agrupado"){it.visible=!1;return}let A=st(y);it.position.set(A.x,A.y,A.z);let O=tn.haloEquipamento*(s?.95:.9+.12*Math.sin(F*4));it.scale.set(O,O,1),it.visible=!0}function D(){e.dataset.nos=String(h.nivel==="agrupado"?0:M.size),e.dataset.equipamentos=String(h.total),e.dataset.classes=[...(h.nivel==="agrupado"?C:S).keys()].join(","),e.dataset.nivel=h.nivel,e.dataset.movimento=s?"reduzido":"normal",e.dataset.girando=h.girando?"sim":"nao"}function E(){!h.store||h.foco!==null||R||h.transicao||W()!==h.chaveVista&&bt()}let W=()=>`${JSON.stringify(i()||{})}|${h.nivel}|${N.width()}x${N.height()}|${S.size}`;function J(){E();let F=N.camera().position,y=`${Math.round(F.x)},${Math.round(F.y)},${Math.round(F.z)}`;e.dataset.camera!==y&&(e.dataset.camera=y);let A=N.renderer().info.memory,O=String(A.geometries),B=String(A.textures);if(e.dataset.geometrias!==O&&(e.dataset.geometrias=O),e.dataset.texturas!==B&&(e.dataset.texturas=B),l){let L=String(p);e.dataset.rotulosIp!==L&&(e.dataset.rotulosIp=L),rt()}}function rt(){let F=e.getBoundingClientRect(),y=[],A=L=>{!L||!(L.width>0)||!(L.height>0)||y.push({x:L.left-F.left+L.width/2,y:L.top-F.top+L.height/2,l:L.width,a:L.height})};for(let L of K.values())L.el.hidden||A(L.span.getBoundingClientRect());let O=[];try{O=u()||[]}catch{O=[]}let B=y.length;for(let L of O)A(L);b=y.slice(B),x=y}function Z(F){F.rotuloIp&&F.rotuloIp.visible&&(F.rotuloIp.visible=!1)}function Rt(){if(!l)return;if(h.nivel==="agrupado"||!h.store){for(let nt of M.values())nt.__threeObj&&Z(nt.__threeObj.userData);p=0;return}g+=1;let F=N.camera(),y=F.position,A=N.height(),O=N.width(),B=F.fov||50,L=2*Math.tan(B*Math.PI/360)/A,j=[];for(let nt of M.values()){let vt=nt.__threeObj;if(!vt)continue;let Pt=vt.userData;if(Lt(nt.classe)){Z(Pt);continue}let qt=vt.position.distanceTo(y),ne=ex({raio:tn.equipamento,distancia:qt,fovGraus:B,alturaPx:A}),oe=nt===R?h.total<=3e3:nx({diametroPx:ne,totalNos:h.total}),te=0,Dt=0;oe&&(q.copy(vt.position).project(F),(q.z>1||Math.abs(q.x)>1.2||Math.abs(q.y)>1.2)&&(oe=!1),te=(q.x+1)/2*O,Dt=(1-q.y)/2*A);let be=oe?Dy(h.store.itens.get(nt.id)?.ip):"";if(!be){Z(Pt);continue}let ie=nt===R?-1:qt;j.push({obj:vt,u:Pt,texto:be,distancia:qt,diametroPx:ne,x:te,y:Dt,prio:ie})}j.sort((nt,vt)=>nt.prio-vt.prio);let X=[];for(let nt of j){nt.tex=_.obter(nt.texto,g),nt.alturaPx=rx(nt.diametroPx)/nt.tex.userData.letra;let vt=nt.alturaPx*nt.tex.userData.aspecto,Pt=nt.alturaPx;nt.caixa={x:nt.x,y:nt.y,l:vt,a:Pt},nt.x-vt/2>=Ua&&nt.x+vt/2<=O-Ua&&nt.y-Pt/2>=Ua&&nt.y+Pt/2<=A-Ua?X.push(nt):Z(nt.u)}let ct=ox(X.map(nt=>nt.caixa),Ua,x),ut=performance.now(),St=0;X.forEach((nt,vt)=>{if(!ct[vt]){Z(nt.u);return}nt.u.rotuloIp||(nt.u.rotuloIp=bx(),nt.obj.add(nt.u.rotuloIp));let Pt=nt.u.rotuloIp,qt=Pt.material;qt.map!==nt.tex&&(qt.map||(qt.needsUpdate=!0),qt.map=nt.tex),Pt.visible||(nt.u.ipDesde=ut),qt.opacity=s?1:ix(ut-nt.u.ipDesde+16);let ne=nt.alturaPx*nt.distancia*L;Pt.scale.set(ne*nt.tex.userData.aspecto,ne,1),Pt.visible=!0,St+=1}),p=St}function ht(F){let y=h.nivel;if(h.nivel=F,F!=="completo"&&ka(),F==="agrupado"){for(let A of M.values())T.delete(A);M.clear(),w=new Map}else{for(let A of C.values())T.delete(A);C.clear()}if(y!==F&&F!=="agrupado"&&y!=="agrupado"){for(let A of M.values())T.delete(A);N.nodeThreeObject(A=>$(A))}}function Et(F){if(h.destruido)return;h.store=F,h.total=Fp(F.itens).size;let y=Sp({total:h.total,agrupadoPorFps:h.agrupadoPorFps,ultimaEntrada:h.ultimaEntradaFps});h.agrupadoPorFps=y.agrupadoPorFps,y.nivel!==h.nivel&&ht(y.nivel);let A=Ax(F);if(xe(A),h.nivel==="agrupado")Gt(A),w=new Map;else{let j=Tx(w,F.itens);kt(j),w=Fp(F.itens)}let O=A.map(j=>j.slug).join(","),B=O!==h.conjuntoClasses,L=h.conjuntoClasses===void 0;h.conjuntoClasses=O,wt(B&&!L?{animar:!0}:{}),_e(),Qt(),Tt(),D(),B&&!h.foco&&!R&&bt()}function At(F){if(h.destruido||!h.store)return;let y=h.store.itens.get(F);if(!y)return;if(h.nivel==="agrupado"){let B=C.get(y.classe);if(!B)return;let L=Up(h.store.itens).get(y.classe);L&&L.pior!==B.estado&&(B.estado=L.pior,yt(B));return}let A=M.get(F);if(!A||A.estado===y.estado)return;A.estado=y.estado;let O=w.get(F);O&&(O.estado=y.estado),yt(A)}function st(F){return{x:F.fx??F.x??0,y:F.fy??F.y??0,z:F.fz??F.z??0}}function _t(F,y,A){en(),Ht(0);let O=N.camera(),B=Xy({alvo:F,de:y,raio:A,fov:O.fov||50,largura:N.width(),altura:N.height(),margens:i()||{}});N.cameraPosition(B.camera,B.olhar,s?0:zp)}function Ft(F,y){let A=[];for(let O of M.values())O.classe===F&&A.push(st(O));return qy(y,A,tn.haloEquipamento/2,40)}function Mt(F){h.girando=F&&!s,dt.autoRotate=h.girando,e.dataset.girando=h.girando?"sim":"nao"}function pt(F){if(F.tipo==="equip")n?n(F.id):xt(F.id);else if(F.tipo==="classe"||F.tipo==="grupo")r(F.slug);else if(F.tipo==="servidor"&&h.store&&n){for(let y of h.store.itens.values())if(y.classe===Fa){n(y.id);break}}}function Wt(){for(let F of S.values())yt(F);for(let F of C.values())yt(F);for(let F of M.values())yt(F);Qt(),jt()}function H(F){if(!h.destruido){if(h.foco=F??null,R&&R.classe!==h.foco&&(R=null),Wt(),h.foco===null){Mt(!0);return}Mt(!1),lt()}}function lt(){let F=h.nivel==="agrupado",y=F?C.get(h.foco):S.get(h.foco);if(!y)return;let A=st(y),O=F?_u(y.total)*2+30:Ft(h.foco,A);_t(A,st(v),O)}function ft(){h.destruido||(R?xt(R.id):h.foco?lt():bt())}function xt(F){if(h.destruido||!h.store)return;let y=h.store.itens.get(F);if(!y)return;if(h.nivel==="agrupado"){C.has(y.classe)&&H(y.classe);return}let A=M.get(F);if(!A)return;Mt(!1),R=A;let O=S.get(A.classe),B=O?Math.max(36,.55*Ft(A.classe,st(O))):36;_t(st(A),st(O||v),B)}function at(){R=null}function tt(){gr(),h.agrupadoPorFps&&(h.agrupadoPorFps=zy({agrupadoPorFps:!0}).agrupadoPorFps,h.store&&Et(h.store))}function bt(){let F=h.estilo==="e",y=F?Px:Rx,A=F?Ix:{x:0,y:0,z:0};if(!h.store){en(),N.cameraPosition(c?ro(y):y,A,s?0:zp);return}h.chaveVista=W();let O=Zy({pontos:se(),alvo:A,direcao:{x:y.x-A.x,y:y.y-A.y,z:y.z-A.z},fov:N.camera().fov||50,largura:N.width(),altura:N.height(),margens:i()||{},maximo:du-400});Gn(O.desvio),Ht(O.distancia),!O.girar&&h.girando?(Mt(!1),h.giroSuspenso=!0):O.girar&&h.giroSuspenso&&(h.giroSuspenso=!1,Mt(!0)),N.cameraPosition(O.camera,A,s?0:zp)}function Ht(F){ot.fog&&(ot.fog.density=Math.min(Ox,1.1/Math.max(1,F)))}function he(F){return h.transicao&&h.transicao.para.get(F)||st(F)}function se(){let F=[{...he(v),raio:38,rotulo:!0}],y=h.nivel==="agrupado";for(let A of y?C.values():S.values()){let O=y?_u(A.total):h.estilo==="a"?75:12;F.push({...he(A),raio:O,rotulo:!0})}if(!y){let A=[...M.values()],O=Math.max(1,Math.ceil(A.length/1500));for(let B=0;B<A.length;B+=O)F.push({...he(A[B]),raio:tn.haloEquipamento/2})}return F}function Gn(F){let y=N.camera();if(!y||typeof y.setViewOffset!="function")return;let A=N.width(),O=N.height();if(e.dataset.desvio=F?`${F.x},${F.y}`:"0,0",!F||!F.x&&!F.y){en();return}y.setViewOffset(A,O,-F.x,F.y,A,O)}function en(){let F=N.camera();F&&F.view&&F.view.enabled&&typeof F.clearViewOffset=="function"&&F.clearViewOffset()}function ro(F){let y=N.width(),A=N.height();if(!(y>0&&A>0))return F;let O=Math.tan((N.camera().fov||50)*Math.PI/360),B=O*(y/A),L=Math.max(.5,1-2*Lx.lado/y),j=Math.max(.5,1-2*Lx.cima/A),X=Math.max(Dx/(B*L),Dx/(O*j)),ct=Math.hypot(F.x,F.y,F.z),ut=Math.min(kI,Math.max(ct,X))/ct;return{x:F.x*ut,y:F.y*ut,z:F.z*ut}}function yi(){h.destruido||(tt(),R=null,h.foco!==null&&(h.foco=null,Wt()),Mt(!0),bt())}function so(F){if(h.destruido)return;let y=Nx(F);y!==h.estilo&&(h.estilo=y,tt(),h.store&&(wt({todos:!0,animar:y!=="a"}),_e(),Qt(),N.d3ReheatSimulation()),!h.foco&&!R?bt():h.transicao||ft())}function za(){let F=d.media();if(h.nivel!=="completo"||!Fy(F,s)){h.bloom=!1;return}let y=N.postProcessingComposer(),A=new eo(new et(N.width(),N.height()),1,.5,.55),O=new au;y.addPass(A),y.addPass(O),Lp(f,!0),h.bloom={passe:A,saida:O}}function ka(){if(h.bloom){let F=N.postProcessingComposer();F.removePass(h.bloom.passe),F.removePass(h.bloom.saida),h.bloom.passe.dispose(),h.bloom.saida.dispose(),Lp(f,!1)}h.bloom!==null&&(h.bloom=!1)}function mr(F){if(m=requestAnimationFrame(mr),d.quadro(),h.inicioRender===null&&(h.inicioRender=F),h.bloom===null&&F-h.inicioRender>=zI&&za(),F-h.ultimoCheque>=1e3&&(h.ultimoCheque=F,h.store&&!h.agrupadoPorFps)){let L=Sp({total:h.total,agrupadoPorFps:!1,queda:Uy(d),agora:F,ultimaEntrada:h.ultimaEntradaFps});L.agrupadoPorFps&&(h.agrupadoPorFps=!0,h.ultimaEntradaFps=L.ultimaEntrada,Et(h.store))}let y=h.transicao;if(y){y.inicio===null&&(y.inicio=F);let L=HI(Math.min(1,(F-y.inicio)/UI));for(let[j,X]of y.para){let ct=y.de.get(j);j.fx=ct.x+(X.x-ct.x)*L,j.fy=ct.y+(X.y-ct.y)*L,j.fz=ct.z+(X.z-ct.z)*L}L>=1&&(h.transicao=null,ft())}F-h.ultimaLeitura>=BI&&(h.ultimaLeitura=F,J());let A=F/1e3;if(Ae(A),Ie(),Rt(),s)return;let O=v.__threeObj?.userData.aneis;O&&(O[0].rotation.x=A*.5,O[0].rotation.y=A*.3,O[1].rotation.y=-A*.25,O[1].rotation.z=A*.2),Y.rotation.y=A*.004,Y.rotation.x=Math.sin(A*.05)*.02;let B=Math.abs(Math.sin(A*3.2));for(let L of T){let j=L.__threeObj;if(!j)continue;let X=j.userData,ct=X.escala||1;if(X.aparencia.pulsa){let ut=ct>1?.25:.55,St=ct>1?1:1.4,nt=tn.haloEquipamento*ct*(1+ut*B)*St;X.halo.scale.set(nt,nt,1),X.esfera.scale.setScalar(ct*(ct>1?.95+.1*B:.85+.3*B))}else X.aparencia.treme&&X.esfera.position.set(Math.sin(A*37+X.semente)*.35,Math.cos(A*41+X.semente)*.35,0)}}function oo(){m===null&&(m=requestAnimationFrame(mr))}function gr(){d=Mp(),h.inicioRender=null,h.ultimoCheque=0}function Ba(){h.destruido||h.pausado||(h.pausado=!0,m!==null&&cancelAnimationFrame(m),m=null,N.pauseAnimation())}function Va(){h.destruido||!h.pausado||(h.pausado=!1,N.resumeAnimation(),tt(),oo())}function Ha(){document.visibilityState==="visible"&&!h.pausado&&gr()}document.addEventListener("visibilitychange",Ha);function ao(){let F=e.clientWidth,y=e.clientHeight;F>0&&y>0&&(F!==N.width()||y!==N.height())&&(N.width(F).height(y),!R&&h.foco===null?bt():en())}let Zr=null;typeof ResizeObserver=="function"?(Zr=new ResizeObserver(ao),Zr.observe(e)):window.addEventListener("resize",ao);function yu(F){F.traverse(y=>{y.geometry?.dispose();let A=Array.isArray(y.material)?y.material:y.material?[y.material]:[];for(let O of A)O.map?.dispose(),O.dispose()})}function xu(){if(h.destruido)return;h.destruido=!0,m!==null&&cancelAnimationFrame(m),m=null,document.removeEventListener("visibilitychange",Ha),Zr?Zr.disconnect():window.removeEventListener("resize",ao);let F=N.renderer(),y=N.postProcessingComposer();N.pauseAnimation(),N.onNodeClick(null).onNodeHover(null),yu(ot),f.liberar(),_.liberarTudo(),N._destructor();for(let A of y.passes)A.dispose?.();for(y.dispose(),dt.dispose(),ot.clear(),ot.fog=null,F.dispose(),F.forceContextLoss(),T.clear(),K.clear(),R=null,M.clear(),S.clear(),C.clear(),P.clear();e.firstChild;)e.removeChild(e.firstChild);e.style.cursor="",e.classList.remove("teia-cena"),delete e.dataset.nos,delete e.dataset.equipamentos,delete e.dataset.nivel,delete e.dataset.movimento;for(let A of["nosGrafo","girando","particulas","camera","geometrias","texturas","rotulosIp"])delete e.dataset[A]}return D(),oo(),{sincronizar:Et,atualizarEstado:At,definirEstilo:so,focarClasse:H,focarEquipamento:xt,limparSelecao:at,reenquadrar:ft,verTudo:yi,pausar:Ba,retomar:Va,destruir:xu,nivel:()=>h.nivel}}export{Ap as ESTILOS,rI as NOMES_ESTILO,WI as montarTeia};
