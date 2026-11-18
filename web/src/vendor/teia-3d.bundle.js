var mx=Object.create;var Ep=Object.defineProperty;var gx=Object.getOwnPropertyDescriptor;var _x=Object.getOwnPropertyNames;var vx=Object.getPrototypeOf,yx=Object.prototype.hasOwnProperty;var gn=(t,e)=>()=>{try{return e||t((e={exports:{}}).exports,e),e.exports}catch(n){throw e=0,n}};var xx=(t,e,n,i)=>{if(e&&typeof e=="object"||typeof e=="function")for(let r of _x(e))!yx.call(t,r)&&r!==n&&Ep(t,r,{get:()=>e[r],enumerable:!(i=gx(e,r))||i.enumerable});return t};var bx=(t,e,n)=>(n=t!=null?mx(vx(t)):{},xx(e||!t||!t.__esModule?Ep(n,"default",{value:t,enumerable:!0}):n,t));var Xf=gn((ZN,y0)=>{y0.exports=function(e){return e===0?"x":e===1?"y":e===2?"z":"c"+(e+1)}});var Gr=gn((KN,x0)=>{var OE=Xf();x0.exports=function(e){return n;function n(i,r){let s=r&&r.indent||0,o=r&&r.join!==void 0?r.join:`
`,a=Array(s+1).join(" "),l=[];for(let c=0;c<e;++c){let h=OE(c),u=c===0?"":a;l.push(u+i.replace(/{var}/g,h))}return l.join(o)}}});var E0=gn((JN,fa)=>{var b0=Gr();fa.exports=NE;fa.exports.generateCreateBodyFunctionBody=M0;fa.exports.getVectorCode=w0;fa.exports.getBodyCode=S0;function NE(t,e){let n=M0(t,e),{Body:i}=new Function(n)();return i}function M0(t,e){return`
${w0(t,e)}
${S0(t,e)}
return {Body: Body, Vector: Vector};
`}function S0(t){let e=b0(t),n=e("{var}",{join:", "});return`
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
};`}function w0(t,e){let n=b0(t),i="";return e&&(i=`${n(`
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
  };`}});var D0=gn((QN,cr)=>{var $f=Gr(),ar=Xf();cr.exports=FE;cr.exports.generateQuadTreeFunctionBody=T0;cr.exports.getInsertStackCode=I0;cr.exports.getQuadNodeCode=P0;cr.exports.isSamePosition=A0;cr.exports.getChildBodyCode=R0;cr.exports.setChildBodyCode=C0;function FE(t){let e=T0(t);return new Function(e)()}function T0(t){let e=$f(t),n=Math.pow(2,t);return`
${I0()}
${P0(t)}
${A0(t)}
${R0(t)}
${C0(t)}

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
        if ((node.max_${ar(0)} - node.min_${ar(0)}) / r < theta) {
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

`;function r(a){let l=[],c=Array(a+1).join(" ");for(let h=0;h<t;++h)l.push(c+`if (${ar(h)} > max_${ar(h)}) {`),l.push(c+`  quadIdx = quadIdx + ${Math.pow(2,h)};`),l.push(c+`  min_${ar(h)} = max_${ar(h)};`),l.push(c+`  max_${ar(h)} = node.max_${ar(h)};`),l.push(c+"}");return l.join(`
`)}function s(){let a=Array(11).join(" "),l=[];for(let c=0;c<n;++c)l.push(a+`if (node.quad${c}) {`),l.push(a+`  queue[pushIdx] = node.quad${c};`),l.push(a+"  queueLength += 1;"),l.push(a+"  pushIdx += 1;"),l.push(a+"}");return l.join(`
`)}function o(a){let l=[];for(let c=0;c<n;++c)l.push(`${a}quad${c} = null;`);return l.join(`
`)}}function A0(t){let e=$f(t);return`
  function isSamePosition(point1, point2) {
    ${e("var d{var} = Math.abs(point1.{var} - point2.{var});",{indent:2})}
  
    return ${e("d{var} < 1e-8",{join:" && "})};
  }  
`}function C0(t){var e=Math.pow(2,t);return`
function setChild(node, idx, child) {
  ${n()}
}`;function n(){let i=[];for(let r=0;r<e;++r){let s=r===0?"  ":"  else ";i.push(`${s}if (idx === ${r}) node.quad${r} = child;`)}return i.join(`
`)}}function R0(t){return`function getChild(node, idx) {
${e()}
  return null;
}`;function e(){let n=[],i=Math.pow(2,t);for(let r=0;r<i;++r)n.push(`  if (idx === ${r}) return node.quad${r};`);return n.join(`
`)}}function P0(t){let e=$f(t),n=Math.pow(2,t);var i=`
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
`)}}function I0(){return`
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
`}});var O0=gn((eF,Yf)=>{Yf.exports=zE;Yf.exports.generateFunctionBody=L0;var UE=Gr();function zE(t){let e=L0(t);return new Function("bodies","settings","random",e)}function L0(t){let e=UE(t);return`
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
`}});var F0=gn((tF,Zf)=>{var kE=Gr();Zf.exports=BE;Zf.exports.generateCreateDragForceFunctionBody=N0;function BE(t){let e=N0(t);return new Function("options",e)}function N0(t){return`
  if (!Number.isFinite(options.dragCoefficient)) throw new Error('dragCoefficient is not a finite number');

  return {
    update: function(body) {
      ${kE(t)("body.force.{var} -= options.dragCoefficient * body.velocity.{var};",{indent:6})}
    }
  };
`}});var z0=gn((nF,Kf)=>{var VE=Gr();Kf.exports=HE;Kf.exports.generateCreateSpringForceFunctionBody=U0;function HE(t){let e=U0(t);return new Function("options","random",e)}function U0(t){let e=VE(t);return`
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
`}});var B0=gn((iF,Jf)=>{var GE=Gr();Jf.exports=WE;Jf.exports.generateIntegratorFunctionBody=k0;function WE(t){let e=k0(t);return new Function("bodies","timeStep","adaptiveTimeStepWeight",e)}function k0(t){let e=GE(t);return`
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
`}});var H0=gn((rF,V0)=>{V0.exports=jE;function jE(t,e,n,i){this.from=t,this.to=e,this.length=n,this.coefficient=i}});var j0=gn((sF,W0)=>{W0.exports=G0;function G0(t,e){var n;if(t||(t={}),e){for(n in e)if(e.hasOwnProperty(n)){var i=t.hasOwnProperty(n),r=typeof e[n],s=!i||typeof t[n]!==r;s?t[n]=e[n]:r==="object"&&(t[n]=G0(t[n],e[n]))}}return t}});var Qf=gn((oF,q0)=>{"use strict";function qE(t){$E(t);let e=XE(t);return t.on=e.on,t.off=e.off,t.fire=e.fire,t}function XE(t){let e=Object.create(null);return{on:function(n,i,r){if(typeof i!="function")throw new Error("callback is expected to be a function");let s=e[n];return s||(s=e[n]=[]),s.push({callback:i,ctx:r}),t},off:function(n,i){if(typeof n>"u")return e=Object.create(null),t;if(e[n])if(typeof i!="function")delete e[n];else{let r=e[n];for(let s=0;s<r.length;++s)r[s].callback===i&&r.splice(s,1)}return t},fire:function(n){let i=e[n];if(!i)return t;let r;arguments.length>1&&(r=Array.prototype.slice.call(arguments,1));for(let s=0;s<i.length;++s){let o=i[s];o.callback.apply(o.ctx,r)}return t}}}function $E(t){if(!t)throw new Error("Eventify cannot use falsy object as events subject");let e=["on","fire","off"];for(let n=0;n<e.length;++n)if(t.hasOwnProperty(e[n]))throw new Error("Subject cannot be eventified, since it already has property '"+e[n]+"'")}q0.exports=qE});var $0=gn((aF,oh)=>{oh.exports=ed;oh.exports.random=ed,oh.exports.randomIterator=JE;function ed(t){var e=typeof t=="number"?t:+new Date;return new Wr(e)}function Wr(t){this.seed=t}Wr.prototype.next=KE;Wr.prototype.nextDouble=td;Wr.prototype.uniform=td;Wr.prototype.gaussian=YE;Wr.prototype.random=td;function YE(){var t,e,n;do e=this.nextDouble()*2-1,n=this.nextDouble()*2-1,t=e*e+n*n;while(t>=1||t===0);return e*Math.sqrt(-2*Math.log(t)/t)}Wr.prototype.levy=ZE;function ZE(){var t=1.5,e=Math.pow(X0(1+t)*Math.sin(Math.PI*t/2)/(X0((1+t)/2)*t*Math.pow(2,(t-1)/2)),1/t);return this.gaussian()*e/Math.pow(Math.abs(this.gaussian()),1/t)}function X0(t){return Math.sqrt(2*Math.PI/t)*Math.pow(1/Math.E*(t+1/(12*t-1/(10*t))),t)}function td(){var t=this.seed;return t=t+2127912214+(t<<12)&4294967295,t=(t^3345072700^t>>>19)&4294967295,t=t+374761393+(t<<5)&4294967295,t=(t+3550635116^t<<9)&4294967295,t=t+4251993797+(t<<3)&4294967295,t=(t^3042594569^t>>>16)&4294967295,this.seed=t,(t&268435455)/268435456}function KE(t){return Math.floor(this.nextDouble()*t)}function JE(t,e){var n=e||ed();if(typeof n.next!="function")throw new Error("customRandom does not match expected API: next() function is missing");return{forEach:r,shuffle:i};function i(){var s,o,a;for(s=t.length-1;s>0;--s)o=n.next(s+1),a=t[o],t[o]=t[s],t[s]=a;return t}function r(s){var o,a,l;for(o=t.length-1;o>0;--o)a=n.next(o+1),l=t[a],t[a]=t[o],t[o]=l,s(l);t.length&&s(t[0])}}});var nd=gn((cF,Z0)=>{Z0.exports=sT;var QE=E0(),eT=D0(),tT=O0(),nT=F0(),iT=z0(),rT=B0(),Y0={};function sT(t){var e=H0(),n=j0(),i=Qf();if(t){if(t.springCoeff!==void 0)throw new Error("springCoeff was renamed to springCoefficient");if(t.dragCoeff!==void 0)throw new Error("dragCoeff was renamed to dragCoefficient")}t=n(t,{springLength:10,springCoefficient:.8,gravity:-12,theta:.8,dragCoefficient:.9,timeStep:.5,adaptiveTimeStepWeight:0,dimensions:2,debug:!1});var r=Y0[t.dimensions];if(!r){var s=t.dimensions;r={Body:QE(s,t.debug),createQuadTree:eT(s),createBounds:tT(s),createDragForce:nT(s),createSpringForce:iT(s),integrate:rT(s)},Y0[s]=r}var o=r.Body,a=r.createQuadTree,l=r.createBounds,c=r.createDragForce,h=r.createSpringForce,u=r.integrate,d=D=>new o(D),f=$0().random(42),m=[],_=[],g=a(t,f),p=l(m,t,f),x=h(t,f),y=c(t),v=0,M=[],b=new Map,A=0;w("nbody",B),w("spring",L);var C={bodies:m,quadTree:g,springs:_,settings:t,addForce:w,removeForce:I,getForces:N,step:function(){for(var D=0;D<M.length;++D)M[D](A);var F=u(m,t.timeStep,t.adaptiveTimeStepWeight);return A+=1,F},addBody:function(D){if(!D)throw new Error("Body is required");return m.push(D),D},addBodyAt:function(D){if(!D)throw new Error("Body position is required");var F=d(D);return m.push(F),F},removeBody:function(D){if(D){var F=m.indexOf(D);if(!(F<0))return m.splice(F,1),m.length===0&&p.reset(),!0}},addSpring:function(D,F,J,G){if(!D||!F)throw new Error("Cannot add null spring to force simulator");typeof J!="number"&&(J=-1);var le=new e(D,F,J,G>=0?G:-1);return _.push(le),le},getTotalMovement:function(){return v},removeSpring:function(D){if(D){var F=_.indexOf(D);if(F>-1)return _.splice(F,1),!0}},getBestNewBodyPosition:function(D){return p.getBestNewPosition(D)},getBBox:E,getBoundingBox:E,invalidateBBox:function(){console.warn("invalidateBBox() is deprecated, bounds always recomputed on `getBBox()` call")},gravity:function(D){return D!==void 0?(t.gravity=D,g.options({gravity:D}),this):t.gravity},theta:function(D){return D!==void 0?(t.theta=D,g.options({theta:D}),this):t.theta},random:f};return oT(t,C),i(C),C;function E(){return p.update(),p.box}function w(D,F){if(b.has(D))throw new Error("Force "+D+" is already added");b.set(D,F),M.push(F)}function I(D){var F=M.indexOf(b.get(D));F<0||(M.splice(F,1),b.delete(D))}function N(){return b}function B(){if(m.length!==0){g.insertBodies(m);for(var D=m.length;D--;){var F=m[D];F.isPinned||(F.reset(),g.updateBodyForce(F),y.update(F))}}}function L(){for(var D=_.length;D--;)x.update(_[D])}}function oT(t,e){for(var n in t)aT(t,e,n)}function aT(t,e,n){if(t.hasOwnProperty(n)&&typeof e[n]!="function"){var i=Number.isFinite(t[n]);i?e[n]=function(r){if(r!==void 0){if(!Number.isFinite(r))throw new Error("Value of "+n+" should be a valid number.");return t[n]=r,e}return t[n]}:e[n]=function(r){return r!==void 0?(t[n]=r,e):t[n]}}}});var K0=gn((lF,id)=>{id.exports=lT;id.exports.simulator=nd();var cT=Qf();function lT(t,e){if(!t)throw new Error("Graph structure cannot be undefined");var n=e&&e.createSimulator||nd(),i=n(e);if(Array.isArray(e))throw new Error("Physics settings is expected to be an object");var r=t.version>19?B:N;e&&typeof e.nodeMass=="function"&&(r=e.nodeMass);var s=new Map,o={},a=0,l=i.settings.springTransform||hT;y(),g();var c=!1,h={step:function(){if(a===0)return u(!0),!0;var L=i.step();h.lastMove=L,h.fire("step");var D=L/a,F=D<=.01;return u(F),F},getNodePosition:function(L){return I(L).pos},setNodePosition:function(L){var D=I(L);D.setPosition.apply(D,Array.prototype.slice.call(arguments,1))},getLinkPosition:function(L){var D=o[L];if(D)return{from:D.from.pos,to:D.to.pos}},getGraphRect:function(){return i.getBBox()},forEachBody:d,pinNode:function(L,D){var F=I(L.id);F.isPinned=!!D},isNodePinned:function(L){return I(L.id).isPinned},dispose:function(){t.off("changed",x),h.fire("disposed")},getBody:_,getSpring:m,getForceVectorLength:f,simulator:i,graph:t,lastMove:0};return cT(h),h;function u(L){c!==L&&(c=L,p(L))}function d(L){s.forEach(L)}function f(){var L=0,D=0;return d(function(F){L+=Math.abs(F.force.x),D+=Math.abs(F.force.y)}),Math.sqrt(L*L+D*D)}function m(L,D){var F;if(D===void 0)typeof L!="object"?F=L:F=L.id;else{var J=t.hasLink(L,D);if(!J)return;F=J.id}return o[F]}function _(L){return s.get(L)}function g(){t.on("changed",x)}function p(L){h.fire("stable",L)}function x(L){for(var D=0;D<L.length;++D){var F=L[D];F.changeType==="add"?(F.node&&v(F.node.id),F.link&&b(F.link)):F.changeType==="remove"&&(F.node&&M(F.node),F.link&&A(F.link))}a=t.getNodesCount()}function y(){a=0,t.forEachNode(function(L){v(L.id),a+=1}),t.forEachLink(b)}function v(L){var D=s.get(L);if(!D){var F=t.getNode(L);if(!F)throw new Error("initBody() was called with unknown node id");var J=F.position;if(!J){var G=C(F);J=i.getBestNewBodyPosition(G)}D=i.addBodyAt(J),D.id=L,s.set(L,D),E(L),w(F)&&(D.isPinned=!0)}}function M(L){var D=L.id,F=s.get(D);F&&(s.delete(D),i.removeBody(F))}function b(L){E(L.fromId),E(L.toId);var D=s.get(L.fromId),F=s.get(L.toId),J=i.addSpring(D,F,L.length);l(L,J),o[L.id]=J}function A(L){var D=o[L.id];if(D){var F=t.getNode(L.fromId),J=t.getNode(L.toId);F&&E(F.id),J&&E(J.id),delete o[L.id],i.removeSpring(D)}}function C(L){var D=[];if(!L.links)return D;for(var F=Math.min(L.links.length,2),J=0;J<F;++J){var G=L.links[J],le=G.fromId!==L.id?s.get(G.fromId):s.get(G.toId);le&&le.pos&&D.push(le)}return D}function E(L){var D=s.get(L);if(D.mass=r(L),Number.isNaN(D.mass))throw new Error("Node mass should be a number")}function w(L){return L&&(L.isPinned||L.data&&L.data.isPinned)}function I(L){var D=s.get(L);return D||(v(L),D=s.get(L)),D}function N(L){var D=t.getLinks(L);return D?1+D.length/3:1}function B(L){var D=t.getLinks(L);return D?1+D.size/3:1}}function hT(){}});var zt={LEFT:0,MIDDLE:1,RIGHT:2,ROTATE:0,DOLLY:1,PAN:2},Gn={ROTATE:0,PAN:1,DOLLY_PAN:2,DOLLY_ROTATE:3},rm=0,ju=1,sm=2;var qu=1,om=2,gi=3,Di=0,Jt=1,_i=2,ii=0,Cr=1,ir=2,Xu=3,$u=4,am=5,er=100,cm=101,lm=102,hm=103,um=104,fm=200,dm=201,pm=202,mm=203,uc=204,fc=205,gm=206,_m=207,vm=208,ym=209,xm=210,bm=211,Mm=212,Sm=213,wm=214,qc=0,Xc=1,$c=2,Rr=3,Yc=4,Zc=5,Kc=6,Jc=7,Qc=0,Em=1,Tm=2,zi=0,el=1,tl=2,nl=3,il=4,rl=5,sl=6,ol=7;var Yu=300,Nr=301,Fr=302,al=303,cl=304,Qo=306,dc=1e3,Qi=1001,pc=1002,kn=1003,Am=1004;var ea=1005;var ti=1006,ll=1007;var rr=1008;var ri=1009,Zu=1010,Ku=1011,Os=1012,hl=1013,sr=1014,vi=1015,Wn=1016,ul=1017,fl=1018,Ns=1020,Ju=35902,Qu=35899,ef=1021,tf=1022,jn=1023,ys=1026,Fs=1027,nf=1028,dl=1029,rf=1030,pl=1031;var ml=1033,ta=33776,na=33777,ia=33778,ra=33779,gl=35840,_l=35841,vl=35842,yl=35843,xl=36196,bl=37492,Ml=37496,Sl=37808,wl=37809,El=37810,Tl=37811,Al=37812,Cl=37813,Rl=37814,Pl=37815,Il=37816,Dl=37817,Ll=37818,Ol=37819,Nl=37820,Fl=37821,Ul=36492,zl=36494,kl=36495,Bl=36283,Vl=36284,Hl=36285,Gl=36286;var wo=2300,mc=2301,lc=2302,Fu=2400,Uu=2401,zu=2402;var Cm=3200,Rm=3201;var Wl=0,Pm=1,ki="",Zt="srgb",Pr="srgb-linear",Eo="linear",ht="srgb";var Ar=7680;var ku=519,Im=512,Dm=513,Lm=514,sf=515,Om=516,Nm=517,Fm=518,Um=519,gc=35044;var of="300 es",ei=2e3,To=2001;var fi=class{addEventListener(e,n){this._listeners===void 0&&(this._listeners={});let i=this._listeners;i[e]===void 0&&(i[e]=[]),i[e].indexOf(n)===-1&&i[e].push(n)}hasEventListener(e,n){let i=this._listeners;return i===void 0?!1:i[e]!==void 0&&i[e].indexOf(n)!==-1}removeEventListener(e,n){let i=this._listeners;if(i===void 0)return;let r=i[e];if(r!==void 0){let s=r.indexOf(n);s!==-1&&r.splice(s,1)}}dispatchEvent(e){let n=this._listeners;if(n===void 0)return;let i=n[e.type];if(i!==void 0){e.target=this;let r=i.slice(0);for(let s=0,o=r.length;s<o;s++)r[s].call(this,e);e.target=null}}},en=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],Tp=1234567,xo=Math.PI/180,xs=180/Math.PI;function Pi(){let t=Math.random()*4294967295|0,e=Math.random()*4294967295|0,n=Math.random()*4294967295|0,i=Math.random()*4294967295|0;return(en[t&255]+en[t>>8&255]+en[t>>16&255]+en[t>>24&255]+"-"+en[e&255]+en[e>>8&255]+"-"+en[e>>16&15|64]+en[e>>24&255]+"-"+en[n&63|128]+en[n>>8&255]+"-"+en[n>>16&255]+en[n>>24&255]+en[i&255]+en[i>>8&255]+en[i>>16&255]+en[i>>24&255]).toLowerCase()}function nt(t,e,n){return Math.max(e,Math.min(n,t))}function af(t,e){return(t%e+e)%e}function Mx(t,e,n,i,r){return i+(t-e)*(r-i)/(n-e)}function Sx(t,e,n){return t!==e?(n-t)/(e-t):0}function bo(t,e,n){return(1-n)*t+n*e}function wx(t,e,n,i){return bo(t,e,1-Math.exp(-n*i))}function Ex(t,e=1){return e-Math.abs(af(t,e*2)-e)}function Tx(t,e,n){return t<=e?0:t>=n?1:(t=(t-e)/(n-e),t*t*(3-2*t))}function Ax(t,e,n){return t<=e?0:t>=n?1:(t=(t-e)/(n-e),t*t*t*(t*(t*6-15)+10))}function Cx(t,e){return t+Math.floor(Math.random()*(e-t+1))}function Rx(t,e){return t+Math.random()*(e-t)}function Px(t){return t*(.5-Math.random())}function Ix(t){t!==void 0&&(Tp=t);let e=Tp+=1831565813;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}function Dx(t){return t*xo}function Lx(t){return t*xs}function Ox(t){return(t&t-1)===0&&t!==0}function Nx(t){return Math.pow(2,Math.ceil(Math.log(t)/Math.LN2))}function Fx(t){return Math.pow(2,Math.floor(Math.log(t)/Math.LN2))}function Ux(t,e,n,i,r){let s=Math.cos,o=Math.sin,a=s(n/2),l=o(n/2),c=s((e+i)/2),h=o((e+i)/2),u=s((e-i)/2),d=o((e-i)/2),f=s((i-e)/2),m=o((i-e)/2);switch(r){case"XYX":t.set(a*h,l*u,l*d,a*c);break;case"YZY":t.set(l*d,a*h,l*u,a*c);break;case"ZXZ":t.set(l*u,l*d,a*h,a*c);break;case"XZX":t.set(a*h,l*m,l*f,a*c);break;case"YXY":t.set(l*f,a*h,l*m,a*c);break;case"ZYZ":t.set(l*m,l*f,a*h,a*c);break;default:console.warn("THREE.MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+r)}}function Qn(t,e){switch(e.constructor){case Float32Array:return t;case Uint32Array:return t/4294967295;case Uint16Array:return t/65535;case Uint8Array:return t/255;case Int32Array:return Math.max(t/2147483647,-1);case Int16Array:return Math.max(t/32767,-1);case Int8Array:return Math.max(t/127,-1);default:throw new Error("Invalid component type.")}}function pt(t,e){switch(e.constructor){case Float32Array:return t;case Uint32Array:return Math.round(t*4294967295);case Uint16Array:return Math.round(t*65535);case Uint8Array:return Math.round(t*255);case Int32Array:return Math.round(t*2147483647);case Int16Array:return Math.round(t*32767);case Int8Array:return Math.round(t*127);default:throw new Error("Invalid component type.")}}var gt={DEG2RAD:xo,RAD2DEG:xs,generateUUID:Pi,clamp:nt,euclideanModulo:af,mapLinear:Mx,inverseLerp:Sx,lerp:bo,damp:wx,pingpong:Ex,smoothstep:Tx,smootherstep:Ax,randInt:Cx,randFloat:Rx,randFloatSpread:Px,seededRandom:Ix,degToRad:Dx,radToDeg:Lx,isPowerOfTwo:Ox,ceilPowerOfTwo:Nx,floorPowerOfTwo:Fx,setQuaternionFromProperEuler:Ux,normalize:pt,denormalize:Qn},ne=class t{constructor(e=0,n=0){t.prototype.isVector2=!0,this.x=e,this.y=n}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,n){return this.x=e,this.y=n,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,n){switch(e){case 0:this.x=n;break;case 1:this.y=n;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,n){return this.x=e.x+n.x,this.y=e.y+n.y,this}addScaledVector(e,n){return this.x+=e.x*n,this.y+=e.y*n,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,n){return this.x=e.x-n.x,this.y=e.y-n.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){let n=this.x,i=this.y,r=e.elements;return this.x=r[0]*n+r[3]*i+r[6],this.y=r[1]*n+r[4]*i+r[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,n){return this.x=nt(this.x,e.x,n.x),this.y=nt(this.y,e.y,n.y),this}clampScalar(e,n){return this.x=nt(this.x,e,n),this.y=nt(this.y,e,n),this}clampLength(e,n){let i=this.length();return this.divideScalar(i||1).multiplyScalar(nt(i,e,n))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){let n=Math.sqrt(this.lengthSq()*e.lengthSq());if(n===0)return Math.PI/2;let i=this.dot(e)/n;return Math.acos(nt(i,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let n=this.x-e.x,i=this.y-e.y;return n*n+i*i}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,n){return this.x+=(e.x-this.x)*n,this.y+=(e.y-this.y)*n,this}lerpVectors(e,n,i){return this.x=e.x+(n.x-e.x)*i,this.y=e.y+(n.y-e.y)*i,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,n=0){return this.x=e[n],this.y=e[n+1],this}toArray(e=[],n=0){return e[n]=this.x,e[n+1]=this.y,e}fromBufferAttribute(e,n){return this.x=e.getX(n),this.y=e.getY(n),this}rotateAround(e,n){let i=Math.cos(n),r=Math.sin(n),s=this.x-e.x,o=this.y-e.y;return this.x=s*i-o*r+e.x,this.y=s*r+o*i+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}},Ht=class{constructor(e=0,n=0,i=0,r=1){this.isQuaternion=!0,this._x=e,this._y=n,this._z=i,this._w=r}static slerpFlat(e,n,i,r,s,o,a){let l=i[r+0],c=i[r+1],h=i[r+2],u=i[r+3],d=s[o+0],f=s[o+1],m=s[o+2],_=s[o+3];if(a===0){e[n+0]=l,e[n+1]=c,e[n+2]=h,e[n+3]=u;return}if(a===1){e[n+0]=d,e[n+1]=f,e[n+2]=m,e[n+3]=_;return}if(u!==_||l!==d||c!==f||h!==m){let g=1-a,p=l*d+c*f+h*m+u*_,x=p>=0?1:-1,y=1-p*p;if(y>Number.EPSILON){let M=Math.sqrt(y),b=Math.atan2(M,p*x);g=Math.sin(g*b)/M,a=Math.sin(a*b)/M}let v=a*x;if(l=l*g+d*v,c=c*g+f*v,h=h*g+m*v,u=u*g+_*v,g===1-a){let M=1/Math.sqrt(l*l+c*c+h*h+u*u);l*=M,c*=M,h*=M,u*=M}}e[n]=l,e[n+1]=c,e[n+2]=h,e[n+3]=u}static multiplyQuaternionsFlat(e,n,i,r,s,o){let a=i[r],l=i[r+1],c=i[r+2],h=i[r+3],u=s[o],d=s[o+1],f=s[o+2],m=s[o+3];return e[n]=a*m+h*u+l*f-c*d,e[n+1]=l*m+h*d+c*u-a*f,e[n+2]=c*m+h*f+a*d-l*u,e[n+3]=h*m-a*u-l*d-c*f,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,n,i,r){return this._x=e,this._y=n,this._z=i,this._w=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,n=!0){let i=e._x,r=e._y,s=e._z,o=e._order,a=Math.cos,l=Math.sin,c=a(i/2),h=a(r/2),u=a(s/2),d=l(i/2),f=l(r/2),m=l(s/2);switch(o){case"XYZ":this._x=d*h*u+c*f*m,this._y=c*f*u-d*h*m,this._z=c*h*m+d*f*u,this._w=c*h*u-d*f*m;break;case"YXZ":this._x=d*h*u+c*f*m,this._y=c*f*u-d*h*m,this._z=c*h*m-d*f*u,this._w=c*h*u+d*f*m;break;case"ZXY":this._x=d*h*u-c*f*m,this._y=c*f*u+d*h*m,this._z=c*h*m+d*f*u,this._w=c*h*u-d*f*m;break;case"ZYX":this._x=d*h*u-c*f*m,this._y=c*f*u+d*h*m,this._z=c*h*m-d*f*u,this._w=c*h*u+d*f*m;break;case"YZX":this._x=d*h*u+c*f*m,this._y=c*f*u+d*h*m,this._z=c*h*m-d*f*u,this._w=c*h*u-d*f*m;break;case"XZY":this._x=d*h*u-c*f*m,this._y=c*f*u-d*h*m,this._z=c*h*m+d*f*u,this._w=c*h*u+d*f*m;break;default:console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: "+o)}return n===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,n){let i=n/2,r=Math.sin(i);return this._x=e.x*r,this._y=e.y*r,this._z=e.z*r,this._w=Math.cos(i),this._onChangeCallback(),this}setFromRotationMatrix(e){let n=e.elements,i=n[0],r=n[4],s=n[8],o=n[1],a=n[5],l=n[9],c=n[2],h=n[6],u=n[10],d=i+a+u;if(d>0){let f=.5/Math.sqrt(d+1);this._w=.25/f,this._x=(h-l)*f,this._y=(s-c)*f,this._z=(o-r)*f}else if(i>a&&i>u){let f=2*Math.sqrt(1+i-a-u);this._w=(h-l)/f,this._x=.25*f,this._y=(r+o)/f,this._z=(s+c)/f}else if(a>u){let f=2*Math.sqrt(1+a-i-u);this._w=(s-c)/f,this._x=(r+o)/f,this._y=.25*f,this._z=(l+h)/f}else{let f=2*Math.sqrt(1+u-i-a);this._w=(o-r)/f,this._x=(s+c)/f,this._y=(l+h)/f,this._z=.25*f}return this._onChangeCallback(),this}setFromUnitVectors(e,n){let i=e.dot(n)+1;return i<1e-8?(i=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=i):(this._x=0,this._y=-e.z,this._z=e.y,this._w=i)):(this._x=e.y*n.z-e.z*n.y,this._y=e.z*n.x-e.x*n.z,this._z=e.x*n.y-e.y*n.x,this._w=i),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(nt(this.dot(e),-1,1)))}rotateTowards(e,n){let i=this.angleTo(e);if(i===0)return this;let r=Math.min(1,n/i);return this.slerp(e,r),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,n){let i=e._x,r=e._y,s=e._z,o=e._w,a=n._x,l=n._y,c=n._z,h=n._w;return this._x=i*h+o*a+r*c-s*l,this._y=r*h+o*l+s*a-i*c,this._z=s*h+o*c+i*l-r*a,this._w=o*h-i*a-r*l-s*c,this._onChangeCallback(),this}slerp(e,n){if(n===0)return this;if(n===1)return this.copy(e);let i=this._x,r=this._y,s=this._z,o=this._w,a=o*e._w+i*e._x+r*e._y+s*e._z;if(a<0?(this._w=-e._w,this._x=-e._x,this._y=-e._y,this._z=-e._z,a=-a):this.copy(e),a>=1)return this._w=o,this._x=i,this._y=r,this._z=s,this;let l=1-a*a;if(l<=Number.EPSILON){let f=1-n;return this._w=f*o+n*this._w,this._x=f*i+n*this._x,this._y=f*r+n*this._y,this._z=f*s+n*this._z,this.normalize(),this}let c=Math.sqrt(l),h=Math.atan2(c,a),u=Math.sin((1-n)*h)/c,d=Math.sin(n*h)/c;return this._w=o*u+this._w*d,this._x=i*u+this._x*d,this._y=r*u+this._y*d,this._z=s*u+this._z*d,this._onChangeCallback(),this}slerpQuaternions(e,n,i){return this.copy(e).slerp(n,i)}random(){let e=2*Math.PI*Math.random(),n=2*Math.PI*Math.random(),i=Math.random(),r=Math.sqrt(1-i),s=Math.sqrt(i);return this.set(r*Math.sin(e),r*Math.cos(e),s*Math.sin(n),s*Math.cos(n))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,n=0){return this._x=e[n],this._y=e[n+1],this._z=e[n+2],this._w=e[n+3],this._onChangeCallback(),this}toArray(e=[],n=0){return e[n]=this._x,e[n+1]=this._y,e[n+2]=this._z,e[n+3]=this._w,e}fromBufferAttribute(e,n){return this._x=e.getX(n),this._y=e.getY(n),this._z=e.getZ(n),this._w=e.getW(n),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}},R=class t{constructor(e=0,n=0,i=0){t.prototype.isVector3=!0,this.x=e,this.y=n,this.z=i}set(e,n,i){return i===void 0&&(i=this.z),this.x=e,this.y=n,this.z=i,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,n){switch(e){case 0:this.x=n;break;case 1:this.y=n;break;case 2:this.z=n;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,n){return this.x=e.x+n.x,this.y=e.y+n.y,this.z=e.z+n.z,this}addScaledVector(e,n){return this.x+=e.x*n,this.y+=e.y*n,this.z+=e.z*n,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,n){return this.x=e.x-n.x,this.y=e.y-n.y,this.z=e.z-n.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,n){return this.x=e.x*n.x,this.y=e.y*n.y,this.z=e.z*n.z,this}applyEuler(e){return this.applyQuaternion(Ap.setFromEuler(e))}applyAxisAngle(e,n){return this.applyQuaternion(Ap.setFromAxisAngle(e,n))}applyMatrix3(e){let n=this.x,i=this.y,r=this.z,s=e.elements;return this.x=s[0]*n+s[3]*i+s[6]*r,this.y=s[1]*n+s[4]*i+s[7]*r,this.z=s[2]*n+s[5]*i+s[8]*r,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){let n=this.x,i=this.y,r=this.z,s=e.elements,o=1/(s[3]*n+s[7]*i+s[11]*r+s[15]);return this.x=(s[0]*n+s[4]*i+s[8]*r+s[12])*o,this.y=(s[1]*n+s[5]*i+s[9]*r+s[13])*o,this.z=(s[2]*n+s[6]*i+s[10]*r+s[14])*o,this}applyQuaternion(e){let n=this.x,i=this.y,r=this.z,s=e.x,o=e.y,a=e.z,l=e.w,c=2*(o*r-a*i),h=2*(a*n-s*r),u=2*(s*i-o*n);return this.x=n+l*c+o*u-a*h,this.y=i+l*h+a*c-s*u,this.z=r+l*u+s*h-o*c,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){let n=this.x,i=this.y,r=this.z,s=e.elements;return this.x=s[0]*n+s[4]*i+s[8]*r,this.y=s[1]*n+s[5]*i+s[9]*r,this.z=s[2]*n+s[6]*i+s[10]*r,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,n){return this.x=nt(this.x,e.x,n.x),this.y=nt(this.y,e.y,n.y),this.z=nt(this.z,e.z,n.z),this}clampScalar(e,n){return this.x=nt(this.x,e,n),this.y=nt(this.y,e,n),this.z=nt(this.z,e,n),this}clampLength(e,n){let i=this.length();return this.divideScalar(i||1).multiplyScalar(nt(i,e,n))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,n){return this.x+=(e.x-this.x)*n,this.y+=(e.y-this.y)*n,this.z+=(e.z-this.z)*n,this}lerpVectors(e,n,i){return this.x=e.x+(n.x-e.x)*i,this.y=e.y+(n.y-e.y)*i,this.z=e.z+(n.z-e.z)*i,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,n){let i=e.x,r=e.y,s=e.z,o=n.x,a=n.y,l=n.z;return this.x=r*l-s*a,this.y=s*o-i*l,this.z=i*a-r*o,this}projectOnVector(e){let n=e.lengthSq();if(n===0)return this.set(0,0,0);let i=e.dot(this)/n;return this.copy(e).multiplyScalar(i)}projectOnPlane(e){return cu.copy(this).projectOnVector(e),this.sub(cu)}reflect(e){return this.sub(cu.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){let n=Math.sqrt(this.lengthSq()*e.lengthSq());if(n===0)return Math.PI/2;let i=this.dot(e)/n;return Math.acos(nt(i,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let n=this.x-e.x,i=this.y-e.y,r=this.z-e.z;return n*n+i*i+r*r}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,n,i){let r=Math.sin(n)*e;return this.x=r*Math.sin(i),this.y=Math.cos(n)*e,this.z=r*Math.cos(i),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,n,i){return this.x=e*Math.sin(n),this.y=i,this.z=e*Math.cos(n),this}setFromMatrixPosition(e){let n=e.elements;return this.x=n[12],this.y=n[13],this.z=n[14],this}setFromMatrixScale(e){let n=this.setFromMatrixColumn(e,0).length(),i=this.setFromMatrixColumn(e,1).length(),r=this.setFromMatrixColumn(e,2).length();return this.x=n,this.y=i,this.z=r,this}setFromMatrixColumn(e,n){return this.fromArray(e.elements,n*4)}setFromMatrix3Column(e,n){return this.fromArray(e.elements,n*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,n=0){return this.x=e[n],this.y=e[n+1],this.z=e[n+2],this}toArray(e=[],n=0){return e[n]=this.x,e[n+1]=this.y,e[n+2]=this.z,e}fromBufferAttribute(e,n){return this.x=e.getX(n),this.y=e.getY(n),this.z=e.getZ(n),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let e=Math.random()*Math.PI*2,n=Math.random()*2-1,i=Math.sqrt(1-n*n);return this.x=i*Math.cos(e),this.y=n,this.z=i*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}},cu=new R,Ap=new Ht,Je=class t{constructor(e,n,i,r,s,o,a,l,c){t.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,n,i,r,s,o,a,l,c)}set(e,n,i,r,s,o,a,l,c){let h=this.elements;return h[0]=e,h[1]=r,h[2]=a,h[3]=n,h[4]=s,h[5]=l,h[6]=i,h[7]=o,h[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){let n=this.elements,i=e.elements;return n[0]=i[0],n[1]=i[1],n[2]=i[2],n[3]=i[3],n[4]=i[4],n[5]=i[5],n[6]=i[6],n[7]=i[7],n[8]=i[8],this}extractBasis(e,n,i){return e.setFromMatrix3Column(this,0),n.setFromMatrix3Column(this,1),i.setFromMatrix3Column(this,2),this}setFromMatrix4(e){let n=e.elements;return this.set(n[0],n[4],n[8],n[1],n[5],n[9],n[2],n[6],n[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,n){let i=e.elements,r=n.elements,s=this.elements,o=i[0],a=i[3],l=i[6],c=i[1],h=i[4],u=i[7],d=i[2],f=i[5],m=i[8],_=r[0],g=r[3],p=r[6],x=r[1],y=r[4],v=r[7],M=r[2],b=r[5],A=r[8];return s[0]=o*_+a*x+l*M,s[3]=o*g+a*y+l*b,s[6]=o*p+a*v+l*A,s[1]=c*_+h*x+u*M,s[4]=c*g+h*y+u*b,s[7]=c*p+h*v+u*A,s[2]=d*_+f*x+m*M,s[5]=d*g+f*y+m*b,s[8]=d*p+f*v+m*A,this}multiplyScalar(e){let n=this.elements;return n[0]*=e,n[3]*=e,n[6]*=e,n[1]*=e,n[4]*=e,n[7]*=e,n[2]*=e,n[5]*=e,n[8]*=e,this}determinant(){let e=this.elements,n=e[0],i=e[1],r=e[2],s=e[3],o=e[4],a=e[5],l=e[6],c=e[7],h=e[8];return n*o*h-n*a*c-i*s*h+i*a*l+r*s*c-r*o*l}invert(){let e=this.elements,n=e[0],i=e[1],r=e[2],s=e[3],o=e[4],a=e[5],l=e[6],c=e[7],h=e[8],u=h*o-a*c,d=a*l-h*s,f=c*s-o*l,m=n*u+i*d+r*f;if(m===0)return this.set(0,0,0,0,0,0,0,0,0);let _=1/m;return e[0]=u*_,e[1]=(r*c-h*i)*_,e[2]=(a*i-r*o)*_,e[3]=d*_,e[4]=(h*n-r*l)*_,e[5]=(r*s-a*n)*_,e[6]=f*_,e[7]=(i*l-c*n)*_,e[8]=(o*n-i*s)*_,this}transpose(){let e,n=this.elements;return e=n[1],n[1]=n[3],n[3]=e,e=n[2],n[2]=n[6],n[6]=e,e=n[5],n[5]=n[7],n[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){let n=this.elements;return e[0]=n[0],e[1]=n[3],e[2]=n[6],e[3]=n[1],e[4]=n[4],e[5]=n[7],e[6]=n[2],e[7]=n[5],e[8]=n[8],this}setUvTransform(e,n,i,r,s,o,a){let l=Math.cos(s),c=Math.sin(s);return this.set(i*l,i*c,-i*(l*o+c*a)+o+e,-r*c,r*l,-r*(-c*o+l*a)+a+n,0,0,1),this}scale(e,n){return this.premultiply(lu.makeScale(e,n)),this}rotate(e){return this.premultiply(lu.makeRotation(-e)),this}translate(e,n){return this.premultiply(lu.makeTranslation(e,n)),this}makeTranslation(e,n){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,n,0,0,1),this}makeRotation(e){let n=Math.cos(e),i=Math.sin(e);return this.set(n,-i,0,i,n,0,0,0,1),this}makeScale(e,n){return this.set(e,0,0,0,n,0,0,0,1),this}equals(e){let n=this.elements,i=e.elements;for(let r=0;r<9;r++)if(n[r]!==i[r])return!1;return!0}fromArray(e,n=0){for(let i=0;i<9;i++)this.elements[i]=e[i+n];return this}toArray(e=[],n=0){let i=this.elements;return e[n]=i[0],e[n+1]=i[1],e[n+2]=i[2],e[n+3]=i[3],e[n+4]=i[4],e[n+5]=i[5],e[n+6]=i[6],e[n+7]=i[7],e[n+8]=i[8],e}clone(){return new this.constructor().fromArray(this.elements)}},lu=new Je;function cf(t){for(let e=t.length-1;e>=0;--e)if(t[e]>=65535)return!0;return!1}function bs(t){return document.createElementNS("http://www.w3.org/1999/xhtml",t)}function zm(){let t=bs("canvas");return t.style.display="block",t}var Cp={};function Ms(t){t in Cp||(Cp[t]=!0,console.warn(t))}function km(t,e,n){return new Promise(function(i,r){function s(){switch(t.clientWaitSync(e,t.SYNC_FLUSH_COMMANDS_BIT,0)){case t.WAIT_FAILED:r();break;case t.TIMEOUT_EXPIRED:setTimeout(s,n);break;default:i()}}setTimeout(s,n)})}var Rp=new Je().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),Pp=new Je().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function zx(){let t={enabled:!0,workingColorSpace:Pr,spaces:{},convert:function(r,s,o){return this.enabled===!1||s===o||!s||!o||(this.spaces[s].transfer===ht&&(r.r=Ii(r.r),r.g=Ii(r.g),r.b=Ii(r.b)),this.spaces[s].primaries!==this.spaces[o].primaries&&(r.applyMatrix3(this.spaces[s].toXYZ),r.applyMatrix3(this.spaces[o].fromXYZ)),this.spaces[o].transfer===ht&&(r.r=vs(r.r),r.g=vs(r.g),r.b=vs(r.b))),r},workingToColorSpace:function(r,s){return this.convert(r,this.workingColorSpace,s)},colorSpaceToWorking:function(r,s){return this.convert(r,s,this.workingColorSpace)},getPrimaries:function(r){return this.spaces[r].primaries},getTransfer:function(r){return r===ki?Eo:this.spaces[r].transfer},getToneMappingMode:function(r){return this.spaces[r].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(r,s=this.workingColorSpace){return r.fromArray(this.spaces[s].luminanceCoefficients)},define:function(r){Object.assign(this.spaces,r)},_getMatrix:function(r,s,o){return r.copy(this.spaces[s].toXYZ).multiply(this.spaces[o].fromXYZ)},_getDrawingBufferColorSpace:function(r){return this.spaces[r].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(r=this.workingColorSpace){return this.spaces[r].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(r,s){return Ms("THREE.ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),t.workingToColorSpace(r,s)},toWorkingColorSpace:function(r,s){return Ms("THREE.ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),t.colorSpaceToWorking(r,s)}},e=[.64,.33,.3,.6,.15,.06],n=[.2126,.7152,.0722],i=[.3127,.329];return t.define({[Pr]:{primaries:e,whitePoint:i,transfer:Eo,toXYZ:Rp,fromXYZ:Pp,luminanceCoefficients:n,workingColorSpaceConfig:{unpackColorSpace:Zt},outputColorSpaceConfig:{drawingBufferColorSpace:Zt}},[Zt]:{primaries:e,whitePoint:i,transfer:ht,toXYZ:Rp,fromXYZ:Pp,luminanceCoefficients:n,outputColorSpaceConfig:{drawingBufferColorSpace:Zt}}}),t}var ot=zx();function Ii(t){return t<.04045?t*.0773993808:Math.pow(t*.9478672986+.0521327014,2.4)}function vs(t){return t<.0031308?t*12.92:1.055*Math.pow(t,.41666)-.055}var ts,_c=class{static getDataURL(e,n="image/png"){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let i;if(e instanceof HTMLCanvasElement)i=e;else{ts===void 0&&(ts=bs("canvas")),ts.width=e.width,ts.height=e.height;let r=ts.getContext("2d");e instanceof ImageData?r.putImageData(e,0,0):r.drawImage(e,0,0,e.width,e.height),i=ts}return i.toDataURL(n)}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){let n=bs("canvas");n.width=e.width,n.height=e.height;let i=n.getContext("2d");i.drawImage(e,0,0,e.width,e.height);let r=i.getImageData(0,0,e.width,e.height),s=r.data;for(let o=0;o<s.length;o++)s[o]=Ii(s[o]/255)*255;return i.putImageData(r,0,0),n}else if(e.data){let n=e.data.slice(0);for(let i=0;i<n.length;i++)n instanceof Uint8Array||n instanceof Uint8ClampedArray?n[i]=Math.floor(Ii(n[i]/255)*255):n[i]=Ii(n[i]);return{data:n,width:e.width,height:e.height}}else return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}},kx=0,Ss=class{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:kx++}),this.uuid=Pi(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){let n=this.data;return typeof HTMLVideoElement<"u"&&n instanceof HTMLVideoElement?e.set(n.videoWidth,n.videoHeight,0):n instanceof VideoFrame?e.set(n.displayHeight,n.displayWidth,0):n!==null?e.set(n.width,n.height,n.depth||0):e.set(0,0,0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){let n=e===void 0||typeof e=="string";if(!n&&e.images[this.uuid]!==void 0)return e.images[this.uuid];let i={uuid:this.uuid,url:""},r=this.data;if(r!==null){let s;if(Array.isArray(r)){s=[];for(let o=0,a=r.length;o<a;o++)r[o].isDataTexture?s.push(hu(r[o].image)):s.push(hu(r[o]))}else s=hu(r);i.url=s}return n||(e.images[this.uuid]=i),i}};function hu(t){return typeof HTMLImageElement<"u"&&t instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&t instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&t instanceof ImageBitmap?_c.getDataURL(t):t.data?{data:Array.from(t.data),width:t.width,height:t.height,type:t.data.constructor.name}:(console.warn("THREE.Texture: Unable to serialize Texture."),{})}var Bx=0,uu=new R,un=class t extends fi{constructor(e=t.DEFAULT_IMAGE,n=t.DEFAULT_MAPPING,i=Qi,r=Qi,s=ti,o=rr,a=jn,l=ri,c=t.DEFAULT_ANISOTROPY,h=ki){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:Bx++}),this.uuid=Pi(),this.name="",this.source=new Ss(e),this.mipmaps=[],this.mapping=n,this.channel=0,this.wrapS=i,this.wrapT=r,this.magFilter=s,this.minFilter=o,this.anisotropy=c,this.format=a,this.internalFormat=null,this.type=l,this.offset=new ne(0,0),this.repeat=new ne(1,1),this.center=new ne(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Je,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=h,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(e&&e.depth&&e.depth>1),this.pmremVersion=0}get width(){return this.source.getSize(uu).x}get height(){return this.source.getSize(uu).y}get depth(){return this.source.getSize(uu).z}get image(){return this.source.data}set image(e=null){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,n){this.updateRanges.push({start:e,count:n})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(let n in e){let i=e[n];if(i===void 0){console.warn(`THREE.Texture.setValues(): parameter '${n}' has value of undefined.`);continue}let r=this[n];if(r===void 0){console.warn(`THREE.Texture.setValues(): property '${n}' does not exist.`);continue}r&&i&&r.isVector2&&i.isVector2||r&&i&&r.isVector3&&i.isVector3||r&&i&&r.isMatrix3&&i.isMatrix3?r.copy(i):this[n]=i}}toJSON(e){let n=e===void 0||typeof e=="string";if(!n&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];let i={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(i.userData=this.userData),n||(e.textures[this.uuid]=i),i}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==Yu)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case dc:e.x=e.x-Math.floor(e.x);break;case Qi:e.x=e.x<0?0:1;break;case pc:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case dc:e.y=e.y-Math.floor(e.y);break;case Qi:e.y=e.y<0?0:1;break;case pc:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}};un.DEFAULT_IMAGE=null;un.DEFAULT_MAPPING=Yu;un.DEFAULT_ANISOTROPY=1;var mt=class t{constructor(e=0,n=0,i=0,r=1){t.prototype.isVector4=!0,this.x=e,this.y=n,this.z=i,this.w=r}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,n,i,r){return this.x=e,this.y=n,this.z=i,this.w=r,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,n){switch(e){case 0:this.x=n;break;case 1:this.y=n;break;case 2:this.z=n;break;case 3:this.w=n;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,n){return this.x=e.x+n.x,this.y=e.y+n.y,this.z=e.z+n.z,this.w=e.w+n.w,this}addScaledVector(e,n){return this.x+=e.x*n,this.y+=e.y*n,this.z+=e.z*n,this.w+=e.w*n,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,n){return this.x=e.x-n.x,this.y=e.y-n.y,this.z=e.z-n.z,this.w=e.w-n.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){let n=this.x,i=this.y,r=this.z,s=this.w,o=e.elements;return this.x=o[0]*n+o[4]*i+o[8]*r+o[12]*s,this.y=o[1]*n+o[5]*i+o[9]*r+o[13]*s,this.z=o[2]*n+o[6]*i+o[10]*r+o[14]*s,this.w=o[3]*n+o[7]*i+o[11]*r+o[15]*s,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);let n=Math.sqrt(1-e.w*e.w);return n<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/n,this.y=e.y/n,this.z=e.z/n),this}setAxisAngleFromRotationMatrix(e){let n,i,r,s,l=e.elements,c=l[0],h=l[4],u=l[8],d=l[1],f=l[5],m=l[9],_=l[2],g=l[6],p=l[10];if(Math.abs(h-d)<.01&&Math.abs(u-_)<.01&&Math.abs(m-g)<.01){if(Math.abs(h+d)<.1&&Math.abs(u+_)<.1&&Math.abs(m+g)<.1&&Math.abs(c+f+p-3)<.1)return this.set(1,0,0,0),this;n=Math.PI;let y=(c+1)/2,v=(f+1)/2,M=(p+1)/2,b=(h+d)/4,A=(u+_)/4,C=(m+g)/4;return y>v&&y>M?y<.01?(i=0,r=.707106781,s=.707106781):(i=Math.sqrt(y),r=b/i,s=A/i):v>M?v<.01?(i=.707106781,r=0,s=.707106781):(r=Math.sqrt(v),i=b/r,s=C/r):M<.01?(i=.707106781,r=.707106781,s=0):(s=Math.sqrt(M),i=A/s,r=C/s),this.set(i,r,s,n),this}let x=Math.sqrt((g-m)*(g-m)+(u-_)*(u-_)+(d-h)*(d-h));return Math.abs(x)<.001&&(x=1),this.x=(g-m)/x,this.y=(u-_)/x,this.z=(d-h)/x,this.w=Math.acos((c+f+p-1)/2),this}setFromMatrixPosition(e){let n=e.elements;return this.x=n[12],this.y=n[13],this.z=n[14],this.w=n[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,n){return this.x=nt(this.x,e.x,n.x),this.y=nt(this.y,e.y,n.y),this.z=nt(this.z,e.z,n.z),this.w=nt(this.w,e.w,n.w),this}clampScalar(e,n){return this.x=nt(this.x,e,n),this.y=nt(this.y,e,n),this.z=nt(this.z,e,n),this.w=nt(this.w,e,n),this}clampLength(e,n){let i=this.length();return this.divideScalar(i||1).multiplyScalar(nt(i,e,n))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,n){return this.x+=(e.x-this.x)*n,this.y+=(e.y-this.y)*n,this.z+=(e.z-this.z)*n,this.w+=(e.w-this.w)*n,this}lerpVectors(e,n,i){return this.x=e.x+(n.x-e.x)*i,this.y=e.y+(n.y-e.y)*i,this.z=e.z+(n.z-e.z)*i,this.w=e.w+(n.w-e.w)*i,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,n=0){return this.x=e[n],this.y=e[n+1],this.z=e[n+2],this.w=e[n+3],this}toArray(e=[],n=0){return e[n]=this.x,e[n+1]=this.y,e[n+2]=this.z,e[n+3]=this.w,e}fromBufferAttribute(e,n){return this.x=e.getX(n),this.y=e.getY(n),this.z=e.getZ(n),this.w=e.getW(n),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}},vc=class extends fi{constructor(e=1,n=1,i={}){super(),i=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:ti,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1},i),this.isRenderTarget=!0,this.width=e,this.height=n,this.depth=i.depth,this.scissor=new mt(0,0,e,n),this.scissorTest=!1,this.viewport=new mt(0,0,e,n);let r={width:e,height:n,depth:i.depth},s=new un(r);this.textures=[];let o=i.count;for(let a=0;a<o;a++)this.textures[a]=s.clone(),this.textures[a].isRenderTargetTexture=!0,this.textures[a].renderTarget=this;this._setTextureOptions(i),this.depthBuffer=i.depthBuffer,this.stencilBuffer=i.stencilBuffer,this.resolveDepthBuffer=i.resolveDepthBuffer,this.resolveStencilBuffer=i.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=i.depthTexture,this.samples=i.samples,this.multiview=i.multiview}_setTextureOptions(e={}){let n={minFilter:ti,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(n.mapping=e.mapping),e.wrapS!==void 0&&(n.wrapS=e.wrapS),e.wrapT!==void 0&&(n.wrapT=e.wrapT),e.wrapR!==void 0&&(n.wrapR=e.wrapR),e.magFilter!==void 0&&(n.magFilter=e.magFilter),e.minFilter!==void 0&&(n.minFilter=e.minFilter),e.format!==void 0&&(n.format=e.format),e.type!==void 0&&(n.type=e.type),e.anisotropy!==void 0&&(n.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(n.colorSpace=e.colorSpace),e.flipY!==void 0&&(n.flipY=e.flipY),e.generateMipmaps!==void 0&&(n.generateMipmaps=e.generateMipmaps),e.internalFormat!==void 0&&(n.internalFormat=e.internalFormat);for(let i=0;i<this.textures.length;i++)this.textures[i].setValues(n)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),e!==null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,n,i=1){if(this.width!==e||this.height!==n||this.depth!==i){this.width=e,this.height=n,this.depth=i;for(let r=0,s=this.textures.length;r<s;r++)this.textures[r].image.width=e,this.textures[r].image.height=n,this.textures[r].image.depth=i,this.textures[r].isArrayTexture=this.textures[r].image.depth>1;this.dispose()}this.viewport.set(0,0,e,n),this.scissor.set(0,0,e,n)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let n=0,i=e.textures.length;n<i;n++){this.textures[n]=e.textures[n].clone(),this.textures[n].isRenderTargetTexture=!0,this.textures[n].renderTarget=this;let r=Object.assign({},e.textures[n].image);this.textures[n].source=new Ss(r)}return this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}},sn=class extends vc{constructor(e=1,n=1,i={}){super(e,n,i),this.isWebGLRenderTarget=!0}},Ao=class extends un{constructor(e=null,n=1,i=1,r=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:n,height:i,depth:r},this.magFilter=kn,this.minFilter=kn,this.wrapR=Qi,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}};var yc=class extends un{constructor(e=null,n=1,i=1,r=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:n,height:i,depth:r},this.magFilter=kn,this.minFilter=kn,this.wrapR=Qi,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}};var vn=class{constructor(e=new R(1/0,1/0,1/0),n=new R(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=n}set(e,n){return this.min.copy(e),this.max.copy(n),this}setFromArray(e){this.makeEmpty();for(let n=0,i=e.length;n<i;n+=3)this.expandByPoint(Zn.fromArray(e,n));return this}setFromBufferAttribute(e){this.makeEmpty();for(let n=0,i=e.count;n<i;n++)this.expandByPoint(Zn.fromBufferAttribute(e,n));return this}setFromPoints(e){this.makeEmpty();for(let n=0,i=e.length;n<i;n++)this.expandByPoint(e[n]);return this}setFromCenterAndSize(e,n){let i=Zn.copy(n).multiplyScalar(.5);return this.min.copy(e).sub(i),this.max.copy(e).add(i),this}setFromObject(e,n=!1){return this.makeEmpty(),this.expandByObject(e,n)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,n=!1){e.updateWorldMatrix(!1,!1);let i=e.geometry;if(i!==void 0){let s=i.getAttribute("position");if(n===!0&&s!==void 0&&e.isInstancedMesh!==!0)for(let o=0,a=s.count;o<a;o++)e.isMesh===!0?e.getVertexPosition(o,Zn):Zn.fromBufferAttribute(s,o),Zn.applyMatrix4(e.matrixWorld),this.expandByPoint(Zn);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),Ua.copy(e.boundingBox)):(i.boundingBox===null&&i.computeBoundingBox(),Ua.copy(i.boundingBox)),Ua.applyMatrix4(e.matrixWorld),this.union(Ua)}let r=e.children;for(let s=0,o=r.length;s<o;s++)this.expandByObject(r[s],n);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,n){return n.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,Zn),Zn.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let n,i;return e.normal.x>0?(n=e.normal.x*this.min.x,i=e.normal.x*this.max.x):(n=e.normal.x*this.max.x,i=e.normal.x*this.min.x),e.normal.y>0?(n+=e.normal.y*this.min.y,i+=e.normal.y*this.max.y):(n+=e.normal.y*this.max.y,i+=e.normal.y*this.min.y),e.normal.z>0?(n+=e.normal.z*this.min.z,i+=e.normal.z*this.max.z):(n+=e.normal.z*this.max.z,i+=e.normal.z*this.min.z),n<=-e.constant&&i>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(ho),za.subVectors(this.max,ho),ns.subVectors(e.a,ho),is.subVectors(e.b,ho),rs.subVectors(e.c,ho),Xi.subVectors(is,ns),$i.subVectors(rs,is),Sr.subVectors(ns,rs);let n=[0,-Xi.z,Xi.y,0,-$i.z,$i.y,0,-Sr.z,Sr.y,Xi.z,0,-Xi.x,$i.z,0,-$i.x,Sr.z,0,-Sr.x,-Xi.y,Xi.x,0,-$i.y,$i.x,0,-Sr.y,Sr.x,0];return!fu(n,ns,is,rs,za)||(n=[1,0,0,0,1,0,0,0,1],!fu(n,ns,is,rs,za))?!1:(ka.crossVectors(Xi,$i),n=[ka.x,ka.y,ka.z],fu(n,ns,is,rs,za))}clampPoint(e,n){return n.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,Zn).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(Zn).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(wi[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),wi[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),wi[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),wi[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),wi[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),wi[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),wi[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),wi[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(wi),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}},wi=[new R,new R,new R,new R,new R,new R,new R,new R],Zn=new R,Ua=new vn,ns=new R,is=new R,rs=new R,Xi=new R,$i=new R,Sr=new R,ho=new R,za=new R,ka=new R,wr=new R;function fu(t,e,n,i,r){for(let s=0,o=t.length-3;s<=o;s+=3){wr.fromArray(t,s);let a=r.x*Math.abs(wr.x)+r.y*Math.abs(wr.y)+r.z*Math.abs(wr.z),l=e.dot(wr),c=n.dot(wr),h=i.dot(wr);if(Math.max(-Math.max(l,c,h),Math.min(l,c,h))>a)return!1}return!0}var Vx=new vn,uo=new R,du=new R,di=class{constructor(e=new R,n=-1){this.isSphere=!0,this.center=e,this.radius=n}set(e,n){return this.center.copy(e),this.radius=n,this}setFromPoints(e,n){let i=this.center;n!==void 0?i.copy(n):Vx.setFromPoints(e).getCenter(i);let r=0;for(let s=0,o=e.length;s<o;s++)r=Math.max(r,i.distanceToSquared(e[s]));return this.radius=Math.sqrt(r),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){let n=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=n*n}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,n){let i=this.center.distanceToSquared(e);return n.copy(e),i>this.radius*this.radius&&(n.sub(this.center).normalize(),n.multiplyScalar(this.radius).add(this.center)),n}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;uo.subVectors(e,this.center);let n=uo.lengthSq();if(n>this.radius*this.radius){let i=Math.sqrt(n),r=(i-this.radius)*.5;this.center.addScaledVector(uo,r/i),this.radius+=r}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(du.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(uo.copy(e.center).add(du)),this.expandByPoint(uo.copy(e.center).sub(du))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}},Ei=new R,pu=new R,Ba=new R,Yi=new R,mu=new R,Va=new R,gu=new R,Li=class{constructor(e=new R,n=new R(0,0,-1)){this.origin=e,this.direction=n}set(e,n){return this.origin.copy(e),this.direction.copy(n),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,n){return n.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,Ei)),this}closestPointToPoint(e,n){n.subVectors(e,this.origin);let i=n.dot(this.direction);return i<0?n.copy(this.origin):n.copy(this.origin).addScaledVector(this.direction,i)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){let n=Ei.subVectors(e,this.origin).dot(this.direction);return n<0?this.origin.distanceToSquared(e):(Ei.copy(this.origin).addScaledVector(this.direction,n),Ei.distanceToSquared(e))}distanceSqToSegment(e,n,i,r){pu.copy(e).add(n).multiplyScalar(.5),Ba.copy(n).sub(e).normalize(),Yi.copy(this.origin).sub(pu);let s=e.distanceTo(n)*.5,o=-this.direction.dot(Ba),a=Yi.dot(this.direction),l=-Yi.dot(Ba),c=Yi.lengthSq(),h=Math.abs(1-o*o),u,d,f,m;if(h>0)if(u=o*l-a,d=o*a-l,m=s*h,u>=0)if(d>=-m)if(d<=m){let _=1/h;u*=_,d*=_,f=u*(u+o*d+2*a)+d*(o*u+d+2*l)+c}else d=s,u=Math.max(0,-(o*d+a)),f=-u*u+d*(d+2*l)+c;else d=-s,u=Math.max(0,-(o*d+a)),f=-u*u+d*(d+2*l)+c;else d<=-m?(u=Math.max(0,-(-o*s+a)),d=u>0?-s:Math.min(Math.max(-s,-l),s),f=-u*u+d*(d+2*l)+c):d<=m?(u=0,d=Math.min(Math.max(-s,-l),s),f=d*(d+2*l)+c):(u=Math.max(0,-(o*s+a)),d=u>0?s:Math.min(Math.max(-s,-l),s),f=-u*u+d*(d+2*l)+c);else d=o>0?-s:s,u=Math.max(0,-(o*d+a)),f=-u*u+d*(d+2*l)+c;return i&&i.copy(this.origin).addScaledVector(this.direction,u),r&&r.copy(pu).addScaledVector(Ba,d),f}intersectSphere(e,n){Ei.subVectors(e.center,this.origin);let i=Ei.dot(this.direction),r=Ei.dot(Ei)-i*i,s=e.radius*e.radius;if(r>s)return null;let o=Math.sqrt(s-r),a=i-o,l=i+o;return l<0?null:a<0?this.at(l,n):this.at(a,n)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){let n=e.normal.dot(this.direction);if(n===0)return e.distanceToPoint(this.origin)===0?0:null;let i=-(this.origin.dot(e.normal)+e.constant)/n;return i>=0?i:null}intersectPlane(e,n){let i=this.distanceToPlane(e);return i===null?null:this.at(i,n)}intersectsPlane(e){let n=e.distanceToPoint(this.origin);return n===0||e.normal.dot(this.direction)*n<0}intersectBox(e,n){let i,r,s,o,a,l,c=1/this.direction.x,h=1/this.direction.y,u=1/this.direction.z,d=this.origin;return c>=0?(i=(e.min.x-d.x)*c,r=(e.max.x-d.x)*c):(i=(e.max.x-d.x)*c,r=(e.min.x-d.x)*c),h>=0?(s=(e.min.y-d.y)*h,o=(e.max.y-d.y)*h):(s=(e.max.y-d.y)*h,o=(e.min.y-d.y)*h),i>o||s>r||((s>i||isNaN(i))&&(i=s),(o<r||isNaN(r))&&(r=o),u>=0?(a=(e.min.z-d.z)*u,l=(e.max.z-d.z)*u):(a=(e.max.z-d.z)*u,l=(e.min.z-d.z)*u),i>l||a>r)||((a>i||i!==i)&&(i=a),(l<r||r!==r)&&(r=l),r<0)?null:this.at(i>=0?i:r,n)}intersectsBox(e){return this.intersectBox(e,Ei)!==null}intersectTriangle(e,n,i,r,s){mu.subVectors(n,e),Va.subVectors(i,e),gu.crossVectors(mu,Va);let o=this.direction.dot(gu),a;if(o>0){if(r)return null;a=1}else if(o<0)a=-1,o=-o;else return null;Yi.subVectors(this.origin,e);let l=a*this.direction.dot(Va.crossVectors(Yi,Va));if(l<0)return null;let c=a*this.direction.dot(mu.cross(Yi));if(c<0||l+c>o)return null;let h=-a*Yi.dot(gu);return h<0?null:this.at(h/o,s)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}},Xe=class t{constructor(e,n,i,r,s,o,a,l,c,h,u,d,f,m,_,g){t.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,n,i,r,s,o,a,l,c,h,u,d,f,m,_,g)}set(e,n,i,r,s,o,a,l,c,h,u,d,f,m,_,g){let p=this.elements;return p[0]=e,p[4]=n,p[8]=i,p[12]=r,p[1]=s,p[5]=o,p[9]=a,p[13]=l,p[2]=c,p[6]=h,p[10]=u,p[14]=d,p[3]=f,p[7]=m,p[11]=_,p[15]=g,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new t().fromArray(this.elements)}copy(e){let n=this.elements,i=e.elements;return n[0]=i[0],n[1]=i[1],n[2]=i[2],n[3]=i[3],n[4]=i[4],n[5]=i[5],n[6]=i[6],n[7]=i[7],n[8]=i[8],n[9]=i[9],n[10]=i[10],n[11]=i[11],n[12]=i[12],n[13]=i[13],n[14]=i[14],n[15]=i[15],this}copyPosition(e){let n=this.elements,i=e.elements;return n[12]=i[12],n[13]=i[13],n[14]=i[14],this}setFromMatrix3(e){let n=e.elements;return this.set(n[0],n[3],n[6],0,n[1],n[4],n[7],0,n[2],n[5],n[8],0,0,0,0,1),this}extractBasis(e,n,i){return e.setFromMatrixColumn(this,0),n.setFromMatrixColumn(this,1),i.setFromMatrixColumn(this,2),this}makeBasis(e,n,i){return this.set(e.x,n.x,i.x,0,e.y,n.y,i.y,0,e.z,n.z,i.z,0,0,0,0,1),this}extractRotation(e){let n=this.elements,i=e.elements,r=1/ss.setFromMatrixColumn(e,0).length(),s=1/ss.setFromMatrixColumn(e,1).length(),o=1/ss.setFromMatrixColumn(e,2).length();return n[0]=i[0]*r,n[1]=i[1]*r,n[2]=i[2]*r,n[3]=0,n[4]=i[4]*s,n[5]=i[5]*s,n[6]=i[6]*s,n[7]=0,n[8]=i[8]*o,n[9]=i[9]*o,n[10]=i[10]*o,n[11]=0,n[12]=0,n[13]=0,n[14]=0,n[15]=1,this}makeRotationFromEuler(e){let n=this.elements,i=e.x,r=e.y,s=e.z,o=Math.cos(i),a=Math.sin(i),l=Math.cos(r),c=Math.sin(r),h=Math.cos(s),u=Math.sin(s);if(e.order==="XYZ"){let d=o*h,f=o*u,m=a*h,_=a*u;n[0]=l*h,n[4]=-l*u,n[8]=c,n[1]=f+m*c,n[5]=d-_*c,n[9]=-a*l,n[2]=_-d*c,n[6]=m+f*c,n[10]=o*l}else if(e.order==="YXZ"){let d=l*h,f=l*u,m=c*h,_=c*u;n[0]=d+_*a,n[4]=m*a-f,n[8]=o*c,n[1]=o*u,n[5]=o*h,n[9]=-a,n[2]=f*a-m,n[6]=_+d*a,n[10]=o*l}else if(e.order==="ZXY"){let d=l*h,f=l*u,m=c*h,_=c*u;n[0]=d-_*a,n[4]=-o*u,n[8]=m+f*a,n[1]=f+m*a,n[5]=o*h,n[9]=_-d*a,n[2]=-o*c,n[6]=a,n[10]=o*l}else if(e.order==="ZYX"){let d=o*h,f=o*u,m=a*h,_=a*u;n[0]=l*h,n[4]=m*c-f,n[8]=d*c+_,n[1]=l*u,n[5]=_*c+d,n[9]=f*c-m,n[2]=-c,n[6]=a*l,n[10]=o*l}else if(e.order==="YZX"){let d=o*l,f=o*c,m=a*l,_=a*c;n[0]=l*h,n[4]=_-d*u,n[8]=m*u+f,n[1]=u,n[5]=o*h,n[9]=-a*h,n[2]=-c*h,n[6]=f*u+m,n[10]=d-_*u}else if(e.order==="XZY"){let d=o*l,f=o*c,m=a*l,_=a*c;n[0]=l*h,n[4]=-u,n[8]=c*h,n[1]=d*u+_,n[5]=o*h,n[9]=f*u-m,n[2]=m*u-f,n[6]=a*h,n[10]=_*u+d}return n[3]=0,n[7]=0,n[11]=0,n[12]=0,n[13]=0,n[14]=0,n[15]=1,this}makeRotationFromQuaternion(e){return this.compose(Hx,e,Gx)}lookAt(e,n,i){let r=this.elements;return Tn.subVectors(e,n),Tn.lengthSq()===0&&(Tn.z=1),Tn.normalize(),Zi.crossVectors(i,Tn),Zi.lengthSq()===0&&(Math.abs(i.z)===1?Tn.x+=1e-4:Tn.z+=1e-4,Tn.normalize(),Zi.crossVectors(i,Tn)),Zi.normalize(),Ha.crossVectors(Tn,Zi),r[0]=Zi.x,r[4]=Ha.x,r[8]=Tn.x,r[1]=Zi.y,r[5]=Ha.y,r[9]=Tn.y,r[2]=Zi.z,r[6]=Ha.z,r[10]=Tn.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,n){let i=e.elements,r=n.elements,s=this.elements,o=i[0],a=i[4],l=i[8],c=i[12],h=i[1],u=i[5],d=i[9],f=i[13],m=i[2],_=i[6],g=i[10],p=i[14],x=i[3],y=i[7],v=i[11],M=i[15],b=r[0],A=r[4],C=r[8],E=r[12],w=r[1],I=r[5],N=r[9],B=r[13],L=r[2],D=r[6],F=r[10],J=r[14],G=r[3],le=r[7],fe=r[11],X=r[15];return s[0]=o*b+a*w+l*L+c*G,s[4]=o*A+a*I+l*D+c*le,s[8]=o*C+a*N+l*F+c*fe,s[12]=o*E+a*B+l*J+c*X,s[1]=h*b+u*w+d*L+f*G,s[5]=h*A+u*I+d*D+f*le,s[9]=h*C+u*N+d*F+f*fe,s[13]=h*E+u*B+d*J+f*X,s[2]=m*b+_*w+g*L+p*G,s[6]=m*A+_*I+g*D+p*le,s[10]=m*C+_*N+g*F+p*fe,s[14]=m*E+_*B+g*J+p*X,s[3]=x*b+y*w+v*L+M*G,s[7]=x*A+y*I+v*D+M*le,s[11]=x*C+y*N+v*F+M*fe,s[15]=x*E+y*B+v*J+M*X,this}multiplyScalar(e){let n=this.elements;return n[0]*=e,n[4]*=e,n[8]*=e,n[12]*=e,n[1]*=e,n[5]*=e,n[9]*=e,n[13]*=e,n[2]*=e,n[6]*=e,n[10]*=e,n[14]*=e,n[3]*=e,n[7]*=e,n[11]*=e,n[15]*=e,this}determinant(){let e=this.elements,n=e[0],i=e[4],r=e[8],s=e[12],o=e[1],a=e[5],l=e[9],c=e[13],h=e[2],u=e[6],d=e[10],f=e[14],m=e[3],_=e[7],g=e[11],p=e[15];return m*(+s*l*u-r*c*u-s*a*d+i*c*d+r*a*f-i*l*f)+_*(+n*l*f-n*c*d+s*o*d-r*o*f+r*c*h-s*l*h)+g*(+n*c*u-n*a*f-s*o*u+i*o*f+s*a*h-i*c*h)+p*(-r*a*h-n*l*u+n*a*d+r*o*u-i*o*d+i*l*h)}transpose(){let e=this.elements,n;return n=e[1],e[1]=e[4],e[4]=n,n=e[2],e[2]=e[8],e[8]=n,n=e[6],e[6]=e[9],e[9]=n,n=e[3],e[3]=e[12],e[12]=n,n=e[7],e[7]=e[13],e[13]=n,n=e[11],e[11]=e[14],e[14]=n,this}setPosition(e,n,i){let r=this.elements;return e.isVector3?(r[12]=e.x,r[13]=e.y,r[14]=e.z):(r[12]=e,r[13]=n,r[14]=i),this}invert(){let e=this.elements,n=e[0],i=e[1],r=e[2],s=e[3],o=e[4],a=e[5],l=e[6],c=e[7],h=e[8],u=e[9],d=e[10],f=e[11],m=e[12],_=e[13],g=e[14],p=e[15],x=u*g*c-_*d*c+_*l*f-a*g*f-u*l*p+a*d*p,y=m*d*c-h*g*c-m*l*f+o*g*f+h*l*p-o*d*p,v=h*_*c-m*u*c+m*a*f-o*_*f-h*a*p+o*u*p,M=m*u*l-h*_*l-m*a*d+o*_*d+h*a*g-o*u*g,b=n*x+i*y+r*v+s*M;if(b===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let A=1/b;return e[0]=x*A,e[1]=(_*d*s-u*g*s-_*r*f+i*g*f+u*r*p-i*d*p)*A,e[2]=(a*g*s-_*l*s+_*r*c-i*g*c-a*r*p+i*l*p)*A,e[3]=(u*l*s-a*d*s-u*r*c+i*d*c+a*r*f-i*l*f)*A,e[4]=y*A,e[5]=(h*g*s-m*d*s+m*r*f-n*g*f-h*r*p+n*d*p)*A,e[6]=(m*l*s-o*g*s-m*r*c+n*g*c+o*r*p-n*l*p)*A,e[7]=(o*d*s-h*l*s+h*r*c-n*d*c-o*r*f+n*l*f)*A,e[8]=v*A,e[9]=(m*u*s-h*_*s-m*i*f+n*_*f+h*i*p-n*u*p)*A,e[10]=(o*_*s-m*a*s+m*i*c-n*_*c-o*i*p+n*a*p)*A,e[11]=(h*a*s-o*u*s-h*i*c+n*u*c+o*i*f-n*a*f)*A,e[12]=M*A,e[13]=(h*_*r-m*u*r+m*i*d-n*_*d-h*i*g+n*u*g)*A,e[14]=(m*a*r-o*_*r-m*i*l+n*_*l+o*i*g-n*a*g)*A,e[15]=(o*u*r-h*a*r+h*i*l-n*u*l-o*i*d+n*a*d)*A,this}scale(e){let n=this.elements,i=e.x,r=e.y,s=e.z;return n[0]*=i,n[4]*=r,n[8]*=s,n[1]*=i,n[5]*=r,n[9]*=s,n[2]*=i,n[6]*=r,n[10]*=s,n[3]*=i,n[7]*=r,n[11]*=s,this}getMaxScaleOnAxis(){let e=this.elements,n=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],i=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],r=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(n,i,r))}makeTranslation(e,n,i){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,n,0,0,1,i,0,0,0,1),this}makeRotationX(e){let n=Math.cos(e),i=Math.sin(e);return this.set(1,0,0,0,0,n,-i,0,0,i,n,0,0,0,0,1),this}makeRotationY(e){let n=Math.cos(e),i=Math.sin(e);return this.set(n,0,i,0,0,1,0,0,-i,0,n,0,0,0,0,1),this}makeRotationZ(e){let n=Math.cos(e),i=Math.sin(e);return this.set(n,-i,0,0,i,n,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,n){let i=Math.cos(n),r=Math.sin(n),s=1-i,o=e.x,a=e.y,l=e.z,c=s*o,h=s*a;return this.set(c*o+i,c*a-r*l,c*l+r*a,0,c*a+r*l,h*a+i,h*l-r*o,0,c*l-r*a,h*l+r*o,s*l*l+i,0,0,0,0,1),this}makeScale(e,n,i){return this.set(e,0,0,0,0,n,0,0,0,0,i,0,0,0,0,1),this}makeShear(e,n,i,r,s,o){return this.set(1,i,s,0,e,1,o,0,n,r,1,0,0,0,0,1),this}compose(e,n,i){let r=this.elements,s=n._x,o=n._y,a=n._z,l=n._w,c=s+s,h=o+o,u=a+a,d=s*c,f=s*h,m=s*u,_=o*h,g=o*u,p=a*u,x=l*c,y=l*h,v=l*u,M=i.x,b=i.y,A=i.z;return r[0]=(1-(_+p))*M,r[1]=(f+v)*M,r[2]=(m-y)*M,r[3]=0,r[4]=(f-v)*b,r[5]=(1-(d+p))*b,r[6]=(g+x)*b,r[7]=0,r[8]=(m+y)*A,r[9]=(g-x)*A,r[10]=(1-(d+_))*A,r[11]=0,r[12]=e.x,r[13]=e.y,r[14]=e.z,r[15]=1,this}decompose(e,n,i){let r=this.elements,s=ss.set(r[0],r[1],r[2]).length(),o=ss.set(r[4],r[5],r[6]).length(),a=ss.set(r[8],r[9],r[10]).length();this.determinant()<0&&(s=-s),e.x=r[12],e.y=r[13],e.z=r[14],Kn.copy(this);let c=1/s,h=1/o,u=1/a;return Kn.elements[0]*=c,Kn.elements[1]*=c,Kn.elements[2]*=c,Kn.elements[4]*=h,Kn.elements[5]*=h,Kn.elements[6]*=h,Kn.elements[8]*=u,Kn.elements[9]*=u,Kn.elements[10]*=u,n.setFromRotationMatrix(Kn),i.x=s,i.y=o,i.z=a,this}makePerspective(e,n,i,r,s,o,a=ei,l=!1){let c=this.elements,h=2*s/(n-e),u=2*s/(i-r),d=(n+e)/(n-e),f=(i+r)/(i-r),m,_;if(l)m=s/(o-s),_=o*s/(o-s);else if(a===ei)m=-(o+s)/(o-s),_=-2*o*s/(o-s);else if(a===To)m=-o/(o-s),_=-o*s/(o-s);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+a);return c[0]=h,c[4]=0,c[8]=d,c[12]=0,c[1]=0,c[5]=u,c[9]=f,c[13]=0,c[2]=0,c[6]=0,c[10]=m,c[14]=_,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(e,n,i,r,s,o,a=ei,l=!1){let c=this.elements,h=2/(n-e),u=2/(i-r),d=-(n+e)/(n-e),f=-(i+r)/(i-r),m,_;if(l)m=1/(o-s),_=o/(o-s);else if(a===ei)m=-2/(o-s),_=-(o+s)/(o-s);else if(a===To)m=-1/(o-s),_=-s/(o-s);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+a);return c[0]=h,c[4]=0,c[8]=0,c[12]=d,c[1]=0,c[5]=u,c[9]=0,c[13]=f,c[2]=0,c[6]=0,c[10]=m,c[14]=_,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(e){let n=this.elements,i=e.elements;for(let r=0;r<16;r++)if(n[r]!==i[r])return!1;return!0}fromArray(e,n=0){for(let i=0;i<16;i++)this.elements[i]=e[i+n];return this}toArray(e=[],n=0){let i=this.elements;return e[n]=i[0],e[n+1]=i[1],e[n+2]=i[2],e[n+3]=i[3],e[n+4]=i[4],e[n+5]=i[5],e[n+6]=i[6],e[n+7]=i[7],e[n+8]=i[8],e[n+9]=i[9],e[n+10]=i[10],e[n+11]=i[11],e[n+12]=i[12],e[n+13]=i[13],e[n+14]=i[14],e[n+15]=i[15],e}},ss=new R,Kn=new Xe,Hx=new R(0,0,0),Gx=new R(1,1,1),Zi=new R,Ha=new R,Tn=new R,Ip=new Xe,Dp=new Ht,Bn=class t{constructor(e=0,n=0,i=0,r=t.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=n,this._z=i,this._order=r}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,n,i,r=this._order){return this._x=e,this._y=n,this._z=i,this._order=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,n=this._order,i=!0){let r=e.elements,s=r[0],o=r[4],a=r[8],l=r[1],c=r[5],h=r[9],u=r[2],d=r[6],f=r[10];switch(n){case"XYZ":this._y=Math.asin(nt(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(-h,f),this._z=Math.atan2(-o,s)):(this._x=Math.atan2(d,c),this._z=0);break;case"YXZ":this._x=Math.asin(-nt(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(a,f),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-u,s),this._z=0);break;case"ZXY":this._x=Math.asin(nt(d,-1,1)),Math.abs(d)<.9999999?(this._y=Math.atan2(-u,f),this._z=Math.atan2(-o,c)):(this._y=0,this._z=Math.atan2(l,s));break;case"ZYX":this._y=Math.asin(-nt(u,-1,1)),Math.abs(u)<.9999999?(this._x=Math.atan2(d,f),this._z=Math.atan2(l,s)):(this._x=0,this._z=Math.atan2(-o,c));break;case"YZX":this._z=Math.asin(nt(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-h,c),this._y=Math.atan2(-u,s)):(this._x=0,this._y=Math.atan2(a,f));break;case"XZY":this._z=Math.asin(-nt(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(d,c),this._y=Math.atan2(a,s)):(this._x=Math.atan2(-h,f),this._y=0);break;default:console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: "+n)}return this._order=n,i===!0&&this._onChangeCallback(),this}setFromQuaternion(e,n,i){return Ip.makeRotationFromQuaternion(e),this.setFromRotationMatrix(Ip,n,i)}setFromVector3(e,n=this._order){return this.set(e.x,e.y,e.z,n)}reorder(e){return Dp.setFromEuler(this),this.setFromQuaternion(Dp,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],n=0){return e[n]=this._x,e[n+1]=this._y,e[n+2]=this._z,e[n+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}};Bn.DEFAULT_ORDER="XYZ";var ws=class{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}},Wx=0,Lp=new R,os=new Ht,Ti=new Xe,Ga=new R,fo=new R,jx=new R,qx=new Ht,Op=new R(1,0,0),Np=new R(0,1,0),Fp=new R(0,0,1),Up={type:"added"},Xx={type:"removed"},as={type:"childadded",child:null},_u={type:"childremoved",child:null},$t=class t extends fi{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:Wx++}),this.uuid=Pi(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=t.DEFAULT_UP.clone();let e=new R,n=new Bn,i=new Ht,r=new R(1,1,1);function s(){i.setFromEuler(n,!1)}function o(){n.setFromQuaternion(i,void 0,!1)}n._onChange(s),i._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:n},quaternion:{configurable:!0,enumerable:!0,value:i},scale:{configurable:!0,enumerable:!0,value:r},modelViewMatrix:{value:new Xe},normalMatrix:{value:new Je}}),this.matrix=new Xe,this.matrixWorld=new Xe,this.matrixAutoUpdate=t.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=t.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new ws,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,n){this.quaternion.setFromAxisAngle(e,n)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,n){return os.setFromAxisAngle(e,n),this.quaternion.multiply(os),this}rotateOnWorldAxis(e,n){return os.setFromAxisAngle(e,n),this.quaternion.premultiply(os),this}rotateX(e){return this.rotateOnAxis(Op,e)}rotateY(e){return this.rotateOnAxis(Np,e)}rotateZ(e){return this.rotateOnAxis(Fp,e)}translateOnAxis(e,n){return Lp.copy(e).applyQuaternion(this.quaternion),this.position.add(Lp.multiplyScalar(n)),this}translateX(e){return this.translateOnAxis(Op,e)}translateY(e){return this.translateOnAxis(Np,e)}translateZ(e){return this.translateOnAxis(Fp,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(Ti.copy(this.matrixWorld).invert())}lookAt(e,n,i){e.isVector3?Ga.copy(e):Ga.set(e,n,i);let r=this.parent;this.updateWorldMatrix(!0,!1),fo.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?Ti.lookAt(fo,Ga,this.up):Ti.lookAt(Ga,fo,this.up),this.quaternion.setFromRotationMatrix(Ti),r&&(Ti.extractRotation(r.matrixWorld),os.setFromRotationMatrix(Ti),this.quaternion.premultiply(os.invert()))}add(e){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.add(arguments[n]);return this}return e===this?(console.error("THREE.Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(Up),as.child=e,this.dispatchEvent(as),as.child=null):console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let i=0;i<arguments.length;i++)this.remove(arguments[i]);return this}let n=this.children.indexOf(e);return n!==-1&&(e.parent=null,this.children.splice(n,1),e.dispatchEvent(Xx),_u.child=e,this.dispatchEvent(_u),_u.child=null),this}removeFromParent(){let e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),Ti.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),Ti.multiply(e.parent.matrixWorld)),e.applyMatrix4(Ti),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(Up),as.child=e,this.dispatchEvent(as),as.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,n){if(this[e]===n)return this;for(let i=0,r=this.children.length;i<r;i++){let o=this.children[i].getObjectByProperty(e,n);if(o!==void 0)return o}}getObjectsByProperty(e,n,i=[]){this[e]===n&&i.push(this);let r=this.children;for(let s=0,o=r.length;s<o;s++)r[s].getObjectsByProperty(e,n,i);return i}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(fo,e,jx),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(fo,qx,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);let n=this.matrixWorld.elements;return e.set(n[8],n[9],n[10]).normalize()}raycast(){}traverse(e){e(this);let n=this.children;for(let i=0,r=n.length;i<r;i++)n[i].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);let n=this.children;for(let i=0,r=n.length;i<r;i++)n[i].traverseVisible(e)}traverseAncestors(e){let n=this.parent;n!==null&&(e(n),n.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);let n=this.children;for(let i=0,r=n.length;i<r;i++)n[i].updateMatrixWorld(e)}updateWorldMatrix(e,n){let i=this.parent;if(e===!0&&i!==null&&i.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),n===!0){let r=this.children;for(let s=0,o=r.length;s<o;s++)r[s].updateWorldMatrix(!1,!0)}}toJSON(e){let n=e===void 0||typeof e=="string",i={};n&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},i.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});let r={};r.uuid=this.uuid,r.type=this.type,this.name!==""&&(r.name=this.name),this.castShadow===!0&&(r.castShadow=!0),this.receiveShadow===!0&&(r.receiveShadow=!0),this.visible===!1&&(r.visible=!1),this.frustumCulled===!1&&(r.frustumCulled=!1),this.renderOrder!==0&&(r.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(r.userData=this.userData),r.layers=this.layers.mask,r.matrix=this.matrix.toArray(),r.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(r.matrixAutoUpdate=!1),this.isInstancedMesh&&(r.type="InstancedMesh",r.count=this.count,r.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(r.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(r.type="BatchedMesh",r.perObjectFrustumCulled=this.perObjectFrustumCulled,r.sortObjects=this.sortObjects,r.drawRanges=this._drawRanges,r.reservedRanges=this._reservedRanges,r.geometryInfo=this._geometryInfo.map(a=>({...a,boundingBox:a.boundingBox?a.boundingBox.toJSON():void 0,boundingSphere:a.boundingSphere?a.boundingSphere.toJSON():void 0})),r.instanceInfo=this._instanceInfo.map(a=>({...a})),r.availableInstanceIds=this._availableInstanceIds.slice(),r.availableGeometryIds=this._availableGeometryIds.slice(),r.nextIndexStart=this._nextIndexStart,r.nextVertexStart=this._nextVertexStart,r.geometryCount=this._geometryCount,r.maxInstanceCount=this._maxInstanceCount,r.maxVertexCount=this._maxVertexCount,r.maxIndexCount=this._maxIndexCount,r.geometryInitialized=this._geometryInitialized,r.matricesTexture=this._matricesTexture.toJSON(e),r.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(r.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(r.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(r.boundingBox=this.boundingBox.toJSON()));function s(a,l){return a[l.uuid]===void 0&&(a[l.uuid]=l.toJSON(e)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?r.background=this.background.toJSON():this.background.isTexture&&(r.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(r.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){r.geometry=s(e.geometries,this.geometry);let a=this.geometry.parameters;if(a!==void 0&&a.shapes!==void 0){let l=a.shapes;if(Array.isArray(l))for(let c=0,h=l.length;c<h;c++){let u=l[c];s(e.shapes,u)}else s(e.shapes,l)}}if(this.isSkinnedMesh&&(r.bindMode=this.bindMode,r.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(s(e.skeletons,this.skeleton),r.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){let a=[];for(let l=0,c=this.material.length;l<c;l++)a.push(s(e.materials,this.material[l]));r.material=a}else r.material=s(e.materials,this.material);if(this.children.length>0){r.children=[];for(let a=0;a<this.children.length;a++)r.children.push(this.children[a].toJSON(e).object)}if(this.animations.length>0){r.animations=[];for(let a=0;a<this.animations.length;a++){let l=this.animations[a];r.animations.push(s(e.animations,l))}}if(n){let a=o(e.geometries),l=o(e.materials),c=o(e.textures),h=o(e.images),u=o(e.shapes),d=o(e.skeletons),f=o(e.animations),m=o(e.nodes);a.length>0&&(i.geometries=a),l.length>0&&(i.materials=l),c.length>0&&(i.textures=c),h.length>0&&(i.images=h),u.length>0&&(i.shapes=u),d.length>0&&(i.skeletons=d),f.length>0&&(i.animations=f),m.length>0&&(i.nodes=m)}return i.object=r,i;function o(a){let l=[];for(let c in a){let h=a[c];delete h.metadata,l.push(h)}return l}}clone(e){return new this.constructor().copy(this,e)}copy(e,n=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),n===!0)for(let i=0;i<e.children.length;i++){let r=e.children[i];this.add(r.clone())}return this}};$t.DEFAULT_UP=new R(0,1,0);$t.DEFAULT_MATRIX_AUTO_UPDATE=!0;$t.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;var Jn=new R,Ai=new R,vu=new R,Ci=new R,cs=new R,ls=new R,zp=new R,yu=new R,xu=new R,bu=new R,Mu=new mt,Su=new mt,wu=new mt,Ri=class t{constructor(e=new R,n=new R,i=new R){this.a=e,this.b=n,this.c=i}static getNormal(e,n,i,r){r.subVectors(i,n),Jn.subVectors(e,n),r.cross(Jn);let s=r.lengthSq();return s>0?r.multiplyScalar(1/Math.sqrt(s)):r.set(0,0,0)}static getBarycoord(e,n,i,r,s){Jn.subVectors(r,n),Ai.subVectors(i,n),vu.subVectors(e,n);let o=Jn.dot(Jn),a=Jn.dot(Ai),l=Jn.dot(vu),c=Ai.dot(Ai),h=Ai.dot(vu),u=o*c-a*a;if(u===0)return s.set(0,0,0),null;let d=1/u,f=(c*l-a*h)*d,m=(o*h-a*l)*d;return s.set(1-f-m,m,f)}static containsPoint(e,n,i,r){return this.getBarycoord(e,n,i,r,Ci)===null?!1:Ci.x>=0&&Ci.y>=0&&Ci.x+Ci.y<=1}static getInterpolation(e,n,i,r,s,o,a,l){return this.getBarycoord(e,n,i,r,Ci)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(s,Ci.x),l.addScaledVector(o,Ci.y),l.addScaledVector(a,Ci.z),l)}static getInterpolatedAttribute(e,n,i,r,s,o){return Mu.setScalar(0),Su.setScalar(0),wu.setScalar(0),Mu.fromBufferAttribute(e,n),Su.fromBufferAttribute(e,i),wu.fromBufferAttribute(e,r),o.setScalar(0),o.addScaledVector(Mu,s.x),o.addScaledVector(Su,s.y),o.addScaledVector(wu,s.z),o}static isFrontFacing(e,n,i,r){return Jn.subVectors(i,n),Ai.subVectors(e,n),Jn.cross(Ai).dot(r)<0}set(e,n,i){return this.a.copy(e),this.b.copy(n),this.c.copy(i),this}setFromPointsAndIndices(e,n,i,r){return this.a.copy(e[n]),this.b.copy(e[i]),this.c.copy(e[r]),this}setFromAttributeAndIndices(e,n,i,r){return this.a.fromBufferAttribute(e,n),this.b.fromBufferAttribute(e,i),this.c.fromBufferAttribute(e,r),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return Jn.subVectors(this.c,this.b),Ai.subVectors(this.a,this.b),Jn.cross(Ai).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return t.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,n){return t.getBarycoord(e,this.a,this.b,this.c,n)}getInterpolation(e,n,i,r,s){return t.getInterpolation(e,this.a,this.b,this.c,n,i,r,s)}containsPoint(e){return t.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return t.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,n){let i=this.a,r=this.b,s=this.c,o,a;cs.subVectors(r,i),ls.subVectors(s,i),yu.subVectors(e,i);let l=cs.dot(yu),c=ls.dot(yu);if(l<=0&&c<=0)return n.copy(i);xu.subVectors(e,r);let h=cs.dot(xu),u=ls.dot(xu);if(h>=0&&u<=h)return n.copy(r);let d=l*u-h*c;if(d<=0&&l>=0&&h<=0)return o=l/(l-h),n.copy(i).addScaledVector(cs,o);bu.subVectors(e,s);let f=cs.dot(bu),m=ls.dot(bu);if(m>=0&&f<=m)return n.copy(s);let _=f*c-l*m;if(_<=0&&c>=0&&m<=0)return a=c/(c-m),n.copy(i).addScaledVector(ls,a);let g=h*m-f*u;if(g<=0&&u-h>=0&&f-m>=0)return zp.subVectors(s,r),a=(u-h)/(u-h+(f-m)),n.copy(r).addScaledVector(zp,a);let p=1/(g+_+d);return o=_*p,a=d*p,n.copy(i).addScaledVector(cs,o).addScaledVector(ls,a)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}},Bm={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},Ki={h:0,s:0,l:0},Wa={h:0,s:0,l:0};function Eu(t,e,n){return n<0&&(n+=1),n>1&&(n-=1),n<1/6?t+(e-t)*6*n:n<1/2?e:n<2/3?t+(e-t)*6*(2/3-n):t}var Oe=class{constructor(e,n,i){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,n,i)}set(e,n,i){if(n===void 0&&i===void 0){let r=e;r&&r.isColor?this.copy(r):typeof r=="number"?this.setHex(r):typeof r=="string"&&this.setStyle(r)}else this.setRGB(e,n,i);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,n=Zt){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,ot.colorSpaceToWorking(this,n),this}setRGB(e,n,i,r=ot.workingColorSpace){return this.r=e,this.g=n,this.b=i,ot.colorSpaceToWorking(this,r),this}setHSL(e,n,i,r=ot.workingColorSpace){if(e=af(e,1),n=nt(n,0,1),i=nt(i,0,1),n===0)this.r=this.g=this.b=i;else{let s=i<=.5?i*(1+n):i+n-i*n,o=2*i-s;this.r=Eu(o,s,e+1/3),this.g=Eu(o,s,e),this.b=Eu(o,s,e-1/3)}return ot.colorSpaceToWorking(this,r),this}setStyle(e,n=Zt){function i(s){s!==void 0&&parseFloat(s)<1&&console.warn("THREE.Color: Alpha component of "+e+" will be ignored.")}let r;if(r=/^(\w+)\(([^\)]*)\)/.exec(e)){let s,o=r[1],a=r[2];switch(o){case"rgb":case"rgba":if(s=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return i(s[4]),this.setRGB(Math.min(255,parseInt(s[1],10))/255,Math.min(255,parseInt(s[2],10))/255,Math.min(255,parseInt(s[3],10))/255,n);if(s=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return i(s[4]),this.setRGB(Math.min(100,parseInt(s[1],10))/100,Math.min(100,parseInt(s[2],10))/100,Math.min(100,parseInt(s[3],10))/100,n);break;case"hsl":case"hsla":if(s=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return i(s[4]),this.setHSL(parseFloat(s[1])/360,parseFloat(s[2])/100,parseFloat(s[3])/100,n);break;default:console.warn("THREE.Color: Unknown color model "+e)}}else if(r=/^\#([A-Fa-f\d]+)$/.exec(e)){let s=r[1],o=s.length;if(o===3)return this.setRGB(parseInt(s.charAt(0),16)/15,parseInt(s.charAt(1),16)/15,parseInt(s.charAt(2),16)/15,n);if(o===6)return this.setHex(parseInt(s,16),n);console.warn("THREE.Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,n);return this}setColorName(e,n=Zt){let i=Bm[e.toLowerCase()];return i!==void 0?this.setHex(i,n):console.warn("THREE.Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=Ii(e.r),this.g=Ii(e.g),this.b=Ii(e.b),this}copyLinearToSRGB(e){return this.r=vs(e.r),this.g=vs(e.g),this.b=vs(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=Zt){return ot.workingToColorSpace(tn.copy(this),e),Math.round(nt(tn.r*255,0,255))*65536+Math.round(nt(tn.g*255,0,255))*256+Math.round(nt(tn.b*255,0,255))}getHexString(e=Zt){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,n=ot.workingColorSpace){ot.workingToColorSpace(tn.copy(this),n);let i=tn.r,r=tn.g,s=tn.b,o=Math.max(i,r,s),a=Math.min(i,r,s),l,c,h=(a+o)/2;if(a===o)l=0,c=0;else{let u=o-a;switch(c=h<=.5?u/(o+a):u/(2-o-a),o){case i:l=(r-s)/u+(r<s?6:0);break;case r:l=(s-i)/u+2;break;case s:l=(i-r)/u+4;break}l/=6}return e.h=l,e.s=c,e.l=h,e}getRGB(e,n=ot.workingColorSpace){return ot.workingToColorSpace(tn.copy(this),n),e.r=tn.r,e.g=tn.g,e.b=tn.b,e}getStyle(e=Zt){ot.workingToColorSpace(tn.copy(this),e);let n=tn.r,i=tn.g,r=tn.b;return e!==Zt?`color(${e} ${n.toFixed(3)} ${i.toFixed(3)} ${r.toFixed(3)})`:`rgb(${Math.round(n*255)},${Math.round(i*255)},${Math.round(r*255)})`}offsetHSL(e,n,i){return this.getHSL(Ki),this.setHSL(Ki.h+e,Ki.s+n,Ki.l+i)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,n){return this.r=e.r+n.r,this.g=e.g+n.g,this.b=e.b+n.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,n){return this.r+=(e.r-this.r)*n,this.g+=(e.g-this.g)*n,this.b+=(e.b-this.b)*n,this}lerpColors(e,n,i){return this.r=e.r+(n.r-e.r)*i,this.g=e.g+(n.g-e.g)*i,this.b=e.b+(n.b-e.b)*i,this}lerpHSL(e,n){this.getHSL(Ki),e.getHSL(Wa);let i=bo(Ki.h,Wa.h,n),r=bo(Ki.s,Wa.s,n),s=bo(Ki.l,Wa.l,n);return this.setHSL(i,r,s),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){let n=this.r,i=this.g,r=this.b,s=e.elements;return this.r=s[0]*n+s[3]*i+s[6]*r,this.g=s[1]*n+s[4]*i+s[7]*r,this.b=s[2]*n+s[5]*i+s[8]*r,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,n=0){return this.r=e[n],this.g=e[n+1],this.b=e[n+2],this}toArray(e=[],n=0){return e[n]=this.r,e[n+1]=this.g,e[n+2]=this.b,e}fromBufferAttribute(e,n){return this.r=e.getX(n),this.g=e.getY(n),this.b=e.getZ(n),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}},tn=new Oe;Oe.NAMES=Bm;var $x=0,Vn=class extends fi{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:$x++}),this.uuid=Pi(),this.name="",this.type="Material",this.blending=Cr,this.side=Di,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=uc,this.blendDst=fc,this.blendEquation=er,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Oe(0,0,0),this.blendAlpha=0,this.depthFunc=Rr,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=ku,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Ar,this.stencilZFail=Ar,this.stencilZPass=Ar,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(let n in e){let i=e[n];if(i===void 0){console.warn(`THREE.Material: parameter '${n}' has value of undefined.`);continue}let r=this[n];if(r===void 0){console.warn(`THREE.Material: '${n}' is not a property of THREE.${this.type}.`);continue}r&&r.isColor?r.set(i):r&&r.isVector3&&i&&i.isVector3?r.copy(i):this[n]=i}}toJSON(e){let n=e===void 0||typeof e=="string";n&&(e={textures:{},images:{}});let i={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};i.uuid=this.uuid,i.type=this.type,this.name!==""&&(i.name=this.name),this.color&&this.color.isColor&&(i.color=this.color.getHex()),this.roughness!==void 0&&(i.roughness=this.roughness),this.metalness!==void 0&&(i.metalness=this.metalness),this.sheen!==void 0&&(i.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(i.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(i.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(i.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(i.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(i.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(i.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(i.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(i.shininess=this.shininess),this.clearcoat!==void 0&&(i.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(i.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(i.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(i.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(i.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,i.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(i.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(i.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(i.dispersion=this.dispersion),this.iridescence!==void 0&&(i.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(i.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(i.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(i.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(i.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(i.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(i.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(i.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(i.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(i.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(i.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(i.lightMap=this.lightMap.toJSON(e).uuid,i.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(i.aoMap=this.aoMap.toJSON(e).uuid,i.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(i.bumpMap=this.bumpMap.toJSON(e).uuid,i.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(i.normalMap=this.normalMap.toJSON(e).uuid,i.normalMapType=this.normalMapType,i.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(i.displacementMap=this.displacementMap.toJSON(e).uuid,i.displacementScale=this.displacementScale,i.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(i.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(i.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(i.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(i.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(i.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(i.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(i.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(i.combine=this.combine)),this.envMapRotation!==void 0&&(i.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(i.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(i.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(i.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(i.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(i.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(i.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(i.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(i.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(i.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(i.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(i.size=this.size),this.shadowSide!==null&&(i.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(i.sizeAttenuation=this.sizeAttenuation),this.blending!==Cr&&(i.blending=this.blending),this.side!==Di&&(i.side=this.side),this.vertexColors===!0&&(i.vertexColors=!0),this.opacity<1&&(i.opacity=this.opacity),this.transparent===!0&&(i.transparent=!0),this.blendSrc!==uc&&(i.blendSrc=this.blendSrc),this.blendDst!==fc&&(i.blendDst=this.blendDst),this.blendEquation!==er&&(i.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(i.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(i.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(i.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(i.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(i.blendAlpha=this.blendAlpha),this.depthFunc!==Rr&&(i.depthFunc=this.depthFunc),this.depthTest===!1&&(i.depthTest=this.depthTest),this.depthWrite===!1&&(i.depthWrite=this.depthWrite),this.colorWrite===!1&&(i.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(i.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==ku&&(i.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(i.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(i.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==Ar&&(i.stencilFail=this.stencilFail),this.stencilZFail!==Ar&&(i.stencilZFail=this.stencilZFail),this.stencilZPass!==Ar&&(i.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(i.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(i.rotation=this.rotation),this.polygonOffset===!0&&(i.polygonOffset=!0),this.polygonOffsetFactor!==0&&(i.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(i.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(i.linewidth=this.linewidth),this.dashSize!==void 0&&(i.dashSize=this.dashSize),this.gapSize!==void 0&&(i.gapSize=this.gapSize),this.scale!==void 0&&(i.scale=this.scale),this.dithering===!0&&(i.dithering=!0),this.alphaTest>0&&(i.alphaTest=this.alphaTest),this.alphaHash===!0&&(i.alphaHash=!0),this.alphaToCoverage===!0&&(i.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(i.premultipliedAlpha=!0),this.forceSinglePass===!0&&(i.forceSinglePass=!0),this.wireframe===!0&&(i.wireframe=!0),this.wireframeLinewidth>1&&(i.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(i.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(i.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(i.flatShading=!0),this.visible===!1&&(i.visible=!1),this.toneMapped===!1&&(i.toneMapped=!1),this.fog===!1&&(i.fog=!1),Object.keys(this.userData).length>0&&(i.userData=this.userData);function r(s){let o=[];for(let a in s){let l=s[a];delete l.metadata,o.push(l)}return o}if(n){let s=r(e.textures),o=r(e.images);s.length>0&&(i.textures=s),o.length>0&&(i.images=o)}return i}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;let n=e.clippingPlanes,i=null;if(n!==null){let r=n.length;i=new Array(r);for(let s=0;s!==r;++s)i[s]=n[s].clone()}return this.clippingPlanes=i,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}},Cn=class extends Vn{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new Oe(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Bn,this.combine=Qc,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}};var kt=new R,ja=new ne,Yx=0,rn=class{constructor(e,n,i=!1){if(Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:Yx++}),this.name="",this.array=e,this.itemSize=n,this.count=e!==void 0?e.length/n:0,this.normalized=i,this.usage=gc,this.updateRanges=[],this.gpuType=vi,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,n){this.updateRanges.push({start:e,count:n})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,n,i){e*=this.itemSize,i*=n.itemSize;for(let r=0,s=this.itemSize;r<s;r++)this.array[e+r]=n.array[i+r];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let n=0,i=this.count;n<i;n++)ja.fromBufferAttribute(this,n),ja.applyMatrix3(e),this.setXY(n,ja.x,ja.y);else if(this.itemSize===3)for(let n=0,i=this.count;n<i;n++)kt.fromBufferAttribute(this,n),kt.applyMatrix3(e),this.setXYZ(n,kt.x,kt.y,kt.z);return this}applyMatrix4(e){for(let n=0,i=this.count;n<i;n++)kt.fromBufferAttribute(this,n),kt.applyMatrix4(e),this.setXYZ(n,kt.x,kt.y,kt.z);return this}applyNormalMatrix(e){for(let n=0,i=this.count;n<i;n++)kt.fromBufferAttribute(this,n),kt.applyNormalMatrix(e),this.setXYZ(n,kt.x,kt.y,kt.z);return this}transformDirection(e){for(let n=0,i=this.count;n<i;n++)kt.fromBufferAttribute(this,n),kt.transformDirection(e),this.setXYZ(n,kt.x,kt.y,kt.z);return this}set(e,n=0){return this.array.set(e,n),this}getComponent(e,n){let i=this.array[e*this.itemSize+n];return this.normalized&&(i=Qn(i,this.array)),i}setComponent(e,n,i){return this.normalized&&(i=pt(i,this.array)),this.array[e*this.itemSize+n]=i,this}getX(e){let n=this.array[e*this.itemSize];return this.normalized&&(n=Qn(n,this.array)),n}setX(e,n){return this.normalized&&(n=pt(n,this.array)),this.array[e*this.itemSize]=n,this}getY(e){let n=this.array[e*this.itemSize+1];return this.normalized&&(n=Qn(n,this.array)),n}setY(e,n){return this.normalized&&(n=pt(n,this.array)),this.array[e*this.itemSize+1]=n,this}getZ(e){let n=this.array[e*this.itemSize+2];return this.normalized&&(n=Qn(n,this.array)),n}setZ(e,n){return this.normalized&&(n=pt(n,this.array)),this.array[e*this.itemSize+2]=n,this}getW(e){let n=this.array[e*this.itemSize+3];return this.normalized&&(n=Qn(n,this.array)),n}setW(e,n){return this.normalized&&(n=pt(n,this.array)),this.array[e*this.itemSize+3]=n,this}setXY(e,n,i){return e*=this.itemSize,this.normalized&&(n=pt(n,this.array),i=pt(i,this.array)),this.array[e+0]=n,this.array[e+1]=i,this}setXYZ(e,n,i,r){return e*=this.itemSize,this.normalized&&(n=pt(n,this.array),i=pt(i,this.array),r=pt(r,this.array)),this.array[e+0]=n,this.array[e+1]=i,this.array[e+2]=r,this}setXYZW(e,n,i,r,s){return e*=this.itemSize,this.normalized&&(n=pt(n,this.array),i=pt(i,this.array),r=pt(r,this.array),s=pt(s,this.array)),this.array[e+0]=n,this.array[e+1]=i,this.array[e+2]=r,this.array[e+3]=s,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==gc&&(e.usage=this.usage),e}};var Co=class extends rn{constructor(e,n,i){super(new Uint16Array(e),n,i)}};var Ro=class extends rn{constructor(e,n,i){super(new Uint32Array(e),n,i)}};var ut=class extends rn{constructor(e,n,i){super(new Float32Array(e),n,i)}},Zx=0,zn=new Xe,Tu=new $t,hs=new R,An=new vn,po=new vn,Xt=new R,St=class t extends fi{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Zx++}),this.uuid=Pi(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(cf(e)?Ro:Co)(e,1):this.index=e,this}setIndirect(e){return this.indirect=e,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,n){return this.attributes[e]=n,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,n,i=0){this.groups.push({start:e,count:n,materialIndex:i})}clearGroups(){this.groups=[]}setDrawRange(e,n){this.drawRange.start=e,this.drawRange.count=n}applyMatrix4(e){let n=this.attributes.position;n!==void 0&&(n.applyMatrix4(e),n.needsUpdate=!0);let i=this.attributes.normal;if(i!==void 0){let s=new Je().getNormalMatrix(e);i.applyNormalMatrix(s),i.needsUpdate=!0}let r=this.attributes.tangent;return r!==void 0&&(r.transformDirection(e),r.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(e){return zn.makeRotationFromQuaternion(e),this.applyMatrix4(zn),this}rotateX(e){return zn.makeRotationX(e),this.applyMatrix4(zn),this}rotateY(e){return zn.makeRotationY(e),this.applyMatrix4(zn),this}rotateZ(e){return zn.makeRotationZ(e),this.applyMatrix4(zn),this}translate(e,n,i){return zn.makeTranslation(e,n,i),this.applyMatrix4(zn),this}scale(e,n,i){return zn.makeScale(e,n,i),this.applyMatrix4(zn),this}lookAt(e){return Tu.lookAt(e),Tu.updateMatrix(),this.applyMatrix4(Tu.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(hs).negate(),this.translate(hs.x,hs.y,hs.z),this}setFromPoints(e){let n=this.getAttribute("position");if(n===void 0){let i=[];for(let r=0,s=e.length;r<s;r++){let o=e[r];i.push(o.x,o.y,o.z||0)}this.setAttribute("position",new ut(i,3))}else{let i=Math.min(e.length,n.count);for(let r=0;r<i;r++){let s=e[r];n.setXYZ(r,s.x,s.y,s.z||0)}e.length>n.count&&console.warn("THREE.BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),n.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new vn);let e=this.attributes.position,n=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new R(-1/0,-1/0,-1/0),new R(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),n)for(let i=0,r=n.length;i<r;i++){let s=n[i];An.setFromBufferAttribute(s),this.morphTargetsRelative?(Xt.addVectors(this.boundingBox.min,An.min),this.boundingBox.expandByPoint(Xt),Xt.addVectors(this.boundingBox.max,An.max),this.boundingBox.expandByPoint(Xt)):(this.boundingBox.expandByPoint(An.min),this.boundingBox.expandByPoint(An.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new di);let e=this.attributes.position,n=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new R,1/0);return}if(e){let i=this.boundingSphere.center;if(An.setFromBufferAttribute(e),n)for(let s=0,o=n.length;s<o;s++){let a=n[s];po.setFromBufferAttribute(a),this.morphTargetsRelative?(Xt.addVectors(An.min,po.min),An.expandByPoint(Xt),Xt.addVectors(An.max,po.max),An.expandByPoint(Xt)):(An.expandByPoint(po.min),An.expandByPoint(po.max))}An.getCenter(i);let r=0;for(let s=0,o=e.count;s<o;s++)Xt.fromBufferAttribute(e,s),r=Math.max(r,i.distanceToSquared(Xt));if(n)for(let s=0,o=n.length;s<o;s++){let a=n[s],l=this.morphTargetsRelative;for(let c=0,h=a.count;c<h;c++)Xt.fromBufferAttribute(a,c),l&&(hs.fromBufferAttribute(e,c),Xt.add(hs)),r=Math.max(r,i.distanceToSquared(Xt))}this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){let e=this.index,n=this.attributes;if(e===null||n.position===void 0||n.normal===void 0||n.uv===void 0){console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}let i=n.position,r=n.normal,s=n.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new rn(new Float32Array(4*i.count),4));let o=this.getAttribute("tangent"),a=[],l=[];for(let C=0;C<i.count;C++)a[C]=new R,l[C]=new R;let c=new R,h=new R,u=new R,d=new ne,f=new ne,m=new ne,_=new R,g=new R;function p(C,E,w){c.fromBufferAttribute(i,C),h.fromBufferAttribute(i,E),u.fromBufferAttribute(i,w),d.fromBufferAttribute(s,C),f.fromBufferAttribute(s,E),m.fromBufferAttribute(s,w),h.sub(c),u.sub(c),f.sub(d),m.sub(d);let I=1/(f.x*m.y-m.x*f.y);isFinite(I)&&(_.copy(h).multiplyScalar(m.y).addScaledVector(u,-f.y).multiplyScalar(I),g.copy(u).multiplyScalar(f.x).addScaledVector(h,-m.x).multiplyScalar(I),a[C].add(_),a[E].add(_),a[w].add(_),l[C].add(g),l[E].add(g),l[w].add(g))}let x=this.groups;x.length===0&&(x=[{start:0,count:e.count}]);for(let C=0,E=x.length;C<E;++C){let w=x[C],I=w.start,N=w.count;for(let B=I,L=I+N;B<L;B+=3)p(e.getX(B+0),e.getX(B+1),e.getX(B+2))}let y=new R,v=new R,M=new R,b=new R;function A(C){M.fromBufferAttribute(r,C),b.copy(M);let E=a[C];y.copy(E),y.sub(M.multiplyScalar(M.dot(E))).normalize(),v.crossVectors(b,E);let I=v.dot(l[C])<0?-1:1;o.setXYZW(C,y.x,y.y,y.z,I)}for(let C=0,E=x.length;C<E;++C){let w=x[C],I=w.start,N=w.count;for(let B=I,L=I+N;B<L;B+=3)A(e.getX(B+0)),A(e.getX(B+1)),A(e.getX(B+2))}}computeVertexNormals(){let e=this.index,n=this.getAttribute("position");if(n!==void 0){let i=this.getAttribute("normal");if(i===void 0)i=new rn(new Float32Array(n.count*3),3),this.setAttribute("normal",i);else for(let d=0,f=i.count;d<f;d++)i.setXYZ(d,0,0,0);let r=new R,s=new R,o=new R,a=new R,l=new R,c=new R,h=new R,u=new R;if(e)for(let d=0,f=e.count;d<f;d+=3){let m=e.getX(d+0),_=e.getX(d+1),g=e.getX(d+2);r.fromBufferAttribute(n,m),s.fromBufferAttribute(n,_),o.fromBufferAttribute(n,g),h.subVectors(o,s),u.subVectors(r,s),h.cross(u),a.fromBufferAttribute(i,m),l.fromBufferAttribute(i,_),c.fromBufferAttribute(i,g),a.add(h),l.add(h),c.add(h),i.setXYZ(m,a.x,a.y,a.z),i.setXYZ(_,l.x,l.y,l.z),i.setXYZ(g,c.x,c.y,c.z)}else for(let d=0,f=n.count;d<f;d+=3)r.fromBufferAttribute(n,d+0),s.fromBufferAttribute(n,d+1),o.fromBufferAttribute(n,d+2),h.subVectors(o,s),u.subVectors(r,s),h.cross(u),i.setXYZ(d+0,h.x,h.y,h.z),i.setXYZ(d+1,h.x,h.y,h.z),i.setXYZ(d+2,h.x,h.y,h.z);this.normalizeNormals(),i.needsUpdate=!0}}normalizeNormals(){let e=this.attributes.normal;for(let n=0,i=e.count;n<i;n++)Xt.fromBufferAttribute(e,n),Xt.normalize(),e.setXYZ(n,Xt.x,Xt.y,Xt.z)}toNonIndexed(){function e(a,l){let c=a.array,h=a.itemSize,u=a.normalized,d=new c.constructor(l.length*h),f=0,m=0;for(let _=0,g=l.length;_<g;_++){a.isInterleavedBufferAttribute?f=l[_]*a.data.stride+a.offset:f=l[_]*h;for(let p=0;p<h;p++)d[m++]=c[f++]}return new rn(d,h,u)}if(this.index===null)return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;let n=new t,i=this.index.array,r=this.attributes;for(let a in r){let l=r[a],c=e(l,i);n.setAttribute(a,c)}let s=this.morphAttributes;for(let a in s){let l=[],c=s[a];for(let h=0,u=c.length;h<u;h++){let d=c[h],f=e(d,i);l.push(f)}n.morphAttributes[a]=l}n.morphTargetsRelative=this.morphTargetsRelative;let o=this.groups;for(let a=0,l=o.length;a<l;a++){let c=o[a];n.addGroup(c.start,c.count,c.materialIndex)}return n}toJSON(){let e={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0){let l=this.parameters;for(let c in l)l[c]!==void 0&&(e[c]=l[c]);return e}e.data={attributes:{}};let n=this.index;n!==null&&(e.data.index={type:n.array.constructor.name,array:Array.prototype.slice.call(n.array)});let i=this.attributes;for(let l in i){let c=i[l];e.data.attributes[l]=c.toJSON(e.data)}let r={},s=!1;for(let l in this.morphAttributes){let c=this.morphAttributes[l],h=[];for(let u=0,d=c.length;u<d;u++){let f=c[u];h.push(f.toJSON(e.data))}h.length>0&&(r[l]=h,s=!0)}s&&(e.data.morphAttributes=r,e.data.morphTargetsRelative=this.morphTargetsRelative);let o=this.groups;o.length>0&&(e.data.groups=JSON.parse(JSON.stringify(o)));let a=this.boundingSphere;return a!==null&&(e.data.boundingSphere=a.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let n={};this.name=e.name;let i=e.index;i!==null&&this.setIndex(i.clone());let r=e.attributes;for(let c in r){let h=r[c];this.setAttribute(c,h.clone(n))}let s=e.morphAttributes;for(let c in s){let h=[],u=s[c];for(let d=0,f=u.length;d<f;d++)h.push(u[d].clone(n));this.morphAttributes[c]=h}this.morphTargetsRelative=e.morphTargetsRelative;let o=e.groups;for(let c=0,h=o.length;c<h;c++){let u=o[c];this.addGroup(u.start,u.count,u.materialIndex)}let a=e.boundingBox;a!==null&&(this.boundingBox=a.clone());let l=e.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}},kp=new Xe,Er=new Li,qa=new di,Bp=new R,Xa=new R,$a=new R,Ya=new R,Au=new R,Za=new R,Vp=new R,Ka=new R,It=class extends $t{constructor(e=new St,n=new Cn){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=n,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,n){return super.copy(e,n),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){let n=this.geometry.morphAttributes,i=Object.keys(n);if(i.length>0){let r=n[i[0]];if(r!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,o=r.length;s<o;s++){let a=r[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=s}}}}getVertexPosition(e,n){let i=this.geometry,r=i.attributes.position,s=i.morphAttributes.position,o=i.morphTargetsRelative;n.fromBufferAttribute(r,e);let a=this.morphTargetInfluences;if(s&&a){Za.set(0,0,0);for(let l=0,c=s.length;l<c;l++){let h=a[l],u=s[l];h!==0&&(Au.fromBufferAttribute(u,e),o?Za.addScaledVector(Au,h):Za.addScaledVector(Au.sub(n),h))}n.add(Za)}return n}raycast(e,n){let i=this.geometry,r=this.material,s=this.matrixWorld;r!==void 0&&(i.boundingSphere===null&&i.computeBoundingSphere(),qa.copy(i.boundingSphere),qa.applyMatrix4(s),Er.copy(e.ray).recast(e.near),!(qa.containsPoint(Er.origin)===!1&&(Er.intersectSphere(qa,Bp)===null||Er.origin.distanceToSquared(Bp)>(e.far-e.near)**2))&&(kp.copy(s).invert(),Er.copy(e.ray).applyMatrix4(kp),!(i.boundingBox!==null&&Er.intersectsBox(i.boundingBox)===!1)&&this._computeIntersections(e,n,Er)))}_computeIntersections(e,n,i){let r,s=this.geometry,o=this.material,a=s.index,l=s.attributes.position,c=s.attributes.uv,h=s.attributes.uv1,u=s.attributes.normal,d=s.groups,f=s.drawRange;if(a!==null)if(Array.isArray(o))for(let m=0,_=d.length;m<_;m++){let g=d[m],p=o[g.materialIndex],x=Math.max(g.start,f.start),y=Math.min(a.count,Math.min(g.start+g.count,f.start+f.count));for(let v=x,M=y;v<M;v+=3){let b=a.getX(v),A=a.getX(v+1),C=a.getX(v+2);r=Ja(this,p,e,i,c,h,u,b,A,C),r&&(r.faceIndex=Math.floor(v/3),r.face.materialIndex=g.materialIndex,n.push(r))}}else{let m=Math.max(0,f.start),_=Math.min(a.count,f.start+f.count);for(let g=m,p=_;g<p;g+=3){let x=a.getX(g),y=a.getX(g+1),v=a.getX(g+2);r=Ja(this,o,e,i,c,h,u,x,y,v),r&&(r.faceIndex=Math.floor(g/3),n.push(r))}}else if(l!==void 0)if(Array.isArray(o))for(let m=0,_=d.length;m<_;m++){let g=d[m],p=o[g.materialIndex],x=Math.max(g.start,f.start),y=Math.min(l.count,Math.min(g.start+g.count,f.start+f.count));for(let v=x,M=y;v<M;v+=3){let b=v,A=v+1,C=v+2;r=Ja(this,p,e,i,c,h,u,b,A,C),r&&(r.faceIndex=Math.floor(v/3),r.face.materialIndex=g.materialIndex,n.push(r))}}else{let m=Math.max(0,f.start),_=Math.min(l.count,f.start+f.count);for(let g=m,p=_;g<p;g+=3){let x=g,y=g+1,v=g+2;r=Ja(this,o,e,i,c,h,u,x,y,v),r&&(r.faceIndex=Math.floor(g/3),n.push(r))}}}};function Kx(t,e,n,i,r,s,o,a){let l;if(e.side===Jt?l=i.intersectTriangle(o,s,r,!0,a):l=i.intersectTriangle(r,s,o,e.side===Di,a),l===null)return null;Ka.copy(a),Ka.applyMatrix4(t.matrixWorld);let c=n.ray.origin.distanceTo(Ka);return c<n.near||c>n.far?null:{distance:c,point:Ka.clone(),object:t}}function Ja(t,e,n,i,r,s,o,a,l,c){t.getVertexPosition(a,Xa),t.getVertexPosition(l,$a),t.getVertexPosition(c,Ya);let h=Kx(t,e,n,i,Xa,$a,Ya,Vp);if(h){let u=new R;Ri.getBarycoord(Vp,Xa,$a,Ya,u),r&&(h.uv=Ri.getInterpolatedAttribute(r,a,l,c,u,new ne)),s&&(h.uv1=Ri.getInterpolatedAttribute(s,a,l,c,u,new ne)),o&&(h.normal=Ri.getInterpolatedAttribute(o,a,l,c,u,new R),h.normal.dot(i.direction)>0&&h.normal.multiplyScalar(-1));let d={a,b:l,c,normal:new R,materialIndex:0};Ri.getNormal(Xa,$a,Ya,d.normal),h.face=d,h.barycoord=u}return h}var Es=class t extends St{constructor(e=1,n=1,i=1,r=1,s=1,o=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:n,depth:i,widthSegments:r,heightSegments:s,depthSegments:o};let a=this;r=Math.floor(r),s=Math.floor(s),o=Math.floor(o);let l=[],c=[],h=[],u=[],d=0,f=0;m("z","y","x",-1,-1,i,n,e,o,s,0),m("z","y","x",1,-1,i,n,-e,o,s,1),m("x","z","y",1,1,e,i,n,r,o,2),m("x","z","y",1,-1,e,i,-n,r,o,3),m("x","y","z",1,-1,e,n,i,r,s,4),m("x","y","z",-1,-1,e,n,-i,r,s,5),this.setIndex(l),this.setAttribute("position",new ut(c,3)),this.setAttribute("normal",new ut(h,3)),this.setAttribute("uv",new ut(u,2));function m(_,g,p,x,y,v,M,b,A,C,E){let w=v/A,I=M/C,N=v/2,B=M/2,L=b/2,D=A+1,F=C+1,J=0,G=0,le=new R;for(let fe=0;fe<F;fe++){let X=fe*I-B;for(let re=0;re<D;re++){let ye=re*w-N;le[_]=ye*x,le[g]=X*y,le[p]=L,c.push(le.x,le.y,le.z),le[_]=0,le[g]=0,le[p]=b>0?1:-1,h.push(le.x,le.y,le.z),u.push(re/A),u.push(1-fe/C),J+=1}}for(let fe=0;fe<C;fe++)for(let X=0;X<A;X++){let re=d+X+D*fe,ye=d+X+D*(fe+1),Ue=d+(X+1)+D*(fe+1),ke=d+(X+1)+D*fe;l.push(re,ye,ke),l.push(ye,Ue,ke),G+=6}a.addGroup(f,G,E),f+=G,d+=J}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new t(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}};function Ur(t){let e={};for(let n in t){e[n]={};for(let i in t[n]){let r=t[n][i];r&&(r.isColor||r.isMatrix3||r.isMatrix4||r.isVector2||r.isVector3||r.isVector4||r.isTexture||r.isQuaternion)?r.isRenderTargetTexture?(console.warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[n][i]=null):e[n][i]=r.clone():Array.isArray(r)?e[n][i]=r.slice():e[n][i]=r}}return e}function on(t){let e={};for(let n=0;n<t.length;n++){let i=Ur(t[n]);for(let r in i)e[r]=i[r]}return e}function Jx(t){let e=[];for(let n=0;n<t.length;n++)e.push(t[n].clone());return e}function lf(t){let e=t.getRenderTarget();return e===null?t.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:ot.workingColorSpace}var Bi={clone:Ur,merge:on},Qx=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,eb=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`,Bt=class extends Vn{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=Qx,this.fragmentShader=eb,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=Ur(e.uniforms),this.uniformsGroups=Jx(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this}toJSON(e){let n=super.toJSON(e);n.glslVersion=this.glslVersion,n.uniforms={};for(let r in this.uniforms){let o=this.uniforms[r].value;o&&o.isTexture?n.uniforms[r]={type:"t",value:o.toJSON(e).uuid}:o&&o.isColor?n.uniforms[r]={type:"c",value:o.getHex()}:o&&o.isVector2?n.uniforms[r]={type:"v2",value:o.toArray()}:o&&o.isVector3?n.uniforms[r]={type:"v3",value:o.toArray()}:o&&o.isVector4?n.uniforms[r]={type:"v4",value:o.toArray()}:o&&o.isMatrix3?n.uniforms[r]={type:"m3",value:o.toArray()}:o&&o.isMatrix4?n.uniforms[r]={type:"m4",value:o.toArray()}:n.uniforms[r]={value:o}}Object.keys(this.defines).length>0&&(n.defines=this.defines),n.vertexShader=this.vertexShader,n.fragmentShader=this.fragmentShader,n.lights=this.lights,n.clipping=this.clipping;let i={};for(let r in this.extensions)this.extensions[r]===!0&&(i[r]=!0);return Object.keys(i).length>0&&(n.extensions=i),n}},Po=class extends $t{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new Xe,this.projectionMatrix=new Xe,this.projectionMatrixInverse=new Xe,this.coordinateSystem=ei,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,n){return super.copy(e,n),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(e,n){super.updateWorldMatrix(e,n),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}},Ji=new R,Hp=new ne,Gp=new ne,Kt=class extends Po{constructor(e=50,n=1,i=.1,r=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=i,this.far=r,this.focus=10,this.aspect=n,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,n){return super.copy(e,n),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){let n=.5*this.getFilmHeight()/e;this.fov=xs*2*Math.atan(n),this.updateProjectionMatrix()}getFocalLength(){let e=Math.tan(xo*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return xs*2*Math.atan(Math.tan(xo*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,n,i){Ji.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(Ji.x,Ji.y).multiplyScalar(-e/Ji.z),Ji.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),i.set(Ji.x,Ji.y).multiplyScalar(-e/Ji.z)}getViewSize(e,n){return this.getViewBounds(e,Hp,Gp),n.subVectors(Gp,Hp)}setViewOffset(e,n,i,r,s,o){this.aspect=e/n,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=n,this.view.offsetX=i,this.view.offsetY=r,this.view.width=s,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=this.near,n=e*Math.tan(xo*.5*this.fov)/this.zoom,i=2*n,r=this.aspect*i,s=-.5*r,o=this.view;if(this.view!==null&&this.view.enabled){let l=o.fullWidth,c=o.fullHeight;s+=o.offsetX*r/l,n-=o.offsetY*i/c,r*=o.width/l,i*=o.height/c}let a=this.filmOffset;a!==0&&(s+=e*a/this.getFilmWidth()),this.projectionMatrix.makePerspective(s,s+r,n,n-i,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let n=super.toJSON(e);return n.object.fov=this.fov,n.object.zoom=this.zoom,n.object.near=this.near,n.object.far=this.far,n.object.focus=this.focus,n.object.aspect=this.aspect,this.view!==null&&(n.object.view=Object.assign({},this.view)),n.object.filmGauge=this.filmGauge,n.object.filmOffset=this.filmOffset,n}},us=-90,fs=1,xc=class extends $t{constructor(e,n,i){super(),this.type="CubeCamera",this.renderTarget=i,this.coordinateSystem=null,this.activeMipmapLevel=0;let r=new Kt(us,fs,e,n);r.layers=this.layers,this.add(r);let s=new Kt(us,fs,e,n);s.layers=this.layers,this.add(s);let o=new Kt(us,fs,e,n);o.layers=this.layers,this.add(o);let a=new Kt(us,fs,e,n);a.layers=this.layers,this.add(a);let l=new Kt(us,fs,e,n);l.layers=this.layers,this.add(l);let c=new Kt(us,fs,e,n);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){let e=this.coordinateSystem,n=this.children.concat(),[i,r,s,o,a,l]=n;for(let c of n)this.remove(c);if(e===ei)i.up.set(0,1,0),i.lookAt(1,0,0),r.up.set(0,1,0),r.lookAt(-1,0,0),s.up.set(0,0,-1),s.lookAt(0,1,0),o.up.set(0,0,1),o.lookAt(0,-1,0),a.up.set(0,1,0),a.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(e===To)i.up.set(0,-1,0),i.lookAt(-1,0,0),r.up.set(0,-1,0),r.lookAt(1,0,0),s.up.set(0,0,1),s.lookAt(0,1,0),o.up.set(0,0,-1),o.lookAt(0,-1,0),a.up.set(0,-1,0),a.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(let c of n)this.add(c),c.updateMatrixWorld()}update(e,n){this.parent===null&&this.updateMatrixWorld();let{renderTarget:i,activeMipmapLevel:r}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());let[s,o,a,l,c,h]=this.children,u=e.getRenderTarget(),d=e.getActiveCubeFace(),f=e.getActiveMipmapLevel(),m=e.xr.enabled;e.xr.enabled=!1;let _=i.texture.generateMipmaps;i.texture.generateMipmaps=!1,e.setRenderTarget(i,0,r),e.render(n,s),e.setRenderTarget(i,1,r),e.render(n,o),e.setRenderTarget(i,2,r),e.render(n,a),e.setRenderTarget(i,3,r),e.render(n,l),e.setRenderTarget(i,4,r),e.render(n,c),i.texture.generateMipmaps=_,e.setRenderTarget(i,5,r),e.render(n,h),e.setRenderTarget(u,d,f),e.xr.enabled=m,i.texture.needsPMREMUpdate=!0}},Io=class extends un{constructor(e=[],n=Nr,i,r,s,o,a,l,c,h){super(e,n,i,r,s,o,a,l,c,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}},bc=class extends sn{constructor(e=1,n={}){super(e,e,n),this.isWebGLCubeRenderTarget=!0;let i={width:e,height:e,depth:1},r=[i,i,i,i,i,i];this.texture=new Io(r),this._setTextureOptions(n),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,n){this.texture.type=n.type,this.texture.colorSpace=n.colorSpace,this.texture.generateMipmaps=n.generateMipmaps,this.texture.minFilter=n.minFilter,this.texture.magFilter=n.magFilter;let i={uniforms:{tEquirect:{value:null}},vertexShader:`

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
			`},r=new Es(5,5,5),s=new Bt({name:"CubemapFromEquirect",uniforms:Ur(i.uniforms),vertexShader:i.vertexShader,fragmentShader:i.fragmentShader,side:Jt,blending:ii});s.uniforms.tEquirect.value=n;let o=new It(r,s),a=n.minFilter;return n.minFilter===rr&&(n.minFilter=ti),new xc(1,10,this).update(e,o),n.minFilter=a,o.geometry.dispose(),o.material.dispose(),this}clear(e,n=!0,i=!0,r=!0){let s=e.getRenderTarget();for(let o=0;o<6;o++)e.setRenderTarget(this,o),e.clear(n,i,r);e.setRenderTarget(s)}},nn=class extends $t{constructor(){super(),this.isGroup=!0,this.type="Group"}},tb={type:"move"},Ts=class{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new nn,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new nn,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new R,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new R),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new nn,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new R,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new R),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){let n=this._hand;if(n)for(let i of e.hand.values())this._getHandJoint(n,i)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,n,i){let r=null,s=null,o=null,a=this._targetRay,l=this._grip,c=this._hand;if(e&&n.session.visibilityState!=="visible-blurred"){if(c&&e.hand){o=!0;for(let _ of e.hand.values()){let g=n.getJointPose(_,i),p=this._getHandJoint(c,_);g!==null&&(p.matrix.fromArray(g.transform.matrix),p.matrix.decompose(p.position,p.rotation,p.scale),p.matrixWorldNeedsUpdate=!0,p.jointRadius=g.radius),p.visible=g!==null}let h=c.joints["index-finger-tip"],u=c.joints["thumb-tip"],d=h.position.distanceTo(u.position),f=.02,m=.005;c.inputState.pinching&&d>f+m?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!c.inputState.pinching&&d<=f-m&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else l!==null&&e.gripSpace&&(s=n.getPose(e.gripSpace,i),s!==null&&(l.matrix.fromArray(s.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,s.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(s.linearVelocity)):l.hasLinearVelocity=!1,s.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(s.angularVelocity)):l.hasAngularVelocity=!1));a!==null&&(r=n.getPose(e.targetRaySpace,i),r===null&&s!==null&&(r=s),r!==null&&(a.matrix.fromArray(r.transform.matrix),a.matrix.decompose(a.position,a.rotation,a.scale),a.matrixWorldNeedsUpdate=!0,r.linearVelocity?(a.hasLinearVelocity=!0,a.linearVelocity.copy(r.linearVelocity)):a.hasLinearVelocity=!1,r.angularVelocity?(a.hasAngularVelocity=!0,a.angularVelocity.copy(r.angularVelocity)):a.hasAngularVelocity=!1,this.dispatchEvent(tb)))}return a!==null&&(a.visible=r!==null),l!==null&&(l.visible=s!==null),c!==null&&(c.visible=o!==null),this}_getHandJoint(e,n){if(e.joints[n.jointName]===void 0){let i=new nn;i.matrixAutoUpdate=!1,i.visible=!1,e.joints[n.jointName]=i,e.add(i)}return e.joints[n.jointName]}},Do=class t{constructor(e,n=25e-5){this.isFogExp2=!0,this.name="",this.color=new Oe(e),this.density=n}clone(){return new t(this.color,this.density)}toJSON(){return{type:"FogExp2",name:this.name,color:this.color.getHex(),density:this.density}}};var Lo=class extends $t{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new Bn,this.environmentIntensity=1,this.environmentRotation=new Bn,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,n){return super.copy(e,n),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){let n=super.toJSON(e);return this.fog!==null&&(n.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(n.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(n.object.backgroundIntensity=this.backgroundIntensity),n.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(n.object.environmentIntensity=this.environmentIntensity),n.object.environmentRotation=this.environmentRotation.toArray(),n}},Mc=class{constructor(e,n){this.isInterleavedBuffer=!0,this.array=e,this.stride=n,this.count=e!==void 0?e.length/n:0,this.usage=gc,this.updateRanges=[],this.version=0,this.uuid=Pi()}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,n){this.updateRanges.push({start:e,count:n})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.array=new e.array.constructor(e.array),this.count=e.count,this.stride=e.stride,this.usage=e.usage,this}copyAt(e,n,i){e*=this.stride,i*=n.stride;for(let r=0,s=this.stride;r<s;r++)this.array[e+r]=n.array[i+r];return this}set(e,n=0){return this.array.set(e,n),this}clone(e){e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=Pi()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=this.array.slice(0).buffer);let n=new this.array.constructor(e.arrayBuffers[this.array.buffer._uuid]),i=new this.constructor(n,this.stride);return i.setUsage(this.usage),i}onUpload(e){return this.onUploadCallback=e,this}toJSON(e){return e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=Pi()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=Array.from(new Uint32Array(this.array.buffer))),{uuid:this.uuid,buffer:this.array.buffer._uuid,type:this.array.constructor.name,stride:this.stride}}},hn=new R,Oo=class t{constructor(e,n,i,r=!1){this.isInterleavedBufferAttribute=!0,this.name="",this.data=e,this.itemSize=n,this.offset=i,this.normalized=r}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(e){this.data.needsUpdate=e}applyMatrix4(e){for(let n=0,i=this.data.count;n<i;n++)hn.fromBufferAttribute(this,n),hn.applyMatrix4(e),this.setXYZ(n,hn.x,hn.y,hn.z);return this}applyNormalMatrix(e){for(let n=0,i=this.count;n<i;n++)hn.fromBufferAttribute(this,n),hn.applyNormalMatrix(e),this.setXYZ(n,hn.x,hn.y,hn.z);return this}transformDirection(e){for(let n=0,i=this.count;n<i;n++)hn.fromBufferAttribute(this,n),hn.transformDirection(e),this.setXYZ(n,hn.x,hn.y,hn.z);return this}getComponent(e,n){let i=this.array[e*this.data.stride+this.offset+n];return this.normalized&&(i=Qn(i,this.array)),i}setComponent(e,n,i){return this.normalized&&(i=pt(i,this.array)),this.data.array[e*this.data.stride+this.offset+n]=i,this}setX(e,n){return this.normalized&&(n=pt(n,this.array)),this.data.array[e*this.data.stride+this.offset]=n,this}setY(e,n){return this.normalized&&(n=pt(n,this.array)),this.data.array[e*this.data.stride+this.offset+1]=n,this}setZ(e,n){return this.normalized&&(n=pt(n,this.array)),this.data.array[e*this.data.stride+this.offset+2]=n,this}setW(e,n){return this.normalized&&(n=pt(n,this.array)),this.data.array[e*this.data.stride+this.offset+3]=n,this}getX(e){let n=this.data.array[e*this.data.stride+this.offset];return this.normalized&&(n=Qn(n,this.array)),n}getY(e){let n=this.data.array[e*this.data.stride+this.offset+1];return this.normalized&&(n=Qn(n,this.array)),n}getZ(e){let n=this.data.array[e*this.data.stride+this.offset+2];return this.normalized&&(n=Qn(n,this.array)),n}getW(e){let n=this.data.array[e*this.data.stride+this.offset+3];return this.normalized&&(n=Qn(n,this.array)),n}setXY(e,n,i){return e=e*this.data.stride+this.offset,this.normalized&&(n=pt(n,this.array),i=pt(i,this.array)),this.data.array[e+0]=n,this.data.array[e+1]=i,this}setXYZ(e,n,i,r){return e=e*this.data.stride+this.offset,this.normalized&&(n=pt(n,this.array),i=pt(i,this.array),r=pt(r,this.array)),this.data.array[e+0]=n,this.data.array[e+1]=i,this.data.array[e+2]=r,this}setXYZW(e,n,i,r,s){return e=e*this.data.stride+this.offset,this.normalized&&(n=pt(n,this.array),i=pt(i,this.array),r=pt(r,this.array),s=pt(s,this.array)),this.data.array[e+0]=n,this.data.array[e+1]=i,this.data.array[e+2]=r,this.data.array[e+3]=s,this}clone(e){if(e===void 0){console.log("THREE.InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.");let n=[];for(let i=0;i<this.count;i++){let r=i*this.data.stride+this.offset;for(let s=0;s<this.itemSize;s++)n.push(this.data.array[r+s])}return new rn(new this.array.constructor(n),this.itemSize,this.normalized)}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.clone(e)),new t(e.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}toJSON(e){if(e===void 0){console.log("THREE.InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.");let n=[];for(let i=0;i<this.count;i++){let r=i*this.data.stride+this.offset;for(let s=0;s<this.itemSize;s++)n.push(this.data.array[r+s])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:n,normalized:this.normalized}}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.toJSON(e)),{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}},Oi=class extends Vn{constructor(e){super(),this.isSpriteMaterial=!0,this.type="SpriteMaterial",this.color=new Oe(16777215),this.map=null,this.alphaMap=null,this.rotation=0,this.sizeAttenuation=!0,this.transparent=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.rotation=e.rotation,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}},ds,mo=new R,ps=new R,ms=new R,gs=new ne,go=new ne,Vm=new Xe,Qa=new R,_o=new R,ec=new R,Wp=new ne,Cu=new ne,jp=new ne,Ni=class extends $t{constructor(e=new Oi){if(super(),this.isSprite=!0,this.type="Sprite",ds===void 0){ds=new St;let n=new Float32Array([-.5,-.5,0,0,0,.5,-.5,0,1,0,.5,.5,0,1,1,-.5,.5,0,0,1]),i=new Mc(n,5);ds.setIndex([0,1,2,0,2,3]),ds.setAttribute("position",new Oo(i,3,0,!1)),ds.setAttribute("uv",new Oo(i,2,3,!1))}this.geometry=ds,this.material=e,this.center=new ne(.5,.5),this.count=1}raycast(e,n){e.camera===null&&console.error('THREE.Sprite: "Raycaster.camera" needs to be set in order to raycast against sprites.'),ps.setFromMatrixScale(this.matrixWorld),Vm.copy(e.camera.matrixWorld),this.modelViewMatrix.multiplyMatrices(e.camera.matrixWorldInverse,this.matrixWorld),ms.setFromMatrixPosition(this.modelViewMatrix),e.camera.isPerspectiveCamera&&this.material.sizeAttenuation===!1&&ps.multiplyScalar(-ms.z);let i=this.material.rotation,r,s;i!==0&&(s=Math.cos(i),r=Math.sin(i));let o=this.center;tc(Qa.set(-.5,-.5,0),ms,o,ps,r,s),tc(_o.set(.5,-.5,0),ms,o,ps,r,s),tc(ec.set(.5,.5,0),ms,o,ps,r,s),Wp.set(0,0),Cu.set(1,0),jp.set(1,1);let a=e.ray.intersectTriangle(Qa,_o,ec,!1,mo);if(a===null&&(tc(_o.set(-.5,.5,0),ms,o,ps,r,s),Cu.set(0,1),a=e.ray.intersectTriangle(Qa,ec,_o,!1,mo),a===null))return;let l=e.ray.origin.distanceTo(mo);l<e.near||l>e.far||n.push({distance:l,point:mo.clone(),uv:Ri.getInterpolation(mo,Qa,_o,ec,Wp,Cu,jp,new ne),face:null,object:this})}copy(e,n){return super.copy(e,n),e.center!==void 0&&this.center.copy(e.center),this.material=e.material,this}};function tc(t,e,n,i,r,s){gs.subVectors(t,n).addScalar(.5).multiply(i),r!==void 0?(go.x=s*gs.x-r*gs.y,go.y=r*gs.x+s*gs.y):go.copy(gs),t.copy(e),t.x+=go.x,t.y+=go.y,t.applyMatrix4(Vm)}var Ru=new R,nb=new R,ib=new Je,_n=class{constructor(e=new R(1,0,0),n=0){this.isPlane=!0,this.normal=e,this.constant=n}set(e,n){return this.normal.copy(e),this.constant=n,this}setComponents(e,n,i,r){return this.normal.set(e,n,i),this.constant=r,this}setFromNormalAndCoplanarPoint(e,n){return this.normal.copy(e),this.constant=-n.dot(this.normal),this}setFromCoplanarPoints(e,n,i){let r=Ru.subVectors(i,n).cross(nb.subVectors(e,n)).normalize();return this.setFromNormalAndCoplanarPoint(r,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){let e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,n){return n.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,n){let i=e.delta(Ru),r=this.normal.dot(i);if(r===0)return this.distanceToPoint(e.start)===0?n.copy(e.start):null;let s=-(e.start.dot(this.normal)+this.constant)/r;return s<0||s>1?null:n.copy(e.start).addScaledVector(i,s)}intersectsLine(e){let n=this.distanceToPoint(e.start),i=this.distanceToPoint(e.end);return n<0&&i>0||i<0&&n>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,n){let i=n||ib.getNormalMatrix(e),r=this.coplanarPoint(Ru).applyMatrix4(e),s=this.normal.applyMatrix3(i).normalize();return this.constant=-r.dot(s),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}},Tr=new di,rb=new ne(.5,.5),nc=new R,As=class{constructor(e=new _n,n=new _n,i=new _n,r=new _n,s=new _n,o=new _n){this.planes=[e,n,i,r,s,o]}set(e,n,i,r,s,o){let a=this.planes;return a[0].copy(e),a[1].copy(n),a[2].copy(i),a[3].copy(r),a[4].copy(s),a[5].copy(o),this}copy(e){let n=this.planes;for(let i=0;i<6;i++)n[i].copy(e.planes[i]);return this}setFromProjectionMatrix(e,n=ei,i=!1){let r=this.planes,s=e.elements,o=s[0],a=s[1],l=s[2],c=s[3],h=s[4],u=s[5],d=s[6],f=s[7],m=s[8],_=s[9],g=s[10],p=s[11],x=s[12],y=s[13],v=s[14],M=s[15];if(r[0].setComponents(c-o,f-h,p-m,M-x).normalize(),r[1].setComponents(c+o,f+h,p+m,M+x).normalize(),r[2].setComponents(c+a,f+u,p+_,M+y).normalize(),r[3].setComponents(c-a,f-u,p-_,M-y).normalize(),i)r[4].setComponents(l,d,g,v).normalize(),r[5].setComponents(c-l,f-d,p-g,M-v).normalize();else if(r[4].setComponents(c-l,f-d,p-g,M-v).normalize(),n===ei)r[5].setComponents(c+l,f+d,p+g,M+v).normalize();else if(n===To)r[5].setComponents(l,d,g,v).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+n);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),Tr.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{let n=e.geometry;n.boundingSphere===null&&n.computeBoundingSphere(),Tr.copy(n.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(Tr)}intersectsSprite(e){Tr.center.set(0,0,0);let n=rb.distanceTo(e.center);return Tr.radius=.7071067811865476+n,Tr.applyMatrix4(e.matrixWorld),this.intersectsSphere(Tr)}intersectsSphere(e){let n=this.planes,i=e.center,r=-e.radius;for(let s=0;s<6;s++)if(n[s].distanceToPoint(i)<r)return!1;return!0}intersectsBox(e){let n=this.planes;for(let i=0;i<6;i++){let r=n[i];if(nc.x=r.normal.x>0?e.max.x:e.min.x,nc.y=r.normal.y>0?e.max.y:e.min.y,nc.z=r.normal.z>0?e.max.z:e.min.z,r.distanceToPoint(nc)<0)return!1}return!0}containsPoint(e){let n=this.planes;for(let i=0;i<6;i++)if(n[i].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}};var ni=class extends Vn{constructor(e){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new Oe(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.linewidth=e.linewidth,this.linecap=e.linecap,this.linejoin=e.linejoin,this.fog=e.fog,this}},Sc=new R,wc=new R,qp=new Xe,vo=new Li,ic=new di,Pu=new R,Xp=new R,pi=class extends $t{constructor(e=new St,n=new ni){super(),this.isLine=!0,this.type="Line",this.geometry=e,this.material=n,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,n){return super.copy(e,n),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}computeLineDistances(){let e=this.geometry;if(e.index===null){let n=e.attributes.position,i=[0];for(let r=1,s=n.count;r<s;r++)Sc.fromBufferAttribute(n,r-1),wc.fromBufferAttribute(n,r),i[r]=i[r-1],i[r]+=Sc.distanceTo(wc);e.setAttribute("lineDistance",new ut(i,1))}else console.warn("THREE.Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}raycast(e,n){let i=this.geometry,r=this.matrixWorld,s=e.params.Line.threshold,o=i.drawRange;if(i.boundingSphere===null&&i.computeBoundingSphere(),ic.copy(i.boundingSphere),ic.applyMatrix4(r),ic.radius+=s,e.ray.intersectsSphere(ic)===!1)return;qp.copy(r).invert(),vo.copy(e.ray).applyMatrix4(qp);let a=s/((this.scale.x+this.scale.y+this.scale.z)/3),l=a*a,c=this.isLineSegments?2:1,h=i.index,d=i.attributes.position;if(h!==null){let f=Math.max(0,o.start),m=Math.min(h.count,o.start+o.count);for(let _=f,g=m-1;_<g;_+=c){let p=h.getX(_),x=h.getX(_+1),y=rc(this,e,vo,l,p,x,_);y&&n.push(y)}if(this.isLineLoop){let _=h.getX(m-1),g=h.getX(f),p=rc(this,e,vo,l,_,g,m-1);p&&n.push(p)}}else{let f=Math.max(0,o.start),m=Math.min(d.count,o.start+o.count);for(let _=f,g=m-1;_<g;_+=c){let p=rc(this,e,vo,l,_,_+1,_);p&&n.push(p)}if(this.isLineLoop){let _=rc(this,e,vo,l,m-1,f,m-1);_&&n.push(_)}}}updateMorphTargets(){let n=this.geometry.morphAttributes,i=Object.keys(n);if(i.length>0){let r=n[i[0]];if(r!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,o=r.length;s<o;s++){let a=r[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=s}}}}};function rc(t,e,n,i,r,s,o){let a=t.geometry.attributes.position;if(Sc.fromBufferAttribute(a,r),wc.fromBufferAttribute(a,s),n.distanceSqToSegment(Sc,wc,Pu,Xp)>i)return;Pu.applyMatrix4(t.matrixWorld);let c=e.ray.origin.distanceTo(Pu);if(!(c<e.near||c>e.far))return{distance:c,point:Xp.clone().applyMatrix4(t.matrixWorld),index:o,face:null,faceIndex:null,barycoord:null,object:t}}var $p=new R,Yp=new R,Ec=class extends pi{constructor(e,n){super(e,n),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){let e=this.geometry;if(e.index===null){let n=e.attributes.position,i=[];for(let r=0,s=n.count;r<s;r+=2)$p.fromBufferAttribute(n,r),Yp.fromBufferAttribute(n,r+1),i[r]=r===0?0:i[r-1],i[r+1]=i[r]+$p.distanceTo(Yp);e.setAttribute("lineDistance",new ut(i,1))}else console.warn("THREE.LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}};var Cs=class extends Vn{constructor(e){super(),this.isPointsMaterial=!0,this.type="PointsMaterial",this.color=new Oe(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.size=e.size,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}},Zp=new Xe,Bu=new Li,sc=new di,oc=new R,No=class extends $t{constructor(e=new St,n=new Cs){super(),this.isPoints=!0,this.type="Points",this.geometry=e,this.material=n,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,n){return super.copy(e,n),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}raycast(e,n){let i=this.geometry,r=this.matrixWorld,s=e.params.Points.threshold,o=i.drawRange;if(i.boundingSphere===null&&i.computeBoundingSphere(),sc.copy(i.boundingSphere),sc.applyMatrix4(r),sc.radius+=s,e.ray.intersectsSphere(sc)===!1)return;Zp.copy(r).invert(),Bu.copy(e.ray).applyMatrix4(Zp);let a=s/((this.scale.x+this.scale.y+this.scale.z)/3),l=a*a,c=i.index,u=i.attributes.position;if(c!==null){let d=Math.max(0,o.start),f=Math.min(c.count,o.start+o.count);for(let m=d,_=f;m<_;m++){let g=c.getX(m);oc.fromBufferAttribute(u,g),Kp(oc,g,l,r,e,n,this)}}else{let d=Math.max(0,o.start),f=Math.min(u.count,o.start+o.count);for(let m=d,_=f;m<_;m++)oc.fromBufferAttribute(u,m),Kp(oc,m,l,r,e,n,this)}}updateMorphTargets(){let n=this.geometry.morphAttributes,i=Object.keys(n);if(i.length>0){let r=n[i[0]];if(r!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,o=r.length;s<o;s++){let a=r[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=s}}}}};function Kp(t,e,n,i,r,s,o){let a=Bu.distanceSqToPoint(t);if(a<n){let l=new R;Bu.closestPointToPoint(t,l),l.applyMatrix4(i);let c=r.ray.origin.distanceTo(l);if(c<r.near||c>r.far)return;s.push({distance:c,distanceToRay:Math.sqrt(a),point:l,index:e,face:null,faceIndex:null,barycoord:null,object:o})}}var Fo=class extends un{constructor(e,n,i,r,s,o,a,l,c){super(e,n,i,r,s,o,a,l,c),this.isCanvasTexture=!0,this.needsUpdate=!0}},Uo=class extends un{constructor(e,n,i=sr,r,s,o,a=kn,l=kn,c,h=ys,u=1){if(h!==ys&&h!==Fs)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");let d={width:e,height:n,depth:u};super(d,r,s,o,a,l,h,i,c),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new Ss(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){let n=super.toJSON(e);return this.compareFunction!==null&&(n.compareFunction=this.compareFunction),n}},zo=class extends un{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}};var Rs=class t extends St{constructor(e=1,n=1,i=1,r=32,s=1,o=!1,a=0,l=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:e,radiusBottom:n,height:i,radialSegments:r,heightSegments:s,openEnded:o,thetaStart:a,thetaLength:l};let c=this;r=Math.floor(r),s=Math.floor(s);let h=[],u=[],d=[],f=[],m=0,_=[],g=i/2,p=0;x(),o===!1&&(e>0&&y(!0),n>0&&y(!1)),this.setIndex(h),this.setAttribute("position",new ut(u,3)),this.setAttribute("normal",new ut(d,3)),this.setAttribute("uv",new ut(f,2));function x(){let v=new R,M=new R,b=0,A=(n-e)/i;for(let C=0;C<=s;C++){let E=[],w=C/s,I=w*(n-e)+e;for(let N=0;N<=r;N++){let B=N/r,L=B*l+a,D=Math.sin(L),F=Math.cos(L);M.x=I*D,M.y=-w*i+g,M.z=I*F,u.push(M.x,M.y,M.z),v.set(D,A,F).normalize(),d.push(v.x,v.y,v.z),f.push(B,1-w),E.push(m++)}_.push(E)}for(let C=0;C<r;C++)for(let E=0;E<s;E++){let w=_[E][C],I=_[E+1][C],N=_[E+1][C+1],B=_[E][C+1];(e>0||E!==0)&&(h.push(w,I,B),b+=3),(n>0||E!==s-1)&&(h.push(I,N,B),b+=3)}c.addGroup(p,b,0),p+=b}function y(v){let M=m,b=new ne,A=new R,C=0,E=v===!0?e:n,w=v===!0?1:-1;for(let N=1;N<=r;N++)u.push(0,g*w,0),d.push(0,w,0),f.push(.5,.5),m++;let I=m;for(let N=0;N<=r;N++){let L=N/r*l+a,D=Math.cos(L),F=Math.sin(L);A.x=E*F,A.y=g*w,A.z=E*D,u.push(A.x,A.y,A.z),d.push(0,w,0),b.x=D*.5+.5,b.y=F*.5*w+.5,f.push(b.x,b.y),m++}for(let N=0;N<r;N++){let B=M+N,L=I+N;v===!0?h.push(L,L+1,B):h.push(L+1,L,B),C+=3}c.addGroup(p,C,v===!0?1:2),p+=C}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new t(e.radiusTop,e.radiusBottom,e.height,e.radialSegments,e.heightSegments,e.openEnded,e.thetaStart,e.thetaLength)}},ko=class t extends Rs{constructor(e=1,n=1,i=32,r=1,s=!1,o=0,a=Math.PI*2){super(0,e,n,i,r,s,o,a),this.type="ConeGeometry",this.parameters={radius:e,height:n,radialSegments:i,heightSegments:r,openEnded:s,thetaStart:o,thetaLength:a}}static fromJSON(e){return new t(e.radius,e.height,e.radialSegments,e.heightSegments,e.openEnded,e.thetaStart,e.thetaLength)}};var Hn=class{constructor(){this.type="Curve",this.arcLengthDivisions=200,this.needsUpdate=!1,this.cacheArcLengths=null}getPoint(){console.warn("THREE.Curve: .getPoint() not implemented.")}getPointAt(e,n){let i=this.getUtoTmapping(e);return this.getPoint(i,n)}getPoints(e=5){let n=[];for(let i=0;i<=e;i++)n.push(this.getPoint(i/e));return n}getSpacedPoints(e=5){let n=[];for(let i=0;i<=e;i++)n.push(this.getPointAt(i/e));return n}getLength(){let e=this.getLengths();return e[e.length-1]}getLengths(e=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===e+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;let n=[],i,r=this.getPoint(0),s=0;n.push(0);for(let o=1;o<=e;o++)i=this.getPoint(o/e),s+=i.distanceTo(r),n.push(s),r=i;return this.cacheArcLengths=n,n}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(e,n=null){let i=this.getLengths(),r=0,s=i.length,o;n?o=n:o=e*i[s-1];let a=0,l=s-1,c;for(;a<=l;)if(r=Math.floor(a+(l-a)/2),c=i[r]-o,c<0)a=r+1;else if(c>0)l=r-1;else{l=r;break}if(r=l,i[r]===o)return r/(s-1);let h=i[r],d=i[r+1]-h,f=(o-h)/d;return(r+f)/(s-1)}getTangent(e,n){let r=e-1e-4,s=e+1e-4;r<0&&(r=0),s>1&&(s=1);let o=this.getPoint(r),a=this.getPoint(s),l=n||(o.isVector2?new ne:new R);return l.copy(a).sub(o).normalize(),l}getTangentAt(e,n){let i=this.getUtoTmapping(e);return this.getTangent(i,n)}computeFrenetFrames(e,n=!1){let i=new R,r=[],s=[],o=[],a=new R,l=new Xe;for(let f=0;f<=e;f++){let m=f/e;r[f]=this.getTangentAt(m,new R)}s[0]=new R,o[0]=new R;let c=Number.MAX_VALUE,h=Math.abs(r[0].x),u=Math.abs(r[0].y),d=Math.abs(r[0].z);h<=c&&(c=h,i.set(1,0,0)),u<=c&&(c=u,i.set(0,1,0)),d<=c&&i.set(0,0,1),a.crossVectors(r[0],i).normalize(),s[0].crossVectors(r[0],a),o[0].crossVectors(r[0],s[0]);for(let f=1;f<=e;f++){if(s[f]=s[f-1].clone(),o[f]=o[f-1].clone(),a.crossVectors(r[f-1],r[f]),a.length()>Number.EPSILON){a.normalize();let m=Math.acos(nt(r[f-1].dot(r[f]),-1,1));s[f].applyMatrix4(l.makeRotationAxis(a,m))}o[f].crossVectors(r[f],s[f])}if(n===!0){let f=Math.acos(nt(s[0].dot(s[e]),-1,1));f/=e,r[0].dot(a.crossVectors(s[0],s[e]))>0&&(f=-f);for(let m=1;m<=e;m++)s[m].applyMatrix4(l.makeRotationAxis(r[m],f*m)),o[m].crossVectors(r[m],s[m])}return{tangents:r,normals:s,binormals:o}}clone(){return new this.constructor().copy(this)}copy(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}toJSON(){let e={metadata:{version:4.7,type:"Curve",generator:"Curve.toJSON"}};return e.arcLengthDivisions=this.arcLengthDivisions,e.type=this.type,e}fromJSON(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}},mi=class extends Hn{constructor(e=0,n=0,i=1,r=1,s=0,o=Math.PI*2,a=!1,l=0){super(),this.isEllipseCurve=!0,this.type="EllipseCurve",this.aX=e,this.aY=n,this.xRadius=i,this.yRadius=r,this.aStartAngle=s,this.aEndAngle=o,this.aClockwise=a,this.aRotation=l}getPoint(e,n=new ne){let i=n,r=Math.PI*2,s=this.aEndAngle-this.aStartAngle,o=Math.abs(s)<Number.EPSILON;for(;s<0;)s+=r;for(;s>r;)s-=r;s<Number.EPSILON&&(o?s=0:s=r),this.aClockwise===!0&&!o&&(s===r?s=-r:s=s-r);let a=this.aStartAngle+e*s,l=this.aX+this.xRadius*Math.cos(a),c=this.aY+this.yRadius*Math.sin(a);if(this.aRotation!==0){let h=Math.cos(this.aRotation),u=Math.sin(this.aRotation),d=l-this.aX,f=c-this.aY;l=d*h-f*u+this.aX,c=d*u+f*h+this.aY}return i.set(l,c)}copy(e){return super.copy(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}toJSON(){let e=super.toJSON();return e.aX=this.aX,e.aY=this.aY,e.xRadius=this.xRadius,e.yRadius=this.yRadius,e.aStartAngle=this.aStartAngle,e.aEndAngle=this.aEndAngle,e.aClockwise=this.aClockwise,e.aRotation=this.aRotation,e}fromJSON(e){return super.fromJSON(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}},Tc=class extends mi{constructor(e,n,i,r,s,o){super(e,n,i,i,r,s,o),this.isArcCurve=!0,this.type="ArcCurve"}};function hf(){let t=0,e=0,n=0,i=0;function r(s,o,a,l){t=s,e=a,n=-3*s+3*o-2*a-l,i=2*s-2*o+a+l}return{initCatmullRom:function(s,o,a,l,c){r(o,a,c*(a-s),c*(l-o))},initNonuniformCatmullRom:function(s,o,a,l,c,h,u){let d=(o-s)/c-(a-s)/(c+h)+(a-o)/h,f=(a-o)/h-(l-o)/(h+u)+(l-a)/u;d*=h,f*=h,r(o,a,d,f)},calc:function(s){let o=s*s,a=o*s;return t+e*s+n*o+i*a}}}var ac=new R,Iu=new hf,Du=new hf,Lu=new hf,Ac=class extends Hn{constructor(e=[],n=!1,i="centripetal",r=.5){super(),this.isCatmullRomCurve3=!0,this.type="CatmullRomCurve3",this.points=e,this.closed=n,this.curveType=i,this.tension=r}getPoint(e,n=new R){let i=n,r=this.points,s=r.length,o=(s-(this.closed?0:1))*e,a=Math.floor(o),l=o-a;this.closed?a+=a>0?0:(Math.floor(Math.abs(a)/s)+1)*s:l===0&&a===s-1&&(a=s-2,l=1);let c,h;this.closed||a>0?c=r[(a-1)%s]:(ac.subVectors(r[0],r[1]).add(r[0]),c=ac);let u=r[a%s],d=r[(a+1)%s];if(this.closed||a+2<s?h=r[(a+2)%s]:(ac.subVectors(r[s-1],r[s-2]).add(r[s-1]),h=ac),this.curveType==="centripetal"||this.curveType==="chordal"){let f=this.curveType==="chordal"?.5:.25,m=Math.pow(c.distanceToSquared(u),f),_=Math.pow(u.distanceToSquared(d),f),g=Math.pow(d.distanceToSquared(h),f);_<1e-4&&(_=1),m<1e-4&&(m=_),g<1e-4&&(g=_),Iu.initNonuniformCatmullRom(c.x,u.x,d.x,h.x,m,_,g),Du.initNonuniformCatmullRom(c.y,u.y,d.y,h.y,m,_,g),Lu.initNonuniformCatmullRom(c.z,u.z,d.z,h.z,m,_,g)}else this.curveType==="catmullrom"&&(Iu.initCatmullRom(c.x,u.x,d.x,h.x,this.tension),Du.initCatmullRom(c.y,u.y,d.y,h.y,this.tension),Lu.initCatmullRom(c.z,u.z,d.z,h.z,this.tension));return i.set(Iu.calc(l),Du.calc(l),Lu.calc(l)),i}copy(e){super.copy(e),this.points=[];for(let n=0,i=e.points.length;n<i;n++){let r=e.points[n];this.points.push(r.clone())}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}toJSON(){let e=super.toJSON();e.points=[];for(let n=0,i=this.points.length;n<i;n++){let r=this.points[n];e.points.push(r.toArray())}return e.closed=this.closed,e.curveType=this.curveType,e.tension=this.tension,e}fromJSON(e){super.fromJSON(e),this.points=[];for(let n=0,i=e.points.length;n<i;n++){let r=e.points[n];this.points.push(new R().fromArray(r))}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}};function Jp(t,e,n,i,r){let s=(i-e)*.5,o=(r-n)*.5,a=t*t,l=t*a;return(2*n-2*i+s+o)*l+(-3*n+3*i-2*s-o)*a+s*t+n}function sb(t,e){let n=1-t;return n*n*e}function ob(t,e){return 2*(1-t)*t*e}function ab(t,e){return t*t*e}function Mo(t,e,n,i){return sb(t,e)+ob(t,n)+ab(t,i)}function cb(t,e){let n=1-t;return n*n*n*e}function lb(t,e){let n=1-t;return 3*n*n*t*e}function hb(t,e){return 3*(1-t)*t*t*e}function ub(t,e){return t*t*t*e}function So(t,e,n,i,r){return cb(t,e)+lb(t,n)+hb(t,i)+ub(t,r)}var Cc=class extends Hn{constructor(e=new ne,n=new ne,i=new ne,r=new ne){super(),this.isCubicBezierCurve=!0,this.type="CubicBezierCurve",this.v0=e,this.v1=n,this.v2=i,this.v3=r}getPoint(e,n=new ne){let i=n,r=this.v0,s=this.v1,o=this.v2,a=this.v3;return i.set(So(e,r.x,s.x,o.x,a.x),So(e,r.y,s.y,o.y,a.y)),i}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}},Ps=class extends Hn{constructor(e=new R,n=new R,i=new R,r=new R){super(),this.isCubicBezierCurve3=!0,this.type="CubicBezierCurve3",this.v0=e,this.v1=n,this.v2=i,this.v3=r}getPoint(e,n=new R){let i=n,r=this.v0,s=this.v1,o=this.v2,a=this.v3;return i.set(So(e,r.x,s.x,o.x,a.x),So(e,r.y,s.y,o.y,a.y),So(e,r.z,s.z,o.z,a.z)),i}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}},Rc=class extends Hn{constructor(e=new ne,n=new ne){super(),this.isLineCurve=!0,this.type="LineCurve",this.v1=e,this.v2=n}getPoint(e,n=new ne){let i=n;return e===1?i.copy(this.v2):(i.copy(this.v2).sub(this.v1),i.multiplyScalar(e).add(this.v1)),i}getPointAt(e,n){return this.getPoint(e,n)}getTangent(e,n=new ne){return n.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,n){return this.getTangent(e,n)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},Pc=class extends Hn{constructor(e=new R,n=new R){super(),this.isLineCurve3=!0,this.type="LineCurve3",this.v1=e,this.v2=n}getPoint(e,n=new R){let i=n;return e===1?i.copy(this.v2):(i.copy(this.v2).sub(this.v1),i.multiplyScalar(e).add(this.v1)),i}getPointAt(e,n){return this.getPoint(e,n)}getTangent(e,n=new R){return n.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,n){return this.getTangent(e,n)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},Ic=class extends Hn{constructor(e=new ne,n=new ne,i=new ne){super(),this.isQuadraticBezierCurve=!0,this.type="QuadraticBezierCurve",this.v0=e,this.v1=n,this.v2=i}getPoint(e,n=new ne){let i=n,r=this.v0,s=this.v1,o=this.v2;return i.set(Mo(e,r.x,s.x,o.x),Mo(e,r.y,s.y,o.y)),i}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},Ir=class extends Hn{constructor(e=new R,n=new R,i=new R){super(),this.isQuadraticBezierCurve3=!0,this.type="QuadraticBezierCurve3",this.v0=e,this.v1=n,this.v2=i}getPoint(e,n=new R){let i=n,r=this.v0,s=this.v1,o=this.v2;return i.set(Mo(e,r.x,s.x,o.x),Mo(e,r.y,s.y,o.y),Mo(e,r.z,s.z,o.z)),i}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},Dc=class extends Hn{constructor(e=[]){super(),this.isSplineCurve=!0,this.type="SplineCurve",this.points=e}getPoint(e,n=new ne){let i=n,r=this.points,s=(r.length-1)*e,o=Math.floor(s),a=s-o,l=r[o===0?o:o-1],c=r[o],h=r[o>r.length-2?r.length-1:o+1],u=r[o>r.length-3?r.length-1:o+2];return i.set(Jp(a,l.x,c.x,h.x,u.x),Jp(a,l.y,c.y,h.y,u.y)),i}copy(e){super.copy(e),this.points=[];for(let n=0,i=e.points.length;n<i;n++){let r=e.points[n];this.points.push(r.clone())}return this}toJSON(){let e=super.toJSON();e.points=[];for(let n=0,i=this.points.length;n<i;n++){let r=this.points[n];e.points.push(r.toArray())}return e}fromJSON(e){super.fromJSON(e),this.points=[];for(let n=0,i=e.points.length;n<i;n++){let r=e.points[n];this.points.push(new ne().fromArray(r))}return this}},fb=Object.freeze({__proto__:null,ArcCurve:Tc,CatmullRomCurve3:Ac,CubicBezierCurve:Cc,CubicBezierCurve3:Ps,EllipseCurve:mi,LineCurve:Rc,LineCurve3:Pc,QuadraticBezierCurve:Ic,QuadraticBezierCurve3:Ir,SplineCurve:Dc});var Bo=class t extends St{constructor(e=1,n=1,i=1,r=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:n,widthSegments:i,heightSegments:r};let s=e/2,o=n/2,a=Math.floor(i),l=Math.floor(r),c=a+1,h=l+1,u=e/a,d=n/l,f=[],m=[],_=[],g=[];for(let p=0;p<h;p++){let x=p*d-o;for(let y=0;y<c;y++){let v=y*u-s;m.push(v,-x,0),_.push(0,0,1),g.push(y/a),g.push(1-p/l)}}for(let p=0;p<l;p++)for(let x=0;x<a;x++){let y=x+c*p,v=x+c*(p+1),M=x+1+c*(p+1),b=x+1+c*p;f.push(y,v,b),f.push(v,M,b)}this.setIndex(f),this.setAttribute("position",new ut(m,3)),this.setAttribute("normal",new ut(_,3)),this.setAttribute("uv",new ut(g,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new t(e.width,e.height,e.widthSegments,e.heightSegments)}};var Fi=class t extends St{constructor(e=1,n=32,i=16,r=0,s=Math.PI*2,o=0,a=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:e,widthSegments:n,heightSegments:i,phiStart:r,phiLength:s,thetaStart:o,thetaLength:a},n=Math.max(3,Math.floor(n)),i=Math.max(2,Math.floor(i));let l=Math.min(o+a,Math.PI),c=0,h=[],u=new R,d=new R,f=[],m=[],_=[],g=[];for(let p=0;p<=i;p++){let x=[],y=p/i,v=0;p===0&&o===0?v=.5/n:p===i&&l===Math.PI&&(v=-.5/n);for(let M=0;M<=n;M++){let b=M/n;u.x=-e*Math.cos(r+b*s)*Math.sin(o+y*a),u.y=e*Math.cos(o+y*a),u.z=e*Math.sin(r+b*s)*Math.sin(o+y*a),m.push(u.x,u.y,u.z),d.copy(u).normalize(),_.push(d.x,d.y,d.z),g.push(b+v,1-y),x.push(c++)}h.push(x)}for(let p=0;p<i;p++)for(let x=0;x<n;x++){let y=h[p][x+1],v=h[p][x],M=h[p+1][x],b=h[p+1][x+1];(p!==0||o>0)&&f.push(y,v,b),(p!==i-1||l<Math.PI)&&f.push(v,M,b)}this.setIndex(f),this.setAttribute("position",new ut(m,3)),this.setAttribute("normal",new ut(_,3)),this.setAttribute("uv",new ut(g,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new t(e.radius,e.widthSegments,e.heightSegments,e.phiStart,e.phiLength,e.thetaStart,e.thetaLength)}};var Vo=class t extends St{constructor(e=1,n=.4,i=12,r=48,s=Math.PI*2){super(),this.type="TorusGeometry",this.parameters={radius:e,tube:n,radialSegments:i,tubularSegments:r,arc:s},i=Math.floor(i),r=Math.floor(r);let o=[],a=[],l=[],c=[],h=new R,u=new R,d=new R;for(let f=0;f<=i;f++)for(let m=0;m<=r;m++){let _=m/r*s,g=f/i*Math.PI*2;u.x=(e+n*Math.cos(g))*Math.cos(_),u.y=(e+n*Math.cos(g))*Math.sin(_),u.z=n*Math.sin(g),a.push(u.x,u.y,u.z),h.x=e*Math.cos(_),h.y=e*Math.sin(_),d.subVectors(u,h).normalize(),l.push(d.x,d.y,d.z),c.push(m/r),c.push(f/i)}for(let f=1;f<=i;f++)for(let m=1;m<=r;m++){let _=(r+1)*f+m-1,g=(r+1)*(f-1)+m-1,p=(r+1)*(f-1)+m,x=(r+1)*f+m;o.push(_,g,x),o.push(g,p,x)}this.setIndex(o),this.setAttribute("position",new ut(a,3)),this.setAttribute("normal",new ut(l,3)),this.setAttribute("uv",new ut(c,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new t(e.radius,e.tube,e.radialSegments,e.tubularSegments,e.arc)}};var Ho=class t extends St{constructor(e=new Ir(new R(-1,-1,0),new R(-1,1,0),new R(1,1,0)),n=64,i=1,r=8,s=!1){super(),this.type="TubeGeometry",this.parameters={path:e,tubularSegments:n,radius:i,radialSegments:r,closed:s};let o=e.computeFrenetFrames(n,s);this.tangents=o.tangents,this.normals=o.normals,this.binormals=o.binormals;let a=new R,l=new R,c=new ne,h=new R,u=[],d=[],f=[],m=[];_(),this.setIndex(m),this.setAttribute("position",new ut(u,3)),this.setAttribute("normal",new ut(d,3)),this.setAttribute("uv",new ut(f,2));function _(){for(let y=0;y<n;y++)g(y);g(s===!1?n:0),x(),p()}function g(y){h=e.getPointAt(y/n,h);let v=o.normals[y],M=o.binormals[y];for(let b=0;b<=r;b++){let A=b/r*Math.PI*2,C=Math.sin(A),E=-Math.cos(A);l.x=E*v.x+C*M.x,l.y=E*v.y+C*M.y,l.z=E*v.z+C*M.z,l.normalize(),d.push(l.x,l.y,l.z),a.x=h.x+i*l.x,a.y=h.y+i*l.y,a.z=h.z+i*l.z,u.push(a.x,a.y,a.z)}}function p(){for(let y=1;y<=n;y++)for(let v=1;v<=r;v++){let M=(r+1)*(y-1)+(v-1),b=(r+1)*y+(v-1),A=(r+1)*y+v,C=(r+1)*(y-1)+v;m.push(M,b,C),m.push(b,A,C)}}function x(){for(let y=0;y<=n;y++)for(let v=0;v<=r;v++)c.x=y/n,c.y=v/r,f.push(c.x,c.y)}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}toJSON(){let e=super.toJSON();return e.path=this.parameters.path.toJSON(),e}static fromJSON(e){return new t(new fb[e.path.type]().fromJSON(e.path),e.tubularSegments,e.radius,e.radialSegments,e.closed)}};var Go=class extends Bt{constructor(e){super(e),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}},Wo=class extends Vn{constructor(e){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new Oe(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Oe(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Wl,this.normalScale=new ne(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Bn,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:""},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.envMapIntensity=e.envMapIntensity,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}};var jo=class extends Vn{constructor(e){super(),this.isMeshLambertMaterial=!0,this.type="MeshLambertMaterial",this.color=new Oe(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Oe(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Wl,this.normalScale=new ne(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Bn,this.combine=Qc,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}},Lc=class extends Vn{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=Cm,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}},Oc=class extends Vn{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}};function cc(t,e){return!t||t.constructor===e?t:typeof e.BYTES_PER_ELEMENT=="number"?new e(t):Array.prototype.slice.call(t)}function db(t){return ArrayBuffer.isView(t)&&!(t instanceof DataView)}var Dr=class{constructor(e,n,i,r){this.parameterPositions=e,this._cachedIndex=0,this.resultBuffer=r!==void 0?r:new n.constructor(i),this.sampleValues=n,this.valueSize=i,this.settings=null,this.DefaultSettings_={}}evaluate(e){let n=this.parameterPositions,i=this._cachedIndex,r=n[i],s=n[i-1];e:{t:{let o;n:{i:if(!(e<r)){for(let a=i+2;;){if(r===void 0){if(e<s)break i;return i=n.length,this._cachedIndex=i,this.copySampleValue_(i-1)}if(i===a)break;if(s=r,r=n[++i],e<r)break t}o=n.length;break n}if(!(e>=s)){let a=n[1];e<a&&(i=2,s=a);for(let l=i-2;;){if(s===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(i===l)break;if(r=s,s=n[--i-1],e>=s)break t}o=i,i=0;break n}break e}for(;i<o;){let a=i+o>>>1;e<n[a]?o=a:i=a+1}if(r=n[i],s=n[i-1],s===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(r===void 0)return i=n.length,this._cachedIndex=i,this.copySampleValue_(i-1)}this._cachedIndex=i,this.intervalChanged_(i,s,r)}return this.interpolate_(i,s,e,r)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(e){let n=this.resultBuffer,i=this.sampleValues,r=this.valueSize,s=e*r;for(let o=0;o!==r;++o)n[o]=i[s+o];return n}interpolate_(){throw new Error("call to abstract method")}intervalChanged_(){}},Nc=class extends Dr{constructor(e,n,i,r){super(e,n,i,r),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:Fu,endingEnd:Fu}}intervalChanged_(e,n,i){let r=this.parameterPositions,s=e-2,o=e+1,a=r[s],l=r[o];if(a===void 0)switch(this.getSettings_().endingStart){case Uu:s=e,a=2*n-i;break;case zu:s=r.length-2,a=n+r[s]-r[s+1];break;default:s=e,a=i}if(l===void 0)switch(this.getSettings_().endingEnd){case Uu:o=e,l=2*i-n;break;case zu:o=1,l=i+r[1]-r[0];break;default:o=e-1,l=n}let c=(i-n)*.5,h=this.valueSize;this._weightPrev=c/(n-a),this._weightNext=c/(l-i),this._offsetPrev=s*h,this._offsetNext=o*h}interpolate_(e,n,i,r){let s=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=e*a,c=l-a,h=this._offsetPrev,u=this._offsetNext,d=this._weightPrev,f=this._weightNext,m=(i-n)/(r-n),_=m*m,g=_*m,p=-d*g+2*d*_-d*m,x=(1+d)*g+(-1.5-2*d)*_+(-.5+d)*m+1,y=(-1-f)*g+(1.5+f)*_+.5*m,v=f*g-f*_;for(let M=0;M!==a;++M)s[M]=p*o[h+M]+x*o[c+M]+y*o[l+M]+v*o[u+M];return s}},Fc=class extends Dr{constructor(e,n,i,r){super(e,n,i,r)}interpolate_(e,n,i,r){let s=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=e*a,c=l-a,h=(i-n)/(r-n),u=1-h;for(let d=0;d!==a;++d)s[d]=o[c+d]*u+o[l+d]*h;return s}},Uc=class extends Dr{constructor(e,n,i,r){super(e,n,i,r)}interpolate_(e){return this.copySampleValue_(e-1)}},Rn=class{constructor(e,n,i,r){if(e===void 0)throw new Error("THREE.KeyframeTrack: track name is undefined");if(n===void 0||n.length===0)throw new Error("THREE.KeyframeTrack: no keyframes in track named "+e);this.name=e,this.times=cc(n,this.TimeBufferType),this.values=cc(i,this.ValueBufferType),this.setInterpolation(r||this.DefaultInterpolation)}static toJSON(e){let n=e.constructor,i;if(n.toJSON!==this.toJSON)i=n.toJSON(e);else{i={name:e.name,times:cc(e.times,Array),values:cc(e.values,Array)};let r=e.getInterpolation();r!==e.DefaultInterpolation&&(i.interpolation=r)}return i.type=e.ValueTypeName,i}InterpolantFactoryMethodDiscrete(e){return new Uc(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodLinear(e){return new Fc(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodSmooth(e){return new Nc(this.times,this.values,this.getValueSize(),e)}setInterpolation(e){let n;switch(e){case wo:n=this.InterpolantFactoryMethodDiscrete;break;case mc:n=this.InterpolantFactoryMethodLinear;break;case lc:n=this.InterpolantFactoryMethodSmooth;break}if(n===void 0){let i="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(e!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw new Error(i);return console.warn("THREE.KeyframeTrack:",i),this}return this.createInterpolant=n,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return wo;case this.InterpolantFactoryMethodLinear:return mc;case this.InterpolantFactoryMethodSmooth:return lc}}getValueSize(){return this.values.length/this.times.length}shift(e){if(e!==0){let n=this.times;for(let i=0,r=n.length;i!==r;++i)n[i]+=e}return this}scale(e){if(e!==1){let n=this.times;for(let i=0,r=n.length;i!==r;++i)n[i]*=e}return this}trim(e,n){let i=this.times,r=i.length,s=0,o=r-1;for(;s!==r&&i[s]<e;)++s;for(;o!==-1&&i[o]>n;)--o;if(++o,s!==0||o!==r){s>=o&&(o=Math.max(o,1),s=o-1);let a=this.getValueSize();this.times=i.slice(s,o),this.values=this.values.slice(s*a,o*a)}return this}validate(){let e=!0,n=this.getValueSize();n-Math.floor(n)!==0&&(console.error("THREE.KeyframeTrack: Invalid value size in track.",this),e=!1);let i=this.times,r=this.values,s=i.length;s===0&&(console.error("THREE.KeyframeTrack: Track is empty.",this),e=!1);let o=null;for(let a=0;a!==s;a++){let l=i[a];if(typeof l=="number"&&isNaN(l)){console.error("THREE.KeyframeTrack: Time is not a valid number.",this,a,l),e=!1;break}if(o!==null&&o>l){console.error("THREE.KeyframeTrack: Out of order keys.",this,a,l,o),e=!1;break}o=l}if(r!==void 0&&db(r))for(let a=0,l=r.length;a!==l;++a){let c=r[a];if(isNaN(c)){console.error("THREE.KeyframeTrack: Value is not a valid number.",this,a,c),e=!1;break}}return e}optimize(){let e=this.times.slice(),n=this.values.slice(),i=this.getValueSize(),r=this.getInterpolation()===lc,s=e.length-1,o=1;for(let a=1;a<s;++a){let l=!1,c=e[a],h=e[a+1];if(c!==h&&(a!==1||c!==e[0]))if(r)l=!0;else{let u=a*i,d=u-i,f=u+i;for(let m=0;m!==i;++m){let _=n[u+m];if(_!==n[d+m]||_!==n[f+m]){l=!0;break}}}if(l){if(a!==o){e[o]=e[a];let u=a*i,d=o*i;for(let f=0;f!==i;++f)n[d+f]=n[u+f]}++o}}if(s>0){e[o]=e[s];for(let a=s*i,l=o*i,c=0;c!==i;++c)n[l+c]=n[a+c];++o}return o!==e.length?(this.times=e.slice(0,o),this.values=n.slice(0,o*i)):(this.times=e,this.values=n),this}clone(){let e=this.times.slice(),n=this.values.slice(),i=this.constructor,r=new i(this.name,e,n);return r.createInterpolant=this.createInterpolant,r}};Rn.prototype.ValueTypeName="";Rn.prototype.TimeBufferType=Float32Array;Rn.prototype.ValueBufferType=Float32Array;Rn.prototype.DefaultInterpolation=mc;var tr=class extends Rn{constructor(e,n,i){super(e,n,i)}};tr.prototype.ValueTypeName="bool";tr.prototype.ValueBufferType=Array;tr.prototype.DefaultInterpolation=wo;tr.prototype.InterpolantFactoryMethodLinear=void 0;tr.prototype.InterpolantFactoryMethodSmooth=void 0;var zc=class extends Rn{constructor(e,n,i,r){super(e,n,i,r)}};zc.prototype.ValueTypeName="color";var kc=class extends Rn{constructor(e,n,i,r){super(e,n,i,r)}};kc.prototype.ValueTypeName="number";var Bc=class extends Dr{constructor(e,n,i,r){super(e,n,i,r)}interpolate_(e,n,i,r){let s=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=(i-n)/(r-n),c=e*a;for(let h=c+a;c!==h;c+=4)Ht.slerpFlat(s,0,o,c-a,o,c,l);return s}},qo=class extends Rn{constructor(e,n,i,r){super(e,n,i,r)}InterpolantFactoryMethodLinear(e){return new Bc(this.times,this.values,this.getValueSize(),e)}};qo.prototype.ValueTypeName="quaternion";qo.prototype.InterpolantFactoryMethodSmooth=void 0;var nr=class extends Rn{constructor(e,n,i){super(e,n,i)}};nr.prototype.ValueTypeName="string";nr.prototype.ValueBufferType=Array;nr.prototype.DefaultInterpolation=wo;nr.prototype.InterpolantFactoryMethodLinear=void 0;nr.prototype.InterpolantFactoryMethodSmooth=void 0;var Vc=class extends Rn{constructor(e,n,i,r){super(e,n,i,r)}};Vc.prototype.ValueTypeName="vector";var hc={enabled:!1,files:{},add:function(t,e){this.enabled!==!1&&(this.files[t]=e)},get:function(t){if(this.enabled!==!1)return this.files[t]},remove:function(t){delete this.files[t]},clear:function(){this.files={}}},Hc=class{constructor(e,n,i){let r=this,s=!1,o=0,a=0,l,c=[];this.onStart=void 0,this.onLoad=e,this.onProgress=n,this.onError=i,this.abortController=new AbortController,this.itemStart=function(h){a++,s===!1&&r.onStart!==void 0&&r.onStart(h,o,a),s=!0},this.itemEnd=function(h){o++,r.onProgress!==void 0&&r.onProgress(h,o,a),o===a&&(s=!1,r.onLoad!==void 0&&r.onLoad())},this.itemError=function(h){r.onError!==void 0&&r.onError(h)},this.resolveURL=function(h){return l?l(h):h},this.setURLModifier=function(h){return l=h,this},this.addHandler=function(h,u){return c.push(h,u),this},this.removeHandler=function(h){let u=c.indexOf(h);return u!==-1&&c.splice(u,2),this},this.getHandler=function(h){for(let u=0,d=c.length;u<d;u+=2){let f=c[u],m=c[u+1];if(f.global&&(f.lastIndex=0),f.test(h))return m}return null},this.abort=function(){return this.abortController.abort(),this.abortController=new AbortController,this}}},Hm=new Hc,Is=class{constructor(e){this.manager=e!==void 0?e:Hm,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={}}load(){}loadAsync(e,n){let i=this;return new Promise(function(r,s){i.load(e,r,n,s)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}abort(){return this}};Is.DEFAULT_MATERIAL_NAME="__DEFAULT";var _s=new WeakMap,Gc=class extends Is{constructor(e){super(e)}load(e,n,i,r){this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);let s=this,o=hc.get(`image:${e}`);if(o!==void 0){if(o.complete===!0)s.manager.itemStart(e),setTimeout(function(){n&&n(o),s.manager.itemEnd(e)},0);else{let u=_s.get(o);u===void 0&&(u=[],_s.set(o,u)),u.push({onLoad:n,onError:r})}return o}let a=bs("img");function l(){h(),n&&n(this);let u=_s.get(this)||[];for(let d=0;d<u.length;d++){let f=u[d];f.onLoad&&f.onLoad(this)}_s.delete(this),s.manager.itemEnd(e)}function c(u){h(),r&&r(u),hc.remove(`image:${e}`);let d=_s.get(this)||[];for(let f=0;f<d.length;f++){let m=d[f];m.onError&&m.onError(u)}_s.delete(this),s.manager.itemError(e),s.manager.itemEnd(e)}function h(){a.removeEventListener("load",l,!1),a.removeEventListener("error",c,!1)}return a.addEventListener("load",l,!1),a.addEventListener("error",c,!1),e.slice(0,5)!=="data:"&&this.crossOrigin!==void 0&&(a.crossOrigin=this.crossOrigin),hc.add(`image:${e}`,a),s.manager.itemStart(e),a.src=e,a}};var Xo=class extends Is{constructor(e){super(e)}load(e,n,i,r){let s=new un,o=new Gc(this.manager);return o.setCrossOrigin(this.crossOrigin),o.setPath(this.path),o.load(e,function(a){s.image=a,s.needsUpdate=!0,n!==void 0&&n(s)},i,r),s}},Ds=class extends $t{constructor(e,n=1){super(),this.isLight=!0,this.type="Light",this.color=new Oe(e),this.intensity=n}dispose(){}copy(e,n){return super.copy(e,n),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){let n=super.toJSON(e);return n.object.color=this.color.getHex(),n.object.intensity=this.intensity,this.groundColor!==void 0&&(n.object.groundColor=this.groundColor.getHex()),this.distance!==void 0&&(n.object.distance=this.distance),this.angle!==void 0&&(n.object.angle=this.angle),this.decay!==void 0&&(n.object.decay=this.decay),this.penumbra!==void 0&&(n.object.penumbra=this.penumbra),this.shadow!==void 0&&(n.object.shadow=this.shadow.toJSON()),this.target!==void 0&&(n.object.target=this.target.uuid),n}};var Ou=new Xe,Qp=new R,em=new R,Wc=class{constructor(e){this.camera=e,this.intensity=1,this.bias=0,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new ne(512,512),this.mapType=ri,this.map=null,this.mapPass=null,this.matrix=new Xe,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new As,this._frameExtents=new ne(1,1),this._viewportCount=1,this._viewports=[new mt(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(e){let n=this.camera,i=this.matrix;Qp.setFromMatrixPosition(e.matrixWorld),n.position.copy(Qp),em.setFromMatrixPosition(e.target.matrixWorld),n.lookAt(em),n.updateMatrixWorld(),Ou.multiplyMatrices(n.projectionMatrix,n.matrixWorldInverse),this._frustum.setFromProjectionMatrix(Ou,n.coordinateSystem,n.reversedDepth),n.reversedDepth?i.set(.5,0,0,.5,0,.5,0,.5,0,0,1,0,0,0,0,1):i.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),i.multiply(Ou)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.intensity=e.intensity,this.bias=e.bias,this.radius=e.radius,this.autoUpdate=e.autoUpdate,this.needsUpdate=e.needsUpdate,this.normalBias=e.normalBias,this.blurSamples=e.blurSamples,this.mapSize.copy(e.mapSize),this}clone(){return new this.constructor().copy(this)}toJSON(){let e={};return this.intensity!==1&&(e.intensity=this.intensity),this.bias!==0&&(e.bias=this.bias),this.normalBias!==0&&(e.normalBias=this.normalBias),this.radius!==1&&(e.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(e.mapSize=this.mapSize.toArray()),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}};var tm=new Xe,yo=new R,Nu=new R,Vu=class extends Wc{constructor(){super(new Kt(90,1,.5,500)),this.isPointLightShadow=!0,this._frameExtents=new ne(4,2),this._viewportCount=6,this._viewports=[new mt(2,1,1,1),new mt(0,1,1,1),new mt(3,1,1,1),new mt(1,1,1,1),new mt(3,0,1,1),new mt(1,0,1,1)],this._cubeDirections=[new R(1,0,0),new R(-1,0,0),new R(0,0,1),new R(0,0,-1),new R(0,1,0),new R(0,-1,0)],this._cubeUps=[new R(0,1,0),new R(0,1,0),new R(0,1,0),new R(0,1,0),new R(0,0,1),new R(0,0,-1)]}updateMatrices(e,n=0){let i=this.camera,r=this.matrix,s=e.distance||i.far;s!==i.far&&(i.far=s,i.updateProjectionMatrix()),yo.setFromMatrixPosition(e.matrixWorld),i.position.copy(yo),Nu.copy(i.position),Nu.add(this._cubeDirections[n]),i.up.copy(this._cubeUps[n]),i.lookAt(Nu),i.updateMatrixWorld(),r.makeTranslation(-yo.x,-yo.y,-yo.z),tm.multiplyMatrices(i.projectionMatrix,i.matrixWorldInverse),this._frustum.setFromProjectionMatrix(tm,i.coordinateSystem,i.reversedDepth)}},$o=class extends Ds{constructor(e,n,i=0,r=2){super(e,n),this.isPointLight=!0,this.type="PointLight",this.distance=i,this.decay=r,this.shadow=new Vu}get power(){return this.intensity*4*Math.PI}set power(e){this.intensity=e/(4*Math.PI)}dispose(){this.shadow.dispose()}copy(e,n){return super.copy(e,n),this.distance=e.distance,this.decay=e.decay,this.shadow=e.shadow.clone(),this}},Lr=class extends Po{constructor(e=-1,n=1,i=1,r=-1,s=.1,o=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=n,this.top=i,this.bottom=r,this.near=s,this.far=o,this.updateProjectionMatrix()}copy(e,n){return super.copy(e,n),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,n,i,r,s,o){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=n,this.view.offsetX=i,this.view.offsetY=r,this.view.width=s,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=(this.right-this.left)/(2*this.zoom),n=(this.top-this.bottom)/(2*this.zoom),i=(this.right+this.left)/2,r=(this.top+this.bottom)/2,s=i-e,o=i+e,a=r+n,l=r-n;if(this.view!==null&&this.view.enabled){let c=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;s+=c*this.view.offsetX,o=s+c*this.view.width,a-=h*this.view.offsetY,l=a-h*this.view.height}this.projectionMatrix.makeOrthographic(s,o,a,l,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let n=super.toJSON(e);return n.object.zoom=this.zoom,n.object.left=this.left,n.object.right=this.right,n.object.top=this.top,n.object.bottom=this.bottom,n.object.near=this.near,n.object.far=this.far,this.view!==null&&(n.object.view=Object.assign({},this.view)),n}},Hu=class extends Wc{constructor(){super(new Lr(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}},Yo=class extends Ds{constructor(e,n){super(e,n),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy($t.DEFAULT_UP),this.updateMatrix(),this.target=new $t,this.shadow=new Hu}dispose(){this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}},Or=class extends Ds{constructor(e,n){super(e,n),this.isAmbientLight=!0,this.type="AmbientLight"}};var jc=class extends Kt{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e}},Zo=class{constructor(e=!0){this.autoStart=e,this.startTime=0,this.oldTime=0,this.elapsedTime=0,this.running=!1}start(){this.startTime=performance.now(),this.oldTime=this.startTime,this.elapsedTime=0,this.running=!0}stop(){this.getElapsedTime(),this.running=!1,this.autoStart=!1}getElapsedTime(){return this.getDelta(),this.elapsedTime}getDelta(){let e=0;if(this.autoStart&&!this.running)return this.start(),0;if(this.running){let n=performance.now();e=(n-this.oldTime)/1e3,this.oldTime=n,this.elapsedTime+=e}return e}};var uf="\\[\\]\\.:\\/",pb=new RegExp("["+uf+"]","g"),ff="[^"+uf+"]",mb="[^"+uf.replace("\\.","")+"]",gb=/((?:WC+[\/:])*)/.source.replace("WC",ff),_b=/(WCOD+)?/.source.replace("WCOD",mb),vb=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",ff),yb=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",ff),xb=new RegExp("^"+gb+_b+vb+yb+"$"),bb=["material","materials","bones","map"],Gu=class{constructor(e,n,i){let r=i||Rt.parseTrackName(n);this._targetGroup=e,this._bindings=e.subscribe_(n,r)}getValue(e,n){this.bind();let i=this._targetGroup.nCachedObjects_,r=this._bindings[i];r!==void 0&&r.getValue(e,n)}setValue(e,n){let i=this._bindings;for(let r=this._targetGroup.nCachedObjects_,s=i.length;r!==s;++r)i[r].setValue(e,n)}bind(){let e=this._bindings;for(let n=this._targetGroup.nCachedObjects_,i=e.length;n!==i;++n)e[n].bind()}unbind(){let e=this._bindings;for(let n=this._targetGroup.nCachedObjects_,i=e.length;n!==i;++n)e[n].unbind()}},Rt=class t{constructor(e,n,i){this.path=n,this.parsedPath=i||t.parseTrackName(n),this.node=t.findNode(e,this.parsedPath.nodeName),this.rootNode=e,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(e,n,i){return e&&e.isAnimationObjectGroup?new t.Composite(e,n,i):new t(e,n,i)}static sanitizeNodeName(e){return e.replace(/\s/g,"_").replace(pb,"")}static parseTrackName(e){let n=xb.exec(e);if(n===null)throw new Error("PropertyBinding: Cannot parse trackName: "+e);let i={nodeName:n[2],objectName:n[3],objectIndex:n[4],propertyName:n[5],propertyIndex:n[6]},r=i.nodeName&&i.nodeName.lastIndexOf(".");if(r!==void 0&&r!==-1){let s=i.nodeName.substring(r+1);bb.indexOf(s)!==-1&&(i.nodeName=i.nodeName.substring(0,r),i.objectName=s)}if(i.propertyName===null||i.propertyName.length===0)throw new Error("PropertyBinding: can not parse propertyName from trackName: "+e);return i}static findNode(e,n){if(n===void 0||n===""||n==="."||n===-1||n===e.name||n===e.uuid)return e;if(e.skeleton){let i=e.skeleton.getBoneByName(n);if(i!==void 0)return i}if(e.children){let i=function(s){for(let o=0;o<s.length;o++){let a=s[o];if(a.name===n||a.uuid===n)return a;let l=i(a.children);if(l)return l}return null},r=i(e.children);if(r)return r}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(e,n){e[n]=this.targetObject[this.propertyName]}_getValue_array(e,n){let i=this.resolvedProperty;for(let r=0,s=i.length;r!==s;++r)e[n++]=i[r]}_getValue_arrayElement(e,n){e[n]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(e,n){this.resolvedProperty.toArray(e,n)}_setValue_direct(e,n){this.targetObject[this.propertyName]=e[n]}_setValue_direct_setNeedsUpdate(e,n){this.targetObject[this.propertyName]=e[n],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(e,n){this.targetObject[this.propertyName]=e[n],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(e,n){let i=this.resolvedProperty;for(let r=0,s=i.length;r!==s;++r)i[r]=e[n++]}_setValue_array_setNeedsUpdate(e,n){let i=this.resolvedProperty;for(let r=0,s=i.length;r!==s;++r)i[r]=e[n++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(e,n){let i=this.resolvedProperty;for(let r=0,s=i.length;r!==s;++r)i[r]=e[n++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(e,n){this.resolvedProperty[this.propertyIndex]=e[n]}_setValue_arrayElement_setNeedsUpdate(e,n){this.resolvedProperty[this.propertyIndex]=e[n],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(e,n){this.resolvedProperty[this.propertyIndex]=e[n],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(e,n){this.resolvedProperty.fromArray(e,n)}_setValue_fromArray_setNeedsUpdate(e,n){this.resolvedProperty.fromArray(e,n),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(e,n){this.resolvedProperty.fromArray(e,n),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(e,n){this.bind(),this.getValue(e,n)}_setValue_unbound(e,n){this.bind(),this.setValue(e,n)}bind(){let e=this.node,n=this.parsedPath,i=n.objectName,r=n.propertyName,s=n.propertyIndex;if(e||(e=t.findNode(this.rootNode,n.nodeName),this.node=e),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!e){console.warn("THREE.PropertyBinding: No target node found for track: "+this.path+".");return}if(i){let c=n.objectIndex;switch(i){case"materials":if(!e.material){console.error("THREE.PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.materials){console.error("THREE.PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}e=e.material.materials;break;case"bones":if(!e.skeleton){console.error("THREE.PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}e=e.skeleton.bones;for(let h=0;h<e.length;h++)if(e[h].name===c){c=h;break}break;case"map":if("map"in e){e=e.map;break}if(!e.material){console.error("THREE.PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.map){console.error("THREE.PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}e=e.material.map;break;default:if(e[i]===void 0){console.error("THREE.PropertyBinding: Can not bind to objectName of node undefined.",this);return}e=e[i]}if(c!==void 0){if(e[c]===void 0){console.error("THREE.PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,e);return}e=e[c]}}let o=e[r];if(o===void 0){let c=n.nodeName;console.error("THREE.PropertyBinding: Trying to update property for track: "+c+"."+r+" but it wasn't found.",e);return}let a=this.Versioning.None;this.targetObject=e,e.isMaterial===!0?a=this.Versioning.NeedsUpdate:e.isObject3D===!0&&(a=this.Versioning.MatrixWorldNeedsUpdate);let l=this.BindingType.Direct;if(s!==void 0){if(r==="morphTargetInfluences"){if(!e.geometry){console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!e.geometry.morphAttributes){console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}e.morphTargetDictionary[s]!==void 0&&(s=e.morphTargetDictionary[s])}l=this.BindingType.ArrayElement,this.resolvedProperty=o,this.propertyIndex=s}else o.fromArray!==void 0&&o.toArray!==void 0?(l=this.BindingType.HasFromToArray,this.resolvedProperty=o):Array.isArray(o)?(l=this.BindingType.EntireArray,this.resolvedProperty=o):this.propertyName=r;this.getValue=this.GetterByBindingType[l],this.setValue=this.SetterByBindingTypeAndVersioning[l][a]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}};Rt.Composite=Gu;Rt.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};Rt.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};Rt.prototype.GetterByBindingType=[Rt.prototype._getValue_direct,Rt.prototype._getValue_array,Rt.prototype._getValue_arrayElement,Rt.prototype._getValue_toArray];Rt.prototype.SetterByBindingTypeAndVersioning=[[Rt.prototype._setValue_direct,Rt.prototype._setValue_direct_setNeedsUpdate,Rt.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[Rt.prototype._setValue_array,Rt.prototype._setValue_array_setNeedsUpdate,Rt.prototype._setValue_array_setMatrixWorldNeedsUpdate],[Rt.prototype._setValue_arrayElement,Rt.prototype._setValue_arrayElement_setNeedsUpdate,Rt.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[Rt.prototype._setValue_fromArray,Rt.prototype._setValue_fromArray_setNeedsUpdate,Rt.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];var mI=new Float32Array(1);var nm=new Xe,Ui=class{constructor(e,n,i=0,r=1/0){this.ray=new Li(e,n),this.near=i,this.far=r,this.camera=null,this.layers=new ws,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(e,n){this.ray.set(e,n)}setFromCamera(e,n){n.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(n.matrixWorld),this.ray.direction.set(e.x,e.y,.5).unproject(n).sub(this.ray.origin).normalize(),this.camera=n):n.isOrthographicCamera?(this.ray.origin.set(e.x,e.y,(n.near+n.far)/(n.near-n.far)).unproject(n),this.ray.direction.set(0,0,-1).transformDirection(n.matrixWorld),this.camera=n):console.error("THREE.Raycaster: Unsupported camera type: "+n.type)}setFromXRController(e){return nm.identity().extractRotation(e.matrixWorld),this.ray.origin.setFromMatrixPosition(e.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(nm),this}intersectObject(e,n=!0,i=[]){return Wu(e,this,i,n),i.sort(im),i}intersectObjects(e,n=!0,i=[]){for(let r=0,s=e.length;r<s;r++)Wu(e[r],this,i,n);return i.sort(im),i}};function im(t,e){return t.distance-e.distance}function Wu(t,e,n,i){let r=!0;if(t.layers.test(e.layers)&&t.raycast(e,n)===!1&&(r=!1),r===!0&&i===!0){let s=t.children;for(let o=0,a=s.length;o<a;o++)Wu(s[o],e,n,!0)}}var Ko=class{constructor(){this._previousTime=0,this._currentTime=0,this._startTime=performance.now(),this._delta=0,this._elapsed=0,this._timescale=1,this._document=null,this._pageVisibilityHandler=null}connect(e){this._document=e,e.hidden!==void 0&&(this._pageVisibilityHandler=Mb.bind(this),e.addEventListener("visibilitychange",this._pageVisibilityHandler,!1))}disconnect(){this._pageVisibilityHandler!==null&&(this._document.removeEventListener("visibilitychange",this._pageVisibilityHandler),this._pageVisibilityHandler=null),this._document=null}getDelta(){return this._delta/1e3}getElapsed(){return this._elapsed/1e3}getTimescale(){return this._timescale}setTimescale(e){return this._timescale=e,this}reset(){return this._currentTime=performance.now()-this._startTime,this}dispose(){this.disconnect()}update(e){return this._pageVisibilityHandler!==null&&this._document.hidden===!0?this._delta=0:(this._previousTime=this._currentTime,this._currentTime=(e!==void 0?e:performance.now())-this._startTime,this._delta=(this._currentTime-this._previousTime)*this._timescale,this._elapsed+=this._delta),this}};function Mb(){this._document.hidden===!1&&this.reset()}var Ls=class{constructor(e=1,n=0,i=0){this.radius=e,this.phi=n,this.theta=i}set(e,n,i){return this.radius=e,this.phi=n,this.theta=i,this}copy(e){return this.radius=e.radius,this.phi=e.phi,this.theta=e.theta,this}makeSafe(){return this.phi=nt(this.phi,1e-6,Math.PI-1e-6),this}setFromVector3(e){return this.setFromCartesianCoords(e.x,e.y,e.z)}setFromCartesianCoords(e,n,i){return this.radius=Math.sqrt(e*e+n*n+i*i),this.radius===0?(this.theta=0,this.phi=0):(this.theta=Math.atan2(e,i),this.phi=Math.acos(nt(n/this.radius,-1,1))),this}clone(){return new this.constructor().copy(this)}};var Jo=class extends Ec{constructor(e=10,n=10,i=4473924,r=8947848){i=new Oe(i),r=new Oe(r);let s=n/2,o=e/n,a=e/2,l=[],c=[];for(let d=0,f=0,m=-a;d<=n;d++,m+=o){l.push(-a,0,m,a,0,m),l.push(m,0,-a,m,0,a);let _=d===s?i:r;_.toArray(c,f),f+=3,_.toArray(c,f),f+=3,_.toArray(c,f),f+=3,_.toArray(c,f),f+=3}let h=new St;h.setAttribute("position",new ut(l,3)),h.setAttribute("color",new ut(c,3));let u=new ni({vertexColors:!0,toneMapped:!1});super(h,u),this.type="GridHelper"}dispose(){this.geometry.dispose(),this.material.dispose()}};var Pn=class extends fi{constructor(e,n=null){super(),this.object=e,this.domElement=n,this.enabled=!0,this.state=-1,this.keys={},this.mouseButtons={LEFT:null,MIDDLE:null,RIGHT:null},this.touches={ONE:null,TWO:null}}connect(e){if(e===void 0){console.warn("THREE.Controls: connect() now requires an element.");return}this.domElement!==null&&this.disconnect(),this.domElement=e}disconnect(){}dispose(){}update(){}};function df(t,e,n,i){let r=Sb(i);switch(n){case ef:return t*e;case nf:return t*e/r.components*r.byteLength;case dl:return t*e/r.components*r.byteLength;case rf:return t*e*2/r.components*r.byteLength;case pl:return t*e*2/r.components*r.byteLength;case tf:return t*e*3/r.components*r.byteLength;case jn:return t*e*4/r.components*r.byteLength;case ml:return t*e*4/r.components*r.byteLength;case ta:case na:return Math.floor((t+3)/4)*Math.floor((e+3)/4)*8;case ia:case ra:return Math.floor((t+3)/4)*Math.floor((e+3)/4)*16;case _l:case yl:return Math.max(t,16)*Math.max(e,8)/4;case gl:case vl:return Math.max(t,8)*Math.max(e,8)/2;case xl:case bl:return Math.floor((t+3)/4)*Math.floor((e+3)/4)*8;case Ml:return Math.floor((t+3)/4)*Math.floor((e+3)/4)*16;case Sl:return Math.floor((t+3)/4)*Math.floor((e+3)/4)*16;case wl:return Math.floor((t+4)/5)*Math.floor((e+3)/4)*16;case El:return Math.floor((t+4)/5)*Math.floor((e+4)/5)*16;case Tl:return Math.floor((t+5)/6)*Math.floor((e+4)/5)*16;case Al:return Math.floor((t+5)/6)*Math.floor((e+5)/6)*16;case Cl:return Math.floor((t+7)/8)*Math.floor((e+4)/5)*16;case Rl:return Math.floor((t+7)/8)*Math.floor((e+5)/6)*16;case Pl:return Math.floor((t+7)/8)*Math.floor((e+7)/8)*16;case Il:return Math.floor((t+9)/10)*Math.floor((e+4)/5)*16;case Dl:return Math.floor((t+9)/10)*Math.floor((e+5)/6)*16;case Ll:return Math.floor((t+9)/10)*Math.floor((e+7)/8)*16;case Ol:return Math.floor((t+9)/10)*Math.floor((e+9)/10)*16;case Nl:return Math.floor((t+11)/12)*Math.floor((e+9)/10)*16;case Fl:return Math.floor((t+11)/12)*Math.floor((e+11)/12)*16;case Ul:case zl:case kl:return Math.ceil(t/4)*Math.ceil(e/4)*16;case Bl:case Vl:return Math.ceil(t/4)*Math.ceil(e/4)*8;case Hl:case Gl:return Math.ceil(t/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${n} format.`)}function Sb(t){switch(t){case ri:case Zu:return{byteLength:1,components:1};case Os:case Ku:case Wn:return{byteLength:2,components:1};case ul:case fl:return{byteLength:2,components:4};case sr:case hl:case vi:return{byteLength:4,components:1};case Ju:case Qu:return{byteLength:4,components:3}}throw new Error(`Unknown texture type ${t}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:"180"}}));typeof window<"u"&&(window.__THREE__?console.warn("WARNING: Multiple instances of Three.js being imported."):window.__THREE__="180");function fg(){let t=null,e=!1,n=null,i=null;function r(s,o){n(s,o),i=t.requestAnimationFrame(r)}return{start:function(){e!==!0&&n!==null&&(i=t.requestAnimationFrame(r),e=!0)},stop:function(){t.cancelAnimationFrame(i),e=!1},setAnimationLoop:function(s){n=s},setContext:function(s){t=s}}}function wb(t){let e=new WeakMap;function n(a,l){let c=a.array,h=a.usage,u=c.byteLength,d=t.createBuffer();t.bindBuffer(l,d),t.bufferData(l,c,h),a.onUploadCallback();let f;if(c instanceof Float32Array)f=t.FLOAT;else if(typeof Float16Array<"u"&&c instanceof Float16Array)f=t.HALF_FLOAT;else if(c instanceof Uint16Array)a.isFloat16BufferAttribute?f=t.HALF_FLOAT:f=t.UNSIGNED_SHORT;else if(c instanceof Int16Array)f=t.SHORT;else if(c instanceof Uint32Array)f=t.UNSIGNED_INT;else if(c instanceof Int32Array)f=t.INT;else if(c instanceof Int8Array)f=t.BYTE;else if(c instanceof Uint8Array)f=t.UNSIGNED_BYTE;else if(c instanceof Uint8ClampedArray)f=t.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+c);return{buffer:d,type:f,bytesPerElement:c.BYTES_PER_ELEMENT,version:a.version,size:u}}function i(a,l,c){let h=l.array,u=l.updateRanges;if(t.bindBuffer(c,a),u.length===0)t.bufferSubData(c,0,h);else{u.sort((f,m)=>f.start-m.start);let d=0;for(let f=1;f<u.length;f++){let m=u[d],_=u[f];_.start<=m.start+m.count+1?m.count=Math.max(m.count,_.start+_.count-m.start):(++d,u[d]=_)}u.length=d+1;for(let f=0,m=u.length;f<m;f++){let _=u[f];t.bufferSubData(c,_.start*h.BYTES_PER_ELEMENT,h,_.start,_.count)}l.clearUpdateRanges()}l.onUploadCallback()}function r(a){return a.isInterleavedBufferAttribute&&(a=a.data),e.get(a)}function s(a){a.isInterleavedBufferAttribute&&(a=a.data);let l=e.get(a);l&&(t.deleteBuffer(l.buffer),e.delete(a))}function o(a,l){if(a.isInterleavedBufferAttribute&&(a=a.data),a.isGLBufferAttribute){let h=e.get(a);(!h||h.version<a.version)&&e.set(a,{buffer:a.buffer,type:a.type,bytesPerElement:a.elementSize,version:a.version});return}let c=e.get(a);if(c===void 0)e.set(a,n(a,l));else if(c.version<a.version){if(c.size!==a.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");i(c.buffer,a,l),c.version=a.version}}return{get:r,remove:s,update:o}}var Eb=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,Tb=`#ifdef USE_ALPHAHASH
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
#endif`,Ab=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,Cb=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Rb=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,Pb=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,Ib=`#ifdef USE_AOMAP
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
#endif`,Db=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,Lb=`#ifdef USE_BATCHING
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
#endif`,Ob=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,Nb=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,Fb=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,Ub=`float G_BlinnPhong_Implicit( ) {
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
} // validated`,zb=`#ifdef USE_IRIDESCENCE
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
#endif`,kb=`#ifdef USE_BUMPMAP
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
#endif`,Bb=`#if NUM_CLIPPING_PLANES > 0
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
#endif`,Vb=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,Hb=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,Gb=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,Wb=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,jb=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,qb=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,Xb=`#if defined( USE_COLOR_ALPHA )
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
#endif`,$b=`#define PI 3.141592653589793
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
} // validated`,Yb=`#ifdef ENVMAP_TYPE_CUBE_UV
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
#endif`,Zb=`vec3 transformedNormal = objectNormal;
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
#endif`,Kb=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,Jb=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,Qb=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,e1=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,t1="gl_FragColor = linearToOutputTexel( gl_FragColor );",n1=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,i1=`#ifdef USE_ENVMAP
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
#endif`,r1=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,s1=`#ifdef USE_ENVMAP
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
#endif`,o1=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,a1=`#ifdef USE_ENVMAP
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
#endif`,c1=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,l1=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,h1=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,u1=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,f1=`#ifdef USE_GRADIENTMAP
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
}`,d1=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,p1=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,m1=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,g1=`uniform bool receiveShadow;
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
#endif`,_1=`#ifdef USE_ENVMAP
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
#endif`,v1=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,y1=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,x1=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,b1=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,M1=`PhysicalMaterial material;
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
#endif`,S1=`struct PhysicalMaterial {
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
}`,w1=`
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
#endif`,E1=`#if defined( RE_IndirectDiffuse )
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
#endif`,T1=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,A1=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,C1=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,R1=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,P1=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,I1=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,D1=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,L1=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
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
#endif`,O1=`#if defined( USE_POINTS_UV )
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
#endif`,N1=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,F1=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,U1=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,z1=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,k1=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,B1=`#ifdef USE_MORPHTARGETS
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
#endif`,V1=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,H1=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
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
vec3 nonPerturbedNormal = normal;`,G1=`#ifdef USE_NORMALMAP_OBJECTSPACE
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
#endif`,W1=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,j1=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,q1=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,X1=`#ifdef USE_NORMALMAP
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
#endif`,$1=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,Y1=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,Z1=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,K1=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,J1=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,Q1=`vec3 packNormalToRGB( const in vec3 normal ) {
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
}`,eM=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,tM=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,nM=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,iM=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,rM=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,sM=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,oM=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,aM=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,cM=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
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
#endif`,lM=`float getShadowMask() {
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
}`,hM=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,uM=`#ifdef USE_SKINNING
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
#endif`,fM=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,dM=`#ifdef USE_SKINNING
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
#endif`,pM=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,mM=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,gM=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,_M=`#ifndef saturate
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
vec3 CustomToneMapping( vec3 color ) { return color; }`,vM=`#ifdef USE_TRANSMISSION
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
#endif`,yM=`#ifdef USE_TRANSMISSION
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
#endif`,xM=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,bM=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,MM=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,SM=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,wM=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,EM=`uniform sampler2D t2D;
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
}`,TM=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,AM=`#ifdef ENVMAP_TYPE_CUBE
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
}`,CM=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,RM=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,PM=`#include <common>
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
}`,IM=`#if DEPTH_PACKING == 3200
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
}`,DM=`#define DISTANCE
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
}`,LM=`#define DISTANCE
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
}`,OM=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,NM=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,FM=`uniform float scale;
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
}`,UM=`uniform vec3 diffuse;
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
}`,zM=`#include <common>
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
}`,kM=`uniform vec3 diffuse;
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
}`,BM=`#define LAMBERT
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
}`,VM=`#define LAMBERT
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
}`,HM=`#define MATCAP
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
}`,GM=`#define MATCAP
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
}`,WM=`#define NORMAL
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
}`,jM=`#define NORMAL
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
}`,qM=`#define PHONG
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
}`,XM=`#define PHONG
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
}`,$M=`#define STANDARD
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
}`,YM=`#define STANDARD
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
}`,ZM=`#define TOON
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
}`,KM=`#define TOON
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
}`,JM=`uniform float size;
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
}`,QM=`uniform vec3 diffuse;
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
}`,eS=`#include <common>
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
}`,tS=`uniform vec3 color;
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
}`,nS=`uniform float rotation;
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
}`,iS=`uniform vec3 diffuse;
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
}`,it={alphahash_fragment:Eb,alphahash_pars_fragment:Tb,alphamap_fragment:Ab,alphamap_pars_fragment:Cb,alphatest_fragment:Rb,alphatest_pars_fragment:Pb,aomap_fragment:Ib,aomap_pars_fragment:Db,batching_pars_vertex:Lb,batching_vertex:Ob,begin_vertex:Nb,beginnormal_vertex:Fb,bsdfs:Ub,iridescence_fragment:zb,bumpmap_pars_fragment:kb,clipping_planes_fragment:Bb,clipping_planes_pars_fragment:Vb,clipping_planes_pars_vertex:Hb,clipping_planes_vertex:Gb,color_fragment:Wb,color_pars_fragment:jb,color_pars_vertex:qb,color_vertex:Xb,common:$b,cube_uv_reflection_fragment:Yb,defaultnormal_vertex:Zb,displacementmap_pars_vertex:Kb,displacementmap_vertex:Jb,emissivemap_fragment:Qb,emissivemap_pars_fragment:e1,colorspace_fragment:t1,colorspace_pars_fragment:n1,envmap_fragment:i1,envmap_common_pars_fragment:r1,envmap_pars_fragment:s1,envmap_pars_vertex:o1,envmap_physical_pars_fragment:_1,envmap_vertex:a1,fog_vertex:c1,fog_pars_vertex:l1,fog_fragment:h1,fog_pars_fragment:u1,gradientmap_pars_fragment:f1,lightmap_pars_fragment:d1,lights_lambert_fragment:p1,lights_lambert_pars_fragment:m1,lights_pars_begin:g1,lights_toon_fragment:v1,lights_toon_pars_fragment:y1,lights_phong_fragment:x1,lights_phong_pars_fragment:b1,lights_physical_fragment:M1,lights_physical_pars_fragment:S1,lights_fragment_begin:w1,lights_fragment_maps:E1,lights_fragment_end:T1,logdepthbuf_fragment:A1,logdepthbuf_pars_fragment:C1,logdepthbuf_pars_vertex:R1,logdepthbuf_vertex:P1,map_fragment:I1,map_pars_fragment:D1,map_particle_fragment:L1,map_particle_pars_fragment:O1,metalnessmap_fragment:N1,metalnessmap_pars_fragment:F1,morphinstance_vertex:U1,morphcolor_vertex:z1,morphnormal_vertex:k1,morphtarget_pars_vertex:B1,morphtarget_vertex:V1,normal_fragment_begin:H1,normal_fragment_maps:G1,normal_pars_fragment:W1,normal_pars_vertex:j1,normal_vertex:q1,normalmap_pars_fragment:X1,clearcoat_normal_fragment_begin:$1,clearcoat_normal_fragment_maps:Y1,clearcoat_pars_fragment:Z1,iridescence_pars_fragment:K1,opaque_fragment:J1,packing:Q1,premultiplied_alpha_fragment:eM,project_vertex:tM,dithering_fragment:nM,dithering_pars_fragment:iM,roughnessmap_fragment:rM,roughnessmap_pars_fragment:sM,shadowmap_pars_fragment:oM,shadowmap_pars_vertex:aM,shadowmap_vertex:cM,shadowmask_pars_fragment:lM,skinbase_vertex:hM,skinning_pars_vertex:uM,skinning_vertex:fM,skinnormal_vertex:dM,specularmap_fragment:pM,specularmap_pars_fragment:mM,tonemapping_fragment:gM,tonemapping_pars_fragment:_M,transmission_fragment:vM,transmission_pars_fragment:yM,uv_pars_fragment:xM,uv_pars_vertex:bM,uv_vertex:MM,worldpos_vertex:SM,background_vert:wM,background_frag:EM,backgroundCube_vert:TM,backgroundCube_frag:AM,cube_vert:CM,cube_frag:RM,depth_vert:PM,depth_frag:IM,distanceRGBA_vert:DM,distanceRGBA_frag:LM,equirect_vert:OM,equirect_frag:NM,linedashed_vert:FM,linedashed_frag:UM,meshbasic_vert:zM,meshbasic_frag:kM,meshlambert_vert:BM,meshlambert_frag:VM,meshmatcap_vert:HM,meshmatcap_frag:GM,meshnormal_vert:WM,meshnormal_frag:jM,meshphong_vert:qM,meshphong_frag:XM,meshphysical_vert:$M,meshphysical_frag:YM,meshtoon_vert:ZM,meshtoon_frag:KM,points_vert:JM,points_frag:QM,shadow_vert:eS,shadow_frag:tS,sprite_vert:nS,sprite_frag:iS},pe={common:{diffuse:{value:new Oe(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Je},alphaMap:{value:null},alphaMapTransform:{value:new Je},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Je}},envmap:{envMap:{value:null},envMapRotation:{value:new Je},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Je}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Je}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Je},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Je},normalScale:{value:new ne(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Je},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Je}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Je}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Je}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Oe(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new Oe(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Je},alphaTest:{value:0},uvTransform:{value:new Je}},sprite:{diffuse:{value:new Oe(16777215)},opacity:{value:1},center:{value:new ne(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Je},alphaMap:{value:null},alphaMapTransform:{value:new Je},alphaTest:{value:0}}},yi={basic:{uniforms:on([pe.common,pe.specularmap,pe.envmap,pe.aomap,pe.lightmap,pe.fog]),vertexShader:it.meshbasic_vert,fragmentShader:it.meshbasic_frag},lambert:{uniforms:on([pe.common,pe.specularmap,pe.envmap,pe.aomap,pe.lightmap,pe.emissivemap,pe.bumpmap,pe.normalmap,pe.displacementmap,pe.fog,pe.lights,{emissive:{value:new Oe(0)}}]),vertexShader:it.meshlambert_vert,fragmentShader:it.meshlambert_frag},phong:{uniforms:on([pe.common,pe.specularmap,pe.envmap,pe.aomap,pe.lightmap,pe.emissivemap,pe.bumpmap,pe.normalmap,pe.displacementmap,pe.fog,pe.lights,{emissive:{value:new Oe(0)},specular:{value:new Oe(1118481)},shininess:{value:30}}]),vertexShader:it.meshphong_vert,fragmentShader:it.meshphong_frag},standard:{uniforms:on([pe.common,pe.envmap,pe.aomap,pe.lightmap,pe.emissivemap,pe.bumpmap,pe.normalmap,pe.displacementmap,pe.roughnessmap,pe.metalnessmap,pe.fog,pe.lights,{emissive:{value:new Oe(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:it.meshphysical_vert,fragmentShader:it.meshphysical_frag},toon:{uniforms:on([pe.common,pe.aomap,pe.lightmap,pe.emissivemap,pe.bumpmap,pe.normalmap,pe.displacementmap,pe.gradientmap,pe.fog,pe.lights,{emissive:{value:new Oe(0)}}]),vertexShader:it.meshtoon_vert,fragmentShader:it.meshtoon_frag},matcap:{uniforms:on([pe.common,pe.bumpmap,pe.normalmap,pe.displacementmap,pe.fog,{matcap:{value:null}}]),vertexShader:it.meshmatcap_vert,fragmentShader:it.meshmatcap_frag},points:{uniforms:on([pe.points,pe.fog]),vertexShader:it.points_vert,fragmentShader:it.points_frag},dashed:{uniforms:on([pe.common,pe.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:it.linedashed_vert,fragmentShader:it.linedashed_frag},depth:{uniforms:on([pe.common,pe.displacementmap]),vertexShader:it.depth_vert,fragmentShader:it.depth_frag},normal:{uniforms:on([pe.common,pe.bumpmap,pe.normalmap,pe.displacementmap,{opacity:{value:1}}]),vertexShader:it.meshnormal_vert,fragmentShader:it.meshnormal_frag},sprite:{uniforms:on([pe.sprite,pe.fog]),vertexShader:it.sprite_vert,fragmentShader:it.sprite_frag},background:{uniforms:{uvTransform:{value:new Je},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:it.background_vert,fragmentShader:it.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Je}},vertexShader:it.backgroundCube_vert,fragmentShader:it.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:it.cube_vert,fragmentShader:it.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:it.equirect_vert,fragmentShader:it.equirect_frag},distanceRGBA:{uniforms:on([pe.common,pe.displacementmap,{referencePosition:{value:new R},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:it.distanceRGBA_vert,fragmentShader:it.distanceRGBA_frag},shadow:{uniforms:on([pe.lights,pe.fog,{color:{value:new Oe(0)},opacity:{value:1}}]),vertexShader:it.shadow_vert,fragmentShader:it.shadow_frag}};yi.physical={uniforms:on([yi.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Je},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Je},clearcoatNormalScale:{value:new ne(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Je},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Je},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Je},sheen:{value:0},sheenColor:{value:new Oe(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Je},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Je},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Je},transmissionSamplerSize:{value:new ne},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Je},attenuationDistance:{value:0},attenuationColor:{value:new Oe(0)},specularColor:{value:new Oe(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Je},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Je},anisotropyVector:{value:new ne},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Je}}]),vertexShader:it.meshphysical_vert,fragmentShader:it.meshphysical_frag};var jl={r:0,b:0,g:0},zr=new Bn,rS=new Xe;function sS(t,e,n,i,r,s,o){let a=new Oe(0),l=s===!0?0:1,c,h,u=null,d=0,f=null;function m(y){let v=y.isScene===!0?y.background:null;return v&&v.isTexture&&(v=(y.backgroundBlurriness>0?n:e).get(v)),v}function _(y){let v=!1,M=m(y);M===null?p(a,l):M&&M.isColor&&(p(M,1),v=!0);let b=t.xr.getEnvironmentBlendMode();b==="additive"?i.buffers.color.setClear(0,0,0,1,o):b==="alpha-blend"&&i.buffers.color.setClear(0,0,0,0,o),(t.autoClear||v)&&(i.buffers.depth.setTest(!0),i.buffers.depth.setMask(!0),i.buffers.color.setMask(!0),t.clear(t.autoClearColor,t.autoClearDepth,t.autoClearStencil))}function g(y,v){let M=m(v);M&&(M.isCubeTexture||M.mapping===Qo)?(h===void 0&&(h=new It(new Es(1,1,1),new Bt({name:"BackgroundCubeMaterial",uniforms:Ur(yi.backgroundCube.uniforms),vertexShader:yi.backgroundCube.vertexShader,fragmentShader:yi.backgroundCube.fragmentShader,side:Jt,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),h.geometry.deleteAttribute("normal"),h.geometry.deleteAttribute("uv"),h.onBeforeRender=function(b,A,C){this.matrixWorld.copyPosition(C.matrixWorld)},Object.defineProperty(h.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),r.update(h)),zr.copy(v.backgroundRotation),zr.x*=-1,zr.y*=-1,zr.z*=-1,M.isCubeTexture&&M.isRenderTargetTexture===!1&&(zr.y*=-1,zr.z*=-1),h.material.uniforms.envMap.value=M,h.material.uniforms.flipEnvMap.value=M.isCubeTexture&&M.isRenderTargetTexture===!1?-1:1,h.material.uniforms.backgroundBlurriness.value=v.backgroundBlurriness,h.material.uniforms.backgroundIntensity.value=v.backgroundIntensity,h.material.uniforms.backgroundRotation.value.setFromMatrix4(rS.makeRotationFromEuler(zr)),h.material.toneMapped=ot.getTransfer(M.colorSpace)!==ht,(u!==M||d!==M.version||f!==t.toneMapping)&&(h.material.needsUpdate=!0,u=M,d=M.version,f=t.toneMapping),h.layers.enableAll(),y.unshift(h,h.geometry,h.material,0,0,null)):M&&M.isTexture&&(c===void 0&&(c=new It(new Bo(2,2),new Bt({name:"BackgroundMaterial",uniforms:Ur(yi.background.uniforms),vertexShader:yi.background.vertexShader,fragmentShader:yi.background.fragmentShader,side:Di,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),r.update(c)),c.material.uniforms.t2D.value=M,c.material.uniforms.backgroundIntensity.value=v.backgroundIntensity,c.material.toneMapped=ot.getTransfer(M.colorSpace)!==ht,M.matrixAutoUpdate===!0&&M.updateMatrix(),c.material.uniforms.uvTransform.value.copy(M.matrix),(u!==M||d!==M.version||f!==t.toneMapping)&&(c.material.needsUpdate=!0,u=M,d=M.version,f=t.toneMapping),c.layers.enableAll(),y.unshift(c,c.geometry,c.material,0,0,null))}function p(y,v){y.getRGB(jl,lf(t)),i.buffers.color.setClear(jl.r,jl.g,jl.b,v,o)}function x(){h!==void 0&&(h.geometry.dispose(),h.material.dispose(),h=void 0),c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0)}return{getClearColor:function(){return a},setClearColor:function(y,v=1){a.set(y),l=v,p(a,l)},getClearAlpha:function(){return l},setClearAlpha:function(y){l=y,p(a,l)},render:_,addToRenderList:g,dispose:x}}function oS(t,e){let n=t.getParameter(t.MAX_VERTEX_ATTRIBS),i={},r=d(null),s=r,o=!1;function a(w,I,N,B,L){let D=!1,F=u(B,N,I);s!==F&&(s=F,c(s.object)),D=f(w,B,N,L),D&&m(w,B,N,L),L!==null&&e.update(L,t.ELEMENT_ARRAY_BUFFER),(D||o)&&(o=!1,v(w,I,N,B),L!==null&&t.bindBuffer(t.ELEMENT_ARRAY_BUFFER,e.get(L).buffer))}function l(){return t.createVertexArray()}function c(w){return t.bindVertexArray(w)}function h(w){return t.deleteVertexArray(w)}function u(w,I,N){let B=N.wireframe===!0,L=i[w.id];L===void 0&&(L={},i[w.id]=L);let D=L[I.id];D===void 0&&(D={},L[I.id]=D);let F=D[B];return F===void 0&&(F=d(l()),D[B]=F),F}function d(w){let I=[],N=[],B=[];for(let L=0;L<n;L++)I[L]=0,N[L]=0,B[L]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:I,enabledAttributes:N,attributeDivisors:B,object:w,attributes:{},index:null}}function f(w,I,N,B){let L=s.attributes,D=I.attributes,F=0,J=N.getAttributes();for(let G in J)if(J[G].location>=0){let fe=L[G],X=D[G];if(X===void 0&&(G==="instanceMatrix"&&w.instanceMatrix&&(X=w.instanceMatrix),G==="instanceColor"&&w.instanceColor&&(X=w.instanceColor)),fe===void 0||fe.attribute!==X||X&&fe.data!==X.data)return!0;F++}return s.attributesNum!==F||s.index!==B}function m(w,I,N,B){let L={},D=I.attributes,F=0,J=N.getAttributes();for(let G in J)if(J[G].location>=0){let fe=D[G];fe===void 0&&(G==="instanceMatrix"&&w.instanceMatrix&&(fe=w.instanceMatrix),G==="instanceColor"&&w.instanceColor&&(fe=w.instanceColor));let X={};X.attribute=fe,fe&&fe.data&&(X.data=fe.data),L[G]=X,F++}s.attributes=L,s.attributesNum=F,s.index=B}function _(){let w=s.newAttributes;for(let I=0,N=w.length;I<N;I++)w[I]=0}function g(w){p(w,0)}function p(w,I){let N=s.newAttributes,B=s.enabledAttributes,L=s.attributeDivisors;N[w]=1,B[w]===0&&(t.enableVertexAttribArray(w),B[w]=1),L[w]!==I&&(t.vertexAttribDivisor(w,I),L[w]=I)}function x(){let w=s.newAttributes,I=s.enabledAttributes;for(let N=0,B=I.length;N<B;N++)I[N]!==w[N]&&(t.disableVertexAttribArray(N),I[N]=0)}function y(w,I,N,B,L,D,F){F===!0?t.vertexAttribIPointer(w,I,N,L,D):t.vertexAttribPointer(w,I,N,B,L,D)}function v(w,I,N,B){_();let L=B.attributes,D=N.getAttributes(),F=I.defaultAttributeValues;for(let J in D){let G=D[J];if(G.location>=0){let le=L[J];if(le===void 0&&(J==="instanceMatrix"&&w.instanceMatrix&&(le=w.instanceMatrix),J==="instanceColor"&&w.instanceColor&&(le=w.instanceColor)),le!==void 0){let fe=le.normalized,X=le.itemSize,re=e.get(le);if(re===void 0)continue;let ye=re.buffer,Ue=re.type,ke=re.bytesPerElement,$=Ue===t.INT||Ue===t.UNSIGNED_INT||le.gpuType===hl;if(le.isInterleavedBufferAttribute){let ee=le.data,be=ee.stride,je=le.offset;if(ee.isInstancedInterleavedBuffer){for(let Le=0;Le<G.locationSize;Le++)p(G.location+Le,ee.meshPerAttribute);w.isInstancedMesh!==!0&&B._maxInstanceCount===void 0&&(B._maxInstanceCount=ee.meshPerAttribute*ee.count)}else for(let Le=0;Le<G.locationSize;Le++)g(G.location+Le);t.bindBuffer(t.ARRAY_BUFFER,ye);for(let Le=0;Le<G.locationSize;Le++)y(G.location+Le,X/G.locationSize,Ue,fe,be*ke,(je+X/G.locationSize*Le)*ke,$)}else{if(le.isInstancedBufferAttribute){for(let ee=0;ee<G.locationSize;ee++)p(G.location+ee,le.meshPerAttribute);w.isInstancedMesh!==!0&&B._maxInstanceCount===void 0&&(B._maxInstanceCount=le.meshPerAttribute*le.count)}else for(let ee=0;ee<G.locationSize;ee++)g(G.location+ee);t.bindBuffer(t.ARRAY_BUFFER,ye);for(let ee=0;ee<G.locationSize;ee++)y(G.location+ee,X/G.locationSize,Ue,fe,X*ke,X/G.locationSize*ee*ke,$)}}else if(F!==void 0){let fe=F[J];if(fe!==void 0)switch(fe.length){case 2:t.vertexAttrib2fv(G.location,fe);break;case 3:t.vertexAttrib3fv(G.location,fe);break;case 4:t.vertexAttrib4fv(G.location,fe);break;default:t.vertexAttrib1fv(G.location,fe)}}}}x()}function M(){C();for(let w in i){let I=i[w];for(let N in I){let B=I[N];for(let L in B)h(B[L].object),delete B[L];delete I[N]}delete i[w]}}function b(w){if(i[w.id]===void 0)return;let I=i[w.id];for(let N in I){let B=I[N];for(let L in B)h(B[L].object),delete B[L];delete I[N]}delete i[w.id]}function A(w){for(let I in i){let N=i[I];if(N[w.id]===void 0)continue;let B=N[w.id];for(let L in B)h(B[L].object),delete B[L];delete N[w.id]}}function C(){E(),o=!0,s!==r&&(s=r,c(s.object))}function E(){r.geometry=null,r.program=null,r.wireframe=!1}return{setup:a,reset:C,resetDefaultState:E,dispose:M,releaseStatesOfGeometry:b,releaseStatesOfProgram:A,initAttributes:_,enableAttribute:g,disableUnusedAttributes:x}}function aS(t,e,n){let i;function r(c){i=c}function s(c,h){t.drawArrays(i,c,h),n.update(h,i,1)}function o(c,h,u){u!==0&&(t.drawArraysInstanced(i,c,h,u),n.update(h,i,u))}function a(c,h,u){if(u===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(i,c,0,h,0,u);let f=0;for(let m=0;m<u;m++)f+=h[m];n.update(f,i,1)}function l(c,h,u,d){if(u===0)return;let f=e.get("WEBGL_multi_draw");if(f===null)for(let m=0;m<c.length;m++)o(c[m],h[m],d[m]);else{f.multiDrawArraysInstancedWEBGL(i,c,0,h,0,d,0,u);let m=0;for(let _=0;_<u;_++)m+=h[_]*d[_];n.update(m,i,1)}}this.setMode=r,this.render=s,this.renderInstances=o,this.renderMultiDraw=a,this.renderMultiDrawInstances=l}function cS(t,e,n,i){let r;function s(){if(r!==void 0)return r;if(e.has("EXT_texture_filter_anisotropic")===!0){let A=e.get("EXT_texture_filter_anisotropic");r=t.getParameter(A.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else r=0;return r}function o(A){return!(A!==jn&&i.convert(A)!==t.getParameter(t.IMPLEMENTATION_COLOR_READ_FORMAT))}function a(A){let C=A===Wn&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(A!==ri&&i.convert(A)!==t.getParameter(t.IMPLEMENTATION_COLOR_READ_TYPE)&&A!==vi&&!C)}function l(A){if(A==="highp"){if(t.getShaderPrecisionFormat(t.VERTEX_SHADER,t.HIGH_FLOAT).precision>0&&t.getShaderPrecisionFormat(t.FRAGMENT_SHADER,t.HIGH_FLOAT).precision>0)return"highp";A="mediump"}return A==="mediump"&&t.getShaderPrecisionFormat(t.VERTEX_SHADER,t.MEDIUM_FLOAT).precision>0&&t.getShaderPrecisionFormat(t.FRAGMENT_SHADER,t.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let c=n.precision!==void 0?n.precision:"highp",h=l(c);h!==c&&(console.warn("THREE.WebGLRenderer:",c,"not supported, using",h,"instead."),c=h);let u=n.logarithmicDepthBuffer===!0,d=n.reversedDepthBuffer===!0&&e.has("EXT_clip_control"),f=t.getParameter(t.MAX_TEXTURE_IMAGE_UNITS),m=t.getParameter(t.MAX_VERTEX_TEXTURE_IMAGE_UNITS),_=t.getParameter(t.MAX_TEXTURE_SIZE),g=t.getParameter(t.MAX_CUBE_MAP_TEXTURE_SIZE),p=t.getParameter(t.MAX_VERTEX_ATTRIBS),x=t.getParameter(t.MAX_VERTEX_UNIFORM_VECTORS),y=t.getParameter(t.MAX_VARYING_VECTORS),v=t.getParameter(t.MAX_FRAGMENT_UNIFORM_VECTORS),M=m>0,b=t.getParameter(t.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:s,getMaxPrecision:l,textureFormatReadable:o,textureTypeReadable:a,precision:c,logarithmicDepthBuffer:u,reversedDepthBuffer:d,maxTextures:f,maxVertexTextures:m,maxTextureSize:_,maxCubemapSize:g,maxAttributes:p,maxVertexUniforms:x,maxVaryings:y,maxFragmentUniforms:v,vertexTextures:M,maxSamples:b}}function lS(t){let e=this,n=null,i=0,r=!1,s=!1,o=new _n,a=new Je,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(u,d){let f=u.length!==0||d||i!==0||r;return r=d,i=u.length,f},this.beginShadows=function(){s=!0,h(null)},this.endShadows=function(){s=!1},this.setGlobalState=function(u,d){n=h(u,d,0)},this.setState=function(u,d,f){let m=u.clippingPlanes,_=u.clipIntersection,g=u.clipShadows,p=t.get(u);if(!r||m===null||m.length===0||s&&!g)s?h(null):c();else{let x=s?0:i,y=x*4,v=p.clippingState||null;l.value=v,v=h(m,d,y,f);for(let M=0;M!==y;++M)v[M]=n[M];p.clippingState=v,this.numIntersection=_?this.numPlanes:0,this.numPlanes+=x}};function c(){l.value!==n&&(l.value=n,l.needsUpdate=i>0),e.numPlanes=i,e.numIntersection=0}function h(u,d,f,m){let _=u!==null?u.length:0,g=null;if(_!==0){if(g=l.value,m!==!0||g===null){let p=f+_*4,x=d.matrixWorldInverse;a.getNormalMatrix(x),(g===null||g.length<p)&&(g=new Float32Array(p));for(let y=0,v=f;y!==_;++y,v+=4)o.copy(u[y]).applyMatrix4(x,a),o.normal.toArray(g,v),g[v+3]=o.constant}l.value=g,l.needsUpdate=!0}return e.numPlanes=_,e.numIntersection=0,g}}function hS(t){let e=new WeakMap;function n(o,a){return a===al?o.mapping=Nr:a===cl&&(o.mapping=Fr),o}function i(o){if(o&&o.isTexture){let a=o.mapping;if(a===al||a===cl)if(e.has(o)){let l=e.get(o).texture;return n(l,o.mapping)}else{let l=o.image;if(l&&l.height>0){let c=new bc(l.height);return c.fromEquirectangularTexture(t,o),e.set(o,c),o.addEventListener("dispose",r),n(c.texture,o.mapping)}else return null}}return o}function r(o){let a=o.target;a.removeEventListener("dispose",r);let l=e.get(a);l!==void 0&&(e.delete(a),l.dispose())}function s(){e=new WeakMap}return{get:i,dispose:s}}var zs=4,Gm=[.125,.215,.35,.446,.526,.582],Vr=20,pf=new Lr,Wm=new Oe,mf=null,gf=0,_f=0,vf=!1,Br=(1+Math.sqrt(5))/2,Us=1/Br,jm=[new R(-Br,Us,0),new R(Br,Us,0),new R(-Us,0,Br),new R(Us,0,Br),new R(0,Br,-Us),new R(0,Br,Us),new R(-1,1,-1),new R(1,1,-1),new R(-1,1,1),new R(1,1,1)],uS=new R,$l=class{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene(e,n=0,i=.1,r=100,s={}){let{size:o=256,position:a=uS}=s;mf=this._renderer.getRenderTarget(),gf=this._renderer.getActiveCubeFace(),_f=this._renderer.getActiveMipmapLevel(),vf=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(o);let l=this._allocateTargets();return l.depthBuffer=!0,this._sceneToCubeUV(e,i,r,l,a),n>0&&this._blur(l,0,0,n),this._applyPMREM(l),this._cleanup(l),l}fromEquirectangular(e,n=null){return this._fromTexture(e,n)}fromCubemap(e,n=null){return this._fromTexture(e,n)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=$m(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Xm(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose()}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodPlanes.length;e++)this._lodPlanes[e].dispose()}_cleanup(e){this._renderer.setRenderTarget(mf,gf,_f),this._renderer.xr.enabled=vf,e.scissorTest=!1,ql(e,0,0,e.width,e.height)}_fromTexture(e,n){e.mapping===Nr||e.mapping===Fr?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),mf=this._renderer.getRenderTarget(),gf=this._renderer.getActiveCubeFace(),_f=this._renderer.getActiveMipmapLevel(),vf=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;let i=n||this._allocateTargets();return this._textureToCubeUV(e,i),this._applyPMREM(i),this._cleanup(i),i}_allocateTargets(){let e=3*Math.max(this._cubeSize,112),n=4*this._cubeSize,i={magFilter:ti,minFilter:ti,generateMipmaps:!1,type:Wn,format:jn,colorSpace:Pr,depthBuffer:!1},r=qm(e,n,i);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==n){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=qm(e,n,i);let{_lodMax:s}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=fS(s)),this._blurMaterial=dS(s,e,n)}return r}_compileMaterial(e){let n=new It(this._lodPlanes[0],e);this._renderer.compile(n,pf)}_sceneToCubeUV(e,n,i,r,s){let l=new Kt(90,1,n,i),c=[1,-1,1,1,1,1],h=[1,1,1,-1,-1,-1],u=this._renderer,d=u.autoClear,f=u.toneMapping;u.getClearColor(Wm),u.toneMapping=zi,u.autoClear=!1,u.state.buffers.depth.getReversed()&&(u.setRenderTarget(r),u.clearDepth(),u.setRenderTarget(null));let _=new Cn({name:"PMREM.Background",side:Jt,depthWrite:!1,depthTest:!1}),g=new It(new Es,_),p=!1,x=e.background;x?x.isColor&&(_.color.copy(x),e.background=null,p=!0):(_.color.copy(Wm),p=!0);for(let y=0;y<6;y++){let v=y%3;v===0?(l.up.set(0,c[y],0),l.position.set(s.x,s.y,s.z),l.lookAt(s.x+h[y],s.y,s.z)):v===1?(l.up.set(0,0,c[y]),l.position.set(s.x,s.y,s.z),l.lookAt(s.x,s.y+h[y],s.z)):(l.up.set(0,c[y],0),l.position.set(s.x,s.y,s.z),l.lookAt(s.x,s.y,s.z+h[y]));let M=this._cubeSize;ql(r,v*M,y>2?M:0,M,M),u.setRenderTarget(r),p&&u.render(g,l),u.render(e,l)}g.geometry.dispose(),g.material.dispose(),u.toneMapping=f,u.autoClear=d,e.background=x}_textureToCubeUV(e,n){let i=this._renderer,r=e.mapping===Nr||e.mapping===Fr;r?(this._cubemapMaterial===null&&(this._cubemapMaterial=$m()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Xm());let s=r?this._cubemapMaterial:this._equirectMaterial,o=new It(this._lodPlanes[0],s),a=s.uniforms;a.envMap.value=e;let l=this._cubeSize;ql(n,0,0,3*l,2*l),i.setRenderTarget(n),i.render(o,pf)}_applyPMREM(e){let n=this._renderer,i=n.autoClear;n.autoClear=!1;let r=this._lodPlanes.length;for(let s=1;s<r;s++){let o=Math.sqrt(this._sigmas[s]*this._sigmas[s]-this._sigmas[s-1]*this._sigmas[s-1]),a=jm[(r-s-1)%jm.length];this._blur(e,s-1,s,o,a)}n.autoClear=i}_blur(e,n,i,r,s){let o=this._pingPongRenderTarget;this._halfBlur(e,o,n,i,r,"latitudinal",s),this._halfBlur(o,e,i,i,r,"longitudinal",s)}_halfBlur(e,n,i,r,s,o,a){let l=this._renderer,c=this._blurMaterial;o!=="latitudinal"&&o!=="longitudinal"&&console.error("blur direction must be either latitudinal or longitudinal!");let h=3,u=new It(this._lodPlanes[r],c),d=c.uniforms,f=this._sizeLods[i]-1,m=isFinite(s)?Math.PI/(2*f):2*Math.PI/(2*Vr-1),_=s/m,g=isFinite(s)?1+Math.floor(h*_):Vr;g>Vr&&console.warn(`sigmaRadians, ${s}, is too large and will clip, as it requested ${g} samples when the maximum is set to ${Vr}`);let p=[],x=0;for(let A=0;A<Vr;++A){let C=A/_,E=Math.exp(-C*C/2);p.push(E),A===0?x+=E:A<g&&(x+=2*E)}for(let A=0;A<p.length;A++)p[A]=p[A]/x;d.envMap.value=e.texture,d.samples.value=g,d.weights.value=p,d.latitudinal.value=o==="latitudinal",a&&(d.poleAxis.value=a);let{_lodMax:y}=this;d.dTheta.value=m,d.mipInt.value=y-i;let v=this._sizeLods[r],M=3*v*(r>y-zs?r-y+zs:0),b=4*(this._cubeSize-v);ql(n,M,b,3*v,2*v),l.setRenderTarget(n),l.render(u,pf)}};function fS(t){let e=[],n=[],i=[],r=t,s=t-zs+1+Gm.length;for(let o=0;o<s;o++){let a=Math.pow(2,r);n.push(a);let l=1/a;o>t-zs?l=Gm[o-t+zs-1]:o===0&&(l=0),i.push(l);let c=1/(a-2),h=-c,u=1+c,d=[h,h,u,h,u,u,h,h,u,u,h,u],f=6,m=6,_=3,g=2,p=1,x=new Float32Array(_*m*f),y=new Float32Array(g*m*f),v=new Float32Array(p*m*f);for(let b=0;b<f;b++){let A=b%3*2/3-1,C=b>2?0:-1,E=[A,C,0,A+2/3,C,0,A+2/3,C+1,0,A,C,0,A+2/3,C+1,0,A,C+1,0];x.set(E,_*m*b),y.set(d,g*m*b);let w=[b,b,b,b,b,b];v.set(w,p*m*b)}let M=new St;M.setAttribute("position",new rn(x,_)),M.setAttribute("uv",new rn(y,g)),M.setAttribute("faceIndex",new rn(v,p)),e.push(M),r>zs&&r--}return{lodPlanes:e,sizeLods:n,sigmas:i}}function qm(t,e,n){let i=new sn(t,e,n);return i.texture.mapping=Qo,i.texture.name="PMREM.cubeUv",i.scissorTest=!0,i}function ql(t,e,n,i,r){t.viewport.set(e,n,i,r),t.scissor.set(e,n,i,r)}function dS(t,e,n){let i=new Float32Array(Vr),r=new R(0,1,0);return new Bt({name:"SphericalGaussianBlur",defines:{n:Vr,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/n,CUBEUV_MAX_MIP:`${t}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:i},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:r}},vertexShader:Rf(),fragmentShader:`

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
		`,blending:ii,depthTest:!1,depthWrite:!1})}function Xm(){return new Bt({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:Rf(),fragmentShader:`

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
		`,blending:ii,depthTest:!1,depthWrite:!1})}function $m(){return new Bt({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Rf(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:ii,depthTest:!1,depthWrite:!1})}function Rf(){return`

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
	`}function pS(t){let e=new WeakMap,n=null;function i(a){if(a&&a.isTexture){let l=a.mapping,c=l===al||l===cl,h=l===Nr||l===Fr;if(c||h){let u=e.get(a),d=u!==void 0?u.texture.pmremVersion:0;if(a.isRenderTargetTexture&&a.pmremVersion!==d)return n===null&&(n=new $l(t)),u=c?n.fromEquirectangular(a,u):n.fromCubemap(a,u),u.texture.pmremVersion=a.pmremVersion,e.set(a,u),u.texture;if(u!==void 0)return u.texture;{let f=a.image;return c&&f&&f.height>0||h&&f&&r(f)?(n===null&&(n=new $l(t)),u=c?n.fromEquirectangular(a):n.fromCubemap(a),u.texture.pmremVersion=a.pmremVersion,e.set(a,u),a.addEventListener("dispose",s),u.texture):null}}}return a}function r(a){let l=0,c=6;for(let h=0;h<c;h++)a[h]!==void 0&&l++;return l===c}function s(a){let l=a.target;l.removeEventListener("dispose",s);let c=e.get(l);c!==void 0&&(e.delete(l),c.dispose())}function o(){e=new WeakMap,n!==null&&(n.dispose(),n=null)}return{get:i,dispose:o}}function mS(t){let e={};function n(i){if(e[i]!==void 0)return e[i];let r;switch(i){case"WEBGL_depth_texture":r=t.getExtension("WEBGL_depth_texture")||t.getExtension("MOZ_WEBGL_depth_texture")||t.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":r=t.getExtension("EXT_texture_filter_anisotropic")||t.getExtension("MOZ_EXT_texture_filter_anisotropic")||t.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":r=t.getExtension("WEBGL_compressed_texture_s3tc")||t.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||t.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":r=t.getExtension("WEBGL_compressed_texture_pvrtc")||t.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:r=t.getExtension(i)}return e[i]=r,r}return{has:function(i){return n(i)!==null},init:function(){n("EXT_color_buffer_float"),n("WEBGL_clip_cull_distance"),n("OES_texture_float_linear"),n("EXT_color_buffer_half_float"),n("WEBGL_multisampled_render_to_texture"),n("WEBGL_render_shared_exponent")},get:function(i){let r=n(i);return r===null&&Ms("THREE.WebGLRenderer: "+i+" extension not supported."),r}}}function gS(t,e,n,i){let r={},s=new WeakMap;function o(u){let d=u.target;d.index!==null&&e.remove(d.index);for(let m in d.attributes)e.remove(d.attributes[m]);d.removeEventListener("dispose",o),delete r[d.id];let f=s.get(d);f&&(e.remove(f),s.delete(d)),i.releaseStatesOfGeometry(d),d.isInstancedBufferGeometry===!0&&delete d._maxInstanceCount,n.memory.geometries--}function a(u,d){return r[d.id]===!0||(d.addEventListener("dispose",o),r[d.id]=!0,n.memory.geometries++),d}function l(u){let d=u.attributes;for(let f in d)e.update(d[f],t.ARRAY_BUFFER)}function c(u){let d=[],f=u.index,m=u.attributes.position,_=0;if(f!==null){let x=f.array;_=f.version;for(let y=0,v=x.length;y<v;y+=3){let M=x[y+0],b=x[y+1],A=x[y+2];d.push(M,b,b,A,A,M)}}else if(m!==void 0){let x=m.array;_=m.version;for(let y=0,v=x.length/3-1;y<v;y+=3){let M=y+0,b=y+1,A=y+2;d.push(M,b,b,A,A,M)}}else return;let g=new(cf(d)?Ro:Co)(d,1);g.version=_;let p=s.get(u);p&&e.remove(p),s.set(u,g)}function h(u){let d=s.get(u);if(d){let f=u.index;f!==null&&d.version<f.version&&c(u)}else c(u);return s.get(u)}return{get:a,update:l,getWireframeAttribute:h}}function _S(t,e,n){let i;function r(d){i=d}let s,o;function a(d){s=d.type,o=d.bytesPerElement}function l(d,f){t.drawElements(i,f,s,d*o),n.update(f,i,1)}function c(d,f,m){m!==0&&(t.drawElementsInstanced(i,f,s,d*o,m),n.update(f,i,m))}function h(d,f,m){if(m===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(i,f,0,s,d,0,m);let g=0;for(let p=0;p<m;p++)g+=f[p];n.update(g,i,1)}function u(d,f,m,_){if(m===0)return;let g=e.get("WEBGL_multi_draw");if(g===null)for(let p=0;p<d.length;p++)c(d[p]/o,f[p],_[p]);else{g.multiDrawElementsInstancedWEBGL(i,f,0,s,d,0,_,0,m);let p=0;for(let x=0;x<m;x++)p+=f[x]*_[x];n.update(p,i,1)}}this.setMode=r,this.setIndex=a,this.render=l,this.renderInstances=c,this.renderMultiDraw=h,this.renderMultiDrawInstances=u}function vS(t){let e={geometries:0,textures:0},n={frame:0,calls:0,triangles:0,points:0,lines:0};function i(s,o,a){switch(n.calls++,o){case t.TRIANGLES:n.triangles+=a*(s/3);break;case t.LINES:n.lines+=a*(s/2);break;case t.LINE_STRIP:n.lines+=a*(s-1);break;case t.LINE_LOOP:n.lines+=a*s;break;case t.POINTS:n.points+=a*s;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",o);break}}function r(){n.calls=0,n.triangles=0,n.points=0,n.lines=0}return{memory:e,render:n,programs:null,autoReset:!0,reset:r,update:i}}function yS(t,e,n){let i=new WeakMap,r=new mt;function s(o,a,l){let c=o.morphTargetInfluences,h=a.morphAttributes.position||a.morphAttributes.normal||a.morphAttributes.color,u=h!==void 0?h.length:0,d=i.get(a);if(d===void 0||d.count!==u){let E=function(){A.dispose(),i.delete(a),a.removeEventListener("dispose",E)};d!==void 0&&d.texture.dispose();let f=a.morphAttributes.position!==void 0,m=a.morphAttributes.normal!==void 0,_=a.morphAttributes.color!==void 0,g=a.morphAttributes.position||[],p=a.morphAttributes.normal||[],x=a.morphAttributes.color||[],y=0;f===!0&&(y=1),m===!0&&(y=2),_===!0&&(y=3);let v=a.attributes.position.count*y,M=1;v>e.maxTextureSize&&(M=Math.ceil(v/e.maxTextureSize),v=e.maxTextureSize);let b=new Float32Array(v*M*4*u),A=new Ao(b,v,M,u);A.type=vi,A.needsUpdate=!0;let C=y*4;for(let w=0;w<u;w++){let I=g[w],N=p[w],B=x[w],L=v*M*4*w;for(let D=0;D<I.count;D++){let F=D*C;f===!0&&(r.fromBufferAttribute(I,D),b[L+F+0]=r.x,b[L+F+1]=r.y,b[L+F+2]=r.z,b[L+F+3]=0),m===!0&&(r.fromBufferAttribute(N,D),b[L+F+4]=r.x,b[L+F+5]=r.y,b[L+F+6]=r.z,b[L+F+7]=0),_===!0&&(r.fromBufferAttribute(B,D),b[L+F+8]=r.x,b[L+F+9]=r.y,b[L+F+10]=r.z,b[L+F+11]=B.itemSize===4?r.w:1)}}d={count:u,texture:A,size:new ne(v,M)},i.set(a,d),a.addEventListener("dispose",E)}if(o.isInstancedMesh===!0&&o.morphTexture!==null)l.getUniforms().setValue(t,"morphTexture",o.morphTexture,n);else{let f=0;for(let _=0;_<c.length;_++)f+=c[_];let m=a.morphTargetsRelative?1:1-f;l.getUniforms().setValue(t,"morphTargetBaseInfluence",m),l.getUniforms().setValue(t,"morphTargetInfluences",c)}l.getUniforms().setValue(t,"morphTargetsTexture",d.texture,n),l.getUniforms().setValue(t,"morphTargetsTextureSize",d.size)}return{update:s}}function xS(t,e,n,i){let r=new WeakMap;function s(l){let c=i.render.frame,h=l.geometry,u=e.get(l,h);if(r.get(u)!==c&&(e.update(u),r.set(u,c)),l.isInstancedMesh&&(l.hasEventListener("dispose",a)===!1&&l.addEventListener("dispose",a),r.get(l)!==c&&(n.update(l.instanceMatrix,t.ARRAY_BUFFER),l.instanceColor!==null&&n.update(l.instanceColor,t.ARRAY_BUFFER),r.set(l,c))),l.isSkinnedMesh){let d=l.skeleton;r.get(d)!==c&&(d.update(),r.set(d,c))}return u}function o(){r=new WeakMap}function a(l){let c=l.target;c.removeEventListener("dispose",a),n.remove(c.instanceMatrix),c.instanceColor!==null&&n.remove(c.instanceColor)}return{update:s,dispose:o}}var dg=new un,Ym=new Uo(1,1),pg=new Ao,mg=new yc,gg=new Io,Zm=[],Km=[],Jm=new Float32Array(16),Qm=new Float32Array(9),eg=new Float32Array(4);function Bs(t,e,n){let i=t[0];if(i<=0||i>0)return t;let r=e*n,s=Zm[r];if(s===void 0&&(s=new Float32Array(r),Zm[r]=s),e!==0){i.toArray(s,0);for(let o=1,a=0;o!==e;++o)a+=n,t[o].toArray(s,a)}return s}function Gt(t,e){if(t.length!==e.length)return!1;for(let n=0,i=t.length;n<i;n++)if(t[n]!==e[n])return!1;return!0}function Wt(t,e){for(let n=0,i=e.length;n<i;n++)t[n]=e[n]}function Zl(t,e){let n=Km[e];n===void 0&&(n=new Int32Array(e),Km[e]=n);for(let i=0;i!==e;++i)n[i]=t.allocateTextureUnit();return n}function bS(t,e){let n=this.cache;n[0]!==e&&(t.uniform1f(this.addr,e),n[0]=e)}function MS(t,e){let n=this.cache;if(e.x!==void 0)(n[0]!==e.x||n[1]!==e.y)&&(t.uniform2f(this.addr,e.x,e.y),n[0]=e.x,n[1]=e.y);else{if(Gt(n,e))return;t.uniform2fv(this.addr,e),Wt(n,e)}}function SS(t,e){let n=this.cache;if(e.x!==void 0)(n[0]!==e.x||n[1]!==e.y||n[2]!==e.z)&&(t.uniform3f(this.addr,e.x,e.y,e.z),n[0]=e.x,n[1]=e.y,n[2]=e.z);else if(e.r!==void 0)(n[0]!==e.r||n[1]!==e.g||n[2]!==e.b)&&(t.uniform3f(this.addr,e.r,e.g,e.b),n[0]=e.r,n[1]=e.g,n[2]=e.b);else{if(Gt(n,e))return;t.uniform3fv(this.addr,e),Wt(n,e)}}function wS(t,e){let n=this.cache;if(e.x!==void 0)(n[0]!==e.x||n[1]!==e.y||n[2]!==e.z||n[3]!==e.w)&&(t.uniform4f(this.addr,e.x,e.y,e.z,e.w),n[0]=e.x,n[1]=e.y,n[2]=e.z,n[3]=e.w);else{if(Gt(n,e))return;t.uniform4fv(this.addr,e),Wt(n,e)}}function ES(t,e){let n=this.cache,i=e.elements;if(i===void 0){if(Gt(n,e))return;t.uniformMatrix2fv(this.addr,!1,e),Wt(n,e)}else{if(Gt(n,i))return;eg.set(i),t.uniformMatrix2fv(this.addr,!1,eg),Wt(n,i)}}function TS(t,e){let n=this.cache,i=e.elements;if(i===void 0){if(Gt(n,e))return;t.uniformMatrix3fv(this.addr,!1,e),Wt(n,e)}else{if(Gt(n,i))return;Qm.set(i),t.uniformMatrix3fv(this.addr,!1,Qm),Wt(n,i)}}function AS(t,e){let n=this.cache,i=e.elements;if(i===void 0){if(Gt(n,e))return;t.uniformMatrix4fv(this.addr,!1,e),Wt(n,e)}else{if(Gt(n,i))return;Jm.set(i),t.uniformMatrix4fv(this.addr,!1,Jm),Wt(n,i)}}function CS(t,e){let n=this.cache;n[0]!==e&&(t.uniform1i(this.addr,e),n[0]=e)}function RS(t,e){let n=this.cache;if(e.x!==void 0)(n[0]!==e.x||n[1]!==e.y)&&(t.uniform2i(this.addr,e.x,e.y),n[0]=e.x,n[1]=e.y);else{if(Gt(n,e))return;t.uniform2iv(this.addr,e),Wt(n,e)}}function PS(t,e){let n=this.cache;if(e.x!==void 0)(n[0]!==e.x||n[1]!==e.y||n[2]!==e.z)&&(t.uniform3i(this.addr,e.x,e.y,e.z),n[0]=e.x,n[1]=e.y,n[2]=e.z);else{if(Gt(n,e))return;t.uniform3iv(this.addr,e),Wt(n,e)}}function IS(t,e){let n=this.cache;if(e.x!==void 0)(n[0]!==e.x||n[1]!==e.y||n[2]!==e.z||n[3]!==e.w)&&(t.uniform4i(this.addr,e.x,e.y,e.z,e.w),n[0]=e.x,n[1]=e.y,n[2]=e.z,n[3]=e.w);else{if(Gt(n,e))return;t.uniform4iv(this.addr,e),Wt(n,e)}}function DS(t,e){let n=this.cache;n[0]!==e&&(t.uniform1ui(this.addr,e),n[0]=e)}function LS(t,e){let n=this.cache;if(e.x!==void 0)(n[0]!==e.x||n[1]!==e.y)&&(t.uniform2ui(this.addr,e.x,e.y),n[0]=e.x,n[1]=e.y);else{if(Gt(n,e))return;t.uniform2uiv(this.addr,e),Wt(n,e)}}function OS(t,e){let n=this.cache;if(e.x!==void 0)(n[0]!==e.x||n[1]!==e.y||n[2]!==e.z)&&(t.uniform3ui(this.addr,e.x,e.y,e.z),n[0]=e.x,n[1]=e.y,n[2]=e.z);else{if(Gt(n,e))return;t.uniform3uiv(this.addr,e),Wt(n,e)}}function NS(t,e){let n=this.cache;if(e.x!==void 0)(n[0]!==e.x||n[1]!==e.y||n[2]!==e.z||n[3]!==e.w)&&(t.uniform4ui(this.addr,e.x,e.y,e.z,e.w),n[0]=e.x,n[1]=e.y,n[2]=e.z,n[3]=e.w);else{if(Gt(n,e))return;t.uniform4uiv(this.addr,e),Wt(n,e)}}function FS(t,e,n){let i=this.cache,r=n.allocateTextureUnit();i[0]!==r&&(t.uniform1i(this.addr,r),i[0]=r);let s;this.type===t.SAMPLER_2D_SHADOW?(Ym.compareFunction=sf,s=Ym):s=dg,n.setTexture2D(e||s,r)}function US(t,e,n){let i=this.cache,r=n.allocateTextureUnit();i[0]!==r&&(t.uniform1i(this.addr,r),i[0]=r),n.setTexture3D(e||mg,r)}function zS(t,e,n){let i=this.cache,r=n.allocateTextureUnit();i[0]!==r&&(t.uniform1i(this.addr,r),i[0]=r),n.setTextureCube(e||gg,r)}function kS(t,e,n){let i=this.cache,r=n.allocateTextureUnit();i[0]!==r&&(t.uniform1i(this.addr,r),i[0]=r),n.setTexture2DArray(e||pg,r)}function BS(t){switch(t){case 5126:return bS;case 35664:return MS;case 35665:return SS;case 35666:return wS;case 35674:return ES;case 35675:return TS;case 35676:return AS;case 5124:case 35670:return CS;case 35667:case 35671:return RS;case 35668:case 35672:return PS;case 35669:case 35673:return IS;case 5125:return DS;case 36294:return LS;case 36295:return OS;case 36296:return NS;case 35678:case 36198:case 36298:case 36306:case 35682:return FS;case 35679:case 36299:case 36307:return US;case 35680:case 36300:case 36308:case 36293:return zS;case 36289:case 36303:case 36311:case 36292:return kS}}function VS(t,e){t.uniform1fv(this.addr,e)}function HS(t,e){let n=Bs(e,this.size,2);t.uniform2fv(this.addr,n)}function GS(t,e){let n=Bs(e,this.size,3);t.uniform3fv(this.addr,n)}function WS(t,e){let n=Bs(e,this.size,4);t.uniform4fv(this.addr,n)}function jS(t,e){let n=Bs(e,this.size,4);t.uniformMatrix2fv(this.addr,!1,n)}function qS(t,e){let n=Bs(e,this.size,9);t.uniformMatrix3fv(this.addr,!1,n)}function XS(t,e){let n=Bs(e,this.size,16);t.uniformMatrix4fv(this.addr,!1,n)}function $S(t,e){t.uniform1iv(this.addr,e)}function YS(t,e){t.uniform2iv(this.addr,e)}function ZS(t,e){t.uniform3iv(this.addr,e)}function KS(t,e){t.uniform4iv(this.addr,e)}function JS(t,e){t.uniform1uiv(this.addr,e)}function QS(t,e){t.uniform2uiv(this.addr,e)}function ew(t,e){t.uniform3uiv(this.addr,e)}function tw(t,e){t.uniform4uiv(this.addr,e)}function nw(t,e,n){let i=this.cache,r=e.length,s=Zl(n,r);Gt(i,s)||(t.uniform1iv(this.addr,s),Wt(i,s));for(let o=0;o!==r;++o)n.setTexture2D(e[o]||dg,s[o])}function iw(t,e,n){let i=this.cache,r=e.length,s=Zl(n,r);Gt(i,s)||(t.uniform1iv(this.addr,s),Wt(i,s));for(let o=0;o!==r;++o)n.setTexture3D(e[o]||mg,s[o])}function rw(t,e,n){let i=this.cache,r=e.length,s=Zl(n,r);Gt(i,s)||(t.uniform1iv(this.addr,s),Wt(i,s));for(let o=0;o!==r;++o)n.setTextureCube(e[o]||gg,s[o])}function sw(t,e,n){let i=this.cache,r=e.length,s=Zl(n,r);Gt(i,s)||(t.uniform1iv(this.addr,s),Wt(i,s));for(let o=0;o!==r;++o)n.setTexture2DArray(e[o]||pg,s[o])}function ow(t){switch(t){case 5126:return VS;case 35664:return HS;case 35665:return GS;case 35666:return WS;case 35674:return jS;case 35675:return qS;case 35676:return XS;case 5124:case 35670:return $S;case 35667:case 35671:return YS;case 35668:case 35672:return ZS;case 35669:case 35673:return KS;case 5125:return JS;case 36294:return QS;case 36295:return ew;case 36296:return tw;case 35678:case 36198:case 36298:case 36306:case 35682:return nw;case 35679:case 36299:case 36307:return iw;case 35680:case 36300:case 36308:case 36293:return rw;case 36289:case 36303:case 36311:case 36292:return sw}}var xf=class{constructor(e,n,i){this.id=e,this.addr=i,this.cache=[],this.type=n.type,this.setValue=BS(n.type)}},bf=class{constructor(e,n,i){this.id=e,this.addr=i,this.cache=[],this.type=n.type,this.size=n.size,this.setValue=ow(n.type)}},Mf=class{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,n,i){let r=this.seq;for(let s=0,o=r.length;s!==o;++s){let a=r[s];a.setValue(e,n[a.id],i)}}},yf=/(\w+)(\])?(\[|\.)?/g;function tg(t,e){t.seq.push(e),t.map[e.id]=e}function aw(t,e,n){let i=t.name,r=i.length;for(yf.lastIndex=0;;){let s=yf.exec(i),o=yf.lastIndex,a=s[1],l=s[2]==="]",c=s[3];if(l&&(a=a|0),c===void 0||c==="["&&o+2===r){tg(n,c===void 0?new xf(a,t,e):new bf(a,t,e));break}else{let u=n.map[a];u===void 0&&(u=new Mf(a),tg(n,u)),n=u}}}var ks=class{constructor(e,n){this.seq=[],this.map={};let i=e.getProgramParameter(n,e.ACTIVE_UNIFORMS);for(let r=0;r<i;++r){let s=e.getActiveUniform(n,r),o=e.getUniformLocation(n,s.name);aw(s,o,this)}}setValue(e,n,i,r){let s=this.map[n];s!==void 0&&s.setValue(e,i,r)}setOptional(e,n,i){let r=n[i];r!==void 0&&this.setValue(e,i,r)}static upload(e,n,i,r){for(let s=0,o=n.length;s!==o;++s){let a=n[s],l=i[a.id];l.needsUpdate!==!1&&a.setValue(e,l.value,r)}}static seqWithValue(e,n){let i=[];for(let r=0,s=e.length;r!==s;++r){let o=e[r];o.id in n&&i.push(o)}return i}};function ng(t,e,n){let i=t.createShader(e);return t.shaderSource(i,n),t.compileShader(i),i}var cw=37297,lw=0;function hw(t,e){let n=t.split(`
`),i=[],r=Math.max(e-6,0),s=Math.min(e+6,n.length);for(let o=r;o<s;o++){let a=o+1;i.push(`${a===e?">":" "} ${a}: ${n[o]}`)}return i.join(`
`)}var ig=new Je;function uw(t){ot._getMatrix(ig,ot.workingColorSpace,t);let e=`mat3( ${ig.elements.map(n=>n.toFixed(4))} )`;switch(ot.getTransfer(t)){case Eo:return[e,"LinearTransferOETF"];case ht:return[e,"sRGBTransferOETF"];default:return console.warn("THREE.WebGLProgram: Unsupported color space: ",t),[e,"LinearTransferOETF"]}}function rg(t,e,n){let i=t.getShaderParameter(e,t.COMPILE_STATUS),s=(t.getShaderInfoLog(e)||"").trim();if(i&&s==="")return"";let o=/ERROR: 0:(\d+)/.exec(s);if(o){let a=parseInt(o[1]);return n.toUpperCase()+`

`+s+`

`+hw(t.getShaderSource(e),a)}else return s}function fw(t,e){let n=uw(e);return[`vec4 ${t}( vec4 value ) {`,`	return ${n[1]}( vec4( value.rgb * ${n[0]}, value.a ) );`,"}"].join(`
`)}function dw(t,e){let n;switch(e){case el:n="Linear";break;case tl:n="Reinhard";break;case nl:n="Cineon";break;case il:n="ACESFilmic";break;case sl:n="AgX";break;case ol:n="Neutral";break;case rl:n="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",e),n="Linear"}return"vec3 "+t+"( vec3 color ) { return "+n+"ToneMapping( color ); }"}var Xl=new R;function pw(){ot.getLuminanceCoefficients(Xl);let t=Xl.x.toFixed(4),e=Xl.y.toFixed(4),n=Xl.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${t}, ${e}, ${n} );`,"	return dot( weights, rgb );","}"].join(`
`)}function mw(t){return[t.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",t.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(sa).join(`
`)}function gw(t){let e=[];for(let n in t){let i=t[n];i!==!1&&e.push("#define "+n+" "+i)}return e.join(`
`)}function _w(t,e){let n={},i=t.getProgramParameter(e,t.ACTIVE_ATTRIBUTES);for(let r=0;r<i;r++){let s=t.getActiveAttrib(e,r),o=s.name,a=1;s.type===t.FLOAT_MAT2&&(a=2),s.type===t.FLOAT_MAT3&&(a=3),s.type===t.FLOAT_MAT4&&(a=4),n[o]={type:s.type,location:t.getAttribLocation(e,o),locationSize:a}}return n}function sa(t){return t!==""}function sg(t,e){let n=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return t.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,n).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function og(t,e){return t.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}var vw=/^[ \t]*#include +<([\w\d./]+)>/gm;function Sf(t){return t.replace(vw,xw)}var yw=new Map;function xw(t,e){let n=it[e];if(n===void 0){let i=yw.get(e);if(i!==void 0)n=it[i],console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,i);else throw new Error("Can not resolve #include <"+e+">")}return Sf(n)}var bw=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function ag(t){return t.replace(bw,Mw)}function Mw(t,e,n,i){let r="";for(let s=parseInt(e);s<parseInt(n);s++)r+=i.replace(/\[\s*i\s*\]/g,"[ "+s+" ]").replace(/UNROLLED_LOOP_INDEX/g,s);return r}function cg(t){let e=`precision ${t.precision} float;
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
#define LOW_PRECISION`),e}function Sw(t){let e="SHADOWMAP_TYPE_BASIC";return t.shadowMapType===qu?e="SHADOWMAP_TYPE_PCF":t.shadowMapType===om?e="SHADOWMAP_TYPE_PCF_SOFT":t.shadowMapType===gi&&(e="SHADOWMAP_TYPE_VSM"),e}function ww(t){let e="ENVMAP_TYPE_CUBE";if(t.envMap)switch(t.envMapMode){case Nr:case Fr:e="ENVMAP_TYPE_CUBE";break;case Qo:e="ENVMAP_TYPE_CUBE_UV";break}return e}function Ew(t){let e="ENVMAP_MODE_REFLECTION";return t.envMap&&t.envMapMode===Fr&&(e="ENVMAP_MODE_REFRACTION"),e}function Tw(t){let e="ENVMAP_BLENDING_NONE";if(t.envMap)switch(t.combine){case Qc:e="ENVMAP_BLENDING_MULTIPLY";break;case Em:e="ENVMAP_BLENDING_MIX";break;case Tm:e="ENVMAP_BLENDING_ADD";break}return e}function Aw(t){let e=t.envMapCubeUVHeight;if(e===null)return null;let n=Math.log2(e)-2,i=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,n),112)),texelHeight:i,maxMip:n}}function Cw(t,e,n,i){let r=t.getContext(),s=n.defines,o=n.vertexShader,a=n.fragmentShader,l=Sw(n),c=ww(n),h=Ew(n),u=Tw(n),d=Aw(n),f=mw(n),m=gw(s),_=r.createProgram(),g,p,x=n.glslVersion?"#version "+n.glslVersion+`
`:"";n.isRawShaderMaterial?(g=["#define SHADER_TYPE "+n.shaderType,"#define SHADER_NAME "+n.shaderName,m].filter(sa).join(`
`),g.length>0&&(g+=`
`),p=["#define SHADER_TYPE "+n.shaderType,"#define SHADER_NAME "+n.shaderName,m].filter(sa).join(`
`),p.length>0&&(p+=`
`)):(g=[cg(n),"#define SHADER_TYPE "+n.shaderType,"#define SHADER_NAME "+n.shaderName,m,n.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",n.batching?"#define USE_BATCHING":"",n.batchingColor?"#define USE_BATCHING_COLOR":"",n.instancing?"#define USE_INSTANCING":"",n.instancingColor?"#define USE_INSTANCING_COLOR":"",n.instancingMorph?"#define USE_INSTANCING_MORPH":"",n.useFog&&n.fog?"#define USE_FOG":"",n.useFog&&n.fogExp2?"#define FOG_EXP2":"",n.map?"#define USE_MAP":"",n.envMap?"#define USE_ENVMAP":"",n.envMap?"#define "+h:"",n.lightMap?"#define USE_LIGHTMAP":"",n.aoMap?"#define USE_AOMAP":"",n.bumpMap?"#define USE_BUMPMAP":"",n.normalMap?"#define USE_NORMALMAP":"",n.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",n.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",n.displacementMap?"#define USE_DISPLACEMENTMAP":"",n.emissiveMap?"#define USE_EMISSIVEMAP":"",n.anisotropy?"#define USE_ANISOTROPY":"",n.anisotropyMap?"#define USE_ANISOTROPYMAP":"",n.clearcoatMap?"#define USE_CLEARCOATMAP":"",n.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",n.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",n.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",n.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",n.specularMap?"#define USE_SPECULARMAP":"",n.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",n.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",n.roughnessMap?"#define USE_ROUGHNESSMAP":"",n.metalnessMap?"#define USE_METALNESSMAP":"",n.alphaMap?"#define USE_ALPHAMAP":"",n.alphaHash?"#define USE_ALPHAHASH":"",n.transmission?"#define USE_TRANSMISSION":"",n.transmissionMap?"#define USE_TRANSMISSIONMAP":"",n.thicknessMap?"#define USE_THICKNESSMAP":"",n.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",n.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",n.mapUv?"#define MAP_UV "+n.mapUv:"",n.alphaMapUv?"#define ALPHAMAP_UV "+n.alphaMapUv:"",n.lightMapUv?"#define LIGHTMAP_UV "+n.lightMapUv:"",n.aoMapUv?"#define AOMAP_UV "+n.aoMapUv:"",n.emissiveMapUv?"#define EMISSIVEMAP_UV "+n.emissiveMapUv:"",n.bumpMapUv?"#define BUMPMAP_UV "+n.bumpMapUv:"",n.normalMapUv?"#define NORMALMAP_UV "+n.normalMapUv:"",n.displacementMapUv?"#define DISPLACEMENTMAP_UV "+n.displacementMapUv:"",n.metalnessMapUv?"#define METALNESSMAP_UV "+n.metalnessMapUv:"",n.roughnessMapUv?"#define ROUGHNESSMAP_UV "+n.roughnessMapUv:"",n.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+n.anisotropyMapUv:"",n.clearcoatMapUv?"#define CLEARCOATMAP_UV "+n.clearcoatMapUv:"",n.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+n.clearcoatNormalMapUv:"",n.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+n.clearcoatRoughnessMapUv:"",n.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+n.iridescenceMapUv:"",n.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+n.iridescenceThicknessMapUv:"",n.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+n.sheenColorMapUv:"",n.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+n.sheenRoughnessMapUv:"",n.specularMapUv?"#define SPECULARMAP_UV "+n.specularMapUv:"",n.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+n.specularColorMapUv:"",n.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+n.specularIntensityMapUv:"",n.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+n.transmissionMapUv:"",n.thicknessMapUv?"#define THICKNESSMAP_UV "+n.thicknessMapUv:"",n.vertexTangents&&n.flatShading===!1?"#define USE_TANGENT":"",n.vertexColors?"#define USE_COLOR":"",n.vertexAlphas?"#define USE_COLOR_ALPHA":"",n.vertexUv1s?"#define USE_UV1":"",n.vertexUv2s?"#define USE_UV2":"",n.vertexUv3s?"#define USE_UV3":"",n.pointsUvs?"#define USE_POINTS_UV":"",n.flatShading?"#define FLAT_SHADED":"",n.skinning?"#define USE_SKINNING":"",n.morphTargets?"#define USE_MORPHTARGETS":"",n.morphNormals&&n.flatShading===!1?"#define USE_MORPHNORMALS":"",n.morphColors?"#define USE_MORPHCOLORS":"",n.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+n.morphTextureStride:"",n.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+n.morphTargetsCount:"",n.doubleSided?"#define DOUBLE_SIDED":"",n.flipSided?"#define FLIP_SIDED":"",n.shadowMapEnabled?"#define USE_SHADOWMAP":"",n.shadowMapEnabled?"#define "+l:"",n.sizeAttenuation?"#define USE_SIZEATTENUATION":"",n.numLightProbes>0?"#define USE_LIGHT_PROBES":"",n.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",n.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(sa).join(`
`),p=[cg(n),"#define SHADER_TYPE "+n.shaderType,"#define SHADER_NAME "+n.shaderName,m,n.useFog&&n.fog?"#define USE_FOG":"",n.useFog&&n.fogExp2?"#define FOG_EXP2":"",n.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",n.map?"#define USE_MAP":"",n.matcap?"#define USE_MATCAP":"",n.envMap?"#define USE_ENVMAP":"",n.envMap?"#define "+c:"",n.envMap?"#define "+h:"",n.envMap?"#define "+u:"",d?"#define CUBEUV_TEXEL_WIDTH "+d.texelWidth:"",d?"#define CUBEUV_TEXEL_HEIGHT "+d.texelHeight:"",d?"#define CUBEUV_MAX_MIP "+d.maxMip+".0":"",n.lightMap?"#define USE_LIGHTMAP":"",n.aoMap?"#define USE_AOMAP":"",n.bumpMap?"#define USE_BUMPMAP":"",n.normalMap?"#define USE_NORMALMAP":"",n.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",n.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",n.emissiveMap?"#define USE_EMISSIVEMAP":"",n.anisotropy?"#define USE_ANISOTROPY":"",n.anisotropyMap?"#define USE_ANISOTROPYMAP":"",n.clearcoat?"#define USE_CLEARCOAT":"",n.clearcoatMap?"#define USE_CLEARCOATMAP":"",n.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",n.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",n.dispersion?"#define USE_DISPERSION":"",n.iridescence?"#define USE_IRIDESCENCE":"",n.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",n.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",n.specularMap?"#define USE_SPECULARMAP":"",n.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",n.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",n.roughnessMap?"#define USE_ROUGHNESSMAP":"",n.metalnessMap?"#define USE_METALNESSMAP":"",n.alphaMap?"#define USE_ALPHAMAP":"",n.alphaTest?"#define USE_ALPHATEST":"",n.alphaHash?"#define USE_ALPHAHASH":"",n.sheen?"#define USE_SHEEN":"",n.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",n.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",n.transmission?"#define USE_TRANSMISSION":"",n.transmissionMap?"#define USE_TRANSMISSIONMAP":"",n.thicknessMap?"#define USE_THICKNESSMAP":"",n.vertexTangents&&n.flatShading===!1?"#define USE_TANGENT":"",n.vertexColors||n.instancingColor||n.batchingColor?"#define USE_COLOR":"",n.vertexAlphas?"#define USE_COLOR_ALPHA":"",n.vertexUv1s?"#define USE_UV1":"",n.vertexUv2s?"#define USE_UV2":"",n.vertexUv3s?"#define USE_UV3":"",n.pointsUvs?"#define USE_POINTS_UV":"",n.gradientMap?"#define USE_GRADIENTMAP":"",n.flatShading?"#define FLAT_SHADED":"",n.doubleSided?"#define DOUBLE_SIDED":"",n.flipSided?"#define FLIP_SIDED":"",n.shadowMapEnabled?"#define USE_SHADOWMAP":"",n.shadowMapEnabled?"#define "+l:"",n.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",n.numLightProbes>0?"#define USE_LIGHT_PROBES":"",n.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",n.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",n.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",n.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",n.toneMapping!==zi?"#define TONE_MAPPING":"",n.toneMapping!==zi?it.tonemapping_pars_fragment:"",n.toneMapping!==zi?dw("toneMapping",n.toneMapping):"",n.dithering?"#define DITHERING":"",n.opaque?"#define OPAQUE":"",it.colorspace_pars_fragment,fw("linearToOutputTexel",n.outputColorSpace),pw(),n.useDepthPacking?"#define DEPTH_PACKING "+n.depthPacking:"",`
`].filter(sa).join(`
`)),o=Sf(o),o=sg(o,n),o=og(o,n),a=Sf(a),a=sg(a,n),a=og(a,n),o=ag(o),a=ag(a),n.isRawShaderMaterial!==!0&&(x=`#version 300 es
`,g=[f,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+g,p=["#define varying in",n.glslVersion===of?"":"layout(location = 0) out highp vec4 pc_fragColor;",n.glslVersion===of?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+p);let y=x+g+o,v=x+p+a,M=ng(r,r.VERTEX_SHADER,y),b=ng(r,r.FRAGMENT_SHADER,v);r.attachShader(_,M),r.attachShader(_,b),n.index0AttributeName!==void 0?r.bindAttribLocation(_,0,n.index0AttributeName):n.morphTargets===!0&&r.bindAttribLocation(_,0,"position"),r.linkProgram(_);function A(I){if(t.debug.checkShaderErrors){let N=r.getProgramInfoLog(_)||"",B=r.getShaderInfoLog(M)||"",L=r.getShaderInfoLog(b)||"",D=N.trim(),F=B.trim(),J=L.trim(),G=!0,le=!0;if(r.getProgramParameter(_,r.LINK_STATUS)===!1)if(G=!1,typeof t.debug.onShaderError=="function")t.debug.onShaderError(r,_,M,b);else{let fe=rg(r,M,"vertex"),X=rg(r,b,"fragment");console.error("THREE.WebGLProgram: Shader Error "+r.getError()+" - VALIDATE_STATUS "+r.getProgramParameter(_,r.VALIDATE_STATUS)+`

Material Name: `+I.name+`
Material Type: `+I.type+`

Program Info Log: `+D+`
`+fe+`
`+X)}else D!==""?console.warn("THREE.WebGLProgram: Program Info Log:",D):(F===""||J==="")&&(le=!1);le&&(I.diagnostics={runnable:G,programLog:D,vertexShader:{log:F,prefix:g},fragmentShader:{log:J,prefix:p}})}r.deleteShader(M),r.deleteShader(b),C=new ks(r,_),E=_w(r,_)}let C;this.getUniforms=function(){return C===void 0&&A(this),C};let E;this.getAttributes=function(){return E===void 0&&A(this),E};let w=n.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return w===!1&&(w=r.getProgramParameter(_,cw)),w},this.destroy=function(){i.releaseStatesOfProgram(this),r.deleteProgram(_),this.program=void 0},this.type=n.shaderType,this.name=n.shaderName,this.id=lw++,this.cacheKey=e,this.usedTimes=1,this.program=_,this.vertexShader=M,this.fragmentShader=b,this}var Rw=0,wf=class{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e){let n=e.vertexShader,i=e.fragmentShader,r=this._getShaderStage(n),s=this._getShaderStage(i),o=this._getShaderCacheForMaterial(e);return o.has(r)===!1&&(o.add(r),r.usedTimes++),o.has(s)===!1&&(o.add(s),s.usedTimes++),this}remove(e){let n=this.materialCache.get(e);for(let i of n)i.usedTimes--,i.usedTimes===0&&this.shaderCache.delete(i.code);return this.materialCache.delete(e),this}getVertexShaderID(e){return this._getShaderStage(e.vertexShader).id}getFragmentShaderID(e){return this._getShaderStage(e.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){let n=this.materialCache,i=n.get(e);return i===void 0&&(i=new Set,n.set(e,i)),i}_getShaderStage(e){let n=this.shaderCache,i=n.get(e);return i===void 0&&(i=new Ef(e),n.set(e,i)),i}},Ef=class{constructor(e){this.id=Rw++,this.code=e,this.usedTimes=0}};function Pw(t,e,n,i,r,s,o){let a=new ws,l=new wf,c=new Set,h=[],u=r.logarithmicDepthBuffer,d=r.vertexTextures,f=r.precision,m={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function _(E){return c.add(E),E===0?"uv":`uv${E}`}function g(E,w,I,N,B){let L=N.fog,D=B.geometry,F=E.isMeshStandardMaterial?N.environment:null,J=(E.isMeshStandardMaterial?n:e).get(E.envMap||F),G=J&&J.mapping===Qo?J.image.height:null,le=m[E.type];E.precision!==null&&(f=r.getMaxPrecision(E.precision),f!==E.precision&&console.warn("THREE.WebGLProgram.getParameters:",E.precision,"not supported, using",f,"instead."));let fe=D.morphAttributes.position||D.morphAttributes.normal||D.morphAttributes.color,X=fe!==void 0?fe.length:0,re=0;D.morphAttributes.position!==void 0&&(re=1),D.morphAttributes.normal!==void 0&&(re=2),D.morphAttributes.color!==void 0&&(re=3);let ye,Ue,ke,$;if(le){let ct=yi[le];ye=ct.vertexShader,Ue=ct.fragmentShader}else ye=E.vertexShader,Ue=E.fragmentShader,l.update(E),ke=l.getVertexShaderID(E),$=l.getFragmentShaderID(E);let ee=t.getRenderTarget(),be=t.state.buffers.depth.getReversed(),je=B.isInstancedMesh===!0,Le=B.isBatchedMesh===!0,rt=!!E.map,qt=!!E.matcap,O=!!J,Et=!!E.aoMap,Ye=!!E.lightMap,Be=!!E.bumpMap,Te=!!E.normalMap,Tt=!!E.displacementMap,Ee=!!E.emissiveMap,Ke=!!E.metalnessMap,vt=!!E.roughnessMap,Pt=E.anisotropy>0,P=E.clearcoat>0,S=E.dispersion>0,H=E.iridescence>0,K=E.sheen>0,ie=E.transmission>0,Z=Pt&&!!E.anisotropyMap,Re=P&&!!E.clearcoatMap,he=P&&!!E.clearcoatNormalMap,Pe=P&&!!E.clearcoatRoughnessMap,Ae=H&&!!E.iridescenceMap,oe=H&&!!E.iridescenceThicknessMap,me=K&&!!E.sheenColorMap,Ve=K&&!!E.sheenRoughnessMap,Ie=!!E.specularMap,de=!!E.specularColorMap,Ze=!!E.specularIntensityMap,z=ie&&!!E.transmissionMap,ae=ie&&!!E.thicknessMap,ue=!!E.gradientMap,Me=!!E.alphaMap,se=E.alphaTest>0,Q=!!E.alphaHash,we=!!E.extensions,We=zi;E.toneMapped&&(ee===null||ee.isXRRenderTarget===!0)&&(We=t.toneMapping);let yt={shaderID:le,shaderType:E.type,shaderName:E.name,vertexShader:ye,fragmentShader:Ue,defines:E.defines,customVertexShaderID:ke,customFragmentShaderID:$,isRawShaderMaterial:E.isRawShaderMaterial===!0,glslVersion:E.glslVersion,precision:f,batching:Le,batchingColor:Le&&B._colorsTexture!==null,instancing:je,instancingColor:je&&B.instanceColor!==null,instancingMorph:je&&B.morphTexture!==null,supportsVertexTextures:d,outputColorSpace:ee===null?t.outputColorSpace:ee.isXRRenderTarget===!0?ee.texture.colorSpace:Pr,alphaToCoverage:!!E.alphaToCoverage,map:rt,matcap:qt,envMap:O,envMapMode:O&&J.mapping,envMapCubeUVHeight:G,aoMap:Et,lightMap:Ye,bumpMap:Be,normalMap:Te,displacementMap:d&&Tt,emissiveMap:Ee,normalMapObjectSpace:Te&&E.normalMapType===Pm,normalMapTangentSpace:Te&&E.normalMapType===Wl,metalnessMap:Ke,roughnessMap:vt,anisotropy:Pt,anisotropyMap:Z,clearcoat:P,clearcoatMap:Re,clearcoatNormalMap:he,clearcoatRoughnessMap:Pe,dispersion:S,iridescence:H,iridescenceMap:Ae,iridescenceThicknessMap:oe,sheen:K,sheenColorMap:me,sheenRoughnessMap:Ve,specularMap:Ie,specularColorMap:de,specularIntensityMap:Ze,transmission:ie,transmissionMap:z,thicknessMap:ae,gradientMap:ue,opaque:E.transparent===!1&&E.blending===Cr&&E.alphaToCoverage===!1,alphaMap:Me,alphaTest:se,alphaHash:Q,combine:E.combine,mapUv:rt&&_(E.map.channel),aoMapUv:Et&&_(E.aoMap.channel),lightMapUv:Ye&&_(E.lightMap.channel),bumpMapUv:Be&&_(E.bumpMap.channel),normalMapUv:Te&&_(E.normalMap.channel),displacementMapUv:Tt&&_(E.displacementMap.channel),emissiveMapUv:Ee&&_(E.emissiveMap.channel),metalnessMapUv:Ke&&_(E.metalnessMap.channel),roughnessMapUv:vt&&_(E.roughnessMap.channel),anisotropyMapUv:Z&&_(E.anisotropyMap.channel),clearcoatMapUv:Re&&_(E.clearcoatMap.channel),clearcoatNormalMapUv:he&&_(E.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:Pe&&_(E.clearcoatRoughnessMap.channel),iridescenceMapUv:Ae&&_(E.iridescenceMap.channel),iridescenceThicknessMapUv:oe&&_(E.iridescenceThicknessMap.channel),sheenColorMapUv:me&&_(E.sheenColorMap.channel),sheenRoughnessMapUv:Ve&&_(E.sheenRoughnessMap.channel),specularMapUv:Ie&&_(E.specularMap.channel),specularColorMapUv:de&&_(E.specularColorMap.channel),specularIntensityMapUv:Ze&&_(E.specularIntensityMap.channel),transmissionMapUv:z&&_(E.transmissionMap.channel),thicknessMapUv:ae&&_(E.thicknessMap.channel),alphaMapUv:Me&&_(E.alphaMap.channel),vertexTangents:!!D.attributes.tangent&&(Te||Pt),vertexColors:E.vertexColors,vertexAlphas:E.vertexColors===!0&&!!D.attributes.color&&D.attributes.color.itemSize===4,pointsUvs:B.isPoints===!0&&!!D.attributes.uv&&(rt||Me),fog:!!L,useFog:E.fog===!0,fogExp2:!!L&&L.isFogExp2,flatShading:E.flatShading===!0&&E.wireframe===!1,sizeAttenuation:E.sizeAttenuation===!0,logarithmicDepthBuffer:u,reversedDepthBuffer:be,skinning:B.isSkinnedMesh===!0,morphTargets:D.morphAttributes.position!==void 0,morphNormals:D.morphAttributes.normal!==void 0,morphColors:D.morphAttributes.color!==void 0,morphTargetsCount:X,morphTextureStride:re,numDirLights:w.directional.length,numPointLights:w.point.length,numSpotLights:w.spot.length,numSpotLightMaps:w.spotLightMap.length,numRectAreaLights:w.rectArea.length,numHemiLights:w.hemi.length,numDirLightShadows:w.directionalShadowMap.length,numPointLightShadows:w.pointShadowMap.length,numSpotLightShadows:w.spotShadowMap.length,numSpotLightShadowsWithMaps:w.numSpotLightShadowsWithMaps,numLightProbes:w.numLightProbes,numClippingPlanes:o.numPlanes,numClipIntersection:o.numIntersection,dithering:E.dithering,shadowMapEnabled:t.shadowMap.enabled&&I.length>0,shadowMapType:t.shadowMap.type,toneMapping:We,decodeVideoTexture:rt&&E.map.isVideoTexture===!0&&ot.getTransfer(E.map.colorSpace)===ht,decodeVideoTextureEmissive:Ee&&E.emissiveMap.isVideoTexture===!0&&ot.getTransfer(E.emissiveMap.colorSpace)===ht,premultipliedAlpha:E.premultipliedAlpha,doubleSided:E.side===_i,flipSided:E.side===Jt,useDepthPacking:E.depthPacking>=0,depthPacking:E.depthPacking||0,index0AttributeName:E.index0AttributeName,extensionClipCullDistance:we&&E.extensions.clipCullDistance===!0&&i.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(we&&E.extensions.multiDraw===!0||Le)&&i.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:i.has("KHR_parallel_shader_compile"),customProgramCacheKey:E.customProgramCacheKey()};return yt.vertexUv1s=c.has(1),yt.vertexUv2s=c.has(2),yt.vertexUv3s=c.has(3),c.clear(),yt}function p(E){let w=[];if(E.shaderID?w.push(E.shaderID):(w.push(E.customVertexShaderID),w.push(E.customFragmentShaderID)),E.defines!==void 0)for(let I in E.defines)w.push(I),w.push(E.defines[I]);return E.isRawShaderMaterial===!1&&(x(w,E),y(w,E),w.push(t.outputColorSpace)),w.push(E.customProgramCacheKey),w.join()}function x(E,w){E.push(w.precision),E.push(w.outputColorSpace),E.push(w.envMapMode),E.push(w.envMapCubeUVHeight),E.push(w.mapUv),E.push(w.alphaMapUv),E.push(w.lightMapUv),E.push(w.aoMapUv),E.push(w.bumpMapUv),E.push(w.normalMapUv),E.push(w.displacementMapUv),E.push(w.emissiveMapUv),E.push(w.metalnessMapUv),E.push(w.roughnessMapUv),E.push(w.anisotropyMapUv),E.push(w.clearcoatMapUv),E.push(w.clearcoatNormalMapUv),E.push(w.clearcoatRoughnessMapUv),E.push(w.iridescenceMapUv),E.push(w.iridescenceThicknessMapUv),E.push(w.sheenColorMapUv),E.push(w.sheenRoughnessMapUv),E.push(w.specularMapUv),E.push(w.specularColorMapUv),E.push(w.specularIntensityMapUv),E.push(w.transmissionMapUv),E.push(w.thicknessMapUv),E.push(w.combine),E.push(w.fogExp2),E.push(w.sizeAttenuation),E.push(w.morphTargetsCount),E.push(w.morphAttributeCount),E.push(w.numDirLights),E.push(w.numPointLights),E.push(w.numSpotLights),E.push(w.numSpotLightMaps),E.push(w.numHemiLights),E.push(w.numRectAreaLights),E.push(w.numDirLightShadows),E.push(w.numPointLightShadows),E.push(w.numSpotLightShadows),E.push(w.numSpotLightShadowsWithMaps),E.push(w.numLightProbes),E.push(w.shadowMapType),E.push(w.toneMapping),E.push(w.numClippingPlanes),E.push(w.numClipIntersection),E.push(w.depthPacking)}function y(E,w){a.disableAll(),w.supportsVertexTextures&&a.enable(0),w.instancing&&a.enable(1),w.instancingColor&&a.enable(2),w.instancingMorph&&a.enable(3),w.matcap&&a.enable(4),w.envMap&&a.enable(5),w.normalMapObjectSpace&&a.enable(6),w.normalMapTangentSpace&&a.enable(7),w.clearcoat&&a.enable(8),w.iridescence&&a.enable(9),w.alphaTest&&a.enable(10),w.vertexColors&&a.enable(11),w.vertexAlphas&&a.enable(12),w.vertexUv1s&&a.enable(13),w.vertexUv2s&&a.enable(14),w.vertexUv3s&&a.enable(15),w.vertexTangents&&a.enable(16),w.anisotropy&&a.enable(17),w.alphaHash&&a.enable(18),w.batching&&a.enable(19),w.dispersion&&a.enable(20),w.batchingColor&&a.enable(21),w.gradientMap&&a.enable(22),E.push(a.mask),a.disableAll(),w.fog&&a.enable(0),w.useFog&&a.enable(1),w.flatShading&&a.enable(2),w.logarithmicDepthBuffer&&a.enable(3),w.reversedDepthBuffer&&a.enable(4),w.skinning&&a.enable(5),w.morphTargets&&a.enable(6),w.morphNormals&&a.enable(7),w.morphColors&&a.enable(8),w.premultipliedAlpha&&a.enable(9),w.shadowMapEnabled&&a.enable(10),w.doubleSided&&a.enable(11),w.flipSided&&a.enable(12),w.useDepthPacking&&a.enable(13),w.dithering&&a.enable(14),w.transmission&&a.enable(15),w.sheen&&a.enable(16),w.opaque&&a.enable(17),w.pointsUvs&&a.enable(18),w.decodeVideoTexture&&a.enable(19),w.decodeVideoTextureEmissive&&a.enable(20),w.alphaToCoverage&&a.enable(21),E.push(a.mask)}function v(E){let w=m[E.type],I;if(w){let N=yi[w];I=Bi.clone(N.uniforms)}else I=E.uniforms;return I}function M(E,w){let I;for(let N=0,B=h.length;N<B;N++){let L=h[N];if(L.cacheKey===w){I=L,++I.usedTimes;break}}return I===void 0&&(I=new Cw(t,w,E,s),h.push(I)),I}function b(E){if(--E.usedTimes===0){let w=h.indexOf(E);h[w]=h[h.length-1],h.pop(),E.destroy()}}function A(E){l.remove(E)}function C(){l.dispose()}return{getParameters:g,getProgramCacheKey:p,getUniforms:v,acquireProgram:M,releaseProgram:b,releaseShaderCache:A,programs:h,dispose:C}}function Iw(){let t=new WeakMap;function e(o){return t.has(o)}function n(o){let a=t.get(o);return a===void 0&&(a={},t.set(o,a)),a}function i(o){t.delete(o)}function r(o,a,l){t.get(o)[a]=l}function s(){t=new WeakMap}return{has:e,get:n,remove:i,update:r,dispose:s}}function Dw(t,e){return t.groupOrder!==e.groupOrder?t.groupOrder-e.groupOrder:t.renderOrder!==e.renderOrder?t.renderOrder-e.renderOrder:t.material.id!==e.material.id?t.material.id-e.material.id:t.z!==e.z?t.z-e.z:t.id-e.id}function lg(t,e){return t.groupOrder!==e.groupOrder?t.groupOrder-e.groupOrder:t.renderOrder!==e.renderOrder?t.renderOrder-e.renderOrder:t.z!==e.z?e.z-t.z:t.id-e.id}function hg(){let t=[],e=0,n=[],i=[],r=[];function s(){e=0,n.length=0,i.length=0,r.length=0}function o(u,d,f,m,_,g){let p=t[e];return p===void 0?(p={id:u.id,object:u,geometry:d,material:f,groupOrder:m,renderOrder:u.renderOrder,z:_,group:g},t[e]=p):(p.id=u.id,p.object=u,p.geometry=d,p.material=f,p.groupOrder=m,p.renderOrder=u.renderOrder,p.z=_,p.group=g),e++,p}function a(u,d,f,m,_,g){let p=o(u,d,f,m,_,g);f.transmission>0?i.push(p):f.transparent===!0?r.push(p):n.push(p)}function l(u,d,f,m,_,g){let p=o(u,d,f,m,_,g);f.transmission>0?i.unshift(p):f.transparent===!0?r.unshift(p):n.unshift(p)}function c(u,d){n.length>1&&n.sort(u||Dw),i.length>1&&i.sort(d||lg),r.length>1&&r.sort(d||lg)}function h(){for(let u=e,d=t.length;u<d;u++){let f=t[u];if(f.id===null)break;f.id=null,f.object=null,f.geometry=null,f.material=null,f.group=null}}return{opaque:n,transmissive:i,transparent:r,init:s,push:a,unshift:l,finish:h,sort:c}}function Lw(){let t=new WeakMap;function e(i,r){let s=t.get(i),o;return s===void 0?(o=new hg,t.set(i,[o])):r>=s.length?(o=new hg,s.push(o)):o=s[r],o}function n(){t=new WeakMap}return{get:e,dispose:n}}function Ow(){let t={};return{get:function(e){if(t[e.id]!==void 0)return t[e.id];let n;switch(e.type){case"DirectionalLight":n={direction:new R,color:new Oe};break;case"SpotLight":n={position:new R,direction:new R,color:new Oe,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":n={position:new R,color:new Oe,distance:0,decay:0};break;case"HemisphereLight":n={direction:new R,skyColor:new Oe,groundColor:new Oe};break;case"RectAreaLight":n={color:new Oe,position:new R,halfWidth:new R,halfHeight:new R};break}return t[e.id]=n,n}}}function Nw(){let t={};return{get:function(e){if(t[e.id]!==void 0)return t[e.id];let n;switch(e.type){case"DirectionalLight":n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ne};break;case"SpotLight":n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ne};break;case"PointLight":n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ne,shadowCameraNear:1,shadowCameraFar:1e3};break}return t[e.id]=n,n}}}var Fw=0;function Uw(t,e){return(e.castShadow?2:0)-(t.castShadow?2:0)+(e.map?1:0)-(t.map?1:0)}function zw(t){let e=new Ow,n=Nw(),i={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)i.probe.push(new R);let r=new R,s=new Xe,o=new Xe;function a(c){let h=0,u=0,d=0;for(let E=0;E<9;E++)i.probe[E].set(0,0,0);let f=0,m=0,_=0,g=0,p=0,x=0,y=0,v=0,M=0,b=0,A=0;c.sort(Uw);for(let E=0,w=c.length;E<w;E++){let I=c[E],N=I.color,B=I.intensity,L=I.distance,D=I.shadow&&I.shadow.map?I.shadow.map.texture:null;if(I.isAmbientLight)h+=N.r*B,u+=N.g*B,d+=N.b*B;else if(I.isLightProbe){for(let F=0;F<9;F++)i.probe[F].addScaledVector(I.sh.coefficients[F],B);A++}else if(I.isDirectionalLight){let F=e.get(I);if(F.color.copy(I.color).multiplyScalar(I.intensity),I.castShadow){let J=I.shadow,G=n.get(I);G.shadowIntensity=J.intensity,G.shadowBias=J.bias,G.shadowNormalBias=J.normalBias,G.shadowRadius=J.radius,G.shadowMapSize=J.mapSize,i.directionalShadow[f]=G,i.directionalShadowMap[f]=D,i.directionalShadowMatrix[f]=I.shadow.matrix,x++}i.directional[f]=F,f++}else if(I.isSpotLight){let F=e.get(I);F.position.setFromMatrixPosition(I.matrixWorld),F.color.copy(N).multiplyScalar(B),F.distance=L,F.coneCos=Math.cos(I.angle),F.penumbraCos=Math.cos(I.angle*(1-I.penumbra)),F.decay=I.decay,i.spot[_]=F;let J=I.shadow;if(I.map&&(i.spotLightMap[M]=I.map,M++,J.updateMatrices(I),I.castShadow&&b++),i.spotLightMatrix[_]=J.matrix,I.castShadow){let G=n.get(I);G.shadowIntensity=J.intensity,G.shadowBias=J.bias,G.shadowNormalBias=J.normalBias,G.shadowRadius=J.radius,G.shadowMapSize=J.mapSize,i.spotShadow[_]=G,i.spotShadowMap[_]=D,v++}_++}else if(I.isRectAreaLight){let F=e.get(I);F.color.copy(N).multiplyScalar(B),F.halfWidth.set(I.width*.5,0,0),F.halfHeight.set(0,I.height*.5,0),i.rectArea[g]=F,g++}else if(I.isPointLight){let F=e.get(I);if(F.color.copy(I.color).multiplyScalar(I.intensity),F.distance=I.distance,F.decay=I.decay,I.castShadow){let J=I.shadow,G=n.get(I);G.shadowIntensity=J.intensity,G.shadowBias=J.bias,G.shadowNormalBias=J.normalBias,G.shadowRadius=J.radius,G.shadowMapSize=J.mapSize,G.shadowCameraNear=J.camera.near,G.shadowCameraFar=J.camera.far,i.pointShadow[m]=G,i.pointShadowMap[m]=D,i.pointShadowMatrix[m]=I.shadow.matrix,y++}i.point[m]=F,m++}else if(I.isHemisphereLight){let F=e.get(I);F.skyColor.copy(I.color).multiplyScalar(B),F.groundColor.copy(I.groundColor).multiplyScalar(B),i.hemi[p]=F,p++}}g>0&&(t.has("OES_texture_float_linear")===!0?(i.rectAreaLTC1=pe.LTC_FLOAT_1,i.rectAreaLTC2=pe.LTC_FLOAT_2):(i.rectAreaLTC1=pe.LTC_HALF_1,i.rectAreaLTC2=pe.LTC_HALF_2)),i.ambient[0]=h,i.ambient[1]=u,i.ambient[2]=d;let C=i.hash;(C.directionalLength!==f||C.pointLength!==m||C.spotLength!==_||C.rectAreaLength!==g||C.hemiLength!==p||C.numDirectionalShadows!==x||C.numPointShadows!==y||C.numSpotShadows!==v||C.numSpotMaps!==M||C.numLightProbes!==A)&&(i.directional.length=f,i.spot.length=_,i.rectArea.length=g,i.point.length=m,i.hemi.length=p,i.directionalShadow.length=x,i.directionalShadowMap.length=x,i.pointShadow.length=y,i.pointShadowMap.length=y,i.spotShadow.length=v,i.spotShadowMap.length=v,i.directionalShadowMatrix.length=x,i.pointShadowMatrix.length=y,i.spotLightMatrix.length=v+M-b,i.spotLightMap.length=M,i.numSpotLightShadowsWithMaps=b,i.numLightProbes=A,C.directionalLength=f,C.pointLength=m,C.spotLength=_,C.rectAreaLength=g,C.hemiLength=p,C.numDirectionalShadows=x,C.numPointShadows=y,C.numSpotShadows=v,C.numSpotMaps=M,C.numLightProbes=A,i.version=Fw++)}function l(c,h){let u=0,d=0,f=0,m=0,_=0,g=h.matrixWorldInverse;for(let p=0,x=c.length;p<x;p++){let y=c[p];if(y.isDirectionalLight){let v=i.directional[u];v.direction.setFromMatrixPosition(y.matrixWorld),r.setFromMatrixPosition(y.target.matrixWorld),v.direction.sub(r),v.direction.transformDirection(g),u++}else if(y.isSpotLight){let v=i.spot[f];v.position.setFromMatrixPosition(y.matrixWorld),v.position.applyMatrix4(g),v.direction.setFromMatrixPosition(y.matrixWorld),r.setFromMatrixPosition(y.target.matrixWorld),v.direction.sub(r),v.direction.transformDirection(g),f++}else if(y.isRectAreaLight){let v=i.rectArea[m];v.position.setFromMatrixPosition(y.matrixWorld),v.position.applyMatrix4(g),o.identity(),s.copy(y.matrixWorld),s.premultiply(g),o.extractRotation(s),v.halfWidth.set(y.width*.5,0,0),v.halfHeight.set(0,y.height*.5,0),v.halfWidth.applyMatrix4(o),v.halfHeight.applyMatrix4(o),m++}else if(y.isPointLight){let v=i.point[d];v.position.setFromMatrixPosition(y.matrixWorld),v.position.applyMatrix4(g),d++}else if(y.isHemisphereLight){let v=i.hemi[_];v.direction.setFromMatrixPosition(y.matrixWorld),v.direction.transformDirection(g),_++}}}return{setup:a,setupView:l,state:i}}function ug(t){let e=new zw(t),n=[],i=[];function r(h){c.camera=h,n.length=0,i.length=0}function s(h){n.push(h)}function o(h){i.push(h)}function a(){e.setup(n)}function l(h){e.setupView(n,h)}let c={lightsArray:n,shadowsArray:i,camera:null,lights:e,transmissionRenderTarget:{}};return{init:r,state:c,setupLights:a,setupLightsView:l,pushLight:s,pushShadow:o}}function kw(t){let e=new WeakMap;function n(r,s=0){let o=e.get(r),a;return o===void 0?(a=new ug(t),e.set(r,[a])):s>=o.length?(a=new ug(t),o.push(a)):a=o[s],a}function i(){e=new WeakMap}return{get:n,dispose:i}}var Bw=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,Vw=`uniform sampler2D shadow_pass;
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
}`;function Hw(t,e,n){let i=new As,r=new ne,s=new ne,o=new mt,a=new Lc({depthPacking:Rm}),l=new Oc,c={},h=n.maxTextureSize,u={[Di]:Jt,[Jt]:Di,[_i]:_i},d=new Bt({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new ne},radius:{value:4}},vertexShader:Bw,fragmentShader:Vw}),f=d.clone();f.defines.HORIZONTAL_PASS=1;let m=new St;m.setAttribute("position",new rn(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let _=new It(m,d),g=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=qu;let p=this.type;this.render=function(b,A,C){if(g.enabled===!1||g.autoUpdate===!1&&g.needsUpdate===!1||b.length===0)return;let E=t.getRenderTarget(),w=t.getActiveCubeFace(),I=t.getActiveMipmapLevel(),N=t.state;N.setBlending(ii),N.buffers.depth.getReversed()===!0?N.buffers.color.setClear(0,0,0,0):N.buffers.color.setClear(1,1,1,1),N.buffers.depth.setTest(!0),N.setScissorTest(!1);let B=p!==gi&&this.type===gi,L=p===gi&&this.type!==gi;for(let D=0,F=b.length;D<F;D++){let J=b[D],G=J.shadow;if(G===void 0){console.warn("THREE.WebGLShadowMap:",J,"has no shadow.");continue}if(G.autoUpdate===!1&&G.needsUpdate===!1)continue;r.copy(G.mapSize);let le=G.getFrameExtents();if(r.multiply(le),s.copy(G.mapSize),(r.x>h||r.y>h)&&(r.x>h&&(s.x=Math.floor(h/le.x),r.x=s.x*le.x,G.mapSize.x=s.x),r.y>h&&(s.y=Math.floor(h/le.y),r.y=s.y*le.y,G.mapSize.y=s.y)),G.map===null||B===!0||L===!0){let X=this.type!==gi?{minFilter:kn,magFilter:kn}:{};G.map!==null&&G.map.dispose(),G.map=new sn(r.x,r.y,X),G.map.texture.name=J.name+".shadowMap",G.camera.updateProjectionMatrix()}t.setRenderTarget(G.map),t.clear();let fe=G.getViewportCount();for(let X=0;X<fe;X++){let re=G.getViewport(X);o.set(s.x*re.x,s.y*re.y,s.x*re.z,s.y*re.w),N.viewport(o),G.updateMatrices(J,X),i=G.getFrustum(),v(A,C,G.camera,J,this.type)}G.isPointLightShadow!==!0&&this.type===gi&&x(G,C),G.needsUpdate=!1}p=this.type,g.needsUpdate=!1,t.setRenderTarget(E,w,I)};function x(b,A){let C=e.update(_);d.defines.VSM_SAMPLES!==b.blurSamples&&(d.defines.VSM_SAMPLES=b.blurSamples,f.defines.VSM_SAMPLES=b.blurSamples,d.needsUpdate=!0,f.needsUpdate=!0),b.mapPass===null&&(b.mapPass=new sn(r.x,r.y)),d.uniforms.shadow_pass.value=b.map.texture,d.uniforms.resolution.value=b.mapSize,d.uniforms.radius.value=b.radius,t.setRenderTarget(b.mapPass),t.clear(),t.renderBufferDirect(A,null,C,d,_,null),f.uniforms.shadow_pass.value=b.mapPass.texture,f.uniforms.resolution.value=b.mapSize,f.uniforms.radius.value=b.radius,t.setRenderTarget(b.map),t.clear(),t.renderBufferDirect(A,null,C,f,_,null)}function y(b,A,C,E){let w=null,I=C.isPointLight===!0?b.customDistanceMaterial:b.customDepthMaterial;if(I!==void 0)w=I;else if(w=C.isPointLight===!0?l:a,t.localClippingEnabled&&A.clipShadows===!0&&Array.isArray(A.clippingPlanes)&&A.clippingPlanes.length!==0||A.displacementMap&&A.displacementScale!==0||A.alphaMap&&A.alphaTest>0||A.map&&A.alphaTest>0||A.alphaToCoverage===!0){let N=w.uuid,B=A.uuid,L=c[N];L===void 0&&(L={},c[N]=L);let D=L[B];D===void 0&&(D=w.clone(),L[B]=D,A.addEventListener("dispose",M)),w=D}if(w.visible=A.visible,w.wireframe=A.wireframe,E===gi?w.side=A.shadowSide!==null?A.shadowSide:A.side:w.side=A.shadowSide!==null?A.shadowSide:u[A.side],w.alphaMap=A.alphaMap,w.alphaTest=A.alphaToCoverage===!0?.5:A.alphaTest,w.map=A.map,w.clipShadows=A.clipShadows,w.clippingPlanes=A.clippingPlanes,w.clipIntersection=A.clipIntersection,w.displacementMap=A.displacementMap,w.displacementScale=A.displacementScale,w.displacementBias=A.displacementBias,w.wireframeLinewidth=A.wireframeLinewidth,w.linewidth=A.linewidth,C.isPointLight===!0&&w.isMeshDistanceMaterial===!0){let N=t.properties.get(w);N.light=C}return w}function v(b,A,C,E,w){if(b.visible===!1)return;if(b.layers.test(A.layers)&&(b.isMesh||b.isLine||b.isPoints)&&(b.castShadow||b.receiveShadow&&w===gi)&&(!b.frustumCulled||i.intersectsObject(b))){b.modelViewMatrix.multiplyMatrices(C.matrixWorldInverse,b.matrixWorld);let B=e.update(b),L=b.material;if(Array.isArray(L)){let D=B.groups;for(let F=0,J=D.length;F<J;F++){let G=D[F],le=L[G.materialIndex];if(le&&le.visible){let fe=y(b,le,E,w);b.onBeforeShadow(t,b,A,C,B,fe,G),t.renderBufferDirect(C,null,B,fe,b,G),b.onAfterShadow(t,b,A,C,B,fe,G)}}}else if(L.visible){let D=y(b,L,E,w);b.onBeforeShadow(t,b,A,C,B,D,null),t.renderBufferDirect(C,null,B,D,b,null),b.onAfterShadow(t,b,A,C,B,D,null)}}let N=b.children;for(let B=0,L=N.length;B<L;B++)v(N[B],A,C,E,w)}function M(b){b.target.removeEventListener("dispose",M);for(let C in c){let E=c[C],w=b.target.uuid;w in E&&(E[w].dispose(),delete E[w])}}}var Gw={[qc]:Xc,[$c]:Kc,[Yc]:Jc,[Rr]:Zc,[Xc]:qc,[Kc]:$c,[Jc]:Yc,[Zc]:Rr};function Ww(t,e){function n(){let z=!1,ae=new mt,ue=null,Me=new mt(0,0,0,0);return{setMask:function(se){ue!==se&&!z&&(t.colorMask(se,se,se,se),ue=se)},setLocked:function(se){z=se},setClear:function(se,Q,we,We,yt){yt===!0&&(se*=We,Q*=We,we*=We),ae.set(se,Q,we,We),Me.equals(ae)===!1&&(t.clearColor(se,Q,we,We),Me.copy(ae))},reset:function(){z=!1,ue=null,Me.set(-1,0,0,0)}}}function i(){let z=!1,ae=!1,ue=null,Me=null,se=null;return{setReversed:function(Q){if(ae!==Q){let we=e.get("EXT_clip_control");Q?we.clipControlEXT(we.LOWER_LEFT_EXT,we.ZERO_TO_ONE_EXT):we.clipControlEXT(we.LOWER_LEFT_EXT,we.NEGATIVE_ONE_TO_ONE_EXT),ae=Q;let We=se;se=null,this.setClear(We)}},getReversed:function(){return ae},setTest:function(Q){Q?ee(t.DEPTH_TEST):be(t.DEPTH_TEST)},setMask:function(Q){ue!==Q&&!z&&(t.depthMask(Q),ue=Q)},setFunc:function(Q){if(ae&&(Q=Gw[Q]),Me!==Q){switch(Q){case qc:t.depthFunc(t.NEVER);break;case Xc:t.depthFunc(t.ALWAYS);break;case $c:t.depthFunc(t.LESS);break;case Rr:t.depthFunc(t.LEQUAL);break;case Yc:t.depthFunc(t.EQUAL);break;case Zc:t.depthFunc(t.GEQUAL);break;case Kc:t.depthFunc(t.GREATER);break;case Jc:t.depthFunc(t.NOTEQUAL);break;default:t.depthFunc(t.LEQUAL)}Me=Q}},setLocked:function(Q){z=Q},setClear:function(Q){se!==Q&&(ae&&(Q=1-Q),t.clearDepth(Q),se=Q)},reset:function(){z=!1,ue=null,Me=null,se=null,ae=!1}}}function r(){let z=!1,ae=null,ue=null,Me=null,se=null,Q=null,we=null,We=null,yt=null;return{setTest:function(ct){z||(ct?ee(t.STENCIL_TEST):be(t.STENCIL_TEST))},setMask:function(ct){ae!==ct&&!z&&(t.stencilMask(ct),ae=ct)},setFunc:function(ct,U,Y){(ue!==ct||Me!==U||se!==Y)&&(t.stencilFunc(ct,U,Y),ue=ct,Me=U,se=Y)},setOp:function(ct,U,Y){(Q!==ct||we!==U||We!==Y)&&(t.stencilOp(ct,U,Y),Q=ct,we=U,We=Y)},setLocked:function(ct){z=ct},setClear:function(ct){yt!==ct&&(t.clearStencil(ct),yt=ct)},reset:function(){z=!1,ae=null,ue=null,Me=null,se=null,Q=null,we=null,We=null,yt=null}}}let s=new n,o=new i,a=new r,l=new WeakMap,c=new WeakMap,h={},u={},d=new WeakMap,f=[],m=null,_=!1,g=null,p=null,x=null,y=null,v=null,M=null,b=null,A=new Oe(0,0,0),C=0,E=!1,w=null,I=null,N=null,B=null,L=null,D=t.getParameter(t.MAX_COMBINED_TEXTURE_IMAGE_UNITS),F=!1,J=0,G=t.getParameter(t.VERSION);G.indexOf("WebGL")!==-1?(J=parseFloat(/^WebGL (\d)/.exec(G)[1]),F=J>=1):G.indexOf("OpenGL ES")!==-1&&(J=parseFloat(/^OpenGL ES (\d)/.exec(G)[1]),F=J>=2);let le=null,fe={},X=t.getParameter(t.SCISSOR_BOX),re=t.getParameter(t.VIEWPORT),ye=new mt().fromArray(X),Ue=new mt().fromArray(re);function ke(z,ae,ue,Me){let se=new Uint8Array(4),Q=t.createTexture();t.bindTexture(z,Q),t.texParameteri(z,t.TEXTURE_MIN_FILTER,t.NEAREST),t.texParameteri(z,t.TEXTURE_MAG_FILTER,t.NEAREST);for(let we=0;we<ue;we++)z===t.TEXTURE_3D||z===t.TEXTURE_2D_ARRAY?t.texImage3D(ae,0,t.RGBA,1,1,Me,0,t.RGBA,t.UNSIGNED_BYTE,se):t.texImage2D(ae+we,0,t.RGBA,1,1,0,t.RGBA,t.UNSIGNED_BYTE,se);return Q}let $={};$[t.TEXTURE_2D]=ke(t.TEXTURE_2D,t.TEXTURE_2D,1),$[t.TEXTURE_CUBE_MAP]=ke(t.TEXTURE_CUBE_MAP,t.TEXTURE_CUBE_MAP_POSITIVE_X,6),$[t.TEXTURE_2D_ARRAY]=ke(t.TEXTURE_2D_ARRAY,t.TEXTURE_2D_ARRAY,1,1),$[t.TEXTURE_3D]=ke(t.TEXTURE_3D,t.TEXTURE_3D,1,1),s.setClear(0,0,0,1),o.setClear(1),a.setClear(0),ee(t.DEPTH_TEST),o.setFunc(Rr),Be(!1),Te(ju),ee(t.CULL_FACE),Et(ii);function ee(z){h[z]!==!0&&(t.enable(z),h[z]=!0)}function be(z){h[z]!==!1&&(t.disable(z),h[z]=!1)}function je(z,ae){return u[z]!==ae?(t.bindFramebuffer(z,ae),u[z]=ae,z===t.DRAW_FRAMEBUFFER&&(u[t.FRAMEBUFFER]=ae),z===t.FRAMEBUFFER&&(u[t.DRAW_FRAMEBUFFER]=ae),!0):!1}function Le(z,ae){let ue=f,Me=!1;if(z){ue=d.get(ae),ue===void 0&&(ue=[],d.set(ae,ue));let se=z.textures;if(ue.length!==se.length||ue[0]!==t.COLOR_ATTACHMENT0){for(let Q=0,we=se.length;Q<we;Q++)ue[Q]=t.COLOR_ATTACHMENT0+Q;ue.length=se.length,Me=!0}}else ue[0]!==t.BACK&&(ue[0]=t.BACK,Me=!0);Me&&t.drawBuffers(ue)}function rt(z){return m!==z?(t.useProgram(z),m=z,!0):!1}let qt={[er]:t.FUNC_ADD,[cm]:t.FUNC_SUBTRACT,[lm]:t.FUNC_REVERSE_SUBTRACT};qt[hm]=t.MIN,qt[um]=t.MAX;let O={[fm]:t.ZERO,[dm]:t.ONE,[pm]:t.SRC_COLOR,[uc]:t.SRC_ALPHA,[xm]:t.SRC_ALPHA_SATURATE,[vm]:t.DST_COLOR,[gm]:t.DST_ALPHA,[mm]:t.ONE_MINUS_SRC_COLOR,[fc]:t.ONE_MINUS_SRC_ALPHA,[ym]:t.ONE_MINUS_DST_COLOR,[_m]:t.ONE_MINUS_DST_ALPHA,[bm]:t.CONSTANT_COLOR,[Mm]:t.ONE_MINUS_CONSTANT_COLOR,[Sm]:t.CONSTANT_ALPHA,[wm]:t.ONE_MINUS_CONSTANT_ALPHA};function Et(z,ae,ue,Me,se,Q,we,We,yt,ct){if(z===ii){_===!0&&(be(t.BLEND),_=!1);return}if(_===!1&&(ee(t.BLEND),_=!0),z!==am){if(z!==g||ct!==E){if((p!==er||v!==er)&&(t.blendEquation(t.FUNC_ADD),p=er,v=er),ct)switch(z){case Cr:t.blendFuncSeparate(t.ONE,t.ONE_MINUS_SRC_ALPHA,t.ONE,t.ONE_MINUS_SRC_ALPHA);break;case ir:t.blendFunc(t.ONE,t.ONE);break;case Xu:t.blendFuncSeparate(t.ZERO,t.ONE_MINUS_SRC_COLOR,t.ZERO,t.ONE);break;case $u:t.blendFuncSeparate(t.DST_COLOR,t.ONE_MINUS_SRC_ALPHA,t.ZERO,t.ONE);break;default:console.error("THREE.WebGLState: Invalid blending: ",z);break}else switch(z){case Cr:t.blendFuncSeparate(t.SRC_ALPHA,t.ONE_MINUS_SRC_ALPHA,t.ONE,t.ONE_MINUS_SRC_ALPHA);break;case ir:t.blendFuncSeparate(t.SRC_ALPHA,t.ONE,t.ONE,t.ONE);break;case Xu:console.error("THREE.WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case $u:console.error("THREE.WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:console.error("THREE.WebGLState: Invalid blending: ",z);break}x=null,y=null,M=null,b=null,A.set(0,0,0),C=0,g=z,E=ct}return}se=se||ae,Q=Q||ue,we=we||Me,(ae!==p||se!==v)&&(t.blendEquationSeparate(qt[ae],qt[se]),p=ae,v=se),(ue!==x||Me!==y||Q!==M||we!==b)&&(t.blendFuncSeparate(O[ue],O[Me],O[Q],O[we]),x=ue,y=Me,M=Q,b=we),(We.equals(A)===!1||yt!==C)&&(t.blendColor(We.r,We.g,We.b,yt),A.copy(We),C=yt),g=z,E=!1}function Ye(z,ae){z.side===_i?be(t.CULL_FACE):ee(t.CULL_FACE);let ue=z.side===Jt;ae&&(ue=!ue),Be(ue),z.blending===Cr&&z.transparent===!1?Et(ii):Et(z.blending,z.blendEquation,z.blendSrc,z.blendDst,z.blendEquationAlpha,z.blendSrcAlpha,z.blendDstAlpha,z.blendColor,z.blendAlpha,z.premultipliedAlpha),o.setFunc(z.depthFunc),o.setTest(z.depthTest),o.setMask(z.depthWrite),s.setMask(z.colorWrite);let Me=z.stencilWrite;a.setTest(Me),Me&&(a.setMask(z.stencilWriteMask),a.setFunc(z.stencilFunc,z.stencilRef,z.stencilFuncMask),a.setOp(z.stencilFail,z.stencilZFail,z.stencilZPass)),Ee(z.polygonOffset,z.polygonOffsetFactor,z.polygonOffsetUnits),z.alphaToCoverage===!0?ee(t.SAMPLE_ALPHA_TO_COVERAGE):be(t.SAMPLE_ALPHA_TO_COVERAGE)}function Be(z){w!==z&&(z?t.frontFace(t.CW):t.frontFace(t.CCW),w=z)}function Te(z){z!==rm?(ee(t.CULL_FACE),z!==I&&(z===ju?t.cullFace(t.BACK):z===sm?t.cullFace(t.FRONT):t.cullFace(t.FRONT_AND_BACK))):be(t.CULL_FACE),I=z}function Tt(z){z!==N&&(F&&t.lineWidth(z),N=z)}function Ee(z,ae,ue){z?(ee(t.POLYGON_OFFSET_FILL),(B!==ae||L!==ue)&&(t.polygonOffset(ae,ue),B=ae,L=ue)):be(t.POLYGON_OFFSET_FILL)}function Ke(z){z?ee(t.SCISSOR_TEST):be(t.SCISSOR_TEST)}function vt(z){z===void 0&&(z=t.TEXTURE0+D-1),le!==z&&(t.activeTexture(z),le=z)}function Pt(z,ae,ue){ue===void 0&&(le===null?ue=t.TEXTURE0+D-1:ue=le);let Me=fe[ue];Me===void 0&&(Me={type:void 0,texture:void 0},fe[ue]=Me),(Me.type!==z||Me.texture!==ae)&&(le!==ue&&(t.activeTexture(ue),le=ue),t.bindTexture(z,ae||$[z]),Me.type=z,Me.texture=ae)}function P(){let z=fe[le];z!==void 0&&z.type!==void 0&&(t.bindTexture(z.type,null),z.type=void 0,z.texture=void 0)}function S(){try{t.compressedTexImage2D(...arguments)}catch(z){console.error("THREE.WebGLState:",z)}}function H(){try{t.compressedTexImage3D(...arguments)}catch(z){console.error("THREE.WebGLState:",z)}}function K(){try{t.texSubImage2D(...arguments)}catch(z){console.error("THREE.WebGLState:",z)}}function ie(){try{t.texSubImage3D(...arguments)}catch(z){console.error("THREE.WebGLState:",z)}}function Z(){try{t.compressedTexSubImage2D(...arguments)}catch(z){console.error("THREE.WebGLState:",z)}}function Re(){try{t.compressedTexSubImage3D(...arguments)}catch(z){console.error("THREE.WebGLState:",z)}}function he(){try{t.texStorage2D(...arguments)}catch(z){console.error("THREE.WebGLState:",z)}}function Pe(){try{t.texStorage3D(...arguments)}catch(z){console.error("THREE.WebGLState:",z)}}function Ae(){try{t.texImage2D(...arguments)}catch(z){console.error("THREE.WebGLState:",z)}}function oe(){try{t.texImage3D(...arguments)}catch(z){console.error("THREE.WebGLState:",z)}}function me(z){ye.equals(z)===!1&&(t.scissor(z.x,z.y,z.z,z.w),ye.copy(z))}function Ve(z){Ue.equals(z)===!1&&(t.viewport(z.x,z.y,z.z,z.w),Ue.copy(z))}function Ie(z,ae){let ue=c.get(ae);ue===void 0&&(ue=new WeakMap,c.set(ae,ue));let Me=ue.get(z);Me===void 0&&(Me=t.getUniformBlockIndex(ae,z.name),ue.set(z,Me))}function de(z,ae){let Me=c.get(ae).get(z);l.get(ae)!==Me&&(t.uniformBlockBinding(ae,Me,z.__bindingPointIndex),l.set(ae,Me))}function Ze(){t.disable(t.BLEND),t.disable(t.CULL_FACE),t.disable(t.DEPTH_TEST),t.disable(t.POLYGON_OFFSET_FILL),t.disable(t.SCISSOR_TEST),t.disable(t.STENCIL_TEST),t.disable(t.SAMPLE_ALPHA_TO_COVERAGE),t.blendEquation(t.FUNC_ADD),t.blendFunc(t.ONE,t.ZERO),t.blendFuncSeparate(t.ONE,t.ZERO,t.ONE,t.ZERO),t.blendColor(0,0,0,0),t.colorMask(!0,!0,!0,!0),t.clearColor(0,0,0,0),t.depthMask(!0),t.depthFunc(t.LESS),o.setReversed(!1),t.clearDepth(1),t.stencilMask(4294967295),t.stencilFunc(t.ALWAYS,0,4294967295),t.stencilOp(t.KEEP,t.KEEP,t.KEEP),t.clearStencil(0),t.cullFace(t.BACK),t.frontFace(t.CCW),t.polygonOffset(0,0),t.activeTexture(t.TEXTURE0),t.bindFramebuffer(t.FRAMEBUFFER,null),t.bindFramebuffer(t.DRAW_FRAMEBUFFER,null),t.bindFramebuffer(t.READ_FRAMEBUFFER,null),t.useProgram(null),t.lineWidth(1),t.scissor(0,0,t.canvas.width,t.canvas.height),t.viewport(0,0,t.canvas.width,t.canvas.height),h={},le=null,fe={},u={},d=new WeakMap,f=[],m=null,_=!1,g=null,p=null,x=null,y=null,v=null,M=null,b=null,A=new Oe(0,0,0),C=0,E=!1,w=null,I=null,N=null,B=null,L=null,ye.set(0,0,t.canvas.width,t.canvas.height),Ue.set(0,0,t.canvas.width,t.canvas.height),s.reset(),o.reset(),a.reset()}return{buffers:{color:s,depth:o,stencil:a},enable:ee,disable:be,bindFramebuffer:je,drawBuffers:Le,useProgram:rt,setBlending:Et,setMaterial:Ye,setFlipSided:Be,setCullFace:Te,setLineWidth:Tt,setPolygonOffset:Ee,setScissorTest:Ke,activeTexture:vt,bindTexture:Pt,unbindTexture:P,compressedTexImage2D:S,compressedTexImage3D:H,texImage2D:Ae,texImage3D:oe,updateUBOMapping:Ie,uniformBlockBinding:de,texStorage2D:he,texStorage3D:Pe,texSubImage2D:K,texSubImage3D:ie,compressedTexSubImage2D:Z,compressedTexSubImage3D:Re,scissor:me,viewport:Ve,reset:Ze}}function jw(t,e,n,i,r,s,o){let a=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),c=new ne,h=new WeakMap,u,d=new WeakMap,f=!1;try{f=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function m(P,S){return f?new OffscreenCanvas(P,S):bs("canvas")}function _(P,S,H){let K=1,ie=Pt(P);if((ie.width>H||ie.height>H)&&(K=H/Math.max(ie.width,ie.height)),K<1)if(typeof HTMLImageElement<"u"&&P instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&P instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&P instanceof ImageBitmap||typeof VideoFrame<"u"&&P instanceof VideoFrame){let Z=Math.floor(K*ie.width),Re=Math.floor(K*ie.height);u===void 0&&(u=m(Z,Re));let he=S?m(Z,Re):u;return he.width=Z,he.height=Re,he.getContext("2d").drawImage(P,0,0,Z,Re),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+ie.width+"x"+ie.height+") to ("+Z+"x"+Re+")."),he}else return"data"in P&&console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+ie.width+"x"+ie.height+")."),P;return P}function g(P){return P.generateMipmaps}function p(P){t.generateMipmap(P)}function x(P){return P.isWebGLCubeRenderTarget?t.TEXTURE_CUBE_MAP:P.isWebGL3DRenderTarget?t.TEXTURE_3D:P.isWebGLArrayRenderTarget||P.isCompressedArrayTexture?t.TEXTURE_2D_ARRAY:t.TEXTURE_2D}function y(P,S,H,K,ie=!1){if(P!==null){if(t[P]!==void 0)return t[P];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+P+"'")}let Z=S;if(S===t.RED&&(H===t.FLOAT&&(Z=t.R32F),H===t.HALF_FLOAT&&(Z=t.R16F),H===t.UNSIGNED_BYTE&&(Z=t.R8)),S===t.RED_INTEGER&&(H===t.UNSIGNED_BYTE&&(Z=t.R8UI),H===t.UNSIGNED_SHORT&&(Z=t.R16UI),H===t.UNSIGNED_INT&&(Z=t.R32UI),H===t.BYTE&&(Z=t.R8I),H===t.SHORT&&(Z=t.R16I),H===t.INT&&(Z=t.R32I)),S===t.RG&&(H===t.FLOAT&&(Z=t.RG32F),H===t.HALF_FLOAT&&(Z=t.RG16F),H===t.UNSIGNED_BYTE&&(Z=t.RG8)),S===t.RG_INTEGER&&(H===t.UNSIGNED_BYTE&&(Z=t.RG8UI),H===t.UNSIGNED_SHORT&&(Z=t.RG16UI),H===t.UNSIGNED_INT&&(Z=t.RG32UI),H===t.BYTE&&(Z=t.RG8I),H===t.SHORT&&(Z=t.RG16I),H===t.INT&&(Z=t.RG32I)),S===t.RGB_INTEGER&&(H===t.UNSIGNED_BYTE&&(Z=t.RGB8UI),H===t.UNSIGNED_SHORT&&(Z=t.RGB16UI),H===t.UNSIGNED_INT&&(Z=t.RGB32UI),H===t.BYTE&&(Z=t.RGB8I),H===t.SHORT&&(Z=t.RGB16I),H===t.INT&&(Z=t.RGB32I)),S===t.RGBA_INTEGER&&(H===t.UNSIGNED_BYTE&&(Z=t.RGBA8UI),H===t.UNSIGNED_SHORT&&(Z=t.RGBA16UI),H===t.UNSIGNED_INT&&(Z=t.RGBA32UI),H===t.BYTE&&(Z=t.RGBA8I),H===t.SHORT&&(Z=t.RGBA16I),H===t.INT&&(Z=t.RGBA32I)),S===t.RGB&&(H===t.UNSIGNED_INT_5_9_9_9_REV&&(Z=t.RGB9_E5),H===t.UNSIGNED_INT_10F_11F_11F_REV&&(Z=t.R11F_G11F_B10F)),S===t.RGBA){let Re=ie?Eo:ot.getTransfer(K);H===t.FLOAT&&(Z=t.RGBA32F),H===t.HALF_FLOAT&&(Z=t.RGBA16F),H===t.UNSIGNED_BYTE&&(Z=Re===ht?t.SRGB8_ALPHA8:t.RGBA8),H===t.UNSIGNED_SHORT_4_4_4_4&&(Z=t.RGBA4),H===t.UNSIGNED_SHORT_5_5_5_1&&(Z=t.RGB5_A1)}return(Z===t.R16F||Z===t.R32F||Z===t.RG16F||Z===t.RG32F||Z===t.RGBA16F||Z===t.RGBA32F)&&e.get("EXT_color_buffer_float"),Z}function v(P,S){let H;return P?S===null||S===sr||S===Ns?H=t.DEPTH24_STENCIL8:S===vi?H=t.DEPTH32F_STENCIL8:S===Os&&(H=t.DEPTH24_STENCIL8,console.warn("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):S===null||S===sr||S===Ns?H=t.DEPTH_COMPONENT24:S===vi?H=t.DEPTH_COMPONENT32F:S===Os&&(H=t.DEPTH_COMPONENT16),H}function M(P,S){return g(P)===!0||P.isFramebufferTexture&&P.minFilter!==kn&&P.minFilter!==ti?Math.log2(Math.max(S.width,S.height))+1:P.mipmaps!==void 0&&P.mipmaps.length>0?P.mipmaps.length:P.isCompressedTexture&&Array.isArray(P.image)?S.mipmaps.length:1}function b(P){let S=P.target;S.removeEventListener("dispose",b),C(S),S.isVideoTexture&&h.delete(S)}function A(P){let S=P.target;S.removeEventListener("dispose",A),w(S)}function C(P){let S=i.get(P);if(S.__webglInit===void 0)return;let H=P.source,K=d.get(H);if(K){let ie=K[S.__cacheKey];ie.usedTimes--,ie.usedTimes===0&&E(P),Object.keys(K).length===0&&d.delete(H)}i.remove(P)}function E(P){let S=i.get(P);t.deleteTexture(S.__webglTexture);let H=P.source,K=d.get(H);delete K[S.__cacheKey],o.memory.textures--}function w(P){let S=i.get(P);if(P.depthTexture&&(P.depthTexture.dispose(),i.remove(P.depthTexture)),P.isWebGLCubeRenderTarget)for(let K=0;K<6;K++){if(Array.isArray(S.__webglFramebuffer[K]))for(let ie=0;ie<S.__webglFramebuffer[K].length;ie++)t.deleteFramebuffer(S.__webglFramebuffer[K][ie]);else t.deleteFramebuffer(S.__webglFramebuffer[K]);S.__webglDepthbuffer&&t.deleteRenderbuffer(S.__webglDepthbuffer[K])}else{if(Array.isArray(S.__webglFramebuffer))for(let K=0;K<S.__webglFramebuffer.length;K++)t.deleteFramebuffer(S.__webglFramebuffer[K]);else t.deleteFramebuffer(S.__webglFramebuffer);if(S.__webglDepthbuffer&&t.deleteRenderbuffer(S.__webglDepthbuffer),S.__webglMultisampledFramebuffer&&t.deleteFramebuffer(S.__webglMultisampledFramebuffer),S.__webglColorRenderbuffer)for(let K=0;K<S.__webglColorRenderbuffer.length;K++)S.__webglColorRenderbuffer[K]&&t.deleteRenderbuffer(S.__webglColorRenderbuffer[K]);S.__webglDepthRenderbuffer&&t.deleteRenderbuffer(S.__webglDepthRenderbuffer)}let H=P.textures;for(let K=0,ie=H.length;K<ie;K++){let Z=i.get(H[K]);Z.__webglTexture&&(t.deleteTexture(Z.__webglTexture),o.memory.textures--),i.remove(H[K])}i.remove(P)}let I=0;function N(){I=0}function B(){let P=I;return P>=r.maxTextures&&console.warn("THREE.WebGLTextures: Trying to use "+P+" texture units while this GPU supports only "+r.maxTextures),I+=1,P}function L(P){let S=[];return S.push(P.wrapS),S.push(P.wrapT),S.push(P.wrapR||0),S.push(P.magFilter),S.push(P.minFilter),S.push(P.anisotropy),S.push(P.internalFormat),S.push(P.format),S.push(P.type),S.push(P.generateMipmaps),S.push(P.premultiplyAlpha),S.push(P.flipY),S.push(P.unpackAlignment),S.push(P.colorSpace),S.join()}function D(P,S){let H=i.get(P);if(P.isVideoTexture&&Ke(P),P.isRenderTargetTexture===!1&&P.isExternalTexture!==!0&&P.version>0&&H.__version!==P.version){let K=P.image;if(K===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if(K.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{$(H,P,S);return}}else P.isExternalTexture&&(H.__webglTexture=P.sourceTexture?P.sourceTexture:null);n.bindTexture(t.TEXTURE_2D,H.__webglTexture,t.TEXTURE0+S)}function F(P,S){let H=i.get(P);if(P.isRenderTargetTexture===!1&&P.version>0&&H.__version!==P.version){$(H,P,S);return}n.bindTexture(t.TEXTURE_2D_ARRAY,H.__webglTexture,t.TEXTURE0+S)}function J(P,S){let H=i.get(P);if(P.isRenderTargetTexture===!1&&P.version>0&&H.__version!==P.version){$(H,P,S);return}n.bindTexture(t.TEXTURE_3D,H.__webglTexture,t.TEXTURE0+S)}function G(P,S){let H=i.get(P);if(P.version>0&&H.__version!==P.version){ee(H,P,S);return}n.bindTexture(t.TEXTURE_CUBE_MAP,H.__webglTexture,t.TEXTURE0+S)}let le={[dc]:t.REPEAT,[Qi]:t.CLAMP_TO_EDGE,[pc]:t.MIRRORED_REPEAT},fe={[kn]:t.NEAREST,[Am]:t.NEAREST_MIPMAP_NEAREST,[ea]:t.NEAREST_MIPMAP_LINEAR,[ti]:t.LINEAR,[ll]:t.LINEAR_MIPMAP_NEAREST,[rr]:t.LINEAR_MIPMAP_LINEAR},X={[Im]:t.NEVER,[Um]:t.ALWAYS,[Dm]:t.LESS,[sf]:t.LEQUAL,[Lm]:t.EQUAL,[Fm]:t.GEQUAL,[Om]:t.GREATER,[Nm]:t.NOTEQUAL};function re(P,S){if(S.type===vi&&e.has("OES_texture_float_linear")===!1&&(S.magFilter===ti||S.magFilter===ll||S.magFilter===ea||S.magFilter===rr||S.minFilter===ti||S.minFilter===ll||S.minFilter===ea||S.minFilter===rr)&&console.warn("THREE.WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),t.texParameteri(P,t.TEXTURE_WRAP_S,le[S.wrapS]),t.texParameteri(P,t.TEXTURE_WRAP_T,le[S.wrapT]),(P===t.TEXTURE_3D||P===t.TEXTURE_2D_ARRAY)&&t.texParameteri(P,t.TEXTURE_WRAP_R,le[S.wrapR]),t.texParameteri(P,t.TEXTURE_MAG_FILTER,fe[S.magFilter]),t.texParameteri(P,t.TEXTURE_MIN_FILTER,fe[S.minFilter]),S.compareFunction&&(t.texParameteri(P,t.TEXTURE_COMPARE_MODE,t.COMPARE_REF_TO_TEXTURE),t.texParameteri(P,t.TEXTURE_COMPARE_FUNC,X[S.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(S.magFilter===kn||S.minFilter!==ea&&S.minFilter!==rr||S.type===vi&&e.has("OES_texture_float_linear")===!1)return;if(S.anisotropy>1||i.get(S).__currentAnisotropy){let H=e.get("EXT_texture_filter_anisotropic");t.texParameterf(P,H.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(S.anisotropy,r.getMaxAnisotropy())),i.get(S).__currentAnisotropy=S.anisotropy}}}function ye(P,S){let H=!1;P.__webglInit===void 0&&(P.__webglInit=!0,S.addEventListener("dispose",b));let K=S.source,ie=d.get(K);ie===void 0&&(ie={},d.set(K,ie));let Z=L(S);if(Z!==P.__cacheKey){ie[Z]===void 0&&(ie[Z]={texture:t.createTexture(),usedTimes:0},o.memory.textures++,H=!0),ie[Z].usedTimes++;let Re=ie[P.__cacheKey];Re!==void 0&&(ie[P.__cacheKey].usedTimes--,Re.usedTimes===0&&E(S)),P.__cacheKey=Z,P.__webglTexture=ie[Z].texture}return H}function Ue(P,S,H){return Math.floor(Math.floor(P/H)/S)}function ke(P,S,H,K){let Z=P.updateRanges;if(Z.length===0)n.texSubImage2D(t.TEXTURE_2D,0,0,0,S.width,S.height,H,K,S.data);else{Z.sort((oe,me)=>oe.start-me.start);let Re=0;for(let oe=1;oe<Z.length;oe++){let me=Z[Re],Ve=Z[oe],Ie=me.start+me.count,de=Ue(Ve.start,S.width,4),Ze=Ue(me.start,S.width,4);Ve.start<=Ie+1&&de===Ze&&Ue(Ve.start+Ve.count-1,S.width,4)===de?me.count=Math.max(me.count,Ve.start+Ve.count-me.start):(++Re,Z[Re]=Ve)}Z.length=Re+1;let he=t.getParameter(t.UNPACK_ROW_LENGTH),Pe=t.getParameter(t.UNPACK_SKIP_PIXELS),Ae=t.getParameter(t.UNPACK_SKIP_ROWS);t.pixelStorei(t.UNPACK_ROW_LENGTH,S.width);for(let oe=0,me=Z.length;oe<me;oe++){let Ve=Z[oe],Ie=Math.floor(Ve.start/4),de=Math.ceil(Ve.count/4),Ze=Ie%S.width,z=Math.floor(Ie/S.width),ae=de,ue=1;t.pixelStorei(t.UNPACK_SKIP_PIXELS,Ze),t.pixelStorei(t.UNPACK_SKIP_ROWS,z),n.texSubImage2D(t.TEXTURE_2D,0,Ze,z,ae,ue,H,K,S.data)}P.clearUpdateRanges(),t.pixelStorei(t.UNPACK_ROW_LENGTH,he),t.pixelStorei(t.UNPACK_SKIP_PIXELS,Pe),t.pixelStorei(t.UNPACK_SKIP_ROWS,Ae)}}function $(P,S,H){let K=t.TEXTURE_2D;(S.isDataArrayTexture||S.isCompressedArrayTexture)&&(K=t.TEXTURE_2D_ARRAY),S.isData3DTexture&&(K=t.TEXTURE_3D);let ie=ye(P,S),Z=S.source;n.bindTexture(K,P.__webglTexture,t.TEXTURE0+H);let Re=i.get(Z);if(Z.version!==Re.__version||ie===!0){n.activeTexture(t.TEXTURE0+H);let he=ot.getPrimaries(ot.workingColorSpace),Pe=S.colorSpace===ki?null:ot.getPrimaries(S.colorSpace),Ae=S.colorSpace===ki||he===Pe?t.NONE:t.BROWSER_DEFAULT_WEBGL;t.pixelStorei(t.UNPACK_FLIP_Y_WEBGL,S.flipY),t.pixelStorei(t.UNPACK_PREMULTIPLY_ALPHA_WEBGL,S.premultiplyAlpha),t.pixelStorei(t.UNPACK_ALIGNMENT,S.unpackAlignment),t.pixelStorei(t.UNPACK_COLORSPACE_CONVERSION_WEBGL,Ae);let oe=_(S.image,!1,r.maxTextureSize);oe=vt(S,oe);let me=s.convert(S.format,S.colorSpace),Ve=s.convert(S.type),Ie=y(S.internalFormat,me,Ve,S.colorSpace,S.isVideoTexture);re(K,S);let de,Ze=S.mipmaps,z=S.isVideoTexture!==!0,ae=Re.__version===void 0||ie===!0,ue=Z.dataReady,Me=M(S,oe);if(S.isDepthTexture)Ie=v(S.format===Fs,S.type),ae&&(z?n.texStorage2D(t.TEXTURE_2D,1,Ie,oe.width,oe.height):n.texImage2D(t.TEXTURE_2D,0,Ie,oe.width,oe.height,0,me,Ve,null));else if(S.isDataTexture)if(Ze.length>0){z&&ae&&n.texStorage2D(t.TEXTURE_2D,Me,Ie,Ze[0].width,Ze[0].height);for(let se=0,Q=Ze.length;se<Q;se++)de=Ze[se],z?ue&&n.texSubImage2D(t.TEXTURE_2D,se,0,0,de.width,de.height,me,Ve,de.data):n.texImage2D(t.TEXTURE_2D,se,Ie,de.width,de.height,0,me,Ve,de.data);S.generateMipmaps=!1}else z?(ae&&n.texStorage2D(t.TEXTURE_2D,Me,Ie,oe.width,oe.height),ue&&ke(S,oe,me,Ve)):n.texImage2D(t.TEXTURE_2D,0,Ie,oe.width,oe.height,0,me,Ve,oe.data);else if(S.isCompressedTexture)if(S.isCompressedArrayTexture){z&&ae&&n.texStorage3D(t.TEXTURE_2D_ARRAY,Me,Ie,Ze[0].width,Ze[0].height,oe.depth);for(let se=0,Q=Ze.length;se<Q;se++)if(de=Ze[se],S.format!==jn)if(me!==null)if(z){if(ue)if(S.layerUpdates.size>0){let we=df(de.width,de.height,S.format,S.type);for(let We of S.layerUpdates){let yt=de.data.subarray(We*we/de.data.BYTES_PER_ELEMENT,(We+1)*we/de.data.BYTES_PER_ELEMENT);n.compressedTexSubImage3D(t.TEXTURE_2D_ARRAY,se,0,0,We,de.width,de.height,1,me,yt)}S.clearLayerUpdates()}else n.compressedTexSubImage3D(t.TEXTURE_2D_ARRAY,se,0,0,0,de.width,de.height,oe.depth,me,de.data)}else n.compressedTexImage3D(t.TEXTURE_2D_ARRAY,se,Ie,de.width,de.height,oe.depth,0,de.data,0,0);else console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else z?ue&&n.texSubImage3D(t.TEXTURE_2D_ARRAY,se,0,0,0,de.width,de.height,oe.depth,me,Ve,de.data):n.texImage3D(t.TEXTURE_2D_ARRAY,se,Ie,de.width,de.height,oe.depth,0,me,Ve,de.data)}else{z&&ae&&n.texStorage2D(t.TEXTURE_2D,Me,Ie,Ze[0].width,Ze[0].height);for(let se=0,Q=Ze.length;se<Q;se++)de=Ze[se],S.format!==jn?me!==null?z?ue&&n.compressedTexSubImage2D(t.TEXTURE_2D,se,0,0,de.width,de.height,me,de.data):n.compressedTexImage2D(t.TEXTURE_2D,se,Ie,de.width,de.height,0,de.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):z?ue&&n.texSubImage2D(t.TEXTURE_2D,se,0,0,de.width,de.height,me,Ve,de.data):n.texImage2D(t.TEXTURE_2D,se,Ie,de.width,de.height,0,me,Ve,de.data)}else if(S.isDataArrayTexture)if(z){if(ae&&n.texStorage3D(t.TEXTURE_2D_ARRAY,Me,Ie,oe.width,oe.height,oe.depth),ue)if(S.layerUpdates.size>0){let se=df(oe.width,oe.height,S.format,S.type);for(let Q of S.layerUpdates){let we=oe.data.subarray(Q*se/oe.data.BYTES_PER_ELEMENT,(Q+1)*se/oe.data.BYTES_PER_ELEMENT);n.texSubImage3D(t.TEXTURE_2D_ARRAY,0,0,0,Q,oe.width,oe.height,1,me,Ve,we)}S.clearLayerUpdates()}else n.texSubImage3D(t.TEXTURE_2D_ARRAY,0,0,0,0,oe.width,oe.height,oe.depth,me,Ve,oe.data)}else n.texImage3D(t.TEXTURE_2D_ARRAY,0,Ie,oe.width,oe.height,oe.depth,0,me,Ve,oe.data);else if(S.isData3DTexture)z?(ae&&n.texStorage3D(t.TEXTURE_3D,Me,Ie,oe.width,oe.height,oe.depth),ue&&n.texSubImage3D(t.TEXTURE_3D,0,0,0,0,oe.width,oe.height,oe.depth,me,Ve,oe.data)):n.texImage3D(t.TEXTURE_3D,0,Ie,oe.width,oe.height,oe.depth,0,me,Ve,oe.data);else if(S.isFramebufferTexture){if(ae)if(z)n.texStorage2D(t.TEXTURE_2D,Me,Ie,oe.width,oe.height);else{let se=oe.width,Q=oe.height;for(let we=0;we<Me;we++)n.texImage2D(t.TEXTURE_2D,we,Ie,se,Q,0,me,Ve,null),se>>=1,Q>>=1}}else if(Ze.length>0){if(z&&ae){let se=Pt(Ze[0]);n.texStorage2D(t.TEXTURE_2D,Me,Ie,se.width,se.height)}for(let se=0,Q=Ze.length;se<Q;se++)de=Ze[se],z?ue&&n.texSubImage2D(t.TEXTURE_2D,se,0,0,me,Ve,de):n.texImage2D(t.TEXTURE_2D,se,Ie,me,Ve,de);S.generateMipmaps=!1}else if(z){if(ae){let se=Pt(oe);n.texStorage2D(t.TEXTURE_2D,Me,Ie,se.width,se.height)}ue&&n.texSubImage2D(t.TEXTURE_2D,0,0,0,me,Ve,oe)}else n.texImage2D(t.TEXTURE_2D,0,Ie,me,Ve,oe);g(S)&&p(K),Re.__version=Z.version,S.onUpdate&&S.onUpdate(S)}P.__version=S.version}function ee(P,S,H){if(S.image.length!==6)return;let K=ye(P,S),ie=S.source;n.bindTexture(t.TEXTURE_CUBE_MAP,P.__webglTexture,t.TEXTURE0+H);let Z=i.get(ie);if(ie.version!==Z.__version||K===!0){n.activeTexture(t.TEXTURE0+H);let Re=ot.getPrimaries(ot.workingColorSpace),he=S.colorSpace===ki?null:ot.getPrimaries(S.colorSpace),Pe=S.colorSpace===ki||Re===he?t.NONE:t.BROWSER_DEFAULT_WEBGL;t.pixelStorei(t.UNPACK_FLIP_Y_WEBGL,S.flipY),t.pixelStorei(t.UNPACK_PREMULTIPLY_ALPHA_WEBGL,S.premultiplyAlpha),t.pixelStorei(t.UNPACK_ALIGNMENT,S.unpackAlignment),t.pixelStorei(t.UNPACK_COLORSPACE_CONVERSION_WEBGL,Pe);let Ae=S.isCompressedTexture||S.image[0].isCompressedTexture,oe=S.image[0]&&S.image[0].isDataTexture,me=[];for(let Q=0;Q<6;Q++)!Ae&&!oe?me[Q]=_(S.image[Q],!0,r.maxCubemapSize):me[Q]=oe?S.image[Q].image:S.image[Q],me[Q]=vt(S,me[Q]);let Ve=me[0],Ie=s.convert(S.format,S.colorSpace),de=s.convert(S.type),Ze=y(S.internalFormat,Ie,de,S.colorSpace),z=S.isVideoTexture!==!0,ae=Z.__version===void 0||K===!0,ue=ie.dataReady,Me=M(S,Ve);re(t.TEXTURE_CUBE_MAP,S);let se;if(Ae){z&&ae&&n.texStorage2D(t.TEXTURE_CUBE_MAP,Me,Ze,Ve.width,Ve.height);for(let Q=0;Q<6;Q++){se=me[Q].mipmaps;for(let we=0;we<se.length;we++){let We=se[we];S.format!==jn?Ie!==null?z?ue&&n.compressedTexSubImage2D(t.TEXTURE_CUBE_MAP_POSITIVE_X+Q,we,0,0,We.width,We.height,Ie,We.data):n.compressedTexImage2D(t.TEXTURE_CUBE_MAP_POSITIVE_X+Q,we,Ze,We.width,We.height,0,We.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):z?ue&&n.texSubImage2D(t.TEXTURE_CUBE_MAP_POSITIVE_X+Q,we,0,0,We.width,We.height,Ie,de,We.data):n.texImage2D(t.TEXTURE_CUBE_MAP_POSITIVE_X+Q,we,Ze,We.width,We.height,0,Ie,de,We.data)}}}else{if(se=S.mipmaps,z&&ae){se.length>0&&Me++;let Q=Pt(me[0]);n.texStorage2D(t.TEXTURE_CUBE_MAP,Me,Ze,Q.width,Q.height)}for(let Q=0;Q<6;Q++)if(oe){z?ue&&n.texSubImage2D(t.TEXTURE_CUBE_MAP_POSITIVE_X+Q,0,0,0,me[Q].width,me[Q].height,Ie,de,me[Q].data):n.texImage2D(t.TEXTURE_CUBE_MAP_POSITIVE_X+Q,0,Ze,me[Q].width,me[Q].height,0,Ie,de,me[Q].data);for(let we=0;we<se.length;we++){let yt=se[we].image[Q].image;z?ue&&n.texSubImage2D(t.TEXTURE_CUBE_MAP_POSITIVE_X+Q,we+1,0,0,yt.width,yt.height,Ie,de,yt.data):n.texImage2D(t.TEXTURE_CUBE_MAP_POSITIVE_X+Q,we+1,Ze,yt.width,yt.height,0,Ie,de,yt.data)}}else{z?ue&&n.texSubImage2D(t.TEXTURE_CUBE_MAP_POSITIVE_X+Q,0,0,0,Ie,de,me[Q]):n.texImage2D(t.TEXTURE_CUBE_MAP_POSITIVE_X+Q,0,Ze,Ie,de,me[Q]);for(let we=0;we<se.length;we++){let We=se[we];z?ue&&n.texSubImage2D(t.TEXTURE_CUBE_MAP_POSITIVE_X+Q,we+1,0,0,Ie,de,We.image[Q]):n.texImage2D(t.TEXTURE_CUBE_MAP_POSITIVE_X+Q,we+1,Ze,Ie,de,We.image[Q])}}}g(S)&&p(t.TEXTURE_CUBE_MAP),Z.__version=ie.version,S.onUpdate&&S.onUpdate(S)}P.__version=S.version}function be(P,S,H,K,ie,Z){let Re=s.convert(H.format,H.colorSpace),he=s.convert(H.type),Pe=y(H.internalFormat,Re,he,H.colorSpace),Ae=i.get(S),oe=i.get(H);if(oe.__renderTarget=S,!Ae.__hasExternalTextures){let me=Math.max(1,S.width>>Z),Ve=Math.max(1,S.height>>Z);ie===t.TEXTURE_3D||ie===t.TEXTURE_2D_ARRAY?n.texImage3D(ie,Z,Pe,me,Ve,S.depth,0,Re,he,null):n.texImage2D(ie,Z,Pe,me,Ve,0,Re,he,null)}n.bindFramebuffer(t.FRAMEBUFFER,P),Ee(S)?a.framebufferTexture2DMultisampleEXT(t.FRAMEBUFFER,K,ie,oe.__webglTexture,0,Tt(S)):(ie===t.TEXTURE_2D||ie>=t.TEXTURE_CUBE_MAP_POSITIVE_X&&ie<=t.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&t.framebufferTexture2D(t.FRAMEBUFFER,K,ie,oe.__webglTexture,Z),n.bindFramebuffer(t.FRAMEBUFFER,null)}function je(P,S,H){if(t.bindRenderbuffer(t.RENDERBUFFER,P),S.depthBuffer){let K=S.depthTexture,ie=K&&K.isDepthTexture?K.type:null,Z=v(S.stencilBuffer,ie),Re=S.stencilBuffer?t.DEPTH_STENCIL_ATTACHMENT:t.DEPTH_ATTACHMENT,he=Tt(S);Ee(S)?a.renderbufferStorageMultisampleEXT(t.RENDERBUFFER,he,Z,S.width,S.height):H?t.renderbufferStorageMultisample(t.RENDERBUFFER,he,Z,S.width,S.height):t.renderbufferStorage(t.RENDERBUFFER,Z,S.width,S.height),t.framebufferRenderbuffer(t.FRAMEBUFFER,Re,t.RENDERBUFFER,P)}else{let K=S.textures;for(let ie=0;ie<K.length;ie++){let Z=K[ie],Re=s.convert(Z.format,Z.colorSpace),he=s.convert(Z.type),Pe=y(Z.internalFormat,Re,he,Z.colorSpace),Ae=Tt(S);H&&Ee(S)===!1?t.renderbufferStorageMultisample(t.RENDERBUFFER,Ae,Pe,S.width,S.height):Ee(S)?a.renderbufferStorageMultisampleEXT(t.RENDERBUFFER,Ae,Pe,S.width,S.height):t.renderbufferStorage(t.RENDERBUFFER,Pe,S.width,S.height)}}t.bindRenderbuffer(t.RENDERBUFFER,null)}function Le(P,S){if(S&&S.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(n.bindFramebuffer(t.FRAMEBUFFER,P),!(S.depthTexture&&S.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");let K=i.get(S.depthTexture);K.__renderTarget=S,(!K.__webglTexture||S.depthTexture.image.width!==S.width||S.depthTexture.image.height!==S.height)&&(S.depthTexture.image.width=S.width,S.depthTexture.image.height=S.height,S.depthTexture.needsUpdate=!0),D(S.depthTexture,0);let ie=K.__webglTexture,Z=Tt(S);if(S.depthTexture.format===ys)Ee(S)?a.framebufferTexture2DMultisampleEXT(t.FRAMEBUFFER,t.DEPTH_ATTACHMENT,t.TEXTURE_2D,ie,0,Z):t.framebufferTexture2D(t.FRAMEBUFFER,t.DEPTH_ATTACHMENT,t.TEXTURE_2D,ie,0);else if(S.depthTexture.format===Fs)Ee(S)?a.framebufferTexture2DMultisampleEXT(t.FRAMEBUFFER,t.DEPTH_STENCIL_ATTACHMENT,t.TEXTURE_2D,ie,0,Z):t.framebufferTexture2D(t.FRAMEBUFFER,t.DEPTH_STENCIL_ATTACHMENT,t.TEXTURE_2D,ie,0);else throw new Error("Unknown depthTexture format")}function rt(P){let S=i.get(P),H=P.isWebGLCubeRenderTarget===!0;if(S.__boundDepthTexture!==P.depthTexture){let K=P.depthTexture;if(S.__depthDisposeCallback&&S.__depthDisposeCallback(),K){let ie=()=>{delete S.__boundDepthTexture,delete S.__depthDisposeCallback,K.removeEventListener("dispose",ie)};K.addEventListener("dispose",ie),S.__depthDisposeCallback=ie}S.__boundDepthTexture=K}if(P.depthTexture&&!S.__autoAllocateDepthBuffer){if(H)throw new Error("target.depthTexture not supported in Cube render targets");let K=P.texture.mipmaps;K&&K.length>0?Le(S.__webglFramebuffer[0],P):Le(S.__webglFramebuffer,P)}else if(H){S.__webglDepthbuffer=[];for(let K=0;K<6;K++)if(n.bindFramebuffer(t.FRAMEBUFFER,S.__webglFramebuffer[K]),S.__webglDepthbuffer[K]===void 0)S.__webglDepthbuffer[K]=t.createRenderbuffer(),je(S.__webglDepthbuffer[K],P,!1);else{let ie=P.stencilBuffer?t.DEPTH_STENCIL_ATTACHMENT:t.DEPTH_ATTACHMENT,Z=S.__webglDepthbuffer[K];t.bindRenderbuffer(t.RENDERBUFFER,Z),t.framebufferRenderbuffer(t.FRAMEBUFFER,ie,t.RENDERBUFFER,Z)}}else{let K=P.texture.mipmaps;if(K&&K.length>0?n.bindFramebuffer(t.FRAMEBUFFER,S.__webglFramebuffer[0]):n.bindFramebuffer(t.FRAMEBUFFER,S.__webglFramebuffer),S.__webglDepthbuffer===void 0)S.__webglDepthbuffer=t.createRenderbuffer(),je(S.__webglDepthbuffer,P,!1);else{let ie=P.stencilBuffer?t.DEPTH_STENCIL_ATTACHMENT:t.DEPTH_ATTACHMENT,Z=S.__webglDepthbuffer;t.bindRenderbuffer(t.RENDERBUFFER,Z),t.framebufferRenderbuffer(t.FRAMEBUFFER,ie,t.RENDERBUFFER,Z)}}n.bindFramebuffer(t.FRAMEBUFFER,null)}function qt(P,S,H){let K=i.get(P);S!==void 0&&be(K.__webglFramebuffer,P,P.texture,t.COLOR_ATTACHMENT0,t.TEXTURE_2D,0),H!==void 0&&rt(P)}function O(P){let S=P.texture,H=i.get(P),K=i.get(S);P.addEventListener("dispose",A);let ie=P.textures,Z=P.isWebGLCubeRenderTarget===!0,Re=ie.length>1;if(Re||(K.__webglTexture===void 0&&(K.__webglTexture=t.createTexture()),K.__version=S.version,o.memory.textures++),Z){H.__webglFramebuffer=[];for(let he=0;he<6;he++)if(S.mipmaps&&S.mipmaps.length>0){H.__webglFramebuffer[he]=[];for(let Pe=0;Pe<S.mipmaps.length;Pe++)H.__webglFramebuffer[he][Pe]=t.createFramebuffer()}else H.__webglFramebuffer[he]=t.createFramebuffer()}else{if(S.mipmaps&&S.mipmaps.length>0){H.__webglFramebuffer=[];for(let he=0;he<S.mipmaps.length;he++)H.__webglFramebuffer[he]=t.createFramebuffer()}else H.__webglFramebuffer=t.createFramebuffer();if(Re)for(let he=0,Pe=ie.length;he<Pe;he++){let Ae=i.get(ie[he]);Ae.__webglTexture===void 0&&(Ae.__webglTexture=t.createTexture(),o.memory.textures++)}if(P.samples>0&&Ee(P)===!1){H.__webglMultisampledFramebuffer=t.createFramebuffer(),H.__webglColorRenderbuffer=[],n.bindFramebuffer(t.FRAMEBUFFER,H.__webglMultisampledFramebuffer);for(let he=0;he<ie.length;he++){let Pe=ie[he];H.__webglColorRenderbuffer[he]=t.createRenderbuffer(),t.bindRenderbuffer(t.RENDERBUFFER,H.__webglColorRenderbuffer[he]);let Ae=s.convert(Pe.format,Pe.colorSpace),oe=s.convert(Pe.type),me=y(Pe.internalFormat,Ae,oe,Pe.colorSpace,P.isXRRenderTarget===!0),Ve=Tt(P);t.renderbufferStorageMultisample(t.RENDERBUFFER,Ve,me,P.width,P.height),t.framebufferRenderbuffer(t.FRAMEBUFFER,t.COLOR_ATTACHMENT0+he,t.RENDERBUFFER,H.__webglColorRenderbuffer[he])}t.bindRenderbuffer(t.RENDERBUFFER,null),P.depthBuffer&&(H.__webglDepthRenderbuffer=t.createRenderbuffer(),je(H.__webglDepthRenderbuffer,P,!0)),n.bindFramebuffer(t.FRAMEBUFFER,null)}}if(Z){n.bindTexture(t.TEXTURE_CUBE_MAP,K.__webglTexture),re(t.TEXTURE_CUBE_MAP,S);for(let he=0;he<6;he++)if(S.mipmaps&&S.mipmaps.length>0)for(let Pe=0;Pe<S.mipmaps.length;Pe++)be(H.__webglFramebuffer[he][Pe],P,S,t.COLOR_ATTACHMENT0,t.TEXTURE_CUBE_MAP_POSITIVE_X+he,Pe);else be(H.__webglFramebuffer[he],P,S,t.COLOR_ATTACHMENT0,t.TEXTURE_CUBE_MAP_POSITIVE_X+he,0);g(S)&&p(t.TEXTURE_CUBE_MAP),n.unbindTexture()}else if(Re){for(let he=0,Pe=ie.length;he<Pe;he++){let Ae=ie[he],oe=i.get(Ae),me=t.TEXTURE_2D;(P.isWebGL3DRenderTarget||P.isWebGLArrayRenderTarget)&&(me=P.isWebGL3DRenderTarget?t.TEXTURE_3D:t.TEXTURE_2D_ARRAY),n.bindTexture(me,oe.__webglTexture),re(me,Ae),be(H.__webglFramebuffer,P,Ae,t.COLOR_ATTACHMENT0+he,me,0),g(Ae)&&p(me)}n.unbindTexture()}else{let he=t.TEXTURE_2D;if((P.isWebGL3DRenderTarget||P.isWebGLArrayRenderTarget)&&(he=P.isWebGL3DRenderTarget?t.TEXTURE_3D:t.TEXTURE_2D_ARRAY),n.bindTexture(he,K.__webglTexture),re(he,S),S.mipmaps&&S.mipmaps.length>0)for(let Pe=0;Pe<S.mipmaps.length;Pe++)be(H.__webglFramebuffer[Pe],P,S,t.COLOR_ATTACHMENT0,he,Pe);else be(H.__webglFramebuffer,P,S,t.COLOR_ATTACHMENT0,he,0);g(S)&&p(he),n.unbindTexture()}P.depthBuffer&&rt(P)}function Et(P){let S=P.textures;for(let H=0,K=S.length;H<K;H++){let ie=S[H];if(g(ie)){let Z=x(P),Re=i.get(ie).__webglTexture;n.bindTexture(Z,Re),p(Z),n.unbindTexture()}}}let Ye=[],Be=[];function Te(P){if(P.samples>0){if(Ee(P)===!1){let S=P.textures,H=P.width,K=P.height,ie=t.COLOR_BUFFER_BIT,Z=P.stencilBuffer?t.DEPTH_STENCIL_ATTACHMENT:t.DEPTH_ATTACHMENT,Re=i.get(P),he=S.length>1;if(he)for(let Ae=0;Ae<S.length;Ae++)n.bindFramebuffer(t.FRAMEBUFFER,Re.__webglMultisampledFramebuffer),t.framebufferRenderbuffer(t.FRAMEBUFFER,t.COLOR_ATTACHMENT0+Ae,t.RENDERBUFFER,null),n.bindFramebuffer(t.FRAMEBUFFER,Re.__webglFramebuffer),t.framebufferTexture2D(t.DRAW_FRAMEBUFFER,t.COLOR_ATTACHMENT0+Ae,t.TEXTURE_2D,null,0);n.bindFramebuffer(t.READ_FRAMEBUFFER,Re.__webglMultisampledFramebuffer);let Pe=P.texture.mipmaps;Pe&&Pe.length>0?n.bindFramebuffer(t.DRAW_FRAMEBUFFER,Re.__webglFramebuffer[0]):n.bindFramebuffer(t.DRAW_FRAMEBUFFER,Re.__webglFramebuffer);for(let Ae=0;Ae<S.length;Ae++){if(P.resolveDepthBuffer&&(P.depthBuffer&&(ie|=t.DEPTH_BUFFER_BIT),P.stencilBuffer&&P.resolveStencilBuffer&&(ie|=t.STENCIL_BUFFER_BIT)),he){t.framebufferRenderbuffer(t.READ_FRAMEBUFFER,t.COLOR_ATTACHMENT0,t.RENDERBUFFER,Re.__webglColorRenderbuffer[Ae]);let oe=i.get(S[Ae]).__webglTexture;t.framebufferTexture2D(t.DRAW_FRAMEBUFFER,t.COLOR_ATTACHMENT0,t.TEXTURE_2D,oe,0)}t.blitFramebuffer(0,0,H,K,0,0,H,K,ie,t.NEAREST),l===!0&&(Ye.length=0,Be.length=0,Ye.push(t.COLOR_ATTACHMENT0+Ae),P.depthBuffer&&P.resolveDepthBuffer===!1&&(Ye.push(Z),Be.push(Z),t.invalidateFramebuffer(t.DRAW_FRAMEBUFFER,Be)),t.invalidateFramebuffer(t.READ_FRAMEBUFFER,Ye))}if(n.bindFramebuffer(t.READ_FRAMEBUFFER,null),n.bindFramebuffer(t.DRAW_FRAMEBUFFER,null),he)for(let Ae=0;Ae<S.length;Ae++){n.bindFramebuffer(t.FRAMEBUFFER,Re.__webglMultisampledFramebuffer),t.framebufferRenderbuffer(t.FRAMEBUFFER,t.COLOR_ATTACHMENT0+Ae,t.RENDERBUFFER,Re.__webglColorRenderbuffer[Ae]);let oe=i.get(S[Ae]).__webglTexture;n.bindFramebuffer(t.FRAMEBUFFER,Re.__webglFramebuffer),t.framebufferTexture2D(t.DRAW_FRAMEBUFFER,t.COLOR_ATTACHMENT0+Ae,t.TEXTURE_2D,oe,0)}n.bindFramebuffer(t.DRAW_FRAMEBUFFER,Re.__webglMultisampledFramebuffer)}else if(P.depthBuffer&&P.resolveDepthBuffer===!1&&l){let S=P.stencilBuffer?t.DEPTH_STENCIL_ATTACHMENT:t.DEPTH_ATTACHMENT;t.invalidateFramebuffer(t.DRAW_FRAMEBUFFER,[S])}}}function Tt(P){return Math.min(r.maxSamples,P.samples)}function Ee(P){let S=i.get(P);return P.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&S.__useRenderToTexture!==!1}function Ke(P){let S=o.render.frame;h.get(P)!==S&&(h.set(P,S),P.update())}function vt(P,S){let H=P.colorSpace,K=P.format,ie=P.type;return P.isCompressedTexture===!0||P.isVideoTexture===!0||H!==Pr&&H!==ki&&(ot.getTransfer(H)===ht?(K!==jn||ie!==ri)&&console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):console.error("THREE.WebGLTextures: Unsupported texture color space:",H)),S}function Pt(P){return typeof HTMLImageElement<"u"&&P instanceof HTMLImageElement?(c.width=P.naturalWidth||P.width,c.height=P.naturalHeight||P.height):typeof VideoFrame<"u"&&P instanceof VideoFrame?(c.width=P.displayWidth,c.height=P.displayHeight):(c.width=P.width,c.height=P.height),c}this.allocateTextureUnit=B,this.resetTextureUnits=N,this.setTexture2D=D,this.setTexture2DArray=F,this.setTexture3D=J,this.setTextureCube=G,this.rebindTextures=qt,this.setupRenderTarget=O,this.updateRenderTargetMipmap=Et,this.updateMultisampleRenderTarget=Te,this.setupDepthRenderbuffer=rt,this.setupFrameBufferTexture=be,this.useMultisampledRTT=Ee}function qw(t,e){function n(i,r=ki){let s,o=ot.getTransfer(r);if(i===ri)return t.UNSIGNED_BYTE;if(i===ul)return t.UNSIGNED_SHORT_4_4_4_4;if(i===fl)return t.UNSIGNED_SHORT_5_5_5_1;if(i===Ju)return t.UNSIGNED_INT_5_9_9_9_REV;if(i===Qu)return t.UNSIGNED_INT_10F_11F_11F_REV;if(i===Zu)return t.BYTE;if(i===Ku)return t.SHORT;if(i===Os)return t.UNSIGNED_SHORT;if(i===hl)return t.INT;if(i===sr)return t.UNSIGNED_INT;if(i===vi)return t.FLOAT;if(i===Wn)return t.HALF_FLOAT;if(i===ef)return t.ALPHA;if(i===tf)return t.RGB;if(i===jn)return t.RGBA;if(i===ys)return t.DEPTH_COMPONENT;if(i===Fs)return t.DEPTH_STENCIL;if(i===nf)return t.RED;if(i===dl)return t.RED_INTEGER;if(i===rf)return t.RG;if(i===pl)return t.RG_INTEGER;if(i===ml)return t.RGBA_INTEGER;if(i===ta||i===na||i===ia||i===ra)if(o===ht)if(s=e.get("WEBGL_compressed_texture_s3tc_srgb"),s!==null){if(i===ta)return s.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(i===na)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(i===ia)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(i===ra)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(s=e.get("WEBGL_compressed_texture_s3tc"),s!==null){if(i===ta)return s.COMPRESSED_RGB_S3TC_DXT1_EXT;if(i===na)return s.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(i===ia)return s.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(i===ra)return s.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(i===gl||i===_l||i===vl||i===yl)if(s=e.get("WEBGL_compressed_texture_pvrtc"),s!==null){if(i===gl)return s.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(i===_l)return s.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(i===vl)return s.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(i===yl)return s.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(i===xl||i===bl||i===Ml)if(s=e.get("WEBGL_compressed_texture_etc"),s!==null){if(i===xl||i===bl)return o===ht?s.COMPRESSED_SRGB8_ETC2:s.COMPRESSED_RGB8_ETC2;if(i===Ml)return o===ht?s.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:s.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(i===Sl||i===wl||i===El||i===Tl||i===Al||i===Cl||i===Rl||i===Pl||i===Il||i===Dl||i===Ll||i===Ol||i===Nl||i===Fl)if(s=e.get("WEBGL_compressed_texture_astc"),s!==null){if(i===Sl)return o===ht?s.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:s.COMPRESSED_RGBA_ASTC_4x4_KHR;if(i===wl)return o===ht?s.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:s.COMPRESSED_RGBA_ASTC_5x4_KHR;if(i===El)return o===ht?s.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:s.COMPRESSED_RGBA_ASTC_5x5_KHR;if(i===Tl)return o===ht?s.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:s.COMPRESSED_RGBA_ASTC_6x5_KHR;if(i===Al)return o===ht?s.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:s.COMPRESSED_RGBA_ASTC_6x6_KHR;if(i===Cl)return o===ht?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:s.COMPRESSED_RGBA_ASTC_8x5_KHR;if(i===Rl)return o===ht?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:s.COMPRESSED_RGBA_ASTC_8x6_KHR;if(i===Pl)return o===ht?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:s.COMPRESSED_RGBA_ASTC_8x8_KHR;if(i===Il)return o===ht?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:s.COMPRESSED_RGBA_ASTC_10x5_KHR;if(i===Dl)return o===ht?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:s.COMPRESSED_RGBA_ASTC_10x6_KHR;if(i===Ll)return o===ht?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:s.COMPRESSED_RGBA_ASTC_10x8_KHR;if(i===Ol)return o===ht?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:s.COMPRESSED_RGBA_ASTC_10x10_KHR;if(i===Nl)return o===ht?s.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:s.COMPRESSED_RGBA_ASTC_12x10_KHR;if(i===Fl)return o===ht?s.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:s.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(i===Ul||i===zl||i===kl)if(s=e.get("EXT_texture_compression_bptc"),s!==null){if(i===Ul)return o===ht?s.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:s.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(i===zl)return s.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(i===kl)return s.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(i===Bl||i===Vl||i===Hl||i===Gl)if(s=e.get("EXT_texture_compression_rgtc"),s!==null){if(i===Bl)return s.COMPRESSED_RED_RGTC1_EXT;if(i===Vl)return s.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(i===Hl)return s.COMPRESSED_RED_GREEN_RGTC2_EXT;if(i===Gl)return s.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return i===Ns?t.UNSIGNED_INT_24_8:t[i]!==void 0?t[i]:null}return{convert:n}}var Xw=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,$w=`
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

}`,Tf=class{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,n){if(this.texture===null){let i=new zo(e.texture);(e.depthNear!==n.depthNear||e.depthFar!==n.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=i}}getMesh(e){if(this.texture!==null&&this.mesh===null){let n=e.cameras[0].viewport,i=new Bt({vertexShader:Xw,fragmentShader:$w,uniforms:{depthColor:{value:this.texture},depthWidth:{value:n.z},depthHeight:{value:n.w}}});this.mesh=new It(new Bo(20,20),i)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}},Af=class extends fi{constructor(e,n){super();let i=this,r=null,s=1,o=null,a="local-floor",l=1,c=null,h=null,u=null,d=null,f=null,m=null,_=typeof XRWebGLBinding<"u",g=new Tf,p={},x=n.getContextAttributes(),y=null,v=null,M=[],b=[],A=new ne,C=null,E=new Kt;E.viewport=new mt;let w=new Kt;w.viewport=new mt;let I=[E,w],N=new jc,B=null,L=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function($){let ee=M[$];return ee===void 0&&(ee=new Ts,M[$]=ee),ee.getTargetRaySpace()},this.getControllerGrip=function($){let ee=M[$];return ee===void 0&&(ee=new Ts,M[$]=ee),ee.getGripSpace()},this.getHand=function($){let ee=M[$];return ee===void 0&&(ee=new Ts,M[$]=ee),ee.getHandSpace()};function D($){let ee=b.indexOf($.inputSource);if(ee===-1)return;let be=M[ee];be!==void 0&&(be.update($.inputSource,$.frame,c||o),be.dispatchEvent({type:$.type,data:$.inputSource}))}function F(){r.removeEventListener("select",D),r.removeEventListener("selectstart",D),r.removeEventListener("selectend",D),r.removeEventListener("squeeze",D),r.removeEventListener("squeezestart",D),r.removeEventListener("squeezeend",D),r.removeEventListener("end",F),r.removeEventListener("inputsourceschange",J);for(let $=0;$<M.length;$++){let ee=b[$];ee!==null&&(b[$]=null,M[$].disconnect(ee))}B=null,L=null,g.reset();for(let $ in p)delete p[$];e.setRenderTarget(y),f=null,d=null,u=null,r=null,v=null,ke.stop(),i.isPresenting=!1,e.setPixelRatio(C),e.setSize(A.width,A.height,!1),i.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function($){s=$,i.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function($){a=$,i.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return c||o},this.setReferenceSpace=function($){c=$},this.getBaseLayer=function(){return d!==null?d:f},this.getBinding=function(){return u===null&&_&&(u=new XRWebGLBinding(r,n)),u},this.getFrame=function(){return m},this.getSession=function(){return r},this.setSession=async function($){if(r=$,r!==null){if(y=e.getRenderTarget(),r.addEventListener("select",D),r.addEventListener("selectstart",D),r.addEventListener("selectend",D),r.addEventListener("squeeze",D),r.addEventListener("squeezestart",D),r.addEventListener("squeezeend",D),r.addEventListener("end",F),r.addEventListener("inputsourceschange",J),x.xrCompatible!==!0&&await n.makeXRCompatible(),C=e.getPixelRatio(),e.getSize(A),_&&"createProjectionLayer"in XRWebGLBinding.prototype){let be=null,je=null,Le=null;x.depth&&(Le=x.stencil?n.DEPTH24_STENCIL8:n.DEPTH_COMPONENT24,be=x.stencil?Fs:ys,je=x.stencil?Ns:sr);let rt={colorFormat:n.RGBA8,depthFormat:Le,scaleFactor:s};u=this.getBinding(),d=u.createProjectionLayer(rt),r.updateRenderState({layers:[d]}),e.setPixelRatio(1),e.setSize(d.textureWidth,d.textureHeight,!1),v=new sn(d.textureWidth,d.textureHeight,{format:jn,type:ri,depthTexture:new Uo(d.textureWidth,d.textureHeight,je,void 0,void 0,void 0,void 0,void 0,void 0,be),stencilBuffer:x.stencil,colorSpace:e.outputColorSpace,samples:x.antialias?4:0,resolveDepthBuffer:d.ignoreDepthValues===!1,resolveStencilBuffer:d.ignoreDepthValues===!1})}else{let be={antialias:x.antialias,alpha:!0,depth:x.depth,stencil:x.stencil,framebufferScaleFactor:s};f=new XRWebGLLayer(r,n,be),r.updateRenderState({baseLayer:f}),e.setPixelRatio(1),e.setSize(f.framebufferWidth,f.framebufferHeight,!1),v=new sn(f.framebufferWidth,f.framebufferHeight,{format:jn,type:ri,colorSpace:e.outputColorSpace,stencilBuffer:x.stencil,resolveDepthBuffer:f.ignoreDepthValues===!1,resolveStencilBuffer:f.ignoreDepthValues===!1})}v.isXRRenderTarget=!0,this.setFoveation(l),c=null,o=await r.requestReferenceSpace(a),ke.setContext(r),ke.start(),i.isPresenting=!0,i.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(r!==null)return r.environmentBlendMode},this.getDepthTexture=function(){return g.getDepthTexture()};function J($){for(let ee=0;ee<$.removed.length;ee++){let be=$.removed[ee],je=b.indexOf(be);je>=0&&(b[je]=null,M[je].disconnect(be))}for(let ee=0;ee<$.added.length;ee++){let be=$.added[ee],je=b.indexOf(be);if(je===-1){for(let rt=0;rt<M.length;rt++)if(rt>=b.length){b.push(be),je=rt;break}else if(b[rt]===null){b[rt]=be,je=rt;break}if(je===-1)break}let Le=M[je];Le&&Le.connect(be)}}let G=new R,le=new R;function fe($,ee,be){G.setFromMatrixPosition(ee.matrixWorld),le.setFromMatrixPosition(be.matrixWorld);let je=G.distanceTo(le),Le=ee.projectionMatrix.elements,rt=be.projectionMatrix.elements,qt=Le[14]/(Le[10]-1),O=Le[14]/(Le[10]+1),Et=(Le[9]+1)/Le[5],Ye=(Le[9]-1)/Le[5],Be=(Le[8]-1)/Le[0],Te=(rt[8]+1)/rt[0],Tt=qt*Be,Ee=qt*Te,Ke=je/(-Be+Te),vt=Ke*-Be;if(ee.matrixWorld.decompose($.position,$.quaternion,$.scale),$.translateX(vt),$.translateZ(Ke),$.matrixWorld.compose($.position,$.quaternion,$.scale),$.matrixWorldInverse.copy($.matrixWorld).invert(),Le[10]===-1)$.projectionMatrix.copy(ee.projectionMatrix),$.projectionMatrixInverse.copy(ee.projectionMatrixInverse);else{let Pt=qt+Ke,P=O+Ke,S=Tt-vt,H=Ee+(je-vt),K=Et*O/P*Pt,ie=Ye*O/P*Pt;$.projectionMatrix.makePerspective(S,H,K,ie,Pt,P),$.projectionMatrixInverse.copy($.projectionMatrix).invert()}}function X($,ee){ee===null?$.matrixWorld.copy($.matrix):$.matrixWorld.multiplyMatrices(ee.matrixWorld,$.matrix),$.matrixWorldInverse.copy($.matrixWorld).invert()}this.updateCamera=function($){if(r===null)return;let ee=$.near,be=$.far;g.texture!==null&&(g.depthNear>0&&(ee=g.depthNear),g.depthFar>0&&(be=g.depthFar)),N.near=w.near=E.near=ee,N.far=w.far=E.far=be,(B!==N.near||L!==N.far)&&(r.updateRenderState({depthNear:N.near,depthFar:N.far}),B=N.near,L=N.far),N.layers.mask=$.layers.mask|6,E.layers.mask=N.layers.mask&3,w.layers.mask=N.layers.mask&5;let je=$.parent,Le=N.cameras;X(N,je);for(let rt=0;rt<Le.length;rt++)X(Le[rt],je);Le.length===2?fe(N,E,w):N.projectionMatrix.copy(E.projectionMatrix),re($,N,je)};function re($,ee,be){be===null?$.matrix.copy(ee.matrixWorld):($.matrix.copy(be.matrixWorld),$.matrix.invert(),$.matrix.multiply(ee.matrixWorld)),$.matrix.decompose($.position,$.quaternion,$.scale),$.updateMatrixWorld(!0),$.projectionMatrix.copy(ee.projectionMatrix),$.projectionMatrixInverse.copy(ee.projectionMatrixInverse),$.isPerspectiveCamera&&($.fov=xs*2*Math.atan(1/$.projectionMatrix.elements[5]),$.zoom=1)}this.getCamera=function(){return N},this.getFoveation=function(){if(!(d===null&&f===null))return l},this.setFoveation=function($){l=$,d!==null&&(d.fixedFoveation=$),f!==null&&f.fixedFoveation!==void 0&&(f.fixedFoveation=$)},this.hasDepthSensing=function(){return g.texture!==null},this.getDepthSensingMesh=function(){return g.getMesh(N)},this.getCameraTexture=function($){return p[$]};let ye=null;function Ue($,ee){if(h=ee.getViewerPose(c||o),m=ee,h!==null){let be=h.views;f!==null&&(e.setRenderTargetFramebuffer(v,f.framebuffer),e.setRenderTarget(v));let je=!1;be.length!==N.cameras.length&&(N.cameras.length=0,je=!0);for(let O=0;O<be.length;O++){let Et=be[O],Ye=null;if(f!==null)Ye=f.getViewport(Et);else{let Te=u.getViewSubImage(d,Et);Ye=Te.viewport,O===0&&(e.setRenderTargetTextures(v,Te.colorTexture,Te.depthStencilTexture),e.setRenderTarget(v))}let Be=I[O];Be===void 0&&(Be=new Kt,Be.layers.enable(O),Be.viewport=new mt,I[O]=Be),Be.matrix.fromArray(Et.transform.matrix),Be.matrix.decompose(Be.position,Be.quaternion,Be.scale),Be.projectionMatrix.fromArray(Et.projectionMatrix),Be.projectionMatrixInverse.copy(Be.projectionMatrix).invert(),Be.viewport.set(Ye.x,Ye.y,Ye.width,Ye.height),O===0&&(N.matrix.copy(Be.matrix),N.matrix.decompose(N.position,N.quaternion,N.scale)),je===!0&&N.cameras.push(Be)}let Le=r.enabledFeatures;if(Le&&Le.includes("depth-sensing")&&r.depthUsage=="gpu-optimized"&&_){u=i.getBinding();let O=u.getDepthInformation(be[0]);O&&O.isValid&&O.texture&&g.init(O,r.renderState)}if(Le&&Le.includes("camera-access")&&_){e.state.unbindTexture(),u=i.getBinding();for(let O=0;O<be.length;O++){let Et=be[O].camera;if(Et){let Ye=p[Et];Ye||(Ye=new zo,p[Et]=Ye);let Be=u.getCameraImage(Et);Ye.sourceTexture=Be}}}}for(let be=0;be<M.length;be++){let je=b[be],Le=M[be];je!==null&&Le!==void 0&&Le.update(je,ee,c||o)}ye&&ye($,ee),ee.detectedPlanes&&i.dispatchEvent({type:"planesdetected",data:ee}),m=null}let ke=new fg;ke.setAnimationLoop(Ue),this.setAnimationLoop=function($){ye=$},this.dispose=function(){}}},kr=new Bn,Yw=new Xe;function Zw(t,e){function n(g,p){g.matrixAutoUpdate===!0&&g.updateMatrix(),p.value.copy(g.matrix)}function i(g,p){p.color.getRGB(g.fogColor.value,lf(t)),p.isFog?(g.fogNear.value=p.near,g.fogFar.value=p.far):p.isFogExp2&&(g.fogDensity.value=p.density)}function r(g,p,x,y,v){p.isMeshBasicMaterial||p.isMeshLambertMaterial?s(g,p):p.isMeshToonMaterial?(s(g,p),u(g,p)):p.isMeshPhongMaterial?(s(g,p),h(g,p)):p.isMeshStandardMaterial?(s(g,p),d(g,p),p.isMeshPhysicalMaterial&&f(g,p,v)):p.isMeshMatcapMaterial?(s(g,p),m(g,p)):p.isMeshDepthMaterial?s(g,p):p.isMeshDistanceMaterial?(s(g,p),_(g,p)):p.isMeshNormalMaterial?s(g,p):p.isLineBasicMaterial?(o(g,p),p.isLineDashedMaterial&&a(g,p)):p.isPointsMaterial?l(g,p,x,y):p.isSpriteMaterial?c(g,p):p.isShadowMaterial?(g.color.value.copy(p.color),g.opacity.value=p.opacity):p.isShaderMaterial&&(p.uniformsNeedUpdate=!1)}function s(g,p){g.opacity.value=p.opacity,p.color&&g.diffuse.value.copy(p.color),p.emissive&&g.emissive.value.copy(p.emissive).multiplyScalar(p.emissiveIntensity),p.map&&(g.map.value=p.map,n(p.map,g.mapTransform)),p.alphaMap&&(g.alphaMap.value=p.alphaMap,n(p.alphaMap,g.alphaMapTransform)),p.bumpMap&&(g.bumpMap.value=p.bumpMap,n(p.bumpMap,g.bumpMapTransform),g.bumpScale.value=p.bumpScale,p.side===Jt&&(g.bumpScale.value*=-1)),p.normalMap&&(g.normalMap.value=p.normalMap,n(p.normalMap,g.normalMapTransform),g.normalScale.value.copy(p.normalScale),p.side===Jt&&g.normalScale.value.negate()),p.displacementMap&&(g.displacementMap.value=p.displacementMap,n(p.displacementMap,g.displacementMapTransform),g.displacementScale.value=p.displacementScale,g.displacementBias.value=p.displacementBias),p.emissiveMap&&(g.emissiveMap.value=p.emissiveMap,n(p.emissiveMap,g.emissiveMapTransform)),p.specularMap&&(g.specularMap.value=p.specularMap,n(p.specularMap,g.specularMapTransform)),p.alphaTest>0&&(g.alphaTest.value=p.alphaTest);let x=e.get(p),y=x.envMap,v=x.envMapRotation;y&&(g.envMap.value=y,kr.copy(v),kr.x*=-1,kr.y*=-1,kr.z*=-1,y.isCubeTexture&&y.isRenderTargetTexture===!1&&(kr.y*=-1,kr.z*=-1),g.envMapRotation.value.setFromMatrix4(Yw.makeRotationFromEuler(kr)),g.flipEnvMap.value=y.isCubeTexture&&y.isRenderTargetTexture===!1?-1:1,g.reflectivity.value=p.reflectivity,g.ior.value=p.ior,g.refractionRatio.value=p.refractionRatio),p.lightMap&&(g.lightMap.value=p.lightMap,g.lightMapIntensity.value=p.lightMapIntensity,n(p.lightMap,g.lightMapTransform)),p.aoMap&&(g.aoMap.value=p.aoMap,g.aoMapIntensity.value=p.aoMapIntensity,n(p.aoMap,g.aoMapTransform))}function o(g,p){g.diffuse.value.copy(p.color),g.opacity.value=p.opacity,p.map&&(g.map.value=p.map,n(p.map,g.mapTransform))}function a(g,p){g.dashSize.value=p.dashSize,g.totalSize.value=p.dashSize+p.gapSize,g.scale.value=p.scale}function l(g,p,x,y){g.diffuse.value.copy(p.color),g.opacity.value=p.opacity,g.size.value=p.size*x,g.scale.value=y*.5,p.map&&(g.map.value=p.map,n(p.map,g.uvTransform)),p.alphaMap&&(g.alphaMap.value=p.alphaMap,n(p.alphaMap,g.alphaMapTransform)),p.alphaTest>0&&(g.alphaTest.value=p.alphaTest)}function c(g,p){g.diffuse.value.copy(p.color),g.opacity.value=p.opacity,g.rotation.value=p.rotation,p.map&&(g.map.value=p.map,n(p.map,g.mapTransform)),p.alphaMap&&(g.alphaMap.value=p.alphaMap,n(p.alphaMap,g.alphaMapTransform)),p.alphaTest>0&&(g.alphaTest.value=p.alphaTest)}function h(g,p){g.specular.value.copy(p.specular),g.shininess.value=Math.max(p.shininess,1e-4)}function u(g,p){p.gradientMap&&(g.gradientMap.value=p.gradientMap)}function d(g,p){g.metalness.value=p.metalness,p.metalnessMap&&(g.metalnessMap.value=p.metalnessMap,n(p.metalnessMap,g.metalnessMapTransform)),g.roughness.value=p.roughness,p.roughnessMap&&(g.roughnessMap.value=p.roughnessMap,n(p.roughnessMap,g.roughnessMapTransform)),p.envMap&&(g.envMapIntensity.value=p.envMapIntensity)}function f(g,p,x){g.ior.value=p.ior,p.sheen>0&&(g.sheenColor.value.copy(p.sheenColor).multiplyScalar(p.sheen),g.sheenRoughness.value=p.sheenRoughness,p.sheenColorMap&&(g.sheenColorMap.value=p.sheenColorMap,n(p.sheenColorMap,g.sheenColorMapTransform)),p.sheenRoughnessMap&&(g.sheenRoughnessMap.value=p.sheenRoughnessMap,n(p.sheenRoughnessMap,g.sheenRoughnessMapTransform))),p.clearcoat>0&&(g.clearcoat.value=p.clearcoat,g.clearcoatRoughness.value=p.clearcoatRoughness,p.clearcoatMap&&(g.clearcoatMap.value=p.clearcoatMap,n(p.clearcoatMap,g.clearcoatMapTransform)),p.clearcoatRoughnessMap&&(g.clearcoatRoughnessMap.value=p.clearcoatRoughnessMap,n(p.clearcoatRoughnessMap,g.clearcoatRoughnessMapTransform)),p.clearcoatNormalMap&&(g.clearcoatNormalMap.value=p.clearcoatNormalMap,n(p.clearcoatNormalMap,g.clearcoatNormalMapTransform),g.clearcoatNormalScale.value.copy(p.clearcoatNormalScale),p.side===Jt&&g.clearcoatNormalScale.value.negate())),p.dispersion>0&&(g.dispersion.value=p.dispersion),p.iridescence>0&&(g.iridescence.value=p.iridescence,g.iridescenceIOR.value=p.iridescenceIOR,g.iridescenceThicknessMinimum.value=p.iridescenceThicknessRange[0],g.iridescenceThicknessMaximum.value=p.iridescenceThicknessRange[1],p.iridescenceMap&&(g.iridescenceMap.value=p.iridescenceMap,n(p.iridescenceMap,g.iridescenceMapTransform)),p.iridescenceThicknessMap&&(g.iridescenceThicknessMap.value=p.iridescenceThicknessMap,n(p.iridescenceThicknessMap,g.iridescenceThicknessMapTransform))),p.transmission>0&&(g.transmission.value=p.transmission,g.transmissionSamplerMap.value=x.texture,g.transmissionSamplerSize.value.set(x.width,x.height),p.transmissionMap&&(g.transmissionMap.value=p.transmissionMap,n(p.transmissionMap,g.transmissionMapTransform)),g.thickness.value=p.thickness,p.thicknessMap&&(g.thicknessMap.value=p.thicknessMap,n(p.thicknessMap,g.thicknessMapTransform)),g.attenuationDistance.value=p.attenuationDistance,g.attenuationColor.value.copy(p.attenuationColor)),p.anisotropy>0&&(g.anisotropyVector.value.set(p.anisotropy*Math.cos(p.anisotropyRotation),p.anisotropy*Math.sin(p.anisotropyRotation)),p.anisotropyMap&&(g.anisotropyMap.value=p.anisotropyMap,n(p.anisotropyMap,g.anisotropyMapTransform))),g.specularIntensity.value=p.specularIntensity,g.specularColor.value.copy(p.specularColor),p.specularColorMap&&(g.specularColorMap.value=p.specularColorMap,n(p.specularColorMap,g.specularColorMapTransform)),p.specularIntensityMap&&(g.specularIntensityMap.value=p.specularIntensityMap,n(p.specularIntensityMap,g.specularIntensityMapTransform))}function m(g,p){p.matcap&&(g.matcap.value=p.matcap)}function _(g,p){let x=e.get(p).light;g.referencePosition.value.setFromMatrixPosition(x.matrixWorld),g.nearDistance.value=x.shadow.camera.near,g.farDistance.value=x.shadow.camera.far}return{refreshFogUniforms:i,refreshMaterialUniforms:r}}function Kw(t,e,n,i){let r={},s={},o=[],a=t.getParameter(t.MAX_UNIFORM_BUFFER_BINDINGS);function l(x,y){let v=y.program;i.uniformBlockBinding(x,v)}function c(x,y){let v=r[x.id];v===void 0&&(m(x),v=h(x),r[x.id]=v,x.addEventListener("dispose",g));let M=y.program;i.updateUBOMapping(x,M);let b=e.render.frame;s[x.id]!==b&&(d(x),s[x.id]=b)}function h(x){let y=u();x.__bindingPointIndex=y;let v=t.createBuffer(),M=x.__size,b=x.usage;return t.bindBuffer(t.UNIFORM_BUFFER,v),t.bufferData(t.UNIFORM_BUFFER,M,b),t.bindBuffer(t.UNIFORM_BUFFER,null),t.bindBufferBase(t.UNIFORM_BUFFER,y,v),v}function u(){for(let x=0;x<a;x++)if(o.indexOf(x)===-1)return o.push(x),x;return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function d(x){let y=r[x.id],v=x.uniforms,M=x.__cache;t.bindBuffer(t.UNIFORM_BUFFER,y);for(let b=0,A=v.length;b<A;b++){let C=Array.isArray(v[b])?v[b]:[v[b]];for(let E=0,w=C.length;E<w;E++){let I=C[E];if(f(I,b,E,M)===!0){let N=I.__offset,B=Array.isArray(I.value)?I.value:[I.value],L=0;for(let D=0;D<B.length;D++){let F=B[D],J=_(F);typeof F=="number"||typeof F=="boolean"?(I.__data[0]=F,t.bufferSubData(t.UNIFORM_BUFFER,N+L,I.__data)):F.isMatrix3?(I.__data[0]=F.elements[0],I.__data[1]=F.elements[1],I.__data[2]=F.elements[2],I.__data[3]=0,I.__data[4]=F.elements[3],I.__data[5]=F.elements[4],I.__data[6]=F.elements[5],I.__data[7]=0,I.__data[8]=F.elements[6],I.__data[9]=F.elements[7],I.__data[10]=F.elements[8],I.__data[11]=0):(F.toArray(I.__data,L),L+=J.storage/Float32Array.BYTES_PER_ELEMENT)}t.bufferSubData(t.UNIFORM_BUFFER,N,I.__data)}}}t.bindBuffer(t.UNIFORM_BUFFER,null)}function f(x,y,v,M){let b=x.value,A=y+"_"+v;if(M[A]===void 0)return typeof b=="number"||typeof b=="boolean"?M[A]=b:M[A]=b.clone(),!0;{let C=M[A];if(typeof b=="number"||typeof b=="boolean"){if(C!==b)return M[A]=b,!0}else if(C.equals(b)===!1)return C.copy(b),!0}return!1}function m(x){let y=x.uniforms,v=0,M=16;for(let A=0,C=y.length;A<C;A++){let E=Array.isArray(y[A])?y[A]:[y[A]];for(let w=0,I=E.length;w<I;w++){let N=E[w],B=Array.isArray(N.value)?N.value:[N.value];for(let L=0,D=B.length;L<D;L++){let F=B[L],J=_(F),G=v%M,le=G%J.boundary,fe=G+le;v+=le,fe!==0&&M-fe<J.storage&&(v+=M-fe),N.__data=new Float32Array(J.storage/Float32Array.BYTES_PER_ELEMENT),N.__offset=v,v+=J.storage}}}let b=v%M;return b>0&&(v+=M-b),x.__size=v,x.__cache={},this}function _(x){let y={boundary:0,storage:0};return typeof x=="number"||typeof x=="boolean"?(y.boundary=4,y.storage=4):x.isVector2?(y.boundary=8,y.storage=8):x.isVector3||x.isColor?(y.boundary=16,y.storage=12):x.isVector4?(y.boundary=16,y.storage=16):x.isMatrix3?(y.boundary=48,y.storage=48):x.isMatrix4?(y.boundary=64,y.storage=64):x.isTexture?console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group."):console.warn("THREE.WebGLRenderer: Unsupported uniform value type.",x),y}function g(x){let y=x.target;y.removeEventListener("dispose",g);let v=o.indexOf(y.__bindingPointIndex);o.splice(v,1),t.deleteBuffer(r[y.id]),delete r[y.id],delete s[y.id]}function p(){for(let x in r)t.deleteBuffer(r[x]);o=[],r={},s={}}return{bind:l,update:c,dispose:p}}var Yl=class{constructor(e={}){let{canvas:n=zm(),context:i=null,depth:r=!0,stencil:s=!1,alpha:o=!1,antialias:a=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:u=!1,reversedDepthBuffer:d=!1}=e;this.isWebGLRenderer=!0;let f;if(i!==null){if(typeof WebGLRenderingContext<"u"&&i instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");f=i.getContextAttributes().alpha}else f=o;let m=new Uint32Array(4),_=new Int32Array(4),g=null,p=null,x=[],y=[];this.domElement=n,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=zi,this.toneMappingExposure=1,this.transmissionResolutionScale=1;let v=this,M=!1;this._outputColorSpace=Zt;let b=0,A=0,C=null,E=-1,w=null,I=new mt,N=new mt,B=null,L=new Oe(0),D=0,F=n.width,J=n.height,G=1,le=null,fe=null,X=new mt(0,0,F,J),re=new mt(0,0,F,J),ye=!1,Ue=new As,ke=!1,$=!1,ee=new Xe,be=new R,je=new mt,Le={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},rt=!1;function qt(){return C===null?G:1}let O=i;function Et(T,k){return n.getContext(T,k)}try{let T={alpha:!0,depth:r,stencil:s,antialias:a,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:h,failIfMajorPerformanceCaveat:u};if("setAttribute"in n&&n.setAttribute("data-engine",`three.js r${"180"}`),n.addEventListener("webglcontextlost",ue,!1),n.addEventListener("webglcontextrestored",Me,!1),n.addEventListener("webglcontextcreationerror",se,!1),O===null){let k="webgl2";if(O=Et(k,T),O===null)throw Et(k)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(T){throw console.error("THREE.WebGLRenderer: "+T.message),T}let Ye,Be,Te,Tt,Ee,Ke,vt,Pt,P,S,H,K,ie,Z,Re,he,Pe,Ae,oe,me,Ve,Ie,de,Ze;function z(){Ye=new mS(O),Ye.init(),Ie=new qw(O,Ye),Be=new cS(O,Ye,e,Ie),Te=new Ww(O,Ye),Be.reversedDepthBuffer&&d&&Te.buffers.depth.setReversed(!0),Tt=new vS(O),Ee=new Iw,Ke=new jw(O,Ye,Te,Ee,Be,Ie,Tt),vt=new hS(v),Pt=new pS(v),P=new wb(O),de=new oS(O,P),S=new gS(O,P,Tt,de),H=new xS(O,S,P,Tt),oe=new yS(O,Be,Ke),he=new lS(Ee),K=new Pw(v,vt,Pt,Ye,Be,de,he),ie=new Zw(v,Ee),Z=new Lw,Re=new kw(Ye),Ae=new sS(v,vt,Pt,Te,H,f,l),Pe=new Hw(v,H,Be),Ze=new Kw(O,Tt,Be,Te),me=new aS(O,Ye,Tt),Ve=new _S(O,Ye,Tt),Tt.programs=K.programs,v.capabilities=Be,v.extensions=Ye,v.properties=Ee,v.renderLists=Z,v.shadowMap=Pe,v.state=Te,v.info=Tt}z();let ae=new Af(v,O);this.xr=ae,this.getContext=function(){return O},this.getContextAttributes=function(){return O.getContextAttributes()},this.forceContextLoss=function(){let T=Ye.get("WEBGL_lose_context");T&&T.loseContext()},this.forceContextRestore=function(){let T=Ye.get("WEBGL_lose_context");T&&T.restoreContext()},this.getPixelRatio=function(){return G},this.setPixelRatio=function(T){T!==void 0&&(G=T,this.setSize(F,J,!1))},this.getSize=function(T){return T.set(F,J)},this.setSize=function(T,k,j=!0){if(ae.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}F=T,J=k,n.width=Math.floor(T*G),n.height=Math.floor(k*G),j===!0&&(n.style.width=T+"px",n.style.height=k+"px"),this.setViewport(0,0,T,k)},this.getDrawingBufferSize=function(T){return T.set(F*G,J*G).floor()},this.setDrawingBufferSize=function(T,k,j){F=T,J=k,G=j,n.width=Math.floor(T*j),n.height=Math.floor(k*j),this.setViewport(0,0,T,k)},this.getCurrentViewport=function(T){return T.copy(I)},this.getViewport=function(T){return T.copy(X)},this.setViewport=function(T,k,j,q){T.isVector4?X.set(T.x,T.y,T.z,T.w):X.set(T,k,j,q),Te.viewport(I.copy(X).multiplyScalar(G).round())},this.getScissor=function(T){return T.copy(re)},this.setScissor=function(T,k,j,q){T.isVector4?re.set(T.x,T.y,T.z,T.w):re.set(T,k,j,q),Te.scissor(N.copy(re).multiplyScalar(G).round())},this.getScissorTest=function(){return ye},this.setScissorTest=function(T){Te.setScissorTest(ye=T)},this.setOpaqueSort=function(T){le=T},this.setTransparentSort=function(T){fe=T},this.getClearColor=function(T){return T.copy(Ae.getClearColor())},this.setClearColor=function(){Ae.setClearColor(...arguments)},this.getClearAlpha=function(){return Ae.getClearAlpha()},this.setClearAlpha=function(){Ae.setClearAlpha(...arguments)},this.clear=function(T=!0,k=!0,j=!0){let q=0;if(T){let V=!1;if(C!==null){let ce=C.texture.format;V=ce===ml||ce===pl||ce===dl}if(V){let ce=C.texture.type,ge=ce===ri||ce===sr||ce===Os||ce===Ns||ce===ul||ce===fl,Ce=Ae.getClearColor(),Se=Ae.getClearAlpha(),Ge=Ce.r,qe=Ce.g,Fe=Ce.b;ge?(m[0]=Ge,m[1]=qe,m[2]=Fe,m[3]=Se,O.clearBufferuiv(O.COLOR,0,m)):(_[0]=Ge,_[1]=qe,_[2]=Fe,_[3]=Se,O.clearBufferiv(O.COLOR,0,_))}else q|=O.COLOR_BUFFER_BIT}k&&(q|=O.DEPTH_BUFFER_BIT),j&&(q|=O.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),O.clear(q)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){n.removeEventListener("webglcontextlost",ue,!1),n.removeEventListener("webglcontextrestored",Me,!1),n.removeEventListener("webglcontextcreationerror",se,!1),Ae.dispose(),Z.dispose(),Re.dispose(),Ee.dispose(),vt.dispose(),Pt.dispose(),H.dispose(),de.dispose(),Ze.dispose(),K.dispose(),ae.dispose(),ae.removeEventListener("sessionstart",Y),ae.removeEventListener("sessionend",W),te.stop()};function ue(T){T.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),M=!0}function Me(){console.log("THREE.WebGLRenderer: Context Restored."),M=!1;let T=Tt.autoReset,k=Pe.enabled,j=Pe.autoUpdate,q=Pe.needsUpdate,V=Pe.type;z(),Tt.autoReset=T,Pe.enabled=k,Pe.autoUpdate=j,Pe.needsUpdate=q,Pe.type=V}function se(T){console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ",T.statusMessage)}function Q(T){let k=T.target;k.removeEventListener("dispose",Q),we(k)}function we(T){We(T),Ee.remove(T)}function We(T){let k=Ee.get(T).programs;k!==void 0&&(k.forEach(function(j){K.releaseProgram(j)}),T.isShaderMaterial&&K.releaseShaderCache(T))}this.renderBufferDirect=function(T,k,j,q,V,ce){k===null&&(k=Le);let ge=V.isMesh&&V.matrixWorld.determinant()<0,Ce=lx(T,k,j,q,V);Te.setMaterial(q,ge);let Se=j.index,Ge=1;if(q.wireframe===!0){if(Se=S.getWireframeAttribute(j),Se===void 0)return;Ge=2}let qe=j.drawRange,Fe=j.attributes.position,st=qe.start*Ge,xt=(qe.start+qe.count)*Ge;ce!==null&&(st=Math.max(st,ce.start*Ge),xt=Math.min(xt,(ce.start+ce.count)*Ge)),Se!==null?(st=Math.max(st,0),xt=Math.min(xt,Se.count)):Fe!=null&&(st=Math.max(st,0),xt=Math.min(xt,Fe.count));let Ut=xt-st;if(Ut<0||Ut===1/0)return;de.setup(V,q,Ce,j,Se);let Ct,Mt=me;if(Se!==null&&(Ct=P.get(Se),Mt=Ve,Mt.setIndex(Ct)),V.isMesh)q.wireframe===!0?(Te.setLineWidth(q.wireframeLinewidth*qt()),Mt.setMode(O.LINES)):Mt.setMode(O.TRIANGLES);else if(V.isLine){let ze=q.linewidth;ze===void 0&&(ze=1),Te.setLineWidth(ze*qt()),V.isLineSegments?Mt.setMode(O.LINES):V.isLineLoop?Mt.setMode(O.LINE_LOOP):Mt.setMode(O.LINE_STRIP)}else V.isPoints?Mt.setMode(O.POINTS):V.isSprite&&Mt.setMode(O.TRIANGLES);if(V.isBatchedMesh)if(V._multiDrawInstances!==null)Ms("THREE.WebGLRenderer: renderMultiDrawInstances has been deprecated and will be removed in r184. Append to renderMultiDraw arguments and use indirection."),Mt.renderMultiDrawInstances(V._multiDrawStarts,V._multiDrawCounts,V._multiDrawCount,V._multiDrawInstances);else if(Ye.get("WEBGL_multi_draw"))Mt.renderMultiDraw(V._multiDrawStarts,V._multiDrawCounts,V._multiDrawCount);else{let ze=V._multiDrawStarts,Ot=V._multiDrawCounts,lt=V._multiDrawCount,wn=Se?P.get(Se).bytesPerElement:1,es=Ee.get(q).currentProgram.getUniforms();for(let En=0;En<lt;En++)es.setValue(O,"_gl_DrawID",En),Mt.render(ze[En]/wn,Ot[En])}else if(V.isInstancedMesh)Mt.renderInstances(st,Ut,V.count);else if(j.isInstancedBufferGeometry){let ze=j._maxInstanceCount!==void 0?j._maxInstanceCount:1/0,Ot=Math.min(j.instanceCount,ze);Mt.renderInstances(st,Ut,Ot)}else Mt.render(st,Ut)};function yt(T,k,j){T.transparent===!0&&T.side===_i&&T.forceSinglePass===!1?(T.side=Jt,T.needsUpdate=!0,ui(T,k,j),T.side=Di,T.needsUpdate=!0,ui(T,k,j),T.side=_i):ui(T,k,j)}this.compile=function(T,k,j=null){j===null&&(j=T),p=Re.get(j),p.init(k),y.push(p),j.traverseVisible(function(V){V.isLight&&V.layers.test(k.layers)&&(p.pushLight(V),V.castShadow&&p.pushShadow(V))}),T!==j&&T.traverseVisible(function(V){V.isLight&&V.layers.test(k.layers)&&(p.pushLight(V),V.castShadow&&p.pushShadow(V))}),p.setupLights();let q=new Set;return T.traverse(function(V){if(!(V.isMesh||V.isPoints||V.isLine||V.isSprite))return;let ce=V.material;if(ce)if(Array.isArray(ce))for(let ge=0;ge<ce.length;ge++){let Ce=ce[ge];yt(Ce,j,V),q.add(Ce)}else yt(ce,j,V),q.add(ce)}),p=y.pop(),q},this.compileAsync=function(T,k,j=null){let q=this.compile(T,k,j);return new Promise(V=>{function ce(){if(q.forEach(function(ge){Ee.get(ge).currentProgram.isReady()&&q.delete(ge)}),q.size===0){V(T);return}setTimeout(ce,10)}Ye.get("KHR_parallel_shader_compile")!==null?ce():setTimeout(ce,10)})};let ct=null;function U(T){ct&&ct(T)}function Y(){te.stop()}function W(){te.start()}let te=new fg;te.setAnimationLoop(U),typeof self<"u"&&te.setContext(self),this.setAnimationLoop=function(T){ct=T,ae.setAnimationLoop(T),T===null?te.stop():te.start()},ae.addEventListener("sessionstart",Y),ae.addEventListener("sessionend",W),this.render=function(T,k){if(k!==void 0&&k.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(M===!0)return;if(T.matrixWorldAutoUpdate===!0&&T.updateMatrixWorld(),k.parent===null&&k.matrixWorldAutoUpdate===!0&&k.updateMatrixWorld(),ae.enabled===!0&&ae.isPresenting===!0&&(ae.cameraAutoUpdate===!0&&ae.updateCamera(k),k=ae.getCamera()),T.isScene===!0&&T.onBeforeRender(v,T,k,C),p=Re.get(T,y.length),p.init(k),y.push(p),ee.multiplyMatrices(k.projectionMatrix,k.matrixWorldInverse),Ue.setFromProjectionMatrix(ee,ei,k.reversedDepth),$=this.localClippingEnabled,ke=he.init(this.clippingPlanes,$),g=Z.get(T,x.length),g.init(),x.push(g),ae.enabled===!0&&ae.isPresenting===!0){let ce=v.xr.getDepthSensingMesh();ce!==null&&_e(ce,k,-1/0,v.sortObjects)}_e(T,k,0,v.sortObjects),g.finish(),v.sortObjects===!0&&g.sort(le,fe),rt=ae.enabled===!1||ae.isPresenting===!1||ae.hasDepthSensing()===!1,rt&&Ae.addToRenderList(g,T),this.info.render.frame++,ke===!0&&he.beginShadows();let j=p.state.shadowsArray;Pe.render(j,T,k),ke===!0&&he.endShadows(),this.info.autoReset===!0&&this.info.reset();let q=g.opaque,V=g.transmissive;if(p.setupLights(),k.isArrayCamera){let ce=k.cameras;if(V.length>0)for(let ge=0,Ce=ce.length;ge<Ce;ge++){let Se=ce[ge];ve(q,V,T,Se)}rt&&Ae.render(T);for(let ge=0,Ce=ce.length;ge<Ce;ge++){let Se=ce[ge];xe(g,T,Se,Se.viewport)}}else V.length>0&&ve(q,V,T,k),rt&&Ae.render(T),xe(g,T,k);C!==null&&A===0&&(Ke.updateMultisampleRenderTarget(C),Ke.updateRenderTargetMipmap(C)),T.isScene===!0&&T.onAfterRender(v,T,k),de.resetDefaultState(),E=-1,w=null,y.pop(),y.length>0?(p=y[y.length-1],ke===!0&&he.setGlobalState(v.clippingPlanes,p.state.camera)):p=null,x.pop(),x.length>0?g=x[x.length-1]:g=null};function _e(T,k,j,q){if(T.visible===!1)return;if(T.layers.test(k.layers)){if(T.isGroup)j=T.renderOrder;else if(T.isLOD)T.autoUpdate===!0&&T.update(k);else if(T.isLight)p.pushLight(T),T.castShadow&&p.pushShadow(T);else if(T.isSprite){if(!T.frustumCulled||Ue.intersectsSprite(T)){q&&je.setFromMatrixPosition(T.matrixWorld).applyMatrix4(ee);let ge=H.update(T),Ce=T.material;Ce.visible&&g.push(T,ge,Ce,j,je.z,null)}}else if((T.isMesh||T.isLine||T.isPoints)&&(!T.frustumCulled||Ue.intersectsObject(T))){let ge=H.update(T),Ce=T.material;if(q&&(T.boundingSphere!==void 0?(T.boundingSphere===null&&T.computeBoundingSphere(),je.copy(T.boundingSphere.center)):(ge.boundingSphere===null&&ge.computeBoundingSphere(),je.copy(ge.boundingSphere.center)),je.applyMatrix4(T.matrixWorld).applyMatrix4(ee)),Array.isArray(Ce)){let Se=ge.groups;for(let Ge=0,qe=Se.length;Ge<qe;Ge++){let Fe=Se[Ge],st=Ce[Fe.materialIndex];st&&st.visible&&g.push(T,ge,st,j,je.z,Fe)}}else Ce.visible&&g.push(T,ge,Ce,j,je.z,null)}}let ce=T.children;for(let ge=0,Ce=ce.length;ge<Ce;ge++)_e(ce[ge],k,j,q)}function xe(T,k,j,q){let V=T.opaque,ce=T.transmissive,ge=T.transparent;p.setupLightsView(j),ke===!0&&he.setGlobalState(v.clippingPlanes,j),q&&Te.viewport(I.copy(q)),V.length>0&&$e(V,k,j),ce.length>0&&$e(ce,k,j),ge.length>0&&$e(ge,k,j),Te.buffers.depth.setTest(!0),Te.buffers.depth.setMask(!0),Te.buffers.color.setMask(!0),Te.setPolygonOffset(!1)}function ve(T,k,j,q){if((j.isScene===!0?j.overrideMaterial:null)!==null)return;p.state.transmissionRenderTarget[q.id]===void 0&&(p.state.transmissionRenderTarget[q.id]=new sn(1,1,{generateMipmaps:!0,type:Ye.has("EXT_color_buffer_half_float")||Ye.has("EXT_color_buffer_float")?Wn:ri,minFilter:rr,samples:4,stencilBuffer:s,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:ot.workingColorSpace}));let ce=p.state.transmissionRenderTarget[q.id],ge=q.viewport||I;ce.setSize(ge.z*v.transmissionResolutionScale,ge.w*v.transmissionResolutionScale);let Ce=v.getRenderTarget(),Se=v.getActiveCubeFace(),Ge=v.getActiveMipmapLevel();v.setRenderTarget(ce),v.getClearColor(L),D=v.getClearAlpha(),D<1&&v.setClearColor(16777215,.5),v.clear(),rt&&Ae.render(j);let qe=v.toneMapping;v.toneMapping=zi;let Fe=q.viewport;if(q.viewport!==void 0&&(q.viewport=void 0),p.setupLightsView(q),ke===!0&&he.setGlobalState(v.clippingPlanes,q),$e(T,j,q),Ke.updateMultisampleRenderTarget(ce),Ke.updateRenderTargetMipmap(ce),Ye.has("WEBGL_multisampled_render_to_texture")===!1){let st=!1;for(let xt=0,Ut=k.length;xt<Ut;xt++){let Ct=k[xt],Mt=Ct.object,ze=Ct.geometry,Ot=Ct.material,lt=Ct.group;if(Ot.side===_i&&Mt.layers.test(q.layers)){let wn=Ot.side;Ot.side=Jt,Ot.needsUpdate=!0,Ft(Mt,j,q,ze,Ot,lt),Ot.side=wn,Ot.needsUpdate=!0,st=!0}}st===!0&&(Ke.updateMultisampleRenderTarget(ce),Ke.updateRenderTargetMipmap(ce))}v.setRenderTarget(Ce,Se,Ge),v.setClearColor(L,D),Fe!==void 0&&(q.viewport=Fe),v.toneMapping=qe}function $e(T,k,j){let q=k.isScene===!0?k.overrideMaterial:null;for(let V=0,ce=T.length;V<ce;V++){let ge=T[V],Ce=ge.object,Se=ge.geometry,Ge=ge.group,qe=ge.material;qe.allowOverride===!0&&q!==null&&(qe=q),Ce.layers.test(j.layers)&&Ft(Ce,k,j,Se,qe,Ge)}}function Ft(T,k,j,q,V,ce){T.onBeforeRender(v,k,j,q,V,ce),T.modelViewMatrix.multiplyMatrices(j.matrixWorldInverse,T.matrixWorld),T.normalMatrix.getNormalMatrix(T.modelViewMatrix),V.onBeforeRender(v,k,j,q,T,ce),V.transparent===!0&&V.side===_i&&V.forceSinglePass===!1?(V.side=Jt,V.needsUpdate=!0,v.renderBufferDirect(j,k,q,V,T,ce),V.side=Di,V.needsUpdate=!0,v.renderBufferDirect(j,k,q,V,T,ce),V.side=_i):v.renderBufferDirect(j,k,q,V,T,ce),T.onAfterRender(v,k,j,q,V,ce)}function ui(T,k,j){k.isScene!==!0&&(k=Le);let q=Ee.get(T),V=p.state.lights,ce=p.state.shadowsArray,ge=V.state.version,Ce=K.getParameters(T,V.state,ce,k,j),Se=K.getProgramCacheKey(Ce),Ge=q.programs;q.environment=T.isMeshStandardMaterial?k.environment:null,q.fog=k.fog,q.envMap=(T.isMeshStandardMaterial?Pt:vt).get(T.envMap||q.environment),q.envMapRotation=q.environment!==null&&T.envMap===null?k.environmentRotation:T.envMapRotation,Ge===void 0&&(T.addEventListener("dispose",Q),Ge=new Map,q.programs=Ge);let qe=Ge.get(Se);if(qe!==void 0){if(q.currentProgram===qe&&q.lightsStateVersion===ge)return co(T,Ce),qe}else Ce.uniforms=K.getUniforms(T),T.onBeforeCompile(Ce,v),qe=K.acquireProgram(Ce,Se),Ge.set(Se,qe),q.uniforms=Ce.uniforms;let Fe=q.uniforms;return(!T.isShaderMaterial&&!T.isRawShaderMaterial||T.clipping===!0)&&(Fe.clippingPlanes=he.uniform),co(T,Ce),q.needsLights=ux(T),q.lightsStateVersion=ge,q.needsLights&&(Fe.ambientLightColor.value=V.state.ambient,Fe.lightProbe.value=V.state.probe,Fe.directionalLights.value=V.state.directional,Fe.directionalLightShadows.value=V.state.directionalShadow,Fe.spotLights.value=V.state.spot,Fe.spotLightShadows.value=V.state.spotShadow,Fe.rectAreaLights.value=V.state.rectArea,Fe.ltc_1.value=V.state.rectAreaLTC1,Fe.ltc_2.value=V.state.rectAreaLTC2,Fe.pointLights.value=V.state.point,Fe.pointLightShadows.value=V.state.pointShadow,Fe.hemisphereLights.value=V.state.hemi,Fe.directionalShadowMap.value=V.state.directionalShadowMap,Fe.directionalShadowMatrix.value=V.state.directionalShadowMatrix,Fe.spotShadowMap.value=V.state.spotShadowMap,Fe.spotLightMatrix.value=V.state.spotLightMatrix,Fe.spotLightMap.value=V.state.spotLightMap,Fe.pointShadowMap.value=V.state.pointShadowMap,Fe.pointShadowMatrix.value=V.state.pointShadowMatrix),q.currentProgram=qe,q.uniformsList=null,qe}function Fa(T){if(T.uniformsList===null){let k=T.currentProgram.getUniforms();T.uniformsList=ks.seqWithValue(k.seq,T.uniforms)}return T.uniformsList}function co(T,k){let j=Ee.get(T);j.outputColorSpace=k.outputColorSpace,j.batching=k.batching,j.batchingColor=k.batchingColor,j.instancing=k.instancing,j.instancingColor=k.instancingColor,j.instancingMorph=k.instancingMorph,j.skinning=k.skinning,j.morphTargets=k.morphTargets,j.morphNormals=k.morphNormals,j.morphColors=k.morphColors,j.morphTargetsCount=k.morphTargetsCount,j.numClippingPlanes=k.numClippingPlanes,j.numIntersection=k.numClipIntersection,j.vertexAlphas=k.vertexAlphas,j.vertexTangents=k.vertexTangents,j.toneMapping=k.toneMapping}function lx(T,k,j,q,V){k.isScene!==!0&&(k=Le),Ke.resetTextureUnits();let ce=k.fog,ge=q.isMeshStandardMaterial?k.environment:null,Ce=C===null?v.outputColorSpace:C.isXRRenderTarget===!0?C.texture.colorSpace:Pr,Se=(q.isMeshStandardMaterial?Pt:vt).get(q.envMap||ge),Ge=q.vertexColors===!0&&!!j.attributes.color&&j.attributes.color.itemSize===4,qe=!!j.attributes.tangent&&(!!q.normalMap||q.anisotropy>0),Fe=!!j.morphAttributes.position,st=!!j.morphAttributes.normal,xt=!!j.morphAttributes.color,Ut=zi;q.toneMapped&&(C===null||C.isXRRenderTarget===!0)&&(Ut=v.toneMapping);let Ct=j.morphAttributes.position||j.morphAttributes.normal||j.morphAttributes.color,Mt=Ct!==void 0?Ct.length:0,ze=Ee.get(q),Ot=p.state.lights;if(ke===!0&&($===!0||T!==w)){let ln=T===w&&q.id===E;he.setState(q,T,ln)}let lt=!1;q.version===ze.__version?(ze.needsLights&&ze.lightsStateVersion!==Ot.state.version||ze.outputColorSpace!==Ce||V.isBatchedMesh&&ze.batching===!1||!V.isBatchedMesh&&ze.batching===!0||V.isBatchedMesh&&ze.batchingColor===!0&&V.colorTexture===null||V.isBatchedMesh&&ze.batchingColor===!1&&V.colorTexture!==null||V.isInstancedMesh&&ze.instancing===!1||!V.isInstancedMesh&&ze.instancing===!0||V.isSkinnedMesh&&ze.skinning===!1||!V.isSkinnedMesh&&ze.skinning===!0||V.isInstancedMesh&&ze.instancingColor===!0&&V.instanceColor===null||V.isInstancedMesh&&ze.instancingColor===!1&&V.instanceColor!==null||V.isInstancedMesh&&ze.instancingMorph===!0&&V.morphTexture===null||V.isInstancedMesh&&ze.instancingMorph===!1&&V.morphTexture!==null||ze.envMap!==Se||q.fog===!0&&ze.fog!==ce||ze.numClippingPlanes!==void 0&&(ze.numClippingPlanes!==he.numPlanes||ze.numIntersection!==he.numIntersection)||ze.vertexAlphas!==Ge||ze.vertexTangents!==qe||ze.morphTargets!==Fe||ze.morphNormals!==st||ze.morphColors!==xt||ze.toneMapping!==Ut||ze.morphTargetsCount!==Mt)&&(lt=!0):(lt=!0,ze.__version=q.version);let wn=ze.currentProgram;lt===!0&&(wn=ui(q,k,V));let es=!1,En=!1,lo=!1,Nt=wn.getUniforms(),Fn=ze.uniforms;if(Te.useProgram(wn.program)&&(es=!0,En=!0,lo=!0),q.id!==E&&(E=q.id,En=!0),es||w!==T){Te.buffers.depth.getReversed()&&T.reversedDepth!==!0&&(T._reversedDepth=!0,T.updateProjectionMatrix()),Nt.setValue(O,"projectionMatrix",T.projectionMatrix),Nt.setValue(O,"viewMatrix",T.matrixWorldInverse);let mn=Nt.map.cameraPosition;mn!==void 0&&mn.setValue(O,be.setFromMatrixPosition(T.matrixWorld)),Be.logarithmicDepthBuffer&&Nt.setValue(O,"logDepthBufFC",2/(Math.log(T.far+1)/Math.LN2)),(q.isMeshPhongMaterial||q.isMeshToonMaterial||q.isMeshLambertMaterial||q.isMeshBasicMaterial||q.isMeshStandardMaterial||q.isShaderMaterial)&&Nt.setValue(O,"isOrthographic",T.isOrthographicCamera===!0),w!==T&&(w=T,En=!0,lo=!0)}if(V.isSkinnedMesh){Nt.setOptional(O,V,"bindMatrix"),Nt.setOptional(O,V,"bindMatrixInverse");let ln=V.skeleton;ln&&(ln.boneTexture===null&&ln.computeBoneTexture(),Nt.setValue(O,"boneTexture",ln.boneTexture,Ke))}V.isBatchedMesh&&(Nt.setOptional(O,V,"batchingTexture"),Nt.setValue(O,"batchingTexture",V._matricesTexture,Ke),Nt.setOptional(O,V,"batchingIdTexture"),Nt.setValue(O,"batchingIdTexture",V._indirectTexture,Ke),Nt.setOptional(O,V,"batchingColorTexture"),V._colorsTexture!==null&&Nt.setValue(O,"batchingColorTexture",V._colorsTexture,Ke));let Un=j.morphAttributes;if((Un.position!==void 0||Un.normal!==void 0||Un.color!==void 0)&&oe.update(V,j,wn),(En||ze.receiveShadow!==V.receiveShadow)&&(ze.receiveShadow=V.receiveShadow,Nt.setValue(O,"receiveShadow",V.receiveShadow)),q.isMeshGouraudMaterial&&q.envMap!==null&&(Fn.envMap.value=Se,Fn.flipEnvMap.value=Se.isCubeTexture&&Se.isRenderTargetTexture===!1?-1:1),q.isMeshStandardMaterial&&q.envMap===null&&k.environment!==null&&(Fn.envMapIntensity.value=k.environmentIntensity),En&&(Nt.setValue(O,"toneMappingExposure",v.toneMappingExposure),ze.needsLights&&hx(Fn,lo),ce&&q.fog===!0&&ie.refreshFogUniforms(Fn,ce),ie.refreshMaterialUniforms(Fn,q,G,J,p.state.transmissionRenderTarget[T.id]),ks.upload(O,Fa(ze),Fn,Ke)),q.isShaderMaterial&&q.uniformsNeedUpdate===!0&&(ks.upload(O,Fa(ze),Fn,Ke),q.uniformsNeedUpdate=!1),q.isSpriteMaterial&&Nt.setValue(O,"center",V.center),Nt.setValue(O,"modelViewMatrix",V.modelViewMatrix),Nt.setValue(O,"normalMatrix",V.normalMatrix),Nt.setValue(O,"modelMatrix",V.matrixWorld),q.isShaderMaterial||q.isRawShaderMaterial){let ln=q.uniformsGroups;for(let mn=0,au=ln.length;mn<au;mn++){let Mr=ln[mn];Ze.update(Mr,wn),Ze.bind(Mr,wn)}}return wn}function hx(T,k){T.ambientLightColor.needsUpdate=k,T.lightProbe.needsUpdate=k,T.directionalLights.needsUpdate=k,T.directionalLightShadows.needsUpdate=k,T.pointLights.needsUpdate=k,T.pointLightShadows.needsUpdate=k,T.spotLights.needsUpdate=k,T.spotLightShadows.needsUpdate=k,T.rectAreaLights.needsUpdate=k,T.hemisphereLights.needsUpdate=k}function ux(T){return T.isMeshLambertMaterial||T.isMeshToonMaterial||T.isMeshPhongMaterial||T.isMeshStandardMaterial||T.isShadowMaterial||T.isShaderMaterial&&T.lights===!0}this.getActiveCubeFace=function(){return b},this.getActiveMipmapLevel=function(){return A},this.getRenderTarget=function(){return C},this.setRenderTargetTextures=function(T,k,j){let q=Ee.get(T);q.__autoAllocateDepthBuffer=T.resolveDepthBuffer===!1,q.__autoAllocateDepthBuffer===!1&&(q.__useRenderToTexture=!1),Ee.get(T.texture).__webglTexture=k,Ee.get(T.depthTexture).__webglTexture=q.__autoAllocateDepthBuffer?void 0:j,q.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(T,k){let j=Ee.get(T);j.__webglFramebuffer=k,j.__useDefaultFramebuffer=k===void 0};let fx=O.createFramebuffer();this.setRenderTarget=function(T,k=0,j=0){C=T,b=k,A=j;let q=!0,V=null,ce=!1,ge=!1;if(T){let Se=Ee.get(T);if(Se.__useDefaultFramebuffer!==void 0)Te.bindFramebuffer(O.FRAMEBUFFER,null),q=!1;else if(Se.__webglFramebuffer===void 0)Ke.setupRenderTarget(T);else if(Se.__hasExternalTextures)Ke.rebindTextures(T,Ee.get(T.texture).__webglTexture,Ee.get(T.depthTexture).__webglTexture);else if(T.depthBuffer){let Fe=T.depthTexture;if(Se.__boundDepthTexture!==Fe){if(Fe!==null&&Ee.has(Fe)&&(T.width!==Fe.image.width||T.height!==Fe.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");Ke.setupDepthRenderbuffer(T)}}let Ge=T.texture;(Ge.isData3DTexture||Ge.isDataArrayTexture||Ge.isCompressedArrayTexture)&&(ge=!0);let qe=Ee.get(T).__webglFramebuffer;T.isWebGLCubeRenderTarget?(Array.isArray(qe[k])?V=qe[k][j]:V=qe[k],ce=!0):T.samples>0&&Ke.useMultisampledRTT(T)===!1?V=Ee.get(T).__webglMultisampledFramebuffer:Array.isArray(qe)?V=qe[j]:V=qe,I.copy(T.viewport),N.copy(T.scissor),B=T.scissorTest}else I.copy(X).multiplyScalar(G).floor(),N.copy(re).multiplyScalar(G).floor(),B=ye;if(j!==0&&(V=fx),Te.bindFramebuffer(O.FRAMEBUFFER,V)&&q&&Te.drawBuffers(T,V),Te.viewport(I),Te.scissor(N),Te.setScissorTest(B),ce){let Se=Ee.get(T.texture);O.framebufferTexture2D(O.FRAMEBUFFER,O.COLOR_ATTACHMENT0,O.TEXTURE_CUBE_MAP_POSITIVE_X+k,Se.__webglTexture,j)}else if(ge){let Se=k;for(let Ge=0;Ge<T.textures.length;Ge++){let qe=Ee.get(T.textures[Ge]);O.framebufferTextureLayer(O.FRAMEBUFFER,O.COLOR_ATTACHMENT0+Ge,qe.__webglTexture,j,Se)}}else if(T!==null&&j!==0){let Se=Ee.get(T.texture);O.framebufferTexture2D(O.FRAMEBUFFER,O.COLOR_ATTACHMENT0,O.TEXTURE_2D,Se.__webglTexture,j)}E=-1},this.readRenderTargetPixels=function(T,k,j,q,V,ce,ge,Ce=0){if(!(T&&T.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Se=Ee.get(T).__webglFramebuffer;if(T.isWebGLCubeRenderTarget&&ge!==void 0&&(Se=Se[ge]),Se){Te.bindFramebuffer(O.FRAMEBUFFER,Se);try{let Ge=T.textures[Ce],qe=Ge.format,Fe=Ge.type;if(!Be.textureFormatReadable(qe)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!Be.textureTypeReadable(Fe)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}k>=0&&k<=T.width-q&&j>=0&&j<=T.height-V&&(T.textures.length>1&&O.readBuffer(O.COLOR_ATTACHMENT0+Ce),O.readPixels(k,j,q,V,Ie.convert(qe),Ie.convert(Fe),ce))}finally{let Ge=C!==null?Ee.get(C).__webglFramebuffer:null;Te.bindFramebuffer(O.FRAMEBUFFER,Ge)}}},this.readRenderTargetPixelsAsync=async function(T,k,j,q,V,ce,ge,Ce=0){if(!(T&&T.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Se=Ee.get(T).__webglFramebuffer;if(T.isWebGLCubeRenderTarget&&ge!==void 0&&(Se=Se[ge]),Se)if(k>=0&&k<=T.width-q&&j>=0&&j<=T.height-V){Te.bindFramebuffer(O.FRAMEBUFFER,Se);let Ge=T.textures[Ce],qe=Ge.format,Fe=Ge.type;if(!Be.textureFormatReadable(qe))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!Be.textureTypeReadable(Fe))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");let st=O.createBuffer();O.bindBuffer(O.PIXEL_PACK_BUFFER,st),O.bufferData(O.PIXEL_PACK_BUFFER,ce.byteLength,O.STREAM_READ),T.textures.length>1&&O.readBuffer(O.COLOR_ATTACHMENT0+Ce),O.readPixels(k,j,q,V,Ie.convert(qe),Ie.convert(Fe),0);let xt=C!==null?Ee.get(C).__webglFramebuffer:null;Te.bindFramebuffer(O.FRAMEBUFFER,xt);let Ut=O.fenceSync(O.SYNC_GPU_COMMANDS_COMPLETE,0);return O.flush(),await km(O,Ut,4),O.bindBuffer(O.PIXEL_PACK_BUFFER,st),O.getBufferSubData(O.PIXEL_PACK_BUFFER,0,ce),O.deleteBuffer(st),O.deleteSync(Ut),ce}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(T,k=null,j=0){let q=Math.pow(2,-j),V=Math.floor(T.image.width*q),ce=Math.floor(T.image.height*q),ge=k!==null?k.x:0,Ce=k!==null?k.y:0;Ke.setTexture2D(T,0),O.copyTexSubImage2D(O.TEXTURE_2D,j,0,0,ge,Ce,V,ce),Te.unbindTexture()};let dx=O.createFramebuffer(),px=O.createFramebuffer();this.copyTextureToTexture=function(T,k,j=null,q=null,V=0,ce=null){ce===null&&(V!==0?(Ms("WebGLRenderer: copyTextureToTexture function signature has changed to support src and dst mipmap levels."),ce=V,V=0):ce=0);let ge,Ce,Se,Ge,qe,Fe,st,xt,Ut,Ct=T.isCompressedTexture?T.mipmaps[ce]:T.image;if(j!==null)ge=j.max.x-j.min.x,Ce=j.max.y-j.min.y,Se=j.isBox3?j.max.z-j.min.z:1,Ge=j.min.x,qe=j.min.y,Fe=j.isBox3?j.min.z:0;else{let Un=Math.pow(2,-V);ge=Math.floor(Ct.width*Un),Ce=Math.floor(Ct.height*Un),T.isDataArrayTexture?Se=Ct.depth:T.isData3DTexture?Se=Math.floor(Ct.depth*Un):Se=1,Ge=0,qe=0,Fe=0}q!==null?(st=q.x,xt=q.y,Ut=q.z):(st=0,xt=0,Ut=0);let Mt=Ie.convert(k.format),ze=Ie.convert(k.type),Ot;k.isData3DTexture?(Ke.setTexture3D(k,0),Ot=O.TEXTURE_3D):k.isDataArrayTexture||k.isCompressedArrayTexture?(Ke.setTexture2DArray(k,0),Ot=O.TEXTURE_2D_ARRAY):(Ke.setTexture2D(k,0),Ot=O.TEXTURE_2D),O.pixelStorei(O.UNPACK_FLIP_Y_WEBGL,k.flipY),O.pixelStorei(O.UNPACK_PREMULTIPLY_ALPHA_WEBGL,k.premultiplyAlpha),O.pixelStorei(O.UNPACK_ALIGNMENT,k.unpackAlignment);let lt=O.getParameter(O.UNPACK_ROW_LENGTH),wn=O.getParameter(O.UNPACK_IMAGE_HEIGHT),es=O.getParameter(O.UNPACK_SKIP_PIXELS),En=O.getParameter(O.UNPACK_SKIP_ROWS),lo=O.getParameter(O.UNPACK_SKIP_IMAGES);O.pixelStorei(O.UNPACK_ROW_LENGTH,Ct.width),O.pixelStorei(O.UNPACK_IMAGE_HEIGHT,Ct.height),O.pixelStorei(O.UNPACK_SKIP_PIXELS,Ge),O.pixelStorei(O.UNPACK_SKIP_ROWS,qe),O.pixelStorei(O.UNPACK_SKIP_IMAGES,Fe);let Nt=T.isDataArrayTexture||T.isData3DTexture,Fn=k.isDataArrayTexture||k.isData3DTexture;if(T.isDepthTexture){let Un=Ee.get(T),ln=Ee.get(k),mn=Ee.get(Un.__renderTarget),au=Ee.get(ln.__renderTarget);Te.bindFramebuffer(O.READ_FRAMEBUFFER,mn.__webglFramebuffer),Te.bindFramebuffer(O.DRAW_FRAMEBUFFER,au.__webglFramebuffer);for(let Mr=0;Mr<Se;Mr++)Nt&&(O.framebufferTextureLayer(O.READ_FRAMEBUFFER,O.COLOR_ATTACHMENT0,Ee.get(T).__webglTexture,V,Fe+Mr),O.framebufferTextureLayer(O.DRAW_FRAMEBUFFER,O.COLOR_ATTACHMENT0,Ee.get(k).__webglTexture,ce,Ut+Mr)),O.blitFramebuffer(Ge,qe,ge,Ce,st,xt,ge,Ce,O.DEPTH_BUFFER_BIT,O.NEAREST);Te.bindFramebuffer(O.READ_FRAMEBUFFER,null),Te.bindFramebuffer(O.DRAW_FRAMEBUFFER,null)}else if(V!==0||T.isRenderTargetTexture||Ee.has(T)){let Un=Ee.get(T),ln=Ee.get(k);Te.bindFramebuffer(O.READ_FRAMEBUFFER,dx),Te.bindFramebuffer(O.DRAW_FRAMEBUFFER,px);for(let mn=0;mn<Se;mn++)Nt?O.framebufferTextureLayer(O.READ_FRAMEBUFFER,O.COLOR_ATTACHMENT0,Un.__webglTexture,V,Fe+mn):O.framebufferTexture2D(O.READ_FRAMEBUFFER,O.COLOR_ATTACHMENT0,O.TEXTURE_2D,Un.__webglTexture,V),Fn?O.framebufferTextureLayer(O.DRAW_FRAMEBUFFER,O.COLOR_ATTACHMENT0,ln.__webglTexture,ce,Ut+mn):O.framebufferTexture2D(O.DRAW_FRAMEBUFFER,O.COLOR_ATTACHMENT0,O.TEXTURE_2D,ln.__webglTexture,ce),V!==0?O.blitFramebuffer(Ge,qe,ge,Ce,st,xt,ge,Ce,O.COLOR_BUFFER_BIT,O.NEAREST):Fn?O.copyTexSubImage3D(Ot,ce,st,xt,Ut+mn,Ge,qe,ge,Ce):O.copyTexSubImage2D(Ot,ce,st,xt,Ge,qe,ge,Ce);Te.bindFramebuffer(O.READ_FRAMEBUFFER,null),Te.bindFramebuffer(O.DRAW_FRAMEBUFFER,null)}else Fn?T.isDataTexture||T.isData3DTexture?O.texSubImage3D(Ot,ce,st,xt,Ut,ge,Ce,Se,Mt,ze,Ct.data):k.isCompressedArrayTexture?O.compressedTexSubImage3D(Ot,ce,st,xt,Ut,ge,Ce,Se,Mt,Ct.data):O.texSubImage3D(Ot,ce,st,xt,Ut,ge,Ce,Se,Mt,ze,Ct):T.isDataTexture?O.texSubImage2D(O.TEXTURE_2D,ce,st,xt,ge,Ce,Mt,ze,Ct.data):T.isCompressedTexture?O.compressedTexSubImage2D(O.TEXTURE_2D,ce,st,xt,Ct.width,Ct.height,Mt,Ct.data):O.texSubImage2D(O.TEXTURE_2D,ce,st,xt,ge,Ce,Mt,ze,Ct);O.pixelStorei(O.UNPACK_ROW_LENGTH,lt),O.pixelStorei(O.UNPACK_IMAGE_HEIGHT,wn),O.pixelStorei(O.UNPACK_SKIP_PIXELS,es),O.pixelStorei(O.UNPACK_SKIP_ROWS,En),O.pixelStorei(O.UNPACK_SKIP_IMAGES,lo),ce===0&&k.generateMipmaps&&O.generateMipmap(Ot),Te.unbindTexture()},this.initRenderTarget=function(T){Ee.get(T).__webglFramebuffer===void 0&&Ke.setupRenderTarget(T)},this.initTexture=function(T){T.isCubeTexture?Ke.setTextureCube(T,0):T.isData3DTexture?Ke.setTexture3D(T,0):T.isDataArrayTexture||T.isCompressedArrayTexture?Ke.setTexture2DArray(T,0):Ke.setTexture2D(T,0),Te.unbindTexture()},this.resetState=function(){b=0,A=0,C=null,Te.reset(),de.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return ei}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;let n=this.getContext();n.drawingBufferColorSpace=ot._getDrawingBufferColorSpace(e),n.unpackColorSpace=ot._getUnpackColorSpace()}};var Vs=new _n,Vi=new ne,_g=new R,Pf=new ne,Kl=new ne,Jl=new R,If=new R,vg=new Xe,yg=new R,xg=new R,an=null,xi=null,Hi=[],or={NONE:-1,PAN:0,ROTATE:1},Ql=class extends Pn{constructor(e,n,i=null){super(n,i),this.objects=e,this.recursive=!0,this.transformGroup=!1,this.rotateSpeed=1,this.raycaster=new Ui,this.mouseButtons={LEFT:zt.PAN,MIDDLE:zt.PAN,RIGHT:zt.ROTATE},this.touches={ONE:Gn.PAN},this._onPointerMove=Jw.bind(this),this._onPointerDown=Qw.bind(this),this._onPointerCancel=eE.bind(this),this._onContextMenu=tE.bind(this),i!==null&&this.connect(i)}connect(e){super.connect(e),this.domElement.addEventListener("pointermove",this._onPointerMove),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointerup",this._onPointerCancel),this.domElement.addEventListener("pointerleave",this._onPointerCancel),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.style.touchAction="none"}disconnect(){this.domElement.removeEventListener("pointermove",this._onPointerMove),this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.removeEventListener("pointerup",this._onPointerCancel),this.domElement.removeEventListener("pointerleave",this._onPointerCancel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.domElement.style.touchAction="auto",this.domElement.style.cursor=""}dispose(){this.disconnect()}_updatePointer(e){let n=this.domElement.getBoundingClientRect();Vi.x=(e.clientX-n.left)/n.width*2-1,Vi.y=-(e.clientY-n.top)/n.height*2+1}_updateState(e){let n;if(e.pointerType==="touch")n=this.touches.ONE;else switch(e.button){case 0:n=this.mouseButtons.LEFT;break;case 1:n=this.mouseButtons.MIDDLE;break;case 2:n=this.mouseButtons.RIGHT;break;default:n=null}switch(n){case zt.PAN:case Gn.PAN:this.state=or.PAN;break;case zt.ROTATE:case Gn.ROTATE:this.state=or.ROTATE;break;default:this.state=or.NONE}}};function Jw(t){let e=this.object,n=this.domElement,i=this.raycaster;if(this.enabled!==!1){if(this._updatePointer(t),i.setFromCamera(Vi,e),an)this.state===or.PAN?i.ray.intersectPlane(Vs,Jl)&&(an.position.copy(Jl.sub(_g).applyMatrix4(vg)),this.dispatchEvent({type:"drag",object:an})):this.state===or.ROTATE&&(Pf.subVectors(Vi,Kl).multiplyScalar(this.rotateSpeed),an.rotateOnWorldAxis(yg,Pf.x),an.rotateOnWorldAxis(xg.normalize(),-Pf.y),this.dispatchEvent({type:"drag",object:an})),Kl.copy(Vi);else if(t.pointerType==="mouse"||t.pointerType==="pen")if(Hi.length=0,i.setFromCamera(Vi,e),i.intersectObjects(this.objects,this.recursive,Hi),Hi.length>0){let r=Hi[0].object;Vs.setFromNormalAndCoplanarPoint(e.getWorldDirection(Vs.normal),If.setFromMatrixPosition(r.matrixWorld)),xi!==r&&xi!==null&&(this.dispatchEvent({type:"hoveroff",object:xi}),n.style.cursor="auto",xi=null),xi!==r&&(this.dispatchEvent({type:"hoveron",object:r}),n.style.cursor="pointer",xi=r)}else xi!==null&&(this.dispatchEvent({type:"hoveroff",object:xi}),n.style.cursor="auto",xi=null);Kl.copy(Vi)}}function Qw(t){let e=this.object,n=this.domElement,i=this.raycaster;this.enabled!==!1&&(this._updatePointer(t),this._updateState(t),Hi.length=0,i.setFromCamera(Vi,e),i.intersectObjects(this.objects,this.recursive,Hi),Hi.length>0&&(this.transformGroup===!0?an=bg(Hi[0].object):an=Hi[0].object,Vs.setFromNormalAndCoplanarPoint(e.getWorldDirection(Vs.normal),If.setFromMatrixPosition(an.matrixWorld)),i.ray.intersectPlane(Vs,Jl)&&(this.state===or.PAN?(vg.copy(an.parent.matrixWorld).invert(),_g.copy(Jl).sub(If.setFromMatrixPosition(an.matrixWorld)),n.style.cursor="move",this.dispatchEvent({type:"dragstart",object:an})):this.state===or.ROTATE&&(yg.set(0,1,0).applyQuaternion(e.quaternion).normalize(),xg.set(1,0,0).applyQuaternion(e.quaternion).normalize(),n.style.cursor="move",this.dispatchEvent({type:"dragstart",object:an})))),Kl.copy(Vi))}function eE(){this.enabled!==!1&&(an&&(this.dispatchEvent({type:"dragend",object:an}),an=null),this.domElement.style.cursor=xi?"pointer":"auto",this.state=or.NONE)}function tE(t){this.enabled!==!1&&t.preventDefault()}function bg(t,e=null){return t.isGroup&&(e=t),t.parent===null?e:bg(t.parent,e)}function Df(t,e,n){var i,r=1;t==null&&(t=0),e==null&&(e=0),n==null&&(n=0);function s(){var o,a=i.length,l,c=0,h=0,u=0;for(o=0;o<a;++o)l=i[o],c+=l.x||0,h+=l.y||0,u+=l.z||0;for(c=(c/a-t)*r,h=(h/a-e)*r,u=(u/a-n)*r,o=0;o<a;++o)l=i[o],c&&(l.x-=c),h&&(l.y-=h),u&&(l.z-=u)}return s.initialize=function(o){i=o},s.x=function(o){return arguments.length?(t=+o,s):t},s.y=function(o){return arguments.length?(e=+o,s):e},s.z=function(o){return arguments.length?(n=+o,s):n},s.strength=function(o){return arguments.length?(r=+o,s):r},s}function Mg(t){let e=+this._x.call(null,t);return Sg(this.cover(e),e,t)}function Sg(t,e,n){if(isNaN(e))return t;var i,r=t._root,s={data:n},o=t._x0,a=t._x1,l,c,h,u,d;if(!r)return t._root=s,t;for(;r.length;)if((h=e>=(l=(o+a)/2))?o=l:a=l,i=r,!(r=r[u=+h]))return i[u]=s,t;if(c=+t._x.call(null,r.data),e===c)return s.next=r,i?i[u]=s:t._root=s,t;do i=i?i[u]=new Array(2):t._root=new Array(2),(h=e>=(l=(o+a)/2))?o=l:a=l;while((u=+h)==(d=+(c>=l)));return i[d]=r,i[u]=s,t}function wg(t){Array.isArray(t)||(t=Array.from(t));let e=t.length,n=new Float64Array(e),i=1/0,r=-1/0;for(let s=0,o;s<e;++s)isNaN(o=+this._x.call(null,t[s]))||(n[s]=o,o<i&&(i=o),o>r&&(r=o));if(i>r)return this;this.cover(i).cover(r);for(let s=0;s<e;++s)Sg(this,n[s],t[s]);return this}function Eg(t){if(isNaN(t=+t))return this;var e=this._x0,n=this._x1;if(isNaN(e))n=(e=Math.floor(t))+1;else{for(var i=n-e||1,r=this._root,s,o;e>t||t>=n;)switch(o=+(t<e),s=new Array(2),s[o]=r,r=s,i*=2,o){case 0:n=e+i;break;case 1:e=n-i;break}this._root&&this._root.length&&(this._root=r)}return this._x0=e,this._x1=n,this}function Tg(){var t=[];return this.visit(function(e){if(!e.length)do t.push(e.data);while(e=e.next)}),t}function Ag(t){return arguments.length?this.cover(+t[0][0]).cover(+t[1][0]):isNaN(this._x0)?void 0:[[this._x0],[this._x1]]}function qn(t,e,n){this.node=t,this.x0=e,this.x1=n}function Cg(t,e){var n,i=this._x0,r,s,o=this._x1,a=[],l=this._root,c,h;for(l&&a.push(new qn(l,i,o)),e==null?e=1/0:(i=t-e,o=t+e);c=a.pop();)if(!(!(l=c.node)||(r=c.x0)>o||(s=c.x1)<i))if(l.length){var u=(r+s)/2;a.push(new qn(l[1],u,s),new qn(l[0],r,u)),(h=+(t>=u))&&(c=a[a.length-1],a[a.length-1]=a[a.length-1-h],a[a.length-1-h]=c)}else{var d=Math.abs(t-+this._x.call(null,l.data));d<e&&(e=d,i=t-d,o=t+d,n=l.data)}return n}function Rg(t){if(isNaN(l=+this._x.call(null,t)))return this;var e,n=this._root,i,r,s,o=this._x0,a=this._x1,l,c,h,u,d;if(!n)return this;if(n.length)for(;;){if((h=l>=(c=(o+a)/2))?o=c:a=c,e=n,!(n=n[u=+h]))return this;if(!n.length)break;e[u+1&1]&&(i=e,d=u)}for(;n.data!==t;)if(r=n,!(n=n.next))return this;return(s=n.next)&&delete n.next,r?(s?r.next=s:delete r.next,this):e?(s?e[u]=s:delete e[u],(n=e[0]||e[1])&&n===(e[1]||e[0])&&!n.length&&(i?i[d]=n:this._root=n),this):(this._root=s,this)}function Pg(t){for(var e=0,n=t.length;e<n;++e)this.remove(t[e]);return this}function Ig(){return this._root}function Dg(){var t=0;return this.visit(function(e){if(!e.length)do++t;while(e=e.next)}),t}function Lg(t){var e=[],n,i=this._root,r,s,o;for(i&&e.push(new qn(i,this._x0,this._x1));n=e.pop();)if(!t(i=n.node,s=n.x0,o=n.x1)&&i.length){var a=(s+o)/2;(r=i[1])&&e.push(new qn(r,a,o)),(r=i[0])&&e.push(new qn(r,s,a))}return this}function Og(t){var e=[],n=[],i;for(this._root&&e.push(new qn(this._root,this._x0,this._x1));i=e.pop();){var r=i.node;if(r.length){var s,o=i.x0,a=i.x1,l=(o+a)/2;(s=r[0])&&e.push(new qn(s,o,l)),(s=r[1])&&e.push(new qn(s,l,a))}n.push(i)}for(;i=n.pop();)t(i.node,i.x0,i.x1);return this}function Ng(t){return t[0]}function Fg(t){return arguments.length?(this._x=t,this):this._x}function oa(t,e){var n=new Lf(e??Ng,NaN,NaN);return t==null?n:n.addAll(t)}function Lf(t,e,n){this._x=t,this._x0=e,this._x1=n,this._root=void 0}function Ug(t){for(var e={data:t.data},n=e;t=t.next;)n=n.next={data:t.data};return e}var yn=oa.prototype=Lf.prototype;yn.copy=function(){var t=new Lf(this._x,this._x0,this._x1),e=this._root,n,i;if(!e)return t;if(!e.length)return t._root=Ug(e),t;for(n=[{source:e,target:t._root=new Array(2)}];e=n.pop();)for(var r=0;r<2;++r)(i=e.source[r])&&(i.length?n.push({source:i,target:e.target[r]=new Array(2)}):e.target[r]=Ug(i));return t};yn.add=Mg;yn.addAll=wg;yn.cover=Eg;yn.data=Tg;yn.extent=Ag;yn.find=Cg;yn.remove=Rg;yn.removeAll=Pg;yn.root=Ig;yn.size=Dg;yn.visit=Lg;yn.visitAfter=Og;yn.x=Fg;function nE(t){let e=+this._x.call(null,t),n=+this._y.call(null,t);return kg(this.cover(e,n),e,n,t)}function kg(t,e,n,i){if(isNaN(e)||isNaN(n))return t;var r,s=t._root,o={data:i},a=t._x0,l=t._y0,c=t._x1,h=t._y1,u,d,f,m,_,g,p,x;if(!s)return t._root=o,t;for(;s.length;)if((_=e>=(u=(a+c)/2))?a=u:c=u,(g=n>=(d=(l+h)/2))?l=d:h=d,r=s,!(s=s[p=g<<1|_]))return r[p]=o,t;if(f=+t._x.call(null,s.data),m=+t._y.call(null,s.data),e===f&&n===m)return o.next=s,r?r[p]=o:t._root=o,t;do r=r?r[p]=new Array(4):t._root=new Array(4),(_=e>=(u=(a+c)/2))?a=u:c=u,(g=n>=(d=(l+h)/2))?l=d:h=d;while((p=g<<1|_)===(x=(m>=d)<<1|f>=u));return r[x]=s,r[p]=o,t}function iE(t){Array.isArray(t)||(t=Array.from(t));let e=t.length,n=new Float64Array(e),i=new Float64Array(e),r=1/0,s=r,o=-r,a=o;for(let l=0,c,h,u;l<e;++l){if(isNaN(h=+this._x.call(null,c=t[l]))||isNaN(u=+this._y.call(null,c))){n[l]=NaN;continue}n[l]=h,i[l]=u,h<r&&(r=h),h>o&&(o=h),u<s&&(s=u),u>a&&(a=u)}if(r>o||s>a)return this;this.cover(r,s).cover(o,a);for(let l=0;l<e;++l)kg(this,n[l],i[l],t[l]);return this}function rE(t,e){if(isNaN(t=+t)||isNaN(e=+e))return this;var n=this._x0,i=this._y0,r=this._x1,s=this._y1;if(isNaN(n))r=(n=Math.floor(t))+1,s=(i=Math.floor(e))+1;else{for(var o=r-n||1,a=this._root,l,c;n>t||t>=r||i>e||e>=s;)switch(c=(e<i)<<1|t<n,l=new Array(4),l[c]=a,a=l,o*=2,c){case 0:r=n+o,s=i+o;break;case 1:n=r-o,s=i+o;break;case 2:r=n+o,i=s-o;break;case 3:n=r-o,i=s-o;break}this._root&&this._root.length&&(this._root=a)}return this._x0=n,this._y0=i,this._x1=r,this._y1=s,this}function sE(){var t=[];return this.visit(function(e){if(!e.length)do t.push(e.data);while(e=e.next)}),t}function oE(t){return arguments.length?this.cover(+t[0][0],+t[0][1]).cover(+t[1][0],+t[1][1]):isNaN(this._x0)?void 0:[[this._x0,this._y0],[this._x1,this._y1]]}function fn(t,e,n,i,r){this.node=t,this.x0=e,this.y0=n,this.x1=i,this.y1=r}function aE(t,e,n){var i,r=this._x0,s=this._y0,o,a,l,c,h=this._x1,u=this._y1,d=[],f=this._root,m,_;for(f&&d.push(new fn(f,r,s,h,u)),n==null?n=1/0:(r=t-n,s=e-n,h=t+n,u=e+n,n*=n);m=d.pop();)if(!(!(f=m.node)||(o=m.x0)>h||(a=m.y0)>u||(l=m.x1)<r||(c=m.y1)<s))if(f.length){var g=(o+l)/2,p=(a+c)/2;d.push(new fn(f[3],g,p,l,c),new fn(f[2],o,p,g,c),new fn(f[1],g,a,l,p),new fn(f[0],o,a,g,p)),(_=(e>=p)<<1|t>=g)&&(m=d[d.length-1],d[d.length-1]=d[d.length-1-_],d[d.length-1-_]=m)}else{var x=t-+this._x.call(null,f.data),y=e-+this._y.call(null,f.data),v=x*x+y*y;if(v<n){var M=Math.sqrt(n=v);r=t-M,s=e-M,h=t+M,u=e+M,i=f.data}}return i}function cE(t){if(isNaN(h=+this._x.call(null,t))||isNaN(u=+this._y.call(null,t)))return this;var e,n=this._root,i,r,s,o=this._x0,a=this._y0,l=this._x1,c=this._y1,h,u,d,f,m,_,g,p;if(!n)return this;if(n.length)for(;;){if((m=h>=(d=(o+l)/2))?o=d:l=d,(_=u>=(f=(a+c)/2))?a=f:c=f,e=n,!(n=n[g=_<<1|m]))return this;if(!n.length)break;(e[g+1&3]||e[g+2&3]||e[g+3&3])&&(i=e,p=g)}for(;n.data!==t;)if(r=n,!(n=n.next))return this;return(s=n.next)&&delete n.next,r?(s?r.next=s:delete r.next,this):e?(s?e[g]=s:delete e[g],(n=e[0]||e[1]||e[2]||e[3])&&n===(e[3]||e[2]||e[1]||e[0])&&!n.length&&(i?i[p]=n:this._root=n),this):(this._root=s,this)}function lE(t){for(var e=0,n=t.length;e<n;++e)this.remove(t[e]);return this}function hE(){return this._root}function uE(){var t=0;return this.visit(function(e){if(!e.length)do++t;while(e=e.next)}),t}function fE(t){var e=[],n,i=this._root,r,s,o,a,l;for(i&&e.push(new fn(i,this._x0,this._y0,this._x1,this._y1));n=e.pop();)if(!t(i=n.node,s=n.x0,o=n.y0,a=n.x1,l=n.y1)&&i.length){var c=(s+a)/2,h=(o+l)/2;(r=i[3])&&e.push(new fn(r,c,h,a,l)),(r=i[2])&&e.push(new fn(r,s,h,c,l)),(r=i[1])&&e.push(new fn(r,c,o,a,h)),(r=i[0])&&e.push(new fn(r,s,o,c,h))}return this}function dE(t){var e=[],n=[],i;for(this._root&&e.push(new fn(this._root,this._x0,this._y0,this._x1,this._y1));i=e.pop();){var r=i.node;if(r.length){var s,o=i.x0,a=i.y0,l=i.x1,c=i.y1,h=(o+l)/2,u=(a+c)/2;(s=r[0])&&e.push(new fn(s,o,a,h,u)),(s=r[1])&&e.push(new fn(s,h,a,l,u)),(s=r[2])&&e.push(new fn(s,o,u,h,c)),(s=r[3])&&e.push(new fn(s,h,u,l,c))}n.push(i)}for(;i=n.pop();)t(i.node,i.x0,i.y0,i.x1,i.y1);return this}function pE(t){return t[0]}function mE(t){return arguments.length?(this._x=t,this):this._x}function gE(t){return t[1]}function _E(t){return arguments.length?(this._y=t,this):this._y}function Of(t,e,n){var i=new Nf(e??pE,n??gE,NaN,NaN,NaN,NaN);return t==null?i:i.addAll(t)}function Nf(t,e,n,i,r,s){this._x=t,this._y=e,this._x0=n,this._y0=i,this._x1=r,this._y1=s,this._root=void 0}function zg(t){for(var e={data:t.data},n=e;t=t.next;)n=n.next={data:t.data};return e}var dn=Of.prototype=Nf.prototype;dn.copy=function(){var t=new Nf(this._x,this._y,this._x0,this._y0,this._x1,this._y1),e=this._root,n,i;if(!e)return t;if(!e.length)return t._root=zg(e),t;for(n=[{source:e,target:t._root=new Array(4)}];e=n.pop();)for(var r=0;r<4;++r)(i=e.source[r])&&(i.length?n.push({source:i,target:e.target[r]=new Array(4)}):e.target[r]=zg(i));return t};dn.add=nE;dn.addAll=iE;dn.cover=rE;dn.data=sE;dn.extent=oE;dn.find=aE;dn.remove=cE;dn.removeAll=lE;dn.root=hE;dn.size=uE;dn.visit=fE;dn.visitAfter=dE;dn.x=mE;dn.y=_E;function Bg(t){let e=+this._x.call(null,t),n=+this._y.call(null,t),i=+this._z.call(null,t);return Vg(this.cover(e,n,i),e,n,i,t)}function Vg(t,e,n,i,r){if(isNaN(e)||isNaN(n)||isNaN(i))return t;var s,o=t._root,a={data:r},l=t._x0,c=t._y0,h=t._z0,u=t._x1,d=t._y1,f=t._z1,m,_,g,p,x,y,v,M,b,A,C;if(!o)return t._root=a,t;for(;o.length;)if((v=e>=(m=(l+u)/2))?l=m:u=m,(M=n>=(_=(c+d)/2))?c=_:d=_,(b=i>=(g=(h+f)/2))?h=g:f=g,s=o,!(o=o[A=b<<2|M<<1|v]))return s[A]=a,t;if(p=+t._x.call(null,o.data),x=+t._y.call(null,o.data),y=+t._z.call(null,o.data),e===p&&n===x&&i===y)return a.next=o,s?s[A]=a:t._root=a,t;do s=s?s[A]=new Array(8):t._root=new Array(8),(v=e>=(m=(l+u)/2))?l=m:u=m,(M=n>=(_=(c+d)/2))?c=_:d=_,(b=i>=(g=(h+f)/2))?h=g:f=g;while((A=b<<2|M<<1|v)===(C=(y>=g)<<2|(x>=_)<<1|p>=m));return s[C]=o,s[A]=a,t}function Hg(t){Array.isArray(t)||(t=Array.from(t));let e=t.length,n=new Float64Array(e),i=new Float64Array(e),r=new Float64Array(e),s=1/0,o=1/0,a=1/0,l=-1/0,c=-1/0,h=-1/0;for(let u=0,d,f,m,_;u<e;++u)isNaN(f=+this._x.call(null,d=t[u]))||isNaN(m=+this._y.call(null,d))||isNaN(_=+this._z.call(null,d))||(n[u]=f,i[u]=m,r[u]=_,f<s&&(s=f),f>l&&(l=f),m<o&&(o=m),m>c&&(c=m),_<a&&(a=_),_>h&&(h=_));if(s>l||o>c||a>h)return this;this.cover(s,o,a).cover(l,c,h);for(let u=0;u<e;++u)Vg(this,n[u],i[u],r[u],t[u]);return this}function Gg(t,e,n){if(isNaN(t=+t)||isNaN(e=+e)||isNaN(n=+n))return this;var i=this._x0,r=this._y0,s=this._z0,o=this._x1,a=this._y1,l=this._z1;if(isNaN(i))o=(i=Math.floor(t))+1,a=(r=Math.floor(e))+1,l=(s=Math.floor(n))+1;else{for(var c=o-i||1,h=this._root,u,d;i>t||t>=o||r>e||e>=a||s>n||n>=l;)switch(d=(n<s)<<2|(e<r)<<1|t<i,u=new Array(8),u[d]=h,h=u,c*=2,d){case 0:o=i+c,a=r+c,l=s+c;break;case 1:i=o-c,a=r+c,l=s+c;break;case 2:o=i+c,r=a-c,l=s+c;break;case 3:i=o-c,r=a-c,l=s+c;break;case 4:o=i+c,a=r+c,s=l-c;break;case 5:i=o-c,a=r+c,s=l-c;break;case 6:o=i+c,r=a-c,s=l-c;break;case 7:i=o-c,r=a-c,s=l-c;break}this._root&&this._root.length&&(this._root=h)}return this._x0=i,this._y0=r,this._z0=s,this._x1=o,this._y1=a,this._z1=l,this}function Wg(){var t=[];return this.visit(function(e){if(!e.length)do t.push(e.data);while(e=e.next)}),t}function jg(t){return arguments.length?this.cover(+t[0][0],+t[0][1],+t[0][2]).cover(+t[1][0],+t[1][1],+t[1][2]):isNaN(this._x0)?void 0:[[this._x0,this._y0,this._z0],[this._x1,this._y1,this._z1]]}function dt(t,e,n,i,r,s,o){this.node=t,this.x0=e,this.y0=n,this.z0=i,this.x1=r,this.y1=s,this.z1=o}function qg(t,e,n,i){var r,s=this._x0,o=this._y0,a=this._z0,l,c,h,u,d,f,m=this._x1,_=this._y1,g=this._z1,p=[],x=this._root,y,v;for(x&&p.push(new dt(x,s,o,a,m,_,g)),i==null?i=1/0:(s=t-i,o=e-i,a=n-i,m=t+i,_=e+i,g=n+i,i*=i);y=p.pop();)if(!(!(x=y.node)||(l=y.x0)>m||(c=y.y0)>_||(h=y.z0)>g||(u=y.x1)<s||(d=y.y1)<o||(f=y.z1)<a))if(x.length){var M=(l+u)/2,b=(c+d)/2,A=(h+f)/2;p.push(new dt(x[7],M,b,A,u,d,f),new dt(x[6],l,b,A,M,d,f),new dt(x[5],M,c,A,u,b,f),new dt(x[4],l,c,A,M,b,f),new dt(x[3],M,b,h,u,d,A),new dt(x[2],l,b,h,M,d,A),new dt(x[1],M,c,h,u,b,A),new dt(x[0],l,c,h,M,b,A)),(v=(n>=A)<<2|(e>=b)<<1|t>=M)&&(y=p[p.length-1],p[p.length-1]=p[p.length-1-v],p[p.length-1-v]=y)}else{var C=t-+this._x.call(null,x.data),E=e-+this._y.call(null,x.data),w=n-+this._z.call(null,x.data),I=C*C+E*E+w*w;if(I<i){var N=Math.sqrt(i=I);s=t-N,o=e-N,a=n-N,m=t+N,_=e+N,g=n+N,r=x.data}}return r}var vE=(t,e,n,i,r,s)=>Math.sqrt((t-i)**2+(e-r)**2+(n-s)**2);function Xg(t,e,n,i){let r=[],s=t-i,o=e-i,a=n-i,l=t+i,c=e+i,h=n+i;return this.visit((u,d,f,m,_,g,p)=>{if(!u.length)do{let x=u.data;vE(t,e,n,this._x(x),this._y(x),this._z(x))<=i&&r.push(x)}while(u=u.next);return d>l||f>c||m>h||_<s||g<o||p<a}),r}function $g(t){if(isNaN(d=+this._x.call(null,t))||isNaN(f=+this._y.call(null,t))||isNaN(m=+this._z.call(null,t)))return this;var e,n=this._root,i,r,s,o=this._x0,a=this._y0,l=this._z0,c=this._x1,h=this._y1,u=this._z1,d,f,m,_,g,p,x,y,v,M,b;if(!n)return this;if(n.length)for(;;){if((x=d>=(_=(o+c)/2))?o=_:c=_,(y=f>=(g=(a+h)/2))?a=g:h=g,(v=m>=(p=(l+u)/2))?l=p:u=p,e=n,!(n=n[M=v<<2|y<<1|x]))return this;if(!n.length)break;(e[M+1&7]||e[M+2&7]||e[M+3&7]||e[M+4&7]||e[M+5&7]||e[M+6&7]||e[M+7&7])&&(i=e,b=M)}for(;n.data!==t;)if(r=n,!(n=n.next))return this;return(s=n.next)&&delete n.next,r?(s?r.next=s:delete r.next,this):e?(s?e[M]=s:delete e[M],(n=e[0]||e[1]||e[2]||e[3]||e[4]||e[5]||e[6]||e[7])&&n===(e[7]||e[6]||e[5]||e[4]||e[3]||e[2]||e[1]||e[0])&&!n.length&&(i?i[b]=n:this._root=n),this):(this._root=s,this)}function Yg(t){for(var e=0,n=t.length;e<n;++e)this.remove(t[e]);return this}function Zg(){return this._root}function Kg(){var t=0;return this.visit(function(e){if(!e.length)do++t;while(e=e.next)}),t}function Jg(t){var e=[],n,i=this._root,r,s,o,a,l,c,h;for(i&&e.push(new dt(i,this._x0,this._y0,this._z0,this._x1,this._y1,this._z1));n=e.pop();)if(!t(i=n.node,s=n.x0,o=n.y0,a=n.z0,l=n.x1,c=n.y1,h=n.z1)&&i.length){var u=(s+l)/2,d=(o+c)/2,f=(a+h)/2;(r=i[7])&&e.push(new dt(r,u,d,f,l,c,h)),(r=i[6])&&e.push(new dt(r,s,d,f,u,c,h)),(r=i[5])&&e.push(new dt(r,u,o,f,l,d,h)),(r=i[4])&&e.push(new dt(r,s,o,f,u,d,h)),(r=i[3])&&e.push(new dt(r,u,d,a,l,c,f)),(r=i[2])&&e.push(new dt(r,s,d,a,u,c,f)),(r=i[1])&&e.push(new dt(r,u,o,a,l,d,f)),(r=i[0])&&e.push(new dt(r,s,o,a,u,d,f))}return this}function Qg(t){var e=[],n=[],i;for(this._root&&e.push(new dt(this._root,this._x0,this._y0,this._z0,this._x1,this._y1,this._z1));i=e.pop();){var r=i.node;if(r.length){var s,o=i.x0,a=i.y0,l=i.z0,c=i.x1,h=i.y1,u=i.z1,d=(o+c)/2,f=(a+h)/2,m=(l+u)/2;(s=r[0])&&e.push(new dt(s,o,a,l,d,f,m)),(s=r[1])&&e.push(new dt(s,d,a,l,c,f,m)),(s=r[2])&&e.push(new dt(s,o,f,l,d,h,m)),(s=r[3])&&e.push(new dt(s,d,f,l,c,h,m)),(s=r[4])&&e.push(new dt(s,o,a,m,d,f,u)),(s=r[5])&&e.push(new dt(s,d,a,m,c,f,u)),(s=r[6])&&e.push(new dt(s,o,f,m,d,h,u)),(s=r[7])&&e.push(new dt(s,d,f,m,c,h,u))}n.push(i)}for(;i=n.pop();)t(i.node,i.x0,i.y0,i.z0,i.x1,i.y1,i.z1);return this}function e0(t){return t[0]}function t0(t){return arguments.length?(this._x=t,this):this._x}function n0(t){return t[1]}function i0(t){return arguments.length?(this._y=t,this):this._y}function r0(t){return t[2]}function s0(t){return arguments.length?(this._z=t,this):this._z}function aa(t,e,n,i){var r=new Ff(e??e0,n??n0,i??r0,NaN,NaN,NaN,NaN,NaN,NaN);return t==null?r:r.addAll(t)}function Ff(t,e,n,i,r,s,o,a,l){this._x=t,this._y=e,this._z=n,this._x0=i,this._y0=r,this._z0=s,this._x1=o,this._y1=a,this._z1=l,this._root=void 0}function o0(t){for(var e={data:t.data},n=e;t=t.next;)n=n.next={data:t.data};return e}var Qt=aa.prototype=Ff.prototype;Qt.copy=function(){var t=new Ff(this._x,this._y,this._z,this._x0,this._y0,this._z0,this._x1,this._y1,this._z1),e=this._root,n,i;if(!e)return t;if(!e.length)return t._root=o0(e),t;for(n=[{source:e,target:t._root=new Array(8)}];e=n.pop();)for(var r=0;r<8;++r)(i=e.source[r])&&(i.length?n.push({source:i,target:e.target[r]=new Array(8)}):e.target[r]=o0(i));return t};Qt.add=Bg;Qt.addAll=Hg;Qt.cover=Gg;Qt.data=Wg;Qt.extent=jg;Qt.find=qg;Qt.findAllWithinRadius=Xg;Qt.remove=$g;Qt.removeAll=Yg;Qt.root=Zg;Qt.size=Kg;Qt.visit=Jg;Qt.visitAfter=Qg;Qt.x=t0;Qt.y=i0;Qt.z=s0;function Xn(t){return function(){return t}}function si(t){return(t()-.5)*1e-6}function yE(t){return t.index}function a0(t,e){var n=t.get(e);if(!n)throw new Error("node not found: "+e);return n}function Uf(t){var e=yE,n=d,i,r=Xn(30),s,o,a,l,c,h,u=1;t==null&&(t=[]);function d(p){return 1/Math.min(l[p.source.index],l[p.target.index])}function f(p){for(var x=0,y=t.length;x<u;++x)for(var v=0,M,b,A,C=0,E=0,w=0,I,N;v<y;++v)M=t[v],b=M.source,A=M.target,C=A.x+A.vx-b.x-b.vx||si(h),a>1&&(E=A.y+A.vy-b.y-b.vy||si(h)),a>2&&(w=A.z+A.vz-b.z-b.vz||si(h)),I=Math.sqrt(C*C+E*E+w*w),I=(I-s[v])/I*p*i[v],C*=I,E*=I,w*=I,A.vx-=C*(N=c[v]),a>1&&(A.vy-=E*N),a>2&&(A.vz-=w*N),b.vx+=C*(N=1-N),a>1&&(b.vy+=E*N),a>2&&(b.vz+=w*N)}function m(){if(o){var p,x=o.length,y=t.length,v=new Map(o.map((b,A)=>[e(b,A,o),b])),M;for(p=0,l=new Array(x);p<y;++p)M=t[p],M.index=p,typeof M.source!="object"&&(M.source=a0(v,M.source)),typeof M.target!="object"&&(M.target=a0(v,M.target)),l[M.source.index]=(l[M.source.index]||0)+1,l[M.target.index]=(l[M.target.index]||0)+1;for(p=0,c=new Array(y);p<y;++p)M=t[p],c[p]=l[M.source.index]/(l[M.source.index]+l[M.target.index]);i=new Array(y),_(),s=new Array(y),g()}}function _(){if(o)for(var p=0,x=t.length;p<x;++p)i[p]=+n(t[p],p,t)}function g(){if(o)for(var p=0,x=t.length;p<x;++p)s[p]=+r(t[p],p,t)}return f.initialize=function(p,...x){o=p,h=x.find(y=>typeof y=="function")||Math.random,a=x.find(y=>[1,2,3].includes(y))||2,m()},f.links=function(p){return arguments.length?(t=p,m(),f):t},f.id=function(p){return arguments.length?(e=p,f):e},f.iterations=function(p){return arguments.length?(u=+p,f):u},f.strength=function(p){return arguments.length?(n=typeof p=="function"?p:Xn(+p),_(),f):n},f.distance=function(p){return arguments.length?(r=typeof p=="function"?p:Xn(+p),g(),f):r},f}var xE={value:()=>{}};function zf(){for(var t=0,e=arguments.length,n={},i;t<e;++t){if(!(i=arguments[t]+"")||i in n||/[\s.]/.test(i))throw new Error("illegal type: "+i);n[i]=[]}return new eh(n)}function eh(t){this._=t}function bE(t,e){return t.trim().split(/^|\s+/).map(function(n){var i="",r=n.indexOf(".");if(r>=0&&(i=n.slice(r+1),n=n.slice(0,r)),n&&!e.hasOwnProperty(n))throw new Error("unknown type: "+n);return{type:n,name:i}})}eh.prototype=zf.prototype={constructor:eh,on:function(t,e){var n=this._,i=bE(t+"",n),r,s=-1,o=i.length;if(arguments.length<2){for(;++s<o;)if((r=(t=i[s]).type)&&(r=ME(n[r],t.name)))return r;return}if(e!=null&&typeof e!="function")throw new Error("invalid callback: "+e);for(;++s<o;)if(r=(t=i[s]).type)n[r]=c0(n[r],t.name,e);else if(e==null)for(r in n)n[r]=c0(n[r],t.name,null);return this},copy:function(){var t={},e=this._;for(var n in e)t[n]=e[n].slice();return new eh(t)},call:function(t,e){if((r=arguments.length-2)>0)for(var n=new Array(r),i=0,r,s;i<r;++i)n[i]=arguments[i+2];if(!this._.hasOwnProperty(t))throw new Error("unknown type: "+t);for(s=this._[t],i=0,r=s.length;i<r;++i)s[i].value.apply(e,n)},apply:function(t,e,n){if(!this._.hasOwnProperty(t))throw new Error("unknown type: "+t);for(var i=this._[t],r=0,s=i.length;r<s;++r)i[r].value.apply(e,n)}};function ME(t,e){for(var n=0,i=t.length,r;n<i;++n)if((r=t[n]).name===e)return r.value}function c0(t,e,n){for(var i=0,r=t.length;i<r;++i)if(t[i].name===e){t[i]=xE,t=t.slice(0,i).concat(t.slice(i+1));break}return n!=null&&t.push({name:e,value:n}),t}var Hs=0,la=0,ca=0,h0=1e3,th,ha,nh=0,Hr=0,ih=0,ua=typeof performance=="object"&&performance.now?performance:Date,u0=typeof window=="object"&&window.requestAnimationFrame?window.requestAnimationFrame.bind(window):function(t){setTimeout(t,17)};function f0(){return Hr||(u0(SE),Hr=ua.now()+ih)}function SE(){Hr=0}function kf(){this._call=this._time=this._next=null}kf.prototype=Vf.prototype={constructor:kf,restart:function(t,e,n){if(typeof t!="function")throw new TypeError("callback is not a function");n=(n==null?f0():+n)+(e==null?0:+e),!this._next&&ha!==this&&(ha?ha._next=this:th=this,ha=this),this._call=t,this._time=n,Bf()},stop:function(){this._call&&(this._call=null,this._time=1/0,Bf())}};function Vf(t,e,n){var i=new kf;return i.restart(t,e,n),i}function wE(){f0(),++Hs;for(var t=th,e;t;)(e=Hr-t._time)>=0&&t._call.call(void 0,e),t=t._next;--Hs}function l0(){Hr=(nh=ua.now())+ih,Hs=la=0;try{wE()}finally{Hs=0,TE(),Hr=0}}function EE(){var t=ua.now(),e=t-nh;e>h0&&(ih-=e,nh=t)}function TE(){for(var t,e=th,n,i=1/0;e;)e._call?(i>e._time&&(i=e._time),t=e,e=e._next):(n=e._next,e._next=null,e=t?t._next=n:th=n);ha=t,Bf(i)}function Bf(t){if(!Hs){la&&(la=clearTimeout(la));var e=t-Hr;e>24?(t<1/0&&(la=setTimeout(l0,Math.ceil(t-ua.now()-ih)+1)),ca&&(ca=clearInterval(ca))):(ca||(nh=ua.now(),ca=setInterval(EE,h0)),Hs=1,u0(l0))}}function d0(){let t=1;return()=>(t=(1664525*t+1013904223)%4294967296)/4294967296}var p0=3;function rh(t){return t.x}function Hf(t){return t.y}function m0(t){return t.z}var AE=10,CE=Math.PI*(3-Math.sqrt(5)),RE=Math.PI*20/(9+Math.sqrt(221));function Gf(t,e){e=e||2;var n=Math.min(p0,Math.max(1,Math.round(e))),i,r=1,s=.001,o=1-Math.pow(s,1/300),a=0,l=.6,c=new Map,h=Vf(f),u=zf("tick","end"),d=d0();t==null&&(t=[]);function f(){m(),u.call("tick",i),r<s&&(h.stop(),u.call("end",i))}function m(p){var x,y=t.length,v;p===void 0&&(p=1);for(var M=0;M<p;++M)for(r+=(a-r)*o,c.forEach(function(b){b(r)}),x=0;x<y;++x)v=t[x],v.fx==null?v.x+=v.vx*=l:(v.x=v.fx,v.vx=0),n>1&&(v.fy==null?v.y+=v.vy*=l:(v.y=v.fy,v.vy=0)),n>2&&(v.fz==null?v.z+=v.vz*=l:(v.z=v.fz,v.vz=0));return i}function _(){for(var p=0,x=t.length,y;p<x;++p){if(y=t[p],y.index=p,y.fx!=null&&(y.x=y.fx),y.fy!=null&&(y.y=y.fy),y.fz!=null&&(y.z=y.fz),isNaN(y.x)||n>1&&isNaN(y.y)||n>2&&isNaN(y.z)){var v=AE*(n>2?Math.cbrt(.5+p):n>1?Math.sqrt(.5+p):p),M=p*CE,b=p*RE;n===1?y.x=v:n===2?(y.x=v*Math.cos(M),y.y=v*Math.sin(M)):(y.x=v*Math.sin(M)*Math.cos(b),y.y=v*Math.cos(M),y.z=v*Math.sin(M)*Math.sin(b))}(isNaN(y.vx)||n>1&&isNaN(y.vy)||n>2&&isNaN(y.vz))&&(y.vx=0,n>1&&(y.vy=0),n>2&&(y.vz=0))}}function g(p){return p.initialize&&p.initialize(t,d,n),p}return _(),i={tick:m,restart:function(){return h.restart(f),i},stop:function(){return h.stop(),i},numDimensions:function(p){return arguments.length?(n=Math.min(p0,Math.max(1,Math.round(p))),c.forEach(g),i):n},nodes:function(p){return arguments.length?(t=p,_(),c.forEach(g),i):t},alpha:function(p){return arguments.length?(r=+p,i):r},alphaMin:function(p){return arguments.length?(s=+p,i):s},alphaDecay:function(p){return arguments.length?(o=+p,i):+o},alphaTarget:function(p){return arguments.length?(a=+p,i):a},velocityDecay:function(p){return arguments.length?(l=1-p,i):1-l},randomSource:function(p){return arguments.length?(d=p,c.forEach(g),i):d},force:function(p,x){return arguments.length>1?(x==null?c.delete(p):c.set(p,g(x)),i):c.get(p)},find:function(){var p=Array.prototype.slice.call(arguments),x=p.shift()||0,y=(n>1?p.shift():null)||0,v=(n>2?p.shift():null)||0,M=p.shift()||1/0,b=0,A=t.length,C,E,w,I,N,B;for(M*=M,b=0;b<A;++b)N=t[b],C=x-N.x,E=y-(N.y||0),w=v-(N.z||0),I=C*C+E*E+w*w,I<M&&(B=N,M=I);return B},on:function(p,x){return arguments.length>1?(u.on(p,x),i):u.on(p)}}}function Wf(){var t,e,n,i,r,s=Xn(-30),o,a=1,l=1/0,c=.81;function h(m){var _,g=t.length,p=(e===1?oa(t,rh):e===2?Of(t,rh,Hf):e===3?aa(t,rh,Hf,m0):null).visitAfter(d);for(r=m,_=0;_<g;++_)n=t[_],p.visit(f)}function u(){if(t){var m,_=t.length,g;for(o=new Array(_),m=0;m<_;++m)g=t[m],o[g.index]=+s(g,m,t)}}function d(m){var _=0,g,p,x=0,y,v,M,b,A=m.length;if(A){for(y=v=M=b=0;b<A;++b)(g=m[b])&&(p=Math.abs(g.value))&&(_+=g.value,x+=p,y+=p*(g.x||0),v+=p*(g.y||0),M+=p*(g.z||0));_*=Math.sqrt(4/A),m.x=y/x,e>1&&(m.y=v/x),e>2&&(m.z=M/x)}else{g=m,g.x=g.data.x,e>1&&(g.y=g.data.y),e>2&&(g.z=g.data.z);do _+=o[g.data.index];while(g=g.next)}m.value=_}function f(m,_,g,p,x){if(!m.value)return!0;var y=[g,p,x][e-1],v=m.x-n.x,M=e>1?m.y-n.y:0,b=e>2?m.z-n.z:0,A=y-_,C=v*v+M*M+b*b;if(A*A/c<C)return C<l&&(v===0&&(v=si(i),C+=v*v),e>1&&M===0&&(M=si(i),C+=M*M),e>2&&b===0&&(b=si(i),C+=b*b),C<a&&(C=Math.sqrt(a*C)),n.vx+=v*m.value*r/C,e>1&&(n.vy+=M*m.value*r/C),e>2&&(n.vz+=b*m.value*r/C)),!0;if(m.length||C>=l)return;(m.data!==n||m.next)&&(v===0&&(v=si(i),C+=v*v),e>1&&M===0&&(M=si(i),C+=M*M),e>2&&b===0&&(b=si(i),C+=b*b),C<a&&(C=Math.sqrt(a*C)));do m.data!==n&&(A=o[m.data.index]*r/C,n.vx+=v*A,e>1&&(n.vy+=M*A),e>2&&(n.vz+=b*A));while(m=m.next)}return h.initialize=function(m,..._){t=m,i=_.find(g=>typeof g=="function")||Math.random,e=_.find(g=>[1,2,3].includes(g))||2,u()},h.strength=function(m){return arguments.length?(s=typeof m=="function"?m:Xn(+m),u(),h):s},h.distanceMin=function(m){return arguments.length?(a=m*m,h):Math.sqrt(a)},h.distanceMax=function(m){return arguments.length?(l=m*m,h):Math.sqrt(l)},h.theta=function(m){return arguments.length?(c=m*m,h):Math.sqrt(c)},h}function jf(t,e,n,i){var r,s,o=Xn(.1),a,l;typeof t!="function"&&(t=Xn(+t)),e==null&&(e=0),n==null&&(n=0),i==null&&(i=0);function c(u){for(var d=0,f=r.length;d<f;++d){var m=r[d],_=m.x-e||1e-6,g=(m.y||0)-n||1e-6,p=(m.z||0)-i||1e-6,x=Math.sqrt(_*_+g*g+p*p),y=(l[d]-x)*a[d]*u/x;m.vx+=_*y,s>1&&(m.vy+=g*y),s>2&&(m.vz+=p*y)}}function h(){if(r){var u,d=r.length;for(a=new Array(d),l=new Array(d),u=0;u<d;++u)l[u]=+t(r[u],u,r),a[u]=isNaN(l[u])?0:+o(r[u],u,r)}}return c.initialize=function(u,...d){r=u,s=d.find(f=>[1,2,3].includes(f))||2,h()},c.strength=function(u){return arguments.length?(o=typeof u=="function"?u:Xn(+u),h(),c):o},c.radius=function(u){return arguments.length?(t=typeof u=="function"?u:Xn(+u),h(),c):t},c.x=function(u){return arguments.length?(e=+u,c):e},c.y=function(u){return arguments.length?(n=+u,c):n},c.z=function(u){return arguments.length?(i=+u,c):i},c}function qf(t){IE(t);let e=PE(t);return t.on=e.on,t.off=e.off,t.fire=e.fire,t}function PE(t){let e=Object.create(null);return{on:function(n,i,r){if(typeof i!="function")throw new Error("callback is expected to be a function");let s=e[n];return s||(s=e[n]=[]),s.push({callback:i,ctx:r}),t},off:function(n,i){if(typeof n>"u")return e=Object.create(null),t;if(e[n])if(typeof i!="function")delete e[n];else{let o=e[n];for(let a=0;a<o.length;++a)o[a].callback===i&&o.splice(a,1)}return t},fire:function(n){let i=e[n];if(!i)return t;let r;arguments.length>1&&(r=Array.prototype.slice.call(arguments,1));for(let s=0;s<i.length;++s){let o=i[s];o.callback.apply(o.ctx,r)}return t}}}function IE(t){if(!t)throw new Error("Eventify cannot use falsy object as events subject");let e=["on","fire","off"];for(let n=0;n<e.length;++n)if(t.hasOwnProperty(e[n]))throw new Error("Subject cannot be eventified, since it already has property '"+e[n]+"'")}var v0=DE;function DE(t){if(t=t||{},"uniqueLinkId"in t&&(console.warn("ngraph.graph: Starting from version 0.14 `uniqueLinkId` is deprecated.\nUse `multigraph` option instead\n",`
`,`Note: there is also change in default behavior: From now on each graph
is considered to be not a multigraph by default (each edge is unique).`),t.multigraph=t.uniqueLinkId),t.multigraph===void 0&&(t.multigraph=!1),typeof Map!="function")throw new Error("ngraph.graph requires `Map` to be defined. Please polyfill it before using ngraph");var e=new Map,n=new Map,i={},r=0,s=t.multigraph?v:y,o=[],a=J,l=J,c=J,h=J,u={version:20,addNode:_,addLink:x,removeLink:C,removeNode:p,getNode:g,getNodeCount:M,getLinkCount:b,getEdgeCount:b,getLinksCount:b,getNodesCount:M,getLinks:A,forEachNode:fe,forEachLinkedNode:L,forEachLink:B,beginUpdate:c,endUpdate:h,clear:N,hasLink:w,hasNode:g,getLink:w,getLinkById:I};return qf(u),d(),u;function d(){var X=u.on;u.on=re;function re(){return u.beginUpdate=c=G,u.endUpdate=h=le,a=f,l=m,u.on=X,X.apply(u,arguments)}}function f(X,re){o.push({link:X,changeType:re})}function m(X,re){o.push({node:X,changeType:re})}function _(X,re){if(X===void 0)throw new Error("Invalid node identifier");c();var ye=g(X);return ye?(ye.data=re,l(ye,"update")):(ye=new LE(X,re),l(ye,"add")),e.set(X,ye),h(),ye}function g(X){return e.get(X)}function p(X){var re=g(X);if(!re)return!1;c();var ye=re.links;return ye&&(ye.forEach(E),re.links=null),e.delete(X),l(re,"remove"),h(),!0}function x(X,re,ye){c();var Ue=g(X)||_(X),ke=g(re)||_(re),$=s(X,re,ye),ee=n.has($.id);return n.set($.id,$),g0(Ue,$),X!==re&&g0(ke,$),a($,ee?"update":"add"),h(),$}function y(X,re,ye){var Ue=sh(X,re),ke=n.get(Ue);return ke?(ke.data=ye,ke):new _0(X,re,ye,Ue)}function v(X,re,ye){var Ue=sh(X,re),ke=i.hasOwnProperty(Ue);if(ke||w(X,re)){ke||(i[Ue]=0);var $="@"+ ++i[Ue];Ue=sh(X+$,re+$)}return new _0(X,re,ye,Ue)}function M(){return e.size}function b(){return n.size}function A(X){var re=g(X);return re?re.links:null}function C(X,re){return re!==void 0&&(X=w(X,re)),E(X)}function E(X){if(!X||!n.get(X.id))return!1;c(),n.delete(X.id);var re=g(X.fromId),ye=g(X.toId);return re&&re.links.delete(X),ye&&ye.links.delete(X),a(X,"remove"),h(),!0}function w(X,re){if(!(X===void 0||re===void 0))return n.get(sh(X,re))}function I(X){if(X!==void 0)return n.get(X)}function N(){c(),fe(function(X){p(X.id)}),h()}function B(X){if(typeof X=="function")for(var re=n.values(),ye=re.next();!ye.done;){if(X(ye.value))return!0;ye=re.next()}}function L(X,re,ye){var Ue=g(X);if(Ue&&Ue.links&&typeof re=="function")return ye?F(Ue.links,X,re):D(Ue.links,X,re)}function D(X,re,ye){for(var Ue,ke=X.values(),$=ke.next();!$.done;){var ee=$.value,be=ee.fromId===re?ee.toId:ee.fromId;if(Ue=ye(e.get(be),ee),Ue)return!0;$=ke.next()}}function F(X,re,ye){for(var Ue,ke=X.values(),$=ke.next();!$.done;){var ee=$.value;if(ee.fromId===re&&(Ue=ye(e.get(ee.toId),ee),Ue))return!0;$=ke.next()}}function J(){}function G(){r+=1}function le(){r-=1,r===0&&o.length>0&&(u.fire("changed",o),o.length=0)}function fe(X){if(typeof X!="function")throw new Error("Function is expected to iterate over graph nodes. You passed "+X);for(var re=e.values(),ye=re.next();!ye.done;){if(X(ye.value))return!0;ye=re.next()}}}function LE(t,e){this.id=t,this.links=null,this.data=e}function g0(t,e){t.links?t.links.add(e):t.links=new Set([e])}function _0(t,e,n,i){this.fromId=t,this.toId=e,this.data=n,this.id=i}function sh(t,e){return t.toString()+"\u{1F449} "+e.toString()}var pv=bx(K0(),1);function uT(t){var e=typeof t;return t!=null&&(e=="object"||e=="function")}var da=uT;var fT=typeof global=="object"&&global&&global.Object===Object&&global,J0=fT;var dT=typeof self=="object"&&self&&self.Object===Object&&self,pT=J0||dT||Function("return this")(),ah=pT;var mT=function(){return ah.Date.now()},ch=mT;var gT=/\s/;function _T(t){for(var e=t.length;e--&&gT.test(t.charAt(e)););return e}var Q0=_T;var vT=/^\s+/;function yT(t){return t&&t.slice(0,Q0(t)+1).replace(vT,"")}var e_=yT;var xT=ah.Symbol,Gs=xT;var t_=Object.prototype,bT=t_.hasOwnProperty,MT=t_.toString,pa=Gs?Gs.toStringTag:void 0;function ST(t){var e=bT.call(t,pa),n=t[pa];try{t[pa]=void 0;var i=!0}catch{}var r=MT.call(t);return i&&(e?t[pa]=n:delete t[pa]),r}var n_=ST;var wT=Object.prototype,ET=wT.toString;function TT(t){return ET.call(t)}var i_=TT;var AT="[object Null]",CT="[object Undefined]",r_=Gs?Gs.toStringTag:void 0;function RT(t){return t==null?t===void 0?CT:AT:r_&&r_ in Object(t)?n_(t):i_(t)}var s_=RT;function PT(t){return t!=null&&typeof t=="object"}var o_=PT;var IT="[object Symbol]";function DT(t){return typeof t=="symbol"||o_(t)&&s_(t)==IT}var a_=DT;var c_=NaN,LT=/^[-+]0x[0-9a-f]+$/i,OT=/^0b[01]+$/i,NT=/^0o[0-7]+$/i,FT=parseInt;function UT(t){if(typeof t=="number")return t;if(a_(t))return c_;if(da(t)){var e=typeof t.valueOf=="function"?t.valueOf():t;t=da(e)?e+"":e}if(typeof t!="string")return t===0?t:+t;t=e_(t);var n=OT.test(t);return n||NT.test(t)?FT(t.slice(2),n?2:8):LT.test(t)?c_:+t}var rd=UT;var zT="Expected a function",kT=Math.max,BT=Math.min;function VT(t,e,n){var i,r,s,o,a,l,c=0,h=!1,u=!1,d=!0;if(typeof t!="function")throw new TypeError(zT);e=rd(e)||0,da(n)&&(h=!!n.leading,u="maxWait"in n,s=u?kT(rd(n.maxWait)||0,e):s,d="trailing"in n?!!n.trailing:d);function f(b){var A=i,C=r;return i=r=void 0,c=b,o=t.apply(C,A),o}function m(b){return c=b,a=setTimeout(p,e),h?f(b):o}function _(b){var A=b-l,C=b-c,E=e-A;return u?BT(E,s-C):E}function g(b){var A=b-l,C=b-c;return l===void 0||A>=e||A<0||u&&C>=s}function p(){var b=ch();if(g(b))return x(b);a=setTimeout(p,_(b))}function x(b){return a=void 0,d&&i?f(b):(i=r=void 0,o)}function y(){a!==void 0&&clearTimeout(a),c=0,i=l=r=a=void 0}function v(){return a===void 0?o:x(ch())}function M(){var b=ch(),A=g(b);if(i=arguments,r=this,l=b,A){if(a===void 0)return m(l);if(u)return clearTimeout(a),a=setTimeout(p,e),f(l)}return a===void 0&&(a=setTimeout(p,e)),o}return M.cancel=y,M.flush=v,M}var l_=VT;function h_(t,e){(e==null||e>t.length)&&(e=t.length);for(var n=0,i=Array(e);n<e;n++)i[n]=t[n];return i}function HT(t){if(Array.isArray(t))return t}function GT(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}function WT(t,e,n){return Object.defineProperty(t,"prototype",{writable:!1}),t}function jT(t,e){var n=t==null?null:typeof Symbol<"u"&&t[Symbol.iterator]||t["@@iterator"];if(n!=null){var i,r,s,o,a=[],l=!0,c=!1;try{if(s=(n=n.call(t)).next,e!==0)for(;!(l=(i=s.call(n)).done)&&(a.push(i.value),a.length!==e);l=!0);}catch(h){c=!0,r=h}finally{try{if(!l&&n.return!=null&&(o=n.return(),Object(o)!==o))return}finally{if(c)throw r}}return a}}function qT(){throw new TypeError(`Invalid attempt to destructure non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}function XT(t,e){return HT(t)||jT(t,e)||$T(t,e)||qT()}function $T(t,e){if(t){if(typeof t=="string")return h_(t,e);var n={}.toString.call(t).slice(8,-1);return n==="Object"&&t.constructor&&(n=t.constructor.name),n==="Map"||n==="Set"?Array.from(t):n==="Arguments"||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)?h_(t,e):void 0}}var YT=WT(function t(e,n){var i=n.default,r=i===void 0?null:i,s=n.triggerUpdate,o=s===void 0?!0:s,a=n.onChange,l=a===void 0?function(c,h){}:a;GT(this,t),this.name=e,this.defaultVal=r,this.triggerUpdate=o,this.onChange=l});function lr(t){var e=t.stateInit,n=e===void 0?function(){return{}}:e,i=t.props,r=i===void 0?{}:i,s=t.methods,o=s===void 0?{}:s,a=t.aliases,l=a===void 0?{}:a,c=t.init,h=c===void 0?function(){}:c,u=t.update,d=u===void 0?function(){}:u,f=Object.keys(r).map(function(m){return new YT(m,r[m])});return function m(){for(var _=arguments.length,g=new Array(_),p=0;p<_;p++)g[p]=arguments[p];var x=!!(this instanceof m&&this.constructor),y=x?g.shift():void 0,v=g[0],M=v===void 0?{}:v,b=Object.assign({},n instanceof Function?n(M):n,{initialised:!1}),A={};function C(I){return E(I,M),w(),C}var E=function(N,B){h.call(C,N,b,B),b.initialised=!0},w=l_(function(){b.initialised&&(d.call(C,b,A),A={})},1);return f.forEach(function(I){C[I.name]=N(I);function N(B){var L=B.name,D=B.triggerUpdate,F=D===void 0?!1:D,J=B.onChange,G=J===void 0?function(X,re){}:J,le=B.defaultVal,fe=le===void 0?null:le;return function(X){var re=b[L];if(!arguments.length)return re;var ye=X===void 0?fe:X;return b[L]=ye,G.call(C,ye,b,re),!A.hasOwnProperty(L)&&(A[L]=re),F&&w(),C}}}),Object.keys(o).forEach(function(I){C[I]=function(){for(var N,B=arguments.length,L=new Array(B),D=0;D<B;D++)L[D]=arguments[D];return(N=o[I]).call.apply(N,[C,b].concat(L))}}),Object.entries(l).forEach(function(I){var N=XT(I,2),B=N[0],L=N[1];return C[B]=C[L]}),C.resetProps=function(){return f.forEach(function(I){C[I.name](I.defaultVal)}),C},C.resetProps(),b._rerender=w,x&&y&&C(y),C}}var tt=(function(t){return typeof t=="function"?t:typeof t=="string"?function(e){return e[t]}:function(e){return t}});function ma(t,e){return t==null||e==null?NaN:t<e?-1:t>e?1:t>=e?0:NaN}function ZT(t,e){return t==null||e==null?NaN:e<t?-1:e>t?1:e>=t?0:NaN}function f_(t){let e,n,i;t.length!==2?(e=ma,n=(a,l)=>ma(t(a),l),i=(a,l)=>t(a)-l):(e=t===ma||t===ZT?t:KT,n=t,i=t);function r(a,l,c=0,h=a.length){if(c<h){if(e(l,l)!==0)return h;do{let u=c+h>>>1;n(a[u],l)<0?c=u+1:h=u}while(c<h)}return c}function s(a,l,c=0,h=a.length){if(c<h){if(e(l,l)!==0)return h;do{let u=c+h>>>1;n(a[u],l)<=0?c=u+1:h=u}while(c<h)}return c}function o(a,l,c=0,h=a.length){let u=r(a,l,c,h-1);return u>c&&i(a[u-1],l)>-i(a[u],l)?u-1:u}return{left:r,center:o,right:s}}function KT(){return 0}function JT(t){return t===null?NaN:+t}var d_=f_(ma),QT=d_.right,GF=d_.left,WF=f_(JT).center;var jF=p_(m_),qF=p_(eA);function p_(t){return function(e,n,i=n){if(!((n=+n)>=0))throw new RangeError("invalid rx");if(!((i=+i)>=0))throw new RangeError("invalid ry");let{data:r,width:s,height:o}=e;if(!((s=Math.floor(s))>=0))throw new RangeError("invalid width");if(!((o=Math.floor(o!==void 0?o:r.length/s))>=0))throw new RangeError("invalid height");if(!s||!o||!n&&!i)return e;let a=n&&t(n),l=i&&t(i),c=r.slice();return a&&l?(Ws(a,c,r,s,o),Ws(a,r,c,s,o),Ws(a,c,r,s,o),js(l,r,c,s,o),js(l,c,r,s,o),js(l,r,c,s,o)):a?(Ws(a,r,c,s,o),Ws(a,c,r,s,o),Ws(a,r,c,s,o)):l&&(js(l,r,c,s,o),js(l,c,r,s,o),js(l,r,c,s,o)),e}}function Ws(t,e,n,i,r){for(let s=0,o=i*r;s<o;)t(e,n,s,s+=i,1)}function js(t,e,n,i,r){for(let s=0,o=i*r;s<i;++s)t(e,n,s,s+o,i)}function eA(t){let e=m_(t);return(n,i,r,s,o)=>{r<<=2,s<<=2,o<<=2,e(n,i,r+0,s+0,o),e(n,i,r+1,s+1,o),e(n,i,r+2,s+2,o),e(n,i,r+3,s+3,o)}}function m_(t){let e=Math.floor(t);if(e===t)return tA(t);let n=t-e,i=2*t+1;return(r,s,o,a,l)=>{if(!((a-=l)>=o))return;let c=e*s[o],h=l*e,u=h+l;for(let d=o,f=o+h;d<f;d+=l)c+=s[Math.min(a,d)];for(let d=o,f=a;d<=f;d+=l)c+=s[Math.min(a,d+h)],r[d]=(c+n*(s[Math.max(o,d-u)]+s[Math.min(a,d+u)]))/i,c-=s[Math.max(o,d-h)]}}function tA(t){let e=2*t+1;return(n,i,r,s,o)=>{if(!((s-=o)>=r))return;let a=t*i[r],l=o*t;for(let c=r,h=r+l;c<h;c+=o)a+=i[Math.min(s,c)];for(let c=r,h=s;c<=h;c+=o)a+=i[Math.min(s,c+l)],n[c]=a/e,a-=i[Math.max(r,c-l)]}}var ga=class extends Map{constructor(e,n=rA){if(super(),Object.defineProperties(this,{_intern:{value:new Map},_key:{value:n}}),e!=null)for(let[i,r]of e)this.set(i,r)}get(e){return super.get(u_(this,e))}has(e){return super.has(u_(this,e))}set(e,n){return super.set(nA(this,e),n)}delete(e){return super.delete(iA(this,e))}};function u_({_intern:t,_key:e},n){let i=e(n);return t.has(i)?t.get(i):n}function nA({_intern:t,_key:e},n){let i=e(n);return t.has(i)?t.get(i):(t.set(i,n),n)}function iA({_intern:t,_key:e},n){let i=e(n);return t.has(i)&&(n=t.get(i),t.delete(i)),n}function rA(t){return t!==null&&typeof t=="object"?t.valueOf():t}var sA=Array.prototype,XF=sA.slice;var $F=Math.sqrt(50),YF=Math.sqrt(10),ZF=Math.sqrt(2);function g_(t,e){let n;if(e===void 0)for(let i of t)i!=null&&(n<i||n===void 0&&i>=i)&&(n=i);else{let i=-1;for(let r of t)(r=e(r,++i,t))!=null&&(n<r||n===void 0&&r>=r)&&(n=r)}return n}function __(t,e){let n;if(e===void 0)for(let i of t)i!=null&&(n>i||n===void 0&&i>=i)&&(n=i);else{let i=-1;for(let r of t)(r=e(r,++i,t))!=null&&(n>r||n===void 0&&r>=r)&&(n=r)}return n}var KF=oA(Math.random);function oA(t){return function(n,i=0,r=n.length){let s=r-(i=+i);for(;s;){let o=t()*s--|0,a=n[s+i];n[s+i]=n[o+i],n[o+i]=a}return n}}function cd(t,e){(e==null||e>t.length)&&(e=t.length);for(var n=0,i=Array(e);n<e;n++)i[n]=t[n];return i}function aA(t){if(Array.isArray(t))return t}function cA(t){if(Array.isArray(t))return cd(t)}function v_(t,e,n){if(typeof t=="function"?t===e:t.has(e))return arguments.length<3?e:n;throw new TypeError("Private element is not present on this object")}function lA(t,e){if(e.has(t))throw new TypeError("Cannot initialize the same private elements twice on an object")}function hA(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}function cn(t,e){return t.get(v_(t,e))}function qs(t,e,n){lA(t,e),e.set(t,n)}function lh(t,e,n){return t.set(v_(t,e),n),n}function uA(t,e){for(var n=0;n<e.length;n++){var i=e[n];i.enumerable=i.enumerable||!1,i.configurable=!0,"value"in i&&(i.writable=!0),Object.defineProperty(t,xA(i.key),i)}}function fA(t,e,n){return e&&uA(t.prototype,e),Object.defineProperty(t,"prototype",{writable:!1}),t}function dA(t){if(typeof Symbol<"u"&&t[Symbol.iterator]!=null||t["@@iterator"]!=null)return Array.from(t)}function pA(t,e){var n=t==null?null:typeof Symbol<"u"&&t[Symbol.iterator]||t["@@iterator"];if(n!=null){var i,r,s,o,a=[],l=!0,c=!1;try{if(s=(n=n.call(t)).next,e!==0)for(;!(l=(i=s.call(n)).done)&&(a.push(i.value),a.length!==e);l=!0);}catch(h){c=!0,r=h}finally{try{if(!l&&n.return!=null&&(o=n.return(),Object(o)!==o))return}finally{if(c)throw r}}return a}}function mA(){throw new TypeError(`Invalid attempt to destructure non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}function gA(){throw new TypeError(`Invalid attempt to spread non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}function _A(t,e){return aA(t)||pA(t,e)||y_(t,e)||mA()}function vA(t){return cA(t)||dA(t)||y_(t)||gA()}function yA(t,e){if(typeof t!="object"||!t)return t;var n=t[Symbol.toPrimitive];if(n!==void 0){var i=n.call(t,e);if(typeof i!="object")return i;throw new TypeError("@@toPrimitive must return a primitive value.")}return String(t)}function xA(t){var e=yA(t,"string");return typeof e=="symbol"?e:e+""}function y_(t,e){if(t){if(typeof t=="string")return cd(t,e);var n={}.toString.call(t).slice(8,-1);return n==="Object"&&t.constructor&&(n=t.constructor.name),n==="Map"||n==="Set"?Array.from(t):n==="Arguments"||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)?cd(t,e):void 0}}var Xs=new WeakMap,_a=new WeakMap,$s=new WeakMap,sd=new WeakMap,od=new WeakMap,ad=new WeakMap,x_=(function(){function t(){hA(this,t),qs(this,Xs,new Map),qs(this,_a,new Map),qs(this,$s,function(e){return e}),qs(this,sd,function(){return{}}),qs(this,od,function(){}),qs(this,ad,function(){})}return fA(t,[{key:"getObj",value:function(n){return cn(Xs,this).get(cn($s,this).call(this,n))}},{key:"getData",value:function(n){return cn(_a,this).get(n)}},{key:"entries",value:function(){return vA(cn(_a,this).entries()).map(function(n){var i=_A(n,2),r=i[0],s=i[1];return[s,r]})}},{key:"id",value:function(n){return lh($s,this,tt(n)),this}},{key:"onCreateObj",value:function(n){return lh(sd,this,n),this}},{key:"onUpdateObj",value:function(n){return lh(od,this,n),this}},{key:"onRemoveObj",value:function(n){return lh(ad,this,n),this}},{key:"digest",value:function(n){var i=this;n.filter(function(s){return!cn(Xs,i).has(cn($s,i).call(i,s))}).forEach(function(s){var o=cn(sd,i).call(i,s);cn(Xs,i).set(cn($s,i).call(i,s),o),cn(_a,i).set(o,s)});var r=new Map(n.map(function(s){return[cn($s,i).call(i,s),s]}));return cn(Xs,this).forEach(function(s,o){r.has(o)?cn(od,i).call(i,s,r.get(o)):(cn(ad,i).call(i,s,o),cn(Xs,i).delete(o),cn(_a,i).delete(s))}),this}},{key:"clear",value:function(){return this.digest([]),this}}])})();function Js(t,e,n){t.prototype=e.prototype=n,n.constructor=t}function xa(t,e){var n=Object.create(t.prototype);for(var i in e)n[i]=e[i];return n}function hr(){}var $r=.7,Ks=1/$r,Ys="\\s*([+-]?\\d+)\\s*",va="\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)\\s*",bi="\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)%\\s*",bA=/^#([0-9a-f]{3,8})$/,MA=new RegExp(`^rgb\\(${Ys},${Ys},${Ys}\\)$`),SA=new RegExp(`^rgb\\(${bi},${bi},${bi}\\)$`),wA=new RegExp(`^rgba\\(${Ys},${Ys},${Ys},${va}\\)$`),EA=new RegExp(`^rgba\\(${bi},${bi},${bi},${va}\\)$`),TA=new RegExp(`^hsl\\(${va},${bi},${bi}\\)$`),AA=new RegExp(`^hsla\\(${va},${bi},${bi},${va}\\)$`),b_={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074};Js(hr,ph,{copy(t){return Object.assign(new this.constructor,this,t)},displayable(){return this.rgb().displayable()},hex:M_,formatHex:M_,formatHex8:CA,formatHsl:RA,formatRgb:S_,toString:S_});function M_(){return this.rgb().formatHex()}function CA(){return this.rgb().formatHex8()}function RA(){return D_(this).formatHsl()}function S_(){return this.rgb().formatRgb()}function ph(t){var e,n;return t=(t+"").trim().toLowerCase(),(e=bA.exec(t))?(n=e[1].length,e=parseInt(e[1],16),n===6?w_(e):n===3?new Yt(e>>8&15|e>>4&240,e>>4&15|e&240,(e&15)<<4|e&15,1):n===8?hh(e>>24&255,e>>16&255,e>>8&255,(e&255)/255):n===4?hh(e>>12&15|e>>8&240,e>>8&15|e>>4&240,e>>4&15|e&240,((e&15)<<4|e&15)/255):null):(e=MA.exec(t))?new Yt(e[1],e[2],e[3],1):(e=SA.exec(t))?new Yt(e[1]*255/100,e[2]*255/100,e[3]*255/100,1):(e=wA.exec(t))?hh(e[1],e[2],e[3],e[4]):(e=EA.exec(t))?hh(e[1]*255/100,e[2]*255/100,e[3]*255/100,e[4]):(e=TA.exec(t))?A_(e[1],e[2]/100,e[3]/100,1):(e=AA.exec(t))?A_(e[1],e[2]/100,e[3]/100,e[4]):b_.hasOwnProperty(t)?w_(b_[t]):t==="transparent"?new Yt(NaN,NaN,NaN,0):null}function w_(t){return new Yt(t>>16&255,t>>8&255,t&255,1)}function hh(t,e,n,i){return i<=0&&(t=e=n=NaN),new Yt(t,e,n,i)}function pd(t){return t instanceof hr||(t=ph(t)),t?(t=t.rgb(),new Yt(t.r,t.g,t.b,t.opacity)):new Yt}function Yr(t,e,n,i){return arguments.length===1?pd(t):new Yt(t,e,n,i??1)}function Yt(t,e,n,i){this.r=+t,this.g=+e,this.b=+n,this.opacity=+i}Js(Yt,Yr,xa(hr,{brighter(t){return t=t==null?Ks:Math.pow(Ks,t),new Yt(this.r*t,this.g*t,this.b*t,this.opacity)},darker(t){return t=t==null?$r:Math.pow($r,t),new Yt(this.r*t,this.g*t,this.b*t,this.opacity)},rgb(){return this},clamp(){return new Yt(qr(this.r),qr(this.g),qr(this.b),fh(this.opacity))},displayable(){return-.5<=this.r&&this.r<255.5&&-.5<=this.g&&this.g<255.5&&-.5<=this.b&&this.b<255.5&&0<=this.opacity&&this.opacity<=1},hex:E_,formatHex:E_,formatHex8:PA,formatRgb:T_,toString:T_}));function E_(){return`#${jr(this.r)}${jr(this.g)}${jr(this.b)}`}function PA(){return`#${jr(this.r)}${jr(this.g)}${jr(this.b)}${jr((isNaN(this.opacity)?1:this.opacity)*255)}`}function T_(){let t=fh(this.opacity);return`${t===1?"rgb(":"rgba("}${qr(this.r)}, ${qr(this.g)}, ${qr(this.b)}${t===1?")":`, ${t})`}`}function fh(t){return isNaN(t)?1:Math.max(0,Math.min(1,t))}function qr(t){return Math.max(0,Math.min(255,Math.round(t)||0))}function jr(t){return t=qr(t),(t<16?"0":"")+t.toString(16)}function A_(t,e,n,i){return i<=0?t=e=n=NaN:n<=0||n>=1?t=e=NaN:e<=0&&(t=NaN),new oi(t,e,n,i)}function D_(t){if(t instanceof oi)return new oi(t.h,t.s,t.l,t.opacity);if(t instanceof hr||(t=ph(t)),!t)return new oi;if(t instanceof oi)return t;t=t.rgb();var e=t.r/255,n=t.g/255,i=t.b/255,r=Math.min(e,n,i),s=Math.max(e,n,i),o=NaN,a=s-r,l=(s+r)/2;return a?(e===s?o=(n-i)/a+(n<i)*6:n===s?o=(i-e)/a+2:o=(e-n)/a+4,a/=l<.5?s+r:2-s-r,o*=60):a=l>0&&l<1?0:o,new oi(o,a,l,t.opacity)}function mh(t,e,n,i){return arguments.length===1?D_(t):new oi(t,e,n,i??1)}function oi(t,e,n,i){this.h=+t,this.s=+e,this.l=+n,this.opacity=+i}Js(oi,mh,xa(hr,{brighter(t){return t=t==null?Ks:Math.pow(Ks,t),new oi(this.h,this.s,this.l*t,this.opacity)},darker(t){return t=t==null?$r:Math.pow($r,t),new oi(this.h,this.s,this.l*t,this.opacity)},rgb(){var t=this.h%360+(this.h<0)*360,e=isNaN(t)||isNaN(this.s)?0:this.s,n=this.l,i=n+(n<.5?n:1-n)*e,r=2*n-i;return new Yt(ld(t>=240?t-240:t+120,r,i),ld(t,r,i),ld(t<120?t+240:t-120,r,i),this.opacity)},clamp(){return new oi(C_(this.h),uh(this.s),uh(this.l),fh(this.opacity))},displayable(){return(0<=this.s&&this.s<=1||isNaN(this.s))&&0<=this.l&&this.l<=1&&0<=this.opacity&&this.opacity<=1},formatHsl(){let t=fh(this.opacity);return`${t===1?"hsl(":"hsla("}${C_(this.h)}, ${uh(this.s)*100}%, ${uh(this.l)*100}%${t===1?")":`, ${t})`}`}}));function C_(t){return t=(t||0)%360,t<0?t+360:t}function uh(t){return Math.max(0,Math.min(1,t||0))}function ld(t,e,n){return(t<60?e+(n-e)*t/60:t<180?n:t<240?e+(n-e)*(240-t)/60:e)*255}var L_=Math.PI/180,O_=180/Math.PI,dh=18,N_=.96422,F_=1,U_=.82521,z_=4/29,Zs=6/29,k_=3*Zs*Zs,IA=Zs*Zs*Zs;function B_(t){if(t instanceof Mi)return new Mi(t.l,t.a,t.b,t.opacity);if(t instanceof Gi)return H_(t);t instanceof Yt||(t=pd(t));var e=dd(t.r),n=dd(t.g),i=dd(t.b),r=hd((.2225045*e+.7168786*n+.0606169*i)/F_),s,o;return e===n&&n===i?s=o=r:(s=hd((.4360747*e+.3850649*n+.1430804*i)/N_),o=hd((.0139322*e+.0971045*n+.7141733*i)/U_)),new Mi(116*r-16,500*(s-r),200*(r-o),t.opacity)}function V_(t,e,n,i){return arguments.length===1?B_(t):new Mi(t,e,n,i??1)}function Mi(t,e,n,i){this.l=+t,this.a=+e,this.b=+n,this.opacity=+i}Js(Mi,V_,xa(hr,{brighter(t){return new Mi(this.l+dh*(t??1),this.a,this.b,this.opacity)},darker(t){return new Mi(this.l-dh*(t??1),this.a,this.b,this.opacity)},rgb(){var t=(this.l+16)/116,e=isNaN(this.a)?t:t+this.a/500,n=isNaN(this.b)?t:t-this.b/200;return e=N_*ud(e),t=F_*ud(t),n=U_*ud(n),new Yt(fd(3.1338561*e-1.6168667*t-.4906146*n),fd(-.9787684*e+1.9161415*t+.033454*n),fd(.0719453*e-.2289914*t+1.4052427*n),this.opacity)}}));function hd(t){return t>IA?Math.pow(t,1/3):t/k_+z_}function ud(t){return t>Zs?t*t*t:k_*(t-z_)}function fd(t){return 255*(t<=.0031308?12.92*t:1.055*Math.pow(t,1/2.4)-.055)}function dd(t){return(t/=255)<=.04045?t/12.92:Math.pow((t+.055)/1.055,2.4)}function DA(t){if(t instanceof Gi)return new Gi(t.h,t.c,t.l,t.opacity);if(t instanceof Mi||(t=B_(t)),t.a===0&&t.b===0)return new Gi(NaN,0<t.l&&t.l<100?0:NaN,t.l,t.opacity);var e=Math.atan2(t.b,t.a)*O_;return new Gi(e<0?e+360:e,Math.sqrt(t.a*t.a+t.b*t.b),t.l,t.opacity)}function gh(t,e,n,i){return arguments.length===1?DA(t):new Gi(t,e,n,i??1)}function Gi(t,e,n,i){this.h=+t,this.c=+e,this.l=+n,this.opacity=+i}function H_(t){if(isNaN(t.h))return new Mi(t.l,0,0,t.opacity);var e=t.h*L_;return new Mi(t.l,Math.cos(e)*t.c,Math.sin(e)*t.c,t.opacity)}Js(Gi,gh,xa(hr,{brighter(t){return new Gi(this.h,this.c,this.l+dh*(t??1),this.opacity)},darker(t){return new Gi(this.h,this.c,this.l-dh*(t??1),this.opacity)},rgb(){return H_(this).rgb()}}));var G_=-.14861,md=1.78277,gd=-.29227,_h=-.90649,ya=1.97294,R_=ya*_h,P_=ya*md,I_=md*gd-_h*G_;function LA(t){if(t instanceof Xr)return new Xr(t.h,t.s,t.l,t.opacity);t instanceof Yt||(t=pd(t));var e=t.r/255,n=t.g/255,i=t.b/255,r=(I_*i+R_*e-P_*n)/(I_+R_-P_),s=i-r,o=(ya*(n-r)-gd*s)/_h,a=Math.sqrt(o*o+s*s)/(ya*r*(1-r)),l=a?Math.atan2(o,s)*O_-120:NaN;return new Xr(l<0?l+360:l,a,r,t.opacity)}function $n(t,e,n,i){return arguments.length===1?LA(t):new Xr(t,e,n,i??1)}function Xr(t,e,n,i){this.h=+t,this.s=+e,this.l=+n,this.opacity=+i}Js(Xr,$n,xa(hr,{brighter(t){return t=t==null?Ks:Math.pow(Ks,t),new Xr(this.h,this.s,this.l*t,this.opacity)},darker(t){return t=t==null?$r:Math.pow($r,t),new Xr(this.h,this.s,this.l*t,this.opacity)},rgb(){var t=isNaN(this.h)?0:(this.h+120)*L_,e=+this.l,n=isNaN(this.s)?0:this.s*e*(1-e),i=Math.cos(t),r=Math.sin(t);return new Yt(255*(e+n*(G_*i+md*r)),255*(e+n*(gd*i+_h*r)),255*(e+n*(ya*i)),this.opacity)}}));function q_(t,e,n,i,r){var s=t*t,o=s*t;return((1-3*t+3*s-o)*e+(4-6*s+3*o)*n+(1+3*t+3*s-3*o)*i+o*r)/6}function OA(t){var e=t.length-1;return function(n){var i=n<=0?n=0:n>=1?(n=1,e-1):Math.floor(n*e),r=t[i],s=t[i+1],o=i>0?t[i-1]:2*r-s,a=i<e-1?t[i+2]:2*s-r;return q_((n-i/e)*e,o,r,s,a)}}function NA(t){var e=t.length;return function(n){var i=Math.floor(((n%=1)<0?++n:n)*e),r=t[(i+e-1)%e],s=t[i%e],o=t[(i+1)%e],a=t[(i+2)%e];return q_((n-i/e)*e,r,s,o,a)}}var vd=t=>()=>t;function X_(t,e){return function(n){return t+n*e}}function FA(t,e,n){return t=Math.pow(t,n),e=Math.pow(e,n)-t,n=1/n,function(i){return Math.pow(t+i*e,n)}}function yd(t,e){var n=e-t;return n?X_(t,n>180||n<-180?n-360*Math.round(n/360):n):vd(isNaN(t)?e:t)}function UA(t){return(t=+t)==1?xn:function(e,n){return n-e?FA(e,n,t):vd(isNaN(e)?n:e)}}function xn(t,e){var n=e-t;return n?X_(t,n):vd(isNaN(t)?e:t)}var iU=(function t(e){var n=UA(e);function i(r,s){var o=n((r=Yr(r)).r,(s=Yr(s)).r),a=n(r.g,s.g),l=n(r.b,s.b),c=xn(r.opacity,s.opacity);return function(h){return r.r=o(h),r.g=a(h),r.b=l(h),r.opacity=c(h),r+""}}return i.gamma=t,i})(1);function $_(t){return function(e){var n=e.length,i=new Array(n),r=new Array(n),s=new Array(n),o,a;for(o=0;o<n;++o)a=Yr(e[o]),i[o]=a.r||0,r[o]=a.g||0,s[o]=a.b||0;return i=t(i),r=t(r),s=t(s),a.opacity=1,function(l){return a.r=i(l),a.g=r(l),a.b=s(l),a+""}}}var Y_=$_(OA),rU=$_(NA);function Qs(t,e){return t=+t,e=+e,function(n){return t*(1-n)+e*n}}var zA=/[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g,sU=new RegExp(zA.source,"g");var W_=180/Math.PI,_d={translateX:0,translateY:0,rotate:0,skewX:0,scaleX:1,scaleY:1};function Z_(t,e,n,i,r,s){var o,a,l;return(o=Math.sqrt(t*t+e*e))&&(t/=o,e/=o),(l=t*n+e*i)&&(n-=t*l,i-=e*l),(a=Math.sqrt(n*n+i*i))&&(n/=a,i/=a,l/=a),t*i<e*n&&(t=-t,e=-e,l=-l,o=-o),{translateX:r,translateY:s,rotate:Math.atan2(e,t)*W_,skewX:Math.atan(l)*W_,scaleX:o,scaleY:a}}var vh;function kA(t){let e=new(typeof DOMMatrix=="function"?DOMMatrix:WebKitCSSMatrix)(t+"");return e.isIdentity?_d:Z_(e.a,e.b,e.c,e.d,e.e,e.f)}function BA(t){return t==null||(vh||(vh=document.createElementNS("http://www.w3.org/2000/svg","g")),vh.setAttribute("transform",t),!(t=vh.transform.baseVal.consolidate()))?_d:(t=t.matrix,Z_(t.a,t.b,t.c,t.d,t.e,t.f))}function K_(t,e,n,i){function r(c){return c.length?c.pop()+" ":""}function s(c,h,u,d,f,m){if(c!==u||h!==d){var _=f.push("translate(",null,e,null,n);m.push({i:_-4,x:Qs(c,u)},{i:_-2,x:Qs(h,d)})}else(u||d)&&f.push("translate("+u+e+d+n)}function o(c,h,u,d){c!==h?(c-h>180?h+=360:h-c>180&&(c+=360),d.push({i:u.push(r(u)+"rotate(",null,i)-2,x:Qs(c,h)})):h&&u.push(r(u)+"rotate("+h+i)}function a(c,h,u,d){c!==h?d.push({i:u.push(r(u)+"skewX(",null,i)-2,x:Qs(c,h)}):h&&u.push(r(u)+"skewX("+h+i)}function l(c,h,u,d,f,m){if(c!==u||h!==d){var _=f.push(r(f)+"scale(",null,",",null,")");m.push({i:_-4,x:Qs(c,u)},{i:_-2,x:Qs(h,d)})}else(u!==1||d!==1)&&f.push(r(f)+"scale("+u+","+d+")")}return function(c,h){var u=[],d=[];return c=t(c),h=t(h),s(c.translateX,c.translateY,h.translateX,h.translateY,u,d),o(c.rotate,h.rotate,u,d),a(c.skewX,h.skewX,u,d),l(c.scaleX,c.scaleY,h.scaleX,h.scaleY,u,d),c=h=null,function(f){for(var m=-1,_=d.length,g;++m<_;)u[(g=d[m]).i]=g.x(f);return u.join("")}}}var oU=K_(kA,"px, ","px)","deg)"),aU=K_(BA,", ",")",")"),VA=1e-12;function j_(t){return((t=Math.exp(t))+1/t)/2}function HA(t){return((t=Math.exp(t))-1/t)/2}function GA(t){return((t=Math.exp(2*t))-1)/(t+1)}var cU=(function t(e,n,i){function r(s,o){var a=s[0],l=s[1],c=s[2],h=o[0],u=o[1],d=o[2],f=h-a,m=u-l,_=f*f+m*m,g,p;if(_<VA)p=Math.log(d/c)/e,g=function(A){return[a+A*f,l+A*m,c*Math.exp(e*A*p)]};else{var x=Math.sqrt(_),y=(d*d-c*c+i*_)/(2*c*n*x),v=(d*d-c*c-i*_)/(2*d*n*x),M=Math.log(Math.sqrt(y*y+1)-y),b=Math.log(Math.sqrt(v*v+1)-v);p=(b-M)/e,g=function(A){var C=A*p,E=j_(M),w=c/(n*x)*(E*GA(e*C+M)-HA(M));return[a+w*f,l+w*m,c*E/j_(e*C+M)]}}return g.duration=Math.abs(p)*1e3*e/Math.SQRT2,g}return r.rho=function(s){var o=Math.max(.001,+s),a=o*o,l=a*a;return t(o,a,l)},r})(Math.SQRT2,2,4);function J_(t){return function(e,n){var i=t((e=mh(e)).h,(n=mh(n)).h),r=xn(e.s,n.s),s=xn(e.l,n.l),o=xn(e.opacity,n.opacity);return function(a){return e.h=i(a),e.s=r(a),e.l=s(a),e.opacity=o(a),e+""}}}var lU=J_(yd),hU=J_(xn);function Q_(t){return function(e,n){var i=t((e=gh(e)).h,(n=gh(n)).h),r=xn(e.c,n.c),s=xn(e.l,n.l),o=xn(e.opacity,n.opacity);return function(a){return e.h=i(a),e.c=r(a),e.l=s(a),e.opacity=o(a),e+""}}}var uU=Q_(yd),fU=Q_(xn);function ev(t){return(function e(n){n=+n;function i(r,s){var o=t((r=$n(r)).h,(s=$n(s)).h),a=xn(r.s,s.s),l=xn(r.l,s.l),c=xn(r.opacity,s.opacity);return function(h){return r.h=o(h),r.s=a(h),r.l=l(Math.pow(h,n)),r.opacity=c(h),r+""}}return i.gamma=e,i})(1)}var dU=ev(yd),yh=ev(xn);function WA(t,e){switch(arguments.length){case 0:break;case 1:this.range(t);break;default:this.range(e).domain(t);break}return this}var tv=Symbol("implicit");function xd(){var t=new ga,e=[],n=[],i=tv;function r(s){let o=t.get(s);if(o===void 0){if(i!==tv)return i;t.set(s,o=e.push(s)-1)}return n[o%n.length]}return r.domain=function(s){if(!arguments.length)return e.slice();e=[],t=new ga;for(let o of s)t.has(o)||t.set(o,e.push(o)-1);return r},r.range=function(s){return arguments.length?(n=Array.from(s),r):n.slice()},r.unknown=function(s){return arguments.length?(i=s,r):i},r.copy=function(){return xd(e,n).unknown(i)},WA.apply(r,arguments),r}function Qe(t){for(var e=t.length/6|0,n=new Array(e),i=0;i<e;)n[i]="#"+t.slice(i*6,++i*6);return n}var EU=Qe("1f77b4ff7f0e2ca02cd627289467bd8c564be377c27f7f7fbcbd2217becf"),TU=Qe("7fc97fbeaed4fdc086ffff99386cb0f0027fbf5b17666666"),AU=Qe("1b9e77d95f027570b3e7298a66a61ee6ab02a6761d666666"),CU=Qe("4269d0efb118ff725c6cc5b03ca951ff8ab7a463f297bbf59c6b4e9498a0"),nv=Qe("a6cee31f78b4b2df8a33a02cfb9a99e31a1cfdbf6fff7f00cab2d66a3d9affff99b15928"),RU=Qe("fbb4aeb3cde3ccebc5decbe4fed9a6ffffcce5d8bdfddaecf2f2f2"),PU=Qe("b3e2cdfdcdaccbd5e8f4cae4e6f5c9fff2aef1e2cccccccc"),IU=Qe("e41a1c377eb84daf4a984ea3ff7f00ffff33a65628f781bf999999"),DU=Qe("66c2a5fc8d628da0cbe78ac3a6d854ffd92fe5c494b3b3b3"),LU=Qe("8dd3c7ffffb3bebadafb807280b1d3fdb462b3de69fccde5d9d9d9bc80bdccebc5ffed6f"),OU=Qe("4e79a7f28e2ce1575976b7b259a14fedc949af7aa1ff9da79c755fbab0ab"),wt=t=>Y_(t[t.length-1]),jA=new Array(3).concat("d8b365f5f5f55ab4ac","a6611adfc27d80cdc1018571","a6611adfc27df5f5f580cdc1018571","8c510ad8b365f6e8c3c7eae55ab4ac01665e","8c510ad8b365f6e8c3f5f5f5c7eae55ab4ac01665e","8c510abf812ddfc27df6e8c3c7eae580cdc135978f01665e","8c510abf812ddfc27df6e8c3f5f5f5c7eae580cdc135978f01665e","5430058c510abf812ddfc27df6e8c3c7eae580cdc135978f01665e003c30","5430058c510abf812ddfc27df6e8c3f5f5f5c7eae580cdc135978f01665e003c30").map(Qe),NU=wt(jA),qA=new Array(3).concat("af8dc3f7f7f77fbf7b","7b3294c2a5cfa6dba0008837","7b3294c2a5cff7f7f7a6dba0008837","762a83af8dc3e7d4e8d9f0d37fbf7b1b7837","762a83af8dc3e7d4e8f7f7f7d9f0d37fbf7b1b7837","762a839970abc2a5cfe7d4e8d9f0d3a6dba05aae611b7837","762a839970abc2a5cfe7d4e8f7f7f7d9f0d3a6dba05aae611b7837","40004b762a839970abc2a5cfe7d4e8d9f0d3a6dba05aae611b783700441b","40004b762a839970abc2a5cfe7d4e8f7f7f7d9f0d3a6dba05aae611b783700441b").map(Qe),FU=wt(qA),XA=new Array(3).concat("e9a3c9f7f7f7a1d76a","d01c8bf1b6dab8e1864dac26","d01c8bf1b6daf7f7f7b8e1864dac26","c51b7de9a3c9fde0efe6f5d0a1d76a4d9221","c51b7de9a3c9fde0eff7f7f7e6f5d0a1d76a4d9221","c51b7dde77aef1b6dafde0efe6f5d0b8e1867fbc414d9221","c51b7dde77aef1b6dafde0eff7f7f7e6f5d0b8e1867fbc414d9221","8e0152c51b7dde77aef1b6dafde0efe6f5d0b8e1867fbc414d9221276419","8e0152c51b7dde77aef1b6dafde0eff7f7f7e6f5d0b8e1867fbc414d9221276419").map(Qe),UU=wt(XA),$A=new Array(3).concat("998ec3f7f7f7f1a340","5e3c99b2abd2fdb863e66101","5e3c99b2abd2f7f7f7fdb863e66101","542788998ec3d8daebfee0b6f1a340b35806","542788998ec3d8daebf7f7f7fee0b6f1a340b35806","5427888073acb2abd2d8daebfee0b6fdb863e08214b35806","5427888073acb2abd2d8daebf7f7f7fee0b6fdb863e08214b35806","2d004b5427888073acb2abd2d8daebfee0b6fdb863e08214b358067f3b08","2d004b5427888073acb2abd2d8daebf7f7f7fee0b6fdb863e08214b358067f3b08").map(Qe),zU=wt($A),YA=new Array(3).concat("ef8a62f7f7f767a9cf","ca0020f4a58292c5de0571b0","ca0020f4a582f7f7f792c5de0571b0","b2182bef8a62fddbc7d1e5f067a9cf2166ac","b2182bef8a62fddbc7f7f7f7d1e5f067a9cf2166ac","b2182bd6604df4a582fddbc7d1e5f092c5de4393c32166ac","b2182bd6604df4a582fddbc7f7f7f7d1e5f092c5de4393c32166ac","67001fb2182bd6604df4a582fddbc7d1e5f092c5de4393c32166ac053061","67001fb2182bd6604df4a582fddbc7f7f7f7d1e5f092c5de4393c32166ac053061").map(Qe),kU=wt(YA),ZA=new Array(3).concat("ef8a62ffffff999999","ca0020f4a582bababa404040","ca0020f4a582ffffffbababa404040","b2182bef8a62fddbc7e0e0e09999994d4d4d","b2182bef8a62fddbc7ffffffe0e0e09999994d4d4d","b2182bd6604df4a582fddbc7e0e0e0bababa8787874d4d4d","b2182bd6604df4a582fddbc7ffffffe0e0e0bababa8787874d4d4d","67001fb2182bd6604df4a582fddbc7e0e0e0bababa8787874d4d4d1a1a1a","67001fb2182bd6604df4a582fddbc7ffffffe0e0e0bababa8787874d4d4d1a1a1a").map(Qe),BU=wt(ZA),KA=new Array(3).concat("fc8d59ffffbf91bfdb","d7191cfdae61abd9e92c7bb6","d7191cfdae61ffffbfabd9e92c7bb6","d73027fc8d59fee090e0f3f891bfdb4575b4","d73027fc8d59fee090ffffbfe0f3f891bfdb4575b4","d73027f46d43fdae61fee090e0f3f8abd9e974add14575b4","d73027f46d43fdae61fee090ffffbfe0f3f8abd9e974add14575b4","a50026d73027f46d43fdae61fee090e0f3f8abd9e974add14575b4313695","a50026d73027f46d43fdae61fee090ffffbfe0f3f8abd9e974add14575b4313695").map(Qe),VU=wt(KA),JA=new Array(3).concat("fc8d59ffffbf91cf60","d7191cfdae61a6d96a1a9641","d7191cfdae61ffffbfa6d96a1a9641","d73027fc8d59fee08bd9ef8b91cf601a9850","d73027fc8d59fee08bffffbfd9ef8b91cf601a9850","d73027f46d43fdae61fee08bd9ef8ba6d96a66bd631a9850","d73027f46d43fdae61fee08bffffbfd9ef8ba6d96a66bd631a9850","a50026d73027f46d43fdae61fee08bd9ef8ba6d96a66bd631a9850006837","a50026d73027f46d43fdae61fee08bffffbfd9ef8ba6d96a66bd631a9850006837").map(Qe),HU=wt(JA),QA=new Array(3).concat("fc8d59ffffbf99d594","d7191cfdae61abdda42b83ba","d7191cfdae61ffffbfabdda42b83ba","d53e4ffc8d59fee08be6f59899d5943288bd","d53e4ffc8d59fee08bffffbfe6f59899d5943288bd","d53e4ff46d43fdae61fee08be6f598abdda466c2a53288bd","d53e4ff46d43fdae61fee08bffffbfe6f598abdda466c2a53288bd","9e0142d53e4ff46d43fdae61fee08be6f598abdda466c2a53288bd5e4fa2","9e0142d53e4ff46d43fdae61fee08bffffbfe6f598abdda466c2a53288bd5e4fa2").map(Qe),GU=wt(QA),e2=new Array(3).concat("e5f5f999d8c92ca25f","edf8fbb2e2e266c2a4238b45","edf8fbb2e2e266c2a42ca25f006d2c","edf8fbccece699d8c966c2a42ca25f006d2c","edf8fbccece699d8c966c2a441ae76238b45005824","f7fcfde5f5f9ccece699d8c966c2a441ae76238b45005824","f7fcfde5f5f9ccece699d8c966c2a441ae76238b45006d2c00441b").map(Qe),WU=wt(e2),t2=new Array(3).concat("e0ecf49ebcda8856a7","edf8fbb3cde38c96c688419d","edf8fbb3cde38c96c68856a7810f7c","edf8fbbfd3e69ebcda8c96c68856a7810f7c","edf8fbbfd3e69ebcda8c96c68c6bb188419d6e016b","f7fcfde0ecf4bfd3e69ebcda8c96c68c6bb188419d6e016b","f7fcfde0ecf4bfd3e69ebcda8c96c68c6bb188419d810f7c4d004b").map(Qe),jU=wt(t2),n2=new Array(3).concat("e0f3dba8ddb543a2ca","f0f9e8bae4bc7bccc42b8cbe","f0f9e8bae4bc7bccc443a2ca0868ac","f0f9e8ccebc5a8ddb57bccc443a2ca0868ac","f0f9e8ccebc5a8ddb57bccc44eb3d32b8cbe08589e","f7fcf0e0f3dbccebc5a8ddb57bccc44eb3d32b8cbe08589e","f7fcf0e0f3dbccebc5a8ddb57bccc44eb3d32b8cbe0868ac084081").map(Qe),qU=wt(n2),i2=new Array(3).concat("fee8c8fdbb84e34a33","fef0d9fdcc8afc8d59d7301f","fef0d9fdcc8afc8d59e34a33b30000","fef0d9fdd49efdbb84fc8d59e34a33b30000","fef0d9fdd49efdbb84fc8d59ef6548d7301f990000","fff7ecfee8c8fdd49efdbb84fc8d59ef6548d7301f990000","fff7ecfee8c8fdd49efdbb84fc8d59ef6548d7301fb300007f0000").map(Qe),XU=wt(i2),r2=new Array(3).concat("ece2f0a6bddb1c9099","f6eff7bdc9e167a9cf02818a","f6eff7bdc9e167a9cf1c9099016c59","f6eff7d0d1e6a6bddb67a9cf1c9099016c59","f6eff7d0d1e6a6bddb67a9cf3690c002818a016450","fff7fbece2f0d0d1e6a6bddb67a9cf3690c002818a016450","fff7fbece2f0d0d1e6a6bddb67a9cf3690c002818a016c59014636").map(Qe),$U=wt(r2),s2=new Array(3).concat("ece7f2a6bddb2b8cbe","f1eef6bdc9e174a9cf0570b0","f1eef6bdc9e174a9cf2b8cbe045a8d","f1eef6d0d1e6a6bddb74a9cf2b8cbe045a8d","f1eef6d0d1e6a6bddb74a9cf3690c00570b0034e7b","fff7fbece7f2d0d1e6a6bddb74a9cf3690c00570b0034e7b","fff7fbece7f2d0d1e6a6bddb74a9cf3690c00570b0045a8d023858").map(Qe),YU=wt(s2),o2=new Array(3).concat("e7e1efc994c7dd1c77","f1eef6d7b5d8df65b0ce1256","f1eef6d7b5d8df65b0dd1c77980043","f1eef6d4b9dac994c7df65b0dd1c77980043","f1eef6d4b9dac994c7df65b0e7298ace125691003f","f7f4f9e7e1efd4b9dac994c7df65b0e7298ace125691003f","f7f4f9e7e1efd4b9dac994c7df65b0e7298ace125698004367001f").map(Qe),ZU=wt(o2),a2=new Array(3).concat("fde0ddfa9fb5c51b8a","feebe2fbb4b9f768a1ae017e","feebe2fbb4b9f768a1c51b8a7a0177","feebe2fcc5c0fa9fb5f768a1c51b8a7a0177","feebe2fcc5c0fa9fb5f768a1dd3497ae017e7a0177","fff7f3fde0ddfcc5c0fa9fb5f768a1dd3497ae017e7a0177","fff7f3fde0ddfcc5c0fa9fb5f768a1dd3497ae017e7a017749006a").map(Qe),KU=wt(a2),c2=new Array(3).concat("edf8b17fcdbb2c7fb8","ffffcca1dab441b6c4225ea8","ffffcca1dab441b6c42c7fb8253494","ffffccc7e9b47fcdbb41b6c42c7fb8253494","ffffccc7e9b47fcdbb41b6c41d91c0225ea80c2c84","ffffd9edf8b1c7e9b47fcdbb41b6c41d91c0225ea80c2c84","ffffd9edf8b1c7e9b47fcdbb41b6c41d91c0225ea8253494081d58").map(Qe),JU=wt(c2),l2=new Array(3).concat("f7fcb9addd8e31a354","ffffccc2e69978c679238443","ffffccc2e69978c67931a354006837","ffffccd9f0a3addd8e78c67931a354006837","ffffccd9f0a3addd8e78c67941ab5d238443005a32","ffffe5f7fcb9d9f0a3addd8e78c67941ab5d238443005a32","ffffe5f7fcb9d9f0a3addd8e78c67941ab5d238443006837004529").map(Qe),QU=wt(l2),h2=new Array(3).concat("fff7bcfec44fd95f0e","ffffd4fed98efe9929cc4c02","ffffd4fed98efe9929d95f0e993404","ffffd4fee391fec44ffe9929d95f0e993404","ffffd4fee391fec44ffe9929ec7014cc4c028c2d04","ffffe5fff7bcfee391fec44ffe9929ec7014cc4c028c2d04","ffffe5fff7bcfee391fec44ffe9929ec7014cc4c02993404662506").map(Qe),e5=wt(h2),u2=new Array(3).concat("ffeda0feb24cf03b20","ffffb2fecc5cfd8d3ce31a1c","ffffb2fecc5cfd8d3cf03b20bd0026","ffffb2fed976feb24cfd8d3cf03b20bd0026","ffffb2fed976feb24cfd8d3cfc4e2ae31a1cb10026","ffffccffeda0fed976feb24cfd8d3cfc4e2ae31a1cb10026","ffffccffeda0fed976feb24cfd8d3cfc4e2ae31a1cbd0026800026").map(Qe),t5=wt(u2),f2=new Array(3).concat("deebf79ecae13182bd","eff3ffbdd7e76baed62171b5","eff3ffbdd7e76baed63182bd08519c","eff3ffc6dbef9ecae16baed63182bd08519c","eff3ffc6dbef9ecae16baed64292c62171b5084594","f7fbffdeebf7c6dbef9ecae16baed64292c62171b5084594","f7fbffdeebf7c6dbef9ecae16baed64292c62171b508519c08306b").map(Qe),n5=wt(f2),d2=new Array(3).concat("e5f5e0a1d99b31a354","edf8e9bae4b374c476238b45","edf8e9bae4b374c47631a354006d2c","edf8e9c7e9c0a1d99b74c47631a354006d2c","edf8e9c7e9c0a1d99b74c47641ab5d238b45005a32","f7fcf5e5f5e0c7e9c0a1d99b74c47641ab5d238b45005a32","f7fcf5e5f5e0c7e9c0a1d99b74c47641ab5d238b45006d2c00441b").map(Qe),i5=wt(d2),p2=new Array(3).concat("f0f0f0bdbdbd636363","f7f7f7cccccc969696525252","f7f7f7cccccc969696636363252525","f7f7f7d9d9d9bdbdbd969696636363252525","f7f7f7d9d9d9bdbdbd969696737373525252252525","fffffff0f0f0d9d9d9bdbdbd969696737373525252252525","fffffff0f0f0d9d9d9bdbdbd969696737373525252252525000000").map(Qe),r5=wt(p2),m2=new Array(3).concat("efedf5bcbddc756bb1","f2f0f7cbc9e29e9ac86a51a3","f2f0f7cbc9e29e9ac8756bb154278f","f2f0f7dadaebbcbddc9e9ac8756bb154278f","f2f0f7dadaebbcbddc9e9ac8807dba6a51a34a1486","fcfbfdefedf5dadaebbcbddc9e9ac8807dba6a51a34a1486","fcfbfdefedf5dadaebbcbddc9e9ac8807dba6a51a354278f3f007d").map(Qe),s5=wt(m2),g2=new Array(3).concat("fee0d2fc9272de2d26","fee5d9fcae91fb6a4acb181d","fee5d9fcae91fb6a4ade2d26a50f15","fee5d9fcbba1fc9272fb6a4ade2d26a50f15","fee5d9fcbba1fc9272fb6a4aef3b2ccb181d99000d","fff5f0fee0d2fcbba1fc9272fb6a4aef3b2ccb181d99000d","fff5f0fee0d2fcbba1fc9272fb6a4aef3b2ccb181da50f1567000d").map(Qe),o5=wt(g2),_2=new Array(3).concat("fee6cefdae6be6550d","feeddefdbe85fd8d3cd94701","feeddefdbe85fd8d3ce6550da63603","feeddefdd0a2fdae6bfd8d3ce6550da63603","feeddefdd0a2fdae6bfd8d3cf16913d948018c2d04","fff5ebfee6cefdd0a2fdae6bfd8d3cf16913d948018c2d04","fff5ebfee6cefdd0a2fdae6bfd8d3cf16913d94801a636037f2704").map(Qe),a5=wt(_2);var c5=yh($n(300,.5,0),$n(-240,.5,1)),l5=yh($n(-100,.75,.35),$n(80,1.5,.8)),h5=yh($n(260,.75,.35),$n(80,1.5,.8)),u5=$n();var f5=Yr(),d5=Math.PI/3,p5=Math.PI*2/3;function xh(t){var e=t.length;return function(n){return t[Math.max(0,Math.min(e-1,Math.floor(n*e)))]}}var m5=xh(Qe("44015444025645045745055946075a46085c460a5d460b5e470d60470e6147106347116447136548146748166848176948186a481a6c481b6d481c6e481d6f481f70482071482173482374482475482576482677482878482979472a7a472c7a472d7b472e7c472f7d46307e46327e46337f463480453581453781453882443983443a83443b84433d84433e85423f854240864241864142874144874045884046883f47883f48893e49893e4a893e4c8a3d4d8a3d4e8a3c4f8a3c508b3b518b3b528b3a538b3a548c39558c39568c38588c38598c375a8c375b8d365c8d365d8d355e8d355f8d34608d34618d33628d33638d32648e32658e31668e31678e31688e30698e306a8e2f6b8e2f6c8e2e6d8e2e6e8e2e6f8e2d708e2d718e2c718e2c728e2c738e2b748e2b758e2a768e2a778e2a788e29798e297a8e297b8e287c8e287d8e277e8e277f8e27808e26818e26828e26828e25838e25848e25858e24868e24878e23888e23898e238a8d228b8d228c8d228d8d218e8d218f8d21908d21918c20928c20928c20938c1f948c1f958b1f968b1f978b1f988b1f998a1f9a8a1e9b8a1e9c891e9d891f9e891f9f881fa0881fa1881fa1871fa28720a38620a48621a58521a68522a78522a88423a98324aa8325ab8225ac8226ad8127ad8128ae8029af7f2ab07f2cb17e2db27d2eb37c2fb47c31b57b32b67a34b67935b77937b87838b9773aba763bbb753dbc743fbc7340bd7242be7144bf7046c06f48c16e4ac16d4cc26c4ec36b50c46a52c56954c56856c66758c7655ac8645cc8635ec96260ca6063cb5f65cb5e67cc5c69cd5b6ccd5a6ece5870cf5773d05675d05477d1537ad1517cd2507fd34e81d34d84d44b86d54989d5488bd6468ed64590d74393d74195d84098d83e9bd93c9dd93ba0da39a2da37a5db36a8db34aadc32addc30b0dd2fb2dd2db5de2bb8de29bade28bddf26c0df25c2df23c5e021c8e020cae11fcde11dd0e11cd2e21bd5e21ad8e219dae319dde318dfe318e2e418e5e419e7e419eae51aece51befe51cf1e51df4e61ef6e620f8e621fbe723fde725")),g5=xh(Qe("00000401000501010601010802010902020b02020d03030f03031204041405041606051806051a07061c08071e0907200a08220b09240c09260d0a290e0b2b100b2d110c2f120d31130d34140e36150e38160f3b180f3d19103f1a10421c10441d11471e114920114b21114e22115024125325125527125829115a2a115c2c115f2d11612f116331116533106734106936106b38106c390f6e3b0f703d0f713f0f72400f74420f75440f764510774710784910784a10794c117a4e117b4f127b51127c52137c54137d56147d57157e59157e5a167e5c167f5d177f5f187f601880621980641a80651a80671b80681c816a1c816b1d816d1d816e1e81701f81721f817320817521817621817822817922827b23827c23827e24828025828125818326818426818627818827818928818b29818c29818e2a81902a81912b81932b80942c80962c80982d80992d809b2e7f9c2e7f9e2f7fa02f7fa1307ea3307ea5317ea6317da8327daa337dab337cad347cae347bb0357bb2357bb3367ab5367ab73779b83779ba3878bc3978bd3977bf3a77c03a76c23b75c43c75c53c74c73d73c83e73ca3e72cc3f71cd4071cf4070d0416fd2426fd3436ed5446dd6456cd8456cd9466bdb476adc4869de4968df4a68e04c67e24d66e34e65e44f64e55064e75263e85362e95462ea5661eb5760ec5860ed5a5fee5b5eef5d5ef05f5ef1605df2625df2645cf3655cf4675cf4695cf56b5cf66c5cf66e5cf7705cf7725cf8745cf8765cf9785df9795df97b5dfa7d5efa7f5efa815ffb835ffb8560fb8761fc8961fc8a62fc8c63fc8e64fc9065fd9266fd9467fd9668fd9869fd9a6afd9b6bfe9d6cfe9f6dfea16efea36ffea571fea772fea973feaa74feac76feae77feb078feb27afeb47bfeb67cfeb77efeb97ffebb81febd82febf84fec185fec287fec488fec68afec88cfeca8dfecc8ffecd90fecf92fed194fed395fed597fed799fed89afdda9cfddc9efddea0fde0a1fde2a3fde3a5fde5a7fde7a9fde9aafdebacfcecaefceeb0fcf0b2fcf2b4fcf4b6fcf6b8fcf7b9fcf9bbfcfbbdfcfdbf")),_5=xh(Qe("00000401000501010601010802010a02020c02020e03021004031204031405041706041907051b08051d09061f0a07220b07240c08260d08290e092b10092d110a30120a32140b34150b37160b39180c3c190c3e1b0c411c0c431e0c451f0c48210c4a230c4c240c4f260c51280b53290b552b0b572d0b592f0a5b310a5c320a5e340a5f3609613809623909633b09643d09653e0966400a67420a68440a68450a69470b6a490b6a4a0c6b4c0c6b4d0d6c4f0d6c510e6c520e6d540f6d550f6d57106e59106e5a116e5c126e5d126e5f136e61136e62146e64156e65156e67166e69166e6a176e6c186e6d186e6f196e71196e721a6e741a6e751b6e771c6d781c6d7a1d6d7c1d6d7d1e6d7f1e6c801f6c82206c84206b85216b87216b88226a8a226a8c23698d23698f24699025689225689326679526679727669827669a28659b29649d29649f2a63a02a63a22b62a32c61a52c60a62d60a82e5fa92e5eab2f5ead305dae305cb0315bb1325ab3325ab43359b63458b73557b93556ba3655bc3754bd3853bf3952c03a51c13a50c33b4fc43c4ec63d4dc73e4cc83f4bca404acb4149cc4248ce4347cf4446d04545d24644d34743d44842d54a41d74b3fd84c3ed94d3dda4e3cdb503bdd513ade5238df5337e05536e15635e25734e35933e45a31e55c30e65d2fe75e2ee8602de9612bea632aeb6429eb6628ec6726ed6925ee6a24ef6c23ef6e21f06f20f1711ff1731df2741cf3761bf37819f47918f57b17f57d15f67e14f68013f78212f78410f8850ff8870ef8890cf98b0bf98c0af98e09fa9008fa9207fa9407fb9606fb9706fb9906fb9b06fb9d07fc9f07fca108fca309fca50afca60cfca80dfcaa0ffcac11fcae12fcb014fcb216fcb418fbb61afbb81dfbba1ffbbc21fbbe23fac026fac228fac42afac62df9c72ff9c932f9cb35f8cd37f8cf3af7d13df7d340f6d543f6d746f5d949f5db4cf4dd4ff4df53f4e156f3e35af3e55df2e661f2e865f2ea69f1ec6df1ed71f1ef75f1f179f2f27df2f482f3f586f3f68af4f88ef5f992f6fa96f8fb9af9fc9dfafda1fcffa4")),v5=xh(Qe("0d088710078813078916078a19068c1b068d1d068e20068f2206902406912605912805922a05932c05942e05952f059631059733059735049837049938049a3a049a3c049b3e049c3f049c41049d43039e44039e46039f48039f4903a04b03a14c02a14e02a25002a25102a35302a35502a45601a45801a45901a55b01a55c01a65e01a66001a66100a76300a76400a76600a76700a86900a86a00a86c00a86e00a86f00a87100a87201a87401a87501a87701a87801a87a02a87b02a87d03a87e03a88004a88104a78305a78405a78606a68707a68808a68a09a58b0aa58d0ba58e0ca48f0da4910ea3920fa39410a29511a19613a19814a099159f9a169f9c179e9d189d9e199da01a9ca11b9ba21d9aa31e9aa51f99a62098a72197a82296aa2395ab2494ac2694ad2793ae2892b02991b12a90b22b8fb32c8eb42e8db52f8cb6308bb7318ab83289ba3388bb3488bc3587bd3786be3885bf3984c03a83c13b82c23c81c33d80c43e7fc5407ec6417dc7427cc8437bc9447aca457acb4679cc4778cc4977cd4a76ce4b75cf4c74d04d73d14e72d24f71d35171d45270d5536fd5546ed6556dd7566cd8576bd9586ada5a6ada5b69db5c68dc5d67dd5e66de5f65de6164df6263e06363e16462e26561e26660e3685fe4695ee56a5de56b5de66c5ce76e5be76f5ae87059e97158e97257ea7457eb7556eb7655ec7754ed7953ed7a52ee7b51ef7c51ef7e50f07f4ff0804ef1814df1834cf2844bf3854bf3874af48849f48948f58b47f58c46f68d45f68f44f79044f79143f79342f89441f89540f9973ff9983ef99a3efa9b3dfa9c3cfa9e3bfb9f3afba139fba238fca338fca537fca636fca835fca934fdab33fdac33fdae32fdaf31fdb130fdb22ffdb42ffdb52efeb72dfeb82cfeba2cfebb2bfebd2afebe2afec029fdc229fdc328fdc527fdc627fdc827fdca26fdcb26fccd25fcce25fcd025fcd225fbd324fbd524fbd724fad824fada24f9dc24f9dd25f8df25f8e125f7e225f7e425f6e626f6e826f5e926f5eb27f4ed27f3ee27f3f027f2f227f1f426f1f525f0f724f0f921"));function bh(t){"@babel/helpers - typeof";return bh=typeof Symbol=="function"&&typeof Symbol.iterator=="symbol"?function(e){return typeof e}:function(e){return e&&typeof Symbol=="function"&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e},bh(t)}var v2=/^\s+/,y2=/\s+$/;function De(t,e){if(t=t||"",e=e||{},t instanceof De)return t;if(!(this instanceof De))return new De(t,e);var n=x2(t);this._originalInput=t,this._r=n.r,this._g=n.g,this._b=n.b,this._a=n.a,this._roundA=Math.round(100*this._a)/100,this._format=e.format||n.format,this._gradientType=e.gradientType,this._r<1&&(this._r=Math.round(this._r)),this._g<1&&(this._g=Math.round(this._g)),this._b<1&&(this._b=Math.round(this._b)),this._ok=n.ok}De.prototype={isDark:function(){return this.getBrightness()<128},isLight:function(){return!this.isDark()},isValid:function(){return this._ok},getOriginalInput:function(){return this._originalInput},getFormat:function(){return this._format},getAlpha:function(){return this._a},getBrightness:function(){var e=this.toRgb();return(e.r*299+e.g*587+e.b*114)/1e3},getLuminance:function(){var e=this.toRgb(),n,i,r,s,o,a;return n=e.r/255,i=e.g/255,r=e.b/255,n<=.03928?s=n/12.92:s=Math.pow((n+.055)/1.055,2.4),i<=.03928?o=i/12.92:o=Math.pow((i+.055)/1.055,2.4),r<=.03928?a=r/12.92:a=Math.pow((r+.055)/1.055,2.4),.2126*s+.7152*o+.0722*a},setAlpha:function(e){return this._a=lv(e),this._roundA=Math.round(100*this._a)/100,this},toHsv:function(){var e=rv(this._r,this._g,this._b);return{h:e.h*360,s:e.s,v:e.v,a:this._a}},toHsvString:function(){var e=rv(this._r,this._g,this._b),n=Math.round(e.h*360),i=Math.round(e.s*100),r=Math.round(e.v*100);return this._a==1?"hsv("+n+", "+i+"%, "+r+"%)":"hsva("+n+", "+i+"%, "+r+"%, "+this._roundA+")"},toHsl:function(){var e=iv(this._r,this._g,this._b);return{h:e.h*360,s:e.s,l:e.l,a:this._a}},toHslString:function(){var e=iv(this._r,this._g,this._b),n=Math.round(e.h*360),i=Math.round(e.s*100),r=Math.round(e.l*100);return this._a==1?"hsl("+n+", "+i+"%, "+r+"%)":"hsla("+n+", "+i+"%, "+r+"%, "+this._roundA+")"},toHex:function(e){return sv(this._r,this._g,this._b,e)},toHexString:function(e){return"#"+this.toHex(e)},toHex8:function(e){return w2(this._r,this._g,this._b,this._a,e)},toHex8String:function(e){return"#"+this.toHex8(e)},toRgb:function(){return{r:Math.round(this._r),g:Math.round(this._g),b:Math.round(this._b),a:this._a}},toRgbString:function(){return this._a==1?"rgb("+Math.round(this._r)+", "+Math.round(this._g)+", "+Math.round(this._b)+")":"rgba("+Math.round(this._r)+", "+Math.round(this._g)+", "+Math.round(this._b)+", "+this._roundA+")"},toPercentageRgb:function(){return{r:Math.round(Dt(this._r,255)*100)+"%",g:Math.round(Dt(this._g,255)*100)+"%",b:Math.round(Dt(this._b,255)*100)+"%",a:this._a}},toPercentageRgbString:function(){return this._a==1?"rgb("+Math.round(Dt(this._r,255)*100)+"%, "+Math.round(Dt(this._g,255)*100)+"%, "+Math.round(Dt(this._b,255)*100)+"%)":"rgba("+Math.round(Dt(this._r,255)*100)+"%, "+Math.round(Dt(this._g,255)*100)+"%, "+Math.round(Dt(this._b,255)*100)+"%, "+this._roundA+")"},toName:function(){return this._a===0?"transparent":this._a<1?!1:F2[sv(this._r,this._g,this._b,!0)]||!1},toFilter:function(e){var n="#"+ov(this._r,this._g,this._b,this._a),i=n,r=this._gradientType?"GradientType = 1, ":"";if(e){var s=De(e);i="#"+ov(s._r,s._g,s._b,s._a)}return"progid:DXImageTransform.Microsoft.gradient("+r+"startColorstr="+n+",endColorstr="+i+")"},toString:function(e){var n=!!e;e=e||this._format;var i=!1,r=this._a<1&&this._a>=0,s=!n&&r&&(e==="hex"||e==="hex6"||e==="hex3"||e==="hex4"||e==="hex8"||e==="name");return s?e==="name"&&this._a===0?this.toName():this.toRgbString():(e==="rgb"&&(i=this.toRgbString()),e==="prgb"&&(i=this.toPercentageRgbString()),(e==="hex"||e==="hex6")&&(i=this.toHexString()),e==="hex3"&&(i=this.toHexString(!0)),e==="hex4"&&(i=this.toHex8String(!0)),e==="hex8"&&(i=this.toHex8String()),e==="name"&&(i=this.toName()),e==="hsl"&&(i=this.toHslString()),e==="hsv"&&(i=this.toHsvString()),i||this.toHexString())},clone:function(){return De(this.toString())},_applyModification:function(e,n){var i=e.apply(null,[this].concat([].slice.call(n)));return this._r=i._r,this._g=i._g,this._b=i._b,this.setAlpha(i._a),this},lighten:function(){return this._applyModification(C2,arguments)},brighten:function(){return this._applyModification(R2,arguments)},darken:function(){return this._applyModification(P2,arguments)},desaturate:function(){return this._applyModification(E2,arguments)},saturate:function(){return this._applyModification(T2,arguments)},greyscale:function(){return this._applyModification(A2,arguments)},spin:function(){return this._applyModification(I2,arguments)},_applyCombination:function(e,n){return e.apply(null,[this].concat([].slice.call(n)))},analogous:function(){return this._applyCombination(O2,arguments)},complement:function(){return this._applyCombination(D2,arguments)},monochromatic:function(){return this._applyCombination(N2,arguments)},splitcomplement:function(){return this._applyCombination(L2,arguments)},triad:function(){return this._applyCombination(av,[3])},tetrad:function(){return this._applyCombination(av,[4])}};De.fromRatio=function(t,e){if(bh(t)=="object"){var n={};for(var i in t)t.hasOwnProperty(i)&&(i==="a"?n[i]=t[i]:n[i]=ba(t[i]));t=n}return De(t,e)};function x2(t){var e={r:0,g:0,b:0},n=1,i=null,r=null,s=null,o=!1,a=!1;return typeof t=="string"&&(t=B2(t)),bh(t)=="object"&&(Wi(t.r)&&Wi(t.g)&&Wi(t.b)?(e=b2(t.r,t.g,t.b),o=!0,a=String(t.r).substr(-1)==="%"?"prgb":"rgb"):Wi(t.h)&&Wi(t.s)&&Wi(t.v)?(i=ba(t.s),r=ba(t.v),e=S2(t.h,i,r),o=!0,a="hsv"):Wi(t.h)&&Wi(t.s)&&Wi(t.l)&&(i=ba(t.s),s=ba(t.l),e=M2(t.h,i,s),o=!0,a="hsl"),t.hasOwnProperty("a")&&(n=t.a)),n=lv(n),{ok:o,format:t.format||a,r:Math.min(255,Math.max(e.r,0)),g:Math.min(255,Math.max(e.g,0)),b:Math.min(255,Math.max(e.b,0)),a:n}}function b2(t,e,n){return{r:Dt(t,255)*255,g:Dt(e,255)*255,b:Dt(n,255)*255}}function iv(t,e,n){t=Dt(t,255),e=Dt(e,255),n=Dt(n,255);var i=Math.max(t,e,n),r=Math.min(t,e,n),s,o,a=(i+r)/2;if(i==r)s=o=0;else{var l=i-r;switch(o=a>.5?l/(2-i-r):l/(i+r),i){case t:s=(e-n)/l+(e<n?6:0);break;case e:s=(n-t)/l+2;break;case n:s=(t-e)/l+4;break}s/=6}return{h:s,s:o,l:a}}function M2(t,e,n){var i,r,s;t=Dt(t,360),e=Dt(e,100),n=Dt(n,100);function o(c,h,u){return u<0&&(u+=1),u>1&&(u-=1),u<1/6?c+(h-c)*6*u:u<1/2?h:u<2/3?c+(h-c)*(2/3-u)*6:c}if(e===0)i=r=s=n;else{var a=n<.5?n*(1+e):n+e-n*e,l=2*n-a;i=o(l,a,t+1/3),r=o(l,a,t),s=o(l,a,t-1/3)}return{r:i*255,g:r*255,b:s*255}}function rv(t,e,n){t=Dt(t,255),e=Dt(e,255),n=Dt(n,255);var i=Math.max(t,e,n),r=Math.min(t,e,n),s,o,a=i,l=i-r;if(o=i===0?0:l/i,i==r)s=0;else{switch(i){case t:s=(e-n)/l+(e<n?6:0);break;case e:s=(n-t)/l+2;break;case n:s=(t-e)/l+4;break}s/=6}return{h:s,s:o,v:a}}function S2(t,e,n){t=Dt(t,360)*6,e=Dt(e,100),n=Dt(n,100);var i=Math.floor(t),r=t-i,s=n*(1-e),o=n*(1-r*e),a=n*(1-(1-r)*e),l=i%6,c=[n,o,s,s,a,n][l],h=[a,n,n,o,s,s][l],u=[s,s,a,n,n,o][l];return{r:c*255,g:h*255,b:u*255}}function sv(t,e,n,i){var r=[ci(Math.round(t).toString(16)),ci(Math.round(e).toString(16)),ci(Math.round(n).toString(16))];return i&&r[0].charAt(0)==r[0].charAt(1)&&r[1].charAt(0)==r[1].charAt(1)&&r[2].charAt(0)==r[2].charAt(1)?r[0].charAt(0)+r[1].charAt(0)+r[2].charAt(0):r.join("")}function w2(t,e,n,i,r){var s=[ci(Math.round(t).toString(16)),ci(Math.round(e).toString(16)),ci(Math.round(n).toString(16)),ci(hv(i))];return r&&s[0].charAt(0)==s[0].charAt(1)&&s[1].charAt(0)==s[1].charAt(1)&&s[2].charAt(0)==s[2].charAt(1)&&s[3].charAt(0)==s[3].charAt(1)?s[0].charAt(0)+s[1].charAt(0)+s[2].charAt(0)+s[3].charAt(0):s.join("")}function ov(t,e,n,i){var r=[ci(hv(i)),ci(Math.round(t).toString(16)),ci(Math.round(e).toString(16)),ci(Math.round(n).toString(16))];return r.join("")}De.equals=function(t,e){return!t||!e?!1:De(t).toRgbString()==De(e).toRgbString()};De.random=function(){return De.fromRatio({r:Math.random(),g:Math.random(),b:Math.random()})};function E2(t,e){e=e===0?0:e||10;var n=De(t).toHsl();return n.s-=e/100,n.s=Mh(n.s),De(n)}function T2(t,e){e=e===0?0:e||10;var n=De(t).toHsl();return n.s+=e/100,n.s=Mh(n.s),De(n)}function A2(t){return De(t).desaturate(100)}function C2(t,e){e=e===0?0:e||10;var n=De(t).toHsl();return n.l+=e/100,n.l=Mh(n.l),De(n)}function R2(t,e){e=e===0?0:e||10;var n=De(t).toRgb();return n.r=Math.max(0,Math.min(255,n.r-Math.round(255*-(e/100)))),n.g=Math.max(0,Math.min(255,n.g-Math.round(255*-(e/100)))),n.b=Math.max(0,Math.min(255,n.b-Math.round(255*-(e/100)))),De(n)}function P2(t,e){e=e===0?0:e||10;var n=De(t).toHsl();return n.l-=e/100,n.l=Mh(n.l),De(n)}function I2(t,e){var n=De(t).toHsl(),i=(n.h+e)%360;return n.h=i<0?360+i:i,De(n)}function D2(t){var e=De(t).toHsl();return e.h=(e.h+180)%360,De(e)}function av(t,e){if(isNaN(e)||e<=0)throw new Error("Argument to polyad must be a positive number");for(var n=De(t).toHsl(),i=[De(t)],r=360/e,s=1;s<e;s++)i.push(De({h:(n.h+s*r)%360,s:n.s,l:n.l}));return i}function L2(t){var e=De(t).toHsl(),n=e.h;return[De(t),De({h:(n+72)%360,s:e.s,l:e.l}),De({h:(n+216)%360,s:e.s,l:e.l})]}function O2(t,e,n){e=e||6,n=n||30;var i=De(t).toHsl(),r=360/n,s=[De(t)];for(i.h=(i.h-(r*e>>1)+720)%360;--e;)i.h=(i.h+r)%360,s.push(De(i));return s}function N2(t,e){e=e||6;for(var n=De(t).toHsv(),i=n.h,r=n.s,s=n.v,o=[],a=1/e;e--;)o.push(De({h:i,s:r,v:s})),s=(s+a)%1;return o}De.mix=function(t,e,n){n=n===0?0:n||50;var i=De(t).toRgb(),r=De(e).toRgb(),s=n/100,o={r:(r.r-i.r)*s+i.r,g:(r.g-i.g)*s+i.g,b:(r.b-i.b)*s+i.b,a:(r.a-i.a)*s+i.a};return De(o)};De.readability=function(t,e){var n=De(t),i=De(e);return(Math.max(n.getLuminance(),i.getLuminance())+.05)/(Math.min(n.getLuminance(),i.getLuminance())+.05)};De.isReadable=function(t,e,n){var i=De.readability(t,e),r,s;switch(s=!1,r=V2(n),r.level+r.size){case"AAsmall":case"AAAlarge":s=i>=4.5;break;case"AAlarge":s=i>=3;break;case"AAAsmall":s=i>=7;break}return s};De.mostReadable=function(t,e,n){var i=null,r=0,s,o,a,l;n=n||{},o=n.includeFallbackColors,a=n.level,l=n.size;for(var c=0;c<e.length;c++)s=De.readability(t,e[c]),s>r&&(r=s,i=De(e[c]));return De.isReadable(t,i,{level:a,size:l})||!o?i:(n.includeFallbackColors=!1,De.mostReadable(t,["#fff","#000"],n))};var bd=De.names={aliceblue:"f0f8ff",antiquewhite:"faebd7",aqua:"0ff",aquamarine:"7fffd4",azure:"f0ffff",beige:"f5f5dc",bisque:"ffe4c4",black:"000",blanchedalmond:"ffebcd",blue:"00f",blueviolet:"8a2be2",brown:"a52a2a",burlywood:"deb887",burntsienna:"ea7e5d",cadetblue:"5f9ea0",chartreuse:"7fff00",chocolate:"d2691e",coral:"ff7f50",cornflowerblue:"6495ed",cornsilk:"fff8dc",crimson:"dc143c",cyan:"0ff",darkblue:"00008b",darkcyan:"008b8b",darkgoldenrod:"b8860b",darkgray:"a9a9a9",darkgreen:"006400",darkgrey:"a9a9a9",darkkhaki:"bdb76b",darkmagenta:"8b008b",darkolivegreen:"556b2f",darkorange:"ff8c00",darkorchid:"9932cc",darkred:"8b0000",darksalmon:"e9967a",darkseagreen:"8fbc8f",darkslateblue:"483d8b",darkslategray:"2f4f4f",darkslategrey:"2f4f4f",darkturquoise:"00ced1",darkviolet:"9400d3",deeppink:"ff1493",deepskyblue:"00bfff",dimgray:"696969",dimgrey:"696969",dodgerblue:"1e90ff",firebrick:"b22222",floralwhite:"fffaf0",forestgreen:"228b22",fuchsia:"f0f",gainsboro:"dcdcdc",ghostwhite:"f8f8ff",gold:"ffd700",goldenrod:"daa520",gray:"808080",green:"008000",greenyellow:"adff2f",grey:"808080",honeydew:"f0fff0",hotpink:"ff69b4",indianred:"cd5c5c",indigo:"4b0082",ivory:"fffff0",khaki:"f0e68c",lavender:"e6e6fa",lavenderblush:"fff0f5",lawngreen:"7cfc00",lemonchiffon:"fffacd",lightblue:"add8e6",lightcoral:"f08080",lightcyan:"e0ffff",lightgoldenrodyellow:"fafad2",lightgray:"d3d3d3",lightgreen:"90ee90",lightgrey:"d3d3d3",lightpink:"ffb6c1",lightsalmon:"ffa07a",lightseagreen:"20b2aa",lightskyblue:"87cefa",lightslategray:"789",lightslategrey:"789",lightsteelblue:"b0c4de",lightyellow:"ffffe0",lime:"0f0",limegreen:"32cd32",linen:"faf0e6",magenta:"f0f",maroon:"800000",mediumaquamarine:"66cdaa",mediumblue:"0000cd",mediumorchid:"ba55d3",mediumpurple:"9370db",mediumseagreen:"3cb371",mediumslateblue:"7b68ee",mediumspringgreen:"00fa9a",mediumturquoise:"48d1cc",mediumvioletred:"c71585",midnightblue:"191970",mintcream:"f5fffa",mistyrose:"ffe4e1",moccasin:"ffe4b5",navajowhite:"ffdead",navy:"000080",oldlace:"fdf5e6",olive:"808000",olivedrab:"6b8e23",orange:"ffa500",orangered:"ff4500",orchid:"da70d6",palegoldenrod:"eee8aa",palegreen:"98fb98",paleturquoise:"afeeee",palevioletred:"db7093",papayawhip:"ffefd5",peachpuff:"ffdab9",peru:"cd853f",pink:"ffc0cb",plum:"dda0dd",powderblue:"b0e0e6",purple:"800080",rebeccapurple:"663399",red:"f00",rosybrown:"bc8f8f",royalblue:"4169e1",saddlebrown:"8b4513",salmon:"fa8072",sandybrown:"f4a460",seagreen:"2e8b57",seashell:"fff5ee",sienna:"a0522d",silver:"c0c0c0",skyblue:"87ceeb",slateblue:"6a5acd",slategray:"708090",slategrey:"708090",snow:"fffafa",springgreen:"00ff7f",steelblue:"4682b4",tan:"d2b48c",teal:"008080",thistle:"d8bfd8",tomato:"ff6347",turquoise:"40e0d0",violet:"ee82ee",wheat:"f5deb3",white:"fff",whitesmoke:"f5f5f5",yellow:"ff0",yellowgreen:"9acd32"},F2=De.hexNames=U2(bd);function U2(t){var e={};for(var n in t)t.hasOwnProperty(n)&&(e[t[n]]=n);return e}function lv(t){return t=parseFloat(t),(isNaN(t)||t<0||t>1)&&(t=1),t}function Dt(t,e){z2(t)&&(t="100%");var n=k2(t);return t=Math.min(e,Math.max(0,parseFloat(t))),n&&(t=parseInt(t*e,10)/100),Math.abs(t-e)<1e-6?1:t%e/parseFloat(e)}function Mh(t){return Math.min(1,Math.max(0,t))}function In(t){return parseInt(t,16)}function z2(t){return typeof t=="string"&&t.indexOf(".")!=-1&&parseFloat(t)===1}function k2(t){return typeof t=="string"&&t.indexOf("%")!=-1}function ci(t){return t.length==1?"0"+t:""+t}function ba(t){return t<=1&&(t=t*100+"%"),t}function hv(t){return Math.round(parseFloat(t)*255).toString(16)}function cv(t){return In(t)/255}var ai=(function(){var t="[-\\+]?\\d+%?",e="[-\\+]?\\d*\\.\\d+%?",n="(?:"+e+")|(?:"+t+")",i="[\\s|\\(]+("+n+")[,|\\s]+("+n+")[,|\\s]+("+n+")\\s*\\)?",r="[\\s|\\(]+("+n+")[,|\\s]+("+n+")[,|\\s]+("+n+")[,|\\s]+("+n+")\\s*\\)?";return{CSS_UNIT:new RegExp(n),rgb:new RegExp("rgb"+i),rgba:new RegExp("rgba"+r),hsl:new RegExp("hsl"+i),hsla:new RegExp("hsla"+r),hsv:new RegExp("hsv"+i),hsva:new RegExp("hsva"+r),hex3:/^#?([0-9a-fA-F]{1})([0-9a-fA-F]{1})([0-9a-fA-F]{1})$/,hex6:/^#?([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/,hex4:/^#?([0-9a-fA-F]{1})([0-9a-fA-F]{1})([0-9a-fA-F]{1})([0-9a-fA-F]{1})$/,hex8:/^#?([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/}})();function Wi(t){return!!ai.CSS_UNIT.exec(t)}function B2(t){t=t.replace(v2,"").replace(y2,"").toLowerCase();var e=!1;if(bd[t])t=bd[t],e=!0;else if(t=="transparent")return{r:0,g:0,b:0,a:0,format:"name"};var n;return(n=ai.rgb.exec(t))?{r:n[1],g:n[2],b:n[3]}:(n=ai.rgba.exec(t))?{r:n[1],g:n[2],b:n[3],a:n[4]}:(n=ai.hsl.exec(t))?{h:n[1],s:n[2],l:n[3]}:(n=ai.hsla.exec(t))?{h:n[1],s:n[2],l:n[3],a:n[4]}:(n=ai.hsv.exec(t))?{h:n[1],s:n[2],v:n[3]}:(n=ai.hsva.exec(t))?{h:n[1],s:n[2],v:n[3],a:n[4]}:(n=ai.hex8.exec(t))?{r:In(n[1]),g:In(n[2]),b:In(n[3]),a:cv(n[4]),format:e?"name":"hex8"}:(n=ai.hex6.exec(t))?{r:In(n[1]),g:In(n[2]),b:In(n[3]),format:e?"name":"hex"}:(n=ai.hex4.exec(t))?{r:In(n[1]+""+n[1]),g:In(n[2]+""+n[2]),b:In(n[3]+""+n[3]),a:cv(n[4]+""+n[4]),format:e?"name":"hex8"}:(n=ai.hex3.exec(t))?{r:In(n[1]+""+n[1]),g:In(n[2]+""+n[2]),b:In(n[3]+""+n[3]),format:e?"name":"hex"}:!1}function V2(t){var e,n;return t=t||{level:"AA",size:"small"},e=(t.level||"AA").toUpperCase(),n=(t.size||"small").toLowerCase(),e!=="AA"&&e!=="AAA"&&(e="AA"),n!=="small"&&n!=="large"&&(n="small"),{level:e,size:n}}var mv=t=>{t instanceof Array?t.forEach(mv):(t.map&&t.map.dispose(),t.dispose())},wd=t=>{t.geometry&&t.geometry.dispose(),t.material&&mv(t.material),t.texture&&t.texture.dispose(),t.children&&t.children.forEach(wd)},uv=t=>{for(;t.children.length;){let e=t.children[0];t.remove(e),wd(e)}},Zr=class extends x_{constructor(e,{dataBindAttr:n="__data",objBindAttr:i="__threeObj"}={}){super(),this.scene=e,this.#t=n,this.#e=i,this.onRemoveObj(()=>{})}onCreateObj(e){return super.onCreateObj(n=>{let i=e(n);return n[this.#e]=i,i[this.#t]=n,this.scene.add(i),i}),this}onRemoveObj(e){return super.onRemoveObj((n,i)=>{let r=super.getData(n);e(n,i),this.scene.remove(n),wd(n),delete r[this.#e]}),this}scene;#t;#e},Ma=t=>isNaN(t)?parseInt(De(t).toHex(),16):t,Md=t=>isNaN(t)?De(t).getAlpha():1,H2=xd(nv);function fv(t,e,n){!e||typeof n!="string"||t.filter(i=>!i[n]).forEach(i=>{i[n]=H2(e(i))})}function G2({nodes:t,links:e},n,{nodeFilter:i=()=>!0,onLoopError:r=s=>{throw`Invalid DAG structure! Found cycle in node path: ${s.join(" -> ")}.`}}={}){let s={};t.forEach(c=>s[n(c)]={data:c,out:[],depth:-1,skip:!i(c)}),e.forEach(({source:c,target:h})=>{let u=_(c),d=_(h);if(!s.hasOwnProperty(u))throw`Missing source node with id: ${u}`;if(!s.hasOwnProperty(d))throw`Missing target node with id: ${d}`;let f=s[u],m=s[d];f.out.push(m);function _(g){return typeof g=="object"?n(g):g}});let o=[];return l(Object.values(s)),Object.assign({},...Object.entries(s).filter(([,c])=>!c.skip).map(([c,h])=>({[c]:h.depth})));function l(c,h=[],u=0){for(let d=0,f=c.length;d<f;d++){let m=c[d];if(h.indexOf(m)!==-1){let _=[...h.slice(h.indexOf(m)),m].map(g=>n(g.data));o.some(g=>g.length===_.length&&g.every((p,x)=>p===_[x]))||(o.push(_),r(_));continue}u>m.depth&&(m.depth=u,l(m.out,[...h,m],u+(m.skip?0:1)))}}}var He=window.THREE?window.THREE:{Group:nn,Mesh:It,MeshLambertMaterial:jo,Color:Oe,BufferGeometry:St,BufferAttribute:rn,Matrix4:Xe,Vector3:R,SphereGeometry:Fi,CylinderGeometry:Rs,TubeGeometry:Ho,ConeGeometry:ko,Line:pi,LineBasicMaterial:ni,QuadraticBezierCurve3:Ir,CubicBezierCurve3:Ps,Box3:vn},dv={graph:v0,forcelayout:pv.default},W2=2,Sd=new He.BufferGeometry().setAttribute?"setAttribute":"addAttribute",Sh=new He.BufferGeometry().applyMatrix4?"applyMatrix4":"applyMatrix",j2=lr({props:{jsonUrl:{onChange:function(t,e){t&&!e.fetchingJson&&(e.fetchingJson=!0,e.onLoading(),fetch(t).then(n=>n.json()).then(n=>{e.fetchingJson=!1,e.onFinishLoading(n),this.graphData(n)}))},triggerUpdate:!1},graphData:{default:{nodes:[],links:[]},onChange(t,e){e.engineRunning=!1}},numDimensions:{default:3,onChange(t,e){let n=e.d3ForceLayout.force("charge");n&&n.strength(t>2?-60:-30),t<3&&i(e.graphData.nodes,"z"),t<2&&i(e.graphData.nodes,"y");function i(r,s){r.forEach(o=>{delete o[s],delete o[`v${s}`]})}}},dagMode:{onChange(t,e){!t&&e.forceEngine==="d3"&&(e.graphData.nodes||[]).forEach(n=>n.fx=n.fy=n.fz=void 0)}},dagLevelDistance:{},dagNodeFilter:{default:t=>!0},onDagError:{triggerUpdate:!1},nodeRelSize:{default:4},nodeId:{default:"id"},nodeVal:{default:"val"},nodeResolution:{default:8},nodeColor:{default:"color"},nodeAutoColorBy:{},nodeOpacity:{default:.75},nodeVisibility:{default:!0},nodeThreeObject:{},nodeThreeObjectExtend:{default:!1},nodePositionUpdate:{triggerUpdate:!1},linkSource:{default:"source"},linkTarget:{default:"target"},linkVisibility:{default:!0},linkColor:{default:"color"},linkAutoColorBy:{},linkOpacity:{default:.2},linkWidth:{},linkResolution:{default:6},linkCurvature:{default:0,triggerUpdate:!1},linkCurveRotation:{default:0,triggerUpdate:!1},linkMaterial:{},linkThreeObject:{},linkThreeObjectExtend:{default:!1},linkPositionUpdate:{triggerUpdate:!1},linkDirectionalArrowLength:{default:0},linkDirectionalArrowColor:{},linkDirectionalArrowRelPos:{default:.5,triggerUpdate:!1},linkDirectionalArrowResolution:{default:8},linkDirectionalParticles:{default:0},linkDirectionalParticleSpeed:{default:.01,triggerUpdate:!1},linkDirectionalParticleOffset:{default:0,triggerUpdate:!1},linkDirectionalParticleWidth:{default:.5},linkDirectionalParticleColor:{},linkDirectionalParticleResolution:{default:4},linkDirectionalParticleThreeObject:{},forceEngine:{default:"d3"},d3AlphaMin:{default:0},d3AlphaDecay:{default:.0228,triggerUpdate:!1,onChange(t,e){e.d3ForceLayout.alphaDecay(t)}},d3AlphaTarget:{default:0,triggerUpdate:!1,onChange(t,e){e.d3ForceLayout.alphaTarget(t)}},d3VelocityDecay:{default:.4,triggerUpdate:!1,onChange(t,e){e.d3ForceLayout.velocityDecay(t)}},ngraphPhysics:{default:{timeStep:20,gravity:-1.2,theta:.8,springLength:30,springCoefficient:8e-4,dragCoefficient:.02}},warmupTicks:{default:0,triggerUpdate:!1},cooldownTicks:{default:1/0,triggerUpdate:!1},cooldownTime:{default:15e3,triggerUpdate:!1},onLoading:{default:()=>{},triggerUpdate:!1},onFinishLoading:{default:()=>{},triggerUpdate:!1},onUpdate:{default:()=>{},triggerUpdate:!1},onFinishUpdate:{default:()=>{},triggerUpdate:!1},onEngineTick:{default:()=>{},triggerUpdate:!1},onEngineStop:{default:()=>{},triggerUpdate:!1}},methods:{refresh:function(t){return t._flushObjects=!0,t._rerender(),this},d3Force:function(t,e,n){return n===void 0?t.d3ForceLayout.force(e):(t.d3ForceLayout.force(e,n),this)},d3ReheatSimulation:function(t){return t.d3ForceLayout.alpha(1),this.resetCountdown(),this},resetCountdown:function(t){return t.cntTicks=0,t.startTickTime=new Date,t.engineRunning=!0,this},tickFrame:function(t){let e=t.forceEngine!=="ngraph";return t.engineRunning&&t.layout&&n(),i(),r(),this;function n(){++t.cntTicks>t.cooldownTicks||new Date-t.startTickTime>t.cooldownTime||e&&t.d3AlphaMin>0&&t.d3ForceLayout.alpha()<t.d3AlphaMin?(t.engineRunning=!1,t.onEngineStop()):(t.layout[e?"tick":"step"](),t.onEngineTick());let s=tt(t.nodeThreeObjectExtend);t.nodeDataMapper.entries().forEach(([u,d])=>{if(!d)return;let f=e?u:t.layout.getNodePosition(u[t.nodeId]),m=s(u);(!t.nodePositionUpdate||!t.nodePositionUpdate(m?d.children[0]:d,{x:f.x,y:f.y,z:f.z},u)||m)&&(d.position.x=f.x,d.position.y=f.y||0,d.position.z=f.z||0)});let o=tt(t.linkWidth),a=tt(t.linkCurvature),l=tt(t.linkCurveRotation),c=tt(t.linkThreeObjectExtend);t.linkDataMapper.entries().forEach(([u,d])=>{if(!d)return;let f=e?u:t.layout.getLinkPosition(t.layout.graph.getLink(u.source,u.target).id),m=f[e?"source":"from"],_=f[e?"target":"to"];if(!m||!_||!m.hasOwnProperty("x")||!_.hasOwnProperty("x"))return;h(u);let g=c(u);if(t.linkPositionUpdate&&t.linkPositionUpdate(g?d.children[1]:d,{start:{x:m.x,y:m.y,z:m.z},end:{x:_.x,y:_.y,z:_.z}},u)&&!g)return;let p=30,x=u.__curve,y=d.children.length?d.children[0]:d;if(y.type==="Line"){if(x){let v=x.getPoints(p);y.geometry.getAttribute("position").array.length!==v.length*3&&y.geometry[Sd]("position",new He.BufferAttribute(new Float32Array(v.length*3),3)),y.geometry.setFromPoints(v)}else{let v=y.geometry.getAttribute("position");(!v||!v.array||v.array.length!==6)&&y.geometry[Sd]("position",v=new He.BufferAttribute(new Float32Array(6),3)),v.array[0]=m.x,v.array[1]=m.y||0,v.array[2]=m.z||0,v.array[3]=_.x,v.array[4]=_.y||0,v.array[5]=_.z||0,v.needsUpdate=!0}y.geometry.computeBoundingSphere()}else if(y.type==="Mesh")if(x){y.geometry.type.match(/^Tube(Buffer)?Geometry$/)||(y.position.set(0,0,0),y.rotation.set(0,0,0),y.scale.set(1,1,1));let M=Math.ceil(o(u)*10)/10/2,b=new He.TubeGeometry(x,p,M,t.linkResolution,!1);y.geometry.dispose(),y.geometry=b}else{if(!y.geometry.type.match(/^Cylinder(Buffer)?Geometry$/)){let C=Math.ceil(o(u)*10)/10/2,E=new He.CylinderGeometry(C,C,1,t.linkResolution,1,!1);E[Sh](new He.Matrix4().makeTranslation(0,1/2,0)),E[Sh](new He.Matrix4().makeRotationX(Math.PI/2)),y.geometry.dispose(),y.geometry=E}let v=new He.Vector3(m.x,m.y||0,m.z||0),M=new He.Vector3(_.x,_.y||0,_.z||0),b=v.distanceTo(M);y.position.x=v.x,y.position.y=v.y,y.position.z=v.z,y.scale.z=b,y.parent.localToWorld(M),y.lookAt(M)}});function h(u){let d=e?u:t.layout.getLinkPosition(t.layout.graph.getLink(u.source,u.target).id),f=d[e?"source":"from"],m=d[e?"target":"to"];if(!f||!m||!f.hasOwnProperty("x")||!m.hasOwnProperty("x"))return;let _=a(u);if(!_)u.__curve=null;else{let g=new He.Vector3(f.x,f.y||0,f.z||0),p=new He.Vector3(m.x,m.y||0,m.z||0),x=g.distanceTo(p),y,v=l(u);if(x>0){let M=m.x-f.x,b=m.y-f.y||0,A=new He.Vector3().subVectors(p,g),C=A.clone().multiplyScalar(_).cross(M!==0||b!==0?new He.Vector3(0,0,1):new He.Vector3(0,1,0)).applyAxisAngle(A.normalize(),v).add(new He.Vector3().addVectors(g,p).divideScalar(2));y=new He.QuadraticBezierCurve3(g,C,p)}else{let M=_*70,b=-v,A=b+Math.PI/2;y=new He.CubicBezierCurve3(g,new He.Vector3(M*Math.cos(A),M*Math.sin(A),0).add(g),new He.Vector3(M*Math.cos(b),M*Math.sin(b),0).add(g),p)}u.__curve=y}}}function i(){let s=tt(t.linkDirectionalArrowRelPos),o=tt(t.linkDirectionalArrowLength),a=tt(t.nodeVal);t.arrowDataMapper.entries().forEach(([l,c])=>{if(!c)return;let h=e?l:t.layout.getLinkPosition(t.layout.graph.getLink(l.source,l.target).id),u=h[e?"source":"from"],d=h[e?"target":"to"];if(!u||!d||!u.hasOwnProperty("x")||!d.hasOwnProperty("x"))return;let f=Math.cbrt(Math.max(0,a(u)||1))*t.nodeRelSize,m=Math.cbrt(Math.max(0,a(d)||1))*t.nodeRelSize,_=o(l),g=s(l),p=l.__curve?A=>l.__curve.getPoint(A):A=>{let C=(E,w,I,N)=>w[E]+(I[E]-w[E])*N||0;return{x:C("x",u,d,A),y:C("y",u,d,A),z:C("z",u,d,A)}},x=l.__curve?l.__curve.getLength():Math.sqrt(["x","y","z"].map(A=>Math.pow((d[A]||0)-(u[A]||0),2)).reduce((A,C)=>A+C,0)),y=f+_+(x-f-m-_)*g,v=p(y/x),M=p((y-_)/x);["x","y","z"].forEach(A=>c.position[A]=M[A]);let b=new He.Vector3(...["x","y","z"].map(A=>v[A]));c.parent.localToWorld(b),c.lookAt(b)})}function r(){let s=tt(t.linkDirectionalParticleSpeed),o=tt(t.linkDirectionalParticleOffset);t.graphData.links.forEach(a=>{let l=t.particlesDataMapper.getObj(a),c=l&&l.children,h=a.__singleHopPhotonsObj&&a.__singleHopPhotonsObj.children;if((!h||!h.length)&&(!c||!c.length))return;let u=e?a:t.layout.getLinkPosition(t.layout.graph.getLink(a.source,a.target).id),d=u[e?"source":"from"],f=u[e?"target":"to"];if(!d||!f||!d.hasOwnProperty("x")||!f.hasOwnProperty("x"))return;let m=s(a),_=Math.abs(o(a)),g=a.__curve?x=>a.__curve.getPoint(x):x=>{let y=(v,M,b,A)=>M[v]+(b[v]-M[v])*A||0;return{x:y("x",d,f,x),y:y("y",d,f,x),z:y("z",d,f,x)}};[...c||[],...h||[]].forEach((x,y)=>{let v=x.parent.__linkThreeObjType==="singleHopPhotons";if(x.hasOwnProperty("__progressRatio")||(x.__progressRatio=v?m<0?1:0:(y+_)/c.length),x.__progressRatio+=m,x.__progressRatio>=1||x.__progressRatio<0)if(!v)x.__progressRatio=x.__progressRatio%1,x.__progressRatio<0&&x.__progressRatio++;else{x.parent.remove(x),uv(x);return}let M=x.__progressRatio,b=g(M);x.geometry.type!=="SphereGeometry"&&x.lookAt(b.x,b.y,b.z),["x","y","z"].forEach(A=>x.position[A]=b[A])})})}},emitParticle:function(t,e){if(e&&t.graphData.links.includes(e)){if(!e.__singleHopPhotonsObj){let i=new He.Group;i.__linkThreeObjType="singleHopPhotons",e.__singleHopPhotonsObj=i,t.graphScene.add(i)}let n=tt(t.linkDirectionalParticleThreeObject)(e);if(n&&t.linkDirectionalParticleThreeObject===n&&(n=n.clone()),!n){let i=tt(t.linkDirectionalParticleWidth),r=Math.ceil(i(e)*10)/10/2,s=t.linkDirectionalParticleResolution,o=new He.SphereGeometry(r,s,s),a=tt(t.linkColor),c=tt(t.linkDirectionalParticleColor)(e)||a(e)||"#f0f0f0",h=new He.Color(Ma(c)),u=t.linkOpacity*3,d=new He.MeshLambertMaterial({color:h,transparent:!0,opacity:u});n=new He.Mesh(o,d)}e.__singleHopPhotonsObj.add(n)}return this},getGraphBbox:function(t,e=()=>!0){if(!t.initialised)return null;let n=(function i(r){let s=[];if(r.geometry){r.geometry.computeBoundingBox();let o=new He.Box3;o.copy(r.geometry.boundingBox).applyMatrix4(r.matrixWorld),s.push(o)}return s.concat(...(r.children||[]).filter(o=>!o.hasOwnProperty("__graphObjType")||o.__graphObjType==="node"&&e(o.__data)).map(i))})(t.graphScene);return n.length?Object.assign(...["x","y","z"].map(i=>({[i]:[__(n,r=>r.min[i]),g_(n,r=>r.max[i])]}))):null}},stateInit:()=>({d3ForceLayout:Gf().force("link",Uf()).force("charge",Wf()).force("center",Df()).force("dagRadial",null).stop(),engineRunning:!1}),init(t,e){e.graphScene=t,e.nodeDataMapper=new Zr(t,{objBindAttr:"__threeObj"}),e.linkDataMapper=new Zr(t,{objBindAttr:"__lineObj"}),e.arrowDataMapper=new Zr(t,{objBindAttr:"__arrowObj"}),e.particlesDataMapper=new Zr(t,{objBindAttr:"__photonsObj"})},update(t,e){let n=i=>i.some(r=>e.hasOwnProperty(r));if(t.engineRunning=!1,typeof t.onUpdate=="function"&&t.onUpdate(),t.nodeAutoColorBy!==null&&n(["nodeAutoColorBy","graphData","nodeColor"])&&fv(t.graphData.nodes,tt(t.nodeAutoColorBy),t.nodeColor),t.linkAutoColorBy!==null&&n(["linkAutoColorBy","graphData","linkColor"])&&fv(t.graphData.links,tt(t.linkAutoColorBy),t.linkColor),t._flushObjects||n(["graphData","nodeThreeObject","nodeThreeObjectExtend","nodeVal","nodeColor","nodeVisibility","nodeRelSize","nodeResolution","nodeOpacity"])){let i=tt(t.nodeThreeObject),r=tt(t.nodeThreeObjectExtend),s=tt(t.nodeVal),o=tt(t.nodeColor),a=tt(t.nodeVisibility),l={},c={};(t._flushObjects||n(["nodeThreeObject","nodeThreeObjectExtend"]))&&t.nodeDataMapper.clear(),t.nodeDataMapper.onCreateObj(h=>{let u=i(h),d=r(h);u&&t.nodeThreeObject===u&&(u=u.clone());let f;return u&&!d?f=u:(f=new He.Mesh,f.__graphDefaultObj=!0,u&&d&&f.add(u)),f.__graphObjType="node",f}).onUpdateObj((h,u)=>{if(h.__graphDefaultObj){let d=s(u)||1,f=Math.cbrt(d)*t.nodeRelSize,m=t.nodeResolution;(!h.geometry.type.match(/^Sphere(Buffer)?Geometry$/)||h.geometry.parameters.radius!==f||h.geometry.parameters.widthSegments!==m)&&(l.hasOwnProperty(d)||(l[d]=new He.SphereGeometry(f,m,m)),h.geometry.dispose(),h.geometry=l[d]);let _=o(u),g=new He.Color(Ma(_||"#ffffaa")),p=t.nodeOpacity*Md(_);(h.material.type!=="MeshLambertMaterial"||!h.material.color.equals(g)||h.material.opacity!==p)&&(c.hasOwnProperty(_)||(c[_]=new He.MeshLambertMaterial({color:g,transparent:!0,opacity:p})),h.material.dispose(),h.material=c[_])}}).digest(t.graphData.nodes.filter(a))}if(t._flushObjects||n(["graphData","linkThreeObject","linkThreeObjectExtend","linkMaterial","linkColor","linkWidth","linkVisibility","linkResolution","linkOpacity","linkDirectionalArrowLength","linkDirectionalArrowColor","linkDirectionalArrowResolution","linkDirectionalParticles","linkDirectionalParticleWidth","linkDirectionalParticleColor","linkDirectionalParticleResolution","linkDirectionalParticleThreeObject"])){let i=tt(t.linkThreeObject),r=tt(t.linkThreeObjectExtend),s=tt(t.linkMaterial),o=tt(t.linkVisibility),a=tt(t.linkColor),l=tt(t.linkWidth),c={},h={},u={},d=t.graphData.links.filter(o);if((t._flushObjects||n(["linkThreeObject","linkThreeObjectExtend","linkWidth"]))&&t.linkDataMapper.clear(),t.linkDataMapper.onRemoveObj(f=>{let m=f.__data&&f.__data.__singleHopPhotonsObj;m&&(m.parent.remove(m),uv(m),delete f.__data.__singleHopPhotonsObj)}).onCreateObj(f=>{let m=i(f),_=r(f);m&&t.linkThreeObject===m&&(m=m.clone());let g;if(!m||_)if(!!l(f))g=new He.Mesh;else{let y=new He.BufferGeometry;y[Sd]("position",new He.BufferAttribute(new Float32Array(6),3)),g=new He.Line(y)}let p;return m?_?(p=new He.Group,p.__graphDefaultObj=!0,p.add(g),p.add(m)):p=m:(p=g,p.__graphDefaultObj=!0),p.renderOrder=10,p.__graphObjType="link",p}).onUpdateObj((f,m)=>{if(f.__graphDefaultObj){let _=f.children.length?f.children[0]:f,g=Math.ceil(l(m)*10)/10,p=!!g;if(p){let y=g/2,v=t.linkResolution;if(!_.geometry.type.match(/^Cylinder(Buffer)?Geometry$/)||_.geometry.parameters.radiusTop!==y||_.geometry.parameters.radialSegments!==v){if(!c.hasOwnProperty(g)){let M=new He.CylinderGeometry(y,y,1,v,1,!1);M[Sh](new He.Matrix4().makeTranslation(0,1/2,0)),M[Sh](new He.Matrix4().makeRotationX(Math.PI/2)),c[g]=M}_.geometry.dispose(),_.geometry=c[g]}}let x=s(m);if(x)_.material=x;else{let y=a(m),v=new He.Color(Ma(y||"#f0f0f0")),M=t.linkOpacity*Md(y),b=p?"MeshLambertMaterial":"LineBasicMaterial";if(_.material.type!==b||!_.material.color.equals(v)||_.material.opacity!==M){let A=p?h:u;A.hasOwnProperty(y)||(A[y]=new He[b]({color:v,transparent:M<1,opacity:M,depthWrite:M>=1})),_.material.dispose(),_.material=A[y]}}}}).digest(d),t.linkDirectionalArrowLength||e.hasOwnProperty("linkDirectionalArrowLength")){let f=tt(t.linkDirectionalArrowLength),m=tt(t.linkDirectionalArrowColor);t.arrowDataMapper.onCreateObj(()=>{let _=new He.Mesh(void 0,new He.MeshLambertMaterial({transparent:!0}));return _.__linkThreeObjType="arrow",_}).onUpdateObj((_,g)=>{let p=f(g),x=t.linkDirectionalArrowResolution;if(!_.geometry.type.match(/^Cone(Buffer)?Geometry$/)||_.geometry.parameters.height!==p||_.geometry.parameters.radialSegments!==x){let v=new He.ConeGeometry(p*.25,p,x);v.translate(0,p/2,0),v.rotateX(Math.PI/2),_.geometry.dispose(),_.geometry=v}let y=m(g)||a(g)||"#f0f0f0";_.material.color=new He.Color(Ma(y)),_.material.opacity=t.linkOpacity*3*Md(y)}).digest(d.filter(f))}if(t.linkDirectionalParticles||e.hasOwnProperty("linkDirectionalParticles")){let f=tt(t.linkDirectionalParticles),m=tt(t.linkDirectionalParticleWidth),_=tt(t.linkDirectionalParticleColor),g=tt(t.linkDirectionalParticleThreeObject),p={},x={};t.particlesDataMapper.onCreateObj(()=>{let y=new He.Group;return y.__linkThreeObjType="photons",y.__photonDataMapper=new Zr(y),y}).onUpdateObj((y,v)=>{let M=!!y.children.length&&y.children[0],b=g(v),A,C;if(b)A=b.geometry,C=b.material;else{let w=Math.ceil(m(v)*10)/10/2,I=t.linkDirectionalParticleResolution;M&&M.geometry.parameters.radius===w&&M.geometry.parameters.widthSegments===I?A=M.geometry:(x.hasOwnProperty(w)||(x[w]=new He.SphereGeometry(w,I,I)),A=x[w]);let N=_(v)||a(v)||"#f0f0f0",B=new He.Color(Ma(N)),L=t.linkOpacity*3;M&&M.material.color.equals(B)&&M.material.opacity===L?C=M.material:(p.hasOwnProperty(N)||(p[N]=new He.MeshLambertMaterial({color:B,transparent:!0,opacity:L})),C=p[N])}M&&(M.geometry!==A&&M.geometry.dispose(),M.material!==C&&M.material.dispose());let E=Math.round(Math.abs(f(v)));y.__photonDataMapper.id(w=>w.idx).onCreateObj(()=>new He.Mesh(A,C)).onUpdateObj(w=>{w.geometry=A,w.material=C}).digest([...new Array(E)].map((w,I)=>({idx:I})))}).digest(d.filter(f))}}if(t._flushObjects=!1,n(["graphData","nodeId","linkSource","linkTarget","numDimensions","forceEngine","dagMode","dagNodeFilter","dagLevelDistance"])){t.engineRunning=!1,t.graphData.links.forEach(s=>{s.source=s[t.linkSource],s.target=s[t.linkTarget]});let i=t.forceEngine!=="ngraph",r;if(i){(r=t.d3ForceLayout).stop().alpha(1).numDimensions(t.numDimensions).nodes(t.graphData.nodes);let s=t.d3ForceLayout.force("link");s&&s.id(c=>c[t.nodeId]).links(t.graphData.links);let o=t.dagMode&&G2(t.graphData,c=>c[t.nodeId],{nodeFilter:t.dagNodeFilter,onLoopError:t.onDagError||void 0}),a=Math.max(...Object.values(o||[])),l=t.dagLevelDistance||t.graphData.nodes.length/(a||1)*W2*(["radialin","radialout"].indexOf(t.dagMode)!==-1?.7:1);if(["lr","rl","td","bu","zin","zout"].includes(e.dagMode)){let c=["lr","rl"].includes(e.dagMode)?"fx":["td","bu"].includes(e.dagMode)?"fy":"fz";t.graphData.nodes.filter(t.dagNodeFilter).forEach(h=>delete h[c])}if(["lr","rl","td","bu","zin","zout"].includes(t.dagMode)){let c=["rl","td","zout"].includes(t.dagMode),h=d=>(o[d[t.nodeId]]-a/2)*l*(c?-1:1),u=["lr","rl"].includes(t.dagMode)?"fx":["td","bu"].includes(t.dagMode)?"fy":"fz";t.graphData.nodes.filter(t.dagNodeFilter).forEach(d=>d[u]=h(d))}t.d3ForceLayout.force("dagRadial",["radialin","radialout"].indexOf(t.dagMode)!==-1?jf(c=>{let h=o[c[t.nodeId]]||-1;return(t.dagMode==="radialin"?a-h:h)*l}).strength(c=>t.dagNodeFilter(c)?1:0):null)}else{let s=dv.graph();t.graphData.nodes.forEach(o=>{s.addNode(o[t.nodeId])}),t.graphData.links.forEach(o=>{s.addLink(o.source,o.target)}),r=dv.forcelayout(s,{dimensions:t.numDimensions,...t.ngraphPhysics}),r.graph=s}for(let s=0;s<t.warmupTicks&&!(i&&t.d3AlphaMin>0&&t.d3ForceLayout.alpha()<t.d3AlphaMin);s++)r[i?"tick":"step"]();t.layout=r,this.resetCountdown()}t.engineRunning=!0,t.onFinishUpdate()}});function q2(t,e=Object,n=!1){class i extends e{constructor(...o){super(...o),this.__kapsuleInstance=new t(...n?[this]:[],...o)}}let r=t();return r._destructor?.(),Object.keys(r).forEach(s=>i.prototype[s]=function(...o){let a=this.__kapsuleInstance[s](...o);return a===this.__kapsuleInstance?this:a}),i}var X2=window.THREE?window.THREE:{Group:nn},Ed=q2(j2,X2.Group,!0);var wh=class{constructor(){throw new Error("WebGPU fora do bundle da Teia")}};var Td={type:"change"},Rd={type:"start"},Pd={type:"end"},gv=1e-6,ft={NONE:-1,ROTATE:0,ZOOM:1,PAN:2,TOUCH_ROTATE:3,TOUCH_ZOOM_PAN:4},Eh=new ne,ur=new ne,$2=new R,Th=new R,Ad=new R,eo=new Ht,_v=new R,Ah=new R,Cd=new R,Ch=new R,Rh=class extends Pn{constructor(e,n=null){super(e,n),this.screen={left:0,top:0,width:0,height:0},this.rotateSpeed=1,this.zoomSpeed=1.2,this.panSpeed=.3,this.noRotate=!1,this.noZoom=!1,this.noPan=!1,this.staticMoving=!1,this.dynamicDampingFactor=.2,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.keys=["KeyA","KeyS","KeyD"],this.mouseButtons={LEFT:zt.ROTATE,MIDDLE:zt.DOLLY,RIGHT:zt.PAN},this.target=new R,this.state=ft.NONE,this.keyState=ft.NONE,this._lastPosition=new R,this._lastZoom=1,this._touchZoomDistanceStart=0,this._touchZoomDistanceEnd=0,this._lastAngle=0,this._eye=new R,this._movePrev=new ne,this._moveCurr=new ne,this._lastAxis=new R,this._zoomStart=new ne,this._zoomEnd=new ne,this._panStart=new ne,this._panEnd=new ne,this._pointers=[],this._pointerPositions={},this._onPointerMove=Z2.bind(this),this._onPointerDown=Y2.bind(this),this._onPointerUp=K2.bind(this),this._onPointerCancel=J2.bind(this),this._onContextMenu=sC.bind(this),this._onMouseWheel=rC.bind(this),this._onKeyDown=eC.bind(this),this._onKeyUp=Q2.bind(this),this._onTouchStart=oC.bind(this),this._onTouchMove=aC.bind(this),this._onTouchEnd=cC.bind(this),this._onMouseDown=tC.bind(this),this._onMouseMove=nC.bind(this),this._onMouseUp=iC.bind(this),this._target0=this.target.clone(),this._position0=this.object.position.clone(),this._up0=this.object.up.clone(),this._zoom0=this.object.zoom,n!==null&&(this.connect(n),this.handleResize()),this.update()}connect(e){super.connect(e),window.addEventListener("keydown",this._onKeyDown),window.addEventListener("keyup",this._onKeyUp),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerCancel),this.domElement.addEventListener("wheel",this._onMouseWheel,{passive:!1}),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.style.touchAction="none"}disconnect(){window.removeEventListener("keydown",this._onKeyDown),window.removeEventListener("keyup",this._onKeyUp),this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.removeEventListener("pointermove",this._onPointerMove),this.domElement.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerCancel),this.domElement.removeEventListener("wheel",this._onMouseWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.domElement.style.touchAction="auto"}dispose(){this.disconnect()}handleResize(){let e=this.domElement.getBoundingClientRect(),n=this.domElement.ownerDocument.documentElement;this.screen.left=e.left+window.pageXOffset-n.clientLeft,this.screen.top=e.top+window.pageYOffset-n.clientTop,this.screen.width=e.width,this.screen.height=e.height}update(){this._eye.subVectors(this.object.position,this.target),this.noRotate||this._rotateCamera(),this.noZoom||this._zoomCamera(),this.noPan||this._panCamera(),this.object.position.addVectors(this.target,this._eye),this.object.isPerspectiveCamera?(this._checkDistances(),this.object.lookAt(this.target),this._lastPosition.distanceToSquared(this.object.position)>gv&&(this.dispatchEvent(Td),this._lastPosition.copy(this.object.position))):this.object.isOrthographicCamera?(this.object.lookAt(this.target),(this._lastPosition.distanceToSquared(this.object.position)>gv||this._lastZoom!==this.object.zoom)&&(this.dispatchEvent(Td),this._lastPosition.copy(this.object.position),this._lastZoom=this.object.zoom)):console.warn("THREE.TrackballControls: Unsupported camera type.")}reset(){this.state=ft.NONE,this.keyState=ft.NONE,this.target.copy(this._target0),this.object.position.copy(this._position0),this.object.up.copy(this._up0),this.object.zoom=this._zoom0,this.object.updateProjectionMatrix(),this._eye.subVectors(this.object.position,this.target),this.object.lookAt(this.target),this.dispatchEvent(Td),this._lastPosition.copy(this.object.position),this._lastZoom=this.object.zoom}_panCamera(){if(ur.copy(this._panEnd).sub(this._panStart),ur.lengthSq()){if(this.object.isOrthographicCamera){let e=(this.object.right-this.object.left)/this.object.zoom/this.domElement.clientWidth,n=(this.object.top-this.object.bottom)/this.object.zoom/this.domElement.clientWidth;ur.x*=e,ur.y*=n}ur.multiplyScalar(this._eye.length()*this.panSpeed),Th.copy(this._eye).cross(this.object.up).setLength(ur.x),Th.add($2.copy(this.object.up).setLength(ur.y)),this.object.position.add(Th),this.target.add(Th),this.staticMoving?this._panStart.copy(this._panEnd):this._panStart.add(ur.subVectors(this._panEnd,this._panStart).multiplyScalar(this.dynamicDampingFactor))}}_rotateCamera(){Ch.set(this._moveCurr.x-this._movePrev.x,this._moveCurr.y-this._movePrev.y,0);let e=Ch.length();e?(this._eye.copy(this.object.position).sub(this.target),_v.copy(this._eye).normalize(),Ah.copy(this.object.up).normalize(),Cd.crossVectors(Ah,_v).normalize(),Ah.setLength(this._moveCurr.y-this._movePrev.y),Cd.setLength(this._moveCurr.x-this._movePrev.x),Ch.copy(Ah.add(Cd)),Ad.crossVectors(Ch,this._eye).normalize(),e*=this.rotateSpeed,eo.setFromAxisAngle(Ad,e),this._eye.applyQuaternion(eo),this.object.up.applyQuaternion(eo),this._lastAxis.copy(Ad),this._lastAngle=e):!this.staticMoving&&this._lastAngle&&(this._lastAngle*=Math.sqrt(1-this.dynamicDampingFactor),this._eye.copy(this.object.position).sub(this.target),eo.setFromAxisAngle(this._lastAxis,this._lastAngle),this._eye.applyQuaternion(eo),this.object.up.applyQuaternion(eo)),this._movePrev.copy(this._moveCurr)}_zoomCamera(){let e;this.state===ft.TOUCH_ZOOM_PAN?(e=this._touchZoomDistanceStart/this._touchZoomDistanceEnd,this._touchZoomDistanceStart=this._touchZoomDistanceEnd,this.object.isPerspectiveCamera?this._eye.multiplyScalar(e):this.object.isOrthographicCamera?(this.object.zoom=gt.clamp(this.object.zoom/e,this.minZoom,this.maxZoom),this._lastZoom!==this.object.zoom&&this.object.updateProjectionMatrix()):console.warn("THREE.TrackballControls: Unsupported camera type")):(e=1+(this._zoomEnd.y-this._zoomStart.y)*this.zoomSpeed,e!==1&&e>0&&(this.object.isPerspectiveCamera?this._eye.multiplyScalar(e):this.object.isOrthographicCamera?(this.object.zoom=gt.clamp(this.object.zoom/e,this.minZoom,this.maxZoom),this._lastZoom!==this.object.zoom&&this.object.updateProjectionMatrix()):console.warn("THREE.TrackballControls: Unsupported camera type")),this.staticMoving?this._zoomStart.copy(this._zoomEnd):this._zoomStart.y+=(this._zoomEnd.y-this._zoomStart.y)*this.dynamicDampingFactor)}_getMouseOnScreen(e,n){return Eh.set((e-this.screen.left)/this.screen.width,(n-this.screen.top)/this.screen.height),Eh}_getMouseOnCircle(e,n){return Eh.set((e-this.screen.width*.5-this.screen.left)/(this.screen.width*.5),(this.screen.height+2*(this.screen.top-n))/this.screen.width),Eh}_addPointer(e){this._pointers.push(e)}_removePointer(e){delete this._pointerPositions[e.pointerId];for(let n=0;n<this._pointers.length;n++)if(this._pointers[n].pointerId==e.pointerId){this._pointers.splice(n,1);return}}_trackPointer(e){let n=this._pointerPositions[e.pointerId];n===void 0&&(n=new ne,this._pointerPositions[e.pointerId]=n),n.set(e.pageX,e.pageY)}_getSecondPointerPosition(e){let n=e.pointerId===this._pointers[0].pointerId?this._pointers[1]:this._pointers[0];return this._pointerPositions[n.pointerId]}_checkDistances(){(!this.noZoom||!this.noPan)&&(this._eye.lengthSq()>this.maxDistance*this.maxDistance&&(this.object.position.addVectors(this.target,this._eye.setLength(this.maxDistance)),this._zoomStart.copy(this._zoomEnd)),this._eye.lengthSq()<this.minDistance*this.minDistance&&(this.object.position.addVectors(this.target,this._eye.setLength(this.minDistance)),this._zoomStart.copy(this._zoomEnd)))}};function Y2(t){this.enabled!==!1&&(this._pointers.length===0&&(this.domElement.setPointerCapture(t.pointerId),this.domElement.addEventListener("pointermove",this._onPointerMove),this.domElement.addEventListener("pointerup",this._onPointerUp)),this._addPointer(t),t.pointerType==="touch"?this._onTouchStart(t):this._onMouseDown(t))}function Z2(t){this.enabled!==!1&&(t.pointerType==="touch"?this._onTouchMove(t):this._onMouseMove(t))}function K2(t){this.enabled!==!1&&(t.pointerType==="touch"?this._onTouchEnd(t):this._onMouseUp(),this._removePointer(t),this._pointers.length===0&&(this.domElement.releasePointerCapture(t.pointerId),this.domElement.removeEventListener("pointermove",this._onPointerMove),this.domElement.removeEventListener("pointerup",this._onPointerUp)))}function J2(t){this._removePointer(t)}function Q2(){this.enabled!==!1&&(this.keyState=ft.NONE,window.addEventListener("keydown",this._onKeyDown))}function eC(t){this.enabled!==!1&&(window.removeEventListener("keydown",this._onKeyDown),this.keyState===ft.NONE&&(t.code===this.keys[ft.ROTATE]&&!this.noRotate?this.keyState=ft.ROTATE:t.code===this.keys[ft.ZOOM]&&!this.noZoom?this.keyState=ft.ZOOM:t.code===this.keys[ft.PAN]&&!this.noPan&&(this.keyState=ft.PAN)))}function tC(t){let e;switch(t.button){case 0:e=this.mouseButtons.LEFT;break;case 1:e=this.mouseButtons.MIDDLE;break;case 2:e=this.mouseButtons.RIGHT;break;default:e=-1}switch(e){case zt.DOLLY:this.state=ft.ZOOM;break;case zt.ROTATE:this.state=ft.ROTATE;break;case zt.PAN:this.state=ft.PAN;break;default:this.state=ft.NONE}let n=this.keyState!==ft.NONE?this.keyState:this.state;n===ft.ROTATE&&!this.noRotate?(this._moveCurr.copy(this._getMouseOnCircle(t.pageX,t.pageY)),this._movePrev.copy(this._moveCurr)):n===ft.ZOOM&&!this.noZoom?(this._zoomStart.copy(this._getMouseOnScreen(t.pageX,t.pageY)),this._zoomEnd.copy(this._zoomStart)):n===ft.PAN&&!this.noPan&&(this._panStart.copy(this._getMouseOnScreen(t.pageX,t.pageY)),this._panEnd.copy(this._panStart)),this.dispatchEvent(Rd)}function nC(t){let e=this.keyState!==ft.NONE?this.keyState:this.state;e===ft.ROTATE&&!this.noRotate?(this._movePrev.copy(this._moveCurr),this._moveCurr.copy(this._getMouseOnCircle(t.pageX,t.pageY))):e===ft.ZOOM&&!this.noZoom?this._zoomEnd.copy(this._getMouseOnScreen(t.pageX,t.pageY)):e===ft.PAN&&!this.noPan&&this._panEnd.copy(this._getMouseOnScreen(t.pageX,t.pageY))}function iC(){this.state=ft.NONE,this.dispatchEvent(Pd)}function rC(t){if(this.enabled!==!1&&this.noZoom!==!0){switch(t.preventDefault(),t.deltaMode){case 2:this._zoomStart.y-=t.deltaY*.025;break;case 1:this._zoomStart.y-=t.deltaY*.01;break;default:this._zoomStart.y-=t.deltaY*25e-5;break}this.dispatchEvent(Rd),this.dispatchEvent(Pd)}}function sC(t){this.enabled!==!1&&t.preventDefault()}function oC(t){if(this._trackPointer(t),this._pointers.length===1)this.state=ft.TOUCH_ROTATE,this._moveCurr.copy(this._getMouseOnCircle(this._pointers[0].pageX,this._pointers[0].pageY)),this._movePrev.copy(this._moveCurr);else{this.state=ft.TOUCH_ZOOM_PAN;let e=this._pointers[0].pageX-this._pointers[1].pageX,n=this._pointers[0].pageY-this._pointers[1].pageY;this._touchZoomDistanceEnd=this._touchZoomDistanceStart=Math.sqrt(e*e+n*n);let i=(this._pointers[0].pageX+this._pointers[1].pageX)/2,r=(this._pointers[0].pageY+this._pointers[1].pageY)/2;this._panStart.copy(this._getMouseOnScreen(i,r)),this._panEnd.copy(this._panStart)}this.dispatchEvent(Rd)}function aC(t){if(this._trackPointer(t),this._pointers.length===1)this._movePrev.copy(this._moveCurr),this._moveCurr.copy(this._getMouseOnCircle(t.pageX,t.pageY));else{let e=this._getSecondPointerPosition(t),n=t.pageX-e.x,i=t.pageY-e.y;this._touchZoomDistanceEnd=Math.sqrt(n*n+i*i);let r=(t.pageX+e.x)/2,s=(t.pageY+e.y)/2;this._panEnd.copy(this._getMouseOnScreen(r,s))}}function cC(t){switch(this._pointers.length){case 0:this.state=ft.NONE;break;case 1:this.state=ft.TOUCH_ROTATE,this._moveCurr.copy(this._getMouseOnCircle(t.pageX,t.pageY)),this._movePrev.copy(this._moveCurr);break;case 2:this.state=ft.TOUCH_ZOOM_PAN;for(let e=0;e<this._pointers.length;e++)if(this._pointers[e].pointerId!==t.pointerId){let n=this._pointerPositions[this._pointers[e].pointerId];this._moveCurr.copy(this._getMouseOnCircle(n.x,n.y)),this._movePrev.copy(this._moveCurr);break}break}this.dispatchEvent(Pd)}var Ne={IDLE:Symbol(),ROTATE:Symbol(),PAN:Symbol(),SCALE:Symbol(),FOV:Symbol(),FOCUS:Symbol(),ZROTATE:Symbol(),TOUCH_MULTI:Symbol(),ANIMATION_FOCUS:Symbol(),ANIMATION_ROTATE:Symbol()},_t={NONE:Symbol(),ONE_FINGER:Symbol(),ONE_FINGER_SWITCHED:Symbol(),TWO_FINGER:Symbol(),MULT_FINGER:Symbol(),CURSOR:Symbol()},et={x:0,y:0},Dn={camera:new Xe,gizmos:new Xe},At={type:"change"},hi={type:"start"},Yn={type:"end"},lC=new Ui,Vt=new R,vv=new Xe,yv=new Xe,li=new R,Ph=1e-6,Ih=class extends Pn{constructor(e,n=null,i=null){super(e,n),this.scene=i,this.target=new R,this._currentTarget=new R,this.radiusFactor=.67,this.mouseActions=[],this._mouseOp=null,this._v2_1=new ne,this._v3_1=new R,this._v3_2=new R,this._m4_1=new Xe,this._m4_2=new Xe,this._quat=new Ht,this._translationMatrix=new Xe,this._rotationMatrix=new Xe,this._scaleMatrix=new Xe,this._rotationAxis=new R,this._cameraMatrixState=new Xe,this._cameraProjectionState=new Xe,this._fovState=1,this._upState=new R,this._zoomState=1,this._nearPos=0,this._farPos=0,this._gizmoMatrixState=new Xe,this._up0=new R,this._zoom0=1,this._fov0=0,this._initialNear=0,this._nearPos0=0,this._initialFar=0,this._farPos0=0,this._cameraMatrixState0=new Xe,this._gizmoMatrixState0=new Xe,this._target0=new R,this._button=-1,this._touchStart=[],this._touchCurrent=[],this._input=_t.NONE,this._switchSensibility=32,this._startFingerDistance=0,this._currentFingerDistance=0,this._startFingerRotation=0,this._currentFingerRotation=0,this._devPxRatio=0,this._downValid=!0,this._nclicks=0,this._downEvents=[],this._downStart=0,this._clickStart=0,this._maxDownTime=250,this._maxInterval=300,this._posThreshold=24,this._movementThreshold=24,this._currentCursorPosition=new R,this._startCursorPosition=new R,this._grid=null,this._gridPosition=new R,this._gizmos=new nn,this._curvePts=128,this._timeStart=-1,this._animationId=-1,this.focusAnimationTime=500,this._timePrev=0,this._timeCurrent=0,this._anglePrev=0,this._angleCurrent=0,this._cursorPosPrev=new R,this._cursorPosCurr=new R,this._wPrev=0,this._wCurr=0,this.adjustNearFar=!1,this.scaleFactor=1.1,this.dampingFactor=25,this.wMax=20,this.enableAnimations=!0,this.enableGrid=!1,this.cursorZoom=!1,this.minFov=5,this.maxFov=90,this.rotateSpeed=1,this.enablePan=!0,this.enableRotate=!0,this.enableZoom=!0,this.enableGizmos=!0,this.enableFocus=!0,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this._tbRadius=1,this._state=Ne.IDLE,this.setCamera(e),this.scene!=null&&this.scene.add(this._gizmos),this.initializeMouseActions(),this._onContextMenu=uC.bind(this),this._onWheel=gC.bind(this),this._onPointerUp=mC.bind(this),this._onPointerMove=pC.bind(this),this._onPointerDown=dC.bind(this),this._onPointerCancel=fC.bind(this),this._onWindowResize=hC.bind(this),n!==null&&this.connect(n)}connect(e){super.connect(e),this.domElement.style.touchAction="none",this._devPxRatio=window.devicePixelRatio,this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.addEventListener("wheel",this._onWheel,{passive:!1}),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerCancel),window.addEventListener("resize",this._onWindowResize)}disconnect(){this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.removeEventListener("pointercancel",this._onPointerCancel),this.domElement.removeEventListener("wheel",this._onWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),window.removeEventListener("pointermove",this._onPointerMove),window.removeEventListener("pointerup",this._onPointerUp),window.removeEventListener("resize",this._onWindowResize)}onSinglePanStart(e,n){if(this.enabled)switch(this.dispatchEvent(hi),this.setCenter(e.clientX,e.clientY),n){case"PAN":if(!this.enablePan)return;this._animationId!=-1&&(cancelAnimationFrame(this._animationId),this._animationId=-1,this._timeStart=-1,this.activateGizmos(!1),this.dispatchEvent(At)),this.updateTbState(Ne.PAN,!0),this._startCursorPosition.copy(this.unprojectOnTbPlane(this.object,et.x,et.y,this.domElement)),this.enableGrid&&(this.drawGrid(),this.dispatchEvent(At));break;case"ROTATE":if(!this.enableRotate)return;this._animationId!=-1&&(cancelAnimationFrame(this._animationId),this._animationId=-1,this._timeStart=-1),this.updateTbState(Ne.ROTATE,!0),this._startCursorPosition.copy(this.unprojectOnTbSurface(this.object,et.x,et.y,this.domElement,this._tbRadius)),this.activateGizmos(!0),this.enableAnimations&&(this._timePrev=this._timeCurrent=performance.now(),this._angleCurrent=this._anglePrev=0,this._cursorPosPrev.copy(this._startCursorPosition),this._cursorPosCurr.copy(this._cursorPosPrev),this._wCurr=0,this._wPrev=this._wCurr),this.dispatchEvent(At);break;case"FOV":if(!this.object.isPerspectiveCamera||!this.enableZoom)return;this._animationId!=-1&&(cancelAnimationFrame(this._animationId),this._animationId=-1,this._timeStart=-1,this.activateGizmos(!1),this.dispatchEvent(At)),this.updateTbState(Ne.FOV,!0),this._startCursorPosition.setY(this.getCursorNDC(et.x,et.y,this.domElement).y*.5),this._currentCursorPosition.copy(this._startCursorPosition);break;case"ZOOM":if(!this.enableZoom)return;this._animationId!=-1&&(cancelAnimationFrame(this._animationId),this._animationId=-1,this._timeStart=-1,this.activateGizmos(!1),this.dispatchEvent(At)),this.updateTbState(Ne.SCALE,!0),this._startCursorPosition.setY(this.getCursorNDC(et.x,et.y,this.domElement).y*.5),this._currentCursorPosition.copy(this._startCursorPosition);break}}onSinglePanMove(e,n){if(this.enabled){let i=n!=this._state;switch(this.setCenter(e.clientX,e.clientY),n){case Ne.PAN:this.enablePan&&(i?(this.dispatchEvent(Yn),this.dispatchEvent(hi),this.updateTbState(n,!0),this._startCursorPosition.copy(this.unprojectOnTbPlane(this.object,et.x,et.y,this.domElement)),this.enableGrid&&this.drawGrid(),this.activateGizmos(!1)):(this._currentCursorPosition.copy(this.unprojectOnTbPlane(this.object,et.x,et.y,this.domElement)),this.applyTransformMatrix(this.pan(this._startCursorPosition,this._currentCursorPosition))));break;case Ne.ROTATE:if(this.enableRotate)if(i)this.dispatchEvent(Yn),this.dispatchEvent(hi),this.updateTbState(n,!0),this._startCursorPosition.copy(this.unprojectOnTbSurface(this.object,et.x,et.y,this.domElement,this._tbRadius)),this.enableGrid&&this.disposeGrid(),this.activateGizmos(!0);else{this._currentCursorPosition.copy(this.unprojectOnTbSurface(this.object,et.x,et.y,this.domElement,this._tbRadius));let r=this._startCursorPosition.distanceTo(this._currentCursorPosition),s=this._startCursorPosition.angleTo(this._currentCursorPosition),o=Math.max(r/this._tbRadius,s)*this.rotateSpeed;this.applyTransformMatrix(this.rotate(this.calculateRotationAxis(this._startCursorPosition,this._currentCursorPosition),o)),this.enableAnimations&&(this._timePrev=this._timeCurrent,this._timeCurrent=performance.now(),this._anglePrev=this._angleCurrent,this._angleCurrent=o,this._cursorPosPrev.copy(this._cursorPosCurr),this._cursorPosCurr.copy(this._currentCursorPosition),this._wPrev=this._wCurr,this._wCurr=this.calculateAngularSpeed(this._anglePrev,this._angleCurrent,this._timePrev,this._timeCurrent))}break;case Ne.SCALE:if(this.enableZoom)if(i)this.dispatchEvent(Yn),this.dispatchEvent(hi),this.updateTbState(n,!0),this._startCursorPosition.setY(this.getCursorNDC(et.x,et.y,this.domElement).y*.5),this._currentCursorPosition.copy(this._startCursorPosition),this.enableGrid&&this.disposeGrid(),this.activateGizmos(!1);else{this._currentCursorPosition.setY(this.getCursorNDC(et.x,et.y,this.domElement).y*.5);let s=this._currentCursorPosition.y-this._startCursorPosition.y,o=1;s<0?o=1/Math.pow(this.scaleFactor,-s*8):s>0&&(o=Math.pow(this.scaleFactor,s*8)),this._v3_1.setFromMatrixPosition(this._gizmoMatrixState),this.applyTransformMatrix(this.scale(o,this._v3_1))}break;case Ne.FOV:if(this.enableZoom&&this.object.isPerspectiveCamera)if(i)this.dispatchEvent(Yn),this.dispatchEvent(hi),this.updateTbState(n,!0),this._startCursorPosition.setY(this.getCursorNDC(et.x,et.y,this.domElement).y*.5),this._currentCursorPosition.copy(this._startCursorPosition),this.enableGrid&&this.disposeGrid(),this.activateGizmos(!1);else{this._currentCursorPosition.setY(this.getCursorNDC(et.x,et.y,this.domElement).y*.5);let s=this._currentCursorPosition.y-this._startCursorPosition.y,o=1;s<0?o=1/Math.pow(this.scaleFactor,-s*8):s>0&&(o=Math.pow(this.scaleFactor,s*8)),this._v3_1.setFromMatrixPosition(this._cameraMatrixState);let a=this._v3_1.distanceTo(this._gizmos.position),l=a/o;l=gt.clamp(l,this.minDistance,this.maxDistance);let c=a*Math.tan(gt.DEG2RAD*this._fovState*.5),h=gt.RAD2DEG*(Math.atan(c/l)*2);h=gt.clamp(h,this.minFov,this.maxFov);let u=c/Math.tan(gt.DEG2RAD*(h/2));o=a/u,this._v3_2.setFromMatrixPosition(this._gizmoMatrixState),this.setFov(h),this.applyTransformMatrix(this.scale(o,this._v3_2,!1)),Vt.copy(this._gizmos.position).sub(this.object.position).normalize().multiplyScalar(u/a),this._m4_1.makeTranslation(Vt.x,Vt.y,Vt.z)}break}this.dispatchEvent(At)}}onSinglePanEnd(){if(this._state==Ne.ROTATE){if(!this.enableRotate)return;if(this.enableAnimations)if(performance.now()-this._timeCurrent<120){let n=Math.abs((this._wPrev+this._wCurr)/2),i=this;this._animationId=window.requestAnimationFrame(function(r){i.updateTbState(Ne.ANIMATION_ROTATE,!0);let s=i.calculateRotationAxis(i._cursorPosPrev,i._cursorPosCurr);i.onRotationAnim(r,s,Math.min(n,i.wMax))})}else this.updateTbState(Ne.IDLE,!1),this.activateGizmos(!1),this.dispatchEvent(At);else this.updateTbState(Ne.IDLE,!1),this.activateGizmos(!1),this.dispatchEvent(At)}else(this._state==Ne.PAN||this._state==Ne.IDLE)&&(this.updateTbState(Ne.IDLE,!1),this.enableGrid&&this.disposeGrid(),this.activateGizmos(!1),this.dispatchEvent(At));this.dispatchEvent(Yn)}onDoubleTap(e){if(this.enabled&&this.enablePan&&this.enableFocus&&this.scene!=null){this.dispatchEvent(hi),this.setCenter(e.clientX,e.clientY);let n=this.unprojectOnObj(this.getCursorNDC(et.x,et.y,this.domElement),this.object);if(n!=null&&this.enableAnimations){let i=this;this._animationId!=-1&&window.cancelAnimationFrame(this._animationId),this._timeStart=-1,this._animationId=window.requestAnimationFrame(function(r){i.updateTbState(Ne.ANIMATION_FOCUS,!0),i.onFocusAnim(r,n,i._cameraMatrixState,i._gizmoMatrixState)})}else n!=null&&!this.enableAnimations&&(this.updateTbState(Ne.FOCUS,!0),this.focus(n,this.scaleFactor),this.updateTbState(Ne.IDLE,!1),this.dispatchEvent(At))}this.dispatchEvent(Yn)}onDoublePanStart(){this.enabled&&this.enablePan&&(this.dispatchEvent(hi),this.updateTbState(Ne.PAN,!0),this.setCenter((this._touchCurrent[0].clientX+this._touchCurrent[1].clientX)/2,(this._touchCurrent[0].clientY+this._touchCurrent[1].clientY)/2),this._startCursorPosition.copy(this.unprojectOnTbPlane(this.object,et.x,et.y,this.domElement,!0)),this._currentCursorPosition.copy(this._startCursorPosition),this.activateGizmos(!1))}onDoublePanMove(){this.enabled&&this.enablePan&&(this.setCenter((this._touchCurrent[0].clientX+this._touchCurrent[1].clientX)/2,(this._touchCurrent[0].clientY+this._touchCurrent[1].clientY)/2),this._state!=Ne.PAN&&(this.updateTbState(Ne.PAN,!0),this._startCursorPosition.copy(this._currentCursorPosition)),this._currentCursorPosition.copy(this.unprojectOnTbPlane(this.object,et.x,et.y,this.domElement,!0)),this.applyTransformMatrix(this.pan(this._startCursorPosition,this._currentCursorPosition,!0)),this.dispatchEvent(At))}onDoublePanEnd(){this.updateTbState(Ne.IDLE,!1),this.dispatchEvent(Yn)}onRotateStart(){this.enabled&&this.enableRotate&&(this.dispatchEvent(hi),this.updateTbState(Ne.ZROTATE,!0),this._startFingerRotation=this.getAngle(this._touchCurrent[1],this._touchCurrent[0])+this.getAngle(this._touchStart[1],this._touchStart[0]),this._currentFingerRotation=this._startFingerRotation,this.object.getWorldDirection(this._rotationAxis),!this.enablePan&&!this.enableZoom&&this.activateGizmos(!0))}onRotateMove(){if(this.enabled&&this.enableRotate){this.setCenter((this._touchCurrent[0].clientX+this._touchCurrent[1].clientX)/2,(this._touchCurrent[0].clientY+this._touchCurrent[1].clientY)/2);let e;this._state!=Ne.ZROTATE&&(this.updateTbState(Ne.ZROTATE,!0),this._startFingerRotation=this._currentFingerRotation),this._currentFingerRotation=this.getAngle(this._touchCurrent[1],this._touchCurrent[0])+this.getAngle(this._touchStart[1],this._touchStart[0]),this.enablePan?(this._v3_2.setFromMatrixPosition(this._gizmoMatrixState),e=this.unprojectOnTbPlane(this.object,et.x,et.y,this.domElement).applyQuaternion(this.object.quaternion).multiplyScalar(1/this.object.zoom).add(this._v3_2)):e=new R().setFromMatrixPosition(this._gizmoMatrixState);let n=gt.DEG2RAD*(this._startFingerRotation-this._currentFingerRotation);this.applyTransformMatrix(this.zRotate(e,n)),this.dispatchEvent(At)}}onRotateEnd(){this.updateTbState(Ne.IDLE,!1),this.activateGizmos(!1),this.dispatchEvent(Yn)}onPinchStart(){this.enabled&&this.enableZoom&&(this.dispatchEvent(hi),this.updateTbState(Ne.SCALE,!0),this._startFingerDistance=this.calculatePointersDistance(this._touchCurrent[0],this._touchCurrent[1]),this._currentFingerDistance=this._startFingerDistance,this.activateGizmos(!1))}onPinchMove(){if(this.enabled&&this.enableZoom){this.setCenter((this._touchCurrent[0].clientX+this._touchCurrent[1].clientX)/2,(this._touchCurrent[0].clientY+this._touchCurrent[1].clientY)/2);let e=12;this._state!=Ne.SCALE&&(this._startFingerDistance=this._currentFingerDistance,this.updateTbState(Ne.SCALE,!0)),this._currentFingerDistance=Math.max(this.calculatePointersDistance(this._touchCurrent[0],this._touchCurrent[1]),e*this._devPxRatio);let n=this._currentFingerDistance/this._startFingerDistance,i;this.enablePan?this.object.isOrthographicCamera?i=this.unprojectOnTbPlane(this.object,et.x,et.y,this.domElement).applyQuaternion(this.object.quaternion).multiplyScalar(1/this.object.zoom).add(this._gizmos.position):this.object.isPerspectiveCamera&&(i=this.unprojectOnTbPlane(this.object,et.x,et.y,this.domElement).applyQuaternion(this.object.quaternion).add(this._gizmos.position)):i=this._gizmos.position,this.applyTransformMatrix(this.scale(n,i)),this.dispatchEvent(At)}}onPinchEnd(){this.updateTbState(Ne.IDLE,!1),this.dispatchEvent(Yn)}onTriplePanStart(){if(this.enabled&&this.enableZoom){this.dispatchEvent(hi),this.updateTbState(Ne.SCALE,!0);let e=0,n=0,i=this._touchCurrent.length;for(let r=0;r<i;r++)e+=this._touchCurrent[r].clientX,n+=this._touchCurrent[r].clientY;this.setCenter(e/i,n/i),this._startCursorPosition.setY(this.getCursorNDC(et.x,et.y,this.domElement).y*.5),this._currentCursorPosition.copy(this._startCursorPosition)}}onTriplePanMove(){if(this.enabled&&this.enableZoom){let e=0,n=0,i=this._touchCurrent.length;for(let d=0;d<i;d++)e+=this._touchCurrent[d].clientX,n+=this._touchCurrent[d].clientY;this.setCenter(e/i,n/i);let r=8;this._currentCursorPosition.setY(this.getCursorNDC(et.x,et.y,this.domElement).y*.5);let s=this._currentCursorPosition.y-this._startCursorPosition.y,o=1;s<0?o=1/Math.pow(this.scaleFactor,-s*r):s>0&&(o=Math.pow(this.scaleFactor,s*r)),this._v3_1.setFromMatrixPosition(this._cameraMatrixState);let a=this._v3_1.distanceTo(this._gizmos.position),l=a/o;l=gt.clamp(l,this.minDistance,this.maxDistance);let c=a*Math.tan(gt.DEG2RAD*this._fovState*.5),h=gt.RAD2DEG*(Math.atan(c/l)*2);h=gt.clamp(h,this.minFov,this.maxFov);let u=c/Math.tan(gt.DEG2RAD*(h/2));o=a/u,this._v3_2.setFromMatrixPosition(this._gizmoMatrixState),this.setFov(h),this.applyTransformMatrix(this.scale(o,this._v3_2,!1)),Vt.copy(this._gizmos.position).sub(this.object.position).normalize().multiplyScalar(u/a),this._m4_1.makeTranslation(Vt.x,Vt.y,Vt.z),this.dispatchEvent(At)}}onTriplePanEnd(){this.updateTbState(Ne.IDLE,!1),this.dispatchEvent(Yn)}setCenter(e,n){et.x=e,et.y=n}initializeMouseActions(){this.setMouseAction("PAN",0,"CTRL"),this.setMouseAction("PAN",2),this.setMouseAction("ROTATE",0),this.setMouseAction("ZOOM","WHEEL"),this.setMouseAction("ZOOM",1),this.setMouseAction("FOV","WHEEL","SHIFT"),this.setMouseAction("FOV",1,"SHIFT")}compareMouseAction(e,n){return e.operation==n.operation?e.mouse==n.mouse&&e.key==n.key:!1}setMouseAction(e,n,i=null){let r=["PAN","ROTATE","ZOOM","FOV"],s=[0,1,2,"WHEEL"],o=["CTRL","SHIFT",null],a;if(!r.includes(e)||!s.includes(n)||!o.includes(i)||n=="WHEEL"&&e!="ZOOM"&&e!="FOV")return!1;switch(e){case"PAN":a=Ne.PAN;break;case"ROTATE":a=Ne.ROTATE;break;case"ZOOM":a=Ne.SCALE;break;case"FOV":a=Ne.FOV;break}let l={operation:e,mouse:n,key:i,state:a};for(let c=0;c<this.mouseActions.length;c++)if(this.mouseActions[c].mouse==l.mouse&&this.mouseActions[c].key==l.key)return this.mouseActions.splice(c,1,l),!0;return this.mouseActions.push(l),!0}unsetMouseAction(e,n=null){for(let i=0;i<this.mouseActions.length;i++)if(this.mouseActions[i].mouse==e&&this.mouseActions[i].key==n)return this.mouseActions.splice(i,1),!0;return!1}getOpFromAction(e,n){let i;for(let r=0;r<this.mouseActions.length;r++)if(i=this.mouseActions[r],i.mouse==e&&i.key==n)return i.operation;if(n!=null){for(let r=0;r<this.mouseActions.length;r++)if(i=this.mouseActions[r],i.mouse==e&&i.key==null)return i.operation}return null}getOpStateFromAction(e,n){let i;for(let r=0;r<this.mouseActions.length;r++)if(i=this.mouseActions[r],i.mouse==e&&i.key==n)return i.state;if(n!=null){for(let r=0;r<this.mouseActions.length;r++)if(i=this.mouseActions[r],i.mouse==e&&i.key==null)return i.state}return null}getAngle(e,n){return Math.atan2(n.clientY-e.clientY,n.clientX-e.clientX)*180/Math.PI}updateTouchEvent(e){for(let n=0;n<this._touchCurrent.length;n++)if(this._touchCurrent[n].pointerId==e.pointerId){this._touchCurrent.splice(n,1,e);break}}applyTransformMatrix(e){if(e.camera!=null&&(this._m4_1.copy(this._cameraMatrixState).premultiply(e.camera),this._m4_1.decompose(this.object.position,this.object.quaternion,this.object.scale),this.object.updateMatrix(),(this._state==Ne.ROTATE||this._state==Ne.ZROTATE||this._state==Ne.ANIMATION_ROTATE)&&this.object.up.copy(this._upState).applyQuaternion(this.object.quaternion)),e.gizmos!=null&&(this._m4_1.copy(this._gizmoMatrixState).premultiply(e.gizmos),this._m4_1.decompose(this._gizmos.position,this._gizmos.quaternion,this._gizmos.scale),this._gizmos.updateMatrix()),this._state==Ne.SCALE||this._state==Ne.FOCUS||this._state==Ne.ANIMATION_FOCUS)if(this._tbRadius=this.calculateTbRadius(this.object),this.adjustNearFar){let n=this.object.position.distanceTo(this._gizmos.position),i=new vn;i.setFromObject(this._gizmos);let r=new di;i.getBoundingSphere(r);let s=Math.max(this._nearPos0,r.radius+r.center.length()),o=n-this._initialNear,a=Math.min(s,o);this.object.near=n-a;let l=Math.min(this._farPos0,-r.radius+r.center.length()),c=n-this._initialFar,h=Math.min(l,c);this.object.far=n-h,this.object.updateProjectionMatrix()}else{let n=!1;this.object.near!=this._initialNear&&(this.object.near=this._initialNear,n=!0),this.object.far!=this._initialFar&&(this.object.far=this._initialFar,n=!0),n&&this.object.updateProjectionMatrix()}}calculateAngularSpeed(e,n,i,r){let s=n-e,o=(r-i)/1e3;return o==0?0:s/o}calculatePointersDistance(e,n){return Math.sqrt(Math.pow(n.clientX-e.clientX,2)+Math.pow(n.clientY-e.clientY,2))}calculateRotationAxis(e,n){return this._rotationMatrix.extractRotation(this._cameraMatrixState),this._quat.setFromRotationMatrix(this._rotationMatrix),this._rotationAxis.crossVectors(e,n).applyQuaternion(this._quat),this._rotationAxis.normalize().clone()}calculateTbRadius(e){let n=e.position.distanceTo(this._gizmos.position);if(e.type=="PerspectiveCamera"){let i=gt.DEG2RAD*e.fov*.5,r=Math.atan(e.aspect*Math.tan(i));return Math.tan(Math.min(i,r))*n*this.radiusFactor}else if(e.type=="OrthographicCamera")return Math.min(e.top,e.right)*this.radiusFactor}focus(e,n,i=1){Vt.copy(e).sub(this._gizmos.position).multiplyScalar(i),this._translationMatrix.makeTranslation(Vt.x,Vt.y,Vt.z),vv.copy(this._gizmoMatrixState),this._gizmoMatrixState.premultiply(this._translationMatrix),this._gizmoMatrixState.decompose(this._gizmos.position,this._gizmos.quaternion,this._gizmos.scale),yv.copy(this._cameraMatrixState),this._cameraMatrixState.premultiply(this._translationMatrix),this._cameraMatrixState.decompose(this.object.position,this.object.quaternion,this.object.scale),this.enableZoom&&this.applyTransformMatrix(this.scale(n,this._gizmos.position)),this._gizmoMatrixState.copy(vv),this._cameraMatrixState.copy(yv)}drawGrid(){if(this.scene!=null){let i,r,s,o;if(this.object.isOrthographicCamera){let a=this.object.right-this.object.left,l=this.object.bottom-this.object.top;s=Math.max(a,l),o=s/20,i=s/this.object.zoom*3,r=i/o*this.object.zoom}else if(this.object.isPerspectiveCamera){let a=this.object.position.distanceTo(this._gizmos.position),l=gt.DEG2RAD*this.object.fov*.5,c=Math.atan(this.object.aspect*Math.tan(l));s=Math.tan(Math.max(l,c))*a*2,o=s/20,i=s*3,r=i/o}this._grid==null&&(this._grid=new Jo(i,r,8947848,8947848),this._grid.position.copy(this._gizmos.position),this._gridPosition.copy(this._grid.position),this._grid.quaternion.copy(this.object.quaternion),this._grid.rotateX(Math.PI*.5),this.scene.add(this._grid))}}dispose(){this._animationId!=-1&&window.cancelAnimationFrame(this._animationId),this.disconnect(),this.scene!==null&&this.scene.remove(this._gizmos),this.disposeGrid()}disposeGrid(){this._grid!=null&&this.scene!=null&&(this.scene.remove(this._grid),this._grid=null)}easeOutCubic(e){return 1-Math.pow(1-e,3)}activateGizmos(e){let n=this._gizmos.children[0],i=this._gizmos.children[1],r=this._gizmos.children[2];e?(n.material.setValues({opacity:1}),i.material.setValues({opacity:1}),r.material.setValues({opacity:1})):(n.material.setValues({opacity:.6}),i.material.setValues({opacity:.6}),r.material.setValues({opacity:.6}))}getCursorNDC(e,n,i){let r=i.getBoundingClientRect();return this._v2_1.setX((e-r.left)/r.width*2-1),this._v2_1.setY((r.bottom-n)/r.height*2-1),this._v2_1.clone()}getCursorPosition(e,n,i){return this._v2_1.copy(this.getCursorNDC(e,n,i)),this._v2_1.x*=(this.object.right-this.object.left)*.5,this._v2_1.y*=(this.object.top-this.object.bottom)*.5,this._v2_1.clone()}setCamera(e){e.lookAt(this.target),e.updateMatrix(),e.type=="PerspectiveCamera"&&(this._fov0=e.fov,this._fovState=e.fov),this._cameraMatrixState0.copy(e.matrix),this._cameraMatrixState.copy(this._cameraMatrixState0),this._cameraProjectionState.copy(e.projectionMatrix),this._zoom0=e.zoom,this._zoomState=this._zoom0,this._initialNear=e.near,this._nearPos0=e.position.distanceTo(this.target)-e.near,this._nearPos=this._initialNear,this._initialFar=e.far,this._farPos0=e.position.distanceTo(this.target)-e.far,this._farPos=this._initialFar,this._up0.copy(e.up),this._upState.copy(e.up),this.object=e,this.object.updateProjectionMatrix(),this._tbRadius=this.calculateTbRadius(e),this.makeGizmos(this.target,this._tbRadius)}setGizmosVisible(e){this._gizmos.visible=e,this.dispatchEvent(At)}setTbRadius(e){this.radiusFactor=e,this._tbRadius=this.calculateTbRadius(this.object);let i=new mi(0,0,this._tbRadius,this._tbRadius).getPoints(this._curvePts),r=new St().setFromPoints(i);for(let s in this._gizmos.children)this._gizmos.children[s].geometry=r;this.dispatchEvent(At)}makeGizmos(e,n){let r=new mi(0,0,n,n).getPoints(this._curvePts),s=new St().setFromPoints(r),o=new ni({color:16744576,fog:!1,transparent:!0,opacity:.6}),a=new ni({color:8454016,fog:!1,transparent:!0,opacity:.6}),l=new ni({color:8421631,fog:!1,transparent:!0,opacity:.6}),c=new pi(s,o),h=new pi(s,a),u=new pi(s,l),d=Math.PI*.5;if(c.rotation.x=d,h.rotation.y=d,this._gizmoMatrixState0.identity().setPosition(e),this._gizmoMatrixState.copy(this._gizmoMatrixState0),this.object.zoom!==1){let f=1/this.object.zoom;this._scaleMatrix.makeScale(f,f,f),this._translationMatrix.makeTranslation(-e.x,-e.y,-e.z),this._gizmoMatrixState.premultiply(this._translationMatrix).premultiply(this._scaleMatrix),this._translationMatrix.makeTranslation(e.x,e.y,e.z),this._gizmoMatrixState.premultiply(this._translationMatrix)}this._gizmoMatrixState.decompose(this._gizmos.position,this._gizmos.quaternion,this._gizmos.scale),this._gizmos.traverse(function(f){f.isLine&&(f.geometry.dispose(),f.material.dispose())}),this._gizmos.clear(),this._gizmos.add(c),this._gizmos.add(h),this._gizmos.add(u)}onFocusAnim(e,n,i,r){if(this._timeStart==-1&&(this._timeStart=e),this._state==Ne.ANIMATION_FOCUS){let o=(e-this._timeStart)/this.focusAnimationTime;if(this._gizmoMatrixState.copy(r),o>=1)this._gizmoMatrixState.decompose(this._gizmos.position,this._gizmos.quaternion,this._gizmos.scale),this.focus(n,this.scaleFactor),this._timeStart=-1,this.updateTbState(Ne.IDLE,!1),this.activateGizmos(!1),this.dispatchEvent(At);else{let a=this.easeOutCubic(o),l=1-a+this.scaleFactor*a;this._gizmoMatrixState.decompose(this._gizmos.position,this._gizmos.quaternion,this._gizmos.scale),this.focus(n,l,a),this.dispatchEvent(At);let c=this;this._animationId=window.requestAnimationFrame(function(h){c.onFocusAnim(h,n,i,r.clone())})}}else this._animationId=-1,this._timeStart=-1}onRotationAnim(e,n,i){if(this._timeStart==-1&&(this._anglePrev=0,this._angleCurrent=0,this._timeStart=e),this._state==Ne.ANIMATION_ROTATE){let r=(e-this._timeStart)/1e3;if(i+-this.dampingFactor*r>0){this._angleCurrent=.5*-this.dampingFactor*Math.pow(r,2)+i*r+0,this.applyTransformMatrix(this.rotate(n,this._angleCurrent)),this.dispatchEvent(At);let o=this;this._animationId=window.requestAnimationFrame(function(a){o.onRotationAnim(a,n,i)})}else this._animationId=-1,this._timeStart=-1,this.updateTbState(Ne.IDLE,!1),this.activateGizmos(!1),this.dispatchEvent(At)}else this._animationId=-1,this._timeStart=-1,this._state!=Ne.ROTATE&&(this.activateGizmos(!1),this.dispatchEvent(At))}pan(e,n,i=!1){let r=e.clone().sub(n);if(this.object.isOrthographicCamera)r.multiplyScalar(1/this.object.zoom);else if(this.object.isPerspectiveCamera&&i){this._v3_1.setFromMatrixPosition(this._cameraMatrixState0),this._v3_2.setFromMatrixPosition(this._gizmoMatrixState0);let s=this._v3_1.distanceTo(this._v3_2)/this.object.position.distanceTo(this._gizmos.position);r.multiplyScalar(1/s)}return this._v3_1.set(r.x,r.y,0).applyQuaternion(this.object.quaternion),this._m4_1.makeTranslation(this._v3_1.x,this._v3_1.y,this._v3_1.z),this.setTransformationMatrices(this._m4_1,this._m4_1),Dn}reset(){this.target.copy(this._target0),this.object.zoom=this._zoom0,this.object.isPerspectiveCamera&&(this.object.fov=this._fov0),this.object.near=this._nearPos,this.object.far=this._farPos,this._cameraMatrixState.copy(this._cameraMatrixState0),this._cameraMatrixState.decompose(this.object.position,this.object.quaternion,this.object.scale),this.object.up.copy(this._up0),this.object.updateMatrix(),this.object.updateProjectionMatrix(),this._gizmoMatrixState.copy(this._gizmoMatrixState0),this._gizmoMatrixState0.decompose(this._gizmos.position,this._gizmos.quaternion,this._gizmos.scale),this._gizmos.updateMatrix(),this._tbRadius=this.calculateTbRadius(this.object),this.makeGizmos(this._gizmos.position,this._tbRadius),this.object.lookAt(this._gizmos.position),this.updateTbState(Ne.IDLE,!1),this.dispatchEvent(At)}rotate(e,n){let i=this._gizmos.position;return this._translationMatrix.makeTranslation(-i.x,-i.y,-i.z),this._rotationMatrix.makeRotationAxis(e,-n),this._m4_1.makeTranslation(i.x,i.y,i.z),this._m4_1.multiply(this._rotationMatrix),this._m4_1.multiply(this._translationMatrix),this.setTransformationMatrices(this._m4_1),Dn}copyState(){let e;this.object.isOrthographicCamera?e=JSON.stringify({arcballState:{cameraFar:this.object.far,cameraMatrix:this.object.matrix,cameraNear:this.object.near,cameraUp:this.object.up,cameraZoom:this.object.zoom,gizmoMatrix:this._gizmos.matrix,target:this.target}}):this.object.isPerspectiveCamera&&(e=JSON.stringify({arcballState:{cameraFar:this.object.far,cameraFov:this.object.fov,cameraMatrix:this.object.matrix,cameraNear:this.object.near,cameraUp:this.object.up,cameraZoom:this.object.zoom,gizmoMatrix:this._gizmos.matrix,target:this.target}})),navigator.clipboard.writeText(e)}pasteState(){let e=this;navigator.clipboard.readText().then(function(i){e.setStateFromJSON(i)})}saveState(){this.object.updateMatrix(),this._gizmos.updateMatrix(),this._target0.copy(this.target),this._cameraMatrixState0.copy(this.object.matrix),this._gizmoMatrixState0.copy(this._gizmos.matrix),this._nearPos=this.object.near,this._farPos=this.object.far,this._zoom0=this.object.zoom,this._up0.copy(this.object.up),this.object.isPerspectiveCamera&&(this._fov0=this.object.fov)}scale(e,n,i=!0){li.copy(n);let r=1/e;if(this.object.isOrthographicCamera){this.object.zoom=this._zoomState,this.object.zoom*=e,this.object.zoom>this.maxZoom?(this.object.zoom=this.maxZoom,r=this._zoomState/this.maxZoom):this.object.zoom<this.minZoom&&(this.object.zoom=this.minZoom,r=this._zoomState/this.minZoom),this.object.updateProjectionMatrix(),this._v3_1.setFromMatrixPosition(this._gizmoMatrixState),this._scaleMatrix.makeScale(r,r,r),this._translationMatrix.makeTranslation(-this._v3_1.x,-this._v3_1.y,-this._v3_1.z),this._m4_2.makeTranslation(this._v3_1.x,this._v3_1.y,this._v3_1.z).multiply(this._scaleMatrix),this._m4_2.multiply(this._translationMatrix),li.sub(this._v3_1);let s=li.clone().multiplyScalar(r);return li.sub(s),this._m4_1.makeTranslation(li.x,li.y,li.z),this._m4_2.premultiply(this._m4_1),this.setTransformationMatrices(this._m4_1,this._m4_2),Dn}else if(this.object.isPerspectiveCamera){this._v3_1.setFromMatrixPosition(this._cameraMatrixState),this._v3_2.setFromMatrixPosition(this._gizmoMatrixState);let s=this._v3_1.distanceTo(li),o=s-s*r,a=s-o;if(a<this.minDistance?(r=this.minDistance/s,o=s-s*r):a>this.maxDistance&&(r=this.maxDistance/s,o=s-s*r),Vt.copy(li).sub(this._v3_1).normalize().multiplyScalar(o),this._m4_1.makeTranslation(Vt.x,Vt.y,Vt.z),i){let l=this._v3_2;s=l.distanceTo(li),o=s-s*r,Vt.copy(li).sub(this._v3_2).normalize().multiplyScalar(o),this._translationMatrix.makeTranslation(l.x,l.y,l.z),this._scaleMatrix.makeScale(r,r,r),this._m4_2.makeTranslation(Vt.x,Vt.y,Vt.z).multiply(this._translationMatrix),this._m4_2.multiply(this._scaleMatrix),this._translationMatrix.makeTranslation(-l.x,-l.y,-l.z),this._m4_2.multiply(this._translationMatrix),this.setTransformationMatrices(this._m4_1,this._m4_2)}else this.setTransformationMatrices(this._m4_1);return Dn}}setFov(e){this.object.isPerspectiveCamera&&(this.object.fov=gt.clamp(e,this.minFov,this.maxFov),this.object.updateProjectionMatrix())}setTransformationMatrices(e=null,n=null){e!=null?Dn.camera!=null?Dn.camera.copy(e):Dn.camera=e.clone():Dn.camera=null,n!=null?Dn.gizmos!=null?Dn.gizmos.copy(n):Dn.gizmos=n.clone():Dn.gizmos=null}zRotate(e,n){return this._rotationMatrix.makeRotationAxis(this._rotationAxis,n),this._translationMatrix.makeTranslation(-e.x,-e.y,-e.z),this._m4_1.makeTranslation(e.x,e.y,e.z),this._m4_1.multiply(this._rotationMatrix),this._m4_1.multiply(this._translationMatrix),this._v3_1.setFromMatrixPosition(this._gizmoMatrixState).sub(e),this._v3_2.copy(this._v3_1).applyAxisAngle(this._rotationAxis,n),this._v3_2.sub(this._v3_1),this._m4_2.makeTranslation(this._v3_2.x,this._v3_2.y,this._v3_2.z),this.setTransformationMatrices(this._m4_1,this._m4_2),Dn}getRaycaster(){return lC}unprojectOnObj(e,n){let i=this.getRaycaster();i.near=n.near,i.far=n.far,i.setFromCamera(e,n);let r=i.intersectObjects(this.scene.children,!0);for(let s=0;s<r.length;s++)if(r[s].object.uuid!=this._gizmos.uuid&&r[s].face!=null)return r[s].point.clone();return null}unprojectOnTbSurface(e,n,i,r,s){if(e.type=="OrthographicCamera"){this._v2_1.copy(this.getCursorPosition(n,i,r)),this._v3_1.set(this._v2_1.x,this._v2_1.y,0);let o=Math.pow(this._v2_1.x,2),a=Math.pow(this._v2_1.y,2),l=Math.pow(this._tbRadius,2);return o+a<=l*.5?this._v3_1.setZ(Math.sqrt(l-(o+a))):this._v3_1.setZ(l*.5/Math.sqrt(o+a)),this._v3_1}else if(e.type=="PerspectiveCamera"){this._v2_1.copy(this.getCursorNDC(n,i,r)),this._v3_1.set(this._v2_1.x,this._v2_1.y,-1),this._v3_1.applyMatrix4(e.projectionMatrixInverse);let o=this._v3_1.clone().normalize(),a=e.position.distanceTo(this._gizmos.position),l=Math.pow(s,2),c=this._v3_1.z,h=Math.sqrt(Math.pow(this._v3_1.x,2)+Math.pow(this._v3_1.y,2));if(h==0)return o.set(this._v3_1.x,this._v3_1.y,s),o;let u=c/h,d=a,f=Math.pow(u,2)+1,m=2*u*d,_=Math.pow(d,2)-l,g=Math.pow(m,2)-4*f*_;if(g>=0&&(this._v2_1.setX((-m-Math.sqrt(g))/(2*f)),this._v2_1.setY(u*this._v2_1.x+d),gt.RAD2DEG*this._v2_1.angle()>=45)){let y=Math.sqrt(Math.pow(this._v2_1.x,2)+Math.pow(a-this._v2_1.y,2));return o.multiplyScalar(y),o.z+=a,o}f=u,m=d,_=-l*.5,g=Math.pow(m,2)-4*f*_,this._v2_1.setX((-m-Math.sqrt(g))/(2*f)),this._v2_1.setY(u*this._v2_1.x+d);let p=Math.sqrt(Math.pow(this._v2_1.x,2)+Math.pow(a-this._v2_1.y,2));return o.multiplyScalar(p),o.z+=a,o}}unprojectOnTbPlane(e,n,i,r,s=!1){if(e.type=="OrthographicCamera")return this._v2_1.copy(this.getCursorPosition(n,i,r)),this._v3_1.set(this._v2_1.x,this._v2_1.y,0),this._v3_1.clone();if(e.type=="PerspectiveCamera"){this._v2_1.copy(this.getCursorNDC(n,i,r)),this._v3_1.set(this._v2_1.x,this._v2_1.y,-1),this._v3_1.applyMatrix4(e.projectionMatrixInverse);let o=this._v3_1.clone().normalize(),a=this._v3_1.z,l=Math.sqrt(Math.pow(this._v3_1.x,2)+Math.pow(this._v3_1.y,2)),c;if(s?c=this._v3_1.setFromMatrixPosition(this._cameraMatrixState0).distanceTo(this._v3_2.setFromMatrixPosition(this._gizmoMatrixState0)):c=e.position.distanceTo(this._gizmos.position),l==0)return o.set(0,0,0),o;let h=a/l,u=c,d=-u/h,f=Math.sqrt(Math.pow(u,2)+Math.pow(d,2));return o.multiplyScalar(f),o.z=0,o}}updateMatrixState(){this._cameraMatrixState.copy(this.object.matrix),this._gizmoMatrixState.copy(this._gizmos.matrix),this.object.isOrthographicCamera?(this._cameraProjectionState.copy(this.object.projectionMatrix),this.object.updateProjectionMatrix(),this._zoomState=this.object.zoom):this.object.isPerspectiveCamera&&(this._fovState=this.object.fov)}updateTbState(e,n){this._state=e,n&&this.updateMatrixState()}update(){if(this.target.equals(this._currentTarget)===!1&&(this._gizmos.position.copy(this.target),this._tbRadius=this.calculateTbRadius(this.object),this.makeGizmos(this.target,this._tbRadius),this._currentTarget.copy(this.target)),this.object.isOrthographicCamera){if(this.object.zoom>this.maxZoom||this.object.zoom<this.minZoom){let e=gt.clamp(this.object.zoom,this.minZoom,this.maxZoom);this.applyTransformMatrix(this.scale(e/this.object.zoom,this._gizmos.position,!0))}}else if(this.object.isPerspectiveCamera){let e=this.object.position.distanceTo(this._gizmos.position);if(e>this.maxDistance+Ph||e<this.minDistance-Ph){let i=gt.clamp(e,this.minDistance,this.maxDistance);this.applyTransformMatrix(this.scale(i/e,this._gizmos.position)),this.updateMatrixState()}(this.object.fov<this.minFov||this.object.fov>this.maxFov)&&(this.object.fov=gt.clamp(this.object.fov,this.minFov,this.maxFov),this.object.updateProjectionMatrix());let n=this._tbRadius;if(this._tbRadius=this.calculateTbRadius(this.object),n<this._tbRadius-Ph||n>this._tbRadius+Ph){let i=(this._gizmos.scale.x+this._gizmos.scale.y+this._gizmos.scale.z)/3,r=this._tbRadius/i,o=new mi(0,0,r,r).getPoints(this._curvePts),a=new St().setFromPoints(o);for(let l in this._gizmos.children)this._gizmos.children[l].geometry=a}}this.object.lookAt(this._gizmos.position)}setStateFromJSON(e){let n=JSON.parse(e);if(n.arcballState!=null){this.target.fromArray(n.arcballState.target),this._cameraMatrixState.fromArray(n.arcballState.cameraMatrix.elements),this._cameraMatrixState.decompose(this.object.position,this.object.quaternion,this.object.scale),this.object.up.copy(n.arcballState.cameraUp),this.object.near=n.arcballState.cameraNear,this.object.far=n.arcballState.cameraFar,this.object.zoom=n.arcballState.cameraZoom,this.object.isPerspectiveCamera&&(this.object.fov=n.arcballState.cameraFov),this._gizmoMatrixState.fromArray(n.arcballState.gizmoMatrix.elements),this._gizmoMatrixState.decompose(this._gizmos.position,this._gizmos.quaternion,this._gizmos.scale),this.object.updateMatrix(),this.object.updateProjectionMatrix(),this._gizmos.updateMatrix(),this._tbRadius=this.calculateTbRadius(this.object);let i=new Xe().copy(this._gizmoMatrixState0);this.makeGizmos(this._gizmos.position,this._tbRadius),this._gizmoMatrixState0.copy(i),this.object.lookAt(this._gizmos.position),this.updateTbState(Ne.IDLE,!1),this.dispatchEvent(At)}}};function hC(){let t=(this._gizmos.scale.x+this._gizmos.scale.y+this._gizmos.scale.z)/3;this._tbRadius=this.calculateTbRadius(this.object);let e=this._tbRadius/t,i=new mi(0,0,e,e).getPoints(this._curvePts),r=new St().setFromPoints(i);for(let s in this._gizmos.children)this._gizmos.children[s].geometry=r;this.dispatchEvent(At)}function uC(t){if(this.enabled){for(let e=0;e<this.mouseActions.length;e++)if(this.mouseActions[e].mouse==2){t.preventDefault();break}}}function fC(){this._touchStart.splice(0,this._touchStart.length),this._touchCurrent.splice(0,this._touchCurrent.length),this._input=_t.NONE}function dC(t){if(t.button==0&&t.isPrimary?(this._downValid=!0,this._downEvents.push(t),this._downStart=performance.now()):this._downValid=!1,t.pointerType=="touch"&&this._input!=_t.CURSOR)switch(this._touchStart.push(t),this._touchCurrent.push(t),this._input){case _t.NONE:this._input=_t.ONE_FINGER,this.onSinglePanStart(t,"ROTATE"),window.addEventListener("pointermove",this._onPointerMove),window.addEventListener("pointerup",this._onPointerUp);break;case _t.ONE_FINGER:case _t.ONE_FINGER_SWITCHED:this._input=_t.TWO_FINGER,this.onRotateStart(),this.onPinchStart(),this.onDoublePanStart();break;case _t.TWO_FINGER:this._input=_t.MULT_FINGER,this.onTriplePanStart(t);break}else if(t.pointerType!="touch"&&this._input==_t.NONE){let e=null;t.ctrlKey||t.metaKey?e="CTRL":t.shiftKey&&(e="SHIFT"),this._mouseOp=this.getOpFromAction(t.button,e),this._mouseOp!=null&&(window.addEventListener("pointermove",this._onPointerMove),window.addEventListener("pointerup",this._onPointerUp),this._input=_t.CURSOR,this._button=t.button,this.onSinglePanStart(t,this._mouseOp))}}function pC(t){if(t.pointerType=="touch"&&this._input!=_t.CURSOR)switch(this._input){case _t.ONE_FINGER:this.updateTouchEvent(t),this.onSinglePanMove(t,Ne.ROTATE);break;case _t.ONE_FINGER_SWITCHED:if(this.calculatePointersDistance(this._touchCurrent[0],t)*this._devPxRatio>=this._switchSensibility){this._input=_t.ONE_FINGER,this.updateTouchEvent(t),this.onSinglePanStart(t,"ROTATE");break}break;case _t.TWO_FINGER:this.updateTouchEvent(t),this.onRotateMove(),this.onPinchMove(),this.onDoublePanMove();break;case _t.MULT_FINGER:this.updateTouchEvent(t),this.onTriplePanMove(t);break}else if(t.pointerType!="touch"&&this._input==_t.CURSOR){let e=null;t.ctrlKey||t.metaKey?e="CTRL":t.shiftKey&&(e="SHIFT");let n=this.getOpStateFromAction(this._button,e);n!=null&&this.onSinglePanMove(t,n)}this._downValid&&this.calculatePointersDistance(this._downEvents[this._downEvents.length-1],t)*this._devPxRatio>this._movementThreshold&&(this._downValid=!1)}function mC(t){if(t.pointerType=="touch"&&this._input!=_t.CURSOR){let e=this._touchCurrent.length;for(let n=0;n<e;n++)if(this._touchCurrent[n].pointerId==t.pointerId){this._touchCurrent.splice(n,1),this._touchStart.splice(n,1);break}switch(this._input){case _t.ONE_FINGER:case _t.ONE_FINGER_SWITCHED:window.removeEventListener("pointermove",this._onPointerMove),window.removeEventListener("pointerup",this._onPointerUp),this._input=_t.NONE,this.onSinglePanEnd();break;case _t.TWO_FINGER:this.onDoublePanEnd(t),this.onPinchEnd(t),this.onRotateEnd(t),this._input=_t.ONE_FINGER_SWITCHED;break;case _t.MULT_FINGER:this._touchCurrent.length==0&&(window.removeEventListener("pointermove",this._onPointerMove),window.removeEventListener("pointerup",this._onPointerUp),this._input=_t.NONE,this.onTriplePanEnd());break}}else t.pointerType!="touch"&&this._input==_t.CURSOR&&(window.removeEventListener("pointermove",this._onPointerMove),window.removeEventListener("pointerup",this._onPointerUp),this._input=_t.NONE,this.onSinglePanEnd(),this._button=-1);if(t.isPrimary)if(this._downValid)if(t.timeStamp-this._downEvents[this._downEvents.length-1].timeStamp<=this._maxDownTime)if(this._nclicks==0)this._nclicks=1,this._clickStart=performance.now();else{let n=t.timeStamp-this._clickStart,i=this.calculatePointersDistance(this._downEvents[1],this._downEvents[0])*this._devPxRatio;n<=this._maxInterval&&i<=this._posThreshold?(this._nclicks=0,this._downEvents.splice(0,this._downEvents.length),this.onDoubleTap(t)):(this._nclicks=1,this._downEvents.shift(),this._clickStart=performance.now())}else this._downValid=!1,this._nclicks=0,this._downEvents.splice(0,this._downEvents.length);else this._nclicks=0,this._downEvents.splice(0,this._downEvents.length)}function gC(t){if(this.enabled&&this.enableZoom){let e=null;t.ctrlKey||t.metaKey?e="CTRL":t.shiftKey&&(e="SHIFT");let n=this.getOpFromAction("WHEEL",e);if(n!=null){t.preventDefault(),this.dispatchEvent(hi);let i=125,r=t.deltaY/i,s=1;switch(r>0?s=1/this.scaleFactor:r<0&&(s=this.scaleFactor),n){case"ZOOM":if(this.updateTbState(Ne.SCALE,!0),r>0?s=1/Math.pow(this.scaleFactor,r):r<0&&(s=Math.pow(this.scaleFactor,-r)),this.cursorZoom&&this.enablePan){let o;this.object.isOrthographicCamera?o=this.unprojectOnTbPlane(this.object,t.clientX,t.clientY,this.domElement).applyQuaternion(this.object.quaternion).multiplyScalar(1/this.object.zoom).add(this._gizmos.position):this.object.isPerspectiveCamera&&(o=this.unprojectOnTbPlane(this.object,t.clientX,t.clientY,this.domElement).applyQuaternion(this.object.quaternion).add(this._gizmos.position)),this.applyTransformMatrix(this.scale(s,o))}else this.applyTransformMatrix(this.scale(s,this._gizmos.position));this._grid!=null&&(this.disposeGrid(),this.drawGrid()),this.updateTbState(Ne.IDLE,!1),this.dispatchEvent(At),this.dispatchEvent(Yn);break;case"FOV":if(this.object.isPerspectiveCamera){this.updateTbState(Ne.FOV,!0),t.deltaX!=0&&(r=t.deltaX/i,s=1,r>0?s=1/Math.pow(this.scaleFactor,r):r<0&&(s=Math.pow(this.scaleFactor,-r))),this._v3_1.setFromMatrixPosition(this._cameraMatrixState);let o=this._v3_1.distanceTo(this._gizmos.position),a=o/s;a=gt.clamp(a,this.minDistance,this.maxDistance);let l=o*Math.tan(gt.DEG2RAD*this.object.fov*.5),c=gt.RAD2DEG*(Math.atan(l/a)*2);c>this.maxFov?c=this.maxFov:c<this.minFov&&(c=this.minFov);let h=l/Math.tan(gt.DEG2RAD*(c/2));s=o/h,this.setFov(c),this.applyTransformMatrix(this.scale(s,this._gizmos.position,!1))}this._grid!=null&&(this.disposeGrid(),this.drawGrid()),this.updateTbState(Ne.IDLE,!1),this.dispatchEvent(At),this.dispatchEvent(Yn);break}}}}var xv={type:"change"},Dd={type:"start"},Mv={type:"end"},Dh=new Li,bv=new _n,_C=Math.cos(70*gt.DEG2RAD),jt=new R,bn=2*Math.PI,bt={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},Id=1e-6,Lh=class extends Pn{constructor(e,n=null){super(e,n),this.state=bt.NONE,this.target=new R,this.cursor=new R,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.keyRotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:zt.ROTATE,MIDDLE:zt.DOLLY,RIGHT:zt.PAN},this.touches={ONE:Gn.ROTATE,TWO:Gn.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._domElementKeyEvents=null,this._lastPosition=new R,this._lastQuaternion=new Ht,this._lastTargetPosition=new R,this._quat=new Ht().setFromUnitVectors(e.up,new R(0,1,0)),this._quatInverse=this._quat.clone().invert(),this._spherical=new Ls,this._sphericalDelta=new Ls,this._scale=1,this._panOffset=new R,this._rotateStart=new ne,this._rotateEnd=new ne,this._rotateDelta=new ne,this._panStart=new ne,this._panEnd=new ne,this._panDelta=new ne,this._dollyStart=new ne,this._dollyEnd=new ne,this._dollyDelta=new ne,this._dollyDirection=new R,this._mouse=new ne,this._performCursorZoom=!1,this._pointers=[],this._pointerPositions={},this._controlActive=!1,this._onPointerMove=yC.bind(this),this._onPointerDown=vC.bind(this),this._onPointerUp=xC.bind(this),this._onContextMenu=AC.bind(this),this._onMouseWheel=SC.bind(this),this._onKeyDown=wC.bind(this),this._onTouchStart=EC.bind(this),this._onTouchMove=TC.bind(this),this._onMouseDown=bC.bind(this),this._onMouseMove=MC.bind(this),this._interceptControlDown=CC.bind(this),this._interceptControlUp=RC.bind(this),this.domElement!==null&&this.connect(this.domElement),this.update()}connect(e){super.connect(e),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerUp),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.addEventListener("wheel",this._onMouseWheel,{passive:!1}),this.domElement.getRootNode().addEventListener("keydown",this._interceptControlDown,{passive:!0,capture:!0}),this.domElement.style.touchAction="none"}disconnect(){this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.removeEventListener("pointermove",this._onPointerMove),this.domElement.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerUp),this.domElement.removeEventListener("wheel",this._onMouseWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.stopListenToKeyEvents(),this.domElement.getRootNode().removeEventListener("keydown",this._interceptControlDown,{capture:!0}),this.domElement.style.touchAction="auto"}dispose(){this.disconnect()}getPolarAngle(){return this._spherical.phi}getAzimuthalAngle(){return this._spherical.theta}getDistance(){return this.object.position.distanceTo(this.target)}listenToKeyEvents(e){e.addEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=e}stopListenToKeyEvents(){this._domElementKeyEvents!==null&&(this._domElementKeyEvents.removeEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=null)}saveState(){this.target0.copy(this.target),this.position0.copy(this.object.position),this.zoom0=this.object.zoom}reset(){this.target.copy(this.target0),this.object.position.copy(this.position0),this.object.zoom=this.zoom0,this.object.updateProjectionMatrix(),this.dispatchEvent(xv),this.update(),this.state=bt.NONE}update(e=null){let n=this.object.position;jt.copy(n).sub(this.target),jt.applyQuaternion(this._quat),this._spherical.setFromVector3(jt),this.autoRotate&&this.state===bt.NONE&&this._rotateLeft(this._getAutoRotationAngle(e)),this.enableDamping?(this._spherical.theta+=this._sphericalDelta.theta*this.dampingFactor,this._spherical.phi+=this._sphericalDelta.phi*this.dampingFactor):(this._spherical.theta+=this._sphericalDelta.theta,this._spherical.phi+=this._sphericalDelta.phi);let i=this.minAzimuthAngle,r=this.maxAzimuthAngle;isFinite(i)&&isFinite(r)&&(i<-Math.PI?i+=bn:i>Math.PI&&(i-=bn),r<-Math.PI?r+=bn:r>Math.PI&&(r-=bn),i<=r?this._spherical.theta=Math.max(i,Math.min(r,this._spherical.theta)):this._spherical.theta=this._spherical.theta>(i+r)/2?Math.max(i,this._spherical.theta):Math.min(r,this._spherical.theta)),this._spherical.phi=Math.max(this.minPolarAngle,Math.min(this.maxPolarAngle,this._spherical.phi)),this._spherical.makeSafe(),this.enableDamping===!0?this.target.addScaledVector(this._panOffset,this.dampingFactor):this.target.add(this._panOffset),this.target.sub(this.cursor),this.target.clampLength(this.minTargetRadius,this.maxTargetRadius),this.target.add(this.cursor);let s=!1;if(this.zoomToCursor&&this._performCursorZoom||this.object.isOrthographicCamera)this._spherical.radius=this._clampDistance(this._spherical.radius);else{let o=this._spherical.radius;this._spherical.radius=this._clampDistance(this._spherical.radius*this._scale),s=o!=this._spherical.radius}if(jt.setFromSpherical(this._spherical),jt.applyQuaternion(this._quatInverse),n.copy(this.target).add(jt),this.object.lookAt(this.target),this.enableDamping===!0?(this._sphericalDelta.theta*=1-this.dampingFactor,this._sphericalDelta.phi*=1-this.dampingFactor,this._panOffset.multiplyScalar(1-this.dampingFactor)):(this._sphericalDelta.set(0,0,0),this._panOffset.set(0,0,0)),this.zoomToCursor&&this._performCursorZoom){let o=null;if(this.object.isPerspectiveCamera){let a=jt.length();o=this._clampDistance(a*this._scale);let l=a-o;this.object.position.addScaledVector(this._dollyDirection,l),this.object.updateMatrixWorld(),s=!!l}else if(this.object.isOrthographicCamera){let a=new R(this._mouse.x,this._mouse.y,0);a.unproject(this.object);let l=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),this.object.updateProjectionMatrix(),s=l!==this.object.zoom;let c=new R(this._mouse.x,this._mouse.y,0);c.unproject(this.object),this.object.position.sub(c).add(a),this.object.updateMatrixWorld(),o=jt.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),this.zoomToCursor=!1;o!==null&&(this.screenSpacePanning?this.target.set(0,0,-1).transformDirection(this.object.matrix).multiplyScalar(o).add(this.object.position):(Dh.origin.copy(this.object.position),Dh.direction.set(0,0,-1).transformDirection(this.object.matrix),Math.abs(this.object.up.dot(Dh.direction))<_C?this.object.lookAt(this.target):(bv.setFromNormalAndCoplanarPoint(this.object.up,this.target),Dh.intersectPlane(bv,this.target))))}else if(this.object.isOrthographicCamera){let o=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),o!==this.object.zoom&&(this.object.updateProjectionMatrix(),s=!0)}return this._scale=1,this._performCursorZoom=!1,s||this._lastPosition.distanceToSquared(this.object.position)>Id||8*(1-this._lastQuaternion.dot(this.object.quaternion))>Id||this._lastTargetPosition.distanceToSquared(this.target)>Id?(this.dispatchEvent(xv),this._lastPosition.copy(this.object.position),this._lastQuaternion.copy(this.object.quaternion),this._lastTargetPosition.copy(this.target),!0):!1}_getAutoRotationAngle(e){return e!==null?bn/60*this.autoRotateSpeed*e:bn/60/60*this.autoRotateSpeed}_getZoomScale(e){let n=Math.abs(e*.01);return Math.pow(.95,this.zoomSpeed*n)}_rotateLeft(e){this._sphericalDelta.theta-=e}_rotateUp(e){this._sphericalDelta.phi-=e}_panLeft(e,n){jt.setFromMatrixColumn(n,0),jt.multiplyScalar(-e),this._panOffset.add(jt)}_panUp(e,n){this.screenSpacePanning===!0?jt.setFromMatrixColumn(n,1):(jt.setFromMatrixColumn(n,0),jt.crossVectors(this.object.up,jt)),jt.multiplyScalar(e),this._panOffset.add(jt)}_pan(e,n){let i=this.domElement;if(this.object.isPerspectiveCamera){let r=this.object.position;jt.copy(r).sub(this.target);let s=jt.length();s*=Math.tan(this.object.fov/2*Math.PI/180),this._panLeft(2*e*s/i.clientHeight,this.object.matrix),this._panUp(2*n*s/i.clientHeight,this.object.matrix)}else this.object.isOrthographicCamera?(this._panLeft(e*(this.object.right-this.object.left)/this.object.zoom/i.clientWidth,this.object.matrix),this._panUp(n*(this.object.top-this.object.bottom)/this.object.zoom/i.clientHeight,this.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),this.enablePan=!1)}_dollyOut(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale/=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_dollyIn(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale*=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_updateZoomParameters(e,n){if(!this.zoomToCursor)return;this._performCursorZoom=!0;let i=this.domElement.getBoundingClientRect(),r=e-i.left,s=n-i.top,o=i.width,a=i.height;this._mouse.x=r/o*2-1,this._mouse.y=-(s/a)*2+1,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()}_clampDistance(e){return Math.max(this.minDistance,Math.min(this.maxDistance,e))}_handleMouseDownRotate(e){this._rotateStart.set(e.clientX,e.clientY)}_handleMouseDownDolly(e){this._updateZoomParameters(e.clientX,e.clientX),this._dollyStart.set(e.clientX,e.clientY)}_handleMouseDownPan(e){this._panStart.set(e.clientX,e.clientY)}_handleMouseMoveRotate(e){this._rotateEnd.set(e.clientX,e.clientY),this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let n=this.domElement;this._rotateLeft(bn*this._rotateDelta.x/n.clientHeight),this._rotateUp(bn*this._rotateDelta.y/n.clientHeight),this._rotateStart.copy(this._rotateEnd),this.update()}_handleMouseMoveDolly(e){this._dollyEnd.set(e.clientX,e.clientY),this._dollyDelta.subVectors(this._dollyEnd,this._dollyStart),this._dollyDelta.y>0?this._dollyOut(this._getZoomScale(this._dollyDelta.y)):this._dollyDelta.y<0&&this._dollyIn(this._getZoomScale(this._dollyDelta.y)),this._dollyStart.copy(this._dollyEnd),this.update()}_handleMouseMovePan(e){this._panEnd.set(e.clientX,e.clientY),this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd),this.update()}_handleMouseWheel(e){this._updateZoomParameters(e.clientX,e.clientY),e.deltaY<0?this._dollyIn(this._getZoomScale(e.deltaY)):e.deltaY>0&&this._dollyOut(this._getZoomScale(e.deltaY)),this.update()}_handleKeyDown(e){let n=!1;switch(e.code){case this.keys.UP:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateUp(bn*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,this.keyPanSpeed),n=!0;break;case this.keys.BOTTOM:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateUp(-bn*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,-this.keyPanSpeed),n=!0;break;case this.keys.LEFT:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateLeft(bn*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(this.keyPanSpeed,0),n=!0;break;case this.keys.RIGHT:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateLeft(-bn*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(-this.keyPanSpeed,0),n=!0;break}n&&(e.preventDefault(),this.update())}_handleTouchStartRotate(e){if(this._pointers.length===1)this._rotateStart.set(e.pageX,e.pageY);else{let n=this._getSecondPointerPosition(e),i=.5*(e.pageX+n.x),r=.5*(e.pageY+n.y);this._rotateStart.set(i,r)}}_handleTouchStartPan(e){if(this._pointers.length===1)this._panStart.set(e.pageX,e.pageY);else{let n=this._getSecondPointerPosition(e),i=.5*(e.pageX+n.x),r=.5*(e.pageY+n.y);this._panStart.set(i,r)}}_handleTouchStartDolly(e){let n=this._getSecondPointerPosition(e),i=e.pageX-n.x,r=e.pageY-n.y,s=Math.sqrt(i*i+r*r);this._dollyStart.set(0,s)}_handleTouchStartDollyPan(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enablePan&&this._handleTouchStartPan(e)}_handleTouchStartDollyRotate(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enableRotate&&this._handleTouchStartRotate(e)}_handleTouchMoveRotate(e){if(this._pointers.length==1)this._rotateEnd.set(e.pageX,e.pageY);else{let i=this._getSecondPointerPosition(e),r=.5*(e.pageX+i.x),s=.5*(e.pageY+i.y);this._rotateEnd.set(r,s)}this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let n=this.domElement;this._rotateLeft(bn*this._rotateDelta.x/n.clientHeight),this._rotateUp(bn*this._rotateDelta.y/n.clientHeight),this._rotateStart.copy(this._rotateEnd)}_handleTouchMovePan(e){if(this._pointers.length===1)this._panEnd.set(e.pageX,e.pageY);else{let n=this._getSecondPointerPosition(e),i=.5*(e.pageX+n.x),r=.5*(e.pageY+n.y);this._panEnd.set(i,r)}this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd)}_handleTouchMoveDolly(e){let n=this._getSecondPointerPosition(e),i=e.pageX-n.x,r=e.pageY-n.y,s=Math.sqrt(i*i+r*r);this._dollyEnd.set(0,s),this._dollyDelta.set(0,Math.pow(this._dollyEnd.y/this._dollyStart.y,this.zoomSpeed)),this._dollyOut(this._dollyDelta.y),this._dollyStart.copy(this._dollyEnd);let o=(e.pageX+n.x)*.5,a=(e.pageY+n.y)*.5;this._updateZoomParameters(o,a)}_handleTouchMoveDollyPan(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enablePan&&this._handleTouchMovePan(e)}_handleTouchMoveDollyRotate(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enableRotate&&this._handleTouchMoveRotate(e)}_addPointer(e){this._pointers.push(e.pointerId)}_removePointer(e){delete this._pointerPositions[e.pointerId];for(let n=0;n<this._pointers.length;n++)if(this._pointers[n]==e.pointerId){this._pointers.splice(n,1);return}}_isTrackingPointer(e){for(let n=0;n<this._pointers.length;n++)if(this._pointers[n]==e.pointerId)return!0;return!1}_trackPointer(e){let n=this._pointerPositions[e.pointerId];n===void 0&&(n=new ne,this._pointerPositions[e.pointerId]=n),n.set(e.pageX,e.pageY)}_getSecondPointerPosition(e){let n=e.pointerId===this._pointers[0]?this._pointers[1]:this._pointers[0];return this._pointerPositions[n]}_customWheelEvent(e){let n=e.deltaMode,i={clientX:e.clientX,clientY:e.clientY,deltaY:e.deltaY};switch(n){case 1:i.deltaY*=16;break;case 2:i.deltaY*=100;break}return e.ctrlKey&&!this._controlActive&&(i.deltaY*=10),i}};function vC(t){this.enabled!==!1&&(this._pointers.length===0&&(this.domElement.setPointerCapture(t.pointerId),this.domElement.addEventListener("pointermove",this._onPointerMove),this.domElement.addEventListener("pointerup",this._onPointerUp)),!this._isTrackingPointer(t)&&(this._addPointer(t),t.pointerType==="touch"?this._onTouchStart(t):this._onMouseDown(t)))}function yC(t){this.enabled!==!1&&(t.pointerType==="touch"?this._onTouchMove(t):this._onMouseMove(t))}function xC(t){switch(this._removePointer(t),this._pointers.length){case 0:this.domElement.releasePointerCapture(t.pointerId),this.domElement.removeEventListener("pointermove",this._onPointerMove),this.domElement.removeEventListener("pointerup",this._onPointerUp),this.dispatchEvent(Mv),this.state=bt.NONE;break;case 1:let e=this._pointers[0],n=this._pointerPositions[e];this._onTouchStart({pointerId:e,pageX:n.x,pageY:n.y});break}}function bC(t){let e;switch(t.button){case 0:e=this.mouseButtons.LEFT;break;case 1:e=this.mouseButtons.MIDDLE;break;case 2:e=this.mouseButtons.RIGHT;break;default:e=-1}switch(e){case zt.DOLLY:if(this.enableZoom===!1)return;this._handleMouseDownDolly(t),this.state=bt.DOLLY;break;case zt.ROTATE:if(t.ctrlKey||t.metaKey||t.shiftKey){if(this.enablePan===!1)return;this._handleMouseDownPan(t),this.state=bt.PAN}else{if(this.enableRotate===!1)return;this._handleMouseDownRotate(t),this.state=bt.ROTATE}break;case zt.PAN:if(t.ctrlKey||t.metaKey||t.shiftKey){if(this.enableRotate===!1)return;this._handleMouseDownRotate(t),this.state=bt.ROTATE}else{if(this.enablePan===!1)return;this._handleMouseDownPan(t),this.state=bt.PAN}break;default:this.state=bt.NONE}this.state!==bt.NONE&&this.dispatchEvent(Dd)}function MC(t){switch(this.state){case bt.ROTATE:if(this.enableRotate===!1)return;this._handleMouseMoveRotate(t);break;case bt.DOLLY:if(this.enableZoom===!1)return;this._handleMouseMoveDolly(t);break;case bt.PAN:if(this.enablePan===!1)return;this._handleMouseMovePan(t);break}}function SC(t){this.enabled===!1||this.enableZoom===!1||this.state!==bt.NONE||(t.preventDefault(),this.dispatchEvent(Dd),this._handleMouseWheel(this._customWheelEvent(t)),this.dispatchEvent(Mv))}function wC(t){this.enabled!==!1&&this._handleKeyDown(t)}function EC(t){switch(this._trackPointer(t),this._pointers.length){case 1:switch(this.touches.ONE){case Gn.ROTATE:if(this.enableRotate===!1)return;this._handleTouchStartRotate(t),this.state=bt.TOUCH_ROTATE;break;case Gn.PAN:if(this.enablePan===!1)return;this._handleTouchStartPan(t),this.state=bt.TOUCH_PAN;break;default:this.state=bt.NONE}break;case 2:switch(this.touches.TWO){case Gn.DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchStartDollyPan(t),this.state=bt.TOUCH_DOLLY_PAN;break;case Gn.DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchStartDollyRotate(t),this.state=bt.TOUCH_DOLLY_ROTATE;break;default:this.state=bt.NONE}break;default:this.state=bt.NONE}this.state!==bt.NONE&&this.dispatchEvent(Dd)}function TC(t){switch(this._trackPointer(t),this.state){case bt.TOUCH_ROTATE:if(this.enableRotate===!1)return;this._handleTouchMoveRotate(t),this.update();break;case bt.TOUCH_PAN:if(this.enablePan===!1)return;this._handleTouchMovePan(t),this.update();break;case bt.TOUCH_DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchMoveDollyPan(t),this.update();break;case bt.TOUCH_DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchMoveDollyRotate(t),this.update();break;default:this.state=bt.NONE}}function AC(t){this.enabled!==!1&&t.preventDefault()}function CC(t){t.key==="Control"&&(this._controlActive=!0,this.domElement.getRootNode().addEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function RC(t){t.key==="Control"&&(this._controlActive=!1,this.domElement.getRootNode().removeEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}var PC={type:"change"},Sv=1e-6,wv=new Ht,Oh=class extends Pn{constructor(e,n=null){super(e,n),this.movementSpeed=1,this.rollSpeed=.005,this.dragToLook=!1,this.autoForward=!1,this._moveState={up:0,down:0,left:0,right:0,forward:0,back:0,pitchUp:0,pitchDown:0,yawLeft:0,yawRight:0,rollLeft:0,rollRight:0},this._moveVector=new R(0,0,0),this._rotationVector=new R(0,0,0),this._lastQuaternion=new Ht,this._lastPosition=new R,this._status=0,this._onKeyDown=IC.bind(this),this._onKeyUp=DC.bind(this),this._onPointerMove=OC.bind(this),this._onPointerDown=LC.bind(this),this._onPointerUp=NC.bind(this),this._onPointerCancel=FC.bind(this),this._onContextMenu=UC.bind(this),n!==null&&this.connect(n)}connect(e){super.connect(e),window.addEventListener("keydown",this._onKeyDown),window.addEventListener("keyup",this._onKeyUp),this.domElement.addEventListener("pointermove",this._onPointerMove),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointerup",this._onPointerUp),this.domElement.addEventListener("pointercancel",this._onPointerCancel),this.domElement.addEventListener("contextmenu",this._onContextMenu)}disconnect(){window.removeEventListener("keydown",this._onKeyDown),window.removeEventListener("keyup",this._onKeyUp),this.domElement.removeEventListener("pointermove",this._onPointerMove),this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerCancel),this.domElement.removeEventListener("contextmenu",this._onContextMenu)}dispose(){this.disconnect()}update(e){if(this.enabled===!1)return;let n=this.object,i=e*this.movementSpeed,r=e*this.rollSpeed;n.translateX(this._moveVector.x*i),n.translateY(this._moveVector.y*i),n.translateZ(this._moveVector.z*i),wv.set(this._rotationVector.x*r,this._rotationVector.y*r,this._rotationVector.z*r,1).normalize(),n.quaternion.multiply(wv),(this._lastPosition.distanceToSquared(n.position)>Sv||8*(1-this._lastQuaternion.dot(n.quaternion))>Sv)&&(this.dispatchEvent(PC),this._lastQuaternion.copy(n.quaternion),this._lastPosition.copy(n.position))}_updateMovementVector(){let e=this._moveState.forward||this.autoForward&&!this._moveState.back?1:0;this._moveVector.x=-this._moveState.left+this._moveState.right,this._moveVector.y=-this._moveState.down+this._moveState.up,this._moveVector.z=-e+this._moveState.back}_updateRotationVector(){this._rotationVector.x=-this._moveState.pitchDown+this._moveState.pitchUp,this._rotationVector.y=-this._moveState.yawRight+this._moveState.yawLeft,this._rotationVector.z=-this._moveState.rollRight+this._moveState.rollLeft}_getContainerDimensions(){return this.domElement!=document?{size:[this.domElement.offsetWidth,this.domElement.offsetHeight],offset:[this.domElement.offsetLeft,this.domElement.offsetTop]}:{size:[window.innerWidth,window.innerHeight],offset:[0,0]}}};function IC(t){if(!(t.altKey||this.enabled===!1)){switch(t.code){case"ShiftLeft":case"ShiftRight":this.movementSpeedMultiplier=.1;break;case"KeyW":this._moveState.forward=1;break;case"KeyS":this._moveState.back=1;break;case"KeyA":this._moveState.left=1;break;case"KeyD":this._moveState.right=1;break;case"KeyR":this._moveState.up=1;break;case"KeyF":this._moveState.down=1;break;case"ArrowUp":this._moveState.pitchUp=1;break;case"ArrowDown":this._moveState.pitchDown=1;break;case"ArrowLeft":this._moveState.yawLeft=1;break;case"ArrowRight":this._moveState.yawRight=1;break;case"KeyQ":this._moveState.rollLeft=1;break;case"KeyE":this._moveState.rollRight=1;break}this._updateMovementVector(),this._updateRotationVector()}}function DC(t){if(this.enabled!==!1){switch(t.code){case"ShiftLeft":case"ShiftRight":this.movementSpeedMultiplier=1;break;case"KeyW":this._moveState.forward=0;break;case"KeyS":this._moveState.back=0;break;case"KeyA":this._moveState.left=0;break;case"KeyD":this._moveState.right=0;break;case"KeyR":this._moveState.up=0;break;case"KeyF":this._moveState.down=0;break;case"ArrowUp":this._moveState.pitchUp=0;break;case"ArrowDown":this._moveState.pitchDown=0;break;case"ArrowLeft":this._moveState.yawLeft=0;break;case"ArrowRight":this._moveState.yawRight=0;break;case"KeyQ":this._moveState.rollLeft=0;break;case"KeyE":this._moveState.rollRight=0;break}this._updateMovementVector(),this._updateRotationVector()}}function LC(t){if(this.enabled!==!1)if(this.dragToLook)this._status++;else{switch(t.button){case 0:this._moveState.forward=1;break;case 2:this._moveState.back=1;break}this._updateMovementVector()}}function OC(t){if(this.enabled!==!1&&(!this.dragToLook||this._status>0)){let e=this._getContainerDimensions(),n=e.size[0]/2,i=e.size[1]/2;this._moveState.yawLeft=-(t.pageX-e.offset[0]-n)/n,this._moveState.pitchDown=(t.pageY-e.offset[1]-i)/i,this._updateRotationVector()}}function NC(t){if(this.enabled!==!1){if(this.dragToLook)this._status--,this._moveState.yawLeft=this._moveState.pitchDown=0;else{switch(t.button){case 0:this._moveState.forward=0;break;case 2:this._moveState.back=0;break}this._updateMovementVector()}this._updateRotationVector()}}function FC(){this.enabled!==!1&&(this.dragToLook?(this._status=0,this._moveState.yawLeft=this._moveState.pitchDown=0):(this._moveState.forward=0,this._moveState.back=0,this._updateMovementVector()),this._updateRotationVector())}function UC(t){this.enabled!==!1&&t.preventDefault()}var to={name:"CopyShader",uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

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


		}`};var Ln=class{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error("THREE.Pass: .render() must be implemented in derived pass.")}dispose(){}},zC=new Lr(-1,1,1,-1,0,1),Ld=class extends St{constructor(){super(),this.setAttribute("position",new ut([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new ut([0,2,0,0,2,0],2))}},kC=new Ld,fr=class{constructor(e){this._mesh=new It(kC,e)}dispose(){this._mesh.geometry.dispose()}render(e){e.render(this._mesh,zC)}get material(){return this._mesh.material}set material(e){this._mesh.material=e}};var Nh=class extends Ln{constructor(e,n="tDiffuse"){super(),this.textureID=n,this.uniforms=null,this.material=null,e instanceof Bt?(this.uniforms=e.uniforms,this.material=e):e&&(this.uniforms=Bi.clone(e.uniforms),this.material=new Bt({name:e.name!==void 0?e.name:"unspecified",defines:Object.assign({},e.defines),uniforms:this.uniforms,vertexShader:e.vertexShader,fragmentShader:e.fragmentShader})),this._fsQuad=new fr(this.material)}render(e,n,i){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=i.texture),this._fsQuad.material=this.material,this.renderToScreen?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(n),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this._fsQuad.render(e))}dispose(){this.material.dispose(),this._fsQuad.dispose()}};var Sa=class extends Ln{constructor(e,n){super(),this.scene=e,this.camera=n,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(e,n,i){let r=e.getContext(),s=e.state;s.buffers.color.setMask(!1),s.buffers.depth.setMask(!1),s.buffers.color.setLocked(!0),s.buffers.depth.setLocked(!0);let o,a;this.inverse?(o=0,a=1):(o=1,a=0),s.buffers.stencil.setTest(!0),s.buffers.stencil.setOp(r.REPLACE,r.REPLACE,r.REPLACE),s.buffers.stencil.setFunc(r.ALWAYS,o,4294967295),s.buffers.stencil.setClear(a),s.buffers.stencil.setLocked(!0),e.setRenderTarget(i),this.clear&&e.clear(),e.render(this.scene,this.camera),e.setRenderTarget(n),this.clear&&e.clear(),e.render(this.scene,this.camera),s.buffers.color.setLocked(!1),s.buffers.depth.setLocked(!1),s.buffers.color.setMask(!0),s.buffers.depth.setMask(!0),s.buffers.stencil.setLocked(!1),s.buffers.stencil.setFunc(r.EQUAL,1,4294967295),s.buffers.stencil.setOp(r.KEEP,r.KEEP,r.KEEP),s.buffers.stencil.setLocked(!0)}},Fh=class extends Ln{constructor(){super(),this.needsSwap=!1}render(e){e.state.buffers.stencil.setLocked(!1),e.state.buffers.stencil.setTest(!1)}};var Uh=class{constructor(e,n){if(this.renderer=e,this._pixelRatio=e.getPixelRatio(),n===void 0){let i=e.getSize(new ne);this._width=i.width,this._height=i.height,n=new sn(this._width*this._pixelRatio,this._height*this._pixelRatio,{type:Wn}),n.texture.name="EffectComposer.rt1"}else this._width=n.width,this._height=n.height;this.renderTarget1=n,this.renderTarget2=n.clone(),this.renderTarget2.texture.name="EffectComposer.rt2",this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],this.copyPass=new Nh(to),this.copyPass.material.blending=ii,this.clock=new Zo}swapBuffers(){let e=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=e}addPass(e){this.passes.push(e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(e,n){this.passes.splice(n,0,e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(e){let n=this.passes.indexOf(e);n!==-1&&this.passes.splice(n,1)}isLastEnabledPass(e){for(let n=e+1;n<this.passes.length;n++)if(this.passes[n].enabled)return!1;return!0}render(e){e===void 0&&(e=this.clock.getDelta());let n=this.renderer.getRenderTarget(),i=!1;for(let r=0,s=this.passes.length;r<s;r++){let o=this.passes[r];if(o.enabled!==!1){if(o.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(r),o.render(this.renderer,this.writeBuffer,this.readBuffer,e,i),o.needsSwap){if(i){let a=this.renderer.getContext(),l=this.renderer.state.buffers.stencil;l.setFunc(a.NOTEQUAL,1,4294967295),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,e),l.setFunc(a.EQUAL,1,4294967295)}this.swapBuffers()}Sa!==void 0&&(o instanceof Sa?i=!0:o instanceof Fh&&(i=!1))}}this.renderer.setRenderTarget(n)}reset(e){if(e===void 0){let n=this.renderer.getSize(new ne);this._pixelRatio=this.renderer.getPixelRatio(),this._width=n.width,this._height=n.height,e=this.renderTarget1.clone(),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=e,this.renderTarget2=e.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(e,n){this._width=e,this._height=n;let i=this._width*this._pixelRatio,r=this._height*this._pixelRatio;this.renderTarget1.setSize(i,r),this.renderTarget2.setSize(i,r);for(let s=0;s<this.passes.length;s++)this.passes[s].setSize(i,r)}setPixelRatio(e){this._pixelRatio=e,this.setSize(this._width,this._height)}dispose(){this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.copyPass.dispose()}};var zh=class extends Ln{constructor(e,n,i=null,r=null,s=null){super(),this.scene=e,this.camera=n,this.overrideMaterial=i,this.clearColor=r,this.clearAlpha=s,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this._oldClearColor=new Oe}render(e,n,i){let r=e.autoClear;e.autoClear=!1;let s,o;this.overrideMaterial!==null&&(o=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),this.clearColor!==null&&(e.getClearColor(this._oldClearColor),e.setClearColor(this.clearColor,e.getClearAlpha())),this.clearAlpha!==null&&(s=e.getClearAlpha(),e.setClearAlpha(this.clearAlpha)),this.clearDepth==!0&&e.clearDepth(),e.setRenderTarget(this.renderToScreen?null:i),this.clear===!0&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),e.render(this.scene,this.camera),this.clearColor!==null&&e.setClearColor(this._oldClearColor),this.clearAlpha!==null&&e.setClearAlpha(s),this.overrideMaterial!==null&&(this.scene.overrideMaterial=o),e.autoClear=r}};function pn(){return pn=Object.assign?Object.assign.bind():function(t){for(var e=1;e<arguments.length;e++){var n=arguments[e];for(var i in n)({}).hasOwnProperty.call(n,i)&&(t[i]=n[i])}return t},pn.apply(null,arguments)}function Ev(t){if(t===void 0)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return t}function dr(t,e){return dr=Object.setPrototypeOf?Object.setPrototypeOf.bind():function(n,i){return n.__proto__=i,n},dr(t,e)}function Tv(t,e){t.prototype=Object.create(e.prototype),t.prototype.constructor=t,dr(t,e)}function kh(t){return kh=Object.setPrototypeOf?Object.getPrototypeOf.bind():function(e){return e.__proto__||Object.getPrototypeOf(e)},kh(t)}function Av(t){try{return Function.toString.call(t).indexOf("[native code]")!==-1}catch{return typeof t=="function"}}function Od(){try{var t=!Boolean.prototype.valueOf.call(Reflect.construct(Boolean,[],function(){}))}catch{}return(Od=function(){return!!t})()}function Cv(t,e,n){if(Od())return Reflect.construct.apply(null,arguments);var i=[null];i.push.apply(i,e);var r=new(t.bind.apply(t,i));return n&&dr(r,n.prototype),r}function Bh(t){var e=typeof Map=="function"?new Map:void 0;return Bh=function(i){if(i===null||!Av(i))return i;if(typeof i!="function")throw new TypeError("Super expression must either be null or a function");if(e!==void 0){if(e.has(i))return e.get(i);e.set(i,r)}function r(){return Cv(i,arguments,kh(this).constructor)}return r.prototype=Object.create(i.prototype,{constructor:{value:r,enumerable:!1,writable:!0,configurable:!0}}),dr(r,i)},Bh(t)}var Mn=(function(t){Tv(e,t);function e(n){var i;if(1)i=t.call(this,"An error occurred. See https://github.com/styled-components/polished/blob/main/src/internalHelpers/errors.md#"+n+" for more information.")||this;else for(var r,s,o;o<r;o++);return Ev(i)}return e})(Bh(Error));function Rv(t,e){return t.substr(-e.length)===e}var BC=/^([+-]?(?:\d+|\d*\.\d+))([a-z]*|%)$/;function Pv(t){if(typeof t!="string")return t;var e=t.match(BC);return e?parseFloat(t):t}var VC=function(e){return function(n,i){i===void 0&&(i="16px");var r=n,s=i;if(typeof n=="string"){if(!Rv(n,"px"))throw new Mn(69,e,n);r=Pv(n)}if(typeof i=="string"){if(!Rv(i,"px"))throw new Mn(70,e,i);s=Pv(i)}if(typeof r=="string")throw new Mn(71,n,e);if(typeof s=="string")throw new Mn(72,i,e);return""+r/s+e}},Dv=VC,T4=Dv("em");var A4=Dv("rem");function Nd(t){return Math.round(t*255)}function HC(t,e,n){return Nd(t)+","+Nd(e)+","+Nd(n)}function wa(t,e,n,i){if(i===void 0&&(i=HC),e===0)return i(n,n,n);var r=(t%360+360)%360/60,s=(1-Math.abs(2*n-1))*e,o=s*(1-Math.abs(r%2-1)),a=0,l=0,c=0;r>=0&&r<1?(a=s,l=o):r>=1&&r<2?(a=o,l=s):r>=2&&r<3?(l=s,c=o):r>=3&&r<4?(l=o,c=s):r>=4&&r<5?(a=o,c=s):r>=5&&r<6&&(a=s,c=o);var h=n-s/2,u=a+h,d=l+h,f=c+h;return i(u,d,f)}var Iv={aliceblue:"f0f8ff",antiquewhite:"faebd7",aqua:"00ffff",aquamarine:"7fffd4",azure:"f0ffff",beige:"f5f5dc",bisque:"ffe4c4",black:"000",blanchedalmond:"ffebcd",blue:"0000ff",blueviolet:"8a2be2",brown:"a52a2a",burlywood:"deb887",cadetblue:"5f9ea0",chartreuse:"7fff00",chocolate:"d2691e",coral:"ff7f50",cornflowerblue:"6495ed",cornsilk:"fff8dc",crimson:"dc143c",cyan:"00ffff",darkblue:"00008b",darkcyan:"008b8b",darkgoldenrod:"b8860b",darkgray:"a9a9a9",darkgreen:"006400",darkgrey:"a9a9a9",darkkhaki:"bdb76b",darkmagenta:"8b008b",darkolivegreen:"556b2f",darkorange:"ff8c00",darkorchid:"9932cc",darkred:"8b0000",darksalmon:"e9967a",darkseagreen:"8fbc8f",darkslateblue:"483d8b",darkslategray:"2f4f4f",darkslategrey:"2f4f4f",darkturquoise:"00ced1",darkviolet:"9400d3",deeppink:"ff1493",deepskyblue:"00bfff",dimgray:"696969",dimgrey:"696969",dodgerblue:"1e90ff",firebrick:"b22222",floralwhite:"fffaf0",forestgreen:"228b22",fuchsia:"ff00ff",gainsboro:"dcdcdc",ghostwhite:"f8f8ff",gold:"ffd700",goldenrod:"daa520",gray:"808080",green:"008000",greenyellow:"adff2f",grey:"808080",honeydew:"f0fff0",hotpink:"ff69b4",indianred:"cd5c5c",indigo:"4b0082",ivory:"fffff0",khaki:"f0e68c",lavender:"e6e6fa",lavenderblush:"fff0f5",lawngreen:"7cfc00",lemonchiffon:"fffacd",lightblue:"add8e6",lightcoral:"f08080",lightcyan:"e0ffff",lightgoldenrodyellow:"fafad2",lightgray:"d3d3d3",lightgreen:"90ee90",lightgrey:"d3d3d3",lightpink:"ffb6c1",lightsalmon:"ffa07a",lightseagreen:"20b2aa",lightskyblue:"87cefa",lightslategray:"789",lightslategrey:"789",lightsteelblue:"b0c4de",lightyellow:"ffffe0",lime:"0f0",limegreen:"32cd32",linen:"faf0e6",magenta:"f0f",maroon:"800000",mediumaquamarine:"66cdaa",mediumblue:"0000cd",mediumorchid:"ba55d3",mediumpurple:"9370db",mediumseagreen:"3cb371",mediumslateblue:"7b68ee",mediumspringgreen:"00fa9a",mediumturquoise:"48d1cc",mediumvioletred:"c71585",midnightblue:"191970",mintcream:"f5fffa",mistyrose:"ffe4e1",moccasin:"ffe4b5",navajowhite:"ffdead",navy:"000080",oldlace:"fdf5e6",olive:"808000",olivedrab:"6b8e23",orange:"ffa500",orangered:"ff4500",orchid:"da70d6",palegoldenrod:"eee8aa",palegreen:"98fb98",paleturquoise:"afeeee",palevioletred:"db7093",papayawhip:"ffefd5",peachpuff:"ffdab9",peru:"cd853f",pink:"ffc0cb",plum:"dda0dd",powderblue:"b0e0e6",purple:"800080",rebeccapurple:"639",red:"f00",rosybrown:"bc8f8f",royalblue:"4169e1",saddlebrown:"8b4513",salmon:"fa8072",sandybrown:"f4a460",seagreen:"2e8b57",seashell:"fff5ee",sienna:"a0522d",silver:"c0c0c0",skyblue:"87ceeb",slateblue:"6a5acd",slategray:"708090",slategrey:"708090",snow:"fffafa",springgreen:"00ff7f",steelblue:"4682b4",tan:"d2b48c",teal:"008080",thistle:"d8bfd8",tomato:"ff6347",turquoise:"40e0d0",violet:"ee82ee",wheat:"f5deb3",white:"fff",whitesmoke:"f5f5f5",yellow:"ff0",yellowgreen:"9acd32"};function GC(t){if(typeof t!="string")return t;var e=t.toLowerCase();return Iv[e]?"#"+Iv[e]:t}var WC=/^#[a-fA-F0-9]{6}$/,jC=/^#[a-fA-F0-9]{8}$/,qC=/^#[a-fA-F0-9]{3}$/,XC=/^#[a-fA-F0-9]{4}$/,Fd=/^rgb\(\s*(\d{1,3})\s*(?:,)?\s*(\d{1,3})\s*(?:,)?\s*(\d{1,3})\s*\)$/i,$C=/^rgb(?:a)?\(\s*(\d{1,3})\s*(?:,)?\s*(\d{1,3})\s*(?:,)?\s*(\d{1,3})\s*(?:,|\/)\s*([-+]?\d*[.]?\d+[%]?)\s*\)$/i,YC=/^hsl\(\s*(\d{0,3}[.]?[0-9]+(?:deg)?)\s*(?:,)?\s*(\d{1,3}[.]?[0-9]?)%\s*(?:,)?\s*(\d{1,3}[.]?[0-9]?)%\s*\)$/i,ZC=/^hsl(?:a)?\(\s*(\d{0,3}[.]?[0-9]+(?:deg)?)\s*(?:,)?\s*(\d{1,3}[.]?[0-9]?)%\s*(?:,)?\s*(\d{1,3}[.]?[0-9]?)%\s*(?:,|\/)\s*([-+]?\d*[.]?\d+[%]?)\s*\)$/i;function pr(t){if(typeof t!="string")throw new Mn(3);var e=GC(t);if(e.match(WC))return{red:parseInt(""+e[1]+e[2],16),green:parseInt(""+e[3]+e[4],16),blue:parseInt(""+e[5]+e[6],16)};if(e.match(jC)){var n=parseFloat((parseInt(""+e[7]+e[8],16)/255).toFixed(2));return{red:parseInt(""+e[1]+e[2],16),green:parseInt(""+e[3]+e[4],16),blue:parseInt(""+e[5]+e[6],16),alpha:n}}if(e.match(qC))return{red:parseInt(""+e[1]+e[1],16),green:parseInt(""+e[2]+e[2],16),blue:parseInt(""+e[3]+e[3],16)};if(e.match(XC)){var i=parseFloat((parseInt(""+e[4]+e[4],16)/255).toFixed(2));return{red:parseInt(""+e[1]+e[1],16),green:parseInt(""+e[2]+e[2],16),blue:parseInt(""+e[3]+e[3],16),alpha:i}}var r=Fd.exec(e);if(r)return{red:parseInt(""+r[1],10),green:parseInt(""+r[2],10),blue:parseInt(""+r[3],10)};var s=$C.exec(e.substring(0,50));if(s)return{red:parseInt(""+s[1],10),green:parseInt(""+s[2],10),blue:parseInt(""+s[3],10),alpha:parseFloat(""+s[4])>1?parseFloat(""+s[4])/100:parseFloat(""+s[4])};var o=YC.exec(e);if(o){var a=parseInt(""+o[1],10),l=parseInt(""+o[2],10)/100,c=parseInt(""+o[3],10)/100,h="rgb("+wa(a,l,c)+")",u=Fd.exec(h);if(!u)throw new Mn(4,e,h);return{red:parseInt(""+u[1],10),green:parseInt(""+u[2],10),blue:parseInt(""+u[3],10)}}var d=ZC.exec(e.substring(0,50));if(d){var f=parseInt(""+d[1],10),m=parseInt(""+d[2],10)/100,_=parseInt(""+d[3],10)/100,g="rgb("+wa(f,m,_)+")",p=Fd.exec(g);if(!p)throw new Mn(4,e,g);return{red:parseInt(""+p[1],10),green:parseInt(""+p[2],10),blue:parseInt(""+p[3],10),alpha:parseFloat(""+d[4])>1?parseFloat(""+d[4])/100:parseFloat(""+d[4])}}throw new Mn(5)}function KC(t){var e=t.red/255,n=t.green/255,i=t.blue/255,r=Math.max(e,n,i),s=Math.min(e,n,i),o=(r+s)/2;if(r===s)return t.alpha!==void 0?{hue:0,saturation:0,lightness:o,alpha:t.alpha}:{hue:0,saturation:0,lightness:o};var a,l=r-s,c=o>.5?l/(2-r-s):l/(r+s);switch(r){case e:a=(n-i)/l+(n<i?6:0);break;case n:a=(i-e)/l+2;break;default:a=(e-n)/l+4;break}return a*=60,t.alpha!==void 0?{hue:a,saturation:c,lightness:o,alpha:t.alpha}:{hue:a,saturation:c,lightness:o}}function mr(t){return KC(pr(t))}var JC=function(e){return e.length===7&&e[1]===e[2]&&e[3]===e[4]&&e[5]===e[6]?"#"+e[1]+e[3]+e[5]:e},zd=JC;function Kr(t){var e=t.toString(16);return e.length===1?"0"+e:e}function Ud(t){return Kr(Math.round(t*255))}function QC(t,e,n){return zd("#"+Ud(t)+Ud(e)+Ud(n))}function Vh(t,e,n){return wa(t,e,n,QC)}function eR(t,e,n){if(typeof t=="number"&&typeof e=="number"&&typeof n=="number")return Vh(t,e,n);if(typeof t=="object"&&e===void 0&&n===void 0)return Vh(t.hue,t.saturation,t.lightness);throw new Mn(1)}function tR(t,e,n,i){if(typeof t=="number"&&typeof e=="number"&&typeof n=="number"&&typeof i=="number")return i>=1?Vh(t,e,n):"rgba("+wa(t,e,n)+","+i+")";if(typeof t=="object"&&e===void 0&&n===void 0&&i===void 0)return t.alpha>=1?Vh(t.hue,t.saturation,t.lightness):"rgba("+wa(t.hue,t.saturation,t.lightness)+","+t.alpha+")";throw new Mn(2)}function kd(t,e,n){if(typeof t=="number"&&typeof e=="number"&&typeof n=="number")return zd("#"+Kr(t)+Kr(e)+Kr(n));if(typeof t=="object"&&e===void 0&&n===void 0)return zd("#"+Kr(t.red)+Kr(t.green)+Kr(t.blue));throw new Mn(6)}function Hh(t,e,n,i){if(typeof t=="string"&&typeof e=="number"){var r=pr(t);return"rgba("+r.red+","+r.green+","+r.blue+","+e+")"}else{if(typeof t=="number"&&typeof e=="number"&&typeof n=="number"&&typeof i=="number")return i>=1?kd(t,e,n):"rgba("+t+","+e+","+n+","+i+")";if(typeof t=="object"&&e===void 0&&n===void 0&&i===void 0)return t.alpha>=1?kd(t.red,t.green,t.blue):"rgba("+t.red+","+t.green+","+t.blue+","+t.alpha+")"}throw new Mn(7)}var nR=function(e){return typeof e.red=="number"&&typeof e.green=="number"&&typeof e.blue=="number"&&(typeof e.alpha!="number"||typeof e.alpha>"u")},iR=function(e){return typeof e.red=="number"&&typeof e.green=="number"&&typeof e.blue=="number"&&typeof e.alpha=="number"},rR=function(e){return typeof e.hue=="number"&&typeof e.saturation=="number"&&typeof e.lightness=="number"&&(typeof e.alpha!="number"||typeof e.alpha>"u")},sR=function(e){return typeof e.hue=="number"&&typeof e.saturation=="number"&&typeof e.lightness=="number"&&typeof e.alpha=="number"};function gr(t){if(typeof t!="object")throw new Mn(8);if(iR(t))return Hh(t);if(nR(t))return kd(t);if(sR(t))return tR(t);if(rR(t))return eR(t);throw new Mn(8)}function Lv(t,e,n){return function(){var r=n.concat(Array.prototype.slice.call(arguments));return r.length>=e?t.apply(this,r):Lv(t,e,r)}}function On(t){return Lv(t,t.length,[])}function oR(t,e){if(e==="transparent")return e;var n=mr(e);return gr(pn({},n,{hue:n.hue+parseFloat(t)}))}var C4=On(oR);function no(t,e,n){return Math.max(t,Math.min(e,n))}function aR(t,e){if(e==="transparent")return e;var n=mr(e);return gr(pn({},n,{lightness:no(0,1,n.lightness-parseFloat(t))}))}var R4=On(aR);function cR(t,e){if(e==="transparent")return e;var n=mr(e);return gr(pn({},n,{saturation:no(0,1,n.saturation-parseFloat(t))}))}var P4=On(cR);function lR(t,e){if(e==="transparent")return e;var n=mr(e);return gr(pn({},n,{lightness:no(0,1,n.lightness+parseFloat(t))}))}var I4=On(lR);function hR(t,e,n){if(e==="transparent")return n;if(n==="transparent")return e;if(t===0)return n;var i=pr(e),r=pn({},i,{alpha:typeof i.alpha=="number"?i.alpha:1}),s=pr(n),o=pn({},s,{alpha:typeof s.alpha=="number"?s.alpha:1}),a=r.alpha-o.alpha,l=parseFloat(t)*2-1,c=l*a===-1?l:l+a,h=1+l*a,u=(c/h+1)/2,d=1-u,f={red:Math.floor(r.red*u+o.red*d),green:Math.floor(r.green*u+o.green*d),blue:Math.floor(r.blue*u+o.blue*d),alpha:r.alpha*parseFloat(t)+o.alpha*(1-parseFloat(t))};return Hh(f)}var uR=On(hR),Ov=uR;function fR(t,e){if(e==="transparent")return e;var n=pr(e),i=typeof n.alpha=="number"?n.alpha:1,r=pn({},n,{alpha:no(0,1,(i*100+parseFloat(t)*100)/100)});return Hh(r)}var dR=On(fR),Nv=dR;function pR(t,e){if(e==="transparent")return e;var n=mr(e);return gr(pn({},n,{saturation:no(0,1,n.saturation+parseFloat(t))}))}var D4=On(pR);function mR(t,e){return e==="transparent"?e:gr(pn({},mr(e),{hue:parseFloat(t)}))}var L4=On(mR);function gR(t,e){return e==="transparent"?e:gr(pn({},mr(e),{lightness:parseFloat(t)}))}var O4=On(gR);function _R(t,e){return e==="transparent"?e:gr(pn({},mr(e),{saturation:parseFloat(t)}))}var N4=On(_R);function vR(t,e){return e==="transparent"?e:Ov(parseFloat(t),"rgb(0, 0, 0)",e)}var F4=On(vR);function yR(t,e){return e==="transparent"?e:Ov(parseFloat(t),"rgb(255, 255, 255)",e)}var U4=On(yR);function xR(t,e){if(e==="transparent")return e;var n=pr(e),i=typeof n.alpha=="number"?n.alpha:1,r=pn({},n,{alpha:no(0,1,+(i*100-parseFloat(t)*100).toFixed(2)/100)});return Hh(r)}var z4=On(xR);var _r=Object.freeze({Linear:Object.freeze({None:function(t){return t},In:function(t){return t},Out:function(t){return t},InOut:function(t){return t}}),Quadratic:Object.freeze({In:function(t){return t*t},Out:function(t){return t*(2-t)},InOut:function(t){return(t*=2)<1?.5*t*t:-.5*(--t*(t-2)-1)}}),Cubic:Object.freeze({In:function(t){return t*t*t},Out:function(t){return--t*t*t+1},InOut:function(t){return(t*=2)<1?.5*t*t*t:.5*((t-=2)*t*t+2)}}),Quartic:Object.freeze({In:function(t){return t*t*t*t},Out:function(t){return 1- --t*t*t*t},InOut:function(t){return(t*=2)<1?.5*t*t*t*t:-.5*((t-=2)*t*t*t-2)}}),Quintic:Object.freeze({In:function(t){return t*t*t*t*t},Out:function(t){return--t*t*t*t*t+1},InOut:function(t){return(t*=2)<1?.5*t*t*t*t*t:.5*((t-=2)*t*t*t*t+2)}}),Sinusoidal:Object.freeze({In:function(t){return 1-Math.sin((1-t)*Math.PI/2)},Out:function(t){return Math.sin(t*Math.PI/2)},InOut:function(t){return .5*(1-Math.sin(Math.PI*(.5-t)))}}),Exponential:Object.freeze({In:function(t){return t===0?0:Math.pow(1024,t-1)},Out:function(t){return t===1?1:1-Math.pow(2,-10*t)},InOut:function(t){return t===0?0:t===1?1:(t*=2)<1?.5*Math.pow(1024,t-1):.5*(-Math.pow(2,-10*(t-1))+2)}}),Circular:Object.freeze({In:function(t){return 1-Math.sqrt(1-t*t)},Out:function(t){return Math.sqrt(1- --t*t)},InOut:function(t){return(t*=2)<1?-.5*(Math.sqrt(1-t*t)-1):.5*(Math.sqrt(1-(t-=2)*t)+1)}}),Elastic:Object.freeze({In:function(t){return t===0?0:t===1?1:-Math.pow(2,10*(t-1))*Math.sin((t-1.1)*5*Math.PI)},Out:function(t){return t===0?0:t===1?1:Math.pow(2,-10*t)*Math.sin((t-.1)*5*Math.PI)+1},InOut:function(t){return t===0?0:t===1?1:(t*=2,t<1?-.5*Math.pow(2,10*(t-1))*Math.sin((t-1.1)*5*Math.PI):.5*Math.pow(2,-10*(t-1))*Math.sin((t-1.1)*5*Math.PI)+1)}}),Back:Object.freeze({In:function(t){var e=1.70158;return t===1?1:t*t*((e+1)*t-e)},Out:function(t){var e=1.70158;return t===0?0:--t*t*((e+1)*t+e)+1},InOut:function(t){var e=2.5949095;return(t*=2)<1?.5*(t*t*((e+1)*t-e)):.5*((t-=2)*t*((e+1)*t+e)+2)}}),Bounce:Object.freeze({In:function(t){return 1-_r.Bounce.Out(1-t)},Out:function(t){return t<.36363636363636365?7.5625*t*t:t<.7272727272727273?7.5625*(t-=.5454545454545454)*t+.75:t<.9090909090909091?7.5625*(t-=.8181818181818182)*t+.9375:7.5625*(t-=.9545454545454546)*t+.984375},InOut:function(t){return t<.5?_r.Bounce.In(t*2)*.5:_r.Bounce.Out(t*2-1)*.5+.5}}),generatePow:function(t){return t===void 0&&(t=4),t=t<Number.EPSILON?Number.EPSILON:t,t=t>1e4?1e4:t,{In:function(e){return Math.pow(e,t)},Out:function(e){return 1-Math.pow(1-e,t)},InOut:function(e){return e<.5?Math.pow(e*2,t)/2:(1-Math.pow(2-e*2,t))/2+.5}}}}),Ea=function(){return performance.now()},Vd=(function(){function t(){for(var e=[],n=0;n<arguments.length;n++)e[n]=arguments[n];this._tweens={},this._tweensAddedDuringUpdate={},this.add.apply(this,e)}return t.prototype.getAll=function(){var e=this;return Object.keys(this._tweens).map(function(n){return e._tweens[n]})},t.prototype.removeAll=function(){this._tweens={}},t.prototype.add=function(){for(var e,n=[],i=0;i<arguments.length;i++)n[i]=arguments[i];for(var r=0,s=n;r<s.length;r++){var o=s[r];(e=o._group)===null||e===void 0||e.remove(o),o._group=this,this._tweens[o.getId()]=o,this._tweensAddedDuringUpdate[o.getId()]=o}},t.prototype.remove=function(){for(var e=[],n=0;n<arguments.length;n++)e[n]=arguments[n];for(var i=0,r=e;i<r.length;i++){var s=r[i];s._group=void 0,delete this._tweens[s.getId()],delete this._tweensAddedDuringUpdate[s.getId()]}},t.prototype.allStopped=function(){return this.getAll().every(function(e){return!e.isPlaying()})},t.prototype.update=function(e,n){e===void 0&&(e=Ea()),n===void 0&&(n=!0);var i=Object.keys(this._tweens);if(i.length!==0)for(;i.length>0;){this._tweensAddedDuringUpdate={};for(var r=0;r<i.length;r++){var s=this._tweens[i[r]],o=!n;s&&s.update(e,o)===!1&&!n&&this.remove(s)}i=Object.keys(this._tweensAddedDuringUpdate)}},t})(),io={Linear:function(t,e){var n=t.length-1,i=n*e,r=Math.floor(i),s=io.Utils.Linear;return e<0?s(t[0],t[1],i):e>1?s(t[n],t[n-1],n-i):s(t[r],t[r+1>n?n:r+1],i-r)},Bezier:function(t,e){for(var n=0,i=t.length-1,r=Math.pow,s=io.Utils.Bernstein,o=0;o<=i;o++)n+=r(1-e,i-o)*r(e,o)*t[o]*s(i,o);return n},CatmullRom:function(t,e){var n=t.length-1,i=n*e,r=Math.floor(i),s=io.Utils.CatmullRom;return t[0]===t[n]?(e<0&&(r=Math.floor(i=n*(1+e))),s(t[(r-1+n)%n],t[r],t[(r+1)%n],t[(r+2)%n],i-r)):e<0?t[0]-(s(t[0],t[0],t[1],t[1],-i)-t[0]):e>1?t[n]-(s(t[n],t[n],t[n-1],t[n-1],i-n)-t[n]):s(t[r?r-1:0],t[r],t[n<r+1?n:r+1],t[n<r+2?n:r+2],i-r)},Utils:{Linear:function(t,e,n){return(e-t)*n+t},Bernstein:function(t,e){var n=io.Utils.Factorial;return n(t)/n(e)/n(t-e)},Factorial:(function(){var t=[1];return function(e){var n=1;if(t[e])return t[e];for(var i=e;i>1;i--)n*=i;return t[e]=n,n}})(),CatmullRom:function(t,e,n,i,r){var s=(n-t)*.5,o=(i-e)*.5,a=r*r,l=r*a;return(2*e-2*n+s+o)*l+(-3*e+3*n-2*s-o)*a+s*r+e}}},Fv=(function(){function t(){}return t.nextId=function(){return t._nextId++},t._nextId=0,t})(),Bd=new Vd,Hd=(function(){function t(e,n){this._isPaused=!1,this._pauseStart=0,this._valuesStart={},this._valuesEnd={},this._valuesStartRepeat={},this._duration=1e3,this._isDynamic=!1,this._initialRepeat=0,this._repeat=0,this._yoyo=!1,this._isPlaying=!1,this._reversed=!1,this._delayTime=0,this._startTime=0,this._easingFunction=_r.Linear.None,this._interpolationFunction=io.Linear,this._chainedTweens=[],this._onStartCallbackFired=!1,this._onEveryStartCallbackFired=!1,this._id=Fv.nextId(),this._isChainStopped=!1,this._propertiesAreSetUp=!1,this._goToEnd=!1,this._object=e,typeof n=="object"?(this._group=n,n.add(this)):n===!0&&(this._group=Bd,Bd.add(this))}return t.prototype.getId=function(){return this._id},t.prototype.isPlaying=function(){return this._isPlaying},t.prototype.isPaused=function(){return this._isPaused},t.prototype.getDuration=function(){return this._duration},t.prototype.to=function(e,n){if(n===void 0&&(n=1e3),this._isPlaying)throw new Error("Can not call Tween.to() while Tween is already started or paused. Stop the Tween first.");return this._valuesEnd=e,this._propertiesAreSetUp=!1,this._duration=n<0?0:n,this},t.prototype.duration=function(e){return e===void 0&&(e=1e3),this._duration=e<0?0:e,this},t.prototype.dynamic=function(e){return e===void 0&&(e=!1),this._isDynamic=e,this},t.prototype.start=function(e,n){if(e===void 0&&(e=Ea()),n===void 0&&(n=!1),this._isPlaying)return this;if(this._repeat=this._initialRepeat,this._reversed){this._reversed=!1;for(var i in this._valuesStartRepeat)this._swapEndStartRepeatValues(i),this._valuesStart[i]=this._valuesStartRepeat[i]}if(this._isPlaying=!0,this._isPaused=!1,this._onStartCallbackFired=!1,this._onEveryStartCallbackFired=!1,this._isChainStopped=!1,this._startTime=e,this._startTime+=this._delayTime,!this._propertiesAreSetUp||n){if(this._propertiesAreSetUp=!0,!this._isDynamic){var r={};for(var s in this._valuesEnd)r[s]=this._valuesEnd[s];this._valuesEnd=r}this._setupProperties(this._object,this._valuesStart,this._valuesEnd,this._valuesStartRepeat,n)}return this},t.prototype.startFromCurrentValues=function(e){return this.start(e,!0)},t.prototype._setupProperties=function(e,n,i,r,s){for(var o in i){var a=e[o],l=Array.isArray(a),c=l?"array":typeof a,h=!l&&Array.isArray(i[o]);if(!(c==="undefined"||c==="function")){if(h){var u=i[o];if(u.length===0)continue;for(var d=[a],f=0,m=u.length;f<m;f+=1){var _=this._handleRelativeValue(a,u[f]);if(isNaN(_)){h=!1,console.warn("Found invalid interpolation list. Skipping.");break}d.push(_)}h&&(i[o]=d)}if((c==="object"||l)&&a&&!h){n[o]=l?[]:{};var g=a;for(var p in g)n[o][p]=g[p];r[o]=l?[]:{};var u=i[o];if(!this._isDynamic){var x={};for(var p in u)x[p]=u[p];i[o]=u=x}this._setupProperties(g,n[o],u,r[o],s)}else(typeof n[o]>"u"||s)&&(n[o]=a),l||(n[o]*=1),h?r[o]=i[o].slice().reverse():r[o]=n[o]||0}}},t.prototype.stop=function(){return this._isChainStopped||(this._isChainStopped=!0,this.stopChainedTweens()),this._isPlaying?(this._isPlaying=!1,this._isPaused=!1,this._onStopCallback&&this._onStopCallback(this._object),this):this},t.prototype.end=function(){return this._goToEnd=!0,this.update(this._startTime+this._duration),this},t.prototype.pause=function(e){return e===void 0&&(e=Ea()),this._isPaused||!this._isPlaying?this:(this._isPaused=!0,this._pauseStart=e,this)},t.prototype.resume=function(e){return e===void 0&&(e=Ea()),!this._isPaused||!this._isPlaying?this:(this._isPaused=!1,this._startTime+=e-this._pauseStart,this._pauseStart=0,this)},t.prototype.stopChainedTweens=function(){for(var e=0,n=this._chainedTweens.length;e<n;e++)this._chainedTweens[e].stop();return this},t.prototype.group=function(e){return e?(e.add(this),this):(console.warn("tween.group() without args has been removed, use group.add(tween) instead."),this)},t.prototype.remove=function(){var e;return(e=this._group)===null||e===void 0||e.remove(this),this},t.prototype.delay=function(e){return e===void 0&&(e=0),this._delayTime=e,this},t.prototype.repeat=function(e){return e===void 0&&(e=0),this._initialRepeat=e,this._repeat=e,this},t.prototype.repeatDelay=function(e){return this._repeatDelayTime=e,this},t.prototype.yoyo=function(e){return e===void 0&&(e=!1),this._yoyo=e,this},t.prototype.easing=function(e){return e===void 0&&(e=_r.Linear.None),this._easingFunction=e,this},t.prototype.interpolation=function(e){return e===void 0&&(e=io.Linear),this._interpolationFunction=e,this},t.prototype.chain=function(){for(var e=[],n=0;n<arguments.length;n++)e[n]=arguments[n];return this._chainedTweens=e,this},t.prototype.onStart=function(e){return this._onStartCallback=e,this},t.prototype.onEveryStart=function(e){return this._onEveryStartCallback=e,this},t.prototype.onUpdate=function(e){return this._onUpdateCallback=e,this},t.prototype.onRepeat=function(e){return this._onRepeatCallback=e,this},t.prototype.onComplete=function(e){return this._onCompleteCallback=e,this},t.prototype.onStop=function(e){return this._onStopCallback=e,this},t.prototype.update=function(e,n){var i=this,r;if(e===void 0&&(e=Ea()),n===void 0&&(n=t.autoStartOnUpdate),this._isPaused)return!0;var s;if(!this._goToEnd&&!this._isPlaying)if(n)this.start(e,!0);else return!1;if(this._goToEnd=!1,e<this._startTime)return!0;this._onStartCallbackFired===!1&&(this._onStartCallback&&this._onStartCallback(this._object),this._onStartCallbackFired=!0),this._onEveryStartCallbackFired===!1&&(this._onEveryStartCallback&&this._onEveryStartCallback(this._object),this._onEveryStartCallbackFired=!0);var o=e-this._startTime,a=this._duration+((r=this._repeatDelayTime)!==null&&r!==void 0?r:this._delayTime),l=this._duration+this._repeat*a,c=function(){if(i._duration===0||o>l)return 1;var _=Math.trunc(o/a),g=o-_*a,p=Math.min(g/i._duration,1);return p===0&&o===i._duration?1:p},h=c(),u=this._easingFunction(h);if(this._updateProperties(this._object,this._valuesStart,this._valuesEnd,u),this._onUpdateCallback&&this._onUpdateCallback(this._object,h),this._duration===0||o>=this._duration)if(this._repeat>0){var d=Math.min(Math.trunc((o-this._duration)/a)+1,this._repeat);isFinite(this._repeat)&&(this._repeat-=d);for(s in this._valuesStartRepeat)!this._yoyo&&typeof this._valuesEnd[s]=="string"&&(this._valuesStartRepeat[s]=this._valuesStartRepeat[s]+parseFloat(this._valuesEnd[s])),this._yoyo&&this._swapEndStartRepeatValues(s),this._valuesStart[s]=this._valuesStartRepeat[s];return this._yoyo&&(this._reversed=!this._reversed),this._startTime+=a*d,this._onRepeatCallback&&this._onRepeatCallback(this._object),this._onEveryStartCallbackFired=!1,!0}else{this._onCompleteCallback&&this._onCompleteCallback(this._object);for(var f=0,m=this._chainedTweens.length;f<m;f++)this._chainedTweens[f].start(this._startTime+this._duration,!1);return this._isPlaying=!1,!1}return!0},t.prototype._updateProperties=function(e,n,i,r){for(var s in i)if(n[s]!==void 0){var o=n[s]||0,a=i[s],l=Array.isArray(e[s]),c=Array.isArray(a),h=!l&&c;h?e[s]=this._interpolationFunction(a,r):typeof a=="object"&&a?this._updateProperties(e[s],o,a,r):(a=this._handleRelativeValue(o,a),typeof a=="number"&&(e[s]=o+(a-o)*r))}},t.prototype._handleRelativeValue=function(e,n){return typeof n!="string"?n:n.charAt(0)==="+"||n.charAt(0)==="-"?e+parseFloat(n):parseFloat(n)},t.prototype._swapEndStartRepeatValues=function(e){var n=this._valuesStartRepeat[e],i=this._valuesEnd[e];typeof i=="string"?this._valuesStartRepeat[e]=this._valuesStartRepeat[e]+parseFloat(i):this._valuesStartRepeat[e]=this._valuesEnd[e],this._valuesEnd[e]=n},t.autoStartOnUpdate=!1,t})();var B4=Fv.nextId,Si=Bd,V4=Si.getAll.bind(Si),H4=Si.removeAll.bind(Si),G4=Si.add.bind(Si),W4=Si.remove.bind(Si),j4=Si.update.bind(Si);var Gd="http://www.w3.org/1999/xhtml",Uv={svg:"http://www.w3.org/2000/svg",xhtml:Gd,xlink:"http://www.w3.org/1999/xlink",xml:"http://www.w3.org/XML/1998/namespace",xmlns:"http://www.w3.org/2000/xmlns/"};function zv(t){var e=t+="",n=e.indexOf(":");return n>=0&&(e=t.slice(0,n))!=="xmlns"&&(t=t.slice(n+1)),Uv.hasOwnProperty(e)?{space:Uv[e],local:t}:t}function bR(t){return function(){var e=this.ownerDocument,n=this.namespaceURI;return n===Gd&&e.documentElement.namespaceURI===Gd?e.createElement(t):e.createElementNS(n,t)}}function MR(t){return function(){return this.ownerDocument.createElementNS(t.space,t.local)}}function kv(t){var e=zv(t);return(e.local?MR:bR)(e)}function SR(){}function Bv(t){return t==null?SR:function(){return this.querySelector(t)}}function wR(t){typeof t!="function"&&(t=Bv(t));for(var e=this._groups,n=e.length,i=new Array(n),r=0;r<n;++r)for(var s=e[r],o=s.length,a=i[r]=new Array(o),l,c,h=0;h<o;++h)(l=s[h])&&(c=t.call(l,l.__data__,h,s))&&("__data__"in l&&(c.__data__=l.__data__),a[h]=c);return new Nn(i,this._parents)}function ER(t){return t==null?[]:Array.isArray(t)?t:Array.from(t)}function TR(){return[]}function AR(t){return t==null?TR:function(){return this.querySelectorAll(t)}}function CR(t){return function(){return ER(t.apply(this,arguments))}}function RR(t){typeof t=="function"?t=CR(t):t=AR(t);for(var e=this._groups,n=e.length,i=[],r=[],s=0;s<n;++s)for(var o=e[s],a=o.length,l,c=0;c<a;++c)(l=o[c])&&(i.push(t.call(l,l.__data__,c,o)),r.push(l));return new Nn(i,r)}function PR(t){return function(){return this.matches(t)}}function Vv(t){return function(e){return e.matches(t)}}var IR=Array.prototype.find;function DR(t){return function(){return IR.call(this.children,t)}}function LR(){return this.firstElementChild}function OR(t){return this.select(t==null?LR:DR(typeof t=="function"?t:Vv(t)))}var NR=Array.prototype.filter;function FR(){return Array.from(this.children)}function UR(t){return function(){return NR.call(this.children,t)}}function zR(t){return this.selectAll(t==null?FR:UR(typeof t=="function"?t:Vv(t)))}function kR(t){typeof t!="function"&&(t=PR(t));for(var e=this._groups,n=e.length,i=new Array(n),r=0;r<n;++r)for(var s=e[r],o=s.length,a=i[r]=[],l,c=0;c<o;++c)(l=s[c])&&t.call(l,l.__data__,c,s)&&a.push(l);return new Nn(i,this._parents)}function Hv(t){return new Array(t.length)}function BR(){return new Nn(this._enter||this._groups.map(Hv),this._parents)}function Gh(t,e){this.ownerDocument=t.ownerDocument,this.namespaceURI=t.namespaceURI,this._next=null,this._parent=t,this.__data__=e}Gh.prototype={constructor:Gh,appendChild:function(t){return this._parent.insertBefore(t,this._next)},insertBefore:function(t,e){return this._parent.insertBefore(t,e)},querySelector:function(t){return this._parent.querySelector(t)},querySelectorAll:function(t){return this._parent.querySelectorAll(t)}};function VR(t){return function(){return t}}function HR(t,e,n,i,r,s){for(var o=0,a,l=e.length,c=s.length;o<c;++o)(a=e[o])?(a.__data__=s[o],i[o]=a):n[o]=new Gh(t,s[o]);for(;o<l;++o)(a=e[o])&&(r[o]=a)}function GR(t,e,n,i,r,s,o){var a,l,c=new Map,h=e.length,u=s.length,d=new Array(h),f;for(a=0;a<h;++a)(l=e[a])&&(d[a]=f=o.call(l,l.__data__,a,e)+"",c.has(f)?r[a]=l:c.set(f,l));for(a=0;a<u;++a)f=o.call(t,s[a],a,s)+"",(l=c.get(f))?(i[a]=l,l.__data__=s[a],c.delete(f)):n[a]=new Gh(t,s[a]);for(a=0;a<h;++a)(l=e[a])&&c.get(d[a])===l&&(r[a]=l)}function WR(t){return t.__data__}function jR(t,e){if(!arguments.length)return Array.from(this,WR);var n=e?GR:HR,i=this._parents,r=this._groups;typeof t!="function"&&(t=VR(t));for(var s=r.length,o=new Array(s),a=new Array(s),l=new Array(s),c=0;c<s;++c){var h=i[c],u=r[c],d=u.length,f=qR(t.call(h,h&&h.__data__,c,i)),m=f.length,_=a[c]=new Array(m),g=o[c]=new Array(m),p=l[c]=new Array(d);n(h,u,_,g,p,f,e);for(var x=0,y=0,v,M;x<m;++x)if(v=_[x]){for(x>=y&&(y=x+1);!(M=g[y])&&++y<m;);v._next=M||null}}return o=new Nn(o,i),o._enter=a,o._exit=l,o}function qR(t){return typeof t=="object"&&"length"in t?t:Array.from(t)}function XR(){return new Nn(this._exit||this._groups.map(Hv),this._parents)}function $R(t,e,n){var i=this.enter(),r=this,s=this.exit();return typeof t=="function"?(i=t(i),i&&(i=i.selection())):i=i.append(t+""),e!=null&&(r=e(r),r&&(r=r.selection())),n==null?s.remove():n(s),i&&r?i.merge(r).order():r}function YR(t){for(var e=t.selection?t.selection():t,n=this._groups,i=e._groups,r=n.length,s=i.length,o=Math.min(r,s),a=new Array(r),l=0;l<o;++l)for(var c=n[l],h=i[l],u=c.length,d=a[l]=new Array(u),f,m=0;m<u;++m)(f=c[m]||h[m])&&(d[m]=f);for(;l<r;++l)a[l]=n[l];return new Nn(a,this._parents)}function ZR(){for(var t=this._groups,e=-1,n=t.length;++e<n;)for(var i=t[e],r=i.length-1,s=i[r],o;--r>=0;)(o=i[r])&&(s&&o.compareDocumentPosition(s)^4&&s.parentNode.insertBefore(o,s),s=o);return this}function KR(t){t||(t=JR);function e(u,d){return u&&d?t(u.__data__,d.__data__):!u-!d}for(var n=this._groups,i=n.length,r=new Array(i),s=0;s<i;++s){for(var o=n[s],a=o.length,l=r[s]=new Array(a),c,h=0;h<a;++h)(c=o[h])&&(l[h]=c);l.sort(e)}return new Nn(r,this._parents).order()}function JR(t,e){return t<e?-1:t>e?1:t>=e?0:NaN}function QR(){var t=arguments[0];return arguments[0]=this,t.apply(null,arguments),this}function eP(){return Array.from(this)}function tP(){for(var t=this._groups,e=0,n=t.length;e<n;++e)for(var i=t[e],r=0,s=i.length;r<s;++r){var o=i[r];if(o)return o}return null}function nP(){let t=0;for(let e of this)++t;return t}function iP(){return!this.node()}function rP(t){for(var e=this._groups,n=0,i=e.length;n<i;++n)for(var r=e[n],s=0,o=r.length,a;s<o;++s)(a=r[s])&&t.call(a,a.__data__,s,r);return this}function sP(t){return function(){this.removeAttribute(t)}}function oP(t){return function(){this.removeAttributeNS(t.space,t.local)}}function aP(t,e){return function(){this.setAttribute(t,e)}}function cP(t,e){return function(){this.setAttributeNS(t.space,t.local,e)}}function lP(t,e){return function(){var n=e.apply(this,arguments);n==null?this.removeAttribute(t):this.setAttribute(t,n)}}function hP(t,e){return function(){var n=e.apply(this,arguments);n==null?this.removeAttributeNS(t.space,t.local):this.setAttributeNS(t.space,t.local,n)}}function uP(t,e){var n=zv(t);if(arguments.length<2){var i=this.node();return n.local?i.getAttributeNS(n.space,n.local):i.getAttribute(n)}return this.each((e==null?n.local?oP:sP:typeof e=="function"?n.local?hP:lP:n.local?cP:aP)(n,e))}function Gv(t){return t.ownerDocument&&t.ownerDocument.defaultView||t.document&&t||t.defaultView}function fP(t){return function(){this.style.removeProperty(t)}}function dP(t,e,n){return function(){this.style.setProperty(t,e,n)}}function pP(t,e,n){return function(){var i=e.apply(this,arguments);i==null?this.style.removeProperty(t):this.style.setProperty(t,i,n)}}function mP(t,e,n){return arguments.length>1?this.each((e==null?fP:typeof e=="function"?pP:dP)(t,e,n??"")):gP(this.node(),t)}function gP(t,e){return t.style.getPropertyValue(e)||Gv(t).getComputedStyle(t,null).getPropertyValue(e)}function _P(t){return function(){delete this[t]}}function vP(t,e){return function(){this[t]=e}}function yP(t,e){return function(){var n=e.apply(this,arguments);n==null?delete this[t]:this[t]=n}}function xP(t,e){return arguments.length>1?this.each((e==null?_P:typeof e=="function"?yP:vP)(t,e)):this.node()[t]}function Wv(t){return t.trim().split(/^|\s+/)}function jd(t){return t.classList||new jv(t)}function jv(t){this._node=t,this._names=Wv(t.getAttribute("class")||"")}jv.prototype={add:function(t){var e=this._names.indexOf(t);e<0&&(this._names.push(t),this._node.setAttribute("class",this._names.join(" ")))},remove:function(t){var e=this._names.indexOf(t);e>=0&&(this._names.splice(e,1),this._node.setAttribute("class",this._names.join(" ")))},contains:function(t){return this._names.indexOf(t)>=0}};function qv(t,e){for(var n=jd(t),i=-1,r=e.length;++i<r;)n.add(e[i])}function Xv(t,e){for(var n=jd(t),i=-1,r=e.length;++i<r;)n.remove(e[i])}function bP(t){return function(){qv(this,t)}}function MP(t){return function(){Xv(this,t)}}function SP(t,e){return function(){(e.apply(this,arguments)?qv:Xv)(this,t)}}function wP(t,e){var n=Wv(t+"");if(arguments.length<2){for(var i=jd(this.node()),r=-1,s=n.length;++r<s;)if(!i.contains(n[r]))return!1;return!0}return this.each((typeof e=="function"?SP:e?bP:MP)(n,e))}function EP(){this.textContent=""}function TP(t){return function(){this.textContent=t}}function AP(t){return function(){var e=t.apply(this,arguments);this.textContent=e??""}}function CP(t){return arguments.length?this.each(t==null?EP:(typeof t=="function"?AP:TP)(t)):this.node().textContent}function RP(){this.innerHTML=""}function PP(t){return function(){this.innerHTML=t}}function IP(t){return function(){var e=t.apply(this,arguments);this.innerHTML=e??""}}function DP(t){return arguments.length?this.each(t==null?RP:(typeof t=="function"?IP:PP)(t)):this.node().innerHTML}function LP(){this.nextSibling&&this.parentNode.appendChild(this)}function OP(){return this.each(LP)}function NP(){this.previousSibling&&this.parentNode.insertBefore(this,this.parentNode.firstChild)}function FP(){return this.each(NP)}function UP(t){var e=typeof t=="function"?t:kv(t);return this.select(function(){return this.appendChild(e.apply(this,arguments))})}function zP(){return null}function kP(t,e){var n=typeof t=="function"?t:kv(t),i=e==null?zP:typeof e=="function"?e:Bv(e);return this.select(function(){return this.insertBefore(n.apply(this,arguments),i.apply(this,arguments)||null)})}function BP(){var t=this.parentNode;t&&t.removeChild(this)}function VP(){return this.each(BP)}function HP(){var t=this.cloneNode(!1),e=this.parentNode;return e?e.insertBefore(t,this.nextSibling):t}function GP(){var t=this.cloneNode(!0),e=this.parentNode;return e?e.insertBefore(t,this.nextSibling):t}function WP(t){return this.select(t?GP:HP)}function jP(t){return arguments.length?this.property("__data__",t):this.node().__data__}function qP(t){return function(e){t.call(this,e,this.__data__)}}function XP(t){return t.trim().split(/^|\s+/).map(function(e){var n="",i=e.indexOf(".");return i>=0&&(n=e.slice(i+1),e=e.slice(0,i)),{type:e,name:n}})}function $P(t){return function(){var e=this.__on;if(e){for(var n=0,i=-1,r=e.length,s;n<r;++n)s=e[n],(!t.type||s.type===t.type)&&s.name===t.name?this.removeEventListener(s.type,s.listener,s.options):e[++i]=s;++i?e.length=i:delete this.__on}}}function YP(t,e,n){return function(){var i=this.__on,r,s=qP(e);if(i){for(var o=0,a=i.length;o<a;++o)if((r=i[o]).type===t.type&&r.name===t.name){this.removeEventListener(r.type,r.listener,r.options),this.addEventListener(r.type,r.listener=s,r.options=n),r.value=e;return}}this.addEventListener(t.type,s,n),r={type:t.type,name:t.name,value:e,listener:s,options:n},i?i.push(r):this.__on=[r]}}function ZP(t,e,n){var i=XP(t+""),r,s=i.length,o;if(arguments.length<2){var a=this.node().__on;if(a){for(var l=0,c=a.length,h;l<c;++l)for(r=0,h=a[l];r<s;++r)if((o=i[r]).type===h.type&&o.name===h.name)return h.value}return}for(a=e?YP:$P,r=0;r<s;++r)this.each(a(i[r],e,n));return this}function $v(t,e,n){var i=Gv(t),r=i.CustomEvent;typeof r=="function"?r=new r(e,n):(r=i.document.createEvent("Event"),n?(r.initEvent(e,n.bubbles,n.cancelable),r.detail=n.detail):r.initEvent(e,!1,!1)),t.dispatchEvent(r)}function KP(t,e){return function(){return $v(this,t,e)}}function JP(t,e){return function(){return $v(this,t,e.apply(this,arguments))}}function QP(t,e){return this.each((typeof e=="function"?JP:KP)(t,e))}function*e3(){for(var t=this._groups,e=0,n=t.length;e<n;++e)for(var i=t[e],r=0,s=i.length,o;r<s;++r)(o=i[r])&&(yield o)}var Yv=[null];function Nn(t,e){this._groups=t,this._parents=e}function t3(){return new Nn([[document.documentElement]],Yv)}function n3(){return this}Nn.prototype=t3.prototype={constructor:Nn,select:wR,selectAll:RR,selectChild:OR,selectChildren:zR,filter:kR,data:jR,enter:BR,exit:XR,join:$R,merge:YR,selection:n3,order:ZR,sort:KR,call:QR,nodes:eP,node:tP,size:nP,empty:iP,each:rP,attr:uP,style:mP,property:xP,classed:wP,text:CP,html:DP,raise:OP,lower:FP,append:UP,insert:kP,remove:VP,clone:WP,datum:jP,on:ZP,dispatch:QP,[Symbol.iterator]:e3};function Zv(t){return typeof t=="string"?new Nn([[document.querySelector(t)]],[document.documentElement]):new Nn([[t]],Yv)}var i3=0;function r3(){return new Wd}function Wd(){this._="@"+(++i3).toString(36)}Wd.prototype=r3.prototype={constructor:Wd,get:function(t){for(var e=this._;!(e in t);)if(!(t=t.parentNode))return;return t[e]},set:function(t,e){return t[this._]=e},remove:function(t){return this._ in t&&delete t[this._]},toString:function(){return this._}};function s3(t){let e;for(;e=t.sourceEvent;)t=e;return t}function Kv(t,e){if(t=s3(t),e===void 0&&(e=t.currentTarget),e){var n=e.ownerSVGElement||e;if(n.createSVGPoint){var i=n.createSVGPoint();return i.x=t.clientX,i.y=t.clientY,i=i.matrixTransform(e.getScreenCTM().inverse()),[i.x,i.y]}if(e.getBoundingClientRect){var r=e.getBoundingClientRect();return[t.clientX-r.left-e.clientLeft,t.clientY-r.top-e.clientTop]}}return[t.pageX,t.pageY]}var Lt,ey,$d,vr,qd,$h,ty,jh,ny,Yd,Xd,o3,Aa=Symbol.for("pv"),Yh={},Zh=[],a3=/^m(i|n|o|s|text|space)$/,Zd=Array.isArray,Kd=Zh.slice,yr=Object.assign;function Jr(t){t&&t.parentNode&&t.remove()}function Jd(t,e,n){var i,r,s,o=yr({},t.props),a=arguments.length;for(s in e)s=="key"?i=e[s]:s=="ref"&&typeof t.type!="function"?r=e[s]:o[s]=e[s];return a>2&&(o.children=a>3?Kd.call(arguments,2):n),Ta(t.type,o,i!==void 0?i:t.key,r!==void 0?r:t.ref,null)}function Ta(t,e,n,i,r){var s={type:t,props:e,key:n,ref:i,__k:null,__:null,__b:0,__e:null,__c:null,constructor:Aa,__v:r||++ey,__i:-1,__u:0};return!r&&Lt.vnode&&Lt.vnode(s),s}function Kh(t){return t.children}function qh(t,e){this.props=t,this.context=e,this.__g=0}function xr(t,e){if(e==null)return t.__&&xr(t.__,t.__i+1);for(var n;e<t.__k.length;e++)if((n=t.__k[e])&&n.__e)return n.__e;return typeof t.type!="function"||t.props.__P?null:xr(t)}function c3(t){var e,n=t.__v,i=n.__e,r=[],s=[],o=t.__P;o&&((e=yr({constructor:Aa},n)).__v=n.__v+1,Lt.vnode&&Lt.vnode(e),Qd(o,e,n,t.__n,o.namespaceURI,32&n.__u?[i]:null,r,i||xr(n),32&n.__u,s),e.__v=n.__v,e.__.__k[e.__i]=e,cy(r,e,s),n.__=n.__e=null,e.__e!=i&&iy(e))}function iy(t){if((t=t.__)&&t.__c&&!t.props.__P)return t.__e=null,t.__k.some(function(e){return e&&(t.__e=e.__e)}),iy(t)}function Jv(t){(8&t.__g||(t.__g|=8,vr.push(t),$h++))&&qd==Lt.debounceRendering||((qd=Lt.debounceRendering)||queueMicrotask)(ry)}function ry(){try{for(var t,e=1;vr.length;)vr.length>e&&vr.sort(ty),t=vr.shift(),e=vr.length,8&t.__g&&c3(t)}finally{($h=vr.length)&&(qd||queueMicrotask)(ry)}}function sy(t,e,n,i,r,s,o,a,l,c,h){var u,d,f,m,_,g,p=i.__k||Zh,x=e.length;for(l=l3(n,e,p,l,x),u=0;u<x;u++)(f=n.__k[u])!=null&&(d=~f.__i&&p[f.__i]||Yh,f.__i=u,g=Qd(t,f,d,r,s,o,a,l,c,h),m=f.__e,(d.ref!=f.ref||8&d.__u)&&(d.ref&&ep(d.ref,null,f,d),f.ref&&h.push(f.ref,f.__c||m,f)),_=_||m,4&f.__u?(l=oy(f,l,t,!d.__v),d.__e&&(d.__e=null)):typeof f.type=="function"&&g!==void 0?l=g:m&&(l=m.nextSibling),f.__u&=-21);return n.__e=_,l}function l3(t,e,n,i,r){var s,o,a,l,c,h,u,d,f,m=n.length,_=m,g=0,p=0,x=t.__k=Array(r);for(s=0;s<r;s++)(o=e[s])!=null&&typeof o!="boolean"&&typeof o!="function"?(typeof o!="object"||o.constructor===String?o=x[s]=Ta(null,o):Zd(o)?o=x[s]=Ta(Kh,{children:o}):o.constructor===Aa&&o.__b?o=x[s]=Ta(o.type,o.props,o.key,o.ref,o.__v):x[s]=o,l=s+g,o.__=t,o.__b=t.__b+1,a=null,~(c=o.__i=h3(o,n,l,_))&&(_--,(a=n[c])&&(a.__u|=2)),a&&a.__v?(o.__u|=16,c==l-1?g--:c==l+1?g++:c!=l&&(c>l?g--:g++,p=1)):(~c||(r>m?g--:r<m&&g++),typeof o.type!="function"&&(o.__u|=4))):x[s]=null;if(p){for(h=[],u=[],s=0;s<r;s++)if((o=x[s])&&16&o.__u){for(g=0,d=h.length;g<d;)h[f=g+d>>1]<o.__i?g=f+1:d=f;h[g]=o.__i,u[s]=g+1}for(g=h.length;s--;)u[s]&&(u[s]==g?g--:x[s].__u|=4)}if(_)for(s=0;s<m;s++)!(a=n[s])||2&a.__u||(a.__e==i&&(i=xr(a)),tp(a,a));return i}function oy(t,e,n,i){var r,s,o,a;if(typeof t.type=="function"){if(t.props.__P)return e;if(r=t.__k)for(s=0;s<r.length;s++)r[s]&&(r[s].__=t,e=oy(r[s],e,n,!1));return e}for(e&&!e.parentNode&&(e=xr(t))&&!e.parentNode&&(e=null),o=t.__e,a=e;a&&a.nodeType==8;)a=a.nextSibling;for(o!=a&&(!i&&n.moveBefore&&o.parentNode?n.moveBefore(o,e):n.insertBefore(o,e||null)),e=o;(e=e&&e.nextSibling)&&e.nodeType==8&&!e.data.startsWith("$s"););return e}function h3(t,e,n,i){var r,s=t.key,o=t.type,a=e[n],l=a&&!(2&a.__u);if(a===null&&s==null||l&&s==a.key&&o==a.type)return n;if(i>(l?1:0)){for(r=n-1;r>=0;r--)if((a=e[r])&&!(2&a.__u)&&s==a.key&&o==a.type)return r;for(r=n+1;r<e.length;r++)if((a=e[r])&&!(2&a.__u)&&s==a.key&&o==a.type)return r}return-1}function Qv(t,e,n){n==null&&(n=""),e[0]=="-"?t.setProperty(e,n):t[e]=n}function Wh(t,e,n,i,r){var s,o;if(e=="style")if(typeof n=="string")t.style.cssText=n;else{if(typeof i=="string"&&(t.style.cssText=i=""),i)for(e in i)n&&e in n||Qv(t.style,e);if(n)for(e in n)i&&n[e]==i[e]||Qv(t.style,e,n[e])}else if(e[0]=="o"&&e[1]=="n")typeof n!="function"&&(n=null),typeof i!="function"&&(i=null),(t.__e||(t.__e={}))[e]=n,n&&i||(o=Xd[e]||(Xd[e]=u3(e)),(t.__a||(t.__a={}))[e]=Yd,s=e!=(e=e.replace(ny,"$1")),(e=e.slice(2))[0]<"a"&&(e=e.toLowerCase()),n?t.addEventListener(e,o,s):t.removeEventListener(e,o,s));else{if(r=="http://www.w3.org/2000/svg")e=e.replace(/xlink(H|:h)/,"h").replace(/sName$/,"s");else if(e!="width"&&e!="height"&&e!="href"&&e!="list"&&e!="form"&&e!="tabIndex"&&e!="download"&&e!="rowSpan"&&e!="colSpan"&&e!="role"&&e!="popover"&&e in t)try{return void(t[e]=n??"")}catch{}if(typeof n=="function")return;n==null||n===!1&&e[4]!="-"?t.removeAttribute(e):t.setAttribute(e,e=="popover"&&n==1?"":n)}}function u3(t){return function(e){var n=this.__e;if(n){if(n=n[t],e[jh]==null)e[jh]=Yd++;else if(e[jh]<this.__a[t])return;return n(Lt.event?Lt.event(e):e)}}}function Qd(t,e,n,i,r,s,o,a,l,c){var h,u,d,f,m,_,g,p,x,y,v,M,b,A,C,E,w,I,N=e.type;if(e.constructor!==Aa)return null;128&n.__u&&(l=32&n.__u,h=n.__c.__z)&&(e.__u|=l,u=s=[],h.nodeType==8?a=Xh(h,s):s.push(h),a=s[0]||a),(h=Lt.__b)&&h(e);e:if(typeof N=="function"){d=o.length;try{if(p=e.props,x=(h=N.prototype)&&h.render,y=(h=N.contextType)&&i[h.__c],v=h?y?y.props.value:h.__:i,(f=n.__c)?(e.__c=f,2&f.__g&&(f.__g|=1)):(x?e.__c=f=new N(p,v):(e.__c=f=new qh(p,v),f.constructor=N,f.render=d3),y&&y.sub(f),f.state||(f.state={}),f.__n=i,f.__g|=8,f.__h=[],f.__k=[]),x&&(f.__s||(f.__s=f.state),N.getDerivedStateFromProps&&(f.__s==f.state&&(f.__s=yr({},f.__s)),yr(f.__s,N.getDerivedStateFromProps(p,f.__s)))),m=f.props,_=f.state,f.__v=e,n.__c){if(p!==m&&x&&!N.getDerivedStateFromProps&&f.componentWillReceiveProps&&f.componentWillReceiveProps(p,v),e.__v==n.__v&&!(8&f.__g)||!(4&f.__g)&&f.shouldComponentUpdate&&f.shouldComponentUpdate(p,f.__s,v)===!1){e.__v!=n.__v&&(f.props=p,f.state=f.__s,f.__g&=-9),e.__e=n.__e,e.__k=n.__k,e.__k.some(function(B){B&&(B.__=e)}),Zh.push.apply(f.__h,f.__k),f.__k=[],f.__h.length&&o.push(f),a=xr(n);break e}f.componentWillUpdate&&f.componentWillUpdate(p,f.__s,v),x&&f.componentDidUpdate&&f.__h.push(function(){f.componentDidUpdate(m,_,g)})}else x&&!N.getDerivedStateFromProps&&f.componentWillMount&&f.componentWillMount(),x&&f.componentDidMount&&f.__h.push(f.componentDidMount);f.context=v,f.props=p,f.__P=t,f.__g&=-5,M=Lt.__r,b=x?25:0;do f.__g&=-9,M&&M(e),h=f.render(f.props,f.state=f.__s,f.context);while(8&f.__g&&++b<25);x&&(Zh.push.apply(f.__h,f.__k),f.__k=[]),f.state=f.__s,f.getChildContext&&(i=yr({},i,f.getChildContext())),x&&n.__c&&f.getSnapshotBeforeUpdate&&(g=f.getSnapshotBeforeUpdate(m,_)),A=h&&h.type===Kh&&h.key==null?h.props.children:h,p.__P&&(h=a,r=(t=p.__P).namespaceURI,l=s=null,n.props&&n.props.__P!=t&&(n.__k.some(function(B){B&&tp(B,B)}),n.__k=null),a=n.__k?xr(n,0):null),a=sy(t,Zd(A)?A:[A],e,n,i,r,s,o,a,l,c),p.__P&&(e.__e=null,a=h),e.__u&=-161,u&&u.some(Jr),f.__h.length&&o.push(f),1&f.__g&&(f.__g&=-4)}catch(B){if(o.length=d,e.__v=null,l||s)if(B&&B.then){if(e.__u|=128|l,s){for(~(w=s.indexOf(a||void 0))||(w=s.length);(I=s[w-1])&&I.nodeType==8;)w--;for(;w<s.length;w++)if(I=s[w])if(s[w]=null,C){if(I==E)break}else{if(I.nodeType!=8)break;I.data.startsWith("$s")&&(E=Xh(C=I))}}if(!C){for(;a&&a.nodeType==8&&a.nextSibling;)a=a.nextSibling;C=a}(h=Xh(C=e.__c.__z||(e.__c.__z=C)))?(e.__e=C,a=h):e.__e=a,a=a&&a.nextSibling}else s&&s.some(Jr);else e.__e=n.__e;e.__k||(e.__k=n.__k||[]),B&&B.then||ay(e),Lt.__e(B,e,n)}}else a=e.__e=f3(n.__e,e,n,i,r,s,o,l,c,t);return(h=Lt.diffed)&&h(e),a}function Xh(t,e){if(t&&t.nodeType==8&&t.data.startsWith("$s"))for(var n=1;t=t.nextSibling;){if(t.nodeType==8){if(t.data.startsWith("$s"))n++;else if(t.data.startsWith("/$s")&&!--n)return t}e&&e.push(t)}}function ay(t){t&&(t.__c&&(t.__c.__g|=4),t.__k&&t.__k.some(ay))}function cy(t,e,n){for(var i=0;i<n.length;)ep(n[i++],n[i++],n[i++]);Lt.__c&&Lt.__c(e,t),t.some(function(r){try{t=r.__h,r.__h=[],t.some(function(s){s.call(r)})}catch(s){Lt.__e(s,r.__v)}})}function f3(t,e,n,i,r,s,o,a,l,c){var h,u,d,f,m,_,g,p,x=n.props||Yh,y=e.props,v=e.type;if(v=="svg"?r="http://www.w3.org/2000/svg":v=="math"?r="http://www.w3.org/1998/Math/MathML":r||(r="http://www.w3.org/1999/xhtml"),s){for(h=0;h<s.length;h++)if((m=s[h])&&(v?m.localName==v:m.nodeType==3)){t=m,s[h]=null;break}}if(!t){if(p=c.ownerDocument||document,!v)return p.createTextNode(y);t=p.createElementNS(r,v,y.is?y:c),a&&(Lt.__m&&Lt.__m(e,s),a=!1),s=null}if(v){if(c=v=="template"&&t.content||t,s=v=="textarea"&&y.defaultValue!=null?null:s&&Kd.call(c.childNodes),!a&&s)for(x={},h=0;h<t.attributes.length;h++)x[(m=t.attributes[h]).name]=m.value;for(h in x)m=x[h],h=="dangerouslySetInnerHTML"?d=m:h=="children"||h in y||h=="value"&&"defaultValue"in y||h=="checked"&&"defaultChecked"in y||Wh(t,h,null,m,r);for(h in y)m=y[h],h=="children"?f=m:h=="dangerouslySetInnerHTML"?u=m:h=="value"?_=m:h=="checked"?g=m:a&&typeof m!="function"||x[h]===m||Wh(t,h,m,x[h],r);u?(a||d&&(u.__html==d.__html||u.__html==t.innerHTML)||(t.innerHTML=u.__html),e.__k=[]):(d&&(t.textContent=""),(v=="foreignObject"||r=="http://www.w3.org/1998/Math/MathML"&&a3.test(v))&&(r="http://www.w3.org/1999/xhtml"),sy(c,Zd(f)?f:[f],e,n,i,r,s,o,s?s[0]:n.__k&&xr(n,0),a,l),s&&s.some(Jr)),a&&v!="textarea"||(h="value",v=="progress"&&_==null?t.removeAttribute(h):_==null||_===t[h]&&(v!="progress"||_)||Wh(t,h,_,x[h],r),h="checked",g!=null&&g!=t[h]&&Wh(t,h,g,x[h],r))}else x===y||a&&t.data==y||(t.data=y);return t}function ep(t,e,n,i){try{typeof t=="function"?e?e.__x=t(e)||1:i&&(i=i.__c||i.__e)&&(e=i.__x)&&(i.__x=null,typeof e=="function"?e():t(null)):t.current=e}catch(r){Lt.__e(r,n)}}function tp(t,e,n){var i,r,s,o;if(Lt.unmount&&Lt.unmount(t),!(i=t.ref)||i.current&&i.current!=t.__e||ep(i,null,e,t),i=t.__c){if(i.componentWillUnmount)try{i.componentWillUnmount()}catch(a){Lt.__e(a,e)}i.__P=i.__n=null}if(i=t.__k)for(o=0;o<i.length;o++)i[o]&&tp(i[o],e,typeof t.type!="function"||n&&!t.props.__P);!n&&(i=t.__c)&&(i=i.__z)&&(r=Xh(i,s=[]))&&(i==t.__e&&s.some(Jr),Jr(r),Jr(i)),n||Jr(t.__e),t.__e=t.__c=t.__=null}function d3(t,e,n){return this.constructor(t,n)}function ly(t,e){var n,i,r,s;Lt.__&&Lt.__(t,e),e.nodeType==9&&(e=e.documentElement),i=(n=t&&32&t.__u)?null:e.__k,e.__k=Ta(Kh,{children:[t]}),r=[],s=[],Qd(e,e.__k,i||Yh,Yh,e.namespaceURI,i?null:e.firstChild?Kd.call(e.childNodes):null,r,i?i.__e:e.firstChild,n,s),cy(r,e.__k,s),e.__k.props.children=null}Lt={__e:function(t,e,n,i){for(var r,s,o;e=e.__;)if((r=e.__c)&&!(1&r.__g)){r.__g|=4;try{if((o=(s=r.constructor)&&s.getDerivedStateFromError)&&r.setState(s.getDerivedStateFromError(t)),r.componentDidCatch&&(r.componentDidCatch(t,i||{}),o=1),o&&8&r.__g)return void(r.__g|=2)}catch(a){t=a}}throw $h=0,t}},ey=0,$d=function(t){return t!=null&&t.constructor===Aa},qh.prototype.setState=function(t,e){var n=this.__s;n&&n!=this.state||(n=this.__s=yr({},this.state)),typeof t=="function"&&(t=t(yr({},n),this.props)),t&&(yr(n,t),this.__v&&(e&&this.__k.push(e),Jv(this)))},qh.prototype.forceUpdate=function(t){this.__v&&(this.__g|=4,t&&this.__h.push(t),Jv(this))},qh.prototype.render=Kh,vr=[],$h=0,ty=function(t,e){return t.__v.__b-e.__v.__b},jh=Symbol(),ny=/(PointerCapture)$|Capture$/i,Yd=0,Xd={},o3=0;var np=t=>{if(typeof t!="object")return t;let e=Jd(t);return e.props&&(e.props={...e.props},e?.props?.children&&(e.props.children=Array.isArray(e.props.children)?e.props.children.map(np):np(e.props.children))),e},p3=t=>$d(Jd(t)),m3=(t,e)=>{delete e.__k,ly(np(t),e)};var hy=lr({props:{content:{default:!1},offsetX:{triggerUpdate:!1},offsetY:{triggerUpdate:!1}},methods:{positionFromEvent(t,e){let n=t.container,i=Kv(e,n),r=n.offsetWidth,s=n.offsetHeight,o=[t.offsetX===null||t.offsetX===void 0?`-${i[0]/r*100}%`:typeof t.offsetX=="number"?`calc(-50% + ${t.offsetX}px)`:t.offsetX,t.offsetY===null||t.offsetY===void 0?s>130&&s-i[1]<100?"calc(-100% - 6px)":"21px":typeof t.offsetY=="number"?t.offsetY<0?`calc(-100% - ${Math.abs(t.offsetY)}px)`:`${t.offsetY}px`:t.offsetY];return t.tooltipEl.style("left",i[0]+"px").style("top",i[1]+"px").style("transform",`translate(${o.join(",")})`),this}},init:function(t,e,{style:n={}}={}){let i=!!t&&typeof t=="object"&&!!t.node&&typeof t.node=="function",r=Zv(i?t.node():t);e.container=r.node(),r.style("position")==="static"&&r.style("position","relative"),e.tooltipEl=r.append("div").attr("class","float-tooltip-kap"),Object.entries(n).forEach(([o,a])=>e.tooltipEl.style(o,a)),e.tooltipEl.style("left","-10000px").style("display","none");let s=`tooltip-${Math.round(Math.random()*1e12)}`;e.mouseInside=!1,r.on(`mousemove.${s}`,o=>{e.mouseInside=!0,this.positionFromEvent(o),e.content&&e.tooltipEl.style("display","inline")}),r.on(`mouseover.${s}`,()=>{e.mouseInside=!0,e.content&&e.tooltipEl.style("display","inline")}),r.on(`mouseout.${s}`,()=>{e.mouseInside=!1,e.tooltipEl.style("display","none")})},update:function(t){t.tooltipEl.style("display",t.content&&t.mouseInside?"inline":"none"),t.content?t.content instanceof HTMLElement?(t.tooltipEl.text(""),t.tooltipEl.append(()=>t.content)):typeof t.content=="string"?t.tooltipEl.html(t.content):p3(t.content)?(t.tooltipEl.text(""),m3(t.content,t.tooltipEl.node())):(t.tooltipEl.style("display","none"),console.warn("Tooltip content is invalid, skipping.",t.content,t.content.toString())):t.tooltipEl.text("")}});var uy=t=>{t instanceof Array?t.forEach(uy):(t.map&&t.map.dispose(),t.dispose())},fy=t=>{t.geometry&&t.geometry.dispose(),t.material&&uy(t.material),t.texture&&t.texture.dispose(),t.children&&t.children.forEach(fy)},g3=t=>{for(;t.children.length;){let e=t.children[0];t.remove(e),fy(e)}},at=window.THREE?window.THREE:{WebGLRenderer:Yl,Scene:Lo,PerspectiveCamera:Kt,Raycaster:Ui,SRGBColorSpace:Zt,TextureLoader:Xo,Vector2:ne,Vector3:R,Box3:vn,Color:Oe,Mesh:It,SphereGeometry:Fi,MeshBasicMaterial:Cn,BackSide:Jt,Timer:Ko},ip=lr({props:{width:{default:window.innerWidth,onChange(t,e,n){isNaN(t)&&(e.width=n)}},height:{default:window.innerHeight,onChange(t,e,n){isNaN(t)&&(e.height=n)}},viewOffset:{default:[0,0]},backgroundColor:{default:"#000011"},backgroundImageUrl:{},onBackgroundImageLoaded:{},showNavInfo:{default:!0},skyRadius:{default:5e4},objects:{default:[]},lights:{default:[]},enablePointerInteraction:{default:!0,onChange(t,e){e.hoverObj=null,e.tooltip&&e.tooltip.content(null)},triggerUpdate:!1},pointerRaycasterThrottleMs:{default:50,triggerUpdate:!1},lineHoverPrecision:{default:1,triggerUpdate:!1},pointsHoverPrecision:{default:1,triggerUpdate:!1},hoverOrderComparator:{triggerUpdate:!1},hoverFilter:{default:()=>!0,triggerUpdate:!1},tooltipContent:{triggerUpdate:!1},hoverDuringDrag:{default:!1,triggerUpdate:!1},clickAfterDrag:{default:!1,triggerUpdate:!1},onHover:{default:()=>{},triggerUpdate:!1},onClick:{default:()=>{},triggerUpdate:!1},onRightClick:{triggerUpdate:!1}},methods:{tick:function(t){if(t.initialised){t.controls.enabled&&t.controls.update?.(Math.min(1,t.timer.update().getDelta())),t.postProcessingComposer?t.postProcessingComposer.render():t.renderer.render(t.scene,t.camera),t.extraRenderers.forEach(n=>n.render(t.scene,t.camera));let e=+new Date;if(t.enablePointerInteraction&&e-t.lastRaycasterCheck>=t.pointerRaycasterThrottleMs){t.lastRaycasterCheck=e;let n=null;if(t.hoverDuringDrag||!t.isPointerDragging){let i=this.intersectingObjects(t.pointerPos.x,t.pointerPos.y);t.hoverOrderComparator&&i.sort((s,o)=>t.hoverOrderComparator(s.object,o.object,s,o));let r=i.find(s=>t.hoverFilter(s.object))||null;n=r?r.object:null,t.intersection=r||null}n!==t.hoverObj&&(t.onHover(n,t.hoverObj,t.intersection),t.tooltip.content(n&&tt(t.tooltipContent)(n,t.intersection)||null),t.hoverObj=n)}t.tweenGroup.update()}return this},getPointerPos:function(t){let{x:e,y:n}=t.pointerPos;return{x:e,y:n}},cameraPosition:function(t,e,n,i){let r=t.camera;if(e&&t.initialised){let l=e,c=n||{x:0,y:0,z:0};if(t.povPosTween?.end(),t.povTgtTween?.end(),!i)s(l),o(c);else{let h=Object.assign({},r.position),u=a();t.tweenGroup.add(t.povPosTween=new Hd(h).to(l,i).easing(_r.Quadratic.Out).onUpdate(s).onComplete(function(){t.povPosTween=void 0,t.tweenGroup.remove(this)}).start()),t.tweenGroup.add(t.povTgtTween=new Hd(u).to(c,i/3).easing(_r.Quadratic.Out).onUpdate(o).onComplete(function(){t.povTgtTween=void 0,t.tweenGroup.remove(this)}).start())}return this}return Object.assign({},r.position,{lookAt:a()});function s(l){let{x:c,y:h,z:u}=l;c!==void 0&&(r.position.x=c),h!==void 0&&(r.position.y=h),u!==void 0&&(r.position.z=u)}function o(l){let c=new at.Vector3(l.x,l.y,l.z);t.controls.enabled&&t.controls.target?t.controls.target=c:r.lookAt(c)}function a(){return Object.assign(new at.Vector3(0,0,-1e3).applyQuaternion(r.quaternion).add(r.position))}},zoomToFit:function(t,e=0,n=10,i,r){return this.fitToBbox(this.getBbox(i),e,n,r)},fitToBbox:function(t,e,n=0,i=10,r=!1){let s=t.camera;if(e){s.updateMatrixWorld();let o=new at.Vector3,a=new at.Vector3,l=new at.Vector3,c=new at.Vector3;s.getWorldPosition(c),s.getWorldDirection(l),o.crossVectors(l,s.up).normalize(),a.crossVectors(o,l).normalize();let u=(1-i*2/t.height)*s.fov/2*(Math.PI/180),d=Math.atan(Math.tan(u)*s.aspect),f=new at.Vector3((e.x[0]+e.x[1])/2,(e.y[0]+e.y[1])/2,(e.z[0]+e.z[1])/2),m=r?l.clone().multiplyScalar(c.distanceTo(f)).add(c):f,_=Math.max(0,...[new at.Vector3(e.x[0],e.y[0],e.z[0]),new at.Vector3(e.x[0],e.y[0],e.z[1]),new at.Vector3(e.x[0],e.y[1],e.z[0]),new at.Vector3(e.x[0],e.y[1],e.z[1]),new at.Vector3(e.x[1],e.y[0],e.z[0]),new at.Vector3(e.x[1],e.y[0],e.z[1]),new at.Vector3(e.x[1],e.y[1],e.z[0]),new at.Vector3(e.x[1],e.y[1],e.z[1])].map(x=>{let y=x.clone().sub(m);return Math.max(Math.abs(y.dot(a))/Math.tan(u),Math.abs(y.dot(o))/Math.tan(d))-y.dot(l)})),g=l.clone().negate(),p={x:m.x+g.x*_,y:m.y+g.y*_,z:m.z+g.z*_};this.cameraPosition(p,m,n)}return this},getBbox:function(t,e=()=>!0){let n=new at.Box3,i=t.objects.filter(e);return i.length?(i.forEach(r=>n.expandByObject(r)),Object.assign(...["x","y","z"].map(r=>({[r]:[n.min[r],n.max[r]]})))):null},getScreenCoords:function(t,e,n,i){let r=new at.Vector3(e,n,i);return r.project(this.camera()),{x:(r.x+1)*t.width/2,y:-(r.y-1)*t.height/2}},getSceneCoords:function(t,e,n,i=0){let r=new at.Vector2(e/t.width*2-1,-(n/t.height)*2+1),s=new at.Raycaster;return s.setFromCamera(r,t.camera),Object.assign({},s.ray.at(i,new at.Vector3))},intersectingObjects:function(t,e,n){let i=new at.Vector2(e/t.width*2-1,-(n/t.height)*2+1),r=new at.Raycaster;return r.params.Line.threshold=t.lineHoverPrecision,r.params.Points.threshold=t.pointsHoverPrecision,r.setFromCamera(i,t.camera),r.intersectObjects(t.objects,!0)},renderer:t=>t.renderer,scene:t=>t.scene,camera:t=>t.camera,postProcessingComposer:t=>t.postProcessingComposer,controls:t=>t.controls,_destructor:function(t){g3(t.scene),t.controls?.dispose(),t.renderer?.dispose(),t.postProcessingComposer?.dispose()}},stateInit:()=>({scene:new at.Scene,camera:new at.PerspectiveCamera,timer:new at.Timer,tweenGroup:new Vd,lastRaycasterCheck:0}),init(t,e,{controlType:n="trackball",useWebGPU:i=!1,rendererConfig:r={},extraRenderers:s=[],waitForLoadComplete:o=!0}={}){t.innerHTML="",t.appendChild(e.container=document.createElement("div")),e.container.className="scene-container",e.container.style.position="relative",e.container.appendChild(e.navInfo=document.createElement("div")),e.navInfo.className="scene-nav-info",e.navInfo.textContent={orbit:"Left-click: rotate, Mouse-wheel/middle-click: zoom, Right-click: pan",trackball:"Left-click: rotate, Mouse-wheel/middle-click: zoom, Right-click: pan",arcball:"Left-click: rotate, Mouse-wheel/middle-click: zoom, Right-click: pan",fly:"WASD: move, R|F: up | down, Q|E: roll, up|down: pitch, left|right: yaw"}[n]||"",e.navInfo.style.display=e.showNavInfo?null:"none",e.tooltip=new hy(e.container),e.pointerPos=new at.Vector2,e.pointerPos.x=-2,e.pointerPos.y=-2,["pointermove","pointerdown"].forEach(a=>e.container.addEventListener(a,l=>{if(a==="pointerdown"&&(e.isPointerPressed=!0),!e.isPointerDragging&&l.type==="pointermove"&&(l.pressure>0||e.isPointerPressed)&&(l.pointerType==="mouse"||l.movementX===void 0||[l.movementX,l.movementY].some(h=>Math.abs(h)>1))&&(e.isPointerDragging=!0),e.enablePointerInteraction){let h=c(e.container);e.pointerPos.x=l.pageX-h.left,e.pointerPos.y=l.pageY-h.top}function c(h){let u=h.getBoundingClientRect(),d=window.pageXOffset||document.documentElement.scrollLeft,f=window.pageYOffset||document.documentElement.scrollTop;return{top:u.top+f,left:u.left+d}}},{passive:!0})),e.container.addEventListener("pointerup",a=>{e.isPointerPressed&&(e.isPointerPressed=!1,!(e.isPointerDragging&&(e.isPointerDragging=!1,!e.clickAfterDrag))&&requestAnimationFrame(()=>{a.button===0&&e.onClick(e.hoverObj||null,a,e.intersection),a.button===2&&e.onRightClick&&e.onRightClick(e.hoverObj||null,a,e.intersection)}))},{passive:!0,capture:!0}),e.container.addEventListener("contextmenu",a=>{e.onRightClick&&a.preventDefault()}),e.renderer=new(i?wh:at.WebGLRenderer)(Object.assign({antialias:!0,alpha:!0},r)),e.renderer.setPixelRatio(Math.min(2,window.devicePixelRatio)),e.container.appendChild(e.renderer.domElement),e.extraRenderers=s,e.extraRenderers.forEach(a=>{a.domElement.style.position="absolute",a.domElement.style.top="0px",a.domElement.style.pointerEvents="none",e.container.appendChild(a.domElement)}),e.postProcessingComposer=new Uh(e.renderer),e.postProcessingComposer.addPass(new zh(e.scene,e.camera)),e.controls=new(_3(n)?n:{trackball:Rh,arcball:Ih,orbit:Lh,fly:Oh}[n])(e.camera,e.renderer.domElement),n==="fly"&&(e.controls.movementSpeed=300,e.controls.rollSpeed=Math.PI/6,e.controls.dragToLook=!0),(n==="trackball"||n==="arcball"||n==="orbit")&&(e.controls.minDistance=.1,e.controls.maxDistance=e.skyRadius,e.controls.addEventListener("start",()=>{e.controlsEngaged=!0}),e.controls.addEventListener("change",()=>{e.controlsEngaged&&(e.controlsDragging=!0)}),e.controls.addEventListener("end",()=>{e.controlsEngaged=!1,e.controlsDragging=!1}),e.renderer.domElement.style.cursor=null),[e.renderer,e.postProcessingComposer,...e.extraRenderers].forEach(a=>a.setSize(e.width,e.height)),e.camera.aspect=e.width/e.height,e.camera.updateProjectionMatrix(),e.camera.position.z=1e3,e.scene.add(e.skysphere=new at.Mesh),e.skysphere.visible=!1,e.loadComplete=e.scene.visible=!o},update(t,e){if(t.width&&t.height&&(e.hasOwnProperty("width")||e.hasOwnProperty("height"))){let i=t.width,r=t.height;t.container.style.width=`${i}px`,t.container.style.height=`${r}px`,[t.renderer,t.postProcessingComposer,...t.extraRenderers].forEach(o=>o.setSize(i,r)),t.camera.aspect=i/r;let s=t.viewOffset.slice(0,2);s.some(o=>o)&&t.camera.setViewOffset(i,r,...s,i,r),t.camera.updateProjectionMatrix()}if(e.hasOwnProperty("viewOffset")){let i=t.width,r=t.height,s=t.viewOffset.slice(0,2);s.some(o=>o)?t.camera.setViewOffset(i,r,...s,i,r):t.camera.clearViewOffset()}if(e.hasOwnProperty("skyRadius")&&t.skyRadius&&(t.controls.hasOwnProperty("maxDistance")&&e.skyRadius&&(t.controls.maxDistance=Math.min(t.controls.maxDistance,t.skyRadius)),t.camera.far=t.skyRadius*2.5,t.camera.updateProjectionMatrix(),t.skysphere.geometry=new at.SphereGeometry(t.skyRadius)),e.hasOwnProperty("backgroundColor")){let i=pr(t.backgroundColor).alpha;i===void 0&&(i=1),t.renderer.setClearColor(new at.Color(Nv(1,t.backgroundColor)),i)}e.hasOwnProperty("backgroundImageUrl")&&(t.backgroundImageUrl?new at.TextureLoader().load(t.backgroundImageUrl,i=>{i.colorSpace=at.SRGBColorSpace,t.skysphere.material=new at.MeshBasicMaterial({map:i,side:at.BackSide}),t.skysphere.visible=!0,t.onBackgroundImageLoaded&&setTimeout(t.onBackgroundImageLoaded),!t.loadComplete&&n()}):(t.skysphere.visible=!1,t.skysphere.material.map=null,!t.loadComplete&&n())),e.hasOwnProperty("showNavInfo")&&(t.navInfo.style.display=t.showNavInfo?null:"none"),e.hasOwnProperty("lights")&&((e.lights||[]).forEach(i=>t.scene.remove(i)),t.lights.forEach(i=>t.scene.add(i))),e.hasOwnProperty("objects")&&((e.objects||[]).forEach(i=>t.scene.remove(i)),t.objects.forEach(i=>t.scene.add(i)));function n(){t.loadComplete=t.scene.visible=!0}}});function _3(t){return typeof t=="function"&&Function.prototype.toString.call(t).startsWith("class")}function sp(t,e){(e==null||e>t.length)&&(e=t.length);for(var n=0,i=Array(e);n<e;n++)i[n]=t[n];return i}function v3(t){if(Array.isArray(t))return sp(t)}function Ca(t,e,n){return(e=M3(e))in t?Object.defineProperty(t,e,{value:n,enumerable:!0,configurable:!0,writable:!0}):t[e]=n,t}function y3(t){if(typeof Symbol<"u"&&t[Symbol.iterator]!=null||t["@@iterator"]!=null)return Array.from(t)}function x3(){throw new TypeError(`Invalid attempt to spread non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}function dy(t,e){var n=Object.keys(t);if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(t);e&&(i=i.filter(function(r){return Object.getOwnPropertyDescriptor(t,r).enumerable})),n.push.apply(n,i)}return n}function Jh(t){for(var e=1;e<arguments.length;e++){var n=arguments[e]!=null?arguments[e]:{};e%2?dy(Object(n),!0).forEach(function(i){Ca(t,i,n[i])}):Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(n)):dy(Object(n)).forEach(function(i){Object.defineProperty(t,i,Object.getOwnPropertyDescriptor(n,i))})}return t}function eu(t){return v3(t)||y3(t)||S3(t)||x3()}function b3(t,e){if(typeof t!="object"||!t)return t;var n=t[Symbol.toPrimitive];if(n!==void 0){var i=n.call(t,e);if(typeof i!="object")return i;throw new TypeError("@@toPrimitive must return a primitive value.")}return(e==="string"?String:Number)(t)}function M3(t){var e=b3(t,"string");return typeof e=="symbol"?e:e+""}function S3(t,e){if(t){if(typeof t=="string")return sp(t,e);var n={}.toString.call(t).slice(8,-1);return n==="Object"&&t.constructor&&(n=t.constructor.name),n==="Map"||n==="Set"?Array.from(t):n==="Arguments"||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)?sp(t,e):void 0}}function py(t,e){var n=new e;return n._destructor&&n._destructor(),{linkProp:function(r){return{default:n[r](),onChange:function(o,a){a[t][r](o)},triggerUpdate:!1}},linkMethod:function(r){return function(s){for(var o=s[t],a=arguments.length,l=new Array(a>1?a-1:0),c=1;c<a;c++)l[c-1]=arguments[c];var h=o[r].apply(o,l);return h===o?this:h}}}}var rp=window.THREE?window.THREE:{AmbientLight:Or,DirectionalLight:Yo,REVISION:"180"},w3=170,my=py("forceGraph",Ed),E3=Object.assign.apply(Object,eu(["jsonUrl","graphData","numDimensions","dagMode","dagLevelDistance","dagNodeFilter","onDagError","nodeRelSize","nodeId","nodeVal","nodeResolution","nodeColor","nodeAutoColorBy","nodeOpacity","nodeVisibility","nodeThreeObject","nodeThreeObjectExtend","nodePositionUpdate","linkSource","linkTarget","linkVisibility","linkColor","linkAutoColorBy","linkOpacity","linkWidth","linkResolution","linkCurvature","linkCurveRotation","linkMaterial","linkThreeObject","linkThreeObjectExtend","linkPositionUpdate","linkDirectionalArrowLength","linkDirectionalArrowColor","linkDirectionalArrowRelPos","linkDirectionalArrowResolution","linkDirectionalParticles","linkDirectionalParticleSpeed","linkDirectionalParticleOffset","linkDirectionalParticleWidth","linkDirectionalParticleColor","linkDirectionalParticleResolution","linkDirectionalParticleThreeObject","forceEngine","d3AlphaDecay","d3VelocityDecay","d3AlphaMin","ngraphPhysics","warmupTicks","cooldownTicks","cooldownTime","onEngineTick","onEngineStop"].map(function(t){return Ca({},t,my.linkProp(t))}))),T3=Object.assign.apply(Object,eu(["refresh","getGraphBbox","d3Force","d3ReheatSimulation","emitParticle"].map(function(t){return Ca({},t,my.linkMethod(t))}))),Qh=py("renderObjs",ip),A3=Object.assign.apply(Object,eu(["width","height","backgroundColor","showNavInfo","enablePointerInteraction"].map(function(t){return Ca({},t,Qh.linkProp(t))}))),C3=Object.assign.apply(Object,eu(["lights","cameraPosition","postProcessingComposer"].map(function(t){return Ca({},t,Qh.linkMethod(t))})).concat([{graph2ScreenCoords:Qh.linkMethod("getScreenCoords"),screen2GraphCoords:Qh.linkMethod("getSceneCoords")}])),gy=lr({props:Jh(Jh({nodeLabel:{default:"name",triggerUpdate:!1},linkLabel:{default:"name",triggerUpdate:!1},linkHoverPrecision:{default:1,onChange:function(e,n){return n.renderObjs.lineHoverPrecision(e)},triggerUpdate:!1},enableNavigationControls:{default:!0,onChange:function(e,n){var i=n.renderObjs.controls();i&&(i.enabled=e,e&&i.domElement&&i.domElement.dispatchEvent(new PointerEvent("pointerup")))},triggerUpdate:!1},enableNodeDrag:{default:!0,triggerUpdate:!1},onNodeDrag:{default:function(){},triggerUpdate:!1},onNodeDragEnd:{default:function(){},triggerUpdate:!1},onNodeClick:{triggerUpdate:!1},onNodeRightClick:{triggerUpdate:!1},onNodeHover:{triggerUpdate:!1},onLinkClick:{triggerUpdate:!1},onLinkRightClick:{triggerUpdate:!1},onLinkHover:{triggerUpdate:!1},onBackgroundClick:{triggerUpdate:!1},onBackgroundRightClick:{triggerUpdate:!1},showPointerCursor:{default:!0,triggerUpdate:!1}},E3),A3),methods:Jh(Jh({zoomToFit:function(e,n,i){for(var r,s=arguments.length,o=new Array(s>3?s-3:0),a=3;a<s;a++)o[a-3]=arguments[a];return e.renderObjs.fitToBbox((r=e.forceGraph).getGraphBbox.apply(r,o),n,i),this},pauseAnimation:function(e){return e.animationFrameRequestId!==null&&(cancelAnimationFrame(e.animationFrameRequestId),e.animationFrameRequestId=null),this},resumeAnimation:function(e){return e.animationFrameRequestId===null&&this._animationCycle(),this},_animationCycle:function(e){e.enablePointerInteraction&&(this.renderer().domElement.style.cursor=null),e.forceGraph.tickFrame(),e.renderObjs.tick(),e.animationFrameRequestId=requestAnimationFrame(this._animationCycle)},scene:function(e){return e.renderObjs.scene()},camera:function(e){return e.renderObjs.camera()},renderer:function(e){return e.renderObjs.renderer()},controls:function(e){return e.renderObjs.controls()},tbControls:function(e){return e.renderObjs.tbControls()},_destructor:function(){this.pauseAnimation(),this.graphData({nodes:[],links:[]})}},T3),C3),stateInit:function(e){var n=e.controlType,i=e.rendererConfig,r=e.extraRenderers,s=new Ed;return{forceGraph:s,renderObjs:ip({controlType:n,rendererConfig:i,extraRenderers:r}).objects([s]).lights([new rp.AmbientLight(13421772,Math.PI),new rp.DirectionalLight(16777215,.6*Math.PI)])}},init:function(e,n){e.innerHTML="",e.appendChild(n.container=document.createElement("div")),n.container.style.position="relative";var i=document.createElement("div");n.container.appendChild(i),n.renderObjs(i);var r=n.renderObjs.camera(),s=n.renderObjs.renderer(),o=n.renderObjs.controls();o.enabled=!!n.enableNavigationControls,n.lastSetCameraZ=r.position.z;var a;n.container.appendChild(a=document.createElement("div")),a.className="graph-info-msg",a.textContent="",n.forceGraph.onLoading(function(){a.textContent="Loading..."}).onFinishLoading(function(){a.textContent=""}).onUpdate(function(){n.graphData=n.forceGraph.graphData(),r.position.x===0&&r.position.y===0&&r.position.z===n.lastSetCameraZ&&n.graphData.nodes.length&&(r.lookAt(n.forceGraph.position),n.lastSetCameraZ=r.position.z=Math.cbrt(n.graphData.nodes.length)*w3)}).onFinishUpdate(function(){if(n._dragControls){var l=n.graphData.nodes.find(function(h){return h.__initialFixedPos&&!h.__disposeControlsAfterDrag});l?l.__disposeControlsAfterDrag=!0:n._dragControls.dispose(),n._dragControls=void 0}if(n.enableNodeDrag&&n.enablePointerInteraction&&n.forceEngine==="d3"){var c=n._dragControls=new Ql(n.graphData.nodes.map(function(h){return h.__threeObj}).filter(function(h){return h}),r,s.domElement);c.addEventListener("dragstart",function(h){var u=ji(h.object);if(u){o.enabled=!1,h.object.__initialPos=h.object.position.clone(),h.object.__prevPos=h.object.position.clone();var d=u.__data;!d.__initialFixedPos&&(d.__initialFixedPos={fx:d.fx,fy:d.fy,fz:d.fz}),!d.__initialPos&&(d.__initialPos={x:d.x,y:d.y,z:d.z}),["x","y","z"].forEach(function(f){return d["f".concat(f)]=d[f]}),s.domElement.classList.add("grabbable")}}),c.addEventListener("drag",function(h){var u=ji(h.object);if(u){if(!h.object.hasOwnProperty("__graphObjType")){var d=h.object.__initialPos,f=h.object.__prevPos,m=h.object.position;u.position.add(m.clone().sub(f)),f.copy(m),m.copy(d)}var _=u.__data,g=u.position,p={x:g.x-_.x,y:g.y-_.y,z:g.z-_.z};["x","y","z"].forEach(function(x){return _["f".concat(x)]=_[x]=g[x]}),n.forceGraph.d3AlphaTarget(.3).resetCountdown(),_.__dragged=!0,n.onNodeDrag(_,p)}}),c.addEventListener("dragend",function(h){var u=ji(h.object);if(u){delete h.object.__initialPos,delete h.object.__prevPos;var d=u.__data;d.__disposeControlsAfterDrag&&(c.dispose(),delete d.__disposeControlsAfterDrag);var f=d.__initialFixedPos,m=d.__initialPos,_={x:m.x-d.x,y:m.y-d.y,z:m.z-d.z};if(f&&(["x","y","z"].forEach(function(p){var x="f".concat(p);f[x]===void 0&&delete d[x]}),delete d.__initialFixedPos,delete d.__initialPos,d.__dragged&&(delete d.__dragged,n.onNodeDragEnd(d,_))),n.forceGraph.d3AlphaTarget(0).resetCountdown(),n.enableNavigationControls){var g;o.enabled=!0,o._status&&((g=o._onPointerCancel)===null||g===void 0||g.call(o)),o.domElement&&o.domElement.ownerDocument&&o.domElement.ownerDocument.dispatchEvent(new PointerEvent("pointerup",{pointerType:"touch"}))}s.domElement.classList.remove("grabbable")}})}}),rp.REVISION<155&&(n.renderObjs.renderer().useLegacyLights=!1),n.renderObjs.hoverOrderComparator(function(l,c){var h=ji(l);if(!h)return 1;var u=ji(c);if(!u)return-1;var d=function(m){return m.__graphObjType==="node"};return d(u)-d(h)}).tooltipContent(function(l){var c=ji(l);return c&&tt(n["".concat(c.__graphObjType,"Label")])(c.__data)||""}).hoverDuringDrag(!1).onHover(function(l){var c=ji(l);if(c!==n.hoverObj){var h=n.hoverObj?n.hoverObj.__graphObjType:null,u=n.hoverObj?n.hoverObj.__data:null,d=c?c.__graphObjType:null,f=c?c.__data:null;if(h&&h!==d){var m=n["on".concat(h==="node"?"Node":"Link","Hover")];m&&m(null,u)}if(d){var _=n["on".concat(d==="node"?"Node":"Link","Hover")];_&&_(f,h===d?u:null)}s.domElement.classList[(c&&n["on".concat(d==="node"?"Node":"Link","Click")]||!c&&n.onBackgroundClick)&&tt(n.showPointerCursor)(f)?"add":"remove"]("clickable"),n.hoverObj=c}}).clickAfterDrag(!1).onClick(function(l,c){var h=ji(l);if(h){var u=n["on".concat(h.__graphObjType==="node"?"Node":"Link","Click")];u&&u(h.__data,c)}else n.onBackgroundClick&&n.onBackgroundClick(c)}).onRightClick(function(l,c){var h=ji(l);if(h){var u=n["on".concat(h.__graphObjType==="node"?"Node":"Link","RightClick")];u&&u(h.__data,c)}else n.onBackgroundRightClick&&n.onBackgroundRightClick(c)}),this._animationCycle()}});function ji(t){for(var e=t;e&&!e.hasOwnProperty("__graphObjType");)e=e.parent;return e}var _y={name:"LuminosityHighPassShader",uniforms:{tDiffuse:{value:null},luminosityThreshold:{value:1},smoothWidth:{value:1},defaultColor:{value:new Oe(0)},defaultOpacity:{value:0}},vertexShader:`

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

		}`};var ro=class t extends Ln{constructor(e,n=1,i,r){super(),this.strength=n,this.radius=i,this.threshold=r,this.resolution=e!==void 0?new ne(e.x,e.y):new ne(256,256),this.clearColor=new Oe(0,0,0),this.needsSwap=!1,this.renderTargetsHorizontal=[],this.renderTargetsVertical=[],this.nMips=5;let s=Math.round(this.resolution.x/2),o=Math.round(this.resolution.y/2);this.renderTargetBright=new sn(s,o,{type:Wn}),this.renderTargetBright.texture.name="UnrealBloomPass.bright",this.renderTargetBright.texture.generateMipmaps=!1;for(let h=0;h<this.nMips;h++){let u=new sn(s,o,{type:Wn});u.texture.name="UnrealBloomPass.h"+h,u.texture.generateMipmaps=!1,this.renderTargetsHorizontal.push(u);let d=new sn(s,o,{type:Wn});d.texture.name="UnrealBloomPass.v"+h,d.texture.generateMipmaps=!1,this.renderTargetsVertical.push(d),s=Math.round(s/2),o=Math.round(o/2)}let a=_y;this.highPassUniforms=Bi.clone(a.uniforms),this.highPassUniforms.luminosityThreshold.value=r,this.highPassUniforms.smoothWidth.value=.01,this.materialHighPassFilter=new Bt({uniforms:this.highPassUniforms,vertexShader:a.vertexShader,fragmentShader:a.fragmentShader}),this.separableBlurMaterials=[];let l=[3,5,7,9,11];s=Math.round(this.resolution.x/2),o=Math.round(this.resolution.y/2);for(let h=0;h<this.nMips;h++)this.separableBlurMaterials.push(this._getSeparableBlurMaterial(l[h])),this.separableBlurMaterials[h].uniforms.invSize.value=new ne(1/s,1/o),s=Math.round(s/2),o=Math.round(o/2);this.compositeMaterial=this._getCompositeMaterial(this.nMips),this.compositeMaterial.uniforms.blurTexture1.value=this.renderTargetsVertical[0].texture,this.compositeMaterial.uniforms.blurTexture2.value=this.renderTargetsVertical[1].texture,this.compositeMaterial.uniforms.blurTexture3.value=this.renderTargetsVertical[2].texture,this.compositeMaterial.uniforms.blurTexture4.value=this.renderTargetsVertical[3].texture,this.compositeMaterial.uniforms.blurTexture5.value=this.renderTargetsVertical[4].texture,this.compositeMaterial.uniforms.bloomStrength.value=n,this.compositeMaterial.uniforms.bloomRadius.value=.1;let c=[1,.8,.6,.4,.2];this.compositeMaterial.uniforms.bloomFactors.value=c,this.bloomTintColors=[new R(1,1,1),new R(1,1,1),new R(1,1,1),new R(1,1,1),new R(1,1,1)],this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,this.copyUniforms=Bi.clone(to.uniforms),this.blendMaterial=new Bt({uniforms:this.copyUniforms,vertexShader:to.vertexShader,fragmentShader:to.fragmentShader,blending:ir,depthTest:!1,depthWrite:!1,transparent:!0}),this._oldClearColor=new Oe,this._oldClearAlpha=1,this._basic=new Cn,this._fsQuad=new fr(null)}dispose(){for(let e=0;e<this.renderTargetsHorizontal.length;e++)this.renderTargetsHorizontal[e].dispose();for(let e=0;e<this.renderTargetsVertical.length;e++)this.renderTargetsVertical[e].dispose();this.renderTargetBright.dispose();for(let e=0;e<this.separableBlurMaterials.length;e++)this.separableBlurMaterials[e].dispose();this.compositeMaterial.dispose(),this.blendMaterial.dispose(),this._basic.dispose(),this._fsQuad.dispose()}setSize(e,n){let i=Math.round(e/2),r=Math.round(n/2);this.renderTargetBright.setSize(i,r);for(let s=0;s<this.nMips;s++)this.renderTargetsHorizontal[s].setSize(i,r),this.renderTargetsVertical[s].setSize(i,r),this.separableBlurMaterials[s].uniforms.invSize.value=new ne(1/i,1/r),i=Math.round(i/2),r=Math.round(r/2)}render(e,n,i,r,s){e.getClearColor(this._oldClearColor),this._oldClearAlpha=e.getClearAlpha();let o=e.autoClear;e.autoClear=!1,e.setClearColor(this.clearColor,0),s&&e.state.buffers.stencil.setTest(!1),this.renderToScreen&&(this._fsQuad.material=this._basic,this._basic.map=i.texture,e.setRenderTarget(null),e.clear(),this._fsQuad.render(e)),this.highPassUniforms.tDiffuse.value=i.texture,this.highPassUniforms.luminosityThreshold.value=this.threshold,this._fsQuad.material=this.materialHighPassFilter,e.setRenderTarget(this.renderTargetBright),e.clear(),this._fsQuad.render(e);let a=this.renderTargetBright;for(let l=0;l<this.nMips;l++)this._fsQuad.material=this.separableBlurMaterials[l],this.separableBlurMaterials[l].uniforms.colorTexture.value=a.texture,this.separableBlurMaterials[l].uniforms.direction.value=t.BlurDirectionX,e.setRenderTarget(this.renderTargetsHorizontal[l]),e.clear(),this._fsQuad.render(e),this.separableBlurMaterials[l].uniforms.colorTexture.value=this.renderTargetsHorizontal[l].texture,this.separableBlurMaterials[l].uniforms.direction.value=t.BlurDirectionY,e.setRenderTarget(this.renderTargetsVertical[l]),e.clear(),this._fsQuad.render(e),a=this.renderTargetsVertical[l];this._fsQuad.material=this.compositeMaterial,this.compositeMaterial.uniforms.bloomStrength.value=this.strength,this.compositeMaterial.uniforms.bloomRadius.value=this.radius,this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,e.setRenderTarget(this.renderTargetsHorizontal[0]),e.clear(),this._fsQuad.render(e),this._fsQuad.material=this.blendMaterial,this.copyUniforms.tDiffuse.value=this.renderTargetsHorizontal[0].texture,s&&e.state.buffers.stencil.setTest(!0),this.renderToScreen?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(i),this._fsQuad.render(e)),e.setClearColor(this._oldClearColor,this._oldClearAlpha),e.autoClear=o}_getSeparableBlurMaterial(e){let n=[];for(let i=0;i<e;i++)n.push(.39894*Math.exp(-.5*i*i/(e*e))/e);return new Bt({defines:{KERNEL_RADIUS:e},uniforms:{colorTexture:{value:null},invSize:{value:new ne(.5,.5)},direction:{value:new ne(.5,.5)},gaussianCoefficients:{value:n}},vertexShader:`varying vec2 vUv;
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
				}`})}};ro.BlurDirectionX=new ne(1,0);ro.BlurDirectionY=new ne(0,1);var Ra={name:"OutputShader",uniforms:{tDiffuse:{value:null},toneMappingExposure:{value:1}},vertexShader:`
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

		}`};var tu=class extends Ln{constructor(){super(),this.uniforms=Bi.clone(Ra.uniforms),this.material=new Go({name:Ra.name,uniforms:this.uniforms,vertexShader:Ra.vertexShader,fragmentShader:Ra.fragmentShader}),this._fsQuad=new fr(this.material),this._outputColorSpace=null,this._toneMapping=null}render(e,n,i){this.uniforms.tDiffuse.value=i.texture,this.uniforms.toneMappingExposure.value=e.toneMappingExposure,(this._outputColorSpace!==e.outputColorSpace||this._toneMapping!==e.toneMapping)&&(this._outputColorSpace=e.outputColorSpace,this._toneMapping=e.toneMapping,this.material.defines={},ot.getTransfer(this._outputColorSpace)===ht&&(this.material.defines.SRGB_TRANSFER=""),this._toneMapping===el?this.material.defines.LINEAR_TONE_MAPPING="":this._toneMapping===tl?this.material.defines.REINHARD_TONE_MAPPING="":this._toneMapping===nl?this.material.defines.CINEON_TONE_MAPPING="":this._toneMapping===il?this.material.defines.ACES_FILMIC_TONE_MAPPING="":this._toneMapping===sl?this.material.defines.AGX_TONE_MAPPING="":this._toneMapping===ol?this.material.defines.NEUTRAL_TONE_MAPPING="":this._toneMapping===rl&&(this.material.defines.CUSTOM_TONE_MAPPING=""),this.material.needsUpdate=!0),this.renderToScreen===!0?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(n),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this._fsQuad.render(e))}dispose(){this.material.dispose(),this._fsQuad.dispose()}};var br={online:{rotulo:"Online",icone:"i-online",peso:5},suspeito:{rotulo:"Online",icone:"i-online",peso:5,dica:"verificando"},instavel:{rotulo:"Inst\xE1vel",icone:"i-instavel",peso:2},offline:{rotulo:"Offline",icone:"i-offline",peso:0},inalcancavel:{rotulo:"Inalcan\xE7\xE1vel",icone:"i-inalcancavel",peso:1},pausado:{rotulo:"Pausado",icone:"i-pausado",peso:4},desconhecido:{rotulo:"Aguardando",icone:"i-desconhecido",peso:3}};function so(t){let e=2166136261;for(let n of new TextEncoder().encode(String(t)))e^=n,e=Math.imul(e,16777619)>>>0;return e>>>0}var vy="#4CA878",op="#7A8194",yy={online:{cor:vy,forma:"cheia",pulsa:!1,treme:!1,opacidade:1},instavel:{cor:"#D9A441",forma:"anel",pulsa:!1,treme:!1,opacidade:1},suspeito:{cor:vy,forma:"cheia",pulsa:!1,treme:!0,opacidade:1},offline:{cor:"#D97373",forma:"cruz",pulsa:!0,treme:!1,opacidade:1},pausado:{cor:op,forma:"translucida",pulsa:!1,treme:!1,opacidade:.45},inalcancavel:{cor:op,forma:"elo",pulsa:!1,treme:!1,opacidade:.7},desconhecido:{cor:op,forma:"anel",pulsa:!1,treme:!1,opacidade:.7}};function Pa(t){let e=Object.hasOwn(yy,t)?t:"desconhecido";return{...yy[e],rotulo:br[e].rotulo}}var xy=["#7FB2E5","#B79CE8","#E58FB8","#E8A27C","#C9C46A","#6CC6B8","#9AA7F0","#D69AD6"],R3=/^#[0-9A-Fa-f]{6}$/;function ap(t){let e=t?.cor;return typeof e=="string"&&R3.test(e)?e:xy[so(String(t?.slug??""))%xy.length]}function P3(t,e){return t>3e3||e!=null&&e<30?"agrupado":t>1e3?"reduzido":"completo"}function cp(t=()=>performance.now()){let e=[],n=[];function i(){if(e.length<2)return null;let r=e[e.length-1]-e[0];return r<1e3?null:(e.length-1)*1e3/r}return{quadro(){let r=t();e.push(r);let s=r-3e3,o=0;for(;o<e.length&&e[o]<s;)o++;o&&(e=e.slice(o));let a=i();a!==null&&n.push({t:r,v:a});let l=r-3e4,c=0;for(;c<n.length&&n[c].t<l;)c++;c&&(n=n.slice(c))},media(){return i()},abaixoDe(r,s){if(!n.length)return!1;let o=n[n.length-1],a=null;for(let l=n.length-1;l>=0&&n[l].v<r;l--)a=n[l].t;return a===null?!1:o.t-a>=s*1e3}}}function by(t,e){return t!=null&&t>=50&&!e}var I3=24,D3=5,L3=6e4;function My(t){return t.abaixoDe(I3,D3)}function lp({total:t,agrupadoPorFps:e=!1,queda:n=!1,agora:i=0,ultimaEntrada:r=-1/0}){let s=P3(t,null);return s==="agrupado"?{nivel:"agrupado",agrupadoPorFps:!1,ultimaEntrada:r}:e?{nivel:"agrupado",agrupadoPorFps:!0,ultimaEntrada:r}:n&&i-r>=L3?{nivel:"agrupado",agrupadoPorFps:!0,ultimaEntrada:i}:{nivel:s,agrupadoPorFps:!1,ultimaEntrada:r}}function Sy(t){return{...t,agrupadoPorFps:!1}}var dp=["a","b","c","d","e"],O3={a:"Constela\xE7\xE3o",b:"\xD3rbitas",c:"Gal\xE1xia",d:"\xC1tomo",e:"\xC1rvore 3D"},qi=12,Ia=230,wy=60,nu=18*Math.PI/180,Qr=Math.PI*2,hp=(t,e)=>so(`${t}#${e}`)/4294967296,Ey=t=>((Number(t)||0)%qi+qi)%qi;function iu(t){let e=t/qi*Qr,n=Math.cos(e)*Ia,i=t%2===0?wy:-wy,r=Math.sin(e)*Ia;return{x:n,y:i*Math.cos(nu)-r*Math.sin(nu),z:i*Math.sin(nu)+r*Math.cos(nu)}}function N3(t,e,n){let i=hp(e,1)*2-1,r=Math.sqrt(1-i*i),s=hp(e,2)*Qr,o=18+hp(e,3)*28;return{x:n.x+r*Math.cos(s)*o,y:n.y+i*o,z:n.z+r*Math.sin(s)*o}}var F3=5,U3=(t,e)=>t<e?-1:t>e?1:0,up=new Map;function z3(t){if(!up.has(t)){let e=[];for(let n=0;e.length<t;n++){let i=20+n*11,r=Math.max(1,Math.floor(Qr*i/F3));for(let s=0;s<r&&e.length<t;s++)e.push({r:n,i:s,n:r,raio:i})}up.set(t,e)}return up.get(t)}function k3(t,e,n,i){let r=iu(t),{r:s,i:o,n:a,raio:l}=z3(i)[n],c=(o+.5*(s%2))/a*Qr+s*.4;return{x:r.x+Math.cos(c)*l,y:r.y+Math.sin(c*2)*3,z:r.z+Math.sin(c)*l}}var oo=64,Ty=9;function B3(t){let e=t/qi*Qr;return{x:Math.cos(e+.9)*120,y:0,z:Math.sin(e+.9)*120}}function V3(t,e,n){let i=t/qi*Qr,r=(n%oo+.5)/oo,s=Math.floor(n/oo),o=60+r*260+s%8*Ty,a=i+r*2.6+.9;return{x:Math.cos(a)*o,y:Math.floor(s/8)*Ty,z:Math.sin(a)*o}}var H3=3.17;function G3(t){return Ay(t,Math.PI/2+t*H3,0,0)}function Ay(t,e,n,i){let r=90+t*26+n,s=t/qi*Math.PI,o=t*.7,a=Math.cos(e)*r,l=Math.sin(e)*r,c=i*Math.cos(s)-l*Math.sin(s),h=i*Math.sin(s)+l*Math.cos(s);return{x:a*Math.cos(o)-h*Math.sin(o),y:c,z:a*Math.sin(o)+h*Math.cos(o)}}function W3(t,e,n){let i=Math.floor(n/oo),r=(n%oo+.5)/oo*Qr;return Ay(t,r,(i%8+1)*8,Math.floor(i/8)*8)}var Cy=t=>(t-(qi-1)/2)*70,j3=t=>({x:Cy(t),y:90,z:0});function q3(t,e,n){let i=n%12,r=Math.floor(n/12);return{x:Cy(t)+(i-5.5)*5.5,y:40-r*6,z:i%2*4+r%2*3}}var fp={a:{hub:iu,item:(t,e)=>N3(t,e,iu(t)),slots:!1},b:{hub:iu,item:k3},c:{hub:B3,item:V3},d:{hub:G3,item:W3},e:{hub:j3,item:q3}};function Ry(t,e,n){let i=fp[t]??fp.a,r=fp[t]?t:"a",s=new Map;s.set("srv",{x:0,y:r==="e"?200:0,z:0});let o=new Map;for(let l of[...e].sort((c,h)=>c.ordem-h.ordem||(c.slug<h.slug?-1:1)))o.set(l.slug,l.ordem),l.slug!=="sentinela"&&s.set(`h-${l.slug}`,i.hub(Ey(l.ordem)));let a=new Map;for(let l of n)a.has(l.classe)||a.set(l.classe,[]),a.get(l.classe).push(l.id);for(let[l,c]of a){let h=o.has(l)?Ey(o.get(l)):so(String(l))%qi;if(i.slots===!1){for(let m of c)s.set(m,i.item(h,m));continue}let u=64;for(;u<2*c.length;)u*=4;let d=new Set,f=c.map(m=>({id:m,h:so(m)}));f.sort((m,_)=>m.h-_.h||U3(m.id,_.id));for(let{id:m,h:_}of f){let g=_%u;for(;d.has(g);)g=(g+1)%u;d.add(g),s.set(m,i.item(h,m,g,u))}}return s}var mp=Math.PI/180,X3=1.15,$3=40,Y3=.45,Z3=(t,e)=>({x:t.x-e.x,y:t.y-e.y,z:t.z-e.z}),pp=(t,e)=>({x:t.x+e.x,y:t.y+e.y,z:t.z+e.z}),Da=(t,e)=>({x:t.x*e,y:t.y*e,z:t.z*e});var Py=(t,e)=>({x:t.y*e.z-t.z*e.y,y:t.z*e.x-t.x*e.z,z:t.x*e.y-t.y*e.x}),gp=t=>Math.hypot(t.x,t.y,t.z);function Iy(t){let e=gp(t);return e<1e-9?{x:0,y:0,z:1}:Da(t,1/e)}function Dy(t,e,n=0,i=1){let r=0;for(let s of e)r=Math.max(r,gp(Z3(s,t)));return Math.max(i,r+n)}function K3(t,e,{aspecto:n=1,fracao:i=1,folga:r=X3}={}){let s=Math.tan(e*mp/2),o=Math.max(.15,Math.min(i,n*i)),a=Math.atan(s*o);return t/Math.sin(a)*r}function J3(t,e,n=$3,i=Y3){let r=e.x-t.x,s=e.z-t.z;Math.hypot(r,s)<1e-6&&(r=0,s=1);let o=Math.hypot(r,s);r/=o,s/=o;let a=n*mp,l=Math.cos(a),c=Math.sin(a);return Iy({x:r*l-s*c,y:i,z:r*c+s*l})}function Ly({alvo:t,de:e,raio:n,fov:i,largura:r,altura:s,margens:o={}}){let{esquerda:a=0,direita:l=0,cima:c=0,baixo:h=0}=o,u=Math.max(1,r-a-l),d=Math.max(1,s-c-h),f=Math.min(u,d)/s,m=K3(n,i,{fracao:f}),_=J3(e,t),g=Da(_,-1),p=Py(g,{x:0,y:1,z:0});gp(p)<1e-6&&(p={x:1,y:0,z:0}),p=Iy(p);let x=Py(p,g),y=2*m*Math.tan(i*mp/2)/s,v=(a-l)/2,M=(h-c)/2,b=pp(t,pp(Da(p,-v*y),Da(x,-M*y)));return{camera:pp(b,Da(_,m)),olhar:b,distancia:m}}var _p=1500,Q3={min:.72,max:1.12,referencia:420};function Oy({ndc:t,distancia:e,largura:n,altura:i,margem:r=40}){if(!t||!(t.z>-1&&t.z<1)||!(e>0)||e>_p)return{visivel:!1};let s=(t.x+1)/2*n,o=(1-t.y)/2*i;if(s<-r||s>n+r||o<-r||o>i+r)return{visivel:!1};let{min:a,max:l,referencia:c}=Q3,h=Math.min(l,Math.max(a,c/e));return{visivel:!0,x:Math.round(s),y:Math.round(o),escala:Math.round(h*100)/100}}var ru="#0e1016",Ny="#8793E8",Fy="#68C7BC",eI="#dfe4ff",su=.15,Sn={equipamento:2.4,haloEquipamento:13,marca:8.5,classe:6.5,haloClasse:44,nucleo:14,haloServidor:110},ao=()=>{};function Uy(){let t=new Map;return{obter(e,n){let i=t.get(e);if(!i){i=n();let r=i.dispose.bind(i);i.dispose=()=>{},i.liberarDeVerdade=r,t.set(e,i)}return i},get tamanho(){return t.size},liberar(){for(let e of t.values())e.liberarDeVerdade();t.clear()}}}var zy=(t,e)=>{let n=document.createElement("canvas");return n.width=t,n.height=e,n};function ky(t){let e=new Fo(t);return e.colorSpace=Zt,e}var tI=t=>t<.25?1-.45*t/.25:.55*(1-(t-.25)/.75);function By(t,e){let n=t.getContext("2d");n.clearRect(0,0,128,128);let i=n.createRadialGradient(64,64,0,64,64,64);for(let r=0;r<=16;r++){let s=r/16;i.addColorStop(s,`rgba(255,255,255,${(tI(s)**e).toFixed(4)})`)}n.fillStyle=i,n.fillRect(0,0,128,128)}function vp(t){return t.obter("tex:brilho",()=>{let e=zy(128,128);By(e,1);let n=ky(e);return n.userData.canvas=e,n})}function yp(t,e=!0){let n=vp(t);By(n.userData.canvas,e?2.2:1),n.needsUpdate=!0}function Vy(t,e){return t.obter(`tex:${e}`,()=>{let n=zy(64,64),i=n.getContext("2d");return i.strokeStyle="#ffffff",i.lineCap="round",e==="anel"?(i.lineWidth=5,i.beginPath(),i.arc(32,32,24,0,Math.PI*2),i.stroke()):e==="elo"?(i.lineWidth=6,i.beginPath(),i.arc(32,32,24,Math.PI*.28,Math.PI*1.72),i.stroke()):(i.lineWidth=8,i.beginPath(),i.moveTo(16,16),i.lineTo(48,48),i.moveTo(48,16),i.lineTo(16,48),i.stroke()),ky(n)})}function Hy(t){let e=t.obter("mat:selecao",()=>new Oi({map:Vy(t,"anel"),color:Fy,transparent:!0,depthTest:!1,depthWrite:!1})),n=new Ni(e);return n.raycast=ao,n.renderOrder=10,n.visible=!1,n}var Gy=(t,e)=>e?su:t;function Wy(t,e,n,i){let r=Gy(n,i);return t.obter(`mat:${e}:${r}`,()=>new Wo({color:e,emissive:e,emissiveIntensity:.6,roughness:.45,metalness:.1,transparent:r<1,opacity:r,depthWrite:r>=1}))}function jy(t,e,n,i){let r=Gy(n,i);return t.obter(`halo:${e}:${r}`,()=>new Oi({map:vp(t),color:e,transparent:!0,opacity:r,depthWrite:!1,blending:ir}))}function nI(t,e,n,i){let r=i?su:.95;return t.obter(`marca:${e}:${n}:${r}`,()=>new Oi({map:Vy(t,e),color:n,transparent:!0,opacity:r,depthWrite:!1,depthTest:!1}))}var xp=(t,e,n)=>t.obter(`geo:esfera:${e.toFixed(2)}:${n}`,()=>new Fi(e,n,n));function qy(t,e,n){let i=new nn,r=new Ni,s=new It(xp(t,Sn.equipamento,n)),o=new Ni;return o.renderOrder=10,i.add(r,s,o),i.userData={halo:r,esfera:s,marca:o,escala:e,aparencia:null,semente:Math.random()*100},i}function La(t,e,n,i){let r=Pa(n),s=t.userData,o=s.escala;s.aparencia=r,s.esfera.material=Wy(e,r.cor,r.opacidade,i),s.halo.material=jy(e,r.cor,.55*r.opacidade,i);let a=Sn.haloEquipamento*o;s.halo.scale.set(a,a,1),s.esfera.scale.setScalar(o),s.esfera.position.set(0,0,0);let l=r.forma==="anel"||r.forma==="cruz"||r.forma==="elo";if(s.marca.visible=l,l){s.marca.material=nI(e,r.forma,r.cor,i);let c=Sn.marca*o*(r.forma==="cruz"?.8:1);s.marca.scale.set(c,c,1)}return r}function Xy(t,e,{esmaecido:n=!1,resolucao:i=16}={}){let r=qy(t,1,i);return La(r,t,e,n),r}function $y(t,e){let{raio:n,estado:i,esmaecido:r=!1}=e,s=qy(t,n/Sn.equipamento,24);return La(s,t,i,r),s}function Yy(t,{cor:e,esmaecido:n=!1}){let i=new nn,r=new Ni;r.raycast=ao,r.scale.set(Sn.haloClasse,Sn.haloClasse,1);let s=new It(xp(t,Sn.classe,32));return i.add(r,s),i.userData={halo:r,esfera:s},bp(i,t,e,n),i}function bp(t,e,n,i){let r=t.userData;r.esfera.material=Wy(e,n,1,i),r.halo.material=jy(e,n,.9,i)}function Zy(t){let e=new nn,n=new Ni(t.obter("srv:halo",()=>new Oi({map:vp(t),color:Ny,transparent:!0,depthWrite:!1,blending:ir})));n.scale.set(Sn.haloServidor,Sn.haloServidor,1),n.raycast=ao;let i=new It(xp(t,Sn.nucleo,48),t.obter("srv:nucleo",()=>new Cn({color:eI}))),r=t.obter("srv:geo-anel",()=>new Vo(26,.6,8,96)),s=new It(r,t.obter("srv:anel1",()=>new Cn({color:Fy,transparent:!0,opacity:.7}))),o=new It(r,t.obter("srv:anel2",()=>new Cn({color:Ny,transparent:!0,opacity:.7})));return o.scale.setScalar(1.35),s.raycast=ao,o.raycast=ao,e.add(n,i,s,o),e.userData={aneis:[s,o]},e}function Ky(t=1500,e=366){let n=e,i=()=>(n=n*16807%2147483647)/2147483647,r=new Float32Array(t*3);for(let l=0;l<t;l++){let c=i()*2-1,h=Math.sqrt(1-c*c),u=i()*Math.PI*2,d=1800+i()*1400;r[l*3]=h*Math.cos(u)*d,r[l*3+1]=c*d,r[l*3+2]=h*Math.sin(u)*d}let s=new St;s.setAttribute("position",new ut(r,3));let o=new Cs({color:"#c8d0ff",size:1.6,sizeAttenuation:!1,transparent:!0,opacity:.55,depthWrite:!1,fog:!1}),a=new No(s,o);return a.raycast=ao,a}var Na="sentinela",Oa=t=>t&&t.classe!==Na;function Mp(t){let e=new Map;for(let[n,i]of t)Oa(i)&&e.set(n,{classe:i.classe,estado:i.estado});return e}function Qy(t,e){let n=[],i=[],r=[],s=[];for(let[o,a]of e){if(!Oa(a))continue;let l=t.get(o);l?l.classe!==a.classe?r.push(o):l.estado!==a.estado&&s.push(o):n.push(o)}for(let o of t.keys())Oa(e.get(o))||i.push(o);return{adicionar:n,remover:i,mudouClasse:r,mudouEstado:s}}function ex(t){let e=new Map;for(let n of t.itens.values())Oa(n)&&e.set(n.classe,(e.get(n.classe)||0)+1);return t.ordemClasses.filter(n=>n&&n.slug!==Na).map(n=>({slug:n.slug,nome:n.nome,cor:n.cor,ordem:n.ordem,total:e.get(n.slug)||0}))}var Jy=t=>Object.hasOwn(br,t)?br[t].peso:br.desconhecido.peso,iI=t=>Object.hasOwn(br,t)?t:"desconhecido";function rI(t){let e=null;for(let n of t){let i=iI(n);(e===null||Jy(i)<Jy(e))&&(e=i)}return e??"desconhecido"}function Sp(t){let e=new Map;for(let i of t.values())Oa(i)&&(e.has(i.classe)||e.set(i.classe,[]),e.get(i.classe).push(i.estado));let n=new Map;for(let[i,r]of e)n.set(i,{total:r.length,pior:rI(r)});return n}function wp(t){let e=Math.max(0,Number(t)||0);return Math.min(30,5+2.2*Math.cbrt(e))}function ou(t,e){return`${t??""} \xB7 ${e}`.trim()}function tx(t){return((Number(t)||0)%12+12)%12%2===1}var nx={x:0,y:260,z:520},ix={x:0,y:60,z:620},rx={x:0,y:40,z:0},sI={a:.18,b:.07,c:.05,d:.1,e:.12},oI={a:!0,b:!0,c:!1,d:!1,e:!0},aI=900,sx=1200,cI=3e3,ox=Ia+40,ax={lado:60,cima:32},lI=_p-150,hI=250,cx=t=>dp.includes(t)?t:"a",uI=t=>t*t*(3-2*t);function fI(t,e){let n=parseInt(t.slice(1),16);return`rgba(${n>>16&255},${n>>8&255},${n&255},${e})`}function dI(t,e={}){let n=e.aoClicarEquipamento||null,i=typeof e.margens=="function"?e.margens:()=>({}),r=e.aoClicarClasse||(()=>{}),s=!!e.movimentoReduzido,o=e.particulas!==!1,a=e.interativo!==!1,l=!!e.caberNaTela,c={estilo:cx(e.estilo),nivel:"completo",total:0,agrupadoPorFps:!1,ultimaEntradaFps:-1/0,foco:null,girando:!s,store:null,pausado:!1,destruido:!1,bloom:null,inicioRender:null,ultimoCheque:0,ultimaLeitura:-1/0,transicao:null},h=Uy(),u=cp(),d=null,f={id:"srv",tipo:"servidor",fx:0,fy:0,fz:0,x:0,y:0,z:0},m=new Map,_=new Map,g=new Map,p=new Map,x=new Set,y=new Map,v=null;t.classList.add("teia-cena");let M=document.createElement("div"),b=new gy(t,{controlType:"orbit",rendererConfig:{antialias:!0,alpha:!1,powerPreference:"high-performance"}});b.backgroundColor(ru).showNavInfo(!1).enableNodeDrag(!1).width(t.clientWidth||window.innerWidth).height(t.clientHeight||window.innerHeight).nodeThreeObject(le).nodeLabel(re).linkWidth(U=>U.tronco?1.2:0).linkDirectionalParticleWidth(2.2).linkDirectionalParticleSpeed(.006).linkDirectionalParticleColor(U=>U.cor).cooldownTicks(160).onNodeClick(H).onNodeHover(U=>{t.style.cursor=U?"pointer":""}),Ue();let A=t.querySelector(".float-tooltip-kap");A&&Object.assign(A.style,{position:"absolute",pointerEvents:"none",padding:"4px 8px",borderRadius:"8px",font:"12px system-ui, sans-serif",color:"#E8EBF2",background:"rgba(27,31,40,.85)",whiteSpace:"nowrap",maxWidth:"min(360px, 80vw)",overflow:"hidden",textOverflow:"ellipsis"});let C=t.querySelector(".graph-info-msg");C&&(C.style.display="none");let E=document.createElement("div");E.className="teia-rotulos",E.setAttribute("aria-hidden","true"),t.appendChild(E);let w=new Map,I=new R,N=b.scene();N.background=new Oe(ru),N.fog=new Do(ru,.0012);let B=new $o(14673151,2.4,0,0);b.lights([new Or(16777215,.35),B]);let L=Ky(1500);N.add(L);let D=Hy(h);N.add(D);let F=b.controls();F.minDistance=60,F.maxDistance=1600,F.enableDamping=!s,F.dampingFactor=.08,F.autoRotateSpeed=.6,F.autoRotate=c.girando,a||(F.enableRotate=!1,F.enableZoom=!1,F.enablePan=!1,b.enablePointerInteraction(!1).onNodeClick(null).onNodeHover(null));let J=b.d3Force("charge");b.d3Force("center",null);{let U=c.estilo==="e"?ix:nx;b.cameraPosition(l?me(U):U,c.estilo==="e"?rx:{x:0,y:0,z:0})}function G(U){return c.foco!==null&&U!==c.foco}function le(U){if(U.tipo==="servidor")return Zy(h);if(U.tipo==="classe")return Yy(h,{cor:U.cor,esmaecido:G(U.slug)});if(U.tipo==="grupo"){let W=$y(h,{raio:wp(U.total),estado:U.estado,esmaecido:G(U.slug)});return fe(U,W),W}let Y=Xy(h,U.estado,{esmaecido:G(U.classe),resolucao:c.nivel==="completo"?16:8});return fe(U,Y),Y}function fe(U,Y){let W=Y.userData.aparencia;!s&&W&&(W.pulsa||W.treme)?x.add(U):x.delete(U)}function X(U){let Y=U.__threeObj;Y&&(U.tipo==="classe"?bp(Y,h,U.cor,G(U.slug)):U.tipo==="grupo"?(La(Y,h,U.estado,G(U.slug)),fe(U,Y)):U.tipo==="equip"&&(La(Y,h,U.estado,G(U.classe)),fe(U,Y)))}function re(U){if(U.tipo==="servidor")M.textContent="Sentinela";else if(U.tipo==="classe")M.textContent=ou(U.nome,U.total);else if(U.tipo==="grupo")M.textContent=`${ou(U.nome,U.total)} \xB7 pior: ${Pa(U.estado).rotulo}`;else{let Y=c.store?.itens.get(U.id);M.textContent=`${Y?.nome??U.id} \xB7 ${Pa(U.estado).rotulo}`}return M}function ye(U){let Y=U.slug;return G(Y)?fI(U.cor,su):U.cor}function Ue(){let U=oI[c.estilo],Y=o&&!s&&c.nivel==="completo";t.dataset.particulas=Y?"sim":"nao",b.linkColor(W=>ye(W)).linkOpacity(sI[c.estilo]).linkVisibility(W=>W.tronco||U).linkDirectionalParticles(W=>W.tronco&&Y?4:0)}function ke(U,Y,W,te,_e){let xe=`${U.id}>${Y.id}`,ve=p.get(xe);return(!ve||ve.cor!==W||ve.source!==U||ve.target!==Y)&&(ve={source:U,target:Y,cor:W,slug:te,tronco:_e,chave:xe},p.set(xe,ve)),ve}function $(){let U=[];for(let Y of c.store.itens.values())Y.classe!==Na&&U.push(Y);return U}function ee(U){let Y=new Set;for(let W of U){Y.add(W.slug);let te=ap(W),_e=_.get(W.slug);_e?(_e.nome!==W.nome||_e.cor!==te||_e.total!==W.total)&&(Object.assign(_e,{nome:W.nome,cor:te,total:W.total}),X(_e)):(_e={id:`h-${W.slug}`,tipo:"classe",slug:W.slug,ordem:W.ordem,nome:W.nome,cor:te,total:W.total},_.set(W.slug,_e))}for(let W of[..._.keys()])Y.has(W)||_.delete(W)}function be(U){let Y=Sp(c.store.itens),W=new Set;for(let te of U){let _e=Y.get(te.slug);if(!_e)continue;W.add(te.slug);let xe=ap(te),ve=g.get(te.slug);ve?ve.total!==_e.total?(g.set(te.slug,{...ve,__threeObj:void 0,nome:te.nome,cor:xe,total:_e.total,estado:_e.pior}),x.delete(ve)):(ve.estado!==_e.pior||ve.nome!==te.nome||ve.cor!==xe)&&(Object.assign(ve,{nome:te.nome,cor:xe,estado:_e.pior}),X(ve)):(ve={id:`g-${te.slug}`,tipo:"grupo",slug:te.slug,ordem:te.ordem,nome:te.nome,cor:xe,total:_e.total,estado:_e.pior},g.set(te.slug,ve))}for(let[te,_e]of[...g])W.has(te)||(g.delete(te),x.delete(_e))}function je(U){let Y=c.store.itens;for(let W of U.remover)x.delete(m.get(W)),m.delete(W);for(let W of U.adicionar){let te=Y.get(W);m.set(W,{id:W,tipo:"equip",classe:te.classe,estado:te.estado})}for(let W of U.mudouClasse){let te=m.get(W),_e=Y.get(W);te&&(te.classe=_e.classe,te.estado=_e.estado,te.semPosicao=!0,X(te))}for(let W of U.mudouEstado){let te=m.get(W);te&&(te.estado=Y.get(W).estado,X(te))}for(let W of U.adicionar)m.get(W).semPosicao=!0}function Le({todos:U=!1,animar:Y=!1}={}){let W=Ry(c.estilo,c.store.ordemClasses,$()),te=c.estilo!=="a",_e=W.get("srv");B.position.set(_e.x,_e.y,_e.z);let xe=new Map([[f,_e]]);for(let ve of _.values()){let $e=W.get(ve.id);$e&&xe.set(ve,$e)}for(let ve of g.values()){let $e=W.get(`h-${ve.slug}`);$e&&xe.set(ve,$e)}for(let ve of m.values()){let $e=W.get(ve.id);$e&&(te?xe.set(ve,$e):(U||ve.semPosicao)&&(delete ve.fx,delete ve.fy,delete ve.fz,Object.assign(ve,{x:$e.x,y:$e.y,z:$e.z,vx:0,vy:0,vz:0})),ve.semPosicao=!1)}if(Y&&!s){let ve=new Map;for(let[$e,Ft]of xe)ve.set($e,{x:$e.x??Ft.x,y:$e.y??Ft.y,z:$e.z??Ft.z});c.transicao={inicio:null,de:ve,para:xe}}else{c.transicao=null;for(let[ve,$e]of xe)Object.assign(ve,{fx:$e.x,fy:$e.y,fz:$e.z,x:$e.x,y:$e.y,z:$e.z})}}function rt(){let U=b.d3Force("link");c.estilo==="a"&&c.nivel!=="agrupado"?(b.d3Force("charge")||b.d3Force("charge",J),J.strength(-14),U.distance(Y=>Y.tronco?Ia:26).strength(Y=>Y.tronco?0:.9)):(b.d3Force("charge",null),U.strength(0))}function qt(){let U=[f],Y=[],W=new Set,te=xe=>{W.add(xe.chave),Y.push(xe)};if(c.nivel==="agrupado")for(let xe of g.values())U.push(xe),te(ke(f,xe,xe.cor,xe.slug,!0));else{for(let xe of _.values())U.push(xe),te(ke(f,xe,xe.cor,xe.slug,!0));for(let xe of m.values()){U.push(xe);let ve=_.get(xe.classe);te(ve?ke(ve,xe,ve.cor,ve.slug,!1):ke(f,xe,"#7A8194",xe.classe,!1))}}for(let xe of[...p.keys()])W.has(xe)||p.delete(xe);b.graphData({nodes:U,links:Y});let _e=0;for(let xe of U)xe.tipo==="equip"&&(_e+=1);t.dataset.nosGrafo=String(_e),v&&(v=m.get(v.id)||null),O()}function O(){let U=[f,...c.nivel==="agrupado"?g.values():_.values()],Y=new Set;for(let W of U){Y.add(W.id);let te=W===f?"SENTINELA":ou(W.nome,W.total),_e=w.get(W.id);if(!_e){let xe=document.createElement("div");xe.className="teia-rotulo";let ve=document.createElement("span");xe.appendChild(ve),xe.hidden=!0,E.appendChild(xe),_e={el:xe,span:ve,texto:null,ultimo:""},w.set(W.id,_e)}_e.no=W,_e.texto!==te&&(_e.span.textContent=te,_e.texto=te),_e.el.classList.toggle("servidor",W===f),_e.el.classList.toggle("abaixo",W!==f&&tx(W.ordem)),_e.el.classList.toggle("esmaecido",W!==f&&G(W.slug)),W.cor&&_e.el.style.setProperty("--cor-classe",W.cor)}for(let[W,te]of[...w])Y.has(W)||(te.el.remove(),w.delete(W))}function Et(){let U=b.camera(),Y=b.width(),W=b.height();for(let te of w.values()){let _e=vt(te.no);I.set(_e.x,_e.y,_e.z);let xe=I.distanceTo(U.position);I.project(U);let ve=Oy({ndc:I,distancia:xe,largura:Y,altura:W});if(!ve.visivel){te.el.hidden||(te.el.hidden=!0);continue}te.el.hidden&&(te.el.hidden=!1);let $e=`${ve.x},${ve.y},${ve.escala}`;$e!==te.ultimo&&(te.ultimo=$e,te.el.style.transform=`translate3d(${ve.x}px, ${ve.y}px, 0)`,te.el.style.setProperty("--escala",String(ve.escala)))}}function Ye(U){let Y=v;if(!Y||c.nivel==="agrupado"){D.visible=!1;return}let W=vt(Y);D.position.set(W.x,W.y,W.z);let te=Sn.haloEquipamento*(s?.95:.9+.12*Math.sin(U*4));D.scale.set(te,te,1),D.visible=!0}function Be(){t.dataset.nos=String(c.nivel==="agrupado"?0:m.size),t.dataset.equipamentos=String(c.total),t.dataset.nivel=c.nivel,t.dataset.movimento=s?"reduzido":"normal",t.dataset.girando=c.girando?"sim":"nao"}function Te(){let U=b.camera().position,Y=`${Math.round(U.x)},${Math.round(U.y)},${Math.round(U.z)}`;t.dataset.camera!==Y&&(t.dataset.camera=Y);let W=b.renderer().info.memory,te=String(W.geometries),_e=String(W.textures);t.dataset.geometrias!==te&&(t.dataset.geometrias=te),t.dataset.texturas!==_e&&(t.dataset.texturas=_e)}function Tt(U){let Y=c.nivel;if(c.nivel=U,U!=="completo"&&Ze(),U==="agrupado"){for(let W of m.values())x.delete(W);m.clear(),y=new Map}else{for(let W of g.values())x.delete(W);g.clear()}if(Y!==U&&U!=="agrupado"&&Y!=="agrupado"){for(let W of m.values())x.delete(W);b.nodeThreeObject(W=>le(W))}}function Ee(U){if(c.destruido)return;c.store=U,c.total=Mp(U.itens).size;let Y=lp({total:c.total,agrupadoPorFps:c.agrupadoPorFps,ultimaEntrada:c.ultimaEntradaFps});c.agrupadoPorFps=Y.agrupadoPorFps,Y.nivel!==c.nivel&&Tt(Y.nivel);let W=ex(U);if(ee(W),c.nivel==="agrupado")be(W),y=new Map;else{let te=Qy(y,U.itens);je(te),y=Mp(U.itens)}Le(),rt(),Ue(),qt(),Be()}function Ke(U){if(c.destruido||!c.store)return;let Y=c.store.itens.get(U);if(!Y)return;if(c.nivel==="agrupado"){let _e=g.get(Y.classe);if(!_e)return;let xe=Sp(c.store.itens).get(Y.classe);xe&&xe.pior!==_e.estado&&(_e.estado=xe.pior,X(_e));return}let W=m.get(U);if(!W||W.estado===Y.estado)return;W.estado=Y.estado;let te=y.get(U);te&&(te.estado=Y.estado),X(W)}function vt(U){return{x:U.fx??U.x??0,y:U.fy??U.y??0,z:U.fz??U.z??0}}function Pt(U,Y,W){let te=b.camera(),_e=Ly({alvo:U,de:Y,raio:W,fov:te.fov||50,largura:b.width(),altura:b.height(),margens:i()||{}});b.cameraPosition(_e.camera,_e.olhar,s?0:sx)}function P(U,Y){let W=[];for(let te of m.values())te.classe===U&&W.push(vt(te));return Dy(Y,W,Sn.haloEquipamento/2,40)}function S(U){c.girando=U&&!s,F.autoRotate=c.girando,t.dataset.girando=c.girando?"sim":"nao"}function H(U){if(U.tipo==="equip")n?n(U.id):he(U.id);else if(U.tipo==="classe"||U.tipo==="grupo")r(U.slug);else if(U.tipo==="servidor"&&c.store&&n){for(let Y of c.store.itens.values())if(Y.classe===Na){n(Y.id);break}}}function K(){for(let U of _.values())X(U);for(let U of g.values())X(U);for(let U of m.values())X(U);Ue(),O()}function ie(U){if(!c.destruido){if(c.foco=U??null,v&&v.classe!==c.foco&&(v=null),K(),c.foco===null){S(!0);return}S(!1),Z()}}function Z(){let U=c.nivel==="agrupado",Y=U?g.get(c.foco):_.get(c.foco);if(!Y)return;let W=vt(Y),te=U?wp(Y.total)*2+30:P(c.foco,W);Pt(W,vt(f),te)}function Re(){c.destruido||(v?he(v.id):c.foco&&Z())}function he(U){if(c.destruido||!c.store)return;let Y=c.store.itens.get(U);if(!Y)return;if(c.nivel==="agrupado"){g.has(Y.classe)&&ie(Y.classe);return}let W=m.get(U);if(!W)return;S(!1),v=W;let te=_.get(W.classe),_e=te?Math.max(36,.55*P(W.classe,vt(te))):36;Pt(vt(W),vt(te||f),_e)}function Pe(){v=null}function Ae(){ue(),c.agrupadoPorFps&&(c.agrupadoPorFps=Sy({agrupadoPorFps:!0}).agrupadoPorFps,c.store&&Ee(c.store))}function oe(){let U=c.estilo==="e",Y=U?ix:nx;b.cameraPosition(l?me(Y):Y,U?rx:{x:0,y:0,z:0},s?0:sx)}function me(U){let Y=b.width(),W=b.height();if(!(Y>0&&W>0))return U;let te=Math.tan((b.camera().fov||50)*Math.PI/360),_e=te*(Y/W),xe=Math.max(.5,1-2*ax.lado/Y),ve=Math.max(.5,1-2*ax.cima/W),$e=Math.max(ox/(_e*xe),ox/(te*ve)),Ft=Math.hypot(U.x,U.y,U.z),ui=Math.min(lI,Math.max(Ft,$e))/Ft;return{x:U.x*ui,y:U.y*ui,z:U.z*ui}}function Ve(){c.destruido||(Ae(),v=null,c.foco!==null&&(c.foco=null,K()),S(!0),oe())}function Ie(U){if(c.destruido)return;let Y=cx(U);Y!==c.estilo&&(c.estilo=Y,Ae(),c.store&&(Le({todos:!0,animar:Y!=="a"}),rt(),Ue(),b.d3ReheatSimulation()),!c.foco&&!v?oe():c.transicao||Re())}function de(){let U=u.media();if(c.nivel!=="completo"||!by(U,s)){c.bloom=!1;return}let Y=b.postProcessingComposer(),W=new ro(new ne(b.width(),b.height()),1,.5,.55),te=new tu;Y.addPass(W),Y.addPass(te),yp(h,!0),c.bloom={passe:W,saida:te}}function Ze(){if(c.bloom){let U=b.postProcessingComposer();U.removePass(c.bloom.passe),U.removePass(c.bloom.saida),c.bloom.passe.dispose(),c.bloom.saida.dispose(),yp(h,!1)}c.bloom!==null&&(c.bloom=!1)}function z(U){if(d=requestAnimationFrame(z),u.quadro(),c.inicioRender===null&&(c.inicioRender=U),c.bloom===null&&U-c.inicioRender>=cI&&de(),U-c.ultimoCheque>=1e3&&(c.ultimoCheque=U,c.store&&!c.agrupadoPorFps)){let xe=lp({total:c.total,agrupadoPorFps:!1,queda:My(u),agora:U,ultimaEntrada:c.ultimaEntradaFps});xe.agrupadoPorFps&&(c.agrupadoPorFps=!0,c.ultimaEntradaFps=xe.ultimaEntrada,Ee(c.store))}let Y=c.transicao;if(Y){Y.inicio===null&&(Y.inicio=U);let xe=uI(Math.min(1,(U-Y.inicio)/aI));for(let[ve,$e]of Y.para){let Ft=Y.de.get(ve);ve.fx=Ft.x+($e.x-Ft.x)*xe,ve.fy=Ft.y+($e.y-Ft.y)*xe,ve.fz=Ft.z+($e.z-Ft.z)*xe}xe>=1&&(c.transicao=null,Re())}U-c.ultimaLeitura>=hI&&(c.ultimaLeitura=U,Te());let W=U/1e3;if(Ye(W),Et(),s)return;let te=f.__threeObj?.userData.aneis;te&&(te[0].rotation.x=W*.5,te[0].rotation.y=W*.3,te[1].rotation.y=-W*.25,te[1].rotation.z=W*.2),L.rotation.y=W*.004,L.rotation.x=Math.sin(W*.05)*.02;let _e=Math.abs(Math.sin(W*3.2));for(let xe of x){let ve=xe.__threeObj;if(!ve)continue;let $e=ve.userData,Ft=$e.escala||1;if($e.aparencia.pulsa){let ui=Ft>1?.25:.55,Fa=Ft>1?1:1.4,co=Sn.haloEquipamento*Ft*(1+ui*_e)*Fa;$e.halo.scale.set(co,co,1),$e.esfera.scale.setScalar(Ft*(Ft>1?.95+.1*_e:.85+.3*_e))}else $e.aparencia.treme&&$e.esfera.position.set(Math.sin(W*37+$e.semente)*.35,Math.cos(W*41+$e.semente)*.35,0)}}function ae(){d===null&&(d=requestAnimationFrame(z))}function ue(){u=cp(),c.inicioRender=null,c.ultimoCheque=0}function Me(){c.destruido||c.pausado||(c.pausado=!0,d!==null&&cancelAnimationFrame(d),d=null,b.pauseAnimation())}function se(){c.destruido||!c.pausado||(c.pausado=!1,b.resumeAnimation(),Ae(),ae())}function Q(){document.visibilityState==="visible"&&!c.pausado&&ue()}document.addEventListener("visibilitychange",Q);function we(){let U=t.clientWidth,Y=t.clientHeight;U>0&&Y>0&&(U!==b.width()||Y!==b.height())&&(b.width(U).height(Y),l&&!v&&c.foco===null&&oe())}let We=null;typeof ResizeObserver=="function"?(We=new ResizeObserver(we),We.observe(t)):window.addEventListener("resize",we);function yt(U){U.traverse(Y=>{Y.geometry?.dispose();let W=Array.isArray(Y.material)?Y.material:Y.material?[Y.material]:[];for(let te of W)te.map?.dispose(),te.dispose()})}function ct(){if(c.destruido)return;c.destruido=!0,d!==null&&cancelAnimationFrame(d),d=null,document.removeEventListener("visibilitychange",Q),We?We.disconnect():window.removeEventListener("resize",we);let U=b.renderer(),Y=b.postProcessingComposer();b.pauseAnimation(),b.onNodeClick(null).onNodeHover(null),yt(N),h.liberar(),b._destructor();for(let W of Y.passes)W.dispose?.();Y.dispose(),F.dispose(),N.clear(),N.fog=null,U.dispose(),U.forceContextLoss(),x.clear(),w.clear(),v=null,m.clear(),_.clear(),g.clear(),p.clear(),t.replaceChildren(),t.style.cursor="",t.classList.remove("teia-cena"),delete t.dataset.nos,delete t.dataset.equipamentos,delete t.dataset.nivel,delete t.dataset.movimento;for(let W of["nosGrafo","girando","particulas","camera","geometrias","texturas"])delete t.dataset[W]}return Be(),ae(),{sincronizar:Ee,atualizarEstado:Ke,definirEstilo:Ie,focarClasse:ie,focarEquipamento:he,limparSelecao:Pe,reenquadrar:Re,verTudo:Ve,pausar:Me,retomar:se,destruir:ct,nivel:()=>c.nivel}}export{dp as ESTILOS,O3 as NOMES_ESTILO,dI as montarTeia};
