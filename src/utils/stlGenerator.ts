// This implementation generates lithophane SCAD and STL files from image data
const generateSCAD = (
  heightMap: number[][],
  parameters: {
    maxHeight: number;
    minHeight: number;
    outerDiameter: number;
    innerDiameter: number;
    wallHeight: number;
    wallDistance: number;
    wallThickness: number;
  }
): string => {
  const resolution = heightMap.length;
  let scadContent = '';

  // Add module definition
  scadContent += '// Lithophane generated from image\n';
  scadContent += '$fn = 100; // Set smooth circles\n\n';
  scadContent += 'module lithophane() {\n';
  scadContent += '  difference() {\n';
  scadContent += '    union() {\n';

  // Generate main lithophane surface using polar coordinates
  for (let i = 0; i < resolution; i++) {
    for (let j = 0; j < resolution; j++) {
      const r1 = parameters.innerDiameter / 2 + (i / resolution) * 
                 ((parameters.outerDiameter - parameters.innerDiameter) / 2);
      const theta1 = (j / resolution) * 360;
      
      const h = mapHeightFromGrayscale(heightMap[i][j], parameters.minHeight, parameters.maxHeight);
      
      // Use rotate and translate for proper positioning
      scadContent += `    rotate([0, 0, ${theta1}])\n`;
      scadContent += `      translate([${r1}, 0, 0])\n`;
      scadContent += `        cylinder(h=${h}, r1=${2 * Math.PI * r1 / resolution / 2}, r2=${2 * Math.PI * r1 / resolution / 2});\n`;
    }
  }

  // Add base structure with outer wall
  scadContent += '\n    // Base structure with outer wall\n';
  
  // Base plate
  scadContent += `    translate([0, 0, ${-parameters.wallHeight}])\n`;
  scadContent += `      cylinder(h=${parameters.wallHeight}, r=${parameters.outerDiameter/2});\n`;
  
  // Outer wall
  scadContent += '    difference() {\n';
  scadContent += `      cylinder(h=${parameters.maxHeight}, r=${parameters.outerDiameter/2});\n`;
  scadContent += `      translate([0, 0, -0.1])\n`;
  scadContent += `        cylinder(h=${parameters.maxHeight + 0.2}, r=${parameters.outerDiameter/2 - parameters.wallThickness});\n`;
  scadContent += '    }\n';

  // Close union
  scadContent += '    }\n';
  
  // Create center hole
  scadContent += `    translate([0, 0, -${parameters.wallHeight} - 0.1])\n`;
  scadContent += `      cylinder(h=${parameters.wallHeight + parameters.maxHeight + 0.2}, r=${parameters.innerDiameter/2});\n`;
  
  // Close difference
  scadContent += '  }\n';
  scadContent += '}\n\n';
  
  // Call the module
  scadContent += 'lithophane();';

  return scadContent;
};

