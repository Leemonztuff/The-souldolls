/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';

export interface BillboardMaterialParameters extends THREE.MeshStandardMaterialParameters {
  isBillboard?: boolean;
}

export class BillboardMaterial extends THREE.MeshStandardMaterial {
  constructor(parameters?: BillboardMaterialParameters) {
    super(parameters);
    
    this.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader.replace(
        '#include <worldpos_vertex>',
        `
        #include <worldpos_vertex>
        
        // Billboarding logic
        vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        
        // Get the scale from the instance matrix
        float scaleX = length(vec3(instanceMatrix[0][0], instanceMatrix[0][1], instanceMatrix[0][2]));
        float scaleY = length(vec3(instanceMatrix[1][0], instanceMatrix[1][1], instanceMatrix[1][2]));
        
        mvPosition.xy += position.xy * vec2(scaleX, scaleY);
        gl_Position = projectionMatrix * mvPosition;
        `
      );
      // We need to skip the rest of the vertex shader's standard position calculation
      // but keep the varying definitions for fragment shader.
      // This is a bit hacky with MeshStandardMaterial, but let's try.
      // Actually, it might be better to just use a custom ShaderMaterial if we want full control.
    };
  }
}

/**
 * A simpler billboarding approach: 
 * We use a custom shader that mimics MeshStandardMaterial but with billboarding.
 */
export function createBillboardMaterial(texture: THREE.Texture): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.common,
      THREE.UniformsLib.lights,
      THREE.UniformsLib.fog,
      {
        map: { value: texture },
        diffuse: { value: new THREE.Color(0xffffff) },
        opacity: { value: 1.0 },
        time: { value: 0.0 },
        swayAmount: { value: 0.0 }
      }
    ]),
    vertexShader: `
      #include <common>
      #include <lights_pars_begin>
      #include <fog_pars_vertex>
      
      varying vec2 vUv;
      varying vec3 vViewPosition;
      varying vec3 vNormal;
      
      uniform float time;
      uniform float swayAmount;
      
      void main() {
        vUv = uv;
        
        // Extract scale from instanceMatrix
        vec3 scale;
        scale.x = length(vec3(instanceMatrix[0][0], instanceMatrix[0][1], instanceMatrix[0][2]));
        scale.y = length(vec3(instanceMatrix[1][0], instanceMatrix[1][1], instanceMatrix[1][2]));
        scale.z = length(vec3(instanceMatrix[2][0], instanceMatrix[2][1], instanceMatrix[2][2]));

        // Base position in view space
        vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        
        // Grass sway
        float phase = instanceMatrix[3][0] + instanceMatrix[3][2]; // use world pos as phase
        float sway = sin(time * 4.0 + phase) * swayAmount * (uv.y);
        
        vec2 billboardPos = position.xy;
        billboardPos.x += sway;
        
        mvPosition.xy += billboardPos * scale.xy;
        
        vViewPosition = -mvPosition.xyz;
        vNormal = normalMatrix * vec3(0, 0, 1); // Fixed normal for billboard
        
        gl_Position = projectionMatrix * mvPosition;
        
        #include <fog_vertex>
      }
    `,
    fragmentShader: `
      uniform vec3 diffuse;
      uniform float opacity;
      uniform sampler2D map;
      
      varying vec2 vUv;
      
      #include <common>
      #include <lights_pars_begin>
      #include <fog_pars_fragment>
      
      void main() {
        vec4 texelColor = texture2D(map, vUv);
        if (texelColor.a < 0.5) discard;
        
        vec3 outgoingLight = texelColor.rgb * diffuse;
        
        gl_FragColor = vec4(outgoingLight, texelColor.a * opacity);
        
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }
    `,
    lights: true,
    fog: true,
    transparent: true
  });
}
