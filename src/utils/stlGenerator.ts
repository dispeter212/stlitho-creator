
// This implementation generates a lithophane STL file from image data
export const generateSTL = async (
  imageData: ImageData,
  parameters: {
    maxHeight: number;
    minHeight: number;
    outerDiameter: number;
    innerDiameter: number;
    grooveDepth: number;
    grooveDistance: number;
  }
) => {
  // Constants
  const GROOVE_WIDTH = 0.5; // Fixed groove width in mm
  const RESOLUTION = Math.min(imageData.width, imageData.height); // Number of segments
  const BYTES_PER_TRIANGLE = 50; // 12 floats (3 vertices × 4 coordinates) + 2 bytes
  
  // Convert image to grayscale values and resize
  const heightMap = processImageToHeightMap(imageData, RESOLUTION);
  
  // Calculate number of triangles needed
  const numRadialSegments = RESOLUTION;
  const numCircularSegments = RESOLUTION;
  const numTriangles = 
    // Main surface triangles (2 per quad)
    2 * numRadialSegments * numCircularSegments +
    // Inner wall triangles
    2 * numCircularSegments +
    // Outer wall triangles
    2 * numCircularSegments +
    // Groove triangles
    8 * numCircularSegments; // 4 quads per segment for the groove

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
               (parameters.outerDiameter - parameters.innerDiameter) / 2;
    const r2 = parameters.innerDiameter / 2 + ((i + 1) / numRadialSegments) * 
               (parameters.outerDiameter - parameters.innerDiameter) / 2;
    
    for (let j = 0; j < numCircularSegments; j++) {
      const theta1 = (j / numCircularSegments) * Math.PI * 2;
      const theta2 = ((j + 1) / numCircularSegments) * Math.PI * 2;
      
      const h1 = mapHeightValue(heightMap[i][j], parameters.minHeight, parameters.maxHeight);
      const h2 = mapHeightValue(heightMap[i][(j + 1) % numCircularSegments], 
                               parameters.minHeight, parameters.maxHeight);
      const h3 = mapHeightValue(heightMap[(i + 1) % numRadialSegments][j], 
                               parameters.minHeight, parameters.maxHeight);
      const h4 = mapHeightValue(heightMap[(i + 1) % numRadialSegments][(j + 1) % numCircularSegments], 
                               parameters.minHeight, parameters.maxHeight);
      
      // First triangle
      offset = writeTriangle(view, offset, [
        [r1 * Math.cos(theta1), r1 * Math.sin(theta1), h1],
        [r2 * Math.cos(theta1), r2 * Math.sin(theta1), h3],
        [r1 * Math.cos(theta2), r1 * Math.sin(theta2), h2]
      ]);
      
      // Second triangle
      offset = writeTriangle(view, offset, [
        [r1 * Math.cos(theta2), r1 * Math.sin(theta2), h2],
        [r2 * Math.cos(theta1), r2 * Math.sin(theta1), h3],
        [r2 * Math.cos(theta2), r2 * Math.sin(theta2), h4]
      ]);
    }
  }
  
  // Generate groove triangles on the opposite side
  const grooveRadius = parameters.grooveDistance;
  const grooveInnerRadius = grooveRadius - GROOVE_WIDTH / 2;
  const grooveOuterRadius = grooveRadius + GROOVE_WIDTH / 2;
  
  for (let j = 0; j < numCircularSegments; j++) {
    const theta1 = (j / numCircularSegments) * Math.PI * 2;
    const theta2 = ((j + 1) / numCircularSegments) * Math.PI * 2;
    
    // Groove bottom
    offset = writeTriangle(view, offset, [
      [grooveInnerRadius * Math.cos(theta1), grooveInnerRadius * Math.sin(theta1), -parameters.grooveDepth],
      [grooveOuterRadius * Math.cos(theta1), grooveOuterRadius * Math.sin(theta1), -parameters.grooveDepth],
      [grooveInnerRadius * Math.cos(theta2), grooveInnerRadius * Math.sin(theta2), -parameters.grooveDepth]
    ]);
    
    offset = writeTriangle(view, offset, [
      [grooveInnerRadius * Math.cos(theta2), grooveInnerRadius * Math.sin(theta2), -parameters.grooveDepth],
      [grooveOuterRadius * Math.cos(theta1), grooveOuterRadius * Math.sin(theta1), -parameters.grooveDepth],
      [grooveOuterRadius * Math.cos(theta2), grooveOuterRadius * Math.sin(theta2), -parameters.grooveDepth]
    ]);
    
    // Groove walls
    offset = writeGrooveWalls(view, offset, theta1, theta2, grooveInnerRadius, 
                            grooveOuterRadius, parameters.grooveDepth);
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
      
      // Convert RGB to grayscale
      const r = imageData.data[idx];
      const g = imageData.data[idx + 1];
      const b = imageData.data[idx + 2];
      heightMap[i][j] = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
    }
  }
  
  return heightMap;
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

// Helper function to write groove wall triangles
function writeGrooveWalls(
  view: DataView,
  offset: number,
  theta1: number,
  theta2: number,
  innerRadius: number,
  outerRadius: number,
  depth: number
): number {
  // Inner wall
  offset = writeTriangle(view, offset, [
    [innerRadius * Math.cos(theta1), innerRadius * Math.sin(theta1), 0],
    [innerRadius * Math.cos(theta1), innerRadius * Math.sin(theta1), -depth],
    [innerRadius * Math.cos(theta2), innerRadius * Math.sin(theta2), 0]
  ]);
  
  offset = writeTriangle(view, offset, [
    [innerRadius * Math.cos(theta2), innerRadius * Math.sin(theta2), 0],
    [innerRadius * Math.cos(theta1), innerRadius * Math.sin(theta1), -depth],
    [innerRadius * Math.cos(theta2), innerRadius * Math.sin(theta2), -depth]
  ]);
  
  // Outer wall
  offset = writeTriangle(view, offset, [
    [outerRadius * Math.cos(theta1), outerRadius * Math.sin(theta1), 0],
    [outerRadius * Math.cos(theta2), outerRadius * Math.sin(theta2), 0],
    [outerRadius * Math.cos(theta1), outerRadius * Math.sin(theta1), -depth]
  ]);
  
  offset = writeTriangle(view, offset, [
    [outerRadius * Math.cos(theta2), outerRadius * Math.sin(theta2), 0],
    [outerRadius * Math.cos(theta2), outerRadius * Math.sin(theta2), -depth],
    [outerRadius * Math.cos(theta1), outerRadius * Math.sin(theta1), -depth]
  ]);
  
  return offset;
}