export const generateSTL = async (
  imageData: ImageData,
  parameters: {
    maxHeight: number;
    minHeight: number;
    outerDiameter: number;
    innerDiameter: number;
    wallHeight: number;
    wallDistance: number;
    wallThickness: number;
  }
) => {
  // Convert image to grayscale values and resize
  const heightMap = processImageToHeightMap(imageData, Math.min(imageData.width, imageData.height));
  
  // Generate SCAD content
  const scadContent = generateSCAD(heightMap, parameters);
  
  // Create and download SCAD file
  const scadBlob = new Blob([scadContent], { type: 'text/plain' });
  const scadUrl = URL.createObjectURL(scadBlob);
  const scadLink = document.createElement('a');
  scadLink.href = scadUrl;
  scadLink.download = 'lithophane.scad';
  document.body.appendChild(scadLink);
  scadLink.click();
  document.body.removeChild(scadLink);
  URL.revokeObjectURL(scadUrl);

  // Constants
  const RESOLUTION = Math.min(imageData.width, imageData.height); // Number of segments
  const BYTES_PER_TRIANGLE = 50; // 12 floats (3 vertices × 4 coordinates) + 2 bytes
  
  // Calculate number of triangles needed
  const numRadialSegments = RESOLUTION;
  const numCircularSegments = RESOLUTION;
  
  // Calculate total number of triangles
  const numTriangles = 
    // Main surface triangles (2 per quad)
    2 * numRadialSegments * numCircularSegments +
    // Bottom surface triangles (2 per quad)
    2 * numRadialSegments * numCircularSegments +
    // Inner wall triangles (2 per segment)
    2 * numCircularSegments +
    // Outer wall triangles (2 per segment)
    2 * numCircularSegments +
    // Connecting walls and bottom (8 triangles per segment)
    8 * numCircularSegments;

  // Create STL header and triangle count
  const header = new Uint8Array(80); // Empty header
  const buffer = new ArrayBuffer(84 + (numTriangles * BYTES_PER_TRIANGLE));
  const view = new DataView(buffer);
  
  // Write header
  header.forEach((byte, i) => view.setUint8(i, byte));
  
  // Write number of triangles
  view.setUint32(80, numTriangles, true);
  
  let offset = 84; // Start after header and triangle count

  // Generate main surface triangles
  for (let i = 0; i < numRadialSegments; i++) {
    const r1 = parameters.innerDiameter / 2 + (i / numRadialSegments) * 
               ((parameters.outerDiameter - parameters.innerDiameter) / 2);
    const r2 = parameters.innerDiameter / 2 + ((i + 1) / numRadialSegments) * 
               ((parameters.outerDiameter - parameters.innerDiameter) / 2);
    
    for (let j = 0; j < numCircularSegments; j++) {
      const theta1 = (j / numCircularSegments) * Math.PI * 2;
      const theta2 = ((j + 1) / numCircularSegments) * Math.PI * 2;
      
      const h1 = mapHeightFromGrayscale(heightMap[i][j], parameters.minHeight, parameters.maxHeight);
      const h2 = mapHeightFromGrayscale(heightMap[i][(j + 1) % numCircularSegments], 
                               parameters.minHeight, parameters.maxHeight);
      const h3 = mapHeightFromGrayscale(heightMap[(i + 1) % numRadialSegments][j], 
                               parameters.minHeight, parameters.maxHeight);
      const h4 = mapHeightFromGrayscale(heightMap[(i + 1) % numRadialSegments][(j + 1) % numCircularSegments], 
                               parameters.minHeight, parameters.maxHeight);
      
      // Top surface triangles
      offset = writeTriangle(view, offset, [
        [r1 * Math.cos(theta1), r1 * Math.sin(theta1), h1],
        [r2 * Math.cos(theta1), r2 * Math.sin(theta1), h3],
        [r1 * Math.cos(theta2), r1 * Math.sin(theta2), h2]
      ]);
      
      offset = writeTriangle(view, offset, [
        [r1 * Math.cos(theta2), r1 * Math.sin(theta2), h2],
        [r2 * Math.cos(theta1), r2 * Math.sin(theta1), h3],
        [r2 * Math.cos(theta2), r2 * Math.sin(theta2), h4]
      ]);

      // Bottom surface triangles
      offset = writeTriangle(view, offset, [
        [r1 * Math.cos(theta1), r1 * Math.sin(theta1), parameters.minHeight],
        [r1 * Math.cos(theta2), r1 * Math.sin(theta2), parameters.minHeight],
        [r2 * Math.cos(theta1), r2 * Math.sin(theta1), parameters.minHeight]
      ]);
      
      offset = writeTriangle(view, offset, [
        [r1 * Math.cos(theta2), r1 * Math.sin(theta2), parameters.minHeight],
        [r2 * Math.cos(theta2), r2 * Math.sin(theta2), parameters.minHeight],
        [r2 * Math.cos(theta1), r2 * Math.sin(theta1), parameters.minHeight]
      ]);

      // Inner wall triangles
      if (i === 0) {
        offset = writeTriangle(view, offset, [
          [r1 * Math.cos(theta1), r1 * Math.sin(theta1), parameters.minHeight],
          [r1 * Math.cos(theta1), r1 * Math.sin(theta1), h1],
          [r1 * Math.cos(theta2), r1 * Math.sin(theta2), h2]
        ]);
        
        offset = writeTriangle(view, offset, [
          [r1 * Math.cos(theta1), r1 * Math.sin(theta1), parameters.minHeight],
          [r1 * Math.cos(theta2), r1 * Math.sin(theta2), h2],
          [r1 * Math.cos(theta2), r1 * Math.sin(theta2), parameters.minHeight]
        ]);
      }

      // Outer wall triangles
      if (i === numRadialSegments - 1) {
        offset = writeTriangle(view, offset, [
          [r2 * Math.cos(theta1), r2 * Math.sin(theta1), parameters.minHeight],
          [r2 * Math.cos(theta2), r2 * Math.sin(theta2), h4],
          [r2 * Math.cos(theta1), r2 * Math.sin(theta1), h3]
        ]);
        
        offset = writeTriangle(view, offset, [
          [r2 * Math.cos(theta1), r2 * Math.sin(theta1), parameters.minHeight],
          [r2 * Math.cos(theta2), r2 * Math.sin(theta2), parameters.minHeight],
          [r2 * Math.cos(theta2), r2 * Math.sin(theta2), h4]
        ]);
      }
    }
  }
  
  // Generate connecting wall and support wall
  const wallRadius = parameters.wallDistance;
  const outerRadius = parameters.outerDiameter / 2;
  
  for (let j = 0; j < numCircularSegments; j++) {
    const theta1 = (j / numCircularSegments) * Math.PI * 2;
    const theta2 = ((j + 1) / numCircularSegments) * Math.PI * 2;
    
    // Connecting wall top face
    offset = writeTriangle(view, offset, [
      [outerRadius * Math.cos(theta1), outerRadius * Math.sin(theta1), parameters.minHeight],
      [outerRadius * Math.cos(theta2), outerRadius * Math.sin(theta2), parameters.minHeight],
      [wallRadius * Math.cos(theta1), wallRadius * Math.sin(theta1), parameters.minHeight]
    ]);
    
    offset = writeTriangle(view, offset, [
      [wallRadius * Math.cos(theta1), wallRadius * Math.sin(theta1), parameters.minHeight],
      [outerRadius * Math.cos(theta2), outerRadius * Math.sin(theta2), parameters.minHeight],
      [wallRadius * Math.cos(theta2), wallRadius * Math.sin(theta2), parameters.minHeight]
    ]);

    // Outer vertical wall
    offset = writeTriangle(view, offset, [
      [outerRadius * Math.cos(theta1), outerRadius * Math.sin(theta1), parameters.minHeight],
      [outerRadius * Math.cos(theta1), outerRadius * Math.sin(theta1), -parameters.wallHeight],
      [outerRadius * Math.cos(theta2), outerRadius * Math.sin(theta2), parameters.minHeight]
    ]);
    
    offset = writeTriangle(view, offset, [
      [outerRadius * Math.cos(theta2), outerRadius * Math.sin(theta2), parameters.minHeight],
      [outerRadius * Math.cos(theta1), outerRadius * Math.sin(theta1), -parameters.wallHeight],
      [outerRadius * Math.cos(theta2), outerRadius * Math.sin(theta2), -parameters.wallHeight]
    ]);

    // Support wall vertical face
    offset = writeTriangle(view, offset, [
      [wallRadius * Math.cos(theta1), wallRadius * Math.sin(theta1), parameters.minHeight],
      [wallRadius * Math.cos(theta2), wallRadius * Math.sin(theta2), parameters.minHeight],
      [wallRadius * Math.cos(theta1), wallRadius * Math.sin(theta1), -parameters.wallHeight]
    ]);
    
    offset = writeTriangle(view, offset, [
      [wallRadius * Math.cos(theta2), wallRadius * Math.sin(theta2), parameters.minHeight],
      [wallRadius * Math.cos(theta2), wallRadius * Math.sin(theta2), -parameters.wallHeight],
      [wallRadius * Math.cos(theta1), wallRadius * Math.sin(theta1), -parameters.wallHeight]
    ]);

    // Bottom face
    offset = writeTriangle(view, offset, [
      [outerRadius * Math.cos(theta1), outerRadius * Math.sin(theta1), -parameters.wallHeight],
      [wallRadius * Math.cos(theta1), wallRadius * Math.sin(theta1), -parameters.wallHeight],
      [outerRadius * Math.cos(theta2), outerRadius * Math.sin(theta2), -parameters.wallHeight]
    ]);
    
    offset = writeTriangle(view, offset, [
      [wallRadius * Math.cos(theta1), wallRadius * Math.sin(theta1), -parameters.wallHeight],
      [wallRadius * Math.cos(theta2), wallRadius * Math.sin(theta2), -parameters.wallHeight],
      [outerRadius * Math.cos(theta2), outerRadius * Math.sin(theta2), -parameters.wallHeight]
    ]);
  }

  return new Blob([buffer], { type: 'application/octet-stream' });
};

