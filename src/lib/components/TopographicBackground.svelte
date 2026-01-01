<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	let { visible = true }: { visible?: boolean } = $props();

	let canvas: HTMLCanvasElement;
	let animationFrameId: number;
	let gl: WebGLRenderingContext | null = null;

	onMount(() => {
		if (!canvas) return;

		gl = canvas.getContext('webgl');
		if (!gl) {
			console.error('WebGL not supported');
			return;
		}

		let startTime = Date.now();

		// Vertex shader for rendering full-screen quad
		const vertexShaderSource = `
			attribute vec3 aVertexPosition;
			uniform mat4 uMVMatrix;
			uniform mat4 uPMatrix;

			void main(void) {
				gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
			}
		`;

		// Noise generation fragment shader
		const noiseShaderSource = `
			precision mediump float;

			uniform vec3 iResolution;
			uniform float iGlobalTime;
			uniform float fScale;
			uniform float fSpeed;
			uniform vec2 fOffset;

			// Simplex noise implementation
			vec3 mod289(vec3 x) {
				return x - floor(x * (1.0 / 289.0)) * 289.0;
			}

			vec4 mod289(vec4 x) {
				return x - floor(x * (1.0 / 289.0)) * 289.0;
			}

			vec4 permute(vec4 x) {
				return mod289(((x*34.0)+1.0)*x);
			}

			vec4 taylorInvSqrt(vec4 r) {
				return 1.79284291400159 - 0.85373472095314 * r;
			}

			float snoise(vec3 v) {
				const vec2 C = vec2(1.0/6.0, 1.0/3.0);
				const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

				vec3 i = floor(v + dot(v, C.yyy));
				vec3 x0 = v - i + dot(i, C.xxx);

				vec3 g = step(x0.yzx, x0.xyz);
				vec3 l = 1.0 - g;
				vec3 i1 = min(g.xyz, l.zxy);
				vec3 i2 = max(g.xyz, l.zxy);

				vec3 x1 = x0 - i1 + C.xxx;
				vec3 x2 = x0 - i2 + C.yyy;
				vec3 x3 = x0 - D.yyy;

				i = mod289(i);
				vec4 p = permute(permute(permute(
								 i.z + vec4(0.0, i1.z, i2.z, 1.0))
							 + i.y + vec4(0.0, i1.y, i2.y, 1.0))
							 + i.x + vec4(0.0, i1.x, i2.x, 1.0));

				float n_ = 0.142857142857;
				vec3 ns = n_ * D.wyz - D.xzx;

				vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

				vec4 x_ = floor(j * ns.z);
				vec4 y_ = floor(j - 7.0 * x_);

				vec4 x = x_ * ns.x + ns.yyyy;
				vec4 y = y_ * ns.x + ns.yyyy;
				vec4 h = 1.0 - abs(x) - abs(y);

				vec4 b0 = vec4(x.xy, y.xy);
				vec4 b1 = vec4(x.zw, y.zw);

				vec4 s0 = floor(b0) * 2.0 + 1.0;
				vec4 s1 = floor(b1) * 2.0 + 1.0;
				vec4 sh = -step(h, vec4(0.0));

				vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
				vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

				vec3 p0 = vec3(a0.xy, h.x);
				vec3 p1 = vec3(a0.zw, h.y);
				vec3 p2 = vec3(a1.xy, h.z);
				vec3 p3 = vec3(a1.zw, h.w);

				vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
				p0 *= norm.x;
				p1 *= norm.y;
				p2 *= norm.z;
				p3 *= norm.w;

				vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
				m = m * m;
				return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
			}

			// Fractal noise with multiple octaves
			float fbm(vec3 st) {
				float value = 0.0;
				float amplitude = 0.75;

				for (int i = 0; i < 4; i++) {
					value += amplitude * snoise(st);
					st *= 2.0;
					amplitude *= 0.5;
				}
				return value;
			}

			void main() {
				vec2 uv = gl_FragCoord.xy;
				float n = fbm(vec3(fScale * uv + fOffset, iGlobalTime * fSpeed));
				n = (0.5 + 0.5 * n);
				gl_FragColor = vec4(vec3(n), 1.0);
			}
		`;

		// Edge detection and topographic rendering shader
		const topoShaderSource = `
			precision mediump float;

			uniform float iGlobalTime;
			uniform vec3 iResolution;
			uniform sampler2D iChannel0;
			uniform float fCoarseness;

			// AeroCell brand colors
			vec3 AERO_NAVY = vec3(0.114, 0.173, 0.263);  // #1D2C43
			vec3 AERO_TEAL = vec3(0.369, 0.694, 0.969);  // #5EB1F7

			float quantize(in float fQuantize, in float x) {
				return floor(fQuantize * x) / fQuantize;
			}

			float intensity(in float fQuantize, in vec4 color){
				float x = quantize(fQuantize, color.x);
				return sqrt(3.0*(x*x));
			}

			// Sobel edge detection for clean contour lines
			vec3 sobel(float fQuantize, float stepx, float stepy, vec2 center){
				float tleft = intensity(fQuantize, texture2D(iChannel0,center + vec2(-stepx,stepy)));
				float left = intensity(fQuantize, texture2D(iChannel0,center + vec2(-stepx,0.0)));
				float bleft = intensity(fQuantize, texture2D(iChannel0,center + vec2(-stepx,-stepy)));
				float top = intensity(fQuantize, texture2D(iChannel0,center + vec2(0.0,stepy)));
				float bottom = intensity(fQuantize, texture2D(iChannel0,center + vec2(0.0,-stepy)));
				float tright = intensity(fQuantize, texture2D(iChannel0,center + vec2(stepx,stepy)));
				float right = intensity(fQuantize, texture2D(iChannel0,center + vec2(stepx,0.0)));
				float bright = intensity(fQuantize, texture2D(iChannel0,center + vec2(stepx,-stepy)));

				float x = tleft + 2.0*left + bleft - tright - 2.0*right - bright;
				float y = -tleft - 2.0*top - tright + bleft + 2.0 * bottom + bright;
				float color = sqrt((x*x) + (y*y));
				return vec3(color,color,color);
			}

			void main(){
				vec2 uv = gl_FragCoord.xy / iResolution.xy;

				// Take a low-contrast sample of the original noise texture
				vec3 tex = vec3(0.25 * texture2D(iChannel0, uv));

				// Generate crisp topographic contour lines
				vec3 firstPass = clamp((2.0 * sobel(2.0, 1.0/iResolution[0], 1.0/iResolution[1], uv)), 0.0, 1.0);
				vec3 secondPass = clamp((1.0 * sobel(16.0, 1.5/iResolution[0], 1.5/iResolution[1], uv)), 0.0, 1.0);
				vec3 contourLines = firstPass + secondPass;

				// Apply teal coloring to contour lines
				vec3 coloredLines = 0.75 * contourLines * (AERO_TEAL * 0.6) + 0.25 * contourLines * AERO_TEAL;

				// Blend with navy background using screen blend mode
				vec3 finalColor = AERO_NAVY + tex * AERO_NAVY;
				finalColor = 1.0 - (1.0 - finalColor) * (1.0 - coloredLines);

				gl_FragColor = vec4(finalColor, 1.0);
			}
		`;

		function createShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
			const shader = gl.createShader(type);
			if (!shader) return null;

			gl.shaderSource(shader, source);
			gl.compileShader(shader);

			if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
				console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
				gl.deleteShader(shader);
				return null;
			}
			return shader;
		}

		function createProgram(gl: WebGLRenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram | null {
			const program = gl.createProgram();
			if (!program) return null;

			gl.attachShader(program, vertexShader);
			gl.attachShader(program, fragmentShader);
			gl.linkProgram(program);

			if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
				console.error('Program linking error:', gl.getProgramInfoLog(program));
				gl.deleteProgram(program);
				return null;
			}
			return program;
		}

		const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

		function setupCanvas() {
			if (!canvas || !gl) return;

			let viewportWidth: number, viewportHeight: number;

			if (isMobile) {
				viewportWidth = Math.max(window.innerWidth, window.screen.width);
				viewportHeight = Math.max(window.innerHeight, window.screen.height);
			} else {
				viewportWidth = window.innerWidth;
				viewportHeight = window.innerHeight;
			}

			canvas.width = viewportWidth * window.devicePixelRatio;
			canvas.height = viewportHeight * window.devicePixelRatio;
			canvas.style.width = viewportWidth + 'px';
			canvas.style.height = viewportHeight + 'px';

			gl.viewport(0, 0, canvas.width, canvas.height);
		}

		setupCanvas();

		const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
		const noiseFragmentShader = createShader(gl, gl.FRAGMENT_SHADER, noiseShaderSource);
		const topoFragmentShader = createShader(gl, gl.FRAGMENT_SHADER, topoShaderSource);

		if (!vertexShader || !noiseFragmentShader || !topoFragmentShader) {
			console.error('Failed to create shaders');
			return;
		}

		const noiseProgram = createProgram(gl, vertexShader, noiseFragmentShader);
		const topoProgram = createProgram(gl, vertexShader, topoFragmentShader);

		if (!noiseProgram || !topoProgram) {
			console.error('Failed to create programs');
			return;
		}

		const buffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

		const vertices = new Float32Array([
			1.0,  1.0,  0.0,
		 -1.0,  1.0,  0.0,
			1.0, -1.0,  0.0,
		 -1.0, -1.0,  0.0,
		]);
		gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

		const framebuffer = gl.createFramebuffer();
		const noiseTexture = gl.createTexture();

		gl.bindTexture(gl.TEXTURE_2D, noiseTexture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

		gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, noiseTexture, 0);

		const noiseUniforms = {
			resolution: gl.getUniformLocation(noiseProgram, 'iResolution'),
			time: gl.getUniformLocation(noiseProgram, 'iGlobalTime'),
			scale: gl.getUniformLocation(noiseProgram, 'fScale'),
			speed: gl.getUniformLocation(noiseProgram, 'fSpeed'),
			offset: gl.getUniformLocation(noiseProgram, 'fOffset'),
			perspective: gl.getUniformLocation(noiseProgram, 'uPMatrix'),
			modelview: gl.getUniformLocation(noiseProgram, 'uMVMatrix')
		};

		const topoUniforms = {
			resolution: gl.getUniformLocation(topoProgram, 'iResolution'),
			time: gl.getUniformLocation(topoProgram, 'iGlobalTime'),
			texture: gl.getUniformLocation(topoProgram, 'iChannel0'),
			coarseness: gl.getUniformLocation(topoProgram, 'fCoarseness'),
			perspective: gl.getUniformLocation(topoProgram, 'uPMatrix'),
			modelview: gl.getUniformLocation(topoProgram, 'uMVMatrix')
		};

		const noiseVertexPos = gl.getAttribLocation(noiseProgram, 'aVertexPosition');
		const topoVertexPos = gl.getAttribLocation(topoProgram, 'aVertexPosition');

		function createOrthoMatrix(): Float32Array {
			return new Float32Array([
				1, 0, 0, 0,
				0, 1, 0, 0,
				0, 0, -1, 0,
				0, 0, 0, 1
			]);
		}

		function createMVMatrix(): Float32Array {
			return new Float32Array([
				1, 0, 0, 0,
				0, 1, 0, 0,
				0, 0, 1, 0,
				0, 0, -1, 1
			]);
		}

		const orthoMatrix = createOrthoMatrix();
		const mvMatrix = createMVMatrix();

		function animate() {
			if (!gl || !canvas) return;

			const baseTime = (Date.now() - startTime) / 1000.0;
			const currentTime = baseTime * 0.008;

			gl.clear(gl.COLOR_BUFFER_BIT);

			// First pass: Generate noise texture
			gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
			gl.viewport(0, 0, canvas.width, canvas.height);

			gl.useProgram(noiseProgram);
			gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
			gl.enableVertexAttribArray(noiseVertexPos);
			gl.vertexAttribPointer(noiseVertexPos, 3, gl.FLOAT, false, 0, 0);

			gl.uniform3fv(noiseUniforms.resolution, [canvas.width, canvas.height, 1]);
			gl.uniform1f(noiseUniforms.time, currentTime);
			gl.uniform1f(noiseUniforms.scale, 0.002);
			gl.uniform1f(noiseUniforms.speed, 1.0);
			gl.uniform2fv(noiseUniforms.offset, [0, 0]);
			gl.uniformMatrix4fv(noiseUniforms.perspective, false, orthoMatrix);
			gl.uniformMatrix4fv(noiseUniforms.modelview, false, mvMatrix);

			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

			// Second pass: Render topographic visualization
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			gl.viewport(0, 0, canvas.width, canvas.height);

			gl.useProgram(topoProgram);
			gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
			gl.enableVertexAttribArray(topoVertexPos);
			gl.vertexAttribPointer(topoVertexPos, 3, gl.FLOAT, false, 0, 0);

			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, noiseTexture);
			gl.uniform1i(topoUniforms.texture, 0);

			gl.uniform3fv(topoUniforms.resolution, [canvas.width, canvas.height, 1]);
			gl.uniform1f(topoUniforms.time, currentTime);
			gl.uniform1f(topoUniforms.coarseness, 2.0);
			gl.uniformMatrix4fv(topoUniforms.perspective, false, orthoMatrix);
			gl.uniformMatrix4fv(topoUniforms.modelview, false, mvMatrix);

			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

			animationFrameId = requestAnimationFrame(animate);
		}

		animate();

		let resizeTimeout: ReturnType<typeof setTimeout>;
		const handleResize = () => {
			if (isMobile) return;

			if (resizeTimeout) {
				clearTimeout(resizeTimeout);
			}

			resizeTimeout = setTimeout(() => {
				setupCanvas();
				if (gl && noiseTexture) {
					gl.bindTexture(gl.TEXTURE_2D, noiseTexture);
					gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
				}
			}, 250);
		};

		if (!isMobile) {
			window.addEventListener('resize', handleResize);
		}

		return () => {
			if (animationFrameId) {
				cancelAnimationFrame(animationFrameId);
			}
			if (resizeTimeout) {
				clearTimeout(resizeTimeout);
			}
			if (!isMobile) {
				window.removeEventListener('resize', handleResize);
			}

			if (gl) {
				gl.deleteProgram(noiseProgram);
				gl.deleteProgram(topoProgram);
				gl.deleteShader(vertexShader);
				gl.deleteShader(noiseFragmentShader);
				gl.deleteShader(topoFragmentShader);
				gl.deleteBuffer(buffer);
				gl.deleteTexture(noiseTexture);
				gl.deleteFramebuffer(framebuffer);
			}
		};
	});

	onDestroy(() => {
		if (animationFrameId) {
			cancelAnimationFrame(animationFrameId);
		}
	});
</script>

<canvas
	bind:this={canvas}
	class="topo-canvas"
	class:hidden={!visible}
></canvas>

<style>
	.topo-canvas {
		background-color: #1D2C43;
		display: block;
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		z-index: -1;
		pointer-events: none;
		opacity: 0.4;
		transition: opacity 0.3s ease;
	}

	.topo-canvas.hidden {
		opacity: 0;
	}
</style>