// Helper function to process image data into a height map
function processImageToHeightMap(imageData: ImageData, resolution: number): number[][] {
  const heightMap: number[][] = Array(resolution).fill(0).map(() => Array(resolution).fill(0));
  const scaleX = imageData.width / resolution;
  const scaleY = imageData.height / resolution;
  
  for (let i = 0; i < resolution; i++) {
    for (let j = 0; j < resolution; j++) {
      const x = Math.floor(i * scaleX);
      const y = Math.floor(j * scaleY);
      const idx = (y * imageData.width + x) * 4;
      
      // Convert RGB to grayscale using proper weights
      // Note: we're using standard grayscale conversion weights
      const r = imageData.data[idx];
      const g = imageData.data[idx + 1];
      const b = imageData.data[idx + 2];
      const grayscale = (r * 0.299 + g * 0.587 + b * 0.114);
      heightMap[i][j] = grayscale; // Store raw grayscale value (0-255)
    }
  }
  
  return heightMap;
}

// Helper function to map grayscale values (0-255) to height values
function mapHeightFromGrayscale(grayscale: number, minHeight: number, maxHeight: number): number {
  // Map grayscale value (0-255) to height value (minHeight-maxHeight)
  // Note: We invert the grayscale value because darker colors (lower values) should be higher
  const normalizedHeight = (255 - grayscale) / 255;
  return minHeight + (normalizedHeight * (maxHeight - minHeight));
}

// Helper function to map height values
function mapHeightValue(value: number, min: number, max: number): number {
  return min + value * (max - min);
}

// Helper function to write a triangle to the STL buffer
function writeTriangle(
  view: DataView,
  offset: number,
  vertices: [number, number, number][]
): number {
  // Calculate normal
  const normal = calculateNormal(vertices);
  
  // Write normal
  view.setFloat32(offset, normal[0], true);
  view.setFloat32(offset + 4, normal[1], true);
  view.setFloat32(offset + 8, normal[2], true);
  offset += 12;
  
  // Write vertices
  for (const vertex of vertices) {
    view.setFloat32(offset, vertex[0], true);
    view.setFloat32(offset + 4, vertex[1], true);
    view.setFloat32(offset + 8, vertex[2], true);
    offset += 12;
  }
  
  // Attribute byte count (unused)
  view.setUint16(offset, 0, true);
  return offset + 2;
}

// Helper function to calculate triangle normal
function calculateNormal(vertices: [number, number, number][]): [number, number, number] {
  const [v1, v2, v3] = vertices;
  const u = [v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]];
  const v = [v3[0] - v1[0], v3[1] - v1[1], v3[2] - v1[2]];
  
  const normal: [number, number, number] = [
    u[1] * v[2] - u[2] * v[1],
    u[2] * v[0] - u[0] * v[2],
    u[0] * v[1] - u[1] * v[0]
  ];
  
  const length = Math.sqrt(normal[0] * normal[0] + normal[1] * normal[1] + normal[2] * normal[2]);
  return [normal[0] / length, normal[1] / length, normal[2] / length];
}
